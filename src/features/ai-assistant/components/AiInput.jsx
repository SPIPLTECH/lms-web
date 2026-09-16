"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Square } from "lucide-react";

const MAX_CHARS = 4000; // Mirrors the backend Joi cap.

/**
 * Composer. Enter sends, Shift+Enter inserts a newline, and the textarea grows
 * with its content up to a ceiling.
 *
 * While streaming, the send button becomes a stop button rather than
 * disappearing, so cancelling is always one click away.
 */
export default function AiInput({ onSend, onCancel, isStreaming, disabled }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || isStreaming || disabled) return;
    setValue("");
    onSend(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const overLimit = value.length > MAX_CHARS;

  return (
    <div className="border-t border-border bg-background/95 p-3">
      <div className="flex items-end gap-2">
        <label htmlFor="ai-assistant-input" className="sr-only">
          Ask the AI Assistant
        </label>
        <textarea
          id="ai-assistant-input"
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Assistant unavailable" : "Ask about this course…"}
          className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onCancel}
            title="Stop generating"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Square className="h-4 w-4" />
            <span className="sr-only">Stop generating</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() || overLimit || disabled}
            title="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </button>
        )}
      </div>

      {overLimit && (
        <p className="mt-1.5 text-xs text-destructive">
          Message is too long ({value.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters).
        </p>
      )}
    </div>
  );
}
