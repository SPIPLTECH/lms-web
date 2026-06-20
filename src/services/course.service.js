import api from "@/lib/axios";

export const getCourses =
  async () => {
    const response =
      await api.get("/courses");

    return response.data;
  };

export const getCourseById =
  async (courseId) => {
    const response =
      await api.get(
        `/courses/${courseId}`
      );

    return response.data;
  };

  
export const createCourse =
  async (data) => {
    const response =
      await api.post(
        "/courses",
        data
      );

    return response.data;
  };

export const updateCourse =
  async (
    courseId,
    data
  ) => {
    const response =
      await api.put(
        `/courses/${courseId}`,
        data
      );

    return response.data;
  };

export const deleteCourse =
  async (courseId) => {
    const response =
      await api.delete(
        `/courses/${courseId}`
      );

    return response.data;
  };

export const updateCourseStatus =
  async (
    courseId,
    status
  ) => {
    const response =
      await api.patch(
        `/courses/${courseId}/status`,
        { status }
      );

    return response.data;
  };