/**
 * Line endpoint junctions — ported from js/04-ui.js
 * (`lineJoin` on elements + `lineJunctions` on the slide).
 */

import {
  lineCanvasEnds,
  applyLineFromCanvasEnds,
  setLineEndCanvasPinned,
  migrateLineCapGeometry,
} from './lineGeom.js';

export function ensureLineJoin(d) {
  if (!d) return { a: null, b: null };
  if (!d.lineJoin) d.lineJoin = { a: null, b: null };
  if (!('a' in d.lineJoin)) d.lineJoin.a = null;
  if (!('b' in d.lineJoin)) d.lineJoin.b = null;
  return d.lineJoin;
}

export function isLegacyJoinRef(ref) {
  return !!(ref && typeof ref === 'object' && ref.id && (ref.end === 'a' || ref.end === 'b'));
}

export function endJunctionId(d, which) {
  if (!d || !d.lineJoin) return null;
  const ref = d.lineJoin[which];
  return typeof ref === 'string' && ref ? ref : null;
}

export function ensureSlideJunctions(slide) {
  if (!slide) return {};
  if (!slide.lineJunctions) slide.lineJunctions = {};
  return slide.lineJunctions;
}

function newJunctionId() {
  return 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function findLineData(els, id) {
  return (els || []).find((e) => e && String(e.id) === String(id) && e.shape === 'line') || null;
}

function addMemberToJunction(juncs, jid, member) {
  if (!jid || !member) return;
  if (!juncs[jid]) juncs[jid] = [];
  if (!juncs[jid].some((m) => m.id === member.id && m.end === member.end)) {
    juncs[jid].push({ id: member.id, end: member.end });
  }
}

export function getJunctionMembers(slide, jid) {
  if (!jid || !slide) return [];
  const juncs = ensureSlideJunctions(slide);
  return (juncs[jid] || []).slice();
}

function migrateLegacyJoinPair(slide, d, which) {
  if (!d || !d.lineJoin) return;
  const ref = d.lineJoin[which];
  if (!isLegacyJoinRef(ref)) return;
  const els = slide.els || [];
  const od = findLineData(els, ref.id);
  if (!od) {
    d.lineJoin[which] = null;
    return;
  }
  ensureLineJoin(od);
  const back = od.lineJoin[ref.end];
  if (typeof back === 'string') {
    d.lineJoin[which] = back;
    addMemberToJunction(ensureSlideJunctions(slide), back, { id: d.id, end: which });
    return;
  }
  const jid = newJunctionId();
  ensureSlideJunctions(slide)[jid] = [
    { id: d.id, end: which },
    { id: od.id, end: ref.end },
  ];
  d.lineJoin[which] = jid;
  od.lineJoin[ref.end] = jid;
}

export function migrateSlideLineJoins(slide) {
  if (!slide) return;
  (slide.els || []).forEach((d) => {
    if (!d || d.shape !== 'line') return;
    ensureLineJoin(d);
    ['a', 'b'].forEach((w) => migrateLegacyJoinPair(slide, d, w));
  });
}

function dissolveJunctionIfSmall(slide, jid) {
  if (!jid) return;
  const juncs = ensureSlideJunctions(slide);
  const members = juncs[jid] || [];
  if (members.length >= 2) return;
  members.forEach((m) => {
    const md = findLineData(slide.els, m.id);
    if (md && md.lineJoin && md.lineJoin[m.end] === jid) {
      md.lineJoin[m.end] = null;
    }
  });
  delete juncs[jid];
}

export function clearLineJoin(slide, d, which) {
  if (!d || !d.lineJoin || !d.lineJoin[which]) return;
  migrateSlideLineJoins(slide);
  const live = findLineData(slide.els, d.id) || d;
  ensureLineJoin(live);
  const ref = live.lineJoin[which];
  if (isLegacyJoinRef(ref)) {
    live.lineJoin[which] = null;
    const other = findLineData(slide.els, ref.id);
    if (other) {
      ensureLineJoin(other);
      const back = other.lineJoin[ref.end];
      if (isLegacyJoinRef(back) && String(back.id) === String(live.id) && back.end === which) {
        other.lineJoin[ref.end] = null;
      } else if (typeof back === 'string') {
        clearLineJoin(slide, other, ref.end);
        return;
      }
    }
    if (d !== live) d.lineJoin = live.lineJoin;
    return;
  }
  if (typeof ref !== 'string') {
    live.lineJoin[which] = null;
    if (d !== live) d.lineJoin = live.lineJoin;
    return;
  }
  const jid = ref;
  live.lineJoin[which] = null;
  const juncs = ensureSlideJunctions(slide);
  if (juncs[jid]) {
    juncs[jid] = juncs[jid].filter((m) => !(String(m.id) === String(live.id) && m.end === which));
  }
  dissolveJunctionIfSmall(slide, jid);
  if (d !== live) d.lineJoin = live.lineJoin;
}

function mergeJunctions(slide, keepJid, dropJid) {
  if (!keepJid || !dropJid || keepJid === dropJid) return keepJid;
  const juncs = ensureSlideJunctions(slide);
  const drop = (juncs[dropJid] || []).slice();
  drop.forEach((m) => {
    const md = findLineData(slide.els, m.id);
    if (!md) return;
    ensureLineJoin(md)[m.end] = keepJid;
    addMemberToJunction(juncs, keepJid, m);
  });
  delete juncs[dropJid];
  return keepJid;
}

export function joinLineEnds(slide, d1, end1, d2, end2) {
  if (!slide || !d1 || !d2 || String(d1.id) === String(d2.id)) return null;
  if (end1 !== 'a' && end1 !== 'b') return null;
  if (end2 !== 'a' && end2 !== 'b') return null;
  migrateSlideLineJoins(slide);
  const live1 = findLineData(slide.els, d1.id) || d1;
  const live2 = findLineData(slide.els, d2.id) || d2;
  ensureLineJoin(live1);
  ensureLineJoin(live2);
  const j1 = endJunctionId(live1, end1);
  const j2 = endJunctionId(live2, end2);
  let jid = null;
  if (j1 && j2 && j1 === j2) {
    jid = j1;
  } else if (j1 && j2) {
    jid = mergeJunctions(slide, j1, j2);
  } else if (j1) {
    if (live2.lineJoin[end2]) clearLineJoin(slide, live2, end2);
    live2.lineJoin[end2] = j1;
    addMemberToJunction(ensureSlideJunctions(slide), j1, { id: live2.id, end: end2 });
    jid = j1;
  } else if (j2) {
    if (live1.lineJoin[end1]) clearLineJoin(slide, live1, end1);
    live1.lineJoin[end1] = j2;
    addMemberToJunction(ensureSlideJunctions(slide), j2, { id: live1.id, end: end1 });
    jid = j2;
  } else {
    if (live1.lineJoin[end1]) clearLineJoin(slide, live1, end1);
    if (live2.lineJoin[end2]) clearLineJoin(slide, live2, end2);
    jid = newJunctionId();
    ensureSlideJunctions(slide)[jid] = [];
    live1.lineJoin[end1] = jid;
    live2.lineJoin[end2] = jid;
    addMemberToJunction(ensureSlideJunctions(slide), jid, { id: live1.id, end: end1 });
    addMemberToJunction(ensureSlideJunctions(slide), jid, { id: live2.id, end: end2 });
  }
  if (d1 !== live1) d1.lineJoin = live1.lineJoin;
  if (d2 !== live2) d2.lineJoin = live2.lineJoin;
  return jid;
}

export function repairLineJoins(slide, d) {
  migrateSlideLineJoins(slide);
  if (!d || d.shape !== 'line') return;
  ensureLineJoin(d);
  const juncs = ensureSlideJunctions(slide);
  ['a', 'b'].forEach((which) => {
    const jid = d.lineJoin[which];
    if (!jid) return;
    if (typeof jid !== 'string') {
      d.lineJoin[which] = null;
      return;
    }
    addMemberToJunction(juncs, jid, { id: d.id, end: which });
    juncs[jid] = (juncs[jid] || []).filter((m) => {
      const md = findLineData(slide.els, m.id);
      return !!(md && md.lineJoin && md.lineJoin[m.end] === jid);
    });
    if ((juncs[jid] || []).length < 2) {
      dissolveJunctionIfSmall(slide, jid);
      if (d.lineJoin[which] === jid) d.lineJoin[which] = null;
    }
  });
}

export function lineEndIsJoined(slide, d, which) {
  if (!d) return false;
  repairLineJoins(slide, d);
  const jid = endJunctionId(d, which);
  return !!(jid && getJunctionMembers(slide, jid).length >= 2);
}

/** Read-only joined check for render (no slide mutation). */
export function lineEndLooksJoined(slide, d, which) {
  if (!d?.lineJoin) return false;
  const ref = d.lineJoin[which];
  if (typeof ref === 'string' && ref) {
    const members = (slide?.lineJunctions && slide.lineJunctions[ref]) || [];
    return members.length >= 2;
  }
  return isLegacyJoinRef(ref);
}

/** Patch map to move every junction member's end to pt (skip optional). */
export function patchesMoveJunctionTo(slide, jid, pt, skipId, skipEnd) {
  if (!jid || !pt) return {};
  const patches = {};
  getJunctionMembers(slide, jid).forEach((m) => {
    if (skipId && String(m.id) === String(skipId) && m.end === skipEnd) return;
    const md = findLineData(slide.els, m.id);
    if (!md) return;
    let el = md;
    if (el._lineCapV !== 2) {
      const mig = migrateLineCapGeometry(el);
      if (mig) el = { ...el, ...mig };
    }
    const ends = lineCanvasEnds(el);
    const other = m.end === 'a' ? 'b' : 'a';
    patches[m.id] = setLineEndCanvasPinned(el, m.end, pt, ends[other]);
  });
  return patches;
}

export function coalesceJunction(slide, jid, preferredPt) {
  if (!jid) return null;
  const members = getJunctionMembers(slide, jid);
  if (members.length < 2) return null;
  let pt = preferredPt ? { x: preferredPt.x, y: preferredPt.y } : null;
  if (!pt) {
    let sx = 0;
    let sy = 0;
    let n = 0;
    members.forEach((m) => {
      const md = findLineData(slide.els, m.id);
      if (!md) return;
      const e = lineCanvasEnds(md)[m.end];
      if (!e) return;
      sx += e.x;
      sy += e.y;
      n += 1;
    });
    if (!n) return null;
    pt = { x: sx / n, y: sy / n };
  }
  pt = { x: Math.round(pt.x * 100) / 100, y: Math.round(pt.y * 100) / 100 };
  return { pt, patches: patchesMoveJunctionTo(slide, jid, pt) };
}

/** After translating line bodies, glue junction mates to the moved ends. */
export function patchesSyncJoinsAfterMove(slide, movedIds) {
  const idSet = new Set((movedIds || []).map(String));
  if (!idSet.size) return {};
  migrateSlideLineJoins(slide);
  const patches = {};
  const done = new Set();
  (slide.els || []).forEach((d) => {
    if (!d || d.shape !== 'line' || !idSet.has(String(d.id)) || !d.lineJoin) return;
    repairLineJoins(slide, d);
    const myEnds = lineCanvasEnds(d);
    ['a', 'b'].forEach((which) => {
      const jid = endJunctionId(d, which);
      if (!jid || done.has(jid)) return;
      done.add(jid);
      const c = coalesceJunction(slide, jid, myEnds[which]);
      if (c) Object.assign(patches, c.patches);
    });
  });
  return patches;
}

function closestOnSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-8) return { x: ax, y: ay };
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + t * dx, y: ay + t * dy };
}

