/**
 * Shared shape helpers for editor + export/playback.
 * Single path: buildBasicShapeSVG (no legacy window.buildShapeSVG).
 */

import { getShapeMeta } from './shapesCatalog.js';
import { arcPath, moonPath, gearPath } from './shapeArcMoonGear.js';
import { buildCalloutSVGPath } from './calloutGeom.js';
import {
  cloudResolveCircles,
  cloudBlobsPath,
  buildCloudArtSvg,
  cloudShadeFromFill,
} from './cloudGeom.js';

/** v7 stores moonPhase in -1..1; some React UIs used -100..100. */
export function normalizeMoonPhase(v) {
  if (v == null || v === '') return -0.5;
  const n = +v;
  if (!Number.isFinite(n)) return -0.5;
  if (Math.abs(n) <= 1) return Math.max(-1, Math.min(1, n));
  return Math.max(-1, Math.min(1, n / 100));
}

/** Inner / outer radius of the ring (noSymbol). Keep a visible band and hole. */
export function normalizeRingInner(v) {
  if (v == null || v === '') return 0.5;
  const n = +v;
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0.12, Math.min(0.88, n));
}

/** Even-odd annulus: outer CW, inner CCW so the hole stays transparent. */
export function ringPath(cx, cy, rx, ry, inner) {
  const orx = Math.max(0.5, +rx || 0.5);
  const ory = Math.max(0.5, +ry || 0.5);
  const ir = normalizeRingInner(inner);
  const irx = Math.max(0.5, orx * ir);
  const iry = Math.max(0.5, ory * ir);
  const ox = cx + orx;
  const ix = cx + irx;
  return (
    `M ${ox.toFixed(2)} ${cy.toFixed(2)} ` +
    `A ${orx.toFixed(2)} ${ory.toFixed(2)} 0 1 1 ${(cx - orx).toFixed(2)} ${cy.toFixed(2)} ` +
    `A ${orx.toFixed(2)} ${ory.toFixed(2)} 0 1 1 ${ox.toFixed(2)} ${cy.toFixed(2)} Z ` +
    `M ${ix.toFixed(2)} ${cy.toFixed(2)} ` +
    `A ${irx.toFixed(2)} ${iry.toFixed(2)} 0 1 0 ${(cx - irx).toFixed(2)} ${cy.toFixed(2)} ` +
    `A ${irx.toFixed(2)} ${iry.toFixed(2)} 0 1 0 ${ix.toFixed(2)} ${cy.toFixed(2)} Z`
  );
}

function makeBezierClose(cpts, w, h) {
  const last = cpts[cpts.length - 1];
  const first = cpts[0];
  const fc1x =
    last.cp2x != null
      ? last.cp2x
      : last.cp1x != null
        ? last.x * 2 - last.cp1x
        : last.x + (first.x - last.x) * 0.33;
  const fc1y =
    last.cp2y != null
      ? last.cp2y
      : last.cp1y != null
        ? last.y * 2 - last.cp1y
        : last.y + (first.y - last.y) * 0.33;
  const fc2x =
    first.cp1x != null
      ? first.cp1x
      : first.cp2x != null
        ? first.x * 2 - first.cp2x
        : first.x + (last.x - first.x) * 0.33;
  const fc2y =
    first.cp1y != null
      ? first.cp1y
      : first.cp2y != null
        ? first.y * 2 - first.cp2y
        : first.y + (last.y - first.y) * 0.33;
  return ` C ${(fc1x * w).toFixed(2)} ${(fc1y * h).toFixed(2)} ${(fc2x * w).toFixed(2)} ${(fc2y * h).toFixed(2)} ${(first.x * w).toFixed(2)} ${(first.y * h).toFixed(2)} Z`;
}

function curveNodeWidth(cpts, i, base) {
  const pt = cpts[i];
  if (pt && pt.sw != null && Number.isFinite(+pt.sw)) return +pt.sw;
  let prev = -1;
  for (let j = i - 1; j >= 0; j--) {
    if (cpts[j] && cpts[j].sw != null) {
      prev = j;
      break;
    }
  }
  let next = -1;
  for (let j = i + 1; j < cpts.length; j++) {
    if (cpts[j] && cpts[j].sw != null) {
      next = j;
      break;
    }
  }
  const prevW = prev >= 0 ? +cpts[prev].sw : base;
  const nextW = next >= 0 ? +cpts[next].sw : base;
  const prevI = prev >= 0 ? prev : 0;
  const nextI = next >= 0 ? next : cpts.length - 1;
  if (nextI === prevI) return prevW;
  const t = (i - prevI) / (nextI - prevI);
  return prevW + (nextW - prevW) * t;
}

/** True when node widths differ from each other (needs segmented taper stroke). */
function curveHasVariableWidth(cpts, baseSw) {
  if (!cpts || cpts.length < 2) return false;
  let first = null;
  for (let i = 0; i < cpts.length; i++) {
    const w = curveNodeWidth(cpts, i, baseSw);
    if (first == null) first = w;
    else if (Math.abs(w - first) > 0.05) return true;
  }
  return false;
}

