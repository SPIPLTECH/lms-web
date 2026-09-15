import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";
import {
  createConversation,
  deleteConversation,
  getConversations,
  getMessages,
  updateConversation,
} from "../api/aiAssistant.api";

/**
 * Server state for AI conversations.
 *
 * Keys are course-scoped so the Learn Page drawer for course A and the one
 * for course B do not share a cache entry.
 */
export function useAiConversations({ courseId, enabled = true } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_CONVERSATIONS, courseId ?? null],
    queryFn: () => getConversations({ courseId }),
    ...defaultQueryOptions,
    enabled,
  });
}

export function useAiMessages(conversationId) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_MESSAGES, conversationId],
    queryFn: () => getMessages(conversationId),
    ...defaultQueryOptions,
    enabled: Boolean(conversationId),
  });
}

export function useCreateAiConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createConversation(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.AI_CONVERSATIONS, variables?.courseId ?? null],
      });
    },
  });
}

export function useUpdateAiConversation(courseId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, ...payload }) => updateConversation(conversationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CONVERSATIONS, courseId ?? null] });
    },
  });
}

export function useDeleteAiConversation(courseId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId) => deleteConversation(conversationId),
    onSuccess: (_data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CONVERSATIONS, courseId ?? null] });
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.AI_MESSAGES, conversationId] });
    },
  });
}
