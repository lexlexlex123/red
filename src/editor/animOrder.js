/**
 * Slide animation order (timeline): leaves {elId,ai}, cameras, pause/repeat blocks.
 * Port of js/10-animations.js _ensureAnimOrder / expand helpers.
 */

export const EL_SPECIFIC_ANIMS = new Set([
  'particles',
  'captionSlide',
  'cosmosTitle',
  'splitHalf',
  'typewriter',
  'langFade',
  'inkDraw',
]);

export function isElSpecificAnim(name) {
  return EL_SPECIFIC_ANIMS.has(name);
}

export function newAnimBlockId(prefix = 'blk') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function slideAnimLeader(d, slide) {
  if (!d || !d.groupId || !slide?.els) return d;
  const members = slide.els.filter((x) => x && x.groupId === d.groupId);
  if (members.length <= 1) return d;
  for (let i = 0; i < slide.els.length; i++) {
    if (members.some((m) => m.id === slide.els[i].id)) return slide.els[i];
  }
  return d;
}

function animOrderKey(elId, ai) {
  return `${elId}:${ai}`;
}

function findBlockInList(list, blockId) {
  if (!list || !blockId) return null;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e && (e.kind === 'repeat' || e.kind === 'pause') && e.id === blockId) return e;
    if (e && e.kind === 'repeat') {
      const found = findBlockInList(e.children, blockId);
      if (found) return found;
    }
  }
  return null;
}

function spliceBlockInList(list, blockId, dissolve) {
  if (!list || !blockId) return false;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e && (e.kind === 'repeat' || e.kind === 'pause') && e.id === blockId) {
      const insert =
        dissolve && e.kind === 'repeat' && e.children && e.children.length ? e.children.slice() : [];
      list.splice(i, 1, ...insert);
      return true;
    }
    if (e && e.kind === 'repeat' && e.children) {
      if (spliceBlockInList(e.children, blockId, dissolve)) return true;
    }
  }
  return false;
}

function mapTree(list, mapFn) {
  if (!list) return [];
  return list
    .map((x) => {
      if (x && x.kind === 'repeat') {
        return {
          ...x,
          children: mapTree(x.children || [], mapFn).filter(Boolean),
        };
      }
      return mapFn(x);
    })
    .filter(Boolean);
}

/**
 * Rebuild / normalize slide.animOrder from existing entries + missing el anims + cameras.
 * Mutates slide.animOrder.
 */
export function ensureAnimOrder(slide) {
  if (!slide) return [];
  const entries = [];
  const used = new Set();
  const usedCam = new Set();
  const usedBlock = new Set();

  const makeEntry = (elId, ai) => {
    const d = slide.els && slide.els.find((x) => x && x.id === elId);
    if (!d || !d.anims || ai < 0 || ai >= d.anims.length) return null;
    const a = d.anims[ai];
    if (!a || !a.name) return null;
    const leader = slideAnimLeader(d, slide);
    let storeId = isElSpecificAnim(a.name) ? d.id : leader.id;
    if (
      (a.name === 'captionSlide' || a.name === 'cosmosTitle' || a.name === 'particles') &&
      d.groupId
    ) {
      storeId = leader.id;
    }
    const k = animOrderKey(storeId, ai);
    if (used.has(k)) return null;
    used.add(k);
    return { elId: storeId, ai };
  };

  const makeCam = (camId) => {
    if (!camId || usedCam.has(camId)) return null;
    const cams = slide.cameras || [];
    if (!cams.some((c) => c && c.id === camId)) return null;
    usedCam.add(camId);
    return { kind: 'camera', camId };
  };

  const resolveNode = (e) => {
    if (!e) return null;
    if (e.kind === 'pause') {
      const id = e.id || newAnimBlockId('pau');
      if (usedBlock.has(id)) return null;
      usedBlock.add(id);
      return {
        kind: 'pause',
        id,
        duration: Math.max(0, +(e.duration != null ? e.duration : 1000) || 1000),
      };
    }
    if (e.kind === 'repeat') {
      const id = e.id || newAnimBlockId('rep');
      if (usedBlock.has(id)) return null;
      usedBlock.add(id);
      const children = [];
      (e.children || []).forEach((ch) => {
        const n = resolveNode(ch);
        if (n) children.push(n);
      });
      return {
        kind: 'repeat',
        id,
        delay: Math.max(0, +(e.delay || 0) || 0),
        count: Math.max(1, Math.min(99, +(e.count != null ? e.count : 2) || 2)),
        infinite: !!e.infinite,
        children,
      };
    }
    if (e.kind === 'camera') return makeCam(e.camId);
    if (e.elId != null) return makeEntry(e.elId, +e.ai);
    return null;
  };

  if (Array.isArray(slide.animOrder)) {
    slide.animOrder.forEach((e) => {
      const n = resolveNode(e);
      if (n) entries.push(n);
    });
  }

  if (slide.els) {
    slide.els.forEach((d) => {
      if (!d || d._isDecor) return;
      (d.anims || []).forEach((a, ai) => {
        if (!a || !a.name) return;
        if (isElSpecificAnim(a.name)) {
          if (
            (a.name === 'captionSlide' || a.name === 'cosmosTitle' || a.name === 'particles') &&
            d.groupId
          ) {
            const leader = slideAnimLeader(d, slide);
            if (leader.id !== d.id) return;
          }
          const leaf = makeEntry(d.id, ai);
          if (leaf) entries.push(leaf);
          return;
        }
        if (d.groupId) {
          const leader = slideAnimLeader(d, slide);
          if (leader.id !== d.id) return;
        }
        const leaf = makeEntry(d.id, ai);
        if (leaf) entries.push(leaf);
      });
    });
  }

  (slide.cameras || []).forEach((c) => {
    if (!c || !c.id) return;
    const leaf = makeCam(c.id);
    if (leaf) entries.push(leaf);
  });

  slide.animOrder = entries;
  return entries;
}

