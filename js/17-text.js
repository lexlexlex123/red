// ══════════════ TEXT BORDER & OPACITY ══════════════
function setTextBorder(prop,val,schemeRef){
  if(!sel||sel.dataset.type!=='text')return;
  if(prop==='color'){
    sel.dataset.textBorderColor=val;
    // Store scheme ref on data
    const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d) d.borderScheme = (schemeRef !== undefined ? (schemeRef || null) : d.borderScheme);
  }
  if(prop==='width'){sel.dataset.textBorderW=val;}
  applyTextBorderStyle(sel);
  save();drawThumbs();saveState();
}
function applyTextBorderStyle(el){
  const w=+(el.dataset.textBorderW||0);
  const c=el.dataset.textBorderColor||'#ffffff';
  if(w>0){el.style.outline=w+'px solid '+c;el.style.outlineOffset='0px';}
  else{el.style.outline='';}
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
let pipetteMode=false,pipetteSrc=null;
function togglePipetteMode(){
  if(!sel){toast('Select a target element first');return;}
  pipetteMode=!pipetteMode;
  document.querySelectorAll('.pipette-btn').forEach(b=>b.classList.toggle('active',pipetteMode));
  document.body.classList.toggle('pipette-mode',pipetteMode);
  if(pipetteMode){
    pipetteSrc=sel; // remember the element we're styling
    toast('🔬 Pipette ON — click any element to copy its style','ok');
  } else {
    pipetteSrc=null;
    toast('Pipette OFF');
  }
}
function cancelPipetteMode(){
  pipetteMode=false;pipetteSrc=null;
  document.querySelectorAll('.pipette-btn').forEach(b=>b.classList.remove('active'));
  document.body.classList.remove('pipette-mode');
}
function pipetteApply(srcEl){
  // srcEl = element clicked while in pipette mode
  // pipetteSrc = element to apply styles TO
  if(!pipetteSrc||!srcEl||srcEl===pipetteSrc)return;
  const srcType=srcEl.dataset.type;
  const dstType=pipetteSrc.dataset.type;
  const srcData=slides[cur].els.find(e=>e.id===srcEl.dataset.id);
  const dstData=slides[cur].els.find(e=>e.id===pipetteSrc.dataset.id);
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
    // Copy all shape styles: fill, stroke, sw, rx, shadow, fillOp
    const props=['fill','stroke','sw','rx','fillOp','shadow','shadowBlur','shadowColor'];
    props.forEach(p=>{
      if(srcEl.dataset[p]!=null){pipetteSrc.dataset[p]=srcEl.dataset[p];dstData[p]=isNaN(srcEl.dataset[p])?srcEl.dataset[p]==='true':+srcEl.dataset[p];}
    });
    // Copy shape text style too
    const srcTxt=srcEl.querySelector('.shape-text');const dstTxt=pipetteSrc.querySelector('.shape-text');
    if(srcTxt&&dstTxt){dstTxt.setAttribute('style',srcTxt.getAttribute('style')||'');dstData.shapeTextCss=srcTxt.getAttribute('style')||'';}
    renderShapeEl(pipetteSrc,dstData);
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
  save();drawThumbs();saveState();
  syncProps();
  toast('✓ Style copied','ok');
  cancelPipetteMode();
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
