"use client";

import { useEffect, useState } from "react";
import {
  ASSESSMENTS_CHANGED_EVENT,
  DEMO_ASSESSMENTS,
  DEMO_ASSESSMENTS_SEEDED_KEY,
  FacilityAssessment,
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
      if (
        current.length === 0 &&
        window.localStorage.getItem(DEMO_ASSESSMENTS_SEEDED_KEY) !== "true"
      ) {
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