function pushPause(list, id, duration) {
  list.push({
    kind: 'pause',
    pauseId: id,
    name: 'pause',
    dur: Math.max(0, +duration || 0),
    delay: 0,
    trigger: 'auto',
  });
}

function pushLeaf(slide, list, e) {
  if (!e || !slide) return;
  if (e.kind === 'camera') return; // cameras collected separately in React
  if (e.elId == null) return;
  const d = slide.els && slide.els.find((x) => x && x.id === e.elId);
  if (!d || !d.anims || !d.anims[e.ai]) return;
  const a = d.anims[e.ai];
  if (!a || !a.name) return;
  list.push({ kind: 'el', elId: d.id, ai: e.ai, anim: a, el: d });
}

function pushCamera(slide, list, e) {
  if (!e || !slide) return;
  const cam = (slide.cameras || []).find((c) => c && c.id === e.camId);
  if (!cam) return;
  list.push({
    kind: 'camera',
    cam,
    camId: cam.id,
    dur: cam.duration != null ? +cam.duration : 1200,
    delay: cam.delay != null ? +cam.delay : 0,
  });
}

function expandEntry(slide, list, e, opts = {}) {
  if (!e) return;
  if (e.kind === 'pause') {
    pushPause(list, e.id, e.duration);
    return;
  }
  if (e.kind === 'repeat') {
    if (e.delay) pushPause(list, `${e.id}_dly`, e.delay);
    if (opts.timeline) {
      const startIdx = list.length;
      (e.children || []).forEach((ch) => expandEntry(slide, list, ch, opts));
      const endIdx = list.length;
      if (!e.infinite && opts.repeatBands) {
        opts.repeatBands.push({
          id: e.id,
          count: Math.max(1, +(e.count || 1)),
          startIdx,
          endIdx,
        });
      }
      return;
    }
    const loops = e.infinite ? 20 : Math.max(1, +(e.count || 1));
    for (let n = 0; n < loops; n++) {
      (e.children || []).forEach((ch) => expandEntry(slide, list, ch, opts));
    }
    return;
  }
  if (e.kind === 'camera') {
    if (opts.includeCameras || opts.timeline) pushCamera(slide, list, e);
    return;
  }
  pushLeaf(slide, list, e);
}

function cloneOrderProxy(slide) {
  return {
    ...slide,
    animOrder: Array.isArray(slide.animOrder)
      ? JSON.parse(JSON.stringify(slide.animOrder))
      : [],
    els: slide.els,
    cameras: slide.cameras,
  };
}

/** Flat play list. Does not mutate slide. */
export function expandAnimOrderFlat(slide, opts = {}) {
  if (!slide) return [];
  const proxy = cloneOrderProxy(slide);
  ensureAnimOrder(proxy);
  const list = [];
  (proxy.animOrder || []).forEach((e) => expandEntry(proxy, list, e, opts));
  return list;
}

