"use client";

// ---------------------------------------------------------------------------
// EWENE Facility Readiness Assessment — data layer
// Matches the "Questionnaire Facility assessment Readiness tool" (Domain 3)
// Scoring: Yes = 2 pts, Partial = 1 pt, No = 0 pts, N/A = excluded from denominator
// Domain score = total points / total possible points (%), Ready >= 80,
// Partially ready 60–79, Not ready < 60.
// ---------------------------------------------------------------------------

export type AssessmentResponse = "yes" | "partial" | "no" | "na";

export type AssessmentType = "baseline" | "quarterly" | "follow-up";

export interface AssessmentItemValue {
  response: AssessmentResponse;
  evidenceChecked: boolean;
  gapAction: string;
  /** Sub-items ticked as present/available (e.g. individual tracer commodities). */
  checked?: string[];
}

export interface FacilityAssessment {
  id: string;
  facilityName: string;
  mflCode: string;
  facilityLevel: string;
  county: string;
  subCounty: string;
  date: string;
  assessmentType: AssessmentType;
  assessorName: string;
  items: Record<string, AssessmentItemValue>;
  createdAt: string;
}

export interface QuestionnaireItemDef {
  id: string;
  shortLabel: string;
  question: string;
  evidenceSources: string;
  /** Tick-list of sub-items the assessor marks present/available. */
  checklist?: string[];
}

export const QUESTIONNAIRE_ITEMS: QuestionnaireItemDef[] = [
  {
    id: "3.1",
    shortLabel: "Tracer MNH Commodities",
    question:
      "Are all tracer MNH commodities available on the day of assessment, and has the facility had zero stockout of oxytocin, carbetocin, magnesium sulphate, tranexamic acid, and benzyl penicillin during the reporting period?",
    evidenceSources: "LMIS, KHIS, bin cards, stock cards, physical count",
    checklist: [
      "Oxytocin",
      "Carbetocin",
      "Magnesium sulphate",
      "Tranexamic acid",
      "Benzyl penicillin",
    ],
  },
  {
    id: "3.2",
    shortLabel: "Functional Blood Transfusion Services",
    question:
      "Does the facility have functional blood transfusion services appropriate for its level, including blood availability, trained staff, transfusion supplies, cross-matching capacity, cold storage or referral linkage, and documentation of transfusion services?",
    evidenceSources:
      "HFA-QOC, blood bank records, transfusion register, equipment observation",
    checklist: [
      "Blood availability",
      "Trained staff",
      "Transfusion supplies",
      "Cross-matching capacity",
      "Cold storage / referral linkage",
      "Documentation of transfusion services",
    ],
  },
  {
    id: "3.3",
    shortLabel: "Oxygen & Neonatal CPAP Readiness",
    question:
      "Is there a functional oxygen supply for maternal and newborn emergencies, and is neonatal CPAP available, functional, supported by trained staff, consumables, maintenance arrangements, and clinical protocols?",
    evidenceSources:
      "HFA-QOC, facility walk-through, oxygen log, CPAP checklist, maintenance records",
    checklist: [
      "Functional oxygen supply",
      "Neonatal CPAP available",
      "Trained staff",
      "Consumables",
      "Maintenance arrangements",
      "Clinical protocols",
    ],
  },
  {
    id: "3.4",
    shortLabel: "Equipment Functionality & Active Use",
    question:
      "For IP-procured or supported equipment, is the equipment installed, functional, in active clinical use, recorded in the asset register, maintained, and supported by spare parts, consumables, and trained users six months after delivery?",
    evidenceSources:
      "Facility assessment, asset register, maintenance log, user training records, observation",
    checklist: [
      "Installed",
      "Functional",
      "In active clinical use",
      "Recorded in asset register",
      "Maintained",
      "Spare parts & consumables",
      "Trained users",
    ],
  },
  {
    id: "3.5",
    shortLabel: "BEmONC Signal Functions (7)",
    question:
      "Has the facility performed all seven BEmONC signal functions in the required reference period: parenteral antibiotics, parenteral uterotonics, parenteral anticonvulsants, manual removal of placenta, removal of retained products, assisted vaginal delivery, and neonatal resuscitation?",
    evidenceSources:
      "HFA-QOC, maternity register, procedure records, skills log, staff interview",
    checklist: [
      "Parenteral antibiotics",
      "Parenteral uterotonics",
      "Parenteral anticonvulsants",
      "Manual removal of placenta",
      "Removal of retained products",
      "Assisted vaginal delivery",
      "Neonatal resuscitation",
    ],
  },
  {
    id: "3.6",
    shortLabel: "CEmONC Signal Functions (9)",
    question:
      "For Level 4/5 facilities, has the facility performed all nine CEmONC signal functions, including the seven BEmONC functions plus caesarean section and blood transfusion, with appropriate staffing, supplies, theatre readiness, and referral support?",
    evidenceSources:
      "HFA-QOC, theatre register, maternity register, transfusion register, duty roster",
    checklist: [
      "Parenteral antibiotics",
      "Parenteral uterotonics",
      "Parenteral anticonvulsants",
      "Manual removal of placenta",
      "Removal of retained products",
      "Assisted vaginal delivery",
      "Neonatal resuscitation",
      "Caesarean section",
      "Blood transfusion",
    ],
  },
  {
    id: "3.7",
    shortLabel: "Essential Newborn Care Bundle",
    question:
      "Does the facility consistently provide the essential newborn care bundle, including immediate drying and warming, skin-to-skin care, early initiation of breastfeeding, cord care, neonatal resuscitation readiness, KMC for eligible babies, infection prevention, and timely PNC documentation?",
    evidenceSources:
      "Newborn register, maternity register, observation, KMC register, PNC records",
    checklist: [
      "Immediate drying & warming",
      "Skin-to-skin care",
      "Early initiation of breastfeeding",
      "Cord care",
      "Neonatal resuscitation readiness",
      "KMC for eligible babies",
      "Infection prevention",
      "Timely PNC documentation",
    ],
  },
  {
    id: "3.8",
    shortLabel: "Blood & Blood Product Stockout Prevention",
    question:
      "Did the facility have no stockout of blood or blood products during the reporting period, and is there a documented mechanism for minimum stock monitoring, emergency replenishment, referral linkage, and escalation of blood shortages?",
    evidenceSources: "LMIS, blood bank records, county blood supply reports",
    checklist: [
      "No stockout of blood / blood products",
      "Minimum stock monitoring",
      "Emergency replenishment",
      "Referral linkage",
      "Escalation of blood shortages",
    ],
  },
];

