"use client";

import Link from "next/link";
import {
    Clock,
    HelpCircle,
    Target,
    PlayCircle,
    CheckCircle,
    XCircle,
} from "lucide-react";

import Button from "@/components/ui/Button";

export default function QuizRow({
                                    quiz,
                                }) {
    const submission = quiz.quizSubmissions?.[0];
    const hasSubmitted = !!submission;
    const passed = submission?.passed;
    // A Self-Test is practice: no pass/fail and no result page.
    const isPractice = quiz.quizTag === "SELF_TEST";

    return (
        <tr className="hover:bg-foreground/5 transition">
            {/* Quiz */}
            <td className="px-6 py-5">
                <div>
                    <h3 className="font-semibold text-foreground">
                        {quiz.title}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {quiz.description}
                    </p>
                </div>
            </td>

            {/* Questions */}
            <td className="px-6 py-5">
                <div className="flex items-center gap-2 text-foreground">
                    <HelpCircle className="h-4 w-4 text-primary"/>

                    <span>
            {quiz._count?.questions ?? 0}
          </span>
                </div>
            </td>

            {/* Passing Score */}
            <td className="px-6 py-5">
                <div className="flex items-center gap-2 text-foreground">
                    <Target className="h-4 w-4 text-primary"/>

                    <span>
            {quiz.passingScore}%
          </span>
                </div>
            </td>

            {/* Time */}
            <td className="px-6 py-5">
                <div className="flex items-center gap-2 text-foreground">
                    <Clock className="h-4 w-4 text-primary"/>

                    <span>
            {Number(quiz.timeLimit) > 0 ? `${quiz.timeLimit} min` : "No timer"}
          </span>
                </div>
            </td>

            {/* Status */}
            <td className="px-6 py-5">
                {hasSubmitted && isPractice ? (
                    <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                        <CheckCircle className="h-4 w-4"/>
                        <span>Practised ({submission.percentage}%)</span>
                    </div>
                ) : hasSubmitted ? (
                    passed ? (
                        <div className="flex items-center gap-2 text-emerald-500 font-medium text-sm">
                            <CheckCircle className="h-4 w-4 text-emerald-500"/>
                            <span>Passed ({submission.percentage}%)</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-rose-500 font-medium text-sm">
                            <XCircle className="h-4 w-4 text-rose-500"/>
                            <span>Failed ({submission.percentage}%)</span>
                        </div>
                    )
                ) : (
                    <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                        <HelpCircle className="h-4 w-4 text-muted-foreground"/>
                        <span>Not Attempted</span>
                    </div>
                )}
            </td>

            {/* Action */}
            <td className="px-6 py-5 text-right">
                <div className="flex items-center justify-end gap-2">
                    {hasSubmitted && !isPractice && (
                        <Link href={`/student/result/${quiz.id}`}>
                            <Button variant="secondary" className="px-3 py-1.5 text-xs">
                                View Result
                            </Button>
                        </Link>
                    )}
                    <Link
                        href={`/student/attempt/${quiz.id}`}
                    >
                        <Button className="inline-flex items-center gap-2 px-3 py-1.5 text-xs">
                            <PlayCircle className="h-3.5 w-3.5"/>
                            {hasSubmitted ? "Reattempt" : "Start Quiz"}
                        </Button>
                    </Link>
                </div>
            </td>
        </tr>
    );
}