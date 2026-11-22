/**
 * Curve node editor. Points are normalized 0–1 inside the element box.
 * Missing control handles mean a straight segment. Handles are created
 * only when the user pulls the stroke or drags a lever.
 */

export function defaultCurvePoints() {
  return [
    { x: 0, y: 0.5, type: 'corner' },
    { x: 1, y: 0.5, type: 'corner' },
  ];
}

function copyPts(pts) {
  return (pts || []).map((p) => ({ ...p }));
}

/** Drop handles that an open curve cannot use. Do not invent levers. */
export function normalizeCurvePoints(pts, closed) {
  if (!pts || pts.length < 2) return pts;
  const next = copyPts(pts);
  next.forEach((pt, i) => {
    const isFirst = i === 0;
    const isLast = i === next.length - 1;
    if (!closed) {
      if (isFirst) {
        delete pt.cp1x;
        delete pt.cp1y;
      }
      if (isLast) {
        delete pt.cp2x;
        delete pt.cp2y;
      }
    }
    if ((pt.type || 'corner') === 'smooth' || pt.type === 'symmetric') {
      if (pt.cp1x == null && pt.cp2x != null && !(!closed && isFirst)) {
        pt.cp1x = pt.x * 2 - pt.cp2x;
        pt.cp1y = pt.y * 2 - pt.cp2y;
      }
      if (pt.cp2x == null && pt.cp1x != null && !(!closed && isLast)) {
        pt.cp2x = pt.x * 2 - pt.cp1x;
        pt.cp2y = pt.y * 2 - pt.cp1y;
      }
    }
    if (!pt.type) pt.type = 'corner';
  });
  return next;
}

function elCenter(el) {
  return {
    cx: (+el.x || 0) + Math.max(1, +el.w || 1) / 2,
    cy: (+el.y || 0) + Math.max(1, +el.h || 1) / 2,
    W: Math.max(1, +el.w || 1),
    H: Math.max(1, +el.h || 1),
    rad: ((+el.rot || 0) * Math.PI) / 180,
  };
}

export function curveNormToCanvas(el, nx, ny) {
  const { cx, cy, W, H, rad } = elCenter(el);
  const cosr = Math.cos(rad);
  const sinr = Math.sin(rad);
  const lx = nx * W - W / 2;
  const ly = ny * H - H / 2;
  return { x: cx + lx * cosr - ly * sinr, y: cy + lx * sinr + ly * cosr };
}

export function curveCanvasToNorm(el, x, y) {
  const { cx, cy, W, H, rad } = elCenter(el);
  const cosr = Math.cos(rad);
  const sinr = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  const lx = dx * cosr + dy * sinr;
  const ly = -dx * sinr + dy * cosr;
  return { x: (lx + W / 2) / W, y: (ly + H / 2) / H };
}

