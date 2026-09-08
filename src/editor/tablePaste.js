/** Excel / TSV paste into tables (ported from js/31-table.js tblPasteData). */

import { mapTableCells } from './tableCells.js';
import { buildNewTableFields } from './tableDefaults.js';
import { getTheme } from './themes.js';
import { usePresentationStore } from '../stores/presentationStore';

export function isTsvText(text) {
  const t = String(text || '');
  if (!t.includes('\t')) return false;
  const lines = t.split(/\r?\n/).filter((r) => r.trim());
  return lines.length >= 1 && lines.some((l) => l.includes('\t'));
}

export function parseTsv(text) {
  return String(text || '')
    .split(/\r?\n/)
    .filter((r) => r.trim())
    .map((r) => r.split('\t'));
}

/** Convert a simple HTML table to TSV when Excel puts HTML in the clipboard. */
export function htmlTableToTsv(html) {
  const src = String(html || '');
  if (!/<table[\s>]/i.test(src)) return '';
  try {
    const doc = new DOMParser().parseFromString(src, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return '';
    const rows = [...table.querySelectorAll('tr')];
    return rows
      .map((tr) =>
        [...tr.querySelectorAll('th,td')]
          .map((td) => (td.textContent || '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ').trim())
          .join('\t')
      )
      .join('\n');
  } catch (e) {
    return '';
  }
}

function escCell(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Fill an existing table from TSV starting at (startR, startC).
 * Expands rows/cols as needed. Returns patched fields.
 */
export function fillTableFromTsv(el, tsvRows, startR = 0, startC = 0) {
  if (!el || el.type !== 'table' || !tsvRows?.length) return null;
  const numRows = tsvRows.length;
  const numCols = Math.max(...tsvRows.map((r) => r.length));
  let rows = Math.max(el.rows || 1, startR + numRows);
  let cols = Math.max(el.cols || 1, startC + numCols);
  const cells = mapTableCells({ ...el, rows, cols }, (cell) => ({ ...cell }));
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < (tsvRows[r] || []).length; c++) {
      const tr = startR + r;
      const tc = startC + c;
      const idx = cells.findIndex((x) => x.r === tr && x.c === tc);
      const html = escCell(tsvRows[r][c]);
      if (idx >= 0) cells[idx] = { ...cells[idx], html };
      else cells.push({ r: tr, c: tc, html });
    }
  }
  return { rows, cols, cells };
}

export function newTableFromTsv(tsvRows) {
  if (!tsvRows?.length) return null;
  const rows = tsvRows.length;
  const cols = Math.max(...tsvRows.map((r) => r.length));
  const st = usePresentationStore.getState();
  const theme = getTheme(st.appliedThemeIdx);
  const base = buildNewTableFields(rows, cols, theme, {
    canvasW: st.canvasW,
    canvasH: st.canvasH,
  });
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        r,
        c,
        html: escCell((tsvRows[r] || [])[c] || ''),
        align: 'left',
        valign: 'middle',
        bg: '',
      });
    }
  }
  return {
    ...base,
    x: 160,
    y: 140,
    w: Math.min(900, Math.max(280, cols * 120)),
    h: Math.min(500, Math.max(160, rows * 44)),
    cells,
    anims: [],
  };
}
