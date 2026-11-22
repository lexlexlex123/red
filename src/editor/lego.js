/** Lego brick SVG builders (ported from js/41-lego.js). */

import { getTheme, schemeSwatchColor } from './themes.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';

export const LEGO_U = 40;
/** Plate height; 10 so side-view bodies and studs land on the 10px snap grid. */
export const LEGO_GY = 10;
export const LEGO_SH = 10;
export const LEGO_SW = 26;
export const LEGO_FH = LEGO_GY;
export const LEGO_TH = LEGO_GY * 3;
export const LEGO_SNAP = 10;
/** Palette code "15" — first scheme column, fifth row. */
export const LEGO_COLOR_SCHEME = { col: 0, row: 4 };
export const LEGO_COLOR_FALLBACK = '#2550da';

const U = LEGO_U;
const SH = LEGO_SH;
const SW = LEGO_SW;
const FH = LEGO_FH;
const TH = LEGO_TH;

function fromHex(h) {
  const s = String(h || LEGO_COLOR_FALLBACK).replace('#', '');
  if (s.length !== 6) return [37, 80, 218];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function blend(r, g, b, r2, g2, b2, t) {
  return (
    '#' +
    [r, g, b]
      .map((v, i) => Math.round(v + ([r2, g2, b2][i] - v) * t).toString(16).padStart(2, '0'))
      .join('')
  );
}

function colors(hex) {
  const [r, g, b] = fromHex(hex);
  return {
    mid: hex,
    stud: blend(r, g, b, 0, 0, 0, 0.2),
    hl: blend(r, g, b, 255, 255, 255, 0.65),
    dark: blend(r, g, b, 0, 0, 0, 0.3),
  };
}

/** Fine plastic grain clipped to the brick — no filter, so no gray halo. */
function grainLayer(id, clipInner, bw, bh) {
  return `<defs>
    <pattern id="${id}" width="3" height="3" patternUnits="userSpaceOnUse">
      <circle cx="0.7" cy="0.9" r="0.35" fill="#000" opacity="0.14"/>
      <circle cx="2.2" cy="1.8" r="0.28" fill="#fff" opacity="0.12"/>
      <circle cx="1.3" cy="2.6" r="0.3" fill="#000" opacity="0.1"/>
    </pattern>
    <clipPath id="${id}c">${clipInner}</clipPath>
  </defs>
  <rect x="0" y="0" width="${bw}" height="${bh}" fill="url(#${id})" clip-path="url(#${id}c)" style="mix-blend-mode:overlay"/>`;
}

function wrapLegoSvg(bw, bh, gid, clipInner, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bw} ${bh}" width="${bw}" height="${bh}" style="display:block;overflow:hidden">
  ${inner}
  ${grainLayer(gid, clipInner, bw, bh)}
</svg>`;
}

function studRectSvg(sx, col, hidden) {
  if (hidden) return '';
  return (
    `<rect x="${sx}" y="0" width="${SW}" height="${SH}" rx="1" fill="${col.stud}"/>` +
    `<rect x="${sx + 2}" y="1" width="${SW - 6}" height="${Math.max(2, SH - 4)}" rx="1" fill="${col.hl}" opacity="0.5"/>`
  );
}

export function makeLegoSVG(n, tall, base, hideStuds) {
  const bh = tall ? TH : FH;
  const bw = n * U;
  const col = colors(base || LEGO_COLOR_FALLBACK);
  const hide = hideStuds instanceof Set ? hideStuds : null;
  let studs = '';
  let clipStuds = '';
  for (let i = 0; i < n; i++) {
    const sx = i * U + (U - SW) / 2;
    studs += studRectSvg(sx, col, hide && hide.has(i));
    if (!(hide && hide.has(i))) clipStuds += `<rect x="${sx}" y="0" width="${SW}" height="${SH}"/>`;
  }
  const inner =
    studs +
    `<rect x="0" y="${SH}" width="${bw}" height="${bh}" rx="1" fill="${col.mid}"/>` +
    `<rect x="0" y="${SH}" width="2" height="${bh}" rx="1" fill="${col.dark}" opacity="0.28"/>` +
    `<rect x="${bw - 2}" y="${SH}" width="2" height="${bh}" rx="1" fill="${col.dark}" opacity="0.38"/>`;
  const clip = `${clipStuds}<rect x="0" y="${SH}" width="${bw}" height="${bh}" rx="1"/>`;
  const hideKey = hide ? [...hide].sort().join('') : '';
  return wrapLegoSvg(bw, bh + SH, `lg${n}${tall ? 't' : 'f'}h${hideKey}`, clip, inner);
}

export function makeLegoSlopeSVG(n, dir, base, hideStuds) {
  const bw = n * U;
  const col = colors(base || LEGO_COLOR_FALLBACK);
  const totalH = SH + TH;
  const yBodyTop = SH;
  const yBot = totalH;
  const yLoTop = yBot - FH;
  const hiIdx = dir === 'slope-right' ? 0 : n - 1;
  const hiX = hiIdx * U;
  const sx = hiX + (U - SW) / 2;
  const hide = hideStuds instanceof Set ? hideStuds : null;
  const stud = studRectSvg(sx, col, hide && hide.has(0));
  const bodyPts =
    dir === 'slope-right'
      ? `0,${yBodyTop} ${U},${yBodyTop} ${bw},${yLoTop} ${bw},${yBot} 0,${yBot}`
      : `0,${yLoTop} ${(n - 1) * U},${yBodyTop} ${bw},${yBodyTop} ${bw},${yBot} 0,${yBot}`;
  const body = `<polygon points="${bodyPts}" fill="${col.mid}"/>`;
  const sideL =
    dir === 'slope-right'
      ? `<rect x="0" y="${yBodyTop}" width="2" height="${TH}" fill="${col.dark}" opacity="0.28"/>`
      : `<rect x="0" y="${yLoTop}" width="2" height="${FH}" fill="${col.dark}" opacity="0.28"/>`;
  const sideR =
    dir === 'slope-right'
      ? `<rect x="${bw - 2}" y="${yLoTop}" width="2" height="${FH}" fill="${col.dark}" opacity="0.38"/>`
      : `<rect x="${bw - 2}" y="${yBodyTop}" width="2" height="${TH}" fill="${col.dark}" opacity="0.38"/>`;
  const clipStud = hide && hide.has(0) ? '' : `<rect x="${sx}" y="0" width="${SW}" height="${SH}"/>`;
  const clip = `${clipStud}<polygon points="${bodyPts}"/>`;
  return wrapLegoSvg(bw, totalH, `lgp${n}${dir}${hide && hide.has(0) ? 'h' : ''}`, clip, `${stud}${body}${sideL}${sideR}`);
}

export function makeLegoStairSVG(base, dir, hideStuds) {
  const col = colors(base || LEGO_COLOR_FALLBACK);
  const bw = 2 * U;
  const totalH = SH + TH;
  const yTop = SH;
  const yBot = totalH;
  const yVert = yTop + FH;
  const hide = hideStuds instanceof Set ? hideStuds : null;
  let studs = '';
  let clipStuds = '';
  for (let i = 0; i < 2; i++) {
    const sx = i * U + (U - SW) / 2;
    studs += studRectSvg(sx, col, hide && hide.has(i));
    if (!(hide && hide.has(i))) clipStuds += `<rect x="${sx}" y="0" width="${SW}" height="${SH}"/>`;
  }
  const bodyPts =
    dir === 'right'
      ? `0,${yTop} ${bw},${yTop} ${bw},${yVert} ${U},${yBot} 0,${yBot}`
      : `0,${yTop} ${bw},${yTop} ${bw},${yBot} ${U},${yBot} 0,${yVert}`;
  const body = `<polygon points="${bodyPts}" fill="${col.mid}"/>`;
  const sideL =
    dir === 'right'
      ? `<rect x="0" y="${yTop}" width="2" height="${TH}" fill="${col.dark}" opacity="0.28"/>`
      : `<rect x="0" y="${yTop}" width="2" height="${FH}" fill="${col.dark}" opacity="0.28"/>`;
  const sideR =
    dir === 'right'
      ? `<rect x="${bw - 2}" y="${yTop}" width="2" height="${FH}" fill="${col.dark}" opacity="0.38"/>`
      : `<rect x="${bw - 2}" y="${yTop}" width="2" height="${TH}" fill="${col.dark}" opacity="0.38"/>`;
  const clip = `${clipStuds}<polygon points="${bodyPts}"/>`;
  const hideKey = hide ? [...hide].sort().join('') : '';
  return wrapLegoSvg(bw, totalH, `lgr${dir}h${hideKey}`, clip, `${studs}${body}${sideL}${sideR}`);
}

/** Top-down plate: studs sit inside a cols×rows rectangle of pitch U. */
export function makeLegoTopSVG(cols, rows, base) {
  const c = Math.max(1, cols | 0);
  const r = Math.max(1, rows | 0);
  const bw = c * U;
  const bh = r * U;
  const col = colors(base || LEGO_COLOR_FALLBACK);
  const rad = SW / 2;
  let studs = '';
  for (let row = 0; row < r; row++) {
    for (let colI = 0; colI < c; colI++) {
      const cx = colI * U + U / 2;
      const cy = row * U + U / 2;
      studs +=
        `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${col.stud}"/>` +
        `<circle cx="${cx}" cy="${cy - 1.5}" r="${Math.max(4, rad - 5)}" fill="${col.hl}" opacity="0.45"/>`;
    }
  }
  const inner =
    `<rect x="0" y="0" width="${bw}" height="${bh}" rx="2" fill="${col.mid}"/>` +
    studs;
  const clip = `<rect x="0" y="0" width="${bw}" height="${bh}" rx="2"/>`;
  return wrapLegoSvg(bw, bh, `lgt${c}x${r}`, clip, inner);
}

