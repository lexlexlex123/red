// ══════════════ HOVER EFFECTS ══════════════
function setHoverFx(prop,val){
  if(!sel)return;
  if(!sel.dataset.hoverFx){sel.dataset.hoverFx='{}';}
  const fx=JSON.parse(sel.dataset.hoverFx||'{}');
  if(prop==='enabled'){fx.enabled=val;}
  else if(prop==='scale'){fx.scale=val;}
  else if(prop==='dur'){fx.dur=val;}
  else if(prop==='color'){fx.color=val;}
  else if(prop==='opacity'){fx.opacity=val;}
  else if(prop==='shadow'){fx.shadow=val;}
  else if(prop==='shadowColor'){fx.shadowColor=val;}
  sel.dataset.hoverFx=JSON.stringify(fx);
  applyHoverFxEditor(sel,fx);
  save();saveState();
}
function applyHoverFxEditor(el,fx){
  // In editor: add a CSS class that uses CSS variables for the hover transition
  el.classList.toggle('has-hover-fx',!!(fx&&fx.enabled));
  if(fx&&fx.enabled){
    const scale=fx.scale||1.05,dur=fx.dur||0.2;
    el.style.setProperty('--hfx-scale',scale);
    el.style.setProperty('--hfx-dur',dur+'s');
    el.style.cursor='pointer';
  }else{
    el.style.cursor='';
  }
}
function applyHoverFxPreview(el,fx,isShape){
  if(!fx||!fx.enabled)return;
  const dur=(fx.dur||0.2)+'s';
  const origTransform=el.style.transform||'';

  if(isShape){
    // For shapes: attach events to the SVG element itself so only the shape area triggers hover
    const svg=el.querySelector('svg');
    if(!svg)return;
    // Container: no pointer-events (transparent), cursor handled by SVG
    el.style.pointerEvents='none';
    svg.style.pointerEvents='auto';
    svg.style.cursor='pointer';
    svg.style.transition='transform '+dur+' ease,opacity '+dur+' ease,filter '+dur+' ease';
    svg.style.transformOrigin='center center';
    svg.addEventListener('mouseenter',()=>{
      const sc=fx.scale||1.05;
      svg.style.transform='scale('+sc+')';
      if(fx.opacity!=null&&fx.opacity!==1)svg.style.opacity=String(fx.opacity);
      if(fx.shadow&&fx.shadow>0)svg.style.filter='drop-shadow(0 0 '+fx.shadow+'px '+(fx.shadowColor||'rgba(0,0,0,0.6)')+')';
      if(fx.preset==='glow'&&fx.color)svg.style.filter='drop-shadow(0 0 12px '+fx.color+') drop-shadow(0 0 20px '+fx.color+')';
      if(fx.preset==='lighter')svg.style.filter='brightness(1.3)';
      if(fx.preset==='darker')svg.style.filter='brightness(0.7)';
    });
    svg.addEventListener('mouseleave',()=>{
      svg.style.transform='';
      svg.style.opacity='';
      svg.style.filter='';
    });
    // Also handle click for links through SVG
    el.style.cursor='';
  } else {
    // For text/image: use the container div
    el.style.transition='transform '+dur+' ease,opacity '+dur+' ease,filter '+dur+' ease,box-shadow '+dur+' ease';
    el.style.cursor='pointer';
    el.addEventListener('mouseenter',()=>{
      const sc=fx.scale||1.05;
      el.style.transform=origTransform+' scale('+sc+')';
      if(fx.opacity!=null&&fx.opacity!==1)el.style.opacity=String(fx.opacity);
      if(fx.shadow&&fx.shadow>0)el.style.boxShadow='0 0 '+fx.shadow+'px '+(fx.shadowColor||'rgba(0,0,0,0.6)');
      if(fx.preset==='glow'&&fx.color)el.style.boxShadow='0 0 20px 6px '+fx.color;
      if(fx.preset==='lighter')el.style.filter='brightness(1.3)';
      if(fx.preset==='darker')el.style.filter='brightness(0.7)';
    });
    el.addEventListener('mouseleave',()=>{
      el.style.transform=origTransform;
      el.style.opacity='';
      el.style.boxShadow='';
      el.style.filter='';
    });
  }
}
function syncHoverFxUI(){
  if(!sel)return;
  const fx=JSON.parse(sel.dataset.hoverFx||'{}');
  try{
    document.getElementById('hfx-on').checked=!!fx.enabled;
    document.getElementById('hfx-scale').value=fx.scale||1.05;
    document.getElementById('hfx-dur').value=fx.dur||0.2;
    document.getElementById('hfx-col').value=fx.color||'#ffffff';
    document.getElementById('hfx-col-hex').value=fx.color||'';
    document.getElementById('hfx-op').value=fx.opacity!=null?fx.opacity:1;
    document.getElementById('hfx-shadow').value=fx.shadow||0;
    document.getElementById('hfx-scol').value=fx.shadowColor||'#000000';
    document.getElementById('hfx-scol-hex').value=fx.shadowColor||'';
  }catch(e){}
}
function onColorPick(v,mode){
  if(mode==='text'){applyTextColor(v);}
  addRecentColor(v);
}
function onColorHex(v,mode){
  if(/^#[0-9a-fA-F]{3,8}$/.test(v)){
    if(mode==='text'){applyTextColor(v);try{document.getElementById('p-col').value=v;}catch(e){}}
    addRecentColor(v);
  }
}
function updateElLink(v){if(!sel)return;if(v){sel.dataset.link=v;sel.classList.add('has-link');}else{delete sel.dataset.link;sel.classList.remove('has-link');}save();saveState();}
function updateElLinkTarget(v){if(!sel)return;sel.dataset.linkt=v;save();}
