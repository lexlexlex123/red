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
function applyTextBorderStyle(el){
  const w=+(el.dataset.textBorderW||0);
  const c=el.dataset.textBorderColor||'#ffffff';
  const style=el.dataset.textBorderStyle||'solid';
  // Remove old SVG overlay if present
  const oldSvg=el.querySelector('.text-border-svg');if(oldSvg)oldSvg.remove();
  if(w<=0){el.style.outline='';return;}
  if(style==='wave'||style==='zigzag'||style==='double'){
    // Complex styles via SVG overlay
    el.style.outline='';
    _applyTextBorderSVG(el,w,c,style);
  } else {
    // Simple CSS outline styles
    const cssStyle={solid:'solid',dashed:'dashed',dotted:'dotted'}[style]||'solid';
    el.style.outline=w+'px '+cssStyle+' '+c;
    el.style.outlineOffset='0px';
  }
}
function _applyTextBorderSVG(el, w, c, style) {
  const ow = parseFloat(el.style.width)  || 200;
  const oh = parseFloat(el.style.height) || 100;
  const sw = +(el.dataset.textBorderW || 2);
  const hm = sw / 2; // stroke sits on this inset

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.classList.add('text-border-svg');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:5;';
  svg.setAttribute('viewBox', `0 0 ${ow} ${oh}`);
  svg.setAttribute('preserveAspectRatio', 'none');

  if (style === 'double') {
    const gap = sw * 2.5;
    [
      [hm, hm, ow - sw, oh - sw],
      [hm + gap, hm + gap, Math.max(4, ow - sw - gap*2), Math.max(4, oh - sw - gap*2)]
    ].forEach(([x, y, rw, rh]) => {
      const r = document.createElementNS(svgNS, 'rect');
      r.setAttribute('x', x); r.setAttribute('y', y);
      r.setAttribute('width', rw); r.setAttribute('height', rh);
      r.setAttribute('fill', 'none'); r.setAttribute('stroke', c); r.setAttribute('stroke-width', sw);
      svg.appendChild(r);
    });

  } else {
    // Wave or zigzag — continuous path around the full rect perimeter
    // Perimeter sampled as evenly-spaced half-steps so phase wraps cleanly

    const halfStep = style === 'wave' ? sw * 3.5 : sw * 2.5;
    const amp = sw * 0.85;

    // Rect perimeter as ordered points (inset by hm)
    const x0 = hm, y0 = hm, x1 = ow - hm, y1 = oh - hm;
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

  el.appendChild(svg);
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
  if(!sel.dataset.hoverFx)sel.dataset.hoverFx='{}';
  const fx=JSON.parse(sel.dataset.hoverFx);
  if(preset==='none'){
    sel.dataset.hoverFx='{}';applyHoverFxEditor(sel,{});syncHoverFxUI();save();saveState();return;
  }
  fx.enabled=true;fx.preset=preset;
  if(preset==='lift'){fx.scale=1.06;fx.shadow=16;fx.shadowColor='rgba(0,0,0,0.4)';fx.dur=0.2;}
  else if(preset==='lighter'){fx.scale=1.0;fx.shadow=0;fx.color='';fx.dur=0.2;}
  else if(preset==='darker'){fx.scale=1.0;fx.shadow=0;fx.color='';fx.dur=0.2;}
  else if(preset==='glow'){fx.scale=1.04;fx.shadow=24;fx.shadowColor='rgba(99,102,241,0.7)';fx.dur=0.3;}
  sel.dataset.hoverFx=JSON.stringify(fx);
  applyHoverFxEditor(sel,fx);syncHoverFxUI();
  document.getElementById('hfx-on').checked=true;
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
    if(srcEl.dataset.elOpacity){pipetteSrc.dataset.elOpacity=srcEl.dataset.elOpacity;pipetteSrc.style.opacity=srcEl.dataset.elOpacity;dstData.elOpacity=+srcEl.dataset.elOpacity;}
    if(srcEl.dataset.rx_tl){['tl','tr','bl','br'].forEach(c=>{pipetteSrc.dataset['rx_'+c]=srcEl.dataset['rx_'+c]||0;dstData['rx_'+c]=+(srcEl.dataset['rx_'+c]||0);});pipetteSrc.dataset.rxUnit=srcEl.dataset.rxUnit||'px';dstData.rxUnit=srcEl.dataset.rxUnit||'px';applyTextRadius(pipetteSrc);}
  } else if(srcType==='shape'&&dstType==='shape'){
    // Copy all shape styles: fill, stroke, sw, rx, shadow, fillOp, gradient
    const props=['fill','stroke','sw','rx','fillOp','shadow','shadowBlur','shadowColor','strokeStyle','fillGrad','fillGrad2','fillGradDir'];
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
    }catch(e){}
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
  const dstSl = pipetteSrcSlide;
  cancelPipetteMode();
  if(dstSl !== cur && typeof pickSlide === 'function') {
    pickSlide(dstSl);
    setTimeout(() => {
      save(); drawThumbs(); saveState();
      const destEl = document.querySelector(`.el[data-id="${pipetteSrc?.dataset?.id}"]`);
      if(destEl && typeof pick === 'function') pick(destEl);
      toast('✓ Стиль скопирован', 'ok');
    }, 50);
  } else {
    save(); drawThumbs(); saveState();
    if(typeof pick==='function') pick(pipetteSrc);
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
  // Apply radius+clip to .ec (inner container) — keeps .rh handles outside and visible
  const ec=el.querySelector('.ec');
  if(ec){ec.style.borderRadius=rx;ec.style.overflow='hidden';}
  // Also set on .el for visual border outline match, but WITHOUT overflow:hidden
  el.style.borderRadius=rx;
  el.style.overflow='visible';
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
