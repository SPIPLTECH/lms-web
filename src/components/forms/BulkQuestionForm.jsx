"use client";

import { useState } from "react";
import { FaPlus, FaTrash, FaCode, FaListUl, FaChevronDown, FaChevronUp } from "@/components/ui/reactIcons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import QuizTextEditor from "@/components/quiz/QuizTextEditor";
import DuplicateOptionsWarning from "@/components/quiz/DuplicateOptionsWarning";
import { quizTextSummary } from "@/lib/quizText";

const EMPTY_QUESTION = () => ({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    marks: 1,
    difficulty: "MEDIUM",
    explanation: "",
});

const DIFFICULTY_OPTIONS = ["EASY", "MEDIUM", "HARD"];

function QuestionBlock({ index, data, onChange, onRemove, canRemove }) {
    const [collapsed, setCollapsed] = useState(false);

    const update = (field, value) =>
        onChange(index, { ...data, [field]: value });

    // The answer key is the option's text, so it follows that text as it
    // is edited.
    const updateOption = (i, val) => {
        const opts = [...data.options];
        const correct = data.correctAnswer && data.correctAnswer === opts[i] ? val : data.correctAnswer;
        opts[i] = val;
        onChange(index, { ...data, options: opts, correctAnswer: correct });
    };

    const addOption = () =>
        onChange(index, { ...data, options: [...data.options, ""] });

    const removeOption = (i) => {
        const opts = data.options.filter((_, idx) => idx !== i);
        const correct = data.correctAnswer === data.options[i] ? "" : data.correctAnswer;
        onChange(index, { ...data, options: opts, correctAnswer: correct });
    };

    const isValid = data.question.trim() && data.correctAnswer && data.options.filter(Boolean).length >= 2;

    return (
        <div className="rounded-xl border border-transparent bg-muted/50 transition hover:border-transparent">
            {/* Question block header */}
            <div
                className="flex cursor-pointer items-center justify-between rounded-t-xl px-5 py-4"
                onClick={() => setCollapsed((v) => !v)}
            >
                <div className="flex items-center gap-3">
                    <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold
                            ${isValid ? "bg-green-500/20 text-green-400" : "bg-primary/20 text-primary"}`}
                    >
                        {index + 1}
                    </span>
                    <p className="max-w-md truncate text-sm text-foreground">
                        {quizTextSummary(data.question).trim() || <span className="text-muted-foreground italic">Question {index + 1} — untitled</span>}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {isValid && (
                        <span className="hidden rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-400 sm:block">
                            ✓ Ready
                        </span>
                    )}
                    {canRemove && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-400"
                        >
                            <FaTrash size={13} />
                        </button>
                    )}
                    {collapsed ? <FaChevronDown size={14} className="text-muted-foreground" /> : <FaChevronUp size={14} className="text-muted-foreground" />}
                </div>
            </div>

            {!collapsed && (
                <div className="space-y-5 border-t border-transparent px-5 pb-5 pt-4">
                    {/* Question text */}
                    <div className="space-y-1.5">
                        <label className="text-sm text-foreground">Question *</label>
                        <QuizTextEditor
                            value={data.question}
                            onChange={(text) => update("question", text)}
                            minRows={1}
                            placeholder="Enter your question here…"
                            ariaLabel={`Question ${index + 1}`}
                            required
                            className="w-full rounded-lg border border-transparent bg-muted px-4 py-3 outline-none transition-all hover:border-border-strong focus:border-primary"
                        />
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">Answer Options *</p>
                            {data.options.length < 6 && (
                                <button
                                    type="button"
                                    onClick={addOption}
                                    className="flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                                >
                                    <FaPlus size={10} /> Add Option
                                </button>
                            )}
                        </div>

                        {data.options.map((opt, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <span className="mt-3.5 w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">
                                    {String.fromCharCode(65 + i)}.
                                </span>
                                <QuizTextEditor
                                    variant="option"
                                    value={opt}
                                    onChange={(text) => updateOption(i, text)}
                                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                    ariaLabel={`Option ${String.fromCharCode(65 + i)}`}
                                    className="w-full rounded-lg border border-transparent bg-muted px-4 py-3 outline-none transition-all hover:border-border-strong focus:border-primary"
                                />
                                {data.options.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => removeOption(i)}
                                        className="mt-1.5 rounded-lg p-2 text-slate-600 transition hover:text-red-400"
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <DuplicateOptionsWarning options={data.options} />
                    </div>

                    {/* Correct Answer + Marks + Difficulty */}
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Correct Answer *</label>
                            {/* By position: an option's text can span lines (code),
                                which a <select> value can't carry intact. */}
                            <select
                                value={data.options.indexOf(data.correctAnswer) >= 0 && data.correctAnswer ? String(data.options.indexOf(data.correctAnswer)) : ""}
                                onChange={(e) => update("correctAnswer", e.target.value === "" ? "" : data.options[Number(e.target.value)])}
                                required
                                className="w-full rounded-xl border border-transparent bg-background px-4 py-3 text-foreground outline-none transition focus:border-primary"
                            >
                                <option value="">Select Answer</option>
                                {data.options.map((opt, i) =>
                                    opt ? (
                                        <option key={i} value={String(i)}>
                                            {String.fromCharCode(65 + i)}. {quizTextSummary(opt)}
                                        </option>
                                    ) : null
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Marks</label>
                            <input
                                type="number"
                                min={1}
                                value={data.marks}
                                onChange={(e) => update("marks", Number(e.target.value))}
                                className="w-full rounded-xl border border-transparent bg-background px-4 py-3 text-foreground outline-none transition focus:border-primary"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Difficulty</label>
                            <select
                                value={data.difficulty}
                                onChange={(e) => update("difficulty", e.target.value)}
                                className="w-full rounded-xl border border-transparent bg-background px-4 py-3 text-foreground outline-none transition focus:border-primary"
                            >
                                {DIFFICULTY_OPTIONS.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Explanation */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">Explanation (optional)</label>
                        <QuizTextEditor
                            value={data.explanation}
                            onChange={(text) => update("explanation", text)}
                            placeholder="Why is this the correct answer?"
                            minRows={2}
                            ariaLabel="Explanation"
                            className="w-full rounded-xl border border-transparent bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function BulkQuestionForm({ loading, onSubmit }) {
    const [mode, setMode] = useState("form"); // "form" | "json"
    const [questions, setQuestions] = useState([EMPTY_QUESTION()]);
    const [jsonText, setJsonText] = useState("");
    const [jsonError, setJsonError] = useState(null);

    const handleChange = (index, updated) => {
        setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));
    };

    const addQuestion = () =>
        setQuestions((prev) => [...prev, EMPTY_QUESTION()]);

    const removeQuestion = (index) =>
        setQuestions((prev) => prev.filter((_, i) => i !== index));

    const handleSubmit = (e) => {
        e.preventDefault();

        if (mode === "json") {
            try {
                const parsed = JSON.parse(jsonText);
                if (!Array.isArray(parsed)) throw new Error("JSON must be an array of questions.");
                setJsonError(null);
                onSubmit?.(parsed);
            } catch (err) {
                setJsonError(err.message);
            }
            return;
        }

        onSubmit?.(questions);
    };

    const readyCount = questions.filter(
        (q) => q.question.trim() && q.correctAnswer && q.options.filter(Boolean).length >= 2
    ).length;

    return (
        <Card className="mx-auto max-w-5xl">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Add Multiple Questions</h1>
                    <p className="mt-1 text-muted-foreground">
                        Fill in each question below, then save all at once.
                    </p>
                </div>

                {/* Mode toggle */}
                <div className="flex rounded-xl border border-transparent bg-muted p-1">
                    <button
                        type="button"
                        onClick={() => setMode("form")}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition
                            ${mode === "form" ? "bg-orange-600 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <FaListUl size={13} /> Form
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("json")}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition
                            ${mode === "json" ? "bg-orange-600 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <FaCode size={13} /> Paste JSON
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "form" ? (
                    <>
                        {/* Summary bar */}
                        <div className="flex items-center justify-between rounded-xl border border-transparent bg-muted/50 px-5 py-3">
                            <p className="text-sm text-muted-foreground">
                                <span className="font-semibold text-foreground">{questions.length}</span> question
                                {questions.length !== 1 ? "s" : ""} &nbsp;·&nbsp;
                                <span className="font-semibold text-green-400">{readyCount} ready</span>
                            </p>
                            <button
                                type="button"
                                onClick={addQuestion}
                                className="flex items-center gap-2 rounded-lg bg-orange-600/20 px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-orange-600/30"
                            >
                                <FaPlus size={12} /> Add Question
                            </button>
                        </div>

                        {/* Question blocks */}
                        <div className="space-y-3">
                            {questions.map((q, i) => (
                                <QuestionBlock
                                    key={i}
                                    index={i}
                                    data={q}
                                    onChange={handleChange}
                                    onRemove={removeQuestion}
                                    canRemove={questions.length > 1}
                                />
                            ))}
                        </div>

                        {/* Add more button */}
                        <button
                            type="button"
                            onClick={addQuestion}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-transparent py-4 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                        >
                            <FaPlus size={12} /> Add Another Question
                        </button>
                    </>
                ) : (
                    <div className="space-y-3">
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
                            <p className="font-semibold text-primary">JSON Format Guide</p>
                            <p className="mt-1 text-muted-foreground">
                                Paste a JSON array of question objects. Each object should have:{" "}
                                <code className="text-orange-300">question</code>,{" "}
                                <code className="text-orange-300">options</code> (array),{" "}
                                <code className="text-orange-300">correctAnswer</code>,{" "}
                                <code className="text-orange-300">marks</code>, and optionally{" "}
                                <code className="text-orange-300">difficulty</code>,{" "}
                                <code className="text-orange-300">explanation</code>.
                            </p>
                        </div>

                        <textarea
                            value={jsonText}
                            onChange={(e) => { setJsonText(e.target.value); setJsonError(null); }}
                            placeholder={`[\n  {\n    "question": "What is 2+2?",\n    "options": ["1","2","3","4"],\n    "correctAnswer": "4",\n    "marks": 1,\n    "difficulty": "EASY"\n  }\n]`}
                            rows={16}
                            className="w-full resize-y rounded-xl border border-transparent bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition focus:border-primary"
                        />

                        {jsonError && (
                            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                ⚠ {jsonError}
                            </p>
                        )}
                    </div>
                )}

                {/* Submit */}
                <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                        {mode === "form"
                            ? `${readyCount} of ${questions.length} question${questions.length !== 1 ? "s" : ""} ready to save`
                            : "Questions will be validated on submission"}
                    </p>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : `Save ${mode === "form" ? `${questions.length} Question${questions.length !== 1 ? "s" : ""}` : "Questions"}`}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
