"use client";

import { useMemo, useState, type ReactNode } from "react";
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
  Activity,
  Building2,
  Package,
  Trash2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  MapPin,
  CircleCheck,
  CircleX,
  CircleMinus,
  ListChecks,
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

// ---------------------------------------------------------------------------
// Live checklist-compliance helpers — all charts below derive from the
// tick-lists entered in the Domain 3 assessment (data entry is the source).
// ---------------------------------------------------------------------------

const RADAR_SHORT: Record<string, string> = {
  "Parenteral antibiotics": "Antibiotics",
  "Parenteral uterotonics": "Uterotonics",
  "Parenteral anticonvulsants": "Anticonvulsants",
  "Manual removal of placenta": "Manual placenta",
  "Removal of retained products": "Retained products",
  "Assisted vaginal delivery": "Assisted delivery",
  "Neonatal resuscitation": "Neo resuscitation",
};

function itemScoped(
  assessments: FacilityAssessment[],
  itemId: string,
): FacilityAssessment[] {
  return assessments.filter((a) => {
    const v = a.items[itemId];
    return v && v.response !== "na";
  });
}

/** Average score (%) for one questionnaire item across in-scope facilities. */
function itemAvgScore(
  assessments: FacilityAssessment[],
  itemId: string,
): number {
  const scoped = itemScoped(assessments, itemId);
  if (scoped.length === 0) return 0;
  const sum = scoped.reduce((acc, a) => {
    const r = a.items[itemId].response;
    return acc + (r === "yes" ? 100 : r === "partial" ? 50 : 0);
  }, 0);
  return Math.round(sum / scoped.length);
}

/** Per-checklist-sub-item: % of in-scope facilities that ticked it. */
function itemComplianceRows(
  assessments: FacilityAssessment[],
  itemId: string,
): { label: string; pct: number; ticked: number; total: number }[] {
  const def = QUESTIONNAIRE_ITEMS.find((i) => i.id === itemId);
  if (!def?.checklist) return [];
  const scoped = itemScoped(assessments, itemId);
  return def.checklist.map((label) => {
    const ticked = scoped.filter((a) => {
      const v = a.items[itemId];
      const checked =
        v?.checked && v.checked.length > 0
          ? v.checked
          : v?.response === "yes"
            ? def.checklist!
            : [];
      return checked.includes(label);
    }).length;
    const pct = scoped.length ? Math.round((ticked / scoped.length) * 100) : 0;
    return { label, pct, ticked, total: scoped.length };
  });
}

function ItemKpi({
  title,
  pct,
  note,
}: {
  title: string;
  pct: number;
  note: string;
}) {
  const color =
    pct >= 80
      ? "text-emerald-600"
      : pct >= 60
        ? "text-amber-600"
        : "text-red-600";
  return (
    <div className="bg-white rounded-lg p-6 border border-slate-200">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{pct}%</p>
      <p className="text-xs text-gray-500 mt-1">{note}</p>
    </div>
  );
}

