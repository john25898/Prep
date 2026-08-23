"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Database,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAssessments } from "@/lib/use-assessments";
import { useGeoFilter } from "@/lib/geo-filter-context";
import { useKhis } from "@/lib/use-khis";
import { getPartner } from "@/lib/geo";
import { PARTNER_COUNTIES, PARTNER_FACILITIES } from "@/lib/partners";
import { AssessmentTab } from "@/components/tabs/assessment-tab";
import { MortalityTab } from "@/components/tabs/mortality-tab";
import { ClinicalTab } from "@/components/tabs/clinical-tab";
import type { ChartInsight } from "@/components/ai-assistant";
import { ViewDataButton } from "@/components/view-data";
import { JT_COVERAGE_COUNTIES, readinessForCounties } from "./home/shared";

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

type Tone = "on" | "warn" | "off" | "na";

const TONE_DOT: Record<Tone, string> = {
  on: "bg-emerald-500",
  warn: "bg-amber-500",
  off: "bg-red-500",
  na: "bg-slate-300",
};

const TONE_TEXT: Record<Tone, string> = {
  on: "text-emerald-600",
  warn: "text-amber-600",
  off: "text-red-600",
  na: "text-slate-400",
};

const TONE_LABEL: Record<Tone, string> = {
  on: "On target",
  warn: "Needs attention",
  off: "Below target",
  na: "No data",
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

// No baseline fallback constants — real KHIS values only; missing = blank.

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
    // Facility is the deepest scope — it wins over sub-county when both are
    // set (the filter bar keeps sub-county selected when a facility is picked).
    if (filter.facility) return [filter.facility];
    if (filter.subCounty) return [filter.subCounty];
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
        const q = filter.facility
          ? `facility=${
              (PARTNER_FACILITIES[filter.partner] ?? []).find(
                (f) => f.name === c,
              )?.uid ?? ""
            }`
          : filter.subCounty
            ? `subcounty=${encodeURIComponent(c)}&partner=${encodeURIComponent(
                filter.partner,
              )}`
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
      : `No KHIS data for ${peLabel} — shown blank`;

  // Live current values per indicator code (2.1–2.8) — real KHIS only, no
  // baseline fallbacks. Missing = blank ("No data").
  const liveCurrent: Record<string, number | null> = {
    "2.1": live?.anc4Pct ?? null,
    "2.2": live?.sba ?? null,
    "2.3": live?.pnc ?? null,
    "2.4": live?.pncInfant ?? null,
    "2.5": live?.kmc ?? null,
    "2.6": live?.chlorhexidine ?? null,
    "2.7": live?.stillbirths ?? null,
    "2.8": live?.mmr ?? null,
  };

  const countyCoverageData = counties.map((name) => {
    const c = coverage?.[name];
    return {
      name,
      anc4: c?.anc4Pct ?? null,
      sba: c?.sba ?? null,
      pnc: c?.pnc ?? null,
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
          {liveReady ? (
            <>
              Only <b>{live?.anc4Pct != null ? `${live.anc4Pct}%` : "—"}</b> of
              pregnant women reach 4+ ANC visits and{" "}
              <b>{live?.sba != null ? `${live.sba}%` : "—"}</b> deliver with a
              skilled attendant — far short of the 90:90:80:80 ambition. Every
              missed ANC visit is a missed opportunity for HIV testing, syphilis
              screening, and delivery planning; every facility-only delivery is
              a risk for mother and baby. Closing the gap means tracing each
              mother–baby pair from first contact through the postnatal period.
            </>
          ) : (
            <>
              No KHIS coverage data for {scopeCoverageLabel} in {peLabel} yet —
              the 90:90:80:80 ambition tracks women from first contact through
              the postnatal period, so every ANC visit, delivery and postnatal
              check counts.
            </>
          )}
        </p>
      </div>

      {/* Subtab KPI strip — Domain 2 headline indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SubtabKpi
          code="2.1 · ANC 4+"
          title="4+ ANC Visits"
          value={live?.anc4Pct != null ? `${live.anc4Pct}%` : "—"}
          sub={`Target ≥ 90% (Y2) · ${liveSub}`}
          tone={live?.anc4Pct != null ? toneOf(live.anc4Pct, 90) : "na"}
        />
        <SubtabKpi
          code="2.2 · SBA"
          title="Skilled Birth Attendance"
          value={live?.sba != null ? `${live.sba}%` : "—"}
          sub={`Target ≥ 95% (Y2) · ${liveSub}`}
          tone={live?.sba != null ? toneOf(live.sba, 95) : "na"}
        />
        <SubtabKpi
          code="2.3 · PNC"
          title="Maternal PNC ≤ 48 hrs"
          value={live?.pnc != null ? `${live.pnc}%` : "—"}
          sub={`Target ≥ 80% (Y2) · ${liveSub}`}
          tone={live?.pnc != null ? toneOf(live.pnc, 80) : "na"}
        />
        <SubtabKpi
          code="2.4 · Newborn PNC"
          title="Newborn PNC ≤ 48 hrs"
          value={live?.pncInfant != null ? `${live.pncInfant}%` : "—"}
          sub={`Target ≥ 80% (Y2) · ${liveSub}`}
          tone={live?.pncInfant != null ? toneOf(live.pncInfant, 80) : "na"}
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
                  return [
                    {
                      label: `${name} · ANC 4+ %`,
                      value: c?.anc4Pct ?? null,
                      source:
                        c?.anc4Pct != null
                          ? ("live" as const)
                          : ("n/r" as const),
                    },
                    {
                      label: `${name} · Skilled delivery %`,
                      value: c?.sba ?? null,
                      source:
                        c?.sba != null ? ("live" as const) : ("n/r" as const),
                    },
                    {
                      label: `${name} · Maternal PNC ≤48h %`,
                      value: c?.pnc ?? null,
                      source:
                        c?.pnc != null ? ("live" as const) : ("n/r" as const),
                    },
                  ];
                }),
                notes: [
                  `${liveSub} — live values come from KHIS per county; where KHIS reports none the cell is blank (no baseline constants).`,
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
            <Tooltip
              formatter={(v: unknown) =>
                v == null ? ["No data", ""] : [`${v}%`, ""]
              }
            />
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
  const { filter, peLabel } = useGeoFilter();

  // County readiness is scoped to the CURRENT partner's counties — computed
  // live from the assessments entered below (no hardcoded county list).
  const rCounties = useMemo(() => {
    const base =
      PARTNER_COUNTIES[filter.partner]?.length > 0
        ? PARTNER_COUNTIES[filter.partner]
        : JT_COVERAGE_COUNTIES;
    return filter.county ? [filter.county] : base;
  }, [filter.partner, filter.county]);
  const partnerReadiness = useMemo(
    () => readinessForCounties(allAssessments, rCounties).avg,
    [allAssessments, rCounties],
  );

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

  // Partner county readiness — computed live from entered assessments.
  const countyReadiness = rCounties.map((county) => {
    const r = readinessForCounties(allAssessments, [county]);
    return {
      name: county,
      readiness: r.avg ?? null,
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
          value="—"
          sub="No KHIS source — LMIS stock records"
          tone="na"
        />
        <SubtabKpi
          code="3.2 · Blood services"
          title="Functional Blood (L4)"
          value="—"
          sub="No KHIS source — HFA-QOC"
          tone="na"
        />
        <SubtabKpi
          code="3.3 · Oxygen/CPAP"
          title="Oxygen & CPAP (L4)"
          value="—"
          sub="No KHIS source — HFA-QOC"
          tone="na"
        />
        <SubtabKpi
          code="3.4 · Equipment"
          title="Equipment Functional"
          value={
            partnerReadiness != null ? `${Math.round(partnerReadiness)}%` : "—"
          }
          sub={`Target ≥ 90% (Y2) · facility assessment (live) · ${peLabel}`}
          tone={partnerReadiness != null ? toneOf(partnerReadiness, 90) : "na"}
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
              current={ind.code === "3.4" ? partnerReadiness : null}
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
          Facility Readiness by County —{" "}
          {getPartner(filter.partner)?.shortName ?? "Partner"} (live)
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Average readiness score computed from the assessments entered below;
          counties with no assessment yet show blank.
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

  // Per-county audit coverage for the county chart — one KHIS request per
  // county in the current partner scope (real-or-blank, no baseline
  // constants). Meetings % has no KHIS source and stays blank.
  const mCounties = useMemo(() => {
    if (filter.facility) return [filter.facility];
    if (filter.subCounty) return [filter.subCounty];
    const base =
      PARTNER_COUNTIES[partner]?.length > 0
        ? PARTNER_COUNTIES[partner]
        : JT_COVERAGE_COUNTIES;
    return filter.county ? [filter.county] : base;
  }, [partner, filter.county, filter.subCounty, filter.facility]);
  const [countyAudit, setCountyAudit] = useState<Record<
    string,
    number | null
  > | null>(null);
  useEffect(() => {
    let cancelled = false;
    setCountyAudit(null);
    Promise.all(
      mCounties.map((c) => {
        const q = filter.facility
          ? `facility=${
              (PARTNER_FACILITIES[partner] ?? []).find((f) => f.name === c)
                ?.uid ?? ""
            }`
          : filter.subCounty
            ? `subcounty=${encodeURIComponent(c)}&partner=${encodeURIComponent(
                partner,
              )}`
            : `county=${encodeURIComponent(c)}`;
        return fetch(
          `/api/khis?${q}&pe=${pe}&indicators=maternal_deaths_reported,maternal_deaths_audited,neonatal_deaths,neonatal_deaths_audited`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
      }),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, number | null> = {};
      results.forEach((res, i) => {
        const name = mCounties[i];
        if (!name || !res?.indicators) return;
        const ind = (key: string): number | null =>
          res.indicators.find(
            (x: { id: string; value: number | null }) => x.id === key,
          )?.value ?? null;
        const matRep = ind("maternal_deaths_reported");
        const matAud = ind("maternal_deaths_audited");
        const neoRep = ind("neonatal_deaths");
        const neoAud = ind("neonatal_deaths_audited");
        const parts: number[] = [];
        if (matRep != null && matRep > 0 && matAud != null)
          parts.push(Math.round((matAud / matRep) * 100));
        if (neoRep != null && neoRep > 0 && neoAud != null)
          parts.push(Math.round((neoAud / neoRep) * 100));
        map[name] =
          parts.length > 0
            ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
            : null;
      });
      if (!cancelled) setCountyAudit(map);
    });
    return () => {
      cancelled = true;
    };
  }, [mCounties, pe]);

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

  // KHIS answered for this period/scope at all — never show baseline
  // constants as if they were data.
  const mpdsrAnswered = !!mpdsr.data && !mpdsr.loading && !mpdsr.error;

  // KHIS answered but reported ZERO deaths for this period/scope — show 0
  // (not a baseline constant, which would read as data).
  const mpdsrNoData = mpdsrAnswered && matAudPct == null && neoAudPct == null;

  const chartData = [
    {
      name: "Maternal deaths audited",
      current: matAudPct,
      target: 100,
      est: matAudPct == null,
    },
    {
      name: "Neonatal deaths audited",
      current: neoAudPct,
      target: 100,
      est: neoAudPct == null,
    },
    {
      name: "Monthly MPDSR/QI meetings",
      current: null,
      target: 100,
      est: true,
    },
    {
      name: "Recommendations implemented",
      current: null,
      target: 90,
      est: true,
    },
    { name: "PPH Treatment Skills", current: null, target: 70, est: true },
    {
      name: "Asphyxia Treatment Skills",
      current: null,
      target: 65,
      est: true,
    },
  ];

  // County MPDSR performance — audit % live per county from KHIS; meetings %
  // has no KHIS source (county registers only) so stays blank.
  const countyMpdsrData = mCounties.map((name) => ({
    name,
    audited: countyAudit?.[name] ?? null,
    meetings: null,
  }));

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
      No KHIS response for this scope — shown blank
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
              mpdsr.loading
                ? "…"
                : matAudPct != null
                  ? `${matAudPct}%`
                  : mpdsrNoData
                    ? "0%"
                    : "—"
            }
            sub={
              matAudPct != null
                ? `KHIS · ${mpdsr.value("maternal_deaths_audited")} of ${mpdsr.value("maternal_deaths_reported")} audited`
                : mpdsrNoData
                  ? "no KHIS deaths reported this period — showing zeros"
                  : mpdsrAnswered
                    ? "no maternal deaths reported on KHIS this period"
                    : "Target 100% · KHIS monthly"
            }
            tone={
              matAudPct != null
                ? toneOf(matAudPct, 100)
                : mpdsrNoData
                  ? "off"
                  : "na"
            }
          />
          <SubtabKpi
            code="4.2 · MPDSR"
            title="Neonatal Deaths Audited"
            value={
              mpdsr.loading
                ? "…"
                : neoAudPct != null
                  ? `${neoAudPct}%`
                  : mpdsrNoData
                    ? "0%"
                    : "—"
            }
            sub={
              neoAudPct != null
                ? `KHIS · ${mpdsr.value("neonatal_deaths_audited")} of ${mpdsr.value("neonatal_deaths")} audited`
                : mpdsrNoData
                  ? "no KHIS deaths reported this period — showing zeros"
                  : mpdsrAnswered
                    ? "no neonatal deaths reported on KHIS this period"
                    : "Target 100% (Y2) · KHIS monthly"
            }
            tone={
              neoAudPct != null
                ? toneOf(neoAudPct, 100)
                : mpdsrNoData
                  ? "off"
                  : "na"
            }
          />
          <SubtabKpi
            code="4.3 · Reviews"
            title="Monthly MPDSR/QI Meetings"
            value="—"
            sub="No KHIS source — county registers"
            tone="na"
          />
          <SubtabKpi
            code="4.4 · Action"
            title="Recommendations Implemented"
            value="—"
            sub="No KHIS source — MPDSR action tracker"
            tone="na"
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
              Audit % live · meetings/skills rows blank (no KHIS source)
            </span>
            <ViewDataButton
              title="MPDSR Audit Loop — % vs Target"
              data={chartData}
              note={`${mpdsr.loading ? "Loading KHIS…" : matAudPct != null || neoAudPct != null ? `Live audit % · KHIS · ${mpdsr.data?.scope} · ${mpdsr.data?.peLabel}` : mpdsrNoData ? "no KHIS data — zeros" : "no KHIS deaths in scope — blank"} · blank rows have no KHIS source`}
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
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold whitespace-nowrap">
              {countyAudit
                ? `Live · KHIS ${peLabel} · ${mCounties.length} counties`
                : "Loading KHIS…"}
            </span>
            <ViewDataButton
              title={`MPDSR by County — ${partner}`}
              data={countyMpdsrData}
              note={`Audit % = live KHIS per county · meetings % blank (no KHIS source — county registers)`}
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
            <Tooltip
              formatter={(v: unknown) =>
                v == null ? ["No data", ""] : [`${v}%`, ""]
              }
            />
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
            4.1/4.2 live KHIS · 4.3–4.8 blank (no KHIS source)
          </span>
        </div>
        <div className="space-y-5">
          {MPDSR_INDICATORS.map((ind) => (
            <IndicatorBar
              key={ind.code}
              indicator={ind}
              current={
                ind.code === "4.1"
                  ? matAudPct
                  : ind.code === "4.2"
                    ? neoAudPct
                    : null
              }
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
    if (filter.facility) return [filter.facility];
    if (filter.subCounty) return [filter.subCounty];
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
        const q = filter.facility
          ? `facility=${
              (PARTNER_FACILITIES[filter.partner] ?? []).find(
                (f) => f.name === c,
              )?.uid ?? ""
            }`
          : filter.subCounty
            ? `subcounty=${encodeURIComponent(c)}&partner=${encodeURIComponent(
                filter.partner,
              )}`
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
    khis: khisByCounty?.[name] ?? null,
    emr: null,
    dqa: null,
  }));

  // Partner-level live KHIS reporting rate — average of reported counties.
  const khisAvg = useMemo(() => {
    if (!khisByCounty) return null;
    const vals = dCounties
      .map((c) => khisByCounty[c])
      .filter((v): v is number => v != null);
    return vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : null;
  }, [khisByCounty, dCounties]);

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
          value={khisAvg != null ? `${khisAvg}%` : "—"}
          sub={
            khisAvg != null
              ? `Target 100% (Y2) · Live · KHIS ${peLabel}`
              : "No KHIS data this period — shown blank"
          }
          tone={khisAvg != null ? toneOf(khisAvg, 100) : "na"}
        />
        <SubtabKpi
          code="5.2 · EMR"
          title="Active EMR (MBP data)"
          value="—"
          sub="No KHIS source — EMR audit"
          tone="na"
        />
        <SubtabKpi
          code="5.4 · Dashboard"
          title="EWENE Dashboard Upload"
          value="—"
          sub="No KHIS source — EWENE dashboard"
          tone="na"
        />
        <SubtabKpi
          code="5.5 · DQA"
          title="Monthly Data Quality Audits"
          value="—"
          sub="No KHIS source — DQA records"
          tone="na"
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
              note="KHIS = live facilities reporting MOH 731 · EMR & DQA blank (no source wired)"
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
            <Tooltip
              formatter={(v: unknown) =>
                v == null ? ["No data", ""] : [`${v}%`, ""]
              }
            />
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
              current={ind.code === "5.1" ? khisAvg : null}
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
