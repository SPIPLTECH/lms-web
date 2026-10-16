"use client";

import { AlertTriangle, Download, Lightbulb, SkipForward, Target, Timer } from "lucide-react";

import DataTable from "@/components/ui/DataTable";
import { exportQuizAnalyticsCsv } from "@/lib/exportResults";

/**
 * Quiz- and question-level analytics for one selected quiz.
 *
 * A natural extension of the Results page rather than a separate analytics
 * area: same cards, same DataTable, same filters above it. Everything shown
 * here is aggregated server-side from the existing attempt records — this
 * component computes nothing.
 */

const pct = (value) => (value === null || value === undefined ? "—" : `${value}%`);

const formatSeconds = (seconds) => {
  if (!Number.isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4">
      <p className="flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-widest text-muted-foreground">
        {Icon && <Icon size={11} className="shrink-0 text-primary" aria-hidden />}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1.5 text-xl font-black tabular-nums text-foreground sm:text-2xl">{value}</p>
      {detail && <p className="mt-0.5 truncate text-[10px] tabular-nums text-muted-foreground">{detail}</p>}
    </div>
  );
}

/**
 * How often each option was chosen. A horizontal bar per option so a
 * distractor that is pulling most of the cohort is obvious at a glance —
 * that is usually a teaching problem rather than carelessness.
 */
