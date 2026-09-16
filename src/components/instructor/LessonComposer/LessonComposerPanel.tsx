"use client";

import { useEffect, useRef, useState } from "react";
import {
  Code,
  FileText,
  Image as ImageIcon,
  Layers,
  Link as LinkIcon,
  MoreHorizontal,
  Table,
  Type,
  Video as VideoIcon,
} from "lucide-react";

import Loader from "@/components/common/Loader";
import { Card, CardContent } from "@/components/ui/shadcn/card";
import { useToast } from "@/components/ui/ToastProvider";
import { useContents } from "@/hooks/queries/instructor/useContents";
import { cn } from "@/lib/utils";

import dynamic from "next/dynamic";

const AddCellModal = dynamic(
  () => import("./AddCellModal").then((mod) => mod.AddCellModal),
  { ssr: false }
);
import { TextCell } from "./cells/TextCell";
import { HeadingCell } from "./cells/HeadingCell";
import { ImageCell } from "./cells/ImageCell";
import { VideoCell } from "./cells/VideoCell";
import { LinkCell } from "./cells/LinkCell";
import { DocumentCell } from "./cells/DocumentCell";
import { InteractiveCell } from "./cells/InteractiveCell";
import { AssignmentCell } from "./cells/AssignmentCell";
import { useDuplicateContent, useUpdateContent } from "./contentMutations";
import { CELL_TYPES, type ContentType } from "./cellTypes";
import { detectHtmlCellVariant } from "./htmlCellVariant";
import { planInsert, sortByOrder } from "./blockOrder";
import { getErrorMessage } from "./getErrorMessage";
import type { CellActionProps, ContentParent, ContentRow } from "./types";

interface LessonComposerPanelProps {
  parent: ContentParent;
  selectedCellId?: string | null;
  onSelectCell?: (contentId: string) => void;
  /** Bump this (e.g. a counter) to immediately open the Add Content picker for the current parent — used by the Course Map's "Add Content" action so it never has to navigate to a separate page. */
  autoOpenAddSignal?: number;
  /** Called right after `autoOpenAddSignal` triggers the picker to open — the caller should reset its counter back to 0 here, so a stale non-zero value can't re-trigger on a later remount (see the effect's comment for why that matters). */
  onAutoOpenConsumed?: () => void;
  draftContents?: ContentRow[];
  isDraftMode?: boolean;
  onUpdateDraftContents?: (contents: ContentRow[]) => void;
  /** Opens the lesson-quiz creation flow for this topic's parent lesson — a Quiz isn't a Content row, so picking it from the Add Content grid hands off to that flow instead of an in-panel form. Only ever passed when parent.parentType === "topic". Omit to hide the Quiz option. */
  onAddQuiz?: () => void;
}

/** Determines block badge representation (label & color variant) for target UI */
function getBlockBadge(content: ContentRow): { text: string; variant: "heading" | "text" | "code" | "image" | "video" | "document" | "assignment" | "default" } {
  switch (content.type) {
    case "HTML": {
      const variant = detectHtmlCellVariant(content.htmlContent);
      if (variant === "heading") {
        const tagMatch = content.htmlContent?.match(/<(h[1-6])/i);
        const tagStr = tagMatch ? tagMatch[1].toUpperCase() : "H1";
        return { text: tagStr, variant: "heading" };
      }
      if (variant === "image") {
        return { text: "IMG", variant: "image" };
      }
      if (content.htmlContent?.includes("<code") || content.htmlContent?.includes("<pre")) {
        return { text: "</>", variant: "code" };
      }
      return { text: "P", variant: "text" };
    }
    case "IMAGE":
      return { text: "IMG", variant: "image" };
    case "VIDEO":
      return { text: "VID", variant: "video" };
    case "EMBED":
      return { text: "IFRM", variant: "code" };
    case "LINK":
      return { text: "LINK", variant: "default" };
    case "DOCUMENT":
    case "FILE":
      return { text: "DOC", variant: "document" };
    case "PRESENTATION":
      return { text: "SLIDE", variant: "document" };
    case "ASSIGNMENT":
      // No badgeText — CellShell falls back to rendering the cell type's
      // own icon (ClipboardCheck) instead of a cramped 4-letter initialism,
      // which reads as a proper Assignment identity rather than a generic
      // file abbreviation like "DOC"/"VID".
      return { text: "", variant: "assignment" };
    case "CODE":
      return { text: "</>", variant: "code" };
    default:
      return { text: (content.type || "FILE").toUpperCase().slice(0, 4), variant: "default" };
  }
}

