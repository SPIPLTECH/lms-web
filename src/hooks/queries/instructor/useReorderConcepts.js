import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderConcepts } from "@/services/concept.service";
import { invalidateConceptQueries } from "./useUpdateConcept";
import { applySequenceMoves, invalidateSequenceQueries } from "./useReorderContents";

export function useReorderConcepts() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ subTopicId, concepts }) =>
            reorderConcepts(subTopicId, concepts),

        // Shown at once, undone if the request fails, then refetched.
        onMutate: (variables) =>
            applySequenceMoves(queryClient, "subTopic", variables.subTopicId, variables.concepts),

        onError: (_error, _variables, undo) => undo?.(),

        onSettled: (_data, _error, variables) => {
            invalidateConceptQueries(queryClient, variables.subTopicId);
            // The subTopic's Content rows share this sequence and were renumbered too.
            invalidateSequenceQueries(queryClient, "subTopic", variables.subTopicId);
        },
    });
}
