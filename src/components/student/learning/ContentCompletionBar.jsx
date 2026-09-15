"use client";

import { memo } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

/**
 * The single completion control for the Content block currently open in the
 * learning workspace — a floating chip meant to sit inside the content
 * player frame's own hover-reveal overlay (see the Prev/Next corner
 * controls in the learn page), not a persistent bar.
 *
 * `completed` and `readOnly` render nothing: once an item is done, or isn't
 * manually completable at all (a Quiz — completion is earned by passing, via
 * the backend's QuizSubmission.passed, never asserted here), there is no
 * action left to float over the player.
 *
 * VIDEO also completes automatically when it plays to the end, so the button
 * is never the *required* path for it; it stays available because an embedded
 * player that never fires `onEnded` would otherwise leave that item stuck.
 *
 * Wrapped in memo(): the learn page re-renders at video timeupdate frequency
 * (several times a second) to drive the transcript sync, and this bar sits
 * in that same tree. As long as the page passes it referentially-stable
 * props (see completionBarProps/handleMarkComplete in page.jsx), memo skips
 * re-rendering this on every one of those ticks.
 */
function ContentCompletionBar({
  completed = false,
  isPending = false,
  readOnly = false,
  onMarkComplete,
}) {
  if (completed || readOnly) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onMarkComplete}
      disabled={isPending}
      aria-busy={isPending}
      title="Mark as Complete"
      className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full border border-emerald-500/50 bg-card/90 backdrop-blur-sm shadow-md text-sm font-bold text-emerald-400 transition cursor-pointer outline-none hover:bg-emerald-500/10 hover:border-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <>
          <Loader2 size={14} className="animate-spin shrink-0" />
          Saving
        </>
      ) : (
        <>
          <CheckCircle2 size={14} className="shrink-0" />
          Mark as Complete
        </>
      )}
    </button>
  );
}

export default memo(ContentCompletionBar);
