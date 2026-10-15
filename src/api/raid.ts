import { apiClient } from './client';
import { optionKey } from './lookups';

const projectCollection = (projectId: string, collection: string) => `/api/v1/projects/${projectId}/${collection}`;
const accountCollection = (accountId: string, collection: string) => `/api/v1/accounts/${accountId}/${collection}`;

export type ApiRecord = Record<string, any>;

export const asArray = (response: any): ApiRecord[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

export const dateOnly = (value: any) => {
  if (!value || typeof value !== 'string') return value || '';
  return value.includes('T') ? value.split('T')[0] : value;
};

/**
 * Build a create/update payload from UI form values. Only keys present on the
 * input are sent, so partial updates stay partial. `spec` maps UI key -> API key.
 * Empty strings become null (clearing a field); for option keys they are skipped.
 */
export const buildPayload = (input: ApiRecord, spec: Record<string, string>) => {
  const payload: ApiRecord = {};
  Object.entries(spec).forEach(([uiKey, apiKey]) => {
    if (!Object.prototype.hasOwnProperty.call(input, uiKey) || input[uiKey] === undefined) return;
    const value = input[uiKey];
    if (apiKey === 'status' || apiKey === 'priority') {
      if (value) payload[apiKey] = String(value);
      return;
    }
    payload[apiKey] = value === '' ? null : value;
  });
  return payload;
};

/** Fields every project-scoped log record exposes to the UI. */
export const mapLogBase = (record: ApiRecord, numberField: string) => ({
  id: record.id,
  reference_number: record[numberField],
  project_id: record.project_id,
  program_id: record.program_id,
  portfolio_id: record.portfolio_id,
  project_name: record.project?.name || '',
  title: record.title || '',
  description: record.description || '',
  status: optionKey(record.status) || '',
  status_id: record.status_id,
  priority: optionKey(record.priority) || '',
  priority_id: record.priority_id,
  logged_by: record.created_by_name || '',
  comment_count: record.comment_count ?? 0,
  created_by: record.created_by,
  created_date: record.created_at,
  created_at: record.created_at,
  updated_date: record.updated_at,
  updated_at: record.updated_at,
  raw: record,
});

export const mapRiskFromApi = (risk: ApiRecord = {}) => ({
  ...mapLogBase(risk, 'risk_number'),
  risk_id: risk.risk_number || risk.id,
  cause: risk.cause || '',
  effect: risk.effect || '',
  assigned_to: risk.assigned_to_name || '',
  date_entered: dateOnly(risk.created_at),
  target_date: dateOnly(risk.target_resolution_date),
});

export const mapRiskListFromApi = (response: any) => asArray(response).map(mapRiskFromApi);

export const mapRiskInputToPayload = (input: ApiRecord = {}) => buildPayload(input, {
  title: 'title',
  cause: 'cause',
  effect: 'effect',
  status: 'status',
  priority: 'priority',
  assigned_to: 'assigned_to_name',
  target_date: 'target_resolution_date',
});

export const mapIssueFromApi = (issue: ApiRecord = {}) => ({
  ...mapLogBase(issue, 'issue_number'),
  issue_id: issue.issue_number || issue.id,
  what_happening: issue.description || '',
  assigned_to: issue.assigned_to_name || '',
  date_entered: dateOnly(issue.created_at),
  target_date: dateOnly(issue.target_resolution_date),
});

export const mapIssueListFromApi = (response: any) => asArray(response).map(mapIssueFromApi);

export const mapIssueInputToPayload = (input: ApiRecord = {}) => {
  const normalized = { ...input };
  if (!normalized.description && normalized.what_happening) {
    normalized.description = normalized.impact
      ? `${normalized.what_happening}\n\nImpact: ${normalized.impact}`
      : normalized.what_happening;
  }
  return buildPayload(normalized, {
    title: 'title',
    description: 'description',
    status: 'status',
    priority: 'priority',
    assigned_to: 'assigned_to_name',
    target_date: 'target_resolution_date',
  });
};

export const mapAssumptionFromApi = (assumption: ApiRecord = {}) => ({
  ...mapLogBase(assumption, 'assumption_number'),
  assumption_id: assumption.assumption_number || assumption.id,
  title: assumption.description || '',
  entered_by: assumption.entered_by_name || assumption.created_by_name || '',
  date_entered: dateOnly(assumption.date_entered || assumption.created_at),
  assigned_to: assumption.assigned_to_name || '',
  target_date: dateOnly(assumption.target_date),
});

export const mapAssumptionListFromApi = (response: any) => asArray(response).map(mapAssumptionFromApi);

export const mapAssumptionInputToPayload = (input: ApiRecord = {}) => buildPayload(input, {
  description: 'description',
  status: 'status',
  entered_by: 'entered_by_name',
  date_entered: 'date_entered',
  assigned_to: 'assigned_to_name',
  target_date: 'target_date',
});

export const mapDecisionFromApi = (decision: ApiRecord = {}) => ({
  ...mapLogBase(decision, 'decision_number'),
  decision_id: decision.decision_number || decision.id,
  decision: decision.title || '',
  impact: decision.impact || '',
  proposed_date: dateOnly(decision.proposed_date),
  proposed_by: decision.proposed_by_name || '',
  approved_date: dateOnly(decision.approved_date),
  related_record: decision.related_record || '',
});

export const mapDecisionListFromApi = (response: any) => asArray(response).map(mapDecisionFromApi);

export const mapDecisionInputToPayload = (input: ApiRecord = {}) => {
  const normalized = { ...input };
  if (normalized.decision !== undefined && normalized.title === undefined) normalized.title = normalized.decision;
  return buildPayload(normalized, {
    title: 'title',
    description: 'description',
    impact: 'impact',
    status: 'status',
    priority: 'priority',
    proposed_date: 'proposed_date',
    proposed_by: 'proposed_by_name',
    approved_date: 'approved_date',
    related_record: 'related_record',
  });
};

export const mapDecisionOptionFromApi = (option: ApiRecord = {}) => ({
  id: option.id,
  decision_id: option.decision_id,
  title: option.title || '',
  pros: option.pros || '',
  cons: option.cons || '',
  effort: option.work_effort || '',
  sort_order: option.sort_order,
  created_at: option.created_at,
  updated_at: option.updated_at,
  raw: option,
});

export const mapDecisionOptionListFromApi = (response: any) => asArray(response).map(mapDecisionOptionFromApi);

export const mapDecisionOptionInputToPayload = (input: ApiRecord = {}) => buildPayload(input, {
  title: 'title',
  pros: 'pros',
  cons: 'cons',
  effort: 'work_effort',
  sort_order: 'sort_order',
});

export const raidApi = {
  listProjectRisks: (projectId: string, query?: Record<string, unknown>) => apiClient.get(projectCollection(projectId, 'risks'), query),
  listAccountRisks: (accountId: string, query?: Record<string, unknown>) => apiClient.get(accountCollection(accountId, 'risks'), query),
  createRisk: (projectId: string, data: unknown) => apiClient.post(projectCollection(projectId, 'risks'), data),
  getRisk: (riskId: string) => apiClient.get(`/api/v1/risks/${riskId}`),
  updateRisk: (riskId: string, data: unknown) => apiClient.patch(`/api/v1/risks/${riskId}`, data),
  deleteRisk: (riskId: string) => apiClient.delete(`/api/v1/risks/${riskId}`),

  listProjectIssues: (projectId: string, query?: Record<string, unknown>) => apiClient.get(projectCollection(projectId, 'issues'), query),
  listAccountIssues: (accountId: string, query?: Record<string, unknown>) => apiClient.get(accountCollection(accountId, 'issues'), query),
  createIssue: (projectId: string, data: unknown) => apiClient.post(projectCollection(projectId, 'issues'), data),
  getIssue: (issueId: string) => apiClient.get(`/api/v1/issues/${issueId}`),
  updateIssue: (issueId: string, data: unknown) => apiClient.patch(`/api/v1/issues/${issueId}`, data),
  deleteIssue: (issueId: string) => apiClient.delete(`/api/v1/issues/${issueId}`),

  listProjectAssumptions: (projectId: string, query?: Record<string, unknown>) => apiClient.get(projectCollection(projectId, 'assumptions'), query),
  listAccountAssumptions: (accountId: string, query?: Record<string, unknown>) => apiClient.get(accountCollection(accountId, 'assumptions'), query),
  createAssumption: (projectId: string, data: unknown) => apiClient.post(projectCollection(projectId, 'assumptions'), data),
  getAssumption: (assumptionId: string) => apiClient.get(`/api/v1/assumptions/${assumptionId}`),
  updateAssumption: (assumptionId: string, data: unknown) => apiClient.patch(`/api/v1/assumptions/${assumptionId}`, data),
  deleteAssumption: (assumptionId: string) => apiClient.delete(`/api/v1/assumptions/${assumptionId}`),

  listProjectDecisions: (projectId: string, query?: Record<string, unknown>) => apiClient.get(projectCollection(projectId, 'decisions'), query),
  listAccountDecisions: (accountId: string, query?: Record<string, unknown>) => apiClient.get(accountCollection(accountId, 'decisions'), query),
  createDecision: (projectId: string, data: unknown) => apiClient.post(projectCollection(projectId, 'decisions'), data),
  getDecision: (decisionId: string) => apiClient.get(`/api/v1/decisions/${decisionId}`),
  updateDecision: (decisionId: string, data: unknown) => apiClient.patch(`/api/v1/decisions/${decisionId}`, data),
  deleteDecision: (decisionId: string) => apiClient.delete(`/api/v1/decisions/${decisionId}`),
  listDecisionOptions: (decisionId: string) => apiClient.get(`/api/v1/decisions/${decisionId}/options`),
  createDecisionOption: (decisionId: string, data: unknown) => apiClient.post(`/api/v1/decisions/${decisionId}/options`, data),
  getDecisionOption: (optionId: string) => apiClient.get(`/api/v1/decision-options/${optionId}`),
  updateDecisionOption: (optionId: string, data: unknown) => apiClient.patch(`/api/v1/decision-options/${optionId}`, data),
  deleteDecisionOption: (optionId: string) => apiClient.delete(`/api/v1/decision-options/${optionId}`),
};
