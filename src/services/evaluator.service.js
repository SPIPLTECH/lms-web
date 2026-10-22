import api from "@/lib/axios";

/* Temporary evaluator accounts (backend: src/modules/evaluators). */

/* ---------------- Registration (public) ---------------- */

export const getEvaluatorRegistration = async () => {
  const response = await api.get("/evaluators/registration");
  return response.data;
};

export const registerEvaluator = async (data) => {
  const response = await api.post("/evaluators/register", data);
  return response.data;
};

/* ---------------- Signed-in evaluator ---------------- */

export const getEvaluatorStatus = async () => {
  const response = await api.get("/evaluators/me/status");
  return response.data;
};

// The server asks the independent feedback site, which can take most of a
// minute to wake up — hence the longer timeout for this one call.
export const checkEvaluatorFeedback = async () => {
  const response = await api.post("/evaluators/me/feedback-check", null, { timeout: 60000 });
  return response.data;
};
