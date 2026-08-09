// ══════════════════════════════════════════════════════════════════
// 47-translate.js — EN ↔ RU для текстовых блоков
// Кнопка под «Цитата»: подпись = целевой язык («английский» / «russian»).
// Движок: Google Translate (сеть) → Chrome Translator → Bergamot (офлайн).
// ══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  let _busy = false;
  const _chromeTranslators = Object.create(null);

  // ── Bergamot (локальные модели) ─────────────────────────────────
  let _bergCall = null;
  let _bergWorker = null;
  const _bergLoaded = Object.create(null);
  let _bergInitPromise = null;

  const BERG_PAIR = {
    'en|ru': {
      dir: 'enru',
      model: 'model.enru.intgemm.alphas.bin',
      lex: 'lex.50.50.enru.s2t.bin',
      vocab: 'vocab.enru.spm'
    },
    'ru|en': {
      dir: 'ruen',
      model: 'model.ruen.intgemm.alphas.bin',
      lex: 'lex.50.50.ruen.s2t.bin',
      vocab: 'vocab.ruen.spm'
    }
  };

  function _toast(msg, type) {
    if (typeof toast === 'function') toast(msg, type);
  }

  function _t(key, fallback) {
    try {
      if (typeof t === 'function') {
        const v = t(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    return fallback;
  }

  function _pageUrl(rel) {
    try {
      return new URL(rel, window.location.href).href;
    } catch (e) {
      return rel;
    }
  }

  /** Доля кириллицы/латиницы → 'ru' | 'en' | 'mixed' | 'empty' */
  function detectTextLang(text) {
    const raw = String(text || '');
    const letters = raw.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, '');
    if (!letters.length) return 'empty';
    let cyr = 0, lat = 0;
    for (let i = 0; i < letters.length; i++) {
      if (/[а-яА-ЯёЁ]/.test(letters[i])) cyr++;
      else lat++;
    }
    const total = cyr + lat;
    if (cyr / total >= 0.7) return 'ru';
    if (lat / total >= 0.7) return 'en';
    return 'mixed';
  }

  /** Цель перевода и подпись кнопки по тексту */
  function translateTargetFromText(text) {
    const det = detectTextLang(text);
    if (det === 'en') {
      return { from: 'en', to: 'ru', label: 'russian', detected: det };
    }
    return {
      from: 'ru',
      to: 'en',
      label: 'английский',
      detected: det
    };
  }

  function _plainFromRoot(root) {
    if (!root) return '';
    if (typeof _toCharObjs === 'function') {
      try {
        return _toCharObjs(root.innerHTML).map(function (o) { return o.ch; }).join('');
      } catch (e) {}
    }
    return (root.innerText || root.textContent || '').replace(/\u200b/g, '');
  }

  function _rebuildChars(oldChars, newText) {
    const oldLines = [[]];
    for (let i = 0; i < oldChars.length; i++) {
      const c = oldChars[i];
      if (c.ch === '\n') oldLines.push([]);
      else oldLines[oldLines.length - 1].push(c);
    }
    const newLines = String(newText).split('\n');
    const out = [];
    for (let li = 0; li < newLines.length; li++) {
      if (li) out.push({ ch: '\n', style: {} });
      const srcLine = oldLines[Math.min(li, oldLines.length - 1)] || [];
      let base = {};
      for (let j = 0; j < srcLine.length; j++) {
        if (srcLine[j].style && Object.keys(srcLine[j].style).length) {
          base = Object.assign({}, srcLine[j].style);
          break;
        }
      }
      if (!Object.keys(base).length && oldChars.length) {
        for (let j = 0; j < oldChars.length; j++) {
          if (oldChars[j].ch !== '\n' && oldChars[j].style) {
            base = Object.assign({}, oldChars[j].style);
            break;
          }
        }
      }
      const line = newLines[li];
      for (let k = 0; k < line.length; k++) {
        out.push({ ch: line[k], style: Object.assign({}, base) });
      }
    }
    return out;
  }

  async function _detectSourceApi(text, fallback) {
    if ('LanguageDetector' in self) {
      try {
        const avail = await LanguageDetector.availability();
        if (avail === 'available' || avail === 'downloadable') {
          const detector = await LanguageDetector.create({
            monitor: function (m) {
              m.addEventListener('downloadprogress', function () {});
            }
          });
          const results = await detector.detect(text);
          if (results && results[0]) {
            const code = results[0].detectedLanguage;
            if (code === 'en' || code === 'ru') return code;
          }
        }
      } catch (e) {}
    }
    return fallback;
  }

  function _ensureBergamot() {
    if (_bergInitPromise) return _bergInitPromise;
    _bergInitPromise = (async function () {
      if (typeof Worker === 'undefined') throw new Error('NO_WORKER');
      const workerUrl = _pageUrl('libs/bergamot/translator-worker.js');
      const worker = new Worker(workerUrl);
      _bergWorker = worker;
      let serial = 0;
      const pending = new Map();
      worker.addEventListener('message', function (ev) {
        const data = ev.data || {};
        const id = data.id;
        if (!pending.has(id)) return;
        const p = pending.get(id);
        pending.delete(id);
        if (data.error) {
          const err = new Error((data.error && data.error.message) || 'Bergamot worker error');
          if (data.error && data.error.stack) err.stack = data.error.stack;
          p.reject(err);
        } else {
          p.resolve(data.result);
        }
      });
      worker.addEventListener('error', function (e) {
        console.warn('[bergamot worker]', e);
      });
      _bergCall = function (name) {
        const args = Array.prototype.slice.call(arguments, 1);
        return new Promise(function (resolve, reject) {
          const id = ++serial;
          pending.set(id, { resolve: resolve, reject: reject });
          worker.postMessage({ id: id, name: name, args: args });
        });
      };
      await _bergCall('initialize', { cacheSize: 2048, useNativeIntGemm: false });
    })().catch(function (e) {
      _bergInitPromise = null;
      _bergCall = null;
      if (_bergWorker) {
        try { _bergWorker.terminate(); } catch (x) {}
        _bergWorker = null;
      }
      throw e;
    });
    return _bergInitPromise;
  }

  async function _fetchBuf(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('MODEL_FETCH ' + url + ' ' + res.status);
    return await res.arrayBuffer();
  }

  async function _loadBergModel(from, to, onProgress) {
    const key = from + '|' + to;
    if (_bergLoaded[key]) return;
    await _ensureBergamot();
    const spec = BERG_PAIR[key];
    if (!spec) throw new Error('NO_PAIR ' + key);

    if (typeof onProgress === 'function') onProgress(5);
    const base = _pageUrl('libs/translate-models/' + spec.dir + '/');
    const [model, shortlist, vocab] = await Promise.all([
      _fetchBuf(base + spec.model),
      _fetchBuf(base + spec.lex),
      _fetchBuf(base + spec.vocab)
    ]);
    if (typeof onProgress === 'function') onProgress(70);

    await _bergCall('loadTranslationModel', { from: from, to: to }, {
      model: model,
      shortlist: shortlist,
      vocabs: [vocab],
      config: { 'gemm-precision': 'int8shiftAlphaAll' }
    });
    _bergLoaded[key] = true;
    if (typeof onProgress === 'function') onProgress(100);
  }

  async function _translateViaBergamot(text, from, to, onProgress) {
    await _loadBergModel(from, to, onProgress);
    const lines = String(text).split('\n');
    const texts = [];
    const map = [];
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) {
        map.push(-1);
      } else {
        map.push(texts.length);
        texts.push({ text: lines[i], html: false });
      }
    }
    if (!texts.length) return text;

    const result = await _bergCall('translate', {
      models: [{ from: from, to: to }],
      texts: texts
    });
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      if (map[i] < 0) out.push(lines[i]);
      else out.push(result[map[i]].target.text);
    }
    return out.join('\n');
  }

  async function _googleTranslateChunk(text, from, to) {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
      encodeURIComponent(from) +
      '&tl=' +
      encodeURIComponent(to) +
      '&dt=t&q=' +
      encodeURIComponent(text);
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 8000) : null;
    let res;
    try {
      res = await fetch(url, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        signal: ctrl ? ctrl.signal : undefined
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!res || !res.ok) throw new Error('GOOGLE_HTTP ' + (res && res.status));
    const data = await res.json();
    if (!data || !data[0]) throw new Error('GOOGLE_BAD_JSON');
    let out = '';
    for (let i = 0; i < data[0].length; i++) {
      if (data[0][i] && data[0][i][0] != null) out += data[0][i][0];
    }
    return out;
  }

  async function _translateViaGoogle(text, from, to, onProgress) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('OFFLINE');
    }
    const raw = String(text || '');
    // Короткий текст — одним запросом (лучше контекст)
    if (raw.length <= 1500) {
      if (typeof onProgress === 'function') onProgress(100);
      return await _googleTranslateChunk(raw, from, to);
    }
    // Длинный — по строкам, чтобы сохранить переносы и не упереться в лимит URL
    const lines = raw.split('\n');
    const out = [];
    let done = 0;
    const total = lines.filter(function (l) { return l.trim(); }).length || 1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) {
        out.push(line);
        continue;
      }
      if (line.length <= 1500) {
        out.push(await _googleTranslateChunk(line, from, to));
      } else {
        // Слишком длинная строка — режем по предложениям
        let rest = line;
        let built = '';
        while (rest.length > 1500) {
          let cut = rest.lastIndexOf('. ', 1500);
          if (cut < 600) cut = rest.lastIndexOf(' ', 1500);
          if (cut < 600) cut = 1500;
          else cut += 1;
          built += await _googleTranslateChunk(rest.slice(0, cut).trimEnd(), from, to);
          rest = rest.slice(cut).trimStart();
          if (rest) built += ' ';
        }
        if (rest) built += await _googleTranslateChunk(rest, from, to);
        out.push(built);
      }
      done++;
      if (typeof onProgress === 'function') onProgress(Math.round((done / total) * 100));
    }
    return out.join('\n');
  }

  async function _getChromeTranslator(from, to, onProgress) {
    if (!('Translator' in self)) return null;
    // Без сети не начинаем скачивание пакета Google
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const key = from + '|' + to;
      if (_chromeTranslators[key]) return _chromeTranslators[key];
      try {
        const avail = await Translator.availability({
          sourceLanguage: from,
          targetLanguage: to
        });
        if (avail !== 'available') return null;
      } catch (e) {
        return null;
      }
    }
    const key = from + '|' + to;
    if (_chromeTranslators[key]) return _chromeTranslators[key];

    const opts = { sourceLanguage: from, targetLanguage: to };
    let availability = 'unavailable';
    try {
      availability = await Translator.availability(opts);
    } catch (e) {
      return null;
    }
    if (availability === 'unavailable') return null;

    const translator = await Translator.create({
      sourceLanguage: from,
      targetLanguage: to,
      monitor: function (m) {
        m.addEventListener('downloadprogress', function (e) {
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : Math.round((e.loaded || 0) * 100);
          if (typeof onProgress === 'function') onProgress(pct);
          else _toast(_t('toastTranslateDownloading', 'Загрузка модели Google') + ': ' + pct + '%', 'ok');
        });
      }
    });
    _chromeTranslators[key] = translator;
    return translator;
  }

  async function _translateViaChrome(text, from, to, onProgress) {
    const chrome = await _getChromeTranslator(from, to, onProgress);
    if (!chrome) return null;
    const lines = String(text).split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) { out.push(line); continue; }
      out.push(await chrome.translate(line));
    }
    return out.join('\n');
  }

  async function translatePlain(text, from, to, onProgress) {
    const trimmed = String(text || '');
    if (!trimmed.trim()) return trimmed;

    // 1) Google Translate по сети — лучшее качество
    try {
      return await _translateViaGoogle(trimmed, from, to, onProgress);
    } catch (e) {
      console.warn('[translate] Google:', e);
    }

    // 2) Встроенный Translator Chrome (модели Google, скачиваются при наличии сети)
    try {
      const viaChrome = await _translateViaChrome(trimmed, from, to, onProgress);
      if (viaChrome != null) return viaChrome;
    } catch (e) {
      console.warn('[translate] Chrome Translator:', e);
    }

    // 3) Офлайн: локальный Bergamot
    try {
      if (typeof onProgress === 'function') onProgress(0);
      _toast(_t('toastTranslateOfflineLocal', 'Нет сети — локальный перевод'), 'ok');
      return await _translateViaBergamot(trimmed, from, to, onProgress);
    } catch (e) {
      console.warn('[translate] Bergamot:', e);
    }

    throw new Error('NO_ENGINE');
  }

  function syncTranslateBtn() {
    const btn = document.getElementById('btn-translate-text');
    const lab = document.getElementById('btn-translate-text-label');
    if (!btn || !lab) return;
    if (!sel || sel.dataset.type !== 'text') {
      lab.textContent = 'английский';
      return;
    }
    const root = typeof _rtContent === 'function' ? _rtContent(sel) : (sel.querySelector('.tel') || sel.querySelector('.ec'));
    const plain = _plainFromRoot(root);
    const tgt = translateTargetFromText(plain);
    lab.textContent = tgt.label;
    btn.disabled = _busy || tgt.detected === 'empty';
    btn.style.opacity = btn.disabled ? '0.55' : '';
  }

  async function translateSelectedText() {
    if (_busy) return;
    if (!sel || sel.dataset.type !== 'text') {
      _toast(_t('toastTranslateNeedText', 'Выберите текстовый блок'), 'err');
      return;
    }
    const elId = sel.dataset.id;
    const dom = document.getElementById('canvas') &&
      document.getElementById('canvas').querySelector('[data-id="' + elId + '"]');
    const root = typeof _rtContent === 'function'
      ? _rtContent(dom || sel)
      : ((dom || sel).querySelector('.tel') || (dom || sel).querySelector('.ec'));
    if (!root) return;

    const plain = _plainFromRoot(root);
    if (!plain.trim()) {
      _toast(_t('toastTranslateEmpty', 'Нет текста для перевода'), 'err');
      return;
    }

    const tgt = translateTargetFromText(plain);
    let from = tgt.from;
    if (tgt.detected === 'mixed' || tgt.detected === 'empty') {
      from = await _detectSourceApi(plain, 'ru');
      if (from === tgt.to) from = tgt.to === 'en' ? 'ru' : 'en';
    }

    const btn = document.getElementById('btn-translate-text');
    const lab = document.getElementById('btn-translate-text-label');
    _busy = true;
    if (btn) btn.disabled = true;
    if (lab) lab.textContent = '…';

    try {
      if (typeof pushUndo === 'function') pushUndo();

      const translated = await translatePlain(plain, from, tgt.to, function (pct) {
        if (lab) lab.textContent = pct + '%';
      });

      if (typeof _toCharObjs === 'function' && typeof _charObjsToHtml === 'function') {
        const oldChars = _toCharObjs(root.innerHTML);
        const newChars = _rebuildChars(oldChars, translated);
        root.innerHTML = _charObjsToHtml(newChars);
      } else {
        root.textContent = translated;
      }

      const d = slides[cur] && slides[cur].els.find(function (e) { return e.id === elId; });
      if (d && d.type === 'text') {
        d.html = typeof _htmlWithoutStruts === 'function'
          ? _htmlWithoutStruts(root.innerHTML)
          : root.innerHTML;
      }

      if (typeof _rtNormalizeTextDisplay === 'function') {
        _rtNormalizeTextDisplay(root, (d && d.cs) || '', d && d.bulletGap);
      }
      if (typeof _rtUpdateCharCounter === 'function') _rtUpdateCharCounter(dom || sel, root);

      const finish = function () {
        if (typeof fitTextHeight === 'function' && d) {
          try { fitTextHeight(d); } catch (e) {}
          if (dom && d.h) dom.style.height = d.h + 'px';
        }
        if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
        else if (typeof _updateSelFrames === 'function') _updateSelFrames();
        if (typeof save === 'function') save();
        if (typeof drawThumbs === 'function') drawThumbs();
        if (typeof saveState === 'function') saveState();
        _busy = false;
        syncTranslateBtn();
        if (typeof syncProps === 'function') syncProps();
        _toast(
          tgt.to === 'en'
            ? _t('toastTranslatedEn', 'Переведено на английский')
            : _t('toastTranslatedRu', 'Переведено на русский'),
          'ok'
        );
      };
      requestAnimationFrame(finish);
    } catch (e) {
      _busy = false;
      syncTranslateBtn();
      if (e && e.message === 'NO_ENGINE') {
        _toast(
          _t(
            'toastTranslateNoEngine',
            'Нет сети и не удалось запустить локальный переводчик'
          ),
          'err'
        );
      } else {
        console.warn('[translate]', e);
        _toast(_t('toastTranslateFail', 'Не удалось перевести'), 'err');
      }
    }
  }

  // Прогрев WASM в фоне после загрузки страницы (не блокирует UI)
  function _prefetchBergamot() {
    setTimeout(function () {
      _ensureBergamot().catch(function () {});
    }, 2500);
  }
  if (document.readyState === 'complete') _prefetchBergamot();
  else window.addEventListener('load', _prefetchBergamot);

  window.detectTextLang = detectTextLang;
  window.translateTargetFromText = translateTargetFromText;
  window.syncTranslateBtn = syncTranslateBtn;
  window.translateSelectedText = translateSelectedText;
})();
