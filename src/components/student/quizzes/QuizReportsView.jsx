"use client";

import Link from "next/link";

// A Self-Test is practice: listed with its score, but no pass/fail and no
// result page to open.
const isPractice = (quiz) => quiz.quizTag === "SELF_TEST";

const STATUS_BADGE = {
  practice: "bg-muted text-muted-foreground border-border",
  passed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const statusOf = (quiz, submission) => (isPractice(quiz) ? "practice" : submission.passed ? "passed" : "failed");
const STATUS_LABEL = { practice: "Practised", passed: "Passed", failed: "Failed" };

export default function QuizReportsView({ reportStats, filteredByCourse }) {
  const completedQuizzes = filteredByCourse.filter((q) => !!q.quizSubmissions?.[0]);

  return (
    <div className="space-y-5">
      {/* Report Metrics */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background/60 p-3.5 text-center">
          <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Passed</p>
          <h4 className="text-base sm:text-lg font-black text-emerald-400 mt-1">{reportStats.passedCount}</h4>
        </div>
        <div className="rounded-xl border border-border bg-background/60 p-3.5 text-center">
          <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Failed</p>
          <h4 className="text-base sm:text-lg font-black text-rose-400 mt-1">{reportStats.failedCount}</h4>
        </div>
        <div className="rounded-xl border border-border bg-background/60 p-3.5 text-center">
          <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Avg Score</p>
          <h4 className="text-base sm:text-lg font-black text-purple-400 mt-1">{reportStats.avgScore}%</h4>
        </div>
      </div>

      {/* Reports List */}
      <div className="rounded-2xl border border-border/80 bg-background/60 p-4 sm:p-5 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
          Quiz Attempt Reports
        </h3>

        {/* MOBILE CARDS (< md) FOR REPORTS */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {completedQuizzes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs font-bold uppercase tracking-wider">
              No quiz attempts found.
            </div>
          ) : (
            completedQuizzes.map((quiz) => {
              const submission = quiz.quizSubmissions[0];
              return (
                <div key={quiz.id} className="p-4 rounded-2xl border border-border bg-background/90 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-xs font-extrabold text-foreground">{quiz.title}</h4>
                    <span className={`inline-flex rounded-xl px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider border ${STATUS_BADGE[statusOf(quiz, submission)]}`}>
                      {STATUS_LABEL[statusOf(quiz, submission)]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50 font-mono">
                    <span>Date: {new Date(submission.createdAt).toLocaleDateString()}</span>
                    <span className="font-extrabold text-foreground">Score: {submission.score}/{quiz._count?.questions ?? 10} ({submission.percentage}%)</span>
                  </div>
                  {!isPractice(quiz) && (
                    <Link href={`/student/result/${quiz.id}`} className="block pt-1">
                      <button className="w-full py-2.5 rounded-xl bg-muted hover:bg-slate-700 text-foreground text-xs font-extrabold min-h-[44px]">
                        View Result
                      </button>
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE (>= md) FOR REPORTS */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                <th className="pb-3 pl-3">Quiz</th>
                <th className="pb-3 text-center w-36">Attempt Date</th>
                <th className="pb-3 text-center w-28">Score</th>
                <th className="pb-3 w-32">Status</th>
                <th className="pb-3 text-right pr-3 w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {completedQuizzes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground text-xs font-bold uppercase tracking-wider">
                    No quiz attempts found.
                  </td>
                </tr>
              ) : (
                completedQuizzes.map((quiz) => {
                  const submission = quiz.quizSubmissions[0];
                  return (
                    <tr key={quiz.id} className="hover:bg-muted/20 transition border-b border-border/40">
                      <td className="py-3.5 pl-3">
                        <span className="font-extrabold text-foreground">{quiz.title}</span>
                      </td>
                      <td className="py-3.5 text-center font-bold text-muted-foreground text-xs">
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 text-center text-foreground font-extrabold text-xs">
                        {submission.score}/{quiz._count?.questions ?? 10} ({submission.percentage}%)
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-flex rounded-xl px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider border ${STATUS_BADGE[statusOf(quiz, submission)]}`}>
                          {STATUS_LABEL[statusOf(quiz, submission)]}
                        </span>
                      </td>
                      <td className="py-3.5 pr-3 text-right">
                        {!isPractice(quiz) && (
                          <Link href={`/student/result/${quiz.id}`}>
                            <button className="px-3.5 py-2 text-xs font-bold text-foreground hover:text-foreground bg-muted border border-transparent/60 rounded-xl transition cursor-pointer min-h-[44px]">
                              View Result
                            </button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
