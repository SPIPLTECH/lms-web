"use client";

import Link from "next/link";
import {useParams, useRouter} from "next/navigation";

import Loader from "@/components/common/Loader";
import Card from "@/components/ui/Card";
import ActionMenu from "@/components/menus/ActionMenu";

import QuestionPreview from "@/components/instructor/questions/QuestionPreview";

import {useQuestion} from "@/hooks/queries/instructor/useQuestion";
import {useDeleteQuestion} from "@/hooks/queries/instructor/useDeleteQuestion";
import {useConfirm} from "@/context/ConfirmContext";

export default function QuestionDetailsPage() {
    const {questionId} = useParams();

    const router = useRouter();
    const confirm = useConfirm();

    const {
        data: question,
        isLoading,
        isError,
    } = useQuestion(questionId);
    console.log(question);
    const deleteQuestionMutation =
        useDeleteQuestion();

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: "Delete question",
            message: "Delete this question?",
            confirmText: "Delete",
        });

        if (!confirmed) return;

        try {
            await deleteQuestionMutation.mutateAsync({
                questionId,
                quizId: question.quizId,
            });

            router.push(
                `/instructor/questions/${question.quizId}`
            );
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader/>
            </div>
        );
    }

    if (isError || !question) {
        return (
            <Card>
                <div className="py-16 text-center">
                    <h2 className="text-2xl font-semibold">
                        Question Not Found
                    </h2>

                    <p className="mt-2 text-muted-foreground">
                        Unable to load this question.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <Card className="p-8">
                <div className="flex items-start justify-between gap-6">
                    <div>
                        <div className="mb-4 flex items-center gap-3">
                            <span
                                className="
                                    rounded-full
                                    bg-primary/15
                                    px-3
                                    py-1
                                    text-sm
                                    font-medium
                                    text-primary
                                "
                            >
                                Question
                            </span>

                            <span className="text-sm text-muted-foreground">
                                {question.marks} Mark
                                {question.marks > 1
                                    ? "s"
                                    : ""}
                            </span>
                        </div>

                        <h1 className="sr-only">
                            Question Details
                        </h1>
                    </div>

                    <ActionMenu
                        items={[
                            {
                                label: "Edit",
                                onClick: () =>
                                    router.push(
                                        `/instructor/questions/edit/${question.id}`
                                    ),
                            },
                            {
                                label: "Delete",
                                onClick:
                                handleDelete,
                            },
                        ]}
                    />
                </div>
            </Card>

            {/* Preview */}
            <Card className="p-8">
                <h2 className="mb-6 text-2xl font-semibold">
                    Preview
                </h2>

                <QuestionPreview
                    question={question}
                />
            </Card>

            {/* Footer */}
            <div className="flex justify-between">
                <Link
                    href={`/instructor/questions/${question.quizId}`}
                    className="
                        rounded-xl
                        border
                        border-transparent
                        px-5
                        py-3
                        text-foreground
                        transition
                        hover:border-primary
                    "
                >
                    Back to Questions
                </Link>

                <Link
                    href={`/instructor/questions/edit/${question.id}`}
                    className="
                        rounded-xl
                        bg-orange-600
                        px-5
                        py-3
                        text-foreground
                        transition
                        hover:bg-orange-700
                    "
                >
                    Edit Question
                </Link>
            </div>
        </div>
    );
}