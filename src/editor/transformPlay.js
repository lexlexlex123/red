/**
 * Live «Трансформация» — same-slide morph between two snapshots of one element.
 * from/to store box, rotation, adj handles, nodes/curves, and basic colors.
 */

import { buildBasicShapeSVG, shapeOptsFromEl } from '../shared/shapes.js';
import { elBoxTransform } from './elTransform.js';
import { lerpHexColor, lerpMorphEl, morphGeomDirty } from './morphPlay.js';
import { animEasingCss } from './motionGeom.js';
import { resolveSchemeColor } from './themes.js';

export function isTransformAnim(name) {
  return name === 'transform';
}

const BOX_KEYS = ['x', 'y', 'w', 'h', 'rot', 'shapeFlipH', 'shapeFlipV', 'elOpacity'];
const COLOR_KEYS = ['fill', 'stroke', 'textColor', 'sw'];
/** Palette slot pins — resolve against the current theme at play time. */
const SCHEME_KEYS = ['fillScheme', 'strokeScheme', 'textColorScheme'];
const EXTRA_KEYS = [
  'type',
  'shape',
  'arcMode',
  'shapePts',
  'curvePoints',
  'curveClosed',
  'rx',
  'starInner',
  'paraSkew',
  'trapTop',
  'trapBot',
  'moonPhase',
  'chevSkew',
  'chevInner',
  'arrowHead',
  'ringInner',
  'gearDepth',
  'tailX',
  'tailY',
  'tailRoundX',
  'tailRoundY',
  'tailWFrac',
  'arcStart',
  'arcEnd',
  'fillOp',
  'starRays',
  'gearTeeth',
  'calloutForm',
  'cloudSeed',
  'cloudForm',
  'cloudCircles',
  'cloudCirclesForm',
  'cloudRefW',
  'cloudRefH',
  'cloudFramed',
  'noFill',
  'lineFromMarker',
  'lineToMarker',
  'lineMark',
];

function cloneVal(v) {
  if (v == null) return v;
  if (typeof v === 'object') {
    try {
      return JSON.parse(JSON.stringify(v));
    } catch (e) {
      return v;
    }
  }
  return v;
}

/** Snapshot of transformable fields for from/to. */
export function snapshotTransformProps(el) {
  if (!el) return null;
  const snap = {};
  BOX_KEYS.forEach((k) => {
    if (el[k] !== undefined) snap[k] = cloneVal(el[k]);
  });
  COLOR_KEYS.forEach((k) => {
    if (el[k] !== undefined) snap[k] = cloneVal(el[k]);
  });
  SCHEME_KEYS.forEach((k) => {
    if (el[k] !== undefined) snap[k] = cloneVal(el[k]);
  });
  EXTRA_KEYS.forEach((k) => {
    if (el[k] !== undefined) snap[k] = cloneVal(el[k]);
  });
  snap.x = +(el.x || 0);
  snap.y = +(el.y || 0);
  snap.w = Math.max(1, +(el.w || 100));
  snap.h = Math.max(1, +(el.h || 60));
  snap.rot = +(el.rot || 0);
  snap.type = el.type;
  if (el.shape != null) snap.shape = el.shape;
  return snap;
}

/**
 * Re-resolve palette-pinned colors on a transform snap for the active theme.
 * Solid custom colors (no scheme) stay as stored.
 */
export function resolveTransformSnapColors(snap, theme) {
  if (!snap) return snap;
  if (!theme) return { ...snap };
  const out = { ...snap };
  const fill = resolveSchemeColor(snap.fillScheme, theme);
  if (fill) out.fill = fill;
  const stroke = resolveSchemeColor(snap.strokeScheme, theme);
  if (stroke) out.stroke = stroke;
  const tc = resolveSchemeColor(snap.textColorScheme, theme);
  if (tc) out.textColor = tc;
  return out;
}

/** Patch object suitable for presentationStore.patchElement (no id/anims). */
export function transformPatchFromSnap(snap) {
  if (!snap) return {};
  const patch = {};
  [...BOX_KEYS, ...COLOR_KEYS, ...SCHEME_KEYS, ...EXTRA_KEYS].forEach((k) => {
    if (k === 'type') return;
    if (snap[k] !== undefined) patch[k] = cloneVal(snap[k]);
  });
  return patch;
}

