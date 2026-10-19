"use client";

import { useParams, useRouter } from "next/navigation";

import BulkQuestionForm from "@/components/forms/BulkQuestionForm";
import { useBulkCreateQuestions } from "@/hooks/queries/instructor/useBulkCreateQuestions";
import { useAlert } from "@/context/ConfirmContext";

export default function BulkCreateQuestionsPage() {
    const { quizId } = useParams();
    const router = useRouter();
    const alert = useAlert();

    const bulkMutation = useBulkCreateQuestions();

    const handleSubmit = async (questions) => {
        try {
            const result = await bulkMutation.mutateAsync({ quizId, questions });

            const inserted = result?.data?.inserted ?? result?.inserted ?? 0;
            const failed = result?.data?.failed ?? result?.failed ?? 0;

            if (inserted > 0) {
                router.push(`/instructor/questions/${quizId}`);
            } else {
                alert(`No questions were inserted. ${failed} question(s) had validation errors.`);
            }
        } catch (error) {
            console.error("Bulk create error:", error);
            alert(error?.response?.data?.message || "Failed to create questions.");
        }
    };

    return (
        <BulkQuestionForm
            loading={bulkMutation.isPending}
            onSubmit={handleSubmit}
        />
    );
}
