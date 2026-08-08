// ══════════════ FLIP CARD APPLET («Перевертыш») ══════════════
const FLIP_PAD = 15;
const FLIP_FS = 20;
const FLIP_W = 300;
const FLIP_H = 400;
const FLIP_RX = 14;

function _flipEsc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _flipEscAttr(s){
  return _flipEsc(s).replace(/'/g,'&#39;');
}
/** URL картинки для iframe: кодирование пробелов + assetUrl / абсолютный путь. */
function _flipResolveImgSrc(src){
  if(!src) return '';
  const s=String(src).trim();
  if(!s) return '';
  if(/^(data:|blob:|https?:)/i.test(s)) return s;
  // Кодируем сегменты (пробелы в «wild2 (1).png»)
  let enc=s;
  try{
    enc=s.split('/').map(function(p,i){
      if(i===0&&(p===''||/^[a-zA-Z]:$/.test(p))) return p;
      try{ return encodeURIComponent(decodeURIComponent(p)); }catch(e2){ return encodeURIComponent(p); }
    }).join('/');
  }catch(e){}
  if(typeof assetUrl==='function'){
    try{ return assetUrl(enc); }catch(e){}
  }
  try{
    if(typeof location!=='undefined'&&location.href) return new URL(enc, location.href).href;
  }catch(e){}
  return enc;
}
function _flipHexRgba(hex,a){
  if(!hex||hex==='transparent'||hex==='none') return 'rgba(0,0,0,0)';
  const h=String(hex).replace('#','');
  if(h.length!==6) return hex;
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  const alpha=(a==null||isNaN(a))?1:Math.max(0,Math.min(1,+a));
  return 'rgba('+r+','+g+','+b+','+alpha+')';
}
function _flipMixHex(hex, other, t){
  const h=String(hex||'').replace('#','');
  const o=String(other||'').replace('#','');
  if(h.length!==6||o.length!==6) return hex||other||'#888888';
  const mix=function(a,b){ return Math.max(0,Math.min(255,Math.round(a+(b-a)*t))); };
  const r=mix(parseInt(h.slice(0,2),16),parseInt(o.slice(0,2),16));
  const g=mix(parseInt(h.slice(2,4),16),parseInt(o.slice(2,4),16));
  const b=mix(parseInt(h.slice(4,6),16),parseInt(o.slice(4,6),16));
  return '#'+[r,g,b].map(function(x){ return x.toString(16).padStart(2,'0'); }).join('');
}
function _flipLuma(hex){
  const h=String(hex||'').replace('#','');
  if(h.length!==6) return 0;
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return (0.2126*r+0.7152*g+0.0722*b)/255;
}
function _flipDefaultBgScheme(){ return {col:7,row:7}; }
function _flipDefaultFgScheme(){ return {col:7,row:0}; }

function _flipResolveColors(d){
  const p=(typeof _appletTheme==='function')?_appletTheme():{dark:true,text:'#e2e8f0'};
  const themeDark=p.dark!==false;
  let bg=d.genBg||'', fg=d.genColor||'';
  const theme=(typeof THEMES!=='undefined'&&typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)?THEMES[appliedThemeIdx]:null;
  if(!bg&&typeof _resolveSchemeColor==='function'&&theme){
    bg=_resolveSchemeColor(d.genBgScheme||_flipDefaultBgScheme(),theme)||'';
  }
  if(!bg) bg=themeDark?'#1e293b':'#f8fafc';
  const isDark=_flipLuma(bg)<0.45;
  if(!fg&&typeof _resolveSchemeColor==='function'&&theme){
    fg=_resolveSchemeColor(d.genColorScheme||_flipDefaultFgScheme(),theme)||'';
  }
  if(!fg) fg=isDark?'#f8fafc':'#0f172a';
  const s=d.genBgScheme;
  const useGrad=!!(s && +s.col===7 && +s.row===7);
  let bg88=bg, bg89=_flipMixHex(bg, isDark?'#000000':'#ffffff', isDark?0.42:0.62);
  if(useGrad&&typeof _resolveSchemeColor==='function'&&theme){
    const c88=_resolveSchemeColor({col:7,row:7},theme);
    const c89=_resolveSchemeColor({col:7,row:8},theme);
    if(c88&&c89&&((_flipLuma(c88)<0.45)===isDark)){
      bg88=c88; bg89=c89;
    }
  }
  return {bg,fg,isDark,bg88,bg89,useGrad};
}

function _flipFaceInner(text, img){
  const hasTxt=!!(text&&String(text).trim());
  const hasImg=!!(img&&String(img).trim());
  const mode=hasTxt&&hasImg?'both':(hasImg?'img':(hasTxt?'txt':'empty'));
  let html='<div class="face-clip"><div class="inner mode-'+mode+'">';
  if(hasImg){
    // background-image — <img> внутри preserve-3d скачет при старте transform
    html+='<div class="img-wrap" style="background-image:url(\''+_flipEscAttr(_flipResolveImgSrc(img))+'\')"></div>';
  }
  if(hasTxt){
    html+='<div class="txt">'+_flipEsc(text).replace(/\n/g,'<br>')+'</div>';
  }
  html+='</div></div>';
  return html;
}

function getFlipHTML(palette, cfg){
  cfg=cfg||{};
  const d={
    genBg:cfg.genBg||'',
    genColor:cfg.genColor||'',
    genBgOp:cfg.genBgOp!=null?cfg.genBgOp:0.92,
    genBgBlur:cfg.genBgBlur!=null?cfg.genBgBlur:0,
    genBgScheme:cfg.genBgScheme||_flipDefaultBgScheme(),
    genColorScheme:cfg.genColorScheme||_flipDefaultFgScheme(),
    flipFace:cfg.flipFace==='back'?'back':'front',
    flipFrontText:cfg.flipFrontText||'',
    flipFrontImg:cfg.flipFrontImg||'',
    flipBackText:cfg.flipBackText||'',
    flipBackImg:cfg.flipBackImg||''
  };
  const colors=_flipResolveColors(d);
  const op=d.genBgOp!=null?+d.genBgOp:0.92;
  const bgCss=colors.useGrad
    ? ('linear-gradient(135deg,'+_flipHexRgba(colors.bg88,op)+' 0%,'+_flipHexRgba(colors.bg89,op)+' 50%,'+_flipHexRgba(colors.bg88,op)+' 100%)')
    : _flipHexRgba(colors.bg,op);
  const fg=colors.fg;
  const flipped=d.flipFace==='back';
  const front=_flipFaceInner(d.flipFrontText, d.flipFrontImg);
  const back=_flipFaceInner(d.flipBackText, d.flipBackImg);
  const pad=FLIP_PAD;
  const fs=FLIP_FS;
  const rx=FLIP_RX;

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><base href="'+_flipEscAttr((typeof location!=='undefined'&&location.href)?location.href.replace(/[^\/\\]*$/,'') : '')+'"><style>'
    +'*{box-sizing:border-box;margin:0;padding:0;cursor:pointer!important;'
    +'user-select:none!important;-webkit-user-select:none!important;-moz-user-select:none!important;'
    +'-webkit-touch-callout:none;caret-color:transparent!important}'
    +':root,html,body{width:100%;height:100%;overflow:hidden!important;'
    +'background:transparent!important;background-color:rgba(0,0,0,0)!important;'
    +'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;'
    +'display:block;-webkit-tap-highlight-color:transparent;'
    +'scrollbar-width:none;-ms-overflow-style:none}'
    +'html::-webkit-scrollbar,body::-webkit-scrollbar{display:none;width:0;height:0}'
    /* Хост (.el) клипает скругление и даёт drop-shadow; внутри — scale на середине поворота */
    +'.scene{position:relative;width:100%;height:100%;'
    +'perspective:1400px;perspective-origin:50% 50%;'
    +'background:transparent!important;overflow:hidden;border-radius:'+rx+'px}'
    +'.card{position:relative;width:100%;height:100%;transform-style:preserve-3d;'
    +'-webkit-transform-style:preserve-3d;transform:rotateY(0deg) scale(1);transform-origin:50% 50%;'
    +'background:transparent!important;overflow:visible;border-radius:'+rx+'px}'
    +'.card.flipped{transform:rotateY(180deg) scale(1)}'
    +'.face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;'
    +'overflow:hidden;border-radius:'+rx+'px;background:transparent!important;color:'+fg+';'
    +'-webkit-font-smoothing:antialiased}'
    +'.face.front{transform:rotateY(0deg)}'
    +'.face.back{transform:rotateY(180deg)}'
    +'.face-clip{width:100%;height:100%;border-radius:'+rx+'px;overflow:hidden;'
    +'background:'+bgCss+'}'
    +'.inner{position:relative;width:100%;height:100%;padding:'+pad+'px;box-sizing:border-box;'
    +'display:flex;flex-direction:column;align-items:stretch;justify-content:center;gap:'+pad+'px;min-height:0}'
    +'.inner.mode-img{padding:'+pad+'px}'
    +'.img-wrap{flex:1 1 auto;min-height:0;width:100%;'
    +'background-position:center;background-repeat:no-repeat;background-size:contain}'
    +'.inner.mode-img .img-wrap{flex:1 1 auto;height:100%}'
    +'.inner.mode-both .img-wrap{flex:1 1 auto;min-height:0}'
    +'.txt{flex:0 0 auto;max-width:100%;font-size:'+fs+'px;line-height:1.35;text-align:center;'
    +'font-weight:400;color:'+fg+';word-break:break-word;overflow-wrap:anywhere;pointer-events:none}'
    +'.inner.mode-both .txt{max-height:45%;overflow:hidden}'
    +'.inner.mode-txt{justify-content:center;align-items:center}'
    +'</style></head><body>'
    +'<div class="scene">'
    +'<div class="card'+(flipped?' flipped':'')+'" id="flip-card" style="transform:rotateY('+(flipped?180:0)+'deg) scale(1)">'
    +'<div class="face front">'+front+'</div>'
    +'<div class="face back">'+back+'</div>'
    +'</div></div>'
    +'<script>'
    +'(function(){'
    +'var card=document.getElementById("flip-card");'
    +'var busy=false;'
    +'function flipTo(back){'
    +'if(!card||busy)return;busy=true;'
    +'var from=card.classList.contains("flipped")?180:0;'
    +'var to=back?180:0;'
    +'if(from===to){busy=false;return;}'
    +'card.classList.toggle("flipped",!!back);'
    +'var mid=(from+to)/2;'
    +'var anim=card.animate(['
    +'{transform:"rotateY("+from+"deg) scale(1)"},'
    +'{transform:"rotateY("+mid+"deg) scale(0.88)"},'
    +'{transform:"rotateY("+to+"deg) scale(1)"}'
    +'],{duration:650,easing:"cubic-bezier(0.4,0.05,0.2,1)",fill:"forwards"});'
    +'anim.finished.then(function(){busy=false;}).catch(function(){busy=false;});'
    +'}'
    +'function toggle(){flipTo(!card.classList.contains("flipped"));}'
    +'function setBack(on){flipTo(!!on);}'
    +'function blockSel(e){e.preventDefault();}'
    +'document.addEventListener("selectstart",blockSel);'
    +'document.addEventListener("dragstart",blockSel);'
    +'document.addEventListener("mousedown",function(e){e.preventDefault();});'
    +'document.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();toggle();});'
    +'window.addEventListener("message",function(e){'
    +'try{var d=e.data||{};if(d.type==="flipToggle")toggle();'
    +'else if(d.type==="flipSet")setBack(!!d.back);'
    +'}catch(err){}'
    +'});'
    +'})();'
    +'<\/script>'
    +'</body></html>';
}
window.getFlipHTML=getFlipHTML;

function _flipHostShadowFilter(d){
  const colors=_flipResolveColors(d||{});
  return colors.isDark
    ? 'drop-shadow(0 6px 12px rgba(0,0,0,.42))'
    : 'drop-shadow(0 6px 12px rgba(15,23,42,.22))';
}

/** Скругление+overflow на хосте убирает белые углы iframe; тень — drop-shadow. */
function _layoutFlipIframe(hostEl, d){
  if(!hostEl) return;
  const rx=(typeof FLIP_RX==='number'?FLIP_RX:14)+'px';
  hostEl.querySelectorAll('.flip-host-shadow').forEach(function(n){ n.remove(); });
  const wrap=hostEl.querySelector('.applet-el')||hostEl;
  wrap.querySelectorAll('.flip-host-shadow').forEach(function(n){ n.remove(); });
  let data=d;
  if(!data&&typeof slides!=='undefined'&&slides[cur]){
    data=slides[cur].els.find(function(e){ return e.id===hostEl.dataset.id; });
  }
  hostEl.style.borderRadius=rx;
  hostEl.style.overflow='hidden';
  hostEl.style.background='transparent';
  hostEl.style.backgroundColor='transparent';
  hostEl.style.boxShadow='none';
  hostEl.style.filter=_flipHostShadowFilter(data||{});
  if(wrap!==hostEl){
    wrap.style.borderRadius=rx;
    wrap.style.overflow='hidden';
    wrap.style.background='transparent';
    wrap.style.boxShadow='none';
    wrap.style.filter='none';
    wrap.style.position='absolute';
    wrap.style.inset='0';
    wrap.style.width='100%';
    wrap.style.height='100%';
  }
  let clipEl=null;
  Array.prototype.forEach.call(wrap.children||[], function(ch){
    if(ch.tagName==='DIV'&&!ch.classList.contains('applet-border-overlay')&&ch.querySelector('iframe')){
      clipEl=ch;
    }
  });
  if(!clipEl){
    const ifr0=hostEl.querySelector('iframe');
    clipEl=ifr0&&ifr0.parentElement;
  }
  if(clipEl){
    clipEl.style.cssText='position:absolute;inset:0;overflow:hidden;background:transparent;border-radius:'+rx+';box-shadow:none;';
  }
  const iframe=hostEl.querySelector('iframe');
  if(iframe){
    iframe.style.position='absolute';
    iframe.style.left='0';
    iframe.style.top='0';
    iframe.style.right='0';
    iframe.style.bottom='0';
    iframe.style.width='100%';
    iframe.style.height='100%';
    iframe.style.border='none';
    iframe.style.background='transparent';
    iframe.style.backgroundColor='transparent';
    iframe.style.borderRadius=rx;
    iframe.style.overflow='hidden';
    iframe.setAttribute('scrolling','no');
    try{ iframe.style.setProperty('color-scheme','normal'); }catch(e){}
  }
}
window._layoutFlipIframe=_layoutFlipIframe;
window.FLIP_RX=FLIP_RX;

function _flipCfgFromData(d){
  return {
    flipFace:d.flipFace==='back'?'back':'front',
    flipFrontText:d.flipFrontText||'',
    flipFrontImg:d.flipFrontImg||'',
    flipBackText:d.flipBackText||'',
    flipBackImg:d.flipBackImg||'',
    genBg:d.genBg||'',
    genColor:d.genColor||'',
    genBgOp:d.genBgOp!=null?d.genBgOp:0.92,
    genBgBlur:d.genBgBlur!=null?d.genBgBlur:0,
    genBgScheme:d.genBgScheme||_flipDefaultBgScheme(),
    genColorScheme:d.genColorScheme||_flipDefaultFgScheme()
  };
}

function insertFlipApplet(){
  if(typeof pushUndo==='function') pushUndo();
  const theme=(typeof THEMES!=='undefined'&&typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)?THEMES[appliedThemeIdx]:null;
  const bgScheme=_flipDefaultBgScheme();
  const fgScheme=_flipDefaultFgScheme();
  let bg='', fg='';
  if(typeof _resolveSchemeColor==='function'&&theme){
    bg=_resolveSchemeColor(bgScheme,theme)||'';
    fg=_resolveSchemeColor(fgScheme,theme)||'';
  }
  const w=FLIP_W, h=FLIP_H;
  const x=typeof snapV==='function'?snapV(Math.round(((typeof canvasW!=='undefined'?canvasW:1200)-w)/2)):Math.round(((typeof canvasW!=='undefined'?canvasW:1200)-w)/2);
  const y=typeof snapV==='function'?snapV(Math.round(((typeof canvasH!=='undefined'?canvasH:675)-h)/2)):40;
  const cfg={
    flipFace:'front', flipFrontText:'', flipFrontImg:'', flipBackText:'', flipBackImg:'',
    genBg:bg, genColor:fg, genBgOp:0.92, genBgBlur:0,
    genBgScheme:bgScheme, genColorScheme:fgScheme
  };
  const d={
    id:'e'+(++ec),
    type:'applet',
    x:x, y:y, w:w, h:h,
    rot:0, anims:[],
    appletId:'flip',
    appletHtml:getFlipHTML(null,cfg),
    _appletAspect:w/h,
    flipFace:'front',
    flipFrontText:'', flipFrontImg:'',
    flipBackText:'', flipBackImg:'',
    genBg:bg, genColor:fg, genBgOp:0.92, genBgBlur:0,
    genBgScheme:bgScheme, genColorScheme:fgScheme
  };
  slides[cur].els.push(d);
  if(typeof mkEl==='function') mkEl(d);
  const dom=document.getElementById('canvas')&&document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
  if(dom&&typeof pick==='function') pick(dom);
  if(typeof save==='function') save();
  if(typeof drawThumbs==='function') drawThumbs();
  if(typeof saveState==='function') saveState();
  if(typeof toast==='function') toast('Перевертыш','ok');
}
window.insertFlipApplet=insertFlipApplet;

function refreshFlipEl(elId, opts){
  opts=opts||{};
  const s=slides[cur]; if(!s) return;
  const d=s.els.find(x=>x.id===elId);
  if(!d||d.appletId!=='flip') return;
  d.appletHtml=getFlipHTML(null,_flipCfgFromData(d));
  const dom=document.getElementById('canvas')&&document.getElementById('canvas').querySelector('[data-id="'+elId+'"]');
  if(dom){
    dom.dataset.appletHtml=d.appletHtml;
    dom.dataset.flipFace=d.flipFace==='back'?'back':'front';
    dom.dataset.flipFrontText=encodeURIComponent(d.flipFrontText||'');
    dom.dataset.flipFrontImg=d.flipFrontImg||'';
    dom.dataset.flipBackText=encodeURIComponent(d.flipBackText||'');
    dom.dataset.flipBackImg=d.flipBackImg||'';
    if(d.genColor!=null) dom.dataset.genColor=d.genColor||'';
    if(d.genBg!=null) dom.dataset.genBg=d.genBg||'';
    if(d.genBgOp!=null) dom.dataset.genBgOp=String(d.genBgOp);
    if(d.genBgBlur!=null) dom.dataset.genBgBlur=String(d.genBgBlur);
    dom.dataset.genColorScheme=d.genColorScheme?JSON.stringify(d.genColorScheme):'';
    dom.dataset.genBgScheme=d.genBgScheme?JSON.stringify(d.genBgScheme):'';
    const iframe=dom.querySelector('iframe');
    if(iframe) iframe.srcdoc=d.appletHtml;
    if(typeof _layoutFlipIframe==='function') _layoutFlipIframe(dom, d);
  }
  if(!opts.silent){
    if(typeof save==='function') save();
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
  }
}
window.refreshFlipEl=refreshFlipEl;

function _flipCurrentSide(d){
  return d&&d.flipFace==='back'?'back':'front';
}
function _flipTextKey(side){ return side==='back'?'flipBackText':'flipFrontText'; }
function _flipImgKey(side){ return side==='back'?'flipBackImg':'flipFrontImg'; }

function syncFlipProps(){
  if(!sel||sel.dataset.appletId!=='flip') return;
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(!d) return;
  const side=_flipCurrentSide(d);
  const sideLbl=document.getElementById('flip-side-label');
  if(sideLbl) sideLbl.textContent=side==='back'?'Оборотная сторона':'Лицевая сторона';
  const tog=document.getElementById('flip-side-tog');
  if(tog) tog.checked=side==='back';
  const ta=document.getElementById('flip-text');
  if(ta) ta.value=d[_flipTextKey(side)]||'';
  const imgPrev=document.getElementById('flip-img-preview');
  const imgPath=d[_flipImgKey(side)]||'';
  if(imgPrev){
    if(imgPath){
      imgPrev.style.backgroundImage='url("'+imgPath.replace(/"/g,'')+'")';
      imgPrev.style.backgroundSize='contain';
      imgPrev.style.backgroundRepeat='no-repeat';
      imgPrev.style.backgroundPosition='center';
      imgPrev.textContent='';
    }else{
      imgPrev.style.backgroundImage='';
      imgPrev.textContent='нет';
    }
  }
  const colors=_flipResolveColors(d);
  const bgPrev=document.getElementById('flip-bg-preview');
  if(bgPrev) bgPrev.style.background=d.genBg||colors.bg||'transparent';
  const bgHex=document.getElementById('flip-bg-hex');
  if(bgHex) bgHex.value=(typeof _colorFieldDisplay==='function')?_colorFieldDisplay(d.genBg||colors.bg,d.genBgScheme):(d.genBg||colors.bg||'');
  const fgPrev=document.getElementById('flip-fg-preview');
  if(fgPrev) fgPrev.style.background=d.genColor||colors.fg;
  const fgHex=document.getElementById('flip-fg-hex');
  if(fgHex) fgHex.value=(typeof _colorFieldDisplay==='function')?_colorFieldDisplay(d.genColor||colors.fg,d.genColorScheme):(d.genColor||colors.fg||'');
  const op=document.getElementById('flip-bg-op');
  if(op) op.value=d.genBgOp!=null?d.genBgOp:0.92;
}
window.syncFlipProps=syncFlipProps;

function setFlipProp(prop,val,schemeRef){
  if(!sel||sel.dataset.appletId!=='flip') return;
  const elId=sel.dataset.id;
  if(typeof pushUndo==='function') pushUndo();
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===elId);
  if(!d||d.appletId!=='flip') return;
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
  if(prop==='flipFace'){
    d.flipFace=val==='back'?'back':'front';
    sel.dataset.flipFace=d.flipFace;
    // 3D-анимация без перезагрузки iframe
    d.appletHtml=getFlipHTML(null,_flipCfgFromData(d));
    sel.dataset.appletHtml=d.appletHtml;
    const iframe=sel.querySelector('iframe');
    if(iframe&&typeof _appletPostMessage==='function'){
      _appletPostMessage(iframe,{type:'flipSet', back:d.flipFace==='back'});
    }else if(iframe){
      iframe.srcdoc=d.appletHtml;
    }
    syncFlipProps();
    if(typeof save==='function') save();
    if(typeof saveState==='function') saveState();
    return;
  }
  refreshFlipEl(d.id);
  syncFlipProps();
}
window.setFlipProp=setFlipProp;

