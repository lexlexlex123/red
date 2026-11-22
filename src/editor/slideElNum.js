/** Stable per-slide element numbers («Элемент N») — never renumber existing. */

export function maxSlideNum(els) {
  let m = 0;
  (els || []).forEach((e) => {
    if (!e) return;
    const n = Math.round(+e.slideNum);
    if (Number.isFinite(n) && n > m) m = n;
  });
  return m;
}

export function nextSlideNum(els) {
  return maxSlideNum(els) + 1;
}

/**
 * Assign slideNum to elements that lack it. Existing numbers stay unchanged.
 * @returns {{ els: object[], changed: boolean }}
 */
export function ensureSlideNums(els) {
  let max = maxSlideNum(els);
  let changed = false;
  const next = (els || []).map((e) => {
    if (!e) return e;
    const n = Math.round(+e.slideNum);
    if (Number.isFinite(n) && n >= 1) return e;
    changed = true;
    max += 1;
    return { ...e, slideNum: max };
  });
  return { els: next, changed };
}

/** Stable slide number for an element (falls back to dense index only if unset). */
export function slideElementNumber(els, elOrId) {
  const id = elOrId && typeof elOrId === 'object' ? elOrId.id : elOrId;
  if (id == null) return 0;
  const direct = elOrId && typeof elOrId === 'object' ? elOrId : null;
  if (direct) {
    const n = Math.round(+direct.slideNum);
    if (Number.isFinite(n) && n >= 1) return n;
  }
  let dense = 0;
  for (let i = 0; i < (els || []).length; i++) {
    const e = els[i];
    if (!e) continue;
    dense += 1;
    if (String(e.id) === String(id)) {
      const n = Math.round(+e.slideNum);
      if (Number.isFinite(n) && n >= 1) return n;
      return dense;
    }
  }
  return 0;
}

export function findElBySlideNum(els, num) {
  const n = Math.round(+num);
  if (!(n >= 1)) return null;
  return (els || []).find((e) => e && Math.round(+e.slideNum) === n) || null;
}
