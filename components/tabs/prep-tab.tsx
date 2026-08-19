"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ShieldCheck, Users, HeartPulse, Sparkles, Save } from "lucide-react";
import { useGeoFilter } from "@/lib/geo-filter-context";
import { useKhis } from "@/lib/use-khis";
import { PARTNER_FACILITIES } from "@/lib/partners";
import { AIAssistant, type ChartInsight } from "@/components/ai-assistant";
import { ViewDataButton } from "@/components/view-data";

// ---------------------------------------------------------------------------
// PrEP — separate prevention track (own top-level tab)
//   Story: ANC screening → eligibility → initiation → continuation → retention
//   per the EWENE tracking framework (ANC stage: "PrEP screening"; ART/MCH
//   stage: "PrEP for PBFW"; tracking focus: early identification, linkage,
//   adherence monitoring). Values are KHIS/EMR-illustrative until live data
//   entry is wired in.
// ---------------------------------------------------------------------------

function Kpi({
  title,
  value,
  sub,
  accent = "text-violet-600",
}: {
  title: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-lg p-5 border border-slate-200">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${accent}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function SectionBanner({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-5 border border-violet-200 text-violet-900">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm mt-1 opacity-80">{subtitle}</p>
    </div>
  );
}

// ---- DEMO fallback — used only when live KHIS is unreachable ----
const DEMO_PREP = {
  screened: 1025, // 1st ANC visits (MOH 731 HV02-01)
  eligible: 280, // Eligible PrEP Total
  initiated: 198, // Initiated (New) PrEP Total
  refill: 156, // Continuing (Refills) PrEP Total
  current: 132, // Currently on PrEP (New + Refill + Restart) Total
};

// Facility-level: eligible vs initiated (illustrative until facility-level
// analytics is enabled).
const prepFacilityData = [
  { name: "Embu CRH", eligible: 62, initiated: 47 },
  { name: "Runyenjes", eligible: 48, initiated: 31 },
  { name: "Meru TRH", eligible: 55, initiated: 40 },
  { name: "Nkubu HC", eligible: 25, initiated: 13 },
  { name: "Ol Kalou SCH", eligible: 44, initiated: 30 },
  { name: "Chuka CRH", eligible: 46, initiated: 37 },
];

// Retention is computed live inside the component (currently on vs discontinued).
const prepInitiationData = [
  { month: "Jan", initiated: 150, active: 148 },
  { month: "Feb", initiated: 165, active: 156 },
  { month: "Mar", initiated: 178, active: 164 },
  { month: "Apr", initiated: 190, active: 171 },
  { month: "May", initiated: 205, active: 180 },
  { month: "Jun", initiated: 218, active: 190 },
];

function CascadeBar({
  stage,
  count,
  max,
  note,
  reported = true,
}: {
  stage: string;
  count: number;
  max: number;
  note?: string;
  // false = KHIS did not report this stage this period while other stages
  // ARE live — render "n/r" instead of a misleading 0 bar (a 0 between two
  // live numbers would imply an impossible drop).
  reported?: boolean;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-baseline gap-2 mb-1">
        <p className="text-sm font-medium text-gray-700">{stage}</p>
        <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
          {reported ? count.toLocaleString() : "n/r"}
          {note && (
            <span className="text-xs font-medium text-gray-400 ml-2">
              {note}
            </span>
          )}
        </p>
      </div>
      <div className="w-full bg-slate-100 rounded-md h-8 overflow-hidden">
        {reported ? (
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-r-md flex items-center justify-end pr-2 text-white text-xs font-bold transition-all"
            // Cap at 100% — an estimate can exceed the live first-stage count.
            style={{ width: `${Math.min(pct, 100)}%` }}
          >
            {pct >= 18 && pct <= 100 && `${Math.round(pct)}% of screened`}
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center rounded-md border-2 border-dashed border-slate-300 text-[11px] font-medium text-slate-400">
            not reported on KHIS this period
          </div>
        )}
      </div>
    </div>
  );
}

