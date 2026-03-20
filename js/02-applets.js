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
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;user-select:none;-webkit-user-select:none;}
html{width:100%;height:100%;background:transparent;overflow:hidden;}body{width:100%;height:100%;background:transparent;overflow:hidden;cursor:default;}
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
  user-select:none;cursor:default;
  text-shadow:0 1px 4px rgba(0,0,0,0.5);
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

function getClockHTML(cfg){
  cfg = cfg || {};
  const fs     = cfg.genFontSize !== undefined ? +cfg.genFontSize : 48;
  const bold   = cfg.genBold ? 900 : 700;
  const align  = cfg.genAlign  || 'center';
  const va     = cfg.genVAlign || 'middle';
  const bgBlur = cfg.genBgBlur !== undefined ? +cfg.genBgBlur : 0;
  const bgOp   = cfg.genBgOp   !== undefined ? +cfg.genBgOp   : 1;
  const shOn   = cfg.genShadowOn !== undefined ? !!cfg.genShadowOn : true;
  const shBlur = cfg.genShadowBlur !== undefined ? +cfg.genShadowBlur : 8;
  const shColorR = cfg.genShadowColor && cfg.genShadowColor !== '' ? cfg.genShadowColor : '#000000';
  const p = cfg.palette || _appletTheme();
  function hexRGB(h){h=(h||'#6366f1').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function rgba(hex,a){try{const[r,g,b]=hexRGB(hex);return`rgba(${r},${g},${b},${a})`;}catch(e){return hex;}}
  const numClr  = cfg.genColor && cfg.genColor !== '' ? cfg.genColor : (p.head || p.ac1);
  const rawBg   = cfg.genBg && cfg.genBg !== '' ? cfg.genBg : 'transparent';
  const bgClr   = rawBg !== 'transparent' && bgOp < 1 && rawBg.startsWith('#') ? rawBg + Math.round(bgOp*255).toString(16).padStart(2,'0') : rawBg;
  const shStyle = shOn && shBlur>0 ? `0 2px ${shBlur}px ${rgba(shColorR,0.75)},0 0 30px ${rgba(p.ac1,0.35)}` : `0 0 30px ${rgba(p.ac1,0.3)}`;
  const brdColor = cfg.genBorderColor && cfg.genBorderColor !== '' ? cfg.genBorderColor : rgba(p.ac1, 0.22);
  const brdWidth = cfg.genBorderWidth !== undefined ? +cfg.genBorderWidth : 0;
  const jc = va==='top' ? 'flex-start' : va==='bottom' ? 'flex-end' : 'center';
  const ai = align==='left' ? 'flex-start' : align==='right' ? 'flex-end' : 'center';
  const dateFs = Math.max(11, Math.round(fs * 0.28));

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;user-select:none;-webkit-user-select:none;}
html,body{width:100%;height:100%;background:transparent;overflow:hidden;}
.wrap{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:${ai};justify-content:${jc};padding:clamp(8px,4%,20px);box-sizing:border-box;}
.wrap-bg{position:absolute;inset:0;background:${bgClr};${bgBlur > 0 ? `backdrop-filter:blur(${bgBlur}px);-webkit-backdrop-filter:blur(${bgBlur}px);` : ''}z-index:0;}
.num{position:relative;z-index:1;font-size:${fs}px;font-weight:${bold};color:${numClr};font-variant-numeric:tabular-nums;letter-spacing:-0.02em;line-height:1.1;text-align:${align};text-shadow:${shStyle};width:100%;}
.date{position:relative;z-index:1;font-size:${dateFs}px;color:${numClr};opacity:0.6;margin-top:6px;text-align:${align};width:100%;letter-spacing:0.5px;text-shadow:${shStyle};}
</style></head><body>
<div class="wrap" id="wrap">
  <div class="wrap-bg" id="wrapbg"></div>
  <div class="num" id="num"></div>
  <div class="date" id="dat"></div>
</div>
<script>
function u(){var n=new Date();document.getElementById('num').textContent=n.toLocaleTimeString();document.getElementById('dat').textContent=n.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});}
u();setInterval(u,1000);
window.addEventListener('message',function(e){
  var d=e.data;if(!d)return;
  if(d.type==='genUpdate'){
    var num=document.getElementById('num'),wrap=document.getElementById('wrap'),wb=document.getElementById('wrapbg');
    if(d.fs!==undefined){num.style.fontSize=d.fs+'px';document.getElementById('dat').style.fontSize=Math.max(11,Math.round(d.fs*0.28))+'px';}
    if(d.bold!==undefined)num.style.fontWeight=d.bold?900:700;
    if(d.color!==undefined){num.style.color=d.color;document.getElementById('dat').style.color=d.color;}
    if(d.align!==undefined){num.style.textAlign=d.align;document.getElementById('dat').style.textAlign=d.align;wrap.style.alignItems=d.ai;}
    if(d.jc!==undefined)wrap.style.justifyContent=d.jc;
    if(d.bg!==undefined&&wb)wb.style.background=d.bg;
    if(d.blur!==undefined&&wb){wb.style.backdropFilter=d.blur>0?'blur('+d.blur+'px)':'none';wb.style.webkitBackdropFilter=d.blur>0?'blur('+d.blur+'px)':'none';}
    if(d.shadow!==undefined){num.style.textShadow=d.shadow;document.getElementById('dat').style.textShadow=d.shadow;}
  }
});
<\/script></body></html>`;
}
function getTimerHTML(cfg){
  cfg = cfg || {};
  const tmMin    = cfg.tmMin    !== undefined ? +cfg.tmMin    : 5;
  const tmSec    = cfg.tmSec    !== undefined ? +cfg.tmSec    : 0;
  const tmOnEnd  = cfg.tmOnEnd  || 'none';
  const tmOnEndSlide = cfg.tmOnEndSlide !== undefined ? +cfg.tmOnEndSlide : 0;
  const fs     = cfg.genFontSize !== undefined ? +cfg.genFontSize : 72;
  const bold   = cfg.genBold ? 900 : 800;
  const align  = cfg.genAlign  || 'center';
  const va     = cfg.genVAlign || 'middle';
  const bgBlur = cfg.genBgBlur !== undefined ? +cfg.genBgBlur : 0;
  const bgOp   = cfg.genBgOp   !== undefined ? +cfg.genBgOp   : 1;
  const shOn   = cfg.genShadowOn !== undefined ? !!cfg.genShadowOn : true;
  const shBlur = cfg.genShadowBlur !== undefined ? +cfg.genShadowBlur : 8;
  const shColorR = cfg.genShadowColor && cfg.genShadowColor !== '' ? cfg.genShadowColor : '#000000';
  const p = cfg.palette || _appletTheme();

  function hexRGB(h){h=(h||'#6366f1').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function rgba(hex,a){try{const[r,g,b]=hexRGB(hex);return`rgba(${r},${g},${b},${a})`;}catch(e){return hex;}}

  const numClr  = cfg.genColor && cfg.genColor !== '' ? cfg.genColor : (p.head || p.ac1);
  const rawBg   = cfg.genBg && cfg.genBg !== '' ? cfg.genBg : 'transparent';
  const bgClr   = rawBg !== 'transparent' && bgOp < 1 && rawBg.startsWith('#') ? rawBg + Math.round(bgOp*255).toString(16).padStart(2,'0') : rawBg;
  const shStyle = shOn && shBlur>0 ? `0 2px ${shBlur}px ${rgba(shColorR,0.75)},0 0 30px ${rgba(p.ac1,0.35)}` : `0 0 30px ${rgba(p.ac1,0.3)}`;
  const brdColor = cfg.genBorderColor && cfg.genBorderColor !== '' ? cfg.genBorderColor : rgba(p.ac1, 0.22);
  const brdWidth = cfg.genBorderWidth !== undefined ? +cfg.genBorderWidth : 0;
  const jc = va==='top' ? 'flex-start' : va==='bottom' ? 'flex-end' : 'center';
  const ai = align==='left' ? 'flex-start' : align==='right' ? 'flex-end' : 'center';
  const totalSec = tmMin*60 + tmSec;
  const _onEnd = tmOnEnd;
  const _onEndSlide = tmOnEndSlide;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;user-select:none;-webkit-user-select:none;}
html,body{width:100%;height:100%;background:transparent;overflow:hidden;}
.wrap{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:${ai};justify-content:${jc};padding:clamp(8px,4%,20px);box-sizing:border-box;}
.wrap-bg{position:absolute;inset:0;background:${bgClr};${bgBlur > 0 ? `backdrop-filter:blur(${bgBlur}px);-webkit-backdrop-filter:blur(${bgBlur}px);` : ''}z-index:0;}
.num{position:relative;z-index:1;font-size:${fs}px;font-weight:${bold};color:${numClr};font-variant-numeric:tabular-nums;letter-spacing:-0.02em;line-height:1.1;text-align:${align};text-shadow:${shStyle};width:100%;transition:color .3s;}
.num.done{color:#ef4444;}
</style></head><body>
<div class="wrap" id="wrap">
  <div class="wrap-bg" id="wrapbg"></div>
  <div class="num" id="num">--:--</div>
</div>
<script>
var _total=${totalSec},_rem=${totalSec},_t=null,_started=false;
function fmt(s){s=Math.max(0,s);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function tick(){
  _rem--;
  document.getElementById('num').textContent=fmt(_rem);
  if(_rem<=0){clearInterval(_t);_t=null;document.getElementById('num').classList.add('done');_fireOnEnd();}
}
var _onEnd='${_onEnd}',_onEndSlide=${_onEndSlide};
function _fireOnEnd(){
  var msg=null;
  if(_onEnd==='next') msg={type:'timerNav',mode:'next'};
  else if(_onEnd==='slide') msg={type:'timerNav',mode:'slide',slide:_onEndSlide};
  if(!msg) return;
  try{window.parent.postMessage(msg,'*');}catch(e){}
  try{if(window.top!==window.parent) window.top.postMessage(msg,'*');}catch(e){}
}
function start(){
  if(_t||_rem<=0)return;
  _started=true;
  document.getElementById('num').textContent=fmt(_rem);
  _t=setInterval(tick,1000);
}
// Show initial time (not --:--)
document.getElementById('num').textContent=fmt(_total);
window.addEventListener('message',function(e){
  var d=e.data;if(!d)return;
  if(d.type==='timerStart'){if(!_started)start();return;}
  if(d.type==='timerUpdate'){
    if(d.total!==undefined){_total=d.total;if(!_started){_rem=_total;document.getElementById('num').textContent=fmt(_rem);}}
    if(d.onEnd!==undefined){_onEnd=d.onEnd;}
    if(d.onEndSlide!==undefined){_onEndSlide=d.onEndSlide;}
  }
  // Style updates (same keys as genUpdate)
  if(d.type==='genUpdate'){
    var num=document.getElementById('num'),wrap=document.getElementById('wrap'),wb=document.getElementById('wrapbg');
    if(d.fs!==undefined)num.style.fontSize=d.fs+'px';
    if(d.bold!==undefined)num.style.fontWeight=d.bold?900:800;
    if(d.color!==undefined)num.style.color=d.color;
    if(d.align!==undefined){num.style.textAlign=d.align;wrap.style.alignItems=d.ai;}
    if(d.jc!==undefined)wrap.style.justifyContent=d.jc;
    if(d.bg!==undefined&&wb)wb.style.background=d.bg;
    if(d.blur!==undefined&&wb){wb.style.backdropFilter=d.blur>0?'blur('+d.blur+'px)':'none';wb.style.webkitBackdropFilter=d.blur>0?'blur('+d.blur+'px)':'none';}
    if(d.shadow!==undefined)num.style.textShadow=d.shadow;
  }
});
<\/script></body></html>`;
}


