"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    LayoutGrid,
    Send,
    SkipForward,
} from "lucide-react";

import { QUESTION_STATUS } from "@/lib/quizAttemptState";

// Above this many questions the numbered strip is replaced by first/last
// controls and a question palette, since a strip of 50 or 100 numbers can't
// be scanned or reached without scrolling.
export const LARGE_QUIZ_THRESHOLD = 20;

export const isLargeQuiz = (questionCount) => questionCount > LARGE_QUIZ_THRESHOLD;

const STATUS_STYLES = {
    current:
        "border-primary bg-primary text-foreground shadow-[0_0_0_3px_rgba(249,115,22,0.25)]",
    [QUESTION_STATUS.ANSWERED]:
        "border-emerald-500/60 bg-emerald-500/15 text-emerald-400 hover:border-emerald-400",
    [QUESTION_STATUS.SKIPPED]:
        "border-rose-500/60 bg-rose-500/15 text-rose-400 hover:border-rose-400",
    [QUESTION_STATUS.VISITED]:
        "border-amber-500/60 bg-amber-500/15 text-amber-400 hover:border-amber-400",
    [QUESTION_STATUS.NOT_VISITED]:
        "border-transparent bg-muted/60 text-muted-foreground hover:border-transparent hover:text-foreground",
};

const STATUS_LABELS = {
    [QUESTION_STATUS.ANSWERED]: "answered",
    [QUESTION_STATUS.SKIPPED]: "skipped",
    [QUESTION_STATUS.VISITED]: "visited, not answered",
    [QUESTION_STATUS.NOT_VISITED]: "not visited",
};

// A Self-Test question once its answer is checked: right or wrong.
const CHECKED_STYLES = {
    right: "border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:border-emerald-400",
    wrong: "border-rose-500/60 bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:border-rose-400",
};

// The palette's legend, in the order a student cares about.
const LEGEND = [
    { status: QUESTION_STATUS.ANSWERED, label: "Answered" },
    { status: QUESTION_STATUS.VISITED, label: "Seen, not answered" },
    { status: QUESTION_STATUS.SKIPPED, label: "Skipped" },
    { status: QUESTION_STATUS.NOT_VISITED, label: "Not visited" },
];

const ARROW_BUTTON =
    "flex h-9 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border border-transparent bg-muted/60 text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:hover:border-transparent disabled:hover:text-foreground cursor-pointer disabled:cursor-not-allowed";

/**
 * How each question button reads: its tracked status (see
 * useQuizAttemptTracker), a Self-Test's right/wrong once checked, and the
 * open question highlighted as current. The open question's underlying
 * status still drives its label — so an answered question you're looking at
 * doesn't read as unanswered.
 */
function statusHelpers({ questionStates, checkedResults, practice, currentQuestionIndex }) {
    const statusFor = (questionId) =>
        questionStates[questionId]?.status ?? QUESTION_STATUS.NOT_VISITED;

    const checkedStyleFor = (questionId) => {
        if (!practice || !(questionId in checkedResults)) return null;
        return checkedResults[questionId] === false ? CHECKED_STYLES.wrong : CHECKED_STYLES.right;
    };

    const labelFor = (questionId) => {
        if (practice && questionId in checkedResults) {
            return checkedResults[questionId] === false ? "checked, wrong" : checkedResults[questionId] === true ? "checked, right" : "checked";
        }
        return STATUS_LABELS[statusFor(questionId)];
    };

    const styleFor = (index, questionId) =>
        index === currentQuestionIndex
            ? STATUS_STYLES.current
            : checkedStyleFor(questionId) ?? STATUS_STYLES[statusFor(questionId)];

    return { statusFor, labelFor, styleFor };
}

/**
 * Bottom nav bar for a quiz attempt, with a Skip control and a submit
 * control that's reachable from any question (not only the last one).
 *
 * Up to LARGE_QUIZ_THRESHOLD questions: previous/next arrows around a
 * horizontally-scrollable strip of question-jump buttons. Above it: first /
 * previous / "Question n of N" / next / last. The question palette then sits
 * beside the question (QuestionPalette, placed by QuizExperience) where the
 * quiz is wide enough, and opens under this bar from the "Question n of N"
 * toggle where it isn't — both decided by the `@container` QuizExperience
 * wraps the attempt in.
 *
 * Each jump button is coloured by that question's real tracked status
 * (see useQuizAttemptTracker) rather than by a local guess, so the strip and
 * the record that gets submitted always agree.
 */
