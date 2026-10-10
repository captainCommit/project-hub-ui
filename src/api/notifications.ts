import { apiClient } from './client';

export type AppNotification = {
  id: string;
  entity_type: string;
  entity_id: string;
  notification_type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationList = { results: AppNotification[]; total: number };

export const notificationsApi = {
  // Polled in the background, so it stays out of the global loading indicator.
  list: async (): Promise<NotificationList> => {
    const response = await apiClient.get('/api/v1/notifications', { page_size: 30 }, { silent: true }) as Partial<NotificationList> | undefined;
    return { results: Array.isArray(response?.results) ? response.results : [], total: response?.total ?? 0 };
  },
  markRead: (notificationId: string) => apiClient.patch(`/api/v1/notifications/${notificationId}/read`),
  markAllRead: () => apiClient.patch('/api/v1/notifications/read-all'),
};
