/**
 * Cross-tab / OS clipboard for slide elements and slides.
 * Same-origin: localStorage + storage event.
 * Cross-origin: navigator.clipboard text with magic prefix.
 */

import { slimMediaEl } from './mediaStore.js';

const KEY_EL = 'red-xclip-elements-v1';
const KEY_SL = 'red-xclip-slides-v1';
const KEY_META = 'red-xclip-meta-v1';
const MAGIC = '⟦RED-SLIDES:v1⟧';
const SYS_CLIP_MAX = 900 * 1024;

let ignoreStorage = false;
let appClipAt = 0;
let lastBlurAt = 0;
let clipSource = 'elements';
let copySourceSlideIdx = null;

export function getAppClipAt() {
  return appClipAt;
}

export function getCopySourceSlideIdx() {
  return copySourceSlideIdx;
}

export function getLastBlurAt() {
  return lastBlurAt;
}

export function markWindowBlur() {
  lastBlurAt = Date.now();
}

export function getClipSource() {
  return clipSource;
}

/** Reset clip source to elements — call when user copies elements or selects canvas objects. */
export function resetClipSource() {
  clipSource = 'elements';
  try {
    localStorage.setItem(KEY_META, JSON.stringify({ kind: 'elements', t: Date.now() }));
  } catch (e) {}
}

export function isSystemClipText(text) {
  return String(text || '').includes(MAGIC);
}

function byteLen(s) {
  try {
    return new Blob([s]).size;
  } catch (e) {
    return String(s || '').length * 2;
  }
}

function slimImageFields(d) {
  if (!d || typeof d !== 'object') return d;
  let next = d;
  if (d.type === 'image') {
    const src = d.src || '';
    if (src.startsWith('data:') || src.startsWith('blob:') || src.length > 8000) {
      next = { ...d, src: '', _srcOmitted: true };
    }
  }
  return slimMediaEl(next);
}

function slimEls(arr) {
  return (arr || []).map(slimImageFields);
}

function slimSlides(list) {
  return (list || []).map((s) => {
    if (!s || !s.els) return s;
    return { ...s, els: (s.els || []).map(slimImageFields) };
  });
}

function writeLocalKey(key, data) {
  try {
    ignoreStorage = true;
    if (data?.length) localStorage.setItem(key, JSON.stringify({ t: Date.now(), data }));
    else localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn('[osClipboard] localStorage failed', e);
    return false;
  } finally {
    setTimeout(() => {
      ignoreStorage = false;
    }, 0);
  }
}

function readLocalKey(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data?.length ? parsed.data : null;
  } catch (e) {
    return null;
  }
}

function saveMeta(kind, t, sourceSlideIdx) {
  try {
    const ts = t || Date.now();
    localStorage.setItem(KEY_META, JSON.stringify({ kind, t: ts, sourceSlideIdx }));
    clipSource = kind;
    appClipAt = ts;
    if (sourceSlideIdx != null) copySourceSlideIdx = sourceSlideIdx;
  } catch (e) {}
}

/** Clear element clipboard state — call when copying slides to prevent element paste. */
export function clearElementClipboard() {
  try {
    localStorage.removeItem(KEY_EL);
  } catch (e) {}
}

/**
 * Mark that the OS clipboard now holds plain/HTML text from an in-canvas selection
 * (not a Slidy element payload). Clears the local element clip so paste doesn't
 * resurrect a previous object copy.
 */
export function markPlainTextClipboard() {
  clipSource = 'text';
  appClipAt = Date.now();
  clearElementClipboard();
  try {
    localStorage.setItem(KEY_META, JSON.stringify({ kind: 'text', t: appClipAt }));
  } catch (e) {}
}

/**
 * Non-collapsed text selection inside a slide canvas contentEditable (text / shape text).
 * Works even when focus has moved to the format toolbar but the selection remains.
 * @returns {{ text: string, html: string }|null}
 */
export function readCanvasTextSelection() {
  const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  let range;
  try {
    range = sel.getRangeAt(0);
  } catch (e) {
    return null;
  }
  const node = range.commonAncestorContainer;
  const el = node?.nodeType === 1 ? node : node?.parentElement;
  if (!el || typeof el.closest !== 'function') return null;
  const editable = el.closest('[contenteditable="true"]');
  if (!editable) return null;
  if (
    !editable.closest(
      '.react-el, .react-slide-stage, .react-canvas-host, .react-canvas-viewport, .slide-canvas-host'
    )
  ) {
    return null;
  }
  const text = String(sel.toString() || '');
  if (!text) return null;
  let html = '';
  try {
    const div = document.createElement('div');
    div.appendChild(range.cloneContents());
    html = div.innerHTML || '';
  } catch (e) {}
  return { text, html };
}

/** Write a canvas text selection to the OS clipboard. */
export async function writePlainTextClipboard(text, html) {
  const plain = String(text || '');
  if (!plain) return false;
  markPlainTextClipboard();
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      const parts = {
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      };
      if (html) parts['text/html'] = new Blob([String(html)], { type: 'text/html' });
      await navigator.clipboard.write([new ClipboardItem(parts)]);
      return true;
    }
  } catch (e) {}
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(plain);
      return true;
    }
  } catch (e) {}
  return false;
}

