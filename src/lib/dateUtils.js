/**
 * Formats a yyyy-MM-dd date string using the app's date format setting.
 * Default: MM/dd/yyyy
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    const fmt = (typeof localStorage !== 'undefined' && localStorage.getItem('app_date_format')) || 'MM/dd/yyyy';
    if (fmt === 'dd/MM/yyyy') return `${d}/${m}/${y}`;
    if (fmt === 'D MMM YYYY') {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
    }
    return `${m}/${d}/${y}`; // default MM/dd/yyyy
  } catch {
    return dateStr;
  }
}

export function formatDateRange(start, end) {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `From ${formatDate(start)}`;
  if (end) return `Until ${formatDate(end)}`;
  return '—';
}

/**
 * Turn an API date into a Date at local midnight.
 * `new Date('2026-06-19')` means midnight UTC, which is still June 18 in the Americas;
 * date-only strings are read as that calendar day wherever the user is. Date objects are copied.
 */
export function parseDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
}