export function PrepTab({
  onSaveToPlayground,
}: {
  onSaveToPlayground?: (chart: ChartInsight) => void;
}) {
  const { filter, pe, peLabel, periodFuture } = useGeoFilter();
  const partner = filter.partner || "jamii-tekelezi";
  const [activeChart, setActiveChart] = useState<ChartInsight | null>(null);

  const addChartToPlayground = (chart: ChartInsight) => {
    onSaveToPlayground?.(chart);
  };

  // The Facility filter stores the facility NAME; resolve it to the KHIS
  // org-unit UID so analytics are scoped to that single facility.
  const facilityUid = useMemo(() => {
    if (!filter.facility) return undefined;
    const fac = PARTNER_FACILITIES[partner]?.find(
      (f) => f.name === filter.facility,
    );
    return fac?.uid;
  }, [filter.facility, partner]);
  const countyScope = filter.county || undefined;
  const subCountyScope = filter.subCounty || undefined;

  const { data, loading, error, value } = useKhis({
    partner,
    pe,
    county: countyScope,
    subCounty: subCountyScope,
    facility: facilityUid,
    indicators: [
      // Stage totals (the "Total" columns) — plus the five population-group
      // breakdowns per stage: KHIS facilities report the group rows and leave
      // the Total column blank, so the totals below are the sum of the groups.
      "prep_eligible_total",
      "prep_new_total",
      "prep_refill_total",
      "prep_current_total",
      "pmtct_anc1_visits",
      "prep_eligible_gp",
      "prep_eligible_fsw",
      "prep_eligible_msm",
      "prep_eligible_pwid",
      "prep_eligible_dc",
      "prep_refill_gp",
      "prep_refill_fsw",
      "prep_refill_msm",
      "prep_refill_pwid",
      "prep_refill_dc",
      "prep_current_gp",
      "prep_current_fsw",
      "prep_current_msm",
      "prep_current_pwid",
      "prep_current_dc",
      "prep_new_gp",
      "prep_new_fsw",
      "prep_new_msm",
      "prep_new_pwid",
      "prep_new_dc",
      "prep_discontinued_gp",
      "prep_discontinued_fsw",
      "prep_discontinued_msm",
      "prep_discontinued_pwid",
      "prep_discontinued_dc",
    ],
  });

  // Live per-facility breakdown — eligible and initiated by facility (top 8).
  // Eligible = sum of the five population-group elements; the route merges
  // per-facility values across the dx list, so this stays a single request.
  const eligibleByFac = useKhis({
    partner,
    pe,
    county: countyScope,
    subCounty: subCountyScope,
    facility: facilityUid,
    indicators: [
      "prep_eligible_gp",
      "prep_eligible_fsw",
      "prep_eligible_msm",
      "prep_eligible_pwid",
      "prep_eligible_dc",
    ],
    byFacility: true,
    top: 8,
  });
  const initiatedByFac = useKhis({
    partner,
    pe,
    county: countyScope,
    subCounty: subCountyScope,
    facility: facilityUid,
    indicators: [
      "prep_new_gp",
      "prep_new_fsw",
      "prep_new_msm",
      "prep_new_pwid",
      "prep_new_dc",
    ],
    byFacility: true,
    top: 8,
  });

  // Live monthly momentum — the trailing 12 months from KHIS. New initiations
  // are the sum of the five population-group elements per month; Active is the
  // sum of the five Currently-on-PrEP elements per month (a stock, so it can
  // exceed the monthly flow).
  const momentum = useKhis({
    partner,
    pe: "LAST_12_MONTHS",
    county: countyScope,
    subCounty: subCountyScope,
    facility: facilityUid,
    indicators: [
      "prep_new_gp",
      "prep_new_fsw",
      "prep_new_msm",
      "prep_new_pwid",
      "prep_new_dc",
      "prep_current_gp",
      "prep_current_fsw",
      "prep_current_msm",
      "prep_current_pwid",
      "prep_current_dc",
    ],
    byPeriod: true,
  });

  // Live values — merged per stage. KHIS facilities report the five
  // population-group rows per stage (General popn, FSW, MSM, PWID, Discordant
  // Couple) and leave the "Total" column blank, so Eligible / Refill / Current
  // are the sum of those groups (falling back to the Total element if a
  // facility ever does fill it in). `liveCount` tracks how many stages are
  // real.
  const liveVals = useMemo(() => {
    if (!data) return null;
    const sumGroups = (...ids: string[]): number | null => {
      let total = 0;
      let any = false;
      for (const id of ids) {
        const v = value(id);
        if (v != null) {
          total += v;
          any = true;
        }
      }
      return any ? total : null;
    };
    return {
      screened: value("pmtct_anc1_visits"),
      eligible:
        value("prep_eligible_total") ??
        sumGroups(
          "prep_eligible_gp",
          "prep_eligible_fsw",
          "prep_eligible_msm",
          "prep_eligible_pwid",
          "prep_eligible_dc",
        ),
      initiated:
        value("prep_new_total") ??
        sumGroups(
          "prep_new_gp",
          "prep_new_fsw",
          "prep_new_msm",
          "prep_new_pwid",
          "prep_new_dc",
        ),
      refill:
        value("prep_refill_total") ??
        sumGroups(
          "prep_refill_gp",
          "prep_refill_fsw",
          "prep_refill_msm",
          "prep_refill_pwid",
          "prep_refill_dc",
        ),
      current:
        value("prep_current_total") ??
        sumGroups(
          "prep_current_gp",
          "prep_current_fsw",
          "prep_current_msm",
          "prep_current_pwid",
          "prep_current_dc",
        ),
    };
  }, [data, value]);

  const liveCount = useMemo(
    () =>
      liveVals
        ? Object.values(liveVals).filter((x): x is number => x != null).length
        : 0,
    [liveVals],
  );

  // Live Discontinued count — used by the retention donut so no discontinuation
  // number is fabricated as initiated − current when KHIS reports it. Same
  // pattern: Total element when filled, else the sum of the five population-
  // group elements.
  const discontinuedVal = useMemo(() => {
    if (!data) return null;
    const t = value("prep_discontinued_total");
    if (t != null) return t;
    let total = 0;
    let any = false;
    for (const g of ["gp", "fsw", "msm", "pwid", "dc"]) {
      const v = value(`prep_discontinued_${g}`);
      if (v != null) {
        total += v;
        any = true;
      }
    }
    return any ? total : null;
  }, [data, value]);

  const isLive = liveCount > 0;

  // KHIS answered for this period/scope at all (regardless of how many
  // indicators have values) — never show demo numbers when we have a real
  // KHIS response; indicators KHIS didn't report become 0, not estimates.
  const khisAnswered = !!data && !error && !loading;

  // KHIS answered but reported ZERO values for this period/scope — never show
  // demo numbers in that case (e.g. a future month looks like "data").
  const noPeriodData = !isLive && khisAnswered;
  const noDataSub = `no KHIS data for ${peLabel} in this scope`;

  // Merge the two per-facility series into chart rows: [{name, eligible, initiated}].
  const facilityChartData = useMemo(() => {
    if (khisAnswered) {
      const e = eligibleByFac.data?.facilities ?? [];
      const i = initiatedByFac.data?.facilities ?? [];
      if (e.length === 0 && i.length === 0) {
        return [
          { name: filter.county || "No data", eligible: 0, initiated: 0 },
        ];
      }
      const names = new Set<string>();
      for (const f of [...e, ...i]) names.add(f.name);
      return [...names]
        .map((name) => ({
          name,
          eligible: e.find((f) => f.name === name)?.value ?? 0,
          initiated: i.find((f) => f.name === name)?.value ?? 0,
        }))
        .sort((a, b) => b.eligible - a.eligible)
        .slice(0, 8);
    }
    return prepFacilityData;
  }, [eligibleByFac.data, initiatedByFac.data, khisAnswered, filter.county]);

  const hasLiveFacilities = useMemo(
    () =>
      (eligibleByFac.data?.facilities?.length ?? 0) > 0 ||
      (initiatedByFac.data?.facilities?.length ?? 0) > 0,
    [eligibleByFac.data, initiatedByFac.data],
  );

  // Live monthly momentum rows — merges the per-period series of the five
  // Initiated (New) elements and the five Currently-on-PrEP elements into
  // [{ month, initiated, active }]. Returns null when KHIS returned nothing.
  const momentumChartData = useMemo(() => {
    const periods = momentum.data?.periods;
    if (!periods || periods.length === 0) return null;
    const sumByPe = (ids: string[]) => {
      const byPe = new Map<string, number>();
      for (const p of periods) {
        if (!ids.includes(p.id)) continue;
        for (const s of p.series)
          if (s.value != null) byPe.set(s.pe, (byPe.get(s.pe) ?? 0) + s.value);
      }
      return byPe;
    };
    const newByPe = sumByPe([
      "prep_new_gp",
      "prep_new_fsw",
      "prep_new_msm",
      "prep_new_pwid",
      "prep_new_dc",
    ]);
    const curByPe = sumByPe([
      "prep_current_gp",
      "prep_current_fsw",
      "prep_current_msm",
      "prep_current_pwid",
      "prep_current_dc",
    ]);
    if (newByPe.size === 0 && curByPe.size === 0) return null;
    const peNames = new Map<string, string>();
    for (const p of periods)
      for (const s of p.series) peNames.set(s.pe, s.peName);
    return [...new Set([...newByPe.keys(), ...curByPe.keys()])]
      .sort()
      .map((pe) => ({
        month: (peNames.get(pe) ?? pe).split(" ")[0],
        initiated: newByPe.get(pe) ?? 0,
        active: curByPe.get(pe) ?? 0,
      }));
  }, [momentum.data]);

  // KHIS never reports facility-level eligibility for this indicator set —
  // suppress the Eligible series rather than draw 0 bars beside live
  // initiations (which would imply every facility had zero eligible women).
  const eligibleReportedAny = useMemo(
    () => (eligibleByFac.data?.facilities ?? []).some((f) => f.value != null),
    [eligibleByFac.data],
  );

  const p = useMemo(
    () => ({
      screened: liveVals?.screened ?? (khisAnswered ? 0 : DEMO_PREP.screened),
      eligible: liveVals?.eligible ?? (khisAnswered ? 0 : DEMO_PREP.eligible),
      initiated:
        liveVals?.initiated ?? (khisAnswered ? 0 : DEMO_PREP.initiated),
      refill: liveVals?.refill ?? (khisAnswered ? 0 : DEMO_PREP.refill),
      current: liveVals?.current ?? (khisAnswered ? 0 : DEMO_PREP.current),
    }),
    [liveVals, khisAnswered],
  );

  // Percentages are only meaningful when BOTH values are live — mixing a live
  // value with an estimate (e.g. live initiated 62 vs est. current 132) yields
  // absurd ratios, so we return null and the UI shows an estimate note instead.
  const livePct = (n: number, d: number, liveN: boolean, liveD: boolean) =>
    liveN && liveD && d > 0 ? Math.round((n / d) * 100) : null;
  const eligiblePct = livePct(
    p.eligible,
    p.screened,
    liveVals?.eligible != null,
    liveVals?.screened != null,
  );
  const coveragePct = livePct(
    p.initiated,
    p.eligible,
    liveVals?.initiated != null,
    liveVals?.eligible != null,
  );
  const threeMoPct = livePct(
    p.refill,
    p.initiated,
    liveVals?.refill != null,
    liveVals?.initiated != null,
  );
  const sixMoPct = livePct(
    p.current,
    p.initiated,
    liveVals?.current != null,
    liveVals?.initiated != null,
  );

  // A stage is "not reported" (n/r) when KHIS answered for this period/scope
  // AND some other stage is live, but THIS stage has no value. Showing a hard
  // 0 there would fabricate an impossible drop (e.g. 2,305 screened → 0
  // eligible → 521 initiated). When nothing at all is live, zeros are honest
  // (the badge explains), and in demo mode estimates are fine.
  const nrOf = (v: number | null | undefined) =>
    isLive && khisAnswered && v == null;
  // True when the stage's number should be displayed as a real count: demo
  // mode (no KHIS) always, zeros mode (KHIS answered, nothing live) shows
  // honest zeros, partial-live mode only for stages KHIS actually reported.
  const reported = (v: number | null | undefined) =>
    !khisAnswered || v != null || !isLive;

  const cascade = [
    {
      stage: "PBFW seen at 1st ANC (HV02-01)",
      count: p.screened,
      est: liveVals?.screened == null,
      reported: reported(liveVals?.screened),
    },
    {
      stage: "Assessed & eligible for PrEP (all key populations)",
      count: p.eligible,
      est: liveVals?.eligible == null,
      reported: reported(liveVals?.eligible),
    },
    {
      stage: "Initiated on PrEP (New, Total)",
      count: p.initiated,
      est: liveVals?.initiated == null,
      reported: reported(liveVals?.initiated),
    },
    {
      stage: "Continuing on PrEP (Refills)",
      count: p.refill,
      est: liveVals?.refill == null,
      reported: reported(liveVals?.refill),
    },
    {
      stage: "Currently on PrEP (New + Refill + Restart)",
      count: p.current,
      est: liveVals?.current == null,
      reported: reported(liveVals?.current),
    },
  ];

  // Retention is only meaningful when current AND initiated are both live —
  // otherwise "0 currently on PrEP / N discontinued" would be fabricated.
  // Discontinued comes from KHIS when reported (sum of the five population-
  // group elements); only when KHIS does NOT report it do we fall back to the
  // computed initiated − current (and only when that is non-negative).
  const retentionNotReported = nrOf(liveVals?.current);
  const discontinuedComputed = Math.max(p.initiated - p.current, 0);
  const retentionLivePct =
    discontinuedVal != null && p.current + discontinuedVal > 0
      ? Math.round((p.current / (p.current + discontinuedVal)) * 100)
      : null;
  const retentionData = retentionNotReported
    ? [{ name: "Currently on PrEP", value: 0, fill: "#e5e7eb" }]
    : [
        { name: "Currently on PrEP", value: p.current, fill: "#8b5cf6" },
        {
          name:
            discontinuedVal != null
              ? "Discontinued (KHIS)"
              : "Discontinued / lost",
          value:
            discontinuedVal != null ? discontinuedVal : discontinuedComputed,
          fill: "#e5e7eb",
        },
      ];

  const sourceBadge = loading ? (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
      Loading KHIS…
    </span>
  ) : isLive && data ? (
    <span
      className={
        liveCount === 5
          ? "px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold"
          : "px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold"
      }
    >
      Live · national KHIS · {data.scope} · {data.peLabel}
      {liveCount < 5 && (
        <span className="font-medium opacity-80">
          {" "}
          · {liveCount}/5 stages reported this period
        </span>
      )}
    </span>
  ) : error ? (
    <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold">
      KHIS error: {error}
    </span>
  ) : noPeriodData && periodFuture ? (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
      No KHIS data yet for {peLabel} — period is in the future (showing zeros)
    </span>
  ) : noPeriodData ? (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
      No KHIS data for {peLabel} in this scope — showing zeros
    </span>
  ) : (
    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">
      Demo data — no KHIS values for this partner/period
    </span>
  );

  return (
    <div className="space-y-6">
      <SectionBanner
        title="PrEP — Pre-Exposure Prophylaxis for Pregnant & Breastfeeding Women (PBFW)"
        subtitle={
          noPeriodData
            ? `No KHIS numbers were reported for ${peLabel} in this scope — the charts below show zeros. Select a period with reported data to see the live ANC screening → PrEP cascade.`
            : isLive
              ? `Live numbers from national KHIS (MOH 731 PLUS PrEP) for the selected partner's facilities — ANC screening → eligibility → initiation → continuation → retention. KHIS facilities report the five population-group rows per stage (General popn, FSW, MSM, PWID, Discordant Couple) and often leave the Total column blank, so Eligible / Initiated / Refill / Current here are live sums of those groups (falling back to the Total element when it is reported). Eligible is assessed across all key populations — including non-ANC entry points — so it can exceed the ANC1 screening count. A stage shows “n/r” only when none of its groups was reported this period.`
              : "A distinct prevention track: ANC screening → eligibility → initiation → continuation → retention. Kept separate from the PMTCT treatment cascade. (Demo values until KHIS is reachable.)"
        }
      />

      <AIAssistant
        chartContext={activeChart}
        onSaveToPlayground={addChartToPlayground}
      />

      {
        <>
          {/* KPI Cards — the PrEP story at a glance */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Kpi
              title="PBFW seen at 1st ANC"
              value={p.screened.toLocaleString()}
              sub="MOH 731 HV02-01 — PrEP screening population"
              accent="text-violet-600"
            />
            <Kpi
              title="Assessed Eligible"
              value={
                nrOf(liveVals?.eligible) ? "n/r" : p.eligible.toLocaleString()
              }
              sub={
                eligiblePct != null && eligiblePct <= 100
                  ? `${eligiblePct}% of women seen`
                  : liveVals?.eligible != null
                    ? "sum of 5 KHIS population groups (GP/FSW/MSM/PWID/DC) — covers all entry points, not only ANC1 PBFW"
                    : nrOf(liveVals?.eligible)
                      ? "not reported on KHIS this period"
                      : khisAnswered
                        ? "not reported on KHIS this period"
                        : noPeriodData
                          ? noDataSub
                          : "eligibility estimate"
              }
              accent="text-violet-600"
            />
            <Kpi
              title="Initiated on PrEP"
              value={p.initiated.toLocaleString()}
              sub={
                coveragePct != null
                  ? `${coveragePct}% of eligible (target ≥ 90%)`
                  : nrOf(liveVals?.eligible)
                    ? "eligible not reported on KHIS this period — % of eligible unavailable"
                    : khisAnswered
                      ? "not reported on KHIS this period"
                      : noPeriodData
                        ? noDataSub
                        : "initiation estimate (target ≥ 90%)"
              }
              accent={
                coveragePct != null && coveragePct >= 90
                  ? "text-emerald-600"
                  : "text-amber-600"
              }
            />
            <Kpi
              title="Continuing (Refills)"
              value={
                threeMoPct != null && threeMoPct <= 100
                  ? `${threeMoPct}%`
                  : liveVals?.refill != null
                    ? p.refill.toLocaleString()
                    : nrOf(liveVals?.refill)
                      ? "n/r"
                      : khisAnswered
                        ? "0"
                        : "est."
              }
              sub={
                liveVals?.refill != null
                  ? threeMoPct != null && threeMoPct <= 100
                    ? `${p.refill.toLocaleString()} of ${p.initiated.toLocaleString()} initiated`
                    : `${p.refill.toLocaleString()} continuing — includes clients started in earlier months`
                  : nrOf(liveVals?.refill)
                    ? "not reported on KHIS this period"
                    : khisAnswered
                      ? "not reported on KHIS this period"
                      : noPeriodData
                        ? noDataSub
                        : `${p.refill.toLocaleString()} of ${p.initiated.toLocaleString()} initiated`
              }
              accent={
                threeMoPct != null && threeMoPct <= 100 && threeMoPct >= 80
                  ? "text-emerald-600"
                  : liveVals?.refill != null
                    ? "text-amber-600"
                    : "text-amber-600"
              }
            />
            <Kpi
              title="Currently on PrEP"
              value={
                sixMoPct != null && sixMoPct <= 100
                  ? `${sixMoPct}%`
                  : liveVals?.current != null
                    ? p.current.toLocaleString()
                    : nrOf(liveVals?.current)
                      ? "n/r"
                      : khisAnswered
                        ? "0"
                        : "est."
              }
              sub={
                liveVals?.current != null
                  ? sixMoPct != null && sixMoPct <= 100
                    ? `${p.current.toLocaleString()} of ${p.initiated.toLocaleString()} initiated`
                    : `${p.current.toLocaleString()} active — includes clients started in earlier months`
                  : nrOf(liveVals?.current)
                    ? "not reported on KHIS this period"
                    : khisAnswered
                      ? "not reported on KHIS this period"
                      : noPeriodData
                        ? noDataSub
                        : `${p.current.toLocaleString()} of ${p.initiated.toLocaleString()} initiated`
              }
              accent={
                sixMoPct != null && sixMoPct <= 100 && sixMoPct >= 70
                  ? "text-emerald-600"
                  : "text-amber-600"
              }
            />
          </div>

          {/* PrEP Cascade — the prevention story */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">
                The PrEP Cascade — from ANC screening to 6-month retention
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {sourceBadge}
                <ViewDataButton
                  title="The PrEP Cascade"
                  data={cascade.map((c) => ({
                    stage: c.stage,
                    count: c.reported ? c.count : "n/r",
                    est: c.est,
                  }))}
                  note={`${isLive ? `Live · KHIS · ${data?.scope} · ${data?.peLabel}` : noPeriodData ? "no KHIS data — zeros" : "demo"} · n/r = not reported on KHIS this period`}
                  detail={{
                    formula:
                      "cascade % = stage count ÷ PBFW seen at 1st ANC × 100 · retention = continuing ÷ initiated · KHIS facilities report the five population-group rows (General popn, FSW, MSM, PWID, Discordant Couple) and often leave the Total column blank — the totals here are the sum of those groups (Total element used when it is reported)",
                    inputs: [
                      {
                        label: "PBFW seen at 1st ANC",
                        value: liveVals?.screened ?? null,
                        source:
                          liveVals?.screened != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      },
                      {
                        label: "Assessed & eligible for PrEP — sum of 5 groups",
                        value: liveVals?.eligible ?? null,
                        source:
                          liveVals?.eligible != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      },
                      ...["gp", "fsw", "msm", "pwid", "dc"].map((g) => ({
                        label: `  · Eligible PrEP — ${g.toUpperCase()}`,
                        value: value(`prep_eligible_${g}`) ?? null,
                        source:
                          value(`prep_eligible_${g}`) != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      })),
                      {
                        label:
                          "Initiated on PrEP (New, Total) — fallback: sum of 5 groups",
                        value: liveVals?.initiated ?? null,
                        source:
                          liveVals?.initiated != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      },
                      ...["gp", "fsw", "msm", "pwid", "dc"].map((g) => ({
                        label: `  · Initiated (New) PrEP — ${g.toUpperCase()}`,
                        value: value(`prep_new_${g}`) ?? null,
                        source:
                          value(`prep_new_${g}`) != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      })),
                      {
                        label: "Continuing on PrEP (Refills) — sum of 5 groups",
                        value: liveVals?.refill ?? null,
                        source:
                          liveVals?.refill != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      },
                      ...["gp", "fsw", "msm", "pwid", "dc"].map((g) => ({
                        label: `  · Continuing (Refills) — ${g.toUpperCase()}`,
                        value: value(`prep_refill_${g}`) ?? null,
                        source:
                          value(`prep_refill_${g}`) != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      })),
                      {
                        label:
                          "Currently on PrEP (New+Refill+Restart) — sum of 5 groups",
                        value: liveVals?.current ?? null,
                        source:
                          liveVals?.current != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      },
                      ...["gp", "fsw", "msm", "pwid", "dc"].map((g) => ({
                        label: `  · Currently on PrEP — ${g.toUpperCase()}`,
                        value: value(`prep_current_${g}`) ?? null,
                        source:
                          value(`prep_current_${g}`) != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      })),
                    ],
                    notes: [
                      `Scope: ${data?.scope ?? "—"} · ${data?.peLabel ?? peLabel}.`,
                      "KHIS does not reliably fill the Eligible / Initiated / Refill / Current “Total” columns — facilities report the five population-group rows instead. The totals here are the live sums of those groups, so the cascade stages are real KHIS numbers, not estimates.",
                      "Eligible is assessed across all five key populations — including non-ANC entry points — so it can exceed the PBFW seen at 1st ANC (that is expected, not an error).",
                      "A stage is shown as n/r only when none of its five groups has a value on KHIS for this period/scope.",
                      "Drop arrows appear only between two reported stages — no impossible gaps are implied between live stages.",
                    ],
                  }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Every HIV-negative PBFW screened at ANC is a prevention
              opportunity: eligibility is confirmed, PrEP is started, and
              adherence is sustained so that seroconversion is avoided through
              the highest-risk window.{" "}
              <span className="text-gray-600">
                Eligibility is also assessed for clients seen through other
                services — the five KHIS key-population groups (GP, FSW, MSM,
                PWID, Discordant Couple) — so the eligible count covers all
                entry points and can exceed the ANC1 screening total.
              </span>
            </p>
            {isLive && khisAnswered && liveCount < 5 && (
              <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
                KHIS reports {liveCount}/5 of these stages for {peLabel} in this
                scope. Stages shown as “n/r” had none of their five population
                groups reported this period — drop arrows are only shown between
                two reported stages, so no impossible gaps are implied.
              </p>
            )}
            <div className="space-y-3">
              {cascade.map((item, idx) => {
                const estTag = item.est && !khisAnswered ? " (est.)" : "";
                const prev = cascade[idx - 1];
                const prevReported = idx === 0 || prev.reported;
                const diff =
                  idx > 0 && prevReported && item.reported
                    ? prev.count - item.count
                    : null;
                const dropNote =
                  diff != null
                    ? diff >= 0
                      ? `↓ ${diff.toLocaleString()} drop${estTag}`
                      : `↑ ${Math.abs(diff).toLocaleString()} more${estTag}`
                    : undefined;
                // Eligible is assessed across ALL key populations (not only the
                // PBFW seen at 1st ANC), so it can legitimately exceed the
                // screening count — explain that right where it would look
                // impossible instead of showing a confusing "↑ N more".
                const eligibleExplainer =
                  idx === 1 && item.reported && prevReported
                    ? `eligible is assessed across all 5 key populations (GP/FSW/MSM/PWID/DC) — including non-ANC entry points — so it can exceed the ${prev.count.toLocaleString()} PBFW seen at 1st ANC`
                    : undefined;
                return (
                  <CascadeBar
                    key={idx}
                    stage={item.stage}
                    count={item.count}
                    max={cascade[0].count}
                    reported={item.reported}
                    note={
                      eligibleExplainer
                        ? eligibleExplainer
                        : idx === 0
                          ? item.est && !khisAnswered
                            ? "(est.)"
                            : undefined
                          : dropNote
                            ? dropNote
                            : item.reported
                              ? "prev stage not reported on KHIS this period"
                              : "not reported on KHIS this period"
                    }
                  />
                );
              })}
            </div>
          </div>

          {/* Facility coverage + retention */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 border border-slate-200 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    PrEP Eligible vs Initiated by Facility
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveChart({
                        id: "prep-facility-coverage",
                        title: "PrEP Eligible vs Initiated by Facility",
                        summary:
                          "This chart compares women assessed eligible and those actually started on PrEP across supported facilities.",
                        prompt:
                          "Explain the biggest gaps between eligible women and those initiated on PrEP and suggest where to focus follow-up.",
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Assist
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addChartToPlayground({
                        id: "prep-facility-coverage",
                        title: "PrEP Eligible vs Initiated by Facility",
                        summary:
                          "This chart compares women assessed eligible and those actually started on PrEP across supported facilities.",
                        prompt:
                          "Explain the biggest gaps between eligible women and those initiated on PrEP and suggest where to focus follow-up.",
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </button>
                  <ViewDataButton
                    title="PrEP Eligible vs Initiated by Facility"
                    data={facilityChartData}
                    note={`${hasLiveFacilities ? `Live per-facility · KHIS · ${partner}` : khisAnswered ? "no KHIS data — zeros" : "illustrative"} · ${khisAnswered && !eligibleReportedAny ? "eligibility not reported at facility level this period — initiated shown only" : "eligible & initiated (each the sum of the 5 population groups) per facility"}`}
                    detail={{
                      formula:
                        "eligible and initiated per facility = each the sum of the five KHIS population-group elements (General popn, FSW, MSM, PWID, Discordant Couple) · initiation coverage % = initiated ÷ eligible × 100 (per facility)",
                      inputs: [
                        ...(eligibleByFac.data?.facilities ?? []).map((f) => ({
                          label: `${f.name} · eligible`,
                          value: f.value,
                          source: "live" as const,
                        })),
                        ...(initiatedByFac.data?.facilities ?? []).map((f) => ({
                          label: `${f.name} · initiated`,
                          value: f.value,
                          source: "live" as const,
                        })),
                      ],
                      notes: [
                        `Per-facility values from KHIS · ${partner} · ${data?.peLabel ?? peLabel}.`,
                        "Eligible and initiated per facility = each the sum of the five population-group elements (General popn, FSW, MSM, PWID, Discordant Couple) KHIS reports for that facility.",
                        "Facilities with no KHIS value this period are omitted from both the chart and this list.",
                      ],
                    }}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                HIV-negative clients assessed eligible and those started on
                PrEP, per supported facility.
                {hasLiveFacilities
                  ? khisAnswered && !eligibleReportedAny
                    ? " Live per-facility initiations from national KHIS; eligibility was not reported at facility level this period, so the Eligible series is hidden."
                    : ` Live per-facility values from national KHIS (eligible & initiated = each the sum of the five population-group elements) · ${partner}.`
                  : khisAnswered
                    ? " No KHIS per-facility values for this period/scope — zeros shown."
                    : " (illustrative until facility-level analytics is enabled)"}
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={facilityChartData}
                  margin={{ left: 0, right: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {khisAnswered && !eligibleReportedAny ? (
                    <Bar
                      dataKey="initiated"
                      name="Initiated"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                    />
                  ) : (
                    <>
                      <Bar
                        dataKey="eligible"
                        name="Eligible"
                        fill="#c4b5fd"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="initiated"
                        name="Initiated"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg p-6 border border-slate-200 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  PrEP Retention at 6 Months
                </h3>
                <ViewDataButton
                  title="PrEP Retention at 6 Months"
                  data={retentionData.map((r) => ({
                    name: r.name,
                    value: retentionNotReported ? "n/r" : r.value,
                  }))}
                  note={`${retentionNotReported ? "currently on PrEP not reported on KHIS this period" : retentionLivePct != null && retentionLivePct <= 100 ? `live retention ${retentionLivePct}%` : liveVals?.current != null ? `live · ${p.current.toLocaleString()} active vs ${discontinuedVal != null ? discontinuedVal.toLocaleString() : p.initiated.toLocaleString()} ${discontinuedVal != null ? "discontinued" : "initiated"}` : khisAnswered ? "no KHIS data — zeros" : "est."} · current vs ${discontinuedVal != null ? "discontinued (KHIS)" : "initiated"}`}
                  detail={{
                    formula:
                      "retention % = currently on PrEP ÷ (currently on PrEP + discontinued) × 100 · discontinued = the five Discontinued PrEP group elements when KHIS reports them, else computed as initiated − currently on PrEP",
                    inputs: [
                      {
                        label: "Initiated on PrEP (New, Total)",
                        value: liveVals?.initiated ?? null,
                        source:
                          liveVals?.initiated != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      },
                      {
                        label: "Currently on PrEP (New+Refill+Restart)",
                        value: liveVals?.current ?? null,
                        source:
                          liveVals?.current != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      },
                      {
                        label:
                          discontinuedVal != null
                            ? "Discontinued PrEP (sum of 5 groups)"
                            : "Discontinued PrEP (computed: initiated − current)",
                        value: discontinuedVal ?? discontinuedComputed,
                        source:
                          discontinuedVal != null
                            ? ("live" as const)
                            : liveVals?.current != null &&
                                liveVals?.initiated != null
                              ? ("est" as const)
                              : ("n/r" as const),
                      },
                      ...["gp", "fsw", "msm", "pwid", "dc"].map((g) => ({
                        label: `  · Discontinued PrEP — ${g.toUpperCase()}`,
                        value: value(`prep_discontinued_${g}`) ?? null,
                        source:
                          value(`prep_discontinued_${g}`) != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      })),
                      {
                        label: "Retention %",
                        value:
                          retentionLivePct != null && retentionLivePct <= 100
                            ? `${retentionLivePct}%`
                            : retentionLivePct != null
                              ? ">100% — active includes clients started in earlier months"
                              : liveVals?.current != null &&
                                  liveVals?.initiated != null
                                ? "n/r — discontinued not reported on KHIS this period"
                                : retentionNotReported
                                  ? "n/r"
                                  : null,
                        source:
                          retentionLivePct != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      },
                    ],
                    notes: [
                      "Currently on PrEP = the sum of the five KHIS population-group elements (General popn, FSW, MSM, PWID, Discordant Couple); Initiated = the New-Total element (or the sum of the five New group elements when blank).",
                      "Discontinued = the sum of the five Discontinued PrEP group elements when KHIS reports them; otherwise computed as initiated − current (shown only when non-negative). Retention % = currently on PrEP ÷ (currently on PrEP + discontinued).",
                      "When “Currently on PrEP” is missing the donut shows n/r — no discontinuation count is invented.",
                    ],
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Of all clients initiated on PrEP, the share still actively on
                PrEP — the measure that matters for seroconversion prevention.
                {retentionNotReported
                  ? " “Currently on PrEP” is not reported on KHIS this period, so the retention % cannot be computed — no fabricated discontinuation count is shown."
                  : discontinuedVal != null
                    ? " Discontinued is reported live by KHIS (sum of the five population-group elements), so retention is measured against real discontinuations rather than a computed difference."
                    : ""}
              </p>
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <ResponsiveContainer width={230} height={230}>
                    <PieChart>
                      <Pie
                        data={retentionData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={2}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {retentionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-3xl font-bold text-violet-700">
                      {retentionNotReported
                        ? "n/r"
                        : retentionLivePct != null && retentionLivePct <= 100
                          ? `${retentionLivePct}%`
                          : liveVals?.current != null
                            ? p.current.toLocaleString()
                            : khisAnswered
                              ? "0%"
                              : p.current.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {retentionNotReported
                        ? "not reported"
                        : retentionLivePct != null && retentionLivePct <= 100
                          ? "Retained"
                          : liveVals?.current != null
                            ? "active on PrEP"
                            : khisAnswered
                              ? "on PrEP (no KHIS)"
                              : "on PrEP (est.)"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-6">
                  {retentionData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-sm text-gray-700">
                        {item.name}: {retentionNotReported ? "n/r" : item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Monthly trend: new initiations vs active on PrEP */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">
                PrEP Momentum — New Initiations vs Active on PrEP
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveChart({
                      id: "prep-momentum",
                      title:
                        "PrEP Momentum — New Initiations vs Active on PrEP",
                      summary:
                        "This chart tracks monthly new initiations against the number of women still active on PrEP over time.",
                      prompt:
                        "Summarize the momentum in new initiations and tell me whether the retention gap is widening or improving.",
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Assist
                </button>
                <button
                  type="button"
                  onClick={() =>
                    addChartToPlayground({
                      id: "prep-momentum",
                      title:
                        "PrEP Momentum — New Initiations vs Active on PrEP",
                      summary:
                        "This chart tracks monthly new initiations against the number of women still active on PrEP over time.",
                      prompt:
                        "Summarize the momentum in new initiations and tell me whether the retention gap is widening or improving.",
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save
                </button>
                <ViewDataButton
                  title="PrEP Momentum"
                  data={
                    momentumChartData ??
                    (khisAnswered ? [] : prepInitiationData)
                  }
                  note={
                    momentumChartData
                      ? `Live monthly · KHIS · ${data?.scope} · trailing 12 months`
                      : khisAnswered
                        ? "monthly trend not reported on KHIS"
                        : "Illustrative — monthly trend not on KHIS"
                  }
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Monthly new starts (violet) versus the number actively on PrEP
              (dashed) — the gap shows discontinuations in near real time.{" "}
              {momentumChartData
                ? `(Live monthly series from national KHIS · ${data?.scope} · trailing 12 months — new initiations are the sum of the five population-group elements per month; active is the sum of the five Currently-on-PrEP elements, a stock that can exceed the monthly flow.)`
                : khisAnswered
                  ? "(Monthly trend series not reported on KHIS — chart hidden; single-period values are in the KPIs above.)"
                  : "(Illustrative trend until monthly analytics is enabled.)"}
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={
                  momentumChartData ?? (khisAnswered ? [] : prepInitiationData)
                }
              >
                {" "}
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="initiated"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="New Initiations"
                />
                <Line
                  type="monotone"
                  dataKey="active"
                  stroke="#6d28d9"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  name="Active on PrEP"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      }

      {/* Why it matters */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-5 border border-violet-200 text-violet-900">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/70 border border-violet-200 flex items-center justify-center flex-shrink-0">
            <HeartPulse className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold">
              Why the prevention cascade matters
            </h3>
            <p className="text-sm mt-1 opacity-80">
              <ShieldCheck className="inline w-3.5 h-3.5" /> PrEP protects
              HIV-negative pregnant and breastfeeding women during the period of
              highest transmission risk. Screening happens at the first ANC
              visit (the same visit as HIV testing); women who are eligible
              start immediately, and continuation is monitored at 3 and 6 months
              so that <Users className="inline w-3.5 h-3.5" /> every mother–baby
              pair stays protected across the continuum.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
