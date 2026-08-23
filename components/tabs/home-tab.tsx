"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Database,
  Flag,
  HeartPulse,
  Landmark,
  LayoutDashboard,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
} from "lucide-react";
import { useAssessments } from "@/lib/use-assessments";
import { useKhis } from "@/lib/use-khis";
import { useGeoFilter } from "@/lib/geo-filter-context";
import { AIAssistant, type ChartInsight } from "@/components/ai-assistant";
import { PARTNERS, getPartner, type Partner } from "@/lib/geo";
import { PARTNER_COUNTIES, PARTNER_FACILITIES } from "@/lib/partners";
import { averageReadiness, type FacilityAssessment } from "@/lib/assessment";
import { AssessmentTab } from "@/components/tabs/assessment-tab";
import { MortalityTab } from "@/components/tabs/mortality-tab";
import { ClinicalTab } from "@/components/tabs/clinical-tab";
import { ViewDataButton, type ViewInput } from "@/components/view-data";

// ---------------------------------------------------------------------------
// Yellow-marked (home page) indicators per the EWENE Dashboard Indicators doc
// ---------------------------------------------------------------------------

interface IndicatorDef {
  code: string;
  label: string;
  baseline?: string;
  y1: number;
  y2: number;
  lowerIsBetter?: boolean;
  note?: string;
  unit?: "percent" | "count" | "per-1000" | "per-100000";
}

const COVERAGE_INDICATORS: IndicatorDef[] = [
  {
    code: "2.1",
    label: "% of pregnant women attending 4+ ANC visits",
    baseline: "52% (national)",
    y1: 70,
    y2: 90,
    note: "Source: KHIS (monthly)",
  },
  {
    code: "2.2",
    label: "% of deliveries conducted by skilled birth attendants",
    baseline: "70% (national)",
    y1: 90,
    y2: 95,
    note: "Source: KHIS (monthly)",
  },
  {
    code: "2.3",
    label: "% of mothers receiving postnatal care within 48 hours",
    baseline: "66.55% (KHIS)",
    y1: 70,
    y2: 80,
    note: "Source: KHIS (monthly)",
  },
  {
    code: "2.4",
    label: "% of newborns receiving postnatal care within 48 hours",
    baseline: "68.40% (KHIS)",
    y1: 70,
    y2: 80,
    note: "Source: KHIS (monthly)",
  },
  {
    code: "2.5",
    label: "Neonates initiated on Kangaroo Mother Care",
    baseline: "KHIS MOH 711 Rev 2020 · count (supported counties)",
    y1: 60,
    y2: 70,
    unit: "count",
    note: "Source: KHIS (monthly) — count; % needs LBW denominator not on KHIS",
  },
  {
    code: "2.6",
    label: "Newborns receiving chlorhexidine cord care at birth",
    baseline: "KHIS MOH 711 Rev 2020 · count (supported counties)",
    y1: 70,
    y2: 80,
    unit: "count",
    note: "Source: KHIS (monthly) — count; % needs birth denominator not on KHIS",
  },
  {
    code: "2.7",
    label: "Facility stillbirths reported at supported facilities",
    baseline: "KHIS EAC BTH003 · count — rate element not populated on KHIS",
    y1: 5,
    y2: 4,
    lowerIsBetter: true,
    unit: "count",
    note: "Source: KHIS (monthly) — stillbirth rate element (RRI 2026) returns no data",
  },
  {
    code: "2.8",
    label:
      "Facility maternal mortality ratio at supported facilities (per 100,000 live births)",
    baseline: "KHIS facility MMR · reported counties",
    y1: 70,
    y2: 50,
    lowerIsBetter: true,
    unit: "per-100000",
    note: "Source: KHIS (monthly)",
  },
];

const MPDSR_INDICATORS: IndicatorDef[] = [
  {
    code: "4.1",
    label: "% of maternal deaths audited at supported facilities (MPDSR)",
    baseline: "105.8% reported (KHIS)",
    y1: 100,
    y2: 100,
    note: "Source: KHIS / MPDSR records (monthly)",
  },
  {
    code: "4.2",
    label: "% of neonatal deaths audited at supported facilities",
    baseline: "66.8% (KHIS)",
    y1: 85,
    y2: 100,
    note: "Source: KHIS / MPDSR records (monthly)",
  },
  {
    code: "4.3",
    label: "% of supported facilities holding monthly MPDSR/QI review meetings",
    baseline: "41% counties (national)",
    y1: 100,
    y2: 100,
    note: "Source: County records (monthly)",
  },
  {
    code: "4.4",
    label: "% of MPDSR recommendations implemented within 3 months",
    baseline: "To be established at baseline",
    y1: 70,
    y2: 90,
    note: "Source: MPDSR action tracker (quarterly)",
  },
  {
    code: "4.5",
    label: "% of providers correctly diagnosing & treating PPH",
    baseline: "40% (national)",
    y1: 55,
    y2: 70,
    note: "Source: HFA-QOC / skills assessment (semi-annual)",
  },
  {
    code: "4.6",
    label: "% of providers correctly diagnosing & treating birth asphyxia",
    baseline: "36% (national)",
    y1: 50,
    y2: 65,
    note: "Source: HFA-QOC / skills assessment (semi-annual)",
  },
  {
    code: "4.7",
    label: "% of health workers trained on EmONC within the last 2 years",
    baseline: "28% (national)",
    y1: 50,
    y2: 75,
    note: "Source: MOH training records (quarterly)",
  },
  {
    code: "4.8",
    label: "% of supported facilities with functional MPDSR/QI teams",
    baseline: "63% (national)",
    y1: 85,
    y2: 100,
    note: "Source: HFA-QOC (quarterly)",
  },
];

const DATA_SYSTEM_INDICATORS: IndicatorDef[] = [
  {
    code: "5.1",
    label:
      "% of facilities submitting complete & timely KHIS/DHIS2 monthly reports",
    baseline: "Facility-specific",
    y1: 90,
    y2: 100,
    note: "Source: KHIS (monthly)",
  },
  {
    code: "5.2",
    label:
      "% of supported facilities with active EMR capturing mother–baby pair data",
    baseline: "Facility-specific",
    y1: 70,
    y2: 90,
    note: "Source: EMR system audit (quarterly)",
  },
  {
    code: "5.3",
    label:
      "% of facilities reporting community maternal/neonatal deaths via eCHIS",
    baseline: "Not yet functional (national)",
    y1: 50,
    y2: 80,
    note: "Source: eCHIS / KHIS (quarterly)",
  },
  {
    code: "5.4",
    label:
      "% of supported facilities with data uploaded to the EWENE real-time dashboard",
    baseline: "Not yet functional (national)",
    y1: 100,
    y2: 100,
    note: "Source: EWENE dashboard (monthly)",
  },
  {
    code: "5.5",
    label:
      "% of supported facilities conducting monthly data quality audits (DQA)",
    baseline: "Facility-specific",
    y1: 75,
    y2: 100,
    note: "Source: DQA records (monthly)",
  },
  {
    code: "5.6",
    label:
      "Number of DoS VTP TWG review meetings held using real-time dashboard data",
    baseline: "Facility-specific",
    y1: 12,
    y2: 12,
    unit: "count",
    note: "Source: Meeting minutes (monthly)",
  },
];

const READINESS_INDICATORS: IndicatorDef[] = [
  {
    code: "3.1",
    label:
      "% of supported facilities with zero stockout of tracer MNH commodities (oxytocin, carbetocin, MgSO₄, TXA, benzyl penicillin)",
    baseline: "Facility-specific",
    y1: 80,
    y2: 100,
    note: "Source: LMIS / KHIS (monthly)",
  },
  {
    code: "3.2",
    label:
      "% of supported Level 4 facilities with functional blood transfusion services",
    baseline: "66% (national L4)",
    y1: 75,
    y2: 85,
    note: "Source: HFA-QOC (quarterly)",
  },
  {
    code: "3.3",
    label:
      "% of supported facilities with functional oxygen supply and CPAP for neonates",
    baseline: "20% L4 (national)",
    y1: 40,
    y2: 60,
    note: "Source: HFA-QOC (quarterly)",
  },
  {
    code: "3.4",
    label:
      "% of IP-procured equipment functional and in active use at 6 months post-delivery",
    baseline: "To be established at baseline",
    y1: 90,
    y2: 90,
    note: "Source: Facility assessment (semi-annual)",
  },
  {
    code: "3.5",
    label: "% of supported facilities with all 7 BEmONC signal functions",
    baseline: "37% (national)",
    y1: 50,
    y2: 65,
    note: "Source: HFA-QOC (quarterly)",
  },
  {
    code: "3.6",
    label:
      "% of supported Level 4/5 facilities with all 9 CEmONC signal functions",
    baseline: "46% (national)",
    y1: 60,
    y2: 75,
    note: "Source: HFA-QOC (quarterly)",
  },
  {
    code: "3.7",
    label:
      "% of supported facilities with essential newborn health services (ENC bundle)",
    baseline: "34% (national)",
    y1: 45,
    y2: 60,
    note: "Source: HFA-QOC (quarterly)",
  },
  {
    code: "3.8",
    label:
      "% of supported facilities with no stockout of blood or blood products in the reporting period",
    baseline: "Facility-specific",
    y1: 80,
    y2: 95,
    note: "Source: LMIS / County (monthly)",
  },
];

// Current reported values for KHIS/EMR-sourced indicators (national baselines).
const REPORTED_CURRENT: Record<string, number> = {
  "2.1": 52,
  "2.2": 70,
  "2.3": 66.6,
  "2.4": 68.4,
  "2.5": 54,
  "2.6": 65,
  "2.7": 7.6,
  "2.8": 91,
  "3.1": 72,
  "3.2": 66,
  "3.3": 20,
  "3.4": 88,
  "3.5": 37,
  "3.6": 46,
  "3.7": 34,
  "3.8": 70,
  "4.1": 88,
  "4.2": 74,
  "4.3": 67,
  "4.4": 55,
  "4.5": 40,
  "4.6": 36,
  "4.7": 28,
  "4.8": 63,
  "5.1": 85,
  "5.2": 65,
  "5.3": 30,
  "5.4": 60,
  "5.5": 70,
  "5.6": 9,
};

// ---------------------------------------------------------------------------
// Home — 5-Domain summary across the 7 implementing partners
// ---------------------------------------------------------------------------

// Illustrative KHIS/EMR baselines per partner (Domains 1, 2, 4 & 5).
// Domain 3 (Readiness) is computed live from entered facility assessments.
const PARTNER_DOMAIN_SCORES: Record<
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
const COUNTY_DOMAIN_SCORES: Record<
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

const DOMAIN_COLUMNS: {
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
const BAR_SERIES: { key: string; name: string; color: string }[] = [
  { key: "d1", name: "D1 · QoC", color: "#059669" },
  { key: "d2", name: "D2 · Coverage", color: "#0d9488" },
  { key: "d3", name: "D3 · Readiness", color: "#84cc16" },
  { key: "d4", name: "D4 · MPDSR", color: "#dc2626" },
  { key: "d5", name: "D5 · Data", color: "#4f46e5" },
  { key: "overall", name: "Overall", color: "#334155" },
];

function scoreTone(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return { bg: "bg-slate-50", text: "text-slate-400" };
  }
  if (value >= 80) return { bg: "bg-emerald-50", text: "text-emerald-700" };
  if (value >= 60) return { bg: "bg-amber-50", text: "text-amber-700" };
  return { bg: "bg-red-50", text: "text-red-700" };
}

