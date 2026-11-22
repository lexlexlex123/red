/** Element drop-shadow helpers (legacy shadow / shadowBlur / shadowSize / shadowColor). */

import {
  shapeRxPx,
  ringPath,
  roundedPolygonPath,
  shapeOutlinePathD,
} from '../shared/shapes.js';
import { getShapeMeta } from '../shared/shapesCatalog.js';

export function hasElShadow(el) {
  return !!(el && (el.shadow === true || el.shadow === 'true'));
}

export function isElShadowInset(el) {
  return !!(el && (el.shadowInset === true || el.shadowInset === 'true' || el.shadowInset === '1'));
}

/**
 * SVG path `d` for the painted silhouette in element pixels.
 * Matches shapeClipPath geometry so inset shadow follows rounding / freeform nodes.
 * @returns {{ d: string, fillRule?: string }|null}
 */
export function shapeSilhouettePathD(el) {
  if (!el) return null;
  const w = Math.max(1, +(el.w || 100));
  const h = Math.max(1, +(el.h || 60));
  const id = el.shape || 'rect';
  const meta = getShapeMeta(id);
  const special = meta?.special || id;
  const sw = el.sw === undefined ? 2 : +el.sw;
  const m = sw > 0 ? sw / 2 : 0;

  if (Array.isArray(el.shapePts) && el.shapePts.length >= 3) {
    const pts = el.shapePts.map((p) => ({
      x: (+p.x || 0) * w,
      y: (+p.y || 0) * h,
    }));
    const rx = shapeRxPx(el.rx, w, h);
    if (rx > 0) {
      const d = roundedPolygonPath(pts, rx);
      return d ? { d } : null;
    }
    const d =
      pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') +
      ' Z';
    return { d };
  }

  if (special === 'rect' || id === 'rect' || id === 'roundrect') {
    const x = m;
    const y = m;
    const ww = Math.max(0.5, w - m * 2);
    const hh = Math.max(0.5, h - m * 2);
    const rx = Math.min(shapeRxPx(el.rx, w, h), ww / 2, hh / 2);
    if (rx > 0.01) {
      const r = rx.toFixed(2);
      const x2 = (x + ww).toFixed(2);
      const y2 = (y + hh).toFixed(2);
      const x0 = x.toFixed(2);
      const y0 = y.toFixed(2);
      return {
        d:
          `M ${(x + rx).toFixed(2)} ${y0} ` +
          `H ${(x + ww - rx).toFixed(2)} ` +
          `A ${r} ${r} 0 0 1 ${x2} ${(y + rx).toFixed(2)} ` +
          `V ${(y + hh - rx).toFixed(2)} ` +
          `A ${r} ${r} 0 0 1 ${(x + ww - rx).toFixed(2)} ${y2} ` +
          `H ${(x + rx).toFixed(2)} ` +
          `A ${r} ${r} 0 0 1 ${x0} ${(y + hh - rx).toFixed(2)} ` +
          `V ${(y + rx).toFixed(2)} ` +
          `A ${r} ${r} 0 0 1 ${(x + rx).toFixed(2)} ${y0} Z`,
      };
    }
    return {
      d: `M ${x.toFixed(2)} ${y.toFixed(2)} H ${(x + ww).toFixed(2)} V ${(y + hh).toFixed(2)} H ${x.toFixed(2)} Z`,
    };
  }

  if (special === 'noSymbol' || id === 'noSymbol') {
    const orx = (w - m * 2) / 2;
    const ory = (h - m * 2) / 2;
    return { d: ringPath(w / 2, h / 2, orx, ory, el.ringInner), fillRule: 'evenodd' };
  }

  if (special === 'ellipse' || id === 'circle' || id === 'ellipse') {
    const mode = el.arcMode || 'full';
    const erx = (w - m * 2) / 2;
    const ery = (h - m * 2) / 2;
    const cx = w / 2;
    const cy = h / 2;
    if (mode === 'full') {
      // Approximate ellipse as path so one filter path works for all shapes.
      const k = 0.5522847498;
      const ox = erx * k;
      const oy = ery * k;
      return {
        d:
          `M ${cx} ${(cy - ery).toFixed(2)} ` +
          `C ${(cx + ox).toFixed(2)} ${(cy - ery).toFixed(2)} ${(cx + erx).toFixed(2)} ${(cy - oy).toFixed(2)} ${(cx + erx).toFixed(2)} ${cy} ` +
          `C ${(cx + erx).toFixed(2)} ${(cy + oy).toFixed(2)} ${(cx + ox).toFixed(2)} ${(cy + ery).toFixed(2)} ${cx} ${(cy + ery).toFixed(2)} ` +
          `C ${(cx - ox).toFixed(2)} ${(cy + ery).toFixed(2)} ${(cx - erx).toFixed(2)} ${(cy + oy).toFixed(2)} ${(cx - erx).toFixed(2)} ${cy} ` +
          `C ${(cx - erx).toFixed(2)} ${(cy - oy).toFixed(2)} ${(cx - ox).toFixed(2)} ${(cy - ery).toFixed(2)} ${cx} ${(cy - ery).toFixed(2)} Z`,
      };
    }
    const a1 = el.arcStart != null ? +el.arcStart : 0;
    const a2 = el.arcEnd != null ? +el.arcEnd : 270;
    const diff = ((a2 - a1) % 360 + 360) % 360 || 360;
    const steps = Math.max(12, Math.ceil(diff / 5));
    const pts = [];
    if (mode === 'sector') pts.push(`M ${cx.toFixed(1)} ${cy.toFixed(1)}`);
    for (let i = 0; i <= steps; i++) {
      const ang = ((a1 + (diff * i) / steps - 90) * Math.PI) / 180;
      const x = cx + erx * Math.cos(ang);
      const y = cy + ery * Math.sin(ang);
      pts.push(`${i === 0 && mode !== 'sector' ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    if (mode === 'sector') pts.push('Z');
    else pts.push('Z');
    return { d: pts.join(' ') };
  }

  const outline = shapeOutlinePathD(el, {
    sw: m > 0 ? (el.sw === undefined ? 2 : +el.sw) : 0,
    w,
    h,
  });
  if (outline) return { d: outline };
  return null;
}

/**
 * SVG markup for contour-following inner shadow (not rectangular box-shadow inset).
 * @returns {string}
 */
export function elInsetShadowSvgMarkup(el) {
  if (!hasElShadow(el) || !isElShadowInset(el)) return '';
  const sil = shapeSilhouettePathD(el);
  if (!sil?.d) return '';
  const w = Math.max(1, +(el.w || 100));
  const h = Math.max(1, +(el.h || 60));
  const blur = Math.max(0, el.shadowBlur != null ? +el.shadowBlur : 4);
  const size = el.shadowSize != null ? +el.shadowSize : 3;
  const color = String(el.shadowColor || '#000000').replace(/"/g, '');
  // Unique per el + size so multiple shapes / live edits don't clash.
  const uid = `isf_${String(el.id || 'x').replace(/[^a-zA-Z0-9_-]/g, '')}_${Math.round(blur)}_${Math.round(size)}`;
  const sigma = Math.max(0.01, blur * 0.5);
  const fillRule = sil.fillRule === 'evenodd' ? ' fill-rule="evenodd"' : '';
  // Pad filter region so blur/offset are not clipped.
  const pad = Math.ceil(blur + Math.abs(size) + 4);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" ` +
    `preserveAspectRatio="none" overflow="visible" style="display:block;pointer-events:none">` +
    `<defs><filter id="${uid}" x="${-pad}" y="${-pad}" width="${w + pad * 2}" height="${h + pad * 2}" ` +
    `filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">` +
    `<feFlood flood-color="${color}" result="flood"/>` +
    `<feComposite in="flood" in2="SourceAlpha" operator="out" result="inverse"/>` +
    `<feGaussianBlur in="inverse" stdDeviation="${sigma}" result="blur"/>` +
    `<feOffset in="blur" dx="0" dy="${size}" result="offset"/>` +
    `<feComposite in="offset" in2="SourceAlpha" operator="in" result="shadow"/>` +
    `</filter></defs>` +
    `<path d="${sil.d}" fill="#fff"${fillRule} filter="url(#${uid})"/>` +
    `</svg>`
  );
}

/** @deprecated rectangular inset — kept for callers; prefer elInsetShadowSvgMarkup */
export function elInsetShadowBoxCss(el) {
  if (!hasElShadow(el) || !isElShadowInset(el)) return undefined;
  const blur = el.shadowBlur != null ? +el.shadowBlur : 4;
  const size = el.shadowSize != null ? +el.shadowSize : 3;
  const color = el.shadowColor || '#000000';
  return `inset 0 ${size}px ${Math.max(0, blur)}px ${color}`;
}

/**
 * Combine blur + drop-shadow into a CSS filter string.
 * Inset shadows use elInsetShadowSvgMarkup overlay (contour-accurate).
 * @returns {string|undefined}
 */
export function elFilterCss(el) {
  if (!el) return undefined;
  const parts = [];
  if (el.blur) parts.push(`blur(${+el.blur || 0}px)`);
  if (hasElShadow(el) && el.type !== 'text' && !isElShadowInset(el)) {
    const blur = el.shadowBlur != null ? +el.shadowBlur : 4;
    const size = el.shadowSize != null ? +el.shadowSize : 3;
    const color = el.shadowColor || '#000000';
    parts.push(`drop-shadow(0 ${size}px ${Math.max(0, blur)}px ${color})`);
  }
  return parts.length ? parts.join(' ') : undefined;
}

export function elShadowDefaults() {
  return {
    shadow: false,
    shadowBlur: 4,
    shadowSize: 3,
    shadowColor: '#000000',
    shadowColorScheme: null,
    shadowInset: false,
  };
}
