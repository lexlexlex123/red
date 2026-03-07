// ══════════════ TRANSITIONS ══════════════
(function(){
  const _save       = ()=> typeof save       === 'function' && save();
  const _saveState  = ()=> typeof saveState  === 'function' && saveState();
  const _drawThumbs = ()=> typeof drawThumbs === 'function' && drawThumbs();
  const _pushUndo   = ()=> typeof pushUndo   === 'function' && pushUndo();
  const _toast      = (m,t)=> typeof toast   === 'function' && toast(m,t);

  window.setGlobalTrans = function(t, btn){
    try{
      globalTrans = t || 'none';
      document.querySelectorAll('.tbtn2[data-t]').forEach(b=>b.classList.toggle('active', b===btn));
      _saveState();
      Bus && Bus.emit(Bus.EVENTS.TRANS_CHANGED, {global: t});
    }catch(e){ console.warn('[07-transitions] setGlobalTrans:', e.message); }
  };

  window.setSlideTrans = function(t){
    try{
      if(t===''||t==null) t='none';
      if(typeof slides !== 'undefined' && slides[cur]) slides[cur].trans = t;
      document.querySelectorAll('#slide-trans-grid .tbtn2[data-st]').forEach(b=>
        b.classList.toggle('active', b.dataset.st===t)
      );
      _saveState();
    }catch(e){ console.warn('[07-transitions] setSlideTrans:', e.message); }
  };

  window.setSlideAuto = function(v){
    try{
      if(typeof slides !== 'undefined' && slides[cur]) slides[cur].auto = v||0;
      _drawThumbs(); _saveState();
    }catch(e){ console.warn('[07-transitions] setSlideAuto:', e.message); }
  };

  window.applyTransToAll = function(){
    try{
      _pushUndo();
      const t   = (typeof globalTrans !== 'undefined' && globalTrans) ? globalTrans : 'none';
      const dur = (typeof transitionDur !== 'undefined') ? transitionDur : 500;
      if(typeof slides !== 'undefined')
        slides.forEach(s=>{ s.trans = t; s.transDur = dur; });
      // Синхронизируем кнопки панели свойств текущего слайда
      document.querySelectorAll('#slide-trans-grid .tbtn2[data-st]').forEach(b=>
        b.classList.toggle('active', b.dataset.st === t)
      );
      _saveState(); _drawThumbs();
      _toast('Переход «' + t + '» применён ко всем слайдам', 'ok');
    }catch(e){ console.warn('[07-transitions] applyTransToAll:', e.message); }
  };

  window.applyAutoToAll = function(){
    try{
      const el  = document.getElementById('auto-delay');
      const chk = document.getElementById('auto-adv-chk');
      const v   = el ? +el.value||5 : 5;
      const on  = chk ? chk.checked : false;
      _pushUndo();
      if(typeof slides !== 'undefined') slides.forEach(s=>s.auto = on ? v : 0);
      _saveState(); _drawThumbs();
      _toast((on ? 'Auto '+v+'s' : 'Auto-off')+' applied to all', 'ok');
    }catch(e){ console.warn('[07-transitions] applyAutoToAll:', e.message); }
  };

  window.toggleAutoAdv = function(on){
    try{
      if(!on && typeof slides !== 'undefined'){
        slides.forEach(s=>s.auto=0); _drawThumbs(); _saveState();
      }
    }catch(e){ console.warn('[07-transitions] toggleAutoAdv:', e.message); }
  };
})();