function unpackText(text) {
  const t = String(text || '');
  const idx = t.indexOf(MAGIC);
  if (idx < 0) return null;
  try {
    const parsed = JSON.parse(t.slice(idx + MAGIC.length));
    if (!parsed || parsed.app !== 'slides' || !parsed.v) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function mergeImageSrc(incoming, prev) {
  if (!incoming?.length) return incoming;
  if (!prev?.length) return incoming;
  return incoming.map((inc, i) => {
    const p = prev[i];
    if (inc?.type === 'image' && p?.type === 'image' && p.src && (!inc.src || inc._srcOmitted)) {
      return { ...inc, src: p.src, imageId: inc.imageId || p.imageId };
    }
    return inc;
  });
}

async function writeSysPayload(payload) {
  const text = MAGIC + JSON.stringify(payload);
  if (byteLen(text) > SYS_CLIP_MAX) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn('[osClipboard] write failed', e);
  }
  return false;
}

/**
 * Write elements to OS clipboard + localStorage.
 * @param {object[]} els
 * @param {number} [sourceSlideIdx] index of the slide these elements were copied from, so a
 *   paste onto a DIFFERENT slide can keep the exact original x/y instead of nudging it.
 * @returns {Promise<boolean>}
 */
export async function writeOsClipboard(els, sourceSlideIdx) {
  if (!els?.length) return false;
  const slim = slimEls(els);
  writeLocalKey(KEY_EL, slim);
  writeLocalKey(KEY_SL, null);
  const t = Date.now();
  saveMeta('elements', t, sourceSlideIdx);
  const payload = {
    app: 'slides',
    v: 1,
    kind: 'elements',
    t,
    elements: slim,
    slides: null,
    ink: null,
    hadInk: false,
    sourceSlideIdx: sourceSlideIdx != null ? sourceSlideIdx : null,
  };
  return writeSysPayload(payload);
}

/**
 * Write slides to OS clipboard + localStorage (cross-tab).
 * @param {object[]} slides
 * @returns {Promise<boolean>}
 */
export async function writeOsSlideClipboard(slides) {
  if (!slides?.length) return false;
  const slim = slimSlides(slides);
  writeLocalKey(KEY_SL, slim);
  writeLocalKey(KEY_EL, null);
  const t = Date.now();
  saveMeta('slides', t);
  const payload = {
    app: 'slides',
    v: 1,
    kind: 'slides',
    t,
    elements: null,
    slides: slim,
    ink: null,
    hadInk: false,
  };
  return writeSysPayload(payload);
}

/**
 * Hydrate in-memory clipboards from MAGIC / localStorage payload.
 * @returns {{ kind: string, elements?: object[], slides?: object[] }|null}
 */
export function hydrateFromSystemText(text, prevElements) {
  const p = unpackText(text);
  if (!p) return null;
  const kind =
    p.kind ||
    (p.slides?.length ? 'slides' : p.elements?.length ? 'elements' : null);
  if (!kind) return null;
  // Guard against a stale OS clipboard write: if the async navigator.clipboard.writeText()
  // from an earlier copy (e.g. a slide) never landed or lagged, the system clipboard can still
  // hold an OLD magic payload while the in-app store already holds a NEWER copy (e.g. an element).
  // Without this check, pasting would resurrect that older slide/element instead of the fresh copy.
  if (p.t != null && appClipAt && p.t < appClipAt) return null;
  if (kind === 'slides' && p.slides?.length) {
    writeLocalKey(KEY_SL, p.slides);
    writeLocalKey(KEY_EL, null);
    saveMeta('slides', p.t);
    return { kind: 'slides', slides: p.slides };
  }
  if (kind === 'elements' && p.elements?.length) {
    const merged = mergeImageSrc(p.elements, prevElements);
    writeLocalKey(KEY_EL, merged);
    writeLocalKey(KEY_SL, null);
    saveMeta('elements', p.t, p.sourceSlideIdx != null ? p.sourceSlideIdx : undefined);
    return { kind: 'elements', elements: merged, sourceSlideIdx: p.sourceSlideIdx != null ? p.sourceSlideIdx : null };
  }
  return null;
}

/**
 * Read elements from OS clipboard, else localStorage.
 * @param {object[]|null} prevClipboard
 * @returns {Promise<object[]|null>}
 */
export async function readOsClipboard(prevClipboard) {
  try {
    if (navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      const hydrated = hydrateFromSystemText(text, prevClipboard);
      if (hydrated?.kind === 'elements' && hydrated.elements?.length) return hydrated.elements;
    }
  } catch (e) {
    /* permission / insecure context */
  }
  const local = readLocalKey(KEY_EL);
  if (local?.length) return mergeImageSrc(local, prevClipboard);
  return null;
}

/**
 * Read slides from OS clipboard / localStorage.
 * @returns {Promise<object[]|null>}
 */
export async function readOsSlideClipboard() {
  try {
    if (navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      const hydrated = hydrateFromSystemText(text, null);
      if (hydrated?.kind === 'slides' && hydrated.slides?.length) return hydrated.slides;
    }
  } catch (e) {}
  return readLocalKey(KEY_SL);
}

export function peekLocalSlides() {
  return readLocalKey(KEY_SL);
}

export function peekLocalElements() {
  return readLocalKey(KEY_EL);
}

/** Listen for same-origin tab copies; optional callback(els). */
export function subscribeOsClipboard(onElements) {
  const handler = (e) => {
    if (ignoreStorage || !e.newValue) return;
    if (e.key === KEY_EL) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed?.data?.length && typeof onElements === 'function') onElements(parsed.data);
      } catch (err) {}
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export { MAGIC };
