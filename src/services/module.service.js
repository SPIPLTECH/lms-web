import api from "@/lib/axios";

export const getModules = async (
  courseId
) => {
  const response =
    await api.get(
      `/modules?courseId=${courseId}`
    );

  return response.data;
};

export const getModuleById =
  async (moduleId) => {
    const response =
      await api.get(
        `/modules/${moduleId}`
      );

    return response.data;
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