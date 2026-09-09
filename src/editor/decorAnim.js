/** Pause / resume slide decor (SVG SMIL + WebGL) without regenerating content. */

import { ensureGlRenderersLoaded } from './layouts.js';
import { usePresentationStore } from '../stores/presentationStore.js';
import { useUiStore } from '../stores/uiStore.js';

const GL_NAMES = ['CrystalDecor', 'DnaDecor', 'GalaxyDecor', 'CausticsDecor', 'WarpDecor'];

export function decorPausedAtMap() {
  const raw = usePresentationStore.getState().decorPausedAt;
  if (!raw || typeof raw !== 'object') return {};
  return { ...raw };
}

export function pausedAtForSlide(slideIndex) {
  const m = decorPausedAtMap();
  const v = m[String(slideIndex)] ?? m[slideIndex];
  return v != null && Number.isFinite(+v) ? +v : null;
}

function pauseAllGl() {
  GL_NAMES.forEach((name) => {
    try {
      window[name]?.pauseAll?.();
    } catch (e) {}
  });
}

function resumeAllGl() {
  GL_NAMES.forEach((name) => {
    try {
      window[name]?.resumeAll?.();
    } catch (e) {}
  });
}

/** Capture SVG SMIL currentTime for the current slide. */
export function captureDecorSvgTimes(fallbackSlideIndex = 0) {
  const out = { ...decorPausedAtMap() };
  if (typeof document === 'undefined') return out;
  const si = String(fallbackSlideIndex);
  document.querySelectorAll('.react-el-decor svg, .decor-el svg').forEach((svg) => {
    try {
      out[si] = svg.getCurrentTime();
    } catch (e) {}
  });
  return out;
}

export function syncDecorHostAnim(hostEl, layoutAnimated, pausedAt) {
  if (!hostEl) return;
  const svg = hostEl.querySelector?.('svg');
  if (!svg || typeof svg.pauseAnimations !== 'function') return;
  try {
    if (!layoutAnimated) {
      if (pausedAt != null && Number.isFinite(+pausedAt) && typeof svg.setCurrentTime === 'function') {
        svg.setCurrentTime(+pausedAt);
      }
      svg.pauseAnimations();
    } else {
      svg.unpauseAnimations();
    }
  } catch (e) {}
}

/**
 * Toggle layout animation: freeze on current frame or resume from there.
 * Does not rebuild decor SVG/GL content.
 */
export function applyLayoutAnimatedToggle(on) {
  const store = usePresentationStore.getState();
  const cur = store.cur | 0;
  const want = !!on;

  // Best-effort: if GL scripts already loaded, pause/resume immediately.
  void ensureGlRenderersLoaded().catch(() => {});

  if (!want) {
    const times = captureDecorSvgTimes(cur);
    pauseAllGl();
    document.querySelectorAll('.react-el-decor svg, .decor-el svg').forEach((svg) => {
      try {
        times[String(cur)] = svg.getCurrentTime();
        svg.pauseAnimations();
      } catch (e) {}
    });
    store.setDecorPausedAt(times);
    store.setLayoutAnimated(false);
    return;
  }

  resumeAllGl();
  document.querySelectorAll('.react-el-decor svg, .decor-el svg').forEach((svg) => {
    try {
      svg.unpauseAnimations();
    } catch (e) {}
  });
  store.setLayoutAnimated(true);
  store.setDecorPausedAt({});
}

export function glStartElapsedForSlide(slideIndex) {
  if (usePresentationStore.getState().layoutAnimated) return 0;
  return pausedAtForSlide(slideIndex) || 0;
}

export function patchGlCfgForAnim(cfg, slideIndex) {
  if (!cfg) return cfg;
  const animated = !!usePresentationStore.getState().layoutAnimated;
  const startElapsed = animated ? 0 : glStartElapsedForSlide(slideIndex);
  return { ...cfg, animated, startElapsed };
}

/**
 * Browsers pause rAF / SMIL / WebGL when the tab is hidden; on return, kick
 * layout décor so animated themes keep running.
 */
export function resumeDecorAfterTabVisible() {
  if (typeof document === 'undefined') return;
  if (document.visibilityState !== 'visible') return;
  if (!usePresentationStore.getState().layoutAnimated) return;
  if (useUiStore.getState().previewOpen) return;
  resumeAllGl();
  document.querySelectorAll('.react-el-decor svg, .decor-el svg').forEach((svg) => {
    try {
      svg.unpauseAnimations();
    } catch (e) {}
  });
  // Nudge GL renderers that only listen to update()
  GL_NAMES.forEach((name) => {
    try {
      const api = window[name];
      if (!api?.updateAll && !api?.resumeAll) return;
      api.resumeAll?.();
    } catch (e) {}
  });
}

let _visBound = false;
export function ensureDecorVisibilityResume() {
  if (_visBound || typeof document === 'undefined') return;
  _visBound = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // After paint — WebGL contexts may need a tick to restore
      requestAnimationFrame(() => resumeDecorAfterTabVisible());
      setTimeout(() => resumeDecorAfterTabVisible(), 120);
    } else if (usePresentationStore.getState().layoutAnimated) {
      pauseAllGl();
    }
  });
}

export { pauseAllGl, resumeAllGl };
