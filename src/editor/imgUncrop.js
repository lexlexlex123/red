/** Reveal the pre-crop full picture (hover + emphasis anim, images only). */

import { getCropFullBox } from './imgStyles.js';

export const UNCROP_HOVER_PRESET = 'imgUncrop';
export const UNCROP_ANIM = 'uncrop';

export function imageHasCrop(el) {
  if (!el || el.type !== 'image') return false;
  return (
    (+el.imgCropL || 0) > 0.05 ||
    (+el.imgCropT || 0) > 0.05 ||
    (+el.imgCropR || 0) > 0.05 ||
    (+el.imgCropB || 0) > 0.05
  );
}

export function isUncropHoverPreset(preset) {
  return preset === UNCROP_HOVER_PRESET;
}

export function isUncropAnim(name) {
  return name === UNCROP_ANIM;
}

export function uncropViewEl(el) {
  if (!el || !imageHasCrop(el)) return el;
  const full = getCropFullBox(el);
  return {
    ...el,
    x: full.x,
    y: full.y,
    w: full.w,
    h: full.h,
    imgCropL: 0,
    imgCropT: 0,
    imgCropR: 0,
    imgCropB: 0,
  };
}

export function imageShowsUncrop(el, opts = {}) {
  if (!imageHasCrop(el)) return false;
  if (opts.cropActive) return true;
  if (opts.uncrop || opts.uncropDone) return true;
  if (opts.hovered && isUncropHoverPreset(opts.preset)) return true;
  return false;
}

/** Hidden margins (px) around the cropped window — the crop edges recede by these amounts. */
export function uncropPad(el) {
  const full = getCropFullBox(el);
  const x = el?.x || 0;
  const y = el?.y || 0;
  const w = el?.w || 0;
  const h = el?.h || 0;
  return {
    pl: Math.max(0, x - full.x),
    pt: Math.max(0, y - full.y),
    pr: Math.max(0, full.x + full.w - (x + w)),
    pb: Math.max(0, full.y + full.h - (y + h)),
  };
}

export function uncropClipCss(pad, revealed, rx) {
  const round = +rx > 0 ? ` round ${+rx}px` : '';
  if (!revealed || !pad) return `inset(0px${round})`;
  return `inset(-${pad.pt}px -${pad.pr}px -${pad.pb}px -${pad.pl}px${round})`;
}

export function uncropWindowTransition(durSec) {
  const d = `${Math.max(0.05, Math.min(2, +durSec || 0.3))}s`;
  return `left ${d} ease, top ${d} ease, width ${d} ease, height ${d} ease`;
}

export function uncropClipTransition(durSec) {
  return uncropWindowTransition(durSec);
}

/** @deprecated use uncropWindowTransition */
export function uncropGeomTransition(durSec) {
  return uncropWindowTransition(durSec);
}

/**
 * Crop window + pixel-locked image. The picture stays put in slide space; only the
 * overflow:hidden window grows. Layout (not clip-path) so a parent drop-shadow
 * re-rasterizes every frame instead of hanging at the previous silhouette.
 */
export function uncropWindowStyles(el, revealed, durSec) {
  const pad = uncropPad(el);
  const full = getCropFullBox(el);
  const dur = +durSec || 0;
  const trans = dur > 0 ? uncropWindowTransition(dur) : undefined;
  return {
    inner: {
      position: 'absolute',
      left: revealed ? -pad.pl : 0,
      top: revealed ? -pad.pt : 0,
      width: revealed ? full.w : el.w || 0,
      height: revealed ? full.h : el.h || 0,
      overflow: 'hidden',
      clipPath: 'none',
      WebkitClipPath: 'none',
      transition: trans,
    },
    img: {
      position: 'absolute',
      left: revealed ? 0 : -pad.pl,
      top: revealed ? 0 : -pad.pt,
      width: full.w,
      height: full.h,
      maxWidth: 'none',
      transition: trans,
    },
  };
}

export function cropImgPosStyle(cl, ct, cr, cb) {
  const l = Math.max(0, Math.min(90, +cl || 0));
  const t = Math.max(0, Math.min(90, +ct || 0));
  const r = Math.max(0, Math.min(90, +cr || 0));
  const b = Math.max(0, Math.min(90, +cb || 0));
  const wFrac = Math.max(0.1, 1 - l / 100 - r / 100);
  const hFrac = Math.max(0.1, 1 - t / 100 - b / 100);
  if (l <= 0 && t <= 0 && r <= 0 && b <= 0) {
    return { position: 'absolute', left: '0px', top: '0px', width: '100%', height: '100%', maxWidth: 'none' };
  }
  return {
    position: 'absolute',
    width: `${(100 / wFrac).toFixed(3)}%`,
    height: `${(100 / hFrac).toFixed(3)}%`,
    left: `${((-(l / 100) / wFrac) * 100).toFixed(3)}%`,
    top: `${((-(t / 100) / hFrac) * 100).toFixed(3)}%`,
    maxWidth: 'none',
  };
}

