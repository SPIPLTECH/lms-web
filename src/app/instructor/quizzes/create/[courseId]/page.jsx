"use client";

import { useParams, useRouter } from "next/navigation";
import QuizForm from "@/components/instructor/quizzes/QuizForm";
import { useCreateQuiz } from "@/hooks/queries/instructor/useCreateQuiz";

export default function CreateQuizPage() {
    const { courseId } = useParams();
    const router = useRouter();
    const createQuizMutation = useCreateQuiz();

    const handleSubmit = async (values, action) => {
        try {
            const payload = {
                ...values,
                courseId,
                status: action === "draft" ? "DRAFT" : "ACTIVE",
                isPublished: action !== "draft"
            };

            await createQuizMutation.mutateAsync(payload);

            router.push(`/instructor/quizzes`);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <QuizForm
            mode="create"
            lockedCourseId={courseId}
            onSubmit={handleSubmit}
            loading={createQuizMutation.isPending}
        />
    );
}