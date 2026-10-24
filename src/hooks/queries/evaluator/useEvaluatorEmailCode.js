import { useMutation } from "@tanstack/react-query";

import { sendEvaluatorEmailCode, verifyEvaluatorEmailCode } from "@/services/evaluator.service";

// Email verification on the evaluator registration form. Neither call touches
// an account (none exists yet), so nothing cached needs refreshing.
export function useSendEvaluatorEmailCode() {
  return useMutation({ mutationFn: sendEvaluatorEmailCode, meta: { refreshAll: false } });
}

export function useVerifyEvaluatorEmailCode() {
  return useMutation({ mutationFn: verifyEvaluatorEmailCode, meta: { refreshAll: false } });
}
