"use client";

import Link from "next/link";

import {
    FaQuestionCircle, FaPlus, FaArrowLeft, FaLayerGroup, FaCloudUploadAlt,
} from "@/components/ui/reactIcons";

import Card from "@/components/ui/Card";

export default function QuestionHeader({ quiz, onImport }) {
    return (<Card className="overflow-hidden">
        <div className="space-y-8">
            {/* Back */}
            <Link
                href={`/instructor/quizzes/${quiz.quizId || quiz.id}`}
                className="
                        inline-flex
                        items-center
                        gap-2
                        text-sm
                        text-muted-foreground
                        transition
                        hover:text-primary
                    "
            >
                <FaArrowLeft size={14}/>
                Back to Quiz
            </Link>

            {/* Header */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-5">
                    <div
                        className="
                                flex
                                h-16
                                w-16
                                items-center
                                justify-center
                                rounded-2xl
                                bg-primary/15
                                text-primary
                            "
                    >
                        <FaQuestionCircle size={28}/>
                    </div>

                    <div>
                            <span
                                className="
                                    inline-flex
                                    rounded-full
                                    bg-primary/15
                                    px-3
                                    py-1
                                    text-xs
                                    font-medium
                                    text-primary
                                "
                            >
                                Questions
                            </span>

                        <h1 className="mt-4 text-4xl font-bold text-foreground">
                            Manage Questions
                        </h1>

                        <p className="mt-3 max-w-3xl text-muted-foreground">
                            Create, edit and organize questions for this
                            quiz. Each question can contain multiple
                            options, a correct answer and marks.
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Import Questions */}
                    <button
                        type="button"
                        onClick={onImport}
                        className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-xl
                                border
                                border-transparent
                                bg-muted
                                px-5
                                py-3
                                font-medium
                                text-foreground
                                transition
                                hover:border-primary/50
                                hover:text-primary
                            "
                    >
                        <FaCloudUploadAlt size={15}/>
                        Import File
                    </button>

                    {/* Bulk Add */}
                    <Link
                        href={`/instructor/questions/bulk/${quiz.id}`}
                        className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-xl
                                border
                                border-primary/40
                                bg-primary/10
                                px-5
                                py-3
                                font-medium
                                text-primary
                                transition
                                hover:bg-primary/20
                            "
                    >
                        <FaLayerGroup size={15}/>
                        Add Multiple
                    </Link>

                    {/* Single Add */}
                    <Link
                        href={`/instructor/questions/create/${quiz.id}`}
                        className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-xl
                                bg-orange-600
                                px-5
                                py-3
                                font-medium
                                text-foreground
                                transition
                                hover:bg-orange-700
                            "
                    >
                        <FaPlus size={14}/>
                        Add Question
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-5 md:grid-cols-3">
                <div
                    className="
                            rounded-xl
                            border
                            border-border
                            bg-background
                            p-5
                        "
                >
                    <p className="text-sm text-muted-foreground">
                        Total Questions
                    </p>

                    <h3 className="mt-2 text-3xl font-bold text-foreground">
                        {quiz.questions?.length || 0}
                    </h3>
                </div>

                <div
                    className="
                            rounded-xl
                            border
                            border-border
                            bg-background
                            p-5
                        "
                >
                    <p className="text-sm text-muted-foreground">
                        Passing Score
                    </p>

                    <h3 className="mt-2 text-3xl font-bold text-primary">
                        {quiz.passingScore}%
                    </h3>
                </div>

                <div
                    className="
                            rounded-xl
                            border
                            border-border
                            bg-background
                            p-5
                        "
                >
                    <p className="text-sm text-muted-foreground">
                        Time Limit
                    </p>

                    <h3 className="mt-2 text-3xl font-bold text-blue-400">
                        {Number(quiz.timeLimit) > 0 ? `${quiz.timeLimit} min` : "No timer"}
                    </h3>
                </div>
            </div>
        </div>
    </Card>);
}
