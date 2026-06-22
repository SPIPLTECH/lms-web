import api from "@/lib/axios";

export const getProgress =
  async (courseId) => {
    const response =
      await api.get(
        `/progress?courseId=${courseId}`
      );

    return response.data;
  };

export const updateProgress =
  async (data) => {
    const response =
      await api.post(
        "/progress/complete",
        data
      );

    return response.data;
  };