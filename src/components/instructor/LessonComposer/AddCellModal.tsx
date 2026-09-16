"use client";

import { useState, type ComponentType } from "react";
import {
  ArrowLeft,
  ClipboardCheck,
  File,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  MonitorPlay,
  Presentation as PresentationIcon,
  Upload,
  Video as VideoIcon
} from "lucide-react";

import Modal from "@/components/ui/Modal";

import { CreateTextForm } from "./cells/TextCell";
import { CreateImageForm } from "./cells/ImageCell";
import { CreateVideoForm } from "./cells/VideoCell";
import { CreateFileForm } from "./cells/DocumentCell";
import { CreateInteractiveForm } from "./cells/InteractiveCell";
import { CreateAssignmentForm } from "./cells/AssignmentCell";
import type { CellTypeId } from "./cellTypes";
import type { ContentParent, CreateCellFormProps } from "./types";

interface AddCellModalProps {
  parent: ContentParent;
  /** Pre-computed `max(existing order) + 1`, shared by whichever type ends up being added. */
  order: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Picking the Quiz tile hands off here instead of opening an in-panel form — a Quiz isn't a Content row (see cellTypes.ts). Receives the same insertion `order` the picker would otherwise use for a Content row, so a quiz added via "Add Above"/"Add Below" lands at that position. Omit to hide the Quiz option. */
  onAddQuiz?: (order: number) => void;
}

/** Form definitions for simple cell types */
const SIMPLE_FORMS: Partial<Record<CellTypeId, ComponentType<CreateCellFormProps>>> = {
  text: CreateTextForm,
  image: CreateImageForm,
  video: CreateVideoForm,
  interactive: CreateInteractiveForm,
  assignment: CreateAssignmentForm,
};

export const VISIBLE_CELL_OPTIONS = [
  {
    id: "text" as CellTypeId,
    label: "Markdown",
    sublabel: "Text & Heading",
    icon: FileText,
  },
  {
    id: "image" as CellTypeId,
    label: "Image",
    sublabel: "Upload or URL",
    icon: ImageIcon,
  },
  {
    id: "video" as CellTypeId,
    label: "Video",
    sublabel: "Upload or URL",
    icon: VideoIcon,
  },
  {
    id: "document" as CellTypeId,
    label: "Document / PDF",
    sublabel: "PDF / DOC / DOCX",
    icon: File,
  },
  {
    id: "presentation" as CellTypeId,
    label: "Slideshow / Presentation",
    sublabel: "Slide deck / PPTX",
    icon: PresentationIcon,
  },
  {
    id: "interactive" as CellTypeId,
    label: "Interactive",
    sublabel: "iframe embed",
    icon: MonitorPlay,
  },
  {
    id: "assignment" as CellTypeId,
    label: "Assignment",
    sublabel: "Instructions & upload",
    icon: ClipboardCheck,
  },
  {
    id: "quiz" as CellTypeId,
    label: "Quiz",
    sublabel: "Attached to this topic",
    icon: HelpCircle,
  },
];

