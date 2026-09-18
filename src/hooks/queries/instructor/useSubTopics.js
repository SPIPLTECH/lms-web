import { useQuery } from "@tanstack/react-query";

import { getSubTopics } from "@/services/subTopic.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/**
 * A Topic's SubTopics. The instructor modules tree (GET /modules) stops at
 * Topic, so the Course Map loads this lazily — only once a Topic row is
 * expanded (pass `undefined` to keep it idle).
 */
export function useSubTopics(topicId) {
    return useQuery({
        queryKey: [QUERY_KEYS.SUBTOPICS, topicId],
        queryFn: () => getSubTopics(topicId),
        enabled: !!topicId,
        ...defaultQueryOptions,
    });
}
