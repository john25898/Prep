"use client";

import { useState } from "react";
import { Table2, X, Download, Check } from "lucide-react";

export type DataRow = Record<string, unknown>;

/** Where an input value came from — shown as a small chip next to it. */
export type ViewSource = "live" | "est" | "demo" | "registry" | "n/r";

/** One raw input that feeds a calculated chart value. */
export type ViewInput = {
  label: string;
  value: unknown;
  source?: ViewSource;
};

/** "How this chart was calculated" — the raw inputs behind a derived value. */
export type ViewDetail = {
  /** e.g. "retention % = currently on PrEP ÷ initiated × 100" */
  formula?: string;
  /** The raw KHIS / registry / demo values that feed the calculation. */
  inputs?: ViewInput[];
  /** Extra explanation bullets (caveats, clamps, scope…). */
  notes?: string[];
};

const SKIP_KEYS = new Set([
  "fill",
  "color",
  "stroke",
  "payload",
  "key",
  "className",
]);

const SOURCE_STYLES: Record<ViewSource, string> = {
  live: "bg-emerald-100 text-emerald-700",
  est: "bg-amber-100 text-amber-700",
  demo: "bg-slate-100 text-slate-600",
  registry: "bg-sky-100 text-sky-700",
  "n/r": "bg-white text-slate-400 border border-dashed border-slate-300",
};

const SOURCE_LABEL: Record<ViewSource, string> = {
  live: "live KHIS",
  est: "estimate",
  demo: "demo",
  registry: "registry",
  "n/r": "not reported",
};

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

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "chart"
  );
}

/**
 * Small "View Data" button shown next to chart headers. Opens a modal with
 * the exact rows being rendered by the chart, plus a Download CSV action and
 * (when `detail` is supplied) a "How this is calculated" panel listing the
 * raw inputs behind derived values — so every number on screen can be traced
 * back to the data and formula that produced it.
 */
export function ViewDataButton({
  title,
  data,
  note,
  detail,
}: {
  title: string;
  data: DataRow[] | null | undefined;
  note?: string;
  detail?: ViewDetail;
}) {
  const [open, setOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

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

  // The downloaded file includes the calculation inputs (when present) so
  // the exported CSV is self-explanatory, not just the chart rows.
  const downloadCsv = () => {
    try {
      const detailBlock: string[] = [];
      if (detail) {
        detailBlock.push("");
        detailBlock.push("--- HOW THIS CHART WAS CALCULATED ---");
        if (detail.formula) detailBlock.push(`FORMULA: ${detail.formula}`);
        if (detail.inputs?.length) {
          detailBlock.push("INPUTS (raw values feeding the calculation):");
          detail.inputs.forEach((inp, i) =>
            detailBlock.push(
              `${i + 1}. ${inp.label} = ${fmtValue(inp.value)}` +
                (inp.source ? ` [${SOURCE_LABEL[inp.source]}]` : ""),
            ),
          );
        }
        if (detail.notes?.length) {
          detailBlock.push("NOTES:");
          detail.notes.forEach((n, i) => detailBlock.push(`  - ${n}`));
        }
      }
      const blob = new Blob(
        ["\uFEFF" + toCsv() + "\n" + detailBlock.join("\n")],
        {
          type: "text/csv;charset=utf-8;",
        },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(title)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch {
      /* download unavailable — ignore */
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
                  onClick={downloadCsv}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-200 hover:text-teal-700"
                >
                  {downloaded ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />{" "}
                      Downloaded
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" /> Download CSV
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
            {detail && (
              <div className="px-5 py-4 border-b border-slate-200 bg-teal-50/40">
                <p className="text-[11px] font-bold text-teal-800 uppercase tracking-wide mb-2">
                  How this is calculated — the inputs behind these values
                </p>
                {detail.formula && (
                  <p className="text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-md px-3 py-2 mb-3">
                    {detail.formula}
                  </p>
                )}
                {detail.inputs && detail.inputs.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
                    {detail.inputs.map((inp, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span
                          className="text-slate-600 min-w-0 truncate"
                          title={inp.label}
                        >
                          {inp.label}
                        </span>
                        <span className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="font-semibold text-slate-900">
                            {fmtValue(inp.value)}
                          </span>
                          {inp.source && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap ${SOURCE_STYLES[inp.source]}`}
                            >
                              {SOURCE_LABEL[inp.source]}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {detail.notes && detail.notes.length > 0 && (
                  <ul className="text-[11px] text-slate-500 space-y-1">
                    {detail.notes.map((n, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span className="text-teal-700">·</span>
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
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
              estimated/fallback values where KHIS has no live number. Where a
              value is calculated, the inputs and formula are shown above. Use
              Download CSV to export both the rows and the calculation details.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
