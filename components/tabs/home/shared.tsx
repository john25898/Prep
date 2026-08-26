"use client";

import {
  Activity,
  CalendarDays,
  Database,
  Flag,
  HeartPulse,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { averageReadiness, type FacilityAssessment } from "@/lib/assessment";

// Live KHIS county coverage — Jamii Tekelezi counties (pe 202505).
export const JT_COVERAGE_COUNTIES = [
  "Embu",
  "Tharaka-Nithi",
  "Meru",
  "Nyandarua",
];

// Home — 5-Domain summary across the 7 implementing partners
// ---------------------------------------------------------------------------

// Illustrative KHIS/EMR baselines per partner (Domains 1, 2, 4 & 5).
// Domain 3 (Readiness) is computed live from entered facility assessments.
export const PARTNER_DOMAIN_SCORES: Record<
  string,
  { d1: number; d2: number; d4: number; d5: number }
> = {
  "jamii-tekelezi": { d1: 87.7, d2: 63, d4: 67, d5: 62 },
  "stawisha-pwani": { d1: 84.2, d2: 58, d4: 71, d5: 58 },
  "imarisha-jamii": { d1: 76.5, d2: 51, d4: 62, d5: 54 },
  "ampath-uzima": { d1: 89.1, d2: 66, d4: 74, d5: 66 },
  "tujenge-jamii": { d1: 81.0, d2: 55, d4: 60, d5: 57 },
  "dumisha-afya": { d1: 79.8, d2: 54, d4: 64, d5: 52 },
  "nuru-ya-mtoto": { d1: 86.3, d2: 61, d4: 69, d5: 60 },
};

// Illustrative per-county scores (Domains 1, 2, 4 & 5) for the county
// distribution view. Domain 3 (Readiness) is computed live per county.
export const COUNTY_DOMAIN_SCORES: Record<
  string,
  { d1: number; d2: number; d4: number; d5: number }
> = {
  // Jamii Tekelezi
  Embu: { d1: 89, d2: 65, d4: 70, d5: 64 },
  "Tharaka-Nithi": { d1: 86, d2: 60, d4: 64, d5: 60 },
  Meru: { d1: 88, d2: 64, d4: 68, d5: 63 },
  Nyandarua: { d1: 87, d2: 62, d4: 66, d5: 61 },
  // Stawisha Pwani
  Kilifi: { d1: 83, d2: 56, d4: 70, d5: 57 },
  Kwale: { d1: 82, d2: 55, d4: 69, d5: 55 },
  Mombasa: { d1: 87, d2: 63, d4: 75, d5: 62 },
  "Taita-Taveta": { d1: 85, d2: 58, d4: 70, d5: 58 },
  // Imarisha Jamii
  Turkana: { d1: 76.5, d2: 51, d4: 62, d5: 54 },
  // AMPATH Uzima
  "Uasin Gishu": { d1: 91, d2: 68, d4: 76, d5: 68 },
  "West Pokot": { d1: 87, d2: 63, d4: 71, d5: 63 },
  "Elgeyo-Marakwet": { d1: 89, d2: 66, d4: 74, d5: 66 },
  "Trans-Nzoia": { d1: 90, d2: 67, d4: 75, d5: 67 },
  // Tujenge Jamii
  Nakuru: { d1: 84, d2: 58, d4: 63, d5: 60 },
  Baringo: { d1: 80, d2: 54, d4: 59, d5: 56 },
  Samburu: { d1: 75, d2: 48, d4: 55, d5: 52 },
  Laikipia: { d1: 82, d2: 56, d4: 61, d5: 58 },
  Kajiado: { d1: 83, d2: 57, d4: 62, d5: 59 },
  // Dumisha Afya
  Bungoma: { d1: 80, d2: 55, d4: 65, d5: 53 },
  Busia: { d1: 79, d2: 53, d4: 63, d5: 51 },
  // Nuru Ya Mtoto
  Kakamega: { d1: 85, d2: 60, d4: 68, d5: 59 },
  Kisumu: { d1: 89, d2: 64, d4: 72, d5: 63 },
  Nyamira: { d1: 87, d2: 62, d4: 70, d5: 61 },
  Vihiga: { d1: 84, d2: 58, d4: 66, d5: 57 },
};

export const DOMAIN_COLUMNS: {
  key: "d1" | "d2" | "d3" | "d4" | "d5";
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "d1",
    label: "1 · PMTCT/VTP Quality of Care",
    icon: <Stethoscope className="w-4 h-4 text-emerald-600" />,
  },
  {
    key: "d2",
    label: "2 · Coverage (90:90:80:80)",
    icon: <TrendingUp className="w-4 h-4 text-teal-600" />,
  },
  {
    key: "d3",
    label: "3 · Readiness & Safe Systems",
    icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
  },
  {
    key: "d4",
    label: "4 · MPDSR & Accountability",
    icon: <Activity className="w-4 h-4 text-red-600" />,
  },
  {
    key: "d5",
    label: "5 · Data Systems",
    icon: <Database className="w-4 h-4 text-indigo-600" />,
  },
];

