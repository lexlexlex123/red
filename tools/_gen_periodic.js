const fs = require('fs');
const path = require('path');
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '_pte_data.json'), 'utf8'));
const cmap = {
  alkali: 'alkali', ae: 'alkaline-earth', tr: 'transition', pt: 'post-transition',
  met: 'metalloid', nm: 'nonmetal', hal: 'halogen', nob: 'noble', lan: 'lanthanide', act: 'actinide'
};
raw.forEach(e => { e.c = cmap[e.c] || e.c; });

const catNames = {
  alkali: 'Щелочной металл',
  'alkaline-earth': 'Щёлочноземельный',
  transition: 'Переходный металл',
  'post-transition': 'Постпереходный металл',
  metalloid: 'Металлоид',
  nonmetal: 'Неметалл',
  halogen: 'Галоген',
  noble: 'Инертный газ',
  lanthanide: 'Лантаноид',
  actinide: 'Актиноид'
};
const catColors = {
  alkali: '#ef4444',
  'alkaline-earth': '#f97316',
  transition: '#3b82f6',
  'post-transition': '#6366f1',
  metalloid: '#14b8a6',
  nonmetal: '#22c55e',
  halogen: '#a855f7',
  noble: '#06b6d4',
  lanthanide: '#ec4899',
  actinide: '#eab308'
};

