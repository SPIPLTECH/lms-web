"use client";

import { useQuery } from "@tanstack/react-query";

import { getResults, getQuizAnalytics, getFinalTestOverview } from "@/services/results.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

export function useResults(filters = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.RESULTS, filters],
    queryFn: () => getResults(filters),
    ...defaultQueryOptions,
  });
}

/**
 * Deep analytics for one quiz. Only fetched once a quiz is actually selected —
 * the aggregation is per-quiz, so asking for it without one would be a request
 * the backend cannot answer.
 */
export function useQuizAnalytics(quizId) {
  return useQuery({
    queryKey: [QUERY_KEYS.RESULTS, "quiz-analytics", quizId ?? null],
    queryFn: () => getQuizAnalytics(quizId),
    enabled: Boolean(quizId),
    ...defaultQueryOptions,
  });
}

/** One row per Final test, with the enrolled roster behind each. */
export function useFinalTestOverview(courseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.RESULTS, "final-tests", courseId ?? null],
    queryFn: () => getFinalTestOverview(courseId ? { courseId } : {}),
    ...defaultQueryOptions,
  });
}

/**
 * A single Final test and its roster, for that test's own page. The endpoint
 * returns a list either way, so this unwraps the one entry — and yields
 * undefined for an id that is not the instructor's to see.
 */
export function useFinalTest(quizId) {
  return useQuery({
    queryKey: [QUERY_KEYS.RESULTS, "final-tests", "detail", quizId],
    queryFn: () => getFinalTestOverview({ quizId }),
    select: (tests) => tests?.[0],
    enabled: Boolean(quizId),
    ...defaultQueryOptions,
  });
}
