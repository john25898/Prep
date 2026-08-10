"use client";

import { useEffect, useState } from "react";
import {
  ASSESSMENTS_CHANGED_EVENT,
  DEMO_ASSESSMENTS,
  DEMO_ASSESSMENTS_SEEDED_KEY,
  FacilityAssessment,
  STORAGE_KEY,
  loadAssessments,
  persistAssessments,
} from "@/lib/assessment";

/**
 * Reactive access to saved facility assessments.
 * Re-renders whenever an assessment is saved/deleted (via localStorage event).
 */
export function useAssessments(): FacilityAssessment[] {
  const [assessments, setAssessments] = useState<FacilityAssessment[]>([]);

  useEffect(() => {
    const refresh = () => {
      const current = loadAssessments();
      // Seed demo data on first load OR whenever the stored data is genuinely
      // missing (e.g. localStorage was partially cleared) — prevents the Home
      // page from being stuck at "0 of 0 assessments" while the seed flag is set.
      // A user deleting ALL assessments (storage key present, empty array) is
      // respected and NOT re-seeded.
      const hasStoredData = window.localStorage.getItem(STORAGE_KEY) !== null;
      if (current.length === 0 && !hasStoredData) {
        window.localStorage.setItem(DEMO_ASSESSMENTS_SEEDED_KEY, "true");
        persistAssessments(DEMO_ASSESSMENTS);
        setAssessments(DEMO_ASSESSMENTS);
        return;
      }
      setAssessments(current);
    };
    refresh();
    window.addEventListener(ASSESSMENTS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(ASSESSMENTS_CHANGED_EVENT, refresh);
  }, []);

  return assessments;
}
