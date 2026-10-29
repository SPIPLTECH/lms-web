"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCodeItLanguages,
  getCodeItTopics,
  getCodeItExercise,
  saveCodeItDraft,
  runCode,
  runCodeItExercise,
  submitCodeItExercise,
  askCodeItTutor,
} from "@/services/codeIt.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";

export function useCodeItLanguages() {
  return useQuery({
    queryKey: [QUERY_KEYS.CODEIT_LANGUAGES],
    queryFn: getCodeItLanguages,
    ...defaultQueryOptions,
    staleTime: Infinity,
  });
}

export function useCodeItTopics(language) {
  return useQuery({
    queryKey: [QUERY_KEYS.CODEIT_TOPICS, language],
    queryFn: () => getCodeItTopics(language),
    enabled: Boolean(language),
    ...defaultQueryOptions,
  });
}

export function useCodeItExercise(exerciseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.CODEIT_EXERCISE, exerciseId],
    queryFn: () => getCodeItExercise(exerciseId),
    enabled: Boolean(exerciseId),
    ...defaultQueryOptions,
    // The editor seeds from the draft once per exercise; a background refetch
    // must not overwrite what the student is typing.
    staleTime: Infinity,
  });
}

export function useSaveCodeItDraft() {
  return useMutation({ mutationFn: saveCodeItDraft });
}

export function useRunCode() {
  return useMutation({ mutationFn: runCode });
}

export function useRunCodeItExercise() {
  return useMutation({ mutationFn: runCodeItExercise });
}

export function useSubmitCodeItExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitCodeItExercise,
    onSuccess: (result) => {
      // Only a pass changes the ✓ marks in the topic list.
      if (result?.passed) queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CODEIT_TOPICS] });
    },
  });
}

export function useAskCodeItTutor() {
  return useMutation({ mutationFn: askCodeItTutor });
}