/** Catalog pieces for insert ribbon / props. */
export const LEGO_PIECES = [
  { id: '1f', labelRu: '1×1 плоский', labelEn: '1×1 flat', n: 1, tall: false },
  { id: '2f', labelRu: '2×1 плоский', labelEn: '2×1 flat', n: 2, tall: false },
  { id: '4f', labelRu: '4×1 плоский', labelEn: '4×1 flat', n: 4, tall: false },
  { id: '1t', labelRu: '1×1 высокий', labelEn: '1×1 tall', n: 1, tall: true },
  { id: '2t', labelRu: '2×1 высокий', labelEn: '2×1 tall', n: 2, tall: true },
  { id: '4t', labelRu: '4×1 высокий', labelEn: '4×1 tall', n: 4, tall: true },
  { id: 'sr', labelRu: 'Скос →', labelEn: 'Slope →', n: 2, slope: 'slope-right' },
  { id: 'sl', labelRu: 'Скос ←', labelEn: 'Slope ←', n: 2, slope: 'slope-left' },
  { id: 'stairR', labelRu: 'Ступень →', labelEn: 'Stair →', n: 2, stair: 'right' },
  { id: 'stairL', labelRu: 'Ступень ←', labelEn: 'Stair ←', n: 2, stair: 'left' },
  { id: 't11', labelRu: '1×1 сверху', labelEn: '1×1 top', view: 'top', cols: 1, rows: 1, n: 1 },
  { id: 't12', labelRu: '1×2 сверху', labelEn: '1×2 top', view: 'top', cols: 2, rows: 1, n: 2 },
  { id: 't21', labelRu: '2×1 сверху', labelEn: '2×1 top', view: 'top', cols: 1, rows: 2, n: 1 },
  { id: 't14', labelRu: '1×4 сверху', labelEn: '1×4 top', view: 'top', cols: 4, rows: 1, n: 4 },
  { id: 't41', labelRu: '4×1 сверху', labelEn: '4×1 top', view: 'top', cols: 1, rows: 4, n: 1 },
  { id: 't22', labelRu: '2×2 сверху', labelEn: '2×2 top', view: 'top', cols: 2, rows: 2, n: 2 },
  { id: 't44', labelRu: '4×4 сверху', labelEn: '4×4 top', view: 'top', cols: 4, rows: 4, n: 4 },
];

