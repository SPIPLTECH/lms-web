"use client";

import { Download } from "lucide-react";
import { getDisplayUrl } from "@/lib/blob";

// Downloadable-file list shared by the learning page's Resources panel and
// LessonTabs' "Notes & Attachments" tab — both filtered the same
// instructorAttachments array into near-identical cards; this is the one
// place that rendering now lives. `columns` / `showReadyBadge` reproduce
// each caller's existing layout so no visual behavior changes.
export default function LessonResourcesPanel({
  attachments = [],
  columns = 1,
  showReadyBadge = false,
  emptyMessage = "No downloadable resources for this lesson.",
}) {
  if (attachments.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-background/20 border border-dashed border-border text-center text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={columns === 2 ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "space-y-2"}>
      {attachments.map((file, idx) => (
        <div
          key={file.id || idx}
          className="p-3 rounded-xl bg-background/40 border border-border/80 flex items-center justify-between gap-2 hover:border-primary/40 transition group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <Download size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition">
                {file.title || "Class Attachment"}
              </p>
              <span className="text-[12px] text-muted-foreground font-mono uppercase">
                {file.type || "FILE"}
                {showReadyBadge ? " • Ready" : ""}
              </span>
            </div>
          </div>
          {file.fileUrl ? (
            <a
              href={getDisplayUrl(file.fileUrl)}
              target="_blank"
              rel="noreferrer"
              download
              className="px-3 py-2 min-h-[44px] flex items-center gap-1 rounded-xl bg-primary hover:bg-orange-600 text-slate-950 font-black text-[12px] uppercase tracking-wider transition shadow-md shrink-0 cursor-pointer"
            >
              <Download size={11} />
              <span>Get</span>
            </a>
          ) : (
            <span className="text-[12px] text-muted-foreground italic shrink-0">No File</span>
          )}
        </div>
      ))}
    </div>
  );
}
