// ---------------------------------------------------------------------------
// EWENE → KHIS indicator registry (national KHIS: hiskenya.dha.go.ke)
//
// Every entry maps an EWENE dashboard indicator to the REAL data element /
// indicator UID on national KHIS, with the source of truth and status.
// All IDs below were verified live against the KHIS metadata + analytics API.
//
// Note: a single DHIS2 analytics call accepts a list of dx ids joined by ";",
// so the whole registry is fetched in ONE request.
// ---------------------------------------------------------------------------

export interface KhisIndicator {
  /** EWENE short code used across the dashboard. */
  id: string;
  /** Human label shown in the UI. */
  label: string;
  /** KHIS dx UID (data element or indicator). */
  dx: string;
  /** TRUE = it is a KHIS indicator (%), FALSE = raw data element count. */
  isIndicator: boolean;
  /** KHIS metadata name (as found live). */
  khisName: string;
  /** Proven to return non-null values for Meru 202505 via analytics. */
  verified?: boolean;
  /** Domain (1=PMTCT/VTP QoC, 2=Coverage, 3=Readiness, 4=MPDSR, 5=Data systems, P=PrEP). */
  domain: "1" | "2" | "3" | "4" | "5" | "P";
}

// PrEP cascade — MOH 731 HTS elements on national KHIS
export const KHIS_INDICATORS: KhisIndicator[] = [
  // ---- PrEP (Domain P) --------------------------------------------------
  {
    id: "prep_eligible_total",
    label: "Eligible for PrEP (Total)",
    dx: "KVmB2kqafsD",
    isIndicator: false,
    khisName: "Eligible PrEP Total",
    domain: "P",
  },
  {
    id: "prep_new_pbfw",
    label: "Initiated on PrEP — Pregnant & breastfeeding women",
    dx: "Q4HTNSzc34X",
    isIndicator: false,
    khisName:
      "MOH 731_HTS_No. Initiated on PrEP (NEW)_Pregnant and breastfeeding women HV01-31",
    domain: "P",
  },
  {
    id: "prep_new_total",
    label: "Initiated on PrEP (New, Total)",
    dx: "MJ6BGiWLAeM",
    isIndicator: false,
    khisName: "Initiated (New) PrEP Total",
    domain: "P",
  },
  {
    id: "prep_current_total",
    label: "Currently on PrEP (New + Refill + Restart)",
    dx: "n3x2yzdzyhd",
    isIndicator: false,
    khisName: "Currently on PrEP ( New + Refill+ Restart) Total",
    verified: true,
    domain: "P",
  },
  {
    id: "prep_refill_total",
    label: "Continuing on PrEP (Refills, Total)",
    dx: "XjddgCLNTHE",
    isIndicator: false,
    khisName: "Continuing (Refills) PrEP Total",
    domain: "P",
  },
  {
    id: "prep_discontinued_total",
    label: "Discontinued PrEP (Total)",
    dx: "lqk13LAxEBO",
    isIndicator: false,
    khisName: "Discontinued PrEP Total",
    domain: "P",
  },

  // ---- PMTCT / VTP QoC (Domain 1) --------------------------------------
  {
    id: "pmtct_anc1_visits",
    label: "1st ANC Visits (MOH 731 HV02-01)",
    dx: "uSxBUWnagGg",
    isIndicator: false,
    khisName: "MOH 731 1st ANC Visits HV02-01",
    domain: "1",
  },
  {
    id: "pmtct_anc1_known_pos",
    label: "Known HIV+ at 1st ANC (HV02-03)",
    dx: "qSgLzXh46n9",
    isIndicator: false,
    khisName: "MOH 731 Known Positive at 1st ANC HV02-03",
    domain: "1",
  },
  {
    id: "pmtct_anc1_on_haart",
    label: "On HAART at 1st ANC (HV02-16)",
    dx: "lJpaBye9B0H",
    isIndicator: false,
    khisName: "MOH 731 On HAART at 1st ANC HV02-16",
    domain: "1",
  },
  {
    id: "pmtct_art",
    label: "PMTCT ART (KHIS indicator)",
    dx: "FGATEY1l3k4",
    isIndicator: true,
    khisName: "KHIS_PMTCT_ART(N/A)",
    verified: true,
    domain: "1",
  },

  // ---- Coverage (Domain 2) ---------------------------------------------
  {
    id: "sba_pct",
    label: "Deliveries by Skilled Birth Attendants (%)",
    dx: "orD6nMgEqSL",
    isIndicator: true,
    khisName:
      "RRI_Ver_2026_(%) of Deliveries conducted by Skilled Birth Attendants",
    domain: "2",
  },
  {
    id: "deliveries",
    label: "Deliveries (MOH 711 12.2.5)",
    dx: "I3YYLhq8FwF",
    isIndicator: false,
    khisName: "12.2.5 Deliveries",
    domain: "2",
  },
  {
    id: "pnc_48h_coverage",
    label: "PNC within 48h coverage (%)",
    dx: "xgMf5X8cE7D",
    isIndicator: true,
    khisName: "PNC Attendance (within 48 hours) Coverage",
    verified: true,
    domain: "2",
  },
  {
    id: "anc1_4_dropout",
    label: "ANC1–4 Dropout (KHIS)",
    dx: "Ta14nOQC8kh",
    isIndicator: true,
    khisName: "ANC 1-4 Dropout Rate",
    domain: "2",
  },

  // ---- MPDSR (Domain 4) ------------------------------------------------
  {
    id: "maternal_deaths_reported",
    label: "Maternal deaths reported (DTH001)",
    dx: "RIvynmrUFRZ",
    isIndicator: false,
    khisName:
      "Number of Maternal Deaths reported in health facilities (Old and New tool)",
    verified: true,
    domain: "4",
  },
  {
    id: "maternal_deaths_audited",
    label: "Maternal deaths audited (Rev2020)",
    dx: "sEmbbCR882p",
    isIndicator: false,
    khisName: "Number of Maternal Deaths audited in health facilities_Rev2020",
    verified: true,
    domain: "4",
  },
  {
    id: "neonatal_deaths",
    label: "Neonatal deaths (12.2.6)",
    dx: "bv2gJiDLuO6",
    isIndicator: false,
    khisName: "12.2.6 Neonatal deaths",
    domain: "4",
  },
  {
    id: "stillbirths",
    label: "Stillbirths (EAC BTH003)",
    dx: "UjXNTMSefdE",
    isIndicator: false,
    khisName: "EAC Stillbirths",
    verified: true,
    domain: "4",
  },
  {
    id: "stillbirth_rate",
    label: "Stillbirth rate (RRI 2026)",
    dx: "aK4YpfAiW5U",
    isIndicator: true,
    khisName: "RRI_Ver_2026_Stillbirth rate",
    domain: "4",
  },
];

/** Lookup helper. */
export function getKhisIndicator(id: string): KhisIndicator | undefined {
  return KHIS_INDICATORS.find((i) => i.id === id);
}

/** All dx ids (for one analytics request). */
export const ALL_DX = KHIS_INDICATORS.map((i) => i.dx).join(";");
