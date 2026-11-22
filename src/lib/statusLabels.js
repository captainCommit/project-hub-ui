import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { settingsApi } from '@/api/settings';

// Labels and colours for the statuses the app works out itself (portfolio/program/project status pills and RAG
// health), which an account can rename in Settings > Status & Priority Labels. Stored on the account settings as
// status_labels: { WORK_STATUS: { in_progress: { label, color } }, HEALTH: { red: ... }, TEST_RESULT: { pass: ... } }.

/** The colours on offer. Pills use the swatch's soft background and dark text; bars and dots use `hex`. */
export const SWATCHES = [
  { name: 'Grey', hex: '#64748B', bg: '#F1F5F9', fg: '#64748B' },
  { name: 'Blue', hex: '#2563EB', bg: '#DBEAFE', fg: '#1D4ED8' },
  { name: 'Amber', hex: '#F59E0B', bg: '#FEF3C7', fg: '#B45309' },
  { name: 'Green', hex: '#16A34A', bg: '#DCFCE7', fg: '#15803D' },
  { name: 'Red', hex: '#DC2626', bg: '#FEE2E2', fg: '#DC2626' },
  { name: 'Purple', hex: '#7C3AED', bg: '#EDE9FE', fg: '#6D28D9' },
  { name: 'Teal', hex: '#0D9488', bg: '#CCFBF1', fg: '#0F766E' },
];
const [GREY, BLUE, AMBER, GREEN, RED] = SWATCHES.map(s => s.hex);

export const swatchFor = (hex) => SWATCHES.find(s => s.hex.toLowerCase() === String(hex || '').toLowerCase()) || SWATCHES[0];

export const WORK_STATUS_DEFAULTS = {
  not_started: { label: 'Not Started', color: GREY },
  in_progress: { label: 'In Progress', color: BLUE },
  on_hold: { label: 'On Hold', color: AMBER },
  completed: { label: 'Completed', color: GREEN },
  cancelled: { label: 'Cancelled', color: RED },
};

export const HEALTH_DEFAULTS = {
  green: { label: 'On Track', color: GREEN },
  amber: { label: 'At Risk', color: AMBER },
  red: { label: 'Off Track', color: RED },
  grey: { label: 'Not Started', color: GREY },
  na: { label: 'Not Applicable', color: GREY },
};

// Test case results (Testing). The API's NOT_EXECUTED / PASS / FAIL.
export const TEST_RESULT_DEFAULTS = {
  not_executed: { label: 'Not Implemented', color: GREY },
  pass: { label: 'Pass', color: GREEN },
  fail: { label: 'Fail', color: RED },
};

const merge = (defaults, overrides = {}) => Object.fromEntries(Object.entries(defaults).map(([key, base]) => [
  key, { ...base, ...(overrides[key]?.label ? { label: overrides[key].label } : {}), ...(overrides[key]?.color ? { color: overrides[key].color } : {}) },
]));

export const accountSettingsQueryKey = (accountId) => ['account-settings', accountId];

/** { workStatus: { not_started: { label, color } ... }, health: { green: ... }, testResult: { pass: ... }, raw } */
export function useStatusLabels() {
  const { selectedAccountId } = useAuth();
  const { data } = useQuery({
    queryKey: accountSettingsQueryKey(selectedAccountId),
    queryFn: () => settingsApi.getAccountSettings(selectedAccountId),
    enabled: !!selectedAccountId,
    staleTime: 60_000,
  });
  const raw = data?.status_labels;
  return useMemo(() => ({
    workStatus: merge(WORK_STATUS_DEFAULTS, raw?.WORK_STATUS),
    health: merge(HEALTH_DEFAULTS, raw?.HEALTH),
    testResult: merge(TEST_RESULT_DEFAULTS, raw?.TEST_RESULT),
    raw: raw || {},
  }), [raw]);
}
