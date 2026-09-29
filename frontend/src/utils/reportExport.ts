import type { Fill, Font } from 'exceljs';
import { getAppSettings } from '../components/appSettingsBus';
import { BACKEND_URL } from '../config';

export interface ExportColumn {
  header: string;
  align: 'left' | 'right';
}

/**
 * Rows are objects, not `string[]`: a 2D array flowing through a parameter
 * loses its inner type under tsc 6 element-type inference.
 */
export interface ExportRow {
  cells: string[];
}

export interface ExportPayload {
  title: string;
  subtitle: string;
  period: string;
  columns: ExportColumn[];
  rows: ExportRow[];
  totals?: string[];
  fileBase: string;
}

/** Fold smart punctuation to plain ASCII without touching parens. */
const ascii = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00B7/g, '-')
    .replace(/[^\x20-\x7E]/g, '');

/** PDF string literal: escape the only metacharacters a Type1 font object needs. */
const pdfText = (value: string) => ascii(value).replace(/([\\()])/g, '\\$1');

export interface Brand {
  name: string;
  /** Raw logo URL, safe for an <img> tag. */
  logoUrl: string | null;
  /** Logo re-encoded as JPEG data URL, required by PDF/Excel embeds. */
  logoDataUrl: string | null;
  logoWidth: number;
  logoHeight: number;
}

const absoluteUrl = (raw: string) =>
  /^(data:|https?:|blob:)/i.test(raw) || !raw.startsWith('/')
    ? raw
    : `${BACKEND_URL}/${raw.replace(/^\/+/, '')}`;

const loadImageEl = (url: string, crossOrigin: boolean) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

/** System name + logo taken from the app settings, with a canvas fallback encode. */
export async function loadBrand(): Promise<Brand> {
  const { appName, appLogo } = getAppSettings();
  const name = appName?.trim() || 'SIM MALL';
  const empty: Brand = { name, logoUrl: null, logoDataUrl: null, logoWidth: 0, logoHeight: 0 };
  if (!appLogo) return empty;
  const logoUrl = absoluteUrl(appLogo);
  const img = (await loadImageEl(logoUrl, true)) ?? (await loadImageEl(logoUrl, false));
  if (!img?.naturalWidth) return { ...empty, logoUrl };
  try {
    const maxSide = 360;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const logoWidth = Math.max(1, Math.round(img.naturalWidth * scale));
    const logoHeight = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = logoWidth;
    canvas.height = logoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { ...empty, logoUrl };
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, logoWidth, logoHeight);
    ctx.drawImage(img, 0, 0, logoWidth, logoHeight);
    return { name, logoUrl, logoDataUrl: canvas.toDataURL('image/jpeg', 0.92), logoWidth, logoHeight };
  } catch {
    return { ...empty, logoUrl };
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const fmtDateTime = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
};

