"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Sparkles, Save } from "lucide-react";
import { useGeoFilter } from "@/lib/geo-filter-context";
import { useKhis } from "@/lib/use-khis";
import { PARTNER_FACILITIES } from "@/lib/partners";
import { AIAssistant, type ChartInsight } from "@/components/ai-assistant";
import { ViewDataButton } from "@/components/view-data";

// ---------------------------------------------------------------------------
// PMTCT & HIV Care — two clearly separated tracks:
//   1.A  Intake & Screening   (1st ANC → HIV testing, SHA enrollment)
//   1.B  PMTCT & HIV Care     (HIV+ PBFW cascade, SBA among HIV+, HEI follow-up)
// PrEP now lives in its own top-level tab (components/tabs/prep-tab.tsx).
// The cascade rows (ANC → tested → HIV+ → ART → deliveries), HIV+ detection
// and EID counts are LIVE from national KHIS (MOH 731). Items with no KHIS
// org-unit source (VL suppression, 18-24m cohort, VIP follow-up, missed
// opportunities) stay illustrative and are marked (est.).
// ---------------------------------------------------------------------------

function Kpi({
  title,
  value,
  sub,
  accent = "text-emerald-600",
}: {
  title: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-lg p-5 border border-slate-200">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${accent}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function SectionBanner({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle: string;
  tone: "emerald" | "blue" | "violet";
}) {
  const tones = {
    emerald: "from-emerald-50 to-teal-50 border-emerald-200 text-emerald-900",
    blue: "from-blue-50 to-indigo-50 border-blue-200 text-blue-900",
    violet: "from-violet-50 to-purple-50 border-violet-200 text-violet-900",
  };
  return (
    <div className={`bg-gradient-to-r rounded-lg p-5 border ${tones[tone]}`}>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm mt-1 opacity-80">{subtitle}</p>
    </div>
  );
}

