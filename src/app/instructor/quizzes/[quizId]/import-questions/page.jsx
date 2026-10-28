"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  CheckCircle2,
  ArrowLeft,
  X,
  Shuffle,
  HelpCircle,
  Clock,
  Award,
  RefreshCw,
} from "lucide-react";
import { useQuiz } from "@/hooks/queries/instructor/useQuiz";
import {
  useRepositoryQuestions,
  useImportQuestionsToQuiz,
} from "@/hooks/queries/instructor/useQuestionRepository";
import { useToast } from "@/components/ui/ToastProvider";
import { quizTextSummary } from "@/lib/quizText";

export default function ImportQuestionsToQuizPage({ params }) {
  const resolvedParams = use(params);
  const quizId = resolvedParams.quizId;
  const router = useRouter();
  const { showToast } = useToast();

  // Filters
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [topic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [questionType] = useState("");

  // Selected Repository Questions for Import
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  const { data: quiz } = useQuiz(quizId);
  const { data: repoData, isLoading: loadingRepo } = useRepositoryQuestions({
    search,
    subject,
    topic,
    difficulty,
    questionType,
    limit: 100, // retrieve up to 100 questions for import browser
    // Same rule as the quiz builder's picker: a quiz is only ever built from
    // published, still-active questions, never from ones their author archived,
    // and only from the question bank of the course the quiz belongs to.
    status: "ACTIVE",
    publishedOnly: true,
    courseId: quiz?.courseId || "",
  }, {
    // Held until the quiz (and with it the course to scope by) has loaded,
    // so the unscoped whole repository never renders first.
    enabled: Boolean(quiz?.courseId),
  });
  const repositoryQuestions = repoData?.success ? repoData.data || [] : [];

  // The repository request is disabled until the quiz resolves, and a
  // disabled query doesn't report isLoading — without this the page would
  // flash "no questions" while the quiz itself is still in flight.
  const loading = loadingRepo || !quiz;

  const importMutation = useImportQuestionsToQuiz();
  const importing = importMutation.isPending;

  // Checkbox toggle
  const toggleSelectQuestion = (question) => {
    setSelectedQuestions((prev) => {
      const exists = prev.some((q) => q.id === question.id);
      if (exists) {
        return prev.filter((q) => q.id !== question.id);
      } else {
        return [...prev, question];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedQuestions([...repositoryQuestions]);
  };

  const handleClearSelection = () => {
    setSelectedQuestions([]);
  };

  // Random Selection Tool
  const handleRandomSelect = (count, diffFilter = null) => {
    let pool = [...repositoryQuestions];
    if (diffFilter) {
      pool = pool.filter((q) => q.difficulty === diffFilter);
    }

    if (pool.length === 0) return;

    // Shuffle pool array (Fisher-Yates)
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const randomPick = shuffled.slice(0, count);

    setSelectedQuestions((prev) => {
      const prevIds = new Set(prev.map((q) => q.id));
      const combined = [...prev];
      randomPick.forEach((q) => {
        if (!prevIds.has(q.id)) combined.push(q);
      });
      return combined;
    });
  };

  // Execute Import into Quiz
  const handleExecuteImport = async () => {
    if (selectedQuestions.length === 0) return;

    try {
      const qIds = selectedQuestions.map((q) => q.id);
      const result = await importMutation.mutateAsync({ quizId, questionIds: qIds });

      showToast(result.message || "Questions imported successfully!", "success");
      setTimeout(() => {
        router.push(`/instructor/quizzes/${quizId}`);
      }, 1200);
    } catch (err) {
      showToast("Failed to import questions: " + (err?.message || "Server error"), "error");
    }
  };

  // Calculated Stats for Right Drawer
  const totalSelectedMarks = selectedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
  const estimatedTimeMins = Math.ceil(selectedQuestions.length * 1.5);

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

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans">
      {/* Navigation Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center space-x-3">
          <Link
            href={`/instructor/quizzes/${quizId}`}
            className="p-2 rounded-xl bg-background border border-transparent text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="sr-only">
              Import Questions From Repository
            </h1>
            <p className="sr-only">
              Select questions from your question bank to link with quiz: <span className="font-semibold text-foreground">{quiz?.title || "Quiz"}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT PANEL: Repository Question Browser (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters Bar */}
          <div className="p-5 rounded-3xl bg-background/80 border border-transparent space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search repository questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-background border border-transparent rounded-xl !pl-9 !pr-3 py-2 text-xs text-foreground focus:border-amber-500 focus:outline-none"
                />
              </div>

              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-background border border-transparent rounded-xl px-3 py-2 text-xs text-foreground focus:border-amber-500 focus:outline-none"
              >
                <option value="">All Subjects</option>
                <option value="Python">Python</option>
                <option value="Web Development">Web Development</option>
                <option value="Java">Java</option>
                <option value="Database">Database</option>
              </select>

              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="bg-background border border-transparent rounded-xl px-3 py-2 text-xs text-foreground focus:border-amber-500 focus:outline-none"
              >
                <option value="">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            {/* Quick Bulk Selection Tools Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-transparent/80 text-xs">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted text-foreground font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted text-muted-foreground"
                >
                  Clear Selection
                </button>
              </div>

              {/* Random Selection Shortcuts */}
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                <span className="text-muted-foreground text-[11px] flex items-center mr-1">
                  <Shuffle className="w-3 h-3 mr-1 text-amber-400" />
                  Random:
                </span>
                <button
                  onClick={() => handleRandomSelect(5)}
                  className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px]"
                >
                  Random 5
                </button>
                <button
                  onClick={() => handleRandomSelect(10)}
                  className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px]"
                >
                  Random 10
                </button>
                <button
                  onClick={() => handleRandomSelect(5, "EASY")}
                  className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px]"
                >
                  Random Easy
                </button>
                <button
                  onClick={() => handleRandomSelect(5, "MEDIUM")}
                  className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px]"
                >
                  Random Medium
                </button>
                <button
                  onClick={() => handleRandomSelect(5, "HARD")}
                  className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[11px]"
                >
                  Random Hard
                </button>
              </div>
            </div>
          </div>

          {/* Repository Questions List */}
          <div className="rounded-3xl bg-background/70 border border-transparent overflow-hidden">
            {loading ? (
              <div className="p-16 text-center text-muted-foreground flex flex-col items-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                <p className="text-sm">Fetching repository questions...</p>
              </div>
            ) : repositoryQuestions.length === 0 ? (
              <div className="p-16 text-center text-muted-foreground space-y-2">
                <HelpCircle className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-foreground">No matching questions in repository</p>
                <p className="text-xs text-muted-foreground">Create or upload questions to your question bank first.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {repositoryQuestions.map((q) => {
                  const isSelected = selectedQuestions.some((s) => s.id === q.id);

                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleSelectQuestion(q)}
                      className={`p-4 flex items-start space-x-4 cursor-pointer transition ${
                        isSelected ? "bg-amber-500/10 border-l-4 border-l-amber-500" : "hover:bg-background/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent div
                        className="mt-1 rounded border-transparent bg-background text-amber-500 focus:ring-0"
                      />

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${getDifficultyBadge(q.difficulty)}`}>
                            {q.difficulty}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-muted text-foreground text-[10px] font-mono">
                            {q.questionType}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {q.subject || "General"} • {q.topic || "General"}
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-foreground">{q.title || q.question.slice(0, 70)}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{quizTextSummary(q.question)}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-amber-400">{q.marks || 1} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Selected Questions & Summary Drawer (1 Col) */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-background/90 border border-transparent space-y-6 sticky top-6">
            <div className="flex items-center justify-between border-b border-transparent pb-4">
              <h3 className="text-lg font-bold text-foreground">Import Summary</h3>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold font-mono">
                {selectedQuestions.length} Selected
              </span>
            </div>

            {/* Live Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-background/80 border border-transparent flex flex-col items-center">
                <Award className="w-5 h-5 text-amber-400 mb-1" />
                <span className="text-lg font-bold text-foreground">{totalSelectedMarks}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Marks</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-background/80 border border-transparent flex flex-col items-center">
                <Clock className="w-5 h-5 text-sky-400 mb-1" />
                <span className="text-lg font-bold text-foreground">{estimatedTimeMins} mins</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Est. Duration</span>
              </div>
            </div>

            {/* Selected Questions List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground">Selected Questions List</h4>
              {selectedQuestions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-background/40 border border-transparent/80 text-center text-xs text-muted-foreground">
                  Click questions from the left browser or use random tools to select.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {selectedQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-2.5 rounded-xl bg-background/80 border border-transparent flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2 truncate max-w-[200px]">
                        <span className="font-mono text-muted-foreground font-bold">#{idx + 1}</span>
                        <span className="text-foreground font-medium truncate">{q.title || quizTextSummary(q.question)}</span>
                      </div>
                      <button
                        onClick={() => toggleSelectQuestion(q)}
                        className="text-muted-foreground hover:text-rose-400 ml-2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleExecuteImport}
                disabled={selectedQuestions.length === 0 || importing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-40 flex items-center justify-center space-x-2"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing into Quiz...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Import {selectedQuestions.length} Selected Questions</span>
                  </>
                )}
              </button>

              <Link
                href={`/instructor/quizzes/${quizId}`}
                className="block text-center w-full py-2.5 rounded-xl bg-muted hover:bg-muted text-foreground text-xs font-semibold transition"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
