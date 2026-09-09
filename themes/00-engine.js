// ══════════════ LAYOUT DECOR ENGINE ══════════════
let selLayout=-1;
let _layoutAnimated=true;
const _decorPausedAt = new Map();
// LAYOUTS[] — собирается в themes/loader.js после загрузки всех тем
function _activeTheme(){
  const ti = (typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0) ? appliedThemeIdx
    : ((typeof selTheme !== 'undefined' && selTheme >= 0) ? selTheme : -1);
  return (ti >= 0 && typeof THEMES !== 'undefined') ? THEMES[ti] : null;
}

/** Push scheme background onto slides (same look as colour-scheme thumbnails). */
function _syncSlidesThemeBg(opts){
  const theme = _activeTheme();
  if(!theme || typeof slides === 'undefined' || !slides) return;
  const force = !!(opts && opts.force);
  const onlyNotebook = !!(opts && opts.onlyNotebook);
  let changed = false;
  slides.forEach(s=>{
    if(onlyNotebook){
      const hasNb = (s.els || []).some(d=>{
        if(!d || !d._isDecor) return false;
        const L = LAYOUTS[d._layoutIdx];
        return !!(L && L.paper);
      });
      if(!hasNb) return;
    }
    if(!force && s.bgScheme === null) return;
    s.bg = 'custom';
    s.bgc = theme.bg;
    if(force && 'bgScheme' in s) delete s.bgScheme;
    changed = true;
  });
  if(changed && typeof _applySlideBgToEl === 'function'){
    const cvbg = document.getElementById('cvbg');
    if(cvbg && typeof cur === 'number' && slides[cur]) _applySlideBgToEl(cvbg, slides[cur]);
  }
}

/** Resolve notebook stroke colours from the active colour scheme (palette «16»). */
function _notebookSchemeColors(a1, a2){
  const theme = _activeTheme();
  const isLight = !!(theme && theme.dark === false);
  const fallback1 = a1 || (isLight ? '#cbd5e1' : '#475569');
  // Палитра «16» = col0,row5
  let lineCol = fallback1;
  if(theme && typeof _schemeSwatchColor === 'function'){
    const c16 = _schemeSwatchColor(theme, 0, 5);
    if(c16) lineCol = c16;
  }
  const lineCol2 = lineCol;
  const lineOp = isLight ? 0.5 : 0.4;
  const bgCss = (theme && theme.bg) ? theme.bg : (isLight ? '#f8fafc' : '#0f172a');
  return { theme, isLight, lineCol, lineCol2, lineOp, bgCss };
}

/** Edge fade via SVG mask (lines → transparent). No solid overlays → no colour patches. */
function _notebookEdgeMaskDefs(uid, w, h, fade){
  const fPct = Math.max(4, Math.min(18, Math.round((fade != null ? fade : 0.08) * 100)));
  return `<defs>
    <linearGradient id="${uid}fx" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="${fPct}%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="${100 - fPct}%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${uid}fy" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="${fPct}%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="${100 - fPct}%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="${uid}mx" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">
      <rect width="${w}" height="${h}" fill="url(#${uid}fx)"/>
    </mask>
    <mask id="${uid}my" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">
      <rect width="${w}" height="${h}" fill="url(#${uid}fy)"/>
    </mask>
  </defs>`;
}

