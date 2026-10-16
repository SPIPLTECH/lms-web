import api from "@/lib/axios";

export const createQuiz =
    async (data) => {
        const response =
            await api.post(
                "/quizzes",
                data
            );

        return response.data.data;
    };

export const getQuizzes = async (
    courseId
) => {
    const url = courseId
        ? `/quizzes?courseId=${courseId}`
        : "/quizzes";

    const response =
        await api.get(url);

    return response.data.data;
};
export const getQuizById =
    async (quizId) => {
        const response =
            await api.get(
                `/quizzes/${quizId}`
            );

        return response.data.data;
    };

export const updateQuiz =
    async (
        quizId,
        data
    ) => {
        const response =
            await api.put(
                `/quizzes/${quizId}`,
                data
            );

        return response.data.data;
    };

export const deleteQuiz =
    async (quizId) => {
        const response =
            await api.delete(
                `/quizzes/${quizId}`
            );

        return response.data;
    };
/**
 * Submit Quiz.
 *
 * `questionStates` carries the per-question visit/skip/hint activity the
 * server has no other way of knowing; it is merged into the question-level
 * attempt records written at submit. Optional — omitting it still submits.
 * timeTakenSeconds is informational only. Scoring, correctness, marks and the
 * attempt limit are all decided server-side.
 */
export const submitQuiz = async (
    quizId,
    answers,
    timeTakenSeconds,
    questionStates
) => {
    const { data } = await api.post(
        `/quizzes/${quizId}/submit`,
        {
            answers,
            ...(Array.isArray(questionStates) && questionStates.length > 0 && { questionStates }),
            ...(Number.isFinite(timeTakenSeconds) && { timeTakenSeconds }),
        },
        {
            timeout: 45000,
        }
    );

    return data.data ?? data;
};

/**
 * Get Quiz Result — the latest attempt, or one specific attempt when
 * attemptId is given. Either way the response carries the student's full
 * attempt history and remaining allowance.
 */
export const getQuizResult =
    async (quizId, attemptId) => {
        const {data} =
            await api.get(
                `/quizzes/${quizId}/result`,
                attemptId ? { params: { attempt: attemptId } } : undefined
            );

        return data.data ?? data;
};

/**
 * Student: every quiz they have attempted, one entry per quiz with its
 * attempt history summarised — the quiz half of the Submissions page.
 */
export const getMyQuizSubmissions = async () => {
    const { data } = await api.get("/quizzes/my-submissions");
    return data.data ?? data;
};

/**
 * Batch reorder quizzes within a parent scope (two-phase on the backend to
 * avoid unique-index collisions on a swap).
 */
export const reorderQuizzes = async (quizzes) => {
    const response = await api.patch("/quizzes/reorder", { quizzes });
    return response.data;
};

/**
 * Self Generate Quiz
 */
export const generateSelfAssessmentQuiz = async (courseId, questionCount = 5) => {
    const { data } = await api.post("/quizzes/self-generate", {
        courseId,
        questionCount
    });
    return data.data ?? data;
};