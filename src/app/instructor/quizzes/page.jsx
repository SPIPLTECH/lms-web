"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FileText,
  CheckSquare,
  Edit,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Play,
  ArrowLeft,
  Star,
  Eye
} from "lucide-react";

import Loader from "@/components/common/Loader";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/context/ConfirmContext";

import { useQuizzes } from "@/hooks/queries/instructor/useQuizzes";
import { useDeleteQuiz } from "@/hooks/queries/instructor/useDeleteQuiz";
import { useInstructorCourses } from "@/hooks/queries/instructor/useInstructorCourses";
import { useQuestions } from "@/hooks/queries/instructor/useQuestions";
import { useDeleteQuestion } from "@/hooks/queries/instructor/useDeleteQuestion";
import { QUESTION_TYPE_OPTIONS } from "@/lib/questionType";

export default function QuizzesPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();

  // Selected Quiz state for Master-Detail pattern
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  // Global Quiz Search, Filters & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Selected Quiz Questions Search, Filter & Pagination States
  const [qSearchQuery, setQSearchQuery] = useState("");
  const [qSelectedType, setQSelectedType] = useState("all");
  const [qCurrentPage, setQCurrentPage] = useState(1);
  const qItemsPerPage = 5;

  // Fetch all quizzes globally
  const {
    data: quizzes = [],
    isLoading: isLoadingQuizzes,
    isError: isErrorQuizzes,
  } = useQuizzes();

  // Fetch instructor courses for the course filter
  const { data: courses = [] } = useInstructorCourses();

  // Fetch questions specifically for the selected quiz
  const {
    data: questions = [],
    isLoading: isLoadingQuestions,
  } = useQuestions(selectedQuiz?.id);

  const deleteQuizMutation = useDeleteQuiz();
  const deleteQuestionMutation = useDeleteQuestion();

  // Delete Quiz callback
  const handleDeleteQuiz = async (quizId, courseId) => {
    const confirmed = await confirm({
      title: "Delete quiz",
      message: "Are you sure you want to delete this quiz?",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    try {
      await deleteQuizMutation.mutateAsync({
        quizId,
        courseId,
      });
      showToast("Quiz deleted successfully", "success");
    } catch (error) {
      console.error("Failed to delete quiz:", error);
      showToast(
        error?.response?.data?.message || "Failed to delete quiz.",
        "error",
        "Delete Failed"
      );
    }
  };

  // Delete Question callback
  const handleDeleteQuestion = async (questionId) => {
    const confirmed = await confirm({ title: "Delete question", message: "Delete this question?", confirmText: "Delete" });
    if (!confirmed) return;

    try {
      await deleteQuestionMutation.mutateAsync({
        questionId,
        quizId: selectedQuiz.id,
      });
      showToast("Question deleted successfully", "success");
    } catch (error) {
      console.error("Failed to delete question:", error);
      showToast(
        error?.response?.data?.message || "Failed to delete question.",
        "error",
        "Delete Failed"
      );
    }
  };

  // Calculate global KPI metrics
  const metrics = useMemo(() => {
    const total = quizzes.length;
    const published = quizzes.filter(
      (q) => q.isPublished || q.status === "Published" || q.status === "PUBLISHED"
    ).length;
    const drafts = total - published;
    const attempts = quizzes.reduce(
      (acc, q) => acc + (q._count?.quizSubmissions ?? 0),
      0
    );

    return { total, published, drafts, attempts };
  }, [quizzes]);

  // Quiz Filter & Sort Logic
  const filteredQuizzes = useMemo(() => {
    let result = [...quizzes];

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (quiz) =>
          quiz.title.toLowerCase().includes(q) ||
          (quiz.description && quiz.description.toLowerCase().includes(q))
      );
    }

    if (selectedCourse !== "all") {
      result = result.filter((quiz) => quiz.courseId === selectedCourse);
    }

    if (selectedStatus !== "all") {
      result = result.filter((quiz) => {
        const isPub = quiz.isPublished || quiz.status === "Published" || quiz.status === "PUBLISHED";
        return selectedStatus === "published" ? isPub : !isPub;
      });
    }

    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [quizzes, searchQuery, selectedCourse, selectedStatus, sortBy]);

  // Reset quiz page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCourse, selectedStatus, sortBy]);

  // Quiz Pagination
  const totalItems = filteredQuizzes.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedQuizzes = useMemo(() => {
    return filteredQuizzes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQuizzes, startIndex]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Questions Filter Logic
  const filteredQuestions = useMemo(() => {
    let result = [...questions];

    if (qSearchQuery.trim() !== "") {
      const q = qSearchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          (item.concept && item.concept.toLowerCase().includes(q))
      );
    }

    if (qSelectedType !== "all") {
      result = result.filter((item) => item.type === qSelectedType);
    }

    return result;
  }, [questions, qSearchQuery, qSelectedType]);

  // Reset questions page when filters change
  useMemo(() => {
    setQCurrentPage(1);
  }, [qSearchQuery, qSelectedType]);

  // Questions Pagination
  const totalQItems = filteredQuestions.length;
  const totalQPages = Math.ceil(totalQItems / qItemsPerPage);
  const startQIndex = (qCurrentPage - 1) * qItemsPerPage;
  const endQIndex = Math.min(startQIndex + qItemsPerPage, totalQItems);
  const paginatedQuestions = useMemo(() => {
    return filteredQuestions.slice(startQIndex, startQIndex + qItemsPerPage);
  }, [filteredQuestions, startQIndex]);

  const handleQPageChange = (page) => {
    if (page >= 1 && page <= totalQPages) {
      setQCurrentPage(page);
    }
  };

  if (isLoadingQuizzes) {
    return (
      <div className="flex justify-center py-20">
        <Loader />
      </div>
    );
  }

  if (isErrorQuizzes) {
    return (
      <Card>
        <div className="py-16 text-center">
          <h2 className="text-2xl font-semibold">Failed to Load Quizzes</h2>
          <p className="mt-2 text-muted-foreground">Please try again later.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="relative min-h-[600px]">
      <AnimatePresence mode="wait">
        {!selectedQuiz ? (
          // ================= MASTER: QUIZ LIST VIEW =================
          <motion.div
            key="quiz-list-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="sr-only">Quizzes</h1>
                <p className="sr-only">Create and manage quizzes for your courses.</p>
              </div>

              <div className="flex items-center space-x-3">
                <Link href="/instructor/questions">
                  <button className="flex items-center justify-center gap-2 rounded-xl bg-background border border-amber-500/40 text-amber-400 font-bold text-sm px-5 py-3.5 hover:bg-muted transition">
                    <FileText size={16} />
                    <span>Question Repository</span>
                  </button>
                </Link>

                <Link href="/instructor/quizzes/create">
                  <button className="flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-orange-600 text-slate-950 font-extrabold text-sm px-6 py-3.5 transition shadow-lg shadow-orange-500/10 active:scale-95">
                    <Plus size={16} />
                    <span>Create Quiz</span>
                  </button>
                </Link>
              </div>
            </div>

            {/* KPI Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Total Quizzes */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-transparent/80 rounded-2xl p-6 flex items-center gap-5">
                <div className="p-4 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Quizzes</p>
                  <h3 className="text-3xl font-black text-foreground mt-1">{metrics.total}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">Across all courses</p>
                </div>
              </div>

              {/* Published */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-transparent/80 rounded-2xl p-6 flex items-center gap-5">
                <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                  <CheckSquare size={24} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Published</p>
                  <h3 className="text-3xl font-black text-foreground mt-1">{metrics.published}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">Active quizzes</p>
                </div>
              </div>

              {/* Drafts */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-transparent/80 rounded-2xl p-6 flex items-center gap-5">
                <div className="p-4 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                  <Edit size={24} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Drafts</p>
                  <h3 className="text-3xl font-black text-foreground mt-1">{metrics.drafts}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">Unpublished quizzes</p>
                </div>
              </div>

              {/* Total Attempts */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-transparent/80 rounded-2xl p-6 flex items-center gap-5">
                <div className="p-4 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                  <Play size={24} className="rotate-90" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Attempts</p>
                  <h3 className="text-3xl font-black text-foreground mt-1">
                    {metrics.attempts.toLocaleString()}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-1">By all students</p>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-background border border-transparent text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-3 !pl-12 text-sm"
                />
              </div>

              {/* Filters Group */}
              <div className="flex flex-wrap gap-3 items-center">
                {/* Course Filter */}
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="bg-background border border-transparent text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-3 text-sm cursor-pointer max-w-[200px]"
                >
                  <option value="all">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-background border border-transparent text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-3 text-sm cursor-pointer min-w-[130px]"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>

                {/* Sort By */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-background border border-transparent text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-3 text-sm cursor-pointer min-w-[140px]"
                >
                  <option value="newest">Sort by: Newest</option>
                  <option value="oldest">Sort by: Oldest</option>
                  <option value="title">Sort by: Title</option>
                </select>
              </div>
            </div>

            {/* Quizzes Table */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-transparent/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-transparent bg-background/40 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                      <th className="p-5 pl-6">Quiz Title</th>
                      <th className="p-5">Course</th>
                      <th className="p-5 text-center">Questions</th>
                      <th className="p-5 text-center">Attempts</th>
                      <th className="p-5">Status</th>
                      <th className="p-5">Created At</th>
                      <th className="p-5 pr-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQuizzes.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-12 text-center text-muted-foreground italic text-sm">
                          No quizzes found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedQuizzes.map((quiz) => {
                        const isPub = quiz.isPublished || quiz.status === "Published" || quiz.status === "PUBLISHED";
                        return (
                          <tr
                            key={quiz.id}
                            onClick={() => setSelectedQuiz(quiz)}
                            className="border-b border-transparent/50 hover:bg-slate-850/40 transition-all duration-200 text-sm text-foreground cursor-pointer group"
                          >
                            {/* Quiz Title & Description */}
                            <td className="p-5 pl-6 max-w-xs">
                              <p className="font-bold text-foreground group-hover:text-primary transition-colors leading-snug truncate">{quiz.title}</p>
                              <p className="text-xs text-muted-foreground leading-normal truncate mt-0.5">
                                {quiz.description || "No description provided."}
                              </p>
                            </td>

                            {/* Course & Category */}
                            <td className="p-5 max-w-[180px]">
                              <p className="font-medium text-foreground leading-snug truncate">
                                {quiz.course?.title || "Standalone Quiz"}
                              </p>
                              {quiz.course?.category && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate uppercase font-semibold text-[10px]">
                                  {quiz.course.category}
                                </p>
                              )}
                            </td>

                            {/* Questions Count */}
                            <td className="p-5 text-center font-bold text-foreground">
                              {quiz._count?.questions ?? 0}
                            </td>

                            {/* Attempts Count */}
                            <td className="p-5 text-center font-bold text-foreground">
                              {quiz._count?.quizSubmissions ?? 0}
                            </td>

                            {/* Status */}
                            <td className="p-5">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${
                                  isPub
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                }`}
                              >
                                {isPub ? "Published" : "Draft"}
                              </span>
                            </td>

                            {/* Created At Date */}
                            <td className="p-5 text-muted-foreground text-xs">
                              {new Date(quiz.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>

                            {/* Actions */}
                            <td className="p-5 pr-6" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2">
                                <Link href={`/instructor/questions/create/${quiz.id}`}>
                                  <button className="p-2.5 rounded-lg border border-transparent bg-background/60 hover:bg-muted text-primary hover:text-orange-300 transition" title="Add Question">
                                    <Plus size={14} />
                                  </button>
                                </Link>
                                
                                <Link href={`/instructor/quizzes/edit/${quiz.id}`}>
                                  <button className="p-2.5 rounded-lg border border-transparent bg-background/60 hover:bg-muted text-muted-foreground hover:text-foreground transition" title="Edit Quiz Details">
                                    <Edit size={14} />
                                  </button>
                                </Link>

                                <button
                                  onClick={() => handleDeleteQuiz(quiz.id, quiz.courseId)}
                                  className="p-2.5 rounded-lg border border-slate-850 bg-background/20 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition"
                                  title="Delete Quiz"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {totalItems > 0 && (
                <div className="border-t border-transparent bg-background/20 p-5 pl-6 pr-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    Showing <span className="font-bold text-foreground">{startIndex + 1}</span> to{" "}
                    <span className="font-bold text-foreground">{endIndex}</span> of{" "}
                    <span className="font-bold text-foreground">{totalItems}</span> quizzes
                  </span>

                  {/* Pagination Controls */}
                  <div className="flex items-center flex-wrap justify-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="p-2.5 rounded-lg border border-transparent bg-background/60 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground transition cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      const isActive = page === currentPage;
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`h-9 w-9 text-xs rounded-lg font-bold border transition ${
                            isActive
                              ? "bg-primary border-primary text-slate-950 shadow-md shadow-orange-500/15"
                              : "border-transparent bg-background/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="p-2.5 rounded-lg border border-transparent bg-background/60 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground transition cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          // ================= DETAIL: SELECTED QUIZ QUESTIONS VIEW =================
          <motion.div
            key="questions-list-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Header & Summary Row */}
            <div className="space-y-4">
              <button
                onClick={() => setSelectedQuiz(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft size={14} />
                Back to Quizzes
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-extrabold uppercase tracking-widest pl-0.5">
                    <span>QUIZZES</span>
                    <span>&gt;</span>
                    <span className="text-primary">{selectedQuiz.title}</span>
                  </div>
                  <h1 className="sr-only">Quiz Questions</h1>
                  <div className="flex flex-wrap gap-2.5 items-center mt-2">
                    <span className="text-muted-foreground text-xs font-semibold">
                      Course: <span className="text-foreground font-bold">{selectedQuiz.course?.title || "Standalone"}</span>
                    </span>
                    <span className="text-slate-700 font-mono text-xs">•</span>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                      selectedQuiz.isPublished || selectedQuiz.status === "Published" || selectedQuiz.status === "PUBLISHED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {selectedQuiz.isPublished || selectedQuiz.status === "Published" || selectedQuiz.status === "PUBLISHED" ? "Published" : "Draft"}
                    </span>
                    <span className="text-slate-700 font-mono text-xs">•</span>
                    <span className="text-muted-foreground text-xs font-semibold">
                      Questions: <span className="text-foreground font-bold">{questions.length}</span>
                    </span>
                  </div>
                </div>

                <Link href={`/instructor/questions/create/${selectedQuiz.id}`}>
                  <button className="flex items-center gap-2 rounded-xl bg-primary hover:bg-orange-600 text-slate-950 font-extrabold text-sm px-6 py-3.5 transition shadow-lg shadow-orange-500/10 active:scale-95">
                    <Plus size={16} />
                    <span>Add Question</span>
                  </button>
                </Link>
              </div>
            </div>

            {/* Questions Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={qSearchQuery}
                  onChange={(e) => setQSearchQuery(e.target.value)}
                  className="w-full bg-background border border-transparent text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-3 !pl-12 text-sm"
                />
              </div>

              {/* Filter */}
              <select
                value={qSelectedType}
                onChange={(e) => setQSelectedType(e.target.value)}
                className="bg-background border border-transparent text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-3 text-sm cursor-pointer min-w-[170px]"
              >
                <option value="all">All Question Types</option>
                {QUESTION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Questions Table */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-transparent/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-transparent bg-background/40 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                      <th className="p-5 pl-6">Question</th>
                      <th className="p-5">Type</th>
                      <th className="p-5 text-center">Marks</th>
                      <th className="p-5">Options Details</th>
                      <th className="p-5 pr-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingQuestions ? (
                      <tr>
                        <td colSpan="5" className="p-12 text-center">
                          <Loader />
                        </td>
                      </tr>
                    ) : paginatedQuestions.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-12 text-center text-muted-foreground italic text-sm">
                          No questions found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedQuestions.map((q) => {
                        const type = q.type || "MCQ_SINGLE";
                        return (
                          <tr
                            key={q.id}
                            className="border-b border-transparent/50 hover:bg-slate-850/20 transition text-sm text-foreground"
                          >
                            {/* Question Text */}
                            <td className="p-5 pl-6 max-w-sm">
                              <p className="font-bold text-foreground leading-relaxed line-clamp-2">{q.question}</p>
                              {q.concept && (
                                <span className="inline-block text-[9px] text-purple-400 font-extrabold uppercase mt-1">
                                  {q.concept}
                                </span>
                              )}
                            </td>

                            {/* Type Badge */}
                            <td className="p-5">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                                  type === "MCQ_SINGLE"
                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                    : type === "MCQ_MULTI"
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                    : type === "ARRANGE_TOKENS"
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : type === "MATCH_PAIRS"
                                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                }`}
                              >
                                {type.replace("_", " ")}
                              </span>
                            </td>

                            {/* Marks */}
                            <td className="p-5 text-center">
                              <span className="inline-flex items-center gap-1 text-foreground font-bold bg-background px-2.5 py-1 rounded-lg border border-slate-850">
                                <Star size={11} className="text-primary fill-orange-400/20" />
                                <span>{q.marks}</span>
                              </span>
                            </td>

                            {/* Options Details */}
                            <td className="p-5">
                              <span className="text-xs text-muted-foreground">
                                {type === "MATCH_PAIRS"
                                  ? `${q.options?.left?.length ?? 0} Pairs`
                                  : type === "ARRANGE_TOKENS"
                                  ? `${q.options?.length ?? 0} Tokens`
                                  : type === "SELF_ASSESSMENT"
                                  ? "Essay Rubric"
                                  : Array.isArray(q.options)
                                  ? `${q.options.length} Options`
                                  : "No options"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="p-5 pr-6">
                              <div className="flex items-center justify-center gap-2">
                                {/* View */}
                                <Link href={`/instructor/questions/view/${q.id}`}>
                                  <button className="p-2.5 rounded-lg border border-transparent bg-background/60 hover:bg-muted text-muted-foreground hover:text-foreground transition">
                                    <Eye size={14} />
                                  </button>
                                </Link>
                                {/* Edit */}
                                <Link href={`/instructor/questions/edit/${q.id}`}>
                                  <button className="p-2.5 rounded-lg border border-transparent bg-background/60 hover:bg-muted text-muted-foreground hover:text-foreground transition">
                                    <Edit size={14} />
                                  </button>
                                </Link>
                                {/* Delete */}
                                <button
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-2.5 rounded-lg border border-slate-850 bg-background/20 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Questions Pagination Footer */}
              {totalQItems > 0 && (
                <div className="border-t border-transparent bg-background/20 p-5 pl-6 pr-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    Showing <span className="font-bold text-foreground">{startQIndex + 1}</span> to{" "}
                    <span className="font-bold text-foreground">{endQIndex}</span> of{" "}
                    <span className="font-bold text-foreground">{totalQItems}</span> questions
                  </span>

                  {/* Pagination Controls */}
                  <div className="flex items-center flex-wrap justify-center gap-1.5">
                    <button
                      disabled={qCurrentPage === 1}
                      onClick={() => handleQPageChange(qCurrentPage - 1)}
                      className="p-2.5 rounded-lg border border-transparent bg-background/60 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground transition cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: totalQPages }, (_, i) => i + 1).map((page) => {
                      const isActive = page === qCurrentPage;
                      return (
                        <button
                          key={page}
                          onClick={() => handleQPageChange(page)}
                          className={`h-9 w-9 text-xs rounded-lg font-bold border transition ${
                            isActive
                              ? "bg-primary border-primary text-slate-950 shadow-md shadow-orange-500/15"
                              : "border-transparent bg-background/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                    <button
                      disabled={qCurrentPage === totalQPages}
                      onClick={() => handleQPageChange(qCurrentPage + 1)}
                      className="p-2.5 rounded-lg border border-transparent bg-background/60 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground transition cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}