function toggleFlipSide(){
  if(!sel||sel.dataset.appletId!=='flip') return;
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(!d) return;
  const next=d.flipFace==='back'?'front':'back';
  setFlipProp('flipFace', next);
}
window.toggleFlipSide=toggleFlipSide;

function setFlipSideText(val){
  if(!sel||sel.dataset.appletId!=='flip') return;
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(!d||d.appletId!=='flip') return;
  const key=_flipTextKey(_flipCurrentSide(d));
  d[key]=String(val==null?'':val);
  // Без pushUndo на каждый символ — обновляем карточку на лету
  refreshFlipEl(d.id, {silent:true});
  if(typeof save==='function') save();
}
window.setFlipSideText=setFlipSideText;

function pickFlipImage(){
  if(!sel||sel.dataset.appletId!=='flip') return;
  const elId=sel.dataset.id;
  const open=typeof openImageModalPick==='function'?openImageModalPick:null;
  if(!open){
    if(typeof toast==='function') toast('Галерея недоступна','err');
    return;
  }
  open(function(path){
    if(!path) return;
    if(typeof pushUndo==='function') pushUndo();
    const d=slides[cur]&&slides[cur].els.find(e=>e.id===elId);
    if(!d||d.appletId!=='flip') return;
    const key=_flipImgKey(_flipCurrentSide(d));
    d[key]=path;
    // восстановить выделение после модалки
    const dom=document.getElementById('canvas')&&document.getElementById('canvas').querySelector('[data-id="'+elId+'"]');
    if(dom&&typeof pick==='function') pick(dom);
    refreshFlipEl(d.id);
    syncFlipProps();
  });
}
window.pickFlipImage=pickFlipImage;

