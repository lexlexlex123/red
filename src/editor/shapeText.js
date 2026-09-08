/** Shape label text (legacy shapeHtml / shapeTextCss / .shape-text). */

import { getShapeMeta } from '../shared/shapesCatalog.js';

export const DEFAULT_SHAPE_TEXT_CSS =
  'font-size:24px;font-weight:700;color:#ffffff;text-align:center;';

function cssProp(cs, prop, fallback) {
  const m = String(cs || '').match(new RegExp(`${prop}:\\s*([^;]+)`, 'i'));
  return m ? m[1].trim() : fallback;
}

export function parseShapeTextCss(cs) {
  const s = cs || DEFAULT_SHAPE_TEXT_CSS;
  const out = {
    fontSize: cssProp(s, 'font-size', '24px'),
    fontWeight: cssProp(s, 'font-weight', '700'),
    color: cssProp(s, 'color', '#ffffff'),
    textAlign: cssProp(s, 'text-align', 'center'),
    lineHeight: cssProp(s, 'line-height', '1.15'),
  };
  const ls = cssProp(s, 'letter-spacing', '');
  if (ls) out.letterSpacing = ls;
  const ff = cssProp(s, 'font-family', '');
  if (ff) out.fontFamily = ff;
  const fst = cssProp(s, 'font-style', '');
  if (fst) out.fontStyle = fst;
  return out;
}

export function getShapeTextColor(el) {
  if (!el) return '#ffffff';
  if (el.textColor) return el.textColor;
  return parseShapeTextCss(el.shapeTextCss).color || '#ffffff';
}

/** Set/replace color: in shapeTextCss. */
export function withShapeTextColor(cs, color) {
  return withShapeTextProp(cs, 'color', color);
}

/** Keep only typography keys (legacy _shapeTextCssPick). */
export function pickShapeTextCss(fromStyle, prev) {
  const src = fromStyle || prev || '';
  const keys = ['font-size', 'font-weight', 'font-family', 'color', 'text-align', 'letter-spacing', 'font-style'];
  const parts = [];
  for (let i = 0; i < keys.length; i++) {
    const re = new RegExp(`(?:^|;)\\s*${keys[i]}\\s*:\\s*([^;]+)`, 'i');
    const m = src.match(re);
    if (m) parts.push(`${keys[i]}:${m[1].trim()}`);
  }
  return parts.length ? `${parts.join(';')};` : prev || DEFAULT_SHAPE_TEXT_CSS;
}

/** Set/replace one CSS property in shapeTextCss. */
export function withShapeTextProp(cs, prop, val) {
  let st = cs || DEFAULT_SHAPE_TEXT_CSS;
  const safe = String(prop).replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
  st = st.replace(new RegExp(`(?:^|;)\\s*${safe}\\s*:[^;]*`, 'gi'), '').replace(/;;+/g, ';').replace(/^;|;$/g, '');
  if (val != null && val !== '') {
    if (st && !/;$/.test(st)) st += ';';
    st += `${prop}:${val};`;
  }
  return pickShapeTextCss(st, st);
}

export function shapeTextFontSizePx(el) {
  const n = parseFloat(parseShapeTextCss(el?.shapeTextCss).fontSize);
  return Number.isFinite(n) ? n : 24;
}

export function shapeTextFontWeight(el) {
  return parseShapeTextCss(el?.shapeTextCss).fontWeight || '700';
}

export function shapeTextFontFamily(el) {
  return parseShapeTextCss(el?.shapeTextCss).fontFamily || '';
}

export function shapeTextLayout(el) {
  const h = Math.max(1, +(el?.h || 100));
  const w = Math.max(1, +(el?.w || 100));
  const cs = el?.shapeTextCss || DEFAULT_SHAPE_TEXT_CSS;
  const fs = parseFloat(cssProp(cs, 'font-size', '24') || 24);
  const meta = getShapeMeta(el?.shape || 'rect');
  const isCallout = meta?.special === 'callout';
  const sw = Math.max(0, +(el?.sw != null ? el.sw : 2));

  let padY = 8;
  let padX = 8;
  if (h < fs * 2.8) {
    padY = Math.max(1, Math.min(4, Math.round(h * 0.05)));
    padX = Math.max(2, Math.min(6, Math.round(w * 0.04)));
  } else if (h < fs * 4) {
    padY = Math.max(2, Math.min(6, Math.round((h - fs) * 0.12)));
    padX = 6;
  }
  const edge = isCallout ? Math.max(2, Math.round(sw * 0.45)) : 0;
  return { padX, padY, edge, css: cs };
}

/** Outer box style for shape text overlay (React). */
export function shapeTextBoxStyle(el, { editing = false } = {}) {
  const { padX, padY, edge } = shapeTextLayout(el);
  return {
    position: 'absolute',
    inset: edge,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    boxSizing: 'border-box',
    lineHeight: 1.15,
    padding: `${padY}px ${padX}px`,
    overflow: 'hidden',
    pointerEvents: editing ? 'auto' : 'none',
    zIndex: 2,
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    ...parseShapeTextCss(el?.shapeTextCss),
  };
}

/** Markup for export / static preview. */
export function shapeTextExportHtml(el, esc) {
  const html = el?.shapeHtml;
  if (!html) return '';
  const { padX, padY, edge } = shapeTextLayout(el);
  const t = parseShapeTextCss(el.shapeTextCss);
  const parts = [
    'position:absolute',
    `inset:${edge}px`,
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'text-align:center',
    'box-sizing:border-box',
    `padding:${padY}px ${padX}px`,
    'overflow:hidden',
    'pointer-events:none',
    'z-index:2',
    'word-break:break-word',
    'white-space:pre-wrap',
    `font-size:${t.fontSize}`,
    `font-weight:${t.fontWeight}`,
    `color:${t.color}`,
    `line-height:${t.lineHeight}`,
  ];
  if (t.fontFamily) parts.push(`font-family:${t.fontFamily}`);
  if (t.fontStyle) parts.push(`font-style:${t.fontStyle}`);
  if (t.letterSpacing) parts.push(`letter-spacing:${t.letterSpacing}`);
  const escape = typeof esc === 'function' ? esc : (s) => String(s || '');
  return `<div class="shape-text" style="${escape(parts.join(';'))}"><div style="width:100%;text-align:center;min-height:0;line-height:1.15;margin:0;padding:0;transform:translateY(-0.07em)">${html}</div></div>`;
}
