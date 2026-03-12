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
    const editing = document.querySelector('.shape-text[contenteditable="true"]');
    if(editing){
      editing.contentEditable='false';
      editing.style.pointerEvents='none';
      const elP=editing.closest('[data-type="shape"]');
      if(elP) elP.dataset.editing='false';
      if(typeof commitAll==='function') commitAll();
    }
  };

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
    // Exit shape text editing
    if(sel.dataset.type==='shape'){
      window._blurActiveShapeText();
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
  if(!slides.length){
    addSlide();
    // First launch — apply first theme automatically
    _applyThemeByIdx(0);
  }
  renderAll();
  // Restore page numbering UI after everything is rendered
  if(typeof pnSyncUI==='function') pnSyncUI();
  if(typeof pnApplyAll==='function') pnApplyAll();
  toast(APP_NAME+' v'+APP_VERSION+' · Ctrl+Z · F5','ok');
}

function newPresentation(){
  if(!confirm(t('confirmNewPresentation')||'Создать новую презентацию? Текущая будет потеряна.'))return;
  // Clear state
  slides=[];cur=0;
  document.getElementById('pres-title').value='';
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
  if(typeof refreshDecorColors==='function')refreshDecorColors(theme.ac1||'#6366f1',theme.ac2||'#818cf8',true);
  if(typeof refreshAppletThemes==='function')refreshAppletThemes();
  if(typeof refreshAllCodeBlocks==='function')refreshAllCodeBlocks();
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

    // "No theme" card — only in first section
    if(label===t('darkThemes')||(!THEMES.some(x=>x.dark!==false))){
    }

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

      // 7 colour strips — vertical rectangles side by side, bottom-right corner
      const swatches=document.createElement('div');
      swatches.style.cssText='position:absolute;bottom:20px;right:5px;display:flex;flex-direction:row;gap:2px;align-items:flex-end;';
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

      card.append(bg,mock,swatches,lbl);
      card.onclick=()=>{selTheme=i;applyTheme();buildThemeGrid();};
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
    else if(s.special==='ellipse'){el=document.createElementNS('http://www.w3.org/2000/svg','ellipse');el.setAttribute('cx','50');el.setAttribute('cy','50');el.setAttribute('rx','45');el.setAttribute('ry','45');}
    else if(s.special==='callout'){el=document.createElementNS('http://www.w3.org/2000/svg','path');el.setAttribute('d','M 5 5 H 95 V 72 H 57 L 50 92 L 44 72 H 5 Z');}
    else{el=document.createElementNS('http://www.w3.org/2000/svg','path');el.setAttribute('d',s.path);}
    const _smFill=document.getElementById('sm-fill');const _fc=(_smFill&&_smFill.value)||'#3b82f6';
    el.setAttribute('fill',_fc);el.setAttribute('stroke','none');el.classList.add('sg-fill');svg.appendChild(el);
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
    const isRu=typeof getLang==='function'&&getLang()==='ru';
    const card=document.createElement('div');card.className='applet-card';
    card.innerHTML='<div class="ac-icon">'+a.icon+'</div><div class="ac-name">'+(isRu&&a.nameRu?a.nameRu:a.name)+'</div>';
    card.title=isRu&&a.descRu?a.descRu:a.desc;
    card.onclick=()=>{insertApplet(a);document.getElementById('applet-modal').classList.remove('open');};
    g.appendChild(card);
  });
}
// ── Inline colour panel (expands inside props panel) ────────────
// Trigger: openColorPanel(panelId, mode, onPick)
// panelId = id of the <div class="color-panel-slot"> in props HTML
// The slot div expands/collapses inline — no popup.

