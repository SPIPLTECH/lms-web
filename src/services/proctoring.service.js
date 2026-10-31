import axios from "axios";

import api from "@/lib/axios";
import { getApiOrigin } from "@/lib/apiOrigin";

/** Whether the proctoring checkbox should be offered on this server. */
export const getProctoringConfig = async () => {
    const { data } = await api.get("/proctoring/config");
    return data.data;
};

// ---- The attempt: signed in as the student, like any other request ----

const dataOf = ({ data }) => data.data;

export const getProctoredQuizStatus = (quizId) => api.get(`/proctoring/quizzes/${quizId}/status`).then(dataOf);

export const createProctoredAttempt = (quizId, consent) => api.post(`/proctoring/quizzes/${quizId}/attempts`, { consent }).then(dataOf);

export const resumeProctoredAttempt = (attemptId) => api.post(`/proctoring/attempts/${attemptId}/resume`).then(dataOf);

export const startProctoredAttempt = (attemptId) => api.post(`/proctoring/attempts/${attemptId}/start`).then(dataOf);

export const getProctoredAttempt = (attemptId) => api.get(`/proctoring/attempts/${attemptId}`).then(dataOf);

export const saveProctoredAnswer = (attemptId, questionId, payload) => api.put(`/proctoring/attempts/${attemptId}/answers/${questionId}`, payload).then(dataOf);

export const submitProctoredAttempt = (attemptId) => api.post(`/proctoring/attempts/${attemptId}/submit`).then(dataOf);

export const getProctoredAttemptResult = (attemptId) => api.get(`/proctoring/attempts/${attemptId}/result`).then(dataOf);

/** A kept image, fetched with the student's or staff member's own sign-in. Never a public URL. */
export const fetchEvidenceImage = (evidenceId) => api.get(`/proctoring/evidence/${evidenceId}/file`, { responseType: "blob" }).then(({ data }) => data);

// ---- Monitoring: the attempt's own token. A separate client, because a monitoring refusal
// must never set off the sign-in refresh and logout handling on the main one. ----

const monitorApi = axios.create({ timeout: 15000 });

const monitored = (token) => ({ baseURL: getApiOrigin(), headers: { "X-Proctoring-Token": token } });

export function uploadExamFrame(token, { type, blob, frameId, capturedAt }) {
    const form = new FormData();
    form.append("type", type);
    if (frameId) form.append("frameId", frameId);
    if (capturedAt) form.append("clientCapturedAt", capturedAt);
    form.append("snapshot", blob, "frame.jpg");
    return monitorApi.post("/proctoring/monitor/snapshots", form, monitored(token)).then(dataOf);
}

export const sendExamEvent = (token, event) => monitorApi.post("/proctoring/monitor/events", event, monitored(token)).then(dataOf);

export const sendExamHeartbeat = (token, body = {}) => monitorApi.post("/proctoring/monitor/heartbeat", body, monitored(token)).then(dataOf);
