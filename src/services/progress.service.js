import api from "@/lib/axios";

export const getProgress =
  async (userId) => {
    const response =
      await api.get(
        `/progress?userId=${userId}`
      );

    return response.data;
  };