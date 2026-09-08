/**
 * Bucket fill for ink strokes (ported from js/48-drawing.js).
 * Accepts React stroke points as [x,y] or {x,y}.
 */

import {
  brushStamps,
  fillBrushStamps,
  hardStrokeGeom,
  isBrushFamily,
  paintNeonStamps,
} from './inkBrush.js';

function f3(n) {
  return Math.round(n * 1000) / 1000;
}

export function ptXY(p) {
  if (!p) return { x: 0, y: 0 };
  if (Array.isArray(p)) return { x: +p[0] || 0, y: +p[1] || 0 };
  return { x: +p.x || 0, y: +p.y || 0 };
}

function polyArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function pointInPoly(pts, x, y) {
  if (!pts || pts.length < 3) return false;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    const inter = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (inter) inside = !inside;
  }
  return inside;
}

function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-8) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function fillHitsEraser(fill, x, y, radius) {
  if (!fill?.points || fill.points.length < 3) return false;
  if (pointInPoly(fill.points, x, y)) return true;
  const pts = fill.points;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (distToSeg(x, y, a.x, a.y, b.x, b.y) <= radius) return true;
  }
  return false;
}

/** Rasterize stroke like v7.1 `_drawStroke` so the fill barrier matches visible ink. */
function drawStrokeOnMask(ctx, stroke) {
  if (!stroke?.points?.length || !ctx) return;
  const sw = Math.max(2, +stroke.width || 4);
  const fat = Object.assign({}, stroke, {
    width: sw,
    opacity: 1,
    pressure: false,
  });
  const color = '#000000';
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  try {
    if (isBrushFamily(fat.tool)) {
      const stamps = brushStamps(fat, 1, 1);
      if (fat.tool === 'neon') paintNeonStamps(ctx, stamps, color, fat, 1);
      else {
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        fillBrushStamps(ctx, stamps);
      }
    } else {
      const g = hardStrokeGeom(
        fat.tool === 'marker' ? Object.assign({}, fat, { pressure: false }) : fat,
        1,
        1
      );
      if (!g) {
        ctx.restore();
        return;
      }
      ctx.globalAlpha = 1;
      if (g.circle) {
        ctx.beginPath();
        ctx.arc(g.circle.cx, g.circle.cy, Math.max(0.04, g.circle.r), 0, Math.PI * 2);
        ctx.fill();
      } else if (g.d) {
        ctx.lineWidth = g.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(new Path2D(g.d));
      }
    }
  } catch (e) {
    /* ignore mask paint errors */
  }
  ctx.restore();
}

function buildFillMask(ink, slideW, slideH, clickX, clickY) {
  const scale = 1;
  let minX = 0;
  let minY = 0;
  let maxX = slideW;
  let maxY = slideH;
  let widthSum = 0;
  let widthN = 0;
  (ink || []).forEach((s) => {
    if (!s?.points?.length) return;
    const sw = Math.max(2, +s.width || 4);
    widthSum += sw;
    widthN++;
    const half = sw;
    s.points.forEach((raw) => {
      const p = ptXY(raw);
      if (p.x - half < minX) minX = p.x - half;
      if (p.y - half < minY) minY = p.y - half;
      if (p.x + half > maxX) maxX = p.x + half;
      if (p.y + half > maxY) maxY = p.y + half;
    });
  });
  if (clickX != null && clickY != null) {
    minX = Math.min(minX, clickX);
    minY = Math.min(minY, clickY);
    maxX = Math.max(maxX, clickX);
    maxY = Math.max(maxY, clickY);
  }
  const margin = Math.max(28, (widthN ? widthSum / widthN : 6) * 2.5);
  minX = Math.floor(minX - margin);
  minY = Math.floor(minY - margin);
  maxX = Math.ceil(maxX + margin);
  maxY = Math.ceil(maxY + margin);

  let ox = minX;
  let oy = minY;
  let mw = Math.max(8, maxX - minX);
  let mh = Math.max(8, maxY - minY);
  const maxDim = Math.max(Math.max(slideW, slideH) * 4, 4096);
  if (mw > maxDim || mh > maxDim) {
    const cx = clickX != null ? clickX : slideW / 2;
    const cy = clickY != null ? clickY : slideH / 2;
    mw = Math.min(mw, maxDim);
    mh = Math.min(mh, maxDim);
    ox = Math.floor(cx - mw / 2);
    oy = Math.floor(cy - mh / 2);
    if (ox > 0) ox = 0;
    if (oy > 0) oy = 0;
    if (ox + mw < slideW) ox = slideW - mw;
    if (oy + mh < slideH) oy = slideH - mh;
  }

  const w = Math.max(8, Math.ceil(mw * scale));
  const h = Math.max(8, Math.ceil(mh * scale));
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-ox, -oy);
  (ink || []).forEach((s) => drawStrokeOnMask(ctx, s));
  ctx.restore();
  const data = ctx.getImageData(0, 0, w, h).data;
  const barrier = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    barrier[i] = data[o] < 180 || data[o + 1] < 180 || data[o + 2] < 180 ? 1 : 0;
  }
  return { barrier, w, h, scale, avgW: widthN ? widthSum / widthN : 6, ox, oy };
}

