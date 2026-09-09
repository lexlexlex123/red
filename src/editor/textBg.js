/** Text block background: solid / gradient + opacity + backdrop blur (legacy parity). */

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let h = hex.trim();
  if (h.startsWith('rgb')) {
    const m = h.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3] };
  }
  if (h[0] === '#') h = h.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function toRgba(hex, a = 1) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${a})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

export function hasTextBg(el) {
  if (!el) return false;
  const blur = el.textBgBlur != null ? +el.textBgBlur : 0;
  return !!(el.textBg || el.textBgGrad || blur > 0);
}

/** CSS for the absolute bg layer behind text content. */
export function textBgLayerStyle(el) {
  if (!hasTextBg(el)) return null;
  const col = el.textBg;
  const op = el.textBgOp != null ? +el.textBgOp : 1;
  const blur = el.textBgBlur != null ? +el.textBgBlur : 0;
  const isGrad = !!el.textBgGrad;
  const style = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
    borderRadius: 'inherit',
  };
  if (col || isGrad) {
    const dir = el.textBgDir != null ? +el.textBgDir : 90;
    if (isGrad && col) {
      const c2 = el.textBgCol2 ? toRgba(el.textBgCol2, op) : 'rgba(0,0,0,0)';
      style.background = `linear-gradient(${dir}deg, ${toRgba(col, op)}, ${c2})`;
    } else if (col) {
      style.background = toRgba(col, op);
    }
  }
  if (blur > 0) {
    style.backdropFilter = `blur(${blur}px)`;
    style.WebkitBackdropFilter = `blur(${blur}px)`;
  }
  return style;
}

/** Inline background CSS for export HTML (no separate layer). */
export function textBgExportCss(el) {
  const layer = textBgLayerStyle(el);
  if (!layer) return {};
  const out = {};
  if (layer.background) out.background = layer.background;
  if (layer.backdropFilter) {
    out.backdropFilter = layer.backdropFilter;
    out.WebkitBackdropFilter = layer.WebkitBackdropFilter;
  }
  return out;
}

/** Gradient fill for text glyphs (background-clip: text). */
export function textColorGradStyle(el) {
  if (!el || !el.textColorGrad) return null;
  const c1 = el.textColorGrad1 || el.textColor || '#ffffff';
  const c2 = el.textColorGrad2 || 'transparent';
  const dir = el.textColorGradDir != null ? +el.textColorGradDir : 90;
  return {
    background: `linear-gradient(${dir}deg, ${c1}, ${c2})`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  };
}
