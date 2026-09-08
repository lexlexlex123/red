/** Slide display title / nav-target helpers (from legacy js/08-slides.js). */

export function getSlideDisplayTitle(slide, index) {
  const t = slide && slide.title != null ? String(slide.title).trim() : '';
  if (t) return t;
  const n = (index != null ? index : 0) + 1;
  return `Слайд ${n}`;
}

export function resolveNavTargetSlideIndex(navTarget, slideList) {
  const list = slideList || [];
  if (navTarget == null) return null;
  if (typeof navTarget === 'number') {
    return navTarget >= 0 && navTarget < list.length ? navTarget : null;
  }
  if (typeof navTarget === 'string') {
    const norm = navTarget.trim().toLowerCase();
    if (!norm) return null;
    for (let i = 0; i < list.length; i++) {
      if (getSlideDisplayTitle(list[i], i).trim().toLowerCase() === norm) return i;
    }
    const asNum = +navTarget;
    if (Number.isFinite(asNum) && asNum >= 0 && asNum < list.length) return asNum;
  }
  return null;
}
