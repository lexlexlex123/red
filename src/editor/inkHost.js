/**
 * Ink hosts — drawing strokes/fills as layerable els (like v7.1 inkhost).
 */

import { strokeBBox, fillBBox, isInkFill } from './inkSelect.js';

export function inkItemBBox(item) {
  if (!item) return null;
  return isInkFill(item) ? fillBBox(item) : strokeBBox(item);
}

export function inkItemsBBox(items) {
  let u = null;
  for (let i = 0; i < (items || []).length; i++) {
    const bb = inkItemBBox(items[i]);
    if (!bb) continue;
    if (!u) {
      u = { x: bb.x, y: bb.y, w: bb.w, h: bb.h };
      continue;
    }
    const x2 = Math.max(u.x + u.w, bb.x + bb.w);
    const y2 = Math.max(u.y + u.h, bb.y + bb.h);
    u.x = Math.min(u.x, bb.x);
    u.y = Math.min(u.y, bb.y);
    u.w = x2 - u.x;
    u.h = y2 - u.y;
  }
  return u;
}

export function ensureInkZOrders(slide) {
  if (!slide) return;
  const ink = slide.ink || [];
  const fills = slide.inkFills || [];
  let need = false;
  for (let i = 0; i < fills.length; i++) {
    if (fills[i] && fills[i].z == null) {
      need = true;
      break;
    }
  }
  if (!need) {
    for (let i = 0; i < ink.length; i++) {
      if (ink[i] && ink[i].z == null) {
        need = true;
        break;
      }
    }
  }
  if (!need) return;
  let z = 0;
  fills.forEach((f) => {
    if (f) f.z = z++;
  });
  ink.forEach((s) => {
    if (s) s.z = z++;
  });
}

export function nextInkZ(slide) {
  ensureInkZOrders(slide);
  let max = -1;
  (slide?.ink || []).forEach((s) => {
    if (s && s.z != null && +s.z > max) max = +s.z;
  });
  (slide?.inkFills || []).forEach((f) => {
    if (f && f.z != null && +f.z > max) max = +f.z;
  });
  return max + 1;
}

export function hostedInkIdSet(slide) {
  const set = new Set();
  (slide?.els || []).forEach((el) => {
    if (el?.type !== 'inkhost') return;
    (el.inkIds || []).forEach((id) => {
      if (id != null) set.add(String(id));
    });
  });
  return set;
}

function findHostData(slide, gid, inkIds) {
  const els = slide.els || [];
  if (gid) {
    const byG = els.find((d) => d && d.type === 'inkhost' && d.groupId === gid);
    if (byG) return byG;
  }
  const set = new Set((inkIds || []).map(String));
  if (!set.size) return null;
  return (
    els.find((d) => {
      if (!d || d.type !== 'inkhost' || !d.inkIds) return false;
      return d.inkIds.some((id) => set.has(String(id)));
    }) || null
  );
}

function removeOtherHostsForInkIds(slide, inkIds, keepHostId) {
  const set = new Set((inkIds || []).map(String));
  slide.els = (slide.els || []).filter((d) => {
    if (!d || d.type !== 'inkhost' || d.id === keepHostId) return true;
    const ids = d.inkIds || [];
    return !ids.some((id) => set.has(String(id)));
  });
}

/**
 * Create/update an inkhost el for the given ink items. Mutates `slide`.
 * @param {(prefix?: string) => string} nextIdFn
 * @param {{ layer?: 'front'|'back' }} [opts] — marker goes `back` (under objects); brush/neon `front`.
 */
export function ensureInkHostForItems(slide, items, gid, nextIdFn, opts = {}) {
  if (!slide || !items?.length || typeof nextIdFn !== 'function') return null;
  const inkIds = items.map((x) => x?.id).filter((id) => id != null);
  if (!inkIds.length) return null;
  const bb = inkItemsBBox(items);
  if (!bb) return null;
  let host = findHostData(slide, gid || null, inkIds);
  if (!host) {
    host = {
      id: nextIdFn('e'),
      type: 'inkhost',
      x: Math.round(bb.x),
      y: Math.round(bb.y),
      w: Math.max(1, Math.round(bb.w)),
      h: Math.max(1, Math.round(bb.h)),
      groupId: gid || null,
      inkIds: inkIds.slice(),
      anims: [],
      elOpacity: 1,
    };
    if (!slide.els) slide.els = [];
    if (opts.layer === 'back') {
      let i = 0;
      while (i < slide.els.length && slide.els[i]?._isDecor) i += 1;
      slide.els.splice(i, 0, host);
    } else {
      slide.els.push(host);
    }
  } else {
    host.groupId = gid || host.groupId || null;
    host.inkIds = inkIds.slice();
    host.x = Math.round(bb.x);
    host.y = Math.round(bb.y);
    host.w = Math.max(1, Math.round(bb.w));
    host.h = Math.max(1, Math.round(bb.h));
  }
  removeOtherHostsForInkIds(slide, inkIds, host.id);
  return host;
}

