/**
 * Yellow geometry-adjustment handles (v7.1 parity from js/04-ui.js).
 * Positions are element-local relative to the box center; rotation/flip applied in canvas space.
 */

import { getShapeMeta } from '../shared/shapesCatalog.js';
import { normalizeMoonPhase } from '../shared/shapes.js';
import { calloutDefaultRoundRel } from '../shared/calloutGeom.js';

const HS = 6; // half of 12px handle

export function localToCanvas(el, lx, ly) {
  const W = Math.max(1, +el.w || 1);
  const H = Math.max(1, +el.h || 1);
  const cx = (+el.x || 0) + W / 2;
  const cy = (+el.y || 0) + H / 2;
  const rad = ((+el.rot || 0) * Math.PI) / 180;
  const cosr = Math.cos(rad);
  const sinr = Math.sin(rad);
  const fx = el.shapeFlipH ? -1 : 1;
  const fy = el.shapeFlipV ? -1 : 1;
  const qx = lx * fx;
  const qy = ly * fy;
  return {
    x: cx + qx * cosr - qy * sinr,
    y: cy + qx * sinr + qy * cosr,
  };
}

export function canvasToLocal(el, x, y) {
  const W = Math.max(1, +el.w || 1);
  const H = Math.max(1, +el.h || 1);
  const cx = (+el.x || 0) + W / 2;
  const cy = (+el.y || 0) + H / 2;
  const rad = ((+el.rot || 0) * Math.PI) / 180;
  const cosr = Math.cos(rad);
  const sinr = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  let lx = dx * cosr + dy * sinr;
  let ly = -dx * sinr + dy * cosr;
  if (el.shapeFlipH) lx = -lx;
  if (el.shapeFlipV) ly = -ly;
  return { lx, ly };
}

function starInnerPos(el, ir) {
  const H = Math.max(1, +el.h || 1);
  const r = Math.max(0.1, Math.min(0.9, +ir || 0.45));
  return { lx: 0, ly: -(H / 2) * r };
}

function paraSkewPos(el, skewDeg) {
  const W = Math.max(1, +el.w || 1);
  const H = Math.max(1, +el.h || 1);
  const sk = Math.max(-45, Math.min(45, +skewDeg || 20));
  const off = (H / 2) * Math.tan((sk * Math.PI) / 180);
  return { lx: -W / 2 + off, ly: -H / 2 };
}

function trapInsetPos(el, which, inset) {
  const W = Math.max(1, +el.w || 1);
  const H = Math.max(1, +el.h || 1);
  const t = Math.max(0, Math.min(0.49, +inset || 0));
  return { lx: -W / 2 + t * W, ly: which === 'top' ? -H / 2 : H / 2 };
}

function moonPhasePos(el, phase) {
  const W = Math.max(1, +el.w || 1);
  const p = normalizeMoonPhase(phase);
  return { lx: p * (W / 2), ly: 0 };
}

function chevOuterPos(el, skewPct) {
  const W = Math.max(1, +el.w || 1);
  const s = Math.max(0, Math.min(45, +skewPct || 25)) / 100;
  const isLeft = el.shape === 'chevronLeft';
  const lx = isLeft ? -W / 2 + W * s : W / 2 - W * s;
  return { lx, ly: 0 };
}

function chevInnerPos(el, innerPct) {
  const W = Math.max(1, +el.w || 1);
  const s = Math.max(0, Math.min(45, +innerPct || 25)) / 100;
  const isLeft = el.shape === 'chevronLeft';
  const lx = isLeft ? W / 2 - W * s : -W / 2 + W * s;
  return { lx, ly: 0 };
}

/** Arc endpoint in local coords (0° = top, CW) — v7.1 `_buildArcHandles`. */
function arcAnglePos(el, angleDeg) {
  const W = Math.max(1, +el.w || 1);
  const H = Math.max(1, +el.h || 1);
  const rad = ((+angleDeg || 0) - 90) * (Math.PI / 180);
  return { lx: (W / 2) * Math.cos(rad), ly: (H / 2) * Math.sin(rad) };
}

/**
 * @returns {Array<{id:string, kind:string, x:number, y:number, cursor:string, title:string, square?:boolean}>}
 */
