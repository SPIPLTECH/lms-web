"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Compass, Loader2, ShieldCheck, X } from "lucide-react";

import Button from "@/components/ui/Button";
import { TOUR_CHECKLIST, TOUR_STEPS } from "@/lib/studentOnboarding";

export { TOUR_CHECKLIST, TOUR_STEPS };

const ANCHORED = TOUR_STEPS.filter((s) => !s.center).length;

function visibleTarget(name) {
  const nodes = document.querySelectorAll(`[data-tour="${name}"]`);
  for (const node of nodes) {
    const r = node.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return node;
  }
  return null;
}

function findTarget(step) {
  if (!step?.target) return null;
  const direct = visibleTarget(step.target);
  if (direct) return direct;
  // Fallbacks if specific element isn't found
  if (step.key === "locks") {
    // If no locked item on screen, point to the course map container
    return visibleTarget("course-map");
  }
  return null;
}

export default function StudentTour({
  index,
  signals,
  seen,
  lessonMeta = null,
  isNavigating = false,
  onNext,
  onBack,
  onClose,
  onSkip,
  onFinish,
}) {
  const step = TOUR_STEPS[index];
  const coachRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [tapText, setTapText] = useState(null);
  const [tick, setTick] = useState(0);
  const baseline = useRef(0);

  const isQuiz = lessonMeta?.isQuiz;
  const isAssignment = lessonMeta?.isAssignment;
  const isVideo = lessonMeta?.type === "VIDEO";

  let stepTitle = step.title;
  let stepBody = step.body;

  if (step.key === "complete") {
    if (isQuiz) {
      stepTitle = lessonMeta?.quizType === "FINAL" ? "Final Quiz completion" : "Self-Test completion";
      stepBody = lessonMeta?.quizType === "FINAL"
        ? "Final quizzes require a passing score to complete. You can review your score and retry if attempts remain."
        : "Self-Tests verify your understanding. Submitting your answers completes this step.";
    } else if (isAssignment) {
      stepTitle = "Assignment submission";
      stepBody = "Submit your written work or files here. Once submitted, your instructor reviews and grades it.";
    } else if (isVideo) {
      stepTitle = "How videos get done";
      stepBody = "Videos complete automatically when they play to the end. You can also use Mark as Complete to finish immediately.";
    } else {
      stepTitle = "Mark as Complete";
      stepBody = "Review the reading or document material, then tap Mark as Complete to save your progress and unlock the next lesson.";
    }
  }

  // An action step moves on once the action happened (counted from when the
  // step opened).
  useEffect(() => {
    if (step.act) baseline.current = signals[step.act] || 0;
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!step.act || (signals[step.act] || 0) <= baseline.current) return undefined;
    const timer = setTimeout(onNext, 650);
    return () => clearTimeout(timer);
  }, [signals, index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow the page: routes change, drawers open, layouts reflow.
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const timer = setInterval(bump, 300);
    window.addEventListener("resize", bump);
    window.addEventListener("scroll", bump, true);
    return () => {
      clearInterval(timer);
      window.removeEventListener("resize", bump);
      window.removeEventListener("scroll", bump, true);
    };
  }, []);

  const scrolledFor = useRef(null);
  useLayoutEffect(() => {
    if (step.center) {
      setPos(null);
      return;
    }
    const node = findTarget(step);
    if (!node) {
      setPos(null);
      setTapText(null);
      return;
    }
    if (scrolledFor.current !== index) {
      scrolledFor.current = index;
      node.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    setTapText(node.getAttribute("data-tour-tap"));

    const r = node.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 6;
    const gap = 12;
    const ring = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
    const w = Math.min(320, vw - 24);
    const h = coachRef.current ? coachRef.current.offsetHeight : 180;
    const fits = {
      bottom: ring.top + ring.height + gap + h < vh - 8,
      top: ring.top - gap - h > 8,
      right: ring.left + ring.width + gap + w < vw - 8,
      left: ring.left - gap - w > 8,
    };
    const place = ["bottom", "top", "right", "left"].find((p) => fits[p]) || "bottom";
    let top;
    let left;
    if (place === "bottom") { top = ring.top + ring.height + gap; left = r.left + r.width / 2 - w / 2; }
    else if (place === "top") { top = ring.top - gap - h; left = r.left + r.width / 2 - w / 2; }
    else if (place === "right") { left = ring.left + ring.width + gap; top = r.top + r.height / 2 - h / 2; }
    else { left = ring.left - gap - w; top = r.top + r.height / 2 - h / 2; }
    left = Math.max(12, Math.min(left, vw - 12 - w));
    top = Math.max(12, Math.min(top, vh - 12 - h));
    setPos({ ring, top, left, w });
  }, [index, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (step.center) {
    const hello = step.key === "hello";
    return (
      <div className="fixed inset-0 z-[9300] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="student-tour-title">
        <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
          <div className="px-6 pt-6 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
              {hello ? <Compass size={26} aria-hidden="true" /> : <CheckCircle2 size={26} aria-hidden="true" />}
            </div>
            <h2 id="student-tour-title" className="text-xl font-bold text-foreground">
              {hello ? "A one-minute tour of your learning page" : "You're ready to learn"}
            </h2>
            <p className="mx-auto mt-1.5 max-w-[42ch] text-sm text-muted-foreground">
              {hello
                ? "We'll point at the key controls you'll use every day. Some steps ask you to tap; it's safe."
                : "That's the whole rhythm: open the next step, finish it, move on. Replay this tour any time from your profile menu."}
            </p>
            <ul className="mt-4 grid gap-1.5 text-left">
              {TOUR_CHECKLIST.map((item, i) => {
                const done = !hello && seen[item.key];
                return (
                  <li key={item.key} className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2 text-sm text-foreground">
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[11px] font-bold ${done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                      {done ? <Check size={12} aria-hidden="true" /> : i + 1}
                    </span>
                    {item.label}
                  </li>
                );
              })}
            </ul>
            {hello && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-success">
                <ShieldCheck size={14} aria-hidden="true" /> Nothing you tap in the tour changes your progress or plays a video.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 px-5 pb-5 pt-4">
            {hello && (
              <Button variant="ghost" onClick={onSkip || onClose} disabled={isNavigating}>
                Not now
              </Button>
            )}
            <span className="flex-1" />
            <Button
              onClick={hello ? onNext : onFinish}
              disabled={hello && isNavigating}
              className="inline-flex items-center gap-1.5"
            >
              {hello && isNavigating ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Opening workspace...
                </>
              ) : (
                <>
                  {hello ? "Start the tour" : "Start learning"} <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Anchored step: MUST have a measured target position.
  // If target element is not yet in the DOM (e.g. while route is loading or navigating),
  // render nothing so we never show a broken dialog or full dark scrim over a loading spinner.
  if (!pos || !pos.ring) {
    return null;
  }

  const ring = pos.ring;
  const vw = typeof window === "undefined" ? 0 : window.innerWidth;
  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  const stepNo = TOUR_STEPS.slice(1, index + 1).filter((s) => !s.center).length;
  const isLast = TOUR_STEPS[index + 1]?.key === "finish";

  return (
    <>
      {/* Four panels around the spotlight: the control inside it stays
          tappable, everything else is covered. */}
      <div className="fixed left-0 top-0 z-[9300] w-full bg-black/60 transition-opacity duration-200" style={{ height: Math.max(0, ring.top) }} />
      <div className="fixed left-0 z-[9300] w-full bg-black/60 transition-opacity duration-200" style={{ top: ring.top + ring.height, height: Math.max(0, vh - ring.top - ring.height) }} />
      <div className="fixed left-0 z-[9300] bg-black/60 transition-opacity duration-200" style={{ top: ring.top, width: Math.max(0, ring.left), height: ring.height }} />
      <div className="fixed z-[9300] bg-black/60 transition-opacity duration-200" style={{ top: ring.top, left: ring.left + ring.width, width: Math.max(0, vw - ring.left - ring.width), height: ring.height }} />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[9301] rounded-xl border-2 border-link shadow-[0_0_0_5px] shadow-link/30 transition-all duration-200 motion-reduce:transition-none"
        style={ring}
      />

      <div
        ref={coachRef}
        role="dialog"
        aria-labelledby="student-tour-step"
        className="fixed z-[9302] rounded-2xl border border-border bg-card p-4 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ top: pos.top, left: pos.left, width: pos.w }}
      >
        <div className="mb-1.5 flex items-center gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Step {stepNo} of {ANCHORED}
          </span>
          <span className="flex gap-1" aria-hidden="true">
            {Array.from({ length: ANCHORED }, (_, i) => (
              <i key={i} className={`h-1.5 w-1.5 rounded-full ${i + 1 === stepNo ? "bg-primary" : i + 1 < stepNo ? "bg-primary/50" : "bg-border"}`} />
            ))}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tour"
            className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
        <h4 id="student-tour-step" className="text-base font-bold text-foreground">{stepTitle}</h4>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{stepBody}</p>
        {tapText && (
          <p className="mt-2.5 flex items-center gap-2 rounded-lg bg-link/10 px-2.5 py-1.5 text-xs font-semibold text-link">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-link" aria-hidden="true" />
            {tapText}
          </p>
        )}
        {step.safe && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-success">
            <ShieldCheck size={13} aria-hidden="true" /> Paused during the tour; tapping it saves nothing.
          </p>
        )}
        <div className="mt-3 flex items-center gap-1.5">
          <Button variant="ghost" className="min-h-9 px-2.5 text-sm" onClick={onBack} disabled={index <= 1}>
            Back
          </Button>
          <span className="flex-1" />
          <Button variant="ghost" className="min-h-9 px-2.5 text-sm" onClick={onSkip || onClose}>
            Skip tour
          </Button>
          <Button className="inline-flex min-h-9 items-center gap-1 px-3 text-sm" onClick={onNext}>
            {isLast ? "Finish" : "Next"} <ArrowRight size={14} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </>
  );
}
