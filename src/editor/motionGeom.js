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

export function moveToEndPos(a, startX, startY) {
  return {
    x: startX + (a?.tx != null ? +a.tx : 100),
    y: startY + (a?.ty != null ? +a.ty : 0),
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
    if (!a || (a.name !== 'moveTo' && a.name !== 'orbitTo')) return;
    const seg = motionSegment(el, a, offset);
    out.push({ ...seg, ai, name: a.name, anim: a });
    offset = {
      x: seg.end.x - (el.x || 0),
      y: seg.end.y - (el.y || 0),
    };
  });
  return out;
}
