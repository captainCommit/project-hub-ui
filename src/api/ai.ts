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

export const aiApi = {
  invokeLLM: async (_request: Record<string, unknown>): Promise<never> => {
    throw new Error('AI report generation is not available yet.');
  },
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
  reason: 'OFF' | 'NOT_SET_UP' | 'LIMIT_REACHED' | null;
  provider_label: string | null;
  model: string | null;
  can_manage: boolean;
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

export type AiSettings = {
  assistant_enabled: boolean;
  retention_days: number;
  key: AiKey | null;
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
  get: (accountId: string) => apiClient.get(aiPath(accountId, '/settings')) as Promise<AiSettings>,
  update: (accountId: string, changes: Partial<Pick<AiSettings, 'assistant_enabled' | 'retention_days'>>) =>
    apiClient.patch(aiPath(accountId, '/settings'), changes) as Promise<AiSettings>,
  saveKey: (accountId: string, key: AiKeyInput) => apiClient.put(aiPath(accountId, '/key'), key) as Promise<AiSettings>,
  removeKey: (accountId: string) => apiClient.delete(aiPath(accountId, '/key')) as Promise<AiSettings>,
};
