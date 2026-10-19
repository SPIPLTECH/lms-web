"use client";

import { CircleCheck } from "lucide-react";

import { EVALUATOR_MESSAGES, formatEvaluatorDeadline } from "@/lib/evaluatorAccess";

// Shown across the student pages once an evaluator's feedback is recorded:
// the confirmation, plus when the (unchanged) 2-day period ends.
export default function EvaluatorNotice({ evaluator }) {
  if (!evaluator) return null;

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground"
    >
      <CircleCheck size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <p>{EVALUATOR_MESSAGES.feedbackRecorded}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Access ends {formatEvaluatorDeadline(evaluator.expiresAt)}.
        </p>
      </div>
    </div>
  );
}
