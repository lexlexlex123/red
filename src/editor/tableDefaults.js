/** Theme-aware defaults for new tables (v7.1 parity). */

import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';

export function hexWithAlpha(hex, aa) {
  if (!hex || typeof hex !== 'string') return hex;
  const h = hex.replace('#', '');
  if (h.length === 6 && /^[0-9a-fA-F]{6}$/.test(h)) return `#${h}${aa}`;
  if (h.length === 8 && /^[0-9a-fA-F]{8}$/.test(h)) return `#${h.slice(0, 6)}${aa}`;
  return hex;
}

export function tableThemeColors(theme) {
  const ac1 = (theme && theme.ac1) || '#3b82f6';
  const ac2 = (theme && theme.ac2) || '#1d4ed8';
  const isDark = !theme || theme.dark !== false;
  return {
    ac1,
    ac2,
    text: isDark ? '#ffffff' : '#1e293b',
  };
}

export function altBgFromHeader(headerBg) {
  if (!headerBg || typeof headerBg !== 'string') return '';
  const h = headerBg.replace('#', '');
  if (h.length >= 6 && /^[0-9a-fA-F]{6}/.test(h)) return `#${h.slice(0, 6)}12`;
  return headerBg;
}

/** Compact cell metrics — same density as Excel/TSV paste. */
export const TABLE_COL_PX = 112;
export const TABLE_ROW_PX = 36;

/** Build fields for a new table element (without id). */
export function buildNewTableFields(rows, cols, theme, opts = {}) {
  const rr = Math.max(1, Math.min(30, Math.round(+rows || 3)));
  const cc = Math.max(1, Math.min(30, Math.round(+cols || 4)));
  const tc = tableThemeColors(theme);
  const canvasW = Math.max(1, +opts.canvasW || DEFAULT_CANVAS_W);
  const canvasH = Math.max(1, +opts.canvasH || DEFAULT_CANVAS_H);
  const cells = [];
  for (let r = 0; r < rr; r++) {
    for (let c = 0; c < cc; c++) {
      cells.push({
        r,
        c,
        html: r === 0 ? String.fromCharCode(65 + (c % 26)) : '',
        align: 'left',
        valign: 'middle',
        bg: '',
      });
    }
  }
  const border = hexWithAlpha(tc.ac1, '66');
  const w = Math.min(canvasW - 80, Math.max(200, cc * TABLE_COL_PX));
  const h = Math.min(canvasH - 100, Math.max(72, rr * TABLE_ROW_PX));
  const x = Math.max(40, Math.round((canvasW - w) / 2));
  const y = Math.max(48, Math.round((canvasH - h) / 2) - 24);
  return {
    type: 'table',
    x,
    y,
    w,
    h,
    rows: rr,
    cols: cc,
    cells,
    colWidths: Array(cc).fill(1 / cc),
    rowHeights: Array(rr).fill(1 / rr),
    borderW: 1,
    borderColor: border,
    borderColorScheme: { col: 0, row: 4 },
    headerRow: true,
    rx: 4,
    fs: 13,
    textColor: tc.text,
    textColorScheme: { col: 0, row: 2 },
    headerBg: hexWithAlpha(tc.ac1, 'CC'),
    headerBgScheme: { col: 0, row: 6 },
    cellBg: hexWithAlpha(tc.ac2, '14'),
    cellBgScheme: { col: 0, row: 8 },
    altBg: hexWithAlpha(tc.ac1, '0A'),
    altBgScheme: { col: 0, row: 7 },
    tableBgOp: 1,
    tableBgBlur: 0,
    fill: 'transparent',
    stroke: border,
    anims: [],
  };
}
