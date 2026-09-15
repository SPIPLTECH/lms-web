"use client";

import React, { useEffect, useRef } from "react";
import { Check, AlertCircle, Loader2 } from "lucide-react";

/**
 * Horizontal chronological view of a CourseImportJob as it moves through the
 * backend lifecycle. Every step maps to a real CourseImportStatus the API can
 * return — the only client-side step is "SELECTED", which covers the moment
 * after the instructor picks a file but before anything is sent. The rendered
 * state is derived from `status` alone, so it cannot drift from the job.
 *
 * There is deliberately no percentage anywhere: the API reports a discrete
 * status, not progress, so the filled connector line is the only progress
 * signal and it comes straight from the status index.
 *
 * Note: the backend currently moves ANALYZING -> READY without ever writing
 * MAPPING. The "Prepare" step is driven by status like every other one, so it
 * simply completes without going active today, and will light up on its own if
 * the importer ever starts emitting MAPPING.
 */
export const ZIP_IMPORT_STAGES = [
  { key: "SELECTED", label: "Select package", busy: null },
  { key: "UPLOADED", label: "Upload", busy: "Sending the package to Orange Tree" },
  { key: "EXTRACTING", label: "Extract", busy: "Unpacking files from the archive" },
  { key: "ANALYZING", label: "Check structure", busy: "Reading the package contents" },
  { key: "MAPPING", label: "Prepare", busy: "Preparing the course structure" },
  { key: "READY", label: "Ready to import", busy: null },
  { key: "IMPORTING", label: "Create course", busy: "Writing the course into the LMS" },
  { key: "COMPLETED", label: "Complete", busy: null },
];

export const stageIndexOf = (status) =>
  ZIP_IMPORT_STAGES.findIndex((stage) => stage.key === status);

/** Formats a byte count for display next to the selected package. */
const formatSize = (bytes) => {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
};

/**
 * Marker for a single step. `busy` separates the two kinds of current step: one
 * where the backend is working (spinner) and one where the flow is waiting on
 * the instructor (steady dot). A spinner on a step that isn't doing anything
 * would imply progress that isn't happening.
 */
const StepMarker = ({ state, busy }) => {
  if (state === "failed") {
    return (
      <span className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
        <AlertCircle className="w-4 h-4" aria-hidden="true" />
      </span>
    );
  }

  if (state === "complete") {
    return (
      <span className="w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
        <Check className="w-4 h-4" aria-hidden="true" />
      </span>
    );
  }

  if (state === "active") {
    return (
      <span className="w-7 h-7 rounded-full border-2 border-sky-400 bg-sky-500/15 text-sky-300 flex items-center justify-center shrink-0 ring-4 ring-sky-500/15">
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-sky-400" aria-hidden="true" />
        )}
      </span>
    );
  }

  return (
    <span className="w-7 h-7 rounded-full border-2 border-muted-foreground/25 bg-transparent flex items-center justify-center shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" aria-hidden="true" />
    </span>
  );
};

