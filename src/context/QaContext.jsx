"use client";

import { createContext, useCallback, useMemo, useState } from "react";

import useDashboard from "@/hooks/queries/student/useDashboard";
import { useMyQuestions, useCreateLessonQuery } from "@/hooks/queries/student/useLessonQueries";

const QaContext = createContext(null);

export function QaProvider({ children }) {
  const { data: dashboardData } = useDashboard();
  const { data: threads = [], isLoading } = useMyQuestions();
  const createLessonQuery = useCreateLessonQuery();
  const [askError, setAskError] = useState("");

  const enrolledCourses = useMemo(
    () =>
      (dashboardData?.enrolledCoursesList || [])
        .filter((e) => e.course?.title && e.courseId)
        .map((e) => ({ courseId: e.courseId, title: e.course.title })),
    [dashboardData]
  );

  const askQuestion = useCallback(
    async ({ lessonId, question }) => {
      setAskError("");
      try {
        const created = await createLessonQuery.mutateAsync({ lessonId, question });
        return created.id;
      } catch (err) {
        setAskError(err?.response?.data?.message || "Failed to post your question. Please try again.");
        throw err;
      }
    },
    [createLessonQuery]
  );

  const pendingCount = useMemo(
    () => threads.filter((t) => t.status !== "ANSWERED").length,
    [threads]
  );

  const value = useMemo(
    () => ({
      threads,
      enrolledCourses,
      askQuestion,
      isLoading,
      isAsking: createLessonQuery.isPending,
      askError,
      pendingCount,
    }),
    [threads, enrolledCourses, askQuestion, isLoading, createLessonQuery.isPending, askError, pendingCount]
  );

  return <QaContext.Provider value={value}>{children}</QaContext.Provider>;
}

