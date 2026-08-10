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

const conversionFunnelData = [
  { stage: "New HIV+ PBFW", value: 450 },
  { stage: "Eligible for ART", value: 425 },
  { stage: "Initiated on ART", value: 385 },
];

const sbaHivData = [
  { name: "District 1", sba: 94 },
  { name: "District 2", sba: 90 },
  { name: "District 3", sba: 93 },
  { name: "District 4", sba: 88 },
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

function Subtab2B() {
  return (
    <div className="space-y-6">
      <SectionBanner
        tone="emerald"
        title="PMTCT & HIV Care — prevention of mother-to-child transmission"
        subtitle="Cascade: HIV+ PBFW → ART initiation → skilled delivery → exposed-infant (HEI) EID & VIP follow-up of mother–baby pairs."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="New HIV+ PBFW" value="450" sub="identified in the period" />
        <Kpi title="Initiated on ART" value="385" sub="85.6% of HIV+ PBFW" />
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

      {/* HIV Treatment Conversion Funnel */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          HIV Treatment Conversion Funnel
        </h3>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Missed Opportunities */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Missed Opportunities (New Positive - Initiated on ART)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
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

        {/* Skilled Birth Attendance among HIV+ PBFW (NEW) */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Skilled Birth Attendance among HIV+ PBFW
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            % of HIV+ deliveries attended by skilled birth attendants
          </p>
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
      </div>

      {/* HEI / Mother–Baby Pair Follow-up */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Exposed Infant (HEI) &amp; Mother–Baby Pair Follow-up
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          EID sample collection at birth and enrollment of HEI/baby/mother pairs
          into VIP follow-up.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* HEI EID Samples */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              HEI EID Samples Collected at Birth (Over Time)
            </h3>
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

          {/* VIP Follow-up Enrollment (NEW) */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              HEI / Baby / Mother Enrolled for VIP Follow-up
            </h3>
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
      </div>
    </div>
  );
}
