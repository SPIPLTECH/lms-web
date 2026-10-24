import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { defaultQueryOptions } from "@/lib/queryOptions";
import {
  getConversations,
  getMessages,
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

