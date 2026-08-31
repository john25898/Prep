// ---------------------------------------------------------------------------
// Implementing-partner facility rosters + KHIS org-unit mapping
//
// Partner → counties → KHIS county OU UIDs (all 47 level-2 counties resolved
// live on KHIS as a MASTER registry; the DOS IP "national" scope covers ONLY
// the 24 implementing-partner counties, never the full 47 — a county with no
// implementing partner has no program activity to report). Facility rosters
// are the program-assigned lists (e.g. the JTP PrEP roster); runtime data
// always comes from national KHIS.
// ---------------------------------------------------------------------------

export interface PartnerFacility {
  uid: string;
  name: string;
  county: string;
  subCounty: string;
  ward: string;
}

/** KHIS county org-unit UIDs (level 2) — shared registry, same on CHAK. */
export const COUNTY_OUS: Record<string, string> = {
  // Jamii Tekelezi
  Embu: "PFu8alU2KWG",
  "Tharaka-Nithi": "T4urHM47nlm",
  Meru: "Y52XNJ50hYb",
  Nyandarua: "mYZacFNIB3h",
  // Stawisha Pwani
  Kilifi: "nrI2khZx3d0",
  Kwale: "N7YETT3A9r1",
  Mombasa: "wsBsC6gjHvn",
  "Taita-Taveta": "QyGNX2DpR4h",
  // Imarisha Jamii
  Turkana: "kphDeKClFch",
  // AMPATH Uzima
  "Uasin Gishu": "pZqQRRW7PHP",
  "West Pokot": "XWALbfAPa6n",
  "Elgeyo-Marakwet": "MqnLxQBigG0",
  "Trans-Nzoia": "mThvosEflAU",
  // Tujenge Jamii
  Nakuru: "ob6SxuRcqU4",
  Baringo: "vvOK1BxTbet",
  Samburu: "o36zCRjSd4G",
  Laikipia: "xuFdFy6t9AH",
  Kajiado: "Hsk1YV8kHkT",
  // Dumisha Afya
  Bungoma: "KGHhQ5GLd4k",
  Busia: "Tvf1zgVZ0K4",
  // Nuru Ya Mtoto
  Kakamega: "BjC1xL40gHo",
  Kisumu: "tAbBVBbueqD",
  Nyamira: "uepLTG8wGWJ",
  Vihiga: "sANMZ3lpqGs",
  // Remaining national counties (level 2) — master registry only (NOT in the
  // DOS IP scope; see PARTNER_COUNTIES.national = DOS_IP_COUNTIES below)
  Bomet: "HMNARUV2CW4",
  Garissa: "uyOrcHZBpW0",
  "Homa Bay": "nK0A12Q7MvS",
  Isiolo: "bzOfj0iwfDH",
  Kericho: "ihZsJ8alvtb",
  Kiambu: "qKzosKQPl6G",
  Kirinyaga: "Ulj33KBau7V",
  Kisii: "sPkRcDvhGWA",
  Kitui: "j8o6iO4Njsi",
  Lamu: "NjWSbQTwys4",
  Machakos: "yhCUgGcCcOo",
  Makueni: "BoDytkJQ4Qi",
  Mandera: "R6f9znhg37c",
  Marsabit: "Eey8fT4Im3y",
  Migori: "fVra3Pwta0Q",
  "Murang'a": "ahwTMNAJvrL",
  Nairobi: "jkG3zaihdSs",
  Nandi: "t0J75eHKxz5",
  Narok: "kqJ83J2D72s",
  Nyeri: "ptWVfaCIdVx",
  Siaya: "u4t9H8XyU9P",
  "Tana River": "JsH2bnvNt2d",
  Wajir: "CeLsrJOH0g9",
};

/**
 * Jamii Tekelezi facility roster — the JTP PrEP program facility list
 * (201 facilities across Embu, Tharaka-Nithi, Meru, Nyandarua).
 * Extracted 2026-08-12 from the program dataset assignment (metadata only);
 * UIDs verified present on national KHIS.
 */
import jtRoster from "@/data/jamii-tekelezi-facilities.json";
import tujengeRoster from "@/data/tujenge-jamii-facilities.json";
import dumishaRoster from "@/data/dumisha-afya-facilities.json";
import imarishaRoster from "@/data/imarisha-jamii-facilities.json";
import ampathRoster from "@/data/ampath-uzima-facilities.json";
import stawishaRoster from "@/data/stawisha-pwani-facilities.json";
import nuruRoster from "@/data/nuru-ya-mtoto-facilities.json";
import ouCountyMap from "@/data/ou-county-map.json";
import ouSubCountyMap from "@/data/ou-subcounty-map.json";

export const JAMII_TEKELEZI_FACILITIES: PartnerFacility[] =
  jtRoster as PartnerFacility[];

