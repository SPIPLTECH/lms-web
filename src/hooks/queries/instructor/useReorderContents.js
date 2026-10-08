import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderContents } from "@/services/content.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { parentFromIdFields } from "./useCreateContent";

// Where each parent's child containers are cached: the modules tree holds a
// course's modules, a module's lessons and a lesson's topics; a topic's
// subtopics and a subtopic's concepts are loaded lazily under their own keys.
const CHILD_CONTAINER_KEYS = {
    course: () => [QUERY_KEYS.MODULES],
    module: () => [QUERY_KEYS.MODULES],
    lesson: () => [QUERY_KEYS.MODULES],
    topic: (parentId) => [QUERY_KEYS.SUBTOPICS, parentId],
    subTopic: (parentId) => [QUERY_KEYS.CONCEPTS, parentId],
};

/** Every cache holding a member of one parent's sequence: its Content rows and its child containers. */
function sequenceKeys(parentType, parentId) {
    const childKey = CHILD_CONTAINER_KEYS[parentType]?.(parentId);
    return [[QUERY_KEYS.CONTENTS, parentType, parentId], ...(childKey ? [childKey] : [])];
}

/**
 * A parent's learning sequence is its Content rows AND its child containers,
 * and every reorder — of either kind — renumbers that whole sequence. The two
 * halves are cached separately, so refreshing only the moved kind left the
 * other on its old orders: the Course Map then drew the move as if it had not
 * happened until the page was reloaded.
 *
 * Callers invalidate their own resource first and call this last: a cache
 * already refetching from those joins that fetch (`cancelRefetch: false`)
 * instead of sending the same request twice.
 */
export function invalidateSequenceQueries(queryClient, parentType, parentId) {
    for (const queryKey of sequenceKeys(parentType, parentId)) {
        queryClient.invalidateQueries({ queryKey, refetchType: "all" }, { cancelRefetch: false });
    }
}

// The modules tree nests a module's lessons and a lesson's topics.
const NESTED_LISTS = ["lessons", "topics"];

/** `items` with every listed id at its new `order`, nested lists included; the same array when nothing matched. */
function withOrders(items, orders) {
    if (!Array.isArray(items)) return items;
    let changed = false;
    const next = items.map((item) => {
        let updated = orders.has(item?.id) ? { ...item, order: orders.get(item.id) } : item;
        for (const key of NESTED_LISTS) {
            const nested = withOrders(item?.[key], orders);
            if (nested !== item?.[key]) updated = { ...updated, [key]: nested };
        }
        if (updated !== item) changed = true;
        return updated;
    });
    return changed ? next : items;
}

/**
 * Shows a move the moment it is made: writes the new orders into every cached
 * half of the parent's sequence before the request goes out, so the Course Map
 * redraws on the click rather than after the request and the refetches behind
 * it. Resolves to the undo for a failed request; after the request settles,
 * the refetch replaces these orders with the server's own 1..n numbering.
 */
export async function applySequenceMoves(queryClient, parentType, parentId, moves) {
    const orders = new Map(
        (moves || [])
            .filter((move) => move?.id && Number.isFinite(Number(move.order)))
            .map((move) => [move.id, Number(move.order)])
    );
    const keys = sequenceKeys(parentType, parentId);
    // A fetch already in flight would land the old orders over these.
    await Promise.all(keys.map((queryKey) => queryClient.cancelQueries({ queryKey })));
    const snapshot = keys.flatMap((queryKey) => queryClient.getQueriesData({ queryKey }));
    if (orders.size > 0) {
        for (const queryKey of keys) {
            queryClient.setQueriesData({ queryKey }, (data) => withOrders(data, orders));
        }
    }
    return () => snapshot.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
}

/**
 * variables.parent is the {parentType, parentId} shape every new caller
 * passes; older callers (the legacy composer/blocks system) instead pass a
 * bare topicId/lessonId/moduleId/courseId field — fall back through those so
 * the cache writes still resolve to a real key instead of matching nothing.
 */
function parentOf(variables) {
    const [fallbackType, fallbackId] = parentFromIdFields(variables);
    return [variables.parent?.parentType ?? fallbackType, variables.parent?.parentId ?? fallbackId];
}

export function useReorderContents() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ contents, parent }) =>
            reorderContents(contents, parent),

        onMutate: (variables) => {
            const [parentType, parentId] = parentOf(variables);
            return applySequenceMoves(queryClient, parentType, parentId, variables.contents);
        },

        onError: (_error, _variables, undo) => undo?.(),

        onSettled: (_data, _error, variables) => {
            const [parentType, parentId] = parentOf(variables);

            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.MODULES],
                refetchType: "all",
            });
            // A move can shift the level's child containers too (they share
            // the sequence), so the course trees holding them refetch.
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COURSE] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSE] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEARNING_SEQUENCE] });
            invalidateSequenceQueries(queryClient, parentType, parentId);
        },
    });
}
