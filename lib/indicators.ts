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
  // Population-group breakdowns — facilities report these rows and leave the
  // "Total" column blank, so the dashboard sums the five groups per stage:
  //   Eligible = elig_gp + elig_fsw + elig_msm + elig_pwid + elig_dc
  //   Current  = cur_gp + cur_fsw + cur_msm + cur_pwid + cur_dc
  //   Refills  = ref_gp + ref_fsw + ref_msm + ref_pwid + ref_dc
  // (all UIDs verified as members of the MOH 731 PLUS PrEP data sets
  //  A01SsXzNsbD facility / zxyaWpqkTlP dice, and live in analytics.)
  {
    id: "prep_eligible_gp",
    label: "Eligible for PrEP — General population",
    dx: "TmJeb0ttJXO",
    isIndicator: false,
    khisName: "Eligible PrEP General popn",
    domain: "P",
  },
  {
    id: "prep_eligible_fsw",
    label: "Eligible for PrEP — FSW",
    dx: "GK5eHJVjf45",
    isIndicator: false,
    khisName: "Eligible PrEP FSW",
    domain: "P",
  },
  {
    id: "prep_eligible_msm",
    label: "Eligible for PrEP — MSM",
    dx: "RAxC6dok0ZU",
    isIndicator: false,
    khisName: "Eligible PrEP MSM",
    domain: "P",
  },
  {
    id: "prep_eligible_pwid",
    label: "Eligible for PrEP — PWID",
    dx: "N9v5DeqnxRo",
    isIndicator: false,
    khisName: "Eligible PrEP PWID",
    domain: "P",
  },
  {
    id: "prep_eligible_dc",
    label: "Eligible for PrEP — Discordant Couple",
    dx: "d5oDbyxUZNw",
    isIndicator: false,
    khisName: "Eligible PrEP Discordant Couple",
    domain: "P",
  },
  {
    id: "prep_current_gp",
    label: "Currently on PrEP — General population",
    dx: "SvUs6rPKruy",
    isIndicator: false,
    khisName: "Currently on PrEP ( New + Refill+ Restart) General popn",
    domain: "P",
  },
  {
    id: "prep_current_fsw",
    label: "Currently on PrEP — FSW",
    dx: "DWOXcLFInzC",
    isIndicator: false,
    khisName: "Currently on PrEP ( New + Refill+ Restart) FSW",
    domain: "P",
  },
  {
    id: "prep_current_msm",
    label: "Currently on PrEP — MSM",
    dx: "eUXDNCzAWO7",
    isIndicator: false,
    khisName: "Currently on PrEP ( New + Refill+ Restart) MSM",
    domain: "P",
  },
  {
    id: "prep_current_pwid",
    label: "Currently on PrEP — PWID",
    dx: "uJGBLoQwCb4",
    isIndicator: false,
    khisName: "Currently on PrEP ( New + Refill+ Restart) PWID",
    domain: "P",
  },
  {
    id: "prep_current_dc",
    label: "Currently on PrEP — Discordant Couple",
    dx: "Tikx6x3xghp",
    isIndicator: false,
    khisName: "Currently on PrEP ( New + Refill+ Restart) Discordant Couple",
    domain: "P",
  },
  {
    id: "prep_refill_gp",
    label: "Continuing on PrEP (Refills) — General population",
    dx: "w6bbU6qwRLF",
    isIndicator: false,
    khisName: "Continuing (Refills) PrEP General popn",
    domain: "P",
  },
  {
    id: "prep_refill_fsw",
    label: "Continuing on PrEP (Refills) — FSW",
    dx: "Mc8JPUVVMfD",
    isIndicator: false,
    khisName: "Continuing (Refills) PrEP FSW",
    domain: "P",
  },
  {
    id: "prep_refill_msm",
    label: "Continuing on PrEP (Refills) — MSM",
    dx: "RwRT4W7fdzz",
    isIndicator: false,
    khisName: "Continuing (Refills) PrEP MSM",
    domain: "P",
  },
  {
    id: "prep_refill_pwid",
    label: "Continuing on PrEP (Refills) — PWID",
    dx: "hZxuehBbUcT",
    isIndicator: false,
    khisName: "Continuing (Refills) PrEP PWID",
    domain: "P",
  },
  {
    id: "prep_refill_dc",
    label: "Continuing on PrEP (Refills) — Discordant Couple",
    dx: "qBAWpz9z1CA",
    isIndicator: false,
    khisName: "Continuing (Refills) PrEP Discordant Couple",
    domain: "P",
  },
  // Initiated (New) — same pattern as above: KHIS facilities may leave the
  // "Total" column blank and fill the five population-group rows instead, so
  // the dashboard sums the groups when the Total is not reported:
  //   Initiated = new_gp + new_fsw + new_msm + new_pwid + new_dc
  // (UIDs verified as members of the MOH 731 PLUS PrEP data sets
  //  A01SsXzNsbD / zxyaWpqkTlP and live in analytics.)
  {
    id: "prep_new_gp",
    label: "Initiated on PrEP (New) — General population",
    dx: "m5tdPqpqQKa",
    isIndicator: false,
    khisName: "Initiated (New) PrEP General popn",
    domain: "P",
  },
  {
    id: "prep_new_fsw",
    label: "Initiated on PrEP (New) — FSW",
    dx: "tvkamFcbjEa",
    isIndicator: false,
    khisName: "Initiated (New) PrEP FSW",
    domain: "P",
  },
  {
    id: "prep_new_msm",
    label: "Initiated on PrEP (New) — MSM",
    dx: "cucGQCux2ld",
    isIndicator: false,
    khisName: "Initiated (New) PrEP MSM",
    domain: "P",
  },
  {
    id: "prep_new_pwid",
    label: "Initiated on PrEP (New) — PWID",
    dx: "IibqwYumcez",
    isIndicator: false,
    khisName: "Initiated (New) PrEP PWID",
    domain: "P",
  },
  {
    id: "prep_new_dc",
    label: "Initiated on PrEP (New) — Discordant Couple",
    dx: "TtvO6ol7Kq7",
    isIndicator: false,
    khisName: "Initiated (New) PrEP Discordant Couple",
    domain: "P",
  },
  // Discontinued PrEP — same pattern; used by the retention donut so no
  // discontinuation count is fabricated as initiated − current.
  {
    id: "prep_discontinued_gp",
    label: "Discontinued PrEP — General population",
    dx: "R3xxj8DCGNg",
    isIndicator: false,
    khisName: "Discontinued PrEP General popn",
    domain: "P",
  },
  {
    id: "prep_discontinued_fsw",
    label: "Discontinued PrEP — FSW",
    dx: "Foz7zB6Amwr",
    isIndicator: false,
    khisName: "Discontinued PrEP FSW",
    domain: "P",
  },
  {
    id: "prep_discontinued_msm",
    label: "Discontinued PrEP — MSM",
    dx: "FB9YUSlbLhU",
    isIndicator: false,
    khisName: "Discontinued PrEP MSM",
    domain: "P",
  },
  {
    id: "prep_discontinued_pwid",
    label: "Discontinued PrEP — PWID",
    dx: "BA5rdvmvi2a",
    isIndicator: false,
    khisName: "Discontinued PrEP PWID",
    domain: "P",
  },
  {
    id: "prep_discontinued_dc",
    label: "Discontinued PrEP — Discordant Couple",
    dx: "ixgJAkkClLk",
    isIndicator: false,
    khisName: "Discontinued PrEP Discordant Couple",
    domain: "P",
  },

  // ---- PMTCT / VTP QoC (Domain 1) --------------------------------------
  {
    id: "pmtct_anc1_visits",
    label: "1st ANC Visits (MOH 711 New ANC clients)",
    dx: "f9vesk5d4IY",
    isIndicator: false,
    khisName: "MOH 711 New ANC clients",
    verified: true,
    domain: "1",
  },
  {
    id: "pmtct_anc1_known_pos",
    label: "Known HIV+ at 1st ANC (MOH 731-2 HV02-01)",
    dx: "e9YgXAmC0qf",
    isIndicator: false,
    khisName: "MOH 731_EMTCT_Known Positive at 1st ANC_HV02-01",
    verified: true,
    domain: "1",
  },
  {
    id: "pmtct_anc1_on_haart",
    label: "On HAART at 1st ANC (MOH 731-2 HV02-14)",
    dx: "O9Wyf1FMHcM",
    isIndicator: false,
    khisName: "MOH 731_EMTCT_On HAART at 1st ANC_HV02-14",
    verified: true,
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
  // MOH 711 delivery-mode elements — summed to give the skilled-deliveries
  // COUNT (numerator of the SBA % indicators). Used to compute SBA % locally
  // with ANC1 attendance as the denominator (the facility may not report
  // "Estimated Deliveries", which the KHIS % indicator requires).
  {
    id: "deliv_normal",
    label: "Normal Deliveries (MOH 711)",
    dx: "jaPrPmor6WV",
    isIndicator: false,
    khisName: "MOH 711 Normal Deliveries",
    verified: true,
    domain: "2",
  },
  {
    id: "deliv_assisted_vaginal",
    label: "Assisted Vaginal Deliveries (MOH 711)",
    dx: "Kx64gGqaFVq",
    isIndicator: false,
    khisName: "MOH 711 Assisted vaginal delivery",
    verified: true,
    domain: "2",
  },
  {
    id: "deliv_breach",
    label: "Breach Deliveries (MOH 711)",
    dx: "sMqM8DwiAaj",
    isIndicator: false,
    khisName: "MOH 711 Breach Delivery",
    verified: true,
    domain: "2",
  },
  {
    id: "deliv_caesarian",
    label: "Caesarian Sections (MOH 711)",
    dx: "rAZBTMa7Jy3",
    isIndicator: false,
    khisName: "MOH 711 Caesarian Sections",
    verified: true,
    domain: "2",
  },
  // MOH 711 PNC ≤48h numerators — used to compute Early PNC / Continuity
  // locally (÷ total deliveries / ÷ live births) so they work at every scope
  // (the KHIS % indicators require the same facility to report both sides).
  {
    id: "pnc_48h_mother_care",
    label: "Mothers with PNC within 48h (MOH 711)",
    dx: "qahRo2120r8",
    isIndicator: false,
    khisName:
      "MOH 711 Rev 2020_Mothers receiving Postpartum Care within 48 hours",
    verified: true,
    domain: "2",
  },
  {
    id: "pnc_48h_infant_care",
    label: "Infants with PNC within 48h (MOH 711)",
    dx: "wxg6cuH9cXF",
    isIndicator: false,
    khisName:
      "MOH 711 Rev 2020_Infants receiving Pospartum care within 48 hours",
    verified: true,
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
    verified: true,
    domain: "2",
  },
  {
    id: "anc4_visits",
    label: "Pregnant women completing 4 ANC visits (MOH 711 12.2.3)",
    dx: "Fz0LzxMT1vV",
    isIndicator: false,
    khisName: "MOH 711 Pregnant women completing 4 ANC visits 12.2.3",
    verified: true,
    domain: "2",
  },
  {
    id: "pmtct_anc1_tested",
    label: "1st ANC HIV Tested (MOH 731-2 Initial test at ANC)",
    dx: "JNjdyMxJbrR",
    isIndicator: false,
    khisName: "MOH 731_EMTCT_Tested at ANC_Initial_HV02-02",
    verified: true,
    domain: "1",
  },
  {
    id: "anc8_visits",
    label: "Pregnant women completing 8 ANC visits (MOH 711)",
    dx: "cKr5133RFuN",
    isIndicator: false,
    khisName: "MOH 711 Rev 2020 No. of clients completed 8th ANC Contact",
    verified: true,
    domain: "2",
  },
  {
    id: "sba_pct_live",
    label: "Deliveries by Skilled Birth Attendants (%, RRI 2026)",
    dx: "sAWX6GB722p",
    isIndicator: true,
    khisName:
      "RRI_Ver_2026_(%) of Deliveries conducted by Skilled Birth Attendants",
    verified: true,
    domain: "2",
  },
  {
    id: "pnc_48h_mother",
    label: "PNC within 48 hours — Mother (%)",
    dx: "KXOpQO6bxoU",
    isIndicator: true,
    khisName: "PNC within 48 hours Mother",
    verified: true,
    domain: "2",
  },
  {
    id: "pnc_48h_infant",
    label: "PNC within 48 hours — Infant (%)",
    dx: "IhseOshzo8K",
    isIndicator: true,
    khisName: "PNC within 48 hours Infant",
    verified: true,
    domain: "2",
  },
  {
    id: "kmc",
    label: "Neonates initiated on KMC (MOH 711 Rev 2020)",
    dx: "AxqwEdpy6AH",
    isIndicator: false,
    khisName: "MOH 711 Rev 2020 Neonates initiated on KMC",
    verified: true,
    domain: "2",
  },
  {
    id: "chlorhexidine",
    label: "Babies applied chlorhexidine for cord care (MOH 711 Rev 2020)",
    dx: "bPpRMDzpXXN",
    isIndicator: false,
    khisName: "MOH 711 Rev 2020 Babies applied chlorhexidine",
    verified: true,
    domain: "2",
  },
  {
    id: "mmr",
    label: "Facility Maternal Mortality Ratio (per 100,000)",
    dx: "fCUaxiQYZzm",
    isIndicator: true,
    khisName: "Facility Maternal Mortality Ratio",
    verified: true,
    domain: "2",
  },

  // ---- PMTCT cascade extra stages (Domain 1) ----------------------------
  {
    id: "pmtct_initial_test",
    label: "HIV Tested at 1st ANC (MOH 731-2 Initial test at ANC)",
    dx: "JNjdyMxJbrR",
    isIndicator: false,
    khisName: "MOH 731_EMTCT_Tested at ANC_Initial_HV02-02",
    verified: true,
    domain: "1",
  },
  {
    id: "pmtct_new_positive",
    label: "Newly HIV+ at ANC (MOH 731-2 Positive Results ANC)",
    dx: "gmaBILMqfJ8",
    isIndicator: false,
    khisName: "MOH 731_EMTCT_Positive Results_ANC_HV02-10",
    verified: true,
    domain: "1",
  },
  {
    id: "pmtct_start_haart_anc",
    label: "Started HAART at ANC (MOH 731-2 Start HAART ANC)",
    dx: "diGK4TSNrR5",
    isIndicator: false,
    khisName: "MOH 731_EMTCT_Start HAART_ANC_HV02-15",
    verified: true,
    domain: "1",
  },
  {
    id: "hiv_deliveries",
    label: "HIV+ at delivery (MOH 731-2 Positive Results L&D)",
    dx: "vk1y3YRXzBO",
    isIndicator: false,
    khisName: "MOH 731_EMTCT_Positive Results _L&D_HV02-11",
    verified: true,
    domain: "1",
  },
  {
    id: "eid_2_8_weeks",
    label: "Initial PCR < 8 weeks (MOH 731 HV02-44)",
    dx: "UIok7l6W4nh",
    isIndicator: false,
    khisName: "MOH 731 Initial PCR < 8wks HV02-44",
    verified: true,
    domain: "1",
  },
  {
    id: "pcr_positive_hei",
    label: "Infected 24mths (MOH 731 HV02-47)",
    dx: "DMr8fYCKJzF",
    isIndicator: false,
    khisName: "MOH 731 Infected_24mths HV02-47",
    verified: true,
    domain: "1",
  },
  {
    id: "vl_lt_1000",
    label: "Viral load < 1000 copies (12 months, HV03-042)",
    dx: "RNfqUayuZP2",
    isIndicator: false,
    khisName: "MOH 731 Viral load <1000_12mths HV03-042",
    verified: true,
    domain: "1",
  },
  {
    id: "vl_result",
    label: "Viral load results available (12 months, HV03-043)",
    dx: "MR5lxj7v7Lt",
    isIndicator: false,
    khisName: "MOH 731 Viral load result_12mths HV03-043",
    verified: true,
    domain: "1",
  },
  {
    id: "hei_pcr_pos_6_8wks",
    label: "HEI tested positive by first PCR at 6-8 weeks",
    dx: "tYL0A1JspLB",
    isIndicator: false,
    khisName: "HEI tested positive by first PCR at age 6-8 weeks",
    verified: true,
    domain: "1",
  },
  {
    id: "hei_cohort_24m",
    label: "Net cohort HEI 24 months (HV02-50)",
    dx: "xHufJhG2OJx",
    isIndicator: false,
    khisName: "MOH 731 Net cohort_HEI_24 months HV02-50",
    verified: true,
    domain: "1",
  },
  {
    id: "hei_negative_18m",
    label: "HEI AB negative at 18 months",
    dx: "uM0kppDX04I",
    isIndicator: false,
    khisName: "HEI: AB negative at 18 months",
    verified: true,
    domain: "1",
  },
  {
    id: "hei_art_linkage",
    label: "HEI HIV+ infants 0-9m linked to CCC",
    dx: "q8kmDg03bi3",
    isIndicator: false,
    khisName: "HEI HIV positive infants 0-9m linked to CCC",
    verified: true,
    domain: "1",
  },
  {
    id: "hei_ctx_dds",
    label: "HEI CTX/DDS started < 2 months (HV02-43)",
    dx: "OMEeGtvqlx1",
    isIndicator: false,
    khisName: "MOH 731 HEI CTX/DDS start_<2months HV02-43",
    verified: true,
    domain: "1",
  },
  {
    id: "eid_pcr_total_12m",
    label: "Initial PCR test < 12 months — Total (HV02-46)",
    dx: "R0CoqawtNCc",
    isIndicator: false,
    khisName: "MOH 731 Initial PCR Test<12mths_Total HV02-46",
    domain: "1",
  },
  {
    id: "maternal_haart_total",
    label: "On HAART at 1st ANC (MOH 731-2 HV02-14)",
    dx: "O9Wyf1FMHcM",
    isIndicator: false,
    khisName: "MOH 731_EMTCT_On HAART at 1st ANC_HV02-14",
    verified: true,
    domain: "1",
  },
  {
    id: "maternal_haart_start_anc",
    label: "Started HAART at ANC (MOH 731-2 HV02-15)",
    dx: "diGK4TSNrR5",
    isIndicator: false,
    khisName: "MOH 731_EMTCT_Start HAART_ANC_HV02-15",
    verified: true,
    domain: "1",
  },
  {
    id: "vl_suppression_pct",
    label: "Patients on ART virally suppressed (indicator)",
    dx: "E7Jf3NBcYjG",
    isIndicator: true,
    khisName: "Proportion of patients currently on ART, virally suppressed",
    domain: "1",
  },
  {
    id: "hei_eid_pct",
    label: "% HEI tested with PCR at 6-8 weeks & results available",
    dx: "hkhajO6SfQO",
    isIndicator: true,
    khisName: "% HEI tested with PCR at age 6-8 weeks and results available",
    verified: true,
    domain: "1",
  },
  {
    id: "pmtct_known_status_pct",
    label: "% PBFW who know their HIV status (PMTCT_STAT)",
    dx: "mYm3hGNDKr8",
    isIndicator: true,
    khisName: "PMTCT_Proportion of Pregnant women who know their HIV status",
    verified: true,
    domain: "1",
  },
  {
    id: "pmtct_need_met_pct",
    label: "% HIV+ PBFW identified (PMTCT coverage)",
    dx: "LlB3NWi7JZs",
    isIndicator: true,
    khisName: "PMTCT_Proportion of HIV+ PBFW identified",
    domain: "1",
  },
  {
    id: "retention_rate",
    label: "C&T ART Retention Rate",
    dx: "lcNiLGUuIHs",
    isIndicator: true,
    khisName: "C&T ART Retention Rate",
    domain: "1",
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
    label: "Neonatal deaths 0-28 days (MOH 711)",
    dx: "GAr6xu6f1n7",
    isIndicator: false,
    khisName: "MOH 711 Neonatal deaths 0-28 Days",
    verified: true,
    domain: "4",
  },
  {
    id: "neonatal_deaths_audited",
    label: "Neonatal deaths audited within 7 days (MOH 711)",
    dx: "tHRlLvvCObn",
    isIndicator: false,
    khisName: "MOH 711 Rev 2020_Neonatal deaths audited within 7 days",
    verified: true,
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
    isIndicator: false,
    khisName: "RRI_Ver_2026_Stillbirth rate",
    domain: "4",
  },
  {
    id: "moh711_live_births",
    label: "Live births (MOH 711)",
    dx: "UqKC1DJnymn",
    isIndicator: false,
    khisName: "MOH 711 Live birth",
    verified: true,
    domain: "4",
  },
];

/** Lookup helper. */
export function getKhisIndicator(id: string): KhisIndicator | undefined {
  return KHIS_INDICATORS.find((i) => i.id === id);
}

/** All dx ids (for one analytics request). */
export const ALL_DX = KHIS_INDICATORS.map((i) => i.dx).join(";");
