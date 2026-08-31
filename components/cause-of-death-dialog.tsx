"use client";

import { useMemo, useState } from "react";
import { X, Save, HeartPulse } from "lucide-react";
import {
  createEmptyCodEntry,
  DEATH_CAUSES,
  DeathCause,
  saveCodEntry,
  CauseOfDeathEntry,
} from "@/lib/mpdsr-entry";
import { KENYA_COUNTIES } from "@/lib/assessment";
import { getSubCounties } from "@/lib/geo";

interface DialogProps {
  onClose: () => void;
}

/** Small labeled number input used across the form. */
function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => {
        const v = e.target.value.trim();
        onChange(v === "" ? 0 : Math.max(0, Number(v)));
      }}
      className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
    />
  );
}

export function CauseOfDeathDialog({ onClose }: DialogProps) {
  const [entry, setEntry] = useState<CauseOfDeathEntry>(createEmptyCodEntry());

  const update = (patch: Partial<CauseOfDeathEntry>) => {
    setEntry((prev) => ({ ...prev, ...patch }));
  };

  const setCause = (
    type: "maternal" | "neonatal",
    cause: DeathCause,
    value: number,
  ) => {
    setEntry((prev) => ({
      ...prev,
      [type]: { ...prev[type], [cause]: value },
    }));
  };

  const subCounties = useMemo(
    () => (entry.county ? getSubCounties(entry.county) : []),
    [entry.county],
  );

  const totalDeaths = useMemo(
    () =>
      DEATH_CAUSES.reduce(
        (acc, c) => acc + (entry.maternal[c] ?? 0) + (entry.neonatal[c] ?? 0),
        0,
      ),
    [entry],
  );

  const handleSave = () => {
    if (!entry.facilityName.trim()) {
      alert("Please enter the facility name before saving.");
      return;
    }
    saveCodEntry({ ...entry, updatedAt: new Date().toISOString() });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <HeartPulse className="w-6 h-6 text-rose-600" />
              Cause-of-Death Entry
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Domain 4: Cause-of-death disaggregation per facility per month —
              maternal &amp; neonatal deaths by cause.
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
          {/* Facility + period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Facility name *
              </label>
              <input
                type="text"
                value={entry.facilityName}
                onChange={(e) => update({ facilityName: e.target.value })}
                placeholder="e.g. Meru Teaching & Referral Hospital"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Reporting month (YYYYMM)
              </label>
              <input
                type="text"
                value={entry.pe}
                onChange={(e) =>
                  update({ pe: e.target.value.replace(/\D/g, "").slice(0, 6) })
                }
                placeholder="202505"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                County
              </label>
              <select
                value={entry.county}
                onChange={(e) =>
                  update({ county: e.target.value, subCounty: "" })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              >
                <option value="">Select county…</option>
                {KENYA_COUNTIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Sub-county
              </label>
              <select
                value={entry.subCounty}
                onChange={(e) => update({ subCounty: e.target.value })}
                disabled={!entry.county}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {entry.county ? "Select sub-county…" : "Select county first"}
                </option>
                {subCounties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cause grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Deaths by cause
              </h3>
              <span className="text-xs text-gray-500">
                Total captured: <b className="text-rose-600">{totalDeaths}</b>{" "}
                deaths
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">
                      Cause of death
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-rose-600 w-28">
                      Maternal
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-orange-600 w-28">
                      Neonatal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DEATH_CAUSES.map((cause) => (
                    <tr key={cause} className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-gray-800">{cause}</td>
                      <td className="py-2 px-2">
                        <NumField
                          label={cause}
                          value={entry.maternal[cause] ?? 0}
                          onChange={(v) => setCause("maternal", cause, v)}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <NumField
                          label={cause}
                          value={entry.neonatal[cause] ?? 0}
                          onChange={(v) => setCause("neonatal", cause, v)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Enter the number of deaths audited this month by cause. Zero is a
              valid entry — only record causes that occurred.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-gray-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold flex items-center gap-2 hover:bg-rose-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
