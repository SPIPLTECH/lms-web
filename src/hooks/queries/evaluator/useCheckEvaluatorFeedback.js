import { useMutation, useQueryClient } from "@tanstack/react-query";

import { checkEvaluatorFeedback } from "@/services/evaluator.service";
import { QUERY_KEYS } from "@/constants/queryKeys";

// Asks the server to look for this evaluator's submission on the feedback
// site. The response carries the up-to-date status, so it is written straight
// into the status query.
export default function useCheckEvaluatorFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: checkEvaluatorFeedback,
    meta: { refreshAll: false },
    onSuccess: (response) => {
      queryClient.setQueryData([QUERY_KEYS.EVALUATOR_STATUS], (previous) => ({
        ...(previous || {}),
        success: true,
        data: response.data,
      }));
    },
  });
}
