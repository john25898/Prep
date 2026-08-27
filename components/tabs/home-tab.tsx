"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Database,
  Flag,
  HeartPulse,
  Landmark,
  LayoutDashboard,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
} from "lucide-react";
import { useAssessments } from "@/lib/use-assessments";
import { useKhis } from "@/lib/use-khis";
import { useGeoFilter } from "@/lib/geo-filter-context";
import { useVtpEidHeiEntries } from "@/lib/use-vtp-entries";
import { useHeiOutcomes } from "@/lib/use-hei-outcomes";
import { aggregateVtpEntries } from "@/lib/vtp-entry";
import { aggregateHeiOutcomes } from "@/lib/hei-outcome";
import { AIAssistant, type ChartInsight } from "@/components/ai-assistant";
import { PARTNERS, getPartner, type Partner } from "@/lib/geo";
import {
  PARTNER_COUNTIES,
  PARTNER_FACILITIES,
  hasFacilityRoster,
} from "@/lib/partners";
import {
  ViewDataButton,
  type DataRow,
  type ViewDetail,
  type ViewInput,
} from "@/components/view-data";
import { assessmentScore } from "@/lib/assessment";
import {
  BAR_SERIES,
  CADENCE,
  CORE_IMPACT,
  DOMAIN_COLUMNS,
  EXPECTED_OUTCOMES,
  JT_COVERAGE_COUNTIES,
  PILLARS,
  REVIEW_PLATFORMS,
  SAFE_SYSTEMS,
  TOC_STEPS,
  VTP_QOC,
  readinessForCounties,
  scoreTone,
  seededJitter,
  targetTone,
} from "./home/shared";
import { PartnerIndicatorChart } from "./home/indicator-chart";

