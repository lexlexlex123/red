/** Text glyph shadow + text block shadow (legacy textShadow* / textBlockShadow*). */

export function textShadowParams(el) {
  if (!el) return { ss: 0, sb: 0, sc: '#000000' };
  let ss = el.textShadowSize != null ? +el.textShadowSize : 0;
  let sb = el.textShadowBlur != null ? +el.textShadowBlur : 0;
  if (!ss && !sb && el.textShadowW && +el.textShadowW > 0) {
    sb = +el.textShadowW;
    ss = Math.max(1, Math.round(sb * 0.35));
  }
  return { ss, sb, sc: el.textShadowColor || '#000000' };
}

export function textShadowActive(el) {
  if (!el) return false;
  if (+el.textShadowSize > 0 || +el.textShadowBlur > 0) return true;
  return !!(el.textShadowW && +el.textShadowW > 0);
}

/** CSS text-shadow string (ring of offsets ≈ legacy SVG filter look). */
export function textShadowCss(el) {
  if (!textShadowActive(el)) return undefined;
  const { ss, sb, sc } = textShadowParams(el);
  if (ss <= 0 && sb <= 0) return undefined;
  if (ss <= 0) return `0 0 ${sb}px ${sc}`;
  if (sb <= 0) {
    const parts = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      parts.push(`${Math.round(Math.cos(a) * ss)}px ${Math.round(Math.sin(a) * ss)}px 0 ${sc}`);
    }
    return parts.join(', ');
  }
  const parts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    parts.push(
      `${Math.round(Math.cos(a) * ss)}px ${Math.round(Math.sin(a) * ss)}px ${sb}px ${sc}`
    );
  }
  return parts.join(', ');
}

export function textBlockShadowParams(el) {
  if (!el) return { ss: 0, sb: 0, sc: '#000000', inset: false };
  return {
    ss: el.textBlockShadowSize != null ? +el.textBlockShadowSize : 0,
    sb: el.textBlockShadowBlur != null ? +el.textBlockShadowBlur : 0,
    sc: el.textBlockShadowColor || '#000000',
    inset: el.textBlockShadowInset === '1' || el.textBlockShadowInset === true,
  };
}

export function textBlockShadowActive(el) {
  if (!el) return false;
  return +el.textBlockShadowSize > 0 || +el.textBlockShadowBlur > 0;
}

export function textBlockShadowCss(el) {
  if (!textBlockShadowActive(el)) return undefined;
  const { ss, sb, sc, inset } = textBlockShadowParams(el);
  if (ss <= 0 && sb <= 0) return undefined;
  return `${inset ? 'inset ' : ''}0 0 ${sb}px ${ss}px ${sc}`;
}

/** Styles for the text content node (glyph shadow). */
export function textGlyphShadowStyle(el) {
  const ts = textShadowCss(el);
  return ts ? { textShadow: ts } : null;
}

/** Styles for the text box (block shadow). */
export function textBlockShadowStyle(el) {
  const bs = textBlockShadowCss(el);
  return bs ? { boxShadow: bs } : null;
}
