import { useQuery } from "@tanstack/react-query";

import { getRecommendations } from "@/services/learnerModel.service";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/**
 * The student's own learning recommendations and weak areas.
 *
 * One request for the whole panel — the backend aggregates mastery, evidence
 * and the decision engine in a single call, so the dashboard never fans out
 * per concept or per attempt.
 */
export default function useRecommendations({ courseId = null, limit } = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.RECOMMENDATIONS, courseId ?? null, limit ?? null],
        queryFn: () => getRecommendations({ courseId, limit }),
        ...defaultQueryOptions,
    });
}