/**
 * Facility rosters supplied by the implementing partners (Excel, Aug 2026):
 *   - Tujenge Jamii     277 facilities (Baringo, Nakuru, Samburu, Laikipia, Kajiado)
 *   - Dumisha Afya      169 facilities (Bungoma, Busia)
 *   - Imarisha Jamii     56 facilities (Turkana)
 *   - AMPATH Uzima      241 facilities (Elgeyo-Marakwet, Uasin Gishu, West Pokot, Trans-Nzoia)
 *   - Stawisha Pwani    365 facilities (Kilifi, Kwale, Mombasa, Taita-Taveta)
 * MFL codes resolved to KHIS org-unit UIDs 2026-08 (all verified on national KHIS).
 */
export const TUJENGE_JAMII_FACILITIES: PartnerFacility[] =
  tujengeRoster as PartnerFacility[];
export const DUMISHA_AFYA_FACILITIES: PartnerFacility[] =
  dumishaRoster as PartnerFacility[];
export const IMARISHA_JAMII_FACILITIES: PartnerFacility[] =
  imarishaRoster as PartnerFacility[];
export const AMPATH_UZIMA_FACILITIES: PartnerFacility[] =
  ampathRoster as PartnerFacility[];
export const STAWISHA_PWANI_FACILITIES: PartnerFacility[] =
  stawishaRoster as PartnerFacility[];
export const NURU_YA_MTOTO_FACILITIES: PartnerFacility[] =
  nuruRoster as PartnerFacility[];

/** Partner id → counties (matches lib/geo.ts PARTNERS). */
export const PARTNER_COUNTIES: Record<string, string[]> = {
  "jamii-tekelezi": ["Embu", "Tharaka-Nithi", "Meru", "Nyandarua"],
  "stawisha-pwani": ["Kilifi", "Kwale", "Mombasa", "Taita-Taveta"],
  "imarisha-jamii": ["Turkana"],
  "ampath-uzima": [
    "Uasin Gishu",
    "West Pokot",
    "Elgeyo-Marakwet",
    "Trans-Nzoia",
  ],
  "tujenge-jamii": ["Nakuru", "Baringo", "Samburu", "Laikipia", "Kajiado"],
  "dumisha-afya": ["Bungoma", "Busia"],
  "nuru-ya-mtoto": ["Kakamega", "Kisumu", "Nyamira", "Vihiga"],
};

/**
 * DOS IP "national" scope = the UNION of implementing-partner counties (24),
 * NOT all 47. Counties without an implementing partner (e.g. Nairobi,
 * Kiambu, Kisii) are out of scope for the DOS IP view too.
 */
export const DOS_IP_COUNTIES: string[] = Array.from(
  new Set(Object.values(PARTNER_COUNTIES).flat()),
);

// Registered after DOS_IP_COUNTIES is computed from the 7 partners above.
(PARTNER_COUNTIES as Record<string, string[]>)["national"] = DOS_IP_COUNTIES;

/** Dedupe a roster union by KHIS org-unit UID (defensive; county-scoped
 *  partners never overlap in practice, but keeps the national union exact). */
function dedupeFacilities(list: PartnerFacility[]): PartnerFacility[] {
  const seen = new Set<string>();
  const out: PartnerFacility[] = [];
  for (const f of list) {
    if (seen.has(f.uid)) continue;
    seen.add(f.uid);
    out.push(f);
  }
  return out;
}

/**
 * Partner id → facility roster (undefined until extracted for that partner).
 * `national` (DOS IP) = the UNION of all implementing-partner rosters, so the
 * national scope drills to the same county → sub-county → facility levels as
 * any single partner and only ever sees partner-assigned facilities.
 */
export const PARTNER_FACILITIES: Record<string, PartnerFacility[]> = {
  "jamii-tekelezi": JAMII_TEKELEZI_FACILITIES,
  "tujenge-jamii": TUJENGE_JAMII_FACILITIES,
  "dumisha-afya": DUMISHA_AFYA_FACILITIES,
  "imarisha-jamii": IMARISHA_JAMII_FACILITIES,
  "ampath-uzima": AMPATH_UZIMA_FACILITIES,
  "stawisha-pwani": STAWISHA_PWANI_FACILITIES,
  "nuru-ya-mtoto": NURU_YA_MTOTO_FACILITIES,
  national: dedupeFacilities([
    ...JAMII_TEKELEZI_FACILITIES,
    ...TUJENGE_JAMII_FACILITIES,
    ...DUMISHA_AFYA_FACILITIES,
    ...IMARISHA_JAMII_FACILITIES,
    ...AMPATH_UZIMA_FACILITIES,
    ...STAWISHA_PWANI_FACILITIES,
    ...NURU_YA_MTOTO_FACILITIES,
  ]),
};

