import { useEffect, useState } from 'react';
import { closePresenterWindow, openPresenterWindow } from './presenterChannel.js';

let detailsLive = null;

export function hasScreenDetailsApi() {
  return typeof window !== 'undefined' && typeof window.getScreenDetails === 'function';
}

export function screenKey(s) {
  if (!s) return '';
  if (typeof s.key === 'string' && s.key) return s.key;
  return `${s.left | 0},${s.top | 0},${s.width | 0}x${s.height | 0}`;
}

export function screenLabel(s, i, ru) {
  const name = String(s?.label || '').trim();
  const n = (i | 0) + 1;
  const base = name || (ru ? `Монитор ${n}` : `Display ${n}`);
  if (s?.isCurrent) return ru ? `${base} · этот` : `${base} · this`;
  if (s?.isPrimary) return ru ? `${base} · основной` : `${base} · primary`;
  return base;
}

export function serializeScreens(details) {
  const screens = details?.screens ? [...details.screens] : [];
  const current = details?.currentScreen || null;
  const currentKey = current ? screenKey(current) : '';
  return screens.map((s, i) => ({
    key: screenKey(s),
    label: String(s.label || ''),
    isPrimary: !!s.isPrimary,
    isCurrent: currentKey ? screenKey(s) === currentKey : i === 0,
    left: s.left | 0,
    top: s.top | 0,
    width: s.width | 0,
    height: s.height | 0,
  }));
}

export function pickShowAndPresenter(screens, savedShowKey) {
  const list = screens || [];
  if (list.length < 2) {
    return { multi: false, show: list[0] || null, presenter: null };
  }
  let show = list.find((s) => s.key === savedShowKey) || null;
  if (!show) {
    show = list.find((s) => !s.isCurrent) || list.find((s) => !s.isPrimary) || list[1] || list[0];
  }
  let presenter = list.find((s) => s.isCurrent && s.key !== show.key) || null;
  if (!presenter) presenter = list.find((s) => s.key !== show.key) || null;
  return { multi: true, show, presenter };
}

export async function requestScreenDetails() {
  if (!hasScreenDetailsApi()) {
    detailsLive = null;
    return null;
  }
  try {
    detailsLive = await window.getScreenDetails();
    return detailsLive;
  } catch (e) {
    detailsLive = null;
    return null;
  }
}

export function getLiveScreenByKey(key) {
  const screens = detailsLive?.screens || [];
  return screens.find((s) => screenKey(s) === key) || null;
}

export function isMultiScreenNow() {
  return (detailsLive?.screens?.length || 0) >= 2;
}

export async function requestOverlayFullscreen(el, screenKeyOrNull) {
  if (!el) return;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return;
  const live = screenKeyOrNull ? getLiveScreenByKey(screenKeyOrNull) : null;
  if (live && el.requestFullscreen) {
    try {
      await el.requestFullscreen({ screen: live });
      return;
    } catch (e) {}
  }
  try {
    await Promise.resolve(req.call(el));
  } catch (e) {}
}

export function openPresenterOnScreen(screen) {
  if (!screen) return null;
  const live = getLiveScreenByKey(screen.key) || screen;
  const left = Math.round(live.availLeft ?? live.left ?? 0);
  const top = Math.round(live.availTop ?? live.top ?? 0);
  const w = Math.round(live.availWidth ?? live.width ?? 1280);
  const h = Math.round(live.availHeight ?? live.height ?? 800);
  return openPresenterWindow({ left, top, width: w, height: h });
}

export function openPresenterForShow(savedShowKey) {
  const screens = serializeScreens(detailsLive);
  const pair = pickShowAndPresenter(screens, savedShowKey);
  if (!pair.multi || !pair.presenter) return null;
  return openPresenterOnScreen(pair.presenter);
}

/** Sync placement so window.open stays in the user-gesture (F5 / click). */
export function placeSlideshowWindowsSync(overlayEl, savedShowKey) {
  const screens = serializeScreens(detailsLive);
  const pair = pickShowAndPresenter(screens, savedShowKey);
  void requestOverlayFullscreen(overlayEl, pair.show?.key || '');
  if (pair.multi && pair.presenter) {
    return { pair, presenter: openPresenterOnScreen(pair.presenter) };
  }
  closePresenterWindow();
  return { pair, presenter: null };
}

async function queryWindowMgmtState() {
  try {
    const q = await navigator.permissions.query({ name: 'window-management' });
    return q.state || 'prompt';
  } catch (e) {
    return 'prompt';
  }
}

export function useDisplayScreens() {
  const [screens, setScreens] = useState([]);
  const [supported] = useState(() => hasScreenDetailsApi());
  const [perm, setPerm] = useState(hasScreenDetailsApi() ? 'unknown' : 'unsupported');
  const [ready, setReady] = useState(!hasScreenDetailsApi());

  useEffect(() => {
    if (!supported) return undefined;
    let cancelled = false;
    let attached = null;

    const onChange = () => {
      if (cancelled) return;
      setScreens(serializeScreens(detailsLive));
    };

    const attach = (next) => {
      detach();
      attached = next;
      if (!next) return;
      try {
        next.addEventListener('screenschange', onChange);
      } catch (e) {}
    };

    const detach = () => {
      if (!attached) return;
      try {
        attached.removeEventListener('screenschange', onChange);
      } catch (e) {}
      attached = null;
    };

    (async () => {
      const state = await queryWindowMgmtState();
      if (cancelled) return;
      setPerm(state);
      if (state === 'granted') {
        const next = await requestScreenDetails();
        if (cancelled) return;
        attach(next);
        setScreens(serializeScreens(next));
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
      detach();
    };
  }, [supported]);

  const request = async () => {
    const next = await requestScreenDetails();
    setScreens(serializeScreens(next));
    setPerm(next ? 'granted' : 'denied');
    setReady(true);
    return next;
  };

  return {
    screens,
    supported,
    perm,
    denied: perm === 'denied',
    needsPermission: supported && (perm === 'prompt' || perm === 'unknown'),
    ready,
    multi: screens.length >= 2,
    request,
  };
}
