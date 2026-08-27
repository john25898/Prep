"use client";

import { useEffect, useMemo, useState } from "react";

export interface KhisIndicatorValue {
  id: string;
  label: string;
  domain: string;
  dx: string;
  value: number | null;
}

export interface KhisPeriodSeries {
  dx: string;
  id: string;
  series: { pe: string; peName: string; value: number | null }[];
}

export interface KhisResponse {
  partner: string;
  pe: string;
  peLabel: string;
  scope: string;
  ouCount: number;
  source: string;
  asOf: string;
  indicators: KhisIndicatorValue[];
  facilities?: { name: string; value: number | null }[];
  counties?: { name: string; value: number | null }[];
  periods?: KhisPeriodSeries[];
  reporting?: { id: string; dx: string; facilities: number }[];
}

export interface UseKhisOptions {
  partner?: string;
  pe?: string;
  indicators?: string[];
  county?: string;
  subCounty?: string;
  facility?: string;
  roster?: boolean;
  byFacility?: boolean;
  byCounty?: boolean;
  byPeriod?: boolean;
  reporting?: boolean;
  top?: number;
}

/**
 * Fetches KHIS data via the server-side proxy (/api/khis).
 * Returns { data, loading, error, value(id) }.
 */
export function useKhis(opts: UseKhisOptions = {}) {
  const [data, setData] = useState<KhisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const indicatorsKey = opts.indicators?.join(",") ?? "";

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const q = new URLSearchParams();
    if (opts.partner) q.set("partner", opts.partner);
    if (opts.pe) q.set("pe", opts.pe);
    if (indicatorsKey) q.set("indicators", indicatorsKey);
    if (opts.county) q.set("county", opts.county);
    if (opts.subCounty) q.set("subcounty", opts.subCounty);
    if (opts.facility) q.set("facility", opts.facility);
    if (opts.roster) q.set("roster", "1");
    if (opts.byFacility) q.set("byFacility", "1");
    if (opts.byCounty) q.set("byCounty", "1");
    if (opts.byPeriod) q.set("byPeriod", "1");
    if (opts.reporting) q.set("reporting", "1");
    if (opts.top) q.set("top", String(opts.top));

    fetch(`/api/khis?${q.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`KHIS proxy HTTP ${res.status}`);
        return (await res.json()) as KhisResponse;
      })
      .then((json) => setData(json))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "KHIS request failed");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    opts.partner,
    opts.pe,
    opts.county,
    opts.subCounty,
    opts.facility,
    opts.roster,
    indicatorsKey,
    opts.byFacility,
    opts.byCounty,
    opts.byPeriod,
    opts.reporting,
    opts.top,
  ]);

  const value = useMemo(
    () => (id: string) =>
      data?.indicators.find((i) => i.id === id)?.value ?? null,
    [data],
  );

  return { data, loading, error, value };
}
