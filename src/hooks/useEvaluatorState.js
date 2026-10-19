import { useEffect, useState } from "react";

import { evaluatorStateAt } from "@/lib/evaluatorAccess";

// Longest delay setTimeout honours (~24.8 days); evaluator periods are 2 days.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * The evaluator's current access state (see lib/evaluatorAccess), or null for
 * a non-evaluator. Re-renders at the deadline so the screen changes to the
 * expired state on time, without a reload.
 */
export default function useEvaluatorState(evaluator) {
  const [now, setNow] = useState(() => Date.now());
  const expiresAt = evaluator?.expiresAt;

  useEffect(() => {
    if (!expiresAt) return undefined;
    // Already past (a profile loaded after the deadline): fires at once.
    const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now() + 50);
    const timer = setTimeout(() => setNow(Date.now()), Math.min(remaining, MAX_TIMEOUT_MS));
    return () => clearTimeout(timer);
  }, [expiresAt]);

  return evaluatorStateAt(evaluator, now);
}
