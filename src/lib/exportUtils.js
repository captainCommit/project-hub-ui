export function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// columns: [{ label: 'Title', key: 'title' }] or [{ label: 'Title', value: (r) => r.title }]
export function exportRecords(records, columns, filename) {
  const header = columns.map(c => c.label);
  const rows = records.map(r => columns.map(c => (typeof c.value === 'function' ? c.value(r) : r[c.key]) ?? ''));
  downloadCSV([header, ...rows], filename);
}