"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Circle, Play, CircleCheckBig, RotateCcw, Lightbulb, Sparkles, BookOpen, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Loader from "@/components/common/Loader";
import EmptyState from "@/components/ui/EmptyState";
import CodeItMarkdown from "./CodeItMarkdown";
import CodeAnalysis from "./CodeAnalysis";
import { useConfirm } from "@/context/ConfirmContext";
import {
  useCodeItTopics,
  useCodeItExercise,
  useSaveCodeItDraft,
  useRunCodeItExercise,
  useSubmitCodeItExercise,
} from "@/hooks/queries/student/useCodeIt";
import { getCodeItSolution, codeItErrorMessage } from "@/services/codeIt.service";
import OutputPanel from "./OutputPanel";
import AiTutorPanel from "./AiTutorPanel";
import TextAction from "./TextAction";

const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => <div className="h-80 rounded-xl border border-border bg-card" />,
});

const DRAFT_SAVE_DELAY_MS = 1500;

// Per-viewer convenience: whether the topic sidebar is collapsed.
const SIDEBAR_KEY = "codeit:sidebar-collapsed";
const readCollapsed = () => {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
};

/** Lab mode: collapsible topic list for one language + the selected exercise. */
export default function LabView({ language }) {
  const { data: topics, isLoading, isError, error } = useCodeItTopics(language.id);
  const [exerciseId, setExerciseId] = useState(null);
  // Read once on mount; the grid only renders after topics load in the browser.
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggleSidebar = () =>
    setCollapsed((v) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, v ? "0" : "1");
      } catch {
        /* storage unavailable — the choice just isn't remembered */
      }
      return !v;
    });

  // First exercise of the language, until the student picks one.
  const firstId = topics?.[0]?.exercises?.[0]?.id ?? null;
  const activeId = exerciseId && exerciseId.startsWith(`${language.id}.`) ? exerciseId : firstId;

  if (isLoading) return <div className="py-16"><Loader /></div>;
  if (isError) return <EmptyState message={codeItErrorMessage(error)} />;
  if (!topics?.length) return <EmptyState message="No exercises for this language yet." />;

  return (
    // md+: fills the page's remaining height. From lg the topic list and the
    // exercise scroll separately; below lg they stack and scroll together.
    <div
      className={`grid gap-3 md:h-full md:min-h-0 md:overflow-y-auto lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden ${
        collapsed ? "lg:grid-cols-[40px_minmax(0,1fr)]" : "lg:grid-cols-[240px_minmax(0,1fr)]"
      }`}
    >
      <TopicList topics={topics} activeId={activeId} onSelect={setExerciseId} collapsed={collapsed} onToggle={toggleSidebar} />
      {activeId && <ExercisePane key={activeId} exerciseId={activeId} language={language} topics={topics} />}
    </div>
  );
}

