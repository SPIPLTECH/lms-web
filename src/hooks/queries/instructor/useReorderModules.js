import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderModules } from "@/services/module.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { applySequenceMoves, invalidateSequenceQueries } from "./useReorderContents";

export function useReorderModules() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ courseId, modules }) =>
            reorderModules(courseId, modules),

        // Shown at once, undone if the request fails, then refetched.
        onMutate: (variables) =>
            applySequenceMoves(queryClient, "course", variables.courseId, variables.modules),

        onError: (_error, _variables, undo) => undo?.(),

        onSettled: (_data, _error, variables) => {
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.MODULES],
                refetchType: "all",
            });
            // The course's Content rows share this sequence and were renumbered too.
            invalidateSequenceQueries(queryClient, "course", variables.courseId);
        },
    });
}
