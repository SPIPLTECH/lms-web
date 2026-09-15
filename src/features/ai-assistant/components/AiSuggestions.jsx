"use client";

import { Sparkles } from "lucide-react";
import { suggestionsFor } from "../utils/conversation";

/**
 * Empty-state starters. Shown only before the first message, and tailored to
 * the scope so a guest is never offered a prompt the backend would refuse.
 */
export default function AiSuggestions({ scope, courseTitle, onPick, disabled }) {
  const suggestions = suggestionsFor(scope);

  return (
    <div className="flex flex-col items-center px-5 py-8 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-5 w-5" />
      </div>

      <h3 className="text-sm font-semibold text-foreground">
        {courseTitle ? `Ask about ${courseTitle}` : "Ask the AI Assistant"}
      </h3>
      <p className="mt-1 max-w-[34ch] text-xs text-muted-foreground">
        {scope === "ENROLLED"
          ? "I can explain the material you're working through, give examples, and simplify tricky concepts."
          : scope === "BROWSING"
          ? "I can help with course discovery, structure, prerequisites, and learning recommendations."
          : "I can answer general questions about available courses and learning guidance."}
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
