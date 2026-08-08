// ══════════════ IMPORT GALLERY (remote prezi catalog) ══════════════
(function () {
  const LS_KEY = 'slides_import_base';
  const DEFAULT_BASE = 'http://pyabc.ru/prezi/';

  let _base = '';
  let _relPath = ''; // '' or 'math/' or 'math/algebra/'
  let _loading = false;

  function _normBase(url) {
    let u = String(url || '').trim();
    if (!u) return DEFAULT_BASE;
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    if (!u.endsWith('/')) u += '/';
    return u;
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
    const p = 'icons/icon-512.png';
    return (typeof assetUrl === 'function') ? assetUrl(p) : p;
  }

  function openImportGallery() {
    _base = _getStoredBase();
    _relPath = '';
    let modal = document.getElementById('import-gallery-modal');
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
    }
    document.getElementById('ig-base-url').value = _base;
    modal.classList.add('open');
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
    const base = _normBase(_base);
    const q = encodeURIComponent(String(pathRel || '').replace(/^\/+|\/+$/g, ''));
    return base + 'list.php?path=' + q;
  }
  function _igGetPhpUrl(pathRel) {
    const base = _normBase(_base);
    const q = encodeURIComponent(String(pathRel || '').replace(/^\/+/, ''));
    return base + 'get.php?path=' + q;
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
      const raw = await _igFetchText(absUrl.replace(/\/?$/, '/') + 'index.json');
      const data = JSON.parse(raw);
      return _igNormalizeIndex(data, absUrl);
    } catch (eJson) { /* continue */ }
    try {
      const html = await _igFetchText(absUrl);
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
        const baseName = seg.replace(/\.slides\.json$/i, '').replace(/\.html?$/i, '').replace(/\.json$/i, '');
        out.push({
          type: 'pres',
          name: _prettyName(seg),
          file: seg,
          thumb: base + baseName + '.png'
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

  function _igRenderGrid(items, absUrl) {
    const grid = document.getElementById('ig-grid');
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = '<div class="ig-empty">Здесь пока нет папок и презентаций</div>';
      return;
    }
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
      const thumb = it.thumb || '';
      const appIcon = _igAppIconUrl();
      return '<button type="button" class="ig-card ig-pres" data-i="' + i + '" title="Двойной клик — импортировать">' +
        '<div class="ig-thumb">' +
          (thumb
            ? '<img class="ig-thumb-preview" src="' + _esc(thumb) + '" alt="" loading="lazy" data-fallback="' + _esc(appIcon) + '"/>'
            : '<img class="ig-thumb-app" src="' + _esc(appIcon) + '" alt="" loading="lazy"/>') +
        '</div>' +
        '<div class="ig-label">' + _esc(it.name) + '</div></button>';
    }).join('');

    grid.querySelectorAll('.ig-card').forEach(function (btn) {
      const it = items[+btn.getAttribute('data-i')];
      const preview = btn.querySelector('img.ig-thumb-preview');
      if (preview) {
        preview.onerror = function () {
          const fb = preview.getAttribute('data-fallback') || _igAppIconUrl();
          preview.onerror = null;
          preview.className = 'ig-thumb-app';
          preview.removeAttribute('data-fallback');
          preview.src = fb;
        };
      }
      btn.ondblclick = function (e) {
        e.preventDefault();
        if (!it) return;
        if (it.type === 'folder') _igGoInto(it.id || it.name);
        else _igImportPres(absUrl, it);
      };
    });
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
        raw = await _igFetchText(direct);
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
