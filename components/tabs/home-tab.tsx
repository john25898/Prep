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
  ClipboardList,
  Database,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { GaugeChart } from "@/components/gauge-chart";
import { RadialProgress } from "@/components/radial-progress";
import { StatusBadge } from "@/components/status-badge";
import { useAssessments } from "@/lib/use-assessments";
import { useGeoFilter } from "@/lib/geo-filter-context";
import { applyGeoFilter } from "@/lib/geo";
import {
  assessmentScore,
  averageReadiness,
  readinessStatus,
  yesRate,
} from "@/lib/assessment";

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
];

const MPDSR_INDICATORS: IndicatorDef[] = [
  {
    code: "4.0",
    label: "Combined % of maternal & neonatal deaths audited (MPDSR)",
    baseline: "87% combined",
    y1: 90,
    y2: 100,
    note: "Domain 4 combined audit · Source: KHIS / MPDSR records (monthly)",
  },
  {
    code: "4.1",
    label: "% of maternal deaths audited at supported facilities",
    baseline: "105.82% reported (KHIS, over-reporting noted)",
    y1: 100,
    y2: 100,
    note: "Source: KHIS / MPDSR records (monthly)",
  },
  {
    code: "4.2",
    label: "% of neonatal deaths audited at supported facilities",
    baseline: "66.76% (KHIS)",
    y1: 85,
    y2: 100,
    note: "Source: KHIS / MPDSR records (monthly)",
  },
  {
    code: "4.3",
    label: "% of supported facilities holding monthly MPDSR/QI review meetings",
    baseline: "41% of counties (national)",
    y1: 100,
    y2: 100,
    note: "Source: County records (monthly)",
  },
  {
    code: "4.5",
    label: "% of providers correctly diagnosing & treating PPH",
    baseline: "40% (national)",
    y1: 55,
    y2: 70,
    note: "Source: HFA-QOC / skills assessment (semi-annual)",
  },
  {
    code: "4.6",
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

const READINESS_INDICATORS: (IndicatorDef & { itemId: string })[] = [
  {
    itemId: "3.1",
    code: "3.1",
    label:
      "Zero stockout of tracer MNH commodities (oxytocin, carbetocin, MgSO₄, TXA, benzyl penicillin)",
    y1: 80,
    y2: 100,
    note: "Computed from Item 3.1 (LMIS/KHIS)",
  },
  {
    itemId: "3.2",
    code: "3.2",
    label: "Functional blood transfusion services (Level 4 facilities)",
    y1: 75,
    y2: 85,
    note: "Computed from Item 3.2 (HFA-QOC)",
  },
  {
    itemId: "3.3",
    code: "3.3",
    label: "Functional oxygen supply & neonatal CPAP",
    y1: 40,
    y2: 60,
    note: "Computed from Item 3.3 (HFA-QOC)",
  },
  {
    itemId: "3.4",
    code: "3.4",
    label:
      "IP-procured equipment functional & in active use (6 months post-delivery)",
    y1: 90,
    y2: 90,
    note: "Computed from Item 3.4 (facility assessment)",
  },
  {
    itemId: "3.5",
    code: "3.5",
    label: "All 7 BEmONC signal functions performed",
    y1: 50,
    y2: 65,
    note: "Computed from Item 3.5 (HFA-QOC)",
  },
  {
    itemId: "3.6",
    code: "3.6",
    label: "All 9 CEmONC signal functions (Level 4/5 facilities)",
    y1: 60,
    y2: 75,
    note: "Computed from Item 3.6 (HFA-QOC)",
  },
  {
    itemId: "3.7",
    code: "3.7",
    label: "Essential newborn care (ENC) bundle consistently provided",
    y1: 45,
    y2: 60,
    note: "Computed from Item 3.7 (HFA-QOC)",
  },
  {
    itemId: "3.8",
    code: "3.8",
    label: "No stockout of blood or blood products in the reporting period",
    y1: 80,
    y2: 95,
    note: "Computed from Item 3.8 (LMIS)",
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
  "4.0": 87,
  "4.1": 95,
  "4.2": 66.8,
  "4.3": 41,
  "4.5": 40,
  "4.6": 36,
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
      {/* Overview strip */}
      <HomeOverviewStrip />

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
  const readyCount = assessments.filter(
    (a) => readinessStatus(assessmentScore(a).percentage) === "green",
  ).length;

  const cards = [
    {
      title: "Facilities Assessed",
      value: assessments.length,
      sub: "Domain 3 readiness",
      icon: <ClipboardList className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: "Average Readiness",
      value: `${averageReadiness(assessments).toFixed(0)}%`,
      sub: "across assessed facilities",
      icon: <ShieldCheck className="w-5 h-5 text-teal-600" />,
    },
    {
      title: "Ready Facilities",
      value: readyCount,
      sub: "score ≥ 80%",
      icon: <Activity className="w-5 h-5 text-blue-600" />,
    },
    {
      title: "Combined MPDSR Audit",
      value: "87%",
      sub: "Domain 4 · deaths audited",
      icon: <TrendingUp className="w-5 h-5 text-purple-600" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
          Coverage Indicators 2.1 – 2.6 (Progress to Year 2 Targets)
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
// 3. Readiness & Safe Systems (computed from assessments)
// ---------------------------------------------------------------------------

function ReadinessSection() {
  const allAssessments = useAssessments();
  const { filter } = useGeoFilter();
  const assessments = useMemo(
    () => applyGeoFilter(allAssessments, filter),
    [allAssessments, filter],
  );

  const readinessValues = useMemo(() => {
    return READINESS_INDICATORS.map((ind) => ({
      ...ind,
      current: yesRate(assessments, ind.itemId),
    }));
  }, [assessments]);

  const chartData = useMemo(
    () =>
      readinessValues.map((r) => ({
        name: r.code,
        label: r.label,
        current: r.current === null ? null : Math.round(r.current),
        target: r.y2,
      })),
    [readinessValues],
  );

  if (assessments.length === 0) {
    const hasDataElsewhere = allAssessments.length > 0;
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <ShieldCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900">
          {hasDataElsewhere
            ? "No Readiness Data in the Current Scope"
            : "Readiness Indicators Await Facility Data"}
        </h3>
        <p className="text-gray-600 mt-2 max-w-lg mx-auto">
          {hasDataElsewhere ? (
            <>
              No entered assessments match the current scope filter. Use the{" "}
              <span className="font-semibold text-emerald-600">Scope</span>{" "}
              dropdowns in the header to widen the selection.
            </>
          ) : (
            <>
              Indicators 3.1 – 3.8 (% of supported facilities meeting each
              readiness criterion) are computed automatically from the entered
              Domain 3 facility assessments. Use the{" "}
              <span className="font-semibold text-emerald-600">
                App Launcher
              </span>{" "}
              to enter an assessment, then return here to see the live
              dashboard.
            </>
          )}
        </p>
      </div>
    );
  }

  const avgReadiness = averageReadiness(assessments);

  return (
    <div className="space-y-6">
      {/* Summary banner — KPI cards already shown in the overview strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-5 border border-emerald-200">
        <div>
          <p className="text-sm font-medium text-emerald-800">
            Domain 3 · computed live from {assessments.length} assessment
            {assessments.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-2xl font-bold text-gray-900">
              {avgReadiness.toFixed(1)}% average readiness
            </p>
            <StatusBadge
              status={
                avgReadiness >= 80
                  ? "green"
                  : avgReadiness >= 60
                    ? "amber"
                    : "red"
              }
              label={`${avgReadiness.toFixed(0)}%`}
            />
          </div>
        </div>
        <p className="text-sm text-emerald-700">
          Facility-level scores, charts &amp; records are under the{" "}
          <span className="font-semibold">Readiness Insights</span> tab.
        </p>
      </div>

      {/* Highlight gauges: 3.1, 3.2, 3.3, 3.8 */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Critical Safe Systems — Zero Stockouts, Blood &amp; Oxygen (Indicators
          3.1, 3.2, 3.3, 3.8)
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          % of assessed facilities meeting each criterion (computed from entered
          assessments, N/A excluded)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {readinessValues
            .filter((r) => ["3.1", "3.2", "3.3", "3.8"].includes(r.itemId))
            .map((r) => (
              <div key={r.itemId} className="bg-slate-50 rounded-xl p-5">
                <GaugeChart
                  value={r.current ?? 0}
                  max={100}
                  label={`${r.code} · ${r.label.split("(")[0].trim()}`}
                  color={
                    r.current !== null && r.current >= r.y2
                      ? "#10b981"
                      : r.current !== null && r.current >= r.y1
                        ? "#f59e0b"
                        : "#ef4444"
                  }
                />
                <p className="text-xs text-gray-500 text-center mt-1">
                  Target: Y1 {r.y1}% → Y2 {r.y2}%
                </p>
              </div>
            ))}
        </div>
      </div>

      {/* All 8 indicators vs targets */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Facility Readiness Indicators 3.1 – 3.8 vs Year 2 Targets
        </h3>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={chartData} margin={{ left: 0, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} />
            <Tooltip
              formatter={(value, name) =>
                name === "target"
                  ? [`${value}%`, "Y2 Target"]
                  : value === null || value === undefined
                    ? ["No data", "Current"]
                    : [`${value}%`, "Current"]
              }
              labelFormatter={(label) => {
                const item = chartData.find((d) => d.name === label);
                return item ? item.label : label;
              }}
            />
            <Legend />
            <Bar
              dataKey="current"
              name="Current"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="target"
              name="Y2 Target"
              fill="#93c5fd"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-indicator bars */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Readiness Indicator Detail
        </h3>
        <div className="space-y-5">
          {readinessValues.map((ind) => (
            <IndicatorBar
              key={ind.itemId}
              indicator={ind}
              current={ind.current}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. MPDSR & Accountability
// ---------------------------------------------------------------------------

function MpdsrSection() {
  const chartData = [
    { name: "Maternal Deaths", audited: 95, target: 100 },
    { name: "Neonatal Deaths", audited: 66.8, target: 100 },
    { name: "MPDSR/QI Meetings", audited: 41, target: 100 },
    { name: "PPH Treatment Skills", audited: 40, target: 70 },
    { name: "Asphyxia Treatment Skills", audited: 36, target: 65 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">
            Maternal Deaths Audited (4.1)
          </p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">95%</p>
          <p className="text-xs text-gray-500 mt-1">Target 100%</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">
            Neonatal Deaths Audited (4.2)
          </p>
          <p className="text-3xl font-bold text-amber-600 mt-2">66.8%</p>
          <p className="text-xs text-gray-500 mt-1">Target 100%</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">
            Monthly MPDSR/QI Meetings (4.3)
          </p>
          <p className="text-3xl font-bold text-red-600 mt-2">41%</p>
          <p className="text-xs text-gray-500 mt-1">Target 100%</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">
            Combined MPDSR Audit (4.0)
          </p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">87%</p>
          <p className="text-xs text-gray-500 mt-1">
            Domain 4 · maternal + neonatal
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          MPDSR &amp; Provider Skills — Audited % vs Target
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
              dataKey="audited"
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
          MPDSR &amp; Clinical Quality Indicators (4.0 – 4.6)
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

function IndicatorBar({ indicator, current }: IndicatorBarProps) {
  const y2Target = indicator.y2;
  const progressWidth =
    current === null ? 0 : Math.min((current / y2Target) * 100, 100);
  const isMet = current !== null && current >= y2Target;
  const isPartial = current !== null && current >= y2Target * 0.7;
  const barColor = isMet
    ? "bg-emerald-500"
    : isPartial
      ? "bg-amber-500"
      : "bg-red-500";

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
              isMet
                ? "text-emerald-600"
                : isPartial
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {current === null ? "No data" : `${current.toFixed(1)}%`}
          </p>
          <p className="text-xs text-gray-500">
            Y1 ≥ {indicator.y1}% · Y2 ≥ {indicator.y2}%
          </p>
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
