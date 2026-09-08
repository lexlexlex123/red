/** Shape pointer hit-areas (legacy _shapeClipPath / _applyShapeClipPath). */

import { shapeRxPx } from '../shared/shapes.js';
import { getShapeMeta } from '../shared/shapesCatalog.js';

function trapPath(x, y, w, h, trapTop, trapBot) {
  const tl = Math.max(0, Math.min(w * 0.49, trapTop * w));
  const tr = Math.max(0, Math.min(w * 0.49, trapTop * w));
  const bl = Math.max(0, Math.min(w * 0.49, trapBot * w));
  const br = Math.max(0, Math.min(w * 0.49, trapBot * w));
  return `M ${x + tl},${y} L ${x + w - tr},${y} L ${x + w - br},${y + h} L ${x + bl},${y + h} Z`;
}

function pathToPolygon(pathStr, w, h, m) {
  const ew = Math.max(1, w - m * 2);
  const eh = Math.max(1, h - m * 2);
  const sx = ew / 90;
  const sy = eh / 90;
  const pts = [];
  const re = /[ML]\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/g;
  let match;
  while ((match = re.exec(pathStr)) !== null) {
    const px = Math.round((+match[1] - 5) * sx + m);
    const py = Math.round((+match[2] - 5) * sy + m);
    pts.push(`${px}px ${py}px`);
  }
  if (pts.length >= 3) return `polygon(${pts.join(', ')})`;
  return null;
}

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
    const fillD =
      strokeD +
      ` C ${(fc1x * w).toFixed(1)} ${(fc1y * h).toFixed(1)} ${(fc2x * w).toFixed(1)} ${(fc2y * h).toFixed(1)} ${(first.x * w).toFixed(1)} ${(first.y * h).toFixed(1)} Z`;
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

  if (special === 'rect' || id === 'rect' || id === 'roundrect') {
    const rx = shapeRxPx(el.rx, w, h);
    if (rx > 0) return `inset(${m}px round ${rx}px)`;
    return `inset(${m}px)`;
  }
  if (special === 'ellipse' || id === 'circle' || id === 'ellipse') {
    const mode = el.arcMode || 'full';
    if (mode === 'full') return `ellipse(${(w - m * 2) / 2}px ${(h - m * 2) / 2}px at 50% 50%)`;
    const a1 = el.arcStart != null ? +el.arcStart : 0;
    const a2 = el.arcEnd != null ? +el.arcEnd : 360;
    const rx = (w - m * 2) / 2;
    const ry = (h - m * 2) / 2;
    const cx = w / 2;
    const cy = h / 2;
    const pts = [];
    if (mode === 'sector') pts.push(`${cx}px ${cy}px`);
    const diff = ((a2 - a1) % 360 + 360) % 360 || 360;
    const steps = Math.max(12, Math.ceil(diff / 5));
    for (let i = 0; i <= steps; i++) {
      const ang = ((a1 + (diff * i) / steps - 90) * Math.PI) / 180;
      pts.push(`${(cx + rx * Math.cos(ang)).toFixed(1)}px ${(cy + ry * Math.sin(ang)).toFixed(1)}px`);
    }
    if (mode === 'sector') pts.push(`${cx}px ${cy}px`);
    return `polygon(${pts.join(', ')})`;
  }
  if (special === 'callout') return 'none';
  if (special === 'cloud') {
    const raw =
      'M 25 70 Q 5 70 5 55 Q 5 40 20 38 Q 18 20 35 18 Q 42 5 58 12 Q 70 5 80 15 Q 95 15 95 32 Q 98 50 88 58 Q 90 70 75 70 Z';
    return `path('${scalePath100(raw, w, h)}')`;
  }
  if (special === 'triangle') {
    return `polygon(${w / 2}px ${m}px, ${w - m}px ${h - m}px, ${m}px ${h - m}px)`;
  }
  if (special === 'diamond' || id === 'diamond') {
    return `polygon(${w / 2}px ${m}px, ${w - m}px ${h / 2}px, ${w / 2}px ${h - m}px, ${m}px ${h / 2}px)`;
  }
  if (special === 'hexagon' || id === 'hexagon') {
    const sides = 6;
    const cx = w / 2;
    const cy = h / 2;
    const rx = (w - m * 2) / 2;
    const ry = (h - m * 2) / 2;
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
      pts.push(`${(cx + rx * Math.cos(a)).toFixed(1)}px ${(cy + ry * Math.sin(a)).toFixed(1)}px`);
    }
    return `polygon(${pts.join(', ')})`;
  }
  if (special === 'trapezoid') {
    const tTop = el.trapTop != null ? +el.trapTop : 0.15;
    const tBot = el.trapBot != null ? +el.trapBot : 0.0;
    return `path('${trapPath(m, m, w - m * 2, h - m * 2, tTop, tBot)}')`;
  }
  if (special === 'polygon') {
    const sides = Math.max(3, Math.min(16, +(el.polySides || el.sides || 3)));
    const cx = w / 2;
    const cy = h / 2;
    const rx = (w - m * 2) / 2;
    const ry = (h - m * 2) / 2;
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
      pts.push(`${(cx + rx * Math.cos(a)).toFixed(1)}px ${(cy + ry * Math.sin(a)).toFixed(1)}px`);
    }
    return `polygon(${pts.join(', ')})`;
  }
  if (special === 'star') {
    const nRays = Math.max(4, Math.min(32, +(el.starRays || 5)));
    const innerR = Math.max(0.1, Math.min(0.9, +(el.starInner != null ? el.starInner : 0.45)));
    const srx = (w - m * 2) / 2;
    const sry = (h - m * 2) / 2;
    const pts = [];
    for (let i = 0; i < nRays * 2; i++) {
      const ang = (i / (nRays * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 1 : innerR;
      pts.push(`${(w / 2 + srx * r * Math.cos(ang)).toFixed(1)}px ${(h / 2 + sry * r * Math.sin(ang)).toFixed(1)}px`);
    }
    return `polygon(${pts.join(', ')})`;
  }
  if (special === 'parallelogram') {
    const ew = w - m * 2;
    const eh = h - m * 2;
    const skew = Math.max(-45, Math.min(45, +(el.paraSkew != null ? el.paraSkew : 20)));
    const off = Math.round((eh / 2) * Math.tan((skew * Math.PI) / 180));
    return `polygon(${m + off}px ${m}px, ${m + ew}px ${m}px, ${m + ew - off}px ${m + eh}px, ${m}px ${m + eh}px)`;
  }
  if (special === 'chevron') {
    const ew = w - m * 2;
    const eh = h - m * 2;
    const csk = Math.max(0, Math.min(45, el.chevSkew != null ? +el.chevSkew : 25));
    const cin = Math.max(0, Math.min(45, el.chevInner != null ? +el.chevInner : csk));
    const tip = Math.round((ew * csk) / 100);
    const ind = Math.round((ew * cin) / 100);
    const mid = m + Math.round(eh / 2);
    const isL = id === 'chevronLeft';
    const pts = isL
      ? [
          { x: m + ew, y: m },
          { x: m + tip, y: m },
          { x: m, y: mid },
          { x: m + tip, y: m + eh },
          { x: m + ew, y: m + eh },
          { x: m + ew - ind, y: mid },
        ]
      : [
          { x: m, y: m },
          { x: m + ew - tip, y: m },
          { x: m + ew, y: mid },
          { x: m + ew - tip, y: m + eh },
          { x: m, y: m + eh },
          { x: m + ind, y: mid },
        ];
    return `polygon(${pts.map((p) => `${p.x}px ${p.y}px`).join(', ')})`;
  }
  if (meta?.path) {
    return pathToPolygon(meta.path, w, h, m) || 'none';
  }
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