/** Renders the cell that matches a Content row's `type` */
function renderCell(content: ContentRow, actionProps: CellActionProps) {
  switch (content.type) {
    case "HTML":
      switch (detectHtmlCellVariant(content.htmlContent)) {
        case "heading":
          return <HeadingCell content={content} {...actionProps} />;
        case "image":
          return <ImageCell content={content} {...actionProps} />;
        default:
          return <TextCell content={content} {...actionProps} />;
      }
    case "IMAGE":
      return <ImageCell content={content} {...actionProps} />;
    case "VIDEO":
      return <VideoCell content={content} {...actionProps} />;
    case "EMBED":
      return <InteractiveCell content={content} {...actionProps} />;
    case "LINK":
      return <LinkCell content={content} {...actionProps} />;
    case "DOCUMENT":
    case "FILE":
      return (
        <DocumentCell
          content={content}
          cellType={
            CELL_TYPES.find((c) => c.id === "document") || {
              id: "document",
              label: "Document",
              description: "An uploaded document or file.",
              icon: FileText,
              contentType: "DOCUMENT",
              supportedByApiToday: true,
            }
          }
          {...actionProps}
        />
      );
    case "PRESENTATION":
      return (
        <DocumentCell
          content={content}
          cellType={
            CELL_TYPES.find((c) => c.id === "presentation") || {
              id: "presentation",
              label: "Presentation",
              description: "A presentation slide deck or PPTX file.",
              icon: Layers,
              contentType: "PRESENTATION",
              supportedByApiToday: true,
            }
          }
          {...actionProps}
        />
      );
    case "ASSIGNMENT":
      return <AssignmentCell content={content} {...actionProps} />;
    default:
      if (content.htmlContent) {
        return <TextCell content={content} {...actionProps} />;
      }
      return (
        <DocumentCell
          content={content}
          cellType={{
            id: "document",
            label: content.type ? content.type.charAt(0) + content.type.slice(1).toLowerCase() : "File",
            description: "Uploaded file resource.",
            icon: FileText,
            contentType: (content.type as unknown as ContentType) || "DOCUMENT",
            supportedByApiToday: true,
          }}
          {...actionProps}
        />
      );
  }
}

