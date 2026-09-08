/** Shape backdrop blur (legacy shapeBlur / .shape-blur-overlay). */

import { shapeRxPx } from '../shared/shapes.js';
import { getShapeMeta } from '../shared/shapesCatalog.js';
import {
  cloudResolveCircles,
  cloudBlobsPath,
  cloudCircleBounds,
} from '../shared/cloudGeom.js';
import { shapeClipPath } from './shapeHit.js';

/**
 * Clip for backdrop blur: fill interior only (inside the stroke),
 * so the frame/stroke is not sampled into the frosted region.
 */
export function shapeBackdropClip(el) {
  if (!el) return undefined;
  const w = Math.max(1, +(el.w || 100));
  const h = Math.max(1, +(el.h || 60));
  const id = el.shape || 'rect';
  const meta = getShapeMeta(id);
  const special = meta?.special || id;
  const sw = el.sw === undefined ? 2 : +el.sw;
  const inset = sw > 0 ? sw : 0;

  if (special === 'rect' || id === 'rect' || id === 'roundrect') {
    const rx = shapeRxPx(el.rx, w, h);
    const round = Math.max(0, rx - inset / 2);
    if (round > 0) return `inset(${inset}px round ${round}px)`;
    return `inset(${inset}px)`;
  }

  if (special === 'cloud') return undefined;

  if (special === 'callout') {
    return inset > 0 ? `inset(${inset}px)` : 'inset(0)';
  }

  const cp = shapeClipPath(el);
  if (!cp || cp === 'none') return undefined;
  return cp;
}

export function shapeBlurPx(el) {
  if (!el || el.type !== 'shape') return 0;
  return Math.max(0, +(el.shapeBlur != null ? el.shapeBlur : 0) || 0);
}

export function shapeBlurPad(blurPx) {
  const b = Math.max(0, +blurPx || 0);
  if (b <= 0) return 0;
  return Math.ceil(b * 2);
}

/** Shift inset()/ellipse() clip by pad. Paths must be rebuilt, not string-patched. */
export function offsetClipPath(clip, pad) {
  const p = Math.max(0, +pad || 0);
  if (p <= 0) return clip || undefined;
  if (!clip || clip === 'none') return `inset(${p}px)`;

  if (clip.startsWith('inset(')) {
    return clip.replace(/inset\(\s*([^)]+)\s*\)/i, (_, inner) => {
      const [edgesPart, roundPart] = String(inner).split(/\s+round\s+/i);
      const edges = edgesPart
        .trim()
        .split(/\s+/)
        .map((tok) => {
          const n = parseFloat(tok);
          return Number.isFinite(n) ? `${n + p}px` : tok;
        })
        .join(' ');
      return roundPart != null ? `inset(${edges} round ${roundPart.trim()})` : `inset(${edges})`;
    });
  }

  if (clip.startsWith('ellipse(')) return clip;
  return clip;
}

/** SVG data-URL mask covering the full cloud (even outside the element box). */
function cloudBlurMaskStyle(el, blurPad) {
  const w = Math.max(1, +(el.w || 100));
  const h = Math.max(1, +(el.h || 60));
  const circles = cloudResolveCircles({ ...el }, w, h);
  if (!circles?.length) return null;

  const b = cloudCircleBounds(circles, 0);
  const left = Math.min(0, b.x) - blurPad;
  const top = Math.min(0, b.y) - blurPad;
  const right = Math.max(w, b.x + b.w) + blurPad;
  const bottom = Math.max(h, b.y + b.h) + blurPad;
  const ow = Math.max(1, right - left);
  const oh = Math.max(1, bottom - top);

  const local = circles.map((c) => ({
    cx: c.cx - left,
    cy: c.cy - top,
    r: c.r,
  }));
  const d = cloudBlobsPath(local, 0);
  if (!d) return null;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ow}" height="${oh}" viewBox="0 0 ${ow} ${oh}">` +
    `<path d="${d}" fill="#fff" fill-rule="nonzero"/></svg>`;
  const url = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;

  return {
    position: 'absolute',
    left,
    top,
    width: ow,
    height: oh,
    pointerEvents: 'none',
    zIndex: 0,
    backdropFilter: `blur(${shapeBlurPx(el)}px)`,
    WebkitBackdropFilter: `blur(${shapeBlurPx(el)}px)`,
    WebkitMaskImage: url,
    maskImage: url,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  };
}

/** Inline styles for the frosted-glass overlay under a shape. */
export function shapeBlurOverlayStyle(el) {
  const sb = shapeBlurPx(el);
  if (sb <= 0) return null;
  const pad = shapeBlurPad(sb);
  const meta = getShapeMeta(el.shape || 'rect');

  if (meta?.special === 'cloud') {
    return cloudBlurMaskStyle(el, pad);
  }

  const clip = offsetClipPath(shapeBackdropClip(el), pad);
  return {
    position: 'absolute',
    top: -pad,
    left: -pad,
    width: `calc(100% + ${pad * 2}px)`,
    height: `calc(100% + ${pad * 2}px)`,
    pointerEvents: 'none',
    zIndex: 0,
    backdropFilter: `blur(${sb}px)`,
    WebkitBackdropFilter: `blur(${sb}px)`,
    clipPath: clip,
    WebkitClipPath: clip,
  };
}