function inkEndpoints(ink) {
  const ends = [];
  (ink || []).forEach((s, si) => {
    const raw = s?.points || [];
    if (raw.length < 2) return;
    const hw = Math.max(2, (+s.width || 4) * 0.55);
    const a = ptXY(raw[0]);
    const b = ptXY(raw[raw.length - 1]);
    ends.push({ x: a.x, y: a.y, hw, si });
    ends.push({ x: b.x, y: b.y, hw, si });
  });
  return ends;
}

function stampLineMask(barrier, w, h, x0, y0, x1, y1, radius) {
  const r = Math.max(1, radius | 0);
  const r2 = r * r;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const steps = Math.max(1, Math.ceil(len));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const cx = x0 + dx * t;
    const cy = y0 + dy * t;
    const ix = Math.round(cx);
    const iy = Math.round(cy);
    const xA = Math.max(0, ix - r);
    const xB = Math.min(w - 1, ix + r);
    const yA = Math.max(0, iy - r);
    const yB = Math.min(h - 1, iy + r);
    for (let y = yA; y <= yB; y++) {
      for (let x = xA; x <= xB; x++) {
        const ddx = x - cx;
        const ddy = y - cy;
        if (ddx * ddx + ddy * ddy <= r2) barrier[y * w + x] = 1;
      }
    }
  }
}

function floodTouchesBorder(filled, w, h) {
  for (let x = 0; x < w; x++) {
    if (filled[x] || filled[(h - 1) * w + x]) return true;
  }
  for (let y = 0; y < h; y++) {
    if (filled[y * w] || filled[y * w + (w - 1)]) return true;
  }
  return false;
}

function findFillSeed(barrier, w, h, sx, sy, maxR = 48) {
  sx |= 0;
  sy |= 0;
  if (sx >= 0 && sy >= 0 && sx < w && sy < h && !barrier[sy * w + sx]) return { x: sx, y: sy };
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = sx + dx;
        const y = sy + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        if (!barrier[y * w + x]) return { x, y };
      }
    }
  }
  return null;
}

function floodFillMask(barrier, w, h, sx, sy) {
  const seed = findFillSeed(barrier, w, h, sx, sy, 48);
  if (!seed) return null;
  sx = seed.x;
  sy = seed.y;
  const start = sy * w + sx;
  const filled = new Uint8Array(w * h);
  const stack = [start];
  let count = 0;
  const max = (w * h * 0.85) | 0;
  while (stack.length) {
    const i = stack.pop();
    if (i < 0 || i >= w * h || filled[i] || barrier[i]) continue;
    filled[i] = 1;
    count++;
    if (count > max) return { filled, count, open: true, runaway: true };
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i + w < w * h) stack.push(i + w);
  }
  if (count < 8) return null;
  return { filled, count, open: !!floodTouchesBorder(filled, w, h) };
}

