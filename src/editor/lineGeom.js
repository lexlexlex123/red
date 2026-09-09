/**
 * Line segment geometry — ported from js/04-ui.js
 * (`_lineLocalEnds`, `_applyLineFromCanvasEnds`, `_migrateLineCapGeometry`).
 */

/** Local path endpoints = round-cap centers (joined at these points). */
export function lineLocalEnds(d, w, h) {
  const W = Math.max(1, +w || 1);
  const H = Math.max(1, +h || 1);
  const sw = d && d.sw !== undefined ? +d.sw : 2;
  return { x1: 0, y1: H / 2, x2: Math.max(1, W), y2: H / 2, sw };
}

export function elLocalToCanvas(el, lx, ly) {
  const L = +el.x || 0;
  const T = +el.y || 0;
  const W = Math.max(1, +el.w || 1);
  const H = Math.max(1, +el.h || 1);
  const rad = ((+el.rot || 0) * Math.PI) / 180;
  const cosr = Math.cos(rad);
  const sinr = Math.sin(rad);
  const fx = el.shapeFlipH ? -1 : 1;
  const fy = el.shapeFlipV ? -1 : 1;
  const dx = (lx - W / 2) * fx;
  const dy = (ly - H / 2) * fy;
  return {
    x: L + W / 2 + dx * cosr - dy * sinr,
    y: T + H / 2 + dx * sinr + dy * cosr,
  };
}

export function lineCanvasEnds(el) {
  const ends = lineLocalEnds(el, el.w, el.h);
  return {
    a: elLocalToCanvas(el, ends.x1, ends.y1),
    b: elLocalToCanvas(el, ends.x2, ends.y2),
  };
}

/**
 * Rebuild line box from two canvas endpoints.
 * pin: 'a' | 'b' | null — which end must stay fixed.
 * Returns patch { x, y, w, h, rot, _lineCapV, shapeFlipH, shapeFlipV }.
 */
export function applyLineFromCanvasEnds(el, p1, p2, pin) {
  let x1 = p1.x;
  let y1 = p1.y;
  let x2 = p2.x;
  let y2 = p2.y;
  let dx = x2 - x1;
  let dy = y2 - y1;
  let len = Math.hypot(dx, dy);
  const sw = el.sw !== undefined ? +el.sw : 2;
  const minLen = 8;
  let cosr;
  let sinr;
  if (len < 1e-8) {
    const rot0 = ((+el.rot || 0) * Math.PI) / 180;
    cosr = Math.cos(rot0);
    sinr = Math.sin(rot0);
    if (pin === 'b') {
      x1 = x2 - cosr * minLen;
      y1 = y2 - sinr * minLen;
    } else {
      x2 = x1 + cosr * minLen;
      y2 = y1 + sinr * minLen;
    }
    len = minLen;
  } else {
    cosr = dx / len;
    sinr = dy / len;
    if (len < minLen) {
      if (pin === 'b') {
        x1 = x2 - cosr * minLen;
        y1 = y2 - sinr * minLen;
      } else if (pin === 'a') {
        x2 = x1 + cosr * minLen;
        y2 = y1 + sinr * minLen;
      } else {
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        x1 = midX - (cosr * minLen) / 2;
        y1 = midY - (sinr * minLen) / 2;
        x2 = midX + (cosr * minLen) / 2;
        y2 = midY + (sinr * minLen) / 2;
      }
      len = minLen;
    }
  }
  const rot = (Math.atan2(sinr, cosr) * 180) / Math.PI;
  const newW = len;
  const newH = Math.max(24, sw + 16);
  let midX;
  let midY;
  if (pin === 'a') {
    midX = x1 + cosr * (newW / 2);
    midY = y1 + sinr * (newW / 2);
  } else if (pin === 'b') {
    midX = x2 - cosr * (newW / 2);
    midY = y2 - sinr * (newW / 2);
  } else {
    midX = (x1 + x2) / 2;
    midY = (y1 + y2) / 2;
  }
  return {
    x: midX - newW / 2,
    y: midY - newH / 2,
    w: newW,
    h: newH,
    rot,
    _lineCapV: 2,
    shapeFlipH: false,
    shapeFlipV: false,
  };
}

