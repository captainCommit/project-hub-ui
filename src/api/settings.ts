import { apiClient } from './client';

type ApiRecord = Record<string, any>;

const hasOwn = (value: ApiRecord, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const normalizeRoot = (response: any): ApiRecord => {
  if (response?.data && !Array.isArray(response.data)) return response.data;
  if (response && typeof response === 'object' && !Array.isArray(response)) return response;
  return {};
};

const normalizeCollection = (value: any, keys: string[] = []): ApiRecord[] => {
  if (Array.isArray(value)) return value;
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

const addIfPresent = (target: ApiRecord, source: ApiRecord, key: string) => {
  if (hasOwn(source, key) && source[key] !== undefined) target[key] = source[key];
};

export const mapAccountSettings = (settings: ApiRecord = {}) => {
  const mapped: ApiRecord = {};

  addIfPresent(mapped, settings, 'id');
  addIfPresent(mapped, settings, 'account_id');
  addIfPresent(mapped, settings, 'date_format');
  addIfPresent(mapped, settings, 'hide_delivery_section');
  addIfPresent(mapped, settings, 'timezone');
  addIfPresent(mapped, settings, 'week_start_day');
  addIfPresent(mapped, settings, 'working_days');
  addIfPresent(mapped, settings, 'non_working_weekdays');
  addIfPresent(mapped, settings, 'created_at');
  addIfPresent(mapped, settings, 'updated_at');

  return mapped;
};

export const mapAccountSettingsResponse = (response: any) => mapAccountSettings(normalizeRoot(response));

export const mapAccountSettingsPayload = (data: ApiRecord = {}) => {
  const payload: ApiRecord = {};

  addIfPresent(payload, data, 'date_format');
  addIfPresent(payload, data, 'hide_delivery_section');
  addIfPresent(payload, data, 'timezone');
  addIfPresent(payload, data, 'week_start_day');
  addIfPresent(payload, data, 'working_days');
  addIfPresent(payload, data, 'non_working_weekdays');

  return payload;
};

export const mapAccountHoliday = (holiday: ApiRecord = {}) => {
  const mapped: ApiRecord = {};

  addIfPresent(mapped, holiday, 'id');
  addIfPresent(mapped, holiday, 'account_id');
  addIfPresent(mapped, holiday, 'name');
  addIfPresent(mapped, holiday, 'date');
  addIfPresent(mapped, holiday, 'description');
  addIfPresent(mapped, holiday, 'recurring');
  addIfPresent(mapped, holiday, 'created_at');
  addIfPresent(mapped, holiday, 'updated_at');

  return mapped;
};

export const mapAccountHolidayListResponse = (response: any) =>
  normalizeCollection(response, ['holidays', 'items', 'data']).map(mapAccountHoliday);

export const mapAccountHolidayResponse = (response: any) => mapAccountHoliday(normalizeRoot(response));

export const mapAccountHolidayPayload = (data: ApiRecord = {}) => {
  const payload: ApiRecord = {};

  addIfPresent(payload, data, 'name');
  addIfPresent(payload, data, 'date');
  addIfPresent(payload, data, 'description');
  addIfPresent(payload, data, 'recurring');

  return payload;
};

export const mapOptionSet = (optionSet: ApiRecord = {}) => {
  const mapped: ApiRecord = {};

  if (hasOwn(optionSet, 'id')) mapped.id = optionSet.id;
  else if (hasOwn(optionSet, 'option_set_id')) mapped.id = optionSet.option_set_id;
  addIfPresent(mapped, optionSet, 'account_id');
  addIfPresent(mapped, optionSet, 'key');
  addIfPresent(mapped, optionSet, 'code');
  addIfPresent(mapped, optionSet, 'name');
  addIfPresent(mapped, optionSet, 'label');
  addIfPresent(mapped, optionSet, 'description');
  addIfPresent(mapped, optionSet, 'system');
  addIfPresent(mapped, optionSet, 'is_system');
  addIfPresent(mapped, optionSet, 'custom');
  addIfPresent(mapped, optionSet, 'is_custom');
  addIfPresent(mapped, optionSet, 'created_at');
  addIfPresent(mapped, optionSet, 'updated_at');

  return mapped;
};

export const mapOptionSetListResponse = (response: any) =>
  normalizeCollection(response, ['option_sets', 'items', 'data']).map(mapOptionSet);

export const mapOptionValue = (optionValue: ApiRecord = {}) => {
  const mapped: ApiRecord = {};

  if (hasOwn(optionValue, 'id')) mapped.id = optionValue.id;
  else if (hasOwn(optionValue, 'option_value_id')) mapped.id = optionValue.option_value_id;
  addIfPresent(mapped, optionValue, 'option_set_id');
  addIfPresent(mapped, optionValue, 'value');
  addIfPresent(mapped, optionValue, 'label');
  addIfPresent(mapped, optionValue, 'color');
  addIfPresent(mapped, optionValue, 'sort_order');
  addIfPresent(mapped, optionValue, 'active');
  addIfPresent(mapped, optionValue, 'protected');
  addIfPresent(mapped, optionValue, 'is_protected');
  addIfPresent(mapped, optionValue, 'system');
  addIfPresent(mapped, optionValue, 'is_system');
  addIfPresent(mapped, optionValue, 'created_at');
  addIfPresent(mapped, optionValue, 'updated_at');

  return mapped;
};

export const mapOptionValueListResponse = (response: any) =>
  normalizeCollection(response, ['values', 'option_values', 'options', 'items', 'data']).map(mapOptionValue);

export const mapOptionValueResponse = (response: any) => mapOptionValue(normalizeRoot(response));

export const mapOptionValuePayload = (data: ApiRecord = {}) => {
  const payload: ApiRecord = {};

  addIfPresent(payload, data, 'value');
  addIfPresent(payload, data, 'label');
  addIfPresent(payload, data, 'color');
  addIfPresent(payload, data, 'sort_order');
  addIfPresent(payload, data, 'active');

  return payload;
};

export const settingsApi = {
  getAccountSettings: async (accountId: string) => mapAccountSettingsResponse(await apiClient.get(`/api/v1/accounts/${accountId}/settings`)),
  updateAccountSettings: async (accountId: string, data: ApiRecord) =>
    mapAccountSettingsResponse(await apiClient.patch(`/api/v1/accounts/${accountId}/settings`, mapAccountSettingsPayload(data))),
  listHolidays: async (accountId: string) => mapAccountHolidayListResponse(await apiClient.get(`/api/v1/accounts/${accountId}/holidays`)),
  createHoliday: async (accountId: string, data: ApiRecord) =>
    mapAccountHolidayResponse(await apiClient.post(`/api/v1/accounts/${accountId}/holidays`, mapAccountHolidayPayload(data))),
  updateHoliday: async (holidayId: string, data: ApiRecord) =>
    mapAccountHolidayResponse(await apiClient.patch(`/api/v1/account-holidays/${holidayId}`, mapAccountHolidayPayload(data))),
  deleteHoliday: (holidayId: string) => apiClient.delete(`/api/v1/account-holidays/${holidayId}`),
  listOptionSets: async (accountId: string) => mapOptionSetListResponse(await apiClient.get(`/api/v1/accounts/${accountId}/option-sets`)),
  createOptionSet: (accountId: string, data: unknown) => apiClient.post(`/api/v1/accounts/${accountId}/option-sets`, data),
  updateOptionSet: (optionSetId: string, data: unknown) => apiClient.patch(`/api/v1/option-sets/${optionSetId}`, data),
  deleteOptionSet: (optionSetId: string) => apiClient.delete(`/api/v1/option-sets/${optionSetId}`),
  listOptions: async (accountId: string) => mapOptionValueListResponse(await apiClient.get(`/api/v1/accounts/${accountId}/options`)),
  listOptionValues: async (optionSetId: string) => mapOptionValueListResponse(await apiClient.get(`/api/v1/option-sets/${optionSetId}/values`)),
  createOptionValue: async (optionSetId: string, data: ApiRecord) =>
    mapOptionValueResponse(await apiClient.post(`/api/v1/option-sets/${optionSetId}/values`, mapOptionValuePayload(data))),
  updateOptionValue: async (optionValueId: string, data: ApiRecord) =>
    mapOptionValueResponse(await apiClient.patch(`/api/v1/option-values/${optionValueId}`, mapOptionValuePayload(data))),
  deleteOptionValue: (optionValueId: string) => apiClient.delete(`/api/v1/option-values/${optionValueId}`),
  deactivateOptionValue: (optionValueId: string) => apiClient.delete(`/api/v1/option-values/${optionValueId}`),
};