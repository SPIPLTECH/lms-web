"use client";

import { Bot, User } from "lucide-react";
import { renderMarkdownToSafeHtml } from "@/lib/markdown";

/**
 * One chat bubble.
 *
 * Assistant output is Markdown from an LLM, so it goes through the project's
 * existing sanitiser rather than being injected raw. User text is rendered as
 * plain text — never as HTML — so a message can't inject markup into the page.
 */
export default function AiMessage({ role, content, isStreaming = false }) {
  const isAssistant = role === "ASSISTANT";

  return (
    <div className={`flex gap-2.5 ${isAssistant ? "" : "flex-row-reverse"}`}>
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isAssistant ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}
        aria-hidden="true"
      >
        {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isAssistant
            ? "bg-muted/60 text-foreground rounded-tl-sm"
            : "bg-primary text-primary-foreground rounded-tr-sm"
        }`}
      >
        {isAssistant ? (
          <div
            className="ai-prose break-words [&_code]:rounded [&_code]:bg-background/70 [&_code]:px-1 [&_code]:py-0.5 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-background/80 [&_pre]:p-3 [&_h3]:mt-2 [&_h3]:font-semibold"
            dangerouslySetInnerHTML={{ __html: renderMarkdownToSafeHtml(content || "") }}
          />
        ) : (
          <span className="whitespace-pre-wrap break-words">{content}</span>
        )}

        {isStreaming && (
          <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-current align-middle" />
        )}
      </div>
    </div>
  );
}