function OptionBars({ distribution, correctAnswer }) {
  if (!distribution?.length) return null;

  const isCorrect = (option) =>
    typeof correctAnswer === "string"
      ? option.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
      : false;

  return (
    <div className="mt-2 space-y-1">
      {distribution.map((entry) => {
        const correct = isCorrect(entry.option);
        return (
          <div key={entry.option} className="flex items-center gap-2">
            <span
              className={`min-w-0 flex-1 truncate text-[11px] ${
                correct ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
              }`}
              title={entry.option}
            >
              {entry.option}
            </span>
            <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted sm:w-24">
              <span
                className={`block h-full rounded-full ${correct ? "bg-emerald-500" : "bg-amber-500"}`}
                style={{ width: `${Math.min(100, entry.percentage)}%` }}
              />
            </span>
            <span className="w-11 shrink-0 text-right text-[11px] tabular-nums text-foreground">
              {entry.percentage}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function QuizAnalyticsPanel({ analytics, isLoading, quizSelected }) {
  if (!quizSelected) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
        <p className="text-xs text-muted-foreground sm:text-sm">
          Pick a quiz above to see how the cohort performed, question by question.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-xs text-muted-foreground">Loading analytics…</p>
      </div>
    );
  }

  if (!analytics) return null;

  const { quiz, summary, questions = [], difficultQuestions = [], weakAreas = [], qualifying } = analytics;
  const isQualifying = quiz?.quizTag === "QUALIFYING";

  // One row per question. Correct / Incorrect / Skipped stay separate columns
  // throughout — merging them would hide whether a question is being failed or
  // avoided, which are different problems with different fixes.
  const questionColumns = [
    {
      key: "question",
      header: "Question",
      render: (r) => (
        <div className="min-w-0 max-w-[22rem]">
          <span className="block truncate text-xs font-medium text-foreground" title={r.question}>
            {r.order ? `${r.order}. ` : ""}
            {r.question}
          </span>
          {r.concept && (
            <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{r.concept}</span>
          )}
          <OptionBars distribution={r.optionDistribution} correctAnswer={r.correctAnswer} />
        </div>
      ),
    },
    { key: "responses", header: "Responses", align: "center" },
    { key: "correct", header: "Correct", align: "center" },
    { key: "incorrect", header: "Incorrect", align: "center" },
    { key: "skipped", header: "Skipped", align: "center" },
    { key: "correctRate", header: "Correct %", align: "center", render: (r) => pct(r.correctRate) },
    { key: "skipRate", header: "Skip %", align: "center", render: (r) => pct(r.skipRate) },
    { key: "hintsUsed", header: "Hints", align: "center" },
    {
      key: "averageSeconds",
      header: "Avg time",
      align: "center",
      render: (r) => formatSeconds(r.averageSeconds),
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* QUIZ-LEVEL */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Quiz analytics
          </h2>
          {isQualifying && (
            <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-400">
              Qualifying
            </span>
          )}
          {isQualifying && qualifying?.target?.title && (
            <span className="truncate text-[11px] text-muted-foreground">
              skips {qualifying.target.kind === "TOPIC" ? "topic" : "lesson"}: {qualifying.target.title}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
          <MetricCard
            label="Attempts"
            value={summary.totalAttempts}
            detail={`${summary.uniqueStudents} student${summary.uniqueStudents === 1 ? "" : "s"}`}
          />
          <MetricCard
            label="Average"
            value={pct(summary.averageScore)}
            detail={`High ${summary.highestScore}% · Low ${summary.lowestScore}%`}
          />
          <MetricCard
            label="Pass rate"
            value={pct(summary.passRate)}
            detail={`${summary.passCount} pass · ${summary.failCount} fail`}
          />
          <MetricCard
            label="Avg time"
            value={formatSeconds(summary.averageCompletionSeconds)}
            icon={Timer}
          />
          <MetricCard
            label="Questions"
            value={summary.totalQuestions}
            detail={`${summary.averageAttemptedQuestions} attempted avg`}
            icon={Target}
          />
          <MetricCard
            label="Hints used"
            value={summary.totalHintsUsed}
            detail={`${summary.averageSkippedQuestions} skipped avg`}
            icon={Lightbulb}
          />
        </div>

        {isQualifying && qualifying && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            <MetricCard label="Students tried" value={qualifying.studentsAttempted} />
            <MetricCard label="Qualified" value={qualifying.qualifiedStudents} />
            <MetricCard label="Qualification rate" value={pct(qualifying.qualificationRate)} />
            <MetricCard
              label="Attempts to qualify"
              value={qualifying.averageAttemptsToQualify ?? "—"}
              detail="average, of those who did"
            />
          </div>
        )}
      </section>

      {/* DIFFICULT QUESTIONS — the underlying signals, not a blended score, so
          an instructor can see WHY a question is hard. */}
      {difficultQuestions.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-widest text-muted-foreground">
            <AlertTriangle size={13} className="shrink-0 text-amber-500" aria-hidden />
            Questions students struggle with
          </h3>
          <ul className="space-y-1.5">
            {difficultQuestions.slice(0, 5).map((q) => (
              <li
                key={q.questionId}
                className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="min-w-0 truncate text-xs text-foreground" title={q.question}>
                  {q.order ? `${q.order}. ` : ""}
                  {q.question}
                </span>
                <span className="flex shrink-0 flex-wrap items-center gap-2 text-[10px] tabular-nums">
                  <span className="text-emerald-600 dark:text-emerald-400">{q.correctRate}% correct</span>
                  {q.skipRate > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                      <SkipForward size={10} aria-hidden />
                      {q.skipRate}% skipped
                    </span>
                  )}
                  {q.hintsUsed > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                      <Lightbulb size={10} aria-hidden />
                      {q.hintsUsed}
                    </span>
                  )}
                  {q.averageSeconds !== null && (
                    <span className="text-muted-foreground">{formatSeconds(q.averageSeconds)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* WEAK AREAS */}
      {weakAreas.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Weakest concepts
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {weakAreas.slice(0, 8).map((area) => (
              <li
                key={area.concept}
                className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-[11px] text-foreground"
              >
                <span className="font-medium">{area.concept}</span>
                <span className="tabular-nums text-muted-foreground">{area.correctRate}% correct</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* QUESTION-LEVEL TABLE — DataTable already handles the responsive
          behaviour used everywhere else on this page. */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Question performance
          </h3>
          <button
            type="button"
            onClick={() => exportQuizAnalyticsCsv(analytics)}
            disabled={questions.length === 0}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-transparent px-3 text-[10.5px] font-bold text-foreground transition hover:bg-muted disabled:opacity-40 sm:min-h-0 sm:py-2"
          >
            <Download size={12} aria-hidden /> Export questions CSV
          </button>
        </div>
        <DataTable
          columns={questionColumns}
          rows={questions}
          rowKey="questionId"
          emptyLabel="No question-level data yet — nobody has attempted this quiz."
        />
      </section>
    </div>
  );
}