export function listShapeAdjHandles(el) {
  if (!el || el.type !== 'shape' || el.locked) return [];
  const meta = getShapeMeta(el.shape || 'rect');
  const special = meta?.special || el.shape;
  const out = [];

  const push = (id, kind, local, cursor, title, extra) => {
    const p = localToCanvas(el, local.lx, local.ly);
    out.push({
      id,
      kind,
      x: p.x - HS,
      y: p.y - HS,
      cursor: cursor || 'ew-resize',
      title: title || '',
      ...(extra || {}),
    });
  };

  if (special === 'star') {
    const ir = el.starInner != null ? +el.starInner : 0.45;
    push('starInner', 'starInner', starInnerPos(el, ir), 'ns-resize', 'Внутр. радиус');
  }

  if (special === 'parallelogram') {
    const sk = el.paraSkew != null ? +el.paraSkew : 20;
    push('paraSkew', 'paraSkew', paraSkewPos(el, sk), 'ew-resize', 'Наклон');
  }

  if (special === 'trapezoid') {
    const top = el.trapTop != null ? +el.trapTop : 0.15;
    const bot = el.trapBot != null ? +el.trapBot : 0;
    push('trapTop', 'trapTop', trapInsetPos(el, 'top', top), 'ew-resize', 'Сужение сверху');
    push('trapBot', 'trapBot', trapInsetPos(el, 'bot', bot), 'ew-resize', 'Сужение снизу');
  }

  if (special === 'moon') {
    push('moonPhase', 'moonPhase', moonPhasePos(el, el.moonPhase), 'ew-resize', 'Фаза луны');
  }

  if (special === 'chevron') {
    const skew = el.chevSkew != null ? +el.chevSkew : 25;
    const inner = el.chevInner != null ? +el.chevInner : skew;
    push('chevSkew', 'chevSkew', chevOuterPos(el, skew), 'ew-resize', 'Внешний угол', { square: true });
    push('chevInner', 'chevInner', chevInnerPos(el, inner), 'ew-resize', 'Внутренний угол', { square: true });
  }

  if (special === 'ellipse' || el.shape === 'circle' || el.shape === 'ellipse') {
    const mode = el.arcMode || 'full';
    if (mode !== 'full') {
      const a1 = el.arcStart != null ? +el.arcStart : 0;
      const a2 = el.arcEnd != null ? +el.arcEnd : 270;
      push('arcStart', 'arcStart', arcAnglePos(el, a1), 'crosshair', 'Начало дуги');
      push('arcEnd', 'arcEnd', arcAnglePos(el, a2), 'crosshair', 'Конец дуги');
    }
  }

  if (special === 'callout') {
    const H = Math.max(1, +el.h || 1);
    const tipX = el.tailX != null ? +el.tailX : 0;
    const tipY = el.tailY != null ? +el.tailY : H / 2 + 30;
    let roundX = el.tailRoundX;
    let roundY = el.tailRoundY;
    if (roundX == null || roundY == null) {
      const def = calloutDefaultRoundRel(tipX, tipY);
      if (roundX == null) roundX = def.tailRoundX;
      if (roundY == null) roundY = def.tailRoundY;
    }
    push('tailTip', 'tailTip', { lx: tipX, ly: tipY }, 'crosshair', 'Хвост');
    push('tailRound', 'tailRound', { lx: +roundX, ly: +roundY }, 'crosshair', 'Изгиб хвоста');
  }

  return out;
}

/** Compute patch while dragging a yellow adj handle. */
export function patchFromAdjDrag(el, kind, canvasX, canvasY) {
  if (!el || !kind) return null;
  const W = Math.max(1, +el.w || 1);
  const H = Math.max(1, +el.h || 1);
  const { lx, ly } = canvasToLocal(el, canvasX, canvasY);
  const isLeft = el.shape === 'chevronLeft';

  if (kind === 'starInner') {
    const dist = Math.hypot(lx / (W / 2), ly / (H / 2));
    const v = Math.round(Math.max(0.1, Math.min(0.9, dist)) * 100) / 100;
    return { starInner: v };
  }

  if (kind === 'paraSkew') {
    const off = lx + W / 2;
    let skewNew = (Math.atan2(off, H / 2) * 180) / Math.PI;
    skewNew = Math.max(-45, Math.min(45, Math.round(skewNew)));
    return { paraSkew: skewNew };
  }

  if (kind === 'trapTop' || kind === 'trapBot') {
    let inset = (lx + W / 2) / W;
    inset = Math.max(0, Math.min(0.49, Math.round(inset * 100) / 100));
    return kind === 'trapTop' ? { trapTop: inset } : { trapBot: inset };
  }

  if (kind === 'moonPhase') {
    let p = lx / (W / 2);
    p = Math.max(-1, Math.min(1, p));
    return { moonPhase: Math.round(p * 100) / 100 };
  }

  if (kind === 'chevSkew') {
    const raw = isLeft ? Math.round(((lx + W / 2) / W) * 100) : Math.round(((W / 2 - lx) / W) * 100);
    return { chevSkew: Math.max(0, Math.min(45, raw)) };
  }

  if (kind === 'chevInner') {
    const raw = isLeft ? Math.round(((W / 2 - lx) / W) * 100) : Math.round(((lx + W / 2) / W) * 100);
    return { chevInner: Math.max(0, Math.min(45, raw)) };
  }

  if (kind === 'arcStart' || kind === 'arcEnd') {
    // 0 = top, clockwise — v7.1
    let ang = (Math.atan2(ly / (H / 2), lx / (W / 2)) * 180) / Math.PI + 90;
    ang = ((ang % 360) + 360) % 360;
    ang = Math.round(ang);
    return kind === 'arcStart' ? { arcStart: ang } : { arcEnd: ang };
  }

  if (kind === 'tailTip') {
    return {
      tailX: Math.round(lx * 10) / 10,
      tailY: Math.round(ly * 10) / 10,
    };
  }

  if (kind === 'tailRound') {
    return {
      tailRoundX: Math.round(lx * 10) / 10,
      tailRoundY: Math.round(ly * 10) / 10,
    };
  }

  return null;
}
