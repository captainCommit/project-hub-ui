import { apiClient } from './client';

// AI features (assistant chat, AI-written reports) are deferred: the Project Hub API
// has no LLM endpoints yet. These adapters keep the existing screens usable and
// tell the user plainly instead of failing.

type Message = { role: 'user' | 'assistant'; content: string; tool_calls?: unknown[] };
type Conversation = { id: string; agent_name?: string; metadata?: Record<string, unknown>; messages: Message[] };
type Listener = (conversation: Conversation) => void;

export const AI_UNAVAILABLE_MESSAGE =
  'The AI assistant is not available yet. It will be enabled once Project Hub has its own AI service.';

const conversations = new Map<string, Conversation>();
const listeners = new Map<string, Set<Listener>>();

const notify = (conversation: Conversation) => {
  listeners.get(conversation.id)?.forEach((listener) => listener({ ...conversation, messages: [...conversation.messages] }));
};

/** Session-only stand-in for the Base44 agents API that answers with an availability notice. */
export const aiAgents = {
  listConversations: async (_filter?: Record<string, unknown>) => [...conversations.values()].reverse(),
  createConversation: async (data: { agent_name?: string; metadata?: Record<string, unknown> }) => {
    const conversation: Conversation = { id: `local-${Date.now()}-${conversations.size}`, ...data, messages: [] };
    conversations.set(conversation.id, conversation);
    return conversation;
  },
  getConversation: async (id: string) => conversations.get(id) || { id, messages: [] },
  addMessage: async (conversation: Conversation, message: Message) => {
    const stored = conversations.get(conversation.id) || { ...conversation, messages: [] };
    stored.messages = [...stored.messages, message, { role: 'assistant', content: AI_UNAVAILABLE_MESSAGE }];
    conversations.set(stored.id, stored);
    notify(stored);
    return message;
  },
  subscribeToConversation: (id: string, listener: Listener) => {
    if (!listeners.has(id)) listeners.set(id, new Set());
    listeners.get(id)!.add(listener);
    return () => listeners.get(id)?.delete(listener);
  },
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
