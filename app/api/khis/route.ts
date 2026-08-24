// ---------------------------------------------------------------------------
// GET /api/khis — KHIS data proxy for the EWENE dashboard
//
// Query params:
//   partner     partner id (default "jamii-tekelezi")
//   pe          DHIS2 period, e.g. 202505 | 202506 | LAST_12_MONTHS, or a
//               multi-period range "202508;202509" (default 202506).
//               Totals are summed across all periods; byPeriod=1 returns the
//               per-month series.
//   indicators  comma-separated indicator ids from lib/indicators.ts
//               (default: ALL_DX — the full registry in one call)
//   county      optional — restrict to one county (name as in geo.ts)
//   facility    optional — restrict to one facility UID
//   byFacility=1   return the top-N facilities for the dx list — with several
//                  dx the per-facility values are summed across them (used to
//                  combine the five PrEP population-group elements into one
//                  "eligible by facility" series)
//   byCounty=1     return per-county sums for the (single) dx
//   byPeriod=1     ALSO return per-period values (for trend charts; use with
//                  pe=LAST_12_MONTHS so the client gets the monthly series)
//   reporting=1    ALSO return the number of org units with non-null values
//                  per indicator ("reportingFacilities")
//
// Security: KHIS credentials are only read server-side (env). The client
// receives values only.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { KHIS_INDICATORS, getKhisIndicator, ALL_DX } from "@/lib/indicators";
import {
  partnerCountyOUs,
  partnerFacilityOUs,
  partnerFacilityOUsFor,
  hasFacilityRoster,
  COUNTY_OUS,
  PARTNER_FACILITIES,
} from "@/lib/partners";
import ouCountyMap from "@/data/ou-county-map.json";
import { khisAnalyticsChunked, sumFor } from "@/lib/khis";
import { peToLabel } from "@/lib/period";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const partner = params.get("partner") ?? "jamii-tekelezi";
  const pe = params.get("pe") ?? "202506";
  const indicatorParam = params.get("indicators");
  const county = params.get("county");
  const subcounty = params.get("subcounty");
  const facility = params.get("facility");
  // byFacility=1 — return the top-N facilities per indicator (per-facility
  // breakdown for the scoped org units). With several dx, per-facility values
  // are summed across all of them (e.g. PrEP population-group elements).
  const byFacility = params.get("byFacility") === "1";
  const byCounty = params.get("byCounty") === "1";
  const byPeriod = params.get("byPeriod") === "1";
  const withReporting = params.get("reporting") === "1";
  const topN = Math.min(parseInt(params.get("top") ?? "8", 10) || 8, 20);

  // Resolve the dx list.
  const dxIds = indicatorParam
    ? indicatorParam
        .split(",")
        .map((s) => getKhisIndicator(s.trim())?.dx)
        .filter((d): d is string => Boolean(d))
    : ALL_DX.split(";");

  if (dxIds.length === 0) {
    return NextResponse.json(
      { error: "No valid indicators found" },
      { status: 400 },
    );
  }

  // Resolve the org-unit scope.
  let ouIds: string[];
  let scopeLabel: string;

  if (facility) {
    ouIds = [facility];
    const facName = (PARTNER_FACILITIES[partner] ?? []).find(
      (f) => f.uid === facility,
    )?.name;
    scopeLabel = facName ? `${facName} (Facility)` : `Facility ${facility}`;
  } else if (subcounty) {
    // Sub-county scope: restrict to the roster facilities in that sub-county
    // (optionally also within a selected county).
    const scUids = partnerFacilityOUsFor(
      partner,
      county || undefined,
      subcounty,
    );
    if (scUids.length === 0) {
      return NextResponse.json(
        { error: `No facilities resolved for sub-county: ${subcounty}` },
        { status: 400 },
      );
    }
    ouIds = scUids;
    scopeLabel = `${partner} · ${subcounty} (${ouIds.length} facilities)`;
  } else if (county) {
    // roster=1 (home tab): restrict to the partner's roster facilities in
    // this county — partner-only values. Falls back to the county rollup
    // when the partner has no roster yet (e.g. nuru-ya-mtoto).
    const rosterMode = params.get("roster") === "1";
    if (rosterMode && hasFacilityRoster(partner)) {
      const rosterUids = partnerFacilityOUsFor(partner, county);
      if (rosterUids.length > 0) {
        ouIds = rosterUids;
        scopeLabel = `${county} County · ${partner} (${ouIds.length} facilities)`;
      } else {
        const ou = COUNTY_OUS[county];
        if (!ou) {
          return NextResponse.json(
            { error: `Unknown county: ${county}` },
            { status: 400 },
          );
        }
        ouIds = [ou];
        scopeLabel = `${county} County`;
      }
    } else {
      const ou = COUNTY_OUS[county];
      if (!ou) {
        return NextResponse.json(
          { error: `Unknown county: ${county}` },
          { status: 400 },
        );
      }
      ouIds = [ou];
      scopeLabel = `${county} County`;
    }
  } else if (hasFacilityRoster(partner)) {
    // Facility-level precision: ONLY the partner's facilities.
    ouIds = partnerFacilityOUs(partner);
    scopeLabel = `${partner} (${ouIds.length} facilities)`;
  } else {
    // Fallback: county-level rollup for partners without a roster yet.
    ouIds = partnerCountyOUs(partner);
    scopeLabel = `${partner} (${ouIds.length} counties)`;
  }

  if (ouIds.length === 0) {
    return NextResponse.json(
      { error: `No org units resolved for partner: ${partner}` },
      { status: 400 },
    );
  }

  try {
    const analytics = await khisAnalyticsChunked(dxIds, pe, ouIds);

    // One analytics call may be too heavy for 200+ facilities in a browser
    // round-trip; return per-period sums per indicator (not raw rows).
    const indicators = KHIS_INDICATORS.filter((i) => dxIds.includes(i.dx)).map(
      (i) => ({
        id: i.id,
        label: i.label,
        domain: i.domain,
        dx: i.dx,
        value: sumFor(analytics.rows, i.dx),
      }),
    );

    // Optional per-period series: [{pe, peName, value}] per indicator, for
    // monthly trend charts. Requires pe=LAST_12_MONTHS (or a multi-period pe).
    let periods:
      | {
          dx: string;
          id: string;
          series: { pe: string; peName: string; value: number | null }[];
        }[]
      | undefined;
    if (byPeriod) {
      periods = KHIS_INDICATORS.filter((i) => dxIds.includes(i.dx)).map((i) => {
        const byPe = new Map<string, number>();
        const peNames = new Map<string, string>();
        for (const row of analytics.rows) {
          if (row.dx !== i.dx || row.value == null) continue;
          byPe.set(row.period, (byPe.get(row.period) ?? 0) + row.value);
          peNames.set(row.period, row.periodName);
        }
        return {
          dx: i.dx,
          id: i.id,
          series: [...byPe.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([p, v]) => ({
              pe: p,
              peName: peNames.get(p) ?? p,
              value: v,
            })),
        };
      });
    }

    // Optional per-facility breakdown: top-N facilities by the requested
    // indicator(s). With several dx, per-facility values are summed across
    // them — e.g. "Eligible by facility" = sum of the five PrEP population-
    // group elements (General popn + FSW + MSM + PWID + Discordant Couple).
    let facilities: { name: string; value: number | null }[] | undefined;
    if (byFacility) {
      const dxSet = new Set(dxIds);
      const sums = new Map<string, number>();
      for (const row of analytics.rows) {
        if (!dxSet.has(row.dx) || row.value == null) continue;
        sums.set(
          row.ouName || row.ou,
          (sums.get(row.ouName || row.ou) ?? 0) + row.value,
        );
      }
      facilities = [...sums.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
        .slice(0, topN);
    }

    // Optional per-county breakdown: sums grouped by county name. Requires a
    // single dx. Resolves county from the roster when present (roster county
    // is a KHIS OU UID → name via ou-county-map.json), otherwise from the
    // org-unit names (county-level OUs are named after the county).
    let counties: { name: string; value: number | null }[] | undefined;
    if (byCounty && dxIds.length === 1) {
      const dx = dxIds[0];
      const ouCounty = ouCountyMap as unknown as Record<string, string>;
      const sums = new Map<string, number>();
      for (const row of analytics.rows) {
        if (row.dx !== dx || row.value == null) continue;
        const fac = PARTNER_FACILITIES[partner]?.find((f) => f.uid === row.ou);
        const countyName = fac
          ? (ouCounty[fac.county] ?? fac.county ?? row.ouName)
          : row.ouName;
        if (!countyName) continue;
        sums.set(countyName, (sums.get(countyName) ?? 0) + row.value);
      }
      counties = [...sums.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    }

    // Optional reportingFacilities: number of org units with a non-null value
    // per indicator (how many of the partner's facilities actually reported).
    let reporting: { id: string; dx: string; facilities: number }[] | undefined;
    if (withReporting) {
      reporting = KHIS_INDICATORS.filter((i) => dxIds.includes(i.dx)).map(
        (i) => {
          const ous = new Set<string>();
          for (const row of analytics.rows) {
            if (row.dx === i.dx && row.value != null) ous.add(row.ou);
          }
          return { id: i.id, dx: i.dx, facilities: ous.size };
        },
      );
    }

    return NextResponse.json({
      partner,
      pe,
      peLabel: peToLabel(pe),
      scope: scopeLabel,
      ouCount: ouIds.length,
      source: "national KHIS (hiskenya.dha.go.ke)",
      asOf: new Date().toISOString(),
      indicators,
      facilities,
      counties,
      periods,
      reporting,
    });
  } catch (err) {
    console.error("KHIS proxy error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "KHIS request failed" },
      { status: 502 },
    );
  }
}
