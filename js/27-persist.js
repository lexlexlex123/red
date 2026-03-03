// ══════════════ PERSIST ══════════════
function saveState(){
  try{localStorage.setItem('sf_v4',JSON.stringify({slides,cur,ar,canvasW,canvasH,globalTrans,transitionDur,autoDelay,ec,title:document.getElementById('pres-title').value}));}catch(e){}
}
function loadState(){
  try{
    const raw=localStorage.getItem('sf_v4');if(!raw)return;
    const s=JSON.parse(raw);slides=s.slides||[];cur=s.cur||0;ar=s.ar||'16:9';
    canvasW=s.canvasW||1200;canvasH=s.canvasH||(ar==='4:3'?900:675);
    globalTrans=s.globalTrans||'none';transitionDur=s.transitionDur||500;autoDelay=s.autoDelay||5;ec=s.ec||0;
    document.getElementById('canvas').style.width=canvasW+'px';document.getElementById('canvas').style.height=canvasH+'px';
    document.querySelectorAll('.ar-btn').forEach(b=>b.classList.toggle('active',b.textContent===ar));
    if(s.title)document.getElementById('pres-title').value=s.title;
    if(slides.length)toast('Session restored');
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