/** Coordinate axes on grid (unit = one cell). Modes: axes-center | axes-q1 | axes-q1inv | axes-q1right */
function _notebookAxesOverlay(w, h, cell, axesMode, axisCol){
  if(!axesMode || !cell || cell <= 0) return '';
  const f = n => n.toFixed(1);
  const snap = v => Math.max(0, Math.min(w, Math.round(v / cell) * cell));
  const snapY = v => Math.max(0, Math.min(h, Math.round(v / cell) * cell));
  const margin = cell;
  const tick = Math.max(3, cell * 0.18);
  const swA = Math.max(1.2, cell * 0.06);
  const ah = Math.max(5, cell * 0.28);
  const axOp = 0.48; // полупрозрачные оси

  let ox, oy;
  let xMin, xMax, yMin, yMax;
  let xPosRight = true;
  let yPosDown = false;

  if(axesMode === 'axes-center'){
    ox = snap(w * 0.5); oy = snapY(h * 0.5);
    xMin = 0; xMax = w; yMin = 0; yMax = h;
    xPosRight = true; yPosDown = false;
  } else if(axesMode === 'axes-q1'){
    ox = snap(margin); oy = snapY(h - margin);
    xMin = ox; xMax = w; yMin = 0; yMax = oy;
    xPosRight = true; yPosDown = false;
  } else if(axesMode === 'axes-q1inv'){
    ox = snap(margin); oy = snapY(margin);
    xMin = ox; xMax = w; yMin = oy; yMax = h;
    xPosRight = true; yPosDown = true;
  } else if(axesMode === 'axes-q1right'){
    // I четверть справа: начало на середине, на 3 клетки выше низа
    ox = snap(w * 0.5); oy = snapY(h - margin - 3 * cell);
    if(ox < margin) ox = snap(margin);
    if(oy < margin) oy = snap(margin);
    if(oy > h - margin) oy = snapY(h - margin);
    xMin = ox; xMax = w; yMin = 0; yMax = oy;
    xPosRight = true; yPosDown = false;
  } else {
    return '';
  }

  const uid = 'ax' + Math.random().toString(36).slice(2, 7);
  const col = axisCol || '#1e293b';
  const fs = Math.max(9, cell * 0.36);
  const fsAxis = Math.max(10, cell * 0.42);

  function arrow(x1, y1, x2, y2){
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len, uy = dy / len;
    const bx = x2 - ux * ah, by = y2 - uy * ah;
    const px = -uy * (ah * 0.45), py = ux * (ah * 0.45);
    return `<polygon points="${f(x2)},${f(y2)} ${f(bx+px)},${f(by+py)} ${f(bx-px)},${f(by-py)}" fill="${col}" fill-opacity="${axOp}"/>`;
  }

  let axes = '';
  axes += `<line x1="${f(xMin)}" y1="${f(oy)}" x2="${f(xMax)}" y2="${f(oy)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}" stroke-linecap="round"/>`;
  axes += `<line x1="${f(ox)}" y1="${f(yMin)}" x2="${f(ox)}" y2="${f(yMax)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}" stroke-linecap="round"/>`;

  // Стрелки только справа (ось X) и сверху (ось Y)
  axes += arrow(ox, oy, xMax - 1, oy);
  if(yMin < oy - cell * 0.2){
    axes += arrow(ox, oy, ox, yMin + 1);
  } else {
    axes += arrow(ox, oy + ah, ox, Math.max(0, oy - 1));
  }

  let ticks = '';
  let nums = '';
  const numGap = Math.max(2, cell * 0.12);

  function numText(x, y, n, anchor, baseline){
    return `<text x="${f(x)}" y="${f(y)}" fill="${col}" fill-opacity="${axOp}" font-size="${fs.toFixed(1)}" font-family="system-ui,Segoe UI,sans-serif" text-anchor="${anchor||'middle'}" dominant-baseline="${baseline||'hanging'}">${n}</text>`;
  }

  // X ticks + numbers (у шаблона «I четверть ↓» подписи X — сверху горизонтальной оси)
  const xNumsAbove = axesMode === 'axes-q1inv';
  let xi = 1;
  for(let x = ox + cell; x <= xMax - cell * 0.35; x += cell, xi++){
    ticks += `<line x1="${f(x)}" y1="${f(oy - tick)}" x2="${f(x)}" y2="${f(oy + tick)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}"/>`;
    const n = xPosRight ? xi : -xi;
    if(xNumsAbove) nums += numText(x, oy - tick - numGap, n, 'middle', 'auto');
    else nums += numText(x, oy + tick + numGap, n, 'middle', 'hanging');
  }
  xi = 1;
  for(let x = ox - cell; x >= xMin + cell * 0.35; x -= cell, xi++){
    ticks += `<line x1="${f(x)}" y1="${f(oy - tick)}" x2="${f(x)}" y2="${f(oy + tick)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}"/>`;
    const n = xPosRight ? -xi : xi;
    if(xNumsAbove) nums += numText(x, oy - tick - numGap, n, 'middle', 'auto');
    else nums += numText(x, oy + tick + numGap, n, 'middle', 'hanging');
  }

  // Y ticks + numbers — слева от оси
  let yi = 1;
  for(let y = oy + cell; y <= yMax - cell * 0.35; y += cell, yi++){
    ticks += `<line x1="${f(ox - tick)}" y1="${f(y)}" x2="${f(ox + tick)}" y2="${f(y)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}"/>`;
    const n = yPosDown ? yi : -yi;
    nums += numText(ox - tick - numGap, y, n, 'end', 'middle');
  }
  yi = 1;
  for(let y = oy - cell; y >= yMin + cell * 0.35; y -= cell, yi++){
    ticks += `<line x1="${f(ox - tick)}" y1="${f(y)}" x2="${f(ox + tick)}" y2="${f(y)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}"/>`;
    const n = yPosDown ? -yi : yi;
    nums += numText(ox - tick - numGap, y, n, 'end', 'middle');
  }

  // Origin «0»
  const or = Math.max(2, cell * 0.1);
  ticks += `<circle cx="${f(ox)}" cy="${f(oy)}" r="${f(or)}" fill="${col}" fill-opacity="${axOp}"/>`;
  if(xNumsAbove) nums += numText(ox - tick - numGap, oy - tick - numGap, '0', 'end', 'auto');
  else nums += numText(ox - tick - numGap, oy + tick + numGap, '0', 'end', 'hanging');

  // x / y labels
  let lx, ly, lyx, lyy;
  if(xPosRight){ lx = xMax - ah * 1.6; lyx = oy + fsAxis * 0.95; }
  else { lx = xMin + ah * 0.8; lyx = oy + fsAxis * 0.95; }
  if(yPosDown){ ly = yMax - ah * 0.4; lyy = ox + fsAxis * 0.85; }
  else { ly = yMin + ah * 1.1; lyy = ox + fsAxis * 0.85; }
  const labels = `<text x="${f(lx)}" y="${f(lyx)}" fill="${col}" fill-opacity="${axOp}" font-size="${fsAxis.toFixed(1)}" font-family="Georgia,serif" font-style="italic">x</text>`
    + `<text x="${f(lyy)}" y="${f(ly)}" fill="${col}" fill-opacity="${axOp}" font-size="${fsAxis.toFixed(1)}" font-family="Georgia,serif" font-style="italic">y</text>`;

  return `<g id="${uid}-axes">${axes}${ticks}${nums}${labels}</g>`;
}

