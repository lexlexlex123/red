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

export const FONT_DEFAULT_ID = '';

/** Only fonts from /fonts (via download-fonts.ps1 → localFonts.js). */
export const FONT_FAMILIES = [
  { id: FONT_DEFAULT_ID, label: '— по умолчанию —', labelEn: '— default —' },
  ...LOCAL_FONT_NAMES.map((name) => ({
    id: fontCssFamily(name),
    label: name,
    labelEn: name,
  })),
];

export function fontOptionLabel(f, ru = true) {
  if (!f) return '';
  if (f.id === FONT_DEFAULT_ID) return ru ? f.label : f.labelEn || f.label;
  return f.label;
}

export function parseFontFamily(cs) {
  if (!cs) return '';
  const m = String(cs).match(/font-family\s*:\s*([^;]+)/i);
  return m ? m[1].trim() : '';
}

export function applyFontFamily(cs, family) {
  let next = String(cs || '').replace(/font-family\s*:\s*[^;]+;?/gi, '');
  if (family) next += `font-family:${family};`;
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
