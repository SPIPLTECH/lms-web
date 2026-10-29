import api from "@/lib/axios";

/* ---------------- Current session ---------------- */

// The caller's own session and device. A successful call also counts as
// activity, which is what keeps an open app's session from idling out.
export const getMySession = async () => {
  const { data } = await api.get("/sessions/me");
  return data.data ?? data;
};

/* ---------------- Admin ---------------- */

export const getUserSessions = async (userId) => {
  const { data } = await api.get(`/admin/users/${userId}/sessions`);
  return data.data ?? data;
};

// Audited, ADMIN-only. Ends that session and its playback lease.
export const revokeSession = async (sessionId) => {
  await api.post(`/admin/sessions/${sessionId}/revoke`);
};
