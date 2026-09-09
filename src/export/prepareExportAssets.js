/**
 * Make a deck self-contained for HTML / playback export:
 * media from IndexedDB plus gallery / blob images as data URLs.
 */

import { prepareDeckMediaForExport } from '../editor/mediaStore.js';

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function needsInline(src) {
  if (!src || typeof src !== 'string') return false;
  if (src.startsWith('data:')) return false;
  return true;
}

function candidateUrls(src) {
  const s = String(src || '');
  const out = [];
  const add = (u) => {
    if (u && !out.includes(u)) out.push(u);
  };
  add(s);
  if (s.startsWith('blob:') || s.startsWith('http:') || s.startsWith('https:')) return out;
  const trimmed = s.replace(/^\.\//, '');
  if (trimmed.startsWith('/')) add(trimmed);
  else add('/' + trimmed);
  const m = trimmed.match(/(?:^|\/)(images|audio|icons|themes)\/[^?#]+/);
  if (m) add('/' + m[0].replace(/^\//, ''));
  return out;
}

async function urlToDataUrl(src, cache) {
  if (!needsInline(src)) return src;
  if (cache.has(src)) return cache.get(src);
  const pending = (async () => {
    if (src.startsWith('blob:')) {
      try {
        const blob = await fetch(src).then((r) => r.blob());
        return await blobToDataUrl(blob);
      } catch (e) {
        return src;
      }
    }
    for (const u of candidateUrls(src)) {
      try {
        const r = await fetch(u);
        if (!r.ok) continue;
        const blob = await r.blob();
        if (!blob || !blob.size) continue;
        return await blobToDataUrl(blob);
      } catch (e) {}
    }
    return src;
  })();
  cache.set(src, pending);
  const du = await pending;
  cache.set(src, du);
  return du;
}

async function rewriteSrc(obj, key, cache) {
  if (!obj || !obj[key] || !needsInline(obj[key])) return;
  const du = await urlToDataUrl(obj[key], cache);
  if (du && du !== obj[key]) obj[key] = du;
}

/**
 * @param {object} deck
 * @returns {Promise<object>} cloned deck with inlined assets
 */
export async function prepareDeckForHtmlExport(deck) {
  const withMedia = await prepareDeckMediaForExport(deck);
  const cache = new Map();
  for (const s of withMedia.slides || []) {
    if (s.bgImg) await rewriteSrc(s.bgImg, 'src', cache);
    for (const d of s.els || []) {
      if (!d) continue;
      await rewriteSrc(d, 'src', cache);
      await rewriteSrc(d, 'graphImg', cache);
      await rewriteSrc(d, 'mediaSrc', cache);
    }
  }
  return withMedia;
}

export default { prepareDeckForHtmlExport };
