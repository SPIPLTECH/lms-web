"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, SlidersHorizontal, Square, Volume2 } from "lucide-react";

import SpeechSettings from "@/components/student/tts/SpeechSettings";
import useRetainFocus from "@/hooks/useRetainFocus";

const iconButtonClass =
  "inline-flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted hover:border-primary/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * The compact lesson read-aloud player: Listen, then Previous / Pause-Resume /
 * Next / Stop, sentence progress, and a disclosure for speed + voice.
 *
 * Purely presentational over useTextToSpeech() — `speech` is that hook's
 * return value and `onListen` starts (or restarts) the reading session.
 *
 * variant="bar" (default) is a full-width strip with its settings expanding
 * underneath. variant="inline" sits inside an existing header row (the lesson
 * title bar): no strip of its own, and speed/voice open as a dropdown below
 * the header — it anchors to the nearest positioned ancestor, so give that
 * header `position: relative` (or sticky).
 */
export default function SpeechControls({ speech, onListen, lang = "", label = "lesson", notice = "", variant = "bar", className = "" }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsId = useId();
  const regionRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const inline = variant === "inline";

  // The dropdown closes on Escape (returning focus to its button) or on a
  // click anywhere outside these controls.
  useEffect(() => {
    if (!settingsOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        settingsButtonRef.current?.focus();
      }
    };
    const onPointerDown = (event) => {
      if (inline && regionRef.current && !regionRef.current.contains(event.target)) setSettingsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [settingsOpen, inline]);

  const { isEngaged, isPlaying, isPaused, isCompleted, index, total } = speech;
  const current = total > 0 ? Math.min(index + 1, total) : 0;
  const percent = total > 0 ? (isCompleted ? 100 : Math.round((index / total) * 100)) : 0;

  // Listen, Pause/Resume and Stop replace one another; keep keyboard focus on
  // the control that takes the place of the one just pressed.
  useRetainFocus(regionRef, [isEngaged, isPaused, isCompleted]);

  const statusText = isPlaying ? "Reading aloud" : isPaused ? "Paused" : isCompleted ? "Finished reading" : "";

  return (
    <div
      ref={regionRef}
      role="region"
      aria-label={`Text to speech for this ${label}`}
      className={inline ? className : `border-b border-border bg-background px-3 sm:px-6 py-2 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {!isEngaged || isCompleted ? (
          <button
            type="button"
            onClick={onListen}
            data-focus-primary
            aria-label={isCompleted ? `Listen to ${label} again` : `Listen to ${label}`}
            title={isCompleted ? `Listen to this ${label} again` : `Read this ${label} aloud`}
            className="inline-flex h-10 sm:h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Volume2 size={16} aria-hidden="true" />
            <span>{isCompleted ? "Listen again" : "Listen"}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5" role="group" aria-label="Playback controls">
            <button
              type="button"
              onClick={speech.previous}
              disabled={index <= 0}
              aria-label="Previous sentence"
              title="Previous sentence"
              className={iconButtonClass}
            >
              <SkipBack size={15} aria-hidden="true" />
            </button>
            {isPaused ? (
              <button
                type="button"
                onClick={speech.resume}
                data-focus-primary
                aria-label="Resume speech"
                title="Resume"
                className={`${iconButtonClass} border-primary/50 text-primary`}
              >
                <Play size={16} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={speech.pause}
                data-focus-primary
                aria-label="Pause speech"
                title="Pause"
                className={`${iconButtonClass} border-primary/50 text-primary`}
              >
                <Pause size={16} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={speech.next}
              disabled={index >= total - 1}
              aria-label="Next sentence"
              title="Next sentence"
              className={iconButtonClass}
            >
              <SkipForward size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={speech.stop}
              aria-label="Stop speech"
              title="Stop"
              className={iconButtonClass}
            >
              <Square size={13} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Progress — sentence N of M plus a thin bar. Kept out of the live
            region so a screen reader isn't interrupted on every sentence. */}
        {isEngaged && total > 0 && (
          <div className={`flex items-center gap-2 ${inline ? "w-24 sm:w-32" : "min-w-[4.5rem] flex-1 sm:max-w-xs"}`}>
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Reading progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-valuetext={`Sentence ${current} of ${total}`}
            >
              <span className="block h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-xs font-semibold tabular-nums text-muted-foreground whitespace-nowrap">
              {current} / {total}
            </span>
          </div>
        )}

        {!isEngaged && (
          <span className={`hidden text-xs text-muted-foreground ${inline ? "lg:inline" : "sm:inline"}`}>Read this {label} aloud</span>
        )}

        <button
          type="button"
          ref={settingsButtonRef}
          onClick={() => setSettingsOpen((open) => !open)}
          aria-expanded={settingsOpen}
          aria-controls={settingsId}
          aria-label="Speech settings"
          title="Speed and voice"
          className={`${iconButtonClass} ${inline ? "" : "ml-auto"} ${settingsOpen ? "border-primary/50 text-primary" : ""}`}
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
        </button>
      </div>

      <div
        id={settingsId}
        hidden={!settingsOpen}
        className={
          inline
            ? "absolute left-3 right-3 top-full z-30 mt-1 rounded-xl border border-border bg-popover p-3 shadow-xl sm:left-auto sm:right-4 sm:w-[26rem]"
            : "pt-2"
        }
      >
        {settingsOpen && <SpeechSettings speech={speech} lang={lang} />}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {statusText}
      </p>
      {notice && !isEngaged && (
        <p role="status" className={inline ? "basis-full text-xs text-muted-foreground" : "pt-1.5 text-xs text-muted-foreground"}>
          {notice}
        </p>
      )}
      {speech.error && isEngaged === false && (
        <p role="alert" className={inline ? "basis-full text-xs font-medium text-destructive" : "pt-1.5 text-xs font-medium text-destructive"}>
          {speech.error}
        </p>
      )}
    </div>
  );
}
