"use client";

import { useMemo, useState } from "react";
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
  Database,
  LayoutDashboard,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { RadialProgress } from "@/components/radial-progress";
import { useAssessments } from "@/lib/use-assessments";
import { useGeoFilter } from "@/lib/geo-filter-context";
import { applyGeoFilter, PARTNERS } from "@/lib/geo";
import { averageReadiness, type FacilityAssessment } from "@/lib/assessment";
import { AssessmentTab } from "@/components/tabs/assessment-tab";
import { MortalityTab } from "@/components/tabs/mortality-tab";
import { ClinicalTab } from "@/components/tabs/clinical-tab";

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
    label: "% of preterm/LBW babies initiated on Kangaroo Mother Care",
    baseline: "54% (national)",
    y1: 60,
    y2: 70,
    note: "Source: KHIS (monthly)",
  },
  {
    code: "2.6",
    label: "% of newborns receiving chlorhexidine cord care at birth",
    baseline: "65% (national)",
    y1: 70,
    y2: 80,
    note: "Source: KHIS (monthly)",
  },
  {
    code: "2.7",
    label: "Facility fresh stillbirth rate at supported facilities",
    baseline: "7.64 per 1,000 births (KHIS)",
    y1: 5,
    y2: 4,
    lowerIsBetter: true,
    unit: "per-1000",
    note: "Source: KHIS (monthly)",
  },
  {
    code: "2.8",
    label:
      "Facility maternal mortality ratio at supported facilities (per 100,000 live births)",
    baseline: "91 per 100,000 live births (KHIS)",
    y1: 70,
    y2: 50,
    lowerIsBetter: true,
    unit: "per-100000",
    note: "Source: KHIS (quarterly)",
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

export function HomeTab() {
  const allAssessments = useAssessments();

  const partners = useMemo(
    () => PARTNERS.filter((p) => p.id !== "national"),
    [],
  );

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
        const d3 = readinessByPartner[p.id];
        const domains: (number | null)[] = [s.d1, s.d2, d3.avg, s.d4, s.d5];
        const available = domains.filter(
          (v): v is number => v !== null && !Number.isNaN(v),
        );
        const overall =
          available.length > 0
            ? available.reduce((a, b) => a + b, 0) / available.length
            : null;
        return { partner: p, domains, overall, d3Count: d3.count };
      }),
    [partners, readinessByPartner],
  );

  const columnAverages = useMemo(
    () =>
      DOMAIN_COLUMNS.map((_col, idx) => {
        const values = rows
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

  // County distribution: per partner, each supported county with its
  // 5-domain scores (d3 computed live from county-scoped assessments).
  const countyRows = useMemo(
    () =>
      partners.map((p) => ({
        partner: p,
        counties: p.counties.map((county) => {
          const c = COUNTY_DOMAIN_SCORES[county] ?? {
            d1: null,
            d2: null,
            d4: null,
            d5: null,
          };
          const d3 = readinessForCounties(allAssessments, [county]);
          const domains: (number | null)[] = [c.d1, c.d2, d3.avg, c.d4, c.d5];
          const available = domains.filter(
            (v): v is number => v !== null && !Number.isNaN(v),
          );
          const overall =
            available.length > 0
              ? available.reduce((a, b) => a + b, 0) / available.length
              : null;
          return { name: county, domains, overall, d3Count: d3.count };
        }),
      })),
    [partners, allAssessments],
  );

  return (
    <div className="space-y-6">
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
                All 7 partners · average of partner scores
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
            60% (off track) · Gray — no data.
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
                      <p className="text-sm font-semibold text-gray-900">
                        {r.partner.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.partner.counties.length} counties
                        {r.d3Count > 0
                          ? ` · ${r.d3Count} assessment${r.d3Count === 1 ? "" : "s"}`
                          : ""}
                      </p>
                    </td>
                    {r.domains.map((v, idx) => {
                      const tone = scoreTone(v);
                      return (
                        <td
                          key={DOMAIN_COLUMNS[idx].key}
                          className={`px-4 py-3 text-center text-sm font-bold whitespace-nowrap ${tone.bg} ${tone.text}`}
                        >
                          {v === null ? "—" : `${v.toFixed(1)}%`}
                        </td>
                      );
                    })}
                    <td
                      className={`px-4 py-3 text-center text-sm font-bold whitespace-nowrap ${overallTone.bg} ${overallTone.text}`}
                    >
                      {r.overall === null ? "—" : `${r.overall.toFixed(1)}%`}
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
          Domain 3 (Readiness) is computed live from entered facility
          assessments (N/A excluded); Domains 1, 2, 4 &amp; 5 are
          KHIS/EMR-illustrative baselines pending live data entry.
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
            supported counties in its own vertical bar chart. E.g. Jamii
            Tekelezi — Domain 3 (Readiness) across Embu, Tharaka-Nithi, Meru
            &amp; Nyandarua. Charts with no bars have no data entered yet.
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
              <div className="mb-5">
                <h4 className="font-semibold text-gray-900">
                  {group.partner.name}
                </h4>
                <p className="text-sm text-gray-500">
                  {group.partner.counties.length} counties · comparing each
                  domain across counties
                </p>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Overall 5-Domain Score by Partner
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Average of the five domain scores per implementing partner.
        </p>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Domains — replica of the Home tab, with full per-domain subtabs
// ---------------------------------------------------------------------------

export function DomainsTab() {
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

      {/* Overview strip */}
      <HomeOverviewStrip />

      {activeSubtab === "1" && <ClinicalTab />}
      {activeSubtab === "2" && <CoverageSection />}
      {activeSubtab === "3" && <ReadinessSection />}
      {activeSubtab === "4" && <MpdsrSection />}
      {activeSubtab === "5" && <DataSystemsSection />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview strip (always visible)
// ---------------------------------------------------------------------------

function HomeOverviewStrip() {
  const allAssessments = useAssessments();
  const { filter } = useGeoFilter();
  const assessments = useMemo(
    () => applyGeoFilter(allAssessments, filter),
    [allAssessments, filter],
  );

  const avgReadiness =
    assessments.length > 0 ? averageReadiness(assessments) : 0;

  const cards = [
    {
      title: "1 · PMTCT/VTP Quality of Care",
      value: "87.7%",
      sub: "675 of 770 HIV+ PBFW initiated on ART",
      icon: <Stethoscope className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: "2 · Coverage (90:90:80:80)",
      value: "63%",
      sub: "Average across the 4 coverage pillars",
      icon: <TrendingUp className="w-5 h-5 text-teal-600" />,
    },
    {
      title: "3 · Readiness & Safe Systems",
      value: `${avgReadiness.toFixed(0)}%`,
      sub: `${assessments.length} facilities assessed · computed live`,
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: "4 · MPDSR & Accountability",
      value: "67%",
      sub: "4 of 6 facilities hold monthly reviews",
      icon: <Activity className="w-5 h-5 text-red-600" />,
    },
    {
      title: "5 · Data Systems",
      value: "62%",
      sub: "Average reporting & DQA completeness",
      icon: <Database className="w-5 h-5 text-indigo-600" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white rounded-lg p-5 border border-slate-200"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 font-medium">{card.title}</p>
            {card.icon}
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
          <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Coverage — EWENE 90:90:80:80
// ---------------------------------------------------------------------------

function CoverageSection() {
  const pillars = [
    {
      label: "ANC 4+ Visits",
      target: 90,
      current: 52,
      sublabel: "2.1 · Target ≥ 90% (Y2)",
    },
    {
      label: "Skilled Birth Attendance",
      target: 95,
      current: 70,
      sublabel: "2.2 · Target ≥ 95% (Y2)",
    },
    {
      label: "Postnatal Care ≤ 48 hrs",
      target: 80,
      current: 66.6,
      sublabel: "2.3 · Target ≥ 80% (Y2)",
    },
    {
      label: "Newborn PNC ≤ 48 hrs",
      target: 80,
      current: 68.4,
      sublabel: "2.4 · Target ≥ 80% (Y2)",
    },
  ];

  // County-level coverage — Jamii Tekelezi counties (KHIS-illustrative).
  const countyCoverageData = [
    { name: "Embu", anc4: 58, sba: 84, pnc: 72 },
    { name: "Tharaka-Nithi", anc4: 51, sba: 76, pnc: 64 },
    { name: "Meru", anc4: 55, sba: 80, pnc: 69 },
    { name: "Nyandarua", anc4: 47, sba: 71, pnc: 60 },
  ];

  return (
    <div className="space-y-6">
      {/* Story banner — the gap to close */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-5 border border-teal-200 text-teal-900">
        <h3 className="font-semibold">
          The coverage story: too many women fall out of the continuum
        </h3>
        <p className="text-sm mt-1 opacity-80">
          Only <b>52%</b> of pregnant women reach 4+ ANC visits and <b>70%</b>{" "}
          deliver with a skilled attendant — far short of the 90:90:80:80
          ambition. Every missed ANC visit is a missed opportunity for HIV
          testing, syphilis screening, and delivery planning; every
          facility-only delivery is a risk for mother and baby. Closing the
          gap means tracing each mother–baby pair from first contact through
          the postnatal period.
        </p>
      </div>

      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          EWENE 90:90:80:80 Coverage Pillars (Domain 2)
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Coverage targets per the integrated monitoring framework: ANC 4+ ≥
          90% · Skilled delivery ≥ 95% · Early PNC ≥ 80% · Newborn PNC ≥ 80%.
          Current values are KHIS-reported baselines.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar) => (
            <div
              key={pillar.label}
              className="flex flex-col items-center bg-slate-50 rounded-xl p-5"
            >
              <RadialProgress
                data={[{ name: pillar.label, value: pillar.current }]}
                title={pillar.label}
                color={
                  pillar.current >= pillar.target
                    ? "#10b981"
                    : pillar.current >= pillar.target * 0.7
                      ? "#f59e0b"
                      : "#ef4444"
                }
              />
              <p className="text-sm text-gray-600 mt-1">{pillar.sublabel}</p>
              <p className="text-xs text-gray-500 mt-1">
                Current: {pillar.current.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* County aspects — where the gaps are biggest */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Coverage by County — Jamii Tekelezi
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          ANC 4+, skilled birth attendance and early PNC differ widely by
          county — targeting the laggards is where the biggest gains lie.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={countyCoverageData} margin={{ left: 0, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(v) => [`${v}%`, ""]} />
            <Legend />
            <Bar dataKey="anc4" name="ANC 4+" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="sba" name="SBA" fill="#0d9488" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pnc" name="PNC ≤ 48h" fill="#06b6d4" radius={[4, 4, 0, 0]} />
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
              current={REPORTED_CURRENT[ind.code] ?? 0}
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

  // Jamii Tekelezi county readiness — computed live from entered assessments.
  const countyReadiness = [
    "Embu",
    "Tharaka-Nithi",
    "Meru",
    "Nyandarua",
  ].map((county) => {
    const r = readinessForCounties(allAssessments, [county]);
    return {
      name: county,
      readiness: r.avg ?? 0,
      assessed: r.count,
    };
  });

  return (
    <div className="space-y-6">
      {/* Story banner — the three systemic enablers */}
      <div className="bg-gradient-to-r from-lime-50 to-emerald-50 rounded-lg p-5 border border-lime-200 text-emerald-900">
        <h3 className="font-semibold">
          Readiness is more than buildings — it is blood, oxygen, commodities
          and working equipment
        </h3>
        <p className="text-sm mt-1 opacity-80">
          Three systemic enablers determine whether a facility can actually
          save a life at the moment of need: <b>equipment due diligence</b>{" "}
          (10–30% of donated equipment in LMICs never becomes operational),{" "}
          <b>safe blood systems</b> (26% of PPH deaths are attributable to a
          lack of safe blood), and <b>oxygen ecosystems</b> (RDS contributes to
          ~45% of preterm deaths; only 20% of Level 4 facilities can deliver
          oxygen/CPAP). The guiding question is not “Can we buy this?” but “Are
          the conditions in place to make it work?”
        </p>
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
            water), maintenance contracts &amp; spare parts, a training plan that
            accounts for staff turnover, and a tracking system to prevent
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
            RDS contributes to ~45% of preterm deaths; only 20% of L4
            facilities meet all oxygen/CPAP requirements. Assess availability
            and flag gaps for county &amp; national escalation.
          </p>
          <p className="text-xs text-violet-700 mt-3 font-medium">
            Benchmarks: ≥ 80% functional supply · ≥ 60% of L4 with CPAP · ≥
            80% engineers trained · zero stockouts.
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

function MpdsrSection() {
  const chartData = [
    { name: "Maternal deaths audited", current: 88, target: 100 },
    { name: "Neonatal deaths audited", current: 74, target: 100 },
    { name: "Monthly MPDSR/QI meetings", current: 67, target: 100 },
    { name: "Recommendations implemented", current: 55, target: 90 },
    { name: "PPH Treatment Skills", current: 40, target: 70 },
    { name: "Asphyxia Treatment Skills", current: 36, target: 65 },
  ];

  // County MPDSR performance — Jamii Tekelezi counties (illustrative).
  const countyMpdsrData = [
    { name: "Embu", audited: 92, meetings: 100 },
    { name: "Tharaka-Nithi", audited: 78, meetings: 67 },
    { name: "Meru", audited: 85, meetings: 100 },
    { name: "Nyandarua", audited: 70, meetings: 67 },
  ];

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

      {/* Full Mortality & MPDSR content (KPI cards, deaths by facility,
          monthly trends, facility review list) */}
      <MortalityTab />

      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          The MPDSR Audit Loop — % vs Target (4.1 – 4.6)
        </h3>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          MPDSR by County — Jamii Tekelezi
        </h3>
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
            <Bar dataKey="audited" name="Deaths audited (%)" fill="#dc2626" radius={[4, 4, 0, 0]} />
            <Bar dataKey="meetings" name="Monthly meetings (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          MPDSR &amp; Clinical Quality Indicators (4.1 – 4.8)
        </h3>
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

  const countyDataData = [
    { name: "Embu", khis: 92, emr: 78, dqa: 85 },
    { name: "Tharaka-Nithi", khis: 84, emr: 62, dqa: 70 },
    { name: "Meru", khis: 90, emr: 74, dqa: 82 },
    { name: "Nyandarua", khis: 86, emr: 66, dqa: 72 },
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
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Data Systems by County — Jamii Tekelezi
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Timely KHIS submission, active EMR capturing mother–baby pairs, and
          monthly DQA — the three gears of a healthy data system.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={countyDataData} margin={{ left: 0, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(v) => [`${v}%`, ""]} />
            <Legend />
            <Bar dataKey="khis" name="KHIS timely (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="emr" name="EMR active (%)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="dqa" name="DQA (%)" fill="#22d3ee" radius={[4, 4, 0, 0]} />
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

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Reporting Cadence</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
          <li>
            • <b>Monthly:</b> Facility PMTCT/VTP indicators, commodity
            stockouts, MPDSR death audits, dashboard uploads, DQA, DoS VTP TWG
            review meeting
          </li>
          <li>
            • <b>Bi-weekly:</b> RRI national–county coordination inputs,
            RRI performance brief contribution
          </li>
          <li>
            • <b>Quarterly:</b> County scorecards, mother–baby pair retention,
            blood &amp; oxygen readiness, BEmONC/CEmONC functionality, MPDSR
            recommendation tracking, EMR audit
          </li>
          <li>
            • <b>Semi-annual:</b> Equipment functionality assessment, EmONC
            skills assessment, DoS IP contribution report to PEPFAR &amp; EWENE
          </li>
          <li>
            • <b>Annual:</b> National EWENE performance review &amp; lessons
            learned
          </li>
        </ul>
      </div>
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
