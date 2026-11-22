/** Per-side table borders — editor pencil + PPTX import/export. */

import { resolveSchemeColor } from './themes.js';
import { getTableCell, coveringCell } from './tableCells.js';

export const TABLE_BORDER_SIDES = ['t', 'r', 'b', 'l'];
export const TABLE_BORDER_OPP = { t: 'b', r: 'l', b: 't', l: 'r' };

export function isNoneTableColor(color) {
  if (color == null || color === '') return true;
  const c = String(color).trim().toLowerCase();
  return c === 'transparent' || c === 'none' || c === 'rgba(0,0,0,0)';
}

export function isExplicitTransparentFill(cell) {
  return cell && (cell.bg === 'transparent' || cell.bg === 'none');
}

export function tableDefaultBorderSpec(el, theme) {
  const w = el?.borderW != null ? +el.borderW : 1;
  const color =
    (!el?.borderColor || el.borderColor === 'transparent') && !el?.borderColorScheme
      ? 'transparent'
      : resolveSchemeColor(el?.borderColorScheme, theme) || el?.borderColor || el?.stroke || 'transparent';
  return { w: Number.isFinite(w) ? w : 1, color };
}

export function cellSideSpec(cell, side) {
  const b = cell?.borders?.[side];
  if (!b || typeof b !== 'object') return null;
  return {
    w: Number.isFinite(+b.w) ? +b.w : 0,
    color: b.color || 'transparent',
  };
}

function neighborRC(el, r, c, side) {
  const cell = coveringCell(el, r, c);
  const cs = Math.max(1, cell.colspan || 1);
  const rs = Math.max(1, cell.rowspan || 1);
  const rows = el.rows || 1;
  const cols = el.cols || 1;
  if (side === 't' && r > 0) return { r: r - 1, c };
  if (side === 'b' && r + rs < rows) return { r: r + rs, c };
  if (side === 'l' && c > 0) return { r, c: c - 1 };
  if (side === 'r' && c + cs < cols) return { r, c: c + cs };
  return null;
}

export function resolveTableEdge(el, r, c, side, theme) {
  const cell = getTableCell(el, r, c);
  const own = cellSideSpec(cell, side);
  if (own) return own;
  const nb = neighborRC(el, r, c, side);
  if (nb) {
    const opp = cellSideSpec(getTableCell(el, nb.r, nb.c), TABLE_BORDER_OPP[side]);
    if (opp) return opp;
  }
  return tableDefaultBorderSpec(el, theme);
}

export function tableBorderCssLine(spec) {
  if (!spec || !(+spec.w > 0) || isNoneTableColor(spec.color)) return '0px solid transparent';
  return `${+spec.w}px solid ${spec.color}`;
}

/** CSS borders for a cell. Inner right/bottom stay empty so neighbors do not double-paint. */
export function tableCellBorderStyle(el, r, c, cell, theme) {
  const cs = Math.max(1, cell?.colspan || 1);
  const rs = Math.max(1, cell?.rowspan || 1);
  const lastC = r != null && c + cs - 1 >= (el.cols || 1) - 1;
  const lastR = r != null && r + rs - 1 >= (el.rows || 1) - 1;
  return {
    borderTop: tableBorderCssLine(resolveTableEdge(el, r, c, 't', theme)),
    borderLeft: tableBorderCssLine(resolveTableEdge(el, r, c, 'l', theme)),
    borderRight: lastC ? tableBorderCssLine(resolveTableEdge(el, r, c, 'r', theme)) : '0px solid transparent',
    borderBottom: lastR ? tableBorderCssLine(resolveTableEdge(el, r, c, 'b', theme)) : '0px solid transparent',
  };
}

export function cloneCellBorders(cell) {
  if (!cell?.borders) return undefined;
  const next = {};
  TABLE_BORDER_SIDES.forEach((s) => {
    const b = cell.borders[s];
    if (b && typeof b === 'object') next[s] = { w: +b.w || 0, color: b.color || 'transparent' };
  });
  return Object.keys(next).length ? next : undefined;
}

