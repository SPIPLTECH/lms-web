"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useInstructorCourses } from "@/hooks/queries/instructor/useInstructorCourses";
import { useModules } from "@/hooks/queries/instructor/useModules";
import { useCreateRepositoryQuestion } from "@/hooks/queries/instructor/useQuestionRepository";
import { QUESTION_TYPE_OPTIONS } from "@/lib/questionType";
import { useAlert } from "@/context/ConfirmContext";
import QuizTextEditor from "@/components/quiz/QuizTextEditor";

export default function CreateQuestionPage() {
  const router = useRouter();
  const alert = useAlert();

  const [question, setQuestion] = useState("");
  const [questionType, setQuestionType] = useState("MCQ_SINGLE");
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [marks, setMarks] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [tags, setTags] = useState("");
  const [explanation, setExplanation] = useState("");

  const { data: courses = [] } = useInstructorCourses();
  const { data: modules = [] } = useModules(courseId);
  const createQuestionMutation = useCreateRepositoryQuestion();

  const handleCourseChange = (value) => {
    setCourseId(value);
    setModuleId("");
  };

  // Options for MCQ
  const [options, setOptions] = useState([
    { id: "opt-1", optionText: "", isCorrect: true },
    { id: "opt-2", optionText: "", isCorrect: false },
    { id: "opt-3", optionText: "", isCorrect: false },
    { id: "opt-4", optionText: "", isCorrect: false },
  ]);

  // Arrange Tokens: the tokens in their correct order — the student is shown
  // them shuffled and has to rebuild this sequence.
  const [tokens, setTokens] = useState(["", "", ""]);

  // Match Pairs: each left item and the right item it matches.
  const [pairs, setPairs] = useState([
    { left: "", right: "" },
    { left: "", right: "" },
  ]);

  const [error, setError] = useState("");

  const handleTokenChange = (idx, value) =>
    setTokens((prev) => prev.map((t, i) => (i === idx ? value : t)));

  const handleAddToken = () => setTokens((prev) => [...prev, ""]);

  const handleRemoveToken = (idx) => {
    if (tokens.length <= 2) {
      alert("An Arrange Tokens question needs at least 2 tokens.");
      return;
    }
    setTokens((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePairChange = (idx, field, value) =>
    setPairs((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));

  const handleAddPair = () => setPairs((prev) => [...prev, { left: "", right: "" }]);

  const handleRemovePair = (idx) => {
    if (pairs.length <= 2) {
      alert("A Match Pairs question needs at least 2 pairs.");
      return;
    }
    setPairs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddOption = () => {
    setOptions((prev) => [
      ...prev,
      { id: `opt-${Date.now()}`, optionText: "", isCorrect: false },
    ]);
  };

  const handleRemoveOption = (idx) => {
    if (options.length <= 2) {
      alert("Multiple choice questions require at least 2 options.");
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleOptionTextChange = (idx, text) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], optionText: text };
      return updated;
    });
  };

  const handleToggleCorrect = (idx) => {
    setOptions((prev) => {
      const updated = [...prev];
      if (questionType === "MCQ_SINGLE") {
        // Single choice: only one correct
        return updated.map((opt, i) => ({
          ...opt,
          isCorrect: i === idx,
        }));
      } else {
        // Multi select: toggle boolean
        updated[idx] = { ...updated[idx], isCorrect: !updated[idx].isCorrect };
        return updated;
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!courseId) {
      setError("Please select a course.");
      return;
    }

    if (!question.trim()) {
      setError("Question text is required.");
      return;
    }

    if (marks <= 0) {
      setError("Marks must be greater than zero.");
      return;
    }

    let finalOptions = options;
    let correctAnswerVal = null;

    if (questionType === "MCQ_SINGLE" || questionType === "MCQ_MULTI") {
      const emptyOpt = options.find((o) => !o.optionText.trim());
      if (emptyOpt) {
        setError("Please fill out all option texts or remove empty options.");
        return;
      }

      const hasCorrect = options.some((o) => o.isCorrect);
      if (!hasCorrect) {
        setError("Please select at least one correct answer.");
        return;
      }

      correctAnswerVal = options.filter((o) => o.isCorrect).map((o) => o.optionText.trim());
    } else if (questionType === "ARRANGE_TOKENS") {
      // Same shape QuestionForm saves: the ordered tokens are both the pool
      // shown to the student and the answer they're graded against.
      const validTokens = tokens.map((t) => t.trim()).filter(Boolean);
      if (validTokens.length < 2) {
        setError("Please enter at least 2 tokens in their correct order.");
        return;
      }
      finalOptions = validTokens;
      correctAnswerVal = validTokens;
    } else if (questionType === "MATCH_PAIRS") {
      const validPairs = pairs
        .map((p) => ({ left: p.left.trim(), right: p.right.trim() }))
        .filter((p) => p.left && p.right);
      if (validPairs.length < 2) {
        setError("Please complete at least 2 pairs — both sides of each are required.");
        return;
      }
      finalOptions = {
        left: validPairs.map((p) => p.left),
        right: validPairs.map((p) => p.right),
      };
      correctAnswerVal = validPairs.reduce((acc, p) => ({ ...acc, [p.left]: p.right }), {});
    }

    setError("");

    try {
      await createQuestionMutation.mutateAsync({
        question: question.trim(),
        questionType,
        courseId,
        moduleId: moduleId || null,
        difficulty,
        marks: parseInt(marks, 10),
        negativeMarks: parseFloat(negativeMarks) || 0,
        tags: tags.trim(),
        explanation: explanation.trim(),
        options: finalOptions,
        correctAnswer: correctAnswerVal,
      });

      router.push("/instructor/questions");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to create question.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center space-x-3">
          <Link
            href="/instructor/questions"
            className="p-2 rounded-xl bg-background border border-transparent text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="sr-only">
              Create Question
            </h1>
            <p className="sr-only">
              Add a new question manually to your centralized Question Repository.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Question Metadata & Content Card */}
          <div className="p-6 rounded-3xl bg-background/90 border border-transparent space-y-5">
            <h3 className="text-base font-bold text-foreground">Question Content</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Course *
                </label>
                <select
                  value={courseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  required
                  className="w-full bg-background border border-transparent rounded-xl px-3 py-2.5 text-xs text-foreground focus:border-amber-500 focus:outline-none"
                >
                  <option value="" disabled>Select a course...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Module (Optional)
                </label>
                <select
                  value={moduleId}
                  onChange={(e) => setModuleId(e.target.value)}
                  disabled={!courseId}
                  className="w-full bg-background border border-transparent rounded-xl px-3 py-2.5 text-xs text-foreground focus:border-amber-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">Whole course (no specific module)</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Question Text *
              </label>
              <QuizTextEditor
                minRows={4}
                placeholder="Type your full question statement here..."
                value={question}
                onChange={setQuestion}
                ariaLabel="Question"
                required
                className="w-full bg-background border border-transparent rounded-xl p-4 text-sm text-foreground focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Question Type
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="w-full bg-background border border-transparent rounded-xl px-3 py-2.5 text-xs text-foreground focus:border-amber-500 focus:outline-none"
                >
                  {QUESTION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-background border border-transparent rounded-xl px-3 py-2.5 text-xs text-foreground focus:border-amber-500 focus:outline-none"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Marks *
                </label>
                <input
                  type="number"
                  min="1"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  className="w-full bg-background border border-transparent rounded-xl px-3 py-2.5 text-xs text-foreground focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Negative Marks
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(e.target.value)}
                  className="w-full bg-background border border-transparent rounded-xl px-3 py-2.5 text-xs text-foreground focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="syntax, basics"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-background border border-transparent rounded-xl px-3 py-2.5 text-xs text-foreground focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Options Card for MCQ */}
          {(questionType === "MCQ_SINGLE" || questionType === "MCQ_MULTI") && (
            <div className="p-6 rounded-3xl bg-background/90 border border-transparent space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">Answer Options</h3>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted text-amber-400 text-xs font-semibold border border-amber-500/30 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option</span>
                </button>
              </div>

              <div className="space-y-3">
                {options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center space-x-3 p-3 rounded-2xl bg-background/80 border border-transparent">
                    <button
                      type="button"
                      onClick={() => handleToggleCorrect(idx)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition ${
                        opt.isCorrect
                          ? "bg-emerald-500 border-emerald-400 text-slate-950 font-bold"
                          : "border-transparent bg-background text-transparent"
                      }`}
                      title={opt.isCorrect ? "Correct Option" : "Mark as Correct"}
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    <QuizTextEditor
                      variant="option"
                      placeholder={`Option ${idx + 1}`}
                      value={opt.optionText}
                      onChange={(text) => handleOptionTextChange(idx, text)}
                      ariaLabel={`Option ${idx + 1}`}
                      className="w-full bg-transparent border-none text-xs text-foreground focus:outline-none"
                    />

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-muted-foreground hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Arrange Tokens Card */}
          {questionType === "ARRANGE_TOKENS" && (
            <div className="p-6 rounded-3xl bg-background/90 border border-transparent space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Tokens (Correct Order)</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Students see these shuffled and rebuild this sequence.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddToken}
                  className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted text-amber-400 text-xs font-semibold border border-amber-500/30 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Token</span>
                </button>
              </div>

              <div className="space-y-3">
                {tokens.map((token, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 rounded-2xl bg-background/80 border border-transparent">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-muted text-[10px] font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      placeholder={`Token ${idx + 1}`}
                      value={token}
                      onChange={(e) => handleTokenChange(idx, e.target.value)}
                      className="flex-1 bg-transparent border-none text-xs text-foreground focus:outline-none"
                    />
                    {tokens.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveToken(idx)}
                        className="text-muted-foreground hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Match Pairs Card */}
          {questionType === "MATCH_PAIRS" && (
            <div className="p-6 rounded-3xl bg-background/90 border border-transparent space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Matching Pairs</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    The right-hand column is shuffled for students.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddPair}
                  className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted text-amber-400 text-xs font-semibold border border-amber-500/30 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Pair</span>
                </button>
              </div>

              <div className="space-y-3">
                {pairs.map((pair, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 rounded-2xl bg-background/80 border border-transparent">
                    <input
                      type="text"
                      placeholder={`Left ${idx + 1}`}
                      value={pair.left}
                      onChange={(e) => handlePairChange(idx, "left", e.target.value)}
                      className="flex-1 bg-transparent border-none text-xs text-foreground focus:outline-none"
                    />
                    <span className="text-muted-foreground text-xs">&rarr;</span>
                    <input
                      type="text"
                      placeholder={`Right ${idx + 1}`}
                      value={pair.right}
                      onChange={(e) => handlePairChange(idx, "right", e.target.value)}
                      className="flex-1 bg-transparent border-none text-xs text-foreground focus:outline-none"
                    />
                    {pairs.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePair(idx)}
                        className="text-muted-foreground hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explanation Card */}
          <div className="p-6 rounded-3xl bg-background/90 border border-transparent space-y-3">
            <h3 className="text-base font-bold text-foreground">Explanation & Notes (Optional)</h3>
            <QuizTextEditor
              minRows={3}
              placeholder="Provide solution explanation or reference notes for students..."
              value={explanation}
              onChange={setExplanation}
              ariaLabel="Explanation"
              className="w-full bg-background border border-transparent rounded-xl p-3 text-sm text-foreground focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <Link
              href="/instructor/questions"
              className="px-5 py-2.5 rounded-xl bg-muted hover:bg-muted text-foreground text-xs font-semibold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createQuestionMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              {createQuestionMutation.isPending ? "Saving Question..." : "Save Question to Repository"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
