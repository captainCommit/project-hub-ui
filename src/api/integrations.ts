import { apiClient } from './client';

// Slack and Outlook. Owners manage the account's connections and Slack channels; everyone manages their own Slack
// link, direct messages and calendar.

export type ChatProvider = 'slack';
export type ConnectionProvider = ChatProvider | 'microsoft-mail';
export type ScopeType = 'PROJECT' | 'PROGRAM' | 'PORTFOLIO';

export type IntegrationConnection = {
  provider: 'SLACK' | 'MICROSOFT_MAIL';
  status: 'ACTIVE' | 'ERROR';
  external_name: string | null;
  last_error: string | null;
  connected_at: string;
  connected_by_name: string | null;
};

export type IntegrationDestination = {
  id: string;
  provider: 'SLACK' | null;
  channel_id: string;
  channel_name: string;
  scope_type: ScopeType;
  scope_id: string;
  scope_name: string;
  events: string[];
  is_active: boolean;
  created_by_name: string | null;
};

export type IntegrationsOverview = {
  available: { slack: boolean; microsoft: boolean };
  connections: IntegrationConnection[];
  destinations: IntegrationDestination[];
  events: { key: string; label: string }[];
};

export type Channel = { id: string; name: string; is_private: boolean };

export type DestinationInput = {
  provider: ChatProvider;
  channel_id: string;
  channel_name: string;
  scope_type: ScopeType;
  scope_id: string;
  events: string[];
  is_active?: boolean;
};

export type UserLink = { provider: string; external_name: string | null; dm_categories: string[]; linked_at: string };

export type MyIntegrations = {
  available: { slack: boolean; microsoft: boolean };
  dm_category_options: string[];
  slack: { connected: boolean; workspace: string | null; link: UserLink | null };
  // null when calendar feeds aren't set up on this server.
  calendar_feed: { enabled: boolean; url: string | null; created_at: string | null } | null;
  outlook_calendar: { email: string | null; status: 'ACTIVE' | 'ERROR'; last_error: string | null; last_synced_at: string | null } | null;
};

const path = (accountId: string, rest = '') => `/api/v1/accounts/${accountId}/integrations${rest}`;

export const integrationsApi = {
  overview: (accountId: string) => apiClient.get(path(accountId)) as Promise<IntegrationsOverview>,
  slackInstallUrl: (accountId: string) => apiClient.get(path(accountId, '/slack/install')) as Promise<{ url: string }>,
  microsoftMailUrl: (accountId: string) => apiClient.get(path(accountId, '/microsoft-mail/connect')) as Promise<{ url: string }>,
  disconnect: (accountId: string, provider: ConnectionProvider) => apiClient.delete(path(accountId, `/${provider}`)),
  channels: (accountId: string, provider: ChatProvider) => apiClient.get(path(accountId, `/${provider}/channels`)) as Promise<Channel[]>,
  createDestination: (accountId: string, input: DestinationInput) =>
    apiClient.post(path(accountId, '/destinations'), input) as Promise<IntegrationDestination>,
  updateDestination: (accountId: string, id: string, input: DestinationInput) =>
    apiClient.put(path(accountId, `/destinations/${id}`), input) as Promise<IntegrationDestination>,
  deleteDestination: (accountId: string, id: string) => apiClient.delete(path(accountId, `/destinations/${id}`)),

  mine: (accountId: string) => apiClient.get(path(accountId, '/me')) as Promise<MyIntegrations>,
  confirmLink: (accountId: string, token: string) => apiClient.post(path(accountId, '/me/links/confirm'), { token }) as Promise<UserLink>,
  updateLink: (accountId: string, provider: ChatProvider, dmCategories: string[]) =>
    apiClient.patch(path(accountId, `/me/links/${provider}`), { dm_categories: dmCategories }) as Promise<UserLink>,
  unlink: (accountId: string, provider: ChatProvider) => apiClient.delete(path(accountId, `/me/links/${provider}`)),

  createCalendarFeed: () => apiClient.post('/api/v1/me/calendar-feed', {}) as Promise<NonNullable<MyIntegrations['calendar_feed']>>,
  deleteCalendarFeed: () => apiClient.delete('/api/v1/me/calendar-feed'),
  outlookConnectUrl: () => apiClient.get('/api/v1/me/outlook-calendar/connect') as Promise<{ url: string }>,
  outlookSync: () => apiClient.post('/api/v1/me/outlook-calendar/sync', {}),
  outlookDisconnect: () => apiClient.delete('/api/v1/me/outlook-calendar'),
};

export const DM_CATEGORY_LABELS: Record<string, string> = {
  mentions: 'Mentions',
  assignments: 'Assignments',
  due_soon: 'Due soon reminders',
  status_changes: 'Status changes',
  comments: 'Comments',
};
