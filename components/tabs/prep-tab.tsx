"use client";

import { useMemo } from "react";
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
import { ShieldCheck, Users, HeartPulse } from "lucide-react";
import { useGeoFilter } from "@/lib/geo-filter-context";
import { useKhis } from "@/lib/use-khis";

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
}: {
  stage: string;
  count: number;
  max: number;
  note?: string;
}) {
  const pct = (count / max) * 100;
  return (
    <div>
      <div className="flex justify-between items-baseline gap-2 mb-1">
        <p className="text-sm font-medium text-gray-700">{stage}</p>
        <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
          {count.toLocaleString()}
          {note && (
            <span className="text-xs font-medium text-gray-400 ml-2">
              {note}
            </span>
          )}
        </p>
      </div>
      <div className="w-full bg-slate-100 rounded-md h-8 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-r-md flex items-center justify-end pr-2 text-white text-xs font-bold transition-all"
          // Cap at 100% — an estimate can exceed the live first-stage count.
          style={{ width: `${Math.min(pct, 100)}%` }}
        >
          {pct >= 18 && pct <= 100 && `${Math.round(pct)}% of screened`}
        </div>
      </div>
    </div>
  );
}

export function PrepTab() {
  const { filter } = useGeoFilter();
  const partner = filter.partner || "jamii-tekelezi";

  const { data, loading, error, value } = useKhis({
    partner,
    pe: "202505",
    indicators: [
      "prep_eligible_total",
      "prep_new_total",
      "prep_refill_total",
      "prep_current_total",
      "pmtct_anc1_visits",
    ],
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
  const p = useMemo(
    () => ({
      screened: liveVals?.screened ?? DEMO_PREP.screened,
      eligible: liveVals?.eligible ?? DEMO_PREP.eligible,
      initiated: liveVals?.initiated ?? DEMO_PREP.initiated,
      refill: liveVals?.refill ?? DEMO_PREP.refill,
      current: liveVals?.current ?? DEMO_PREP.current,
    }),
    [liveVals],
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

  const cascade = [
    {
      stage: "PBFW seen at 1st ANC (HV02-01)",
      count: p.screened,
      est: liveVals?.screened == null,
    },
    {
      stage: "Eligible for PrEP (Total)",
      count: p.eligible,
      est: liveVals?.eligible == null,
    },
    {
      stage: "Initiated on PrEP (New, Total)",
      count: p.initiated,
      est: liveVals?.initiated == null,
    },
    {
      stage: "Continuing on PrEP (Refills)",
      count: p.refill,
      est: liveVals?.refill == null,
    },
    {
      stage: "Currently on PrEP (New + Refill + Restart)",
      count: p.current,
      est: liveVals?.current == null,
    },
  ];

  const retentionData = [
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
      Live · national KHIS · {data.scope} · May 2025
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
          isLive
            ? `Live numbers from national KHIS (MOH 731 HTS) for the selected partner's facilities — ANC screening → eligibility → initiation → continuation → retention. Stages not reported at facility level this period show estimates marked (est.).`
            : "A distinct prevention track: ANC screening → eligibility → initiation → continuation → retention. Kept separate from the PMTCT treatment cascade. (Demo values until KHIS is reachable.)"
        }
      />

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
          value={p.eligible.toLocaleString()}
          sub={
            eligiblePct != null
              ? `${eligiblePct}% of women seen`
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
          value={threeMoPct != null ? `${threeMoPct}%` : "est."}
          sub={`${p.refill.toLocaleString()} of ${p.initiated.toLocaleString()} initiated`}
          accent={
            threeMoPct != null && threeMoPct >= 80
              ? "text-emerald-600"
              : "text-amber-600"
          }
        />
        <Kpi
          title="Currently on PrEP"
          value={sixMoPct != null ? `${sixMoPct}%` : "est."}
          sub={`${p.current.toLocaleString()} of ${p.initiated.toLocaleString()} initiated`}
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
          {sourceBadge}
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Every HIV-negative PBFW screened at ANC is a prevention opportunity:
          eligibility is confirmed, PrEP is started, and adherence is sustained
          so that seroconversion is avoided through the highest-risk window.
        </p>
        <div className="space-y-3">
          {cascade.map((item, idx) => (
            <CascadeBar
              key={idx}
              stage={item.stage}
              count={item.count}
              max={cascade[0].count}
              note={
                idx > 0
                  ? `↓ ${(cascade[idx - 1].count - item.count).toLocaleString()} drop${item.est ? " (est.)" : ""}`
                  : item.est
                    ? "(est.)"
                    : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Facility coverage + retention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-slate-200 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            PrEP Eligible vs Initiated by Facility
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            HIV-negative PBFW assessed eligible and those started on PrEP, per
            supported facility.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={prepFacilityData} margin={{ left: 0, right: 12 }}>
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
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 border border-slate-200 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            PrEP Retention at 6 Months
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Of all PBFW initiated, the share still actively on PrEP at six
            months — the measure that matters for seroconversion prevention.
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
                  {sixMoPct != null
                    ? `${sixMoPct}%`
                    : p.current.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {sixMoPct != null ? "Retained" : "on PrEP (est.)"}
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
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly trend: new initiations vs active on PrEP */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          PrEP Momentum — New Initiations vs Active on PrEP
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Monthly new starts (violet) versus the cumulative number actively on
          PrEP (dashed) — the gap shows discontinuations in near real time.
          (Illustrative trend until monthly analytics is enabled.)
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={prepInitiationData}>
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
