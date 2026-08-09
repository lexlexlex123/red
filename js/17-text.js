// ══════════════ TEXT BORDER & OPACITY ══════════════
function setTextBorder(prop,val,schemeRef){
  if(!sel||sel.dataset.type!=='text')return;
  if(prop==='color'){
    sel.dataset.textBorderColor=val;
    const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d) d.borderScheme = (schemeRef !== undefined ? (schemeRef || null) : d.borderScheme);
  }
  if(prop==='width'){sel.dataset.textBorderW=val;}
  if(prop==='style'){
    sel.dataset.textBorderStyle=val;
    try{
      document.querySelectorAll('.txt-border-style-btn').forEach(b=>{
        b.classList.toggle('active', b.dataset.style===val);
      });
    }catch(e){}
  }
  applyTextBorderStyle(sel);
  save();drawThumbs();saveState();
}
window._textShadowParams=function(d){
  if(!d) return {ss:0,sb:0,sc:'#000000'};
  let ss=d.textShadowSize!=null?+d.textShadowSize:0;
  let sb=d.textShadowBlur!=null?+d.textShadowBlur:0;
  if(!ss&&!sb&&d.textShadowW&&+d.textShadowW>0){
    sb=+d.textShadowW;
    ss=Math.max(1,Math.round(sb*0.35));
  }
  return {ss,sb,sc:d.textShadowColor||'#000000'};
};
window._textShadowCssFrom=function(ss,sb,c,legacyW){
  const p=window._textShadowParams({textShadowSize:ss,textShadowBlur:sb,textShadowColor:c,textShadowW:legacyW});
  ss=p.ss; sb=p.sb; c=p.sc;
  if(ss<=0&&sb<=0) return '';
  const effBlur=sb>0&&typeof window._shadowEffectiveBlur==='function'
    ?window._shadowEffectiveBlur(ss,sb):sb;
  if(ss<=0) return '0 0 '+effBlur+'px '+c;
  if(sb<=0){
    const parts=[];
    for(let i=0;i<16;i++){
      const a=(i/16)*Math.PI*2;
      parts.push(Math.round(Math.cos(a)*ss)+'px '+Math.round(Math.sin(a)*ss)+'px 0 '+c);
    }
    return parts.join(', ');
  }
  const parts=[];
  for(let i=0;i<12;i++){
    const a=(i/12)*Math.PI*2;
    parts.push(Math.round(Math.cos(a)*ss)+'px '+Math.round(Math.sin(a)*ss)+'px '+effBlur+'px '+c);
  }
  return parts.join(', ');
};
window._textShadowActive=function(d){
  if(!d) return false;
  if(+d.textShadowSize>0||+d.textShadowBlur>0) return true;
  return !!(d.textShadowW&&+d.textShadowW>0);
};
window._textBlockShadowParams=function(d){
  if(!d) return {ss:0,sb:0,sc:'#000000',inset:false};
  return {
    ss:d.textBlockShadowSize!=null?+d.textBlockShadowSize:0,
    sb:d.textBlockShadowBlur!=null?+d.textBlockShadowBlur:0,
    sc:d.textBlockShadowColor||'#000000',
    inset:d.textBlockShadowInset==='1'||d.textBlockShadowInset===true
  };
};
window._textBlockShadowActive=function(d){
  if(!d) return false;
  return +d.textBlockShadowSize>0||+d.textBlockShadowBlur>0;
};
window._textBlockShadowCssFrom=function(ss,sb,c,inset){
  ss=+ss||0; sb=+sb||0; c=c||'#000000';
  if(ss<=0&&sb<=0) return '';
  return (inset?'inset ':'')+'0 0 '+sb+'px '+ss+'px '+c;
};
window._ensureTextShadowInner=function(el){
  const tel=el&&el.querySelector('.tel')||el&&el.querySelector('.ec');
  if(!tel) return null;
  let inner=tel.querySelector('._txt_sh_inner');
  if(inner) return inner;
  inner=document.createElement('div');
  inner.className='_txt_sh_inner';
  inner.style.cssText='width:100%;box-sizing:border-box;';
  while(tel.firstChild) inner.appendChild(tel.firstChild);
  tel.appendChild(inner);
  return inner;
};
window._unwrapTextShadowInner=function(el){
  const tel=el&&el.querySelector('.tel')||el&&el.querySelector('.ec');
  if(!tel) return;
  const inner=tel.querySelector('._txt_sh_inner');
  if(!inner) return;
  while(inner.firstChild) tel.insertBefore(inner.firstChild,inner);
  inner.remove();
};
window._textShadowContentNode=function(el){
  if(!el) return null;
  const inner=el.querySelector('._txt_sh_inner');
  if(inner) return inner;
  const tel=el.querySelector('.tel')||el.querySelector('.ec');
  if(!tel) return null;
  const valign=tel.querySelector('.ec-valign-wrap');
  if(valign) return valign;
  return tel;
};
window._textBlockShadowInsetOn=function(el){
  if(!el||!el.dataset) return false;
  return el.dataset.textBlockShadowInset==='1'&&window._textBlockShadowActive(el.dataset);
};
window._syncTextShadowLayout=function(el,d){
  if(!el) return 0;
  const body=el.querySelector('._text_body');
  const tel=el.querySelector('.tel')||el.querySelector('.ec');
  const content=window._textShadowContentNode(el);
  const on=d&&window._textShadowActive(d);
  if(!on){
    if(typeof window._unwrapTextShadowInner==='function') window._unwrapTextShadowInner(el);
    const blockInset=window._textBlockShadowInsetOn(el);
    if(body){
      body.style.overflow=blockInset?'hidden':'';
      body.style.top=body.style.left=body.style.right=body.style.bottom='';
      body.style.padding='';
    }
    if(tel){ tel.style.overflow=''; tel.style.filter=''; }
    if(content&&content!==tel){ content.style.overflow=''; content.style.filter=''; }
    el.style.overflow='';
    el.classList.remove('has-text-shadow');
    return 0;
  }
  const {ss,sb}=window._textShadowParams(d);
  const pad=typeof window._shadowPad==='function'?window._shadowPad(ss,sb,0):Math.ceil(ss+sb*3.5+20);
  el.style.overflow='visible';
  el.classList.add('has-text-shadow');
  const blockInset=window._textBlockShadowInsetOn(el);
  if(body){
    body.style.overflow=blockInset?'hidden':'visible';
    body.style.top=body.style.left=body.style.right=body.style.bottom='';
    body.style.padding='';
  }
  if(tel) tel.style.overflow='visible';
  if(content&&content!==tel) content.style.overflow='visible';
  return pad;
};
window._applyTextShadowFilter=function(el,d){
  const tel=el&&(el.querySelector('.tel')||el.querySelector('.ec'));
  const fid=el?'txtsh_'+String(el.dataset.id||'x').replace(/[^a-zA-Z0-9_-]/g,'_'):'';
  if(tel) tel.style.filter='';
  if(!el||!window._textShadowActive(d)){
    const content=window._textShadowContentNode(el);
    if(content){ content.style.removeProperty('filter'); content.style.textShadow=''; }
    window._syncTextShadowLayout(el,null);
    if(fid&&typeof window._ensureShadowFilterHost==='function'){
      const old=window._ensureShadowFilterHost().querySelector('#'+fid);
      if(old) old.remove();
    }
    if(typeof applyTextBlockShadowStyle==='function') applyTextBlockShadowStyle(el);
    return;
  }
  if(typeof window._ensureShadowFilterHost!=='function'||typeof window._shadowFilterInner!=='function') return;
  const content=typeof window._ensureTextShadowInner==='function'?window._ensureTextShadowInner(el):window._textShadowContentNode(el);
  if(!content) return;
  content.style.textShadow='';
  const {ss,sb,sc}=window._textShadowParams(d);
  const defs=window._ensureShadowFilterHost();
  const old=defs.querySelector('#'+fid);
  if(old) old.remove();
  const w=Math.max(1,content.offsetWidth||tel&&tel.offsetWidth||parseFloat(el.style.width)||100);
  const h=Math.max(1,content.offsetHeight||tel&&tel.offsetHeight||parseFloat(el.style.height)||50);
  const filter=document.createElementNS('http://www.w3.org/2000/svg','filter');
  filter.setAttribute('id',fid);
  if(typeof window._shadowFilterObbPct==='function'){
    const px=window._shadowFilterObbPct(ss,sb,0,w,h,'x');
    const py=window._shadowFilterObbPct(ss,sb,0,w,h,'y');
    filter.setAttribute('filterUnits','objectBoundingBox');
    filter.setAttribute('x','-'+px+'%');
    filter.setAttribute('y','-'+py+'%');
    filter.setAttribute('width',(100+px*2)+'%');
    filter.setAttribute('height',(100+py*2)+'%');
  }else{
    filter.setAttribute('x','-50%');
    filter.setAttribute('y','-50%');
    filter.setAttribute('width','200%');
    filter.setAttribute('height','200%');
  }
  filter.innerHTML=window._shadowFilterInner(ss,sb,sc);
  defs.appendChild(filter);
  if(defs.querySelector('#'+fid)){
    try{ content.style.setProperty('filter','url(#'+fid+')'); }catch(e){ content.style.filter=''; }
  }else{
    content.style.filter='';
  }
  window._syncTextShadowLayout(el,d);
  if(typeof applyTextBlockShadowStyle==='function') applyTextBlockShadowStyle(el);
};
function syncTextShadowUI(el){
  const src=el||(typeof sel!=='undefined'?sel:null);
  if(!src||src.dataset.type!=='text') return;
  try{
    const _tsh=document.getElementById('p-tshadow-preview');
    if(_tsh) _tsh.style.background=src.dataset.textShadowColor||'#000000';
    let _tsb=src.dataset.textShadowBlur,_tss=src.dataset.textShadowSize;
    if(src.dataset.textShadowW&&+src.dataset.textShadowW>0&&!_tsb&&!_tss){
      _tsb=src.dataset.textShadowW;
      _tss=String(Math.max(1,Math.round(+src.dataset.textShadowW*0.35)));
    }
    const sbEl=document.getElementById('p-tshadow-sb');
    const ssEl=document.getElementById('p-tshadow-ss');
    const sbVal=_tsb!=null&&+_tsb>0?_tsb:0;
    const ssVal=_tss!=null&&+_tss>0?_tss:0;
    if(sbEl){
      sbEl.value=sbVal;
      if(typeof refreshNumScrubber==='function') refreshNumScrubber(sbEl);
    }
    if(ssEl){
      ssEl.value=ssVal;
      if(typeof refreshNumScrubber==='function') refreshNumScrubber(ssEl);
    }
  }catch(e){}
}
window._textBlockShadowTarget=function(el){
  if(!el) return null;
  return typeof window._ensureTextBodyWrap==='function' ? window._ensureTextBodyWrap(el) : (el.querySelector('._text_body')||el);
};
function syncTextBlockShadowUI(el){
  const src=el||(typeof sel!=='undefined'?sel:null);
  if(!src||src.dataset.type!=='text') return;
  try{
    const p=window._textBlockShadowParams(src.dataset);
    const sw=document.getElementById('p-bshadow-preview');
    if(sw) sw.style.background=p.sc||'#000000';
    const sbEl=document.getElementById('p-bshadow-sb');
    const ssEl=document.getElementById('p-bshadow-ss');
    const inEl=document.getElementById('p-bshadow-inset');
    if(sbEl){ sbEl.value=p.sb||0; if(typeof refreshNumScrubber==='function') refreshNumScrubber(sbEl); }
    if(ssEl){ ssEl.value=p.ss||0; if(typeof refreshNumScrubber==='function') refreshNumScrubber(ssEl); }
    if(inEl) inEl.checked=!!p.inset;
  }catch(e){}
}
function resetTextShadow(){
  if(!sel||sel.dataset.type!=='text') return;
  delete sel.dataset.textShadowBlur;
  delete sel.dataset.textShadowSize;
  delete sel.dataset.textShadowW;
  applyTextShadowStyle(sel);
  syncTextShadowUI(sel);
  save();drawThumbs();saveState();
}
function resetTextBlockShadow(){
  if(!sel||sel.dataset.type!=='text') return;
  delete sel.dataset.textBlockShadowBlur;
  delete sel.dataset.textBlockShadowSize;
  delete sel.dataset.textBlockShadowColor;
  delete sel.dataset.textBlockShadowInset;
  applyTextBlockShadowStyle(sel);
  syncTextBlockShadowUI(sel);
  save();drawThumbs();saveState();
}
function setTextShadow(prop,val,schemeRef){
  if(!sel||sel.dataset.type!=='text')return;
  if(prop==='color'){
    sel.dataset.textShadowColor=val;
    const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d) d.textShadowScheme = (schemeRef !== undefined ? (schemeRef || null) : d.textShadowScheme);
  }
  if(prop==='blur'){
    if(+val>0) sel.dataset.textShadowBlur=val;
    else delete sel.dataset.textShadowBlur;
  }
  if(prop==='size'){
    if(+val>0) sel.dataset.textShadowSize=val;
    else delete sel.dataset.textShadowSize;
  }
  delete sel.dataset.textShadowW;
  applyTextShadowStyle(sel);
  syncTextShadowUI(sel);
  save();drawThumbs();saveState();
}
function setTextBlockShadow(prop,val){
  if(!sel||sel.dataset.type!=='text') return;
  if(prop==='color'){
    sel.dataset.textBlockShadowColor=val;
  }
  if(prop==='blur'){
    if(+val>0) sel.dataset.textBlockShadowBlur=val;
    else delete sel.dataset.textBlockShadowBlur;
  }
  if(prop==='size'){
    if(+val>0) sel.dataset.textBlockShadowSize=val;
    else delete sel.dataset.textBlockShadowSize;
  }
  if(prop==='inset'){
    if(val){
      sel.dataset.textBlockShadowInset='1';
      if(!(+sel.dataset.textBlockShadowBlur>0)&&!(+sel.dataset.textBlockShadowSize>0)){
        sel.dataset.textBlockShadowBlur='8';
        sel.dataset.textBlockShadowSize='2';
      }
    }else delete sel.dataset.textBlockShadowInset;
  }
  applyTextBlockShadowStyle(sel);
  syncTextBlockShadowUI(sel);
  save();drawThumbs();saveState();
}
function applyTextShadowStyle(el,override){
  const d=override||{
    textShadowSize:el.dataset.textShadowSize,
    textShadowBlur:el.dataset.textShadowBlur,
    textShadowColor:el.dataset.textShadowColor,
    textShadowW:el.dataset.textShadowW
  };
  if(typeof window._applyTextShadowFilter==='function') window._applyTextShadowFilter(el,d);
}
window._stampTextDatasetFromModel=function(el,d){
  if(!el||!d||d.type!=='text') return;
  if(d.textBg) el.dataset.textBg=d.textBg; else delete el.dataset.textBg;
  if(d.textBgOp!=null) el.dataset.textBgOp=d.textBgOp; else delete el.dataset.textBgOp;
  if(d.textBgBlur>0) el.dataset.textBgBlur=d.textBgBlur; else delete el.dataset.textBgBlur;
  if(d.textBgGrad) el.dataset.textBgGrad='1'; else delete el.dataset.textBgGrad;
  if(d.textBgCol2) el.dataset.textBgCol2=d.textBgCol2; else delete el.dataset.textBgCol2;
  if(d.textBgDir!=null) el.dataset.textBgDir=d.textBgDir; else delete el.dataset.textBgDir;
  if(d.textBorderW!=null) el.dataset.textBorderW=d.textBorderW; else delete el.dataset.textBorderW;
  if(d.textBorderColor) el.dataset.textBorderColor=d.textBorderColor; else delete el.dataset.textBorderColor;
  if(d.textBorderStyle) el.dataset.textBorderStyle=d.textBorderStyle; else delete el.dataset.textBorderStyle;
  if(d.textShadowBlur!=null&&+d.textShadowBlur>0) el.dataset.textShadowBlur=d.textShadowBlur; else delete el.dataset.textShadowBlur;
  if(d.textShadowSize!=null&&+d.textShadowSize>0) el.dataset.textShadowSize=d.textShadowSize; else delete el.dataset.textShadowSize;
  if(d.textShadowW&&+d.textShadowW>0&&!+(d.textShadowBlur||0)&&!+(d.textShadowSize||0)) el.dataset.textShadowW=d.textShadowW;
  else delete el.dataset.textShadowW;
  if(d.textShadowColor&&window._textShadowActive&&window._textShadowActive(d)) el.dataset.textShadowColor=d.textShadowColor;
  else delete el.dataset.textShadowColor;
  if(d.textBlockShadowBlur!=null&&+d.textBlockShadowBlur>0) el.dataset.textBlockShadowBlur=d.textBlockShadowBlur; else delete el.dataset.textBlockShadowBlur;
  if(d.textBlockShadowSize!=null&&+d.textBlockShadowSize>0) el.dataset.textBlockShadowSize=d.textBlockShadowSize; else delete el.dataset.textBlockShadowSize;
  if(d.textBlockShadowColor&&window._textBlockShadowActive&&window._textBlockShadowActive(d)) el.dataset.textBlockShadowColor=d.textBlockShadowColor;
  else delete el.dataset.textBlockShadowColor;
  if(d.textBlockShadowInset&&window._textBlockShadowActive&&window._textBlockShadowActive(d)) el.dataset.textBlockShadowInset='1'; else delete el.dataset.textBlockShadowInset;
  if(d.rx_tl||d.rx_tr||d.rx_bl||d.rx_br){
    el.dataset.rx_tl=d.rx_tl||0; el.dataset.rx_tr=d.rx_tr||0;
    el.dataset.rx_bl=d.rx_bl||0; el.dataset.rx_br=d.rx_br||0;
    el.dataset.rxUnit=d.rxUnit||'px';
  } else {
    delete el.dataset.rx_tl; delete el.dataset.rx_tr; delete el.dataset.rx_bl; delete el.dataset.rx_br;
  }
  if(d.pad_t!==undefined||d.pad_r!==undefined||d.pad_b!==undefined||d.pad_l!==undefined){
    el.dataset.pad_t=d.pad_t!=null?d.pad_t:0;
    el.dataset.pad_r=d.pad_r!=null?d.pad_r:0;
    el.dataset.pad_b=d.pad_b!=null?d.pad_b:0;
    el.dataset.pad_l=d.pad_l!=null?d.pad_l:0;
    el.dataset.padUnit=d.padUnit||'px';
  } else {
    delete el.dataset.pad_t; delete el.dataset.pad_r; delete el.dataset.pad_b; delete el.dataset.pad_l;
    delete el.dataset.padUnit;
  }
};
window._shadowOverrideFromModel=function(d){
  if(!d) return {};
  const o={};
  if(d.textShadowBlur!=null&&+d.textShadowBlur>0) o.textShadowBlur=d.textShadowBlur;
  if(d.textShadowSize!=null&&+d.textShadowSize>0) o.textShadowSize=d.textShadowSize;
  if(d.textShadowW&&+d.textShadowW>0&&!o.textShadowBlur&&!o.textShadowSize) o.textShadowW=d.textShadowW;
  if(d.textShadowColor) o.textShadowColor=d.textShadowColor;
  if(d.textBlockShadowBlur!=null&&+d.textBlockShadowBlur>0) o.textBlockShadowBlur=d.textBlockShadowBlur;
  if(d.textBlockShadowSize!=null&&+d.textBlockShadowSize>0) o.textBlockShadowSize=d.textBlockShadowSize;
  if(d.textBlockShadowColor) o.textBlockShadowColor=d.textBlockShadowColor;
  if(d.textBlockShadowInset) o.textBlockShadowInset='1';
  return o;
};
window._shadowOverrideFromState=function(state){
  if(!state) return {};
  const o={};
  if(+state.textShadowBlur>0) o.textShadowBlur=state.textShadowBlur;
  if(+state.textShadowSize>0) o.textShadowSize=state.textShadowSize;
  if(state.textShadowColor) o.textShadowColor=state.textShadowColor;
  if(+state.textBlockShadowBlur>0) o.textBlockShadowBlur=state.textBlockShadowBlur;
  if(+state.textBlockShadowSize>0) o.textBlockShadowSize=state.textBlockShadowSize;
  if(state.textBlockShadowColor) o.textBlockShadowColor=state.textBlockShadowColor;
  if(state.textBlockShadowInset) o.textBlockShadowInset='1';
  return o;
};
window._textBlockShadowInsetLayer=function(el){
  if(!el) return null;
  const body=window._textBlockShadowTarget(el);
  if(!body) return null;
  let layer=body.querySelector('.el-block-shadow-inset');
  if(!layer){
    layer=document.createElement('div');
    layer.className='el-block-shadow-inset';
    layer.style.cssText='position:absolute;inset:0;z-index:4;pointer-events:none;border-radius:inherit;';
    body.appendChild(layer);
  }
  return layer;
};
function applyTextBlockShadowStyle(el,override){
  if(!el) return;
  const d=override||{
    textBlockShadowSize:el.dataset.textBlockShadowSize,
    textBlockShadowBlur:el.dataset.textBlockShadowBlur,
    textBlockShadowColor:el.dataset.textBlockShadowColor,
    textBlockShadowInset:el.dataset.textBlockShadowInset
  };
  const body=window._textBlockShadowTarget(el);
  const insetLayer=body?body.querySelector('.el-block-shadow-inset'):null;
  if(body) body.style.boxShadow='';
  if(insetLayer) insetLayer.style.boxShadow='';
  const bg=body?body.querySelector('.el-bg-layer'):el.querySelector('.el-bg-layer');
  if(bg) bg.style.boxShadow='';
  const active=window._textBlockShadowActive(d);
  el.classList.toggle('has-block-shadow-inset',!!(active&&window._textBlockShadowParams(d).inset));
  if(!active){
    if(insetLayer) insetLayer.remove();
    if(body&&body.style.overflow==='hidden'&&!window._textBlockShadowInsetOn(el)) body.style.overflow='';
    return;
  }
  const p=window._textBlockShadowParams(d);
  const shadow=window._textBlockShadowCssFrom(p.ss,p.sb,p.sc,p.inset);
  if(p.inset){
    if(body){
      body.style.overflow='hidden';
      const rx=body.style.borderRadius||el.style.borderRadius||'';
      const overlay=window._textBlockShadowInsetLayer(el);
      if(overlay){
        overlay.style.borderRadius=rx;
        overlay.style.boxShadow=shadow;
      }
    }
  }else if(body){
    body.style.boxShadow=shadow;
  }
}
window._textBorderHost=function(el){
  if(!el||el.dataset.type!=='text') return el;
  const body=typeof window._ensureTextBodyWrap==='function'?window._ensureTextBodyWrap(el):(el.querySelector('._text_body')||el);
  let layer=body.querySelector('.el-bg-layer');
  if(!layer){
    layer=document.createElement('div');
    layer.className='el-bg-layer';
    layer.style.cssText='position:absolute;inset:0;z-index:0;pointer-events:none;border-radius:inherit;';
    body.insertBefore(layer,body.firstChild);
    const bodyRx=body.style.borderRadius;
    if(bodyRx)layer.style.borderRadius=bodyRx;
  }
  return layer;
};
function _clearTextBorderStyles(el){
  if(!el)return;
  el.style.outline='';el.style.outlineOffset='';el.style.border='';el.style.boxSizing='';
  const body=el.querySelector('._text_body');
  if(body){
    body.style.outline='';body.style.outlineOffset='';body.style.border='';body.style.boxSizing='';
    body.querySelectorAll('.text-border-svg').forEach(s=>s.remove());
  }
  const bg=el.querySelector('.el-bg-layer');
  if(bg){
    bg.style.outline='';bg.style.outlineOffset='';bg.style.border='';bg.style.boxSizing='';
    bg.querySelectorAll('.text-border-svg').forEach(s=>s.remove());
  }
}
function _cleanupTextFrameLayer(el){
  const hasBg=!!(el.dataset.textBg||el.dataset.textBgGrad==='1'||+(el.dataset.textBgBlur||0)>0);
  const hasBorder=+(el.dataset.textBorderW||0)>0;
  if(hasBg||hasBorder)return;
  const layer=el.querySelector('.el-bg-layer');
  if(layer)layer.remove();
}
function _textBorderOuterPad(sw, style) {
  if (style === 'wave' || style === 'zigzag') return Math.ceil(sw + sw * 0.85 + 3);
  if (style === 'double') return Math.ceil(sw * 3.5 + 3);
  return 0;
}
function _syncTextBorderLayout(el, style, sw) {
  if (!el) return;
  const deco = style && _textBorderOuterPad(sw, style) > 0;
  const body = el.querySelector('._text_body');
  const tel = el.querySelector('.tel') || el.querySelector('.ec');
  const host = el.querySelector('.el-bg-layer');
  if (!deco) {
    el.classList.remove('has-text-border-deco');
    if (el.style.overflow === 'visible') el.style.overflow = '';
    if (body && body.style.overflow === 'visible') body.style.overflow = '';
    if (tel && tel.style.overflow === 'visible') tel.style.overflow = '';
    if (host && host.style.overflow === 'visible') host.style.overflow = '';
    return;
  }
  el.classList.add('has-text-border-deco');
  el.style.overflow = 'visible';
  if (body) body.style.overflow = 'visible';
  if (tel) tel.style.overflow = 'visible';
  if (host) host.style.overflow = 'visible';
}
function applyTextBorderStyle(el){
  const w=+(el.dataset.textBorderW||0);
  const c=el.dataset.textBorderColor||'#ffffff';
  const style=el.dataset.textBorderStyle||'solid';
  _clearTextBorderStyles(el);
  if(w<=0){_cleanupTextFrameLayer(el);_syncTextBorderLayout(el,null,0);return;}
  const host=typeof window._textBorderHost==='function'?window._textBorderHost(el):el;
  if(style==='wave'||style==='zigzag'||style==='double'){
    _syncTextBorderLayout(el, style, w);
    _applyTextBorderSVG(el,w,c,style,host);
  } else {
    _syncTextBorderLayout(el,null,0);
    const cssStyle={solid:'solid',dashed:'dashed',dotted:'dotted'}[style]||'solid';
    const target=host||el;
    target.style.border=w+'px '+cssStyle+' '+c;
    target.style.boxSizing='border-box';
  }
}
window._restoreTextBlockVisuals=function(el){
  if(!el||el.dataset.type!=='text')return;
  if(typeof applyTextRadius==='function')applyTextRadius(el);
  if(typeof applyTextPad==='function'&&el.dataset.pad_t!==undefined)applyTextPad(el);
  if(typeof applyTextBorderStyle==='function')applyTextBorderStyle(el);
  if(el.dataset.valign&&typeof applyTextVAlign==='function')applyTextVAlign(el,el.dataset.valign);
  else if(typeof applyTextVAlign==='function')applyTextVAlign(el,'top');
  if(typeof applyTextBg==='function')applyTextBg(el);
  if(typeof applyTextColorGrad==='function')applyTextColorGrad(el);
  if(typeof applyTextShadowStyle==='function')applyTextShadowStyle(el);
  if(typeof applyTextBlockShadowStyle==='function')applyTextBlockShadowStyle(el);
};
function _applyTextBorderSVG(el, w, c, style, host) {
  host=host||(typeof window._textBorderHost==='function'?window._textBorderHost(el):el);
  const ow = parseFloat(el.style.width)  || 200;
  const oh = parseFloat(el.style.height) || 100;
  const sw = +(el.dataset.textBorderW || 2);
  const pad = _textBorderOuterPad(sw, style);
  // viewBox origin is -pad; content box is 0..ow — stroke centerline on outer edge
  const x0 = -sw / 2, y0 = -sw / 2;
  const x1 = ow + sw / 2, y1 = oh + sw / 2;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.classList.add('text-border-svg');
  svg.style.cssText = 'position:absolute;left:' + (-pad) + 'px;top:' + (-pad) + 'px;width:calc(100% + ' + (pad * 2) + 'px);height:calc(100% + ' + (pad * 2) + 'px);pointer-events:none;overflow:visible;z-index:5;';
  svg.setAttribute('viewBox', (-pad) + ' ' + (-pad) + ' ' + (ow + pad * 2) + ' ' + (oh + pad * 2));
  svg.setAttribute('preserveAspectRatio', 'none');

  if (style === 'double') {
    const gap = sw * 2.5;
    const rw = x1 - x0, rh = y1 - y0;
    [
      [x0, y0, rw, rh],
      [x0 + gap, y0 + gap, Math.max(4, rw - gap * 2), Math.max(4, rh - gap * 2)]
    ].forEach(([x, y, rw2, rh2]) => {
      const r = document.createElementNS(svgNS, 'rect');
      r.setAttribute('x', x); r.setAttribute('y', y);
      r.setAttribute('width', rw2); r.setAttribute('height', rh2);
      r.setAttribute('fill', 'none'); r.setAttribute('stroke', c); r.setAttribute('stroke-width', sw);
      svg.appendChild(r);
    });

  } else {
    // Wave or zigzag — continuous path around the full rect perimeter
    // Perimeter sampled as evenly-spaced half-steps so phase wraps cleanly

    const halfStep = style === 'wave' ? sw * 3.5 : sw * 2.5;
    const amp = sw * 0.85;

    const perimeter = (x1-x0)*2 + (y1-y0)*2;

    // Total half-steps — must be even so wave closes perfectly
    let nHalf = Math.max(4, Math.round(perimeter / halfStep));
    if (nHalf % 2 !== 0) nHalf++;
    const actualHalf = perimeter / nHalf;

    // Convert arc-length along perimeter to {x, y}
    function perimPt(s) {
      const W = x1 - x0, H = y1 - y0;
      const segs = [
        {len: W, fn: t => ({x: x0 + t*W, y: y0})},       // top
        {len: H, fn: t => ({x: x1, y: y0 + t*H})},       // right
        {len: W, fn: t => ({x: x1 - t*W, y: y1})},       // bottom
        {len: H, fn: t => ({x: x0, y: y1 - t*H})},       // left
      ];
      let rem = ((s % perimeter) + perimeter) % perimeter;
      for (const seg of segs) {
        if (rem <= seg.len) return seg.fn(rem / seg.len);
        rem -= seg.len;
      }
      return {x: x0, y: y0};
    }

    // Normal (outward) at perimeter position
    function perimNormal(s) {
      const W = x1 - x0, H = y1 - y0;
      const rem = ((s % perimeter) + perimeter) % perimeter;
      if (rem < W)            return {nx: 0,  ny: -1}; // top: up
      if (rem < W + H)        return {nx: 1,  ny:  0}; // right
      if (rem < W*2 + H)      return {nx: 0,  ny:  1}; // bottom: down
      return                         {nx: -1, ny:  0}; // left
    }

    let pathD = '';
    for (let i = 0; i <= nHalf; i++) {
      const s = actualHalf * i;
      const pt = perimPt(s);
      if (i === 0) {
        pathD += `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)} `;
      } else {
        // Midpoint of previous half-step
        const sMid = actualHalf * (i - 0.5);
        const mid = perimPt(sMid);
        const {nx, ny} = perimNormal(sMid);
        const side = ((i - 1) % 2 === 0) ? 1 : -1;
        const cpx = (mid.x + nx * amp * side).toFixed(2);
        const cpy = (mid.y + ny * amp * side).toFixed(2);
        if (style === 'wave') {
          pathD += `Q ${cpx} ${cpy} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)} `;
        } else {
          pathD += `L ${cpx} ${cpy} L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)} `;
        }
      }
    }
    pathD += 'Z';

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', c);
    path.setAttribute('stroke-width', sw);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
  }

  host.appendChild(svg);
}


