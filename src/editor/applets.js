import { getFlipHTML, flipCfgFromEl, FLIP_DEFAULTS, normalizeFlipApplet, isFlipAppletId } from './flipApplet.js';
import { getPeriodicHTML, PERIODIC_DEFAULTS, PTE_CARD_W, PTE_CARD_H } from './periodicApplet.js';
import { APPLET_SANDBOX, APPLET_SANDBOX_FLIP, appletSandbox } from './appletSandbox.js';

export { APPLET_SANDBOX, APPLET_SANDBOX_FLIP, appletSandbox };

export function appletTheme() {
  return {
    ac1: '#6366f1',
    ac2: '#818cf8',
    ac3: '#c7d2fe',
    text: '#e2e8f0',
    head: '#a5b4fc',
    btn: '#6366f1',
    dark: true,
  };
}

function hexRGB(h) {
  let s = (h || '#6366f1').replace('#', '');
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function rgba(hex, a) {
  try {
    const [r, g, b] = hexRGB(hex);
    return `rgba(${r},${g},${b},${a})`;
  } catch (e) {
    return hex;
  }
}

function styleBits(cfg, p, defaults) {
  const fs = cfg.genFontSize != null ? +cfg.genFontSize : defaults.fs;
  const bold = cfg.genBold ? 900 : defaults.bold;
  const align = cfg.genAlign || 'center';
  const va = cfg.genVAlign || 'middle';
  const bgBlur = cfg.genBgBlur != null ? +cfg.genBgBlur : 0;
  const bgOp = cfg.genBgOp != null ? +cfg.genBgOp : 1;
  const shOn = cfg.genShadowOn !== undefined ? !!cfg.genShadowOn : true;
  const shBlur = cfg.genShadowBlur != null ? +cfg.genShadowBlur : 8;
  const shColorR = cfg.genShadowColor || '#000000';
  const numClr = cfg.genColor && cfg.genColor !== '' ? cfg.genColor : p.head || p.ac1;
  const rawBg = cfg.genBg && cfg.genBg !== '' ? cfg.genBg : 'transparent';
  const bgClr =
    rawBg !== 'transparent' && bgOp < 1 && rawBg.startsWith('#')
      ? rawBg + Math.round(bgOp * 255).toString(16).padStart(2, '0')
      : rawBg;
  const shStyle =
    shOn && shBlur > 0
      ? `0 2px ${shBlur}px ${rgba(shColorR, 0.75)},0 0 30px ${rgba(p.ac1, 0.35)}`
      : `0 0 30px ${rgba(p.ac1, 0.3)}`;
  const jc = va === 'top' ? 'flex-start' : va === 'bottom' ? 'flex-end' : 'center';
  const ai = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  return { fs, bold, align, va, bgBlur, bgClr, shStyle, jc, ai, numClr };
}

/** Live clock applet HTML. */
export function getClockHTML(cfg = {}) {
  const p = cfg.palette || appletTheme();
  const s = styleBits(cfg, p, { fs: 48, bold: 700 });
  const dateFs = Math.max(11, Math.round(s.fs * 0.28));
  const showTime = cfg.clockShowTime !== false;
  const showDate = cfg.clockShowDate !== false;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;user-select:none}
html,body{width:100%;height:100%;background:transparent;overflow:hidden}
.wrap{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:${s.ai};justify-content:${s.jc};padding:clamp(8px,4%,20px)}
.wrap-bg{position:absolute;inset:0;background:${s.bgClr};${s.bgBlur > 0 ? `backdrop-filter:blur(${s.bgBlur}px);-webkit-backdrop-filter:blur(${s.bgBlur}px);` : ''}z-index:0}
.num{position:relative;z-index:1;font-size:${s.fs}px;font-weight:${s.bold};color:${s.numClr};font-variant-numeric:tabular-nums;text-align:${s.align};text-shadow:${s.shStyle};width:100%;${showTime ? '' : 'display:none'}}
.date{position:relative;z-index:1;font-size:${dateFs}px;color:${s.numClr};opacity:.6;margin-top:${showTime ? 6 : 0}px;text-align:${s.align};width:100%;text-shadow:${s.shStyle};${showDate ? '' : 'display:none'}}
</style></head><body>
<div class="wrap" id="wrap"><div class="wrap-bg" id="wrapbg"></div><div class="num" id="num"></div><div class="date" id="dat"></div></div>
<script>
var _showTime=${showTime ? 'true' : 'false'},_showDate=${showDate ? 'true' : 'false'};
function u(){
  var n=new Date();
  var num=document.getElementById('num'),dat=document.getElementById('dat');
  if(num){num.style.display=_showTime?'':'none';if(_showTime)num.textContent=n.toLocaleTimeString();}
  if(dat){dat.style.display=_showDate?'':'none';dat.style.marginTop=_showTime?'6px':'0';if(_showDate)dat.textContent=n.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});}
}
u();setInterval(u,1000);
<\/script></body></html>`;
}

/** Calculator applet HTML. */
export function getCalcHTML(p) {
  p = p || appletTheme();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;user-select:none}
html,body{width:100%;height:100%;background:transparent;overflow:hidden}
.calc{position:absolute;inset:0;background:${p.ac1}2e;padding:10px;display:flex;flex-direction:column;gap:8px;border:1px solid ${p.ac1}55}
.disp{background:${p.ac1}47;color:${p.text};font:clamp(20px,7vw,40px) monospace;padding:10px 12px;border-radius:8px;text-align:right;min-height:54px;display:flex;align-items:center;justify-content:flex-end}
.btns{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;flex:1}
.btn{background:${p.ac1}33;color:${p.text};border:1px solid ${p.ac1}2a;border-radius:8px;font-size:clamp(14px,3.5vw,20px);cursor:pointer}
.btn.op{color:${p.ac1}}.btn.eq{background:${p.btn};color:#fff}.btn.clr{color:#ef4444}
</style></head><body><div class="calc"><div class="disp" id="d">0</div><div class="btns" id="b"></div></div>
<script>
var cur='0',op=null,acc=null,fresh=true;
var keys=['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','=','='];
var el=document.getElementById('b'),disp=document.getElementById('d');
keys.slice(0,19).forEach(function(k,i){
  if(i===18)return;
  var b=document.createElement('button');b.className='btn'+(k==='='?' eq':(/[÷×−+%±]/.test(k)?' op':k==='C'?' clr':''));
  b.textContent=k==='−'?'−':k;b.onclick=function(){press(k)};
  if(k==='0')b.style.gridColumn='span 2';
  el.appendChild(b);
});
function show(){disp.textContent=cur}
function press(k){
  if(k==='C'){cur='0';op=null;acc=null;fresh=true;show();return}
  if(k==='±'){cur=String(-(+cur||0));show();return}
  if(k==='%'){cur=String((+cur||0)/100);show();return}
  if(k==='.'){if(cur.indexOf('.')<0)cur+='.';show();return}
  if(/[0-9]/.test(k)){cur=fresh?(k==='0'?'0':k):(cur==='0'?k:cur+k);fresh=false;show();return}
  if(k==='='){compute();op=null;fresh=true;show();return}
  if(op)compute();acc=+cur;op=k;fresh=true;show();
}
function compute(){
  if(op==null||acc==null)return;
  var b=+cur,a=acc,r=a;
  if(op==='+')r=a+b;else if(op==='−')r=a-b;else if(op==='×')r=a*b;else if(op==='÷')r=b?a/b:0;
  cur=String(Math.round(r*1e10)/1e10);acc=null;
}
<\/script></body></html>`;
}

