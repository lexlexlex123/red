// ══════════════ BOOT ══════════════
function boot(){
  // Init i18n first
  applyI18n();
  syncLangButtons();
  const vEl=document.getElementById('settings-version');
  const aEl=document.getElementById('settings-author');
  if(vEl)vEl.textContent=APP_VERSION;
  if(aEl)aEl.textContent=APP_AUTHOR;

  buildSwatches('bgswatches');buildSwatches('bgswatches2');
  buildThemeGrid();buildShapeGallery();buildAppletGallery();
  buildPalette('cp-text-palette','text');
  buildPalette('cp-fill-palette','fill');
  drawGrid();
  // Sync click-nav checkboxes
  document.getElementById('canvas').addEventListener('mousedown',e=>{
    if(e.target.id==='canvas'||e.target.id==='cvbg'){if(pipetteMode){cancelPipetteMode();return;}desel();}
  });
  // Global: clicking anywhere outside an element exits text/table editing
  document.addEventListener('mousedown',e=>{
    if(!sel)return;
    // If click is inside the currently editing element, allow it
    if(sel.contains(e.target))return;
    // If clicking slide panel — let pickSlide handle it; just exit editing silently
    const inSlidePanel=e.target.closest('#slide-list')||e.target.closest('#sidebar');
    // Exit table cell editing
    if(sel.dataset.type==='table'){
      sel.querySelectorAll('td[contenteditable="true"],th[contenteditable="true"]').forEach(cell=>{
        cell.contentEditable='false';
        const r=+cell.dataset.r,c2=+cell.dataset.c;
        const d=slides[cur]&&slides[cur].els.find(x=>x.id===sel.dataset.id);
        if(d&&d.cells){const i=r*d.cols+c2;if(d.cells[i])d.cells[i].html=cell.innerHTML;}
      });
      delete sel.dataset.editing;
      if(typeof tblClearSel==='function') tblClearSel();
      if(typeof _tblSaveToDataset==='function'){const d=slides[cur]&&slides[cur].els.find(x=>x.id===sel.dataset.id);if(d)_tblSaveToDataset(sel,d);}
      // Don't drawThumbs here if clicking slide panel — pickSlide will handle it
      if(inSlidePanel){save();saveState();return;}
      save();drawThumbs();saveState();
      return;
    }
    // Exit text element editing
    if(sel.dataset.editing!=='true')return;
    const c=sel.querySelector('.tel');
    if(c){c.contentEditable='false';c.blur();}
    delete sel.dataset.editing;sel.style.cursor='';
    save();drawThumbs();saveState();
  },true); // capture phase so it fires before other handlers
  window.addEventListener('resize',drawGrid);
  document.addEventListener('keydown',onKey);
  loadState();
  if(typeof refreshDecorColors==='function'){
    const [_a1,_a2]=(typeof _decorAccents==='function')?_decorAccents():['#6366f1','#818cf8'];
    refreshDecorColors(_a1,_a2,true);
  }
  if(!slides.length)addSlide();
  renderAll();
  // Restore page numbering UI after everything is rendered
  if(typeof pnSyncUI==='function') pnSyncUI();
  toast(APP_NAME+' v'+APP_VERSION+' · Ctrl+Z · F5','ok');
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

  function makeSection(label,themes){
    const sec=document.createElement('div');
    const hdr=document.createElement('div');
    hdr.style.cssText='font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text2);margin:10px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:5px;';
    hdr.textContent=label;
    sec.appendChild(hdr);
    const grid=document.createElement('div');
    grid.className='theme-grid';
    themes.forEach(([i,t])=>{
      const card=document.createElement('div');
      card.className='theme-card'+(selTheme===i?' active':'');

      // Background fill
      const bg=document.createElement('div');
      bg.style.cssText='position:absolute;inset:0;background:'+t.bg+';';

      // Mini slide content mockup
      const mock=document.createElement('div');
      mock.style.cssText='position:absolute;inset:0;padding:15% 10% 22%;display:flex;flex-direction:column;gap:9%;pointer-events:none;';
      // Heading bar
      const mh=document.createElement('div');
      mh.style.cssText='height:15%;border-radius:2px;width:62%;background:'+t.headingColor+';opacity:.95;';
      // Body lines
      const mb1=document.createElement('div');
      mb1.style.cssText='height:9%;border-radius:1px;width:78%;background:'+t.bodyColor+';opacity:.45;';
      const mb2=document.createElement('div');
      mb2.style.cssText='height:9%;border-radius:1px;width:52%;background:'+t.bodyColor+';opacity:.3;';
      // Mini shape block
      const mshape=document.createElement('div');
      mshape.style.cssText='margin-top:4%;height:18%;width:22%;border-radius:3px;background:'+t.shapeFill+';opacity:.85;';
      mock.append(mh,mb1,mb2,mshape);

      // Color swatches top-right: heading accent + shape fill
      const swatches=document.createElement('div');
      swatches.style.cssText='position:absolute;top:5px;right:5px;display:flex;gap:3px;align-items:center;';
      const sw1=document.createElement('div');
      sw1.title='Heading: '+t.headingColor;
      sw1.style.cssText='width:9px;height:9px;border-radius:2px;background:'+t.headingColor+';box-shadow:0 0 0 1px rgba(0,0,0,.4),0 0 0 1.5px rgba(255,255,255,.2);';
      const sw2=document.createElement('div');
      sw2.title='Accent/Shapes: '+t.shapeFill;
      sw2.style.cssText='width:9px;height:9px;border-radius:2px;background:'+t.shapeFill+';box-shadow:0 0 0 1px rgba(0,0,0,.4),0 0 0 1.5px rgba(255,255,255,.2);';
      swatches.append(sw1,sw2);

      // Label
      const lbl=document.createElement('div');
      lbl.className='tc-label';
      lbl.textContent=t.name;

      card.append(bg,mock,swatches,lbl);
      card.onclick=()=>{selTheme=i;buildThemeGrid();buildPalette('cp-text-palette','text');buildPalette('cp-fill-palette','fill');};
      grid.appendChild(card);
    });
    sec.appendChild(grid);
    g.appendChild(sec);
  }

  const dark=THEMES.map((t,i)=>[i,t]).filter(([,t])=>t.dark!==false);
  const light=THEMES.map((t,i)=>[i,t]).filter(([,t])=>t.dark===false);
  if(dark.length) makeSection(t('darkThemes'),dark);
  if(light.length) makeSection(t('lightThemes'),light);
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
