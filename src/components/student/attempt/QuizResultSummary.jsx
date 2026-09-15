"use client";

import Link from "next/link";
import { Award, ArrowRight, CheckCircle2, Eye } from "lucide-react";

import Loader from "@/components/common/Loader";
import Button from "@/components/ui/Button";
import ListenButton from "@/components/student/tts/ListenButton";
import { buildResultSummarySpeech } from "@/lib/quizSpeech";
import { resolveSpeechLang } from "@/lib/textToSpeech";

/**
 * Shown in place of the question UI once a quiz has been submitted — an
 * inline "you're done" summary instead of redirecting away from the content
 * player, with the full report and moving on to the next content block both
 * left as explicit choices rather than forced navigation.
 */
export default function QuizResultSummary({
    quizTitle,
    isLoading,
    correctCount,
    totalQuestions,
    percentage,
    passed,
    resultHref,
    onNextContent,
    speechLanguage,
}) {
    if (isLoading) {
        return (
            <div className="rounded-2xl border border-border bg-background p-8">
                <Loader />
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-border bg-background p-3.5 sm:p-8 text-center">
            <div
                className={`mx-auto flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full ${
                    passed ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                }`}
            >
                <Award className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>

            <div className="mt-2 sm:mt-3 flex items-center justify-center gap-1.5 sm:gap-2 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <p className="text-xs sm:text-sm font-semibold truncate max-w-full px-2">
                    {quizTitle ? `"${quizTitle}" submitted` : "Quiz submitted"}
                </p>
            </div>

            <div
                className={`mx-auto mt-1.5 sm:mt-2 inline-flex rounded-full px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                    passed
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/25"
                }`}
            >
                {passed ? "Passed" : "Failed"}
            </div>

            <div className="mt-2 sm:mt-3 flex justify-center">
                <ListenButton
                    sessionKey={`quiz-result-summary:${quizTitle || ""}`}
                    getChunks={() =>
                        buildResultSummarySpeech({
                            quizTitle,
                            passed,
                            correctCount,
                            totalQuestions,
                            percentage,
                            lang: resolveSpeechLang(speechLanguage),
                        })
                    }
                    lang={resolveSpeechLang(speechLanguage)}
                    label="Listen to result"
                    ariaLabel="Listen to quiz result"
                />
            </div>

            <div className="mx-auto mt-3 sm:mt-5 grid max-w-[280px] sm:max-w-xs grid-cols-2 gap-2 sm:gap-3">
                <div className="rounded-xl bg-muted/60 p-2 sm:p-3">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">Correct Answers</p>
                    <p className="mt-0.5 sm:mt-1 text-base sm:text-xl font-bold text-foreground">
                        {correctCount} <span className="text-[10px] sm:text-sm font-normal text-muted-foreground">/ {totalQuestions}</span>
                    </p>
                </div>

                <div className="rounded-xl bg-muted/60 p-2 sm:p-3">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">Score</p>
                    <p className="mt-0.5 sm:mt-1 text-base sm:text-xl font-bold text-foreground">{percentage}%</p>
                </div>
            </div>

            <div className={`mx-auto mt-3.5 sm:mt-6 max-w-[280px] sm:max-w-sm ${onNextContent ? "grid grid-cols-2 gap-2 sm:gap-3" : "flex justify-center"}`}>
                <Link href={resultHref} className="w-full">
                    <Button type="button" variant="outline" className="w-full h-9 sm:h-10 px-1.5 sm:px-3 text-[11px] sm:text-sm flex items-center justify-center gap-1 sm:gap-1.5">
                        <Eye className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">View Full Result</span>
                    </Button>
                </Link>

                {onNextContent && (
                    <Button
                        type="button"
                        onClick={onNextContent}
                        className="w-full h-9 sm:h-10 px-1.5 sm:px-3 text-[11px] sm:text-sm font-semibold bg-primary hover:bg-orange-600 text-foreground flex items-center justify-center gap-1 sm:gap-1.5"
                    >
                        <span className="truncate">Next Content</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                    </Button>
                )}
            </div>
        </div>
    );
}

