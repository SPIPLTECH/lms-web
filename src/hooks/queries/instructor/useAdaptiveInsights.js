import { useQuery } from "@tanstack/react-query";

import {
    getInstructorInsights,
    getInstructorLearners,
    getInstructorLearner,
} from "@/services/learnerModel.service";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/**
 * Phase 9 instructor analytics.
 *
 * Three separate queries rather than one combined call: the overview is cheap
 * and always shown, the learner list paginates independently, and the
 * drill-down is only fetched once an instructor opens a learner. Bundling
 * them would make opening the page pay for all three.
 */

export function useAdaptiveInsights(courseId) {
    return useQuery({
        queryKey: [QUERY_KEYS.INSTRUCTOR_INSIGHTS, courseId ?? null],
        queryFn: () => getInstructorInsights({ courseId }),
        enabled: Boolean(courseId),
        ...defaultQueryOptions,
    });
}

export function useAdaptiveLearners(courseId, { limit, offset } = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.INSTRUCTOR_LEARNERS, courseId ?? null, limit ?? null, offset ?? null],
        queryFn: () => getInstructorLearners({ courseId, limit, offset }),
        enabled: Boolean(courseId),
        ...defaultQueryOptions,
    });
}

export function useAdaptiveLearner(courseId, studentId) {
    return useQuery({
        queryKey: [QUERY_KEYS.INSTRUCTOR_LEARNER, courseId ?? null, studentId ?? null],
        queryFn: () => getInstructorLearner({ courseId, studentId }),
        enabled: Boolean(courseId) && Boolean(studentId),
        ...defaultQueryOptions,
    });
}
