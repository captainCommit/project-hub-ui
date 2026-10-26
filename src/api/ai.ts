import { apiClient } from './client';

// The assistant chat. Asking returns at once; the answer is written by a background worker, so the chat polls the
// conversation (useAssistantChat) while active_run_id is set.

export type AiConversation = { id: string; title: string | null; created_at: string; updated_at: string };

export type AiChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  // Answers only: QUEUED/RUNNING while being written.
  status?: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' | null;
  progress?: string | null;
  // The lookups it made, e.g. "Looking up tasks".
  steps?: string[];
  error?: string | null;
};

export type AiConversationDetail = AiConversation & { messages: AiChatMessage[]; active_run_id: string | null };

export const aiChatApi = {
  list: (accountId: string) =>
    apiClient.get(`/api/v1/accounts/${accountId}/ai/conversations`, undefined, { silent: true }) as Promise<AiConversation[]>,
  create: (accountId: string) =>
    apiClient.post(`/api/v1/accounts/${accountId}/ai/conversations`, {}, { silent: true }) as Promise<AiConversation>,
  // Polled, so it stays out of the global loading indicator.
  get: (conversationId: string) =>
    apiClient.get(`/api/v1/ai/conversations/${conversationId}`, undefined, { silent: true }) as Promise<AiConversationDetail>,
  ask: (conversationId: string, content: string) =>
    apiClient.post(`/api/v1/ai/conversations/${conversationId}/messages`, { content }, { silent: true }) as Promise<AiConversationDetail>,
  remove: (conversationId: string) => apiClient.delete(`/api/v1/ai/conversations/${conversationId}`),
};

// Written reports. Like questions, asking returns at once and the report is written in the background, so the
// dialog polls it while status is QUEUED or RUNNING. An identical request made recently returns the stored report.

export type AiReportScope = 'PROJECT' | 'PROGRAM' | 'PORTFOLIO';
export type AiReportType = 'weekly_status' | 'steering_committee' | 'executive_summary' | 'raid' | 'health' | 'changes';

export type AiReport = {
  id: string;
  scope_type: AiReportScope;
  scope_id: string;
  scope_name: string;
  report_type: AiReportType;
  title: string;
  // First day of the period the report covers (YYYY-MM-DD).
  since: string;
  status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';
  progress: string | null;
  error: string | null;
  // Markdown; only on a finished report fetched on its own, never in lists.
  content: string | null;
  model: string | null;
  created_at: string;
  finished_at: string | null;
};

export type AiReportRequest = {
  scope_type: AiReportScope;
  scope_id: string;
  report_type: AiReportType;
  since?: string;
  regenerate?: boolean;
};

export const aiReportsApi = {
  list: (accountId: string, scopeType: AiReportScope, scopeId: string) =>
    apiClient.get(aiPath(accountId, '/reports'), { scope_type: scopeType, scope_id: scopeId }, { silent: true }) as Promise<AiReport[]>,
  create: (accountId: string, request: AiReportRequest) =>
    apiClient.post(aiPath(accountId, '/reports'), request, { silent: true }) as Promise<AiReport>,
  // Polled, so it stays out of the global loading indicator.
  get: (reportId: string) => apiClient.get(`/api/v1/ai/reports/${reportId}`, undefined, { silent: true }) as Promise<AiReport>,
  remove: (reportId: string) => apiClient.delete(`/api/v1/ai/reports/${reportId}`),
};

// --- Assistant settings ---------------------------------------------------------------------------------

export type AiProvider = 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'AZURE_OPENAI' | 'CUSTOM';

export const AI_PROVIDERS: { value: AiProvider; label: string; needsEndpoint: boolean; keyOptional?: boolean; modelHint: string }[] = [
  { value: 'OPENAI', label: 'OpenAI', needsEndpoint: false, modelHint: 'The model name from OpenAI’s model list' },
  { value: 'ANTHROPIC', label: 'Anthropic', needsEndpoint: false, modelHint: 'The model name from Anthropic’s model list' },
  { value: 'GEMINI', label: 'Google Gemini', needsEndpoint: false, modelHint: 'The model name from Google’s Gemini model list' },
  { value: 'AZURE_OPENAI', label: 'Azure OpenAI', needsEndpoint: true, modelHint: 'Your deployment name' },
  { value: 'CUSTOM', label: 'Custom (OpenAI-compatible)', needsEndpoint: true, keyOptional: true, modelHint: 'The model name the server expects' },
];

export type AiStatus = {
  available: boolean;
  source: 'BYOK' | 'PLATFORM' | null;
  // NOT_ENABLED: a platform admin hasn't turned AI on for the account; owners can request it.
  reason: 'NOT_ENABLED' | 'OFF' | 'NOT_SET_UP' | 'LIMIT_REACHED' | null;
  provider_label: string | null;
  model: string | null;
  can_manage: boolean;
  enabled: boolean;
  requested_at: string | null;
};

export type AiKey = {
  provider: AiProvider;
  provider_label: string;
  model: string;
  base_url: string | null;
  azure_api_version: string | null;
  key_last4: string | null;
  key_updated_at: string | null;
  key_updated_by_name: string | null;
};