/** One cycle of each repeat + cameras, for the visual Gantt bar. */
export function expandAnimOrderForTimeline(slide) {
  if (!slide) return { list: [], repeatBands: [] };
  const proxy = cloneOrderProxy(slide);
  ensureAnimOrder(proxy);
  const list = [];
  const repeatBands = [];
  const opts = { includeCameras: true, timeline: true, repeatBands };
  (proxy.animOrder || []).forEach((e) => expandEntry(proxy, list, e, opts));
  return { list, repeatBands };
}

/** Normalized top-level order for UI (does not mutate). */
export function peekAnimOrder(slide) {
  if (!slide) return [];
  const proxy = cloneOrderProxy(slide);
  ensureAnimOrder(proxy);
  return proxy.animOrder || [];
}

/** Move top-level animOrder entry by delta (−1 / +1). */
export function moveAnimOrderEntry(slide, index, delta) {
  if (!slide) return false;
  ensureAnimOrder(slide);
  const list = slide.animOrder || [];
  const j = index + delta;
  if (index < 0 || j < 0 || index >= list.length || j >= list.length) return false;
  const tmp = list[index];
  list[index] = list[j];
  list[j] = tmp;
  return true;
}

/** Move top-level entry from → to (absolute index). */
export function moveAnimOrderToIndex(slide, from, to) {
  if (!slide) return false;
  ensureAnimOrder(slide);
  const list = slide.animOrder || [];
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return false;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  return true;
}

/** True if this repeat (or any nested) contains another repeat. */
export function hasNestedRepeat(entry) {
  if (!entry || entry.kind !== 'repeat') return false;
  return (entry.children || []).some((c) => c && c.kind === 'repeat');
}

/** 0 = top-level repeat, 1 = inside one repeat, -1 = not found. */
export function findRepeatDepth(list, repeatId, depth = 0) {
  for (const e of list || []) {
    if (!e || e.kind !== 'repeat') continue;
    if (e.id === repeatId) return depth;
    const d = findRepeatDepth(e.children, repeatId, depth + 1);
    if (d >= 0) return d;
  }
  return -1;
}

function isDescendantOfRepeat(entry, targetId) {
  if (!entry || entry.kind !== 'repeat' || !targetId) return false;
  if (entry.id === targetId) return true;
  return (entry.children || []).some((c) => isDescendantOfRepeat(c, targetId));
}

/** Max one nested repeat: top-level (depth 0) may hold a repeat; depth≥1 may not. */
export function canPlaceInRepeat(entry, parentDepth) {
  if (parentDepth < 0) return false;
  if (parentDepth >= 1) return !entry || entry.kind !== 'repeat';
  if (entry?.kind === 'repeat') return !hasNestedRepeat(entry);
  return true;
}

function peekAnimOrderAt(root, from) {
  if (!from) return null;
  if (from.scope === 'top') {
    const list = root || [];
    return list[from.index] || null;
  }
  if (from.scope === 'child') {
    const parent = findBlockInList(root, from.parentId);
    if (!parent || parent.kind !== 'repeat') return null;
    return (parent.children || [])[from.index] || null;
  }
  return null;
}

function takeAnimOrderAt(root, from) {
  if (!from) return null;
  if (from.scope === 'top') {
    const list = root || [];
    if (from.index < 0 || from.index >= list.length) return null;
    return list.splice(from.index, 1)[0] || null;
  }
  if (from.scope === 'child') {
    const parent = findBlockInList(root, from.parentId);
    if (!parent || parent.kind !== 'repeat') return null;
    if (!Array.isArray(parent.children)) parent.children = [];
    if (from.index < 0 || from.index >= parent.children.length) return null;
    return parent.children.splice(from.index, 1)[0] || null;
  }
  return null;
}

function insertAnimOrderAt(root, to, entry) {
  if (!to || !entry) return false;
  if (to.scope === 'top') {
    const list = root || [];
    const i = Math.max(0, Math.min(list.length, to.index != null ? to.index : list.length));
    list.splice(i, 0, entry);
    return true;
  }
  if (to.scope === 'body' || to.scope === 'child') {
    const parent = findBlockInList(root, to.parentId);
    if (!parent || parent.kind !== 'repeat') return false;
    if (!Array.isArray(parent.children)) parent.children = [];
    const depth = findRepeatDepth(root, to.parentId);
    if (!canPlaceInRepeat(entry, depth)) return false;
    if (entry.kind === 'repeat' && (entry.id === to.parentId || isDescendantOfRepeat(entry, to.parentId))) {
      return false;
    }
    if (to.scope === 'body') {
      parent.children.push(entry);
    } else {
      const i = Math.max(0, Math.min(parent.children.length, to.index != null ? to.index : parent.children.length));
      parent.children.splice(i, 0, entry);
    }
    return true;
  }
  return false;
}

