"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  HelpCircle,
  CheckSquare,
  Eye,
  Lightbulb,
  X,
  PlusCircle,
  ArrowRight,
  GripVertical,
  BookOpen
} from "lucide-react";

import Card from "@/components/ui/Card";

import { useQuiz } from "@/hooks/queries/instructor/useQuiz";
import { useInstructorCourse } from "@/hooks/queries/instructor/useInstructorCourse";
import ImportQuestionsModal from "@/components/instructor/questions/ImportQuestionsModal";
import { QUESTION_TYPE_OPTIONS, RETIRED_QUESTION_TYPES } from "@/lib/questionType";
import QuizRichText from "@/components/quiz/QuizRichText";
import QuizTextEditor from "@/components/quiz/QuizTextEditor";
import DuplicateOptionsWarning from "@/components/quiz/DuplicateOptionsWarning";

const INITIAL_FORM = {
  type: "MCQ_SINGLE",
  question: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  marks: 5,
  concept: "",
  difficulty: "Medium",
  explanation: "",
  shuffleOptions: false
};

// UI-only field names/casing this form works with vs. the backend/Prisma
// contract (questionType, subject, uppercase DifficultyLevel enum) — kept
// as a translation layer at the submit/load boundary rather than renaming
// the form's own state, since the <select> options and labels below are
// title-case and every other handler here reads formData.type/.concept.
export default function QuestionForm({
                                       mode = "create",
                                       initialValues = null,
                                       loading = false,
                                       onSubmit,
                                     }) {
  const params = useParams();
  const router = useRouter();
  
  const quizId = params.quizId || initialValues?.quizId;
  const courseId = params.courseId || initialValues?.quiz?.courseId;

  // Queries for dynamic breadcrumbs & title headers
  const { data: quiz } = useQuiz(quizId, { enabled: !!quizId });
  const finalCourseId = courseId || quiz?.courseId;
  // Result is intentionally unused — this only warms the cache the navbar's
  // breadcrumb reads. Shallow, so it warms the same key the navbar now uses
  // and doesn't pull the full course tree to render a title.
  useInstructorCourse(finalCourseId, { shallow: true });

  // Form State
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showImport, setShowImport] = useState(false);
  const [pairs, setPairs] = useState([{ left: "", right: "" }, { left: "", right: "" }]);
  const [tokens, setTokens] = useState(["", "", ""]);
  
  // Submit tracking to clear form in "Save & Add Another"
  const [submitAction, setSubmitAction] = useState("save");

  useEffect(() => {
    if (initialValues) {
      // The API returns `questionType` (Prisma's real column) and an
      // uppercase `difficulty` (EASY/MEDIUM/HARD) — reading the wrong
      // shapes here (`type`, title-case difficulty) silently reset every
      // edited question back to MCQ_SINGLE/Medium regardless of what was
      // actually stored, and dropped MATCH_PAIRS/ARRANGE_TOKENS state below.
      const type = initialValues.questionType ?? initialValues.type ?? "MCQ_SINGLE";
      const rawDifficulty = initialValues.difficulty ?? "MEDIUM";
      const difficulty = rawDifficulty.charAt(0).toUpperCase() + rawDifficulty.slice(1).toLowerCase();

      setFormData({
        type,
        question: initialValues.question ?? "",
        options: initialValues.options ?? ["", "", "", ""],
        correctAnswer: initialValues.correctAnswer ?? "",
        marks: initialValues.marks ?? 5,
        concept: initialValues.concept ?? initialValues.tags ?? "",
        difficulty,
        explanation: initialValues.explanation ?? "",
        shuffleOptions: initialValues.shuffleOptions ?? false
      });

      if (type === "MATCH_PAIRS" && initialValues.correctAnswer) {
        const parsedPairs = Object.entries(initialValues.correctAnswer).map(([left, right]) => ({
          left,
          right,
        }));
        setPairs(parsedPairs.length ? parsedPairs : [{ left: "", right: "" }, { left: "", right: "" }]);
      } else if (type === "ARRANGE_TOKENS" && Array.isArray(initialValues.options)) {
        setTokens(initialValues.options);
      }
    }
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : name === "marks" ? Number(value) : value,
    }));
  };

  const handleTypeChange = (newType) => {
    let defaultOptions = ["", "", "", ""];
    let defaultCorrect = "";

    if (newType === "MATCH_PAIRS") {
      defaultOptions = { left: ["", ""], right: ["", ""] };
      defaultCorrect = {};
      setPairs([{ left: "", right: "" }, { left: "", right: "" }]);
    } else if (newType === "ARRANGE_TOKENS") {
      defaultOptions = ["", "", ""];
      defaultCorrect = [];
      setTokens(["", "", ""]);
    } else if (newType === "MCQ_MULTI") {
      defaultOptions = ["", "", "", ""];
      defaultCorrect = [];
    } else if (newType === "SELF_ASSESSMENT") {
      defaultOptions = [];
      defaultCorrect = "";
    }

    setFormData((prev) => ({
      ...prev,
      type: newType,
      options: defaultOptions,
      correctAnswer: defaultCorrect,
    }));
  };

  // MCQ options change
  // The answer key is the option's text, so it follows that text as it is
  // edited — otherwise changing a correct option's code would leave the key
  // naming text no option has any more.
  const handleOptionChange = (index, value) => {
    const oldValue = formData.options[index];
    const updatedOptions = [...formData.options];
    updatedOptions[index] = value;
    setFormData((prev) => {
      let correctAnswer = prev.correctAnswer;
      if (oldValue && prev.type === "MCQ_SINGLE" && correctAnswer === oldValue) {
        correctAnswer = value;
      } else if (oldValue && prev.type === "MCQ_MULTI" && Array.isArray(correctAnswer)) {
        correctAnswer = correctAnswer.map((answer) => (answer === oldValue ? value : answer));
      }
      return { ...prev, options: updatedOptions, correctAnswer };
    });
  };

  const addOption = () => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, ""],
    }));
  };

  const removeOption = (index) => {
    if (formData.options.length <= 2) return;
    const updatedOptions = formData.options.filter((_, i) => i !== index);
    
    // Clean correct answer if removed
    let newCorrect = formData.correctAnswer;
    if (formData.type === "MCQ_SINGLE" && formData.correctAnswer === formData.options[index]) {
      newCorrect = "";
    } else if (formData.type === "MCQ_MULTI" && Array.isArray(formData.correctAnswer)) {
      newCorrect = formData.correctAnswer.filter((val) => val !== formData.options[index]);
    }

    setFormData((prev) => ({
      ...prev,
      options: updatedOptions,
      correctAnswer: newCorrect
    }));
  };

  // MCQ_MULTI toggles
  const handleMultiCorrectToggle = (optionText) => {
    if (!optionText) return;
    const currentCorrect = Array.isArray(formData.correctAnswer) ? formData.correctAnswer : [];
    const updated = currentCorrect.includes(optionText)
      ? currentCorrect.filter((item) => item !== optionText)
      : [...currentCorrect, optionText];
    
    setFormData((prev) => ({
      ...prev,
      correctAnswer: updated,
    }));
  };

  // ARRANGE_TOKENS handling
  const handleTokenChange = (index, value) => {
    const updatedTokens = [...tokens];
    updatedTokens[index] = value;
    setTokens(updatedTokens);
  };

  const addToken = () => {
    setTokens([...tokens, ""]);
  };

  const removeToken = (index) => {
    setTokens(tokens.filter((_, i) => i !== index));
  };

  // MATCH_PAIRS handling
  const handlePairChange = (index, field, value) => {
    const updatedPairs = [...pairs];
    updatedPairs[index][field] = value;
    setPairs(updatedPairs);
  };

  const addPair = () => {
    setPairs([...pairs, { left: "", right: "" }]);
  };

  const removePair = (index) => {
    setPairs(pairs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const submissionData = { ...formData };

    if (formData.type === "MATCH_PAIRS") {
      const validPairs = pairs.filter((p) => p.left && p.right);
      submissionData.options = {
        left: validPairs.map((p) => p.left),
        right: validPairs.map((p) => p.right),
      };
      submissionData.correctAnswer = validPairs.reduce(
        (acc, p) => ({ ...acc, [p.left]: p.right }),
        {}
      );
    } else if (formData.type === "ARRANGE_TOKENS") {
      const validTokens = tokens.filter((t) => t.trim() !== "");
      submissionData.options = validTokens;
      submissionData.correctAnswer = validTokens;
    } else if (formData.type === "SELF_ASSESSMENT") {
      submissionData.options = [];
    }

    // Translate this form's UI-only field names to the backend contract
    // (Prisma `Question.questionType`/`.subject`, uppercase DifficultyLevel
    // enum) right before it leaves the component.
    submissionData.questionType = submissionData.type;
    delete submissionData.type;
    submissionData.subject = submissionData.concept;
    delete submissionData.concept;
    submissionData.difficulty = (submissionData.difficulty || "MEDIUM").toUpperCase();

    const success = await onSubmit?.(submissionData, submitAction);
    
    if (success && submitAction === "another") {
      // Clear form on Add Another click
      setFormData({
        ...INITIAL_FORM,
        type: formData.type, // keep type
        concept: formData.concept // keep concept
      });
      setPairs([{ left: "", right: "" }, { left: "", right: "" }]);
      setTokens(["", "", ""]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCancel = () => {
    router.push("/instructor/quizzes");
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Header and Title */}
      <div className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full">
          <div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">Add New Question</h1>
            <p className="mt-2 text-muted-foreground">
              Quiz: <span className="text-primary font-extrabold">{quiz?.title || "Quiz"}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/instructor/quizzes/${quizId}/import-questions`)}
              className="flex items-center gap-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 font-extrabold text-xs uppercase tracking-wider px-5 py-3 transition active:scale-95 cursor-pointer shadow-lg shadow-amber-500/5"
            >
              <BookOpen size={14} />
              <span>Import from Repository</span>
            </button>

            {mode === "create" && (
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-extrabold text-xs uppercase tracking-wider px-5 py-3 transition active:scale-95 cursor-pointer"
              >
                <span>Import from File</span>
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => {
                setSubmitAction("save");
                document.getElementById("question-form-element")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
              }}
              disabled={loading}
              className="px-5 py-3 rounded-xl border border-border bg-background/60 text-foreground hover:bg-slate-850 hover:text-foreground transition font-extrabold text-xs uppercase tracking-wider"
            >
              {loading && submitAction === "save" ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={() => {
                setSubmitAction("publish");
                document.getElementById("question-form-element")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
              }}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-orange-600 text-slate-950 transition font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/10"
            >
              {loading && submitAction === "publish" ? "Publishing..." : "Publish Quiz"}
            </button>
          </div>
        </div>
      </div>

      <form id="question-form-element" onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ================= LEFT COLUMN: DETAILS & OPTIONS ================= */}
          <div className="lg:col-span-7 space-y-8">
            {/* Question Details Card */}
            <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-border rounded-2xl space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <HelpCircle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight">Question Details</h3>
                  <p className="text-xs text-muted-foreground">Define the question information</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Question Title */}
                <div className="space-y-2">
                  <label className="text-label text-muted-foreground flex justify-between">
                    <span>Question Title *</span>
                    <span className="font-mono">{formData.question.length}/2000</span>
                  </label>
                  {/* 2000, not 500: a question can now carry a code snippet. */}
                  <QuizTextEditor
                    value={formData.question}
                    onChange={(text) => setFormData((prev) => ({ ...prev, question: text }))}
                    maxLength={2000}
                    placeholder="Enter your question here..."
                    ariaLabel="Question"
                    required
                    minRows={4}
                    className="w-full bg-background border border-border text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-3 text-sm placeholder-slate-600"
                  />
                </div>

                {/* 2x2 fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Type */}
                  <div className="space-y-2">
                    <label className="text-label text-muted-foreground">Question Type *</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={(e) => handleTypeChange(e.target.value)}
                      className="w-full bg-background border border-border text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-3.5 text-sm cursor-pointer"
                    >
                      {QUESTION_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                      {/* Only for a question that already is one — see
                          RETIRED_QUESTION_TYPES. */}
                      {RETIRED_QUESTION_TYPES[formData.type] && (
                        <option value={formData.type}>
                          {RETIRED_QUESTION_TYPES[formData.type]}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Marks */}
                  <div className="space-y-2">
                    <label className="text-label text-muted-foreground">Marks *</label>
                    <select
                      name="marks"
                      value={formData.marks}
                      onChange={handleChange}
                      className="w-full bg-background border border-border text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-3.5 text-sm cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 10, 15, 20].map((val) => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>

                  {/* Difficulty */}
                  <div className="space-y-2">
                    <label className="text-label text-muted-foreground">Difficulty *</label>
                    <select
                      name="difficulty"
                      value={formData.difficulty}
                      onChange={handleChange}
                      className="w-full bg-background border border-border text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-3.5 text-sm cursor-pointer"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  {/* Category / Concept */}
                  <div className="space-y-2">
                    <label className="text-label text-muted-foreground">Category</label>
                    <input
                      type="text"
                      name="concept"
                      value={formData.concept}
                      onChange={handleChange}
                      placeholder="Select Category / Concept tag"
                      className="w-full bg-background border border-border text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-3.5 text-sm placeholder-slate-600"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Answer Options Card */}
            <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-border rounded-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <CheckSquare size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight">Answer Options</h3>
                    <p className="text-xs text-muted-foreground">Add options for this question</p>
                  </div>
                </div>

                {/* Shuffle options toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-bold">Shuffle Options</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="shuffleOptions"
                      checked={formData.shuffleOptions}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

              {/* MCQ_SINGLE Options */}
              {formData.type === "MCQ_SINGLE" && (
                <div className="space-y-4">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-start gap-3 group">
                      <GripVertical className="mt-3 text-slate-700 group-hover:text-muted-foreground transition cursor-grab" size={16} />
                      <span className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-bold text-foreground">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <QuizTextEditor
                        variant="option"
                        value={option}
                        onChange={(text) => handleOptionChange(index, text)}
                        placeholder={`Enter option ${String.fromCharCode(65 + index).toLowerCase()}`}
                        ariaLabel={`Option ${String.fromCharCode(65 + index)}`}
                        className="w-full bg-background border border-border text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-2.5 text-sm"
                        required
                      />
                      <label className="mt-3 flex items-center gap-2 cursor-pointer shrink-0">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={formData.correctAnswer === option && option !== ""}
                          onChange={() => setFormData((prev) => ({ ...prev, correctAnswer: option }))}
                          disabled={!option}
                          className="h-4 w-4 border-border bg-background text-primary focus:ring-orange-500"
                        />
                        <span className="text-xs font-bold text-muted-foreground">Correct</span>
                      </label>
                      {formData.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="mt-0.5 text-slate-600 hover:text-red-400 p-2 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOption}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 bg-background/30 text-xs font-bold text-primary hover:text-orange-300 transition"
                  >
                    <Plus size={14} />
                    <span>Add Option</span>
                  </button>
                  <DuplicateOptionsWarning options={formData.options} />
                </div>
              )}

              {/* MCQ_MULTI Options */}
              {formData.type === "MCQ_MULTI" && (
                <div className="space-y-4">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-start gap-3 group">
                      <GripVertical className="mt-3 text-slate-700 group-hover:text-muted-foreground transition cursor-grab" size={16} />
                      <span className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-bold text-foreground">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <QuizTextEditor
                        variant="option"
                        value={option}
                        onChange={(text) => handleOptionChange(index, text)}
                        placeholder={`Enter option ${String.fromCharCode(65 + index).toLowerCase()}`}
                        ariaLabel={`Option ${String.fromCharCode(65 + index)}`}
                        className="w-full bg-background border border-border text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-2.5 text-sm"
                        required
                      />
                      <label className="mt-3 flex items-center gap-2 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={Array.isArray(formData.correctAnswer) && formData.correctAnswer.includes(option) && option !== ""}
                          onChange={() => handleMultiCorrectToggle(option)}
                          disabled={!option}
                          className="h-4 w-4 border-border bg-background rounded text-primary focus:ring-orange-500"
                        />
                        <span className="text-xs font-bold text-muted-foreground">Correct</span>
                      </label>
                      {formData.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="mt-0.5 text-slate-600 hover:text-red-400 p-2 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOption}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 bg-background/30 text-xs font-bold text-primary hover:text-orange-300 transition"
                  >
                    <Plus size={14} />
                    <span>Add Option</span>
                  </button>
                  <DuplicateOptionsWarning options={formData.options} />
                </div>
              )}

              {/* ARRANGE_TOKENS Options */}
              {formData.type === "ARRANGE_TOKENS" && (
                <div className="space-y-4">
                  {tokens.map((token, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs font-bold w-6">{index + 1}.</span>
                      <input
                        type="text"
                        value={token}
                        onChange={(e) => handleTokenChange(index, e.target.value)}
                        placeholder="Enter token text (Correct Order)"
                        className="flex-1 bg-background border border-border text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-2.5 text-sm"
                        required
                      />
                      {tokens.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeToken(index)}
                          className="text-slate-600 hover:text-red-400 p-2 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addToken}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 bg-background/30 text-xs font-bold text-primary hover:text-orange-300 transition"
                  >
                    <Plus size={14} />
                    <span>Add Token</span>
                  </button>
                </div>
              )}

              {/* MATCH_PAIRS Options */}
              {formData.type === "MATCH_PAIRS" && (
                <div className="space-y-4">
                  {pairs.map((pair, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-center gap-3 bg-background/40 p-4 rounded-xl border border-slate-850">
                      <span className="text-muted-foreground text-xs font-bold w-6 shrink-0">{index + 1}.</span>
                      <input
                        type="text"
                        value={pair.left}
                        onChange={(e) => handlePairChange(index, "left", e.target.value)}
                        placeholder="Left Item"
                        className="w-full bg-background border border-slate-850 text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-2.5 text-xs"
                        required
                      />
                      <span className="text-slate-600 font-bold font-mono shrink-0">⟷</span>
                      <input
                        type="text"
                        value={pair.right}
                        onChange={(e) => handlePairChange(index, "right", e.target.value)}
                        placeholder="Right Item"
                        className="w-full bg-background border border-slate-850 text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-2.5 text-xs"
                        required
                      />
                      {pairs.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePair(index)}
                          className="text-slate-600 hover:text-red-400 p-2 transition shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPair}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 bg-background/30 text-xs font-bold text-primary hover:text-orange-300 transition"
                  >
                    <Plus size={14} />
                    <span>Add Pair</span>
                  </button>
                </div>
              )}

              {/* SELF_ASSESSMENT Options */}
              {formData.type === "SELF_ASSESSMENT" && (
                <div className="space-y-3 bg-background/30 p-4 rounded-xl border border-slate-850">
                  <label className="block text-label text-muted-foreground">
                    Grading Rubric / Criteria
                  </label>
                  <textarea
                    name="correctAnswer"
                    value={formData.correctAnswer}
                    onChange={handleChange}
                    placeholder="Describe how the question response will be self-graded or matching keyword expectations..."
                    required
                    rows={4}
                    className="w-full bg-background border border-border text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-3 text-sm resize-none placeholder-slate-600"
                  />
                </div>
              )}
            </Card>
          </div>

          {/* ================= RIGHT COLUMN: PREVIEW & EXPLANATION ================= */}
          <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-6">
            {/* Live Student Preview Card */}
            <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-border rounded-2xl space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 shrink-0">
                  <Eye size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight">Live Preview</h3>
                  <p className="text-xs text-muted-foreground">This is how the question will appear to students</p>
                </div>
              </div>

              {/* Inner White Student Preview Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-900 space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Question</h4>
                  <div className="text-sm font-bold text-slate-950 mt-2 leading-relaxed whitespace-pre-wrap">
                    <QuizRichText text={formData.question || "What is the output of the following Java code?"} />
                  </div>
                </div>

                {/* Options Previews */}
                <div className="space-y-3">
                  {(formData.type === "MCQ_SINGLE" || formData.type === "MCQ_MULTI") &&
                    formData.options.map((opt, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[10px] font-extrabold text-muted-foreground">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <div className="min-w-0 flex-1 break-words text-xs text-slate-600">
                          <QuizRichText text={opt || `Option ${String.fromCharCode(65 + i)}`} variant="option" preserveLines />
                        </div>
                      </div>
                    ))}

                  {formData.type === "ARRANGE_TOKENS" && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {tokens.map((tok, i) => (
                        <span
                          key={i}
                          className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-bold"
                        >
                          {tok || `Token ${i + 1}`}
                        </span>
                      ))}
                    </div>
                  )}

                  {formData.type === "MATCH_PAIRS" && (
                    <div className="grid gap-2 pt-1">
                      {pairs.map((pr, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs border border-slate-200 bg-slate-50 px-3 py-2 rounded-lg text-slate-700"
                        >
                          <span className="font-semibold">{pr.left || "Left Term"}</span>
                          <span className="text-muted-foreground font-bold">⟷</span>
                          <span className="font-semibold text-blue-600">{pr.right || "Right Term"}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {formData.type === "SELF_ASSESSMENT" && (
                    <textarea
                      disabled
                      placeholder="Student response textarea..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs resize-none placeholder-slate-400 h-24"
                    />
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3 text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                  <span>
                    {formData.type === "MCQ_SINGLE"
                      ? "Students will select one correct answer."
                      : formData.type === "MCQ_MULTI"
                      ? "Students will select multiple correct answers."
                      : formData.type === "ARRANGE_TOKENS"
                      ? "Students will arrange items in sequence."
                      : formData.type === "MATCH_PAIRS"
                      ? "Students will match columns."
                      : "Students will write a text assessment."}
                  </span>
                </div>
              </div>
            </Card>

            {/* Explanation / Hint Card */}
            <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-border rounded-2xl space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <Lightbulb size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight">Explanation / Hint</h3>
                  <p className="text-xs text-muted-foreground">Provide explanation for the correct answer (optional)</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-label text-muted-foreground flex justify-between">
                  <span>Hint Content</span>
                  <span className="font-mono">{formData.explanation.length}/2000</span>
                </label>
                <QuizTextEditor
                  value={formData.explanation}
                  onChange={(text) => setFormData((prev) => ({ ...prev, explanation: text }))}
                  maxLength={2000}
                  placeholder="Enter explanation or hint here..."
                  ariaLabel="Explanation"
                  minRows={4}
                  className="w-full bg-background border border-border text-foreground rounded-xl focus:border-primary outline-none transition px-4 py-3 text-sm placeholder-slate-600"
                />
              </div>
            </Card>
          </div>
        </div>

        {/* ================= STICKY BOTTOM ACTION BAR ================= */}
        <div className="sticky bottom-0 left-0 right-0 z-30 bg-background/90 backdrop-blur-md border border-border/80 rounded-2xl p-4 shadow-2xl flex flex-wrap gap-4 items-center justify-between">
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-border bg-background/60 text-muted-foreground hover:text-foreground transition font-extrabold text-xs uppercase tracking-wider"
          >
            <X size={14} />
            <span>Cancel</span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              onClick={() => setSubmitAction("save")}
              disabled={loading}
              className="px-5 py-3 rounded-xl border border-slate-850 bg-background/40 text-foreground hover:bg-slate-850 hover:text-foreground transition font-extrabold text-xs uppercase tracking-wider"
            >
              {loading && submitAction === "save" ? "Saving..." : "Save Draft"}
            </button>
            
            {mode === "create" && (
              <button
                type="submit"
                onClick={() => setSubmitAction("another")}
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-slate-850 bg-background/40 text-primary hover:text-orange-300 transition font-extrabold text-xs uppercase tracking-wider"
              >
                <PlusCircle size={14} />
                <span>Save & Add Another</span>
              </button>
            )}

            <button
              type="submit"
              onClick={() => setSubmitAction("publish")}
              disabled={loading}
              className="flex items-center gap-1.5 px-6 py-3 rounded-xl bg-primary hover:bg-orange-600 text-slate-950 transition font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/10"
            >
              <ArrowRight size={14} />
              <span>{loading && submitAction === "publish" ? "Publishing..." : "Publish Quiz"}</span>
            </button>
          </div>
        </div>
      </form>

      {showImport && (
        <ImportQuestionsModal
          quizId={quizId}
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            setShowImport(false);
            router.push(`/instructor/questions/${quizId}`);
          }}
        />
      )}
    </div>
  );
}