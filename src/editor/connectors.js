/** Connectors: straight, orthogonal, cubic curve + dash/markers/gap helpers. */

import { resolveSchemeColor } from './themes.js';

export const CONN_MARKER_TYPES = ['none', 'arrow', 'square', 'circle', 'bar', 'cross'];

const SIDE_NORMAL = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  center: { x: 0, y: 0 },
};

export function edgeMid(el, side) {
  const x = el.x || 0;
  const y = el.y || 0;
  const w = el.w || 0;
  const h = el.h || 0;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const deg = +el.rot || 0;
  const rotPt = (px, py) => {
    if (!deg) return { x: px, y: py };
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = px - cx;
    const dy = py - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  };
  const n = SIDE_NORMAL[side] || SIDE_NORMAL.center;
  let pt;
  switch (side) {
    case 'top':
      pt = rotPt(cx, y);
      break;
    case 'right':
      pt = rotPt(x + w, cy);
      break;
    case 'bottom':
      pt = rotPt(cx, y + h);
      break;
    case 'left':
      pt = rotPt(x, cy);
      break;
    case 'center':
      pt = { x: cx, y: cy };
      break;
    default:
      pt = { x: cx, y: cy };
  }
  return { ...pt, side: side || 'center', nx: n.x, ny: n.y };
}

export function edgeMidpoints(el, includeCenter = false) {
  if (!el) return [];
  const sides = ['top', 'right', 'bottom', 'left'];
  const mids = sides.map((s) => edgeMid(el, s));
  if (includeCenter) mids.push(edgeMid(el, 'center'));
  return mids;
}

/**
 * Snap canvas point to nearest element edge midpoint.
 * @returns {{ elId:string, side:string, point:{x:number,y:number} }|null}
 */
export function snapToNearestEdge(pt, els, opts = {}) {
  const threshold = opts.threshold != null ? opts.threshold : 48;
  const excludeId = opts.excludeId != null ? String(opts.excludeId) : null;
  const includeCenter = opts.includeCenter !== false;
  let best = null;
  let bestD = threshold * threshold;
  (els || []).forEach((el) => {
    if (!el || el._isDecor || el.objHidden) return;
    if (excludeId && String(el.id) === excludeId) return;
    if (el.type === 'pagenum') return;
    edgeMidpoints(el, includeCenter).forEach((m) => {
      const d = (m.x - pt.x) ** 2 + (m.y - pt.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { elId: el.id, side: m.side, point: { x: m.x, y: m.y } };
      }
    });
  });
  return best;
}

export function nearestSides(a, b) {
  const sides = ['top', 'right', 'bottom', 'left'];
  let best = { fromSide: 'right', toSide: 'left', dist: Infinity };
  sides.forEach((fs) => {
    sides.forEach((ts) => {
      const p1 = edgeMid(a, fs);
      const p2 = edgeMid(b, ts);
      const d = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
      if (d < best.dist) best = { fromSide: fs, toSide: ts, dist: d };
    });
  });
  return best;
}

export function applyLineGap(raw1, raw2, gap) {
  gap = gap || 0;
  if (!gap) return { p1: raw1, p2: raw2 };
  const dx = raw2.x - raw1.x;
  const dy = raw2.y - raw1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return { p1: raw1, p2: raw2 };
  const g = Math.min(gap, len / 2);
  const ux = dx / len;
  const uy = dy / len;
  return {
    p1: { x: raw1.x + ux * g, y: raw1.y + uy * g, side: raw1.side, nx: raw1.nx, ny: raw1.ny },
    p2: { x: raw2.x - ux * g, y: raw2.y - uy * g, side: raw2.side, nx: raw2.nx, ny: raw2.ny },
  };
}

export function applySideGap(raw, gap) {
  if (!gap) return raw;
  const nx = raw.nx != null ? raw.nx : (SIDE_NORMAL[raw.side] || SIDE_NORMAL.center).x;
  const ny = raw.ny != null ? raw.ny : (SIDE_NORMAL[raw.side] || SIDE_NORMAL.center).y;
  return { x: raw.x + nx * gap, y: raw.y + ny * gap, side: raw.side, nx, ny };
}

