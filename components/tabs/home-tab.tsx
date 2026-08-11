"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  Database,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { RadialProgress } from "@/components/radial-progress";
import { useAssessments } from "@/lib/use-assessments";
import { useGeoFilter } from "@/lib/geo-filter-context";
import { applyGeoFilter } from "@/lib/geo";
import { averageReadiness } from "@/lib/assessment";
import { AssessmentTab } from "@/components/tabs/assessment-tab";
import { MortalityTab } from "@/components/tabs/mortality-tab";

// ---------------------------------------------------------------------------
// Yellow-marked (home page) indicators per the EWENE Dashboard Indicators doc
// ---------------------------------------------------------------------------

interface IndicatorDef {
  code: string;
  label: string;
  baseline?: string;
  y1: number;
  y2: number;
  lowerIsBetter?: boolean;
  note?: string;
  unit?: "percent" | "count" | "per-1000" | "per-100000";
}

const COVERAGE_INDICATORS: IndicatorDef[] = [
  {
    code: "2.1",
    label: "% of pregnant women attending 4+ ANC visits",
    baseline: "52% (national)",
    y1: 70,
    y2: 90,
    note: "Source: KHIS (monthly)",
  },
  {
    code: "2.2",
    label: "% of deliveries conducted by skilled birth attendants",
    baseline: "70% (national)",
    y1: 90,
    y2: 95,
    note: "Source: KHIS (monthly)",
  },
  {
    code: "2.3",
    label: "% of mothers receiving postnatal care within 48 hours",
    baseline: "66.55% (KHIS)",
    y1: 70,
    y2: 80,
    note: "Source: KHIS (monthly)",
  },
  {
    code: "2.4",
    label: "% of newborns receiving postnatal care within 48 hours",
    baseline: "68.40% (KHIS)",
    y1: 70,
    y2: 80,
    note: "Source: KHIS (monthly)",
  },
  {
    code: "2.5",
    label: "% of preterm/LBW babies initiated on Kangaroo Mother Care",
    baseline: "54% (national)",
    y1: 60,
    y2: 70,
    note: "Source: KHIS (monthly)",
  },
  {
    code: "2.6",
    label: "% of newborns receiving chlorhexidine cord care at birth",
    baseline: "65% (national)",
    y1: 70,
    y2: 80,
    note: "Source: KHIS (monthly)",
  },
  {
    code: "2.7",
    label: "Facility fresh stillbirth rate at supported facilities",
    baseline: "Target ≤ 15 per 1,000 births",
    y1: 20,
    y2: 15,
    lowerIsBetter: true,
    unit: "per-1000",
    note: "Source: KHIS (monthly) · added per dashboard review",
  },
  {
    code: "2.8",
    label:
      "Facility maternal mortality ratio at supported facilities (per 100,000 live births)",
    baseline: "Target ≤ 200 per 100,000 live births",
    y1: 250,
    y2: 200,
    lowerIsBetter: true,
    unit: "per-100000",
    note: "Source: KHIS (monthly) · added per dashboard review",
  },
];

const MPDSR_INDICATORS: IndicatorDef[] = [
  {
    code: "4.1",
    label: "Number of facilities reporting Maternal deaths",
    baseline: "6 of 6 supported facilities",
    y1: 6,
    y2: 6,
    unit: "count",
    note: "Source: KHIS / MPDSR records (monthly)",
  },
  {
    code: "4.2",
    label: "Number of facilities reporting Neonatal deaths",
    baseline: "6 of 6 supported facilities",
    y1: 6,
    y2: 6,
    unit: "count",
    note: "Source: KHIS / MPDSR records (monthly)",
  },
  {
    code: "4.3",
    label: "Number of Maternal Deaths reported",
    baseline: "YTD",
    y1: 42,
    y2: 42,
    unit: "count",
    note: "Source: KHIS / MPDSR records (monthly)",
  },
  {
    code: "4.4",
    label: "Number of Neonatal Deaths reported",
    baseline: "YTD",
    y1: 58,
    y2: 58,
    unit: "count",
    note: "Source: KHIS / MPDSR records (monthly)",
  },
  {
    code: "4.5",
    label: "% of supported facilities holding monthly MPDSR/QI review meetings",
    baseline: "4 of 6 facilities (67%)",
    y1: 100,
    y2: 100,
    note: "Replaces Monthly MPDSR/QI Meeting · Source: County records (monthly)",
  },
  {
    code: "4.6",
    label: "% of providers correctly diagnosing & treating PPH",
    baseline: "40% (national)",
    y1: 55,
    y2: 70,
    note: "Source: HFA-QOC / skills assessment (semi-annual)",
  },
  {
    code: "4.7",
    label: "% of providers correctly diagnosing & treating birth asphyxia",
    baseline: "36% (national)",
    y1: 50,
    y2: 65,
    note: "Source: HFA-QOC / skills assessment (semi-annual)",
  },
];

