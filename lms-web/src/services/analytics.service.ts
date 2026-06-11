import api from "@/lib/axios";

export const analyticsService = {
  getDashboardStats: async () =>
    api.get("/analytics/dashboard"),

  getCourseAnalytics: async () =>
    api.get("/analytics/courses"),
};
