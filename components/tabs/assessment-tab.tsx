"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Building2,
  Trash2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  MapPin,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { useAssessments } from "@/lib/use-assessments";
import { useGeoFilter } from "@/lib/geo-filter-context";
import { applyGeoFilter, geoScopeLabel } from "@/lib/geo";
import {
  assessmentScore,
  averageReadiness,
  deleteAssessment,
  FacilityAssessment,
  QUESTIONNAIRE_ITEMS,
  readinessLabel,
  readinessStatus,
} from "@/lib/assessment";

const STATUS_COLORS = {
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
};

const RESPONSE_LABEL: Record<string, string> = {
  yes: "Yes",
  partial: "Partial",
  no: "No",
  na: "N/A",
};

const RESPONSE_STYLE: Record<string, string> = {
  yes: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  no: "bg-red-100 text-red-700",
  na: "bg-slate-100 text-slate-500",
};

export function AssessmentTab() {
  const allAssessments = useAssessments();
  const { filter, resetFilter } = useGeoFilter();
  const assessments = useMemo(
    () => applyGeoFilter(allAssessments, filter),
    [allAssessments, filter],
  );

  const summary = useMemo(() => {
    const ready = assessments.filter(
      (a) => readinessStatus(assessmentScore(a).percentage) === "green",
    ).length;
    const partial = assessments.filter(
      (a) => readinessStatus(assessmentScore(a).percentage) === "amber",
    ).length;
    const notReady = assessments.filter(
      (a) => readinessStatus(assessmentScore(a).percentage) === "red",
    ).length;
    return { ready, partial, notReady };
  }, [assessments]);

  const chartData = useMemo(
    () =>
      assessments.map((a, idx) => ({
        name: a.facilityName || `Facility ${idx + 1}`,
        score: Math.round(assessmentScore(a).percentage),
      })),
    [assessments],
  );

  const statusData = useMemo(
    () => [
      { name: "Ready", value: summary.ready, fill: STATUS_COLORS.green },
      {
        name: "Partially Ready",
        value: summary.partial,
        fill: STATUS_COLORS.amber,
      },
      { name: "Not Ready", value: summary.notReady, fill: STATUS_COLORS.red },
    ],
    [summary],
  );

  const radarData = useMemo(() => {
    return QUESTIONNAIRE_ITEMS.map((item) => {
      const nonNa = assessments.filter((a) => {
        const v = a.items[item.id];
        return v && v.response !== "na";
      });
      const avg =
        nonNa.length > 0
          ? nonNa.reduce((acc, a) => {
              const r = a.items[item.id].response;
              return acc + (r === "yes" ? 100 : r === "partial" ? 50 : 0);
            }, 0) / nonNa.length
          : 0;
      return { name: item.id, label: item.shortLabel, value: Math.round(avg) };
    });
  }, [assessments]);

  if (assessments.length === 0) {
    const hasDataElsewhere = allAssessments.length > 0;
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900">
          {hasDataElsewhere
            ? "No Assessments in the Current Scope"
            : "No Facility Assessments Yet"}
        </h3>
        <p className="text-gray-600 mt-2 max-w-md mx-auto">
          {hasDataElsewhere ? (
            <>
              No entered assessments match the current scope filter. Widen the{" "}
              <span className="font-semibold text-emerald-600">Scope</span>{" "}
              dropdowns in the header or reset the filter to see all records.
            </>
          ) : (
            <>
              Use the{" "}
              <span className="font-semibold text-emerald-600">
                App Launcher (grid icon)
              </span>{" "}
              in the top right corner to open{" "}
              <span className="font-medium">Facility Assessment Entry</span>{" "}
              and complete the Domain 3 questionnaire for a facility. Results
              will appear here and on the Home dashboard automatically.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scope chip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium px-3 py-1.5 rounded-full">
          <MapPin className="w-3.5 h-3.5" />
          Scope: {geoScopeLabel(filter)} · {assessments.length} of{" "}
          {allAssessments.length} assessment
          {allAssessments.length === 1 ? "" : "s"}
        </div>
        {allAssessments.length !== assessments.length && (
          <button
            onClick={resetFilter}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            Reset scope filter
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">
            Facilities Assessed
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {assessments.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Domain 3 assessments</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">Average Readiness</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {averageReadiness(assessments).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Across all facilities</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">Ready (≥80%)</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {summary.ready}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            of {assessments.length} facilities
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">
            Not Ready (&lt;60%)
          </p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {summary.notReady}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {summary.partial} partially ready (60–79%)
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Facility Readiness Scores
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ left: 0, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(v) => [`${v}%`, "Readiness"]} />
              <Bar dataKey="score" name="Readiness %" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={
                      entry.score >= 80
                        ? STATUS_COLORS.green
                        : entry.score >= 60
                          ? STATUS_COLORS.amber
                          : STATUS_COLORS.red
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Readiness Status Distribution
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {statusData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
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

      {/* Radar: average item performance */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Average Domain 3 Performance by Item
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Average % of facilities fully compliant (answered Yes) per
          questionnaire item, N/A excluded
        </p>
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart data={radarData} outerRadius={110}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
            <Radar
              name="Compliance %"
              dataKey="value"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.55}
            />
            <Tooltip formatter={(v) => [`${v}%`, "Compliance"]} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Facility list */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Facility Assessment Records
        </h3>
        <div className="space-y-4">
          {assessments.map((assessment) => (
            <FacilityCard key={assessment.id} assessment={assessment} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FacilityCard({ assessment }: { assessment: FacilityAssessment }) {
  const [expanded, setExpanded] = useState(false);
  const score = assessmentScore(assessment);
  const status = readinessStatus(score.percentage);

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between p-5 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-11 h-11 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {assessment.facilityName}
            </p>
            <p className="text-sm text-gray-600">
              {assessment.facilityLevel} ·{" "}
              {assessment.county || "County not set"}
              {assessment.subCounty ? ` · ${assessment.subCounty}` : ""}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              MFL: {assessment.mflCode || "—"} · {assessment.date} ·{" "}
              {assessment.assessmentType.charAt(0).toUpperCase() +
                assessment.assessmentType.slice(1)}
              {assessment.assessorName
                ? ` · Assessor: ${assessment.assessorName}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {score.percentage.toFixed(0)}%
            </p>
            <StatusBadge
              status={status}
              label={readinessLabel(score.percentage)}
            />
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <button
            onClick={() => {
              if (
                confirm(`Delete assessment for ${assessment.facilityName}?`)
              ) {
                deleteAssessment(assessment.id);
              }
            }}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Delete assessment"
            title="Delete assessment"
          >
            <Trash2 className="w-5 h-5 text-red-400 hover:text-red-600" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 font-semibold text-gray-700">
                    Item
                  </th>
                  <th className="text-left py-2 pr-4 font-semibold text-gray-700">
                    Response
                  </th>
                  <th className="text-left py-2 pr-4 font-semibold text-gray-700">
                    Points
                  </th>
                  <th className="text-left py-2 pr-4 font-semibold text-gray-700">
                    Evidence
                  </th>
                  <th className="text-left py-2 font-semibold text-gray-700">
                    Gap / Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {QUESTIONNAIRE_ITEMS.map((item) => {
                  const value = assessment.items[item.id];
                  if (!value) return null;
                  const pts =
                    value.response === "yes"
                      ? 2
                      : value.response === "partial"
                        ? 1
                        : value.response === "no"
                          ? 0
                          : null;
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 align-top"
                    >
                      <td className="py-2 pr-4">
                        <span className="font-medium text-gray-900">
                          {item.id}
                        </span>
                        <p className="text-xs text-gray-500 max-w-xs">
                          {item.shortLabel}
                        </p>
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${RESPONSE_STYLE[value.response]}`}
                        >
                          {RESPONSE_LABEL[value.response]}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-700">
                        {pts === null ? "—" : `${pts}/2`}
                      </td>
                      <td className="py-2 pr-4 text-gray-700">
                        {value.evidenceChecked ? "Checked" : "Not checked"}
                      </td>
                      <td className="py-2 text-gray-600 max-w-xs truncate">
                        {value.gapAction || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Total:{" "}
            <span className="font-bold text-gray-900">
              {score.total}/{score.possible}
            </span>{" "}
            · Readiness:{" "}
            <span className="font-bold text-emerald-600">
              {score.percentage.toFixed(1)}%
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
