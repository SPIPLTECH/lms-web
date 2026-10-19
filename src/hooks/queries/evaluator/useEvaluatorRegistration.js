import { useQuery } from "@tanstack/react-query";

import { getEvaluatorRegistration } from "@/services/evaluator.service";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

// Whether evaluator sign-up is open right now (the backend's switch).
export default function useEvaluatorRegistration() {
  return useQuery({
    queryKey: [QUERY_KEYS.EVALUATOR_REGISTRATION],
    queryFn: getEvaluatorRegistration,
    select: (response) => response.data,
    ...defaultQueryOptions,
  });
}
