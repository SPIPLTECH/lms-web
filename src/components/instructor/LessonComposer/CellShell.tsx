"use client";

import type { ReactNode } from "react";
import {
  MoreVertical,
  Pencil,
  Plus,
  Settings,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";

interface CellShellProps {
  icon: LucideIcon;
  typeLabel: string;
  title: string;
  mode: "view" | "edit";
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  /** Still accepted (every cell threads it) but no longer surfaced: the
   *  block menu has no Duplicate entry. */
  onDuplicate?: () => void;
  isDuplicating?: boolean;
  /** Still accepted (every cell threads it) but no longer surfaced: the
   *  block menu has no Settings entry. */
  onSettingsSelect?: () => void;
  onAddAbove?: () => void;
  onAddBelow?: () => void;
  /** Keeps the hover-only chrome visible without a mouse — the touch-device fallback, since touch has no hover. */
  isSelected?: boolean;
  badgeText?: string;
  badgeVariant?: "heading" | "text" | "code" | "image" | "video" | "document" | "assignment" | "default";
  headerActions?: ReactNode;
  children: ReactNode;
}

const BADGE_STYLES = {
  heading: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  text: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  code: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  image: "bg-primary/20 text-primary border-primary/30",
  video: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  document: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  assignment: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  default: "bg-muted text-foreground border-transparent",
};

export function CellShell({
  icon: Icon,
  typeLabel,
  title,
  mode,
  onEdit,
  onDelete,
  isDeleting = false,
  onAddAbove,
  onAddBelow,
  isSelected = false,
  badgeText,
  badgeVariant = "default",
  headerActions,
  children,
}: CellShellProps) {
  const badgeClass = BADGE_STYLES[badgeVariant] || BADGE_STYLES.default;
  const isTextOrHeading = badgeVariant === "text" || badgeVariant === "heading" || typeLabel.toLowerCase().includes("text") || typeLabel.toLowerCase().includes("heading");

  // Every hover-only control (drag handle, header actions, Add Above/Below)
  // shares this: invisible and non-interactive by default so nothing shifts
  // layout, fades in on hover, and — since touch has no hover — also stays
  // visible while `isSelected` or actively `edit`ing.
  const showControls = isSelected || mode === "edit";
  // Reveal-on-hover is gated behind `(hover: hover)` so it only applies to
  // devices that actually have a pointer. Unconditionally, these controls were
  // opacity-0 AND pointer-events-none on touch, where no hover ever fires —
  // which left a phone with no way to edit, duplicate or delete a cell at all.
  const HOVER_ONLY_HIDDEN =
    "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:pointer-events-none";
  const hoverVisible = cn(
    "transition-opacity duration-150",
    HOVER_ONLY_HIDDEN,
    "[@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:pointer-events-auto",
    showControls && "opacity-100 pointer-events-auto"
  );
  const addControlsVisible = cn(
    "transition-opacity duration-150",
    HOVER_ONLY_HIDDEN,
    "[@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:pointer-events-auto",
    "[@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-focus-within:pointer-events-auto",
    mode === "edit" && "opacity-100 pointer-events-auto"
  );

  return (
    <div
      className={cn(
        // Stacks on mobile: side-by-side, the drag handle and index badge take
        // ~44px of a phone-width column that has already been narrowed by the
        // page, the overview card and this cell's own padding. What is left
        // over is too narrow to render a video or an image in, so the badge
        // row moves above the body below `sm` and the body gets the full width.
        "group relative flex flex-col sm:flex-row items-stretch sm:items-start gap-2 sm:gap-3 transition-all duration-200",
        isTextOrHeading && mode === "view"
          ? "rounded-xl border border-transparent bg-transparent hover:border-border/80 hover:bg-background/40 p-2.5 sm:p-3.5"
          // Hover previously set `border-transparent/80`, which made the border
          // disappear on hover instead of strengthening it.
          : "rounded-2xl border border-border bg-background/70 p-3 sm:p-5 shadow-sm hover:border-primary/40 hover:bg-background/90",
        // Edit focus ring follows --primary rather than a hardcoded orange, so
        // it stays correct in dark mode (where primary is green).
        mode === "edit" && "rounded-2xl border-primary/50 bg-background/95 ring-2 ring-primary/50 p-3 sm:p-5"
      )}
    >
      {/* Add Above — top center, fades in over the block's top edge */}
      {onAddAbove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddAbove();
          }}
          className={cn(
            "absolute -top-3 left-1/2 z-10 hidden md:flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[12px] font-bold text-muted-foreground shadow-md transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground cursor-pointer",
            addControlsVisible
          )}
          title="Add block above"
        >
          <Plus size={11} />
          Add Above
        </button>
      )}

      {/* Type Badge */}
      <div className="flex items-center gap-2 shrink-0 sm:pt-0.5">

        <div
          className={cn(
            "flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg font-extrabold text-sm border shadow-sm shrink-0 transition-opacity",
            badgeClass,
            // Same hover trap as the action controls: on touch this made the
            // type badge permanently invisible.
            isTextOrHeading && mode === "view" && !showControls
              ? cn(HOVER_ONLY_HIDDEN, "[@media(hover:hover)]:group-hover:opacity-100")
              : "opacity-100"
          )}
        >
          {badgeText ? (
            <span className="text-[12px] font-black uppercase">{badgeText}</span>
          ) : (
            <Icon size={15} />
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
        {/* Header Metadata — shown for named/file blocks OR when editing.
            Tighter on mobile so the cell's actual content, not its chrome,
            gets the vertical space. */}
        {(title || !isTextOrHeading || mode === "edit") && (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border/60 pb-1.5 sm:pb-2">
            {/* flex-1 so the title claims the leftover space instead of being
                squeezed by the shrink-0 action cluster next to it. */}
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-bold text-foreground">
                {title || (isTextOrHeading ? "Text Block" : "Untitled Block")}
              </h4>
              <p className="text-[12px] font-black uppercase tracking-wider text-muted-foreground">
                {typeLabel}
              </p>
            </div>

            {/* Header Actions (PDF Navigation, Zoom, Download) & Block Action Menu */}
            {/* Not shrink-0 below md. The PDF and presentation viewers inject
                their whole control bar here (~291px of page nav, zoom and
                Fit), and a shrink-0 wrapper sizes to that content instead of
                to the column — which is what pushed the page to 411px wide at
                a 320px viewport. Letting it shrink gives its flex-wrap a
                constraint to wrap against. */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 md:shrink-0 flex-wrap justify-end">
              {headerActions}

              <div className={cn("flex items-center shrink-0", hoverVisible)}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                      aria-label="Block Actions"
                      title="Block Actions"
                    >
                      {/* The block menu reads as a ⋮ on mobile, where it is the
                          only route to these actions; the desktop gear is
                          left as-is. */}
                      <MoreVertical size={14} className="md:hidden" />
                      <Settings size={14} className="hidden md:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" collisionPadding={8}>
                    <DropdownMenuItem onSelect={onEdit} disabled={mode === "edit"}>
                      <Pencil className="size-3.5" />
                      Edit Block
                    </DropdownMenuItem>

                    {/* Below md the floating Add Above/Below controls are
                        hidden (they clutter and overlap a narrow column), so
                        the same handlers are exposed here instead. Same
                        insertion flow, different entry point. */}
                    {onAddAbove && (
                      <DropdownMenuItem className="md:hidden" onSelect={() => onAddAbove()}>
                        <Plus className="size-3.5" />
                        Add Above
                      </DropdownMenuItem>
                    )}
                    {onAddBelow && (
                      <DropdownMenuItem className="md:hidden" onSelect={() => onAddBelow()}>
                        <Plus className="size-3.5" />
                        Add Below
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={onDelete}
                      disabled={isDeleting}
                    >
                      <Trash2 className="size-3.5" />
                      {isDeleting ? "Deleting…" : "Delete Block"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )}

        {/* Floating Actions when header is suppressed in text view mode */}
        {isTextOrHeading && !title && mode === "view" && (
          <div className={cn("absolute top-2 right-2 flex items-center shrink-0 z-10", hoverVisible)}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer shadow-sm"
                  aria-label="Block Actions"
                  title="Block Actions"
                >
                  <MoreVertical size={12} className="md:hidden" />
                  <Settings size={12} className="hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" collisionPadding={8}>
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil className="size-3.5" />
                  Edit Block
                </DropdownMenuItem>
                {onAddAbove && (
                  <DropdownMenuItem className="md:hidden" onSelect={() => onAddAbove()}>
                    <Plus className="size-3.5" />
                    Add Above
                  </DropdownMenuItem>
                )}
                {onAddBelow && (
                  <DropdownMenuItem className="md:hidden" onSelect={() => onAddBelow()}>
                    <Plus className="size-3.5" />
                    Add Below
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={onDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="size-3.5" />
                  {isDeleting ? "Deleting…" : "Delete Block"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Cell Body */}
        <div>{children}</div>
      </div>

      {/* Add Below — bottom center, fades in over the block's bottom edge */}
      {onAddBelow && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddBelow();
          }}
          className={cn(
            "absolute -bottom-3 left-1/2 z-10 hidden md:flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[12px] font-bold text-muted-foreground shadow-md transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground cursor-pointer",
            addControlsVisible
          )}
          title="Add block below"
        >
          <Plus size={11} />
          Add Below
        </button>
      )}
    </div>
  );
}
