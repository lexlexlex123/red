/** Image display helpers (fit / flip / frames / border). */

export const IMG_FRAMES = [
  { id: 'none', labelRu: 'Нет', labelEn: 'None' },
  { id: 'soft', labelRu: 'Мягкая', labelEn: 'Soft' },
  { id: 'ribbon', labelRu: 'Лента', labelEn: 'Ribbon' },
  { id: 'polaroid', labelRu: 'Polaroid', labelEn: 'Polaroid' },
];

export const IMG_BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'wave', 'zigzag'];

export const IMG_FITS = [
  { id: 'contain', labelRu: 'Вписать', labelEn: 'Contain' },
  { id: 'cover', labelRu: 'Обрезать', labelEn: 'Cover' },
  { id: 'fill', labelRu: 'Растянуть', labelEn: 'Fill' },
];

export function normImgFrame(f) {
  const id = String(f || 'none');
  return IMG_FRAMES.some((x) => x.id === id) ? id : 'none';
}

export function normImgBorderStyle(s) {
  const id = String(s || 'solid');
  return IMG_BORDER_STYLES.includes(id) ? id : 'solid';
}

/** Soft-edge oval vignette (legacy `_imgSoftEdgeSvgMaskUrl`). */
export function imgSoftEdgeMaskUrl(w, h) {
  const Ww = Math.max(1, Math.round(w || 100));
  const Hh = Math.max(1, Math.round(h || 100));
  const minSide = Math.min(Ww, Hh);
  const blur = Math.max(12, Math.min(48, Math.round(minSide * 0.11)));
  const rxE = (Ww * 0.42).toFixed(1);
  const ryE = (Hh * 0.35).toFixed(1);
  const cx = (Ww / 2).toFixed(1);
  const cy = (Hh / 2).toFixed(1);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Ww} ${Hh}" preserveAspectRatio="none">` +
    `<defs>` +
    `<radialGradient id="g" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0%" stop-color="#fff" stop-opacity="1"/>` +
    `<stop offset="28%" stop-color="#fff" stop-opacity="1"/>` +
    `<stop offset="48%" stop-color="#fff" stop-opacity="0.78"/>` +
    `<stop offset="62%" stop-color="#fff" stop-opacity="0.42"/>` +
    `<stop offset="76%" stop-color="#fff" stop-opacity="0.14"/>` +
    `<stop offset="90%" stop-color="#fff" stop-opacity="0.03"/>` +
    `<stop offset="100%" stop-color="#fff" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<filter id="f" x="-50%" y="-50%" width="200%" height="200%">` +
    `<feGaussianBlur stdDeviation="${blur}"/>` +
    `</filter>` +
    `</defs>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${rxE}" ry="${ryE}" fill="url(#g)" filter="url(#f)"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function imgStrokePathRect(w, h, m, rx, style) {
  const x = m;
  const y = m;
  const bw = Math.max(1, w - m * 2);
  const bh = Math.max(1, h - m * 2);
  const r = Math.max(0, Math.min(rx || 0, Math.min(bw, bh) / 2));
  if (style === 'wave') {
    const z = Math.max(4, bw * 0.035);
    let d = `M ${x} ${y + z}`;
    for (let i = 0; i < 8; i++) {
      const t1 = (i + 0.5) / 8;
      const t2 = (i + 1) / 8;
      d += ` Q ${x + bw * t1} ${y + (i % 2 === 0 ? 0 : z * 2)} ${x + bw * t2} ${y + z}`;
    }
    d += ` L ${x + bw} ${y + bh - z}`;
    for (let i = 0; i < 8; i++) {
      const t1 = (i + 0.5) / 8;
      const t2 = (i + 1) / 8;
      d += ` Q ${x + bw * (1 - t1)} ${y + bh - (i % 2 === 0 ? 0 : z * 2)} ${x + bw * (1 - t2)} ${y + bh - z}`;
    }
    d += ` L ${x} ${y + z} Z`;
    return d;
  }
  if (style === 'zigzag') {
    const z = bh * 0.14;
    return `M ${x} ${y + z} L ${x + bw * 0.12} ${y} L ${x + bw * 0.24} ${y + z} L ${x + bw * 0.36} ${y} L ${x + bw * 0.48} ${y + z} L ${x + bw * 0.6} ${y} L ${x + bw * 0.72} ${y + z} L ${x + bw * 0.84} ${y} L ${x + bw} ${y + z} L ${x + bw} ${y + bh - z} L ${x + bw * 0.88} ${y + bh} L ${x + bw * 0.76} ${y + bh - z} L ${x + bw * 0.64} ${y + bh} L ${x + bw * 0.52} ${y + bh - z} L ${x + bw * 0.4} ${y + bh} L ${x + bw * 0.28} ${y + bh - z} L ${x + bw * 0.16} ${y + bh} L ${x} ${y + bh - z} Z`;
  }
  if (r > 0) {
    return `M ${x + r} ${y} H ${x + bw - r} Q ${x + bw} ${y} ${x + bw} ${y + r} V ${y + bh - r} Q ${x + bw} ${y + bh} ${x + bw - r} ${y + bh} H ${x + r} Q ${x} ${y + bh} ${x} ${y + bh - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
  }
  return `M ${x} ${y} H ${x + bw} V ${y + bh} H ${x} Z`;
}

