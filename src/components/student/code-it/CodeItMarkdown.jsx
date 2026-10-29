"use client";

import MarkdownRenderer from "@/components/ui/MarkdownEditor/MarkdownRenderer";

/**
 * The shared MarkdownRenderer with compact spacing for Code-IT's small panes
 * (problem statement, lesson, AI answers). Its default typography is sized
 * for full lesson pages — 17px text, 1.7 line height, roomy margins — which
 * leaves a short problem statement mostly empty space. Scoped by
 * `.codeit-md`, so no other page changes.
 */
export default function CodeItMarkdown({ source }) {
  return (
    <div className="codeit-md">
      <style>{`
        .codeit-md .md-prose p,
        .codeit-md .md-prose li {
          font-size: 0.875rem;
          line-height: 1.55;
        }
        .codeit-md .md-prose p { margin: 0 0 0.5rem; }
        .codeit-md .md-prose ul,
        .codeit-md .md-prose ol { margin: 0.25rem 0 0.5rem; }
        .codeit-md .md-prose li { margin-bottom: 0.125rem; }
        .codeit-md .md-prose h1,
        .codeit-md .md-prose h2,
        .codeit-md .md-prose h3,
        .codeit-md .md-prose h4 {
          font-size: 0.9375rem;
          margin: 0.75rem 0 0.375rem;
          padding-bottom: 0;
          border-bottom: 0;
        }
        .codeit-md .md-prose pre {
          margin: 0.375rem 0 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          line-height: 1.45;
          border-radius: 0.5rem;
        }
        .codeit-md .md-prose code { font-size: 0.8125rem; }
        .codeit-md .md-prose > div > :first-child { margin-top: 0; }
        .codeit-md .md-prose > div > :last-child { margin-bottom: 0; }
      `}</style>
      <MarkdownRenderer source={source} />
    </div>
  );
}
