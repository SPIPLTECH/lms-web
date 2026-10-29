import api from "../lib/axios";
import { getCodeItOrigin } from "../lib/apiOrigin";

/**
 * Code-IT lives in its own microservice (code-it-service), not lms-api.
 * Requests still go through the shared `api` instance: an absolute URL makes
 * axios ignore its baseURL, while its interceptors keep attaching the access
 * token and device key and refreshing an expired token.
 */
const url = (path) => `${getCodeItOrigin()}/api${path}`;

// Runs wait for Judge0 to compile and execute — longer than the default 15 s.
const RUN_TIMEOUT_MS = 45000;

export const getCodeItLanguages = async () => {
  const { data } = await api.get(url("/languages"));
  return data.data;
};

export const getCodeItTopics = async (language) => {
  const { data } = await api.get(url(`/languages/${language}/topics`));
  return data.data;
};

export const getCodeItExercise = async (exerciseId) => {
  const { data } = await api.get(url(`/exercises/${exerciseId}`));
  return data.data;
};

export const getCodeItSolution = async (exerciseId) => {
  const { data } = await api.get(url(`/exercises/${exerciseId}/solution`));
  return data.data.solution;
};

export const saveCodeItDraft = async ({ exerciseId, code }) => {
  await api.put(url(`/exercises/${exerciseId}/draft`), { code });
};

export const runCode = async ({ language, code, stdin }) => {
  const { data } = await api.post(url("/run"), { language, code, stdin }, { timeout: RUN_TIMEOUT_MS });
  return data.data;
};

/** Lab Run: the student's own input, plus the Code Analysis. Records nothing. */
export const runCodeItExercise = async ({ exerciseId, code, stdin }) => {
  const { data } = await api.post(url(`/exercises/${exerciseId}/run`), { code, stdin }, { timeout: RUN_TIMEOUT_MS });
  return data.data;
};

export const submitCodeItExercise = async ({ exerciseId, code }) => {
  const { data } = await api.post(url(`/exercises/${exerciseId}/submit`), { code }, { timeout: RUN_TIMEOUT_MS });
  return data.data;
};

export const askCodeItTutor = async ({ language, code, question, replyLang }) => {
  const { data } = await api.post(url("/ai/ask"), { language, code, question, replyLang }, { timeout: 60000 });
  return data.data.answer;
};

/** The service's `message` for a failed call, or a generic one. */
export const codeItErrorMessage = (error) =>
  error?.response?.data?.message ||
  (error?.code === "ECONNABORTED" ? "The request took too long. Please try again." : null) ||
  (!error?.response ? "Code-IT is not reachable right now." : "Something went wrong.");
