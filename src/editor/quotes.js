/** Quote insert — bank from legacy js/02b-quotes-data.js. */

import data from './quotes-data.json';
import { getTheme } from './themes.js';
import { measureTextHeight } from './textFit.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';

const QUOTE_PT = 24;
const QUOTE_AUTHOR_PT = 18;
const QUOTE_MARGIN = 40;

function ptToPx(pt) {
  return Math.round(+pt * (96 / 72));
}

const QUOTE_FS = ptToPx(QUOTE_PT);
const QUOTE_AUTHOR_FS = ptToPx(QUOTE_AUTHOR_PT);

const LS_CAT = 'slides_quote_cat';

export function quoteCategories(ru = true) {
  const base = Array.isArray(data.categories) ? data.categories : [];
  return [{ id: 'all', nameRu: 'Все', name: 'All' }, ...base].map((c) => ({
    id: c.id,
    label: ru ? c.nameRu || c.name : c.name || c.nameRu,
  }));
}

export function getQuoteCat() {
  try {
    return localStorage.getItem(LS_CAT) || 'all';
  } catch (e) {
    return 'all';
  }
}

export function setQuoteCat(id) {
  const ok = quoteCategories(true).some((c) => c.id === id);
  const next = ok ? id : 'all';
  try {
    localStorage.setItem(LS_CAT, next);
  } catch (e) {}
  return next;
}

function rowCat(row) {
  if (Array.isArray(row)) return String(row[2] || 'other');
  return String(row.cat || row.category || 'other');
}

function parseRow(row) {
  if (Array.isArray(row)) {
    return { text: String(row[0] || ''), author: String(row[1] || ''), cat: rowCat(row) };
  }
  return {
    text: String(row.text || row.q || ''),
    author: String(row.author || row.a || ''),
    cat: rowCat(row),
  };
}

function filteredBank(cat) {
  const bank = Array.isArray(data.bank) ? data.bank : [];
  if (!cat || cat === 'all') return bank;
  const f = bank.filter((row) => rowCat(row) === cat);
  return f.length ? f : bank;
}

export function pickRandomQuote(cat = getQuoteCat()) {
  const bank = filteredBank(cat);
  if (!bank.length) {
    return { text: 'Красота спасёт мир.', author: 'Фёдор Достоевский', cat: 'writers' };
  }
  return parseRow(bank[Math.floor(Math.random() * bank.length)]);
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildQuoteHtml(text, author, color, opts = {}) {
  const preserve = !!opts.preserveBlockStyle;
  const raw = String(text || '')
    .trim()
    .replace(/^[«»\u201C\u201D\u201E\u275D\u275E"']+|[«»\u201C\u201D\u201E\u275D\u275E"']+$/g, '');
  const q = `«${raw}»`;
  const a = String(author || '').trim();
  const col = preserve ? '' : color ? `color:${color};` : '';
  return (
    `<i style="font-style:italic;font-size:${QUOTE_FS}px;${col}">${escHtml(q)}</i>` +
    `<br><br>` +
    `<span style="font-style:normal;font-size:${QUOTE_AUTHOR_FS}px;${col}">${escHtml(a)}</span>`
  );
}

export function quoteThemeColor(appliedThemeIdx) {
  const theme = getTheme(appliedThemeIdx);
  const isDark = theme ? !!theme.dark : true;
  return isDark ? '#ffffff' : '#000000';
}

export function makeQuoteElement(q, { canvasW, canvasH, color }) {
  const cw = canvasW || DEFAULT_CANVAS_W;
  const ch = canvasH || DEFAULT_CANVAS_H;
  const x = Math.round(cw / 2);
  const y = QUOTE_MARGIN;
  const w = Math.max(120, cw - x - QUOTE_MARGIN);
  const h = Math.max(80, Math.min(220, Math.round(ch * 0.28)));
  const html = buildQuoteHtml(q.text, q.author, color);
  const el = {
    type: 'text',
    x,
    y,
    w,
    h,
    html,
    cs: `font-size:${QUOTE_FS}px;font-weight:400;color:${color};text-align:right;line-height:1.35;`,
    textColor: color,
    textRole: 'body',
    valign: 'top',
    rot: 0,
    anims: [],
  };
  const fitted = measureTextHeight(el);
  el.h = Math.max(el.h, fitted);
  return el;
}

export { QUOTE_FS, QUOTE_AUTHOR_FS };
