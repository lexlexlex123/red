/** IndexedDB live deck, named library, and version snapshots (sf_react_v1). */

const DB_NAME = 'slides_react_app';
const DB_VER = 2;
const STORE = 'snapshots';
const STORE_LIVE = 'live';
const STORE_LIB = 'library';
const LIVE_KEY = 'current';
const MAX_SNAP = 20;

let _db = null;
let _throttle = null;
let _liveThrottle = null;
let _lastSaved = '';

function isQuotaError(e) {
  if (!e) return false;
  const name = e.name || '';
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 ||
    e.code === 1014
  );
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (_db && _db.version >= DB_VER) {
      resolve(_db);
      return;
    }
    if (_db) {
      try {
        _db.close();
      } catch (_) {
        /* ignore */
      }
      _db = null;
    }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        s.createIndex('ts', 'ts', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_LIVE)) {
        db.createObjectStore(STORE_LIVE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_LIB)) {
        const lib = db.createObjectStore(STORE_LIB, { keyPath: 'id' });
        lib.createIndex('ts', 'ts', { unique: false });
      }
    };
    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function idbSaveSnapshot(dataStr) {
  if (!dataStr || dataStr === _lastSaved) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    const s = tx.objectStore(STORE);
    s.add({ ts: Date.now(), data: dataStr });
    _lastSaved = dataStr;
    const countReq = s.count();
    countReq.onsuccess = () => {
      if (countReq.result > MAX_SNAP) {
        const cursorReq = s.openCursor();
        let toDelete = countReq.result - MAX_SNAP;
        cursorReq.onsuccess = (ev) => {
          const cursor = ev.target.result;
          if (cursor && toDelete > 0) {
            cursor.delete();
            toDelete -= 1;
            cursor.continue();
          }
        };
      }
    };
  } catch (e) {
    console.warn('[IDB] save failed', e);
    throw e;
  }
}

export function scheduleIdbSave(dataStr) {
  clearTimeout(_throttle);
  _throttle = setTimeout(() => {
    idbSaveSnapshot(dataStr).catch(() => {});
  }, 2000);
}

export async function idbSaveLive(payload) {
  if (!payload) return;
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LIVE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_LIVE).put({ id: LIVE_KEY, ts: Date.now(), data: payload });
  });
}

export function scheduleLiveSave(payload, onError) {
  clearTimeout(_liveThrottle);
  _liveThrottle = setTimeout(() => {
    idbSaveLive(payload).catch((e) => {
      console.warn('[IDB] live save failed', e);
      onError?.(e, isQuotaError(e));
    });
  }, 400);
}

export async function idbLoadLive() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_LIVE, 'readonly');
      const req = tx.objectStore(STORE_LIVE).get(LIVE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function idbClearLive() {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_LIVE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE_LIVE).delete(LIVE_KEY);
    });
  } catch (e) {
    /* ignore */
  }
}

function newLibId() {
  return 'lib_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function idbSaveLibrary(title, payload) {
  const rec = {
    id: newLibId(),
    title: String(title || 'Без названия'),
    ts: Date.now(),
    slides: Array.isArray(payload?.slides) ? payload.slides.length : 0,
    data: payload,
  };
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LIB, 'readwrite');
    tx.oncomplete = () => resolve(rec);
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_LIB).put(rec);
  });
  return rec;
}

export async function idbListLibrary() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_LIB, 'readonly');
      const req = tx.objectStore(STORE_LIB).getAll();
      req.onsuccess = () => {
        const all = (req.result || []).sort((a, b) => (b.ts || 0) - (a.ts || 0));
        resolve(all);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

export async function idbGetLibrary(id) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_LIB, 'readonly');
      const req = tx.objectStore(STORE_LIB).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function idbDeleteLibrary(id) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_LIB, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE_LIB).delete(id);
    });
  } catch (e) {
    /* ignore */
  }
}

export async function idbListSnapshots() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const s = tx.objectStore(STORE);
      const req = s.getAll();
      req.onsuccess = () => {
        const all = (req.result || []).sort((a, b) => b.ts - a.ts);
        resolve(all);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

export async function idbGetSnapshot(id) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export function formatSnapTime(ts, lang) {
  try {
    return new Date(ts).toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU');
  } catch (e) {
    return String(ts);
  }
}

export { isQuotaError };