export const FACILITY_LEVELS = [
  "Level 2",
  "Level 3",
  "Level 4",
  "Level 5",
  "Other",
];

export const KENYA_COUNTIES = [
  "Mombasa",
  "Kwale",
  "Kilifi",
  "Tana River",
  "Lamu",
  "Taita-Taveta",
  "Garissa",
  "Wajir",
  "Mandera",
  "Marsabit",
  "Isiolo",
  "Meru",
  "Tharaka-Nithi",
  "Embu",
  "Kitui",
  "Machakos",
  "Makueni",
  "Nyandarua",
  "Nyeri",
  "Kirinyaga",
  "Murang'a",
  "Kiambu",
  "Turkana",
  "West Pokot",
  "Samburu",
  "Trans-Nzoia",
  "Uasin Gishu",
  "Elgeyo-Marakwet",
  "Nandi",
  "Baringo",
  "Laikipia",
  "Nakuru",
  "Narok",
  "Kajiado",
  "Kericho",
  "Bomet",
  "Kakamega",
  "Vihiga",
  "Bungoma",
  "Busia",
  "Siaya",
  "Kisumu",
  "Homa Bay",
  "Migori",
  "Kisii",
  "Nyamira",
  "Nairobi",
];

export const RESPONSE_OPTIONS: {
  value: AssessmentResponse;
  label: string;
  points: number | null;
}[] = [
  { value: "yes", label: "Yes", points: 2 },
  { value: "partial", label: "Partial", points: 1 },
  { value: "no", label: "No", points: 0 },
  { value: "na", label: "N/A", points: null },
];

export const STORAGE_KEY = "ewene_facility_assessments_v1";
export const ASSESSMENTS_CHANGED_EVENT = "ewene:assessments-changed";

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

export function itemPoints(response: AssessmentResponse): number | null {
  switch (response) {
    case "yes":
      return 2;
    case "partial":
      return 1;
    case "no":
      return 0;
    case "na":
      return null; // excluded from denominator
  }
}

