import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderSubTopics } from "@/services/subTopic.service";
import { invalidateSubTopicQueries } from "./useUpdateSubTopic";

export function useReorderSubTopics() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ topicId, subTopics }) =>
            reorderSubTopics(topicId, subTopics),

        onSuccess: (_, variables) => {
            invalidateSubTopicQueries(queryClient, variables.topicId);
        },
    });
}
