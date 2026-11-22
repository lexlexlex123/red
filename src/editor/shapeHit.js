/** Shape pointer hit-areas (legacy _shapeClipPath / _applyShapeClipPath). */

import {
  shapeRxPx,
  ringPath,
  roundedPolygonPath,
  shapeOutlinePathD,
} from '../shared/shapes.js';
import { getShapeMeta } from '../shared/shapesCatalog.js';

/** Scale SVG path coords from viewBox 0..100 to element px. */
function scalePath100(d, w, h) {
  let isX = true;
  return String(d || '').replace(/-?[\d.]+/g, (num) => {
    const v = +num;
    const out = isX ? (v / 100) * w : (v / 100) * h;
    isX = !isX;
    return out.toFixed(2);
  });
}

function curveHasPaintedFill(el) {
  if (!el) return false;
  const f = el.fill;
  if (!f || f === 'none' || f === 'transparent') return false;
  return true;
}

function curveStrokeAndFill(el, w, h) {
  const cpts = el.curvePoints;
  if (cpts && cpts.length >= 2) {
    let strokeD = `M ${(cpts[0].x * w).toFixed(1)} ${(cpts[0].y * h).toFixed(1)}`;
    for (let ci = 1; ci < cpts.length; ci++) {
      const pp = cpts[ci - 1];
      const cp = cpts[ci];
      const c1x = pp.cp2x != null ? pp.cp2x : pp.x;
      const c1y = pp.cp2y != null ? pp.cp2y : pp.y;
      const c2x = cp.cp1x != null ? cp.cp1x : cp.x;
      const c2y = cp.cp1y != null ? cp.cp1y : cp.y;
      strokeD += ` C ${(c1x * w).toFixed(1)} ${(c1y * h).toFixed(1)} ${(c2x * w).toFixed(1)} ${(c2y * h).toFixed(1)} ${(cp.x * w).toFixed(1)} ${(cp.y * h).toFixed(1)}`;
    }
    // Open curves: stroke hit only. Closing the path for fill hit steals clicks
    // from lines that cross the imaginary chord / enclosed region.
    if (!curveHasPaintedFill(el)) return { strokeD, fillD: null };
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
    if (el.curveClosed) {
      strokeD += ` C ${(fc1x * w).toFixed(1)} ${(fc1y * h).toFixed(1)} ${(fc2x * w).toFixed(1)} ${(fc2y * h).toFixed(1)} ${(first.x * w).toFixed(1)} ${(first.y * h).toFixed(1)}`;
    }
    const fillD = `${strokeD} Z`;
    return { strokeD, fillD };
  }
  const strokeD = scalePath100('M 10 70 C 10 20 45 20 50 50 C 55 80 90 20 90 30', w, h);
  return { strokeD, fillD: null };
}

/**
 * CSS clip-path for shape silhouette (px coords), or null / 'none'.
 * Shared by hit-area overlay and backdrop blur.
 */
export function shapeClipPath(el) {
  if (!el) return null;
  const w = Math.max(1, +(el.w || 100));
  const h = Math.max(1, +(el.h || 60));
  const id = el.shape || 'rect';
  const meta = getShapeMeta(id);
  const special = meta?.special || id;
  const sw = el.sw === undefined ? 2 : +el.sw;
  // Match SVG stroke centering: geometry inset by sw/2 (not full sw).
  const m = sw > 0 ? sw / 2 : 0;

  if (Array.isArray(el.shapePts) && el.shapePts.length >= 3) {
    const pts = el.shapePts.map((p) => ({
      x: (+p.x || 0) * w,
      y: (+p.y || 0) * h,
    }));
    const rx = shapeRxPx(el.rx, w, h);
    // Match SVG fill: custom nodes still honor corner radius.
    if (rx > 0) {
      const d = roundedPolygonPath(pts, rx);
      return d ? `path('${d}')` : null;
    }
    return `polygon(${pts.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(', ')})`;
  }

  if (special === 'rect' || id === 'rect' || id === 'roundrect') {
    const rx = shapeRxPx(el.rx, w, h);
    if (rx > 0) return `inset(${m}px round ${rx}px)`;
    return `inset(${m}px)`;
  }
  if (special === 'noSymbol' || id === 'noSymbol') {
    const orx = (w - m * 2) / 2;
    const ory = (h - m * 2) / 2;
    return `path(evenodd, '${ringPath(w / 2, h / 2, orx, ory, el.ringInner)}')`;
  }
  if (special === 'ellipse' || id === 'circle' || id === 'ellipse') {
    const mode = el.arcMode || 'full';
    if (mode === 'full') return `ellipse(${(w - m * 2) / 2}px ${(h - m * 2) / 2}px at 50% 50%)`;
    const a1 = el.arcStart != null ? +el.arcStart : 0;
    const a2 = el.arcEnd != null ? +el.arcEnd : 270;
    const erx = (w - m * 2) / 2;
    const ery = (h - m * 2) / 2;
    const cx = w / 2;
    const cy = h / 2;
    const pts = [];
    if (mode === 'sector') pts.push(`${cx}px ${cy}px`);
    const diff = ((a2 - a1) % 360 + 360) % 360 || 360;
    const steps = Math.max(12, Math.ceil(diff / 5));
    for (let i = 0; i <= steps; i++) {
      const ang = ((a1 + (diff * i) / steps - 90) * Math.PI) / 180;
      pts.push(`${(cx + erx * Math.cos(ang)).toFixed(1)}px ${(cy + ery * Math.sin(ang)).toFixed(1)}px`);
    }
    if (mode === 'sector') pts.push(`${cx}px ${cy}px`);
    return `polygon(${pts.join(', ')})`;
  }
  if (special === 'callout') return 'none';

  // Triangle / polygon (hex by default) / star / arrow / catalog / cloud — same path as SVG, with rx.
  const outline = shapeOutlinePathD(el, { sw: m > 0 ? (el.sw === undefined ? 2 : +el.sw) : 0, w, h });
  if (outline) return `path('${outline}')`;
  return 'none';
}

/** Hit strategy for a shape element. */
export function shapeHitMode(el) {
  if (!el || el.type !== 'shape') return 'host';
  const id = el.shape || 'rect';
  const meta = getShapeMeta(id);
  if (id === 'line') return 'line';
  if (meta?.special === 'curve') return 'curve';
  if (meta?.special === 'callout') return 'host';
  if (meta?.special === 'cloud') return 'host';
  if (meta?.noFill) return 'box';
  const cp = shapeClipPath(el);
  if (!cp || cp === 'none') return 'host';
  return 'clip';
}

export function shapeLineHitSvg(el) {
  const w = Math.max(1, +(el.w || 100));
  const h = Math.max(1, +(el.h || 20));
  const sw = el.sw !== undefined ? +el.sw : 2;
  const hitSw = Math.max(20, sw + 16);
  const y = h / 2;
  return {
    w,
    h,
    hitSw,
    d: `M 0 ${y} L ${w} ${y}`,
  };
}

export function shapeCurveHitSvg(el) {
  const w = Math.max(1, +(el.w || 100));
  const h = Math.max(1, +(el.h || 60));
  const sw = el.sw != null ? +el.sw : 2;
  const hitSw = Math.max(20, sw + 16);
  const { strokeD, fillD } = curveStrokeAndFill(el, w, h);
  return { w, h, hitSw, strokeD, fillD };
}
