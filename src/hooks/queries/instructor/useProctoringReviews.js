import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";
import { decideProctoringReview, deleteAttemptEvidence, getProctoringReview, listProctoringReviews } from "@/services/proctoring.service";

/** Shared by the instructor and admin pages: the server scopes what each may see. */
export function useProctoringReviews(params) {
    return useQuery({
        queryKey: [QUERY_KEYS.PROCTORING_REVIEWS, params],
        queryFn: () => listProctoringReviews(params),
        placeholderData: keepPreviousData,
        ...defaultQueryOptions,
    });
}

export function useProctoringReview(attemptId) {
    return useQuery({
        queryKey: [QUERY_KEYS.PROCTORING_REVIEW, attemptId],
        queryFn: () => getProctoringReview(attemptId),
        enabled: Boolean(attemptId),
        ...defaultQueryOptions,
    });
}

function useReviewMutation(attemptId, mutationFn) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROCTORING_REVIEW, attemptId] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROCTORING_REVIEWS] });
        },
    });
}

export const useDecideProctoringReview = (attemptId) => useReviewMutation(attemptId, (payload) => decideProctoringReview(attemptId, payload));

export const useDeleteAttemptEvidence = (attemptId) => useReviewMutation(attemptId, (reason) => deleteAttemptEvidence(attemptId, reason));