function TopicList({ topics, activeId, onSelect, collapsed, onToggle }) {
  if (collapsed) {
    return (
      <nav className="flex rounded-xl border border-border bg-card p-1 lg:h-full lg:flex-col lg:items-center">
        <button
          type="button"
          onClick={onToggle}
          title="Show topics"
          aria-label="Show topics"
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground cursor-pointer"
        >
          <PanelLeftOpen size={16} />
        </button>
        <span className="ml-2 self-center text-[10px] font-black uppercase tracking-widest text-muted-foreground lg:ml-0 lg:mt-3 lg:[writing-mode:vertical-rl]">
          Topics
        </span>
      </nav>
    );
  }

  let lastSection = null;
  return (
    <nav className="rounded-xl border border-border bg-card p-2 lg:h-full lg:overflow-y-auto">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Topics</span>
        <button
          type="button"
          onClick={onToggle}
          title="Hide topics"
          aria-label="Hide topics"
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground cursor-pointer"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>
      {topics.map((t) => {
        const header = t.section !== lastSection ? t.section : null;
        lastSection = t.section;
        return (
          <div key={t.id}>
            {header && (
              <p className="px-2 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{header}</p>
            )}
            <p className="px-2 pt-1 text-sm font-semibold text-foreground">{t.title}</p>
            <ul className="mb-1">
              {t.exercises.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(e.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition cursor-pointer ${
                      e.id === activeId ? "bg-primary/10 text-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                    }`}
                  >
                    {e.solved ? <CheckCircle2 size={14} className="text-success shrink-0" /> : <Circle size={14} className="shrink-0" />}
                    <span className="truncate">{e.n}. {e.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function ExercisePane({ exerciseId, language, topics }) {
  const confirm = useConfirm();
  const { data: exercise, isLoading, isError, error } = useCodeItExercise(exerciseId);
  const [code, setCode] = useState(null);
  const [stdin, setStdin] = useState("");
  const [showLesson, setShowLesson] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  // `checks`: the Code Analysis (syntax / output / concept) of the last Run or Submit.
  const [output, setOutput] = useState({ result: null, verdict: null, checks: null, error: null });

  const saveDraft = useSaveCodeItDraft();
  const run = useRunCodeItExercise();
  const submit = useSubmitCodeItExercise();
  const lastSaved = useRef(null);

  const lesson = useMemo(() => topics.find((t) => t.id === exercise?.topicId)?.lesson, [topics, exercise?.topicId]);

  // Seed the editor once the exercise loads: the saved draft, else the starter.
  useEffect(() => {
    if (exercise && code === null) {
      const initial = exercise.draft ?? exercise.starter;
      lastSaved.current = initial;
      setCode(initial);
      setStdin(exercise.stdin);
    }
  }, [exercise, code]);

  // Autosave the draft shortly after the student stops typing.
  useEffect(() => {
    if (code === null || code === lastSaved.current) return undefined;
    const timer = setTimeout(() => {
      lastSaved.current = code;
      saveDraft.mutate({ exerciseId, code });
    }, DRAFT_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // saveDraft.mutate is stable; depending on saveDraft would re-arm the timer on every save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, exerciseId]);

  if (isLoading || (exercise && code === null)) return <div className="py-16"><Loader /></div>;
  if (isError) return <EmptyState message={codeItErrorMessage(error)} />;

  const busy = run.isPending || submit.isPending;

  const failed = (err) => setOutput({ result: null, verdict: null, checks: null, error: codeItErrorMessage(err) });

  const onRun = () =>
    run.mutate(
      { exerciseId, code, stdin },
      {
        onSuccess: ({ result, checks }) => setOutput({ result, verdict: null, checks, error: null }),
        onError: failed,
      }
    );

  const onSubmit = () =>
    submit.mutate(
      { exerciseId, code },
      {
        onSuccess: ({ passed, result, checks }) => {
          lastSaved.current = code; // the server saved it with the attempt
          setOutput({ result, verdict: { passed }, checks, error: null });
        },
        onError: failed,
      }
    );

  const onReset = async () => {
    const ok = await confirm({ title: "Reset code", message: "Replace your code with the starter code?", confirmText: "Reset" });
    if (ok) setCode(exercise.starter);
  };

  const onSolution = async () => {
    const ok = await confirm({
      title: "Show solution",
      message: "Try it yourself first! Replace your code with the solution?",
      confirmText: "Show solution",
    });
    if (!ok) return;
    try {
      setCode(await getCodeItSolution(exerciseId));
    } catch (err) {
      failed(err);
    }
  };

  return (
    // xl: problem on top, then editor | input+output filling the rest.
    // lg–xl: input+output stack under the editor, so the section scrolls.
    <section className="min-w-0 flex flex-col gap-3 lg:h-full lg:min-h-0 lg:overflow-y-auto xl:overflow-hidden">
      <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-3 xl:max-h-[30vh] xl:overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{exercise.topicTitle}</p>
            <h2 className="flex items-center gap-2 text-base font-bold leading-tight text-foreground">
              {exercise.title}
              {exercise.solved && <CheckCircle2 size={16} className="text-success" aria-label="Solved" />}
            </h2>
          </div>
          {lesson && (
            <TextAction icon={BookOpen} onClick={() => setShowLesson((v) => !v)}>
              {showLesson ? "Hide lesson" : "Lesson"}
            </TextAction>
          )}
        </div>
        {showLesson && (
          <div className="mt-2 rounded-lg border border-border bg-background px-3 py-2">
            <CodeItMarkdown source={lesson} />
          </div>
        )}
        <div className="mt-2">
          <CodeItMarkdown source={exercise.problem} />
        </div>
      </div>

      {/* Editor on the left; Input above Output beside it (stacked below xl,
          where the topic list leaves too little width for two columns). */}
      <div className="grid gap-3 xl:flex-1 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_320px] xl:grid-rows-[minmax(0,1fr)]">
        <CodeEditor
          language={language.id}
          value={code}
          onChange={setCode}
          fileName={language.fileName}
          minHeight="420px"
          fill
          actions={
            <>
              <TextAction icon={Play} tone="primary" onClick={onRun} loading={run.isPending} disabled={busy}>Run</TextAction>
              <TextAction icon={CircleCheckBig} tone="success" onClick={onSubmit} loading={submit.isPending} disabled={busy}>Submit</TextAction>
              <TextAction icon={RotateCcw} onClick={onReset} disabled={busy}>Reset</TextAction>
              <TextAction icon={Lightbulb} onClick={onSolution} disabled={busy}>Solution</TextAction>
              <TextAction icon={Sparkles} tone="button" onClick={() => setAiOpen(true)}>Ask AI</TextAction>
            </>
          }
        />

        <div className="min-w-0 flex flex-col gap-3 xl:h-full xl:min-h-0">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Input (stdin)</span>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={3}
              spellCheck={false}
              placeholder="Input your program reads"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary/50"
            />
            <span className="text-[11px] text-muted-foreground">Used by Run. Submit always uses the exercise&apos;s own input.</span>
          </label>

          <div className="xl:flex-1 xl:min-h-0">
            <OutputPanel
              result={output.result}
              verdict={output.verdict}
              error={output.error}
              pending={busy}
              expected={exercise.expected}
              hints={exercise.hints}
              fill
            />
          </div>
          <div className="shrink-0">
            <CodeAnalysis checks={output.checks} />
          </div>
        </div>
      </div>

      <AiTutorPanel open={aiOpen} onOpenChange={setAiOpen} language={language.id} code={code} />
    </section>
  );
}