/** SVG for notebook-paper layout previews and slide decor. */
function _notebookLayoutSvg(w, h, paper, a1, a2, axesMode){
  const p = paper || {};
  const c = _notebookSchemeColors(a1, a2);
  const scale = w / 1200;
  const f = n => n.toFixed(1);
  const fade = p.fade != null ? p.fade : 0.08;
  const uid = 'nb' + Math.random().toString(36).slice(2, 7);
  const sw = Math.max(0.45, scale).toFixed(2);
  let lines = '';
  let cellPx = 0;

  if(p.kind === 'lined'){
    const pitch = (p.pitch || 32) * scale;
    const inset = fade * w;
    for(let y = pitch; y < h - pitch * 0.25; y += pitch){
      lines += `<line x1="${f(inset)}" y1="${f(y)}" x2="${f(w - inset)}" y2="${f(y)}" stroke="${c.lineCol}" stroke-opacity="${c.lineOp}" stroke-width="${sw}"/>`;
    }
  } else {
    cellPx = (p.cell || 36) * scale;
    for(let y = 0; y <= h; y += cellPx){
      lines += `<line x1="0" y1="${f(y)}" x2="${w}" y2="${f(y)}" stroke="${c.lineCol}" stroke-opacity="${c.lineOp}" stroke-width="${sw}"/>`;
    }
    for(let x = 0; x <= w; x += cellPx){
      lines += `<line x1="${f(x)}" y1="0" x2="${f(x)}" y2="${h}" stroke="${c.lineCol}" stroke-opacity="${c.lineOp}" stroke-width="${sw}"/>`;
    }
  }

  const axisCol = (theme => {
    if(theme && typeof _schemeSwatchColor === 'function'){
      // Оси чуть контрастнее линий сетки: палитра «14»
      return _schemeSwatchColor(theme, 0, 3) || c.lineCol;
    }
    return c.lineCol;
  })(c.theme);
  const axes = (axesMode && cellPx) ? _notebookAxesOverlay(w, h, cellPx, axesMode, axisCol || c.lineCol) : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
    ${_notebookEdgeMaskDefs(uid, w, h, fade)}
    <g mask="url(#${uid}mx)"><g mask="url(#${uid}my)">${lines}</g></g>
    ${axes}
  </svg>`;
}

// ══════════════ LAYOUT ENGINE ══════════════

function _isGlDecorRenderer(r){
  return r==='crystal'||r==='dna'||r==='galaxy'||r==='caustics'||r==='warp';
}

function _glDecorByRenderer(r){
  if(r==='crystal'&&typeof CrystalDecor!=='undefined')return CrystalDecor;
  if(r==='dna'&&typeof DnaDecor!=='undefined')return DnaDecor;
  if(r==='galaxy'&&typeof GalaxyDecor!=='undefined')return GalaxyDecor;
  if(r==='caustics'&&typeof CausticsDecor!=='undefined')return CausticsDecor;
  if(r==='warp'&&typeof WarpDecor!=='undefined')return WarpDecor;
  return null;
}

// Get current theme accent colours (fallback to CSS vars)
function _decorAccents(){
  const ti=typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0?appliedThemeIdx
          :(typeof selTheme!=='undefined'&&selTheme>=0?selTheme:-1);
  if(ti>=0&&typeof THEMES!=='undefined'&&THEMES[ti]){
    return [THEMES[ti].ac1||'#6366f1', THEMES[ti].ac2||'#818cf8'];
  }
  return ['#6366f1','#818cf8'];
}

function _ensureGlDecorCfg(d, a1, a2){
  if (!d || !d._isDecor) return;
  const li = d._layoutIdx;
  if (li == null || li < 0 || li >= LAYOUTS.length) return;
  const L = LAYOUTS[li];
  const doAnim = L && L.animated && _layoutAnimated;
  const accents = a1 && a2 ? [a1, a2] : _decorAccents();
  if (L && L.renderer === 'crystal' && typeof L.buildCrystalCfg === 'function'){
    d._decorRenderer = 'crystal';
    d._glCfg = L.buildCrystalCfg(canvasW, canvasH, accents[0], accents[1], d._decorStyle === 'title', doAnim);
    d._crystalCfg = d._glCfg;
    return;
  }
  if (L && L.renderer === 'dna' && typeof L.buildDnaCfg === 'function'){
    d._decorRenderer = 'dna';
    d._glCfg = L.buildDnaCfg(canvasW, canvasH, accents[0], accents[1], d._decorStyle === 'title', doAnim);
    return;
  }
  if (L && L.renderer === 'galaxy' && typeof L.buildGalaxyCfg === 'function'){
    d._decorRenderer = 'galaxy';
    d._glCfg = L.buildGalaxyCfg(canvasW, canvasH, accents[0], accents[1], d._decorStyle === 'title', doAnim);
    return;
  }
  if (L && L.renderer === 'caustics' && typeof L.buildCausticsCfg === 'function'){
    d._decorRenderer = 'caustics';
    d._glCfg = L.buildCausticsCfg(canvasW, canvasH, accents[0], accents[1], d._decorStyle === 'title', doAnim);
    return;
  }
  // Cosmos «звёздный разгон» — шаблон void у темы Cosmos
  const isWarp = (L && L.renderer === 'warp')
    || (L && L.nameEn === 'Cosmos' && d._decorStyle === 'void');
  if (isWarp && L && typeof L.buildWarpCfg === 'function' && typeof WarpDecor !== 'undefined'){
    d._decorRenderer = 'warp';
    const isTitle = d._decorStyle !== 'content';
    d._glCfg = L.buildWarpCfg(canvasW, canvasH, accents[0], accents[1], isTitle, doAnim);
    d.svgContent = (typeof L.glowSvg === 'function'
      ? L.glowSvg(canvasW, canvasH, accents[0], accents[1])
      : L._buildVoid(canvasW, canvasH, accents[0], accents[1], isTitle, false)) || d.svgContent;
    return;
  }
  delete d._decorRenderer;
  delete d._glCfg;
  delete d._crystalCfg;
}
function _ensureCrystalCfg(d, a1, a2){ _ensureGlDecorCfg(d, a1, a2); }

// Build the SVG string for a decor element using current canvas dimensions.
// Scopes all defs IDs with a unique prefix so multiple slides never share filter/gradient IDs.
let _svgUidCounter=0;
function _buildDecorSvg(layoutIdx, style, mirror){
  const L=LAYOUTS[layoutIdx];
  if(!L)return '';
  const [a1,a2]=_decorAccents();
  const doAnimate = L.animated && _layoutAnimated;
  let svg='';
  if(typeof L.variantSvg==='function'){
    svg=L.variantSvg.call(L, canvasW, canvasH, a1, a2, style||'title')||'';
  } else {
    const fn=(style==='title')?L.titleSvg:L.contentSvg;
    if(typeof fn!=='function')return '';
    svg=fn.call(L, canvasW, canvasH, a1, a2, doAnimate, !!mirror)||'';
  }
  // Make every defs id unique to avoid cross-slide collisions in the DOM.
  // Must also rewrite href="#…" / xlink:href="#…" (Forest <use> silhouettes).
  const uid='u'+(++_svgUidCounter);
  if(typeof _isolateSvgIds==='function') return _isolateSvgIds(svg, uid);
  svg=svg.replace(/\bid="([^"]+)"/g, (_,id)=>`id="${uid}_${id}"`);
  svg=svg.replace(/url\(#([^)]+)\)/g, (_,id)=>`url(#${uid}_${id})`);
  svg=svg.replace(/\bhref="#([^"]+)"/g, (_,id)=>`href="#${uid}_${id}"`);
  svg=svg.replace(/\bxlink:href="#([^"]+)"/g, (_,id)=>`xlink:href="#${uid}_${id}"`);
  return svg;
}