const printDocument = ({ title, subtitle, period, columns, rows }: ExportPayload, brand: Brand) => {
  const head = columns.map((c) => `<th class="${c.align === 'right' ? 'num' : ''}">${escapeHtml(c.header)}</th>`).join('');
  const body = rows
    .map(
      (r) =>
        `<tr>${r.cells
          .map(
            (v, i) =>
              `<td class="${columns[i]?.align === 'right' ? 'num strong' : ''}">${escapeHtml(v)}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 portrait; margin: 16mm 14mm 18mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: #eceff4;
    color: #14181f;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
  }
  .page { max-width: 210mm; margin: 0 auto; padding: 16mm 14mm; background: #fff; }
  .brand {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding-bottom: 12px; border-bottom: 2px solid #14181f;
  }
  .brand-id { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .brand-logo {
    width: 44px; height: 44px; object-fit: contain;
    border: 1px solid #e1e6ee; border-radius: 6px; background: #fff; padding: 3px;
  }
  .brand-name {
    font-size: 15pt; font-weight: 700; letter-spacing: -0.01em; line-height: 1.2;
    overflow-wrap: anywhere;
  }
  .brand-tag {
    font-size: 8pt; font-weight: 700; letter-spacing: 0.18em;
    text-transform: uppercase; color: #6b7482;
  }
  .brand-aside { text-align: right; font-size: 9pt; color: #55606e; }
  .brand-aside b { display: block; font-size: 10pt; color: #14181f; }
  h1 { margin: 18px 0 2px; font-size: 19pt; font-weight: 700; letter-spacing: -0.01em; }
  .subtitle { margin: 0; font-size: 10pt; color: #55606e; }
  table { width: 100%; margin-top: 18px; border-collapse: collapse; }
  thead { display: table-header-group; }
  th {
    text-align: left; font-size: 8.5pt; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: #ffffff; background: #14181f;
    padding: 9px 12px;
  }
  th:first-child { border-radius: 4px 0 0 0; }
  th:last-child { border-radius: 0 4px 0 0; }
  td { padding: 9px 12px; border-bottom: 1px solid #e6eaf0; }
  tbody tr:nth-child(even) td { background: #fafbfd; }
  .num { text-align: right; white-space: nowrap; }
  .strong { font-weight: 700; }
  .foot-note {
    display: flex; justify-content: space-between; gap: 12px;
    margin-top: 22px; padding-top: 10px; border-top: 1px solid #e1e6ee;
    font-size: 8.5pt; color: #6b7482;
  }
  .bar {
    position: sticky; top: 0; z-index: 2;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 9px 16px;
    background: #14181f; color: #fff; font-size: 12px;
  }
  .bar-actions { display: flex; gap: 8px; flex: 0 0 auto; }
  .bar-id { display: flex; align-items: center; gap: 9px; min-width: 0; }
  .bar-id img { width: 22px; height: 22px; object-fit: contain; background: #fff; border-radius: 4px; padding: 2px; }
  .bar button {
    padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer;
    border: 1px solid #3a4351; border-radius: 5px;
    background: #222936; color: #fff;
  }
  .bar button.primary { background: #ffffff; color: #14181f; border-color: #ffffff; }
  @media print {
    body { background: #fff; }
    .bar { display: none; }
    .page { max-width: none; margin: 0; padding: 0; }
    .brand { break-inside: avoid; }
    thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tbody tr { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="bar">
  <span class="bar-id">${brandLogoImg(brand, 'bar')} <span>${escapeHtml(brand.name)} &mdash; ${escapeHtml(title)}</span></span>
  <span class="bar-actions">
    <button type="button" class="primary" onclick="window.print()">Print / Save as PDF</button>
    <button type="button" onclick="window.close()">Close tab</button>
  </span>
</div>
<div class="page">
  <div class="brand">
    <div class="brand-id">${brandLogoImg(brand, 'brand')} <div>
      <div class="brand-name">${escapeHtml(brand.name)}</div>
      <div class="brand-tag">Revenue Report</div>
    </div></div>
    <div class="brand-aside">
      Period<b>${escapeHtml(period)}</b>
    </div>
  </div>
  <h1>${escapeHtml(title)}</h1>
  <p class="subtitle">${escapeHtml(subtitle)}</p>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>
${body}
    </tbody>
  </table>
  <div class="foot-note">
    <span>Generated automatically by ${escapeHtml(brand.name)} &mdash; values in IDR.</span>
    <span>${rows.length} row(s)</span>
  </div>
</div>
</body>
</html>`;
};

const brandLogoImg = (brand: Brand, variant: 'bar' | 'brand') => {
  const src = brand.logoDataUrl ?? brand.logoUrl;
  if (!src) return '';
  return `<img class="${variant === 'bar' ? '' : 'brand-logo'}" src="${escapeHtml(src)}" alt="" onerror="this.remove()" />`;
};

/** Opens the report as a clean, chrome-free sheet in a real browser tab, then prints it. */
export async function printReport(payload: ExportPayload): Promise<boolean> {
  const brand = await loadBrand();
  const url = URL.createObjectURL(new Blob([printDocument(payload, brand)], { type: 'text/html;charset=utf-8' }));
  // No window features -> the browser opens a tab, not a floating popup.
  // The blob url dies with the document it created, so no timer revoke is needed.
  const win = window.open(url, '_blank');
  if (win) win.opener = null;
  return Boolean(win);
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const INK = 'FF14181F';
const MUTED = 'FF55606E';
const RULE = { style: 'medium' as const, color: { argb: INK } };
const HAIR = { style: 'thin' as const, color: { argb: 'FFD6DBE3' } };
const TABLE_BORDER = { top: HAIR, left: HAIR, bottom: HAIR, right: HAIR };
const HEAD_FILL: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
const BAND_FILL: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } };
const TOTAL_FILL: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF1F7' } };
const HEAD_FONT: Partial<Font> = { bold: true, size: 11, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
const BODY_FONT: Partial<Font> = { bold: false, size: 11, color: { argb: INK }, name: 'Calibri' };
/** Rupiah cells become real numbers so Excel can sort and sum them. */
const IDR_FORMAT = '"Rp" #,##0';

/** Letterhead rhythm: brand, subtitle, air, title, period, air, table. */
const LAYOUT = { brand: 46, tag: 24, gap: 8, title: 24, meta: 16, head: 22, body: 18 };
const BRAND_ROW = 1;
const TAG_ROW = 2;
const TITLE_ROW = 4;
const META_ROW = 5;
const HEAD_ROW = 7;
const FIRST_ROW = HEAD_ROW + 1;

const idrValue = (raw: string): number | null => {
  if (!/^\s*rp/i.test(raw)) return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
};

type CellOpts = { bold?: boolean; band?: boolean; total?: boolean };

export async function exportReportExcel({
  title,
  subtitle,
  period,
  columns,
  rows,
  totals,
  fileBase,
}: ExportPayload) {
  // ExcelJS is ~4 MB: pull it in on click instead of on dashboard mount.
  const { default: ExcelJS } = await import('exceljs/dist/exceljs.min.js');
  const brand = await loadBrand();
  const span = columns.length;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = brand.name;
  workbook.title = title;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Report', {
    views: [{ state: 'frozen', ySplit: HEAD_ROW, showGridLines: false }],
    pageSetup: {
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
      // Header repeats on every printed page.
      printTitlesRow: `${HEAD_ROW}:${HEAD_ROW}`,
    },
    headerFooter: {
      oddFooter: `&L${ascii(brand.name)}&CGenerated &D &T&RPage &P of &N`,
    },
  });

  // Widths are in Excel character units, sized to the widest value in the column.
  sheet.columns = columns.map((c, i) => {
    const values = rows.map((r) => r.cells[i] ?? '');
    if (totals) values.push(totals[i] ?? '');
    const longest = values.reduce((n, v) => Math.max(n, v.length), c.header.length);
    return { width: Math.min(56, Math.max(14, longest + 4)) };
  });

  const write = (row: number, col: number, value: string, font: Partial<Font> = BODY_FONT, fill?: Fill) => {
    const cell = sheet.getCell(row, col);
    cell.value = value;
    cell.font = font;
    if (fill) cell.fill = fill;
    return cell;
  };

  const merged = (row: number) => sheet.mergeCells(row, 1, row, span);

  // ── Letterhead ────────────────────────────────────────────────
  sheet.getRow(BRAND_ROW).height = LAYOUT.brand;
  sheet.getRow(TAG_ROW).height = LAYOUT.tag;
  sheet.getRow(3).height = LAYOUT.gap;
  sheet.getRow(TITLE_ROW).height = LAYOUT.title;
  sheet.getRow(META_ROW).height = LAYOUT.meta;
  sheet.getRow(6).height = LAYOUT.gap;

  if (brand.logoDataUrl) {
    const base64 = brand.logoDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const id = workbook.addImage({ base64, extension: 'jpeg' });
    sheet.addImage(id, { tl: { col: 0.06, row: 0.12 }, ext: { width: 40, height: 40 } });
  }

  const nameCell = write(BRAND_ROW, 2, brand.name, { ...BODY_FONT, bold: true, size: 16 });
  nameCell.alignment = { vertical: 'middle' };
  sheet.mergeCells(BRAND_ROW, 2, BRAND_ROW, span);

  // Ink rule under the letterhead, spanning the whole table width.
  for (let col = 1; col <= span; col++) {
    const cell = sheet.getCell(BRAND_ROW, col);
    cell.border = { ...cell.border, bottom: RULE };
  }

  // Small-caps strapline; wraps instead of being clipped at the merge edge.
  const tagCell = write(TAG_ROW, 1, (subtitle || 'Revenue report').toUpperCase(), {
    size: 8,
    bold: true,
    color: { argb: MUTED },
    name: 'Calibri',
  });
  tagCell.alignment = { vertical: 'middle', wrapText: true };
  merged(TAG_ROW);

  const titleCell = write(TITLE_ROW, 1, title, { ...BODY_FONT, bold: true, size: 16 });
  titleCell.alignment = { vertical: 'middle' };
  merged(TITLE_ROW);

  const metaCell = write(META_ROW, 1, period, { ...BODY_FONT, color: { argb: MUTED } });
  metaCell.alignment = { vertical: 'middle' };
  merged(META_ROW);

  // ── Table ─────────────────────────────────────────────────────
  sheet.getRow(HEAD_ROW).height = LAYOUT.head;
  columns.forEach((c, i) => {
    const cell = write(HEAD_ROW, i + 1, c.header, HEAD_FONT, HEAD_FILL);
    cell.alignment = { horizontal: c.align, vertical: 'middle' };
    cell.border = { top: HAIR, left: HAIR, right: HAIR, bottom: RULE };
  });

  const put = (row: number, i: number, raw: string, opts: CellOpts) => {
    const align = columns[i]?.align === 'right' ? 'right' : 'left';
    const amount = idrValue(raw);
    const cell = sheet.getCell(row, i + 1);
    if (amount !== null) {
      cell.value = amount;
      cell.numFmt = IDR_FORMAT;
    } else {
      cell.value = raw;
    }
    cell.font = { ...BODY_FONT, bold: Boolean(opts.bold) };
    cell.alignment = { horizontal: align, vertical: 'middle' };
    cell.border = opts.total
      ? { top: RULE, left: HAIR, right: HAIR, bottom: HAIR }
      : TABLE_BORDER;
    if (opts.total) cell.fill = TOTAL_FILL;
    else if (opts.band) cell.fill = BAND_FILL;
    return cell;
  };

  rows.forEach((r, ri) => {
    const row = FIRST_ROW + ri;
    sheet.getRow(row).height = LAYOUT.body;
    r.cells.forEach((v, i) => put(row, i, v, { band: ri % 2 === 1 }));
  });

  if (totals) {
    const row = FIRST_ROW + rows.length;
    sheet.getRow(row).height = LAYOUT.body;
    totals.forEach((v, i) => put(row, i, v, { bold: true, total: true }));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  download(new Blob([buffer], { type: XLSX_MIME }), `${fileBase}.xlsx`);
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 44;
const ROW_H = 18;
const USABLE_W = PAGE_W - MARGIN * 2;
const FOOT_Y = 34;
const FIRST_ROW_Y = PAGE_H - 168;
const CONT_ROW_Y = PAGE_H - 96;
const BRAND_LOGO = 40;
/** Rows that physically fit between a start baseline and the footer band. */
const rowsPerPage = (startY: number) => Math.max(1, Math.floor((startY - (FOOT_Y + 18)) / ROW_H));
const ROWS_PER_PAGE = rowsPerPage(FIRST_ROW_Y);

/** Rough Helvetica advance widths — accurate enough to right-align currency text. */
function textWidth(value: string, size: number, bold = false): number {
  let units = 0;
  for (const ch of value) {
    if (ch === ' ') units += 0.28;
    else if ('.,:;\'!|i'.includes(ch)) units += 0.28;
    else if ('"()[]{}/-'.includes(ch)) units += 0.34;
    else if ('jltfr'.includes(ch)) units += 0.36;
    else if ('IL1'.includes(ch)) units += 0.4;
    else if (ch >= 'A' && ch <= 'Z') units += 0.68;
    else if (ch >= '0' && ch <= '9') units += 0.56;
    else units += 0.52;
  }
  return units * size * (bold ? 1.06 : 1);
}

export async function exportReportPdf({ title, subtitle, period, columns, rows, totals, fileBase }: ExportPayload) {
  const colWidth = USABLE_W / columns.length;
  const drawText = (x: number, y: number, value: string, bold = false, right = false) => {
    const size = bold ? 9.5 : 9.5;
    const label = pdfText(value);
    if (label === '') return '';
    const tx = right ? x + colWidth - 6 - textWidth(label, size, bold) : x + 6;
    return [
      'BT', `/${bold ? 'F1' : 'F2'} ${size} Tf`, `${tx.toFixed(2)} ${y.toFixed(2)} Td`,
      `(${label}) Tj`, 'ET',
    ].join('\n');
  };
  const drawRow = (rowCells: string[], y: number, bold = false) =>
    rowCells
      .map((value, i) => (value === '' ? '' : drawText(MARGIN + colWidth * i, y, value, bold, columns[i]?.align === 'right')))
      .filter(Boolean)
      .join('\n');
  const tableHeader = (y: number) =>
    [
      '0.85 0.85 0.85 rg',
      `${MARGIN} ${(y - 4).toFixed(2)} ${USABLE_W.toFixed(2)} 18 re f`,
      '0 g',
      drawRow(
        columns.map((c) => c.header),
        y,
        true,
      ),
    ].join('\n');

  const brand = await loadBrand();
  const logoBytes = brand.logoDataUrl ? jpegBytes(brand.logoDataUrl) : null;
  const logoScale = logoBytes
    ? Math.min(BRAND_LOGO / brand.logoWidth, BRAND_LOGO / brand.logoHeight)
    : 0;
  const logoW = logoBytes ? brand.logoWidth * logoScale : 0;
  const logoH = logoBytes ? brand.logoHeight * logoScale : 0;
  const brandTextX = MARGIN + (logoBytes ? logoW + 12 : 0);

  const pages: string[] = [];
  const pageCount = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  for (let page = 0; page < pageCount; page += 1) {
    const body: string[] = [];
    let y = page === 0 ? FIRST_ROW_Y : CONT_ROW_Y;
    if (page === 0) {
      if (logoBytes) {
        body.push(
          'q',
          `${logoW.toFixed(2)} 0 0 ${logoH.toFixed(2)} ${MARGIN} ${(PAGE_H - 52 - logoH).toFixed(2)} cm`,
          '/Im0 Do',
          'Q',
        );
      }
      body.push(
        text(brandTextX, PAGE_H - 50, brand.name, 12.5, true),
        text(brandTextX, PAGE_H - 64, 'REVENUE REPORT', 8, false, 0.14),
        rightText(PAGE_W - MARGIN, PAGE_H - 50, 'Period', 8, true),
        rightText(PAGE_W - MARGIN, PAGE_H - 64, period, 9.5, false),
        `0.85 0.85 0.85 RG 0.7 w ${MARGIN} ${(PAGE_H - 78).toFixed(2)} m ${(PAGE_W - MARGIN).toFixed(2)} ${(PAGE_H - 78).toFixed(2)} l S`,
        text(MARGIN, PAGE_H - 100, title, 15, true),
        text(MARGIN, PAGE_H - 114, subtitle, 9.5, false),
        text(MARGIN, PAGE_H - 128, `Generated ${fmtDateTime(new Date().toISOString())}`, 8.5, false),
        `0.1 0.1 0.12 RG 1.4 w ${MARGIN} ${(PAGE_H - 140).toFixed(2)} m ${(PAGE_W - MARGIN).toFixed(2)} ${(PAGE_H - 140).toFixed(2)} l S`,
      );
    } else {
      body.push(
        text(MARGIN, PAGE_H - 52, `${brand.name} - ${title}`, 9, true),
        rightText(PAGE_W - MARGIN, PAGE_H - 52, `Page ${page + 1} of ${pageCount}`, 9, false),
        `0.85 0.85 0.85 RG 0.7 w ${MARGIN} ${(PAGE_H - 62).toFixed(2)} m ${(PAGE_W - MARGIN).toFixed(2)} ${(PAGE_H - 62).toFixed(2)} l S`,
      );
    }
    body.push(tableHeader(y));
    y -= ROW_H + 4;
    const slice = rows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
    for (const row of slice) {
      body.push(drawRow(row.cells, y));
      y -= ROW_H;
    }
    if (totals && page === pageCount - 1) {
      body.push(
        `0.9 0.9 0.9 RG 0.6 w ${MARGIN} ${(y + 10).toFixed(2)} m ${(PAGE_W - MARGIN).toFixed(2)} ${(y + 10).toFixed(2)} l S`,
        drawRow(totals, y - 4, true),
      );
    }
    body.push(
      `0.85 0.85 0.85 RG 0.5 w ${MARGIN} ${(FOOT_Y + 12).toFixed(2)} m ${(PAGE_W - MARGIN).toFixed(2)} ${(FOOT_Y + 12).toFixed(2)} l S`,
      text(MARGIN, FOOT_Y, `${brand.name} - generated automatically`, 8, false),
      rightText(PAGE_W - MARGIN, FOOT_Y, `Page ${page + 1} of ${pageCount}  |  ${period}`, 8, false),
    );
    pages.push(body.filter(Boolean).join('\n'));
  }

  const image = logoBytes ? { bytes: logoBytes, width: Math.round(logoW), height: Math.round(logoH) } : null;
  download(new Blob([buildPdf(pages, image)], { type: 'application/pdf' }), `${fileBase}.pdf`);
}

const text = (x: number, y: number, value: string, size: number, bold = false, tracking = 0) => {
  const label = pdfText(value);
  if (label === '') return '';
  const spaced = tracking > 0 ? label.split('').join(' ') : label;
  return ['BT', `/${bold ? 'F1' : 'F2'} ${size} Tf`, `${tracking} Tc`, `${x.toFixed(2)} ${y.toFixed(2)} Td`, `(${spaced}) Tj`, '0 Tc', 'ET'].join('\n');
};

const rightText = (right: number, y: number, value: string, size: number, bold = false) => {
  const label = pdfText(value);
  if (label === '') return '';
  return text(right - textWidth(label, size, bold), y, value, size, bold);
};

const jpegBytes = (dataUrl: string): Uint8Array<ArrayBuffer> | null => {
  const at = dataUrl.indexOf(',');
  if (at < 0 || !dataUrl.startsWith('data:image/jpeg')) return null;
  try {
    const bin = atob(dataUrl.slice(at + 1));
    const out = new Uint8Array(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
};

const latin1 = (value: string) => {
  const out = new Uint8Array(new ArrayBuffer(value.length));
  for (let i = 0; i < value.length; i += 1) out[i] = value.charCodeAt(i) & 0xff;
  return out;
};

interface PdfImage {
  bytes: Uint8Array<ArrayBuffer>;
  width: number;
  height: number;
}

function buildPdf(pages: string[], image?: PdfImage | null): string | Uint8Array<ArrayBuffer> {
  const logo = image?.bytes;
  const objects: string[] = [];
  const fontBoldId = 3;
  const fontRegularId = 4;
  const pageIds = pages.map((_, i) => 5 + i * 2);
  const contentIds = pages.map((_, i) => 6 + i * 2);
  const imageId = 5 + pages.length * 2;

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  );
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  pages.forEach((page, i) => {
    const xobjects = logo ? ` /XObject << /Im0 ${imageId} 0 R >>` : '';
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 ${fontBoldId} 0 R /F2 ${fontRegularId} 0 R >>${xobjects} >> ` +
        `/Contents ${contentIds[i]} 0 R >>`,
    );
    const stream = `${page}\n`;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  });
  if (logo) {
    objects.push(
      `<< /Type /XObject /Subtype /Image /Width ${image!.width} /Height ${image!.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.length} >>\nstream\n`,
    );
  }
  objects.push('<< /Type /Info /Producer (Mall SIM Report) /Creator (Mall SIM) >>');

  // Binary-safe assembly: strings are latin1, the JPEG stream is raw bytes.
  const parts: Uint8Array<ArrayBuffer>[] = [];
  const size = () => parts.reduce((n, p) => n + p.length, 0);
  const push = (chunk: string | Uint8Array<ArrayBuffer>) =>
    parts.push(typeof chunk === 'string' ? latin1(chunk) : chunk);

  push('%PDF-1.4\n');
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(size());
    push(`${i + 1} 0 obj\n`);
    if (logo && i === imageId - 1) {
      push(body);
      push(logo);
      push('\nendstream\nendobj\n');
      return;
    }
    push(`${body}\nendobj\n`);
  });
  const xrefOffset = size();
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const off of offsets) push(`${String(off).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\n`);
  push(`startxref\n${xrefOffset}\n%%EOF\n`);

  if (!logo) return parts.reduce((acc, p) => acc + String.fromCharCode(...p), '');
  const merged = new Uint8Array(new ArrayBuffer(size()));
  let at = 0;
  for (const p of parts) {
    merged.set(p, at);
    at += p.length;
  }
  return merged;
}
