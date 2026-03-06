// ══════════════ APPLETS ══════════════

// Get current theme palette (fallback to dark defaults)
function _appletTheme(){
  const ti=typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0?appliedThemeIdx
          :(typeof selTheme!=='undefined'&&selTheme>=0?selTheme:-1);
  if(ti>=0&&typeof THEMES!=='undefined'&&THEMES[ti]){
    const t=THEMES[ti];
    return {
      ac1:   t.ac1      ||'#6366f1',
      ac2:   t.ac2      ||'#818cf8',
      ac3:   t.ac3      ||'#c7d2fe',
      text:  t.bodyColor||'#e2e8f0',
      head:  t.headingColor||t.ac1||'#818cf8',
      btn:   t.shapeFill||t.ac1||'#6366f1',
      dark:  t.dark!==false,
    };
  }
  return {ac1:'#6366f1',ac2:'#818cf8',ac3:'#c7d2fe',text:'#e2e8f0',head:'#a5b4fc',btn:'#6366f1',dark:true};
}

// ── CALCULATOR ──
function getCalcHTML(p){
  p=p||_appletTheme();
  // Derive all colors dynamically from theme palette
  function hexRGB(h){h=(h||'#6366f1').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function rgba(hex,a){try{const[r,g,b]=hexRGB(hex);return`rgba(${r},${g},${b},${a})`;}catch(e){return hex;}}
  const isDark = p.dark !== false;
  const bg      = 'transparent';
  const surface1= rgba(p.ac1, isDark ? 0.18 : 0.13);
  const dispBg  = rgba(p.ac1, isDark ? 0.28 : 0.20);
  const dispClr = p.text;
  const btnBase = rgba(p.ac1, isDark ? 0.20 : 0.15);
  const btnHov  = rgba(p.ac1, isDark ? 0.35 : 0.28);
  const btnTxt  = p.text;
  const opClr   = p.ac1;
  const opHov   = p.ac2;
  const eqClr   = p.btn;
  const eqHov   = p.ac2;
  const clrClr  = '#ef4444';

  return `<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;}
html{width:100%;height:100%;background:transparent;overflow:hidden;}body{width:100%;height:100%;background:transparent;overflow:hidden;}
.calc{
  position:absolute;inset:0;
  background:${surface1};
  padding:clamp(6px,2.5vw,16px);
  display:flex;flex-direction:column;gap:clamp(4px,1.8vw,10px);
  backdrop-filter:blur(12px);
  border:1px solid ${p.ac1}33;
  box-shadow:0 8px 32px rgba(0,0,0,.35);
}
.disp{
  background:${dispBg};
  color:${dispClr};
  font-size:clamp(20px,8vw,48px);
  padding:0 clamp(10px,3vw,18px);
  border-radius:clamp(4px,1.5vw,10px);
  text-align:right;
  min-height:clamp(54px,17%,86px);
  word-break:break-all;
  font-family:monospace;
  letter-spacing:.02em;
  border:1px solid ${p.ac1}22;
  flex-shrink:0;
  display:flex;align-items:center;justify-content:flex-end;
}
.btns{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:clamp(4px,1.8vw,10px);
  flex:1;
}
.btn{
  background:${btnBase};
  color:${btnTxt};
  border:1px solid ${p.ac1}18;
  border-radius:clamp(3px,1.2vw,8px);
  font-size:clamp(11px,3.8vw,22px);
  cursor:pointer;
  transition:.1s;
  font-weight:500;
  display:flex;align-items:center;justify-content:center;
}
.btn:hover{background:${btnHov};}
.btn:active{transform:scale(.94);}
.btn.op{color:${opClr};border-color:${opClr}44;font-weight:600;}
.btn.op:hover{background:${opClr}22;}
.btn.eq{background:${eqClr};color:#fff;border-color:transparent;font-weight:700;}
.btn.eq:hover{background:${eqHov};}
.btn.clear{color:${clrClr};border-color:${clrClr}44;}
.btn.clear:hover{background:${clrClr}22;}
</style>
<div class="calc">
  <div class="disp" id="d">0</div>
  <div class="btns">
    <button class="btn clear" onclick="cc()">C</button>
    <button class="btn op"    onclick="op('sign')">±</button>
    <button class="btn op"    onclick="op('%')">%</button>
    <button class="btn op"    onclick="op('/')">÷</button>
    <button class="btn"       onclick="n('7')">7</button>
    <button class="btn"       onclick="n('8')">8</button>
    <button class="btn"       onclick="n('9')">9</button>
    <button class="btn op"    onclick="op('*')">×</button>
    <button class="btn"       onclick="n('4')">4</button>
    <button class="btn"       onclick="n('5')">5</button>
    <button class="btn"       onclick="n('6')">6</button>
    <button class="btn op"    onclick="op('-')">−</button>
    <button class="btn"       onclick="n('1')">1</button>
    <button class="btn"       onclick="n('2')">2</button>
    <button class="btn"       onclick="n('3')">3</button>
    <button class="btn op"    onclick="op('+')">+</button>
    <button class="btn"       style="grid-column:span 2" onclick="n('0')">0</button>
    <button class="btn"       onclick="n('.')">.</button>
    <button class="btn eq"    onclick="eq()">=</button>
  </div>
</div>
<script>
let cv='0',pv='',o='',nr=false;
const d=()=>document.getElementById('d').textContent=cv;
function n(v){if(nr){cv=v==='.'?'0.':v;nr=false;}else cv=cv==='0'&&v!=='.'?v:cv.length>14?cv:cv+v;d();}
function op(v){
  if(o&&!nr)try{cv=String(eval(pv+o+cv));}catch(e){}
  if(v==='sign'){cv=String(-parseFloat(cv));d();return;}
  if(v==='%'){cv=String(parseFloat(cv)/100);d();return;}
  pv=cv;o=v;nr=true;d();
}
function eq(){if(!o)return;try{cv=String(eval(pv+o+cv));}catch(e){cv='Err';}o='';pv='';nr=true;d();}
function cc(){cv='0';pv='';o='';nr=false;d();}
<\/script>`;
}

function getClockHTML(){return `<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#0d0d1a;display:flex;justify-content:center;align-items:center;height:100vh;font-family:'JetBrains Mono',monospace;}.wrap{text-align:center;}.time{font-size:clamp(18px,8vw,48px);color:#06b6d4;font-weight:700;letter-spacing:2px;text-shadow:0 0 20px rgba(6,182,212,.5);}.date{font-size:clamp(9px,3vw,14px);color:#64748b;margin-top:6px;letter-spacing:1px;}</style><div class="wrap"><div class="time" id="t"></div><div class="date" id="d"></div></div><script>function u(){const n=new Date();document.getElementById('t').textContent=n.toLocaleTimeString();document.getElementById('d').textContent=n.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});}u();setInterval(u,1000);<\/script>`;}
function getTimerHTML(){return `<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#0d0d1a;display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui,sans-serif;}.w{text-align:center;padding:10px;}.d{font-size:clamp(20px,8vw,52px);color:#f59e0b;font-weight:700;font-family:monospace;text-shadow:0 0 20px rgba(245,158,11,.3);margin-bottom:10px;}.row{display:flex;gap:6px;justify-content:center;align-items:center;margin-bottom:8px;}.inp{width:54px;background:#1e1e2e;border:1px solid #3a3a5c;color:#e0e0e0;border-radius:4px;padding:4px 6px;font-size:13px;text-align:center;font-family:monospace;}.btn{background:#f59e0b;color:#000;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;font-weight:600;font-size:11px;}.btn.stop{background:#ef4444;color:#fff;}.btn.rst{background:#374151;color:#e0e0e0;}</style><div class="w"><div class="d" id="d">00:00</div><div class="row"><input class="inp" id="m" type="number" value="5" min="0" max="99" placeholder="MM"><span style="color:#64748b">:</span><input class="inp" id="s" type="number" value="0" min="0" max="59" placeholder="SS"></div><div class="row"><button class="btn" onclick="go()">Start</button><button class="btn stop" onclick="pa()">Pause</button><button class="btn rst" onclick="rs()">Reset</button></div></div><script>let t=null,rem=0;const d=document.getElementById('d');function fmt(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}function go(){if(t)return;if(!rem){rem=(+document.getElementById('m').value*60)+(+document.getElementById('s').value)||300;}t=setInterval(()=>{rem--;d.textContent=fmt(rem);if(rem<=0){clearInterval(t);t=null;d.textContent='00:00';d.style.color='#ef4444';}},1000);}function pa(){clearInterval(t);t=null;}function rs(){pa();rem=0;d.textContent='00:00';d.style.color='#f59e0b';}<\/script>`;}
function getNotesHTML(){return `<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#fef3c7;margin:0;height:100vh;display:flex;flex-direction:column;}#hdr{background:#f59e0b;padding:6px 10px;font-weight:700;font-size:12px;color:#1a1a1a;display:flex;justify-content:space-between;align-items:center;}#ta{flex:1;border:none;background:transparent;resize:none;padding:10px;font-size:13px;color:#1a1a1a;font-family:inherit;line-height:1.6;}#ta:focus{outline:none;}</style><div id="hdr"><span>📝 Notes</span><input type="color" value="#fef3c7" onchange="document.body.style.background=this.value" style="width:22px;height:18px;border:none;background:none;cursor:pointer;padding:0" title="BG color"></div><textarea id="ta" placeholder="Click to type…"></textarea>`;}
function getChartHTML(){return `<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#0d1117;font-family:system-ui,sans-serif;padding:12px;height:100vh;display:flex;flex-direction:column;gap:8px;}h4{color:#e2e8f0;font-size:11px;text-align:center;}#chart{flex:1;display:flex;align-items:flex-end;gap:4px;padding:0 4px 20px;position:relative;}#chart::before{content:'';position:absolute;bottom:20px;left:0;right:0;border-top:1px solid #252529;}#chart::after{content:'';position:absolute;top:0;left:0;right:0;bottom:20px;background:repeating-linear-gradient(to bottom,transparent,transparent calc(20%-1px),#ffffff08 calc(20%-1px),#ffffff08 20%);}#inputs{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;}.col{display:flex;flex-direction:column;align-items:center;flex:1;gap:2px;}.bar{background:linear-gradient(to top,#3b82f6,#06b6d4);border-radius:3px 3px 0 0;transition:height .3s;width:100%;}.lbl{font-size:8px;color:#64748b;white-space:nowrap;}.inp{width:100%;background:#1e1e2e;border:1px solid #2a2a3e;color:#e0e0e0;padding:2px 3px;font-size:9px;border-radius:2px;text-align:center;}input:focus{outline:none;border-color:#3b82f6;}</style><h4>Bar Chart</h4><div id="chart"></div><div id="inputs"></div><script>const DATA=[['Q1',75],['Q2',60],['Q3',90],['Q4',45],['Q5',80]];function render(){const ch=document.getElementById('chart');const inp=document.getElementById('inputs');ch.innerHTML='';inp.innerHTML='';const mx=Math.max(...DATA.map(d=>d[1]));DATA.forEach((d,i)=>{const c=document.createElement('div');c.className='col';const b=document.createElement('div');b.className='bar';b.style.height=(d[1]/mx*100)+'%';const l=document.createElement('div');l.className='lbl';l.textContent=d[0];c.append(b,l);ch.appendChild(c);const iv=document.createElement('input');iv.className='inp';iv.value=d[1];iv.type='number';iv.min=0;iv.max=100;iv.oninput=()=>{DATA[i][1]=+iv.value||0;render();};inp.appendChild(iv);});}render();<\/script>`;}
function getQRHTML(){return `<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#fff;font-family:system-ui,sans-serif;padding:8px;height:100vh;display:flex;flex-direction:column;gap:6px;align-items:center;}input{width:100%;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:4px;padding:5px 8px;font-size:11px;}canvas{width:120px;height:120px;border:1px solid #e2e8f0;border-radius:4px;}label{font-size:9px;color:#64748b;}</style><input id="t" type="text" value="https://anthropic.com" placeholder="Enter URL…" oninput="gen()"><canvas id="c" width="120" height="120"></canvas><label>Scan to open URL</label><script src="libs/qrcode.min.js"><\/script><script>let qr=null;function gen(){const v=document.getElementById('t').value||'https://example.com';const c=document.getElementById('c');const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,120,120);if(!window.QRCode){setTimeout(gen,500);return;}if(qr){try{document.getElementById('c').style.display='none';document.getElementById('c').style.display='block';}catch(e){}}const div=document.createElement('div');new QRCode(div,{text:v,width:120,height:120});const img=div.querySelector('img');if(img){img.onload=()=>{ctx.drawImage(img,0,0,120,120);};}else{const ci=div.querySelector('canvas');if(ci)ctx.drawImage(ci,0,0,120,120);}}setTimeout(gen,600);<\/script>`;}

// ── APPLETS REGISTRY ──
// Each applet can optionally have a htmlFn(palette) for theme-aware rendering
const APPLETS=[
  {id:'calculator', name:'Calculator', desc:'Basic calculator',   icon:'⌨', htmlFn:getCalcHTML,  aspectRatio:3/4},
  {id:'clock',      name:'Clock',      desc:'Live digital clock', icon:'🕐', html:getClockHTML(),  aspectRatio:null},
  {id:'timer',      name:'Timer',      desc:'Countdown timer',    icon:'⏱', html:getTimerHTML(),  aspectRatio:null},
  {id:'notes',      name:'Notes',      desc:'Sticky note',        icon:'📝', html:getNotesHTML(),  aspectRatio:null},
  {id:'chart',      name:'Chart',      desc:'Simple bar chart',   icon:'📊', html:getChartHTML(),  aspectRatio:null},
  {id:'qr',         name:'QR Code',    desc:'Generate QR code',   icon:'▦', html:getQRHTML(),     aspectRatio:null},
];

// Get rendered HTML for an applet (theme-aware if htmlFn exists)
function getAppletHtml(appletId, palette){
  const a=APPLETS.find(x=>x.id===appletId);
  if(!a)return '';
  if(typeof a.htmlFn==='function')return a.htmlFn(palette||_appletTheme());
  return a.html||'';
}

// Insert applet onto current slide
function insertApplet(a){
  if(typeof pushUndo==="function")pushUndo();
  const aspect=a.aspectRatio||null;
  const w=300, h=aspect?Math.round(w/aspect):320;
  const x=Math.round((canvasW-w)/2);
  const y=Math.round((canvasH-h)/2);
  const html=typeof a.htmlFn==='function'?a.htmlFn(_appletTheme()):a.html||'';
  const d={
    id:'e'+(++ec),
    type:'applet',
    x, y, w, h,
    rot:0, anims:[], isTrigger:false,
    appletId:a.id,
    appletHtml:html,
    _appletAspect:aspect,  // store for proportional resize
  };
  slides[cur].els.push(d);
  mkEl(d);
  if(typeof save==="function")save(); if(typeof drawThumbs==="function")drawThumbs(); if(typeof saveState==="function")saveState();
}

// Refresh all theme-aware applets after theme change
function refreshAppletThemes(){
  const p=_appletTheme();
  slides.forEach(s=>{
    (s.els||[]).forEach(d=>{
      if(d.type!=='applet')return;
      const a=APPLETS.find(x=>x.id===d.appletId);
      if(!a||typeof a.htmlFn!=='function')return;
      d.appletHtml=a.htmlFn(p);
      // Update DOM iframe if on current slide
      const domEl=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
      if(domEl){
        const oldIframe=domEl.querySelector('iframe');
        if(oldIframe){
          const newIframe=document.createElement('iframe');
          newIframe.srcdoc=d.appletHtml;
          newIframe.style.cssText='width:100%;height:100%;border:none;background:transparent;';
          newIframe.setAttribute('allowtransparency','true');
          newIframe.sandbox='allow-scripts allow-same-origin';
          oldIframe.parentNode.replaceChild(newIframe,oldIframe);
        }
        domEl.dataset.appletHtml=d.appletHtml;
      }
    });
  });
  if(typeof saveState==="function")saveState();
}
