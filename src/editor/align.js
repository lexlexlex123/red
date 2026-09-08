/**
 * Align / distribute geometry (legacy js/15-align.js, without ink).
 * Groups move as one unit; bounds are rotation-aware AABBs.
 */

import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';

export function rotAABB(el) {
  const l = el.x || 0;
  const t = el.y || 0;
  const w = el.w || 0;
  const h = el.h || 0;
  const rot = ((+el.rot || 0) * Math.PI) / 180;
  if (!rot) {
    return { l, t, r: l + w, b: t + h, cx: l + w / 2, cy: t + h / 2, w, h };
  }
  const cx = l + w / 2;
  const cy = t + h / 2;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const corners = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([dx, dy]) => ({
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }));
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const L = Math.min(...xs);
  const T = Math.min(...ys);
  const R = Math.max(...xs);
  const B = Math.max(...ys);
  return { l: L, t: T, r: R, b: B, cx, cy, w: R - L, h: B - T };
}

export function unionRotAABB(els) {
  const bb = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
  (els || []).forEach((el) => {
    const rb = rotAABB(el);
    bb.l = Math.min(bb.l, rb.l);
    bb.t = Math.min(bb.t, rb.t);
    bb.r = Math.max(bb.r, rb.r);
    bb.b = Math.max(bb.b, rb.b);
  });
  bb.cx = (bb.l + bb.r) / 2;
  bb.cy = (bb.t + bb.b) / 2;
  bb.w = bb.r - bb.l;
  bb.h = bb.b - bb.t;
  return bb;
}

/** Expand selection so any group member pulls in the whole group. */
export function expandGroupMembers(selected, allEls) {
  const list = (allEls || []).filter((e) => e && !e._isDecor && e.type !== 'inkhost');
  const byId = new Map(list.map((e) => [String(e.id), e]));
  const seen = new Set();
  const out = [];
  const expandedGids = new Set();
  (selected || []).forEach((el) => {
    if (!el) return;
    const gid = el.groupId;
    if (gid) {
      if (expandedGids.has(String(gid))) return;
      expandedGids.add(String(gid));
      list.forEach((ge) => {
        if (String(ge.groupId) === String(gid) && !seen.has(String(ge.id))) {
          seen.add(String(ge.id));
          out.push(ge);
        }
      });
    } else if (!seen.has(String(el.id))) {
      seen.add(String(el.id));
      const full = byId.get(String(el.id)) || el;
      out.push(full);
    }
  });
  return out;
}

/** Partition into move units: each group is one unit. */
export function partitionAlignUnits(targets) {
  const byGroup = new Map();
  const units = [];
  (targets || []).forEach((el) => {
    const gid = el.groupId;
    if (gid) {
      const key = String(gid);
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key).push(el);
    } else {
      const rb = rotAABB(el);
      units.push({ members: [el], bb: rb });
    }
  });
  byGroup.forEach((members) => {
    const rb = members.length > 1 ? unionRotAABB(members) : rotAABB(members[0]);
    units.push({ members, bb: rb });
  });
  return units;
}

function deltaForUnit(mode, ub, ref) {
  let dx = 0;
  let dy = 0;
  if (mode === 'left') dx = ref.l - ub.l;
  else if (mode === 'right') dx = ref.r - ub.r;
  else if (mode === 'top') dy = ref.t - ub.t;
  else if (mode === 'bottom') dy = ref.b - ub.b;
  else if (mode === 'centerH') dx = ref.mx - ub.cx;
  else if (mode === 'centerV') dy = ref.my - ub.cy;
  else if (mode === 'center') {
    dx = ref.mx - ub.cx;
    dy = ref.my - ub.cy;
  }
  return { dx, dy };
}

/**
 * @returns {{ patches: Record<string,{x?:number,y?:number}>, toast?: string } | null}
 */
export function computeAlignPatches(els, allEls, mode, scope, canvasW, canvasH) {
  const targets = expandGroupMembers(els, allEls).filter((e) => e && !e._isDecor && e.type !== 'inkhost');
  if (!targets.length) return null;
  let units = partitionAlignUnits(targets);
  let useScope = scope === 'slide' || scope === 'sel' ? scope : 'sel';
  if ((mode === 'centerH' || mode === 'centerV' || mode === 'center') && useScope === 'sel' && units.length < 2) {
    useScope = 'slide';
  }

  const selBB = unionRotAABB(targets);
  const W = canvasW > 0 ? canvasW : DEFAULT_CANVAS_W;
  const H = canvasH > 0 ? canvasH : DEFAULT_CANVAS_H;
  const ref = {
    l: useScope === 'slide' ? 0 : selBB.l,
    t: useScope === 'slide' ? 0 : selBB.t,
    r: useScope === 'slide' ? W : selBB.r,
    b: useScope === 'slide' ? H : selBB.b,
  };
  ref.mx = (ref.l + ref.r) / 2;
  ref.my = (ref.t + ref.b) / 2;

  const patches = {};
  units.forEach((unit) => {
    const { dx, dy } = deltaForUnit(mode, unit.bb, ref);
    if (!dx && !dy) return;
    unit.members.forEach((el) => {
      const patch = {};
      if (dx) patch.x = Math.round((el.x || 0) + dx);
      if (dy) patch.y = Math.round((el.y || 0) + dy);
      if (Object.keys(patch).length) patches[el.id] = patch;
    });
  });
  return { patches };
}

/**
 * @returns {{ patches: Record<string,{x?:number,y?:number}>, toast?: string } | null}
 */
export function computeDistributePatches(els, allEls, axis, scope, canvasW, canvasH) {
  const targets = expandGroupMembers(els, allEls).filter((e) => e && !e._isDecor && e.type !== 'inkhost');
  const units = partitionAlignUnits(targets);
  if (units.length < 2) return { patches: {}, toast: 'need2' };

  const W = canvasW > 0 ? canvasW : DEFAULT_CANVAS_W;
  const H = canvasH > 0 ? canvasH : DEFAULT_CANVAS_H;
  const horiz = axis === 'h';
  const patches = {};

  if (horiz) {
    const sorted = [...units].sort((a, b) => a.bb.l - b.bb.l);
    const minX = scope === 'slide' ? 0 : sorted[0].bb.l;
    const maxX = scope === 'slide' ? W : sorted[sorted.length - 1].bb.r;
    const totalW = sorted.reduce((s, u) => s + u.bb.w, 0);
    const gap = (maxX - minX - totalW) / (sorted.length - 1);
    let x = minX;
    sorted.forEach((u) => {
      const dx = x - u.bb.l;
      u.members.forEach((el) => {
        if (dx) patches[el.id] = { ...(patches[el.id] || {}), x: Math.round((el.x || 0) + dx) };
      });
      x += u.bb.w + gap;
    });
  } else {
    const sorted = [...units].sort((a, b) => a.bb.t - b.bb.t);
    const minY = scope === 'slide' ? 0 : sorted[0].bb.t;
    const maxY = scope === 'slide' ? H : sorted[sorted.length - 1].bb.b;
    const totalH = sorted.reduce((s, u) => s + u.bb.h, 0);
    const gap = (maxY - minY - totalH) / (sorted.length - 1);
    let y = minY;
    sorted.forEach((u) => {
      const dy = y - u.bb.t;
      u.members.forEach((el) => {
        if (dy) patches[el.id] = { ...(patches[el.id] || {}), y: Math.round((el.y || 0) + dy) };
      });
      y += u.bb.h + gap;
    });
  }
  return { patches };
}
