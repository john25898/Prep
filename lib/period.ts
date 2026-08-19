// ---------------------------------------------------------------------------
// Period helpers — shared by the client filter bar and the server KHIS proxy.
// Pure functions only (no "use client", no React) so the API route handler can
// import them safely.
// ---------------------------------------------------------------------------

export type PeriodMode = "month" | "range";

/** "2025-05" -> "202505" */
export function periodToPe(month: string): string {
  return month.replace("-", "");
}

/** YYYY-MM-DD -> YYYY-MM */
function monthKey(date: string): string {
  return date.slice(0, 7);
}

/**
 * Months between two ISO dates (inclusive) as "YYYYMM" list.
 * e.g. 2025-08-01 -> 2025-09-02 gives ["202508", "202509"].
 */
export function monthsBetween(start: string, end: string): string[] {
  const [sy, sm] = monthKey(start).split("-").map(Number);
  const [ey, em] = monthKey(end).split("-").map(Number);
  if (!sy || !sm || !ey || !em) return [];
  const out: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (out.length > 120) break; // safety — never allow absurd ranges
  }
  return out;
}

/**
 * Resolve the DHIS2 pe string from a period selection.
 * Month mode -> single "YYYYMM". Range mode -> "YYYYMM;YYYYMM;…" so the
 * analytics call returns one row per month (summed server-side for totals,
 * and available as a monthly series for trend charts).
 */
export function resolvePe(p: {
  periodMode: PeriodMode;
  periodMonth: string;
  periodStart: string;
  periodEnd: string;
}): string {
  if (p.periodMode === "range") {
    const months = monthsBetween(p.periodStart, p.periodEnd);
    return months.length ? months.join(";") : periodToPe(p.periodMonth);
  }
  return periodToPe(p.periodMonth);
}

/**
 * True when any month in the pe string is AFTER the current (real-world)
 * month — i.e. the selected period is in the future, so KHIS cannot have
 * reported data for it yet.
 *   "202609"          (today ~Aug 2026) -> true
 *   "202505"          -> false
 *   "202508;202509"   -> false
 *   "LAST_12_MONTHS"  -> false (trailing window, not a future pick)
 */
export function isFuturePeriod(pe: string, now: Date = new Date()): boolean {
  const months = pe.split(";").filter((m) => /^\d{6}$/.test(m));
  if (months.length === 0) return false;
  const nowYm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return months.some((m) => m > nowYm);
}

export const MONTH_NAMES = [
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

function fmtMonth(pe: string): string {
  if (/^\d{6}$/.test(pe)) {
    const m = Number(pe.slice(4, 6));
    const name = MONTH_NAMES[m - 1] ?? pe;
    return `${name} ${pe.slice(0, 4)}`;
  }
  return pe;
}

/**
 * Friendly label for a pe string:
 *   "202505"              -> "May 2025"
 *   "202508;202509"       -> "Aug 2025 – Sep 2025"
 *   "LAST_12_MONTHS"      -> "Last 12 months"
 */
export function peToLabel(pe: string): string {
  if (pe === "LAST_12_MONTHS" || pe === "LAST_12MONTHS") {
    return "Last 12 months";
  }
  const months = pe.split(";").filter(Boolean);
  if (months.length === 0) return pe;
  if (months.length === 1) return fmtMonth(months[0]);
  return `${fmtMonth(months[0])} – ${fmtMonth(months[months.length - 1])}`;
}