export function assessmentScore(assessment: FacilityAssessment): {
  total: number;
  possible: number;
  percentage: number;
  answered: number;
  naCount: number;
} {
  let total = 0;
  let possible = 0;
  let answered = 0;
  let naCount = 0;
  for (const item of QUESTIONNAIRE_ITEMS) {
    const value = assessment.items[item.id];
    if (!value || value.response === "na") {
      if (value?.response === "na") naCount += 1;
      continue;
    }
    const pts = itemPoints(value.response) ?? 0;
    total += pts;
    possible += 2;
    answered += 1;
  }
  const percentage = possible > 0 ? (total / possible) * 100 : 0;
  return { total, possible, percentage, answered, naCount };
}

export type ReadinessStatus = "green" | "amber" | "red";

export function readinessStatus(percentage: number): ReadinessStatus {
  if (percentage >= 80) return "green";
  if (percentage >= 60) return "amber";
  return "red";
}

export function readinessLabel(percentage: number): string {
  if (percentage >= 80) return "Ready";
  if (percentage >= 60) return "Partially Ready";
  return "Not Ready";
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export function loadAssessments(): FacilityAssessment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistAssessments(assessments: FacilityAssessment[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assessments));
  window.dispatchEvent(new Event(ASSESSMENTS_CHANGED_EVENT));
}

export function saveAssessment(assessment: FacilityAssessment) {
  const all = loadAssessments();
  const idx = all.findIndex((a) => a.id === assessment.id);
  if (idx >= 0) all[idx] = assessment;
  else all.unshift(assessment);
  persistAssessments(all);
}

export function deleteAssessment(id: string) {
  persistAssessments(loadAssessments().filter((a) => a.id !== id));
}

export function createEmptyAssessment(): FacilityAssessment {
  const items: Record<string, AssessmentItemValue> = {};
  for (const item of QUESTIONNAIRE_ITEMS) {
    items[item.id] = {
      response: "na",
      evidenceChecked: false,
      gapAction: "",
      checked: [],
    };
  }
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `a-${Date.now()}`,
    facilityName: "",
    mflCode: "",
    facilityLevel: "Level 3",
    county: "",
    subCounty: "",
    date: new Date().toISOString().slice(0, 10),
    assessmentType: "baseline",
    assessorName: "",
    items,
    createdAt: new Date().toISOString(),
  };
}

function createResponseMap(responses: Record<string, AssessmentResponse>) {
  const items: Record<string, AssessmentItemValue> = {};
  for (const item of QUESTIONNAIRE_ITEMS) {
    items[item.id] = {
      response: responses[item.id] ?? "na",
      evidenceChecked: true,
      gapAction: "",
      checked: [],
    };
  }
  return items;
}

// ---------------------------------------------------------------------------
// Aggregate indicator helpers (used by Home + Readiness dashboards)
// ---------------------------------------------------------------------------

/** % of assessed facilities answering "yes" to a given item (N/A excluded). */
export function yesRate(
  assessments: FacilityAssessment[],
  itemId: string,
): number | null {
  const nonNa = assessments.filter((a) => {
    const v = a.items[itemId];
    return v && v.response !== "na";
  });
  if (nonNa.length === 0) return null;
  const yes = nonNa.filter((a) => a.items[itemId].response === "yes").length;
  return (yes / nonNa.length) * 100;
}

/** % of assessed facilities scoring "yes" OR "partial" (N/A excluded). */
export function yesOrPartialRate(
  assessments: FacilityAssessment[],
  itemId: string,
): number | null {
  const nonNa = assessments.filter((a) => {
    const v = a.items[itemId];
    return v && v.response !== "na";
  });
  if (nonNa.length === 0) return null;
  const ok = nonNa.filter((a) => {
    const r = a.items[itemId].response;
    return r === "yes" || r === "partial";
  }).length;
  return (ok / nonNa.length) * 100;
}

export function averageReadiness(assessments: FacilityAssessment[]): number {
  if (assessments.length === 0) return 0;
  const sum = assessments.reduce(
    (acc, a) => acc + assessmentScore(a).percentage,
    0,
  );
  return sum / assessments.length;
}