const DATA_SYSTEM_INDICATORS: IndicatorDef[] = [
  {
    code: "5.1",
    label:
      "% of facilities submitting complete & timely KHIS/DHIS2 monthly reports",
    baseline: "Facility-specific",
    y1: 90,
    y2: 100,
    note: "Source: KHIS (monthly)",
  },
  {
    code: "5.2",
    label:
      "% of supported facilities with active EMR capturing mother–baby pair data",
    baseline: "Facility-specific",
    y1: 70,
    y2: 90,
    note: "Source: EMR system audit (quarterly)",
  },
  {
    code: "5.3",
    label:
      "% of facilities reporting community maternal/neonatal deaths via eCHIS",
    baseline: "Not yet functional (national)",
    y1: 50,
    y2: 80,
    note: "Source: eCHIS / KHIS (quarterly)",
  },
  {
    code: "5.4",
    label:
      "% of supported facilities with data uploaded to the EWENE real-time dashboard",
    baseline: "Not yet functional (national)",
    y1: 100,
    y2: 100,
    note: "Source: EWENE dashboard (monthly)",
  },
  {
    code: "5.5",
    label:
      "% of supported facilities conducting monthly data quality audits (DQA)",
    baseline: "Facility-specific",
    y1: 75,
    y2: 100,
    note: "Source: DQA records (monthly)",
  },
];

// Current reported values for KHIS/EMR-sourced indicators (national baselines).
const REPORTED_CURRENT: Record<string, number> = {
  "2.1": 52,
  "2.2": 70,
  "2.3": 66.6,
  "2.4": 68.4,
  "2.5": 54,
  "2.6": 65,
  "2.7": 22,
  "2.8": 310,
  "4.1": 6,
  "4.2": 6,
  "4.3": 42,
  "4.4": 58,
  "4.5": 67,
  "4.6": 40,
  "4.7": 36,
  "5.1": 85,
  "5.2": 65,
  "5.3": 30,
  "5.4": 60,
  "5.5": 70,
};

