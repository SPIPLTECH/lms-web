"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { renderColumnContent } from "./renderColumnContent";
import {
  DEFAULT_SLIDE_BACKGROUND,
  MAX_SLIDE_COLUMNS,
  MIN_SLIDE_COLUMNS,
  createColumn,
  type ColumnContentType,
  type SlideColumn,
} from "./slideElementTypes";

interface SlideColumnsViewProps {
  /** Rendered on-canvas, like a real slide's title — not floating in the surrounding chrome. Omitted entirely (no reserved space) when blank. */
  title?: string;
  columns: SlideColumn[];
  /** Slide-level property, applied to the layout container. */
  backgroundColor?: string;
}

/**
 * Read-only renderer for one slide — a fixed 16:9 presentation canvas, not a
 * scrollable webpage section. A real slide's shape never changes based on
 * what is on it, so content that doesn't fit scrolls *inside* the canvas
 * (`.slide-inner`'s `overflow-y: auto`) rather than stretching it taller.
 *
 * Two layers do the work. The **stage** is always `SLIDE_DESIGN_WIDTH` wide
 * and carries the container context, so every `cqw`/`cqh` below resolves
 * against that fixed canvas and the layout is byte-identical at every
 * viewport. The **frame** is the responsive box the stage is drawn into, and
 * a transform scales the stage to fit it.
 *
 * Scaling rather than restyling is what makes this work on a phone: a
 * column's content is arbitrary HTML that often carries its own intrinsic
 * pixel widths, and no amount of font-size adjustment shrinks those. Scaling
 * the whole stage moves them together, exactly as a deck renders a
 * thumbnail — nothing reflows, nothing is hidden, nothing is cropped.
 *
 * Columns with no content are dropped entirely (no placeholder, no reserved
 * grid track) rather than shown as empty boxes.
 */
/** The slide is authored against this width, the way a deck has a fixed canvas. */
const SLIDE_DESIGN_WIDTH = 1000;