/** Snap canvas point to nearby line endpoints / segments. */
export function snapLineEpToGeometry(slide, pt, excludeId, threshold = 14) {
  if (!slide || !pt) return null;
  let best = null;
  let bestD = Math.max(threshold, 16);

  function consider(cand, meta) {
    if (!cand) return;
    const dist = Math.hypot(pt.x - cand.x, pt.y - cand.y);
    if (dist < bestD) {
      bestD = dist;
      best = { x: cand.x, y: cand.y, dist, ...meta };
    }
  }

  (slide.els || []).forEach((d) => {
    if (!d || d._isDecor || String(d.id) === String(excludeId) || d.type !== 'shape' || d.shape !== 'line') {
      return;
    }
    const ends = lineCanvasEnds(d);
    consider(ends.a, { kind: 'endpoint', targetId: d.id, targetEnd: 'a' });
    consider(ends.b, { kind: 'endpoint', targetId: d.id, targetEnd: 'b' });
  });
  if (best && best.kind === 'endpoint') return best;

  best = null;
  bestD = threshold;
  (slide.els || []).forEach((d) => {
    if (!d || d._isDecor || String(d.id) === String(excludeId) || d.type !== 'shape') return;
    if (d.shape !== 'line') return;
    const ends = lineCanvasEnds(d);
    consider(closestOnSeg(pt.x, pt.y, ends.a.x, ends.a.y, ends.b.x, ends.b.y), {
      kind: 'segment',
      targetId: d.id,
    });
  });
  return best;
}

