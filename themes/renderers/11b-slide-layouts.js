// ══════════════ SLIDE CONTENT LAYOUTS (PowerPoint-style) ══════════════
(function () {
  const LAYOUTS = [
    {
      id: 'blank',
      nameKey: 'layoutBlank',
      boxes: []
    },
    {
      id: 'title',
      nameKey: 'layoutTitle',
      boxes: [
        { role: 'heading', textRu: 'Заголовок презентации', textEn: 'Presentation title', x: 0.1, y: 0.28, w: 0.8, h: 0.2, fs: 52, align: 'center', weight: 700 },
        { role: 'body', textRu: 'Подзаголовок', textEn: 'Subtitle', x: 0.15, y: 0.52, w: 0.7, h: 0.12, fs: 26, align: 'center', weight: 400, valign: 'middle' }
      ]
    },
    {
      id: 'titleBody',
      nameKey: 'layoutTitleBody',
      boxes: [
        { role: 'heading', textRu: 'Заголовок', textEn: 'Title', x: 0.08, y: 0.08, w: 0.84, h: 0.14, fs: 40, align: 'left', weight: 700 },
        { role: 'body', textRu: 'Текст слайда…', textEn: 'Slide text…', x: 0.08, y: 0.28, w: 0.84, h: 0.56, fs: 24, align: 'left', weight: 400 }
      ]
    },
    {
      id: 'titleOnly',
      nameKey: 'layoutTitleOnly',
      boxes: [
        { role: 'heading', textRu: 'Заголовок', textEn: 'Title', x: 0.08, y: 0.08, w: 0.84, h: 0.16, fs: 40, align: 'left', weight: 700 }
      ]
    },
    {
      id: 'section',
      nameKey: 'layoutSection',
      boxes: [
        { role: 'heading', textRu: 'Раздел', textEn: 'Section', x: 0.1, y: 0.36, w: 0.8, h: 0.2, fs: 48, align: 'center', weight: 700 }
      ]
    },
    {
      id: 'twoCol',
      nameKey: 'layoutTwoCol',
      boxes: [
        { role: 'heading', textRu: 'Заголовок', textEn: 'Title', x: 0.06, y: 0.06, w: 0.88, h: 0.12, fs: 36, align: 'left', weight: 700 },
        { role: 'body', textRu: 'Левая колонка', textEn: 'Left column', x: 0.06, y: 0.24, w: 0.42, h: 0.6, fs: 22, align: 'left', weight: 400 },
        { role: 'body', textRu: 'Правая колонка', textEn: 'Right column', x: 0.52, y: 0.24, w: 0.42, h: 0.6, fs: 22, align: 'left', weight: 400 }
      ]
    }
  ];

  function _tr(key, fb) {
    return (typeof t === 'function' ? t(key) : null) || fb || key;
  }

  function _isRu() {
    return typeof getLang === 'function' ? getLang() === 'ru' : true;
  }

  function _themeTextColor() {
    const ti = typeof appliedThemeIdx !== 'undefined' ? appliedThemeIdx : -1;
    const theme = ti >= 0 && typeof THEMES !== 'undefined' ? THEMES[ti] : null;
    const isDark = theme ? !!theme.dark : true;
    const scheme = { col: 7, row: 0 };
    let color = isDark ? '#ffffff' : '#000000';
    if (typeof _resolveSchemeColor === 'function' && theme) {
      color = _resolveSchemeColor(scheme, theme) || color;
    }
    return { color, scheme };
  }

  function _snap(v) {
    return typeof snapV === 'function' ? snapV(v) : Math.round(v);
  }

  function _makeTextEl(box) {
    const W = typeof canvasW !== 'undefined' ? canvasW : 1200;
    const H = typeof canvasH !== 'undefined' ? canvasH : 675;
    const { color, scheme } = _themeTextColor();
    const ru = _isRu();
    const raw = ru ? box.textRu : box.textEn;
    const ph = (typeof window._TEXT_PH_COLOR === 'string' && window._TEXT_PH_COLOR) || '#888888';
    const html = typeof window._paintTextPlaceholderHtml === 'function'
      ? window._paintTextPlaceholderHtml(raw)
      : (typeof _charObjsToHtml === 'function'
        ? _charObjsToHtml([...raw].map(ch => ({ ch, style: { color: ph } })))
        : raw);
    const fs = box.fs || 28;
    const weight = box.weight || (box.role === 'heading' ? 700 : 400);
    const align = box.align || 'left';
    return {
      id: 'e' + (++ec),
      type: 'text',
      x: _snap(box.x * W),
      y: _snap(box.y * H),
      w: _snap(box.w * W),
      h: _snap(box.h * H),
      html,
      cs: 'font-size:' + fs + 'px;font-weight:' + weight + ';color:' + color
        + ';text-align:' + align + ';line-height:1.25;'
        + (box.role === 'heading' ? 'text-transform:uppercase;' : ''),
      rot: 0,
      anims: [],
      textRole: box.role === 'heading' ? 'heading' : 'body',
      textColorScheme: scheme,
      valign: box.valign || (box.role === 'heading' ? 'middle' : 'top'),
      textPlaceholder: true,
      textPlaceholderLabel: raw,
      _fromSlideLayout: true
    };
  }

  function _keepEl(d) {
    if (!d) return false;
    if (d._isDecor) return true;
    if (d.type === 'inkhost' || d.type === 'pagenum' || d.type === 'lineangle') return true;
    return false;
  }

  function applySlideContentLayout(layoutId) {
    if (typeof slides === 'undefined' || !slides[cur]) return;
    const layout = LAYOUTS.find(l => l.id === layoutId);
    if (!layout) return;
    if (typeof pushUndo === 'function') pushUndo();
    if (typeof save === 'function') try { save(); } catch (e) {}

    const s = slides[cur];
    const kept = (s.els || []).filter(_keepEl);
    const dropIds = new Set((s.els || []).filter(d => !_keepEl(d)).map(d => d && d.id).filter(Boolean));
    const cv = document.getElementById('canvas');
    if (cv) {
      dropIds.forEach(id => {
        const el = cv.querySelector('.el[data-id="' + id + '"]');
        if (el) el.remove();
      });
    }
    if (typeof multiSel !== 'undefined' && multiSel) {
      [...multiSel].forEach(el => {
        if (el && dropIds.has(el.dataset.id)) multiSel.delete(el);
      });
    }
    if (typeof sel !== 'undefined' && sel && dropIds.has(sel.dataset.id)) {
      try { if (typeof pick === 'function') pick(null); else sel = null; } catch (e) { sel = null; }
    }

    const added = (layout.boxes || []).map(_makeTextEl);
    s.els = kept.concat(added);
    added.forEach(d => {
      if (typeof mkEl === 'function') {
        try { mkEl(d); } catch (e) {}
      }
    });

    closeSlideLayoutMenu();
    if (typeof drawThumbs === 'function') drawThumbs();
    if (typeof saveState === 'function') saveState();
    if (typeof save === 'function') try { save(); } catch (e) {}
    if (typeof syncProps === 'function') syncProps();
    if (typeof toast === 'function') toast(_tr('toastSlideLayout', 'Layout applied'), 'ok');
  }

  function _previewSvg(layout) {
    const boxes = layout.boxes || [];
    let g = '';
    boxes.forEach(b => {
      const x = (b.x * 100).toFixed(1), y = (b.y * 100).toFixed(1);
      const w = (b.w * 100).toFixed(1), h = (b.h * 100).toFixed(1);
      const stroke = b.role === 'heading' ? 'currentColor' : 'currentColor';
      const op = b.role === 'heading' ? '0.55' : '0.35';
      g += '<rect x="' + x + '%" y="' + y + '%" width="' + w + '%" height="' + h + '%" fill="none" stroke="' + stroke + '" stroke-width="1.2" stroke-dasharray="3 2" opacity="' + op + '" rx="1"/>';
    });
    return '<svg viewBox="0 0 96 54" width="96" height="54" aria-hidden="true">'
      + '<rect x="0.5" y="0.5" width="95" height="53" rx="3" fill="var(--surface2)" stroke="var(--border2)" stroke-width="1"/>'
      + g + '</svg>';
  }

  function buildSlideLayoutMenu() {
    const menu = document.getElementById('slide-layout-menu');
    if (!menu) return;
    menu.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'slide-layout-menu-title';
    title.textContent = _tr('modalSlideLayout', 'Slide layout');
    menu.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'slide-layout-grid';
    LAYOUTS.forEach(L => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slide-layout-item';
      btn.setAttribute('role', 'menuitem');
      btn.innerHTML = _previewSvg(L)
        + '<span class="slide-layout-lbl">' + _tr(L.nameKey, L.id) + '</span>';
      btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        applySlideContentLayout(L.id);
      };
      grid.appendChild(btn);
    });
    menu.appendChild(grid);
  }

  function positionSlideLayoutMenu() {
    const menu = document.getElementById('slide-layout-menu');
    const btn = document.getElementById('btn-slide-layout');
    if (!menu || !btn) return;
    const r = btn.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 340)) + 'px';
    menu.style.top = (r.bottom + 6) + 'px';
  }

  function openSlideLayoutMenu() {
    let menu = document.getElementById('slide-layout-menu');
    if (!menu) return;
    if (menu.parentElement !== document.body) {
      document.body.appendChild(menu);
    }
    buildSlideLayoutMenu();
    menu.style.display = 'block';
    positionSlideLayoutMenu();
    const btn = document.getElementById('btn-slide-layout');
    if (btn) btn.classList.add('on');
  }

  function closeSlideLayoutMenu() {
    const menu = document.getElementById('slide-layout-menu');
    if (menu) menu.style.display = 'none';
    const btn = document.getElementById('btn-slide-layout');
    if (btn) btn.classList.remove('on');
  }

  function toggleSlideLayoutMenu(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const menu = document.getElementById('slide-layout-menu');
    if (!menu) return;
    if (menu.style.display === 'block') closeSlideLayoutMenu();
    else openSlideLayoutMenu();
  }

  document.addEventListener('mousedown', function (e) {
    const menu = document.getElementById('slide-layout-menu');
    if (!menu || menu.style.display !== 'block') return;
    if (menu.contains(e.target)) return;
    if (e.target.closest && e.target.closest('#btn-slide-layout')) return;
    closeSlideLayoutMenu();
  }, true);

  window.addEventListener('resize', function () {
    const menu = document.getElementById('slide-layout-menu');
    if (menu && menu.style.display === 'block') positionSlideLayoutMenu();
  });

  window.toggleSlideLayoutMenu = toggleSlideLayoutMenu;
  window.openSlideLayoutMenu = openSlideLayoutMenu;
  window.closeSlideLayoutMenu = closeSlideLayoutMenu;
  window.applySlideContentLayout = applySlideContentLayout;
})();