export function isLegoTop(el) {
  return !!(el && (el.legoView === 'top' || el.view === 'top' || el.legoTop));
}

export function legoPieceById(id) {
  return LEGO_PIECES.find((p) => p.id === id) || LEGO_PIECES[1];
}

export function legoPieceIdOf(el) {
  if (!el) return '2f';
  if (isLegoTop(el)) {
    const cols = Math.max(1, +(el.legoCols || el.legoStuds || 1));
    const rows = Math.max(1, +(el.legoRows || 1));
    return LEGO_PIECES.find((p) => p.view === 'top' && p.cols === cols && p.rows === rows)?.id || 't11';
  }
  return (
    LEGO_PIECES.find(
      (p) =>
        p.view !== 'top' &&
        p.n === +(el.legoStuds || 2) &&
        !!p.tall === !!el.legoTall &&
        (p.slope || null) === (el.legoSlope || null) &&
        (p.stair || null) === (el.legoStair || null)
    )?.id || '2f'
  );
}

export function legoSizeFor(d) {
  if (isLegoTop(d)) {
    const cols = Math.max(1, +(d.legoCols || d.legoStuds || 1));
    const rows = Math.max(1, +(d.legoRows || 1));
    return { w: cols * U, h: rows * U };
  }
  const n = Math.max(1, +(d.legoStuds || 2));
  const bw = n * U;
  let bh;
  if (d.legoStair) bh = TH + SH;
  else if (d.legoSlope) bh = TH + SH;
  else bh = (d.legoTall ? TH : FH) + SH;
  return { w: bw, h: bh };
}

