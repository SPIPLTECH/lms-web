import { useMutation, useQueryClient } from "@tanstack/react-query";

import { submitQuiz } from "@/services/quiz.service";

import { QUERY_KEYS } from "@/constants/queryKeys";

export default function useSubmitQuiz() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ quizId, answers, timeTakenSeconds, questionStates }) =>
            submitQuiz(quizId, answers, timeTakenSeconds, questionStates),

        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.QUIZZES],
            });

            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.QUIZ, variables.quizId],
            });

            queryClient.invalidateQueries({
                queryKey: [
                    QUERY_KEYS.QUIZ_RESULT,
                    variables.quizId,
                ],
            });

            // The new attempt belongs on the Submissions page straight away.
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.STUDENT_QUIZ_SUBMISSIONS],
            });

            // A submitted quiz can complete its parent Topic/Lesson/Module and
            // move the course percentage, but that roll-up happens server-side —
            // so the progress caches have to be refetched rather than patched
            // locally. Mirrors useCompleteContent's invalidation set.
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COURSE_PROGRESS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROGRESS] });
            // A passing qualifying test skips its lesson/topic and opens what
            // follows it, so the gate the player is drawing is now stale.
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEARNING_PATH] });
            // The next action is derived from the path and the evidence, so
            // it moves whenever either does.
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NEXT_ACTION] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECOMMENDATIONS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENT_DASHBOARD] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_COURSES] });
        },
    });
}
