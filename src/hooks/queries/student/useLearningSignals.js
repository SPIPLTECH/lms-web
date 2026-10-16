import { useQuery } from "@tanstack/react-query";

import { getLearningSignals } from "@/services/learnerModel.service";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/**
 * The student's long-term learning signals.
 *
 * One aggregated request, same as the recommendations panel — the backend
 * groups every concept in a single SQL pass, so this never fans out per
 * concept or per attempt.
 */
export default function useLearningSignals({ courseId = null } = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.LEARNING_SIGNALS, courseId ?? null],
        queryFn: () => getLearningSignals({ courseId }),
        ...defaultQueryOptions,
    });
}