// Create a new decor element data object for slide index si
function makeDecorEl(si, style, mirror, layoutIdx){
  const li = layoutIdx != null ? layoutIdx : selLayout;
  if(li < 0 || li >= LAYOUTS.length) return null;
  const decorStyle = style || 'content';
  const svg = _buildDecorSvg(li, decorStyle, mirror);
  if(!svg) return null;
  const d = {
    id:'decor_'+(si||0)+'_'+Date.now(),
    type:'svg',
    x:0, y:0, w:canvasW, h:canvasH,
    rot:0, anims:[], isTrigger:false,
    svgContent:svg,
    _isDecor:true,
    _decorStyle:decorStyle,
    _decorMirror:!!mirror,
    _layoutIdx:li,
  };
  _ensureGlDecorCfg(d);
  return d;
}

/** Активный шаблон в панели «Слайд» (подсвеченная карточка), или null = пустой. */
function _getSelectedSlideTpl(){
  const meta = _currentSlideDecorMeta();
  if(!meta || meta.layoutIdx == null || meta.layoutIdx < 0) return null;
  return {
    layoutIdx: meta.layoutIdx,
    style: meta.style || 'content',
    mirror: !!meta.mirror,
  };
}
window._getSelectedSlideTpl = _getSelectedSlideTpl;

// Regenerate SVG strings for all decor elements across all slides
// Called after: theme change (new colors), AR change (new dimensions)
// skipRender=true: only update data, caller handles rendering
function refreshDecorColors(ac1, ac2, skipRender){
  // Notebook (and locked cream leftovers): keep slide bg = colour scheme
  _syncSlidesThemeBg({ force:true, onlyNotebook:true });
  // Override _decorAccents temporarily if explicit colors passed
  const _oa1=ac1||_decorAccents()[0], _oa2=ac2||_decorAccents()[1];
  const _linedIdx = LAYOUTS.findIndex(L => L && L.nameEn === 'Notebook · Lined');
  const _gridIdx = LAYOUTS.findIndex(L => L && L.nameEn === 'Notebook · Grid');
  slides.forEach(s=>{
    (s.els||[]).forEach(d=>{
      if(!d._isDecor)return;
      // Legacy: отдельный макет Cosmos · Void (idx 37) → шаблон void у Cosmos
      if(d._layoutIdx >= LAYOUTS.length || d._layoutIdx === 37){
        const _cosmosIdx = LAYOUTS.findIndex(L => L && L.nameEn === 'Cosmos');
        if(_cosmosIdx >= 0 && (d._decorRenderer === 'warp' || d._decorStyle === 'void' || d._layoutIdx === 37)){
          d._layoutIdx = _cosmosIdx;
          d._decorStyle = 'void';
        }
      }
      // Legacy: убраны «мелкая клетка» / «частая линия» как отдельные макеты
      if(d._layoutIdx == null || d._layoutIdx < 0 || d._layoutIdx >= LAYOUTS.length || !LAYOUTS[d._layoutIdx]){
        d._layoutIdx = _linedIdx >= 0 ? _linedIdx : (_gridIdx >= 0 ? _gridIdx : 0);
        if(!d._decorStyle) d._decorStyle = 'content';
      }
      const li=d._layoutIdx;
      if(li==null||li<0||li>=LAYOUTS.length)return;
      const L=LAYOUTS[li];
      const doAnim = L.animated && _layoutAnimated;
      const _forestRev = L && L.nameEn === 'Forest' ? (L._layoutRev || 0) : 0;
      const _prismRev = L && L.nameEn === 'Prism' ? (L._layoutRev || 0) : 0;
      if (_forestRev && d._forestLayoutRev !== _forestRev) d._forestLayoutRev = _forestRev;
      if (_prismRev && d._prismLayoutRev !== _prismRev) d._prismLayoutRev = _prismRev;
      let svg='';
      if(typeof L.variantSvg==='function'){
        svg=L.variantSvg.call(L, canvasW, canvasH, _oa1, _oa2, d._decorStyle||'title')||'';
      } else {
        const fn=(d._decorStyle==='title')?L.titleSvg:L.contentSvg;
        if(typeof fn!=='function')return;
        svg=fn.call(L, canvasW, canvasH, _oa1, _oa2, doAnim, !!d._decorMirror)||'';
      }
      const uid='u'+(++_svgUidCounter);
      if(typeof _isolateSvgIds==='function') svg=_isolateSvgIds(svg, uid);
      else {
        svg=svg.replace(/\bid="([^"]+)"/g, (_,id)=>`id="${uid}_${id}"`);
        svg=svg.replace(/url\(#([^)]+)\)/g, (_,id)=>`url(#${uid}_${id})`);
        svg=svg.replace(/\bhref="#([^"]+)"/g, (_,id)=>`href="#${uid}_${id}"`);
        svg=svg.replace(/\bxlink:href="#([^"]+)"/g, (_,id)=>`xlink:href="#${uid}_${id}"`);
      }
      d.svgContent=svg;
      d.w=canvasW;
      d.h=canvasH;
      _ensureGlDecorCfg(d, _oa1, _oa2);
      const _glU=_glDecorByRenderer(d._decorRenderer);
      if(_glU&&d._glCfg) _glU.update(d.id,d._glCfg);
    });
  });
  if(!skipRender){
    if(typeof renderAll==="function")renderAll({thumbs:'all'});
    else if(typeof refreshDecorOnCanvas==='function') refreshDecorOnCanvas();
    if(typeof saveState==='function')if(typeof saveState==="function")saveState();
  }

}

