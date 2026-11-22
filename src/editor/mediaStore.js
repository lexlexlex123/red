/**
 * Media store — large audio/video in IndexedDB, not localStorage.
 * Slim port of js/01b-media-store.js for React.
 * Copies share one mediaId (content-hash dedupe) so the deck does not bloat.
 */

const DB_NAME = 'slides_media';
const DB_VER = 1;
const STORE = 'files';
const LS_MAX_SRC = 8000;

let dbp = null;
/** @type {Map<string, {mime:string, dataUrl?:string, blobUrl?:string, blob?:Blob, hash?:string}>} */
const mem = new Map();
/** @type {Map<string, string>} content hash → mediaId */
const hashIndex = new Map();

function openDb() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no indexedDB'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return dbp;
}

function newId() {
  return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function idbPut(rec) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => resolve(rec.id);
        tx.onerror = () => reject(tx.error);
        tx.objectStore(STORE).put(rec);
      })
  );
}

function idbGet(id) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      })
  );
}

async function hashBlob(blob) {
  const buf = await blob.arrayBuffer();
  if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
    const dig = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const u8 = new Uint8Array(buf);
  let h = `len${u8.length}:`;
  const step = Math.max(1, Math.floor(u8.length / 64));
  for (let i = 0; i < u8.length; i += step) h += u8[i].toString(16).padStart(2, '0');
  return h;
}

function rememberHash(hash, id) {
  if (hash && id) hashIndex.set(hash, id);
}

async function findIdByHash(hash) {
  if (!hash) return null;
  const known = hashIndex.get(hash);
  if (known) {
    if (mem.has(known)) return known;
    const rec = await idbGet(known);
    if (rec?.blob) {
      const blobUrl = URL.createObjectURL(rec.blob);
      mem.set(known, {
        mime: rec.mime || rec.blob.type || '',
        blobUrl,
        blob: rec.blob,
        hash,
      });
      return known;
    }
  }
  return null;
}

/** Store blob once; identical content reuses the same mediaId. */
export async function putFromBlob(blob, mime) {
  const useMime = mime || blob.type || 'application/octet-stream';
  const useBlob = blob instanceof Blob ? blob : new Blob([blob], { type: useMime });
  const hash = await hashBlob(useBlob);
  const existing = await findIdByHash(hash);
  if (existing) return existing;

  const id = newId();
  const blobUrl = URL.createObjectURL(useBlob);
  mem.set(id, { mime: useMime, blobUrl, blob: useBlob, hash });
  rememberHash(hash, id);
  try {
    await idbPut({ id, mime: useMime, blob: useBlob, hash, ts: Date.now() });
  } catch (e) {
    console.warn('[mediaStore] IDB put failed', e);
  }
  return id;
}

export async function putFromFile(file, mime) {
  const useMime = mime || file.type || 'application/octet-stream';
  const blob = file instanceof Blob ? file : new Blob([file], { type: useMime });
  return putFromBlob(blob, useMime);
}

export async function putFromDataUrl(dataUrl) {
  const src = String(dataUrl || '');
  if (!src.startsWith('data:')) return null;
  const res = await fetch(src);
  const blob = await res.blob();
  return putFromBlob(blob, blob.type || 'application/octet-stream');
}

/** Restore a packed media entry under a fixed id (JSON import). */
export async function putWithId(id, dataUrlOrBlob, mime) {
  if (!id) return null;
  let blob;
  let useMime = mime || '';
  if (typeof dataUrlOrBlob === 'string' && dataUrlOrBlob.startsWith('data:')) {
    const res = await fetch(dataUrlOrBlob);
    blob = await res.blob();
    useMime = useMime || blob.type || 'application/octet-stream';
  } else if (dataUrlOrBlob instanceof Blob) {
    blob = dataUrlOrBlob;
    useMime = useMime || blob.type || 'application/octet-stream';
  } else {
    return null;
  }
  const hash = await hashBlob(blob);
  const existing = await findIdByHash(hash);
  if (existing && existing !== id) {
    // Prefer existing id so later refs stay stable; map requested id → same play URL via mem alias.
    const play = await hydrate(existing);
    if (play) {
      mem.set(id, mem.get(existing));
      rememberHash(hash, existing);
    }
    return existing;
  }
  if (mem.get(id)?.blobUrl) {
    try {
      URL.revokeObjectURL(mem.get(id).blobUrl);
    } catch (e) {}
  }
  const blobUrl = URL.createObjectURL(blob);
  mem.set(id, { mime: useMime, blobUrl, blob, hash });
  rememberHash(hash, id);
  try {
    await idbPut({ id, mime: useMime, blob, hash, ts: Date.now() });
  } catch (e) {
    console.warn('[mediaStore] IDB putWithId failed', e);
  }
  return id;
}

