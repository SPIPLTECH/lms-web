"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Download, FileText, Loader2, MinusCircle } from "lucide-react";

import { getDisplayUrl } from "@/lib/blob";
import DataTable from "@/components/ui/DataTable";
import { useToast } from "@/components/ui/ToastProvider";
import {
  useAssignmentSubmissions,
  useContentSubmissions,
  useGradeSubmission,
} from "@/hooks/queries/instructor/useAssignments";

/**
 * The students who have submitted one assignment, as a table: who they are,
 * whether their work has been reviewed, and the file they actually uploaded.
 *
 * "Reviewed" is not a stored flag — an instructor reviews a submission BY
 * grading it, so a saved grade is exactly what the tick means.
 *
 * `fileUrl` here is the STUDENT's work. It is deliberately never mixed with
 * Assignment.attachments, which is the instructor's own reference material —
 * they are two different files with two different roles.
 */

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "2 days ago" — yields nothing rather than throwing on an unparseable date. */
function timeAgo(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true });
}

/** Grade + feedback for one submission, seeded from what is already saved. */
function GradeForm({ submission, onSave, isPending }) {
  const [grade, setGrade] = useState(submission.grade || "");
  const [feedback, setFeedback] = useState(submission.feedback || "");

  const trimmedGrade = grade.trim();
  const unchanged =
    trimmedGrade === (submission.grade || "") && feedback.trim() === (submission.feedback || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!trimmedGrade || unchanged || isPending) return;
    onSave({ grade: trimmedGrade, feedback: feedback.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <label htmlFor={`grade-${submission.id}`} className="sr-only">
        Grade
      </label>
      <input
        id={`grade-${submission.id}`}
        type="text"
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
        maxLength={20}
        placeholder="Grade (e.g. A, 8/10)"
        className="sm:w-40 min-h-[36px] rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
      />
      <label htmlFor={`feedback-${submission.id}`} className="sr-only">
        Feedback
      </label>
      <textarea
        id={`feedback-${submission.id}`}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        maxLength={2000}
        rows={1}
        placeholder="Feedback for the student (optional)"
        className="flex-1 min-h-[36px] rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary resize-y"
      />
      <button
        type="submit"
        disabled={!trimmedGrade || unchanged || isPending}
        aria-busy={isPending}
        className="min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-950 transition cursor-pointer hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <Loader2 size={12} className="animate-spin shrink-0" />
            Saving
          </>
        ) : submission.grade ? (
          "Update Grade"
        ) : (
          "Save Grade"
        )}
      </button>
    </form>
  );
}

const COLUMNS = [
  {
    key: "studentName",
    header: "Student Name",
    render: (s) => (
      <div className="min-w-0">
        <p className="truncate font-bold text-foreground">{s.studentName}</p>
        {s.studentEmail && (
          <p className="truncate text-[10px] font-semibold text-muted-foreground">{s.studentEmail}</p>
        )}
      </div>
    ),
  },
  {
    key: "reviewed",
    header: "Reviewed",
    align: "center",
    render: (s) =>
      s.grade ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-black text-emerald-500">
          <CheckCircle2 size={13} />
          {s.grade}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
          <MinusCircle size={13} />
          No
        </span>
      ),
  },
  {
    key: "docUrl",
    header: "DocUrl",
    render: (s) =>
      s.fileUrl ? (
        <div className="flex min-w-0 items-center gap-2">
          <FileText size={12} className="shrink-0 text-primary" />
          <a
            href={getDisplayUrl(s.fileUrl)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="truncate font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            {s.fileName || "View file"}
          </a>
          {formatBytes(s.fileSize) && (
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {formatBytes(s.fileSize)}
            </span>
          )}
          <a
            href={getDisplayUrl(s.fileUrl)}
            download={s.fileName || true}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Download"
            className="shrink-0 text-muted-foreground transition hover:text-primary"
          >
            <Download size={12} />
          </a>
        </div>
      ) : s.textAnswer ? (
        <span className="text-[10px] font-semibold italic text-muted-foreground">Written answer</span>
      ) : (
        <span className="text-[10px] font-semibold italic text-muted-foreground">No file</span>
      ),
  },
  {
    key: "submittedAt",
    header: "Submitted",
    align: "right",
    render: (s) => (
      <span className="whitespace-nowrap text-muted-foreground">{timeAgo(s.submittedAt) || "—"}</span>
    ),
  },
];

export default function AssignmentSubmissionsPanel({ assignmentId, contentId, open = true }) {
  // Pass `contentId` instead of `assignmentId` for a lesson-composer
  // Assignment block (a Content row); its submissions live behind /contents.
  const assignmentQuery = useAssignmentSubmissions(assignmentId, open);
  const contentQuery = useContentSubmissions(contentId, open);
  const { data, isLoading, isError } = contentId ? contentQuery : assignmentQuery;

  const gradeMutation = useGradeSubmission({ assignmentId, contentId });
  const [savingId, setSavingId] = useState(null);
  // Which student's grade form is showing. Kept below the table so a row stays
  // one line however long the feedback is.
  const [gradingId, setGradingId] = useState(null);
  const { showToast } = useToast();

  const saveGrade = (submissionId, payload) => {
    setSavingId(submissionId);
    gradeMutation.mutate(
      { submissionId, ...payload },
      {
        onSuccess: () => {
          showToast("Grade saved.", "success");
          setGradingId(null);
        },
        onError: (error) =>
          showToast(error?.response?.data?.message || "Could not save the grade. Please try again.", "error"),
        onSettled: () => setSavingId(null),
      }
    );
  };

  if (!open) return null;

  if (isError) {
    return (
      <p role="alert" className="px-1 py-3 text-[11px] font-semibold text-red-400">
        Could not load submissions for this assignment.
      </p>
    );
  }

  const submissions = data?.submissions || [];
  const grading = submissions.find((s) => s.id === gradingId) || null;

  return (
    <div className="space-y-3">
      <DataTable
        columns={COLUMNS}
        rows={submissions}
        rowKey="id"
        isLoading={isLoading}
        skeletonRows={3}
        onRowClick={(s) => setGradingId((prev) => (prev === s.id ? null : s.id))}
        emptyLabel="No students have submitted this assignment yet."
      />

      {grading && (
        <div className="space-y-2 rounded-xl border border-border bg-background/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Review {grading.studentName}
          </p>

          {grading.textAnswer && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background px-3 py-2">
              <p className="whitespace-pre-wrap break-words text-xs text-foreground">
                {grading.textAnswer}
              </p>
            </div>
          )}

          {/* Keyed on the saved values so the form re-seeds after a save lands. */}
          <GradeForm
            key={`${grading.id}-${grading.grade ?? ""}-${grading.feedback ?? ""}`}
            submission={grading}
            isPending={savingId === grading.id}
            onSave={(payload) => saveGrade(grading.id, payload)}
          />
        </div>
      )}

      {submissions.length > 0 && !grading && (
        <p className="text-[10px] font-semibold text-muted-foreground">
          Select a student to grade their submission.
        </p>
      )}
    </div>
  );
}