// Sync decor SVG / WebGL on the live canvas without full reload (safe for GL layers).
function refreshDecorOnCanvas(slideIdx){
  const si=slideIdx!=null?slideIdx:cur;
  const canvas=document.getElementById('canvas');
  if(!canvas||!slides[si])return;
  canvas.querySelectorAll('.el').forEach(el=>{
    const d=slides[si].els.find(x=>x.id===el.dataset.id);
    if(!d||!d._isDecor)return;
    const ec=el.querySelector('.ec');
    if(!ec)return;
    const _glR=d._decorRenderer;
    if(_isGlDecorRenderer(_glR)){
      const _glCfg=d._glCfg||d._crystalCfg;
      const _GlDecor=_glDecorByRenderer(_glR);
      if(_GlDecor&&_glCfg) _GlDecor.update(d.id, _glCfg);
      const svgEl=ec.querySelector('svg');
      if(svgEl&&d.svgContent){
        const _svgUid='svg_'+(d.id||'');
        const _svgStr=typeof _isolateSvgIds==='function'?_isolateSvgIds(d.svgContent,_svgUid):d.svgContent;
        try{
          const _dp=new DOMParser();
          const _doc=_dp.parseFromString(_svgStr,'image/svg+xml');
          const _parsed=_doc.documentElement;
          if(_parsed&&_parsed.tagName!=='parsererror'){
            const _newSvg=document.adoptNode(_parsed);
            _newSvg.style.width='100%';_newSvg.style.height='100%';
            _newSvg.style.pointerEvents='none';
            _newSvg.setAttribute('pointer-events','none');
            try{ _newSvg.querySelectorAll('*').forEach(n=>{ n.style.pointerEvents='none'; n.setAttribute('pointer-events','none'); }); }catch(e){}
            svgEl.replaceWith(_newSvg);
          }
        }catch(e){}
      }
      return;
    }
    if(d.svgContent){
      ec.innerHTML=d.svgContent;
      const _s=ec.querySelector('svg');
      if(_s){
        _s.style.pointerEvents='none';
        _s.setAttribute('pointer-events','none');
        try{ _s.querySelectorAll('*').forEach(n=>{ n.style.pointerEvents='none'; n.setAttribute('pointer-events','none'); }); }catch(e){}
      }
    }
  });
}

// Layout picker UI
function _pausePreviewSvgAnimations(root){
  if(!root) return;
  root.querySelectorAll('svg').forEach(svg=>{
    try{ svg.pauseAnimations(); }catch(e){}
  });
}

function buildLayoutGrid(){
  const grid=document.getElementById('layout-grid');
  if(!grid)return;
  grid.innerHTML='';
  grid.style.display='flex';
  grid.style.flexWrap='wrap';
  grid.style.gap='14px';
  grid.style.alignContent='flex-start';
  const [a1,a2]=_decorAccents();
  const PW=320,PH=180;
  const _themeBgPreview=(_activeTheme()&&_activeTheme().bg)||'';

  // "No layout" card
  const none=document.createElement('div');
  none.className='layout-item'+(selLayout===-1?' active':'');
  none.title='Без декора';
  if(_themeBgPreview) none.style.background=_themeBgPreview;
  const noneBox=document.createElement('div');
  noneBox.className='layout-item-inner';
  const noneInner=document.createElement('div');
  noneInner.style.cssText='display:flex;align-items:center;justify-content:center;';
  noneInner.innerHTML=`<svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="opacity:.35"><line x1="8" y1="8" x2="40" y2="40" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><line x1="40" y1="8" x2="8" y2="40" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>`;
  noneBox.appendChild(noneInner);
  const noneLbl=document.createElement('div');
  noneLbl.className='li-label';
  noneLbl.textContent='Без декора';
  noneBox.appendChild(noneLbl);
  none.appendChild(noneBox);
  none.onclick=()=>{
    selLayout=-1;
    grid.querySelectorAll('.layout-item').forEach(b=>b.classList.remove('active'));
    none.classList.add('active');
  };
  none.ondblclick=(e)=>{
    e.preventDefault();
    selLayout=-1;
    applyLayoutDecor();
  };
  grid.appendChild(none);
  LAYOUTS.forEach((L,i)=>{
    if(L && L.hideFromModal) return;
    const isRu=typeof getLang==='function'&&getLang()==='ru';
    const btn=document.createElement('div');
    btn.className='layout-item'+(selLayout===i?' active':'');
    btn.title=(isRu?L.desc:L.descEn)||'';
    if(_themeBgPreview) btn.style.background=_themeBgPreview;
    const doAnim = false;
    const svgStr=typeof L.modalPreview==='function'?L.modalPreview.call(L,PW,PH,a1,a2)
      :(typeof L.titleSvg==='function'?L.titleSvg.call(L,PW,PH,a1,a2,doAnim):'');
    const lbl=document.createElement('div');
    lbl.className='li-label';
    lbl.textContent=isRu?L.name:L.nameEn;
    if(L.animated){
      const badge=document.createElement('span');
      badge.className='li-anim-badge';
      badge.textContent='✦';
      badge.title=isRu?'Поддерживает анимацию':'Supports animation';
      lbl.appendChild(badge);
    }
    const box=document.createElement('div');
    box.className='layout-item-inner';
    const prev=document.createElement('div');
    prev.innerHTML=svgStr;
    _pausePreviewSvgAnimations(prev);
    box.appendChild(prev);
    if(L.renderer&&_isGlDecorRenderer(L.renderer)){
      let cfg=null;
      if(L.renderer==='crystal'&&L.buildCrystalCfg)cfg=L.buildCrystalCfg(PW,PH,a1,a2,true,doAnim);
      else if(L.renderer==='dna'&&L.buildDnaCfg)cfg=L.buildDnaCfg(PW,PH,a1,a2,true,doAnim);
      else if(L.renderer==='galaxy'&&L.buildGalaxyCfg)cfg=L.buildGalaxyCfg(PW,PH,a1,a2,true,doAnim);
      else if(L.renderer==='caustics'&&L.buildCausticsCfg)cfg=L.buildCausticsCfg(PW,PH,a1,a2,true,doAnim);
      else if(L.renderer==='warp'&&L.buildWarpCfg)cfg=L.buildWarpCfg(PW,PH,a1,a2,true,doAnim);
      const decor=_glDecorByRenderer(L.renderer);
      if(cfg&&decor&&decor.renderStill){
        const still=decor.renderStill(cfg,PW,PH);
        if(still) box.appendChild(still);
      }
    }
    box.appendChild(lbl);
    btn.appendChild(box);
    btn.onclick=()=>{
      selLayout=i;
      grid.querySelectorAll('.layout-item').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      _updateAnimToggleVisibility();
    };
    btn.ondblclick=(e)=>{
      e.preventDefault();
      selLayout=i;
      applyLayoutDecor();
    };
    grid.appendChild(btn);
  });
  _updateAnimToggleVisibility();
}

