import api from "@/lib/axios";

export const authService = {
  login: async (data: unknown) =>
    api.post("/auth/login", data),

  register: async (data: unknown) =>
    api.post("/auth/register", data),

  logout: async () =>
    api.post("/auth/logout"),
};
