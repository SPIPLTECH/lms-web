"use client";

import { Sparkles } from "lucide-react";
import { suggestionsFor } from "../utils/conversation";

/**
 * Empty-state starters. Shown before the first message, tailored to the
 * course, active content item, and learning context.
 */
export default function AiSuggestions({
  scope,
  courseTitle,
  contentTitle,
  contentType,
  onPick,
  disabled,
}) {
  const suggestions = suggestionsFor(scope, courseTitle, contentTitle, contentType);

  return (
    <div className="flex flex-col items-center px-5 py-8 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-5 w-5" />
      </div>

      <h3 className="text-sm font-semibold text-foreground">
        {courseTitle ? `Ask about ${courseTitle}` : "Ask OTree AI"}
      </h3>
      <p className="mt-1 max-w-[34ch] text-xs text-muted-foreground">
        {courseTitle
          ? "I can explain the current lesson, summarize videos and PDFs, and help you master key concepts."
          : "I can help review your enrolled courses, summarize lessons, and guide your studies."}
      </p>

      <div className="mt-5 flex w-full flex-col gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
