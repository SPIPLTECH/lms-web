import api from "@/lib/axios";

/**
 * What the student should do next, and where they are weakest.
 *
 * Produced entirely server-side by the existing deterministic decision engine
 * — the browser renders the answer, it never computes one. Scoped to the
 * signed-in student by the backend; there is no student id to pass.
 *
 * Returns { recommendations, weakAreas, masteryOverview }.
 */
export const getRecommendations = async ({ courseId = null, limit } = {}) => {
  const { data } = await api.get("/learner-model/recommendations", {
    params: {
      ...(courseId && { courseId }),
      ...(limit && { limit }),
    },
  });

  return {
    recommendations: data.data ?? [],
    weakAreas: data.weakAreas ?? [],
    masteryOverview: data.masteryOverview ?? [],
  };
};

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

/**
 * Phase 8 — how the student's concepts are holding up over time.
 *
 * Retention and transfer, derived server-side from the attempt evidence that
 * already exists. Like everything else in this file the browser renders the
 * answer and never computes one: there is no threshold, no decay curve and no
 * classification logic on this side of the wire.
 *
 * Scoped to the signed-in student by the backend; there is no student id to
 * pass. Returns { signals, calibration }.
 */
export const getLearningSignals = async ({ courseId = null } = {}) => {
  const { data } = await api.get("/learner-model/signals", {
    params: { ...(courseId && { courseId }) },
  });

  return {
    signals: data.data ?? [],
    calibration: data.calibration ?? null,
  };
};

/**
 * Phase 9 — instructor analytics over the existing adaptive system.
 *
 * Observational only. These read what the deterministic engine has already
 * decided and what the learners have already done; there is no write path
 * here and no way for an instructor to influence a learning decision.
 *
 * Every aggregate is computed server-side. The browser receives counts that
 * are already rolled up — never a cohort's attempt history to total itself.
 * Authorization is the backend's: a course the caller does not own reads as
 * "not found", the same as one that does not exist.
 */
export const getInstructorInsights = async ({ courseId }) => {
  const { data } = await api.get("/learner-model/instructor-insights", { params: { courseId } });
  return data.data ?? null;
};

/** Learners who may need attention, with the reasons why. Paginated. */
export const getInstructorLearners = async ({ courseId, limit, offset } = {}) => {
  const { data } = await api.get("/learner-model/instructor-learners", {
    params: { courseId, ...(limit && { limit }), ...(offset && { offset }) },
  });

  return {
    learners: data.data ?? [],
    total: data.total ?? 0,
    limit: data.limit ?? 0,
    offset: data.offset ?? 0,
  };
};

/** One learner's adaptive state, read through the existing student services. */
export const getInstructorLearner = async ({ courseId, studentId }) => {
  const { data } = await api.get("/learner-model/instructor-learner", {
    params: { courseId, studentId },
  });
  return data.data ?? null;
};
