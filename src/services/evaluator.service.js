import api from "@/lib/axios";

/* Temporary evaluator accounts (backend: src/modules/evaluators). */

/* ---------------- Registration (public) ---------------- */

export const getEvaluatorRegistration = async () => {
  const response = await api.get("/evaluators/registration");
  return response.data;
};

// Registration is verify-first: nothing is stored until the email is proven.
// `challenge` comes back from the send and goes into the verify; the verify
// returns the `verificationToken` that registerEvaluator must include.
export const sendEvaluatorEmailCode = async (email) => {
  const response = await api.post("/evaluators/email-code", { email });
  return response.data;
};

export const verifyEvaluatorEmailCode = async ({ email, otp, challenge }) => {
  const response = await api.post("/evaluators/email-code/verify", { email, otp, challenge });
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
  const response = await api.post("/evaluators/me/feedback-check", {}, { timeout: 60000 });
  return response.data;
};
