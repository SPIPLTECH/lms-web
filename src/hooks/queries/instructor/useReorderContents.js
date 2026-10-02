import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderContents } from "@/services/content.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { parentFromIdFields } from "./useCreateContent";

export function useReorderContents() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ contents, parent }) =>
            reorderContents(contents, parent),

        onSuccess: (_, variables) => {
            // variables.parent is the {parentType, parentId} shape every new
            // caller passes; older callers (the legacy composer/blocks system)
            // instead pass a bare topicId/lessonId/moduleId/courseId field —
            // fall back through those so their cache invalidation still
            // resolves to a real key instead of silently matching nothing.
            const [fallbackType, fallbackId] = parentFromIdFields(variables);
            const parentType = variables.parent?.parentType ?? fallbackType;
            const parentId = variables.parent?.parentId ?? fallbackId;

            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.CONTENTS, parentType, parentId],
                refetchType: "all",
            });
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.MODULES],
                refetchType: "all",
            });
            // A move can shift the level's child containers too (they share
            // the sequence), so the course trees holding them refetch.
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COURSE] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSE] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEARNING_SEQUENCE] });
        },
    });
}
