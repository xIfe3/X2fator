import { api } from "../api-client";
import type { Notification } from "../types";

export const notificationsApi = {
  list: () => api.get<Notification[]>("/notifications"),
  unread: () => api.get<Notification[]>("/notifications/unread"),
  unreadCount: () => api.get<{ count: number }>("/notifications/unread/count"),
  markRead: (id: string) => api.patch<Notification>(`/notifications/${id}/read`),
  markAllRead: () => api.patch<void>("/notifications/read-all"),
};
