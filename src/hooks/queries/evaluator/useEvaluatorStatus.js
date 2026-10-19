import { useQuery } from "@tanstack/react-query";

import { getEvaluatorStatus } from "@/services/evaluator.service";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

// Always re-read on mount: feedback may have been confirmed on another device.
export default function useEvaluatorStatus({ enabled = true } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.EVALUATOR_STATUS],
    queryFn: getEvaluatorStatus,
    select: (response) => response.data,
    ...defaultQueryOptions,
    staleTime: 0,
    // 404 = not an evaluator; retrying won't change that.
    retry: (failureCount, error) => error?.response?.status !== 404 && failureCount < 1,
    enabled,
  });
}