function clearFlipImage(){
  if(!sel||sel.dataset.appletId!=='flip') return;
  const elId=sel.dataset.id;
  if(typeof pushUndo==='function') pushUndo();
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===elId);
  if(!d||d.appletId!=='flip') return;
  d[_flipImgKey(_flipCurrentSide(d))]='';
  refreshFlipEl(d.id);
  syncFlipProps();
}
window.clearFlipImage=clearFlipImage;

window._wireFlipAppletClick=function(el){
  if(!el||el.dataset.appletId!=='flip'||el._flipClickWired) return;
  el._flipClickWired=true;
  el.style.cursor='pointer';
  let downX, downY, moved;
  const onMove=function(ev){
    if(downX==null) return;
    if(Math.hypot(ev.clientX-downX, ev.clientY-downY)>4) moved=true;
  };
  const onUp=function(){
    document.removeEventListener('mousemove', onMove);
    if(downX==null) return;
    const click=!moved&&!window._anyDragging;
    downX=downY=null;
    if(!click) return;
    const iframe=el.querySelector('iframe');
    if(iframe&&typeof _appletPostMessage==='function') _appletPostMessage(iframe,{type:'flipToggle'});
  };
  el.addEventListener('mousedown', function(ev){
    if(ev.target.closest('.rh')||ev.target.closest('.db')) return;
    ev.preventDefault();
    ev.stopPropagation();
    downX=ev.clientX; downY=ev.clientY; moved=false;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, {once:true});
  });
};
