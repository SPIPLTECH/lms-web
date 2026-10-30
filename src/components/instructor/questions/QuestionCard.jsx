"use client";

import {useRouter} from "next/navigation";

import {
    FaQuestionCircle,
    FaCheckCircle,
    FaStar,
} from "@/components/ui/reactIcons";

import ActionMenu from "@/components/menus/ActionMenu";
import { quizTextSummary } from "@/lib/quizText";

export default function QuestionCard({
                                         question,
                                         onDelete,
                                     }) {
    const router = useRouter();

    const openQuestion = () => {
        router.push(
            `/instructor/questions/view/${question.id}`
        );
    };

    return (
        <div
            onClick={openQuestion}
            className="
                cursor-pointer
                rounded-2xl
                border
                border-border
                bg-background
                p-6
                transition-all
                duration-300
                hover:-translate-y-1
                hover:border-primary
            "
        >
            <div className="flex h-full flex-col justify-between">
                {/* Header */}
                <div>
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div className="flex flex-1 items-start gap-4">
                            <div
                                className="
                                    flex
                                    h-12
                                    w-12
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-primary/15
                                    text-primary
                                "
                            >
                                <FaQuestionCircle size={20}/>
                            </div>

                            <div className="flex-1">
                                <h3 className="line-clamp-2 text-lg font-semibold text-foreground">
                                    {quizTextSummary(question.question)}
                                </h3>

                                <p className="mt-3 text-sm text-muted-foreground">
                                    {Array.isArray(question.options)
                                        ? `${question.options.length} Options`
                                        : "No options"}
                                </p>
                            </div>
                        </div>

                        <div
                            onClick={(e) =>
                                e.stopPropagation()
                            }
                        >
                            <ActionMenu
                                items={[
                                    {
                                        label: "View",
                                        onClick: openQuestion,
                                    },
                                    {
                                        label: "Edit",
                                        onClick: () =>
                                            router.push(
                                                `/instructor/questions/edit/${question.id}`
                                            ),
                                    },
                                    {
                                        label: "Delete",
                                        onClick: () =>
                                            onDelete?.(
                                                question.id
                                            ),
                                    },
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 border-t border-border pt-4">
                    <div className="mb-4 flex flex-wrap gap-3">
                        <span
                            className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-full
                                bg-primary/15
                                px-3
                                py-1
                                text-xs
                                font-medium
                                text-primary
                            "
                        >
                            <FaStar size={12}/>
                            {question.marks} Mark
                            {question.marks > 1
                                ? "s"
                                : ""}
                        </span>

                        <span
                            className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-full
                                bg-green-500/15
                                px-3
                                py-1
                                text-xs
                                font-medium
                                text-green-400
                            "
                        >
                            <FaCheckCircle
                                size={12}
                            />
                            Correct Answer
                        </span>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            openQuestion();
                        }}
                        className="
                            w-full
                            rounded-lg
                            bg-orange-600
                            px-4
                            py-2
                            text-sm
                            font-medium
                            text-foreground
                            transition
                            hover:bg-orange-700
                        "
                    >
                        View Question
                    </button>
                </div>
            </div>
        </div>
    );
}