/** Collect mate fixed-ends for dragging a joined endpoint. */
export function collectMateDragState(slide, d, which) {
  repairLineJoins(slide, d);
  const jid = endJunctionId(d, which);
  if (!jid) return { jid: null, mates: [] };
  const mates = [];
  getJunctionMembers(slide, jid).forEach((m) => {
    if (String(m.id) === String(d.id) && m.end === which) return;
    const partner = findLineData(slide.els, m.id);
    if (!partner) return;
    let el = partner;
    if (el._lineCapV !== 2) {
      const mig = migrateLineCapGeometry(el);
      if (mig) el = { ...el, ...mig };
    }
    const pe = lineCanvasEnds(el);
    const pOther = m.end === 'a' ? 'b' : 'a';
    mates.push({
      id: partner.id,
      end: m.end,
      fixed: { x: pe[pOther].x, y: pe[pOther].y },
      start: { ...el },
    });
  });
  return { jid, mates };
}

export function patchLineEndPinned(el, which, pt, fixedOpposite) {
  return setLineEndCanvasPinned(el, which, pt, fixedOpposite);
}

/** Apply geometry for primary + mates at one canvas point. */
export function patchesDragJunction(primary, which, fixed, mates, pt) {
  const patches = {};
  patches[primary.id] = setLineEndCanvasPinned(primary, which, pt, fixed);
  (mates || []).forEach((ms) => {
    const live = ms.start;
    patches[ms.id] = setLineEndCanvasPinned(live, ms.end, pt, ms.fixed);
  });
  return patches;
}
