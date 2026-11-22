import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';

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

/**
 * Handwritten Polaroid caption — use bundled faces so Windows / Linux / macOS
 * match. `good vides pro` is the script look; Edirne covers Cyrillic glyphs.
 */
export const POLAROID_CAPTION_FONT =
  "'good vides pro','Edirne-Normal_cyrillic',cursive,sans-serif";

/** Family names to embed in standalone HTML when a Polaroid frame is present. */
export const POLAROID_CAPTION_FONT_NAMES = ['good vides pro', 'Edirne-Normal_cyrillic'];

/**
 * Polaroid card metrics. Top/left/right borders stay equal; the bottom well
 * is taller for the handwritten caption. Font tracks slide coverage:
 * full-slide ≈ 50px, quarter-area ≈ 30px.
 */
export function polaroidMetrics(el, canvasW = DEFAULT_CANVAS_W, canvasH = DEFAULT_CANVAS_H) {
  const w = Math.max(1, +(el?.w) || 100);
  const h = Math.max(1, +(el?.h) || 60);
  const cw = Math.max(1, +canvasW || DEFAULT_CANVAS_W);
  const ch = Math.max(1, +canvasH || DEFAULT_CANVAS_H);
  const areaT = Math.sqrt((w / cw) * (h / ch));
  const fontSize = Math.max(14, Math.min(56, Math.round(10 + 40 * Math.max(0, Math.min(1, areaT)))));
  const side = Math.max(12, Math.min(32, Math.round(Math.min(w, h) * 0.048)));
  const bottom = Math.max(side + fontSize + 12, Math.round(side * 2.35 + fontSize * 0.55));
  return { side, bottom, fontSize, fontFamily: POLAROID_CAPTION_FONT };
}

export function polaroidPadCss(el, canvasW, canvasH) {
  const { side, bottom } = polaroidMetrics(el, canvasW, canvasH);
  return `${side}px ${side}px ${bottom}px`;
}

export function polaroidCaptionStyle(el, canvasW, canvasH, { editing = false } = {}) {
  const { side, bottom, fontSize, fontFamily } = polaroidMetrics(el, canvasW, canvasH);
  const lift = Math.max(4, Math.round(side * 0.4));
  return {
    position: 'absolute',
    left: side,
    right: side,
    bottom: lift,
    height: Math.max(fontSize + 4, bottom - lift),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    fontSize,
    fontFamily,
    color: '#334155',
    lineHeight: 1.15,
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    pointerEvents: 'auto',
    zIndex: 5,
    cursor: editing ? 'text' : 'text',
    outline: editing ? '1px dashed rgba(51,65,85,0.35)' : 'none',
  };
}

/** Grow/shrink the box when entering or leaving Polaroid so the photo stays put. */
export function polaroidFramePatch(el, nextFrame, canvasW, canvasH) {
  const cur = normImgFrame(el?.imgFrame);
  const next = normImgFrame(nextFrame);
  if (cur === next) return { imgFrame: next };
  if (cur !== 'polaroid' && next === 'polaroid') {
    const w = Math.max(1, +el.w || 100);
    const h = Math.max(1, +el.h || 60);
    const guess = polaroidMetrics({ w: w * 1.1, h: h * 1.18 }, canvasW, canvasH);
    const tw = w + guess.side * 2;
    const th = h + guess.side + guess.bottom;
    const m = polaroidMetrics({ w: tw, h: th }, canvasW, canvasH);
    return {
      imgFrame: 'polaroid',
      x: Math.round((+el.x || 0) - m.side),
      y: Math.round((+el.y || 0) - m.side),
      w: Math.round(w + m.side * 2),
      h: Math.round(h + m.side + m.bottom),
    };
  }
  if (cur === 'polaroid' && next !== 'polaroid') {
    const m = polaroidMetrics(el, canvasW, canvasH);
    return {
      imgFrame: next,
      x: Math.round((+el.x || 0) + m.side),
      y: Math.round((+el.y || 0) + m.side),
      w: Math.max(24, Math.round((+el.w || 100) - m.side * 2)),
      h: Math.max(24, Math.round((+el.h || 60) - m.side - m.bottom)),
    };
  }
  return { imgFrame: next };
}

