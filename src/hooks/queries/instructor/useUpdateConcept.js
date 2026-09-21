import {
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { updateConcept } from "@/services/concept.service";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Everything a Concept create/update/delete/reorder can change. SUBTOPIC is
 * invalidated as a whole because GET /subtopics/:id embeds its concepts.
 */
export function invalidateConceptQueries(queryClient, subTopicId) {
    queryClient.invalidateQueries({
        queryKey: subTopicId ? [QUERY_KEYS.CONCEPTS, subTopicId] : [QUERY_KEYS.CONCEPTS],
        refetchType: "all",
    });

    queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.SUBTOPIC],
    });

    queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.COURSE],
    });

    queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES],
        refetchType: "all",
    });
}

export function useUpdateConcept() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
                         conceptId,
                         conceptData,
                     }) =>
            updateConcept(
                conceptId,
                conceptData
            ),

        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: [
                    QUERY_KEYS.CONCEPT,
                    variables.conceptId,
                ],
                refetchType: "all",
            });

            invalidateConceptQueries(queryClient, variables.subTopicId);
        },
    });
}
