"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, ClipboardCheck, Download, FileText, Quote, X } from "lucide-react";

import Loader from "@/components/common/Loader";
import PageHeader from "@/components/layouts/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import useAssignment from "@/hooks/queries/student/useAssignment";
import useTrackCourseAccess from "@/hooks/queries/student/useTrackCourseAccess";
import AssignmentSubmissionPanel from "@/components/student/assignments/AssignmentSubmissionPanel";
import SubmissionStatusBadge from "@/components/student/submissions/SubmissionStatusBadge";
import { assignmentRecord, formatDate, formatTime } from "@/features/student/constants/submissionsConfig";
import { getDisplayUrl } from "@/lib/blob";

const SUBMISSIONS_HREF = "/student/assignments";

/** A read-only fact about the submission — tinted, not bordered. Matches the quiz result page's StatTile. */
function StatTile({ icon: Icon, label, value, detail }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/50 p-3.5 sm:p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon size={13} className="shrink-0 text-primary" aria-hidden />
        {label}
      </p>
      <p className="mt-1.5 text-base font-semibold leading-snug text-foreground sm:text-lg">{value}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

export default function AssignmentDetailPage({ params }) {
  const { assignmentId } = use(params);

  const {
    data: assignment,
    isLoading,
    isError,
  } = useAssignment(assignmentId);

  // Reopens the submission form over an already-graded/submitted assignment —
  // mirrors the quiz result page's "Retake Quiz", just gated behind an
  // explicit action instead of a fresh attempt link, since resubmitting
  // replaces the same submission rather than starting a new one.
  const [isResubmitting, setIsResubmitting] = useState(false);

  // Hooks must run on every render, so these sit above the loading/error
  // early returns (after them, the loaded render called more hooks than the
  // loading one and React threw).
  const trackAccessMutation = useTrackCourseAccess();
  const parentCourseId = assignment?.courseId || assignment?.course?.id;

  useEffect(() => {
    if (parentCourseId) {
      trackAccessMutation.mutate(parentCourseId);
    }
  }, [parentCourseId]);

  if (isLoading) {
    return <Loader />;
  }

  if (isError || !assignment) {
    return (
      <Card tone="flat" className="p-8 text-center">
        <h2 className="text-xl font-bold text-foreground">
          Assignment not found
        </h2>
        <p className="mt-2 text-muted-foreground">
          The requested assignment could not be loaded.
        </p>
      </Card>
    );
  }

  // Same status/grade derivation the Submissions list uses, so the grade
  // shown here always matches what "View Submission" promised.
  const record = assignmentRecord(assignment);
  const submission = assignment.submission || null;
  const showResultView = record.submitted && !isResubmitting;

  // ---- Not yet submitted, or actively resubmitting: the brief + upload form ----
  if (!showResultView) {
    return (
      <div className="space-y-8">
        {isResubmitting ? (
          <div className="flex items-center justify-between gap-3">
            <PageHeader
              title={assignment.title}
              subtitle="Resubmitting will replace your previous submission."
            />
            <button
              type="button"
              onClick={() => setIsResubmitting(false)}
              className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
            >
              <X size={15} aria-hidden />
              Cancel
            </button>
          </div>
        ) : (
          <PageHeader
            title={assignment.title}
            subtitle={assignment.course?.title || assignment.courseTitle || "Assignment details"}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Brief, instructor reference material and the single PDF submission
              control — the same component the learning workspace renders, so
              both entry points behave identically. */}
          <div className="space-y-6">
            <AssignmentSubmissionPanel
              assignment={assignment}
              completed={record.submitted}
              onSubmitted={() => setIsResubmitting(false)}
            />
          </div>

          <div className="space-y-6">
            <Card tone="flat">
              <h3 className="text-lg font-semibold text-foreground">Assignment Summary</h3>
              <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-2xl bg-background p-4">
                  <span>Course</span>
                  <span className="text-foreground">{assignment.course?.title || assignment.courseTitle || "—"}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-background p-4">
                  <span>Due Date</span>
                  <span className="text-foreground">
                    {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : "—"}
                  </span>
                </div>
              </div>
            </Card>

            <Card tone="flat">
              <h3 className="text-lg font-semibold text-foreground">Need Help?</h3>
              <p className="mt-4 text-sm text-muted-foreground">
                Contact your instructor if you have questions about the assignment requirements or submission format.
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ---- Already submitted: a read-only result view, same spirit as the quiz result page ----
  const graded = record.status === "graded";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-12 sm:space-y-8">
      <Link
        href={SUBMISSIONS_HREF}
        className="-ml-2 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft size={16} aria-hidden />
        Back to Submissions
      </Link>

      {/* Result overview — grade takes the same prominence the quiz result page gives its score. */}
      <section
        aria-labelledby="result-title"
        className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Assignment{assignment.course?.title || assignment.courseTitle ? ` · ${assignment.course?.title || assignment.courseTitle}` : ""}
            </p>
            <h1
              id="result-title"
              className="mt-1.5 break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              {assignment.title}
            </h1>
            {record.moduleTitle && <p className="mt-1 text-sm text-muted-foreground">{record.moduleTitle}</p>}
          </div>

          <div className="flex shrink-0 items-center gap-5 md:flex-col md:items-end md:gap-2 md:text-right">
            <p
              className={`text-4xl font-bold leading-none tracking-tight ${
                graded ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              }`}
            >
              {graded ? record.grade?.text || "Graded" : "—"}
            </p>
            <div className="space-y-1.5 md:flex md:flex-col md:items-end">
              {graded && record.grade?.percentage != null && (
                <p className="text-sm font-semibold text-foreground">{record.grade.percentage}%</p>
              )}
              <SubmissionStatusBadge status={record.status} />
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Submission details" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          icon={CalendarClock}
          label="Submitted"
          value={formatDate(record.submittedAt)}
          detail={formatTime(record.submittedAt)}
        />
        <StatTile
          icon={CalendarClock}
          label="Due Date"
          value={assignment.dueDate ? formatDate(assignment.dueDate) : "No due date"}
          detail={assignment.dueDate ? formatTime(assignment.dueDate) : null}
        />
        <StatTile
          icon={ClipboardCheck}
          label="Marks"
          value={Number.isFinite(assignment.marks) ? assignment.marks : "—"}
        />
      </section>

      <Card tone="flat">
        <h3 className="text-lg font-semibold text-foreground">Your Submission</h3>
        <div className="mt-4 space-y-3">
          {submission?.fileName && (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-background/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex min-w-0 items-center gap-2">
                <FileText size={14} className="shrink-0 text-primary" />
                <span className="truncate text-sm font-semibold text-foreground">{submission.fileName}</span>
              </span>
              {submission.fileUrl && (
                <a
                  href={getDisplayUrl(submission.fileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/10 sm:self-auto"
                >
                  <Download size={13} aria-hidden />
                  View PDF
                </a>
              )}
            </div>
          )}
          {submission?.textAnswer && (
            <div className="rounded-xl border border-border bg-background/40 px-3 py-3">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Written Answer
              </p>
              <p className="whitespace-pre-wrap break-words text-sm text-foreground">{submission.textAnswer}</p>
            </div>
          )}
          {!submission?.fileName && !submission?.textAnswer && (
            <p className="text-sm italic text-muted-foreground">No submission details available.</p>
          )}
        </div>
      </Card>

      {record.feedback && (
        <Card tone="flat" className="border-emerald-500/25 bg-emerald-500/5">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Quote size={18} className="text-emerald-500" aria-hidden />
            Instructor Feedback
          </h3>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {record.feedback}
          </p>
        </Card>
      )}

      {/* Once an instructor has graded it, the submission is final — no
          resubmit escape hatch that would let a student quietly swap out
          the work a grade was already given for. */}
      {!graded && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsResubmitting(true)}>
            Resubmit Assignment
          </Button>
        </div>
      )}
    </div>
  );
}
