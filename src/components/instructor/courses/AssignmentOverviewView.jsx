"use client";

import React, { useState } from "react";
import { ClipboardList, CalendarDays, Award, Clock, Tag, Paperclip, Pencil, Trash2, X } from "lucide-react";

import AssessmentForm from "@/components/instructor/AssessmentForm";

const formatDueDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  // UTC, like AssessmentForm's date input: "2026-11-25T23:59Z" is Nov 25 in
  // both places, not Nov 26 for an instructor ahead of UTC.
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

/**
 * One assignment in the Course Composer workspace, the way QuizOverviewView
 * shows a quiz: its brief and details, with an Edit mode that reuses the same
 * AssessmentForm as the /instructor/assignments page. The parent owns saving
 * and deleting (today only for import drafts, which hold assignments locally).
 */
export function AssignmentOverviewView({ assignment, scopeLabel, startEditing = false, onSave, onDelete }) {
  const [isEditing, setIsEditing] = useState(startEditing);

  if (!assignment) {
    return (
      <div className="notebook-cell rounded-2xl border border-border bg-background p-8 text-center text-base text-muted-foreground">
        This assignment is no longer in the course.
      </div>
    );
  }

  const handleSubmit = (payload) => {
    onSave?.(payload);
    setIsEditing(false);
  };

  const details = [
    { label: "Due Date", value: formatDueDate(assignment.dueDate), icon: CalendarDays, tone: "text-rose-600 dark:text-rose-400 bg-rose-500/10" },
    { label: "Marks", value: assignment.marks ?? "—", icon: Award, tone: "text-yellow-700 dark:text-yellow-400 bg-yellow-500/10" },
    { label: "Type", value: assignment.assessmentType || "—", icon: Tag, tone: "text-sky-600 dark:text-sky-400 bg-sky-500/10" },
    { label: "Estimated Time", value: assignment.estimatedTime ? `${assignment.estimatedTime} min` : "—", icon: Clock, tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  ];
  const attachments = Array.isArray(assignment.attachments) ? assignment.attachments : [];

  return (
    <div className="notebook-cell rounded-2xl border border-border bg-background p-5 shadow-md space-y-5">
      {/* Header Bar */}
      <div className="cell-header flex items-center justify-between border-b border-border/80 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded bg-yellow-500/15 px-2.5 py-1 text-[12px] font-black uppercase tracking-wider text-yellow-700 dark:text-yellow-400 flex items-center gap-1.5">
            <ClipboardList size={12} />
            {scopeLabel}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-[12px] font-bold uppercase tracking-wider ${
              assignment.isPublished === false
                ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {assignment.isPublished === false ? "DRAFT" : "PUBLISHED"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-sm font-bold transition cursor-pointer"
            >
              <X size={14} />
              Cancel
            </button>
          ) : (
            <>
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 text-sm font-bold transition cursor-pointer"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
              {onSave && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-sm font-bold transition cursor-pointer"
                >
                  <Pencil size={14} />
                  Edit Assignment
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <AssessmentForm
          mode="edit"
          initialValues={assignment}
          lockedCourseId={assignment.courseId || "draft"}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
        />
      ) : (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">{assignment.title || "Untitled Assignment"}</h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            {details.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="p-3 rounded-xl bg-muted/40 flex items-center gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${tone}`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[12px] uppercase font-mono text-muted-foreground block">{label}</span>
                  <span className="font-bold text-foreground text-base break-words">{value}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-yellow-700 dark:text-yellow-400">Brief</h3>
            <p className="text-base text-foreground leading-relaxed whitespace-pre-line">
              {assignment.description || <span className="text-muted-foreground italic">No description.</span>}
            </p>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-yellow-700 dark:text-yellow-400">Attachments</h3>
              <ul className="flex flex-wrap gap-2">
                {attachments.map((att, idx) => (
                  <li key={att.url || idx}>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-sky-600 dark:text-sky-400 underline underline-offset-2 hover:text-sky-500"
                    >
                      <Paperclip size={12} />
                      {att.name || "Attachment"}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
