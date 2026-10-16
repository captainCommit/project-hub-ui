import { apiClient } from './client';

// Search across everything the signed-in person can see (GET /search).

export type SearchEntityType =
  | 'PORTFOLIO' | 'PROGRAM' | 'PROJECT' | 'TASK' | 'RISK' | 'ISSUE'
  | 'ASSUMPTION' | 'DECISION' | 'DEPENDENCY' | 'CHANGE_REQUEST' | 'REQUIREMENT' | 'TEST_CASE'
  | 'SPRINT' | 'RESOURCE' | 'SKILL';

export type SearchResult = {
  entity_type: SearchEntityType;
  id: string;
  project_id: string | null;
  title: string;
  subtitle: string | null;
  score: number;
};

export const searchApi = {
  search: async (q: string, limit = 20): Promise<SearchResult[]> => {
    const response = await apiClient.get<{ results?: SearchResult[] }>('/api/v1/search', { q, limit });
    return Array.isArray(response?.results) ? response.results : [];
  },
};