export function setCellSide(cell, side, spec) {
  const borders = { ...(cell?.borders || {}) };
  if (!spec || !(+spec.w > 0) || isNoneTableColor(spec.color)) {
    borders[side] = { w: 0, color: 'transparent' };
  } else {
    borders[side] = { w: +spec.w, color: spec.color };
  }
  return { ...cell, borders };
}

function writeCellSide(cells, el, r, c, side, spec) {
  const cover = coveringCell(el, r, c);
  const cr = +cover.r;
  const cc = +cover.c;
  const next = { ...setCellSide(cover, side, spec), r: cr, c: cc };
  const idx = cells.findIndex((x) => x && +x.r === cr && +x.c === cc);
  if (idx >= 0) cells[idx] = next;
  else cells.push(next);
}

/** Paint one visual edge and keep the neighbor's opposite side in sync. */
export function paintTableEdgeOnCells(el, r, c, side, spec) {
  const cells = Array.isArray(el.cells) ? el.cells.slice() : [];
  const anchor = coveringCell(el, r, c);
  const ar = +anchor.r;
  const ac = +anchor.c;
  writeCellSide(cells, el, ar, ac, side, spec);
  const nb = neighborRC(el, ar, ac, side);
  if (nb) writeCellSide(cells, el, nb.r, nb.c, TABLE_BORDER_OPP[side], spec);
  return cells;
}

export function sameTableEdgeSpec(el, r, c, side, spec, theme) {
  const cur = resolveTableEdge(el, r, c, side, theme);
  const offA = !(+cur.w > 0) || isNoneTableColor(cur.color);
  const offB = !spec || !(+spec.w > 0) || isNoneTableColor(spec.color);
  if (offA && offB) return true;
  if (offA || offB) return false;
  return +cur.w === +spec.w && String(cur.color) === String(spec.color);
}

/** Paint every side of the selected cells (shared inner edges once). */
export function paintSelectedCellBorders(el, keys, spec) {
  if (!el || !keys?.length) return el.cells;
  let cells = el.cells;
  let working = el;
  const seen = new Set();
  for (const k of keys) {
    const r = +k.r;
    const c = +k.c;
    const cell = getTableCell(working, r, c);
    if (!cell || cell.hidden) continue;
    for (const side of TABLE_BORDER_SIDES) {
      const line = tableGridLineId(working, r, c, side);
      if (!line || seen.has(line)) continue;
      seen.add(line);
      cells = paintTableEdgeOnCells(working, r, c, side, spec);
      working = { ...working, cells };
    }
  }
  return cells;
}

/** Shared grid line id so both cells of an inner edge count as one stroke. */
export function tableGridLineId(el, r, c, side) {
  if (!side) return null;
  const nb = neighborRC(el, r, c, side);
  if (side === 'l') return `v:${r}:${c}`;
  if (side === 'r') return nb ? `v:${nb.r}:${nb.c}` : `vr:${r}:${c}`;
  if (side === 't') return `h:${r}:${c}`;
  if (side === 'b') return nb ? `h:${nb.r}:${nb.c}` : `hb:${r}:${c}`;
  return null;
}

export function sideOnGridLine(el, r, c, lineId) {
  if (!lineId) return null;
  for (const side of TABLE_BORDER_SIDES) {
    if (tableGridLineId(el, r, c, side) === lineId) return side;
  }
  return null;
}

/** Nearest cell side — the shared grid line between cells, not a box around one cell. */
export function hitTableBorderSide(node, ev) {
  if (!node || !ev) return null;
  const rect = node.getBoundingClientRect();
  if (!(rect.width > 0) || !(rect.height > 0)) return null;
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  const hits = [
    { side: 'l', d: x },
    { side: 'r', d: rect.width - x },
    { side: 't', d: y },
    { side: 'b', d: rect.height - y },
  ].sort((a, b) => a.d - b.d);
  return hits[0].side;
}

export function paintHoverShadow(side, color) {
  if (!side) return undefined;
  const c = isNoneTableColor(color) ? '#3b82f6' : color;
  if (side === 't') return `inset 0 3px 0 ${c}`;
  if (side === 'b') return `inset 0 -3px 0 ${c}`;
  if (side === 'l') return `inset 3px 0 0 ${c}`;
  if (side === 'r') return `inset -3px 0 0 ${c}`;
  return undefined;
}
