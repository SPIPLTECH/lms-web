import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { defaultQueryOptions } from "@/lib/queryOptions";
import {
  createTeachingGoal,
  deleteTeachingGoal,
  updateTeachingGoal,
  type CreateGoalPayload,
  type UpdateGoalPayload,
} from "@/services/instructor/teachingGoals.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { getCourses, getCourseStatusCounts } from "@/services/course.service";
import { getModules } from "@/services/module.service";
import { getQuizzes } from "@/services/quiz.service";
import { getAssignments } from "@/services/assignment.service";
import { getResults } from "@/services/results.service";
import { getCalendarEvents } from "@/services/calendar.service";
import { getNotifications as getRawNotifications } from "@/services/notification.service";
import { getConversations } from "@/features/chat/api/chat.api";
import {
  deriveCalendarHighlights,
  deriveContinueEditing,
  deriveDashboardStats,
  deriveDraftCourses,
  deriveEngagementAnalytics,
  deriveInsights,
  deriveInstructorCourses,
  deriveMessages,
  deriveNeedsAttention,
  deriveRecentActivities,
  deriveUpcomingClasses,
  deriveCourseProgressOverview,
  deriveRecentSubmissions,
  deriveGradeDistribution,
  getAnnouncements,
  getDashboardSummary,
  getTeachingGoals,
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

const useDashboardSummary = () =>
  useQuery({ queryKey: ["instructor-home", "raw", "summary"], queryFn: getDashboardSummary, ...defaultQueryOptions });

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

export function useUpcomingClasses() {
  const events = useRawCalendarEvents();
  const data = useMemo(() => deriveUpcomingClasses(events.data ?? []), [events.data]);
  return { data, isLoading: events.isLoading };
}

export function useCalendarHighlights() {
  const events = useRawCalendarEvents();
  const data = useMemo(() => deriveCalendarHighlights(events.data ?? []), [events.data]);
  return { data, isLoading: events.isLoading };
}

export function useInstructorCoursesOverview() {
  const courses = useRawCourses();
  const data = useMemo(() => deriveInstructorCourses(courses.data ?? []), [courses.data]);
  return { data, isLoading: courses.isLoading };
}

export function useDraftCourses() {
  const courses = useRawCourses();
  const data = useMemo(() => deriveDraftCourses(courses.data ?? []), [courses.data]);
  return { data, isLoading: courses.isLoading };
}

export function useContinueEditing() {
  const modules = useRawModules();
  const data = useMemo(() => deriveContinueEditing(modules.data ?? []), [modules.data]);
  return { data, isLoading: modules.isLoading };
}

export function useAnnouncementsFeed() {
  return useQuery({ queryKey: ["instructor-home", "announcements"], queryFn: getAnnouncements, ...defaultQueryOptions });
}

export function useMessagesPreview() {
  const conversations = useRawConversations();
  const data = useMemo(() => deriveMessages(conversations.data ?? []), [conversations.data]);
  return { data, isLoading: conversations.isLoading };
}

const GOALS_QUERY_KEY = ["instructor-home", "goals"];

export function useTeachingGoals() {
  return useQuery({ queryKey: GOALS_QUERY_KEY, queryFn: getTeachingGoals, ...defaultQueryOptions });
}

export function useCreateTeachingGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGoalPayload) => createTeachingGoal(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY }),
  });
}

export function useUpdateTeachingGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, payload }: { goalId: string; payload: UpdateGoalPayload }) =>
      updateTeachingGoal(goalId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY }),
  });
}

export function useDeleteTeachingGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => deleteTeachingGoal(goalId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY }),
  });
}

export function useInsights() {
  const assignments = useRawAssignments();
  const courses = useRawCourses();
  const isLoading = assignments.isLoading || courses.isLoading;
  const data = useMemo(
    () => deriveInsights({ assignments: assignments.data ?? [], courses: courses.data ?? [] }),
    [assignments.data, courses.data]
  );
  return { data, isLoading };
}

export function useEngagementAnalytics() {
  const summary = useDashboardSummary();
  const data = useMemo(() => deriveEngagementAnalytics(summary.data), [summary.data]);
  return { data, isLoading: summary.isLoading };
}

export function useCourseProgressOverview() {
  const courses = useRawCourses();
  const data = useMemo(() => deriveCourseProgressOverview(courses.data ?? []), [courses.data]);
  return { data, isLoading: courses.isLoading };
}

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
  const finalTests = useRawFinalTestResults();
  const data = useMemo(
    () =>
      deriveRecentSubmissions(
        assignments.data ?? [],
        finalTests.data ?? []
      ),
    [assignments.data, finalTests.data]
  );
  return {
    data,
    isLoading: assignments.isLoading || finalTests.isLoading,
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
