// Turning a written report (Markdown, from the API) into files: a PDF of the rendered preview, or a PowerPoint
// with one slide per "## " section. The libraries are loaded only when someone downloads.

const NAVY = '002046';
const ORANGE = 'c87b14';
const BULLETS_PER_SLIDE = 8;
const TABLE_ROWS_PER_SLIDE = 9;

export const reportFileName = (report, extension) =>
  `${report.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'report'}_${new Date().toISOString().slice(0, 10)}.${extension}`;

/** A PDF of an element as it looks on screen (the report preview), split across A4 pages. */
export async function downloadPdf(element, fileName) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  // Render a copy at a fixed width, outside the dialog's scroll area, so the whole report is captured.
  const copy = element.cloneNode(true);
  copy.style.cssText = 'position:fixed;left:-10000px;top:0;width:820px;padding:32px;background:#fff;max-height:none;overflow:visible;';
  document.body.appendChild(copy);
  try {
    const canvas = await html2canvas(copy, { scale: 1.5, useCORS: true, logging: false, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * pageW) / canvas.width;
    const image = canvas.toDataURL('image/jpeg', 0.92);
    for (let y = 0; y < imgH; y += pageH) {
      if (y > 0) pdf.addPage();
      pdf.addImage(image, 'JPEG', 0, -y, pageW, imgH);
    }
    pdf.save(fileName);
  } finally {
    document.body.removeChild(copy);
  }
}

const xmlText = (value) => String(value ?? '')
  // eslint-disable-next-line no-control-regex
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const columnName = (index) => {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
};

/** Excel allows 31 characters, no []:*?/\\, and each sheet name only once. */
const sheetNames = (sheets) => {
  const used = new Set();
  return sheets.map((sheet, index) => {
    const base = String(sheet.name).replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || `Sheet ${index + 1}`;
    let name = base;
    for (let n = 2; used.has(name.toLowerCase()); n += 1) name = `${base.slice(0, 28)} ${n}`;
    used.add(name.toLowerCase());
    return name;
  });
};

/**
 * The files inside an .xlsx: one worksheet per { name, rows }, every value as text. The first row is a navy header
 * unless the sheet is marked plain.
 */
export function xlsxParts(sheets) {
  const names = sheetNames(sheets);
  const parts = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((name, i) => `<sheet name="${xmlText(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${NAVY}"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
  };
  sheets.forEach((sheet, sheetIndex) => {
    const width = sheet.rows.reduce((max, row) => Math.max(max, row.length), 0);
    const cols = Array.from({ length: width }, (_, c) => {
      const longest = sheet.rows.reduce((max, row) => Math.max(max, String(row[c] ?? '').length), 8);
      return `<col min="${c + 1}" max="${c + 1}" width="${Math.min(longest + 2, 60)}" customWidth="1"/>`;
    }).join('');
    const rows = sheet.rows.map((row, r) => {
      const style = r === 0 && !sheet.plain ? ' s="1"' : '';
      const cells = row.map((value, c) => `<c r="${columnName(c)}${r + 1}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`).join('');
      return `<row r="${r + 1}">${cells}</row>`;
    }).join('');
    parts[`xl/worksheets/sheet${sheetIndex + 1}.xml`] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${rows}</sheetData></worksheet>`;
  });
  return parts;
}

/** An Excel workbook with one sheet per { name, rows }. */
export async function downloadXlsx(sheets, fileName) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  Object.entries(xlsxParts(sheets)).forEach(([path, text]) => zip.file(path, text));
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
  link.click();
  URL.revokeObjectURL(url);
}

/** Markdown inline formatting removed: links become their text, emphasis and code marks go. */
const plain = (text) => text
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/(\*\*|__)(.*?)\1/g, '$2')
  .replace(/(\*|_)(.*?)\1/g, '$2')
  .replace(/`([^`]*)`/g, '$1')
  .trim();

const tableCells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => plain(cell));
const isTableSeparator = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

/**
 * The report's structure: its title, the overall status line, and each section's bullets and tables.
 * @returns {{ title: string, status: string, sections: { title: string, blocks: ({ bullets: string[] } | { table: string[][] })[] }[] }}
 */