function getGeneratorHTML(cfg){
  cfg = cfg || {};
  const min    = cfg.genMin      !== undefined ? +cfg.genMin      : 1;
  const max    = cfg.genMax      !== undefined ? +cfg.genMax      : 100;
  const step   = cfg.genStep     !== undefined ? +cfg.genStep     : 1;
  const fs     = cfg.genFontSize !== undefined ? +cfg.genFontSize : 64;
  const bold   = cfg.genBold     ? 900 : 800;
  const align  = cfg.genAlign    || 'center';
  const va     = cfg.genVAlign   || 'middle';
  const bgBlur   = cfg.genBgBlur      !== undefined ? +cfg.genBgBlur      : 0;
  const bgOp     = cfg.genBgOp        !== undefined ? +cfg.genBgOp        : 1;
  const shOn     = cfg.genShadowOn !== undefined ? !!cfg.genShadowOn : true;
  const shBlur   = cfg.genShadowBlur !== undefined ? +cfg.genShadowBlur : 8;
  const shColorR = cfg.genShadowColor && cfg.genShadowColor!=='' ? cfg.genShadowColor : '#000000';
  const p        = cfg.palette        || _appletTheme();

  function hexRGB(h){h=(h||'#6366f1').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function rgba(hex,a){try{const[r,g,b]=hexRGB(hex);return`rgba(${r},${g},${b},${a})`;}catch(e){return hex;}}

  const numClr   = cfg.genColor && cfg.genColor!=='' ? cfg.genColor : (p.head || p.ac1);
  const rawBg    = cfg.genBg && cfg.genBg!=='' ? cfg.genBg : 'transparent';
  const bgClr    = rawBg !== 'transparent' && bgOp < 1 && rawBg.startsWith('#') ? rawBg + Math.round(bgOp*255).toString(16).padStart(2,'0') : rawBg;
  const shStyle  = shOn && shBlur>0 ? `0 2px ${shBlur}px ${rgba(shColorR,0.75)},0 0 30px ${rgba(p.ac1,0.35)}` : `0 0 30px ${rgba(p.ac1,0.3)}`;
  const brdColor = cfg.genBorderColor && cfg.genBorderColor!=='' ? cfg.genBorderColor : rgba(p.ac1, 0.22);
  const brdWidth = cfg.genBorderWidth !== undefined ? +cfg.genBorderWidth : 0;
  const brdStyle = brdWidth > 0 ? `${brdWidth}px solid ${brdColor}` : `1px solid ${rgba(p.ac1,0.22)}`;

  const jc = va==='top' ? 'flex-start' : va==='bottom' ? 'flex-end' : 'center';
  const ai = align==='left' ? 'flex-start' : align==='right' ? 'flex-end' : 'center';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;user-select:none;-webkit-user-select:none;}
html,body{width:100%;height:100%;background:transparent;overflow:hidden;}
.wrap{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:${ai};justify-content:${jc};padding:clamp(8px,4%,20px);box-sizing:border-box;}
.wrap-bg{position:absolute;inset:0;background:${bgClr};${bgBlur > 0 ? `backdrop-filter:blur(${bgBlur}px);-webkit-backdrop-filter:blur(${bgBlur}px);` : ''}z-index:0;}
.num{position:relative;z-index:1;font-size:${fs}px;font-weight:${bold};color:${numClr};font-variant-numeric:tabular-nums;letter-spacing:-0.02em;line-height:1.1;text-align:${align};text-shadow:${shStyle};transition:font-size .15s,color .15s,transform .15s,opacity .15s;word-break:break-all;width:100%;}
.num.pop{transform:scale(1.06);opacity:.6;}
</style></head><body>
<div class="wrap" id="wrap">
  <div class="wrap-bg" id="wrapbg"></div>
  <div class="num" id="num">?</div>
</div>
<script>
var _min=${min},_max=${max},_step=${step};
function gen(){
  var steps=Math.round((_max-_min)/_step);
  var val=_min+Math.round(Math.random()*steps)*_step;
  val=Math.round(val*1e9)/1e9;
  var el=document.getElementById('num');
  el.classList.add('pop');
  setTimeout(function(){el.classList.remove('pop');},150);
  el.textContent=val;
}
gen();
// Live style updates via postMessage (no iframe reload needed)
window.addEventListener('message',function(e){
  var d=e.data;if(!d||d.type!=='genUpdate')return;
  var wrap=document.getElementById('wrap');
  var num=document.getElementById('num');
  if(d.fs   !==undefined){num.style.fontSize=d.fs+'px';}
  if(d.bold !==undefined){num.style.fontWeight=d.bold?900:800;}
  if(d.color!==undefined){num.style.color=d.color;}
  if(d.align!==undefined){num.style.textAlign=d.align;wrap.style.alignItems=d.ai;}
  if(d.jc   !==undefined){wrap.style.justifyContent=d.jc;}
  if(d.bg   !==undefined){var wb2=document.getElementById('wrapbg');if(wb2)wb2.style.background=d.bg;}
  if(d.blur  !==undefined){var wb=document.getElementById('wrapbg');if(wb){wb.style.backdropFilter=d.blur>0?'blur('+d.blur+'px)':'none';wb.style.webkitBackdropFilter=d.blur>0?'blur('+d.blur+'px)':'none';}}
  if(d.shadow!==undefined){var nm2=document.getElementById('num');if(nm2)nm2.style.textShadow=d.shadow;}
  if(d.min  !==undefined){_min=d.min;_max=d.max;_step=d.step;}
});
<\/script></body></html>`;
}

function getNotesHTML(){return `<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#fef3c7;margin:0;height:100vh;display:flex;flex-direction:column;}#hdr{background:#f59e0b;padding:6px 10px;font-weight:700;font-size:12px;color:#1a1a1a;display:flex;justify-content:space-between;align-items:center;}#ta{flex:1;border:none;background:transparent;resize:none;padding:10px;font-size:13px;color:#1a1a1a;font-family:inherit;line-height:1.6;}#ta:focus{outline:none;}</style><div id="hdr"><span>📝 Notes</span><input type="color" value="#fef3c7" onchange="document.body.style.background=this.value" style="width:22px;height:18px;border:none;background:none;cursor:pointer;padding:0" title="BG color"></div><textarea id="ta" placeholder="Click to type…"></textarea>`;}
function getChartHTML(){return `<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#0d1117;font-family:system-ui,sans-serif;padding:12px;height:100vh;display:flex;flex-direction:column;gap:8px;}h4{color:#e2e8f0;font-size:11px;text-align:center;}#chart{flex:1;display:flex;align-items:flex-end;gap:4px;padding:0 4px 20px;position:relative;}#chart::before{content:'';position:absolute;bottom:20px;left:0;right:0;border-top:1px solid #252529;}#chart::after{content:'';position:absolute;top:0;left:0;right:0;bottom:20px;background:repeating-linear-gradient(to bottom,transparent,transparent calc(20%-1px),#ffffff08 calc(20%-1px),#ffffff08 20%);}#inputs{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;}.col{display:flex;flex-direction:column;align-items:center;flex:1;gap:2px;}.bar{background:linear-gradient(to top,#3b82f6,#06b6d4);border-radius:3px 3px 0 0;transition:height .3s;width:100%;}.lbl{font-size:8px;color:#64748b;white-space:nowrap;}.inp{width:100%;background:#1e1e2e;border:1px solid #2a2a3e;color:#e0e0e0;padding:2px 3px;font-size:9px;border-radius:2px;text-align:center;}input:focus{outline:none;border-color:#3b82f6;}</style><h4>Bar Chart</h4><div id="chart"></div><div id="inputs"></div><script>const DATA=[['Q1',75],['Q2',60],['Q3',90],['Q4',45],['Q5',80]];function render(){const ch=document.getElementById('chart');const inp=document.getElementById('inputs');ch.innerHTML='';inp.innerHTML='';const mx=Math.max(...DATA.map(d=>d[1]));DATA.forEach((d,i)=>{const c=document.createElement('div');c.className='col';const b=document.createElement('div');b.className='bar';b.style.height=(d[1]/mx*100)+'%';const l=document.createElement('div');l.className='lbl';l.textContent=d[0];c.append(b,l);ch.appendChild(c);const iv=document.createElement('input');iv.className='inp';iv.value=d[1];iv.type='number';iv.min=0;iv.max=100;iv.oninput=()=>{DATA[i][1]=+iv.value||0;render();};inp.appendChild(iv);});}render();<\/script>`;}
// Генерация QR как dataURL через canvas (без iframe, работает при file://)
function renderQRDataURL(text, bgColor, qrColor, size){
  size = size || 400;
  text = (text || 'https://example.com').trim() || 'https://example.com';
  // bgColor=null/undefined/'transparent' = прозрачный фон
  const transparent = (bgColor === null || bgColor === undefined || bgColor === 'transparent');
  if(transparent) bgColor = null;
  else bgColor = bgColor || '#ffffff';
  qrColor = qrColor || '#000000';
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Фон
  if(!transparent){
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  if(typeof qrGenerate === 'undefined' && typeof QRCode === 'undefined'){
    // Библиотека не загружена — рисуем заглушку
    ctx.fillStyle = qrColor;
    ctx.font = 'bold ' + Math.round(size*0.07) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', size/2, size/2);
    return canvas.toDataURL('image/png');
  }

  // Получаем матрицу через qrGenerate (теперь глобальная)
  let m = null;
  try { m = qrGenerate(text); } catch(e) { m = null; }

  if(m && m.length > 0){
    const pad = Math.round(size * 0.04); // 4% отступ
    const inner = size - pad * 2;
    const cell = inner / m.length;
    ctx.fillStyle = qrColor;
    for(let r = 0; r < m.length; r++){
      for(let c = 0; c < m[r].length; c++){
        if(m[r][c] === 1){
          ctx.fillRect(
            pad + Math.round(c * cell),
            pad + Math.round(r * cell),
            Math.ceil(cell),
            Math.ceil(cell)
          );
        }
      }
    }
  } else {
    // Fallback через QRCode объект
    try {
      const div = document.createElement('div');
      new QRCode(div, {text, width: size, height: size, colorDark: qrColor, colorLight: bgColor});
      const qrCanvas = div.querySelector('canvas');
      if(qrCanvas) ctx.drawImage(qrCanvas, 0, 0, size, size);
    } catch(e) {
      ctx.fillStyle = qrColor;
      ctx.font = 'bold ' + Math.round(size*0.07) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('QR: ' + text.slice(0,20), size/2, size/2);
    }
  }
  return canvas.toDataURL('image/png');
}

// ── APPLETS REGISTRY ──
// Each applet can optionally have a htmlFn(palette) for theme-aware rendering
const APPLETS=[
  {id:'calculator', name:'Calculator', desc:'Basic calculator',   icon:'⌨', htmlFn:getCalcHTML,  aspectRatio:3/4},
  {id:'clock', name:'Clock', desc:'Live digital clock', icon:'🕐', htmlFn:(p,cfg)=>getClockHTML(cfg), aspectRatio:null, hasProps:true},
  {id:'timer',      name:'Timer',      desc:'Countdown timer',    icon:'⏱', htmlFn:(p,cfg)=>getTimerHTML(cfg), aspectRatio:null, hasProps:true},
  {id:'notes',      name:'Notes',      desc:'Sticky note',        icon:'📝', html:getNotesHTML(),  aspectRatio:null},
  {id:'qr',         name:'QR Code',    desc:'Generate QR code',   icon:'▦', hasProps:true,        aspectRatio:1},
  {id:'generator',  name:'Generator',  desc:'Random number',      icon:'🎲', htmlFn:(p,cfg)=>getGeneratorHTML(cfg), aspectRatio:null, hasProps:true},
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
  // Generator defaults
  const cfg = (a.id==='generator'||a.id==='timer') ? {genMin:1,genMax:100,genStep:1,palette:_appletTheme()} : null;
  const html=typeof a.htmlFn==='function'?a.htmlFn(_appletTheme(),cfg):a.html||'';
  const d={
    id:'e'+(++ec),
    type:'applet',
    x, y, w, h,
    rot:0, anims:[], isTrigger:false,
    appletId:a.id,
    appletHtml:html,
    _appletAspect:aspect,
    // Generator-specific data
    ...(a.id==='generator' ? {genMin:1,genMax:100,genStep:1, genFontSize:64, genColor:'', genBg:(_appletTheme().ac1||'#6366f1'), genBgOp:0.2, genBgScheme:{col:0,row:0}, genBgBlur:0, genBorderColor:'', genBorderWidth:0, genAlign:'center', genVAlign:'middle', genBold:false, genShadowBlur:8, genShadowY:2, genShadowColor:'#000000'} : {}),
    ...(a.id==='timer'     ? {tmMin:5, tmSec:0, genFontSize:72, genColor:'', genBg:(_appletTheme().ac1||'#6366f1'), genBgOp:0.2, genBgScheme:{col:0,row:0}, genBgBlur:0, genBorderColor:'', genBorderWidth:0, genAlign:'center', genVAlign:'middle', genBold:false, genShadowBlur:8, genShadowColor:'#000000', genShadowOn:true} : {}),
    ...(a.id==='clock'     ? {genFontSize:48, genColor:'', genBg:(_appletTheme().ac1||'#6366f1'), genBgOp:0.2, genBgScheme:{col:0,row:0}, genBgBlur:0, genBorderColor:'', genBorderWidth:0, genAlign:'center', genVAlign:'middle', genBold:false, genShadowBlur:8, genShadowColor:'#000000', genShadowOn:true} : {}),
    ...(a.id==='qr'        ? {qrText:'https://example.com', qrBg:'#ffffff', qrColor:'#000000', qrRx:16} : {}),
  };
  // QR: генерируем сразу как image элемент
  if(a.id === 'qr'){
    const qrUrl = renderQRDataURL(d.qrText, d.qrBg, d.qrColor, 400);
    const qrEl = {
      id: d.id, type:'image', x:d.x, y:d.y, w:d.w, h:d.h,
      rot:0, anims:[], src: qrUrl,
      imgFit:'fill', imgRx: d.qrRx||16,
      imgBw:0, imgBc:'#ffffff', imgShadow:false, imgShadowBlur:15, imgShadowColor:'#000000', imgOpacity:1,
      // QR-специфичные поля
      _isQR: true, qrText: d.qrText, qrBg: d.qrBg, qrColor: d.qrColor, qrRx: d.qrRx,
    };
    slides[cur].els.push(qrEl);
    mkEl(qrEl);
    const qrDomEl = document.getElementById('canvas').querySelector('[data-id="'+qrEl.id+'"]');
    if(qrDomEl && typeof pick==='function') pick(qrDomEl);
    if(typeof save==="function")save(); if(typeof drawThumbs==="function")drawThumbs(); if(typeof saveState==="function")saveState();
    return;
  }
  slides[cur].els.push(d);
  mkEl(d);
  if(typeof save==="function")save(); if(typeof drawThumbs==="function")drawThumbs(); if(typeof saveState==="function")saveState();
}

// Перегенерировать QR при изменении настроек
function refreshQREl(elId){
  if(!elId) return;
  const domEl = document.getElementById('canvas').querySelector('[data-id="'+elId+'"]');
  const d = slides[cur].els.find(e=>e.id===elId);
  if(!d) return;
  // Восстанавливаем _isQR из dataset если потерялся (первый save после загрузки)
  if(!d._isQR && domEl && domEl.dataset.isQR==='true'){
    d._isQR=true;
    d.qrText=domEl.dataset.qrText||d.qrText||'https://example.com';
    d.qrBg=domEl.dataset.qrBg||d.qrBg||'#ffffff';
    d.qrColor=domEl.dataset.qrColor||d.qrColor||'#000000';
    d.qrRx=domEl.dataset.qrRx!=null?+domEl.dataset.qrRx:(d.qrRx!=null?d.qrRx:16);
  }
  if(!d._isQR) return;
  const isTransparent = (d.qrBg === 'transparent' || !d.qrBg);
  const bg = isTransparent ? null : d.qrBg;
  const url = renderQRDataURL(d.qrText||'https://example.com', bg, d.qrColor||'#000000', 400);
  d.src = url;
  d.imgFit = 'fill';
  const rx = d.qrRx!=null ? +d.qrRx : 16;
  d.imgRx = rx;
  if(domEl){
    const img = domEl.querySelector('img');
    const iel = domEl.querySelector('.iel');
    if(img) img.src = url;
    domEl.dataset.imgRx = rx;
    domEl.dataset.src = url;
    // Скругление
    if(iel) iel.style.borderRadius = rx+'px';
    domEl.style.borderRadius = rx+'px';
    domEl.style.overflow = 'hidden';
    // Прозрачный фон — убираем любой background с элемента
    if(isTransparent){
      domEl.style.background = 'transparent';
      if(iel) iel.style.background = 'transparent';
    } else {
      domEl.style.background = '';
      if(iel) iel.style.background = '';
    }
  }
  if(typeof save==='function') save();
  if(typeof drawThumbs==='function') drawThumbs();
  if(typeof saveState==='function') saveState();
}


// Rebuild generator iframe HTML from element data
window.refreshGeneratorEl = function(elId){
  const s = slides[cur];
  if(!s) return;
  const d = s.els.find(x=>x.id===elId);
  if(!d||d.appletId!=='generator') return;
  const p = _appletTheme();
  function hexRGB(h){h=(h||'#6366f1').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function rgba(hex,a){try{const[r,g,b]=hexRGB(hex);return`rgba(${r},${g},${b},${a})`;}catch(e){return hex;}}

  const fs       = d.genFontSize    !== undefined ? +d.genFontSize    : 64;
  const align    = d.genAlign    || 'center';
  const va       = d.genVAlign   || 'middle';
  const bgBlur   = d.genBgBlur   !== undefined ? +d.genBgBlur   : 0;
  const bgOp     = d.genBgOp     !== undefined ? +d.genBgOp     : 1;
  const numClr   = d.genColor    && d.genColor!==''    ? d.genColor    : (p.head || p.ac1);
  const rawBg    = d.genBg && d.genBg!=='' ? d.genBg : 'transparent';
  const bgClr    = rawBg !== 'transparent' && bgOp < 1 && rawBg.startsWith('#') ? rawBg + Math.round(bgOp*255).toString(16).padStart(2,'0') : rawBg;
  const brdColor = d.genBorderColor && d.genBorderColor!=='' ? d.genBorderColor : rgba(p.ac1, 0.22);
  const brdWidth = d.genBorderWidth !== undefined ? +d.genBorderWidth : 0;
  const shOn     = d.genShadowOn !== undefined ? !!d.genShadowOn : true;
  const shBlur   = d.genShadowBlur !== undefined ? +d.genShadowBlur : 8;
  const shColor  = d.genShadowColor && d.genShadowColor!=='' ? d.genShadowColor : '#000000';
  const shStyle  = shOn && shBlur>0 ? `0 2px ${shBlur}px ${rgba(shColor,0.75)},0 0 30px ${rgba(p.ac1,0.35)}` : `0 0 30px ${rgba(p.ac1,0.3)}`;
  const jc       = va==='top' ? 'flex-start' : va==='bottom' ? 'flex-end' : 'center';
  const ai       = align==='left' ? 'flex-start' : align==='right' ? 'flex-end' : 'center';

  const domEl = document.getElementById('canvas').querySelector('[data-id="'+elId+'"]');
  if(!domEl) return;

  // Sync dataset
  domEl.dataset.genMin         = d.genMin         !== undefined ? d.genMin         : 1;
  domEl.dataset.genMax         = d.genMax         !== undefined ? d.genMax         : 100;
  domEl.dataset.genStep        = d.genStep        !== undefined ? d.genStep        : 1;
  domEl.dataset.genFontSize    = fs;
  domEl.dataset.genColor       = d.genColor       || '';
  domEl.dataset.genBg          = d.genBg          || '';
  domEl.dataset.genBgBlur      = bgBlur;
  domEl.dataset.genBorderColor = d.genBorderColor || '';
  domEl.dataset.genBorderWidth = brdWidth;
  domEl.dataset.genBgOp        = bgOp;
  domEl.dataset.genShadowOn    = shOn ? 'true' : 'false';
  domEl.dataset.genShadowBlur  = shBlur;
  domEl.dataset.genShadowColor = d.genShadowColor || '';
  domEl.dataset.genBold        = d.genBold ? 'true' : 'false';
  domEl.dataset.genAlign       = align;
  domEl.dataset.genVAlign      = va;
  // Persist scheme refs as JSON so save() can restore them
  domEl.dataset.genColorScheme  = d.genColorScheme  ? JSON.stringify(d.genColorScheme)  : '';
  domEl.dataset.genBgScheme     = d.genBgScheme     ? JSON.stringify(d.genBgScheme)     : '';
  domEl.dataset.genBorderScheme = d.genBorderScheme ? JSON.stringify(d.genBorderScheme) : '';

  // Border on overlay div — sits on top of clip, not affected by overflow:hidden or backdrop-filter
  const bordOverlay = domEl.querySelector('.applet-border-overlay');
  if(bordOverlay){
    bordOverlay.style.border = brdWidth > 0 ? brdWidth+'px solid '+brdColor : '';
  }

  // Send live update into iframe via postMessage — no reload, no flash
  const iframe = domEl.querySelector('iframe');
  if(iframe && iframe.contentWindow){
    iframe.contentWindow.postMessage({
      type:'genUpdate',
      fs: fs, bold: d.genBold||false,
      color: numClr, align: align, ai: ai, jc: jc,
      bg: bgClr, blur: bgBlur, shadow: shStyle,
      min: d.genMin!==undefined?+d.genMin:1,
      max: d.genMax!==undefined?+d.genMax:100,
      step: d.genStep!==undefined?+d.genStep:1,
    }, '*');
  }

  // Update persisted HTML
  const cfg2 = {
    genMin:d.genMin,genMax:d.genMax,genStep:d.genStep,genFontSize:d.genFontSize,
    genColor:d.genColor,genBg:d.genBg,genBgBlur:d.genBgBlur,
    genBorderColor:d.genBorderColor,genBorderWidth:d.genBorderWidth,
    genBold:d.genBold,genAlign:d.genAlign,genVAlign:d.genVAlign,
    genBgOp:d.genBgOp,genShadowOn:d.genShadowOn,genShadowBlur:d.genShadowBlur,genShadowColor:d.genShadowColor,palette:p
  };
  d.appletHtml = getGeneratorHTML(cfg2);
  domEl.dataset.appletHtml = d.appletHtml;
  if(typeof saveState==='function') saveState();
};

// Rebuild timer iframe HTML from element data
window.refreshTimerEl = function(elId){
  const s = slides[cur];
  if(!s) return;
  const d = s.els.find(x=>x.id===elId);
  if(!d||d.appletId!=='timer') return;
  const p = _appletTheme();
  function hexRGB(h){h=(h||'#6366f1').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function rgba(hex,a){try{const[r,g,b]=hexRGB(hex);return`rgba(${r},${g},${b},${a})`;}catch(e){return hex;}}

  const fs       = d.genFontSize !== undefined ? +d.genFontSize : 72;
  const align    = d.genAlign    || 'center';
  const va       = d.genVAlign   || 'middle';
  const bgBlur   = d.genBgBlur   !== undefined ? +d.genBgBlur   : 0;
  const bgOp     = d.genBgOp     !== undefined ? +d.genBgOp     : 1;
  const numClr   = d.genColor && d.genColor !== '' ? d.genColor : (p.head || p.ac1);
  const rawBg    = d.genBg && d.genBg !== '' ? d.genBg : 'transparent';
  const bgClr    = rawBg !== 'transparent' && bgOp < 1 && rawBg.startsWith('#') ? rawBg + Math.round(bgOp*255).toString(16).padStart(2,'0') : rawBg;
  const shOn     = d.genShadowOn !== undefined ? !!d.genShadowOn : true;
  const shBlur   = d.genShadowBlur !== undefined ? +d.genShadowBlur : 8;
  const shColor  = d.genShadowColor && d.genShadowColor !== '' ? d.genShadowColor : '#000000';
  const shStyle  = shOn && shBlur>0 ? `0 2px ${shBlur}px ${rgba(shColor,0.75)},0 0 30px ${rgba(p.ac1,0.35)}` : `0 0 30px ${rgba(p.ac1,0.3)}`;
  const jc       = va==='top' ? 'flex-start' : va==='bottom' ? 'flex-end' : 'center';
  const ai       = align==='left' ? 'flex-start' : align==='right' ? 'flex-end' : 'center';

  const domEl = document.getElementById('canvas').querySelector('[data-id="'+elId+'"]');
  if(!domEl) return;

  // Sync dataset (same keys as generator + timer-specific)
  domEl.dataset.tmMin           = d.tmMin           !== undefined ? d.tmMin           : 5;
  domEl.dataset.tmSec           = d.tmSec           !== undefined ? d.tmSec           : 0;
  domEl.dataset.tmOnEnd         = d.tmOnEnd         || 'none';
  domEl.dataset.tmOnEndSlide    = d.tmOnEndSlide    !== undefined ? d.tmOnEndSlide    : 0;
  domEl.dataset.genFontSize     = fs;
  domEl.dataset.genColor        = d.genColor        || '';
  domEl.dataset.genBg           = d.genBg           || '';
  domEl.dataset.genBgBlur       = bgBlur;
  domEl.dataset.genBorderColor  = d.genBorderColor  || '';
  domEl.dataset.genBorderWidth  = d.genBorderWidth  !== undefined ? d.genBorderWidth  : 0;
  domEl.dataset.genBgOp         = bgOp;
  domEl.dataset.genShadowOn     = shOn ? 'true' : 'false';
  domEl.dataset.genShadowBlur   = shBlur;
  domEl.dataset.genShadowColor  = d.genShadowColor  || '';
  domEl.dataset.genBold         = d.genBold ? 'true' : 'false';
  domEl.dataset.genAlign        = align;
  domEl.dataset.genVAlign       = va;
  domEl.dataset.genColorScheme  = d.genColorScheme  ? JSON.stringify(d.genColorScheme)  : '';
  domEl.dataset.genBgScheme     = d.genBgScheme     ? JSON.stringify(d.genBgScheme)     : '';
  domEl.dataset.genBorderScheme = d.genBorderScheme ? JSON.stringify(d.genBorderScheme) : '';

  // Border overlay
  const bordOverlay = domEl.querySelector('.applet-border-overlay');
  if(bordOverlay){
    const brdColor = d.genBorderColor && d.genBorderColor !== '' ? d.genBorderColor : rgba(p.ac1, 0.22);
    const brdWidth = d.genBorderWidth !== undefined ? +d.genBorderWidth : 0;
    bordOverlay.style.border = brdWidth > 0 ? brdWidth+'px solid '+brdColor : '';
  }

  // Send live style update + new total time (no restart in editor)
  const iframe = domEl.querySelector('iframe');
  if(iframe && iframe.contentWindow){
    iframe.contentWindow.postMessage({
      type:'genUpdate',
      fs:fs, bold:d.genBold||false,
      color:numClr, align:align, ai:ai, jc:jc,
      bg:bgClr, blur:bgBlur, shadow:shStyle,
    }, '*');
    iframe.contentWindow.postMessage({
      type:'timerUpdate',
      total: (+(d.tmMin||0))*60 + (+(d.tmSec||0)),
      onEnd: d.tmOnEnd || 'none',
      onEndSlide: d.tmOnEndSlide !== undefined ? +d.tmOnEndSlide : 0,
    }, '*');
  }

  // Update persisted HTML
  const cfg2 = {
    tmMin:d.tmMin, tmSec:d.tmSec, tmOnEnd:d.tmOnEnd, tmOnEndSlide:d.tmOnEndSlide,
    genFontSize:d.genFontSize, genColor:d.genColor, genBg:d.genBg, genBgBlur:d.genBgBlur,
    genBorderColor:d.genBorderColor, genBorderWidth:d.genBorderWidth,
    genBold:d.genBold, genAlign:d.genAlign, genVAlign:d.genVAlign,
    genBgOp:d.genBgOp, genShadowOn:d.genShadowOn, genShadowBlur:d.genShadowBlur,
    genShadowColor:d.genShadowColor, palette:p
  };
  d.appletHtml = getTimerHTML(cfg2);
  domEl.dataset.appletHtml = d.appletHtml;
  if(typeof saveState==='function') saveState();
};


// Refresh clock iframe styles (same as timer but without timer-specific fields)
window.refreshClockEl = function(elId){
  const s = slides[cur]; if(!s) return;
  const d = s.els.find(x=>x.id===elId);
  if(!d||d.appletId!=='clock') return;
  const p = _appletTheme();
  function hexRGB(h){h=(h||'#6366f1').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function rgba(hex,a){try{const[r,g,b]=hexRGB(hex);return`rgba(${r},${g},${b},${a})`;}catch(e){return hex;}}
  const fs     = d.genFontSize !== undefined ? +d.genFontSize : 48;
  const align  = d.genAlign    || 'center';
  const va     = d.genVAlign   || 'middle';
  const bgBlur = d.genBgBlur   !== undefined ? +d.genBgBlur   : 0;
  const bgOp   = d.genBgOp     !== undefined ? +d.genBgOp     : 1;
  const numClr = d.genColor && d.genColor !== '' ? d.genColor : (p.head || p.ac1);
  const rawBg  = d.genBg && d.genBg !== '' ? d.genBg : 'transparent';
  const bgClr  = rawBg !== 'transparent' && bgOp < 1 && rawBg.startsWith('#') ? rawBg + Math.round(bgOp*255).toString(16).padStart(2,'0') : rawBg;
  const shOn   = d.genShadowOn !== undefined ? !!d.genShadowOn : true;
  const shBlur = d.genShadowBlur !== undefined ? +d.genShadowBlur : 8;
  const shColorR = d.genShadowColor && d.genShadowColor !== '' ? d.genShadowColor : '#000000';
  const shStyle = shOn && shBlur>0 ? `0 2px ${shBlur}px ${rgba(shColorR,0.75)},0 0 30px ${rgba(p.ac1,0.35)}` : `0 0 30px ${rgba(p.ac1,0.3)}`;
  const jc = va==='top' ? 'flex-start' : va==='bottom' ? 'flex-end' : 'center';
  const ai = align==='left' ? 'flex-start' : align==='right' ? 'flex-end' : 'center';
  const domEl = document.getElementById('canvas').querySelector('[data-id="'+elId+'"]');
  if(!domEl) return;
  // Sync dataset
  domEl.dataset.genFontSize    = fs;
  domEl.dataset.genColor       = d.genColor       || '';
  domEl.dataset.genBg          = d.genBg          || '';
  domEl.dataset.genBgBlur      = bgBlur;
  domEl.dataset.genBorderColor = d.genBorderColor || '';
  domEl.dataset.genBorderWidth = d.genBorderWidth !== undefined ? d.genBorderWidth : 0;
  domEl.dataset.genBgOp        = bgOp;
  domEl.dataset.genShadowOn    = shOn ? 'true' : 'false';
  domEl.dataset.genShadowBlur  = shBlur;
  domEl.dataset.genShadowColor = d.genShadowColor || '';
  domEl.dataset.genBold        = d.genBold ? 'true' : 'false';
  domEl.dataset.genAlign       = align;
  domEl.dataset.genVAlign      = va;
  domEl.dataset.genColorScheme  = d.genColorScheme  ? JSON.stringify(d.genColorScheme)  : '';
  domEl.dataset.genBgScheme     = d.genBgScheme     ? JSON.stringify(d.genBgScheme)     : '';
  domEl.dataset.genBorderScheme = d.genBorderScheme ? JSON.stringify(d.genBorderScheme) : '';
  // Border overlay
  const bordOverlay = domEl.querySelector('.applet-border-overlay');
  if(bordOverlay){ const brdWidth=d.genBorderWidth!==undefined?+d.genBorderWidth:0; bordOverlay.style.border=brdWidth>0?brdWidth+'px solid '+(d.genBorderColor||rgba(p.ac1,0.22)):''; }
  // Send live update
  const iframe = domEl.querySelector('iframe');
  if(iframe && iframe.contentWindow){
    iframe.contentWindow.postMessage({type:'genUpdate',fs,bold:d.genBold||false,color:numClr,align,ai,jc,bg:bgClr,blur:bgBlur,shadow:shStyle},'*');
  }
  // Update persisted HTML
  const cfg2 = {genFontSize:d.genFontSize,genColor:d.genColor,genBg:d.genBg,genBgBlur:d.genBgBlur,genBorderColor:d.genBorderColor,genBorderWidth:d.genBorderWidth,genBold:d.genBold,genAlign:d.genAlign,genVAlign:d.genVAlign,genBgOp:d.genBgOp,genShadowOn:d.genShadowOn,genShadowBlur:d.genShadowBlur,genShadowColor:d.genShadowColor,palette:p};
  d.appletHtml = getClockHTML(cfg2);
  domEl.dataset.appletHtml = d.appletHtml;
  if(typeof saveState==='function') saveState();
};

// Remap scheme-bound colors to new theme palette
function _remapSchemeColors(d, p){
  const ti=(typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)?appliedThemeIdx:-1;
  const t=ti>=0&&typeof THEMES!=='undefined'?THEMES[ti]:null;
  if(!t) return;
  const isLight=!t.dark;
  const base=typeof _themeColors==='function'?_themeColors(t):[p.ac1,p.ac2,p.ac3,p.ac1,p.ac1,p.head,p.text,'#000000'];
  const tintLevels=[0,0.22,0.44,0.66,0.88];
  function tintHex(hex,tint){
    if(!tint) return hex;
    const h=(hex||'#6366f1').replace('#','');
    const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
    return '#'+[r,g,b].map(x=>Math.round(x+(255-x)*tint).toString(16).padStart(2,'0')).join('');
  }
  function schemeColor(scheme){
    if(!scheme||scheme.col===undefined||scheme.row===undefined) return null;
    const col=scheme.col, row=scheme.row, tint=tintLevels[row]||0;
    const isLastCol=(col===base.length-1);
    if(isLastCol){
      return isLight
        ?(tint===0?'#000000':tintHex('#000000',tint))
        :(tint===0?'#ffffff':tintHex('#ffffff',tint));
    }
    return tintHex(base[col]||base[0], tint);
  }
  if(d.genBgScheme){const c=schemeColor(d.genBgScheme);if(c) d.genBg=c;}
  if(d.genColorScheme){const c=schemeColor(d.genColorScheme);if(c) d.genColor=c;}
  if(d.genBorderScheme){const c=schemeColor(d.genBorderScheme);if(c) d.genBorderColor=c;}
}

// Refresh all theme-aware applets after theme change
function refreshAppletThemes(){
  const p=_appletTheme();
  slides.forEach(s=>{
    (s.els||[]).forEach(d=>{
      if(d.type!=='applet')return;
      // Generator: use refreshGeneratorEl — it re-resolves colors from d (already remapped by theme) via postMessage
      if(d.appletId==='timer'||d.appletId==='generator'||d.appletId==='clock'){
        // Remap scheme-bound colors to new theme
        _remapSchemeColors(d, p);
        const domEl=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
        if((d.appletId==='clock')&&domEl&&typeof refreshClockEl==='function'){requestAnimationFrame(()=>{refreshClockEl(d.id);});return;}
        if(d.appletId==='timer'&&domEl&&typeof refreshTimerEl==='function'){
          requestAnimationFrame(()=>{
            refreshTimerEl(d.id);
            // Refresh props panel if this element is selected
            const sel=document.querySelector('.el.selected,[data-selected=true]');
            if(sel&&sel.dataset.id===d.id&&typeof syncTimerProps==='function') syncTimerProps();
          });
        } else if(d.appletId==='generator'&&domEl&&typeof refreshGeneratorEl==='function'){
          requestAnimationFrame(()=>{
            refreshGeneratorEl(d.id);
            const sel=document.querySelector('.el.selected,[data-selected=true]');
            if(sel&&sel.dataset.id===d.id&&typeof syncGenProps==='function') syncGenProps();
          });
        }
        return;
      }
      const a=APPLETS.find(x=>x.id===d.appletId);
      if(!a||typeof a.htmlFn!=='function')return;
      d.appletHtml=a.htmlFn(p);
      const domEl=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
      if(domEl){
        const oldIframe=domEl.querySelector('iframe');
        if(oldIframe){
          const newIframe=document.createElement('iframe');
          newIframe.srcdoc=d.appletHtml;
          newIframe.style.cssText='width:100%;height:100%;border:none;background:transparent;';
          newIframe.setAttribute('allowtransparency','true');
          newIframe.sandbox='allow-scripts';
          oldIframe.parentNode.replaceChild(newIframe,oldIframe);
        }
        domEl.dataset.appletHtml=d.appletHtml;
      }
    });
  });
  if(typeof saveState==="function")saveState();
}
