"use client";

import { useState } from "react";
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

// ---------------------------------------------------------------------------
// PMTCT & HIV Care — two clearly separated tracks:
//   1.A  Intake & Screening   (1st ANC → HIV testing, SHA enrollment)
//   1.B  PMTCT & HIV Care     (HIV+ PBFW cascade, SBA among HIV+, HEI follow-up)
// PrEP now lives in its own top-level tab (components/tabs/prep-tab.tsx).
// Values are KHIS/EMR-illustrative until live data entry is wired in.
// ---------------------------------------------------------------------------

function Kpi({
  title,
  value,
  sub,
  accent = "text-emerald-600",
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
  tone,
}: {
  title: string;
  subtitle: string;
  tone: "emerald" | "blue" | "violet";
}) {
  const tones = {
    emerald: "from-emerald-50 to-teal-50 border-emerald-200 text-emerald-900",
    blue: "from-blue-50 to-indigo-50 border-blue-200 text-blue-900",
    violet: "from-violet-50 to-purple-50 border-violet-200 text-violet-900",
  };
  return (
    <div className={`bg-gradient-to-r rounded-lg p-5 border ${tones[tone]}`}>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm mt-1 opacity-80">{subtitle}</p>
    </div>
  );
}

export function ClinicalTab() {
  const [activeSubtab, setActiveSubtab] = useState("1.a");

  const subtabs = [
    { id: "1.a", label: "1.A: Intake & Screening" },
    { id: "1.b", label: "1.B: PMTCT & HIV Care" },
  ];

  return (
    <div>
      <div className="flex gap-4 mb-6 border-b border-slate-200 pb-0 overflow-x-auto">
        {subtabs.map((subtab) => (
          <button
            key={subtab.id}
            onClick={() => setActiveSubtab(subtab.id)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeSubtab === subtab.id
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {subtab.label}
          </button>
        ))}
      </div>

      <div>
        {activeSubtab === "1.a" && <Subtab2A />}
        {activeSubtab === "1.b" && <Subtab2B />}
      </div>
    </div>
  );
}

// ===========================================================================
// 1.A — Intake & Screening
// ===========================================================================

const ancVsTestedData = [
  { name: "District 1", "ANC Visits": 3200, "HIV Tested": 3070 },
  { name: "District 2", "ANC Visits": 2900, "HIV Tested": 2790 },
  { name: "District 3", "ANC Visits": 3450, "HIV Tested": 3310 },
  { name: "District 4", "ANC Visits": 2650, "HIV Tested": 2545 },
];

const npKpData = [
  { name: "District 1", "Newly HIV+ (NP)": 148, "Known HIV+ (KP)": 102 },
  { name: "District 2", "Newly HIV+ (NP)": 122, "Known HIV+ (KP)": 88 },
  { name: "District 3", "Newly HIV+ (NP)": 110, "Known HIV+ (KP)": 84 },
  { name: "District 4", "Newly HIV+ (NP)": 70, "Known HIV+ (KP)": 46 },
];

const hivTestingData = [
  { name: "HIV Tested", value: 96, fill: "#10b981" },
  { name: "Not Tested", value: 4, fill: "#e5e7eb" },
];

function Subtab2A() {
  return (
    <div className="space-y-6">
      <SectionBanner
        tone="blue"
        title="Intake & Screening — the entry point of the PMTCT cascade"
        subtitle="1st ANC attendance, HIV testing coverage and HIV+ detection (NP + KP) at the 1st ANC visit."
      />

      {/* Intake KPI strip — aligned to Domain 1 entry indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DomainKpi
          title="1st ANC Attendance"
          value="94%"
          sub="PMTCT_STAT_D · target >95%"
          tone="warn"
          accent="text-amber-600"
        />
        <DomainKpi
          title="HIV Tested at 1st ANC"
          value="96%"
          sub="PMTCT_STAT_N · target >95%"
          tone="on"
        />
        <DomainKpi
          title="PBFW with known status"
          value="984"
          sub="96% of 1,025 1st ANC attendees"
          tone="on"
        />
        <DomainKpi
          title="HIV+ identified at intake"
          value="770"
          sub="450 NP + 320 KP · 78% of those tested"
          tone="on"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: 1st ANC vs HIV Tested */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            1st ANC Attendance vs HIV Testing
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Women reached at 1st ANC and those with an HIV test result at
            intake, per district.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ancVsTestedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ANC Visits" fill="#10b981" />
              <Bar dataKey="HIV Tested" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart: HIV Testing */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            HIV Testing Coverage (1st ANC Visits)
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            PMTCT_STAT_N — proportion of PBFW tested for HIV at 1st ANC · target
            &gt;95%.
          </p>
          <div className="flex flex-col items-center justify-center gap-8 h-[300px]">
            <div className="relative">
              <ResponsiveContainer width={260} height={260}>
                <PieChart>
                  <Pie
                    data={hivTestingData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {hivTestingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-bold text-emerald-600">96%</p>
                <p className="text-xs text-gray-500">Tested</p>
              </div>
            </div>
            <div className="flex gap-6">
              {hivTestingData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-sm text-gray-700">
                    {item.name}: {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* HIV+ detection at intake: NP vs KP */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900">
            HIV+ PBFW identified at Intake — New (NP) vs Known (KP)
          </h3>
          <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-800 text-xs font-bold">
            Denominator for ART initiation (PMTCT_ART)
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Women found HIV+ during the period are either newly identified at 1st
          ANC (NP) or already known positive (KP). Together they form the pool
          who must start ART — see 1.B.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={npKpData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Newly HIV+ (NP)" stackId="a" fill="#0d9488" />
                <Bar dataKey="Known HIV+ (KP)" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col justify-center bg-blue-50 rounded-lg p-6 border border-blue-200">
            <p className="text-sm font-medium text-blue-800">
              HIV+ PBFW identified at 1st ANC (YTD)
            </p>
            <p className="text-5xl font-bold text-blue-700 mt-2">770</p>
            <p className="text-xs text-blue-700/80 mt-2">
              58% newly identified (NP) · 42% known positive (KP)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// 1.B — PMTCT & HIV Care (HIV+ cascade + HEI follow-up)
// ===========================================================================

// Domain 1 — PMTCT / VTP Quality of Care: indicator collection (per review)
const PBFW_NEW_POSITIVE = 450; // Number of PBFW newly identified HIV Positive (NP)
const PBFW_KNOWN_POSITIVE = 320; // Number of PBFW Known HIV Positive at 1st ANC (KP)
const PBFW_NEW_ART = 385; // PBFW New Positive initiated on ART (PMTCT_ART, New)
const PBFW_KNOWN_ART = 290; // PBFW Known Positive initiated on ART (PMTCT_ART, KP)
const HEI_EID_2_8_WEEKS = 192; // EID sample within 2-8 weeks incl. birth (PMTCT_EID)
const HEI_EID_3_12_MONTHS = 145; // EID samples collected within 3-12 months
const HEI_EID_PCT = 88; // % of HEI with EID samples collected within 2-8 weeks
const PCR_POSITIVE_HEI = 26; // Number of PCR Positive HEI results received
const HEI_POSITIVE_ART = 24; // Positive HEI initiated ART (PMTCT_HEI_ART)
const HIV_DELIVERIES = 380; // Deliveries among HIV+ mothers in supported facilities
const SBA_HIV_PCT = 92; // % skilled Birth attendance among HIV Positive mothers
const HEI_COHORT_ENROLLED = 410; // HEI enrolled in the Cohort 18-24 months (PMTCT_FO)
const HEI_COHORT_NEGATIVE = 396; // HEI discharged HIV negative 18-24 months (PMTCT_FO)
const PAIRS_CONTINUUM_PCT = 91; // % mother-baby pair across continuum of care at 18-24 months

const conversionFunnelData = [
  { stage: "New HIV+ PBFW", value: 450 },
  { stage: "Eligible for ART", value: 425 },
  { stage: "Initiated on ART", value: 385 },
];

const sbaHivData = [
  { name: "Embu County", sba: 94 },
  { name: "Runyenjes", sba: 90 },
  { name: "Meru County", sba: 93 },
  { name: "Nkubu", sba: 88 },
];

const missedOpportunitiesData = [
  { month: "Jan", missed: 45 },
  { month: "Feb", missed: 38 },
  { month: "Mar", missed: 42 },
  { month: "Apr", missed: 35 },
  { month: "May", missed: 32 },
  { month: "Jun", missed: 28 },
];

const heiSamplesData = [
  { month: "Jan", samples: 120 },
  { month: "Feb", samples: 135 },
  { month: "Mar", samples: 148 },
  { month: "Apr", samples: 165 },
  { month: "May", samples: 178 },
  { month: "Jun", samples: 192 },
];

const vipFollowUpData = [
  { month: "Jan", enrolled: 95 },
  { month: "Feb", enrolled: 108 },
  { month: "Mar", enrolled: 122 },
  { month: "Apr", enrolled: 135 },
  { month: "May", enrolled: 149 },
  { month: "Jun", enrolled: 162 },
];

const VIP_YTD = vipFollowUpData.reduce((acc, d) => acc + d.enrolled, 0);

// ---- PMTCT Cascade — the mother–baby pair continuum "story" ----
const cascadeData = [
  { stage: "PBFW at 1st ANC (known HIV status)", count: 1025 },
  { stage: "HIV tested at 1st ANC", count: 984 },
  { stage: "HIV+ identified (NP + KP)", count: 770 },
  { stage: "Initiated on ART", count: 675 },
  { stage: "Delivered at supported facilities", count: 380 },
];

const heiOutcomeData = [
  { stage: "HEI enrolled in 18–24 month cohort", count: HEI_COHORT_ENROLLED },
  { stage: "HEI discharged HIV-negative", count: HEI_COHORT_NEGATIVE },
];

// ---- Mother–baby pair pathway (§4 tracking approach) ----
const MBP_PATHWAY = [
  {
    stage: "ANC",
    services: "ANC visits · HIV testing · PrEP screening",
    focus: "Early identification, linkage, adherence monitoring",
    expanded:
      "SHA enrollment at ANC; risk stratification for high-burden counties",
    color: "bg-emerald-50 border-emerald-200 text-emerald-900",
    chip: "bg-emerald-100 text-emerald-800",
  },
  {
    stage: "Delivery",
    services: "Skilled birth attendance; HIV-positive mothers",
    focus: "Quality of intrapartum care; safe delivery outcomes",
    expanded:
      "Safe blood availability; oxygen/CPAP readiness; equipment functionality verification",
    color: "bg-teal-50 border-teal-200 text-teal-900",
    chip: "bg-teal-100 text-teal-800",
  },
  {
    stage: "PNC ≤ 48 hrs",
    services: "Postnatal checks for mother & newborn; early infant testing",
    focus: "Continuity of care; early maternal-newborn outcomes",
    expanded:
      "Breastfeeding initiation; respectful maternity care documentation",
    color: "bg-cyan-50 border-cyan-200 text-cyan-900",
    chip: "bg-cyan-100 text-cyan-800",
  },
  {
    stage: "ART/MCH",
    services: "ART for HIV+ mothers; PMTCT; PrEP for PBFW",
    focus: "Treatment initiation, adherence, viral suppression",
    expanded: "Integration with SHA claims data for outcome tracking",
    color: "bg-blue-50 border-blue-200 text-blue-900",
    chip: "bg-blue-100 text-blue-800",
  },
  {
    stage: "Community",
    services: "Follow-up, tracing, appointment adherence, psychosocial support",
    focus: "Linkage, retention, continuity beyond the facility",
    expanded:
      "eCHIS-linked community death reporting; CHP-led danger sign surveillance",
    color: "bg-violet-50 border-violet-200 text-violet-900",
    chip: "bg-violet-100 text-violet-800",
  },
];

// ---- Domain 1 target framework (EWENE DA 6/26/2026) ----
type TargetIndicator = {
  code: string;
  label: string;
  value: number;
  target: number;
  source: string;
  frequency: string;
};

const DOMAIN1_TARGETS: TargetIndicator[] = [
  {
    code: "1.1 · PMTCT_STAT_D",
    label:
      "ANC coverage — 1st ANC attendance (denominator: PBFW with known HIV status)",
    value: 94,
    target: 95,
    source: "KHIS",
    frequency: "Monthly",
  },
  {
    code: "1.2 · PMTCT_STAT_N",
    label: "HIV testing coverage among PBFW at 1st ANC",
    value: 96,
    target: 95,
    source: "KHIS",
    frequency: "Monthly",
  },
  {
    code: "1.3 · PMTCT_ART",
    label: "ART initiation among HIV-positive PBFW",
    value: +(
      ((PBFW_NEW_ART + PBFW_KNOWN_ART) /
        (PBFW_NEW_POSITIVE + PBFW_KNOWN_POSITIVE)) *
      100
    ).toFixed(1),
    target: 95,
    source: "KHIS",
    frequency: "Monthly",
  },
  {
    code: "1.4 · PMTCT_PVLS",
    label: "Viral load suppression among PBFW",
    value: 94,
    target: 95,
    source: "NDW/EMR",
    frequency: "Monthly",
  },
  {
    code: "1.5 · PMTCT_EID",
    label: "EID within 8 weeks including birth testing",
    value: HEI_EID_PCT,
    target: 98,
    source: "KHIS/NASCOP",
    frequency: "Monthly",
  },
  {
    code: "1.6 · PMTCT_HEI_ART",
    label: "Timely ART initiation for PCR-positive exposed infants",
    value: +((HEI_POSITIVE_ART / PCR_POSITIVE_HEI) * 100).toFixed(1),
    target: 100,
    source: "NASCOP/EMR",
    frequency: "Monthly",
  },
  {
    code: "1.7 · Deliveries",
    label: "Skilled birth attendance among HIV-positive mothers",
    value: SBA_HIV_PCT,
    target: 90,
    source: "KHIS",
    frequency: "Monthly",
  },
  {
    code: "1.8 · PMTCT_FO",
    label: "HEI HIV-free survival at 18–24 months",
    value: +((HEI_COHORT_NEGATIVE / HEI_COHORT_ENROLLED) * 100).toFixed(1),
    target: 95,
    source: "EMR",
    frequency: "Monthly",
  },
  {
    code: "1.9 · Pairs",
    label: "Retention of mother–baby pair across continuum of care",
    value: PAIRS_CONTINUUM_PCT,
    target: 95,
    source: "EMR",
    frequency: "Quarterly",
  },
];

// Viral load (PMTCT_PVLS)
const vlData = [
  { name: "Suppressed", value: 94, fill: "#10b981" },
  { name: "Unsuppressed", value: 6, fill: "#e5e7eb" },
];

const vlTrendData = [
  { month: "Jan", uptake: 84, suppressed: 88 },
  { month: "Feb", uptake: 86, suppressed: 89 },
  { month: "Mar", uptake: 88, suppressed: 91 },
  { month: "Apr", uptake: 89, suppressed: 92 },
  { month: "May", uptake: 91, suppressed: 93 },
  { month: "Jun", uptake: 92, suppressed: 94 },
];

// PCR → HEI ART donut
const heiArtDonut = [
  { name: "Initiated on ART", value: HEI_POSITIVE_ART, fill: "#0d9488" },
  {
    name: "Not yet initiated",
    value: PCR_POSITIVE_HEI - HEI_POSITIVE_ART,
    fill: "#fee2e2",
  },
];

// One row of the Domain 1 indicator collection
function IndicatorRow({
  code,
  label,
  value,
  pct,
  isPct = false,
}: {
  code: string;
  label: string;
  value: number;
  pct?: string;
  isPct?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <div className="flex items-start gap-3 min-w-0">
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold whitespace-nowrap">
          {code}
        </span>
        <p className="text-sm text-gray-800">{label}</p>
      </div>
      <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
        {isPct ? `${value}%` : value}
        {!isPct && pct !== undefined && (
          <span className="text-xs font-semibold text-gray-500 ml-1">
            ({pct}%)
          </span>
        )}
      </p>
    </div>
  );
}

// ---- Domain 1 helpers: status badges, target meters, cascade bars ----
type StatusTone = "on" | "warn" | "off";

const STATUS_LABEL: Record<StatusTone, string> = {
  on: "On target",
  warn: "Needs attention",
  off: "Below target",
};

const STATUS_BADGE: Record<StatusTone, string> = {
  on: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-700",
  off: "bg-red-100 text-red-700",
};

const STATUS_DOT: Record<StatusTone, string> = {
  on: "bg-emerald-500",
  warn: "bg-amber-500",
  off: "bg-red-500",
};

const STATUS_BAR: Record<StatusTone, string> = {
  on: "bg-emerald-500",
  warn: "bg-amber-500",
  off: "bg-red-500",
};

function statusOf(
  value: number,
  target: number,
): { tone: StatusTone; label: string } {
  if (value >= target) return { tone: "on", label: STATUS_LABEL.on };
  const ratio = value / target;
  if (ratio >= 0.9) return { tone: "warn", label: STATUS_LABEL.warn };
  return { tone: "off", label: STATUS_LABEL.off };
}

function DomainKpi({
  title,
  value,
  sub,
  tone = "on",
  accent = "text-emerald-600",
}: {
  title: string;
  value: string;
  sub: string;
  tone?: StatusTone;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600 font-medium leading-snug">
          {title}
        </p>
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[tone]}`}
          title={STATUS_LABEL[tone]}
        />
      </div>
      <p className={`text-3xl font-bold mt-2 ${accent}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function TargetMeterCard({
  code,
  label,
  value,
  target,
  source,
  frequency,
}: TargetIndicator) {
  const { tone, label: statusLabel } = statusOf(value, target);
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold whitespace-nowrap">
          {code}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${STATUS_BADGE[tone]}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[tone]}`} />
          {statusLabel}
        </span>
      </div>
      <p className="text-sm text-gray-800 leading-snug flex-1">{label}</p>
      <div className="mt-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xl font-bold text-gray-900">{value}%</span>
          <span className="text-xs text-gray-500">Target &gt;{target}%</span>
        </div>
        <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${STATUS_BAR[tone]}`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gray-500"
            style={{ left: `${target}%` }}
          />
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[11px] text-gray-400">
        <span>{source}</span>
        <span>{frequency}</span>
      </div>
    </div>
  );
}

function CascadeBar({
  stage,
  count,
  max,
  note,
  unit = "of PBFW",
}: {
  stage: string;
  count: number;
  max: number;
  note?: string;
  unit?: string;
}) {
  const pct = (count / max) * 100;
  const roundedPct = Math.round(pct);
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
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-r-md flex items-center justify-end pr-2 text-white text-xs font-bold transition-all"
          style={{ width: `${pct}%` }}
        >
          {pct > 18 && `${roundedPct}% ${unit}`}
        </div>
      </div>
    </div>
  );
}

function Subtab2B() {
  const totalPBFW = PBFW_NEW_POSITIVE + PBFW_KNOWN_POSITIVE;
  const totalART = PBFW_NEW_ART + PBFW_KNOWN_ART;
  const pbfwInitiatedPct = ((totalART / totalPBFW) * 100).toFixed(1);
  const heiArtPct = ((HEI_POSITIVE_ART / PCR_POSITIVE_HEI) * 100).toFixed(1);
  const heiNegativePct = (
    (HEI_COHORT_NEGATIVE / HEI_COHORT_ENROLLED) *
    100
  ).toFixed(1);

  return (
    <div className="space-y-6">
      <SectionBanner
        tone="emerald"
        title="PMTCT & HIV Care — prevention of mother-to-child transmission"
        subtitle="Domain 1 · PMTCT/VTP Quality of Care — full indicator collection: HIV+ PBFW detection → ART initiation → skilled delivery → exposed-infant (HEI) EID & mother–baby pair follow-up."
      />

      {/* KPI strip — at-a-glance performance vs targets */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <DomainKpi
          title="HIV Tested at 1st ANC"
          value="96%"
          sub="PMTCT_STAT_N · target >95%"
          tone="on"
        />
        <DomainKpi
          title="HIV+ PBFW on ART"
          value={`${pbfwInitiatedPct}%`}
          sub={`${totalART} of ${totalPBFW} · target >95%`}
          tone="warn"
          accent="text-amber-600"
        />
        <DomainKpi
          title="VL Suppression"
          value="94%"
          sub="PMTCT_PVLS · target >95%"
          tone="warn"
          accent="text-amber-600"
        />
        <DomainKpi
          title="EID ≤ 8 weeks"
          value={`${HEI_EID_PCT}%`}
          sub="PMTCT_EID · target >98%"
          tone="off"
          accent="text-red-600"
        />
        <DomainKpi
          title="SBA among HIV+"
          value={`${SBA_HIV_PCT}%`}
          sub="Deliveries · target >90%"
          tone="on"
        />
        <DomainKpi
          title="HEI HIV-free 18–24m"
          value={`${heiNegativePct}%`}
          sub="PMTCT_FO · target >95%"
          tone="on"
        />
      </div>

      {/* PMTCT Cascade — the Domain 1 story */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900">
            The PMTCT Cascade — from 1st ANC to ART
          </h3>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold">
              Mother–baby pair continuum
            </span>
            <span className="px-2 py-1 rounded-md bg-teal-50 text-teal-800 text-xs font-bold">
              {VIP_YTD.toLocaleString()} VIP follow-ups enrolled YTD
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Every woman matters: of those who reach 1st ANC, how many are tested,
          linked to ART, deliver safely, and keep their baby HIV-free.
        </p>
        <div className="space-y-3">
          {cascadeData.map((item, idx) => (
            <CascadeBar
              key={idx}
              stage={item.stage}
              count={item.count}
              max={cascadeData[0].count}
              note={
                idx > 0
                  ? `−${(cascadeData[idx - 1].count - item.count).toLocaleString()} vs prev stage`
                  : undefined
              }
            />
          ))}
        </div>

        {/* HEI outcomes at 18-24 months */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              HEI outcomes at 18–24 months (PMTCT_FO)
            </h4>
            <div className="space-y-3">
              {heiOutcomeData.map((item, idx) => (
                <CascadeBar
                  key={idx}
                  stage={item.stage}
                  count={item.count}
                  max={heiOutcomeData[0].count}
                  unit="of HEI"
                  note={
                    idx > 0
                      ? `−${(heiOutcomeData[idx - 1].count - item.count).toLocaleString()} vs enrolled`
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center bg-emerald-50 rounded-lg p-6 border border-emerald-200">
            <p className="text-sm font-medium text-emerald-800">
              HIV-free survival among exposed infants
            </p>
            <p className="text-5xl font-bold text-emerald-700 mt-2">
              {heiNegativePct}%
            </p>
            <p className="text-xs text-emerald-700/80 mt-2">
              {HEI_COHORT_NEGATIVE.toLocaleString()} of{" "}
              {HEI_COHORT_ENROLLED.toLocaleString()} HEI discharged HIV-negative
              · target &gt;95%
            </p>
          </div>
        </div>
      </div>

      {/* Mother–baby pair pathway — the tracking approach (§4) */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900">
            The Mother–Baby Pair Pathway — longitudinal tracking
          </h3>
          <span className="px-2 py-1 rounded-md bg-violet-50 text-violet-700 text-xs font-bold">
            §4 Tracking Approach
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          The framework follows each mother–baby pair from ANC through delivery,
          PNC, ART/MCH and community follow-up — with safe blood, oxygen/CPAP
          and equipment functionality woven into the delivery stage.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {MBP_PATHWAY.map((p, idx) => (
            <div key={p.stage} className="relative">
              <div className={`h-full rounded-lg border p-4 ${p.color}`}>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-bold ${p.chip}`}
                  >
                    {p.stage}
                  </span>
                  {idx < MBP_PATHWAY.length - 1 && (
                    <span className="hidden xl:block text-slate-300 font-bold">
                      →
                    </span>
                  )}
                </div>
                <p className="text-xs mt-2 text-gray-700">{p.services}</p>
                <p className="text-[11px] mt-2 opacity-80">
                  <b>Focus:</b> {p.focus}
                </p>
                <p className="text-[11px] mt-1.5 pt-1.5 border-t border-white/50 opacity-80">
                  <b>Expanded:</b> {p.expanded}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Domain 1 indicator performance vs Year-1 targets */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Domain 1 — Indicator Performance vs Year-1 Targets
          </h3>
          <span className="text-xs text-gray-500">
            EWENE DA 6/26/2026 · KHIS / NASCOP / EMR
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Status:{" "}
          <span className="font-semibold text-emerald-600">On target</span> ·{" "}
          <span className="font-semibold text-amber-600">Needs attention</span>{" "}
          · <span className="font-semibold text-red-600">Below target</span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {DOMAIN1_TARGETS.map((ind) => (
            <TargetMeterCard key={ind.code} {...ind} />
          ))}
        </div>
      </div>

      {/* Viral load uptake & suppression */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Viral Load Uptake &amp; Suppression (PMTCT_PVLS)
          </h3>
          <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-800 text-xs font-bold">
            NDW/EMR · Monthly
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          VL coverage among HIV+ pregnant &amp; breastfeeding women and
          suppression among those tested — the gold standard for ART
          effectiveness.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <ResponsiveContainer width={220} height={220}>
                <PieChart>
                  <Pie
                    data={vlData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {vlData.map((entry, index) => (
                      <Cell key={`vl-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-bold text-emerald-700">94%</p>
                <p className="text-xs text-gray-500">Suppressed</p>
              </div>
            </div>
            <div className="flex gap-6">
              {vlData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-sm text-gray-700">
                    {item.name}: {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Uptake &amp; suppression trend (Jan–Jun)
            </h4>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={vlTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[70, 100]} />
                <Tooltip formatter={(v, name) => [`${v}%`, String(name)]} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="uptake"
                  stroke="#0d9488"
                  strokeWidth={2}
                  name="VL Uptake"
                />
                <Line
                  type="monotone"
                  dataKey="suppressed"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Suppression"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 1 — Detection & ART Initiation */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          HIV+ PBFW — Detection &amp; ART Initiation
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          1st ANC attendance (PMTCT_STAT_D) and HIV testing at 1st ANC
          (PMTCT_STAT_N) are shown under 1.A Intake &amp; Screening.
        </p>
        <IndicatorRow
          code="NP"
          label="Number of PBFW newly identified HIV Positive"
          value={PBFW_NEW_POSITIVE}
        />
        <IndicatorRow
          code="KP"
          label="Number of PBFW Known HIV Positive at 1st ANC"
          value={PBFW_KNOWN_POSITIVE}
        />
        <IndicatorRow
          code="PMTCT_ART (New)"
          label="Number of PBFW New Positive initiated on ART"
          value={PBFW_NEW_ART}
          pct={((PBFW_NEW_ART / PBFW_NEW_POSITIVE) * 100).toFixed(1)}
        />
        <IndicatorRow
          code="PMTCT_ART (KP)"
          label="Number of PBFW Known Positive initiated on ART"
          value={PBFW_KNOWN_ART}
          pct={((PBFW_KNOWN_ART / PBFW_KNOWN_POSITIVE) * 100).toFixed(1)}
        />
        <IndicatorRow
          code="% ART"
          label="% of HIV positive PBFW initiated on ART"
          value={totalART}
          pct={pbfwInitiatedPct}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* HIV Treatment Conversion Funnel */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              HIV Treatment Conversion Funnel
            </h4>
            <div className="space-y-3">
              {conversionFunnelData.map((item, idx) => {
                const percentage = (
                  (item.value / conversionFunnelData[0].value) *
                  100
                ).toFixed(0);
                const width = (item.value / 450) * 100;
                return (
                  <div key={idx}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {item.stage}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {item.value} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full flex items-center justify-center text-white text-xs font-bold transition-all"
                        style={{ width: `${width}%` }}
                      >
                        {percentage}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Missed Opportunities */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Missed Opportunities (New Positive - Initiated on ART)
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={missedOpportunitiesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="missed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Missed Cases"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 2 — HEI Early Infant Diagnosis */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Exposed Infant (HEI) — Early Infant Diagnosis (EID)
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          EID sample collection among HIV-exposed infants (PMTCT_EID).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <IndicatorRow
            code="PMTCT_EID"
            label="HEI with EID sample collected within 2-8 weeks (incl. birth testing)"
            value={HEI_EID_2_8_WEEKS}
          />
          <IndicatorRow
            code="EID 3-12m"
            label="HEI with EID samples collected within 3-12 months"
            value={HEI_EID_3_12_MONTHS}
          />
          <IndicatorRow
            code="% EID ≤ 8wk"
            label="% of HEI with EID samples collected within 2-8 weeks"
            value={HEI_EID_PCT}
            isPct
          />
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={heiSamplesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="samples"
              stroke="#10b981"
              strokeWidth={2}
              name="EID Samples"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 3 — PCR Results & HEI ART */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          PCR Results &amp; HEI ART Initiation
        </h3>
        <IndicatorRow
          code="PCR+"
          label="Number of PCR Positive HEI results received"
          value={PCR_POSITIVE_HEI}
        />
        <IndicatorRow
          code="PMTCT_HEI_ART"
          label="Number of positive HEI initiated ART"
          value={HEI_POSITIVE_ART}
        />
        <IndicatorRow
          code="% HEI ART"
          label="% of PCR positive initiated on ART"
          value={HEI_POSITIVE_ART}
          pct={heiArtPct}
        />
      </div>

      {/* 4 — Delivery Care among HIV+ Mothers */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Delivery Care among HIV+ Mothers
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Deliveries among HIV-positive mothers in the supported facilities.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          <IndicatorRow
            code="Deliveries"
            label="Number of Deliveries among HIV-positive mothers in supported facilities"
            value={HIV_DELIVERIES}
          />
          <IndicatorRow
            code="% SBA"
            label="% skilled Birth attendance among HIV Positive mothers"
            value={SBA_HIV_PCT}
            isPct
          />
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={sbaHivData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(v) => [`${v}%`, "SBA"]} />
            <Bar dataKey="sba" fill="#0d9488" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 5 — HEI Cohort 18-24 Months & Continuum of Care */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          HEI Cohort Follow-up — 18-24 Months (PMTCT_FO)
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Retention of exposed infants and mother–baby pairs across the
          continuum of care.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          <IndicatorRow
            code="PMTCT_FO"
            label="Number of HEI enrolled in the Cohort 18-24 months"
            value={HEI_COHORT_ENROLLED}
          />
          <IndicatorRow
            code="PMTCT_FO (−)"
            label="Number of HEI discharged HIV negative 18–24 months"
            value={HEI_COHORT_NEGATIVE}
          />
          <IndicatorRow
            code="% Negative"
            label="% of HEI discharged HIV Negative at 18-24 months"
            value={HEI_COHORT_NEGATIVE}
            pct={heiNegativePct}
          />
          <IndicatorRow
            code="% Pairs"
            label="% of mother–baby pair across the continuum of care reported at 18-24 months"
            value={PAIRS_CONTINUUM_PCT}
            isPct
          />
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={vipFollowUpData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="enrolled"
              stroke="#0ea5e9"
              strokeWidth={2}
              name="Enrolled"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
