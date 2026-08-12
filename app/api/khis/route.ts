// ---------------------------------------------------------------------------
// GET /api/khis — KHIS data proxy for the EWENE dashboard
//
// Query params:
//   partner     partner id (default "jamii-tekelezi")
//   pe          DHIS2 period, e.g. 202505 | 202506 | LAST_12_MONTHS (default 202506)
//   indicators  comma-separated indicator ids from lib/indicators.ts
//               (default: ALL_DX — the full registry in one call)
//   county      optional — restrict to one county (name as in geo.ts)
//   facility    optional — restrict to one facility UID
//
// Security: KHIS credentials are only read server-side (env). The client
// receives values only.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { KHIS_INDICATORS, getKhisIndicator, ALL_DX } from "@/lib/indicators";
import {
  partnerCountyOUs,
  partnerFacilityOUs,
  hasFacilityRoster,
  COUNTY_OUS,
} from "@/lib/partners";
import { khisAnalytics, sumFor } from "@/lib/khis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const partner = params.get("partner") ?? "jamii-tekelezi";
  const pe = params.get("pe") ?? "202506";
  const indicatorParam = params.get("indicators");
  const county = params.get("county");
  const facility = params.get("facility");

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
    scopeLabel = `Facility ${facility}`;
  } else if (county) {
    const ou = COUNTY_OUS[county];
    if (!ou) {
      return NextResponse.json(
        { error: `Unknown county: ${county}` },
        { status: 400 },
      );
    }
    ouIds = [ou];
    scopeLabel = `${county} County`;
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
    const analytics = await khisAnalytics(dxIds, pe, ouIds);

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

    return NextResponse.json({
      partner,
      pe,
      scope: scopeLabel,
      ouCount: ouIds.length,
      source: "national KHIS (hiskenya.dha.go.ke)",
      asOf: new Date().toISOString(),
      indicators,
    });
  } catch (err) {
    console.error("KHIS proxy error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "KHIS request failed" },
      { status: 502 },
    );
  }
}