export function ClinicalTab({
  onSaveToPlayground,
}: {
  onSaveToPlayground?: (chart: ChartInsight) => void;
}) {
  const [activeSubtab, setActiveSubtab] = useState("1.a");
  const [activeChart, setActiveChart] = useState<ChartInsight | null>(null);

  const addChartToPlayground = (chart: ChartInsight) => {
    onSaveToPlayground?.(chart);
  };

  const subtabs = [
    { id: "1.a", label: "1.A: Intake & Screening" },
    { id: "1.b", label: "1.B: PMTCT & HIV Care" },
  ];

  return (
    <div>
      <AIAssistant
        chartContext={activeChart}
        onSaveToPlayground={addChartToPlayground}
      />

      <div className="flex gap-4 mb-6 border-b border-slate-200 pb-0 overflow-x-auto">
        {subtabs.map((subtab) => (
          <button
            key={subtab.id}
            onClick={() => setActiveSubtab(subtab.id)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeSubtab === subtab.id
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {subtab.label}
          </button>
        ))}
      </div>

      <div>
        {activeSubtab === "1.a" && (
          <Subtab2A
            onSetActiveChart={setActiveChart}
            onSaveToPlayground={addChartToPlayground}
          />
        )}
        {activeSubtab === "1.b" && (
          <Subtab2B
            onSetActiveChart={setActiveChart}
            onSaveToPlayground={addChartToPlayground}
          />
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// 1.A — Intake & Screening
// ===========================================================================

// DEMO fallbacks — used only when live KHIS is unreachable.
const DEMO_ANC_TESTED = [
  { name: "District 1", "ANC Visits": 3200, "HIV Tested": 3070 },
  { name: "District 2", "ANC Visits": 2900, "HIV Tested": 2790 },
  { name: "District 3", "ANC Visits": 3450, "HIV Tested": 3310 },
  { name: "District 4", "ANC Visits": 2650, "HIV Tested": 2545 },
];

const DEMO_NP_KP = [
  { name: "District 1", "Newly HIV+ (NP)": 148, "Known HIV+ (KP)": 102 },
  { name: "District 2", "Newly HIV+ (NP)": 122, "Known HIV+ (KP)": 88 },
  { name: "District 3", "Newly HIV+ (NP)": 110, "Known HIV+ (KP)": 84 },
  { name: "District 4", "Newly HIV+ (NP)": 70, "Known HIV+ (KP)": 46 },
];

const DEMO_HIV_TESTING = [
  { name: "HIV Tested", value: 96, fill: "#10b981" },
  { name: "Not Tested", value: 4, fill: "#e5e7eb" },
];

type ClinicalSubtabProps = {
  onSetActiveChart: (chart: ChartInsight) => void;
  onSaveToPlayground: (chart: ChartInsight) => void;
};

const Subtab2A = ({
  onSetActiveChart,
  onSaveToPlayground,
}: ClinicalSubtabProps) => {
  const { filter, pe, peLabel, periodFuture } = useGeoFilter();
  const partner = filter.partner || "jamii-tekelezi";

  // The Facility filter stores the facility NAME; resolve it to the KHIS
  // org-unit UID so analytics are scoped to that single facility.
  const facilityUid = useMemo(() => {
    if (!filter.facility) return undefined;
    const fac = PARTNER_FACILITIES[partner]?.find(
      (f) => f.name === filter.facility,
    );
    return fac?.uid;
  }, [filter.facility, partner]);
  const countyScope = filter.county || undefined;
  const subCountyScope = filter.subCounty || undefined;

  // Live totals for this period (KPIs + donut).
  const { data, loading, error, value } = useKhis({
    partner,
    pe,
    county: countyScope,
    subCounty: subCountyScope,
    facility: facilityUid,
    indicators: [
      "pmtct_anc1_visits",
      "pmtct_initial_test",
      "pmtct_need",
      "pmtct_anc1_known_pos",
    ],
  });

  // Per-county breakdowns (byCounty requires a single dx per request).
  const ancByCounty = useKhis({
    partner,
    pe,
    county: countyScope,
    subCounty: subCountyScope,
    facility: facilityUid,
    indicators: ["pmtct_anc1_visits"],
    byCounty: true,
  });
  const testedByCounty = useKhis({
    partner,
    pe,
    county: countyScope,
    subCounty: subCountyScope,
    facility: facilityUid,
    indicators: ["pmtct_initial_test"],
    byCounty: true,
  });
  const needByCounty = useKhis({
    partner,
    pe,
    county: countyScope,
    subCounty: subCountyScope,
    facility: facilityUid,
    indicators: ["pmtct_need"],
    byCounty: true,
  });
  const kpByCounty = useKhis({
    partner,
    pe,
    county: countyScope,
    subCounty: subCountyScope,
    facility: facilityUid,
    indicators: ["pmtct_anc1_known_pos"],
    byCounty: true,
  });

  // Live values (null when KHIS has no value for this scope/period).
  const live = useMemo(
    () => ({
      anc1: value("pmtct_anc1_visits"),
      tested: value("pmtct_initial_test"),
      need: value("pmtct_need"),
      kp: value("pmtct_anc1_known_pos"),
    }),
    [data, value],
  );
  const isLive = Object.values(live).some((x): x is number => x != null);

  // KHIS answered but reported ZERO values for this period/scope — never show
  // demo numbers in that case (e.g. a future month looks like "data").
  const noPeriodData = !isLive && !!data && !error && !loading;

  // A percentage is only meaningful when BOTH values are live.
  const livePct = (n: number | null, d: number | null) =>
    n != null && d != null && d > 0
      ? Math.max(0, Math.min(100, Math.round((n / d) * 100)))
      : null;

  const testedPct = livePct(live.tested, live.anc1);
  const knownStatusPct = testedPct;

  // Bar chart: 1st ANC vs HIV Tested, per county (fallback: demo districts).
  const ancVsTestedData = useMemo(() => {
    const a = ancByCounty.data?.counties ?? [];
    const t = testedByCounty.data?.counties ?? [];
    if (noPeriodData)
      return [
        { name: filter.county || "No data", "ANC Visits": 0, "HIV Tested": 0 },
      ];
    if (a.length === 0 && t.length === 0) return DEMO_ANC_TESTED;
    const names = new Set<string>([
      ...a.map((c) => c.name),
      ...t.map((c) => c.name),
    ]);
    return [...names].map((name) => ({
      name,
      "ANC Visits": a.find((c) => c.name === name)?.value ?? 0,
      "HIV Tested": t.find((c) => c.name === name)?.value ?? 0,
    }));
  }, [ancByCounty.data, testedByCounty.data, noPeriodData, filter.county]);

  // Donut: HIV testing coverage (live pct when both values are live).
  const hivTestingData = useMemo(
    () =>
      noPeriodData
        ? [
            { name: "HIV Tested", value: 0, fill: "#10b981" },
            { name: "Not Reported", value: 100, fill: "#e5e7eb" },
          ]
        : testedPct != null
          ? [
              { name: "HIV Tested", value: testedPct, fill: "#10b981" },
              { name: "Not Tested", value: 100 - testedPct, fill: "#e5e7eb" },
            ]
          : DEMO_HIV_TESTING,
    [testedPct, noPeriodData],
  );

  // NP = need − KP (KHIS reports the combined "need" and the KP split).
  const npKpData = useMemo(() => {
    const need = needByCounty.data?.counties ?? [];
    const kp = kpByCounty.data?.counties ?? [];
    if (noPeriodData)
      return [
        {
          name: filter.county || "No data",
          "Newly HIV+ (NP)": 0,
          "Known HIV+ (KP)": 0,
        },
      ];
    if (need.length === 0 && kp.length === 0) return DEMO_NP_KP;
    const names = new Set<string>([
      ...need.map((c) => c.name),
      ...kp.map((c) => c.name),
    ]);
    return [...names].map((name) => {
      const n = need.find((c) => c.name === name)?.value ?? 0;
      const k = kp.find((c) => c.name === name)?.value ?? 0;
      return {
        name,
        "Newly HIV+ (NP)": Math.max(n - k, 0),
        "Known HIV+ (KP)": k,
      };
    });
  }, [needByCounty.data, kpByCounty.data, noPeriodData, filter.county]);

  const noDataSub = `no KHIS data for ${peLabel} in this scope`;

  const p = useMemo(
    () => ({
      anc1: live.anc1 ?? (noPeriodData ? 0 : 1025),
      tested: live.tested ?? (noPeriodData ? 0 : 984),
      need: live.need ?? (noPeriodData ? 0 : 770),
      kp: live.kp ?? (noPeriodData ? 0 : 320),
    }),
    [live, noPeriodData],
  );
  const np = Math.max(p.need - p.kp, 0);

  const sourceBadge = loading ? (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
      Loading KHIS…
    </span>
  ) : isLive && data ? (
    <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">
      Live · national KHIS · {data.scope} · {data.peLabel}
    </span>
  ) : error ? (
    <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold">
      KHIS error: {error}
    </span>
  ) : noPeriodData && periodFuture ? (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
      No KHIS data yet for {peLabel} — period is in the future (showing zeros)
    </span>
  ) : noPeriodData ? (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
      No KHIS data for {peLabel} in this scope — showing zeros
    </span>
  ) : (
    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">
      Demo data — no KHIS values for this partner/period
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <SectionBanner
          tone="blue"
          title="Intake & Screening — the entry point of the PMTCT cascade"
          subtitle="1st ANC attendance, HIV testing coverage and HIV+ detection (NP + KP) at the 1st ANC visit."
        />
        {sourceBadge}
      </div>

      <>
        {/* Intake KPI strip — aligned to Domain 1 entry indicators */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <DomainKpi
            title="1st ANC Attendance"
            value={
              live.anc1 != null
                ? p.anc1.toLocaleString()
                : noPeriodData
                  ? "0"
                  : "94%"
            }
            sub={
              live.anc1 != null
                ? "1st ANC visits (MOH 731 HV02-01)"
                : noPeriodData
                  ? noDataSub
                  : "PMTCT_STAT_D · target >95% (demo)"
            }
            tone="on"
            accent={live.anc1 != null ? "text-emerald-600" : "text-amber-600"}
          />
          <DomainKpi
            title="HIV Tested at 1st ANC"
            value={
              testedPct != null ? `${testedPct}%` : noPeriodData ? "0%" : "96%"
            }
            sub={
              testedPct != null
                ? `${p.tested.toLocaleString()} of ${p.anc1.toLocaleString()} tested · target >95%`
                : noPeriodData
                  ? noDataSub
                  : "PMTCT_STAT_N · target >95% (demo)"
            }
            tone={testedPct != null ? (testedPct >= 95 ? "on" : "warn") : "on"}
            accent={
              testedPct != null && testedPct < 95
                ? "text-amber-600"
                : "text-emerald-600"
            }
          />
          <DomainKpi
            title="PBFW with known status"
            value={noPeriodData ? "0" : p.tested.toLocaleString()}
            sub={
              knownStatusPct != null
                ? `${knownStatusPct}% of ${p.anc1.toLocaleString()} 1st ANC attendees`
                : noPeriodData
                  ? noDataSub
                  : "96% of 1,025 1st ANC attendees (demo)"
            }
            tone="on"
          />
          <DomainKpi
            title="HIV+ identified at intake"
            value={noPeriodData ? "0" : p.need.toLocaleString()}
            sub={
              isLive
                ? `${np.toLocaleString()} NP + ${p.kp.toLocaleString()} KP · of those tested`
                : noPeriodData
                  ? noDataSub
                  : "450 NP + 320 KP · 78% of those tested (demo)"
            }
            tone="on"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart: 1st ANC vs HIV Tested */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">
                1st ANC Attendance vs HIV Testing
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onSetActiveChart({
                      id: "clinical-anc-testing",
                      title: "1st ANC Attendance vs HIV Testing",
                      summary:
                        "This chart compares women reached at first ANC against those who received an HIV test result.",
                      prompt:
                        "Explain the testing gap and tell me where the biggest coverage problem is emerging.",
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
                >
                  <Sparkles className="h-3.5 w-3.5" /> AI Assist
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSaveToPlayground({
                      id: "clinical-anc-testing",
                      title: "1st ANC Attendance vs HIV Testing",
                      summary:
                        "This chart compares women reached at first ANC against those who received an HIV test result.",
                      prompt:
                        "Explain the testing gap and tell me where the biggest coverage problem is emerging.",
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
                <ViewDataButton
                  title="1st ANC Attendance vs HIV Testing"
                  data={ancVsTestedData}
                  note="per county — live KHIS when available, else demo"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Women reached at 1st ANC and those with an HIV test result at
              intake, per county.
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ancVsTestedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="ANC Visits" fill="#10b981" />
                <Bar dataKey="HIV Tested" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut Chart: HIV Testing */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">
                HIV Testing Coverage (1st ANC Visits)
              </h3>
              <ViewDataButton
                title="HIV Testing Coverage (1st ANC Visits)"
                data={hivTestingData}
                note={`${testedPct != null ? `live ratio ${testedPct}%` : noPeriodData ? "no KHIS data — zeros" : "demo fallback"} · tested of ANC 1st visits`}
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              PMTCT_STAT_N — proportion of PBFW tested for HIV at 1st ANC ·
              target &gt;95%.
            </p>
            <div className="flex flex-col items-center justify-center gap-8 h-[300px]">
              <div className="relative">
                <ResponsiveContainer width={260} height={260}>
                  <PieChart>
                    <Pie
                      data={hivTestingData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {hivTestingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-bold text-emerald-600">
                    {testedPct != null
                      ? `${testedPct}%`
                      : noPeriodData
                        ? "0%"
                        : "96%"}
                  </p>
                  <p className="text-xs text-gray-500">Tested</p>
                </div>
              </div>
              <div className="flex gap-6">
                {hivTestingData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-sm text-gray-700">
                      {item.name}: {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* HIV+ detection at intake: NP vs KP */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              HIV+ PBFW identified at Intake — New (NP) vs Known (KP)
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-800 text-xs font-bold">
                Denominator for ART initiation (PMTCT_ART)
              </span>
              <ViewDataButton
                title="HIV+ PBFW identified at Intake — NP vs KP"
                data={npKpData}
                note="per county — live KHIS when available, else demo"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            Women found HIV+ during the period are either newly identified at
            1st ANC (NP) or already known positive (KP). Together they form the
            pool who must start ART — see 1.B.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={npKpData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Newly HIV+ (NP)" stackId="a" fill="#0d9488" />
                  <Bar dataKey="Known HIV+ (KP)" stackId="a" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center bg-blue-50 rounded-lg p-6 border border-blue-200">
              <p className="text-sm font-medium text-blue-800">
                HIV+ PBFW identified at 1st ANC (YTD)
              </p>
              <p className="text-5xl font-bold text-blue-700 mt-2">
                {noPeriodData ? "0" : p.need.toLocaleString()}
              </p>
              <p className="text-xs text-blue-700/80 mt-2">
                {isLive
                  ? `${((np / p.need) * 100).toFixed(0)}% newly identified (NP) · ${((p.kp / p.need) * 100).toFixed(0)}% known positive (KP)`
                  : noPeriodData
                    ? noDataSub
                    : "58% newly identified (NP) · 42% known positive (KP) (demo)"}
              </p>
            </div>
          </div>
        </div>
      </>
    </div>
  );
};

// ===========================================================================
// 1.B — PMTCT & HIV Care (HIV+ cascade + HEI follow-up)
// ===========================================================================

// DEMO fallback values for 1.B (used only when live KHIS is unreachable).
const DEMO_PBFW_NEW_POSITIVE = 450; // Number of PBFW newly identified HIV Positive (NP)
const DEMO_PBFW_KNOWN_POSITIVE = 320; // Number of PBFW Known HIV Positive at 1st ANC (KP)
const DEMO_PBFW_NEW_ART = 385; // PBFW New Positive initiated on ART (PMTCT_ART, New)
const DEMO_PBFW_KNOWN_ART = 290; // PBFW Known Positive initiated on ART (PMTCT_ART, KP)
const DEMO_HEI_EID_2_8_WEEKS = 192; // EID sample within 2-8 weeks incl. birth (PMTCT_EID)
const DEMO_HEI_EID_3_12_MONTHS = 145; // EID samples collected within 3-12 months
const DEMO_HEI_EID_PCT = 88; // % of HEI with EID samples collected within 2-8 weeks
const DEMO_PCR_POSITIVE_HEI = 26; // Number of PCR Positive HEI results received
const DEMO_HEI_POSITIVE_ART = 24; // Positive HEI initiated ART (PMTCT_HEI_ART)
const DEMO_HIV_DELIVERIES = 380; // Deliveries among HIV+ mothers in supported facilities
const DEMO_SBA_HIV_PCT = 92; // % skilled Birth attendance among HIV Positive mothers
const DEMO_HEI_COHORT_ENROLLED = 410; // HEI enrolled in the Cohort 18-24 months (PMTCT_FO)
const DEMO_HEI_COHORT_NEGATIVE = 396; // HEI discharged HIV negative 18-24 months (PMTCT_FO)
const DEMO_PAIRS_CONTINUUM_PCT = 91; // % mother-baby pair across continuum of care at 18-24 months

const DEMO_CONVERSION_FUNNEL = [
  { stage: "New HIV+ PBFW", value: 450 },
  { stage: "Eligible for ART", value: 425 },
  { stage: "Initiated on ART", value: 385 },
];

const DEMO_SBA_HIV = [
  { name: "Embu County", sba: 94 },
  { name: "Runyenjes", sba: 90 },
  { name: "Meru County", sba: 93 },
  { name: "Nkubu", sba: 88 },
];

const missedOpportunitiesData = [
  { month: "Jan", missed: 45 },
  { month: "Feb", missed: 38 },
  { month: "Mar", missed: 42 },
  { month: "Apr", missed: 35 },
  { month: "May", missed: 32 },
  { month: "Jun", missed: 28 },
];

const heiSamplesData = [
  { month: "Jan", samples: 120 },
  { month: "Feb", samples: 135 },
  { month: "Mar", samples: 148 },
  { month: "Apr", samples: 165 },
  { month: "May", samples: 178 },
  { month: "Jun", samples: 192 },
];

const vipFollowUpData = [
  { month: "Jan", enrolled: 95 },
  { month: "Feb", enrolled: 108 },
  { month: "Mar", enrolled: 122 },
  { month: "Apr", enrolled: 135 },
  { month: "May", enrolled: 149 },
  { month: "Jun", enrolled: 162 },
];

const VIP_YTD = vipFollowUpData.reduce((acc, d) => acc + d.enrolled, 0);

// ---- PMTCT Cascade — the mother–baby pair continuum "story" (demo fallback) ----
const DEMO_CASCADE = [
  { stage: "PBFW at 1st ANC (known HIV status)", count: 1025 },
  { stage: "HIV tested at 1st ANC", count: 984 },
  { stage: "HIV+ identified (NP + KP)", count: 770 },
  { stage: "Initiated on ART", count: 675 },
  { stage: "Delivered at supported facilities", count: 380 },
];

const DEMO_HEI_OUTCOME = [
  {
    stage: "HEI enrolled in 18–24 month cohort",
    count: DEMO_HEI_COHORT_ENROLLED,
  },
  { stage: "HEI discharged HIV-negative", count: DEMO_HEI_COHORT_NEGATIVE },
];

// ---- Mother–baby pair pathway (§4 tracking approach) ----
const MBP_PATHWAY = [
  {
    stage: "ANC",
    services: "ANC visits · HIV testing · PrEP screening",
    focus: "Early identification, linkage, adherence monitoring",
    expanded:
      "SHA enrollment at ANC; risk stratification for high-burden counties",
    color: "bg-emerald-50 border-emerald-200 text-emerald-900",
    chip: "bg-emerald-100 text-emerald-800",
  },
  {
    stage: "Delivery",
    services: "Skilled birth attendance; HIV-positive mothers",
    focus: "Quality of intrapartum care; safe delivery outcomes",
    expanded:
      "Safe blood availability; oxygen/CPAP readiness; equipment functionality verification",
    color: "bg-teal-50 border-teal-200 text-teal-900",
    chip: "bg-teal-100 text-teal-800",
  },
  {
    stage: "PNC ≤ 48 hrs",
    services: "Postnatal checks for mother & newborn; early infant testing",
    focus: "Continuity of care; early maternal-newborn outcomes",
    expanded:
      "Breastfeeding initiation; respectful maternity care documentation",
    color: "bg-cyan-50 border-cyan-200 text-cyan-900",
    chip: "bg-cyan-100 text-cyan-800",
  },
  {
    stage: "ART/MCH",
    services: "ART for HIV+ mothers; PMTCT; PrEP for PBFW",
    focus: "Treatment initiation, adherence, viral suppression",
    expanded: "Integration with SHA claims data for outcome tracking",
    color: "bg-blue-50 border-blue-200 text-blue-900",
    chip: "bg-blue-100 text-blue-800",
  },
  {
    stage: "Community",
    services: "Follow-up, tracing, appointment adherence, psychosocial support",
    focus: "Linkage, retention, continuity beyond the facility",
    expanded:
      "eCHIS-linked community death reporting; CHP-led danger sign surveillance",
    color: "bg-violet-50 border-violet-200 text-violet-900",
    chip: "bg-violet-100 text-violet-800",
  },
];

// Viral load (PMTCT_PVLS)
const vlData = [
  { name: "Suppressed", value: 94, fill: "#10b981" },
  { name: "Unsuppressed", value: 6, fill: "#e5e7eb" },
];

const vlTrendData = [
  { month: "Jan", uptake: 84, suppressed: 88 },
  { month: "Feb", uptake: 86, suppressed: 89 },
  { month: "Mar", uptake: 88, suppressed: 91 },
  { month: "Apr", uptake: 89, suppressed: 92 },
  { month: "May", uptake: 91, suppressed: 93 },
  { month: "Jun", uptake: 92, suppressed: 94 },
];

// PCR → HEI ART donut (illustrative — EMR cohort, no KHIS org-unit source)
const heiArtDonut = [
  { name: "Initiated on ART", value: DEMO_HEI_POSITIVE_ART, fill: "#0d9488" },
  {
    name: "Not yet initiated",
    value: DEMO_PCR_POSITIVE_HEI - DEMO_HEI_POSITIVE_ART,
    fill: "#fee2e2",
  },
];

// One row of the Domain 1 indicator collection
function IndicatorRow({
  code,
  label,
  value,
  pct,
  isPct = false,
}: {
  code: string;
  label: string;
  value: number | string;
  pct?: string;
  isPct?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <div className="flex items-start gap-3 min-w-0">
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold whitespace-nowrap">
          {code}
        </span>
        <p className="text-sm text-gray-800">{label}</p>
      </div>
      <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
        {isPct ? (typeof value === "number" ? `${value}%` : value) : value}
        {!isPct && pct !== undefined && (
          <span className="text-xs font-semibold text-gray-500 ml-1">
            ({pct}%)
          </span>
        )}
      </p>
    </div>
  );
}

// ---- Domain 1 helpers: status badges, target meters, cascade bars ----
type StatusTone = "on" | "warn" | "off";

const STATUS_LABEL: Record<StatusTone, string> = {
  on: "On target",
  warn: "Needs attention",
  off: "Below target",
};

const STATUS_DOT: Record<StatusTone, string> = {
  on: "bg-emerald-500",
  warn: "bg-amber-500",
  off: "bg-red-500",
};

function DomainKpi({
  title,
  value,
  sub,
  tone = "on",
  accent = "text-emerald-600",
}: {
  title: string;
  value: string;
  sub: string;
  tone?: StatusTone;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600 font-medium leading-snug">
          {title}
        </p>
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[tone]}`}
          title={STATUS_LABEL[tone]}
        />
      </div>
      <p className={`text-3xl font-bold mt-2 ${accent}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function CascadeBar({
  stage,
  count,
  max,
  note,
  unit = "of PBFW",
  reported = true,
}: {
  stage: string;
  count: number;
  max: number;
  note?: string;
  unit?: string;
  // false = KHIS did not report this stage this period while other stages
  // ARE live — render "n/r" instead of a misleading 0 bar.
  reported?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (count / max) * 100) : 0;
  const roundedPct = Math.round(pct);
  return (
    <div>
      <div className="flex justify-between items-baseline gap-2 mb-1">
        <p className="text-sm font-medium text-gray-700">{stage}</p>
        <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
          {reported ? count.toLocaleString() : "n/r"}
          {note && (
            <span className="text-xs font-medium text-gray-400 ml-2">
              {note}
            </span>
          )}
        </p>
      </div>
      <div className="w-full bg-slate-100 rounded-md h-8 overflow-hidden">
        {reported ? (
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-r-md flex items-center justify-end pr-2 text-white text-xs font-bold transition-all"
            style={{ width: `${pct}%` }}
          >
            {pct > 18 && `${roundedPct}% ${unit}`}
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center rounded-md border-2 border-dashed border-slate-300 text-[11px] font-medium text-slate-400">
            not reported on KHIS this period
          </div>
        )}
      </div>
    </div>
  );
}

const Subtab2B = ({
  onSetActiveChart,
  onSaveToPlayground,
}: ClinicalSubtabProps) => {
  const { filter, pe, peLabel, periodFuture } = useGeoFilter();
  const partner = filter.partner || "jamii-tekelezi";

  const facilityUid = useMemo(() => {
    if (!filter.facility) return undefined;
    const fac = PARTNER_FACILITIES[partner]?.find(
      (f) => f.name === filter.facility,
    );
    return fac?.uid;
  }, [filter.facility, partner]);
  const countyScope = filter.county || undefined;
  const subCountyScope = filter.subCounty || undefined;

  // Live PMTCT cascade values for this period (MOH 731 HV02 rows).
  const { data, loading, error, value } = useKhis({
    partner,
    pe,
    county: countyScope,
    subCounty: subCountyScope,
    facility: facilityUid,
    indicators: [
      "pmtct_anc1_visits",
      "pmtct_initial_test",
      "pmtct_need",
      "pmtct_anc1_known_pos",
      "pmtct_art",
      "hiv_deliveries",
      "eid_2_8_weeks",
      "pcr_positive_hei",
      "vl_lt_1000",
      "vl_result",
      "hei_pcr_pos_6_8wks",
      "hei_cohort_24m",
      "hei_negative_18m",
      "hei_art_linkage",
      "maternal_haart_total",
      "maternal_haart_start_anc",
    ],
  });

  const live = useMemo(
    () => ({
      anc1: value("pmtct_anc1_visits"),
      tested: value("pmtct_initial_test"),
      need: value("pmtct_need"),
      kp: value("pmtct_anc1_known_pos"),
      art: value("pmtct_art"),
      deliveries: value("hiv_deliveries"),
      eid: value("eid_2_8_weeks"),
      pcrPos: value("pcr_positive_hei"),
      vlLt1000: value("vl_lt_1000"),
      vlResult: value("vl_result"),
      pcrPos6_8: value("hei_pcr_pos_6_8wks"),
      cohort24m: value("hei_cohort_24m"),
      neg18m: value("hei_negative_18m"),
      heiLinkage: value("hei_art_linkage"),
      haartTotal: value("maternal_haart_total"),
      haartStartAnc: value("maternal_haart_start_anc"),
    }),
    [data, value],
  );
  const liveCount = Object.values(live).filter(
    (x): x is number => x != null,
  ).length;
  const isLive = liveCount > 0;

  // KHIS answered for this period/scope at all (regardless of how many
  // indicators have values) — never show demo numbers when we have a real
  // KHIS response; indicators KHIS didn't report become n/r (when other
  // stages are live) or 0 (when nothing is live), never estimates.
  const khisAnswered = !!data && !error && !loading;

  // KHIS answered but reported ZERO values for this period/scope — never show
  // demo numbers in that case (e.g. a future month looks like "data").
  const noPeriodData = !isLive && !!data && !error && !loading;

  const livePct = (n: number | null, d: number | null) =>
    n != null && d != null && d > 0
      ? Math.max(0, Math.min(100, Math.round((n / d) * 100)))
      : null;

  // A stage is "not reported" (n/r) when KHIS answered, some other stage is
  // live, but THIS stage has no value — a hard 0 would imply an impossible
  // drop (e.g. 84 HIV+ identified → 0 initiated on ART).
  const nrOf = (v: number | null | undefined) =>
    isLive && khisAnswered && v == null;
  const reported = (v: number | null | undefined) =>
    !khisAnswered || v != null || !isLive;

  // HEI 18–24m cohort pair (KHIS HV02-50 net cohort + HEI AB− 18m) — only used
  // together when the pair is sane (negatives ≤ enrolled); otherwise the EMR
  // cohort (est.) is shown.
  const liveHeiPair =
    live.cohort24m != null &&
    live.cohort24m > 0 &&
    live.neg18m != null &&
    live.neg18m <= live.cohort24m;

  // Live cascade stages with (est.) fallback when KHIS lacks a value.
  const noDataSub = `no KHIS data for ${peLabel} in this scope`;

  const p = useMemo(
    () => ({
      anc1: live.anc1 ?? (khisAnswered ? 0 : DEMO_CASCADE[0].count),
      tested: live.tested ?? (khisAnswered ? 0 : DEMO_CASCADE[1].count),
      need: live.need ?? (khisAnswered ? 0 : DEMO_CASCADE[2].count),
      kp: live.kp ?? (khisAnswered ? 0 : DEMO_PBFW_KNOWN_POSITIVE),
      art:
        live.art ??
        (khisAnswered ? 0 : DEMO_PBFW_NEW_ART + DEMO_PBFW_KNOWN_ART),
      deliveries:
        live.deliveries ?? (khisAnswered ? 0 : DEMO_HIV_DELIVERIES),
      eid: live.eid ?? (khisAnswered ? 0 : DEMO_HEI_EID_2_8_WEEKS),
      pcrPos:
        live.pcrPos6_8 ??
        live.pcrPos ??
        (khisAnswered ? 0 : DEMO_PCR_POSITIVE_HEI), // HV02 first-PCR +ve (live) over Infected_24mths
      heiEid3_12: khisAnswered ? 0 : DEMO_HEI_EID_3_12_MONTHS, // no KHIS org-unit source (est.)
      heiEidPct: khisAnswered ? 0 : DEMO_HEI_EID_PCT, // denominator not on KHIS monthly (est.)
      heiArt: live.heiLinkage ?? (khisAnswered ? 0 : DEMO_HEI_POSITIVE_ART), // HEI linked to CCC (KHIS) over EMR cohort (est.)
      sbaPct: khisAnswered ? 0 : DEMO_SBA_HIV_PCT, // denominator not on KHIS monthly (est.)
      cohortEnrolled: liveHeiPair
        ? (live.cohort24m as number)
        : khisAnswered
          ? 0
          : DEMO_HEI_COHORT_ENROLLED, // KHIS HV02-50 net cohort (live) over EMR (est.)
      cohortNegative: liveHeiPair
        ? (live.neg18m as number)
        : khisAnswered
          ? 0
          : DEMO_HEI_COHORT_NEGATIVE, // KHIS HEI AB− 18m (live) over EMR (est.)
      pairsPct: khisAnswered ? 0 : DEMO_PAIRS_CONTINUUM_PCT, // 18-24m EMR cohort (est.)
      haartTotal: live.haartTotal, // MOH 731 HV02-20
      haartStartAnc: live.haartStartAnc, // MOH 731 HV02-17
    }),
    [live, liveHeiPair, khisAnswered],
  );

  // Viral-load suppression % — KHIS HV03-042 / HV03-043 when reported at scope.
  const vlSuppPct = useMemo(() => {
    if (live.vlLt1000 != null && live.vlResult != null && live.vlResult > 0) {
      return Math.max(
        0,
        Math.min(100, Math.round((live.vlLt1000 / live.vlResult) * 100)),
      );
    }
    return null;
  }, [live.vlLt1000, live.vlResult]);

  // VL donut data — live ratio when available, "Not Reported" once KHIS has
  // answered for this scope (even partially), demo otherwise.
  const vlChartData = khisAnswered
    ? vlSuppPct != null
      ? [
          { name: "Suppressed", value: vlSuppPct, fill: "#10b981" },
          { name: "Unsuppressed", value: 100 - vlSuppPct, fill: "#e5e7eb" },
        ]
      : [
          { name: "Suppressed", value: 0, fill: "#10b981" },
          { name: "Not Reported", value: 100, fill: "#e5e7eb" },
        ]
    : vlData;
  const vlCenterPct = vlSuppPct ?? (khisAnswered ? 0 : 94);

  const np = Math.max(p.need - p.kp, 0);
  const testedPct = livePct(live.tested, live.anc1);
  const artPct = livePct(live.art, live.need);
  const pbfwInitiatedPct = artPct != null ? artPct.toFixed(1) : null;
  const heiArtPct =
    p.pcrPos > 0 ? ((p.heiArt / p.pcrPos) * 100).toFixed(1) : "0.0";
  const heiNegativePct =
    p.cohortEnrolled > 0
      ? ((p.cohortNegative / p.cohortEnrolled) * 100).toFixed(1)
      : "0.0";

  const cascadeData = useMemo(
    () => [
      {
        stage: "PBFW at 1st ANC (known HIV status)",
        count: p.anc1,
        est: live.anc1 == null,
        reported: reported(live.anc1),
      },
      {
        stage: "HIV tested at 1st ANC",
        count: p.tested,
        est: live.tested == null,
        reported: reported(live.tested),
      },
      {
        stage: "HIV+ identified (NP + KP)",
        count: p.need,
        est: live.need == null,
        reported: reported(live.need),
      },
      {
        stage: "Initiated on ART",
        count: p.art,
        est: live.art == null,
        reported: reported(live.art),
      },
      {
        stage: "Delivered at supported facilities",
        count: p.deliveries,
        est: live.deliveries == null,
        reported: reported(live.deliveries),
      },
    ],
    [p, live, reported],
  );

  const conversionFunnelData = useMemo(
    () => [
      {
        stage: "New HIV+ PBFW",
        value: p.need,
        est: live.need == null,
        reported: reported(live.need),
      },
      {
        stage: "Eligible for ART",
        value: p.need,
        est: live.need == null,
        reported: reported(live.need),
      },
      {
        stage: "Initiated on ART",
        value: p.art,
        est: live.art == null,
        reported: reported(live.art),
      },
    ],
    [p, live, reported],
  );

  const heiOutcomeData = useMemo(
    () => [
      {
        stage: "HEI enrolled in 18–24 month cohort",
        count: p.cohortEnrolled,
        est: true,
        reported: !khisAnswered || liveHeiPair || !isLive,
      },
      {
        stage: "HEI discharged HIV-negative",
        count: p.cohortNegative,
        est: true,
        reported: !khisAnswered || liveHeiPair || !isLive,
      },
    ],
    [p, liveHeiPair, khisAnswered, isLive],
  );

  const sourceBadge = loading ? (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
      Loading KHIS…
    </span>
  ) : isLive && data ? (
    <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">
      Live · national KHIS · {data.scope} · {data.peLabel}
      {liveCount < 16 && (
        <span className="font-medium opacity-80">
          {" "}
          · {liveCount}/16 indicators reported this period
        </span>
      )}
    </span>
  ) : error ? (
    <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold">
      KHIS error: {error}
    </span>
  ) : noPeriodData && periodFuture ? (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
      No KHIS data yet for {peLabel} — period is in the future (showing zeros)
    </span>
  ) : noPeriodData ? (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
      No KHIS data for {peLabel} in this scope — showing zeros
    </span>
  ) : (
    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">
      Demo data — no KHIS values for this partner/period
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <SectionBanner
          tone="emerald"
          title="PMTCT & HIV Care — prevention of mother-to-child transmission"
          subtitle="Domain 1 · PMTCT/VTP Quality of Care — full indicator collection: HIV+ PBFW detection → ART initiation → skilled delivery → exposed-infant (HEI) EID & mother–baby pair follow-up. When KHIS reports some indicators but not others, missing ones show “n/r” (not reported) — never estimates or impossible zeros."
        />
        {sourceBadge}
      </div>

      <>
        {/* KPI strip — at-a-glance performance vs targets */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <DomainKpi
            title="HIV Tested at 1st ANC"
            value={
              testedPct != null
                ? `${testedPct}%`
                : khisAnswered
                  ? isLive
                    ? "n/r"
                    : "0%"
                  : "96%"
            }
            sub={
              testedPct != null
                ? `${p.tested.toLocaleString()} of ${p.anc1.toLocaleString()} · target >95%`
                : khisAnswered
                  ? "not reported on KHIS this period"
                  : "PMTCT_STAT_N · target >95% (demo)"
            }
            tone={testedPct != null ? (testedPct >= 95 ? "on" : "warn") : "on"}
            accent={
              testedPct != null && testedPct < 95
                ? "text-amber-600"
                : "text-emerald-600"
            }
          />
          <DomainKpi
            title="HIV+ PBFW on ART"
            value={
              pbfwInitiatedPct != null
                ? `${pbfwInitiatedPct}%`
                : khisAnswered
                  ? isLive
                    ? "n/r"
                    : "0%"
                  : "est."
            }
            sub={
              pbfwInitiatedPct != null
                ? `${p.art.toLocaleString()} of ${p.need.toLocaleString()} · target >95%`
                : khisAnswered
                  ? "not reported on KHIS this period"
                  : `${p.art.toLocaleString()} of ${p.need.toLocaleString()} (demo)`
            }
            tone={artPct != null ? (artPct >= 95 ? "on" : "warn") : "warn"}
            accent="text-amber-600"
          />
          <DomainKpi
            title="VL Suppression"
            value={
              vlSuppPct != null
                ? `${vlSuppPct}%`
                : khisAnswered
                  ? isLive
                    ? "n/r"
                    : "0%"
                  : "94%"
            }
            sub={
              vlSuppPct != null
                ? `${live.vlLt1000?.toLocaleString()} of ${live.vlResult?.toLocaleString()} VL results <1000 (HV03) · target >95%`
                : khisAnswered
                  ? "not reported on KHIS this period"
                  : "PMTCT_PVLS · target >95% (est.)"
            }
            tone={
              vlSuppPct != null ? (vlSuppPct >= 95 ? "on" : "warn") : "warn"
            }
            accent={
              vlSuppPct != null && vlSuppPct < 95
                ? "text-amber-600"
                : "text-emerald-600"
            }
          />
          <DomainKpi
            title="EID ≤ 8 weeks"
            value={
              live.eid != null
                ? p.eid.toLocaleString()
                : khisAnswered
                  ? isLive
                    ? "n/r"
                    : "0"
                  : `${p.heiEidPct}%`
            }
            sub={
              live.eid != null
                ? "EID samples ≤ 8wk (MOH 731 HV02-44)"
                : khisAnswered
                  ? "not reported on KHIS this period"
                  : "PMTCT_EID · target >98% (demo)"
            }
            tone="off"
            accent="text-red-600"
          />
          <DomainKpi
            title="Deliveries among HIV+"
            value={
              live.deliveries != null
                ? p.deliveries.toLocaleString()
                : khisAnswered
                  ? isLive
                    ? "n/r"
                    : "0"
                  : `${p.sbaPct}%`
            }
            sub={
              live.deliveries != null
                ? "deliveries from HIV+ mothers (HV02-02)"
                : khisAnswered
                  ? "not reported on KHIS this period"
                  : "SBA among HIV+ · target >90% (demo)"
            }
            tone="on"
          />
          <DomainKpi
            title="HEI HIV-free 18–24m"
            value={
              liveHeiPair
                ? `${heiNegativePct}%`
                : khisAnswered
                  ? isLive
                    ? "n/r"
                    : "0%"
                  : `${heiNegativePct}%`
            }
            sub={
              liveHeiPair
                ? `${p.cohortNegative.toLocaleString()} of ${p.cohortEnrolled.toLocaleString()} HEI HIV-free at 18–24m · target >95% (KHIS HV02-50/18m)`
                : khisAnswered
                  ? "not reported on KHIS this period"
                  : "PMTCT_FO · target >95% (est.)"
            }
            tone="on"
          />
        </div>

        {/* PMTCT Cascade — the Domain 1 story */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              The PMTCT Cascade — from 1st ANC to ART
            </h3>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold">
                Mother–baby pair continuum
              </span>
              {!khisAnswered && (
                <span className="px-2 py-1 rounded-md bg-teal-50 text-teal-800 text-xs font-bold">
                  {VIP_YTD.toLocaleString()} VIP follow-ups enrolled YTD (est.)
                </span>
              )}
              <ViewDataButton
                title="The PMTCT Cascade"
                data={cascadeData.map((c) => ({
                  stage: c.stage,
                  count: c.reported ? c.count : "n/r",
                  est: c.est,
                }))}
                note={`${isLive ? `Live · KHIS · ${data?.scope} · ${data?.peLabel}` : noPeriodData ? "no KHIS data — zeros" : "demo"} · n/r = not reported on KHIS this period`}
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            Every woman matters: of those who reach 1st ANC, how many are
            tested, linked to ART, deliver safely, and keep their baby HIV-free.
          </p>
          {isLive && khisAnswered && liveCount < 16 && (
            <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
              KHIS reports {liveCount}/16 of these indicators for {peLabel} in
              this scope. Stages shown as “n/r” were not reported this period —
              no impossible drops are implied between live stages.
            </p>
          )}
          <div className="space-y-3">
            {cascadeData.map((item, idx) => {
              const prev = cascadeData[idx - 1];
              const estTag = item.est && !khisAnswered ? " (est.)" : "";
              let note: string | undefined;
              if (idx > 0 && prev) {
                if (prev.reported && item.reported) {
                  note =
                    prev.count > item.count
                      ? `−${(prev.count - item.count).toLocaleString()} vs prev stage${estTag}`
                      : `▲${(item.count - prev.count).toLocaleString()} vs prev stage${estTag}`;
                } else if (item.reported) {
                  note = "prev stage not reported on KHIS this period";
                } else {
                  note = "not reported on KHIS this period";
                }
              } else if (estTag) {
                note = "(est.)";
              }
              return (
                <CascadeBar
                  key={idx}
                  stage={item.stage}
                  count={item.count}
                  max={cascadeData[0].count}
                  reported={item.reported}
                  note={note}
                />
              );
            })}
          </div>

          {/* HEI outcomes at 18-24 months */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                HEI outcomes at 18–24 months (PMTCT_FO) — EMR cohort (est.)
              </h4>
              <div className="space-y-3">
                {heiOutcomeData.map((item, idx) => (
                  <CascadeBar
                    key={idx}
                    stage={item.stage}
                    count={item.count}
                    max={heiOutcomeData[0].count}
                    unit="of HEI"
                    reported={item.reported}
                    note={
                      idx > 0
                        ? item.reported
                          ? `−${(heiOutcomeData[idx - 1].count - item.count).toLocaleString()} vs enrolled`
                          : "not reported on KHIS this period"
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-center bg-emerald-50 rounded-lg p-6 border border-emerald-200">
              <p className="text-sm font-medium text-emerald-800">
                HIV-free survival among exposed infants
              </p>
              <p className="text-5xl font-bold text-emerald-700 mt-2">
                {liveHeiPair
                  ? `${heiNegativePct}%`
                  : khisAnswered
                    ? isLive
                      ? "n/r"
                      : "0%"
                    : `${heiNegativePct}%`}
              </p>
              <p className="text-xs text-emerald-700/80 mt-2">
                {liveHeiPair
                  ? `${p.cohortNegative.toLocaleString()} of ${p.cohortEnrolled.toLocaleString()} HEI discharged HIV-negative · target >95% · KHIS cohort (HV02-50/18m)`
                  : khisAnswered
                    ? "not reported on KHIS this period"
                    : `${p.cohortNegative.toLocaleString()} of ${p.cohortEnrolled.toLocaleString()} HEI discharged HIV-negative · target >95% · EMR cohort (est.)`}
              </p>
            </div>
          </div>
        </div>

        {/* Mother–baby pair pathway — the tracking approach (§4) */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              The Mother–Baby Pair Pathway — longitudinal tracking
            </h3>
            <span className="px-2 py-1 rounded-md bg-violet-50 text-violet-700 text-xs font-bold">
              §4 Tracking Approach
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            The framework follows each mother–baby pair from ANC through
            delivery, PNC, ART/MCH and community follow-up — with safe blood,
            oxygen/CPAP and equipment functionality woven into the delivery
            stage.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {MBP_PATHWAY.map((p, idx) => (
              <div key={p.stage} className="relative">
                <div className={`h-full rounded-lg border p-4 ${p.color}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-bold ${p.chip}`}
                    >
                      {p.stage}
                    </span>
                    {idx < MBP_PATHWAY.length - 1 && (
                      <span className="hidden xl:block text-slate-300 font-bold">
                        →
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-2 text-gray-700">{p.services}</p>
                  <p className="text-[11px] mt-2 opacity-80">
                    <b>Focus:</b> {p.focus}
                  </p>
                  <p className="text-[11px] mt-1.5 pt-1.5 border-t border-white/50 opacity-80">
                    <b>Expanded:</b> {p.expanded}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Viral load uptake & suppression */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Viral Load Uptake &amp; Suppression (PMTCT_PVLS)
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-800 text-xs font-bold">
                NDW/EMR · Monthly
              </span>
              <ViewDataButton
                title="Viral Load Suppression (donut)"
                data={vlChartData}
                note={`${vlSuppPct != null ? `live ratio ${vlSuppPct}% (KHIS HV03)` : "demo"} · % of VL results <1000`}
              />
              <ViewDataButton
                title="VL Uptake & Suppression Trend (Jan–Jun)"
                data={vlTrendData}
                note="Illustrative trend — not on KHIS monthly"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            VL coverage among HIV+ pregnant &amp; breastfeeding women and
            suppression among those tested — the gold standard for ART
            effectiveness.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    <Pie
                      data={vlChartData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {vlChartData.map((entry, index) => (
                        <Cell key={`vl-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-bold text-emerald-700">
                    {vlCenterPct}%
                  </p>
                  <p className="text-xs text-gray-500">Suppressed</p>
                </div>
              </div>
              <div className="flex gap-6">
                {vlChartData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-sm text-gray-700">
                      {item.name}: {item.value}%
                    </span>
                  </div>
                ))}
              </div>
              {vlSuppPct != null && (
                <p className="text-xs text-gray-500 -mt-1">
                  Live ratio — MOH 731 HV03-042 / HV03-043 at {data?.scope} ·{" "}
                  {data?.peLabel}
                </p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Uptake &amp; suppression trend (Jan–Jun)
              </h4>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={khisAnswered ? [] : vlTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[70, 100]} />
                  <Tooltip formatter={(v, name) => [`${v}%`, String(name)]} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="uptake"
                    stroke="#0d9488"
                    strokeWidth={2}
                    name="VL Uptake"
                  />
                  <Line
                    type="monotone"
                    dataKey="suppressed"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Suppression"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 1 — Detection & ART Initiation */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            HIV+ PBFW — Detection &amp; ART Initiation
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            1st ANC attendance (PMTCT_STAT_D) and HIV testing at 1st ANC
            (PMTCT_STAT_N) are shown under 1.A Intake &amp; Screening.
          </p>
          <IndicatorRow
            code="NP"
            label="Number of PBFW newly identified HIV Positive"
            value={nrOf(live.need) || nrOf(live.kp) ? "n/r" : np}
            pct={
              isLive && live.need != null && live.kp != null
                ? ((np / p.need) * 100).toFixed(1)
                : undefined
            }
          />
          <IndicatorRow
            code="KP"
            label="Number of PBFW Known HIV Positive at 1st ANC"
            value={nrOf(live.kp) ? "n/r" : p.kp}
            pct={
              isLive && live.need != null && live.kp != null
                ? ((p.kp / p.need) * 100).toFixed(1)
                : undefined
            }
          />
          <IndicatorRow
            code="PMTCT_ART"
            label="Number of PBFW initiated on ART (New + Known — KHIS total)"
            value={nrOf(live.art) ? "n/r" : p.art}
            pct={pbfwInitiatedPct != null ? pbfwInitiatedPct : undefined}
          />
          <IndicatorRow
            code="% ART"
            label="% of HIV positive PBFW initiated on ART"
            value={nrOf(live.art) ? "n/r" : p.art}
            pct={pbfwInitiatedPct ?? undefined}
          />
          {p.haartTotal != null && (
            <IndicatorRow
              code="HV02-20"
              label="On maternal HAART — Total (KHIS MOH 731)"
              value={p.haartTotal}
              pct={
                p.need != null && p.need > 0
                  ? ((p.haartTotal / p.need) * 100).toFixed(1)
                  : undefined
              }
            />
          )}
          {p.haartStartAnc != null && (
            <IndicatorRow
              code="HV02-17"
              label="Started HAART at ANC (KHIS MOH 731)"
              value={p.haartStartAnc}
            />
          )}
          {p.haartTotal == null && p.haartStartAnc == null && (
            <p className="text-xs text-gray-400 pt-1">
              Maternal HAART totals (MOH 731 HV02-17/20) not reported by
              supported facilities this period — available nationally in KHIS.
            </p>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* HIV Treatment Conversion Funnel */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  HIV Treatment Conversion Funnel
                </h4>
                <ViewDataButton
                  title="HIV Treatment Conversion Funnel"
                  data={conversionFunnelData}
                  note={`${isLive ? `Live · KHIS · ${data?.scope}` : noPeriodData ? "no KHIS data — zeros" : "demo"} · est = fallback`}
                />
              </div>
              <div className="space-y-3">
                {conversionFunnelData.map((item, idx) => {
                  const base = conversionFunnelData[0].value;
                  const percentage =
                    item.reported && base > 0
                      ? ((item.value / base) * 100).toFixed(0)
                      : "0";
                  const width =
                    item.reported && base > 0 ? (item.value / base) * 100 : 0;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {item.stage}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {item.reported
                            ? `${item.value.toLocaleString()} (${percentage}%)`
                            : "n/r"}
                          {item.est && item.reported && (
                            <span className="text-xs font-medium text-gray-400 ml-1">
                              (est.)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                        {item.reported ? (
                          <div
                            className="bg-emerald-500 h-full flex items-center justify-center text-white text-xs font-bold transition-all"
                            style={{ width: `${width}%` }}
                          >
                            {percentage}%
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center rounded-md border-2 border-dashed border-slate-300 text-[11px] font-medium text-slate-400">
                            not reported on KHIS this period
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Missed Opportunities */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  Missed Opportunities (New Positive - Initiated on ART)
                </h4>
                <ViewDataButton
                  title="Missed Opportunities Trend"
                  data={missedOpportunitiesData}
                  note="Illustrative — computed from demo figures, not KHIS"
                />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={khisAnswered ? [] : missedOpportunitiesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="missed"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Missed Cases"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 2 — HEI Early Infant Diagnosis */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Exposed Infant (HEI) — Early Infant Diagnosis (EID)
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            EID sample collection among HIV-exposed infants (PMTCT_EID).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            <IndicatorRow
              code="PMTCT_EID"
              label={
                live.eid != null
                  ? "HEI with EID sample collected within 2-8 weeks (incl. birth testing)"
                  : khisAnswered
                    ? "HEI with EID sample within 2-8 weeks (HV02-44) — not reported this period"
                    : "HEI with EID sample collected within 2-8 weeks (incl. birth testing)"
              }
              value={
                live.eid != null
                  ? p.eid
                  : khisAnswered
                    ? isLive
                      ? "n/r"
                      : 0
                    : p.eid
              }
            />
            <IndicatorRow
              code="EID 3-12m"
              label="HEI with EID samples collected within 3-12 months"
              value={
                live.eid != null
                  ? p.heiEid3_12
                  : khisAnswered
                    ? isLive
                      ? "n/r"
                      : p.heiEid3_12
                    : p.heiEid3_12
              }
            />
            <IndicatorRow
              code="% EID ≤ 8wk"
              label="% of HEI with EID samples collected within 2-8 weeks"
              value={
                live.eid != null
                  ? p.heiEidPct
                  : khisAnswered
                    ? isLive
                      ? "n/r"
                      : p.heiEidPct
                    : p.heiEidPct
              }
              isPct
            />
          </div>
          <p className="text-xs text-gray-400 mb-3">
            EID ≤ 8 weeks is live from KHIS (MOH 731 HV02-44); the 3-12 month
            bucket and the % require cohort denominators not reported on KHIS
            monthly — shown as (est.).
          </p>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4 className="text-sm font-semibold text-gray-700">
              EID sample collection trend (Jan–Jun)
            </h4>
            <ViewDataButton
              title="EID Sample Collection Trend"
              data={heiSamplesData}
              note="Illustrative — monthly trend not on KHIS"
            />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={khisAnswered ? [] : heiSamplesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="samples"
                stroke="#10b981"
                strokeWidth={2}
                name="EID Samples"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 3 — PCR Results & HEI ART */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            PCR Results &amp; HEI ART Initiation
          </h3>
          <IndicatorRow
            code="PCR+"
            label={
              live.pcrPos6_8 != null
                ? "HEI tested positive by first PCR at 6-8 weeks (KHIS)"
                : khisAnswered
                  ? "HEI positive by first PCR at 6-8 weeks (HV02-42) — not reported this period"
                  : "Number of PCR Positive HEI results received (est.)"
            }
            value={
              live.pcrPos6_8 != null
                ? p.pcrPos
                : khisAnswered
                  ? isLive
                    ? "n/r"
                    : 0
                  : p.pcrPos
            }
          />
          <IndicatorRow
            code="PMTCT_HEI_ART"
            label={
              live.heiLinkage != null
                ? "HEI HIV+ infants 0-9m linked to CCC (KHIS)"
                : khisAnswered
                  ? "HEI HIV+ infants 0-9m linked to CCC — not reported this period"
                  : "Number of positive HEI initiated ART (EMR — est.)"
            }
            value={
              live.heiLinkage != null
                ? p.heiArt
                : khisAnswered
                  ? isLive
                    ? "n/r"
                    : 0
                  : p.heiArt
            }
          />
          <IndicatorRow
            code="% HEI ART"
            label="% of PCR positive initiated on ART"
            value={
              live.pcrPos6_8 != null && live.heiLinkage != null
                ? p.heiArt
                : khisAnswered
                  ? isLive
                    ? "n/r"
                    : p.heiArt
                  : p.heiArt
            }
            pct={
              live.pcrPos6_8 != null && live.heiLinkage != null
                ? heiArtPct
                : khisAnswered
                  ? undefined
                  : heiArtPct
            }
          />
        </div>

        {/* 4 — Delivery Care among HIV+ Mothers */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Delivery Care among HIV+ Mothers
            </h3>
            <ViewDataButton
              title="Delivery Care among HIV+ Mothers"
              data={DEMO_SBA_HIV}
              note="Illustrative — SBA % among HIV+ not disaggregated on KHIS monthly"
            />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Deliveries among HIV-positive mothers in the supported facilities.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            <IndicatorRow
              code="Deliveries"
              label="Number of Deliveries among HIV-positive mothers in supported facilities"
              value={
                live.deliveries != null
                  ? p.deliveries
                  : khisAnswered
                    ? isLive
                      ? "n/r"
                      : 0
                    : p.deliveries
              }
            />
            <IndicatorRow
              code="% SBA"
              label="% skilled Birth attendance among HIV Positive mothers (est.)"
              value={
                live.deliveries != null
                  ? p.sbaPct
                  : khisAnswered
                    ? isLive
                      ? "n/r"
                      : p.sbaPct
                    : p.sbaPct
              }
              isPct
            />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={khisAnswered ? [] : DEMO_SBA_HIV}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(v) => [`${v}%`, "SBA"]} />
              <Bar dataKey="sba" fill="#0d9488" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 5 — HEI Cohort 18-24 Months & Continuum of Care */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              HEI Cohort Follow-up — 18-24 Months (PMTCT_FO)
            </h3>
            <ViewDataButton
              title="HEI Cohort Follow-up Trend"
              data={vipFollowUpData}
              note="Illustrative — cohort follow-up not on KHIS monthly"
            />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Retention of exposed infants and mother–baby pairs across the
            continuum of care.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            <IndicatorRow
              code="PMTCT_FO"
              label={
                liveHeiPair
                  ? "Number of HEI in the 18–24 month net cohort (KHIS HV02-50)"
                  : khisAnswered
                    ? "Number of HEI in the 18–24 month net cohort (HV02-50) — not reported this period"
                    : "Number of HEI enrolled in the Cohort 18-24 months (EMR — est.)"
              }
              value={
                liveHeiPair
                  ? p.cohortEnrolled
                  : khisAnswered
                    ? isLive
                      ? "n/r"
                      : 0
                    : p.cohortEnrolled
              }
            />
            <IndicatorRow
              code="PMTCT_FO (−)"
              label={
                liveHeiPair
                  ? "Number of HEI antibody-negative at 18 months (KHIS)"
                  : khisAnswered
                    ? "Number of HEI antibody-negative at 18 months — not reported this period"
                    : "Number of HEI discharged HIV negative 18–24 months (EMR — est.)"
              }
              value={
                liveHeiPair
                  ? p.cohortNegative
                  : khisAnswered
                    ? isLive
                      ? "n/r"
                      : 0
                    : p.cohortNegative
              }
            />
            <IndicatorRow
              code="% Negative"
              label={
                liveHeiPair
                  ? "% of HEI discharged HIV Negative at 18-24 months (KHIS)"
                  : khisAnswered
                    ? "% of HEI discharged HIV Negative at 18-24 months — not reported this period"
                    : "% of HEI discharged HIV Negative at 18-24 months"
              }
              value={
                liveHeiPair
                  ? p.cohortNegative
                  : khisAnswered
                    ? isLive
                      ? "n/r"
                      : p.cohortNegative
                    : p.cohortNegative
              }
              pct={liveHeiPair ? heiNegativePct : khisAnswered ? undefined : heiNegativePct}
            />
            <IndicatorRow
              code="% Pairs"
              label="% of mother–baby pair across the continuum of care reported at 18-24 months (est.)"
              value={
                liveHeiPair || !khisAnswered
                  ? p.pairsPct
                  : isLive
                    ? "n/r"
                    : p.pairsPct
              }
              isPct
            />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={khisAnswered ? [] : vipFollowUpData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="enrolled"
                stroke="#0ea5e9"
                strokeWidth={2}
                name="Enrolled"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </>
    </div>
  );
};
