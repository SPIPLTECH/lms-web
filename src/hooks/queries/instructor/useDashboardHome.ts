import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { defaultQueryOptions } from "@/lib/queryOptions";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { getCourses, getCourseStatusCounts } from "@/services/course.service";
import { getModules } from "@/services/module.service";
import { getQuizzes } from "@/services/quiz.service";
import { getAssignments } from "@/services/assignment.service";
import { getInstructorAssignmentContents } from "@/services/content.service";
import { getResults } from "@/services/results.service";
import { getCalendarEvents } from "@/services/calendar.service";
import { getNotifications as getRawNotifications } from "@/services/notification.service";
import { getConversations } from "@/features/chat/api/chat.api";
import {
  deriveDashboardStats,
  deriveNeedsAttention,
  deriveRecentActivities,
  deriveCourseProgressOverview,
  deriveRecentSubmissions,
  deriveGradeDistribution,
  getAnnouncements,
  type RawAssignment,
  type RawCalendarEvent,
  type RawConversation,
  type RawCourse,
  type RawModule,
  type RawNotification,
  type RawQuiz,
  type RawResult,
  type RecentTestResult,
} from "@/services/instructor/dashboardHome.service";

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/* ----------------------------------------------------------------------- *
 * Every raw resource is fetched exactly once here, behind a stable query
 * key, and reused by every derived hook that needs it — so the dashboard
 * never issues duplicate requests for the same backend resource.
 * ----------------------------------------------------------------------- */

const useRawCourses = () =>
  useQuery({
    queryKey: ["instructor-home", "raw", "courses"],
    queryFn: async () => asArray<RawCourse>(await getCourses()),
    ...defaultQueryOptions,
  });

const useRawModules = () =>
  useQuery({
    queryKey: ["instructor-home", "raw", "modules"],
    queryFn: async () => asArray<RawModule>(await getModules()),
    ...defaultQueryOptions,
  });

const useRawQuizzes = () =>
  useQuery({
    queryKey: ["instructor-home", "raw", "quizzes"],
    queryFn: async () => asArray<RawQuiz>(await getQuizzes()),
    ...defaultQueryOptions,
  });

const useRawAssignments = () =>
  useQuery({
    queryKey: ["instructor-home", "raw", "assignments"],
    queryFn: async () => asArray<RawAssignment>(await getAssignments()),
    ...defaultQueryOptions,
  });

/**
 * Calendar and notifications are fetched under the app-wide canonical keys
 * rather than dashboard-private ones. NotificationContext and MiniCalendar
 * already read [CALENDAR] / [NOTIFICATIONS]; keeping a separate
 * "instructor-home/raw" key here meant React Query could not dedupe, so the
 * dashboard issued a second request for data already in the cache.
 */
const useRawCalendarEvents = () =>
  useQuery({
    queryKey: [QUERY_KEYS.CALENDAR],
    queryFn: async () => asArray<RawCalendarEvent>(await getCalendarEvents()),
    ...defaultQueryOptions,
  });

const useRawNotifications = () =>
  useQuery({
    queryKey: [QUERY_KEYS.NOTIFICATIONS],
    queryFn: async () => asArray<RawNotification>(await getRawNotifications()),
    ...defaultQueryOptions,
    staleTime: 1000 * 60 * 2,
  });

const useRawConversations = () =>
  useQuery({
    queryKey: ["instructor-home", "raw", "conversations"],
    queryFn: async () => {
      const response = await getConversations();
      const payload = response as { data?: unknown } | unknown[];
      return asArray<RawConversation>(
        Array.isArray(payload) ? payload : (payload as { data?: unknown }).data
      );
    },
    ...defaultQueryOptions,
    staleTime: 1000 * 60 * 2,
  });

/**
 * Server-computed summary counts. Every field is a single number produced by a
 * COUNT in the database — this replaces counting the length of a fetched list,
 * which was silently wrong because GET /courses is paginated at 10 by default.
 */
export const useCourseStatusCounts = () =>
  useQuery({
    queryKey: [QUERY_KEYS.INSTRUCTOR_COURSE_STATS],
    queryFn: getCourseStatusCounts,
    ...defaultQueryOptions,
  });

/* ------------------------------- Derived hooks --------------------------- */

/**
 * The KPI strip.
 *
 * Course count, student count and published-quiz count now come from
 * GET /courses/stats/mine, which returns three numbers computed by the
 * database. Previously they were derived as `courses.length` and a JS sum over
 * `_count.enrollments` across the fetched course array — which capped at 10,
 * because GET /courses is paginated with a default limit of 10 and the real
 * `pagination.total` was discarded by the service layer. An instructor with
 * more than 10 courses saw silently wrong numbers on both tiles.
 *
 * Fetching the full quiz list purely to count published ones is likewise gone.
 */
