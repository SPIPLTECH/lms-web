import api from "@/lib/axios";

export const getUsers =
  async () => {
    const response =
      await api.get("/users");

    return response.data;
  };

export const getUserById =
  async (userId) => {
    const response =
      await api.get(
        `/users/${userId}`
      );

    return response.data;
  };

export const updateUser =
  async (
    userId,
    data
  ) => {
    const response =
      await api.put(
        `/users/${userId}`,
        data
      );

    return response.data;
  };

export const deleteUser =
  async (userId) => {
    const response =
      await api.delete(
        `/users/${userId}`
      );

    return response.data;
  };

export const updateUserRole =
  async (
    userId,
    role
  ) => {
    const response =
      await api.patch(
        `/users/${userId}/role`,
        { role }
      );

    return response.data;
  };

export const updateUserStatus =
  async (
    userId,
    status
  ) => {
    const response =
      await api.patch(
        `/users/${userId}/status`,
        { status }
      );

    return response.data;
  };