export function connectorEndpoints(conn, els) {
  const from = (els || []).find((e) => e && String(e.id) === String(conn.fromId));
  const to = (els || []).find((e) => e && String(e.id) === String(conn.toId));
  if (!from || !to) return null;
  const sides = nearestSides(from, to);
  const fromSide = conn.fromSide || sides.fromSide;
  const toSide = conn.toSide || sides.toSide;
  let p1 = edgeMid(from, fromSide);
  let p2 = edgeMid(to, toSide);
  const gap = conn.gap || 0;
  if (gap) {
    const route = conn.route || 'curve';
    if (route === 'straight') {
      const gapped = applyLineGap(p1, p2, gap);
      p1 = gapped.p1;
      p2 = gapped.p2;
    } else {
      p1 = applySideGap(p1, gap);
      p2 = applySideGap(p2, gap);
    }
  }
  return { p1, p2, fromSide, toSide };
}

/** Port of legacy `_defaultControlPoints`. */
export function defaultControlPoints(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const bend = Math.min(dist * 0.45, 220);
  const hBias = Math.abs(dx) > Math.abs(dy) * 0.6;
  if (hBias) {
    return {
      cp1: { x: p1.x + bend * Math.sign(dx || 1), y: p1.y },
      cp2: { x: p2.x - bend * Math.sign(dx || 1), y: p2.y },
    };
  }
  return {
    cp1: { x: p1.x, y: p1.y + bend * Math.sign(dy || 1) },
    cp2: { x: p2.x, y: p2.y - bend * Math.sign(dy || 1) },
  };
}

/** Resolved endpoints + control points for a curve (respects `_cpManual`). */
export function resolveControlPoints(conn, els) {
  const ends = connectorEndpoints(conn, els);
  if (!ends) return null;
  const auto = defaultControlPoints(ends.p1, ends.p2);
  if (conn._cpManual && conn.cp1 && conn.cp2) {
    return { ...ends, cp1: { ...conn.cp1 }, cp2: { ...conn.cp2 } };
  }
  return {
    ...ends,
    cp1: conn.cp1 && Number.isFinite(conn.cp1.x) ? { ...conn.cp1 } : auto.cp1,
    cp2: conn.cp2 && Number.isFinite(conn.cp2.x) ? { ...conn.cp2 } : auto.cp2,
  };
}

