// ══════════════ HOVER EFFECTS ══════════════
(function(){
  const HFX_OFFSET = 8;

  function _sel(){
    try { return (typeof sel !== 'undefined' && sel) ? sel : null; } catch(e) { return null; }
  }
  const _save = ()=> typeof save === 'function' && save();
  const _saveState = ()=> typeof saveState === 'function' && saveState();

  function _getElData(el){
    if(!el || typeof slides === 'undefined' || typeof cur === 'undefined') return null;
    const slide = slides[cur];
    return slide && slide.els ? slide.els.find(e=> e.id === el.dataset.id) : null;
  }

  function _parseRot(el, d){
    if(d && d.rot != null) return +d.rot || 0;
    if(el && el.dataset.rot != null) return +el.dataset.rot || 0;
    return 0;
  }

  function _readTextColor(el, d){
    const ec = el && (el.querySelector('.tel') || el.querySelector('.ec'));
    const cs = ec ? ec.getAttribute('style') || '' : (d && d.cs) || '';
    const m = cs.match(/(?:^|;|\s)color:\s*([^;]+)/i);
    return m ? m[1].trim().replace(/['"]/g, '') : '';
  }
  function _uiHex(v){
    return /^#[0-9a-fA-F]{6}$/.test(v||'') ? v : '';
  }

  function _hoverVisualSnapshot(el, d){
    d = d || (el ? _getElData(el) : null);
    const st = {
      x: d ? (d.x || 0) : (el ? parseInt(el.style.left, 10) || 0 : 0),
      y: d ? (d.y || 0) : (el ? parseInt(el.style.top, 10) || 0 : 0),
      w: d ? (d.w || 100) : (el ? parseInt(el.style.width, 10) || 100 : 100),
      h: d ? (d.h || 100) : (el ? parseInt(el.style.height, 10) || 100 : 100),
      rot: _parseRot(el, d),
      scale: 1,
      elOpacity: d && d.elOpacity != null ? +d.elOpacity : 1,
      filter: '',
      shadowBlur: 0,
      shadowColor: '#000000',
      color: '',
      textColor: '',
      textBg: '',
      textBgOp: 1,
      textBorderW: 0,
      textBorderColor: '#ffffff',
      textBorderStyle: 'solid',
      textShadowBlur: 0,
      textShadowSize: 0,
      textShadowColor: '#000000',
      textBlockShadowBlur: 0,
      textBlockShadowSize: 0,
      textBlockShadowColor: '#000000',
      textBlockShadowInset: false
    };
    if(!d) return st;
    if(d.type === 'shape'){
      st.fill = d.fill || '#3b82f6';
      st.stroke = d.stroke || '#1d4ed8';
      st.sw = d.sw != null ? +d.sw : 2;
      st.fillOp = d.fillOp != null ? +d.fillOp : 1;
      if(d.shadow){
        st.shadowBlur = d.shadowBlur != null ? +d.shadowBlur : 4;
        st.shadowColor = d.shadowColor || '#000000';
      }
    } else if(d.type === 'text'){
      if(el){
        st.textColor = _readTextColor(el, d);
        st.textBg = el.dataset.textBg || d.textBg || '';
        st.textBgOp = el.dataset.textBgOp != null ? +el.dataset.textBgOp : (d.textBgOp != null ? +d.textBgOp : 1);
        st.textBorderW = +(el.dataset.textBorderW || d.textBorderW || 0);
        st.textBorderColor = el.dataset.textBorderColor || d.textBorderColor || '#ffffff';
        st.textBorderStyle = el.dataset.textBorderStyle || d.textBorderStyle || 'solid';
        st.textShadowBlur = +(el.dataset.textShadowBlur || d.textShadowBlur || 0);
        st.textShadowSize = +(el.dataset.textShadowSize || d.textShadowSize || 0);
        st.textShadowColor = el.dataset.textShadowColor || d.textShadowColor || '#000000';
        st.textBlockShadowBlur = +(el.dataset.textBlockShadowBlur || d.textBlockShadowBlur || 0);
        st.textBlockShadowSize = +(el.dataset.textBlockShadowSize || d.textBlockShadowSize || 0);
        st.textBlockShadowColor = el.dataset.textBlockShadowColor || d.textBlockShadowColor || '#000000';
        st.textBlockShadowInset = el.dataset.textBlockShadowInset === '1' || d.textBlockShadowInset === true;
      } else {
        if(d.cs){
          const m = d.cs.match(/(?:^|;|\s)color:\s*([^;]+)/i);
          if(m) st.textColor = m[1].trim().replace(/['"]/g, '');
        }
        st.textBg = d.textBg || '';
        st.textBgOp = d.textBgOp != null ? +d.textBgOp : 1;
        st.textBorderW = +(d.textBorderW || 0);
        st.textBorderColor = d.textBorderColor || '#ffffff';
        st.textBorderStyle = d.textBorderStyle || 'solid';
        st.textShadowBlur = +(d.textShadowBlur || 0);
        st.textShadowSize = +(d.textShadowSize || 0);
        st.textShadowColor = d.textShadowColor || '#000000';
        st.textBlockShadowBlur = +(d.textBlockShadowBlur || 0);
        st.textBlockShadowSize = +(d.textBlockShadowSize || 0);
        st.textBlockShadowColor = d.textBlockShadowColor || '#000000';
        st.textBlockShadowInset = d.textBlockShadowInset === true;
      }
    } else if(d.type === 'image'){
      st.imgOpacity = d.imgOpacity != null ? +d.imgOpacity : 1;
    }
    return st;
  }

  function _migrateLegacyHover(fx, base){
    if(!fx) fx = {};
    const hover = fx.hover ? Object.assign({}, fx.hover) : Object.assign({}, base);
    if(fx.scale != null) hover.scale = fx.scale;
    if(fx.opacity != null) hover.elOpacity = fx.opacity;
    if(fx.shadow != null) hover.shadowBlur = fx.shadow;
    if(fx.shadowColor) hover.shadowColor = fx.shadowColor;
    if(fx.color) hover.color = fx.color;
    return hover;
  }

  window.normalizeHoverFx = function(el, fx, d){
    d = d || (el ? _getElData(el) : null);
    if(!fx || typeof fx !== 'object') fx = {};
    const base = _hoverVisualSnapshot(el, d);
    if(!fx.base) fx.base = base;
    if(!fx.hover) fx.hover = _migrateLegacyHover(fx, base);
    if(fx.dur == null) fx.dur = 0.3;
    return fx;
  };

  function _persistHover(el, fx){
    el.dataset.hoverFx = JSON.stringify(fx);
  }

  function _hoverBuildTransform(state, d){
    const rot = state.rot != null ? +state.rot : 0;
    const sc = state.scale != null ? +state.scale : 1;
    const fx = d && d.shapeFlipH ? -1 : 1;
    const fy = d && d.shapeFlipV ? -1 : 1;
    if(d && (d.shapeFlipH || d.shapeFlipV)){
      return 'rotate('+rot+'deg) scale('+(fx*sc)+','+(fy*sc)+')';
    }
    if(sc !== 1) return 'rotate('+rot+'deg) scale('+sc+')';
    return 'rotate('+rot+'deg)';
  }

  function _hoverTransition(dur){
    return 'left '+dur+' ease,top '+dur+' ease,width '+dur+' ease,height '+dur+' ease,transform '+dur+' ease,opacity '+dur+' ease,filter '+dur+' ease,box-shadow '+dur+' ease,color '+dur+' ease';
  }

  function _presetFilter(fx){
    if(!fx || !fx.preset) return '';
    if(fx.preset === 'lighter') return 'brightness(1.25)';
    if(fx.preset === 'darker') return 'brightness(0.75)';
    if(fx.preset === 'hue') return 'hue-rotate(28deg)';
    return '';
  }

  function _toRgba(hex, a){
    if(!hex) return 'rgba(0,0,0,0)';
    const rv = parseInt(hex.slice(1, 3), 16), gv = parseInt(hex.slice(3, 5), 16), bv = parseInt(hex.slice(5, 7), 16);
    return 'rgba('+rv+','+gv+','+bv+','+a+')';
  }

  function _restoreEditorHoverVisuals(el){
    if(!el) return;
    el.style.cursor = '';
    el.style.transition = '';
    el.style.filter = '';
    el.style.boxShadow = '';
    const d = _getElData(el);
    if(d){
      el.style.left = (d.x || 0) + 'px';
      el.style.top = (d.y || 0) + 'px';
      el.style.width = (d.w || 100) + 'px';
      el.style.height = (d.h || 100) + 'px';
      const op = d.elOpacity != null ? +d.elOpacity : 1;
      el.style.opacity = op === 1 ? '' : String(op);
      const rot = d.rot != null ? d.rot : (el.dataset.rot || 0);
      el.style.transform = 'rotate('+rot+'deg)';
    }
    if(el.dataset.type === 'text' && typeof window._restoreTextBlockVisuals === 'function'){
      window._restoreTextBlockVisuals(el);
    }
  }

  function _applyTextHoverVisuals(el, state, d, isHover){
    if(!el || !d || d.type !== 'text') return;
    if(!isHover){
      el.style.outline = '';
      el.style.outlineOffset = '';
      if(typeof window._stampTextDatasetFromModel === 'function') window._stampTextDatasetFromModel(el, d);
      if(typeof window._restoreTextBlockVisuals === 'function') window._restoreTextBlockVisuals(el);
      return;
    }
    const ec = el.querySelector('.tel') || el.querySelector('.ec');
    if(ec && state.textColor){
      ec.style.color = state.textColor;
      ec.style.webkitTextFillColor = state.textColor;
      if(!d.textColorGrad){
        ec.style.background = '';
        ec.style.webkitBackgroundClip = '';
        ec.style.backgroundClip = '';
      }
    }
    if(state.textBg){
      el.dataset.textBg = state.textBg;
      el.dataset.textBgOp = state.textBgOp != null ? state.textBgOp : 1;
      if(typeof applyTextBg === 'function') applyTextBg(el);
    }
    const bw = +(state.textBorderW || 0);
    if(bw > 0){
      el.style.outline = bw + 'px solid ' + (state.textBorderColor || '#ffffff');
      el.style.outlineOffset = '0px';
    } else {
      el.style.outline = '';
      el.style.outlineOffset = '';
    }
    const shOv = typeof window._shadowOverrideFromState === 'function' ? window._shadowOverrideFromState(state) : {};
    if(typeof applyTextShadowStyle === 'function') applyTextShadowStyle(el, shOv);
    if(typeof applyTextBlockShadowStyle === 'function') applyTextBlockShadowStyle(el, shOv);
  }

  function _mergeHoverState(base, hover, d, fx){
    const out = Object.assign({}, base, hover || {});
    if(d && d.type === 'text'){
      const preset = fx && fx.preset;
      const filterOnly = preset === 'lighter' || preset === 'darker';
      out._baseTextColor = base.textColor || '';
      if(filterOnly || !hover || hover.textColor == null || hover.textColor === '') out.textColor = '';
      if(filterOnly || !hover || hover.textBg == null || hover.textBg === ''){
        out.textBg = base.textBg || '';
        out.textBgOp = base.textBgOp != null ? base.textBgOp : 1;
      }
      if(filterOnly || !hover || hover.textBorderW == null || +hover.textBorderW <= 0){
        out.textBorderW = base.textBorderW || 0;
        out.textBorderColor = base.textBorderColor || '#ffffff';
        out.textBorderStyle = base.textBorderStyle || 'solid';
      }
      if(filterOnly || !hover || hover.textShadowBlur == null || hover.textShadowSize == null || (+hover.textShadowBlur <= 0 && +hover.textShadowSize <= 0)){
        out.textShadowBlur = base.textShadowBlur || 0;
        out.textShadowSize = base.textShadowSize || 0;
        out.textShadowColor = base.textShadowColor || '#000000';
      }
      if(filterOnly || !hover || hover.textBlockShadowBlur == null || hover.textBlockShadowSize == null || (+hover.textBlockShadowBlur <= 0 && +hover.textBlockShadowSize <= 0)){
        out.textBlockShadowBlur = base.textBlockShadowBlur || 0;
        out.textBlockShadowSize = base.textBlockShadowSize || 0;
        out.textBlockShadowColor = base.textBlockShadowColor || '#000000';
        out.textBlockShadowInset = !!base.textBlockShadowInset;
      }
    }
    return out;
  }

  function _applyHoverVisualState(el, state, d, fx, isHover){
    if(!state) return;
    el.style.left = state.x + 'px';
    el.style.top = state.y + 'px';
    el.style.width = state.w + 'px';
    el.style.height = state.h + 'px';
    el.style.transform = _hoverBuildTransform(state, d);
    const op = state.elOpacity != null ? +state.elOpacity : 1;
    el.style.opacity = op === 1 ? '' : String(op);

    el.style.filter = isHover ? _presetFilter(fx) : '';
    el.style.boxShadow = '';

    if(d && d.type === 'text'){
      _applyTextHoverVisuals(el, state, d, isHover);
    }

    if(d && d.type === 'image'){
      const img = el.querySelector('img');
      if(img){
        const iop = state.imgOpacity != null ? +state.imgOpacity : 1;
        img.style.opacity = iop === 1 ? '' : String(iop);
      }
    }

    if(d && d.type === 'shape'){
      const svg = el.querySelector('svg');
      if(svg){
        svg.style.transition = el.style.transition;
        svg.style.transform = '';
        svg.style.filter = '';
        svg.style.opacity = op === 1 ? '' : String(op);
      }
    }
  }

  function _syncHfxBodyVisibility(enabled){
    const body = document.getElementById('hfx-body');
    if(body) body.style.display = enabled ? 'flex' : 'none';
  }

  function _syncHfxSettingsVisibility(enabled){
    const panel = document.getElementById('hfx-settings');
    if(panel) panel.style.display = enabled ? 'flex' : 'none';
  }

  function _applyPresetToHover(fx, preset){
    const base = fx.base || {};
    const prev = fx.hover || {};
    const hover = JSON.parse(JSON.stringify(base));
    if(preset === 'right') hover.x = (base.x || 0) + HFX_OFFSET;
    else if(preset === 'up') hover.y = (base.y || 0) - HFX_OFFSET;
    ['textColor','textBg','textBgOp','textBorderW','textBorderColor','textBorderStyle','textShadowBlur','textShadowSize','textShadowColor','textBlockShadowBlur','textBlockShadowSize','textBlockShadowColor','textBlockShadowInset'].forEach(k=>{
      if(prev[k] != null && prev[k] !== '') hover[k] = prev[k];
    });
    fx.hover = hover;
  }

  window.setHoverFxEnabled = function(on){
    const el = _sel(); if(!el) return;
    try{
      const d = _getElData(el);
      let fx = normalizeHoverFx(el, JSON.parse(el.dataset.hoverFx || '{}'), d);
      fx.enabled = !!on;
      if(fx.enabled){
        fx.base = _hoverVisualSnapshot(el, d);
        if(!fx.preset || fx.preset === 'none') fx.preset = 'lighter';
        if(!fx.hover) _applyPresetToHover(fx, fx.preset);
        if(fx.dur == null) fx.dur = 0.3;
      }
      _persistHover(el, fx);
      applyHoverFxEditor(el, fx);
      syncHoverFxUI();
      _save(); _saveState();
    }catch(e){ console.warn('[19-hover] setHoverFxEnabled:', e.message); }
  };

  window.setHoverFxPreset = function(preset){
    const el = _sel(); if(!el) return;
    try{
      const d = _getElData(el);
      let fx = normalizeHoverFx(el, JSON.parse(el.dataset.hoverFx || '{}'), d);
      fx.preset = preset || 'none';
      if(!fx.base) fx.base = _hoverVisualSnapshot(el, d);
      _applyPresetToHover(fx, fx.preset);
      if(fx.enabled){
        _persistHover(el, fx);
        applyHoverFxEditor(el, fx);
      } else {
        _persistHover(el, fx);
      }
      syncHoverFxUI();
      _save(); _saveState();
    }catch(e){ console.warn('[19-hover] setHoverFxPreset:', e.message); }
  };

  window.applyHoverPreset = window.setHoverFxPreset;

  window.setHoverFx = function(prop, val){
    const el = _sel(); if(!el) return;
    try{
      if(prop === 'enabled'){
        setHoverFxEnabled(!!val);
        return;
      }
      if(!el.dataset.hoverFx) el.dataset.hoverFx = '{}';
      let fx = normalizeHoverFx(el, JSON.parse(el.dataset.hoverFx || '{}'));
      if(prop === 'dur'){
        fx.dur = +val || 0.3;
      } else {
        if(!fx.enabled){
          fx.enabled = true;
          fx.base = _hoverVisualSnapshot(el, _getElData(el));
          if(!fx.preset || fx.preset === 'none') fx.preset = 'lighter';
          _applyPresetToHover(fx, fx.preset);
        }
        if(!fx.hover) fx.hover = JSON.parse(JSON.stringify(fx.base || _hoverVisualSnapshot(el, _getElData(el))));
        const map = {
          textColor:'textColor', textBg:'textBg', textBorderW:'textBorderW',
          textBorderColor:'textBorderColor', textBorderStyle:'textBorderStyle',
          textShadowBlur:'textShadowBlur', textShadowSize:'textShadowSize', textShadowColor:'textShadowColor',
          textBlockShadowBlur:'textBlockShadowBlur', textBlockShadowSize:'textBlockShadowSize', textBlockShadowColor:'textBlockShadowColor', textBlockShadowInset:'textBlockShadowInset'
        };
        const key = map[prop] || prop;
        if(val === '' || val == null || val === false){
          delete fx.hover[key];
        } else {
          fx.hover[key] = val;
        }
        fx._edited = true;
      }
      _persistHover(el, fx);
      applyHoverFxEditor(el, fx);
      syncHoverFxUI();
      _save(); _saveState();
    }catch(e){ console.warn('[19-hover] setHoverFx:', e.message); }
  };

  window.applyHoverFxEditor = function(el, fx){
    try{
      if(el._hfxEnter){ el.removeEventListener('mouseenter', el._hfxEnter); el._hfxEnter = null; }
      if(el._hfxLeave){ el.removeEventListener('mouseleave', el._hfxLeave); el._hfxLeave = null; }
      el.classList.toggle('has-hover-fx', !!(fx && fx.enabled));
      _restoreEditorHoverVisuals(el);
    }catch(e){}
  };

  window.applyHoverFxPreview = function(el, fx, d){
    if(!fx || !fx.enabled) return;
    try{
      if(el._hfxEnter){ el.removeEventListener('mouseenter', el._hfxEnter); el._hfxEnter = null; }
      if(el._hfxLeave){ el.removeEventListener('mouseleave', el._hfxLeave); el._hfxLeave = null; }
      fx = normalizeHoverFx(null, fx, d);
      const base = _hoverVisualSnapshot(null, d);
      const hover = _mergeHoverState(base, fx.hover, d, fx);
      const dur = (fx.dur != null ? fx.dur : 0.3) + 's';
      el.style.transition = _hoverTransition(dur);
      el.style.cursor = 'pointer';
      _applyHoverVisualState(el, base, d, fx, false);
      el._hfxEnter = ()=> _applyHoverVisualState(el, hover, d, fx, true);
      el._hfxLeave = ()=> _applyHoverVisualState(el, base, d, fx, false);
      el.addEventListener('mouseenter', el._hfxEnter);
      el.addEventListener('mouseleave', el._hfxLeave);
    }catch(e){ console.warn('[19-hover] applyHoverFxPreview:', e.message); }
  };

  window.syncHoverFxUI = function(){
    const el = _sel(); if(!el) return;
    try{
      let fx = JSON.parse(el.dataset.hoverFx || '{}');
      const d = _getElData(el);
      if(!fx.enabled && d) fx.base = _hoverVisualSnapshot(el, d);
      fx = normalizeHoverFx(el, fx, d);
      const hover = fx.hover || {};
      const filterOnly = fx.preset === 'lighter' || fx.preset === 'darker';
      const enabled = !!fx.enabled;
      _syncHfxBodyVisibility(enabled);
      _syncHfxSettingsVisibility(enabled);
      const isText = d && d.type === 'text';
      ['hfx-text-row','hfx-bg-row','hfx-border-row','hfx-text-shadow-row','hfx-block-shadow-row'].forEach(id=>{
        const row = document.getElementById(id);
        if(row) row.style.display = isText ? '' : 'none';
      });

      const set = (id, fn)=>{ try{ const n = document.getElementById(id); if(n) fn(n); }catch(e){} };
      set('hfx-on', v=>{ v.checked = enabled; });
      set('hfx-preset', v=>{ v.value = fx.preset || 'none'; });
      set('hfx-dur', v=>{
        v.value = fx.dur != null ? fx.dur : 0.3;
        if(typeof refreshNumScrubber === 'function') refreshNumScrubber(v);
      });
      set('hfx-text-hex', v=>{ v.value = filterOnly ? '' : _uiHex(hover.textColor); });
      set('hfx-text-preview', v=>{
        v.style.background = filterOnly ? 'transparent' : (_uiHex(hover.textColor) || 'transparent');
      });
      set('hfx-bg-hex', v=>{ v.value = filterOnly ? '' : _uiHex(hover.textBg); });
      set('hfx-bg-preview', v=>{
        v.style.background = filterOnly ? '' : (_uiHex(hover.textBg) || '');
      });
      set('hfx-border-w', v=>{
        v.value = filterOnly ? 0 : (hover.textBorderW != null ? hover.textBorderW : 0);
        if(typeof refreshNumScrubber === 'function') refreshNumScrubber(v);
      });
      set('hfx-border-preview', v=>{
        v.style.background = filterOnly ? '#ffffff' : (_uiHex(hover.textBorderColor) || '#ffffff');
      });
      set('hfx-tshadow-sb', v=>{
        v.value = filterOnly ? 0 : (hover.textShadowBlur != null ? hover.textShadowBlur : 0);
        if(typeof refreshNumScrubber === 'function') refreshNumScrubber(v);
      });
      set('hfx-tshadow-ss', v=>{
        v.value = filterOnly ? 0 : (hover.textShadowSize != null ? hover.textShadowSize : 0);
        if(typeof refreshNumScrubber === 'function') refreshNumScrubber(v);
      });
      set('hfx-tshadow-preview', v=>{
        v.style.background = filterOnly ? '#000000' : (_uiHex(hover.textShadowColor) || '#000000');
      });
      set('hfx-bshadow-sb', v=>{
        v.value = filterOnly ? 0 : (hover.textBlockShadowBlur != null ? hover.textBlockShadowBlur : 0);
        if(typeof refreshNumScrubber === 'function') refreshNumScrubber(v);
      });
      set('hfx-bshadow-ss', v=>{
        v.value = filterOnly ? 0 : (hover.textBlockShadowSize != null ? hover.textBlockShadowSize : 0);
        if(typeof refreshNumScrubber === 'function') refreshNumScrubber(v);
      });
      set('hfx-bshadow-preview', v=>{
        v.style.background = filterOnly ? '#000000' : (_uiHex(hover.textBlockShadowColor) || '#000000');
      });
      set('hfx-bshadow-inset', v=>{ v.checked = !filterOnly && !!hover.textBlockShadowInset; });
      if(typeof initHexFields === 'function') initHexFields(document.getElementById('hoverprops'));
    }catch(e){ console.warn('[19-hover] syncHoverFxUI:', e.message); }
  };

  window.onColorPick = function(v, mode){
    if(mode==='text' && typeof applyTextColor==='function') applyTextColor(v);
    if(typeof addRecentColor==='function') addRecentColor(v);
  };

  window.onColorHex = function(v, mode){
    if(/^#[0-9a-fA-F]{3,8}$/.test(v)){
      if(mode==='text' && typeof applyTextColor==='function'){
        applyTextColor(v);
        try{ document.getElementById('p-col').value=v; }catch(e){}
      }
      if(typeof addRecentColor==='function') addRecentColor(v);
    }
  };
})();