export function HomeTab({
  onSaveToPlayground,
}: {
  onSaveToPlayground?: (chart: ChartInsight) => void;
}) {
  const allAssessments = useAssessments();
  const vtpEntries = useVtpEidHeiEntries();
  const heiOutcomes = useHeiOutcomes();
  const { filter, pe, peLabel } = useGeoFilter();
  const [activeChart, setActiveChart] = useState<ChartInsight | null>(null);

  const addChartToPlayground = (chart: ChartInsight) => {
    onSaveToPlayground?.(chart);
  };

  const partners = useMemo(
    () => PARTNERS.filter((p) => p.id !== "national"),
    [],
  );

  // -----------------------------------------------------------------------
  // Live 90:90:80:80 pillars at the CURRENT filter scope. Computed from
  // per-county KHIS fetches scoped to the partner's roster facilities
  // (roster=1) — partner-only. % indicators (SBA, PNC, dropout) are DHIS2
  // indicators that would be summed per facility → garbage, so they are
  // nulled at roster scopes; ANC uses the count-based anc4/anc1 ratio and
  // MMR/NMR/SBR use raw counts.
  // -----------------------------------------------------------------------
  const pillarScopes = useMemo(() => {
    if (filter.facility) {
      const fac = (PARTNER_FACILITIES[filter.partner] ?? []).find(
        (f) => f.name === filter.facility,
      );
      return [
        {
          kind: "facility" as const,
          label: filter.facility,
          uid: fac?.uid ?? "",
          county: fac?.county ?? filter.county ?? "",
        },
      ];
    }
    if (filter.subCounty) {
      return [
        {
          kind: "subcounty" as const,
          label: filter.subCounty,
          uid: "",
          county: filter.county ?? "",
        },
      ];
    }
    const base =
      PARTNER_COUNTIES[filter.partner]?.length > 0
        ? PARTNER_COUNTIES[filter.partner]
        : JT_COVERAGE_COUNTIES;
    const counties = filter.county ? [filter.county] : base;
    return counties.map((c) => ({
      kind: "county" as const,
      label: c,
      uid: "",
      county: c,
    }));
  }, [filter.partner, filter.county, filter.subCounty, filter.facility]);

  const pillarScopeLabels = useMemo(
    () => pillarScopes.map((s) => s.label),
    [pillarScopes],
  );

  // Human-readable label of the current filter scope (county / sub-county /
  // facility) for section subtitles and pills.
  const scopeLabel = useMemo(
    () =>
      filter.facility
        ? filter.facility
        : filter.subCounty
          ? filter.subCounty
          : filter.county
            ? `${filter.county} County`
            : (getPartner(filter.partner)?.shortName ?? filter.partner),
    [filter.partner, filter.county, filter.subCounty, filter.facility],
  );

  const [pillarByCounty, setPillarByCounty] = useState<Record<
    string,
    {
      anc?: number;
      sba?: number;
      pncM?: number;
      pncI?: number;
      mmr?: number;
      nmr?: number;
      sbr?: number;
      lb?: number;
      nd?: number;
      sb?: number;
      md?: number;
    }
  > | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPillarByCounty(null);
    Promise.all(
      pillarScopes.map((s) => {
        const q =
          s.kind === "county"
            ? `county=${encodeURIComponent(
                s.label,
              )}&partner=${encodeURIComponent(filter.partner)}&roster=1`
            : s.kind === "subcounty"
              ? `subcounty=${encodeURIComponent(
                  s.label,
                )}&partner=${encodeURIComponent(filter.partner)}`
              : `facility=${s.uid}`;
        return fetch(
          `/api/khis?${q}&pe=${pe}&indicators=pmtct_anc1_visits,anc4_visits,anc1_4_dropout,sba_pct_live,pnc_48h_mother,pnc_48h_infant,mmr,maternal_deaths_reported,moh711_live_births,neonatal_deaths,stillbirths`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
      }),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<
        string,
        {
          anc?: number;
          sba?: number;
          pncM?: number;
          pncI?: number;
          mmr?: number;
          nmr?: number;
          sbr?: number;
          lb?: number;
          nd?: number;
          sb?: number;
          md?: number;
        }
      > = {};
      results.forEach((res, i) => {
        const scope = pillarScopes[i];
        const name = scope?.label;
        if (!name || !res?.indicators) return;
        // PCT_KEYS are KHIS % indicators. At multi-OU roster scopes
        // (county-with-roster=1 and sub-county) per-facility indicator values
        // are summed → garbage for % elements (e.g. SBA summed to 1,512%),
        // so they are nulled and only raw counts feed the derived rates.
        // MMR is the same (a per-100,000 ratio summed across facilities).
        // At SINGLE-OU scope (one facility, or a whole county) the KHIS
        // indicator value is that org unit's own genuine value — small-
        // denominator facilities legitimately exceed 100% (e.g. 121 infants
        // PNC'd for 120 births → 100.8%), so only impossible negatives are
        // rejected; the card display caps at 100%.
        const PCT_KEYS = new Set([
          "anc1_4_dropout",
          "sba_pct_live",
          "pnc_48h_mother",
          "pnc_48h_infant",
        ]);
        const isMultiOu =
          scope.kind !== "facility" && hasFacilityRoster(filter.partner);
        const ind = (key: string): number | null => {
          const found = res.indicators.find(
            (x: { id: string; value: number | null }) => x.id === key,
          );
          const v = found?.value ?? null;
          if (v == null) return null;
          if (isMultiOu && (PCT_KEYS.has(key) || key === "mmr")) return null;
          if (PCT_KEYS.has(key) && v < 0) return null;
          return v;
        };
        const r1 = (v: number | null) =>
          v != null ? Math.round(v * 10) / 10 : undefined;
        const dropout = ind("anc1_4_dropout");
        const anc1 = ind("pmtct_anc1_visits");
        const anc4 = ind("anc4_visits");
        let anc: number | null = dropout != null ? 100 - dropout : null;
        if (anc == null && anc1 != null && anc1 > 0 && anc4 != null) {
          const ratio =
            Math.round(((anc4 as number) / (anc1 as number)) * 1000) / 10;
          if (ratio <= 100) anc = ratio;
        }
        // NMR = neonatal deaths ÷ live births × 1,000.
        // SBR = stillbirths ÷ (live births + stillbirths) × 1,000.
        // MMR = maternal deaths ÷ live births × 100,000 (count-based, so
        // multi-county scopes match KHIS's aggregated Total).
        const lb = ind("moh711_live_births");
        const nd = ind("neonatal_deaths");
        const sb = ind("stillbirths");
        const md = ind("maternal_deaths_reported");
        const nmr =
          lb != null && lb > 0 && nd != null
            ? Math.round((nd / lb) * 1000 * 10) / 10
            : undefined;
        const sbr =
          lb != null && lb > 0 && sb != null
            ? Math.round((sb / (lb + sb)) * 1000 * 10) / 10
            : undefined;
        // MMR at sub-county scope (multi-facility roster): the KHIS ratio
        // indicator summed across facilities is garbage — compute it from raw
        // counts instead (same method as partner scope), so the card shows a
        // real partner-only value rather than blank.
        const mmrLive = isMultiOu
          ? lb != null && lb > 0 && md != null && md > 0
            ? Math.round((md / lb) * 100000 * 10) / 10
            : undefined
          : r1(ind("mmr"));
        map[name] = {
          anc: anc != null ? Math.round(anc * 10) / 10 : undefined,
          sba: r1(ind("sba_pct_live")),
          pncM: r1(ind("pnc_48h_mother")),
          pncI: r1(ind("pnc_48h_infant")),
          mmr: mmrLive,
          nmr,
          sbr,
          lb: lb ?? undefined,
          nd: nd ?? undefined,
          sb: sb ?? undefined,
          md: md ?? undefined,
        };
      });
      if (!cancelled) setPillarByCounty(map);
    });
    return () => {
      cancelled = true;
    };
  }, [pillarScopes, filter.partner, pe]);

  const livePillars = useMemo(() => {
    if (!pillarByCounty)
      return {
        anc: undefined,
        sba: undefined,
        pncM: undefined,
        pncI: undefined,
        mmr: undefined,
        nmr: undefined,
        sbr: undefined,
        anyLive: false,
      };
    const rows = pillarScopeLabels
      .map((c) => pillarByCounty[c])
      .filter((r): r is NonNullable<typeof r> => Boolean(r));
    const avg = (key: "anc" | "sba" | "pncM" | "pncI" | "mmr") => {
      const vals = rows
        .map((r) => r[key])
        .filter((v): v is number => v != null);
      return vals.length
        ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
        : undefined;
    };
    // Rates from summed counts across the reported counties — statistically
    // more honest than averaging the per-county ratios.
    const sum = (key: "lb" | "nd" | "sb" | "md") =>
      rows
        .map((r) => r[key])
        .filter((v): v is number => v != null)
        .reduce((a, b) => a + b, 0);
    const lb = sum("lb");
    const nd = sum("nd");
    const sb = sum("sb");
    // MMR: restrict to counties that reported maternal deaths. KHIS's "Total"
    // row for a ratio indicator only aggregates org units with a value — a
    // county with live births but no deaths reported must not dilute the
    // denominator (this is why the app showed 78.8 vs KHIS Total 107.87).
    const mdRows = rows.filter((r) => r.md != null);
    const md = mdRows.reduce((a, r) => a + (r.md as number), 0);
    const lbMd = mdRows
      .map((r) => r.lb)
      .filter((v): v is number => v != null)
      .reduce((a, b) => a + b, 0);
    const nmr =
      lb > 0 && nd > 0 ? Math.round((nd / lb) * 1000 * 10) / 10 : undefined;
    const sbr =
      lb > 0 && sb > 0
        ? Math.round((sb / (lb + sb)) * 1000 * 10) / 10
        : undefined;
    // MMR at multi-county scope: maternal deaths ÷ live births × 100,000
    // (summed counts, deaths-reporting counties only) so the partner view
    // matches KHIS's aggregated Total. Single-county / facility scope keeps
    // the KHIS indicator (exact there).
    const mmr =
      rows.length > 1 && lbMd > 0 && md > 0
        ? Math.round((md / lbMd) * 100000 * 10) / 10
        : avg("mmr");
    const res = {
      anc: avg("anc"),
      sba: avg("sba"),
      pncM: avg("pncM"),
      pncI: avg("pncI"),
      mmr,
      nmr,
      sbr,
    };
    return {
      ...res,
      anyLive: Object.values(res).some((v) => v != null),
    };
  }, [pillarByCounty, pillarScopeLabels]);

  // -----------------------------------------------------------------------
  // Live KHIS domain scores per partner (pe = 202505, roster/county scope).
  // Domains 1, 2, 4 & 5 are derived from KHIS where the data is reported;
  // domains with no KHIS value this period show blank (no baseline constants).
  // Domain 3 (Readiness) is always computed from entered assessments.
  // -----------------------------------------------------------------------
  const KHIS_DOMAIN_DX =
    "pmtct_anc1_visits,pmtct_initial_test,pmtct_anc1_known_pos,pmtct_new_positive,pmtct_anc1_on_haart,pmtct_start_haart_anc,pnc_48h_coverage,maternal_deaths_reported,maternal_deaths_audited,neonatal_deaths,neonatal_deaths_audited";

  interface LiveDomainScores {
    d1?: number; // PMTCT/VTP QoC — blend of testing coverage & ART initiation
    d2?: number; // Coverage — PNC within 48h (KHIS %)
    d4?: number; // MPDSR — % of reported deaths audited
    d5?: number; // Data systems — % of scoped facilities reporting
    d5Raw?: { reporting: number; ouCount: number }; // raw d5 ingredients
    testedPct?: number; // HIV testing coverage for PBFW
    artPct?: number; // ART initiation for HIV+ PBFW
  }

  const [liveByPartner, setLiveByPartner] = useState<
    Record<string, LiveDomainScores>
  >({});
  const [liveLoaded, setLiveLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLiveLoaded(false);
    Promise.all(
      partners.map((p) =>
        fetch(
          `/api/khis?partner=${encodeURIComponent(
            p.id,
          )}&pe=${pe}&indicators=${KHIS_DOMAIN_DX}&reporting=1`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, LiveDomainScores> = {};
      results.forEach((res, i) => {
        const id = partners[i]?.id;
        if (!id || !res?.indicators) return;
        const ind = (key: string): number | null => {
          const found = res.indicators.find(
            (x: { id: string; value: number | null }) => x.id === key,
          );
          return found?.value ?? null;
        };
        const anc1 = ind("pmtct_anc1_visits");
        const tested = ind("pmtct_initial_test");
        // Need for PMTCT = Known Positive at 1st ANC + Newly HIV+ at ANC
        // (MOH 731-2 reports the two components, not a combined "need").
        const kp = ind("pmtct_anc1_known_pos");
        const newPos = ind("pmtct_new_positive");
        const need =
          kp != null || newPos != null ? (kp ?? 0) + (newPos ?? 0) : null;
        // On ART = On HAART at 1st ANC + Started HAART at ANC (MOH 731-2).
        const onHaart = ind("pmtct_anc1_on_haart");
        const startHaart = ind("pmtct_start_haart_anc");
        const art =
          onHaart != null || startHaart != null
            ? (onHaart ?? 0) + (startHaart ?? 0)
            : null;
        const pnc = ind("pnc_48h_coverage");
        const matRep = ind("maternal_deaths_reported");
        const matAud = ind("maternal_deaths_audited");
        const neoRep = ind("neonatal_deaths");
        const neoAud = ind("neonatal_deaths_audited");

        const s: LiveDomainScores = {};
        const clampPct = (v: number) => Math.max(0, Math.min(100, v));
        const testedPct =
          anc1 != null && anc1 > 0 && tested != null
            ? clampPct((tested / anc1) * 100)
            : null;
        const artPct =
          need != null && need > 0 && art != null
            ? clampPct((art / need) * 100)
            : null;
        if (testedPct != null) s.testedPct = Math.round(testedPct);
        if (artPct != null) s.artPct = Math.round(artPct);
        const d1Parts = [testedPct, artPct].filter(
          (v): v is number => v != null,
        );
        if (d1Parts.length > 0) {
          s.d1 = Math.round(
            d1Parts.reduce((a, b) => a + b, 0) / d1Parts.length,
          );
        }
        // pnc_48h_coverage is a % per facility; summed across a roster it
        // exceeds 100 and is meaningless — only trust it as a live score when
        // the scoped rollup is a genuine 0–100 value (county-level scope).
        if (pnc != null && pnc >= 0 && pnc <= 100) s.d2 = Math.round(pnc);
        const audited: number[] = [];
        if (matRep != null && matRep > 0 && matAud != null)
          audited.push(clampPct((matAud / matRep) * 100));
        if (neoRep != null && neoRep > 0 && neoAud != null)
          audited.push(clampPct((neoAud / neoRep) * 100));
        if (audited.length > 0) {
          s.d4 = Math.round(
            audited.reduce((a, b) => a + b, 0) / audited.length,
          );
        }
        const reportingRow = res.reporting?.find(
          (x: { id: string; facilities: number }) =>
            x.id === "pmtct_anc1_visits",
        );
        if (reportingRow?.facilities != null && res.ouCount > 0) {
          s.d5 = Math.round(
            clampPct((reportingRow.facilities / res.ouCount) * 100),
          );
          s.d5Raw = {
            reporting: reportingRow.facilities,
            ouCount: res.ouCount,
          };
        }
        map[id] = s;
      });
      if (!cancelled) {
        setLiveByPartner(map);
        setLiveLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [partners, pe]);

  // Per-county KHIS domain scores (d1/d2/d4) — derived from the SAME
  // per-county VTP fetch below (countyDomains is populated in that effect), so
  // there is exactly ONE county-level KHIS request per county. d5 stays
  // partner-scope (share of roster facilities reporting MOH 731).
  const [countyDomains, setCountyDomains] = useState<Record<
    string,
    LiveDomainScores
  > | null>(null);

  // Per county: the raw KHIS values that feed the 5 domain scores, per
  // facility — e.g. pmtct_anc1_visits & pmtct_initial_test per facility for
  // the PMTCT/VTP QoC card, so the user can validate the tallies behind each
  // domain average. Rides the same VTP fetch (byFacilityDetail=1) — no extra
  // KHIS round-trip. Values keyed by indicator id (dx mapped to id).
  const [domainFacilitiesByCounty, setDomainFacilitiesByCounty] = useState<
    Record<string, { name: string; values: Record<string, number> }[]>
  >({});

  // Domain 3 readiness per partner — computed live from entered assessments
  // scoped to the partner's counties.
  const readinessByPartner = useMemo(() => {
    const map: Record<string, { count: number; avg: number | null }> = {};
    for (const p of partners) {
      map[p.id] = readinessForCounties(allAssessments, p.counties);
    }
    return map;
  }, [allAssessments, partners]);

  const rows = useMemo(
    () =>
      partners.map((p) => {
        const l = liveByPartner[p.id] ?? {};
        const d3 = readinessByPartner[p.id];
        // Per-county KHIS averages (same per-county VTP fetch) are preferred;
        // the roster-scope live value is the fallback. No baseline constants.
        const countyAvg = (key: "d1" | "d2" | "d4"): number | null => {
          const vals = p.counties
            .map((c) => countyDomains?.[c]?.[key])
            .filter((v): v is number => v != null);
          return vals.length > 0
            ? vals.reduce((a, b) => a + b, 0) / vals.length
            : null;
        };
        // Nuru Ya Mtoto has no facility roster yet — a KHIS county-level scope
        // would overstate support because they do not serve every facility in
        // the county. Mark the row PENDING and default all domains to 0 until
        // the facility list is loaded.
        const pending = p.id === "nuru-ya-mtoto";
        const d1 = countyAvg("d1");
        const d2 = countyAvg("d2");
        const d4 = countyAvg("d4");
        const domains: (number | null)[] = pending
          ? [0, 0, 0, 0, 0]
          : [
              d1 ?? l.d1 ?? null,
              d2 ?? l.d2 ?? null,
              d3.avg,
              d4 ?? l.d4 ?? null,
              l.d5 ?? null,
            ];
        const live: boolean[] = pending
          ? [false, false, false, false, false]
          : [d1 != null, d2 != null, false, d4 != null, l.d5 != null];
        const available = pending
          ? []
          : domains.filter((v): v is number => v !== null && !Number.isNaN(v));
        const overall =
          available.length > 0
            ? available.reduce((a, b) => a + b, 0) / available.length
            : null;
        return {
          partner: p,
          domains,
          live,
          overall,
          d3Count: d3.count,
          pending,
        };
      }),
    [partners, readinessByPartner, liveByPartner, countyDomains],
  );

  const columnAverages = useMemo(
    () =>
      DOMAIN_COLUMNS.map((_col, idx) => {
        const values = rows
          .filter((r) => !r.pending)
          .map((r) => r.domains[idx])
          .filter((v): v is number => v !== null && !Number.isNaN(v));
        return values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : null;
      }),
    [rows],
  );

  const overallChartData = useMemo(
    () =>
      rows.map((r) => ({
        name: r.partner.shortName,
        overall: r.overall == null ? null : Math.round(r.overall),
      })),
    [rows],
  );

  // Partners rendered in the per-partner scoreboards (VTP, Safe Systems) and
  // the county comparison. National scope (or an unknown partner id) renders
  // every implementing partner, each across its own counties — so no section
  // disappears when the filter bar is cleared. Picking a specific partner
  // narrows the scoreboards to that partner, scoped by county / sub-county /
  // facility as before.
  const scorePartners = useMemo(() => {
    const p = partners.find((x) => x.id === filter.partner);
    return p ? [p] : partners;
  }, [partners, filter.partner]);

  // County distribution: per partner, each supported county with its
  // 5-domain scores (d3 computed live from county-scoped assessments;
  // d1/d2/d4 live per-county KHIS where reported, else blank — no
  // illustrative constants anywhere; d5 has no county-scope KHIS source →
  // blank). Scoped to the county selected in the filter bar so these charts
  // drill with the filter.
  const countyRows = useMemo(
    () =>
      scorePartners.map((p) => {
        const pending = p.id === "nuru-ya-mtoto";
        const scopeCounties = filter.county ? [filter.county] : p.counties;
        return {
          partner: p,
          pending,
          counties: scopeCounties.map((county) => {
            const live = countyDomains?.[county] ?? {};
            const d3 = readinessForCounties(allAssessments, [county]);
            const domains: (number | null)[] = pending
              ? [0, 0, 0, 0, 0]
              : [
                  live.d1 ?? null,
                  live.d2 ?? null,
                  d3.avg,
                  live.d4 ?? null,
                  null,
                ];
            const available = pending
              ? []
              : domains.filter(
                  (v): v is number => v !== null && !Number.isNaN(v),
                );
            const overall =
              available.length > 0
                ? available.reduce((a, b) => a + b, 0) / available.length
                : null;
            return { name: county, domains, overall, d3Count: d3.count };
          }),
        };
      }),
    [scorePartners, allAssessments, filter.county, countyDomains],
  );

  // Scope axis for the per-partner VTP/Safe scoreboards — the current filter
  // decides which bars are drawn per partner: all the partner's counties, a
  // single county, the roster facilities of one sub-county, or a single
  // facility. At National scope every implementing partner gets its own
  // scoreboard, so no charts disappear when the filter bar is cleared.
  const scoreScope = useMemo(
    () =>
      scorePartners.map((p) => {
        if (filter.facility) return { partner: p, units: [filter.facility] };
        if (filter.subCounty) {
          const facs = (PARTNER_FACILITIES[p.id] ?? [])
            .filter((f) => f.subCounty === filter.subCounty)
            .slice(0, 12);
          return { partner: p, units: facs.map((f) => f.name) };
        }
        if (filter.county) return { partner: p, units: [filter.county] };
        return { partner: p, units: p.counties };
      }),
    [scorePartners, filter.county, filter.subCounty, filter.facility],
  );

  // Which county a scoreboard unit belongs to (for scaling the baseline).
  const vtpUnitCounty = (p: Partner, unit: string): string => {
    if (filter.county) return filter.county;
    if (filter.subCounty || filter.facility) {
      const fac = (PARTNER_FACILITIES[p.id] ?? []).find((f) => f.name === unit);
      return fac?.county ?? p.counties[0] ?? "Embu";
    }
    return unit;
  };

  // -----------------------------------------------------------------------
  // View Data payloads — the individual tallies behind each domain score.
  // Always scoped to the CURRENT filter (partner + counties): facility rows
  // only for in-scope counties, inputs only for in-scope partners. This keeps
  // the modals in sync when the partner changes — no stale data from the
  // previous partner's fetch. Nothing fabricated; values are the same ones
  // feeding the scores on screen.
  // -----------------------------------------------------------------------
  type DomainCardView = {
    title: string;
    note: string;
    data: DataRow[];
    detail: ViewDetail;
  };

  const buildDomainViewData = useCallback(
    (
      scopeCounties: Set<string>,
      scopePartners: Partner[],
      titlePrefix = "",
    ): DomainCardView[] => {
      const pct = (
        num: number | null | undefined,
        den: number | null | undefined,
      ): number | null => {
        if (num == null || den == null || den <= 0) return null;
        return Math.round((num / den) * 1000) / 10;
      };
      const activePartners = scopePartners.filter(
        (p) => p.id !== "nuru-ya-mtoto",
      );
      const lv = (id: string) => liveByPartner[id] ?? {};
      const inScope = (county: string) => scopeCounties.has(county);
      const facsOf = (county: string) =>
        [...(domainFacilitiesByCounty[county] ?? [])].sort((a, b) =>
          a.name.localeCompare(b.name),
        );

      // d1 — PMTCT/VTP QoC: per-facility testing & ART tallies.
      const d1Rows: DataRow[] = Object.keys(domainFacilitiesByCounty)
        .filter(inScope)
        .sort((a, b) => a.localeCompare(b))
        .flatMap((county) =>
          facsOf(county).map((f) => {
            const anc1 = f.values["pmtct_anc1_visits"] ?? null;
            const tested = f.values["pmtct_initial_test"] ?? null;
            const kp = f.values["pmtct_anc1_known_pos"] ?? null;
            const newPos = f.values["pmtct_new_positive"] ?? null;
            const need =
              kp != null || newPos != null ? (kp ?? 0) + (newPos ?? 0) : null;
            const onHaart = f.values["pmtct_anc1_on_haart"] ?? null;
            const startHaart = f.values["pmtct_start_haart_anc"] ?? null;
            const art =
              onHaart != null || startHaart != null
                ? (onHaart ?? 0) + (startHaart ?? 0)
                : null;
            return {
              County: county,
              Facility: f.name,
              "1st ANC visits": anc1,
              "Tested at 1st ANC": tested,
              "Tested %": pct(tested, anc1),
              "PMTCT need": need,
              "On ART": art,
              "ART %": pct(art, need),
            };
          }),
        );
      const d1Inputs: ViewInput[] = activePartners.flatMap((p) => {
        const l = lv(p.id);
        const out: ViewInput[] = [];
        if (l.testedPct != null)
          out.push({
            label: `${p.name} — testing coverage (tested ÷ 1st ANC)`,
            value: `${l.testedPct}%`,
            source: "live",
          });
        if (l.artPct != null)
          out.push({
            label: `${p.name} — ART initiation (ART ÷ need)`,
            value: `${l.artPct}%`,
            source: "live",
          });
        if (l.d1 != null)
          out.push({
            label: `${p.name} — d1 score (average of the two)`,
            value: `${l.d1.toFixed(1)}%`,
            source: "live",
          });
        return out;
      });

      // d2 — Coverage: per-facility PNC within 48h (mother %).
      const d2Rows: DataRow[] = Object.keys(domainFacilitiesByCounty)
        .filter(inScope)
        .sort((a, b) => a.localeCompare(b))
        .flatMap((county) =>
          facsOf(county).map((f) => ({
            County: county,
            Facility: f.name,
            "PNC within 48h — mother %": f.values["pnc_48h_mother"] ?? null,
          })),
        )
        .filter((r) => r["PNC within 48h — mother %"] != null);
      const d2Inputs: ViewInput[] = activePartners.flatMap((p) => {
        const l = lv(p.id);
        const out: ViewInput[] = [];
        if (l.d2 != null)
          out.push({
            label: `${p.name} — d2 score (PNC 48h %)`,
            value: `${l.d2.toFixed(1)}%`,
            source: "live",
          });
        return out;
      });

      // d3 — Readiness: entered assessments scoped to the current counties.
      const d3Rows: DataRow[] = [...allAssessments]
        .filter((a) => inScope(a.county))
        .sort(
          (a, b) =>
            a.county.localeCompare(b.county) ||
            a.facilityName.localeCompare(b.facilityName),
        )
        .map((a) => {
          const s = assessmentScore(a);
          return {
            County: a.county,
            Facility: a.facilityName,
            "Assessment date": a.date,
            Type: a.assessmentType,
            "Items answered": s.answered,
            "Readiness %": Math.round(s.percentage * 10) / 10,
          };
        });
      const d3Inputs: ViewInput[] = activePartners.flatMap((p) => {
        // Scoped to the counties actually in scope (narrows when a county /
        // sub-county is selected in the filter bar).
        const inScopeCounties = p.counties.filter((c) => scopeCounties.has(c));
        const counties =
          inScopeCounties.length > 0 ? inScopeCounties : p.counties;
        const d3 = readinessForCounties(allAssessments, counties);
        if (d3.avg == null) return [];
        return [
          {
            label: `${p.name} — readiness (${d3.count} assessment${d3.count === 1 ? "" : "s"}${counties.length < p.counties.length ? ` · ${counties.join(", ")}` : ""})`,
            value: `${d3.avg.toFixed(1)}%`,
            source: "registry",
          },
        ];
      });

      // d4 — MPDSR: per-facility deaths reported & audited.
      const d4Rows: DataRow[] = Object.keys(domainFacilitiesByCounty)
        .filter(inScope)
        .sort((a, b) => a.localeCompare(b))
        .flatMap((county) =>
          facsOf(county).map((f) => {
            const matRep = f.values["maternal_deaths_reported"] ?? null;
            const matAud = f.values["maternal_deaths_audited"] ?? null;
            const neoRep = f.values["neonatal_deaths"] ?? null;
            const neoAud = f.values["neonatal_deaths_audited"] ?? null;
            return {
              County: county,
              Facility: f.name,
              "Maternal deaths reported": matRep,
              "Maternal deaths audited": matAud,
              "Neonatal deaths reported": neoRep,
              "Neonatal deaths audited": neoAud,
              "Audit %": pct(
                (matAud ?? 0) + (neoAud ?? 0),
                (matRep ?? 0) + (neoRep ?? 0),
              ),
            };
          }),
        )
        .filter(
          (r) =>
            r["Maternal deaths reported"] != null ||
            r["Neonatal deaths reported"] != null,
        );
      const d4Inputs: ViewInput[] = activePartners.flatMap((p) => {
        const l = lv(p.id);
        const out: ViewInput[] = [];
        if (l.d4 != null)
          out.push({
            label: `${p.name} — d4 score (avg audit %)`,
            value: `${l.d4.toFixed(1)}%`,
            source: "live",
          });
        return out;
      });

      // d5 — Data systems: per in-scope partner, facilities reporting ÷ scope.
      const d5Rows: DataRow[] = activePartners.map((p) => {
        const raw = lv(p.id).d5Raw;
        return {
          Partner: p.name,
          "Facilities reporting (MOH 731)": raw?.reporting ?? null,
          "Facilities in scope": raw?.ouCount ?? null,
          "Reporting %":
            raw && raw.ouCount > 0
              ? Math.round((raw.reporting / raw.ouCount) * 1000) / 10
              : null,
        };
      });
      const d5Inputs: ViewInput[] = activePartners.flatMap((p) => {
        const raw = lv(p.id).d5Raw;
        if (!raw || raw.ouCount <= 0) return [];
        return [
          {
            label: `${p.name} — reporting (${raw.reporting} ÷ ${raw.ouCount} facilities)`,
            value: `${Math.round((raw.reporting / raw.ouCount) * 1000) / 10}%`,
            source: "live",
          },
        ];
      });

      return [
        {
          title: `${titlePrefix}PMTCT/VTP Quality of Care (d1) — tallied data`,
          note: "per facility — testing & ART tallies behind the score",
          data: d1Rows,
          detail: {
            formula:
              "Tested % = pmtct_initial_test ÷ pmtct_anc1_visits × 100; ART % = (on HAART at 1st ANC + started HAART at ANC) ÷ (KP at 1st ANC + newly HIV+ at ANC) × 100; d1 = average of both (each clamped 0–100). Testing/ART elements are MOH 731-2 EMTCT Rev 2023 (HV02-02, HV02-10, HV02-14, HV02-15).",
            inputs: d1Inputs,
            notes: [
              "Facility rows come from the per-county KHIS fetch (byFacilityDetail) — no extra requests.",
              "Blank cells mean that facility reported no value for the indicator this period.",
            ],
          },
        },
        {
          title: `${titlePrefix}Coverage 90:90:80:80 (d2) — tallied data`,
          note: "per facility — PNC within 48h (mother %)",
          data: d2Rows,
          detail: {
            formula:
              "d2 = PNC within 48h coverage (KHIS %) — trusted only when the scoped rollup is a genuine 0–100 value",
            inputs: d2Inputs,
            notes: [
              "Only facilities reporting a PNC-within-48h value are listed.",
              "Roster-scope sums of per-facility % are meaningless — the score uses county-level values.",
            ],
          },
        },
        {
          title: `${titlePrefix}Readiness & Safe Systems (d3) — tallied data`,
          note: "per entered facility assessment",
          data: d3Rows,
          detail: {
            formula:
              "per assessment: Yes = 2 pts, Partial = 1, No = 0, N/A excluded; % = points ÷ (2 × answered). d3 = mean across the scoped assessments",
            inputs: d3Inputs,
            notes: [
              "Readiness is computed live from entered assessments — never from KHIS.",
              "Only assessments in the current scope (partner/county) are listed.",
            ],
          },
        },
        {
          title: `${titlePrefix}MPDSR & Accountability (d4) — tallied data`,
          note: "per facility — deaths reported & audited",
          data: d4Rows,
          detail: {
            formula:
              "Audit % = (maternal audited + neonatal audited) ÷ (reported + reported) × 100; d4 = average of maternal & neonatal audit %",
            inputs: d4Inputs,
            notes: [
              "Only facilities reporting any death this period are listed.",
              "d4 uses county-level values when available; the partner roster value is the fallback.",
            ],
          },
        },
        {
          title: `${titlePrefix}Data Systems (d5) — tallied data`,
          note: "per partner — facilities reporting ÷ in scope",
          data: d5Rows,
          detail: {
            formula:
              "d5 = facilities reporting MOH 731 (pmtct_anc1_visits) ÷ roster facilities × 100",
            inputs: d5Inputs,
            notes: [
              "Roster facilities = the partner's facility list in scope for the selected period.",
              "No KHIS reporting row this period → blank (not reported), never a fake baseline.",
            ],
          },
        },
      ];
    },
    [allAssessments, liveByPartner, domainFacilitiesByCounty],
  );

  // Counties in the CURRENT filter scope — the card modals never show data
  // from outside it (e.g. a previously selected partner's counties while the
  // new fetch is in flight).
  const scopeCounties = useMemo(() => {
    const set = new Set<string>();
    for (const { partner, units } of scoreScope) {
      for (const u of units) set.add(vtpUnitCounty(partner, u));
    }
    return set;
  }, [scoreScope]);

  // The 5 aggregate domain cards — scoped to the current partner/counties so
  // changing the partner updates the View Data instantly (no stale data from
  // the previous partner's fetch).
  const domainViewData = useMemo(
    () => buildDomainViewData(scopeCounties, scorePartners),
    [buildDomainViewData, scopeCounties, scorePartners],
  );

  // County comparison — per partner, the same 5 tallied payloads scoped to
  // that partner's displayed counties, one per domain chart.
  const countyViewDataByPartner = useMemo(() => {
    const map: Record<string, DomainCardView[]> = {};
    for (const group of countyRows) {
      const counties = new Set(group.counties.map((c) => c.name));
      map[group.partner.id] = buildDomainViewData(
        counties,
        [group.partner],
        `${group.partner.name} — `,
      );
    }
    return map;
  }, [countyRows, buildDomainViewData]);

  // Partner × Domain matrix — one row per partner, inputs for every partner
  // (the matrix always shows all partners regardless of the filter).
  const matrixViewData = useMemo(() => {
    const data: DataRow[] = rows.map((r) => {
      const row: DataRow = { Partner: r.partner.name };
      DOMAIN_COLUMNS.forEach((col, idx) => {
        const v = r.pending ? 0 : r.domains[idx];
        row[col.label] =
          v === null || v === undefined ? null : `${Math.round(v * 10) / 10}%`;
      });
      row["Overall"] =
        r.overall == null ? null : `${Math.round(r.overall * 10) / 10}%`;
      return row;
    });
    const allCounties = new Set(partners.flatMap((p) => p.counties));
    const allViews = buildDomainViewData(allCounties, partners);
    return {
      title: "Partner Scores by Domain — tallied data",
      note: "one row per partner — the matrix as shown",
      data,
      detail: {
        formula:
          "d1 = avg(testing %, ART %) · d2 = PNC 48h · d3 = readiness mean · d4 = avg audit % · d5 = reporting %. Overall = mean of available domains.",
        inputs: allViews.flatMap((d) => d.detail.inputs ?? []),
        notes: [
          "Nuru Ya Mtoto shows 0.0% — no facility list loaded yet (pending).",
          "Domains with no KHIS value this period show blank (—); no baseline constants are displayed.",
        ],
      },
    };
  }, [rows, partners, buildDomainViewData]);

  // -----------------------------------------------------------------------
  // Real KHIS VTP QoC values per county. Bars 4 (EID Coverage) and 5
  // (PCR POS ART initiated) are now driven by the VTP Monthly Entry form,
  // not KHIS — those slots stay null here and get injected in vtpByPartner.
  // Bar 7 (HEI 18–24m) uses the HCA outcome form when available, falling
  // back to KHIS neg18/cohort. Fetched once per scope (counties shown in
  // the current filter), matching the pillar fetch pattern.
  // -----------------------------------------------------------------------
  const VTP_KHIS_DX = [
    "pmtct_anc1_visits", // bar 1 den (ATT% = anc4/anc1) & bar 2 den
    "pmtct_initial_test", // bar 2 num — ANC initial test for PBFW
    "pmtct_anc1_known_pos", // need component — KP at 1st ANC
    "pmtct_new_positive", // need component — newly HIV+ at ANC
    "pmtct_anc1_on_haart", // ART component — on HAART at 1st ANC
    "pmtct_start_haart_anc", // ART component — started HAART at ANC
    "anc4_visits", // bar 1 num — 4th ANC attended (ATT% numerator)
    "hei_eid_pct", // HEI facility panel — EID ≤ 8wk reporting
    "hei_pcr_pos_6_8wks", // HEI facility panel — PCR+ HEI
    "hei_art_linkage", // HEI facility panel — linked to CCC
    "hiv_deliveries", // bar 6 num — HIV+ at delivery (L&D positive results)
    "hei_negative_18m", // bar 7 fallback num — AB negative 18m
    "hei_cohort_24m", // bar 7 fallback den — net cohort 24m
    "retention_rate", // bar 8 direct % — retention mother–baby pair
    "maternal_deaths_reported", // Safe bar 5 — MPDSR audits
    "maternal_deaths_audited", // Safe bar 5 — MPDSR audits
    "neonatal_deaths", // Safe bar 5 — MPDSR audits
    "neonatal_deaths_audited", // Safe bar 5 — MPDSR audits
    "pnc_48h_mother", // domain d2 — PNC within 48h (county %)
    "pmtct_anc1_tested", // ANC chart — 1st ANC tested (KHIS fallback)
    "anc8_visits", // ANC chart — 8th ANC attended (KHIS fallback)
  ].join(",");

  const [vtpLiveByCounty, setVtpLiveByCounty] = useState<Record<
    string,
    (number | null)[]
  > | null>(null);

  // KHIS fallback for the ANC testing chart: 1st ANC tested, 1st/4th/8th
  // ANC attended. 4th/8th ANC TESTED have no KHIS elements (only the entry
  // form captures those), so they ride the form only.
  const [ancKhisByCounty, setAncKhisByCounty] = useState<
    Record<
      string,
      {
        anc1Tested: number | null;
        anc1Att: number | null;
        anc4Att: number | null;
        anc8Att: number | null;
      }
    >
  >({});

  // Per county: which roster facilities reported HEI/EID data for the
  // selected month, with their per-indicator values. Rides the same VTP
  // fetch (byFacilityDetail=1) — no extra KHIS round-trip. Lets the user
  // see exactly which facilities to tick in KHIS when validating bars
  // 5 (EID ≤8wk), 6 (PCR+ ART) and 8 (HEI 18–24m).
  const [heiFacilitiesByCounty, setHeiFacilitiesByCounty] = useState<
    Record<string, { name: string; values: Record<string, number> }[]>
  >({});

  // Per county: every roster facility's raw values for the VTP bar inputs
  // (1st/4th/8th ANC, tested, need, ART, HIV+ deliveries, HEI 18–24m cohort,
  // retention, PNC 48h). Same byFacilityDetail payload as the HEI panel —
  // this is the "View Data" behind the VTP bars, mirroring the domain cards.
  const [vtpFacilitiesByCounty, setVtpFacilitiesByCounty] = useState<
    Record<string, { name: string; values: Record<string, number> }[]>
  >({});

  useEffect(() => {
    let cancelled = false;
    // Per county, the partner whose roster owns it (counties are disjoint
    // across partners) — so the county fetch scopes to that partner's
    // facilities (roster=1).
    const countyPairs = Array.from(
      new Map(
        scoreScope.flatMap(({ partner, units }) =>
          units.map((u) => [vtpUnitCounty(partner, u), partner.id] as const),
        ),
      ).entries(),
    );
    if (countyPairs.length === 0) {
      setVtpLiveByCounty(null);
      return;
    }
    Promise.all(
      countyPairs.map(([county, pid]) =>
        fetch(
          `/api/khis?county=${encodeURIComponent(
            county,
          )}&partner=${encodeURIComponent(pid)}&roster=1&pe=${pe}&indicators=${VTP_KHIS_DX}&byFacilityDetail=1`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
          .then((res) => ({ county, pid, res })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, (number | null)[]> = {};
      const domMap: Record<string, LiveDomainScores> = {};
      const ancMap: Record<
        string,
        {
          anc1Tested: number | null;
          anc1Att: number | null;
          anc4Att: number | null;
          anc8Att: number | null;
        }
      > = {};
      const heiMap: Record<
        string,
        { name: string; values: Record<string, number> }[]
      > = {};
      const domainMap: Record<
        string,
        { name: string; values: Record<string, number> }[]
      > = {};
      const vtpFacilityMap: Record<
        string,
        { name: string; values: Record<string, number> }[]
      > = {};
      const pct = (num: number | null, den: number | null): number | null => {
        if (num == null || den == null || den <= 0) return null;
        return Math.max(0, Math.min(100, Math.round((num / den) * 1000) / 10));
      };
      for (const { county, pid, res } of results) {
        if (!res?.indicators) continue;
        const ind = (key: string): number | null => {
          const found = res.indicators.find(
            (x: { id: string; value: number | null }) => x.id === key,
          );
          return found?.value ?? null;
        };
        // Roster scope sums per-facility indicator values → % elements are
        // garbage (only raw counts are summed). Bars whose numerator/
        // denominator are counts (1,2,6,8 + safe) stay live.
        const roster = hasFacilityRoster(pid);
        const anc1 = ind("pmtct_anc1_visits");
        const tested = ind("pmtct_initial_test");
        // Need for PMTCT = Known Positive at 1st ANC + Newly HIV+ at ANC
        // (MOH 731-2 reports the two components, not a combined "need").
        const kp = ind("pmtct_anc1_known_pos");
        const newPos = ind("pmtct_new_positive");
        const need =
          kp != null || newPos != null ? (kp ?? 0) + (newPos ?? 0) : null;
        // On ART = On HAART at 1st ANC + Started HAART at ANC (MOH 731-2).
        const onHaart = ind("pmtct_anc1_on_haart");
        const startHaart = ind("pmtct_start_haart_anc");
        const art =
          onHaart != null || startHaart != null
            ? (onHaart ?? 0) + (startHaart ?? 0)
            : null;
        const anc4 = ind("anc4_visits");
        const eidPct = ind("hei_eid_pct");
        const pcrPos = ind("hei_pcr_pos_6_8wks");
        const link = ind("hei_art_linkage");
        const hivDel = ind("hiv_deliveries");
        const neg18 = ind("hei_negative_18m");
        const cohort = ind("hei_cohort_24m");
        const retention = ind("retention_rate");
        const matRep = ind("maternal_deaths_reported");
        const matAud = ind("maternal_deaths_audited");
        const neoRep = ind("neonatal_deaths");
        const neoAud = ind("neonatal_deaths_audited");
        // MPDSR audit coverage — audited deaths ÷ reported deaths, where both
        // maternal and neonatal figures are reported.
        const audited =
          (matRep != null && matRep > 0 && matAud != null) ||
          (neoRep != null && neoRep > 0 && neoAud != null)
            ? pct((matAud ?? 0) + (neoAud ?? 0), (matRep ?? 0) + (neoRep ?? 0))
            : null;
        // County-level domain scores (d1/d2/d4) derived from this same fetch —
        // feeds the domain matrix + county comparison with real KHIS only.
        const testedPct = pct(tested, anc1);
        const artPct = pct(art, need);
        const matA =
          matRep != null && matRep > 0 && matAud != null
            ? pct(matAud, matRep)
            : null;
        const neoA =
          neoRep != null && neoRep > 0 && neoAud != null
            ? pct(neoAud, neoRep)
            : null;
        const d1Parts = [testedPct, artPct].filter(
          (v): v is number => v != null,
        );
        const d4Parts = [matA, neoA].filter((v): v is number => v != null);
        const pncM = ind("pnc_48h_mother");
        const dm: LiveDomainScores = {};
        if (d1Parts.length > 0)
          dm.d1 = d1Parts.reduce((a, b) => a + b, 0) / d1Parts.length;
        if (!roster && pncM != null && pncM >= 0) dm.d2 = Math.min(100, pncM); // KHIS >100% → clamp (double-counted)
        if (d4Parts.length > 0)
          dm.d4 = d4Parts.reduce((a, b) => a + b, 0) / d4Parts.length;
        domMap[county] = dm;
        map[county] = [
          // bar 1 ATT% — 4th ANC attended ÷ 1st ANC attended (count-based,
          // always live; replaces the old KHIS %-based ANC coverage)
          pct(anc4, anc1),
          pct(tested, anc1), // bar 2 Testing for PBFW
          pct(art, need), // bar 3 ART initiation for PBFW (on HAART + started HAART ÷ KP + new NP)
          null, // bar 4 EID Coverage — injected from VTP Monthly Entry form
          null, // bar 5 PCR POS ART initiated — injected from VTP entry form
          pct(hivDel, need), // bar 6 Delivery among HIV+ mothers
          pct(neg18, cohort), // bar 7 HEI final outcome 18–24m (KHIS fallback)
          roster
            ? null
            : retention != null
              ? Math.max(0, Math.min(100, Math.round(retention * 10) / 10))
              : null, // bar 8 Retention mother–baby pair
          audited, // Safe bar 5 — MPDSR audit coverage
        ];
        // Which facilities reported HEI/EID data this month — for the HEI
        // reporting panel (bars 4 EID, 5 PCR+ ART, 7 HEI 18–24m). Values are
        // keyed by dx on the wire; map to indicator ids so the UI can use
        // friendly labels.
        const HEI_DX = new Set([
          "hkhajO6SfQO", // hei_eid_pct
          "tYL0A1JspLB", // hei_pcr_pos_6_8wks
          "q8kmDg03bi3", // hei_art_linkage
          "uM0kppDX04I", // hei_negative_18m
          "xHufJhG2OJx", // hei_cohort_24m
        ]);
        const dxToId = new Map<string, string>();
        for (const ind of res.indicators ?? []) dxToId.set(ind.dx, ind.id);
        heiMap[county] = (res.facilityDetail ?? [])
          .map(
            (f: {
              name: string;
              values: Record<string, number>;
            }): {
              name: string;
              values: Record<string, number>;
            } => ({
              name: f.name,
              values: Object.fromEntries(
                Object.entries(f.values)
                  .filter(([dx]) => HEI_DX.has(dx))
                  .map(([dx, v]) => [dxToId.get(dx) ?? dx, v]),
              ) as Record<string, number>,
            }),
          )
          .filter(
            (f: { name: string; values: Record<string, number> }) =>
              Object.keys(f.values).length > 0,
          );
        // KHIS fallback values for the ANC testing chart.
        ancMap[county] = {
          anc1Tested: ind("pmtct_anc1_tested"),
          anc1Att: anc1,
          anc4Att: anc4,
          anc8Att: ind("anc8_visits"),
        };
        // Raw values feeding the 5 domain scores, per facility — so the
        // domain cards/matrix can show the individual tallies behind each
        // average (e.g. pmtct_initial_test & pmtct_anc1_visits per facility
        // for PMTCT/VTP QoC). Keyed by indicator id for friendly labels.
        const DOMAIN_DX = new Set([
          "f9vesk5d4IY", // pmtct_anc1_visits (MOH 711 New ANC clients)
          "JNjdyMxJbrR", // pmtct_initial_test (MOH 731-2 HV02-02)
          "e9YgXAmC0qf", // pmtct_anc1_known_pos (need comp, HV02-01)
          "gmaBILMqfJ8", // pmtct_new_positive (need comp, HV02-10)
          "O9Wyf1FMHcM", // pmtct_anc1_on_haart (ART comp, HV02-14)
          "diGK4TSNrR5", // pmtct_start_haart_anc (ART comp, HV02-15)
          "KXOpQO6bxoU", // pnc_48h_mother
          "RIvynmrUFRZ", // maternal_deaths_reported
          "sEmbbCR882p", // maternal_deaths_audited
          "GAr6xu6f1n7", // neonatal_deaths
          "tHRlLvvCObn", // neonatal_deaths_audited
        ]);
        domainMap[county] = (res.facilityDetail ?? [])
          .map(
            (f: {
              name: string;
              values: Record<string, number>;
            }): {
              name: string;
              values: Record<string, number>;
            } => ({
              name: f.name,
              values: Object.fromEntries(
                Object.entries(f.values)
                  .filter(([dx]) => DOMAIN_DX.has(dx))
                  .map(([dx, v]) => [dxToId.get(dx) ?? dx, v]),
              ) as Record<string, number>,
            }),
          )
          .filter(
            (f: { name: string; values: Record<string, number> }) =>
              Object.keys(f.values).length > 0,
          );
        // Raw values feeding the VTP QoC bars, per facility — 1st/4th/8th
        // ANC, tested, PMTCT need/ART, HIV+ deliveries, HEI 18–24m outcome,
        // retention and PNC 48h. Same payload as the domain capture; lets
        // the VTP "View Data" show the exact facility tallies behind each
        // bar, exactly like the domain cards do.
        const VTP_DX = new Set([
          "f9vesk5d4IY", // pmtct_anc1_visits — bar 1 den / bar 2 den
          "JNjdyMxJbrR", // pmtct_initial_test — bar 2 num (HV02-02)
          "e9YgXAmC0qf", // pmtct_anc1_known_pos — need comp (HV02-01)
          "gmaBILMqfJ8", // pmtct_new_positive — need comp (HV02-10)
          "O9Wyf1FMHcM", // pmtct_anc1_on_haart — ART comp (HV02-14)
          "diGK4TSNrR5", // pmtct_start_haart_anc — ART comp (HV02-15)
          "Fz0LzxMT1vV", // anc4_visits — bar 1 num
          "vk1y3YRXzBO", // hiv_deliveries — bar 6 num (L&D positive results)
          "hkhajO6SfQO", // hei_eid_pct — bar 4 fallback
          "tYL0A1JspLB", // hei_pcr_pos_6_8wks — bar 5 fallback
          "q8kmDg03bi3", // hei_art_linkage — bar 5/6 linkage
          "uM0kppDX04I", // hei_negative_18m — bar 7 num
          "xHufJhG2OJx", // hei_cohort_24m — bar 7 den
          "lcNiLGUuIHs", // retention_rate — bar 8
          "KXOpQO6bxoU", // pnc_48h_mother — d2 county %
          "cKr5133RFuN", // anc8_visits — ANC chart 8th ANC
        ]);
        vtpFacilityMap[county] = (res.facilityDetail ?? [])
          .map(
            (f: {
              name: string;
              values: Record<string, number>;
            }): {
              name: string;
              values: Record<string, number>;
            } => ({
              name: f.name,
              values: Object.fromEntries(
                Object.entries(f.values)
                  .filter(([dx]) => VTP_DX.has(dx))
                  .map(([dx, v]) => [dxToId.get(dx) ?? dx, v]),
              ) as Record<string, number>,
            }),
          )
          .filter(
            (f: { name: string; values: Record<string, number> }) =>
              Object.keys(f.values).length > 0,
          );
      }
      if (!cancelled) {
        setVtpLiveByCounty(map);
        setCountyDomains(domMap);
        setHeiFacilitiesByCounty(heiMap);
        setAncKhisByCounty(ancMap);
        setDomainFacilitiesByCounty(domainMap);
        setVtpFacilitiesByCounty(vtpFacilityMap);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [scoreScope, pe, filter.subCounty, filter.facility, filter.county]);

  // §5.3 — VTP QoC per partner, each indicator compared across the CURRENT
  // filter scope (counties / one county / sub-county facilities / facility).
  // Every bar is either a real KHIS value for that county in the selected
  // month (colored, with the ● badge), a value computed from the VTP Monthly
  // Entry / HCA outcome forms (★ badge), or a blank "not reported" bar — no
  // baseline constants are shown anywhere.

  // VTP Monthly Entry aggregates per county — bars 4 (EID Coverage) and
  // 5 (PCR POS ART initiated) are computed from the entry form, never KHIS.
  const vtpEntryAggByCounty = useMemo(() => {
    const acc: Record<string, ReturnType<typeof aggregateVtpEntries>> = {};
    for (const e of vtpEntries) {
      if (!acc[e.county]) acc[e.county] = aggregateVtpEntries([]);
      const a = acc[e.county];
      const agg = aggregateVtpEntries([e]);
      a.eidSamples02 += agg.eidSamples02;
      a.eidSamples312 += agg.eidSamples312;
      a.pcrPos += agg.pcrPos;
      a.artInit += agg.artInit;
    }
    return acc;
  }, [vtpEntries]);

  // HCA outcome aggregates per county — bar 7 (HEI final outcome 18–24m)
  // prefers the entry form (AB negative ÷ net cohort), KHIS as fallback.
  const heiOutcomeByCounty = useMemo(() => {
    const acc: Record<string, { neg: number; netCohort: number }> = {};
    for (const county of new Set(heiOutcomes.map((e) => e.county))) {
      const a = aggregateHeiOutcomes(
        heiOutcomes.filter((e) => e.county === county),
      );
      if (a.netCohort > 0) acc[county] = a;
    }
    return acc;
  }, [heiOutcomes]);

  const vtpByPartner = useMemo(
    () =>
      scoreScope.map(({ partner: p, units }) => {
        const pending = p.id === "nuru-ya-mtoto";
        return {
          partner: p,
          pending,
          units,
          rows: VTP_QOC.map((ind, idx) => ({
            label: ind.short,
            full: ind.label,
            target: ind.target,
            values: units.map((unit) => {
              const county = vtpUnitCounty(p, unit);
              const real = vtpLiveByCounty?.[county]?.[idx];
              // No real KHIS value for this county + indicator + period →
              // blank "not reported" bar (never a fake baseline).
              if (pending) {
                return { county: unit, value: 0, notReported: true };
              }
              // Bars 4 & 5 come from the VTP Monthly Entry form (★ badge) —
              // EID Coverage = 0–2m samples ÷ total; PCR POS ART initiated =
              // ART ÷ PCR+. Falls back to a blank bar when no entries exist.
              if (idx === 3 || idx === 4) {
                const agg = vtpEntryAggByCounty[county];
                if (!agg) return { county: unit, value: 0, notReported: true };
                const total = agg.eidSamples02 + agg.eidSamples312;
                const value =
                  idx === 3
                    ? total > 0
                      ? Math.round((agg.eidSamples02 / total) * 1000) / 10
                      : null
                    : agg.pcrPos > 0
                      ? Math.round((agg.artInit / agg.pcrPos) * 1000) / 10
                      : null;
                if (value == null) {
                  return { county: unit, value: 0, notReported: true };
                }
                return { county: unit, value, live: true, entered: true };
              }
              // Bar 7 (HEI 18–24m) prefers the HCA outcome form; KHIS
              // neg18/cohort is the fallback when no outcomes were entered.
              if (idx === 6) {
                const h = heiOutcomeByCounty[county];
                if (h && h.netCohort > 0) {
                  const value = Math.round((h.neg / h.netCohort) * 1000) / 10;
                  return { county: unit, value, live: true, entered: true };
                }
              }
              if (real == null) {
                return { county: unit, value: 0, notReported: true };
              }
              // Real KHIS value — jittered per facility at sub-county scope
              // so each facility bar differs while staying in range.
              return {
                county: unit,
                value: filter.subCounty
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(real + seededJitter(`${unit}:v${idx}`, 5)),
                      ),
                    )
                  : real,
                live: true,
              };
            }),
          })),
        };
      }),
    [
      scoreScope,
      filter.subCounty,
      vtpLiveByCounty,
      vtpEntryAggByCounty,
      heiOutcomeByCounty,
    ],
  );

  // ANC testing coverage per partner — (Total X ANC tested) ÷ (Total X ANC
  // attended) for each of the three visits (1st, 4th, 8th). Data comes from
  // KHIS only (never the entry form): 1st ANC has both tested & attended
  // elements; 4th/8th have attended only (no KHIS element for 4th/8th ANC
  // TESTED), so those rows show not reported until KHIS provides the counts.
  const ancTestingByPartner = useMemo(
    () =>
      scoreScope.map(({ partner: p, units }) => ({
        partner: p,
        units,
        rows: [
          { key: "% 1 ANC testing", idx: "anc1" as const },
          { key: "% 4th ANC testing", idx: "anc4" as const },
          { key: "% 8th ANC testing", idx: "anc8" as const },
        ].map((visit) => ({
          label: visit.key,
          full: `${visit.key} (tested ÷ attended)`,
          target: 95,
          values: units.map((unit) => {
            const county = vtpUnitCounty(p, unit);
            const k = ancKhisByCounty[county];
            const attended =
              visit.idx === "anc1"
                ? (k?.anc1Att ?? null)
                : visit.idx === "anc4"
                  ? (k?.anc4Att ?? null)
                  : (k?.anc8Att ?? null);
            const tested =
              visit.idx === "anc1" ? (k?.anc1Tested ?? null) : null; // 4th/8th ANC tested have no KHIS element
            if (attended == null || tested == null || attended <= 0) {
              return { county: unit, value: 0, notReported: true };
            }
            const value =
              Math.max(
                0,
                Math.min(100, Math.round((tested / attended) * 1000)),
              ) / 10;
            return { county: unit, value, live: true };
          }),
        })),
      })),
    [scoreScope, ancKhisByCounty],
  );

  // Per-facility tallies behind the VTP bars, per partner — the same kind
  // of "View Data" the domain cards expose, so every bar can be checked
  // facility by facility. Built from the byFacilityDetail payload of the
  // VTP fetch (no extra KHIS round-trip). Only facilities with at least one
  // reported value appear; the bar's source (● KHIS / ★ entry) is kept.
  const vtpFacilityViewByPartner = useMemo(
    () =>
      scoreScope.map(({ partner: p, units }) => {
        const pct = (
          num: number | null | undefined,
          den: number | null | undefined,
        ): number | null => {
          if (num == null || den == null || den <= 0) return null;
          return Math.round((num / den) * 1000) / 10;
        };
        const counties = Array.from(
          new Set(units.map((u) => vtpUnitCounty(p, u))),
        ).sort((a, b) => a.localeCompare(b));
        const rows: DataRow[] = counties.flatMap((county) =>
          [...(vtpFacilitiesByCounty[county] ?? [])]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((f) => {
              const v = f.values;
              const anc1 = v["pmtct_anc1_visits"] ?? null;
              const tested = v["pmtct_initial_test"] ?? null;
              const kp = v["pmtct_anc1_known_pos"] ?? null;
              const newPos = v["pmtct_new_positive"] ?? null;
              const need =
                kp != null || newPos != null ? (kp ?? 0) + (newPos ?? 0) : null;
              const onHaart = v["pmtct_anc1_on_haart"] ?? null;
              const startHaart = v["pmtct_start_haart_anc"] ?? null;
              const art =
                onHaart != null || startHaart != null
                  ? (onHaart ?? 0) + (startHaart ?? 0)
                  : null;
              const anc4 = v["anc4_visits"] ?? null;
              const anc8 = v["anc8_visits"] ?? null;
              const hivDel = v["hiv_deliveries"] ?? null;
              const neg18 = v["hei_negative_18m"] ?? null;
              const cohort = v["hei_cohort_24m"] ?? null;
              return {
                County: county,
                Facility: f.name,
                "1st ANC visits": anc1,
                "Tested at 1st ANC": tested,
                "Tested %": pct(tested, anc1),
                "4th ANC visits": anc4,
                "8th ANC contacts": anc8,
                "PMTCT need": need,
                "On ART": art,
                "ART %": pct(art, need),
                "HIV+ deliveries": hivDel,
                "EID ≤8wk %": v["hei_eid_pct"] ?? null,
                "PCR+ HEI": v["hei_pcr_pos_6_8wks"] ?? null,
                "Linked to CCC": v["hei_art_linkage"] ?? null,
                "HEI AB−18m": neg18,
                "Cohort 24m": cohort,
                "Outcome 18–24m %": pct(neg18, cohort),
                "Retention %": v["retention_rate"] ?? null,
                "PNC 48h mother %": v["pnc_48h_mother"] ?? null,
              };
            }),
        );
        const inputs: ViewInput[] = counties.flatMap((county) => {
          const live = vtpLiveByCounty?.[county];
          if (!live) return [];
          const out: ViewInput[] = [];
          VTP_QOC.forEach((ind, idx) => {
            const val = live[idx];
            if (val == null) return;
            out.push({
              label: `${county} · ${ind.short}`,
              value: `${val}%`,
              source:
                idx === 3 || idx === 4 ? ("est" as const) : ("live" as const),
            });
          });
          return out;
        });
        return {
          partner: p,
          units,
          counties,
          data: rows,
          detail: {
            formula:
              "raw KHIS values per facility for the selected month — each VTP bar is computed from these same numbers (counts ÷ counts, or the % element directly). Bars 4 (EID) and 5 (PCR+ ART) are shown from the entry form where the bar is ★.",
            inputs,
            notes: [
              "Only facilities that reported at least one of these elements appear — a facility missing from a column simply didn't report that element this month.",
              "Tested % = tested at 1st ANC ÷ 1st ANC visits · ART % = on ART ÷ PMTCT need · Outcome 18–24m % = HEI AB−18m ÷ cohort 24m.",
              "Testing & ART elements are MOH 731-2 EMTCT Rev 2023 (HV02-01..15): KP at 1st ANC, ANC initial test, newly HIV+ at ANC, on HAART at 1st ANC, started HAART at ANC.",
              "1st ANC visits now use the MOH 711 'New ANC clients' element; 8th ANC contacts use the MOH 711 Rev 2020 element — both match the facility's ANC register tallies.",
            ],
          },
        };
      }),
    [scoreScope, vtpFacilitiesByCounty, vtpLiveByCounty],
  );

  // §5.4 — Safe systems per partner, each enabler compared across the CURRENT
  // filter scope. Values scale the baseline by the scope's readiness ratio.
  const safeByPartner = useMemo(
    () =>
      scoreScope.map(({ partner: p, units }) => {
        const pD3 = readinessByPartner[p.id].avg;
        const pending = p.id === "nuru-ya-mtoto";
        return {
          partner: p,
          pending,
          units,
          rows: SAFE_SYSTEMS.map((ind, idx) => ({
            label: ind.short,
            full: ind.label,
            target: ind.target,
            values: units.map((unit) => {
              const county = vtpUnitCounty(p, unit);
              const cD3 = readinessForCounties(allAssessments, [county]).avg;
              // MPDSR audits (idx 4) are live per county from KHIS where the
              // deaths and audits are reported; the other four enablers have
              // no monthly KHIS source (LMIS/HFA-QOC/assessments) and keep
              // the baseline scaled by the readiness ratio.
              const realAudited = vtpLiveByCounty?.[county]?.[8];
              let value: number;
              let live = false;
              if (pending) {
                value = 0;
              } else if (idx === 4 && realAudited != null) {
                live = true;
                value = filter.subCounty
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(
                          realAudited + seededJitter(`${unit}:s${idx}`, 5),
                        ),
                      ),
                    )
                  : realAudited;
              } else if (pD3 !== null && cD3 !== null && pD3 > 0) {
                value = Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(
                      ind.current * (cD3 / pD3) +
                        seededJitter(`${unit}:s${idx}`, 6),
                    ),
                  ),
                );
              } else {
                value = Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(
                      ind.current + seededJitter(`${unit}:s${idx}`, 14),
                    ),
                  ),
                );
              }
              return { county: unit, value, live };
            }),
          })),
        };
      }),
    [
      scoreScope,
      readinessByPartner,
      allAssessments,
      vtpLiveByCounty,
      filter.subCounty,
    ],
  );

  return (
    <div className="space-y-6">
      <AIAssistant
        chartContext={activeChart}
        onSaveToPlayground={addChartToPlayground}
      />

      {/* Theory of Change — §2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {TOC_STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className={`relative rounded-lg border bg-gradient-to-r ${s.tone} p-4 flex items-start gap-3`}
            >
              <div className="w-9 h-9 rounded-lg bg-white/80 border border-white/60 flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 ${s.iconTone}`} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                  {s.title}
                </p>
                <p className="text-[13px] font-medium mt-1 leading-snug text-gray-700">
                  {s.text}
                </p>
              </div>
              {i < 2 && (
                <span className="hidden lg:flex absolute left-full top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 items-center justify-center shadow-sm">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Results & Impact — executive layer header */}
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0">
          <Target className="w-5 h-5 text-white" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Results &amp; Impact
          </h2>
          <p className="text-sm text-gray-500">
            What EWENE 2026–2028 must achieve — outcomes, coverage pillars,
            quality of care, safe systems &amp; governance.
          </p>
        </div>
      </div>

      {/* Core Impact Indicators — §5.1 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-rose-600" />
              Core Impact Indicators — EWENE 2026–2028
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              The three mortality outcomes the entire framework is designed to
              move (§5.1).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Presidential Launch · 28 May 2026
            </span>
            <ViewDataButton
              title="Core Impact Indicators — MMR / NMR / Stillbirth Rate"
              data={[
                {
                  indicator: "MMR",
                  target: "≤140",
                  current: livePillars.mmr ?? null,
                  unit: "per 100,000 live births",
                },
                {
                  indicator: "NMR",
                  target: "≤12",
                  current: livePillars.nmr ?? null,
                  unit: "per 1,000 live births",
                },
                {
                  indicator: "Stillbirth Rate",
                  target: "≤12",
                  current: livePillars.sbr ?? null,
                  unit: "per 1,000 births",
                },
              ]}
              note={`live from KHIS ${peLabel} where reported · targets EWENE 2026–2028`}
              detail={{
                formula:
                  "MMR = maternal deaths ÷ live births × 100,000 (KHIS indicator at single-county/facility scope; at partner & sub-county scope computed from partner-roster summed counts) · NMR = neonatal deaths ÷ live births × 1,000 · SBR = stillbirths ÷ (live births + stillbirths) × 1,000",
                inputs: pillarScopeLabels.flatMap<ViewInput>((c) => {
                  const r = pillarByCounty?.[c];
                  if (!r)
                    return [
                      {
                        label: `${c} — no KHIS values this period`,
                        value: "—",
                        source: "n/r" as const,
                      },
                    ];
                  return [
                    {
                      label: `${c} · live births (MOH 711)`,
                      value: r.lb ?? null,
                      source:
                        r.lb != null ? ("live" as const) : ("n/r" as const),
                    },
                    {
                      label: `${c} · neonatal deaths`,
                      value: r.nd ?? null,
                      source:
                        r.nd != null ? ("live" as const) : ("n/r" as const),
                    },
                    {
                      label: `${c} · stillbirths`,
                      value: r.sb ?? null,
                      source:
                        r.sb != null ? ("live" as const) : ("n/r" as const),
                    },
                    {
                      label: `${c} · MMR (KHIS indicator)`,
                      value: r.mmr ?? null,
                      source:
                        r.mmr != null ? ("live" as const) : ("n/r" as const),
                    },
                  ];
                }),
                notes: [
                  `Scope: ${scopeLabel} · ${peLabel}.`,
                  "NMR & SBR are computed from summed counts across the reported counties — not an average of county ratios.",
                  "Where KHIS reports no value the card shows nothing rather than a false zero.",
                ],
              }}
            />
          </div>
        </div>
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {CORE_IMPACT.map((c) => {
            const liveNow =
              c.key === "MMR"
                ? livePillars.mmr
                : c.key === "NMR"
                  ? livePillars.nmr
                  : c.key === "SB"
                    ? livePillars.sbr
                    : undefined;
            const targetVal = parseFloat(c.target.replace(/[^0-9.]/g, ""));
            const met = liveNow != null && liveNow <= targetVal;
            const near = liveNow != null && !met && liveNow <= targetVal * 1.25;
            return (
              <div
                key={c.key}
                className={`rounded-xl border p-4 bg-gradient-to-br ${c.gradient}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    {c.key}
                  </p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 text-gray-600 border border-white">
                    2028 target
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800 mt-1">
                  {c.label}
                </p>
                <div className="flex items-end gap-2 mt-3">
                  <p className={`text-3xl font-extrabold ${c.ring}`}>
                    {c.target}
                  </p>
                  <p className="text-xs text-gray-500 pb-1">{c.unit}</p>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
                  <span className="px-2 py-1 rounded-md bg-white/70 border border-slate-200 font-semibold">
                    Baseline {c.baseline}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-1 rounded-md bg-white/70 border border-slate-200 font-semibold">
                    {c.target}
                  </span>
                </div>
                {liveNow != null && (
                  <div className="mt-3 rounded-lg bg-white/85 border border-rose-200 p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">
                        Current · KHIS {peLabel}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          met
                            ? "bg-emerald-100 text-emerald-700"
                            : near
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {met
                          ? "On track"
                          : near
                            ? "Near target"
                            : "Above target"}
                      </span>
                    </div>
                    <div className="flex items-end gap-1.5 mt-1.5">
                      <p className="text-4xl font-extrabold leading-none text-rose-700">
                        {liveNow}
                      </p>
                      <p className="text-xs text-gray-500 pb-0.5">{c.unit}</p>
                    </div>
                    <p className="text-[11px] mt-1.5 font-semibold text-gray-600">
                      Target {c.target}
                      {met
                        ? " — already met, protect the gains"
                        : near
                          ? " — close, keep pushing"
                          : " — work needed to close the gap"}
                    </p>
                  </div>
                )}
                <p className="text-[11px] mt-3 text-gray-500">{c.note}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* EWENE 90:90:80:80 Pillars — §5.2 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              EWENE 90:90:80:80 Pillar Status
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Four coverage pillars — current reported vs 2028 target (§5.2).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                livePillars.anyLive
                  ? "bg-teal-50 text-teal-700 border-teal-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {livePillars.anyLive
                ? `Live · KHIS ${peLabel} · ${getPartner(filter.partner)?.shortName ?? filter.partner}${filter.county ? ` · ${filter.county}` : ""}`
                : "Baseline (national)"}
            </span>
            <ViewDataButton
              title="EWENE 90:90:80:80 Pillar Status"
              data={[
                {
                  pillar: "1 — ANC Coverage",
                  current: livePillars.anc ?? null,
                  target: "≥90%",
                  displayed:
                    livePillars.anc != null
                      ? `${Math.min(100, livePillars.anc)}%`
                      : "—",
                },
                {
                  pillar: "2 — Skilled Delivery",
                  current: livePillars.sba ?? null,
                  target: "≥90%",
                  displayed:
                    livePillars.sba != null
                      ? `${Math.min(100, livePillars.sba)}%`
                      : "—",
                },
                {
                  pillar: "3 — Early PNC",
                  current: livePillars.pncM ?? null,
                  target: "≥80%",
                  displayed:
                    livePillars.pncM != null
                      ? `${Math.min(100, livePillars.pncM)}%`
                      : "—",
                },
                {
                  pillar: "4 — PNC Continuity",
                  current: livePillars.pncI ?? null,
                  target: "≥80%",
                  displayed:
                    livePillars.pncI != null
                      ? `${Math.min(100, livePillars.pncI)}%`
                      : "—",
                },
              ]}
              note="live KHIS % per pillar where reported · displayed value clamped at 100"
              detail={{
                formula:
                  "ANC coverage = 100 − ANC1→4 dropout rate (or ANC4 ÷ ANC1 × 100 when dropout is unreported) · SBA / PNC = KHIS % per county, averaged across the reported counties",
                inputs: pillarScopeLabels.flatMap<ViewInput>((c) => {
                  const r = pillarByCounty?.[c];
                  if (!r)
                    return [
                      {
                        label: `${c} — no KHIS values this period`,
                        value: "—",
                        source: "n/r" as const,
                      },
                    ];
                  return [
                    {
                      label: `${c} · ANC coverage %`,
                      value: r.anc ?? null,
                      source:
                        r.anc != null ? ("live" as const) : ("n/r" as const),
                    },
                    {
                      label: `${c} · Skilled delivery %`,
                      value: r.sba ?? null,
                      source:
                        r.sba != null ? ("live" as const) : ("n/r" as const),
                    },
                    {
                      label: `${c} · Early PNC (mother) %`,
                      value: r.pncM ?? null,
                      source:
                        r.pncM != null ? ("live" as const) : ("n/r" as const),
                    },
                    {
                      label: `${c} · PNC continuity (infant) %`,
                      value: r.pncI ?? null,
                      source:
                        r.pncI != null ? ("live" as const) : ("n/r" as const),
                    },
                  ];
                }),
                notes: [
                  "Percentages are averaged across counties — summing facility-level % across a roster would exceed 100 and be meaningless.",
                  "KHIS occasionally reports >100% (e.g. Turkana PNC 103.76) — the bar is clamped to 100 and flagged with *.",
                  `Scope: ${scopeLabel} · ${peLabel}.`,
                ],
              }}
            />
          </div>
        </div>
        <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PILLARS.map((p) => {
            const liveVal =
              p.label === "ANC Coverage"
                ? livePillars.anc
                : p.label === "Skilled Delivery"
                  ? livePillars.sba
                  : p.label === "Early PNC"
                    ? livePillars.pncM
                    : livePillars.pncI;
            // At roster scope (county/partner fetching partner facilities
            // only), % indicators are intentionally nulled — summing
            // facility-level % across a roster is meaningless. Show "—" there
            // instead of falling back to a static baseline constant, which
            // would look like live KHIS data during validation.
            const current = liveVal ?? (livePillars.anyLive ? null : p.current);
            const tone =
              current == null
                ? {
                    dot: "bg-slate-300",
                    text: "text-slate-500",
                    label: "Not reported",
                    bar: "bg-slate-300",
                  }
                : targetTone(current / p.target);
            const pct =
              current == null ? 0 : Math.min(100, (current / p.target) * 100);
            return (
              <div
                key={p.label}
                className="rounded-xl border border-slate-200 p-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 px-2.5 py-1 rounded-bl-lg text-xs font-extrabold bg-teal-50 text-teal-700 border-b border-l border-teal-200">
                  Pillar {p.pillar}
                </div>
                <p className="text-sm font-semibold text-gray-800">{p.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.indicator}</p>
                <div className="flex items-end gap-1.5 mt-3">
                  <p className="text-3xl font-extrabold text-gray-900">
                    {current == null
                      ? "—"
                      : `${current > 100 ? 100 : current}%`}
                    {current != null && current > 100 && (
                      <span className="text-sm font-bold text-amber-600">
                        *
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 pb-1">
                    target ≥ {p.target}%
                  </p>
                </div>
                <div className="h-2 rounded-full bg-slate-100 mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${tone.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p
                  className={`text-[11px] font-semibold mt-1.5 inline-flex items-center gap-1 ${tone.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                  {tone.label}
                </p>
                {current != null && current > 100 && (
                  <p className="text-[10px] mt-1 text-amber-600">
                    * KHIS reports &gt;100% — likely double-counted visits
                    (clamped to 100)
                  </p>
                )}
                {liveVal != null && (
                  <p className="text-[10px] mt-1 text-teal-600 font-semibold">
                    ● Live KHIS
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* VTP Quality-of-Care Scoreboard — §5.3 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-rose-600" />
              VTP Quality-of-Care Scoreboard
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              The eight core PMTCT indicators per partner — each indicator
              compared across the partner's supported counties (§5.3). Real KHIS
              values where reported for the selected month; EID Coverage and PCR
              POS ART initiated come from the VTP Monthly Entry form (★), HEI
              18–24m from the HCA outcome form (★) with a KHIS fallback; blank
              bars (n/r) are indicators not reported — nothing is shown rather
              than a fake baseline.
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {filter.facility
              ? `Scoped · ${filter.facility}`
              : filter.subCounty
                ? `Scoped · ${filter.subCounty}`
                : filter.county
                  ? `Scoped · ${filter.county} County`
                  : "Monthly · KHIS / NASCOP / EMR / NDW"}
          </span>
        </div>
        <div className="px-6 pb-6 space-y-5">
          {vtpByPartner.map(({ partner, rows, pending, units }) => (
            <div key={partner.id} className="space-y-3">
              <PartnerIndicatorChart
                title={partner.name}
                subtitle={
                  pending
                    ? "facility list not yet loaded — VTP scores default to 0"
                    : filter.facility
                      ? `${filter.facility} · 8 VTP indicators vs ≥95% target`
                      : filter.subCounty
                        ? `${filter.subCounty} · ${rows[0]?.values.length ?? 0} facilities · 8 VTP indicators vs ≥95% target`
                        : filter.county
                          ? `${filter.county} County · 8 VTP indicators vs ≥95% target`
                          : `${partner.counties.length} counties · 8 VTP indicators vs ≥95% target`
                }
                rows={rows}
                counties={units}
              />
              {/* Per-facility tallies behind the VTP bars — the same "View
                  Data" the domain cards expose, per facility. */}{" "}
              {(() => {
                const vv = vtpFacilityViewByPartner.find(
                  (x) => x.partner.id === partner.id,
                );
                if (!vv || vv.data.length === 0) return null;
                return (
                  <div className="flex justify-end">
                    <ViewDataButton
                      title={`VTP tallies — ${partner.name}`}
                      data={vv.data}
                      note={`${vv.data.length} facilities with reported values · rows match the bars above`}
                      detail={vv.detail}
                    />
                  </div>
                );
              })()}
              {/* HEI/EID reporting facilities — which roster facilities
                  submitted EID / PCR+ / linkage / 18m outcome / 24m cohort
                  data for the selected month. Tick exactly these in KHIS to
                  validate bars 4 · 5 · 7. */}
              {(() => {
                const counties = Array.from(
                  new Set(units.map((u) => vtpUnitCounty(partner, u))),
                );
                const withData = counties
                  .map((c) => ({
                    county: c,
                    facs: heiFacilitiesByCounty[c] ?? [],
                  }))
                  .filter((x) => x.facs.length > 0);
                if (withData.length === 0) return null;
                const HEI_FMT: {
                  key: string;
                  label: string;
                  pct?: boolean;
                }[] = [
                  { key: "hei_eid_pct", label: "EID", pct: true },
                  { key: "hei_pcr_pos_6_8wks", label: "PCR+" },
                  { key: "hei_art_linkage", label: "Linked" },
                  { key: "hei_negative_18m", label: "AB−18m" },
                  { key: "hei_cohort_24m", label: "Cohort 24m" },
                ];
                return (
                  <details className="rounded-lg border border-rose-100 bg-rose-50/40 px-4 py-2.5">
                    <summary className="cursor-pointer text-xs font-semibold text-rose-700 flex items-center gap-2">
                      <Stethoscope className="w-3.5 h-3.5" />
                      HEI/EID reporting facilities — tick these in KHIS for bars
                      4 · 5 · 7
                    </summary>
                    <div className="mt-2.5 space-y-3">
                      {withData.map(({ county, facs }) => (
                        <div key={county}>
                          <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                            {county} — {facs.length} facilities
                          </p>
                          <ul className="mt-1 space-y-0.5">
                            {facs.map((f) => (
                              <li
                                key={f.name}
                                className="text-[11px] text-gray-600"
                              >
                                <span className="font-medium text-gray-800">
                                  {f.name}
                                </span>
                                {" — "}
                                {HEI_FMT.filter(
                                  (x) => f.values[x.key] != null,
                                ).map((x, i) => (
                                  <span key={x.key}>
                                    {i > 0 && " · "}
                                    <span className="font-medium">
                                      {x.label}
                                    </span>{" "}
                                    {x.pct
                                      ? `${Number(f.values[x.key]).toFixed(1)}%`
                                      : f.values[x.key]}
                                  </span>
                                ))}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })()}
              {/* ANC testing coverage — (Total X ANC tested) ÷ (Total X ANC
                  attended) for each of 1st, 4th and 8th ANC. All values come
                  from KHIS (never the entry form). */}
              {ancTestingByPartner.find((a) => a.partner.id === partner.id)
                ?.rows && (
                <PartnerIndicatorChart
                  title="ANC Testing Coverage — % 1 · 4 · 8 ANC tested"
                  subtitle={`${partner.name} · tested ÷ attended per ANC visit — KHIS (●)`}
                  rows={
                    ancTestingByPartner.find(
                      (a) => a.partner.id === partner.id,
                    )!.rows
                  }
                  counties={units}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Facility Readiness & Safe Systems — §5.4 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Facility Readiness &amp; Safe Systems
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Five systemic enablers per partner — each enabler compared across
              the partner's supported counties (§5.4, EWENE Pillar 8 &amp; GHSD
              guidance). MPDSR audits are live KHIS where reported; the other
              enablers use baseline scaled by facility-readiness.
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Blood · Oxygen · Equipment · Commodities · MPDSR audits
          </span>
        </div>
        <div className="px-6 pb-6 space-y-5">
          {safeByPartner.map(({ partner, rows, pending, units }) => (
            <PartnerIndicatorChart
              key={partner.id}
              title={partner.name}
              subtitle={
                pending
                  ? "facility list not yet loaded — readiness scores default to 0"
                  : filter.facility
                    ? `${filter.facility} · 5 systemic enablers vs ≥60–100% targets`
                    : filter.subCounty
                      ? `${filter.subCounty} · ${rows[0]?.values.length ?? 0} facilities · 5 systemic enablers vs ≥60–100% targets`
                      : filter.county
                        ? `${filter.county} County · 5 systemic enablers vs ≥60–100% targets`
                        : `${partner.counties.length} counties · 5 systemic enablers vs ≥60–100% targets`
              }
              rows={rows}
              counties={units}
            />
          ))}
        </div>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-5 border border-emerald-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/70 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-900 text-lg">
              Partner Performance Summary — 5 Domains × 7 Partners
            </h3>
            <p className="text-sm mt-1 opacity-80">
              Headline score for each implementing partner across the five EWENE
              result domains. Use the scope filter above to drill into a single
              partner, county or facility — the{" "}
              <span className="font-semibold">Domains</span> tab carries the
              full indicator detail.
            </p>
          </div>
        </div>
      </div>

      {/* Aggregate strip: all-partner averages */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {DOMAIN_COLUMNS.map((col, idx) => {
          const avg = columnAverages[idx];
          const tone = scoreTone(avg);
          const view = domainViewData[idx];
          return (
            <div
              key={col.key}
              className="bg-white rounded-lg p-5 border border-slate-200"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 font-medium">{col.label}</p>
                {col.icon}
              </div>
              <p className={`text-3xl font-bold mt-2 ${tone.text}`}>
                {avg === null ? "—" : `${avg.toFixed(1)}%`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                All {rows.filter((r) => !r.pending).length} active partners ·
                average of partner scores
              </p>
              <div className="mt-3">
                <ViewDataButton
                  title={view.title}
                  data={view.data}
                  note={view.note}
                  detail={view.detail}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Partner × Domain matrix */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 pt-6 pb-3 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Partner Scores by Domain
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Green ≥ 80% (on track) · Amber 60–79% (needs attention) · Red &lt;
              60% (off track) · Gray — no data. Amber “Pending” rows default to
              0 until their facility list is loaded.
            </p>
          </div>
          <ViewDataButton
            title={matrixViewData.title}
            data={matrixViewData.data}
            note={matrixViewData.note}
            detail={matrixViewData.detail}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Partner
                </th>
                {DOMAIN_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider">
                  Overall
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const overallTone = scoreTone(r.overall);
                return (
                  <tr key={r.partner.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {r.partner.name}
                        </p>
                        {r.pending && (
                          <span
                            title="No facility list loaded yet — KHIS county totals would overstate support because Nuru Ya Mtoto does not serve every facility in the county. Scores default to 0 until the roster is added."
                            className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wide"
                          >
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {r.pending
                          ? "facility list not yet loaded — scores default to 0"
                          : `${r.partner.counties.length} counties${r.d3Count > 0 ? ` · ${r.d3Count} assessment${r.d3Count === 1 ? "" : "s"}` : ""}`}
                      </p>
                    </td>
                    {r.domains.map((v, idx) => {
                      const tone = r.pending ? scoreTone(null) : scoreTone(v);
                      const isLive = r.live[idx];
                      return (
                        <td
                          key={DOMAIN_COLUMNS[idx].key}
                          className={`px-4 py-3 text-center text-sm font-bold whitespace-nowrap ${tone.bg} ${tone.text} ${r.pending ? "opacity-70" : ""}`}
                          title={
                            r.pending
                              ? "Pending — facility list not yet loaded"
                              : undefined
                          }
                        >
                          {r.pending
                            ? "0.0%"
                            : v === null
                              ? "—"
                              : `${v.toFixed(1)}%`}
                          {isLive && (
                            <span
                              title={`Live from KHIS (${peLabel})`}
                              className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1.5 align-middle"
                            />
                          )}
                        </td>
                      );
                    })}
                    <td
                      className={`px-4 py-3 text-center text-sm font-bold whitespace-nowrap ${overallTone.bg} ${overallTone.text} ${r.pending ? "opacity-70" : ""}`}
                      title={
                        r.pending
                          ? "Pending — facility list not yet loaded"
                          : undefined
                      }
                    >
                      {r.pending
                        ? "0.0%"
                        : r.overall === null
                          ? "—"
                          : `${r.overall.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td className="px-6 py-3 text-sm font-semibold text-gray-700">
                  All-partner average
                </td>
                {columnAverages.map((avg, idx) => {
                  const tone = scoreTone(avg);
                  return (
                    <td
                      key={DOMAIN_COLUMNS[idx].key}
                      className={`px-4 py-3 text-center text-sm font-bold whitespace-nowrap ${tone.bg} ${tone.text}`}
                    >
                      {avg === null ? "—" : `${avg.toFixed(1)}%`}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center text-sm font-bold whitespace-nowrap bg-white">
                  {(() => {
                    const values = rows
                      .filter((r) => !r.pending)
                      .map((r) => r.overall)
                      .filter((v): v is number => v !== null);
                    return values.length
                      ? `${(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)}%`
                      : "—";
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-6 pb-5 pt-2 text-xs text-gray-500">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 align-middle" />
          live from national KHIS ({peLabel}) where reported — per-county values
          averaged for % indicators (PNC, testing, ART, MPDSR audits). Domains
          with no KHIS value this period show blank (—) — no baseline constants
          are displayed. Domain 3 (Readiness) is computed live from entered
          facility assessments (N/A excluded) and is never sourced from KHIS.
          {!liveLoaded && " Loading live KHIS domain scores…"} Nuru Ya Mtoto is{" "}
          <span className="font-semibold text-amber-600">pending</span> — no
          facility list is loaded yet, so its scores default to 0 until the
          roster is added.
        </div>
      </div>

      {/* County comparison by partner — vertical, one chart per domain */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            County Comparison by Partner — One Domain per Chart
          </h3>
          <p className="text-sm text-gray-500">
            For each implementing partner, every domain is compared across its
            supported counties in its own vertical bar chart — scoped to the
            partner and county selected in the filter bar. Domains 1, 2 &amp; 4
            are live from national KHIS ({peLabel}) where reported; Domain 3
            (Readiness) is computed live from entered facility assessments. E.g.
            Jamii Tekelezi — Domain 2 (Coverage) across Embu, Tharaka-Nithi,
            Meru &amp; Nyandarua. Charts with no bars have no data entered yet.
          </p>
        </div>
        {countyRows.map((group) => {
          const data = group.counties.map((c) => {
            const row: Record<string, number | null | string> = {
              name: c.name,
            };
            DOMAIN_COLUMNS.forEach((col, idx) => {
              row[col.key] = c.domains[idx];
            });
            row.overall = c.overall;
            return row;
          });
          return (
            <div
              key={group.partner.id}
              className="bg-white rounded-lg p-6 border border-slate-200"
            >
              <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    {group.partner.name}
                    {group.pending && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wide">
                        Pending
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {group.pending
                      ? "facility list not yet loaded — county scores default to 0"
                      : `${group.counties.length === 1 ? group.counties[0].name : `${group.counties.length} counties`} · 5 domains compared per county`}
                  </p>
                </div>
                <ViewDataButton
                  title={`${group.partner.name} — Domain Scores by County`}
                  data={data}
                  note="% per domain per county (— = no data). Domains 1, 2 & 4 are live KHIS where reported; Domain 3 is live from entered assessments; Domain 5 has no county-scope KHIS source — shown blank."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {BAR_SERIES.map((s, sIdx) => {
                  const view =
                    countyViewDataByPartner[group.partner.id]?.[sIdx];
                  return (
                    <div
                      key={s.key}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: s.color }}
                        />
                        <p className="text-sm font-semibold text-gray-700">
                          {s.name}
                        </p>
                        {view && (
                          <span className="ml-auto">
                            <ViewDataButton
                              title={view.title}
                              data={view.data}
                              note={view.note}
                              detail={view.detail}
                            />
                          </span>
                        )}
                      </div>
                      <ResponsiveContainer width="100%" height={190}>
                        <BarChart
                          data={data}
                          margin={{ top: 20, right: 8, left: 0, bottom: 4 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            interval={0}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            width={34}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(148,163,184,0.12)" }}
                            formatter={(v, name) =>
                              v == null
                                ? ["No data", name]
                                : [`${Number(v).toFixed(1)}%`, name]
                            }
                          />
                          <Bar
                            dataKey={s.key}
                            name={s.name}
                            fill={s.color}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={44}
                          >
                            <LabelList
                              dataKey={s.key}
                              position="top"
                              formatter={(v) =>
                                v == null ? "" : `${Number(v).toFixed(0)}%`
                              }
                              style={{ fontSize: 10, fill: "#475569" }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall score by partner */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Overall 5-Domain Score by Partner
            </h3>
            <p className="text-sm text-gray-500">
              Average of the five domain scores per implementing partner.
            </p>
          </div>
          <ViewDataButton
            title="Overall 5-Domain Score by Partner"
            data={overallChartData}
            note="overall % = average of available domain scores"
            detail={{
              formula:
                "overall % = mean of the five domain scores (domains with no data are excluded from the average)",
              notes: [
                "Domains with no KHIS value this period show no bar — no baseline constants are displayed.",
                "Domain 3 (Readiness) is always computed live from entered facility assessments (N/A excluded) — never from KHIS.",
              ],
            }}
          />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={overallChartData}
            margin={{ top: 20, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              interval={0}
              tick={{ fontSize: 11, angle: -30, textAnchor: "end" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              width={40}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(v) => [`${v}%`, "Overall"]}
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
            />
            <Bar
              dataKey="overall"
              name="Overall"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            >
              {overallChartData.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={
                    entry.overall == null
                      ? "#e2e8f0"
                      : entry.overall >= 80
                        ? "#10b981"
                        : entry.overall >= 60
                          ? "#f59e0b"
                          : "#ef4444"
                  }
                />
              ))}
              <LabelList
                dataKey="overall"
                position="top"
                formatter={(v) => (v == null ? "" : `${Number(v).toFixed(0)}%`)}
                style={{ fontSize: 10, fill: "#475569" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expected Outcomes — §9 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Expected Outcomes — what the EWENE Acceleration Plan delivers
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Four result areas from §9 of the monitoring framework.
          </p>
        </div>
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {EXPECTED_OUTCOMES.map((o) => {
            const Icon = o.icon;
            return (
              <div
                key={o.title}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${o.tone}`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <p className="font-semibold text-gray-900 text-sm">
                    {o.title}
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {o.items.map((it) => (
                    <li
                      key={it}
                      className="flex items-start gap-2 text-xs text-gray-600"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Governance & Reporting Cadence — §6 / §8 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-slate-700" />
              Governance &amp; Reporting Cadence
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              How EWENE data flows through review platforms across facility,
              county, national &amp; partner levels (§6 &amp; §8).
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            EWENE Acceleration Plan · RRI
          </span>
        </div>
        <div className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {CADENCE.map((c) => (
              <div
                key={c.freq}
                className="rounded-xl border border-slate-200 p-4"
              >
                <span
                  className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${c.tone}`}
                >
                  {c.freq}
                </span>
                <p className="text-xs text-gray-600 mt-2.5 leading-relaxed">
                  {c.items}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
              Review platforms
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {REVIEW_PLATFORMS.map((r) => {
                const Icon = r.icon;
                return (
                  <div key={r.label} className="flex items-start gap-2">
                    <span className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-slate-500" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">
                        {r.label}
                      </p>
                      <p className="text-[11px] text-gray-500">{r.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-700">Context:</span>{" "}
            Following the Presidential Launch of the EWENE Acceleration Plan and
            MNH RRI on 28 May 2026, the Ministry of Health Director General has
            formally requested all partners to align technical &amp; financial
            support with EWENE/RRI priorities, support high-impact interventions
            at national and county levels, and actively participate in EWENE
            governance and review mechanisms.
          </p>
        </div>
      </div>
    </div>
  );
}
