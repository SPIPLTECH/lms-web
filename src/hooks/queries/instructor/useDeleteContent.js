import {
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { deleteContent } from "@/services/content.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { parentFromIdFields } from "./useCreateContent";

export function useDeleteContent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ contentId }) =>
            deleteContent(contentId),

        onSuccess: (_, variables) => {
            const [fallbackType, fallbackId] = parentFromIdFields(variables);
            const parentType = variables.parent?.parentType ?? fallbackType;
            const parentId = variables.parent?.parentId ?? fallbackId;

            // refetchType: "all" forces an immediate background refetch even
            // for queries with no currently-mounted observer — otherwise the
            // data is only marked stale and won't actually refresh until
            // that page is hard-reloaded.
            queryClient.invalidateQueries({
                queryKey: [
                    QUERY_KEYS.CONTENTS,
                    parentType,
                    parentId,
                ],
                refetchType: "all",
            });

            queryClient.removeQueries({
                queryKey: [
                    QUERY_KEYS.CONTENT,
                    variables.contentId,
                ],
            });

            // The Course Composer sidebar shows a per-topic cell count from
            // MODULES (plural, courseId-scoped) — keep it in sync too.
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.MODULES],
                refetchType: "all",
            });

            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES],
                refetchType: "all",
            });

            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.COURSE],
            });

        },
    });
}
