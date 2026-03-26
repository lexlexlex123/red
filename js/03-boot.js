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
  // drawGrid после двух rAF — гарантирует что layout завершён и clientWidth корректен
  requestAnimationFrame(()=>requestAnimationFrame(()=>drawGrid()));
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
  // Sync animation toggle UI state after restore
  if(typeof _syncAnimToggleBtns==='function') _syncAnimToggleBtns();
  if(typeof _updateAnimToggleVisibility==='function') _updateAnimToggleVisibility();
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

  // ── Custom color picker toggle ───────────────────────────────
  const sep = document.createElement('div');
  sep.style.cssText = 'height:1px;background:var(--border);margin:4px 0 6px;';
  slot.appendChild(sep);

  // Toggle button row
  const customRow = document.createElement('div');
  customRow.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;padding:2px 0;';
  const customLbl = document.createElement('span');
  customLbl.style.cssText = 'font-size:10px;color:var(--text2);flex:1;';
  customLbl.textContent = 'Свой цвет';
  const customSwatch = document.createElement('div');
  customSwatch.id = panelId + '-swatch';
  customSwatch.style.cssText = 'width:22px;height:14px;border-radius:3px;border:1px solid var(--border2);background:#3b82f6;flex-shrink:0;';
  const customArrow = document.createElement('span');
  customArrow.textContent = '▸';
  customArrow.style.cssText = 'font-size:9px;color:var(--text3);transition:transform .15s;';
  customRow.appendChild(customLbl);
  customRow.appendChild(customSwatch);
  customRow.appendChild(customArrow);
  slot.appendChild(customRow);

  // Photoshop-style picker container (hidden by default)
  const pickerWrap = document.createElement('div');
  pickerWrap.style.cssText = 'display:none;margin-top:8px;';
  slot.appendChild(pickerWrap);

  let pickerOpen = false;
  customRow.onmousedown = e => {
    e.preventDefault(); e.stopPropagation();
    pickerOpen = !pickerOpen;
    pickerWrap.style.display = pickerOpen ? 'block' : 'none';
    customArrow.style.transform = pickerOpen ? 'rotate(90deg)' : '';
    if (pickerOpen) _cpBuildPhotoshopPicker(pickerWrap, customSwatch, onPick, panelId);
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
  const d = slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
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
