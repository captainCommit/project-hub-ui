/** Split CSV text into rows of cells. Handles quoted cells, doubled quotes, newlines in quotes, CRLF and a BOM. */
export function parseCsv(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** "% Complete", "percent_complete" and "Percent Complete" all become "percentcomplete". */
const normalizeHeader = (value) => String(value).toLowerCase().replace(/%/g, 'percent').replace(/[^a-z0-9]/g, '');

/**
 * Turn CSV text into records keyed by column key.
 * columns: [{ key, label, aliases? }]. Headers match a column's key, label or aliases, ignoring case and punctuation.
 * Returns { records, unknownHeaders, missing } where missing lists required columns with no header.
 */
export function readCsvRecords(text, columns) {
  const [header = [], ...body] = parseCsv(text);
  const byName = new Map();
  columns.forEach((c) => [c.key, c.label, ...(c.aliases || [])].forEach((n) => byName.set(normalizeHeader(n), c.key)));
  const keys = header.map((h) => byName.get(normalizeHeader(h)) || null);
  const unknownHeaders = header.filter((h, i) => !keys[i] && h.trim());
  const missing = columns.filter((c) => c.required && !keys.includes(c.key)).map((c) => c.label);
  const records = body.map((cells) => {
    const record = {};
    keys.forEach((key, i) => { if (key) record[key] = (cells[i] ?? '').trim(); });
    return record;
  });
  return { records, unknownHeaders, missing };
}
