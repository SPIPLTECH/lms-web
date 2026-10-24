import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";
import { getCourseProgress } from "@/services/progress.service";

export function useCourseProgress(courseId, studentId = null) {
  return useQuery({
    queryKey: [QUERY_KEYS.COURSE_PROGRESS, courseId, studentId],
    queryFn: () => getCourseProgress(courseId, studentId),
    enabled: !!courseId,
    ...defaultQueryOptions
  });
}

