"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { DEFAULT_GEO_FILTER, GeoFilter } from "@/lib/geo";

interface GeoFilterContextValue {
  filter: GeoFilter;
  setFilter: (patch: Partial<GeoFilter>) => void;
  resetFilter: () => void;
}

const GeoFilterContext = createContext<GeoFilterContextValue | null>(null);

export function GeoFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilterState] = useState<GeoFilter>(DEFAULT_GEO_FILTER);

  const value = useMemo<GeoFilterContextValue>(
    () => ({
      filter,
      setFilter: (patch) =>
        setFilterState((f) => ({ ...f, ...patch })),
      resetFilter: () => setFilterState(DEFAULT_GEO_FILTER),
    }),
    [filter],
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
