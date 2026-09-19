import { useQuery } from "@tanstack/react-query";

import { getLearningPath } from "@/services/progress.service";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/**
 * The student's ordered path through a course — what is done, what was
 * skipped after qualifying, what is open now, what is still locked, and where
 * a qualifying test is on offer.
 *
 * Shares the course-progress cache's lifetime rather than its key: both are
 * views of the same roll-up, so anything that invalidates progress (finishing
 * content, submitting a quiz) has to invalidate this too or the player would
 * keep drawing a stale gate.
 */
export default function useLearningPath(courseId, { studentId = null, enabled = true } = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.LEARNING_PATH, courseId, studentId],
        queryFn: () => getLearningPath(courseId, studentId),
        enabled: Boolean(courseId) && enabled,
        ...defaultQueryOptions,
        // A retake, a completion or a qualifying pass all move the gate, and
        // the player remounts around those events — serving a cached path
        // there would show a student locked out of something they just
        // unlocked.
        refetchOnMount: true,
    });
}
