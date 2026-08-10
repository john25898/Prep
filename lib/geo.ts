// ---------------------------------------------------------------------------
// EWENE Geo Hierarchy — implementing partners, counties, sub-counties & scope
//
// Default scope: Jamii Tekelezi (Embu, Tharaka-Nithi, Meru, Nyandarua). All
// dashboards aggregate at the partner level by default and let the user
// cascade down: Partner → County → Sub-County → Facility.
// ---------------------------------------------------------------------------

import { FacilityAssessment, KENYA_COUNTIES } from "@/lib/assessment";

export interface Partner {
  id: string;
  name: string;
  shortName: string;
  counties: string[];
}

export const PARTNERS: Partner[] = [
  {
    id: "jamii-tekelezi",
    name: "Jamii Tekelezi",
    shortName: "Jamii Tekelezi",
    counties: ["Embu", "Tharaka-Nithi", "Meru", "Nyandarua"],
  },
  {
    id: "stawisha-pwani",
    name: "Stawisha Pwani",
    shortName: "Stawisha Pwani",
    counties: ["Kilifi", "Kwale", "Mombasa", "Taita-Taveta"],
  },
  {
    id: "imarisha-jamii",
    name: "Imarisha Jamii",
    shortName: "Imarisha Jamii",
    counties: ["Turkana"],
  },
  {
    id: "ampath-uzima",
    name: "AMPATH Uzima",
    shortName: "AMPATH Uzima",
    counties: ["Uasin Gishu", "West Pokot", "Elgeyo-Marakwet", "Trans-Nzoia"],
  },
  {
    id: "tujenge-jamii",
    name: "Tujenge Jamii",
    shortName: "Tujenge Jamii",
    counties: ["Nakuru", "Baringo", "Samburu", "Laikipia", "Kajiado"],
  },
  {
    id: "dumisha-afya",
    name: "Dumisha Afya",
    shortName: "Dumisha Afya",
    counties: ["Bungoma", "Busia"],
  },
  {
    id: "nuru-ya-mtoto",
    name: "Nuru Ya Mtoto",
    shortName: "Nuru Ya Mtoto",
    counties: ["Kakamega", "Kisumu", "Nyamira", "Vihiga"],
  },
  {
    id: "national",
    name: "National (All 47 Counties)",
    shortName: "National",
    counties: KENYA_COUNTIES,
  },
];

// Sub-counties per county (KHIS administrative units).
// JTP counties are fully mapped; others fall back to data-derived options.
export const SUB_COUNTIES: Record<string, string[]> = {
  Embu: ["Manyatta", "Runyenjes", "Mbeere South", "Mbeere North"],
  Meru: [
    "Buuri",
    "Igembe Central",
    "Igembe North",
    "Igembe South",
    "Imenti Central",
    "Imenti North",
    "Imenti South",
    "Tigania Central",
    "Tigania East",
    "Tigania West",
  ],
  Nyandarua: ["Kinangop", "Kipipiri", "Ndaragwa", "Ol Kalou", "Ol Joro Orok"],
  "Tharaka-Nithi": ["Chuka", "Igambang'ombe", "Maara", "Tharaka"],
};

// ---------------------------------------------------------------------------
// Filter model
// ---------------------------------------------------------------------------

export interface GeoFilter {
  /** Partner id from PARTNERS (e.g. "jamii-tekelezi" | "national"). */
  partner: string;
  /** "" = all counties in the partner. */
  county: string;
  /** "" = all sub-counties in the county. */
  subCounty: string;
  /** "" = all facilities in the sub-county/county. */
  facility: string;
}

export const DEFAULT_GEO_FILTER: GeoFilter = {
  partner: "jamii-tekelezi",
  county: "",
  subCounty: "",
  facility: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getPartner(partnerId: string): Partner | undefined {
  return PARTNERS.find((p) => p.id === partnerId);
}

export function getCountiesForPartner(partnerId: string): string[] {
  return getPartner(partnerId)?.counties ?? KENYA_COUNTIES;
}

/** Static sub-county list for a county (empty if not mapped). */
export function getSubCounties(county: string): string[] {
  return SUB_COUNTIES[county] ?? [];
}

const norm = (s: string) => s.trim().toLowerCase();

/** Does an assessment fall inside the given scope? */
export function geoMatches(a: FacilityAssessment, filter: GeoFilter): boolean {
  if (filter.county && norm(a.county) !== norm(filter.county)) return false;
  if (filter.subCounty && norm(a.subCounty) !== norm(filter.subCounty))
    return false;
  if (filter.facility && norm(a.facilityName) !== norm(filter.facility))
    return false;
  return true;
}

export function applyGeoFilter(
  assessments: FacilityAssessment[],
  filter: GeoFilter,
): FacilityAssessment[] {
  return assessments.filter((a) => geoMatches(a, filter));
}

/** Unique facilities within the county/sub-county scope (for the dropdown). */
export function facilityOptions(
  assessments: FacilityAssessment[],
  filter: GeoFilter,
): { name: string; mfl: string; county: string; subCounty: string }[] {
  const seen = new Map<
    string,
    { name: string; mfl: string; county: string; subCounty: string }
  >();
  const scope = { ...filter, facility: "" };
  for (const a of assessments) {
    if (!geoMatches(a, scope)) continue;
    const name = a.facilityName.trim();
    if (!name) continue;
    if (!seen.has(norm(name))) {
      seen.set(norm(name), {
        name,
        mfl: a.mflCode || "—",
        county: a.county,
        subCounty: a.subCounty,
      });
    }
  }
  return Array.from(seen.values()).sort((x, y) => x.name.localeCompare(y.name));
}

/** Human-readable breadcrumb of the current scope, e.g. "JTP → Nakuru → Njoro". */
export function geoScopeLabel(filter: GeoFilter): string {
  const parts = [getPartner(filter.partner)?.shortName ?? filter.partner];
  if (filter.county) {
    parts.push(filter.county);
    if (filter.subCounty) parts.push(filter.subCounty);
    if (filter.facility) parts.push(filter.facility);
  }
  return parts.join(" → ");
}

/** Partner name for display in selects, e.g. "Jamii Tekelezi (4 counties)". */
export function partnerOptionLabel(partner: Partner): string {
  const n = partner.counties.length;
  return `${partner.shortName} (${n} ${n === 1 ? "county" : "counties"})`;
}
