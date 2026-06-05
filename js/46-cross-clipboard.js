// ══════════════ CROSS-TAB CLIPBOARD (objects + slides) ══════════════
(function () {
  const KEY_EL = 'red-xclip-elements-v1';
  const KEY_SL = 'red-xclip-slides-v1';
  let _ignoreStorage = false;

  function _write(key, data) {
    try {
      _ignoreStorage = true;
      if (data && data.length) localStorage.setItem(key, JSON.stringify({ t: Date.now(), data: data }));
      else localStorage.removeItem(key);
    } catch (e) {
      console.warn('[cross-clip] save failed', e);
      if (typeof toast === 'function') toast('Буфер слишком большой для обмена между вкладками', 'warn');
    } finally {
      setTimeout(function () { _ignoreStorage = false; }, 0);
    }
  }

  function _read(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.data ? parsed.data : null;
    } catch (e) {
      return null;
    }
  }

  window._xclipSaveElements = function (arr) {
    _write(KEY_EL, arr && arr.length ? arr : null);
  };

  window._xclipSaveSlides = function (arr) {
    _write(KEY_SL, arr && arr.length ? arr : null);
  };

  window._xclipLoadElements = function () {
    return _read(KEY_EL);
  };

  window._xclipLoadSlides = function () {
    return _read(KEY_SL);
  };

  window._xclipHydrateElements = function () {
    if (typeof clipboard === 'undefined') return;
    if (clipboard.length) return;
    const data = _read(KEY_EL);
    if (data && data.length) clipboard = data;
  };

  window._xclipHydrateSlides = function () {
    if (typeof _slideClipboard === 'undefined') return;
    if (_slideClipboard && _slideClipboard.length) return;
    const data = _read(KEY_SL);
    if (data && data.length) _slideClipboard = data;
  };

  window._xclipHydrateAll = function () {
    window._xclipHydrateElements();
    window._xclipHydrateSlides();
  };

  function _onExternalUpdate(e) {
    if (_ignoreStorage) return;
    if (e && e.key && e.key !== KEY_EL && e.key !== KEY_SL) return;
    if (!e || e.key === KEY_EL) {
      const els = _read(KEY_EL);
      if (typeof clipboard !== 'undefined') clipboard = els && els.length ? els : [];
    }
    if (!e || e.key === KEY_SL) {
      const sl = _read(KEY_SL);
      if (typeof _slideClipboard !== 'undefined') _slideClipboard = sl && sl.length ? sl : null;
    }
  }

  window.addEventListener('storage', _onExternalUpdate);
  window.addEventListener('focus', window._xclipHydrateAll);
  window._xclipHydrateAll();
})();
