"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FastForward, ListTree, Lock, MoreHorizontal, X } from "lucide-react";

import LessonContentBlock from "@/components/student/learning/LessonContentBlock";
import ContentCompletionBar from "@/components/student/learning/ContentCompletionBar";
import AssignmentWorkspacePanel from "@/components/student/learning/AssignmentWorkspacePanel";
import QuizExperience from "@/components/student/attempt/QuizExperience";
import LearnSidePanel from "@/components/student/learning/LearnSidePanel";
import LessonNavigationControls from "@/components/student/learning/LessonNavigationControls";
import LearnPageHeader from "@/components/student/learning/LearnPageHeader";
import EvaluatorFeedbackButton from "@/components/evaluator/EvaluatorFeedbackButton";
import SkipQualificationModal from "@/components/student/learning/SkipQualificationModal";
import QualificationResultPanel from "@/components/student/learning/QualificationResultPanel";
import StudentCourseMap from "@/components/student/learning/StudentCourseMap";

import { buildPathIndex, getSkipOfferForScope } from "@/lib/learningPath";

import {
  useCourse,
  useStudentState,
  useUpdateStudentState,
  useCompleteContent,
  useMarkVisited,
} from "@/hooks/queries/student";
import useLearningPath from "@/hooks/queries/student/useLearningPath";
import useLearningSequence from "@/hooks/queries/student/useLearningSequence";
import usePlaybackLease from "@/hooks/queries/student/usePlaybackLease";
import useQuizResult from "@/hooks/queries/student/useQuizResult";
import useMyCourses from "@/hooks/queries/student/useMyCourses";
import useTrackCourseAccess from "@/hooks/queries/student/useTrackCourseAccess";
import useLearningStateSync from "@/hooks/queries/student/useLearningStateSync";
import useMediaQuery from "@/hooks/useMediaQuery";
import useAuth from "@/hooks/useAuth";
import useResizableWidth from "@/hooks/useResizableWidth";
import ResizeHandle from "@/components/ui/ResizeHandle";

import Loader from "@/components/common/Loader";
import Card from "@/components/ui/Card";
import { AiAssistantWidget } from "@/features/ai-assistant/components";


import { useToast } from "@/components/ui/ToastProvider";

const LEVEL_LABELS = {
  course: "Course",
  module: "Module",
  lesson: "Lesson",
  topic: "Topic",
  subTopic: "SubTopic",
  concept: "Concept",
};

// How long without input before the Course Map and the Learning Workspace
// header hide (the idle layout effect in LearnPage).
const IDLE_AFTER_MS = 2500;
// Pointer travel, in px, that counts as "the student moved" while hidden.
const MOVE_THRESHOLD_PX = 8;

/** Every container node (Course, Module, … Concept) of the learning-sequence tree, by id. */
function indexContainers(tree) {
  const byId = new Map();
  const walk = (node) => {
    byId.set(node.id, node);
    for (const entry of node.entries || []) if (entry.type === "container") walk(entry.node);
  };
  if (tree) walk(tree);
  return byId;
}

