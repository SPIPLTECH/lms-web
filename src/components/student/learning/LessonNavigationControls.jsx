"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

// Previous/Next controls, generalized over the navigation unit via
// `unitLabel` ("Topic" for the primary topic-scoped pathway, "Lesson" for
// the zero-Topic fallback) so both callers share one component instead of
// forking near-identical copies. `variant="corners"` floats over the player
// (desktop); `variant="below"` is the row under the player used below xl,
// where floating controls would sit on top of what the student is reading;
// `variant="compact"` and `variant="full"` are older layouts. Both share the same navigation rules (passed in
// via the on* callbacks) — only the layout/density differs.
export default function LessonNavigationControls({
  variant = "full",
  unitLabel = "Lesson",
  previousItem,
  nextItem,
  nextGroupTitle,
  currentTitle,
  onSelectPrevious,
  onSelectNext,
}) {
  if (variant === "corners") {
    // Floats over the content it navigates rather than sitting in its own
    // bar, so each button carries its own solid/blurred chip — legible over
    // arbitrary scrolled content (video, text, images) underneath it.
    // Identical at every width; below xl the chips are sized up to a 44px
    // touch target, which is the only difference.
    return (
      <div className="w-full flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={!previousItem}
          onClick={onSelectPrevious}
          title={`Previous ${unitLabel}`}
          aria-label={`Previous ${unitLabel}`}
          className={`pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 backdrop-blur-sm shadow-md text-foreground hover:border-primary hover:text-primary transition cursor-pointer ${
            !previousItem ? "opacity-30 cursor-not-allowed hover:border-border hover:text-foreground" : ""
          }`}
        >
          <ChevronLeft size={16} className="shrink-0" />
        </button>

        <button
          type="button"
          disabled={!nextItem}
          onClick={onSelectNext}
          title={`Next ${unitLabel}`}
          aria-label={`Next ${unitLabel}`}
          className={`pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-primary hover:bg-orange-600 shadow-md text-slate-950 transition cursor-pointer ${
            !nextItem ? "opacity-40 cursor-not-allowed bg-primary/40 text-muted-foreground" : ""
          }`}
        >
          <ChevronRight size={16} className="shrink-0" />
        </button>
      </div>
    );
  }

  if (variant === "below") {
    // The row under the player, below xl. Same handlers and the same
    // enabled/disabled rules as the corners overlay — this is a second
    // placement of one control, not a second control. Icon + text so it
    // reads as lesson navigation rather than as the document's page
    // buttons, which sit in the same stack but stay neutral-outlined while
    // Next here keeps the primary fill every other variant uses.
    return (
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={!previousItem}
          onClick={onSelectPrevious}
          aria-label="Previous content"
          title={`Previous ${unitLabel}`}
          className={`inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/90 px-3.5 py-2 min-h-[44px] text-sm font-bold text-foreground transition hover:border-primary hover:text-primary cursor-pointer ${
            !previousItem ? "opacity-30 cursor-not-allowed hover:border-border hover:text-foreground" : ""
          }`}
        >
          <ChevronLeft size={15} className="shrink-0" aria-hidden="true" />
          Previous
        </button>

        <button
          type="button"
          disabled={!nextItem}
          onClick={onSelectNext}
          aria-label="Next content"
          title={`Next ${unitLabel}`}
          className={`inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-orange-600 px-3.5 py-2 min-h-[44px] text-sm font-bold text-slate-950 transition cursor-pointer ${
            !nextItem ? "opacity-40 cursor-not-allowed bg-primary/40 text-muted-foreground" : ""
          }`}
        >
          Next
          <ChevronRight size={15} className="shrink-0" aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1.5 xl:hidden">
        <button
          type="button"
          disabled={!previousItem}
          onClick={onSelectPrevious}
          className={`relative flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-xl border border-transparent font-bold text-[12px] uppercase tracking-wide text-foreground hover:text-foreground hover:border-primary transition cursor-pointer before:content-[''] before:absolute before:-inset-y-[8px] before:inset-x-0 ${
            !previousItem ? "opacity-30 cursor-not-allowed hover:border-transparent hover:text-foreground" : ""
          }`}
        >
          <ChevronLeft size={14} />
          <span>Prev</span>
        </button>

        <button
          type="button"
          disabled={!nextItem}
          onClick={onSelectNext}
          className={`relative flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-xl bg-primary hover:bg-orange-600 font-bold text-[12px] uppercase tracking-wide text-slate-950 transition cursor-pointer before:content-[''] before:absolute before:-inset-y-[8px] before:inset-x-0 ${
            !nextItem ? "opacity-40 cursor-not-allowed bg-primary/40 text-muted-foreground" : ""
          }`}
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#0d0e16]/80 border border-[#1e2030] shadow-xl backdrop-blur-md min-w-0">
      <button
        disabled={!previousItem}
        onClick={onSelectPrevious}
        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-transparent font-extrabold text-sm text-foreground hover:text-foreground hover:border-primary transition cursor-pointer ${
          !previousItem ? "opacity-30 cursor-not-allowed hover:border-transparent text-muted-foreground" : ""
        }`}
      >
        <ChevronLeft size={16} />
        <span>Previous {unitLabel}</span>
      </button>

      <div className="text-center font-mono py-1 sm:py-0 truncate max-w-full">
        <span className="text-[12px] font-black uppercase tracking-widest text-muted-foreground block">
          Active {unitLabel} Pathway
        </span>
        <p className="text-sm font-bold text-primary truncate max-w-[200px] sm:max-w-[280px]">
          {currentTitle || `Course ${unitLabel}`}
        </p>
      </div>

      <button
        disabled={!nextItem}
        onClick={onSelectNext}
        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-primary hover:bg-orange-600 font-black text-sm text-slate-950 transition shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer ${
          !nextItem ? "opacity-40 cursor-not-allowed bg-primary/40 text-muted-foreground" : ""
        }`}
      >
        <span>
          {nextItem
            ? nextGroupTitle
              ? `Continue to ${nextGroupTitle}`
              : `Next ${unitLabel}`
            : "Course Completed 🎉"}
        </span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
