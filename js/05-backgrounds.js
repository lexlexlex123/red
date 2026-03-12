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
  if(s.bg==='custom'||s.bg==='theme'){
    // 'theme' legacy value — treat same as custom
    const theme=(typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)?THEMES[appliedThemeIdx]:null;
    const fallback=theme?theme.bg:'#1a1a2e';
    el.style.background=s.bgc||fallback;hilBg(null);
  }
  else{const bg=BGS.find(b=>b.id===s.bg);el.style.background=bg?bg.s:'#ddd';hilBg(s.bg);}
  syncSlideBgPreview();
}

function setSlideBgFromPalette(c, schemeRef){
  slides[cur].bgScheme = schemeRef || null;
  setCustomBg(c);
  const sw = document.getElementById('slide-bg-preview');
  if(sw) sw.style.background = c;
}

function resetSlideBgToTheme(){
  const theme = (typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0) ? THEMES[appliedThemeIdx] : null;
  const bgVal = theme ? theme.bg : '#1a1a2e';
  slides[cur].bg = 'custom';
  slides[cur].bgc = bgVal;
  delete slides[cur].bgScheme;
  document.getElementById('cvbg').style.background = bgVal;
  hilBg(null);
  const sw = document.getElementById('slide-bg-preview');
  if(sw){
    const hex = bgVal.match(/#[0-9a-fA-F]{6}/);
    sw.style.background = hex ? hex[0] : bgVal;
  }
  save(); drawThumbs(); saveState();
}

function syncSlideBgPreview(){
  const s = slides[cur]; if(!s) return;
  const sw = document.getElementById('slide-bg-preview'); if(!sw) return;
  if(s.bg === 'custom' && s.bgc){
    const hex = s.bgc.match(/#[0-9a-fA-F]{6}/);
    sw.style.background = hex ? hex[0] : (s.bgc.includes('gradient') ? s.bgc : s.bgc);
  } else {
    sw.style.background = '';
  }
}