export function HomeTab() {
  const [activeSubtab, setActiveSubtab] = useState("2");

  const subtabs = [
    { id: "2", label: "2 · Coverage (90:90:80:80)", icon: TrendingUp },
    { id: "3", label: "3 · Readiness & Safe Systems", icon: ShieldCheck },
    { id: "4", label: "4 · MPDSR & Accountability", icon: Activity },
    { id: "5", label: "5 · Data Systems", icon: Database },
  ];

  return (
    <div>
      {/* Subtab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-slate-200 pb-0 overflow-x-auto">
        {subtabs.map((subtab) => {
          const Icon = subtab.icon;
          return (
            <button
              key={subtab.id}
              onClick={() => setActiveSubtab(subtab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeSubtab === subtab.id
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {subtab.label}
            </button>
          );
        })}
      </div>

      {/* Overview strip */}
      <HomeOverviewStrip />

      {activeSubtab === "2" && <CoverageSection />}
      {activeSubtab === "3" && <ReadinessSection />}
      {activeSubtab === "4" && <MpdsrSection />}
      {activeSubtab === "5" && <DataSystemsSection />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview strip (always visible)
// ---------------------------------------------------------------------------

function HomeOverviewStrip() {
  const allAssessments = useAssessments();
  const { filter } = useGeoFilter();
  const assessments = useMemo(
    () => applyGeoFilter(allAssessments, filter),
    [allAssessments, filter],
  );

  const avgReadiness =
    assessments.length > 0 ? averageReadiness(assessments) : 0;

  const cards = [
    {
      title: "1 · PMTCT/VTP Quality of Care",
      value: "87.7%",
      sub: "675 of 770 HIV+ PBFW initiated on ART",
      icon: <Stethoscope className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: "2 · Coverage (90:90:80:80)",
      value: "63%",
      sub: "Average across the 4 coverage pillars",
      icon: <TrendingUp className="w-5 h-5 text-teal-600" />,
    },
    {
      title: "3 · Readiness & Safe Systems",
      value: `${avgReadiness.toFixed(0)}%`,
      sub: `${assessments.length} facilities assessed · computed live`,
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: "4 · MPDSR & Accountability",
      value: "67%",
      sub: "4 of 6 facilities hold monthly reviews",
      icon: <Activity className="w-5 h-5 text-red-600" />,
    },
    {
      title: "5 · Data Systems",
      value: "62%",
      sub: "Average reporting & DQA completeness",
      icon: <Database className="w-5 h-5 text-indigo-600" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white rounded-lg p-5 border border-slate-200"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 font-medium">{card.title}</p>
            {card.icon}
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
          <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Coverage — EWENE 90:90:80:80
// ---------------------------------------------------------------------------

function CoverageSection() {
  const pillars = [
    {
      label: "ANC 4+ Visits",
      target: 90,
      current: 52,
      sublabel: "Target ≥ 90%",
    },
    {
      label: "Skilled Birth Attendance",
      target: 90,
      current: 70,
      sublabel: "Target ≥ 90%",
    },
    {
      label: "Postnatal Care ≤ 48 hrs",
      target: 80,
      current: 66.6,
      sublabel: "Target ≥ 80%",
    },
    {
      label: "Mother–Baby Pair Retention",
      target: 80,
      current: 62,
      sublabel: "Target ≥ 80%",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          EWENE 90:90:80:80 Coverage Pillars (Domain 2)
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Coverage targets: ANC 4+ ≥ 90% · Skilled delivery ≥ 90% · Early PNC ≥
          80% · Continuity of care ≥ 80%. Current values are KHIS-reported
          baselines.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar) => (
            <div
              key={pillar.label}
              className="flex flex-col items-center bg-slate-50 rounded-xl p-5"
            >
              <RadialProgress
                data={[{ name: pillar.label, value: pillar.current }]}
                title={pillar.label}
                color={
                  pillar.current >= pillar.target
                    ? "#10b981"
                    : pillar.current >= pillar.target * 0.7
                      ? "#f59e0b"
                      : "#ef4444"
                }
              />
              <p className="text-sm text-gray-600 mt-1">{pillar.sublabel}</p>
              <p className="text-xs text-gray-500 mt-1">
                Current: {pillar.current.toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Coverage Indicators 2.1 – 2.8 (Progress to Year 2 Targets)
        </h3>
        <div className="space-y-5">
          {COVERAGE_INDICATORS.map((ind) => (
            <IndicatorBar
              key={ind.code}
              indicator={ind}
              current={REPORTED_CURRENT[ind.code] ?? 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Readiness & Safe Systems — full Readiness Insights content (Domain 3)
// ---------------------------------------------------------------------------

function ReadinessSection() {
  return <AssessmentTab />;
}

// ---------------------------------------------------------------------------
// 4. MPDSR & Accountability
// ---------------------------------------------------------------------------

function MpdsrSection() {
  const chartData = [
    { name: "MPDSR/QI Review Meetings", current: 67, target: 100 },
    { name: "PPH Treatment Skills", current: 40, target: 70 },
    { name: "Asphyxia Treatment Skills", current: 36, target: 65 },
  ];

  return (
    <div className="space-y-6">
      {/* Full Mortality & MPDSR content (KPI cards, deaths by facility,
          monthly trends, facility review list) */}
      <MortalityTab />

      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          MPDSR/QI Meetings &amp; Provider Skills — % vs Target
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ left: 0, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(v) => [`${v}%`, ""]} />
            <Legend />
            <Bar
              dataKey="current"
              name="Current (%)"
              fill="#f59e0b"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="target"
              name="Target (%)"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          MPDSR &amp; Clinical Quality Indicators (4.1 – 4.7)
        </h3>
        <div className="space-y-5">
          {MPDSR_INDICATORS.map((ind) => (
            <IndicatorBar
              key={ind.code}
              indicator={ind}
              current={REPORTED_CURRENT[ind.code] ?? 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Data Systems
// ---------------------------------------------------------------------------

function DataSystemsSection() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Data Systems &amp; Reporting Functionality (5.1 – 5.5)
        </h3>
        <div className="space-y-5">
          {DATA_SYSTEM_INDICATORS.map((ind) => (
            <IndicatorBar
              key={ind.code}
              indicator={ind}
              current={REPORTED_CURRENT[ind.code] ?? 0}
            />
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Reporting Cadence</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
          <li>
            • Monthly: Facility PMTCT/VTP indicators, commodity stockouts, MPDSR
            audits, dashboard uploads
          </li>
          <li>
            • Quarterly: County scorecards, mother–baby pair retention, blood
            &amp; oxygen readiness
          </li>
          <li>
            • Semi-annual: Equipment functionality assessments, DoS IP
            contribution reports
          </li>
          <li>
            • Annual: National EWENE performance review &amp; lessons learned
          </li>
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared indicator progress bar
// ---------------------------------------------------------------------------

interface IndicatorBarProps {
  indicator: IndicatorDef;
  current: number | null;
}

const UNIT_SUFFIX: Record<NonNullable<IndicatorDef["unit"]>, string> = {
  percent: "%",
  count: "",
  "per-1000": " per 1,000 births",
  "per-100000": " per 100,000 live births",
};

function IndicatorBar({ indicator, current }: IndicatorBarProps) {
  const unit = indicator.unit ?? "percent";
  const suffix = UNIT_SUFFIX[unit];
  const y2Target = indicator.y2;
  const lowerIsBetter = indicator.lowerIsBetter ?? false;
  const isCount = unit === "count";

  const isMet =
    current !== null &&
    (lowerIsBetter ? current <= y2Target : current >= y2Target);
  const isPartial =
    current !== null &&
    (lowerIsBetter ? current <= indicator.y1 : current >= y2Target * 0.7);
  const barColor = isCount
    ? "bg-slate-400"
    : isMet
      ? "bg-emerald-500"
      : isPartial
        ? "bg-amber-500"
        : "bg-red-500";

  // Progress bar: %/count indicators grow toward target; rate indicators
  // (lower is better) shrink toward target.
  const progressWidth =
    current === null
      ? 0
      : lowerIsBetter
        ? Math.min(100, (y2Target / Math.max(current, 0.0001)) * 100)
        : Math.min((current / y2Target) * 100, 100);

  const displayValue =
    current === null
      ? "No data"
      : unit === "percent"
        ? `${current.toFixed(1)}%`
        : `${current}${suffix}`;

  const targetText =
    unit === "count"
      ? "Reported value (YTD)"
      : unit === "percent"
        ? `Y1 ≥ ${indicator.y1}% · Y2 ≥ ${indicator.y2}%`
        : `Y1 ≤ ${indicator.y1}${suffix} · Y2 ≤ ${indicator.y2}${suffix}`;

  return (
    <div className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-3 min-w-0">
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold whitespace-nowrap">
            {indicator.code}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {indicator.label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Baseline: {indicator.baseline ?? "—"} · {indicator.note}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={`text-lg font-bold ${
              isCount
                ? "text-gray-900"
                : isMet
                  ? "text-emerald-600"
                  : isPartial
                    ? "text-amber-600"
                    : "text-red-600"
            }`}
          >
            {displayValue}
          </p>
          <p className="text-xs text-gray-500">{targetText}</p>
        </div>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${progressWidth}%` }}
        />
      </div>
    </div>
  );
}