export function uncropDataAttrs(el) {
  if (!imageHasCrop(el)) return {};
  const pad = uncropPad(el);
  const full = getCropFullBox(el);
  return {
    'data-uncrop': '1',
    'data-uncrop-pl': String(pad.pl),
    'data-uncrop-pt': String(pad.pt),
    'data-uncrop-pr': String(pad.pr),
    'data-uncrop-pb': String(pad.pb),
    'data-uncrop-w': String(el.w || 0),
    'data-uncrop-h': String(el.h || 0),
    'data-uncrop-fw': String(full.w),
    'data-uncrop-fh': String(full.h),
  };
}

function uncropWinNodes(domEl) {
  const img = domEl.querySelector('img');
  const inner = img && img.parentElement;
  return { img, inner };
}

function snapUncropRest(domEl, inner, img, pad, w, h, fw, fh) {
  if (domEl._uncropWinReady) return;
  inner.style.transition = 'none';
  img.style.transition = 'none';
  inner.style.position = 'absolute';
  inner.style.overflow = 'hidden';
  inner.style.clipPath = 'none';
  inner.style.webkitClipPath = 'none';
  inner.style.left = '0px';
  inner.style.top = '0px';
  inner.style.width = `${w}px`;
  inner.style.height = `${h}px`;
  img.style.position = 'absolute';
  img.style.maxWidth = 'none';
  img.style.left = `${-pad.pl}px`;
  img.style.top = `${-pad.pt}px`;
  img.style.width = `${fw}px`;
  img.style.height = `${fh}px`;
  void inner.offsetWidth;
  domEl._uncropWinReady = true;
}

export function applyUncropDom(domEl, on, durSec) {
  if (!domEl || domEl.getAttribute('data-uncrop') !== '1') return false;
  const { img, inner } = uncropWinNodes(domEl);
  if (!img || !inner) return false;
  const pad = {
    pl: +domEl.getAttribute('data-uncrop-pl') || 0,
    pt: +domEl.getAttribute('data-uncrop-pt') || 0,
    pr: +domEl.getAttribute('data-uncrop-pr') || 0,
    pb: +domEl.getAttribute('data-uncrop-pb') || 0,
  };
  const w = +domEl.getAttribute('data-uncrop-w') || domEl.offsetWidth;
  const h = +domEl.getAttribute('data-uncrop-h') || domEl.offsetHeight;
  const fw = +domEl.getAttribute('data-uncrop-fw') || w + pad.pl + pad.pr;
  const fh = +domEl.getAttribute('data-uncrop-fh') || h + pad.pt + pad.pb;
  snapUncropRest(domEl, inner, img, pad, w, h, fw, fh);
  const d = Math.max(0.05, Math.min(2, +durSec || 0.3));
  const trans = `left ${d}s ease, top ${d}s ease, width ${d}s ease, height ${d}s ease`;
  inner.style.transition = trans;
  img.style.transition = trans;
  inner.style.position = 'absolute';
  inner.style.overflow = 'hidden';
  inner.style.clipPath = 'none';
  inner.style.webkitClipPath = 'none';
  img.style.position = 'absolute';
  img.style.maxWidth = 'none';
  img.style.width = `${fw}px`;
  img.style.height = `${fh}px`;
  if (on) {
    inner.style.left = `${-pad.pl}px`;
    inner.style.top = `${-pad.pt}px`;
    inner.style.width = `${fw}px`;
    inner.style.height = `${fh}px`;
    img.style.left = '0px';
    img.style.top = '0px';
    domEl.style.overflow = 'visible';
    domEl.style.zIndex = '24';
    img.style.pointerEvents = 'auto';
  } else {
    inner.style.left = '0px';
    inner.style.top = '0px';
    inner.style.width = `${w}px`;
    inner.style.height = `${h}px`;
    img.style.left = `${-pad.pl}px`;
    img.style.top = `${-pad.pt}px`;
    domEl.style.overflow = 'visible';
    domEl.style.zIndex = '';
    img.style.pointerEvents = 'none';
  }
  return true;
}

export function fireUncropDom(domEl, opts = {}) {
  if (!domEl) return 0;
  const delay = Math.max(0, +opts.delay || 0);
  const dur = Math.max(50, +opts.dur || 400);
  const on = opts.on != null ? !!opts.on : !domEl._uncropOn;
  const run = () => {
    applyUncropDom(domEl, on, dur / 1000);
    domEl._uncropOn = on;
  };
  if (delay > 0) setTimeout(run, delay);
  else run();
  return delay + dur;
}
