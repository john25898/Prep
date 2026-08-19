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
import {
  HeartHandshake,
  Home,
  ShieldCheck,
  UserCheck,
  Users,
  Sparkles,
  Save,
} from "lucide-react";
import { AIAssistant, type ChartInsight } from "@/components/ai-assistant";
import { ViewDataButton } from "@/components/view-data";

// ---------------------------------------------------------------------------
// SHA — Social Health Authority (Universal Health Coverage) enrollment
// Registration of HIV+ pregnant women (PBFW) and their households/dependents
// into the SHA scheme across the supported facilities.
// Values are KHIS/SHA-illustrative until live data entry is wired in.
// ---------------------------------------------------------------------------

const TOTAL_POSITIVE = 770; // HIV+ PBFW in the supported facilities
const TOTAL_ENROLLED = 540; // of those, enrolled in SHA (~70%)
const ENROLLMENT_PCT = Math.round((TOTAL_ENROLLED / TOTAL_POSITIVE) * 100);

const shaTrendData = [
  { month: "Jan", enrolled: 860 },
  { month: "Feb", enrolled: 990 },
  { month: "Mar", enrolled: 1030 },
  { month: "Apr", enrolled: 1130 },
  { month: "May", enrolled: 1190 },
  { month: "Jun", enrolled: 1270 },
];

// HIV+ patients vs those enrolled in SHA, per facility (sums match totals).
const positiveVsShaData = [
  { name: "Embu CRH", "HIV+ Patients": 140, "SHA Enrolled": 120 },
  { name: "Runyenjes", "HIV+ Patients": 110, "SHA Enrolled": 72 },
  { name: "Meru TRH", "HIV+ Patients": 160, "SHA Enrolled": 125 },
  { name: "Nkubu HC", "HIV+ Patients": 95, "SHA Enrolled": 40 },
  { name: "Ol Kalou SCH", "HIV+ Patients": 120, "SHA Enrolled": 76 },
  { name: "Chuka CRH", "HIV+ Patients": 145, "SHA Enrolled": 107 },
];

// % of HIV+ patients enrolled in SHA per facility.
const coverageByFacility = [
  { name: "Embu CRH", coverage: 86 },
  { name: "Runyenjes", coverage: 65 },
  { name: "Meru TRH", coverage: 78 },
  { name: "Nkubu HC", coverage: 42 },
  { name: "Ol Kalou SCH", coverage: 63 },
  { name: "Chuka CRH", coverage: 74 },
];

// Facilities offering maternity services (denominator for assessment coverage).
// (Assessment coverage now lives under Domain 3 — Readiness & Safe Systems.)

// ---------------------------------------------------------------------------
// 4-tier performance scale (applied to ALL %-based displays):
// > 80% dark green · 70–80% light green · 50–70% yellow · < 50% red
// ---------------------------------------------------------------------------

function tierColor(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "#cbd5e1";
  if (value > 80) return "#15803d";
  if (value >= 70) return "#4ade80";
  if (value >= 50) return "#eab308";
  return "#ef4444";
}

function tierText(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "text-slate-400";
  if (value > 80) return "text-green-700";
  if (value >= 70) return "text-green-600";
  if (value >= 50) return "text-yellow-600";
  return "text-red-600";
}

const coverageDonut = [
  {
    name: "Enrolled",
    value: ENROLLMENT_PCT,
    fill: tierColor(ENROLLMENT_PCT),
  },
  { name: "Not Enrolled", value: 100 - ENROLLMENT_PCT, fill: "#e5e7eb" },
];