function _updateAnimToggleVisibility(){
  // Toggle wrap removed from modal — handled by slide properties panel
  _syncAnimToggleBtns();
}

function _syncAnimToggleBtns(){
  const on  = document.getElementById('layout-anim-btn-on');
  const off = document.getElementById('layout-anim-btn-off');
  if(on&&off){
    if(_layoutAnimated){
      on.classList.add('pri');    off.classList.remove('pri');
      on.style.opacity='1';       off.style.opacity='0.55';
    } else {
      off.classList.add('pri');   on.classList.remove('pri');
      off.style.opacity='1';      on.style.opacity='0.55';
    }
  }
  // Синхронизируем tog-чекбокс — ставим флаг чтобы onchange не сработал
  const chk = document.getElementById('slide-layout-anim-chk');
  if(chk){ chk._syncing = true; chk.checked = _layoutAnimated; chk._syncing = false; }
}

// Показать/скрыть строку анимации в slide-props в зависимости от активного макета
function _syncSlidePropsAnimRow(){
  const row = document.getElementById('slide-layout-anim-row');
  if(!row) return;
  const hasAnim = selLayout >= 0 && selLayout < LAYOUTS.length && !!LAYOUTS[selLayout].animated;
  row.style.display = hasAnim ? '' : 'none';
  if(hasAnim) _syncAnimToggleBtns();
}

window.setLayoutAnimated = function(val){
  _layoutAnimated = val;
  _syncAnimToggleBtns();
  buildLayoutGrid();
  // Регенерируем svgContent всех декоров с правильным doAnimate
  if(typeof refreshDecorColors==='function') refreshDecorColors(null, null, true);
  if(!val){
    if(typeof CrystalDecor!=='undefined') CrystalDecor.pauseAll();
    if(typeof DnaDecor!=='undefined') DnaDecor.pauseAll();
    if(typeof GalaxyDecor!=='undefined') GalaxyDecor.pauseAll();
    if(typeof CausticsDecor!=='undefined') CausticsDecor.pauseAll();
    if(typeof WarpDecor!=='undefined') WarpDecor.pauseAll();
    // Сохраняем currentTime каждого видимого SVG-декора по индексу слайда
    document.querySelectorAll('.decor-el svg').forEach(function(svg){
      try{
        const _si = typeof _decorSvgSlideIndex==='function' ? _decorSvgSlideIndex(svg) : -1;
        if(_si >= 0) _decorPausedAt.set(_si, svg.getCurrentTime());
        svg.pauseAnimations();
      }catch(e){}
    });
  } else {
    // Пока анимация выключена, в данные пишется статичный SVG. После смены слайда
    // на холсте нет SMIL — одного unpause недостаточно. Подтягиваем анимированный
    // контент только если в DOM нет SMIL (на том же слайде оставляем паузу/resume).
    const _domSvg = document.querySelector('.decor-el svg');
    const _hasSmil = !!( _domSvg && _domSvg.querySelector('animate,animateTransform,animateMotion') );
    if(!_hasSmil && typeof refreshDecorOnCanvas==='function') refreshDecorOnCanvas();
    if(typeof CrystalDecor!=='undefined') CrystalDecor.resumeAll();
    if(typeof DnaDecor!=='undefined') DnaDecor.resumeAll();
    if(typeof GalaxyDecor!=='undefined') GalaxyDecor.resumeAll();
    if(typeof CausticsDecor!=='undefined') CausticsDecor.resumeAll();
    if(typeof WarpDecor!=='undefined') WarpDecor.resumeAll();
    document.querySelectorAll('.decor-el svg').forEach(function(svg){
      try{ svg.unpauseAnimations(); }catch(e){}
    });
    _decorPausedAt.clear();
  }
  if(typeof saveState==='function') saveState();
  if(typeof buildSlideTplGrid==='function') buildSlideTplGrid();
};

// Находим индекс слайда по DOM-элементу SVG
function _decorSvgSlideIndex(svgEl){
  try{
    const canvas = document.getElementById('canvas');
    if(!canvas) return -1;
    // Слайд-контейнер — ищем ближайший .slide-wrap или data-si
    let el = svgEl;
    while(el && el !== canvas){
      if(el.dataset && el.dataset.si != null) return +el.dataset.si;
      el = el.parentElement;
    }
  }catch(e){}
  return typeof cur !== 'undefined' ? cur : -1;
}

