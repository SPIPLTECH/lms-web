/**
 * Slide data model: Presentation -> Slide -> Columns -> Markdown/HTML.
 * Each slide is a fixed set of 1-4 side-by-side columns, each independently
 * authored as Markdown or raw HTML. There is no positioned-element canvas
 * mode anymore — the instructor writes content and the renderer lays it
 * out, never drag/resize to place text or images.
 *
 * This is persisted through the existing `Content` row's `htmlContent`
 * field (a plain String, already unrestricted by the API) as JSON — no
 * backend/schema change. See the "PowerPoint-Style Slide Canvas" and
 * "Align Presentation Composer With Markdown-Based Architecture"
 * investigations for why.
 */

/** Slide-level property, not a global presentation setting — each slide has its own. */
export const DEFAULT_SLIDE_BACKGROUND = "#000000";

export const SLIDE_BACKGROUND_PRESETS: { label: string; value: string }[] = [
  { label: "Black", value: "#000000" },
  { label: "White", value: "#ffffff" },
  { label: "Dark Gray", value: "#1e293b" },
  { label: "Light Gray", value: "#e2e8f0" },
  { label: "Navy", value: "#172554" },
];

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.trim());
}

export type ColumnContentType = "markdown" | "html";

export interface SlideColumn {
  id: string;
  contentType: ColumnContentType;
  content: string;
}

export const MIN_SLIDE_COLUMNS = 1;
export const MAX_SLIDE_COLUMNS = 4;

export interface SlideItemV2 {
  id: string;
  title: string;
  /** Slide-level property (not an element, not a global presentation setting) — each slide has its own. */
  backgroundColor: string;
  columns: SlideColumn[];
}

/**
 * Shapes a slide could have been saved in before this Markdown-only model:
 * the original pre-canvas `{content, mediaUrl}` blob, or the later
 * positioned-element canvas `{elements: [{type, text, sourceUrl, x, y}]}`.
 * Only used as a typed read of old JSON inside adaptLegacySlide — nothing
 * in the current editor/renderer produces this shape anymore.
 */
interface LegacyCanvasElement {
  type?: string;
  text?: string;
  sourceUrl?: string;
  x?: number;
  y?: number;
}

interface LegacySlideItem {
  id: string;
  title: string;
  content?: string;
  mediaUrl?: string;
  elements?: LegacyCanvasElement[];
  backgroundColor?: string;
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

export function createColumn(overrides: Partial<SlideColumn> = {}): SlideColumn {
  return {
    id: nextId("col"),
    contentType: "markdown",
    content: "",
    ...overrides,
  };
}

/**
 * Starter deck for a brand-new presentation — one slide with a single
 * Markdown column pre-filled with a short template, so the instructor
 * lands directly on a text editor with a live preview.
 */
export function createDefaultSlideDeck(): SlideItemV2[] {
  return [
    {
      id: nextId("slide"),
      title: "Slide 1",
      backgroundColor: DEFAULT_SLIDE_BACKGROUND,
      columns: [
        createColumn({
          content: "# Slide title\n\nStart writing your content here. **Markdown** is supported.",
        }),
      ],
    },
  ];
}

/**
 * Converts whatever shape a saved slide is in — current columns format, the
 * older positioned-element canvas, or the original pre-canvas
 * `content`/`mediaUrl` blob — into the current columns-only shape, so
 * nothing already authored disappears when this slide is next opened.
 *
 * The canvas shape can't be converted losslessly: columns are a flow
 * layout, not a 2D canvas, so exact x/y position, font size, color, and
 * alignment can't carry over. What *is* preserved is the actual content —
 * every text element's text and every image element's URL, in top-to-bottom
 * (then left-to-right) order, folded into one Markdown column. The
 * instructor can re-split it into multiple columns afterward if needed.
 */
/**
 * Parses a Content row's `htmlContent` as a persisted slide deck (the JSON
 * array this model is stored as — see the file header) and upgrades every
 * slide through adaptLegacySlide. Returns [] for anything that isn't a JSON
 * array — including the pre-Composer-v2 raw-HTML slide format, which is a
 * plain string that never starts with "[" — so callers can tell "no slides
 * here" apart from "old-format content" and fall back accordingly.
 */
export function parseSlideDeckJson(raw: string | null | undefined): SlideItemV2[] {
  const text = raw || "";
  try {
    if (text.trim().startsWith("[")) {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map(adaptLegacySlide);
      }
    }
  } catch {
    // fall through
  }
  return [];
}

function adaptLegacySlide(slide: SlideItemV2 | LegacySlideItem): SlideItemV2 {
  const anySlide = slide as SlideItemV2 & LegacySlideItem;
  const backgroundColor = isValidHexColor(anySlide.backgroundColor || "")
    ? (anySlide.backgroundColor as string)
    : DEFAULT_SLIDE_BACKGROUND;

  if (Array.isArray(anySlide.columns)) {
    return {
      id: anySlide.id,
      title: anySlide.title,
      backgroundColor,
      columns: anySlide.columns,
    };
  }

  const parts: string[] = [];
  if (Array.isArray(anySlide.elements)) {
    const sorted = [...anySlide.elements].sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0));
    for (const el of sorted) {
      if (el.type === "text" && el.text) parts.push(el.text);
      if (el.type === "image" && el.sourceUrl) parts.push(`![](${el.sourceUrl})`);
    }
  } else {
    if (anySlide.content) parts.push(anySlide.content);
    if (anySlide.mediaUrl) parts.push(`![](${anySlide.mediaUrl})`);
  }

  return {
    id: anySlide.id,
    title: anySlide.title || "Slide",
    backgroundColor,
    columns: [createColumn({ content: parts.join("\n\n") })],
  };
}
