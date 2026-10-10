import { ApiRecord, raidApi, mapAssumptionFromApi, mapAssumptionInputToPayload, mapAssumptionListFromApi } from './raid';
import { dependenciesApi, mapDependencyFromApi, mapDependencyInputToPayload } from './projectLogs';

// CRUD adapters for log sheets that are configured by entity name (SimpleRaidSheet).
export interface RaidEntityAdapter {
  commentEntityType: string;
  list: (accountId: string) => Promise<ApiRecord[]>;
  create: (data: ApiRecord) => Promise<ApiRecord>;
  update: (id: string, data: ApiRecord) => Promise<ApiRecord>;
  remove: (id: string) => Promise<unknown>;
}

const requireProject = (data: ApiRecord, noun: string) => {
  if (!data?.project_id) throw new Error(`Select a project before creating a ${noun}.`);
  return data.project_id as string;
};

const assumptionInput = (data: ApiRecord) => {
  // The sheet collects a short title plus description; assumptions only store a description.
  if (data.description === undefined && data.title !== undefined) return { ...data, description: data.title };
  if (data.description === '' && data.title) return { ...data, description: data.title };
  return data;
};

export const raidEntityAdapters: Record<string, RaidEntityAdapter> = {
  Assumption: {
    commentEntityType: 'ASSUMPTION',
    list: async (accountId) => mapAssumptionListFromApi(await raidApi.listAccountAssumptions(accountId)),
    create: async (data) => mapAssumptionFromApi(await raidApi.createAssumption(
      requireProject(data, 'assumption'),
      mapAssumptionInputToPayload(assumptionInput(data)),
    ) as ApiRecord),
    update: async (id, data) => mapAssumptionFromApi(await raidApi.updateAssumption(id, mapAssumptionInputToPayload(data)) as ApiRecord),
    remove: (id) => raidApi.deleteAssumption(id),
  },
  Dependency: {
    commentEntityType: 'DEPENDENCY',
    list: async (accountId) => (await dependenciesApi.listForAccount(accountId)).map(mapDependencyFromApi),
    create: async (data) => mapDependencyFromApi(await dependenciesApi.create(
      requireProject(data, 'dependency'),
      mapDependencyInputToPayload(data),
    )),
    update: async (id, data) => mapDependencyFromApi(await dependenciesApi.update(id, mapDependencyInputToPayload(data))),
    remove: (id) => dependenciesApi.delete(id),
  },
};
