"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CheckCircle2, XCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Domain 4 — MPDSR, Clinical Quality & Accountability
// Indicator collection (per the dashboard review):
//   • Number of facilities reporting Maternal deaths
//   • Number of facilities reporting Neonatal deaths
//   • Number of Maternal Deaths reported
//   • Number of Neonatal Deaths reported
//   • % of supported facilities holding monthly MPDSR/QI review meetings
// Values are KHIS/MPDSR-illustrative until live data entry is wired in.
// ---------------------------------------------------------------------------

const FACILITIES = [
  "Embu County Referral Hospital",
  "Runyenjes Sub-County Hospital",
  "Meru Teaching & Referral Hospital",
  "Nkubu Health Centre",
  "Ol Kalou Sub-County Hospital",
  "Chuka County Referral Hospital",
];

// 4 of the 6 supported facilities hold a monthly MPDSR/QI review meeting.
const MEETING_FACILITIES = new Set([
  "Embu County Referral Hospital",
  "Meru Teaching & Referral Hospital",
  "Ol Kalou Sub-County Hospital",
  "Chuka County Referral Hospital",
]);

// Reported deaths by month (maternal + neonatal, Jan–Jun).
const reportedTrendData = [
  { month: "Jan", maternal: 8, neonatal: 10 },
  { month: "Feb", maternal: 7, neonatal: 9 },
  { month: "Mar", maternal: 8, neonatal: 9 },
  { month: "Apr", maternal: 7, neonatal: 10 },
  { month: "May", maternal: 6, neonatal: 10 },
  { month: "Jun", maternal: 6, neonatal: 10 },
];

// YTD totals
const maternalDeaths = reportedTrendData.reduce((a, d) => a + d.maternal, 0);
const neonatalDeaths = reportedTrendData.reduce((a, d) => a + d.neonatal, 0);
const totalReported = maternalDeaths + neonatalDeaths;
const facilitiesReportingMaternal = 6;
const facilitiesReportingNeonatal = 6;
const meetingFacilitiesCount = MEETING_FACILITIES.size;
const meetingPct = Math.round(
  (meetingFacilitiesCount / FACILITIES.length) * 100,
);

const maternalNeonatalData = [
  { type: "Maternal Deaths", reported: maternalDeaths },
  { type: "Neonatal Deaths", reported: neonatalDeaths },
];

export function MortalityTab() {
  return (
    <div className="space-y-6">
      {/* KPI Cards — Domain 4 indicator collection */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">
            Facilities Reporting Maternal Deaths
          </p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {facilitiesReportingMaternal}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            of {FACILITIES.length} supported facilities
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">
            Facilities Reporting Neonatal Deaths
          </p>
          <p className="text-3xl font-bold text-rose-600 mt-2">
            {facilitiesReportingNeonatal}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            of {FACILITIES.length} supported facilities
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">
            Maternal Deaths Reported
          </p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {maternalDeaths}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            YTD across supported facilities
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">
            Neonatal Deaths Reported
          </p>
          <p className="text-3xl font-bold text-rose-600 mt-2">
            {neonatalDeaths}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            YTD across supported facilities
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">
            Monthly MPDSR/QI Review Meetings
          </p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {meetingPct}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {meetingFacilitiesCount} of {FACILITIES.length} facilities
          </p>
        </div>
      </div>

      {/* Reported deaths overview */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Deaths Reported by Supported Facilities
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {totalReported} deaths reported YTD — {maternalDeaths} maternal,{" "}
          {neonatalDeaths} neonatal
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={maternalNeonatalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar
              dataKey="reported"
              fill="#ef4444"
              name="Deaths Reported"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly reported deaths trend */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Reported Deaths by Month (Maternal vs Neonatal)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={reportedTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="maternal"
              stroke="#ef4444"
              strokeWidth={2}
              name="Maternal Deaths"
            />
            <Line
              type="monotone"
              dataKey="neonatal"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Neonatal Deaths"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly MPDSR/QI review meetings per facility */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Facilities Holding Monthly MPDSR/QI Review Meetings
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {meetingFacilitiesCount} of {FACILITIES.length} supported facilities
          ({meetingPct}%) hold a monthly MPDSR/QI review meeting
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {FACILITIES.map((facility) => {
            const holdsMeetings = MEETING_FACILITIES.has(facility);
            return (
              <div
                key={facility}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                  holdsMeetings
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <span className="text-sm font-medium text-gray-800">
                  {facility}
                </span>
                <span
                  className={`flex items-center gap-1.5 text-xs font-semibold ${
                    holdsMeetings ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {holdsMeetings ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Monthly meeting held
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" /> No meeting this month
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