function tryClosedFlood(barrier, w, h, sx, sy) {
  const flood = floodFillMask(barrier, w, h, sx, sy);
  if (!flood || flood.open || flood.runaway) return null;
  return flood;
}

function sealWithEndpointBridges(baseBarrier, w, h, scale, gapPx, sx, sy, ox, oy, ink) {
  const ends = inkEndpoints(ink);
  if (ends.length < 2) return null;
  const pairs = [];
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      const d = Math.hypot(ends[i].x - ends[j].x, ends[i].y - ends[j].y);
      if (d < 0.75 || d > gapPx) continue;
      pairs.push({ i, j, d, same: ends[i].si === ends[j].si ? 0 : 1 });
    }
  }
  if (!pairs.length) return null;
  pairs.sort((a, b) => a.same - b.same || a.d - b.d);

  const stamp = (barrier, a, b) => {
    const rad = Math.max(a.hw, b.hw, 2.5) * scale;
    stampLineMask(
      barrier,
      w,
      h,
      (a.x - ox) * scale,
      (a.y - oy) * scale,
      (b.x - ox) * scale,
      (b.y - oy) * scale,
      rad
    );
  };

  for (let pi = 0; pi < pairs.length; pi++) {
    const barrier = new Uint8Array(baseBarrier);
    stamp(barrier, ends[pairs[pi].i], ends[pairs[pi].j]);
    const flood = tryClosedFlood(barrier, w, h, sx, sy);
    if (flood) return { barrier, flood, bridges: 1 };
  }

  const barrier = new Uint8Array(baseBarrier);
  const used = new Set();
  let bridges = 0;
  for (let pi = 0; pi < pairs.length; pi++) {
    const p = pairs[pi];
    if (used.has(p.i) || used.has(p.j)) continue;
    stamp(barrier, ends[p.i], ends[p.j]);
    used.add(p.i);
    used.add(p.j);
    bridges++;
    const flood = tryClosedFlood(barrier, w, h, sx, sy);
    if (flood) return { barrier, flood, bridges };
  }
  return null;
}

function isFillBoundary(filled, w, h, i) {
  if (!filled[i]) return false;
  const x = i % w;
  const y = (i / w) | 0;
  if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return true;
  return !(filled[i - 1] && filled[i + 1] && filled[i - w] && filled[i + w]);
}

