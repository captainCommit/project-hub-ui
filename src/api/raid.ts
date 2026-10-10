import { apiClient } from './client';

const projectCollection = (projectId: string, collection: string) => `/api/v1/projects/${projectId}/${collection}`;
const accountCollection = (accountId: string, collection: string) => `/api/v1/accounts/${accountId}/${collection}`;

type RiskApiRecord = Record<string, any>;

const asArray = (response: any): RiskApiRecord[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.risks)) return response.risks;
  if (Array.isArray(response?.issues)) return response.issues;
  if (Array.isArray(response?.assumptions)) return response.assumptions;
  if (Array.isArray(response?.decisions)) return response.decisions;
  if (Array.isArray(response?.options)) return response.options;
  return [];
};

const firstValue = (record: RiskApiRecord, keys: string[]) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) return record[key];
  }
  return undefined;
};

const dateOnly = (value: any) => {
  if (!value || typeof value !== 'string') return value || '';
  return value.includes('T') ? value.split('T')[0] : value;
};

const compact = (record: RiskApiRecord) => Object.fromEntries(
  Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== '')
);

export const mapRiskFromApi = (risk: RiskApiRecord = {}) => {
  const id = firstValue(risk, ['id', 'risk_id', 'uuid']);
  const reference = firstValue(risk, ['risk_id', 'reference_number', 'reference', 'risk_number', 'number']);
  const status = firstValue(risk, ['status', 'status_id']);
  const priority = firstValue(risk, ['priority', 'priority_id']);
  const assignedTo = firstValue(risk, ['assigned_to', 'owner']);
  const createdBy = firstValue(risk, ['created_by', 'logged_by']);

  return {
    id,
    risk_id: reference || id,
    reference_number: reference,
    project_id: risk.project_id,
    program_id: risk.program_id,
    title: risk.title || risk.description || reference || 'Untitled risk',
    description: risk.description || '',
    status,
    status_id: risk.status_id,
    priority,
    priority_id: risk.priority_id,
    probability: risk.probability,
    impact: risk.impact,
    owner: risk.owner,
    assigned_to: assignedTo || '',
    logged_by: createdBy || '',
    created_by: createdBy,
    date_entered: dateOnly(firstValue(risk, ['date_entered', 'created_at', 'created_date'])),
    target_date: dateOnly(risk.target_date),
    mitigation: risk.mitigation || '',
    created_at: risk.created_at,
    updated_at: risk.updated_at,
    raw: risk,
  };
};

export const mapRiskListFromApi = (response: any) => asArray(response).map(mapRiskFromApi);

export const mapRiskInputToPayload = (input: RiskApiRecord = {}) => compact({
  title: input.title,
  description: input.description,
  status: input.status,
  status_id: input.status_id,
  priority: input.priority,
  priority_id: input.priority_id,
  probability: input.probability,
  impact: input.impact,
  assigned_to: input.assigned_to,
  owner: input.owner,
  date_entered: input.date_entered,
  target_date: input.target_date,
  mitigation: input.mitigation,
});

export const mapIssueFromApi = (issue: RiskApiRecord = {}) => {
  const id = firstValue(issue, ['id', 'issue_id', 'uuid']);
  const reference = firstValue(issue, ['issue_id', 'reference_number', 'reference', 'issue_number', 'number']);
  const status = firstValue(issue, ['status', 'status_id']);
  const priority = firstValue(issue, ['priority', 'priority_id']);
  const assignedTo = firstValue(issue, ['assigned_to', 'owner']);
  const createdBy = firstValue(issue, ['created_by', 'logged_by']);

  return {
    id,
    issue_id: reference || id,
    reference_number: reference,
    project_id: issue.project_id,
    program_id: issue.program_id,
    title: issue.title || issue.description || reference || 'Untitled issue',
    description: issue.description || '',
    status,
    status_id: issue.status_id,
    priority,
    priority_id: issue.priority_id,
    owner: issue.owner,
    assigned_to: assignedTo || '',
    logged_by: createdBy || '',
    created_by: createdBy,
    date_entered: dateOnly(firstValue(issue, ['date_entered', 'created_at', 'created_date'])),
    target_date: dateOnly(issue.target_date),
    resolution: issue.resolution || '',
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    raw: issue,
  };
};

export const mapIssueListFromApi = (response: any) => asArray(response).map(mapIssueFromApi);

export const mapIssueInputToPayload = (input: RiskApiRecord = {}) => compact({
  title: input.title,
  description: input.description,
  status: input.status,
  status_id: input.status_id,
  priority: input.priority,
  priority_id: input.priority_id,
  assigned_to: input.assigned_to,
  owner: input.owner,
  date_entered: input.date_entered,
  target_date: input.target_date,
  resolution: input.resolution,
});

