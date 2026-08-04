"use client";

import { useEffect, useState } from "react";
import {
  ASSESSMENTS_CHANGED_EVENT,
  FacilityAssessment,
  loadAssessments,
} from "@/lib/assessment";

/**
 * Reactive access to saved facility assessments.
 * Re-renders whenever an assessment is saved/deleted (via localStorage event).
 */
export function useAssessments(): FacilityAssessment[] {
  const [assessments, setAssessments] = useState<FacilityAssessment[]>([]);

  useEffect(() => {
    const refresh = () => setAssessments(loadAssessments());
    refresh();
    window.addEventListener(ASSESSMENTS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(ASSESSMENTS_CHANGED_EVENT, refresh);
  }, []);

  return assessments;
}
