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

  function _linkTargets(el) {
    if (!el) return [];
    const gid = el.dataset && el.dataset.groupId;
    if (!gid) return [el];
    const canvas = document.getElementById('canvas');
    if (!canvas) return [el];
    const members = Array.from(canvas.querySelectorAll('.el[data-group-id="' + gid + '"]'));
    return members.length ? members : [el];
  }

  function _readGroupLink(el, key) {
    if (!el) return '';
    key = key || 'link';
    if (el.dataset[key]) return el.dataset[key];
    const gid = el.dataset.groupId;
    if (!gid) return key === 'linkt' ? '_blank' : '';
    const canvas = document.getElementById('canvas');
    if (!canvas) return key === 'linkt' ? '_blank' : '';
    const mates = canvas.querySelectorAll('.el[data-group-id="' + gid + '"]');
    for (let i = 0; i < mates.length; i++) {
      if (mates[i].dataset[key]) return mates[i].dataset[key];
    }
    return key === 'linkt' ? '_blank' : '';
  }

  function _setLinkOnTargets(targets, href, linkt, isUrl) {
    targets.forEach(function(tel) {
      if (href) {
        tel.dataset.link = href;
        tel.classList.add('has-link');
      } else {
        delete tel.dataset.link;
        tel.classList.remove('has-link');
      }
      if (isUrl) tel.dataset.linkt = linkt || '_blank';
      else delete tel.dataset.linkt;
    });
  }

  window._resolveSlideLinkIndex = function(link, curIdx, count) {
    const list = _slides();
    count = count != null ? Math.max(0, +count || 0) : list.length;
    if (!link || !link.startsWith('#slide-')) return null;
    if (!count) return null;
    curIdx = Math.max(0, Math.min(+curIdx || 0, count - 1));
    const spec = link.slice(7);
    if (spec === 'next')  return Math.min(curIdx + 1, count - 1);
    if (spec === 'prev')  return Math.max(curIdx - 1, 0);
    if (spec === 'first') return 0;
    if (spec === 'last')  return count - 1;
    const n = parseInt(spec, 10);
    if (!isNaN(n) && String(n) === spec && n >= 1 && n <= count) return n - 1;
    let name = spec;
    try { name = decodeURIComponent(spec); } catch (e) {}
    if (typeof window.findSlideIndexByTitle === 'function') {
      const byName = window.findSlideIndexByTitle(name, list);
      if (byName != null) return byName;
    }
    const norm = (name || '').trim().toLowerCase();
    for (let i = 0; i < list.length; i++) {
      const t = typeof window.getSlideDisplayTitle === 'function'
        ? window.getSlideDisplayTitle(list[i], i)
        : ((list[i].title || '').trim() || ('Slide ' + (i + 1)));
      if (t.trim().toLowerCase() === norm) return i;
    }
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
      const link = _readGroupLink(el, 'link');
      const linkType = _linkTypeFromHref(link);
      const typeEl = document.getElementById('lm-type');
      const urlEl  = document.getElementById('lm-url');
      const tgtEl  = document.getElementById('lm-target');
      if(typeEl) typeEl.value = linkType;
      if(urlEl)  urlEl.value  = linkType === 'url' ? link : '';
      if(tgtEl)  tgtEl.value  = _readGroupLink(el, 'linkt');
      lmSel = linkType === 'slide' ? window._resolveSlideLinkIndex(link, typeof cur !== 'undefined' ? cur : 0, _slides().length) : -1;
      if (lmSel == null) lmSel = -1;
      onLMTypeChange(linkType);
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
      if (v === 'slide') {
        if (lmSel < 0) lmSel = (typeof cur !== 'undefined' ? cur : 0);
        buildLMSlides();
      }
    }catch(e){}
  };

  window.buildLMSlides = function(){
    try{
      const c = document.getElementById('lm-slides'); if(!c) return;
      c.innerHTML = '';
      _slides().forEach((s,i)=>{
        const d = document.createElement('div');
        d.className = 'lsi' + (i===lmSel ? ' on' : '');
        const title = typeof window.getSlideDisplayTitle === 'function'
          ? window.getSlideDisplayTitle(s, i)
          : ((s.title || '').trim() || fb);
        d.textContent = (i+1) + '. ' + title;
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
        href = lmSel >= 0
          ? (typeof window.slideLinkHrefForIndex === 'function' ? window.slideLinkHrefForIndex(lmSel) : '#slide-' + (lmSel + 1))
          : '';
      }
      if(href){ _setLinkOnTargets(_linkTargets(el), href, tgtEl ? tgtEl.value : '_blank', t === 'url'); }
      else { _setLinkOnTargets(_linkTargets(el), '', null, false); }
      const pl = document.getElementById('p-link'); if(pl) pl.value = href;
      _save(); _saveState(); closeLinkModal(); _toast('Link applied','ok');
    }catch(e){ console.warn('[25-links] applyLink:', e.message); }
  };

  window.removeLink = function(){
    try{
      const el = _sel(); if(!el) return;
      _setLinkOnTargets(_linkTargets(el), '', null, false);
      const pl = document.getElementById('p-link'); if(pl) pl.value = '';
      _save(); _saveState(); closeLinkModal();
    }catch(e){ console.warn('[25-links] removeLink:', e.message); }
  };

  window._readGroupLinkFromEl = function(el, key) { return _readGroupLink(el, key); };
  window._linkTargetsForEl = function(el) { return _linkTargets(el); };
})();
