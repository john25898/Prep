"use client";

import { useState } from "react";
import { Table2, X, Copy, Check } from "lucide-react";

export type DataRow = Record<string, unknown>;

const SKIP_KEYS = new Set([
  "fill",
  "color",
  "stroke",
  "payload",
  "key",
  "className",
]);

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? v.toLocaleString()
      : String(Math.round(v * 1000) / 1000);
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

/**
 * Small "View Data" button shown next to chart headers. Opens a modal with
 * the exact rows being rendered by the chart, plus a CSV copy action — so
 * every number on screen can be traced back to the data behind it.
 */
export function ViewDataButton({
  title,
  data,
  note,
}: {
  title: string;
  data: DataRow[] | null | undefined;
  note?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const rows = (data ?? []).filter(Boolean) as DataRow[];
  const columns =
    rows.length > 0
      ? Object.keys(rows[0]).filter((k) => !SKIP_KEYS.has(k))
      : [];

  const toCsv = () => {
    const header = columns.join(",");
    const lines = rows.map((r) =>
      columns.map((c) => `"${fmtValue(r[c]).replace(/"/g, '""')}"`).join(","),
    );
    return [header, ...lines].join("\n");
  };

  const copyCsv = async () => {
    try {
      await navigator.clipboard.writeText(toCsv());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`View the data behind this chart${rows.length ? ` (${rows.length} rows)` : ""}`}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-200 hover:text-teal-700"
      >
        <Table2 className="h-3.5 w-3.5" />
        View Data
        {rows.length > 0 && (
          <span className="text-[10px] font-semibold text-slate-400">
            {rows.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">
                  {title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {rows.length} row{rows.length === 1 ? "" : "s"} ·{" "}
                  {columns.length} column{columns.length === 1 ? "" : "s"}
                  {note ? ` · ${note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={copyCsv}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-200 hover:text-teal-700"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy CSV
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
                >
                  <X className="h-3.5 w-3.5" /> Close
                </button>
              </div>
            </div>
            <div className="overflow-auto">
              {rows.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-400">
                  No data rows for this chart yet — it will populate once KHIS
                  returns values for the current scope.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-10">
                        #
                      </th>
                      {columns.map((c) => (
                        <th
                          key={c}
                          className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2 text-xs text-gray-400">
                          {i + 1}
                        </td>
                        {columns.map((c) => (
                          <td
                            key={c}
                            className="px-4 py-2 text-gray-800 whitespace-nowrap"
                          >
                            {fmtValue(r[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 text-xs text-gray-500">
              The exact rows behind this chart as rendered — including
              estimated/fallback values where KHIS has no live number. Hover any
              chart point for per-point detail.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