/** Side view: 40px on X so studs line up, 10px on Y so plates can stack. Top view: 40 both. */
export function legoSnapSteps(el) {
  if (isLegoTop(el)) return { x: U, y: U };
  return { x: U, y: LEGO_SNAP };
}

export function legoSnapStep(el) {
  return legoSnapSteps(el).y;
}

export function snapLegoCoord(v, step = LEGO_SNAP) {
  const s = step > 0 ? step : LEGO_SNAP;
  return Math.round((+v || 0) / s) * s;
}

export function snapLegoPos(x, y, steps = LEGO_SNAP) {
  const sx = steps && typeof steps === 'object' ? steps.x : steps;
  const sy = steps && typeof steps === 'object' ? steps.y : steps;
  return { x: snapLegoCoord(x, sx), y: snapLegoCoord(y, sy) };
}

export function defaultLegoColor(themeIdx) {
  const theme = getTheme(themeIdx) || getTheme(0);
  const color = theme ? schemeSwatchColor(theme, LEGO_COLOR_SCHEME.col, LEGO_COLOR_SCHEME.row) : null;
  return {
    color: color || LEGO_COLOR_FALLBACK,
    schemeRef: { col: LEGO_COLOR_SCHEME.col, row: LEGO_COLOR_SCHEME.row },
  };
}

function rectsOverlap(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function legoCollisionRect(el) {
  if (!el) return null;
  const sz = legoSizeFor(el);
  const x = +el.x || 0;
  const y = +el.y || 0;
  if (isLegoTop(el)) return { x, y, w: sz.w, h: sz.h };
  return { x, y: y + SH, w: sz.w, h: Math.max(1, sz.h - SH) };
}

/** Brick body without studs — side-view pieces may cover another brick's studs. */
export function legoBodyRect(el) {
  return legoCollisionRect(el);
}

export function legoStudRects(el) {
  if (!el || isLegoTop(el)) return [];
  const x = +el.x || 0;
  const y = +el.y || 0;
  const n = Math.max(1, +(el.legoStuds || 2));
  if (el.legoSlope) {
    const hiIdx = el.legoSlope === 'slope-right' ? 0 : n - 1;
    return [{ i: 0, x: x + hiIdx * U + (U - SW) / 2, y, w: SW, h: SH }];
  }
  const count = el.legoStair ? 2 : n;
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ i, x: x + i * U + (U - SW) / 2, y, w: SW, h: SH });
  }
  return out;
}