export function setLineEndCanvas(el, which, pt) {
  const ends = lineCanvasEnds(el);
  if (which === 'a') return applyLineFromCanvasEnds(el, pt, ends.b, 'b');
  return applyLineFromCanvasEnds(el, ends.a, pt, 'a');
}

/**
 * Like setLineEndCanvas but pins the opposite end to an explicit canvas point
 * captured at pointer-down (v7.1). Avoids drift / snap-back to horizontal from stale state.
 */
export function setLineEndCanvasPinned(el, which, pt, fixedOpposite) {
  if (!fixedOpposite) return setLineEndCanvas(el, which, pt);
  if (which === 'a') return applyLineFromCanvasEnds(el, pt, fixedOpposite, 'b');
  return applyLineFromCanvasEnds(el, fixedOpposite, pt, 'a');
}

/** Migrate old inset line caps to v2 geometry (ends at box edges). Matches v7.1. */
export function migrateLineCapGeometry(el) {
  if (!el || el.shape !== 'line') return null;
  if (el._lineCapV === 2) return null;
  const w = Math.max(1, +el.w || 1);
  const h = Math.max(1, +el.h || 1);
  const sw = el.sw !== undefined ? +el.sw : 2;
  const strokeStyle = el.strokeStyle || 'solid';
  const isComplex = strokeStyle === 'wave' || strokeStyle === 'zigzag';
  const oldPad = !isComplex && sw > 0 ? sw / 2 : 0;
  // Already edge-to-edge (or too short) — only stamp the version flag; keep rot/box.
  if (oldPad <= 0 || w <= oldPad * 2 + 1) {
    return { _lineCapV: 2 };
  }
  const a = elLocalToCanvas(el, oldPad, h / 2);
  const b = elLocalToCanvas(el, Math.max(oldPad + 1, w - oldPad), h / 2);
  return applyLineFromCanvasEnds(el, a, b, null);
}

/** Yellow endpoint handle positions for a selected line. */
export function listLineEpHandles(el, opts = {}) {
  if (!el || el.type !== 'shape' || el.shape !== 'line' || el.locked) return [];
  const ends = lineCanvasEnds(el);
  const HS = 6;
  const joinedA = !!opts.joinedA;
  const joinedB = !!opts.joinedB;
  return [
    {
      id: 'line-a',
      which: 'a',
      x: ends.a.x - HS,
      y: ends.a.y - HS,
      cursor: 'crosshair',
      joined: joinedA,
      title: joinedA
        ? 'Тяни — двигать стык · Приклей ещё отрезок · Двойной клик — отсоединить'
        : 'Конец A',
    },
    {
      id: 'line-b',
      which: 'b',
      x: ends.b.x - HS,
      y: ends.b.y - HS,
      cursor: 'crosshair',
      joined: joinedB,
      title: joinedB
        ? 'Тяни — двигать стык · Приклей ещё отрезок · Двойной клик — отсоединить'
        : 'Конец B',
    },
  ];
}

/** Coerce rot / migrate caps / rebuild box from ends so import keeps angle. */
export function normalizeLineElement(el) {
  if (!el || el.type !== 'shape' || el.shape !== 'line') return el;
  let next = { ...el };
  let rot = next.rot != null ? +next.rot : 0;
  if (!Number.isFinite(rot)) rot = 0;
  next.rot = rot;
  if (next._lineCapV !== 2) {
    const mig = migrateLineCapGeometry(next);
    if (mig) next = { ...next, ...mig };
  }
  // Rebuild from current canvas ends so x/y/w/h/rot stay consistent
  // (fixes non-uniform import scale and stale boxes that look horizontal).
  const ends = lineCanvasEnds(next);
  const geom = applyLineFromCanvasEnds(next, ends.a, ends.b, null);
  return { ...next, ...geom };
}

/** Normalize every line on every slide (import / boot). */
export function normalizeLinesInSlides(slides) {
  return (slides || []).map((s) => {
    if (!s) return s;
    return {
      ...s,
      els: (s.els || []).map((el) => (el && el.shape === 'line' ? normalizeLineElement(el) : el)),
    };
  });
}
