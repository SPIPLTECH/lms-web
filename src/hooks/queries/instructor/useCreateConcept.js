import {
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { createConcept } from "@/services/concept.service";
import { invalidateConceptQueries } from "./useUpdateConcept";

export function useCreateConcept() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createConcept,

        onSuccess: (_, variables) => {
            invalidateConceptQueries(queryClient, variables.subTopicId);
        },
    });
}
