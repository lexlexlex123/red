import data from './themes-data.json';
import { applyCsProp } from './fonts.js';

export const SCHEME_TINT_LEVELS = data.SCHEME_TINT_LEVELS || [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
export const THEMES = data.THEMES || [];
export const THEME_NAMES_RU = data.THEME_NAMES_RU || {};
export const BGS = data.BGS || [];

function parseHexRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const m = hex.match(/#?([0-9a-fA-F]{6})/);
  if (!m) return null;
  const h = m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return { h: 0, s: 0, l };
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (mx === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToHex(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  let r;
  let g;
  let b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const to = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function setHexLightness(hex, L) {
  const rgb = parseHexRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  return hslToHex(hsl.h, hsl.s, Math.max(0, Math.min(1, L)));
}

function grayHex(L) {
  const v = Math.round(Math.max(0, Math.min(1, L)) * 255);
  const h = v.toString(16).padStart(2, '0');
  return `#${h}${h}${h}`;
}

export function themeColors(t) {
  let base;
  if (t.colors && t.colors.length) {
    base = t.colors.slice();
  } else {
    const c1 = t.ac1 || '#6366f1';
    const c2 = t.ac2 || '#4338ca';
    const c3 = t.ac3 || '#c7d2fe';
    const c4 = t.shapeFill || c2;
    const c5 = t.shapeStroke || c1;
    const c6 = t.headingColor || c1;
    const c7 = t.bodyColor || (t.dark ? '#e2e8f0' : '#1e293b');
    base = [c1, c2, c3, c4, c5, c6, c7, t.dark ? '#000000' : '#ffffff'];
  }
  if (t.headingColor) base[0] = t.headingColor;
  if (t.shapeFill) base[1] = t.shapeFill;
  while (base.length < 8) base.push(t.dark ? '#000000' : '#ffffff');
  return base.slice(0, 8);
}

export function schemePosCode(col, row) {
  return String((col | 0) + 1) + String((row | 0) + 1);
}

function schemeRowLightness(row, isLightTheme) {
  const levels = SCHEME_TINT_LEVELS;
  const n = levels.length;
  const r = row | 0;
  if (r < 0 || r >= n) return levels[0];
  return isLightTheme ? levels[r] : levels[n - 1 - r];
}

/** Palette swatch at (col,row). Dark themes reverse order so row0 is light. */
export function schemeSwatchColor(theme, col, row) {
  if (!theme) return null;
  const levels = SCHEME_TINT_LEVELS;
  const base8 = themeColors(theme);
  const isLightTheme = !theme.dark;
  const n = levels.length;
  const c = col | 0;
  const r = row | 0;
  if (r < 0 || r >= n || c < 0 || c >= base8.length) return null;
  const L = schemeRowLightness(r, isLightTheme);
  const isLastCol = c === base8.length - 1;
  if (isLastCol) {
    if (r === 0) return isLightTheme ? '#000000' : '#ffffff';
    if (r === n - 1) return isLightTheme ? '#ffffff' : '#000000';
    if (r === 7 && isLightTheme) return '#dddddd';
    return grayHex(L);
  }
  let hex = base8[c] || '#888888';
  if (typeof hex === 'string' && !hex.startsWith('#')) {
    const m = hex.match(/#[0-9a-fA-F]{6}/);
    hex = m ? m[0] : '#888888';
  }
  return setHexLightness(hex, L);
}

export function resolveSchemeColor(schemeRef, theme) {
  if (!schemeRef || !theme) return null;
  if (schemeRef.col == null || schemeRef.row == null) return null;
  return schemeSwatchColor(theme, schemeRef.col, schemeRef.row);
}

export function colorFieldDisplay(hex, schemeRef) {
  if (schemeRef && schemeRef.col != null && schemeRef.row != null) {
    return schemePosCode(schemeRef.col, schemeRef.row);
  }
  if (!hex || hex === 'none' || hex === 'transparent') return '';
  return hex || '';
}

export function parseCsColor(cs) {
  const m = String(cs || '').match(/(?:^|;|\s)color\s*:\s*([^;]+)/i);
  return m ? m[1].trim() : '';
}

function normCssColor(c) {
  const s = String(c || '').trim().toLowerCase();
  const m3 = s.match(/^#([0-9a-f]{3})$/);
  if (m3) return `#${m3[1].split('').map((ch) => ch + ch).join('')}`;
  const m6 = s.match(/^#?([0-9a-f]{6})$/);
  if (m6) return `#${m6[1]}`;
  return s;
}

function sameCssColor(a, b) {
  const x = normCssColor(a);
  const y = normCssColor(b);
  return !!(x && y && x === y);
}

/** One shared inline color, or '' if none / mixed (partial formatting). */
function uniformInlineTextColor(html) {
  const found = [];
  String(html || '').replace(/\b(?:-webkit-text-fill-)?color\s*:\s*([^;\"']+)/gi, (_, c) => {
    const n = normCssColor(c);
    if (n) found.push(n);
    return _;
  });
  if (!found.length) return '';
  return found.every((c) => c === found[0]) ? found[0] : '';
}

/** Visible text color: scheme pin → textColor → cs (v7.1 _resolveCurrentTextColor). */
export function resolveElTextColor(el, theme) {
  if (!el) return '#ffffff';
  if (el.textColorScheme != null && el.textColorScheme.col != null && theme) {
    const c = resolveSchemeColor(el.textColorScheme, theme);
    if (c) return c;
  }
  if (el.textColor) return el.textColor;
  const fromCs = parseCsColor(el.cs);
  if (fromCs) return fromCs;
  return '#ffffff';
}

/**
 * Drop inline span colors so the box color from cs / scheme is what you see
 * (v7.1 _apClearHtmlColors) — EXCEPT spans that were deliberately colored
 * differently from the box's previous color (manually highlighted words).
 * Pass `prevColor` (the box's color before this change) so runs that already
 * differed from it are treated as intentional overrides and kept untouched;
 * only runs that matched the old uniform color are cleared to inherit the
 * new scheme color.
 */
export function stripInlineTextColors(html, prevColor) {
  const src = String(html || '');
  if (!src) return src;
  const prevNorm = prevColor ? normCssColor(prevColor) : null;
  if (typeof document === 'undefined') {
    if (!prevNorm) {
      return src.replace(/\bcolor\s*:\s*[^;\"']+;?/gi, '').replace(/-webkit-text-fill-color\s*:\s*[^;\"']+;?/gi, '');
    }
    return src.replace(/\bcolor\s*:\s*([^;\"']+);?/gi, (m, c) => (sameCssColor(c, prevNorm) ? '' : m));
  }
  const tmp = document.createElement('div');
  tmp.innerHTML = src;
  tmp.querySelectorAll('[style], [color]').forEach((node) => {
    if (node.hasAttribute('color')) {
      const attrColor = node.getAttribute('color');
      if (!prevNorm || sameCssColor(attrColor, prevNorm)) node.removeAttribute('color');
    }
    const st = node.getAttribute('style');
    if (!st || !/\bcolor\s*:/i.test(st)) return;
    // If this run's color is an intentional override (differs from the box's
    // previous color), leave its style alone — don't wipe its manual highlight.
    if (prevNorm) {
      const m = st.match(/\bcolor\s*:\s*([^;]+)/i);
      const runColor = m ? m[1] : '';
      if (runColor && !sameCssColor(runColor, prevNorm)) return;
    }
    let cleaned = st
      .replace(/\bcolor\s*:\s*[^;]+;?/gi, '')
      .replace(/-webkit-text-fill-color\s*:\s*[^;]+;?/gi, '')
      .replace(/;;+/g, ';')
      .replace(/^;+|;+$/g, '')
      .trim();
    if (node.hasAttribute('data-ch') && cleaned && !/display\s*:/i.test(cleaned)) {
      cleaned = `${cleaned};display:inline`;
    }
    if (cleaned) node.setAttribute('style', cleaned);
    else if (node.hasAttribute('data-ch')) node.setAttribute('style', 'display:inline');
    else node.removeAttribute('style');
  });
  return tmp.innerHTML;
}

/**
 * After import: lock PPTX/ODP colors as custom (scheme null).
 * If a scheme pin is leftover but HTML still has a uniform imported color
 * (often white), keep that color and drop the pin so the field matches the slide.
 */
export function hydrateImportedTextColors(slides, theme) {
  if (!Array.isArray(slides)) return slides;
  let changed = false;
  const next = slides.map((s) => {
    const els = (s.els || []).map((el) => {
      if (!el || (el.type !== 'text' && el.type !== 'formula')) return el;
      const patch = {};
      if (el.textColorScheme === undefined) patch.textColorScheme = null;
      const scheme = patch.textColorScheme !== undefined ? patch.textColorScheme : el.textColorScheme;
      const pinned = scheme != null && scheme.col != null;
      const inline = uniformInlineTextColor(el.html);
      const csColor = parseCsColor(el.cs);
      if (pinned) {
        const schemeC = resolveSchemeColor(scheme, theme);
        if (inline && schemeC && !sameCssColor(inline, schemeC)) {
          patch.textColorScheme = null;
          patch.textColor = inline;
          patch.cs = applyCsProp(el.cs || '', 'color', inline);
        } else if (schemeC) {
          patch.textColor = schemeC;
          patch.cs = applyCsProp(el.cs || '', 'color', schemeC);
          if (inline && !sameCssColor(inline, schemeC)) patch.html = stripInlineTextColors(el.html);
        }
      } else if (!el.textColor) {
        const c = inline || csColor || '#ffffff';
        patch.textColor = c;
        if (c) patch.cs = applyCsProp(el.cs || '', 'color', c);
      }
      if (!Object.keys(patch).length) return el;
      changed = true;
      return { ...el, ...patch };
    });
    return changed ? { ...s, els } : s;
  });
  return changed ? next : slides;
}

export function parseColorField(str, theme) {
  const s = String(str || '').trim();
  const pos = s.match(/^([1-8])([1-9])$/);
  if (pos) {
    const scheme = { col: +pos[1] - 1, row: +pos[2] - 1 };
    const color = theme ? schemeSwatchColor(theme, scheme.col, scheme.row) : null;
    if (color) return { color, schemeRef: scheme };
  }
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return { color: s, schemeRef: null };
  if (/^[0-9a-fA-F]{6}$/.test(s)) return { color: `#${s}`, schemeRef: null };
  return null;
}

export function themeDisplayName(theme, lang = 'ru') {
  if (!theme) return '';
  if (lang === 'en') return theme.nameEn || theme.name || '';
  return THEME_NAMES_RU[theme.name] || theme.nameRu || theme.name || '';
}

export function getTheme(idx) {
  if (idx == null || idx < 0 || !THEMES[idx]) return null;
  return THEMES[idx];
}

/** Build flat list of scheme swatches for color bar (col-major like legacy). */
export function buildSchemeSwatches(theme) {
  if (!theme) return [];
  const nCols = themeColors(theme).length;
  const out = [];
  for (let col = 0; col < nCols; col++) {
    for (let row = 0; row < SCHEME_TINT_LEVELS.length; row++) {
      const color = schemeSwatchColor(theme, col, row);
      out.push({
        color,
        col,
        row,
        key: `${col}-${row}`,
        pos: schemePosCode(col, row),
      });
    }
  }
  return out;
}

/** Solid color for CSS background (strip gradients to first hex if needed). */
export function solidColor(bg) {
  if (!bg || typeof bg !== 'string') return '#1e293b';
  if (bg.startsWith('#')) return bg.slice(0, 7);
  const m = bg.match(/#[0-9a-fA-F]{6}/);
  return m ? m[0] : bg;
}

/**
 * Remap scheme-pinned element colors when applying a theme (v7.1 subset).
 */
export function remapElementForTheme(el, theme) {
  if (!el || !theme) return el;
  const next = { ...el };
  const pin = (schemeKey, colorKey, fallbackScheme) => {
    const sr = next[schemeKey];
    if (sr !== null && sr !== undefined) {
      const c = resolveSchemeColor(sr, theme);
      if (c) next[colorKey] = c;
    } else if (sr === undefined && fallbackScheme) {
      next[schemeKey] = fallbackScheme;
      const c = resolveSchemeColor(fallbackScheme, theme);
      if (c) next[colorKey] = c;
    }
  };

  if (next.type === 'text') {
    const prevColor = el.textColor || parseCsColor(el.cs);
    const def = { col: 7, row: 0 };
    pin('textColorScheme', 'textColor', def);
    if (next.textColor) {
      next.cs = applyCsProp(next.cs || '', 'color', next.textColor);
    }
    if (next.html && next.textColor && next.textColorScheme != null && next.textColorScheme.col != null) {
      next.html = stripInlineTextColors(next.html, prevColor);
    } else if (
      next.html &&
      next.textColor &&
      prevColor &&
      next.textColor !== prevColor &&
      String(prevColor).startsWith('#')
    ) {
      const esc = String(prevColor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      next.html = String(next.html).replace(new RegExp(esc, 'gi'), next.textColor);
    }
    pin('textBgScheme', 'textBg', null);
  }
  if (next.type === 'formula') {
    const def = { col: 0, row: 4 }; // palette «15»
    pin('formulaColorScheme', 'formulaColor', def);
    if (next.formulaColorScheme == null && next.textColorScheme != null) {
      next.formulaColorScheme = next.textColorScheme;
      const c = resolveSchemeColor(next.formulaColorScheme, theme);
      if (c) next.formulaColor = c;
    }
    if (next.formulaColor) {
      next.textColor = next.formulaColor;
      next.textColorScheme = next.formulaColorScheme;
    }
  }
  if (next.type === 'shape') {
    pin('fillScheme', 'fill', { col: 0, row: 4 });
    pin('strokeScheme', 'stroke', { col: 0, row: 3 });
  }
  if (next.type === 'icon') {
    pin('textColorScheme', 'textColor', { col: 0, row: 2 });
  }
  if (next.type === 'applet') {
    pin('genColorScheme', 'genColor', null);
    pin('genBgScheme', 'genBg', null);
    pin('genBorderScheme', 'genBorderColor', null);
  }
  if (next.type === 'table') {
    pin('fillScheme', 'fill', null);
    pin('strokeScheme', 'stroke', null);
    pin('textColorScheme', 'textColor', { col: 0, row: 2 });
    pin('headerBgScheme', 'headerBg', { col: 0, row: 6 });
    pin('cellBgScheme', 'cellBg', { col: 0, row: 8 });
    pin('altBgScheme', 'altBg', { col: 0, row: 7 });
    pin('borderColorScheme', 'borderColor', { col: 0, row: 4 });
    pin('chartBgScheme', 'chartBg', null);
    pin('chartStrokeScheme', 'chartStroke', null);
    pin('chartLabelColorScheme', 'chartLabelColor', null);
  }
  return next;
}

export function applyThemeToSlides(slides, theme) {
  if (!theme || !Array.isArray(slides)) return slides;
  return slides.map((s) => {
    const slide = { ...s };
    if (slide.bgScheme !== null && slide.bgScheme !== undefined) {
      const resolved = resolveSchemeColor(slide.bgScheme, theme);
      slide.bg = 'custom';
      slide.bgc = resolved || theme.bg;
    } else if (slide.bgScheme === null) {
      // custom bg — keep
    } else {
      slide.bg = 'custom';
      slide.bgc = theme.bg;
    }
    slide.els = (slide.els || []).map((el) => remapElementForTheme(el, theme));
    return slide;
  });
}