let _cpActivePanelId = null;

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

  const slot = document.getElementById(panelId);
  if (!slot) return;
  slot.innerHTML = '';
  slot.style.display = 'block';
  // Prevent any click inside the panel from stealing focus from the text element
  slot.onmousedown = e => e.preventDefault();

  const schemeIdx = (typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0)
    ? appliedThemeIdx
    : ((typeof selTheme !== 'undefined' && selTheme >= 0) ? selTheme : -1);

  // ── Scheme grid: 8 cols × 6 tint rows ────────────────────────
  if (schemeIdx >= 0 && THEMES[schemeIdx]) {
    const t = THEMES[schemeIdx];
    const isLightTheme = !t.dark;
    const base8 = _themeColors(t);
    // Last column: light themes use white→black, dark themes use black→white
    if (isLightTheme) base8[base8.length - 1] = '#ffffff';

    const hdr = document.createElement('div');
    hdr.style.cssText = 'font-size:9px;color:var(--text3);margin-bottom:5px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;';
    hdr.textContent = t.name;
    slot.appendChild(hdr);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(8,1fr);gap:2px;margin-bottom:8px;';

    // Last column: dark themes = white→black, light themes = black→white
    const tintLevels = [0, 0.22, 0.44, 0.66, 0.88];
    tintLevels.forEach((tint, rowIdx) => {
      base8.forEach((baseHex, colIdx) => {
        const isLastCol = colIdx === base8.length - 1;
        let color;
        if (isLastCol) {
          // Dark theme: row 0=white, row 4=black
          // Light theme: row 0=black, row 4=white
          if (isLightTheme) {
            const isLastRow = rowIdx === tintLevels.length - 1;
            color = isLastRow ? '#ffffff' : (tint === 0 ? '#000000' : _blendToWhite('#000000', tint));
          } else {
            color = tint === 0 ? '#ffffff' : _blendToBlack('#ffffff', tint);
          }
        } else {
          const hex = _solidColor(baseHex);
          color = tint === 0 ? hex : _blendToWhite(hex, tint);
        }
        const s = document.createElement('div');
        s.style.cssText = 'aspect-ratio:1;border-radius:2px;cursor:pointer;background:'+color+';min-height:14px;';
        s.title = color;
        s.onmouseover = () => s.style.outline = '2px solid var(--accent)';
        s.onmouseout  = () => s.style.outline = '';
        s.onmousedown = e => { e.preventDefault(); e.stopPropagation();
          onPick(color, {col: colIdx, row: rowIdx}); closeColorPanel(panelId); };
        grid.appendChild(s);
      });
    });
    slot.appendChild(grid);
  }

  // ── Custom color row ──────────────────────────────────────────
  const sep = document.createElement('div');
  sep.style.cssText = 'height:1px;background:var(--border);margin:2px 0 7px;';
  slot.appendChild(sep);

  const customRow = document.createElement('div');
  customRow.style.cssText = 'display:flex;align-items:center;gap:7px;position:relative;';
  const customLbl = document.createElement('span');
  customLbl.style.cssText = 'font-size:10px;color:var(--text2);flex:1;cursor:pointer;';
  customLbl.textContent = 'Выбрать свой цвет';
  const customInput = document.createElement('input');
  customInput.type = 'color';
  customInput.value = '#3b82f6';
  customInput.style.cssText = 'position:absolute;right:0;bottom:28px;width:0;height:0;opacity:0;pointer-events:none;';
  customInput.onmousedown = e => e.stopPropagation();
  customInput.onchange = e => { onPick(e.target.value, null); closeColorPanel(panelId); };
  customInput.oninput = e => { onPick(e.target.value, null); };
  const customBtn = document.createElement('div');
  customBtn.style.cssText = 'width:24px;height:24px;border-radius:3px;border:1px solid var(--border2);cursor:pointer;background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);';
  customBtn.title = 'Выбрать свой цвет';
  customBtn.onmousedown = e => { e.preventDefault(); e.stopPropagation(); window._cpNativeOpen = true; customInput.click(); requestAnimationFrame(()=>{ window._cpNativeOpen = false; }); };
  customRow.appendChild(customLbl);
  customRow.appendChild(customInput);
  customRow.appendChild(customBtn);
  slot.appendChild(customRow);
}

function closeColorPanel(panelId) {
  const slot = document.getElementById(panelId || _cpActivePanelId);
  if (slot) { slot.innerHTML = ''; slot.style.display = 'none'; }
  if (!panelId || panelId === _cpActivePanelId) _cpActivePanelId = null;
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
  // Store scheme ref on data element
  const d = slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(d) d.textColorScheme = schemeRef || null;
  // Pass schemeRef directly to rtColor so per-char spans get data-scheme
  if(typeof rtColor==='function'){
    if(typeof _rtColorPickInProgress!=='undefined') _rtColorPickInProgress=true;
    rtColor(c, schemeRef || null);
    if(typeof _rtColorPickInProgress!=='undefined') _rtColorPickInProgress=false;
  } else setTS('color',c);
  try{const _sw=document.getElementById('p-col-preview');if(_sw)_sw.style.background=c;document.getElementById('p-hex').value=c;}catch(e){}
}
function applyFillColor(c, schemeRef){
  if(!sel)return;
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(!d||d.type!=='shape')return;
  d.fill=c; d.fillScheme = schemeRef || null; sel.dataset.fill=c;
  try{const _fsw=document.getElementById('sh-fill-preview');if(_fsw)_fsw.style.background=c;document.getElementById('sh-fill-hex').value=c;}catch(e){}
  renderShapeEl(sel,d);save();saveState();
}
