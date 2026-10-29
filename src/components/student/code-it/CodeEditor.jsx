"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { javascript } from "@codemirror/lang-javascript";
import { useTheme } from "next-themes";

// C uses the C++ grammar — it highlights C correctly.
const LANGUAGE_EXTENSIONS = {
  java: java,
  python: python,
  c: cpp,
  cpp: cpp,
  js: javascript,
};

/**
 * Code-IT's code editor (CodeMirror 6). Loaded client-only by its callers
 * (next/dynamic, ssr: false) — CodeMirror needs the DOM.
 * `fill`: stretch to the parent's height (still at least `minHeight`).
 * `actions`: rendered on the right of the file-name bar (Run, Submit, …).
 */
export default function CodeEditor({ language, value, onChange, fileName, actions = null, minHeight = "320px", fill = false }) {
  const { resolvedTheme } = useTheme();
  const extensions = useMemo(() => {
    const ext = LANGUAGE_EXTENSIONS[language];
    return ext ? [ext()] : [];
  }, [language]);

  return (
    <div className={`rounded-xl border border-border overflow-hidden bg-card ${fill ? "flex h-full flex-col" : ""}`}>
      {(fileName || actions) && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border bg-muted/40 px-3 py-1">
          <span className="font-mono text-[11px] text-muted-foreground">{fileName}</span>
          {actions && <div className="flex flex-wrap items-center gap-0.5">{actions}</div>}
        </div>
      )}
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        minHeight={minHeight}
        height={fill ? "100%" : undefined}
        basicSetup={{ tabSize: 4, foldGutter: false }}
        className={`text-sm ${fill ? "flex-1 min-h-0" : ""}`}
      />
    </div>
  );
}