function cubicAt(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/** Nearest bezier segment to a canvas point, or null when farther than maxDist. */
export function nearestCurveSegment(el, x, y, maxDist) {
  const pts = el?.curvePoints?.length >= 2 ? el.curvePoints : defaultCurvePoints();
  const closed = !!el?.curveClosed;
  const nSeg = closed ? pts.length : pts.length - 1;
  const limit = maxDist > 0 ? maxDist : 14;
  let best = null;
  for (let i = 0; i < nSeg; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const p0 = curveNormToCanvas(el, a.x, a.y);
    const p1 = curveNormToCanvas(el, a.cp2x != null ? a.cp2x : a.x, a.cp2y != null ? a.cp2y : a.y);
    const p2 = curveNormToCanvas(el, b.cp1x != null ? b.cp1x : b.x, b.cp1y != null ? b.cp1y : b.y);
    const p3 = curveNormToCanvas(el, b.x, b.y);
    for (let s = 0; s <= 32; s++) {
      const t = s / 32;
      const q = cubicAt(p0, p1, p2, p3, t);
      const d = Math.hypot(q.x - x, q.y - y);
      if (d <= limit && (!best || d < best.d)) best = { seg: i, d, t };
    }
  }
  return best;
}

/** Overlay dots for the curve editor. selectedIdx is one index or a list. */
export function listCurveEditorHandles(el, selectedIdx) {
  if (!el || el.shape !== 'curve' || el.locked) return { nodes: [], cps: [], lines: [] };
  let pts = el.curvePoints;
  if (!pts || pts.length < 2) pts = defaultCurvePoints();
  pts = normalizeCurvePoints(pts, !!el.curveClosed);
  const sel = Array.isArray(selectedIdx)
    ? selectedIdx.map(Number)
    : selectedIdx == null
      ? []
      : [Number(selectedIdx)];
  const nodes = [];
  const cps = [];
  const lines = [];
  pts.forEach((pt, i) => {
    const p = curveNormToCanvas(el, pt.x, pt.y);
    const on = sel.includes(i);
    const type = pt.type === 'symmetric' || pt.type === 'smooth' ? pt.type : 'corner';
    const typeRu =
      type === 'symmetric' ? 'симм.' : type === 'smooth' ? 'сглаж.' : 'острый';
    nodes.push({
      id: `cn-${i}`,
      kind: 'node',
      idx: i,
      type,
      x: p.x - 5,
      y: p.y - 5,
      selected: on,
      title: `Узел ${i + 1} (${typeRu}). Двойной клик — тип · Shift — второй`,
    });
    if (!on) return;
    if (pt.cp1x != null) {
      const c = curveNormToCanvas(el, pt.cp1x, pt.cp1y);
      cps.push({ id: `cp1-${i}`, kind: 'cp1', idx: i, x: c.x - 4, y: c.y - 4 });
      lines.push({ id: `l1-${i}`, x1: p.x, y1: p.y, x2: c.x, y2: c.y });
    }
    if (pt.cp2x != null) {
      const c = curveNormToCanvas(el, pt.cp2x, pt.cp2y);
      cps.push({ id: `cp2-${i}`, kind: 'cp2', idx: i, x: c.x - 4, y: c.y - 4 });
      lines.push({ id: `l2-${i}`, x1: p.x, y1: p.y, x2: c.x, y2: c.y });
    }
  });
  return { nodes, cps, lines, pts };
}

export function moveCurveNode(pts, idx, nx, ny) {
  const next = copyPts(pts);
  const pt = next[idx];
  if (!pt) return next;
  const dx = nx - pt.x;
  const dy = ny - pt.y;
  pt.x = nx;
  pt.y = ny;
  if (pt.cp1x != null) {
    pt.cp1x += dx;
    pt.cp1y += dy;
  }
  if (pt.cp2x != null) {
    pt.cp2x += dx;
    pt.cp2y += dy;
  }
  return next;
}

/** Keep the opposite lever colinear after one side moved. */
function realignOppositeCp(pt, movedWhich) {
  const type = pt.type || 'corner';
  if (type !== 'smooth' && type !== 'symmetric') return;
  if (movedWhich === 'cp1') {
    if (pt.cp2x == null) return;
    if (type === 'symmetric') {
      pt.cp2x = pt.x * 2 - pt.cp1x;
      pt.cp2y = pt.y * 2 - pt.cp1y;
    } else {
      const len = Math.hypot(pt.cp2x - pt.x, pt.cp2y - pt.y) || 0.05;
      const ang = Math.atan2(pt.y - pt.cp1y, pt.x - pt.cp1x);
      pt.cp2x = pt.x + Math.cos(ang) * len;
      pt.cp2y = pt.y + Math.sin(ang) * len;
    }
  } else if (movedWhich === 'cp2') {
    if (pt.cp1x == null) return;
    if (type === 'symmetric') {
      pt.cp1x = pt.x * 2 - pt.cp2x;
      pt.cp1y = pt.y * 2 - pt.cp2y;
    } else {
      const len = Math.hypot(pt.cp1x - pt.x, pt.cp1y - pt.y) || 0.05;
      const ang = Math.atan2(pt.y - pt.cp2y, pt.x - pt.cp2x);
      pt.cp1x = pt.x + Math.cos(ang) * len;
      pt.cp1y = pt.y + Math.sin(ang) * len;
    }
  }
}

export function moveCurveCp(pts, idx, which, nx, ny) {
  const next = copyPts(pts);
  const pt = next[idx];
  if (!pt) return next;
  if (which === 'cp1') {
    pt.cp1x = nx;
    pt.cp1y = ny;
    realignOppositeCp(pt, 'cp1');
  } else {
    pt.cp2x = nx;
    pt.cp2y = ny;
    realignOppositeCp(pt, 'cp2');
  }
  return next;
}

/**
 * Pull one segment so the curve near `t` follows the pointer.
 * `t` 0…1 along the segment: closer to a node → that node's lever moves more.
 */
export function bendCurveSegment(pts, seg, dx, dy, closed, t = 0.5) {
  const next = copyPts(pts);
  const nSeg = closed ? next.length : next.length - 1;
  if (seg < 0 || seg >= nSeg) return next;
  const a = next[seg];
  const b = next[(seg + 1) % next.length];
  const tt = Math.max(0, Math.min(1, Number.isFinite(+t) ? +t : 0.5));
  const wA = 1 - tt;
  const wB = tt;
  // Influence of weighted CP moves on the cubic at tt; invert so the stroke tracks the drag.
  const tc = Math.max(0.12, Math.min(0.88, tt));
  const infl = 3 * tc * (1 - tc) * ((1 - tc) * (1 - tc) + tc * tc);
  const k = infl > 1e-6 ? 1 / infl : 4 / 3;
  a.cp2x = (a.cp2x != null ? a.cp2x : a.x) + dx * k * wA;
  a.cp2y = (a.cp2y != null ? a.cp2y : a.y) + dy * k * wA;
  b.cp1x = (b.cp1x != null ? b.cp1x : b.x) + dx * k * wB;
  b.cp1y = (b.cp1y != null ? b.cp1y : b.y) + dy * k * wB;
  realignOppositeCp(a, 'cp2');
  realignOppositeCp(b, 'cp1');
  return next;
}

/** corner → symmetric (equal levers) → smooth (unequal, colinear) → corner */
export const CURVE_NODE_TYPE_CYCLE = ['corner', 'symmetric', 'smooth'];

export function nextCurveNodeType(type) {
  const t = type === 'symmetric' || type === 'smooth' ? type : 'corner';
  const i = CURVE_NODE_TYPE_CYCLE.indexOf(t);
  return CURVE_NODE_TYPE_CYCLE[(i + 1) % CURVE_NODE_TYPE_CYCLE.length];
}

export function curveNodeTypeLabel(type, ru) {
  if (type === 'symmetric') return ru ? 'Симм.' : 'Sym';
  if (type === 'smooth') return ru ? 'Сглаж.' : 'Smooth';
  return ru ? 'Острый' : 'Corner';
}

function ensureNodeLevers(pts, idx, closed) {
  const pt = pts[idx];
  if (!pt) return;
  const n = pts.length;
  const canIn = closed || idx > 0;
  const canOut = closed || idx < n - 1;
  const prev = canIn ? pts[(idx - 1 + n) % n] : null;
  const next = canOut ? pts[(idx + 1) % n] : null;
  const k = 1 / 3;
  if (canIn && pt.cp1x == null && prev) {
    pt.cp1x = pt.x + (prev.x - pt.x) * k;
    pt.cp1y = pt.y + (prev.y - pt.y) * k;
  }
  if (canOut && pt.cp2x == null && next) {
    pt.cp2x = pt.x + (next.x - pt.x) * k;
    pt.cp2y = pt.y + (next.y - pt.y) * k;
  }
  if (pt.cp1x == null && pt.cp2x != null && canIn) {
    pt.cp1x = pt.x * 2 - pt.cp2x;
    pt.cp1y = pt.y * 2 - pt.cp2y;
  }
  if (pt.cp2x == null && pt.cp1x != null && canOut) {
    pt.cp2x = pt.x * 2 - pt.cp1x;
    pt.cp2y = pt.y * 2 - pt.cp1y;
  }
}

/** Align levers for smooth/symmetric; corner leaves them alone. */
function applyNodeTypeGeometry(pt, type) {
  pt.type = type;
  if (type === 'corner') return;
  if (pt.cp1x == null && pt.cp2x == null) return;
  if (pt.cp1x != null && pt.cp2x != null) {
    const len1 = Math.hypot(pt.cp1x - pt.x, pt.cp1y - pt.y) || 0.08;
    const len2 = Math.hypot(pt.cp2x - pt.x, pt.cp2y - pt.y) || 0.08;
    const angOut = Math.atan2(pt.cp2y - pt.y, pt.cp2x - pt.x);
    if (type === 'symmetric') {
      const len = (len1 + len2) / 2;
      pt.cp2x = pt.x + Math.cos(angOut) * len;
      pt.cp2y = pt.y + Math.sin(angOut) * len;
      pt.cp1x = pt.x - Math.cos(angOut) * len;
      pt.cp1y = pt.y - Math.sin(angOut) * len;
    } else {
      pt.cp2x = pt.x + Math.cos(angOut) * len2;
      pt.cp2y = pt.y + Math.sin(angOut) * len2;
      pt.cp1x = pt.x - Math.cos(angOut) * len1;
      pt.cp1y = pt.y - Math.sin(angOut) * len1;
    }
    return;
  }
  if (pt.cp1x != null) {
    pt.cp2x = pt.x * 2 - pt.cp1x;
    pt.cp2y = pt.y * 2 - pt.cp1y;
  } else if (pt.cp2x != null) {
    pt.cp1x = pt.x * 2 - pt.cp2x;
    pt.cp1y = pt.y * 2 - pt.cp2y;
  }
}

export function setCurveNodeType(pts, idx, type, closed) {
  const next = normalizeCurvePoints(copyPts(pts), closed);
  const pt = next[idx];
  if (!pt) return next;
  const want = type === 'symmetric' || type === 'smooth' ? type : 'corner';
  if (want !== 'corner') ensureNodeLevers(next, idx, closed);
  applyNodeTypeGeometry(pt, want);
  return normalizeCurvePoints(next, closed);
}

/** Cycle selected node(s): corner → symmetric → smooth → corner. */
export function cycleCurveNodeType(pts, indices, closed) {
  const next = normalizeCurvePoints(copyPts(pts), closed);
  const list = (Array.isArray(indices) ? indices : [indices])
    .map((n) => +n)
    .filter((n, i, a) => n >= 0 && n < next.length && a.indexOf(n) === i);
  if (!list.length) return next;
  list.forEach((idx) => {
    const pt = next[idx];
    const want = nextCurveNodeType(pt.type);
    if (want !== 'corner') ensureNodeLevers(next, idx, closed);
    applyNodeTypeGeometry(pt, want);
  });
  return normalizeCurvePoints(next, closed);
}

/** @deprecated use cycleCurveNodeType */
export function toggleCurveNodeType(pts, idx, closed) {
  return cycleCurveNodeType(pts, [idx], closed);
}

function midPt(u, v) {
  return { x: (u.x + v.x) / 2, y: (u.y + v.y) / 2 };
}

/** Insert a node on the cubic from a to b, keeping the current bend. */
function splitSegment(a, b) {
  const p0 = { x: a.x, y: a.y };
  const p1 = { x: a.cp2x != null ? a.cp2x : a.x, y: a.cp2y != null ? a.cp2y : a.y };
  const p2 = { x: b.cp1x != null ? b.cp1x : b.x, y: b.cp1y != null ? b.cp1y : b.y };
  const p3 = { x: b.x, y: b.y };
  const straight =
    Math.hypot(p1.x - p0.x, p1.y - p0.y) < 1e-4 && Math.hypot(p2.x - p3.x, p2.y - p3.y) < 1e-4;
  const a1 = midPt(p0, p1);
  const b1 = midPt(p1, p2);
  const c1 = midPt(p2, p3);
  const a2 = midPt(a1, b1);
  const b2 = midPt(b1, c1);
  const m = midPt(a2, b2);
  const node = { x: m.x, y: m.y, type: 'corner' };
  if (!straight) {
    a.cp2x = a1.x;
    a.cp2y = a1.y;
    b.cp1x = c1.x;
    b.cp1y = c1.y;
    node.cp1x = a2.x;
    node.cp1y = a2.y;
    node.cp2x = b2.x;
    node.cp2y = b2.y;
  }
  if (a.sw != null && b.sw != null) node.sw = (+a.sw + +b.sw) / 2;
  else if (a.sw != null) node.sw = a.sw;
  else if (b.sw != null) node.sw = b.sw;
  return node;
}

function extendPast(pts, i) {
  const p = pts[i];
  let dx = 0.25;
  let dy = 0;
  if (i > 0) {
    dx = p.x - pts[i - 1].x;
    dy = p.y - pts[i - 1].y;
  } else if (pts.length > 1) {
    dx = pts[1].x - p.x;
    dy = pts[1].y - p.y;
  }
  if (Math.hypot(dx, dy) < 1e-4) {
    dx = 0.25;
    dy = 0;
  }
  return { x: p.x + dx, y: p.y + dy, type: 'corner' };
}

/**
 * Add a node from the current selection.
 * Two indices → on the segment between them (adjacent, or closed wrap).
 * One index that is not the last → on the outgoing segment (next along the path).
 * Last index (or none) → further past the end, along the incoming direction.
 * Returns { pts, select }.
 */
export function addCurveNode(pts, closed, selected) {
  const next = copyPts(pts && pts.length >= 2 ? pts : defaultCurvePoints());
  const sel = [];
  (selected || []).forEach((i) => {
    const n = +i;
    if (n >= 0 && n < next.length && !sel.includes(n)) sel.push(n);
  });
  if (sel.length >= 2) {
    const ia = sel[sel.length - 2];
    const ib = sel[sel.length - 1];
    const lo = Math.min(ia, ib);
    const hi = Math.max(ia, ib);
    const adjacent = hi === lo + 1;
    const wrap = !!closed && lo === 0 && hi === next.length - 1;
    if (wrap && !adjacent) {
      const node = splitSegment(next[hi], next[0]);
      next.push(node);
      return { pts: next, select: next.length - 1 };
    }
    if (adjacent || (hi > lo && !wrap)) {
      // Prefer the direct segment when the two picks are neighbors; otherwise split the
      // first hop from the earlier index toward the later one.
      const a = adjacent ? lo : lo;
      const b = adjacent ? hi : lo + 1;
      const node = splitSegment(next[a], next[b]);
      next.splice(b, 0, node);
      return { pts: next, select: b };
    }
  }
  const i = sel.length === 1 ? sel[0] : next.length - 1;
  if (i < next.length - 1) {
    const node = splitSegment(next[i], next[i + 1]);
    next.splice(i + 1, 0, node);
    return { pts: next, select: i + 1 };
  }
  if (closed && next.length >= 2) {
    const node = splitSegment(next[next.length - 1], next[0]);
    next.push(node);
    return { pts: next, select: next.length - 1 };
  }
  next.push(extendPast(next, i));
  return { pts: next, select: next.length - 1 };
}

export function deleteCurveNode(pts, idx, closed) {
  const next = copyPts(pts);
  if (next.length <= 2) return next;
  if (idx < 0 || idx >= next.length) return next;
  next.splice(idx, 1);
  return normalizeCurvePoints(next, closed);
}

/**
 * Remember one node's thickness. Nodes without their own `sw` render by
 * interpolating toward the nearest explicit widths / the element stroke —
 * so changing a single node tapers smoothly to the endpoints.
 * When this is the only custom width on an open curve, pin the ends to
 * `baseSw` so the taper always runs to the endpoints.
 */
export function setCurveNodeWidth(pts, idx, sw, baseSw) {
  const next = copyPts(pts);
  const pt = next[idx];
  if (!pt) return next;
  const width = Math.max(0.5, Math.min(80, +sw || 0.5));
  pt.sw = Math.round(width * 10) / 10;
  const others = next.some((p, i) => i !== idx && p.sw != null);
  if (!others && next.length >= 2 && baseSw != null && Number.isFinite(+baseSw)) {
    const endW = Math.max(0.5, Math.min(80, +baseSw));
    if (idx !== 0) next[0].sw = Math.round(endW * 10) / 10;
    if (idx !== next.length - 1) next[next.length - 1].sw = Math.round(endW * 10) / 10;
  }
  return next;
}

/**
 * Fit the element box to points and levers.
 * Returns { x, y, w, h, curvePoints } or null when the box already fits.
 */
export function applyCurveBBox(el) {
  if (!el || el.shape !== 'curve') return null;
  let pts = el.curvePoints;
  if (!pts || pts.length < 2) return null;
  const cL = +el.x || 0;
  const cT = +el.y || 0;
  const cW = Math.max(1, +el.w || 1);
  const cH = Math.max(1, +el.h || 1);
  let mnX = Infinity;
  let mnY = Infinity;
  let mxX = -Infinity;
  let mxY = -Infinity;
  let maxSw = el.sw != null ? +el.sw : 2;
  pts.forEach((pt) => {
    if (pt.sw != null) maxSw = Math.max(maxSw, +pt.sw);
    [
      [pt.x, pt.y],
      [pt.cp1x, pt.cp1y],
      [pt.cp2x, pt.cp2y],
    ].forEach(([nx, ny]) => {
      if (nx == null || ny == null) return;
      const ax = cL + nx * cW;
      const ay = cT + ny * cH;
      if (ax < mnX) mnX = ax;
      if (ax > mxX) mxX = ax;
      if (ay < mnY) mnY = ay;
      if (ay > mxY) mxY = ay;
    });
  });
  if (!Number.isFinite(mnX)) return null;
  const pad = Math.max(maxSw / 2 + 4, 6);
  const nL = Math.round(mnX - pad);
  const nT = Math.round(mnY - pad);
  const nW = Math.max(20, Math.round(mxX - mnX + pad * 2));
  const nH = Math.max(20, Math.round(mxY - mnY + pad * 2));
  if (nL === cL && nT === cT && nW === cW && nH === cH) return null;
  const nextPts = pts.map((pt) => {
    const rx = (nx) => (cL + nx * cW - nL) / nW;
    const ry = (ny) => (cT + ny * cH - nT) / nH;
    const np = { x: rx(pt.x), y: ry(pt.y), type: pt.type || 'corner' };
    if (pt.cp1x != null) {
      np.cp1x = rx(pt.cp1x);
      np.cp1y = ry(pt.cp1y);
    }
    if (pt.cp2x != null) {
      np.cp2x = rx(pt.cp2x);
      np.cp2y = ry(pt.cp2y);
    }
    if (pt.sw != null) np.sw = pt.sw;
    if (pt.strokeStyle != null) np.strokeStyle = pt.strokeStyle;
    return np;
  });
  return { x: nL, y: nT, w: nW, h: nH, curvePoints: nextPts };
}
