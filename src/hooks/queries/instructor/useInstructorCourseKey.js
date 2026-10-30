import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { resolveCourseKey } from "@/services/course.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { looksLikeCourseId } from "@/lib/courseSlug";

/**
 * The course id an instructor URL's [courseId] segment names. The segment is
 * the course's readable key (`urlKey`, e.g. cdac-c-cat-course-section-a) or,
 * in an older link, its id; the Composer's "draft" / "new" routes pass
 * through untouched. An id-shaped segment is used at once, so an id link does
 * not wait for a lookup.
 *
 * Once resolved the id sticks: renaming the course changes its key, and the
 * page moves its address to the new key, but the lookup of the old one
 * refetching to a 404 meanwhile must not drop the course being edited.
 *
 * @returns {{ courseId: string|null, isResolving: boolean, notFound: boolean }}
 */
export default function useInstructorCourseKey(key) {
  const passthrough = !key || key === "draft" || key === "new" || looksLikeCourseId(key);
  const lastIdRef = useRef(null);

  const query = useQuery({
    queryKey: [QUERY_KEYS.COURSE_KEY, key],
    queryFn: () => resolveCourseKey(key),
    enabled: !passthrough,
    staleTime: 5 * 60 * 1000,
    // 404 means the key names none of this user's courses: asking again
    // cannot change it.
    retry: (failureCount, error) => error?.response?.status !== 404 && failureCount < 1,
  });

  if (passthrough) return { courseId: key || null, isResolving: false, notFound: false };
  if (query.data?.id) lastIdRef.current = query.data.id;
  const courseId = query.data?.id || lastIdRef.current;
  return {
    courseId,
    isResolving: !courseId && query.isPending,
    notFound: !courseId && query.isError,
  };
}