const TRANSFORM_TRACKED_KEYS = new Set([...BOX_KEYS, ...COLOR_KEYS, ...SCHEME_KEYS, ...EXTRA_KEYS]);

function snapFieldEq(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (e) {
      return false;
    }
  }
  return false;
}

/**
 * After the user edits a figure (outside transform capture), keep the first
 * transform anim's rest pose (`from`) in sync — and mirror color/scheme onto
 * `to` when that end still matched the old rest color.
 * Returns a new `anims` array, or null if nothing to change.
 */
export function syncTransformRestFromElement(el, patch) {
  if (!el || !Array.isArray(el.anims) || !el.anims.length) return null;
  if (!patch || typeof patch !== 'object') return null;
  if (Object.prototype.hasOwnProperty.call(patch, 'anims')) return null;
  const touched = Object.keys(patch).filter((k) => TRANSFORM_TRACKED_KEYS.has(k));
  if (!touched.length) return null;

  const firstIdx = el.anims.findIndex((a) => a && a.name === 'transform');
  if (firstIdx < 0) return null;

  const anim = el.anims[firstIdx];
  const rest = snapshotTransformProps(el);
  if (!rest) return null;
  const oldFrom = anim.from || {};
  let nextTo = anim.to ? { ...anim.to } : anim.to;
  let toDirty = false;

  // If from/to shared the same fill (etc.), keep the end state matching after a rest edit.
  touched.forEach((k) => {
    if (!COLOR_KEYS.includes(k) && !SCHEME_KEYS.includes(k)) return;
    if (!nextTo) return;
    if (snapFieldEq(oldFrom[k], nextTo[k])) {
      nextTo[k] = cloneVal(rest[k]);
      toDirty = true;
    }
  });

  const nextFrom = { ...oldFrom, ...rest };
  const fromDirty = !snapFieldEq(oldFrom, nextFrom);
  if (!fromDirty && !toDirty) return null;

  const anims = el.anims.slice();
  anims[firstIdx] = {
    ...anim,
    from: nextFrom,
    to: toDirty ? nextTo : anim.to,
  };
  return anims;
}

function easeT(t, easingName) {
  const u = Math.max(0, Math.min(1, +t || 0));
  const name = String(easingName || 'linear');
  if (name === 'ease-in') return u * u;
  if (name === 'ease-out') return 1 - (1 - u) * (1 - u);
  if (name === 'ease-in-out' || name === 'ease') {
    return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  }
  return u;
}

function morphHexOrNull(c) {
  if (!c || typeof c !== 'string') return null;
  const s = c.trim();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return null;
  if (s.length === 4) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase();
  }
  return s.toLowerCase();
}

/** Full mid-state including box + adj (unlike lerpMorphEl which keeps box at `to`). */
export function lerpTransformEl(from, to, t) {
  const u = Math.max(0, Math.min(1, +t || 0));
  if (!from || !to) return to || from || null;
  const mid = lerpMorphEl(from, to, u);
  mid.x = (+from.x || 0) + ((+to.x || 0) - (+from.x || 0)) * u;
  mid.y = (+from.y || 0) + ((+to.y || 0) - (+from.y || 0)) * u;
  mid.w = Math.max(1, (+from.w || 100) + ((+to.w || 100) - (+from.w || 100)) * u);
  mid.h = Math.max(1, (+from.h || 60) + ((+to.h || 60) - (+from.h || 60)) * u);
  mid.rot = (+from.rot || 0) + ((+to.rot || 0) - (+from.rot || 0)) * u;
  mid.shapeFlipH = u < 0.5 ? !!from.shapeFlipH : !!to.shapeFlipH;
  mid.shapeFlipV = u < 0.5 ? !!from.shapeFlipV : !!to.shapeFlipV;
  if (from.elOpacity != null || to.elOpacity != null) {
    const a = from.elOpacity != null ? +from.elOpacity : 1;
    const b = to.elOpacity != null ? +to.elOpacity : 1;
    mid.elOpacity = a + (b - a) * u;
  }
  const ff = morphHexOrNull(from.fill);
  const tf = morphHexOrNull(to.fill);
  if (ff && tf) mid.fill = lerpHexColor(ff, tf, u);
  const fs = morphHexOrNull(from.stroke);
  const ts = morphHexOrNull(to.stroke);
  if (fs && ts) mid.stroke = lerpHexColor(fs, ts, u);
  const ftc = morphHexOrNull(from.textColor);
  const ttc = morphHexOrNull(to.textColor);
  if (ftc && ttc) mid.textColor = lerpHexColor(ftc, ttc, u);
  mid.type = to.type || from.type;
  mid.shape = to.shape || from.shape;
  return mid;
}