export function LessonComposerPanel({
  parent,
  selectedCellId,
  onSelectCell,
  autoOpenAddSignal,
  onAutoOpenConsumed,
  draftContents,
  isDraftMode = false,
  onUpdateDraftContents,
  onAddQuiz,
}: LessonComposerPanelProps) {
  const { data: apiContents = [], isLoading: isApiLoading, isError: isApiError } = useContents(isDraftMode ? undefined : parent);

  const contents: ContentRow[] = isDraftMode ? (draftContents || []) : (apiContents || []);
  const isLoading = isDraftMode ? false : isApiLoading;
  const isError = isDraftMode ? false : isApiError;
  const [insertOrder, setInsertOrder] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [insertingAnchorId, setInsertingAnchorId] = useState<string | null>(null);
  const { duplicate } = useDuplicateContent();
  const updateContent = useUpdateContent();
  const { showToast } = useToast();

  // Selection is "controlled" when a parent passes onSelectCell (the course
  // page, wiring a Block Settings panel) and falls back to local state
  // otherwise (the standalone lesson-page toggle) — either way, every block
  // is selectable, which is what lets touch devices (no hover) reach a
  // block's Add Above/Below/Duplicate/Delete/Settings controls by tapping it.
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const effectiveSelectedId = selectedCellId !== undefined ? selectedCellId : localSelectedId;

  const handleSelectCell = (contentId: string) => {
    setLocalSelectedId(contentId);
    onSelectCell?.(contentId);
  };

  /**
   * Bring the selected block into view.
   *
   * Picking a content cell in the Course Map only ever set `selectedCellId`,
   * which draws a ring around the matching block — so selecting anything below
   * the fold looked like the click did nothing at all. The panel also remounts
   * on every composer-mode switch, so this covers arriving at a block from a
   * collapsed part of the tree as well as re-selecting within an open topic.
   *
   * `block: "nearest"` keeps a block that is already on screen exactly where it
   * is (clicking a block inside the panel shouldn't yank the page around); only
   * an off-screen one actually scrolls. The rAF waits for this render's layout,
   * since the node may have only just been mounted.
   */
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!effectiveSelectedId) return;
    const node = cellRefs.current[effectiveSelectedId];
    if (!node) return;

    const raf = requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(raf);
  }, [effectiveSelectedId, contents.length]);

  const openAddCell = (order: number) => {
    if (!parent?.parentId) {
      showToast(
        parent?.parentType === "topic"
          ? "Please select or create a topic in the left sidebar first."
          : "Please select or create this item first.",
        "error",
        parent?.parentType === "topic" ? "Topic Required" : "Selection Required"
      );
      return;
    }
    setInsertOrder(order);
  };

  /**
   * "Add Above"/"Add Below": makes room at the target integer `order` slot
   * (see blockOrder.ts for why shifting — not a fractional order — is what
   * the backend actually supports), then opens the same Add Content picker
   * every other insertion uses. Guarded by `insertingAnchorId` since the
   * shifts are awaited sequentially and a second click mid-sequence would
   * plan against a now-stale `contents` snapshot.
   */
  const handleInsert = async (anchorId: string, position: "above" | "below") => {
    if (insertingAnchorId) return;

    const plan = planInsert(contents, anchorId, position);
    if (plan.shifts.length === 0) {
      openAddCell(plan.insertOrder);
      return;
    }

    setInsertingAnchorId(anchorId);
    try {
      for (const shift of plan.shifts) {
        await updateContent.mutateAsync({
          contentId: shift.contentId,
          contentData: { order: shift.newOrder },
          parent,
        });
      }
      openAddCell(plan.insertOrder);
    } catch (error) {
      showToast(
        getErrorMessage(error, "Failed to make room for the new block. Nothing was added — try again."),
        "error",
        "Insert failed"
      );
    } finally {
      setInsertingAnchorId(null);
    }
  };

  const validOrders = (contents || [])
    .map((c: ContentRow) => (typeof c.order === "number" && !isNaN(c.order) && c.order > 0 ? c.order : 0))
    .filter((o: number) => o > 0);

  const nextOrder = validOrders.length > 0 ? Math.max(...validOrders) + 1 : (contents.length > 0 ? contents.length + 1 : 1);

  // Lets the Course Map's "Add Content" action open this topic's Add
  // Content picker immediately, without a second click once the topic
  // becomes the active composer view. `onAutoOpenConsumed` is called right
  // after firing so the caller can reset its counter back to 0 — this
  // component remounts on every composerMode switch (Course/Module/Lesson/
  // Topic are each a separate conditional block in the page), so a signal
  // that stays non-zero after being handled would look "new" again to the
  // next fresh mount (its own ref starts empty) and re-fire on every
  // revisit, not just the visit that actually requested it.
  const handledAutoOpenSignal = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!autoOpenAddSignal || autoOpenAddSignal <= 0) return;
    if (isLoading) return;
    if (handledAutoOpenSignal.current === autoOpenAddSignal) return;
    handledAutoOpenSignal.current = autoOpenAddSignal;
    openAddCell(nextOrder);
    onAutoOpenConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAddSignal, isLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-border bg-background/60">
        <CardContent className="py-12 text-center text-base text-muted-foreground">
          Failed to load lesson content.
        </CardContent>
      </Card>
    );
  }

  const handleDuplicate = async (content: ContentRow) => {
    setDuplicatingId(content.id);
    try {
      await duplicate(content, nextOrder);
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to duplicate this block."), "error", "Duplicate failed");
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Canvas */}
      {!parent?.parentId ? (
        <div className="rounded-2xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 p-12 text-center">
          <p className="text-base font-bold text-amber-400">
            {parent?.parentType === "topic" ? "No topic found for this lesson." : "Nothing selected yet."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {parent?.parentType === "topic"
              ? <>Please click <strong className="text-foreground">+ New Topic</strong> in the left Course Map sidebar to create a topic before adding content blocks.</>
              : "Select or create this item first."}
          </p>
        </div>
      ) : contents.length === 0 ? (
        <div
          onClick={() => openAddCell(nextOrder)}
          className="rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-background/40 p-12 text-center transition cursor-pointer group"
        >
          <p className="text-base font-bold text-foreground group-hover:text-primary transition">
            No content in this {parent?.parentType || "lesson"} yet.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Click here to add your first content block.
          </p>
        </div>
      ) : (
        <div className="p-2 sm:p-8 md:p-10 space-y-2">
          {sortByOrder(contents).map((content: ContentRow) => {
            const badge = getBlockBadge(content);
            const isSelected = effectiveSelectedId === content.id;
            const isHeadingBlock = badge.variant === "heading";

            return (
              <div
                key={content.id}
                ref={(node) => {
                  cellRefs.current[content.id] = node;
                }}
                onClick={() => handleSelectCell(content.id)}
                className={cn(
                  // scroll-mt clears the composer's sticky header, so a block
                  // scrolled to from the Course Map lands below it, not under it.
                  "cursor-pointer transition-all duration-150 rounded-xl scroll-mt-24",
                  isHeadingBlock && "pt-4 sm:pt-6 border-t border-border/60 first:pt-0 first:border-t-0 mt-3 first:mt-0",
                  isSelected && "ring-2 ring-orange-500/80 ring-offset-2 ring-offset-slate-950"
                )}
              >
                {renderCell(content, {
                  onDuplicate: () => handleDuplicate(content),
                  isDuplicating: duplicatingId === content.id,
                  badgeText: badge.text,
                  badgeVariant: badge.variant,
                  onSettingsSelect: onSelectCell ? () => handleSelectCell(content.id) : undefined,
                  onAddAbove: () => handleInsert(content.id, "above"),
                  onAddBelow: () => handleInsert(content.id, "below"),
                  isSelected,
                })}
              </div>
            );
          })}
        </div>
      )}

      <AddCellModal
        parent={parent}
        order={insertOrder ?? nextOrder}
        open={insertOrder !== null}
        onOpenChange={(open) => {
          if (!open) setInsertOrder(null);
        }}
        onAddQuiz={onAddQuiz}
      />
    </div>
  );
}
