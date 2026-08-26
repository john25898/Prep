"use client";

import { useEffect, useState } from "react";
import {
  HEI_OUTCOME_CHANGED_EVENT,
  HEI_OUTCOME_STORAGE_KEY,
  HeiOutcomeEntry,
  loadHeiOutcomes,
} from "@/lib/hei-outcome";

/**
 * Reactive access to saved HEI 18–24 outcome entries (HCA format).
 * Re-renders whenever an entry is saved/deleted (via localStorage event).
 */
export function useHeiOutcomes(): HeiOutcomeEntry[] {
  const [entries, setEntries] = useState<HeiOutcomeEntry[]>([]);

  useEffect(() => {
    const refresh = () => {
      setEntries(loadHeiOutcomes());
    };
    refresh();
    window.addEventListener(HEI_OUTCOME_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(HEI_OUTCOME_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return entries;
}
