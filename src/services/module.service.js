import api from "@/lib/axios";

export const getModules = async (
  courseId
) => {
  try {
    const url = courseId
      ? `/modules?courseId=${courseId}`
      : "/modules";

    const response = await api.get(url);
    return response.data?.data ?? response.data ?? [];
  } catch (error) {
    throw error;
  }
};

export const createModule =
  async (data) => {
    const response =
      await api.post(
        "/modules",
        data
      );

    return response.data;
  };

export const updateModule =
  async (
    moduleId,
    data
  ) => {
    const response =
      await api.put(
        `/modules/${moduleId}`,
        data
      );

    return response.data;
  };

export const deleteModule =
  async (moduleId) => {
    const response =
      await api.delete(
        `/modules/${moduleId}`
      );

    return response.data;
  };