/** Ensure every free stroke/fill has an inkhost (migrate older decks). */
export function ensureAllInkHosts(slide, nextIdFn) {
  if (!slide || typeof nextIdFn !== 'function') return false;
  ensureInkZOrders(slide);
  const hosted = hostedInkIdSet(slide);
  let changed = false;
  const byG = {};
  const singles = [];
  const pushItem = (it) => {
    if (!it?.id || hosted.has(String(it.id))) return;
    if (it.groupId) {
      if (!byG[it.groupId]) byG[it.groupId] = [];
      byG[it.groupId].push(it);
    } else singles.push(it);
  };
  (slide.ink || []).forEach(pushItem);
  (slide.inkFills || []).forEach(pushItem);
  Object.keys(byG).forEach((gid) => {
    if (ensureInkHostForItems(slide, byG[gid], gid, nextIdFn)) changed = true;
  });
  singles.forEach((it) => {
    if (ensureInkHostForItems(slide, [it], null, nextIdFn)) changed = true;
  });
  if (pruneEmptyInkHosts(slide)) changed = true;
  syncInkHostBBoxes(slide);
  return changed;
}

export function pruneEmptyInkHosts(slide) {
  if (!slide) return false;
  const live = new Set();
  (slide.ink || []).forEach((s) => {
    if (s?.id != null) live.add(String(s.id));
  });
  (slide.inkFills || []).forEach((f) => {
    if (f?.id != null) live.add(String(f.id));
  });
  const before = (slide.els || []).length;
  slide.els = (slide.els || []).filter((el) => {
    if (!el || el.type !== 'inkhost') return true;
    const ids = (el.inkIds || []).filter((id) => live.has(String(id)));
    if (!ids.length) return false;
    el.inkIds = ids;
    return true;
  });
  return (slide.els || []).length !== before;
}

export function syncInkHostBBoxes(slide) {
  if (!slide) return;
  (slide.els || []).forEach((el) => {
    if (!el || el.type !== 'inkhost') return;
    const idSet = new Set((el.inkIds || []).map(String));
    const items = [];
    (slide.ink || []).forEach((s) => {
      if (s && idSet.has(String(s.id))) items.push(s);
    });
    (slide.inkFills || []).forEach((f) => {
      if (f && idSet.has(String(f.id))) items.push(f);
    });
    const bb = inkItemsBBox(items);
    if (!bb) return;
    el.x = Math.round(bb.x);
    el.y = Math.round(bb.y);
    el.w = Math.max(1, Math.round(bb.w));
    el.h = Math.max(1, Math.round(bb.h));
    el.inkIds = items.map((x) => x.id);
  });
}

export function findInkHostsForIds(slide, ids) {
  const idSet = new Set((ids || []).map(String).filter(Boolean));
  if (!idSet.size || !slide) return [];
  return (slide.els || []).filter(
    (el) => el?.type === 'inkhost' && (el.inkIds || []).some((id) => idSet.has(String(id)))
  );
}

/** Markup for strokes+fills belonging to a host, z-sorted. */
export function inkHostInnerMarkup(slide, host, strokeMarkupFn, fillsMarkupFn) {
  if (!slide || !host) return '';
  const idSet = new Set((host.inkIds || []).map(String));
  const stack = [];
  (slide.inkFills || []).forEach((f) => {
    if (f && idSet.has(String(f.id))) stack.push({ kind: 'fill', item: f });
  });
  (slide.ink || []).forEach((s) => {
    if (s && idSet.has(String(s.id))) stack.push({ kind: 'stroke', item: s });
  });
  stack.sort((a, b) => {
    const za = a.item.z != null ? +a.item.z : 0;
    const zb = b.item.z != null ? +b.item.z : 0;
    if (za !== zb) return za - zb;
    if (a.kind !== b.kind) return a.kind === 'fill' ? -1 : 1;
    return 0;
  });
  let html = '';
  stack.forEach((x) => {
    if (x.kind === 'fill') html += fillsMarkupFn([x.item]) || '';
    else html += strokeMarkupFn(x.item) || '';
  });
  return html;
}
