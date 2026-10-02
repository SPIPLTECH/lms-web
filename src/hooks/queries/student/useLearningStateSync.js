"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Where the student lands in the learning sequence on load, and the debounced
 * save of where they are.
 *
 * Restore, once, in this order:
 *   1. `?item=` from the URL the page was opened with — the exact step the
 *      student was on (a Content id; an older link's quiz/assignment id still
 *      resolves to that item's step);
 *   2. `?lessonId=` — the first step of that lesson;
 *   3. the server's resume step (`sequence.resumeIndex`), the same "Continue
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
    if (index === -1) index = sequence.resumeIndex >= 0 ? sequence.resumeIndex : 0;
    if (steps[index]?.locked) index = sequence.currentIndex >= 0 ? sequence.currentIndex : 0;

    const saved = stateData?.data || stateData;
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

  // Debounced save of the current step and playback position.
  const step = sequence?.steps?.[stepIndex] || null;
  useEffect(() => {
    if (!stateRestored || !step) return;
    const timer = setTimeout(() => {
      updateStateMutation.mutate({
        courseId,
        moduleId: step.path?.moduleId || null,
        lessonId: step.path?.lessonId || null,
        contentId: step.contentId,
        timestamp: currentTimestamp,
      });
    }, 3000);
    return () => clearTimeout(timer);
    // updateStateMutation is stable per mount; listing it would re-arm the
    // timer on every render.
  }, [courseId, step?.contentId, currentTimestamp, stateRestored]);

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
