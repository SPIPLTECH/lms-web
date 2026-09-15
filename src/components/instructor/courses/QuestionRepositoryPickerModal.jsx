"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, CheckSquare, Square } from "lucide-react";

import Modal from "@/components/ui/Modal";
import { getRepositoryQuestions } from "@/services/questionRepository.service";

/**
 * Lets an instructor pull their own existing questions from the Question
 * Repository into whatever quiz they're currently editing, instead of only
 * being able to type brand-new ones. The repository is scoped per author by
 * the API, and this picker additionally asks for published, active questions
 * belonging to the course the quiz is in. Selection is local to the modal —
 * nothing is attached to the quiz until "Add Selected" hands the picked
 * questions back to the caller, which merges them into the quiz's own
 * (unsaved-until-Save-Changes) question list.
 */
export default function QuestionRepositoryPickerModal({ open, onClose, onAddQuestions, excludeIds = [], courseId = null }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  const excludeSet = new Set(excludeIds.map(String));

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setPage(1);
    setSelectedIds(new Set());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);
    setError("");

    // A quiz may only be built out of questions that are published and still
    // active. Without these the picker inherited the endpoint's default, which
    // is "anything not deleted" — so archived questions, withdrawn on purpose,
    // were still offered here and could be pulled into a live quiz.
    // Scoped to the course this quiz belongs to: a quiz is built from that
    // course's own question bank, not from every question the instructor has
    // ever written. Without courseId the endpoint returns the whole
    // repository, which is what made unrelated questions show up here.
    getRepositoryQuestions({ search, page, limit: 10, status: "ACTIVE", publishedOnly: true, ...(courseId ? { courseId } : {}) })
      .then((res) => {
        if (cancelled) return;
        setItems(res?.data || []);
        setTotalPages(res?.pagination?.totalPages || 1);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load repository questions.");
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, search, page, courseId]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelected = () => {
    const chosen = items.filter((q) => selectedIds.has(q.id));
    onAddQuestions?.(chosen);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add from Question Repository" size="lg">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="relative shrink-0 mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search repository questions..."
            className="w-full rounded-xl border border-transparent bg-background !pl-9 !pr-3 py-2 text-sm text-foreground outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Loading questions…
            </div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-red-400">{error}</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground italic">
              {search
                ? "No questions match your search."
                : courseId
                  ? "No repository questions are assigned to this course yet."
                  : "No repository questions yet."}
            </div>
          ) : (
            items.map((q) => {
              const alreadyInQuiz = excludeSet.has(String(q.id));
              const isChecked = selectedIds.has(q.id);
              return (
                <button
                  type="button"
                  key={q.id}
                  disabled={alreadyInQuiz}
                  onClick={() => toggleSelect(q.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition ${
                    alreadyInQuiz
                      ? "border-border bg-background/30 opacity-50 cursor-not-allowed"
                      : isChecked
                        ? "border-emerald-500/60 bg-emerald-500/10 cursor-pointer"
                        : "border-border bg-background/60 hover:border-transparent cursor-pointer"
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Square size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold text-foreground leading-relaxed">{q.question}</p>
                    <div className="flex items-center gap-1.5 flex-wrap text-[12px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-foreground">{q.questionType}</span>
                      {q.difficulty && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">{q.difficulty}</span>
                      )}
                      {alreadyInQuiz && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Already in this quiz</span>
                      )}
                      {!alreadyInQuiz && q.usedInQuizzesCount > 0 && (
                        <span className="text-muted-foreground">Used in {q.usedInQuizzesCount} quiz{q.usedInQuizzesCount === 1 ? "" : "zes"}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-between pt-3 mt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-transparent text-sm font-bold text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <span className="text-sm font-mono text-muted-foreground">Page {page} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-transparent text-sm font-bold text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        )}

        <div className="shrink-0 flex items-center justify-between pt-4 mt-1 border-t border-border">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={handleAddSelected}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-foreground text-sm font-extrabold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Add Selected ({selectedIds.size})
          </button>
        </div>
      </div>
    </Modal>
  );
}
