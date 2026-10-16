"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Loader2, Paperclip, Upload, X } from "lucide-react";

import { uploadAssignmentSubmissionFile } from "@/services/assignment.service";
import useSubmitAssignment from "@/hooks/queries/student/useSubmitAssignment";
import { useToast } from "@/components/ui/ToastProvider";
import Button from "@/components/ui/Button";
import { getDisplayUrl } from "@/lib/blob";

/**
 * The student's view of one Assignment: the instructor's brief, the
 * instructor's reference material, and the student's submission.
 *
 * A submission is a PDF upload, a typed/pasted written answer, or both —
 * each is optional, but at least one is required.
 * Completion is never asserted here: the item is complete when the backend
 * says so, which happens after POST /assignments/:id/submit records the
 * submission and the existing roll-up recomputes. `completed` is passed in
 * from the backend Progress index by the workspace; this component computes
 * no percentage and increments no counter.
 */

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isPdf = (file) =>
  file?.type === "application/pdf" && /\.pdf$/i.test(file?.name || "");

export default function AssignmentSubmissionPanel({
  assignment,
  completed = false,
  // Lets a lesson-composer Assignment block (a Content row) submit through
  // its own endpoint while reusing this panel; defaults to /assignments/:id.
  submitMutation: submitMutationOverride,
  showTitle = true,
  // An Assignment has its own status page at /student/assignments/:id; the
  // caller opts into linking to it (the learning player does not).
  showStatusLink = false,
  // Lets the player's own "Next Content" action surface right here once
  // submitted, instead of the student needing to leave and use the
  // floating Prev/Next controls (which AssignmentWorkspacePanel's caller
  // handles separately). Omitted entirely when the caller has no next step.
  onNextContent,
  // Fires after a successful submit/resubmit — lets the assignment detail
  // page leave "resubmitting" mode and return to the read-only result view
  // once the fresh submission has actually been recorded, rather than
  // guessing from a fixed delay.
  onSubmitted,
}) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  // Seeded with the saved answer so a resubmission can edit rather than retype.
  const [textAnswer, setTextAnswer] = useState(assignment?.submission?.textAnswer || "");
  const { showToast } = useToast();

  const assignmentSubmitMutation = useSubmitAssignment(assignment?.id);
  const submitMutation = submitMutationOverride || assignmentSubmitMutation;

  const submission = assignment?.submission || null;
  const hasSubmitted =
    Boolean(submission) || ["Submitted", "Graded"].includes(assignment?.status);
  // Assignment rows carry grade/feedback at the top level; content submissions on `submission`.
  const grade = submission?.grade || assignment?.grade || null;
  const feedback = submission?.feedback || assignment?.feedback || null;
  // Instructor-provided reference material — never the student's own answer.
  const attachments = Array.isArray(assignment?.attachments) ? assignment.attachments : [];

  const isBusy = isUploading || submitMutation.isPending;
  const trimmedText = textAnswer.trim();
  const canSubmit = Boolean(selectedFile) || trimmedText.length > 0;

  const pickFile = (file) => {
    if (!file) return;
    if (!isPdf(file)) {
      showToast("Only PDF files can be submitted. Please choose a .pdf file.", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    // Guard rather than trust the disabled attribute — nothing may be recorded
    // without a PDF or a written answer, and no second request may start
    // while one is running.
    if (isBusy || !canSubmit) return;
    if (selectedFile && !isPdf(selectedFile)) return;

    let uploaded = null;
    if (selectedFile) {
      setIsUploading(true);
      try {
        // Upload first. Only a stored file yields a fileUrl, so a failed
        // upload can never record (or complete) a submission.
        uploaded = await uploadAssignmentSubmissionFile(selectedFile);
      } catch (error) {
        setIsUploading(false);
        showToast(error?.message || "Could not upload your PDF. Please try again.", "error");
        return;
      }
      setIsUploading(false);
    }

    const payload = {
      ...(uploaded || {}),
      ...(trimmedText ? { textAnswer: trimmedText } : {}),
    };

    submitMutation.mutate(payload, {
      onSuccess: () => {
        clearFile();
        showToast("Assignment submitted.", "success");
        onSubmitted?.();
      },
      onError: (error) => {
        showToast(
          error?.response?.data?.message || "Submission failed. Your work was not recorded.",
          "error"
        );
      },
    });
  };

  return (
    <div className="max-w-3xl w-full mx-auto rounded-2xl border border-border bg-card">
      {/* ---- ASSIGNMENT BRIEF ---- */}
      <section className="p-4 sm:p-6 space-y-3">
        {showTitle && (
          <>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Assignment
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-foreground text-balance">
              {assignment?.title || "Assignment"}
            </h2>
          </>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-muted-foreground">
          {assignment?.dueDate && (
            <span>Due {new Date(assignment.dueDate).toLocaleString()}</span>
          )}
          {Number.isFinite(assignment?.marks) && <span>{assignment.marks} marks</span>}
        </div>

        <div className="pt-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Assignment Instructions
          </p>
          {assignment?.description ? (
            // The instructor's brief in full — never truncated.
            <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
              {assignment.description}
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              No instructions were provided for this assignment.
            </p>
          )}
        </div>
      </section>

      {/* ---- INSTRUCTOR REFERENCE MATERIAL ---- */}
      {attachments.length > 0 && (
        <section className="border-t border-border p-4 sm:p-6 space-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Reference Material
            </p>
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
              Provided by your instructor. This is not your submission.
            </p>
          </div>
          <div className="space-y-2">
            {attachments.map((file, i) => (
              <div
                key={file.url || `${file.name}-${i}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Paperclip size={14} className="shrink-0 text-muted-foreground" />
                  <span className="truncate text-xs font-semibold text-foreground">
                    {file.name || "Attachment"}
                  </span>
                </span>
                <a
                  href={getDisplayUrl(file.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 self-start sm:self-auto min-h-[36px] inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold text-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  View Attachment
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- YOUR SUBMISSION ---- */}
      <section className="border-t border-border p-4 sm:p-6 space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Your Submission
          </p>
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
            Upload your answer as a PDF, write it below, or both. At least one is required.
          </p>
        </div>

        {/* What was already turned in, so the student can see their own work. */}
        {hasSubmitted && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
            <p className="flex items-center gap-2 text-xs font-bold text-emerald-500">
              <CheckCircle2 size={15} className="shrink-0" />
              {completed ? "Submitted · Completed" : "Submitted"}
            </p>
            {submission?.fileName && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="shrink-0 text-emerald-500" />
                  <span className="truncate text-xs font-semibold text-foreground">
                    {submission.fileName}
                  </span>
                  {formatBytes(submission.fileSize) && (
                    <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
                      {formatBytes(submission.fileSize)}
                    </span>
                  )}
                </span>
                {submission.fileUrl && (
                  <a
                      // Private Blob URLs 403 unless routed through /api/blob-proxy.
                    href={getDisplayUrl(submission.fileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 self-start sm:self-auto min-h-[36px] inline-flex items-center rounded-lg border border-emerald-500/40 px-3 py-1.5 text-[11px] font-bold text-emerald-500 transition hover:bg-emerald-500/15"
                  >
                    View PDF
                  </a>
                )}
              </div>
            )}
            {submission?.textAnswer && (
              <div className="rounded-lg border border-emerald-500/20 bg-background/40 px-3 py-2 max-h-40 overflow-y-auto">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                  Written Answer
                </p>
                <p className="text-xs text-foreground whitespace-pre-wrap break-words">
                  {submission.textAnswer}
                </p>
              </div>
            )}
            {submission?.submittedAt && (
              <p className="text-[10px] font-semibold text-muted-foreground">
                Submitted {new Date(submission.submittedAt).toLocaleString()}
              </p>
            )}

            {(showStatusLink || onNextContent) && (
              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                {showStatusLink && (
                  <Link href={`/student/assignments/${assignment.id}`} className="flex-1">
                    <Button type="button" variant="outline" className="w-full">
                      View Assignment Status
                    </Button>
                  </Link>
                )}

                {onNextContent && (
                  <Button
                    type="button"
                    onClick={onNextContent}
                    className="flex flex-1 items-center justify-center gap-2"
                  >
                    Next Content
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {grade && (
              <div className="border-t border-emerald-500/20 pt-2 space-y-1">
                <p className="text-xs font-bold text-foreground">
                  Grade: <span className="text-emerald-500">{grade}</span>
                </p>
                {feedback && (
                  <p className="text-[11px] font-semibold text-muted-foreground whitespace-pre-wrap break-words">
                    {feedback}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Option 1 — upload a PDF (optional). */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />

        {selectedFile ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5">
            <span className="flex items-center gap-2 min-w-0">
              <FileText size={14} className="shrink-0 text-primary" />
              <span className="truncate text-xs font-semibold text-foreground">
                {selectedFile.name}
              </span>
              {formatBytes(selectedFile.size) && (
                <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
                  {formatBytes(selectedFile.size)}
                </span>
              )}
            </span>
            <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="min-h-[36px] rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold text-foreground transition cursor-pointer hover:border-primary/40 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={clearFile}
                disabled={isBusy}
                aria-label="Remove selected file"
                className="min-h-[36px] w-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground transition cursor-pointer hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            className="w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-background/40 px-4 py-7 sm:py-9 text-center transition cursor-pointer hover:border-primary/50 hover:bg-background/60 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <Upload size={20} className="shrink-0 text-muted-foreground transition group-hover:text-primary" />
            <span className="text-xs font-bold text-foreground transition group-hover:text-primary">
              {hasSubmitted ? "Upload a New Assignment PDF" : "Upload Assignment PDF"}
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">
              Choose your completed PDF
            </span>
          </button>
        )}

        <p className="text-[10px] font-semibold text-muted-foreground">
          PDF only, up to 20MB.
        </p>

        {/* Option 2 — a typed or pasted written answer (optional). */}
        <div className="space-y-1.5">
          <label
            htmlFor={`text-answer-${assignment?.id}`}
            className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground"
          >
            Written Answer
          </label>
          <textarea
            id={`text-answer-${assignment?.id}`}
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            disabled={isBusy}
            maxLength={20000}
            rows={6}
            placeholder="Type or paste your answer here"
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground leading-relaxed outline-none transition focus:border-primary resize-y disabled:opacity-50"
          />
          <p className="text-right text-[10px] font-mono text-muted-foreground">
            {textAnswer.length.toLocaleString()} / 20,000
          </p>
        </div>

        {hasSubmitted && (
          <p className="text-[10px] font-semibold text-muted-foreground">
            Submitting again replaces your previous submission — PDF and written answer.
          </p>
        )}

        <div className="flex sm:justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isBusy || !canSubmit}
          aria-busy={isBusy}
          className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 transition cursor-pointer shadow-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <Loader2 size={14} className="animate-spin shrink-0" />
              Uploading
            </>
          ) : submitMutation.isPending ? (
            <>
              <Loader2 size={14} className="animate-spin shrink-0" />
              Submitting
            </>
          ) : (
            "Submit Assignment"
          )}
        </button>
        </div>
      </section>
    </div>
  );
}