// Colors for the per-partner county comparison bar charts.
export const BAR_SERIES: { key: string; name: string; color: string }[] = [
  { key: "d1", name: "D1 · QoC", color: "#059669" },
  { key: "d2", name: "D2 · Coverage", color: "#0d9488" },
  { key: "d3", name: "D3 · Readiness", color: "#84cc16" },
  { key: "d4", name: "D4 · MPDSR", color: "#dc2626" },
  { key: "d5", name: "D5 · Data", color: "#4f46e5" },
  { key: "overall", name: "Overall", color: "#334155" },
];

export function scoreTone(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return { bg: "bg-slate-50", text: "text-slate-400" };
  }
  if (value >= 80) return { bg: "bg-emerald-50", text: "text-emerald-700" };
  if (value >= 60) return { bg: "bg-amber-50", text: "text-amber-700" };
  return { bg: "bg-red-50", text: "text-red-700" };
}

/** Domain 3 readiness averaged over assessments in the given counties. */
export function readinessForCounties(
  assessments: FacilityAssessment[],
  counties: string[],
): { count: number; avg: number | null } {
  const scoped = assessments.filter((a) =>
    counties.some(
      (c) => c.trim().toLowerCase() === (a.county ?? "").trim().toLowerCase(),
    ),
  );
  return {
    count: scoped.length,
    avg: scoped.length > 0 ? averageReadiness(scoped) : null,
  };
}

// ---------------------------------------------------------------------------
// Results & Impact executive layer — §5.1, §5.2, §5.3, §5.4, §6, §8, §9
// ---------------------------------------------------------------------------

/** Progress ratio → status tone for target tracking. */
export function targetTone(ratio: number) {
  if (ratio >= 1)
    return {
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      label: "On target",
      bar: "bg-emerald-500",
    };
  if (ratio >= 0.9)
    return {
      dot: "bg-amber-500",
      text: "text-amber-700",
      label: "Near target",
      bar: "bg-amber-500",
    };
  return {
    dot: "bg-red-500",
    text: "text-red-700",
    label: "Below target",
    bar: "bg-red-500",
  };
}

// §5.1 — Core Impact Indicators (the three headline mortality outcomes)
export const CORE_IMPACT: {
  key: string;
  label: string;
  baseline: string;
  target: string;
  unit: string;
  gradient: string;
  ring: string;
  note: string;
}[] = [
  {
    key: "MMR",
    label: "Maternal Mortality Ratio",
    baseline: "355",
    target: "≤140",
    unit: "per 100,000 live births",
    gradient: "from-rose-50 to-red-50 border-rose-200",
    ring: "text-rose-700",
    note: "Baseline 355 → target ≤140 by 2028",
  },
  {
    key: "NMR",
    label: "Neonatal Mortality Rate",
    baseline: "21",
    target: "≤12",
    unit: "per 1,000 live births",
    gradient: "from-amber-50 to-orange-50 border-amber-200",
    ring: "text-amber-700",
    note: "Baseline 21 → target ≤12 by 2028",
  },
  {
    key: "SB",
    label: "Stillbirth Rate",
    baseline: "19",
    target: "≤12",
    unit: "per 1,000 births",
    gradient: "from-teal-50 to-emerald-50 border-teal-200",
    ring: "text-teal-700",
    note: "Baseline 19 → target ≤12 by 2028",
  },
];

// §5.2 — EWENE 90:90:80:80 coverage pillars
export const PILLARS = [
  {
    pillar: "90",
    label: "ANC Coverage",
    indicator: "At least four ANC visits",
    target: 90,
    current: 52,
  },
  {
    pillar: "90",
    label: "Skilled Delivery",
    indicator: "Skilled birth attendance coverage",
    target: 90,
    current: 70,
  },
  {
    pillar: "80",
    label: "Early PNC",
    indicator: "Postnatal care within 48 hours",
    target: 80,
    current: 66.6,
  },
  {
    pillar: "80",
    label: "Continuity of Care",
    indicator: "Retention of the mother–baby pair",
    target: 80,
    current: 68.4,
  },
];