export default function QuizNavigation({
                                           questions = [],
                                           currentQuestionIndex = 0,
                                           questionStates = {},
                                           onPrevious,
                                           onNext,
                                           onJumpTo,
                                           onSkip,
                                           onSubmit,
                                           canGoPrevious,
                                           canGoNext,
                                           isSubmitting = false,
                                           // A Self-Test: no Skip and no Submit — it saves itself once
                                           // every answer is checked — and each checked question is
                                           // coloured by whether it was right. `checkedResults` maps a
                                           // question id to true (right), false (wrong) or null (checked,
                                           // nothing to mark, e.g. a written answer).
                                           practice = false,
                                           checkedResults = {},
                                       }) {
    const numbersContainerRef = useRef(null);
    const { statusFor, labelFor, styleFor } = statusHelpers({
        questionStates,
        checkedResults,
        practice,
        currentQuestionIndex,
    });

    const currentQuestionId = questions[currentQuestionIndex]?.id;
    // Skipping means "not this one, for now". A question that already carries
    // an answer has nothing to skip.
    const canSkip = Boolean(currentQuestionId) && !questionStates[currentQuestionId]?.answered;

    // Auto-scroll active question number into view inside the scrollable strip
    useEffect(() => {
        if (numbersContainerRef.current) {
            const activeButton = numbersContainerRef.current.querySelector('[data-active="true"]');
            if (activeButton && typeof activeButton.scrollIntoView === "function") {
                activeButton.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
            }
        }
    }, [currentQuestionIndex]);

    // Skip + Submit (fixed right). A Self-Test has neither, but keeps the
    // spacer so the middle cluster stays centred.
    const actions = practice ? (
        <div className="hidden sm:block sm:flex-1" />
    ) : (
        <div className="flex shrink-0 items-center gap-1 sm:gap-2 sm:flex-1 sm:justify-end">
            {onSkip && (
                <button
                    type="button"
                    onClick={onSkip}
                    disabled={!canSkip || isSubmitting}
                    title={
                        canSkip
                            ? "Skip this question and come back to it later"
                            : "This question is already answered"
                    }
                    className="flex h-9 sm:h-10 shrink-0 items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-transparent bg-muted/60 px-2 sm:px-3 text-xs sm:text-sm font-bold text-foreground transition hover:border-amber-500/40 hover:text-amber-400 disabled:opacity-40 disabled:hover:border-transparent disabled:hover:text-foreground cursor-pointer disabled:cursor-not-allowed"
                >
                    <SkipForward className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Skip</span>
                </button>
            )}

            <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting}
                title="Submit & End Quiz"
                className="flex h-9 sm:h-10 shrink-0 items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl bg-green-600 px-2.5 sm:px-3 text-xs sm:text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {isSubmitting ? "Submitting..." : "Submit"}
            </button>
        </div>
    );

    if (isLargeQuiz(questions.length)) {
        return (
            <CompactNavigator
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
                questionStates={questionStates}
                checkedResults={checkedResults}
                practice={practice}
                onPrevious={onPrevious}
                onNext={onNext}
                onJumpTo={onJumpTo}
                canGoPrevious={canGoPrevious}
                canGoNext={canGoNext}
                actions={actions}
            />
        );
    }

    return (
        <div className="rounded-2xl border border-border bg-background p-1.5 sm:p-3">
            <div className="flex items-center gap-1 sm:gap-2">
                {/* Desktop left spacer for visual centering of middle cluster */}
                <div className="hidden sm:block sm:flex-1" />

                {/* Main navigation row: Prev (fixed) | Question Numbers (scrollable) | Next (fixed) */}
                <div className="flex flex-1 sm:flex-none min-w-0 sm:shrink items-center gap-1 sm:gap-2">
                    <button
                        type="button"
                        onClick={onPrevious}
                        disabled={!canGoPrevious}
                        title="Previous question"
                        className={ARROW_BUTTON}
                    >
                        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>

                    {/* Phones: the strip stretches between the arrows, so a
                        short quiz left its numbers bunched at the start with
                        the slack piled up before ›. Each number's auto left
                        margin (and the last one's right) spreads them evenly
                        instead; when there are too many to fit the margins
                        resolve to 0 and the strip scrolls as before. From sm
                        the strip is only as wide as its numbers, so nothing
                        changes there. */}
                    <div
                        ref={numbersContainerRef}
                        className="flex flex-1 sm:flex-initial min-w-0 gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-0.5"
                    >
                        {questions.map((question, index) => {
                            const isCurrent = index === currentQuestionIndex;
                            const status = statusFor(question.id);
                            return (
                                <button
                                    key={question.id ?? index}
                                    type="button"
                                    data-active={isCurrent ? "true" : "false"}
                                    data-status={status}
                                    onClick={() => onJumpTo?.(index)}
                                    title={`Go to question ${index + 1} — ${labelFor(question.id)}`}
                                    aria-label={`Question ${index + 1}, ${labelFor(question.id)}`}
                                    aria-current={isCurrent ? "true" : undefined}
                                    className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 max-sm:ml-auto max-sm:last:mr-auto items-center justify-center rounded-lg sm:rounded-xl border text-xs sm:text-sm font-bold transition cursor-pointer ${styleFor(
                                        index,
                                        question.id
                                    )}`}
                                >
                                    {index + 1}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={onNext}
                        disabled={!canGoNext}
                        title="Next question"
                        className={ARROW_BUTTON}
                    >
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                </div>

                {actions}
            </div>
        </div>
    );
}

/**
 * The nav bar for a quiz with more than LARGE_QUIZ_THRESHOLD questions:
 * first / previous / "Question n of N" / next / last. Where the quiz is too
 * narrow for the palette beside the question (below @3xl), "Question n of N"
 * is a toggle that opens the palette under the bar; it stays open while the
 * student jumps around, until they close it.
 */
function CompactNavigator({
    questions,
    currentQuestionIndex,
    questionStates,
    checkedResults,
    practice,
    onPrevious,
    onNext,
    onJumpTo,
    canGoPrevious,
    canGoNext,
    actions,
}) {
    const [isGridOpen, setIsGridOpen] = useState(false);
    const gridId = useId();
    const lastIndex = questions.length - 1;

    const position = (
        <span className="truncate tabular-nums">
            <span className="hidden sm:inline">Question </span>
            {currentQuestionIndex + 1}
            <span className="text-muted-foreground"> of {questions.length}</span>
        </span>
    );

    return (
        <div className="rounded-2xl border border-border bg-background p-1.5 sm:p-3">
            <div className="flex items-center gap-1 sm:gap-2">
                {/* Desktop left spacer for visual centering of middle cluster */}
                <div className="hidden sm:block sm:flex-1" />

                {/* First | Prev | Question n of N | Next | Last */}
                <div className="flex flex-1 sm:flex-none min-w-0 items-center gap-1 sm:gap-2">
                    <button
                        type="button"
                        onClick={() => onJumpTo?.(0)}
                        disabled={currentQuestionIndex === 0}
                        title="First question"
                        aria-label="First question"
                        className={ARROW_BUTTON}
                    >
                        <ChevronsLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={onPrevious}
                        disabled={!canGoPrevious}
                        title="Previous question"
                        aria-label="Previous question"
                        className={ARROW_BUTTON}
                    >
                        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>

                    {/* Narrow: a toggle for the palette under the bar. */}
                    <button
                        type="button"
                        onClick={() => setIsGridOpen((open) => !open)}
                        aria-expanded={isGridOpen}
                        aria-controls={gridId}
                        title={isGridOpen ? "Hide all questions" : "Show all questions"}
                        className={`flex @3xl:hidden h-9 sm:h-10 min-w-0 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-lg sm:rounded-xl border px-2 sm:px-4 text-xs sm:text-sm font-bold text-foreground transition cursor-pointer ${
                            isGridOpen
                                ? "border-primary/50 bg-primary/10"
                                : "border-transparent bg-muted/60 hover:border-primary/40"
                        }`}
                    >
                        <LayoutGrid className="hidden h-4 w-4 shrink-0 text-primary sm:block" aria-hidden />
                        {position}
                        {/* Phones need every pixel for "73 of 100"; the
                            button's open state still shows on its fill. */}
                        <ChevronDown
                            className={`hidden h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform sm:block ${isGridOpen ? "rotate-180" : ""}`}
                            aria-hidden
                        />
                    </button>
                    {/* Wide: the palette is beside the question, so this is
                        only the position. */}
                    <span
                        aria-live="polite"
                        className="hidden @3xl:flex h-10 items-center px-3 text-sm font-bold text-foreground"
                    >
                        {position}
                    </span>

                    <button
                        type="button"
                        onClick={onNext}
                        disabled={!canGoNext}
                        title="Next question"
                        aria-label="Next question"
                        className={ARROW_BUTTON}
                    >
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onJumpTo?.(lastIndex)}
                        disabled={currentQuestionIndex === lastIndex}
                        title="Last question"
                        aria-label="Last question"
                        className={ARROW_BUTTON}
                    >
                        <ChevronsRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                </div>

                {actions}
            </div>

            {isGridOpen && (
                <div id={gridId} className="mt-2 border-t border-border pt-2 sm:mt-3 sm:pt-3 @3xl:hidden">
                    <QuestionPalette
                        questions={questions}
                        currentQuestionIndex={currentQuestionIndex}
                        questionStates={questionStates}
                        checkedResults={checkedResults}
                        practice={practice}
                        onJumpTo={onJumpTo}
                        gridClassName="max-h-[45vh] sm:max-h-72"
                    />
                </div>
            )}
        </div>
    );
}

/**
 * Every question of the attempt as a numbered grid, coloured by status, with
 * a legend and counts; a click jumps to that question. QuizExperience shows it
 * beside the question in a wide quiz; CompactNavigator under its bar in a
 * narrow one. A long grid scrolls inside itself, keeping the open question in
 * view.
 */
export function QuestionPalette({
    questions = [],
    currentQuestionIndex = 0,
    questionStates = {},
    checkedResults = {},
    practice = false,
    onJumpTo,
    gridClassName = "",
}) {
    const gridRef = useRef(null);
    const { statusFor, labelFor, styleFor } = statusHelpers({
        questionStates,
        checkedResults,
        practice,
        currentQuestionIndex,
    });

    // Scrolls the grid alone (never the page, as scrollIntoView would) so the
    // open question stays in view. The grid is `relative`, so offsetTop is
    // measured from it.
    useEffect(() => {
        const grid = gridRef.current;
        const active = grid?.querySelector('[data-active="true"]');
        if (!active || grid.scrollHeight <= grid.clientHeight) return;
        const top = active.offsetTop;
        const bottom = top + active.offsetHeight;
        if (top < grid.scrollTop) grid.scrollTop = top - 4;
        else if (bottom > grid.scrollTop + grid.clientHeight) grid.scrollTop = bottom - grid.clientHeight + 4;
    }, [currentQuestionIndex]);

    const counts = questions.reduce((acc, question) => {
        const status = statusFor(question.id);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    return (
        <>
            {/* A Self-Test colours checked questions right/wrong, so the
                attempt-status legend would mislead there. */}
            {!practice && (
                <ul className="mb-2 flex flex-wrap gap-x-3 gap-y-1 px-0.5 text-[11px] text-muted-foreground sm:mb-3 sm:text-xs">
                    {LEGEND.map(({ status, label }) => (
                        <li key={status} className="flex items-center gap-1.5">
                            <span aria-hidden className={`h-3 w-3 rounded border ${STATUS_STYLES[status]}`} />
                            {label}
                            <span className="tabular-nums text-foreground">{counts[status] || 0}</span>
                        </li>
                    ))}
                    <li className="flex items-center gap-1.5">
                        <span aria-hidden className={`h-3 w-3 rounded border ${STATUS_STYLES.current}`} />
                        Current
                    </li>
                </ul>
            )}

            <div
                ref={gridRef}
                role="group"
                aria-label="Jump to question"
                // Fixed 2rem squares, as many per row as fit; the padding
                // leaves room for the current question's ring.
                className={`relative grid grid-cols-[repeat(auto-fill,2rem)] justify-between gap-1.5 overflow-y-auto p-1 ${gridClassName}`}
            >
                {questions.map((question, index) => {
                    const isCurrent = index === currentQuestionIndex;
                    return (
                        <button
                            key={question.id ?? index}
                            type="button"
                            data-active={isCurrent ? "true" : "false"}
                            data-status={statusFor(question.id)}
                            onClick={() => onJumpTo?.(index)}
                            title={`Go to question ${index + 1} — ${labelFor(question.id)}`}
                            aria-label={`Question ${index + 1}, ${labelFor(question.id)}`}
                            aria-current={isCurrent ? "true" : undefined}
                            className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs font-bold tabular-nums transition cursor-pointer ${styleFor(
                                index,
                                question.id
                            )}`}
                        >
                            {index + 1}
                        </button>
                    );
                })}
            </div>
        </>
    );
}
