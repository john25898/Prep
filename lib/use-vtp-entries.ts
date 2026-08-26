"use client";

import { useEffect, useState } from "react";
import {
  VTP_EID_CHANGED_EVENT,
  VTP_EID_STORAGE_KEY,
  VtpEidHeiEntry,
  loadVtpEidHeiEntries,
} from "@/lib/vtp-entry";

/**
 * Reactive access to saved VTP monthly EID/HEI entries.
 * Re-renders whenever an entry is saved/deleted (via localStorage event).
 */
export function useVtpEidHeiEntries(): VtpEidHeiEntry[] {
  const [entries, setEntries] = useState<VtpEidHeiEntry[]>([]);

  useEffect(() => {
    const refresh = () => {
      const current = loadVtpEidHeiEntries();
      setEntries(current);
    };
    refresh();
    window.addEventListener(VTP_EID_CHANGED_EVENT, refresh);
    // Also refresh on storage events (other tabs).
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(VTP_EID_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return entries;
}

/** Convenience: entries filtered to a specific county + reporting month. */
export function useVtpEntriesFor(county: string, pe: string): VtpEidHeiEntry[] {
  const all = useVtpEidHeiEntries();
  return all.filter((e) => e.county === county && e.pe === pe);
}

/** Number of saved VTP EID/HEI entries (for UI badges). */
export function useVtpEntryCount(): number {
  return useVtpEidHeiEntries().length;
}
