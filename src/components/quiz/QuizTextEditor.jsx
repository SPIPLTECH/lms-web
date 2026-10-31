"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Code, ImagePlus, Loader2, SquareCode } from "lucide-react";

import QuizRichText from "@/components/quiz/QuizRichText";
import { isRichQuizText, QUIZ_CODE_LANGUAGES } from "@/lib/quizText";
import { uploadFileToBlob } from "@/services/blobUpload.service";

const INDENT = "    ";

const IMAGE_TYPES = ".jpg,.jpeg,.png,.webp,.gif";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Whether a position falls inside an open ``` block — where Tab indents
// code instead of leaving the field.
const insideCodeBlock = (text, position) => (text.slice(0, position).match(/^```/gm) || []).length % 2 === 1;

const TOOL_BUTTON =
  "inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[12px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer";

/**
 * The text box for quiz question, option, explanation and hint text. Plain
 * text stays plain; the toolbar writes the little Markdown quiz text
 * understands (lib/quizText.js): **bold**, `code`, ``` code blocks with a
 * language, so a question can carry a coloured snippet, and images, uploaded
 * from here. Once the text holds any of it, a preview shows it exactly as the
 * student will see it.
 *
 * Grows with its content. Inside a code block, Tab indents (4 spaces)
 * instead of moving on; Ctrl/⌘+B bolds the selection. `variant` "option"
 * keeps the box one line high with the toolbar shown only while it is in
 * use, since a question has several.
 *
 * `className` styles the <textarea> itself, so each form keeps its look.
 */
export default function QuizTextEditor({
  value,
  onChange,
  variant = "body",
  minRows,
  placeholder,
  maxLength,
  required = false,
  ariaLabel,
  className = "",
}) {
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const text = value ?? "";
  const isOption = variant === "option";

  // An upload ends long after its click: by then the author may have typed
  // on, here or elsewhere in the form, so it must edit what is there now.
  const latest = useRef({ text, onChange });
  useEffect(() => {
    latest.current = { text, onChange };
  });

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  // Applies one edit to the current selection, then puts the caret (or the
  // new selection) where the edit says. False when the edit doesn't fit.
  const edit = (build) => {
    const el = textareaRef.current;
    if (!el) return false;
    const { next, selStart, selEnd } = build(latest.current.text, el.selectionStart, el.selectionEnd);
    if (maxLength && next.length > maxLength) return false;
    latest.current.onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
    return true;
  };

  const wrap = (marker, placeholderText) =>
    edit((current, start, end) => {
      const selected = current.slice(start, end) || placeholderText;
      return {
        next: current.slice(0, start) + marker + selected + marker + current.slice(end),
        selStart: start + marker.length,
        selEnd: start + marker.length + selected.length,
      };
    });

  const insertCodeBlock = (language) =>
    edit((current, start, end) => {
      const selected = current.slice(start, end) || "code";
      const before = start > 0 && current[start - 1] !== "\n" ? "\n" : "";
      const after = end < current.length && current[end] !== "\n" ? "\n" : "";
      const open = `${before}\`\`\`${language}\n`;
      return {
        next: current.slice(0, start) + open + selected + "\n```" + after + current.slice(end),
        selStart: start + open.length,
        selEnd: start + open.length + selected.length,
      };
    });

  // On a line of its own after the selection, which stays as it is.
  const insertImage = (url) =>
    edit((current, _start, end) => {
      const before = end > 0 && current[end - 1] !== "\n" ? "\n" : "";
      const after = end < current.length && current[end] !== "\n" ? "\n" : "";
      const image = `${before}![Image](${url})`;
      const caret = end + image.length;
      return { next: current.slice(0, end) + image + after + current.slice(end), selStart: caret, selEnd: caret };
    });

  const handleImageChosen = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("The image must be 10 MB or smaller.");
      return;
    }

    setImageError("");
    setIsUploading(true);
    try {
      const { url } = await uploadFileToBlob(file);
      if (!insertImage(url)) setImageError("There is no room left in this text for the image.");
    } catch (error) {
      setImageError(error?.message || "The image could not be uploaded. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      wrap("**", "bold text");
      return;
    }
    if (event.key === "Tab" && !event.shiftKey && insideCodeBlock(text, event.currentTarget.selectionStart)) {
      event.preventDefault();
      edit((current, start, end) => ({
        next: current.slice(0, start) + INDENT + current.slice(end),
        selStart: start + INDENT.length,
        selEnd: start + INDENT.length,
      }));
    }
  };

  // Above a question's box; below an option's, where appearing on focus
  // doesn't push the line being clicked.
  const toolbar = (
    <div
      className={`${isOption && !isUploading ? "hidden group-focus-within:flex" : "flex"} flex-wrap items-center gap-0.5`}
      role="toolbar"
      aria-label="Formatting"
    >
      <button type="button" className={TOOL_BUTTON} onClick={() => wrap("**", "bold text")} title="Bold (Ctrl+B)">
        <Bold size={13} aria-hidden /> <span className="sr-only">Bold</span>
      </button>
      <button type="button" className={TOOL_BUTTON} onClick={() => wrap("`", "code")} title="Inline code">
        <Code size={13} aria-hidden /> <span className="sr-only">Inline code</span>
      </button>
      <label className={`${TOOL_BUTTON} relative`} title="Insert a code block">
        <SquareCode size={13} aria-hidden />
        <span>Code block</span>
        <select
          value=""
          onChange={(event) => insertCodeBlock(event.target.value === "plain" ? "" : event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Insert a code block in language"
        >
          <option value="" disabled>
            Language…
          </option>
          {QUIZ_CODE_LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
          <option value="plain">Plain text (no colours)</option>
        </select>
      </label>
      <button
        type="button"
        className={`${TOOL_BUTTON} disabled:cursor-wait disabled:opacity-60`}
        onClick={() => imageInputRef.current?.click()}
        disabled={isUploading}
        title="Insert an image (JPG, PNG, WebP or GIF, up to 10 MB)"
      >
        {isUploading ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <ImagePlus size={13} aria-hidden />}
        <span>{isUploading ? "Uploading…" : "Image"}</span>
      </button>
    </div>
  );

  return (
    <div className="group min-w-0 flex-1 space-y-1">
      {!isOption && toolbar}

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={minRows ?? (isOption ? 1 : 3)}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        aria-label={ariaLabel}
        spellCheck={!text.includes("```")}
        className={`resize-none overflow-hidden ${className}`}
      />

      {isOption && toolbar}

      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_TYPES}
        onChange={handleImageChosen}
        className="hidden"
        aria-label="Choose an image"
      />

      {imageError && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {imageError}
        </p>
      )}

      {isRichQuizText(text) && (
        <div className="rounded-lg border border-dashed border-border bg-background/60 p-2.5">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Student view</p>
          <div className="text-sm text-foreground">
            <QuizRichText text={text} variant={isOption ? "option" : "body"} />
          </div>
        </div>
      )}
    </div>
  );
}
