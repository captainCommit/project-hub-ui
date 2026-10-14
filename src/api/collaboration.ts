import { apiClient } from './client';

// Sharing, templates and support tickets. The API uses upper-case enum keys;
// the Base44-era components use lower-case ones.

type ApiRecord = Record<string, any>;

const lower = (value: unknown) => (typeof value === 'string' ? value.toLowerCase() : value);
const upper = (value: unknown) => (typeof value === 'string' ? value.toUpperCase() : value);
const asArray = (response: unknown): ApiRecord[] => (Array.isArray(response) ? response : []);

export const mapShareFromApi = (share: ApiRecord) => ({
  id: share.id,
  item_id: share.item_id,
  item_type: lower(share.item_type),
  shared_with_email: share.shared_with_email,
  access_level: lower(share.access_level),
  created_date: share.created_at,
});

export const sharedAccessApi = {
  list: async (itemType: string, itemId: string) =>
    asArray(await apiClient.get('/api/v1/shared-access', { item_type: upper(itemType), item_id: itemId })).map(mapShareFromApi),
  create: async (data: ApiRecord) => mapShareFromApi(await apiClient.post<ApiRecord>('/api/v1/shared-access', {
    item_type: upper(data.item_type),
    item_id: data.item_id,
    shared_with_email: data.shared_with_email,
    access_level: upper(data.access_level || 'view'),
  })),
  update: async (id: string, data: ApiRecord) =>
    mapShareFromApi(await apiClient.patch<ApiRecord>(`/api/v1/shared-access/${id}`, { access_level: upper(data.access_level) })),
  delete: (id: string) => apiClient.delete(`/api/v1/shared-access/${id}`),
};

/** Templates keep their payload (columns, template tasks, ...) in `content`. */
export const mapTemplateFromApi = (template: ApiRecord) => ({
  ...(template.content || {}),
  id: template.id,
  template_type: lower(template.template_type),
  name: template.name,
  description: template.description || '',
  color: template.color || null,
  created_date: template.created_at,
  updated_date: template.updated_at,
});

const TEMPLATE_META = new Set(['id', 'name', 'description', 'color', 'template_type', 'created_date', 'updated_date']);

const toTemplatePayload = (data: ApiRecord) => {
  const content = Object.fromEntries(Object.entries(data).filter(([key]) => !TEMPLATE_META.has(key)));
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description || null } : {}),
    ...(data.color !== undefined ? { color: data.color || null } : {}),
    ...(Object.keys(content).length ? { content } : {}),
  };
};

export const templatesApi = {
  list: async (accountId: string, templateType = 'project') =>
    asArray(await apiClient.get(`/api/v1/accounts/${accountId}/templates`, { template_type: templateType })).map(mapTemplateFromApi),
  create: async (accountId: string, data: ApiRecord, templateType = 'project') =>
    mapTemplateFromApi(await apiClient.post<ApiRecord>(`/api/v1/accounts/${accountId}/templates`, {
      template_type: upper(templateType),
      ...toTemplatePayload(data),
    })),
  update: async (id: string, data: ApiRecord) =>
    mapTemplateFromApi(await apiClient.patch<ApiRecord>(`/api/v1/templates/${id}`, toTemplatePayload(data))),
  delete: (id: string) => apiClient.delete(`/api/v1/templates/${id}`),
};

export const mapTicketFromApi = (ticket: ApiRecord) => ({
  id: ticket.id,
  ticket_number: ticket.ticket_number,
  category: lower(ticket.category),
  subject: ticket.subject || '',
  description: ticket.description,
  priority: lower(ticket.priority),
  status: lower(ticket.status),
  requester_name: ticket.requester_name,
  requester_email: ticket.requester_email,
  messages: asArray(ticket.messages),
  // Ticket-level attachments are the ones sent with the opening message.
  attachments: asArray(ticket.messages)[0]?.attachments || [],
  created_date: ticket.created_at,
  updated_date: ticket.updated_at,
});

export const supportTicketsApi = {
  list: async (accountId: string) =>
    asArray(await apiClient.get(`/api/v1/accounts/${accountId}/support-tickets`)).map(mapTicketFromApi),
  get: async (id: string) => mapTicketFromApi(await apiClient.get<ApiRecord>(`/api/v1/support-tickets/${id}`)),
  create: async (accountId: string, data: ApiRecord) =>
    mapTicketFromApi(await apiClient.post<ApiRecord>(`/api/v1/accounts/${accountId}/support-tickets`, {
      category: upper(data.category || 'general'),
      subject: data.subject || null,
      description: data.description,
      priority: upper(data.priority || 'medium'),
      requester_name: data.requester_name || null,
      requester_email: data.requester_email || null,
    })),
  update: async (id: string, data: ApiRecord) =>
    mapTicketFromApi(await apiClient.patch<ApiRecord>(`/api/v1/support-tickets/${id}`, {
      ...(data.status ? { status: upper(data.status) } : {}),
      ...(data.priority ? { priority: upper(data.priority) } : {}),
      ...(data.subject !== undefined ? { subject: data.subject } : {}),
    })),
  addMessage: async (id: string, content: string, attachments: ApiRecord[] = []) =>
    mapTicketFromApi(await apiClient.post<ApiRecord>(`/api/v1/support-tickets/${id}/messages`, { content, attachments })),
};
