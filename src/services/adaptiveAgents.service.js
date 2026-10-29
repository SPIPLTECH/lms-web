import api from "@/lib/axios";

/**
 * The adaptive agents' APIs (Phases 2-6). Every number, plan and message is
 * computed server-side by a deterministic agent; the browser only renders it.
 */

/* Motivation — the signed-in student's streak and nudges. */
export const getMyMotivation = async () => {
    const { data } = await api.get("/motivation/me");
    return data.data;
};

export const dismissNudge = async (nudgeId) => {
    const { data } = await api.post(`/motivation/nudges/${nudgeId}/dismiss`);
    return data.data;
};

/* Learning Path — the student's 7-day study plan for one course. */
export const getMyStudyPlan = async (courseId) => {
    const { data } = await api.get(`/study-plan/course/${courseId}`);
    return data.data;
};

/* Career Guidance */
export const getCareerRoles = async () => {
    const { data } = await api.get("/career/roles");
    return data.data;
};

export const getMyCareer = async () => {
    const { data } = await api.get("/career/me");
    return data.data;
};

export const setCareerGoal = async (roleKey) => {
    const { data } = await api.put("/career/goal", { roleKey });
    return data.data;
};

/* Analytics + Admin Intelligence (ADMIN) */
export const getPlatformAnalytics = async () => {
    const { data } = await api.get("/analytics/platform");
    return data.data;
};

export const getCourseAnalyticsList = async () => {
    const { data } = await api.get("/analytics/courses");
    return data.data;
};

export const getAdminIntelligence = async () => {
    const { data } = await api.get("/admin-intelligence/dashboard");
    return data.data;
};
