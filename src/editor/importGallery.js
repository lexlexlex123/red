/**
 * Remote presentation catalog (port of js/26c-import-gallery.js, core subset).
 * Uses list.php / get.php (+ optional prezi-proxy.php for https→http).
 */

import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';

export const DEFAULT_IMPORT_BASE = 'http://pyabc.ru/prezi/';
const LS_KEY = 'slides_import_base';
/** Absolute path so SPA routers / subfolder deploys still hit the PHP proxy. */
function proxyPhpPath() {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
  const root = String(base).endsWith('/') ? String(base) : `${String(base)}/`;
  return `${root}prezi-proxy.php`;
}

export function normBase(url) {
  let u = String(url || '').trim();
  if (!u) return DEFAULT_IMPORT_BASE;
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  u = u.replace(/^https:\/\/(www\.)?pyabc\.ru\//i, 'http://pyabc.ru/');
  if (!u.endsWith('/')) u += '/';
  return u;
}

export function sanitizeCatalogBase(url) {
  let u = String(url || '').trim();
  if (!u) return DEFAULT_IMPORT_BASE;
  if (/[?&](?:import|prezi|src)=/i.test(u)) {
    const q = u.indexOf('?');
    if (q >= 0) u = u.slice(0, q);
  }
  u = u.replace(/[#?].*$/, '');
  u = u.replace(/\/(list|get)\.php.*$/i, '/');
  const last = u.split('/').pop() || '';
  if (/\.(html?|slides\.json|json|pptx?|ppt)$/i.test(last)) {
    u = u.replace(/[^/]+$/, '');
  }
  return normBase(u);
}

function fixStoredCatalogRoot(url) {
  const u = sanitizeCatalogBase(url);
  const def = normBase(DEFAULT_IMPORT_BASE);
  if (u === def) return u;
  try {
    const uu = new URL(u);
    const dd = new URL(def);
    if (uu.origin === dd.origin && u.startsWith(def) && u.length > def.length) return def;
  } catch (e) {}
  return u;
}

export function getStoredImportBase() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_IMPORT_BASE;
    return fixStoredCatalogRoot(raw);
  } catch (e) {
    return DEFAULT_IMPORT_BASE;
  }
}

export function setStoredImportBase(url) {
  const base = fixStoredCatalogRoot(sanitizeCatalogBase(url));
  try {
    localStorage.setItem(LS_KEY, base);
  } catch (e) {}
  return base;
}

export function joinUrl(base, rel) {
  const b = normBase(base);
  const r = String(rel || '').replace(/^\/+/, '');
  return b + r;
}

export function prettyCatalogName(name) {
  return (
    String(name || '')
      .replace(/\.slides\.json$/i, '')
      .replace(/\.json$/i, '')
      .replace(/\.html?$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || name
  );
}

export function needsProxyForBase(base) {
  try {
    return location.protocol === 'https:' && /^http:\/\//i.test(normBase(base));
  } catch (e) {
    return false;
  }
}

function proxyUrl(base, opts = {}) {
  const src = encodeURIComponent(normBase(base));
  const file = opts.file ? `&file=${encodeURIComponent(opts.file)}` : '';
  const path = encodeURIComponent(opts.path || '');
  return `${proxyPhpPath()}?src=${src}${file}&path=${path}`;
}

export function listPhpUrl(base, pathRel = '') {
  const q = decodePath(pathRel).replace(/^\/+|\/+$/g, '');
  if (needsProxyForBase(base)) return proxyUrl(base, { file: 'list.php', path: q });
  return `${normBase(base)}list.php?path=${encodeURIComponent(q)}`;
}

export function getPhpUrl(base, pathRel = '') {
  const q = decodePath(pathRel).replace(/^\/+/, '');
  if (needsProxyForBase(base)) return proxyUrl(base, { file: 'get.php', path: q });
  return `${normBase(base)}get.php?path=${encodeURIComponent(q)}`;
}

export async function fetchCatalogText(url) {
  let res;
  try {
    res = await fetch(url, { mode: 'cors', cache: 'no-cache' });
  } catch (e) {
    const pageHttps = typeof location !== 'undefined' && location.protocol === 'https:';
    const targetHttp = /^http:\/\//i.test(url);
    if (pageHttps && targetHttp) {
      throw new Error(
        'Браузер блокирует HTTP с HTTPS-страницы (mixed content). Откройте редактор по HTTP или укажите https:// адрес каталога.'
      );
    }
    throw new Error(
      'Failed to fetch — скорее всего нет CORS на сервере. Залейте list.php и get.php в папку prezi/.'
    );
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.text();
}

function normalizeIndex(data, absUrl) {
  const items = Array.isArray(data) ? data : (data && data.items) || [];
  return items
    .map((it) => {
      if (!it) return null;
      const type =
        it.type === 'folder' || it.type === 'dir'
          ? 'folder'
          : it.type === 'pres' || it.type === 'html' || it.type === 'file'
            ? 'pres'
            : null;
      if (!type) return null;
      const name = it.name || it.title || it.id || it.file || 'Без имени';
      if (type === 'folder') {
        const id = String(it.path || it.id || it.name || '').replace(/^\/+|\/+$/g, '');
        return { type: 'folder', name, id };
      }
      const file =
        it.file ||
        it.href ||
        (/\.(html?|json|slides\.json)$/i.test(String(name)) ? name : `${name}.html`);
      let thumb = it.thumb || it.preview || it.image || '';
      if (thumb && !/^https?:\/\//i.test(thumb) && !thumb.startsWith('data:')) {
        thumb = joinUrl(absUrl, thumb);
      }
      return { type: 'pres', name, file, thumb };
    })
    .filter(Boolean);
}

function parseDirListing(html, absUrl) {
  const out = [];
  const re = /href=["']([^"']+)["']/gi;
  let m;
  const seen = {};
  while ((m = re.exec(html))) {
    let href = m[1];
    if (!href || href.startsWith('?') || href.startsWith('#') || href.startsWith('javascript:')) continue;
    try {
      href = decodeURIComponent(href);
    } catch (e) {}
    const seg = href.split('/').filter(Boolean).pop() || '';
    if (!seg || seg === 'index.json' || seg === 'list.php' || seg === 'get.php' || seen[seg]) continue;
    seen[seg] = 1;
    if (href.endsWith('/') || !/\./.test(seg)) {
      out.push({ type: 'folder', name: seg, id: seg });
    } else if (/\.(html?|json|slides\.json)$/i.test(seg)) {
      out.push({ type: 'pres', name: seg, file: seg, thumb: '' });
    }
  }
  return out;
}

/** List folder under catalog base + relPath ('' or 'math/'). */
export async function listCatalogDir(base, relPath = '') {
  const b = normBase(base);
  const pathRel = String(relPath || '');
  const abs = joinUrl(b, pathRel);
  let phpErr = null;
  try {
    const raw = await fetchCatalogText(listPhpUrl(b, pathRel));
    const data = JSON.parse(raw);
    if (data && data.error) throw new Error(data.error);
    return normalizeIndex(data, abs);
  } catch (e) {
    phpErr = e;
  }
  try {
    const idxUrl = needsProxyForBase(b)
      ? proxyUrl(b, { file: 'index.json', path: String(pathRel || '').replace(/^\/+|\/+$/g, '') })
      : `${abs.replace(/\/?$/, '/') }index.json`;
    const raw = await fetchCatalogText(idxUrl);
    return normalizeIndex(JSON.parse(raw), abs);
  } catch (e) {}
  let htmlErr = null;
  try {
    const html = await fetchCatalogText(
      needsProxyForBase(b)
        ? proxyUrl(b, { path: String(pathRel || '').replace(/^\/+/, '') })
        : abs
    );
    const listed = parseDirListing(html, abs);
    // SPA index.html often parses as "empty dir" — don't hide the real failure.
    if (listed.length) return listed;
  } catch (e2) {
    htmlErr = e2;
  }
  const hint = needsProxyForBase(b)
    ? 'На HTTPS нужен prezi-proxy.php в корне сайта (рядом с index.html).'
    : 'Залейте list.php и get.php в папку prezi/.';
  throw new Error(
    `Не удалось прочитать каталог.\n${hint}\n${
      (phpErr && phpErr.message) || (htmlErr && htmlErr.message) || 'пустой ответ'
    }`
  );
}

function decodePath(p) {
  let s = String(p || '');
  for (let i = 0; i < 4; i++) {
    try {
      const next = decodeURIComponent(s.replace(/\+/g, ' '));
      if (next === s) break;
      s = next;
    } catch (e) {
      break;
    }
  }
  return s;
}

export function normalizeImportAbs(raw) {
  let abs = String(raw || '').trim();
  if (!abs) return '';
  abs = abs.replace(/\+/g, ' ');
  for (let i = 0; i < 4; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(abs)) break;
    try {
      const next = decodeURIComponent(abs);
      if (next === abs) break;
      abs = next;
    } catch (e) {
      break;
    }
  }
  if (!/^https?:\/\//i.test(abs)) return abs;
  try {
    const u = new URL(abs);
    return u.href.split('#')[0];
  } catch (e) {
    return abs;
  }
}

export function readImportParam() {
  try {
    const sp = new URLSearchParams(location.search);
    const v = sp.get('import') || sp.get('prezi') || sp.get('src') || '';
    if (v) return normalizeImportAbs(v);
  } catch (e) {}
  return '';
}

export function hasAddressImportParam() {
  try {
    const sp = new URLSearchParams(location.search);
    return !!(sp.get('import') || sp.get('prezi') || sp.get('src'));
  } catch (e) {
    return false;
  }
}

export function setAddressImportUrl(fileAbsUrl) {
  const abs = String(fileAbsUrl || '').trim();
  if (!abs) return;
  try {
    if (location.protocol === 'file:') return;
    const page = new URL(location.href);
    const qs = new URLSearchParams(page.search);
    qs.delete('prezi');
    qs.delete('src');
    qs.delete('import');
    const rest = qs.toString();
    const prefix = `${page.pathname}${rest ? `?${rest}&` : '?'}`;
    history.replaceState(null, '', `${prefix}import=${encodeURIComponent(abs)}${page.hash || ''}`);
  } catch (e) {}
}

export function clearAddressImportUrl() {
  try {
    if (location.protocol === 'file:') return;
    const u = new URL(location.href);
    let changed = false;
    ['import', 'prezi', 'src'].forEach((k) => {
      if (u.searchParams.has(k)) {
        u.searchParams.delete(k);
        changed = true;
      }
    });
    if (!changed) return;
    const qs = u.searchParams.toString();
    history.replaceState(null, '', `${u.pathname}${qs ? `?${qs}` : ''}${u.hash}`);
  } catch (e) {}
}

function splitAbsFile(absUrl) {
  const u = new URL(String(absUrl).trim(), location.href);
  const hrefNoHash = u.href.split('#')[0];
  const pathDec = decodePath(u.pathname || '/');
  const i = pathDec.lastIndexOf('/');
  const dirDec = pathDec.slice(0, i + 1);
  const fileDec = pathDec.slice(i + 1);
  const dirEnc = dirDec
    .split('/')
    .map((seg) => {
      if (!seg) return '';
      try {
        return encodeURIComponent(decodePath(seg));
      } catch (e) {
        return seg;
      }
    })
    .filter(Boolean)
    .join('/');
  const base = normBase(`${u.origin}${dirEnc ? `/${dirEnc}` : '/'}`);
  return { base, file: fileDec, abs: hrefNoHash };
}

function relUnderBase(absUrl, base) {
  const b = normBase(base);
  const a = String(absUrl || '');
  if (!a || !b) return null;
  if (a.indexOf(b) === 0) return decodePath(a.slice(b.length).replace(/^\/+/, ''));
  try {
    const ad = decodePath(a);
    const bd = decodePath(b);
    if (ad.indexOf(bd) === 0) return ad.slice(bd.length).replace(/^\/+/, '');
  } catch (e) {}
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    if (ua.origin !== ub.origin) return null;
    let pa = decodePath(ua.pathname);
    let pb = decodePath(ub.pathname);
    if (!pb.endsWith('/')) pb += '/';
    if (pa.indexOf(pb) === 0) return pa.slice(pb.length).replace(/^\/+/, '');
  } catch (e2) {}
  return null;
}

/** Fetch presentation body (JSON/HTML) via get.php → direct. */
export async function fetchPresentationRaw(absUrl, preferredBase) {
  const abs = normalizeImportAbs(absUrl);
  if (!abs) throw new Error('Пустой URL');
  const parsed = splitAbsFile(abs);
  const stored = normBase(preferredBase || getStoredImportBase());
  const errors = [];

  async function tryGet(base, relFile) {
    if (!relFile) return null;
    const names = [relFile];
    try {
      const nfc = relFile.normalize('NFC');
      const nfd = relFile.normalize('NFD');
      if (nfc !== relFile) names.push(nfc);
      if (nfd !== relFile && nfd !== nfc) names.push(nfd);
    } catch (e) {}
    let lastErr = null;
    for (let i = 0; i < names.length; i++) {
      try {
        return await fetchCatalogText(getPhpUrl(base, names[i]));
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  }

  const relStored = relUnderBase(parsed.abs, stored);
  if (relStored) {
    try {
      return await tryGet(stored, relStored);
    } catch (e) {
      errors.push(e);
    }
  }
  if (!relStored || stored !== parsed.base) {
    try {
      return await tryGet(parsed.base, parsed.file);
    } catch (e) {
      errors.push(e);
    }
  }
  try {
    return await fetchCatalogText(parsed.abs);
  } catch (e) {
    errors.push(e);
    const msg =
      errors
        .map((x) => x && x.message)
        .filter(Boolean)
        .join(' · ') ||
      (e && e.message) ||
      'fetch failed';
    throw new Error(msg);
  }
}

export function resolveCatalogItemAbs(base, relPath, file) {
  return joinUrl(base, `${relPath || ''}${String(file || '').replace(/^\//, '')}`);
}

/**
 * Build a JPEG data-URL preview of the first slide from presentation raw (JSON/HTML).
 * Uses lightweight canvas thumb (no DOM snapshot).
 */
export async function buildCatalogThumbDataUrl(raw, fileHint = '') {
  const text = String(raw || '');
  if (!text.trim()) return '';
  let slide = null;
  let canvasW = DEFAULT_CANVAS_W;
  let canvasH = DEFAULT_CANVAS_H;
  try {
    if (/\.json$/i.test(fileHint) || text.trim().charAt(0) === '{') {
      const obj = JSON.parse(text);
      const data = Array.isArray(obj) ? { slides: obj } : obj;
      slide = data.slides && data.slides[0];
      if (data.canvasW > 0) canvasW = +data.canvasW;
      if (data.canvasH > 0) canvasH = +data.canvasH;
    } else {
      const { parseExportedHtml } = await import('./htmlImport.js');
      const deck = parseExportedHtml(text);
      slide = deck?.slides?.[0];
      if (deck?.canvasW > 0) canvasW = +deck.canvasW;
      if (deck?.canvasH > 0) canvasH = +deck.canvasH;
    }
  } catch (e) {
    return '';
  }
  if (!slide) return '';
  try {
    const { drawSlideThumb } = await import('./slideThumb.js');
    const cnv = document.createElement('canvas');
    cnv.width = 160;
    cnv.height = Math.max(1, Math.round(160 * (canvasH / canvasW)));
    drawSlideThumb(cnv, slide, canvasW, canvasH);
    return cnv.toDataURL('image/jpeg', 0.72);
  } catch (e) {
    return '';
  }
}

/** get.php then direct — same two-step path as v7.1 gallery import/thumbs. */
export async function fetchCatalogFileRaw(base, relFile) {
  const rel = String(relFile || '').replace(/^\/+/, '');
  if (!rel) throw new Error('Пустой файл');
  try {
    return await fetchCatalogText(getPhpUrl(base, rel));
  } catch (e1) {
    const abs = joinUrl(base, rel);
    return await fetchCatalogText(needsProxyForBase(base) ? proxyUrl(base, { path: rel }) : abs);
  }
}

const thumbCache = new Map();

/** Fetch presentation and return thumb data-URL (cached by caller). */
export async function fetchCatalogItemThumb(base, relPath, item) {
  if (!item || item.type !== 'pres') return '';
  if (item.thumb && /^data:|^https?:/i.test(item.thumb)) return item.thumb;
  const relFile = `${String(relPath || '')}${String(item.file || '').replace(/^\//, '')}`.replace(/^\/+/, '');
  const cacheKey = `${normBase(base)}|${relFile}`;
  if (thumbCache.has(cacheKey)) return thumbCache.get(cacheKey);
  try {
    const raw = await fetchCatalogFileRaw(base, relFile);
    const url = await buildCatalogThumbDataUrl(raw, item.file || '');
    if (url) thumbCache.set(cacheKey, url);
    return url;
  } catch (e) {
    return '';
  }
}

export { splitAbsFile as splitImportAbsFile };