/** Countdown timer applet HTML. */
export function getTimerHTML(cfg = {}) {
  const p = cfg.palette || appletTheme();
  const s = styleBits(cfg, p, { fs: 72, bold: 800 });
  const tmMin = cfg.tmMin != null ? +cfg.tmMin : 5;
  const tmSec = cfg.tmSec != null ? +cfg.tmSec : 0;
  const tmOnEnd = cfg.tmOnEnd || 'none';
  const tmOnEndSlide = cfg.tmOnEndSlide != null ? +cfg.tmOnEndSlide : 0;
  const tmOnEndAnim = cfg.tmOnEndAnim || '';
  const totalSec = tmMin * 60 + tmSec;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;user-select:none}
html,body{width:100%;height:100%;background:transparent;overflow:hidden}
.wrap{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:${s.ai};justify-content:${s.jc};padding:clamp(8px,4%,20px)}
.wrap-bg{position:absolute;inset:0;background:${s.bgClr};${s.bgBlur > 0 ? `backdrop-filter:blur(${s.bgBlur}px);-webkit-backdrop-filter:blur(${s.bgBlur}px);` : ''}z-index:0}
.num{position:relative;z-index:1;font-size:${s.fs}px;font-weight:${s.bold};color:${s.numClr};font-variant-numeric:tabular-nums;text-align:${s.align};text-shadow:${s.shStyle};width:100%;transition:color .3s}
.num.done{color:#ef4444}
</style></head><body>
<div class="wrap" id="wrap"><div class="wrap-bg" id="wrapbg"></div><div class="num" id="num">--:--</div></div>
<script>
var _total=${totalSec},_rem=${totalSec},_t=null,_started=false;
function fmt(s){s=Math.max(0,s);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function tick(){_rem--;document.getElementById('num').textContent=fmt(_rem);if(_rem<=0){clearInterval(_t);_t=null;document.getElementById('num').classList.add('done');_fireOnEnd();}}
var _onEnd=${JSON.stringify(tmOnEnd)},_onEndSlide=${tmOnEndSlide},_onEndAnim=${JSON.stringify(tmOnEndAnim)};
function _postAppletMsg(msg){try{window.parent.postMessage(msg,'*');}catch(e){}try{if(window.top!==window.parent)window.top.postMessage(msg,'*');}catch(e){}}
function _fireOnEnd(){if(_onEnd==='next')_postAppletMsg({type:'timerNav',mode:'next'});else if(_onEnd==='slide')_postAppletMsg({type:'timerNav',mode:'slide',slide:_onEndSlide});else if(_onEnd==='anim'&&_onEndAnim)_postAppletMsg({type:'appletAnim',ref:_onEndAnim,appletVal:_rem});}
function start(){if(_t||_rem<=0)return;_started=true;document.getElementById('num').textContent=fmt(_rem);_t=setInterval(tick,1000);}
document.getElementById('num').textContent=fmt(_total);
window.addEventListener('message',function(e){
  var d=e.data;if(!d)return;
  if(d.type==='timerStart'){if(!_started)start();return;}
  if(d.type==='timerUpdate'){
    if(d.total!==undefined){_total=d.total;if(!_t){_rem=_total;_started=false;var n=document.getElementById('num');n.textContent=fmt(_rem);n.classList.remove('done');}}
    if(d.onEnd!==undefined)_onEnd=d.onEnd;
    if(d.onEndSlide!==undefined)_onEndSlide=+d.onEndSlide;
    if(d.onEndAnim!==undefined)_onEndAnim=d.onEndAnim||'';
  }
});
<\/script></body></html>`;
}

/** Random number / list generator applet HTML. */
export function getGeneratorHTML(cfg = {}) {
  const p = cfg.palette || appletTheme();
  const s = styleBits(cfg, p, { fs: 64, bold: 800 });
  const mode = cfg.genMode || 'number';
  const min = cfg.genMin != null ? +cfg.genMin : 1;
  const max = cfg.genMax != null ? +cfg.genMax : 100;
  const step = cfg.genStep != null ? +cfg.genStep : 1;
  const lines = String(cfg.genLines || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const linesJson = JSON.stringify(lines.length ? lines : ['?']);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;user-select:none}
html,body{width:100%;height:100%;background:transparent;overflow:hidden;cursor:pointer}
.wrap{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:${s.ai};justify-content:${s.jc};padding:clamp(8px,4%,20px);cursor:pointer}
.wrap-bg{position:absolute;inset:0;background:${s.bgClr};${s.bgBlur > 0 ? `backdrop-filter:blur(${s.bgBlur}px);-webkit-backdrop-filter:blur(${s.bgBlur}px);` : ''}z-index:0}
.num{position:relative;z-index:1;font-size:${s.fs}px;font-weight:${s.bold};color:${s.numClr};font-variant-numeric:tabular-nums;text-align:${s.align};text-shadow:${s.shStyle};width:100%;white-space:pre-line;word-break:break-word;transition:transform .15s,opacity .15s;cursor:pointer}
.num.pop{transform:scale(1.06);opacity:.6}
</style></head><body>
<div class="wrap" id="wrap"><div class="wrap-bg" id="wrapbg"></div><div class="num" id="num">?</div></div>
<script>
var _mode=${JSON.stringify(mode)},_min=${min},_max=${max},_step=${step},_lines=${linesJson};
function gen(){
  var el=document.getElementById('num');el.classList.add('pop');setTimeout(function(){el.classList.remove('pop');},150);
  var val;
  if(_mode==='text'){val=_lines.length?_lines[Math.floor(Math.random()*_lines.length)]:'?';}
  else{var steps=Math.round((_max-_min)/_step);val=_min+Math.round(Math.random()*steps)*_step;val=Math.round(val*1e9)/1e9;}
  el.textContent=String(val);
}
gen();
document.getElementById('wrap').addEventListener('click',function(e){e.preventDefault();gen();});
window.addEventListener('message',function(e){var d=e.data;if(!d)return;if(d.type==='genStep'){gen();return;}
  if(d.type==='genUpdate'){
    if(d.mode!==undefined)_mode=d.mode;if(d.lines!==undefined)_lines=d.lines;
    if(d.min!==undefined){_min=d.min;_max=d.max;_step=d.step;}
    gen();
  }
});
<\/script></body></html>`;
}

/** Click counter applet HTML. */
export function getCounterHTML(cfg = {}) {
  const p = cfg.palette || appletTheme();
  const s = styleBits(cfg, p, { fs: 64, bold: 800 });
  const start = cfg.cntStart != null ? +cfg.cntStart : 0;
  const step = cfg.genStep != null ? +cfg.genStep : 1;
  const groupId = cfg.cntGroupId ? String(cfg.cntGroupId).trim() : '';
  const goalRaw = cfg.cntGoal;
  const hasGoal = goalRaw !== undefined && goalRaw !== null && goalRaw !== '';
  const goal = hasGoal ? +goalRaw : null;
  const cntOnEnd = cfg.cntOnEnd || 'none';
  const cntOnEndSlide = cfg.cntOnEndSlide != null ? +cfg.cntOnEndSlide : 0;
  const cntOnEndAnim = cfg.cntOnEndAnim || '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;user-select:none}
html,body{width:100%;height:100%;background:transparent;overflow:hidden;cursor:pointer}
.wrap{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:${s.ai};justify-content:${s.jc};padding:clamp(8px,4%,20px);cursor:pointer}
.wrap-bg{position:absolute;inset:0;background:${s.bgClr};${s.bgBlur > 0 ? `backdrop-filter:blur(${s.bgBlur}px);-webkit-backdrop-filter:blur(${s.bgBlur}px);` : ''}z-index:0}
.num{position:relative;z-index:1;font-size:${s.fs}px;font-weight:${s.bold};color:${s.numClr};font-variant-numeric:tabular-nums;text-align:${s.align};text-shadow:${s.shStyle};width:100%;transition:transform .15s,opacity .15s;cursor:pointer}
.num.pop{transform:scale(1.06);opacity:.6}
</style></head><body>
<div class="wrap" id="wrap"><div class="wrap-bg" id="wrapbg"></div><div class="num" id="num"></div></div>
<script>
var _val=${start},_step=${step},_start=${start};
var _goal=${goal === null ? 'null' : goal},_onEnd=${JSON.stringify(cntOnEnd)},_onEndSlide=${cntOnEndSlide},_onEndAnim=${JSON.stringify(cntOnEndAnim)};
var _gid=${JSON.stringify(groupId)};
function showVal(){var el=document.getElementById('num');if(el)el.textContent=String(_val);}
function _postAppletMsg(msg){try{window.parent.postMessage(msg,'*');}catch(e){}try{if(window.top!==window.parent)window.top.postMessage(msg,'*');}catch(e){}}
function _fireOnGoal(){if(_goal===null)return;if(_onEnd==='next')_postAppletMsg({type:'timerNav',mode:'next'});else if(_onEnd==='slide')_postAppletMsg({type:'timerNav',mode:'slide',slide:_onEndSlide});else if(_onEnd==='anim'&&_onEndAnim)_postAppletMsg({type:'appletAnim',ref:_onEndAnim,appletVal:_val});}
function _checkGoal(prev){if(_goal===null)return;if(_step>0&&prev<_goal&&_val>=_goal)_fireOnGoal();else if(_step<0&&prev>_goal&&_val<=_goal)_fireOnGoal();else if(_step===0&&Math.round(_val*1e9)===Math.round(_goal*1e9))_fireOnGoal();}
function stepUp(){var el=document.getElementById('num');if(!el)return;el.classList.add('pop');setTimeout(function(){el.classList.remove('pop');},150);var prev=_val;_val=Math.round((_val+_step)*1e9)/1e9;showVal();_checkGoal(prev);if(_gid)_postAppletMsg({type:'counterSync',gid:_gid,val:_val});}
showVal();
document.getElementById('wrap').addEventListener('click',function(e){e.preventDefault();stepUp();});
window.addEventListener('message',function(e){
  var d=e.data;if(!d)return;
  if(d.type==='counterStep'){stepUp();return;}
  if(d.type==='counterSync'){if(d.val!==undefined){_val=+d.val;showVal();}return;}
  if(d.type==='counterUpdate'){
    if(d.step!==undefined)_step=+d.step;
    if(d.start!==undefined){_val=+d.start;_start=+d.start;showVal();}
    if(d.goal!==undefined)_goal=(d.goal===null||d.goal==='')?null:+d.goal;
    if(d.onEnd!==undefined)_onEnd=d.onEnd;
    if(d.onEndSlide!==undefined)_onEndSlide=+d.onEndSlide;
    if(d.onEndAnim!==undefined)_onEndAnim=d.onEndAnim||'';
    if(d.gid!==undefined)_gid=d.gid||'';
  }
});
<\/script></body></html>`;
}

/** In-memory registry: groupId → live value (preview / export only). */
const _counterGroupVal = Object.create(null);

export function resetCounterGroupVals() {
  Object.keys(_counterGroupVal).forEach((k) => {
    delete _counterGroupVal[k];
  });
}

export function setCounterGroupVal(gid, val) {
  const id = String(gid || '').trim();
  if (!id) return;
  _counterGroupVal[id] = +val;
}

export function getCounterGroupVal(gid) {
  const id = String(gid || '').trim();
  if (!id || !Object.prototype.hasOwnProperty.call(_counterGroupVal, id)) return null;
  return _counterGroupVal[id];
}

/** Patch baked `var _val=…` so the iframe first paint shows the synced value. */
export function counterBakeStartVal(html, val) {
  if (typeof html !== 'string' || !html) return html;
  const n = Number.isFinite(+val) ? +val : 0;
  return html.replace(/var _val=(-?[\d.]+),\s*_step=/, `var _val=${n},_step=`);
}

/** HTML for mounting a counter in presentation (preview/export). */
export function counterMountHtml(d) {
  if (!d || d.appletId !== 'counter') return (d && d.appletHtml) || '';
  const gid = String(d.cntGroupId || '').trim();
  const live = gid ? getCounterGroupVal(gid) : null;
  if (live != null) return counterBakeStartVal(d.appletHtml || '', live);
  return d.appletHtml || '';
}

/** Keys shared across counters with the same ID (v7.1 linked counters). */
export const COUNTER_LINK_KEYS = [
  'cntStart',
  'genStep',
  'cntGoal',
  'cntOnEnd',
  'cntOnEndSlide',
  'cntOnEndAnim',
  'genFontSize',
  'genColor',
  'genColorScheme',
  'genBg',
  'genBgScheme',
  'genBgOp',
  'genBgBlur',
  'genAlign',
  'genVAlign',
  'genBold',
  'genShadowOn',
  'genShadowBlur',
  'genShadowColor',
  'genShadowScheme',
  'genBorderColor',
  'genBorderWidth',
  'genBorderScheme',
  'rx',
  'elOpacity',
];


function notesEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Sticky-note applet HTML. */
export function getNotesHTML(cfg = {}) {
  const p = cfg.palette || appletTheme();
  const bg = cfg.notesBg || '#fef3c7';
  const hdrBg = p.ac2 || '#f59e0b';
  const fg = '#1a1a1a';
  const title = cfg.title || 'Notes';
  const ph = cfg.placeholder || 'Click to type…';
  const bgVal = String(bg).startsWith('#') ? bg : '#fef3c7';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;height:100vh;display:flex;flex-direction:column;background:${notesEsc(bg)};">
<style>*{margin:0;padding:0;box-sizing:border-box}#hdr{background:${notesEsc(hdrBg)};padding:6px 10px;font-weight:700;font-size:12px;color:${notesEsc(fg)};display:flex;justify-content:space-between;align-items:center}#ta{flex:1;border:none;background:transparent;resize:none;padding:10px;font-size:13px;color:${notesEsc(fg)};font-family:inherit;line-height:1.6}#ta:focus{outline:none}</style>
<div id="hdr"><span>📝 ${notesEsc(title)}</span><input type="color" id="bgClr" value="${notesEsc(bgVal)}" style="width:22px;height:18px;border:none;background:none;cursor:pointer;padding:0"></div>
<textarea id="ta" placeholder="${notesEsc(ph)}">${notesEsc(cfg.notesText || '')}</textarea>
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

export function appletCfgFromEl(d) {
  if (!d) return { palette: appletTheme() };
  return {
    palette: appletTheme(),
    genFontSize: d.genFontSize,
    genColor: d.genColor,
    genBg: d.genBg,
    genBgOp: d.genBgOp,
    genBgBlur: d.genBgBlur,
    genAlign: d.genAlign,
    genVAlign: d.genVAlign,
    genBold: d.genBold,
    genShadowOn: d.genShadowOn,
    genShadowBlur: d.genShadowBlur,
    genShadowColor: d.genShadowColor,
    genBorderColor: d.genBorderColor,
    genBorderWidth: d.genBorderWidth,
    clockShowTime: d.clockShowTime,
    clockShowDate: d.clockShowDate,
    genMode: d.genMode,
    genMin: d.genMin,
    genMax: d.genMax,
    genStep: d.genStep,
    genLines: d.genLines,
    tmMin: d.tmMin,
    tmSec: d.tmSec,
    tmOnEnd: d.tmOnEnd,
    tmOnEndSlide: d.tmOnEndSlide,
    tmOnEndAnim: d.tmOnEndAnim,
    cntStart: d.cntStart,
    cntGoal: d.cntGoal,
    cntOnEnd: d.cntOnEnd,
    cntOnEndSlide: d.cntOnEndSlide,
    cntOnEndAnim: d.cntOnEndAnim,
    cntGroupId: d.cntGroupId,
  };
}

/** Rebuild appletHtml from element fields. Returns new object (does not mutate). */
export function rebuildAppletHtml(d, theme) {
  if (!d || d.type !== 'applet') return d;
  d = normalizeFlipApplet(d);
  const cfg = appletCfgFromEl(d);
  const th = theme || null;
  let html = d.appletHtml || '';
  if (d.appletId === 'clock') html = getClockHTML(cfg);
  else if (d.appletId === 'calculator') html = getCalcHTML(cfg.palette);
  else if (d.appletId === 'timer') html = getTimerHTML(cfg);
  else if (d.appletId === 'generator') html = getGeneratorHTML(cfg);
  else if (d.appletId === 'counter') html = getCounterHTML(cfg);
  else if (d.appletId === 'flip' || isFlipAppletId(d.appletId)) {
    let genBg = d.genBg;
    let genBgScheme = d.genBgScheme;
    let genColor = d.genColor;
    let genColorScheme = d.genColorScheme;
    // Same defaults as PTE / v7.1 flip: scheme 7,7 → light gradient card
    if (genBgScheme === undefined && (!genBg || genBg === '#1e293b')) {
      genBgScheme = { col: 7, row: 7 };
      genBg = '';
    }
    if (genColorScheme === undefined && (!genColor || genColor === '#f8fafc')) {
      genColorScheme = { col: 7, row: 0 };
      genColor = '';
    }
    html = getFlipHTML(
      {
        ...flipCfgFromEl({
          ...d,
          genBg,
          genBgScheme,
          genColor,
          genColorScheme,
        }),
      },
      th
    );
    return {
      ...d,
      appletId: 'flip',
      genBg,
      genBgScheme,
      genColor,
      genColorScheme,
      appletHtml: html,
    };
  } else if (d.appletId === 'periodic') {
    let genBg = d.genBg;
    let genBgScheme = d.genBgScheme;
    let genColor = d.genColor;
    let genColorScheme = d.genColorScheme;
    if (genBgScheme === undefined && (!genBg || genBg === '#1e293b')) {
      genBgScheme = { col: 7, row: 7 };
      genBg = '';
    }
    if (genColorScheme === undefined && (!genColor || genColor === '#f8fafc')) {
      genColorScheme = { col: 7, row: 0 };
      genColor = '';
    }
    html = getPeriodicHTML(
      {
        pteSymbol: d.pteSymbol || 'Fe',
        pteIcon: !!d.pteIcon,
        genBg,
        genColor,
        genBgOp: d.genBgOp,
        genBgBlur: d.genBgBlur,
        genBgScheme,
        genColorScheme,
        accent: (th && th.ac1) || (cfg.palette && cfg.palette.ac1) || undefined,
      },
      th
    );
    return { ...d, genBg, genBgScheme, genColor, genColorScheme, appletHtml: html };
  } else if (d.appletId === 'notes') {
    html = getNotesHTML({
      palette: cfg.palette,
      notesText: d.notesText || '',
      notesBg: d.notesBg || '#fef3c7',
    });
  }
  return { ...d, appletHtml: html };
}

export function appletLabel(el, ru) {
  const id = el?.appletId || '';
  const map = {
    clock: ru ? 'Часы' : 'Clock',
    calculator: ru ? 'Калькулятор' : 'Calculator',
    timer: ru ? 'Таймер' : 'Timer',
    generator: ru ? 'Генератор' : 'Generator',
    counter: ru ? 'Счётчик' : 'Counter',
    periodic: ru ? 'Таблица Менделеева' : 'Periodic table',
    flip: ru ? 'Перевертыш' : 'Flip',
    notes: ru ? 'Заметка' : 'Notes',
  };
  return map[id] || id || (ru ? 'Аплет' : 'Applet');
}

/** Applets that need a host click → postMessage (iframe PE none in editor). */
export function appletStepMessage(appletId) {
  if (appletId === 'generator') return 'genStep';
  if (appletId === 'counter') return 'counterStep';
  if (appletId === 'flip' || isFlipAppletId(appletId)) return 'flipToggle';
  return null;
}

export const APPLET_INSERTS = [
  { id: 'clock', labelRu: 'Часы', labelEn: 'Clock', html: (cfg) => getClockHTML(cfg), w: 320, h: 160 },
  { id: 'timer', labelRu: 'Таймер', labelEn: 'Timer', html: (cfg) => getTimerHTML(cfg), w: 280, h: 160 },
  { id: 'generator', labelRu: 'Генератор', labelEn: 'Generator', html: (cfg) => getGeneratorHTML(cfg), w: 240, h: 180 },
  { id: 'counter', labelRu: 'Счётчик', labelEn: 'Counter', html: (cfg) => getCounterHTML(cfg), w: 240, h: 180 },
  { id: 'calculator', labelRu: 'Калькулятор', labelEn: 'Calculator', html: () => getCalcHTML(), w: 260, h: 360 },
  { id: 'flip', labelRu: 'Перевертыш', labelEn: 'Flip card', html: (cfg) => getFlipHTML(cfg), w: FLIP_DEFAULTS.w, h: FLIP_DEFAULTS.h },
  {
    id: 'periodic',
    labelRu: 'Таблица Менделеева',
    labelEn: 'Periodic table',
    html: (cfg) => getPeriodicHTML(cfg),
    w: PTE_CARD_W,
    h: PTE_CARD_H,
  },
  { id: 'notes', labelRu: 'Заметка', labelEn: 'Notes', html: (cfg) => getNotesHTML(cfg), w: 260, h: 220 },
];

/** Extra gallery tiles in the applet modal (not iframe applets). */
export const APPLET_GALLERY_EXTRAS = [
  { id: 'quote', labelRu: 'Цитата', labelEn: 'Quote' },
  { id: 'qr', labelRu: 'QR-код', labelEn: 'QR code' },
  { id: 'lego', labelRu: 'Лего', labelEn: 'Lego' },
];

const KIND_DEFAULTS = {
  clock: {
    genFontSize: 48,
    genBgOp: 0.2,
    genShadowOn: true,
    genShadowBlur: 8,
    genShadowColor: '#000000',
    genAlign: 'center',
    genVAlign: 'middle',
    genBold: false,
    genBorderWidth: 0,
    clockShowTime: true,
    clockShowDate: true,
  },
  timer: { tmMin: 5, tmSec: 0, tmOnEnd: 'none', tmOnEndSlide: 0, tmOnEndAnim: '', genFontSize: 72, genBgOp: 0.2, genShadowOn: true },
  generator: {
    genMode: 'number',
    genLines: '',
    genMin: 1,
    genMax: 100,
    genStep: 1,
    genFontSize: 64,
    genBgOp: 0.2,
    genShadowOn: true,
  },
  counter: {
    cntStart: 0,
    genStep: 1,
    cntGoal: '',
    cntOnEnd: 'none',
    cntOnEndSlide: 0,
    cntOnEndAnim: '',
    cntGroupId: '',
    genFontSize: 64,
    genBgOp: 0.2,
    genShadowOn: true,
  },
  calculator: {},
  flip: { ...FLIP_DEFAULTS },
  periodic: { ...PERIODIC_DEFAULTS },
  notes: { notesText: '', notesBg: '#fef3c7' },
};

export function defaultAppletFields(kind) {
  const meta = APPLET_INSERTS.find((a) => a.id === kind) || APPLET_INSERTS[0];
  const extras = KIND_DEFAULTS[meta.id] || {};
  const base = {
    type: 'applet',
    appletId: meta.id,
    x: 100,
    y: 80,
    w: meta.w,
    h: meta.h,
    rot: 0,
    anims: [],
    ...extras,
  };
  return rebuildAppletHtml(base);
}

export function postToAppletIframe(iframe, msg) {
  try {
    iframe?.contentWindow?.postMessage(msg, '*');
  } catch (e) {}
}

export function startTimersInRoot(root) {
  if (!root) return;
  root.querySelectorAll('iframe[data-applet-id="timer"]').forEach((iframe) => {
    postToAppletIframe(iframe, { type: 'timerStart' });
  });
}
