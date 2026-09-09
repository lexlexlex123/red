/** Element box CSS transform: rotation + shape/icon flip (legacy `_elRotTransform`). */

export function elFlipScaleSuffix(el) {
  if (!el || (!el.shapeFlipH && !el.shapeFlipV)) return '';
  const fx = el.shapeFlipH ? -1 : 1;
  const fy = el.shapeFlipV ? -1 : 1;
  return ` scale(${fx},${fy})`;
}

/** Full transform string, or undefined when identity. */
export function elBoxTransform(el, extraParts) {
  const parts = [];
  const rot = el?.rot != null ? +el.rot : 0;
  if (Number.isFinite(rot) && rot !== 0) parts.push(`rotate(${rot}deg)`);
  const flip = elFlipScaleSuffix(el);
  if (flip) parts.push(flip.trim());
  if (extraParts) {
    for (const p of extraParts) {
      if (p) parts.push(p);
    }
  }
  return parts.length ? parts.join(' ') : undefined;
}

export function elRotationDeg(el) {
  const r = el?.rot != null ? +el.rot : 0;
  return Number.isFinite(r) ? r : 0;
}

/** Local AABB corner/mid → canvas after rotation around box center. */
export function rotLocalPoint(el, lx, ly) {
  const x = el.x || 0;
  const y = el.y || 0;
  const w = el.w || 0;
  const h = el.h || 0;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rad = (elRotationDeg(el) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = lx - cx;
  const dy = ly - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/** 8 resize handle centers in canvas coords (rotated with the element). */
export function resizeHandleCenters(el, handles) {
  const x = el.x || 0;
  const y = el.y || 0;
  const w = el.w || 100;
  const h = el.h || 60;
  return (handles || []).map((handle) => {
    const lx = handle.dx < 0 ? x : handle.dx > 0 ? x + w : x + w / 2;
    const ly = handle.dy < 0 ? y : handle.dy > 0 ? y + h : y + h / 2;
    const p = rotLocalPoint(el, lx, ly);
    return { ...handle, cx: p.x, cy: p.y };
  });
}

/** Cursor for a resize handle accounting for element rotation (legacy `_rhCursor`). */
export function resizeHandleCursor(handleId, rotDeg) {
  const map = {
    tl: 'nwse-resize',
    br: 'nwse-resize',
    tr: 'nesw-resize',
    bl: 'nesw-resize',
    tm: 'ns-resize',
    bm: 'ns-resize',
    ml: 'ew-resize',
    mr: 'ew-resize',
  };
  const base = map[handleId] || 'nwse-resize';
  const deg = ((rotDeg % 360) + 360) % 360;
  const step = Math.round(deg / 45) % 8;
  if (!step) return base;
  const cycle = ['nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize'];
  const idx = { 'nwse-resize': 0, 'ns-resize': 1, 'nesw-resize': 2, 'ew-resize': 3 }[base] ?? 0;
  return cycle[(idx + step) % 8];
}

/**
 * Resize like legacy: mouse delta in screen space → local axes; opposite corner
 * stays fixed when rotated (transform-origin center).
 */
export function applyResize(start, handle, screenDx, screenDy, opts = {}) {
  const keepAspect = !!opts.keepAspect;
  const rotDeg = opts.rot != null ? +opts.rot : 0;
  const rad = (rotDeg * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);
  const localDx = screenDx * cosR + screenDy * sinR;
  const localDy = -screenDx * sinR + screenDy * cosR;

  const sl = start.x || 0;
  const st = start.y || 0;
  const sw = Math.max(1, start.w || 100);
  const sh = Math.max(1, start.h || 60);
  const hx = handle.dx;
  const hy = handle.dy;
  const min = opts.min != null ? opts.min : 24;

  let nw = hx !== 0 ? Math.max(min, sw + hx * localDx) : sw;
  let nh = hy !== 0 ? Math.max(min, sh + hy * localDy) : sh;

  if (keepAspect && sw > 0 && sh > 0 && (hx !== 0 || hy !== 0)) {
    const ratio = sw / sh;
    if (hx !== 0 && hy !== 0) {
      const rawDx = hx * localDx;
      const rawDy = hy * localDy;
      const delta = Math.abs(rawDx) >= Math.abs(rawDy) ? rawDx : rawDy * ratio;
      nw = Math.max(min, sw + delta);
      nh = Math.max(min, nw / ratio);
    } else if (hx !== 0) {
      nw = Math.max(min, sw + hx * localDx);
      nh = Math.max(min, nw / ratio);
    } else {
      nh = Math.max(min, sh + hy * localDy);
      nw = Math.max(min, nh * ratio);
    }
  }

  if (Math.abs(rotDeg) < 0.001) {
    let x = sl;
    let y = st;
    if (hx < 0) x = sl + sw - nw;
    if (hy < 0) y = st + sh - nh;
    return { x: Math.round(x), y: Math.round(y), w: Math.round(nw), h: Math.round(nh) };
  }

  // Dragging left → ax=1 (right edge fixed). Same for top.
  const ax = hx < 0 ? 1 : 0;
  const ay = hy < 0 ? 1 : 0;
  const fcx = hx !== 0 ? (ax ? sw / 2 : -sw / 2) : 0;
  const fcy = hy !== 0 ? (ay ? sh / 2 : -sh / 2) : 0;
  const oldCx = sl + sw / 2;
  const oldCy = st + sh / 2;
  const fixSx = oldCx + fcx * cosR - fcy * sinR;
  const fixSy = oldCy + fcx * sinR + fcy * cosR;
  const fcx2 = hx !== 0 ? (ax ? nw / 2 : -nw / 2) : 0;
  const fcy2 = hy !== 0 ? (ay ? nh / 2 : -nh / 2) : 0;
  const newCx = fixSx - fcx2 * cosR + fcy2 * sinR;
  const newCy = fixSy - fcx2 * sinR - fcy2 * cosR;
  return {
    x: Math.round(newCx - nw / 2),
    y: Math.round(newCy - nh / 2),
    w: Math.round(nw),
    h: Math.round(nh),
  };
}

/** Four rotated corners for corner-rotate hit testing (legacy `_getRotCorners`). */
export function elRotCorners(el) {
  const x = el.x || 0;
  const y = el.y || 0;
  const w = el.w || 0;
  const h = el.h || 0;
  const deg = elRotationDeg(el);
  return [
    { ...rotLocalPoint(el, x, y), id: 'tl', tangent: deg + 315 },
    { ...rotLocalPoint(el, x + w, y), id: 'tr', tangent: deg + 45 },
    { ...rotLocalPoint(el, x, y + h), id: 'bl', tangent: deg + 225 },
    { ...rotLocalPoint(el, x + w, y + h), id: 'br', tangent: deg + 135 },
  ];
}

function nearMidEdgeHandle(el, canvasX, canvasY) {
  const R = 14;
  const x = el.x || 0;
  const y = el.y || 0;
  const w = el.w || 0;
  const h = el.h || 0;
  if (w < 8 || h < 8) return false;
  const mids = [
    rotLocalPoint(el, x + w / 2, y),
    rotLocalPoint(el, x + w, y + h / 2),
    rotLocalPoint(el, x + w / 2, y + h),
    rotLocalPoint(el, x, y + h / 2),
  ];
  return mids.some((p) => Math.hypot(canvasX - p.x, canvasY - p.y) <= R);
}

/**
 * Corner rotate zone (outside resize handle, near corner) — legacy `_nearCorner`.
 * @returns {{x,y,id,tangent}|null}
 */
export function nearCornerRot(el, canvasX, canvasY) {
  if (!el) return null;
  if (nearMidEdgeHandle(el, canvasX, canvasY)) return null;
  const R = 22;
  const HANDLE_R = 10;
  const corners = elRotCorners(el);
  const deg = (elRotationDeg(el) * Math.PI) / 180;
  const cosr = Math.cos(-deg);
  const sinr = Math.sin(-deg);
  const x = el.x || 0;
  const y = el.y || 0;
  const w = el.w || 0;
  const h = el.h || 0;
  const ecx = x + w / 2;
  const ecy = y + h / 2;
  const inset = Math.min(20, w * 0.35, h * 0.35);
  for (const c of corners) {
    const dist = Math.hypot(canvasX - c.x, canvasY - c.y);
    if (dist > R || dist < HANDLE_R) continue;
    const lx = (canvasX - ecx) * cosr - (canvasY - ecy) * sinr;
    const ly = (canvasX - ecx) * sinr + (canvasY - ecy) * cosr;
    if (
      inset > 0 &&
      lx > -w / 2 + inset &&
      lx < w / 2 - inset &&
      ly > -h / 2 + inset &&
      ly < h / 2 - inset
    ) {
      continue;
    }
    return c;
  }
  return null;
}