export function getPlayUrl(mediaId, fallback) {
  if (mediaId && mem.has(mediaId)) {
    const m = mem.get(mediaId);
    return m.blobUrl || m.dataUrl || fallback || '';
  }
  return fallback || '';
}

export async function hydrate(mediaId) {
  if (!mediaId) return '';
  if (mem.has(mediaId)) {
    const m = mem.get(mediaId);
    if (m.hash) rememberHash(m.hash, mediaId);
    return m.blobUrl || m.dataUrl || '';
  }
  try {
    const rec = await idbGet(mediaId);
    if (!rec?.blob) return '';
    const blobUrl = URL.createObjectURL(rec.blob);
    mem.set(mediaId, {
      mime: rec.mime || rec.blob.type || '',
      blobUrl,
      blob: rec.blob,
      hash: rec.hash,
    });
    if (rec.hash) rememberHash(rec.hash, mediaId);
    return blobUrl;
  } catch (e) {
    console.warn('[mediaStore] hydrate failed', mediaId, e);
    return '';
  }
}

export async function ensureDataUrl(mediaId, fallbackSrc) {
  if (fallbackSrc && String(fallbackSrc).startsWith('data:')) return fallbackSrc;
  if (mediaId && mem.has(mediaId) && mem.get(mediaId).dataUrl) return mem.get(mediaId).dataUrl;
  await hydrate(mediaId);
  const entry = mediaId && mem.get(mediaId);
  if (entry?.blob && !entry.dataUrl) {
    entry.dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(entry.blob);
    });
  }
  if (entry?.dataUrl) return entry.dataUrl;
  return fallbackSrc || '';
}

export function isHeavySrc(src) {
  src = String(src || '');
  return src.startsWith('data:') || src.startsWith('blob:') || src.length > LS_MAX_SRC;
}

/** Drop session/blob/data payloads when a stable mediaId exists. */
export function slimMediaEl(el) {
  if (!el || (el.type !== 'mediavideo' && el.type !== 'mediaaudio')) return el;
  if (el.mediaId && isHeavySrc(el.mediaSrc)) {
    return { ...el, mediaSrc: '', mediaSrcType: 'idb' };
  }
  return el;
}

/**
 * Ensure the element points at a shared mediaId (deduped by content).
 * Heavy inline data URLs are moved into the media store once.
 */
export async function ensureElementMediaId(el) {
  if (!el || (el.type !== 'mediavideo' && el.type !== 'mediaaudio')) return el;
  if (el.mediaId) return slimMediaEl(el);
  const src = String(el.mediaSrc || '');
  if (src.startsWith('data:')) {
    try {
      const mediaId = await putFromDataUrl(src);
      if (mediaId) return { ...el, mediaId, mediaSrc: '', mediaSrcType: 'idb' };
    } catch (e) {
      console.warn('[mediaStore] ensureElementMediaId', e);
    }
  }
  return el;
}

/** Walk deck and collapse duplicate audio/video payloads onto shared mediaIds. */
export async function dedupeDeckMedia(slides) {
  if (!slides?.length) return false;
  let changed = false;
  for (const s of slides) {
    if (!s?.els?.length) continue;
    for (let i = 0; i < s.els.length; i++) {
      const el = s.els[i];
      if (!el || (el.type !== 'mediaaudio' && el.type !== 'mediavideo')) continue;
      const next = await ensureElementMediaId(el);
      if (
        next.mediaId !== el.mediaId ||
        next.mediaSrc !== el.mediaSrc ||
        next.mediaSrcType !== el.mediaSrcType
      ) {
        s.els[i] = next;
        changed = true;
      }
    }
  }
  return changed;
}

