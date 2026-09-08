/**
 * Curve node editor helpers — ported from js/04-ui.js `_buildCurveEditor` / `_normalizeCurvePoints`.
 */

export function defaultCurvePoints() {
  return [
    { x: 0.1, y: 0.7, type: 'smooth', cp2x: 0.2, cp2y: 0.3 },
    { x: 0.5, y: 0.3, type: 'smooth', cp1x: 0.3, cp1y: 0.3, cp2x: 0.7, cp2y: 0.3 },
    { x: 0.9, y: 0.7, type: 'smooth', cp1x: 0.8, cp1y: 0.3 },
  ];
}

export function normalizeCurvePoints(pts, closed) {
  if (!pts || pts.length < 2) return pts;
  const next = pts.map((p) => ({ ...p }));
  next.forEach((pt, i) => {
    const isFirst = i === 0;
    const isLast = i === next.length - 1;
    if (closed) {
      if (pt.cp1x == null && pt.cp2x != null) {
        pt.cp1x = pt.x * 2 - pt.cp2x;
        pt.cp1y = pt.y * 2 - pt.cp2y;
      }
      if (pt.cp2x == null && pt.cp1x != null) {
        pt.cp2x = pt.x * 2 - pt.cp1x;
        pt.cp2y = pt.y * 2 - pt.cp1y;
      }
      if (pt.cp1x == null && pt.cp2x == null) {
        const prev = next[(i - 1 + next.length) % next.length];
        const nxt = next[(i + 1) % next.length];
        const dx = (nxt.x - prev.x) * 0.25;
        const dy = (nxt.y - prev.y) * 0.25;
        pt.cp1x = pt.x - dx;
        pt.cp1y = pt.y - dy;
        pt.cp2x = pt.x + dx;
        pt.cp2y = pt.y + dy;
      }
    } else {
      if (isFirst) {
        delete pt.cp1x;
        delete pt.cp1y;
      }
      if (isLast) {
        delete pt.cp2x;
        delete pt.cp2y;
      }
      if (!isFirst && !isLast) {
        if (pt.cp1x == null && pt.cp2x != null) {
          pt.cp1x = pt.x * 2 - pt.cp2x;
          pt.cp1y = pt.y * 2 - pt.cp2y;
        }
        if (pt.cp2x == null && pt.cp1x != null) {
          pt.cp2x = pt.x * 2 - pt.cp1x;
          pt.cp2y = pt.y * 2 - pt.cp1y;
        }
      }
      if (isFirst && pt.cp2x == null) {
        const nxt = next[1];
        pt.cp2x = pt.x + (nxt.x - pt.x) * 0.4;
        pt.cp2y = pt.y + (nxt.y - pt.y) * 0.4;
      }
      if (isLast && pt.cp1x == null) {
        const prev = next[next.length - 2];
        pt.cp1x = pt.x + (prev.x - pt.x) * 0.4;
        pt.cp1y = pt.y + (prev.y - pt.y) * 0.4;
      }
    }
    if (!pt.type) pt.type = 'smooth';
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

/** Overlay dots for curve editor. */
export function listCurveEditorHandles(el, selectedIdx) {
  if (!el || el.shape !== 'curve' || el.locked) return { nodes: [], cps: [], lines: [] };
  let pts = el.curvePoints;
  if (!pts || pts.length < 2) pts = defaultCurvePoints();
  pts = normalizeCurvePoints(pts, !!el.curveClosed);
  const nodes = [];
  const cps = [];
  const lines = [];
  pts.forEach((pt, i) => {
    const p = curveNormToCanvas(el, pt.x, pt.y);
    nodes.push({
      id: `cn-${i}`,
      kind: 'node',
      idx: i,
      x: p.x - 5,
      y: p.y - 5,
      selected: selectedIdx === i,
      title: `Узел ${i + 1}`,
    });
    if (selectedIdx === i) {
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
    }
  });
  return { nodes, cps, lines, pts };
}

export function moveCurveNode(pts, idx, nx, ny, closed) {
  const next = normalizeCurvePoints(pts.map((p) => ({ ...p })), closed);
  const pt = next[idx];
  if (!pt) return next;
  const dx = nx - pt.x;
  const dy = ny - pt.y;
  pt.x = Math.max(0, Math.min(1, nx));
  pt.y = Math.max(0, Math.min(1, ny));
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

export function moveCurveCp(pts, idx, which, nx, ny, closed) {
  const next = normalizeCurvePoints(pts.map((p) => ({ ...p })), closed);
  const pt = next[idx];
  if (!pt) return next;
  const type = pt.type || 'smooth';
  if (which === 'cp1') {
    pt.cp1x = nx;
    pt.cp1y = ny;
    if ((type === 'smooth' || type === 'symmetric') && pt.cp2x != null) {
      if (type === 'symmetric') {
        const len = Math.hypot(pt.cp2x - pt.x, pt.cp2y - pt.y) || 0.05;
        const ang = Math.atan2(pt.y - ny, pt.x - nx);
        pt.cp2x = pt.x + Math.cos(ang) * len;
        pt.cp2y = pt.y + Math.sin(ang) * len;
      } else {
        pt.cp2x = pt.x * 2 - nx;
        pt.cp2y = pt.y * 2 - ny;
      }
    }
  } else {
    pt.cp2x = nx;
    pt.cp2y = ny;
    if ((type === 'smooth' || type === 'symmetric') && pt.cp1x != null) {
      if (type === 'symmetric') {
        const len = Math.hypot(pt.cp1x - pt.x, pt.cp1y - pt.y) || 0.05;
        const ang = Math.atan2(pt.y - ny, pt.x - nx);
        pt.cp1x = pt.x + Math.cos(ang) * len;
        pt.cp1y = pt.y + Math.sin(ang) * len;
      } else {
        pt.cp1x = pt.x * 2 - nx;
        pt.cp1y = pt.y * 2 - ny;
      }
    }
  }
  return next;
}

export function toggleCurveNodeType(pts, idx, closed) {
  const next = normalizeCurvePoints(pts.map((p) => ({ ...p })), closed);
  const pt = next[idx];
  if (!pt) return next;
  pt.type = pt.type === 'corner' ? 'smooth' : 'corner';
  if (pt.type === 'smooth' && pt.cp1x != null && pt.cp2x == null) {
    pt.cp2x = pt.x * 2 - pt.cp1x;
    pt.cp2y = pt.y * 2 - pt.cp1y;
  }
  if (pt.type === 'smooth' && pt.cp2x != null && pt.cp1x == null) {
    pt.cp1x = pt.x * 2 - pt.cp2x;
    pt.cp1y = pt.y * 2 - pt.cp2y;
  }
  return next;
}

export function addCurveNode(pts, closed) {
  const next = normalizeCurvePoints((pts || defaultCurvePoints()).map((p) => ({ ...p })), closed);
  if (next.length < 2) return defaultCurvePoints();
  const a = next[next.length - 2];
  const b = next[next.length - 1];
  const mid = {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    type: 'smooth',
    cp1x: (a.x + b.x) / 2 - 0.05,
    cp1y: (a.y + b.y) / 2,
    cp2x: (a.x + b.x) / 2 + 0.05,
    cp2y: (a.y + b.y) / 2,
  };
  next.splice(next.length - 1, 0, mid);
  return normalizeCurvePoints(next, closed);
}

export function deleteCurveNode(pts, idx, closed) {
  const next = (pts || []).map((p) => ({ ...p }));
  if (next.length <= 2) return next;
  if (idx < 0 || idx >= next.length) return next;
  next.splice(idx, 1);
  return normalizeCurvePoints(next, closed);
}

/**
 * Fit element box to curve points + control handles (v7.1 `_applyCurveBBox`).
 * Returns patch { x, y, w, h, curvePoints } or null if unchanged.
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
  pts.forEach((pt) => {
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
  const sw = el.sw != null ? +el.sw : 2;
  const pad = Math.max(sw + 4, 6);
  const nL = Math.round(mnX - pad);
  const nT = Math.round(mnY - pad);
  const nW = Math.max(20, Math.round(mxX - mnX + pad * 2));
  const nH = Math.max(20, Math.round(mxY - mnY + pad * 2));
  if (nL === cL && nT === cT && nW === cW && nH === cH) return null;
  const nextPts = pts.map((pt) => {
    const rx = (nx) => (cL + nx * cW - nL) / nW;
    const ry = (ny) => (cT + ny * cH - nT) / nH;
    const np = { x: rx(pt.x), y: ry(pt.y), type: pt.type };
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
