import api from "@/lib/axios";

export const getMyProgress =
  async () => {
    const response =
      await api.get(
        "/progress/me"
      );

    return response.data;
  };

export const updateProgress =
  async (data) => {
    const response =
      await api.post(
        "/progress",
        data
      );

    return response.data;
  };