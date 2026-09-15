import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  createConversation,
  streamConversationMessage,
  streamGuestMessage,
} from "../api/aiAssistant.api";

/**
 * Owns one streaming turn: optimistic echo, token accumulation, cancel, retry
 * and error state.
 *
 * Guest mode keeps its transcript in local component state only — the backend
 * persists nothing for guests, so there is nothing to refetch and no
 * conversation to own.
 */
export function useAiStream({ isGuest, courseId, conversationId, setConversationId, getPosition }) {
  const queryClient = useQueryClient();

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState(null);
  const [lastAttempt, setLastAttempt] = useState(null);
  // Guest transcript lives here; authenticated history comes from React Query.
  const [guestMessages, setGuestMessages] = useState([]);

  const abortRef = useRef(null);

  // Abort any in-flight request if the widget unmounts mid-stream.
  useEffect(
    () => () => {
      if (abortRef.current) abortRef.current.abort();
    },
    []
  );

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
    setStreamingText("");
  }, []);

  const send = useCallback(
    async (text) => {
      const message = (text || "").trim();
      if (!message || isStreaming) return;

      setError(null);
      setLastAttempt(message);
      setIsStreaming(true);
      setStreamingText("");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (isGuest) {
          setGuestMessages((prev) => [
            ...prev,
            { id: `u-${Date.now()}`, role: "USER", content: message },
          ]);

          let acc = "";
          await streamGuestMessage({
            message,
            courseId,
            onChunk: (token) => {
              acc += token;
              setStreamingText(acc);
            },
            signal: controller.signal,
          });

          setGuestMessages((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, role: "ASSISTANT", content: acc },
          ]);
          setStreamingText("");
          setLastAttempt(null);
          return;
        }

        // Authenticated: make sure a conversation exists before streaming into it.
        let activeId = conversationId;
        if (!activeId) {
          const created = await createConversation({ courseId });
          activeId = created?.id;
          if (!activeId) throw new Error("Could not start a conversation. Please try again.");
          setConversationId(activeId);
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.AI_CONVERSATIONS, courseId ?? null],
          });
        }

        // Optimistic echo so the question appears instantly.
        queryClient.setQueryData([QUERY_KEYS.AI_MESSAGES, activeId], (old = []) => [
          ...old,
          { id: `temp-${Date.now()}`, role: "USER", content: message, createdAt: new Date().toISOString() },
        ]);

        await streamConversationMessage({
          conversationId: activeId,
          message,
          position: { courseId, ...(getPosition ? getPosition() : {}) },
          onChunk: (token) => setStreamingText((prev) => prev + token),
          signal: controller.signal,
        });

        // Replace the optimistic state with what was actually persisted.
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_MESSAGES, activeId] });
        await queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.AI_CONVERSATIONS, courseId ?? null],
        });
        setStreamingText("");
        setLastAttempt(null);
      } catch (err) {
        if (err?.name === "AbortError") {
          // User pressed stop, or the widget closed. Not an error.
          setStreamingText("");
        } else {
          setError({
            message: err?.message || "Something went wrong. Please try again.",
            requestId: err?.requestId,
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isGuest, courseId, conversationId, setConversationId, getPosition, isStreaming, queryClient]
  );

  const retry = useCallback(() => {
    if (lastAttempt) send(lastAttempt);
  }, [lastAttempt, send]);

  return {
    send,
    cancel,
    retry,
    isStreaming,
    streamingText,
    error,
    canRetry: Boolean(lastAttempt) && Boolean(error),
    guestMessages,
    clearGuestMessages: () => setGuestMessages([]),
  };
}