export type AiUsage = {
  month_start: string;
  tokens: number;
  // Cents, before and after the monthly allowance.
  charge_cents: number;
  billable_cents: number;
  allowance_kind: 'TOKENS' | 'CREDIT';
  // Tokens or cents, depending on allowance_kind.
  allowance_amount: number;
  allowance_left: number;
  cap_cents: number | null;
  // Whether usage past the allowance can be invoiced; if not, the allowance is the limit.
  can_bill: boolean;
  limit_reached: boolean;
};

export type AiPlatformStatus = 'REQUESTED' | 'ENABLED' | 'DISABLED' | 'DECLINED';

export type AiPlatformInfo = {
  status: AiPlatformStatus | null;
  model_label: string | null;
  requested_at: string | null;
  usage: AiUsage | null;
  currency: string;
};

export type AiSettings = {
  assistant_enabled: boolean;
  retention_days: number;
  key: AiKey | null;
  platform: AiPlatformInfo;
  key_storage_available: boolean;
};

export type AiKeyInput = {
  provider: AiProvider;
  model: string;
  api_key: string;
  base_url?: string | null;
  azure_api_version?: string | null;
  accept_data_notice: boolean;
};

const aiPath = (accountId: string, path: string) => `/api/v1/accounts/${accountId}/ai${path}`;

export const aiSettingsApi = {
  status: (accountId: string) => apiClient.get(aiPath(accountId, '/status'), undefined, { silent: true }) as Promise<AiStatus>,
  /** Owners: ask a platform admin to turn AI on for the account. */
  requestAccess: (accountId: string) => apiClient.post(aiPath(accountId, '/access-request')) as Promise<AiStatus>,
  get: (accountId: string) => apiClient.get(aiPath(accountId, '/settings')) as Promise<AiSettings>,
  update: (accountId: string, changes: Partial<Pick<AiSettings, 'assistant_enabled' | 'retention_days'>>) =>
    apiClient.patch(aiPath(accountId, '/settings'), changes) as Promise<AiSettings>,
  saveKey: (accountId: string, key: AiKeyInput) => apiClient.put(aiPath(accountId, '/key'), key) as Promise<AiSettings>,
  removeKey: (accountId: string) => apiClient.delete(aiPath(accountId, '/key')) as Promise<AiSettings>,
  requestPlatform: (accountId: string) =>
    apiClient.post(aiPath(accountId, '/platform-request'), { accept_terms: true }) as Promise<AiSettings>,
  cancelPlatform: (accountId: string) => apiClient.delete(aiPath(accountId, '/platform-request')) as Promise<AiSettings>,
};

// --- Platform admins ------------------------------------------------------------------------------------

export type AiPlatformModel = {
  id: string;
  label: string;
  provider: 'OPENAI' | 'ANTHROPIC' | 'GEMINI';
  model: string;
  // The provider's cost in cents per million tokens; the charge adds margin_percent.
  input_cost_per_mtok_cents: number;
  output_cost_per_mtok_cents: number;
  margin_percent: number;
  is_active: boolean;
  key_configured: boolean;
};

export type AiPlatformModelInput = Omit<AiPlatformModel, 'id' | 'key_configured'>;

export type AiPlatformAccount = {
  account_id: string;
  account_name: string;
  status: AiPlatformStatus;
  platform_model_id: string | null;
  model_label: string | null;
  allowance_kind: 'TOKENS' | 'CREDIT';
  allowance_amount: number;
  monthly_cap_cents: number | null;
  has_own_key: boolean;
  requested_at: string | null;
  requested_by_email: string | null;
  decided_at: string | null;
  usage: AiUsage;
};

export type AiPlatformDecision = {
  status: 'ENABLED' | 'DISABLED' | 'DECLINED';
  platform_model_id?: string | null;
  allowance_kind?: 'TOKENS' | 'CREDIT';
  allowance_amount?: number;
  monthly_cap_cents?: number | null;
  clear_cap?: boolean;
};

/** One account's AI switch, as platform admins see it. */
export type AiFeatureAccount = {
  account_id: string;
  account_name: string;
  enabled: boolean;
  requested_at: string | null;
  requested_by_email: string | null;
};

export const aiAdminApi = {
  featureAccounts: () => apiClient.get('/api/v1/admin/ai/feature') as Promise<AiFeatureAccount[]>,
  setFeature: (accountId: string, enabled: boolean) =>
    apiClient.put(`/api/v1/admin/ai/feature/${accountId}`, { enabled }) as Promise<AiFeatureAccount>,
  models: () => apiClient.get('/api/v1/admin/ai/models') as Promise<AiPlatformModel[]>,
  createModel: (model: AiPlatformModelInput) => apiClient.post('/api/v1/admin/ai/models', model) as Promise<AiPlatformModel>,
  updateModel: (id: string, changes: Partial<AiPlatformModelInput>) =>
    apiClient.patch(`/api/v1/admin/ai/models/${id}`, changes) as Promise<AiPlatformModel>,
  accounts: () => apiClient.get('/api/v1/admin/ai/accounts') as Promise<AiPlatformAccount[]>,
  decide: (accountId: string, decision: AiPlatformDecision) =>
    apiClient.put(`/api/v1/admin/ai/accounts/${accountId}`, decision) as Promise<AiPlatformAccount>,
};

/** "12,000 tokens" or "$1.50" for an allowance, depending on its kind. */
export const formatAllowance = (kind: 'TOKENS' | 'CREDIT', amount: number, currency: string) =>
  kind === 'CREDIT'
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount / 100)
    : `${new Intl.NumberFormat().format(amount)} tokens`;
