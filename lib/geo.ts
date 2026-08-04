// ---------------------------------------------------------------------------
// EWENE Geo Hierarchy — JTP partners, counties, sub-counties & scope filters
//
// Default scope: JTP (Joint Transition Partnership) = Embu, Meru, Nyandarua,
// Tharaka-Nithi. All dashboards aggregate at the partner level by default and
// let the user cascade down: Partner → County → Sub-County → Facility.
// ---------------------------------------------------------------------------

import { FacilityAssessment, KENYA_COUNTIES } from "@/lib/assessment";

export interface Partner {
  id: string;
  name: string;
  shortName: string;
  counties: string[];
}

export const JTP_COUNTIES = ["Embu", "Meru", "Nyandarua", "Tharaka-Nithi"];

export const PARTNERS: Partner[] = [
  {
    id: "jtp",
    name: "JTP — Joint Transition Partnership",
    shortName: "JTP",
    counties: JTP_COUNTIES,
  },
  // Additional partners default to the same JTP counties until their
  // allocated geographies are confirmed — adjust `counties` as needed.
  {
    id: "stawisha",
    name: "Stawisha",
    shortName: "Stawisha",
    counties: JTP_COUNTIES,
  },
  {
    id: "pep",
    name: "PEP",
    shortName: "PEP",
    counties: JTP_COUNTIES,
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
  Nyandarua: [
    "Kinangop",
    "Kipipiri",
    "Ndaragwa",
    "Ol Kalou",
    "Ol Joro Orok",
  ],
  "Tharaka-Nithi": ["Chuka", "Igambang'ombe", "Maara", "Tharaka"],
};

// ---------------------------------------------------------------------------
// Filter model
// ---------------------------------------------------------------------------

export interface GeoFilter {
  /** Partner id from PARTNERS ("jtp" | "national"). */
  partner: string;
  /** "" = all counties in the partner. */
  county: string;
  /** "" = all sub-counties in the county. */
  subCounty: string;
  /** "" = all facilities in the sub-county/county. */
  facility: string;
}

export const DEFAULT_GEO_FILTER: GeoFilter = {
  partner: "jtp",
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
  return Array.from(seen.values()).sort((x, y) =>
    x.name.localeCompare(y.name),
  );
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

/** "JTP" partner name for display in selects, e.g. "JTP (4 counties)". */
export function partnerOptionLabel(partner: Partner): string {
  return `${partner.shortName} (${partner.counties.length} counties)`;
}