export default function LearnPage() {
  const { courseId } = useParams();
  const router = useRouter();
  // Evaluator accounts have every step open (backend learningSequence
  // `unlockAll`), so there is nothing for them to mark complete.
  const { user } = useAuth();
  const isEvaluator = Boolean(user?.evaluator);

  // Course metadata only (title, language): what the player walks comes from
  // the learning sequence below. Shallow — the full tree (~300 KB, seconds
  // slower) is never read here, and the page waits for this query.
  const { data: course, isLoading, isError } = useCourse(courseId, { shallow: true });
  // Sequential learning off: every step is open (backend `unlockAll`) and the
  // course keeps no progress — nothing is marked complete or visited, and the
  // player shows no completion strip.
  const isOpenCourse = course?.sequentialLearning === false;

  // Same enrollment gate as /student/courses/[courseId] — this is the actual
  // lesson content, not just an overview. A non-enrolled student who reaches
  // this URL directly is sent back to My Courses (enrollment happens on the
  // main Orange Tree site).
  const { data: myEnrollments, isLoading: isEnrollmentsLoading } = useMyCourses();
  const isEnrolled = (myEnrollments || []).some((e) => (e.courseId || e.course?.id) === courseId);

  useEffect(() => {
    if (!isEnrollmentsLoading && !isEnrolled) {
      router.replace("/student/my-courses");
    }
  }, [isEnrollmentsLoading, isEnrolled, courseId, router]);

  // THE learning sequence: every Content item — ordinary content, quizzes and
  // assignments — as one ordered list of steps, with the server's completed /
  // visited / locked flags. Prev/Next, the Course Map, resume and the
  // completion strip all read it; nothing here orders, merges or gates items.
  // Fetched alongside the enrollment list rather than after it: the server
  // refuses a student who is not enrolled (403), and the loader below keeps
  // such a student on a spinner until the redirect above sends them away.
  const {
    data: sequence,
    isPending: isSequencePending,
    isError: isSequenceError,
    refetch: refetchSequence,
  } = useLearningSequence(courseId);
  const steps = sequence?.steps || [];
  const containersById = useMemo(() => indexContainers(sequence?.tree), [sequence]);

  const completeContentMutation = useCompleteContent();
  const markVisitedMutation = useMarkVisited();

  // The server's lesson/topic path — read here only for qualifying-test
  // (skip) offers. Asked for once the sequence is in, so its roll-up does not
  // compete with the sequence's on the way to first paint; a skip offer
  // appearing a moment later costs nothing.
  const { data: learningPathData } = useLearningPath(courseId, { enabled: Boolean(sequence) });
  const pathIndex = useMemo(
    () => buildPathIndex(learningPathData?.path),
    [learningPathData]
  );

  // Kept current on every render further down; handleMarkComplete reads it so
  // it can stay a stable callback. markCompletePendingRef is its synchronous
  // double-click guard.
  const activeCompletionRef = useRef({ contentIds: [], completed: true });
  const markCompletePendingRef = useRef(false);
  const { showToast } = useToast();

  const handleMarkComplete = useCallback(() => {
    const { contentIds, completed } = activeCompletionRef.current;
    if (markCompletePendingRef.current || completed || contentIds.length === 0) return;

    markCompletePendingRef.current = true;
    completeContentMutation.mutate(
      { contentIds, completed: true },
      {
        onSettled: () => {
          markCompletePendingRef.current = false;
        },
        onError: () => showToast("Could not mark this item complete. Please try again.", "error"),
      }
    );
  }, [completeContentMutation, showToast]);

  // The position asked for by the URL this page was OPENED with, captured once
  // at first render — the ?item= mirror below starts rewriting the URL as soon
  // as the player settles.
  const openedWithRef = useRef(null);
  if (openedWithRef.current === null) {
    const search = typeof window === "undefined" ? "" : window.location.search;
    const opened = new URLSearchParams(search);
    openedWithRef.current = {
      itemId: opened.get("item"),
      lessonId: opened.get("lessonId"),
    };
  }

  const { data: stateData, isLoading: isStateLoading } = useStudentState(courseId);
  const updateStateMutation = useUpdateStudentState();

  // Below xl the course map is a temporary sheet, so it starts closed.
  const [courseMapOpen, setCourseMapOpen] = useState(false);

  // THE collapse state for the desktop Course Map rail and the Learning
  // Workspace header — one value, so the two can never disagree and every
  // way of collapsing produces the same layout:
  //   null     — both shown (the default: a student arrives to the map).
  //   "idle"   — hidden by the inactivity timer; any input brings them back.
  //   "manual" — hidden by the student (the map's or the header's hide
  //              button); stays hidden until they reopen it, so the mouse
  //              moving away from the button cannot undo the click.
  // Only the reason differs — the rendering reads workspaceCollapsed alone.
  const [workspaceCollapse, setWorkspaceCollapse] = useState(null);
  const collapseWorkspace = () => setWorkspaceCollapse("manual");
  const expandWorkspace = () => setWorkspaceCollapse(null);

  // Right-hand utility column (Ask Instructor / Sticky Notes / Feedback)
  // collapse state — mirrors the left Course Map sidebar's collapse
  // behavior. Closed by default to match the Course Index being open on
  // first arrival (avoids both wide panels competing for space). One flag,
  // two surfaces: the xl+ column and the below-xl "More" popover in the
  // lesson context row, the same way renderCourseTree serves both the
  // desktop rail and the mobile drawer.
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  // Which section of that panel is expanded (LearnSidePanel shows one at a
  // time; null collapses all). Shared by both surfaces, like the flag above.
  const [sidePanelFeature, setSidePanelFeature] = useState("notes");

  // The below-xl "More" popover mounts on a real viewport check rather than
  // an xl:hidden class: its dismiss listeners would otherwise bind on
  // desktop too, where Escape or a stray click would close the desktop side
  // panel that shares rightPanelOpen. Desktop behaviour has to stay exactly
  // as it was.
  const isDesktop = useMediaQuery("(min-width: 1280px)");

  // The header collapse is desktop only: below xl the map is a drawer and the
  // header carries no controls of its own.
  const workspaceCollapsed = workspaceCollapse !== null;
  const railOpen = !workspaceCollapsed;
  // Desktop Course Map width: drag its right edge to read long names.
  const courseMapResize = useResizableWidth({ storageKey: "lms.courseMapWidth.student" });
  const workspaceHeaderCollapsed = isDesktop && workspaceCollapsed;

  const videoPlayerRef = useRef(null);

  // Where the student is: ONE index into the learning sequence — restored once
  // from ?item= / ?lessonId= / the server's resume step, saved back debounced.
  const {
    stepIndex,
    setStepIndex,
    setCurrentTimestamp,
    currentTimestamp,
    initialTime,
    restoredStepIndex,
    stateRestored,
  } = useLearningStateSync({
    courseId,
    sequence,
    isSequenceLoading: isSequencePending,
    stateData,
    isStateLoading,
    updateStateMutation,
    openedWith: openedWithRef.current,
  });

  const step = steps[stepIndex] || null;
  const activeContentId = step?.contentId;
  const learningLease = usePlaybackLease(activeContentId, {
    enabled: Boolean(activeContentId && isEnrolled && !step?.locked),
  });
  const stepPath = step?.path || {};
  const selectedLesson = stepPath.lessonId ? containersById.get(stepPath.lessonId) || null : null;
  // The most specific container below the lesson (Concept, SubTopic or
  // Topic) — the one-line "where am I" label.
  const pathwayNode =
    [stepPath.conceptId, stepPath.subTopicId, stepPath.topicId]
      .map((id) => (id ? containersById.get(id) : null))
      .find(Boolean) || null;
  const pathwayTitle = pathwayNode?.title || null;
  const pathwayLevelLabel = LEVEL_LABELS[pathwayNode?.level] || "Topic";

  // SKIP / QUALIFYING TEST
  //
  // The server decides whether a skip is on offer here at all — it already
  // accounts for the lesson/topic being the student's current one, not
  // already finished or qualified, not locked, and having a published
  // qualifying quiz with questions. The player only asks, and renders.
  const skipOffer = useMemo(
    () =>
      getSkipOfferForScope(pathIndex, {
        topicId: stepPath.topicId || null,
        lessonId: stepPath.lessonId || null,
      }),
    [pathIndex, stepPath.topicId, stepPath.lessonId]
  );

  // Null until the student chooses to take the test; then it holds the offer
  // being attempted, which is also what the player renders in place of the
  // content. Cleared when they leave the test, which is all "start the test
  // then wander off" has to mean — the attempt itself lives in the quiz
  // system, which already survives a refresh and already logs every attempt.
  const [qualifyingAttempt, setQualifyingAttempt] = useState(null);

  // A skip offer that disappears underneath an open test (they passed, or the
  // path moved on) must not leave the student staring at a stale quiz.
  useEffect(() => {
    if (!qualifyingAttempt) return;
    const stillOffered = pathIndex?.byId.get(qualifyingAttempt.target.id);
    if (stillOffered && stillOffered.qualified) setQualifyingAttempt(null);
  }, [pathIndex, qualifyingAttempt]);

  const [skipModalOpen, setSkipModalOpen] = useState(false);

  // Flips once the qualifying attempt has been accepted, which is when its
  // outcome becomes readable. The decision itself is the server's — this only
  // says "there is now a result worth fetching".
  const [qualifyingSubmitted, setQualifyingSubmitted] = useState(false);

  // When the attempt was handed to the server. The result query may already
  // hold a CACHED result for this quiz — the previous attempt's — and showing
  // that would tell a student who just passed that they had failed. Only a
  // result fetched after this moment describes the attempt they just made.
  const [qualifyingSubmittedAt, setQualifyingSubmittedAt] = useState(0);

  // Bumped on every retake. Used as the quiz player's key so a retake really
  // starts a new attempt: without it the player stays mounted holding its own
  // "already submitted" state, and the student is handed back the result they
  // were trying to improve on.
  const [qualifyingRunId, setQualifyingRunId] = useState(0);

  const { data: qualifyingResultData, dataUpdatedAt: qualifyingResultFetchedAt } = useQuizResult(
    qualifyingAttempt?.quiz?.id,
    { enabled: Boolean(qualifyingAttempt) && qualifyingSubmitted }
  );
  const qualifyingResult = qualifyingResultData?.data || qualifyingResultData;
  const qualificationOutcome =
    qualifyingResultFetchedAt > qualifyingSubmittedAt ? qualifyingResult?.qualification ?? null : null;

  // Leaving the test hands the player back exactly as it was — the student
  // continues from the content they were on.
  const closeQualifyingTest = () => {
    setQualifyingAttempt(null);
    setQualifyingSubmitted(false);
  };

  // Another go at the same test. The attempt limit is the server's to enforce
  // — it refuses a submission past Quiz.attempts — so this only reopens the
  // player on a fresh attempt.
  const retakeQualifyingTest = () => {
    setQualifyingSubmitted(false);
    setQualifyingSubmittedAt(0);
    setQualifyingRunId((id) => id + 1);
  };


  // Picking a lesson or topic in the drawer should reveal it, not leave the
  // sheet covering what was just chosen.
  useEffect(() => {
    setCourseMapOpen(false);
  }, [stepIndex]);

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

  // IDLE LAYOUT — the one inactivity mechanism on this page: one timer, one
  // set of window listeners, mounted once. After IDLE_AFTER_MS without input
  // the desktop Course Map rail and the Learning Workspace header get out of
  // the way, and the next real input brings them back. Desktop only — below
  // xl it is not mounted at all: the Course Map there is a modal sheet the
  // student opened, and on a touch screen "no input" means reading it. The
  // sheet closes on its own terms only — picking an item, ✕, the backdrop or
  // Escape.
  //
  // What counts as input, and what does not:
  //  - Pointer movement only after it has really moved: browsers emit a
  //    mousemove at the same coordinates when the layout shifts under a still
  //    cursor (as it does when this very effect collapses things), and while
  //    hidden a few pixels of jitter (< MOVE_THRESHOLD_PX) are not a reveal.
  //  - A press while hidden reveals on RELEASE, not on press: re-laying out
  //    between pointerdown and click would move the control being clicked
  //    (Next, Listen, a settings button) out from under the pointer.
  //  - Keys and wheel count. "scroll" does not — it also fires for
  //    programmatic scrolling.
  // The only hold: KEYBOARD focus (:focus-visible) inside the Course Map or
  // header (data-learn-chrome), so a keyboard user's focus is never swallowed
  // by a collapsing panel. Mouse focus does not hold — clicking a lesson row
  // leaves focus on it, and holding on that (or on a resting pointer) is what
  // stopped the auto-close from ever firing after a lesson was picked.
  // While active, input only stamps lastActivity; the single timer re-checks
  // when it fires, so continuous movement never thrashes timers or state.
  useEffect(() => {
    if (!isDesktop) return undefined;
    let idle = false;
    let lastActivity = Date.now();
    let lastPointer = null;
    let idleAnchor = null;
    let revealOnRelease = false;
    let timerId = null;

    const keyboardFocusOnChrome = () => {
      const node = document.activeElement;
      return node instanceof Element && Boolean(node.closest("[data-learn-chrome]")) && node.matches(":focus-visible");
    };

    const schedule = (delay) => {
      clearTimeout(timerId);
      timerId = setTimeout(check, delay);
    };

    function check() {
      const quietFor = Date.now() - lastActivity;
      if (quietFor < IDLE_AFTER_MS) return schedule(IDLE_AFTER_MS - quietFor);
      if (keyboardFocusOnChrome()) return schedule(IDLE_AFTER_MS);
      idle = true;
      idleAnchor = lastPointer;
      // Same transition the hide buttons make; a manual collapse is kept.
      setWorkspaceCollapse((current) => current ?? "idle");
    }

    const markActive = () => {
      lastActivity = Date.now();
      if (!idle) return;
      idle = false;
      idleAnchor = null;
      // Activity only undoes what the timer did — never the student's own close.
      setWorkspaceCollapse((current) => (current === "idle" ? null : current));
      schedule(IDLE_AFTER_MS);
    };

    const onPointerMove = (event) => {
      const point = { x: event.clientX, y: event.clientY };
      if (lastPointer && point.x === lastPointer.x && point.y === lastPointer.y) return;
      lastPointer = point;
      if (idle) {
        if (!idleAnchor) {
          idleAnchor = point;
          return;
        }
        if (
          Math.abs(point.x - idleAnchor.x) < MOVE_THRESHOLD_PX &&
          Math.abs(point.y - idleAnchor.y) < MOVE_THRESHOLD_PX
        ) {
          return;
        }
      }
      markActive();
    };

    const onPointerDown = () => {
      if (idle) revealOnRelease = true;
      else lastActivity = Date.now();
    };

    const onPointerUp = () => {
      if (!revealOnRelease) return;
      revealOnRelease = false;
      // After this click has been dispatched to what was under the pointer.
      setTimeout(markActive, 0);
    };

    const listeners = [
      ["pointermove", onPointerMove],
      ["pointerdown", onPointerDown],
      ["pointerup", onPointerUp],
      ["pointercancel", onPointerUp],
      ["keydown", markActive],
      ["wheel", markActive],
    ];
    listeners.forEach(([name, handler]) => {
      window.addEventListener(name, handler, { capture: true, passive: true });
    });
    schedule(IDLE_AFTER_MS);

    return () => {
      clearTimeout(timerId);
      listeners.forEach(([name, handler]) => {
        window.removeEventListener(name, handler, { capture: true });
      });
      // Narrowed below xl while idle: nothing would undo the timer's collapse.
      setWorkspaceCollapse((current) => (current === "idle" ? null : current));
    };
  }, [isDesktop]);

  // Escape closes the below-xl Learning tools sheet, the same as its X, its
  // scrim and a swipe down. Bound only while the sheet is mounted (below xl,
  // panel open), so the desktop side panel never listens.
  useEffect(() => {
    if (isDesktop || !rightPanelOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setRightPanelOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDesktop, rightPanelOpen]);

  // Swipe down on the sheet's handle/title bar closes it.
  const toolsSheetSwipeRef = useRef(null);
  const onToolsSheetTouchStart = (event) => {
    toolsSheetSwipeRef.current = event.touches[0]?.clientY ?? null;
  };
  const onToolsSheetTouchEnd = (event) => {
    const startY = toolsSheetSwipeRef.current;
    toolsSheetSwipeRef.current = null;
    const endY = event.changedTouches[0]?.clientY;
    if (startY != null && endY != null && endY - startY > 60) setRightPanelOpen(false);
  };

  const [, setVideoDuration] = useState(0);

  const trackAccessMutation = useTrackCourseAccess();
  // Tracks entering the course. This is per-course (it backs
  // Enrollment.lastAccessedAt), so it must not re-fire as the student moves
  // between steps within that same course.
  useEffect(() => {
    if (courseId) {
      trackAccessMutation.mutate(courseId);
    }
  }, [courseId]);

  /**
   * Moves the player to step `index`. What is open is the server's answer: a
   * locked step is refused with what has to be finished first.
   * @returns whether the player moved
   */
  const goToStep = (index, list = steps) => {
    const target = list[index];
    if (!target) return false;
    if (target.locked) {
      const blocker = list[target.blockedByIndex];
      showToast(
        blocker
          ? `Finish “${blocker.title || "the previous item"}” first. ${blocker.completionHint || ""}`.trim()
          : "Finish the earlier items in this course first.",
        "error"
      );
      return false;
    }
    setStepIndex(index);
    return true;
  };
  const goToPreviousStep = () => goToStep(stepIndex - 1);
  const goToNextStep = (list = steps) => goToStep(stepIndex + 1, list);

  // A finished video completes its step and moves on — once the refreshed
  // sequence says the next step is open, so the gate never reads stale flags.
  const handleVideoEnded = async () => {
    const finished = step;
    if (!isOpenCourse && finished?.kind === "CONTENT" && !finished.completed) {
      try {
        await completeContentMutation.mutateAsync({ contentIds: finished.contentIds, completed: true });
        const { data: fresh } = await refetchSequence();
        goToNextStep(fresh?.steps || steps);
        return;
      } catch {
        // The completion failed: let the gate decide on what is known.
      }
    }
    goToNextStep();
  };

  // Marks the step on screen visited, once per Content row — drives resume,
  // and a reached step stays open for good.
  const visitedIdsRef = useRef(new Set());
  useEffect(() => {
    if (isOpenCourse || !step || step.locked || step.visited) return;
    const ids = step.contentIds.filter((id) => !visitedIdsRef.current.has(id));
    if (ids.length === 0) return;
    ids.forEach((id) => visitedIdsRef.current.add(id));
    markVisitedMutation.mutate({ contentIds: ids });
    // markVisitedMutation intentionally omitted; the ref guard prevents re-sending.
  }, [isOpenCourse, step?.contentId, step?.locked, step?.visited]);

  // Mirrors the step on screen into ?item=, so a refresh returns to this exact
  // item. history.replaceState, not router.replace — this is not navigation.
  useEffect(() => {
    if (typeof window === "undefined" || !step) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("item") === String(step.contentId)) return;
    params.set("item", String(step.contentId));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [step?.contentId]);

  // Still used by Sticky Notes (both the mobile tab and the desktop side
  // panel) to jump the video to a note's timestamp.
  const handleTranscriptSeek = (seconds) => {
    videoPlayerRef.current?.seekTo(seconds);
  };

  if (isLoading || isEnrollmentsLoading || !isEnrolled || isSequencePending || !stateRestored) {
    return <Loader />;
  }

  if (isError || !course || isSequenceError || !sequence) {
    return <Card className="text-foreground">Course not found.</Card>;
  }

  const isQuizStep = step?.kind === "QUIZ";
  const isAssignmentStep = step?.kind === "ASSIGNMENT";
  const isContentStep = step?.kind === "CONTENT";
  const contentItem =
    isContentStep && step.body
      ? { id: step.contentId, contentIds: step.contentIds, type: step.type, title: step.title, ...step.body }
      : null;

  // Completion strip. Only ordinary content is marked complete here; a quiz or
  // an assignment completes by the server's rule, so its strip is read-only
  // and says what is still required.
  activeCompletionRef.current = {
    contentIds: isContentStep ? step.contentIds : [],
    completed: Boolean(step?.completed),
  };
  // An open course keeps no progress, so it has no completion strip at all.
  const showCompletionBar = Boolean(step) && !step.locked && !qualifyingAttempt && !isEvaluator && !isOpenCourse;
  const completionBarProps = {
    completed: Boolean(step?.completed),
    isPending: completeContentMutation.isPending,
    isVideo: isContentStep && step?.type === "VIDEO",
    readOnly: !isContentStep,
    readOnlyHint: step?.completionHint || "",
    onMarkComplete: handleMarkComplete,
  };

  // A quiz not attempted yet hides the floating Prev/Next — the quiz itself is
  // the way through it.
  const hideFloatingNavForActiveQuiz = isQuizStep && !step?.attempted;

  const resultReturnTo = `/student/learn/${courseId}${step ? `?item=${step.contentId}` : ""}`;

  const renderSidePanel = ({ compact = false, tabs = false } = {}) => (
    <LearnSidePanel
      activeFeature={sidePanelFeature}
      onChangeFeature={setSidePanelFeature}
      lessonId={selectedLesson?.id ?? null}
      askTarget={
        step && !step.locked
          ? {
              kind: isQuizStep ? "quiz" : isAssignmentStep ? "assignment" : "content",
              id: isQuizStep ? step.quizId : isAssignmentStep ? step.assignmentId : step.contentId,
              title: step.title,
            }
          : null
      }
      currentTimestamp={currentTimestamp}
      onSeek={handleTranscriptSeek}
      compact={compact}
      tabs={tabs}
    />
  );

  // One Course Map on two surfaces (xl rail, below-xl drawer), drawn from the
  // same learning sequence the player walks.
  const renderCourseTree = ({ onToggleOpen, hideHeader = false }) => (
    <StudentCourseMap
      sequence={sequence}
      currentStepIndex={stepIndex}
      onSelectStep={(index) => {
        if (goToStep(index)) setCourseMapOpen(false);
      }}
      onSelectCourseOverview={() => router.push(`/student/courses/${courseId}`)}
      onToggleOpen={onToggleOpen}
      hideHeader={hideHeader}
    />
  );

  // The player frame always fills the height left in the viewport and never
  // scrolls; what changes is how the body inside it holds the content:
  //   fill   — every lesson content type. VideoPlayer fits it to the frame:
  //            video/images letterbox, slides and PDF pages scale, reading
  //            content (text, code, Word) reflows into pages.
  //   aspect — VIDEO below xl: the frame hugs the 16:9 box instead of
  //            letterboxing it inside a tall empty frame on a phone.
  //   form   — quizzes and assignments. Interactive forms cannot be paged or
  //            scaled without breaking them, so a form taller than the frame
  //            still scrolls inside the body (overscroll-contain keeps that
  //            from chaining to the page). The one place the player scrolls.
  const playerMode = qualifyingAttempt || isQuizStep || isAssignmentStep
    ? "form"
    : isContentStep && step.type === "VIDEO"
      ? "aspect"
      : "fill";

  // Literal class strings — Tailwind only emits what it can see verbatim.
  // The below-xl floor lives here, not on the frame: given both, the
  // stylesheet's order made max-xl:min-h-[280px] beat aspect's min-h-0, which
  // left ~100px of empty frame under a phone's 16:9 video.
  // aspect's max-xl:mt-5 sets the video a little below whatever is above it
  // (the lesson header, or Mark as Complete when it shows).
  const FRAME_MODE_CLASSES = {
    fill: "max-xl:min-h-[280px]",
    aspect: "max-xl:flex-none max-xl:min-h-0 max-xl:mt-5",
    form: "max-xl:min-h-[280px]",
  };
  const BODY_MODE_CLASSES = {
    fill: "overflow-hidden",
    aspect: "overflow-hidden max-xl:flex-none",
    form: "overflow-y-auto overscroll-contain",
  };

  const lessonNavProps = {
    unitLabel: LEVEL_LABELS[step?.level] || "Lesson",
    previousItem: stepIndex > 0,
    nextItem: stepIndex < steps.length - 1,
    onSelectPrevious: goToPreviousStep,
    onSelectNext: () => goToNextStep(),
  };

  // The learning ids the AI Assistant should be aware of. Quiz/assignment ids
  // are deliberately NOT passed: the assistant never retrieves assessments.
  const getAiLearningPosition = () => ({
    moduleId: stepPath.moduleId || null,
    lessonId: stepPath.lessonId || null,
    topicId: stepPath.topicId || null,
    contentIds: isContentStep ? step.contentIds : undefined,
  });

  return (
    <div className="h-full bg-[#07080f] text-foreground flex overflow-x-hidden font-sans relative">

      {/* ========================================================================= */}
      {/* COURSE CONTENT SIDEBAR — desktop only (xl+). Below xl, Course Content is  */}
      {/* ========================================================================= */}
      {/* COURSE MAP SIDEBAR — matching Instructor Course View                      */}
      {/* ========================================================================= */}
      {/* railOpen comes from workspaceCollapse alone, whoever collapsed it.
          Width 0 when closed, so the workspace gets the full width back. */}
      <div
        data-learn-chrome=""
        inert={!railOpen}
        style={{ "--course-map-w": `${courseMapResize.width}px` }}
        className={`hidden xl:block relative shrink-0 overflow-hidden ${courseMapResize.isResizing ? "" : "transition-[width] duration-300 ease-in-out"} ${railOpen ? "w-full xl:w-[var(--course-map-w)]" : "w-full xl:w-0"}`}
      >
        {railOpen && (
          <ResizeHandle
            handleProps={courseMapResize.handleProps}
            isResizing={courseMapResize.isResizing}
            label="Resize Course Map"
          />
        )}
        {/* Fixed-width inner box: while the rail animates its width the tree
            is clipped, not squeezed and re-wrapped on every frame. Its width
            follows the drag-resizable --course-map-w. */}
        <div className="w-[var(--course-map-w)] h-full">
          {renderCourseTree({
            isOpen: railOpen,
            onToggleOpen: collapseWorkspace,
          })}
        </div>
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
          <aside data-learn-chrome="" className="absolute inset-y-0 left-0 flex h-full w-[85%] max-w-[340px] flex-col bg-[#07080f] shadow-2xl animate-sidebar-in-left">
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

      {/* LEARNING TOOLS SHEET (below xl) — Ask instructor and Sticky notes
          as two tabs in a sheet from the bottom edge, opened by the lesson
          context row's More button. Same dialog idiom as the course map
          drawer above (scrim, X, Escape), plus a swipe down on its title bar.
          A fixed height, so switching tabs never makes the sheet jump; the
          tab's content scrolls inside it. */}
      {!isDesktop && rightPanelOpen && (
        <div
          id="learn-tools-sheet"
          className="xl:hidden fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Learning tools"
        >
          <div
            aria-hidden="true"
            onClick={() => setRightPanelOpen(false)}
            className="absolute inset-0 bg-black/70 animate-scrim-in"
          />
          <section className="absolute inset-x-0 bottom-0 flex h-[min(78dvh,640px)] flex-col rounded-t-2xl border-t border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl shadow-black/60 animate-sheet-in-up">
            <div className="shrink-0 pt-2" onTouchStart={onToolsSheetTouchStart} onTouchEnd={onToolsSheetTouchEnd}>
              <div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/40" />
              <div className="flex items-center justify-between gap-3 py-2.5">
                <h2 className="text-base font-bold text-foreground">Learning tools</h2>
                <button
                  type="button"
                  onClick={() => setRightPanelOpen(false)}
                  aria-label="Close learning tools"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
            {renderSidePanel({ compact: true, tabs: true })}
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN WORKSPACE CONTENT */}
      {/* ========================================================================= */}
      {/* The workspace is sized to the viewport: everything below the header
          is one flex chain down to the player frame, which takes whatever
          height is left. overflow-y-auto is only a floor for windows too
          short for the frame's min-height — normally nothing here scrolls. */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#07080f] min-w-0">

        <LearnPageHeader
          collapsed={workspaceHeaderCollapsed}
          onExpand={expandWorkspace}
          selectedLesson={selectedLesson}
          topicTitle={pathwayTitle}
          levelLabel={pathwayLevelLabel}
          course={course}
          isStickyNotesOpen={rightPanelOpen}
          onToggleStickyNotes={() => setRightPanelOpen((prev) => !prev)}
        />

        {/* ========================================================== */}
        {/* FLUID RESPONSIVE WORKSPACE CONTAINER */}
        {/* ========================================================== */}
        {/* Phone: keep the 16px side gutter so lesson text never runs to the
            screen edge, but trim the top so the lesson starts higher. At xl the
            padding all but disappears, leaving the player the most room. */}
        {/* Below xl the bottom padding clears the AI Assistant launcher
            (fixed bottom-right: 20px + 56px), so a frame that fills the
            height (documents) never leaves Previous/Next under it. */}
        <div className="flex-1 min-h-0 flex flex-col px-4 pt-3 pb-[calc(5.25rem_+_env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 md:px-8 md:pt-8 xl:px-[3.2px] xl:pt-[3.2px] xl:pb-[3.2px] min-w-0">
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
            className={`flex-1 min-h-0 grid grid-cols-1 grid-rows-[minmax(0,1fr)] gap-6 lg:gap-8 transition-[grid-template-columns] duration-300 ease-in-out ${
              rightPanelOpen ? "xl:grid-cols-[1fr_360px]" : "xl:grid-cols-1"
            }`}
          >

            {/* VIDEO — the primary learning action: first below xl, row 1 of the left column on desktop. */}
            <div className="flex flex-col gap-3 xl:gap-4 min-h-0 min-w-0 row-start-1 xl:col-start-1 xl:row-start-1">
              {/* LESSON CONTEXT — below xl only. Where the learner is, what
                  they are reading, and the overflow for everything secondary:
                  below xl the lesson owns the screen, so Ask instructor and
                  Sticky notes live behind "More" instead of permanently
                  costing a scroll. */}
              <div className="xl:hidden">
                {/* Course Map on the left, lesson identity centred on the ROW,
                    not on the space left over beside the button: the first and
                    third grid cells are the same 44px, so the middle cell's
                    centre is the row's centre. The third cell holds the More
                    trigger in a 36px circle centred inside that same 44px box,
                    so the title's centring is unchanged by it. Same
                    courseMapOpen state and drawer as before. */}
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
                    {/* Still one line: only the most specific level (Topic,
                        SubTopic or Concept) the student is in, never a stack. */}
                    {pathwayTitle && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{pathwayLevelLabel}: {pathwayTitle}</p>
                    )}
                  </div>

                  {/* MORE — the below-xl entry point to LearnSidePanel (Ask
                      instructor / Sticky notes), the same component and the
                      same rightPanelOpen/sidePanelFeature state the xl+
                      column uses; it opens the Learning tools sheet. The 44px
                      cell keeps the row's geometry; the button inside it is
                      the compact 36px circle. */}
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setRightPanelOpen((prev) => !prev)}
                      aria-expanded={rightPanelOpen}
                      aria-haspopup="dialog"
                      aria-controls="learn-tools-sheet"
                      // globals.css stamps an UNLAYERED border-radius on every
                      // <button>, and unlayered rules beat Tailwind's layered
                      // utilities — `rounded-full` alone renders a 6px square.
                      // Same inline escape hatch LearnPageHeader's More pill uses.
                      style={{ borderRadius: 9999 }}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition cursor-pointer ${
                        rightPanelOpen
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                      }`}
                      aria-label="More learning tools"
                      title="More"
                    >
                      <MoreHorizontal size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Phones only: LearnPageHeader, which carries this from sm
                    up, is hidden below sm. Evaluator accounts only. */}
                <div className="sm:hidden empty:hidden mt-3 flex">
                  <EvaluatorFeedbackButton className="w-full" />
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
              {/* SKIP OFFER — a slim bar above the player, shown only where
                  the server says this lesson/topic can be skipped by passing a
                  qualifying test. Never skips anything on click: it opens the
                  confirmation, which explains the test first. Hidden while the
                  test itself is on screen. Wraps to two lines on a phone
                  rather than truncating the explanation. */}
              {/* No next-action card here. The player is where a student is
                  READING; the answer to "what next" belongs on the dashboard
                  and on the quiz result page, which is where it now lives.
                  Above the lesson it was a full-width banner pointing away
                  from the thing on screen. */}
              {skipOffer && !qualifyingAttempt && (
                <div className="flex flex-col gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
                  <div className="flex min-w-0 items-start gap-2 sm:items-center">
                    <FastForward
                      size={15}
                      className="mt-0.5 shrink-0 text-primary sm:mt-0"
                      aria-hidden
                    />
                    <p className="min-w-0 text-xs text-foreground sm:text-sm">
                      Already know{" "}
                      <span className="font-semibold">{skipOffer.target.title}</span>? Take a short
                      qualifying test to skip it.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSkipModalOpen(true)}
                    className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center rounded-lg border border-primary/40 px-3 text-xs font-semibold text-primary transition hover:bg-primary/10 sm:min-h-[36px] sm:w-auto sm:text-sm"
                  >
                    Skip this {skipOffer.target.kind === "TOPIC" ? "topic" : "lesson"}
                  </button>
                </div>
              )}

              {/* COMPLETION (below xl) — a real button above the frame, NOT
                  the hover-reveal overlay used at xl: there is no hover on
                  touch, so an overlay keyed to group-hover would leave "mark
                  complete" permanently invisible and the block impossible to
                  finish. Above the player, so the frame is followed directly
                  by Previous/Next. Applies to whatever the frame is showing:
                  Course-, Module-, Lesson- or Topic-direct Content alike.
                  empty:hidden — the bar renders nothing once the item is
                  complete, and an empty wrapper would still add the column's
                  gap above the frame. Spaced by the column's own gap (the
                  video frame adds its own space above it — FRAME_MODE_CLASSES);
                  its smaller size is set here, the button's own styles (and
                  the xl overlay) are untouched. */}
              {showCompletionBar && (
                <div className="xl:hidden empty:hidden [&>button]:min-h-8 [&>button]:py-1 [&>button]:text-xs">
                  <ContentCompletionBar {...completionBarProps} />
                </div>
              )}

              {/* flex-1: the frame takes all the height left in the column —
                  more when the header collapses, wider when the rail does —
                  with no viewport calc to drift out of date. */}
              <div
                className={`group relative flex flex-col flex-1 min-h-[440px] rounded-2xl border border-border bg-card overflow-hidden ${FRAME_MODE_CLASSES[playerMode]}`}
              >
                {/* No dedicated header bar — lesson/topic name, the Course
                    Index reopen and the side-panel toggle all live in the top
                    bar above (LearnPageHeader). */}

                {/* One step at a time — Prev/Next walk the learning sequence
                    (content, quizzes and assignments in Content.order).
                    initialTime (the saved video position) only applies to
                    the step the page was restored to. */}
                <div className={`flex-1 min-h-0 ${BODY_MODE_CLASSES[playerMode]}`}>
                  {qualifyingAttempt && qualifyingSubmitted && qualificationOutcome ? (
                    // The attempt is in and the server has decided whether the
                    // skip was earned and, if not, what to go back to.
                    <div className="p-2.5 sm:p-5">
                      <QualificationResultPanel
                        qualification={qualificationOutcome}
                        targetTitle={qualifyingAttempt.target.title}
                        onContinue={closeQualifyingTest}
                        onRetake={retakeQualifyingTest}
                        // Recommended content opens through the same
                        // server-gated navigation as everything else.
                        onOpenContent={(item) => {
                          if (item.kind !== "TOPIC" || !item.id) return;
                          const index = steps.findIndex((candidate) => candidate.path?.topicId === item.id);
                          if (index >= 0 && goToStep(index)) closeQualifyingTest();
                        }}
                      />
                    </div>
                  ) : qualifyingAttempt ? (
                    <div className="p-2.5 sm:p-5">
                      <QuizExperience
                        key={`qualifying:${qualifyingAttempt.quiz.id}:${qualifyingRunId}`}
                        quizId={qualifyingAttempt.quiz.id}
                        onBack={closeQualifyingTest}
                        resultReturnTo={resultReturnTo}
                        onNextContent={closeQualifyingTest}
                        onSubmitted={() => {
                          setQualifyingSubmittedAt(Date.now());
                          setQualifyingSubmitted(true);
                        }}
                        autoReattempt
                        speechLanguage={course?.language}
                      />
                    </div>
                  ) : !step ? (
                    <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
                      This course has no content yet.
                    </div>
                  ) : step.locked ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                      <Lock size={28} className="text-muted-foreground" aria-hidden="true" />
                      <p className="font-semibold text-foreground">{step.title || "This item"} is locked.</p>
                      <p className="text-sm text-muted-foreground">
                        Finish “{steps[step.blockedByIndex]?.title || "the previous item"}” first.
                      </p>
                    </div>
                  ) : isAssignmentStep ? (
                    <div className="p-2.5 sm:p-5">
                      <AssignmentWorkspacePanel
                        key={step.assignmentId}
                        assignmentId={step.assignmentId}
                        completed={step.completed}
                        onNextContent={() => goToNextStep()}
                      />
                    </div>
                  ) : isQuizStep ? (
                    <div className="p-2.5 sm:p-5">
                      <QuizExperience
                        key={step.quizId}
                        quizId={step.quizId}
                        onBack={goToPreviousStep}
                        resultReturnTo={resultReturnTo}
                        onNextContent={() => goToNextStep()}
                        speechLanguage={course?.language}
                      />
                    </div>
                  ) : (
                    <LessonContentBlock
                      item={contentItem}
                      lease={learningLease}
                      videoPlayerRef={videoPlayerRef}
                      onTimeUpdate={setCurrentTimestamp}
                      onDurationChange={setVideoDuration}
                      onEnded={handleVideoEnded}
                      initialTime={stepIndex === restoredStepIndex ? initialTime : 0}
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

                {/* COMPLETION (xl and up) — always visible, NOT hover-gated
                    like the Prev/Next corner overlay above: Prev/Next have
                    always-visible fallbacks elsewhere (the below-frame nav,
                    the sidebar), but this control is the ONLY way to satisfy
                    canLeaveBlock's gate for a non-auto-completing content
                    block, so hiding it behind hover left it undiscoverable —
                    a student reading text with the mouse never near the top-
                    right corner would never see it, and "Next" would just
                    silently refuse to advance. reserveHeaderCorner (passed to
                    LessonContentBlock/VideoPlayer below) already keeps the
                    frame's own header controls clear of this corner
                    regardless of hover state, so making the button itself
                    permanently visible here doesn't introduce any overlap.
                    z-30: the content header underneath (VideoPlayer's title
                    bar) is `xl:sticky` with an explicit `z-20` — without a
                    higher z-index here this overlay has no stacking value of
                    its own (auto), so the sticky header's own layer painted
                    on top of it and silently swallowed every click aimed at
                    this corner. That was already true before this control
                    became always-visible: on hover it was seen but never
                    actually clickable in that region, which reads exactly
                    like "Mark as Complete doesn't do anything." */}
                {showCompletionBar && (
                  <div className="max-xl:hidden absolute top-3 right-3 z-30">
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

            </div>

            {/* SIDE PANEL — the xl+ surface. Collapsed state renders no grid
                column at all (see grid-cols above) — the player gets the full
                width back. Below xl the same panel is reached through the
                lesson context row's "More" popover instead, so it never takes
                a column out of a one-column layout. */}
            {rightPanelOpen && (
              <div className="hidden xl:block min-w-0 xl:col-start-2 xl:row-start-1 xl:self-start xl:max-h-full xl:overflow-y-auto w-full xl:w-[360px]">
                {renderSidePanel()}
              </div>
            )}


          </div>
        </div>
        {/* Skip confirmation. Explains the qualifying test and what passing or
            failing does; "Take Qualifying Test" only opens the quiz, it never
            skips anything by itself. */}
        <SkipQualificationModal
          isOpen={skipModalOpen && Boolean(skipOffer)}
          onClose={() => setSkipModalOpen(false)}
          onTakeTest={() => {
            setSkipModalOpen(false);
            setQualifyingAttempt(skipOffer);
          }}
          target={skipOffer?.target}
          quiz={skipOffer?.quiz}
        />
        {/* AI Assistant. Reads the learning ids this page already owns — no
            duplicate learning state. Only ids are handed over; the backend
            refetches the material itself and re-checks enrollment per turn,
            so `isEnrolled` here is a UI hint, never a grant. Quiz/assignment
            ids are deliberately NOT passed: the assistant never retrieves
            assessment material. On a desktop video step it sits bottom-left,
            clear of the player's fullscreen control in the bottom-right.
            Below xl the player hugs its 16:9 box near the top of the page,
            so the launcher keeps the usual bottom-right corner there. */}
        <AiAssistantWidget
          courseId={courseId}
          courseTitle={course?.title}
          isEnrolled={isEnrolled}
          getPosition={getAiLearningPosition}
          side={isDesktop && playerMode === "aspect" ? "left" : "right"}
        />
      </div>
    </div>
  );
}