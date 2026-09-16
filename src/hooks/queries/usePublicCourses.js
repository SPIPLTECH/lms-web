"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { getPublicCourses } from "@/services/course.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/**
 * Backs the guest-facing catalogue at /courses — server-side search, sort and
 * pagination over published courses only.
 *
 * Lives at the root of hooks/queries/ rather than under student/ because it is
 * deliberately role-less: it must work for a browser with no token at all, the
 * same way useLandingData does. Nothing here reads enrollment, progress or any
 * other per-student state.
 *
 * keepPreviousData holds the current page on screen while the next one loads,
 * so paging and typing don't flash the grid back to a skeleton.
 */
export function usePublicCourses(filters = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.PUBLIC_COURSES, filters],
    queryFn: ({ signal }) => getPublicCourses(filters, { signal }),
    ...defaultQueryOptions,
    placeholderData: keepPreviousData,
  });
}
