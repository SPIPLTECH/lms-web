import { useQuery } from "@tanstack/react-query";

import { getConceptById } from "@/services/concept.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

export function useConcept(conceptId) {
    return useQuery({
        queryKey: [QUERY_KEYS.CONCEPT, conceptId],
        queryFn: () => getConceptById(conceptId),
        enabled: !!conceptId,
        ...defaultQueryOptions,
    });
}
