"use client";

import { useMemo, useState } from "react";
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
import { CheckCircle2, XCircle, Sparkles, Save } from "lucide-react";
import { useGeoFilter } from "@/lib/geo-filter-context";
import { useKhis } from "@/lib/use-khis";
import { PARTNER_FACILITIES } from "@/lib/partners";
import { AIAssistant, type ChartInsight } from "@/components/ai-assistant";
import { ViewDataButton } from "@/components/view-data";

// ---------------------------------------------------------------------------
// Domain 4 — MPDSR, Clinical Quality & Accountability
// Indicator collection (per the dashboard review):
//   • Number of facilities reporting Maternal deaths      → LIVE KHIS (DTH001)
//   • Number of facilities reporting Neonatal deaths      → LIVE KHIS (MOH 711)
//   • Number of Maternal Deaths reported                  → LIVE KHIS
//   • Number of Neonatal Deaths reported                  → LIVE KHIS
//   • % of supported facilities holding monthly MPDSR/QI review meetings
//     → program registers (NO KHIS org-unit source — stays illustrative and
//       is labelled "registry" so it is never mistaken for KHIS data).
// ---------------------------------------------------------------------------

// Supported facilities (program list, used by the MPDSR meeting register —
// illustrative, NOT from KHIS).
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

// DEMO fallback — used only when live KHIS is unreachable.
const DEMO_SUMMARY = {
  maternal: 42,
  maternalAudited: 42,
  neonatal: 58,
  neonatalAudited: 46,
  stillbirths: 89,
  facilitiesReportingMaternal: 6,
  facilitiesReportingNeonatal: 6,
};

const meetingFacilitiesCount = MEETING_FACILITIES.size;
const meetingPct = Math.round(
  (meetingFacilitiesCount / FACILITIES.length) * 100,
);

function shortMonth(pe: string): string {
  const m = parseInt(pe.slice(4, 6), 10);
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return names[m - 1] ?? pe;
}

