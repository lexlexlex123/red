let deferred = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Do NOT call preventDefault() — Chrome/Yandex keep the address-bar
    // install icon. We still keep the event for Settings → Установить.
    deferred = e;
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });
}

export function isPwaInstallable() {
  return !!deferred;
}

export function installPwaApp() {
  if (!deferred) return Promise.resolve(false);
  // prompt() works even without preventDefault in Chromium; if the browser
  // already consumed the event, userChoice may reject — treat as "use menu".
  try {
    deferred.prompt();
  } catch (err) {
    deferred = null;
    return Promise.resolve(false);
  }
  return deferred.userChoice
    .then((choice) => {
      const ok = choice.outcome === 'accepted';
      deferred = null;
      window.dispatchEvent(new CustomEvent('pwa-installable'));
      return ok;
    })
    .catch(() => {
      deferred = null;
      return false;
    });
}

function warmActiveWorker(reg) {
  const w = (reg && (reg.active || reg.waiting || reg.installing)) || navigator.serviceWorker.controller;
  if (w) w.postMessage({ type: 'WARM_CACHE' });
}

function skipWaiting(reg) {
  if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
}

export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;

  // Vite HMR modules in the SW cache → white screen in an installed PWA.
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }

  navigator.serviceWorker
    .register('/sw.js?v=react388', { scope: '/' })
    .then((reg) => {
      skipWaiting(reg);
      if (navigator.onLine) warmActiveWorker(reg);
      reg.addEventListener('updatefound', () => {
        const inst = reg.installing;
        if (!inst) return;
        inst.addEventListener('statechange', () => {
          if (inst.state === 'installed') skipWaiting(reg);
          if (inst.state === 'activated' && navigator.onLine) warmActiveWorker(reg);
        });
      });
    })
    .catch((err) => {
      console.warn('[PWA] SW register failed', err);
    });

  navigator.serviceWorker.addEventListener('message', (ev) => {
    if (!ev.data || ev.data.type !== 'SW_ACTIVATED') return;
    const root = document.getElementById('root') || document.getElementById('playback-root');
    if (root && root.childElementCount === 0 && !sessionStorage.getItem('sf-sw-reload')) {
      sessionStorage.setItem('sf-sw-reload', '1');
      location.reload();
    }
  });

  window.addEventListener('online', () => {
    navigator.serviceWorker.ready.then((reg) => warmActiveWorker(reg)).catch(() => {});
  });
}
