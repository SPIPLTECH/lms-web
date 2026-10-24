import { useQuery } from "@tanstack/react-query";

import { getContents } from "@/services/content.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

/** Normalizes a bare topicId string (every call site before this feature) or a { parentType, parentId } object into the latter. */
function normalizeParent(parent) {
    if (parent && typeof parent === "object") return parent;
    return { parentType: "topic", parentId: parent || "" };
}

export function useContents(parent) {
    const { parentType, parentId } = normalizeParent(parent);
    return useQuery({
        queryKey: [QUERY_KEYS.CONTENTS, parentType, parentId],
        queryFn: () => getContents({ parentType, parentId }),
        enabled: !!parentId,
        ...defaultQueryOptions,
    });
}

