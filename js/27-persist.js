// ══════════════ PERSIST ══════════════
// save()      — DOM → slides[cur].els  (fast, no I/O)
// saveState() — slides[] → localStorage (I/O, call sparingly)
// commitAll() — save() + saveState()   (full flush, use on mouseup / before F5)

function saveState(){
  const _pn=typeof pnGetSettings==='function'?pnGetSettings():null;
  // Strip heavy svgContent from icon elements before saving — always rebuilt from iconId on load
  const slidesClean = slides.map(s=>({
    ...s,
    els: (s.els||[]).map(d=>{
      if(d.type==='icon'){
        // Keep svgContent only if fitted (tight viewBox) — it's needed to restore correctly
        if(d.iconFitted&&d.svgContent) return d;
        const {svgContent,...rest}=d; return rest;
      }
      // Strip inline SVG from list bullet markers to save space — rebuilt from data-icon-* attrs
      if(d.type==='text'&&d.html&&d.html.includes('data-list-bullet')){
        const tmp=document.createElement('div'); tmp.innerHTML=d.html;
        tmp.querySelectorAll('span[data-list-bullet]').forEach(sp=>{
          // Keep only the span with attrs, remove heavy SVG innerHTML
          const iconId=sp.getAttribute('data-icon-id')||'';
          const iconStyle=sp.getAttribute('data-icon-style')||'stroke';
          const iconColor=sp.getAttribute('data-icon-color')||'currentColor';
          const iconSw=sp.getAttribute('data-icon-sw')||'1.8';
          sp.innerHTML=''; // SVG rebuilt on render
          sp.setAttribute('data-icon-id',iconId);
          sp.setAttribute('data-icon-style',iconStyle);
          sp.setAttribute('data-icon-color',iconColor);
          sp.setAttribute('data-icon-sw',iconSw);
        });
        return {...d, html:tmp.innerHTML};
      }
      return d;
    })
  }));
  try{localStorage.setItem('sf_v4',JSON.stringify({
    slides:slidesClean,cur,ar,canvasW,canvasH,globalTrans,transitionDur,autoDelay,ec,
    appliedThemeIdx,
    selLayout:(typeof selLayout!=='undefined'?selLayout:-1),
    layoutAnimated:(typeof _layoutAnimated!=='undefined'?_layoutAnimated:true),
    decorPausedAt:(typeof _decorPausedAt!=='undefined'?Array.from(_decorPausedAt.entries()):[]),
    title:document.getElementById('pres-title').value,
    pnSettings:_pn
  }));}catch(e){console.warn('saveState failed:',e);}
}

// Full commit: flush DOM→data then data→localStorage
function commitAll(){
  save();
  drawThumbs();
  saveState();
}

function loadState(){
  try{
    const raw=localStorage.getItem('sf_v4');if(!raw)return;
    const s=JSON.parse(raw);
    slides=s.slides||[];cur=s.cur||0;ar=s.ar||'16:9';
    canvasW=s.canvasW||1200;canvasH=s.canvasH||(ar==='4:3'?900:675);
    globalTrans=s.globalTrans||'none';transitionDur=s.transitionDur||500;
    autoDelay=s.autoDelay||5;ec=s.ec||0;
    document.getElementById('canvas').style.width=canvasW+'px';
    document.getElementById('canvas').style.height=canvasH+'px';
    document.querySelectorAll('.ar-btn').forEach(b=>b.classList.toggle('active',b.textContent===ar));
    if(s.title)document.getElementById('pres-title').value=s.title;
    if(s.appliedThemeIdx!=null)appliedThemeIdx=s.appliedThemeIdx;
    if(s.selLayout!=null&&typeof selLayout!=='undefined')selLayout=s.selLayout;
    if(s.layoutAnimated!=null&&typeof setLayoutAnimated==='function'){
      // Восстанавливаем флаг анимации декора без перерисовки (рендер произойдёт позже в boot)
      if(typeof _layoutAnimated!=='undefined') _layoutAnimated=s.layoutAnimated;
    }
    if(s.decorPausedAt&&typeof _decorPausedAt!=='undefined'){
      _decorPausedAt.clear();
      s.decorPausedAt.forEach(function(e){_decorPausedAt.set(e[0],e[1]);});
    }
    if(typeof pnGetSettings==='function'&&s.pnSettings){
      const defaults=pnGetSettings();
      pnSettings=Object.assign({},defaults,s.pnSettings);
    }
    if(slides.length)toast(t('toastRestored'));
    // Restore active tab after render completes
    try{
      const savedTab=localStorage.getItem('sf_active_tab')||'home';
      if(savedTab&&savedTab!=='home'){
        setTimeout(()=>{
          const tabBtn=[...document.querySelectorAll('.rtab')].find(b=>{
            const m=(b.getAttribute('onclick')||'').match(/switchTab\('(\w+)'/);
            return m&&m[1]===savedTab;
          });
          if(tabBtn) tabBtn.click();
        }, 200);
      }
    }catch(e){}
  }catch(e){slides=[];}
}

// ══════════════ UTILS ══════════════
function showLoading(msg,pct){document.getElementById('loading').classList.add('show');if(msg)document.getElementById('load-msg').textContent=msg;if(pct!==undefined)document.getElementById('load-bar-inner').style.width=pct+'%';}
function hideLoading(){document.getElementById('load-bar-inner').style.width='100%';setTimeout(()=>{document.getElementById('loading').classList.remove('show');document.getElementById('load-bar-inner').style.width='0%';},400);}
function dl(content,filename,type){const b=new Blob([content],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=filename;a.click();}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
let toastTimer;
function toast(msg,type){const t=document.getElementById('toast');t.textContent=msg;t.className=(type==='ok'?'show ok':'show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{t.className='';},3600);}
// ══════════════ SETTINGS & THEME ══════════════
function openSettings(){
  const modal=document.getElementById('settings-modal');modal.classList.add('open');
  const isDark=!document.documentElement.classList.contains('light');
  document.getElementById('theme-dark').classList.toggle('active',isDark);
  document.getElementById('theme-light').classList.toggle('active',!isDark);
  document.getElementById('settings-snap').checked=document.getElementById('snap-chk').checked;
  syncLangButtons();
  const vEl=document.getElementById('settings-version');
  const aEl=document.getElementById('settings-author');
  if(vEl)vEl.textContent=APP_VERSION;
  if(aEl)aEl.textContent=APP_AUTHOR;
}
function closeSettings(){document.getElementById('settings-modal').classList.remove('open');}
function setTheme(t){
  if(t==='light'){document.documentElement.classList.add('light');}
  else{document.documentElement.classList.remove('light');}
  localStorage.setItem('sf-theme',t);
  document.getElementById('theme-dark').classList.toggle('active',t==='dark');
  document.getElementById('theme-light').classList.toggle('active',t==='light');
}
(function(){const t=localStorage.getItem('sf-theme')||'dark';if(t==='light')document.documentElement.classList.add('light');})();
document.getElementById('settings-modal').addEventListener('click',e=>{if(e.target===document.getElementById('settings-modal'))closeSettings();});
