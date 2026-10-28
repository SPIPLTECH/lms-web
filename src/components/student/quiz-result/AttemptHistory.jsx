import Link from "next/link";
import { ArrowRight } from "lucide-react";

import SubmissionStatusBadge from "@/components/student/submissions/SubmissionStatusBadge";
import { formatDate, formatTime } from "@/features/student/constants/submissionsConfig";

const attemptStatus = (attempt) =>
  Number(attempt.totalMarks) > 0 ? (attempt.passed ? "passed" : "failed") : "submitted";

const VIEW_LINK =
  "inline-flex min-h-[40px] items-center gap-1 rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const LATEST_TAG = <span className="ml-2 text-xs font-medium text-primary">Latest</span>;

/**
 * Every attempt a student has made on one quiz, oldest first: a table from
 * tablet width up, stacked cards on phones. The attempt being viewed is
 * marked rather than linked; every other attempt opens on its own.
 */
export default function AttemptHistory({ attempts = [], currentAttemptId, hrefFor }) {
  if (attempts.length <= 1) return null;

  const latestId = attempts[attempts.length - 1].id;

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-5 py-3 font-semibold">Attempt</th>
              <th scope="col" className="px-3 py-3 font-semibold">Date</th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">Score</th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">Percentage</th>
              <th scope="col" className="px-3 py-3 font-semibold">Status</th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {attempts.map((attempt) => {
              const current = attempt.id === currentAttemptId;
              const graded = Number(attempt.totalMarks) > 0;

              return (
                <tr
                  key={attempt.id}
                  aria-current={current ? "true" : undefined}
                  className={current ? "bg-primary/5" : undefined}
                >
                  <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-foreground">
                    Attempt {attempt.attemptNumber}
                    {attempt.id === latestId && LATEST_TAG}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5">
                    <span className="text-foreground">{formatDate(attempt.submittedAt)}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{formatTime(attempt.submittedAt)}</span>
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums text-foreground">
                    {graded ? `${attempt.score}/${attempt.totalMarks}` : "—"}
                  </td>
                  <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-foreground">
                    {graded ? `${attempt.percentage}%` : "—"}
                  </td>
                  <td className="px-3 py-3.5">
                    <SubmissionStatusBadge status={attemptStatus(attempt)} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {current ? (
                      <span className="text-xs font-semibold text-muted-foreground">Viewing</span>
                    ) : (
                      <Link
                        href={hrefFor(attempt.id)}
                        className={VIEW_LINK}
                        aria-label={`View attempt ${attempt.attemptNumber}`}
                      >
                        View
                        <ArrowRight size={14} aria-hidden />
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2.5 md:hidden">
        {attempts.map((attempt) => {
          const current = attempt.id === currentAttemptId;
          const graded = Number(attempt.totalMarks) > 0;

          return (
            <li
              key={attempt.id}
              aria-current={current ? "true" : undefined}
              className={`rounded-2xl p-4 ${current ? "bg-primary/10" : "bg-muted/50"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-foreground">
                  Attempt {attempt.attemptNumber}
                  {attempt.id === latestId && LATEST_TAG}
                </p>
                <SubmissionStatusBadge status={attemptStatus(attempt)} />
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-2">
                <div className="min-w-0">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Date</dt>
                  <dd className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground">
                    {formatDate(attempt.submittedAt)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Score</dt>
                  <dd className="mt-0.5 text-[13px] font-semibold tabular-nums text-foreground">
                    {graded ? `${attempt.score}/${attempt.totalMarks}` : "—"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Percent</dt>
                  <dd className="mt-0.5 text-[13px] font-semibold tabular-nums text-foreground">
                    {graded ? `${attempt.percentage}%` : "—"}
                  </dd>
                </div>
              </dl>

              {current ? (
                <p className="mt-3 text-xs font-semibold text-primary">You&apos;re viewing this attempt</p>
              ) : (
                <Link href={hrefFor(attempt.id)} className={`${VIEW_LINK} mt-3 min-h-[44px] w-full justify-center`}>
                  View attempt {attempt.attemptNumber}
                  <ArrowRight size={14} aria-hidden />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
