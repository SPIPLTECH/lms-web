"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import useMyCourses from "@/hooks/queries/student/useMyCourses";
import useCompleteOnboarding from "@/hooks/queries/student/useCompleteOnboarding";
import StudentTour, { TOUR_STEPS } from "@/components/student/onboarding/StudentTour";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { getLearningSequence } from "@/services/progress.service";
import { getStudentState } from "@/services/student.service";
import {
  needsOnboarding,
  readSeenSteps,
  resolveTourCourseId,
  writeSeenSteps,
} from "@/lib/studentOnboarding";

const StudentTourContext = createContext(null);

const INACTIVE = {
  active: false,
  stepKey: null,
  canStart: false,
  seen: {},
  lessonMeta: null,
  updateLessonMeta: () => {},
  start: () => {},
  close: () => {},
  skip: () => {},
  finish: () => {},
  signal: () => {},
};

/**
 * The guided tour's state for every Student page. Mounted at the root of the
 * Student layout so the tour survives moving between My Courses, the learning
 * page and Submissions. It runs on the course "Continue Learning" opens (the
 * most recently opened enrollment), so a student with no enrollment yet has
 * nothing to tour and `canStart` is false.
 *
 * For eligible first-time students (StudentProfile.onboardingCompletedAt === null),
 * the tour automatically opens on first arrival after login.
 *
 * Finishing the tour, skipping it, or dismissing it records onboarding as completed
 * on the server, so it is never shown again on subsequent logins.
 */
