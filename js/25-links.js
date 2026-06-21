// ══════════════ LINK MODAL ══════════════
// Независимый модуль.
(function(){
  let lmSel = -1;
  const _sel      = ()=> (typeof sel !== 'undefined') ? sel : null;
  const _save     = ()=> typeof save      === 'function' && save();
  const _saveState= ()=> typeof saveState === 'function' && saveState();
  const _toast    = (m,t)=> typeof toast  === 'function' && toast(m,t);
  const _slides   = ()=> (typeof slides !== 'undefined') ? slides : [];

  const SLIDE_NAV_LINKS = {
    'slide-next':  '#slide-next',
    'slide-prev':  '#slide-prev',
    'slide-first': '#slide-first',
    'slide-last':  '#slide-last',
  };

  function _linkTypeFromHref(link) {
    if (!link) return 'url';
    if (link === '#slide-next')  return 'slide-next';
    if (link === '#slide-prev')  return 'slide-prev';
    if (link === '#slide-first') return 'slide-first';
    if (link === '#slide-last')  return 'slide-last';
    if (link.startsWith('#slide-')) return 'slide';
    return 'url';
  }

  window._resolveSlideLinkIndex = function(link, curIdx, count) {
    if (!link || !link.startsWith('#slide-')) return null;
    count = Math.max(0, +count || 0);
    if (!count) return null;
    curIdx = Math.max(0, Math.min(+curIdx || 0, count - 1));
    const spec = link.slice(7);
    if (spec === 'next')  return Math.min(curIdx + 1, count - 1);
    if (spec === 'prev')  return Math.max(curIdx - 1, 0);
    if (spec === 'first') return 0;
    if (spec === 'last')  return count - 1;
    const n = parseInt(spec, 10);
    if (!isNaN(n) && n >= 1 && n <= count) return n - 1;
    return null;
  };

  window._followSlideLink = function(link, curIdx) {
    if (!link || !link.startsWith('#slide-')) return false;
    const count = _slides().length;
    if (!count) return false;
    curIdx = typeof curIdx === 'number' ? curIdx : (typeof cur !== 'undefined' ? cur : 0);

    if (link === '#slide-next' && typeof nextPreview === 'function') {
      if (typeof clearAutoTimer === 'function') clearAutoTimer();
      nextPreview();
      return true;
    }
    if (link === '#slide-prev' && typeof prevPreview === 'function') {
      if (typeof clearAutoTimer === 'function') clearAutoTimer();
      prevPreview();
      return true;
    }

    const si = window._resolveSlideLinkIndex(link, curIdx, count);
    if (si == null || si < 0 || si >= count) return false;
    if (typeof clearAutoTimer === 'function') clearAutoTimer();
    if (typeof gotoPreviewSlide === 'function') {
      gotoPreviewSlide(si);
      return true;
    }
    if (typeof gotoPreview === 'function') gotoPreview(si, si > curIdx ? 'next' : 'prev');
    return true;
  };

  window.openLinkModal = function(){
    try{
      const el = _sel(); if(!el) return _toast('Select an element first');
      const link = el.dataset.link || '';
      const linkType = _linkTypeFromHref(link);
      const typeEl = document.getElementById('lm-type');
      const urlEl  = document.getElementById('lm-url');
      const tgtEl  = document.getElementById('lm-target');
      if(typeEl) typeEl.value = linkType;
      if(urlEl)  urlEl.value  = linkType === 'url' ? link : '';
      if(tgtEl)  tgtEl.value  = el.dataset.linkt || '_blank';
      lmSel = linkType === 'slide' ? parseInt(link.replace('#slide-',''), 10) - 1 : -1;
      onLMTypeChange(linkType);
      if (linkType === 'slide') buildLMSlides();
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
      const tw = document.getElementById('lm-target-wrap');
      if(uw) uw.style.display = v === 'url' ? 'flex' : 'none';
      if(sw) sw.style.display = v === 'slide' ? 'block' : 'none';
      if(tw) tw.style.display = v === 'url' ? '' : 'none';
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
      let href = '';
      if (t === 'url') {
        href = urlEl ? urlEl.value.trim() : '';
      } else if (SLIDE_NAV_LINKS[t]) {
        href = SLIDE_NAV_LINKS[t];
      } else if (t === 'slide') {
        href = lmSel >= 0 ? '#slide-' + (lmSel + 1) : '';
      }
      if(href){ el.dataset.link=href; el.classList.add('has-link'); }
      else { delete el.dataset.link; el.classList.remove('has-link'); }
      if (t === 'url') el.dataset.linkt = tgtEl ? tgtEl.value : '_blank';
      else delete el.dataset.linkt;
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
