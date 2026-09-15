"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle, Loader2, Send, X } from "lucide-react";

import { useCreateLessonQuery, useMyQuestions } from "@/hooks/queries/student/useLessonQueries";
import { useToast } from "@/components/ui/ToastProvider";

const timeAgo = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
};

/**
 * "Ask instructor" — write a question about the item on screen and see the
 * questions already asked about it, with the instructor's replies.
 * Questions go to the instructor's Q&A page with that item attached.
 *
 * `target` is the item on screen — { kind: "content" | "quiz" | "assignment",
 * id, title }. A question is tied to that one item and is only ever listed
 * back on it. With no item on screen, questions are lesson-wide, and the
 * lesson-wide list excludes every item-specific question.
 *
 * `inline` renders the form and list directly (the learning side panel's
 * Ask instructor section); otherwise it's a small button that opens the
 * same content in a popover beside it.
 */
const TARGET_FIELD = { content: "contentId", quiz: "quizId", assignment: "assignmentId" };
const TARGET_FALLBACK_LABEL = { content: "this section", quiz: "this quiz", assignment: "this assignment" };

export default function AskInstructorCard({ lessonId, target, inline = false }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const rootRef = useRef(null);
  const textareaRef = useRef(null);
  const { showToast } = useToast();

  const isShown = inline || open;
  const targetField = target?.id ? TARGET_FIELD[target.kind] : null;
  const targetId = targetField ? target.id : null;
  const canAsk = Boolean(targetId || lessonId);
  const aboutLabel = targetId
    ? target.title || TARGET_FALLBACK_LABEL[target.kind]
    : "this lesson";

  // Past questions for exactly this item; lesson-wide only when there's none.
  const { data: questions = [], isLoading } = useMyQuestions(
    targetId ? { [targetField]: targetId } : { lessonId, lessonOnly: "true" },
    { enabled: isShown && canAsk }
  );
  const createMutation = useCreateLessonQuery();

  // Popover only: close on outside click or Escape, like the navbar menus.
  useEffect(() => {
    if (inline || !open) return;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    textareaRef.current?.focus();
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, inline]);

  // A new item on screen means a new context — start the draft fresh.
  useEffect(() => {
    setQuestion("");
  }, [targetField, targetId, lessonId]);

  const trimmed = question.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!trimmed || !canAsk || createMutation.isPending) return;
    createMutation.mutate(
      {
        ...(targetId ? { [targetField]: targetId } : {}),
        ...(lessonId ? { lessonId } : {}),
        question: trimmed,
      },
      {
        onSuccess: () => {
          setQuestion("");
          showToast("Question sent to your instructor.", "success");
        },
        onError: (error) =>
          showToast(error?.response?.data?.message || "Your question wasn't sent. Try again.", "error"),
      }
    );
  };

  const body = (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground">Ask your instructor</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">About {aboutLabel}</p>
        </div>
        {!inline && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {canAsk ? (
        <form onSubmit={handleSubmit} className="space-y-2 px-4 pt-3">
          <label htmlFor="ask-instructor-question" className="sr-only">
            Your question
          </label>
          <textarea
            id="ask-instructor-question"
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="What would you like to ask?"
            disabled={createMutation.isPending}
            className="w-full resize-y rounded-xl border border-border bg-background/60 px-3 py-2 text-base leading-relaxed text-foreground outline-none transition focus:border-primary disabled:opacity-50"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] tabular-nums text-muted-foreground">{question.length}/2000</span>
            <button
              type="submit"
              disabled={!trimmed || createMutation.isPending}
              aria-busy={createMutation.isPending}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-bold text-slate-950 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {createMutation.isPending ? (
                <Loader2 size={13} className="animate-spin" aria-hidden />
              ) : (
                <Send size={13} aria-hidden />
              )}
              Send question
            </button>
          </div>
        </form>
      ) : (
        <p className="px-4 pt-3 text-sm text-muted-foreground">Open a lesson to ask your instructor about it.</p>
      )}

      <div className="mt-3 border-t border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Your questions here</p>
        {isLoading ? (
          <div className="mt-2 space-y-2">
            <div className="h-10 rounded-lg bg-muted animate-pulse" />
            <div className="h-10 rounded-lg bg-muted animate-pulse" />
          </div>
        ) : questions.length === 0 ? (
          <p className="mt-1.5 text-sm text-muted-foreground">You haven&apos;t asked anything about this yet.</p>
        ) : (
          <ul className="mt-2 max-h-60 space-y-2 overflow-y-auto pr-1">
            {questions.map((q) => (
              <li key={q.id} className="rounded-lg border border-border bg-background/40 px-3 py-2">
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">{q.question}</p>
                <p className="mt-1 flex items-center gap-2 text-[13px]">
                  <span className={q.status === "ANSWERED" ? "text-emerald-500" : "text-amber-500"}>
                    {q.status === "ANSWERED" ? "Answered" : "Waiting for a reply"}
                  </span>
                  <span className="text-muted-foreground">{timeAgo(q.createdAt)}</span>
                </p>
                {q.reply && (
                  <div className="mt-2 border-l-2 border-emerald-500/40 pl-2.5">
                    <p className="text-[13px] font-medium text-muted-foreground">Instructor</p>
                    <p className="whitespace-pre-wrap break-words text-sm text-foreground">{q.reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );

  if (inline) {
    return <div className="rounded-2xl border border-border bg-card">{body}</div>;
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3.5 text-base font-semibold transition-colors cursor-pointer ${
          open
            ? "border-primary/60 bg-primary/10 text-primary"
            : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
        }`}
      >
        <HelpCircle size={16} aria-hidden />
        Ask instructor
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Ask your instructor"
          // Opens to the left of the button in the desktop side panel (the
          // panel sits at the page's right edge); below it on smaller screens.
          className="absolute left-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card shadow-2xl shadow-black/40 xl:left-auto xl:right-full xl:top-0 xl:mt-0 xl:mr-3"
        >
          {body}
        </div>
      )}
    </div>
  );
}