export function StudentTourProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: enrollments = [] } = useMyCourses();
  const completeOnboarding = useCompleteOnboarding();

  const courseId = useMemo(
    () => resolveTourCourseId(pathname, enrollments),
    [pathname, enrollments]
  );
  const [index, setIndex] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const pendingIndexRef = useRef(null);
  const [signals, setSignals] = useState({});
  const [seen, setSeen] = useState({});
  const [lessonMeta, setLessonMeta] = useState(null);

  // Background prefetch: When courseId is resolved (e.g. while student views the welcome modal
  // or on any student page), prefetch the Next.js learn route, the learning sequence and the saved position.
  // This turns a cold ~10-15s load into an instantaneous transition by the time the student clicks
  // "Start the tour".
  useEffect(() => {
    if (!courseId) return;
    try {
      router.prefetch(`/student/learn/${courseId}`);
      router.prefetch("/student/assignments");
    } catch {
      // prefetch silently ignored if not supported
    }

    // The learn page reads the sequence with its learning path (and the course
    // title/language) from this one key — useLearningSequence(…, { withPath }).
    // Any other key would be a second whole roll-up on the server, queued
    // ahead of the page's own request.
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.LEARNING_SEQUENCE, courseId, null, "with-path"],
      queryFn: () => getLearningSequence(courseId, null, { includePath: true }),
      staleTime: 5 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.STUDENT_STATE, courseId],
      queryFn: () => getStudentState(courseId),
      staleTime: 5 * 60 * 1000,
    });
  }, [courseId, router, queryClient]);

  const updateLessonMeta = useCallback((meta) => {
    setLessonMeta((prev) => {
      if (!meta) return null;
      return { ...prev, ...meta };
    });
  }, []);

  useEffect(() => {
    setSeen(readSeenSteps(user?.id));
  }, [user?.id]);

  // Kept current for goTo, which runs from timers and child callbacks.
  const live = useRef({});
  live.current = { pathname, courseId, userId: user?.id };

  // Watch for route changes to advance pending tour steps once the destination route mounts
  useEffect(() => {
    if (pendingIndexRef.current === null) return;
    const targetIdx = pendingIndexRef.current;
    const targetStep = TOUR_STEPS[targetIdx];
    if (!targetStep) {
      pendingIndexRef.current = null;
      setIsNavigating(false);
      return;
    }
    const id = live.current.courseId;
    const readyForLearn = targetStep.route === "learn" && pathname?.startsWith(`/student/learn/${id}`);
    const readyForSubs = targetStep.route === "submissions" && pathname === "/student/assignments";
    const readySameRoute = !targetStep.route || (targetStep.route !== "learn" && targetStep.route !== "submissions");

    if (readyForLearn || readyForSubs || readySameRoute) {
      setIndex(targetIdx);
      pendingIndexRef.current = null;
      setIsNavigating(false);
    }
  }, [pathname]);

  // Safety fallback: if route change takes longer than 4s, advance anyway
  useEffect(() => {
    if (!isNavigating) return undefined;
    const timer = setTimeout(() => {
      if (pendingIndexRef.current !== null) {
        setIndex(pendingIndexRef.current);
        pendingIndexRef.current = null;
      }
      setIsNavigating(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [isNavigating]);

  const goTo = useCallback(
    (i) => {
      const step = TOUR_STEPS[i];
      if (!step) return;
      const { pathname: path, courseId: id, userId } = live.current;

      const needsRouteToLearn = step.route === "learn" && id && !path?.startsWith(`/student/learn/${id}`);
      const needsRouteToSubs = step.route === "submissions" && path !== "/student/assignments";

      if (needsRouteToLearn || needsRouteToSubs) {
        setIsNavigating(true);
        pendingIndexRef.current = i;
        if (needsRouteToLearn) {
          router.push(`/student/learn/${id}`);
        } else if (needsRouteToSubs) {
          router.push("/student/assignments");
        }
      } else {
        setIndex(i);
        pendingIndexRef.current = null;
        setIsNavigating(false);
      }

      if (step.seen) {
        setSeen((prev) => {
          if (prev[step.seen]) return prev;
          const next = { ...prev, [step.seen]: true };
          writeSeenSteps(userId, next);
          return next;
        });
      }
    },
    [router]
  );

  const start = useCallback(
    (stepKey = null) => {
      if (!live.current.courseId) return;
      const at = stepKey ? TOUR_STEPS.findIndex((s) => s.key === stepKey) : 0;
      goTo(at > 0 ? at : 0);
    },
    [goTo]
  );

  const markCompletedIfNeeded = useCallback(() => {
    if (needsOnboarding(user)) {
      completeOnboarding.mutate();
    }
    const sessionKey = user?.id ? `student_tour_auto_started:${user.id}` : null;
    if (sessionKey && typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(sessionKey, "true");
      } catch {
        // Storage disabled or blocked
      }
    }
  }, [user, completeOnboarding]);

  const close = useCallback(() => {
    pendingIndexRef.current = null;
    setIsNavigating(false);
    setIndex(null);
    markCompletedIfNeeded();
    const { pathname: path, courseId: id } = live.current;
    if (path === "/student/assignments" && id) {
      router.push(`/student/learn/${id}`);
    }
  }, [markCompletedIfNeeded, router]);

  const skip = useCallback(() => {
    pendingIndexRef.current = null;
    setIsNavigating(false);
    setIndex(null);
    markCompletedIfNeeded();
    const { pathname: path, courseId: id } = live.current;
    if (path === "/student/assignments" && id) {
      router.push(`/student/learn/${id}`);
    }
  }, [markCompletedIfNeeded, router]);

  const finish = useCallback(() => {
    pendingIndexRef.current = null;
    setIsNavigating(false);
    setIndex(null);
    markCompletedIfNeeded();
    const id = live.current.courseId;
    if (id) router.push(`/student/learn/${id}`);
  }, [markCompletedIfNeeded, router]);

  // Auto-start for eligible first-time students on initial successful login
  const autoStartedUserIdRef = useRef(null);
  const autoStartedRef = useRef(false);

  if (autoStartedUserIdRef.current !== user?.id) {
    autoStartedUserIdRef.current = user?.id;
    autoStartedRef.current = false;
  }

  useEffect(() => {
    if (!needsOnboarding(user)) return;
    if (!courseId) return;
    if (index !== null) return;

    const force = typeof window !== "undefined" && (() => {
      try {
        const p = new URLSearchParams(window.location.search);
        return p.get("onboarding") === "true" || p.get("onboarding") === "1";
      } catch {
        return false;
      }
    })();

    const sessionKey = user?.id ? `student_tour_auto_started:${user.id}` : null;
    if (!force) {
      if (autoStartedRef.current) return;
      if (sessionKey && typeof window !== "undefined") {
        try {
          if (window.sessionStorage.getItem(sessionKey) === "true") return;
        } catch {
          // ignore storage error
        }
      }
    }

    autoStartedRef.current = true;
    if (sessionKey && typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(sessionKey, "true");
      } catch {
        // ignore storage error
      }
    }

    goTo(0);
  }, [user, courseId, index, goTo]);

  const signal = useCallback((name) => setSignals((s) => ({ ...s, [name]: (s[name] || 0) + 1 })), []);

  const value = useMemo(
    () => ({
      active: index !== null,
      stepKey: index === null ? null : TOUR_STEPS[index].key,
      canStart: Boolean(courseId),
      seen,
      lessonMeta,
      updateLessonMeta,
      start,
      close,
      skip,
      finish,
      signal,
    }),
    [index, courseId, seen, lessonMeta, updateLessonMeta, start, close, skip, finish, signal]
  );

  return (
    <StudentTourContext.Provider value={value}>
      {children}
      {index !== null && (
        <StudentTour
          index={index}
          signals={signals}
          seen={seen}
          lessonMeta={lessonMeta}
          isNavigating={isNavigating}
          onNext={() => goTo(Math.min(index + 1, TOUR_STEPS.length - 1))}
          onBack={() => goTo(Math.max(index - 1, 1))}
          onClose={close}
          onSkip={skip}
          onFinish={finish}
        />
      )}
    </StudentTourContext.Provider>
  );
}

// Inert outside the Student layout (DashboardNavbar is shared by every role).
export function useStudentTour() {
  return useContext(StudentTourContext) || INACTIVE;
}
