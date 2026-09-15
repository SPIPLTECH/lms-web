"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, MessageSquarePlus, RefreshCw, Sparkles, X } from "lucide-react";

import Loader from "@/components/common/Loader";
import AiMessage from "./AiMessage";
import AiInput from "./AiInput";
import AiSuggestions from "./AiSuggestions";
import { useAiConversations, useAiMessages } from "../hooks/useAiAssistant";
import { useAiStream } from "../hooks/useAiStream";
import { displayTitle, groupByRecency } from "../utils/conversation";

/**
 * The assistant panel.
 *
 * Sits at z-[9200] — deliberately below the human chat window (z-[9999]) so
 * that when both are open the person-to-person conversation stays on top.
 */
export default function AiAssistantWindow({
  isOpen,
  onClose,
  scope,
  courseId,
  courseTitle,
  getPosition,
  conversationId,
  setConversationId,
}) {
  const isGuest = scope === "GUEST";
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef(null);

  const { data: conversations = [], isLoading: loadingConversations } = useAiConversations({
    courseId,
    enabled: isOpen && !isGuest,
  });
  const { data: messages = [], isLoading: loadingMessages } = useAiMessages(
    isGuest ? null : conversationId
  );

  const stream = useAiStream({
    isGuest,
    courseId,
    conversationId,
    setConversationId,
    getPosition,
  });

  const visibleMessages = isGuest ? stream.guestMessages : messages;
  const { today, earlier } = useMemo(() => groupByRecency(conversations), [conversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, stream.streamingText, stream.isStreaming]);

  // Closing the panel must not leave a request running in the background.
  useEffect(() => {
    if (!isOpen && stream.isStreaming) stream.cancel();
  }, [isOpen, stream]);

  if (!isOpen) return null;

  const startNew = () => {
    if (isGuest) {
      stream.clearGuestMessages();
    } else {
      setConversationId(null);
    }
    setShowHistory(false);
  };

  const isEmpty = visibleMessages.length === 0 && !stream.isStreaming;

  return (
    <div
      role="dialog"
      aria-label="AI Assistant"
      className="fixed inset-x-0 bottom-0 z-[9200] flex h-[100dvh] w-full flex-col overflow-hidden border border-border bg-background shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[620px] sm:w-[400px] sm:rounded-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {!isGuest && (
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              title="Conversation history"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {showHistory ? <ChevronLeft className="h-4 w-4" /> : <MessageSquarePlus className="h-4 w-4" />}
              <span className="sr-only">Toggle conversation history</span>
            </button>
          )}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">AI Assistant</p>
            {courseTitle && (
              <p className="truncate text-[11px] text-muted-foreground">{courseTitle}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={startNew}
            title="New conversation"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">New conversation</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close assistant</span>
          </button>
        </div>
      </div>

      {/* History drawer (authenticated only) */}
      {showHistory && !isGuest ? (
        <div className="flex-1 overflow-y-auto p-3">
          {loadingConversations ? (
            <div className="py-8">
              <Loader />
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              No conversations yet.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {[
                ["Today", today],
                ["Earlier", earlier],
              ]
                .filter(([, list]) => list.length > 0)
                .map(([label, list]) => (
                  <div key={label}>
                    <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {label}
                    </p>
                    <div className="flex flex-col gap-1">
                      {list.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setConversationId(c.id);
                            setShowHistory(false);
                          }}
                          className={`truncate rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/50 ${
                            c.id === conversationId ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {displayTitle(c)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Transcript */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            {loadingMessages && !isGuest ? (
              <div className="py-8">
                <Loader />
              </div>
            ) : isEmpty ? (
              <AiSuggestions
                scope={scope}
                courseTitle={courseTitle}
                onPick={stream.send}
                disabled={stream.isStreaming}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {visibleMessages.map((m) => (
                  <AiMessage key={m.id} role={m.role} content={m.content} />
                ))}

                {stream.isStreaming && (
                  <AiMessage
                    role="ASSISTANT"
                    content={stream.streamingText || "…"}
                    isStreaming
                  />
                )}
              </div>
            )}

            {stream.error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-foreground"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <p>{stream.error.message}</p>
                  {stream.error.requestId && (
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      Reference: {stream.error.requestId}
                    </p>
                  )}
                  {stream.canRetry && (
                    <button
                      type="button"
                      onClick={stream.retry}
                      className="mt-1.5 font-medium text-primary underline underline-offset-2 hover:opacity-80"
                    >
                      Try again
                    </button>
                  )}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <AiInput
            onSend={stream.send}
            onCancel={stream.cancel}
            isStreaming={stream.isStreaming}
          />
        </>
      )}
    </div>
  );
}
