"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { DEFAULT_GEO_FILTER, GeoFilter } from "@/lib/geo";
import { resolvePe, peToLabel, isFuturePeriod } from "@/lib/period";

interface GeoFilterContextValue {
  filter: GeoFilter;
  setFilter: (patch: Partial<GeoFilter>) => void;
  resetFilter: () => void;
  /** Resolved DHIS2 period string (e.g. "202505" | "202508;202509"). */
  pe: string;
  /** Friendly period label (e.g. "May 2025" | "Aug 2025 – Sep 2025"). */
  peLabel: string;
  /** True when the resolved pe contains a month in the future — KHIS can't
   *  have data for it yet, so the dashboard must not fabricate numbers. */
  periodFuture: boolean;
}

const GeoFilterContext = createContext<GeoFilterContextValue | null>(null);

export function GeoFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilterState] = useState<GeoFilter>(DEFAULT_GEO_FILTER);

  const pe = useMemo(
    () =>
      resolvePe({
        periodMode: filter.periodMode,
        periodMonth: filter.periodMonth,
        periodStart: filter.periodStart,
        periodEnd: filter.periodEnd,
      }),
    [
      filter.periodMode,
      filter.periodMonth,
      filter.periodStart,
      filter.periodEnd,
    ],
  );
  const peLabel = useMemo(() => peToLabel(pe), [pe]);
  const periodFuture = useMemo(() => isFuturePeriod(pe), [pe]);

  const value = useMemo<GeoFilterContextValue>(
    () => ({
      filter,
      setFilter: (patch) => setFilterState((f) => ({ ...f, ...patch })),
      resetFilter: () => setFilterState(DEFAULT_GEO_FILTER),
      pe,
      peLabel,
      periodFuture,
    }),
    [filter, pe, peLabel, periodFuture],
  );

  return (
    <GeoFilterContext.Provider value={value}>
      {children}
    </GeoFilterContext.Provider>
  );
}

export function useGeoFilter(): GeoFilterContextValue {
  const ctx = useContext(GeoFilterContext);
  if (!ctx) {
    throw new Error("useGeoFilter must be used within GeoFilterProvider");
  }
  return ctx;
}
