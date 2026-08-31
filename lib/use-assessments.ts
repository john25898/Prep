"use client";

import { useEffect, useState } from "react";
import {
  ASSESSMENTS_CHANGED_EVENT,
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
      // Strip any legacy demo rows that were auto-seeded before demo seeding
      // was removed, and persist the cleaned list so localStorage no longer
      // carries the seeded data.
      const cleaned = current.filter((a) => !a.id.startsWith("demo-"));
      if (cleaned.length !== current.length) persistAssessments(cleaned);
      setAssessments(cleaned);
    };
    refresh();
    window.addEventListener(ASSESSMENTS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(ASSESSMENTS_CHANGED_EVENT, refresh);
  }, []);

  return assessments;
}
