"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, MoreVertical, Palette, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";

import Modal from "@/components/ui/Modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/shadcn/popover";
import { SlideColumnsEditor } from "./slideCanvas/SlideColumnsLayout";
import {
  createColumn,
  DEFAULT_SLIDE_BACKGROUND,
  SLIDE_BACKGROUND_PRESETS,
  isValidHexColor,
  type SlideItemV2,
} from "./slideCanvas/slideElementTypes";

export type { SlideItemV2 } from "./slideCanvas/slideElementTypes";
export { createDefaultSlideDeck, adaptLegacySlide, parseSlideDeckJson } from "./slideCanvas/slideElementTypes";

interface PresentationSlidesEditorProps {
  slides: SlideItemV2[];
  onChange: (slides: SlideItemV2[]) => void;
}

/**
 * Slide-level background color — reuses the slide list's existing "Settings/
 * More" affordance pattern (a compact popover trigger, same spirit as the
 * per-slide kebab menu) rather than a permanent picker sitting in the
 * toolbar. Preset/custom selections apply to local editor state immediately
 * (live preview on the canvas underneath), so there's no API request per
 * color-picker movement — persistence still only happens when the
 * surrounding cell's existing "Done" button is clicked, same as every other
 * slide edit in this editor.
 */
function SlideBackgroundControl({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draftHex, setDraftHex] = useState(value);
  const [hexError, setHexError] = useState(false);
  const [originalValue, setOriginalValue] = useState(value);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOriginalValue(value);
      setDraftHex(value);
      setHexError(false);
    }
    setOpen(next);
  };

  const applyPreset = (color: string) => {
    setDraftHex(color);
    setHexError(false);
    onChange(color);
  };

  const handleHexInput = (raw: string) => {
    setDraftHex(raw);
    const normalized = raw.startsWith("#") ? raw : `#${raw}`;
    if (isValidHexColor(normalized)) {
      setHexError(false);
      onChange(normalized);
    } else {
      setHexError(true);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted px-2.5 py-1.5 text-[13px] font-bold text-foreground hover:text-foreground transition cursor-pointer"
        >
          <Palette size={13} />
          Background
          <span className="h-3.5 w-3.5 rounded-full border border-transparent" style={{ backgroundColor: value }} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3.5 space-y-3">
        <p className="text-[12px] font-black uppercase tracking-wider text-muted-foreground">Background</p>

        <div className="flex flex-wrap gap-2">
          {SLIDE_BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => applyPreset(preset.value)}
              className={`h-7 w-7 rounded-full border-2 transition cursor-pointer ${
                value.toLowerCase() === preset.value ? "border-primary" : "border-transparent hover:border-slate-500"
              }`}
              style={{ backgroundColor: preset.value }}
              title={preset.label}
              aria-label={preset.label}
            />
          ))}
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border">
          <p className="text-[12.5px] font-semibold text-muted-foreground">Custom</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={isValidHexColor(draftHex) ? draftHex : value}
              onChange={(e) => handleHexInput(e.target.value)}
              className="h-8 w-9 rounded-md border border-border bg-background cursor-pointer shrink-0"
              title="Pick a color"
            />
            <input
              type="text"
              value={draftHex}
              onChange={(e) => handleHexInput(e.target.value)}
              placeholder="#000000"
              className={`flex-1 rounded-lg border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none font-mono ${
                hexError ? "border-red-500" : "border-border focus:border-primary"
              }`}
            />
          </div>
          {hexError && <p className="text-[12px] text-red-400">Enter a valid hex color, e.g. #172554.</p>}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => applyPreset(DEFAULT_SLIDE_BACKGROUND)}
            className="flex items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <RotateCcw size={11} />
            Reset
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onChange(originalValue);
                handleOpenChange(false);
              }}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-[13px] font-bold text-foreground hover:bg-muted transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={hexError}
              className="rounded-lg bg-primary hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed px-2.5 py-1 text-[13px] font-black text-slate-950 transition cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Slide list + a Markdown/HTML column editor for the selected slide. There
 * is no positioned-element canvas — the instructor never drags or resizes
 * anything to edit a slide's content, only writes Markdown/HTML per column
 * and sees a live preview.
 */
