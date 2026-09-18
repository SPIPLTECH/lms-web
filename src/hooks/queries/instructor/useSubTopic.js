import { useQuery } from "@tanstack/react-query";

import { getSubTopicById } from "@/services/subTopic.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

export function useSubTopic(subTopicId) {
    return useQuery({
        queryKey: [QUERY_KEYS.SUBTOPIC, subTopicId],
        queryFn: () => getSubTopicById(subTopicId),
        enabled: !!subTopicId,
        ...defaultQueryOptions,
    });
}
