import { useMutation } from "@tanstack/react-query";

import { registerEvaluator } from "@/services/evaluator.service";

export default function useRegisterEvaluator() {
  return useMutation({
    mutationFn: registerEvaluator,
    // Nothing cached depends on a new account.
    meta: { refreshAll: false },
  });
}