/** Short round strokes so thickness can change from node to node. */
function curveVariableStroke(cpts, w, h, baseSw, closed, color) {
  if (!cpts || cpts.length < 2) return '';
  const samples = [];
  const segCount = closed ? cpts.length : cpts.length - 1;
  for (let i = 0; i < segCount; i++) {
    const a = cpts[i];
    const b = cpts[(i + 1) % cpts.length];
    const p0 = { x: a.x * w, y: a.y * h };
    const p1 = {
      x: (a.cp2x != null ? a.cp2x : a.x) * w,
      y: (a.cp2y != null ? a.cp2y : a.y) * h,
    };
    const p2 = {
      x: (b.cp1x != null ? b.cp1x : b.x) * w,
      y: (b.cp1y != null ? b.cp1y : b.y) * h,
    };
    const p3 = { x: b.x * w, y: b.y * h };
    const chord = Math.hypot(p3.x - p0.x, p3.y - p0.y);
    const bend =
      Math.hypot(p1.x - p0.x, p1.y - p0.y) + Math.hypot(p2.x - p3.x, p2.y - p3.y);
    const steps = Math.max(24, Math.min(96, Math.ceil((chord + bend) / 6)));
    const swA = curveNodeWidth(cpts, i, baseSw);
    const swB = curveNodeWidth(cpts, (i + 1) % cpts.length, baseSw);
    const start = samples.length ? 1 : 0;
    for (let s = start; s <= steps; s++) {
      const t = s / steps;
      const u = 1 - t;
      samples.push({
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
        sw: swA + (swB - swA) * t,
      });
    }
  }
  let out = '';
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    const sw = Math.max(0.4, (a.sw + b.sw) / 2);
    out += `<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" stroke="${color}" stroke-width="${sw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return out;
}

export const CURVE_FILL_PATTERNS = ['solid', 'lines', 'hatch', 'dots'];

/** SVG pattern paint for curve fill (drawing-panel styles). */
function curveFillPatternPaint(pat, color, uid) {
  const col = color || '#64748b';
  const id = `cfp-${String(uid || 'x').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  if (pat === 'lines') {
    return {
      defs: `<pattern id="${id}" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)"><line x1="0" y1="1" x2="8" y2="1" stroke="${col}" stroke-width="2"/></pattern>`,
      paint: `url(#${id})`,
    };
  }
  if (pat === 'hatch') {
    return {
      defs: `<pattern id="${id}" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="${col}" stroke-width="2"/><line x1="0" y1="0" x2="10" y2="0" stroke="${col}" stroke-width="2"/></pattern>`,
      paint: `url(#${id})`,
    };
  }
  if (pat === 'dots') {
    return {
      defs: `<pattern id="${id}" patternUnits="userSpaceOnUse" width="10" height="10"><circle cx="2.5" cy="2.5" r="1.6" fill="${col}"/></pattern>`,
      paint: `url(#${id})`,
    };
  }
  return { defs: '', paint: col };
}

function curvePathsFromPoints(cpts, w, h, closed) {
  if (!cpts || cpts.length < 2) return null;
  let strokeD = `M ${(cpts[0].x * w).toFixed(2)} ${(cpts[0].y * h).toFixed(2)}`;
  for (let ci = 1; ci < cpts.length; ci++) {
    const pp = cpts[ci - 1];
    const cp = cpts[ci];
    const c1x = pp.cp2x != null ? pp.cp2x : pp.x;
    const c1y = pp.cp2y != null ? pp.cp2y : pp.y;
    const c2x = cp.cp1x != null ? cp.cp1x : cp.x;
    const c2y = cp.cp1y != null ? cp.cp1y : cp.y;
    strokeD += ` C ${(c1x * w).toFixed(2)} ${(c1y * h).toFixed(2)} ${(c2x * w).toFixed(2)} ${(c2y * h).toFixed(2)} ${(cp.x * w).toFixed(2)} ${(cp.y * h).toFixed(2)}`;
  }
  if (closed) strokeD += makeBezierClose(cpts, w, h);
  const fillD = strokeD.endsWith(' Z') ? strokeD : strokeD + makeBezierClose(cpts, w, h);
  return { strokeD, fillD };
}


export function shapeViewBox() {
  return '0 0 100 100';
}

export const SHAPE_STROKE_STYLES = ['solid', 'dashed', 'dotted', 'double', 'wave', 'zigzag'];

export function strokeDashAttrs(style, sw) {
  const w = Math.max(0.5, +sw || 2);
  if (!style || style === 'solid' || style === 'double' || style === 'wave' || style === 'zigzag') return '';
  if (style === 'dashed') return ` stroke-dasharray="${w * 4} ${w * 3}"`;
  if (style === 'dotted') return ` stroke-dasharray="${w} ${w * 3}" stroke-linecap="round"`;
  return '';
}

/** Decorative wave/zigzag outline in element pixels. */
function complexOutlinePath(style, inset = 5, W = 100, H = 100) {
  const x = (inset / 100) * W;
  const y = (inset / 100) * H;
  const bw = W - x * 2;
  const bh = H - y * 2;
  if (style === 'wave') {
    const z = Math.max(2, bw * 0.04);
    let d = `M ${x} ${y + z}`;
    for (let i = 0; i < 8; i++) {
      const t1 = (i + 0.5) / 8;
      const t2 = (i + 1) / 8;
      d += ` Q ${x + bw * t1} ${y + (i % 2 === 0 ? 0 : z * 2)} ${x + bw * t2} ${y + z}`;
    }
    d += ` L ${x + bw} ${y + bh - z}`;
    for (let i = 0; i < 8; i++) {
      const t1 = (i + 0.5) / 8;
      const t2 = (i + 1) / 8;
      d += ` Q ${x + bw * (1 - t1)} ${y + bh - (i % 2 === 0 ? 0 : z * 2)} ${x + bw * (1 - t2)} ${y + bh - z}`;
    }
    d += ` L ${x} ${y + z} Z`;
    return d;
  }
  if (style === 'zigzag') {
    const z = bh * 0.12;
    return (
      `M ${x} ${y + z} L ${x + bw * 0.12} ${y} L ${x + bw * 0.24} ${y + z} L ${x + bw * 0.36} ${y} ` +
      `L ${x + bw * 0.48} ${y + z} L ${x + bw * 0.6} ${y} L ${x + bw * 0.72} ${y + z} L ${x + bw * 0.84} ${y} ` +
      `L ${x + bw} ${y + z} L ${x + bw} ${y + bh - z} L ${x + bw * 0.88} ${y + bh} L ${x + bw * 0.76} ${y + bh - z} ` +
      `L ${x + bw * 0.64} ${y + bh} L ${x + bw * 0.52} ${y + bh - z} L ${x + bw * 0.4} ${y + bh} ` +
      `L ${x + bw * 0.28} ${y + bh - z} L ${x + bw * 0.16} ${y + bh} L ${x} ${y + bh - z} Z`
    );
  }
  return `M ${x} ${y} H ${x + bw} V ${y + bh} H ${x} Z`;
}

function waveAlongLine(sw, W = 100, H = 100) {
  const amp = Math.max(2, (+sw || 4) * 1.2);
  let d = `M 0 ${H / 2}`;
  for (let i = 0; i <= 12; i++) {
    const x = (W * i) / 12;
    const y = H / 2 + (i % 2 === 0 ? 0 : i % 4 === 1 ? -amp : amp);
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

function zigzagAlongLine(sw, W = 100, H = 100) {
  const amp = Math.max(3, (+sw || 4) * 1.4);
  let d = `M 0 ${H / 2}`;
  for (let i = 0; i <= 14; i++) {
    const x = (W * i) / 14;
    const y = H / 2 + (i % 2 === 0 ? amp : -amp);
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

export const LINE_MARKER_TYPES = ['none', 'arrow', 'square', 'circle', 'bar', 'cross'];

export const LINE_MARKER_PREVIEWS = {
  none: '<line x1="4" y1="14" x2="24" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  arrow:
    '<line x1="4" y1="14" x2="17" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16.5,12.1 Q20,14 16.5,15.9 L13.2,17.8 Q10,19.5 10,17.2 L10,10.8 Q10,8.5 13.2,10.2 Z" fill="currentColor"/>',
  square:
    '<line x1="4" y1="14" x2="18" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="18" y="9" width="10" height="10" rx="1" stroke="currentColor" stroke-width="2" fill="currentColor" opacity="0.25"/>',
  circle:
    '<line x1="4" y1="14" x2="17" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="14" r="5" stroke="currentColor" stroke-width="2" fill="currentColor" opacity="0.25"/>',
  bar: '<line x1="4" y1="14" x2="22" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="22" y1="7" x2="22" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  cross:
    '<line x1="4" y1="14" x2="17" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="19" y1="8" x2="25" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="25" y1="8" x2="19" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};

function lineMarkerDefHtml(id, type, color, atStart) {
  if (!type || type === 'none') return '';
  const col = color || '#1d4ed8';
  let inner = '';
  let refX = '1.5';
  let refY = '1.5';
  let orient = 'auto';
  let mw = '3.0';
  let mh = '3.0';
  if (type === 'arrow') {
    // Near the triangle base, with a small overlap onto the stroke so no hairline
    // gap shows at the join (tip still points outward past the path endpoint).
    mw = '3.1';
    mh = '3.5';
    refX = atStart ? '2.55' : '0.22';
    refY = '1.6';
    const pathEnd =
      'M2.555,1.475 L2.555,1.475 Q2.771,1.600 2.555,1.725 L0.217,3.075 Q0.000,3.200 0.000,2.950 L0.000,0.250 Q0.000,0.000 0.217,0.125 Z';
    const pathStart =
      'M0.216,1.475 L0.216,1.475 Q0.000,1.600 0.216,1.725 L2.554,3.075 Q2.771,3.200 2.771,2.950 L2.771,0.250 Q2.771,0.000 2.554,0.125 Z';
    inner = `<path d="${atStart ? pathStart : pathEnd}" fill="${col}" stroke="none"/>`;
  } else if (type === 'square') {
    // Centered on the path tip (same as connectors) — do not reuse arrow edge-anchoring.
    refX = '1.5';
    inner = `<rect x="0" y="0" width="3" height="3" rx="0.5" ry="0.5" fill="${col}" stroke="none"/>`;
  } else if (type === 'circle') {
    refX = '1.5';
    inner = `<circle cx="1.5" cy="1.5" r="1.3" fill="${col}" stroke="none"/>`;
  } else if (type === 'bar') {
    refX = '1.5';
    inner = `<path d="M1.5,0.2 L1.5,2.8" stroke="${col}" stroke-width="1" stroke-linecap="round" fill="none"/>`;
  } else if (type === 'cross') {
    // Cross must sit on the tip center; edge refX made it grow from the stroke rim.
    orient = '0';
    refX = '1.5';
    inner =
      `<path d="M0.3,0.3 L2.7,2.7" stroke="${col}" stroke-width="1" stroke-linecap="round" fill="none"/>` +
      `<path d="M2.7,0.3 L0.3,2.7" stroke="${col}" stroke-width="1" stroke-linecap="round" fill="none"/>`;
  } else return '';
  return `<marker id="${id}" markerUnits="strokeWidth" orient="${orient}" markerWidth="${mw}" markerHeight="${mh}" refX="${refX}" refY="${refY}" fill="${col}" stroke="${col}">${inner}</marker>`;
}

/** Short oriented stubs so end markers can ride a variable-width stroke. */
function curveMarkerTipPaths(cpts, w, h) {
  if (!cpts || cpts.length < 2) return null;
  const n = cpts.length;
  const p0 = { x: cpts[0].x * w, y: cpts[0].y * h };
  const t0x = (cpts[0].cp2x != null ? cpts[0].cp2x : cpts[1].x) * w;
  const t0y = (cpts[0].cp2y != null ? cpts[0].cp2y : cpts[1].y) * h;
  const pN = { x: cpts[n - 1].x * w, y: cpts[n - 1].y * h };
  const tNx = (cpts[n - 1].cp1x != null ? cpts[n - 1].cp1x : cpts[n - 2].x) * w;
  const tNy = (cpts[n - 1].cp1y != null ? cpts[n - 1].cp1y : cpts[n - 2].y) * h;
  // Keep stubs tiny so only the marker shows; stroke-opacity 0 avoids a double tip.
  const nudge = (from, to) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const s = Math.min(2, len * 0.08);
    return { x: from.x + (dx / len) * s, y: from.y + (dy / len) * s };
  };
  const a1 = nudge(p0, { x: t0x, y: t0y });
  const b0 = nudge(pN, { x: tNx, y: tNy });
  return {
    startD: `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} L ${a1.x.toFixed(2)} ${a1.y.toFixed(2)}`,
    endD: `M ${b0.x.toFixed(2)} ${b0.y.toFixed(2)} L ${pN.x.toFixed(2)} ${pN.y.toFixed(2)}`,
  };
}

function lineMarkerAttrs(opts, color) {
  const fromMk = opts.lineFromMarker || 'none';
  const toMk = opts.lineToMarker || 'none';
  if (fromMk === 'none' && toMk === 'none') return { defs: '', attrs: '' };
  const uid = String(opts.uid || 'ln').replace(/[^a-zA-Z0-9_-]/g, '_');
  const mkP = `lm_${uid}`;
  let defs = '';
  let attrs = '';
  if (fromMk !== 'none') {
    defs += lineMarkerDefHtml(`${mkP}_f`, fromMk, color, true);
    attrs += ` marker-start="url(#${mkP}_f)"`;
  }
  if (toMk !== 'none') {
    defs += lineMarkerDefHtml(`${mkP}_t`, toMk, color, false);
    attrs += ` marker-end="url(#${mkP}_t)"`;
  }
  return { defs, attrs };
}

export const LINE_GEOM_MARKS = [
  { id: 'none', titleRu: 'Без метки', titleEn: 'None' },
  { id: 'tick1', titleRu: 'Одинарная', titleEn: 'Single' },
  { id: 'tick2', titleRu: 'Двойная', titleEn: 'Double' },
  { id: 'tick3', titleRu: 'Тройная', titleEn: 'Triple' },
  { id: 'S', titleRu: 'Волна (общая сторона)', titleEn: 'Shared side (S)' },
];

/** Mid-segment geometry marks (line along y = h/2). Sizes match v7.1 `_lineGeomMarkSvg`. */
export function lineGeomMarkSvg(opts, strokeColor, sw, W = 100, H = 100) {
  const mark = opts?.lineMark;
  if (!mark || mark === 'none') return '';
  const cx = W / 2;
  const cy = H / 2;
  const col = strokeColor || '#1d4ed8';
  const lineSw = Math.max(1, +sw || 2);
  // Half the segment stroke so marks read as overlays
  const tw = Math.max(1, lineSw * 0.5);
  if (mark === 'S' || mark === 's') {
    const mh = Math.max(22, Math.min(48, 18 + lineSw * 5.5));
    const A = Math.max(7, Math.min(16, 5 + lineSw * 2.8));
    const tip = A * 0.55;
    const y0 = cy - mh / 2;
    const y1 = cy + mh / 2;
    const dPath =
      `M ${cx + tip} ${y0} ` +
      `C ${cx - A} ${y0} ${cx - A} ${cy - mh * 0.08} ${cx} ${cy} ` +
      `C ${cx + A} ${cy + mh * 0.08} ${cx + A} ${y1} ${cx - tip} ${y1}`;
    return `<path class="line-geom-mark" d="${dPath}" fill="none" stroke="${col}" stroke-width="${tw}" stroke-linecap="round" stroke-linejoin="round" transform="rotate(-90 ${cx} ${cy})"/>`;
  }
  const n = mark === 'tick3' || mark === '3' ? 3 : mark === 'tick2' || mark === '2' ? 2 : 1;
  const half = Math.max(7, Math.min(16, 6 + lineSw * 1.5));
  const gap = Math.max(lineSw * 1.6, Math.min(8, 3.5 + lineSw * 0.9));
  const start = (-(n - 1) * gap) / 2;
  let html = '';
  for (let i = 0; i < n; i++) {
    const x = cx + start + i * gap;
    html += `<line class="line-geom-mark" x1="${x}" y1="${cy - half}" x2="${x}" y2="${cy + half}" stroke="${col}" stroke-width="${tw}" stroke-linecap="round"/>`;
  }
  return html;
}

function fillImgPatternDef(opts, uid, W, H) {
  if (!opts.fillImg) return '';
  const id = `sfi_${String(uid || 'x').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const w = Math.max(1, +opts.fillImgW || W);
  const h = Math.max(1, +opts.fillImgH || H);
  const x = opts.fillImgX != null ? +opts.fillImgX : (W - w) / 2;
  const y = opts.fillImgY != null ? +opts.fillImgY : (H - h) / 2;
  const rot = +opts.fillImgRot || 0;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const href = String(opts.fillImg).replace(/"/g, '&quot;');
  const tf = rot ? ` transform="rotate(${rot} ${cx.toFixed(2)} ${cy.toFixed(2)})"` : '';
  // Tile must overhang the shape: a pattern sized exactly to W×H shows a dark 1px seam
  // on anti-aliased / rotated edges. Bleed the image a hair so path AA samples opaque pixels.
  const tilePad = 4;
  const imgPad = 2;
  return (
    `<pattern id="${id}" patternUnits="userSpaceOnUse" x="${-tilePad}" y="${-tilePad}" width="${W + tilePad * 2}" height="${H + tilePad * 2}">` +
    `<image href="${href}" xlink:href="${href}" x="${(x - imgPad).toFixed(2)}" y="${(y - imgPad).toFixed(2)}" width="${(w + imgPad * 2).toFixed(2)}" height="${(h + imgPad * 2).toFixed(2)}" preserveAspectRatio="none"${tf}/>` +
    `</pattern>`
  );
}

function fillPaint(opts, uid) {
  if (opts.fillImg) {
    const id = `sfi_${String(uid || 'x').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    return { fill: `url(#${id})`, defId: null, fillImg: true };
  }
  if (opts.fill === 'none' || opts.noFill) return { fill: 'none', defId: null };
  if (opts.fillGrad && opts.fillGrad2) {
    const id = `sg_${uid || 'x'}`;
    return { fill: `url(#${id})`, defId: id };
  }
  return { fill: opts.fill || '#64748b', defId: null };
}

function gradDef(opts, defId) {
  if (!defId || !opts.fillGrad || !opts.fillGrad2) return '';
  const dir = opts.fillGradDir != null ? +opts.fillGradDir : 90;
  const rad = ((dir - 90) * Math.PI) / 180;
  const x1 = (50 - Math.cos(rad) * 50).toFixed(1);
  const y1 = (50 - Math.sin(rad) * 50).toFixed(1);
  const x2 = (50 + Math.cos(rad) * 50).toFixed(1);
  const y2 = (50 + Math.sin(rad) * 50).toFixed(1);
  return (
    `<defs><linearGradient id="${defId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">` +
    `<stop offset="0%" stop-color="${opts.fillGrad}"/>` +
    `<stop offset="100%" stop-color="${opts.fillGrad2}"/>` +
    `</linearGradient></defs>`
  );
}

function wrapSvg(inner, defs = '', w = 100, h = 100) {
  const vw = Math.max(1, +w || 100);
  const vh = Math.max(1, +h || 100);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="100%" height="100%" preserveAspectRatio="none" overflow="visible">` +
    `${defs}${inner}</svg>`
  );
}

/** 7.1 `_roundedPolygonPath` — cubic corner rounding in element pixels. */
/** Round sharp polygon corners (px radius). Used by SVG fill and CSS clip-path. */
export function roundedPolygonPath(pts, rx) {
  const n = pts.length;
  if (n < 3 || rx <= 0) {
    return pts.map((p, i) => `${i === 0 ? 'M ' : 'L '}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
  }
  const corners = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const e1x = prev.x - curr.x;
    const e1y = prev.y - curr.y;
    const e2x = next.x - curr.x;
    const e2y = next.y - curr.y;
    const len1 = Math.hypot(e1x, e1y);
    const len2 = Math.hypot(e2x, e2y);
    if (len1 < 0.001 || len2 < 0.001) {
      corners.push(null);
      continue;
    }
    const u1x = e1x / len1;
    const u1y = e1y / len1;
    const u2x = e2x / len2;
    const u2y = e2y / len2;
    const cosA = Math.max(-1, Math.min(1, u1x * u2x + u1y * u2y));
    const halfAngle = Math.acos(cosA) / 2;
    const r = Math.min(rx, len1 / 2, len2 / 2);
    const p1x = curr.x + u1x * r;
    const p1y = curr.y + u1y * r;
    const p2x = curr.x + u2x * r;
    const p2y = curr.y + u2y * r;
    const kCalc = (4 / 3) * Math.tan(halfAngle / 2);
    const k = Math.max(kCalc, 0.55);
    corners.push({
      p1x,
      p1y,
      p2x,
      p2y,
      cp1x: p1x - u1x * r * k,
      cp1y: p1y - u1y * r * k,
      cp2x: p2x - u2x * r * k,
      cp2y: p2y - u2y * r * k,
    });
  }
  let d = '';
  let started = false;
  for (let i = 0; i < n; i++) {
    const c = corners[i];
    if (!c) continue;
    d += started
      ? `L ${c.p1x.toFixed(2)} ${c.p1y.toFixed(2)} `
      : `M ${c.p1x.toFixed(2)} ${c.p1y.toFixed(2)} `;
    started = true;
    d += `C ${c.cp1x.toFixed(2)} ${c.cp1y.toFixed(2)} ${c.cp2x.toFixed(2)} ${c.cp2y.toFixed(2)} ${c.p2x.toFixed(2)} ${c.p2y.toFixed(2)} `;
  }
  d += 'Z';
  return d;
}

function extractPolygonPts(pathStr) {
  const pts = [];
  const re = /([MLQCSTAmlqcsta])\s*((?:[-\d.]+[\s,]+)*[-\d.]+)/g;
  let m;
  while ((m = re.exec(pathStr)) !== null) {
    const cmd = m[1].toUpperCase();
    if (cmd === 'Z') continue;
    const nums = m[2].trim().split(/[\s,]+/).map(parseFloat).filter((n) => !Number.isNaN(n));
    if (nums.length >= 2) pts.push({ x: nums[nums.length - 2], y: nums[nums.length - 1] });
  }
  return pts;
}

/** 7.1 `_roundedMixedPath` — round sharp L corners, keep Q/C. */
function roundedMixedPath(pathStr, rx) {
  if (!pathStr || rx <= 0) return pathStr;
  const segRe = /([MLQCZz])\s*((?:[-\d.e]+[\s,]+)*[-\d.e]+)?/g;
  const raw = [];
  let m;
  while ((m = segRe.exec(pathStr)) !== null) {
    const cmd = m[1].toUpperCase();
    const nums = m[2] ? m[2].trim().split(/[\s,]+/).map(parseFloat).filter((n) => !Number.isNaN(n)) : [];
    raw.push({ cmd, nums });
  }
  const nodes = [];
  let cx = 0;
  let cy = 0;
  let mx = 0;
  let my = 0;
  for (const seg of raw) {
    if (seg.cmd === 'M') {
      cx = seg.nums[0];
      cy = seg.nums[1];
      mx = cx;
      my = cy;
      nodes.push({ cmd: 'M', x: cx, y: cy });
    } else if (seg.cmd === 'L') {
      const x = seg.nums[0];
      const y = seg.nums[1];
      nodes.push({ cmd: 'L', x, y, fromX: cx, fromY: cy });
      cx = x;
      cy = y;
    } else if (seg.cmd === 'Q') {
      nodes.push({ cmd: 'Q', nums: seg.nums, fromX: cx, fromY: cy });
      cx = seg.nums[2];
      cy = seg.nums[3];
    } else if (seg.cmd === 'C') {
      nodes.push({ cmd: 'C', nums: seg.nums, fromX: cx, fromY: cy });
      cx = seg.nums[4];
      cy = seg.nums[5];
    } else if (seg.cmd === 'Z') {
      nodes.push({ cmd: 'Z', x: mx, y: my });
    }
  }
  const n = nodes.length;
  const rounded = {};
  const startIdx = nodes.findIndex((nd) => nd.cmd === 'M');
  const zIdx = nodes.findIndex((nd) => nd.cmd === 'Z');
  function endPt(i) {
    const nd = nodes[i];
    if (nd.cmd === 'M' || nd.cmd === 'L' || nd.cmd === 'Z') return { x: nd.x, y: nd.y };
    if (nd.cmd === 'Q') return { x: nd.nums[2], y: nd.nums[3] };
    if (nd.cmd === 'C') return { x: nd.nums[4], y: nd.nums[5] };
    return null;
  }
  function makeRound(i, vx, vy, prevX, prevY, nextX, nextY) {
    const e1x = vx - prevX;
    const e1y = vy - prevY;
    const e2x = nextX - vx;
    const e2y = nextY - vy;
    const len1 = Math.hypot(e1x, e1y);
    const len2 = Math.hypot(e2x, e2y);
    if (len1 < 0.1 || len2 < 0.1) return;
    const r = Math.min(rx, len1 / 2, len2 / 2);
    rounded[i] = {
      p1x: vx - (e1x / len1) * r,
      p1y: vy - (e1y / len1) * r,
      p2x: vx + (e2x / len2) * r,
      p2y: vy + (e2y / len2) * r,
      vx,
      vy,
    };
  }
  for (let i = 0; i < n; i++) {
    const nd = nodes[i];
    if (nd.cmd === 'L') {
      let prevEnd = null;
      for (let j = i - 1; j >= 0; j--) {
        prevEnd = endPt(j);
        if (prevEnd) break;
      }
      if (!prevEnd) continue;
      const nextNd = nodes[i + 1];
      if (!nextNd) continue;
      if (nextNd.cmd === 'L') makeRound(i, nd.x, nd.y, prevEnd.x, prevEnd.y, nextNd.x, nextNd.y);
      else if (nextNd.cmd === 'Z' || nextNd.cmd === 'M') {
        const startPt = endPt(startIdx);
        if (startPt) {
          const firstL = nodes.find((nd2, j) => j > startIdx && nd2.cmd === 'L');
          if (firstL) makeRound(i, nd.x, nd.y, prevEnd.x, prevEnd.y, startPt.x, startPt.y);
        }
      }
    }
    if (nd.cmd === 'M' && zIdx >= 0) {
      const lastL = [...nodes].slice(0, zIdx).reverse().find((nd2) => nd2.cmd === 'L');
      const firstL = nodes.find((nd2, j) => j > i && nd2.cmd === 'L');
      if (lastL && firstL) makeRound(i, nd.x, nd.y, lastL.x, lastL.y, firstL.x, firstL.y);
    }
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const nd = nodes[i];
    const rnd = rounded[i];
    if (nd.cmd === 'M') {
      out.push(rnd ? `M ${rnd.p2x.toFixed(2)} ${rnd.p2y.toFixed(2)}` : `M ${nd.x.toFixed(2)} ${nd.y.toFixed(2)}`);
    } else if (nd.cmd === 'L') {
      if (rnd) {
        out.push(`L ${rnd.p1x.toFixed(2)} ${rnd.p1y.toFixed(2)}`);
        out.push(`Q ${rnd.vx.toFixed(2)} ${rnd.vy.toFixed(2)} ${rnd.p2x.toFixed(2)} ${rnd.p2y.toFixed(2)}`);
      } else out.push(`L ${nd.x.toFixed(2)} ${nd.y.toFixed(2)}`);
    } else if (nd.cmd === 'Q') {
      out.push(`Q ${nd.nums[0].toFixed(2)} ${nd.nums[1].toFixed(2)} ${nd.nums[2].toFixed(2)} ${nd.nums[3].toFixed(2)}`);
    } else if (nd.cmd === 'C') {
      out.push(
        `C ${nd.nums[0].toFixed(2)} ${nd.nums[1].toFixed(2)} ${nd.nums[2].toFixed(2)} ${nd.nums[3].toFixed(2)} ${nd.nums[4].toFixed(2)} ${nd.nums[5].toFixed(2)}`
      );
    } else if (nd.cmd === 'Z') {
      const mRnd = rounded[startIdx];
      if (mRnd) {
        out.push(`L ${mRnd.p1x.toFixed(2)} ${mRnd.p1y.toFixed(2)}`);
        out.push(`Q ${mRnd.vx.toFixed(2)} ${mRnd.vy.toFixed(2)} ${mRnd.p2x.toFixed(2)} ${mRnd.p2y.toFixed(2)}`);
      }
      out.push('Z');
    }
  }
  return out.join(' ');
}

/** Scale catalog path coords (5..95 box in 0..100) to element px. Shared with hit clip. */
export function scaleCatalogPath(pathStr, w, h, margin) {
  const ew = Math.max(1, w - margin * 2);
  const eh = Math.max(1, h - margin * 2);
  const sx = ew / 90;
  const sy = eh / 90;
  return String(pathStr || '').replace(/(-?\d+(?:\.\d+)?)/g, (_, v, off, str) => {
    const nums = (str.slice(0, off).match(/(-?\d+(?:\.\d+)?)/g) || []).length;
    return nums % 2 === 0
      ? String(Math.round((+v - 5) * sx + margin))
      : String(Math.round((+v - 5) * sy + margin));
  });
}

function applyCornerRx(path, rx) {
  if (!path || !(rx > 0)) return path;
  if (/[QqCc]/.test(path)) return roundedMixedPath(path, rx);
  const polyPts = extractPolygonPts(path);
  if (polyPts.length >= 3) return roundedPolygonPath(polyPts, rx);
  return path;
}

function ptsToPath(pts, rx) {
  if (!pts || pts.length < 3) return '';
  if (rx > 0) return roundedPolygonPath(pts, rx);
  return `M ${pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`;
}

function starPts(W, H, m, points, innerRatio) {
  const nRays = Math.max(4, Math.min(32, +points || 5));
  const ir = Math.max(0.1, Math.min(0.9, +innerRatio || 0.45));
  const ew = Math.max(1, W - m * 2);
  const eh = Math.max(1, H - m * 2);
  const cx = W / 2;
  const cy = H / 2;
  const pts = [];
  for (let i = 0; i < nRays * 2; i++) {
    const a = (i / (nRays * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 1 : ir;
    pts.push({ x: cx + (ew / 2) * r * Math.cos(a), y: cy + (eh / 2) * r * Math.sin(a) });
  }
  return pts;
}

function polygonPts(W, H, m, sides) {
  const n = Math.max(3, Math.min(16, +sides || 3));
  const ew = Math.max(1, W - m * 2);
  const eh = Math.max(1, H - m * 2);
  const cx = W / 2;
  const cy = H / 2;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: cx + (ew / 2) * Math.cos(a), y: cy + (eh / 2) * Math.sin(a) });
  }
  return pts;
}

/** Top/bottom inset as fraction of width (0–0.49). Default top 0.15 so it reads as a trapezoid. */
export function normalizeTrapTop(v) {
  if (v == null || v === '') return 0.15;
  const n = +v;
  return Math.max(0, Math.min(0.49, Number.isFinite(n) ? n : 0.15));
}

export function normalizeTrapBot(v) {
  if (v == null || v === '') return 0;
  const n = +v;
  return Math.max(0, Math.min(0.49, Number.isFinite(n) ? n : 0));
}

function trapezoidPts(W, H, m, trapTop, trapBot) {
  const ew = Math.max(1, W - m * 2);
  const eh = Math.max(1, H - m * 2);
  const t = normalizeTrapTop(trapTop);
  const b = normalizeTrapBot(trapBot);
  const tl = Math.min(ew * 0.49, t * ew);
  const bl = Math.min(ew * 0.49, b * ew);
  return [
    { x: m + tl, y: m },
    { x: m + ew - tl, y: m },
    { x: m + ew - bl, y: m + eh },
    { x: m + bl, y: m + eh },
  ];
}

/** Horizontal offset for parallelogram lean; `skewDeg` is the side angle from vertical. */
export function parallelogramOff(eh, ew, skewDeg) {
  const sk = Math.max(-45, Math.min(45, Number.isFinite(+skewDeg) ? +skewDeg : 20));
  const off = Math.abs(eh * Math.tan((sk * Math.PI) / 180));
  return Math.max(0, Math.min(Math.max(0, ew - 1), off));
}

function parallelogramPts(W, H, m, skewPct) {
  const ew = Math.max(1, W - m * 2);
  const eh = Math.max(1, H - m * 2);
  const raw = skewPct != null && skewPct !== '' ? +skewPct : 20;
  const sk = Math.max(-45, Math.min(45, Number.isFinite(raw) ? raw : 20));
  // Keep all corners inside the box for both lean directions.
  // Positive: top shifts right. Negative: top shifts left (bottom shifts right).
  // `paraSkew` is the side angle from vertical (not half-height atan).
  const off = Math.round(parallelogramOff(eh, ew, sk));
  if (sk < 0) {
    return [
      { x: m, y: m },
      { x: m + ew - off, y: m },
      { x: m + ew, y: m + eh },
      { x: m + off, y: m + eh },
    ];
  }
  return [
    { x: m + off, y: m },
    { x: m + ew, y: m },
    { x: m + ew - off, y: m + eh },
    { x: m, y: m + eh },
  ];
}

function chevronPts(id, W, H, m, skewPct, innerPct) {
  const ew = Math.max(1, W - m * 2);
  const eh = Math.max(1, H - m * 2);
  const sk = Math.max(0, Math.min(45, +skewPct || 25));
  const inn = Math.max(0, Math.min(45, innerPct != null ? +innerPct : sk));
  const tip = Math.round((ew * sk) / 100);
  const ind = Math.round((ew * inn) / 100);
  const mid = m + Math.round(eh / 2);
  if (id === 'chevronLeft') {
    return [
      { x: m + ew, y: m },
      { x: m + tip, y: m },
      { x: m, y: mid },
      { x: m + tip, y: m + eh },
      { x: m + ew, y: m + eh },
      { x: m + ew - ind, y: mid },
    ];
  }
  return [
    { x: m, y: m },
    { x: m + ew - tip, y: m },
    { x: m + ew, y: mid },
    { x: m + ew - tip, y: m + eh },
    { x: m, y: m + eh },
    { x: m + ind, y: mid },
  ];
}

/** Head length as % of the main axis (10–70). Matches catalog arrows at ~35. */
export function normalizeArrowHead(headPct) {
  const n = headPct != null && headPct !== '' ? +headPct : 35;
  return Math.max(10, Math.min(70, Number.isFinite(n) ? n : 35));
}

/**
 * Block-arrow polygon. `arrowHead` = tip triangle length along the shaft axis (%).
 * Shaft thickness stays ~30% of the cross axis (catalog look).
 */
export function arrowPts(id, W, H, m, headPct) {
  const ew = Math.max(1, W - m * 2);
  const eh = Math.max(1, H - m * 2);
  const head = normalizeArrowHead(headPct) / 100;
  const shaftT = 0.3;
  if (id === 'arrowUp' || id === 'arrowDown') {
    const sx0 = m + ew * (0.5 - shaftT / 2);
    const sx1 = m + ew * (0.5 + shaftT / 2);
    const midX = m + ew / 2;
    if (id === 'arrowUp') {
      const neckY = m + eh * head;
      return [
        { x: sx0, y: m + eh },
        { x: sx0, y: neckY },
        { x: m, y: neckY },
        { x: midX, y: m },
        { x: m + ew, y: neckY },
        { x: sx1, y: neckY },
        { x: sx1, y: m + eh },
      ];
    }
    const neckY = m + eh * (1 - head);
    return [
      { x: sx0, y: m },
      { x: sx0, y: neckY },
      { x: m, y: neckY },
      { x: midX, y: m + eh },
      { x: m + ew, y: neckY },
      { x: sx1, y: neckY },
      { x: sx1, y: m },
    ];
  }
  const sy0 = m + eh * (0.5 - shaftT / 2);
  const sy1 = m + eh * (0.5 + shaftT / 2);
  const midY = m + eh / 2;
  if (id === 'arrowLeft') {
    const neckX = m + ew * head;
    return [
      { x: m + ew, y: sy0 },
      { x: neckX, y: sy0 },
      { x: neckX, y: m },
      { x: m, y: midY },
      { x: neckX, y: m + eh },
      { x: neckX, y: sy1 },
      { x: m + ew, y: sy1 },
    ];
  }
  if (id === 'arrowDouble') {
    // Cap each head so the shaft never collapses.
    const h = Math.min(head, 0.4);
    const leftNeck = m + ew * h;
    const rightNeck = m + ew * (1 - h);
    return [
      { x: m, y: midY },
      { x: leftNeck, y: m },
      { x: leftNeck, y: sy0 },
      { x: rightNeck, y: sy0 },
      { x: rightNeck, y: m },
      { x: m + ew, y: midY },
      { x: rightNeck, y: m + eh },
      { x: rightNeck, y: sy1 },
      { x: leftNeck, y: sy1 },
      { x: leftNeck, y: m + eh },
    ];
  }
  // arrow (right)
  const neckX = m + ew * (1 - head);
  return [
    { x: m, y: sy0 },
    { x: neckX, y: sy0 },
    { x: neckX, y: m },
    { x: m + ew, y: midY },
    { x: neckX, y: m + eh },
    { x: neckX, y: sy1 },
    { x: m, y: sy1 },
  ];
}

function calloutPts(W, H, m) {
  const ew = Math.max(1, W - m * 2);
  const eh = Math.max(1, H - m * 2);
  const bodyH = eh * 0.72;
  return [
    { x: m, y: m },
    { x: m + ew, y: m },
    { x: m + ew, y: m + bodyH },
    { x: m + ew * 0.57, y: m + bodyH },
    { x: m + ew * 0.5, y: m + eh },
    { x: m + ew * 0.44, y: m + bodyH },
    { x: m, y: m + bodyH },
  ];
}

function moonPathPx(W, H, m, phase) {
  const p = Math.max(-100, Math.min(100, +phase || -50)) / 100;
  const cut = 45 + p * 28;
  return scaleCatalogPath(
    `M 72 5 C 35 5 10 25 10 50 C 10 75 35 95 72 95 C ${cut.toFixed(1)} 85 ${(cut - 10).toFixed(1)} 68 ${(cut - 10).toFixed(1)} 50 C ${(cut - 10).toFixed(1)} 32 ${cut.toFixed(1)} 15 72 5 Z`,
    W,
    H,
    m
  );
}

function gearPathPx(W, H, m, nTeeth, toothDepth) {
  const ew = Math.max(1, W - m * 2);
  const eh = Math.max(1, H - m * 2);
  const cx = W / 2;
  const cy = H / 2;
  const erx = ew / 2;
  const ery = eh / 2;
  const teeth = Math.max(3, Math.min(60, +nTeeth || 8));
  const depth = Math.max(0.05, Math.min(0.6, +toothDepth || 0.25));
  const pts = [];
  const steps = teeth * 4;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const tooth = Math.floor(i / 2) % 2 === 0 ? 1 : 1 - depth;
    pts.push(`${(cx + erx * tooth * Math.cos(a)).toFixed(1)},${(cy + ery * tooth * Math.sin(a)).toFixed(1)}`);
  }
  const hole = `M ${(cx + erx * 0.28).toFixed(1)} ${cy} A ${(erx * 0.28).toFixed(1)} ${(ery * 0.28).toFixed(1)} 0 1 0 ${(cx - erx * 0.28).toFixed(1)} ${cy} A ${(erx * 0.28).toFixed(1)} ${(ery * 0.28).toFixed(1)} 0 1 0 ${(cx + erx * 0.28).toFixed(1)} ${cy}`;
  return `M ${pts.join(' L ')} Z ${hole}`;
}

function customPtsPath(opts, W, H, rx) {
  const raw = opts?.shapePts;
  if (!Array.isArray(raw) || raw.length < 3) return null;
  const pts = raw.map((p) => ({
    x: (+p.x || 0) * W,
    y: (+p.y || 0) * H,
  }));
  return ptsToPath(pts, rx);
}

/**
 * Normalized 0..1 corner vertices for node editing (no rounding).
 * Empty when the shape has no corners (circle / ellipse / line / specials).
 */
export function shapeCornerPtsNorm(id, opts = {}) {
  const meta = getShapeMeta(id);
  const special = meta?.special || id;
  if (
    special === 'ellipse' ||
    id === 'circle' ||
    id === 'ellipse' ||
    special === 'line' ||
    id === 'line' ||
    special === 'curve' ||
    special === 'cloud' ||
    special === 'moon' ||
    special === 'gear' ||
    special === 'callout' ||
    special === 'noSymbol' ||
    id === 'noSymbol'
  ) {
    return [];
  }
  if (meta?.noFill && special !== 'rect') return [];
  const W = 100;
  const H = 100;
  if (special === 'rect' || id === 'rect' || id === 'roundrect') {
    return [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
  }
  const path = resolvePath(id, meta, opts, W, H, 0, 0);
  if (!path) return [];
  const pts = extractPolygonPts(path);
  if (pts.length < 3) return [];
  return pts.map((p) => ({
    x: Math.round((p.x / W) * 10000) / 10000,
    y: Math.round((p.y / H) * 10000) / 10000,
  }));
}

function resolvePath(id, meta, opts, W, H, m, rx) {
  const custom = customPtsPath(opts, W, H, rx);
  if (custom) return custom;
  const special = meta?.special || id;
  if (special === 'rect' || special === 'ellipse' || id === 'circle') return null;
  if (special === 'triangle' || id === 'triangle') return ptsToPath(polygonPts(W, H, m, 3), rx);
  if (special === 'hexagon' || id === 'hexagon') return ptsToPath(polygonPts(W, H, m, 6), rx);
  if (special === 'diamond' || id === 'diamond') {
    return ptsToPath(
      [
        { x: W / 2, y: m },
        { x: W - m, y: H / 2 },
        { x: W / 2, y: H - m },
        { x: m, y: H / 2 },
      ],
      rx
    );
  }
  if (special === 'polygon') {
    const sides = opts.polySides != null ? opts.polySides : opts.sides != null ? opts.sides : meta?.sides || 6;
    return ptsToPath(polygonPts(W, H, m, sides), rx);
  }
  if (special === 'star') {
    const rays = opts.starRays != null ? opts.starRays : 5;
    const inner = opts.starInner != null ? opts.starInner : 0.45;
    return ptsToPath(starPts(W, H, m, rays, inner), rx);
  }
  if (special === 'parallelogram') return ptsToPath(parallelogramPts(W, H, m, opts.paraSkew), rx);
  if (special === 'cloud') {
    const raw =
      'M 25 70 Q 5 70 5 55 Q 5 40 20 38 Q 18 20 35 18 Q 42 5 58 12 Q 70 5 80 15 Q 95 15 95 32 Q 98 50 88 58 Q 90 70 75 70 Z';
    return applyCornerRx(scaleCatalogPath(raw, W, H, m), rx);
  }
  // callout / curve / moon / gear / cloud rendered as specials in buildBasicShapeSVG
  if (special === 'callout' || special === 'curve' || special === 'moon' || special === 'gear' || special === 'cloud') return null;
  if (special === 'trapezoid') return ptsToPath(trapezoidPts(W, H, m, opts.trapTop, opts.trapBot), rx);
  if (special === 'chevron') return ptsToPath(chevronPts(id, W, H, m, opts.chevSkew, opts.chevInner), rx);
  if (special === 'arrow') return ptsToPath(arrowPts(id, W, H, m, opts.arrowHead), rx);
  if (meta?.path) {
    const scaled = scaleCatalogPath(meta.path, W, H, m);
    return rx > 0 ? applyCornerRx(scaled, rx) : scaled;
  }
  return null;
}

/**
 * Corner radius stored as percent of min(w,h)/2 (0–100 → pill).
 * @param {number|string|null|undefined} rxPct
 * @param {number} w
 * @param {number} h
 */
export function shapeRxPx(rxPct, w, h) {
  const pct = Math.max(0, Math.min(100, +(rxPct != null ? rxPct : 0) || 0));
  const halfMin = Math.min(Math.max(1, +w || 100), Math.max(1, +h || 100)) / 2;
  return (pct / 100) * halfMin;
}

/**
 * Fill silhouette path `d` matching buildBasicShapeSVG (includes corner rx).
 * Used by CSS clip-path for image fills so triangle/polygon/hex/… round like the SVG.
 * @param {object} el
 * @param {{ sw?: number, w?: number, h?: number } } [override]
 * @returns {string|null}
 */
export function shapeOutlinePathD(el, override = {}) {
  if (!el) return null;
  const id = el.shape || el.shapeId || 'rect';
  const meta = getShapeMeta(id);
  const special = meta?.special || id;
  if (
    special === 'rect' ||
    id === 'rect' ||
    id === 'roundrect' ||
    special === 'ellipse' ||
    id === 'circle' ||
    id === 'ellipse' ||
    special === 'line' ||
    id === 'line' ||
    special === 'callout' ||
    special === 'curve' ||
    special === 'moon' ||
    special === 'gear' ||
    special === 'noSymbol' ||
    id === 'noSymbol'
  ) {
    return null;
  }
  const W = Math.max(1, +(override.w != null ? override.w : el.w) || 100);
  const H = Math.max(1, +(override.h != null ? override.h : el.h) || 100);
  const sw =
    override.sw != null
      ? +override.sw
      : el.sw === undefined
        ? 2
        : +el.sw;
  const m = sw > 0 ? sw / 2 : 0;
  const rxPx = shapeRxPx(el.rx, W, H);
  const opts = { ...shapeOptsFromEl(el), w: W, h: H };
  if (override.sw != null) opts.strokeWidth = sw;
  return resolvePath(id, meta, opts, W, H, m, rxPx) || null;
}

/**
 * @param {string} id shape id
 * @param {{
 *   fill?: string, stroke?: string, strokeWidth?: number,
 *   strokeStyle?: string, fillGrad?: string, fillGrad2?: string, fillGradDir?: number,
 *   fillOp?: number, uid?: string, rx?: number, sides?: number, w?: number, h?: number
 * }} opts
 */
export function buildBasicShapeSVG(id, opts = {}) {
  const meta = getShapeMeta(id);
  const W = Math.max(1, +opts.w || 100);
  const H = Math.max(1, +opts.h || 100);
  const stroke = opts.stroke || 'none';
  const sw = opts.strokeWidth != null ? +opts.strokeWidth : 0;
  const style = opts.strokeStyle || 'solid';
  const isComplex = style === 'wave' || style === 'zigzag';
  const isDouble = style === 'double';
  const dash = strokeDashAttrs(style, sw || 2);
  /** `opts.rx` is percent of min(w,h)/2 (0–100); convert to px for drawing. */
  const rxPx = shapeRxPx(opts.rx, W, H);
  // Selection rings pass noStrokeInset so a screen-thin stroke is not inset by sw/2.
  const margin = opts.noStrokeInset ? 0 : !isComplex && sw > 0 ? sw / 2 : 0;
  const op =
    opts.fillOp != null && opts.fillOp < 1 && opts.fillOp >= 0
      ? ` fill-opacity="${opts.fillOp}"`
      : '';
  const { fill, defId } = fillPaint(opts, opts.uid || id);
  const imgPat = fillImgPatternDef(opts, opts.uid || id, W, H);
  const defs = `${imgPat ? `<defs>${imgPat}</defs>` : ''}${gradDef(opts, defId)}`;
  const hasStroke = stroke && stroke !== 'none' && sw > 0;
  const strokeAttr =
    hasStroke && !isComplex && !isDouble
      ? `stroke="${stroke}" stroke-width="${sw}"${dash}`
      : 'stroke="none"';
  const noFill = !!(meta?.noFill || opts.noFill);
  const lineStroke = stroke === 'none' || !stroke ? fill : stroke;
  const lineSw = Math.max(sw || 4, 3);
  const wrap = (inner, extraDefs = defs) => wrapSvg(inner, extraDefs, W, H);
  const ew = Math.max(1, W - margin * 2);
  const eh = Math.max(1, H - margin * 2);

  if (id === 'ellipse' || id === 'circle' || meta?.special === 'ellipse') {
    const cx = W / 2;
    const cy = H / 2;
    const erx = ew / 2;
    const ery = eh / 2;
    const mode = opts.arcMode || 'full';
    const a1 = opts.arcStart != null ? +opts.arcStart : 0;
    const a2 = opts.arcEnd != null ? +opts.arcEnd : mode === 'full' ? 360 : 270;
    if (mode !== 'full') {
      // 0°…0° (or any equal angles) → invisible; 0°…360° → full ellipse.
      if (+a1 === +a2) {
        return wrap(
          `<ellipse cx="${cx}" cy="${cy}" rx="${erx}" ry="${ery}" fill="none" stroke="none" opacity="0"/>`
        );
      }
      const rawSpan = +a2 - +a1;
      const span = ((rawSpan % 360) + 360) % 360;
      const fullTurn = Math.abs(rawSpan) >= 360 || span === 0;
      if (!fullTurn) {
        const dArc = arcPath(cx, cy, W / 2, H / 2, a1, a2, mode, margin, rxPx);
        return wrap(`<path d="${dArc}" fill="${fill}"${op} ${strokeAttr}/>`);
      }
    }
    if (hasStroke && isDouble) {
      return wrap(
        `<ellipse cx="${cx}" cy="${cy}" rx="${erx}" ry="${ery}" fill="${fill}"${op} stroke="${stroke}" stroke-width="${sw * 3}"/>` +
          `<ellipse cx="${cx}" cy="${cy}" rx="${erx}" ry="${ery}" fill="none" stroke="${fill === 'transparent' || fill === 'none' ? '#fff' : fill}" stroke-width="${sw * 1.4}"/>`
      );
    }
    if (hasStroke && isComplex) {
      const path = complexOutlinePath(style, 8, W, H);
      return wrap(
        `<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(1, erx - sw)}" ry="${Math.max(1, ery - sw)}" fill="${fill}"${op} stroke="none"/>` +
          `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    }
    return wrap(`<ellipse cx="${cx}" cy="${cy}" rx="${erx}" ry="${ery}" fill="${fill}"${op} ${strokeAttr}/>`);
  }

  if (meta?.special === 'callout') {
    const fillAttr = `fill="${fill}"${op}`;
    const sAttr = hasStroke && !isComplex && !isDouble ? `stroke="${stroke}" stroke-width="${sw}"${dash}` : 'stroke="none"';
    const dCall = {
      ...opts,
      sw,
      stroke,
      strokeStyle: style,
      rx: rxPx,
      fill: opts.fill,
    };
    const inner = buildCalloutSVGPath(dCall, W, H, meta, fillAttr, sAttr, '', margin);
    return wrap(inner || '');
  }

  if (meta?.special === 'cloud') {
    const dCloud = { ...opts, sw, stroke, fill: opts.fill || fill };
    const circles = cloudResolveCircles(dCloud, W, H);
    const path = cloudBlobsPath(circles, 0);
    let strokePart = '';
    if (sw > 0) {
      const strokePath = cloudBlobsPath(circles, sw / 2);
      const strokeFill =
        opts.fillOp != null && opts.fillOp < 1
          ? `fill="${stroke}" fill-opacity="${(+opts.fillOp).toFixed(3)}"`
          : `fill="${stroke}"`;
      strokePart = `<path d="${strokePath}" fill-rule="nonzero" ${strokeFill} stroke="none"/>`;
    }
    let fillPart = '';
    const hasFillCloud = fill && fill !== 'none' && fill !== 'transparent';
    if (hasFillCloud) {
      if (opts.fillGrad && opts.fillGrad2) {
        // Use gradient paint from fillPaint/gradDef (same as other shapes)
        fillPart = `<path d="${path}" fill-rule="nonzero" fill="${fill}"${op} stroke="none"/>`;
      } else {
        const shade = cloudShadeFromFill(opts.fill || fill);
        fillPart = buildCloudArtSvg(
          circles,
          opts.fill || fill,
          shade,
          opts.fillOp != null ? +opts.fillOp : 1,
          opts.uid || 'c',
          '',
          '',
          W,
          H
        );
      }
    }
    return wrap(strokePart + fillPart);
  }

  if (meta?.special === 'moon') {
    const phase = normalizeMoonPhase(opts.moonPhase);
    const dMoon = moonPath(W / 2, H / 2, ew / 2, eh / 2, phase, rxPx);
    return wrap(`<path d="${dMoon}" fill="${fill}"${op} ${strokeAttr}/>`);
  }

  if (meta?.special === 'gear') {
    const nTeeth = Math.max(3, Math.min(60, +(opts.gearTeeth != null ? opts.gearTeeth : 12)));
    const toothD = Math.max(0.05, Math.min(0.6, +(opts.gearDepth != null ? opts.gearDepth : 0.25)));
    const gp = gearPath(W / 2, H / 2, ew / 2, eh / 2, nTeeth, toothD);
    return wrap(`<path d="${gp}" fill="${fill}"${op} fill-rule="evenodd" ${strokeAttr}/>`);
  }

  if (meta?.special === 'curve') {
    const cpts = opts.curvePoints;
    const closed = !!opts.curveClosed;
    const paths = curvePathsFromPoints(cpts, W, H, closed);
    if (!paths) {
      const fallback = scaleCatalogPath('M 10 70 C 10 20 45 20 50 50 C 55 80 90 20 90 30', W, H, margin);
      return wrap(
        `<path d="${fallback}" fill="none" stroke="${lineStroke}" stroke-width="${lineSw}"${dash} stroke-linecap="round"/>`
      );
    }
    // Curves stay stroke-first (catalog noFill), but an explicit fill color still paints.
    const rawFill = opts.fill;
    const hasFillCurve = !!(rawFill && rawFill !== 'none' && rawFill !== 'transparent');
    const fillPat = CURVE_FILL_PATTERNS.includes(opts.fillPattern) ? opts.fillPattern : 'solid';
    const fillPainted = hasFillCurve
      ? curveFillPatternPaint(fillPat, rawFill, opts.uid)
      : { defs: '', paint: 'none' };
    const solidStroke = !isDouble && !isComplex && (!style || style === 'solid');
    // End markers on open curves — same as line: solid / dashed / dotted (not wave/zigzag/double).
    const mk =
      !closed && !isDouble && !isComplex ? lineMarkerAttrs(opts, lineStroke) : { defs: '', attrs: '' };
    const mkDefs = `${fillPainted.defs}${mk.defs ? mk.defs : ''}`;
    const mkDefsWrap = mkDefs ? `<defs>${mkDefs}</defs>` : '';
    const cap = mk.attrs ? 'butt' : 'round';
    // Uniform thickness → real cubic path (smooth). Segmented stroke when node widths differ.
    // Markers used to disable taper; keep taper and hang markers on tiny tip stubs instead.
    const wantsVariable = solidStroke && curveHasVariableWidth(cpts, lineSw);
    const variableStroke = wantsVariable
      ? curveVariableStroke(cpts, W, H, lineSw, closed, lineStroke)
      : '';
    const tipPaths = wantsVariable && mk.attrs ? curveMarkerTipPaths(cpts, W, H) : null;
    const fromMk = opts.lineFromMarker || 'none';
    const toMk = opts.lineToMarker || 'none';
    const uidSafe = String(opts.uid || 'ln').replace(/[^a-zA-Z0-9_-]/g, '_');
    const tipMarkerHtml =
      tipPaths && mk.defs
        ? (() => {
            const sw0 = Math.max(0.5, curveNodeWidth(cpts, 0, lineSw));
            const swN = Math.max(0.5, curveNodeWidth(cpts, cpts.length - 1, lineSw));
            const startAttr =
              fromMk !== 'none' ? ` marker-start="url(#lm_${uidSafe}_f)"` : '';
            const endAttr = toMk !== 'none' ? ` marker-end="url(#lm_${uidSafe}_t)"` : '';
            return (
              (startAttr
                ? `<path d="${tipPaths.startD}" fill="none" stroke="${lineStroke}" stroke-width="${sw0}" stroke-opacity="0" stroke-linecap="butt"${startAttr}/>`
                : '') +
              (endAttr
                ? `<path d="${tipPaths.endD}" fill="none" stroke="${lineStroke}" stroke-width="${swN}" stroke-opacity="0" stroke-linecap="butt"${endAttr}/>`
                : '')
            );
          })()
        : '';
    const fillPath = hasFillCurve
      ? `<path d="${paths.fillD}" fill="${fillPainted.paint}"${op} stroke="none"/>`
      : '';
    if (hasFillCurve && variableStroke) {
      return wrap(
        `${mkDefsWrap}${fillPath}${variableStroke}${tipMarkerHtml}`,
        defs || ''
      );
    }
    if (variableStroke) return wrap(`${mkDefsWrap}${variableStroke}${tipMarkerHtml}`);
    const curveSw = Math.max(0.5, curveNodeWidth(cpts, 0, lineSw));
    if (hasFillCurve && curveSw > 0) {
      return wrap(
        `${mkDefsWrap}${fillPath}` +
          `<path d="${paths.strokeD}" fill="none" stroke="${lineStroke}" stroke-width="${curveSw}"${dash} stroke-linecap="${cap}" stroke-linejoin="round"${mk.attrs}/>`
      );
    }
    if (hasFillCurve) return wrap(`${mkDefsWrap}${fillPath}`);
    return wrap(
      `${mkDefsWrap}<path d="${paths.strokeD}" fill="none" stroke="${lineStroke}" stroke-width="${curveSw}"${dash} stroke-linecap="${cap}" stroke-linejoin="round"${mk.attrs}/>`
    );
  }

  if (id === 'noSymbol' || meta?.special === 'noSymbol') {
    const dRing = ringPath(W / 2, H / 2, ew / 2, eh / 2, opts.ringInner);
    if (hasStroke && isDouble) {
      const gapFill = fill === 'transparent' || fill === 'none' ? '#ffffff' : fill;
      return wrap(
        `<path d="${dRing}" fill="${fill}"${op} fill-rule="evenodd" stroke="${stroke}" stroke-width="${sw * 3}"/>` +
          `<path d="${dRing}" fill="none" fill-rule="evenodd" stroke="${gapFill}" stroke-width="${sw * 1.4}"/>`
      );
    }
    if (hasStroke && isComplex) {
      return wrap(
        `<path d="${dRing}" fill="${fill}"${op} fill-rule="evenodd" stroke="none"/>` +
          `<path d="${complexOutlinePath(style, 8, W, H)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    }
    return wrap(`<path d="${dRing}" fill="${fill}"${op} fill-rule="evenodd" ${strokeAttr}/>`);
  }

  if (id === 'line' || (noFill && meta?.path === 'M 5 50 L 95 50')) {
    const mk = !isComplex && !isDouble ? lineMarkerAttrs(opts, lineStroke) : { defs: '', attrs: '' };
    const cap = mk.attrs ? 'butt' : 'round';
    const y = H / 2;
    const geom = lineGeomMarkSvg(opts, lineStroke, lineSw, W, H);
    if (isDouble) {
      const gap = lineSw * 2.2;
      return wrap(
        `<line x1="0" y1="${y - gap / 2}" x2="${W}" y2="${y - gap / 2}" stroke="${lineStroke}" stroke-width="${lineSw}" stroke-linecap="round"/>` +
          `<line x1="0" y1="${y + gap / 2}" x2="${W}" y2="${y + gap / 2}" stroke="${lineStroke}" stroke-width="${lineSw}" stroke-linecap="round"/>` +
          geom,
        ''
      );
    }
    if (style === 'wave') {
      return wrap(
        `<path d="${waveAlongLine(lineSw, W, H)}" fill="none" stroke="${lineStroke}" stroke-width="${lineSw}" stroke-linecap="round" stroke-linejoin="round"/>` +
          geom,
        ''
      );
    }
    if (style === 'zigzag') {
      return wrap(
        `<path d="${zigzagAlongLine(lineSw, W, H)}" fill="none" stroke="${lineStroke}" stroke-width="${lineSw}" stroke-linecap="round" stroke-linejoin="round"/>` +
          geom,
        ''
      );
    }
    const mkDefs = mk.defs ? `<defs>${mk.defs}</defs>` : '';
    return wrap(
      `${mkDefs}<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${lineStroke}" stroke-width="${lineSw}"${dash} stroke-linecap="${cap}"${mk.attrs}/>${geom}`,
      ''
    );
  }

  const pathRx = noFill || meta?.special === 'curve' || meta?.special === 'gear' ? 0 : rxPx;
  const path =
    resolvePath(id, meta, opts, W, H, margin, pathRx) ||
    (meta && meta.path ? applyCornerRx(scaleCatalogPath(meta.path, W, H, margin), pathRx) : null);

  if (path) {
    if (noFill || meta?.special === 'curve') {
      if (isDouble) {
        const gap = lineSw * 2.2;
        return wrap(
          `<path d="${path}" fill="none" stroke="${lineStroke}" stroke-width="${lineSw}" stroke-linecap="round" transform="translate(0,${(-gap / 2).toFixed(1)})"/>` +
            `<path d="${path}" fill="none" stroke="${lineStroke}" stroke-width="${lineSw}" stroke-linecap="round" transform="translate(0,${(gap / 2).toFixed(1)})"/>`,
          ''
        );
      }
      return wrap(
        `<path d="${path}" fill="none" stroke="${lineStroke}" stroke-width="${lineSw}"${dash} stroke-linecap="round"/>`,
        ''
      );
    }
    const fillRule = id === 'gear' || meta?.special === 'gear' ? ' fill-rule="evenodd"' : '';
    if (hasStroke && isDouble) {
      const gapFill = fill === 'transparent' || fill === 'none' ? '#ffffff' : fill;
      return wrap(
        `<path d="${path}" fill="${fill}"${op}${fillRule} stroke="${stroke}" stroke-width="${sw * 3}"/>` +
          `<path d="${path}" fill="none"${fillRule} stroke="${gapFill}" stroke-width="${sw * 1.4}"/>`
      );
    }
    if (hasStroke && isComplex) {
      const outline = complexOutlinePath(style, 6, W, H);
      return wrap(
        `<path d="${path}" fill="${fill}"${op}${fillRule} stroke="none"/>` +
          `<path d="${outline}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    }
    return wrap(`<path d="${path}" fill="${fill}"${op}${fillRule} ${strokeAttr}/>`);
  }

  if (hasStroke && isDouble) {
    const gapFill = fill === 'transparent' || fill === 'none' ? '#ffffff' : fill;
    return wrap(
      `<rect x="${margin}" y="${margin}" width="${ew}" height="${eh}" rx="${rxPx}" fill="${fill}"${op} stroke="${stroke}" stroke-width="${sw * 3}"/>` +
        `<rect x="${margin}" y="${margin}" width="${ew}" height="${eh}" rx="${rxPx}" fill="none" stroke="${gapFill}" stroke-width="${sw * 1.4}"/>`
    );
  }
  if (hasStroke && isComplex) {
    return wrap(
      `<rect x="${margin + 3}" y="${margin + 3}" width="${Math.max(1, ew - 6)}" height="${Math.max(1, eh - 6)}" rx="${Math.max(0, rxPx - 2)}" fill="${fill}"${op} stroke="none"/>` +
        `<path d="${complexOutlinePath(style, 5, W, H)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }
  return wrap(
    `<rect x="${margin}" y="${margin}" width="${ew}" height="${eh}" rx="${rxPx}" fill="${fill}"${op} ${strokeAttr}/>`
  );
}

export function shapeOptsFromEl(el) {
  if (!el) return {};
  const meta = getShapeMeta(el.shape || el.shapeId || 'rect');
  const sw = el.sw != null ? el.sw : 2;
  return {
    fill: el.fill && el.fill !== 'none' ? el.fill : 'transparent',
    stroke: el.stroke || 'none',
    strokeWidth: sw,
    sw,
    strokeStyle: el.strokeStyle || 'solid',
    fillGrad: el.fillGrad || null,
    fillGrad2: el.fillGrad2 || null,
    fillGradDir: el.fillGradDir != null ? el.fillGradDir : 90,
    fillOp: el.fillOp != null ? el.fillOp : 1,
    rx: el.rx != null ? el.rx : 0,
    w: el.w != null ? +el.w : 100,
    h: el.h != null ? +el.h : 100,
    sides: el.polySides != null ? el.polySides : el.sides,
    polySides: el.polySides != null ? el.polySides : el.sides,
    starRays: el.starRays,
    starInner: el.starInner,
    trapTop: el.trapTop,
    trapBot: el.trapBot,
    paraSkew: el.paraSkew,
    chevSkew: el.chevSkew,
    chevInner: el.chevInner,
    arrowHead: el.arrowHead,
    moonPhase: el.moonPhase,
    ringInner: el.ringInner,
    gearTeeth: el.gearTeeth,
    gearDepth: el.gearDepth,
    arcMode: el.arcMode || 'full',
    arcStart: el.arcStart,
    arcEnd: el.arcEnd,
    tailX: el.tailX,
    tailY: el.tailY,
    tailRoundX: el.tailRoundX,
    tailRoundY: el.tailRoundY,
    tailWFrac: el.tailWFrac,
    calloutForm: el.calloutForm,
    curvePoints: el.curvePoints,
    curveClosed: el.curveClosed,
    fillPattern: el.fillPattern || 'solid',
    shapePts: Array.isArray(el.shapePts) && el.shapePts.length >= 3 ? el.shapePts : null,
    cloudSeed: el.cloudSeed,
    cloudForm: el.cloudForm,
    cloudCircles: el.cloudCircles,
    cloudCirclesForm: el.cloudCirclesForm,
    cloudRefW: el.cloudRefW,
    cloudRefH: el.cloudRefH,
    cloudFramed: el.cloudFramed,
    noFill: !!(el.noFill || meta?.noFill),
    lineFromMarker: el.lineFromMarker || 'none',
    lineToMarker: el.lineToMarker || 'none',
    lineMark: el.lineMark || 'none',
    fillImg: el.fillImg && el.fillImgShow !== false ? el.fillImg : null,
    fillImgX: el.fillImgX,
    fillImgY: el.fillImgY,
    fillImgW: el.fillImgW,
    fillImgH: el.fillImgH,
    fillImgRot: el.fillImgRot,
    uid: el.id,
  };
}

export function buildShapeSVG(id, d) {
  const shapeId = typeof id === 'string' ? id : id?.shape || id?.shapeId || 'rect';
  const el = d && typeof d === 'object' ? d : typeof id === 'object' ? id : { shape: shapeId };
  return buildBasicShapeSVG(shapeId, shapeOptsFromEl({ ...el, shape: el.shape || shapeId }));
}

/** Stable import surface for exportHTML / playback. */
export function shapeSvgForExport(el) {
  if (!el) return '';
  return buildBasicShapeSVG(el.shape || el.shapeId || 'rect', shapeOptsFromEl(el));
}

export default { buildShapeSVG, buildBasicShapeSVG, shapeViewBox, shapeSvgForExport, shapeOptsFromEl, shapeRxPx };
