// ══════════════ BOOT ══════════════
function boot(){
  buildSwatches('bgswatches');buildSwatches('bgswatches2');
  buildThemeGrid();buildShapeGallery();buildAppletGallery();
  buildPalette('cp-text-palette','text');
  buildPalette('cp-fill-palette','fill');
  drawGrid();
  // Sync click-nav checkboxes
  document.getElementById('canvas').addEventListener('mousedown',e=>{
    if(e.target.id==='canvas'||e.target.id==='cvbg'){if(pipetteMode){cancelPipetteMode();return;}desel();}
  });
  // Global: clicking anywhere outside an element exits text editing
  document.addEventListener('mousedown',e=>{
    if(!sel||sel.dataset.editing!=='true')return;
    // If click is inside the currently editing element, allow it
    if(sel.contains(e.target))return;
    const c=sel.querySelector('.tel');
    if(c){c.contentEditable='false';c.blur();}
    delete sel.dataset.editing;sel.style.cursor='';
    save();drawThumbs();saveState();
  },true); // capture phase so it fires before other handlers
  window.addEventListener('resize',drawGrid);
  document.addEventListener('keydown',onKey);
  loadState();
  if(!slides.length)addSlide();
  renderAll();
  toast('SlideForge Pro v4 · Ctrl+Z undo · F5 present','ok');
}

function buildSwatches(id){
  const c=document.getElementById(id);if(!c)return;
  BGS.forEach(b=>{
    const d=document.createElement('div');
    d.className='bgsw';d.dataset.id=b.id;d.style.background=b.s;
    d.onclick=()=>applyBgId(b.id);c.appendChild(d);
  });
}
function buildThemeGrid(){
  const g=document.getElementById('theme-grid');if(!g)return;g.innerHTML='';
  THEMES.forEach((t,i)=>{
    const card=document.createElement('div');card.className='theme-card'+(selTheme===i?' active':'');
    const bg=document.createElement('div');bg.className='tc-bg';bg.style.background=t.bg;
    const lbl=document.createElement('div');lbl.className='tc-label';
    lbl.style.cssText='color:'+t.tc+';text-shadow:0 1px 3px rgba(0,0,0,.8);background:rgba(0,0,0,.4);backdrop-filter:blur(4px);';
    lbl.textContent=t.name;card.append(bg,lbl);
    card.onclick=()=>{selTheme=i;buildThemeGrid();buildPalette('cp-text-palette','text');buildPalette('cp-fill-palette','fill');};g.appendChild(card);
  });
}
function buildShapeGallery(){
  const g=document.getElementById('shape-gallery');if(!g)return;g.innerHTML='';
  SHAPES.forEach(s=>{
    const card=document.createElement('div');card.className='shape-card'+(selShape===s.id?' active':'');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');
    let el;
    if(s.special==='rect'){el=document.createElementNS('http://www.w3.org/2000/svg','rect');el.setAttribute('x','5');el.setAttribute('y','5');el.setAttribute('width','90');el.setAttribute('height','90');}
    else if(s.special==='rounded'){el=document.createElementNS('http://www.w3.org/2000/svg','rect');el.setAttribute('x','5');el.setAttribute('y','5');el.setAttribute('width','90');el.setAttribute('height','90');el.setAttribute('rx','15');}
    else if(s.special==='ellipse'){el=document.createElementNS('http://www.w3.org/2000/svg','ellipse');el.setAttribute('cx','50');el.setAttribute('cy','50');el.setAttribute('rx','45');el.setAttribute('ry','45');}
    else{el=document.createElementNS('http://www.w3.org/2000/svg','path');el.setAttribute('d',s.path);}
    el.setAttribute('fill','#3b82f6');el.setAttribute('stroke','none');svg.appendChild(el);
    const span=document.createElement('span');span.textContent=s.name;
    card.append(svg,span);
    card.onclick=()=>{
      selShape=s.id;
      document.querySelectorAll('.shape-card').forEach(c2=>{
        c2.classList.toggle('active',c2===card);
        c2.style.borderColor=''; // clear any inline override
      });
    };
    if(selShape===s.id)card.classList.add('active');
    g.appendChild(card);
  });
}
function openAppletModal(){
  buildAppletGallery();
  document.getElementById('applet-modal').classList.add('open');
}
function buildAppletGallery(){
  const g=document.getElementById('applet-gallery');if(!g)return;g.innerHTML='';
  APPLETS.forEach(a=>{
    const card=document.createElement('div');card.className='applet-card';
    card.innerHTML='<div style="font-size:24px;margin-bottom:4px">'+a.icon+'</div><div class="ac-name">'+a.name+'</div><div class="ac-desc">'+a.desc+'</div>';
    card.onclick=()=>{insertApplet(a);document.getElementById('applet-modal').classList.remove('open');};
    g.appendChild(card);
  });
}
function buildPalette(targetId,mode){
  const c=document.getElementById(targetId);if(!c)return;c.innerHTML='';
  // Theme accent row at top if theme selected
  if(selTheme>=0){
    const t=THEMES[selTheme];
    const themeColors=[t.ac1,t.ac2,t.ac3,t.tc,t.headingColor||t.tc,t.bodyColor||t.tc,t.shapeFill,t.shapeStroke].filter(Boolean);
    const tr=document.createElement('div');tr.className='cp-row';
    // Label
    const lbl=document.createElement('div');lbl.style.cssText='font-size:8px;color:var(--text3);width:100%;margin-bottom:2px;';lbl.textContent='Theme: '+t.name;c.appendChild(lbl);
    themeColors.forEach(col=>{
      const s=document.createElement('div');s.className='cp-swatch';s.style.background=col;s.title=col+' (theme)';
      s.style.border='1px solid rgba(59,130,246,0.4)';
      s.onclick=()=>{addRecentColor(col);if(mode==='text')applyTextColor(col);else if(mode==='fill')applyFillColor(col);};
      tr.appendChild(s);
    });
    c.appendChild(tr);
  }
  PALETTE.forEach(row=>{
    const r=document.createElement('div');r.className='cp-row';
    row.forEach(col=>{
      const s=document.createElement('div');s.className='cp-swatch';s.style.background=col;s.title=col;
      s.onclick=()=>{addRecentColor(col);if(mode==='text')applyTextColor(col);else if(mode==='fill')applyFillColor(col);};
      r.appendChild(s);
    });
    c.appendChild(r);
  });
}
function addRecentColor(c){
  recentColors=recentColors.filter(x=>x!==c);recentColors.unshift(c);recentColors=recentColors.slice(0,10);
}
function applyTextColor(c){
  if(!sel||sel.dataset.type!=='text')return;
  const ec2=sel.querySelector('.ec');
  // Remove color from any inner spans so container color wins
  ec2.querySelectorAll('[style]').forEach(el=>{
    let st=el.getAttribute('style');
    st=st.replace(/color\s*:[^;]+;?/gi,'').trim();
    if(st)el.setAttribute('style',st);else el.removeAttribute('style');
  });
  setTS('color',c);
  try{document.getElementById('p-col').value=c;document.getElementById('p-hex').value=c;}catch(e){}
}
function applyFillColor(c){
  if(!sel)return;
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(!d||d.type!=='shape')return;
  d.fill=c;sel.dataset.fill=c;
  try{document.getElementById('sh-fill').value=c;document.getElementById('sh-fill-hex').value=c;}catch(e){}
  renderShapeEl(sel,d);save();saveState();
}
