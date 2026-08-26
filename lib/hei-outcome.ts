// ---------------------------------------------------------------------------
// HEI 18–24 outcome entry — mirrors the "HCA data collection Template
// version January 2026" workbook. Each row is one facility × one reporting
// month × one cohort (12-month or 24-month). The VTP scoreboard bar 7
// (HEI final outcome 18–24 months) uses the 18–24 month AB-negative
// outcome ÷ net cohort.
// ---------------------------------------------------------------------------

export type HeiCohort = "12m" | "24m";

export interface HeiOutcomeEntry {
  id: string;
  facilityName: string;
  county: string;
  subCounty: string;
  pe: string; // reporting month YYYYMM
  cohort: HeiCohort; // I year (12 months) / 2 years (24 months)
  enrolled: number | null; // Number of HEI Enrolled in the cohort
  netCohort: number | null; // Net cohort
  // Outcomes — at 12 months (PCR test)
  neg12: number | null; // PCR test/AB Test - negative result
  active12: number | null; // Active but no PCR test/AB Test test done
  pos12: number | null; // Identified as positive
  trans12: number | null; // Transferred out
  ltfu12: number | null; // Lost to Follow-Up
  died12: number | null; // Died between
  // Outcomes — at 18–24 months (AB test)
  neg24: number | null;
  active24: number | null;
  pos24: number | null;
  trans24: number | null;
  ltfu24: number | null;
  died24: number | null;
  updatedAt: string;
}

export const HEI_OUTCOME_STORAGE_KEY = "ewene_hei_outcome_v1";
export const HEI_OUTCOME_CHANGED_EVENT = "ewene:hei-outcome-changed";

export const HEI_OUTCOME_CATEGORIES = [
  { key: "neg", label: "PCR test/AB Test - negative result" },
  { key: "active", label: "Active but no PCR test/AB Test test done" },
  { key: "pos", label: "Identified as positive" },
  { key: "trans", label: "Transferred out" },
  { key: "ltfu", label: "Lost to Follow-Up" },
  { key: "died", label: "Died between" },
] as const;

export function createEmptyHeiOutcome(): HeiOutcomeEntry {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `h-${Date.now()}`,
    facilityName: "",
    county: "",
    subCounty: "",
    pe: new Date().toISOString().slice(0, 7).replace("-", ""),
    cohort: "24m",
    enrolled: null,
    netCohort: null,
    neg12: null,
    active12: null,
    pos12: null,
    trans12: null,
    ltfu12: null,
    died12: null,
    neg24: null,
    active24: null,
    pos24: null,
    trans24: null,
    ltfu24: null,
    died24: null,
    updatedAt: new Date().toISOString(),
  };
}

export function loadHeiOutcomes(): HeiOutcomeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HEI_OUTCOME_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistHeiOutcomes(entries: HeiOutcomeEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HEI_OUTCOME_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(HEI_OUTCOME_CHANGED_EVENT));
}

export function saveHeiOutcome(entry: HeiOutcomeEntry) {
  const all = loadHeiOutcomes();
  const idx = all.findIndex((a) => a.id === entry.id);
  if (idx >= 0) all[idx] = entry;
  else all.unshift(entry);
  persistHeiOutcomes(all);
}

export function deleteHeiOutcome(id: string) {
  persistHeiOutcomes(loadHeiOutcomes().filter((a) => a.id !== id));
}

// ---------------------------------------------------------------------------
// Computed helpers — % outcome = outcome ÷ net cohort (template rows 21–26)
// ---------------------------------------------------------------------------

export function outcomePct(
  value: number | null,
  netCohort: number | null,
): number | null {
  if (value == null || netCohort == null || netCohort <= 0) return null;
  return Math.round((value / netCohort) * 1000) / 10;
}

/** Sum of the six outcome values for a given age window (12m or 24m). */
export function outcomeSum(
  entry: HeiOutcomeEntry,
  window: "12" | "24",
): number {
  if (window === "12") {
    return (
      (entry.neg12 ?? 0) +
      (entry.active12 ?? 0) +
      (entry.pos12 ?? 0) +
      (entry.trans12 ?? 0) +
      (entry.ltfu12 ?? 0) +
      (entry.died12 ?? 0)
    );
  }
  return (
    (entry.neg24 ?? 0) +
    (entry.active24 ?? 0) +
    (entry.pos24 ?? 0) +
    (entry.trans24 ?? 0) +
    (entry.ltfu24 ?? 0) +
    (entry.died24 ?? 0)
  );
}

/** HEI final outcome 18–24m = AB negative ÷ net cohort (VTP bar 7). */
export function heiFinalOutcome1824(entry: HeiOutcomeEntry): number | null {
  return outcomePct(entry.neg24, entry.netCohort);
}

/** Aggregate 18–24m AB-negative ÷ net cohort across a set of entries. */
export function aggregateHeiOutcomes(entries: HeiOutcomeEntry[]): {
  neg: number;
  netCohort: number;
} {
  let neg = 0;
  let netCohort = 0;
  for (const e of entries) {
    if (e.cohort !== "24m") continue;
    neg += e.neg24 ?? 0;
    netCohort += e.netCohort ?? 0;
  }
  return { neg, netCohort };
}
