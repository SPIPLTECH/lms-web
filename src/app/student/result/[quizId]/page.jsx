"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  HelpCircle,
  ListChecks,
  RotateCcw,
  Timer,
  XCircle,
} from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/layouts/PageHeader";
import Loader from "@/components/common/Loader";
import useQuizResult from "@/hooks/queries/student/useQuizResult";
import QuestionReviewCard from "@/components/student/quiz-result/QuestionReviewCard";
import AttemptHistory from "@/components/student/quiz-result/AttemptHistory";
import ResultNextStep from "@/components/student/quiz-result/ResultNextStep";
import useNextAction from "@/hooks/queries/student/useNextAction";
import { NEXT_ACTION } from "@/lib/nextAction";
import SubmissionStatusBadge from "@/components/student/submissions/SubmissionStatusBadge";
import ListenButton from "@/components/student/tts/ListenButton";
import { buildResultOverviewSpeech } from "@/lib/quizSpeech";
import { formatDate, formatDuration, formatTime } from "@/features/student/constants/submissionsConfig";

const SUBMISSIONS_HREF = "/student/assignments";

/** A read-only fact about the attempt — tinted, not bordered. */
function StatTile({ icon: Icon, iconClassName, label, value, detail }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/50 p-2.5 sm:p-4">
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:gap-1.5 sm:text-[11px]">
        <Icon size={12} className={`shrink-0 sm:w-[13px] sm:h-[13px] ${iconClassName}`} aria-hidden />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 break-words text-[13px] font-semibold leading-snug tabular-nums text-foreground sm:mt-1.5 sm:text-lg">{value}</p>
      {detail && <p className="truncate text-[10px] tabular-nums text-muted-foreground sm:text-xs">{detail}</p>}
    </div>
  );
}