export const mapAssumptionFromApi = (assumption: RiskApiRecord = {}) => {
  const id = firstValue(assumption, ['id', 'assumption_id', 'uuid']);
  const reference = firstValue(assumption, ['assumption_id', 'reference_number', 'reference', 'assumption_number', 'number']);
  const description = firstValue(assumption, ['description', 'assumption_description']);
  const status = firstValue(assumption, ['status', 'status_id']);
  const assignedTo = firstValue(assumption, ['assigned_to', 'owner']);
  const enteredBy = firstValue(assumption, ['entered_by', 'created_by']);

  return {
    id,
    assumption_id: reference || id,
    reference_number: reference,
    project_id: assumption.project_id,
    program_id: assumption.program_id,
    title: assumption.title || description || reference || 'Untitled assumption',
    description: description || '',
    assumption_description: assumption.assumption_description,
    status,
    status_id: assumption.status_id,
    owner: assumption.owner,
    assigned_to: assignedTo || '',
    entered_by: enteredBy || '',
    created_by: assumption.created_by,
    date_entered: dateOnly(firstValue(assumption, ['date_entered', 'created_at', 'created_date'])),
    target_date: dateOnly(assumption.target_date),
    comments: Array.isArray(assumption.comments) ? assumption.comments : [],
    created_at: assumption.created_at,
    updated_at: assumption.updated_at,
    raw: assumption,
  };
};

export const mapAssumptionListFromApi = (response: any) => asArray(response).map(mapAssumptionFromApi);

export const mapAssumptionInputToPayload = (input: RiskApiRecord = {}) => compact({
  title: input.title,
  description: input.description || input.assumption_description,
  assumption_description: input.assumption_description,
  status: input.status,
  status_id: input.status_id,
  owner: input.owner,
  assigned_to: input.assigned_to,
  entered_by: input.entered_by,
  date_entered: input.date_entered,
  target_date: input.target_date,
  comments: input.comments,
});

export const mapDecisionFromApi = (decision: RiskApiRecord = {}) => {
  const id = firstValue(decision, ['id', 'decision_id', 'uuid']);
  const reference = firstValue(decision, ['decision_id', 'reference_number', 'reference', 'decision_number', 'number']);
  const decisionText = firstValue(decision, ['decision', 'description', 'title']);
  const status = firstValue(decision, ['status', 'status_id']);
  const priority = firstValue(decision, ['priority', 'priority_id']);

  return {
    id,
    decision_id: reference || id,
    reference_number: reference,
    project_id: decision.project_id,
    program_id: decision.program_id,
    title: decision.title || decisionText || reference || 'Untitled decision',
    decision: decisionText || '',
    description: decision.description || '',
    status,
    status_id: decision.status_id,
    priority,
    priority_id: decision.priority_id,
    proposed_date: dateOnly(decision.proposed_date),
    proposed_by: decision.proposed_by || '',
    decided_date: dateOnly(decision.decided_date),
    decided_by: decision.decided_by || '',
    approved_date: dateOnly(decision.decided_date),
    approved_by: Array.isArray(decision.decided_by) ? decision.decided_by : (decision.decided_by ? [decision.decided_by] : []),
    rationale: decision.rationale || '',
    outcome: decision.outcome || '',
    created_by: decision.created_by,
    created_at: decision.created_at,
    updated_at: decision.updated_at,
    raw: decision,
  };
};

export const mapDecisionListFromApi = (response: any) => asArray(response).map(mapDecisionFromApi);

export const mapDecisionInputToPayload = (input: RiskApiRecord = {}) => compact({
  title: input.title || input.decision,
  decision: input.decision,
  description: input.description,
  status: input.status,
  status_id: input.status_id,
  priority: input.priority,
  priority_id: input.priority_id,
  proposed_date: input.proposed_date,
  proposed_by: input.proposed_by,
  decided_date: input.decided_date || input.approved_date,
  decided_by: input.decided_by || (Array.isArray(input.approved_by) ? input.approved_by.join(', ') : input.approved_by),
  rationale: input.rationale,
  outcome: input.outcome,
});

export const mapDecisionOptionFromApi = (option: RiskApiRecord = {}) => ({
  id: option.id,
  decision_id: option.decision_id,
  title: option.title || option.name || '',
  pros: option.pros || '',
  cons: option.cons || '',
  effort: firstValue(option, ['effort', 'work_effort']) || '',
  description: option.description || '',
  created_at: option.created_at,
  updated_at: option.updated_at,
  raw: option,
});

export const mapDecisionOptionListFromApi = (response: any) => asArray(response).map(mapDecisionOptionFromApi);

export const mapDecisionOptionInputToPayload = (input: RiskApiRecord = {}) => compact({
  title: input.title,
  pros: input.pros,
  cons: input.cons,
  effort: input.effort,
  work_effort: input.work_effort,
  description: input.description,
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