const out = `// ══════════════ PERIODIC TABLE APPLET ══════════════
const PTE_CAT_LABEL=${JSON.stringify(catNames)};
const PTE_CAT_COLOR=${JSON.stringify(catColors)};
const PTE_ELEMENTS=${JSON.stringify(raw)};

function _pteBySymbol(sym){
  if(!sym) return null;
  const s=String(sym).trim();
  return PTE_ELEMENTS.find(e=>e.s===s||e.s.toLowerCase()===s.toLowerCase())||null;
}
function _pteEsc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _pteHexRgba(hex,a){
  if(!hex||hex==='transparent'||hex==='none') return 'rgba(0,0,0,0)';
  const h=String(hex).replace('#','');
  if(h.length!==6) return hex;
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  const alpha=(a==null||isNaN(a))?1:Math.max(0,Math.min(1,+a));
  return 'rgba('+r+','+g+','+b+','+alpha+')';
}
function _pteResolveColors(d){
  const p=(typeof _appletTheme==='function')?_appletTheme():{dark:true,ac1:'#3b82f6',text:'#e2e8f0',head:'#ffffff'};
  const isDark=p.dark!==false;
  let bg=d.genBg||'', fg=d.genColor||'';
  const theme=(typeof THEMES!=='undefined'&&typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)?THEMES[appliedThemeIdx]:null;
  if(!bg&&typeof _resolveSchemeColor==='function'&&theme){
    bg=_resolveSchemeColor(d.genBgScheme||{col:7,row:theme.dark===false?1:4},theme)||(isDark?'#1e293b':'#f1f5f9');
  }
  if(!bg) bg=isDark?'#1e293b':'#f1f5f9';
  if(!fg&&typeof _resolveSchemeColor==='function'&&theme){
    fg=_resolveSchemeColor(d.genColorScheme||{col:7,row:0},theme)||(isDark?'#ffffff':'#0f172a');
  }
  if(!fg) fg=isDark?'#ffffff':'#0f172a';
  return {bg,fg,isDark,accent:p.ac1||'#3b82f6'};
}

function getPeriodicHTML(palette,cfg){
  cfg=cfg||{};
  const el=_pteBySymbol(cfg.pteSymbol)||_pteBySymbol('Fe');
  const showHist=cfg.pteShowHistory!==false;
  const colors=_pteResolveColors(cfg);
  const op=cfg.genBgOp!=null?+cfg.genBgOp:0.92;
  const blur=cfg.genBgBlur!=null?+cfg.genBgBlur:0;
  const catLabel=PTE_CAT_LABEL[el.c]||el.c;
  const catCol=PTE_CAT_COLOR[el.c]||colors.accent;
  const mass=(typeof el.m==='number')?(Number.isInteger(el.m)?String(el.m):el.m.toFixed(el.m<10?3:2)):String(el.m);
  const group=el.g!=null?el.g:'—';
  const histLine=!showHist?'':(el.y!=null?('Открыл: '+el.d+' · '+el.y):('Известен: '+el.d));
  const bgCss=_pteHexRgba(colors.bg,op);
  const blurCss=blur>0?('backdrop-filter:blur('+blur+'px);-webkit-backdrop-filter:blur('+blur+'px);'):'';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'
    +'*{box-sizing:border-box;margin:0;padding:0}'
    +'html,body{width:100%;height:100%;overflow:hidden;background:transparent;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}'
    +'.card{width:100%;height:100%;padding:14px 16px;display:flex;flex-direction:column;justify-content:space-between;'
    +'background:'+bgCss+';'+blurCss+'color:'+colors.fg+';border-radius:14px;border:1px solid '+catCol+'55;position:relative;overflow:hidden}'
    +'.card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:'+catCol+'}'
    +'.top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}'
    +'.z{font-size:15px;font-weight:700;opacity:.75}'
    +'.mass{font-size:13px;opacity:.65;font-variant-numeric:tabular-nums}'
    +'.sym{font-size:72px;font-weight:800;line-height:1;letter-spacing:-.03em;margin:4px 0 2px;color:'+catCol+';text-shadow:0 2px 18px '+catCol+'33}'
    +'.name{font-size:20px;font-weight:700;line-height:1.15}'
    +'.en{font-size:12px;opacity:.55;margin-top:2px}'
    +'.meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}'
    +'.chip{font-size:11px;padding:3px 8px;border-radius:999px;background:'+catCol+'22;border:1px solid '+catCol+'44}'
    +'.hist{margin-top:10px;font-size:11px;line-height:1.35;opacity:.72;border-top:1px solid '+colors.fg+'22;padding-top:8px}'
    +'</style></head><body><div class="card"><div>'
    +'<div class="top"><span class="z">'+el.Z+'</span><span class="mass">'+_pteEsc(mass)+'</span></div>'
    +'<div class="sym">'+_pteEsc(el.s)+'</div>'
    +'<div class="name">'+_pteEsc(el.ru)+'</div>'
    +'<div class="en">'+_pteEsc(el.en)+'</div>'
    +'<div class="meta"><span class="chip">'+_pteEsc(catLabel)+'</span>'
    +'<span class="chip">период '+el.p+'</span><span class="chip">группа '+group+'</span></div></div>'
    +(histLine?'<div class="hist">'+_pteEsc(histLine)+'</div>':'')
    +'</div></body></html>';
}
window.getPeriodicHTML=getPeriodicHTML;
window.PTE_ELEMENTS=PTE_ELEMENTS;
window._pteBySymbol=_pteBySymbol;

let _pteModalMode='insert', _pteReselectId=null;

function openPeriodicModal(opts){
  opts=opts||{};
  _pteModalMode=opts.mode==='reselect'?'reselect':'insert';
  _pteReselectId=opts.elId||null;
  let modal=document.getElementById('pte-modal');
  if(!modal){
    modal=document.createElement('div');
    modal.className='modal-ov';
    modal.id='pte-modal';
    modal.innerHTML='<div class="modal" style="max-width:920px;width:94vw;max-height:88vh;display:flex;flex-direction:column">'
      +'<h3 style="margin:0 0 8px">🧪 Таблица Менделеева</h3>'
      +'<div style="display:flex;gap:8px;margin-bottom:10px;align-items:center">'
      +'<input id="pte-search" type="search" placeholder="Поиск: Fe, железо, 26…" style="flex:1;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:7px 10px;font-size:13px"/>'
      +'<button class="mbtn" type="button" id="pte-cancel-btn">Отмена</button></div>'
      +'<div id="pte-grid" style="overflow:auto;flex:1;min-height:280px;padding:2px 2px 8px"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('mousedown',function(e){ if(e.target===modal) modal.classList.remove('open'); });
    modal.querySelector('#pte-cancel-btn').onclick=function(){ modal.classList.remove('open'); };
    modal.querySelector('#pte-search').addEventListener('input',function(e){ _pteBuildGrid(e.target.value); });
  }
  const inp=document.getElementById('pte-search');
  if(inp) inp.value='';
  _pteBuildGrid('');
  modal.classList.add('open');
  setTimeout(function(){ if(inp) inp.focus(); },30);
}
window.openPeriodicModal=openPeriodicModal;

function _pteCellHtml(e){
  const col=PTE_CAT_COLOR[e.c]||'#64748b';
  return '<button type="button" data-pte="'+e.s+'" title="'+_pteEsc(e.ru)+'" '
    +'style="width:100%;aspect-ratio:1/1.05;border-radius:7px;border:1px solid '+col+'66;background:'+col+'22;'
    +'color:var(--text);cursor:pointer;padding:3px 2px;display:flex;flex-direction:column;align-items:center;justify-content:center;'
    +'font-family:inherit">'
    +'<span style="font-size:8px;opacity:.65;line-height:1">'+e.Z+'</span>'
    +'<span style="font-size:13px;font-weight:800;line-height:1.1;color:'+col+'">'+e.s+'</span></button>';
}

function _pteBuildGrid(q){
  const grid=document.getElementById('pte-grid');
  if(!grid) return;
  q=String(q||'').trim().toLowerCase();
  const list=!q?PTE_ELEMENTS:PTE_ELEMENTS.filter(e=>
    e.s.toLowerCase().includes(q)||e.ru.toLowerCase().includes(q)||e.en.toLowerCase().includes(q)||String(e.Z)===q);
  if(!q) grid.innerHTML=_pteRenderTable();
  else grid.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:4px">'+list.map(_pteCellHtml).join('')+'</div>';
  grid.querySelectorAll('[data-pte]').forEach(function(btn){
    btn.onclick=function(){ _ptePick(btn.getAttribute('data-pte')); };
  });
}

function _pteRenderTable(){
  const byZ={}; PTE_ELEMENTS.forEach(e=>{ byZ[e.Z]=e; });
  const slots=[
    [1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2],
    [3,4,null,null,null,null,null,null,null,null,null,null,5,6,7,8,9,10],
    [11,12,null,null,null,null,null,null,null,null,null,null,13,14,15,16,17,18],
    [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36],
    [37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54],
    [55,56,57,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86],
    [87,88,89,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118]
  ];
  let html='<div style="display:grid;grid-template-columns:repeat(18,minmax(0,1fr));gap:3px;width:100%">';
  slots.forEach(function(row){
    row.forEach(function(z){
      if(!z){ html+='<div></div>'; return; }
      const e=byZ[z]; html+=e?_pteCellHtml(e):'<div></div>';
    });
  });
  html+='</div>';
  html+='<div style="margin-top:10px;font-size:11px;color:var(--text3);margin-bottom:4px">Лантаноиды</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(15,minmax(0,1fr));gap:3px">';
  for(let z=57;z<=71;z++) if(byZ[z]) html+=_pteCellHtml(byZ[z]);
  html+='</div><div style="margin-top:8px;font-size:11px;color:var(--text3);margin-bottom:4px">Актиноиды</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(15,minmax(0,1fr));gap:3px">';
  for(let z=89;z<=103;z++) if(byZ[z]) html+=_pteCellHtml(byZ[z]);
  html+='</div>';
  return html;
}

function _ptePick(symbol){
  const modal=document.getElementById('pte-modal');
  if(modal) modal.classList.remove('open');
  if(_pteModalMode==='reselect'&&_pteReselectId){ _pteApplySymbol(_pteReselectId,symbol); return; }
  insertPeriodicApplet(symbol);
}

function insertPeriodicApplet(symbol){
  const a=(typeof APPLETS!=='undefined')?APPLETS.find(x=>x.id==='periodic'):null;
  if(!a){ if(typeof toast==='function') toast('Аплет не найден','err'); return; }
  const el=_pteBySymbol(symbol)||_pteBySymbol('Fe');
  if(typeof pushUndo==='function') pushUndo();
  const w=280,h=320;
  const x=Math.round(((typeof canvasW!=='undefined'?canvasW:1200)-w)/2);
  const y=Math.round(((typeof canvasH!=='undefined'?canvasH:675)-h)/2);
  const theme=(typeof THEMES!=='undefined'&&typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)?THEMES[appliedThemeIdx]:null;
  const bgScheme={col:7,row:theme&&theme.dark===false?1:4};
  const fgScheme={col:7,row:0};
  let bg='',fg='';
  if(typeof _resolveSchemeColor==='function'&&theme){
    bg=_resolveSchemeColor(bgScheme,theme)||'';
    fg=_resolveSchemeColor(fgScheme,theme)||'';
  }
  const cfg={pteSymbol:el.s,pteShowHistory:true,genBg:bg,genColor:fg,genBgOp:0.92,genBgBlur:0,genBgScheme:bgScheme,genColorScheme:fgScheme};
  const d={
    id:'e'+(++ec),type:'applet',x,y,w,h,rot:0,anims:[],
    appletId:'periodic',appletHtml:getPeriodicHTML(null,cfg),_appletAspect:w/h,
    pteSymbol:el.s,pteShowHistory:true,
    genBg:bg,genColor:fg,genBgOp:0.92,genBgBlur:0,
    genBgScheme:bgScheme,genColorScheme:fgScheme
  };
  slides[cur].els.push(d);
  if(typeof mkEl==='function') mkEl(d);
  const dom=document.getElementById('canvas')&&document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
  if(dom&&typeof pick==='function') pick(dom);
  if(typeof save==='function') save();
  if(typeof drawThumbs==='function') drawThumbs();
  if(typeof saveState==='function') saveState();
  if(typeof toast==='function') toast(el.ru+' ('+el.s+')','ok');
}
window.insertPeriodicApplet=insertPeriodicApplet;

function _pteApplySymbol(elId,symbol){
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===elId);
  if(!d||d.appletId!=='periodic') return;
  const el=_pteBySymbol(symbol); if(!el) return;
  if(typeof pushUndo==='function') pushUndo();
  d.pteSymbol=el.s;
  refreshPeriodicEl(elId);
  if(typeof syncProps==='function') syncProps();
  if(typeof toast==='function') toast(el.ru+' ('+el.s+')','ok');
}

function refreshPeriodicEl(elId,opts){
  opts=opts||{};
  const s=slides[cur]; if(!s) return;
  const d=s.els.find(x=>x.id===elId);
  if(!d||d.appletId!=='periodic') return;
  d.appletHtml=getPeriodicHTML(null,{
    pteSymbol:d.pteSymbol,pteShowHistory:d.pteShowHistory!==false,
    genBg:d.genBg,genColor:d.genColor,genBgOp:d.genBgOp,genBgBlur:d.genBgBlur,
    genBgScheme:d.genBgScheme,genColorScheme:d.genColorScheme
  });
  const dom=document.getElementById('canvas')&&document.getElementById('canvas').querySelector('[data-id="'+elId+'"]');
  if(dom){
    dom.dataset.appletHtml=d.appletHtml;
    dom.dataset.pteSymbol=d.pteSymbol||'';
    dom.dataset.pteShowHistory=d.pteShowHistory!==false?'true':'false';
    const iframe=dom.querySelector('iframe');
    if(iframe) iframe.srcdoc=d.appletHtml;
  }
  if(!opts.silent){
    if(typeof save==='function') save();
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
  }
}
window.refreshPeriodicEl=refreshPeriodicEl;

function syncPeriodicProps(){
  if(!sel||sel.dataset.appletId!=='periodic') return;
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(!d) return;
  const el=_pteBySymbol(d.pteSymbol)||_pteBySymbol('Fe');
  const nameEl=document.getElementById('pte-props-name');
  if(nameEl) nameEl.textContent=el?(el.ru+' ('+el.s+')'):'—';
  const hist=document.getElementById('pte-show-history');
  if(hist) hist.checked=d.pteShowHistory!==false;
  const colors=_pteResolveColors(d);
  const bgPrev=document.getElementById('pte-bg-preview');
  if(bgPrev) bgPrev.style.background=d.genBg||colors.bg||'transparent';
  const bgHex=document.getElementById('pte-bg-hex');
  if(bgHex) bgHex.value=(typeof _colorFieldDisplay==='function')?_colorFieldDisplay(d.genBg||colors.bg,d.genBgScheme):(d.genBg||colors.bg||'');
  const fgPrev=document.getElementById('pte-fg-preview');
  if(fgPrev) fgPrev.style.background=d.genColor||colors.fg;
  const fgHex=document.getElementById('pte-fg-hex');
  if(fgHex) fgHex.value=(typeof _colorFieldDisplay==='function')?_colorFieldDisplay(d.genColor||colors.fg,d.genColorScheme):(d.genColor||colors.fg||'');
  const op=document.getElementById('pte-bg-op');
  if(op) op.value=d.genBgOp!=null?d.genBgOp:0.92;
  const blur=document.getElementById('pte-bg-blur');
  if(blur) blur.value=d.genBgBlur!=null?d.genBgBlur:0;
}
window.syncPeriodicProps=syncPeriodicProps;

function setPeriodicProp(prop,val,schemeRef){
  if(!sel||sel.dataset.appletId!=='periodic') return;
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(!d) return;
  if(typeof pushUndo==='function') pushUndo();
  d[prop]=val;
  if(prop==='genBg'){
    d.genBgScheme=(schemeRef!==undefined)?schemeRef:null;
    sel.dataset.genBg=val||'';
    sel.dataset.genBgScheme=d.genBgScheme?JSON.stringify(d.genBgScheme):'';
  }
  if(prop==='genColor'){
    d.genColorScheme=(schemeRef!==undefined)?schemeRef:null;
    sel.dataset.genColor=val||'';
    sel.dataset.genColorScheme=d.genColorScheme?JSON.stringify(d.genColorScheme):'';
  }
  if(prop==='genBgOp') sel.dataset.genBgOp=String(val);
  if(prop==='genBgBlur') sel.dataset.genBgBlur=String(val);
  if(prop==='pteShowHistory'){
    d.pteShowHistory=!!val;
    sel.dataset.pteShowHistory=d.pteShowHistory?'true':'false';
  }
  refreshPeriodicEl(d.id);
  syncPeriodicProps();
}
window.setPeriodicProp=setPeriodicProp;

function reselectPeriodicElement(){
  if(!sel||sel.dataset.appletId!=='periodic') return;
  openPeriodicModal({mode:'reselect',elId:sel.dataset.id});
}
window.reselectPeriodicElement=reselectPeriodicElement;
`;

fs.writeFileSync(path.join(__dirname, '../js/02b-periodic.js'), out, 'utf8');
console.log('OK', out.length);