export function SlideColumnsView({ title, columns, backgroundColor = DEFAULT_SLIDE_BACKGROUND }: SlideColumnsViewProps) {
  const visibleColumns = columns.filter((c) => c.content && c.content.trim());
  const hasTitle = Boolean(title && title.trim());
  const isEmpty = !hasTitle && visibleColumns.length === 0;

  // A column's content is arbitrary HTML, and it routinely carries its own
  // intrinsic pixel widths — the coloured boxes of a timeline slide, say.
  // Restyling text cannot shrink those, so instead the slide is laid out once
  // at its design width and the whole stage is then scaled to whatever room
  // the frame has, exactly as a deck renders a thumbnail. `designWidth` grows
  // past the canvas when the content is genuinely wider than it, so an
  // oversized slide is fitted rather than cropped.
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [designWidth, setDesignWidth] = useState(SLIDE_DESIGN_WIDTH);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      // scrollWidth is in the stage's own pre-transform coordinates, so it is
      // unaffected by the scale we are about to apply and cannot feed back.
      const contentWidth = stageRef.current?.scrollWidth ?? 0;
      const nextDesign = Math.max(SLIDE_DESIGN_WIDTH, contentWidth);
      const frameWidth = frame.clientWidth;

      setDesignWidth(nextDesign);
      setScale(frameWidth > 0 ? frameWidth / nextDesign : 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [title, columns]);

  return (
    <div
      ref={frameRef}
      className="slide-frame mx-auto w-full max-w-[1000px] aspect-video overflow-hidden rounded-xl border border-border shadow-inner relative"
      style={{ backgroundColor }}
    >
      <style>{`
        /* The container context lives on the stage, not the frame. The stage is
           always the design size, so every cqw/cqh below resolves against that
           fixed canvas and the layout is identical at every viewport — the
           transform alone changes how big it is drawn. Putting it on the frame
           would shrink the type by the frame's size and then scale it again. */
        .slide-stage {
          position: absolute;
          top: 0;
          left: 0;
          transform-origin: top left;
          container-type: size;
          container-name: slide;
        }
        .slide-inner {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          padding: clamp(0.75rem, 3.2cqw, 2.25rem);
          gap: clamp(0.3rem, 1.4cqh, 0.75rem);
        }
        .slide-title {
          flex: 0 0 auto;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: #f8fafc;
          font-size: clamp(1.15rem, 5cqw, 2.4rem);
        }
        .slide-body {
          flex: none;
          height: auto;
          min-height: 0;
          display: grid;
          align-content: start;
          align-items: start;
          gap: clamp(0.6rem, 2.4cqw, 1.5rem);
        }
        .slide-column {
          min-width: 0;
          min-height: 0;
          overflow: hidden;
        }
        .slide-prose {
          color: #cbd5e1;
          font-size: clamp(0.85rem, 2.2cqw, 1.15rem);
          line-height: 1.45;
        }
        .slide-prose > *:first-child { margin-top: 0; }
        .slide-prose > *:last-child { margin-bottom: 0; }
        .slide-prose h1, .slide-prose h2 {
          font-weight: 700;
          color: #f8fafc;
          line-height: 1.2;
          margin: 0 0 0.3em;
          font-size: clamp(1.1rem, 3.6cqw, 1.7rem);
        }
        .slide-prose h3, .slide-prose h4, .slide-prose h5, .slide-prose h6 {
          font-weight: 700;
          color: #e2e8f0;
          line-height: 1.25;
          margin: 0 0 0.3em;
          font-size: clamp(0.95rem, 2.7cqw, 1.25rem);
        }
        .slide-prose p {
          margin: 0 0 0.45em;
        }
        .slide-prose strong, .slide-prose b { color: #f8fafc; font-weight: 700; }
        .slide-prose ul, .slide-prose ol {
          margin: 0 0 0.45em;
          padding-left: 1.1em;
        }
        .slide-prose li { margin: 0 0 0.2em; }
        .slide-prose blockquote {
          margin: 0 0 0.45em;
          padding-left: 0.75em;
          border-left: 2px solid #f59e0b;
          color: #94a3b8;
          font-style: italic;
          font-size: clamp(0.75rem, 1.7cqw, 0.95rem);
        }
        .slide-prose code {
          color: #fbbf24;
          background-color: rgba(148, 163, 184, 0.14);
          border-radius: 0.2rem;
          padding: 0.1em 0.35em;
          font-size: 0.88em;
        }
        .slide-prose pre {
          margin: 0 0 0.45em;
          padding: 0.5em 0.7em;
          border-radius: 0.5rem;
          background-color: #0d1117;
          overflow-x: auto;
        }
        .slide-prose pre code { background: none; padding: 0; }
        .slide-prose a { color: #fbbf24; text-decoration: underline; text-underline-offset: 2px; }
        .slide-prose img {
          display: block;
          margin: 0.3em auto;
          max-width: 100%;
          max-height: 42cqh;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 0.5rem;
        }
      `}</style>

      {isEmpty ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm italic text-muted-foreground">
          Empty slide.
        </div>
      ) : (
        <div
          ref={stageRef}
          className="slide-stage"
          style={{
            width: designWidth,
            height: designWidth * (9 / 16),
            transform: `scale(${scale})`,
          }}
        >
          <div className="slide-inner">
            {hasTitle && <h3 className="slide-title">{title}</h3>}

            {visibleColumns.length > 0 && (
              <div className="slide-body" style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))` }}>
                {visibleColumns.map((column) => (
                  <div key={column.id} className="slide-column">
                    <div
                      className="slide-prose"
                      dangerouslySetInnerHTML={{ __html: renderColumnContent(column) }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SlideColumnsEditorProps {
  columns: SlideColumn[];
  /** Slide-level property, applied to the layout container so the editor preview matches the viewer. */
  backgroundColor: string;
  onChange: (columns: SlideColumn[]) => void;
}

const COLUMN_TYPES: ColumnContentType[] = ["markdown", "html"];

/**
 * Column-count stepper (1-4, equal-width — the reference has no custom
 * width support either) + one card per column with a Markdown/HTML toggle,
 * a raw text area, and a live sanitized preview underneath. Reducing the
 * count drops trailing columns; increasing appends a blank one — the
 * reference never exposed a column-editing UI at all (only a render-time
 * fallback fed by hand-authored sample JSON), so this editing flow is new.
 * This is the only slide-editing surface — no drag/drop, no positioned
 * elements, just Markdown/HTML per column with a live preview.
 */
export function SlideColumnsEditor({ columns, backgroundColor, onChange }: SlideColumnsEditorProps) {
  const addColumn = () => {
    if (columns.length >= MAX_SLIDE_COLUMNS) return;
    onChange([...columns, createColumn()]);
  };

  const removeColumn = () => {
    if (columns.length <= MIN_SLIDE_COLUMNS) return;
    onChange(columns.slice(0, -1));
  };

  const updateColumn = (id: string, patch: Partial<SlideColumn>) => {
    onChange(columns.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">Columns</label>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
          <button
            type="button"
            onClick={removeColumn}
            disabled={columns.length <= MIN_SLIDE_COLUMNS}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition cursor-pointer disabled:cursor-not-allowed"
            aria-label="Remove column"
          >
            <Minus size={12} />
          </button>
          <span className="w-6 text-center text-sm font-bold text-foreground">{columns.length}</span>
          <button
            type="button"
            onClick={addColumn}
            disabled={columns.length >= MAX_SLIDE_COLUMNS}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition cursor-pointer disabled:cursor-not-allowed"
            aria-label="Add column"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      <div
        className="flex flex-col sm:flex-row gap-4 rounded-xl border border-border p-3 sm:p-4"
        style={{ backgroundColor }}
      >
        {columns.map((column, idx) => (
          <div
            key={column.id}
            className="flex-1 min-w-0 space-y-2 rounded-lg border border-border bg-background/70 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-black uppercase tracking-wider text-muted-foreground">
                Column {idx + 1}
              </span>
              <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
                {COLUMN_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateColumn(column.id, { contentType: type })}
                    className={`px-2 py-1 rounded text-[12px] font-bold uppercase cursor-pointer transition ${
                      column.contentType === type
                        ? "bg-primary text-slate-950"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={column.content}
              onChange={(e) => updateColumn(column.id, { content: e.target.value })}
              rows={5}
              placeholder={column.contentType === "markdown" ? "Write markdown…" : "Write HTML…"}
              className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary font-mono leading-relaxed resize-y"
            />

            <div className="rounded-lg border border-border/60 bg-black/20 p-2.5">
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Preview</p>
              {column.content ? (
                <div
                  className="prose prose-invert prose-sm max-w-none break-words text-foreground"
                  dangerouslySetInnerHTML={{ __html: renderColumnContent(column) }}
                />
              ) : (
                <p className="text-[13px] italic text-slate-600">Nothing to preview yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
