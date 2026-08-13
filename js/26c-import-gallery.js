// ══════════════ IMPORT GALLERY (remote prezi catalog) ══════════════
(function () {
  const LS_KEY = 'slides_import_base';
  const DEFAULT_BASE = 'http://pyabc.ru/prezi/';
  const PROXY_PHP = 'prezi-proxy.php';

  let _base = '';
  let _relPath = ''; // '' or 'math/' or 'math/algebra/'
  let _loading = false;
  const LS_VIEW = 'slides_import_view';
  const _igSlideThumbCache = {};
  let _igThumbGen = 0;
  let _igThumbQueue = [];
  let _igThumbRunning = 0;
  let _igThumbIO = null;
  let _igLastItems = null;
  let _igLastAbsUrl = '';

  function _igGetView() {
    try {
      const v = localStorage.getItem(LS_VIEW);
      if (v === 'list' || v === 'grid') return v;
    } catch (e) {}
    return 'grid';
  }
  function _igSetView(mode) {
    const v = mode === 'list' ? 'list' : 'grid';
    try { localStorage.setItem(LS_VIEW, v); } catch (e) {}
    _igSyncViewUI();
    if (v === 'grid') _igKickSlideThumbs();
  }
  function _igSyncViewUI() {
    const v = _igGetView();
    const grid = document.getElementById('ig-grid');
    if (grid) grid.classList.toggle('ig-list', v === 'list');
    const gBtn = document.getElementById('ig-view-grid');
    const lBtn = document.getElementById('ig-view-list');
    if (gBtn) gBtn.classList.toggle('on', v === 'grid');
    if (lBtn) lBtn.classList.toggle('on', v === 'list');
  }

  function _normBase(url) {
    let u = String(url || '').trim();
    if (!u) return DEFAULT_BASE;
    if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
    // На pyabc.ru нет сертификата — https://pyabc.ru не откроется
    u = u.replace(/^https:\/\/(www\.)?pyabc\.ru\//i, 'http://pyabc.ru/');
    if (!u.endsWith('/')) u += '/';
    return u;
  }
  function _needsProxy() {
    try {
      return location.protocol === 'https:' && /^http:\/\//i.test(_normBase(_base));
    } catch (e) { return false; }
  }
  function _proxyUrl(opts) {
    const src = encodeURIComponent(_normBase(_base));
    const file = opts && opts.file ? '&file=' + encodeURIComponent(opts.file) : '';
    const path = encodeURIComponent((opts && opts.path) || '');
    const p = (typeof assetUrl === 'function') ? assetUrl(PROXY_PHP) : PROXY_PHP;
    return p + '?src=' + src + file + '&path=' + path;
  }
  function _proxiedAsset(absOrRel) {
    const base = _normBase(_base);
    let rel = String(absOrRel || '');
    if (!rel) return rel;
    if (rel.indexOf(base) === 0) rel = rel.slice(base.length);
    else if (/^https?:\/\//i.test(rel)) return rel;
    if (!_needsProxy()) return /^https?:\/\//i.test(absOrRel) ? absOrRel : (base + rel.replace(/^\//, ''));
    return _proxyUrl({ path: rel.replace(/^\//, '') });
  }
  function _getStoredBase() {
    try { return _normBase(localStorage.getItem(LS_KEY) || DEFAULT_BASE); }
    catch (e) { return DEFAULT_BASE; }
  }
  function _setStoredBase(url) {
    _base = _normBase(url);
    try { localStorage.setItem(LS_KEY, _base); } catch (e) {}
    return _base;
  }
  function _joinUrl(base, rel) {
    const b = _normBase(base);
    const r = String(rel || '').replace(/^\/+/, '');
    return b + r;
  }
  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function _prettyName(name) {
    return String(name || '')
      .replace(/\.slides\.json$/i, '')
      .replace(/\.json$/i, '')
      .replace(/\.html?$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || name;
  }
  function _igAppIconUrl() {
    const p = 'icon-512.png';
    return (typeof assetUrl === 'function') ? assetUrl(p) : p;
  }

  function openImportGallery() {
    _base = _setStoredBase(_getStoredBase());
    _relPath = '';
    let modal = document.getElementById('import-gallery-modal');
    if (modal && !modal.querySelector('#ig-view-grid')) {
      modal.remove();
      modal = null;
    }
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal-ov';
      modal.id = 'import-gallery-modal';
      modal.innerHTML =
        '<div class="modal ig-modal">' +
          '<h3 style="margin:0 0 12px">Импорт презентации</h3>' +
          '<div class="ig-toolbar">' +
            '<input id="ig-base-url" type="url" spellcheck="false" placeholder="http://pyabc.ru/prezi/" />' +
            '<button type="button" class="mbtn" id="ig-apply-base">Изменить</button>' +
          '</div>' +
          '<div class="ig-nav">' +
            '<button type="button" class="mbtn ig-back" id="ig-back" title="Назад">←</button>' +
            '<div class="ig-crumbs" id="ig-crumbs"></div>' +
          '</div>' +
          '<div class="ig-status" id="ig-status"></div>' +
          '<div class="ig-grid" id="ig-grid"></div>' +
          '<div class="ig-footer">' +
            '<button type="button" class="mbtn" id="ig-close">Закрыть</button>' +
            '<div class="ig-view-toggle" role="group" aria-label="Вид">' +
              '<button type="button" class="ig-view-btn" id="ig-view-grid" title="Плитка">' +
                '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' +
              '</button>' +
              '<button type="button" class="ig-view-btn" id="ig-view-list" title="Список">' +
                '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 6h13M8 12h13M8 18h13"/><rect x="3" y="4" width="3" height="3" rx="0.5"/><rect x="3" y="10" width="3" height="3" rx="0.5"/><rect x="3" y="16" width="3" height="3" rx="0.5"/></svg>' +
              '</button>' +
            '</div>' +
            '<button type="button" class="mbtn pri" id="ig-local">📁 С компьютера…</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.addEventListener('mousedown', function (e) {
        if (e.target === modal) modal.classList.remove('open');
      });
      modal.querySelector('#ig-close').onclick = function () { modal.classList.remove('open'); };
      modal.querySelector('#ig-local').onclick = function () {
        modal.classList.remove('open');
        const inp = document.getElementById('fileup');
        if (inp) inp.click();
      };
      modal.querySelector('#ig-apply-base').onclick = function () {
        const v = document.getElementById('ig-base-url').value;
        _setStoredBase(v);
        document.getElementById('ig-base-url').value = _base;
        _relPath = '';
        _igLoad();
      };
      modal.querySelector('#ig-base-url').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') modal.querySelector('#ig-apply-base').click();
      });
      modal.querySelector('#ig-back').onclick = function () { _igGoUp(); };
      modal.querySelector('#ig-view-grid').onclick = function () { _igSetView('grid'); };
      modal.querySelector('#ig-view-list').onclick = function () { _igSetView('list'); };
    }
    document.getElementById('ig-base-url').value = _base;
    modal.classList.add('open');
    _igSyncViewUI();
    _igLoad();
  }

  function _igGoUp() {
    if (!_relPath) return;
    const parts = _relPath.replace(/\/$/, '').split('/').filter(Boolean);
    parts.pop();
    _relPath = parts.length ? parts.join('/') + '/' : '';
    _igLoad();
  }

  function _igGoInto(folderSeg) {
    const seg = String(folderSeg || '').replace(/^\/+|\/+$/g, '');
    if (!seg) return;
    _relPath = (_relPath || '') + seg + '/';
    _igLoad();
  }

  function _igRenderCrumbs() {
    const el = document.getElementById('ig-crumbs');
    if (!el) return;
    const parts = _relPath.replace(/\/$/, '').split('/').filter(Boolean);
    let html = '<button type="button" class="ig-crumb" data-depth="0">prezi</button>';
    parts.forEach(function (p, i) {
      html += '<span class="ig-sep">/</span>' +
        '<button type="button" class="ig-crumb" data-depth="' + (i + 1) + '">' + _esc(p) + '</button>';
    });
    el.innerHTML = html;
    el.querySelectorAll('.ig-crumb').forEach(function (btn) {
      btn.onclick = function () {
        const depth = +btn.getAttribute('data-depth') || 0;
        const all = _relPath.replace(/\/$/, '').split('/').filter(Boolean);
        _relPath = depth <= 0 ? '' : all.slice(0, depth).join('/') + '/';
        _igLoad();
      };
    });
    const back = document.getElementById('ig-back');
    if (back) back.disabled = !_relPath;
  }

  function _igSetStatus(msg, isErr) {
    const st = document.getElementById('ig-status');
    if (!st) return;
    st.textContent = msg || '';
    st.classList.toggle('err', !!isErr);
  }

  async function _igFetchText(url) {
    let res;
    try {
      res = await fetch(url, { mode: 'cors', cache: 'no-cache' });
    } catch (e) {
      const pageHttps = typeof location !== 'undefined' && location.protocol === 'https:';
      const targetHttp = /^http:\/\//i.test(url);
      if (pageHttps && targetHttp) {
        throw new Error('Браузер блокирует HTTP с HTTPS-страницы (mixed content). Откройте редактор по HTTP или укажите https:// адрес каталога.');
      }
      throw new Error('Failed to fetch — скорее всего нет CORS на сервере. Залейте list.php и get.php в папку prezi/.');
    }
    if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + url);
    return await res.text();
  }

  function _igListPhpUrl(pathRel) {
    const q = String(pathRel || '').replace(/^\/+|\/+$/g, '');
    if (_needsProxy()) return _proxyUrl({ file: 'list.php', path: q });
    return _normBase(_base) + 'list.php?path=' + encodeURIComponent(q);
  }
  function _igGetPhpUrl(pathRel) {
    const q = String(pathRel || '').replace(/^\/+/, '');
    if (_needsProxy()) return _proxyUrl({ file: 'get.php', path: q });
    return _normBase(_base) + 'get.php?path=' + encodeURIComponent(q);
  }

  /** 1) list.php (CORS) → 2) index.json → 3) HTML directory listing */
  async function _igListDir(absUrl) {
    const pathRel = _relPath || '';
    // Preferred: PHP lister with CORS
    try {
      const raw = await _igFetchText(_igListPhpUrl(pathRel));
      const data = JSON.parse(raw);
      if (data && data.error) throw new Error(data.error);
      return _igNormalizeIndex(data, absUrl);
    } catch (ePhp) {
      // continue
      var phpErr = ePhp;
    }
    try {
      const idxUrl = _needsProxy()
        ? _proxyUrl({ file: 'index.json', path: String(pathRel || '').replace(/^\/+|\/+$/g, '') })
        : absUrl.replace(/\/?$/, '/') + 'index.json';
      const raw = await _igFetchText(idxUrl);
      const data = JSON.parse(raw);
      return _igNormalizeIndex(data, absUrl);
    } catch (eJson) { /* continue */ }
    try {
      const html = await _igFetchText(_needsProxy() ? _proxyUrl({ path: String(pathRel || '').replace(/^\/+/, '') }) : absUrl);
      return _igParseDirListing(html, absUrl);
    } catch (e2) {
      throw new Error(
        'Не удалось прочитать каталог.\n' +
        'Залейте на сайт в папку prezi/ файлы list.php и get.php (из проекта).\n' +
        (phpErr && phpErr.message ? phpErr.message : (e2 && e2.message ? e2.message : ''))
      );
    }
  }

  function _igNormalizeIndex(data, absUrl) {
    const items = Array.isArray(data) ? data : (data && data.items) || [];
    return items.map(function (it) {
      const type = (it.type === 'folder' || it.type === 'dir') ? 'folder'
        : (it.type === 'pres' || it.type === 'html' || it.type === 'file') ? 'pres' : null;
      if (!type) return null;
      const name = it.name || it.title || it.id || it.file || 'Без имени';
      if (type === 'folder') {
        const id = (it.path || it.id || it.name || '').replace(/^\/+|\/+$/g, '');
        return { type: 'folder', name: name, id: id };
      }
      const file = it.file || it.href || (String(name).match(/\.(html?|json|slides\.json)$/i) ? name : name + '.html');
      let thumb = it.thumb || it.preview || it.image || '';
      if (thumb && !/^https?:\/\//i.test(thumb)) thumb = absUrl.replace(/\/?$/, '/') + thumb.replace(/^\//, '');
      if (thumb) thumb = _proxiedAsset(thumb);
      return { type: 'pres', name: name, file: file.replace(/^\//, ''), thumb: thumb };
    }).filter(Boolean);
  }

  function _igParseDirListing(html, absUrl) {
    const base = absUrl.replace(/\/?$/, '/');
    const seen = {};
    const out = [];
    const re = /<a\s+[^>]*href=["']([^"'?#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html))) {
      let href = m[1].trim();
      if (!href || href === '../' || href === './' || href.startsWith('?') || href.startsWith('#') || href.startsWith('mailto:')) continue;
      // skip absolute external hosts
      try {
        if (/^https?:\/\//i.test(href)) {
          const u = new URL(href);
          const b = new URL(base);
          if (u.origin !== b.origin) continue;
          href = u.pathname.startsWith(new URL(base).pathname)
            ? u.pathname.slice(new URL(base).pathname.length)
            : '';
          if (!href) continue;
        }
      } catch (e) { continue; }
      href = decodeURIComponent(href);
      if (href.startsWith('/')) continue;
      const isDir = /\/$/.test(href);
      const seg = href.replace(/\/$/, '').split('/').pop();
      if (!seg || seg === 'index.json' || seg === 'list.php' || seg === 'get.php' || seen[seg]) continue;
      if (isDir) {
        seen[seg] = 1;
        out.push({ type: 'folder', name: seg, id: seg });
      } else if (/\.html?$/i.test(seg) || /\.slides\.json$/i.test(seg) || (/\.json$/i.test(seg) && seg !== 'index.json')) {
        seen[seg] = 1;
        out.push({
          type: 'pres',
          name: _prettyName(seg),
          file: seg,
          thumb: ''
        });
      }
    }
    out.sort(function (a, b) {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return String(a.name).localeCompare(String(b.name), 'ru');
    });
    return out;
  }

  async function _igLoad() {
    if (_loading) return;
    _loading = true;
    _igRenderCrumbs();
    const grid = document.getElementById('ig-grid');
    if (grid) grid.innerHTML = '<div class="ig-loading">Загрузка…</div>';
    _igSyncViewUI();
    _igSetStatus('Читаю ' + _joinUrl(_base, _relPath));
    try {
      const abs = _joinUrl(_base, _relPath);
      const items = await _igListDir(abs);
      _igRenderGrid(items, abs);
      _igSetStatus(items.length ? ('Найдено: ' + items.length) : 'Папка пуста');
    } catch (err) {
      if (grid) {
        grid.innerHTML = '<div class="ig-empty">Не удалось загрузить каталог.<br><span style="opacity:.7;font-size:12px">' +
          _esc(err.message || err) + '</span><br><br>' +
          '<span style="opacity:.75;font-size:12px">Залейте в <code>prezi/</code> на сайте файлы <code>list.php</code> и <code>get.php</code> из проекта.</span></div>';
      }
      _igSetStatus(String(err.message || err), true);
    }
    _loading = false;
  }

  function _igThumbCacheKey(it) {
    return ((_relPath || '') + String(it && it.file || '')).replace(/^\/+/, '');
  }

  function _igPaintCanvas(cnv, color) {
    if (!cnv) return;
    const ctx = cnv.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = color || '#1a1a2e';
    ctx.fillRect(0, 0, cnv.width, cnv.height);
  }

  function _igDrawImgCover(cnv, img) {
    const TW = cnv.width, TH = cnv.height;
    const ctx = cnv.getContext('2d');
    if (!ctx || !img) return;
    const ir = (img.naturalWidth / img.naturalHeight) || 1;
    const tr = TW / TH;
    let dw, dh, dx, dy;
    if (ir > tr) { dh = TH; dw = dh * ir; dx = (TW - dw) / 2; dy = 0; }
    else { dw = TW; dh = dw / ir; dx = 0; dy = (TH - dh) / 2; }
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, TW, TH);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function _igLoadImg(url) {
    return new Promise(function (resolve) {
      if (!url) { resolve(null); return; }
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }

  function _igExtractFirstSlide(raw, isLite) {
    try {
      if (isLite || (raw && raw.trim().charAt(0) === '{')) {
        const obj = JSON.parse(raw);
        const data = Array.isArray(obj) ? { slides: obj } : obj;
        const s = data.slides && data.slides[0];
        if (!s) return null;
        return {
          slide: s,
          canvasW: +data.canvasW || 0,
          canvasH: +data.canvasH || 0,
          themeIdx: data.themeIdx != null ? data.themeIdx : data.appliedThemeIdx,
          themeName: data.themeName
        };
      }
      if (typeof _importHtmlScriptJson !== 'function') return null;
      const json = _importHtmlScriptJson(raw, '_sl');
      if (!json) return null;
      const slidesArr = JSON.parse(json);
      const s = Array.isArray(slidesArr) ? slidesArr[0] : null;
      if (!s) return null;
      let themeIdx = null;
      if (typeof _importThemeFromHtml === 'function') themeIdx = _importThemeFromHtml(raw);
      return { slide: s, canvasW: 0, canvasH: 0, themeIdx: themeIdx, themeName: null };
    } catch (e) {
      return null;
    }
  }

  function _igResolveSlideForThumb(info) {
    if (!info || !info.slide) return null;
    let s = info.slide;
    if ((s.bg === 'theme' || !s.bg) && !s.bgc && typeof THEMES !== 'undefined' && THEMES) {
      let idx = info.themeIdx;
      if ((idx == null || idx < 0) && info.themeName) {
        idx = THEMES.findIndex(function (t) { return t && t.name === info.themeName; });
      }
      if (idx >= 0 && THEMES[idx] && THEMES[idx].bg) {
        s = Object.assign({}, s, { bg: 'custom', bgc: THEMES[idx].bg });
      }
    }
    return s;
  }

  function _igDrawFirstSlide(cnv, info) {
    if (typeof renderThumbCanvas !== 'function') return false;
    const s = _igResolveSlideForThumb(info);
    if (!s) return false;
    const prevW = typeof canvasW !== 'undefined' ? canvasW : 1200;
    const prevH = typeof canvasH !== 'undefined' ? canvasH : 675;
    const TW = 160;
    try {
      if (info.canvasW > 0 && info.canvasH > 0) {
        canvasW = info.canvasW;
        canvasH = info.canvasH;
      }
      const TH = Math.max(1, Math.round(TW * (canvasH / canvasW)));
      renderThumbCanvas(cnv, s, null, TW, TH);
      return true;
    } catch (e) {
      return false;
    } finally {
      canvasW = prevW;
      canvasH = prevH;
    }
  }

  async function _igFetchPresRaw(absUrl, it) {
    const relFile = ((_relPath || '') + String(it.file || '').replace(/^\//, '')).replace(/^\/+/, '');
    const viaGet = _igGetPhpUrl(relFile);
    const direct = absUrl.replace(/\/?$/, '/') + String(it.file || '').replace(/^\//, '');
    try {
      return await _igFetchText(viaGet);
    } catch (e1) {
      return await _igFetchText(_needsProxy() ? _proxiedAsset(direct) : direct);
    }
  }

  function _igCacheCanvas(key, cnv) {
    try { _igSlideThumbCache[key] = cnv.toDataURL('image/jpeg', 0.72); } catch (e) {}
  }

  function _igRevealThumb(card) {
    if (!card) return;
    card.setAttribute('data-thumb-ready', '1');
    const wrap = card.querySelector('.ig-thumb');
    if (!wrap || wrap.classList.contains('is-ready')) return;
    requestAnimationFrame(function () {
      wrap.classList.add('is-ready');
    });
  }

  async function _igMakeSlideThumb(job) {
    const { card, it, absUrl, gen } = job;
    if (gen !== _igThumbGen || !card || !card.isConnected) return;
    const cnv = card.querySelector('canvas.ig-thumb-slide');
    if (!cnv) return;
    const key = _igThumbCacheKey(it);
    if (_igSlideThumbCache[key]) {
      const cached = await _igLoadImg(_igSlideThumbCache[key]);
      if (gen !== _igThumbGen || !card.isConnected) return;
      if (cached) { _igDrawImgCover(cnv, cached); _igRevealThumb(card); }
      return;
    }
    const png = await _igLoadImg(it.thumb || '');
    if (gen !== _igThumbGen || !card.isConnected) return;
    if (png && png.naturalWidth > 8) {
      _igDrawImgCover(cnv, png);
      _igCacheCanvas(key, cnv);
      _igRevealThumb(card);
      return;
    }
    try {
      const isLite = /\.json$/i.test(String(it.file || it.name || ''));
      const raw = await _igFetchPresRaw(absUrl, it);
      if (gen !== _igThumbGen || !card.isConnected) return;
      const info = _igExtractFirstSlide(raw, isLite);
      if (info && _igDrawFirstSlide(cnv, info)) {
        _igRevealThumb(card);
        setTimeout(function () {
          if (gen === _igThumbGen && card.isConnected) _igCacheCanvas(key, cnv);
        }, 500);
      }
    } catch (e) { /* leave placeholder */ }
  }

  function _igPumpThumbs() {
    while (_igThumbRunning < 2 && _igThumbQueue.length) {
      const job = _igThumbQueue.shift();
      _igThumbRunning++;
      Promise.resolve(_igMakeSlideThumb(job)).then(function () {
        _igThumbRunning--;
        _igPumpThumbs();
      }, function () {
        _igThumbRunning--;
        _igPumpThumbs();
      });
    }
  }

  function _igQueueThumb(card, it, absUrl, gen) {
    if (!card || !it || it.type === 'folder') return;
    if (card.getAttribute('data-thumb-ready') === '1') return;
    _igThumbQueue.push({ card: card, it: it, absUrl: absUrl, gen: gen });
    _igPumpThumbs();
  }

  function _igKickSlideThumbs() {
    if (_igGetView() !== 'grid') return;
    const grid = document.getElementById('ig-grid');
    const items = _igLastItems;
    const absUrl = _igLastAbsUrl;
    if (!grid || !items) return;
    if (_igThumbIO) { try { _igThumbIO.disconnect(); } catch (e) {} _igThumbIO = null; }
    const gen = ++_igThumbGen;
    _igThumbQueue = [];
    const cards = grid.querySelectorAll('.ig-card.ig-pres');
    if (!cards.length) return;
    if (typeof IntersectionObserver === 'undefined') {
      cards.forEach(function (btn) {
        const it = items[+btn.getAttribute('data-i')];
        _igQueueThumb(btn, it, absUrl, gen);
      });
      return;
    }
    _igThumbIO = new IntersectionObserver(function (entries) {
      if (gen !== _igThumbGen) return;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (_igThumbIO) _igThumbIO.unobserve(en.target);
        const it = items[+en.target.getAttribute('data-i')];
        _igQueueThumb(en.target, it, absUrl, gen);
      });
    }, { root: grid, rootMargin: '120px' });
    cards.forEach(function (btn) { _igThumbIO.observe(btn); });
  }

  function _igRenderGrid(items, absUrl) {
    const grid = document.getElementById('ig-grid');
    if (!grid) return;
    _igLastItems = items;
    _igLastAbsUrl = absUrl;
    if (_igThumbIO) { try { _igThumbIO.disconnect(); } catch (e) {} _igThumbIO = null; }
    _igThumbGen++;
    _igThumbQueue = [];
    if (!items.length) {
      grid.innerHTML = '<div class="ig-empty">Здесь пока нет папок и презентаций</div>';
      return;
    }
    const appIcon = _igAppIconUrl();
    grid.innerHTML = items.map(function (it, i) {
      if (it.type === 'folder') {
        return '<button type="button" class="ig-card ig-folder" data-i="' + i + '" title="Двойной клик — открыть">' +
          '<div class="ig-folder-ico" aria-hidden="true">' +
            '<svg viewBox="0 0 64 52" width="64" height="52">' +
              '<path d="M2 12c0-3 2-5 5-5h16l4 5h30c3 0 5 2 5 5v28c0 3-2 5-5 5H7c-3 0-5-2-5-5V12z" fill="#f5c542"/>' +
              '<path d="M2 18h60v27c0 3-2 5-5 5H7c-3 0-5-2-5-5V18z" fill="#e6b000"/>' +
            '</svg>' +
          '</div>' +
          '<div class="ig-label">' + _esc(it.name) + '</div></button>';
      }
      return '<button type="button" class="ig-card ig-pres" data-i="' + i + '" title="Двойной клик — импортировать">' +
        '<div class="ig-thumb">' +
          '<canvas class="ig-thumb-slide" width="160" height="90"></canvas>' +
          '<img class="ig-thumb-app" src="' + _esc(appIcon) + '" alt="" />' +
        '</div>' +
        '<div class="ig-label">' + _esc(it.name) + '</div></button>';
    }).join('');

    grid.querySelectorAll('.ig-card').forEach(function (btn) {
      const it = items[+btn.getAttribute('data-i')];
      btn.ondblclick = function (e) {
        e.preventDefault();
        if (!it) return;
        if (it.type === 'folder') _igGoInto(it.id || it.name);
        else _igImportPres(absUrl, it);
      };
    });
    _igKickSlideThumbs();
  }

  async function _igImportPres(absUrl, it) {
    const relFile = ((_relPath || '') + String(it.file || '').replace(/^\//, '')).replace(/^\/+/, '');
    const viaGet = _igGetPhpUrl(relFile);
    const direct = absUrl.replace(/\/?$/, '/') + String(it.file || '').replace(/^\//, '');
    const isLite = /\.json$/i.test(String(it.file || it.name || ''));
    _igSetStatus('Импорт: ' + (it.name || it.file) + '…');
    if (typeof showLoading === 'function') showLoading('Импорт…', 20);
    try {
      let raw = '';
      try {
        raw = await _igFetchText(viaGet);
      } catch (e1) {
        raw = await _igFetchText(_needsProxy() ? _proxiedAsset(direct) : direct);
      }
      const modal = document.getElementById('import-gallery-modal');
      if (modal) modal.classList.remove('open');
      if (typeof showLoading === 'function') showLoading('Импорт…', 90);
      let ok = false;
      if (isLite || (raw && raw.trim().charAt(0) === '{')) {
        if (typeof importLiteContent === 'function') ok = !!importLiteContent(raw);
        else throw new Error('importLiteContent недоступен');
      } else {
        if (!raw || (raw.indexOf('id="_sl"') < 0 && raw.indexOf("id='_sl'") < 0)) {
          throw new Error('Файл не похож на презентацию «Слайды»');
        }
        if (typeof importHTMLContent === 'function') {
          ok = !!importHTMLContent(raw);
        } else if (typeof importHTMLFile === 'function') {
          const name = (it.file || it.name || 'presentation.html').replace(/[^\w.\-а-яА-ЯёЁ]+/gi, '_');
          const file = new File([raw], name.endsWith('.html') ? name : name + '.html', { type: 'text/html' });
          importHTMLFile(file);
          ok = true;
        } else {
          throw new Error('importHTMLFile недоступен');
        }
      }
      if (ok && typeof fitAllTextsAllSlides === 'function') {
        setTimeout(function () { try { fitAllTextsAllSlides(); } catch (e) {} }, 800);
      } else if (ok && typeof window._fitAllTextsAllSlides === 'function') {
        setTimeout(function () { try { window._fitAllTextsAllSlides(); } catch (e) {} }, 800);
      }
      if (!ok) throw new Error('Импорт не выполнен');
    } catch (err) {
      _igSetStatus(String(err.message || err), true);
      if (typeof toast === 'function') toast('Импорт: ' + (err.message || err), 'err');
    } finally {
      if (typeof hideLoading === 'function') hideLoading();
    }
  }

  window.openImportGallery = openImportGallery;
})();
