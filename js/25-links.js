// ══════════════ LINK MODAL ══════════════
// Независимый модуль.
(function(){
  let lmSel = -1;
  const _sel      = ()=> (typeof sel !== 'undefined') ? sel : null;
  const _save     = ()=> typeof save      === 'function' && save();
  const _saveState= ()=> typeof saveState === 'function' && saveState();
  const _toast    = (m,t)=> typeof toast  === 'function' && toast(m,t);
  const _slides   = ()=> (typeof slides !== 'undefined') ? slides : [];

  window.openLinkModal = function(){
    try{
      const el = _sel(); if(!el) return _toast('Select an element first');
      const link = el.dataset.link || '';
      const isSlide = link.startsWith('#slide-');
      const typeEl = document.getElementById('lm-type');
      const urlEl  = document.getElementById('lm-url');
      const tgtEl  = document.getElementById('lm-target');
      if(typeEl) typeEl.value = isSlide ? 'slide' : 'url';
      if(urlEl)  urlEl.value  = isSlide ? '' : link;
      if(tgtEl)  tgtEl.value  = el.dataset.linkt || '_blank';
      lmSel = isSlide ? parseInt(link.replace('#slide-',''))-1 : -1;
      onLMTypeChange(isSlide ? 'slide' : 'url');
      buildLMSlides();
      document.getElementById('link-modal').classList.add('open');
    }catch(e){ console.warn('[25-links] openLinkModal:', e.message); }
  };

  window.closeLinkModal = function(){
    try{ document.getElementById('link-modal').classList.remove('open'); }catch(e){}
  };

  window.onLMTypeChange = function(v){
    try{
      const uw = document.getElementById('lm-url-wrap');
      const sw = document.getElementById('lm-slide-wrap');
      if(uw) uw.style.display = v==='url'  ? 'flex'  : 'none';
      if(sw) sw.style.display = v==='slide' ? 'block' : 'none';
    }catch(e){}
  };

  window.buildLMSlides = function(){
    try{
      const c = document.getElementById('lm-slides'); if(!c) return;
      c.innerHTML = '';
      _slides().forEach((s,i)=>{
        const d = document.createElement('div');
        d.className = 'lsi' + (i===lmSel ? ' on' : '');
        d.textContent = (i+1) + '. ' + s.title;
        d.onclick = (function(idx){ return ()=>{ lmSel=idx; buildLMSlides(); }; })(i);
        c.appendChild(d);
      });
    }catch(e){ console.warn('[25-links] buildLMSlides:', e.message); }
  };

  window.applyLink = function(){
    try{
      const el = _sel(); if(!el) return;
      const typeEl = document.getElementById('lm-type');
      const urlEl  = document.getElementById('lm-url');
      const tgtEl  = document.getElementById('lm-target');
      const t = typeEl ? typeEl.value : 'url';
      const href = t==='url'
        ? (urlEl ? urlEl.value.trim() : '')
        : (lmSel>=0 ? '#slide-'+(lmSel+1) : '');
      if(href){ el.dataset.link=href; el.classList.add('has-link'); }
      else { delete el.dataset.link; el.classList.remove('has-link'); }
      el.dataset.linkt = tgtEl ? tgtEl.value : '_blank';
      const pl = document.getElementById('p-link'); if(pl) pl.value = href;
      _save(); _saveState(); closeLinkModal(); _toast('Link applied','ok');
    }catch(e){ console.warn('[25-links] applyLink:', e.message); }
  };

  window.removeLink = function(){
    try{
      const el = _sel(); if(!el) return;
      delete el.dataset.link; delete el.dataset.linkt;
      el.classList.remove('has-link');
      const pl = document.getElementById('p-link'); if(pl) pl.value = '';
      _save(); _saveState(); closeLinkModal();
    }catch(e){ console.warn('[25-links] removeLink:', e.message); }
  };
})();
