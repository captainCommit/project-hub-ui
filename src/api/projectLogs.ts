import { apiClient } from './client';
import { ApiRecord, asArray, buildPayload, dateOnly, mapLogBase } from './raid';

// Dependencies, change requests, requirements and test cases: project-scoped
// logs that share the RAID contract (numbered, status/priority option keys).

const collectionApi = (collection: string) => ({
  listForAccount: async (accountId: string, query?: Record<string, unknown>) =>
    asArray(await apiClient.get(`/api/v1/accounts/${accountId}/${collection}`, query)),
  listForProject: async (projectId: string, query?: Record<string, unknown>) =>
    asArray(await apiClient.get(`/api/v1/projects/${projectId}/${collection}`, query)),
  get: (id: string) => apiClient.get<ApiRecord>(`/api/v1/${collection}/${id}`),
  create: (projectId: string, payload: ApiRecord) =>
    apiClient.post<ApiRecord>(`/api/v1/projects/${projectId}/${collection}`, payload),
  update: (id: string, payload: ApiRecord) => apiClient.patch<ApiRecord>(`/api/v1/${collection}/${id}`, payload),
  delete: (id: string) => apiClient.delete(`/api/v1/${collection}/${id}`),
});

export const mapDependencyFromApi = (record: ApiRecord = {}) => ({
  ...mapLogBase(record, 'dependency_number'),
  dependency_id: record.dependency_number || record.id,
  impact_of_delay: record.impact_of_delay || '',
  fallback_plan: record.fallback_plan || '',
  assigned_to: record.assigned_to_name || '',
  entered_by: record.entered_by_name || record.created_by_name || '',
  date_entered: dateOnly(record.date_entered || record.created_at),
});

export const mapDependencyInputToPayload = (input: ApiRecord = {}) => buildPayload(input, {
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  impact_of_delay: 'impact_of_delay',
  fallback_plan: 'fallback_plan',
  assigned_to: 'assigned_to_name',
  entered_by: 'entered_by_name',
  date_entered: 'date_entered',
});

export const mapChangeRequestFromApi = (record: ApiRecord = {}) => ({
  ...mapLogBase(record, 'change_request_number'),
  cr_id: record.change_request_number || record.id,
  proposed_by: record.proposed_by_name || '',
  proposed_date: dateOnly(record.proposed_date),
  related_record: record.related_record || '',
});

export const mapChangeRequestInputToPayload = (input: ApiRecord = {}) => buildPayload(input, {
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  proposed_by: 'proposed_by_name',
  proposed_date: 'proposed_date',
  related_record: 'related_record',
});

export const mapRequirementFromApi = (record: ApiRecord = {}) => ({
  ...mapLogBase(record, 'requirement_number'),
  requirement_id: record.requirement_number || record.id,
  entered_by: record.entered_by_name || record.created_by_name || '',
  entered_date: dateOnly(record.entered_date || record.created_at),
  test_case_id: Array.isArray(record.test_case_ids) ? record.test_case_ids : [],
});

export const mapRequirementInputToPayload = (input: ApiRecord = {}) => buildPayload(input, {
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  entered_by: 'entered_by_name',
  entered_date: 'entered_date',
});

const TEST_RESULTS: Record<string, string> = { NOT_EXECUTED: 'not_executed', PASS: 'pass', FAIL: 'fail' };

export const mapTestCaseFromApi = (record: ApiRecord = {}) => ({
  ...mapLogBase(record, 'test_case_number'),
  test_case_id: record.test_case_number || record.id,
  sprint_id: record.sprint_id || '',
  requirement_id: record.requirement_id || '',
  designed_by: record.designed_by_name || '',
  executed_by: record.executed_by_name || '',
  execution_date: dateOnly(record.execution_date),
  pass_fail: TEST_RESULTS[record.result] || 'not_executed',
  dependencies: record.dependencies || '',
  test_steps: record.test_steps || '',
  conditions: record.conditions || '',
  test_input: record.test_input || '',
  expected_results: record.expected_results || '',
  actual_results: record.actual_results || '',
  comments: record.notes || '',
});

export const mapTestCaseInputToPayload = (input: ApiRecord = {}) => {
  const payload = buildPayload(input, {
    title: 'title',
    description: 'description',
    priority: 'priority',
    sprint_id: 'sprint_id',
    requirement_id: 'requirement_id',
    designed_by: 'designed_by_name',
    executed_by: 'executed_by_name',
    execution_date: 'execution_date',
    dependencies: 'dependencies',
    test_steps: 'test_steps',
    conditions: 'conditions',
    test_input: 'test_input',
    expected_results: 'expected_results',
    actual_results: 'actual_results',
    comments: 'notes',
  });
  if (input.pass_fail) payload.result = String(input.pass_fail).toUpperCase();
  return payload;
};

export const dependenciesApi = collectionApi('dependencies');
export const changeRequestsApi = collectionApi('change-requests');
export const requirementsApi = collectionApi('requirements');
export const testCasesApi = collectionApi('test-cases');
