import {
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { deleteConcept } from "@/services/concept.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { invalidateConceptQueries } from "./useUpdateConcept";

export function useDeleteConcept() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ conceptId }) =>
            deleteConcept(conceptId),

        onSuccess: (_, variables) => {
            queryClient.removeQueries({
                queryKey: [
                    QUERY_KEYS.CONCEPT,
                    variables.conceptId,
                ],
            });

            // The backend removes the Concept's contents with it.
            queryClient.invalidateQueries({
                queryKey: [
                    QUERY_KEYS.CONTENTS,
                    "concept",
                    variables.conceptId,
                ],
            });

            invalidateConceptQueries(queryClient, variables.subTopicId);
        },
    });
}
