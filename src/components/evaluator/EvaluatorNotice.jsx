"use client";

import Link from "next/link";
import { CircleCheck, FlaskConical } from "lucide-react";

import EvaluatorFeedbackButton from "@/components/evaluator/EvaluatorFeedbackButton";
import { EVALUATOR_ACCESS_PATH, EVALUATOR_MESSAGES, formatEvaluatorDeadline } from "@/lib/evaluatorAccess";

// Shown across the student pages during an evaluator's 2 days: when access
// ends and a way to give the feedback, or — once it's recorded — the
// confirmation.
export default function EvaluatorNotice({ evaluator }) {
  if (!evaluator) return null;

  const feedbackRecorded = Boolean(evaluator.feedbackCompletedAt);
  const Icon = feedbackRecorded ? CircleCheck : FlaskConical;

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p>
            {feedbackRecorded
              ? EVALUATOR_MESSAGES.feedbackRecorded
              : "You're using an evaluator testing account. When you've finished evaluating, please share your feedback on the independent feedback form."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Access ends {formatEvaluatorDeadline(evaluator.expiresAt)}.
            {!feedbackRecorded && (
              <>
                {" "}
                <Link href={EVALUATOR_ACCESS_PATH} className="font-semibold text-primary hover:underline">
                  Already submitted? Confirm it here.
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
      {!feedbackRecorded && <EvaluatorFeedbackButton />}
    </div>
  );
}