export function PresentationSlidesEditor({ slides, onChange }: PresentationSlidesEditorProps) {
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [isNewSlideModalOpen, setIsNewSlideModalOpen] = useState(false);
  const [newSlideTitle, setNewSlideTitle] = useState("");

  const activeIndex = Math.min(selectedSlideIndex, Math.max(slides.length - 1, 0));
  const activeSlide = slides[activeIndex];

  const updateSlide = (index: number, patch: Partial<SlideItemV2>) => {
    onChange(slides.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const selectSlide = (index: number) => {
    setSelectedSlideIndex(index);
  };

  const openNewSlideModal = () => {
    setNewSlideTitle("");
    setIsNewSlideModalOpen(true);
  };

  const closeNewSlideModal = () => {
    setIsNewSlideModalOpen(false);
    setNewSlideTitle("");
  };

  const confirmNewSlide = () => {
    const title = newSlideTitle.trim();
    if (!title) return;

    const newSlide: SlideItemV2 = {
      id: `slide_${Date.now()}`,
      title,
      backgroundColor: DEFAULT_SLIDE_BACKGROUND,
      columns: [createColumn()],
    };
    onChange([...slides, newSlide]);
    setSelectedSlideIndex(slides.length);
    closeNewSlideModal();
  };

  const removeSlide = (index: number) => {
    if (slides.length <= 1) return;
    const next = slides.filter((_, i) => i !== index);
    onChange(next);
    setSelectedSlideIndex((prev) => Math.min(prev, next.length - 1));
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setSelectedSlideIndex((prev) => (prev === index ? target : prev === target ? index : prev));
  };

  if (!activeSlide) return null;

  return (
    <>
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-foreground">Slides</label>
          <button
            type="button"
            onClick={openNewSlideModal}
            className="flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 px-2.5 py-1 text-[13px] font-bold text-orange-300 transition cursor-pointer"
          >
            <Plus size={12} />
            New Slide
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {slides.map((slide, index) => (
            <div
              key={slide.id || index}
              onClick={() => selectSlide(index)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-bold transition cursor-pointer ${
                index === activeIndex
                  ? "border-primary bg-primary/15 text-orange-300"
                  : "border-border bg-background text-foreground hover:border-transparent"
              }`}
            >
              <span className="truncate max-w-[9rem]">{slide.title || `Slide ${index + 1}`}</span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-4 w-4 items-center justify-center rounded text-current opacity-70 hover:opacity-100 transition cursor-pointer"
                    aria-label="Slide actions"
                  >
                    <MoreVertical size={11} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => selectSlide(index)}>
                    <Pencil className="size-3.5" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => moveSlide(index, -1)} disabled={index === 0}>
                    <ArrowUp className="size-3.5" />
                    <span>Move Up</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => moveSlide(index, 1)} disabled={index === slides.length - 1}>
                    <ArrowDown className="size-3.5" />
                    <span>Move Down</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => removeSlide(index)}
                    disabled={slides.length <= 1}
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-1">Slide Title</label>
        <input
          type="text"
          value={activeSlide.title}
          onChange={(e) => updateSlide(activeIndex, { title: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary font-medium"
          placeholder="Slide title"
        />
      </div>

      <div className="flex items-center gap-2">
        <SlideBackgroundControl
          value={activeSlide.backgroundColor}
          onChange={(color) => updateSlide(activeIndex, { backgroundColor: color })}
        />
      </div>

      <SlideColumnsEditor
        columns={activeSlide.columns}
        backgroundColor={activeSlide.backgroundColor}
        onChange={(columns) => updateSlide(activeIndex, { columns })}
      />
    </div>

    <Modal open={isNewSlideModalOpen} onClose={closeNewSlideModal} title="Add New Slide" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Slide Title <span className="text-primary">*</span>
          </label>
          <input
            type="text"
            autoFocus
            value={newSlideTitle}
            onChange={(e) => setNewSlideTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newSlideTitle.trim()) confirmNewSlide();
            }}
            placeholder="Enter slide title..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary font-medium"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={closeNewSlideModal}
            className="rounded-lg border border-border bg-background hover:bg-muted px-3.5 py-2 text-sm font-bold text-foreground transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmNewSlide}
            disabled={!newSlideTitle.trim()}
            className="rounded-lg bg-primary hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-black text-slate-950 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
    </>
  );
}
