// ══════════════ BOOT ══════════════
window._propsScrollMem=(function(){
  const KEY='red_props_scroll';
  let _restoreAfterPick=false;
  function el(){return document.getElementById('props-scroll');}
  function save(){
    const node=el(); if(!node) return;
    try{sessionStorage.setItem(KEY,String(node.scrollTop));}catch(e){}
  }
  function restore(){
    const node=el(); if(!node) return;
    try{
      const v=sessionStorage.getItem(KEY);
      if(v!=null) node.scrollTop=+v||0;
    }catch(e){}
  }
  function restoreSoon(){
    restore();
    requestAnimationFrame(restore);
    requestAnimationFrame(()=>requestAnimationFrame(restore));
    setTimeout(restore,0);
    setTimeout(restore,50);
  }
  function wire(){
    const node=el(); if(!node||node._scrollMemWired) return;
    node._scrollMemWired=true;
    node.addEventListener('scroll',save,{passive:true});
    try{
      const v=sessionStorage.getItem(KEY);
      if(v!=null) node.scrollTop=+v||0;
    }catch(e){}
  }
  function markRestoreAfterPick(){_restoreAfterPick=true;}
  function maybeRestoreAfterPick(){
    if(!_restoreAfterPick) return;
    _restoreAfterPick=false;
    restoreSoon();
  }
  return {save,restore,restoreSoon,wire,markRestoreAfterPick,maybeRestoreAfterPick};
})();

function _bootDeferredUI(){
  // Тяжёлая инициализация панелей — после первого кадра со слайдом
  (function _populateFontSel() {
    const sel = document.getElementById('p-ff');
    if (!sel) return;
    function addFamilies(families) {
      const existing = new Set(Array.from(sel.options).map(o => o.value));
      for (const fam of families) {
        if (fam && !existing.has(fam)) {
          const opt = document.createElement('option');
          opt.value = fam; opt.textContent = fam; opt.style.fontFamily = fam;
          sel.appendChild(opt);
          existing.add(fam);
        }
      }
    }
    if (window._LOCAL_FONTS && window._LOCAL_FONTS.length) {
      addFamilies(window._LOCAL_FONTS);
      return;
    }
    const families = new Set();
    try {
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules || sheet.rules; } catch(e) { continue; }
        if (!rules) continue;
        for (const rule of rules) {
          if (rule.type === CSSRule.FONT_FACE_RULE) {
            const fam = rule.style.getPropertyValue('font-family')
              .trim().replace(/^['"]|['"]$/g, '');
            if (fam) families.add(fam);
          }
        }
      }
    } catch(e) {}
    if (families.size) addFamilies([...families].sort());
  })();
  buildSwatches('bgswatches');buildSwatches('bgswatches2'); // no-op if elements removed
  buildThemeGrid();buildShapeGallery();buildAppletGallery();
  buildPalette('cp-text-palette','text');
  buildPalette('cp-fill-palette','fill');
}