export function coveredLegoStudIndices(el, others) {
  const studs = legoStudRects(el);
  const hide = [];
  if (!studs.length) return hide;
  for (const s of studs) {
    for (const o of others || []) {
      if (!o || o.type !== 'lego' || String(o.id) === String(el.id) || o.objHidden) continue;
      const body = legoCollisionRect(o);
      if (rectsOverlap(s, body)) {
        hide.push(s.i);
        break;
      }
    }
  }
  return hide;
}

function legoBodiesOverlap(a, b) {
  return rectsOverlap(legoCollisionRect(a), legoCollisionRect(b));
}

/** Chebyshev ring: same row first so a plate can slide into a gap between two bricks. */
function ringOffsets(r) {
  const out = [
    [-r, 0],
    [r, 0],
    [0, -r],
    [0, r],
  ];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (dx === 0 || dy === 0) continue;
      out.push([dx, dy]);
    }
  }
  return out;
}

/** Same-Y slots first (fill a hole), then the rest of each ring. */
function* legoSearchOffsets(maxR, sameYFirst = 4) {
  for (let r = 1; r <= sameYFirst; r++) {
    yield [-r, 0];
    yield [r, 0];
  }
  for (let r = 1; r <= maxR; r++) {
    for (const off of ringOffsets(r)) {
      if (r <= sameYFirst && off[1] === 0) continue;
      yield off;
    }
  }
}

/**
 * Nearest snapped slot where this brick does not overlap another LEGO brick.
 * Top-view tiles snap on the stud pitch (40px) and cannot stack.
 */
export function resolveLegoFreePos(candidate, others, canvasW = DEFAULT_CANVAS_W, canvasH = DEFAULT_CANVAS_H) {
  const sz = legoSizeFor(candidate);
  const w = candidate.w || sz.w;
  const h = candidate.h || sz.h;
  const steps = legoSnapSteps(candidate);
  const start = snapLegoPos(candidate.x, candidate.y, steps);
  const legoOthers = (others || []).filter(
    (o) => o && o.type === 'lego' && !o.objHidden && String(o.id) !== String(candidate.id || '')
  );
  const maxX = Math.max(0, snapLegoCoord(canvasW - w, steps.x));
  const maxY = Math.max(0, snapLegoCoord(canvasH - h, steps.y));

  function fits(x, y) {
    if (x < 0 || y < 0 || x > maxX || y > maxY) return false;
    const probe = { ...candidate, x, y, w, h };
    return !legoOthers.some((o) => legoBodiesOverlap(probe, o));
  }

  if (fits(start.x, start.y)) return start;
  for (const [dx, dy] of legoSearchOffsets(48)) {
    const x = start.x + dx * steps.x;
    const y = start.y + dy * steps.y;
    if (fits(x, y)) return { x, y };
  }
  return { x: Math.max(0, Math.min(maxX, start.x)), y: Math.max(0, Math.min(maxY, start.y)) };
}

