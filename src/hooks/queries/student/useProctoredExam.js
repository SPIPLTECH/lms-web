import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import {
    createProctoringAppeal,
    createProctoredAttempt,
    getProctoredAttempt,
    getProctoredAttemptResult,
    getProctoredQuizStatus,
    resumeProctoredAttempt,
    startProctoredAttempt,
    submitProctoredAttempt,
} from "@/services/proctoring.service";

/** Whether this student can begin, with the consent wording. Fresh every time: it decides entry. */
export function useProctoredQuizStatus(quizId, options = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.PROCTORED_QUIZ_STATUS, quizId],
        queryFn: () => getProctoredQuizStatus(quizId),
        enabled: Boolean(quizId),
        refetchOnWindowFocus: false,
        refetchOnMount: "always",
        retry: false,
        staleTime: 0,
        ...options,
    });
}

/** The running exam's questions and saved answers. Read once: answers then live on the page. */
export function useProctoredAttempt(attemptId, { enabled = true } = {}) {
    return useQuery({
        queryKey: [QUERY_KEYS.PROCTORED_ATTEMPT, attemptId],
        queryFn: () => getProctoredAttempt(attemptId),
        enabled: Boolean(attemptId) && enabled,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 2,
        staleTime: Infinity,
        gcTime: 0,
    });
}

export function useProctoredAttemptResult(attemptId) {
    return useQuery({
        queryKey: [QUERY_KEYS.PROCTORED_ATTEMPT_RESULT, attemptId],
        queryFn: () => getProctoredAttemptResult(attemptId),
        enabled: Boolean(attemptId),
        refetchOnWindowFocus: false,
        retry: 2,
    });
}

/** Asking for a decision to be looked at again, once per decision. */
export function useCreateProctoringAppeal(attemptId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (reason) => createProctoringAppeal(attemptId, reason),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROCTORED_ATTEMPT_RESULT, attemptId] }),
    });
}

export const useCreateProctoredAttempt = (quizId) => useMutation({ mutationFn: (consent) => createProctoredAttempt(quizId, consent) });

export function useResumeProctoredAttempt() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resumeProctoredAttempt,
        onSuccess: (data) => {
            if (data?.attemptId) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROCTORED_ATTEMPT, data.attemptId] });
            }
        },
    });
}

export const useStartProctoredAttempt = () => useMutation({ mutationFn: startProctoredAttempt });

/** Finishing changes what the quiz and result screens should say, so they read again. */
export function useSubmitProctoredAttempt(quizId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: submitProctoredAttempt,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUIZ, quizId] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUIZ_RESULT, quizId] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROCTORED_QUIZ_STATUS, quizId] });
        },
    });
}
