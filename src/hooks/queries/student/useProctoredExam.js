import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { resultRetryDelay, shouldRetryResult } from "@/lib/proctoring/examLogic";
import {
    createProctoringAppeal,
    createProctoredAttempt,
    getProctoredAttempt,
    getProctoredAttemptResult,
    getProctoredQuizStatus,
    optOutOfProctoring,
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

/**
 * Taking the quiz without proctoring. The app-wide refresh after a write reloads the quiz, which
 * then arrives as an ordinary quiz with its questions.
 */
export const useOptOutOfProctoring = (quizId) => useMutation({ mutationFn: () => optOutOfProctoring(quizId) });

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
        retry: shouldRetryResult,
        retryDelay: resultRetryDelay,
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

// The exam page holds what these return, and is left by a full page load, so the app-wide refresh
// after a write would only repeat its slowest reads while a student waits.
export const useCreateProctoredAttempt = (quizId) => useMutation({ mutationFn: (consent) => createProctoredAttempt(quizId, consent), meta: { refreshAll: false } });

export function useResumeProctoredAttempt() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resumeProctoredAttempt,
        meta: { refreshAll: false },
        onSuccess: (data) => {
            if (data?.attemptId) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROCTORED_ATTEMPT, data.attemptId] });
            }
        },
    });
}

export const useStartProctoredAttempt = () => useMutation({ mutationFn: ({ attemptId, readiness }) => startProctoredAttempt(attemptId, readiness), meta: { refreshAll: false } });

/** Finishing changes what the quiz and result screens should say, so they read again. */
export function useSubmitProctoredAttempt(quizId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: submitProctoredAttempt,
        meta: { refreshAll: false },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUIZ, quizId] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUIZ_RESULT, quizId] });
            // Nothing on the exam page reads it again, and it is one of the slowest calls here.
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROCTORED_QUIZ_STATUS, quizId], refetchType: "none" });
        },
    });
}
