"use client";

import { useMemo, useState } from "react";
import { X, Save, Syringe } from "lucide-react";
import {
  createEmptyVtpEidHeiEntry,
  eidCoverage,
  eidTotal,
  pcrPosArtInitiated,
  pcrPosTotal,
  saveVtpEidHeiEntry,
  VtpEidHeiEntry,
} from "@/lib/vtp-entry";
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
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
      />
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function VtpEidHeiDialog({ onClose }: DialogProps) {
  const [entry, setEntry] = useState<VtpEidHeiEntry>(
    createEmptyVtpEidHeiEntry(),
  );

  const update = (patch: Partial<VtpEidHeiEntry>) => {
    setEntry((prev) => ({ ...prev, ...patch }));
  };

  // Live bar computations — same formulas as the VTP scoreboard.
  const cov = useMemo(() => eidCoverage(entry), [entry]);
  const pcrArt = useMemo(() => pcrPosArtInitiated(entry), [entry]);
  const eidTot = eidTotal(entry);
  const posTot = pcrPosTotal(entry);
  const artTot = (entry.artInit02 ?? 0) + (entry.artInit312 ?? 0);

  const handleSave = () => {
    if (!entry.facilityName.trim()) {
      alert("Please enter the facility name before saving.");
      return;
    }
    saveVtpEidHeiEntry({ ...entry, updatedAt: new Date().toISOString() });
    onClose();
  };

  const currentMonth = new Date().toISOString().slice(0, 7).replace("-", "");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Syringe className="w-6 h-6 text-rose-600" />
              VTP Monthly Data Entry — EID / HEI
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              EID samples, HEI results, PCR-positive results &amp; ART
              initiation, by age bucket (0–2 months / 3–12 months) — drives VTP
              bars 4 (EID Coverage) &amp; 5 (PCR POS ART initiated). ANC testing
              comes from KHIS, not this form.
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
          <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-lg p-5 border border-rose-200">
            <h3 className="text-sm font-semibold text-rose-900">
              Computed VTP bars (live)
            </h3>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/70 rounded-lg p-3 border border-rose-100">
                <p className="text-[11px] font-medium text-gray-500">
                  EID Coverage — 0–2m ÷ total (0–12m)
                </p>
                <p className="text-2xl font-bold text-rose-600 mt-1">
                  {cov != null ? `${cov.toFixed(1)}%` : "—"}
                </p>
                <p className="text-[10px] text-gray-400">
                  {entry.eidSamples02 ?? 0} of {eidTot} samples ≤ 2 months
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 border border-rose-100">
                <p className="text-[11px] font-medium text-gray-500">
                  PCR POS ART initiated — ART ÷ PCR+
                </p>
                <p className="text-2xl font-bold text-rose-600 mt-1">
                  {pcrArt != null ? `${pcrArt.toFixed(1)}%` : "—"}
                </p>
                <p className="text-[10px] text-gray-400">
                  {artTot} initiated of {posTot} PCR+
                </p>
              </div>
            </div>
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
                  value={entry.facilityName}
                  onChange={(e) => update({ facilityName: e.target.value })}
                  placeholder="e.g. Meru Teaching & Referral Hospital"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
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
                    placeholder="e.g. Imenti North"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                )}
              </div>
            </div>
          </div>

          {/* EID / HEI counts */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              EID &amp; HEI Monthly Counts
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Enter counts per age bucket — "Total" (0–12 months) is the sum of
              both buckets.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-4">
                <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-3">
                  EID – Samples collected
                </p>
                <div className="space-y-3">
                  <NumField
                    label="0–2 months"
                    value={entry.eidSamples02}
                    onChange={(v) => update({ eidSamples02: v })}
                  />
                  <NumField
                    label="3–12 months"
                    value={entry.eidSamples312}
                    onChange={(v) => update({ eidSamples312: v })}
                  />
                </div>
                <p className="text-xs font-medium text-gray-600 mt-3">
                  Total (0–12m):{" "}
                  <span className="font-bold text-rose-700">{eidTot}</span>
                </p>
              </div>
              <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-4">
                <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-3">
                  HEI c̄ Results received
                </p>
                <div className="space-y-3">
                  <NumField
                    label="0–2 months"
                    value={entry.heiResults02}
                    onChange={(v) => update({ heiResults02: v })}
                  />
                  <NumField
                    label="3–12 months"
                    value={entry.heiResults312}
                    onChange={(v) => update({ heiResults312: v })}
                  />
                </div>
                <p className="text-xs font-medium text-gray-600 mt-3">
                  Total (0–12m):{" "}
                  <span className="font-bold text-rose-700">
                    {(entry.heiResults02 ?? 0) + (entry.heiResults312 ?? 0)}
                  </span>
                </p>
              </div>
              <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-4">
                <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-3">
                  PCR-Positive Results
                </p>
                <div className="space-y-3">
                  <NumField
                    label="0–2 months"
                    value={entry.pcrPos02}
                    onChange={(v) => update({ pcrPos02: v })}
                  />
                  <NumField
                    label="3–12 months"
                    value={entry.pcrPos312}
                    onChange={(v) => update({ pcrPos312: v })}
                  />
                </div>
                <p className="text-xs font-medium text-gray-600 mt-3">
                  Total (0–12m):{" "}
                  <span className="font-bold text-rose-700">{posTot}</span>
                </p>
              </div>
              <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-4">
                <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-3">
                  ART Initiated
                </p>
                <div className="space-y-3">
                  <NumField
                    label="0–2 months"
                    value={entry.artInit02}
                    onChange={(v) => update({ artInit02: v })}
                  />
                  <NumField
                    label="3–12 months"
                    value={entry.artInit312}
                    onChange={(v) => update({ artInit312: v })}
                  />
                </div>
                <p className="text-xs font-medium text-gray-600 mt-3">
                  Total (0–12m):{" "}
                  <span className="font-bold text-rose-700">{artTot}</span>
                </p>
              </div>
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
              className="px-4 py-2 rounded-lg bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 transition-colors inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
