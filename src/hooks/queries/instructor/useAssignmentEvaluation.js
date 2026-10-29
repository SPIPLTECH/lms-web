"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptEvaluation,
  addStarterSynonyms,
  addSynonymGroup,
  deleteRubric,
  deleteSynonymGroup,
  evaluateAllSubmissions,
  getRubric,
  getSubmissionEvaluation,
  getSynonymGroups,
  overrideEvaluation,
  previewRubric,
  reEvaluateSubmission,
  saveRubric,
} from "@/services/assignmentEvaluation.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";
import { evaluationPollInterval, isEvaluationRunning } from "@/lib/assignmentEvaluationState";

/** The assignment's marking scheme (null until the instructor writes one). */
export function useRubric(assignmentId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ASSIGNMENT_EVALUATION, assignmentId, "rubric"],
    queryFn: () => getRubric(assignmentId),
    enabled: Boolean(assignmentId),
    ...defaultQueryOptions,
  });
}

/**
 * Saving or removing the scheme, and every decision, change the submissions
 * table (grades, its evaluation column) under ASSESSMENTS. Saving the scheme
 * can also change the assignment's marks, which the course trees show.
 */
function useInvalidateEvaluation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ASSIGNMENT_EVALUATION] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ASSESSMENTS] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COURSE] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MODULES] });
  };
}

export function useSaveRubric(assignmentId) {
  const invalidate = useInvalidateEvaluation();
  return useMutation({ mutationFn: (rubric) => saveRubric(assignmentId, rubric), onSuccess: invalidate });
}

export function useDeleteRubric(assignmentId) {
  const invalidate = useInvalidateEvaluation();
  return useMutation({ mutationFn: () => deleteRubric(assignmentId), onSuccess: invalidate });
}

export function usePreviewRubric(assignmentId) {
  return useMutation({ mutationFn: ({ rubric, answerText }) => previewRubric(assignmentId, rubric, answerText) });
}

export function useEvaluateAll(assignmentId) {
  const invalidate = useInvalidateEvaluation();
  return useMutation({ mutationFn: () => evaluateAllSubmissions(assignmentId), onSuccess: invalidate });
}

/**
 * One submission's evaluation: current proposal, published result, history.
 * Polls while the evaluator is running and stops once it has finished.
 */
export function useSubmissionEvaluation(assignmentId, submissionId) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [QUERY_KEYS.ASSIGNMENT_EVALUATION, assignmentId, submissionId],
    queryFn: () => getSubmissionEvaluation(assignmentId, submissionId),
    enabled: Boolean(assignmentId && submissionId),
    ...defaultQueryOptions,
    staleTime: 0,
    refetchInterval: (q) => evaluationPollInterval(q.state.data),
  });

  // When a run finishes, the submissions table (its status column) is
  // refreshed at once instead of on its next poll.
  const status = query.data?.status;
  const previousStatus = useRef(status);
  useEffect(() => {
    if (isEvaluationRunning(previousStatus.current) && status && !isEvaluationRunning(status)) {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ASSESSMENTS] });
    }
    previousStatus.current = status;
  }, [status, queryClient]);

  return query;
}

/**
 * Approve, set marks, re-evaluate. Each decision carries the evaluation
 * version it was made on. A refused one (409) still refreshes, so the panel
 * shows what changed instead of the stale view.
 */
export function useEvaluationDecision(assignmentId) {
  const invalidate = useInvalidateEvaluation();
  const options = { onSuccess: invalidate, onError: invalidate };
  return {
    accept: useMutation({
      mutationFn: ({ submissionId, expectedVersion, comment }) =>
        acceptEvaluation(assignmentId, submissionId, { expectedVersion, comment }),
      ...options,
    }),
    override: useMutation({
      mutationFn: ({ submissionId, ...payload }) => overrideEvaluation(assignmentId, submissionId, payload),
      ...options,
    }),
    reEvaluate: useMutation({
      mutationFn: ({ submissionId, reopen }) => reEvaluateSubmission(assignmentId, submissionId, { reopen }),
      ...options,
    }),
  };
}

export function useSynonymGroups(enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.EVALUATION_SYNONYMS],
    queryFn: getSynonymGroups,
    enabled,
    ...defaultQueryOptions,
  });
}

export function useSynonymMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EVALUATION_SYNONYMS] });
  return {
    add: useMutation({ mutationFn: addSynonymGroup, onSuccess }),
    addStarter: useMutation({ mutationFn: addStarterSynonyms, onSuccess }),
    remove: useMutation({ mutationFn: deleteSynonymGroup, onSuccess }),
  };
}
