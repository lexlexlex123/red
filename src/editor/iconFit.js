import { buildIconSVG, fitIconSvgViewBox } from './iconSvg.js';
import { getIconById } from './iconsLazy.js';

/**
 * Compute width/height for an icon so the selection box matches path bounds (v7.1).
 * Keeps approximate area of `baseSize²` (or current w×h).
 */
export function iconSizeForAspect(aspect, baseW = 180, baseH = 180) {
  const a = aspect > 0 ? aspect : 1;
  const area = Math.max(64, (+baseW || 180) * (+baseH || 180));
  const h = Math.round(Math.sqrt(area / a));
  const w = Math.round(h * a);
  return { w: Math.max(24, w), h: Math.max(24, h) };
}

/** Fit viewBox + return preferred element size. */
export function measureIconFit(ic, sw = 1.8, fillOp = 1, color = '#6366f1', baseW = 180, baseH = 180) {
  if (!ic || ic.raw) {
    if (ic?.raw && ic.vb) {
      const vp = String(ic.vb).trim().split(/[\s,]+/).map(Number);
      const aspect = vp[2] > 0 && vp[3] > 0 ? vp[2] / vp[3] : 1;
      return { ...iconSizeForAspect(aspect, baseW, baseH), aspect, fitted: true };
    }
    return null;
  }
  const svg = buildIconSVG(ic, color, sw, fillOp);
  const fit = fitIconSvgViewBox(svg, sw);
  if (!fit?.aspect) return null;
  return { ...iconSizeForAspect(fit.aspect, baseW, baseH), aspect: fit.aspect, fitted: true };
}

export function measureIconFitById(iconId, opts = {}) {
  const ic = getIconById(iconId);
  if (!ic) return null;
  return measureIconFit(
    ic,
    opts.sw != null ? opts.sw : 1.8,
    opts.fillOp != null ? opts.fillOp : 1,
    opts.color || '#6366f1',
    opts.w != null ? opts.w : 180,
    opts.h != null ? opts.h : 180
  );
}
