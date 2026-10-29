import api from "@/lib/axios";

/**
 * Assignment auto-evaluation (instructor side): the marking scheme for an
 * assignment, the evaluator's suggestion for each submission, and the
 * instructor's decision on it. Students never call these — their grade and
 * breakdown arrive with the assignment itself (GET /assignments/:id).
 */

const unwrap = ({ data }) => data.data ?? data;

/** { assignmentMarks, rubric | null } */
export const getRubric = (assignmentId) => api.get(`/assignments/${assignmentId}/rubric`).then(unwrap);

/** Saving also sets the assignment's marks to the scheme's total (marksChangedFrom says when they changed). */
export const saveRubric = (assignmentId, rubric) =>
  api.put(`/assignments/${assignmentId}/rubric`, rubric).then(unwrap);

export const deleteRubric = (assignmentId) => api.delete(`/assignments/${assignmentId}/rubric`).then(unwrap);

/** Scores a sample answer against a draft scheme. Nothing is saved. */
export const previewRubric = (assignmentId, rubric, answerText) =>
  api.post(`/assignments/${assignmentId}/rubric/preview`, { rubric, answerText }).then(unwrap);

/** Re-runs the evaluator on every ungraded submission. { queued, skippedGraded } */
export const evaluateAllSubmissions = (assignmentId) =>
  api.post(`/assignments/${assignmentId}/evaluate-all`).then(unwrap);

const evaluationUrl = (assignmentId, submissionId) =>
  `/assignments/${assignmentId}/submissions/${submissionId}/evaluation`;

/** { status, grade, assignmentMarks, current, published, job, history, audit } */
export const getSubmissionEvaluation = (assignmentId, submissionId) =>
  api.get(evaluationUrl(assignmentId, submissionId)).then(unwrap);

/** Approves and publishes the proposal. payload: { expectedVersion, comment? } */
export const acceptEvaluation = (assignmentId, submissionId, payload) =>
  api.post(`${evaluationUrl(assignmentId, submissionId)}/accept`, payload).then(unwrap);

/**
 * Sets and publishes marks. payload: { expectedVersion, reason, comment?, and
 * criteria: [{ criterionId, awarded }] or marksAwarded }.
 */
export const overrideEvaluation = (assignmentId, submissionId, payload) =>
  api.post(`${evaluationUrl(assignmentId, submissionId)}/override`, payload).then(unwrap);

/** reopen: required when the submission already has a published grade. */
export const reEvaluateSubmission = (assignmentId, submissionId, { reopen = false } = {}) =>
  api.post(`${evaluationUrl(assignmentId, submissionId)}/re-evaluate`, { reopen }).then(unwrap);

// Synonym dictionary shared by every assignment.
export const getSynonymGroups = () => api.get("/assignment-evaluation/synonyms").then(unwrap);
export const addSynonymGroup = (payload) => api.post("/assignment-evaluation/synonyms", payload).then(unwrap);
export const addStarterSynonyms = () => api.post("/assignment-evaluation/synonyms/starter").then(unwrap);
export const deleteSynonymGroup = (groupId) =>
  api.delete(`/assignment-evaluation/synonyms/${groupId}`).then(unwrap);
