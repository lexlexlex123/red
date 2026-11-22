/** Sync the slideshow (projector) with a second presenter window. */

export const PRESENTER_CHANNEL = 'slides-presenter-v1';
export const PRESENTER_WIN_NAME = 'slides-presenter';

export function isPresenterQuery() {
  try {
    return new URLSearchParams(location.search).get('presenter') === '1';
  } catch (e) {
    return false;
  }
}

export function presenterUrl() {
  const u = new URL(location.href);
  u.searchParams.set('presenter', '1');
  u.hash = '';
  return u.toString();
}

let presenterWin = null;

export function closePresenterWindow() {
  if (presenterWin && !presenterWin.closed) {
    try {
      presenterWin.close();
    } catch (e) {}
  }
  presenterWin = null;
}

/** @param {{ left?: number, top?: number, width?: number, height?: number }} [pos] */
export function openPresenterWindow(pos) {
  const left = pos && Number.isFinite(+pos.left) ? Math.round(+pos.left) : null;
  const top = pos && Number.isFinite(+pos.top) ? Math.round(+pos.top) : 0;
  const w = pos && Number.isFinite(+pos.width) ? Math.round(+pos.width) : 1280;
  const h = pos && Number.isFinite(+pos.height) ? Math.round(+pos.height) : 800;
  const features =
    left != null
      ? `popup=yes,left=${left},top=${top},width=${w},height=${h},menubar=no,toolbar=no,location=no,status=no`
      : 'popup=yes,width=1280,height=800,menubar=no,toolbar=no,location=no,status=no';
  if (presenterWin && !presenterWin.closed) {
    try {
      if (left != null) {
        presenterWin.moveTo(left, top);
        presenterWin.resizeTo(w, h);
      }
      presenterWin.focus();
    } catch (e) {}
    return presenterWin;
  }
  try {
    presenterWin = window.open(presenterUrl(), PRESENTER_WIN_NAME, features);
  } catch (e) {
    presenterWin = null;
  }
  if (presenterWin && left != null) {
    try {
      presenterWin.moveTo(left, top);
      presenterWin.resizeTo(w, h);
    } catch (e) {}
  }
  return presenterWin;
}

let channel = null;

function getChannel() {
  if (channel) return channel;
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    channel = new BroadcastChannel(PRESENTER_CHANNEL);
  } catch (e) {
    channel = null;
  }
  return channel;
}

export function postPresenter(msg) {
  const ch = getChannel();
  if (!ch || !msg) return;
  try {
    ch.postMessage(msg);
  } catch (e) {}
}

export function subscribePresenter(handler) {
  const ch = getChannel();
  if (!ch) return () => {};
  const onMsg = (e) => {
    try {
      handler(e.data);
    } catch (err) {}
  };
  ch.addEventListener('message', onMsg);
  return () => {
    try {
      ch.removeEventListener('message', onMsg);
    } catch (e) {}
  };
}

export function makePresenterState({
  idx = 0,
  nextIdx = -1,
  notes = '',
  title = '',
  n = 0,
  visPos = 1,
  visN = 0,
  startedAt = 0,
  black = false,
  shuffle = false,
  live = true,
} = {}) {
  return {
    t: 'state',
    idx: idx | 0,
    nextIdx: nextIdx | 0,
    notes: String(notes || ''),
    title: String(title || ''),
    n: n | 0,
    visPos: visPos | 0,
    visN: visN | 0,
    startedAt: +startedAt || 0,
    black: !!black,
    shuffle: !!shuffle,
    live: !!live,
  };
}
