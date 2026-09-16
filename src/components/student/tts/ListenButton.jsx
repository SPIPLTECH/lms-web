"use client";

import { useId, useRef } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";

import useRetainFocus from "@/hooks/useRetainFocus";
import useTextToSpeech from "@/hooks/useTextToSpeech";

/**
 * A small "Listen" control for a self-contained piece of text — a quiz
 * question with its choices, a result, a reviewed answer. Tapping Listen reads
 * `getChunks()` aloud; while reading it becomes Pause/Resume plus Stop.
 * Nothing ever plays until the student taps it.
 *
 * `getChunks` is called at click time (so it reads what's on screen right
 * then, e.g. the shuffled option order) and must return sentence strings —
 * see textsToChunks() in lib/textToSpeech.js. Renders nothing in browsers
 * without speech synthesis.
 *
 * `sessionKey` identifies what's being read (e.g. the question id); when it
 * changes or this unmounts, its speech stops.
 */
export default function ListenButton({
  sessionKey,
  getChunks,
  lang = "",
  label = "Listen",
  ariaLabel = "Listen",
  className = "",
  compact = false,
}) {
  // useId keeps two copies of the same content (e.g. the result page's
  // mobile slider and desktop list) from stopping each other's session.
  const instanceId = useId();
  const speech = useTextToSpeech(sessionKey ? `${sessionKey}#${instanceId}` : null);

  const groupRef = useRef(null);
  const { isPlaying, isPaused, isEngaged, isCompleted } = speech;
  const reading = isEngaged && !isCompleted;
  useRetainFocus(groupRef, [speech.supported, reading, isPaused]);

  if (!speech.supported) return null;

  const handleListen = () => {
    const chunks = getChunks?.() || [];
    if (chunks.length) speech.start(chunks, { lang });
  };

  const baseClass =
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  const sizeClass = compact ? "h-9 min-w-9 px-2" : "h-10 sm:h-9 min-w-10 sm:min-w-9 px-2.5";

  return (
    <div ref={groupRef} className={`inline-flex items-center gap-1 ${className}`}>
      {!reading ? (
        <button
          type="button"
          onClick={handleListen}
          data-focus-primary
          aria-label={ariaLabel}
          title={ariaLabel}
          className={`${baseClass} ${sizeClass} border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted`}
        >
          <Volume2 size={15} aria-hidden="true" className="text-primary" />
          {label && <span className={compact ? "sr-only sm:not-sr-only" : ""}>{label}</span>}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={isPaused ? speech.resume : speech.pause}
            data-focus-primary
            aria-label={isPaused ? "Resume speech" : "Pause speech"}
            title={isPaused ? "Resume" : "Pause"}
            className={`${baseClass} ${sizeClass} border-primary/50 bg-primary/10 text-primary`}
          >
            {isPaused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
            <span className={compact ? "sr-only sm:not-sr-only" : ""}>{isPaused ? "Resume" : "Pause"}</span>
          </button>
          <button
            type="button"
            onClick={speech.stop}
            aria-label="Stop speech"
            title="Stop"
            className={`${baseClass} ${sizeClass} border-border bg-card text-foreground hover:bg-muted`}
          >
            <Square size={12} aria-hidden="true" />
          </button>
        </>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {isPlaying ? "Reading aloud" : isPaused ? "Paused" : ""}
      </span>
      {speech.error && (
        <span role="alert" className="text-[11px] font-medium text-destructive">
          {speech.error}
        </span>
      )}
    </div>
  );
}
