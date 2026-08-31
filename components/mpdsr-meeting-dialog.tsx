"use client";

import { useMemo, useState } from "react";
import { X, Save, CalendarCheck } from "lucide-react";
import {
  createEmptyMpdsrMeeting,
  saveMpdsrMeeting,
  MpdsrMeetingEntry,
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
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <input
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value.trim();
          onChange(v === "" ? null : Math.max(0, Number(v)));
        }}
        placeholder="0"
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      />
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function MpdsrMeetingDialog({ onClose }: DialogProps) {
  const [entry, setEntry] = useState<MpdsrMeetingEntry>(
    createEmptyMpdsrMeeting(),
  );

  const update = (patch: Partial<MpdsrMeetingEntry>) => {
    setEntry((prev) => ({ ...prev, ...patch }));
  };

  const subCounties = useMemo(
    () => (entry.county ? getSubCounties(entry.county) : []),
    [entry.county],
  );

  const handleSave = () => {
    if (!entry.facilityName.trim()) {
      alert("Please enter the facility name before saving.");
      return;
    }
    saveMpdsrMeeting({ ...entry, updatedAt: new Date().toISOString() });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarCheck className="w-6 h-6 text-amber-600" />
              MPDSR/QI Meeting Entry
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Domain 4: Monthly MPDSR/QI review meeting — one entry per facility
              per month. Drives indicator 4.3.
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
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

          {/* Meeting held? */}
          <div className="bg-amber-50 rounded-lg p-5 border border-amber-200">
            <h3 className="text-sm font-semibold text-amber-900">
              Was the monthly MPDSR/QI review meeting held?
            </h3>
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => update({ meetingHeld: true })}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  entry.meetingHeld
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-slate-300 text-gray-600 hover:bg-slate-50"
                }`}
              >
                ✓ Yes — held
              </button>
              <button
                onClick={() => update({ meetingHeld: false })}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  !entry.meetingHeld
                    ? "bg-red-600 text-white"
                    : "bg-white border border-slate-300 text-gray-600 hover:bg-slate-50"
                }`}
              >
                ✗ No — not held
              </button>
            </div>
            <p className="text-[11px] text-amber-700 mt-2">
              Indicator 4.3 counts facilities that held their monthly MPDSR/QI
              review meeting. Record "No" if the month's review was skipped.
            </p>
          </div>

          {/* Meeting details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Meeting details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <NumField
                label="Deaths reviewed"
                value={entry.deathsReviewed}
                onChange={(v) => update({ deathsReviewed: v })}
                hint="Maternal + neonatal deaths reviewed at this meeting"
              />
              <NumField
                label="New recommendations"
                value={entry.recommendations}
                onChange={(v) => update({ recommendations: v })}
                hint="Action points issued from the audit"
              />
              <NumField
                label="Attendees"
                value={entry.attendees}
                onChange={(v) => update({ attendees: v })}
                hint="Number of committee members present"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes / action points
            </label>
            <textarea
              value={entry.notes}
              onChange={(e) => update({ notes: e.target.value })}
              rows={3}
              placeholder="Key recommendations, follow-ups, or reasons the meeting was skipped…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
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
              className="px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold flex items-center gap-2 hover:bg-amber-700 transition-colors"
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
