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
      "prep_eligible_total",
      "prep_new_total",
      "prep_refill_total",
      "prep_current_total",
      "pmtct_anc1_visits",
    ],
  });

  // Live per-facility breakdown — eligible and initiated by facility (top 8).
  // Two calls because byFacility requires a single dx per request.
  const eligibleByFac = useKhis({
    partner,
    pe,
    county: countyScope,
    subCounty: subCountyScope,
    facility: facilityUid,
    indicators: ["prep_eligible_total"],
    byFacility: true,
    top: 8,
  });
  const initiatedByFac = useKhis({
    partner,
    pe,
    county: countyScope,
    subCounty: subCountyScope,
    facility: facilityUid,
    indicators: ["prep_new_total"],
    byFacility: true,
    top: 8,
  });

  // Live values — merged per stage. KHIS doesn't report every stage at
  // facility level for this period (e.g. eligible/refills/current come from
  // the 132 report), so each stage falls back to the demo estimate when the
  // live value is missing. `liveCount` tracks how many stages are real.
  const liveVals = useMemo(() => {
    if (!data) return null;
    return {
      screened: value("pmtct_anc1_visits"),
      eligible: value("prep_eligible_total"),
      initiated: value("prep_new_total"),
      refill: value("prep_refill_total"),
      current: value("prep_current_total"),
    };
  }, [data, value]);

  const liveCount = useMemo(
    () =>
      liveVals
        ? Object.values(liveVals).filter((x): x is number => x != null).length
        : 0,
    [liveVals],
  );

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
      stage: "Eligible for PrEP (Total)",
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
  const retentionNotReported = nrOf(liveVals?.current);
  const retentionData = retentionNotReported
    ? [{ name: "Currently on PrEP", value: 0, fill: "#e5e7eb" }]
    : [
        { name: "Currently on PrEP", value: p.current, fill: "#8b5cf6" },
        {
          name: "Discontinued / lost",
          value: Math.max(p.initiated - p.current, 0),
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
              ? `Live numbers from national KHIS (MOH 731 HTS) for the selected partner's facilities — ANC screening → eligibility → initiation → continuation → retention. Stages KHIS did not report this period show “n/r” (not reported), never estimates — so no impossible gaps appear between live stages.`
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
                eligiblePct != null
                  ? `${eligiblePct}% of women seen`
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
                threeMoPct != null
                  ? `${threeMoPct}%`
                  : nrOf(liveVals?.refill)
                    ? "n/r"
                    : khisAnswered
                      ? "0"
                      : "est."
              }
              sub={
                khisAnswered
                  ? threeMoPct != null
                    ? `${p.refill.toLocaleString()} of ${p.initiated.toLocaleString()} initiated`
                    : "not reported on KHIS this period"
                  : noPeriodData
                    ? noDataSub
                    : `${p.refill.toLocaleString()} of ${p.initiated.toLocaleString()} initiated`
              }
              accent={
                threeMoPct != null && threeMoPct >= 80
                  ? "text-emerald-600"
                  : "text-amber-600"
              }
            />
            <Kpi
              title="Currently on PrEP"
              value={
                sixMoPct != null
                  ? `${sixMoPct}%`
                  : nrOf(liveVals?.current)
                    ? "n/r"
                    : khisAnswered
                      ? "0"
                      : "est."
              }
              sub={
                khisAnswered
                  ? sixMoPct != null
                    ? `${p.current.toLocaleString()} of ${p.initiated.toLocaleString()} initiated`
                    : "not reported on KHIS this period"
                  : noPeriodData
                    ? noDataSub
                    : `${p.current.toLocaleString()} of ${p.initiated.toLocaleString()} initiated`
              }
              accent={
                sixMoPct != null && sixMoPct >= 70
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
                      "cascade % = stage count ÷ PBFW seen at 1st ANC × 100 · retention = continuing ÷ initiated",
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
                        label: "Eligible for PrEP (Total)",
                        value: liveVals?.eligible ?? null,
                        source:
                          liveVals?.eligible != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      },
                      {
                        label: "Initiated on PrEP (New, Total)",
                        value: liveVals?.initiated ?? null,
                        source:
                          liveVals?.initiated != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      },
                      {
                        label: "Continuing on PrEP (Refills)",
                        value: liveVals?.refill ?? null,
                        source:
                          liveVals?.refill != null
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
                    ],
                    notes: [
                      `Scope: ${data?.scope ?? "—"} · ${data?.peLabel ?? peLabel}.`,
                      "KHIS reports Initiated (and Screened where ANC is reported); Eligible / Refill / Current are not reported monthly — shown as n/r, never a fabricated 0.",
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
              the highest-risk window.
            </p>
            {isLive && khisAnswered && liveCount < 5 && (
              <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
                KHIS reports {liveCount}/5 of these stages for {peLabel} in this
                scope. Stages shown as “n/r” were not reported this period —
                drop arrows are only shown between two reported stages, so no
                impossible gaps are implied.
              </p>
            )}
            <div className="space-y-3">
              {cascade.map((item, idx) => {
                const estTag = item.est && !khisAnswered ? " (est.)" : "";
                const prev = cascade[idx - 1];
                const prevReported = idx === 0 || prev.reported;
                const dropNote =
                  idx > 0 && prevReported && item.reported
                    ? `↓ ${(prev.count - item.count).toLocaleString()} drop${estTag}`
                    : undefined;
                return (
                  <CascadeBar
                    key={idx}
                    stage={item.stage}
                    count={item.count}
                    max={cascade[0].count}
                    reported={item.reported}
                    note={
                      idx === 0
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
                    note={`${hasLiveFacilities ? `Live per-facility · KHIS · ${partner}` : khisAnswered ? "no KHIS data — zeros" : "illustrative"} · ${khisAnswered && !eligibleReportedAny ? "eligibility not reported at facility level this period — initiated shown only" : "eligible vs initiated per facility"}`}
                    detail={{
                      formula:
                        "eligible = PBFW assessed eligible for PrEP at the facility · initiated = PBFW started PrEP · initiation coverage % = initiated ÷ eligible × 100 (per facility)",
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
                        "Eligibility is not reported at facility level on KHIS for some scopes — the Eligible series is then hidden rather than shown as zero.",
                        "Facilities with no KHIS value this period are omitted from both the chart and this list.",
                      ],
                    }}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                HIV-negative PBFW assessed eligible and those started on PrEP,
                per supported facility.
                {hasLiveFacilities
                  ? khisAnswered && !eligibleReportedAny
                    ? " Live per-facility initiations from national KHIS; eligibility is not reported at facility level on KHIS this period, so the Eligible series is hidden."
                    : ` Live per-facility values from national KHIS · ${partner}.`
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
                  note={`${retentionNotReported ? "currently on PrEP not reported on KHIS this period" : sixMoPct != null ? `live ratio ${sixMoPct}%` : khisAnswered ? "no KHIS data — zeros" : "est."} · current vs initiated`}
                  detail={{
                    formula:
                      "retention % = currently on PrEP ÷ initiated on PrEP × 100 · discontinued = initiated − currently on PrEP",
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
                        label: "Retention % (computed)",
                        value:
                          sixMoPct != null
                            ? `${sixMoPct}%`
                            : retentionNotReported
                              ? "n/r"
                              : null,
                        source:
                          sixMoPct != null
                            ? ("live" as const)
                            : ("n/r" as const),
                      },
                    ],
                    notes: [
                      "Both values must be reported for the retention % to be computed — otherwise the donut shows n/r instead of a fabricated number.",
                      "No discontinuation count is invented when “Currently on PrEP” is missing.",
                    ],
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Of all PBFW initiated, the share still actively on PrEP at six
                months — the measure that matters for seroconversion prevention.
                {retentionNotReported
                  ? " “Currently on PrEP” is not reported on KHIS this period, so the retention % cannot be computed — no fabricated discontinuation count is shown."
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
                        : sixMoPct != null
                          ? `${sixMoPct}%`
                          : khisAnswered
                            ? "0%"
                            : p.current.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {retentionNotReported
                        ? "not reported"
                        : sixMoPct != null
                          ? "Retained"
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
                  data={khisAnswered ? [] : prepInitiationData}
                  note={
                    khisAnswered
                      ? "monthly trend not reported on KHIS"
                      : "Illustrative — monthly trend not on KHIS"
                  }
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Monthly new starts (violet) versus the cumulative number actively
              on PrEP (dashed) — the gap shows discontinuations in near real
              time.{" "}
              {khisAnswered
                ? "(Monthly trend series not reported on KHIS — chart hidden; single-period values are in the KPIs above.)"
                : "(Illustrative trend until monthly analytics is enabled.)"}
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={khisAnswered ? [] : prepInitiationData}>
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
