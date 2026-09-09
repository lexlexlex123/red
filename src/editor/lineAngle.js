/** Line-angle markers between two shape lines (ported from js/09b-line-angle.js). */

import { endJunctionId } from './lineJoins.js';

const DEFAULT_R = 36;
const DEFAULT_LABEL_FS = 18; // pt
const LABEL_STYLES = ['hidden', 'deg', 'alpha', 'beta', 'gamma', 'qmark'];

function labelFsPt(d) {
  const v = d && d.labelFs != null ? +d.labelFs : DEFAULT_LABEL_FS;
  if (!Number.isFinite(v) || v < 6) return DEFAULT_LABEL_FS;
  return Math.min(72, Math.max(6, Math.round(v)));
}

function labelFsPx(pt) {
  return Math.round((+pt || DEFAULT_LABEL_FS) * (96 / 72));
}

function normLabelStyle(s) {
  if (LABEL_STYLES.includes(s)) return s;
  return 'deg';
}

function normMarkCount(n) {
  const v = n != null ? +n : 1;
  if (!Number.isFinite(v)) return 1;
  return Math.min(4, Math.max(1, Math.round(v)));
}

function labelText(style, deg, displayDeg) {
  const s = normLabelStyle(style);
  if (s === 'hidden') return '';
  if (s === 'alpha') return 'α';
  if (s === 'beta') return 'β';
  if (s === 'gamma') return 'γ';
  if (s === 'qmark') return '?';
  const v = displayDeg != null && Number.isFinite(+displayDeg) ? +displayDeg : deg;
  const rounded = Math.round(v * 10) / 10;
  return `${rounded}°`;
}

/** Local line ends inside element box (matches shared shapes: 0…W round-cap centers). */
export function lineLocalEnds(d, w, h) {
  if (d && d.x1 != null && d.y1 != null && d.x2 != null && d.y2 != null) {
    return { x1: +d.x1, y1: +d.y1, x2: +d.x2, y2: +d.y2 };
  }
  const W = Math.max(1, +w || 1);
  const H = Math.max(1, +h || 1);
  return { x1: 0, y1: H / 2, x2: Math.max(1, W), y2: H / 2 };
}

export function lineDataCanvasEnds(d) {
  if (!d) return null;
  const w = d.w || 100;
  const h = d.h || 24;
  const ends = lineLocalEnds(d, w, h);
  const L = d.x || 0;
  const T = d.y || 0;
  const rot = ((d.rot || 0) * Math.PI) / 180;
  const fx = d.shapeFlipH ? -1 : 1;
  const fy = d.shapeFlipV ? -1 : 1;
  const cosr = Math.cos(rot);
  const sinr = Math.sin(rot);
  const cx = L + w / 2;
  const cy = T + h / 2;
  function map(lx, ly) {
    const dx = (lx - w / 2) * fx;
    const dy = (ly - h / 2) * fy;
    return { x: cx + dx * cosr - dy * sinr, y: cy + dx * sinr + dy * cosr };
  }
  return { a: map(ends.x1, ends.y1), b: map(ends.x2, ends.y2) };
}

export function resolveLineById(els, id) {
  if (!els || !id) return null;
  const exact = els.find((e) => e && e.id === id && e.shape === 'line');
  if (exact) return exact;
  const any = els.find((e) => e && e.id === id);
  if (any && (any.shape === 'line' || any.type === 'shape')) return any;
  return null;
}

export function measurePairFromData(dA, endA, dB, endB) {
  const eA = lineDataCanvasEnds(dA);
  const eB = lineDataCanvasEnds(dB);
  if (!eA || !eB) return null;
  const ea = endA === 'b' ? 'b' : 'a';
  const eb = endB === 'b' ? 'b' : 'a';
  const j = eA[ea];
  const pA = eA[ea === 'a' ? 'b' : 'a'];
  const pB = eB[eb === 'a' ? 'b' : 'a'];
  const a1 = Math.atan2(pA.y - j.y, pA.x - j.x);
  const a2 = Math.atan2(pB.y - j.y, pB.x - j.x);
  let delta = a2 - a1;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta <= -Math.PI) delta += 2 * Math.PI;
  return {
    j,
    a1,
    a2,
    delta,
    deg: (Math.abs(delta) * 180) / Math.PI,
    pA,
    pB,
  };
}