function applyLayout(idx,btn){
  selLayout=idx;
  document.querySelectorAll('.layout-item').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');

  const [a1,a2]=_decorAccents();
  const L=LAYOUTS[idx];

  // Фон слайдов = фон цветовой схемы (как на миниатюре схемы)
  if(L && L.paper) _syncSlidesThemeBg({ force:true });
  else if(_activeTheme()) _syncSlidesThemeBg({ force:false });

  // Apply to every slide: replace or add decor
  slides.forEach((s,si)=>{
    // Remove old decor
    s.els=s.els.filter(d=>!d._isDecor);
    // Notebook: оба размера — шаблоны; с модалки ставим крупную. Иначе title/content.
    const decorStyle=(L && L.paper) ? 'title' : (si===0?'title':'content');
    const svg=_buildDecorSvg(idx, decorStyle);
    if(!svg)return;
    const d={
      id:'decor_'+si+'_'+Date.now(),
      type:'svg',
      x:0,y:0,w:canvasW,h:canvasH,
      rot:0,anims:[],isTrigger:false,
      svgContent:svg,
      _isDecor:true,
      _decorStyle:decorStyle,
      _decorMirror:false,
      _layoutIdx:idx,
    };
    _ensureGlDecorCfg(d, a1, a2);
    s.els.unshift(d);
  });

  if(typeof renderAll==="function")renderAll({thumbs:'all'});
  if(typeof saveState==="function")saveState();
  _syncSlidePropsAnimRow();
  if(typeof buildSlideTplGrid==='function') buildSlideTplGrid();
}

function clearLayout(){
  selLayout=-1;
  document.querySelectorAll('.layout-item').forEach(b=>b.classList.remove('active'));
  slides.forEach(s=>{s.els=s.els.filter(d=>!d._isDecor);});
  _syncSlidePropsAnimRow();
  if(typeof renderAll==="function")renderAll({thumbs:'all'});
  if(typeof saveState==="function")saveState();
  if(typeof buildSlideTplGrid==='function') buildSlideTplGrid();
}

function openLayoutModal(){
  buildLayoutGrid();
  _updateAnimToggleVisibility();
  document.getElementById('layout-modal').classList.add('open');
}
function closeLayoutModal(){
  document.getElementById('layout-modal').classList.remove('open');
}
function applyLayoutDecor(){
  if(selLayout<0){clearLayout();closeLayoutModal();return;}
  applyLayout(selLayout,null);
  closeLayoutModal();
}

/** Index of Prism layout in LAYOUTS (by nameEn). */
function _prismLayoutIdx(){
  const i = LAYOUTS.findIndex(L => L && L.nameEn === 'Prism');
  return i >= 0 ? i : 0;
}

/** Current slide decor meta for template highlight. */
function _currentSlideDecorMeta(){
  const s = (typeof slides !== 'undefined' && slides[cur]) ? slides[cur] : null;
  if(!s || !s.els) return null;
  const d = s.els.find(e => e && e._isDecor);
  if(!d) return null;
  return {
    layoutIdx: d._layoutIdx,
    style: d._decorStyle || 'content',
    mirror: !!d._decorMirror,
  };
}

/** Layout shown in slide-props templates: slide decor → selLayout → Prism. */
function _slideTplLayoutIdx(){
  const meta = _currentSlideDecorMeta();
  if(meta && meta.layoutIdx != null && meta.layoutIdx >= 0 && meta.layoutIdx < LAYOUTS.length) return meta.layoutIdx;
  if(typeof selLayout === 'number' && selLayout >= 0 && selLayout < LAYOUTS.length) return selLayout;
  return _prismLayoutIdx();
}

/** Apply layout template to the current slide only. */
window.applySlidePrismTemplate = function(style, mirror){
  if(typeof slides === 'undefined' || !slides[cur]) return;
  const idx = _slideTplLayoutIdx();
  const L = LAYOUTS[idx];
  if(!L) return;
  if(typeof pushUndo === 'function') pushUndo();

  selLayout = idx;

  const decorStyle = style || 'content';
  const useMirror = L.nameEn === 'Prism' && !!mirror;
  const svg = _buildDecorSvg(idx, decorStyle, useMirror);
  if(!svg) return;

  const s = slides[cur];
  s.els = (s.els || []).filter(d => !d._isDecor);
  const d = {
    id: 'decor_' + cur + '_' + Date.now(),
    type: 'svg',
    x: 0, y: 0, w: canvasW, h: canvasH,
    rot: 0, anims: [], isTrigger: false,
    svgContent: svg,
    _isDecor: true,
    _decorStyle: decorStyle,
    _decorMirror: useMirror,
    _layoutIdx: idx,
  };
  _ensureGlDecorCfg(d);
  s.els.unshift(d);

  if(typeof renderAll === 'function') renderAll({ thumbIdx: cur });
  else if(typeof load === 'function') load();
  if(typeof saveState === 'function') saveState();
  _syncSlidePropsAnimRow();
  buildSlideTplGrid();
};
window.applySlideTemplate = window.applySlidePrismTemplate;

/** Clear decor on the current slide only. */
window.clearSlidePrismTemplate = function(){
  if(typeof slides === 'undefined' || !slides[cur]) return;
  const s = slides[cur];
  if(!(s.els || []).some(d => d && d._isDecor)) return;
  if(typeof pushUndo === 'function') pushUndo();
  s.els = (s.els || []).filter(d => !d._isDecor);
  if(typeof renderAll === 'function') renderAll({ thumbIdx: cur });
  else if(typeof load === 'function') load();
  if(typeof saveState === 'function') saveState();
  buildSlideTplGrid();
};

/** Фон для миниатюр шаблонов: как у текущего слайда, иначе тема. */
function _slideTplPreviewBg(){
  try{
    const s = (typeof slides !== 'undefined' && slides[cur]) ? slides[cur] : null;
    if(s){
      if(s.bgScheme != null && typeof _resolveSchemeColor === 'function'){
        const th = _activeTheme();
        const resolved = _resolveSchemeColor(s.bgScheme, th);
        if(resolved) return resolved;
      }
      if(s.bgc) return s.bgc;
    }
  }catch(e){}
  const theme = _activeTheme();
  return (theme && theme.bg) || '';
}

function _slideTplBgIsDark(bg){
  const raw = String(bg || '').trim();
  let h = raw.replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map(c => c + c).join('');
  if (/^[0-9a-f]{6}$/i.test(h)) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (!isNaN(r)) return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.45;
  }
  const theme = _activeTheme();
  return !(theme && theme.dark === false);
}

