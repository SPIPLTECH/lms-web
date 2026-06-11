import api from "@/lib/axios";

export const teacherService = {
  getTeachers: async () =>
    api.get("/teachers"),

  getTeacherById: async (id: string) =>
    api.get(`/teachers/${id}`),
};
