"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ListTree, X } from "lucide-react";

import LessonContentBlock from "@/components/student/learning/LessonContentBlock";
import ContentCompletionBar from "@/components/student/learning/ContentCompletionBar";
import AssignmentWorkspacePanel from "@/components/student/learning/AssignmentWorkspacePanel";
import LessonOverviewPanel from "@/components/student/learning/LessonOverviewPanel";
import LessonResourcesPanel from "@/components/student/learning/LessonResourcesPanel";
import LessonQuizPanel from "@/components/student/learning/LessonQuizPanel";
import QuizExperience from "@/components/student/attempt/QuizExperience";
import LearnSidePanel from "@/components/student/learning/LearnSidePanel";
import LessonNavigationControls from "@/components/student/learning/LessonNavigationControls";
import LearnPageHeader from "@/components/student/learning/LearnPageHeader";
import { rendersUploadedDeck } from "@/components/student/learning/VideoPlayer";

import { groupLessonContentForDocumentView } from "@/lib/contentDocument";
import { buildCourseUnits, findUnitContaining } from "@/lib/courseUnits";
import { CourseStructureSidebar } from "@/components/instructor/courses/CourseComposerSidebar";
import { normalizeCourseHierarchy } from "@/lib/courseMapper";
import { buildProgressIndex, decorateCourseWithProgress, isItemComplete, isItemSubmitted, isNodeLeavable, getNodeProgress } from "@/lib/progressIndex";
import { resolveResumeTarget } from "@/lib/resumeTarget";

import {
  useCourse,
  useStudentState,
  useUpdateStudentState,
  useCourseProgress,
  useCompleteContent,
  useMarkVisited,
} from "@/hooks/queries/student";
import useMyCourses from "@/hooks/queries/student/useMyCourses";
import useTrackCourseAccess from "@/hooks/queries/student/useTrackCourseAccess";
import useLearningStateSync from "@/hooks/queries/student/useLearningStateSync";
import useLessonNavigation from "@/hooks/queries/student/useLessonNavigation";
import useTopicNavigation from "@/hooks/queries/student/useTopicNavigation";

import Loader from "@/components/common/Loader";
import Card from "@/components/ui/Card";
import { ChatWidget } from "@/components/chat";


import { useToast } from "@/components/ui/ToastProvider";

/**
 * The real Content row ids behind one displayed block.
 *
 * Blocks coming through groupLessonContentForDocumentView carry `contentIds`
 * (a merged HTML document stands for several rows); a block picked straight
 * off the course tree — a Course- or Module-direct item chosen in the sidebar,
 * which never goes through that grouping — carries only its own id. Progress
 * is keyed on these ids, so this is what both the completion request and the
 * completion lookup must use, never the block's display identity.
 */
function contentIdsOf(item) {
  if (!item) return [];
  const ids = Array.isArray(item.contentIds) && item.contentIds.length > 0 ? item.contentIds : [item.id];
  return ids.filter(Boolean);
}

