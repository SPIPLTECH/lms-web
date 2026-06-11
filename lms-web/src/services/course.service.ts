import api from "@/lib/axios";

export const courseService = {
  getCourses: async () =>
    api.get("/courses"),

  getCourseById: async (id: string) =>
    api.get(`/courses/${id}`),

  createCourse: async (data: unknown) =>
    api.post("/courses", data),
};
