"use client";

import { QuickActionStrip } from "@/components/dashboard/QuickActionStrip";
import { useProctoringConfig } from "@/hooks/queries/instructor/useProctoringConfig";
import { PRIMARY_NAV_ITEMS } from "./navigationItems";

const PROCTORING_HREF = "/admin/proctoring";

export function NavigationStrip({ bare }: { bare?: boolean } = {}) {
  // While proctoring is off this strip is exactly what it was.
  const { data: proctoring } = useProctoringConfig();
  const items = proctoring?.available ? PRIMARY_NAV_ITEMS : PRIMARY_NAV_ITEMS.filter((item) => item.href !== PROCTORING_HREF);
  return <QuickActionStrip items={items} ariaLabel="Admin navigation" bare={bare} />;
}
