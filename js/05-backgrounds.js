// ══════════════ BACKGROUND ══════════════
function applyBgId(id){
  const bg=BGS.find(b=>b.id===id);
  document.getElementById('cvbg').style.background=bg?bg.s:'#fff';
  slides[cur].bg=id;slides[cur].bgc=null;hilBg(id);save();drawThumbs();saveState();
}
function setCustomBg(c){
  document.getElementById('cvbg').style.background=c;
  slides[cur].bg='custom';slides[cur].bgc=c;hilBg(null);save();drawThumbs();saveState();
}
function hilBg(id){document.querySelectorAll('.bgsw').forEach(d=>d.classList.toggle('on',d.dataset.id===id));}
function loadBg(s){
  const el=document.getElementById('cvbg');
  if(s.bg==='custom'){el.style.background=s.bgc||'#fff';hilBg(null);}
  else{const bg=BGS.find(b=>b.id===s.bg);el.style.background=bg?bg.s:'#ddd';hilBg(s.bg);}
}