function setTextElOpacity(op){
  if(!sel||sel.dataset.type!=='text')return;
  sel.dataset.elOpacity=op;
  sel.style.opacity=op;
  save();saveState();
}
function setShapeElOpacity(op){
  if(!sel||sel.dataset.type!=='shape')return;
  sel.dataset.elOpacity=op;
  // Apply opacity to inner SVG/content so backdrop-filter on el still works
  const _svg=sel.querySelector('svg');if(_svg)_svg.style.opacity=op;
  const _st=sel.querySelector('.shape-text');if(_st)_st.style.opacity=op;
  save();saveState();
}
function setShapeElOpacity(v){
  if(!sel||sel.dataset.type!=='shape')return;
  v=Math.max(0,Math.min(1,+v));
  sel.style.opacity=v===1?'':v;
  sel.dataset.elOpacity=v;
  const _d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(_d)_d.elOpacity=v;
  save();saveState();
}
function setShapeElBlur(v){
  if(!sel||sel.dataset.type!=='shape')return;
  sel.dataset.shapeBlur=v;
  // Write directly to d so saveState() always has the value
  const _d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(_d)_d.shapeBlur=+v;
  _applyShapeBlur(sel);
  save();saveState();
}
// Hover presets — см. setHoverFxPreset в 19-hover.js
function applyHoverPreset(preset){
  if(typeof setHoverFxPreset==='function') setHoverFxPreset(preset);
}
// ══════════════ PIPETTE (STYLE COPY) ══════════════
let pipetteMode=false,pipetteSrc=null,pipetteSrcSlide=0;
function togglePipetteMode(){
  if(!sel){toast('Select a target element first');return;}
  pipetteMode=!pipetteMode;
  document.querySelectorAll('.pipette-btn').forEach(b=>b.classList.toggle('active',pipetteMode));
  document.body.classList.toggle('pipette-mode',pipetteMode);
  if(pipetteMode){
    pipetteSrc=sel; // remember the element we're styling
    pipetteSrcSlide=cur; // remember which slide the destination is on
    toast('🔬 Pipette ON — click any element to copy its style','ok');
  } else {
    pipetteSrc=null;
    toast('Pipette OFF');
  }
}
function cancelPipetteMode(){
  pipetteMode=false;pipetteSrc=null;pipetteSrcSlide=0;
  document.querySelectorAll('.pipette-btn').forEach(b=>b.classList.remove('active'));
  document.body.classList.remove('pipette-mode');
}
function pipetteApply(srcEl){
  // srcEl = element clicked while in pipette mode
  // pipetteSrc = element to apply styles TO
  if(!pipetteSrc||!srcEl||srcEl===pipetteSrc)return;
  const srcType=srcEl.dataset.type;
  const dstType=pipetteSrc.dataset.type;
  // srcEl is on current slide, pipetteSrc may be on a different slide
  const srcData=slides[cur]?.els.find(e=>e.id===srcEl.dataset.id);
  const dstSlide=slides[pipetteSrcSlide]||slides[cur];
  const dstData=dstSlide.els.find(e=>e.id===pipetteSrc.dataset.id);
  if(!srcData||!dstData)return;

  if(srcType==='text'&&dstType==='text'){
    // Copy all text styles: font, color, bg, border, opacity, valign, role
    const srcC=srcEl.querySelector('.ec');
    const dstC=pipetteSrc.querySelector('.ec');
    if(srcC&&dstC){
      dstC.setAttribute('style',srcC.getAttribute('style')||'');
      dstData.cs=srcC.getAttribute('style')||'';
    }
    if(srcEl.dataset.textBg){pipetteSrc.dataset.textBg=srcEl.dataset.textBg;dstData.textBg=srcEl.dataset.textBg;}
    else{delete pipetteSrc.dataset.textBg;delete dstData.textBg;}
    if(srcEl.dataset.textBgOp!=null){pipetteSrc.dataset.textBgOp=srcEl.dataset.textBgOp;dstData.textBgOp=+srcEl.dataset.textBgOp;}
    applyTextBg(pipetteSrc);
    if(srcEl.dataset.valign){pipetteSrc.dataset.valign=srcEl.dataset.valign;dstData.valign=srcEl.dataset.valign;applyTextVAlign(pipetteSrc,srcEl.dataset.valign);}
    if(srcEl.dataset.textBorderW){pipetteSrc.dataset.textBorderW=srcEl.dataset.textBorderW;pipetteSrc.dataset.textBorderColor=srcEl.dataset.textBorderColor||'#fff';dstData.textBorderW=+srcEl.dataset.textBorderW;dstData.textBorderColor=srcEl.dataset.textBorderColor||'#fff';applyTextBorderStyle(pipetteSrc);}
    if(window._textShadowActive&&window._textShadowActive(srcEl)){
      if(srcEl.dataset.textShadowBlur!=null){pipetteSrc.dataset.textShadowBlur=srcEl.dataset.textShadowBlur;dstData.textShadowBlur=+srcEl.dataset.textShadowBlur;}
      if(srcEl.dataset.textShadowSize!=null){pipetteSrc.dataset.textShadowSize=srcEl.dataset.textShadowSize;dstData.textShadowSize=+srcEl.dataset.textShadowSize;}
      if(srcEl.dataset.textShadowW&&+srcEl.dataset.textShadowW>0&&!srcEl.dataset.textShadowBlur&&!srcEl.dataset.textShadowSize){pipetteSrc.dataset.textShadowW=srcEl.dataset.textShadowW;dstData.textShadowW=+srcEl.dataset.textShadowW;}
      pipetteSrc.dataset.textShadowColor=srcEl.dataset.textShadowColor||'#000000';
      dstData.textShadowColor=srcEl.dataset.textShadowColor||'#000000';
      if(srcData.textShadowScheme!==undefined)dstData.textShadowScheme=srcData.textShadowScheme;
      applyTextShadowStyle(pipetteSrc);
    }
    if(srcEl.dataset.elOpacity){pipetteSrc.dataset.elOpacity=srcEl.dataset.elOpacity;pipetteSrc.style.opacity=srcEl.dataset.elOpacity;dstData.elOpacity=+srcEl.dataset.elOpacity;}
    if(srcEl.dataset.rx_tl){['tl','tr','bl','br'].forEach(c=>{pipetteSrc.dataset['rx_'+c]=srcEl.dataset['rx_'+c]||0;dstData['rx_'+c]=+(srcEl.dataset['rx_'+c]||0);});pipetteSrc.dataset.rxUnit=srcEl.dataset.rxUnit||'px';dstData.rxUnit=srcEl.dataset.rxUnit||'px';applyTextRadius(pipetteSrc);}
  } else if(srcType==='shape'&&dstType==='shape'){
    // Copy all shape styles: fill, stroke, sw, rx, shadow, fillOp, gradient
    const props=['fill','stroke','sw','rx','fillOp','shadow','shadowBlur','shadowSize','shadowColor','strokeStyle','fillGrad','fillGrad2','fillGradDir'];
    props.forEach(p=>{
      // Read from srcData (source of truth) first, fall back to dataset
      const val = srcData[p] != null ? srcData[p] : srcEl.dataset[p];
      if(val != null && val !== ''){
        dstData[p] = typeof val==='string' ? (val==='true'?true:val==='false'?false:isNaN(val)?val:+val) : val;
        // fillGrad must be stored as '1'/'0' in dataset (syncProps checks === '1')
        if(p==='fillGrad') pipetteSrc.dataset[p] = (val===true||val==='true'||val==='1') ? '1' : '0';
        else pipetteSrc.dataset[p] = String(val);
      } else if(p==='fillGrad'){
        dstData.fillGrad=false; pipetteSrc.dataset.fillGrad='0';
      } else if(p==='fillGrad2'){
        delete dstData.fillGrad2; delete pipetteSrc.dataset.fillGrad2;
      } else if(p==='fillGradDir'){
        delete dstData.fillGradDir; delete pipetteSrc.dataset.fillGradDir;
      }
    });
    // Copy shape text style too
    const srcTxt=srcEl.querySelector('.shape-text');const dstTxt=pipetteSrc.querySelector('.shape-text');
    if(srcTxt&&dstTxt){dstTxt.setAttribute('style',srcTxt.getAttribute('style')||'');dstData.shapeTextCss=srcTxt.getAttribute('style')||'';}
    renderShapeEl(pipetteSrc,dstData);
    // Update UI swatches immediately without waiting for syncProps
    try{
      const _pFill=pipetteSrc.dataset.fill;
      document.getElementById('sh-fill-preview').style.background=(_pFill&&_pFill!=='none')?_pFill:'';
      document.getElementById('sh-stroke-preview').style.background=pipetteSrc.dataset.stroke||'#1d4ed8';
      document.getElementById('sh-sw').value=pipetteSrc.dataset.sw||2;
      document.getElementById('sh-fill-op').value=pipetteSrc.dataset.fillOp||1;
      const _sst=pipetteSrc.dataset.strokeStyle||'solid';
      document.querySelectorAll('.sh-stroke-style-btn').forEach(b=>b.classList.toggle('active',b.dataset.style===_sst));
      // Sync gradient UI
      const _hasGrad = dstData.fillGrad === true || dstData.fillGrad === 'true';
      const _gradChk=document.getElementById('sh-fill-grad-check');if(_gradChk)_gradChk.checked=_hasGrad;
      const _gradRow=document.getElementById('sh-fill-grad-row');if(_gradRow)_gradRow.style.display=_hasGrad?'flex':'none';
      if(_hasGrad && dstData.fillGrad2){const _p2=document.getElementById('sh-fill2-preview');if(_p2)_p2.style.background=dstData.fillGrad2;}
      if(_hasGrad && dstData.fillGradDir!=null){const _di=document.getElementById('sh-fill-grad-dir');if(_di)_di.value=dstData.fillGradDir;}
      document.getElementById('sh-shadow').checked=!!(dstData.shadow===true||dstData.shadow==='true'||pipetteSrc.dataset.shadow==='true');
      document.getElementById('sh-sb').value=dstData.shadowBlur!=null?dstData.shadowBlur:(pipetteSrc.dataset.shadowBlur||4);
      document.getElementById('sh-ss').value=dstData.shadowSize!=null?dstData.shadowSize:(pipetteSrc.dataset.shadowSize||3);
      document.getElementById('sh-sc-preview').style.background=pipetteSrc.dataset.shadowColor||'#000000';
      const _shOpts=document.getElementById('shadow-options');
      if(_shOpts)_shOpts.style.display=(dstData.shadow===true||dstData.shadow==='true'||pipetteSrc.dataset.shadow==='true')?'flex':'none';
    }catch(e){}
  } else if(srcType==='icon'&&dstType==='icon'){
    const props=['iconColor','iconSw','iconStyle','shadow','shadowBlur','shadowSize','shadowColor','elOpacity'];
    props.forEach(p=>{
      let val=srcData[p]!=null?srcData[p]:srcEl.dataset[p];
      if(val==null||val==='')return;
      if(p==='shadow'){
        val=val===true||val==='true';
        dstData.shadow=val;pipetteSrc.dataset.shadow=val?'true':'false';
      }else if(p==='iconSw'||p==='shadowBlur'||p==='shadowSize'||p==='elOpacity'){
        val=+val;dstData[p]=val;pipetteSrc.dataset[p]=String(val);
        if(p==='elOpacity'){pipetteSrc.style.opacity=val;}
      }else{
        dstData[p]=val;pipetteSrc.dataset[p]=String(val);
      }
    });
    if(dstData.iconColor) dstData.iconColorCustom=true;
    if(typeof _rebuildIconElement==='function') _rebuildIconElement(pipetteSrc,dstData);
    if(typeof syncIconProps==='function') syncIconProps(pipetteSrc,dstData);
  } else if(srcType==='image'&&dstType==='image'){
    dstData.imgBc=srcData.imgBc||srcEl.dataset.imgBc||'#ffffff';
    dstData.imgBw=srcData.imgBw!=null?+srcData.imgBw:+(srcEl.dataset.imgBw||0);
    dstData.imgRx=srcData.imgRx!=null?+srcData.imgRx:+(srcEl.dataset.imgRx||0);
    dstData.imgShadow=srcData.imgShadow===true||srcData.imgShadow==='true'||srcEl.dataset.imgShadow==='true';
    dstData.imgShadowBlur=srcData.imgShadowBlur!=null?+srcData.imgShadowBlur:+(srcEl.dataset.imgShadowBlur||15);
    dstData.imgShadowSize=srcData.imgShadowSize!=null?+srcData.imgShadowSize:+(srcEl.dataset.imgShadowSize||4);
    dstData.imgShadowColor=srcData.imgShadowColor||srcEl.dataset.imgShadowColor||'#000000';
    dstData.imgOpacity=srcData.imgOpacity!=null?+srcData.imgOpacity:+(srcEl.dataset.imgOpacity!=null?srcEl.dataset.imgOpacity:1);
    pipetteSrc.dataset.imgBc=dstData.imgBc;
    pipetteSrc.dataset.imgBw=dstData.imgBw;
    pipetteSrc.dataset.imgRx=dstData.imgRx;
    pipetteSrc.dataset.imgShadow=dstData.imgShadow?'true':'false';
    pipetteSrc.dataset.imgShadowBlur=dstData.imgShadowBlur;
    pipetteSrc.dataset.imgShadowSize=dstData.imgShadowSize;
    pipetteSrc.dataset.imgShadowColor=dstData.imgShadowColor;
    pipetteSrc.dataset.imgOpacity=dstData.imgOpacity;
    if(srcData.imgShadowColorScheme!=null){
      dstData.imgShadowColorScheme=srcData.imgShadowColorScheme;
      pipetteSrc.dataset.imgShadowColorScheme=JSON.stringify(srcData.imgShadowColorScheme);
    }else if(srcEl.dataset.imgShadowColorScheme){
      try{
        dstData.imgShadowColorScheme=JSON.parse(srcEl.dataset.imgShadowColorScheme);
        pipetteSrc.dataset.imgShadowColorScheme=srcEl.dataset.imgShadowColorScheme;
      }catch(e){}
    }else{
      delete dstData.imgShadowColorScheme;
      delete pipetteSrc.dataset.imgShadowColorScheme;
    }
    applyImgStyles(pipetteSrc,dstData);
    syncImgProps(pipetteSrc,dstData);
  } else if(srcType==='shape'&&dstType==='icon'){
    const fill=srcData.fill||srcEl.dataset.fill;
    if(fill&&fill!=='none'){dstData.iconColor=fill;pipetteSrc.dataset.iconColor=fill;dstData.iconColorCustom=true;}
    if(srcData.sw!=null||srcEl.dataset.sw!=null){
      const w=+(srcData.sw!=null?srcData.sw:srcEl.dataset.sw);
      dstData.iconSw=Math.max(0.5,Math.min(5,w));pipetteSrc.dataset.iconSw=dstData.iconSw;
    }
    ['shadow','shadowBlur','shadowSize','shadowColor'].forEach(sk=>{
      let val=srcData[sk]!=null?srcData[sk]:srcEl.dataset[sk];
      if(sk==='shadow'){val=val===true||val==='true';dstData.shadow=val;pipetteSrc.dataset.shadow=val?'true':'false';}
      else if(val!=null&&val!==''){if(sk!=='shadowColor')val=+val;dstData[sk]=val;pipetteSrc.dataset[sk]=String(val);}
    });
    if(typeof _rebuildIconElement==='function') _rebuildIconElement(pipetteSrc,dstData);
    if(typeof syncIconProps==='function') syncIconProps(pipetteSrc,dstData);
  } else if(srcType==='image'&&dstType==='icon'){
    dstData.iconColor=srcData.imgBc||srcEl.dataset.imgBc||'#3b82f6';
    pipetteSrc.dataset.iconColor=dstData.iconColor;
    dstData.iconColorCustom=true;
    dstData.shadow=srcData.imgShadow===true||srcData.imgShadow==='true'||srcEl.dataset.imgShadow==='true';
    dstData.shadowBlur=srcData.imgShadowBlur!=null?+srcData.imgShadowBlur:+(srcEl.dataset.imgShadowBlur||15);
    dstData.shadowSize=srcData.imgShadowSize!=null?+srcData.imgShadowSize:+(srcEl.dataset.imgShadowSize||4);
    dstData.shadowColor=srcData.imgShadowColor||srcEl.dataset.imgShadowColor||'#000000';
    pipetteSrc.dataset.shadow=dstData.shadow?'true':'false';
    pipetteSrc.dataset.shadowBlur=dstData.shadowBlur;
    pipetteSrc.dataset.shadowSize=dstData.shadowSize;
    pipetteSrc.dataset.shadowColor=dstData.shadowColor;
    if(typeof _rebuildIconElement==='function') _rebuildIconElement(pipetteSrc,dstData);
    if(typeof syncIconProps==='function') syncIconProps(pipetteSrc,dstData);
  } else if(srcType==='shape'&&dstType==='image'){
    if(srcData.stroke||srcEl.dataset.stroke){
      const c=srcData.stroke||srcEl.dataset.stroke;
      dstData.imgBc=c;pipetteSrc.dataset.imgBc=c;
    }
    if(srcData.sw!=null||srcEl.dataset.sw!=null){
      const w=+(srcData.sw!=null?srcData.sw:srcEl.dataset.sw);
      dstData.imgBw=w;pipetteSrc.dataset.imgBw=w;
    }
    if(srcData.rx!=null||srcEl.dataset.rx!=null){
      const r=+(srcData.rx!=null?srcData.rx:srcEl.dataset.rx);
      dstData.imgRx=r;pipetteSrc.dataset.imgRx=r;
    }
    ['shadow','shadowBlur','shadowSize','shadowColor'].forEach((sk,i)=>{
      const dk=['imgShadow','imgShadowBlur','imgShadowSize','imgShadowColor'][i];
      let val=srcData[sk]!=null?srcData[sk]:srcEl.dataset[sk];
      if(sk==='shadow'){val=val===true||val==='true';dstData.imgShadow=val;pipetteSrc.dataset.imgShadow=val?'true':'false';}
      else if(val!=null&&val!==''){if(sk!=='shadowColor')val=+val;dstData[dk]=val;pipetteSrc.dataset[dk]=String(val);}
    });
    applyImgStyles(pipetteSrc,dstData);
    syncImgProps(pipetteSrc,dstData);
  } else if(srcType==='image'&&dstType==='shape'){
    dstData.stroke=srcData.imgBc||srcEl.dataset.imgBc||'#1d4ed8';
    dstData.sw=srcData.imgBw!=null?+srcData.imgBw:+(srcEl.dataset.imgBw||0);
    dstData.rx=srcData.imgRx!=null?+srcData.imgRx:+(srcEl.dataset.imgRx||0);
    dstData.shadow=srcData.imgShadow===true||srcData.imgShadow==='true'||srcEl.dataset.imgShadow==='true';
    dstData.shadowBlur=srcData.imgShadowBlur!=null?+srcData.imgShadowBlur:+(srcEl.dataset.imgShadowBlur||15);
    dstData.shadowSize=srcData.imgShadowSize!=null?+srcData.imgShadowSize:+(srcEl.dataset.imgShadowSize||4);
    dstData.shadowColor=srcData.imgShadowColor||srcEl.dataset.imgShadowColor||'#000000';
    pipetteSrc.dataset.stroke=dstData.stroke;
    pipetteSrc.dataset.sw=dstData.sw;
    pipetteSrc.dataset.rx=dstData.rx;
    pipetteSrc.dataset.shadow=dstData.shadow?'true':'false';
    pipetteSrc.dataset.shadowBlur=dstData.shadowBlur;
    pipetteSrc.dataset.shadowSize=dstData.shadowSize;
    pipetteSrc.dataset.shadowColor=dstData.shadowColor;
    if(srcData.imgShadowColorScheme!=null){
      dstData.shadowColorScheme=srcData.imgShadowColorScheme;
      pipetteSrc.dataset.shadowColorScheme=JSON.stringify(srcData.imgShadowColorScheme);
    }else if(srcEl.dataset.imgShadowColorScheme){
      try{
        dstData.shadowColorScheme=JSON.parse(srcEl.dataset.imgShadowColorScheme);
        pipetteSrc.dataset.shadowColorScheme=srcEl.dataset.imgShadowColorScheme;
      }catch(e){}
    }else{
      delete dstData.shadowColorScheme;
      delete pipetteSrc.dataset.shadowColorScheme;
    }
    renderShapeEl(pipetteSrc,dstData);
    try{
      document.getElementById('sh-stroke-preview').style.background=dstData.stroke;
      const _shx=document.getElementById('sh-stroke-hex');if(_shx)_shx.value=dstData.stroke;
      document.getElementById('sh-sw').value=dstData.sw;
      document.getElementById('sh-rx').value=dstData.rx;
      document.getElementById('sh-shadow').checked=!!dstData.shadow;
      document.getElementById('sh-sb').value=dstData.shadowBlur;
      document.getElementById('sh-ss').value=dstData.shadowSize;
      document.getElementById('sh-sc-preview').style.background=dstData.shadowColor;
      const _shOpts=document.getElementById('shadow-options');if(_shOpts)_shOpts.style.display=dstData.shadow?'flex':'none';
    }catch(e){}
  } else if(srcType==='icon'&&dstType==='shape'){
    dstData.fill=srcData.iconColor||srcEl.dataset.iconColor||'#3b82f6';
    pipetteSrc.dataset.fill=dstData.fill;
    ['shadow','shadowBlur','shadowSize','shadowColor'].forEach(sk=>{
      let val=srcData[sk]!=null?srcData[sk]:srcEl.dataset[sk];
      if(sk==='shadow'){val=val===true||val==='true';dstData.shadow=val;pipetteSrc.dataset.shadow=val?'true':'false';}
      else if(val!=null&&val!==''){if(sk!=='shadowColor')val=+val;dstData[sk]=val;pipetteSrc.dataset[sk]=String(val);}
    });
    renderShapeEl(pipetteSrc,dstData);
    try{
      document.getElementById('sh-fill-preview').style.background=dstData.fill;
      const _fh=document.getElementById('sh-fill-hex');if(_fh)_fh.value=dstData.fill;
      document.getElementById('sh-shadow').checked=!!dstData.shadow;
      document.getElementById('sh-sb').value=dstData.shadowBlur!=null?dstData.shadowBlur:8;
      document.getElementById('sh-ss').value=dstData.shadowSize!=null?dstData.shadowSize:3;
      document.getElementById('sh-sc-preview').style.background=dstData.shadowColor||'#000000';
      const _shOpts=document.getElementById('shadow-options');if(_shOpts)_shOpts.style.display=dstData.shadow?'flex':'none';
    }catch(e){}
  } else if(srcType==='text'&&dstType==='icon'){
    const srcC=srcEl.querySelector('.ec');
    if(srcC){
      const cs=srcC.getAttribute('style')||'';
      const m=cs.match(/(?:^|;|\s)color:(#[0-9a-fA-F]{3,8})/);
      if(m){dstData.iconColor=m[1];pipetteSrc.dataset.iconColor=m[1];dstData.iconColorCustom=true;}
    }
    if(typeof _rebuildIconElement==='function') _rebuildIconElement(pipetteSrc,dstData);
    if(typeof syncIconProps==='function') syncIconProps(pipetteSrc,dstData);
  } else if(srcType==='text'&&dstType==='shape'){
    // Cross-type: copy just color to fill
    const srcC=srcEl.querySelector('.ec');
    if(srcC){const cs=srcC.getAttribute('style')||'';const m=cs.match(/(?:^|;|\s)color:(#[0-9a-fA-F]{3,8})/);if(m){dstData.fill=m[1];pipetteSrc.dataset.fill=m[1];renderShapeEl(pipetteSrc,dstData);}}
  } else if(srcType==='shape'&&dstType==='text'){
    // Cross-type: copy fill color to text color
    if(srcEl.dataset.fill){const c=srcEl.dataset.fill;pipetteSrc.querySelector('.ec')&&setTS('color',c);try{document.getElementById('p-col').value=c;document.getElementById('p-hex').value=c;}catch(e){}}
  }
  // Copy hover effect regardless
  if(srcEl.dataset.hoverFx&&srcEl.dataset.hoverFx!=='{}'){
    pipetteSrc.dataset.hoverFx=srcEl.dataset.hoverFx;
    dstData.hoverFx=JSON.parse(srcEl.dataset.hoverFx);
    applyHoverFxEditor(pipetteSrc,dstData.hoverFx);
  }
  // If source is on a different slide, go back to destination slide
  const dstEl=pipetteSrc;
  const dstSl=pipetteSrcSlide;
  cancelPipetteMode();
  if(dstSl !== cur && typeof pickSlide === 'function') {
    pickSlide(dstSl);
    setTimeout(() => {
      save(); drawThumbs(); saveState();
      const destEl = document.querySelector(`.el[data-id="${dstEl?.dataset?.id}"]`) || dstEl;
      if(destEl && typeof pick === 'function') pick(destEl);
      toast('✓ Стиль скопирован', 'ok');
    }, 50);
  } else {
    save(); drawThumbs(); saveState();
    if(typeof pick==='function') pick(dstEl);
    toast('✓ Стиль скопирован', 'ok');
  }
}

// ══════════════ TEXT CORNER RADIUS ══════════════
let textRxUnit='px'; // 'px' or '%'
function _textDimRef(el, kind){
  const w=parseInt(el.style.width)||100;
  const h=parseInt(el.style.height)||100;
  return kind==='rx'?Math.min(w,h):w;
}
function _convertTextDimUnit(el, kind, fromU, toU){
  if(!el||fromU===toU)return;
  const ref=_textDimRef(el,kind);
  if(!ref)return;
  const sides=kind==='rx'?['tl','tr','bl','br']:['t','r','b','l'];
  const max=toU==='%'?100:(kind==='rx'?999:500);
  const pref=kind==='rx'?'rx_':'pad_';
  sides.forEach(s=>{
    let v=+(el.dataset[pref+s]||0);
    if(fromU==='px'&&toU==='%')v=Math.round(v/ref*100);
    else if(fromU==='%'&&toU==='px')v=Math.round(v/100*ref);
    v=Math.max(0,Math.min(max,v));
    el.dataset[pref+s]=v;
  });
}
function _dimInputMax(unit,kind){return unit==='%'?100:(kind==='rx'?999:500);}
function setTextRxUnit(u){
  if(sel&&sel.dataset.type==='text'){
    const oldU=sel.dataset.rxUnit||textRxUnit||'px';
    if(oldU!==u){
      _convertTextDimUnit(sel,'rx',oldU,u);
      sel.dataset.rxUnit=u;
      applyTextRadius(sel);
      save();drawThumbs();saveState();
    }else sel.dataset.rxUnit=u;
  }
  textRxUnit=u;
  document.getElementById('rx-unit-px').classList.toggle('active',u==='px');
  document.getElementById('rx-unit-pct').classList.toggle('active',u==='%');
  if(sel)syncTextRadiusUI();
}
function setTextRadius(corner,val,opts){
  opts=opts||{};
  if(!sel||sel.dataset.type!=='text')return;
  const linked=document.getElementById('rx-linked')&&document.getElementById('rx-linked').checked;
  const u=sel.dataset.rxUnit||textRxUnit||'px';
  const max=_dimInputMax(u,'rx');
  val=Math.max(0,Math.min(max,+val||0));
  if(linked){
    ['tl','tr','bl','br'].forEach(c=>{
      sel.dataset['rx_'+c]=val;
      const inp=document.getElementById('p-rx-'+c);if(inp)inp.value=val;
    });
  } else {
    sel.dataset['rx_'+corner]=val;
    const inp=document.getElementById('p-rx-'+corner);if(inp)inp.value=val;
  }
  sel.dataset.rxUnit=u;
  applyTextRadius(sel);
  _syncRxBoxPreview();
  if(!opts.silent){ save();drawThumbs();saveState(); }
}
function applyTextRadius(el){
  const u=el.dataset.rxUnit||'px';
  const tl=el.dataset.rx_tl||0,tr=el.dataset.rx_tr||0,bl=el.dataset.rx_bl||0,br=el.dataset.rx_br||0;
  const rx=`${tl}${u} ${tr}${u} ${br}${u} ${bl}${u}`;
  const body=el.querySelector('._text_body');
  if(body){body.style.borderRadius=rx;body.style.overflow='hidden';}
  const ec=el.querySelector('.ec');
  if(ec){ec.style.borderRadius=rx;ec.style.overflow='hidden';}
  const bg=el.querySelector('.el-bg-layer');
  if(bg) bg.style.borderRadius=rx;
  el.style.borderRadius=rx;
  el.style.overflow='visible';
  if(window._textShadowActive&&window._textShadowActive(el.dataset)) applyTextShadowStyle(el);
  if(typeof applyTextBlockShadowStyle==='function') applyTextBlockShadowStyle(el);
  if(+(el.dataset.textBorderW||0)>0&&typeof applyTextBorderStyle==='function') applyTextBorderStyle(el);
}
function _rxReadVal(c){
  if(sel&&sel.dataset.type==='text') return +(sel.dataset['rx_'+c]||0);
  const inp=document.getElementById('p-rx-'+c);
  return inp?+(inp.value||0):0;
}
function _syncRxBoxPreview(){
  const prev=document.getElementById('rx-box-preview');
  if(!prev)return;
  const u=(sel&&sel.dataset.type==='text'?(sel.dataset.rxUnit||textRxUnit):textRxUnit)||'px';
  const max=_dimInputMax(u,'rx');
  const w=prev.clientWidth||1, h=prev.clientHeight||1;
  const maxVis=Math.max(8, Math.min(w,h)/2 - 2);
  const toVis=function(v){
    return Math.max(0, Math.min(maxVis, (Math.max(0,+v||0)/Math.max(1,max))*maxVis));
  };
  const tl=_rxReadVal('tl'),tr=_rxReadVal('tr'),bl=_rxReadVal('bl'),br=_rxReadVal('br');
  const vtl=toVis(tl),vtr=toVis(tr),vbl=toVis(bl),vbr=toVis(br);
  prev.style.borderRadius=vtl+'px '+vtr+'px '+vbr+'px '+vbl+'px';
  const place=function(corner,x,y){
    const el=prev.querySelector('.rx-handle.'+corner);
    if(!el)return;
    el.style.left=x+'px';
    el.style.top=y+'px';
  };
  // Маркер на дуге угла (внутрь от угла)
  place('tl', vtl, vtl);
  place('tr', w - vtr, vtr);
  place('bl', vbl, h - vbl);
  place('br', w - vbr, h - vbr);
}

let _rxDrag=null;
function _rxDragOnMove(e){
  if(!_rxDrag)return;
  e.preventDefault();
  const prev=_rxDrag.prev;
  const rect=prev.getBoundingClientRect();
  const x=Math.max(0, Math.min(rect.width, (e.clientX!=null?e.clientX:_rxDrag.lastX)-rect.left));
  const y=Math.max(0, Math.min(rect.height, (e.clientY!=null?e.clientY:_rxDrag.lastY)-rect.top));
  if(e.clientX!=null){ _rxDrag.lastX=e.clientX; _rxDrag.lastY=e.clientY; }
  const c=_rxDrag.corner;
  let dist=0;
  if(c==='tl') dist=Math.min(x,y);
  else if(c==='tr') dist=Math.min(rect.width-x, y);
  else if(c==='bl') dist=Math.min(x, rect.height-y);
  else dist=Math.min(rect.width-x, rect.height-y);
  const maxVis=Math.max(8, Math.min(rect.width,rect.height)/2 - 2);
  const u=(sel&&sel.dataset.rxUnit)||textRxUnit||'px';
  const max=_dimInputMax(u,'rx');
  const val=Math.round(Math.max(0, Math.min(max, (dist/maxVis)*max)));
  setTextRadius(c, val, {silent:true});
}
function _rxDragOnUp(){
  if(!_rxDrag)return;
  const h=_rxDrag.handle;
  if(h) h.classList.remove('dragging');
  document.removeEventListener('mousemove', _rxDragOnMove, true);
  document.removeEventListener('mouseup', _rxDragOnUp, true);
  _rxDrag=null;
  if(typeof save==='function') save();
  if(typeof drawThumbs==='function') drawThumbs();
  if(typeof saveState==='function') saveState();
}
function _rxHandleDown(e){
  if(!sel||sel.dataset.type!=='text')return;
  const handle=e.target.closest&&e.target.closest('.rx-handle');
  if(!handle)return;
  e.preventDefault();
  e.stopPropagation();
  const prev=document.getElementById('rx-box-preview');
  if(!prev)return;
  if(typeof pushUndo==='function') pushUndo();
  handle.classList.add('dragging');
  _rxDrag={corner:handle.dataset.corner, prev:prev, handle:handle, lastX:e.clientX, lastY:e.clientY};
  document.addEventListener('mousemove', _rxDragOnMove, true);
  document.addEventListener('mouseup', _rxDragOnUp, true);
  _rxDragOnMove(e);
}
function _initRxBoxHandles(){
  const prev=document.getElementById('rx-box-preview');
  if(!prev||prev._rxBound)return;
  prev._rxBound=true;
  prev.addEventListener('mousedown', _rxHandleDown);
  window.addEventListener('resize', function(){ _syncRxBoxPreview(); });
}
function syncTextRadiusUI(){
  if(!sel||sel.dataset.type!=='text')return;
  const u=sel.dataset.rxUnit||textRxUnit||'px';
  textRxUnit=u;
  const max=_dimInputMax(u,'rx');
  ['tl','tr','bl','br'].forEach(c=>{
    const inp=document.getElementById('p-rx-'+c);
    if(inp){inp.value=sel.dataset['rx_'+c]||0;inp.min=0;inp.max=max;}
  });
  document.getElementById('rx-unit-px').classList.toggle('active',u==='px');
  document.getElementById('rx-unit-pct').classList.toggle('active',u==='%');
  ['tl','tr','bl','br'].forEach(c=>{
    const inp=document.getElementById('p-rx-'+c);
    if(inp&&typeof refreshNumScrubber==='function')refreshNumScrubber(inp);
  });
  _initRxBoxHandles();
  _syncRxBoxPreview();
}
window._syncRxBoxPreview=_syncRxBoxPreview;

// ══════════════ PADDING WITH UNIT + LOCK ══════════════
let textPadUnit = 'px';
function setTextPadUnit(u){
  if(sel&&sel.dataset.type==='text'){
    const oldU=sel.dataset.padUnit||textPadUnit||'px';
    if(oldU!==u){
      _convertTextDimUnit(sel,'pad',oldU,u);
      sel.dataset.padUnit=u;
      applyTextPad(sel);
      save();drawThumbs();saveState();
    }else sel.dataset.padUnit=u;
  }
  textPadUnit=u;
  document.getElementById('pad-unit-px').classList.toggle('active', u==='px');
  document.getElementById('pad-unit-pct').classList.toggle('active', u==='%');
  if(sel) syncTextPadUI();
}
function setTextPad(side, val, opts){
  opts=opts||{};
  if(!sel||sel.dataset.type!=='text')return;
  const linked = document.getElementById('pad-linked')&&document.getElementById('pad-linked').checked;
  const u=sel.dataset.padUnit||textPadUnit||'px';
  const max=_dimInputMax(u,'pad');
  val=Math.max(0,Math.min(max,+val||0));
  if(linked){
    ['t','r','b','l'].forEach(s=>{
      sel.dataset['pad_'+s] = val;
      const inp=document.getElementById('p-pad-'+s); if(inp) inp.value=val;
    });
  } else {
    sel.dataset['pad_'+side] = val;
    const inp=document.getElementById('p-pad-'+side); if(inp) inp.value=val;
  }
  sel.dataset.padUnit=u;
  applyTextPad(sel);
  _syncPadBoxPreview();
  if(!opts.silent){ save(); drawThumbs(); saveState(); }
}
function applyTextPad(el){
  if(!el) return;
  // Без pad_* в dataset не трогаем — иначе затрём padding из cs дефолтами
  if(el.dataset.pad_t===undefined&&el.dataset.pad_r===undefined&&
     el.dataset.pad_b===undefined&&el.dataset.pad_l===undefined) return;
  const u = el.dataset.padUnit || textPadUnit || 'px';
  const t=el.dataset.pad_t!==undefined&&el.dataset.pad_t!==''?+el.dataset.pad_t:0;
  const r=el.dataset.pad_r!==undefined&&el.dataset.pad_r!==''?+el.dataset.pad_r:0;
  const b=el.dataset.pad_b!==undefined&&el.dataset.pad_b!==''?+el.dataset.pad_b:0;
  const l=el.dataset.pad_l!==undefined&&el.dataset.pad_l!==''?+el.dataset.pad_l:0;
  const padStr = `${t}${u} ${r}${u} ${b}${u} ${l}${u}`;
  const c2 = el.querySelector('.tel')||el.querySelector('.ec'); if(!c2) return;
  let cs = c2.getAttribute('style')||'';
  cs = cs.replace(/\bpadding\s*:[^;]+;?/gi,'').trim();
  cs = (cs.endsWith(';')||!cs ? cs : cs+';') + 'padding:'+padStr+';';
  c2.setAttribute('style', cs);
  if(window._textShadowActive&&window._textShadowActive(el.dataset)&&typeof applyTextShadowStyle==='function') applyTextShadowStyle(el);
}
function _padReadVal(s){
  if(sel&&sel.dataset.type==='text'){
    const v=sel.dataset['pad_'+s];
    if(v!==undefined&&v!=='') return +v;
  }
  const inp=document.getElementById('p-pad-'+s);
  return inp?+(inp.value||0):0;
}
function _syncPadBoxPreview(){
  const prev=document.getElementById('pad-box-preview');
  const inner=document.getElementById('pad-box-inner');
  if(!prev)return;
  const u=(sel&&sel.dataset.type==='text'?(sel.dataset.padUnit||textPadUnit):textPadUnit)||'px';
  const max=_dimInputMax(u,'pad');
  const w=prev.clientWidth||1, h=prev.clientHeight||1;
  const maxVisX=Math.max(8, w/2 - 4);
  const maxVisY=Math.max(8, h/2 - 4);
  // px — 1:1 до половины превью; % — доля половины
  const toVisX=function(v){
    v=Math.max(0,+v||0);
    if(u==='%') return Math.max(0, Math.min(maxVisX, v/100*maxVisX));
    return Math.max(0, Math.min(maxVisX, v));
  };
  const toVisY=function(v){
    v=Math.max(0,+v||0);
    if(u==='%') return Math.max(0, Math.min(maxVisY, v/100*maxVisY));
    return Math.max(0, Math.min(maxVisY, v));
  };
  const vt=toVisY(_padReadVal('t')), vr=toVisX(_padReadVal('r'));
  const vb=toVisY(_padReadVal('b')), vl=toVisX(_padReadVal('l'));
  if(inner){
    inner.style.top=vt+'px';
    inner.style.right=vr+'px';
    inner.style.bottom=vb+'px';
    inner.style.left=vl+'px';
  }
  const place=function(side,x,y){
    const el=prev.querySelector('.pad-handle.'+side);
    if(!el)return;
    el.style.left=x+'px';
    el.style.top=y+'px';
  };
  place('t', w/2, vt);
  place('r', w - vr, h/2);
  place('b', w/2, h - vb);
  place('l', vl, h/2);
}

let _padDrag=null;
function _padDragOnMove(e){
  if(!_padDrag)return;
  e.preventDefault();
  const prev=_padDrag.prev;
  const rect=prev.getBoundingClientRect();
  const x=Math.max(0, Math.min(rect.width, (e.clientX!=null?e.clientX:_padDrag.lastX)-rect.left));
  const y=Math.max(0, Math.min(rect.height, (e.clientY!=null?e.clientY:_padDrag.lastY)-rect.top));
  if(e.clientX!=null){ _padDrag.lastX=e.clientX; _padDrag.lastY=e.clientY; }
  const s=_padDrag.side;
  let dist=0, maxVis=0;
  if(s==='t'){ dist=y; maxVis=Math.max(8, rect.height/2 - 4); }
  else if(s==='b'){ dist=rect.height-y; maxVis=Math.max(8, rect.height/2 - 4); }
  else if(s==='l'){ dist=x; maxVis=Math.max(8, rect.width/2 - 4); }
  else { dist=rect.width-x; maxVis=Math.max(8, rect.width/2 - 4); }
  const u=(sel&&sel.dataset.padUnit)||textPadUnit||'px';
  const max=_dimInputMax(u,'pad');
  let val;
  if(u==='%') val=Math.round(Math.max(0, Math.min(max, (dist/maxVis)*100)));
  else val=Math.round(Math.max(0, Math.min(max, dist)));
  setTextPad(s, val, {silent:true});
}
function _padDragOnUp(){
  if(!_padDrag)return;
  const h=_padDrag.handle;
  if(h) h.classList.remove('dragging');
  document.removeEventListener('mousemove', _padDragOnMove, true);
  document.removeEventListener('mouseup', _padDragOnUp, true);
  _padDrag=null;
  if(typeof save==='function') save();
  if(typeof drawThumbs==='function') drawThumbs();
  if(typeof saveState==='function') saveState();
}
function _padHandleDown(e){
  if(!sel||sel.dataset.type!=='text')return;
  const handle=e.target.closest&&e.target.closest('.pad-handle');
  if(!handle)return;
  e.preventDefault();
  e.stopPropagation();
  const prev=document.getElementById('pad-box-preview');
  if(!prev)return;
  if(typeof pushUndo==='function') pushUndo();
  handle.classList.add('dragging');
  _padDrag={side:handle.dataset.side, prev:prev, handle:handle, lastX:e.clientX, lastY:e.clientY};
  document.addEventListener('mousemove', _padDragOnMove, true);
  document.addEventListener('mouseup', _padDragOnUp, true);
  _padDragOnMove(e);
}
function _initPadBoxHandles(){
  const prev=document.getElementById('pad-box-preview');
  if(!prev||prev._padBound)return;
  prev._padBound=true;
  prev.addEventListener('mousedown', _padHandleDown);
  window.addEventListener('resize', function(){ _syncPadBoxPreview(); });
}
function syncTextPadUI(){
  if(!sel||sel.dataset.type!=='text') return;
  const u = sel.dataset.padUnit || textPadUnit || 'px';
  textPadUnit=u;
  const max=_dimInputMax(u,'pad');
  document.getElementById('pad-unit-px')?.classList.toggle('active', u==='px');
  document.getElementById('pad-unit-pct')?.classList.toggle('active', u==='%');
  ['t','r','b','l'].forEach(s=>{
    const inp=document.getElementById('p-pad-'+s);
    if(inp){inp.value = sel.dataset['pad_'+s]!==undefined?sel.dataset['pad_'+s]:0;inp.min=0;inp.max=max;}
    if(inp&&typeof refreshNumScrubber==='function')refreshNumScrubber(inp);
  });
  _initPadBoxHandles();
  _syncPadBoxPreview();
}
window._syncPadBoxPreview=_syncPadBoxPreview;
window._initPadBoxHandles=_initPadBoxHandles;
