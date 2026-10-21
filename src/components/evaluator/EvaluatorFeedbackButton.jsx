"use client";

import { MessageSquareShare } from "lucide-react";

import useAuth from "@/hooks/useAuth";

/**
 * Link to the independent evaluation feedback site (configured on the server
 * as EVALUATOR_FEEDBACK_URL), shown to evaluator accounts until their
 * feedback is recorded. Separate from
 * the LMS's own Feedback panel, which this does not touch. Renders nothing
 * when the URL is not configured, rather than a dead link.
 */
export default function EvaluatorFeedbackButton({ className = "" }) {
  const { user } = useAuth();
  const feedbackUrl = user?.evaluator?.feedbackUrl;

  // Not needed once the feedback is recorded.
  if (!feedbackUrl || user.evaluator.feedbackCompletedAt) return null;

  return (
    <a
      href={feedbackUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Opens the independent evaluation feedback site in a new tab"
      className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-primary bg-primary px-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
    >
      <MessageSquareShare size={15} aria-hidden="true" />
      <span>You Need to Give Feedback</span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
