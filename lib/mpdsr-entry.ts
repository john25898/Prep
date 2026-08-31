// ---------------------------------------------------------------------------
// MPDSR monthly data entry — MPDSR/QI meetings + cause-of-death records.
// Kept SEPARATE from the Facility Assessment storage (assessment.ts) and the
// VTP monthly entry (vtp-entry.ts) so the three entry flows never mix.
//
// Each row is one facility × one reporting month. The Domain 4 (MPDSR)
// subtab aggregates these to drive indicator 4.3 (monthly MPDSR/QI meetings)
// and the cause-of-death disaggregation — the two Domain-4 items KHIS does
// not report.
// ---------------------------------------------------------------------------

export const MPDSR_MEETING_STORAGE_KEY = "ewene_mpdsr_meetings_v1";
export const MPDSR_MEETING_CHANGED_EVENT = "ewene:mpdsr-meetings-changed";

export const COD_STORAGE_KEY = "ewene_cod_entries_v1";
export const COD_CHANGED_EVENT = "ewene:cod-entries-changed";

/** The seven cause categories used by the disaggregation chart. */
export const DEATH_CAUSES = [
  "PPH",
  "Sepsis",
  "Pre-eclampsia/Eclampsia",
  "Obstructed labour",
  "Preterm / LBW",
  "Birth asphyxia",
  "Other",
] as const;

export type DeathCause = (typeof DEATH_CAUSES)[number];

// ---------------------------------------------------------------------------
// MPDSR/QI meetings
// ---------------------------------------------------------------------------

export interface MpdsrMeetingEntry {
  id: string;
  facilityName: string;
  county: string;
  subCounty: string;
  pe: string; // reporting month YYYYMM
  meetingHeld: boolean; // did the facility hold its monthly MPDSR/QI meeting?
  deathsReviewed: number | null; // deaths reviewed at the meeting
  recommendations: number | null; // new recommendations issued
  attendees: number | null; // number of attendees
  notes: string;
  updatedAt: string;
}

export function createEmptyMpdsrMeeting(): MpdsrMeetingEntry {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `m-${Date.now()}`,
    facilityName: "",
    county: "",
    subCounty: "",
    pe: new Date().toISOString().slice(0, 7).replace("-", ""),
    meetingHeld: false,
    deathsReviewed: null,
    recommendations: null,
    attendees: null,
    notes: "",
    updatedAt: new Date().toISOString(),
  };
}

export function loadMpdsrMeetings(): MpdsrMeetingEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MPDSR_MEETING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistMpdsrMeetings(entries: MpdsrMeetingEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    MPDSR_MEETING_STORAGE_KEY,
    JSON.stringify(entries),
  );
  window.dispatchEvent(new Event(MPDSR_MEETING_CHANGED_EVENT));
}

export function saveMpdsrMeeting(entry: MpdsrMeetingEntry) {
  const all = loadMpdsrMeetings();
  const idx = all.findIndex((a) => a.id === entry.id);
  if (idx >= 0) all[idx] = entry;
  else all.unshift(entry);
  persistMpdsrMeetings(all);
}

export function deleteMpdsrMeeting(id: string) {
  persistMpdsrMeetings(loadMpdsrMeetings().filter((a) => a.id !== id));
}

// ---------------------------------------------------------------------------
// Cause-of-death
// ---------------------------------------------------------------------------

export interface CauseOfDeathEntry {
  id: string;
  facilityName: string;
  county: string;
  subCounty: string;
  pe: string; // reporting month YYYYMM
  /** cause → number of maternal deaths attributed to that cause. */
  maternal: Record<DeathCause, number>;
  /** cause → number of neonatal deaths attributed to that cause. */
  neonatal: Record<DeathCause, number>;
  updatedAt: string;
}

