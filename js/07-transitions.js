// ══════════════ TRANSITIONS ══════════════
function setGlobalTrans(t,btn){
  globalTrans=t;document.querySelectorAll('.tbtn2[data-t]').forEach(b=>b.classList.toggle('active',b===btn));saveState();
}
function setSlideTrans(t){slides[cur].trans=t;saveState();}
function setSlideAuto(v){slides[cur].auto=v||0;drawThumbs();saveState();}
function applyTransToAll(){pushUndo();slides.forEach(s=>s.trans=globalTrans);saveState();drawThumbs();toast('Transition applied to all','ok');}
function applyAutoToAll(){
  const v=+document.getElementById('auto-delay').value||5;const on=document.getElementById('auto-adv-chk').checked;
  pushUndo();slides.forEach(s=>s.auto=on?v:0);saveState();drawThumbs();
  toast((on?'Auto '+v+'s':'Auto-off')+' applied to all','ok');
}
function toggleAutoAdv(on){if(!on){slides.forEach(s=>s.auto=0);drawThumbs();saveState();}}
