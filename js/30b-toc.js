// ══════════════ TABLE OF CONTENTS (оглавление) ══════════════
(function () {
  function _plainFromHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function _colorFromCs(cs) {
    const m = (cs || '').match(/(?:^|;)\s*color:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+)/i);
    return m ? m[1].trim() : '';
  }

  function _stripGradFromStyleAttr(c) {
    if (!c) return;
    let cs = c.getAttribute('style') || '';
    cs = cs
      .replace(/\bbackground\s*:[^;]+;?/gi, '')
      .replace(/-webkit-background-clip\s*:[^;]+;?/gi, '')
      .replace(/\bbackground-clip\s*:[^;]+;?/gi, '')
      .replace(/-webkit-text-fill-color\s*:[^;]+;?/gi, '')
      .replace(/\s{2,}/g, ' ').trim();
    if (cs && !cs.endsWith(';')) cs += ';';
    c.setAttribute('style', cs);
  }

  function _resolveTocColor(root, wrapEl) {
    const cs = (root && root.getAttribute && root.getAttribute('style')) || '';
    let col = _colorFromCs(cs);
    if (!col && wrapEl) {
      const g1 = wrapEl.dataset && wrapEl.dataset.textColorGrad1;
      if (g1) col = g1;
    }
    if (!col && root && root.ownerDocument) {
      try {
        const computed = root.ownerDocument.defaultView.getComputedStyle(root).color;
        if (computed && computed !== 'rgba(0, 0, 0, 0)' && computed !== 'transparent') col = computed;
      } catch (e) {}
    }
    if (!col && typeof slides !== 'undefined' && typeof cur !== 'undefined' && wrapEl && wrapEl.dataset.id) {
      const d = slides[cur] && slides[cur].els.find(e => e.id === wrapEl.dataset.id);
      if (d) {
        col = _colorFromCs(d.cs || '') || d.textColorGrad1 || '';
        if (!col && d.textColorScheme && typeof _resolveSchemeColor === 'function') {
          const ti = typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0 ? appliedThemeIdx : -1;
          const th = ti >= 0 && typeof THEMES !== 'undefined' ? THEMES[ti] : null;
          if (th) col = _resolveSchemeColor(d.textColorScheme, th) || '';
        }
      }
    }
    return col || '#ffffff';
  }

  window._stripGradFromStyleAttr = _stripGradFromStyleAttr;

  // Градиент текста на .ec делает дочерние span невидимыми — отключаем для блока оглавления.
  window._tocClearParentTextGrad = function (wrapEl) {
    const c = wrapEl && wrapEl.querySelector && (wrapEl.querySelector('.tel') || wrapEl.querySelector('.ec'));
    if (!c) return;
    c.style.background = '';
    c.style.webkitBackgroundClip = '';
    c.style.backgroundClip = '';
    c.style.webkitTextFillColor = '';
    _stripGradFromStyleAttr(c);
  };

  window._fixTocItemsVisible = function (root, showMode, wrapEl) {
    if (!root) return;
    const host = wrapEl || (root.closest && root.closest('.el, .psel'));
    const dim = showMode != null ? !!showMode : !!(root.closest && root.closest('.psel'));
    const col = _resolveTocColor(root, host);
    root.querySelectorAll('[data-toc-slide]').forEach(item => {
      item.classList.add('toc-item');
      item.style.color = col;
      item.style.webkitTextFillColor = col;
      item.style.background = 'none';
      item.style.webkitBackgroundClip = 'border-box';
      item.style.backgroundClip = 'border-box';
      if (dim) {
        item.dataset.tocDim = '1';
        item.style.opacity = '0.55';
        item.style.transition = 'opacity .15s';
      } else {
        delete item.dataset.tocDim;
        item.style.opacity = '';
        item.style.transition = '';
      }
    });
  };

  window.collectTocEntries = function () {
    const entries = [];
    if (typeof slides === 'undefined') return entries;
    slides.forEach((slide, si) => {
      (slide.els || []).forEach(d => {
        if (d.type === 'text' && d.textRole === 'tocEntry') {
          const title = _plainFromHtml(d.html);
          if (title) entries.push({ slide: si, title });
        }
      });
    });
    return entries;
  };

  function _buildTocHtml(entries, fontSizePx) {
    if (!entries.length) {
      const en = typeof getLang === 'function' && getLang() === 'en';
      return '<div class="toc-empty">' + (en ? 'No chapters marked' : 'Нет пунктов оглавления') + '</div>';
    }
    const fsAttr = fontSizePx
      ? ` style="font-size:${fontSizePx}px;line-height:1.25;vertical-align:baseline"`
      : '';
    return entries.map(e =>
      '<span data-toc-slide="' + e.slide + '" class="toc-item"' + fsAttr + '>' + _esc(e.title) + '</span>'
    ).join('<br>');
  }

  function _tocResetContainerMetrics(c, cs) {
    if (!c) return;
    const baseFs = typeof _rtFontSizeFromCs === 'function'
      ? (_rtFontSizeFromCs(cs || '') || 24)
      : 24;
    c.style.fontSize = baseFs + 'px';
    c.style.lineHeight = '';
    c.querySelectorAll('span._rt-blank-strut').forEach(s => s.remove());
  }

  window.rtSetTocEntry = function () {
    if (!sel || sel.dataset.type !== 'text') return;
    if (sel.dataset.editing === 'true' && typeof window._finishTextEdit === 'function') window._finishTextEdit(sel);
    const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
    const next = sel.dataset.textRole === 'tocEntry' ? 'body' : 'tocEntry';
    sel.dataset.textRole = next;
    if (d) d.textRole = next;
    if (typeof window._updateTocButtonState === 'function') window._updateTocButtonState();
    if (typeof save === 'function') save();
    if (typeof saveState === 'function') saveState();
    if (typeof toast === 'function') {
      const en = typeof getLang === 'function' && getLang() === 'en';
      toast(next === 'tocEntry'
        ? (en ? 'Marked as chapter' : 'Пункт оглавления')
        : (en ? 'Chapter mark removed' : 'Пункт оглавления снят'), 'ok');
    }
  };

  window.rtFillToc = function () {
    if (!sel || sel.dataset.type !== 'text') return;
    const c = sel.querySelector('.ec');
    if (!c) return;
    if (sel.dataset.editing === 'true' && typeof window._finishTextEdit === 'function') window._finishTextEdit(sel);
    const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
    const cs = (d && d.cs) || c.getAttribute('style') || '';
    const baseFs = typeof _rtFontSizeFromCs === 'function'
      ? (_rtFontSizeFromCs(cs) || 24)
      : 24;
    const entries = window.collectTocEntries();
    const html = _buildTocHtml(entries, baseFs);
    c.innerHTML = html;
    _tocResetContainerMetrics(c, cs);
    sel.dataset.textRole = 'toc';
    sel.classList.add('has-toc');
    if (typeof window._tocClearParentTextGrad === 'function') window._tocClearParentTextGrad(sel);
    if (typeof window._fixTocItemsVisible === 'function') window._fixTocItemsVisible(c, false, sel);
    if (typeof applyTextColorGrad === 'function') applyTextColorGrad(sel);
    if (d) {
      d.textRole = 'toc';
      d.html = html;
      delete d.textColorGrad;
      delete d.textColorGrad1;
      delete d.textColorGrad2;
      delete d.textColorGradDir;
    }
    delete sel.dataset.textColorGrad;
    delete sel.dataset.textColorGrad1;
    delete sel.dataset.textColorGrad2;
    delete sel.dataset.textColorGradDir;
    if (typeof window._updateTocButtonState === 'function') window._updateTocButtonState();
    if (typeof save === 'function') save();
    if (typeof saveState === 'function') saveState();
    if (typeof toast === 'function') {
      const en = typeof getLang === 'function' && getLang() === 'en';
      toast(entries.length
        ? (en ? 'Table of contents filled' : 'Оглавление заполнено')
        : (en ? 'No chapters marked yet' : 'Нет пунктов оглавления'), entries.length ? 'ok' : '');
    }
  };

  window._updateTocButtonState = function () {
    if (!sel || sel.dataset.type !== 'text') return;
    const role = sel.dataset.textRole || 'body';
    const entryBtn = document.getElementById('ft-toc-entry');
    const tocBtn = document.getElementById('btn-fill-toc');
    if (entryBtn) entryBtn.classList.toggle('on', role === 'tocEntry');
    if (tocBtn) tocBtn.classList.toggle('on', role === 'toc');
  };

  function _gotoTocSlide(si, curIdx, gotoFn) {
    if (isNaN(si) || si < 0) return;
    if (typeof clearAutoTimer === 'function') clearAutoTimer();
    if (typeof gotoFn === 'function') {
      gotoFn(si);
      return;
    }
    if (typeof gotoPreviewSlide === 'function') gotoPreviewSlide(si);
    else if (typeof window._followSlideLink === 'function') window._followSlideLink('#slide-' + (si + 1), curIdx);
  }

  window._wireTocElement = function (el, root, curIdx, gotoFn) {
    if (!el || !root) return;
    if (el._tocWired) return;
    const items = root.querySelectorAll('[data-toc-slide]');
    if (!items.length) return;
    el._tocWired = true;
    el.classList.add('has-toc');
    el._hasToc = true;
    el.style.pointerEvents = 'auto';
    root.style.pointerEvents = 'auto';
    const body = root.closest('._text_body') || root.closest('.psel-txt');
    if (body) body.style.pointerEvents = 'auto';

    if (typeof window._tocClearParentTextGrad === 'function') window._tocClearParentTextGrad(el);
    if (typeof window._fixTocItemsVisible === 'function') window._fixTocItemsVisible(root, true);

    const onActivate = e => {
      let item = e.target.closest && e.target.closest('[data-toc-slide]');
      if (!item && e.clientX != null && typeof window._tocHitAtPoint === 'function') {
        item = window._tocHitAtPoint(e.clientX, e.clientY, el);
      }
      if (!item || !root.contains(item)) return;
      e.stopPropagation();
      e.preventDefault();
      const si = parseInt(item.getAttribute('data-toc-slide'), 10);
      _gotoTocSlide(si, curIdx, gotoFn);
    };
    el.addEventListener('click', onActivate);
    el.addEventListener('mousedown', onActivate);

    items.forEach(item => {
      item.style.pointerEvents = 'auto';
      item.style.cursor = 'pointer';
      item.addEventListener('mouseenter', () => { item.style.opacity = '1'; });
      item.addEventListener('mouseleave', () => { item.style.opacity = '0.55'; });
    });
  };

  window._tocHitAtPoint = function (clientX, clientY, container) {
    const elems = document.elementsFromPoint(clientX, clientY);
    for (let i = 0; i < elems.length; i++) {
      const n = elems[i];
      if (container && !container.contains(n)) continue;
      const item = n.closest && n.closest('[data-toc-slide]');
      if (item) return item;
    }
    return null;
  };

  window._pointOverTocItem = function (clientX, clientY, container) {
    return !!window._tocHitAtPoint(clientX, clientY, container);
  };
})();
