// ══════════════ MEDIA STORE (IndexedDB) ══════════════
// Крупные audio/video не кладём в localStorage — только mediaId + blob в IDB.
(function () {
  'use strict';

  const DB_NAME = 'slides_media';
  const DB_VER = 1;
  const STORE = 'files';
  const LS_MAX_SRC = 8000; // короткие url можно хранить в LS

  let _dbp = null;
  /** @type {Map<string, {mime:string, dataUrl?:string, blobUrl?:string, blob?:Blob}>} */
  const _mem = new Map();

  function _open() {
    if (_dbp) return _dbp;
    _dbp = new Promise((resolve, reject) => {
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
    return _dbp;
  }

  function _newId() {
    return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function _dataUrlToBlob(dataUrl) {
    const m = String(dataUrl || '').match(/^data:([^;,]+)?(;base64)?,(.*)$/);
    if (!m) throw new Error('bad data url');
    const mime = m[1] || 'application/octet-stream';
    const b64 = !!m[2];
    const data = m[3] || '';
    if (b64) {
      const bin = atob(data);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    }
    return new Blob([decodeURIComponent(data)], { type: mime });
  }

  function _idbPut(rec) {
    return _open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.oncomplete = () => resolve(rec.id);
          tx.onerror = () => reject(tx.error);
          tx.objectStore(STORE).put(rec);
        })
    );
  }

  function _idbGet(id) {
    return _open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readonly');
          const req = tx.objectStore(STORE).get(id);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        })
    );
  }

  async function putFromDataUrl(dataUrl, mime) {
    const id = _newId();
    const blob = _dataUrlToBlob(dataUrl);
    const useMime = mime || blob.type || 'application/octet-stream';
    const blobUrl = URL.createObjectURL(blob);
    _mem.set(id, { mime: useMime, dataUrl, blobUrl, blob });
    try {
      await _idbPut({ id, mime: useMime, blob, ts: Date.now() });
    } catch (e) {
      console.warn('[MediaStore] IDB put failed, keeping in memory', e);
    }
    return id;
  }

  async function putFromFile(file, mime) {
    const id = _newId();
    const useMime = mime || file.type || 'application/octet-stream';
    const blob = file instanceof Blob ? file : new Blob([file], { type: useMime });
    const blobUrl = URL.createObjectURL(blob);
    _mem.set(id, { mime: useMime, blobUrl, blob });
    try {
      await _idbPut({ id, mime: useMime, blob, ts: Date.now() });
    } catch (e) {
      console.warn('[MediaStore] IDB put failed, keeping in memory', e);
    }
    // dataUrl опционально — только если нужно для экспорта; строим лениво
    return id;
  }

  function getPlayUrl(mediaId, fallback) {
    if (mediaId && _mem.has(mediaId)) {
      const m = _mem.get(mediaId);
      return m.blobUrl || m.dataUrl || fallback || '';
    }
    return fallback || '';
  }

  async function getBlob(mediaId) {
    if (!mediaId) return null;
    if (_mem.has(mediaId) && _mem.get(mediaId).blob) return _mem.get(mediaId).blob;
    try {
      const rec = await _idbGet(mediaId);
      if (rec && rec.blob) {
        const blobUrl = URL.createObjectURL(rec.blob);
        _mem.set(mediaId, { mime: rec.mime || rec.blob.type || '', blobUrl, blob: rec.blob });
        return rec.blob;
      }
    } catch (e) {}
    return null;
  }

  async function getSize(mediaId) {
    const blob = await getBlob(mediaId);
    return blob ? blob.size : 0;
  }

  /** Макс. размер одного медиа для компактного JSON (base64 раздувает ~+33%). */
  const EMBED_MAX_BYTES = 2.5 * 1024 * 1024;

  function _blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  /**
   * Встроить медиа в data URL без лимита размера (полный HTML-экспорт).
   * Не кэширует dataUrl в _mem — чтобы не держать две копии в памяти.
   */
  async function exportDataUrl(mediaId, fallbackSrc) {
    if (fallbackSrc && String(fallbackSrc).startsWith('data:')) {
      return { ok: true, dataUrl: fallbackSrc, size: fallbackSrc.length };
    }
    if (fallbackSrc && /^https?:/i.test(fallbackSrc)) {
      return { ok: true, dataUrl: fallbackSrc, size: 0 };
    }
    let blob = null;
    if (mediaId) {
      blob = await getBlob(mediaId);
    }
    if (!blob && fallbackSrc && String(fallbackSrc).startsWith('blob:')) {
      try {
        blob = await fetch(fallbackSrc).then((r) => r.blob());
      } catch (e) {}
    }
    if (!blob) {
      try {
        const du = await ensureDataUrl(mediaId, fallbackSrc);
        if (du && String(du).startsWith('data:')) return { ok: true, dataUrl: du, size: du.length };
        if (du && /^https?:/i.test(du)) return { ok: true, dataUrl: du, size: 0 };
      } catch (e) {
        return { ok: false, reason: 'error', error: e };
      }
      return { ok: false, reason: 'empty' };
    }
    try {
      const dataUrl = await _blobToDataUrl(blob);
      return { ok: true, dataUrl, size: blob.size };
    } catch (e) {
      return { ok: false, reason: 'error', error: e };
    }
  }

  async function exportDataUrlIfSmall(mediaId, fallbackSrc, maxBytes) {
    const limit = maxBytes != null ? maxBytes : EMBED_MAX_BYTES;
    if (mediaId) {
      const sz = await getSize(mediaId);
      if (sz > limit) return { ok: false, reason: 'too_large', size: sz };
      try {
        const dataUrl = await ensureDataUrl(mediaId, fallbackSrc);
        if (!dataUrl || !String(dataUrl).startsWith('data:')) return { ok: false, reason: 'no_data' };
        if (dataUrl.length > limit * 1.4) return { ok: false, reason: 'too_large', size: dataUrl.length };
        return { ok: true, dataUrl };
      } catch (e) {
        return { ok: false, reason: 'error', error: e };
      }
    }
    if (fallbackSrc && String(fallbackSrc).startsWith('data:')) {
      if (fallbackSrc.length > limit * 1.4) return { ok: false, reason: 'too_large', size: fallbackSrc.length };
      return { ok: true, dataUrl: fallbackSrc };
    }
    if (fallbackSrc && String(fallbackSrc).startsWith('blob:')) {
      try {
        const blob = await fetch(fallbackSrc).then((r) => r.blob());
        if (blob.size > limit) return { ok: false, reason: 'too_large', size: blob.size };
        const dataUrl = await _blobToDataUrl(blob);
        return { ok: true, dataUrl };
      } catch (e) {
        return { ok: false, reason: 'error', error: e };
      }
    }
    if (fallbackSrc && /^https?:/i.test(fallbackSrc)) return { ok: true, dataUrl: fallbackSrc };
    return { ok: false, reason: 'empty' };
  }

  async function hydrate(mediaId) {
    if (!mediaId) return '';
    if (_mem.has(mediaId)) return getPlayUrl(mediaId);
    try {
      const rec = await _idbGet(mediaId);
      if (!rec || !rec.blob) return '';
      const blobUrl = URL.createObjectURL(rec.blob);
      _mem.set(mediaId, { mime: rec.mime || rec.blob.type || '', blobUrl, blob: rec.blob });
      return blobUrl;
    } catch (e) {
      console.warn('[MediaStore] hydrate failed', mediaId, e);
      return '';
    }
  }

  async function ensureDataUrl(mediaId, fallbackSrc) {
    if (fallbackSrc && String(fallbackSrc).startsWith('data:')) return fallbackSrc;
    if (mediaId && _mem.has(mediaId) && _mem.get(mediaId).dataUrl) return _mem.get(mediaId).dataUrl;
    const play = await hydrate(mediaId);
    const entry = mediaId && _mem.get(mediaId);
    if (entry && entry.blob && !entry.dataUrl) {
      entry.dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(entry.blob);
      });
    }
    if (entry && entry.dataUrl) return entry.dataUrl;
    if (play && String(play).startsWith('blob:')) {
      try {
        const blob = await fetch(play).then((r) => r.blob());
        return await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
      } catch (e) {}
    }
    return fallbackSrc || '';
  }

  async function hydrateSlides(slideList) {
    if (!slideList || !slideList.length) return 0;
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

  /** Убрать тяжёлые data:/blob: из копии для localStorage */
  function stripElForPersist(d) {
    if (!d || (d.type !== 'mediavideo' && d.type !== 'mediaaudio')) return d;
    const src = d.mediaSrc || '';
    const keepShort =
      src &&
      !src.startsWith('data:') &&
      !src.startsWith('blob:') &&
      src.length <= LS_MAX_SRC;
    const out = Object.assign({}, d);
    if (d.mediaId) {
      out.mediaSrc = keepShort ? src : '';
      out.mediaSrcType = keepShort ? d.mediaSrcType : 'idb';
    } else if (src.startsWith('data:') && src.length > LS_MAX_SRC) {
      // Нет mediaId — не пишем гигантский dataURL в LS
      out.mediaSrc = '';
      out._mediaNeedsReselect = true;
    } else if (src.startsWith('blob:')) {
      out.mediaSrc = '';
    }
    return out;
  }

  function stripSlidesForPersist(slideList) {
    return (slideList || []).map((s) =>
      Object.assign({}, s, {
        els: (s.els || []).map(stripElForPersist),
      })
    );
  }

  window.MediaStore = {
    putFromDataUrl,
    putFromFile,
    getPlayUrl,
    getBlob,
    getSize,
    hydrate,
    hydrateSlides,
    ensureDataUrl,
    exportDataUrl,
    exportDataUrlIfSmall,
    stripElForPersist,
    stripSlidesForPersist,
    LS_MAX_SRC,
    EMBED_MAX_BYTES,
  };
})();
