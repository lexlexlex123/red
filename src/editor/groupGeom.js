/**
 * Group / multi-selection geometry helpers (from js/44-group.js subset).
 */

export function unionBBox(els) {
  const list = (els || []).filter((e) => e && !e._isDecor);
  if (!list.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  list.forEach((el) => {
    const x = el.x || 0;
    const y = el.y || 0;
    const w = Math.max(1, el.w || 1);
    const h = Math.max(1, el.h || 1);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  });
  return {
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
  };
}

/**
 * Scale members relative to a bbox resize.
 * @param {object} bbox start bbox {x,y,w,h}
 * @param {{dx:number,dy:number}} handle
 * @param {number} rdx pointer delta x in canvas coords
 * @param {number} rdy pointer delta y
 * @param {Array} startMembers [{id,x,y,w,h,rot}]
 * @param {boolean} lockAspect
 */
export function scaleGroupMembers(bbox, handle, rdx, rdy, startMembers, lockAspect) {
  const { x: bx, y: by, w: bw, h: bh } = bbox;
  const dx = handle.dx;
  const dy = handle.dy;
  const ax = dx < 0 ? 1 : 0;
  const ay = dy < 0 ? 1 : 0;
  const isCorner = dx !== 0 && dy !== 0;
  const groupAspect = bw / Math.max(1, bh);

  let newW;
  let newH;
  if (lockAspect && isCorner) {
    const rawDx = dx * rdx;
    const rawDy = dy * rdy;
    const delta = Math.abs(rawDx) >= Math.abs(rawDy) ? rawDx : rawDy * groupAspect;
    newW = Math.max(40, bw + delta);
    newH = Math.max(20, newW / groupAspect);
  } else {
    newW = Math.max(40, bw + dx * rdx);
    newH = Math.max(20, bh + dy * rdy);
    if (dx === 0) newW = bw;
    if (dy === 0) newH = bh;
  }

  const scaleX = newW / bw;
  const scaleY = newH / bh;
  const originX = ax ? bx + bw : bx;
  const originY = ay ? by + bh : by;

  const patches = {};
  (startMembers || []).forEach((st) => {
    const relX = st.x - originX;
    const relY = st.y - originY;
    patches[st.id] = {
      x: Math.round(originX + relX * scaleX),
      y: Math.round(originY + relY * scaleY),
      w: Math.max(20, Math.round(st.w * scaleX)),
      h: Math.max(10, Math.round(st.h * scaleY)),
    };
  });

  const nbx = ax ? bx + bw - newW : bx;
  const nby = ay ? by + bh - newH : by;
  return { patches, bbox: { x: nbx, y: nby, w: newW, h: newH } };
}

/**
 * Rotate members around bbox center by deltaDeg.
 */
export function rotateGroupMembers(bbox, deltaDeg, startMembers) {
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  const dRad = (deltaDeg * Math.PI) / 180;
  const cosD = Math.cos(dRad);
  const sinD = Math.sin(dRad);
  const patches = {};
  (startMembers || []).forEach((st) => {
    const ex = st.x + st.w / 2 - cx;
    const ey = st.y + st.h / 2 - cy;
    patches[st.id] = {
      x: Math.round(cx + ex * cosD - ey * sinD - st.w / 2),
      y: Math.round(cy + ex * sinD + ey * cosD - st.h / 2),
      rot: (st.rot || 0) + deltaDeg,
    };
  });
  return patches;
}
