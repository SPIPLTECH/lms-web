import api from "@/lib/axios";

const toQuery = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
};

export const getResults = async (filters = {}) => {
  const { data } = await api.get(`/results?${toQuery(filters)}`);
  return data.data ?? data;
};

/**
 * Quiz- and question-level analytics for one quiz, aggregated server-side from
 * the existing attempt records. Distinct from getResults, which lists
 * submissions across many quizzes — this is one quiz in depth.
 */
export const getQuizAnalytics = async (quizId) => {
  const { data } = await api.get("/results/quiz-analytics", { params: { quizId } });
  return data.data ?? data;
};

/**
 * Final tests grouped per test — breadcrumb, submission counts and the full
 * student roster each. Distinct from getResults, which returns one flat row
 * per attempt.
 */
export const getFinalTestOverview = async (filters = {}) => {
  const { data } = await api.get(`/results/final-tests?${toQuery(filters)}`);
  return data.data ?? data;
};