export function parseReport(markdown) {
  const report = { title: '', status: '', sections: [] };
  let section = null;
  let table = null;
  const blocks = () => {
    if (!section) {
      section = { title: '', blocks: [] };
      report.sections.push(section);
    }
    return section.blocks;
  };
  const addBullet = (text) => {
    if (!text) return;
    const list = blocks();
    const last = list[list.length - 1];
    if (last && 'bullets' in last) last.bullets.push(text);
    else list.push({ bullets: [text] });
  };

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.trim().startsWith('|')) {
      if (isTableSeparator(line)) continue;
      if (!table) {
        table = { table: [] };
        blocks().push(table);
      }
      table.table.push(tableCells(line));
      continue;
    }
    table = null;
    if (!line.trim()) continue;
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      if (heading[1].length === 1 && !report.title) report.title = plain(heading[2]);
      else if (heading[1].length <= 2) {
        section = { title: plain(heading[2]), blocks: [] };
        report.sections.push(section);
      } else addBullet(plain(heading[2]));
      continue;
    }
    if (!report.sections.length && /overall status/i.test(line)) {
      report.status = plain(line);
      continue;
    }
    const bullet = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
    addBullet(plain(bullet ? bullet[1] : line));
  }
  report.sections = report.sections.filter((s) => s.title || s.blocks.length);
  return report;
}

/** A PowerPoint deck: a title slide, then each section as one or more slides of bullets or a table. */
export async function downloadPpt(markdown, fileName) {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const parsed = parseReport(markdown);
  const deck = new PptxGenJS();
  deck.layout = 'LAYOUT_WIDE';

  const cover = deck.addSlide();
  cover.background = { color: NAVY };
  cover.addText(parsed.title || 'Report', { x: 0.6, y: 2.2, w: 12, h: 1.2, fontSize: 34, bold: true, color: 'FFFFFF', fontFace: 'Calibri' });
  cover.addText([parsed.status, new Date().toLocaleDateString()].filter(Boolean).join('\n'), {
    x: 0.6, y: 3.5, w: 12, h: 1.2, fontSize: 16, color: 'FFFFFF', fontFace: 'Calibri',
  });

  const slideFor = (title, part) => {
    const slide = deck.addSlide();
    slide.addShape(deck.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.08, fill: { color: ORANGE } });
    slide.addText(part > 0 ? `${title} (continued)` : title, { x: 0.5, y: 0.3, w: 12.3, h: 0.7, fontSize: 24, bold: true, color: NAVY, fontFace: 'Calibri' });
    return slide;
  };

  for (const section of parsed.sections) {
    let part = 0;
    for (const block of section.blocks.length ? section.blocks : [{ bullets: [] }]) {
      if ('table' in block) {
        const [header, ...rows] = block.table;
        for (let i = 0; i < Math.max(rows.length, 1); i += TABLE_ROWS_PER_SLIDE) {
          const slide = slideFor(section.title, part++);
          const headerRow = header.map((text) => ({ text, options: { bold: true, color: 'FFFFFF', fill: { color: NAVY } } }));
          slide.addTable([headerRow, ...rows.slice(i, i + TABLE_ROWS_PER_SLIDE)], {
            x: 0.5, y: 1.2, w: 12.3, fontSize: 11, fontFace: 'Calibri', color: '334155', border: { type: 'solid', pt: 0.5, color: 'CBD5E1' }, autoPage: false,
          });
        }
      } else {
        for (let i = 0; i < Math.max(block.bullets.length, 1); i += BULLETS_PER_SLIDE) {
          const slide = slideFor(section.title, part++);
          const bullets = block.bullets.slice(i, i + BULLETS_PER_SLIDE)
            .map((text) => ({ text, options: { bullet: true, fontSize: 16, color: '334155', paraSpaceAfter: 8 } }));
          if (bullets.length) slide.addText(bullets, { x: 0.5, y: 1.2, w: 12.3, h: 5.6, fontFace: 'Calibri', valign: 'top' });
        }
      }
    }
  }
  await deck.writeFile({ fileName });
}
