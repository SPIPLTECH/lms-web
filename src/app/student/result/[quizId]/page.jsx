"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, RotateCcw, XCircle } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/layouts/PageHeader";
import Loader from "@/components/common/Loader";
import useQuizResult from "@/hooks/queries/student/useQuizResult";
import QuestionReviewCard, { getQuestionReviewStatus } from "@/components/student/quiz-result/QuestionReviewCard";
import AttemptHistory from "@/components/student/quiz-result/AttemptHistory";
import ResultNextStep from "@/components/student/quiz-result/ResultNextStep";
import useNextAction from "@/hooks/queries/student/useNextAction";
import { NEXT_ACTION } from "@/lib/nextAction";
import SubmissionStatusBadge from "@/components/student/submissions/SubmissionStatusBadge";
import ListenButton from "@/components/student/tts/ListenButton";
import { buildResultOverviewSpeech } from "@/lib/quizSpeech";
import { formatDate, formatDuration, formatTime } from "@/features/student/constants/submissionsConfig";

const SUBMISSIONS_HREF = "/student/assignments";

/** One labelled value in the result summary (Score, Pass mark, Attempt). */
function SummaryFact({ label, children, divided = false }) {
  return (
    <div className={`min-w-0 ${divided ? "border-l border-border pl-3 sm:pl-5" : ""}`}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums text-foreground sm:text-xl">{children}</dd>
    </div>
  );
}

// The review filters, in the order the pills show them.
const REVIEW_FILTERS = [
  { key: "all", label: "All" },
  { key: "wrong", label: "Wrong" },
  { key: "skipped", label: "Skipped" },
  { key: "correct", label: "Correct" },
];

// Questions per review page.
const REVIEW_PAGE_SIZE = 10;

const EMPTY_FILTER_TEXT = {
  wrong: "No wrong answers in this attempt.",
  skipped: "You answered every question.",
  correct: "No correct answers in this attempt yet.",
};