/** Live template cards in slide properties (empty + layout variants). */
function buildSlideTplGrid(){
  const grid = document.getElementById('slide-tpl-grid');
  if(!grid) return;
  grid.innerHTML = '';

  const [a1, a2] = _decorAccents();
  const PW = 160, PH = 90;
  const themeBg = _slideTplPreviewBg();
  const isRu = typeof getLang === 'function' && getLang() === 'ru';
  const meta = _currentSlideDecorMeta();
  const noDecor = !meta;

  // Пустой шаблон — миниатюра с крестиком (для любой темы/макета)
  const noneBtn = document.createElement('button');
  noneBtn.type = 'button';
  noneBtn.className = 'slide-tpl-item' + (noDecor ? ' active' : '');
  noneBtn.title = isRu ? 'Пустой шаблон' : 'Empty template';
  if(themeBg) noneBtn.style.background = themeBg;
  const noneInner = document.createElement('div');
  noneInner.className = 'slide-tpl-inner';
  noneInner.style.cssText = 'display:flex;align-items:center;justify-content:center;';
  const noneXStroke = _slideTplBgIsDark(themeBg) ? 'rgba(255,255,255,.58)' : 'rgba(0,0,0,.4)';
  noneInner.innerHTML = '<svg class="slide-tpl-none-x" width="28" height="28" viewBox="0 0 48 48" fill="none" style="opacity:1;position:relative;inset:auto;width:28px;height:28px"><line x1="8" y1="8" x2="40" y2="40" stroke="' + noneXStroke + '" stroke-width="3.5" stroke-linecap="round"/><line x1="40" y1="8" x2="8" y2="40" stroke="' + noneXStroke + '" stroke-width="3.5" stroke-linecap="round"/></svg>';
  noneBtn.appendChild(noneInner);
  noneBtn.onclick = () => {
    if(typeof clearSlidePrismTemplate === 'function') clearSlidePrismTemplate();
  };
  grid.appendChild(noneBtn);

  const idx = _slideTplLayoutIdx();
  const L = LAYOUTS[idx];
  const layoutName = (L && (isRu ? (L.name || L.nameEn) : (L.nameEn || L.name))) || '';
  const nameEl = document.getElementById('slide-tpl-layout-name');
  if(nameEl) nameEl.textContent = layoutName ? (' · ' + layoutName) : '';
  if(!L || typeof L.titleSvg !== 'function') return;

  const doAnim = false;
  const layoutActive = meta && meta.layoutIdx === idx;
  const isPaper = !!L.paper;
  const variants = (typeof L.tplVariants === 'function')
    ? L.tplVariants(isRu)
    : [
      { style: 'title', mirror: false, tip: isRu ? 'Главный' : 'Title' },
      { style: 'content', mirror: false, tip: isRu ? 'Побочный' : 'Content' },
    ];

  variants.forEach(v => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive = layoutActive && meta.style === v.style && !!meta.mirror === !!v.mirror;
    btn.className = 'slide-tpl-item' + (isActive ? ' active' : '');
    btn.title = layoutName + ' — ' + v.tip;
    if(themeBg) btn.style.background = themeBg;

    const inner = document.createElement('div');
    inner.className = 'slide-tpl-inner';
    if(v.style === 'void' && typeof WarpDecor !== 'undefined' && typeof L.buildWarpCfg === 'function'){
      const still = WarpDecor.renderStill(L.buildWarpCfg(PW, PH, a1, a2, true, false), PW, PH);
      if(still) inner.appendChild(still);
    } else {
      let svgStr = '';
      if(typeof L.tplThumbSvg === 'function'){
        svgStr = L.tplThumbSvg.call(L, PW, PH, a1, a2, v.style, false) || '';
      } else if(typeof L.variantSvg === 'function'){
        svgStr = L.variantSvg.call(L, PW, PH, a1, a2, v.style, false) || '';
      } else {
        const fn = v.style === 'title' ? L.titleSvg : L.contentSvg;
        svgStr = fn.call(L, PW, PH, a1, a2, false, !!v.mirror) || '';
      }
      const prev = document.createElement('div');
      prev.innerHTML = svgStr;
      _pausePreviewSvgAnimations(prev);
      inner.appendChild(prev);

      if(L.renderer && typeof _isGlDecorRenderer === 'function' && _isGlDecorRenderer(L.renderer)){
        let cfg = null;
        const isTitle = v.style === 'title';
        if(L.renderer === 'crystal' && L.buildCrystalCfg) cfg = L.buildCrystalCfg(PW, PH, a1, a2, isTitle, doAnim);
        else if(L.renderer === 'dna' && L.buildDnaCfg) cfg = L.buildDnaCfg(PW, PH, a1, a2, isTitle, doAnim);
        else if(L.renderer === 'galaxy' && L.buildGalaxyCfg) cfg = L.buildGalaxyCfg(PW, PH, a1, a2, isTitle, doAnim);
        else if(L.renderer === 'caustics' && L.buildCausticsCfg) cfg = L.buildCausticsCfg(PW, PH, a1, a2, isTitle, doAnim);
        const decor = typeof _glDecorByRenderer === 'function' ? _glDecorByRenderer(L.renderer) : null;
        if(cfg && decor && decor.renderStill){
          const still = decor.renderStill(cfg, PW, PH);
          if(still) inner.appendChild(still);
        }
      }
    }

    btn.appendChild(inner);
    btn.onclick = () => applySlidePrismTemplate(v.style, v.mirror);
    grid.appendChild(btn);
  });
}
window.buildSlideTplGrid = buildSlideTplGrid;

/** Обновить фон миниатюр шаблонов без пересборки SVG. */
function refreshSlideTplPreviewBgs(){
  const grid = document.getElementById('slide-tpl-grid');
  if(!grid) return;
  const bg = (typeof _slideTplPreviewBg === 'function') ? _slideTplPreviewBg() : '';
  const themeBg = bg || ((_activeTheme && _activeTheme()) ? _activeTheme().bg : '') || '';
  grid.querySelectorAll('.slide-tpl-item').forEach(btn => {
    if(themeBg) btn.style.background = themeBg;
    else btn.style.background = '';
  });
}
window.refreshSlideTplPreviewBgs = refreshSlideTplPreviewBgs;

