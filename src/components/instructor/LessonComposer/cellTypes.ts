import {
  ClipboardCheck,
  File,
  FileText,
  Heading,
  Image,
  Link2,
  MonitorPlay,
  Presentation,
  Video,
  type LucideIcon,
} from "lucide-react";


/**
 * Mirrors the subset of the backend `ContentType` enum (prisma/schema.prisma,
 * lms-api) that the Lesson Composer can currently produce. Each cell is
 * persisted as one `Content` row via the existing `/contents` endpoints —
 * there is no separate "block" storage.
 *
 * Heading, Image, and PDF do NOT have their own backend `ContentType` value
 * reachable through this API today (the Joi allow-list only permits
 * VIDEO | DOCUMENT | PRESENTATION | HTML | LINK on create/update). Rather
 * than blocking on a backend change, they're adapted onto an already-allowed
 * type: Heading and Image are stored as `HTML` (a recognizable marker class
 * — see `htmlCellVariant.ts` — lets the composer tell them apart from plain
 * Text after reloading), and PDF is stored as `DOCUMENT` (identical
 * upload/viewer behavior already exists for that type). This is a frontend
 * adaptation only; no backend code changes.
 */
export type ContentType =
  | "HTML"
  | "VIDEO"
  | "LINK"
  | "EMBED"
  | "DOCUMENT"
  | "PRESENTATION"
  | "ASSIGNMENT";

export type CellTypeId =
  | "text"
  | "heading"
  | "image"
  | "video"
  | "link"
  | "interactive"
  | "document"
  | "presentation"
  | "pdf"
  | "assignment"
  // Not a real Content row (see the note below CELL_TYPES) — a Quiz attaches
  // to the topic's parent Lesson instead, so it's only ever an id in this
  // union for the Add Content picker to reference, never registered in
  // CELL_TYPES/getCellTypeForContent.
  | "quiz";

export interface CellTypeDefinition {
  id: CellTypeId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** The backend `Content.type` value this cell is saved as. */
  contentType: ContentType;
  /**
   * Whether creating/editing this cell actually works against the live API
   * today. `false` means there is no reachable adaptation — the backend
   * itself must change before this cell can be built (see the migration
   * report's API Gap Analysis / Risk Analysis).
   */
  supportedByApiToday: boolean;
}

export const CELL_TYPES: CellTypeDefinition[] = [
  {
    id: "text",
    label: "Text",
    description: "Rich formatted text — paragraphs, lists, quotes.",
    icon: FileText,
    contentType: "HTML",
    supportedByApiToday: true,
  },
  {
    id: "heading",
    label: "Heading",
    description: "A section heading.",
    icon: Heading,
    contentType: "HTML",
    supportedByApiToday: true,
  },
  {
    id: "image",
    label: "Image",
    description: "A single image with an optional caption.",
    icon: Image,
    contentType: "HTML",
    supportedByApiToday: true,
  },
  {
    id: "video",
    label: "Video",
    description: "An uploaded video file or a YouTube/Vimeo link.",
    icon: Video,
    contentType: "VIDEO",
    supportedByApiToday: true,
  },
  {
    id: "link",
    label: "Link",
    description: "A link out to an external resource.",
    icon: Link2,
    contentType: "LINK",
    supportedByApiToday: true,
  },
  {
    id: "interactive",
    label: "Interactive Embed",
    description: "An embedded interactive widget or simulation (iframe).",
    icon: MonitorPlay,
    contentType: "EMBED",
    supportedByApiToday: false,
  },
  {
    id: "document",
    label: "Document",
    description: "An uploaded document (Word, Excel, etc.) viewed in-browser.",
    icon: FileText,
    contentType: "DOCUMENT",
    supportedByApiToday: true,
  },
  {
    id: "presentation",
    label: "Presentation",
    description: "An uploaded slide deck viewed in-browser.",
    icon: Presentation,
    contentType: "PRESENTATION",
    supportedByApiToday: true,
  },
  {
    id: "pdf",
    label: "PDF / File",
    description: "An uploaded PDF or other file, viewed natively in the browser.",
    icon: File,
    contentType: "DOCUMENT",
    supportedByApiToday: true,
  },
  {
    id: "assignment",
    label: "Assignment",
    description: "A descriptive assignment with instructions and an optional reference file — not a quiz.",
    icon: ClipboardCheck,
    contentType: "ASSIGNMENT",
    supportedByApiToday: true,
  },
];

// Quiz appears in the Add Content picker (AddCellModal) but is intentionally
// NOT registered here — a Quiz isn't a Content row at all, it's a separate
// Quiz entity that attaches directly to a Topic via Quiz.topicId (mirroring
// the existing Module-quiz/Lesson-quiz attachment). Picking "Quiz" hands off
// to that topic-quiz creation flow (LessonComposerPanel's onAddQuiz) instead
// of going through SIMPLE_FORMS/getCellTypeForContent like every other cell
// type here. Slideshow (Marp) is still deferred — needs a new dependency
// (@marp-team/marp-core). "interactive" IS registered but stays
// unsupported — unlike Heading/Image/PDF above, there's no reachable
// adaptation for it: the backend's HTML sanitizer (src/utils/sanitizer.js)
// hard-restricts <iframe src> to youtube.com/vimeo.com hostnames only, so an
// arbitrary embed URL would be silently stripped server-side even if sent
// as HTML content. That's a backend change (widening the sanitizer's
// allowedIframeHostnames), not something this composer can work around.
