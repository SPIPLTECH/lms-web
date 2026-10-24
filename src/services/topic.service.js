import api from "@/lib/axios";

export const createTopic =
  async (data) => {
    const response =
      await api.post(
        "/topics",
        data
      );

    return response.data;
  };

export const updateTopic =
  async (
    topicId,
    data
  ) => {
    const response =
      await api.put(
        `/topics/${topicId}`,
        data
      );

    return response.data;
  };

export const deleteTopic =
  async (topicId) => {
    const response =
      await api.delete(
        `/topics/${topicId}`
      );

    return response.data;
  };

