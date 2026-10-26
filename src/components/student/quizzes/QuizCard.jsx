"use client";

import Link from "next/link";
import { HelpCircle, Target, Clock, CheckCircle, XCircle, PlayCircle } from "lucide-react";

export default function QuizCard({ quiz }) {
  const submission = quiz.quizSubmissions?.[0];
  const hasSubmitted = !!submission;
  const passed = submission?.passed;
  // A Self-Test is practice: no pass/fail and no result page.
  const isPractice = quiz.quizTag === "SELF_TEST";

  return (
    <div className="rounded-2xl border border-border/80 bg-background/90 p-4 space-y-3 shadow-md hover:border-transparent transition">
      {/* Header: Title & Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-h4 text-foreground tracking-tight line-clamp-2" title={quiz.title}>
            {quiz.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
            {quiz.description || "Self-assessment to verify concept mastery."}
          </p>
        </div>

        {hasSubmitted && isPractice ? (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-muted text-muted-foreground border border-border">
            <CheckCircle size={12} />
            <span>Practised</span>
          </span>
        ) : hasSubmitted ? (
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border ${
              passed
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}
          >
            {passed ? <CheckCircle size={12} /> : <XCircle size={12} />}
            <span>{passed ? "Passed" : "Failed"}</span>
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
            <span>New</span>
          </span>
        )}
      </div>

      {/* Quiz Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider flex items-center gap-1">
            <HelpCircle size={11} className="text-primary" /> Questions
          </span>
          <span className="font-extrabold text-foreground mt-1">
            {quiz._count?.questions ?? quiz.questions ?? 0}
          </span>
        </div>

        <div className="flex flex-col items-center text-center border-x border-border/80">
          <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider flex items-center gap-1">
            <Target size={11} className="text-primary" /> Passing
          </span>
          <span className="font-extrabold text-primary mt-1">
            {quiz.passingScore ?? 50}%
          </span>
        </div>

        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider flex items-center gap-1">
            <Clock size={11} className="text-primary" /> Duration
          </span>
          <span className="font-extrabold text-foreground mt-1">
            {Number(quiz.timeLimit) > 0 ? `${quiz.timeLimit} min` : "No timer"}
          </span>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="flex items-center gap-2 pt-1">
        {hasSubmitted && !isPractice && (
          <Link href={`/student/result/${quiz.id}`} className="flex-1">
            <button
              type="button"
              className="w-full py-2.5 px-3 rounded-xl border border-transparent/80 bg-muted hover:bg-slate-700 text-foreground hover:text-foreground text-xs font-bold transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
            >
              View Result
            </button>
          </Link>
        )}

        <Link href={`/student/attempt/${quiz.id}`} className="flex-1">
          <button
            type="button"
            className="w-full py-2.5 px-3 rounded-xl bg-primary hover:bg-orange-600 text-slate-950 text-xs font-black uppercase tracking-wider transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20"
          >
            <PlayCircle size={14} />
            <span>{hasSubmitted ? "Reattempt" : "Start Quiz"}</span>
          </button>
        </Link>
      </div>
    </div>
  );
}