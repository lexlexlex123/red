/** Font helpers + local-only font list for the React editor. */

import { LOCAL_FONT_NAMES } from './localFonts.js';

/** CSS font-family value for a local face name. */
export function fontCssFamily(name) {
  if (!name) return '';
  const raw = String(name).trim();
  if (!raw) return '';
  const needsQuote = /[\s,]/.test(raw) || /[^a-zA-Z0-9_-]/.test(raw);
  const fam = needsQuote ? `'${raw.replace(/'/g, '')}'` : raw;
  return `${fam}, sans-serif`;
}

export const DEFAULT_TEXT_FONT_FAMILY = fontCssFamily('timesnewromanpsmt');
export const FONT_DEFAULT_ID = DEFAULT_TEXT_FONT_FAMILY;

/** Only fonts from /fonts (via download-fonts.ps1 → localFonts.js). */
export const FONT_FAMILIES = LOCAL_FONT_NAMES.map((name) => ({
  id: fontCssFamily(name),
  label: name,
  labelEn: name,
}));

const SYSTEM_FONT_NAMES = [
  'Arial',
  'Calibri',
  'Cambria',
  'Consolas',
  'Courier New',
  'Georgia',
  'Helvetica',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  'system-ui',
  'sans-serif',
  'serif',
  'monospace',
];

export const TEXT_FONT_FAMILIES = [
  ...FONT_FAMILIES,
  { id: '__system_fonts_divider', label: '──────── Системные шрифты ────────', labelEn: '────── System fonts ──────', divider: true },
  ...SYSTEM_FONT_NAMES.map((name) => ({
    id: fontCssFamily(name),
    label: name,
    labelEn: name,
  })),
];

export function fontOptionLabel(f, ru = true) {
  if (!f) return '';
  return ru ? f.label : f.labelEn || f.label;
}

export function parseFontFamily(cs) {
  if (!cs) return '';
  const m = String(cs).match(/font-family\s*:\s*([^;]+)/i);
  return m ? m[1].trim() : '';
}

/** Decode a few HTML entities that often appear inside imported style strings. */
function decodeBasicEntities(s) {
  return String(s || '')
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
}

/**
 * Canonical CSS font-family list for the editor / export.
 * Multi-word names use single quotes so values stay valid inside style="…".
 */
export function canonicalFontFamily(value, fallback = '') {
  let s = decodeBasicEntities(value).trim();
  if (!s) return fallback || '';

  const parts = [];
  let i = 0;
  while (i < s.length) {
    while (i < s.length && (s[i] === ' ' || s[i] === ',' || s[i] === '\t')) i += 1;
    if (i >= s.length) break;
    if (s[i] === '"' || s[i] === "'") {
      const q = s[i];
      i += 1;
      let name = '';
      while (i < s.length && s[i] !== q) {
        name += s[i];
        i += 1;
      }
      if (i < s.length && s[i] === q) i += 1;
      if (name.trim()) parts.push(name.trim());
      continue;
    }
    let name = '';
    while (i < s.length && s[i] !== ',') {
      name += s[i];
      i += 1;
    }
    const t = name.trim();
    if (t) parts.push(t);
  }
  if (!parts.length) return fallback || '';
  if (/^(inherit|unset|initial)$/i.test(parts[0])) return fallback || '';

  return parts
    .map((p) => {
      if (
        /^(sans-serif|serif|monospace|cursive|fantasy|system-ui|ui-monospace|ui-sans-serif|ui-serif|ui-rounded|emoji|math|fangsong)$/i.test(
          p
        )
      ) {
        return p;
      }
      const needsQuote = /[\s,]/.test(p) || /[^a-zA-Z0-9_-]/.test(p);
      return needsQuote ? `'${p.replace(/'/g, '')}'` : p;
    })
    .join(', ');
}

/** Rewrite every font-family:… declaration in a CSS declarations string. */
export function normalizeFontFamilyInCss(cssText) {
  if (!cssText || !/font-family/i.test(cssText)) return cssText;
  // Decode entities first — `&quot;` ends with `;` and would truncate `[^;]+`.
  const decoded = decodeBasicEntities(cssText);
  return decoded.replace(/font-family\s*:\s*([^;]+)/gi, (full, val) => {
    const canon = canonicalFontFamily(val);
    return canon ? `font-family:${canon}` : full;
  });
}

