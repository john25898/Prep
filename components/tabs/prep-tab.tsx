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
import { ShieldCheck, Users, HeartPulse } from "lucide-react";

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

// ---- PrEP cascade — the prevention story ----
const prepCascadeData = [
  { stage: "PBFW screened for PrEP at ANC", count: 1025 },
  { stage: "Assessed eligible for PrEP", count: 280 },
  { stage: "Initiated on PrEP", count: 198 },
  { stage: "Continuing at 3 months", count: 156 },
  { stage: "Retained on PrEP at 6 months", count: 132 },
];

const PREP_ELIGIBLE = prepCascadeData[1].count;
const PREP_INITIATED = prepCascadeData[2].count;
const PREP_3MO = prepCascadeData[3].count;
const PREP_6MO = prepCascadeData[4].count;
const PREP_COVERAGE_PCT = Math.round((PREP_INITIATED / PREP_ELIGIBLE) * 100);
const PREP_3MO_PCT = Math.round((PREP_3MO / PREP_INITIATED) * 100);
const PREP_6MO_PCT = Math.round((PREP_6MO / PREP_INITIATED) * 100);

// Facility-level: eligible vs initiated (sums match the cascade totals).
const prepFacilityData = [
  { name: "Embu CRH", eligible: 62, initiated: 47 },
  { name: "Runyenjes", eligible: 48, initiated: 31 },
  { name: "Meru TRH", eligible: 55, initiated: 40 },
  { name: "Nkubu HC", eligible: 25, initiated: 13 },
  { name: "Ol Kalou SCH", eligible: 44, initiated: 30 },
  { name: "Chuka CRH", eligible: 46, initiated: 37 },
];

// Retention: continuing at 6 months vs not.
const prepRetentionData = [
  { name: "Retained at 6 months", value: PREP_6MO, fill: "#8b5cf6" },
  {
    name: "Discontinued / lost",
    value: PREP_INITIATED - PREP_6MO,
    fill: "#e5e7eb",
  },
];

// Monthly: new initiations AND cumulative active on PrEP.
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
          style={{ width: `${pct}%` }}
        >
          {pct > 18 && `${Math.round(pct)}% of screened`}
        </div>
      </div>
    </div>
  );
}

export function PrepTab() {
  return (
    <div className="space-y-6">
      <SectionBanner
        title="PrEP — Pre-Exposure Prophylaxis for Pregnant & Breastfeeding Women (PBFW)"
        subtitle="A distinct prevention track: ANC screening → eligibility → initiation → continuation → retention. Kept separate from the PMTCT treatment cascade."
      />

      {/* KPI Cards — the PrEP story at a glance */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi
          title="PBFW Screened at ANC"
          value="1,025"
          sub="for PrEP eligibility (PMTCT_STAT_N visit)"
          accent="text-violet-600"
        />
        <Kpi
          title="Assessed Eligible"
          value={PREP_ELIGIBLE.toLocaleString()}
          sub="27% of women screened"
          accent="text-violet-600"
        />
        <Kpi
          title="Initiated on PrEP"
          value={PREP_INITIATED.toLocaleString()}
          sub={`${PREP_COVERAGE_PCT}% of eligible (target ≥ 90%)`}
          accent={
            PREP_COVERAGE_PCT >= 90 ? "text-emerald-600" : "text-amber-600"
          }
        />
        <Kpi
          title="Continuing at 3 months"
          value={`${PREP_3MO_PCT}%`}
          sub={`${PREP_3MO.toLocaleString()} of ${PREP_INITIATED.toLocaleString()} initiated`}
          accent={PREP_3MO_PCT >= 80 ? "text-emerald-600" : "text-amber-600"}
        />
        <Kpi
          title="Retained at 6 months"
          value={`${PREP_6MO_PCT}%`}
          sub={`${PREP_6MO.toLocaleString()} of ${PREP_INITIATED.toLocaleString()} initiated`}
          accent={PREP_6MO_PCT >= 70 ? "text-emerald-600" : "text-amber-600"}
        />
      </div>

      {/* PrEP Cascade — the prevention story */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900">
            The PrEP Cascade — from ANC screening to 6-month retention
          </h3>
          <span className="px-2 py-1 rounded-md bg-violet-50 text-violet-800 text-xs font-bold">
            Prevention track · per EWENE tracking framework
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Every HIV-negative PBFW screened at ANC is a prevention opportunity:
          eligibility is confirmed, PrEP is started, and adherence is sustained
          so that seroconversion is avoided through the highest-risk window.
        </p>
        <div className="space-y-3">
          {prepCascadeData.map((item, idx) => (
            <CascadeBar
              key={idx}
              stage={item.stage}
              count={item.count}
              max={prepCascadeData[0].count}
              note={
                idx > 0
                  ? `↓ ${(prepCascadeData[idx - 1].count - item.count).toLocaleString()} drop`
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
                    data={prepRetentionData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {prepRetentionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-bold text-violet-700">
                  {PREP_6MO_PCT}%
                </p>
                <p className="text-xs text-gray-500">Retained</p>
              </div>
            </div>
            <div className="flex gap-6">
              {prepRetentionData.map((item, idx) => (
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
