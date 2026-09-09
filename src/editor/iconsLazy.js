/**
 * Lazy facade over icons-data.js — keeps the ~280KB catalog out of the main chunk.
 * Call ensureIcons() early (boot / before export / before playback).
 */

let mod = null;
let loading = null;
const listeners = new Set();
const changeListeners = new Set();
let changeRev = 0;

export function iconsReady() {
  return !!mod;
}

export function ensureIcons() {
  if (mod) return Promise.resolve(mod);
  if (!loading) {
    loading = import('./icons-data.js')
      .then((m) => {
        mod = m;
        listeners.forEach((fn) => {
          try {
            fn();
          } catch (e) {}
        });
        return m;
      })
      .catch((err) => {
        loading = null;
        throw err;
      });
  }
  return loading;
}

/** Subscribe; fires immediately if already loaded. Returns unsubscribe. */
export function onIconsReady(fn) {
  if (typeof fn !== 'function') return () => {};
  if (mod) {
    try {
      fn();
    } catch (e) {}
    return () => {};
  }
  listeners.add(fn);
  ensureIcons();
  return () => listeners.delete(fn);
}

export function getIconById(id) {
  return mod ? mod.getIconById(id) : null;
}

export function iconsForCategory(catId) {
  return mod ? mod.iconsForCategory(catId) : [];
}

export function getIconCats() {
  return mod ? mod.ICON_CATS : [];
}

/** Subscribe to catalog mutations (edit an «Приложение» icon → chrome updates). */
export function onIconsChanged(fn) {
  if (typeof fn !== 'function') return () => {};
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

export function notifyIconsChanged() {
  changeRev += 1;
  changeListeners.forEach((fn) => {
    try {
      fn(changeRev);
    } catch (e) {}
  });
}

export function iconsChangeRev() {
  return changeRev;
}
