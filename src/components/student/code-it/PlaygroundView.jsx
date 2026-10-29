"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Play, RotateCcw, Sparkles } from "lucide-react";
import { useRunCode } from "@/hooks/queries/student/useCodeIt";
import { codeItErrorMessage } from "@/services/codeIt.service";
import OutputPanel from "./OutputPanel";
import AiTutorPanel from "./AiTutorPanel";
import TextAction from "./TextAction";

const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => <div className="h-96 rounded-xl border border-border bg-card" />,
});

// Per-viewer convenience only: the last playground code per language.
const storageKey = (lang) => `codeit:playground:${lang}`;
const readSaved = (lang) => {
  try {
    return localStorage.getItem(storageKey(lang));
  } catch {
    return null;
  }
};
const writeSaved = (lang, code) => {
  try {
    localStorage.setItem(storageKey(lang), code);
  } catch {
    /* storage unavailable — nothing to keep */
  }
};

/** Playground mode: write and run anything in the chosen language. */
export default function PlaygroundView({ language }) {
  const [code, setCode] = useState(null);
  const [stdin, setStdin] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [output, setOutput] = useState({ result: null, error: null });
  const run = useRunCode();

  // Language switch: load that language's saved code (or its starter).
  useEffect(() => {
    setCode(readSaved(language.id) ?? language.starter);
    setOutput({ result: null, error: null });
  }, [language.id, language.starter]);

  const onChange = (value) => {
    setCode(value);
    writeSaved(language.id, value);
  };

  const onRun = () =>
    run.mutate(
      { language: language.id, code, stdin },
      {
        onSuccess: (result) => setOutput({ result, error: null }),
        onError: (err) => setOutput({ result: null, error: codeItErrorMessage(err) }),
      }
    );

  if (code === null) return null;

  return (
    // md+: fills the page's remaining height; xl: editor | input+output side by side.
    <div className="grid gap-3 md:h-full md:min-h-0 md:overflow-y-auto xl:grid-cols-[minmax(0,1fr)_320px] xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden">
      <div className="min-w-0 xl:h-full xl:min-h-0">
        <CodeEditor
          language={language.id}
          value={code}
          onChange={onChange}
          fileName={language.fileName}
          minHeight="420px"
          fill
          actions={
            <>
              <TextAction icon={Play} tone="primary" onClick={onRun} loading={run.isPending}>Run</TextAction>
              <TextAction icon={RotateCcw} onClick={() => onChange(language.starter)} disabled={run.isPending}>Reset</TextAction>
              <TextAction icon={Sparkles} tone="button" onClick={() => setAiOpen(true)}>Ask AI</TextAction>
            </>
          }
        />
      </div>

      <div className="min-w-0 flex flex-col gap-3 xl:h-full xl:min-h-0">
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Input (stdin)</span>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={4}
            spellCheck={false}
            placeholder="Input your program reads"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary/50"
          />
        </label>
        <div className="xl:flex-1 xl:min-h-0">
          <OutputPanel result={output.result} error={output.error} pending={run.isPending} fill />
        </div>
      </div>

      <AiTutorPanel open={aiOpen} onOpenChange={setAiOpen} language={language.id} code={code} />
    </div>
  );
}
