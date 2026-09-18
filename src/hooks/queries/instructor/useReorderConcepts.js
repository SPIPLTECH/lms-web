import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderConcepts } from "@/services/concept.service";
import { invalidateConceptQueries } from "./useUpdateConcept";

export function useReorderConcepts() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ subTopicId, concepts }) =>
            reorderConcepts(subTopicId, concepts),

        onSuccess: (_, variables) => {
            invalidateConceptQueries(queryClient, variables.subTopicId);
        },
    });
}
