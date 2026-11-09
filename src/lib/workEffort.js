// A decision option's work effort: a number and a unit, stored as HOURS, DAYS or WEEKS.

export const WORK_EFFORT_UNITS = [
  { value: 'HOURS', label: 'Hour(s)', one: 'Hour', many: 'Hours' },
  { value: 'DAYS', label: 'Day(s)', one: 'Day', many: 'Days' },
  { value: 'WEEKS', label: 'Week(s)', one: 'Week', many: 'Weeks' },
];

export const WORK_EFFORT_HELP = 'The amount of work required to apply the change, assuming a dedicated resource (e.g. 40 hours = 1 week at 40 hours/week). It is not a calendar duration.';

/** "120 Hours"; falls back to older free text such as "Medium"; empty when nothing is recorded. */
export function formatWorkEffort(value, unit, legacyText = '') {
  if (value === null || value === undefined || value === '') return legacyText || '';
  const amount = Number(value);
  const names = WORK_EFFORT_UNITS.find(u => u.value === unit) || WORK_EFFORT_UNITS[0];
  return `${amount.toLocaleString()} ${amount === 1 ? names.one : names.many}`;
}
