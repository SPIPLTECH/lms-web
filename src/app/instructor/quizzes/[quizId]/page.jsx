"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  RefreshCw,
  Edit3,
  Pencil,
  Check,
  X,
  BookOpen,
} from "lucide-react";
import { useQuiz } from "@/hooks/queries/instructor/useQuiz";
import { useUpdateQuiz } from "@/hooks/queries/instructor/useUpdateQuiz";
import {
  useRemoveQuestionFromQuiz,
  useReorderQuizQuestions,
  useUpdateQuizQuestionMarks,
} from "@/hooks/queries/instructor/useQuestionRepository";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/context/ConfirmContext";

export default function InstructorQuizDetailPage({ params }) {
  const resolvedParams = use(params);
  const quizId = resolvedParams.quizId;
  const { showToast } = useToast();
  const confirm = useConfirm();

  const { data: quiz, isLoading: loading } = useQuiz(quizId);
  const [editingMarksId, setEditingMarksId] = useState(null);
  const [marksValue, setMarksValue] = useState("");

  const removeQuestionMutation = useRemoveQuestionFromQuiz();
  const reorderMutation = useReorderQuizQuestions();
  const updateMarksMutation = useUpdateQuizQuestionMarks();
  const updateQuizMutation = useUpdateQuiz();

  // Remove question from quiz
  const handleRemoveQuestion = async (questionId) => {
    const confirmed = await confirm({
      title: "Remove question",
      message: "Remove this question from the quiz? It will remain in your Question Repository.",
      confirmText: "Remove",
    });
    if (!confirmed) return;
    removeQuestionMutation.mutate(
      { quizId, questionId },
      {
        onSuccess: () => showToast("Question removed from quiz.", "success"),
        onError: (err) => showToast("Failed to remove question: " + (err?.message || "Server error"), "error"),
      }
    );
  };

  // Move question up/down
  const handleMoveQuestion = (idx, direction) => {
    if (!quiz || !quiz.questions) return;

    const questions = [...quiz.questions];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const temp = questions[idx];
    questions[idx] = questions[targetIdx];
    questions[targetIdx] = temp;

    const orderedIds = questions.map((q) => q.id);
    reorderMutation.mutate({ quizId, orderedQuestionIds: orderedIds });
  };

  // Update marks override
  const handleSaveMarks = (questionId) => {
    const num = parseInt(marksValue, 10);
    if (isNaN(num) || num <= 0) return;

    updateMarksMutation.mutate(
      { quizId, questionId, marks: num },
      {
        onSuccess: () => setEditingMarksId(null),
        onError: (err) => showToast("Failed to update marks: " + (err?.message || "Server error"), "error"),
      }
    );
  };

  // Toggle publish status
  const handleTogglePublish = () => {
    if (!quiz) return;
    const newIsPublished = !quiz.isPublished;
    const newStatus = newIsPublished ? "PUBLISHED" : "DRAFT";
    updateQuizMutation.mutate(
      { quizId, quizData: { isPublished: newIsPublished, status: newStatus } },
      {
        onSuccess: () => showToast(`Quiz status updated to ${newStatus}.`, "success"),
        onError: (err) => showToast("Failed to update quiz status: " + (err?.message || "Server error"), "error"),
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-10 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
        <p className="text-sm text-muted-foreground">Loading Quiz Details...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background text-foreground p-10 text-center space-y-4">
        <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Quiz Not Found</h2>
        <Link href="/instructor/courses" className="text-amber-400 text-xs underline">
          Return to Courses
        </Link>
      </div>
    );
  }

  const totalMarks = (quiz.questions || []).reduce((sum, q) => sum + (q.marks || 1), 0);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center space-x-3">
          <Link
            href="/instructor/courses"
            className="p-2 rounded-xl bg-background border border-transparent text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${quiz.isPublished ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
                {quiz.isPublished ? "PUBLISHED" : "DRAFT"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1">{quiz.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{quiz.description || "No description provided."}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Quiz Metadata Summary Bar */}
        <div className="p-6 rounded-3xl bg-background/90 border border-transparent flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto text-center md:text-left">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">Questions</span>
              <p className="text-xl font-bold text-amber-400">{quiz.questions ? quiz.questions.length : 0}</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">Total Marks</span>
              <p className="text-xl font-bold text-sky-400">{totalMarks}</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">Duration</span>
              <p className="text-xl font-bold text-emerald-400">{Number(quiz.timeLimit) > 0 ? `${quiz.timeLimit} mins` : "No timer"}</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">Passing Score</span>
              <p className="text-xl font-bold text-purple-400">{quiz.passingScore || 60}%</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
            <Link
              href={`/instructor/questions/create/${quizId}`}
              className="px-4 py-2.5 rounded-xl bg-background border border-transparent hover:border-amber-500/50 text-foreground text-xs font-bold transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Write New Question</span>
            </Link>

            <Link
              href={`/instructor/quizzes/${quizId}/import-questions`}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Import From Repository</span>
            </Link>

            <button
              onClick={handleTogglePublish}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition ${
                quiz.isPublished
                  ? "bg-background border-transparent text-foreground hover:bg-muted"
                  : "bg-emerald-600 hover:bg-emerald-500 text-foreground border-emerald-500"
              }`}
            >
              {quiz.isPublished ? "Unpublish (Draft)" : "Publish Quiz"}
            </button>
          </div>
        </div>

        {/* Questions Builder & Reordering List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span>Quiz Questions ({quiz.questions ? quiz.questions.length : 0})</span>
            </h3>

            <Link
              href={`/instructor/quizzes/${quizId}/import-questions`}
              className="text-xs text-amber-400 hover:underline font-semibold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add More Questions</span>
            </Link>
          </div>

          {!quiz.questions || quiz.questions.length === 0 ? (
            <div className="p-16 rounded-3xl bg-background/60 border border-transparent text-center space-y-3">
              <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-foreground">No Questions in Quiz Yet</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Import questions from your centralized Question Repository to build this quiz.
              </p>
              <Link
                href={`/instructor/quizzes/${quizId}/import-questions`}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Import Questions From Repository</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {quiz.questions.map((q, idx) => (
                <div key={q.id || idx} className="p-5 rounded-3xl bg-background/80 border border-transparent space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>

                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="px-2 py-0.5 rounded bg-muted text-foreground text-[10px] font-mono">
                            {q.questionType || q.type || "MCQ"}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono">
                            {q.difficulty || "MEDIUM"}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-foreground">{q.title || q.question}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{q.question}</p>
                      </div>
                    </div>

                    {/* Controls & Marks Edit */}
                    <div className="flex items-center space-x-3 shrink-0">
                      {editingMarksId === q.id ? (
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            min="1"
                            value={marksValue}
                            onChange={(e) => setMarksValue(e.target.value)}
                            className="w-16 bg-background border border-amber-500 text-foreground rounded px-2 py-1 text-xs font-mono font-bold focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveMarks(q.id)}
                            className="p-1 rounded bg-emerald-600 text-foreground"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingMarksId(null)} className="p-1 rounded bg-muted text-muted-foreground">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 group">
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                            {q.marks || 1} pts
                          </span>
                          <button
                            onClick={() => {
                              setEditingMarksId(q.id);
                              setMarksValue(String(q.marks || 1));
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-amber-400 transition"
                            title="Override Marks"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center space-x-1 border-l border-transparent pl-3">
                        <Link
                          href={`/instructor/questions/edit/${q.id}`}
                          className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-amber-400"
                          title="Edit Question"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => handleMoveQuestion(idx, -1)}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="Move Question Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleMoveQuestion(idx, 1)}
                          disabled={idx === quiz.questions.length - 1}
                          className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="Move Question Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-rose-400 ml-1"
                          title="Remove from Quiz"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
