import api from "@/lib/axios";

export const getSubTopics =
  async (topicId) => {
    const response =
      await api.get(
        `/subtopics?topicId=${topicId}`
      );

    return response.data;
  };

export const getSubTopicById =
  async (subTopicId) => {
    const response =
      await api.get(
        `/subtopics/${subTopicId}`
      );

    return response.data;
  };

export const createSubTopic =
  async (data) => {
    const response =
      await api.post(
        "/subtopics",
        data
      );

    return response.data;
  };

export const updateSubTopic =
  async (
    subTopicId,
    data
  ) => {
    const response =
      await api.put(
        `/subtopics/${subTopicId}`,
        data
      );

    return response.data;
  };

export const deleteSubTopic =
  async (subTopicId) => {
    const response =
      await api.delete(
        `/subtopics/${subTopicId}`
      );

    return response.data;
  };

export const reorderSubTopics =
  async (topicId, subTopics) => {
    const response =
      await api.patch(
        "/subtopics/reorder",
        { topicId, subTopics }
      );

    return response.data;
  };
