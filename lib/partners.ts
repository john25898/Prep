// ---------------------------------------------------------------------------
// Implementing-partner facility rosters + KHIS org-unit mapping
//
// Partner → counties → KHIS county OU UIDs (all 24 resolved live on KHIS,
// 2026-08-12). Facility rosters are the program-assigned lists (e.g. the JTP
// PrEP roster); runtime data always comes from national KHIS.
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
};

/**
 * Jamii Tekelezi facility roster — the JTP PrEP program facility list
 * (201 facilities across Embu, Tharaka-Nithi, Meru, Nyandarua).
 * Extracted 2026-08-12 from the program dataset assignment (metadata only);
 * UIDs verified present on national KHIS.
 */
import jtRoster from "@/data/jamii-tekelezi-facilities.json";

export const JAMII_TEKELEZI_FACILITIES: PartnerFacility[] =
  jtRoster as PartnerFacility[];

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
  national: Object.keys(COUNTY_OUS),
};

/** Partner id → facility roster (undefined until extracted for that partner). */
export const PARTNER_FACILITIES: Record<string, PartnerFacility[]> = {
  "jamii-tekelezi": JAMII_TEKELEZI_FACILITIES,
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