/**
 * Move an order entry anywhere: top-level ↔ inside repeat, reorder, one-level nest.
 * from: { scope:'top', index } | { scope:'child', parentId, index }
 * to:   { scope:'top', index } | { scope:'child', parentId, index } | { scope:'body', parentId }
 */
export function relocateAnimOrderEntry(slide, from, to) {
  if (!slide || !from || !to) return false;
  ensureAnimOrder(slide);
  const root = slide.animOrder || [];
  if (from.scope === to.scope) {
    if (from.scope === 'top' && from.index === to.index) return false;
    if (
      from.scope === 'child' &&
      to.scope === 'child' &&
      from.parentId === to.parentId &&
      from.index === to.index
    ) {
      return false;
    }
  }
  if (from.scope === 'child' && to.scope === 'body' && from.parentId === to.parentId) {
    // append within same parent: only meaningful if not already last after take
  }

  const peek = peekAnimOrderAt(root, from);
  if (!peek) return false;

  if (to.scope === 'body' || to.scope === 'child') {
    const depth = findRepeatDepth(root, to.parentId);
    if (depth < 0 || !canPlaceInRepeat(peek, depth)) return false;
    if (peek.kind === 'repeat' && (peek.id === to.parentId || isDescendantOfRepeat(peek, to.parentId))) {
      return false;
    }
  }

  let toAdj = { ...to };
  if (from.scope === 'top' && to.scope === 'top' && from.index < to.index) {
    toAdj = { ...to, index: to.index - 1 };
  }
  if (
    from.scope === 'child' &&
    to.scope === 'child' &&
    from.parentId === to.parentId &&
    from.index < to.index
  ) {
    toAdj = { ...to, index: to.index - 1 };
  }

  const entry = takeAnimOrderAt(root, from);
  if (!entry) return false;
  if (!insertAnimOrderAt(root, toAdj, entry)) {
    // restore best-effort
    insertAnimOrderAt(
      root,
      from.scope === 'child'
        ? { scope: 'child', parentId: from.parentId, index: from.index }
        : { scope: 'top', index: from.index },
      entry
    );
    return false;
  }
  return true;
}

/** Nest any top-level order entry into a repeat block (by id). */
export function moveOrderEntryIntoRepeat(slide, fromIndex, repeatId) {
  return relocateAnimOrderEntry(
    slide,
    { scope: 'top', index: fromIndex },
    { scope: 'body', parentId: repeatId }
  );
}

/** After swapping el.anims[i] ↔ el.anims[j], fix order leaf indices. */
export function remapAnimOrderAfterSwap(slide, elId, i, j) {
  if (!slide || elId == null || i === j) return;
  if (!Array.isArray(slide.animOrder)) return;
  slide.animOrder = mapTree(slide.animOrder, (x) => {
    if (!x || x.kind === 'pause' || x.kind === 'repeat' || x.kind === 'camera') return x;
    if (String(x.elId) !== String(elId)) return x;
    if (+x.ai === +i) return { ...x, ai: +j };
    if (+x.ai === +j) return { ...x, ai: +i };
    return x;
  });
}

/** Human label for a top-level order entry. */
export function animOrderEntryLabel(slide, entry, lang = 'ru') {
  const ru = lang !== 'en';
  if (!entry) return '';
  if (entry.kind === 'pause') {
    return ru ? `Пауза ${entry.duration != null ? entry.duration : 1000} мс` : `Pause ${entry.duration != null ? entry.duration : 1000} ms`;
  }
  if (entry.kind === 'repeat') {
    const n = entry.infinite ? '∞' : entry.count != null ? entry.count : 2;
    const ch = entry.children?.length || 0;
    return ru ? `Цикл ×${n}${ch ? ` (${ch})` : ''}` : `Repeat ×${n}${ch ? ` (${ch})` : ''}`;
  }
  if (entry.kind === 'camera') {
    const cams = slide?.cameras || [];
    const idx = cams.findIndex((c) => c && c.id === entry.camId);
    return ru ? `Камера ${idx >= 0 ? idx + 1 : '?'}` : `Camera ${idx >= 0 ? idx + 1 : '?'}`;
  }
  if (entry.elId != null) {
    const el = (slide?.els || []).find((e) => e && String(e.id) === String(entry.elId));
    const a = el?.anims?.[entry.ai];
    const name = a?.name || '?';
    return name;
  }
  return '?';
}

