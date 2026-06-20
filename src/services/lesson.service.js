import api from "@/lib/axios";

export const getLessons =
  async (moduleId) => {
    const response =
      await api.get(
        `/lessons?moduleId=${moduleId}`
      );

    return response.data;
  };

export const getLessonById =
  async (lessonId) => {
    const response =
      await api.get(
        `/lessons/${lessonId}`
      );

    return response.data;
  };

export const createLesson =
  async (data) => {
    const response =
      await api.post(
        "/lessons",
        data
      );

    return response.data;
  };

export const updateLesson =
  async (
    lessonId,
    data
  ) => {
    const response =
      await api.put(
        `/lessons/${lessonId}`,
        data
      );

    return response.data;
  };

export const deleteLesson =
  async (lessonId) => {
    const response =
      await api.delete(
        `/lessons/${lessonId}`
      );

    return response.data;
  };