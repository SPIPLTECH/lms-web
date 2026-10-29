import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    getCourseLearningHealth,
    getLearnerHealth,
    recomputeCourseLearningHealth,
} from "@/services/learningHealth.service";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/**
 * Learning Health agent — instructor view.
 *
 * Roster and drill-down are separate queries: the roster is always shown, the
 * detail only once a learner is opened.
 */

export function useCourseLearningHealth(courseId, { riskLevel = null, limit, offset } = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.LEARNING_HEALTH, courseId ?? null, riskLevel, limit ?? null, offset ?? null],
        queryFn: () => getCourseLearningHealth({ courseId, riskLevel, limit, offset }),
        enabled: Boolean(courseId),
        ...defaultQueryOptions,
    });
}

export function useLearnerHealth(courseId, studentId) {
    return useQuery({
        queryKey: [QUERY_KEYS.LEARNING_HEALTH_LEARNER, courseId ?? null, studentId ?? null],
        queryFn: () => getLearnerHealth({ courseId, studentId }),
        enabled: Boolean(courseId) && Boolean(studentId),
        ...defaultQueryOptions,
    });
}

export function useRecomputeLearningHealth(courseId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => recomputeCourseLearningHealth({ courseId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEARNING_HEALTH, courseId] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEARNING_HEALTH_LEARNER, courseId] });
        },
    });
}
