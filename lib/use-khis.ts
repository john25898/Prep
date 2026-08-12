"use client";

import { useEffect, useMemo, useState } from "react";

export interface KhisIndicatorValue {
  id: string;
  label: string;
  domain: string;
  dx: string;
  value: number | null;
}

export interface KhisResponse {
  partner: string;
  pe: string;
  scope: string;
  ouCount: number;
  source: string;
  asOf: string;
  indicators: KhisIndicatorValue[];
}

export interface UseKhisOptions {
  partner?: string;
  pe?: string;
  indicators?: string[];
  county?: string;
  facility?: string;
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
    if (opts.facility) q.set("facility", opts.facility);

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
  }, [opts.partner, opts.pe, opts.county, opts.facility, indicatorsKey]);

  const value = useMemo(
    () => (id: string) =>
      data?.indicators.find((i) => i.id === id)?.value ?? null,
    [data],
  );

  return { data, loading, error, value };
}
