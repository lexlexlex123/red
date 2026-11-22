/**
 * Motion-path geometry for moveTo / orbitTo (from js/18-motion.js).
 */

export function orbitRadius(a) {
  const ocx = a?.orbitCx || 0;
  const ocy = a?.orbitCy || 0;
  const d = Math.sqrt(ocx * ocx + ocy * ocy);
  return d > 0.5 ? d : a?.orbitR || 120;
}

/** End top-left after orbitTo from start position. */
export function orbitEndPos(a, startX, startY, ow, oh) {
  const ocx = a?.orbitCx || 0;
  const ocy = a?.orbitCy || 0;
  const r = orbitRadius(a);
  const dir = (a?.orbitDir || 'cw') === 'cw' ? 1 : -1;
  const deg = (a?.orbitDeg != null ? a.orbitDeg : 360) * dir;
  const ecx = startX + ow / 2;
  const ecy = startY + oh / 2;
  const cx = ecx + ocx;
  const cy = ecy + ocy;
  const sa = Math.atan2(ecy - cy, ecx - cx);
  const ea = sa + (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(ea) - ow / 2, y: cy + r * Math.sin(ea) - oh / 2 };
}

/** tx/ty are deltas from the previous motion end, not from the original box. */
export function moveToDelta(a) {
  return {
    tx: a?.tx != null && a.tx !== '' ? +a.tx || 0 : 0,
    ty: a?.ty != null && a.ty !== '' ? +a.ty || 0 : 0,
  };
}

export function moveToEndPos(a, startX, startY) {
  const d = moveToDelta(a);
  return {
    x: startX + d.tx,
    y: startY + d.ty,
  };
}

/** Cumulative start/end for one anim on an element, given prior motion chain. */
export function motionSegment(el, anim, priorOffset = { x: 0, y: 0 }) {
  const w = el.w || 0;
  const h = el.h || 0;
  const startX = (el.x || 0) + priorOffset.x;
  const startY = (el.y || 0) + priorOffset.y;
  if (anim?.name === 'orbitTo') {
    const end = orbitEndPos(anim, startX, startY, w, h);
    return {
      start: { x: startX, y: startY },
      end,
      center: {
        x: startX + w / 2 + (anim.orbitCx || 0),
        y: startY + h / 2 + (anim.orbitCy || 0),
      },
      r: orbitRadius(anim),
      kind: 'orbit',
    };
  }
  if (anim?.name === 'pathTo' || (anim?.pathPts && anim.pathPts.length)) {
    const pts = pathPtsOf(anim);
    const last = pts[pts.length - 1] || { x: 0, y: 0 };
    return {
      start: { x: startX, y: startY },
      end: { x: startX + last.x, y: startY + last.y },
      pts,
      kind: 'path',
    };
  }
  const end = moveToEndPos(anim, startX, startY);
  return {
    start: { x: startX, y: startY },
    end,
    kind: 'move',
  };
}

/** Build drawable motion segments for all moveTo/orbitTo on a slide element. */
export function collectMotionSegments(el) {
  if (!el || !Array.isArray(el.anims)) return [];
  const out = [];
  let offset = { x: 0, y: 0 };
  el.anims.forEach((a, ai) => {
    if (!a || (a.name !== 'moveTo' && a.name !== 'orbitTo' && a.name !== 'pathTo')) return;
    const seg = motionSegment(el, a, offset);
    out.push({ ...seg, ai, name: a.name, anim: a });
    offset = {
      x: seg.end.x - (el.x || 0),
      y: seg.end.y - (el.y || 0),
    };
  });
  return out;
}

export function wrapDeltaDeg(d) {
  let x = d;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

export function orbitTravelDeg(anim) {
  const n = anim?.orbitDeg != null ? +anim.orbitDeg : 360;
  return Math.max(1, Math.min(720, Number.isFinite(n) ? n : 360));
}

export function orbitDirSign(anim) {
  return (anim?.orbitDir || 'cw') === 'cw' ? 1 : -1;
}

/** Start angle (atan2, y-down) of the element center on the orbit. */
export function orbitStartAngle(anim, startX, startY, ow, oh) {
  const ecx = startX + ow / 2;
  const ecy = startY + oh / 2;
  const cx = ecx + (anim?.orbitCx || 0);
  const cy = ecy + (anim?.orbitCy || 0);
  return Math.atan2(ecy - cy, ecx - cx);
}

export function pointOnOrbit(cx, cy, r, startAng, deg, dir, t) {
  const a = startAng + ((deg * Math.PI) / 180) * dir * t;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), a };
}

