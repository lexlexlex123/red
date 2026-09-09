/* React host embed bridge — loaded only when legacy.html?embed=1 */
(function () {
  'use strict';

  if (window.__SLIDES_REACT_EMBED_BRIDGE__) return;
  window.__SLIDES_REACT_EMBED_BRIDGE__ = true;

  function isEmbed() {
    try {
      return new URLSearchParams(location.search).get('embed') === '1';
    } catch (e) {
      return false;
    }
  }

  if (!isEmbed()) return;

  document.documentElement.classList.add('slides-react-embed');
  window.__SLIDES_REACT_EMBED__ = true;
  document.documentElement.classList.add('slides-react-embed-react-props');
  document.documentElement.classList.add('slides-react-embed-react-color-bar');

  function post(type, payload) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ source: 'slides-legacy', type: type, payload: payload }, '*');
      }
    } catch (e) {}
  }

  // Immediate handshake so parent can leave the 55% splash while modules load
  post('bridgeAlive', { ok: true, bootDone: false });
  post('progress', { pct: 52, msg: 'Подключение к редактору…' });

  function collectColorBarState() {
    try {
      if (window.__slidesColorBarApi && window.__slidesColorBarApi.getState) {
        return window.__slidesColorBarApi.getState();
      }
    } catch (e) {}
    return null;
  }

  function collectDrawingState() {
    try {
      if (window.__slidesDrawingApi && window.__slidesDrawingApi.getState) {
        return window.__slidesDrawingApi.getState();
      }
    } catch (e) {}
    return null;
  }

  function collectState() {
    var titleEl = document.getElementById('pres-title');
    var selId = null;
    try {
      if (typeof sel !== 'undefined' && sel && sel.dataset) selId = sel.dataset.id || null;
    } catch (e) {}
    var multi = [];
    try {
      if (typeof multiSel !== 'undefined' && multiSel && multiSel.forEach) {
        multiSel.forEach(function (el) {
          if (el && el.dataset && el.dataset.id) multi.push(el.dataset.id);
        });
      }
    } catch (e) {}
    var undoLen = 0;
    var redoLen = 0;
    try {
      if (typeof undoStack !== 'undefined') undoLen = undoStack.length;
      if (typeof redoStack !== 'undefined') redoLen = redoStack.length;
    } catch (e) {}
    return {
      slides: typeof slides !== 'undefined' ? slides : [],
      cur: typeof cur !== 'undefined' ? cur : 0,
      canvasW: typeof canvasW !== 'undefined' ? canvasW : 1200,
      canvasH: typeof canvasH !== 'undefined' ? canvasH : 675,
      ar: typeof ar !== 'undefined' ? ar : '16:9',
      appliedThemeIdx: typeof appliedThemeIdx !== 'undefined' ? appliedThemeIdx : -1,
      title: titleEl ? titleEl.value : '',
      selId: selId,
      multiSel: multi,
      undoLen: undoLen,
      redoLen: redoLen,
      colorBar: collectColorBarState(),
      drawing: collectDrawingState(),
    };
  }

  function collectThumbs(indices) {
    var out = {};
    if (typeof slides === 'undefined' || typeof renderThumbCanvas !== 'function') return out;
    var list = Array.isArray(indices) ? indices : [];
    if (!list.length) return out;
    var TW = 128;
    var TH =
      typeof canvasW === 'number' && typeof canvasH === 'number'
        ? Math.round(TW * canvasH / canvasW)
        : 72;
    list.forEach(function (i) {
      i = i | 0;
      var s = slides[i];
      if (!s) return;
      var off = document.createElement('canvas');
      try {
        renderThumbCanvas(off, s, i, TW, TH);
        out[i] = off.toDataURL('image/jpeg', 0.82);
      } catch (e) {}
    });
    return out;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (!src) return reject(new Error('no src'));
      var abs = src;
      try {
        abs = new URL(src, location.href).href;
      } catch (e) {}
      if (document.querySelector('script[data-embed-src="' + abs + '"]')) {
        resolve(true);
        return;
      }
      var s = document.createElement('script');
      s.src = abs;
      s.async = true;
      s.dataset.embedSrc = abs;
      s.onload = function () {
        resolve(true);
      };
      s.onerror = function () {
        reject(new Error('load failed: ' + abs));
      };
      document.head.appendChild(s);
    });
  }

  function callFn(name, args) {
    args = args || [];
    try {
      if (name === 'setPresTitle') {
        var te = document.getElementById('pres-title');
        if (te) {
          te.value = args[0] || '';
          te.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return;
      }
      if (name === 'switchTab') {
        var tab = args[0];
        var btn = document.querySelector('#ribbon-tabs .rtab[onclick*="switchTab(\\'' + tab + '\\'"]');
        if (!btn) {
          // fallback: find by data or call switchTab directly
          var tabs = document.querySelectorAll('#ribbon-tabs .rtab');
          for (var i = 0; i < tabs.length; i++) {
            var oc = tabs[i].getAttribute('onclick') || '';
            if (oc.indexOf("'" + tab + "'") >= 0 || oc.indexOf('"' + tab + '"') >= 0) {
              btn = tabs[i];
              break;
            }
          }
        }
        if (typeof switchTab === 'function') {
          switchTab(tab, btn || null);
          if (tab === 'objects' && typeof renderObjectsPanel === 'function') renderObjectsPanel();
        }
        return;
      }
      if (name === 'startPreview' && args[0] === '__cur__') {
        return window.startPreview(typeof cur !== 'undefined' ? cur : 0);
      }
      if (name === 'applyElementDataPatch') {
        var patch = args[0] || {};
        if (!patch.id) return;
        var domEl = document.querySelector('.el[data-id="' + patch.id + '"]');
        if (!domEl) return;
        var prevSel = sel;
        try {
          sel = domEl;
          if (patch.cs && domEl.dataset.type === 'text') {
            var c = domEl.querySelector('.ec');
            if (c) c.setAttribute('style', patch.cs);
          }
          if (patch.x != null) domEl.style.left = patch.x + 'px';
          if (patch.y != null) domEl.style.top = patch.y + 'px';
          if (patch.w != null) domEl.style.width = patch.w + 'px';
          if (patch.h != null) domEl.style.height = patch.h + 'px';
          var slide = typeof slides !== 'undefined' && typeof cur !== 'undefined' ? slides[cur] : null;
          var d = null;
          if (slide && slide.els) {
            d = slide.els.find(function (e) {
              return e && String(e.id) === String(patch.id);
            });
            if (d) {
              if (patch.x != null) d.x = patch.x;
              if (patch.y != null) d.y = patch.y;
              if (patch.w != null) d.w = patch.w;
              if (patch.h != null) d.h = patch.h;
              if (patch.cs) d.cs = patch.cs;
            }
          }
          if (patch.rot != null && typeof setElRotation === 'function') {
            setElRotation(+patch.rot);
          }
          if (domEl.dataset.type === 'shape') {
            if (patch.fill != null && typeof updateShapeStyle === 'function') {
              updateShapeStyle('fill', patch.fill);
            }
            if (patch.stroke != null && typeof updateShapeStyle === 'function') {
              updateShapeStyle('stroke', patch.stroke);
            }
            if (patch.sw != null && typeof updateShapeStyle === 'function') {
              updateShapeStyle('sw', patch.sw);
            }
            if (patch.fillOp != null && typeof updateShapeStyle === 'function') {
              updateShapeStyle('fillOp', patch.fillOp);
            }
          }
          if (patch.elOpacity != null) {
            var op = +patch.elOpacity;
            domEl.dataset.elOpacity = op;
            domEl.style.opacity = op;
            if (d) d.elOpacity = op;
            if (domEl.dataset.type === 'shape') {
              var svg = domEl.querySelector('svg');
              if (svg) svg.style.opacity = op;
              var st = domEl.querySelector('.shape-text');
              if (st) st.style.opacity = op;
            }
            if (domEl.dataset.type === 'text') {
              var ec = domEl.querySelector('.ec');
              if (ec) ec.style.opacity = op;
            }
          }
        } finally {
          sel = prevSel;
        }
        if (typeof save === 'function') save();
        if (typeof commitAll === 'function') commitAll();
        else if (typeof drawThumbs === 'function') drawThumbs();
        post('state', collectState());
        return;
      }
      if (name === 'pickElementById') {
        var pickId = args[0];
        if (!pickId) return;
        var pickEl = document.querySelector('.el[data-id="' + pickId + '"]');
        if (pickEl && typeof pick === 'function') pick(pickEl);
        post('state', collectState());
        return;
      }
      if (name === 'fitCanvasToView' || name === 'refreshViewport') {
        fitEmbedCanvas();
        return;
      }
      if (typeof window[name] === 'function') {
        return window[name].apply(window, args);
      }
      var map = {
        save: typeof save === 'function' ? save : null,
        load: typeof load === 'function' ? load : null,
        renderAll: typeof renderAll === 'function' ? renderAll : null,
        commitAll: typeof commitAll === 'function' ? commitAll : null,
        pickSlide: typeof pickSlide === 'function' ? pickSlide : null,
        doUndo: typeof doUndo === 'function' ? doUndo : null,
        doRedo: typeof doRedo === 'function' ? doRedo : null,
        openSettings: typeof openSettings === 'function' ? openSettings : null,
        installPwaApp: typeof installPwaApp === 'function' ? installPwaApp : null,
        setLang: typeof setLang === 'function' ? setLang : null,
        setTheme: typeof setTheme === 'function' ? setTheme : null,
        newPresentation: typeof newPresentation === 'function' ? newPresentation : null,
        startPreview: typeof startPreview === 'function' ? startPreview : null,
        toggleVoiceControl: typeof toggleVoiceControl === 'function' ? toggleVoiceControl : null,
        addText: typeof addText === 'function' ? addText : null,
        addShape: typeof addShape === 'function' ? addShape : null,
        drawThumbs: typeof drawThumbs === 'function' ? drawThumbs : null,
        renderObjectsPanel: typeof renderObjectsPanel === 'function' ? renderObjectsPanel : null,
        switchTab: typeof switchTab === 'function' ? switchTab : null,
      };
      if (name === 'undo' && map.doUndo) return map.doUndo.apply(null, args);
      if (name === 'redo' && map.doRedo) return map.doRedo.apply(null, args);
      // Soft path: prefer commitAll / drawThumbs over full renderAll
      if (name === 'softCommit') {
        if (map.commitAll) return map.commitAll();
        if (map.save) map.save();
        if (map.drawThumbs) return map.drawThumbs();
        return;
      }
      if (map[name]) return map[name].apply(null, args);
    } catch (err) {
      console.warn('[react-embed]', name, err);
      post('toast', { msg: (err && err.message) ? err.message : String(name), type: 'err' });
    }
  }

  var _stateSyncCalls = {
    addText: 1,
    addShape: 1,
    openShapeModal: 1,
    openImageModal: 1,
    openIconModal: 1,
    openTableModal: 1,
    openLinkModal: 1,
    openSVGModal: 1,
    addCodeBlock: 1,
    addHtmlFrame: 1,
    addMarkdownBlock: 1,
    addFormula: 1,
    addVideoEl: 1,
    addAudioEl: 1,
    addModel3dEl: 1,
    setDrawTool: 1,
    clearSlideInk: 1,
    deleteSelected: 1,
    groupSelected: 1,
    ungroupSelected: 1,
    pickElementById: 1,
    applyElementDataPatch: 1,
    doUndo: 1,
    doRedo: 1,
    undo: 1,
    redo: 1,
    newPresentation: 1,
    pickSlide: 1,
    switchTab: 1,
  };

  function wireModalNotify() {
    function scanOpen() {
      var openEl = document.querySelector('.modal-ov.open');
      post('modal', { open: !!openEl, id: openEl ? openEl.id || null : null });
    }
    var obs = new MutationObserver(function () {
      scanOpen();
    });
    function watch(el) {
      if (!el || el._slidesModalObs) return;
      el._slidesModalObs = true;
      obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    }
    document.querySelectorAll('.modal-ov').forEach(watch);
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.classList && n.classList.contains('modal-ov')) watch(n);
          if (n.querySelectorAll) n.querySelectorAll('.modal-ov').forEach(watch);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', function () {
      setTimeout(scanOpen, 0);
    }, true);
    scanOpen();
  }

  window.addEventListener('message', function (ev) {
    var data = ev.data;
    if (!data || data.source !== 'slides-react') return;
    var t = data.type;
    var p = data.payload || {};
    if (t === 'ping') {
      post('bridgeAlive', { ok: true, bootDone: !!window._bootMainDone });
      post('progress', {
        pct: window._bootMainDone ? 100 : 62,
        msg: window._bootMainDone ? 'Готово' : 'Загрузка модулей…'
      });
      if (window._bootMainDone) {
        post('ready', { ok: true });
        post('state', collectState());
      }
      return;
    }
    if (t === 'getState') {
      post('state', collectState());
      return;
    }
    if (t === 'pickSlide') {
      callFn('pickSlide', [p.i | 0]);
      post('state', collectState());
      return;
    }
    if (t === 'save') return callFn('save');
    if (t === 'load') return callFn('load');
    if (t === 'renderAll') return callFn('renderAll', p.force ? ['force'] : []);
    if (t === 'commitAll' || t === 'softCommit') return callFn('softCommit');
    if (t === 'undo') {
      callFn('undo');
      post('state', collectState());
      return;
    }
    if (t === 'redo') {
      callFn('redo');
      post('state', collectState());
      return;
    }
    if (t === 'openSettings') return callFn('openSettings');
    if (t === 'installPwa') {
      var r = callFn('installPwaApp');
      if (r && r.then)
        r.then(function (ok) {
          post('toast', {
            msg: ok ? 'Установлено' : 'Установка через меню браузера',
            type: ok ? 'ok' : '',
          });
        });
      return;
    }
    if (t === 'setLang') return callFn('setLang', [p.lang]);
    if (t === 'setTheme') return callFn('setTheme', [p.theme]);
    if (t === 'newPresentation') {
      callFn('newPresentation');
      post('state', collectState());
      return;
    }
    if (t === 'switchTab') {
      callFn('switchTab', [p.tab || p.id || 'home']);
      post('state', collectState());
      return;
    }
    if (t === 'setEmbedRibbonMode') {
      var mode = p.mode === 'legacy' ? 'legacy' : 'react';
      document.documentElement.classList.toggle('slides-react-embed-legacy-ribbon', mode === 'legacy');
      setTimeout(fitEmbedCanvas, 0);
      return;
    }
    if (t === 'setEmbedPropsMode') {
      var propsMode = p.mode === 'legacy' ? 'legacy' : 'react';
      document.documentElement.classList.toggle('slides-react-embed-legacy-props', propsMode === 'legacy');
      document.documentElement.classList.toggle('slides-react-embed-react-props', propsMode === 'react');
      setTimeout(fitEmbedCanvas, 0);
      setTimeout(fitEmbedCanvas, 120);
      try {
        if (typeof syncProps === 'function') syncProps();
      } catch (e) {}
      return;
    }
    if (t === 'setEmbedColorBarMode') {
      var cbMode = p.mode === 'legacy' ? 'legacy' : 'react';
      document.documentElement.classList.toggle('slides-react-embed-legacy-color-bar', cbMode === 'legacy');
      document.documentElement.classList.toggle('slides-react-embed-react-color-bar', cbMode === 'react');
      try {
        if (typeof syncColorBar === 'function') syncColorBar();
      } catch (e) {}
      setTimeout(fitEmbedCanvas, 0);
      setTimeout(fitEmbedCanvas, 120);
      post('state', collectState());
      return;
    }
    if (t === 'colorBarAction') {
      var api = window.__slidesColorBarApi;
      if (!api) return;
      var act = p.action;
      try {
        if (act === 'setMode') api.setMode(p.mode);
        else if (act === 'applyColor') api.applyColor(p.color, p.schemeRef, p.modifiers);
        else if (act === 'clearColor') api.clearColor();
        else if (act === 'setOpacity') api.setOpacity(p.value);
        else if (act === 'setBlur') api.setBlur(p.value);
        else if (act === 'setStrokeWidth') api.setStrokeWidth(p.value);
        else if (act === 'sync') api.sync();
      } catch (e) {}
      post('state', collectState());
      return;
    }
    if (t === 'getColorBarState') {
      post('state', collectState());
      return;
    }
    if (t === 'drawingAction') {
      var drawApi = window.__slidesDrawingApi;
      if (!drawApi) return;
      var dAct = p.action;
      try {
        if (dAct === 'setTool') drawApi.setTool(p.tool);
        else if (dAct === 'setSmooth') drawApi.setSmooth(p.value);
        else if (dAct === 'setOpacity') drawApi.setOpacity(p.value);
        else if (dAct === 'setNeonBright') drawApi.setNeonBright(p.value);
        else if (dAct === 'setPenSizeIdx') drawApi.setPenSizeIdx(p.index);
        else if (dAct === 'setEraserSizeIdx') drawApi.setEraserSizeIdx(p.index);
        else if (dAct === 'setTaper') drawApi.setTaper(p.taper);
        else if (dAct === 'setColor') drawApi.setColor(p.color, p.schemeRef);
        else if (dAct === 'setFillPattern') drawApi.setFillPattern(p.pattern);
        else if (dAct === 'setFillOpacity') drawApi.setFillOpacity(p.value);
        else if (dAct === 'setFillGap') drawApi.setFillGap(p.value);
        else if (dAct === 'setSelectedOpacity') drawApi.setSelectedOpacity(p.value);
        else if (dAct === 'setSelectedNeonBright') drawApi.setSelectedNeonBright(p.value);
        else if (dAct === 'setSelectedStrokeWidth') drawApi.setSelectedStrokeWidth(p.value);
        else if (dAct === 'clearInk') drawApi.clearInk();
        else if (dAct === 'copySelection') drawApi.copySelection();
        else if (dAct === 'deleteSelection') drawApi.deleteSelection();
        else if (dAct === 'groupSelection') drawApi.groupSelection();
        else if (dAct === 'ungroupSelection') drawApi.ungroupSelection();
        else if (dAct === 'sync') drawApi.sync();
      } catch (e) {}
      post('state', collectState());
      return;
    }
    if (t === 'getDrawingState') {
      post('state', collectState());
      return;
    }
    if (t === 'getThumbs') {
      post('thumbs', { urls: collectThumbs(p.indices) });
      return;
    }
    if (t === 'loadScript') {
      loadScript(p.src)
        .then(function () {
          post('scriptLoaded', { src: p.src, ok: true });
        })
        .catch(function (err) {
          post('scriptLoaded', { src: p.src, ok: false, error: String(err && err.message) });
        });
      return;
    }
    if (t === 'call') {
      callFn(p.name, p.args || []);
      if (_stateSyncCalls[p.name]) post('state', collectState());
      return;
    }
  });

  function patchRenderAllSoft() {
    if (typeof renderAll !== 'function') return;
    if (window.__slidesRenderAllPatched) return;
    window.__slidesRenderAllPatched = true;
    var orig = renderAll;
    window.renderAll = function (opts) {
      // Allow explicit force; otherwise prefer lighter redraw when flagged
      if (opts === 'force' || (opts && opts.force)) return orig.apply(this, arguments);
      if (window.__slidesPreferSoftRender) {
        try {
          if (typeof save === 'function') save();
          if (typeof drawThumbs === 'function') {
            drawThumbs();
            return;
          }
        } catch (e) {}
      }
      return orig.apply(this, arguments);
    };
  }

  function wireSelectionNotify() {
    try {
      if (typeof Bus !== 'undefined' && Bus.on) {
        Bus.on('SLIDE_PICKED', function () {
          post('state', collectState());
        });
      }
    } catch (e) {}
    document.addEventListener(
      'click',
      function () {
        setTimeout(function () {
          post('selection', {
            selId: collectState().selId,
            multiSel: collectState().multiSel,
          });
        }, 0);
      },
      true
    );
  }

  function fitEmbedCanvas() {
    var cwrap = document.getElementById('cwrap');
    if (!cwrap) {
      setTimeout(fitEmbedCanvas, 80);
      return;
    }
    var w = cwrap.clientWidth;
    var h = cwrap.clientHeight;
    if (w < 48 || h < 48) {
      setTimeout(fitEmbedCanvas, 80);
      return;
    }
    if (typeof canvasW !== 'number' || typeof canvasH !== 'number') {
      setTimeout(fitEmbedCanvas, 120);
      return;
    }
    try {
      if (typeof _refreshCanvasViewport === 'function') _refreshCanvasViewport();
      else if (typeof fitCanvasToView === 'function') fitCanvasToView();
      else if (typeof _applyCanvasZoom === 'function') {
        _canvasZoom = Math.min(
          (w - 24) / canvasW,
          (h - 24) / canvasH,
          1
        );
        _zoomTarget = _canvasZoom;
        _applyCanvasZoom();
        if (typeof _centerSlide === 'function') _centerSlide();
      }
      if (typeof drawGrid === 'function') drawGrid();
    } catch (e) {}
  }

  function onBootDone() {
    if (window.__slidesEmbedBootNotified) return;
    window.__slidesEmbedBootNotified = true;
    if (bootProgressTimer) {
      clearInterval(bootProgressTimer);
      bootProgressTimer = null;
    }
    patchRenderAllSoft();
    wireSelectionNotify();
    wireModalNotify();
    // Soft by default for property-ish paths; full render still available via force
    window.__slidesPreferSoftRender = false;
    try {
      if (typeof syncProps === 'function') syncProps();
      else if (typeof renderProps === 'function') renderProps();
    } catch (e) {}
    fitEmbedCanvas();
    [50, 120, 300, 600, 1200, 2000, 3500].forEach(function (ms) {
      setTimeout(fitEmbedCanvas, ms);
    });
    if (!window.__slidesEmbedResizeHook) {
      window.__slidesEmbedResizeHook = true;
      window.addEventListener('resize', fitEmbedCanvas);
    }
    post('progress', { pct: 95, msg: 'Готово' });
    post('ready', { ok: true });
    post('state', collectState());
  }

  window.__slidesEmbedNotifyBoot = onBootDone;

  var bootN = 0;
  var bootProgressTimer = setInterval(function () {
    if (window._bootMainDone) {
      clearInterval(bootProgressTimer);
      bootProgressTimer = null;
      return;
    }
    bootN++;
    post('progress', {
      pct: Math.min(88, 48 + Math.floor(bootN * 1.4)),
      msg: 'Загрузка редактора…',
    });
  }, 160);

  // Hide duplicate chrome — full rules in css/styles.css (slides-react-embed)
  var style = document.createElement('style');
  style.textContent =
    'html.slides-react-embed #ribbon-top{display:none!important;}' +
    'html.slides-react-embed #ribbon-tabs{display:none!important;}' +
    'html.slides-react-embed #loading{display:none!important;}' +
    'html.slides-react-embed #sidebar{display:none!important;}' +
    'html.slides-react-embed #ribbon{display:none!important;}' +
    'html.slides-react-embed.slides-react-embed-legacy-ribbon #ribbon{display:flex!important;}' +
    'html.slides-react-embed #props{display:none!important;}' +
    'html.slides-react-embed.slides-react-embed-legacy-props #props{display:flex!important;}' +
    'html.slides-react-embed.slides-react-embed-react-props #canvas-area{flex:1;width:100%;height:100%;}' +
    'html.slides-react-embed.slides-react-embed-react-color-bar #color-bar{display:none!important;}' +
    'html.slides-react-embed.slides-react-embed-legacy-color-bar #color-bar{display:flex!important;}' +
    'html.slides-react-embed .modal-ov.open{z-index:2147483646!important;}';
  document.head.appendChild(style);
})();