function traceMaskContour(filled, w, h) {
  let start = -1;
  for (let i = 0; i < w * h; i++) {
    if (filled[i] && isFillBoundary(filled, w, h, i)) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  const dx = [0, 1, 1, 1, 0, -1, -1, -1];
  const dy = [-1, -1, 0, 1, 1, 1, 0, -1];
  const pts = [];
  let x = start % w;
  let y = (start / w) | 0;
  let dir = 0;
  const sx0 = x;
  const sy0 = y;
  for (let guard = 0; guard < w * h * 4; guard++) {
    pts.push({ x, y });
    let found = false;
    for (let k = 0; k < 8; k++) {
      const nd = (dir + 6 + k) & 7;
      const nx = x + dx[nd];
      const ny = y + dy[nd];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (filled[ni] && isFillBoundary(filled, w, h, ni)) {
        x = nx;
        y = ny;
        dir = nd;
        found = true;
        break;
      }
    }
    if (!found) {
      for (let k = 0; k < 8; k++) {
        const nd = (dir + 6 + k) & 7;
        const nx = x + dx[nd];
        const ny = y + dy[nd];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (filled[ny * w + nx]) {
          x = nx;
          y = ny;
          dir = nd;
          found = true;
          break;
        }
      }
    }
    if (!found) break;
    if (pts.length > 2 && x === sx0 && y === sy0) break;
  }
  return pts.length < 6 ? null : pts;
}

function resampleClosed(pts, spacing) {
  if (!pts || pts.length < 3) return pts || [];
  spacing = Math.max(1.2, spacing || 3);
  const n = pts.length;
  const seg = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    seg.push(d);
    total += d;
  }
  if (total < spacing * 3) return pts.slice();
  const count = Math.max(12, Math.round(total / spacing));
  const step = total / count;
  const out = [];
  let i = 0;
  let acc = 0;
  for (let k = 0; k < count; k++) {
    const target = k * step;
    while (i < n && acc + seg[i] < target - 1e-6) {
      acc += seg[i];
      i++;
    }
    const s = seg[i % n] || 1;
    const t = Math.max(0, Math.min(1, (target - acc) / s));
    const a = pts[i % n];
    const b = pts[(i + 1) % n];
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

function laplacianSmooth(pts, passes, lambda) {
  if (!pts || pts.length < 4) return pts || [];
  let cur = pts;
  const lam = lambda == null ? 0.42 : lambda;
  const nPass = passes || 4;
  for (let p = 0; p < nPass; p++) {
    const n = cur.length;
    const next = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = cur[(i - 1 + n) % n];
      const b = cur[i];
      const c = cur[(i + 1) % n];
      next[i] = {
        x: b.x + lam * ((a.x + c.x) * 0.5 - b.x),
        y: b.y + lam * ((a.y + c.y) * 0.5 - b.y),
      };
    }
    cur = next;
  }
  return cur;
}

function smoothContour(pts, passes) {
  if (!pts || pts.length < 4) return pts || [];
  let out = pts.slice();
  const nPass = passes || 3;
  for (let p = 0; p < nPass; p++) {
    const next = [];
    const n = out.length;
    for (let i = 0; i < n; i++) {
      const a = out[i];
      const b = out[(i + 1) % n];
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    if (p % 2 === 1 && next.length > 120) {
      const dec = [];
      for (let i = 0; i < next.length; i += 2) dec.push(next[i]);
      out = dec;
    } else out = next;
  }
  return out;
}

function refineFillContour(pts) {
  if (!pts || pts.length < 6) return pts || [];
  let c = resampleClosed(pts, 2.0);
  c = laplacianSmooth(c, 3, 0.3);
  c = smoothContour(c, 2);
  c = resampleClosed(c, 2.5);
  c = laplacianSmooth(c, 2, 0.22);
  return c;
}

function inflateContour(pts, px) {
  if (!pts || pts.length < 3 || !px) return pts;
  const n = pts.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const tx = p2.x - p0.x;
    const ty = p2.y - p0.y;
    const len = Math.hypot(tx, ty) || 1;
    out[i] = { x: p1.x + (-ty / len) * px, y: p1.y + (tx / len) * px };
  }
  if (Math.abs(polyArea(out)) < Math.abs(polyArea(pts))) {
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const tx = p2.x - p0.x;
      const ty = p2.y - p0.y;
      const len = Math.hypot(tx, ty) || 1;
      out[i] = { x: p1.x + (ty / len) * px, y: p1.y + (-tx / len) * px };
    }
  }
  return out;
}

function contourToPath(pts) {
  if (!pts?.length) return '';
  let d = `M${f3(pts[0].x)},${f3(pts[0].y)}`;
  for (let i = 1; i < pts.length; i++) d += `L${f3(pts[i].x)},${f3(pts[i].y)}`;
  return `${d}Z`;
}

export function contourToSmoothPath(pts) {
  if (!pts || pts.length < 3) return '';
  if (pts.length < 6) return contourToPath(pts);
  const n = pts.length;
  let d = `M${f3(pts[0].x)},${f3(pts[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${f3(c1x)},${f3(c1y)} ${f3(c2x)},${f3(c2y)} ${f3(p2.x)},${f3(p2.y)}`;
  }
  return `${d}Z`;
}

/**
 * @returns {{ id?: string, color: string, opacity: number, pattern: string, d: string, points: {x,y}[], gapUsed: number } | null}
 */