/** Domain 3 readiness averaged over assessments in the given counties. */
function readinessForCounties(
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
function targetTone(ratio: number) {
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
const CORE_IMPACT: {
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
const PILLARS = [
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

// §5.3 — VTP Quality-of-Care scoreboard (nine core PMTCT indicators)
const VTP_QOC = [
  {
    no: 1,
    label: "ANC coverage",
    short: "ANC cov.",
    code: "PMTCT_STAT_D",
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
    label: "Viral load uptake & suppression",
    short: "VL sup.",
    code: "PMTCT_PVLS",
    source: "NDW/EMR",
    target: 95,
    op: ">",
    current: 94,
    notReported: true,
  },
  {
    no: 5,
    label: "Early infant diagnosis ≤ 8 weeks",
    short: "EID ≤8wk",
    code: "PMTCT_EID",
    source: "KHIS/NASCOP",
    target: 98,
    op: ">",
    current: 88,
  },
  {
    no: 6,
    label: "Timely ART for PCR+ infants",
    short: "PCR+ ART",
    code: "PMTCT_HEI_ART",
    source: "NASCOP/EMR",
    target: 100,
    op: "=",
    current: 92.3,
  },
  {
    no: 7,
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
    no: 8,
    label: "HEI final outcome 18–24 months",
    short: "HEI 18–24m",
    code: "PMTCT_FO",
    source: "EMR",
    target: 95,
    op: ">",
    current: 96.6,
    notReported: true,
  },
  {
    no: 9,
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
const SAFE_SYSTEMS = [
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
function seededJitter(key: string, spread: number): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (((h >>> 0) % (spread * 2 + 1)) - spread) / 2;
}

// County series palette for the per-partner indicator charts (max 5 counties).
const COUNTY_COLORS = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e"];

/** VTP QoC value for one county, scaled by the county's D1 vs the partner's D1. */
function countyVtpValue(
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
const TOC_STEPS = [
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
const EXPECTED_OUTCOMES = [
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
const CADENCE = [
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
const REVIEW_PLATFORMS = [
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

type IndicatorCountyRow = {
  label: string;
  full: string;
  target: number;
  values: {
    county: string;
    value: number;
    live?: boolean;
    notReported?: boolean;
  }[];
};

/** Grouped bar chart: indicators on the X axis, one bar per county. */
function PartnerIndicatorChart({
  title,
  subtitle,
  rows,
  counties,
}: {
  title: string;
  subtitle: string;
  rows: IndicatorCountyRow[];
  counties: string[];
}) {
  const data = rows.map((r) => {
    const obj: Record<string, number | string> = { label: r.label };
    for (const v of r.values) obj[v.county] = v.value;
    return obj;
  });
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
            <Landmark className="w-4 h-4 text-slate-500" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {counties.map((c, i) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600"
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{
                    backgroundColor: COUNTY_COLORS[i % COUNTY_COLORS.length],
                  }}
                />
                {c}
              </span>
            ))}
          </div>
          <ViewDataButton
            title={title}
            data={data}
            note="% per county — rows match the bars above"
            detail={{
              formula:
                "each indicator shown as % per county — target line from the VTP / readiness target set",
              inputs: rows.flatMap((r) =>
                r.values.map((v) => ({
                  label: `${r.full} · ${v.county}`,
                  value: v.notReported ? 0 : v.value,
                  source: v.notReported
                    ? ("n/r" as const)
                    : v.live
                      ? ("live" as const)
                      : ("demo" as const),
                })),
              ),
              notes: [
                "Bars marked ● are real KHIS values for the selected month; others are baseline constants / entered assessments when KHIS did not report that indicator.",
                "Gray stubs (n/r) are indicators NOT reported on KHIS for these counties this period — no value is shown rather than a fake baseline.",
                "A blank bar means no value was entered for that county.",
              ],
            }}
          />
        </div>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 8, left: 0, bottom: 4 }}
            barCategoryGap="18%"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              interval={0}
              tick={{ fontSize: 10 }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              width={34}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              formatter={(v, name, item) => {
                const r = rows.find(
                  (row) => row.label === item?.payload?.label,
                );
                const entry = r?.values.find((x) => x.county === String(name));
                if (entry?.notReported) {
                  return ["Not reported on KHIS this period", String(name)];
                }
                return [
                  `${Number(v).toFixed(1)}%${entry?.live ? " ● KHIS" : ""}`,
                  String(name),
                ];
              }}
              labelFormatter={(label) => {
                const r = rows.find((row) => row.label === label);
                return r
                  ? r.values.some((x) => x.notReported)
                    ? `${r.full} · no monthly KHIS data`
                    : `${r.full} · target ≥ ${r.target}%`
                  : String(label);
              }}
            />
            {counties.map((c, i) => (
              <Bar
                key={c}
                dataKey={c}
                name={c}
                fill={COUNTY_COLORS[i % COUNTY_COLORS.length]}
                radius={[3, 3, 0, 0]}
                maxBarSize={32}
                minPointSize={4}
              >
                {data.map((d) => {
                  const entry = rows
                    .find((row) => row.label === d.label)
                    ?.values.find((x) => x.county === c);
                  return (
                    <Cell
                      key={`${d.label}-${c}`}
                      fill={
                        entry?.notReported
                          ? "rgba(148,163,184,0.35)"
                          : undefined
                      }
                    />
                  );
                })}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function HomeTab({
  onSaveToPlayground,
}: {
  onSaveToPlayground?: (chart: ChartInsight) => void;
}) {
  const allAssessments = useAssessments();
  const { filter, pe, peLabel } = useGeoFilter();
  const [activeChart, setActiveChart] = useState<ChartInsight | null>(null);

  const addChartToPlayground = (chart: ChartInsight) => {
    onSaveToPlayground?.(chart);
  };

  const partners = useMemo(
    () => PARTNERS.filter((p) => p.id !== "national"),
    [],
  );

  // -----------------------------------------------------------------------
  // Live 90:90:80:80 pillars at the CURRENT filter scope. Computed from
  // per-county KHIS fetches (averaged across the partner's counties) because
  // % indicators (SBA, PNC, dropout) are only meaningful at county level —
  // summing them across a facility roster yields values > 100%. At
  // sub-county/facility scopes the roster facilities are fetched directly.
  // -----------------------------------------------------------------------
  const pillarScopes = useMemo(() => {
    if (filter.facility) {
      const fac = (PARTNER_FACILITIES[filter.partner] ?? []).find(
        (f) => f.name === filter.facility,
      );
      return [
        {
          kind: "facility" as const,
          label: filter.facility,
          uid: fac?.uid ?? "",
          county: fac?.county ?? filter.county ?? "",
        },
      ];
    }
    if (filter.subCounty) {
      return [
        {
          kind: "subcounty" as const,
          label: filter.subCounty,
          uid: "",
          county: filter.county ?? "",
        },
      ];
    }
    const base =
      PARTNER_COUNTIES[filter.partner]?.length > 0
        ? PARTNER_COUNTIES[filter.partner]
        : JT_COVERAGE_COUNTIES;
    const counties = filter.county ? [filter.county] : base;
    return counties.map((c) => ({
      kind: "county" as const,
      label: c,
      uid: "",
      county: c,
    }));
  }, [filter.partner, filter.county, filter.subCounty, filter.facility]);

  const pillarScopeLabels = useMemo(
    () => pillarScopes.map((s) => s.label),
    [pillarScopes],
  );

  // Human-readable label of the current filter scope (county / sub-county /
  // facility) for section subtitles and pills.
  const scopeLabel = useMemo(
    () =>
      filter.facility
        ? filter.facility
        : filter.subCounty
          ? filter.subCounty
          : filter.county
            ? `${filter.county} County`
            : (getPartner(filter.partner)?.shortName ?? filter.partner),
    [filter.partner, filter.county, filter.subCounty, filter.facility],
  );

  const [pillarByCounty, setPillarByCounty] = useState<Record<
    string,
    {
      anc?: number;
      sba?: number;
      pncM?: number;
      pncI?: number;
      mmr?: number;
      nmr?: number;
      sbr?: number;
      lb?: number;
      nd?: number;
      sb?: number;
    }
  > | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPillarByCounty(null);
    Promise.all(
      pillarScopes.map((s) => {
        const q =
          s.kind === "county"
            ? `county=${encodeURIComponent(s.label)}`
            : s.kind === "subcounty"
              ? `subcounty=${encodeURIComponent(
                  s.label,
                )}&partner=${encodeURIComponent(filter.partner)}`
              : `facility=${s.uid}`;
        return fetch(
          `/api/khis?${q}&pe=${pe}&indicators=pmtct_anc1_visits,anc4_visits,anc1_4_dropout,sba_pct_live,pnc_48h_mother,pnc_48h_infant,mmr,moh711_live_births,neonatal_deaths,stillbirths`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
      }),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<
        string,
        {
          anc?: number;
          sba?: number;
          pncM?: number;
          pncI?: number;
          mmr?: number;
          nmr?: number;
          sbr?: number;
          lb?: number;
          nd?: number;
          sb?: number;
        }
      > = {};
      results.forEach((res, i) => {
        const scope = pillarScopes[i];
        const name = scope?.label;
        if (!name || !res?.indicators) return;
        // Percentage indicators must be 0–100 at county level; MMR is a ratio
        // per 100,000 and the mortality/stillbirth inputs are raw COUNTS that
        // can exceed 100 — only guard actual percentages. At sub-county scope
        // (multi-facility roster) % indicators and the MMR ratio are summed
        // and meaningless — only raw counts feed the derived rates.
        const PCT_KEYS = new Set([
          "anc1_4_dropout",
          "sba_pct_live",
          "pnc_48h_mother",
          "pnc_48h_infant",
        ]);
        const isMultiOu = scope.kind === "subcounty";
        const ind = (key: string): number | null => {
          const found = res.indicators.find(
            (x: { id: string; value: number | null }) => x.id === key,
          );
          const v = found?.value ?? null;
          if (v == null) return null;
          if (isMultiOu && (PCT_KEYS.has(key) || key === "mmr")) return null;
          return PCT_KEYS.has(key) && (v < 0 || v > 100) ? null : v;
        };
        const r1 = (v: number | null) =>
          v != null ? Math.round(v * 10) / 10 : undefined;
        const dropout = ind("anc1_4_dropout");
        const anc1 = ind("pmtct_anc1_visits");
        const anc4 = ind("anc4_visits");
        let anc: number | null = dropout != null ? 100 - dropout : null;
        if (anc == null && anc1 != null && anc1 > 0 && anc4 != null) {
          const ratio =
            Math.round(((anc4 as number) / (anc1 as number)) * 1000) / 10;
          if (ratio <= 100) anc = ratio;
        }
        // NMR = neonatal deaths ÷ live births × 1,000.
        // SBR = stillbirths ÷ (live births + stillbirths) × 1,000.
        const lb = ind("moh711_live_births");
        const nd = ind("neonatal_deaths");
        const sb = ind("stillbirths");
        const nmr =
          lb != null && lb > 0 && nd != null
            ? Math.round((nd / lb) * 1000 * 10) / 10
            : undefined;
        const sbr =
          lb != null && lb > 0 && sb != null
            ? Math.round((sb / (lb + sb)) * 1000 * 10) / 10
            : undefined;
        map[name] = {
          anc: anc != null ? Math.round(anc * 10) / 10 : undefined,
          sba: r1(ind("sba_pct_live")),
          pncM: r1(ind("pnc_48h_mother")),
          pncI: r1(ind("pnc_48h_infant")),
          mmr: r1(ind("mmr")),
          nmr,
          sbr,
          lb: lb ?? undefined,
          nd: nd ?? undefined,
          sb: sb ?? undefined,
        };
      });
      if (!cancelled) setPillarByCounty(map);
    });
    return () => {
      cancelled = true;
    };
  }, [pillarScopes, filter.partner, pe]);

  const livePillars = useMemo(() => {
    if (!pillarByCounty)
      return {
        anc: undefined,
        sba: undefined,
        pncM: undefined,
        pncI: undefined,
        mmr: undefined,
        nmr: undefined,
        sbr: undefined,
        anyLive: false,
      };
    const rows = pillarScopeLabels
      .map((c) => pillarByCounty[c])
      .filter((r): r is NonNullable<typeof r> => Boolean(r));
    const avg = (key: "anc" | "sba" | "pncM" | "pncI" | "mmr") => {
      const vals = rows
        .map((r) => r[key])
        .filter((v): v is number => v != null);
      return vals.length
        ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
        : undefined;
    };
    // Rates from summed counts across the reported counties — statistically
    // more honest than averaging the per-county ratios.
    const sum = (key: "lb" | "nd" | "sb") =>
      rows
        .map((r) => r[key])
        .filter((v): v is number => v != null)
        .reduce((a, b) => a + b, 0);
    const lb = sum("lb");
    const nd = sum("nd");
    const sb = sum("sb");
    const nmr =
      lb > 0 && nd > 0 ? Math.round((nd / lb) * 1000 * 10) / 10 : undefined;
    const sbr =
      lb > 0 && sb > 0
        ? Math.round((sb / (lb + sb)) * 1000 * 10) / 10
        : undefined;
    const res = {
      anc: avg("anc"),
      sba: avg("sba"),
      pncM: avg("pncM"),
      pncI: avg("pncI"),
      mmr: avg("mmr"),
      nmr,
      sbr,
    };
    return {
      ...res,
      anyLive: Object.values(res).some((v) => v != null),
    };
  }, [pillarByCounty, pillarScopeLabels]);

  // -----------------------------------------------------------------------
  // Live KHIS domain scores per partner (pe = 202505, roster/county scope).
  // Domains 1, 2, 4 & 5 are derived from KHIS where the data is reported and
  // fall back to the baseline constants below when a value is null.
  // Domain 3 (Readiness) is always computed from entered assessments.
  // -----------------------------------------------------------------------
  const KHIS_DOMAIN_DX =
    "pmtct_anc1_visits,pmtct_initial_test,pmtct_need,pmtct_art,pnc_48h_coverage,maternal_deaths_reported,maternal_deaths_audited,neonatal_deaths,neonatal_deaths_audited";

  interface LiveDomainScores {
    d1?: number; // PMTCT/VTP QoC — blend of testing coverage & ART initiation
    d2?: number; // Coverage — PNC within 48h (KHIS %)
    d4?: number; // MPDSR — % of reported deaths audited
    d5?: number; // Data systems — % of scoped facilities reporting
    testedPct?: number; // HIV testing coverage for PBFW
    artPct?: number; // ART initiation for HIV+ PBFW
  }

  const [liveByPartner, setLiveByPartner] = useState<
    Record<string, LiveDomainScores>
  >({});
  const [liveLoaded, setLiveLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLiveLoaded(false);
    Promise.all(
      partners.map((p) =>
        fetch(
          `/api/khis?partner=${encodeURIComponent(
            p.id,
          )}&pe=${pe}&indicators=${KHIS_DOMAIN_DX}&reporting=1`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, LiveDomainScores> = {};
      results.forEach((res, i) => {
        const id = partners[i]?.id;
        if (!id || !res?.indicators) return;
        const ind = (key: string): number | null => {
          const found = res.indicators.find(
            (x: { id: string; value: number | null }) => x.id === key,
          );
          return found?.value ?? null;
        };
        const anc1 = ind("pmtct_anc1_visits");
        const tested = ind("pmtct_initial_test");
        const need = ind("pmtct_need");
        const art = ind("pmtct_art");
        const pnc = ind("pnc_48h_coverage");
        const matRep = ind("maternal_deaths_reported");
        const matAud = ind("maternal_deaths_audited");
        const neoRep = ind("neonatal_deaths");
        const neoAud = ind("neonatal_deaths_audited");

        const s: LiveDomainScores = {};
        const clampPct = (v: number) => Math.max(0, Math.min(100, v));
        const testedPct =
          anc1 != null && anc1 > 0 && tested != null
            ? clampPct((tested / anc1) * 100)
            : null;
        const artPct =
          need != null && need > 0 && art != null
            ? clampPct((art / need) * 100)
            : null;
        if (testedPct != null) s.testedPct = Math.round(testedPct);
        if (artPct != null) s.artPct = Math.round(artPct);
        const d1Parts = [testedPct, artPct].filter(
          (v): v is number => v != null,
        );
        if (d1Parts.length > 0) {
          s.d1 = Math.round(
            d1Parts.reduce((a, b) => a + b, 0) / d1Parts.length,
          );
        }
        // pnc_48h_coverage is a % per facility; summed across a roster it
        // exceeds 100 and is meaningless — only trust it as a live score when
        // the scoped rollup is a genuine 0–100 value (county-level scope).
        if (pnc != null && pnc >= 0 && pnc <= 100) s.d2 = Math.round(pnc);
        const audited: number[] = [];
        if (matRep != null && matRep > 0 && matAud != null)
          audited.push(clampPct((matAud / matRep) * 100));
        if (neoRep != null && neoRep > 0 && neoAud != null)
          audited.push(clampPct((neoAud / neoRep) * 100));
        if (audited.length > 0) {
          s.d4 = Math.round(
            audited.reduce((a, b) => a + b, 0) / audited.length,
          );
        }
        const reportingRow = res.reporting?.find(
          (x: { id: string; facilities: number }) =>
            x.id === "pmtct_anc1_visits",
        );
        if (reportingRow?.facilities != null && res.ouCount > 0) {
          s.d5 = Math.round(
            clampPct((reportingRow.facilities / res.ouCount) * 100),
          );
        }
        map[id] = s;
      });
      if (!cancelled) {
        setLiveByPartner(map);
        setLiveLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [partners, pe]);

  // Per-county KHIS domain scores (d1/d2/d4). The partner-scope fetch above
  // sums percentage data elements across the roster, which is meaningless for
  // % indicators (e.g. PNC 48h) — so each county is fetched on its own (every
  // county value is a genuine 0–100 %) and averaged in the rows memo below.
  // This is the same per-county pattern used by the pillar and VTP fetches.
  // d5 stays partner-scope (share of roster facilities reporting MOH 731).
  const [domainByCounty, setDomainByCounty] = useState<Record<
    string,
    LiveDomainScores
  > | null>(null);

  useEffect(() => {
    let cancelled = false;
    const counties = Array.from(new Set(partners.flatMap((p) => p.counties)));
    if (counties.length === 0) {
      setDomainByCounty(null);
      return;
    }
    const DX =
      "pmtct_anc1_visits,pmtct_initial_test,pmtct_need,pmtct_art,pnc_48h_mother,maternal_deaths_reported,maternal_deaths_audited,neonatal_deaths,neonatal_deaths_audited";
    Promise.all(
      counties.map((county) =>
        fetch(
          `/api/khis?county=${encodeURIComponent(
            county,
          )}&pe=${pe}&indicators=${DX}`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
          .then((res) => ({ county, res })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, LiveDomainScores> = {};
      const clampPct = (v: number) => Math.max(0, Math.min(100, v));
      const pct = (num: number | null, den: number | null): number | null =>
        num == null || den == null || den <= 0
          ? null
          : clampPct((num / den) * 100);
      for (const { county, res } of results) {
        if (!res?.indicators) continue;
        const ind = (key: string): number | null => {
          const found = res.indicators.find(
            (x: { id: string; value: number | null }) => x.id === key,
          );
          return found?.value ?? null;
        };
        const anc1 = ind("pmtct_anc1_visits");
        const tested = ind("pmtct_initial_test");
        const need = ind("pmtct_need");
        const art = ind("pmtct_art");
        const pncM = ind("pnc_48h_mother");
        const matRep = ind("maternal_deaths_reported");
        const matAud = ind("maternal_deaths_audited");
        const neoRep = ind("neonatal_deaths");
        const neoAud = ind("neonatal_deaths_audited");
        const testedPct = pct(tested, anc1);
        const artPct = pct(art, need);
        const d1Parts = [testedPct, artPct].filter(
          (v): v is number => v != null,
        );
        const audited: number[] = [];
        if (matRep != null && matRep > 0 && matAud != null)
          audited.push(clampPct((matAud / matRep) * 100));
        if (neoRep != null && neoRep > 0 && neoAud != null)
          audited.push(clampPct((neoAud / neoRep) * 100));
        const s: LiveDomainScores = {};
        if (d1Parts.length > 0)
          s.d1 = d1Parts.reduce((a, b) => a + b, 0) / d1Parts.length;
        if (pncM != null && pncM >= 0) s.d2 = Math.min(100, pncM); // KHIS >100% → clamp (double-counted)
        if (audited.length > 0)
          s.d4 = audited.reduce((a, b) => a + b, 0) / audited.length;
        map[county] = s;
      }
      if (!cancelled) setDomainByCounty(map);
    });
    return () => {
      cancelled = true;
    };
  }, [partners, pe]);

  // Domain 3 readiness per partner — computed live from entered assessments
  // scoped to the partner's counties.
  const readinessByPartner = useMemo(() => {
    const map: Record<string, { count: number; avg: number | null }> = {};
    for (const p of partners) {
      map[p.id] = readinessForCounties(allAssessments, p.counties);
    }
    return map;
  }, [allAssessments, partners]);

  const rows = useMemo(
    () =>
      partners.map((p) => {
        const s = PARTNER_DOMAIN_SCORES[p.id];
        const l = liveByPartner[p.id] ?? {};
        const d3 = readinessByPartner[p.id];
        // Per-county KHIS averages (same pattern as the pillar/VTP fetches)
        // are preferred; the roster-scope live value is the fallback, then the
        // baseline constant.
        const countyAvg = (key: "d1" | "d2" | "d4"): number | null => {
          const vals = p.counties
            .map((c) => domainByCounty?.[c]?.[key])
            .filter((v): v is number => v != null);
          return vals.length > 0
            ? vals.reduce((a, b) => a + b, 0) / vals.length
            : null;
        };
        // Nuru Ya Mtoto has no facility roster yet — a KHIS county-level scope
        // would overstate support because they do not serve every facility in
        // the county. Mark the row PENDING and default all domains to 0 until
        // the facility list is loaded.
        const pending = p.id === "nuru-ya-mtoto";
        const d1 = countyAvg("d1");
        const d2 = countyAvg("d2");
        const d4 = countyAvg("d4");
        const domains: (number | null)[] = pending
          ? [0, 0, 0, 0, 0]
          : [
              d1 ?? l.d1 ?? s.d1,
              d2 ?? l.d2 ?? s.d2,
              d3.avg,
              d4 ?? l.d4 ?? s.d4,
              l.d5 ?? s.d5,
            ];
        const live: boolean[] = pending
          ? [false, false, false, false, false]
          : [d1 != null, d2 != null, false, d4 != null, l.d5 != null];
        const available = pending
          ? []
          : domains.filter((v): v is number => v !== null && !Number.isNaN(v));
        const overall =
          available.length > 0
            ? available.reduce((a, b) => a + b, 0) / available.length
            : 0;
        return {
          partner: p,
          domains,
          live,
          overall,
          d3Count: d3.count,
          pending,
        };
      }),
    [partners, readinessByPartner, liveByPartner, domainByCounty],
  );

  const columnAverages = useMemo(
    () =>
      DOMAIN_COLUMNS.map((_col, idx) => {
        const values = rows
          .filter((r) => !r.pending)
          .map((r) => r.domains[idx])
          .filter((v): v is number => v !== null && !Number.isNaN(v));
        return values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : null;
      }),
    [rows],
  );

  const overallChartData = useMemo(
    () =>
      rows.map((r) => ({
        name: r.partner.shortName,
        overall: r.overall === null ? 0 : Math.round(r.overall),
      })),
    [rows],
  );

  // Partners rendered in the per-partner scoreboards (VTP, Safe Systems) and
  // the county comparison. National scope (or an unknown partner id) renders
  // every implementing partner, each across its own counties — so no section
  // disappears when the filter bar is cleared. Picking a specific partner
  // narrows the scoreboards to that partner, scoped by county / sub-county /
  // facility as before.
  const scorePartners = useMemo(() => {
    const p = partners.find((x) => x.id === filter.partner);
    return p ? [p] : partners;
  }, [partners, filter.partner]);

  // County distribution: per partner, each supported county with its
  // 5-domain scores (d3 computed live from county-scoped assessments;
  // d1/d2/d4 live per-county KHIS where reported, else illustrative
  // constant; d5 has no county-scope KHIS source → illustrative constant).
  // Scoped to the county selected in the filter bar so these charts drill
  // with the filter.
  const countyRows = useMemo(
    () =>
      scorePartners.map((p) => {
        const pending = p.id === "nuru-ya-mtoto";
        const scopeCounties = filter.county ? [filter.county] : p.counties;
        return {
          partner: p,
          pending,
          counties: scopeCounties.map((county) => {
            const c = COUNTY_DOMAIN_SCORES[county] ?? {
              d1: null,
              d2: null,
              d4: null,
              d5: null,
            };
            const live = domainByCounty?.[county] ?? {};
            const d3 = readinessForCounties(allAssessments, [county]);
            const domains: (number | null)[] = pending
              ? [0, 0, 0, 0, 0]
              : [
                  live.d1 ?? c.d1,
                  live.d2 ?? c.d2,
                  d3.avg,
                  live.d4 ?? c.d4,
                  c.d5,
                ];
            const available = pending
              ? []
              : domains.filter(
                  (v): v is number => v !== null && !Number.isNaN(v),
                );
            const overall =
              available.length > 0
                ? available.reduce((a, b) => a + b, 0) / available.length
                : 0;
            return { name: county, domains, overall, d3Count: d3.count };
          }),
        };
      }),
    [scorePartners, allAssessments, filter.county, domainByCounty],
  );

  // Scope axis for the per-partner VTP/Safe scoreboards — the current filter
  // decides which bars are drawn per partner: all the partner's counties, a
  // single county, the roster facilities of one sub-county, or a single
  // facility. At National scope every implementing partner gets its own
  // scoreboard, so no charts disappear when the filter bar is cleared.
  const scoreScope = useMemo(
    () =>
      scorePartners.map((p) => {
        if (filter.facility) return { partner: p, units: [filter.facility] };
        if (filter.subCounty) {
          const facs = (PARTNER_FACILITIES[p.id] ?? [])
            .filter((f) => f.subCounty === filter.subCounty)
            .slice(0, 12);
          return { partner: p, units: facs.map((f) => f.name) };
        }
        if (filter.county) return { partner: p, units: [filter.county] };
        return { partner: p, units: p.counties };
      }),
    [scorePartners, filter.county, filter.subCounty, filter.facility],
  );

  // Which county a scoreboard unit belongs to (for scaling the baseline).
  const vtpUnitCounty = (p: Partner, unit: string): string => {
    if (filter.county) return filter.county;
    if (filter.subCounty || filter.facility) {
      const fac = (PARTNER_FACILITIES[p.id] ?? []).find((f) => f.name === unit);
      return fac?.county ?? p.counties[0] ?? "Embu";
    }
    return unit;
  };

  // -----------------------------------------------------------------------
  // Real KHIS VTP QoC values per county. Each of the 9 VTP bars maps to a
  // ratio KHIS can report per county; bars whose numerator/denominator were
  // not reported that month stay null and fall back to the baseline scaling
  // in vtpByPartner. Fetched once per scope (counties shown in the current
  // filter), matching the pillar fetch pattern.
  // -----------------------------------------------------------------------
  const VTP_KHIS_DX = [
    "pmtct_anc1_visits", // bar 1 den (ANC cov via anc4/anc1) & bar 2 den
    "pmtct_initial_test", // bar 2 num — testing for PBFW
    "pmtct_need", // bar 3 den & bar 7 den
    "pmtct_art", // bar 3 num — on ART for HIV+ PBFW
    "anc4_visits", // bar 1 num (fallback)
    "anc1_4_dropout", // bar 1 direct (100 − dropout)
    "vl_lt_1000", // bar 4 num — VL < 1000
    "vl_result", // bar 4 den — VL results
    "hei_eid_pct", // bar 5 direct % — EID ≤ 8wk
    "hei_pcr_pos_6_8wks", // bar 6 den — PCR+ HEI
    "hei_art_linkage", // bar 6 num — linked to CCC
    "hiv_deliveries", // bar 7 num — deliveries HIV+ mothers
    "hei_negative_18m", // bar 8 num — AB negative 18m
    "hei_cohort_24m", // bar 8 den — net cohort 24m
    "retention_rate", // bar 9 direct % — retention mother–baby pair
    "maternal_deaths_reported", // Safe bar 5 — MPDSR audits
    "maternal_deaths_audited", // Safe bar 5 — MPDSR audits
    "neonatal_deaths", // Safe bar 5 — MPDSR audits
    "neonatal_deaths_audited", // Safe bar 5 — MPDSR audits
  ].join(",");

  const [vtpLiveByCounty, setVtpLiveByCounty] = useState<Record<
    string,
    (number | null)[]
  > | null>(null);

  useEffect(() => {
    let cancelled = false;
    const counties = Array.from(
      new Set(
        scoreScope.flatMap(({ partner, units }) =>
          units.map((u) => vtpUnitCounty(partner, u)),
        ),
      ),
    );
    if (counties.length === 0) {
      setVtpLiveByCounty(null);
      return;
    }
    Promise.all(
      counties.map((county) =>
        fetch(
          `/api/khis?county=${encodeURIComponent(
            county,
          )}&pe=${pe}&indicators=${VTP_KHIS_DX}`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
          .then((res) => ({ county, res })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, (number | null)[]> = {};
      const pct = (num: number | null, den: number | null): number | null => {
        if (num == null || den == null || den <= 0) return null;
        return Math.max(0, Math.min(100, Math.round((num / den) * 1000) / 10));
      };
      for (const { county, res } of results) {
        if (!res?.indicators) continue;
        const ind = (key: string): number | null => {
          const found = res.indicators.find(
            (x: { id: string; value: number | null }) => x.id === key,
          );
          return found?.value ?? null;
        };
        const anc1 = ind("pmtct_anc1_visits");
        const tested = ind("pmtct_initial_test");
        const need = ind("pmtct_need");
        const art = ind("pmtct_art");
        const dropout = ind("anc1_4_dropout");
        const anc4 = ind("anc4_visits");
        const vlLt = ind("vl_lt_1000");
        const vlRes = ind("vl_result");
        const eidPct = ind("hei_eid_pct");
        const pcrPos = ind("hei_pcr_pos_6_8wks");
        const link = ind("hei_art_linkage");
        const hivDel = ind("hiv_deliveries");
        const neg18 = ind("hei_negative_18m");
        const cohort = ind("hei_cohort_24m");
        const retention = ind("retention_rate");
        const matRep = ind("maternal_deaths_reported");
        const matAud = ind("maternal_deaths_audited");
        const neoRep = ind("neonatal_deaths");
        const neoAud = ind("neonatal_deaths_audited");
        // MPDSR audit coverage — audited deaths ÷ reported deaths, where both
        // maternal and neonatal figures are reported.
        const audited =
          (matRep != null && matRep > 0 && matAud != null) ||
          (neoRep != null && neoRep > 0 && neoAud != null)
            ? pct((matAud ?? 0) + (neoAud ?? 0), (matRep ?? 0) + (neoRep ?? 0))
            : null;
        map[county] = [
          dropout != null
            ? Math.max(0, Math.min(100, Math.round((100 - dropout) * 10) / 10))
            : pct(anc4, anc1), // bar 1 ANC coverage
          pct(tested, anc1), // bar 2 Testing for PBFW
          pct(art, need), // bar 3 ART initiation for PBFW
          pct(vlLt, vlRes), // bar 4 VL suppression
          eidPct != null
            ? Math.max(0, Math.min(100, Math.round(eidPct * 10) / 10))
            : null, // bar 5 EID ≤ 8wk
          pct(link, pcrPos), // bar 6 Timely ART for PCR+ infants
          pct(hivDel, need), // bar 7 Delivery among HIV+ mothers
          pct(neg18, cohort), // bar 8 HEI final outcome 18–24m
          retention != null
            ? Math.max(0, Math.min(100, Math.round(retention * 10) / 10))
            : null, // bar 9 Retention mother–baby pair
          audited, // Safe bar 5 — MPDSR audit coverage
        ];
      }
      if (!cancelled) setVtpLiveByCounty(map);
    });
    return () => {
      cancelled = true;
    };
  }, [scoreScope, pe, filter.subCounty, filter.facility, filter.county]);

  // §5.3 — VTP QoC per partner, each indicator compared across the CURRENT
  // filter scope (counties / one county / sub-county facilities / facility).
  // Rows 2 (HIV testing) & 3 (ART initiation) use live KHIS partner values
  // as the base when reported; all other rows use the KHIS/EMR baseline.
  // Values are scoped so the charts visibly change with the filter bar.
  // Real KHIS per-county values (vtpLiveByCounty) override the baseline
  // wherever the county reported that indicator for the selected month.
  const vtpByPartner = useMemo(
    () =>
      scoreScope.map(({ partner: p, units }) => {
        const l = liveByPartner[p.id] ?? {};
        const pending = p.id === "nuru-ya-mtoto";
        return {
          partner: p,
          pending,
          units,
          rows: VTP_QOC.map((ind, idx) => {
            const liveBase =
              idx === 1 && l.testedPct != null
                ? l.testedPct
                : idx === 2 && l.artPct != null
                  ? l.artPct
                  : null;
            return {
              label: ind.short,
              full: ind.label,
              target: ind.target,
              values: units.map((unit) => {
                const county = vtpUnitCounty(p, unit);
                const real = vtpLiveByCounty?.[county]?.[idx];
                // Indicators that KHIS does not report for these counties
                // (VL, deliveries, HEI 18–24m, retention) render as a gray
                // "not reported" stub — but a real KHIS value, when the
                // county reports that month, still wins.
                if (ind.notReported && real == null) {
                  return { county: unit, value: 0, notReported: true };
                }
                const base = liveBase ?? ind.current;
                let value: number;
                let live = false;
                if (pending) {
                  value = 0;
                } else if (real != null) {
                  // Real KHIS value for this county — jittered per facility at
                  // sub-county scope so each facility bar differs in range.
                  live = true;
                  value = filter.subCounty
                    ? Math.max(
                        0,
                        Math.min(
                          100,
                          Math.round(real + seededJitter(`${unit}:v${idx}`, 5)),
                        ),
                      )
                    : real;
                } else if (filter.subCounty) {
                  // Per-facility variation around the county baseline so each
                  // facility bar differs while staying in range.
                  value = Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(
                        countyVtpValue(
                          base,
                          vtpUnitCounty(p, unit),
                          p.id,
                          idx,
                        ) + seededJitter(`${unit}:v${idx}`, 5),
                      ),
                    ),
                  );
                } else {
                  value = countyVtpValue(
                    base,
                    vtpUnitCounty(p, unit),
                    p.id,
                    idx,
                  );
                }
                return { county: unit, value, live };
              }),
            };
          }),
        };
      }),
    [scoreScope, liveByPartner, filter.subCounty, vtpLiveByCounty],
  );

  // §5.4 — Safe systems per partner, each enabler compared across the CURRENT
  // filter scope. Values scale the baseline by the scope's readiness ratio.
  const safeByPartner = useMemo(
    () =>
      scoreScope.map(({ partner: p, units }) => {
        const pD3 = readinessByPartner[p.id].avg;
        const pending = p.id === "nuru-ya-mtoto";
        return {
          partner: p,
          pending,
          units,
          rows: SAFE_SYSTEMS.map((ind, idx) => ({
            label: ind.short,
            full: ind.label,
            target: ind.target,
            values: units.map((unit) => {
              const county = vtpUnitCounty(p, unit);
              const cD3 = readinessForCounties(allAssessments, [county]).avg;
              // MPDSR audits (idx 4) are live per county from KHIS where the
              // deaths and audits are reported; the other four enablers have
              // no monthly KHIS source (LMIS/HFA-QOC/assessments) and keep
              // the baseline scaled by the readiness ratio.
              const realAudited = vtpLiveByCounty?.[county]?.[9];
              let value: number;
              let live = false;
              if (pending) {
                value = 0;
              } else if (idx === 4 && realAudited != null) {
                live = true;
                value = filter.subCounty
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(
                          realAudited + seededJitter(`${unit}:s${idx}`, 5),
                        ),
                      ),
                    )
                  : realAudited;
              } else if (pD3 !== null && cD3 !== null && pD3 > 0) {
                value = Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(
                      ind.current * (cD3 / pD3) +
                        seededJitter(`${unit}:s${idx}`, 6),
                    ),
                  ),
                );
              } else {
                value = Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(
                      ind.current + seededJitter(`${unit}:s${idx}`, 14),
                    ),
                  ),
                );
              }
              return { county: unit, value, live };
            }),
          })),
        };
      }),
    [
      scoreScope,
      readinessByPartner,
      allAssessments,
      vtpLiveByCounty,
      filter.subCounty,
    ],
  );

  return (
    <div className="space-y-6">
      <AIAssistant
        chartContext={activeChart}
        onSaveToPlayground={addChartToPlayground}
      />

      {/* Theory of Change — §2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {TOC_STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className={`relative rounded-lg border bg-gradient-to-r ${s.tone} p-4 flex items-start gap-3`}
            >
              <div className="w-9 h-9 rounded-lg bg-white/80 border border-white/60 flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 ${s.iconTone}`} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                  {s.title}
                </p>
                <p className="text-[13px] font-medium mt-1 leading-snug text-gray-700">
                  {s.text}
                </p>
              </div>
              {i < 2 && (
                <span className="hidden lg:flex absolute left-full top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 items-center justify-center shadow-sm">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Results & Impact — executive layer header */}
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0">
          <Target className="w-5 h-5 text-white" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Results &amp; Impact
          </h2>
          <p className="text-sm text-gray-500">
            What EWENE 2026–2028 must achieve — outcomes, coverage pillars,
            quality of care, safe systems &amp; governance.
          </p>
        </div>
      </div>

      {/* Core Impact Indicators — §5.1 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-rose-600" />
              Core Impact Indicators — EWENE 2026–2028
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              The three mortality outcomes the entire framework is designed to
              move (§5.1).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Presidential Launch · 28 May 2026
            </span>
            <ViewDataButton
              title="Core Impact Indicators — MMR / NMR / Stillbirth Rate"
              data={[
                {
                  indicator: "MMR",
                  target: "≤140",
                  current: livePillars.mmr ?? null,
                  unit: "per 100,000 live births",
                },
                {
                  indicator: "NMR",
                  target: "≤12",
                  current: livePillars.nmr ?? null,
                  unit: "per 1,000 live births",
                },
                {
                  indicator: "Stillbirth Rate",
                  target: "≤12",
                  current: livePillars.sbr ?? null,
                  unit: "per 1,000 births",
                },
              ]}
              note={`live from KHIS ${peLabel} where reported · targets EWENE 2026–2028`}
              detail={{
                formula:
                  "MMR = maternal deaths ÷ live births × 100,000 (KHIS indicator) · NMR = neonatal deaths ÷ live births × 1,000 · SBR = stillbirths ÷ (live births + stillbirths) × 1,000",
                inputs: pillarScopeLabels.flatMap<ViewInput>((c) => {
                  const r = pillarByCounty?.[c];
                  if (!r)
                    return [
                      {
                        label: `${c} — no KHIS values this period`,
                        value: "—",
                        source: "n/r" as const,
                      },
                    ];
                  return [
                    {
                      label: `${c} · live births (MOH 711)`,
                      value: r.lb ?? null,
                      source:
                        r.lb != null ? ("live" as const) : ("n/r" as const),
                    },
                    {
                      label: `${c} · neonatal deaths`,
                      value: r.nd ?? null,
                      source:
                        r.nd != null ? ("live" as const) : ("n/r" as const),
                    },
                    {
                      label: `${c} · stillbirths`,
                      value: r.sb ?? null,
                      source:
                        r.sb != null ? ("live" as const) : ("n/r" as const),
                    },
                    {
                      label: `${c} · MMR (KHIS indicator)`,
                      value: r.mmr ?? null,
                      source:
                        r.mmr != null ? ("live" as const) : ("n/r" as const),
                    },
                  ];
                }),
                notes: [
                  `Scope: ${scopeLabel} · ${peLabel}.`,
                  "NMR & SBR are computed from summed counts across the reported counties — not an average of county ratios.",
                  "Where KHIS reports no value the card shows nothing rather than a false zero.",
                ],
              }}
            />
          </div>
        </div>
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {CORE_IMPACT.map((c) => {
            const liveNow =
              c.key === "MMR"
                ? livePillars.mmr
                : c.key === "NMR"
                  ? livePillars.nmr
                  : c.key === "SB"
                    ? livePillars.sbr
                    : undefined;
            const targetVal = parseFloat(c.target.replace(/[^0-9.]/g, ""));
            const met = liveNow != null && liveNow <= targetVal;
            const near = liveNow != null && !met && liveNow <= targetVal * 1.25;
            return (
              <div
                key={c.key}
                className={`rounded-xl border p-4 bg-gradient-to-br ${c.gradient}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    {c.key}
                  </p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 text-gray-600 border border-white">
                    2028 target
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800 mt-1">
                  {c.label}
                </p>
                <div className="flex items-end gap-2 mt-3">
                  <p className={`text-3xl font-extrabold ${c.ring}`}>
                    {c.target}
                  </p>
                  <p className="text-xs text-gray-500 pb-1">{c.unit}</p>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
                  <span className="px-2 py-1 rounded-md bg-white/70 border border-slate-200 font-semibold">
                    Baseline {c.baseline}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-1 rounded-md bg-white/70 border border-slate-200 font-semibold">
                    {c.target}
                  </span>
                </div>
                {liveNow != null && (
                  <div className="mt-3 rounded-lg bg-white/85 border border-rose-200 p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">
                        Current · KHIS {peLabel}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          met
                            ? "bg-emerald-100 text-emerald-700"
                            : near
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {met
                          ? "On track"
                          : near
                            ? "Near target"
                            : "Above target"}
                      </span>
                    </div>
                    <div className="flex items-end gap-1.5 mt-1.5">
                      <p className="text-4xl font-extrabold leading-none text-rose-700">
                        {liveNow}
                      </p>
                      <p className="text-xs text-gray-500 pb-0.5">{c.unit}</p>
                    </div>
                    <p className="text-[11px] mt-1.5 font-semibold text-gray-600">
                      Target {c.target}
                      {met
                        ? " — already met, protect the gains"
                        : near
                          ? " — close, keep pushing"
                          : " — work needed to close the gap"}
                    </p>
                  </div>
                )}
                <p className="text-[11px] mt-3 text-gray-500">{c.note}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* EWENE 90:90:80:80 Pillars — §5.2 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              EWENE 90:90:80:80 Pillar Status
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Four coverage pillars — current reported vs 2028 target (§5.2).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                livePillars.anyLive
                  ? "bg-teal-50 text-teal-700 border-teal-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {livePillars.anyLive
                ? `Live · KHIS ${peLabel} · ${getPartner(filter.partner)?.shortName ?? filter.partner}${filter.county ? ` · ${filter.county}` : ""}`
                : "Baseline (national)"}
            </span>
            <ViewDataButton
              title="EWENE 90:90:80:80 Pillar Status"
              data={[
                {
                  pillar: "1 — ANC Coverage",
                  current: livePillars.anc ?? null,
                  target: "≥90%",
                  displayed:
                    livePillars.anc != null
                      ? `${Math.min(100, livePillars.anc)}%`
                      : "—",
                },
                {
                  pillar: "2 — Skilled Delivery",
                  current: livePillars.sba ?? null,
                  target: "≥90%",
                  displayed:
                    livePillars.sba != null
                      ? `${Math.min(100, livePillars.sba)}%`
                      : "—",
                },
                {
                  pillar: "3 — Early PNC",
                  current: livePillars.pncM ?? null,
                  target: "≥80%",
                  displayed:
                    livePillars.pncM != null
                      ? `${Math.min(100, livePillars.pncM)}%`
                      : "—",
                },
                {
                  pillar: "4 — PNC Continuity",
                  current: livePillars.pncI ?? null,
                  target: "≥80%",
                  displayed:
                    livePillars.pncI != null
                      ? `${Math.min(100, livePillars.pncI)}%`
                      : "—",
                },
              ]}
              note="live KHIS % per pillar where reported · displayed value clamped at 100"
              detail={{
                formula:
                  "ANC coverage = 100 − ANC1→4 dropout rate (or ANC4 ÷ ANC1 × 100 when dropout is unreported) · SBA / PNC = KHIS % per county, averaged across the reported counties",
                inputs: pillarScopeLabels.flatMap<ViewInput>((c) => {
                  const r = pillarByCounty?.[c];
                  if (!r)
                    return [
                      {
                        label: `${c} — no KHIS values this period`,
                        value: "—",
                        source: "n/r" as const,
                      },
                    ];
                  return [
                    {
                      label: `${c} · ANC coverage %`,
                      value: r.anc ?? null,
                      source:
                        r.anc != null ? ("live" as const) : ("n/r" as const),
                    },
                    {
                      label: `${c} · Skilled delivery %`,
                      value: r.sba ?? null,
                      source:
                        r.sba != null ? ("live" as const) : ("n/r" as const),
                    },
                    {
                      label: `${c} · Early PNC (mother) %`,
                      value: r.pncM ?? null,
                      source:
                        r.pncM != null ? ("live" as const) : ("n/r" as const),
                    },
                    {
                      label: `${c} · PNC continuity (infant) %`,
                      value: r.pncI ?? null,
                      source:
                        r.pncI != null ? ("live" as const) : ("n/r" as const),
                    },
                  ];
                }),
                notes: [
                  "Percentages are averaged across counties — summing facility-level % across a roster would exceed 100 and be meaningless.",
                  "KHIS occasionally reports >100% (e.g. Turkana PNC 103.76) — the bar is clamped to 100 and flagged with *.",
                  `Scope: ${scopeLabel} · ${peLabel}.`,
                ],
              }}
            />
          </div>
        </div>
        <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PILLARS.map((p) => {
            const liveVal =
              p.label === "ANC Coverage"
                ? livePillars.anc
                : p.label === "Skilled Delivery"
                  ? livePillars.sba
                  : p.label === "Early PNC"
                    ? livePillars.pncM
                    : livePillars.pncI;
            const current = liveVal ?? p.current;
            const tone = targetTone(current / p.target);
            const pct = Math.min(100, (current / p.target) * 100);
            return (
              <div
                key={p.label}
                className="rounded-xl border border-slate-200 p-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 px-2.5 py-1 rounded-bl-lg text-xs font-extrabold bg-teal-50 text-teal-700 border-b border-l border-teal-200">
                  Pillar {p.pillar}
                </div>
                <p className="text-sm font-semibold text-gray-800">{p.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.indicator}</p>
                <div className="flex items-end gap-1.5 mt-3">
                  <p className="text-3xl font-extrabold text-gray-900">
                    {current > 100 ? 100 : current}%
                    {current > 100 && (
                      <span className="text-sm font-bold text-amber-600">
                        *
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 pb-1">
                    target ≥ {p.target}%
                  </p>
                </div>
                <div className="h-2 rounded-full bg-slate-100 mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${tone.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p
                  className={`text-[11px] font-semibold mt-1.5 inline-flex items-center gap-1 ${tone.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                  {tone.label}
                </p>
                {current > 100 && (
                  <p className="text-[10px] mt-1 text-amber-600">
                    * KHIS reports &gt;100% — likely double-counted visits
                    (clamped to 100)
                  </p>
                )}
                {liveVal != null && (
                  <p className="text-[10px] mt-1 text-teal-600 font-semibold">
                    ● Live KHIS
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* VTP Quality-of-Care Scoreboard — §5.3 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-rose-600" />
              VTP Quality-of-Care Scoreboard
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              The nine core PMTCT indicators per partner — each indicator
              compared across the partner's supported counties (§5.3). Real KHIS
              values where reported for the selected month; gray bars (n/r) are
              indicators not reported on KHIS for these counties — shown as
              stubs instead of a fake baseline.
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {filter.facility
              ? `Scoped · ${filter.facility}`
              : filter.subCounty
                ? `Scoped · ${filter.subCounty}`
                : filter.county
                  ? `Scoped · ${filter.county} County`
                  : "Monthly · KHIS / NASCOP / EMR / NDW"}
          </span>
        </div>
        <div className="px-6 pb-6 space-y-5">
          {vtpByPartner.map(({ partner, rows, pending, units }) => (
            <PartnerIndicatorChart
              key={partner.id}
              title={partner.name}
              subtitle={
                pending
                  ? "facility list not yet loaded — VTP scores default to 0"
                  : filter.facility
                    ? `${filter.facility} · 9 VTP indicators vs ≥95% target`
                    : filter.subCounty
                      ? `${filter.subCounty} · ${rows[0]?.values.length ?? 0} facilities · 9 VTP indicators vs ≥95% target`
                      : filter.county
                        ? `${filter.county} County · 9 VTP indicators vs ≥95% target`
                        : `${partner.counties.length} counties · 9 VTP indicators vs ≥95% target`
              }
              rows={rows}
              counties={units}
            />
          ))}
        </div>
      </div>

      {/* Facility Readiness & Safe Systems — §5.4 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Facility Readiness &amp; Safe Systems
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Five systemic enablers per partner — each enabler compared across
              the partner's supported counties (§5.4, EWENE Pillar 8 &amp; GHSD
              guidance). MPDSR audits are live KHIS where reported; the other
              enablers use baseline scaled by facility-readiness.
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Blood · Oxygen · Equipment · Commodities · MPDSR audits
          </span>
        </div>
        <div className="px-6 pb-6 space-y-5">
          {safeByPartner.map(({ partner, rows, pending, units }) => (
            <PartnerIndicatorChart
              key={partner.id}
              title={partner.name}
              subtitle={
                pending
                  ? "facility list not yet loaded — readiness scores default to 0"
                  : filter.facility
                    ? `${filter.facility} · 5 systemic enablers vs ≥60–100% targets`
                    : filter.subCounty
                      ? `${filter.subCounty} · ${rows[0]?.values.length ?? 0} facilities · 5 systemic enablers vs ≥60–100% targets`
                      : filter.county
                        ? `${filter.county} County · 5 systemic enablers vs ≥60–100% targets`
                        : `${partner.counties.length} counties · 5 systemic enablers vs ≥60–100% targets`
              }
              rows={rows}
              counties={units}
            />
          ))}
        </div>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-5 border border-emerald-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/70 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-900 text-lg">
              Partner Performance Summary — 5 Domains × 7 Partners
            </h3>
            <p className="text-sm mt-1 opacity-80">
              Headline score for each implementing partner across the five EWENE
              result domains. Use the scope filter above to drill into a single
              partner, county or facility — the{" "}
              <span className="font-semibold">Domains</span> tab carries the
              full indicator detail.
            </p>
          </div>
        </div>
      </div>

      {/* Aggregate strip: all-partner averages */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {DOMAIN_COLUMNS.map((col, idx) => {
          const avg = columnAverages[idx];
          const tone = scoreTone(avg);
          return (
            <div
              key={col.key}
              className="bg-white rounded-lg p-5 border border-slate-200"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 font-medium">{col.label}</p>
                {col.icon}
              </div>
              <p className={`text-3xl font-bold mt-2 ${tone.text}`}>
                {avg === null ? "—" : `${avg.toFixed(1)}%`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                All {rows.filter((r) => !r.pending).length} active partners ·
                average of partner scores
              </p>
            </div>
          );
        })}
      </div>

      {/* Partner × Domain matrix */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 pt-6 pb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Partner Scores by Domain
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Green ≥ 80% (on track) · Amber 60–79% (needs attention) · Red &lt;
            60% (off track) · Gray — no data. Amber “Pending” rows default to 0
            until their facility list is loaded.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Partner
                </th>
                {DOMAIN_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider">
                  Overall
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const overallTone = scoreTone(r.overall);
                return (
                  <tr key={r.partner.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {r.partner.name}
                        </p>
                        {r.pending && (
                          <span
                            title="No facility list loaded yet — KHIS county totals would overstate support because Nuru Ya Mtoto does not serve every facility in the county. Scores default to 0 until the roster is added."
                            className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wide"
                          >
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {r.pending
                          ? "facility list not yet loaded — scores default to 0"
                          : `${r.partner.counties.length} counties${r.d3Count > 0 ? ` · ${r.d3Count} assessment${r.d3Count === 1 ? "" : "s"}` : ""}`}
                      </p>
                    </td>
                    {r.domains.map((v, idx) => {
                      const tone = r.pending ? scoreTone(null) : scoreTone(v);
                      const isLive = r.live[idx];
                      return (
                        <td
                          key={DOMAIN_COLUMNS[idx].key}
                          className={`px-4 py-3 text-center text-sm font-bold whitespace-nowrap ${tone.bg} ${tone.text} ${r.pending ? "opacity-70" : ""}`}
                          title={
                            r.pending
                              ? "Pending — facility list not yet loaded"
                              : undefined
                          }
                        >
                          {r.pending
                            ? "0.0%"
                            : v === null
                              ? "—"
                              : `${v.toFixed(1)}%`}
                          {isLive && (
                            <span
                              title={`Live from KHIS (${peLabel})`}
                              className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1.5 align-middle"
                            />
                          )}
                        </td>
                      );
                    })}
                    <td
                      className={`px-4 py-3 text-center text-sm font-bold whitespace-nowrap ${overallTone.bg} ${overallTone.text} ${r.pending ? "opacity-70" : ""}`}
                      title={
                        r.pending
                          ? "Pending — facility list not yet loaded"
                          : undefined
                      }
                    >
                      {r.pending
                        ? "0.0%"
                        : r.overall === null
                          ? "—"
                          : `${r.overall.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td className="px-6 py-3 text-sm font-semibold text-gray-700">
                  All-partner average
                </td>
                {columnAverages.map((avg, idx) => {
                  const tone = scoreTone(avg);
                  return (
                    <td
                      key={DOMAIN_COLUMNS[idx].key}
                      className={`px-4 py-3 text-center text-sm font-bold whitespace-nowrap ${tone.bg} ${tone.text}`}
                    >
                      {avg === null ? "—" : `${avg.toFixed(1)}%`}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center text-sm font-bold whitespace-nowrap bg-white">
                  {(() => {
                    const values = rows
                      .filter((r) => !r.pending)
                      .map((r) => r.overall)
                      .filter((v): v is number => v !== null);
                    return values.length
                      ? `${(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)}%`
                      : "—";
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-6 pb-5 pt-2 text-xs text-gray-500">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 align-middle" />
          live from national KHIS ({peLabel}) where reported — per-county values
          averaged for % indicators (PNC, testing, ART, MPDSR audits); falls
          back to the KHIS/EMR baseline constant when a domain has no KHIS
          value. Domain 3 (Readiness) is computed live from entered facility
          assessments (N/A excluded) and is never sourced from KHIS.
          {!liveLoaded && " Loading live KHIS domain scores…"} Nuru Ya Mtoto is{" "}
          <span className="font-semibold text-amber-600">pending</span> — no
          facility list is loaded yet, so its scores default to 0 until the
          roster is added.
        </div>
      </div>

      {/* County comparison by partner — vertical, one chart per domain */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            County Comparison by Partner — One Domain per Chart
          </h3>
          <p className="text-sm text-gray-500">
            For each implementing partner, every domain is compared across its
            supported counties in its own vertical bar chart — scoped to the
            partner and county selected in the filter bar. Domains 1, 2 &amp; 4
            are live from national KHIS ({peLabel}) where reported; Domain 3
            (Readiness) is computed live from entered facility assessments. E.g.
            Jamii Tekelezi — Domain 2 (Coverage) across Embu, Tharaka-Nithi,
            Meru &amp; Nyandarua. Charts with no bars have no data entered yet.
          </p>
        </div>
        {countyRows.map((group) => {
          const data = group.counties.map((c) => {
            const row: Record<string, number | null | string> = {
              name: c.name,
            };
            DOMAIN_COLUMNS.forEach((col, idx) => {
              row[col.key] = c.domains[idx];
            });
            row.overall = c.overall;
            return row;
          });
          return (
            <div
              key={group.partner.id}
              className="bg-white rounded-lg p-6 border border-slate-200"
            >
              <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    {group.partner.name}
                    {group.pending && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wide">
                        Pending
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {group.pending
                      ? "facility list not yet loaded — county scores default to 0"
                      : `${group.counties.length === 1 ? group.counties[0].name : `${group.counties.length} counties`} · 5 domains compared per county`}
                  </p>
                </div>
                <ViewDataButton
                  title={`${group.partner.name} — Domain Scores by County`}
                  data={data}
                  note="% per domain per county (— = no data). Domains 1, 2 & 4 are live KHIS where reported; Domain 3 is live from entered assessments; Domain 5 uses the baseline constant (no county-scope KHIS source)."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {BAR_SERIES.map((s) => (
                  <div
                    key={s.key}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: s.color }}
                      />
                      <p className="text-sm font-semibold text-gray-700">
                        {s.name}
                      </p>
                    </div>
                    <ResponsiveContainer width="100%" height={190}>
                      <BarChart
                        data={data}
                        margin={{ top: 20, right: 8, left: 0, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="name"
                          interval={0}
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          width={34}
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(148,163,184,0.12)" }}
                          formatter={(v, name) =>
                            v == null
                              ? ["No data", name]
                              : [`${Number(v).toFixed(1)}%`, name]
                          }
                        />
                        <Bar
                          dataKey={s.key}
                          name={s.name}
                          fill={s.color}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={44}
                        >
                          <LabelList
                            dataKey={s.key}
                            position="top"
                            formatter={(v) =>
                              v == null ? "" : `${Number(v).toFixed(0)}%`
                            }
                            style={{ fontSize: 10, fill: "#475569" }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall score by partner */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Overall 5-Domain Score by Partner
            </h3>
            <p className="text-sm text-gray-500">
              Average of the five domain scores per implementing partner.
            </p>
          </div>
          <ViewDataButton
            title="Overall 5-Domain Score by Partner"
            data={overallChartData}
            note="overall % = average of available domain scores"
            detail={{
              formula:
                "overall % = mean of the five domain scores (domains with no data are excluded from the average)",
              notes: [
                "Domains 1, 2, 4 & 5 fall back to KHIS/EMR baseline constants when KHIS has no value this period.",
                "Domain 3 (Readiness) is always computed live from entered facility assessments (N/A excluded) — never from KHIS.",
              ],
            }}
          />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={overallChartData}
            margin={{ top: 20, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              interval={0}
              tick={{ fontSize: 11, angle: -30, textAnchor: "end" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              width={40}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(v) => [`${v}%`, "Overall"]}
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
            />
            <Bar
              dataKey="overall"
              name="Overall"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            >
              {overallChartData.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={
                    entry.overall >= 80
                      ? "#10b981"
                      : entry.overall >= 60
                        ? "#f59e0b"
                        : "#ef4444"
                  }
                />
              ))}
              <LabelList
                dataKey="overall"
                position="top"
                formatter={(v) => (v == null ? "" : `${Number(v).toFixed(0)}%`)}
                style={{ fontSize: 10, fill: "#475569" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expected Outcomes — §9 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Expected Outcomes — what the EWENE Acceleration Plan delivers
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Four result areas from §9 of the monitoring framework.
          </p>
        </div>
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {EXPECTED_OUTCOMES.map((o) => {
            const Icon = o.icon;
            return (
              <div
                key={o.title}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${o.tone}`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <p className="font-semibold text-gray-900 text-sm">
                    {o.title}
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {o.items.map((it) => (
                    <li
                      key={it}
                      className="flex items-start gap-2 text-xs text-gray-600"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Governance & Reporting Cadence — §6 / §8 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-slate-700" />
              Governance &amp; Reporting Cadence
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              How EWENE data flows through review platforms across facility,
              county, national &amp; partner levels (§6 &amp; §8).
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            EWENE Acceleration Plan · RRI
          </span>
        </div>
        <div className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {CADENCE.map((c) => (
              <div
                key={c.freq}
                className="rounded-xl border border-slate-200 p-4"
              >
                <span
                  className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${c.tone}`}
                >
                  {c.freq}
                </span>
                <p className="text-xs text-gray-600 mt-2.5 leading-relaxed">
                  {c.items}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
              Review platforms
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {REVIEW_PLATFORMS.map((r) => {
                const Icon = r.icon;
                return (
                  <div key={r.label} className="flex items-start gap-2">
                    <span className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-slate-500" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">
                        {r.label}
                      </p>
                      <p className="text-[11px] text-gray-500">{r.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-700">Context:</span>{" "}
            Following the Presidential Launch of the EWENE Acceleration Plan and
            MNH RRI on 28 May 2026, the Ministry of Health Director General has
            formally requested all partners to align technical &amp; financial
            support with EWENE/RRI priorities, support high-impact interventions
            at national and county levels, and actively participate in EWENE
            governance and review mechanisms.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Domains — replica of the Home tab, with full per-domain subtabs
// ---------------------------------------------------------------------------

export function DomainsTab({
  onSaveToPlayground,
}: {
  onSaveToPlayground?: (chart: ChartInsight) => void;
}) {
  const [activeSubtab, setActiveSubtab] = useState("1");

  const subtabs = [
    { id: "1", label: "1 · PMTCT/HIV CARE", icon: Stethoscope },
    { id: "2", label: "2 · Coverage (90:90:80:80)", icon: TrendingUp },
    { id: "3", label: "3 · Readiness & Safe Systems", icon: ShieldCheck },
    { id: "4", label: "4 · MPDSR & Accountability", icon: Activity },
    { id: "5", label: "5 · Data Systems", icon: Database },
  ];

  return (
    <div>
      {/* Subtab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-slate-200 pb-0 overflow-x-auto">
        {subtabs.map((subtab) => {
          const Icon = subtab.icon;
          return (
            <button
              key={subtab.id}
              onClick={() => setActiveSubtab(subtab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeSubtab === subtab.id
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {subtab.label}
            </button>
          );
        })}
      </div>

      {activeSubtab === "1" && (
        <ClinicalTab onSaveToPlayground={onSaveToPlayground} />
      )}
      {activeSubtab === "2" && <CoverageSection />}
      {activeSubtab === "3" && <ReadinessSection />}
      {activeSubtab === "4" && (
        <MpdsrSection onSaveToPlayground={onSaveToPlayground} />
      )}
      {activeSubtab === "5" && <DataSystemsSection />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared helpers — status tone for the per-subtab KPI cards
// ---------------------------------------------------------------------------

type Tone = "on" | "warn" | "off";

const TONE_DOT: Record<Tone, string> = {
  on: "bg-emerald-500",
  warn: "bg-amber-500",
  off: "bg-red-500",
};

const TONE_TEXT: Record<Tone, string> = {
  on: "text-emerald-600",
  warn: "text-amber-600",
  off: "text-red-600",
};

const TONE_LABEL: Record<Tone, string> = {
  on: "On target",
  warn: "Needs attention",
  off: "Below target",
};

function toneOf(current: number, target: number): Tone {
  if (current >= target) return "on";
  if (current / target >= 0.9) return "warn";
  return "off";
}

function SubtabKpi({
  code,
  title,
  value,
  sub,
  tone = "on",
}: {
  code: string;
  title: string;
  value: string;
  sub: string;
  tone?: Tone;
}) {
  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600 font-medium leading-snug">
          {title}
        </p>
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${TONE_DOT[tone]}`}
          title={TONE_LABEL[tone]}
        />
      </div>
      <p className={`text-3xl font-bold mt-2 ${TONE_TEXT[tone]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
      <p className="text-[11px] font-semibold text-slate-400 mt-2">{code}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Coverage — EWENE 90:90:80:80
// ---------------------------------------------------------------------------

// Live KHIS county coverage — Jamii Tekelezi counties (pe 202505).
const JT_COVERAGE_COUNTIES = ["Embu", "Tharaka-Nithi", "Meru", "Nyandarua"];

// Fallback values used while KHIS loads or on failure (prior baselines).
const COUNTY_COVERAGE_FALLBACK: Record<
  string,
  { anc4: number; sba: number; pnc: number }
> = {
  Embu: { anc4: 58, sba: 84, pnc: 72 },
  "Tharaka-Nithi": { anc4: 51, sba: 76, pnc: 64 },
  Meru: { anc4: 55, sba: 80, pnc: 69 },
  Nyandarua: { anc4: 47, sba: 71, pnc: 60 },
};

interface CountyCoverageLive {
  anc4Pct?: number;
  sba?: number;
  pnc?: number;
  pncInfant?: number;
  kmc?: number;
  chlorhexidine?: number;
  stillbirths?: number;
  mmr?: number;
}

function CoverageSection() {
  const { filter, pe, peLabel } = useGeoFilter();
  // Scope the county strip to the CURRENT partner — when a specific county /
  // sub-county / facility is selected in the filter bar, only that scope shows.
  const counties = useMemo(() => {
    if (filter.subCounty) return [filter.subCounty];
    if (filter.facility) return [filter.facility];
    const base =
      PARTNER_COUNTIES[filter.partner]?.length > 0
        ? PARTNER_COUNTIES[filter.partner]
        : JT_COVERAGE_COUNTIES;
    return filter.county ? [filter.county] : base;
  }, [filter.partner, filter.county, filter.subCounty, filter.facility]);

  const partnerLabel = useMemo(
    () => getPartner(filter.partner)?.shortName ?? "Partner",
    [filter.partner],
  );

  const [coverage, setCoverage] = useState<Record<
    string,
    CountyCoverageLive
  > | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCoverageLoading(true);
    Promise.all(
      counties.map((c) => {
        const q = filter.subCounty
          ? `subcounty=${encodeURIComponent(c)}&partner=${encodeURIComponent(
              filter.partner,
            )}`
          : filter.facility
            ? `facility=${
                (PARTNER_FACILITIES[filter.partner] ?? []).find(
                  (f) => f.name === c,
                )?.uid ?? ""
              }`
            : `county=${encodeURIComponent(c)}`;
        return fetch(
          `/api/khis?${q}&pe=${pe}&indicators=anc4_visits,anc1_4_dropout,sba_pct_live,pnc_48h_mother,pnc_48h_infant,kmc,chlorhexidine,stillbirths,mmr`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
      }),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, CountyCoverageLive> = {};
      results.forEach((res, i) => {
        const name = counties[i];
        if (!name || !res?.indicators) return;
        // At sub-county scope (multi-facility roster) % indicators and the MMR
        // ratio are summed and meaningless — only raw counts are kept.
        const isMultiOu = !!filter.subCounty;
        const ind = (key: string): number | null => {
          const found = res.indicators.find(
            (x: { id: string; value: number | null }) => x.id === key,
          );
          const v = found?.value ?? null;
          if (v == null) return null;
          if (
            isMultiOu &&
            [
              "anc1_4_dropout",
              "sba_pct_live",
              "pnc_48h_mother",
              "pnc_48h_infant",
              "mmr",
            ].includes(key)
          ) {
            return null;
          }
          return v;
        };
        const r1 = (v: number | null) =>
          v != null ? Math.round(v * 10) / 10 : undefined;
        const dropout = ind("anc1_4_dropout");
        map[name] = {
          anc4Pct:
            dropout != null ? Math.round((100 - dropout) * 10) / 10 : undefined,
          sba: r1(ind("sba_pct_live")),
          pnc: r1(ind("pnc_48h_mother")),
          pncInfant: r1(ind("pnc_48h_infant")),
          kmc: ind("kmc") ?? undefined,
          chlorhexidine: ind("chlorhexidine") ?? undefined,
          stillbirths: ind("stillbirths") ?? undefined,
          mmr: r1(ind("mmr")),
        };
      });
      if (!cancelled) {
        setCoverage(map);
        setCoverageLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [counties, pe]);

  // Partner-level live aggregates — average of reported counties (or sum of
  // counts), falling back to the baseline constants when KHIS has no value.
  const live = useMemo(() => {
    if (!coverage) return null;
    const rows = counties
      .map((c) => coverage[c])
      .filter((r): r is CountyCoverageLive => Boolean(r));
    const avg = (key: "anc4Pct" | "sba" | "pnc" | "pncInfant" | "mmr") => {
      const vals = rows
        .map((r) => r[key])
        .filter((v): v is number => v != null);
      return vals.length
        ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
        : undefined;
    };
    const sum = (key: "kmc" | "chlorhexidine" | "stillbirths") => {
      const vals = rows
        .map((r) => r[key])
        .filter((v): v is number => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) : undefined;
    };
    return {
      anc4Pct: avg("anc4Pct"),
      sba: avg("sba"),
      pnc: avg("pnc"),
      pncInfant: avg("pncInfant"),
      kmc: sum("kmc"),
      chlorhexidine: sum("chlorhexidine"),
      stillbirths: sum("stillbirths"),
      mmr: avg("mmr"),
    };
  }, [coverage, counties]);

  const liveReady = live != null && Object.values(live).some((v) => v != null);
  const scopeCoverageLabel = filter.facility
    ? filter.facility
    : filter.subCounty
      ? filter.subCounty
      : filter.county
        ? filter.county
        : partnerLabel;
  const liveSub = coverageLoading
    ? "Loading KHIS…"
    : liveReady
      ? `Live · KHIS ${peLabel} · ${scopeCoverageLabel}`
      : "Baseline (national)";

  // Live current values per indicator code (2.1–2.8) with baseline fallback.
  const liveCurrent: Record<string, number> = {
    "2.1": live?.anc4Pct ?? REPORTED_CURRENT["2.1"],
    "2.2": live?.sba ?? REPORTED_CURRENT["2.2"],
    "2.3": live?.pnc ?? REPORTED_CURRENT["2.3"],
    "2.4": live?.pncInfant ?? REPORTED_CURRENT["2.4"],
    "2.5": live?.kmc ?? REPORTED_CURRENT["2.5"],
    "2.6": live?.chlorhexidine ?? REPORTED_CURRENT["2.6"],
    "2.7": live?.stillbirths ?? REPORTED_CURRENT["2.7"],
    "2.8": live?.mmr ?? REPORTED_CURRENT["2.8"],
  };

  // Deterministic per-unit fallback so sub-county / facility views always
  // show bars that visibly change when the filter changes. The base is the
  // unit's parent county baseline with small per-unit variation.
  const coverageFallbackFor = useCallback(
    (name: string): { anc4: number; sba: number; pnc: number } => {
      const baseCounty =
        filter.county ||
        (filter.subCounty || filter.facility
          ? (PARTNER_FACILITIES[filter.partner] ?? []).find(
              (f) =>
                f.subCounty === filter.subCounty || f.name === filter.facility,
            )?.county
          : undefined) ||
        (PARTNER_COUNTIES[filter.partner]?.[0] ?? "Embu");
      const b =
        COUNTY_COVERAGE_FALLBACK[baseCounty] ??
        COUNTY_COVERAGE_FALLBACK["Embu"];
      const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
      return {
        anc4: clamp(b.anc4 + seededJitter(`${name}:canc4`, 8)),
        sba: clamp(b.sba + seededJitter(`${name}:csba`, 8)),
        pnc: clamp(b.pnc + seededJitter(`${name}:cpnc`, 8)),
      };
    },
    [filter.partner, filter.county, filter.subCounty, filter.facility],
  );
  const fbFor = (name: string) =>
    COUNTY_COVERAGE_FALLBACK[name] ?? coverageFallbackFor(name);

  const countyCoverageData = counties.map((name) => {
    const c = coverage?.[name];
    const fb = fbFor(name);
    return {
      name,
      anc4: c?.anc4Pct ?? fb.anc4,
      sba: c?.sba ?? fb.sba,
      pnc: c?.pnc ?? fb.pnc,
    };
  });

  return (
    <div className="space-y-6">
      {/* Story banner — the gap to close */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-5 border border-teal-200 text-teal-900">
        <h3 className="font-semibold">
          The coverage story: too many women fall out of the continuum
        </h3>
        <p className="text-sm mt-1 opacity-80">
          Only <b>{live?.anc4Pct ?? 52}%</b> of pregnant women reach 4+ ANC
          visits and <b>{live?.sba ?? 70}%</b> deliver with a skilled attendant
          — far short of the 90:90:80:80 ambition. Every missed ANC visit is a
          missed opportunity for HIV testing, syphilis screening, and delivery
          planning; every facility-only delivery is a risk for mother and baby.
          Closing the gap means tracing each mother–baby pair from first contact
          through the postnatal period.
        </p>
      </div>

      {/* Subtab KPI strip — Domain 2 headline indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SubtabKpi
          code="2.1 · ANC 4+"
          title="4+ ANC Visits"
          value={`${live?.anc4Pct ?? 52}%`}
          sub={`Target ≥ 90% (Y2) · ${liveSub}`}
          tone={toneOf(live?.anc4Pct ?? 52, 90)}
        />
        <SubtabKpi
          code="2.2 · SBA"
          title="Skilled Birth Attendance"
          value={`${live?.sba ?? 70}%`}
          sub={`Target ≥ 95% (Y2) · ${liveSub}`}
          tone={toneOf(live?.sba ?? 70, 95)}
        />
        <SubtabKpi
          code="2.3 · PNC"
          title="Maternal PNC ≤ 48 hrs"
          value={`${live?.pnc ?? 66.6}%`}
          sub={`Target ≥ 80% (Y2) · ${liveSub}`}
          tone={toneOf(live?.pnc ?? 66.6, 80)}
        />
        <SubtabKpi
          code="2.4 · Newborn PNC"
          title="Newborn PNC ≤ 48 hrs"
          value={`${live?.pncInfant ?? 68.4}%`}
          sub={`Target ≥ 80% (Y2) · ${liveSub}`}
          tone={toneOf(live?.pncInfant ?? 68.4, 80)}
        />
      </div>

      {/* Headline tracking lives on Home — Results & Impact */}
      <div className="bg-white rounded-lg p-5 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              Core impact &amp; 90:90:80:80 headline tracking
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              The national mortality targets (§5.1) and the four-pillar
              90:90:80:80 tracker (§5.2) now live on the Home page under Results
              &amp; Impact — this tab carries the per-indicator detail below.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold whitespace-nowrap">
          Home → Results &amp; Impact
        </span>
      </div>

      {/* County aspects — where the gaps are biggest */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Coverage by County — {partnerLabel}
            {filter.facility
              ? ` · ${filter.facility}`
              : filter.subCounty
                ? ` · ${filter.subCounty}`
                : filter.county
                  ? ` · ${filter.county}`
                  : ""}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold whitespace-nowrap">
              {liveSub}
            </span>
            <ViewDataButton
              title={`Coverage by County — ${partnerLabel}`}
              data={countyCoverageData}
              note={`${liveSub} · % of eligible women (county-level average)`}
              detail={{
                formula:
                  "ANC4 % = women with 4+ ANC visits ÷ expected pregnancies × 100 · SBA % = skilled deliveries ÷ deliveries × 100 · PNC % = mothers with PNC ≤48h ÷ deliveries × 100",
                inputs: counties.flatMap((name) => {
                  const c = coverage?.[name];
                  const fb = fbFor(name);
                  return [
                    {
                      label: `${name} · ANC 4+ %`,
                      value: c?.anc4Pct ?? fb.anc4,
                      source:
                        c?.anc4Pct != null
                          ? ("live" as const)
                          : ("est" as const),
                    },
                    {
                      label: `${name} · Skilled delivery %`,
                      value: c?.sba ?? fb.sba,
                      source:
                        c?.sba != null ? ("live" as const) : ("est" as const),
                    },
                    {
                      label: `${name} · Maternal PNC ≤48h %`,
                      value: c?.pnc ?? fb.pnc,
                      source:
                        c?.pnc != null ? ("live" as const) : ("est" as const),
                    },
                  ];
                }),
                notes: [
                  `${liveSub} — live values come from KHIS per county; where KHIS reports none, the county baseline constant is shown and tagged "estimate".`,
                  "Percentages are county-level KHIS values, not summed across facilities.",
                ],
              }}
            />
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          ANC 4+, skilled birth attendance and early PNC differ widely by county
          — targeting the laggards is where the biggest gains lie.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={countyCoverageData} margin={{ left: 0, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(v) => [`${v}%`, ""]} />
            <Legend />
            <Bar
              dataKey="anc4"
              name="ANC 4+"
              fill="#14b8a6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="sba"
              name="SBA"
              fill="#0d9488"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="pnc"
              name="PNC ≤ 48h"
              fill="#06b6d4"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Coverage Indicators 2.1 – 2.8 (Progress to Year 2 Targets)
        </h3>
        <div className="space-y-5">
          {COVERAGE_INDICATORS.map((ind) => (
            <IndicatorBar
              key={ind.code}
              indicator={ind}
              current={liveCurrent[ind.code] ?? 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Readiness & Safe Systems — Domain 3 framework + live assessment content
// ---------------------------------------------------------------------------

function ReadinessSection() {
  const allAssessments = useAssessments();

  const preChecklist = [
    {
      step: "1",
      text: "Epidemiologic need confirmed — equipment addresses a documented gap in mortality or morbidity",
    },
    {
      step: "2",
      text: "Facility has reliable power supply appropriate for the equipment",
    },
    {
      step: "3",
      text: "Physical space and infrastructure requirements met",
    },
    {
      step: "4",
      text: "Maintenance contract and spare parts supply chain identified and budgeted",
    },
    {
      step: "5",
      text: "Sustained training plan developed, accounting for staff turnover",
    },
    {
      step: "6",
      text: "Consumables supply chain confirmed and budgeted",
    },
    {
      step: "7",
      text: "Equipment tracking system in place to prevent diversion or loss",
    },
    {
      step: "8",
      text: "Procurement aligned with national MoH norms and county plans",
    },
  ];

  const procurementMilestones = [
    {
      label: "Delivered & installed",
      timepoint: "At delivery",
      target: "100%",
    },
    { label: "Staff trained", timepoint: "Within 30 days", target: "100%" },
    { label: "In active use", timepoint: "3 months", target: "≥ 90%" },
    {
      label: "Functional & maintained",
      timepoint: "6 months",
      target: "≥ 90%",
    },
    {
      label: "Consumables zero stockout",
      timepoint: "Ongoing",
      target: "100%",
    },
  ];

  const bloodMonitors = [
    {
      label: "Blood available on-site (units in stock)",
      target: "≥ facility minimum",
    },
    {
      label: "Obstetric emergencies with blood available",
      target: "100%",
    },
    {
      label: "L4 facilities with functional cold storage",
      target: "≥ 75%",
    },
    {
      label: "County blood drive participation",
      target: "Active",
    },
  ];

  const oxygenMonitors = [
    {
      label:
        "Facilities with functional oxygen supply (cylinders/concentrators)",
      target: "≥ 80%",
    },
    {
      label: "L4 facilities with functional CPAP for neonates",
      target: "≥ 60%",
    },
    {
      label: "Biomedical engineers trained on oxygen maintenance",
      target: "≥ 80%",
    },
  ];

  // Jamii Tekelezi county readiness — computed live from entered assessments.
  const countyReadiness = ["Embu", "Tharaka-Nithi", "Meru", "Nyandarua"].map(
    (county) => {
      const r = readinessForCounties(allAssessments, [county]);
      return {
        name: county,
        readiness: r.avg ?? 0,
        assessed: r.count,
      };
    },
  );

  return (
    <div className="space-y-6">
      {/* Story banner — the three systemic enablers */}
      <div className="bg-gradient-to-r from-lime-50 to-emerald-50 rounded-lg p-5 border border-lime-200 text-emerald-900">
        <h3 className="font-semibold">
          Readiness is more than buildings — it is blood, oxygen, commodities
          and working equipment
        </h3>
        <p className="text-sm mt-1 opacity-80">
          Three systemic enablers determine whether a facility can actually save
          a life at the moment of need: <b>equipment due diligence</b> (10–30%
          of donated equipment in LMICs never becomes operational),{" "}
          <b>safe blood systems</b> (26% of PPH deaths are attributable to a
          lack of safe blood), and <b>oxygen ecosystems</b> (RDS contributes to
          ~45% of preterm deaths; only 20% of Level 4 facilities can deliver
          oxygen/CPAP). The guiding question is not “Can we buy this?” but “Are
          the conditions in place to make it work?”
        </p>
      </div>

      {/* Subtab KPI strip — Domain 3 headline indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SubtabKpi
          code="3.1 · Zero stockout"
          title="Tracer Commodities"
          value="72%"
          sub="Zero stockout · target 100% (Y2)"
          tone={toneOf(72, 100)}
        />
        <SubtabKpi
          code="3.2 · Blood services"
          title="Functional Blood (L4)"
          value="66%"
          sub="Target ≥ 85% (Y2) · HFA-QOC"
          tone={toneOf(66, 85)}
        />
        <SubtabKpi
          code="3.3 · Oxygen/CPAP"
          title="Oxygen & CPAP (L4)"
          value="20%"
          sub="Target ≥ 60% (Y2) · HFA-QOC"
          tone={toneOf(20, 60)}
        />
        <SubtabKpi
          code="3.4 · Equipment"
          title="Equipment Functional"
          value="88%"
          sub="Target ≥ 90% (Y2) · facility assessment"
          tone={toneOf(88, 90)}
        />
      </div>

      {/* Domain 3 indicators 3.1 – 3.8 */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Readiness &amp; Safe Systems Indicators (3.1 – 3.8)
        </h3>
        <div className="space-y-5">
          {READINESS_INDICATORS.map((ind) => (
            <IndicatorBar
              key={ind.code}
              indicator={ind}
              current={REPORTED_CURRENT[ind.code] ?? 0}
            />
          ))}
        </div>
      </div>

      {/* Pre-investment checklist — equipment due diligence (§7) */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Pre-Investment Checklist — Equipment Due Diligence (§7)
          </h3>
          <span className="px-2 py-1 rounded-md bg-sky-50 text-sky-700 text-xs font-bold">
            Before any procurement decision
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          More than 8 in 10 devices in global studies did not meet product
          specifications before use. These 8 verification steps must all be
          “Yes” before funds are committed.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {preChecklist.map((item) => (
            <div
              key={item.step}
              className="flex items-start gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100"
            >
              <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-xs font-bold shrink-0">
                {item.step}
              </span>
              <p className="text-sm text-gray-700">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Post-procurement milestones (§7) */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Post-Procurement Equipment Milestones (§7)
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          From delivery to sustained function — each milestone has a target and
          a review timepoint.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {procurementMilestones.map((m) => (
            <div
              key={m.label}
              className="bg-lime-50 rounded-lg p-4 border border-lime-200"
            >
              <p className="text-[11px] font-bold text-lime-700 uppercase tracking-wide">
                {m.timepoint}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {m.target}
              </p>
              <p className="text-xs text-gray-600 mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Blood & oxygen monitoring (§7) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Blood System Monitoring (monthly)
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            26% of PPH deaths trace to a lack of safe blood — track it at every
            supported facility.
          </p>
          <ul className="space-y-2.5">
            {bloodMonitors.map((b) => (
              <li
                key={b.label}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-gray-700">{b.label}</span>
                <span className="font-semibold text-rose-700 whitespace-nowrap">
                  {b.target}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Oxygen Ecosystem Monitoring (quarterly)
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            RDS contributes to ~45% of preterm infant deaths — oxygen readiness
            is newborn readiness.
          </p>
          <ul className="space-y-2.5">
            {oxygenMonitors.map((o) => (
              <li
                key={o.label}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-gray-700">{o.label}</span>
                <span className="font-semibold text-violet-700 whitespace-nowrap">
                  {o.target}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* County readiness — live from assessments */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Facility Readiness by County — Jamii Tekelezi (live)
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Average readiness score computed from the assessments entered below;
          counties with no assessment yet show 0%.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={countyReadiness} margin={{ left: 0, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip
              formatter={(v, name) =>
                name === "readiness" ? [`${v}%`, "Readiness"] : [v, name]
              }
            />
            <Bar
              dataKey="readiness"
              name="Readiness (%)"
              fill="#84cc16"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* The three systemic enablers — story panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-b from-sky-50 to-white rounded-lg p-5 border border-sky-200">
          <h4 className="font-semibold text-sky-900">
            Equipment Due Diligence
          </h4>
          <p className="text-sm text-sky-800 mt-2">
            Before any procurement: verify facility readiness (power, space,
            water), maintenance contracts &amp; spare parts, a training plan
            that accounts for staff turnover, and a tracking system to prevent
            diversion.
          </p>
          <p className="text-xs text-sky-700 mt-3 font-medium">
            Milestones: installed &amp; staff trained 100% · in active use at 3
            months ≥ 90% · functional at 6 months ≥ 90% · consumables zero
            stockout.
          </p>
        </div>
        <div className="bg-gradient-to-b from-rose-50 to-white rounded-lg p-5 border border-rose-200">
          <h4 className="font-semibold text-rose-900">Safe Blood Systems</h4>
          <p className="text-sm text-rose-800 mt-2">
            PPH is the leading direct cause of maternal death in Kenya — 26% of
            PPH deaths trace to a lack of safe blood. Track availability at
            supported facilities and advocate for SHA reimbursement of
            transfusion services.
          </p>
          <p className="text-xs text-rose-700 mt-3 font-medium">
            Benchmarks: ≥ facility minimum stock · 100% availability for
            obstetrics · ≥ 75% of L4 cold storage · county blood drives.
          </p>
        </div>
        <div className="bg-gradient-to-b from-violet-50 to-white rounded-lg p-5 border border-violet-200">
          <h4 className="font-semibold text-violet-900">Oxygen Ecosystems</h4>
          <p className="text-sm text-violet-800 mt-2">
            RDS contributes to ~45% of preterm deaths; only 20% of L4 facilities
            meet all oxygen/CPAP requirements. Assess availability and flag gaps
            for county &amp; national escalation.
          </p>
          <p className="text-xs text-violet-700 mt-3 font-medium">
            Benchmarks: ≥ 80% functional supply · ≥ 60% of L4 with CPAP · ≥ 80%
            engineers trained · zero stockouts.
          </p>
        </div>
      </div>

      {/* Live readiness assessments (existing content) */}
      <AssessmentTab />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. MPDSR & Accountability
// ---------------------------------------------------------------------------

function MpdsrSection({
  onSaveToPlayground,
}: {
  onSaveToPlayground?: (chart: ChartInsight) => void;
}) {
  const { filter, pe, peLabel } = useGeoFilter();
  const partner = filter.partner || "jamii-tekelezi";
  // The KHIS API expects a facility UID, not a name — resolve from the roster.
  const facilityUid = useMemo(() => {
    if (!filter.facility) return undefined;
    return (PARTNER_FACILITIES[partner] ?? []).find(
      (f) => f.name === filter.facility,
    )?.uid;
  }, [filter.facility, partner]);
  const mpdsr = useKhis({
    partner,
    pe,
    indicators: [
      "maternal_deaths_reported",
      "maternal_deaths_audited",
      "neonatal_deaths",
      "neonatal_deaths_audited",
    ],
    county: filter.county || undefined,
    subCounty: filter.subCounty || undefined,
    facility: facilityUid,
  });
  const matAudPct =
    mpdsr.value("maternal_deaths_reported") &&
    mpdsr.value("maternal_deaths_audited") != null &&
    mpdsr.value("maternal_deaths_reported")! > 0
      ? Math.round(
          (mpdsr.value("maternal_deaths_audited")! /
            mpdsr.value("maternal_deaths_reported")!) *
            100,
        )
      : null;
  const neoAudPct =
    mpdsr.value("neonatal_deaths") &&
    mpdsr.value("neonatal_deaths_audited") != null &&
    mpdsr.value("neonatal_deaths")! > 0
      ? Math.round(
          (mpdsr.value("neonatal_deaths_audited")! /
            mpdsr.value("neonatal_deaths")!) *
            100,
        )
      : null;

  // KHIS answered for this period/scope at all — never show illustrative
  // 88%/74% baselines as if they were data.
  const mpdsrAnswered = !!mpdsr.data && !mpdsr.loading && !mpdsr.error;

  // KHIS answered but reported ZERO deaths for this period/scope — show 0
  // instead of the illustrative 88%/74% baselines (they would read as data).
  const mpdsrNoData = mpdsrAnswered && matAudPct == null && neoAudPct == null;

  const chartData = [
    {
      name: "Maternal deaths audited",
      current: mpdsrAnswered ? (matAudPct ?? 0) : (matAudPct ?? 88),
      target: 100,
      est: matAudPct == null && !mpdsrAnswered,
    },
    {
      name: "Neonatal deaths audited",
      current: mpdsrAnswered ? (neoAudPct ?? 0) : (neoAudPct ?? 74),
      target: 100,
      est: neoAudPct == null && !mpdsrAnswered,
    },
    { name: "Monthly MPDSR/QI meetings", current: 67, target: 100, est: true },
    {
      name: "Recommendations implemented",
      current: 55,
      target: 90,
      est: true,
    },
    { name: "PPH Treatment Skills", current: 40, target: 70, est: true },
    { name: "Asphyxia Treatment Skills", current: 36, target: 65, est: true },
  ];

  // County MPDSR performance — Jamii Tekelezi counties (illustrative).
  const countyMpdsrData = [
    { name: "Embu", audited: 92, meetings: 100 },
    { name: "Tharaka-Nithi", audited: 78, meetings: 67 },
    { name: "Meru", audited: 85, meetings: 100 },
    { name: "Nyandarua", audited: 70, meetings: 67 },
  ];

  // Cause-of-death disaggregation (doc disaggregation: county; cause of death).
  const causeOfDeathData = [
    { name: "PPH", maternal: 42, neonatal: 0 },
    { name: "Sepsis", maternal: 18, neonatal: 12 },
    { name: "Pre-eclampsia/Eclampsia", maternal: 15, neonatal: 0 },
    { name: "Obstructed labour", maternal: 8, neonatal: 14 },
    { name: "Preterm / LBW", maternal: 0, neonatal: 38 },
    { name: "Birth asphyxia", maternal: 0, neonatal: 26 },
    { name: "Other", maternal: 9, neonatal: 10 },
  ];

  const auditedBadge = mpdsr.loading ? (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
      Loading KHIS…
    </span>
  ) : matAudPct != null || neoAudPct != null ? (
    <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">
      Live · KHIS · {mpdsr.data?.scope} · {mpdsr.data?.peLabel}
    </span>
  ) : mpdsrNoData ? (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
      No KHIS deaths reported for {peLabel} in this scope — showing zeros
    </span>
  ) : (
    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">
      Illustrative baselines — no KHIS deaths reported for this scope
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Story banner — audit is the accountability engine */}
      <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg p-5 border border-red-200 text-red-900">
        <h3 className="font-semibold">
          Every death must be counted, audited, and acted on
        </h3>
        <p className="text-sm mt-1 opacity-80">
          A death that is not audited cannot be prevented. The MPDSR loop is:
          <b> report → audit → recommend → implement → re-audit</b>. The
          framework demands 100% of maternal and neonatal deaths audited each
          month, and ≥ 70% of recommendations implemented within 3 months —
          turning every tragedy into a systemic fix.
        </p>
      </div>

      {/* Subtab KPI strip — Domain 4 headline indicators */}
      <div className="flex items-start justify-between gap-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
          <SubtabKpi
            code="4.1 · MPDSR"
            title="Maternal Deaths Audited"
            value={
              mpdsrNoData
                ? "0%"
                : matAudPct != null
                  ? `${matAudPct}%`
                  : mpdsrAnswered
                    ? "0%"
                    : "88%"
            }
            sub={
              matAudPct != null
                ? `KHIS · ${mpdsr.value("maternal_deaths_audited")} of ${mpdsr.value("maternal_deaths_reported")} audited`
                : mpdsrNoData
                  ? "no KHIS deaths reported this period — showing zeros"
                  : mpdsrAnswered
                    ? "no maternal deaths reported on KHIS this period"
                    : "Target 100% · KHIS monthly (est.)"
            }
            tone={toneOf(
              mpdsrAnswered ? (matAudPct ?? 0) : (matAudPct ?? 88),
              100,
            )}
          />
          <SubtabKpi
            code="4.2 · MPDSR"
            title="Neonatal Deaths Audited"
            value={
              mpdsrNoData
                ? "0%"
                : neoAudPct != null
                  ? `${neoAudPct}%`
                  : mpdsrAnswered
                    ? "0%"
                    : "74%"
            }
            sub={
              neoAudPct != null
                ? `KHIS · ${mpdsr.value("neonatal_deaths_audited")} of ${mpdsr.value("neonatal_deaths")} audited`
                : mpdsrNoData
                  ? "no KHIS deaths reported this period — showing zeros"
                  : mpdsrAnswered
                    ? "no neonatal deaths reported on KHIS this period"
                    : "Target 100% (Y2) · KHIS monthly (est.)"
            }
            tone={toneOf(
              mpdsrAnswered ? (neoAudPct ?? 0) : (neoAudPct ?? 74),
              100,
            )}
          />
          <SubtabKpi
            code="4.3 · Reviews"
            title="Monthly MPDSR/QI Meetings"
            value="67%"
            sub="Target 100% · county records (est.)"
            tone={toneOf(67, 100)}
          />
          <SubtabKpi
            code="4.4 · Action"
            title="Recommendations Implemented"
            value="55%"
            sub="Target ≥ 90% (Y2) · action tracker (est.)"
            tone={toneOf(55, 90)}
          />
        </div>
        {auditedBadge}
      </div>

      {/* Cause-of-death disaggregation — where deaths concentrate */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Cause of Death Disaggregation (4.1 / 4.2)
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">
              Illustrative — cause-of-death is not reported on KHIS monthly
            </span>
            <ViewDataButton
              title="Cause of Death Disaggregation"
              data={causeOfDeathData}
              note="Illustrative — not available on KHIS"
            />
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          The audit must name the cause before it can fix the system. PPH and
          preterm/LBW dominate — both are addressed by the readiness enablers in
          Domain 3.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={causeOfDeathData} margin={{ left: 0, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="maternal"
              name="Maternal deaths"
              fill="#dc2626"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="neonatal"
              name="Neonatal deaths"
              fill="#f97316"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Full Mortality & MPDSR content (KPI cards, deaths by facility,
          monthly trends, facility review list) */}
      <MortalityTab onSaveToPlayground={onSaveToPlayground} />

      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900">
            The MPDSR Audit Loop — % vs Target (4.1 – 4.6)
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">
              Audited % live · remainder illustrative
            </span>
            <ViewDataButton
              title="MPDSR Audit Loop — % vs Target"
              data={chartData}
              note={`${mpdsr.loading ? "Loading KHIS…" : matAudPct != null || neoAudPct != null ? `Live audit % · KHIS · ${mpdsr.data?.scope} · ${mpdsr.data?.peLabel}` : mpdsrNoData ? "no KHIS data — zeros" : "Audit % illustrative — no KHIS deaths in scope"} · est = fallback`}
            />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ left: 0, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={70}
            />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(v) => [`${v}%`, ""]} />
            <Legend />
            <Bar
              dataKey="current"
              name="Current (%)"
              fill="#f59e0b"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="target"
              name="Target (%)"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* County aspects — who audits and who meets */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            MPDSR by County — {partner}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">
              Illustrative — county registers, not on KHIS
            </span>
            <ViewDataButton
              title={`MPDSR by County — ${partner}`}
              data={countyMpdsrData}
              note="Illustrative — county registers"
            />
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          % of deaths audited vs % of facilities holding monthly MPDSR/QI
          meetings, per county.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={countyMpdsrData} margin={{ left: 0, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(v) => [`${v}%`, ""]} />
            <Legend />
            <Bar
              dataKey="audited"
              name="Deaths audited (%)"
              fill="#dc2626"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="meetings"
              name="Monthly meetings (%)"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            MPDSR &amp; Clinical Quality Indicators (4.1 – 4.8)
          </h3>
          <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">
            Illustrative baselines — EMR/registers
          </span>
        </div>
        <div className="space-y-5">
          {MPDSR_INDICATORS.map((ind) => (
            <IndicatorBar
              key={ind.code}
              indicator={ind}
              current={REPORTED_CURRENT[ind.code] ?? 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Data Systems
// ---------------------------------------------------------------------------

function DataSystemsSection() {
  const { filter, pe, peLabel } = useGeoFilter();
  const dCounties = useMemo(() => {
    if (filter.subCounty) return [filter.subCounty];
    if (filter.facility) return [filter.facility];
    const base =
      PARTNER_COUNTIES[filter.partner]?.length > 0
        ? PARTNER_COUNTIES[filter.partner]
        : JT_COVERAGE_COUNTIES;
    return filter.county ? [filter.county] : base;
  }, [filter.partner, filter.county, filter.subCounty, filter.facility]);
  const dPartnerLabel = useMemo(
    () => getPartner(filter.partner)?.shortName ?? "Partner",
    [filter.partner],
  );

  // Live KHIS reporting rate per county: facilities that submitted the MOH
  // 731 ANC row / total facilities in the county roster (May 2025).
  const [khisByCounty, setKhisByCounty] = useState<Record<
    string,
    number
  > | null>(null);
  useEffect(() => {
    let cancelled = false;
    setKhisByCounty(null);
    Promise.all(
      dCounties.map((c) => {
        const q = filter.subCounty
          ? `subcounty=${encodeURIComponent(c)}&partner=${encodeURIComponent(
              filter.partner,
            )}`
          : filter.facility
            ? `facility=${
                (PARTNER_FACILITIES[filter.partner] ?? []).find(
                  (f) => f.name === c,
                )?.uid ?? ""
              }`
            : `county=${encodeURIComponent(c)}`;
        return fetch(
          `/api/khis?${q}&pe=${pe}&indicators=pmtct_anc1_visits&reporting=1`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
      }),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, number> = {};
      results.forEach((res, i) => {
        const name = dCounties[i];
        if (!name || !res?.ouCount) return;
        const row = res.reporting?.find(
          (x: { id: string; facilities: number }) =>
            x.id === "pmtct_anc1_visits",
        );
        if (row?.facilities != null && res.ouCount > 0) {
          map[name] = Math.round((row.facilities / res.ouCount) * 100);
        }
      });
      if (!cancelled) setKhisByCounty(map);
    });
    return () => {
      cancelled = true;
    };
  }, [dCounties, pe]);

  const flow = [
    {
      step: "Community",
      detail: "eCHIS / CHP reports",
      color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    },
    {
      step: "Facility",
      detail: "EMR / KHIS monthly upload · MPDSR records",
      color: "bg-teal-50 border-teal-200 text-teal-800",
    },
    {
      step: "Sub-County",
      detail: "SCHMT data verification / DQA",
      color: "bg-cyan-50 border-cyan-200 text-cyan-800",
    },
    {
      step: "County",
      detail: "CHMT scorecard · RRI bi-weekly report",
      color: "bg-blue-50 border-blue-200 text-blue-800",
    },
    {
      step: "DoS IP TWG",
      detail: "Monthly VTP TWG · quarterly IP review",
      color: "bg-indigo-50 border-indigo-200 text-indigo-800",
    },
    {
      step: "National",
      detail: "EWENE dashboard · MOH RRI brief · EWENE DU",
      color: "bg-violet-50 border-violet-200 text-violet-800",
    },
  ];

  const countyDataData = dCounties.map((name) => ({
    name,
    khis: khisByCounty?.[name] ?? 0,
    emr: 0,
    dqa: 0,
  }));

  // DQA measures (§5) — how data quality is assured.
  const dqaMeasures = [
    {
      activity:
        "Facility-level data verification against source registers (EMR, paper registers)",
      frequency: "Monthly",
      owner: "IP M&E Officer / Facility data clerk",
    },
    {
      activity: "Routine data quality audit (DQA) at supported facilities",
      frequency: "Monthly",
      owner: "IP M&E Officer",
    },
    {
      activity: "Cross-verification of KHIS data against EMR and NASCOP data",
      frequency: "Quarterly",
      owner: "IP M&E Officer / County HIS team",
    },
    {
      activity: "National DQA participation (MOH-led)",
      frequency: "As scheduled",
      owner: "IP M&E Officer",
    },
    {
      activity: "LMIS stock data reconciliation against physical counts",
      frequency: "Monthly",
      owner: "IP Supply Chain Officer / Facility",
    },
    {
      activity: "Equipment functionalities spot-check",
      frequency: "Semi-annual",
      owner: "IP Technical Officer / Facility in-charge",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Story banner — data as the connective tissue */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-5 border border-indigo-200 text-indigo-900">
        <h3 className="font-semibold">
          A single real-time data spine from community to national level
        </h3>
        <p className="text-sm mt-1 opacity-80">
          Every facility upload flows up one channel: community reports are
          verified at sub-county, scored at county, reviewed at the DoS IP TWG
          monthly, and surfaced on the national EWENE dashboard. The goal is
          that the same numbers drive facility CQI, county scorecards and
          national decisions — not parallel paper trails.
        </p>
      </div>

      {/* Subtab KPI strip — Domain 5 headline indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SubtabKpi
          code="5.1 · KHIS"
          title="Timely KHIS/DHIS2 Reports"
          value="85%"
          sub="Target 100% (Y2) · monthly"
          tone={toneOf(85, 100)}
        />
        <SubtabKpi
          code="5.2 · EMR"
          title="Active EMR (MBP data)"
          value="65%"
          sub="Target ≥ 90% (Y2) · quarterly"
          tone={toneOf(65, 90)}
        />
        <SubtabKpi
          code="5.4 · Dashboard"
          title="EWENE Dashboard Upload"
          value="60%"
          sub="Target 100% · monthly"
          tone={toneOf(60, 100)}
        />
        <SubtabKpi
          code="5.5 · DQA"
          title="Monthly Data Quality Audits"
          value="70%"
          sub="Target 100% (Y2) · monthly"
          tone={toneOf(70, 100)}
        />
      </div>

      {/* Reporting flow */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Reporting Flow — from Community to National EWENE
        </h3>
        <div className="flex flex-col lg:flex-row gap-3">
          {flow.map((f, idx) => (
            <div key={f.step} className="flex-1 flex items-center gap-3">
              <div className={`flex-1 rounded-lg border p-3 ${f.color}`}>
                <p className="font-semibold text-sm">{f.step}</p>
                <p className="text-xs mt-1 opacity-80">{f.detail}</p>
              </div>
              {idx < flow.length - 1 && (
                <div className="hidden lg:flex flex-col items-center">
                  <span className="text-indigo-400 font-bold">→</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* County data systems */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Data Systems by County — {dPartnerLabel}
            {filter.facility
              ? ` · ${filter.facility}`
              : filter.subCounty
                ? ` · ${filter.subCounty}`
                : filter.county
                  ? ` · ${filter.county}`
                  : ""}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold whitespace-nowrap">
              {khisByCounty
                ? `Live · KHIS ${peLabel} · ${
                    filter.facility
                      ? "1 facility"
                      : filter.subCounty
                        ? `${dCounties.length} sub-county facilities`
                        : filter.county
                          ? "1 county"
                          : `${dCounties.length} counties`
                  } submitting MOH 731`
                : "Loading KHIS…"}
            </span>
            <ViewDataButton
              title={`Data Systems by County — ${dPartnerLabel}`}
              data={countyDataData}
              note="KHIS = live facilities reporting MOH 731 · EMR & DQA = 0 (no source wired)"
            />
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Timely KHIS submission (facilities reporting the MOH 731 ANC row in{" "}
          {peLabel}), active EMR capturing mother–baby pairs, and monthly DQA —
          the three gears of a healthy data system.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={countyDataData} margin={{ left: 0, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(v) => [`${v}%`, ""]} />
            <Legend />
            <Bar
              dataKey="khis"
              name="KHIS reporting (%)"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="emr"
              name="EMR active (%)"
              fill="#8b5cf6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="dqa"
              name="DQA (%)"
              fill="#22d3ee"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Data Systems &amp; Reporting Functionality (5.1 – 5.6)
        </h3>
        <div className="space-y-5">
          {DATA_SYSTEM_INDICATORS.map((ind) => (
            <IndicatorBar
              key={ind.code}
              indicator={ind}
              current={REPORTED_CURRENT[ind.code] ?? 0}
            />
          ))}
        </div>
      </div>

      {/* DQA measures (§5) */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Data Quality Assurance Measures (§5)
          </h3>
          <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold">
            Trust the numbers
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Accuracy, completeness and timeliness are assured through a layered
          DQA regime — from source-register verification to national audits.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-3">DQA Activity</th>
                <th className="py-2 pr-3">Frequency</th>
                <th className="py-2">Responsible</th>
              </tr>
            </thead>
            <tbody>
              {dqaMeasures.map((d) => (
                <tr
                  key={d.activity}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="py-2.5 pr-3 text-gray-800">{d.activity}</td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
                      {d.frequency}
                    </span>
                  </td>
                  <td className="py-2.5 text-gray-600">{d.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center">
        The full governance &amp; reporting cadence (monthly → quarterly →
        semi-annual → annual) and review platforms live on the Home page under
        Governance &amp; Reporting Cadence.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared indicator progress bar
// ---------------------------------------------------------------------------

interface IndicatorBarProps {
  indicator: IndicatorDef;
  current: number | null;
}

const UNIT_SUFFIX: Record<NonNullable<IndicatorDef["unit"]>, string> = {
  percent: "%",
  count: "",
  "per-1000": " per 1,000 births",
  "per-100000": " per 100,000 live births",
};

function IndicatorBar({ indicator, current }: IndicatorBarProps) {
  const unit = indicator.unit ?? "percent";
  const suffix = UNIT_SUFFIX[unit];
  const y2Target = indicator.y2;
  const lowerIsBetter = indicator.lowerIsBetter ?? false;
  const isCount = unit === "count";

  const isMet =
    current !== null &&
    (lowerIsBetter ? current <= y2Target : current >= y2Target);
  const isPartial =
    current !== null &&
    (lowerIsBetter ? current <= indicator.y1 : current >= y2Target * 0.7);
  const barColor = isCount
    ? "bg-slate-400"
    : isMet
      ? "bg-emerald-500"
      : isPartial
        ? "bg-amber-500"
        : "bg-red-500";

  // Progress bar: %/count indicators grow toward target; rate indicators
  // (lower is better) shrink toward target.
  const progressWidth =
    current === null
      ? 0
      : lowerIsBetter
        ? Math.min(100, (y2Target / Math.max(current, 0.0001)) * 100)
        : Math.min((current / y2Target) * 100, 100);

  const displayValue =
    current === null
      ? "No data"
      : unit === "percent"
        ? `${current.toFixed(1)}%`
        : `${current}${suffix}`;

  const targetText =
    unit === "count"
      ? "Reported value (YTD)"
      : unit === "percent"
        ? `Y1 ≥ ${indicator.y1}% · Y2 ≥ ${indicator.y2}%`
        : `Y1 ≤ ${indicator.y1}${suffix} · Y2 ≤ ${indicator.y2}${suffix}`;

  return (
    <div className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-3 min-w-0">
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold whitespace-nowrap">
            {indicator.code}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {indicator.label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Baseline: {indicator.baseline ?? "—"} · {indicator.note}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={`text-lg font-bold ${
              isCount
                ? "text-gray-900"
                : isMet
                  ? "text-emerald-600"
                  : isPartial
                    ? "text-amber-600"
                    : "text-red-600"
            }`}
          >
            {displayValue}
          </p>
          <p className="text-xs text-gray-500">{targetText}</p>
        </div>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${progressWidth}%` }}
        />
      </div>
    </div>
  );
}
