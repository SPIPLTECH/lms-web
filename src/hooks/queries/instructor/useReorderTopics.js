import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderTopics } from "@/services/topic.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { applySequenceMoves, invalidateSequenceQueries } from "./useReorderContents";

export function useReorderTopics() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ lessonId, topics }) =>
            reorderTopics(lessonId, topics),

        // Shown at once, undone if the request fails, then refetched.
        onMutate: (variables) =>
            applySequenceMoves(queryClient, "lesson", variables.lessonId, variables.topics),

        onError: (_error, _variables, undo) => undo?.(),

        onSettled: (_data, _error, variables) => {
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.MODULES],
                refetchType: "all",
            });
            // The lesson's Content rows share this sequence and were renumbered too.
            invalidateSequenceQueries(queryClient, "lesson", variables.lessonId);
        },
    });
}