export function createEmptyCodEntry(): CauseOfDeathEntry {
  const zeros = () =>
    Object.fromEntries(DEATH_CAUSES.map((c) => [c, 0])) as Record<
      DeathCause,
      number
    >;
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `c-${Date.now()}`,
    facilityName: "",
    county: "",
    subCounty: "",
    pe: new Date().toISOString().slice(0, 7).replace("-", ""),
    maternal: zeros(),
    neonatal: zeros(),
    updatedAt: new Date().toISOString(),
  };
}

export function loadCodEntries(): CauseOfDeathEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistCodEntries(entries: CauseOfDeathEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COD_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(COD_CHANGED_EVENT));
}

export function saveCodEntry(entry: CauseOfDeathEntry) {
  const all = loadCodEntries();
  const idx = all.findIndex((a) => a.id === entry.id);
  if (idx >= 0) all[idx] = entry;
  else all.unshift(entry);
  persistCodEntries(all);
}

export function deleteCodEntry(id: string) {
  persistCodEntries(loadCodEntries().filter((a) => a.id !== id));
}

// ---------------------------------------------------------------------------
// Aggregation helpers (used by the Domain 4 subtab)
// ---------------------------------------------------------------------------

/**
 * % of facilities holding their monthly MPDSR/QI meeting — distinct
 * facilities with meetingHeld=true ÷ distinct facilities with an entry.
 * When `pe` is given, only entries for that month count (one facility per
 * month is expected; duplicates are de-duplicated by facility).
 */
export function meetingHeldPct(
  entries: MpdsrMeetingEntry[],
  pe?: string | string[],
): number | null {
  const months = pe ? (Array.isArray(pe) ? pe : [pe]) : null;
  const scoped = months
    ? entries.filter((e) => months.includes(e.pe))
    : entries;
  const facilities = new Set(scoped.map((e) => e.facilityName));
  if (facilities.size === 0) return null;
  const held = new Set(
    scoped.filter((e) => e.meetingHeld).map((e) => e.facilityName),
  ).size;
  return Math.round((held / facilities.size) * 100);
}

/** Per-county meeting % for the county chart. */
export function meetingHeldPctByCounty(
  entries: MpdsrMeetingEntry[],
  pe: string | string[],
): Record<string, number | null> {
  const months = Array.isArray(pe) ? pe : [pe];
  const acc: Record<string, { facilities: Set<string>; held: Set<string> }> =
    {};
  for (const e of entries) {
    if (!months.includes(e.pe)) continue;
    if (!acc[e.county])
      acc[e.county] = { facilities: new Set(), held: new Set() };
    acc[e.county].facilities.add(e.facilityName);
    if (e.meetingHeld) acc[e.county].held.add(e.facilityName);
  }
  const out: Record<string, number | null> = {};
  for (const [county, v] of Object.entries(acc)) {
    out[county] =
      v.facilities.size > 0
        ? Math.round((v.held.size / v.facilities.size) * 100)
        : null;
  }
  return out;
}

/**
 * Aggregated cause-of-death counts across entries (optionally filtered to a
 * reporting month). Returns the rows consumed by the disaggregation chart.
 */
export function causeOfDeathTotals(
  entries: CauseOfDeathEntry[],
  pe?: string | string[],
): { name: string; maternal: number; neonatal: number }[] {
  const months = pe ? (Array.isArray(pe) ? pe : [pe]) : null;
  const scoped = months
    ? entries.filter((e) => months.includes(e.pe))
    : entries;
  return DEATH_CAUSES.map((cause) => {
    let maternal = 0;
    let neonatal = 0;
    for (const e of scoped) {
      maternal += e.maternal[cause] ?? 0;
      neonatal += e.neonatal[cause] ?? 0;
    }
    return { name: cause, maternal, neonatal };
  });
}

/** Total deaths captured across cause-of-death entries (any month). */
export function codEntryTotal(entries: CauseOfDeathEntry[]): number {
  let total = 0;
  for (const e of entries) {
    for (const c of DEATH_CAUSES) {
      total += (e.maternal[c] ?? 0) + (e.neonatal[c] ?? 0);
    }
  }
  return total;
}
