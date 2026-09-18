"use client";

import { useQuery } from "@tanstack/react-query";

import { getExams } from "@/services/exam.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

export function useExams(courseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXAMS, courseId],
    queryFn: () => getExams(courseId),
    ...defaultQueryOptions,
  });
}
