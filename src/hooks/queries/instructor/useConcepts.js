import { useQuery } from "@tanstack/react-query";

import { getConcepts } from "@/services/concept.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/**
 * A SubTopic's Concepts, loaded lazily by the Course Map once a SubTopic row
 * is expanded (pass `undefined` to keep it idle).
 */
export function useConcepts(subTopicId) {
    return useQuery({
        queryKey: [QUERY_KEYS.CONCEPTS, subTopicId],
        queryFn: () => getConcepts(subTopicId),
        enabled: !!subTopicId,
        ...defaultQueryOptions,
    });
}