/** Find nearest endpoint pair (joined lines). */
export function findJoinEnds(d1, d2, maxDist = 28) {
  const e1 = lineDataCanvasEnds(d1);
  const e2 = lineDataCanvasEnds(d2);
  if (!e1 || !e2) return null;
  let best = null;
  let bestD = Infinity;
  for (const a of ['a', 'b']) {
    for (const b of ['a', 'b']) {
      const dx = e1[a].x - e2[b].x;
      const dy = e1[a].y - e2[b].y;
      const d2v = dx * dx + dy * dy;
      if (d2v < bestD) {
        bestD = d2v;
        best = { end1: a, end2: b, dist: Math.sqrt(d2v) };
      }
    }
  }
  if (!best || best.dist > maxDist) return null;
  return best;
}

/** Junction id match, else geometric proximity (legacy `_findSharedJoin`). */
export function findSharedJoin(d1, d2, maxDist = 28) {
  if (!d1 || !d2 || d1.shape !== 'line' || d2.shape !== 'line') return null;
  for (const e1 of ['a', 'b']) {
    const j1 = endJunctionId(d1, e1);
    if (!j1) continue;
    for (const e2 of ['a', 'b']) {
      if (endJunctionId(d2, e2) === j1) return { end1: e1, end2: e2, jid: j1 };
    }
  }
  return findJoinEnds(d1, d2, maxDist);
}

/** True when exactly two selected shape-lines share a join (props “draw angle”). */
export function canDrawAngleBetweenSelected(els, ids) {
  const list = (ids || []).map(String);
  if (list.length !== 2) return false;
  const a = (els || []).find((e) => e && String(e.id) === list[0]);
  const b = (els || []).find((e) => e && String(e.id) === list[1]);
  if (!a || !b || a.shape !== 'line' || b.shape !== 'line') return false;
  return !!findSharedJoin(a, b);
}

function arcPath(j, a1, a2, r, ox, oy) {
  const x1 = j.x + Math.cos(a1) * r;
  const y1 = j.y + Math.sin(a1) * r;
  const x2 = j.x + Math.cos(a2) * r;
  const y2 = j.y + Math.sin(a2) * r;
  let delta = a2 - a1;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta <= -Math.PI) delta += 2 * Math.PI;
  const large = Math.abs(delta) > Math.PI ? 1 : 0;
  const sweep = delta > 0 ? 1 : 0;
  return `M ${x1 - ox} ${y1 - oy} A ${r} ${r} 0 ${large} ${sweep} ${x2 - ox} ${y2 - oy}`;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildLineAngleDrawModel(d, els) {
  if (!d || d.type !== 'lineangle' || !els) return null;
  const dA = resolveLineById(els, d.lineIdA);
  const dB = resolveLineById(els, d.lineIdB);
  if (!dA || !dB) return null;
  const m = measurePairFromData(dA, d.endA || 'a', dB, d.endB || 'a');
  if (!m) return null;
  const r = d.radius || DEFAULT_R;
  const col = d.color || '#64748b';
  const style = normLabelStyle(d.labelStyle);
  const nMarks = normMarkCount(d.markCount);
  const fsPt = labelFsPt(d);
  const fsPx = labelFsPx(fsPt);
  const useSquare = Math.abs(m.deg - 90) < 0.6 && nMarks === 1;
  const pad = r + Math.max(28, Math.ceil(fsPx * 1.2));
  const label = labelText(style, m.deg, d.displayDeg);
  let labelX = null;
  let labelY = null;
  if (label) {
    const mid = m.a1 + m.delta / 2;
    const lr = r + 14 + fsPx * 0.35;
    labelX = m.j.x + Math.cos(mid) * lr;
    labelY = m.j.y + Math.sin(mid) * lr;
  }
  return {
    j: m.j,
    a1: m.a1,
    a2: m.a2,
    delta: m.delta,
    deg: m.deg,
    radius: r,
    color: col,
    markCount: nMarks,
    useSquare,
    label: label || '',
    labelX,
    labelY,
    fsPx,
    x: m.j.x - pad,
    y: m.j.y - pad,
    w: pad * 2,
    h: pad * 2,
  };
}

