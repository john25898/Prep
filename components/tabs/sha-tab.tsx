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
import {
  HeartHandshake,
  Home,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

// ---------------------------------------------------------------------------
// SHA — Social Health Authority (Universal Health Coverage) enrollment
// Registration of pregnant women (PBFW), households and dependents into the
// SHA scheme across the supported facilities.
// Values are KHIS/SHA-illustrative until live data entry is wired in.
// ---------------------------------------------------------------------------

const TOTAL_ANC_CLIENTS = 8220;
const TOTAL_ENROLLED = 6470; // ~79% of ANC clients
const ENROLLMENT_PCT = Math.round((TOTAL_ENROLLED / TOTAL_ANC_CLIENTS) * 100);

const shaTrendData = [
  { month: "Jan", enrolled: 860 },
  { month: "Feb", enrolled: 990 },
  { month: "Mar", enrolled: 1030 },
  { month: "Apr", enrolled: 1130 },
  { month: "May", enrolled: 1190 },
  { month: "Jun", enrolled: 1270 },
];

// 1st ANC clients vs SHA-enrolled, per facility (sums match the totals above).
const ancVsShaData = [
  { name: "Embu CRH", "ANC Clients": 1450, "SHA Enrolled": 1189 },
  { name: "Runyenjes", "ANC Clients": 1120, "SHA Enrolled": 851 },
  { name: "Meru TRH", "ANC Clients": 1680, "SHA Enrolled": 1411 },
  { name: "Nkubu HC", "ANC Clients": 980, "SHA Enrolled": 696 },
  { name: "Ol Kalou SCH", "ANC Clients": 1150, "SHA Enrolled": 851 },
  { name: "Chuka CRH", "ANC Clients": 1840, "SHA Enrolled": 1472 },
];

const coverageByFacility = [
  { name: "Embu CRH", coverage: 82 },
  { name: "Runyenjes", coverage: 76 },
  { name: "Meru TRH", coverage: 84 },
  { name: "Nkubu HC", coverage: 71 },
  { name: "Ol Kalou SCH", coverage: 74 },
  { name: "Chuka CRH", coverage: 80 },
];

const coverageDonut = [
  { name: "Enrolled", value: ENROLLMENT_PCT, fill: "#0d9488" },
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

export function ShaTab() {
  return (
    <div className="space-y-6">
      <SectionBanner
        icon={<HeartHandshake className="w-5 h-5 text-blue-600" />}
        title="SHA Enrollment — Universal Health Coverage"
        subtitle="Registration of pregnant women (PBFW), households and dependents into the Social Health Authority scheme within the supported facilities. Values are KHIS/SHA-illustrative until live data entry is wired in."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          title="ANC Clients Enrolled in SHA"
          value={TOTAL_ENROLLED.toLocaleString()}
          sub={`of ${TOTAL_ANC_CLIENTS.toLocaleString()} 1st ANC clients`}
          accent="text-blue-600"
        />
        <Kpi
          title="SHA Enrollment Rate"
          value={`${ENROLLMENT_PCT}%`}
          sub="of ANC clients registered with SHA"
          accent="text-emerald-600"
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

      {/* ANC vs SHA + Enrollment trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-slate-200 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            1st ANC Clients vs SHA-Enrolled (by Facility)
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Total 1st ANC clients vs clients enrolled in SHA in the period.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ancVsShaData} margin={{ left: 0, right: 12 }}>
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
              <Bar dataKey="ANC Clients" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="SHA Enrolled"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 border border-slate-200 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            SHA Enrollment Trend (Jan – Jun)
          </h3>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            SHA Coverage by Facility
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            % of ANC clients enrolled per facility — emerald ≥ 80%, amber below
            target.
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
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.coverage >= 80 ? "#10b981" : "#f59e0b"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 border border-slate-200 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Overall Enrollment Coverage
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Share of 1st ANC clients registered with SHA in the period.
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
              Enrolling pregnant women and their dependents into SHA is the
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
