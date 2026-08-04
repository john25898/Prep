"use client";

import { useMemo, useState } from "react";
import { X, Save, ClipboardList } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import {
  assessmentScore,
  createEmptyAssessment,
  FACILITY_LEVELS,
  FacilityAssessment,
  KENYA_COUNTIES,
  QUESTIONNAIRE_ITEMS,
  readinessLabel,
  readinessStatus,
  RESPONSE_OPTIONS,
  saveAssessment,
} from "@/lib/assessment";
import { getSubCounties } from "@/lib/geo";

interface DialogProps {
  onClose: () => void;
}

export function AssessmentDialog({ onClose }: DialogProps) {
  const [assessment, setAssessment] = useState<FacilityAssessment>(
    createEmptyAssessment(),
  );

  const score = useMemo(() => assessmentScore(assessment), [assessment]);
  const status = readinessStatus(score.percentage);

  const answeredCount = QUESTIONNAIRE_ITEMS.filter(
    (item) =>
      assessment.items[item.id] && assessment.items[item.id].response !== "na",
  ).length;

  const updateMeta = (patch: Partial<FacilityAssessment>) => {
    setAssessment((prev) => ({ ...prev, ...patch }));
  };

  const updateItem = (
    id: string,
    patch: Partial<FacilityAssessment["items"][string]>,
  ) => {
    setAssessment((prev) => ({
      ...prev,
      items: { ...prev.items, [id]: { ...prev.items[id], ...patch } },
    }));
  };

  const handleSave = () => {
    if (!assessment.facilityName.trim()) {
      alert("Please enter the facility name before saving.");
      return;
    }
    saveAssessment(assessment);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-emerald-600" />
              Facility Assessment Entry
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Domain 3: Facility Readiness &amp; Safe Systems — Baseline /
              Quarterly / Follow-up
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Live Summary */}
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg p-6 border border-emerald-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-semibold text-emerald-900">
                  Assessment Progress
                </h3>
                <p className="text-emerald-700 mt-1">
                  {answeredCount} of {QUESTIONNAIRE_ITEMS.length} items scored ·{" "}
                  {score.naCount} marked N/A (excluded)
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-emerald-600">
                  {score.percentage.toFixed(0)}%
                </p>
                <StatusBadge
                  status={status}
                  label={readinessLabel(score.percentage)}
                />
              </div>
            </div>
            <div className="mt-3 w-full h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  status === "green"
                    ? "bg-emerald-500"
                    : status === "amber"
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${score.percentage}%` }}
              />
            </div>
            <p className="text-xs text-emerald-700 mt-2">
              Scoring: Yes = 2 pts · Partial = 1 pt · No = 0 pts · N/A excluded.
              Ready ≥ 80%, Partially ready 60–79%, Not ready &lt; 60%.
            </p>
          </div>

          {/* Facility Information */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Facility Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={assessment.facilityName}
                  onChange={(e) => updateMeta({ facilityName: e.target.value })}
                  placeholder="e.g. Central Medical Center"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MFL Code
                </label>
                <input
                  type="text"
                  value={assessment.mflCode}
                  onChange={(e) => updateMeta({ mflCode: e.target.value })}
                  placeholder="e.g. 12345"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility Level
                </label>
                <select
                  value={assessment.facilityLevel}
                  onChange={(e) =>
                    updateMeta({ facilityLevel: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {FACILITY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  County
                </label>
                <select
                  value={assessment.county}
                  onChange={(e) => updateMeta({ county: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Select county</option>
                  {KENYA_COUNTIES.map((county) => (
                    <option key={county} value={county}>
                      {county}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sub-county
                </label>
                {getSubCounties(assessment.county).length > 0 ? (
                  <select
                    value={assessment.subCounty}
                    onChange={(e) => updateMeta({ subCounty: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Select sub-county</option>
                    {getSubCounties(assessment.county).map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={assessment.subCounty}
                    onChange={(e) => updateMeta({ subCounty: e.target.value })}
                    placeholder="e.g. Njoro"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assessment Date
                </label>
                <input
                  type="date"
                  value={assessment.date}
                  onChange={(e) => updateMeta({ date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assessment Type
                </label>
                <select
                  value={assessment.assessmentType}
                  onChange={(e) =>
                    updateMeta({
                      assessmentType: e.target
                        .value as FacilityAssessment["assessmentType"],
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="baseline">Baseline</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="follow-up">Follow-up</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assessor Name
                </label>
                <input
                  type="text"
                  value={assessment.assessorName}
                  onChange={(e) => updateMeta({ assessorName: e.target.value })}
                  placeholder="e.g. Dr. Jane Wanjiru"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Assessment Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Domain 3 Questionnaire (Items 3.1 – 3.8)
            </h3>
            <div className="space-y-6">
              {QUESTIONNAIRE_ITEMS.map((item, idx) => {
                const value = assessment.items[item.id];
                const active = value?.response ?? "na";
                const checklistItems = item.checklist ?? [];
                const hasChecklist = checklistItems.length > 0;
                const checkedList = value?.checked ?? [];
                const isNa = active === "na";
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg p-6 border border-slate-200 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                          Item {item.id} · {item.shortLabel}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Question {idx + 1} of 8
                        </p>
                        <p className="text-base font-semibold text-gray-900 mt-2">
                          {item.question}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 whitespace-nowrap">
                        {isNa ? "Not answered" : "Answered"}
                      </span>
                    </div>

                    {hasChecklist ? (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">
                          Tick what the facility has / meets{" "}
                          <span className="text-xs font-normal text-gray-500">
                            (leave unticked what it does not)
                          </span>
                        </p>
                        <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                          {checklistItems.map((ci) => {
                            const isChecked = checkedList.includes(ci);
                            return (
                              <label
                                key={ci}
                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                  isChecked
                                    ? "bg-emerald-50"
                                    : "bg-white hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const next = isChecked
                                      ? checkedList.filter((c) => c !== ci)
                                      : [...checkedList, ci];
                                    const derived =
                                      next.length === 0
                                        ? "no"
                                        : next.length === checklistItems.length
                                          ? "yes"
                                          : "partial";
                                    updateItem(item.id, {
                                      checked: next,
                                      response: derived,
                                    });
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span
                                  className={`text-sm font-medium ${
                                    isChecked
                                      ? "text-emerald-800"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {ci}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-600">
                          {isNa
                            ? "Tick any item to mark this question as answered."
                            : checkedList.length === 0
                              ? "None ticked → No (0 pts)"
                              : checkedList.length === checklistItems.length
                                ? `All ${checklistItems.length} items ticked → Yes (2 pts)`
                                : `${checkedList.length} of ${checklistItems.length} ticked → Partial (1 pt)`}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item.id, { response: "na" })
                            }
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors border-2 ${
                              isNa
                                ? "bg-slate-500 text-white border-slate-600"
                                : "bg-slate-100 text-gray-700 border-slate-300 hover:bg-slate-200"
                            }`}
                          >
                            N/A — not applicable (excluded)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {RESPONSE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              updateItem(item.id, { response: option.value })
                            }
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors border-2 ${
                              active === option.value
                                ? option.value === "yes"
                                  ? "bg-emerald-500 text-white border-emerald-600"
                                  : option.value === "partial"
                                    ? "bg-amber-500 text-white border-amber-600"
                                    : option.value === "no"
                                      ? "bg-red-500 text-white border-red-600"
                                      : "bg-slate-500 text-white border-slate-600"
                                : "bg-slate-100 text-gray-700 border-slate-300 hover:bg-slate-200"
                            }`}
                          >
                            {option.label}
                            {option.points !== null
                              ? ` (${option.points} pts)`
                              : " (excluded)"}
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-gray-600">
                        Evidence source:
                      </span>{" "}
                      {item.evidenceSources}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-100">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={value?.evidenceChecked ?? false}
                          onChange={(e) =>
                            updateItem(item.id, {
                              evidenceChecked: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        Evidence checked
                      </label>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={value?.gapAction ?? ""}
                          onChange={(e) =>
                            updateItem(item.id, { gapAction: e.target.value })
                          }
                          placeholder="Gap or action required (optional)"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 rounded-lg p-6 border border-slate-200">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Score</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {score.total}/{score.possible}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Readiness Score
              </p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">
                {score.percentage.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">N/A Excluded</p>
              <p className="text-3xl font-bold text-slate-500 mt-1">
                {score.naCount}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <div className="mt-2">
                <StatusBadge
                  status={status}
                  label={readinessLabel(score.percentage)}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 rounded-lg text-gray-900 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