function QuizResultPageContent() {
  const { quizId } = useParams();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("from");
  // One specific earlier attempt (?attempt=<id>); the latest when absent.
  const attemptId = searchParams.get("attempt");
  const { data, isLoading, isError } = useQuizResult(quizId, { attemptId });

  // Which questions the review shows: all, or only the wrong / skipped /
  // correct ones.
  const [reviewFilter, setReviewFilter] = useState("all");
  // The review shows REVIEW_PAGE_SIZE questions at a time, within the filter.
  const [reviewPage, setReviewPage] = useState(1);
  const reviewTopRef = useRef(null);

  const submission = data?.data || data;

  const parsedAnswers = useMemo(() => {
    if (!submission?.answers) return [];
    if (typeof submission.answers === "string") {
      try {
        return JSON.parse(submission.answers);
      } catch (e) {
        console.error("Failed to parse answers JSON:", e);
        return [];
      }
    }
    return submission.answers;
  }, [submission]);

  // The same question ResultNextStep asks, with the same arguments — so React
  // Query serves both from one cache entry and one request. Asked here too
  // because the header's retake control has to know whether the next-step
  // block below is already leading with a retry.
  const nextActionCourseId = submission?.quiz?.courseId ?? null;
  const { data: nextAction } = useNextAction(nextActionCourseId, { quizId });

  // A Self-Test has no result page: its answers and reasons were shown while
  // it was taken. A link that still lands here (an old bookmark, history)
  // goes back to where it came from, or to its course.
  const router = useRouter();
  const selfTestFallback =
    submission?.quiz?.quizTag === "SELF_TEST"
      ? returnTo || (submission.quiz.courseId ? `/student/learn/${submission.quiz.courseId}` : SUBMISSIONS_HREF)
      : null;
  useEffect(() => {
    if (selfTestFallback) router.replace(selfTestFallback);
  }, [selfTestFallback, router]);

  if (isLoading || selfTestFallback) {
    return <Loader />;
  }

  if (isError || !submission) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Quiz Result"
          subtitle="View your quiz performance and results."
        />
        <Card className="p-10 text-center border-red-500/25 bg-red-500/5">
          <div className="mx-auto max-w-md">
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-foreground">Result Not Found</h2>
            <p className="mt-2 text-muted-foreground">
              {attemptId
                ? "That attempt couldn't be found. It may belong to another quiz."
                : "Either you have not attempted this quiz yet, or there was an error retrieving your submission."}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={returnTo || SUBMISSIONS_HREF}>
                <Button variant="outline" className="flex w-full items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {returnTo ? "Back" : "Back to Submissions"}
                </Button>
              </Link>
              <Link href={`/student/attempt/${quizId}`}>
                <Button className="w-full">Attempt Quiz Now</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const { quiz, score, totalMarks, percentage, passed, submittedAt, conceptScores } = submission;
  const passingScore = quiz?.passingScore ?? 70;

  // A lesson-launched quiz should return the student to that lesson. Prefer
  // the exact page the quiz was launched from (returnTo); fall back to a
  // guess from the quiz's own lessonId; otherwise the Submissions page.
  const backHref =
    returnTo ||
    (quiz?.lessonId ? `/student/learn/${quiz.courseId}?lessonId=${quiz.lessonId}` : SUBMISSIONS_HREF);
  const backLabel = backHref.startsWith("/student/learn/")
    ? "Back to Lesson"
    : backHref.startsWith(SUBMISSIONS_HREF)
      ? "Back to Submissions"
      : "Back";

  // Links between attempts (and to a retake) keep the page the student came from.
  const fromParam = returnTo ? `from=${encodeURIComponent(returnTo)}` : "";
  const attemptHref = (id) =>
    `/student/result/${quizId}?attempt=${encodeURIComponent(id)}${fromParam ? `&${fromParam}` : ""}`;
  const latestHref = `/student/result/${quizId}${fromParam ? `?${fromParam}` : ""}`;
  const retakeHref = `/student/attempt/${quizId}${fromParam ? `?${fromParam}` : ""}`;

  // The next-step block, and whether it is leading with a retry. A next step
  // shown against an older attempt would be advice about a state the student
  // has already moved on from, so it is only ever for the latest.
  const showNextStep = Boolean(quiz?.courseId) && submission.isLatestAttempt !== false;
  const nextStepLeadsWithRetry =
    showNextStep && nextAction?.primary?.action === NEXT_ACTION.RETRY_QUIZ;

  const graded = Number(totalMarks) > 0;
  const status = !graded ? "submitted" : passed ? "passed" : "failed";
  const attempts = submission.attempts ?? [];
  const attemptNumber = submission.attemptNumber ?? 1;
  const attemptsUsed = submission.attemptsUsed ?? attempts.length;
  const limited = !submission.unlimitedAttempts && Number(submission.maxAttempts) > 0;
  const allowanceText = limited
    ? `${attemptsUsed} of ${submission.maxAttempts} attempts used · ${
        submission.attemptsRemaining > 0 ? `${submission.attemptsRemaining} remaining` : "no attempts left"
      }`
    : `${attemptsUsed} attempt${attemptsUsed === 1 ? "" : "s"} · no limit`;
  const bestPercentage =
    graded && attempts.length > 1 ? Math.max(...attempts.map((a) => a.percentage)) : null;
  // False only for a qualifying test the student can still retake — the server
  // withholds correctAnswer/explanation there, so the review below has to
  // change shape rather than mark everything wrong.
  const answerKeyRevealed = submission.answerKeyRevealed !== false;
  const timeTaken = formatDuration(submission.timeTakenSeconds);
  const moduleTitle = quiz?.module?.title || null;

  const courseLine = [quiz?.course?.title, moduleTitle].filter(Boolean).join(", ");
  // Marks still needed to reach the pass mark, for the line under the bar.
  const marksToPass = graded ? Math.ceil((passingScore / 100) * Number(totalMarks)) : 0;
  const marksShort = Math.max(0, marksToPass - Number(score || 0));
  const passCaption = passed
    ? "Pass mark reached"
    : Number(score || 0) === 0
      ? `${marksToPass} needed to pass`
      : `${marksShort} more needed to pass`;

  // The review list: every question with what happened to it, so the filter
  // counts and each card's tag come from the same rule.
  const reviewRows = (quiz?.questions || []).map((question, index) => {
    const userAnswer = parsedAnswers.find((ans) => ans.questionId === question.id);
    return { question, index, userAnswer, status: getQuestionReviewStatus(question, userAnswer) };
  });
  const reviewCounts = reviewRows.reduce(
    (counts, row) => ({ ...counts, [row.status]: (counts[row.status] || 0) + 1 }),
    { all: reviewRows.length }
  );
  const visibleRows = reviewFilter === "all" ? reviewRows : reviewRows.filter((row) => row.status === reviewFilter);
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / REVIEW_PAGE_SIZE));
  const currentPage = Math.min(reviewPage, pageCount);
  const pageStart = (currentPage - 1) * REVIEW_PAGE_SIZE;
  const pageRows = visibleRows.slice(pageStart, pageStart + REVIEW_PAGE_SIZE);
  // A new page starts at its first question, under the pinned filters.
  const goToReviewPage = (next) => {
    setReviewPage(next);
    reviewTopRef.current?.scrollIntoView({ block: "start" });
  };

  return (
    // overflow-x-clip, not -hidden: hidden makes this a scroll container,
    // which would pin the review filters to it instead of the window.
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-4 overflow-x-clip px-3 pb-12 sm:space-y-8 sm:px-6">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <Link
          href={backHref}
          className="-ml-2 inline-flex min-h-[44px] min-w-0 items-center gap-2 rounded-lg px-2 text-[13px] font-semibold text-primary underline-offset-4 hover:underline sm:text-sm"
        >
          <ArrowLeft size={16} className="shrink-0" aria-hidden />
          <span className="truncate">{backLabel}</span>
        </Link>
        {/* The retake control. Suppressed only when the next-step block below
            is already leading with "Retry Quiz" — two buttons for the same
            action, one of them presented as the recommendation, is a choice
            the student doesn't have. The capability is not removed: the
            block's own primary CTA is that retake, pointing at the same
            place. Whenever the block leads with anything else (or isn't
            shown at all, e.g. on an older attempt), this stays. */}
        {submission.canAttempt && !nextStepLeadsWithRetry && (
          <Link
            href={retakeHref}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RotateCcw size={15} aria-hidden />
            Retake Quiz
          </Link>
        )}
      </div>

      {submission.isLatestAttempt === false && (
        <p className="rounded-xl bg-sky-500/10 px-4 py-3 text-sm text-sky-800 dark:text-sky-300">
          You&apos;re viewing an earlier attempt.{" "}
          <Link href={latestHref} className="font-semibold underline underline-offset-2">
            See your latest attempt
          </Link>
        </p>
      )}

      {/* RESULT — title and status, then one summary card: score, pass
          mark, attempt, a bar with the pass mark on it and how far off it
          was, and when it was submitted. */}
      <section aria-labelledby="result-title" className="space-y-3 sm:space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1
              id="result-title"
              className="break-words font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl"
            >
              {quiz?.title || "Quiz"}
            </h1>
            {courseLine && <p className="mt-1 text-sm text-muted-foreground">{courseLine}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <SubmissionStatusBadge status={status} />
            <ListenButton
              sessionKey={`quiz-result:${submission.attemptId || quizId}`}
              getChunks={() => buildResultOverviewSpeech({ submission })}
              label="Listen"
              ariaLabel="Listen to quiz result"
              compact
            />
          </div>
        </div>

        <div style={{ borderRadius: 16 }} className="border border-border bg-card p-4 sm:p-5">
          <dl className="grid grid-cols-3">
            <SummaryFact label="Score">
              {graded ? (
                <>
                  {score}
                  <span className="text-sm font-medium text-muted-foreground"> / {totalMarks}</span>
                </>
              ) : (
                "Not graded"
              )}
            </SummaryFact>
            <SummaryFact label="Pass mark" divided>
              {passingScore}%
            </SummaryFact>
            <SummaryFact label="Attempt" divided>
              {attemptNumber}
              {limited && (
                <span className="text-sm font-medium text-muted-foreground"> of {submission.maxAttempts}</span>
              )}
            </SummaryFact>
          </dl>

          {graded && (
            <>
              <div
                className="relative mt-4 h-2 rounded-full bg-muted"
                role="img"
                aria-label={`Scored ${percentage}%. Pass mark ${passingScore}%.`}
              >
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
                <span
                  aria-hidden
                  className="absolute -top-1.5 h-5 w-0.5 rounded-full bg-foreground"
                  style={{ left: `${Math.min(100, Math.max(0, passingScore))}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between gap-3 text-xs text-muted-foreground">
                <span className="tabular-nums">{percentage}% scored</span>
                <span className="tabular-nums">{passCaption}</span>
              </div>
            </>
          )}

          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            Submitted {formatDate(submittedAt)}
            {formatTime(submittedAt) ? ` at ${formatTime(submittedAt)}` : ""}
            {timeTaken ? `, took ${timeTaken}` : ""}
          </p>
        </div>
      </section>

      {/* WHAT TO DO NEXT — the server's next action, asked in the context of
          this quiz. Sits directly under the result so the answer to "what now"
          is there while the result is fresh, rather than below a long question
          review the student has to scroll past on a phone.
          See showNextStep above for when it appears. */}
      {showNextStep && (
        <ResultNextStep courseId={quiz.courseId} quizId={quizId} returnTo={returnTo} />
      )}

      {/* QUESTION REVIEW — every question, filtered by what happened to it. */}
      <section aria-labelledby="review-title" className="space-y-3 sm:space-y-4">
        {/* scroll-mt clears the sticky navbar when a page change scrolls here. */}
        <div ref={reviewTopRef} className="scroll-mt-20">
          <h2 id="review-title" className="font-display text-lg font-semibold text-foreground sm:text-xl">
            Review answers
          </h2>
          {/* Only when it says something the list doesn't. */}
          {(!answerKeyRevealed || submission.isLatestAttempt === false) && (
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {!answerKeyRevealed
                ? "Which questions you got right, while this quiz can still be retaken."
                : `Your answers in attempt ${attemptNumber}, alongside the correct options.`}
            </p>
          )}
        </div>

        {/* ANSWER KEY WITHHELD — a graded quiz the student may still
            retake. The full review below marks each option against
            `correctAnswer`, which the server deliberately does not send in
            that case; rendering it anyway would mark every answer wrong,
            including the ones they got right. So this shows the server's own
            per-question verdict instead: honest about what they got right,
            without handing over the answers to the retake. */}
        {!answerKeyRevealed ? (
          <div className="space-y-2">
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-foreground sm:px-4 sm:text-sm">
              Answers are hidden until you pass this quiz or run out of attempts — otherwise the retake
              would just be a memory test.
            </p>
            <ul className="space-y-1.5">
              {(submission.questionAttempts || []).map((row, index) => (
                <li
                  key={row.questionId || index}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 sm:px-4"
                >
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground sm:text-sm">
                    Question {row.order ?? index + 1}
                  </span>
                  {row.hintViewed && (
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      Hint used
                    </span>
                  )}
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      row.isCorrect === true
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : row.answered
                          ? "bg-red-500/15 text-red-700 dark:text-red-400"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {row.isCorrect === true ? "Correct" : row.answered ? "Incorrect" : "Not answered"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
        <>
        {/* Filters — pinned under the navbar while the list scrolls, so
            Wrong / Skipped is one tap away anywhere in it. Four equal pills
            that always fit a phone. Inline radius: globals.css gives every
            <button> an unlayered 6px radius that rounded-full can't beat. */}
        <div className="sticky top-16 z-20 -mx-3 bg-background/95 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6">
          <div role="group" aria-label="Show questions" className="grid grid-cols-4 gap-1.5 sm:max-w-xl sm:gap-2">
            {REVIEW_FILTERS.map((filter) => {
              const active = reviewFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setReviewFilter(filter.key);
                    setReviewPage(1);
                  }}
                  style={{ borderRadius: 9999 }}
                  className={`inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap border px-1 text-[13px] font-semibold transition-colors ${
                    active
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-border bg-card text-foreground hover:border-emerald-500/40"
                  }`}
                >
                  {filter.label}
                  <span className={`tabular-nums ${active ? "" : "text-muted-foreground"}`}>
                    {reviewCounts[filter.key] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {visibleRows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {EMPTY_FILTER_TEXT[reviewFilter]}
          </p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {pageRows.map((row) => (
              <QuestionReviewCard
                key={row.question.id || row.index}
                question={row.question}
                index={row.index}
                total={reviewRows.length}
                userAnswer={row.userAnswer}
              />
            ))}

            {/* PAGES — REVIEW_PAGE_SIZE questions at a time, within the filter.
                Not the shared Pagination: that is a rows-per-page table footer
                with ~26px buttons; this is a fixed page size with 44px targets
                for phones. */}
            {pageCount > 1 && (
              <nav aria-label="Question pages" className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => goToReviewPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  style={{ borderRadius: 12 }}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} aria-hidden />
                  Previous
                </button>
                <p className="text-center text-xs text-muted-foreground" aria-live="polite">
                  <span className="block text-sm font-semibold tabular-nums text-foreground">
                    Page {currentPage} of {pageCount}
                  </span>
                  <span className="tabular-nums">
                    Questions {pageStart + 1}–{pageStart + pageRows.length} of {visibleRows.length}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => goToReviewPage(currentPage + 1)}
                  disabled={currentPage >= pageCount}
                  style={{ borderRadius: 12 }}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} aria-hidden />
                </button>
              </nav>
            )}
          </div>
        )}
        </>
        )}
      </section>

      {/* Attempt history — shown only when the student has multiple
          attempts to compare or switch between. */}
      {attempts.length > 1 && (
        <section aria-labelledby="attempt-history" className="space-y-4">
          <div>
            <h2 id="attempt-history" className="text-base font-semibold text-foreground sm:text-lg">
              Attempt history
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {allowanceText}
              {bestPercentage !== null && (
                <>
                  {" "}· best <span className="font-semibold text-foreground">{bestPercentage}%</span>
                </>
              )}
            </p>
          </div>
          <AttemptHistory attempts={attempts} currentAttemptId={submission.attemptId} hrefFor={attemptHref} />
        </section>
      )}

      {/* Concept Performance Analysis */}
      {conceptScores && Object.keys(conceptScores).length > 0 && (
        <section className="space-y-3 sm:space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <BookOpen size={18} className="text-primary shrink-0 sm:w-5 sm:h-5" />
              Concept-wise Performance Analysis
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Review which concepts are well understood and which need practice.</p>
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {Object.entries(conceptScores).map(([conceptName, cData]) => {
              const perc = cData.percentage ?? 0;
              const isPassed = perc >= passingScore;

              let barColor = "bg-rose-500";
              let textColor = "text-rose-400";
              let label = "Needs practice";

              if (perc >= 75) {
                barColor = "bg-emerald-500";
                textColor = "text-emerald-400";
                label = "Well understood";
              } else if (perc >= 50) {
                barColor = "bg-amber-500";
                textColor = "text-amber-400";
                label = "Getting there";
              }

              return (
                <Card padding="" key={conceptName} className={`p-3.5 sm:p-5 border-transparent bg-background/30 flex flex-col justify-between gap-3 sm:gap-4 border-l-[4px] ${
                  isPassed ? "border-l-emerald-500" : "border-l-orange-500"
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-foreground">{conceptName}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {cData.score} / {cData.total} Marks
                      </p>
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded ${
                      isPassed ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"
                    }`}>
                      {perc}%
                    </span>
                  </div>

                  <div className="w-full space-y-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${perc}%` }}
                      />
                    </div>
                    <p className={`text-[10px] text-right font-medium ${textColor}`}>
                      {label}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}

export default function QuizResultPage() {
  return (
    <Suspense fallback={<Loader />}>
      <QuizResultPageContent />
    </Suspense>
  );
}
