/**
 * Media store — large audio/video in IndexedDB, not localStorage.
 * Slim port of js/01b-media-store.js for React.
 */

const DB_NAME = 'slides_media';
const DB_VER = 1;
const STORE = 'files';
const LS_MAX_SRC = 8000;

let dbp = null;
/** @type {Map<string, {mime:string, dataUrl?:string, blobUrl?:string, blob?:Blob}>} */
const mem = new Map();

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

export async function putFromFile(file, mime) {
  const id = newId();
  const useMime = mime || file.type || 'application/octet-stream';
  const blob = file instanceof Blob ? file : new Blob([file], { type: useMime });
  const blobUrl = URL.createObjectURL(blob);
  mem.set(id, { mime: useMime, blobUrl, blob });
  try {
    await idbPut({ id, mime: useMime, blob, ts: Date.now() });
  } catch (e) {
    console.warn('[mediaStore] IDB put failed', e);
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
    return m.blobUrl || m.dataUrl || '';
  }
  try {
    const rec = await idbGet(mediaId);
    if (!rec?.blob) return '';
    const blobUrl = URL.createObjectURL(rec.blob);
    mem.set(mediaId, { mime: rec.mime || rec.blob.type || '', blobUrl, blob: rec.blob });
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

export async function hydrateSlides(slideList) {
  if (!slideList?.length) return 0;
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

export function isHeavySrc(src) {
  src = String(src || '');
  return src.startsWith('data:') || src.startsWith('blob:') || src.length > LS_MAX_SRC;
}

/** Clone slides for localStorage — strip heavy mediaSrc when mediaId present. */
export function slimSlidesForPersist(slides) {
  return (slides || []).map((s) => ({
    ...s,
    els: (s.els || []).map((el) => {
      if (!el) return el;
      if ((el.type === 'mediavideo' || el.type === 'mediaaudio') && el.mediaId && isHeavySrc(el.mediaSrc)) {
        return { ...el, mediaSrc: '', mediaSrcType: 'idb' };
      }
      return el;
    }),
  }));
}

/** Prepare deck for HTML export — embed data URLs for media. */
export async function prepareDeckMediaForExport(deck) {
  const out = JSON.parse(JSON.stringify(deck || {}));
  for (const s of out.slides || []) {
    for (const d of s.els || []) {
      if ((d.type !== 'mediavideo' && d.type !== 'mediaaudio') || !d.mediaId) continue;
      d.mediaSrc = await ensureDataUrl(d.mediaId, d.mediaSrc);
    }
  }
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
