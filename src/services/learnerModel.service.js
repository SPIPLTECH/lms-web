import api from "@/lib/axios";

/**
 * The single primary action the student should take next in one course, plus
 * any secondary offers.
 *
 * Chosen server-side by a fixed priority table over the existing learning
 * path, decision engine and qualification rules — the browser renders it and
 * never decides it. Retake eligibility in particular is the server's answer.
 *
 * `quizId` is the quiz the student has just submitted, passed by the result
 * page. It is context for the same decision, not a second one: the server
 * uses it only to re-rank what the table already chose.
 *
 * Returns { primary, secondary, qualifiedCount }.
 */
export const getNextAction = async (courseId, { quizId = null } = {}) => {
  const { data } = await api.get("/learner-model/next-action", {
    params: { courseId, ...(quizId && { quizId }) },
  });
  return {
    primary: data.data ?? null,
    secondary: data.secondary ?? [],
    qualifiedCount: data.qualifiedCount ?? 0,
  };
};