/** SVG path of the travelled arc (y-down; dir +1 = clockwise). */
export function orbitArcPath(cx, cy, r, startAng, deg, dir) {
  const abs = Math.max(1, Math.abs(deg));
  const rad = r > 0.5 ? r : 1;
  const segs = Math.max(1, Math.ceil(abs / 179));
  const step = ((abs * Math.PI) / 180) * dir / segs;
  let a = startAng;
  let x = cx + rad * Math.cos(a);
  let y = cy + rad * Math.sin(a);
  let d = `M ${x.toFixed(2)} ${y.toFixed(2)}`;
  const sweep = dir > 0 ? 1 : 0;
  for (let i = 0; i < segs; i += 1) {
    a += step;
    x = cx + rad * Math.cos(a);
    y = cy + rad * Math.sin(a);
    d += ` A ${rad.toFixed(2)} ${rad.toFixed(2)} 0 0 ${sweep} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

/** Filled arrowhead pointing from (x1,y1) to (x2,y2). */
export function arrowHeadPoints(x1, y1, x2, y2, len = 16, width = 11) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  const px = -uy;
  const py = ux;
  const hw = width / 2;
  const bx = x2 - ux * len;
  const by = y2 - uy * len;
  return `${x2},${y2} ${bx + px * hw},${by + py * hw} ${bx - px * hw},${by - py * hw}`;
}

/** Arrow along the orbit tangent at fraction t of the travel. */
export function orbitArrowPoints(cx, cy, r, startAng, deg, dir, t = 0.92, size = 16) {
  const { x, y, a } = pointOnOrbit(cx, cy, r, startAng, deg, dir, t);
  const tangX = -Math.sin(a) * dir;
  const tangY = Math.cos(a) * dir;
  return arrowHeadPoints(x - tangX * size, y - tangY * size, x, y, size, size * 0.7);
}

/** Point on the segment inset from the end, for a visible move arrow. */
export function insetToward(x1, y1, x2, y2, inset) {
  const d = Math.hypot(x2 - x1, y2 - y1) || 1;
  const cut = Math.min(Math.max(0, inset), d * 0.45);
  const t = (d - cut) / d;
  return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
}

export const PATH_PRESETS = [
  { id: 'arc', ru: 'Дуга', en: 'Arc' },
  { id: 'zigzag', ru: 'Зигзаг', en: 'Zigzag' },
  { id: 'bounce', ru: 'Отскок', en: 'Bounce' },
  { id: 's', ru: 'S-кривая', en: 'S-curve' },
  { id: 'loop', ru: 'Петля', en: 'Loop' },
];

export function animEasingCss(easing) {
  if (easing === 'ease-in') return 'ease-in';
  if (easing === 'ease-out') return 'ease-out';
  if (easing === 'ease-in-out' || easing === 'ease') return 'ease-in-out';
  return 'linear';
}

export function pathPtsOf(anim) {
  const raw = anim?.pathPts;
  if (Array.isArray(raw) && raw.length) {
    return raw
      .map((p) => ({ x: +p.x || 0, y: +p.y || 0 }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  }
  if (anim?.name === 'moveTo' || anim?.name === 'pathTo') {
    const d = moveToDelta(anim);
    if (d.tx || d.ty) return [{ x: d.tx, y: d.ty }];
  }
  return [];
}

export function pathEndDelta(anim) {
  const pts = pathPtsOf(anim);
  if (!pts.length) return moveToDelta(anim);
  const last = pts[pts.length - 1];
  return { tx: last.x, ty: last.y };
}

export function pathPresetPts(id, spanX = 180, spanY = 80) {
  const x = spanX;
  switch (id) {
    case 'arc':
      return [
        { x: x * 0.35, y: -Math.abs(spanY) || -80 },
        { x, y: 0 },
      ];
    case 'zigzag':
      return [
        { x: x * 0.25, y: -60 },
        { x: x * 0.5, y: 60 },
        { x: x * 0.75, y: -40 },
        { x, y: 0 },
      ];
    case 'bounce':
      return [
        { x: x * 0.3, y: -90 },
        { x: x * 0.5, y: 10 },
        { x: x * 0.7, y: -45 },
        { x, y: 0 },
      ];
    case 's':
      return [
        { x: x * 0.25, y: -70 },
        { x: x * 0.5, y: 0 },
        { x: x * 0.75, y: 70 },
        { x, y: 0 },
      ];
    case 'loop':
      return [
        { x: x * 0.35, y: -80 },
        { x: x * 0.55, y: 0 },
        { x: x * 0.35, y: 80 },
        { x: 0, y: 20 },
        { x, y: 0 },
      ];
    default:
      return [{ x, y: 0 }];
  }
}

export function samplePathFrames(pts, steps = 48) {
  if (!pts || !pts.length) return [{ x: 0, y: 0 }];
  const segs = [{ x: 0, y: 0 }, ...pts];
  const lens = [];
  let total = 0;
  for (let i = 1; i < segs.length; i++) {
    const d = Math.hypot(segs[i].x - segs[i - 1].x, segs[i].y - segs[i - 1].y);
    lens.push(d);
    total += d;
  }
  if (total < 1e-3) return pts.map((p) => ({ x: p.x, y: p.y }));
  const out = [];
  for (let s = 0; s <= steps; s++) {
    const t = (s / steps) * total;
    let acc = 0;
    let hit = segs[segs.length - 1];
    for (let i = 1; i < segs.length; i++) {
      const d = lens[i - 1];
      if (acc + d >= t || i === segs.length - 1) {
        const u = d > 0 ? Math.min(1, (t - acc) / d) : 1;
        hit = {
          x: segs[i - 1].x + (segs[i].x - segs[i - 1].x) * u,
          y: segs[i - 1].y + (segs[i].y - segs[i - 1].y) * u,
        };
        break;
      }
      acc += d;
    }
    out.push(hit);
  }
  return out;
}

export function polylinePathD(startX, startY, pts) {
  let d = `M ${startX.toFixed(2)} ${startY.toFixed(2)}`;
  (pts || []).forEach((p) => {
    d += ` L ${(startX + p.x).toFixed(2)} ${(startY + p.y).toFixed(2)}`;
  });
  return d;
}
