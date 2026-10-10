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