export function resolveLegoGroupOffset(members, dx, dy, others, canvasW = DEFAULT_CANVAS_W, canvasH = DEFAULT_CANVAS_H) {
  const allTop = (members || []).length && (members || []).every(isLegoTop);
  const stepX = U;
  const stepY = allTop ? U : LEGO_SNAP;
  const snapDx = snapLegoCoord(dx, stepX);
  const snapDy = snapLegoCoord(dy, stepY);
  const moving = new Set((members || []).map((m) => String(m.id)));
  const rest = (others || []).filter((o) => o && o.type === 'lego' && !o.objHidden && !moving.has(String(o.id)));

  function groupFits(odx, ody) {
    return (members || []).every((m) => {
      const sz = legoSizeFor(m);
      const x = (+m.x || 0) + odx;
      const y = (+m.y || 0) + ody;
      if (x < 0 || y < 0 || x + sz.w > canvasW + stepX || y + sz.h > canvasH + stepY) return false;
      const probe = { ...m, x, y, w: sz.w, h: sz.h };
      return !rest.some((o) => legoBodiesOverlap(probe, o));
    });
  }

  if (groupFits(snapDx, snapDy)) return { dx: snapDx, dy: snapDy };
  for (const [ddx, ddy] of legoSearchOffsets(48)) {
    const odx = snapDx + ddx * stepX;
    const ody = snapDy + ddy * stepY;
    if (groupFits(odx, ody)) return { dx: odx, dy: ody };
  }
  return { dx: 0, dy: 0 };
}

export function buildLegoSvg(d, others) {
  const color = d.legoColor || LEGO_COLOR_FALLBACK;
  if (isLegoTop(d)) {
    const cols = Math.max(1, +(d.legoCols || d.legoStuds || 1));
    const rows = Math.max(1, +(d.legoRows || 1));
    return makeLegoTopSVG(cols, rows, color);
  }
  const n = Math.max(1, +(d.legoStuds || 2));
  const hideList = others ? coveredLegoStudIndices(d, others) : [];
  const hide = hideList.length ? new Set(hideList) : null;
  if (d.legoSlope) return makeLegoSlopeSVG(n, d.legoSlope, color, hide);
  if (d.legoStair) return makeLegoStairSVG(color, d.legoStair, hide);
  return makeLegoSVG(n, !!d.legoTall, color, hide);
}

export function legoPreviewSvg(pieceOrId, color = LEGO_COLOR_FALLBACK) {
  const piece = typeof pieceOrId === 'string' ? legoPieceById(pieceOrId) : pieceOrId;
  return buildLegoSvg({
    legoView: piece.view || 'side',
    legoCols: piece.cols || piece.n,
    legoRows: piece.rows || 1,
    legoStuds: piece.n,
    legoTall: !!piece.tall,
    legoSlope: piece.slope || null,
    legoStair: piece.stair || null,
    legoColor: color,
  });
}

export function fieldsFromLegoPiece(pieceOrId) {
  const piece = typeof pieceOrId === 'string' ? legoPieceById(pieceOrId) : pieceOrId;
  const top = piece.view === 'top';
  return {
    type: 'lego',
    legoView: top ? 'top' : 'side',
    legoCols: top ? piece.cols : piece.n,
    legoRows: top ? piece.rows : 1,
    legoStuds: piece.n,
    legoTall: top ? false : !!piece.tall,
    legoSlope: piece.slope || null,
    legoStair: piece.stair || null,
  };
}

export function defaultLegoFields(pieceOrId = '2f', color = LEGO_COLOR_FALLBACK, schemeRef = null) {
  const fields = {
    ...fieldsFromLegoPiece(pieceOrId),
    legoColor: color,
    legoColorScheme: schemeRef || { col: LEGO_COLOR_SCHEME.col, row: LEGO_COLOR_SCHEME.row },
    rot: 0,
    anims: [],
  };
  const sz = legoSizeFor(fields);
  return { ...fields, ...sz, ...snapLegoPos(80, 120, legoSnapSteps(fields)) };
}

export function clientPointToCanvas(clientX, clientY, canvasW = DEFAULT_CANVAS_W, canvasH = DEFAULT_CANVAS_H) {
  if (typeof document === 'undefined') return null;
  const stage = document.querySelector('.react-slide-stage');
  if (!stage) return null;
  const r = stage.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;
  if (clientX < r.left || clientY < r.top || clientX > r.right || clientY > r.bottom) return null;
  return {
    x: ((clientX - r.left) / r.width) * canvasW,
    y: ((clientY - r.top) / r.height) * canvasH,
  };
}
