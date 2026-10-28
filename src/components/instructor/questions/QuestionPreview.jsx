"use client";

import {
    FaQuestionCircle,
    FaCheckCircle,
    FaStar,
} from "@/components/ui/reactIcons";
import QuizRichText from "@/components/quiz/QuizRichText";
import { isCorrectOption } from "@/lib/quizAnswers";

export default function QuestionPreview({
                                            question,
                                        }) {
    if (!question) return null;

    return (
        <div className="space-y-8">
            {/* Question */}
            <div
                className="
                    rounded-2xl
                    border
                    border-border
                    bg-background
                    p-8
                "
            >
                <div className="mb-5 flex items-center gap-3">
                    <FaQuestionCircle className="text-xl text-primary" />

                    <h2 className="text-2xl font-semibold">
                        Question
                    </h2>
                </div>

                <div className="text-lg leading-8 text-foreground">
                    <QuizRichText text={question.question} />
                </div>
            </div>

            {/* Options */}
            <div
                className="
                    rounded-2xl
                    border
                    border-border
                    bg-background
                    p-8
                "
            >
                <h2 className="mb-6 text-2xl font-semibold">
                    Answer Options
                </h2>

                <div className="space-y-4">
                    {Array.isArray(question.options) &&
                        question.options.map(
                            (option, index) => {
                                const optionText = typeof option === "string" ? option : (option?.optionText || option?.text || String(option));
                                const isCorrect =
                                    isCorrectOption(optionText, question.correctAnswer, question.options) ||
                                    (typeof option === "object" && option?.isCorrect);

                                return (
                                    <div
                                        key={index}
                                        className={`
                                            flex
                                            items-center
                                            justify-between
                                            rounded-xl
                                            border
                                            p-5
                                            transition
                                            ${
                                            isCorrect
                                                ? "border-green-500 bg-green-500/10"
                                                : "border-border bg-background"
                                        }
                                        `}
                                    >
                                        <div className="flex min-w-0 flex-1 items-center gap-4">
                                            <span
                                                className={`
                                                    flex
                                                    h-10
                                                    w-10
                                                    items-center
                                                    justify-center
                                                    rounded-full
                                                    font-semibold
                                                    ${
                                                    isCorrect
                                                        ? "bg-green-500 text-foreground"
                                                        : "bg-muted text-foreground"
                                                }
                                                `}
                                            >
                                                {String.fromCharCode(
                                                    65 + index
                                                )}
                                            </span>

                                            <div className="min-w-0 flex-1 text-foreground">
                                                <QuizRichText text={optionText} variant="option" preserveLines />
                                            </div>
                                        </div>

                                        {isCorrect && (
                                            <span
                                                className="
                                                    inline-flex
                                                    items-center
                                                    gap-2
                                                    rounded-full
                                                    bg-green-500/15
                                                    px-3
                                                    py-1
                                                    text-sm
                                                    font-medium
                                                    text-green-400
                                                "
                                            >
                                                <FaCheckCircle />
                                                Correct
                                            </span>
                                        )}
                                    </div>
                                );
                            }
                        )}
                </div>
            </div>

            {/* Marks */}
            <div
                className="
                    rounded-2xl
                    border
                    border-border
                    bg-background
                    p-8
                "
            >
                <div className="flex items-center gap-3">
                    <FaStar className="text-xl text-primary" />

                    <h2 className="text-2xl font-semibold">
                        Marks
                    </h2>
                </div>

                <p className="mt-5 text-4xl font-bold text-primary">
                    {question.marks}
                </p>
            </div>
        </div>
    );
}