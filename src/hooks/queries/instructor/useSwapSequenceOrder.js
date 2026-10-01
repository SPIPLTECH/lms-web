import { useMutation, useQueryClient } from "@tanstack/react-query";

import { swapSequenceOrder } from "@/services/content.service";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * The sidebar's Move Up/Down for a Content or Quiz row: swaps it with the row
 * next to it, which may be of any type (a Lesson, Topic, Assignment, …). The
 * per-type reorder hooks can only move rows of their own type, so a swap with
 * a different type has to go through this one call or only half of it lands.
 *
 * The two rows can come from any of the level's queries — its contents, the
 * whole-course fetch (quizzes, assignments, modules, lessons, topics) or the
 * lazily loaded subtopics/concepts — so all of them are refreshed.
 */
export function useSwapSequenceOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ first, second }) => swapSequenceOrder(first, second),

        onSuccess: () => {
            for (const key of [
                QUERY_KEYS.CONTENTS,
                QUERY_KEYS.COURSE,
                QUERY_KEYS.MODULES,
                QUERY_KEYS.SUBTOPICS,
                QUERY_KEYS.CONCEPTS,
            ]) {
                queryClient.invalidateQueries({ queryKey: [key], refetchType: "all" });
            }
        },
    });
}
