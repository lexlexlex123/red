/** Ink hit-test + selection helpers (ported from js/48-drawing.js). */

import { normalizeInkPoints } from './inkBrush.js';
import { pointInPoly } from './inkFill.js';

function distToSeg(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-8) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * abx + (py - ay) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

function ptsBBox(pts, pad = 0) {
  if (!pts?.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  pts.forEach((p) => {
    const x = Array.isArray(p) ? +p[0] : +p.x;
    const y = Array.isArray(p) ? +p[1] : +p.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  if (!Number.isFinite(minX)) return null;
  return {
    x: minX - pad,
    y: minY - pad,
    w: Math.max(1, maxX - minX + pad * 2),
    h: Math.max(1, maxY - minY + pad * 2),
  };
}

export function strokeHits(stroke, x, y, radius) {
  const pts = normalizeInkPoints(stroke?.points);
  if (!pts.length) return false;
  for (let i = 0; i < pts.length; i++) {
    if (Math.hypot(pts[i].x - x, pts[i].y - y) <= radius) return true;
    if (i > 0 && distToSeg(x, y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) <= radius) return true;
  }
  return false;
}

/** Top-most stroke or fill under point (fills under strokes unless stroke is far). */
export function pickInkAt(x, y, ink = [], fills = []) {
  let fillHit = null;
  for (let i = fills.length - 1; i >= 0; i--) {
    const f = fills[i];
    if (f?.points && pointInPoly(f.points, x, y)) {
      fillHit = f;
      break;
    }
  }
  for (let i = ink.length - 1; i >= 0; i--) {
    const s = ink[i];
    if (!s) continue;
    const r = Math.max(8, (+s.width || 4) * 0.5 + 10);
    if (strokeHits(s, x, y, r)) {
      if (fillHit) {
        const tight = Math.max(4, (+s.width || 4) * 0.55 + 2);
        if (!strokeHits(s, x, y, tight)) return fillHit;
      }
      return s;
    }
  }
  return fillHit;
}

export function strokeBBox(stroke) {
  const pad = Math.max(4, (+stroke?.width || 4) * 0.5 + 2);
  return ptsBBox(normalizeInkPoints(stroke?.points), pad);
}

export function fillBBox(fill) {
  return ptsBBox(fill?.points || [], 2);
}

export function inkIntersectsRect(item, L, T, R, B) {
  if (!item) return false;
  const bb = item.tool != null ? strokeBBox(item) : fillBBox(item);
  if (!bb) return false;
  return bb.x < R && bb.x + bb.w > L && bb.y < B && bb.y + bb.h > T;
}

/** Expand selection to all ink sharing groupId with any selected item. */
export function expandInkGroupIds(slide, ids) {
  const set = new Set((ids || []).map(String).filter(Boolean));
  if (!set.size || !slide) return [...set];
  const gids = new Set();
  const all = [...(slide.ink || []), ...(slide.inkFills || [])];
  all.forEach((it) => {
    if (it?.id != null && set.has(String(it.id)) && it.groupId) gids.add(it.groupId);
  });
  if (!gids.size) return [...set];
  all.forEach((it) => {
    if (it?.id != null && it.groupId && gids.has(it.groupId)) set.add(String(it.id));
  });
  return [...set];
}

export function inkSelHaloPath(stroke) {
  const pts = normalizeInkPoints(stroke?.points);
  if (!pts.length) return '';
  if (pts.length === 1) {
    const p = pts[0];
    return `M${p.x},${p.y}L${p.x + 0.01},${p.y}`;
  }
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
}

export function inkSelHaloWidth(stroke) {
  return Math.max(6, (+stroke?.width || 4) + 10);
}

export function isInkFill(item) {
  return !!(item && item.tool == null && (item.d || item.pattern || item.points));
}

export function findInkById(slide, id) {
  if (!slide || id == null) return null;
  const sid = String(id);
  const stroke = (slide.ink || []).find((s) => s && String(s.id) === sid);
  if (stroke) return { kind: 'stroke', item: stroke };
  const fill = (slide.inkFills || []).find((f) => f && String(f.id) === sid);
  if (fill) return { kind: 'fill', item: fill };
  return null;
}

export function inkSelectionHaloMarkup(slide, selInkIds, accent = '#3b82f6') {
  if (!slide || !selInkIds?.length) return '';
  const set = new Set(selInkIds.map(String));
  const parts = [];
  (slide.inkFills || []).forEach((f) => {
    if (!f || !set.has(String(f.id)) || !f.d) return;
    parts.push(
      `<path class="ink-sel-halo" d="${f.d}" fill="none" stroke="${accent}" stroke-width="3" stroke-dasharray="6 4" opacity="0.75" style="pointer-events:none"/>`
    );
  });
  (slide.ink || []).forEach((s) => {
    if (!s || !set.has(String(s.id))) return;
    const d = inkSelHaloPath(s);
    if (!d) return;
    const sw = inkSelHaloWidth(s);
    parts.push(
      `<path class="ink-sel-halo" d="${d}" fill="none" stroke="${accent}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" opacity="0.4" style="pointer-events:none"/>`
    );
  });
  return parts.join('');
}
