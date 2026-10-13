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

export type EmailFrequency = 'IMMEDIATE' | 'DIGEST' | 'OFF';
export type EmailCategory = 'mentions' | 'assignments' | 'due_soon' | 'status_changes' | 'comments';

export type NotificationPreferences = Record<EmailCategory, EmailFrequency> & {
  timezone: string;
  digest_hour: number;
  // False while the timezone is still the default nobody chose; TimezoneSync then saves the browser's zone.
  timezone_confirmed: boolean;
  // The daily email's summary of My work: overdue, due today, blocked, new mentions.
  my_work_summary: boolean;
  email: string;
  // False until the server has an email sender set up; settings still save.
  email_available: boolean;
  // The address bounced or reported spam, so nothing is sent to it.
  email_suppressed: boolean;
};

export type NotificationPreferencesUpdate = Partial<Pick<NotificationPreferences, EmailCategory | 'timezone' | 'digest_hour' | 'my_work_summary'>>;

export const notificationPreferencesApi = {
  get: () => apiClient.get('/api/v1/me/notification-preferences') as Promise<NotificationPreferences>,
  // For background checks that shouldn't show the global loading indicator.
  getSilently: () =>
    apiClient.get('/api/v1/me/notification-preferences', undefined, { silent: true }) as Promise<NotificationPreferences>,
  update: (changes: NotificationPreferencesUpdate, options?: { silent?: boolean }) =>
    apiClient.patch('/api/v1/me/notification-preferences', changes, options) as Promise<NotificationPreferences>,
};
