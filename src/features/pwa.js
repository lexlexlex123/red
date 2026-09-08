let deferred = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });
}

export function isPwaInstallable() {
  return !!deferred;
}

export function installPwaApp() {
  if (!deferred) return Promise.resolve(false);
  deferred.prompt();
  return deferred.userChoice.then((choice) => {
    const ok = choice.outcome === 'accepted';
    if (ok) {
      deferred = null;
      window.dispatchEvent(new CustomEvent('pwa-installable'));
    }
    return ok;
  });
}

export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  const host = location.hostname;
  const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches;
  // Dev: unregister SW so Vite bundles are never stale
  if (local && !standalone) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }
  navigator.serviceWorker.register('/sw.js?v=react382', { scope: './' }).catch((err) => {
    console.warn('[PWA] SW register failed', err);
  });
}
