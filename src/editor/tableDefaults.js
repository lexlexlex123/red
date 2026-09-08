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
  const border = hexWithAlpha(tc.ac1, '80');
  return {
    type: 'table',
    x: 60,
    y: 80,
    w: Math.min(960, canvasW - 120),
    h: Math.min(420, canvasH - 160),
    rows: rr,
    cols: cc,
    cells,
    colWidths: Array(cc).fill(1 / cc),
    rowHeights: Array(rr).fill(1 / rr),
    borderW: 1,
    borderColor: border,
    borderColorScheme: { col: 0, row: 4 },
    headerRow: true,
    rx: 8,
    fs: 15,
    textColor: tc.text,
    textColorScheme: { col: 0, row: 2 },
    headerBg: tc.ac1,
    headerBgScheme: { col: 0, row: 6 },
    cellBg: hexWithAlpha(tc.ac2, '20'),
    cellBgScheme: { col: 0, row: 8 },
    altBg: hexWithAlpha(tc.ac1, '12'),
    altBgScheme: { col: 0, row: 7 },
    tableBgOp: 1,
    tableBgBlur: 0,
    fill: 'transparent',
    stroke: border,
    anims: [],
  };
}
