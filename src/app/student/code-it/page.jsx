"use client";

import { useState } from "react";
import { FlaskConical, TerminalSquare } from "lucide-react";
import { FaJava, SiPython, SiC, SiCplusplus, SiJavascript } from "@/components/ui/reactIcons";
import Loader from "@/components/common/Loader";
import EmptyState from "@/components/ui/EmptyState";
import { useCodeItLanguages } from "@/hooks/queries/student/useCodeIt";
import { codeItErrorMessage } from "@/services/codeIt.service";
import LabView from "@/components/student/code-it/LabView";
import PlaygroundView from "@/components/student/code-it/PlaygroundView";

// Language logos, drawn in the current text colour (theme tokens, no brand colours).
const LANGUAGE_ICONS = { java: FaJava, python: SiPython, c: SiC, cpp: SiCplusplus, js: SiJavascript };

// Shared look of the two segmented controls (language, mode).
const segment = (active) =>
  `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
  }`;

const MODES = [
  { id: "lab", label: "Lab", icon: FlaskConical },
  { id: "playground", label: "Playground", icon: TerminalSquare },
];

/** Code-IT: coding lab and playground (served by code-it-service). */
export default function CodeItPage() {
  const { data: languages, isLoading, isError, error } = useCodeItLanguages();
  const [mode, setMode] = useState("lab");
  const [languageId, setLanguageId] = useState("python");

  const language = languages?.find((l) => l.id === languageId) ?? languages?.[0];

  return (
    // Fills the full-viewport frame the student layout gives this route; the
    // view below takes all remaining height (md and up).
    <div className="flex flex-1 min-h-0 flex-col">
      {/* One compact row: title | language tabs | mode. PageHeader only has a
          left and a right slot, and a second row would cost editor height. */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground">Code-IT</h1>
          <p className="text-xs text-muted-foreground">Learn by coding — Java, Python, C, C++ and JavaScript.</p>
        </div>

        {language && (
          <div className="flex min-w-0 gap-0.5 overflow-x-auto rounded-xl border border-border p-1 scrollbar-hide" role="tablist" aria-label="Language">
            {languages.map((l) => {
              const Icon = LANGUAGE_ICONS[l.id];
              return (
                <button
                  key={l.id}
                  type="button"
                  role="tab"
                  aria-selected={l.id === language.id}
                  onClick={() => setLanguageId(l.id)}
                  className={segment(l.id === language.id)}
                >
                  {Icon && <Icon size={14} />} {l.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="ml-auto flex gap-0.5 rounded-xl border border-border p-1">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={segment(mode === id)}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="py-16"><Loader /></div>}
      {isError && <EmptyState message={codeItErrorMessage(error)} />}

      {language && (
        <div className="flex-1 min-h-0">
          {mode === "lab" ? <LabView language={language} /> : <PlaygroundView language={language} />}
        </div>
      )}
    </div>
  );
}
