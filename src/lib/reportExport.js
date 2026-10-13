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
