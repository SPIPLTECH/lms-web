"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useModules } from "@/hooks/queries/instructor/useModules";
import { useInstructorCourses } from "@/hooks/queries/instructor/useInstructorCourses";
import ProctoringToggle from "@/components/instructor/quizzes/ProctoringToggle";

const QUIZ_TAG_OPTIONS = [
    { value: "SELF_TEST", label: "Self-Test — practice, never timed" },
    { value: "FINAL", label: "Final Quiz — formal assessment" },
];

const DEFAULT_TIME_LIMIT = 30;

const INITIAL_FORM = {
    courseId: "",
    moduleId: "",
    title: "",
    description: "",
    // Unselected on purpose — the instructor picks practice or assessment.
    quizTag: "",
    // UI-only: distinguishes "deliberately untimed" from "minutes box empty".
    timerEnabled: false,
    timeLimit: null,
    passingScore: 50,
    // Attempts each student gets; 0 means unlimited.
    attempts: 1,
    startDate: "",
    dueDate: "",
    shuffleQuestions: false,
    proctoringEnabled: false,
};

function formatDateForInput(isoStr) {
    if (!isoStr) return "";
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return "";
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
        return "";
    }
}

export default function QuizForm({
    mode = "create",
    initialValues = null,
    loading = false,
    onSubmit,
    lockedCourseId = null,
}) {
    const [formData, setFormData] = useState({ ...INITIAL_FORM, courseId: lockedCourseId || "" });
    const [submitAction, setSubmitAction] = useState("draft");
    const [tagError, setTagError] = useState("");

    // Course → Module: when a course is locked (e.g. "create quiz for this
    // course" entry point), the course select is replaced with a read-only
    // display. Otherwise every course the instructor owns is offered.
    const { data: instructorCourses = [] } = useInstructorCourses();
    const availableCourses = lockedCourseId ? null : instructorCourses;

    const { data: modules = [] } = useModules(formData.courseId);

    useEffect(() => {
        if (initialValues) {
            const timeLimit = Number(initialValues.timeLimit) > 0 ? Number(initialValues.timeLimit) : null;

            setFormData({
                ...INITIAL_FORM,
                ...initialValues,
                // Quizzes authored before tags existed were formal assessments.
                quizTag: initialValues.quizTag === "SELF_TEST" ? "SELF_TEST" : "FINAL",
                timerEnabled: timeLimit !== null,
                timeLimit,
                // A Self-Test is stored as 0 (unlimited); the Final box starts at 1.
                attempts: Number(initialValues.attempts) > 0 ? initialValues.attempts : 1,
                proctoringEnabled: initialValues.proctoringEnabled === true,
                startDate: formatDateForInput(initialValues.startDate || initialValues.availableFrom),
                dueDate: formatDateForInput(initialValues.dueDate || initialValues.availableUntil),
            });
        }
    }, [initialValues]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            // timeLimit is coerced at submit, not here — Number("") is 0, which
            // would read as a real (zero-minute) limit while typing.
            [name]: name === "passingScore" ? Number(value) : value,
            ...(name === "courseId" ? { moduleId: "" } : {}),
        }));
    };

    const handleSelectTag = (quizTag) => {
        setTagError("");
        setFormData((prev) => ({
            ...prev,
            quizTag,
            // A Self-Test is never timed or proctored, so drop both as the tag changes.
            ...(quizTag === "SELF_TEST" ? { timerEnabled: false, timeLimit: null, proctoringEnabled: false } : {}),
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.quizTag) {
            setTagError("Select a quiz tag — Self-Test or Final Quiz.");
            return;
        }

        // Only a Final Quiz with the timer switched on carries a limit.
        const timeLimit =
            formData.quizTag === "FINAL" && formData.timerEnabled && Number(formData.timeLimit) > 0
                ? Number(formData.timeLimit)
                : null;

        if (formData.proctoringEnabled && timeLimit === null) {
            setTagError("A proctored quiz needs a time limit.");
            return;
        }

        const payload = {
            ...formData,
            timeLimit,
            // A Self-Test is always unlimited (0); a Final has at least one attempt.
            attempts:
                formData.quizTag === "SELF_TEST"
                    ? 0
                    : Math.max(1, Math.round(Number(formData.attempts)) || 1),
            moduleId: formData.moduleId || null,
            startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
            dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        };

        // UI-only field — the API schema rejects unknown keys.
        delete payload.timerEnabled;

        onSubmit?.(payload, submitAction);
    };

    return (
        <Card className="mx-auto max-w-4xl bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-foreground tracking-tight">
                    {mode === "create" ? "Create Quiz" : "Edit Quiz"}
                </h1>

                <p className="mt-2 text-sm text-muted-foreground">
                    {mode === "create" ? "Create a new quiz for your course and schedule when students can attempt it." : "Update quiz details and schedule parameters."}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {mode === "create" && (
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm text-foreground">Course</label>

                            {lockedCourseId ? (
                                <div className="w-full rounded-lg border border-transparent bg-background px-4 py-3 text-sm text-muted-foreground">
                                    {instructorCourses.find((c) => c.id === lockedCourseId)?.title || "This course"}
                                </div>
                            ) : (
                                <select
                                    name="courseId"
                                    value={formData.courseId}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-lg border border-transparent bg-muted px-4 py-3 outline-none focus:border-primary"
                                >
                                    <option value="" disabled>Select a course...</option>
                                    {availableCourses.map((c) => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-foreground">Module (Optional)</label>

                            <select
                                name="moduleId"
                                value={formData.moduleId}
                                onChange={handleChange}
                                disabled={!formData.courseId}
                                className="w-full rounded-lg border border-transparent bg-muted px-4 py-3 outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">
                                    {formData.courseId ? "Whole course (no specific module)" : "Select a course first..."}
                                </option>
                                {modules.map((m) => (
                                    <option key={m.id} value={m.id}>{m.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <Input
                    label="Quiz Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Java Advanced Streams & Concurrency Quiz"
                    required
                />

                <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                        Description
                    </label>

                    <textarea
                        name="description"
                        rows={4}
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Brief description and guidelines for the quiz..."
                        className="w-full rounded-xl border border-border bg-[#05070E] px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                    />
                </div>

                {/* Quiz Tag — independent of the quiz's course/module scope
                    above. Governs whether a time limit exists at all. */}
                <div className="space-y-2">
                    <label className="text-sm text-foreground">Quiz Tag *</label>

                    <select
                        name="quizTag"
                        value={formData.quizTag}
                        onChange={(e) => handleSelectTag(e.target.value)}
                        required
                        className="w-full rounded-lg border border-transparent bg-muted px-4 py-3 outline-none focus:border-primary"
                    >
                        <option value="" disabled>Select a quiz tag...</option>
                        {QUIZ_TAG_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    {tagError && <p className="text-xs text-red-400">{tagError}</p>}
                </div>

                {/* Duration & Score */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* A Self-Test never has a timer, so the control is absent
                        rather than disabled — a greyed-out "30" would still
                        read as "this quiz is 30 minutes long". */}
                    {formData.quizTag === "SELF_TEST" ? (
                        <div className="space-y-2">
                            <label className="text-sm text-foreground">Time Limit</label>
                            <p className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                                Self-Test quizzes are never timed.
                            </p>
                        </div>
                    ) : formData.quizTag === "FINAL" ? (
                        <div className="space-y-2">
                            <label className="text-sm text-foreground">Time Limit</label>

                            <label className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-4 py-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.timerEnabled}
                                    disabled={formData.proctoringEnabled}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            timerEnabled: e.target.checked,
                                            timeLimit: e.target.checked
                                                ? (Number(prev.timeLimit) > 0 ? prev.timeLimit : DEFAULT_TIME_LIMIT)
                                                : null,
                                        }))
                                    }
                                    className="h-4 w-4 rounded border-transparent bg-background text-primary cursor-pointer"
                                />
                                <span className="text-xs font-semibold text-foreground select-none">
                                    Enable time limit
                                </span>
                            </label>

                            {formData.timerEnabled && (
                                <Input
                                    label="Minutes"
                                    name="timeLimit"
                                    type="number"
                                    min="1"
                                    value={formData.timeLimit ?? ""}
                                    onChange={handleChange}
                                    disabled={initialValues?.proctoringLocked === true}
                                />
                            )}

                            <ProctoringToggle
                                checked={formData.proctoringEnabled}
                                locked={initialValues?.proctoringLocked === true}
                                onChange={(ticked) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        proctoringEnabled: ticked,
                                        ...(ticked
                                            ? { timerEnabled: true, timeLimit: Number(prev.timeLimit) > 0 ? prev.timeLimit : DEFAULT_TIME_LIMIT }
                                            : {}),
                                    }))
                                }
                            />
                        </div>
                    ) : (
                        <div />
                    )}

                    <Input
                        label="Passing Score (%)"
                        name="passingScore"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.passingScore}
                        onChange={handleChange}
                    />
                </div>

                {/* Attempts follow the tag, like the timer: a Self-Test can
                    always be retaken; a Final gets the number set here (1 by
                    default). Both rules are enforced server-side. */}
                {formData.quizTag === "SELF_TEST" ? (
                    <div className="space-y-2">
                        <span className="block text-sm text-foreground">Attempts per Student</span>
                        <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                            Self-Test quizzes allow unlimited attempts.
                        </p>
                    </div>
                ) : formData.quizTag === "FINAL" ? (
                    <div className="grid gap-6 md:grid-cols-2">
                        <Input
                            label="Attempts per Student"
                            name="attempts"
                            type="number"
                            min="1"
                            max="100"
                            value={formData.attempts ?? 1}
                            onChange={handleChange}
                        />
                    </div>
                ) : null}

                <div className="flex items-center gap-3 bg-[#05070E] p-3.5 rounded-xl border border-border">
                    <input
                        type="checkbox"
                        id="shuffleQuestions"
                        checked={formData.shuffleQuestions}
                        onChange={(e) => setFormData((prev) => ({ ...prev, shuffleQuestions: e.target.checked }))}
                        className="h-4 w-4 rounded border-transparent bg-background text-primary focus:ring-orange-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                    <label htmlFor="shuffleQuestions" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                        Randomize question order for each student attempt
                    </label>
                </div>

                {/* Scheduling Parameters */}
                <div className="p-5 rounded-2xl bg-[#05070E] border border-border space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-primary font-mono">
                            Quiz Schedule & Availability
                        </h3>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Input
                            label="Start Date & Time (Schedule Quiz)"
                            name="startDate"
                            type="datetime-local"
                            value={formData.startDate}
                            onChange={handleChange}
                        />

                        <Input
                            label="Due Date & Time (Deadline)"
                            name="dueDate"
                            type="datetime-local"
                            value={formData.dueDate}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                    {mode === "create" ? (
                        <>
                            <button
                                type="submit"
                                onClick={() => setSubmitAction("draft")}
                                disabled={loading}
                                className="rounded-xl border border-border bg-[#05070E] text-foreground hover:bg-muted text-xs font-extrabold px-5 py-3.5 transition cursor-pointer"
                            >
                                {loading && submitAction === "draft" ? "Saving..." : "Save as Draft"}
                            </button>
                            <button
                                type="submit"
                                onClick={() => setSubmitAction("publish")}
                                disabled={loading}
                                className="rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-foreground text-xs font-extrabold px-6 py-3.5 transition shadow-lg shadow-orange-500/10 active:scale-95 cursor-pointer"
                            >
                                {loading && submitAction === "publish" ? "Creating..." : "Create Quiz"}
                            </button>
                        </>
                    ) : (
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-primary hover:bg-orange-600 font-extrabold"
                        >
                            {loading ? "Updating..." : "Update Quiz"}
                        </Button>
                    )}
                </div>
            </form>
        </Card>
    );
}