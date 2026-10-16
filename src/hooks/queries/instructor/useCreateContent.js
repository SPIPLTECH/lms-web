import {
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { createContent } from "@/services/content.service";
import { QUERY_KEYS } from "@/constants/queryKeys";

// Most specific first. Content carries exactly one parent id, so the order
// only matters for an object that also happens to hold ancestor ids.
const PARENT_FIELDS = ["conceptId", "subTopicId", "topicId", "lessonId", "moduleId", "courseId"];

/** Reads the parent id present on a content payload (or any object with the same id fields) and returns it as [parentType, parentId] for cache-key purposes — parentType is the field name without `Id` (`subTopic`, `concept`, …), matching the CONTENTS query key. */
export function parentFromIdFields(variables) {
    for (const field of PARENT_FIELDS) {
        if (variables?.[field]) return [field.replace(/Id$/, ""), variables[field]];
    }
    return [undefined, undefined];
}

const parentFromCreateVariables = parentFromIdFields;

export function useCreateContent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createContent,

        onSuccess: (_, variables) => {
            const [parentType, parentId] = parentFromCreateVariables(variables);

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

            queryClient.invalidateQueries({
                queryKey: [
                    QUERY_KEYS.TOPIC,
                    variables.topicId,
                ],
                refetchType: "all",
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
