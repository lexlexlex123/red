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
    mw = '3.1';
    mh = '3.5';
    refX = atStart ? '0.217' : '2.771';
    refY = '1.6';
    const pathEnd =
      'M2.555,1.475 L2.555,1.475 Q2.771,1.600 2.555,1.725 L0.217,3.075 Q0.000,3.200 0.000,2.950 L0.000,0.250 Q0.000,0.000 0.217,0.125 Z';
    const pathStart =
      'M0.216,1.475 L0.216,1.475 Q0.000,1.600 0.216,1.725 L2.554,3.075 Q2.771,3.200 2.771,2.950 L2.771,0.250 Q2.771,0.000 2.554,0.125 Z';
    inner = `<path d="${atStart ? pathStart : pathEnd}" fill="${col}" stroke="none"/>`;
  } else if (type === 'square') {
    inner = `<rect x="0" y="0" width="3" height="3" rx="0.5" ry="0.5" fill="${col}" stroke="none"/>`;
  } else if (type === 'circle') {
    inner = `<circle cx="1.5" cy="1.5" r="1.3" fill="${col}" stroke="none"/>`;
  } else if (type === 'bar') {
    inner = `<path d="M1.5,0.2 L1.5,2.8" stroke="${col}" stroke-width="1" stroke-linecap="round" fill="none"/>`;
  } else if (type === 'cross') {
    orient = '0';
    inner =
      `<path d="M0.3,0.3 L2.7,2.7" stroke="${col}" stroke-width="1" stroke-linecap="round" fill="none"/>` +
      `<path d="M2.7,0.3 L0.3,2.7" stroke="${col}" stroke-width="1" stroke-linecap="round" fill="none"/>`;
  } else return '';
  return `<marker id="${id}" markerUnits="strokeWidth" orient="${orient}" markerWidth="${mw}" markerHeight="${mh}" refX="${refX}" refY="${refY}" fill="${col}" stroke="${col}">${inner}</marker>`;
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

function fillPaint(opts, uid) {
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
function roundedPolygonPath(pts, rx) {
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

function scaleCatalogPath(pathStr, w, h, margin) {
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

function trapezoidPts(W, H, m, trapTop, trapBot) {
  const ew = Math.max(1, W - m * 2);
  const eh = Math.max(1, H - m * 2);
  const t = Math.max(0, Math.min(0.49, +trapTop || 0));
  const b = Math.max(0, Math.min(0.49, +trapBot || 0));
  const tl = Math.min(ew * 0.49, t * ew);
  const bl = Math.min(ew * 0.49, b * ew);
  return [
    { x: m + tl, y: m },
    { x: m + ew - tl, y: m },
    { x: m + ew - bl, y: m + eh },
    { x: m + bl, y: m + eh },
  ];
}

function parallelogramPts(W, H, m, skewPct) {
  const ew = Math.max(1, W - m * 2);
  const eh = Math.max(1, H - m * 2);
  const sk = Math.max(-45, Math.min(45, +skewPct || 20));
  const off = Math.round((eh / 2) * Math.tan((sk * Math.PI) / 180));
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

function resolvePath(id, meta, opts, W, H, m, rx) {
  const special = meta?.special || id;
  if (special === 'rect' || special === 'ellipse' || id === 'circle') return null;
  if (special === 'triangle' || id === 'triangle') return ptsToPath(polygonPts(W, H, m, 3), rx);
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
  const margin = !isComplex && sw > 0 ? sw / 2 : 0;
  const op =
    opts.fillOp != null && opts.fillOp < 1 && opts.fillOp >= 0
      ? ` fill-opacity="${opts.fillOp}"`
      : '';
  const { fill, defId } = fillPaint(opts, opts.uid || id);
  const defs = gradDef(opts, defId);
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
    const a1 = opts.arcStart != null ? +opts.arcStart : 0;
    const a2 = opts.arcEnd != null ? +opts.arcEnd : 360;
    const mode = opts.arcMode || 'full';
    const isArc = mode !== 'full' && Math.abs(a2 - a1) < 360;
    if (isArc) {
      const dArc = arcPath(cx, cy, W / 2, H / 2, a1, a2, mode, margin, rxPx);
      return wrap(`<path d="${dArc}" fill="${fill}"${op} ${strokeAttr}/>`);
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
    const hasFillCurve = !noFill && fill && fill !== 'none' && fill !== 'transparent';
    if (hasFillCurve && sw > 0) {
      return wrap(
        `<path d="${paths.fillD}" fill="${fill}"${op} stroke="none"/>` +
          `<path d="${paths.strokeD}" fill="none" ${strokeAttr} stroke-linecap="round" stroke-linejoin="round"/>`
      );
    }
    if (hasFillCurve) return wrap(`<path d="${paths.fillD}" fill="${fill}"${op} stroke="none"/>`);
    return wrap(
      `<path d="${paths.strokeD}" fill="none" stroke="${lineStroke}" stroke-width="${lineSw}"${dash} stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }

  if (id === 'noSymbol' || meta?.special === 'noSymbol') {
    const s = Math.min(W, H) / 100;
    const nsw = 13 * s;
    return wrap(
      `<circle cx="${W / 2}" cy="${H / 2}" r="${42 * s}" fill="none" stroke="${lineStroke}" stroke-width="${nsw}"/>` +
        `<line x1="${80 * (W / 100)}" y1="${8 * (H / 100)}" x2="${20 * (W / 100)}" y2="${92 * (H / 100)}" stroke="${lineStroke}" stroke-width="${nsw}" stroke-linecap="butt"/>`,
      ''
    );
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
    moonPhase: el.moonPhase,
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
