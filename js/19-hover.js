// ══════════════ HOVER EFFECTS ══════════════
// Независимый модуль. Не требует других модулей для работы.
(function(){
  const _sel       = ()=> window.sel;
  const _save      = ()=> typeof save      === 'function' && save();
  const _saveState = ()=> typeof saveState === 'function' && saveState();

  window.setHoverFx = function(prop, val){
    const el = _sel(); if(!el) return;
    try{
      if(!el.dataset.hoverFx) el.dataset.hoverFx = '{}';
      const fx = JSON.parse(el.dataset.hoverFx || '{}');
      const map = {enabled:'enabled', scale:'scale', dur:'dur',
                   color:'color', opacity:'opacity', shadow:'shadow', shadowColor:'shadowColor'};
      if(map[prop]) fx[prop] = val;
      el.dataset.hoverFx = JSON.stringify(fx);
      applyHoverFxEditor(el, fx);
      _save(); _saveState();
    }catch(e){ console.warn('[19-hover] setHoverFx:', e.message); }
  };

  window.applyHoverFxEditor = function(el, fx){
    try{
      el.classList.toggle('has-hover-fx', !!(fx && fx.enabled));
      if(fx && fx.enabled){
        el.style.setProperty('--hfx-scale', fx.scale || 1.05);
        el.style.setProperty('--hfx-dur', (fx.dur || 0.2) + 's');
        el.style.cursor = 'pointer';
      } else {
        el.style.cursor = '';
      }
    }catch(e){}
  };

  window.applyHoverFxPreview = function(el, fx, isShape){
    if(!fx || !fx.enabled) return;
    try{
      const dur = (fx.dur || 0.2) + 's';
      const origTransform = el.style.transform || '';
      if(isShape){
        const svg = el.querySelector('svg'); if(!svg) return;
        el.style.pointerEvents = 'none';
        svg.style.pointerEvents = 'auto';
        svg.style.cursor = 'pointer';
        svg.style.transition = 'transform '+dur+' ease,opacity '+dur+' ease,filter '+dur+' ease';
        svg.style.transformOrigin = 'center center';
        svg.addEventListener('mouseenter', ()=>{
          svg.style.transform = 'scale('+(fx.scale||1.05)+')';
          if(fx.opacity!=null && fx.opacity!==1) svg.style.opacity = String(fx.opacity);
          if(fx.shadow && fx.shadow>0) svg.style.filter = 'drop-shadow(0 0 '+fx.shadow+'px '+(fx.shadowColor||'rgba(0,0,0,0.6)')+')';
          if(fx.preset==='glow' && fx.color) svg.style.filter = 'drop-shadow(0 0 12px '+fx.color+') drop-shadow(0 0 20px '+fx.color+')';
          if(fx.preset==='lighter') svg.style.filter = 'brightness(1.3)';
          if(fx.preset==='darker') svg.style.filter = 'brightness(0.7)';
        });
        svg.addEventListener('mouseleave', ()=>{
          svg.style.transform = ''; svg.style.opacity = ''; svg.style.filter = '';
        });
      } else {
        el.style.transition = 'transform '+dur+' ease,opacity '+dur+' ease,filter '+dur+' ease,box-shadow '+dur+' ease';
        el.style.cursor = 'pointer';
        el.addEventListener('mouseenter', ()=>{
          el.style.transform = origTransform + ' scale('+(fx.scale||1.05)+')';
          if(fx.opacity!=null && fx.opacity!==1) el.style.opacity = String(fx.opacity);
          if(fx.shadow && fx.shadow>0) el.style.boxShadow = '0 0 '+fx.shadow+'px '+(fx.shadowColor||'rgba(0,0,0,0.6)');
          if(fx.preset==='glow' && fx.color) el.style.boxShadow = '0 0 20px 6px '+fx.color;
          if(fx.preset==='lighter') el.style.filter = 'brightness(1.3)';
          if(fx.preset==='darker') el.style.filter = 'brightness(0.7)';
        });
        el.addEventListener('mouseleave', ()=>{
          el.style.transform = origTransform;
          el.style.opacity = ''; el.style.boxShadow = ''; el.style.filter = '';
        });
      }
    }catch(e){ console.warn('[19-hover] applyHoverFxPreview:', e.message); }
  };

  window.syncHoverFxUI = function(){
    const el = _sel(); if(!el) return;
    try{
      const fx = JSON.parse(el.dataset.hoverFx || '{}');
      const ids = {
        'hfx-on':      v=>v.checked=!!fx.enabled,
        'hfx-scale':   v=>v.value=fx.scale||1.05,
        'hfx-dur':     v=>v.value=fx.dur||0.2,
        'hfx-col':     v=>v.value=fx.color||'#ffffff',
        'hfx-col-hex': v=>v.value=fx.color||'',
        'hfx-op':      v=>v.value=fx.opacity!=null?fx.opacity:1,
        'hfx-shadow':  v=>v.value=fx.shadow||0,
        'hfx-scol':    v=>v.value=fx.shadowColor||'#000000',
        'hfx-scol-hex':v=>v.value=fx.shadowColor||'',
      };
      Object.entries(ids).forEach(([id, fn])=>{ try{ fn(document.getElementById(id)); }catch(e){} });
    }catch(e){}
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
