"use client";

import { useMemo, useState } from "react";
import { X, Save, Baby } from "lucide-react";
import {
  createEmptyHeiOutcome,
  HEI_OUTCOME_CATEGORIES,
  HeiOutcomeEntry,
  outcomePct,
  outcomeSum,
  saveHeiOutcome,
} from "@/lib/hei-outcome";
import { KENYA_COUNTIES } from "@/lib/assessment";
import { getSubCounties } from "@/lib/geo";

interface DialogProps {
  onClose: () => void;
}

function NumCell({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value.trim();
        onChange(v === "" ? null : Math.max(0, Number(v)));
      }}
      placeholder="0"
      className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
    />
  );
}

/**
 * HEI 18–24 outcome entry — mirrors the "HCA data collection Template
 * version January 2026" workbook: cohorts (12m / 24m), enrolled & net
 * cohort, outcomes at 12 months (PCR) and 18–24 months (AB), % outcome
 * rows and the validation check (Σ % ≈ 100% → Valid).
 */
export function HeiOutcomeDialog({ onClose }: DialogProps) {
  const [entry, setEntry] = useState<HeiOutcomeEntry>(createEmptyHeiOutcome());

  const update = (patch: Partial<HeiOutcomeEntry>) => {
    setEntry((prev) => ({ ...prev, ...patch }));
  };

  const window12 = useMemo(() => outcomeSum(entry, "12"), [entry]);
  const window24 = useMemo(() => outcomeSum(entry, "24"), [entry]);

  const pct12 = HEI_OUTCOME_CATEGORIES.map((cat) =>
    outcomePct(entry[`${cat.key}12`], entry.netCohort),
  );
  const pct24 = HEI_OUTCOME_CATEGORIES.map((cat) =>
    outcomePct(entry[`${cat.key}24`], entry.netCohort),
  );

  // Validation: Σ of the % outcomes ≈ 100% (template row 27 → "Valid").
  const sumPct12 = pct12
    .filter((v): v is number => v != null)
    .reduce((a, b) => a + b, 0);
  const sumPct24 = pct24
    .filter((v): v is number => v != null)
    .reduce((a, b) => a + b, 0);
  const valid12 = Math.abs(sumPct12 - 100) <= 0.5;
  const valid24 = Math.abs(sumPct24 - 100) <= 0.5;

  const handleSave = () => {
    if (!entry.facilityName.trim()) {
      alert("Please enter the facility name before saving.");
      return;
    }
    saveHeiOutcome({ ...entry, updatedAt: new Date().toISOString() });
    onClose();
  };

  const currentMonth = new Date().toISOString().slice(0, 7).replace("-", "");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Baby className="w-6 h-6 text-violet-600" />
              HEI 18–24 Outcome Entry
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              HCA data collection (template version January 2026) — cohort
              outcomes at 12 months (PCR) and 18–24 months (AB). Drives VTP bar
              7 (HEI final outcome 18–24 months = AB negative ÷ net cohort).
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
          {/* Facility Information */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Facility &amp; Cohort
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={entry.facilityName}
                  onChange={(e) => update({ facilityName: e.target.value })}
                  placeholder="e.g. Maua Methodist Hospital"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reporting Month (YYYYMM)
                </label>
                <input
                  type="text"
                  value={entry.pe}
                  onChange={(e) =>
                    update({
                      pe: e.target.value.replace(/\D/g, "").slice(0, 6),
                    })
                  }
                  placeholder={currentMonth}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  County
                </label>
                <select
                  value={entry.county}
                  onChange={(e) =>
                    update({ county: e.target.value, subCounty: "" })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                {getSubCounties(entry.county).length > 0 ? (
                  <select
                    value={entry.subCounty}
                    onChange={(e) => update({ subCounty: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">Select sub-county</option>
                    {getSubCounties(entry.county).map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={entry.subCounty}
                    onChange={(e) => update({ subCounty: e.target.value })}
                    placeholder="e.g. Nyambene"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cohort
                </label>
                <select
                  value={entry.cohort}
                  onChange={(e) =>
                    update({ cohort: e.target.value as "12m" | "24m" })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="12m">I year (12 Months) Cohort</option>
                  <option value="24m">2 years (24 Months) Cohort</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HEI Enrolled
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={entry.enrolled ?? ""}
                    onChange={(e) =>
                      update({
                        enrolled:
                          e.target.value.trim() === ""
                            ? null
                            : Math.max(0, Number(e.target.value)),
                      })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Net cohort
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={entry.netCohort ?? ""}
                    onChange={(e) =>
                      update({
                        netCohort:
                          e.target.value.trim() === ""
                            ? null
                            : Math.max(0, Number(e.target.value)),
                      })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Outcomes table — HCA template rows 11–27 */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Cohort Outcomes
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              12-month outcomes use the PCR test; 18–24 month outcomes use the
              AB test (HCA template). % outcome = outcome ÷ net cohort.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 pr-4 font-semibold text-gray-700 w-1/3">
                      Cohort
                    </th>
                    <th className="text-center py-2 font-semibold text-gray-700">
                      Number of HEI Enrolled in the cohort
                    </th>
                    <th className="text-center py-2 font-semibold text-gray-700">
                      Net cohort
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-gray-600 font-medium">
                      {entry.cohort === "12m"
                        ? "I year (12 Months) Cohort"
                        : "2 years (24 Months) Cohort"}
                    </td>
                    <td className="text-center py-2">
                      <span className="font-bold text-violet-700">
                        {entry.enrolled ?? "—"}
                      </span>
                    </td>
                    <td className="text-center py-2">
                      <span className="font-bold text-violet-700">
                        {entry.netCohort ?? "—"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200">
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">
                      Outcomes
                    </th>
                    <th className="text-center py-2.5 px-3 font-semibold text-violet-700">
                      At 12 Months (PCR)
                    </th>
                    <th className="text-center py-2.5 px-3 font-semibold text-violet-700">
                      % Outcome
                    </th>
                    <th className="text-center py-2.5 px-3 font-semibold text-fuchsia-700">
                      At 18–24 Months (AB)
                    </th>
                    <th className="text-center py-2.5 px-3 font-semibold text-fuchsia-700">
                      % Outcome
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {HEI_OUTCOME_CATEGORIES.map((cat, i) => (
                    <tr key={cat.key} className="border-b border-slate-100">
                      <td className="py-1.5 px-3 text-gray-700">{cat.label}</td>
                      <td className="py-1.5 px-3">
                        <NumCell
                          value={entry[`${cat.key}12`]}
                          onChange={(v) =>
                            update({
                              [`${cat.key}12`]: v,
                            } as Partial<HeiOutcomeEntry>)
                          }
                        />
                      </td>
                      <td className="py-1.5 px-3 text-center text-xs font-medium text-gray-600">
                        {pct12[i] != null ? `${pct12[i]}%` : "—"}
                      </td>
                      <td className="py-1.5 px-3">
                        <NumCell
                          value={entry[`${cat.key}24`]}
                          onChange={(v) =>
                            update({
                              [`${cat.key}24`]: v,
                            } as Partial<HeiOutcomeEntry>)
                          }
                        />
                      </td>
                      <td className="py-1.5 px-3 text-center text-xs font-medium text-gray-600">
                        {pct24[i] != null ? `${pct24[i]}%` : "—"}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-gray-800">
                      Total outcomes
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-violet-700">
                      {window12}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-violet-700">
                      {sumPct12.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-fuchsia-700">
                      {window24}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-fuchsia-700">
                      {sumPct24.toFixed(1)}%
                    </td>
                  </tr>
                  {/* Validation row — template row 27 */}
                  <tr>
                    <td className="py-2 px-3 font-semibold text-gray-800">
                      Validation (Σ % = 1)
                    </td>
                    <td className="py-2 px-3" />
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                          valid12
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {valid12 ? "✓ Valid" : "Check"}
                      </span>
                    </td>
                    <td className="py-2 px-3" />
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                          valid24
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {valid24 ? "✓ Valid" : "Check"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-gray-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700 transition-colors inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Outcome
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
