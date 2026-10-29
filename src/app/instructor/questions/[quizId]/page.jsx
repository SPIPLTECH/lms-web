"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import Loader from "@/components/common/Loader";
import Card from "@/components/ui/Card";

import QuestionGrid from "@/components/instructor/questions/QuestionGrid";
import QuestionHeader from "@/components/instructor/questions/QuestionHeader";
import ImportQuestionsModal from "@/components/instructor/questions/ImportQuestionsModal";

import { useQuiz } from "@/hooks/queries/instructor/useQuiz";
import { useQuestions } from "@/hooks/queries/instructor/useQuestions";
import { useDeleteQuestion } from "@/hooks/queries/instructor/useDeleteQuestion";
import { useConfirm } from "@/context/ConfirmContext";

export default function QuestionListPage() {
  const { quizId } = useParams();
  const confirm = useConfirm();
  const [showImport, setShowImport] = useState(false);

  const { data: quiz, isLoading: quizLoading } = useQuiz(quizId);

  const {
    data: questions = [],
    isLoading,
    isError,
  } = useQuestions(quizId);

  const deleteQuestionMutation = useDeleteQuestion();

  const handleDelete = async (questionId) => {
    const confirmed = await confirm({ title: "Delete question", message: "Delete this question?", confirmText: "Delete" });
    if (!confirmed) return;

    try {
      await deleteQuestionMutation.mutateAsync({ questionId, quizId });
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading || quizLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <div className="py-16 text-center">
          <h2 className="text-2xl font-semibold">Failed to Load Questions</h2>
          <p className="mt-2 text-muted-foreground">Please try again later.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with quiz stats + action buttons */}
      {quiz && (
        <QuestionHeader
          quiz={quiz}
          onImport={() => setShowImport(true)}
        />
      )}

      {/* Questions grid (or empty state) */}
      <QuestionGrid
        questions={questions}
        quizId={quizId}
        onDelete={handleDelete}
        onImport={() => setShowImport(true)}
      />

      {/* Import Modal */}
      {showImport && (
        <ImportQuestionsModal
          quizId={quizId}
          onClose={() => setShowImport(false)}
          onSuccess={() => setShowImport(false)}
        />
      )}
    </div>
  );
}