function Kpi({
  title,
  value,
  sub,
  accent = "text-red-600",
}: {
  title: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-lg p-6 border border-slate-200">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${accent}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

export function MortalityTab({
  onSaveToPlayground,
}: {
  onSaveToPlayground?: (chart: ChartInsight) => void;
}) {
  const { filter, pe, peLabel, periodFuture } = useGeoFilter();
  const partner = filter.partner || "jamii-tekelezi";
  const [activeChart, setActiveChart] = useState<ChartInsight | null>(null);

  const addChartToPlayground = (chart: ChartInsight) => {
    onSaveToPlayground?.(chart);
  };

  // The Facility filter stores the facility NAME; resolve it to the KHIS
  // org-unit UID so analytics are scoped to that single facility.
  const facilityUid = useMemo(() => {
    if (!filter.facility) return undefined;
    const fac = PARTNER_FACILITIES[partner]?.find(
      (f) => f.name === filter.facility,
    );
    return fac?.uid;
  }, [filter.facility, partner]);
  const countyScope = filter.county || undefined;
  const subCountyScope = filter.subCounty || undefined;

  // Current-period deaths (KPIs + overview bar chart) + reporting counts.
  const { data, loading, error, value } = useKhis({
    partner,
    pe,
    county: countyScope,
    subCounty: subCountyScope,
    facility: facilityUid,
    indicators: [
      "maternal_deaths_reported",
      "maternal_deaths_audited",
      "neonatal_deaths",
      "neonatal_deaths_audited",
      "stillbirths",
    ],
    reporting: true,
  });

  // Monthly trend — when a multi-month range is selected, follow the range
  // (one bar per month); otherwise show the last 12 months.
  const trendPe = useMemo(
    () => (pe.includes(";") ? pe : "LAST_12_MONTHS"),
    [pe],
  );
  const trend = useKhis({
    partner,
    pe: trendPe,
    county: countyScope,
    subCounty: subCountyScope,
    facility: facilityUid,
    indicators: ["maternal_deaths_reported", "neonatal_deaths"],
    byPeriod: true,
  });

  const liveVals = useMemo(() => {
    if (!data) return null;
    return {
      maternal: value("maternal_deaths_reported"),
      maternalAudited: value("maternal_deaths_audited"),
      neonatal: value("neonatal_deaths"),
      neonatalAudited: value("neonatal_deaths_audited"),
      stillbirths: value("stillbirths"),
    };
  }, [data, value]);

  const liveCount = useMemo(
    () =>
      liveVals
        ? Object.values(liveVals).filter((x): x is number => x != null).length
        : 0,
    [liveVals],
  );
  const isLive = liveCount > 0;

  // KHIS answered for this period/scope at all — never show demo numbers when
  // we have a real KHIS response; indicators KHIS didn't report become 0.
  const khisAnswered = !!data && !error && !loading;

  // KHIS answered but reported ZERO values for this period/scope — never show
  // demo numbers in that case (e.g. a future month looks like "data").
  const noPeriodData = !isLive && khisAnswered;
  const noDataSub = `no KHIS data for ${peLabel} in this scope`;

  // Facilities reporting — from the reporting=1 facet (facilities with a
  // non-null value for each indicator this period).
  const facilitiesReportingMaternal =
    data?.reporting?.find((r) => r.id === "maternal_deaths_reported")
      ?.facilities ?? null;
  const facilitiesReportingNeonatal =
    data?.reporting?.find((r) => r.id === "neonatal_deaths")?.facilities ??
    null;

  const p = useMemo(
    () => ({
      maternal:
        liveVals?.maternal ?? (khisAnswered ? 0 : DEMO_SUMMARY.maternal),
      maternalAudited:
        liveVals?.maternalAudited ??
        (khisAnswered ? 0 : DEMO_SUMMARY.maternalAudited),
      neonatal:
        liveVals?.neonatal ?? (khisAnswered ? 0 : DEMO_SUMMARY.neonatal),
      neonatalAudited:
        liveVals?.neonatalAudited ??
        (khisAnswered ? 0 : DEMO_SUMMARY.neonatalAudited),
      stillbirths:
        liveVals?.stillbirths ?? (khisAnswered ? 0 : DEMO_SUMMARY.stillbirths),
    }),
    [liveVals, khisAnswered],
  );

  // Current-period overview bars: maternal vs neonatal (live when available).
  const maternalNeonatalData = useMemo(
    () => [
      { type: "Maternal Deaths", reported: p.maternal },
      { type: "Neonatal Deaths", reported: p.neonatal },
    ],
    [p.maternal, p.neonatal],
  );

  const totalReported = p.maternal + p.neonatal;

  // Monthly trend rows from the LAST_12_MONTHS series (empty when KHIS has
  // nothing for this period/scope — never fall back to demo months here).
  const reportedTrendData = useMemo(() => {
    const m =
      trend.data?.periods?.find((x) => x.id === "maternal_deaths_reported")
        ?.series ?? [];
    const n =
      trend.data?.periods?.find((x) => x.id === "neonatal_deaths")?.series ??
      [];
    if (m.length === 0 && n.length === 0) return [];
    const periods = new Set<string>();
    for (const s of [...m, ...n]) periods.add(s.pe);
    return [...periods]
      .sort((a, b) => a.localeCompare(b))
      .map((pe) => ({
        month: shortMonth(pe),
        maternal: m.find((s) => s.pe === pe)?.value ?? 0,
        neonatal: n.find((s) => s.pe === pe)?.value ?? 0,
      }));
  }, [trend.data]);

  // True when KHIS returned no monthly series for the trend query — the
  // chart must then show an honest no-data state instead of demo months.
  const trendSeriesEmpty =
    (trend.data?.periods?.find((x) => x.id === "maternal_deaths_reported")
      ?.series?.length ?? 0) === 0 &&
    (trend.data?.periods?.find((x) => x.id === "neonatal_deaths")?.series
      ?.length ?? 0) === 0;

  // Audit completeness (both values must be live for the ratio to be shown).
  // Clamp at 100 — KHIS audit tallies occasionally exceed the deaths reported
  // in the same period (e.g. Nakuru 67 audited vs 65 deaths), which would
  // otherwise render as an impossible >100% "completeness".
  const maternalAuditedPct =
    liveVals?.maternal != null && liveVals?.maternalAudited != null
      ? Math.min(100, Math.round((p.maternalAudited / p.maternal) * 100))
      : null;
  const neonatalAuditedPct =
    liveVals?.neonatal != null && liveVals?.neonatalAudited != null
      ? Math.min(100, Math.round((p.neonatalAudited / p.neonatal) * 100))
      : null;

  const sourceBadge = loading ? (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
      Loading KHIS…
    </span>
  ) : isLive && data ? (
    <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">
      Live · national KHIS · {data.scope} · {data.peLabel}
      {liveCount < 5 && (
        <span className="font-medium opacity-80">
          {" "}
          · {liveCount}/5 indicators reported this period
        </span>
      )}
    </span>
  ) : error ? (
    <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold">
      KHIS error: {error}
    </span>
  ) : noPeriodData && periodFuture ? (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
      No KHIS data yet for {peLabel} — period is in the future (showing zeros)
    </span>
  ) : noPeriodData ? (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
      No KHIS data for {peLabel} in this scope — showing zeros
    </span>
  ) : (
    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">
      Demo data — no KHIS values for this partner/period
    </span>
  );

  return (
    <div className="space-y-6">
      <AIAssistant
        chartContext={activeChart}
        onSaveToPlayground={addChartToPlayground}
      />

      {
        <>
          {/* KPI Cards — Domain 4 indicator collection */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Kpi
              title="Facilities Reporting Maternal Deaths"
              value={
                facilitiesReportingMaternal != null
                  ? String(facilitiesReportingMaternal)
                  : khisAnswered
                    ? "0"
                    : String(DEMO_SUMMARY.facilitiesReportingMaternal)
              }
              sub={
                noPeriodData
                  ? noDataSub
                  : facilitiesReportingMaternal != null
                    ? `of ${data?.ouCount ?? 0} org units scoped — KHIS this period`
                    : khisAnswered
                      ? "not reported on KHIS this period"
                      : "of 6 supported facilities (demo)"
              }
              accent="text-red-600"
            />
            <Kpi
              title="Facilities Reporting Neonatal Deaths"
              value={
                facilitiesReportingNeonatal != null
                  ? String(facilitiesReportingNeonatal)
                  : khisAnswered
                    ? "0"
                    : String(DEMO_SUMMARY.facilitiesReportingNeonatal)
              }
              sub={
                noPeriodData
                  ? noDataSub
                  : facilitiesReportingNeonatal != null
                    ? `of ${data?.ouCount ?? 0} org units scoped — KHIS this period`
                    : khisAnswered
                      ? "not reported on KHIS this period"
                      : "of 6 supported facilities (demo)"
              }
              accent="text-rose-600"
            />
            <Kpi
              title="Maternal Deaths Reported"
              value={p.maternal.toLocaleString()}
              sub={
                noPeriodData
                  ? noDataSub
                  : liveVals?.maternal == null
                    ? khisAnswered
                      ? "not reported on KHIS this period"
                      : "demo estimate"
                    : maternalAuditedPct != null
                      ? `${maternalAuditedPct}% audited (${p.maternalAudited.toLocaleString()})`
                      : liveVals?.maternalAudited != null
                        ? `${p.maternalAudited.toLocaleString()} audited`
                        : "reported this period"
              }
              accent="text-red-600"
            />
            <Kpi
              title="Neonatal Deaths Reported"
              value={p.neonatal.toLocaleString()}
              sub={
                noPeriodData
                  ? noDataSub
                  : liveVals?.neonatal == null
                    ? khisAnswered
                      ? "not reported on KHIS this period"
                      : "demo estimate"
                    : neonatalAuditedPct != null
                      ? `${neonatalAuditedPct}% audited (${p.neonatalAudited.toLocaleString()})`
                      : liveVals?.neonatalAudited != null
                        ? `${p.neonatalAudited.toLocaleString()} audited`
                        : "reported this period"
              }
              accent="text-rose-600"
            />
            <Kpi
              title="Monthly MPDSR/QI Review Meetings"
              value={`${meetingPct}%`}
              sub={`${meetingFacilitiesCount} of ${FACILITIES.length} facilities — registry`}
              accent="text-emerald-600"
            />
          </div>

          {/* Reported deaths overview */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">
                Deaths Reported by Supported Facilities
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveChart({
                      id: "mortality-facility-overview",
                      title: "Deaths Reported by Supported Facilities",
                      summary:
                        "This chart compares the total maternal and neonatal deaths reported through the supported facilities.",
                      prompt:
                        "Summarize the mortality burden and flag the main concern in the death profile.",
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
                      id: "mortality-facility-overview",
                      title: "Deaths Reported by Supported Facilities",
                      summary:
                        "This chart compares the total maternal and neonatal deaths reported through the supported facilities.",
                      prompt:
                        "Summarize the mortality burden and flag the main concern in the death profile.",
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
                <ViewDataButton
                  title="Deaths Reported by Supported Facilities"
                  data={maternalNeonatalData}
                  note={`${isLive ? `Live · KHIS · ${data?.scope} · ${data?.peLabel}` : noPeriodData ? "no KHIS data — zeros" : "demo"} · reported this period`}
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {totalReported.toLocaleString()} deaths reported this period —{" "}
              {p.maternal.toLocaleString()} maternal,{" "}
              {p.neonatal.toLocaleString()} neonatal
              {liveVals?.stillbirths != null && (
                <> · {p.stillbirths.toLocaleString()} stillbirths</>
              )}
              {isLive
                ? " (live KHIS)"
                : noPeriodData
                  ? " (no KHIS data — zeros)"
                  : " (demo)"}
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
        </>
      }

      {/* Monthly reported deaths trend */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Reported Deaths by Month (Maternal vs Neonatal)
          </h3>
          <div className="flex items-center gap-2">
            {trend.loading ? (
              <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
                Loading trend…
              </span>
            ) : trendSeriesEmpty ? (
              <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
                No KHIS monthly data for {trend.data?.peLabel ?? trendPe} in
                this scope
              </span>
            ) : (
              <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">
                Live · KHIS · {trend.data?.peLabel ?? trendPe}
              </span>
            )}
            <button
              type="button"
              onClick={() =>
                setActiveChart({
                  id: "mortality-monthly-trend",
                  title: "Reported Deaths by Month (Maternal vs Neonatal)",
                  summary:
                    "This chart shows the month-on-month trend for maternal and neonatal mortality in supported facilities.",
                  prompt:
                    "Interpret the intra-year trend and highlight whether mortality is improving, worsening, or stable.",
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
                  id: "mortality-monthly-trend",
                  title: "Reported Deaths by Month (Maternal vs Neonatal)",
                  summary:
                    "This chart shows the month-on-month trend for maternal and neonatal mortality in supported facilities.",
                  prompt:
                    "Interpret the intra-year trend and highlight whether mortality is improving, worsening, or stable.",
                })
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
            >
              <Save className="h-3.5 w-3.5" /> Save
            </button>
            <ViewDataButton
              title="Reported Deaths by Month (Maternal vs Neonatal)"
              data={reportedTrendData}
              note={
                trendSeriesEmpty
                  ? "No KHIS monthly deaths reported for this period/scope"
                  : `Live · KHIS · ${trend.data?.peLabel ?? trendPe} · ${data?.scope} · deaths reported per month`
              }
            />
          </div>
        </div>
        {trendSeriesEmpty ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm font-semibold text-gray-500">
              No monthly deaths reported on KHIS for this period/scope
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Pick a period with reported data to see the maternal vs neonatal
              monthly trend.
            </p>
          </div>
        ) : (
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
        )}
      </div>

      {/* Monthly MPDSR/QI review meetings per facility */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Facilities Holding Monthly MPDSR/QI Review Meetings
          </h3>
          <ViewDataButton
            title="Monthly MPDSR/QI Review Meetings"
            data={FACILITIES.map((f) => ({
              facility: f,
              holdsMonthlyMeeting: MEETING_FACILITIES.has(f),
            }))}
            note="program registers — illustrative, not on KHIS"
          />
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {meetingFacilitiesCount} of {FACILITIES.length} supported facilities (
          {meetingPct}%) hold a monthly MPDSR/QI review meeting
          <span className="ml-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
            program registers — not available on KHIS
          </span>
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
