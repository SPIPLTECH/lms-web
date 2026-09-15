"use client";

import { X, AlertTriangle, Loader2 } from "lucide-react";

export function UnpublishModal({
  isOpen,
  onClose,
  onUnpublish,
  isUnpublishing,
  courseTitle
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-5 text-foreground">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle size={18} />
            <h3 className="text-xl font-black text-foreground">Unpublish Course?</h3>
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
            This course will no longer be available for new enrollment. Existing student learning data will remain preserved.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isUnpublishing}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold text-foreground hover:bg-muted transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onUnpublish}
            disabled={isUnpublishing}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-sm px-5 py-2 transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isUnpublishing ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Unpublishing...</span>
              </>
            ) : (
              <span>Unpublish</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
