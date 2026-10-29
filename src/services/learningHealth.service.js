import api from "@/lib/axios";

/**
 * Learning Health agent (adaptive Phase 1) — instructor/admin only.
 *
 * Every number and reason is computed server-side by the deterministic agent;
 * the browser only renders it.
 */

/**
 * The course roster, most at-risk first.
 * Returns { summary: { counts, total, computedAt }, learners, pagination }.
 */
export const getCourseLearningHealth = async ({ courseId, riskLevel = null, limit, offset } = {}) => {
    const { data } = await api.get(`/learning-health/course/${courseId}`, {
        params: {
            ...(riskLevel && { riskLevel }),
            ...(limit && { limit }),
            ...(offset && { offset }),
        },
    });
    return data.data;
};

/** One learner's current state plus up to 30 days of daily history. */
export const getLearnerHealth = async ({ courseId, studentId }) => {
    const { data } = await api.get(`/learning-health/course/${courseId}/student/${studentId}`);
    return data.data;
};

/**
 * Recomputes the whole course now. Rate-limited server-side: a 429 carries
 * `retryAfterSeconds` in the response body.
 */
export const recomputeCourseLearningHealth = async ({ courseId }) => {
    const { data } = await api.post(`/learning-health/course/${courseId}/recompute`);
    return data.data;
};