export function useDashboardStats() {
  const counts = useCourseStatusCounts();
  const assignments = useRawAssignments();
  const calendarEvents = useRawCalendarEvents();
  const notifications = useRawNotifications();
  const conversations = useRawConversations();

  const isLoading =
    counts.isLoading || assignments.isLoading || calendarEvents.isLoading || notifications.isLoading || conversations.isLoading;
  const data = useMemo(
    () =>
      deriveDashboardStats({
        courseCount: counts.data?.total ?? 0,
        draftCourseCount: counts.data?.draft ?? 0,
        studentCount: counts.data?.students ?? 0,
        activeQuizCount: counts.data?.activeQuizzes ?? 0,
        assignments: assignments.data ?? [],
        calendarEvents: calendarEvents.data ?? [],
        notifications: notifications.data ?? [],
        conversations: conversations.data ?? [],
      }),
    [counts.data, assignments.data, calendarEvents.data, notifications.data, conversations.data]
  );

  return { data, isLoading };
}

export function useRecentActivities() {
  const notifications = useRawNotifications();
  const data = useMemo(() => deriveRecentActivities(notifications.data ?? []), [notifications.data]);
  return { data, isLoading: notifications.isLoading };
}

export function useNeedsAttention() {
  const assignments = useRawAssignments();
  const quizzes = useRawQuizzes();
  const modules = useRawModules();
  const courses = useRawCourses();
  const calendarEvents = useRawCalendarEvents();

  const isLoading =
    assignments.isLoading || quizzes.isLoading || modules.isLoading || courses.isLoading || calendarEvents.isLoading;
  const data = useMemo(
    () =>
      deriveNeedsAttention({
        assignments: assignments.data ?? [],
        quizzes: quizzes.data ?? [],
        modules: modules.data ?? [],
        courses: courses.data ?? [],
        calendarEvents: calendarEvents.data ?? [],
      }),
    [assignments.data, quizzes.data, modules.data, courses.data, calendarEvents.data]
  );

  return { data, isLoading };
}

export function useAnnouncementsFeed() {
  return useQuery({ queryKey: ["instructor-home", "announcements"], queryFn: getAnnouncements, ...defaultQueryOptions });
}

export function useCourseProgressOverview() {
  const courses = useRawCourses();
  const data = useMemo(() => deriveCourseProgressOverview(courses.data ?? []), [courses.data]);
  return { data, isLoading: courses.isLoading };
}

// Lesson-composer Assignment blocks (Content rows), each with its newest
// submissions — same `submissions` shape as a standalone Assignment row.
const useRawAssignmentContents = () =>
  useQuery({
    queryKey: ["instructor-home", "raw", "assignment-contents"],
    queryFn: async () => asArray<RawAssignment>(await getInstructorAssignmentContents()),
    ...defaultQueryOptions,
  });

// Final-test attempts only — Self-Tests are practice, not submissions.
const useRawFinalTestResults = () =>
  useQuery({
    queryKey: ["instructor-home", "raw", "final-test-results"],
    queryFn: async () => {
      const response = await getResults({ quizTag: "FINAL" });
      return asArray<RecentTestResult>(response?.studentResults ?? []);
    },
    ...defaultQueryOptions,
  });

export function useRecentSubmissions() {
  const assignments = useRawAssignments();
  const assignmentContents = useRawAssignmentContents();
  const finalTests = useRawFinalTestResults();
  const data = useMemo(
    () =>
      deriveRecentSubmissions(
        [...(assignments.data ?? []), ...(assignmentContents.data ?? [])],
        finalTests.data ?? []
      ),
    [assignments.data, assignmentContents.data, finalTests.data]
  );
  return {
    data,
    isLoading: assignments.isLoading || assignmentContents.isLoading || finalTests.isLoading,
  };
}

// Internal raw hook to fetch results
const useRawResults = () =>
  useQuery({
    queryKey: ["instructor-home", "raw", "results"],
    queryFn: async () => {
      // Assuming getResults from results.service.js handles backend API
      const { getResults } = await import("@/services/results.service");
      const response = await getResults({});
      // /results answers with { summary, studentResults, ... }; the graded rows
      // live under studentResults. The other branches keep older shapes working.
      const rows = Array.isArray(response)
        ? response
        : response?.studentResults ?? response?.data ?? [];
      return asArray<RawResult>(rows);
    },
    ...defaultQueryOptions,
  });

export function useGradeDistribution() {
  const results = useRawResults();
  const data = useMemo(() => deriveGradeDistribution(results.data ?? []), [results.data]);
  return { data, isLoading: results.isLoading };
}