// §5.3 — VTP Quality-of-Care scoreboard (eight core PMTCT indicators)
// Bar 1 is ATT% (ANC attendance) = 4th ANC attended ÷ 1st ANC attendance.
// Bars 4 (EID coverage) & 5 (ART among PCR+ infants) are computed from the
// monthly VTP data-entry form (0–2m ÷ total samples; ART ÷ PCR+ results).
export const VTP_QOC = [
  {
    no: 1,
    label: "ANC attendance (ATT%) — 4th ANC attended ÷ 1st ANC attended",
    short: "ATT%",
    code: "ATT",
    source: "KHIS",
    target: 95,
    op: ">",
    current: 94,
  },
  {
    no: 2,
    label: "Testing for PBFW",
    short: "HIV test",
    code: "PMTCT_STAT_N",
    source: "KHIS",
    target: 95,
    op: ">",
    current: 96,
  },
  {
    no: 3,
    label: "ART initiation for PBFW",
    short: "ART init.",
    code: "PMTCT_ART",
    source: "KHIS",
    target: 95,
    op: ">",
    current: 87.7,
  },
  {
    no: 4,
    label: "EID coverage — 0–2m samples ÷ total (0–12m) samples",
    short: "EID cov.",
    code: "EID_COV",
    source: "VTP entry form",
    target: 98,
    op: ">",
    current: 88,
  },
  {
    no: 5,
    label: "ART initiated among PCR+ infants — ART ÷ PCR+ results",
    short: "PCR+ ART",
    code: "PMTCT_HEI_ART",
    source: "VTP entry form",
    target: 100,
    op: "=",
    current: 92.3,
  },
  {
    no: 6,
    label: "Delivery among HIV+ mothers",
    short: "Delivery",
    code: "Deliveries",
    source: "KHIS",
    target: 90,
    op: ">",
    current: 92,
    notReported: true,
  },
  {
    no: 7,
    label: "HEI final outcome 18–24 months",
    short: "HEI 18–24m",
    code: "PMTCT_FO",
    source: "HCA entry form",
    target: 95,
    op: ">",
    current: 96.6,
    notReported: true,
  },
  {
    no: 8,
    label: "Retention of the mother–baby pair",
    short: "MBP ret.",
    code: "MBP retention",
    source: "EMR",
    target: 95,
    op: ">",
    current: 91,
    notReported: true,
  },
];

// §5.4 — Facility Readiness & Safe Systems (five systemic enablers)
export const SAFE_SYSTEMS = [
  {
    label: "Zero stockout of tracer MNH commodities",
    short: "No stockouts",
    detail: "oxytocin · carbetocin · MgSO₄ · TXA · benzyl penicillin",
    source: "LMIS/KHIS",
    freq: "Monthly",
    target: 100,
    current: 72,
  },
  {
    label: "Functional blood transfusion services",
    short: "Blood svcs.",
    detail: "Level 4 facilities",
    source: "HFA-QOC",
    freq: "Quarterly",
    target: 75,
    current: 66,
  },
  {
    label: "Functional oxygen/CPAP for neonates",
    short: "Oxygen/CPAP",
    detail: "Level 4 facilities",
    source: "HFA-QOC",
    freq: "Quarterly",
    target: 60,
    current: 20,
  },
  {
    label: "Procured equipment functional & in use",
    short: "Equipment",
    detail: "six months post-delivery",
    source: "Facility assessment",
    freq: "Semi-annual",
    target: 90,
    current: 88,
  },
  {
    label: "Maternal & neonatal deaths audited (MPDSR)",
    short: "MPDSR audits",
    detail: "supported facilities",
    source: "KHIS",
    freq: "Monthly",
    target: 100,
    current: 81,
  },
];

// Deterministic pseudo-variation so every county gets its own value.
export function seededJitter(key: string, spread: number): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (((h >>> 0) % (spread * 2 + 1)) - spread) / 2;
}

// County series palette for the per-partner indicator charts (max 5 counties).
export const COUNTY_COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
];

/** VTP QoC value for one county, scaled by the county's D1 vs the partner's D1. */
export function countyVtpValue(
  base: number,
  county: string,
  partnerId: string,
  idx: number,
): number {
  const partnerD1 = PARTNER_DOMAIN_SCORES[partnerId]?.d1 ?? base;
  const countyD1 = COUNTY_DOMAIN_SCORES[county]?.d1 ?? partnerD1;
  const factor = countyD1 / partnerD1;
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(base * factor + seededJitter(`${county}:v${idx}`, 6)),
    ),
  );
}

