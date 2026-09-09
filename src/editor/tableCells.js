/** Table cell helpers — supports {r,c} cells and legacy flat arrays. */

import { resolveSchemeColor } from './themes.js';

/** v7.1 `_tblResolved`: scheme color first, then direct value, then fallback. */
function resolvedColor(value, scheme, theme, fallback = '') {
  const fromScheme = resolveSchemeColor(scheme, theme);
  if (fromScheme) return fromScheme;
  return value || fallback;
}

/** Apply tableBgOp to hex / #rrggbbaa (v7.1 `_tblRgba`). */
export function applyTableColorOp(color, op = 1) {
  if (!color || typeof color !== 'string') return color;
  const o = Number.isFinite(+op) ? Math.max(0, Math.min(1, +op)) : 1;
  if (o >= 0.999 && !/^#[0-9a-fA-F]{8}$/i.test(color)) return color;
  const hex = color.trim();
  if (hex.startsWith('#')) {
    const h = hex.slice(1);
    let r;
    let g;
    let b;
    let a = 1;
    if (h.length >= 6) {
      r = parseInt(h.slice(0, 2), 16);
      g = parseInt(h.slice(2, 4), 16);
      b = parseInt(h.slice(4, 6), 16);
      if (h.length === 8) a = parseInt(h.slice(6, 8), 16) / 255;
    } else return color;
    a *= o;
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  if (o >= 0.999) return color;
  const m = hex.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (m) {
    const a = (m[4] != null ? +m[4] : 1) * o;
    return `rgba(${+m[1]},${+m[2]},${+m[3]},${a.toFixed(3)})`;
  }
  return color;
}

export function getTableCell(el, r, c) {
  const cells = el?.cells || [];
  const hit = cells.find((x) => x && Number(x.r) === r && Number(x.c) === c);
  if (hit) return hit;
  const cols = el?.cols || 1;
  const flat = cells[r * cols + c];
  if (flat && typeof flat === 'object') {
    return {
      r,
      c,
      html: flat.html != null ? flat.html : '',
      align: flat.align,
      valign: flat.valign,
      bg: flat.bg,
      bgScheme: flat.bgScheme,
      fs: flat.fs,
      // v7.1 stored per-cell text color as `tc` / `tcScheme`
      textColor: flat.textColor != null ? flat.textColor : flat.tc,
      textColorScheme: flat.textColorScheme != null ? flat.textColorScheme : flat.tcScheme,
      ff: flat.ff,
      colspan: flat.colspan || 1,
      rowspan: flat.rowspan || 1,
      hidden: !!flat.hidden,
    };
  }
  if (flat != null) return { r, c, html: typeof flat === 'string' ? flat : '' };
  return { r, c, html: '' };
}

/** v7.1 `_tblSelectedCells`: anchor cell that visually covers (r,c) when merged. */
export function coveringCell(el, r, c) {
  const cell = getTableCell(el, r, c);
  if (!cell || !cell.hidden) return cell;
  for (let rr = r; rr >= 0; rr--) {
    for (let cc = c; cc >= 0; cc--) {
      const cand = getTableCell(el, rr, cc);
      const spanC = cand.colspan || 1;
      const spanR = cand.rowspan || 1;
      if (!cand.hidden && rr + spanR > r && cc + spanC > c) return cand;
    }
  }
  return cell;
}

/** Resolved background for a table cell (header / alt / cellBg / per-cell). Legacy: alt on even non-header rows. */
export function tableCellBg(el, r, c, cell, theme) {
  const op = el?.tableBgOp != null ? +el.tableBgOp : 1;
  let raw;
  if (cell?.bg || cell?.bgScheme != null) {
    raw = resolvedColor(cell.bg, cell.bgScheme, theme, '');
  } else if (r === 0 && el.headerRow !== false) {
    raw = resolvedColor(el.headerBg, el.headerBgScheme, theme, 'rgba(59,130,246,.35)');
  } else if (el.altBg && r % 2 === 0) {
    raw = resolvedColor(el.altBg, el.altBgScheme, theme, '');
  } else {
    raw = resolvedColor(el.cellBg, el.cellBgScheme, theme, '');
  }
  if (!raw) return undefined;
  return applyTableColorOp(raw, op);
}

export function tableBorderCss(el) {
  const w = el.borderW != null ? el.borderW : 1;
  const color = el.borderColor || el.stroke || '#64748b';
  if (!w) return 'none';
  return `${w}px solid ${color}`;
}

/** v7.1 corner radii — span-aware (a merged cell reaching the last col/row gets the corner). */
export function tableCellRadiusCss(el, r, c, cs = 1, rs = 1) {
  const rx = +(el?.rx || 0);
  if (rx <= 0) return undefined;
  const rows = el.rows || 1;
  const cols = el.cols || 1;
  const isLastC = c + (cs || 1) - 1 >= cols - 1;
  const isLastR = r + (rs || 1) - 1 >= rows - 1;
  const parts = [];
  if (r === 0 && c === 0) parts.push(`border-top-left-radius:${rx}px`);
  if (r === 0 && isLastC) parts.push(`border-top-right-radius:${rx}px`);
  if (isLastR && c === 0) parts.push(`border-bottom-left-radius:${rx}px`);
  if (isLastR && isLastC) parts.push(`border-bottom-right-radius:${rx}px`);
  return parts.length ? `${parts.join(';')};` : undefined;
}

/** v7.1 px column widths (min 20px) — `Math.round(f * W)`. */
export function tableColWidthsPx(el, W) {
  const cols = el?.cols || 1;
  const fr = Array.isArray(el?.colWidths) && el.colWidths.length === cols
    ? el.colWidths
    : Array(cols).fill(1 / cols);
  return fr.map((f) => Math.max(20, Math.round(f * W)));
}

/** v7.1 px row heights (`Math.round(f * H)`); min 14 on canvas, 12 in export. */
export function tableRowHeightsPx(el, H, min = 14) {
  const rows = el?.rows || 1;
  const fr = Array.isArray(el?.rowHeights) && el.rowHeights.length === rows
    ? el.rowHeights
    : Array(rows).fill(1 / rows);
  return fr.map((f) => Math.max(min, Math.round(f * H)));
}

/** v7.1 `_tblExtendSel`: all "r:c" keys inside the rectangle. */
export function cellRangeKeys(r0, c0, r1, c1) {
  const minR = Math.min(r0, r1);
  const maxR = Math.max(r0, r1);
  const minC = Math.min(c0, c1);
  const maxC = Math.max(c0, c1);
  const keys = [];
  for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) keys.push({ r, c });
  return keys;
}

/** v7.1 `_tblStripCellHtml`: strip inline formatting from cell content. */
export function stripCellHtml(html) {
  if (!html) return '';
  if (typeof document === 'undefined') return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('table').forEach((t) => {
    const span = document.createElement('span');
    span.textContent = t.textContent || '';
    t.replaceWith(span);
  });
  tmp.querySelectorAll('[style]').forEach((el) => el.removeAttribute('style'));
  tmp.querySelectorAll('[class]').forEach((el) => el.removeAttribute('class'));
  tmp.querySelectorAll('font').forEach((el) => {
    el.removeAttribute('color');
    el.removeAttribute('face');
    el.removeAttribute('size');
  });
  tmp.querySelectorAll('span,font').forEach((el) => {
    if (!el.attributes.length) {
      const frag = document.createDocumentFragment();
      while (el.firstChild) frag.appendChild(el.firstChild);
      el.replaceWith(frag);
    }
  });
  return tmp.innerHTML;
}

export function tableCellRadiusStyle(el, r, c, cs = 1, rs = 1) {
  const rx = +(el?.rx || 0);
  if (rx <= 0) return undefined;
  const rows = el.rows || 1;
  const cols = el.cols || 1;
  const isLastC = c + (cs || 1) - 1 >= cols - 1;
  const isLastR = r + (rs || 1) - 1 >= rows - 1;
  const st = {};
  if (r === 0 && c === 0) st.borderTopLeftRadius = rx;
  if (r === 0 && isLastC) st.borderTopRightRadius = rx;
  if (isLastR && c === 0) st.borderBottomLeftRadius = rx;
  if (isLastR && isLastC) st.borderBottomRightRadius = rx;
  return Object.keys(st).length ? st : undefined;
}

export function mapTableCells(el, fn) {
  const rows = el.rows || 1;
  const cols = el.cols || 1;
  const next = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      next.push(fn(getTableCell(el, r, c), r, c));
    }
  }
  return next;
}
