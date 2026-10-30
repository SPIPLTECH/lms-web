import Link from "next/link";
import { ArrowRight, ChevronRight, FileText, ListChecks, Quote, RotateCcw } from "lucide-react";

import SubmissionStatusBadge from "@/components/student/submissions/SubmissionStatusBadge";
import { SUBMISSION_STATUS_LABELS, formatDate, formatTime } from "@/features/student/constants/submissionsConfig";

const TYPE_META = {
  quiz: {
    label: "Quiz",
    icon: ListChecks,
    chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    text: "text-violet-600 dark:text-violet-400",
  },
  assignment: {
    label: "Assignment",
    icon: FileText,
    chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    text: "text-sky-600 dark:text-sky-400",
  },
};

const PASS_TEXT = "text-emerald-600 dark:text-emerald-400";
const FAIL_TEXT = "text-red-600 dark:text-red-400";

// Both actions navigate, so they're links: tinted with an arrow/icon rather
// than styled like the page's buttons (the tabs and "Clear filters").
const LINK_BASE =
  "inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Fact({ label, value, detail, valueClassName = "text-foreground" }) {
  return (
    // Fixed width from tablet up so each column lines up from row to row.
    <div className="min-w-0 md:w-[6.75rem]">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 text-[13px] font-semibold leading-snug tabular-nums md:truncate md:text-sm ${valueClassName}`}>
        {value}
      </dd>
      {detail && <dd className="text-xs leading-snug tabular-nums text-muted-foreground md:truncate">{detail}</dd>}
    </div>
  );
}

function quizFacts(r) {
  return [
    {
      label: "Score",
      value: r.score ? `${r.score.value}/${r.score.max}` : "—",
      detail: r.score ? `${r.percentage}%` : "Not graded",
      valueClassName: r.status === "passed" ? PASS_TEXT : r.status === "failed" ? FAIL_TEXT : undefined,
    },
    {
      label: "Attempts",
      value: r.unlimitedAttempts ? `${r.attemptsUsed}` : `${r.attemptsUsed} / ${r.maxAttempts}`,
      detail: r.unlimitedAttempts
        ? "No limit"
        : r.canRetake
          ? `${r.maxAttempts - r.attemptsUsed} left`
          : "None left",
    },
    { label: "Submitted", value: formatDate(r.submittedAt), detail: formatTime(r.submittedAt) },
  ];
}

function assignmentFacts(r) {
  const graded = r.status === "graded";
  return [
    {
      label: "Grade",
      value: graded ? r.grade?.text || "Graded" : "—",
      detail: graded
        ? r.grade?.percentage != null
          ? `${r.grade.percentage}%`
          : null
        : r.status === "pending"
          ? "Awaiting grade"
          : null,
      valueClassName: graded ? PASS_TEXT : undefined,
    },
    {
      label: "Due",
      value: r.dueDate ? formatDate(r.dueDate) : "No due date",
      detail: r.dueDate ? formatTime(r.dueDate) : null,
      valueClassName: r.status === "overdue" ? FAIL_TEXT : undefined,
    },
    {
      label: "Submitted",
      value: r.submittedAt ? formatDate(r.submittedAt) : "Not yet",
      detail: formatTime(r.submittedAt),
    },
  ];
}

const QUIZ_TYPE_SHORT = { self: "Self-test", final: "Final", qualifying: "Qualifying" };

const RING = {
  passed: "border-emerald-500 text-emerald-600 dark:text-emerald-400",
  graded: "border-emerald-500 text-emerald-600 dark:text-emerald-400",
  failed: "border-red-500 text-red-600 dark:text-red-400",
  pending: "border-dashed border-warning text-warning",
};

const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString([], { day: "numeric", month: "short" }) : null;

function attemptsText(r) {
  if (r.unlimitedAttempts) return `${r.attemptsUsed} ${r.attemptsUsed === 1 ? "attempt" : "attempts"}`;
  return `${r.attemptsUsed} of ${r.maxAttempts} attempts`;
}

/**
 * The phone row (below md): score ring · title · one meta line · Retake.
 * The title is the link to the result/submission and covers the row; Retake
 * sits above that overlay. Status is in the ring's colour and, for screen
 * readers, in text. A Self-Test has no result page (record.href is null): its
 * row shows the score only — plain title, no overlay link, no chevron.
 */
function CompactItem({ record, showRetake }) {
  const isQuiz = record.type === "quiz";
  const gradeText = record.grade?.text;
  const ringText = isQuiz
    ? record.score
      ? `${record.score.value}/${record.score.max}`
      : "—"
    : gradeText && gradeText.length <= 5
      ? gradeText
      : null;
  const meta = isQuiz
    ? [QUIZ_TYPE_SHORT[record.quizType], attemptsText(record), shortDate(record.submittedAt)]
    : [
        record.status === "pending" ? "Pending review" : record.status === "graded" ? "Graded" : null,
        record.submittedAt ? `Submitted ${shortDate(record.submittedAt)}` : null,
      ];

  return (
    <article
      className={`relative flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors md:hidden ${
        record.href ? "hover:border-primary/40" : ""
      }`}
    >
      <span
        aria-hidden
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] text-[11px] font-bold tabular-nums ${
          RING[record.status] || "border-border text-muted-foreground"
        }`}
      >
        {ringText ?? (isQuiz ? <ListChecks size={16} /> : <FileText size={16} />)}
      </span>

      <div className="min-w-0 flex-1">
        {/* truncate sits on the link: globals.css gives headings an
            unlayered text-wrap: balance that a utility on the h3 can't beat. */}
        <h3 className="text-sm font-semibold text-foreground">
          {record.href ? (
            <Link
              href={record.href}
              className="block truncate after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {record.title}
              <span className="sr-only">
                {" "}
                — {SUBMISSION_STATUS_LABELS[record.status] || record.status}
                {record.score ? `, ${record.score.value} out of ${record.score.max}` : ""}. {record.actionLabel}
              </span>
            </Link>
          ) : (
            <span className="block truncate">
              {record.title}
              <span className="sr-only">
                {record.score ? ` — ${record.score.value} out of ${record.score.max}` : ""}
              </span>
            </span>
          )}
        </h3>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs text-muted-foreground">{meta.filter(Boolean).join(" · ")}</p>
          {showRetake && (
            <Link
              href={record.retakeHref}
              aria-label={`Retake ${record.title}`}
              className="relative z-10 -my-2 inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <RotateCcw size={13} aria-hidden />
              Retake
            </Link>
          )}
        </div>
      </div>

      {record.href && <ChevronRight size={16} aria-hidden className="shrink-0 text-muted-foreground" />}
    </article>
  );
}

