"use client";

import { useQuery } from "@tanstack/react-query";

import { getProctoringConfig } from "@/services/proctoring.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

export function useProctoringConfig() {
    return useQuery({
        queryKey: [QUERY_KEYS.PROCTORING_CONFIG],
        queryFn: getProctoringConfig,
        ...defaultQueryOptions,
    });
}