/** Rewrite font-family inside HTML style="…" / style='…' attributes. */
export function normalizeFontFamilyInHtml(html) {
  if (!html || !/font-family/i.test(html)) return html;
  return String(html).replace(/style\s*=\s*(["'])([\s\S]*?)\1/gi, (m, _q, style) => {
    if (!/font-family/i.test(style)) return m;
    const next = normalizeFontFamilyInCss(style).replace(/"/g, "'");
    return `style="${next}"`;
  });
}

export function normalizeFontsInElement(el) {
  if (!el || typeof el !== 'object') return el;
  let changed = false;
  let next = el;

  const set = (key, value) => {
    if (next[key] === value) return;
    if (next === el) next = { ...el };
    next[key] = value;
    changed = true;
  };

  if (typeof next.cs === 'string' && /font-family/i.test(next.cs)) {
    const v = normalizeFontFamilyInCss(next.cs);
    if (v !== next.cs) set('cs', v);
  }
  if (typeof next.shapeTextCss === 'string' && /font-family/i.test(next.shapeTextCss)) {
    const v = normalizeFontFamilyInCss(next.shapeTextCss);
    if (v !== next.shapeTextCss) set('shapeTextCss', v);
  }
  if (typeof next.codeCs === 'string' && /font-family/i.test(next.codeCs)) {
    const v = normalizeFontFamilyInCss(next.codeCs);
    if (v !== next.codeCs) set('codeCs', v);
  }
  if (typeof next.html === 'string' && /font-family/i.test(next.html)) {
    const v = normalizeFontFamilyInHtml(next.html);
    if (v !== next.html) set('html', v);
  }
  if (typeof next.md === 'string' && /font-family/i.test(next.md)) {
    const v = normalizeFontFamilyInHtml(next.md);
    if (v !== next.md) set('md', v);
  }
  if (typeof next.shapeHtml === 'string' && /font-family/i.test(next.shapeHtml)) {
    const v = normalizeFontFamilyInHtml(next.shapeHtml);
    if (v !== next.shapeHtml) set('shapeHtml', v);
  }
  if (typeof next.ff === 'string' && next.ff) {
    const v = canonicalFontFamily(next.ff, next.ff);
    if (v && v !== next.ff) set('ff', v);
  }
  if (typeof next.fontFamily === 'string' && next.fontFamily) {
    const v = canonicalFontFamily(next.fontFamily, next.fontFamily);
    if (v && v !== next.fontFamily) set('fontFamily', v);
  }

  if (Array.isArray(next.cells)) {
    let cellsChanged = false;
    const cells = next.cells.map((row) => {
      if (!Array.isArray(row)) return row;
      let rowChanged = false;
      const nextRow = row.map((cell) => {
        if (!cell || typeof cell !== 'object') return cell;
        const n = normalizeFontsInElement(cell);
        if (n !== cell) rowChanged = true;
        return n;
      });
      if (rowChanged) cellsChanged = true;
      return rowChanged ? nextRow : row;
    });
    if (cellsChanged) set('cells', cells);
  }

  return changed ? next : el;
}

/** Normalize font-family fields across a deck (JSON / PPTX / ODP / IDB hydrate). */
export function normalizeFontsInSlides(slides) {
  if (!Array.isArray(slides)) return slides;
  let changed = false;
  const out = slides.map((s) => {
    if (!s || !Array.isArray(s.els)) return s;
    let elsChanged = false;
    const els = s.els.map((el) => {
      const n = normalizeFontsInElement(el);
      if (n !== el) elsChanged = true;
      return n;
    });
    if (!elsChanged) return s;
    changed = true;
    return { ...s, els };
  });
  return changed ? out : slides;
}

export function elementFontFamily(el, fallback = DEFAULT_TEXT_FONT_FAMILY) {
  return parseFontFamily(el?.cs) || el?.ff || el?.fontFamily || fallback;
}

export function applyFontFamily(cs, family) {
  const canon = canonicalFontFamily(family, family);
  let next = String(cs || '').replace(/font-family\s*:\s*[^;]+;?/gi, '');
  if (canon) next += `font-family:${canon};`;
  return next;
}

const CS_PROP_NAMES =
  'font-size|font-weight|font-style|font-family|text-align|text-transform|text-decoration|line-height|letter-spacing|color';
const CS_PROP_SPLIT = new RegExp(`(?<=\\S)(?=(?:${CS_PROP_NAMES})\\s*:)`, 'gi');

/** Insert missing semicolons when props were concatenated (`36pxtext-align`, `leftcolor:`). */
export function repairCs(cs) {
  let s = String(cs || '')
    .replace(CS_PROP_SPLIT, ';')
    .replace(/;;+/g, ';')
    .replace(/^;+|;+$/g, '')
    .trim();
  return s ? `${s};` : '';
}

export function applyCsProp(cs, prop, value) {
  const key = String(prop || '').trim();
  if (!key) return repairCs(cs);
  const re = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`, 'i');
  const parts = repairCs(cs)
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !re.test(p));
  if (value != null && value !== '') parts.push(`${key}:${value}`);
  return parts.length ? `${parts.join(';')};` : '';
}

/** Parse first numeric value of a CSS property from a style string (e.g. line-height, letter-spacing). */
export function parseCsNumber(cs, prop) {
  if (!cs || !prop) return null;
  const re = new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i');
  const m = String(cs).match(re);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}