/**
 * One assignment or quiz on the student Submissions page, laid out in
 * priority order: title → type → status → score → attempts/due → date →
 * action. A single row on wide screens; identity above facts on tablets;
 * fully stacked on phones. The whole card opens the primary action — the
 * Retake link sits above that overlay so it stays separately tappable.
 */
export default function SubmissionListItem({ record }) {
  const meta = TYPE_META[record.type];
  const Icon = meta.icon;
  const facts = record.type === "quiz" ? quizFacts(record) : assignmentFacts(record);
  const showRetake = record.type === "quiz" && record.canRetake;

  return (
    <>
    <CompactItem record={record} showRetake={showRetake} />
    <article className="relative rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 sm:p-5 max-md:hidden">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-6">
        {/* Identity */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.chip}`}>
            <Icon size={18} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 break-words text-[15px] font-semibold leading-snug text-foreground line-clamp-2">
                {record.title}
              </h3>
              <SubmissionStatusBadge status={record.status} className="shrink-0 xl:hidden" />
            </div>

            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
              <span className={`font-semibold ${meta.text}`}>{meta.label}</span>
              {[record.courseTitle, record.moduleTitle].filter(Boolean).map((part, i) => (
                <span key={`${i}-${part}`} className="flex min-w-0 items-center gap-1.5">
                  <span aria-hidden>·</span>
                  <span className="truncate">{part}</span>
                </span>
              ))}
            </p>

            {record.feedback && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Quote size={12} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden />
                <span className="min-w-0 break-words line-clamp-1">{record.feedback}</span>
              </p>
            )}
          </div>
        </div>

        {/* Status gets its own column once everything fits on one line. */}
        <div className="hidden w-[8.5rem] shrink-0 xl:block">
          <SubmissionStatusBadge status={record.status} />
        </div>

        {/* Facts + actions */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between xl:shrink-0 xl:gap-6">
          <dl className="grid grid-cols-3 gap-3 rounded-xl bg-muted/50 px-3 py-2.5 md:flex md:gap-4 md:bg-transparent md:p-0">
            {facts.map((fact) => (
              <Fact key={fact.label} {...fact} />
            ))}
          </dl>

          <div
            className={`grid gap-2 md:flex md:w-[14.5rem] md:shrink-0 md:justify-end ${
              showRetake ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {showRetake && (
              <Link
                href={record.retakeHref}
                className={`${LINK_BASE} relative z-10 bg-muted text-foreground hover:bg-muted/70`}
                aria-label={`Retake ${record.title}`}
              >
                <RotateCcw size={15} aria-hidden />
                Retake
              </Link>
            )}
            <Link
              href={record.href}
              className={`${LINK_BASE} bg-primary/10 text-primary hover:bg-primary/15 after:absolute after:inset-0 after:rounded-2xl`}
              aria-label={`${record.actionLabel}: ${record.title}`}
            >
              {record.actionLabel}
              <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </article>
    </>
  );
}
