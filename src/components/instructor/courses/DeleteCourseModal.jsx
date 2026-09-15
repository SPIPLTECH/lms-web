"use client";

import { X, AlertOctagon, Archive, Trash2, Loader2 } from "lucide-react";

export function DeleteCourseModal({
  isOpen,
  onClose,
  onConfirmDelete,
  onConfirmArchive,
  isDeleting,
  isArchiving,
  courseTitle,
  hasStudentData = false,
  isPublished = false,
  userRole = "INSTRUCTOR"
}) {
  if (!isOpen) return null;

  // Case 1: Course contains student or historical data
  if (hasStudentData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-5 text-foreground">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertOctagon size={18} />
              <h3 className="text-xl font-black text-foreground">Course Cannot Be Deleted</h3>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition p-1 rounded-lg hover:bg-background"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-foreground">
            <p className="font-bold text-foreground text-base">{courseTitle}</p>
            <p>
              This course contains student or historical data (enrollments, quiz submissions, or certificates).
            </p>
            <p className="text-muted-foreground italic">
              Archive the course instead to preserve that historical data while removing it from active workflow.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isArchiving}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold text-foreground hover:bg-muted transition cursor-pointer"
            >
              Cancel
            </button>
            {userRole === "ADMIN" ? (
              <button
                type="button"
                onClick={onConfirmArchive}
                disabled={isArchiving}
                className="rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-foreground font-black text-sm px-5 py-2 transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isArchiving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <Archive size={13} />
                    <span>Archive</span>
                  </>
                )}
              </button>
            ) : (
              <p className="text-[13px] text-amber-400 font-semibold self-center">
                Contact an Administrator to archive this course.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Direct hard delete blocked because published
  if (isPublished && userRole !== "ADMIN") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-5 text-foreground">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-red-400">
              <AlertOctagon size={18} />
              <h3 className="text-xl font-black text-foreground">Cannot Delete Published Course</h3>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition p-1 rounded-lg hover:bg-background"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-foreground">
            <p className="font-bold text-foreground text-base">{courseTitle}</p>
            <p>
              Published courses cannot be directly deleted by instructors. You must unpublish the course first, after which deletion safety rules will be evaluated.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold text-foreground hover:bg-muted transition cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Safe draft deletion confirmation
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-5 text-foreground">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-red-400">
            <Trash2 size={18} />
            <h3 className="text-xl font-black text-foreground">Delete Course?</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition p-1 rounded-lg hover:bg-background"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-sm leading-relaxed text-foreground">
          <p className="font-bold text-foreground text-base">{courseTitle}</p>
          <p className="text-red-400 font-semibold">This action cannot be undone.</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold text-foreground hover:bg-muted transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={isDeleting}
            className="rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-foreground font-black text-sm px-5 py-2 transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
