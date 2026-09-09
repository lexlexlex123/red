/**
 * Cross-tab / OS clipboard for slide elements and slides.
 * Same-origin: localStorage + storage event.
 * Cross-origin: navigator.clipboard text with magic prefix.
 */

const KEY_EL = 'red-xclip-elements-v1';
const KEY_SL = 'red-xclip-slides-v1';
const KEY_META = 'red-xclip-meta-v1';
const MAGIC = '⟦RED-SLIDES:v1⟧';
const SYS_CLIP_MAX = 900 * 1024;

let ignoreStorage = false;
let appClipAt = 0;
let lastBlurAt = 0;
let clipSource = 'elements';

export function getAppClipAt() {
  return appClipAt;
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
  if (!d || typeof d !== 'object' || d.type !== 'image') return d;
  const src = d.src || '';
  if (src.startsWith('data:') || src.startsWith('blob:') || src.length > 8000) {
    return { ...d, src: '', _srcOmitted: true };
  }
  return d;
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

function saveMeta(kind, t) {
  try {
    const ts = t || Date.now();
    localStorage.setItem(KEY_META, JSON.stringify({ kind, t: ts }));
    clipSource = kind;
    appClipAt = ts;
  } catch (e) {}
}

/** Clear element clipboard state — call when copying slides to prevent element paste. */
export function clearElementClipboard() {
  try {
    localStorage.removeItem(KEY_EL);
  } catch (e) {}
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
 * @returns {Promise<boolean>}
 */
export async function writeOsClipboard(els) {
  if (!els?.length) return false;
  const slim = slimEls(els);
  writeLocalKey(KEY_EL, slim);
  writeLocalKey(KEY_SL, null);
  const t = Date.now();
  saveMeta('elements', t);
  const payload = {
    app: 'slides',
    v: 1,
    kind: 'elements',
    t,
    elements: slim,
    slides: null,
    ink: null,
    hadInk: false,
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
    saveMeta('elements', p.t);
    return { kind: 'elements', elements: merged };
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