/**
 * Build SVG markup + bbox for a lineangle element.
 * @returns {{ html: string, x: number, y: number, w: number, h: number, deg: number } | null}
 */
export function buildLineAngleContent(d, els) {
  if (!d || d.type !== 'lineangle' || !els) return null;
  const dA = resolveLineById(els, d.lineIdA);
  const dB = resolveLineById(els, d.lineIdB);
  if (!dA || !dB) return null;
  const m = measurePairFromData(dA, d.endA || 'a', dB, d.endB || 'a');
  if (!m) return null;

  const r = d.radius || DEFAULT_R;
  const col = d.color || '#64748b';
  const style = normLabelStyle(d.labelStyle);
  const nMarks = normMarkCount(d.markCount);
  const fsPt = labelFsPt(d);
  const fsPx = labelFsPx(fsPt);
  const useSquare = Math.abs(m.deg - 90) < 0.6 && nMarks === 1;
  const j = m.j;
  const pad = r + Math.max(28, Math.ceil(fsPx * 1.2));
  const ox = j.x - pad;
  const oy = j.y - pad;
  const size = pad * 2;
  const u1x = Math.cos(m.a1);
  const u1y = Math.sin(m.a1);
  const u2x = Math.cos(m.a2);
  const u2y = Math.sin(m.a2);

  let mark = '';
  if (useSquare) {
    const s = Math.min(r, 28);
    const qx = j.x + u1x * s;
    const qy = j.y + u1y * s;
    const sx = j.x + u2x * s;
    const sy = j.y + u2y * s;
    const rx = j.x + u1x * s + u2x * s;
    const ry = j.y + u1y * s + u2y * s;
    mark = `<path d="M ${qx - ox} ${qy - oy} L ${rx - ox} ${ry - oy} L ${sx - ox} ${sy - oy}" fill="none" stroke="${esc(col)}" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/>`;
  } else {
    for (let i = 0; i < nMarks; i++) {
      const rr = Math.max(10, r - i * 6);
      mark += `<path d="${arcPath(j, m.a1, m.a2, rr, ox, oy)}" fill="none" stroke="${esc(col)}" stroke-width="2" stroke-linecap="round"/>`;
    }
  }

  const label = labelText(style, m.deg, d.displayDeg);
  if (label) {
    const mid = m.a1 + m.delta / 2;
    const lr = r + 14 + fsPx * 0.35;
    const lx = j.x + Math.cos(mid) * lr;
    const ly = j.y + Math.sin(mid) * lr;
    mark += `<text class="lineangle-label" x="${lx - ox}" y="${ly - oy}" text-anchor="middle" dominant-baseline="middle" fill="${esc(col)}" font-size="${fsPx}" font-family="Segoe UI,system-ui,sans-serif" font-weight="600">${esc(label)}</text>`;
  }

  return {
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible;pointer-events:none">${mark}</svg>`,
    x: ox,
    y: oy,
    w: size,
    h: size,
    deg: m.deg,
  };
}

export function defaultLineAngleFields(pair) {
  return {
    type: 'lineangle',
    rot: 0,
    lineIdA: pair.d1.id,
    endA: pair.end1,
    lineIdB: pair.d2.id,
    endB: pair.end2,
    radius: DEFAULT_R,
    color: '#64748b',
    colorScheme: { col: 0, row: 4 },
    moveLine: 'B',
    labelStyle: 'deg',
    markCount: 1,
    labelFs: DEFAULT_LABEL_FS,
    anims: [],
  };
}

export { DEFAULT_R, DEFAULT_LABEL_FS, LABEL_STYLES, normLabelStyle, normMarkCount, labelFsPt, labelFsPx, labelText };
