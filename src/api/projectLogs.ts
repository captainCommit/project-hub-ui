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
  // The UI links records by display code (TC-001), so expose codes alongside ids.
  test_case_id: Array.isArray(record.test_case_numbers) ? record.test_case_numbers : [],
  test_case_uuids: Array.isArray(record.test_case_ids) ? record.test_case_ids : [],
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
  sprint_id: record.sprint_name || '',
  sprint_uuid: record.sprint_id || null,
  requirement_id: record.requirement_number || '',
  requirement_uuid: record.requirement_id || null,
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

interface TestCaseLookups {
  requirements?: ApiRecord[];
  sprints?: ApiRecord[];
}

/** Resolve a display code (or id) chosen in the UI back to the record id, preferring the same project. */
const resolveCode = (records: ApiRecord[] = [], codeField: string, value: unknown, projectId?: string) => {
  if (!value) return null;
  const matches = records.filter((record) => record.id === value || record[codeField] === value);
  const match = matches.find((record) => !projectId || record.project_id === projectId) || matches[0];
  return match ? match.id : null;
};

export const mapTestCaseInputToPayload = (input: ApiRecord = {}, lookups: TestCaseLookups = {}) => {
  const resolved = { ...input };
  if (Object.prototype.hasOwnProperty.call(input, 'requirement_id')) {
    resolved.requirement_id = resolveCode(lookups.requirements, 'requirement_id', input.requirement_id, input.project_id);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'sprint_id')) {
    resolved.sprint_id = resolveCode(lookups.sprints, 'sprint_id', input.sprint_id, input.project_id);
  }
  const payload = buildPayload(resolved, {
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
export const requirementsApi = {
  ...collectionApi('requirements'),
  /**
   * Requirements own their test-case links in the UI, but the API stores the link on
   * the test case. Point selected test cases at the requirement and unlink the rest.
   */
  syncTestCaseLinks: async (requirementId: string, selectedCodes: string[], testCases: ApiRecord[]) => {
    const selected = new Set(selectedCodes);
    const updates = testCases
      .map((testCase) => {
        const shouldLink = selected.has(testCase.test_case_id) || selected.has(testCase.id);
        const isLinked = testCase.requirement_uuid === requirementId;
        if (shouldLink && !isLinked) return apiClient.patch(`/api/v1/test-cases/${testCase.id}`, { requirement_id: requirementId });
        if (!shouldLink && isLinked) return apiClient.patch(`/api/v1/test-cases/${testCase.id}`, { requirement_id: null });
        return null;
      })
      .filter(Boolean);
    await Promise.all(updates);
  },
};
export const testCasesApi = collectionApi('test-cases');