// Theory of Change (document §2 — if / then / resulting in)
export const TOC_STEPS = [
  {
    title: "If",
    icon: RefreshCw,
    tone: "from-sky-50 to-blue-50 border-sky-200",
    iconTone: "text-sky-600",
    text: "DoS IPs strengthen real-time monitoring of VTP/MNCH indicators, ensure facility readiness (blood, oxygen, commodities, equipment), and actively participate in EWENE and RRI governance and review mechanisms.",
  },
  {
    title: "Then",
    icon: TrendingUp,
    tone: "from-indigo-50 to-violet-50 border-indigo-200",
    iconTone: "text-indigo-600",
    text: "Supported facilities deliver higher-quality, uninterrupted care to HIV-positive pregnant & breastfeeding women, mother–baby pairs, and HIV-exposed infants.",
  },
  {
    title: "Resulting in",
    icon: Flag,
    tone: "from-emerald-50 to-teal-50 border-emerald-200",
    iconTone: "text-emerald-600",
    text: "Reduced missed service opportunities, improved PMTCT outcomes, and a measurable contribution to Kenya's EWENE 2026–2028 maternal & neonatal mortality targets.",
  },
];

// §9 — Expected Outcomes clusters
export const EXPECTED_OUTCOMES = [
  {
    icon: Stethoscope,
    tone: "text-sky-600 bg-sky-50",
    title: "Service Coverage & Access",
    items: [
      "Improved ANC4+ coverage and timely identification of PBFW",
      "Improved skilled birth attendance among HIV-positive mothers",
      "Improved continuum-of-care tracking & real-time dashboard visibility",
    ],
  },
  {
    icon: HeartPulse,
    tone: "text-rose-600 bg-rose-50",
    title: "HIV · PMTCT · Mother–Baby Pair",
    items: [
      "Reduced missed opportunities for HIV testing & ART initiation among PBFW",
      "Improved viral load uptake and suppression",
      "Timely early infant diagnosis, incl. birth testing within 24 hours; timely ART for PCR+ infants",
      "Improved mother–baby pair retention & favorable 18–24 month outcomes",
    ],
  },
  {
    icon: ShieldCheck,
    tone: "text-emerald-600 bg-emerald-50",
    title: "Facility Readiness & Safe Systems",
    items: [
      "Zero stockouts of tracer MNH commodities at supported facilities",
      "Improved blood availability and oxygen/CPAP functionality",
      "All procured equipment functional and in active use at six months post-delivery",
      "100% of maternal and neonatal deaths audited monthly",
    ],
  },
  {
    icon: Activity,
    tone: "text-violet-600 bg-violet-50",
    title: "Data Use & Accountability",
    items: [
      "Enhanced accountability across facility, county, national & partner levels",
      "Real-time dashboard reporting feeding EWENE & RRI review platforms",
      "Contribution to reduced maternal & neonatal mortality (EWENE 2026–2028 targets)",
    ],
  },
];

// §6 — Reporting cadence
export const CADENCE = [
  {
    freq: "Monthly",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    items:
      "Facility-level PMTCT/VTP indicators · commodity stockout reports · MPDSR death audits · dashboard uploads & DQA · DoS VTP TWG review · RRI dashboard updates",
  },
  {
    freq: "Quarterly",
    tone: "bg-teal-50 text-teal-700 border-teal-200",
    items:
      "County scorecards · mother–baby pair retention · blood & oxygen readiness · BEmONC/CEmONC functionality · MPDSR recommendation tracking · EMR audit",
  },
  {
    freq: "Semi-annual",
    tone: "bg-sky-50 text-sky-700 border-sky-200",
    items:
      "Equipment functionality & EmONC skills assessments · DoS IP contribution reports (PEPFAR & EWENE targets)",
  },
  {
    freq: "Annual",
    tone: "bg-violet-50 text-violet-700 border-violet-200",
    items:
      "National EWENE performance review · lessons learned & best-practice documentation",
  },
];

// §6 — Review platforms
export const REVIEW_PLATFORMS = [
  {
    icon: CalendarDays,
    label: "Bi-weekly",
    text: "RRI national county coordination meetings",
  },
  {
    icon: CalendarDays,
    label: "Monthly",
    text: "Facility CQI & MPDSR committees; DoS VTP TWG review meetings",
  },
  {
    icon: CalendarDays,
    label: "Quarterly",
    text: "County EWENE Technical Committee reviews",
  },
];
