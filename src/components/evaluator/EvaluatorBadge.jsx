"use client";

import { FlaskConical } from "lucide-react";

import { formatEvaluatorDeadline } from "@/lib/evaluatorAccess";

// Header pill marking a temporary evaluator account. Renders nothing for
// anyone else — `evaluator` comes from the server's session profile.
export default function EvaluatorBadge({ evaluator }) {
  if (!evaluator) return null;

  const label = `Evaluator testing account. Access ends ${formatEvaluatorDeadline(evaluator.expiresAt)}.`;

  return (
    <span
      title={label}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-primary sm:px-2.5 sm:text-[11px]"
    >
      <FlaskConical size={12} aria-hidden="true" />
      <span className="max-[380px]:sr-only">Evaluator</span>
    </span>
  );
}