function boot(){
  // Init i18n first
  applyI18n();
  if(typeof initHexFields==='function')initHexFields();
  syncLangButtons();
  const vEl=document.getElementById('settings-version');
  const aEl=document.getElementById('settings-author');
  if(vEl)vEl.textContent=APP_VERSION;
  if(aEl)aEl.textContent=APP_AUTHOR;
  const logoVer=document.getElementById('app-logo-ver');
  if(logoVer) logoVer.textContent='v '+APP_VERSION;

  // Close any open modal when clicking the overlay (outside .modal content)
  document.addEventListener('mousedown', e => {
    if(!e.target.classList.contains('modal-ov')) return;
    // Click landed directly on overlay — close it
    e.target.classList.remove('open');
    // For dynamically created modals (formula editor etc) also remove from DOM
    if(!e.target.id) e.target.remove();
  });

  // Global helper to blur any active shape text editor
  window._blurActiveShapeText = function(){
    const elP = document.querySelector('[data-type="shape"][data-editing="true"]');
    if (!elP) return;
    const txt = elP.querySelector('.shape-text');
    if (!txt) { elP.dataset.editing = 'false'; return; }
    const inner = txt.querySelector('[contenteditable="true"]');
    if (inner) {
      inner.blur(); // mkEl blur handler saves shapeHtml + commitAll
      return;
    }
    txt.style.pointerEvents = 'none';
    elP.dataset.editing = 'false';
    const d = slides[cur] && slides[cur].els.find(x => x.id === elP.dataset.id);
    const src = txt.querySelector('div') || txt;
    if (d) d.shapeHtml = src.innerHTML;
    if (typeof commitAll === 'function') commitAll();
  };

  document.getElementById('canvas').addEventListener('mousedown',e=>{
    if(e.target.id==='canvas'||e.target.id==='cvbg'){
      if(pipetteMode){cancelPipetteMode();return;}
      // Connector hits are handled by connectors.js; don't steal empty-canvas rubber-band
      if(e.target.closest&&(e.target.closest('.conn-hit')||e.target.closest('#conn-handles')))return;
      // Magnetic pick deferred to rubber-band mouseup in 28-multisel.js
      // so rectangular selection works when dragging on the slide.
    }
  });
  // Global: clicking anywhere outside an element exits text/table editing
  document.addEventListener('mousedown',e=>{
    if(!sel)return;
    // If click is inside the currently editing element, allow it
    if(sel.contains(e.target))return;
    // If clicking inside an open modal (icon picker, etc.) — that's not
    // "clicking outside the text block" in the way that should end editing;
    // let the modal's own click handler run without us first tearing down
    // and rebuilding the editor DOM out from under it.
    if(e.target.closest('.modal-ov.open')) return;
    // If clicking slide panel — let pickSlide handle it; just exit editing silently
    const inSlidePanel=e.target.closest('#slide-list')||e.target.closest('#sidebar');
    // Exit table cell editing
    if(sel.dataset.type==='table'){
      // If click is inside #props panel — keep cell selection, just save editing state
      const inProps=e.target.closest('#props');
      sel.querySelectorAll('td[contenteditable="true"],th[contenteditable="true"]').forEach(cell=>{
        cell.contentEditable='false';
        const r=+cell.dataset.r,c2=+cell.dataset.c;
        const d=slides[cur]&&slides[cur].els.find(x=>x.id===sel.dataset.id);
        if(d&&d.cells){const i=r*d.cols+c2;if(d.cells[i])d.cells[i].html=cell.innerHTML;}
      });
      delete sel.dataset.editing;
      if(!inProps && typeof tblClearSel==='function') tblClearSel();
      if(typeof _tblSaveToDataset==='function'){const d=slides[cur]&&slides[cur].els.find(x=>x.id===sel.dataset.id);if(d)_tblSaveToDataset(sel,d);}
      // Don't drawThumbs here if clicking slide panel — pickSlide will handle it
      if(inSlidePanel){save();saveState();return;}
      save();drawThumbs();saveState();
      return;
    }
    // Exit shape text editing when clicking outside the shape
    if(sel.dataset.type==='shape' && sel.dataset.editing==='true'){
      if(e.target.closest('#props')) return;
      window._blurActiveShapeText();
      return;
    }
    // Exit text element editing
    if(sel.dataset.editing!=='true')return;
    // Don't exit editing when clicking props panel
    if(e.target.closest('#props')) return;
    if(typeof window._finishTextEdit==='function') window._finishTextEdit(sel);
    else{
      const c=sel.querySelector('.tel');
      if(c) c.blur();
    }
    return;
  },true); // capture phase so it fires before other handlers
  window.addEventListener('resize',drawGrid);
  document.addEventListener('keydown',onKey);
  loadState();
  if(typeof restoreSnapPref==='function') restoreSnapPref();
  if(typeof refreshDecorColors==='function'){
    const [_a1,_a2]=(typeof _decorAccents==='function')?_decorAccents():['#6366f1','#818cf8'];
    refreshDecorColors(_a1,_a2,true);
  }
  if(!slides.length){
    addSlide();
    // First launch — apply first theme automatically
    _applyThemeByIdx(0);
    const titleEl=document.getElementById('pres-title');
    if(titleEl && !titleEl.value.trim() && typeof defaultPresentationTitle==='function'){
      titleEl.value=defaultPresentationTitle();
    }
  }
  renderAll();
  if(typeof _applyCanvasZoom==='function') _applyCanvasZoom();
  if(typeof _centerSlide==='function') _centerSlide();
  requestAnimationFrame(()=>requestAnimationFrame(()=>drawGrid()));
  requestAnimationFrame(()=>_bootDeferredUI());
  // Sync animation toggle UI state after restore
  if(typeof _syncAnimToggleBtns==='function') _syncAnimToggleBtns();
  if(typeof _updateAnimToggleVisibility==='function') _updateAnimToggleVisibility();
  // Restore page numbering UI after everything is rendered
  if(typeof pnSyncUI==='function') pnSyncUI();
  if(typeof pnApplyAll==='function') pnApplyAll();
  // Кнопки «Отображение» на вкладке Показ — из localStorage
  if(typeof _syncPreviewPlaybackBtns==='function') _syncPreviewPlaybackBtns();
  window._propsScrollMem && window._propsScrollMem.wire();
  toast(APP_NAME+' v'+APP_VERSION+' · Ctrl+Z · F5','ok');
}

function newPresentation(){
  if(!confirm(t('confirmNewPresentation')||'Создать новую презентацию? Текущая будет потеряна.'))return;
  // Clear state
  slides=[];cur=0;
  const titleEl=document.getElementById('pres-title');
  if(titleEl) titleEl.value = (typeof defaultPresentationTitle === 'function' ? defaultPresentationTitle() : 'Презентация');
  addSlide();
  // Apply first theme
  _applyThemeByIdx(0);
  renderAll();
  drawThumbs();
  saveState();
  if(typeof renderAnimPanel==='function')renderAnimPanel();
  if(typeof renderMotionOverlay==='function')renderMotionOverlay();
  toast(t('toastNewPresentation')||'Новая презентация создана','ok');
}