function shapeSvgHost(domEl) {
  if (!domEl) return null;
  const ring = domEl.querySelector('.react-shape-sel-ring');
  const svg = Array.from(domEl.querySelectorAll('svg')).find((s) => !ring || !ring.contains(s));
  return svg?.parentNode || null;
}

/** Apply a mid snapshot to a canvas/preview DOM node. */
export function applyTransformToDom(domEl, mid) {
  if (!domEl || !mid) return;
  domEl.style.left = `${+mid.x || 0}px`;
  domEl.style.top = `${+mid.y || 0}px`;
  domEl.style.width = `${Math.max(1, +mid.w || 100)}px`;
  domEl.style.height = `${Math.max(1, +mid.h || 60)}px`;
  if (mid.elOpacity != null) domEl.style.opacity = String(mid.elOpacity);
  domEl.style.transform = elBoxTransform(mid) || '';
  domEl.style.transformOrigin = 'center center';

  if (mid.type === 'shape' || mid.shape) {
    const host = shapeSvgHost(domEl);
    if (host) {
      try {
        host.innerHTML = buildBasicShapeSVG(mid.shape || 'rect', shapeOptsFromEl(mid));
      } catch (e) {
        /* ignore */
      }
    }
  }
  if (mid.type === 'text' || mid.textColor) {
    try {
      const holder = Array.from(domEl.querySelectorAll('.react-el-text > div')).find(
        (d) => !d.hasAttribute('aria-hidden')
      );
      if (holder && mid.textColor) holder.style.color = mid.textColor;
    } catch (e) {
      /* ignore */
    }
  }
}

export function transformWaitMs(anim) {
  if (!anim) return 0;
  const delay = Math.max(0, +(anim.delay || 0));
  const dur = Math.max(50, +(anim.dur || anim.duration || 800));
  return delay + dur;
}

/**
 * Animate DOM from `from` → `to`. Returns { waitMs, cancel }.
 * Pass `opts.theme` so palette slots (e.g. "15") track the current color scheme.
 */
export function fireTransformAnim(domEl, from, to, anim, opts = {}) {
  if (!domEl || !from || !to) return { waitMs: 0, cancel: () => {} };
  const delay = Math.max(0, +(anim?.delay || 0));
  const dur = Math.max(50, +(anim?.dur || anim?.duration || 800));
  const easingName = anim?.easing || 'linear';
  // Keep CSS transition string available for WAAPI fallbacks / debugging.
  void animEasingCss(easingName);

  const theme = opts.theme || null;
  const fromR = resolveTransformSnapColors(from, theme);
  const toR = resolveTransformSnapColors(to, theme);

  let running = true;
  let raf = 0;
  let timer = null;
  const clear = () => {
    running = false;
    if (timer) clearTimeout(timer);
    timer = null;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const run = () => {
    if (!running) return;
    applyTransformToDom(domEl, fromR);
    if (opts.onStart) opts.onStart();
    const t0 = performance.now();
    const tick = (now) => {
      if (!running) return;
      const raw = Math.min(1, (now - t0) / dur);
      const e = easeT(raw, easingName);
      const mid = lerpTransformEl(fromR, toR, e);
      applyTransformToDom(domEl, mid);
      if (opts.onFrame) opts.onFrame(e, mid);
      if (raw < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        applyTransformToDom(domEl, toR);
        if (opts.onDone) opts.onDone(toR);
      }
    };
    raf = requestAnimationFrame(tick);
  };

  if (delay > 0) timer = setTimeout(run, delay);
  else run();

  return { waitMs: transformWaitMs(anim), cancel: clear };
}

export { morphGeomDirty };
