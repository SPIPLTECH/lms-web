"use client";

import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  Award,
  FileText,
  Check,
  ListChecks,
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Library,
  RotateCcw
} from "lucide-react";

import QuestionRepositoryPickerModal from "./QuestionRepositoryPickerModal";
import Modal from "@/components/ui/Modal";
import { QUESTION_TYPE_OPTIONS, RETIRED_QUESTION_TYPES } from "@/lib/questionType";

// Question.options (backend) may hold plain strings or richer
// { optionText, isCorrect?, misconceptionTag? } objects (see
// question.helper.js/QuestionUploadParser.js) — this editor only ever
// authors/edits plain strings, so every option gets reduced to its display
// text on load. Rendering one of those objects directly as a React child
// (e.g. `{opt}` in JSX) crashes with "Objects are not valid as a React
// child", which is what this normalization prevents.
function getOptionText(opt) {
  if (opt && typeof opt === "object") return String(opt.optionText ?? opt.text ?? "");
  return String(opt ?? "");
}

const optionToText = getOptionText;

// A quiz's tag is independent of its scope/level: Lesson + Self-Test and
// Lesson + Final Quiz are both valid. Self-Test is never timed.
export const QUIZ_TAG_LABELS = {
  SELF_TEST: "Self-Test",
  FINAL: "Final Quiz",
  QUALIFYING: "Qualifying Test",
};

// A Qualifying Test is the odd one out: it is not material inside its lesson
// or topic, it is the test that lets a student SKIP that lesson or topic, and
// it is excluded from progress. It is therefore only offered where there is
// something to skip — a lesson- or topic-scoped quiz. The backend refuses one
// without a lesson/topic regardless; this only keeps the option from being
// offered where it could never be saved.
const QUIZ_TAG_OPTIONS = [
  { value: "SELF_TEST", label: "Self-Test", hint: "Practice — no timer" },
  { value: "FINAL", label: "Final Quiz", hint: "Formal assessment" },
  {
    value: "QUALIFYING",
    label: "Qualifying Test",
    hint: "Lets a student skip this content",
    requiresLessonOrTopicScope: true,
  },
];

// A Self-Test is never timed; a Final and a Qualifying Test both may be.
const isTimedTag = (tag) => tag === "FINAL" || tag === "QUALIFYING";

const DEFAULT_TIME_LIMIT = 30;

// Both edit entry points (opening a quiz, and cancelling out of an edit) seed
// the form the same way. Note there is no timeLimit fallback: a null limit
// means "untimed" and must survive a round trip through this form.
function quizFormFromQuiz(quiz) {
  const timeLimit = Number(quiz.timeLimit) > 0 ? Number(quiz.timeLimit) : null;

  return {
    title: quiz.title || "",
    description: quiz.description || "",
    // Rows cached from before quiz tags existed read as the formal
    // assessment they were authored as.
    quizTag: QUIZ_TAG_LABELS[quiz.quizTag] ? quiz.quizTag : "FINAL",
    timerEnabled: timeLimit !== null,
    timeLimit,
    passingScore: quiz.passingScore !== undefined && quiz.passingScore !== null ? quiz.passingScore : 50,
    // A Final's limit (1 by default). A Self-Test is always unlimited and is
    // stored as 0, which becomes the Final default if the tag is flipped.
    attempts: Number(quiz.attempts) > 0 ? quiz.attempts : 1,
    isPublished: quiz.isPublished !== false,
  };
}

