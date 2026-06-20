import api from "@/lib/axios";

export const enrollCourse =
  async (courseId) => {
    const response =
      await api.post(
        "/enrollments",
        {
          courseId,
        }
      );

    return response.data;
  };

  export const getMyEnrollments =
  async (userId) => {
    const response =
      await api.get(
        `/enrollments?userId=${userId}`
      );

    return response.data;
  };
export const unenrollCourse =
  async (enrollmentId) => {
    const response =
      await api.delete(
        `/enrollments/${enrollmentId}`
      );

    return response.data;
  };