export default function LearnPage() {
  const { courseId } = useParams();
  const router = useRouter();

  const { data: rawCourseData, isLoading, isError } = useCourse(courseId);
  const course = useMemo(() => normalizeCourseHierarchy(rawCourseData) || {}, [rawCourseData]);

  // Same enrollment gate as /student/courses/[courseId] — this is the actual
  // lesson content, not just an overview, so it's the more important of the
  // two to close. A non-enrolled student who reaches this URL directly is
  // sent to the public course page instead of the player.
  const { data: myEnrollments, isLoading: isEnrollmentsLoading } = useMyCourses();
  const isEnrolled = (myEnrollments || []).some((e) => (e.courseId || e.course?.id) === courseId);

  useEffect(() => {
    if (!isEnrollmentsLoading && !isEnrolled) {
      router.replace(`/courses/${courseId}`);
    }
  }, [isEnrollmentsLoading, isEnrolled, courseId, router]);
  // Progress is advisory to this page: the player must stay fully usable when
  // the roll-up is unavailable, so a failed/pending progress query degrades to
  // "no indicators" rather than blocking or erroring the learning experience.
  const {
    data: progressData,
    isLoading: isProgressLoading,
    isError: isProgressError,
  } = useCourseProgress(courseId);
  const completeContentMutation = useCompleteContent();
  const markVisitedMutation = useMarkVisited();

  // Single flattened view of the backend roll-up. Null while loading or on
  // failure — every consumer below treats null as "don't render indicators".
  const progressIndex = useMemo(() => buildProgressIndex(progressData), [progressData]);

  // A same-tick-current mirror of progressIndex, for gate checks that run
  // inside an already-executing closure (handleVideoEnded, event handlers
  // captured at an earlier render) rather than during render itself. A plain
  // read of the `progressIndex` closure variable there would see whatever
  // was current when THAT closure was created — never anything newer,
  // because a re-render creates a new closure but cannot reach back into one
  // that's already running. canLeaveBlock/canLeaveUnit read this ref instead
  // so a gate check always sees the latest known progress, however stale the
  // handler instance itself is. Anything used for on-screen display should
  // keep reading `progressIndex` (the render-time value) instead — this ref
  // is only for "is it actually safe to proceed" checks.
  const progressIndexRef = useRef(progressIndex);
  useEffect(() => {
    progressIndexRef.current = progressIndex;
  }, [progressIndex]);

  // activeCompletionRef carries the current active-block completion state
  // into handleMarkComplete below without making it a dependency (it's kept
  // current by a plain assignment further down, where activeContentIds/
  // activeContentCompleted are actually computed); markCompletePendingRef is
  // its synchronous double-click guard. Declared here, and handleMarkComplete
  // itself defined here too, because this sits before the loading/error early
  // returns below — React requires every hook (useCallback included) to run
  // on every render, so it cannot be declared only in the branch that has
  // activeContentIds/activeContentCompleted already computed.
  const activeCompletionRef = useRef({ contentIds: [], completed: false });
  const markCompletePendingRef = useRef(false);
  const { showToast } = useToast();

  const handleMarkComplete = useCallback(() => {
    const { contentIds, completed } = activeCompletionRef.current;
    // markCompletePendingRef is a synchronous guard: the mutation's own
    // isPending flag only becomes true once React re-renders after the
    // first mutate() call commits, and a fast double click can fire both
    // clicks before that happens. This ref is set/cleared immediately, in
    // the same tick, so a same-tick double click still resolves to exactly
    // one request (Test 5 in the task spec).
    if (markCompletePendingRef.current || completed || contentIds.length === 0) return;

    markCompletePendingRef.current = true;
    completeContentMutation.mutate(
      { contentIds, completed: true },
      {
        // No optimistic write: the item flips to Completed only once
        // useCompleteContent's onSuccess has written the confirmed state
        // (from the backend's own response) into the cache.
        onSettled: () => {
          markCompletePendingRef.current = false;
        },
        onError: () => showToast("Could not mark this item complete. Please try again.", "error"),
      }
    );
  }, [completeContentMutation, showToast]);

  // Where Continue Learning (or any plain visit with no explicit ?lessonId=)
  // should land — see resolveResumeTarget. useLearningStateSync below uses
  // its lessonId to settle selectedLesson; the resume effect further down
  // (after courseUnits/jumpToBlock/enterUnit exist) uses the rest of it to
  // land on the exact Topic/Content/Quiz once that lesson is on screen.
  const resumeTarget = useMemo(() => resolveResumeTarget(progressData), [progressData]);

  // The position asked for by the URL this page was OPENED with, captured once
  // at first render. It must be read here and not later: the effect that
  // mirrors the current block into `?item=` starts writing as soon as the
  // player settles on its default block, which happens BEFORE the restore
  // effect runs — reading the live URL down there would read back that
  // default and restore the student to it instead of where they actually were.
  const openedWithRef = useRef(null);
  if (openedWithRef.current === null) {
    const search = typeof window === "undefined" ? "" : window.location.search;
    const opened = new URLSearchParams(search);
    openedWithRef.current = {
      itemId: opened.get("item"),
      lessonId: opened.get("lessonId"),
    };
  }

  // The same course tree the player renders from, decorated with the backend's
  // completion flags so the sidebar, the accordion and the quiz panel all agree.
  const courseWithProgress = useMemo(
    () => decorateCourseWithProgress(course, progressIndex) || course,
    [course, progressIndex]
  );

  const { data: stateData, isLoading: isStateLoading } = useStudentState(courseId);
  const updateStateMutation = useUpdateStudentState();

  // Course Content Sidebar toggle state — open by default so the Course
  // Index is what a student sees on first arriving at a lesson.
  const [courseSidebarOpen, setCourseSidebarOpen] = useState(true);
  // Below xl the course map is a temporary sheet, so it starts closed.
  const [courseMapOpen, setCourseMapOpen] = useState(false);

  // Right-hand utility column (Ask Instructor / Sticky Notes / Feedback)
  // collapse state — desktop only, mirrors the left Course Map sidebar's
  // collapse behavior. Closed by default to match the Course Index being
  // open on first arrival (avoids both wide panels competing for space).
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  // Which section of that panel is expanded (LearnSidePanel shows one at a
  // time; null collapses all). Desktop-only, like the panel itself.
  const [sidePanelFeature, setSidePanelFeature] = useState("notes");

  const videoPlayerRef = useRef(null);

  // Resume-where-you-left-off (URL ?lessonId / DB-saved state / first-lesson
  // fallback) + debounced persistence of playback position back to the DB.
  const {
    selectedLesson,
    setSelectedLesson,
    currentTimestamp,
    setCurrentTimestamp,
    initialTime,
    stateRestored,
  } = useLearningStateSync({
    courseId,
    course,
    isLoading,
    stateData,
    isStateLoading,
    updateStateMutation,
    resumeTarget,
    isProgressLoading,
  });

  // Lesson list, plus the single entry point (selectLesson) every navigation
  // control below routes through. previousLesson/nextLesson aren't used for
  // Prev/Next crossing any more — courseUnits below now owns "what's
  // adjacent" for the whole course, zero-Topic Lessons included.
  const {
    lessons,
    selectLesson,
  } = useLessonNavigation(course, selectedLesson, setSelectedLesson);

  const [selectedTopicId, setSelectedTopicId] = useState(null);

  // Whether the current lesson uses the topic-scoped pathway at all — a
  // legacy/edge-case lesson with zero Topics falls back to the old
  // lesson-wide bar and content flatten further down instead.
  const hasTopics = (selectedLesson?.topics?.length ?? 0) > 0;

  // Picking a lesson or topic in the drawer should reveal it, not leave the
  // sheet covering what was just chosen.
  useEffect(() => {
    setCourseMapOpen(false);
  }, [selectedLesson?.id, selectedTopicId]);

  // Escape closes the off-canvas course map, the same as its X and its scrim.
  // Bound only while it is open, so nothing listens on the desktop layout.
  useEffect(() => {
    if (!courseMapOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setCourseMapOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [courseMapOpen]);

  // previousTopic/nextTopic/selectTopic aren't used for Prev/Next crossing
  // any more — courseUnits below now owns "what's adjacent" for the whole
  // course, Topics included. currentTopic is still read for display
  // (topicTitle in the header) and for the current Topic's own completion
  // gate id.
  const { currentTopic } = useTopicNavigation(
    course,
    selectedLesson,
    selectedTopicId,
    setSelectedLesson,
    setSelectedTopicId,
    lessons
  );

  // Whenever the selected Lesson changes to one whose Topics don't include
  // the currently selected Topic, default to that Lesson's first Topic.
  // Deliberately keyed only on selectedLesson?.id: when selectTopic crosses
  // a Lesson boundary it sets selectedLesson and selectedTopicId together in
  // the same handler (batched into one render), so by the time this effect
  // runs, selectedTopicId already belongs to the new selectedLesson and this
  // is a no-op — it only fires the reset for lesson-level navigation
  // (sidebar lesson/module clicks, resume-from-URL/DB, zero-topic Next/Prev
  // Lesson) that never touched selectedTopicId itself.
  useEffect(() => {
    if (!selectedLesson) return;
    const topicsOfLesson = selectedLesson.topics || [];
    const stillValid = topicsOfLesson.some((t) => t.id === selectedTopicId);
    if (!stillValid) {
      setSelectedTopicId(topicsOfLesson[0]?.id || null);
    }
  }, [selectedLesson?.id]);

  // A content-unit switch (a different Topic, or a different zero-Topic
  // Lesson) mounts a different (or no) video — the previous unit's
  // playback position must not leak into the newly-selected unit's Sticky
  // Notes timestamps or the debounced state-sync write. Must NOT fire
  // while the very first unit is still settling (Lesson restored but its
  // first Topic hasn't been auto-selected yet), so a just-restored resume
  // position survives.
  //
  // Keyed on BOTH selectedLesson and selectedTopicId together, not
  // selectedTopicId alone — a zero-Topic Lesson always reports
  // selectedTopicId as null, so a null-only signal can't tell "still
  // settling the very first unit" apart from "genuinely on a zero-Topic
  // Lesson" apart from "genuinely on a *different* zero-Topic Lesson than
  // last time." Three prior fix rounds each patched a selectedTopicId-only
  // signal and each left one of those cases wrong — round 1 (unconditional
  // reset) broke initial settle, round 2 (previous-value sentinel) missed
  // a real-Topic -> zero-Topic-Lesson -> real-Topic sequence, round 3
  // (monotonic attributed flag) missed real-Topic -> zero-Topic-Lesson
  // directly (the guard's `selectedTopicId === null` early return skipped
  // the reset on entry into a zero-Topic Lesson, not just before settle).
  // A composite lesson+topic key sidesteps all three: "settling" is
  // defined once (Lesson present, and either it has no Topics or its
  // first Topic hasn't landed yet) rather than re-derived from a sentinel
  // that means different things at different points in the transition.
  const hasSettledInitialUnitRef = useRef(false);
  const previousUnitKeyRef = useRef(null);

  // The content player shows one block (video/document/quiz/etc.) at a time
  // within the current unit — goToPreviousBlock/goToNextBlock below step
  // through blockIndex before falling through to goToPreviousUnit/
  // goToNextUnit. landOnLastBlockRef signals that a just-triggered unit
  // change came from Prev at block 0 (not sidebar navigation or Next), so
  // the reset below should land on the new unit's LAST block instead of its
  // first — set only when there genuinely is a previous unit to land in, so
  // it can never leak into an unrelated later unit change.
  const [blockIndex, setBlockIndex] = useState(0);
  const landOnLastBlockRef = useRef(false);
  // Set by a sidebar click on a specific content/quiz row that also crosses
  // a unit boundary (a different Topic/Lesson than the one on screen) — the
  // reset below lands directly on that row's block instead of block 0, once
  // playerBlocks has been recomputed for the newly-selected unit.
  const pendingBlockTargetIdRef = useRef(null);

  useEffect(() => {
    if (!selectedLesson) return;
    const stillWaitingForFirstTopic = hasTopics && selectedTopicId === null;
    if (stillWaitingForFirstTopic) return;

    const unitKey = `${selectedLesson.id}::${selectedTopicId ?? ""}`;
    if (!hasSettledInitialUnitRef.current) {
      hasSettledInitialUnitRef.current = true;
      previousUnitKeyRef.current = unitKey;
      return;
    }
    if (unitKey !== previousUnitKeyRef.current) {
      setCurrentTimestamp(0);
      if (landOnLastBlockRef.current) {
        landOnLastBlockRef.current = false;
        setBlockIndex(Math.max(0, playerBlocks.length - 1));
      } else if (pendingBlockTargetIdRef.current) {
        const targetId = pendingBlockTargetIdRef.current;
        pendingBlockTargetIdRef.current = null;
        const idx = playerBlocks.findIndex(
          (b) => b.item.id === targetId || b.item.contentIds?.includes(targetId)
        );
        setBlockIndex(idx >= 0 ? idx : 0);
      } else {
        setBlockIndex(0);
      }
      previousUnitKeyRef.current = unitKey;
    }
  }, [selectedLesson?.id, selectedTopicId, hasTopics]);

  const [, setVideoDuration] = useState(0);

  // Which non-Topic/-Lesson unit (Course-direct content/quiz, a Module's own
  // direct content/quiz, or a Lesson's own quiz when that Lesson also has
  // Topics) the player is showing, if any — see courseUnits below for the
  // full whole-course sequence this participates in. `blockIndex` here is
  // this unit's own local position, kept separate from the Topic/Lesson
  // pathway's `blockIndex` state below so the two never fight over the same
  // counter. Any normal Lesson/Topic/Module sidebar pick clears it.
  const [extraUnit, setExtraUnit] = useState(null); // { key, blockIndex } | null

  // An Assignment row opened from the Course Map. Assignments aren't steps in
  // the Prev/Next sequence, so one is shown over the current position until
  // the student navigates anywhere else. (Replaces the removed manualOverride
  // state that openItem still called, which threw on every such tap.)
  const [openAssignmentItem, setOpenAssignmentItem] = useState(null);


  // Auto-advance one block once a video finishes playing — same step Next
  // takes, so a video followed by another block in the same Topic doesn't
  // get skipped straight to the next Topic. Defined further down (after
  // documentGroupedContents); safe to reference here since this is only
  // ever called later, as the video's onEnded callback.
  const handleVideoEnded = async () => {
    // Mark the block that actually just finished — not "the first VIDEO in the
    // lesson", which marks the wrong row whenever a lesson holds more than one.
    // Quiz blocks complete through their own submission flow, never here.
    const finished = activeBlock;
    if (finished?.kind === "content" && finished.item?.id) {
      try {
        // contentIds (not the block's representative id) so a merged document
        // block marks every underlying Content row — see useCompleteContent.
        const result = await completeContentMutation.mutateAsync({
          contentIds: contentIdsOf(finished.item),
          completed: true,
        });
        // goToNextBlock() below can fall through into goToNextUnit's
        // completion gate (canLeaveBlock/canLeaveUnit), which must see this
        // completion to avoid wrongly blocking a student who just finished
        // the last item in the unit. Those gates read progressIndexRef, so
        // updating it here — synchronously, from the response this mutation
        // already returned — is enough; no separate refetch (and no second
        // server-side rollup) is needed just to get the same data again.
        if (result?.courseProgress?.hierarchy) {
          progressIndexRef.current = buildProgressIndex(result.courseProgress);
        }
      } catch {
        // Completion write failed — fall through and let the gate re-check
        // with whatever progress data is actually available rather than
        // stranding the student on a video that already finished playing.
      }
    }
    goToNextBlock();
  };


  const trackAccessMutation = useTrackCourseAccess();
  // Track course access whenever the student enters the course or navigates between lessons, topics, or content blocks
  useEffect(() => {
    if (courseId) {
      trackAccessMutation.mutate(courseId);
    }
  }, [courseId, selectedLesson?.id, selectedTopicId, blockIndex]);

  // Content nests under Topic for legacy/imported lessons, but the current
  // (Composer v2) authoring path attaches Content directly to the Lesson
  // and drops Topics entirely — `lesson.contents` from the API, not
  // `lesson.topics[].contents`. Prefer the Topic path when it has anything
  // (the common case today); fall back to the Lesson's own `contents`
  // otherwise, so a Composer v2 lesson isn't simply empty on this side.
  const selectedLessonContents = useMemo(() => {
    return selectedLesson?.contents || [];
  }, [selectedLesson]);

  // The primary content pane (video + document blocks) shows only the
  // currently selected Topic's contents, not the whole Lesson's — that's
  // the point of Topic-scoped navigation. A zero-Topic lesson has no Topic
  // to scope to, so it falls back to the Lesson-wide list above unchanged.
  const selectedTopicContents = useMemo(() => {
    if (!hasTopics) return selectedLessonContents;
    const effectiveTopicId = selectedTopicId ?? selectedLesson?.topics?.[0]?.id;
    const topic = (selectedLesson?.topics || []).find((t) => t.id === effectiveTopicId);
    return topic?.contents || [];
  }, [selectedLesson, selectedTopicId, hasTopics, selectedLessonContents]);

  // Imported courses store each markdown block (heading/paragraph/table/...)
  // as its own HTML content row — dozens per lesson/topic. Merge consecutive
  // HTML rows into one flowing document item instead of showing (or
  // dropping) one generic card per block; every other content type is
  // untouched.
  const documentGroupedContents = useMemo(
    () => groupLessonContentForDocumentView(selectedTopicContents),
    [selectedTopicContents]
  );

  // Quizzes attached to the current scope (the active Topic when the Lesson
  // uses Topics, the Lesson itself otherwise) — the instructor Composer
  // sidebar merges a quiz into its siblings' content order rather than
  // showing it in a separate section, so the player does the same: a quiz
  // takes its real position among the blocks around it.
  const activeQuizzes = useMemo(() => {
    if (hasTopics) {
      const effectiveTopicId = selectedTopicId ?? selectedLesson?.topics?.[0]?.id;
      const topic = (selectedLesson?.topics || []).find((t) => t.id === effectiveTopicId);
      return topic?.quizzes || [];
    }
    return selectedLesson?.quizzes || [];
  }, [selectedLesson, selectedTopicId, hasTopics]);

  // The full one-at-a-time sequence the player steps through for the
  // Topic/Lesson pathway — content blocks and this scope's quizzes merged
  // and order-sorted, mirroring ParentContentRows' own merge in the
  // instructor sidebar (ties broken content-first, since ties are only
  // possible via manual reordering). A Course/Module-level unit's blocks
  // come straight from courseUnits below instead.
  const playerBlocks = useMemo(() => {
    const contentBlocks = documentGroupedContents.map((item) => ({ kind: "content", item }));
    const quizBlocks = activeQuizzes.map((quiz) => ({ kind: "quiz", item: quiz }));
    return [...contentBlocks, ...quizBlocks].sort((a, b) => {
      const orderDiff = (a.item.order ?? 0) - (b.item.order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.kind === b.kind ? 0 : a.kind === "content" ? -1 : 1;
    });
  }, [documentGroupedContents, activeQuizzes]);

  // ---- Whole-course Prev/Next sequence -------------------------------------
  // Every stop the player can land on, in the same order the Course Map
  // lists them — see lib/courseUnits.js. Topic and zero-Topic-Lesson entries
  // are `placeholder: true`: their real blocks still come from
  // documentGroupedContents/activeQuizzes above, driven by the existing
  // selectedLesson/selectedTopicId state; this array only needs to know
  // they exist, in order, so crossing past them into a Course/Module/Lesson-
  // level unit (and back) works.
  const courseUnits = useMemo(() => buildCourseUnits(course), [course]);

  // Where the placeholder (Topic / zero-Topic-Lesson) pathway currently is,
  // as a courseUnits key — used only to find this position's neighbors for
  // crossing purposes; the pathway's own state (selectedLesson/
  // selectedTopicId) still drives everything it actually renders.
  const placeholderUnitKey = hasTopics ? `topic:${currentTopic?.id}` : `lesson:${selectedLesson?.id}`;
  const currentUnitKey = extraUnit?.key ?? placeholderUnitKey;
  const currentUnitIndex = courseUnits.findIndex((u) => u.key === currentUnitKey);
  const activeExtraUnitDef = extraUnit ? courseUnits.find((u) => u.key === extraUnit.key) || null : null;

  // What the player is actually stepping through right now: an extra unit's
  // own blocks when one is active, otherwise the Topic/Lesson pathway's.
  const activeUnitBlocks = extraUnit ? (activeExtraUnitDef?.blocks || []) : playerBlocks;

  // A node the backend has no completion data for yet (progress still
  // loading/unavailable) never blocks advancement — only a confirmed
  // "not complete" from the roll-up does, matching the advisory-progress
  // principle above. A node with no trackable items of its own
  // (`applicable === false`, e.g. an empty topic) can never actually
  // become `completed` in the roll-up, so it can't block either — mirrors
  // progressRollup.js's own rule that empty containers don't block their
  // parent's completion.
  const canLeaveUnit = (nodeId) => isNodeLeavable(progressIndexRef.current, nodeId);

  const GATE_MESSAGES = {
    topicId: "Complete every item in this topic and submit its quiz before moving to the next topic.",
    lessonId: "Complete every topic and lesson-level item in this lesson before moving to the next lesson.",
    moduleId: "Complete every lesson and module-level item in this module before moving to the next module.",
  };

  // Generalizes the single-boundary check goToNextUnit does (below) to an
  // arbitrary sidebar jump: walks every boundary strictly before the target
  // courseUnits entry, finest-scope-first per boundary, so a direct click on
  // (say) Module 3 while Module 1 is still incomplete is blocked exactly
  // like stepping there one Next at a time would be — same canLeaveUnit/
  // GATE_MESSAGES, just applied cumulatively instead of to one neighbor.
  // A target that's already reachable (everything before it is done, which
  // is always true for anything at or behind wherever the student already
  // is) returns null, so this never blocks reviewing earlier material.
  const findBlockingGate = (targetUnitKey) => {
    const targetIndex = courseUnits.findIndex((u) => u.key === targetUnitKey);
    if (targetIndex <= 0) return null;

    for (let i = 0; i < targetIndex; i++) {
      const current = courseUnits[i];
      const next = courseUnits[i + 1];
      for (const level of ["topicId", "lessonId", "moduleId"]) {
        const currentId = current.scope[level];
        if (!currentId || currentId === next.scope[level]) continue;
        if (!canLeaveUnit(currentId)) {
          return GATE_MESSAGES[level];
        }
      }
    }
    return null;
  };

  // The courseUnits entry a sidebar click on a whole Module/Lesson row
  // (rather than one specific item inside it) actually lands on, matching
  // what onSelectModule/onSelectLesson below (and the reset effect they
  // trigger) actually navigate to — a Lesson with Topics always lands on
  // its first Topic, even for a legacy Lesson that also has its own
  // lesson-content unit ahead of that Topic in course order.
  const firstUnitKeyFor = ({ moduleId = null, lessonId = null } = {}) => {
    if (lessonId) {
      const firstTopicId = lessons.find((l) => l.id === lessonId)?.topics?.[0]?.id;
      if (firstTopicId) return `topic:${firstTopicId}`;
    }
    const match = courseUnits.find(
      (u) =>
        (!moduleId || u.scope.moduleId === moduleId) &&
        (!lessonId || u.scope.lessonId === lessonId)
    );
    return match?.key ?? null;
  };

  // Runs a sidebar navigation action only if its target isn't gated —
  // shared by every sidebar entry point below so the toast + early-return
  // shape is written once.
  //
  // Returns whether the action actually ran: false means the gate blocked it
  // and nothing moved. The decision itself is unchanged — this only reports
  // it, so callers (the Course Map handlers) can tell a real navigation from
  // a blocked tap instead of guessing from state changes.
  const runGated = (targetUnitKey, action) => {
    const blockingMessage = findBlockingGate(targetUnitKey);
    if (blockingMessage) {
      showToast(blockingMessage, "error");
      return false;
    }
    action();
    return true;
  };

  // One level finer than canLeaveUnit above: whether the single block
  // currently on screen can be left for the next block in the SAME unit.
  // A Quiz only needs an attempt on file here — passing is what canLeaveUnit
  // requires to leave the unit entirely, not what's required to keep moving
  // through the unit's own remaining blocks. Assignment blocks never occur
  // in this sequence today (opening one goes through a separate, currently
  // broken, standalone path), so there is nothing to gate for that kind yet.
  const canLeaveBlock = (block) => {
    const index = progressIndexRef.current;
    if (!block || !index) return true;
    if (block.kind === "content") {
      const ids = contentIdsOf(block.item);
      return ids.length === 0 || ids.every((id) => isItemComplete(index, id));
    }
    if (block.kind === "quiz") {
      return isItemSubmitted(index, block.item?.id);
    }
    return true;
  };

  const BLOCK_GATE_MESSAGES = {
    content: "Finish this content before moving to the next item.",
    quiz: "Submit this quiz before moving to the next item.",
  };

  // Lands the player on a given courseUnits entry. A Topic or zero-Topic
  // Lesson hands off to the existing selectedLesson/selectedTopicId pathway
  // (unchanged — still owns rendering + resume/sidebar/Sticky-Notes sync for
  // those); anything else (Course-direct, a Module's own content/quiz, or a
  // Lesson's own quiz) becomes the active extra unit. `atEnd` lands on the
  // unit's last block (Prev) instead of its first; `targetItemId` (a sidebar
  // click) lands on that specific item's block.
  // Returns whether the player actually moved: false for an unresolvable unit
  // (findUnitContaining found nothing) and for a gated one. Same reporting-only
  // addition as runGated above — no change to what is or isn't allowed.
  const enterUnit = (unit, { atEnd = false, targetItemId = null, skipGate = false } = {}) => {
    if (!unit) return false;

    // skipGate is for goToPreviousUnit only — going back must always work,
    // never re-litigated against completion state (see the comment there).
    if (!skipGate) {
      const blockingMessage = findBlockingGate(unit.key);
      if (blockingMessage) {
        showToast(blockingMessage, "error");
        return false;
      }
    }

    setOpenAssignmentItem(null);
    const resolvedIndex = targetItemId
      ? Math.max(
          0,
          (unit.blocks || []).findIndex(
            (b) => b.item.id === targetItemId || b.item.contentIds?.includes(targetItemId)
          )
        )
      : atEnd
      ? Math.max(0, (unit.blocks?.length || 1) - 1)
      : 0;

    if (unit.placeholder) {
      setExtraUnit(null);
      if (unit.scope.lessonId && unit.scope.lessonId !== selectedLesson?.id) {
        const lessonMatch = lessons.find((l) => l.id === unit.scope.lessonId);
        if (lessonMatch) selectLesson(lessonMatch);
      }
      setSelectedTopicId(unit.scope.topicId || null);
      if (atEnd) landOnLastBlockRef.current = true;
      else if (targetItemId) pendingBlockTargetIdRef.current = targetItemId;
      return true;
    }

    // A Lesson-scoped extra unit (lesson-content/lesson-quiz) still points
    // selectedLesson at the right Lesson, so Sticky Notes, the bookmark
    // toggle and resume-state persistence stay correctly scoped.
    if (unit.scope.lessonId && unit.scope.lessonId !== selectedLesson?.id) {
      const lessonMatch = lessons.find((l) => l.id === unit.scope.lessonId);
      if (lessonMatch) selectLesson(lessonMatch);
    }
    setExtraUnit({ key: unit.key, blockIndex: resolvedIndex });
    return true;
  };

  // Only the forward direction is gated; a student can always go back to
  // review earlier material. Crossing out of a Topic requires that Topic
  // complete; crossing out of a Lesson (whether from its last Topic, its own
  // quiz, or — for a zero-Topic Lesson — its own content) additionally
  // requires the whole Lesson complete; crossing out of a Module likewise
  // requires the whole Module complete. Same rule as the instructor's spec,
  // generalized to every level courseUnits now covers, not just Topics —
  // checked finest-scope-first so the most specific message wins. enterUnit's
  // own findBlockingGate check (walking every prior boundary) subsumes this
  // single-neighbor case, so the gate itself now lives there.
  const goToNextUnit = () => {
    const target = courseUnits[currentUnitIndex + 1];
    if (!target) return;
    enterUnit(target);
  };

  // Only the forward direction is gated; a student can always go back to
  // review earlier material — skipGate bypasses enterUnit's check
  // unconditionally here rather than relying on "the previous unit's own
  // prerequisites happen to already be satisfied", which stops holding the
  // moment a student reached their current position via a not-yet-gated
  // path (e.g. progress predating this feature).
  const goToPreviousUnit = () => {
    const target = courseUnits[currentUnitIndex - 1];
    if (!target) return;
    enterUnit(target, { atEnd: true, skipGate: true });
  };

  // In-player Prev/Next (the floating buttons over the content itself): step
  // through the active unit's own blocks first, only falling through to
  // goToPreviousUnit/goToNextUnit — i.e. cross into the previous/next unit —
  // once there's no earlier/later block in the current one.
  const goToPreviousBlock = () => {
    // Prev/Next from an opened Assignment returns to the position underneath.
    if (openAssignmentItem) {
      setOpenAssignmentItem(null);
      return;
    }
    if (extraUnit) {
      if (extraUnit.blockIndex > 0) {
        setExtraUnit((prev) => ({ ...prev, blockIndex: prev.blockIndex - 1 }));
        return;
      }
    } else if (blockIndex > 0) {
      setBlockIndex((prev) => prev - 1);
      return;
    }
    goToPreviousUnit();
  };

  const goToNextBlock = () => {
    const currentBlock = activeUnitBlocks[extraUnit ? extraUnit.blockIndex : blockIndex];
    if (!canLeaveBlock(currentBlock)) {
      showToast(BLOCK_GATE_MESSAGES[currentBlock.kind] || "Finish this item before moving on.", "error");
      return;
    }

    if (openAssignmentItem) {
      setOpenAssignmentItem(null);
      return;
    }
    if (extraUnit) {
      if (extraUnit.blockIndex < activeUnitBlocks.length - 1) {
        setExtraUnit((prev) => ({ ...prev, blockIndex: prev.blockIndex + 1 }));
        return;
      }
    } else if (blockIndex < playerBlocks.length - 1) {
      setBlockIndex((prev) => prev + 1);
      return;
    }
    goToNextUnit();
  };

  // Jumps the player straight to a specific content/quiz row selected from
  // the sidebar, for the Topic/Lesson pathway only (Course/Module-level and
  // Lesson-quiz selections go through enterUnit directly instead — see the
  // sidebar handlers below). A click on a row already within the on-screen
  // unit resolves its index immediately; a click that also crosses a unit
  // boundary stashes the target id in pendingBlockTargetIdRef for the
  // unit-change reset effect to resolve once playerBlocks has been
  // recomputed for the newly-selected unit.
  //
  // Returns whether the player moved. A click inside the unit already on
  // screen always did (it is at or behind the student's own position, which
  // the gate never blocks — see findBlockingGate); a click that crosses a
  // boundary moved only if runGated let it through; skipGate skips the gate
  // entirely, so it moved by construction.
  const jumpToBlock = (targetId, { lesson, topic, skipGate = false } = {}) => {
    setExtraUnit(null);
    setOpenAssignmentItem(null);
    const alreadyOnUnit =
      lesson?.id === selectedLesson?.id && (topic ? topic.id === selectedTopicId : true);
    if (alreadyOnUnit) {
      const idx = playerBlocks.findIndex(
        (b) => b.item.id === targetId || b.item.contentIds?.includes(targetId)
      );
      // A sidebar click within the SAME unit used to jump straight to `idx`
      // with no check at all — unlike goToNextBlock, which already gates
      // each step with canLeaveBlock. That let a student open Content 4 by
      // clicking it even with Content 3 still incomplete. Walk every block
      // strictly before the target and refuse the jump if any of them isn't
      // leavable yet, same rule Next already enforces one step at a time.
      if (idx > 0 && !skipGate) {
        for (let i = 0; i < idx; i++) {
          if (!canLeaveBlock(playerBlocks[i])) {
            showToast(
              BLOCK_GATE_MESSAGES[playerBlocks[i].kind] || "Finish the previous item first.",
              "error"
            );
            return false;
          }
        }
      }
      setBlockIndex(idx >= 0 ? idx : 0);
      return true;
    }

    const targetUnitKey = topic ? `topic:${topic.id}` : `lesson:${lesson?.id}`;
    const proceed = () => {
      pendingBlockTargetIdRef.current = targetId;
      const match = lesson?.id ? lessons.find((l) => l.id === lesson.id) : null;
      if (match) selectLesson(match);
      if (topic?.id) setSelectedTopicId(topic.id);
    };
    if (skipGate) {
      proceed();
      return true;
    }
    return runGated(targetUnitKey, proceed);
  };

  // Once, on initial load with no explicit ?lessonId= (a Continue Learning
  // click, or any bare visit to the course): lands the player on
  // resumeTarget's exact Topic/Content/Quiz — useLearningStateSync above
  // only gets as far as the right Lesson. Runs after that settles
  // (stateRestored) and courseUnits exists, and only once per mount ever —
  // nothing the student does afterward (sidebar clicks, Prev/Next, a fresh
  // completion) may be re-overridden by this as progress keeps changing
  // through the rest of the session. Reuses jumpToBlock/enterUnit exactly
  // as a sidebar click would, but always with skipGate — a resume target can
  // legitimately sit behind an incomplete earlier item (the leaf order this
  // is computed from and the gate's own boundary walk don't always agree on
  // in-progress edge cases), and the very first thing a student sees on
  // opening a course must never be an error toast.
  const hasAppliedResumeTargetRef = useRef(false);
  useEffect(() => {
    if (hasAppliedResumeTargetRef.current) return;
    if (!stateRestored || courseUnits.length === 0) return;

    // `?item=` pins the exact block the student was last on. It outranks the
    // progress-derived resume target: this is "put me back where I was",
    // which is a stricter promise than "where should I carry on". Read from
    // the mount-time capture, and only honoured when the id still resolves to
    // a unit in this course — a stale or hand-edited one falls through to the
    // normal resume below rather than dead-ending.
    const { itemId: pinnedItemId, lessonId: openedLessonId } = openedWithRef.current || {};

    if (pinnedItemId) {
      const pinnedUnit = findUnitContaining(courseUnits, pinnedItemId);
      if (pinnedUnit) {
        hasAppliedResumeTargetRef.current = true;
        enterUnit(pinnedUnit, { targetItemId: pinnedItemId, skipGate: true });
        return;
      }
    }

    if (openedLessonId) {
      hasAppliedResumeTargetRef.current = true;
      return;
    }

    if (!resumeTarget) return;

    hasAppliedResumeTargetRef.current = true;
    const { id, lessonId, topicId } = resumeTarget;

    if (topicId) {
      const lessonMatch = lessons.find((l) => l.id === lessonId);
      const topicMatch = lessonMatch?.topics?.find((t) => t.id === topicId);
      jumpToBlock(id, { lesson: lessonMatch, topic: topicMatch, skipGate: true });
      return;
    }

    if (lessonId) {
      const lessonMatch = lessons.find((l) => l.id === lessonId);
      const lessonHasTopics = (lessonMatch?.topics?.length ?? 0) > 0;
      if (lessonHasTopics) {
        // A topics-Lesson's own content/quiz run(s) — findUnitContaining
        // (not a guessed key) since buildCourseUnits can split a level's
        // own items into several runs interleaved with its children.
        enterUnit(findUnitContaining(courseUnits, id), { targetItemId: id, skipGate: true });
      } else {
        jumpToBlock(id, { lesson: lessonMatch, skipGate: true });
      }
      return;
    }

    // Module-direct or Course-direct.
    enterUnit(findUnitContaining(courseUnits, id), { targetItemId: id, skipGate: true });
    // enterUnit/jumpToBlock intentionally omitted from deps — same
    // convention as the unit-change reset effect above: they close over
    // this render's state and aren't memoized, so listing them would just
    // re-run this every render; the ref guard is what actually prevents
    // re-application.
  }, [stateRestored, resumeTarget, courseUnits, lessons]);

  // Marks the block currently on screen visited, once per Content/Quiz id —
  // POST /progress/visit, which nothing previously called. This is the data
  // resumeTarget.js's "last visited leaf" walk depends on; without it every
  // "Continue Learning" click fell back to the course's very first leaf.
  const visitedIdsRef = useRef(new Set());
  useEffect(() => {
    const idx = extraUnit ? extraUnit.blockIndex : blockIndex;
    const block = openAssignmentItem ? null : activeUnitBlocks[idx];
    if (!block) return;

    if (block.kind === "content") {
      const ids = contentIdsOf(block.item).filter((id) => !visitedIdsRef.current.has(id));
      if (ids.length === 0) return;
      ids.forEach((id) => visitedIdsRef.current.add(id));
      markVisitedMutation.mutate({ contentIds: ids });
    } else if (block.kind === "quiz" && block.item?.id && !visitedIdsRef.current.has(block.item.id)) {
      visitedIdsRef.current.add(block.item.id);
      markVisitedMutation.mutate({ quizId: block.item.id });
    }
    // markVisitedMutation intentionally omitted — same convention as
    // enterUnit/jumpToBlock above; the ref guard is what prevents re-sending.
  }, [extraUnit, blockIndex, activeUnitBlocks, openAssignmentItem]);

  // Mirrors the block on screen into the URL, so a refresh returns to this
  // exact Content/Quiz rather than to wherever "Continue Learning" would send
  // the student. Those are different questions: resumeTarget answers "what
  // should I do next" and deliberately steps PAST a leaf once it's completed,
  // so without this a refresh while reviewing a finished item jumped forward
  // to the following one. history.replaceState, not router.replace — this is
  // not navigation and must not remount the player mid-video or stack a
  // history entry per block.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const idx = extraUnit ? extraUnit.blockIndex : blockIndex;
    const block = openAssignmentItem ? null : activeUnitBlocks[idx];
    const itemId = block?.item?.id;
    if (!itemId) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("item") === String(itemId)) return;

    // Any `lessonId` the page was opened with is left alone: `item` is
    // consulted first on restore, so a lingering lesson param is a harmless
    // fallback — and useLearningStateSync still reads it from the live URL to
    // choose the initial lesson, which deleting it here could race.
    params.set("item", String(itemId));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [extraUnit, blockIndex, activeUnitBlocks, openAssignmentItem]);

  // Still used by Sticky Notes (both the mobile tab and the desktop side
  // panel) to jump the video to a note's timestamp.
  const handleTranscriptSeek = (seconds) => {
    videoPlayerRef.current?.seekTo(seconds);
  };

  if (isLoading || isEnrollmentsLoading || !isEnrolled) {
    return <Loader />;
  }

  if (isError || !course) {
    return <Card className="text-foreground">Course not found.</Card>;
  }

  // What the player actually shows — whatever block the active unit
  // (extraUnit, or the Topic/Lesson pathway) is currently on.
  const activeBlockIndex = extraUnit ? extraUnit.blockIndex : blockIndex;
  const activeBlock = openAssignmentItem
    ? { kind: "assignment", item: openAssignmentItem }
    : activeUnitBlocks[activeBlockIndex];

  // The header's Progress readout scopes to whatever its own Lesson/Topic
  // line is showing below (topicTitle) — the current Topic when the Lesson
  // uses Topics, the Lesson itself otherwise — instead of the whole course,
  // so a student partway through one lesson isn't shown the entire course's
  // (from their vantage point, near-zero) roll-up.
  const headerProgress = getNodeProgress(progressIndex, hasTopics ? currentTopic?.id : selectedLesson?.id);

  // Course Map sidebar highlighting — mirrors the instructor Composer's
  // composerMode/composeXId contract (see CourseComposerSidebar), derived
  // from whatever's actually on screen rather than tracked as separate
  // state. An extra unit (Course/Module-direct, or a Lesson's own quiz) has
  // its own scope to report; the Topic/Lesson pathway still reports the
  // current lesson's module so that ancestor row stays expanded.
  const sidebarComposerMode = activeExtraUnitDef
    ? activeExtraUnitDef.scope.lessonId
      ? "lesson"
      : activeExtraUnitDef.scope.moduleId
      ? "module"
      : "course"
    : hasTopics
    ? "topic"
    : "lesson";
  const sidebarComposeModuleId = activeExtraUnitDef
    ? activeExtraUnitDef.scope.moduleId
    : selectedLesson?.moduleId ?? null;
  const sidebarComposeLessonId = activeExtraUnitDef
    ? activeExtraUnitDef.scope.lessonId
    : selectedLesson?.id ?? null;
  const sidebarComposeTopicId = activeExtraUnitDef ? null : hasTopics ? selectedTopicId : null;
  const sidebarComposeQuizId = activeBlock?.kind === "quiz" ? activeBlock.item.id : null;
  const sidebarSelectedCellId = activeBlock?.kind === "content" ? activeBlock.item.id : null;

  const resultReturnTo = `/student/learn/${courseId}${selectedLesson?.id ? `?lessonId=${selectedLesson.id}` : ""}`;

  // ---- Completion state for the block currently on screen -------------------
  // Read straight out of the backend roll-up. A merged document block counts as
  // complete only when every Content row behind it is, because the backend
  // counts each of those rows in its own denominator. This is a lookup of the
  // server's per-item flags, not a calculation of progress.
  const activeContentIds = activeBlock?.kind === "content" ? contentIdsOf(activeBlock.item) : [];
  const activeContentCompleted =
    activeContentIds.length > 0 && activeContentIds.every((id) => isItemComplete(progressIndex, id));

  // A Quiz reports the same backend flag in the same strip, but never offers a
  // way to set it: `completed` for a Quiz means the backend recorded a passing
  // QuizSubmission, so it is earned by passing, not by asserting it here.
  const activeQuizId = activeBlock?.kind === "quiz" ? activeBlock.item?.id : null;
  const activeQuizCompleted = Boolean(activeQuizId) && isItemComplete(progressIndex, activeQuizId);

  // The floating Prev/Next controls double as an escape hatch out of an
  // in-progress quiz — same gate canLeaveBlock already enforces on click
  // (isItemSubmitted), just hidden outright here instead of clickable-then-
  // toast, so an unsubmitted quiz reads as "finish this first" rather than
  // offering a way out that immediately errors.
  const hideFloatingNavForActiveQuiz = Boolean(activeQuizId) && !isItemSubmitted(progressIndex, activeQuizId);

  // An Assignment is the same story: completion is earned by the backend
  // accepting a submission, so the strip reports it and offers no action.
  const activeAssignmentId = activeBlock?.kind === "assignment" ? activeBlock.item?.id : null;
  const activeAssignmentCompleted =
    Boolean(activeAssignmentId) && isItemComplete(progressIndex, activeAssignmentId);

  const activeEarnedId = activeQuizId || activeAssignmentId;

  // A lesson-composer Assignment block (Content type ASSIGNMENT) is earned the
  // same way: the backend completes it when the PDF submission is recorded.
  const activeIsContentAssignment =
    activeBlock?.kind === "content" && activeBlock.item?.type === "ASSIGNMENT";

  // Hidden entirely until the roll-up is known: without it we cannot say
  // whether this item is already complete, and showing "Mark as Complete" on a
  // finished item (or vice versa) would misreport the student's own state.
  const showCompletionBar =
    Boolean(progressIndex) && (activeContentIds.length > 0 || Boolean(activeEarnedId));

  // Opens an Assignment in this workspace instead of navigating away, so the
  // Course Map, the completion strip and the course percentage all stay on
  // screen while the student works through it.
  const openAssignment = (assignment) => {
    if (!assignment?.id) return;
    setOpenAssignmentItem(assignment);
  };


  // Mirrors the values handleMarkComplete needs at click time, kept current
  // on every render (a plain assignment, not a ref updated in an effect, so
  // it's correct as of the render that just committed — no extra tick of
  // lag). handleMarkComplete itself reads this ref rather than closing over
  // activeContentIds/activeContentCompleted directly: those are recomputed
  // (new array / fresh boolean) on every render, including the several-a-
  // second re-renders a playing video drives via currentTimestamp, so
  // closing over them directly would give handleMarkComplete — and anything
  // memoized against it, like ContentCompletionBar — a new identity on every
  // one of those ticks, defeating the memoization entirely.
  activeCompletionRef.current = { contentIds: activeContentIds, completed: activeContentCompleted };

  // The side panel (Ask instructor / Sticky notes / Feedback / Reviews) —
  // desktop only: below xl the lesson itself owns the screen.
  // Questions are tied to the one item on screen — content block, quiz or
  // assignment — and only ever listed back on that item.
  const sidePanel = (
    <LearnSidePanel
      activeFeature={sidePanelFeature}
      onChangeFeature={setSidePanelFeature}
      lessonId={selectedLesson?.id ?? null}
      askTarget={
        activeBlock?.item?.id && ["content", "quiz", "assignment"].includes(activeBlock.kind)
          ? { kind: activeBlock.kind, id: activeBlock.item.id, title: activeBlock.item.title }
          : null
      }
      currentTimestamp={currentTimestamp}
      onSeek={handleTranscriptSeek}
    />
  );

  const quizPanel = (
    <LessonQuizPanel quizzes={courseWithProgress?.quizzes || course?.quizzes || []} courseId={courseId} currentLessonId={selectedLesson?.id} />
  );

  // Below xl the Course Map is an overlay, so a selection that lands has to
  // get out of the way — but ONLY one that lands. Every handler below closes
  // it on the navigation primitive's own success result (runGated/enterUnit/
  // jumpToBlock), never on the click itself: a completion-gated tap still
  // toasts and leaves the map open over the unchanged player, and so does a
  // selection whose unit can't be resolved. On the xl rail these calls are
  // no-ops — courseMapOpen is already false there and React bails on an
  // identical value — so the desktop sidebar is unaffected.
  //
  // One definition of the course tree, rendered on two surfaces: the xl+
  // rail and the below-xl drawer. Same modules, same progress, same select
  // handlers — only the open/close wiring and the header differ.
  const renderCourseTree = ({ isOpen, onToggleOpen, hideHeader = false }) => (
    <CourseStructureSidebar
      modules={courseWithProgress.modules || []}
      courseId={courseId}
      courseQuizzes={courseWithProgress.quizzes || []}
      // Course-direct assignments are counted by the roll-up, so the tree
      // has to render them too or the student cannot reach what their
      // percentage is already waiting on.
      courseAssignments={courseWithProgress.assignments || []}
      progress={progressIndex}
      maxHeightClassName="max-h-full"
      composerMode={sidebarComposerMode}
      composeLessonId={sidebarComposeLessonId}
      composeModuleId={sidebarComposeModuleId}
      composeTopicId={sidebarComposeTopicId}
      composeQuizId={sidebarComposeQuizId}
      selectedCellId={sidebarSelectedCellId}
      onSelectCourseOverview={() => router.push(`/student/courses/${courseId}`)}
      onSelectLesson={(lessonId) => {
        setExtraUnit(null);
        setOpenAssignmentItem(null);
        const match = lessons.find((l) => l.id === lessonId);
        if (!match) return;
        const navigated = runGated(
          firstUnitKeyFor({ moduleId: match.moduleId, lessonId: match.id }),
          () => {
            setExtraUnit(null);
            selectLesson(match);
          }
        );
        if (navigated) setCourseMapOpen(false);
      }}
      onSelectModule={(mod) => {
        const firstLesson = mod.lessons?.[0];
        if (!firstLesson) return;
        const navigated = runGated(
          firstUnitKeyFor({ moduleId: mod.id, lessonId: firstLesson.id }),
          () => {
            setExtraUnit(null);
            setOpenAssignmentItem(null);
            selectLesson(firstLesson);
          }
        );
        if (navigated) setCourseMapOpen(false);
      }}
      onSelectTopic={(topicId, lessonId) => {
        setExtraUnit(null);
        setOpenAssignmentItem(null);
        const match = lessons.find((l) => l.id === lessonId);
        if (!match) return;
        const navigated = runGated(`topic:${topicId}`, () => {
          setExtraUnit(null);
          selectLesson(match);
          setSelectedTopicId(topicId);
        });
        if (navigated) setCourseMapOpen(false);
      }}
      onSelectContent={(content, topic, lesson) => {
        if (jumpToBlock(content.id, { lesson, topic })) setCourseMapOpen(false);
      }}
      onSelectLessonContent={(content, lesson) => {
        // A Lesson's own direct content is only ever a distinct
        // courseUnits entry when that Lesson also has Topics (see
        // courseUnits above) — otherwise it *is* the Topic/Lesson
        // pathway's own content, reached the normal way.
        const navigated =
          (lesson?.topics?.length ?? 0) > 0
            ? enterUnit(findUnitContaining(courseUnits, content.id), { targetItemId: content.id })
            : jumpToBlock(content.id, { lesson });
        if (navigated) setCourseMapOpen(false);
      }}
      onSelectModuleContent={(content) => {
        if (enterUnit(findUnitContaining(courseUnits, content.id), { targetItemId: content.id })) {
          setCourseMapOpen(false);
        }
      }}
      onSelectCourseContent={(content) => {
        if (enterUnit(findUnitContaining(courseUnits, content.id), { targetItemId: content.id })) {
          setCourseMapOpen(false);
        }
      }}
      onSelectQuiz={(quiz, mod, lesson, topic) => {
        let navigated;
        if (topic) {
          navigated = jumpToBlock(quiz.id, { lesson, topic });
        } else if (lesson && (lesson.topics?.length ?? 0) === 0) {
          navigated = jumpToBlock(quiz.id, { lesson });
        } else {
          // A topic-Lesson's, Module's or Course's own quiz — its own unit.
          navigated = enterUnit(findUnitContaining(courseUnits, quiz.id), { targetItemId: quiz.id });
        }
        if (navigated) setCourseMapOpen(false);
      }}
      // Assignments are not steps in the Prev/Next sequence, so one opens
      // over the current position. Wired on the shared tree, so the xl rail
      // and the below-xl drawer both reach it — this used to hang off the
      // mobile-only accordion, which the drawer replaced.
      onSelectAssignment={(assignment) => openAssignment(assignment)}
      isOpen={isOpen}
      onToggleOpen={onToggleOpen}
      hideHeader={hideHeader}
      role="STUDENT"
    />
  );

  // ---- Mobile height/scroll ownership -------------------------------------
  // Below xl, who owns height and scrolling depends on WHAT is on screen. One
  // bounded 68dvh box for everything is what stretched video, clipped text and
  // trapped the quiz in a nested scroller.
  //   reading   — text/HTML: bounded player, but the scroller is VideoPlayer's
  //               own content area, one level BELOW its title bar, so the bar
  //               stays pinned while the prose scrolls. The body here must
  //               therefore NOT scroll, or there would be two scrollbars.
  //   contained — quiz and PDF/DOC/PPT/external: bounded player, and this body
  //               is the single scroller (documents fill it exactly, so it
  //               only actually scrolls for the quiz).
  //   aspect    — video: the frame wraps a 16:9 player that derives its own
  //               height from its width.
  //   natural   — assignment: a form with uploads, which must size to its own
  //               content rather than be trapped in a short box.
  // Derived from data already in scope; desktop is unaffected (every class
  // below is max-xl:).
  const activeContentType = activeBlock?.kind === "content" ? activeBlock.item?.type : null;
  // An uploaded .ppt/.pptx is a fixed-aspect canvas, like a video: a fitted
  // slide on a phone is ~180px tall, so the 68dvh reading box left most of the
  // frame as empty backdrop beneath it. Its frame sizes to the slide instead.
  const playerMode =
    activeContentType === "VIDEO" ||
    (activeBlock?.kind === "content" && rendersUploadedDeck(activeBlock.item))
      ? "aspect"
      : activeBlock?.kind === "assignment" || activeContentType === "ASSIGNMENT"
      ? "natural"
      : activeBlock?.kind === "content" &&
        activeContentType !== "FILE" &&
        activeContentType !== "DOCUMENT" &&
        activeContentType !== "PDF"
      ? "reading"
      : "contained";

  // Literal class strings — Tailwind only emits what it can see verbatim.
  const FRAME_MODE_CLASSES = {
    natural: "max-xl:h-auto max-xl:min-h-0 max-xl:max-h-none",
    aspect: "max-xl:h-auto max-xl:min-h-0 max-xl:max-h-none",
    reading: "max-xl:h-[68dvh] max-xl:min-h-[360px] max-xl:max-h-none",
    contained: "max-xl:h-[68dvh] max-xl:min-h-[360px] max-xl:max-h-none",
  };
  // An uploaded .ppt/.pptx renders through PptViewer, whose canvas derives its
  // height from its width via the slide's own aspect ratio — a full-width 16:9
  // slide is all the height it has. The frame's fixed h-[calc(100vh-147px)]
  // gave it far more than that on desktop (900px of frame against a ~610px
  // slide at 1440), and the surplus showed as a band of dead backdrop under
  // every slide. Below xl nothing changes: the 68dvh box there lands within a
  // few pixels of a full-width slide already, which is why only desktop showed
  // the gap. min-h is released with it so the frame hugs the deck at narrower
  // desktop widths too (1280 with the side panel open); max-h-[900px] stays, so
  // a very wide deck still scrolls inside the frame exactly as it does today.
  // Decks only — PDFs, documents and quizzes fill and scroll the bounded frame.
  const deckFrameSizing = "";

  // overflow-y (not the overflow shorthand) so it overrides the base
  // overflow-y-auto by property, never by stylesheet order.
  const BODY_MODE_CLASSES = {
    natural: "max-xl:flex-none max-xl:overflow-y-visible",
    aspect: "max-xl:flex-none max-xl:overflow-y-visible",
    // reading: hand the scroll down to VideoPlayer's content area, and make
    // sure this element can never become a second vertical scrollbar.
    reading: "max-xl:overflow-y-hidden",
    contained: "",
  };

  // LESSON CONTENT navigation — one set of props and one pair of handlers
  // (goToPreviousBlock / goToNextBlock), rendered in two placements: the
  // desktop overlay on the player, and the row under the player below xl.
  // Entirely separate from the document's page navigation, which the
  // document viewer owns and renders in its own header.
  const lessonNavProps = {
    unitLabel: activeExtraUnitDef
      ? activeExtraUnitDef.key.startsWith("course")
        ? "Course"
        : activeExtraUnitDef.key.startsWith("module")
        ? "Module"
        : "Lesson"
      : hasTopics
      ? "Topic"
      : "Lesson",
    previousItem: activeBlockIndex > 0 || currentUnitIndex > 0,
    nextItem:
      activeBlockIndex < activeUnitBlocks.length - 1 || currentUnitIndex < courseUnits.length - 1,
    onSelectPrevious: goToPreviousBlock,
    onSelectNext: goToNextBlock,
  };

  // Not memoized as a single object -- `<ContentCompletionBar {...x} />`
  // spreads these into individual props, and memo()'s default comparison
  // checks each one separately, not the wrapper object's own identity (which
  // isn't itself a prop). completed/isPending/isVideo/readOnly/readOnlyHint
  // are plain booleans/strings, so they already compare equal by value across
  // renders where nothing actually changed. onMarkComplete is the only
  // reference-typed one, and it's a stable useCallback (declared above, before
  // the loading/error early returns) — that's what actually lets memo() skip
  // re-rendering ContentCompletionBar on the several-a-second re-renders a
  // playing video drives via currentTimestamp.
  const completionBarProps = {
    completed: activeQuizId
      ? activeQuizCompleted
      : activeAssignmentId
        ? activeAssignmentCompleted
        : activeContentCompleted,
    isPending: completeContentMutation.isPending,
    isVideo: !activeEarnedId && activeBlock?.item?.type === "VIDEO",
    readOnly: Boolean(activeEarnedId) || activeIsContentAssignment,
    readOnlyHint: activeQuizId
      ? "Pass this quiz to complete it."
      : "Submit your assignment (PDF or written answer) to complete it.",
    onMarkComplete: handleMarkComplete,
  };

  return (
    <div className="h-full bg-[#07080f] text-foreground flex overflow-x-hidden font-sans relative">

      {/* ========================================================================= */}
      {/* COURSE CONTENT SIDEBAR — desktop only (xl+). Below xl, Course Content is  */}
      {/* ========================================================================= */}
      {/* COURSE MAP SIDEBAR — matching Instructor Course View                      */}
      {/* ========================================================================= */}
      <div className={`hidden xl:block shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out ${courseSidebarOpen ? "w-full xl:w-[320px]" : "w-full xl:w-0"}`}>
        {renderCourseTree({
          isOpen: courseSidebarOpen,
          onToggleOpen: () => setCourseSidebarOpen(false),
        })}
      </div>

      {/* COURSE MAP — off-canvas navigation sidebar below xl. Same tree as the
          desktop rail (one renderCourseTree, two call sites), opened from the
          trigger in the lesson context row and dismissed with X, the scrim or
          Escape. Fixed to the viewport's left edge and mounted only while
          open, so it overlays the lesson instead of ever taking part in the
          page's flow: the lesson never shifts, resizes or scrolls because of
          it. The tree scrolls inside its own region — the wrapper below only
          hands it the height, it does not scroll a second time. */}
      {courseMapOpen && (
        <div
          className="xl:hidden fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Course Map"
        >
          <div
            aria-hidden="true"
            onClick={() => setCourseMapOpen(false)}
            className="absolute inset-0 bg-black/70 animate-scrim-in"
          />
          {/* 85% of the viewport with a cap, so it reads as a sidebar (the page
              stays visible behind it) at 320px and at 430px alike. */}
          <aside className="absolute inset-y-0 left-0 flex h-full w-[85%] max-w-[340px] flex-col bg-[#07080f] shadow-2xl animate-sidebar-in-left">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 shrink-0">
              <h2 className="text-base font-black uppercase tracking-widest text-foreground">
                Course Content
              </h2>
              <button
                type="button"
                onClick={() => setCourseMapOpen(false)}
                aria-label="Close course map"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* The tree's own panel chrome (card radius, border, shadow) is for
                a rail sitting inside a padded page; flush against the sidebar's
                edges it would read as a card floating in a drawer, so it is
                flattened here — presentation only, scoped to this call site. */}
            <div className="flex-1 min-h-0 overflow-hidden [&>aside]:rounded-none [&>aside]:border-0 [&>aside]:bg-transparent [&>aside]:shadow-none [&>aside]:p-3">
              {renderCourseTree({
                isOpen: true,
                onToggleOpen: () => setCourseMapOpen(false),
                hideHeader: true,
              })}
            </div>
          </aside>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN WORKSPACE CONTENT */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#07080f] min-w-0">

        <LearnPageHeader
          courseSidebarOpen={courseSidebarOpen}
          onOpenSidebar={() => setCourseSidebarOpen(true)}
          selectedLesson={selectedLesson}
          topicTitle={hasTopics ? currentTopic?.title : null}
          course={course}
          unitProgress={headerProgress}
          isProgressUnavailable={isProgressError}
          isStickyNotesOpen={rightPanelOpen}
          onToggleStickyNotes={() => setRightPanelOpen((prev) => !prev)}
        />

        {/* ========================================================== */}
        {/* FLUID RESPONSIVE WORKSPACE CONTAINER */}
        {/* ========================================================== */}
        {/* Phone: keep the 16px side gutter so lesson text never runs to the
            screen edge, but trim the top so the lesson starts higher. At xl the
            padding all but disappears — the player frame's
            h-[calc(100vh-147px)] is measured against the chrome above it, so
            anything more would push the frame past the viewport. */}
        <div className="px-4 pt-3 pb-4 sm:px-6 sm:pt-6 sm:pb-6 md:px-8 md:pt-8 md:pb-8 xl:px-[3.2px] xl:pt-[3.2px] xl:pb-[3.2px] min-w-0">
          {/*
            Priority-driven order: below xl the student only sees one column, so every
            block that comes before the video costs them a scroll. DOM order follows
            what a returning learner needs, in sequence: Video → Overview → Course
            Content (embedded module/lesson navigator) → Transcript → Resources →
            Sticky Notes → Query → Feedback, then the course banner and Lesson Tabs
            (orientation/reference, not learning actions), and finally Previous/Next
            Lesson as the bottom-of-page call to action. At xl+ both halves of the
            page are visible at once, so explicit grid placement restores the
            original two-column arrangement regardless of DOM order.
          */}
          <div
            className={`grid grid-cols-1 gap-6 lg:gap-8 transition-[grid-template-columns] duration-300 ease-in-out ${
              rightPanelOpen ? "xl:grid-cols-[1fr_360px]" : "xl:grid-cols-1"
            }`}
          >

            {/* VIDEO — the primary learning action: first below xl, row 1 of the left column on desktop. */}
            <div className="space-y-3 xl:space-y-4 min-w-0 row-start-1 xl:col-start-1 xl:row-start-1">
              {/* LESSON CONTEXT — below xl only. Where the learner is, then what
                  they are reading. Bookmark / more / back-to-module are gone: the
                  lesson is what this screen is for. */}
              <div className="xl:hidden">
                {/* Course Map on the left, lesson identity centred on the ROW,
                    not on the space left over beside the button: the first and
                    third grid cells are the same 44px, so the middle cell's
                    centre is the row's centre. The third cell is inert spacing,
                    not a second control. Same courseMapOpen state and drawer as
                    before — only the trigger's size and position changed. */}
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCourseMapOpen(true)}
                    className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/5 text-primary transition hover:bg-primary/10 cursor-pointer"
                    aria-label="Open course map"
                    title="Course Map"
                  >
                    <ListTree size={18} aria-hidden="true" />
                  </button>

                  <div className="min-w-0 text-center">
                    <h1 className="text-lg font-bold leading-snug text-foreground line-clamp-2">
                      {selectedLesson?.title || course?.title || "Lesson"}
                    </h1>
                    {hasTopics && currentTopic?.title && (
                      <p className="text-sm text-muted-foreground line-clamp-1">Topic: {currentTopic.title}</p>
                    )}
                  </div>

                  <div aria-hidden="true" className="h-11 w-11 shrink-0" />
                </div>
              </div>

              {/* CONTENT PLAYER FRAME — a bounded box at every width, so the
                  frame itself never becomes the thing the page scrolls.
                  Desktop: height fills the viewport down to just under the
                  screen's bottom edge (100vh minus the fixed DashboardNavbar +
                  LearnPageHeader chrome above it), clamped by min/max.
                  Below xl: a viewport fraction rather than a calc, because the
                  chrome above it differs by breakpoint (the sub-header is
                  hidden below sm) and dvh tracks the mobile address bar. Either
                  way the body below scrolls INSIDE this box — the box, its
                  border and the content title bar stay put. Transcript/
                  Resources stay outside it. */}
              <div className={`group relative flex flex-col h-[calc(100vh-147px)] min-h-[440px] max-h-[900px] rounded-2xl border border-border bg-card overflow-hidden ${FRAME_MODE_CLASSES[playerMode]} ${deckFrameSizing}`}>
                {/* No dedicated header bar — lesson/topic name, the Course
                    Index reopen and the side-panel toggle all live in the top
                    bar above (LearnPageHeader). */}

                {/* One block at a time — Next/Prev below step through the
                    active unit's blocks (content and quizzes merged in
                    order) before crossing into the previous/next unit,
                    anywhere in the whole course — see activeUnitBlocks/
                    courseUnits above. initialTime (resume position) only
                    applies to the first block of the normal Topic/Lesson
                    sequence. */}
                <div className={`flex-1 overflow-y-auto min-h-0 ${BODY_MODE_CLASSES[playerMode]}`}>
                  {activeBlock?.kind === "assignment" ? (
                    <div className="p-2.5 sm:p-5">
                      <AssignmentWorkspacePanel
                        assignmentId={activeBlock.item.id}
                        completed={activeAssignmentCompleted}
                        onNextContent={goToNextBlock}
                      />
                    </div>
                  ) : activeBlock?.kind === "quiz" ? (
                    <div className="p-2.5 sm:p-5">
                      <QuizExperience
                        quizId={activeBlock.item.id}
                        onBack={goToPreviousBlock}
                        resultReturnTo={resultReturnTo}
                        onNextContent={goToNextBlock}
                        speechLanguage={course?.language}
                      />
                    </div>
                  ) : (
                    <LessonContentBlock
                      item={activeBlock?.item}
                      videoPlayerRef={videoPlayerRef}
                      onTimeUpdate={setCurrentTimestamp}
                      onDurationChange={setVideoDuration}
                      onEnded={handleVideoEnded}
                      initialTime={!extraUnit && blockIndex === 0 ? initialTime : 0}
                      speechLanguage={course?.language}
                      lessonTitle={selectedLesson?.title}
                      reserveHeaderCorner={showCompletionBar}
                    />
                  )}
                </div>

                {/* LESSON CONTENT Previous/Next — xl and up. Floats over the
                    vertical middle of the player's left/right edges, revealed
                    on hover or keyboard focus, video-player style. A sibling of
                    the scroller rather than a child, so the chips stay put while
                    the document scrolls underneath them, and pointer-events sit
                    only on the buttons so the overlay never blocks scrolling.
                    Below xl the same control is rendered under the player
                    instead (variant="below"), because floating arrows there sit
                    on top of what the student is trying to read. Same props,
                    same handlers — see lessonNavProps.
                    Hidden entirely (not just gated on click) while the block on
                    screen is a quiz still awaiting submission — see
                    hideFloatingNavForActiveQuiz. */}
                {!hideFloatingNavForActiveQuiz && (
                  <div className="max-xl:hidden absolute inset-3 flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
                    <LessonNavigationControls variant="corners" {...lessonNavProps} />
                  </div>
                )}

                {/* COMPLETION (xl and up) — a hover-reveal overlay in the same
                    player frame as Prev/Next, so the frame keeps its full
                    height for the content rather than spending a row on a bar
                    that is idle most of the time. */}
                {showCompletionBar && (
                  <div className="max-xl:hidden absolute top-3 right-3 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
                    <ContentCompletionBar {...completionBarProps} />
                  </div>
                )}
              </div>

              {/* LESSON CONTENT Previous/Next — below xl only, under the
                  player rather than floating over it. Same control and the
                  same handlers as the xl overlay above. Distinct from the
                  document-page row: Next here keeps the primary fill, while
                  the document buttons stay neutral-outlined. */}
              {!hideFloatingNavForActiveQuiz && (
                <div className="xl:hidden">
                  <LessonNavigationControls variant="below" {...lessonNavProps} />
                </div>
              )}

              {/* COMPLETION (below xl) — a real bar under the frame, NOT the
                  hover-reveal overlay used at xl: there is no hover on touch,
                  so an overlay keyed to group-hover would leave "mark complete"
                  permanently invisible and the block impossible to finish.
                  Applies to whatever the frame is showing: Course-, Module-,
                  Lesson- or Topic-direct Content alike. */}
              {showCompletionBar && (
                <div className="xl:hidden">
                  <ContentCompletionBar {...completionBarProps} />
                </div>
              )}
            </div>

            {/* SIDE PANEL — desktop only. Collapsed state renders no grid
                column at all (see grid-cols above) — the player gets the full
                width back. Below xl there is no side panel: the lesson is what
                the screen is for. */}
            {rightPanelOpen && (
              <div className="hidden xl:block min-w-0 xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:sticky xl:top-24 xl:h-fit w-full xl:w-[360px]">
                {sidePanel}
              </div>
            )}


          </div>
        </div>
        <ChatWidget />
      </div>
    </div>
  );
}