export function QuizOverviewView({
  quiz,
  quizMode = "view",
  // The course being edited. Scopes the repository picker to this course's
  // own questions — falls back to the quiz's own courseId so a caller that
  // doesn't pass it still narrows correctly.
  courseId = null,
  moduleTitle = null,
  lessonTitle = null,
  topicTitle = null,
  onSaveQuiz,
  onCancel,
  startEditing = false,
}) {
  const [isEditing, setIsEditing] = useState(startEditing || quizMode === "create" || quizMode === "edit");

  // Whether this quiz hangs off something a student could be exempted from.
  // A course- or module-level quiz has no skip target, so the Qualifying Test
  // tag is not offered there.
  const hasSkippableScope = Boolean(
    quiz?.topicId || quiz?.lessonId || topicTitle || lessonTitle
  );

  // Active single question index in editor mode (0-indexed) — view/preview
  // mode has no equivalent since it lists every question at once.
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Editable Quiz Metadata. `timerEnabled` is UI-only: it separates "this
  // Final Quiz is deliberately untimed" from "the minutes box is empty",
  // both of which save timeLimit as null.
  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    quizTag: "",
    timerEnabled: false,
    timeLimit: null,
    passingScore: 70,
    attempts: 1,
    isPublished: true,
  });

  // Editable Questions Array
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [showRepoPicker, setShowRepoPicker] = useState(false);

  // Set once a save comes back successful — its presence opens the "Quiz
  // Saved" confirmation, and it carries the figures that dialog reports.
  const [savedSummary, setSavedSummary] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when quiz prop, quizMode, or startEditing changes
  useEffect(() => {
    if (quizMode === "create") {
      setIsEditing(true);
      setQuizForm({
        title: topicTitle ? `Quiz - ${topicTitle}` : lessonTitle ? `Quiz - ${lessonTitle}` : moduleTitle ? `Quiz - ${moduleTitle}` : "Course Quiz",
        description: "",
        // Deliberately unselected — the instructor must choose practice or
        // assessment rather than inherit a default.
        quizTag: "",
        timerEnabled: false,
        timeLimit: null,
        passingScore: 70,
        attempts: 1,
        isPublished: true,
      });
      setQuestions([]);
      setCurrentQuestionIndex(0);
    } else if (startEditing || quizMode === "edit") {
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  }, [quizMode, startEditing, moduleTitle, lessonTitle, topicTitle]);

  useEffect(() => {
    if (quiz && quizMode !== "create") {
      setQuizForm(quizFormFromQuiz(quiz));

      const rawQuestions = quiz.questions || (quiz.quizQuestions || []).map((qq) => ({
        ...qq.question,
        id: qq.question?.id || qq.id,
        marks: qq.marks || qq.question?.marks || 1,
        order: qq.order,
      })) || [];

      const normalized = rawQuestions.map((q, idx) => ({
        id: q.id || `draft-que-${quiz.id || "temp"}-${idx + 1}`,
        question: q.question || q.title || "",
        questionType: (q.questionType || q.type || "MCQ_SINGLE").toUpperCase(),
        options: Array.isArray(q.options)
          ? q.options.map(optionToText)
          : (typeof q.options === "object" && q.options !== null ? Object.values(q.options).map(optionToText) : ["Option 1", "Option 2"]),
        correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : "",
        explanation: q.explanation || "",
        hint: q.hint || "",
        marks: q.marks !== undefined ? Number(q.marks) : 1,
        difficulty: q.difficulty || "MEDIUM",
        isMandatory: q.isMandatory !== false,
      }));

      setQuestions(normalized);
      setCurrentQuestionIndex(0);
    }
  }, [quiz, quizMode]);

  if (!quiz && quizMode !== "create") {
    return (
      <div className="notebook-cell rounded-2xl border border-border bg-background p-8 text-center shadow-md space-y-3">
        <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Quiz Not Found</h3>
        <p className="text-sm text-muted-foreground">Select a quiz from the Course Map on the left to view details.</p>
      </div>
    );
  }

  const handleStartEdit = () => {
    setError("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setError("");
    if (quizMode === "create") {
      onCancel?.();
    } else {
      setIsEditing(false);
      // Reset state to original quiz prop
      if (quiz) {
        setQuizForm(quizFormFromQuiz(quiz));
      }
    }
  };

  // Add a new question to local edit state and jump to it
  const handleAddQuestion = () => {
    const newQId = `draft-que-${quiz?.id || "temp"}-${Date.now()}`;
    const newQuestionObj = {
      id: newQId,
      question: `New Question ${questions.length + 1}`,
      questionType: "MCQ_SINGLE",
      options: ["Option 1", "Option 2"],
      correctAnswer: "Option 1",
      explanation: "",
      hint: "",
      marks: 1,
      difficulty: "MEDIUM",
      isMandatory: true,
    };

    setQuestions((prev) => [...prev, newQuestionObj]);
    setCurrentQuestionIndex(questions.length);
  };

  // Merges questions picked from the shared Question Repository into local
  // edit state, keeping their real (non-draft-prefixed) id — that's how
  // page.jsx's save-time diff tells "brand new" questions apart from
  // "existing repository question being attached to this quiz for the
  // first time," so it links rather than re-creates them.
  const handleAddRepositoryQuestions = (chosen) => {
    const mapped = chosen.map((q) => ({
      id: q.id,
      question: q.question || "",
      questionType: (q.questionType || "MCQ_SINGLE").toUpperCase(),
      options: Array.isArray(q.options) ? q.options.map(optionToText) : [],
      correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : "",
      explanation: q.explanation || "",
      hint: q.hint || "",
      marks: q.marks !== undefined ? Number(q.marks) : 1,
      difficulty: q.difficulty || "MEDIUM",
      isMandatory: true,
    }));
    setQuestions((prev) => [...prev, ...mapped]);
    setCurrentQuestionIndex(questions.length);
  };

  // Remove active question from local edit state
  const handleRemoveCurrentQuestion = () => {
    if (questions.length === 0) return;
    setQuestions((prev) => prev.filter((_, idx) => idx !== currentQuestionIndex));
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  // Field change for current question
  const handleCurrentQuestionChange = (field, value) => {
    setQuestions((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const target = { ...updated[currentQuestionIndex], [field]: value };

      // Type change defaults
      if (field === "questionType") {
        if (value === "TRUE_FALSE") {
          target.options = ["True", "False"];
          target.correctAnswer = "True";
        } else if (value === "MCQ_SINGLE" || value === "MCQ_MULTI") {
          if (!Array.isArray(target.options) || target.options.length < 2) {
            target.options = ["Option 1", "Option 2"];
          }
          if (value === "MCQ_SINGLE" && Array.isArray(target.correctAnswer)) {
            // Never invent a key: if no option was selected under MCQ_MULTI,
            // leave it unset so the instructor must explicitly pick one —
            // handleSaveChanges blocks saving until they do.
            target.correctAnswer = target.correctAnswer[0] || "";
          }
        }
      }

      updated[currentQuestionIndex] = target;
      return updated;
    });
  };

  // Option text change for current question
  const handleOptionTextChange = (optIdx, text) => {
    setQuestions((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const q = { ...updated[currentQuestionIndex] };
      const newOpts = [...(q.options || [])];
      const oldVal = newOpts[optIdx];
      newOpts[optIdx] = text;
      q.options = newOpts;

      if (q.questionType === "MCQ_SINGLE" && q.correctAnswer === oldVal) {
        q.correctAnswer = text;
      } else if (q.questionType === "MCQ_MULTI" && Array.isArray(q.correctAnswer)) {
        q.correctAnswer = q.correctAnswer.map((ca) => (ca === oldVal ? text : ca));
      }

      updated[currentQuestionIndex] = q;
      return updated;
    });
  };

  // Add option to current question
  const handleAddOption = () => {
    setQuestions((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const q = { ...updated[currentQuestionIndex] };
      const opts = Array.isArray(q.options) ? [...q.options] : [];
      opts.push(`Option ${opts.length + 1}`);
      q.options = opts;
      updated[currentQuestionIndex] = q;
      return updated;
    });
  };

  // Remove option from current question
  const handleRemoveOption = (optIdx) => {
    setQuestions((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const q = { ...updated[currentQuestionIndex] };
      const opts = (q.options || []).filter((_, i) => i !== optIdx);
      q.options = opts;

      if (q.questionType === "MCQ_SINGLE" && !opts.includes(q.correctAnswer)) {
        q.correctAnswer = opts[0] || "";
      }
      updated[currentQuestionIndex] = q;
      return updated;
    });
  };

  // Toggle correct option for current question
  const handleToggleCorrectOption = (optVal) => {
    setQuestions((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const q = { ...updated[currentQuestionIndex] };

      if (q.questionType === "MCQ_SINGLE" || q.questionType === "TRUE_FALSE") {
        q.correctAnswer = optVal;
      } else if (q.questionType === "MCQ_MULTI") {
        const currentArr = Array.isArray(q.correctAnswer)
          ? q.correctAnswer
          : (typeof q.correctAnswer === "string" ? [q.correctAnswer] : []);

        if (currentArr.includes(optVal)) {
          q.correctAnswer = currentArr.filter((item) => item !== optVal);
        } else {
          q.correctAnswer = [...currentArr, optVal];
        }
      }

      updated[currentQuestionIndex] = q;
      return updated;
    });
  };

  // Save changes
  const handleSaveChanges = async (e) => {
    if (e) e.preventDefault();

    if (!quizForm.title.trim()) {
      setError("Quiz title is required.");
      return;
    }

    if (!quizForm.quizTag) {
      setError("Select a quiz tag — Self-Test or Final Quiz.");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question.trim()) {
        setError(`Question #${i + 1} cannot have empty question text.`);
        setCurrentQuestionIndex(i);
        return;
      }

      // Never save a question with an invented answer key — MCQ_SINGLE/
      // TRUE_FALSE need a chosen string, MCQ_MULTI needs at least one.
      const type = questions[i].questionType;
      const answer = questions[i].correctAnswer;
      const missingAnswer =
        type === "MCQ_MULTI" ? !Array.isArray(answer) || answer.length === 0 : !answer;
      if ((type === "MCQ_SINGLE" || type === "MCQ_MULTI" || type === "TRUE_FALSE") && missingAnswer) {
        setError(`Question #${i + 1} needs a correct answer selected before saving.`);
        setCurrentQuestionIndex(i);
        return;
      }
    }

    // Only a Final Quiz with the timer switched on carries a limit. Everything
    // else is null, never 0 — 0 and null both mean "untimed" here, and letting
    // 0 through would leave "0 mins" showing up in read views.
    const effectiveTimeLimit =
      isTimedTag(quizForm.quizTag) && quizForm.timerEnabled && Number(quizForm.timeLimit) > 0
        ? Number(quizForm.timeLimit)
        : null;

    const updatedQuiz = {
      ...quiz,
      title: quizForm.title.trim(),
      description: quizForm.description.trim(),
      quizTag: quizForm.quizTag,
      timeLimit: effectiveTimeLimit,
      passingScore: Number(quizForm.passingScore) || 0,
      // A Self-Test is always unlimited (0); a Final has at least one attempt.
      attempts: quizForm.quizTag === "SELF_TEST" ? 0 : Math.max(1, Math.round(Number(quizForm.attempts)) || 1),
      isPublished: quizForm.isPublished,
      questions: questions.map((q, idx) => ({
        ...q,
        order: idx + 1,
        marks: Number(q.marks) || 1,
      })),
    };

    setIsSaving(true);
    let saved;
    try {
      saved = await onSaveQuiz?.(updatedQuiz);
    } finally {
      setIsSaving(false);
    }

    setIsEditing(false);

    // A handler that reports nothing back (older callers, and the read-only
    // preview) is taken at its word rather than being called a failure — only
    // an explicit `false` means the save was rejected, and that path has
    // already shown its own error.
    if (saved !== false) {
      setSavedSummary({
        title: updatedQuiz.title,
        questionCount: updatedQuiz.questions.length,
        totalMarks: updatedQuiz.questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0),
        quizTag: updatedQuiz.quizTag,
        isPublished: updatedQuiz.isPublished,
      });
    }
  };

  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
  const activeQuestion = questions[currentQuestionIndex] || null;

  return (
    <div className="notebook-cell rounded-2xl border border-border bg-background p-5 shadow-md space-y-5">
      {/* Header Bar */}
      <div className="cell-header flex items-center justify-between border-b border-border/80 pb-3 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[12px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <HelpCircle size={12} />
            {topicTitle ? `Topic Quiz — ${topicTitle}` : lessonTitle ? `Lesson Quiz — ${lessonTitle}` : moduleTitle ? `Module Quiz — ${moduleTitle}` : "Course-Level Quiz"}
          </span>

          {/* Tag sits beside the scope badge, not inside it — the two are
              independent (Lesson + Self-Test is as valid as Lesson + Final). */}
          {quizForm.quizTag && (
            <span
              className={`rounded px-2 py-0.5 text-[12px] font-bold uppercase tracking-wider border ${
                quizForm.quizTag === "SELF_TEST"
                  ? "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20"
                  : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
              }`}
            >
              {QUIZ_TAG_LABELS[quizForm.quizTag]}
            </span>
          )}

          <span
            className={`rounded px-2 py-0.5 text-[12px] font-bold uppercase tracking-wider border ${
              quizForm.isPublished
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
            }`}
          >
            {quizForm.isPublished ? "PUBLISHED" : "DRAFT"}
          </span>
        </div>

        {/* Action Controls: Edit Quiz / Save Changes & Cancel */}
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-bold transition cursor-pointer"
            >
              <Pencil size={14} />
              Edit Quiz
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-sm font-bold transition cursor-pointer"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold transition shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ---------------- VIEW / PREVIEW MODE (ONE QUESTION AT A TIME) ---------------- */}
      {!isEditing && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">{quiz?.title || quizForm.title || "Untitled Quiz"}</h2>
            {(quiz?.description || quizForm.description) && (
              <p className="text-sm text-foreground leading-relaxed bg-background/60 p-3 rounded-xl border border-border/80">
                {quiz?.description || quizForm.description}
              </p>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 text-sm font-medium text-foreground">
              <div className="p-3 rounded-xl bg-background/80 border border-border flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0">
                  <ListChecks size={16} />
                </div>
                <div>
                  <span className="text-[12px] uppercase font-mono text-muted-foreground block">Questions</span>
                  <span className="font-bold text-foreground text-base">{questions.length}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border border-border flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0">
                  <Award size={16} />
                </div>
                <div>
                  <span className="text-[12px] uppercase font-mono text-muted-foreground block">Total Marks</span>
                  <span className="font-bold text-foreground text-base">{totalMarks} pts</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border border-border flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-400 shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <span className="text-[12px] uppercase font-mono text-muted-foreground block">Passing Score</span>
                  <span className="font-bold text-foreground text-base">{quizForm.passingScore}%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border border-border flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-400 shrink-0">
                  <Clock size={16} />
                </div>
                <div>
                  <span className="text-[12px] uppercase font-mono text-muted-foreground block">Time Limit</span>
                  <span className="font-bold text-foreground text-base">{Number(quizForm.timeLimit) > 0 ? `${quizForm.timeLimit} mins` : "No timer"}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border border-border flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10 text-warning shrink-0">
                  <RotateCcw size={16} />
                </div>
                <div>
                  <span className="text-[12px] uppercase font-mono text-muted-foreground block">Attempts</span>
                  <span className="font-bold text-foreground text-base">
                    {quizForm.quizTag === "SELF_TEST" ? "Unlimited" : `${Number(quizForm.attempts) || 1} per student`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ALL QUESTIONS LIST */}
          <div className="pt-4 border-t border-border space-y-3">
            <span className="text-[13px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
              {questions.length > 0 ? `${questions.length} Question${questions.length === 1 ? "" : "s"}` : "No Questions"}
            </span>

            {questions.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm italic bg-background/40 rounded-xl border border-border/80">
                No questions available to preview.
              </div>
            ) : (
              questions.map((q, qIdx) => (
                <div key={q.id || qIdx} className="p-4 rounded-xl border border-border/90 bg-background/60 space-y-3 shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-sm font-mono font-bold border border-emerald-500/30">
                        #{qIdx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-muted text-foreground text-[12.5px] font-mono font-bold">
                        {q.questionType}
                      </span>
                      {q.difficulty && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[12.5px] font-mono font-bold">
                          {q.difficulty}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                      {q.marks || 1} {q.marks === 1 ? "pt" : "pts"}
                    </span>
                  </div>

                  {/* Question Text */}
                  <h4 className="text-base font-semibold text-foreground leading-relaxed pt-1">
                    {q.question}
                  </h4>

                  {/* Options List with Correct Answer Highlight */}
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[13px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">Options:</span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {q.options.map((opt, optIdx) => {
                          const correctAnswerStr = typeof q.correctAnswer === "string" || typeof q.correctAnswer === "number"
                            ? String(q.correctAnswer)
                            : JSON.stringify(q.correctAnswer || "");
                          const isCorrect = correctAnswerStr.includes(String(opt)) || String(opt) === correctAnswerStr;

                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-lg text-sm font-medium border flex items-center justify-between ${
                                isCorrect
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/60 text-emerald-800 dark:text-emerald-300 font-bold"
                                  : "bg-background/80 border-border/80 text-foreground"
                              }`}
                            >
                              <span>{opt}</span>
                              {isCorrect && (
                                <span className="text-[12.5px] font-mono font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
                                  Correct Answer ✓
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Non-MCQ Correct Answer Display */}
                  {(!Array.isArray(q.options) || q.options.length === 0) && q.correctAnswer && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-sm text-emerald-800 dark:text-emerald-300 space-y-1">
                      <span className="font-mono font-bold uppercase text-[12px] text-emerald-700 dark:text-emerald-400 block">Correct Answer:</span>
                      <p className="font-semibold">{String(q.correctAnswer)}</p>
                    </div>
                  )}

                  {/* Explanation / Feedback */}
                  {q.explanation && (
                    <div className="p-3 rounded-lg bg-background/90 border border-border/80 text-sm text-muted-foreground space-y-1">
                      <span className="font-mono font-bold uppercase text-[12px] text-muted-foreground block">Explanation:</span>
                      <p className="leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ---------------- EDIT MODE (ONE QUESTION AT A TIME) ---------------- */}
      {isEditing && (
        <form onSubmit={handleSaveChanges} className="space-y-5">
          {/* Quiz Metadata Editing Header Block */}
          <div className="p-4 rounded-xl bg-background/80 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Quiz Settings</h3>
              <span className="text-[13px] font-mono text-muted-foreground">
                {questions.length} Questions • {totalMarks} Total Marks
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-foreground">Quiz Title *</label>
                <input
                  type="text"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. C Programming Final Assessment"
                  className="w-full rounded-xl border border-transparent bg-background px-3.5 py-1.5 text-sm text-foreground outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[13px] font-semibold text-foreground">Passing %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={quizForm.passingScore}
                    onChange={(e) => setQuizForm((prev) => ({ ...prev, passingScore: e.target.value }))}
                    className="w-full rounded-xl border border-transparent bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Attempts follow the tag, like the timer: a Self-Test can
                    always be retaken; a Final gets the number set here (1 by
                    default). Both rules are enforced server-side. */}
                {quizForm.quizTag === "SELF_TEST" ? (
                  <div className="space-y-1">
                    <span className="block text-[13px] font-semibold text-foreground">Attempts per student</span>
                    <p className="px-2.5 py-1.5 rounded-xl bg-background text-[12.5px] text-muted-foreground">
                      Unlimited for Self-Tests
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label htmlFor="quiz-attempts" className="text-[13px] font-semibold text-foreground">
                      Attempts per student
                    </label>
                    <input
                      id="quiz-attempts"
                      type="number"
                      min="1"
                      max="100"
                      value={quizForm.attempts ?? 1}
                      onChange={(e) => setQuizForm((prev) => ({ ...prev, attempts: e.target.value }))}
                      className="w-24 rounded-xl border border-transparent bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-1.5 p-2 rounded-xl border border-border bg-background cursor-pointer">
                    <input
                      type="checkbox"
                      checked={quizForm.isPublished}
                      onChange={(e) => setQuizForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                      className="accent-emerald-500 h-3.5 w-3.5"
                    />
                    <span className="text-[12.5px] font-semibold text-foreground">Published</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Quiz Tag, and the time limit it governs. A Self-Test never has
                a timer, so its control is removed outright rather than
                disabled — a greyed-out "30" still reads as "30 minutes". */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Quiz Tag *</label>

                <div className="grid grid-cols-2 gap-2">
                  {QUIZ_TAG_OPTIONS.filter(
                    (opt) => !opt.requiresLessonOrTopicScope || hasSkippableScope
                  ).map((opt) => {
                    const selected = quizForm.quizTag === opt.value;

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setQuizForm((prev) => ({
                            ...prev,
                            quizTag: opt.value,
                            // Switching to Self-Test drops the timer here as
                            // well as server-side, so the form never shows a
                            // limit the save will discard.
                            ...(opt.value === "SELF_TEST"
                              ? { timerEnabled: false, timeLimit: null }
                              : {}),
                          }))
                        }
                        aria-pressed={selected}
                        className={`rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                          selected
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-border bg-background hover:border-emerald-500/40"
                        }`}
                      >
                        <span className={`block text-[13px] font-bold ${selected ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
                          {opt.label}
                        </span>
                        <span className="block text-[11.5px] text-muted-foreground">{opt.hint}</span>
                      </button>
                    );
                  })}
                </div>

                {!quizForm.quizTag && (
                  <p className="text-[12px] text-muted-foreground">
                    Choose one before saving.
                  </p>
                )}
              </div>

              {isTimedTag(quizForm.quizTag) && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Time Limit</label>

                  <label className="flex items-center gap-1.5 p-2 rounded-xl border border-border bg-background cursor-pointer">
                    <input
                      type="checkbox"
                      checked={quizForm.timerEnabled}
                      onChange={(e) =>
                        setQuizForm((prev) => ({
                          ...prev,
                          timerEnabled: e.target.checked,
                          timeLimit: e.target.checked
                            ? (Number(prev.timeLimit) > 0 ? prev.timeLimit : DEFAULT_TIME_LIMIT)
                            : null,
                        }))
                      }
                      className="accent-emerald-500 h-3.5 w-3.5"
                    />
                    <span className="text-[12.5px] font-semibold text-foreground">Enable time limit</span>
                  </label>

                  {quizForm.timerEnabled && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={quizForm.timeLimit ?? ""}
                        onChange={(e) => setQuizForm((prev) => ({ ...prev, timeLimit: e.target.value }))}
                        className="w-24 rounded-xl border border-transparent bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-emerald-500"
                      />
                      <span className="text-[12.5px] text-muted-foreground">minutes</span>
                    </div>
                  )}
                </div>
              )}

              {quizForm.quizTag === "SELF_TEST" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Time Limit</label>
                  <p className="p-2 rounded-xl border border-border bg-background text-[12.5px] text-muted-foreground">
                    Self-Test quizzes are never timed. Learners can take this as long as they need.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <input
                type="text"
                value={quizForm.description}
                onChange={(e) => setQuizForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description / instructions..."
                className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* QUESTION NAVIGATION BAR (Top) */}
          <div className="p-3 rounded-xl bg-background/90 border border-border flex items-center justify-between gap-3 flex-wrap">
            {/* Left: Previous Button */}
            <button
              type="button"
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0 || questions.length === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-transparent bg-background hover:bg-muted text-foreground text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            {/* Center: Question Counter & Jump To Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {questions.length > 0 ? `Question ${currentQuestionIndex + 1} of ${questions.length}` : "No Questions"}
              </span>

              {questions.length > 0 && (
                <div className="relative flex items-center">
                  <select
                    value={currentQuestionIndex}
                    onChange={(e) => setCurrentQuestionIndex(Number(e.target.value))}
                    className="bg-background border border-transparent text-foreground text-sm font-semibold rounded-lg px-2.5 py-1 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {questions.map((q, idx) => (
                      <option key={idx} value={idx}>
                        Jump to Question {idx + 1} {idx === currentQuestionIndex ? "✓" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Right: Next Button & Add Question */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 text-sm font-bold transition cursor-pointer"
                title="Add a new question"
              >
                <Plus size={13} /> Add
              </button>

              <button
                type="button"
                onClick={() => setShowRepoPicker(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20 text-sm font-bold transition cursor-pointer"
                title="Add from Question Repository"
              >
                <Library size={13} /> From Repository
              </button>

              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={currentQuestionIndex >= questions.length - 1 || questions.length === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-transparent bg-background hover:bg-muted text-foreground text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* SINGLE ACTIVE QUESTION EDITOR */}
          {activeQuestion ? (
            <div className="p-4 rounded-xl border border-border bg-background/90 space-y-4 shadow-md">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-sm border border-emerald-500/30">
                    Question #{currentQuestionIndex + 1}
                  </span>
                  <span className="text-[13px] font-mono text-muted-foreground">ID: {activeQuestion.id}</span>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveCurrentQuestion}
                  className="p-1.5 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-950/40 transition cursor-pointer flex items-center gap-1 text-sm font-bold"
                  title="Delete this question"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>

              {/* Question Text */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-foreground">Question Text *</label>
                <textarea
                  rows={3}
                  value={activeQuestion.question}
                  onChange={(e) => handleCurrentQuestionChange("question", e.target.value)}
                  placeholder="e.g. Which keyword is used to allocate memory dynamically in C?"
                  className="w-full rounded-xl border border-transparent bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Control Grid: Type, Difficulty, Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[13px] font-semibold text-foreground">Question Type</label>
                  <select
                    value={activeQuestion.questionType}
                    onChange={(e) => handleCurrentQuestionChange("questionType", e.target.value)}
                    className="w-full rounded-xl border border-transparent bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {QUESTION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                    {/* Only for a question that already is one — see
                        RETIRED_QUESTION_TYPES. */}
                    {RETIRED_QUESTION_TYPES[activeQuestion.questionType] && (
                      <option value={activeQuestion.questionType}>
                        {RETIRED_QUESTION_TYPES[activeQuestion.questionType]}
                      </option>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[13px] font-semibold text-foreground">Difficulty</label>
                  <select
                    value={activeQuestion.difficulty}
                    onChange={(e) => handleCurrentQuestionChange("difficulty", e.target.value)}
                    className="w-full rounded-xl border border-transparent bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[13px] font-semibold text-foreground">Marks</label>
                  <input
                    type="number"
                    min="1"
                    value={activeQuestion.marks}
                    onChange={(e) => handleCurrentQuestionChange("marks", e.target.value)}
                    className="w-full rounded-xl border border-transparent bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Options & Correct Answer Editor */}
              {(activeQuestion.questionType === "MCQ_SINGLE" || activeQuestion.questionType === "MCQ_MULTI") && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground">
                      Options (Select correct {activeQuestion.questionType === "MCQ_MULTI" ? "answers" : "answer"})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} /> Add Option
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(activeQuestion.options || []).map((opt, optIdx) => {
                      const optStr = getOptionText(opt);
                      const isChecked = activeQuestion.questionType === "MCQ_SINGLE"
                        ? String(getOptionText(activeQuestion.correctAnswer)) === optStr
                        : Array.isArray(activeQuestion.correctAnswer) && activeQuestion.correctAnswer.map(getOptionText).includes(optStr);

                      return (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type={activeQuestion.questionType === "MCQ_MULTI" ? "checkbox" : "radio"}
                            name={`correct-${currentQuestionIndex}`}
                            checked={isChecked}
                            onChange={() => handleToggleCorrectOption(optStr)}
                            className="h-4 w-4 accent-emerald-500 shrink-0 cursor-pointer"
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            value={optStr}
                            onChange={(e) => handleOptionTextChange(optIdx, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            className="flex-1 rounded-lg border border-transparent bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-emerald-500"
                          />
                          {(activeQuestion.options || []).length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(optIdx)}
                              className="p-1 text-red-700 dark:text-red-400 hover:text-red-800 dark:text-red-300 shrink-0 cursor-pointer"
                              title="Remove Option"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* True/False Selection */}
              {activeQuestion.questionType === "TRUE_FALSE" && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <label className="text-sm font-semibold text-foreground block">Select Correct Answer</label>
                  <div className="flex items-center gap-4">
                    {["True", "False"].map((tfVal) => (
                      <label key={tfVal} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                          type="radio"
                          name={`tf-${currentQuestionIndex}`}
                          checked={String(activeQuestion.correctAnswer).toLowerCase() === tfVal.toLowerCase()}
                          onChange={() => handleCurrentQuestionChange("correctAnswer", tfVal)}
                          className="accent-emerald-500"
                        />
                        <span>{tfVal}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Non-MCQ Correct Answer Input */}
              {activeQuestion.questionType !== "MCQ_SINGLE" &&
               activeQuestion.questionType !== "MCQ_MULTI" &&
               activeQuestion.questionType !== "TRUE_FALSE" && (
                <div className="space-y-1 pt-2 border-t border-border/60">
                  <label className="text-sm font-semibold text-foreground">Correct Answer</label>
                  <input
                    type="text"
                    value={typeof activeQuestion.correctAnswer === "string" ? activeQuestion.correctAnswer : JSON.stringify(activeQuestion.correctAnswer || "")}
                    onChange={(e) => handleCurrentQuestionChange("correctAnswer", e.target.value)}
                    placeholder="Expected answer string..."
                    className="w-full rounded-xl border border-transparent bg-background px-3.5 py-1.5 text-sm text-foreground outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Explanation Field */}
              <div className="space-y-1 pt-1">
                <label className="text-[13px] font-semibold text-muted-foreground">Explanation / Feedback</label>
                <input
                  type="text"
                  value={activeQuestion.explanation}
                  onChange={(e) => handleCurrentQuestionChange("explanation", e.target.value)}
                  placeholder="Optional explanation shown to students after submission..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              {/* Hint Field — only meaningful on a Qualifying Test, which is
                  the only quiz that ever surfaces one, and then only from the
                  student's second attempt. Offered solely there so it doesn't
                  read as a field every question needs. */}
              {quizForm.quizTag === "QUALIFYING" && (
                <div className="space-y-1 pt-1">
                  <label className="text-[13px] font-semibold text-muted-foreground">Hint</label>
                  <input
                    type="text"
                    value={activeQuestion.hint}
                    onChange={(e) => handleCurrentQuestionChange("hint", e.target.value)}
                    placeholder="Optional nudge, offered only from the student's second attempt..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-amber-500"
                  />
                  <p className="text-[11.5px] text-muted-foreground">
                    Hidden on the first attempt — that attempt is what decides whether the student
                    already knows this content. Write a nudge, not the answer.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-sm italic bg-background/40 rounded-xl border border-border/80 space-y-2">
              <p>No questions in this quiz yet.</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-bold cursor-pointer"
                >
                  <Plus size={14} /> Add First Question
                </button>
                <button
                  type="button"
                  onClick={() => setShowRepoPicker(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20 text-sm font-bold cursor-pointer"
                >
                  <Library size={14} /> From Repository
                </button>
              </div>
            </div>
          )}

          {/* Bottom Navigation Bar */}
          {questions.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-transparent bg-background hover:bg-muted text-foreground text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span className="text-sm font-mono font-bold text-muted-foreground">
                Question {currentQuestionIndex + 1} / {questions.length}
              </span>

              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={currentQuestionIndex >= questions.length - 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-transparent bg-background hover:bg-muted text-foreground text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Save/Cancel repeated at the end of the question list. The pair in
              the header scrolls out of sight once a quiz has more than a couple
              of questions, leaving the instructor to scroll back up to save
              what they just finished writing. Same handlers, same validation —
              this is the identical control, only reachable where the work ends. */}
          <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {questions.length} question{questions.length === 1 ? "" : "s"} • {totalMarks} total mark{totalMarks === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-sm font-bold transition cursor-pointer"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold transition shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Save confirmation — raised only after the save actually succeeded. */}
      <Modal
        open={Boolean(savedSummary)}
        onClose={() => setSavedSummary(null)}
        title="Quiz Saved"
        size="sm"
      >
        <div className="text-center space-y-4 py-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 size={30} className="text-emerald-500" />
          </div>

          <p className="text-sm text-muted-foreground">
            &ldquo;{savedSummary?.title}&rdquo; has been saved successfully.
          </p>

          <div className="rounded-xl border border-border bg-background/60 px-4 py-3 text-sm font-bold text-foreground">
            <p>
              {savedSummary?.questionCount} question{savedSummary?.questionCount === 1 ? "" : "s"}
              {" • "}
              {savedSummary?.totalMarks} total mark{savedSummary?.totalMarks === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-[13px] font-semibold text-muted-foreground">
              {QUIZ_TAG_LABELS[savedSummary?.quizTag] || "Quiz"}
              {" • "}
              {savedSummary?.isPublished ? "Published" : "Draft"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSavedSummary(null)}
            className="w-full px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </Modal>

      <QuestionRepositoryPickerModal
        open={showRepoPicker}
        onClose={() => setShowRepoPicker(false)}
        onAddQuestions={handleAddRepositoryQuestions}
        excludeIds={questions.map((q) => q.id)}
        courseId={courseId || quiz?.courseId || null}
      />
    </div>
  );
}
