/* PWA: service worker + установка на рабочий стол */
(function () {
  'use strict';

  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  if (!('serviceWorker' in navigator)) return;

  let _deferredInstall = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredInstall = e;
    document.dispatchEvent(new CustomEvent('pwa-installable'));
  });

  window.installPwaApp = function () {
    if (!_deferredInstall) {
      if (typeof toast === 'function') {
        toast(
          typeof t === 'function'
            ? t('pwaInstallHint')
            : 'Установка: меню браузера → «Установить приложение»',
          ''
        );
      }
      return Promise.resolve(false);
    }
    _deferredInstall.prompt();
    return _deferredInstall.userChoice.then((choice) => {
      const ok = choice.outcome === 'accepted';
      if (ok) _deferredInstall = null;
      return ok;
    });
  };

  window.isPwaInstallable = function () {
    return !!_deferredInstall;
  };

  window.isPwaStandalone = function () {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  };

  let _swReloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (_swReloading || sessionStorage.getItem('pwa-sw-reload')) return;
    sessionStorage.setItem('pwa-sw-reload', '1');
    _swReloading = true;
    location.reload();
  });

  function registerSw() {
    navigator.serviceWorker
      .register('sw.js?v=5', { scope: './' })
      .then((reg) => {
        reg.update();
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              nw.postMessage({ type: 'SKIP_WAITING' });
              document.dispatchEvent(new CustomEvent('pwa-update-ready'));
            }
          });
        });
        if (reg.waiting && navigator.serviceWorker.controller) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        setInterval(() => reg.update(), 60 * 60 * 1000);
      })
      .catch((err) => console.warn('[PWA] SW register failed', err));
  }

  /** Догружает в кэш картинки галереи и текущей презентации (при работающем сервере). */
  function warmPwaImageCache() {
    if (!navigator.serviceWorker.controller) return;
    const paths = new Set();
    if (typeof IMAGE_INDEX !== 'undefined') {
      IMAGE_INDEX.forEach((e) => {
        if (!e.isSvg && e.path) paths.add(e.path);
      });
    }
    if (typeof slides !== 'undefined' && slides.length) {
      slides.forEach((s) => {
        if (s.bgImg && s.bgImg.src && !/^data:|^blob:|^https?:/i.test(s.bgImg.src)) {
          paths.add(s.bgImg.src);
        }
        if (s.bgImg && s.bgImg.exportBaked && String(s.bgImg.exportBaked).startsWith('data:') === false) {
          paths.add(s.bgImg.exportBaked);
        }
        (s.els || []).forEach((d) => {
          if (d.type === 'image' && d.src && !/^data:|^blob:|^https?:/i.test(d.src)) paths.add(d.src);
        });
      });
    }
    paths.forEach((p) => {
      try {
        const url = typeof assetUrl === 'function' ? assetUrl(p) : new URL(p, location.href).href;
        fetch(url).catch(() => {});
      } catch (e) {}
    });
  }

  window.warmPwaImageCache = warmPwaImageCache;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerSw);
  } else {
    registerSw();
  }

  window.addEventListener('load', () => {
    setTimeout(warmPwaImageCache, 2500);
  });
})();