function ComplianceBarList({
  title,
  description,
  rows,
}: {
  title: string;
  description?: string;
  rows: { label: string; pct: number; ticked: number; total: number }[];
}) {
  return (
    <div className="bg-white rounded-lg p-6 border border-slate-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mb-4">{description}</p>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">
          No data for this item in the current scope yet.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((row, idx) => {
            const status =
              row.pct >= 80 ? "emerald" : row.pct >= 60 ? "amber" : "red";
            return (
              <div key={idx}>
                <div className="flex justify-between items-start mb-1.5 gap-2">
                  <p className="font-medium text-gray-900 text-sm">
                    {row.label}
                  </p>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      status === "emerald"
                        ? "bg-emerald-100 text-emerald-700"
                        : status === "amber"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {row.pct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      status === "emerald"
                        ? "bg-emerald-500"
                        : status === "amber"
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {row.ticked} of {row.total} facilities in scope
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-facility checklist detail — shows exactly which commodities, equipment
// and signal functions were TICKED during data entry for each facility.
// ---------------------------------------------------------------------------

function SectionBanner({
  icon,
  title,
  subtitle,
}: {
  icon?: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-5 border border-emerald-200 text-emerald-900">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-white/70 border border-emerald-200 flex items-center justify-center flex-shrink-0">
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

/** Per-facility checklist state for one questionnaire item. */
function facilityCheckedItems(
  assessment: FacilityAssessment,
  itemId: string,
): { ticked: string[]; all: string[]; response: string } | null {
  const def = QUESTIONNAIRE_ITEMS.find((i) => i.id === itemId);
  if (!def?.checklist) return null;
  const v = assessment.items[itemId];
  if (!v) return null;
  const checked =
    v.checked && v.checked.length > 0
      ? v.checked
      : v.response === "yes"
        ? def.checklist
        : [];
  return { ticked: checked, all: def.checklist, response: v.response };
}

/** Checklist chips for one item: green check = ticked, muted cross = not ticked. */
function ChecklistChips({
  assessment,
  itemId,
}: {
  assessment: FacilityAssessment;
  itemId: string;
}) {
  const info = facilityCheckedItems(assessment, itemId);
  if (!info) return null;
  if (info.response === "na") {
    return (
      <p className="text-xs text-gray-400 inline-flex items-center gap-1">
        <CircleMinus className="w-3.5 h-3.5" />
        Not applicable — no checklist required
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {info.all.map((label) => {
        const ticked = info.ticked.includes(label);
        return (
          <span
            key={label}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              ticked
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500 line-through decoration-slate-300"
            }`}
          >
            {ticked ? (
              <CircleCheck className="w-3 h-3" />
            ) : (
              <CircleX className="w-3 h-3" />
            )}
            {label}
          </span>
        );
      })}
    </div>
  );
}

/** Per-facility × per-category ticked/total matrix for the 8 readiness items. */
function FacilityCategoryMatrix({
  assessments,
}: {
  assessments: FacilityAssessment[];
}) {
  const items = QUESTIONNAIRE_ITEMS.filter((i) => i.checklist);
  return (
    <div className="bg-white rounded-lg p-6 border border-slate-200 overflow-x-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Category Coverage by Facility
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        For each facility and checklist category: number of items ticked during
        data entry (e.g. 4/5 = 4 of 5 commodity/equipment items present). Dash =
        marked N/A.
      </p>
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 pr-4 font-semibold text-gray-700">
              Facility
            </th>
            {items.map((item) => (
              <th
                key={item.id}
                className="text-center py-2 px-2 font-semibold text-gray-700 whitespace-nowrap"
                title={item.shortLabel}
              >
                {item.id}
                <p className="text-[10px] font-normal text-gray-400 max-w-[90px] mx-auto">
                  {item.shortLabel}
                </p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assessments.map((a) => (
            <tr key={a.id} className="border-b border-slate-100">
              <td className="py-2 pr-4 font-medium text-gray-900 whitespace-nowrap">
                {a.facilityName}
              </td>
              {items.map((item) => {
                const info = facilityCheckedItems(a, item.id);
                if (!info || info.response === "na") {
                  return (
                    <td
                      key={item.id}
                      className="text-center py-2 px-2 text-gray-300"
                    >
                      —
                    </td>
                  );
                }
                const ratio = info.ticked.length / info.all.length;
                const color =
                  ratio >= 0.9
                    ? "bg-emerald-100 text-emerald-700"
                    : ratio >= 0.5
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700";
                return (
                  <td key={item.id} className="text-center py-2 px-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${color}`}
                    >
                      {info.ticked.length}/{info.all.length}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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

  // EmONC Compliance (items 3.5–3.7) — computed live from tick-lists
  const emonc = useMemo(
    () => ({
      bemonc: itemComplianceRows(assessments, "3.5"),
      cemonc: itemComplianceRows(assessments, "3.6"),
      enc: itemComplianceRows(assessments, "3.7"),
      scores: {
        b: itemAvgScore(assessments, "3.5"),
        c: itemAvgScore(assessments, "3.6"),
        e: itemAvgScore(assessments, "3.7"),
      },
    }),
    [assessments],
  );

  const bemoncRadar = useMemo(
    () =>
      emonc.bemonc.map((r) => ({
        name: RADAR_SHORT[r.label] ?? r.label,
        value: r.pct,
      })),
    [emonc],
  );

  // Equipment & Commodities (items 3.1–3.4) — computed live from tick-lists
  const equipment = useMemo(
    () => ({
      commodities: itemComplianceRows(assessments, "3.1"),
      transfusion: itemComplianceRows(assessments, "3.2"),
      oxygen: itemComplianceRows(assessments, "3.3"),
      device: itemComplianceRows(assessments, "3.4"),
      scores: {
        c1: itemAvgScore(assessments, "3.1"),
        c2: itemAvgScore(assessments, "3.2"),
        c3: itemAvgScore(assessments, "3.3"),
        c4: itemAvgScore(assessments, "3.4"),
      },
    }),
    [assessments],
  );

  // Blood & blood product stockout prevention (item 3.8)
  const blood = useMemo(
    () => ({
      rows: itemComplianceRows(assessments, "3.8"),
      score: itemAvgScore(assessments, "3.8"),
    }),
    [assessments],
  );

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
              <span className="font-medium">Facility Assessment Entry</span> and
              complete the Domain 3 questionnaire for a facility. Results will
              appear here and on the Home dashboard automatically.
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

      {/* Intro banner */}
      <SectionBanner
        icon={<ListChecks className="w-5 h-5 text-emerald-600" />}
        title="Readiness Insights — Domain 3"
        subtitle="Scores are computed live from the Facility Assessment Entry questionnaire. The ticked checklists (which commodities, equipment and signal functions are actually present) are shown per facility in the category matrix below and in each facility record."
      />

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

      {/* ================= EmONC Compliance (3.5–3.7) ================= */}
      <section className="pt-4 border-t-2 border-emerald-100">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              EmONC Compliance
            </h3>
            <p className="text-sm text-gray-500">
              BEmONC (3.5) · CEmONC (3.6) · Essential Newborn Care (3.7) —
              computed live from the Domain 3 tick-lists
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <ItemKpi
            title="BEmONC Signal Functions (3.5)"
            pct={emonc.scores.b}
            note="Avg readiness across in-scope facilities"
          />
          <ItemKpi
            title="CEmONC Signal Functions (3.6)"
            pct={emonc.scores.c}
            note="Avg readiness across in-scope facilities"
          />
          <ItemKpi
            title="ENC Bundle (3.7)"
            pct={emonc.scores.e}
            note="Avg readiness across in-scope facilities"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              BEmONC Signal Functions
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              % of facilities that ticked each of the 7 signal functions
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={bemoncRadar} outerRadius={95}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                <Radar
                  name="Compliance %"
                  dataKey="value"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.55}
                />
                <Tooltip formatter={(v) => [`${v}%`, "Facilities"]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              CEmONC Signal Functions
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              % of facilities that ticked each of the 9 signal functions
            </p>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {emonc.cemonc.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {row.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {row.ticked} of {row.total} facilities
                    </p>
                  </div>
                  <StatusBadge
                    status={
                      row.pct >= 80 ? "green" : row.pct >= 60 ? "amber" : "red"
                    }
                    label={`${row.pct}%`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <ComplianceBarList
            title="Essential Newborn Care (ENC) Bundle Implementation"
            description="% of facilities that ticked each bundle component (3.7)"
            rows={emonc.enc}
          />
        </div>
      </section>

      {/* ============ Equipment & Commodities (3.1–3.4) ============ */}
      <section className="pt-4 border-t-2 border-emerald-100">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Equipment &amp; Commodities
            </h3>
            <p className="text-sm text-gray-500">
              Tracer commodities (3.1) · Blood transfusion (3.2) · Oxygen &amp;
              CPAP (3.3) · Equipment (3.4) — computed live from the Domain 3
              tick-lists
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <ItemKpi
            title="Tracer Commodities (3.1)"
            pct={equipment.scores.c1}
            note="Avg availability"
          />
          <ItemKpi
            title="Blood Transfusion (3.2)"
            pct={equipment.scores.c2}
            note="Avg readiness"
          />
          <ItemKpi
            title="Oxygen &amp; CPAP (3.3)"
            pct={equipment.scores.c3}
            note="Avg readiness"
          />
          <ItemKpi
            title="Equipment (3.4)"
            pct={equipment.scores.c4}
            note="Avg functionality"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <ComplianceBarList
            title="MNH Tracer Commodities"
            description="% of facilities with each commodity available on assessment day (3.1)"
            rows={equipment.commodities}
          />
          <ComplianceBarList
            title="Blood Transfusion Services"
            description="% of facilities meeting each transfusion requirement (3.2)"
            rows={equipment.transfusion}
          />
          <ComplianceBarList
            title="Oxygen &amp; Neonatal CPAP Readiness"
            description="% of facilities meeting each oxygen/CPAP requirement (3.3)"
            rows={equipment.oxygen}
          />
          <ComplianceBarList
            title="Equipment Functionality &amp; Active Use"
            description="% of facilities meeting each equipment requirement (3.4)"
            rows={equipment.device}
          />
        </div>
      </section>

      {/* ============ Blood Stockout Prevention (3.8) ============ */}
      <section className="pt-4 border-t-2 border-emerald-100">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Blood &amp; Blood Product Stockout Prevention
            </h3>
            <p className="text-sm text-gray-500">
              Item 3.8 — zero stockout of blood/blood products and documented
              monitoring, replenishment, referral &amp; escalation mechanisms
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <ItemKpi
            title="Blood Stockout Prevention (3.8)"
            pct={blood.score}
            note="Avg readiness across in-scope facilities"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <ComplianceBarList
            title="Blood Stockout Prevention Measures"
            description="% of facilities meeting each requirement (3.8)"
            rows={blood.rows}
          />
        </div>
      </section>

      {/* ============ Per-facility category matrix ============ */}
      <FacilityCategoryMatrix assessments={assessments} />

      {/* Facility list */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Facility Assessment Records
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Expand a facility to see its overall readiness plus the exact
          commodities, equipment and signal functions ticked during data entry.
        </p>
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

          {/* Ticked checklist detail per item */}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="font-semibold text-gray-900 text-sm mb-3 inline-flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-emerald-600" />
              Ticked Checklist Items (as entered)
            </p>
            <div className="space-y-3">
              {QUESTIONNAIRE_ITEMS.filter((item) => item.checklist).map(
                (item) => {
                  const info = facilityCheckedItems(assessment, item.id);
                  if (!info) return null;
                  return (
                    <div key={item.id}>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <p className="text-xs font-semibold text-gray-700">
                          {item.id} · {item.shortLabel}
                        </p>
                        {info.response !== "na" && (
                          <span className="text-[11px] text-gray-500 whitespace-nowrap">
                            {info.ticked.length} of {info.all.length} ticked
                          </span>
                        )}
                      </div>
                      <ChecklistChips
                        assessment={assessment}
                        itemId={item.id}
                      />
                    </div>
                  );
                },
              )}
            </div>
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
