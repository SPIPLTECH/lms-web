"use client";

import { useState } from "react";
import { Bot, Lightbulb, Bug, Send } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/shadcn/sheet";
import CodeItMarkdown from "./CodeItMarkdown";
import Loader from "@/components/common/Loader";
import { useAskCodeItTutor } from "@/hooks/queries/student/useCodeIt";
import { codeItErrorMessage } from "@/services/codeIt.service";

const REPLY_LANGUAGES = [
  { id: "en", label: "English" },
  { id: "mr", label: "मराठी" },
  { id: "hi", label: "हिंदी" },
];

const QUICK_ACTIONS = [
  { label: "Explain Code", icon: Lightbulb, question: "Explain this code step by step." },
  { label: "Find Bugs", icon: Bug, question: "Find bugs in this code and explain how to fix them." },
];

/** Side sheet: ask the AI tutor about the code currently in the editor. */
export default function AiTutorPanel({ open, onOpenChange, language, code }) {
  const [replyLang, setReplyLang] = useState("en");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]); // {role: "user"|"bot"|"error", text}
  const ask = useAskCodeItTutor();

  const send = (text) => {
    const q = text.trim();
    if (!q || ask.isPending) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setQuestion("");
    ask.mutate(
      { language, code, question: q, replyLang },
      {
        onSuccess: (answer) => setMessages((m) => [...m, { role: "bot", text: answer }]),
        onError: (err) => setMessages((m) => [...m, { role: "error", text: codeItErrorMessage(err) }]),
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="flex items-center gap-2">
            <Bot size={18} className="text-primary" /> AI Tutor
          </SheetTitle>
          <SheetDescription>Ask about the code in your editor.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          {QUICK_ACTIONS.map(({ label, icon: Icon, question: q }) => (
            <button
              key={label}
              type="button"
              disabled={ask.isPending || !code?.trim()}
              onClick={() => send(q)}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50 cursor-pointer"
            >
              <Icon size={13} /> {label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 text-xs">
            {REPLY_LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setReplyLang(l.id)}
                className={`rounded-md px-2 py-1 cursor-pointer ${
                  replyLang === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground">Tap a button above or type any doubt about your code.</p>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-xl bg-primary/10 px-3 py-2 text-sm text-foreground">
                {m.text}
              </div>
            ) : m.role === "error" ? (
              <p key={i} className="text-xs text-destructive">{m.text}</p>
            ) : (
              <div key={i} className="rounded-xl border border-border px-3 py-2 text-sm">
                <CodeItMarkdown source={m.text} />
              </div>
            )
          )}
          {ask.isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader /> Thinking…
            </div>
          )}
        </div>

        <form
          className="flex gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(question);
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a doubt…"
            maxLength={2000}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
          />
          <button
            type="submit"
            disabled={ask.isPending || !question.trim()}
            aria-label="Send"
            className="rounded-lg bg-primary px-3 text-primary-foreground disabled:opacity-50 cursor-pointer"
          >
            <Send size={16} />
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
