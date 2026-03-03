// ══════════════ TRANSITIONS ══════════════
function setGlobalTrans(t,btn){
  globalTrans=t;document.querySelectorAll('.tbtn2[data-t]').forEach(b=>b.classList.toggle('active',b===btn));saveState();
}
function setSlideTrans(t){if(!slides[cur])return;slides[cur].trans=t;saveState();}
function setSlideAuto(v){slides[cur].auto=v||0;drawThumbs();saveState();}
function applyTransToAll(){pushUndo();slides.forEach(s=>s.trans=globalTrans);saveState();drawThumbs();toast('Transition applied to all','ok');}
function applyAutoToAll(){
  const v=+document.getElementById('auto-delay').value||5;const on=document.getElementById('auto-adv-chk').checked;
  pushUndo();slides.forEach(s=>s.auto=on?v:0);saveState();drawThumbs();
  toast((on?'Auto '+v+'s':'Auto-off')+' applied to all','ok');
}
function toggleAutoAdv(on){if(!on){slides.forEach(s=>s.auto=0);drawThumbs();saveState();}}


const TRANS_LIST=[
  {id:'none',label:'None'},{id:'fade',label:'Fade'},{id:'slide',label:'Slide'},
  {id:'push',label:'Push'},{id:'zoom',label:'Zoom'},{id:'flip',label:'Flip'},
  {id:'cube',label:'Cube'},{id:'curtain',label:'Curtain'},{id:'swipe',label:'Swipe'},
  {id:'spiral',label:'Spiral'},{id:'glitch',label:'Glitch'},{id:'ripple',label:'Ripple'},
  {id:'dissolve',label:'Dissolve'},{id:'morph',label:'Morph'},
];
function buildSlidePropTransBtns(){
  const wrap=document.getElementById('slide-trans-btns');
  if(!wrap)return;
  wrap.innerHTML='';
  const curT=(slides[cur]&&slides[cur].trans!=null)?slides[cur].trans:'none';
  TRANS_LIST.forEach(t=>{
    const b=document.createElement('button');
    b.className='tbtn2'+(curT===t.id?' active':'');
    b.textContent=t.label;
    b.onclick=()=>{setSlideTrans(t.id);wrap.querySelectorAll('.tbtn2').forEach(x=>x.classList.remove('active'));b.classList.add('active');};
    wrap.appendChild(b);
  });
  const dur=(slides[cur]&&slides[cur].transDur)||500;
  const map={250:'spd-fast',500:'spd-norm',800:'spd-slow',1200:'spd-vslow'};
  ['spd-fast','spd-norm','spd-slow','spd-vslow'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
  const spdEl=document.getElementById(map[dur]||'spd-norm');if(spdEl)spdEl.classList.add('active');
}
function setSlideTransDur(dur,btn){
  if(!slides[cur])return;slides[cur].transDur=dur;
  document.querySelectorAll('#spd-fast,#spd-norm,#spd-slow,#spd-vslow').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');saveState();
}
