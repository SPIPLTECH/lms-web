"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// How the playback position is written back while a video plays: at most one
// save every SAVE_MAX_WAIT_MS during continuous playback, and one shortly
// after the position stops changing (pause, end, navigation).
const SAVE_SETTLE_MS = 3000;
const SAVE_MAX_WAIT_MS = 10000;

// Flattens the course's modules -> lessons into the single ordered list this
// hook restores/persists against. Kept local (rather than shared with
// useLessonNavigation) so this hook stays self-contained and doesn't need
// selectedLesson/setSelectedLesson threaded in from outside just to read the
// course structure.
function flattenLessons(course) {
  const modules = course?.modules || [];
  return modules.flatMap((module) =>
    (module.lessons || []).map((lesson) => ({
      ...lesson,
      moduleId: module.id,
      duration: lesson.duration || "N/A",
    }))
  );
}

// Restores the student's place in a course on load (URL ?lessonId, then
// wherever the visited/completed Progress roll-up says to resume, then the
// first lesson) and persists it back to the DB (debounced) as the student
// watches. Owns the selectedLesson/timestamp state so restore and persist
// stay in lockstep instead of drifting apart.
//
// `resumeTarget` is resolveResumeTarget's output, computed once by the Learn
// page (it needs the same value for its own topic/content-level positioning
// afterward — see there) rather than recomputed here from raw progressData.
export default function useLearningStateSync({
  courseId,
  course,
  isLoading,
  stateData,
  isStateLoading,
  updateStateMutation,
  resumeTarget,
  isProgressLoading,
  // A ref the Learn page keeps pointed at the VIDEO content on screen (null
  // when the active block is not a video). The saved position is stored
  // against that content, so resuming lands on the video that was actually
  // being watched rather than on whatever the lesson happens to start with.
  playbackContentIdRef,
}) {
  const lessons = useMemo(() => flattenLessons(course), [course]);

  const [selectedLesson, setSelectedLesson] = useState(null);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [initialTime, setInitialTime] = useState(0);
  const [stateRestored, setStateRestored] = useState(false);
  // Playback position per content id, and the content the saved state named.
  const resumeTimesRef = useRef({});
  const [savedPositionContentId, setSavedPositionContentId] = useState(null);

  // Restore state from DB on load
  useEffect(() => {
    if (isStateLoading || isLoading || stateRestored) return;

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const queryLessonId = urlParams.get("lessonId");
      if (queryLessonId) {
        const matchedLesson = lessons.find((l) => l.id === queryLessonId);
        if (matchedLesson) {
          setSelectedLesson(matchedLesson);
          setStateRestored(true);
          return;
        }
      }
    }

    // No explicit lesson requested — wait for the Progress roll-up to settle
    // (loaded or failed) before picking a default, so a plain Continue
    // Learning visit doesn't flash Lesson 1 before snapping to the real
    // resume point a moment later. Once settled, resumeTarget (not the old
    // DB-saved lessonId) decides which lesson to land on; the DB-saved
    // timestamp is still used, but only when it's for that same lesson,
    // purely to restore video playback position within it.
    if (isProgressLoading) return;

    const matchedLesson = resumeTarget?.lessonId
      ? lessons.find((l) => l.id === resumeTarget.lessonId)
      : null;

    if (matchedLesson) {
      setSelectedLesson(matchedLesson);
      const savedState = stateData?.data || stateData;
      if (savedState?.lessonId === resumeTarget.lessonId && savedState?.timestamp) {
        setInitialTime(savedState.timestamp);
        setCurrentTimestamp(savedState.timestamp);
        if (savedState.contentId) {
          resumeTimesRef.current[savedState.contentId] = savedState.timestamp;
          setSavedPositionContentId(savedState.contentId);
        }
      }
      setStateRestored(true);
      return;
    }

    // A resolved target with no lessonId (a Module/Course-level Content or
    // Quiz) has no lesson here to select — the Learn page's own resume
    // effect (which has courseUnits/enterUnit) positions the player exactly
    // once this settles on some lesson. Same fallback when progress is
    // unavailable or the course has nothing trackable yet.
    if (!selectedLesson && lessons.length > 0) {
      setSelectedLesson(lessons[0]);
      setStateRestored(true);
    }
  }, [
    lessons,
    selectedLesson,
    stateData,
    isStateLoading,
    isLoading,
    isProgressLoading,
    resumeTarget,
    courseId,
    stateRestored,
  ]);

  useEffect(() => {
    if (stateRestored) {
      setInitialTime(0);
    }
  }, [selectedLesson, stateRestored]);

  // Content now nests under Topic (Lesson -> Topic -> Content); only the
  // first content id is needed here (it's what the saved state points at).
  const firstContentId = useMemo(() => {
    const contents = (selectedLesson?.topics || []).flatMap((topic) => topic.contents || []);
    return contents?.[0]?.id || null;
  }, [selectedLesson]);

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

  // Sync state back to DB on change. A plain debounce is not enough here: a
  // playing video changes the timestamp every second, which kept pushing the
  // save back until the student paused. This settles 3s after the last change
  // but never waits longer than SAVE_MAX_WAIT_MS since the first unsaved one.
  useEffect(() => {
    if (!selectedLesson?.id || !stateRestored) return;

    pendingSaveRef.current = {
      courseId,
      moduleId: selectedLesson.moduleId || null,
      lessonId: selectedLesson.id,
      contentId: playbackContentIdRef?.current || firstContentId,
      timestamp: currentTimestamp,
    };
    const now = Date.now();
    if (!pendingSinceRef.current) pendingSinceRef.current = now;

    const delay = Math.min(SAVE_SETTLE_MS, Math.max(0, SAVE_MAX_WAIT_MS - (now - pendingSinceRef.current)));
    const timer = setTimeout(flushSave, delay);

    return () => clearTimeout(timer);
  }, [selectedLesson, firstContentId, currentTimestamp, courseId, stateRestored, playbackContentIdRef, flushSave]);

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

  // The player's onTimeUpdate: remembers the position per video for this
  // visit (so coming back to a video resumes it) and feeds the timestamp the
  // effect above persists.
  const recordPlaybackTime = useCallback(
    (seconds) => {
      const contentId = playbackContentIdRef?.current;
      if (contentId) resumeTimesRef.current[contentId] = seconds;
      setCurrentTimestamp(seconds);
    },
    [playbackContentIdRef]
  );

  // Where a video should resume from: the position recorded for that exact
  // content, either restored from the saved state or watched in this visit.
  const getResumeTime = useCallback((contentId) => (contentId && resumeTimesRef.current[contentId]) || 0, []);

  return {
    selectedLesson,
    setSelectedLesson,
    currentTimestamp,
    setCurrentTimestamp,
    recordPlaybackTime,
    getResumeTime,
    savedPositionContentId,
    initialTime,
    stateRestored,
  };
}
