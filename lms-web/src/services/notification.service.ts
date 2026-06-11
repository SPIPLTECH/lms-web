import api from "@/lib/axios";

export const notificationService = {
  getNotifications: async () =>
    api.get("/notifications"),

  markAsRead: async (id: string) =>
    api.patch(`/notifications/${id}`),
};