export function addAnimBlockToSlide(slide, blockType) {
  if (!slide) return null;
  ensureAnimOrder(slide);
  if (!Array.isArray(slide.animOrder)) slide.animOrder = [];
  let block;
  if (blockType === 'animPause' || blockType === 'pause') {
    block = {
      kind: 'pause',
      id: newAnimBlockId('pau'),
      duration: 1000,
    };
  } else {
    block = {
      kind: 'repeat',
      id: newAnimBlockId('rep'),
      delay: 0,
      count: 2,
      infinite: false,
      children: [],
    };
  }
  slide.animOrder.push(block);
  return block;
}

export function patchAnimBlockOnSlide(slide, blockId, prop, val) {
  if (!slide?.animOrder || !blockId) return false;
  const blk = findBlockInList(slide.animOrder, blockId);
  if (!blk) return false;
  if (prop === 'infinite') {
    blk.infinite = !!val;
    if (blk.infinite) blk.count = Math.max(1, +(blk.count || 1));
  } else if (prop === 'count') {
    blk.count = Math.max(1, Math.min(99, +val || 1));
    blk.infinite = false;
  } else if (prop === 'delay') {
    blk.delay = Math.max(0, +val || 0);
  } else if (prop === 'duration') {
    blk.duration = Math.max(0, +val || 0);
  } else {
    blk[prop] = val;
  }
  return true;
}

export function removeAnimBlockFromSlide(slide, blockId, dissolve = true) {
  if (!slide?.animOrder || !blockId) return false;
  return spliceBlockInList(slide.animOrder, blockId, dissolve);
}

/** After removing el.anims[removedAi], drop/remap order leaves. */
export function remapAnimOrderAfterRemove(slide, elId, removedAi) {
  if (!slide || elId == null || removedAi == null) return;
  if (!Array.isArray(slide.animOrder)) return;
  slide.animOrder = mapTree(slide.animOrder, (x) => {
    if (!x || x.kind === 'pause' || x.kind === 'repeat' || x.kind === 'camera') return x;
    if (String(x.elId) !== String(elId)) return x;
    if (+x.ai === +removedAi) return null;
    if (+x.ai > +removedAi) return { ...x, ai: +x.ai - 1 };
    return x;
  });
}

export function appendAnimLeafToOrder(slide, elId, ai) {
  if (!slide || elId == null || ai == null) return;
  ensureAnimOrder(slide);
  const k = animOrderKey(elId, ai);
  const has = (list) => {
    for (const e of list || []) {
      if (e && e.elId != null && animOrderKey(e.elId, e.ai) === k) return true;
      if (e && e.kind === 'repeat' && has(e.children)) return true;
    }
    return false;
  };
  if (has(slide.animOrder)) return;
  slide.animOrder.push({ elId, ai });
}

/** Move a top-level leaf into a repeat block (by block id). */
export function moveLeafIntoRepeat(slide, blockId, elId, ai) {
  if (!slide?.animOrder || !blockId) return false;
  const blk = findBlockInList(slide.animOrder, blockId);
  if (!blk || blk.kind !== 'repeat') return false;
  if (!Array.isArray(blk.children)) blk.children = [];
  let removed = null;
  const strip = (list) => {
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e && e.elId != null && String(e.elId) === String(elId) && +e.ai === +ai) {
        removed = list.splice(i, 1)[0];
        return true;
      }
      if (e && e.kind === 'repeat' && e.children && strip(e.children)) return true;
    }
    return false;
  };
  strip(slide.animOrder);
  const leaf = removed || { elId, ai };
  if (!blk.children.some((c) => c && String(c.elId) === String(elId) && +c.ai === +ai)) {
    blk.children.push(leaf);
  }
  return true;
}

export function findAnimBlock(slide, blockId) {
  if (!slide?.animOrder) return null;
  return findBlockInList(slide.animOrder, blockId);
}
