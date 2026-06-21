// ══════════════ HOVER EFFECTS ══════════════
(function(){
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
      color: ''
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
      st.textColor = d.textColor || '';
      st.textBg = d.textBg || '';
      st.textBgOp = d.textBgOp != null ? +d.textBgOp : 1;
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
    return 'left '+dur+' ease,top '+dur+' ease,width '+dur+' ease,height '+dur+' ease,transform '+dur+' ease,opacity '+dur+' ease,filter '+dur+' ease,box-shadow '+dur+' ease';
  }

  function _applyHoverVisualState(el, state, d, fx){
    if(!state) return;
    el.style.left = state.x + 'px';
    el.style.top = state.y + 'px';
    el.style.width = state.w + 'px';
    el.style.height = state.h + 'px';
    el.style.transform = _hoverBuildTransform(state, d);
    const op = state.elOpacity != null ? +state.elOpacity : 1;
    el.style.opacity = op === 1 ? '' : String(op);

    let filter = state.filter || '';
    if(fx && fx.preset === 'lighter') filter = 'brightness(1.3)';
    else if(fx && fx.preset === 'darker') filter = 'brightness(0.7)';
    el.style.filter = filter;

    const blur = state.shadowBlur != null ? +state.shadowBlur : 0;
    const scol = state.shadowColor || state.color || (fx && fx.color) || 'rgba(0,0,0,0.4)';
    if(fx && fx.preset === 'glow'){
      el.style.boxShadow = '0 0 20px 6px '+(state.color || scol);
    } else if(blur > 0){
      el.style.boxShadow = '0 0 '+blur+'px '+scol;
    } else {
      el.style.boxShadow = '';
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
        svg.style.filter = blur > 0 ? 'drop-shadow(0 0 '+blur+'px '+scol+')' : '';
        svg.style.opacity = op === 1 ? '' : String(op);
      }
    }
  }

  function _syncHfxPanelVisibility(enabled){
    const panel = document.getElementById('hfx-panel');
    const chk = document.getElementById('hfx-on');
    const on = enabled != null ? !!enabled : !!(chk && chk.checked);
    if(panel) panel.style.display = on ? 'flex' : 'none';
  }

  window.setHoverFx = function(prop, val){
    const el = _sel(); if(!el) return;
    try{
      if(!el.dataset.hoverFx) el.dataset.hoverFx = '{}';
      let fx = normalizeHoverFx(el, JSON.parse(el.dataset.hoverFx || '{}'));
      if(prop === 'enabled'){
        fx.enabled = !!val;
        if(fx.enabled){
          fx.base = _hoverVisualSnapshot(el, _getElData(el));
          if(!fx._edited) fx.hover = JSON.parse(JSON.stringify(fx.base));
        }
      } else if(prop === 'dur'){
        fx.dur = +val || 0.3;
      } else {
        if(!fx.hover) fx.hover = _hoverVisualSnapshot(el, _getElData(el));
        const map = {
          scale:'scale', opacity:'elOpacity', shadow:'shadowBlur',
          shadowColor:'shadowColor', color:'color',
          x:'x', y:'y', w:'w', h:'h', rot:'rot'
        };
        const key = map[prop] || prop;
        fx.hover[key] = val;
        fx._edited = true;
      }
      _persistHover(el, fx);
      applyHoverFxEditor(el, fx);
      _syncHfxPanelVisibility(!!fx.enabled);
      syncHoverFxUI();
      _save(); _saveState();
    }catch(e){ console.warn('[19-hover] setHoverFx:', e.message); }
  };

  window.applyHoverFxEditor = function(el, fx){
    try{
      el.classList.toggle('has-hover-fx', !!(fx && fx.enabled));
      el.style.cursor = '';
    }catch(e){}
  };

  window.applyHoverFxPreview = function(el, fx, d){
    if(!fx || !fx.enabled) return;
    try{
      fx = normalizeHoverFx(null, fx, d);
      const base = Object.assign(_hoverVisualSnapshot(null, d), fx.base || {});
      const hover = Object.assign({}, base, fx.hover || {});
      const dur = (fx.dur != null ? fx.dur : 0.3) + 's';
      el.style.transition = _hoverTransition(dur);
      el.style.cursor = 'pointer';
      _applyHoverVisualState(el, base, d, fx);

      el.addEventListener('mouseenter', ()=> _applyHoverVisualState(el, hover, d, fx));
      el.addEventListener('mouseleave', ()=> _applyHoverVisualState(el, base, d, fx));
    }catch(e){ console.warn('[19-hover] applyHoverFxPreview:', e.message); }
  };

  window.syncHoverFxUI = function(){
    const el = _sel(); if(!el) return;
    try{
      let fx = JSON.parse(el.dataset.hoverFx || '{}');
      const d = _getElData(el);
      if(!fx.enabled && d){
        fx.base = _hoverVisualSnapshot(el, d);
      }
      fx = normalizeHoverFx(el, fx, d);
      const base = fx.base || _hoverVisualSnapshot(el, d);
      const hover = fx.hover || base;
      const enabled = !!fx.enabled;
      _syncHfxPanelVisibility(enabled);

      const set = (id, fn)=>{ try{ const n = document.getElementById(id); if(n) fn(n); }catch(e){} };
      set('hfx-on', v=>{ v.checked = enabled; });
      set('hfx-dur', v=>{ v.value = fx.dur != null ? fx.dur : 0.3; });
      set('hfx-x', v=>{ v.value = hover.x != null ? hover.x : base.x; });
      set('hfx-y', v=>{ v.value = hover.y != null ? hover.y : base.y; });
      set('hfx-w', v=>{ v.value = hover.w != null ? hover.w : base.w; });
      set('hfx-h', v=>{ v.value = hover.h != null ? hover.h : base.h; });
      set('hfx-scale', v=>{ v.value = hover.scale != null ? hover.scale : 1; });
      set('hfx-rot', v=>{ v.value = hover.rot != null ? hover.rot : base.rot; });
      set('hfx-op', v=>{ v.value = hover.elOpacity != null ? hover.elOpacity : 1; });
      set('hfx-shadow', v=>{ v.value = hover.shadowBlur != null ? hover.shadowBlur : 0; });
      set('hfx-scol', v=>{ v.value = hover.shadowColor || '#000000'; });
      set('hfx-scol-hex', v=>{ v.value = hover.shadowColor || ''; });
      set('hfx-col', v=>{ v.value = hover.color || '#ffffff'; });
      set('hfx-col-hex', v=>{ v.value = hover.color || ''; });
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