export function AddCellModal({ parent, order, open, onOpenChange, onAddQuiz }: AddCellModalProps) {
  const [selectedId, setSelectedId] = useState<CellTypeId | null>(null);
  
  // Document 2-step choice: PDF vs DOC/DOCX
  const [docTypeChoice, setDocTypeChoice] = useState<"pdf" | "doc" | null>(null);
  
  // Presentation 2-step choice: Slideshow vs PPTX Upload
  const [presentationChoice, setPresentationChoice] = useState<"slideshow" | "upload" | null>(null);

  const close = () => {
    onOpenChange(false);
    setSelectedId(null);
    setDocTypeChoice(null);
    setPresentationChoice(null);
  };

  const selectedCellOption = selectedId ? VISIBLE_CELL_OPTIONS.find((c) => c.id === selectedId) ?? null : null;
  const SimpleForm = selectedId ? SIMPLE_FORMS[selectedId] : undefined;
  
  const isDocument = selectedId === "document";
  const awaitingDocChoice = isDocument && docTypeChoice === null;

  const isPresentation = selectedId === "presentation";
  const awaitingPresentationChoice = isPresentation && presentationChoice === null;

  const title = !selectedCellOption
    ? "Add New Content Cell"
    : awaitingDocChoice
      ? "Select Document Type"
      : awaitingPresentationChoice
        ? "Add Presentation"
        : `Add ${selectedCellOption.label}`;

  const handleSelectOption = (id: CellTypeId) => {
    if (id === "quiz") {
      onAddQuiz?.(order);
      close();
      return;
    }
    setSelectedId(id);
  };

  const visibleOptions = onAddQuiz ? VISIBLE_CELL_OPTIONS : VISIBLE_CELL_OPTIONS.filter((c) => c.id !== "quiz");

  const handleBack = () => {
    if (awaitingDocChoice || awaitingPresentationChoice || (!isDocument && !isPresentation)) {
      setSelectedId(null);
      setDocTypeChoice(null);
      setPresentationChoice(null);
    } else if (isDocument) {
      setDocTypeChoice(null);
    } else if (isPresentation) {
      setPresentationChoice(null);
    }
  };

  const docAccept = docTypeChoice === "pdf" ? ".pdf" : ".doc,.docx";

  return (
    <Modal open={open} onClose={close} title={title} size="lg">
      {/* No overflow-hidden here — Modal's own body already scrolls
          (overflow-y-auto). Clipping here instead of letting content flow up
          into that scroll region was cutting off the Cancel/Done footer on
          any form tall enough to exceed the modal's visible height (the
          Presentation slide editor being the most common case). */}
      <div className="flex-1 min-h-0 flex flex-col -mx-1 px-1">
        {selectedCellOption && (
          <button
            type="button"
            onClick={handleBack}
            className="mb-3 shrink-0 flex items-center gap-1.5 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>
        )}

        {!selectedCellOption ? (
          <>
            <p className="mb-2.5 text-sm text-muted-foreground">Select Cell Type</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {visibleOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectOption(option.id)}
                    className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted cursor-pointer min-h-[72px]"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/15 to-pink-500/15 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span className="block text-base font-bold text-foreground truncate">{option.label}</span>
                      <span className="block text-sm text-muted-foreground truncate">{option.sublabel}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : awaitingDocChoice ? (
          <>
            <p className="mb-2.5 text-sm text-muted-foreground">Select Document Format</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDocTypeChoice("pdf")}
                className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-muted cursor-pointer min-h-[72px]"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/15 to-pink-500/15 text-primary">
                  <File className="size-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="block text-base font-bold text-foreground">PDF Document</span>
                  <span className="block text-sm text-muted-foreground">Upload Adobe PDF file (.pdf)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDocTypeChoice("doc")}
                className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-muted cursor-pointer min-h-[72px]"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/15 to-pink-500/15 text-primary">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="block text-base font-bold text-foreground">DOC / DOCX</span>
                  <span className="block text-sm text-muted-foreground">Upload Word document (.doc, .docx)</span>
                </div>
              </button>
            </div>
          </>
        ) : awaitingPresentationChoice ? (
          <>
            <p className="mb-2.5 text-sm text-muted-foreground">How do you want to create it?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPresentationChoice("slideshow")}
                className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-muted cursor-pointer min-h-[72px]"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/15 to-pink-500/15 text-primary">
                  <Layers className="size-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="block text-base font-bold text-foreground">Create Slides</span>
                  <span className="block text-sm text-muted-foreground">Build presentation inside LMS</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPresentationChoice("upload")}
                className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-muted cursor-pointer min-h-[72px]"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/15 to-pink-500/15 text-primary">
                  <Upload className="size-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="block text-base font-bold text-foreground">Upload PPTX</span>
                  <span className="block text-sm text-muted-foreground">Upload existing PowerPoint file</span>
                </div>
              </button>
            </div>
          </>
        ) : SimpleForm ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <SimpleForm parent={parent} order={order} onCreated={close} onCancel={() => setSelectedId(null)} />
          </div>
        ) : isDocument ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <CreateFileForm
              parent={parent}
              order={order}
              cellType={{
                id: "document",
                label: docTypeChoice === "pdf" ? "PDF Document" : "Word Document",
                description: "Uploaded document resource.",
                icon: FileText,
                contentType: "DOCUMENT",
                supportedByApiToday: true,
              }}
              accept={docAccept}
              onCreated={close}
              onCancel={() => setSelectedId(null)}
            />
          </div>
        ) : isPresentation ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <CreateFileForm
              parent={parent}
              order={order}
              cellType={{
                id: "presentation",
                label: "Presentation",
                description: "Uploaded presentation or slide deck.",
                icon: PresentationIcon,
                contentType: "PRESENTATION",
                supportedByApiToday: true,
              }}
              presentationMode={presentationChoice ?? undefined}
              onCreated={close}
              onCancel={() => setSelectedId(null)}
            />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
