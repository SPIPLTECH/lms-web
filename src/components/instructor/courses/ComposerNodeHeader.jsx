"use client";

import { FileStack, GitBranch, Lightbulb, Pencil } from "lucide-react";

// Same icons the Course Map uses for these rows.
const NODE_TYPES = {
  topic: { label: "Topic", icon: FileStack },
  subTopic: { label: "SubTopic", icon: GitBranch },
  concept: { label: "Concept", icon: Lightbulb },
};

/**
 * Header cell for the Topic / SubTopic / Concept composer views — the same
 * "<Level> Header" bar with an "Edit … Details" action on the right that the
 * Module and Lesson views already carry, so every level of the hierarchy can
 * be edited from the workspace, not only from the Course Map's row menu.
 */
export function ComposerNodeHeader({ type, title, description, parentTitle, onEdit }) {
  const nodeType = NODE_TYPES[type];
  if (!nodeType) return null;
  const Icon = nodeType.icon;

  return (
    <div className="notebook-cell rounded-2xl border border-border bg-background p-3 sm:p-6 shadow-md space-y-4 mb-5">
      <div className="cell-header flex items-center justify-between border-b border-border/80 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="cell-badge rounded bg-primary/15 border border-primary/30 px-2.5 py-1 text-[12px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5 shrink-0">
            <Icon size={12} />
            {nodeType.label} Header
          </span>
          {parentTitle && (
            <span className="text-sm font-semibold text-muted-foreground truncate">
              in <span className="text-foreground">{parentTitle}</span>
            </span>
          )}
        </div>
        {onEdit && (
          <div className="cell-controls">
            <button
              type="button"
              className="border border-border text-foreground hover:text-foreground bg-background hover:bg-muted rounded-xl px-3 py-1.5 text-sm font-bold transition cursor-pointer flex items-center gap-1.5"
              onClick={onEdit}
            >
              <Pencil size={13} />
              Edit {nodeType.label} Details
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground break-words">
          {title || `Untitled ${nodeType.label}`}
        </h2>
        {description && (
          <p className="text-sm text-foreground leading-relaxed bg-background/60 p-3 rounded-xl border border-border/80">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