function QuizResultPageContent() {
  const { quizId } = useParams();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("from");
  // One specific earlier attempt (?attempt=<id>); the latest when absent.
  const attemptId = searchParams.get("attempt");
  const { data, isLoading, isError } = useQuizResult(quizId, { attemptId });

  const [mobileReviewIndex, setMobileReviewIndex] = useState(0);

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

  if (isLoading) {
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
  const attemptLabel = limited
    ? `Attempt ${attemptNumber} of ${submission.maxAttempts}`
    : `Attempt ${attemptNumber}`;
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
  const totalQuestions = submission.totalQuestions ?? quiz?.questions?.length ?? 0;
  const timeTaken = formatDuration(submission.timeTakenSeconds);
  const moduleTitle = quiz?.module?.title || null;

  const scoreTone = !graded
    ? "text-foreground"
    : passed
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-4 overflow-x-hidden px-3 pb-12 sm:space-y-8 sm:px-6">
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

      {/* Result overview — on phones this stacks title, then score, then attempt. */}
      <section
        aria-labelledby="result-title"
        className="rounded-2xl border border-border bg-card p-3.5 shadow-sm sm:p-7"
      >
        <div className="flex flex-col gap-3 sm:gap-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 sm:text-xs">
              Quiz{moduleTitle ? ` · ${moduleTitle}` : ""}
            </p>
            <h1
              id="result-title"
              className="mt-1 break-words text-lg font-bold leading-snug tracking-tight text-foreground sm:mt-1.5 sm:text-3xl"
            >
              {quiz?.title || "Quiz"}
            </h1>
            {quiz?.course?.title && (
              <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">{quiz.course.title}</p>
            )}
            <p className="mt-2 text-xs font-semibold text-foreground sm:mt-3 sm:text-sm">{attemptLabel}</p>
            <ListenButton
              sessionKey={`quiz-result:${submission.attemptId || quizId}`}
              getChunks={() => buildResultOverviewSpeech({ submission })}
              label="Listen to result"
              ariaLabel="Listen to quiz result"
              className="mt-3"
            />
          </div>

          <div className="flex shrink-0 items-center gap-4 sm:gap-5 md:flex-col md:items-end md:gap-2 md:text-right">
            <p className={`text-3xl font-bold leading-none tracking-tight tabular-nums sm:text-5xl ${scoreTone}`}>
              {graded ? `${percentage}%` : "—"}
            </p>
            <div className="space-y-1 sm:space-y-1.5 md:flex md:flex-col md:items-end">
              <p className="text-xs font-semibold tabular-nums text-foreground sm:text-sm">
                {graded ? (
                  <>
                    {score} / {totalMarks} <span className="font-normal text-muted-foreground">marks</span>
                  </>
                ) : (
                  "Not graded"
                )}
              </p>
              <SubmissionStatusBadge status={status} />
            </div>
          </div>
        </div>

        {graded && (
          <div className="mt-4 sm:mt-6">
            <div
              className="relative h-2 rounded-full bg-muted"
              role="img"
              aria-label={`Scored ${percentage}%. Pass mark ${passingScore}%.`}
            >
              <div
                className={`h-full rounded-full ${passed ? "bg-emerald-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
              <span
                aria-hidden
                className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-foreground/70"
                style={{ left: `${Math.min(100, Math.max(0, passingScore))}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Pass mark {passingScore}%</p>
          </div>
        )}
      </section>

      <section aria-label="Attempt details" className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        <StatTile
          icon={CalendarClock}
          iconClassName="text-primary"
          label="Submitted"
          value={formatDate(submittedAt)}
          detail={formatTime(submittedAt)}
        />
        <StatTile
          icon={Timer}
          iconClassName="text-sky-500"
          label="Time taken"
          value={timeTaken ?? "—"}
          detail={timeTaken ? null : "Not recorded"}
        />
        <StatTile icon={ListChecks} iconClassName="text-violet-500" label="Questions" value={totalQuestions} />
        <StatTile
          icon={CheckCircle2}
          iconClassName="text-emerald-500"
          label="Correct"
          value={submission.correctCount ?? "—"}
        />
        <StatTile
          icon={XCircle}
          iconClassName="text-red-500"
          label="Incorrect"
          value={submission.incorrectCount ?? "—"}
        />
        <StatTile
          icon={CircleSlash}
          iconClassName="text-muted-foreground"
          label="Unanswered"
          value={submission.unansweredCount ?? "—"}
        />
      </section>

      {/* WHAT TO DO NEXT — the server's next action, asked in the context of
          this quiz. Sits directly under the result so the answer to "what now"
          is there while the result is fresh, rather than below a long question
          review the student has to scroll past on a phone.
          See showNextStep above for when it appears. */}
      {showNextStep && (
        <ResultNextStep courseId={quiz.courseId} quizId={quizId} returnTo={returnTo} />
      )}

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

      {/* Detailed Question Review List / Mobile Slider */}
      <section className="space-y-3 sm:space-y-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <HelpCircle size={18} className="text-primary shrink-0 sm:w-5 sm:h-5" />
            Detailed Question Review
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 sm:mt-1 sm:text-xs">
            {!answerKeyRevealed
              ? "Which questions you got right, while this qualifying test can still be retaken."
              : submission.isLatestAttempt === false
                ? `Your answers in attempt ${attemptNumber}, alongside the correct options.`
                : "Review your selections alongside correct options."}
          </p>
        </div>

        {/* ANSWER KEY WITHHELD — a qualifying test the student may still
            retake. The full review below marks each option against
            `correctAnswer`, which the server deliberately does not send in
            that case; rendering it anyway would mark every answer wrong,
            including the ones they got right. So this shows the server's own
            per-question verdict instead: honest about what they got right,
            without handing over the answers to the retake. */}
        {!answerKeyRevealed ? (
          <div className="space-y-2">
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-foreground sm:px-4 sm:text-sm">
              Answers are hidden until you pass this qualifying test or run out of attempts — otherwise
              the retake would just be a memory test.
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

        {/* Mobile Question Review Slider (sm:hidden) */}
        {quiz?.questions?.length > 0 && (
          <div className="sm:hidden space-y-2">
            {/* Single Question Review Card */}
            {quiz.questions[mobileReviewIndex] && (
              <QuestionReviewCard
                key={quiz.questions[mobileReviewIndex].id}
                question={quiz.questions[mobileReviewIndex]}
                index={mobileReviewIndex}
                userAnswer={parsedAnswers.find((ans) => ans.questionId === quiz.questions[mobileReviewIndex].id)}
              />
            )}

            {/* Unified Mobile Question Navigation Container */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between gap-1 rounded-xl border border-border bg-background/50 backdrop-blur-md p-1 min-w-0 shadow-sm">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={() => setMobileReviewIndex((prev) => Math.max(0, prev - 1))}
                  disabled={mobileReviewIndex === 0}
                  title="Previous Question"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Scrollable Question Number Strip */}
                <div className="flex flex-1 min-w-0 items-center justify-center gap-1 overflow-x-auto scrollbar-none py-0.5 px-1">
                  {quiz.questions.map((q, idx) => {
                    const isCurrent = idx === mobileReviewIndex;
                    return (
                      <button
                        key={q.id || idx}
                        type="button"
                        onClick={() => setMobileReviewIndex(idx)}
                        title={`Go to question ${idx + 1}`}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition cursor-pointer ${
                          isCurrent
                            ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
                            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={() => setMobileReviewIndex((prev) => Math.min(quiz.questions.length - 1, prev + 1))}
                  disabled={mobileReviewIndex >= quiz.questions.length - 1}
                  title="Next Question"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Secondary Subordinate Position Indicator */}
              <p className="text-[10px] font-semibold text-muted-foreground text-center">
                Question {mobileReviewIndex + 1} of {quiz.questions.length}
              </p>
            </div>
          </div>
        )}

        {/* Desktop Vertical Stack (hidden sm:block) */}
        <div className="hidden sm:block space-y-5">
          {quiz?.questions?.map((question, index) => (
            <QuestionReviewCard
              key={question.id}
              question={question}
              index={index}
              userAnswer={parsedAnswers.find((ans) => ans.questionId === question.id)}
            />
          ))}
        </div>
        </>
        )}
      </section>
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
