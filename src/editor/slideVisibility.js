/** Skip hidden slides in F5 / HTML playback without dropping them from the deck. */

export function isSlideHidden(slide) {
  return !!(slide && slide.hidden);
}

export function firstVisibleSlideIndex(slides, from = 0, dir = 1) {
  const list = slides || [];
  const n = list.length;
  if (!n) return 0;
  const step = dir < 0 ? -1 : 1;
  let i = Math.max(0, Math.min(n - 1, from | 0));
  for (let k = 0; k < n; k++) {
    if (!isSlideHidden(list[i])) return i;
    i = (i + step + n) % n;
  }
  return Math.max(0, Math.min(n - 1, from | 0));
}

export function nextVisibleSlideIndex(slides, from, dir = 1) {
  const list = slides || [];
  const n = list.length;
  if (!n) return from | 0;
  const step = dir < 0 ? -1 : 1;
  let i = from | 0;
  for (let k = 0; k < n; k++) {
    i += step;
    if (i < 0 || i >= n) return -1;
    if (!isSlideHidden(list[i])) return i;
  }
  return -1;
}

export function nextVisibleSlideLooped(slides, from, dir = 1) {
  const list = slides || [];
  const n = list.length;
  if (!n) return from | 0;
  const step = dir < 0 ? -1 : 1;
  let i = from | 0;
  for (let k = 0; k < n; k++) {
    i = (i + step + n) % n;
    if (!isSlideHidden(list[i])) return i;
  }
  return from | 0;
}

export function visibleSlideIndices(slides) {
  return (slides || []).map((_, i) => i).filter((i) => !isSlideHidden(slides[i]));
}