export default function ZipImportTimeline({
  status,
  failedAt = null,
  fileName = null,
  fileSize = null,
  summary = null,
  errorMessage = "",
  errors = [],
}) {
  const scrollerRef = useRef(null);
  const activeStepRef = useRef(null);

  const isFailed = status === "FAILED";
  const failedIndex = isFailed ? Math.max(stageIndexOf(failedAt), 0) : -1;
  const currentIndex = isFailed ? failedIndex : stageIndexOf(status);

  const stateFor = (index) => {
    if (isFailed) {
      if (index === failedIndex) return "failed";
      return index < failedIndex ? "complete" : "pending";
    }
    // COMPLETED is terminal: the final step is finished, not in progress.
    if (status === "COMPLETED") return index <= currentIndex ? "complete" : "pending";
    if (index < currentIndex) return "complete";
    if (index === currentIndex) return "active";
    return "pending";
  };

  const activeStage = ZIP_IMPORT_STAGES[currentIndex] || null;
  const sizeLabel = formatSize(fileSize);

  // On narrow screens the stepper is the only thing that scrolls. Keep the
  // current step centred as the status advances, adjusting scrollLeft directly
  // so the page itself never moves.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const activeStep = activeStepRef.current;
    if (!scroller || !activeStep) return;
    if (scroller.scrollWidth <= scroller.clientWidth) return;

    const scrollerBox = scroller.getBoundingClientRect();
    const stepBox = activeStep.getBoundingClientRect();
    const delta =
      stepBox.left + stepBox.width / 2 - (scrollerBox.left + scrollerBox.width / 2);

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    scroller.scrollTo({
      left: scroller.scrollLeft + delta,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [currentIndex, isFailed]);

  return (
    <div>
      {/* Announce step changes without moving focus around the flow. */}
      <p className="sr-only" role="status" aria-live="polite">
        {isFailed
          ? `Import failed during ${activeStage?.label || "processing"}. ${errorMessage}`
          : `${activeStage?.label || "Working"}${activeStage?.busy ? `. ${activeStage.busy}` : ""}`}
      </p>

      {/* Only the stepper scrolls; the page keeps its own width. */}
      <div ref={scrollerRef} className="overflow-x-auto -mx-1 px-1 pb-1">
        <ol className="flex items-start">
          {ZIP_IMPORT_STAGES.map((stage, index) => {
            const state = stateFor(index);
            const isFirst = index === 0;
            const isLast = index === ZIP_IMPORT_STAGES.length - 1;

            // A connector is filled when the step before it is behind us. On a
            // failure the fill runs up to the failed marker and stops dead
            // there, so the break in the line is the interruption.
            const leftFilled = index <= currentIndex;
            const rightFilled = index < currentIndex;

            return (
              <li
                key={stage.key}
                // Scroll target on narrow screens. Nothing is "active" once the
                // run is COMPLETED, so the finished last step takes the role.
                ref={
                  state === "active" ||
                  state === "failed" ||
                  (status === "COMPLETED" && isLast)
                    ? activeStepRef
                    : null
                }
                className="flex flex-col items-center flex-1 min-w-[86px]"
              >
                <div className="flex items-center w-full">
                  <span
                    aria-hidden="true"
                    className={`h-0.5 flex-1 rounded-full ${
                      isFirst
                        ? "bg-transparent"
                        : leftFilled
                        ? "bg-sky-500/70"
                        : "bg-muted-foreground/15"
                    }`}
                  />
                  <StepMarker state={state} busy={Boolean(stage.busy)} />
                  <span
                    aria-hidden="true"
                    className={`h-0.5 flex-1 rounded-full ${
                      isLast
                        ? "bg-transparent"
                        : rightFilled
                        ? "bg-sky-500/70"
                        : "bg-muted-foreground/15"
                    }`}
                  />
                </div>

                <span
                  aria-current={state === "active" ? "step" : undefined}
                  className={`mt-2 px-1 text-[13px] leading-tight text-center ${
                    state === "pending"
                      ? "text-muted-foreground/60 font-medium"
                      : state === "failed"
                      ? "text-rose-300 font-bold"
                      : state === "active"
                      ? "text-foreground font-bold"
                      : "text-foreground/70 font-semibold"
                  }`}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Secondary detail for the current step, kept out of the stepper itself
          so the progression stays a compact single row. */}
      <div className="mt-4 space-y-2">
        {fileName && (
          <p className="text-sm text-muted-foreground truncate">
            {fileName}
            {sizeLabel ? ` · ${sizeLabel}` : ""}
          </p>
        )}

        {!isFailed && activeStage?.busy && (
          <p className="text-sm text-sky-300/90">{activeStage.busy}</p>
        )}

        {/* Failure interrupts the progression and explains itself here. */}
        {isFailed && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50">
            <p className="text-sm font-semibold text-rose-200 break-words">
              {errorMessage || "The package could not be imported."}
            </p>
            {errors.length > 0 && errors[0] !== errorMessage && (
              <ul className="mt-1.5 space-y-1 list-disc list-inside">
                {errors.slice(0, 5).map((error, i) => (
                  <li key={i} className="text-sm text-rose-300/80 break-words">
                    {error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* What the instructor is about to create. */}
        {!isFailed && status === "READY" && summary && (
          <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/50">
            {summary.title && (
              <p className="text-base font-bold text-foreground truncate">{summary.title}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
              {[
                ["module", "modules", summary.modules],
                ["lesson", "lessons", summary.lessons],
                ["quiz", "quizzes", summary.quizzes],
              ].map(([singular, plural, value]) => (
                <span key={singular} className="text-sm text-sky-200/90">
                  <span className="font-bold text-sky-100">{value}</span>{" "}
                  {value === 1 ? singular : plural}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
