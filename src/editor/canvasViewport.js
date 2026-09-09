/** Editor canvas viewport zoom / pan helpers (v7.1 cwrap parity). */

import { useUiStore } from '../stores/uiStore.js';

/** User zoom relative to fit-to-viewport (1 = 100%). */
export const CANVAS_ZOOM_MIN = 0.25;
export const CANVAS_ZOOM_MAX = 20; // 2000%
/** Margin around the slide in the scrollport / default fit inset. */
export const CANVAS_ZOOM_PAD = 40;

export function getCanvasViewport() {
  return document.querySelector('.react-canvas-viewport');
}

export function isCanvasZoomedIn() {
  return (useUiStore.getState().canvasZoom || 1) > 1.001;
}

/** Pan scrollport with arrow keys when zoomed in. Returns true if handled. */
export function canvasPanByKey(key, fast) {
  const vp = getCanvasViewport();
  if (!vp || !isCanvasZoomedIn()) return false;
  const z = useUiStore.getState().canvasZoom || 1;
  const step = Math.round((fast ? 100 : 40) * Math.min(2, Math.max(1, z * 0.65)));
  let dx = 0;
  let dy = 0;
  if (key === 'ArrowLeft') dx = -step;
  else if (key === 'ArrowRight') dx = step;
  else if (key === 'ArrowUp') dy = -step;
  else if (key === 'ArrowDown') dy = step;
  else return false;
  vp.scrollLeft += dx;
  vp.scrollTop += dy;
  return true;
}

export function clampCanvasZoom(z) {
  return Math.max(CANVAS_ZOOM_MIN, Math.min(CANVAS_ZOOM_MAX, Number(z) || 1));
}

/** Center the slide in the viewport (ignore overflow from off-slide elements). */
export function centerCanvasViewport() {
  const vp = getCanvasViewport();
  if (!vp) return;
  const space = vp.querySelector('.react-slide-zoom-space');
  const sw = space ? space.offsetWidth : vp.scrollWidth;
  const sh = space ? space.offsetHeight : vp.scrollHeight;
  vp.scrollLeft = Math.max(0, (sw - vp.clientWidth) / 2);
  vp.scrollTop = Math.max(0, (sh - vp.clientHeight) / 2);
}
