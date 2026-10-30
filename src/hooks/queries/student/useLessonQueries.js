"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createLessonQuery, getMyQuestions } from "@/services/lessonQuery.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/**
 * The current student's own questions — across every lesson, or narrowed by
 * filters ({ contentId } / { lessonId }). `enabled` lets a popover fetch only
 * once it's opened.
 */
export function useMyQuestions(filters = {}, { enabled = true, refetchInterval = false } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.MY_QUESTIONS, filters],
    queryFn: () => getMyQuestions(filters),
    enabled,
    refetchInterval,
    ...defaultQueryOptions,
  });
}

export function useCreateLessonQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLessonQuery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_QUESTIONS] });
    },
  });
}