function Kpi({
  title,
  value,
  sub,
  accent = "text-blue-600",
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
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-200 text-blue-900">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-white/70 border border-blue-200 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm mt-1 opacity-80">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export function ShaTab({
  onSaveToPlayground,
}: {
  onSaveToPlayground?: (chart: ChartInsight) => void;
}) {
  const [activeChart, setActiveChart] = useState<ChartInsight | null>(null);

  const addChartToPlayground = (chart: ChartInsight) => {
    onSaveToPlayground?.(chart);
  };

  return (
    <div className="space-y-6">
      <AIAssistant
        chartContext={activeChart}
        onSaveToPlayground={addChartToPlayground}
      />

      <SectionBanner
        icon={<HeartHandshake className="w-5 h-5 text-blue-600" />}
        title="SHA Enrollment — Universal Health Coverage"
        subtitle="Registration of HIV+ pregnant women (PBFW) and their households & dependents into the Social Health Authority scheme within the supported facilities. Values are KHIS/SHA-illustrative until live data entry is wired in."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          title="HIV+ Patients Enrolled in SHA"
          value={TOTAL_ENROLLED.toLocaleString()}
          sub={`of ${TOTAL_POSITIVE.toLocaleString()} HIV+ PBFW`}
          accent="text-blue-600"
        />
        <Kpi
          title="HIV+ SHA Enrollment Rate"
          value={`${ENROLLMENT_PCT}%`}
          sub="of HIV+ patients registered with SHA"
          accent={tierText(ENROLLMENT_PCT)}
        />
        <Kpi
          title="Households Registered"
          value="18,450"
          sub="SHA household registrations"
          accent="text-teal-600"
        />
        <Kpi
          title="Dependents Covered"
          value="52,300"
          sub="SHA beneficiaries in scope"
          accent="text-indigo-600"
        />
      </div>

      {/* HIV+ vs SHA + Enrollment trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-slate-200 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              HIV+ Patients vs SHA-Enrolled (by Facility)
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setActiveChart({
                    id: "sha-facility-comparison",
                    title: "HIV+ Patients vs SHA-Enrolled (by Facility)",
                    summary:
                      "This chart compares HIV-positive patients and those successfully enrolled in SHA across facilities.",
                    prompt:
                      "Explain the facility-level gap between HIV-positive women and SHA enrollment and identify where the biggest follow-up burden sits.",
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
              >
                <Sparkles className="h-3.5 w-3.5" /> AI Assist
              </button>
              <button
                type="button"
                onClick={() =>
                  addChartToPlayground({
                    id: "sha-facility-comparison",
                    title: "HIV+ Patients vs SHA-Enrolled (by Facility)",
                    summary:
                      "This chart compares HIV-positive patients and those successfully enrolled in SHA across facilities.",
                    prompt:
                      "Explain the facility-level gap between HIV-positive women and SHA enrollment and identify where the biggest follow-up burden sits.",
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
              >
                <Save className="h-3.5 w-3.5" /> Save
              </button>
              <ViewDataButton
                title="HIV+ Patients vs SHA-Enrolled (by Facility)"
                data={positiveVsShaData}
                note="Illustrative — SHA data not on KHIS"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            HIV+ pregnant women per facility vs those enrolled in SHA in the
            period.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={positiveVsShaData} margin={{ left: 0, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="HIV+ Patients"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="SHA Enrolled"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 border border-slate-200 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              SHA Enrollment Trend (Jan – Jun)
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setActiveChart({
                    id: "sha-enrollment-trend",
                    title: "SHA Enrollment Trend (Jan – Jun)",
                    summary:
                      "This chart shows the monthly pace of SHA registration growth across the supported facilities.",
                    prompt:
                      "Interpret the monthly SHA enrollment trend and say whether enrollment is accelerating or plateauing.",
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
              >
                <Sparkles className="h-3.5 w-3.5" /> AI Assist
              </button>
              <button
                type="button"
                onClick={() =>
                  addChartToPlayground({
                    id: "sha-enrollment-trend",
                    title: "SHA Enrollment Trend (Jan – Jun)",
                    summary:
                      "This chart shows the monthly pace of SHA registration growth across the supported facilities.",
                    prompt:
                      "Interpret the monthly SHA enrollment trend and say whether enrollment is accelerating or plateauing.",
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
              >
                <Save className="h-3.5 w-3.5" /> Save
              </button>
              <ViewDataButton
                title="SHA Enrollment Trend (Jan – Jun)"
                data={shaTrendData}
                note="Illustrative — SHA data not on KHIS"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Monthly SHA registrations across supported facilities.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={shaTrendData} margin={{ left: 0, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="enrolled"
                stroke="#2563eb"
                strokeWidth={2}
                name="Enrolled"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Coverage by facility + donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-slate-200 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              SHA Coverage by Facility
            </h3>
            <ViewDataButton
              title="SHA Coverage by Facility"
              data={coverageByFacility}
              note="Illustrative — SHA data not on KHIS"
            />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            % of HIV+ patients enrolled per facility —{" "}
            <span className="text-green-700 font-medium">
              &gt;80% dark green
            </span>{" "}
            ·{" "}
            <span className="text-green-600 font-medium">
              70–80% light green
            </span>{" "}
            · <span className="text-yellow-600 font-medium">50–70% yellow</span>{" "}
            · <span className="text-red-600 font-medium">&lt;50% red</span>.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={coverageByFacility} margin={{ left: 0, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(v) => [`${v}%`, "Coverage"]} />
              <Bar dataKey="coverage" name="Coverage %" radius={[6, 6, 0, 0]}>
                {coverageByFacility.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={tierColor(entry.coverage)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 border border-slate-200 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Overall Enrollment Coverage
            </h3>
            <ViewDataButton
              title="Overall SHA Enrollment Coverage"
              data={coverageDonut}
              note="Illustrative — SHA data not on KHIS"
              detail={{
                formula:
                  "coverage % = SHA-enrolled HIV+ patients ÷ total HIV+ patients × 100 (per facility, then overall)",
                inputs: positiveVsShaData.map((f) => ({
                  label: `${f.name} · enrolled ÷ HIV+`,
                  value: `${f["SHA Enrolled"]} / ${f["HIV+ Patients"]}`,
                  source: "demo" as const,
                })),
                notes: [
                  "Illustrative — SHA enrollment is not reported on KHIS; figures are demo constants for the 6 supported facilities.",
                  "Facility coverage = SHA Enrolled ÷ HIV+ Patients × 100 (86% · 65% · 78% · 42% · 63% · 74%).",
                ],
              }}
            />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Share of HIV+ patients registered with SHA in the period.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={coverageDonut}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={105}
                paddingAngle={2}
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {coverageDonut.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-sm text-gray-600">
            <ShieldCheck className="inline w-4 h-4 text-emerald-600 mr-1" />
            SHA registration unlocks the UHC benefit package — ANC, skilled
            delivery &amp; postnatal care are covered for enrolled members.
          </p>
        </div>
      </div>

      {/* Why it matters */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-lg p-5 border border-teal-200 text-teal-900">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/70 border border-teal-200 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold">Why SHA enrollment matters</h3>
            <p className="text-sm mt-1 opacity-80">
              Enrolling HIV+ pregnant women and their dependents into SHA is the
              entry point to Universal Health Coverage: it removes financial
              barriers to antenatal care, skilled delivery, postnatal care and
              the PMTCT cascade. Household registration (
              <Home className="inline w-3.5 h-3.5" /> 18,450) extends coverage
              to dependents (
              <UserCheck className="inline w-3.5 h-3.5" /> 52,300), keeping
              mother–baby pairs in care across the continuum.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