export async function hydrateSlides(slideList) {
  if (!slideList?.length) return 0;
  await dedupeDeckMedia(slideList);
  let n = 0;
  for (const s of slideList) {
    for (const d of s.els || []) {
      if ((d.type !== 'mediavideo' && d.type !== 'mediaaudio') || !d.mediaId) continue;
      const url = await hydrate(d.mediaId);
      if (url) {
        d.mediaSrc = url;
        d.mediaSrcType = 'idb';
        n++;
      }
    }
  }
  return n;
}

/** Clone slides for localStorage — strip heavy mediaSrc when mediaId present. */
export function slimSlidesForPersist(slides) {
  return (slides || []).map((s) => ({
    ...s,
    els: (s.els || []).map((el) => {
      if (!el) return el;
      let next = el;
      // _mesh holds Float32Arrays — JSON round-trip turns them into plain objects and
      // the viewer then draws nothing after reload / slide switch restore. Keep objText only.
      if (el._mesh != null || el.type === 'model3d') {
        const { _mesh, ...rest } = el;
        next = rest;
      }
      return slimMediaEl(next);
    }),
  }));
}

/**
 * Pack deck for JSON download: one media entry per unique mediaId.
 * Elements keep mediaId and empty mediaSrc.
 */
export async function packDeckForFile(deck) {
  const out = JSON.parse(JSON.stringify(deck || {}));
  out.slides = slimSlidesForPersist(out.slides);
  await dedupeDeckMedia(out.slides);
  const media = {};
  for (const s of out.slides || []) {
    for (const d of s.els || []) {
      if (!d || (d.type !== 'mediavideo' && d.type !== 'mediaaudio')) continue;
      if (!d.mediaId) continue;
      if (media[d.mediaId]) {
        d.mediaSrc = '';
        d.mediaSrcType = 'idb';
        continue;
      }
      const dataUrl = await ensureDataUrl(d.mediaId, d.mediaSrc);
      if (dataUrl && String(dataUrl).startsWith('data:')) {
        media[d.mediaId] = dataUrl;
      }
      d.mediaSrc = '';
      d.mediaSrcType = 'idb';
    }
  }
  if (Object.keys(media).length) out.media = media;
  else delete out.media;
  return out;
}

/** Restore packed `media` map into IndexedDB and point elements at shared ids. */
export async function unpackDeckMedia(deck) {
  if (!deck || typeof deck !== 'object') return deck;
  const media = deck.media && typeof deck.media === 'object' ? deck.media : null;
  if (media) {
    for (const [id, dataUrl] of Object.entries(media)) {
      if (!dataUrl) continue;
      try {
        await putWithId(id, dataUrl);
      } catch (e) {
        console.warn('[mediaStore] unpack', id, e);
      }
    }
  }
  await dedupeDeckMedia(deck.slides || []);
  return deck;
}

/**
 * Prepare deck for HTML/PPTX export.
 * Identical audio/video bytes become one entry in `deck.media`; elements keep mediaId
 * and a shared in-memory mediaSrc string (for exporters that read el.mediaSrc).
 */
export async function prepareDeckMediaForExport(deck) {
  const out = JSON.parse(JSON.stringify(deck || {}));
  await dedupeDeckMedia(out.slides || []);
  const media = {};
  for (const s of out.slides || []) {
    for (const d of s.els || []) {
      if (!d || (d.type !== 'mediavideo' && d.type !== 'mediaaudio')) continue;
      if (!d.mediaId) {
        const next = await ensureElementMediaId(d);
        if (next !== d) Object.assign(d, next);
      }
      if (!d.mediaId) continue;
      if (!media[d.mediaId]) {
        const dataUrl = await ensureDataUrl(d.mediaId, d.mediaSrc);
        media[d.mediaId] =
          dataUrl && String(dataUrl).startsWith('data:') ? dataUrl : d.mediaSrc || '';
      }
      d.mediaSrc = media[d.mediaId] || '';
      d.mediaSrcType = 'idb';
    }
  }
  if (Object.keys(media).length) out.media = media;
  else delete out.media;
  return out;
}

export function resolveMediaSrc(el) {
  if (!el) return '';
  if (el.mediaId) {
    const play = getPlayUrl(el.mediaId, '');
    if (play) return play;
  }
  return el.mediaSrc || '';
}
