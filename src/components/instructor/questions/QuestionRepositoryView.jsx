"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  UploadCloud,
  Copy,
  Trash2,
  Archive,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  RefreshCw,
  X,
  Tag,
  Check,
  ClipboardList,
} from "lucide-react";
import { useInstructorCourses } from "@/hooks/queries/instructor/useInstructorCourses";
import { useModules } from "@/hooks/queries/instructor/useModules";
import {
  useRepositoryQuestions,
  useDuplicateRepositoryQuestion,
  useArchiveRepositoryQuestion,
  useDeleteRepositoryQuestion,
} from "@/hooks/queries/instructor/useQuestionRepository";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/context/ConfirmContext";
import { QUESTION_TYPE_OPTIONS } from "@/lib/questionType";

/**
 * The Question Repository list/search/CRUD view — rendered by both the
 * global /instructor/questions page and the Work module's Question
 * Repository page, so this logic exists in exactly one place.
 */
export default function QuestionRepositoryView({ showImportShortcuts = false }) {
  const { showToast } = useToast();
  const confirm = useConfirm();

  // Filters
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: courses = [] } = useInstructorCourses();
  const { data: modules = [] } = useModules(courseId);

  const { data: response, isLoading: loading } = useRepositoryQuestions({
    search,
    courseId,
    moduleId,
    difficulty,
    questionType,
    status,
    page,
    limit,
  });

  const questions = response?.success ? response.data || [] : [];
  const pagination = {
    page,
    total: response?.pagination?.total || 0,
    totalPages: response?.pagination?.totalPages || 1,
  };

  const handleCourseChange = (value) => {
    setCourseId(value);
    setModuleId("");
  };

  // Selection & Preview
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewQuestion, setPreviewQuestion] = useState(null);

  const duplicateMutation = useDuplicateRepositoryQuestion();
  const archiveMutation = useArchiveRepositoryQuestion();
  const deleteMutation = useDeleteRepositoryQuestion();

  const handleResetFilters = () => {
    setSearch("");
    setCourseId("");
    setModuleId("");
    setDifficulty("");
    setQuestionType("");
    setStatus("ACTIVE");
    setPage(1);
  };

  // Actions
  const handleDuplicate = (id) => {
    duplicateMutation.mutate(id, {
      onSuccess: () => showToast("Question duplicated successfully!", "success"),
      onError: (err) => showToast("Failed to duplicate question: " + (err?.message || "Server error"), "error"),
    });
  };

  const handleArchive = async (id) => {
    const confirmed = await confirm({
      title: "Archive question",
      message: "Are you sure you want to archive this question?",
      confirmText: "Archive",
    });
    if (!confirmed) return;
    archiveMutation.mutate(id, {
      onSuccess: () => showToast("Question archived.", "success"),
      onError: (err) => showToast("Failed to archive question: " + (err?.message || "Server error"), "error"),
    });
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: "Delete question",
      message: "Are you sure you want to delete this question? If used in quizzes, it will be archived.",
      confirmText: "Delete",
    });
    if (!confirmed) return;
    deleteMutation.mutate(id, {
      onSuccess: () => showToast("Question deleted / archived successfully.", "success"),
      onError: (err) => showToast("Failed to delete question: " + (err?.message || "Server error"), "error"),
    });
  };

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map((q) => q.id));
    }
  };

  const toggleSelectId = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkArchive = async () => {
    const confirmed = await confirm({
      title: "Archive selected",
      message: `Archive ${selectedIds.length} selected questions?`,
      confirmText: "Archive",
    });
    if (!confirmed) return;
    await Promise.allSettled(selectedIds.map((id) => archiveMutation.mutateAsync(id)));
    setSelectedIds([]);
    showToast("Selected questions archived.", "success");
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: "Delete selected",
      message: `Delete ${selectedIds.length} selected questions? Any used in quizzes will be archived instead.`,
      confirmText: "Delete",
    });
    if (!confirmed) return;
    await Promise.allSettled(selectedIds.map((id) => deleteMutation.mutateAsync(id)));
    setSelectedIds([]);
    showToast("Selected questions processed.", "success");
  };

  // Badges styling helper
  const getDifficultyBadge = (diff) => {
    switch (diff) {
      case "EASY":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "HARD":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "MCQ_MULTI":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "TRUE_FALSE":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "SHORT_ANSWER":
      case "LONG_ANSWER":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-teal-500/10 text-teal-400 border-teal-500/20";
    }
  };

  return (
    <div className="text-foreground font-sans">
      {/* Header Bar */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              Question Repository
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Centralized question bank. Upload, organize, and manage reusable questions across all quizzes.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/instructor/questions/upload"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-background border border-amber-500/40 text-amber-400 text-sm font-semibold hover:bg-muted transition"
            >
              <UploadCloud className="w-4 h-4" />
              <span>+ Upload Questions</span>
            </Link>

            <Link
              href="/instructor/questions/create"
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-400 text-slate-950 text-sm font-bold shadow-lg shadow-orange-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Question</span>
            </Link>
          </div>
        </div>

        {showImportShortcuts && (
          <div className="grid gap-3 sm:grid-cols-1 mt-5">
            <Link
              href="/instructor/work/quiz"
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-background/80 border border-border hover:border-primary/40 text-xs font-bold text-foreground transition"
            >
              <ClipboardList size={14} className="text-orange-450" /> Import into Quiz
            </Link>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Filter Bar */}
        <div className="p-6 rounded-3xl bg-background/80 border border-border space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search questions, tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-background border border-border rounded-xl !pl-9 !pr-3 py-2 text-xs text-foreground focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Course Filter */}
            <select
              value={courseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-amber-500 focus:outline-none"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>

            {/* Module Filter */}
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              disabled={!courseId}
              className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-amber-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">All Modules</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-amber-500 focus:outline-none"
            >
              <option value="">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>

            {/* Question Type Filter */}
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-amber-500 focus:outline-none"
            >
              <option value="">All Types</option>
              {QUESTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-amber-500 focus:outline-none"
            >
              <option value="ACTIVE">Active Only</option>
              <option value="ARCHIVED">Archived Only</option>
              <option value="">All Status</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/80">
            <span className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{pagination.total}</span> questions in repository
            </span>
            <button
              onClick={handleResetFilters}
              className="text-xs text-amber-400 hover:underline flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>

        {/* Bulk Selection Bar */}
        {selectedIds.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">{selectedIds.length} Questions Selected</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleBulkArchive}
                className="px-3 py-1.5 rounded-lg bg-background border border-amber-500/40 text-amber-300 hover:bg-muted transition"
              >
                Archive Selected
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 hover:bg-rose-900 transition"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Questions Table / List */}
        <div className="rounded-3xl bg-background/70 border border-border overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-sm">Loading Question Repository...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground space-y-3">
              <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-foreground">No Questions Found</h3>
              <p className="text-xs text-muted-foreground">Try adjusting your search filters or upload new questions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <div className="divide-y divide-slate-800/80">
              {/* Header row */}
              <div className="px-6 py-3.5 bg-background/90 text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === questions.length && questions.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-transparent bg-background text-amber-500 focus:ring-0"
                  />
                  <span>Question Details</span>
                </div>
                <div className="flex items-center space-x-6 pr-4">
                  <span className="w-28 text-center">Type</span>
                  <span className="w-20 text-center">Difficulty</span>
                  <span className="w-16 text-center">Marks</span>
                  <span className="w-24 text-center">Usage</span>
                  <span className="w-24 text-right">Actions</span>
                </div>
              </div>

              {/* Items */}
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="px-6 py-2.5 flex items-center justify-between hover:bg-background/40 transition group"
                >
                  <div className="flex items-start space-x-4 max-w-3xl">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(q.id)}
                      onChange={() => toggleSelectId(q.id)}
                      className="mt-1 rounded border-transparent bg-background text-amber-500 focus:ring-0"
                    />

                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        {q.course?.title && (
                          <span className="text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                            {q.course.title}{q.module?.title ? ` • ${q.module.title}` : ""}
                          </span>
                        )}
                        {q.status === "ARCHIVED" && (
                          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-transparent text-[10px] font-mono">
                            ARCHIVED
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-foreground group-hover:text-amber-400 transition line-clamp-2">
                        {q.question}
                      </h4>

                      {q.tags && (
                        <div className="flex items-center space-x-1 text-[11px] text-muted-foreground">
                          <Tag className="w-3 h-3 text-slate-600" />
                          <span>{q.tags}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Meta & Actions */}
                  <div className="flex items-center space-x-6 pr-2 shrink-0">
                    <div className="w-28 text-center">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${getTypeBadge(q.questionType)}`}>
                        {q.questionType}
                      </span>
                    </div>

                    <div className="w-20 text-center">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${getDifficultyBadge(q.difficulty)}`}>
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="w-16 text-center">
                      <span className="text-xs font-mono font-bold text-amber-400">{q.marks} pts</span>
                    </div>

                    <div className="w-24 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-muted/90 border border-transparent/60 text-xs font-mono text-foreground">
                        {q.usedInQuizzesCount} Quizzes
                      </span>
                    </div>

                    <div className="w-24 flex items-center justify-end space-x-1">
                      <button
                        onClick={() => setPreviewQuestion(q)}
                        className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground"
                        title="View Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDuplicate(q.id)}
                        className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-amber-400"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleArchive(q.id)}
                        className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-sky-400"
                        title="Archive"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(q.id)}
                        className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 bg-background/90 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={pagination.page === 1}
                  className="p-1.5 rounded-lg bg-muted hover:bg-muted disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-1.5 rounded-lg bg-muted hover:bg-muted disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-background border border-border rounded-3xl p-6 space-y-5 relative shadow-2xl">
            <button
              onClick={() => setPreviewQuestion(null)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded text-xs font-mono uppercase ${getTypeBadge(previewQuestion.questionType)}`}>
                {previewQuestion.questionType}
              </span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-mono uppercase ${getDifficultyBadge(previewQuestion.difficulty)}`}>
                {previewQuestion.difficulty}
              </span>
              <span className="text-xs font-semibold text-foreground">
                {previewQuestion.course?.title || "No Course"}{previewQuestion.module?.title ? ` • ${previewQuestion.module.title}` : ""}
              </span>
            </div>

            <div>
              <p className="text-sm text-foreground mt-2 bg-background/80 p-4 rounded-2xl border border-border whitespace-pre-line">
                {previewQuestion.question}
              </p>
            </div>

            {/* Options */}
            {Array.isArray(previewQuestion.options) && previewQuestion.options.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">Options</h4>
                <div className="space-y-2">
                  {previewQuestion.options.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        opt.isCorrect
                          ? "bg-success/10 border-success/50 text-success"
                          : "bg-background/40 border-border text-foreground"
                      }`}
                    >
                      <span>{opt.optionText || String(opt)}</span>
                      {opt.isCorrect && <Check className="w-4 h-4 text-success" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewQuestion.explanation && (
              /* The warning token, not a fixed amber shade: it carries a value
                 per theme (a dark amber on light, a bright one on dark), where
                 text-amber-200 is a pale tint chosen for a dark panel and is
                 all but invisible on the light one. */
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-xs text-warning">
                <span className="font-bold">Explanation: </span>
                {previewQuestion.explanation}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
