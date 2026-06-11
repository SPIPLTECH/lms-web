import api from "@/lib/axios";

export const studentService = {
  getStudents: async () =>
    api.get("/students"),

  getStudentById: async (id: string) =>
    api.get(`/students/${id}`),
};
