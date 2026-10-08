import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderSubTopics } from "@/services/subTopic.service";
import { invalidateSubTopicQueries } from "./useUpdateSubTopic";
import { applySequenceMoves, invalidateSequenceQueries } from "./useReorderContents";

export function useReorderSubTopics() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ topicId, subTopics }) =>
            reorderSubTopics(topicId, subTopics),

        // Shown at once, undone if the request fails, then refetched.
        onMutate: (variables) =>
            applySequenceMoves(queryClient, "topic", variables.topicId, variables.subTopics),

        onError: (_error, _variables, undo) => undo?.(),

        onSettled: (_data, _error, variables) => {
            invalidateSubTopicQueries(queryClient, variables.topicId);
            // The topic's Content rows share this sequence and were renumbered too.
            invalidateSequenceQueries(queryClient, "topic", variables.topicId);
        },
    });
}
