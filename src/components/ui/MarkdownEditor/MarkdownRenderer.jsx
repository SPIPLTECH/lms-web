"use client";

import "highlight.js/styles/vs2015.css";

import { useMemo } from "react";

import { renderMarkdownToSafeHtml } from "@/lib/markdown";

/**
 * Renders a Markdown source string (Module/Lesson/Topic `description`, or a
 * Content text block's `htmlContent`) as sanitized HTML. Legacy rows that
 * still hold raw HTML from the old Quill editor render correctly too —
 * `marked` passes untouched HTML blocks straight through, so no per-row
 * migration is needed. Single shared render path for every "view mode" of
 * Markdown content across the Composer and the student learning view.
 *
 * `renderedHtml` (optional) is that same render, already produced by the
 * caller from `source` — the student read-aloud reader passes the output of
 * renderMarkdownToSafeHtml with sentence spans added (lib/speechDocument.js)
 * so it can highlight what's being spoken. Omitted everywhere else.
 */
export default function MarkdownRenderer({ source, renderedHtml, className = "", emptyText = "No content yet." }) {
  const html = useMemo(
    () => (source ? renderedHtml ?? renderMarkdownToSafeHtml(source) : ""),
    [source, renderedHtml]
  );

  // The same element instance for the same HTML, so a parent re-render never
  // re-assigns innerHTML (React 19 does whenever the __html object is new).
  // That reset would wipe DOM state inside the content — a text selection,
  // or the read-aloud highlight class on the sentence being spoken.
  const body = useMemo(() => <div dangerouslySetInnerHTML={{ __html: html }} />, [html]);

  if (!source) {
    return <p className="text-sm italic text-muted-foreground">{emptyText}</p>;
  }

  // max-w-none is the default (existing callers rely on filling whatever
  // container they're in) — but it's a Tailwind utility, so appending a
  // caller-supplied max-w-* class alongside it would be a genuine CSS
  // conflict (both are single-class selectors of equal specificity; the
  // winner depends on Tailwind's generated stylesheet order, not source
  // order in this string). A caller that wants a real reading-width cap
  // passes its own max-w-* via className, replacing the default entirely.
  const widthClass = className || "max-w-none";

  return (
    <div className={`md-prose prose prose-base w-full max-w-full min-w-0 break-words [overflow-wrap:anywhere] ${widthClass}`}>
      <style>{`
        .md-prose {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .md-prose h1 {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--foreground);
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          letter-spacing: -0.02em;
          line-height: 1.3;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .md-prose h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          letter-spacing: -0.01em;
          padding-bottom: 0.375rem;
          border-bottom: 1px solid var(--border);
          line-height: 1.35;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .md-prose h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--foreground);
          margin-top: 1.25rem;
          margin-bottom: 0.625rem;
          letter-spacing: -0.01em;
          line-height: 1.4;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .md-prose h4, .md-prose h5, .md-prose h6 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--foreground);
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        @media (max-width: 640px) {
          .md-prose h1 {
            font-size: 1.5rem;
            margin-top: 1.125rem;
            margin-bottom: 0.5rem;
          }
          .md-prose h2 {
            font-size: 1.25rem;
            margin-top: 1.125rem;
            margin-bottom: 0.5rem;
          }
          .md-prose h3 {
            font-size: 1.125rem;
            margin-top: 1rem;
            margin-bottom: 0.375rem;
          }
          .md-prose h4, .md-prose h5, .md-prose h6 {
            font-size: 1.0625rem;
            margin-top: 0.875rem;
            margin-bottom: 0.375rem;
          }
        }
        .md-prose p {
          color: var(--muted-foreground);
          line-height: 1.7;
          margin-bottom: 0.875rem;
          font-size: 1.0625rem;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .md-prose p:last-child {
          margin-bottom: 0;
        }
        .md-prose strong, .md-prose b {
          color: var(--foreground);
          font-weight: 600;
        }
        .md-prose ul, .md-prose ol {
          padding-left: 1.25rem;
          margin-top: 0.5rem;
          margin-bottom: 0.875rem;
        }
        @media (max-width: 640px) {
          .md-prose ul, .md-prose ol {
            padding-left: 1rem;
          }
        }
        .md-prose ul { list-style-type: disc; }
        .md-prose ol { list-style-type: decimal; }
        .md-prose li {
          color: var(--muted-foreground);
          margin-bottom: 0.375rem;
          line-height: 1.6;
          font-size: 1.0625rem;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .md-prose blockquote {
          border-left: 3px solid var(--primary);
          padding-left: 1rem;
          margin-top: 1rem;
          margin-bottom: 1rem;
          font-style: italic;
          color: var(--muted-foreground);
          background-color: color-mix(in oklab, var(--primary) 6%, transparent);
          border-radius: 0 0.5rem 0.5rem 0;
          max-width: 100%;
          box-sizing: border-box;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        @media (max-width: 640px) {
          .md-prose blockquote {
            padding-left: 0.75rem;
          }
        }
        .md-prose a {
          color: var(--primary);
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: opacity 0.15s ease;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .md-prose a:hover { opacity: 0.8; }
        .md-prose a:empty { display: none; }
        .md-prose hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 1.5rem 0;
        }
        .md-prose code {
          color: var(--primary);
          background-color: color-mix(in oklab, var(--foreground) 12%, transparent);
          border-radius: 0.25rem;
          padding: 0.125rem 0.375rem;
          font-size: 0.85em;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .md-prose code::before, .md-prose code::after {
          content: none;
        }
        .md-prose pre {
          margin-top: 1rem;
          margin-bottom: 1rem;
          padding: 1rem 1.125rem;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background-color: #1E1E1E !important;
          overflow-x: auto;
          max-width: 100%;
          -webkit-overflow-scrolling: touch;
        }
        .md-prose pre code {
          color: inherit;
          background-color: transparent;
          padding: 0;
          border-radius: 0;
          font-size: 0.9375rem;
          line-height: 1.6;
          white-space: pre;
          overflow-wrap: normal;
          word-break: normal;
        }
        .md-prose .md-table-wrapper {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          margin-top: 1.25rem;
          margin-bottom: 1.25rem;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background-color: var(--card);
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: color-mix(in oklab, var(--primary) 40%, var(--border)) transparent;
        }
        .md-prose .md-table-wrapper::-webkit-scrollbar {
          height: 5px;
        }
        .md-prose .md-table-wrapper::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 9999px;
        }
        .md-prose .md-table-wrapper::-webkit-scrollbar-thumb {
          background-color: color-mix(in oklab, var(--primary) 40%, var(--border));
          border-radius: 9999px;
        }
        .md-prose .md-table-wrapper::-webkit-scrollbar-thumb:hover {
          background-color: var(--primary);
        }
        .md-prose .md-table-wrapper table, .md-prose table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 0;
          border: none;
          background-color: var(--card);
          display: table;
          min-width: max-content;
        }
        @media (min-width: 641px) {
          .md-prose .md-table-wrapper table, .md-prose table {
            min-width: 100%;
          }
        }
        .md-prose img {
          display: block;
          max-width: 100%;
          height: auto;
          margin-left: auto;
          margin-right: auto;
          margin-top: 1rem;
          margin-bottom: 1rem;
          border-radius: 0.5rem;
        }
        .md-prose th {
          background-color: var(--muted);
          color: var(--primary);
          font-weight: 700;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border);
          text-align: left;
        }
        .md-prose td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border);
          color: var(--card-foreground);
          font-size: 1rem;
        }
        .md-prose tr:last-child td { border-bottom: none; }
        .md-prose tr:hover td { background-color: var(--muted); }
      `}</style>
      {body}
    </div>
  );
}
