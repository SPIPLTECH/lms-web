"use client";

import { useParams, useRouter } from "next/navigation";

import Loader from "@/components/common/Loader";
import Card from "@/components/ui/Card";

import QuizForm from "@/components/instructor/quizzes/QuizForm";

import { useQuiz } from "@/hooks/queries/instructor/useQuiz";
import { useUpdateQuiz } from "@/hooks/queries/instructor/useUpdateQuiz";
import { useToast } from "@/components/ui/ToastProvider";

export default function EditQuizPage() {
    const { quizId } = useParams();

    const router = useRouter();

    const { showToast } = useToast();

    const {
        data: quiz,
        isLoading,
        isError,
    } = useQuiz(quizId);

    const updateQuizMutation =
        useUpdateQuiz();

    const handleSubmit = async (
        values
    ) => {
        try {
            await updateQuizMutation.mutateAsync({
                quizId,
                quizData: {
                    ...values,
                    courseId: quiz.courseId,
                },
            });

            showToast("Quiz updated successfully", "success");

            router.push(
                `/instructor/quizzes/${quizId}`
            );
        } catch (error) {
            console.error(error);
            showToast(
                error?.response?.data?.message || "Failed to update quiz.",
                "error",
                "Update Failed"
            );
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader />
            </div>
        );
    }

    if (isError || !quiz) {
        return (
            <Card>
                <div className="py-16 text-center">
                    <h2 className="text-2xl font-semibold">
                        Quiz Not Found
                    </h2>

                    <p className="mt-2 text-muted-foreground">
                        Unable to load the quiz.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <QuizForm
            mode="edit"
            initialValues={quiz}
            loading={
                updateQuizMutation.isPending
            }
            onSubmit={handleSubmit}
        />
    );
}