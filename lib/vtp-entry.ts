// ---------------------------------------------------------------------------
// VTP monthly data entry — EID / HEI indicators (kept SEPARATE from the
// Facility Assessment storage so the two entry flows never mix).
//
// Each row is one facility × one reporting month. The VTP scoreboard
// aggregates these per county to drive bars 4 (EID Coverage) and 5
// (PCR POS ART initiated) instead of the old KHIS % indicators.
// ---------------------------------------------------------------------------

export interface VtpEidHeiEntry {
  id: string;
  facilityName: string;
  county: string;
  subCounty: string;
  pe: string; // reporting month YYYYMM
  // EID – Samples collected
  eidSamples02: number | null; // 0–2 months
  eidSamples312: number | null; // 3–12 months
  // HEI c̄ Results received
  heiResults02: number | null; // 0–2 months
  heiResults312: number | null; // 3–12 months
  // PCR-Positive Results
  pcrPos02: number | null; // 0–2 months
  pcrPos312: number | null; // 3–12 months
  // ART Initiated
  artInit02: number | null; // 0–2 months
  artInit312: number | null; // 3–12 months
  updatedAt: string;
}

export const VTP_EID_STORAGE_KEY = "ewene_vtp_eid_hei_v1";
export const VTP_EID_CHANGED_EVENT = "ewene:vtp-eid-hei-changed";

export function createEmptyVtpEidHeiEntry(): VtpEidHeiEntry {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v-${Date.now()}`,
    facilityName: "",
    county: "",
    subCounty: "",
    pe: new Date().toISOString().slice(0, 7).replace("-", ""),
    eidSamples02: null,
    eidSamples312: null,
    heiResults02: null,
    heiResults312: null,
    pcrPos02: null,
    pcrPos312: null,
    artInit02: null,
    artInit312: null,
    updatedAt: new Date().toISOString(),
  };
}

export function loadVtpEidHeiEntries(): VtpEidHeiEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VTP_EID_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistVtpEidHeiEntries(entries: VtpEidHeiEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VTP_EID_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(VTP_EID_CHANGED_EVENT));
}

export function saveVtpEidHeiEntry(entry: VtpEidHeiEntry) {
  const all = loadVtpEidHeiEntries();
  const idx = all.findIndex((a) => a.id === entry.id);
  if (idx >= 0) all[idx] = entry;
  else all.unshift(entry);
  persistVtpEidHeiEntries(all);
}

export function deleteVtpEidHeiEntry(id: string) {
  persistVtpEidHeiEntries(loadVtpEidHeiEntries().filter((a) => a.id !== id));
}

// ---------------------------------------------------------------------------
// Computed helpers (bar formulas)
// ---------------------------------------------------------------------------

const sum = (a: number | null, b: number | null): number => (a ?? 0) + (b ?? 0);

/** Total EID samples collected across 0–12 months. */
export function eidTotal(entry: VtpEidHeiEntry): number {
  return sum(entry.eidSamples02, entry.eidSamples312);
}

/** EID Coverage = 0–2 month samples ÷ total (0–12 month) samples. */
export function eidCoverage(entry: VtpEidHeiEntry): number | null {
  const total = eidTotal(entry);
  if (total <= 0) return null;
  return Math.max(0, Math.min(100, ((entry.eidSamples02 ?? 0) / total) * 100));
}

/** Total PCR-positive results across 0–12 months. */
export function pcrPosTotal(entry: VtpEidHeiEntry): number {
  return sum(entry.pcrPos02, entry.pcrPos312);
}

/** Total ART initiated across 0–12 months. */
export function artInitTotal(entry: VtpEidHeiEntry): number {
  return sum(entry.artInit02, entry.artInit312);
}

/** PCR POS ART initiated = ART Initiated ÷ PCR-positive results. */
export function pcrPosArtInitiated(entry: VtpEidHeiEntry): number | null {
  const pos = pcrPosTotal(entry);
  if (pos <= 0) return null;
  return Math.max(0, Math.min(100, (artInitTotal(entry) / pos) * 100));
}

/** Aggregate a list of entries (per county) → summed numerators/denominators. */
export function aggregateVtpEntries(entries: VtpEidHeiEntry[]): {
  eidSamples02: number;
  eidSamples312: number;
  pcrPos: number;
  artInit: number;
} {
  const acc = {
    eidSamples02: 0,
    eidSamples312: 0,
    pcrPos: 0,
    artInit: 0,
  };
  for (const e of entries) {
    acc.eidSamples02 += e.eidSamples02 ?? 0;
    acc.eidSamples312 += e.eidSamples312 ?? 0;
    acc.pcrPos += pcrPosTotal(e);
    acc.artInit += artInitTotal(e);
  }
  return acc;
}
