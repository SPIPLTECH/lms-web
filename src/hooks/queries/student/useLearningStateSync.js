"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// How the playback position is written back while a video plays: at most one
// save every SAVE_MAX_WAIT_MS during continuous playback, and one shortly
// after the position stops changing (pause, end, navigation).
const SAVE_SETTLE_MS = 3000;
const SAVE_MAX_WAIT_MS = 10000;

/**
 * Where the student lands in the learning sequence on load, and the throttled
 * save of where they are.
 *
 * Restore, once, in this order:
 *   1. `openedWith.itemId` — `?item=` from the link the page was opened with,
 *      or, on a refresh, the step the page kept in this tab's history entry:
 *      the exact step the student was on (a Content id; an older link's
 *      quiz/assignment id still resolves to that item's step);
 *   2. `?lessonId=` — the first step of that lesson;
 *   3. in a course that keeps no progress (`sequence.progressTracked`
 *      false), the item saved in StudentState — where the student last was;
 *   4. the server's resume step (`sequence.resumeIndex`), the same "Continue
 *      learning" answer every other surface uses.
 * A target the student cannot open yet falls back to their current step, so
 * the first thing a student sees is never a locked item.
 *
 * The saved video position (StudentState.timestamp) is applied only when the
 * saved Content row is the restored step — it belongs to that item alone.
 *
 * @returns {{ stepIndex, setStepIndex, currentTimestamp, setCurrentTimestamp,
 *   initialTime, restoredStepIndex, stateRestored }}
 */
export default function useLearningStateSync({
  courseId,
  sequence,
  isSequenceLoading,
  stateData,
  isStateLoading,
  updateStateMutation,
  openedWith,
}) {
  const [stepIndex, setStepIndex] = useState(-1);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [initialTime, setInitialTime] = useState(0);
  const [restoredStepIndex, setRestoredStepIndex] = useState(-1);
  const [stateRestored, setStateRestored] = useState(false);

  useEffect(() => {
    if (stateRestored || isSequenceLoading || isStateLoading || !sequence) return;
    const steps = sequence.steps || [];
    if (steps.length === 0) {
      setStateRestored(true);
      return;
    }

    const { itemId, lessonId } = openedWith || {};
    let index = -1;
    if (itemId) {
      index = steps.findIndex(
        (step) => step.contentIds.includes(itemId) || step.quizId === itemId || step.assignmentId === itemId
      );
    }
    if (index === -1 && lessonId) index = steps.findIndex((step) => step.path?.lessonId === lessonId);
    const saved = stateData?.data || stateData;
    // A course that keeps no progress has no resume step (nothing is visited),
    // so it reopens where the student last was: the saved StudentState item.
    if (index === -1 && sequence.progressTracked === false && saved?.contentId) {
      index = steps.findIndex((step) => step.contentIds.includes(saved.contentId));
    }
    if (index === -1) index = sequence.resumeIndex >= 0 ? sequence.resumeIndex : 0;
    if (steps[index]?.locked) index = sequence.currentIndex >= 0 ? sequence.currentIndex : 0;

    if (saved?.contentId && steps[index]?.contentIds.includes(saved.contentId) && saved.timestamp) {
      setInitialTime(saved.timestamp);
      setCurrentTimestamp(saved.timestamp);
    }

    setStepIndex(index);
    setRestoredStepIndex(index);
    setStateRestored(true);
  }, [sequence, isSequenceLoading, isStateLoading, stateData, stateRestored, openedWith]);

  // A move to another step starts that step's media from the beginning.
  const previousIndexRef = useRef(-1);
  useEffect(() => {
    if (!stateRestored) return;
    if (previousIndexRef.current !== -1 && previousIndexRef.current !== stepIndex) {
      setCurrentTimestamp(0);
    }
    previousIndexRef.current = stepIndex;
  }, [stepIndex, stateRestored]);

  // The save a pending timer (or leaving the page) should send, and when the
  // oldest unsaved change arrived. Refs, so a timer or an unload handler
  // always sends the newest position rather than the one it was created with.
  const pendingSaveRef = useRef(null);
  const pendingSinceRef = useRef(0);
  const mutateRef = useRef(updateStateMutation.mutate);
  useEffect(() => {
    mutateRef.current = updateStateMutation.mutate;
  });

  const flushSave = useCallback(() => {
    const payload = pendingSaveRef.current;
    if (!payload) return;
    pendingSaveRef.current = null;
    pendingSinceRef.current = 0;
    // A failed save must never interrupt playback: it is retried by the next
    // one, and the mutation's own error state is all that records it.
    mutateRef.current(payload);
  }, []);

  // Save of the current step and playback position. A plain debounce is not
  // enough: a playing video changes the timestamp every second, which kept
  // pushing the save back until the student paused. This settles
  // SAVE_SETTLE_MS after the last change but never waits longer than
  // SAVE_MAX_WAIT_MS since the first unsaved one. A new step starts a fresh
  // window, so its reset-to-0 always lands before anything is sent for it.
  const step = sequence?.steps?.[stepIndex] || null;
  useEffect(() => {
    if (!stateRestored || !step) return;
    const now = Date.now();
    if (!pendingSinceRef.current || pendingSaveRef.current?.contentId !== step.contentId) {
      pendingSinceRef.current = now;
    }
    pendingSaveRef.current = {
      courseId,
      moduleId: step.path?.moduleId || null,
      lessonId: step.path?.lessonId || null,
      contentId: step.contentId,
      timestamp: currentTimestamp,
    };
    const delay = Math.min(SAVE_SETTLE_MS, Math.max(0, SAVE_MAX_WAIT_MS - (now - pendingSinceRef.current)));
    const timer = setTimeout(flushSave, delay);
    return () => clearTimeout(timer);
  }, [courseId, step?.contentId, currentTimestamp, stateRestored, flushSave]);

  // Leaving the page (tab hidden, navigation away, unmount) sends whatever is
  // still unsaved instead of dropping the last few seconds of progress.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushSave);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushSave);
      flushSave();
    };
  }, [flushSave]);

  return {
    stepIndex,
    setStepIndex,
    currentTimestamp,
    setCurrentTimestamp,
    initialTime,
    restoredStepIndex,
    stateRestored,
  };
}
