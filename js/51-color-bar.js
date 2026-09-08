// Desktop bottom color bar — quick palette for bg / stroke / text
(function () {
  let _mode = 'bg';
  let _barWasVisible = false;

  function _isDesktop() {
    return window.matchMedia && window.matchMedia('(min-width: 1280px)').matches;
  }

  window.isColorBarEnabled = function () {
    const v = localStorage.getItem('sf-color-bar');
    if (v === '1') return true;
    if (v === '0') return false;
    if (window.CFG_UI && typeof window.CFG_UI.showColorBar === 'boolean') return !!window.CFG_UI.showColorBar;
    return true;
  };
  window.setColorBar = function (on) {
    localStorage.setItem('sf-color-bar', on ? '1' : '0');
    if (typeof window._syncColorBarVisibility === 'function') window._syncColorBarVisibility();
  };
  window._syncColorBarVisibility = function () {
    document.body.classList.toggle('color-bar-off', !window.isColorBarEnabled());
    syncColorBar();
  };

  function _isNoFillShapeEl(el) {
    if (!el || el.dataset.type !== 'shape') return false;
    const sh = typeof SHAPES !== 'undefined' ? SHAPES.find(s => s.id === el.dataset.shape) : null;
    return !!(sh && sh.noFill);
  }

  function _isNoFillShape() {
    return _isNoFillShapeEl(sel);
  }

  function _barTargets() {
    if (typeof multiSel !== 'undefined' && multiSel && multiSel.size > 0) {
      return Array.from(multiSel);
    }
    return sel ? [sel] : [];
  }

  function _eachBarTarget(fn) {
    const targets = _barTargets();
    if (!targets.length) return;
    const prev = sel;
    try {
      targets.forEach(function (el) {
        sel = el;
        fn(el);
      });
    } finally {
      sel = prev;
    }
  }

  function _colorBarModesForEl(el) {
    if (!el) return null;
    const t = el.dataset.type;
    if (t === 'lineangle' || t === 'lego' || t === 'icon' || t === 'formula') {
      return { bg: false, stroke: false, text: true };
    }
    if (t === 'applet') {
      const aid = el.dataset.appletId || '';
      const stroke = ['generator', 'counter', 'timer', 'clock'].includes(aid);
      return { bg: true, stroke: stroke, text: true };
    }
    if (t === 'shape') return { bg: !_isNoFillShapeEl(el), stroke: true, text: true };
    if (t === 'text' || t === 'markdown') return { bg: true, stroke: true, text: true };
    return null;
  }

  function _elementHasFx(el) {
    const t = el && el.dataset.type;
    if (!t) return false;
    if (t === 'text' || t === 'markdown' || t === 'shape' || t === 'applet') return true;
    if (t === 'icon') return true;
    if (t === 'lego' || t === 'lineangle' || t === 'formula') return true;
    return false;
  }

  function _elementSupportsBar(el) {
    return !!(_colorBarModesForEl(el) || _elementHasFx(el));
  }

  function _colorBarModes() {
    const conn = _getConn();
    if (conn) return { bg: false, stroke: true, text: false };
    if (_getInkSel()) return { bg: false, stroke: false, text: true };
    if (_isSlideBgMode()) return { bg: true, stroke: false, text: false };
    const targets = _barTargets();
    if (!targets.length) return null;
    const modes = { bg: false, stroke: false, text: false };
    let any = false;
    targets.forEach(function (el) {
      const m = _colorBarModesForEl(el);
      if (!m) return;
      any = true;
      modes.bg = modes.bg || m.bg;
      modes.stroke = modes.stroke || m.stroke;
      modes.text = modes.text || m.text;
    });
    return any ? modes : null;
  }

  function _isSlideBgMode() {
    if (_getConn()) return false;
    if (_getInkSel()) return false;
    if (_barTargets().length) return false;
    return typeof slides !== 'undefined' && !!slides[cur];
  }

  function _getSlideBgColorInfo() {
    const s = slides[cur];
    if (!s) return { color: '', schemeRef: null };
    if (s.bgScheme && typeof _resolveSchemeColor === 'function') {
      const th = typeof _activeThemeForScheme === 'function' ? _activeThemeForScheme() : null;
      if (th) {
        const r = _resolveSchemeColor(s.bgScheme, th);
        if (r) return { color: r, schemeRef: s.bgScheme };
      }
    }
    const raw = typeof _resolveSlideColorBg === 'function' ? _resolveSlideColorBg(s) : (s.bgc || '');
    return { color: raw || '', schemeRef: s.bgScheme || null };
  }

  function _supportsBar() {
    if (_getConn()) return true;
    if (_getInkSel()) return true;
    const targets = _barTargets();
    if (targets.some(_elementSupportsBar)) return true;
    return _isSlideBgMode();
  }

  function _setAppletProp(prop, val, sr) {
    if (!sel || sel.dataset.type !== 'applet') return;
    const aid = sel.dataset.appletId;
    if (aid === 'periodic' && typeof setPeriodicProp === 'function') setPeriodicProp(prop, val, sr);
    else if (aid === 'flip' && typeof setFlipProp === 'function') setFlipProp(prop, val, sr);
    else if (typeof setGenProp === 'function') setGenProp(prop, val, sr);
  }

  function _slideData() {
    if (!sel || typeof slides === 'undefined' || !slides[cur]) return null;
    return slides[cur].els.find(e => e.id === sel.dataset.id) || null;
  }

  function _appletDispColor(d, colorKey, schemeKey, fallback) {
    let c = d && d[colorKey];
    if ((c === undefined || c === null || c === '') && d && d[schemeKey] && typeof _resolveSchemeColor === 'function') {
      const th = typeof _activeThemeForScheme === 'function' ? _activeThemeForScheme() : null;
      if (th) { const r = _resolveSchemeColor(d[schemeKey], th); if (r) c = r; }
    }
    return c || fallback || '';
  }

  function _getInkSel() {
    if (typeof getSelectedInkItems !== 'function') return null;
    const pack = getSelectedInkItems();
    const strokes = pack.strokes || [];
    const fills = pack.fills || [];
    if (!strokes.length && !fills.length) return null;
    return { strokes: strokes, fills: fills, item: strokes[0] || fills[0] };
  }

  function _getConn() {
    const id = typeof window._getSelConnId === 'function' ? window._getSelConnId() : null;
    if (!id || typeof slides === 'undefined' || !slides[cur]) return null;
    return (slides[cur].connectors || []).find(c => c.id === id) || null;
  }

  function _notifyColorBarLayout() {
    if (typeof _refreshCanvasViewport === 'function') {
      requestAnimationFrame(function () { _refreshCanvasViewport(); });
    } else if (typeof _centerSlide === 'function') {
      _centerSlide();
    }
  }

  function _normHex(c) {
    if (!c || typeof c !== 'string') return '';
    c = c.trim().toLowerCase();
    if (!c || c === 'none' || c === 'transparent') return '';
    if (/^#[0-9a-f]{3}$/.test(c)) {
      return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    }
    if (/^#[0-9a-f]{6}$/.test(c)) return c;
    if (typeof _rgbToHex === 'function') {
      const h = _rgbToHex(c);
      if (h) return h.toLowerCase();
    }
    return c;
  }

  function _resolveColor(raw, scheme) {
    let color = raw || '';
    const th = typeof _activeThemeForScheme === 'function' ? _activeThemeForScheme() : null;
    if (scheme && th && typeof _resolveSchemeColor === 'function') {
      const r = _resolveSchemeColor(scheme, th);
      if (r) color = r;
    }
    return { color: color, schemeRef: scheme || null };
  }

  function _getCurrentColorInfo() {
    const conn = _getConn();
    if (conn) {
      return _resolveColor(
        (conn.color && conn.color !== 'none' && conn.color !== 'transparent') ? conn.color : '',
        conn.colorScheme
      );
    }
    const ink = _getInkSel();
    if (ink && !sel) {
      const item = ink.item;
      return _resolveColor((item && item.color) || '#64748b', item && item.colorScheme);
    }
    if (_isSlideBgMode()) return _getSlideBgColorInfo();
    if (!sel) return { color: '', schemeRef: null };
    const d = _slideData();
    const t = sel.dataset.type;

    if (_mode === 'bg') {
      if (t === 'text' || t === 'markdown') {
        return _resolveColor(sel.dataset.textBg || '', d && d.textBgScheme);
      }
      if (t === 'applet') {
        const fb = (typeof _appletTheme === 'function') ? ((_appletTheme().ac1) || '#6366f1') : '#6366f1';
        return { color: _appletDispColor(d, 'genBg', 'genBgScheme', fb), schemeRef: d && d.genBgScheme };
      }
      return _resolveColor(sel.dataset.fill || '#3b82f6', d && d.fillScheme);
    }

    if (_mode === 'stroke') {
      if (t === 'text' || t === 'markdown') {
        return _resolveColor(sel.dataset.textBorderColor || '#ffffff', d && d.borderScheme);
      }
      if (t === 'applet') {
        return { color: _appletDispColor(d, 'genBorderColor', 'genBorderScheme', '#ffffff'), schemeRef: d && d.genBorderScheme };
      }
      if (t === 'lineangle') {
        return _resolveColor((d && d.color) || '#64748b', d && d.colorScheme);
      }
      return _resolveColor(sel.dataset.stroke || '#1d4ed8', d && d.strokeScheme);
    }

    if (_mode === 'text') {
      if (t === 'text') {
        let color = '';
        const tel = sel.querySelector('.tel') || sel.querySelector('.ec');
        if (tel) {
          const st = tel.getAttribute('style') || '';
          const m = st.match(/(?:^|;|\s)color\s*:\s*([^;]+)/i);
          if (m) color = m[1].trim().replace(/['"]/g, '');
        }
        if (!color && d && d.cs) {
          const m2 = d.cs.match(/(?:^|;|\s)color\s*:\s*([^;]+)/i);
          if (m2) color = m2[1].trim().replace(/['"]/g, '');
        }
        return _resolveColor(color || '#ffffff', d && d.textColorScheme);
      }
      if (t === 'markdown') {
        return _resolveColor((d && d.mdColor) || '#ffffff', d && d.mdColorScheme);
      }
      if (t === 'formula') {
        const fb = (typeof document !== 'undefined' && document.documentElement.classList.contains('light')) ? '#000000' : '#ffffff';
        return _resolveColor((d && d.formulaColor) || fb, d && d.formulaColorScheme);
      }
      if (t === 'icon') {
        return _resolveColor((d && d.iconColor) || '#3b82f6', d && d.iconColorScheme);
      }
      if (t === 'lego') {
        const def = (typeof _defaultLegoColor === 'function') ? _defaultLegoColor() : { color: '#906cf9', schemeRef: null };
        return _resolveColor(sel.dataset.legoColor || def.color, d && d.legoColorScheme);
      }
      if (t === 'lineangle') {
        return _resolveColor((d && d.color) || '#64748b', d && d.colorScheme);
      }
      if (t === 'applet') {
        const fb = (typeof _appletTheme === 'function') ? ((_appletTheme().head || _appletTheme().ac1) || '#a5b4fc') : '#a5b4fc';
        return { color: _appletDispColor(d, 'genColor', 'genColorScheme', fb), schemeRef: d && d.genColorScheme };
      }
      const stCss = (d && d.shapeTextCss) || '';
      const m = stCss.match(/(?:^|;|\s)color\s*:\s*([^;]+)/i);
      const color = m ? m[1].trim().replace(/['"]/g, '') : '#ffffff';
      return _resolveColor(color, d && d.shapeTextColorScheme);
    }

    return { color: '', schemeRef: null };
  }

  function _applyBgColor(color, schemeRef) {
    if (_getConn()) return;
    _eachBarTarget(function (el) {
      const modes = _colorBarModesForEl(el);
      if (!modes || !modes.bg) return;
      const t = el.dataset.type;
      if (t === 'text') {
        if (typeof setTextBg === 'function') setTextBg(color, schemeRef);
      } else if (t === 'markdown') {
        if (typeof setMdBg === 'function') setMdBg(color, schemeRef);
      } else if (t === 'applet') {
        _setAppletProp('genBg', color, schemeRef);
      } else if (typeof updateShapeStyleScheme === 'function') {
        updateShapeStyleScheme('fill', color, schemeRef);
      }
    });
  }

  function _applyStrokeColor(color, schemeRef) {
    const conn = _getConn();
    if (conn) {
      if (typeof cpSetColor === 'function') cpSetColor(color, schemeRef);
      return;
    }
    _eachBarTarget(function (el) {
      const modes = _colorBarModesForEl(el);
      if (!modes || !modes.stroke) return;
      const t = el.dataset.type;
      if (t === 'text') {
        if (typeof setTextBorder === 'function') setTextBorder('color', color, schemeRef);
      } else if (t === 'markdown') {
        if (typeof setMdBorder === 'function') setMdBorder('color', color, schemeRef);
      } else if (t === 'applet') {
        _setAppletProp('genBorderColor', color, schemeRef);
      } else if (t === 'lineangle') {
        if (typeof setLineAngleColor === 'function') setLineAngleColor(color, schemeRef);
      } else if (typeof updateShapeStyleScheme === 'function') {
        updateShapeStyleScheme('stroke', color, schemeRef);
      }
    });
  }

  function _applyTextColor(color, schemeRef) {
    const conn = _getConn();
    if (conn) return;
    const ink = _getInkSel();
    if (ink && !sel) {
      if (typeof setDrawColor === 'function') setDrawColor(color, schemeRef);
      return;
    }
    _eachBarTarget(function (el) {
      const modes = _colorBarModesForEl(el);
      if (!modes || !modes.text) return;
      const t = el.dataset.type;
      if (t === 'text') {
        if (typeof applyTextColor === 'function') applyTextColor(color, schemeRef);
        else if (typeof onColorPick === 'function') onColorPick(color, 'text', schemeRef);
      } else if (t === 'markdown') {
        if (typeof updateMdColor === 'function') updateMdColor(color, schemeRef);
      } else if (t === 'formula') {
        if (typeof setFormulaColor === 'function') setFormulaColor(color, schemeRef);
      } else if (t === 'icon') {
        if (typeof updateIconStyleScheme === 'function') updateIconStyleScheme('color', color, schemeRef);
        else if (typeof updateIconStyle === 'function') updateIconStyle('color', color);
      } else if (t === 'lego') {
        if (typeof legoOnColorPick === 'function') legoOnColorPick(color, schemeRef);
      } else if (t === 'lineangle') {
        if (typeof setLineAngleColor === 'function') setLineAngleColor(color, schemeRef);
      } else if (t === 'applet') {
        _setAppletProp('genColor', color, schemeRef);
      } else if (typeof updateShapeTextColor === 'function') {
        updateShapeTextColor(color, schemeRef);
      }
    });
  }

  function _applyColor(color, schemeRef, e) {
    if (!_supportsBar()) return;
    if (_isSlideBgMode()) {
      if (_mode === 'bg' && typeof setSlideBgFromPalette === 'function') {
        setSlideBgFromPalette(color, schemeRef);
      }
      _highlightActiveSwatch();
      _syncFx();
      return;
    }
    if (e && e.shiftKey && _mode === 'bg') {
      _applyStrokeColor(color, schemeRef);
      _highlightActiveSwatch();
      _syncFx();
      return;
    }
    if (e && (e.ctrlKey || e.metaKey) && _mode === 'bg') {
      _applyTextColor(color, schemeRef);
      _highlightActiveSwatch();
      _syncFx();
      return;
    }
    if (_mode === 'bg') _applyBgColor(color, schemeRef);
    else if (_mode === 'stroke') _applyStrokeColor(color, schemeRef);
    else if (_mode === 'text') _applyTextColor(color, schemeRef);
    _highlightActiveSwatch();
    _syncFx();
  }

  function _clearColor() {
    if (!_supportsBar()) return;
    if (_isSlideBgMode()) {
      if (typeof resetSlideBgToTheme === 'function') resetSlideBgToTheme();
      _highlightActiveSwatch();
      _syncFx();
      return;
    }
    const conn = _getConn();
    if (conn) {
      if (typeof cpSetColor === 'function') cpSetColor('none', null);
      _highlightActiveSwatch();
      _syncFx();
      return;
    }
    _eachBarTarget(function (el) {
      const modes = _colorBarModesForEl(el);
      if (!modes) return;
      const t = el.dataset.type;
      if (_mode === 'bg') {
        if (!modes.bg) return;
        if (t === 'text' && typeof clearTextBgCol1 === 'function') clearTextBgCol1();
        else if (t === 'markdown' && typeof clearMdBg === 'function') clearMdBg();
        else if (t === 'applet') _setAppletProp('genBg', '', null);
        else if (t === 'shape' && typeof updateShapeStyleScheme === 'function') updateShapeStyleScheme('fill', 'none', null);
      } else if (_mode === 'stroke') {
        if (!modes.stroke) return;
        if (t === 'text' && typeof setTextBorder === 'function') setTextBorder('color', 'transparent', null);
        else if (t === 'markdown' && typeof setMdBorder === 'function') setMdBorder('color', 'transparent', null);
        else if (t === 'applet') _setAppletProp('genBorderColor', 'transparent', null);
        else if (typeof updateShapeStyleScheme === 'function') updateShapeStyleScheme('stroke', 'transparent', null);
      }
    });
    _highlightActiveSwatch();
    _syncFx();
  }

  function _applyFxOp(v) {
    _eachBarTarget(function (el) {
      if (!_elementHasFx(el)) return;
      const t = el.dataset.type;
      if (t === 'text' && typeof setTextBgOp === 'function') setTextBgOp(v);
      else if (t === 'markdown' && typeof setMdBgOp === 'function') setMdBgOp(v);
      else if (t === 'applet') _setAppletProp('genBgOp', v);
      else if (t === 'icon' && typeof updateIconStyle === 'function') updateIconStyle('op', v);
      else if (t === 'lego' || t === 'lineangle' || t === 'formula') {
        el.dataset.elOpacity = v;
        el.style.opacity = v;
        if (typeof save === 'function') save();
      } else if (t === 'shape' && typeof updateShapeStyle === 'function') updateShapeStyle('fillOp', v);
    });
  }

  function _applyFxBlur(v) {
    _eachBarTarget(function (el) {
      const t = el.dataset.type;
      if (t === 'text' && typeof setTextBgBlur === 'function') setTextBgBlur(v);
      else if (t === 'markdown' && typeof setMdBgBlur === 'function') setMdBgBlur(v);
      else if (t === 'applet') _setAppletProp('genBgBlur', v);
      else if (t === 'shape' && typeof setShapeElBlur === 'function') setShapeElBlur(v);
    });
  }

  function _applyFxSw(v) {
    _eachBarTarget(function (el) {
      const t = el.dataset.type;
      if (t === 'text' && typeof setTextBorder === 'function') setTextBorder('width', v);
      else if (t === 'markdown' && typeof setMdBorder === 'function') setMdBorder('width', v);
      else if (t === 'applet') _setAppletProp('genBorderWidth', v);
      else if (t === 'icon' && typeof updateIconStyle === 'function') updateIconStyle('sw', v);
      else if (t === 'shape' && typeof updateShapeStyle === 'function') updateShapeStyle('sw', v);
    });
  }

  function _buildPaletteGrid(container) {
    container.innerHTML = '';
    const schemeIdx = (typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0)
      ? appliedThemeIdx
      : ((typeof selTheme !== 'undefined' && selTheme >= 0) ? selTheme : -1);
    if (schemeIdx < 0 || typeof THEMES === 'undefined' || !THEMES[schemeIdx]) return;

    const t = THEMES[schemeIdx];
    const levels = (typeof SCHEME_TINT_LEVELS !== 'undefined' && SCHEME_TINT_LEVELS)
      ? SCHEME_TINT_LEVELS : [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const nCols = typeof _themeColors === 'function' ? _themeColors(t).length : 8;

    const grid = document.createElement('div');
    grid.className = 'color-bar-grid';

    const glowLayer = document.createElement('div');
    glowLayer.className = 'color-bar-glow-layer';
    glowLayer.setAttribute('aria-hidden', 'true');
    const glowSpot = document.createElement('div');
    glowSpot.className = 'color-bar-glow-spot';
    glowLayer.appendChild(glowSpot);
    grid.appendChild(glowLayer);

    function _showSwatchGlow(sw, color) {
      const gr = grid.getBoundingClientRect();
      const r = sw.getBoundingClientRect();
      glowSpot.style.left = (r.left - gr.left + r.width / 2) + 'px';
      glowSpot.style.top = (r.top - gr.top + r.height / 2) + 'px';
      glowSpot.style.setProperty('--swatch-glow-color', color);
      glowSpot.classList.add('on');
      grid.querySelectorAll('.color-bar-swatch.is-glow').forEach(function (el) {
        el.classList.remove('is-glow');
      });
      sw.classList.add('is-glow');
    }
    function _hideSwatchGlow() {
      glowSpot.classList.remove('on');
      grid.querySelectorAll('.color-bar-swatch.is-glow').forEach(function (el) {
        el.classList.remove('is-glow');
      });
    }
    grid.addEventListener('mouseleave', _hideSwatchGlow);

    // Order left→right, then next row: 11, 12, 13 … 19, 21, 22 …
    for (let colIdx = 0; colIdx < nCols; colIdx++) {
      for (let rowIdx = 0; rowIdx < levels.length; rowIdx++) {
        const color = typeof _schemeSwatchColor === 'function'
          ? _schemeSwatchColor(t, colIdx, rowIdx) : '#888';
        const pos = typeof _schemePosCode === 'function' ? _schemePosCode(colIdx, rowIdx) : '';
        const sw = document.createElement('button');
        sw.type = 'button';
        sw.className = 'color-bar-swatch';
        sw.style.background = color;
        sw.dataset.col = String(colIdx);
        sw.dataset.row = String(rowIdx);
        const hint = (typeof getLang === 'function' && getLang() === 'en')
          ? ' (Shift+click → stroke, Ctrl+click → text)'
          : ' (Shift+клик → обводка, Ctrl+клик → текст)';
        sw.title = (pos ? pos + ' · ' : '') + color + (colIdx === 0 && rowIdx === 0 ? hint : '');
        sw.addEventListener('mouseenter', function () { _showSwatchGlow(sw, color); });
        sw.onmousedown = function (ev) {
          ev.preventDefault();
          _applyColor(color, { col: colIdx, row: rowIdx }, ev);
        };
        grid.appendChild(sw);
      }
    }

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'color-bar-swatch color-bar-clear';
    clearBtn.title = (typeof getLang === 'function' && getLang() === 'en') ? 'Clear' : 'Убрать';
    clearBtn.innerHTML = '&#x2715;';
    clearBtn.onmousedown = function (ev) {
      ev.preventDefault();
      _clearColor();
    };
    grid.appendChild(clearBtn);

    container.appendChild(grid);
    _highlightActiveSwatch();
  }

  function _highlightActiveSwatch() {
    const pal = document.getElementById('color-bar-palette');
    if (!pal) return;
    const info = _supportsBar() ? _getCurrentColorInfo() : { color: '', schemeRef: null };
    const curHex = _normHex(info.color);
    const sr = info.schemeRef;
    pal.querySelectorAll('.color-bar-swatch:not(.color-bar-clear)').forEach(sw => {
      let on = false;
      if (sr && sr.col != null && sr.row != null) {
        on = (+sw.dataset.col === (+sr.col | 0)) && (+sw.dataset.row === (+sr.row | 0));
      } else if (curHex) {
        on = _normHex(sw.style.background) === curHex;
      }
      sw.classList.toggle('sel', on);
    });
  }

  function _syncModeButtons() {
    const modes = _colorBarModes();
    const conn = _getConn();
    const bgBtn = document.getElementById('color-bar-mode-bg');
    const strokeBtn = document.getElementById('color-bar-mode-stroke');
    const textBtn = document.getElementById('color-bar-mode-text');
    const active = _supportsBar();
    const slideBg = _isSlideBgMode();

    if (slideBg) _mode = 'bg';

    if (active && modes) {
      if (_mode === 'bg' && !modes.bg) _mode = modes.stroke ? 'stroke' : 'text';
      if (_mode === 'stroke' && !modes.stroke) _mode = modes.bg ? 'bg' : 'text';
      if (_mode === 'text' && !modes.text) _mode = modes.bg ? 'bg' : 'stroke';
    }

    if (bgBtn) {
      bgBtn.classList.toggle('is-hidden', !active || !modes || !modes.bg);
      bgBtn.classList.toggle('active', active && _mode === 'bg');
      bgBtn.title = (typeof getLang === 'function' && getLang() === 'en')
        ? (slideBg ? 'Slide background' : (sel && (sel.dataset.type === 'text' || sel.dataset.type === 'markdown') ? 'Background' : 'Fill'))
        : (slideBg ? 'Фон слайда' : (sel && (sel.dataset.type === 'text' || sel.dataset.type === 'markdown') ? 'Фон' : 'Заливка'));
    }
    if (strokeBtn) {
      strokeBtn.classList.toggle('is-hidden', !active || !modes || !modes.stroke);
      strokeBtn.classList.toggle('active', active && _mode === 'stroke');
      strokeBtn.title = (typeof getLang === 'function' && getLang() === 'en')
        ? (conn ? 'Line color' : 'Border')
        : (conn ? 'Цвет линии' : 'Обводка');
    }
    if (textBtn) {
      textBtn.classList.toggle('is-hidden', !active || !modes || !modes.text);
      textBtn.classList.toggle('active', active && _mode === 'text');
      const onlyColor = modes && !modes.bg && !modes.stroke && modes.text;
      textBtn.title = (typeof getLang === 'function' && getLang() === 'en')
        ? (onlyColor ? 'Color' : 'Text color')
        : (onlyColor ? 'Цвет' : 'Цвет текста');
    }
  }

  function _fmtOp(v) {
    const n = +v;
    if (!isFinite(n)) return '0';
    return String(Math.round(n * 100) / 100);
  }

  function _updateGslider(input, fillEl, valEl, min, max, format) {
    if (!input || !fillEl) return;
    const v = Math.max(min, Math.min(max, +input.value));
    const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
    if (fillEl.tagName === 'rect') {
      const outer = fillEl.closest('.color-bar-gslider-outer, .app-gslider-outer');
      const w = outer ? Math.max(48, Math.round(outer.clientWidth) || 100) : 100;
      fillEl.setAttribute('width', String((pct / 100) * w));
    } else fillEl.style.width = pct + '%';
    if (valEl) valEl.textContent = format ? format(v) : String(v);
  }

  function _valueFromTrackX(clientX, track, min, max, step) {
    const rect = track.getBoundingClientRect();
    const w = Math.max(40, rect.width);
    let ratio = (clientX - rect.left) / w;
    ratio = Math.max(0, Math.min(1, ratio));
    let v = min + ratio * (max - min);
    if (step && step < 1) v = Math.round(v / step) * step;
    else if (step && step >= 1) v = Math.round(v / step) * step;
    return v;
  }

  function _bindGslider(input, fillEl, valEl, opts) {
    if (!input) return;
    const min = opts.min != null ? opts.min : 0;
    const max = opts.max != null ? opts.max : 1;
    const format = opts.format || null;
    const onInput = opts.onInput || function () {};

    function apply(v) {
      v = Math.max(min, Math.min(max, v));
      input.value = v;
      _updateGslider(input, fillEl, valEl, min, max, format);
      onInput(v);
    }

    input.addEventListener('input', function () { apply(+this.value); });

    if (valEl) {
      var _valDrag = null;

      function _startValEdit() {
        if (!valEl.closest('#color-bar') || valEl.closest('#color-bar').classList.contains('color-bar-idle')) return;
        const track = valEl.closest('.color-bar-gslider-outer');
        if (!track || track.querySelector('.color-bar-gslider-edit')) return;
        const edit = document.createElement('input');
        edit.type = 'text';
        edit.className = 'color-bar-gslider-edit';
        edit.value = valEl.textContent;
        edit.style.left = valEl.offsetLeft + 'px';
        edit.style.width = Math.max(20, valEl.offsetWidth) + 'px';
        valEl.classList.add('is-editing');
        valEl.style.color = 'transparent';
        track.appendChild(edit);
        edit.focus();
        edit.select();
        function done(commit) {
          if (commit) {
            const raw = edit.value.replace(',', '.').trim();
            const v = parseFloat(raw);
            if (isFinite(v)) apply(v);
          }
          edit.remove();
          valEl.classList.remove('is-editing');
          valEl.style.color = '';
        }
        edit.addEventListener('blur', function () { done(true); });
        edit.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') { ev.preventDefault(); edit.blur(); }
          if (ev.key === 'Escape') { ev.preventDefault(); done(false); }
        });
      }

      valEl.addEventListener('pointerdown', function (e) {
        if (!valEl.closest('#color-bar') || valEl.closest('#color-bar').classList.contains('color-bar-idle')) return;
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        _valDrag = {
          id: e.pointerId,
          x0: e.clientX,
          v0: +input.value,
          scrubbing: false
        };
        try { valEl.setPointerCapture(e.pointerId); } catch (err) {}
      });

      valEl.addEventListener('pointermove', function (e) {
        if (!_valDrag || e.pointerId !== _valDrag.id) return;
        const dx = e.clientX - _valDrag.x0;
        if (!_valDrag.scrubbing && Math.abs(dx) > 5) {
          _valDrag.scrubbing = true;
          valEl.classList.add('is-scrubbing');
        }
        if (_valDrag.scrubbing) {
          const track = valEl.closest('.color-bar-gslider-outer');
          if (!track) return;
          apply(_valueFromTrackX(e.clientX, track, min, max, opts.step));
        }
      });

      function _endValDrag(e) {
        if (!_valDrag || e.pointerId !== _valDrag.id) return;
        const wasScrub = _valDrag.scrubbing;
        _valDrag = null;
        valEl.classList.remove('is-scrubbing');
        try { valEl.releasePointerCapture(e.pointerId); } catch (err) {}
        if (!wasScrub) _startValEdit();
      }

      valEl.addEventListener('pointerup', _endValDrag);
      valEl.addEventListener('pointercancel', function (e) {
        if (!_valDrag || e.pointerId !== _valDrag.id) return;
        _valDrag = null;
        valEl.classList.remove('is-scrubbing');
      });
    }

    apply(+input.value);
    return apply;
  }

  const FX_PROP_IDS = new Set([
    'p-bg-op', 'p-bg-blur', 'p-border-w',
    'md-bg-op', 'md-bg-blur', 'md-border-w',
    'sh-fill-op', 'sh-el-blur', 'sh-sw',
    'gen-bg-op', 'gen-bg-blur', 'gen-border-w',
    'pte-bg-op', 'pte-bg-blur',
    'flip-bg-op',
    'ic-p-op', 'ic-p-sw',
    'cp-opacity', 'cp-sw'
  ]);

  function _setPropInput(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    const next = String(val);
    if (el.value === next) return;
    const a = parseFloat(el.value), b = parseFloat(val);
    if (!isNaN(a) && !isNaN(b) && a === b) return;
    el.value = val;
    if (typeof refreshNumScrubber === 'function') refreshNumScrubber(el);
  }

  function _appletFxInputIds() {
    if (!sel || sel.dataset.type !== 'applet') return null;
    const aid = sel.dataset.appletId;
    if (aid === 'periodic') return { op: 'pte-bg-op', blur: 'pte-bg-blur', sw: null };
    if (aid === 'flip') return { op: 'flip-bg-op', blur: null, sw: null };
    return { op: 'gen-bg-op', blur: 'gen-bg-blur', sw: 'gen-border-w' };
  }

  function _syncPropsPanelFx() {
    const conn = _getConn();
    const ink = _getInkSel();
    if (conn) {
      _setPropInput('cp-opacity', Math.round((conn.opacity != null ? conn.opacity : 1) * 100));
      _setPropInput('cp-sw', conn.sw != null ? conn.sw : 2);
      return;
    }
    if (ink && !sel) return;
    if (!sel) return;

    const t = sel.dataset.type;
    if (t === 'text') {
      _setPropInput('p-bg-op', sel.dataset.textBgOp != null ? sel.dataset.textBgOp : 1);
      _setPropInput('p-bg-blur', sel.dataset.textBgBlur || 0);
      _setPropInput('p-border-w', sel.dataset.textBorderW != null ? sel.dataset.textBorderW : 0);
    } else if (t === 'markdown') {
      _setPropInput('md-bg-op', sel.dataset.textBgOp != null ? sel.dataset.textBgOp : 1);
      _setPropInput('md-bg-blur', sel.dataset.textBgBlur || 0);
      _setPropInput('md-border-w', sel.dataset.textBorderW != null ? sel.dataset.textBorderW : 0);
    } else if (t === 'applet') {
      const d = _slideData();
      const ids = _appletFxInputIds();
      const op = (d && d.genBgOp != null) ? d.genBgOp : (sel.dataset.genBgOp != null ? sel.dataset.genBgOp : 1);
      const blur = (d && d.genBgBlur != null) ? d.genBgBlur : (sel.dataset.genBgBlur || 0);
      const sw = (d && d.genBorderWidth != null) ? d.genBorderWidth : (sel.dataset.genBorderWidth || 0);
      if (ids) {
        if (ids.op) _setPropInput(ids.op, op);
        if (ids.blur) _setPropInput(ids.blur, blur);
        if (ids.sw) _setPropInput(ids.sw, sw);
      }
    } else if (t === 'icon') {
      const d = _slideData();
      _setPropInput('ic-p-op', (d && d.elOpacity != null) ? d.elOpacity : (sel.dataset.elOpacity != null ? sel.dataset.elOpacity : 1));
      _setPropInput('ic-p-sw', (d && d.iconSw != null) ? d.iconSw : (sel.dataset.iconSw != null ? sel.dataset.iconSw : 1.8));
    } else if (t === 'shape') {
      _setPropInput('sh-fill-op', sel.dataset.fillOp != null ? sel.dataset.fillOp : 1);
      _setPropInput('sh-el-blur', sel.dataset.shapeBlur || 0);
      _setPropInput('sh-sw', sel.dataset.sw != null ? sel.dataset.sw : 2);
    }
  }

  function _syncFx() {
    const fx = document.getElementById('color-bar-fx');
    const opIn = document.getElementById('color-bar-op');
    const blurIn = document.getElementById('color-bar-blur');
    const swIn = document.getElementById('color-bar-sw');
    const opVal = document.getElementById('color-bar-op-val');
    const blurVal = document.getElementById('color-bar-blur-val');
    const swVal = document.getElementById('color-bar-sw-val');
    const opFill = document.getElementById('color-bar-op-fill');
    const blurFill = document.getElementById('color-bar-blur-fill');
    const swFill = document.getElementById('color-bar-sw-fill');
    if (!fx) return;

    const active = _supportsBar();
    const barVisible = _isDesktop() && !document.body.classList.contains('preview-mode');
    const slideBg = _isSlideBgMode();
    const slideBgImg = slideBg && slides[cur] && slides[cur].bgImg;
    fx.style.display = barVisible ? 'block' : 'none';
    fx.classList.toggle('color-bar-fx--slide-noimg', !!(slideBg && !slideBgImg));
    if (!active) return;

    const swWrap = document.querySelector('#color-bar-fx .color-bar-gslider-wrap--row2');
    if (swWrap) swWrap.classList.toggle('is-hidden', !!slideBg);

    const conn = _getConn();
    const ink = _getInkSel();
    if (conn) {
      if (opIn) opIn.value = conn.opacity != null ? conn.opacity : 1;
      if (blurIn) blurIn.value = 0;
      if (swIn) swIn.value = conn.sw != null ? conn.sw : 2;
    } else if (ink && !sel) {
      const s = ink.strokes[0];
      const f = ink.fills[0];
      const src = s || f;
      if (opIn) opIn.value = (src && src.opacity != null) ? src.opacity : 1;
      if (blurIn) blurIn.value = 0;
      if (swIn) swIn.value = s ? (+s.width || 6) : 0;
    } else if (slideBg) {
      const bg = slides[cur].bgImg;
      const norm = bg && typeof _normalizeBgImg === 'function' ? _normalizeBgImg(bg) : bg;
      if (opIn) opIn.value = norm ? (norm.opacity != null ? norm.opacity : 1) : 1;
      if (blurIn) blurIn.value = norm ? (norm.blur != null ? norm.blur : 0) : 0;
      if (swIn) swIn.value = 0;
    } else if (sel) {
      const t = sel.dataset.type;
      if (t === 'text' || t === 'markdown') {
        if (opIn) opIn.value = sel.dataset.textBgOp != null ? sel.dataset.textBgOp : 1;
        if (blurIn) blurIn.value = sel.dataset.textBgBlur || 0;
        if (swIn) swIn.value = sel.dataset.textBorderW != null ? sel.dataset.textBorderW : 0;
      } else if (t === 'applet') {
        const d = _slideData();
        if (opIn) opIn.value = (d && d.genBgOp != null) ? d.genBgOp : (sel.dataset.genBgOp != null ? sel.dataset.genBgOp : 1);
        if (blurIn) blurIn.value = (d && d.genBgBlur != null) ? d.genBgBlur : (sel.dataset.genBgBlur || 0);
        if (swIn) swIn.value = (d && d.genBorderWidth != null) ? d.genBorderWidth : (sel.dataset.genBorderWidth || 0);
      } else if (t === 'icon') {
        const d = _slideData();
        if (opIn) opIn.value = (d && d.elOpacity != null) ? d.elOpacity : (sel.dataset.elOpacity != null ? sel.dataset.elOpacity : 1);
        if (blurIn) blurIn.value = 0;
        if (swIn) swIn.value = (d && d.iconSw != null) ? d.iconSw : (sel.dataset.iconSw != null ? sel.dataset.iconSw : 1.8);
      } else if (t === 'lego' || t === 'lineangle' || t === 'formula') {
        if (opIn) opIn.value = sel.dataset.elOpacity != null ? sel.dataset.elOpacity : (sel.style.opacity || 1);
        if (blurIn) blurIn.value = 0;
        if (swIn) swIn.value = 0;
      } else {
        if (opIn) opIn.value = sel.dataset.fillOp != null ? sel.dataset.fillOp : 1;
        if (blurIn) blurIn.value = sel.dataset.shapeBlur || 0;
        if (swIn) swIn.value = sel.dataset.sw != null ? sel.dataset.sw : 2;
      }
    }

    _updateGslider(opIn, opFill, opVal, 0, 1, _fmtOp);
    _updateGslider(blurIn, blurFill, blurVal, 0, 40, function (v) { return String(Math.round(v)); });
    _updateGslider(swIn, swFill, swVal, 0, 24, function (v) {
      return String(Math.round(v * 10) / 10);
    });
  }

  function _isReactColorBarEmbed() {
    return document.documentElement.classList.contains('slides-react-embed-react-color-bar');
  }

  function syncColorBar() {
    const bar = document.getElementById('color-bar');
    if (!bar) return;

    const nowVisible = _isDesktop()
      && !document.body.classList.contains('preview-mode')
      && window.isColorBarEnabled();
    if (!nowVisible) {
      bar.style.display = 'none';
      if (_barWasVisible) {
        _barWasVisible = false;
        _notifyColorBarLayout();
      }
      return;
    }

    const reactHost = _isReactColorBarEmbed();
    if (reactHost) bar.style.display = 'none';
    else bar.style.display = 'flex';

    bar.classList.toggle('color-bar-idle', !_supportsBar());
    if (!_barWasVisible) {
      _barWasVisible = true;
      _notifyColorBarLayout();
    }

    _syncModeButtons();

    if (!reactHost) {
      const pal = document.getElementById('color-bar-palette');
      if (pal && !pal.dataset.built) {
        _buildPaletteGrid(pal);
        pal.dataset.built = '1';
      }
      _highlightActiveSwatch();
    }

    _syncFx();
    if (!reactHost) _highlightActiveSwatch();
  }

  function refreshColorBarPalette() {
    const pal = document.getElementById('color-bar-palette');
    if (pal) {
      delete pal.dataset.built;
      if (_isDesktop() && !document.body.classList.contains('preview-mode') && window.isColorBarEnabled()) {
        _buildPaletteGrid(pal);
        pal.dataset.built = '1';
      }
    }
    syncColorBar();
  }

  window.syncColorBar = syncColorBar;
  window.syncColorBarFx = function () { _syncFx(); };
  window.refreshColorBarPalette = refreshColorBarPalette;

  function _bindUi() {
    document.querySelectorAll('.color-bar-mode').forEach(btn => {
      btn.addEventListener('click', function () {
        _mode = this.dataset.mode || 'bg';
        syncColorBar();
      });
    });

    _bindGslider(
      document.getElementById('color-bar-op'),
      document.getElementById('color-bar-op-fill'),
      document.getElementById('color-bar-op-val'),
      {
        min: 0, max: 1, step: 0.05, format: _fmtOp,
        onInput: function (v) {
          if (!_supportsBar()) return;
          const conn = _getConn();
          if (conn) {
            conn.opacity = v;
            const cpOp = document.getElementById('cp-opacity');
            if (cpOp) cpOp.value = Math.round(v * 100);
            if (typeof cpUpdate === 'function') cpUpdate();
            _syncPropsPanelFx();
            return;
          }
          const ink = _getInkSel();
          if (ink && !sel) {
            if (typeof setSelectedInkOpacity === 'function') setSelectedInkOpacity(Math.round(v * 100));
            return;
          }
          if (_isSlideBgMode()) {
            if (typeof setSlideBgOpacity === 'function') setSlideBgOpacity(Math.round(v * 100));
            return;
          }
          if (!_barTargets().length) return;
          _applyFxOp(v);
          _syncPropsPanelFx();
        }
      }
    );

    _bindGslider(
      document.getElementById('color-bar-blur'),
      document.getElementById('color-bar-blur-fill'),
      document.getElementById('color-bar-blur-val'),
      {
        min: 0, max: 40, step: 1,
        format: function (v) { return String(Math.round(v)); },
        onInput: function (v) {
          if (!_supportsBar()) return;
          if (_getInkSel() && !sel) return;
          if (_getConn()) return;
          if (_isSlideBgMode()) {
            if (typeof setSlideBgBlur === 'function') setSlideBgBlur(v);
            return;
          }
          if (!_barTargets().length) return;
          _applyFxBlur(v);
          _syncPropsPanelFx();
        }
      }
    );

    _bindGslider(
      document.getElementById('color-bar-sw'),
      document.getElementById('color-bar-sw-fill'),
      document.getElementById('color-bar-sw-val'),
      {
        min: 0, max: 24, step: 0.5,
        format: function (v) { return String(Math.round(v * 10) / 10); },
        onInput: function (v) {
          if (!_supportsBar()) return;
          const conn = _getConn();
          if (conn) {
            conn.sw = v;
            const cpSw = document.getElementById('cp-sw');
            if (cpSw) cpSw.value = v;
            if (typeof cpUpdate === 'function') cpUpdate();
            _syncPropsPanelFx();
            return;
          }
          const ink = _getInkSel();
          if (ink && !sel && ink.strokes.length) {
            if (typeof pushUndo === 'function') pushUndo();
            ink.strokes.forEach(function (s) { s.width = v; });
            if (typeof redrawInk === 'function') redrawInk();
            if (typeof drawThumbs === 'function') drawThumbs();
            if (typeof saveState === 'function') saveState();
            return;
          }
          if (!_barTargets().length) return;
          _applyFxSw(v);
          _syncPropsPanelFx();
        }
      }
    );

    document.addEventListener('input', function (e) {
      if (!e.target || !e.target.id || !FX_PROP_IDS.has(e.target.id)) return;
      _syncFx();
    });

    window.addEventListener('resize', function () {
      syncColorBar();
      if (typeof syncAllGsliders === 'function') syncAllGsliders();
      if (typeof _desktopColorBarActive === 'function' && _desktopColorBarActive()) {
        _notifyColorBarLayout();
      }
    });

    syncColorBar();
    _notifyColorBarLayout();
    if (typeof window._syncColorBarVisibility === 'function') {
      document.body.classList.toggle('color-bar-off', !window.isColorBarEnabled());
    }
  }

  function _schemeGridMeta() {
    const schemeIdx = (typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0)
      ? appliedThemeIdx
      : ((typeof selTheme !== 'undefined' && selTheme >= 0) ? selTheme : -1);
    if (schemeIdx < 0 || typeof THEMES === 'undefined' || !THEMES[schemeIdx]) return null;
    const t = THEMES[schemeIdx];
    const levels = (typeof SCHEME_TINT_LEVELS !== 'undefined' && SCHEME_TINT_LEVELS)
      ? SCHEME_TINT_LEVELS : [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const nCols = typeof _themeColors === 'function' ? _themeColors(t).length : 8;
    return { schemeIdx, t, levels, nCols };
  }

  function _buildSwatchList() {
    const meta = _schemeGridMeta();
    if (!meta) return { cols: 0, rows: 0, swatches: [] };
    const info = _supportsBar() ? _getCurrentColorInfo() : { color: '', schemeRef: null };
    const curHex = _normHex(info.color);
    const sr = info.schemeRef;
    const swatches = [];
    for (let colIdx = 0; colIdx < meta.nCols; colIdx++) {
      for (let rowIdx = 0; rowIdx < meta.levels.length; rowIdx++) {
        const color = typeof _schemeSwatchColor === 'function'
          ? _schemeSwatchColor(meta.t, colIdx, rowIdx) : '#888';
        let active = false;
        if (sr && sr.col != null && sr.row != null) {
          active = (+colIdx === (+sr.col | 0)) && (+rowIdx === (+sr.row | 0));
        } else if (curHex) {
          active = _normHex(color) === curHex;
        }
        swatches.push({ col: colIdx, row: rowIdx, color, active });
      }
    }
    return { cols: meta.nCols, rows: meta.levels.length, swatches };
  }

  function _readFxValues() {
    const conn = _getConn();
    const ink = _getInkSel();
    const slideBg = _isSlideBgMode();
    let opacity = 1;
    let blur = 0;
    let strokeWidth = 0;
    if (conn) {
      opacity = conn.opacity != null ? conn.opacity : 1;
      blur = 0;
      strokeWidth = conn.sw != null ? conn.sw : 2;
    } else if (ink && !sel) {
      const s = ink.strokes[0];
      const f = ink.fills[0];
      const src = s || f;
      opacity = (src && src.opacity != null) ? src.opacity : 1;
      blur = 0;
      strokeWidth = s ? (+s.width || 6) : 0;
    } else if (slideBg) {
      const bg = slides[cur].bgImg;
      const norm = bg && typeof _normalizeBgImg === 'function' ? _normalizeBgImg(bg) : bg;
      opacity = norm ? (norm.opacity != null ? norm.opacity : 1) : 1;
      blur = norm ? (norm.blur != null ? norm.blur : 0) : 0;
      strokeWidth = 0;
    } else if (sel) {
      const t = sel.dataset.type;
      if (t === 'text' || t === 'markdown') {
        opacity = sel.dataset.textBgOp != null ? sel.dataset.textBgOp : 1;
        blur = sel.dataset.textBgBlur || 0;
        strokeWidth = sel.dataset.textBorderW != null ? sel.dataset.textBorderW : 0;
      } else if (t === 'applet') {
        const d = _slideData();
        opacity = (d && d.genBgOp != null) ? d.genBgOp : (sel.dataset.genBgOp != null ? sel.dataset.genBgOp : 1);
        blur = (d && d.genBgBlur != null) ? d.genBgBlur : (sel.dataset.genBgBlur || 0);
        strokeWidth = (d && d.genBorderWidth != null) ? d.genBorderWidth : (sel.dataset.genBorderWidth || 0);
      } else if (t === 'icon') {
        const d = _slideData();
        opacity = (d && d.elOpacity != null) ? d.elOpacity : (sel.dataset.elOpacity != null ? sel.dataset.elOpacity : 1);
        blur = 0;
        strokeWidth = (d && d.iconSw != null) ? d.iconSw : (sel.dataset.iconSw != null ? sel.dataset.iconSw : 1.8);
      } else if (t === 'lego' || t === 'lineangle' || t === 'formula') {
        opacity = sel.dataset.elOpacity != null ? sel.dataset.elOpacity : (sel.style.opacity || 1);
        blur = 0;
        strokeWidth = 0;
      } else {
        opacity = sel.dataset.fillOp != null ? sel.dataset.fillOp : 1;
        blur = sel.dataset.shapeBlur || 0;
        strokeWidth = sel.dataset.sw != null ? sel.dataset.sw : 2;
      }
    }
    return { opacity: +opacity, blur: +blur, strokeWidth: +strokeWidth };
  }

  function _invokeOpacityInput(v) {
    if (!_supportsBar()) return;
    const conn = _getConn();
    if (conn) {
      conn.opacity = v;
      const cpOp = document.getElementById('cp-opacity');
      if (cpOp) cpOp.value = Math.round(v * 100);
      if (typeof cpUpdate === 'function') cpUpdate();
      _syncPropsPanelFx();
      return;
    }
    const ink = _getInkSel();
    if (ink && !sel) {
      if (typeof setSelectedInkOpacity === 'function') setSelectedInkOpacity(Math.round(v * 100));
      return;
    }
    if (_isSlideBgMode()) {
      if (typeof setSlideBgOpacity === 'function') setSlideBgOpacity(Math.round(v * 100));
      return;
    }
    if (!_barTargets().length) return;
    _applyFxOp(v);
    _syncPropsPanelFx();
  }

  function _invokeBlurInput(v) {
    if (!_supportsBar()) return;
    if (_getInkSel() && !sel) return;
    if (_getConn()) return;
    if (_isSlideBgMode()) {
      if (typeof setSlideBgBlur === 'function') setSlideBgBlur(v);
      return;
    }
    if (!_barTargets().length) return;
    _applyFxBlur(v);
    _syncPropsPanelFx();
  }

  function _invokeStrokeWidthInput(v) {
    if (!_supportsBar()) return;
    const conn = _getConn();
    if (conn) {
      conn.sw = v;
      const cpSw = document.getElementById('cp-sw');
      if (cpSw) cpSw.value = v;
      if (typeof cpUpdate === 'function') cpUpdate();
      _syncPropsPanelFx();
      return;
    }
    const ink = _getInkSel();
    if (ink && !sel && ink.strokes.length) {
      if (typeof pushUndo === 'function') pushUndo();
      ink.strokes.forEach(function (s) { s.width = v; });
      if (typeof redrawInk === 'function') redrawInk();
      if (typeof drawThumbs === 'function') drawThumbs();
      if (typeof saveState === 'function') saveState();
      return;
    }
    if (!_barTargets().length) return;
    _applyFxSw(v);
    _syncPropsPanelFx();
  }

  function _modeTitles() {
    const modes = _colorBarModes();
    const conn = _getConn();
    const slideBg = _isSlideBgMode();
    const en = typeof getLang === 'function' && getLang() === 'en';
    const bgTitle = en
      ? (slideBg ? 'Slide background' : (sel && (sel.dataset.type === 'text' || sel.dataset.type === 'markdown') ? 'Background' : 'Fill'))
      : (slideBg ? 'Фон слайда' : (sel && (sel.dataset.type === 'text' || sel.dataset.type === 'markdown') ? 'Фон' : 'Заливка'));
    const strokeTitle = en ? (conn ? 'Line color' : 'Border') : (conn ? 'Цвет линии' : 'Обводка');
    const onlyColor = modes && !modes.bg && !modes.stroke && modes.text;
    const textTitle = en ? (onlyColor ? 'Color' : 'Text color') : (onlyColor ? 'Цвет' : 'Цвет текста');
    return { bg: bgTitle, stroke: strokeTitle, text: textTitle };
  }

  window.__slidesColorBarApi = {
    getState: function () {
      const modes = _colorBarModes();
      const slideBg = _isSlideBgMode();
      const info = _supportsBar() ? _getCurrentColorInfo() : { color: '', schemeRef: null };
      const fx = _readFxValues();
      const grid = _buildSwatchList();
      const meta = _schemeGridMeta();
      const visible = _isDesktop()
        && !document.body.classList.contains('preview-mode')
        && window.isColorBarEnabled();
      const titles = _modeTitles();
      return {
        visible,
        enabled: window.isColorBarEnabled(),
        mode: _mode,
        modes: slideBg ? { bg: true, stroke: false, text: false } : modes,
        supportsBar: _supportsBar(),
        isSlideBg: slideBg,
        idle: !_supportsBar(),
        currentColor: info.color || '',
        schemeRef: info.schemeRef || null,
        opacity: fx.opacity,
        blur: fx.blur,
        strokeWidth: fx.strokeWidth,
        showStrokeWidth: !slideBg,
        slideBgNoImg: !!(slideBg && !(slides[cur] && slides[cur].bgImg)),
        grid,
        themeIdx: meta ? meta.schemeIdx : -1,
        titles,
      };
    },
    setMode: function (m) {
      _mode = m || 'bg';
      syncColorBar();
    },
    applyColor: function (color, schemeRef, modifiers) {
      const mod = modifiers || {};
      const ev = {
        shiftKey: !!mod.shift,
        ctrlKey: !!mod.ctrl,
        metaKey: !!mod.ctrl,
      };
      _applyColor(color, schemeRef, ev);
    },
    clearColor: function () {
      _clearColor();
    },
    setOpacity: function (v) {
      _invokeOpacityInput(+v);
      syncColorBar();
    },
    setBlur: function (v) {
      _invokeBlurInput(+v);
      syncColorBar();
    },
    setStrokeWidth: function (v) {
      _invokeStrokeWidthInput(+v);
      syncColorBar();
    },
    sync: syncColorBar,
  };

  const _origSyncProps = window.syncProps;
  if (typeof _origSyncProps === 'function') {
    window.syncProps = function () {
      _origSyncProps.apply(this, arguments);
      syncColorBar();
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bindUi);
  } else {
    _bindUi();
  }
})();
