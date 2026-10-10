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