/** IndexedDB version history for React deck (sf_react_v1). */

const DB_NAME = 'slides_react_app';
const DB_VER = 1;
const STORE = 'snapshots';
const MAX_SNAP = 20;

let _db = null;
let _throttle = null;
let _lastSaved = '';

function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) {
      resolve(_db);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        s.createIndex('ts', 'ts', { unique: false });
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
  }
}

export function scheduleIdbSave(dataStr) {
  clearTimeout(_throttle);
  _throttle = setTimeout(() => {
    idbSaveSnapshot(dataStr);
  }, 2000);
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
