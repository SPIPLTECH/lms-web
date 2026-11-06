"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import useCourse from "@/hooks/queries/student/useCourse";
import useMyCourses from "@/hooks/queries/student/useMyCourses";
import useTrackCourseAccess from "@/hooks/queries/student/useTrackCourseAccess";
import useLearningSequence from "@/hooks/queries/student/useLearningSequence";
import { normalizeCourseHierarchy } from "@/lib/courseMapper";
import { courseOverviewHref, learnHref, looksLikeCourseId, resolveCourseKey } from "@/lib/courseSlug";

/**
 * What both student course pages — the details page and its course map —
 * need: the enrolment guard, the course, the learning sequence, and where
 * the player's "Continue" lands.
 *
 * Nothing here is reachable before enrolment: a logged-in student could
 * otherwise reach a course just by typing its URL. Enrolment happens on the
 * main Orange Tree site, so a non-enrolled visitor is sent back to their own
 * courses.
 *
 * The learning sequence shares its query key with the player, so opening the
 * player afterwards is served from cache rather than a second round trip.
 *
 * @param {string} courseKey the route's key: a course id or a readable slug
 * @returns {{ status: "loading"|"error"|"ready", course, courseId: string|null,
 *   sequence, isEnrolled, isComplete: boolean, overviewPath: string|null,
 *   learnPath: string|null, actionLabel: string, hasNoContent: boolean }}
 */
export default function useStudentCoursePage(courseKey) {
  const router = useRouter();

  const { data: myEnrollments = [], isLoading: isEnrollmentsLoading } = useMyCourses();
  // Either form resolves to the cuid id among the student's own enrollments; an
  // id-shaped key is used at once, so an id link does not wait for the list.
  const courseId = useMemo(
    () => resolveCourseKey(courseKey, myEnrollments) || (looksLikeCourseId(courseKey) ? courseKey : null),
    [courseKey, myEnrollments]
  );

  const { data: rawCourse, isLoading, isError } = useCourse(courseId);
  const course = normalizeCourseHierarchy(rawCourse);
  const { data: sequence } = useLearningSequence(courseId);

  const isEnrolled = Boolean(courseId && myEnrollments.some((e) => (e.courseId || e.course?.id) === courseId));

  const trackAccessMutation = useTrackCourseAccess();
  useEffect(() => {
    if (!isEnrollmentsLoading && !isEnrolled) {
      router.replace("/student/my-courses");
    } else if (!isEnrollmentsLoading && isEnrolled && courseId) {
      trackAccessMutation.mutate(courseId);
    }
    // trackAccessMutation is a new object every render; tracking once per
    // course and enrolment answer is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnrollmentsLoading, isEnrolled, courseId, router]);

  // The Continue button's words. Any progress at all (a visited item, a
  // completed one, or a quiz attempt — attempting marks it visited too) means
  // Start has already happened.
  const steps = sequence?.steps || null;
  const hasNoContent = Array.isArray(steps) && steps.length === 0;
  const hasProgress = (steps || []).some((s) => s.visited || s.completed);
  const isComplete = !!steps && steps.length > 0 && steps.every((s) => s.completed);
  const tracksProgress = course?.sequentialLearning !== false;
  const actionLabel = hasNoContent
    ? "No content yet"
    : !tracksProgress
      ? "Open course"
      : isComplete
        ? "Review course"
        : hasProgress
          ? "Continue learning"
          : "Start learning";

  const status = isLoading || isEnrollmentsLoading || !isEnrolled ? "loading" : isError || !course ? "error" : "ready";
  // The learn page is addressed by the course's readable key, not its id.
  const learnPath = course ? learnHref({ id: courseId, title: course.title }, myEnrollments) : null;
  const overviewPath = course ? courseOverviewHref({ id: courseId, title: course.title }, myEnrollments) : null;

  return { status, course, courseId, sequence, isEnrolled, isComplete, overviewPath, learnPath, actionLabel, hasNoContent };
}
