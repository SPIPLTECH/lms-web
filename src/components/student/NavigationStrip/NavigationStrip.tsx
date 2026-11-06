"use client";

import { QuickActionStrip } from "@/components/dashboard/QuickActionStrip";
import useStudentFeatureAccess from "@/hooks/queries/student/useStudentFeatureAccess";
import { PRIMARY_NAV_ITEMS } from "./navigationItems";

// Thin role-specific wrapper around the shared floating quick-action strip
// (layout, styling, responsiveness, and animations all live in
// QuickActionStrip so Instructor and Student render byte-identical UI).
// Submissions and Certificates drop out for an SSC Class 10-only student
// (lib/studentFeatures.js).
export function NavigationStrip({ bare }: { bare?: boolean } = {}) {
  const { showSubmissions, showCertificates } = useStudentFeatureAccess();
  const items = PRIMARY_NAV_ITEMS.filter(
    (item) =>
      (showSubmissions || item.href !== "/student/assignments") &&
      (showCertificates || item.href !== "/student/certificates")
  );
  return <QuickActionStrip items={items} ariaLabel="Student navigation" bare={bare} />;
}