/** Port of legacy `_orthogonalPoints`. */
export function orthogonalPoints(p1, p2, fromSide, toSide) {
  const hFrom = fromSide === 'left' || fromSide === 'right';
  const hTo = toSide === 'left' || toSide === 'right';
  if (hFrom && hTo) {
    const midX = (p1.x + p2.x) / 2;
    return [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2];
  }
  if (!hFrom && !hTo) {
    const midY = (p1.y + p2.y) / 2;
    return [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
  }
  if (hFrom) return [p1, { x: p2.x, y: p1.y }, p2];
  return [p1, { x: p1.x, y: p2.y }, p2];
}

export function markerRetractDist(type) {
  if (type === 'arrow') return 1.386;
  if (type === 'square') return 1.7;
  if (type === 'circle') return 1.5;
  if (type === 'bar') return 1.5;
  if (type === 'cross') return 1.5;
  return 0;
}

function retractPt(pt, toward, sw, type) {
  if (!type || type === 'none' || !(sw > 0)) return pt;
  const mkDist = markerRetractDist(type);
  if (!mkDist) return pt;
  const tdx = toward.x - pt.x;
  const tdy = toward.y - pt.y;
  const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
  return { x: pt.x + (tdx / tlen) * sw * mkDist, y: pt.y + (tdy / tlen) * sw * mkDist };
}

/**
 * @param {object} [opts]
 * @param {{x:number,y:number}} [opts.cp1]
 * @param {{x:number,y:number}} [opts.cp2]
 * @param {string} [opts.fromMarker]
 * @param {string} [opts.toMarker]
 * @param {number} [opts.sw]
 */
export function connectorPathD(p1, p2, route = 'straight', fromSide, toSide, opts) {
  const fromMk = opts?.fromMarker || 'none';
  const toMk = opts?.toMarker || 'none';
  const sw = opts?.sw != null ? +opts.sw : 2;

  if (route === 'orthogonal') {
    const pts = orthogonalPoints(p1, p2, fromSide, toSide);
    const rp1 = retractPt(pts[0], pts[1], sw, fromMk);
    const rp2 = retractPt(pts[pts.length - 1], pts[pts.length - 2], sw, toMk);
    const out = [rp1, ...pts.slice(1, -1), rp2];
    return out.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  }
  if (route === 'curve') {
    const auto = defaultControlPoints(p1, p2);
    const cp1 = opts?.cp1 && Number.isFinite(opts.cp1.x) ? opts.cp1 : auto.cp1;
    const cp2 = opts?.cp2 && Number.isFinite(opts.cp2.x) ? opts.cp2 : auto.cp2;
    const rp1 = retractPt(p1, cp1, sw, fromMk);
    const rp2 = retractPt(p2, cp2, sw, toMk);
    return (
      `M${rp1.x.toFixed(1)},${rp1.y.toFixed(1)} ` +
      `C${cp1.x.toFixed(1)},${cp1.y.toFixed(1)} ${cp2.x.toFixed(1)},${cp2.y.toFixed(1)} ` +
      `${rp2.x.toFixed(1)},${rp2.y.toFixed(1)}`
    );
  }
  const rp1 = retractPt(p1, p2, sw, fromMk);
  const rp2 = retractPt(p2, p1, sw, toMk);
  return `M${rp1.x.toFixed(1)},${rp1.y.toFixed(1)} L${rp2.x.toFixed(1)},${rp2.y.toFixed(1)}`;
}

/** Path for a connector using its route + endpoint sides (+ optional stored cps). */
export function connectorPathFor(conn, els) {
  if (!conn || conn.objHidden) return null;
  const ends = connectorEndpoints(conn, els);
  if (!ends) return null;
  const route = conn.route || 'curve';
  let cps = { cp1: conn.cp1, cp2: conn.cp2 };
  if (route === 'curve') {
    const resolved = resolveControlPoints(conn, els);
    if (resolved) cps = { cp1: resolved.cp1, cp2: resolved.cp2 };
  }
  return connectorPathD(ends.p1, ends.p2, route, ends.fromSide, ends.toSide, {
    ...cps,
    fromMarker: conn.fromMarker || 'none',
    toMarker: conn.toMarker || 'none',
    sw: conn.sw != null ? conn.sw : 2,
  });
}

export function connectorDashArray(dash, sw = 2) {
  if (dash === 'dot') return `0 ${sw * 4}`;
  if (dash === 'dash') return `${sw * 5} ${sw * 3}`;
  return undefined;
}

export function connectorMarkerId(connId, which, prefix = 'react') {
  const side = which === 'start' || which === 'from' ? 'mf' : 'mt';
  return `${prefix}-${connId}-${side}`;
}

/** Marker url for path attributes; per-connection colored defs. */
export function connectorMarkerUrl(which, type, connId, prefix = 'react') {
  if (!type || type === 'none' || !connId) return undefined;
  return `url(#${connectorMarkerId(connId, which, prefix)})`;
}

/**
 * Build SVG <marker> markup for one end (legacy geometry, strokeWidth units).
 * @param {string} id
 * @param {string} type
 * @param {string} color
 * @param {boolean} atStart
 */
export function buildConnectorMarkerSvg(id, type, color, atStart) {
  if (!type || type === 'none') return '';
  const fill = color || '#94a3b8';
  const esc = String(fill).replace(/"/g, '');
  if (type === 'arrow') {
    const d = atStart
      ? 'M0.216,1.475 L0.216,1.475 Q0.000,1.600 0.216,1.725 L2.554,3.075 Q2.771,3.200 2.771,2.950 L2.771,0.250 Q2.771,0.000 2.554,0.125 Z'
      : 'M2.555,1.475 L2.555,1.475 Q2.771,1.600 2.555,1.725 L0.217,3.075 Q0.000,3.200 0.000,2.950 L0.000,0.250 Q0.000,0.000 0.217,0.125 Z';
    return (
      `<marker id="${id}" markerUnits="strokeWidth" orient="auto" markerWidth="3.1" markerHeight="3.5" refX="1.386" refY="1.6">` +
      `<path d="${d}" fill="${esc}" stroke="none"/></marker>`
    );
  }
  if (type === 'square') {
    return (
      `<marker id="${id}" markerUnits="strokeWidth" orient="auto" markerWidth="3.4" markerHeight="3.4" refX="1.7" refY="1.7" fill="${esc}">` +
      `<rect x="0.2" y="0.2" width="3.0" height="3.0" rx="0.5" ry="0.5" stroke-width="0"/></marker>`
    );
  }
  if (type === 'circle') {
    return (
      `<marker id="${id}" markerUnits="strokeWidth" orient="auto" markerWidth="3.0" markerHeight="3.0" refX="1.5" refY="1.5" fill="${esc}">` +
      `<circle cx="1.5" cy="1.5" r="1.3" stroke-width="0"/></marker>`
    );
  }
  if (type === 'bar') {
    return (
      `<marker id="${id}" markerUnits="strokeWidth" orient="auto" markerWidth="3.0" markerHeight="3.0" refX="1.5" refY="1.5">` +
      `<path d="M1.5,0.2 L1.5,2.8" stroke="${esc}" stroke-width="1" stroke-linecap="round" fill="none"/></marker>`
    );
  }
  if (type === 'cross') {
    return (
      `<marker id="${id}" markerUnits="strokeWidth" orient="0" markerWidth="3.0" markerHeight="3.0" refX="1.5" refY="1.5">` +
      `<path d="M0.3,0.3 L2.7,2.7" stroke="${esc}" stroke-width="1" stroke-linecap="round" fill="none"/>` +
      `<path d="M2.7,0.3 L0.3,2.7" stroke="${esc}" stroke-width="1" stroke-linecap="round" fill="none"/></marker>`
    );
  }
  return '';
}

/** Resolved stroke for a connector (scheme pin → color → fallback). */
export function resolveConnectorStroke(conn, theme) {
  if (!conn) return '#94a3b8';
  const raw = conn.color;
  if (raw === 'none' || raw === 'transparent') return 'none';
  if (conn.colorScheme && theme) {
    const sc = resolveSchemeColor(conn.colorScheme, theme);
    if (sc) return sc;
  }
  return raw || '#94a3b8';
}

/** All marker defs for a slide's connectors. */
export function connectorsMarkerDefsSvg(conns, prefix = 'react', theme = null) {
  let out = '';
  (conns || []).forEach((conn) => {
    if (!conn || conn.objHidden) return;
    const color = resolveConnectorStroke(conn, theme);
    // Transparent line → no visible end markers (legacy cpClearColor / stroke none).
    if (color === 'none') return;
    const fromMk = conn.fromMarker || 'none';
    const toMk = conn.toMarker || 'none';
    out += buildConnectorMarkerSvg(connectorMarkerId(conn.id, 'start', prefix), fromMk, color, true);
    out += buildConnectorMarkerSvg(connectorMarkerId(conn.id, 'end', prefix), toMk, color, false);
  });
  return out;
}

export function connectorLinecap(dash, fromMk, toMk) {
  if (dash === 'dot') return 'round';
  if ((fromMk && fromMk !== 'none') || (toMk && toMk !== 'none')) return 'butt';
  return 'round';
}

/** Dash offset span for march animation (legacy). */
export function connectorAnimOffset(dash, sw = 2) {
  if (dash === 'dot') return sw * 4;
  if (dash === 'dash') return sw * 8;
  return 0;
}

/** CSS animation name unique per connector. */
export function connectorAnimName(connId) {
  return `conn_march_${String(connId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

/**
 * Keyframes + style block for marching dashes.
 * Only for animated non-solid connectors.
 */
export function connectorsAnimStyleCss(conns) {
  let css = '';
  (conns || []).forEach((conn) => {
    if (!conn || conn.objHidden || !conn.animated) return;
    const dash = conn.dash || 'solid';
    if (dash === 'solid') return;
    const sw = conn.sw != null ? conn.sw : 2;
    const off = connectorAnimOffset(dash, sw);
    if (!off) return;
    const name = connectorAnimName(conn.id);
    const from = conn.animInvert ? 0 : off;
    const to = conn.animInvert ? off : 0;
    css += `@keyframes ${name}{from{stroke-dashoffset:${from}}to{stroke-dashoffset:${to}}}`;
  });
  return css;
}

export function connectorAnimStyle(conn) {
  if (!conn || !conn.animated) return undefined;
  const dash = conn.dash || 'solid';
  if (dash === 'solid') return undefined;
  const dur = dash === 'dot' ? '1s' : '0.8s';
  return {
    animation: `${connectorAnimName(conn.id)} ${dur} linear infinite`,
  };
}

/** Start (or end if inverted) anchor for a ride-along element. */
export function rideAnchorPoint(conn, els) {
  const ends = connectorEndpoints(conn, els);
  if (!ends) return null;
  return conn.animInvert ? ends.p2 : ends.p1;
}

/** Center element on ride anchor; returns {x,y} or null. */
export function riderPositionFor(conn, els, el) {
  const pt = rideAnchorPoint(conn, els);
  if (!pt || !el) return null;
  const w = el.w || 96;
  const h = el.h || 96;
  return { x: Math.round(pt.x - w / 2), y: Math.round(pt.y - h / 2) };
}

/** Element as shown on canvas (ride icons pinned to connector anchor). */
export function elWithRideDisplay(el, slide) {
  if (!el || !el.rideConnId || !slide) return el;
  const conn = (slide.connectors || []).find((c) => c && String(c.id) === String(el.rideConnId));
  if (!conn || conn.objHidden) return el;
  const pos = riderPositionFor(conn, slide.els || [], el);
  return pos ? { ...el, ...pos } : el;
}

export function findRiderForConn(connId, els) {
  if (!connId) return null;
  return (els || []).find((e) => e && String(e.rideConnId) === String(connId)) || null;
}

/** Serialize ride-along specs for a slide (preview / export / playback). */
export function collectSlideRideSpecs(slide) {
  const els = slide?.els || [];
  const conns = slide?.connectors || [];
  const out = [];
  els.forEach((el) => {
    if (!el || !el.rideConnId || el.objHidden) return;
    const conn = conns.find((c) => c && String(c.id) === String(el.rideConnId));
    if (!conn || conn.objHidden) return;
    const pathD = connectorPathFor(conn, els);
    if (!pathD) return;
    out.push({
      elId: String(el.id),
      d: pathD,
      duration: conn.rideDuration != null ? +conn.rideDuration : 3.5,
      gap: conn.rideInterval != null ? +conn.rideInterval : 0,
      invert: !!conn.animInvert,
      opacity: el.elOpacity != null ? el.elOpacity : 1,
      baseRot: el.rot || 0,
    });
  });
  return out;
}

/**
 * Preview/export: animate rider along path via getPointAtLength.
 * Returns cancel().
 */
export function startRideAnim(riderEl, pathD, opts = {}) {
  if (!riderEl || !pathD || typeof document === 'undefined') return () => {};
  const dur = Math.max(0.3, opts.duration || 3.5);
  const gap = Math.max(0, opts.gap || 0);
  const total = dur + gap;
  const inv = !!opts.invert;
  const baseOp = opts.opacity != null ? opts.opacity : 1;
  const baseRot = opts.baseRot || 0;
  const holder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  holder.setAttribute('width', '0');
  holder.setAttribute('height', '0');
  holder.style.cssText = 'position:absolute;left:-9999px;top:-9999px;overflow:hidden;';
  const sample = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  sample.setAttribute('d', pathD);
  holder.appendChild(sample);
  document.body.appendChild(holder);
  let len = 0;
  try {
    len = sample.getTotalLength();
  } catch (e) {
    len = 0;
  }
  if (!len || !Number.isFinite(len)) {
    document.body.removeChild(holder);
    return () => {};
  }
  const w = riderEl.offsetWidth || parseFloat(riderEl.style.width) || 0;
  const h = riderEl.offsetHeight || parseFloat(riderEl.style.height) || 0;
  riderEl.style.left = '0px';
  riderEl.style.top = '0px';
  riderEl.style.transformOrigin = 'center center';
  riderEl.style.willChange = 'transform,opacity';
  let raf = 0;
  let start = performance.now();
  let stopped = false;
  function pointAt(dist) {
    try {
      return sample.getPointAtLength(Math.max(0, Math.min(len, dist)));
    } catch (e) {
      return { x: 0, y: 0 };
    }
  }
  function angleAt(dist) {
    const eps = Math.max(0.75, Math.min(4, len * 0.002));
    let dA;
    let dB;
    if (!inv) {
      dA = Math.max(0, dist - eps * 0.5);
      dB = Math.min(len, dist + eps * 0.5);
    } else {
      dA = Math.min(len, dist + eps * 0.5);
      dB = Math.max(0, dist - eps * 0.5);
    }
    const a = pointAt(dA);
    const b = pointAt(dB);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return baseRot;
    return (Math.atan2(dy, dx) * 180) / Math.PI + baseRot;
  }
  function frame(now) {
    if (stopped || !riderEl.isConnected) return;
    const elapsed = ((now - start) / 1000) % total;
    let op = 0;
    let frac = inv ? 1 : 0;
    if (elapsed <= dur) {
      const p = elapsed / dur;
      frac = inv ? 1 - p : p;
      if (p < 0.15) op = baseOp * (p / 0.15);
      else if (p > 0.85) op = baseOp * ((1 - p) / 0.15);
      else op = baseOp;
    }
    const dist = frac * len;
    const pt = pointAt(dist);
    const ang = angleAt(dist);
    riderEl.style.opacity = String(op);
    riderEl.style.transform = `translate(${pt.x - w / 2}px, ${pt.y - h / 2}px) rotate(${ang}deg)`;
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    try {
      document.body.removeChild(holder);
    } catch (e) {}
  };
}