/** Yellow torn-tape scrap that sits on the top edge of the picture. */
export function imgRibbonTapeStyle() {
  return {
    position: 'absolute',
    left: '50%',
    top: '0',
    width: '46%',
    minWidth: '80px',
    maxWidth: '220px',
    height: '36px',
    transform: 'translate(-50%,-58%) rotate(-4deg)',
    pointerEvents: 'none',
    zIndex: 4,
    overflow: 'visible',
    lineHeight: 0,
    isolation: 'isolate',
    filter: 'none',
  };
}

let _ribbonTapeSeq = 0;

export function imgRibbonTapeMarkup() {
  const id = `imgRibbonTapeFill${++_ribbonTapeSeq}`;
  // Bold torn scrap that still reads at ~36px: big ripped ends, a slightly
  // wavy strip, not a rounded capsule. Unique gradient id per instance.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style="display:block;width:100%;height:100%;overflow:visible;filter:none">` +
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="#fde7b4"/><stop offset="45%" stop-color="#f3c56e"/><stop offset="100%" stop-color="#e59b3a"/>` +
    `</linearGradient></defs>` +
    `<path fill="rgba(92,52,10,0.2)" d="M8 18 L16 8 L26 18 L36 6 L48 16 L70 13 C100 10 130 16 152 12 L164 6 L176 16 L188 8 L192 20 L188 34 L176 42 L164 32 L150 38 L100 36 L56 38 L42 42 L28 32 L16 42 L6 32 Z"/>` +
    `<path fill="url(#${id})" stroke="rgba(168,108,40,0.42)" stroke-width="0.9" ` +
    `d="M4 16 L12 6 L22 17 L32 4 L44 15 L58 11 L88 13 L120 10 L148 14 L162 5 L174 16 L186 6 L196 15 L192 24 L198 30 L188 38 L176 30 L164 40 L150 33 L118 36 L82 33 L56 36 L44 31 L32 40 L20 30 L10 40 L2 30 L8 22 Z"/>` +
    `<path fill="none" stroke="rgba(255,244,214,0.55)" stroke-width="1.3" d="M54 16 C86 13 118 19 150 15"/>` +
    `<path fill="none" stroke="rgba(160,96,28,0.22)" stroke-width="1" d="M50 26 C90 23 124 29 158 25"/>` +
    `</svg>`
  );
}

export function normImgBorderStyle(s) {
  const id = String(s || 'solid');
  return IMG_BORDER_STYLES.includes(id) ? id : 'solid';
}

/**
 * Reconstruct the pre-crop box {x,y,w,h} from the element's *current* (already-cropped) box
 * plus its crop percentages. Committing a crop shrinks el.x/y/w/h down to just the visible
 * region and keeps imgCropL/T/R/B as the percentages that produced it (see
 * ImageCropOverlay.jsx) — so the original, larger box is always algebraically recoverable:
 * current box = full box's [L%..100-R%] × [T%..100-B%] window. Used to show the full picture
 * again (with the crop handles at their current position) when crop mode is reopened, and to
 * compute the next commit relative to that same full box rather than the already-shrunk one.
 */
export function getCropFullBox(el) {
  const cl = Math.max(0, Math.min(90, +(el?.imgCropL) || 0));
  const ct = Math.max(0, Math.min(90, +(el?.imgCropT) || 0));
  const cr = Math.max(0, Math.min(90, +(el?.imgCropR) || 0));
  const cb = Math.max(0, Math.min(90, +(el?.imgCropB) || 0));
  const wFrac = Math.max(0.1, 1 - cl / 100 - cr / 100);
  const hFrac = Math.max(0.1, 1 - ct / 100 - cb / 100);
  const w = (el?.w || 100) / wFrac;
  const h = (el?.h || 60) / hFrac;
  const x = (el?.x || 0) - w * (cl / 100);
  const y = (el?.y || 0) - h * (ct / 100);
  return { x, y, w, h };
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
  const m = -bw / 2;
  const viewBox = `${-bw * 2} ${-bw * 2} ${w + bw * 4} ${h + bw * 4}`;
  const svgStyle = `position:absolute;left:${-bw * 2}px;top:${-bw * 2}px;width:calc(100% + ${bw * 4}px);height:calc(100% + ${bw * 4}px);display:block;overflow:visible`;
  if (style === 'double') {
    const m2 = m * 3;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="none" style="${svgStyle}"><path d="${imgStrokePathRect(w, h, m, rx - m, 'solid')}" fill="none" stroke="${bc}" stroke-width="${Math.max(1, bw * 0.45)}"/><path d="${imgStrokePathRect(w, h, m2, Math.max(0, rx - m2), 'solid')}" fill="none" stroke="${bc}" stroke-width="${Math.max(1, bw * 0.45)}"/></svg>`;
  }
  const path = imgStrokePathRect(w, h, m, rx - m, style);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="none" style="${svgStyle}"><path d="${path}" fill="none" stroke="${bc}" stroke-width="${bw}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function imgBorderFilterId(el) {
  return `img-border-${String(el.id || 'image').replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function xmlAttr(value) {
  return String(value).replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]
  ));
}

/** SVG filter markup for a solid border following the rendered image's alpha contour. */
export function imgBorderFilterMarkup(el) {
  const bw = +(el.imgBw || 0);
  if (bw <= 0 || normImgFrame(el.imgFrame) !== 'none' || normImgBorderStyle(el.imgBorderStyle) !== 'solid') return '';
  const id = imgBorderFilterId(el);
  const color = xmlAttr(el.imgBc || '#94a3b8');
  return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"><defs><filter id="${id}" x="-1" y="-1" width="3" height="3" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="${bw}" result="expanded"/><feFlood flood-color="${color}" result="borderColor"/><feComposite in="borderColor" in2="expanded" operator="in" result="expandedBorder"/><feComposite in="expandedBorder" in2="SourceAlpha" operator="out" result="outerBorder"/><feMerge><feMergeNode in="outerBorder"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>`;
}