// Apply theme by index without UI (no modal, no selTheme dependency)
function _applyThemeByIdx(idx){
  if(!THEMES||idx<0||idx>=THEMES.length)return;
  const theme=THEMES[idx];
  appliedThemeIdx=idx;
  slides.forEach(s=>{
    s.bg='custom';s.bgc=theme.bg;
    s.els.forEach(el=>{
      if(el.type==='text'){
        const isHeading=el.textRole==='heading';
        let newColor;
        if(el.textColorScheme!==null&&el.textColorScheme!==undefined){
          const resolved=typeof _resolveSchemeColor==='function'?_resolveSchemeColor(el.textColorScheme,theme):null;
          newColor=resolved||(isHeading?(theme.headingColor||theme.tc):(theme.bodyColor||theme.tc));
        } else if(el.textColorScheme===undefined){
          newColor=isHeading?(theme.headingColor||theme.tc):(theme.bodyColor||theme.tc);
        } else {
          newColor=null;
        }
        if(!el.cs)el.cs='font-size:36px;';
        if(newColor) el.cs=/color\s*:/.test(el.cs)?el.cs.replace(/\bcolor\s*:\s*[^;]+;?/g,'color:'+newColor+';'):(el.cs.endsWith(';')?el.cs:el.cs+';')+'color:'+newColor+';';
        delete el.textBg;delete el.textBgOp;
      }
      if(el.type==='shape'){
        if(el.fillScheme!==null&&el.fillScheme!==undefined){const r=typeof _resolveSchemeColor==='function'?_resolveSchemeColor(el.fillScheme,theme):null;if(r)el.fill=r;}
        else if(el.fillScheme===undefined&&theme.shapeFill)el.fill=theme.shapeFill;
        if(el.strokeScheme!==null&&el.strokeScheme!==undefined){const r=typeof _resolveSchemeColor==='function'?_resolveSchemeColor(el.strokeScheme,theme):null;if(r)el.stroke=r;}
        else if(el.strokeScheme===undefined&&theme.shapeStroke)el.stroke=theme.shapeStroke;
      }
      if(el.type==='icon'&&!el.iconColorCustom){const newColor=theme.shapeFill||theme.tc||'#3b82f6';el.iconColor=newColor;}
    });
  });
  if(typeof refreshDecorColors==='function') refreshDecorColors(theme.ac1||'#6366f1',theme.ac2||'#818cf8',true);
  if(typeof buildSlideTplGrid==='function')buildSlideTplGrid();
  if(typeof refreshAllCodeBlocks==='function')refreshAllCodeBlocks();
  if(typeof renderAll==='function') renderAll();
  else if(typeof refreshDecorOnCanvas==='function') refreshDecorOnCanvas();
  if(typeof refreshAppletThemes==='function')refreshAppletThemes();
  if(typeof refreshOpenColorPanel==='function') refreshOpenColorPanel();
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
    grid.style.display='flex';
    grid.style.flexWrap='wrap';
    grid.style.gap='14px';
    grid.style.alignContent='flex-start';

    // "No theme" card — only in first section
    if(label===t('darkThemes')||(!THEMES.some(x=>x.dark!==false))){
    }

    themes.forEach(([i,t])=>{
      const card=document.createElement('div');
      const slideLight=t.dark===false;
      card.className='theme-card'
        +(selTheme===i?' active':'')
        +(slideLight?' theme-card--slide-light':' theme-card--slide-dark');
      const inner=document.createElement('div');
      inner.className='theme-card-inner';

      const bg=document.createElement('div');
      bg.className='tc-bg';
      bg.style.background=t.bg;
      // Start birds animation if theme has bgAnim
      if(t.bgAnim==='birds' && typeof _birdsThemeStart==='function'){
        setTimeout(()=>_birdsThemeStart(bg.parentElement||bg),50);
      } else if(typeof _birdsThemeStop==='function' && _birdsThemeActive && _birdsThemeActive()){
        _birdsThemeStop();
      }

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

      // 7 colour strips — vertical rectangles side by side, bottom-right corner
      const swatches=document.createElement('div');
      swatches.style.cssText='position:absolute;bottom:20px;right:5px;display:flex;flex-direction:row;gap:2px;align-items:flex-end;pointer-events:none;';
      const base7=(typeof _themeColors==='function'?_themeColors(t):Object.values(t)).slice(0,7);
      base7.forEach(col=>{
        const sw=document.createElement('div');
        const hex=_solidColor(col);
        sw.title=hex;
        sw.style.cssText='width:5px;height:18px;border-radius:2px;background:'+hex+';';
        swatches.appendChild(sw);
      });

      // Label
      const lbl=document.createElement('div');
      lbl.className='tc-label';
      lbl.textContent=t.name;

      inner.append(bg,mock,swatches,lbl);
      card.appendChild(inner);
      card.onclick=()=>{selTheme=i;buildThemeGrid();};
      card.ondblclick=(e)=>{e.preventDefault();selTheme=i;applyTheme();closeThemeModal();};
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
  const _hiddenShapes = new Set(['calloutRound','cylinder','cube','brace','plus','badge','arc','wave']);
  SHAPES.filter(s=>!_hiddenShapes.has(s.id)).forEach(s=>{
    const card=document.createElement('div');card.className='shape-card'+(selShape===s.id?' active':'');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');
    let el;
    if(s.special==='rect'){el=document.createElementNS('http://www.w3.org/2000/svg','rect');el.setAttribute('x','5');el.setAttribute('y','5');el.setAttribute('width','90');el.setAttribute('height','90');}
    else if(s.special==='ellipse'){el=document.createElementNS('http://www.w3.org/2000/svg','ellipse');el.setAttribute('cx','50');el.setAttribute('cy','50');el.setAttribute('rx','45');el.setAttribute('ry','45');}
    else if(s.special==='callout'){el=document.createElementNS('http://www.w3.org/2000/svg','path');el.setAttribute('d','M 5 5 H 95 V 72 H 57 L 50 92 L 44 72 H 5 Z');}
    else if(s.special==='star'){
      el=document.createElementNS('http://www.w3.org/2000/svg','path');
      const _spts=[];for(let _i=0;_i<10;_i++){const _a=(_i/10*Math.PI*2)-Math.PI/2;const _r=_i%2===0?45:20;_spts.push((_r*Math.cos(_a)+50).toFixed(1)+','+(_r*Math.sin(_a)+50).toFixed(1));}
      el.setAttribute('d','M '+_spts.join(' L ')+' Z');
    }
    else if(s.special==='polygon'){
      el=document.createElementNS('http://www.w3.org/2000/svg','path');
      const _pts=[];for(let _i=0;_i<3;_i++){const _a=(_i/3*Math.PI*2)-(Math.PI/2);_pts.push((50+45*Math.cos(_a)).toFixed(1)+','+(50+45*Math.sin(_a)).toFixed(1));}
      el.setAttribute('d','M '+_pts.join(' L ')+' Z');
    }
    else if(s.special==='cloud'){el=document.createElementNS('http://www.w3.org/2000/svg','path');el.setAttribute('d','M 25 70 Q 5 70 5 55 Q 5 40 20 38 Q 18 20 35 18 Q 42 5 58 12 Q 70 5 80 15 Q 95 15 95 32 Q 98 50 88 58 Q 90 70 75 70 Z');}else if(s.special==='parallelogram'){
      el=document.createElementNS('http://www.w3.org/2000/svg','path');
      el.setAttribute('d','M 20 5 L 95 5 L 80 95 L 5 95 Z');
    }
    else if(s.special==='curve'){
      el=document.createElementNS('http://www.w3.org/2000/svg','path');
      el.setAttribute('d','M 10 70 C 10 20 45 20 50 50 C 55 80 90 20 90 30');
      el.setAttribute('fill','none');
      el.setAttribute('stroke-width','5');
      el.setAttribute('stroke-linecap','round');
    }
    else if(s.special==='chevron'){
      el=document.createElementNS('http://www.w3.org/2000/svg','path');
      const _isLeft=s.id==='chevronLeft', _tip=22, _w=90, _h=90, _ox=5, _oy=5;
      // Right: M ox oy L (ox+w-tip) oy L (ox+w) (oy+h/2) L (ox+w-tip) (oy+h) L ox (oy+h) L (ox+tip) (oy+h/2)
      // Left mirror: M (ox+w) oy L (ox+tip) oy L ox (oy+h/2) L (ox+tip) (oy+h) L (ox+w) (oy+h) L (ox+w-tip) (oy+h/2)
      const _d=_isLeft
        ?`M ${_ox+_w} ${_oy} L ${_ox+_tip} ${_oy} L ${_ox} ${_oy+_h/2} L ${_ox+_tip} ${_oy+_h} L ${_ox+_w} ${_oy+_h} L ${_ox+_w-_tip} ${_oy+_h/2} Z`
        :`M ${_ox} ${_oy} L ${_ox+_w-_tip} ${_oy} L ${_ox+_w} ${_oy+_h/2} L ${_ox+_w-_tip} ${_oy+_h} L ${_ox} ${_oy+_h} L ${_ox+_tip} ${_oy+_h/2} Z`;
      el.setAttribute('d',_d);
    }
    else if(s.special==='trapezoid'){
      el=document.createElementNS('http://www.w3.org/2000/svg','path');
      if(typeof _trapPath==='function'){
        el.setAttribute('d',_trapPath(5,5,90,90,0.15,0.0,0));
      } else {
        el.setAttribute('d','M 19 5 L 81 5 L 95 95 L 5 95 Z');
      }
    }
    else if(s.special==='moon'){
      el=document.createElementNS('http://www.w3.org/2000/svg','path');
      if(typeof _moonPath==='function'){
        el.setAttribute('d',_moonPath(50,50,45,45,-0.5,0));
      } else {
        el.setAttribute('d','M 72 5 C 35 5 10 25 10 50 C 10 75 35 95 72 95 C 55 85 45 68 45 50 C 45 32 55 15 72 5 Z');
      }
    }
    else if(s.special==='gear'){
      el=document.createElementNS('http://www.w3.org/2000/svg','path');
      if(typeof _gearPath==='function'){
        el.setAttribute('d', _gearPath(50,50,45,45,8,0.25));
      } else {
        el.setAttribute('d','M 50 5 L 90 20 L 90 55 Q 90 80 50 95 Q 10 80 10 55 L 10 20 Z');
      }
    }
    else if(s.special==='noSymbol'){
      const _smFillNs=document.getElementById('sm-fill');const _fcNs=(_smFillNs&&_smFillNs.value)||'#3b82f6';
      // Ring (no fill) + diagonal
      const _circ=document.createElementNS('http://www.w3.org/2000/svg','circle');
      _circ.setAttribute('cx','50');_circ.setAttribute('cy','50');_circ.setAttribute('r','42');
      _circ.setAttribute('fill','none');_circ.setAttribute('stroke',_fcNs);_circ.setAttribute('stroke-width','13');
      _circ.classList.add('sg-fill'); // sg-fill targets stroke on circle for color sync
      svg.appendChild(_circ);
      const _line=document.createElementNS('http://www.w3.org/2000/svg','line');
      // Diagonal top-right to bottom-left at 45°
      _line.setAttribute('x1','80');_line.setAttribute('y1','8');
      _line.setAttribute('x2','20');_line.setAttribute('y2','92');
      _line.setAttribute('stroke',_fcNs);_line.setAttribute('stroke-width','13');_line.setAttribute('stroke-linecap','butt');
      svg.appendChild(_line);
      const _span2=document.createElement('span');_span2.textContent=s.name;
      card.append(svg,_span2);
      card.onclick=()=>{selShape=s.id;document.querySelectorAll('.shape-card').forEach(c2=>{c2.classList.toggle('active',c2===card);c2.style.borderColor='';});};
      card.ondblclick=()=>{selShape=s.id;if(typeof insertShapeSelected==='function')insertShapeSelected();};
      if(selShape===s.id)card.classList.add('active');
      g.appendChild(card);
      return;
    }
    else if(s.path){el=document.createElementNS('http://www.w3.org/2000/svg','path');el.setAttribute('d',s.path);}
    else{el=document.createElementNS('http://www.w3.org/2000/svg','rect');el.setAttribute('x','5');el.setAttribute('y','5');el.setAttribute('width','90');el.setAttribute('height','90');}
    const _smFill=document.getElementById('sm-fill');const _fc=(_smFill&&_smFill.value)||'#3b82f6';
    el.setAttribute('fill',_fc);el.setAttribute('stroke','none');el.classList.add('sg-fill');svg.appendChild(el);
    const span=document.createElement('span');span.textContent=s.name;
    card.append(svg,span);
    card.onclick=()=>{
      selShape=s.id;
      document.querySelectorAll('.shape-card').forEach(c2=>{
        c2.classList.toggle('active',c2===card);
        c2.style.borderColor='';
      });
    };
    card.ondblclick=()=>{
      selShape=s.id;
      if(typeof insertShapeSelected==='function') insertShapeSelected();
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
    const isRu=typeof getLang==='function'&&getLang()==='ru';
    const card=document.createElement('div');card.className='applet-card';
    card.innerHTML='<div class="ac-icon">'+a.icon+'</div><div class="ac-name">'+(isRu&&a.nameRu?a.nameRu:a.name)+'</div>';
    card.title=isRu&&a.descRu?a.descRu:a.desc;
    card.onclick=()=>{
      document.getElementById('applet-modal').classList.remove('open');
      insertApplet(a);
    };
    g.appendChild(card);
  });
}
// ── Inline colour panel (expands inside props panel) ────────────
// Trigger: openColorPanel(panelId, mode, onPick)
// panelId = id of the <div class="color-panel-slot"> in props HTML
// The slot div expands/collapses inline — no popup.

let _cpActivePanelId = null;
let _cpActiveMode = null;
let _cpActiveOnPick = null;

function openColorPanel(panelId, mode, onPick) {
  // If same panel already open — close it (but not if native color picker is open)
  if (_cpActivePanelId === panelId) {
    if (window._cpNativeOpen) return;
    closeColorPanel(panelId);
    return;
  }
  // Close previously open panel
  if (_cpActivePanelId) closeColorPanel(_cpActivePanelId);
  _cpActivePanelId = panelId;
  _cpActiveMode = mode;
  _cpActiveOnPick = onPick;

  _cpRenderPanel(panelId, mode, onPick);
}

/** Rebuild the currently open palette with the active theme colors. */
function refreshOpenColorPanel() {
  if (!_cpActivePanelId || typeof _cpActiveOnPick !== 'function') return;
  const panelId = _cpActivePanelId;
  const mode = _cpActiveMode;
  const onPick = _cpActiveOnPick;
  // Keep panel open — just rebuild contents for the new scheme
  _cpRenderPanel(panelId, mode, onPick);
}
window.refreshOpenColorPanel = refreshOpenColorPanel;

function _cpRenderPanel(panelId, mode, onPick) {
  const slot = document.getElementById(panelId);
  if (!slot) return;
  slot.innerHTML = '';
  slot.style.display = 'block';
  // Prevent any click inside the panel from stealing focus from the text element
  slot.onmousedown = e => e.preventDefault();

  const schemeIdx = (typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0)
    ? appliedThemeIdx
    : ((typeof selTheme !== 'undefined' && selTheme >= 0) ? selTheme : -1);

  // ── Scheme grid: 8 cols × 9 lightness rows (0.1…0.9) ──
  // Position codes shown in the hex input field, not above the grid.
  if (schemeIdx >= 0 && THEMES[schemeIdx]) {
    const t = THEMES[schemeIdx];
    const levels = (typeof SCHEME_TINT_LEVELS !== 'undefined' && SCHEME_TINT_LEVELS)
      ? SCHEME_TINT_LEVELS : [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const nCols = _themeColors(t).length;

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(8,1fr);gap:1px;margin-bottom:8px;';

    for (let rowIdx = 0; rowIdx < levels.length; rowIdx++) {
      for (let colIdx = 0; colIdx < nCols; colIdx++) {
        const color = _schemeSwatchColor(t, colIdx, rowIdx);
        const pos = _schemePosCode(colIdx, rowIdx);
        const s = document.createElement('div');
        // Half-height rectangles (same width as before via grid column)
        s.style.cssText = 'aspect-ratio:2/1;border-radius:2px;cursor:pointer;background:'+color+';min-height:6px;';
        s.title = pos + ' · ' + color;
        s.onmouseover = () => { s.style.outline = '2px solid var(--accent)'; };
        s.onmouseout  = () => { s.style.outline = ''; };
        s.onmousedown = e => { e.preventDefault(); e.stopPropagation();
          onPick(color, {col: colIdx, row: rowIdx}); closeColorPanel(panelId); };
        grid.appendChild(s);
      }
    }
    slot.appendChild(grid);
  }

  // ── Custom color: full-width bar (same inset as palette via .cp-slot padding) ──
  const customSwatch = document.createElement('div');
  customSwatch.id = panelId + '-swatch';
  customSwatch.title = 'Свой цвет';
  customSwatch.style.cssText = 'width:100%;height:14px;border-radius:3px;border:1px solid var(--border2);background:#3b82f6;cursor:pointer;box-sizing:border-box;';
  slot.appendChild(customSwatch);

  const pickerWrap = document.createElement('div');
  pickerWrap.style.cssText = 'display:none;margin-top:8px;';
  slot.appendChild(pickerWrap);

  let pickerOpen = false;
  customSwatch.onmousedown = e => {
    e.preventDefault(); e.stopPropagation();
    pickerOpen = !pickerOpen;
    pickerWrap.style.display = pickerOpen ? 'block' : 'none';
    if (pickerOpen) {
      _cpBuildPhotoshopPicker(pickerWrap, customSwatch, (hex, schemeRef) => {
        onPick(hex, schemeRef);
      }, panelId);
    }
  };
}

// ── Photoshop-style HSV colour picker ────────────────────────────────
function _cpBuildPhotoshopPicker(container, swatchEl, onPick, panelId) {
  container.innerHTML = '';

  // ── Размеры ──
  const SIZE = 180, RING = 15;
  const cx = SIZE / 2, cy = SIZE / 2;
  const Ro = SIZE / 2 - 2;   // внешний радиус кольца
  const Ri = Ro - RING;      // внутренний радиус кольца
  const Tr = Ri - 5;         // радиус описанной окружности треугольника

  // ── Canvas ──
  const cv = document.createElement('canvas');
  cv.width = SIZE; cv.height = SIZE;
  cv.style.cssText = 'display:block;margin:0 auto;cursor:crosshair;touch-action:none;border-radius:50%;';
  container.appendChild(cv);
  const ctx = cv.getContext('2d');

  // ── Hex-поле ──
  const hexRow = document.createElement('div');
  hexRow.style.cssText = 'display:flex;align-items:center;gap:5px;margin-top:8px;';
  const hexHash = document.createElement('span');
  hexHash.textContent = '#';
  hexHash.style.cssText = 'font-size:12px;color:var(--text3);font-family:monospace;font-weight:600;';
  const hexInp = document.createElement('input');
  hexInp.type = 'text'; hexInp.maxLength = 6; hexInp.spellcheck = false;
  hexInp.style.cssText = 'flex:1;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:4px;padding:4px 7px;font-size:12px;font-family:monospace;letter-spacing:1px;';
  hexInp.placeholder = 'RRGGBB';
  hexRow.appendChild(hexHash);
  hexRow.appendChild(hexInp);
  container.appendChild(hexRow);

  // ── State ──
  let hue = 210, sat = 0.65, val = 0.9;

  // ── Vertices: v0=white(top), v1=black(bottom-left), v2=hue(bottom-right) ──
  // Fixed orientation: white at top, rotated with hue
  function triVerts() {
    const a0 = (hue - 90) * Math.PI / 180;
    return [0, 1, 2].map(i => {
      const a = a0 + i * 2 * Math.PI / 3;
      return [cx + Tr * Math.cos(a), cy + Tr * Math.sin(a)];
    });
  }

  // ── HSV ↔ RGB ──
  function hsv2rgb(h, s, v) {
    const i = Math.floor(h / 60) % 6;
    const f = h / 60 - Math.floor(h / 60);
    const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    return [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i].map(c => Math.round(c * 255));
  }
  function rgb2hex(r, g, b) {
    return '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join('');
  }
  function hex2hsv(hex) {
    const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx - mn;
    let h = 0;
    if (d > 0) {
      if (mx === r) h = ((g - b) / d + 6) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, mx ? d / mx : 0, mx];
  }

  // ── Draw hue ring via ImageData (плавный, без полосок) ──
  function drawRing() {
    const img = ctx.createImageData(SIZE, SIZE);
    const data = img.data;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = x - cx, dy = y - cy;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < Ri - 0.5 || d > Ro + 0.5) continue;
        const h = ((Math.atan2(dy, dx) * 180 / Math.PI) + 90 + 360) % 360;
        // Anti-alias at edges
        let alpha = 1;
        if (d < Ri + 0.5) alpha = d - (Ri - 0.5);
        else if (d > Ro - 0.5) alpha = Ro + 0.5 - d;
        alpha = Math.max(0, Math.min(1, alpha));
        const [r,g,b] = hsv2rgb(h, 1, 1);
        const idx = (y * SIZE + x) * 4;
        data[idx]   = r;
        data[idx+1] = g;
        data[idx+2] = b;
        data[idx+3] = Math.round(alpha * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // ── Draw triangle via canvas gradients (надёжно, без артефактов) ──
  function drawTriangle() {
    const [v0, v1, v2] = triVerts(); // v0=white, v1=black, v2=hue
    const [hr, hg, hb] = hsv2rgb(hue, 1, 1);
    const hueColor = `rgb(${hr},${hg},${hb})`;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(v0[0], v0[1]);
    ctx.lineTo(v1[0], v1[1]);
    ctx.lineTo(v2[0], v2[1]);
    ctx.closePath();
    ctx.clip();

    // Слой 1: градиент от белого (v0) до чистого оттенка (v2)
    const g1 = ctx.createLinearGradient(v0[0], v0[1], v2[0], v2[1]);
    g1.addColorStop(0, '#ffffff');
    g1.addColorStop(1, hueColor);
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Слой 2: градиент от прозрачного (v0) до чёрного (v1), перпендикулярно
    const g2 = ctx.createLinearGradient(v0[0], v0[1], v1[0], v1[1]);
    g2.addColorStop(0, 'rgba(0,0,0,0)');
    g2.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.restore();
  }

  // ── Draw indicators ──
  function drawHueIndicator() {
    const ha = (hue - 90) * Math.PI / 180;
    const hx = cx + (Ri + RING/2) * Math.cos(ha);
    const hy = cy + (Ri + RING/2) * Math.sin(ha);
    const r = RING / 2 - 1;
    ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI*2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  }

  function drawSVIndicator() {
    const [v0,v1,v2] = triVerts(); // v0=white, v1=black, v2=hue
    // Позиция = линейная интерполяция барицентрических весов:
    // b0=white=(1-sat)*val, b1=black=(1-sat)*(1-val), b2=hue=sat
    // b2=sat, b0=val-sat, b1=1-val
    const b2 = sat;
    const b0 = val - sat;
    const b1 = 1 - val;
    const px = b0*v0[0] + b1*v1[0] + b2*v2[0];
    const py = b0*v0[1] + b1*v1[1] + b2*v2[1];

    // Тень
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    // Белый круг
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI*2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    // Цветная точка
    const [r,g,b] = hsv2rgb(hue, sat, val);
    ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI*2);
    ctx.fillStyle = rgb2hex(r,g,b); ctx.fill();
  }

  // ── Full redraw — кольцо кэшируем, треугольник перерисовываем ──
  let ringCache = null;
  function draw() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (!ringCache) {
      // Рисуем кольцо один раз в offscreen canvas
      const off = document.createElement('canvas');
      off.width = SIZE; off.height = SIZE;
      const offCtx = off.getContext('2d');
      const img = offCtx.createImageData(SIZE, SIZE);
      const data = img.data;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const dx = x-cx, dy = y-cy, d = Math.sqrt(dx*dx+dy*dy);
          if (d < Ri-0.5 || d > Ro+0.5) continue;
          const h = ((Math.atan2(dy,dx)*180/Math.PI)+90+360)%360;
          let alpha = 1;
          if (d < Ri+0.5) alpha = d-(Ri-0.5);
          else if (d > Ro-0.5) alpha = Ro+0.5-d;
          alpha = Math.max(0,Math.min(1,alpha));
          const [r,g,b] = hsv2rgb(h,1,1);
          const idx=(y*SIZE+x)*4;
          data[idx]=r; data[idx+1]=g; data[idx+2]=b; data[idx+3]=Math.round(alpha*255);
        }
      }
      offCtx.putImageData(img,0,0);
      ringCache = off;
    }
    ctx.drawImage(ringCache, 0, 0);
    drawTriangle();
    drawHueIndicator();
    drawSVIndicator();
  }

  // ── Emit colour ──
  function emit() {
    const [r,g,b] = hsv2rgb(hue, sat, val);
    const hex = rgb2hex(r,g,b);
    hexInp.value = hex.slice(1).toUpperCase();
    if (swatchEl) swatchEl.style.background = hex;
    onPick(hex, null);
  }

  // ── Hit testing ──
  function ptInRing(x,y){ const d=Math.hypot(x-cx,y-cy); return d>=Ri-1&&d<=Ro+1; }
  function ptInTri(x,y){
    // Используем те же барицентрики — точка в треугольнике если все b>=0
    const [v0,v1,v2]=triVerts();
    const d=(v1[1]-v2[1])*(v0[0]-v2[0])+(v2[0]-v1[0])*(v0[1]-v2[1]);
    if(Math.abs(d)<0.001) return false;
    const b0=((v1[1]-v2[1])*(x-v2[0])+(v2[0]-v1[0])*(y-v2[1]))/d;
    const b1=((v2[1]-v0[1])*(x-v2[0])+(v0[0]-v2[0])*(y-v2[1]))/d;
    const b2=1-b0-b1;
    return b0>=-0.02&&b1>=-0.02&&b2>=-0.02; // чуть шире для удобства
  }
  function applyRing(x,y){ hue=((Math.atan2(y-cy,x-cx)*180/Math.PI)+90+360)%360; }
  function applyTri(x,y){
    const [v0,v1,v2]=triVerts(); // v0=white, v1=black, v2=hue
    // Барицентрические координаты через систему уравнений
    const d=(v1[1]-v2[1])*(v0[0]-v2[0])+(v2[0]-v1[0])*(v0[1]-v2[1]);
    if(Math.abs(d)<0.001) return;
    let b0=((v1[1]-v2[1])*(x-v2[0])+(v2[0]-v1[0])*(y-v2[1]))/d;
    let b1=((v2[1]-v0[1])*(x-v2[0])+(v0[0]-v2[0])*(y-v2[1]))/d;
    let b2=1-b0-b1;
    // Зажимаем внутрь треугольника: нормализуем отрицательные веса
    b0=Math.max(0,b0); b1=Math.max(0,b1); b2=Math.max(0,b2);
    const sum=b0+b1+b2;
    if(sum<0.0001) return;
    b0/=sum; b1/=sum; b2/=sum;
    // v0=white(sat=0,val=1), v1=black(sat=0,val=0), v2=hue(sat=1,val=1)
    // sat = b2,  val = b0 + b2
    sat = Math.max(0, Math.min(1, b2));
    val = Math.max(0, Math.min(1, b0 + b2));
  }

  // ── Pointer events с RAF ──
  let dragging = null, rafId = null;
  function getPos(e){ const r=cv.getBoundingClientRect(); const s=e.touches?e.touches[0]:e; return [s.clientX-r.left,s.clientY-r.top]; }

  cv.addEventListener('mousedown', e=>{
    e.preventDefault(); e.stopPropagation();
    const [x,y]=getPos(e);
    if(ptInRing(x,y)) dragging='ring';
    else if(ptInTri(x,y)) dragging='tri';
    else return;
    if(dragging==='ring') applyRing(x,y); else applyTri(x,y);
    if(rafId) cancelAnimationFrame(rafId);
    rafId=requestAnimationFrame(()=>{ draw(); emit(); rafId=null; });
  });

  const onMove = e=>{
    if(!dragging) return;
    const [x,y]=getPos(e);
    if(dragging==='ring') applyRing(x,y); else applyTri(x,y);
    if(!rafId) rafId=requestAnimationFrame(()=>{ draw(); emit(); rafId=null; });
  };
  const onUp = ()=>{ dragging=null; };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);

  // Cleanup при закрытии панели
  const origClose = window._cpCleanup;
  window._cpCleanup = ()=>{
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    if(rafId) cancelAnimationFrame(rafId);
    if(origClose) origClose();
    window._cpCleanup = origClose;
  };

  // ── Hex input ──
  hexInp.addEventListener('keydown', e=>e.stopPropagation());
  hexInp.addEventListener('mousedown', e=>e.stopPropagation());
  hexInp.addEventListener('input', e=>{
    let v=e.target.value.replace(/[^0-9a-fA-F]/g,'');
    if(v.length>6) v=v.slice(0,6);
    e.target.value=v;
    if(v.length===6){
      [hue,sat,val]=hex2hsv('#'+v);
      if(rafId) cancelAnimationFrame(rafId);
      rafId=requestAnimationFrame(()=>{ draw(); emit(); rafId=null; });
    }
  });

  // ── Init ──
  if(swatchEl){
    const bg=swatchEl.style.background;
    if(bg&&bg.match(/^#[0-9a-fA-F]{6}$/)) [hue,sat,val]=hex2hsv(bg);
  }
  draw(); emit();
}

function closeColorPanel(panelId) {
  if (typeof window._cpCleanup === 'function') { window._cpCleanup(); }
  const slot = document.getElementById(panelId || _cpActivePanelId);
  if (slot) { slot.innerHTML = ''; slot.style.display = 'none'; }
  if (!panelId || panelId === _cpActivePanelId) {
    _cpActivePanelId = null;
    _cpActiveMode = null;
    _cpActiveOnPick = null;
  }
}

function _blendToWhite(hex, amt) {
  let r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  r=Math.round(r+(255-r)*amt); g=Math.round(g+(255-g)*amt); b=Math.round(b+(255-b)*amt);
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function _blendToBlack(hex, amt) {
  let r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  r=Math.round(r*(1-amt)); g=Math.round(g*(1-amt)); b=Math.round(b*(1-amt));
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function _solidColor(bg) {
  if (!bg) return '#888888';
  if (bg.startsWith('#')) return bg;
  const m = bg.match(/#[0-9a-fA-F]{6}/);
  return m ? m[0] : '#888888';
}

// buildPalette — builds the 8 base-color swatch strip shown always in props
// (the full grid appears in the color-panel-slot when user clicks a swatch)
function buildPalette(targetId, mode) {
  const c = document.getElementById(targetId); if (!c) return;
  c.innerHTML = '';
  c.style.display = 'none'; // legacy strip hidden — slots handle it now
}


function addRecentColor(c){
  recentColors=recentColors.filter(x=>x!==c);recentColors.unshift(c);recentColors=recentColors.slice(0,10);
}
function applyTextColor(c, schemeRef){
  if(!sel||sel.dataset.type!=='text')return;
  const d = slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  // When text color gradient is on — main picker sets color 1
  if(sel.dataset.textColorGrad==='1'){
    sel.dataset.textColorGrad1=c;
    if(d){d.textColorGrad1=c;}
    if(typeof applyTextColorGrad==='function')applyTextColorGrad(sel);
    try{const _sw=document.getElementById('p-col-preview');if(_sw)_sw.style.background=c;document.getElementById('p-hex').value=(typeof _colorFieldDisplay==='function')?_colorFieldDisplay(c,schemeRef||null):c;}catch(e){}
    save();saveState();
    return;
  }
  // Check if there's an active fragment selection
  const _wSel = window.getSelection();
  const _hasFragSel = _wSel && !_wSel.isCollapsed && _wSel.toString().length > 0;
  const _hasSavedSel = typeof _savedSelIdx !== 'undefined' && !!_savedSelIdx;
  const _isFragment = _hasFragSel || _hasSavedSel;
  // Only update element-level textColorScheme when coloring the whole element
  // When coloring a fragment, per-char data-scheme handles it
  if(d && !_isFragment) d.textColorScheme = schemeRef || null;
  if(typeof rtColor==='function'){
    if(typeof _rtColorPickInProgress!=='undefined') _rtColorPickInProgress=true;
    rtColor(c, schemeRef || null);
    if(typeof _rtColorPickInProgress!=='undefined') _rtColorPickInProgress=false;
  } else setTS('color',c);
  try{const _sw=document.getElementById('p-col-preview');if(_sw)_sw.style.background=c;document.getElementById('p-hex').value=(typeof _colorFieldDisplay==='function')?_colorFieldDisplay(c,(!_isFragment&&d)?d.textColorScheme:(schemeRef||null)):c;}catch(e){}
}
function applyFillColor(c, schemeRef){
  if(!sel)return;
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(!d||d.type!=='shape')return;
  if(typeof _cloudSyncMeta==='function'){
    const sh=typeof SHAPES!=='undefined'?SHAPES.find(s=>s.id===d.shape):null;
    if(sh&&sh.special==='cloud') _cloudSyncMeta(sel,d);
  }
  d.fill=c; d.fillScheme = schemeRef || null; sel.dataset.fill=c;
  try{
    const _fsw=document.getElementById('sh-fill-preview');if(_fsw)_fsw.style.background=c;
    document.getElementById('sh-fill-hex').value=(typeof _colorFieldDisplay==='function')?_colorFieldDisplay(c,schemeRef||null):c;
  }catch(e){}
  renderShapeEl(sel,d);save();saveState();
}

// ── Esc closes whichever modal/panel is currently open ──
// Each modal below toggles visibility via the '.open' class (a couple use an
// inline style too, but always alongside that class), so checking for it is
// a reliable, uniform way to know what's currently showing.
document.addEventListener('keydown', function(e){
  if(e.key!=='Escape') return;
  // Never interfere with the presentation overlay — it has its own capturing
  // Escape handler (_attachPreviewExitHandlers) that runs first and stops
  // propagation while active, so by the time we get here it's not showing.
  const ov=document.getElementById('preview-ov');
  if(ov&&ov.classList.contains('active')) return;

  let closedSomething=false;

  // Generic pass: EVERY modal in this app (shape/icon/applet/svg/img/layout/
  // theme/link/htmlframe/code/md/...) toggles visibility purely via the
  // '.open' class on a '.modal-ov' wrapper, plus a couple of extra panels
  // that use '.open' on their own id. Rather than hard-coding every modal id
  // (easy to miss one — new modals get added over time), just find whatever
  // is currently showing and close it. Where a dedicated close function
  // exists we call it (it may also reset some extra state, e.g. a selected
  // path), otherwise removing '.open' is exactly what these modals' own
  // Cancel/× buttons do, so it's always a safe, correct fallback.
  const namedClosers = {
    'img-modal':       ()=>typeof closeImageModal==='function'&&closeImageModal(),
    'svg-modal':       ()=>typeof _closeSvgModal==='function'&&_closeSvgModal(),
    'layout-modal':    ()=>typeof closeLayoutModal==='function'&&closeLayoutModal(),
    'theme-modal':     ()=>typeof closeThemeModal==='function'&&closeThemeModal(),
    'link-modal':      ()=>typeof window.closeLinkModal==='function'&&window.closeLinkModal(),
    'settings-modal':  ()=>typeof closeSettings==='function'&&closeSettings(),
    'local-ai-modal':  ()=>typeof window.closeLocalAIModal==='function'&&window.closeLocalAIModal(),
    'ai-panel':        ()=>typeof window.closeAIPanel==='function'&&window.closeAIPanel(),
  };
  document.querySelectorAll('.open').forEach(elOpen=>{
    const id=elOpen.id;
    const isModalLike = elOpen.classList.contains('modal-ov') || id==='settings-modal' || id==='local-ai-modal' || id==='ai-panel';
    if(!isModalLike) return;
    const closer=id&&namedClosers[id];
    if(closer) closer();
    else elOpen.classList.remove('open');
    closedSomething=true;
  });

  // Anim panel doesn't use the '.open' class — it's shown/hidden via display.
  const animWrap=document.getElementById('props-anim-wrap');
  if(animWrap&&animWrap.style.display==='flex'&&typeof window.closeAnimPanel==='function'){
    window.closeAnimPanel(); closedSomething=true;
  }

  // Any open inline color picker panel.
  if(typeof _cpActivePanelId!=='undefined'&&_cpActivePanelId&&typeof closeColorPanel==='function'){
    closeColorPanel(); closedSomething=true;
  }

  if(closedSomething){ e.stopPropagation(); e.preventDefault(); }
}, true);
