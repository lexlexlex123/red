// ══════════════ CROSS-ORIGIN / CROSS-TAB CLIPBOARD ══════════════
// Same-origin tabs: localStorage (storage event).
// Different origins (site ↔ localhost): system clipboard with magic text payload.
// Heavy payloads (> SYS_MAX): localStorage only (same-origin tabs).
(function () {
  const KEY_EL = 'red-xclip-elements-v1';
  const KEY_SL = 'red-xclip-slides-v1';
  const KEY_META = 'red-xclip-meta-v1';
  const MAGIC = '⟦RED-SLIDES:v1⟧';
  // System clipboard often rejects multi‑MB payloads; keep those in localStorage
  const SYS_CLIP_MAX = 900 * 1024;
  let _ignoreStorage = false;
  let _writingSys = false;

  function _byteLen(s) {
    try { return new Blob([s]).size; } catch (e) { return String(s || '').length * 2; }
  }

  function _write(key, data) {
    try {
      _ignoreStorage = true;
      if (data && data.length) localStorage.setItem(key, JSON.stringify({ t: Date.now(), data: data }));
      else localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn('[cross-clip] localStorage save failed', e);
      if (typeof toast === 'function') toast('Буфер слишком большой даже для localStorage', 'warn');
      return false;
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

  function _getInkData() {
    try {
      if (typeof window._getInkClipboardData === 'function') {
        const d = window._getInkClipboardData();
        if (d) return d;
      }
    } catch (e) {}
    try {
      const raw = localStorage.getItem('sf_ink_clip');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function _setInkData(data) {
    try {
      if (typeof window._setInkClipboardData === 'function') {
        window._setInkClipboardData(data);
        return;
      }
    } catch (e) {}
    try {
      if (data) localStorage.setItem('sf_ink_clip', JSON.stringify(data));
      else localStorage.removeItem('sf_ink_clip');
    } catch (e) {}
  }

  function _slimImageFields(d) {
    if (!d || typeof d !== 'object') return d;
    if (d.type !== 'image') return d;
    const src = d.src || '';
    if (src.startsWith('data:') || src.startsWith('blob:') || src.length > 8000) {
      const o = Object.assign({}, d);
      o.src = '';
      o._srcOmitted = true;
      return o;
    }
    return d;
  }

  function _slimClipEls(arr) {
    if (!arr || !arr.length) return arr;
    return arr.map(_slimImageFields);
  }

  function _slimSlides(list) {
    if (!list || !list.length) return list;
    return list.map(function (s) {
      if (!s || !s.els) return s;
      return Object.assign({}, s, { els: s.els.map(_slimImageFields) });
    });
  }

  function _packPayload(kind) {
    kind = kind || window._clipSource || 'elements';
    const els = (typeof clipboard !== 'undefined' && clipboard && clipboard.length) ? clipboard : null;
    const sl = (typeof _slideClipboard !== 'undefined' && _slideClipboard && _slideClipboard.length) ? _slideClipboard : null;
    const ink = _getInkData();
    const hasInk = !!(ink && (
      (Array.isArray(ink) && ink.length) ||
      (ink.v === 2 && ((ink.strokes && ink.strokes.length) || (ink.fills && ink.fills.length)))
    ));
    const payload = {
      app: 'slides',
      v: 1,
      kind: kind,
      t: Date.now(),
      elements: null,
      slides: null,
      ink: null,
      hadInk: false
    };
    if (kind === 'slides') {
      payload.slides = sl ? _slimSlides(sl) : null;
    } else if (kind === 'ink') {
      payload.ink = hasInk ? ink : null;
      payload.hadInk = hasInk;
    } else {
      payload.elements = els ? _slimClipEls(els) : null;
      payload.hadInk = !!(window._clipHadInk && hasInk);
      payload.ink = payload.hadInk ? ink : null;
    }
    return payload;
  }

  function _persistPayloadLocal(payload) {
    let ok = false;
    if (payload.elements && payload.elements.length) ok = _write(KEY_EL, payload.elements) || ok;
    else _write(KEY_EL, null);
    if (payload.slides && payload.slides.length) ok = _write(KEY_SL, payload.slides) || ok;
    else _write(KEY_SL, null);
    if (payload.ink) {
      _setInkData(payload.ink);
      ok = true;
    } else {
      _setInkData(null);
    }
    _saveMeta(payload.kind, payload.t);
    return ok;
  }

  function _saveMeta(kind, t) {
    try {
      if (kind) {
        localStorage.setItem(KEY_META, JSON.stringify({ kind: kind, t: t || Date.now() }));
        window._clipSource = kind;
        if (t) window._appClipAt = t;
      } else {
        localStorage.removeItem(KEY_META);
      }
    } catch (e) {}
  }

  function _loadMeta() {
    try {
      const raw = localStorage.getItem(KEY_META);
      if (!raw) return null;
      const meta = JSON.parse(raw);
      if (meta && meta.kind) {
        const appAt = window._appClipAt || 0;
        if (!(appAt && meta.t && appAt > meta.t)) {
          window._clipSource = meta.kind;
          if (meta.t) window._appClipAt = meta.t;
        }
      }
      return meta;
    } catch (e) {
      return null;
    }
  }

  function _unpackText(text) {
    const t = String(text || '');
    const idx = t.indexOf(MAGIC);
    if (idx < 0) return null;
    try {
      const parsed = JSON.parse(t.slice(idx + MAGIC.length));
      if (!parsed || parsed.app !== 'slides' || !parsed.v) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function _applyPayload(p) {
    if (!p) return false;
    const kind = p.kind || (p.slides && p.slides.length ? 'slides' : (p.elements && p.elements.length ? 'elements' : 'ink'));
    if (kind === 'slides') {
      if (typeof clipboard !== 'undefined') clipboard = [];
      _write(KEY_EL, null);
      _setInkData(null);
      if (p.slides && p.slides.length) {
        if (typeof _slideClipboard !== 'undefined') _slideClipboard = p.slides;
        _write(KEY_SL, p.slides);
      }
      try { window._clipHadInk = false; window._clipSource = 'slides'; } catch (e) {}
      _saveMeta('slides', p.t);
      return !!(p.slides && p.slides.length);
    }
    if (kind === 'ink') {
      if (typeof clipboard !== 'undefined') clipboard = [];
      _write(KEY_EL, null);
      if (typeof _slideClipboard !== 'undefined') _slideClipboard = null;
      _write(KEY_SL, null);
      if (p.ink) _setInkData(p.ink);
      try { window._clipHadInk = true; window._clipSource = 'ink'; } catch (e) {}
      _saveMeta('ink', p.t);
      return !!p.ink;
    }
    if (typeof _slideClipboard !== 'undefined') _slideClipboard = null;
    _write(KEY_SL, null);
    let ok = false;
    if (p.elements && p.elements.length) {
      const incoming = p.elements;
      if (typeof clipboard !== 'undefined' && clipboard && clipboard.length) {
        clipboard = incoming.map(function (inc, i) {
          const prev = clipboard[i];
          if (inc && inc.type === 'image' && prev && prev.type === 'image' && prev.src && (!inc.src || inc._srcOmitted)) {
            return Object.assign({}, inc, { src: prev.src, imageId: inc.imageId || prev.imageId });
          }
          return inc;
        });
      } else if (typeof clipboard !== 'undefined') {
        clipboard = incoming;
      }
      _write(KEY_EL, incoming);
      ok = true;
    }
    if (p.ink && p.hadInk) {
      _setInkData(p.ink);
      ok = true;
    } else {
      _setInkData(null);
    }
    try {
      window._clipHadInk = !!p.hadInk;
      window._clipSource = 'elements';
    } catch (e) {}
    _saveMeta('elements', p.t);
    return ok;
  }

  function _clipOsImageBlob(payload) {
    return new Promise(function (resolve) {
      const els = payload && payload.elements;
      if (!els || els.length !== 1 || els[0].type !== 'image') { resolve(null); return; }
      const d = els[0];
      let src = (window._clipImagePixels && window._clipImagePixels[0]) || d.src || '';
      const go = function (s) {
        if (!s || !String(s).startsWith('data:')) { resolve(null); return; }
        fetch(s).then(function (r) { return r.blob(); }).then(resolve).catch(function () { resolve(null); });
      };
      if (src && String(src).startsWith('data:')) { go(src); return; }
      if (d.imageId && typeof MediaStore !== 'undefined' && MediaStore.ensureDataUrl) {
        MediaStore.ensureDataUrl(d.imageId, d.src || '').then(go).catch(function () { resolve(null); });
        return;
      }
      resolve(null);
    });
  }

  /**
   * Prefer OS clipboard (cross-origin). If payload is heavy or write fails —
   * keep data in localStorage for same-origin tabs.
   */
  window._xclipWriteSystem = function (kind) {
    const payload = _packPayload(kind);
    if (!(payload.elements && payload.elements.length) &&
        !(payload.slides && payload.slides.length) &&
        !payload.ink) {
      return Promise.resolve(false);
    }

    _persistPayloadLocal(payload);

    const text = MAGIC + JSON.stringify(payload);
    const bytes = _byteLen(text);

    if (bytes > SYS_CLIP_MAX) {
      if (typeof toast === 'function') {
        toast('Большой буфер: вставка между вкладками этого сайта', 'ok');
      }
      return _clipOsImageBlob(payload).then(function () { return false; });
    }

    _writingSys = true;
    window._slidesInternalCopy = true;

    const finish = function (ok) {
      window._slidesInternalCopy = false;
      setTimeout(function () { _writingSys = false; }, 50);
      if (ok && typeof window._stampOsClipWrite === 'function') window._stampOsClipWrite();
      return ok;
    };

    const onSysFail = function (err) {
      console.warn('[cross-clip] system write failed, using localStorage', err);
      if (typeof toast === 'function') {
        toast('Буфер тяжёлый для ОС — сохранён для вкладок этого сайта', 'ok');
      }
      return finish(false);
    };

    const writeTextAndMaybeImage = function (pngBlob) {
      try {
        if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
          const items = { 'text/plain': new Blob([text], { type: 'text/plain' }) };
          if (pngBlob && pngBlob.size) items['image/png'] = pngBlob;
          const item = new ClipboardItem(items);
          return navigator.clipboard.write([item]).then(function () {
            return finish(true);
          }).catch(function () {
            return navigator.clipboard.writeText(text).then(function () {
              return finish(true);
            }).catch(onSysFail);
          });
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text).then(function () {
            return finish(true);
          }).catch(onSysFail);
        }
      } catch (e) {
        return Promise.resolve(onSysFail(e));
      }

      try {
        const ta = document.createElement('textarea');
        ta.setAttribute('aria-hidden', 'true');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return Promise.resolve(finish(true));
      } catch (e) {
        return Promise.resolve(onSysFail(e));
      }
    };

    return _clipOsImageBlob(payload).then(writeTextAndMaybeImage);
  };

  window._xclipHydrateFromSystemText = function (text) {
    const p = _unpackText(text);
    if (!p) return false;
    const appAt = window._appClipAt || 0;
    if (appAt && p.t && appAt > p.t) return false;
    // Same tab: in-memory copy already has full image src — don't replace it with a slim payload.
    if (appAt && p.t && Math.abs(appAt - p.t) < 8000) {
      if (p.kind === 'elements' && typeof clipboard !== 'undefined' && clipboard.length) return true;
      if (p.kind === 'ink') return true;
      if (p.kind === 'slides' && typeof _slideClipboard !== 'undefined' && _slideClipboard && _slideClipboard.length) return true;
    }
    return _applyPayload(p);
  };

  window._xclipIsSystemClipText = function (text) {
    return !!_unpackText(text);
  };

  window._xclipSaveElements = function (arr) {
    _write(KEY_EL, arr && arr.length ? _slimClipEls(arr) : null);
  };

  window._xclipSaveSlides = function (arr) {
    _write(KEY_SL, arr && arr.length ? _slimSlides(arr) : null);
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
    if (window._appClipboardEls && window._appClipboardEls.length) {
      clipboard = window._appClipboardEls;
      return;
    }
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
    _loadMeta();
    const kind = window._clipSource || '';
    if (kind === 'slides') {
      window._xclipHydrateSlides();
    } else if (kind === 'ink') {
      // ink lives in sf_ink_clip / _inkClipboard
    } else if (kind === 'elements') {
      window._xclipHydrateElements();
    }
  };

  window._xclipHydrateFromSystemAsync = function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      return Promise.resolve(false);
    }
    return navigator.clipboard.readText().then(function (text) {
      return window._xclipHydrateFromSystemText(text);
    }).catch(function () {
      return false;
    });
  };

  function _onExternalUpdate(e) {
    if (_ignoreStorage) return;
    if (e && e.key && e.key !== KEY_EL && e.key !== KEY_SL && e.key !== KEY_META) return;
    if (!e || e.key === KEY_META) _loadMeta();
    const kind = window._clipSource || '';
    if (!e || e.key === KEY_EL || e.key === KEY_META) {
      if (kind === 'elements') {
        const els = _read(KEY_EL);
        if (typeof clipboard !== 'undefined') clipboard = els && els.length ? els : [];
      }
    }
    if (!e || e.key === KEY_SL || e.key === KEY_META) {
      if (kind === 'slides') {
        const sl = _read(KEY_SL);
        if (typeof _slideClipboard !== 'undefined') _slideClipboard = sl && sl.length ? sl : null;
      } else if (typeof _slideClipboard !== 'undefined' && kind && kind !== 'slides') {
        _slideClipboard = null;
      }
    }
  }

  window._xclipIsWritingSystem = function () { return _writingSys; };

  window.addEventListener('storage', _onExternalUpdate);
  window.addEventListener('focus', function () {
    window._xclipHydrateAll();
    window._xclipHydrateFromSystemAsync();
  });
  window._xclipHydrateAll();
})();
