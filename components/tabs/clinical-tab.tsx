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
//   2.A  Intake & Screening   (1st ANC → HIV testing, SHA enrollment)
//   2.B  PMTCT & HIV Care     (HIV+ PBFW cascade, SBA among HIV+, HEI follow-up)
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
  const [activeSubtab, setActiveSubtab] = useState("2.a");

  const subtabs = [
    { id: "2.a", label: "2.A: Intake & Screening" },
    { id: "2.b", label: "2.B: PMTCT & HIV Care" },
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
        {activeSubtab === "2.a" && <Subtab2A />}
        {activeSubtab === "2.b" && <Subtab2B />}
      </div>
    </div>
  );
}

// ===========================================================================
// 2.A — Intake & Screening
// ===========================================================================

const ancVsShaData = [
  { name: "District 1", "ANC Visits": 3200, "SHA Enrollment": 2850 },
  { name: "District 2", "ANC Visits": 2900, "SHA Enrollment": 2650 },
  { name: "District 3", "ANC Visits": 3450, "SHA Enrollment": 3100 },
  { name: "District 4", "ANC Visits": 2650, "SHA Enrollment": 2400 },
];

const hivTestingData = [
  { name: "HIV Tested", value: 68, fill: "#10b981" },
  { name: "Not Tested", value: 32, fill: "#e5e7eb" },
];

function Subtab2A() {
  return (
    <div className="space-y-6">
      <SectionBanner
        tone="blue"
        title="Intake & Screening — the entry point of the PMTCT cascade"
        subtitle="1st ANC attendance vs SHA enrollment, and HIV testing coverage at the 1st ANC visit."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: 1st ANC vs SHA */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            1st ANC Visits vs SHA Enrollment
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ancVsShaData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ANC Visits" fill="#10b981" />
              <Bar dataKey="SHA Enrollment" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart: HIV Testing */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            HIV Testing Coverage (1st ANC Visits)
          </h3>
          <div className="flex flex-col items-center justify-center gap-8 h-[300px]">
            <ResponsiveContainer width={260} height={260}>
              <PieChart>
                <Pie
                  data={hivTestingData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {hivTestingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
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
    </div>
  );
}

// ===========================================================================
// 2.B — PMTCT & HIV Care (HIV+ cascade + HEI follow-up)
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi
          title="Newly HIV Positive (NP)"
          value={String(PBFW_NEW_POSITIVE)}
          sub="PBFW identified in the period"
        />
        <Kpi
          title="Known HIV Positive at 1st ANC (KP)"
          value={String(PBFW_KNOWN_POSITIVE)}
          sub="PBFW known positive"
        />
        <Kpi
          title="Initiated on ART"
          value={String(totalART)}
          sub={`${pbfwInitiatedPct}% of HIV+ PBFW`}
        />
        <Kpi
          title="SBA among HIV+"
          value="92%"
          sub="Skilled Birth Attendance / HIV+ PBFW"
        />
        <Kpi
          title="VIP Follow-up Enrolled"
          value={String(VIP_YTD)}
          sub="HEI / baby / mother pairs (YTD)"
          accent="text-teal-600"
        />
      </div>

      {/* 1 — Detection & ART Initiation */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          HIV+ PBFW — Detection &amp; ART Initiation
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          1st ANC attendance (PMTCT_STAT_D) and HIV testing at 1st ANC
          (PMTCT_STAT_N) are shown under 2.A Intake &amp; Screening.
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