export function bucketFillAt(x, y, opts = {}) {
  const ink = opts.ink || [];
  const slideW = Math.max(8, +opts.canvasW || 1920);
  const slideH = Math.max(8, +opts.canvasH || 1080);
  const gap = [0, 10, 20, 30, 50].includes(+opts.fillGap) ? +opts.fillGap : 10;
  const color = opts.color || '#64748b';
  const opacity = Math.max(0.05, Math.min(1, (opts.fillOpacity != null ? +opts.fillOpacity : 55) / 100));
  const pattern = opts.fillPattern || 'solid';

  let mask = buildFillMask(ink, slideW, slideH, x, y);
  const sx0 = Math.round((x - mask.ox) * mask.scale);
  const sy0 = Math.round((y - mask.oy) * mask.scale);
  let flood = tryClosedFlood(mask.barrier, mask.w, mask.h, sx0, sy0);
  let usedGap = 0;

  if (!flood && gap > 0) {
    const sealed = sealWithEndpointBridges(
      mask.barrier,
      mask.w,
      mask.h,
      mask.scale,
      gap,
      sx0,
      sy0,
      mask.ox,
      mask.oy,
      ink
    );
    if (sealed) {
      flood = sealed.flood;
      usedGap = gap;
    }
  }
  if (!flood) return null;

  let contour = traceMaskContour(flood.filled, mask.w, mask.h);
  if (!contour) return null;
  contour = contour.map((p) => ({
    x: p.x / mask.scale + mask.ox,
    y: p.y / mask.scale + mask.oy,
  }));
  contour = refineFillContour(contour);

  const avgW = mask.avgW || 6;
  const inflate = Math.max(0.9, Math.min(avgW * 0.2, avgW * 0.4));
  contour = inflateContour(contour, inflate);
  contour = laplacianSmooth(contour, 1, 0.22);
  contour = resampleClosed(contour, 2.8);

  const d = contourToSmoothPath(contour);
  if (!d) return null;

  return {
    color,
    colorScheme: opts.colorScheme || null,
    opacity,
    pattern: ['solid', 'fadeOut', 'fadeIn', 'lines', 'hatch', 'dots'].includes(pattern)
      ? pattern
      : 'solid',
    d,
    points: contour,
    gapUsed: usedGap,
  };
}

/** SVG markup for ink fills (solid + hatch patterns). */
export function inkFillsSvgMarkup(fills) {
  if (!fills?.length) return '';
  let defs = '';
  let body = '';
  fills.forEach((fill) => {
    if (!fill?.d) return;
    const col = fill.color || '#64748b';
    const op = fill.opacity != null ? Math.max(0, Math.min(1, +fill.opacity)) : 0.55;
    const pat = fill.pattern || 'solid';
    const uid = String(fill.id || Math.random().toString(36).slice(2)).replace(/"/g, '');
    const opAttr = op < 1 ? ` opacity="${op}"` : '';
    let paint = col;
    if (pat === 'lines' || pat === 'hatch' || pat === 'dots') {
      const id = `efp-${uid}`;
      if (pat === 'lines') {
        defs += `<pattern id="${id}" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)"><line x1="0" y1="1" x2="8" y2="1" stroke="${col}" stroke-width="2"/></pattern>`;
      } else if (pat === 'hatch') {
        defs += `<pattern id="${id}" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="${col}" stroke-width="2"/><line x1="0" y1="0" x2="10" y2="0" stroke="${col}" stroke-width="2"/></pattern>`;
      } else {
        defs += `<pattern id="${id}" patternUnits="userSpaceOnUse" width="10" height="10"><circle cx="2.5" cy="2.5" r="1.6" fill="${col}"/></pattern>`;
      }
      paint = `url(#${id})`;
    }
    // fadeIn/fadeOut render as solid in React v1 (full fade filters later)
    body += `<path data-ink-id="${uid}" data-ink-kind="fill" data-ink-op="${op}" d="${fill.d}" fill="${paint}" stroke="none"${opAttr}/>`;
  });
  return (defs ? `<defs>${defs}</defs>` : '') + body;
}
