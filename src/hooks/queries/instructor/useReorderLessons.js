import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderLessons } from "@/services/lesson.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { applySequenceMoves, invalidateSequenceQueries } from "./useReorderContents";

export function useReorderLessons() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ moduleId, lessons }) =>
            reorderLessons(moduleId, lessons),

        // Shown at once, undone if the request fails, then refetched.
        onMutate: (variables) =>
            applySequenceMoves(queryClient, "module", variables.moduleId, variables.lessons),

        onError: (_error, _variables, undo) => undo?.(),

        onSettled: (_data, _error, variables) => {
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.MODULES],
                refetchType: "all",
            });
            // The module's Content rows share this sequence and were renumbered too.
            invalidateSequenceQueries(queryClient, "module", variables.moduleId);
        },
    });
}
