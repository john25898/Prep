"use client";

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
// PrEP — separate prevention track (own top-level tab)
//   Eligibility → initiation → ongoing coverage over time.
// Values are KHIS/EMR-illustrative until live data entry is wired in.
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

const prepEligibleData = [
  { name: "Eligible for PrEP", PBFW: 280 },
  { name: "Initiated on PrEP", PBFW: 198 },
];

const prepCoverageData = [
  { name: "Initiated on PrEP", value: 198, fill: "#8b5cf6" },
  { name: "Eligible, not yet initiated", value: 82, fill: "#e5e7eb" },
];

const prepInitiationData = [
  { month: "Jan", initiated: 150 },
  { month: "Feb", initiated: 165 },
  { month: "Mar", initiated: 178 },
  { month: "Apr", initiated: 190 },
  { month: "May", initiated: 205 },
  { month: "Jun", initiated: 218 },
];

export function PrepTab() {
  return (
    <div className="space-y-6">
      <SectionBanner
        title="PrEP — Pre-Exposure Prophylaxis for Pregnant & Breastfeeding Women (PBFW)"
        subtitle="A distinct prevention track: eligibility → initiation → ongoing coverage, kept separate from the PMTCT treatment cascade."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi
          title="PBFW Eligible for PrEP"
          value="280"
          sub="newly eligible in the period"
          accent="text-violet-600"
        />
        <Kpi
          title="Initiated on PrEP"
          value="198"
          sub="of 280 eligible"
          accent="text-violet-600"
        />
        <Kpi
          title="PrEP Coverage"
          value="71%"
          sub="initiated ÷ eligible"
          accent="text-violet-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PrEP Coverage Donut */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            PrEP Coverage (Eligible vs Initiated)
          </h3>
          <div className="flex flex-col items-center justify-center gap-6 h-[280px]">
            <ResponsiveContainer width={240} height={240}>
              <PieChart>
                <Pie
                  data={prepCoverageData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {prepCoverageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4">
              {prepCoverageData.map((item, idx) => (
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

        {/* PrEP Eligibility vs Initiation */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            PrEP Eligibility vs Initiation (PBFW)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={prepEligibleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="PBFW" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* New PrEP Initiations Over Time */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          New PrEP Initiations Over Time
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={prepInitiationData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="initiated"
              stroke="#8b5cf6"
              strokeWidth={2}
              name="New Initiations"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
