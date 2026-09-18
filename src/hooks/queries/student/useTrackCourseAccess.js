import { useMutation, useQueryClient } from "@tanstack/react-query";
import { trackCourseAccess } from "@/services/enrollment.service";
import { QUERY_KEYS } from "@/constants/queryKeys";

// Course access is a coarse signal — it backs Enrollment.lastAccessedAt and the
// ordering of My Courses. Several components can legitimately track the same
// course at once (the learn page, plus a quiz opened inside it, which also
// renders standalone at /student/attempt/[quizId]), so without a window one
// course open costs several identical writes.
const DEDUPE_WINDOW_MS = 30_000;
const lastTrackedAt = new Map();

const SKIPPED = Symbol("skipped");

export default function useTrackCourseAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId) => {
      const previous = lastTrackedAt.get(courseId);
      if (previous && Date.now() - previous < DEDUPE_WINDOW_MS) {
        return Promise.resolve(SKIPPED);
      }
      lastTrackedAt.set(courseId, Date.now());
      return trackCourseAccess(courseId);
    },
    onSuccess: (result) => {
      if (result === SKIPPED) return;
      // refetchType "none" marks My Courses stale without pulling the whole
      // enrollment list again right now: nothing on screen during a lesson
      // renders it, and it refetches on its own when that page is next shown.
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.MY_COURSES],
        refetchType: "none",
      });
    },
  });
}
