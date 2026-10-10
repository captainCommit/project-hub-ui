// @ts-nocheck

class Base44CompatibilityError extends Error {
  constructor(capability) {
    super(`${capability} is not connected. Migrate this feature to src/api Project Hub services before use.`);
    this.name = 'Base44CompatibilityError';
    this.code = 'BASE44_COMPATIBILITY_ONLY';
  }
}

const rejectCompatibilityCall = (capability) => Promise.reject(new Base44CompatibilityError(capability));

const createEntityAdapter = (entityName) => ({
  list: () => rejectCompatibilityCall(`entities.${entityName}.list`),
  filter: () => rejectCompatibilityCall(`entities.${entityName}.filter`),
  create: () => rejectCompatibilityCall(`entities.${entityName}.create`),
  update: () => rejectCompatibilityCall(`entities.${entityName}.update`),
  delete: () => rejectCompatibilityCall(`entities.${entityName}.delete`),
});

const entities = new Proxy({}, {
  get(target, prop) {
    if (typeof prop !== 'string') return target[prop];
    if (!target[prop]) {
      target[prop] = createEntityAdapter(prop);
    }
    return target[prop];
  },
});

export const base44 = {
  entities,
  auth: {
    me: async () => null,
    updateMe: () => rejectCompatibilityCall('auth.updateMe'),
    logout: () => {
      localStorage.removeItem('project_hub_access_token');
      localStorage.removeItem('token');
    },
    redirectToLogin: () => undefined,
  },
  integrations: {
    Core: {
      UploadFile: () => rejectCompatibilityCall('integrations.Core.UploadFile'),
      InvokeLLM: () => rejectCompatibilityCall('integrations.Core.InvokeLLM'),
      SendEmail: () => rejectCompatibilityCall('integrations.Core.SendEmail'),
    },
  },
  agents: {
    listConversations: () => rejectCompatibilityCall('agents.listConversations'),
    createConversation: () => rejectCompatibilityCall('agents.createConversation'),
    getConversation: () => rejectCompatibilityCall('agents.getConversation'),
    addMessage: () => rejectCompatibilityCall('agents.addMessage'),
    subscribeToConversation: () => () => undefined,
  },
  appLogs: {
    logUserInApp: async () => undefined,
  },
};

export { Base44CompatibilityError };
