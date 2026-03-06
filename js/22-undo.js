// ══════════════ UNDO/REDO ══════════════
// Независимый модуль. Не вызывает другие модули напрямую.
(function(){
  const _maxSteps = ()=> (typeof window._CFG_UNDO_MAX !== 'undefined') ? window._CFG_UNDO_MAX : 40;

  window._snapState = function(){
    try{
      return JSON.stringify({
        slides, cur, ar, canvasW, canvasH, globalTrans, transitionDur, autoDelay,
        pnSettings: typeof pnSettings !== 'undefined' ? pnSettings : null,
      });
    }catch(e){ return '{}'; }
  };

  window.pushUndo = function(){
    try{
      if(typeof save === 'function') save();
      undoStack.push(_snapState());
      if(undoStack.length > _maxSteps()) undoStack.shift();
      redoStack = [];
    }catch(e){ console.warn('[22-undo] pushUndo:', e.message); }
  };

  window.doUndo = function(){
    try{
      if(!undoStack.length){ if(typeof toast==='function') toast('Nothing to undo'); return; }
      redoStack.push(_snapState());
      restoreSnap(JSON.parse(undoStack.pop()));
    }catch(e){ console.warn('[22-undo] doUndo:', e.message); }
  };

  window.doRedo = function(){
    try{
      if(!redoStack.length){ if(typeof toast==='function') toast('Nothing to redo'); return; }
      undoStack.push(_snapState());
      restoreSnap(JSON.parse(redoStack.pop()));
    }catch(e){ console.warn('[22-undo] doRedo:', e.message); }
  };

  window.restoreSnap = function(s){
    try{
      slides=s.slides; cur=s.cur; ar=s.ar||'16:9';
      canvasW=s.canvasW||1200; canvasH=s.canvasH||675;
      globalTrans=s.globalTrans||'none'; transitionDur=s.transitionDur||500;
      if(s.pnSettings && typeof pnGetSettings==='function'){
        const def=pnGetSettings(); pnSettings=Object.assign({},def,s.pnSettings);
      }
      const cv=document.getElementById('canvas');
      if(cv){ cv.style.width=canvasW+'px'; cv.style.height=canvasH+'px'; }
      if(typeof renderAll==='function') renderAll();
      if(typeof saveState==='function') saveState();
      if(typeof pnSyncUI==='function') pnSyncUI();
    }catch(e){ console.warn('[22-undo] restoreSnap:', e.message); }
  };

  // Подписка на шину
  if(window.Bus){
    Bus.on(Bus.EVENTS.UNDO_PUSH, ()=>{ if(typeof pushUndo==='function') pushUndo(); }, '22-undo');
  }
})();
