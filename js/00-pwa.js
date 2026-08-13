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

  function _pwaT(key, fallback) {
    try {
      if (typeof t === 'function') {
        const v = t(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    return fallback;
  }

  function _pwaRunningVersion() {
    try {
      if (typeof APP_VERSION === 'string' && APP_VERSION) return APP_VERSION;
    } catch (e) {}
    return '';
  }

  let _swUserReload = false;
  let _remoteAppVersion = '';
  let _updateBarShown = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!_swUserReload) return;
    if (sessionStorage.getItem('pwa-sw-reload')) return;
    sessionStorage.setItem('pwa-sw-reload', '1');
    location.reload();
  });

  function _pwaDismissKey(ver) {
    return 'pwa-update-dismissed:' + (ver || 'sw');
  }

  function _pwaHideUpdateBar() {
    const bar = document.getElementById('pwa-update-bar');
    if (bar) bar.classList.remove('show');
    _updateBarShown = false;
  }

  function _pwaEnsureBar() {
    let bar = document.getElementById('pwa-update-bar');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'pwa-update-bar';
    bar.setAttribute('role', 'status');
    bar.innerHTML =
      '<span class="pwa-upd-msg"></span>' +
      '<button type="button" class="pwa-upd-btn"></button>' +
      '<button type="button" class="pwa-upd-later"></button>';
    bar.querySelector('.pwa-upd-btn').addEventListener('click', function () {
      window.applyPwaUpdate();
    });
    bar.querySelector('.pwa-upd-later').addEventListener('click', function () {
      sessionStorage.setItem(_pwaDismissKey(_remoteAppVersion || 'sw'), '1');
      _pwaHideUpdateBar();
    });
    document.body.appendChild(bar);
    return bar;
  }

  function _pwaShowUpdateBar(newVer) {
    if (sessionStorage.getItem(_pwaDismissKey(newVer || 'sw'))) return;
    const bar = _pwaEnsureBar();
    const msg = bar.querySelector('.pwa-upd-msg');
    const btn = bar.querySelector('.pwa-upd-btn');
    const later = bar.querySelector('.pwa-upd-later');
    const running = _pwaRunningVersion();
    if (newVer && newVer !== running) {
      msg.textContent = _pwaT('pwaUpdateAvailable', 'Доступна версия {v}').replace('{v}', newVer);
    } else {
      msg.textContent = _pwaT('pwaUpdateAvailableNoVer', 'Доступно обновление приложения');
    }
    btn.textContent = _pwaT('pwaUpdateBtn', 'Обновить');
    later.textContent = _pwaT('pwaUpdateLater', 'Позже');
    bar.classList.add('show');
    _updateBarShown = true;
  }

  window.applyPwaUpdate = function () {
    _swUserReload = true;
    sessionStorage.removeItem('pwa-sw-reload');
    _pwaHideUpdateBar();
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(function () {
          if (!sessionStorage.getItem('pwa-sw-reload')) location.reload();
        }, 1200);
        return;
      }
      location.reload();
    }).catch(function () {
      location.reload();
    });
  };

  function _pwaParseAppVersion(src) {
    const m = String(src || '').match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
    return m ? m[1] : '';
  }

  function _pwaCheckRemoteVersion() {
    const running = _pwaRunningVersion();
    if (!running) return;
    const url = 'js/00-i18n.js?pwa=' + Date.now();
    fetch(url, { cache: 'no-store', credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.text() : Promise.reject(); })
      .then(function (txt) {
        const ver = _pwaParseAppVersion(txt);
        if (!ver) return;
        _remoteAppVersion = ver;
        if (ver !== running) _pwaShowUpdateBar(ver);
      })
      .catch(function () {});
  }

  function _pwaWatchWaiting(reg) {
    if (!reg) return;
    if (reg.waiting && navigator.serviceWorker.controller) {
      _pwaShowUpdateBar(_remoteAppVersion);
    }
    reg.addEventListener('updatefound', function () {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function () {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          _pwaShowUpdateBar(_remoteAppVersion);
          document.dispatchEvent(new CustomEvent('pwa-update-ready'));
        }
      });
    });
  }

  function registerSw() {
    navigator.serviceWorker
      .register('sw.js?v=11', { scope: './' })
      .then((reg) => {
        _pwaWatchWaiting(reg);
        reg.update();
        _pwaCheckRemoteVersion();
        setInterval(function () {
          reg.update();
          _pwaCheckRemoteVersion();
        }, 60 * 60 * 1000);
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

  // ── «Открыть с помощью Слайды» (File Handling API / launchQueue) ──
  const _pwaLaunchFiles = [];
  let _pwaLaunchReady = false;

  function _pwaImportJsonFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target.result;
        const parsed = JSON.parse(raw);
        if (!parsed.slides) throw new Error('Нет поля slides');
        localStorage.setItem('sf_v4', raw);
        if (typeof loadState === 'function') loadState();
        if (typeof renderAll === 'function') renderAll();
        if (typeof syncProps === 'function') syncProps();
        if (typeof toast === 'function') toast('JSON состояния загружен', 'ok');
      } catch (err) {
        if (typeof toast === 'function') toast('Ошибка импорта JSON: ' + err.message, 'err');
      }
    };
    reader.readAsText(file);
  }

  function _pwaOpenLaunchFile(file) {
    if (!file) return;
    const name = (file.name || '').toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    if (ext === 'html' || ext === 'htm' || file.type === 'text/html') {
      if (typeof importHTMLFile === 'function') {
        importHTMLFile(file);
      } else if (typeof toast === 'function') {
        toast('Импорт HTML ещё не готов', 'err');
      }
      return;
    }
    if (ext === 'json' || file.type === 'application/json') {
      _pwaImportJsonFile(file);
      return;
    }
    if (typeof toast === 'function') toast('Формат не поддерживается: ' + (file.name || ''), 'err');
  }

  function _pwaFlushLaunchFiles() {
    if (!_pwaLaunchReady) return;
    while (_pwaLaunchFiles.length) {
      _pwaOpenLaunchFile(_pwaLaunchFiles.shift());
    }
  }

  /** Вызвать после boot(), когда importHTMLFile уже доступен. */
  window.pwaReadyForFileLaunch = function () {
    _pwaLaunchReady = true;
    _pwaFlushLaunchFiles();
  };

  if ('launchQueue' in window) {
    try {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams || !launchParams.files || !launchParams.files.length) return;
        for (const handle of launchParams.files) {
          try {
            const file = await handle.getFile();
            if (_pwaLaunchReady) _pwaOpenLaunchFile(file);
            else _pwaLaunchFiles.push(file);
          } catch (e) {
            console.warn('[PWA] file launch failed', e);
          }
        }
      });
    } catch (e) {
      console.warn('[PWA] launchQueue unavailable', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerSw);
  } else {
    registerSw();
  }

  window.addEventListener('load', () => {
    setTimeout(function () { sessionStorage.removeItem('pwa-sw-reload'); }, 2500);
    setTimeout(warmPwaImageCache, 2500);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) return;
      reg.update();
      if (reg.waiting && navigator.serviceWorker.controller) _pwaShowUpdateBar(_remoteAppVersion);
    });
    _pwaCheckRemoteVersion();
  });
})();
