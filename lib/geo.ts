// ---------------------------------------------------------------------------
// EWENE Geo Hierarchy — implementing partners, counties, sub-counties & scope
//
// Default scope: Jamii Tekelezi (Embu, Tharaka-Nithi, Meru, Nyandarua). All
// dashboards aggregate at the partner level by default and let the user
// cascade down: Partner → County → Sub-County → Facility.
// ---------------------------------------------------------------------------

import { FacilityAssessment, KENYA_COUNTIES } from "@/lib/assessment";
import { partnerSubCounties } from "@/lib/partners";
import type { PeriodMode } from "@/lib/period";
export type { PeriodMode };
export {
  periodToPe,
  monthsBetween,
  resolvePe,
  peToLabel,
  MONTH_NAMES,
} from "@/lib/period";

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
    name: "DOS IP (All 47 Counties)",
    shortName: "DOS IP",
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
  /** "" = all sub-counties in the county (roster-driven). */
  subCounty: string;
  /** "" = all facilities in the county/sub-county. */
  facility: string;
  /** "month" = a single reporting month, "range" = a multi-month range. */
  periodMode: PeriodMode;
  /** Single month as "YYYY-MM" (matches <input type="month">). */
  periodMonth: string;
  /** Range start date "YYYY-MM-DD". */
  periodStart: string;
  /** Range end date "YYYY-MM-DD". */
  periodEnd: string;
}

export const DEFAULT_GEO_FILTER: GeoFilter = {
  partner: "jamii-tekelezi",
  county: "",
  subCounty: "",
  facility: "",
  // Default period = May 2025 (the reporting month every chart was pinned to).
  periodMode: "month",
  periodMonth: "2025-05",
  periodStart: "2025-05-01",
  periodEnd: "2025-07-31",
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

/**
 * Sub-county options for a county, used by the Assessment dialog. Roster
 * names take precedence so the dialog matches the scope-filter dropdown
 * (which is roster-driven via partnerSubCounties); counties without a
 * facility roster yet fall back to the static map, then an empty list
 * (the dialog shows a free-text field in that case).
 */
export function getSubCounties(county: string): string[] {
  const seen = new Set<string>();
  for (const p of PARTNERS) {
    for (const sc of partnerSubCounties(p.id, county)) seen.add(sc);
  }
  if (seen.size > 0) {
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }
  return SUB_COUNTIES[county] ?? [];
}

const norm = (s: string) => s.trim().toLowerCase();

/** Does an assessment fall inside the given scope? */
export function geoMatches(a: FacilityAssessment, filter: GeoFilter): boolean {
  if (filter.county && norm(a.county) !== norm(filter.county)) return false;
  if (
    filter.subCounty &&
    a.subCounty &&
    norm(a.subCounty) !== norm(filter.subCounty)
  )
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

/** Human-readable breadcrumb of the current scope, e.g. "Jamii Tekelezi → Nakuru". */
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