/**
 * Styles for the outer image element box.
 * @returns {{ box: object, inner: object, img: object, frameClass: string, borderFilterSvg: string }}
 */
export function imageRenderStyles(el, opts = {}) {
  const frame = normImgFrame(el.imgFrame);
  const fit = el.imgFit || 'contain';
  const rx = el.imgRx != null ? +el.imgRx : 0;
  const bw = el.imgBw != null ? +el.imgBw : 0;
  const bStyle = normImgBorderStyle(el.imgBorderStyle);
  const useDashedOutline = bw > 0 && (bStyle === 'dashed' || bStyle === 'dotted');
  const fx = el.imgFlipH === true || el.imgFlipH === 'true' ? -1 : 1;
  const fy = el.imgFlipV === true || el.imgFlipV === 'true' ? -1 : 1;
  const op = el.imgOpacity != null ? el.imgOpacity : el.elOpacity != null ? el.elOpacity : 1;
  const accent = String(el.imgAccent || 'color');
  const accentFilter = opts.colorHover
    ? 'none'
    : accent === 'bw'
      ? 'grayscale(1)'
      : accent === 'sepia'
        ? 'sepia(1)'
        : undefined;

  const cl = Math.max(0, Math.min(90, +(el.imgCropL) || 0));
  const ct = Math.max(0, Math.min(90, +(el.imgCropT) || 0));
  const cr = Math.max(0, Math.min(90, +(el.imgCropR) || 0));
  const cb = Math.max(0, Math.min(90, +(el.imgCropB) || 0));
  const hasCrop = cl > 0 || ct > 0 || cr > 0 || cb > 0;
  const wFrac = Math.max(0.1, 1 - cl / 100 - cr / 100);
  const hFrac = Math.max(0.1, 1 - ct / 100 - cb / 100);

  const box = {
    overflow: bw > 0 || frame !== 'none' ? 'visible' : 'hidden',
    borderRadius: frame === 'polaroid' ? 2 : frame === 'soft' ? 0 : rx || undefined,
    outline: frame === 'none' && useDashedOutline ? `${bw}px ${bStyle} ${el.imgBc || '#94a3b8'}` : undefined,
    outlineOffset: frame === 'none' && useDashedOutline ? 0 : undefined,
    boxSizing: 'border-box',
    background: frame === 'polaroid' || frame === 'ribbon' ? '#fff' : undefined,
    padding: frame === 'polaroid' ? polaroidPadCss(el, opts.canvasW, opts.canvasH) : undefined,
    boxShadow: undefined,
  };

  if (frame === 'polaroid') {
    // Card-style frames have their own solid (white) background, so a rectangular
    // box-shadow is the right shape for them — there's no transparency to trace.
    box.boxShadow = '0 12px 32px rgba(15,23,42,0.24), 0 4px 12px rgba(15,23,42,0.14)';
  } else if (frame === 'ribbon') {
    box.boxShadow = '0 10px 28px rgba(15,23,42,0.22)';
  }
  if (el.imgShadow) {
    // filter: drop-shadow(...), not box-shadow — drop-shadow is computed from the actual
    // rendered alpha channel of the content (the <img> nested inside this box), so a PNG
    // with a transparent background gets a shadow that follows the visible pixels' outline
    // instead of a rectangle covering the whole transparent canvas. Only set when actually
    // needed — SlideCanvas merges this with the element's own base filter (blur / generic
    // shadow), and an explicit `undefined` here would otherwise clobber that on spread.
    const blur = el.imgShadowBlur != null ? +el.imgShadowBlur : 4;
    const size = el.imgShadowSize != null ? +el.imgShadowSize : 3;
    const sc = el.imgShadowColor || '#000000';
    box.filter = `drop-shadow(0 ${size}px ${Math.max(0, blur)}px ${sc})`;
    // drop-shadow only traces the alpha of what's actually painted, so the wrapper must not
    // clip that content away before the filter sees it (overflow:hidden also clips the
    // filter's own output at the box edge, right back to a rectangle). The inner wrapper
    // (`inner`, below) keeps its own unconditional overflow:hidden for crop/fit, so this
    // doesn't affect cropping.
    box.overflow = 'visible';
  }

  const softMask = frame === 'soft' ? imgSoftEdgeMaskUrl(el.w, el.h) : '';
  const inner = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: frame === 'polaroid' || frame === 'soft' ? 0 : rx || undefined,
    background: frame === 'polaroid' ? '#e8edf3' : undefined,
    boxShadow: frame === 'polaroid'
      ? 'inset 0 1px 8px rgba(15,23,42,0.28), inset 0 0 0 1px rgba(15,23,42,0.12)'
      : undefined,
    transform: fx !== 1 || fy !== 1 ? `scale(${fx},${fy})` : undefined,
    transformOrigin: 'center',
    filter: frame === 'none' && bStyle === 'solid' && bw > 0 ? `url(#${imgBorderFilterId(el)})` : undefined,
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
    // Ribbon / Polaroid: opacity lives on the host so the card chrome fades with the photo.
    opacity: frame === 'ribbon' || frame === 'polaroid' ? 1 : op,
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

  if (opts.transition) {
    box.transition = [box.transition, opts.transition].filter(Boolean).join(', ');
    img.transition = opts.transition;
  }

  return {
    box,
    inner,
    img,
    frameClass: frame !== 'none' ? `react-img-frame-${frame}` : '',
    borderFilterSvg: imgBorderFilterMarkup(el),
  };
}
