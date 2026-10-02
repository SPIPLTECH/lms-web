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
import SkipQualificationModal from "@/components/student/learning/SkipQualificationModal";
import QualificationResultPanel from "@/components/student/learning/QualificationResultPanel";
import StudentCourseMap from "@/components/student/learning/StudentCourseMap";
import { rendersUploadedDeck } from "@/components/student/learning/VideoPlayer";

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
import useQuizResult from "@/hooks/queries/student/useQuizResult";
import useMyCourses from "@/hooks/queries/student/useMyCourses";
import useTrackCourseAccess from "@/hooks/queries/student/useTrackCourseAccess";
import useLearningStateSync from "@/hooks/queries/student/useLearningStateSync";
import useMediaQuery from "@/hooks/useMediaQuery";

import Loader from "@/components/common/Loader";
import Card from "@/components/ui/Card";
import { ChatWidget } from "@/components/chat";
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

  // Course metadata only (title, language): what the player walks comes from
  // the learning sequence below.
  const { data: course, isLoading, isError } = useCourse(courseId);

  // Same enrollment gate as /student/courses/[courseId] — this is the actual
  // lesson content, not just an overview. A non-enrolled student who reaches
  // this URL directly is sent to the public course page instead of the player.
  const { data: myEnrollments, isLoading: isEnrollmentsLoading } = useMyCourses();
  const isEnrolled = (myEnrollments || []).some((e) => (e.courseId || e.course?.id) === courseId);

  useEffect(() => {
    if (!isEnrollmentsLoading && !isEnrolled) {
      router.replace(`/courses/${courseId}`);
    }
  }, [isEnrollmentsLoading, isEnrolled, courseId, router]);

  // THE learning sequence: every Content item — ordinary content, quizzes and
  // assignments — as one ordered list of steps, with the server's completed /
  // visited / locked flags. Prev/Next, the Course Map, resume and the
  // completion strip all read it; nothing here orders, merges or gates items.
  const {
    data: sequence,
    isPending: isSequencePending,
    isError: isSequenceError,
    refetch: refetchSequence,
  } = useLearningSequence(courseId, { enabled: isEnrolled });
  const steps = sequence?.steps || [];
  const containersById = useMemo(() => indexContainers(sequence?.tree), [sequence]);

  const completeContentMutation = useCompleteContent();
  const markVisitedMutation = useMarkVisited();

  // The server's lesson/topic path — read here only for qualifying-test
  // (skip) offers.
  const { data: learningPathData } = useLearningPath(courseId);
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

  // Course Content Sidebar toggle state — open by default so the Course
  // Index is what a student sees on first arriving at a lesson.
  const [courseSidebarOpen, setCourseSidebarOpen] = useState(true);
  // Below xl the course map is a temporary sheet, so it starts closed.
  const [courseMapOpen, setCourseMapOpen] = useState(false);

  // Whether the Course Map's last close was the inactivity timeout below
  // (automatic) rather than the student closing it (the collapse button, the
  // drawer's X / scrim / Escape, or picking a lesson). Only the timeout sets
  // it, and auto-opening clears it, so a manual close never reopens itself.
  // A ref, not state: it is read inside window listeners and must not cause a
  // render of its own.
  const autoClosedRef = useRef(false);
  // Where the pointer was when the auto-close happened, so a single stray
  // mousemove (a layout shift under a still cursor) cannot count as activity.
  const autoOpenAnchorRef = useRef(null);

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
  const moreMenuRef = useRef(null);

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

  // Automatically close/collapse the active Course Map after 5 seconds of inactivity.
  // Desktop Course Map is controlled by courseSidebarOpen, Mobile Course Map by courseMapOpen.
  useEffect(() => {
    const isMapActive = isDesktop ? courseSidebarOpen : courseMapOpen;
    if (!isMapActive) return;

    let timerId = null;
    let lastResetTime = 0;

    const closeMap = () => {
      // Read by the auto-open effect below: this close was not the student's.
      autoClosedRef.current = true;
      autoOpenAnchorRef.current = null;
      if (isDesktop) {
        setCourseSidebarOpen(false);
      } else {
        setCourseMapOpen(false);
      }
    };

    const startTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        closeMap();
      }, 5000);
    };

    const handleActivity = (event) => {
      const now = Date.now();
      // Throttle high-frequency movement events so continuous jitter does not thrash timer resets
      if (event && (event.type === "mousemove" || event.type === "pointermove")) {
        if (now - lastResetTime < 1000) return;
      }
      lastResetTime = now;
      startTimer();
    };

    startTimer();

    const activityEvents = [
      "mousemove",
      "mousedown",
      "pointermove",
      "pointerdown",
      "touchstart",
      "touchmove",
      "keydown",
      "scroll",
      "wheel",
      "click",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { capture: true, passive: true });
    });

    return () => {
      if (timerId) clearTimeout(timerId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity, { capture: true });
      });
    };
  }, [isDesktop, courseSidebarOpen, courseMapOpen]);

  // Reopens the Course Map on the next genuine interaction — but only when
  // the inactivity timeout above is what closed it. A close the student
  // performed leaves autoClosedRef false, so it stays closed until they open
  // it again. Reopening starts a fresh 5-second timer through the effect
  // above (the map is open again, so it binds), which is what makes the
  // close -> activity -> open -> close cycle repeat.
  //
  // One mechanism for both surfaces, the same way the timeout is: desktop
  // collapses the in-flow rail (courseSidebarOpen), below xl it is the
  // off-canvas drawer (courseMapOpen). Nothing else about either is touched.
  useEffect(() => {
    const isMapActive = isDesktop ? courseSidebarOpen : courseMapOpen;
    if (isMapActive || !autoClosedRef.current) return;

    // Pointer movement only counts once it has actually travelled: a
    // re-render, a video frame or a layout shift can emit a single mousemove
    // under a motionless cursor, and none of those are the student.
    const MOVE_THRESHOLD_PX = 8;

    const reopen = () => {
      autoClosedRef.current = false;
      autoOpenAnchorRef.current = null;
      if (isDesktop) {
        setCourseSidebarOpen(true);
      } else {
        setCourseMapOpen(true);
      }
    };

    const handleActivity = (event) => {
      if (event.type === "mousemove" || event.type === "pointermove") {
        const point = { x: event.clientX, y: event.clientY };
        const anchor = autoOpenAnchorRef.current;
        if (!anchor) {
          autoOpenAnchorRef.current = point;
          return;
        }
        if (
          Math.abs(point.x - anchor.x) < MOVE_THRESHOLD_PX &&
          Math.abs(point.y - anchor.y) < MOVE_THRESHOLD_PX
        ) {
          return;
        }
      }
      reopen();
    };

    // Same gestures the timer resets on, minus `scroll`: that one also fires
    // for programmatic scrolling (restoring a position, revealing a block),
    // while real scrolling still arrives as wheel / touchmove / keydown.
    const activityEvents = [
      "mousemove",
      "mousedown",
      "pointermove",
      "pointerdown",
      "touchstart",
      "touchmove",
      "keydown",
      "wheel",
      "click",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { capture: true, passive: true });
    });

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity, { capture: true });
      });
    };
  }, [isDesktop, courseSidebarOpen, courseMapOpen]);

  // The below-xl "More" popover dismisses on a tap outside it or Escape —
  // the same idiom AskInstructorCard's own popover uses. moreMenuRef wraps
  // the trigger as well as the menu, so pressing the button dismisses via
  // its onClick toggle rather than closing here and reopening. Bound only
  // while the popover is actually mounted (below xl, panel open), so the
  // desktop side panel never listens.
  useEffect(() => {
    if (isDesktop || !rightPanelOpen) return;
    const onPointerDown = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setRightPanelOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setRightPanelOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isDesktop, rightPanelOpen]);

  const [, setVideoDuration] = useState(0);

  const trackAccessMutation = useTrackCourseAccess();
  // Track course access whenever the student enters the course or moves to another step.
  useEffect(() => {
    if (courseId) {
      trackAccessMutation.mutate(courseId);
    }
  }, [courseId, stepIndex]);

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
    if (finished?.kind === "CONTENT" && !finished.completed) {
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
    if (!step || step.locked || step.visited) return;
    const ids = step.contentIds.filter((id) => !visitedIdsRef.current.has(id));
    if (ids.length === 0) return;
    ids.forEach((id) => visitedIdsRef.current.add(id));
    markVisitedMutation.mutate({ contentIds: ids });
    // markVisitedMutation intentionally omitted; the ref guard prevents re-sending.
  }, [step?.contentId, step?.locked, step?.visited]);

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
  const showCompletionBar = Boolean(step) && !step.locked && !qualifyingAttempt;
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

  const renderSidePanel = ({ compact = false } = {}) => (
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

  // Below xl, who owns height and scrolling depends on WHAT is on screen:
  //   aspect — video / uploaded deck; natural — assignment form;
  //   reading — text/HTML; contained — quiz and PDF/DOC/external.
  const playerMode =
    isContentStep && (step.type === "VIDEO" || (contentItem && rendersUploadedDeck(contentItem)))
      ? "aspect"
      : isAssignmentStep
        ? "natural"
        : isContentStep && !["FILE", "DOCUMENT", "PDF"].includes(step.type)
          ? "reading"
          : "contained";

  // Literal class strings — Tailwind only emits what it can see verbatim.
  const FRAME_MODE_CLASSES = {
    natural: "max-xl:h-auto max-xl:min-h-0 max-xl:max-h-none",
    aspect: "max-xl:h-auto max-xl:min-h-0 max-xl:max-h-none",
    reading: "max-xl:h-[68dvh] max-xl:min-h-[360px] max-xl:max-h-none",
    contained: "max-xl:h-[68dvh] max-xl:min-h-[360px] max-xl:max-h-none",
  };
  const deckFrameSizing = "";
  const BODY_MODE_CLASSES = {
    natural: "max-xl:flex-none max-xl:overflow-y-visible",
    aspect: "max-xl:flex-none max-xl:overflow-y-visible",
    reading: "max-xl:overflow-y-hidden",
    contained: "",
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
                      column uses. The 44px cell keeps the row's geometry; the
                      button inside it is the compact 36px circle. */}
                  <div ref={moreMenuRef} className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setRightPanelOpen((prev) => !prev)}
                      aria-expanded={rightPanelOpen}
                      aria-haspopup="dialog"
                      aria-controls="learn-more-menu"
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

                    {/* Anchored to the trigger and capped to the viewport's
                        gutters, so it never widens the page or pushes the
                        player down — same technique, and the same role, as
                        AskInstructorCard's own popover. Tall content scrolls
                        inside it rather than running off the bottom of the
                        screen.

                        LearnSidePanel lays its two triggers out side by side,
                        which fits the 360px desktop column but truncates
                        ("Ask instruc…") at every phone width. Stacking them
                        is presentation only, scoped to this call site — same
                        treatment the course map drawer gives the course tree
                        — so the desktop panel keeps its two-up row. */}
                    {!isDesktop && rightPanelOpen && (
                      <div
                        id="learn-more-menu"
                        role="dialog"
                        aria-label="Learning tools"
                        className="absolute right-0 top-full z-40 mt-2 max-h-[70vh] w-[min(22rem,calc(100vw-2.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-2.5 text-left shadow-2xl shadow-black/40 [&_[role=group]]:grid-cols-1"
                      >
                        {renderSidePanel({ compact: true })}
                      </div>
                    )}
                  </div>
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
                <div className="mb-2 flex flex-col gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
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

              <div className={`group relative flex flex-col h-[calc(100vh-147px)] min-h-[440px] max-h-[900px] rounded-2xl border border-border bg-card overflow-hidden ${FRAME_MODE_CLASSES[playerMode]} ${deckFrameSizing}`}>
                {/* No dedicated header bar — lesson/topic name, the Course
                    Index reopen and the side-panel toggle all live in the top
                    bar above (LearnPageHeader). */}

                {/* One step at a time — Prev/Next walk the learning sequence
                    (content, quizzes and assignments in Content.order).
                    initialTime (the saved video position) only applies to
                    the step the page was restored to. */}
                <div className={`flex-1 overflow-y-auto min-h-0 ${BODY_MODE_CLASSES[playerMode]}`}>
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

            {/* SIDE PANEL — the xl+ surface. Collapsed state renders no grid
                column at all (see grid-cols above) — the player gets the full
                width back. Below xl the same panel is reached through the
                lesson context row's "More" popover instead, so it never takes
                a column out of a one-column layout. */}
            {rightPanelOpen && (
              <div className="hidden xl:block min-w-0 xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:sticky xl:top-24 xl:h-fit w-full xl:w-[360px]">
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
        <ChatWidget />
        {/* AI Assistant. Reads the learning ids this page already owns — no
            duplicate learning state. Only ids are handed over; the backend
            refetches the material itself and re-checks enrollment per turn,
            so `isEnrolled` here is a UI hint, never a grant. Quiz/assignment
            ids are deliberately NOT passed: the assistant never retrieves
            assessment material. */}
        <AiAssistantWidget
          courseId={courseId}
          courseTitle={course?.title}
          isEnrolled={isEnrolled}
          getPosition={getAiLearningPosition}
        />
      </div>
    </div>
  );
}