/** SVG markup for double/wave/zigzag image borders (solid/dashed/dotted use CSS). */
export function imgBorderSvgMarkup(el) {
  const bw = +(el.imgBw || 0);
  if (bw <= 0) return '';
  const style = normImgBorderStyle(el.imgBorderStyle);
  if (style === 'solid' || style === 'dashed' || style === 'dotted') return '';
  const w = el.w || 100;
  const h = el.h || 100;
  const bc = el.imgBc || '#ffffff';
  const rx = +(el.imgRx || 0);
  const m = bw / 2 + 0.5;
  if (style === 'double') {
    const m2 = m * 2.2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" style="display:block;overflow:visible"><path d="${imgStrokePathRect(w, h, m, rx, 'solid')}" fill="none" stroke="${bc}" stroke-width="${Math.max(1, bw * 0.45)}"/><path d="${imgStrokePathRect(w, h, m2, Math.max(0, rx - m), 'solid')}" fill="none" stroke="${bc}" stroke-width="${Math.max(1, bw * 0.45)}"/></svg>`;
  }
  const path = imgStrokePathRect(w, h, m, rx, style);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" style="display:block;overflow:visible"><path d="${path}" fill="none" stroke="${bc}" stroke-width="${bw}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/**
 * Styles for the outer image element box.
 * @returns {{ box: object, inner: object, img: object, frameClass: string }}
 */
export function imageRenderStyles(el) {
  const frame = normImgFrame(el.imgFrame);
  const fit = el.imgFit || 'contain';
  const rx = el.imgRx != null ? +el.imgRx : 0;
  const bw = el.imgBw != null ? +el.imgBw : 0;
  const bc = el.imgBc || '#94a3b8';
  const bStyle = normImgBorderStyle(el.imgBorderStyle);
  const useCssBorder = bw > 0 && (bStyle === 'solid' || bStyle === 'dashed' || bStyle === 'dotted');
  const fx = el.imgFlipH === true || el.imgFlipH === 'true' ? -1 : 1;
  const fy = el.imgFlipV === true || el.imgFlipV === 'true' ? -1 : 1;
  const op = el.imgOpacity != null ? el.imgOpacity : el.elOpacity != null ? el.elOpacity : 1;
  const accent = String(el.imgAccent || 'color');
  const accentFilter = accent === 'bw' ? 'grayscale(1)' : accent === 'sepia' ? 'sepia(1)' : undefined;

  const cl = Math.max(0, Math.min(45, +(el.imgCropL) || 0));
  const ct = Math.max(0, Math.min(45, +(el.imgCropT) || 0));
  const cr = Math.max(0, Math.min(45, +(el.imgCropR) || 0));
  const cb = Math.max(0, Math.min(45, +(el.imgCropB) || 0));
  const hasCrop = cl > 0 || ct > 0 || cr > 0 || cb > 0;
  const wFrac = Math.max(0.1, 1 - cl / 100 - cr / 100);
  const hFrac = Math.max(0.1, 1 - ct / 100 - cb / 100);

  const box = {
    overflow: frame === 'none' || frame === 'soft' ? 'hidden' : 'visible',
    borderRadius: frame === 'polaroid' ? 2 : frame === 'soft' ? 0 : rx || undefined,
    border: frame === 'none' && useCssBorder ? `${bw}px ${bStyle} ${bc}` : undefined,
    boxSizing: 'border-box',
    background: frame === 'polaroid' ? '#fff' : undefined,
    padding: frame === 'polaroid' ? '8px 8px 28px' : frame === 'ribbon' ? '0 0 18px' : undefined,
    boxShadow: undefined,
  };

  if (frame === 'polaroid') {
    box.boxShadow = '0 12px 32px rgba(15,23,42,0.24), 0 4px 12px rgba(15,23,42,0.14)';
  } else if (frame === 'ribbon') {
    box.boxShadow = '0 10px 28px rgba(15,23,42,0.22)';
  }
  if (el.imgShadow) {
    const blur = el.imgShadowBlur != null ? +el.imgShadowBlur : 15;
    const size = el.imgShadowSize != null ? +el.imgShadowSize : 4;
    const sc = el.imgShadowColor || '#000000';
    const custom = `0 ${size}px ${blur}px ${sc}`;
    box.boxShadow = box.boxShadow ? `${box.boxShadow}, ${custom}` : custom;
  }

  const softMask = frame === 'soft' ? imgSoftEdgeMaskUrl(el.w, el.h) : '';
  const inner = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: frame === 'polaroid' || frame === 'soft' ? 0 : rx || undefined,
    transform: fx !== 1 || fy !== 1 ? `scale(${fx},${fy})` : undefined,
    transformOrigin: 'center',
    ...(softMask
      ? {
          WebkitMaskImage: softMask,
          maskImage: softMask,
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          maskMode: 'alpha',
        }
      : {}),
  };

  const img = {
    width: '100%',
    height: '100%',
    objectFit: fit,
    objectPosition: `${el.imgPosX || 'center'} ${el.imgPosY || 'center'}`,
    opacity: op,
    display: 'block',
    pointerEvents: 'none',
    userSelect: 'none',
    filter: accentFilter,
  };

  if (hasCrop) {
    img.position = 'absolute';
    img.width = `${(100 / wFrac).toFixed(3)}%`;
    img.height = `${(100 / hFrac).toFixed(3)}%`;
    img.maxWidth = 'none';
    img.left = `${((-(cl / 100) / wFrac) * 100).toFixed(3)}%`;
    img.top = `${((-(ct / 100) / hFrac) * 100).toFixed(3)}%`;
    img.objectFit = 'cover';
  }

  return { box, inner, img, frameClass: frame !== 'none' ? `react-img-frame-${frame}` : '' };
}
