/**
 * Corner-node editing for polygon-like shapes.
 * Points are stored on the element as shapePts: [{x,y}, ...] in 0..1 of the box.
 * Rounding (rx) and stroke/fill still apply via ptsToPath in buildBasicShapeSVG.
 */

import { getShapeMeta } from '../shared/shapesCatalog.js';
import { shapeCornerPtsNorm } from '../shared/shapes.js';
import { localToCanvas, canvasToLocal } from './shapeAdjHandles.js';

const NO_CORNER_SPECIALS = new Set([
  'ellipse',
  'circle',
  'line',
  'curve',
  'cloud',
  'moon',
  'gear',
  'callout',
  'noSymbol',
]);

export function shapeSupportsNodes(el) {
  if (!el) return false;
  if (el.type === 'text') return true;
  if (el.type !== 'shape') return false;
  const id = el.shape || 'rect';
  if (id === 'circle' || id === 'ellipse' || id === 'line') return false;
  const meta = getShapeMeta(id);
  const special = meta?.special || id;
  if (NO_CORNER_SPECIALS.has(special) || NO_CORNER_SPECIALS.has(id)) return false;
  if (meta?.noFill && special !== 'rect') return false;
  const pts = Array.isArray(el.shapePts) && el.shapePts.length >= 3
    ? el.shapePts
    : shapeCornerPtsNorm(id, el);
  return pts.length >= 3;
}

export function getShapeNodes(el) {
  if (!el) return [];
  if (Array.isArray(el.shapePts) && el.shapePts.length >= 3) {
    return el.shapePts.map((p) => ({
      x: clamp01(+p.x || 0),
      y: clamp01(+p.y || 0),
    }));
  }
  return shapeCornerPtsNorm(el.shape || 'rect', el);
}

export function listShapeNodeHandles(el) {
  const pts = getShapeNodes(el);
  if (!pts.length) return [];
  const W = Math.max(1, +el.w || 1);
  const H = Math.max(1, +el.h || 1);
  const hs = 6;
  return pts.map((p, i) => {
    const pos = localToCanvas(el, p.x * W - W / 2, p.y * H - H / 2);
    return {
      id: `sn-${i}`,
      idx: i,
      x: pos.x - hs,
      y: pos.y - hs,
      title: `Узел ${i + 1}`,
      cursor: 'move',
    };
  });
}

export function patchShapeNodeDrag(el, idx, canvasX, canvasY) {
  if (!el || idx == null) return null;
  const W = Math.max(1, +el.w || 1);
  const H = Math.max(1, +el.h || 1);
  const { lx, ly } = canvasToLocal(el, canvasX, canvasY);
  const next = getShapeNodes(el).map((p) => ({ x: p.x, y: p.y }));
  if (!next[idx]) return null;
  next[idx] = {
    x: clamp01((lx + W / 2) / W),
    y: clamp01((ly + H / 2) / H),
  };
  return { shapePts: next };
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