/** County OU UIDs for a partner (all counties, regardless of roster). */
export function partnerCountyOUs(partnerId: string): string[] {
  const counties = PARTNER_COUNTIES[partnerId] ?? [];
  return counties.map((c) => COUNTY_OUS[c]).filter(Boolean) as string[];
}
/** Facility UIDs for a partner's roster (empty if none extracted yet). */
export function partnerFacilityOUs(partnerId: string): string[] {
  return (PARTNER_FACILITIES[partnerId] ?? []).map((f) => f.uid);
}

/** Does this partner have a facility-level roster (vs county-level fallback)? */
export function hasFacilityRoster(partnerId: string): boolean {
  return (PARTNER_FACILITIES[partnerId]?.length ?? 0) > 0;
}

const OU_COUNTY_MAP = ouCountyMap as Record<string, string>;
const OU_SUBCOUNTY_MAP = ouSubCountyMap as Record<string, string>;

/**
 * Resolve a roster sub-county value to its display name. Rosters extracted
 * from KHIS (Stawisha, Tujenge, Dumisha, Imarisha, AMPATH) store the KHIS
 * org-unit UID (usually a ward-level OU); names are resolved from
 * ou-subcounty-map.json. The original Jamii Tekelezi roster already stores
 * plain names, so those pass through unchanged.
 */
function resolveSubCountyName(value?: string): string {
  if (!value) return "";
  return /^[A-Za-z0-9]{11}$/.test(value)
    ? (OU_SUBCOUNTY_MAP[value] ?? "")
    : value;
}

/**
 * Facilities for a partner's roster, each with its COUNTY NAME,
 * SUB-COUNTY NAME and WARD resolved from the KHIS parent org-units
 * (ou-county-map.json / ou-subcounty-map.json). Used by filter dropdowns so
 * the Facility select lists the partner's real facilities and cascades with
 * the County select. Roster entries whose `county`/`subCounty` fields are
 * already names (e.g. the original Jamii Tekelezi roster) are used as-is.
 * `wardName` is a UI-only filter — it never affects KHIS queries.
 */
export function partnerFacilities(
  partnerId: string,
  countyName?: string,
  subCountyName?: string,
  wardName?: string,
): { name: string; county: string; subCounty: string; ward: string }[] {
  const roster = PARTNER_FACILITIES[partnerId] ?? [];
  return roster
    .map((f) => ({
      name: f.name,
      county:
        f.county && /^[A-Za-z0-9]{11}$/.test(f.county)
          ? (OU_COUNTY_MAP[f.county] ?? "")
          : (f.county ?? ""),
      subCounty: resolveSubCountyName(f.subCounty),
      // Some extracted rosters copy the facility UID into the ward column
      // (an extraction artifact) — keep only real ward names.
      ward: f.ward && /^[A-Za-z0-9]{11}$/.test(f.ward) ? "" : (f.ward ?? ""),
    }))
    .filter((f) => !countyName || f.county === countyName)
    .filter((f) => !subCountyName || f.subCounty === subCountyName)
    .filter((f) => !wardName || f.ward === wardName);
}

/**
 * Unique ward names present in a partner's roster, optionally scoped to one
 * county/sub-county. Used by the Ward filter dropdown — a UI-only helper so
 * the user knows exactly which facilities to tick in KHIS; it never affects
 * data queries. Rosters whose ward column holds facility UIDs (extraction
 * artifact) yield no options.
 */
export function partnerWards(
  partnerId: string,
  countyName?: string,
  subCountyName?: string,
): string[] {
  const seen = new Set<string>();
  for (const f of partnerFacilities(partnerId, countyName, subCountyName)) {
    if (f.ward) seen.add(f.ward);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}
export function partnerSubCounties(
  partnerId: string,
  countyName?: string,
): string[] {
  const seen = new Set<string>();
  for (const f of partnerFacilities(partnerId, countyName)) {
    if (f.subCounty) seen.add(f.subCounty);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

/**
 * Facility UIDs for a partner roster at a given county/sub-county scope.
 * Empty county+subCounty → the whole roster. Used by /api/khis to scope
 * analytics to exactly the facilities in the selected filter.
 */
export function partnerFacilityOUsFor(
  partnerId: string,
  countyName?: string,
  subCountyName?: string,
): string[] {
  const roster = PARTNER_FACILITIES[partnerId] ?? [];
  const county = countyName ?? "";
  const sub = subCountyName ?? "";
  const uids: string[] = [];
  for (const f of roster) {
    let fc = f.county;
    if (fc && /^[A-Za-z0-9]{11}$/.test(fc)) fc = OU_COUNTY_MAP[fc] ?? "";
    if (county && fc !== county) continue;
    if (sub && resolveSubCountyName(f.subCounty) !== sub) continue;
    uids.push(f.uid);
  }
  return uids;
}
