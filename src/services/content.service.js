import api from "@/lib/axios";

export const getContents = async (
  lessonId
) => {
  const response =
    await api.get(
      `/contents?lessonId=${lessonId}`
    );

  return response.data;
};

export const getContentById =
  async (contentId) => {
    const response =
      await api.get(
        `/contents/${contentId}`
      );

    return response.data;
  };

export const createContent =
  async (data) => {
    const response =
      await api.post(
        "/contents",
        data
      );

    return response.data;
  };

export const updateContent =
  async (
    contentId,
    data
  ) => {
    const response =
      await api.put(
        `/contents/${contentId}`,
        data
      );

    return response.data;
  };

export const deleteContent =
  async (contentId) => {
    const response =
      await api.delete(
        `/contents/${contentId}`
      );

    return response.data;
  };