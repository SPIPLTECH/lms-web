import api from "@/lib/axios";

/**
 * Update User Role
 */
export const updateUserRole = async (
  userId,
  role
) => {
  const { data } = await api.patch(
    `/users/${ userId }/role`,
    { role }
  );

  return data;
};

/**
 * Delete User
 */
export const deleteUser = async (
  userId
) => {
  const { data } = await api.delete(
    `/users/${ userId }`
  );

  return data;
};

