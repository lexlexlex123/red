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
    var num=document.getElementById('num'),wrap=document.getElementById('wrap'),wb=document.getElementById('wrapbg'),dat=document.getElementById('dat');
    if(!num||!wrap) return;
    if(d.fs!==undefined){num.style.fontSize=d.fs+'px';if(dat)dat.style.fontSize=Math.max(11,Math.round(d.fs*0.28))+'px';}
    if(d.bold!==undefined)num.style.fontWeight=d.bold?900:700;
    if(d.color!==undefined){num.style.color=d.color;if(dat)dat.style.color=d.color;}
    if(d.align!==undefined){num.style.textAlign=d.align;if(dat)dat.style.textAlign=d.align;wrap.style.alignItems=d.ai;}
    if(d.jc!==undefined)wrap.style.justifyContent=d.jc;
    if(d.bg!==undefined&&wb)wb.style.background=d.bg;
    if(d.blur!==undefined&&wb){wb.style.backdropFilter=d.blur>0?'blur('+d.blur+'px)':'none';wb.style.webkitBackdropFilter=d.blur>0?'blur('+d.blur+'px)':'none';}
    if(d.shadow!==undefined){num.style.textShadow=d.shadow;if(dat)dat.style.textShadow=d.shadow;}
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
var _onEnd='${_onEnd}',_onEndSlide=${_onEndSlide},_onEndAnim=${JSON.stringify(cfg.tmOnEndAnim || '')};
function _postAppletMsg(msg){
  try{window.parent.postMessage(msg,'*');}catch(e){}
  try{if(window.top!==window.parent) window.top.postMessage(msg,'*');}catch(e){}
}
function _fireOnEnd(){
  if(_onEnd==='next') _postAppletMsg({type:'timerNav',mode:'next'});
  else if(_onEnd==='slide') _postAppletMsg({type:'timerNav',mode:'slide',slide:_onEndSlide});
  else if(_onEnd==='anim'&&_onEndAnim) _postAppletMsg({type:'appletAnim',ref:_onEndAnim,appletVal:_rem});
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
    if(d.total!==undefined){
      _total=d.total;
      if(!_t){
        _rem=_total;_started=false;
        var _numEl=document.getElementById('num');
        _numEl.textContent=fmt(_rem);
        _numEl.classList.remove('done');
      }
    }
    if(d.onEnd!==undefined){_onEnd=d.onEnd;}
    if(d.onEndSlide!==undefined){_onEndSlide=+d.onEndSlide;}
    if(d.onEndAnim!==undefined){_onEndAnim=d.onEndAnim||'';}
  }
  // Style updates (same keys as genUpdate)
  if(d.type==='genUpdate'){
    var num=document.getElementById('num'),wrap=document.getElementById('wrap'),wb=document.getElementById('wrapbg');
    if(!num||!wrap) return;
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


function _splitGenLines(text){
  return (text || '').split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
}
function _genDisplayText(text){
  return String(text == null ? '' : text).replace(/\\n/g, '\n');
}

function getGeneratorHTML(cfg){
  cfg = cfg || {};
  const mode   = cfg.genMode || 'number';
  const min    = cfg.genMin      !== undefined ? +cfg.genMin      : 1;
  const max    = cfg.genMax      !== undefined ? +cfg.genMax      : 100;
  const step   = cfg.genStep     !== undefined ? +cfg.genStep     : 1;
  const lines  = _splitGenLines(cfg.genLines);
  const linesJson = JSON.stringify(lines.length ? lines : ['?']);
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
html,body{width:100%;height:100%;background:transparent;overflow:hidden;cursor:pointer;}
.wrap{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:${ai};justify-content:${jc};padding:clamp(8px,4%,20px);box-sizing:border-box;cursor:pointer;}
.wrap-bg{position:absolute;inset:0;background:${bgClr};${bgBlur > 0 ? `backdrop-filter:blur(${bgBlur}px);-webkit-backdrop-filter:blur(${bgBlur}px);` : ''}z-index:0;}
.num{position:relative;z-index:1;font-size:${fs}px;font-weight:${bold};color:${numClr};font-variant-numeric:tabular-nums;letter-spacing:-0.02em;line-height:1.1;text-align:${align};text-shadow:${shStyle};transition:font-size .15s,color .15s,transform .15s,opacity .15s;word-break:break-word;white-space:pre-line;width:100%;cursor:pointer;}
.num.pop{transform:scale(1.06);opacity:.6;}
</style></head><body>
<div class="wrap" id="wrap">
  <div class="wrap-bg" id="wrapbg"></div>
  <div class="num" id="num">?</div>
</div>
<script>
var _mode=${JSON.stringify(mode)},_min=${min},_max=${max},_step=${step},_lines=${linesJson};
function _genDisp(s){return String(s==null?'':s).replace(/\\\\n/g,'\\n');}
function gen(){
  var el=document.getElementById('num');
  el.classList.add('pop');
  setTimeout(function(){el.classList.remove('pop');},150);
  var val;
  if(_mode==='text'){
    val=_lines.length? _lines[Math.floor(Math.random()*_lines.length)] : '?';
  }else{
    var steps=Math.round((_max-_min)/_step);
    val=_min+Math.round(Math.random()*steps)*_step;
    val=Math.round(val*1e9)/1e9;
  }
  el.textContent=_genDisp(val);
}
gen();
document.getElementById('wrap').addEventListener('click', function(e){ e.preventDefault(); gen(); });
// Live style updates via postMessage (no iframe reload needed)
window.addEventListener('message',function(e){
  var d=e.data;if(!d)return;
  if(d.type==='genStep'){ gen(); return; }
  if(!d||d.type!=='genUpdate')return;
  var wrap=document.getElementById('wrap');
  var num=document.getElementById('num');
  if(!num||!wrap)return;
  if(d.fs   !==undefined){num.style.fontSize=d.fs+'px';}
  if(d.bold !==undefined){num.style.fontWeight=d.bold?900:800;}
  if(d.color!==undefined){num.style.color=d.color;}
  if(d.align!==undefined){num.style.textAlign=d.align;wrap.style.alignItems=d.ai;}
  if(d.jc   !==undefined){wrap.style.justifyContent=d.jc;}
  if(d.bg   !==undefined){var wb2=document.getElementById('wrapbg');if(wb2)wb2.style.background=d.bg;}
  if(d.blur  !==undefined){var wb=document.getElementById('wrapbg');if(wb){wb.style.backdropFilter=d.blur>0?'blur('+d.blur+'px)':'none';wb.style.webkitBackdropFilter=d.blur>0?'blur('+d.blur+'px)':'none';}}
  if(d.shadow!==undefined){var nm2=document.getElementById('num');if(nm2)nm2.style.textShadow=d.shadow;}
  if(num) num.style.whiteSpace='pre-line';
  if(d.mode !==undefined){_mode=d.mode;if(typeof _genDisp==='function')gen();else{_genTextShow();}}
  if(d.lines!==undefined){_lines=d.lines;if(typeof _genDisp==='function')gen();else{_genTextShow();}}
  if(d.min  !==undefined){_min=d.min;_max=d.max;_step=d.step;if(_mode!=='text')gen();}
  function _genTextShow(){
    if(_mode!=='text'){gen();return;}
    var el=document.getElementById('num');
    el.classList.add('pop');
    setTimeout(function(){el.classList.remove('pop');},150);
    var val=_lines.length?_lines[Math.floor(Math.random()*_lines.length)]:'?';
    el.textContent=String(val).replace(/\\\\n/g,'\\n');
  }
});
<\/script></body></html>`;
}

function getCounterHTML(cfg){
  cfg = cfg || {};
  const start  = cfg.cntStart !== undefined ? +cfg.cntStart : 0;
  const step   = cfg.genStep  !== undefined ? +cfg.genStep  : 1;
  const groupId = cfg.cntGroupId || '';
  const goalRaw = cfg.cntGoal;
  const hasGoal = goalRaw !== undefined && goalRaw !== null && goalRaw !== '';
  const goal   = hasGoal ? +goalRaw : null;
  const cntOnEnd = cfg.cntOnEnd || 'none';
  const cntOnEndSlide = cfg.cntOnEndSlide !== undefined ? +cfg.cntOnEndSlide : 0;
  const cntOnEndAnim = cfg.cntOnEndAnim || '';
  const fs     = cfg.genFontSize !== undefined ? +cfg.genFontSize : 64;
  const bold   = cfg.genBold ? 900 : 800;
  const align  = cfg.genAlign || 'center';
  const va     = cfg.genVAlign || 'middle';
  const bgBlur = cfg.genBgBlur !== undefined ? +cfg.genBgBlur : 0;
  const bgOp   = cfg.genBgOp !== undefined ? +cfg.genBgOp : 1;
  const shOn   = cfg.genShadowOn !== undefined ? !!cfg.genShadowOn : true;
  const shBlur = cfg.genShadowBlur !== undefined ? +cfg.genShadowBlur : 8;
  const shColorR = cfg.genShadowColor && cfg.genShadowColor !== '' ? cfg.genShadowColor : '#000000';
  const p = cfg.palette || _appletTheme();
  function hexRGB(h){h=(h||'#6366f1').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function rgba(hex,a){try{const[r,g,b]=hexRGB(hex);return`rgba(${r},${g},${b},${a})`;}catch(e){return hex;}}
  const numClr = cfg.genColor && cfg.genColor !== '' ? cfg.genColor : (p.head || p.ac1);
  const rawBg  = cfg.genBg && cfg.genBg !== '' ? cfg.genBg : 'transparent';
  const bgClr  = rawBg !== 'transparent' && bgOp < 1 && rawBg.startsWith('#') ? rawBg + Math.round(bgOp*255).toString(16).padStart(2,'0') : rawBg;
  const shStyle = shOn && shBlur > 0 ? `0 2px ${shBlur}px ${rgba(shColorR,0.75)},0 0 30px ${rgba(p.ac1,0.35)}` : `0 0 30px ${rgba(p.ac1,0.3)}`;
  const jc = va === 'top' ? 'flex-start' : va === 'bottom' ? 'flex-end' : 'center';
  const ai = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;user-select:none;-webkit-user-select:none;}
html,body{width:100%;height:100%;background:transparent;overflow:hidden;cursor:pointer;}
.wrap{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:${ai};justify-content:${jc};padding:clamp(8px,4%,20px);box-sizing:border-box;cursor:pointer;}
.wrap-bg{position:absolute;inset:0;background:${bgClr};${bgBlur > 0 ? `backdrop-filter:blur(${bgBlur}px);-webkit-backdrop-filter:blur(${bgBlur}px);` : ''}z-index:0;}
.num{position:relative;z-index:1;font-size:${fs}px;font-weight:${bold};color:${numClr};font-variant-numeric:tabular-nums;letter-spacing:-0.02em;line-height:1.1;text-align:${align};text-shadow:${shStyle};transition:font-size .15s,color .15s,transform .15s,opacity .15s;width:100%;cursor:pointer;}
.num.pop{transform:scale(1.06);opacity:.6;}
</style></head><body>
<div class="wrap" id="wrap">
  <div class="wrap-bg" id="wrapbg"></div>
  <div class="num" id="num"></div>
</div>
<script>
var _val=${start}, _step=${step}, _start=${start};
var _goal=${goal === null ? 'null' : goal}, _onEnd=${JSON.stringify(cntOnEnd)}, _onEndSlide=${cntOnEndSlide}, _onEndAnim=${JSON.stringify(cntOnEndAnim)};
var _gid=${JSON.stringify(groupId)};
function showVal(){
  var el=document.getElementById('num');
  if(!el) return;
  el.textContent=String(_val);
}
function _postAppletMsg(msg){
  try{window.parent.postMessage(msg,'*');}catch(e){}
  try{if(window.top!==window.parent) window.top.postMessage(msg,'*');}catch(e){}
}
function _fireOnGoal(){
  if(_goal===null) return;
  if(_onEnd==='next') _postAppletMsg({type:'timerNav',mode:'next'});
  else if(_onEnd==='slide') _postAppletMsg({type:'timerNav',mode:'slide',slide:_onEndSlide});
  else if(_onEnd==='anim'&&_onEndAnim) _postAppletMsg({type:'appletAnim',ref:_onEndAnim,appletVal:_val});
}
function _checkGoal(prev){
  if(_goal===null) return;
  if(_step>0 && prev<_goal && _val>=_goal) _fireOnGoal();
  else if(_step<0 && prev>_goal && _val<=_goal) _fireOnGoal();
  else if(_step===0 && Math.round(_val*1e9)===Math.round(_goal*1e9)) _fireOnGoal();
}
function stepUp(){
  var el=document.getElementById('num');
  if(!el) return;
  el.classList.add('pop');
  setTimeout(function(){el.classList.remove('pop');},150);
  var prev=_val;
  _val=Math.round((_val+_step)*1e9)/1e9;
  showVal();
  _checkGoal(prev);
  if(_gid) _postAppletMsg({type:'counterSync', gid:_gid, val:_val});
}
showVal();
document.getElementById('wrap').addEventListener('click', function(e){ e.preventDefault(); stepUp(); });
window.addEventListener('message', function(e){
  var d=e.data; if(!d) return;
  if(d.type==='counterStep'){ stepUp(); return; }
  if(d.type==='counterSync'){
    if(d.val!==undefined){ _val=+d.val; showVal(); }
    return;
  }
  if(d.type==='counterMorphStyle'){
    var mNum=document.getElementById('num');
    var mWb=document.getElementById('wrapbg');
    if(mNum){
      mNum.style.transition='none';
      if(d.color!==undefined) mNum.style.color=d.color;
      if(d.fs!==undefined) mNum.style.fontSize=d.fs+'px';
    }
    if(mWb){
      mWb.style.transition='none';
      if(d.bg!==undefined) mWb.style.background=d.bg;
    }
    return;
  }
  if(d.type==='counterUpdate'){
    var wrap=document.getElementById('wrap');
    var num=document.getElementById('num');
    var wb=document.getElementById('wrapbg');
    if(!num||!wrap) return;
    if(d.fs!==undefined) num.style.fontSize=d.fs+'px';
    if(d.bold!==undefined) num.style.fontWeight=d.bold?900:800;
    if(d.color!==undefined) num.style.color=d.color;
    if(d.align!==undefined){ num.style.textAlign=d.align; wrap.style.alignItems=d.ai; }
    if(d.jc!==undefined) wrap.style.justifyContent=d.jc;
    if(d.bg!==undefined&&wb) wb.style.background=d.bg;
    if(d.blur!==undefined&&wb){ wb.style.backdropFilter=d.blur>0?'blur('+d.blur+'px)':'none'; wb.style.webkitBackdropFilter=d.blur>0?'blur('+d.blur+'px)':'none'; }
    if(d.shadow!==undefined) num.style.textShadow=d.shadow;
    if(d.step!==undefined) _step=+d.step;
    if(d.start!==undefined){ _start=+d.start; _val=_start; showVal(); }
    if(d.goal!==undefined){ _goal=(d.goal===null||d.goal==='')?null:+d.goal; }
    if(d.onEnd!==undefined) _onEnd=d.onEnd;
    if(d.onEndSlide!==undefined) _onEndSlide=+d.onEndSlide;
    if(d.onEndAnim!==undefined) _onEndAnim=d.onEndAnim||'';
    if(d.gid!==undefined) _gid=d.gid||'';
  }
});
<\/script></body></html>`;
}

function _notesEsc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function getNotesHTML(palette, cfg){
  cfg = cfg || {};
  const p = palette || _appletTheme();
  const bg = cfg.notesBg || p.ac3 || '#fef3c7';
  const hdrBg = p.ac2 || '#f59e0b';
  const fg = p.text || '#1a1a1a';
  const title = (typeof t === 'function' ? t('appletNotesTitle') : 'Notes');
  const ph = (typeof t === 'function' ? t('appletNotesPlaceholder') : 'Click to type…');
  const bgVal = bg.startsWith('#') ? bg : '#fef3c7';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;height:100vh;display:flex;flex-direction:column;background:${_notesEsc(bg)};">
<style>*{margin:0;padding:0;box-sizing:border-box;}#hdr{background:${_notesEsc(hdrBg)};padding:6px 10px;font-weight:700;font-size:12px;color:${_notesEsc(fg)};display:flex;justify-content:space-between;align-items:center;}#ta{flex:1;border:none;background:transparent;resize:none;padding:10px;font-size:13px;color:${_notesEsc(fg)};font-family:inherit;line-height:1.6;}#ta:focus{outline:none;}</style>
<div id="hdr"><span>📝 ${_notesEsc(title)}</span><input type="color" id="bgClr" value="${_notesEsc(bgVal)}" style="width:22px;height:18px;border:none;background:none;cursor:pointer;padding:0"></div>
<textarea id="ta" placeholder="${_notesEsc(ph)}">${_notesEsc(cfg.notesText || '')}</textarea>
<script>
(function(){
  var ta=document.getElementById('ta'),bgClr=document.getElementById('bgClr');
  function send(o){try{parent.postMessage(Object.assign({type:'notesUpdate'},o),'*');}catch(e){}}
  ta.addEventListener('input',function(){send({text:ta.value});});
  bgClr.addEventListener('input',function(){document.body.style.background=this.value;send({bg:this.value});});
  window.addEventListener('message',function(e){
    if(!e.data||e.data.type!=='notesTheme')return;
    if(e.data.bg){document.body.style.background=e.data.bg;bgClr.value=e.data.bg;}
    if(e.data.hdrBg){document.getElementById('hdr').style.background=e.data.hdrBg;}
    if(e.data.color){ta.style.color=e.data.color;document.getElementById('hdr').style.color=e.data.color;}
    if(e.data.text!==undefined) ta.value=e.data.text;
  });
})();
<\/script></body></html>`;
}
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
  {id:'calculator', name:'Calculator', nameRu:'Калькулятор', desc:'Basic calculator',   descRu:'Обычный калькулятор', icon:'⌨', htmlFn:getCalcHTML,  aspectRatio:3/4},
  {id:'clock',      name:'Clock',      nameRu:'Часы',         desc:'Live digital clock', descRu:'Электронные часы',    icon:'🕐', htmlFn:(p,cfg)=>getClockHTML(cfg), aspectRatio:null, hasProps:true},
  {id:'timer',      name:'Timer',      nameRu:'Таймер',       desc:'Countdown timer',    descRu:'Обратный отсчёт',    icon:'⏱', htmlFn:(p,cfg)=>getTimerHTML(cfg), aspectRatio:null, hasProps:true},
  {id:'notes',      name:'Notes',      nameRu:'Заметки',      desc:'Sticky note',        descRu:'Заметка на слайде',  icon:'📝', htmlFn:(p,cfg)=>getNotesHTML(p,cfg), aspectRatio:null},
  {id:'qr',         name:'QR Code',    nameRu:'QR-код',       desc:'Generate QR code',   descRu:'Сгенерировать QR-код', icon:'▦', hasProps:true,        aspectRatio:1},
  {id:'generator',  name:'Generator',  nameRu:'Генератор', desc:'Random number',      descRu:'Случайное число', icon:'🎲', htmlFn:(p,cfg)=>getGeneratorHTML(cfg), aspectRatio:null, hasProps:true},
  {id:'counter',    name:'Counter',    nameRu:'Счётчик',   desc:'Click counter',      descRu:'Счётчик по клику', icon:'🔢', htmlFn:(p,cfg)=>getCounterHTML(cfg), aspectRatio:null, hasProps:true},
  {id:'periodic',   name:'Periodic table', nameRu:'Таблица Менделеева', desc:'Element card', descRu:'Карточка химического элемента', icon:'🧪', htmlFn:(p,cfg)=>typeof getPeriodicHTML==='function'?getPeriodicHTML(p,cfg):'', aspectRatio:280/320, hasProps:true},
  {id:'flip',       name:'Flip card',  nameRu:'Перевертыш',  desc:'Two-sided flip card', descRu:'Двусторонняя карточка', icon:'⇆', htmlFn:(p,cfg)=>typeof getFlipHTML==='function'?getFlipHTML(p,cfg):'', aspectRatio:300/400, hasProps:true},
  {id:'quote',      name:'Quote',      nameRu:'Цитата',      desc:'Random famous quote', descRu:'Случайная цитата из банка', icon:'❝', insertFn:()=>typeof insertQuoteText==='function'&&insertQuoteText()},
];

// Get rendered HTML for an applet (theme-aware if htmlFn exists)
function getAppletHtml(appletId, palette){
  const a=APPLETS.find(x=>x.id===appletId);
  if(!a)return '';
  if(typeof a.htmlFn==='function')return a.htmlFn(palette||_appletTheme());
  return a.html||'';
}

function isPasteableUrl(s){
  s=String(s||'').trim().replace(/^[<"']+|[>"']+$/g,'').replace(/[.,;:!?)]+$/g,'');
  if(!s||s.length>2048) return false;
  if(/^https?:\/\//i.test(s)){
    try{ new URL(s); return true; }catch(e){ return /^https?:\/\/\S+$/i.test(s); }
  }
  if(/^www\./i.test(s)) return /^www\.\S+$/i.test(s);
  return false;
}

function normalizePasteUrl(s){
  s=String(s||'').trim().replace(/^[<"']+|[>"']+$/g,'').replace(/[.,;:!?)]+$/g,'');
  if(/^www\./i.test(s)) return 'https://'+s;
  return s;
}

function extractPasteUrl(plain, html){
  if(html){
    try{
      const tmp=document.createElement('div');
      tmp.innerHTML=html;
      const a=tmp.querySelector('a[href]');
      if(a){
        const href=(a.getAttribute('href')||'').trim();
        if(isPasteableUrl(href)) return normalizePasteUrl(href);
      }
    }catch(e){}
    const hrefM=String(html).match(/href\s*=\s*["'](https?:\/\/[^"']+)["']/i);
    if(hrefM&&isPasteableUrl(hrefM[1])) return normalizePasteUrl(hrefM[1]);
  }
  const plainStr=String(plain||'').trim();
  if(!plainStr) return null;
  if(isPasteableUrl(plainStr)) return normalizePasteUrl(plainStr);
  const httpM=plainStr.match(/https?:\/\/[^\s<>"']+/i);
  if(httpM&&isPasteableUrl(httpM[0])) return normalizePasteUrl(httpM[0]);
  const wwwM=plainStr.match(/\bwww\.[^\s<>"']+/i);
  if(wwwM&&isPasteableUrl(wwwM[0])) return normalizePasteUrl(wwwM[0]);
  const firstLine=plainStr.split(/\r?\n/)[0].trim();
  if(isPasteableUrl(firstLine)) return normalizePasteUrl(firstLine);
  return null;
}

function urlFromElementData(d){
  if(!d||d.type!=='text') return null;
  return extractPasteUrl((function(){
    const tmp=document.createElement('div');
    tmp.innerHTML=d.html||'';
    return (tmp.innerText||tmp.textContent||'').trim();
  })(), d.html||'');
}

function _qrPosFromClient(clientX, clientY, w, h){
  let x=Math.round((canvasW-w)/2), y=Math.round((canvasH-h)/2);
  if(clientX!=null&&clientY!=null&&typeof _toCanvasCoords==='function'){
    const pos=_toCanvasCoords(clientX, clientY);
    x=Math.max(0, Math.min(canvasW-w, Math.round(pos.x-w/2)));
    y=Math.max(0, Math.min(canvasH-h, Math.round(pos.y-h/2)));
  }
  return {x, y};
}

// Editable QR applet (_isQR image with props panel)
function insertQRAppletAt(text, clientX, clientY){
  text=String(text||'').trim();
  if(!text){
    if(typeof toast==='function') toast(typeof t==='function'?t('toastQrNeedText'):'Select or enter text first', 'warn');
    return;
  }
  const a=APPLETS.find(x=>x.id==='qr');
  if(!a) return;
  insertApplet(a, {qrText:text, clientX, clientY});
  if(typeof syncProps==='function') syncProps();
}

// Insert applet onto current slide
function insertApplet(a, opts){
  opts=opts||{};
  // Таблица Менделеева — сначала выбор элемента
  if(a.id==='periodic' && !opts.pteSymbol){
    if(typeof openPeriodicModal==='function') openPeriodicModal({mode:'insert'});
    return;
  }
  // Цитата — обычный текстовый блок со случайной цитатой
  if(a.id==='quote'){
    if(typeof insertQuoteText==='function') insertQuoteText();
    return;
  }
  // Перевертыш — двусторонняя карточка
  if(a.id==='flip'){
    if(typeof insertFlipApplet==='function') insertFlipApplet();
    return;
  }
  if(typeof pushUndo==="function")pushUndo();
  const aspect=a.aspectRatio||null;
  const w=300, h=aspect?Math.round(w/aspect):320;
  const pos=_qrPosFromClient(opts.clientX, opts.clientY, w, h);
  const x=pos.x;
  const y=pos.y;
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
    ...(a.id==='generator' ? {genMode:'number',genLines:'',genMin:1,genMax:100,genStep:1, genFontSize:64, genColor:'', genBg:'', genBgOp:0.2, genBgBlur:0, genBorderColor:'', genBorderWidth:0, genAlign:'center', genVAlign:'middle', genBold:false, genShadowBlur:8, genShadowY:2, genShadowColor:'#000000'} : {}),
    ...(a.id==='counter'   ? {cntStart:0, genStep:1, genFontSize:64, genColor:'', genBg:'', genBgOp:0.2, genBgBlur:0, genBorderColor:'', genBorderWidth:0, genAlign:'center', genVAlign:'middle', genBold:false, genShadowBlur:8, genShadowColor:'#000000', cntGroupId:''} : {}),
    ...(a.id==='timer'     ? {tmMin:5, tmSec:0, genFontSize:72, genColor:'', genBg:'', genBgOp:0.2, genBgBlur:0, genBorderColor:'', genBorderWidth:0, genAlign:'center', genVAlign:'middle', genBold:false, genShadowBlur:8, genShadowColor:'#000000', genShadowOn:true} : {}),
    ...(a.id==='clock'     ? {genFontSize:48, genColor:'', genBg:'', genBgOp:0.2, genBgBlur:0, genBorderColor:'', genBorderWidth:0, genAlign:'center', genVAlign:'middle', genBold:false, genShadowBlur:8, genShadowColor:'#000000', genShadowOn:true} : {}),
    ...(a.id==='qr'        ? {qrText:'https://example.com', qrBg:'#ffffff', qrColor:'#000000', qrRx:16} : {}),
    ...(a.id==='notes'     ? {notesText:'', notesBg:''} : {}),
  };
  // QR: генерируем сразу как image элемент
  if(a.id === 'qr'){
    if(opts.qrText!=null) d.qrText=String(opts.qrText).trim()||d.qrText;
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
window.refreshGeneratorEl = function(elId, opts){
  opts = opts || {};
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
  domEl.dataset.genMode        = d.genMode        || 'number';
  domEl.dataset.genLines       = encodeURIComponent(d.genLines || '');
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
  if(!opts.domOnly && iframe){
    const linesArr = _splitGenLines(d.genLines);
    _appletPostMessage(iframe, {
      type:'genUpdate',
      fs: fs, bold: d.genBold||false,
      color: numClr, align: align, ai: ai, jc: jc,
      bg: bgClr, blur: bgBlur, shadow: shStyle,
      mode: d.genMode || 'number',
      lines: linesArr.length ? linesArr : ['?'],
      min: d.genMin!==undefined?+d.genMin:1,
      max: d.genMax!==undefined?+d.genMax:100,
      step: d.genStep!==undefined?+d.genStep:1,
    });
  }

  if(!opts.domOnly){
    d.appletHtml = getGeneratorHTML(_genAppletCfg(d, p));
    domEl.dataset.appletHtml = d.appletHtml;
    if(typeof saveState==='function') saveState();
  }
};

window.refreshCounterEl = function(elId, opts){
  opts = opts || {};
  const s = slides[cur];
  if(!s) return;
  const d = s.els.find(x => x.id === elId);
  if(!d || d.appletId !== 'counter') return;
  const p = _appletTheme();
  function hexRGB(h){h=(h||'#6366f1').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function rgba(hex,a){try{const[r,g,b]=hexRGB(hex);return`rgba(${r},${g},${b},${a})`;}catch(e){return hex;}}

  const fs       = d.genFontSize !== undefined ? +d.genFontSize : 64;
  const align    = d.genAlign || 'center';
  const va       = d.genVAlign || 'middle';
  const bgBlur   = d.genBgBlur !== undefined ? +d.genBgBlur : 0;
  const bgOp     = d.genBgOp !== undefined ? +d.genBgOp : 1;
  const numClr   = d.genColor && d.genColor !== '' ? d.genColor : (p.head || p.ac1);
  const rawBg    = d.genBg && d.genBg !== '' ? d.genBg : 'transparent';
  const bgClr    = rawBg !== 'transparent' && bgOp < 1 && rawBg.startsWith('#') ? rawBg + Math.round(bgOp*255).toString(16).padStart(2,'0') : rawBg;
  const brdColor = d.genBorderColor && d.genBorderColor !== '' ? d.genBorderColor : rgba(p.ac1, 0.22);
  const brdWidth = d.genBorderWidth !== undefined ? +d.genBorderWidth : 0;
  const shOn     = d.genShadowOn !== undefined ? !!d.genShadowOn : true;
  const shBlur   = d.genShadowBlur !== undefined ? +d.genShadowBlur : 8;
  const shColor  = d.genShadowColor && d.genShadowColor !== '' ? d.genShadowColor : '#000000';
  const shStyle  = shOn && shBlur > 0 ? `0 2px ${shBlur}px ${rgba(shColor,0.75)},0 0 30px ${rgba(p.ac1,0.35)}` : `0 0 30px ${rgba(p.ac1,0.3)}`;
  const jc       = va === 'top' ? 'flex-start' : va === 'bottom' ? 'flex-end' : 'center';
  const ai       = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  const domEl = document.getElementById('canvas').querySelector('[data-id="'+elId+'"]');
  if(!domEl) return;

  domEl.dataset.cntStart       = d.cntStart !== undefined ? d.cntStart : 0;
  domEl.dataset.cntGoal        = d.cntGoal !== undefined && d.cntGoal !== null && d.cntGoal !== '' ? d.cntGoal : '';
  domEl.dataset.cntOnEnd       = d.cntOnEnd || 'none';
  domEl.dataset.cntOnEndSlide  = d.cntOnEndSlide !== undefined ? d.cntOnEndSlide : 0;
  domEl.dataset.cntOnEndAnim   = d.cntOnEndAnim || '';
  domEl.dataset.cntGroupId     = d.cntGroupId || '';
  domEl.dataset.genStep        = d.genStep !== undefined ? d.genStep : 1;
  domEl.dataset.genFontSize    = fs;
  domEl.dataset.genColor       = d.genColor || '';
  domEl.dataset.genBg          = d.genBg || '';
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
  domEl.dataset.genColorScheme  = d.genColorScheme ? JSON.stringify(d.genColorScheme) : '';
  domEl.dataset.genBgScheme     = d.genBgScheme ? JSON.stringify(d.genBgScheme) : '';
  domEl.dataset.genBorderScheme = d.genBorderScheme ? JSON.stringify(d.genBorderScheme) : '';

  const bordOverlay = domEl.querySelector('.applet-border-overlay');
  if(bordOverlay){
    bordOverlay.style.border = brdWidth > 0 ? brdWidth + 'px solid ' + brdColor : '';
  }

  const iframe = domEl.querySelector('iframe');
  if(!opts.domOnly && iframe){
    _appletPostMessage(iframe, {
      type: 'counterUpdate',
      fs, bold: d.genBold || false,
      color: numClr, align, ai, jc,
      bg: bgClr, blur: bgBlur, shadow: shStyle,
      start: d.cntStart !== undefined ? +d.cntStart : 0,
      step: d.genStep !== undefined ? +d.genStep : 1,
      goal: d.cntGoal !== undefined && d.cntGoal !== null && d.cntGoal !== '' ? +d.cntGoal : null,
      onEnd: d.cntOnEnd || 'none',
      onEndSlide: d.cntOnEndSlide !== undefined ? +d.cntOnEndSlide : 0,
      onEndAnim: d.cntOnEndAnim || '',
      gid: d.cntGroupId || '',
    });
  }

  if(!opts.domOnly){
    d.appletHtml = getCounterHTML(_counterAppletCfg(d, p));
    domEl.dataset.appletHtml = d.appletHtml;
    if(typeof saveState === 'function') saveState();
  }
};

window._wireCounterAppletClick = function(el){
  if(!el || el.dataset.appletId !== 'counter' || el._counterClickWired) return;
  el._counterClickWired = true;
  _wireAppletStepClick(el, 'counterStep');
};

window._wireGeneratorAppletClick = function(el){
  if(!el || el.dataset.appletId !== 'generator' || el._generatorClickWired) return;
  el._generatorClickWired = true;
  _wireAppletStepClick(el, 'genStep');
};

function _wireAppletStepClick(el, msgType){
  el.style.cursor = 'pointer';
  let downX, downY, moved;
  const onMove = ev => {
    if(downX == null) return;
    if(Math.hypot(ev.clientX - downX, ev.clientY - downY) > 4) moved = true;
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    if(downX == null) return;
    const click = !moved && !window._anyDragging;
    downX = downY = null;
    if(!click) return;
    const iframe = el.querySelector('iframe');
    if(iframe && typeof _appletPostMessage === 'function') _appletPostMessage(iframe, { type: msgType });
  };
  el.addEventListener('mousedown', ev => {
    if(ev.target.closest('.rh') || ev.target.closest('.db')) return;
    ev.stopPropagation();
    downX = ev.clientX;
    downY = ev.clientY;
    moved = false;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, { once: true });
  });
};

// Rebuild timer iframe HTML from element data
window.refreshTimerEl = function(elId, opts){
  opts = opts || {};
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
  domEl.dataset.tmOnEndAnim     = d.tmOnEndAnim     || '';
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

  const iframe = domEl.querySelector('iframe');

  if(!opts.domOnly){
    d.appletHtml = getTimerHTML(_genAppletCfg(d, p));
    domEl.dataset.appletHtml = d.appletHtml;
    if(iframe) iframe.srcdoc = d.appletHtml;
    if(typeof saveState==='function') saveState();
  } else if(iframe){
    _appletPostMessage(iframe, {
      type:'genUpdate',
      fs:fs, bold:d.genBold||false,
      color:numClr, align:align, ai:ai, jc:jc,
      bg:bgClr, blur:bgBlur, shadow:shStyle,
    });
    _appletPostMessage(iframe, {
      type:'timerUpdate',
      total: (+(d.tmMin||0))*60 + (+(d.tmSec||0)),
      onEnd: d.tmOnEnd || 'none',
      onEndSlide: d.tmOnEndSlide !== undefined ? +d.tmOnEndSlide : 0,
      onEndAnim: d.tmOnEndAnim || '',
    });
  }
};


// Refresh clock iframe styles (same as timer but without timer-specific fields)
window.refreshClockEl = function(elId, opts){
  opts = opts || {};
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
  if(!opts.domOnly && iframe){
    _appletPostMessage(iframe, {type:'genUpdate',fs,bold:d.genBold||false,color:numClr,align,ai,jc,bg:bgClr,blur:bgBlur,shadow:shStyle});
  }
  if(!opts.domOnly){
    d.appletHtml = getClockHTML(_genAppletCfg(d, p));
    domEl.dataset.appletHtml = d.appletHtml;
    if(typeof saveState==='function') saveState();
  }
};

function _appletPostMessage(iframe, msg){
  if(!iframe) return;
  const send=function(){
    try{ iframe.contentWindow && iframe.contentWindow.postMessage(msg, '*'); }catch(e){}
  };
  // sandbox without allow-same-origin: contentDocument is null even when loaded — postMessage still works
  send();
  try{
    const doc=iframe.contentDocument;
    if(!doc || doc.readyState!=='complete') iframe.addEventListener('load', send, {once:true});
  }catch(e){}
}

window.ensureAppletHtmlFromData = function(d){
  if(!d || d.type!=='applet') return;
  const p=_appletTheme();
  if(d.appletId==='timer') d.appletHtml=getTimerHTML(_genAppletCfg(d, p));
  else if(d.appletId==='clock') d.appletHtml=getClockHTML(_genAppletCfg(d, p));
  else if(d.appletId==='generator') d.appletHtml=getGeneratorHTML(_genAppletCfg(d, p));
  else if(d.appletId==='counter') d.appletHtml=getCounterHTML(_counterAppletCfg(d, p));
  else if(d.appletId==='periodic' && typeof getPeriodicHTML==='function'){
    d.appletHtml=getPeriodicHTML(p,{
      pteSymbol:d.pteSymbol,pteIcon:!!d.pteIcon,
      genBg:d.genBg,genColor:d.genColor,genBgOp:d.genBgOp,genBgBlur:d.genBgBlur,
      genBgScheme:d.genBgScheme,genColorScheme:d.genColorScheme
    });
  }
  else if(d.appletId==='flip' && typeof getFlipHTML==='function'){
    d.appletHtml=getFlipHTML(p,{
      flipFace:d.flipFace,flipFrontText:d.flipFrontText,flipFrontImg:d.flipFrontImg,
      flipBackText:d.flipBackText,flipBackImg:d.flipBackImg,
      genBg:d.genBg,genColor:d.genColor,genBgOp:d.genBgOp,genBgBlur:d.genBgBlur,
      genBgScheme:d.genBgScheme,genColorScheme:d.genColorScheme
    });
  }
  else if(d.appletId==='notes' && typeof getNotesHTML==='function'){
    d.appletHtml=getNotesHTML(p,{notesText:d.notesText,notesBg:d.notesBg});
  }
  else if(!d.appletHtml){
    const a=(typeof APPLETS!=='undefined')?APPLETS.find(x=>x.id===d.appletId):null;
    if(a&&typeof a.htmlFn==='function') d.appletHtml=a.htmlFn(p);
  }
};

window.syncAllAppletHtmlFromData = function(){
  slides.forEach(s=>(s.els||[]).forEach(d=>ensureAppletHtmlFromData(d)));
};

function _counterAppletCfg(d, p){
  return {
    cntStart: d.cntStart !== undefined ? d.cntStart : 0,
    cntGoal: d.cntGoal,
    cntOnEnd: d.cntOnEnd,
    cntOnEndSlide: d.cntOnEndSlide,
    cntOnEndAnim: d.cntOnEndAnim,
    cntGroupId: d.cntGroupId || '',
    genStep: d.genStep !== undefined ? d.genStep : 1,
    genFontSize: d.genFontSize, genColor: d.genColor, genBg: d.genBg, genBgBlur: d.genBgBlur,
    genBorderColor: d.genBorderColor, genBorderWidth: d.genBorderWidth,
    genBold: d.genBold, genAlign: d.genAlign, genVAlign: d.genVAlign,
    genBgOp: d.genBgOp, genShadowOn: d.genShadowOn, genShadowBlur: d.genShadowBlur,
    genShadowColor: d.genShadowColor,
    palette: p,
  };
}

function _genAppletCfg(d, p){
  return {
    genMode:d.genMode, genLines:d.genLines,
    genMin:d.genMin, genMax:d.genMax, genStep:d.genStep, genFontSize:d.genFontSize,
    genColor:d.genColor, genBg:d.genBg, genBgBlur:d.genBgBlur,
    genBorderColor:d.genBorderColor, genBorderWidth:d.genBorderWidth,
    genBold:d.genBold, genAlign:d.genAlign, genVAlign:d.genVAlign,
    genBgOp:d.genBgOp, genShadowOn:d.genShadowOn, genShadowBlur:d.genShadowBlur,
    genShadowColor:d.genShadowColor,
    tmMin:d.tmMin, tmSec:d.tmSec, tmOnEnd:d.tmOnEnd, tmOnEndSlide:d.tmOnEndSlide, tmOnEndAnim:d.tmOnEndAnim,
    palette:p,
  };
}

function _rebuildThemedAppletHtml(d, p){
  if(d.type!=='applet') return;
  if(d.appletId==='generator'||d.appletId==='timer'||d.appletId==='clock'||d.appletId==='counter'){
    _remapSchemeColors(d, p);
    const cfg=_genAppletCfg(d, p);
    if(d.appletId==='generator') d.appletHtml=getGeneratorHTML(cfg);
    else if(d.appletId==='counter') d.appletHtml=getCounterHTML(_counterAppletCfg(d, p));
    else if(d.appletId==='timer') d.appletHtml=getTimerHTML(cfg);
    else d.appletHtml=getClockHTML(cfg);
    return;
  }
  if(d.appletId==='periodic' && typeof getPeriodicHTML==='function'){
    _remapSchemeColors(d, p);
    d.appletHtml=getPeriodicHTML(p,{
      pteSymbol:d.pteSymbol,pteIcon:!!d.pteIcon,
      genBg:d.genBg,genColor:d.genColor,genBgOp:d.genBgOp,genBgBlur:d.genBgBlur,
      genBgScheme:d.genBgScheme,genColorScheme:d.genColorScheme
    });
    return;
  }
  if(d.appletId==='flip' && typeof getFlipHTML==='function'){
    _remapSchemeColors(d, p);
    d.appletHtml=getFlipHTML(p,{
      flipFace:d.flipFace,flipFrontText:d.flipFrontText,flipFrontImg:d.flipFrontImg,
      flipBackText:d.flipBackText,flipBackImg:d.flipBackImg,
      genBg:d.genBg,genColor:d.genColor,genBgOp:d.genBgOp,genBgBlur:d.genBgBlur,
      genBgScheme:d.genBgScheme,genColorScheme:d.genColorScheme
    });
    return;
  }
  if(d.appletId==='notes'){
    d.appletHtml=getNotesHTML(p, {notesText:d.notesText, notesBg:d.notesBg});
    return;
  }
  const a=APPLETS.find(x=>x.id===d.appletId);
  if(a&&typeof a.htmlFn==='function') d.appletHtml=a.htmlFn(p);
}

// Remap scheme-bound colors to new theme palette
function _remapSchemeColors(d, p){
  const ti=(typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)?appliedThemeIdx:-1;
  const t=ti>=0&&typeof THEMES!=='undefined'?THEMES[ti]:null;
  if(!t||typeof _resolveSchemeColor!=='function') return;
  if(d.genBgScheme){const c=_resolveSchemeColor(d.genBgScheme,t);if(c) d.genBg=c;}
  if(d.genColorScheme){const c=_resolveSchemeColor(d.genColorScheme,t);if(c) d.genColor=c;}
  if(d.genBorderScheme){const c=_resolveSchemeColor(d.genBorderScheme,t);if(c) d.genBorderColor=c;}
}

function _whenIframeReady(iframe, fn){
  if(!iframe) return;
  try{
    const doc=iframe.contentDocument;
    if(doc&&doc.readyState==='complete') fn();
    else if(!doc) fn();
    else iframe.addEventListener('load', fn, {once:true});
  }catch(e){
    fn();
  }
}

function _syncThemedAppletDom(d){
  if(d.appletId==='generator'&&typeof refreshGeneratorEl==='function') refreshGeneratorEl(d.id, {domOnly:true});
  else if(d.appletId==='counter'&&typeof refreshCounterEl==='function') refreshCounterEl(d.id, {domOnly:true});
  else if(d.appletId==='timer'&&typeof refreshTimerEl==='function') refreshTimerEl(d.id, {domOnly:true});
  else if(d.appletId==='clock'&&typeof refreshClockEl==='function') refreshClockEl(d.id, {domOnly:true});
  else if(d.appletId==='notes'&&typeof refreshNotesEl==='function') refreshNotesEl(d.id, {domOnly:true});
  else if(d.appletId==='periodic'&&typeof refreshPeriodicEl==='function') refreshPeriodicEl(d.id, {silent:true});
  else if(d.appletId==='flip'&&typeof refreshFlipEl==='function') refreshFlipEl(d.id, {silent:true});
}

function _syncAppletPropsPanel(){
  const sel=document.querySelector('.el.selected,[data-selected=true]');
  if(!sel) return;
  const d=slides[cur]?.els?.find(x=>x.id===sel.dataset.id);
  if(d&&d.appletId==='generator'&&typeof syncGenProps==='function') syncGenProps();
  if(d&&d.appletId==='counter'&&typeof syncCounterProps==='function') syncCounterProps();
  if(d&&d.appletId==='timer'&&typeof syncTimerProps==='function') syncTimerProps();
  if(d&&d.appletId==='periodic'&&typeof syncPeriodicProps==='function') syncPeriodicProps();
  if(d&&d.appletId==='flip'&&typeof syncFlipProps==='function') syncFlipProps();
}

window.rebuildAppletHtmlForTheme = function(){
  const p=_appletTheme();
  slides.forEach(s=>{
    (s.els||[]).forEach(d=>{
      if(d.type==='applet') _rebuildThemedAppletHtml(d, p);
    });
  });
};

window.syncAppletDomAfterTheme = function(){
  const canvas=document.getElementById('canvas');
  if(!canvas) return;
  (slides[cur]?.els||[]).forEach(d=>{
    if(d.type!=='applet') return;
    const domEl=canvas.querySelector('[data-id="'+d.id+'"]');
    if(!domEl) return;
    // periodic/flip: appletHtml уже пересобран + renderAll выставил srcdoc.
    // Повторный немедленный srcdoc (sandbox без same-origin → contentDocument=null)
    // даёт гонку и пустой iframe — только дописываем dataset.
    if(d.appletId==='periodic'||d.appletId==='flip'){
      if(d.appletHtml) domEl.dataset.appletHtml=d.appletHtml;
      if(d.appletId==='periodic'){
        if(d.pteSymbol) domEl.dataset.pteSymbol=d.pteSymbol;
        if(d.genColor!=null) domEl.dataset.genColor=d.genColor||'';
        if(d.genBg!=null) domEl.dataset.genBg=d.genBg||'';
        domEl.dataset.genColorScheme=d.genColorScheme?JSON.stringify(d.genColorScheme):'';
        domEl.dataset.genBgScheme=d.genBgScheme?JSON.stringify(d.genBgScheme):'';
      }
      return;
    }
    if(d.appletId!=='generator'&&d.appletId!=='counter'&&d.appletId!=='timer'&&d.appletId!=='clock'&&d.appletId!=='notes') return;
    _whenIframeReady(domEl.querySelector('iframe'), function(){ _syncThemedAppletDom(d); });
  });
  _syncAppletPropsPanel();
  if(typeof saveState==='function') saveState();
};

// Refresh all theme-aware applets after theme change
function refreshAppletThemes(){
  rebuildAppletHtmlForTheme();
  const canvas=document.getElementById('canvas');
  if(canvas){
    (slides[cur]?.els||[]).forEach(d=>{
      if(d.type!=='applet'||!d.appletHtml) return;
      const domEl=canvas.querySelector('[data-id="'+d.id+'"]');
      if(!domEl) return;
      const iframe=domEl.querySelector('iframe');
      if(!iframe) return;
      iframe.srcdoc=d.appletHtml;
      domEl.dataset.appletHtml=d.appletHtml;
      if(d.appletId==='generator'||d.appletId==='counter'||d.appletId==='timer'||d.appletId==='clock'||d.appletId==='notes'){
        _whenIframeReady(iframe, function(){ _syncThemedAppletDom(d); });
      }
    });
  }
  _syncAppletPropsPanel();
  if(typeof saveState==='function') saveState();
}

window.refreshNotesEl = function(elId, opts){
  opts = opts || {};
  const d = slides[cur]?.els?.find(x=>x.id===elId);
  if(!d || d.appletId!=='notes') return;
  const domEl = document.getElementById('canvas')?.querySelector('[data-id="'+elId+'"]');
  if(!domEl) return;
  const p = _appletTheme();
  if(!opts.domOnly){
    d.appletHtml = getNotesHTML(p, {notesText:d.notesText, notesBg:d.notesBg});
    domEl.dataset.appletHtml = d.appletHtml;
    const iframe = domEl.querySelector('iframe');
    if(iframe) iframe.srcdoc = d.appletHtml;
    if(typeof saveState==='function') saveState();
    return;
  }
  const iframe = domEl.querySelector('iframe');
  _appletPostMessage(iframe, {
    type:'notesTheme',
    bg: d.notesBg || p.ac3,
    hdrBg: p.ac2,
    color: p.text,
    text: d.notesText || ''
  });
};

window._onNotesAppletMessage = function(e){
  if(!e.data || e.data.type!=='notesUpdate') return;
  const canvas = document.getElementById('canvas');
  if(!canvas) return;
  for(const iframe of canvas.querySelectorAll('.applet-el iframe')){
    try{
      if(iframe.contentWindow !== e.source) continue;
      const el = iframe.closest('.el');
      if(!el || el.dataset.appletId!=='notes') return;
      const d = slides[cur]?.els?.find(x=>x.id===el.dataset.id);
      if(!d) return;
      if(e.data.text !== undefined){
        d.notesText = e.data.text;
        el.dataset.notesText = encodeURIComponent(d.notesText || '');
      }
      if(e.data.bg !== undefined){
        d.notesBg = e.data.bg;
        el.dataset.notesBg = d.notesBg || '';
      }
      if(typeof saveState==='function') saveState();
      return;
    }catch(err){}
  }
};
window.addEventListener('message', window._onNotesAppletMessage);

window._onAppletAnimMessage = function(e){
  if(!e.data || e.data.type !== 'appletAnim' || !e.data.ref) return;
  if(typeof window.fireAppletAnimRef !== 'function') return;
  const inPreview = document.getElementById('preview-ov')?.classList.contains('active');
  const slideIdx = inPreview && typeof pidx !== 'undefined' ? pidx : (typeof cur !== 'undefined' ? cur : 0);
  const slide = slides[slideIdx];
  const appletVal = e.data.appletVal;
  let ref = e.data.ref;
  let appletElId = null;
  if(e.source){
    const roots = [document.getElementById('canvas'), document.getElementById('psa'), document.getElementById('psb')];
    for(const root of roots){
      if(!root) continue;
      for(const iframe of root.querySelectorAll('iframe')){
        try{
          if(iframe.contentWindow !== e.source) continue;
          const appEl = iframe.closest('.el, .psel');
          if(appEl){
            appletElId = appEl.dataset.id;
            if(appletVal != null) appEl._splitAppletLiveVal = appletVal;
          }
          break;
        }catch(err){}
      }
      if(appletElId) break;
    }
  }
  if(slide && appletElId && typeof window.resolveAppletAnimRef === 'function'){
    const ad = slide.els.find(x => x.id === appletElId);
    const trig = ad && ad.appletId === 'timer' ? 'timer' : 'counter';
    if(ad && (ad.appletId === 'counter' || ad.appletId === 'timer')){
      const resolved = window.resolveAppletAnimRef(slide, appletElId, ref, trig);
      if(resolved && resolved !== ref){
        ref = resolved;
        if(ad.appletId === 'counter') ad.cntOnEndAnim = resolved;
        else ad.tmOnEndAnim = resolved;
      }
    }
  }
  window.fireAppletAnimRef(ref, slideIdx, appletVal);
};
window.addEventListener('message', window._onAppletAnimMessage);

// ── COUNTER GROUP SYNC ──
// Shared in-memory registry: groupId -> current value. Lets counters with the
// same "ID" (cntGroupId) on different slides continue counting from where
// the previous one left off, instead of resetting to their own start value.
// IMPORTANT: this only applies during PRESENTATION (preview / exported player).
// The editor canvas (#canvas) is intentionally excluded — a counter being edited
// must always show its own default start value, never a value picked up mid-click.
window._counterGroupVal = window._counterGroupVal || {};

// Patches the baked "var _val=START, _step=..." line of a counter's cached
// appletHtml so the iframe renders the correct (synced) value on its very
// first paint — no flash of the default value followed by a jump.
window._counterBakeStartVal = function(html, val){
  if(typeof html !== 'string' || !html) return html;
  return html.replace(/var _val=(-?[\d.]+), _step=/, 'var _val=' + val + ', _step=');
};

// Returns the HTML to use for mounting a counter iframe in presentation
// contexts (preview / export), with the group's live value baked in if known.
window._counterMountHTML = function(d){
  if(!d || d.appletId !== 'counter') return d && d.appletHtml || '';
  const gid = d.cntGroupId || '';
  if(gid && Object.prototype.hasOwnProperty.call(window._counterGroupVal, gid)){
    return window._counterBakeStartVal(d.appletHtml || '', window._counterGroupVal[gid]);
  }
  return d.appletHtml || '';
};

window._onCounterGroupSyncMessage = function(e){
  const dt = e.data;
  if(!dt || dt.type !== 'counterSync' || !dt.gid) return;
  window._counterGroupVal[dt.gid] = dt.val;
  // Relay only within presentation roots (preview / export) — never to #canvas.
  const roots = [document.getElementById('psa'), document.getElementById('psb'), document.getElementById('sa'), document.getElementById('sb')];
  roots.forEach(root=>{
    if(!root) return;
    root.querySelectorAll('[data-applet-id="counter"]').forEach(wrap=>{
      if((wrap.dataset.cntGroupId || '') !== dt.gid) return;
      const ifr = wrap.querySelector('iframe');
      if(!ifr) return;
      try{ if(ifr.contentWindow === e.source) return; }catch(err){}
      if(typeof _appletPostMessage === 'function') _appletPostMessage(ifr, {type:'counterSync', val: dt.val});
    });
  });
};
window.addEventListener('message', window._onCounterGroupSyncMessage);

window._isValidAppletAnimRef = function(slide, appletElId, ref, triggerType){
  if(!ref || !slide || !appletElId || !triggerType) return false;
  const parts = String(ref).split(':');
  if(parts.length < 2) return false;
  const elId = parts[0], ai = +parts[1];
  if(!Number.isFinite(ai) || ai < 0) return false;
  const d = slide.els.find(x => x.id === elId);
  const a = d && d.anims && d.anims[ai];
  if(!a) return false;
  if((a.trigger || 'auto') !== triggerType) return false;
  if(a.triggerElId !== appletElId) return false;
  return true;
};

window.resolveAppletAnimRef = function(slide, appletElId, ref, triggerType){
  if(window._isValidAppletAnimRef(slide, appletElId, ref, triggerType)) return ref;
  const list = window.listAppletTriggerAnims(slide, appletElId, triggerType);
  if(!list.length) return ref || '';
  const oldElId = ref ? String(ref).split(':')[0] : '';
  const pool = oldElId ? list.filter(x => x.elId === oldElId) : list;
  const items = pool.length ? pool : list;
  for(let i = 0; i < items.length; i++){
    const item = items[i];
    const d = slide.els.find(x => x.id === item.elId);
    const a = d && d.anims && d.anims[item.ai];
    if(a && a.cat === 'exit') return item.ref;
  }
  return items[items.length - 1].ref;
};

window.repairAppletAnimRefs = function(slide){
  if(!slide) return false;
  let changed = false;
  (slide.els || []).forEach(d => {
    if(d.type !== 'applet') return;
    if(d.appletId === 'counter' && (d.cntOnEnd || 'none') === 'anim'){
      const next = window.resolveAppletAnimRef(slide, d.id, d.cntOnEndAnim || '', 'counter');
      if(next !== (d.cntOnEndAnim || '')){ d.cntOnEndAnim = next; changed = true; }
    }
    if(d.appletId === 'timer' && (d.tmOnEnd || 'none') === 'anim'){
      const next = window.resolveAppletAnimRef(slide, d.id, d.tmOnEndAnim || '', 'timer');
      if(next !== (d.tmOnEndAnim || '')){ d.tmOnEndAnim = next; changed = true; }
    }
  });
  return changed;
};

window.syncAppletAnimRefsToDom = function(slideIdx){
  const idx = slideIdx != null ? slideIdx : (typeof cur !== 'undefined' ? cur : 0);
  const slide = slides[idx];
  if(!slide) return;
  const canvas = document.getElementById('canvas');
  if(!canvas) return;
  slide.els.forEach(d => {
    if(d.type !== 'applet') return;
    const dom = canvas.querySelector('.el[data-id="' + d.id + '"]');
    if(!dom) return;
    if(d.appletId === 'counter'){
      dom.dataset.cntOnEndAnim = d.cntOnEndAnim || '';
      if(typeof refreshCounterEl === 'function') refreshCounterEl(d.id, {domOnly:true});
    }
    if(d.appletId === 'timer'){
      dom.dataset.tmOnEndAnim = d.tmOnEndAnim || '';
      if(typeof refreshTimerEl === 'function') refreshTimerEl(d.id, {domOnly:true});
    }
  });
};

window.listAppletTriggerAnims = function(slide, appletElId, triggerType){
  const out = [];
  if(!slide || !appletElId || !triggerType) return out;
  (slide.els || []).forEach(d => {
    if(d._isDecor) return;
    (d.anims || []).forEach((a, ai) => {
      if((a.trigger || 'auto') !== triggerType) return;
      if(a.triggerElId !== appletElId) return;
      out.push({ elId: d.id, ai, ref: d.id + ':' + ai });
    });
  });
  return out;
};

window.appletAnimOptionLabel = function(slide, elId, ai){
  if(!slide) return elId + ':' + ai;
  const d = slide.els.find(x => x.id === elId);
  const a = d && d.anims && d.anims[ai];
  if(!a) return elId + ':' + ai;
  const info = typeof ANIM_INFO !== 'undefined' ? ANIM_INFO[a.name] : null;
  const animLbl = info ? (info.icon + ' ' + info.label) : a.name;
  let objLbl = elId.slice(0, 8);
  if(d.type === 'text'){
    const tmp = document.createElement('div');
    tmp.innerHTML = d.html || '';
    const txt = tmp.textContent.slice(0, 20).trim();
    objLbl = txt || 'Текст';
  } else if(d.type === 'shape') objLbl = 'Фигура';
  else if(d.type === 'image') objLbl = 'Изображение';
  else if(d.type === 'applet'){
    if(d.appletId === 'counter') objLbl = 'Счётчик';
    else if(d.appletId === 'timer') objLbl = 'Таймер';
    else objLbl = d.appletId || 'Аплет';
  }
  return objLbl + ' — ' + animLbl;
};
