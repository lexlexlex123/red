// ══════════════ TEXT BORDER & OPACITY ══════════════
function setTextBorder(prop,val,schemeRef){
  if(!sel||sel.dataset.type!=='text')return;
  if(prop==='color'){
    sel.dataset.textBorderColor=val;
    const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d) d.borderScheme = (schemeRef !== undefined ? (schemeRef || null) : d.borderScheme);
  }
  if(prop==='width'){sel.dataset.textBorderW=val;}
  if(prop==='style'){sel.dataset.textBorderStyle=val;}
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
window._syncTextShadowLayout=function(el,d){
  if(!el) return 0;
  const body=el.querySelector('._text_body');
  const tel=el.querySelector('.tel')||el.querySelector('.ec');
  const content=window._textShadowContentNode(el);
  const on=d&&window._textShadowActive(d);
  if(!on){
    if(typeof window._unwrapTextShadowInner==='function') window._unwrapTextShadowInner(el);
    if(body){
      body.style.overflow='';
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
  if(body){
    body.style.overflow='visible';
    body.style.top=body.style.left=body.style.right=body.style.bottom='';
    body.style.padding='';
  }
  if(tel) tel.style.overflow='visible';
  if(content&&content!==tel) content.style.overflow='visible';
  return pad;
};
window._applyTextShadowFilter=function(el,d){
  const tel=el&&(el.querySelector('.tel')||el.querySelector('.ec'));
  if(tel) tel.style.filter='';
  if(!el||!window._textShadowActive(d)){
    const content=window._textShadowContentNode(el);
    if(content) content.style.filter='';
    window._syncTextShadowLayout(el,null);
    if(el&&el.dataset.id&&typeof window._ensureShadowFilterHost==='function'){
      const old=window._ensureShadowFilterHost().querySelector('#txtsh_'+el.dataset.id);
      if(old) old.remove();
    }
    return;
  }
  if(typeof window._ensureShadowFilterHost!=='function'||typeof window._shadowFilterInner!=='function') return;
  const content=typeof window._ensureTextShadowInner==='function'?window._ensureTextShadowInner(el):window._textShadowContentNode(el);
  if(!content) return;
  content.style.textShadow='';
  const {ss,sb,sc}=window._textShadowParams(d);
  const fid='txtsh_'+(el.dataset.id||'x');
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
  content.style.filter='url(#'+fid+')';
  window._syncTextShadowLayout(el,d);
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
function resetTextShadow(){
  if(!sel||sel.dataset.type!=='text') return;
  delete sel.dataset.textShadowBlur;
  delete sel.dataset.textShadowSize;
  delete sel.dataset.textShadowW;
  applyTextShadowStyle(sel);
  syncTextShadowUI(sel);
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
function applyTextShadowStyle(el){
  const d={
    textShadowSize:el.dataset.textShadowSize,
    textShadowBlur:el.dataset.textShadowBlur,
    textShadowColor:el.dataset.textShadowColor,
    textShadowW:el.dataset.textShadowW
  };
  if(typeof window._applyTextShadowFilter==='function') window._applyTextShadowFilter(el,d);
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
  if(typeof applyTextBorderStyle==='function')applyTextBorderStyle(el);
  if(el.dataset.valign&&typeof applyTextVAlign==='function')applyTextVAlign(el,el.dataset.valign);
  else if(typeof applyTextVAlign==='function')applyTextVAlign(el,'top');
  if(typeof applyTextBg==='function')applyTextBg(el);
  if(typeof applyTextColorGrad==='function')applyTextColorGrad(el);
  if(window._textShadowActive&&window._textShadowActive(el.dataset)&&typeof applyTextShadowStyle==='function')applyTextShadowStyle(el);
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
// ══════════════ HOVER PRESETS ══════════════
function applyHoverPreset(preset){
  if(!sel)return;
  if(preset==='none'){
    sel.dataset.hoverFx='{}';applyHoverFxEditor(sel,{});syncHoverFxUI();save();saveState();return;
  }
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  let fx=normalizeHoverFx(sel,{},d);
  fx.enabled=true;fx.preset=preset;fx._edited=true;
  fx.hover=JSON.parse(JSON.stringify(fx.base));
  if(preset==='lift'){fx.hover.scale=1.06;fx.hover.shadowBlur=16;fx.hover.shadowColor='rgba(0,0,0,0.4)';fx.hover.y=(fx.base.y||0)-4;fx.dur=0.3;}
  else if(preset==='lighter'){fx.dur=0.3;}
  else if(preset==='darker'){fx.dur=0.3;}
  else if(preset==='glow'){fx.hover.scale=1.04;fx.hover.shadowBlur=24;fx.hover.shadowColor='rgba(99,102,241,0.7)';fx.hover.color='rgba(99,102,241,0.7)';fx.dur=0.3;}
  sel.dataset.hoverFx=JSON.stringify(fx);
  applyHoverFxEditor(sel,fx);syncHoverFxUI();
  save();saveState();
  toast('Hover preset: '+preset,'ok');
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
function setTextRxUnit(u){
  textRxUnit=u;
  document.getElementById('rx-unit-px').classList.toggle('active',u==='px');
  document.getElementById('rx-unit-pct').classList.toggle('active',u==='%');
  if(sel)syncTextRadiusUI();
}
function setTextRadius(corner,val){
  if(!sel||sel.dataset.type!=='text')return;
  const linked=document.getElementById('rx-linked').checked;
  const u=textRxUnit;
  if(linked){
    ['tl','tr','bl','br'].forEach(c=>{
      sel.dataset['rx_'+c]=val;
      const inp=document.getElementById('p-rx-'+c);if(inp)inp.value=val;
    });
  } else {
    sel.dataset['rx_'+corner]=val;
  }
  applyTextRadius(sel);
  save();drawThumbs();saveState();
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
  if(+(el.dataset.textBorderW||0)>0&&typeof applyTextBorderStyle==='function') applyTextBorderStyle(el);
}
function syncTextRadiusUI(){
  if(!sel||sel.dataset.type!=='text')return;
  const u=sel.dataset.rxUnit||textRxUnit;
  ['tl','tr','bl','br'].forEach(c=>{
    const inp=document.getElementById('p-rx-'+c);
    if(inp)inp.value=sel.dataset['rx_'+c]||0;
  });
  document.getElementById('rx-unit-px').classList.toggle('active',u==='px');
  document.getElementById('rx-unit-pct').classList.toggle('active',u==='%');
}

// ══════════════ PADDING WITH UNIT + LOCK ══════════════
let textPadUnit = 'px';
function setTextPadUnit(u){
  textPadUnit = u;
  document.getElementById('pad-unit-px').classList.toggle('active', u==='px');
  document.getElementById('pad-unit-pct').classList.toggle('active', u==='%');
  if(sel) syncTextPadUI();
}
function setTextPad(side, val){
  if(!sel||sel.dataset.type!=='text')return;
  const linked = document.getElementById('pad-linked').checked;
  if(linked){
    ['t','r','b','l'].forEach(s=>{
      sel.dataset['pad_'+s] = val;
      const inp=document.getElementById('p-pad-'+s); if(inp) inp.value=val;
    });
  } else {
    sel.dataset['pad_'+side] = val;
  }
  applyTextPad(sel);
  save(); drawThumbs(); saveState();
}
function applyTextPad(el){
  const u = el.dataset.padUnit || textPadUnit || 'px';
  const t=el.dataset.pad_t||el.dataset.pad_t===0?el.dataset.pad_t:6;
  const r=el.dataset.pad_r||el.dataset.pad_r===0?el.dataset.pad_r:8;
  const b=el.dataset.pad_b||el.dataset.pad_b===0?el.dataset.pad_b:6;
  const l=el.dataset.pad_l||el.dataset.pad_l===0?el.dataset.pad_l:8;
  const padStr = `${t}${u} ${r}${u} ${b}${u} ${l}${u}`;
  const c2 = el.querySelector('.tel')||el.querySelector('.ec'); if(!c2) return;
  let cs = c2.getAttribute('style')||'';
  cs = cs.replace(/\bpadding\s*:[^;]+;?/gi,'').trim();
  cs = (cs.endsWith(';')||!cs ? cs : cs+';') + 'padding:'+padStr+';';
  c2.setAttribute('style', cs);
  if(window._textShadowActive&&window._textShadowActive(el.dataset)&&typeof applyTextShadowStyle==='function') applyTextShadowStyle(el);
}
function syncTextPadUI(){
  if(!sel||sel.dataset.type!=='text') return;
  const u = sel.dataset.padUnit || textPadUnit;
  document.getElementById('pad-unit-px')?.classList.toggle('active', u==='px');
  document.getElementById('pad-unit-pct')?.classList.toggle('active', u==='%');
  ['t','r','b','l'].forEach(s=>{
    const inp=document.getElementById('p-pad-'+s);
    if(inp) inp.value = sel.dataset['pad_'+s]??({t:6,r:8,b:6,l:8}[s]);
  });
}
