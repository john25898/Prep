"use client";

import { useEffect, useState } from "react";
import {
  COD_CHANGED_EVENT,
  CauseOfDeathEntry,
  MPDSR_MEETING_CHANGED_EVENT,
  MpdsrMeetingEntry,
  loadCodEntries,
  loadMpdsrMeetings,
} from "@/lib/mpdsr-entry";

/**
 * Reactive access to saved MPDSR/QI meeting entries.
 * Re-renders whenever an entry is saved/deleted (via localStorage event).
 */
export function useMpdsrMeetings(): MpdsrMeetingEntry[] {
  const [entries, setEntries] = useState<MpdsrMeetingEntry[]>([]);

  useEffect(() => {
    const refresh = () => {
      setEntries(loadMpdsrMeetings());
    };
    refresh();
    window.addEventListener(MPDSR_MEETING_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(MPDSR_MEETING_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return entries;
}

/** Reactive access to saved cause-of-death entries. */
export function useCodEntries(): CauseOfDeathEntry[] {
  const [entries, setEntries] = useState<CauseOfDeathEntry[]>([]);

  useEffect(() => {
    const refresh = () => {
      setEntries(loadCodEntries());
    };
    refresh();
    window.addEventListener(COD_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(COD_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return entries;
}

/** Number of saved MPDSR meeting entries (for UI badges). */
export function useMpdsrMeetingCount(): number {
  return useMpdsrMeetings().length;
}

/** Number of saved cause-of-death entries (for UI badges). */
export function useCodEntryCount(): number {
  return useCodEntries().length;
}
