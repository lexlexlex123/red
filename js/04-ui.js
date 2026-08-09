
// ══════════════ RIBBON COLLAPSE ══════════════
function toggleRibbonCollapse(){
  const ribbon = document.getElementById('ribbon');
  const collapsed = ribbon.classList.toggle('collapsed');
  try{ localStorage.setItem('sf_ribbon_collapsed', collapsed ? '1' : '0'); }catch(e){}
  drawGrid(); // пересчитываем сетку точек после изменения высоты
}

(function(){
  try{
    if(localStorage.getItem('sf_ribbon_collapsed')==='1'){
      const ribbon=document.getElementById('ribbon');
      if(ribbon) ribbon.classList.add('collapsed');
    }
  }catch(e){}
})();

// #ribbon-right is absolutely positioned over the ribbon body's right edge
// (so it aligns vertically with the body's buttons instead of spanning the
// taller tabs+body height). Keep the body's right padding matched to its
// actual width so button groups never render underneath it.
(function(){
  const right = document.getElementById('ribbon-right');
  const body = document.getElementById('ribbon-body');
  if (!right || !body || typeof ResizeObserver === 'undefined') return;
  const sync = () => { body.style.paddingRight = right.getBoundingClientRect().width + 12 + 'px'; };
  new ResizeObserver(sync).observe(right);
  sync();
})();

// ══════════════ GRID ══════════════
function drawGrid(){
  const gc=document.getElementById('grid-canvas');const wrap=document.getElementById('cwrap');
  if(!gc||!wrap)return;
  // Sticky canvas — покрываем только видимую область cwrap
  const W=wrap.clientWidth||800;
  const H=wrap.clientHeight||600;
  // Принудительный сброс canvas — присвоение width сбрасывает содержимое и контекст
  gc.width=0; gc.width=W; gc.height=H;
  gc.style.width=W+'px';gc.style.height=H+'px';
  const ctx=gc.getContext('2d');
  const _isLight=document.documentElement.classList.contains('light');ctx.fillStyle=_isLight?'rgba(80,80,120,0.25)':'rgba(180,180,200,0.18)';
  for(let x=0;x<W;x+=SNAP)for(let y=0;y<H;y+=SNAP)ctx.fillRect(x,y,1,1);
}

// ══════════════ TABS ══════════════
function switchTab(name,btn){
  document.querySelectorAll('.rtab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');
  document.querySelectorAll('[data-tab]').forEach(g=>g.style.display=g.dataset.tab===name?'flex':'none');
  if(name==='anim'){
    openAnimPanel();
    requestAnimationFrame(()=>{
      if(typeof slides!=='undefined'&&typeof cur!=='undefined'&&typeof window.renderAnimTimelineBar==='function')
        window.renderAnimTimelineBar(slides[cur]);
    });
  }else{closeAnimPanel();}
  try{localStorage.setItem('sf_active_tab',name);}catch(e){}
  // Show/hide objects panel in props
  const objSec=document.getElementById('objects-panel-section');
  const slidePr=document.getElementById('slide-props');
  const elPr=document.getElementById('el-props');
  if(objSec){
    const isObj=name==='objects';
    objSec.style.display=isObj?'block':'none';
    if(elPr)elPr.style.display=isObj?'none':'';
    if(isObj){
      if(slidePr)slidePr.style.display='none';
      if(typeof renderObjectsPanel==='function')renderObjectsPanel();
    } else {
      // Восстанавливаем корректное состояние панели через syncProps
      if(typeof syncProps==='function') syncProps();
    }
  }
}

// Move anim-panel-body into #props when anim tab is active
window._animInProps = false;
window.openAnimPanel = function(){
  const body = document.getElementById('anim-panel-body');
  const wrap = document.getElementById('props-anim-wrap');
  const scroll = document.getElementById('props-scroll');
  if(!body||!wrap||!scroll) return;
  if(!window._animInProps){
    wrap.appendChild(body);
    window._animInProps = true;
  }
  wrap.style.display='flex';
  scroll.style.display='none';
};
window.closeAnimPanel = function(){
  const wrap = document.getElementById('props-anim-wrap');
  const scroll = document.getElementById('props-scroll');
  if(wrap) wrap.style.display='none';
  if(scroll) scroll.style.display='';
};

// ══════════════ SNAP / GUIDES ══════════════
function snapV(v){return document.getElementById('snap-chk').checked?Math.round(v/SNAP)*SNAP:v;}
let guides=[];
function clearGuides(){guides.forEach(g=>g.remove());guides=[];}
const SNAP_LS_KEY='sf_snap';
function onSnapToggle(on){
  if(!on){
    clearGuides();
    if(typeof _clearExtraGuides==='function') _clearExtraGuides();
  } else if(typeof _extraGuidesMode!=='undefined'&&_extraGuidesMode!=='none'&&typeof _drawExtraGuides==='function'){
    _drawExtraGuides();
  }
  try{
    const settingsSnap=document.getElementById('settings-snap');
    if(settingsSnap) settingsSnap.checked=!!on;
  }catch(e){}
  try{ localStorage.setItem(SNAP_LS_KEY, on ? '1' : '0'); }catch(e){}
}
window.onSnapToggle=onSnapToggle;
function restoreSnapPref(){
  try{
    const v=localStorage.getItem(SNAP_LS_KEY);
    if(v===null) return;
    const on=v==='1';
    const chk=document.getElementById('snap-chk');
    if(chk) chk.checked=on;
    const settingsSnap=document.getElementById('settings-snap');
    if(settingsSnap) settingsSnap.checked=on;
    if(!on){
      clearGuides();
      if(typeof _clearExtraGuides==='function') _clearExtraGuides();
    }
  }catch(e){}
}
window.restoreSnapPref=restoreSnapPref;
function showGuides(el){
  clearGuides();
  const snapOn=document.getElementById('snap-chk');
  if(!snapOn||!snapOn.checked) return;
  const x=parseInt(el.style.left),y=parseInt(el.style.top),w=parseInt(el.style.width),h=parseInt(el.style.height);
  const cx=canvasW/2,cy=canvasH/2,TH=7;
  let snappedX=x, snappedY=y;

  // ── Snap to slide edges / center ──
  if(Math.abs(x+w/2-cx)<TH){addGuide('v',cx);snappedX=cx-w/2;}
  if(Math.abs(y+h/2-cy)<TH){addGuide('h',cy);snappedY=cy-h/2;}
  if(Math.abs(x)<TH){addGuide('v',0);snappedX=0;}
  if(Math.abs(y)<TH){addGuide('h',0);snappedY=0;}
  if(Math.abs(x+w-canvasW)<TH){addGuide('v',canvasW-1);snappedX=canvasW-w;}
  if(Math.abs(y+h-canvasH)<TH){addGuide('h',canvasH-1);snappedY=canvasH-h;}

  // ── Snap to other elements ──
  if(slides[cur]){
    const others=slides[cur].els.filter(d=>!d._isDecor&&d.id!==el.dataset.id);
    others.forEach(d=>{
      const ox=d.x,oy=d.y,ow=d.w,oh=d.h;
      // Vertical alignment axes: left, center, right of other element
      const vAxes=[
        {pos:ox,       label:'left'},
        {pos:ox+ow/2,  label:'centerX'},
        {pos:ox+ow,    label:'right'},
      ];
      // Check dragged element's left / center / right
      vAxes.forEach(({pos})=>{
        if(Math.abs(x-pos)<TH)       {addGuide('v',pos,'element');snappedX=pos;}
        else if(Math.abs(x+w/2-pos)<TH){addGuide('v',pos,'element');snappedX=pos-w/2;}
        else if(Math.abs(x+w-pos)<TH)  {addGuide('v',pos,'element');snappedX=pos-w;}
      });
      // Horizontal alignment axes: top, center, bottom of other element
      const hAxes=[
        {pos:oy,       label:'top'},
        {pos:oy+oh/2,  label:'centerY'},
        {pos:oy+oh,    label:'bottom'},
      ];
      hAxes.forEach(({pos})=>{
        if(Math.abs(y-pos)<TH)       {addGuide('h',pos,'element');snappedY=pos;}
        else if(Math.abs(y+h/2-pos)<TH){addGuide('h',pos,'element');snappedY=pos-h/2;}
        else if(Math.abs(y+h-pos)<TH)  {addGuide('h',pos,'element');snappedY=pos-h;}
      });
    });
  }

  el.style.left=Math.round(snappedX)+'px';
  el.style.top =Math.round(snappedY)+'px';

  // ── Extra guides (thirds / golden) ──
  if(typeof _extraGuidesMode==='undefined'||_extraGuidesMode==='none') return;
  const phi=0.618;
  let snapLines=[];
  if(_extraGuidesMode==='thirds'){
    snapLines=[
      {t:'v',pos:canvasW/3},{t:'v',pos:canvasW*2/3},
      {t:'h',pos:canvasH/3},{t:'h',pos:canvasH*2/3}
    ];
  } else if(_extraGuidesMode==='golden'){
    snapLines=[
      {t:'v',pos:canvasW*phi},{t:'v',pos:canvasW*(1-phi)},
      {t:'h',pos:canvasH*phi},{t:'h',pos:canvasH*(1-phi)}
    ];
  }
  const ex=parseInt(el.style.left),ey=parseInt(el.style.top);
  snapLines.forEach(({t,pos})=>{
    if(t==='v'){
      if(Math.abs(ex-pos)<TH){addGuide('v',pos,'amber');el.style.left=Math.round(pos)+'px';}
      else if(Math.abs(ex+w-pos)<TH){addGuide('v',pos,'amber');el.style.left=Math.round(pos-w)+'px';}
      else if(Math.abs(ex+w/2-pos)<TH){addGuide('v',pos,'amber');el.style.left=Math.round(pos-w/2)+'px';}
    } else {
      if(Math.abs(ey-pos)<TH){addGuide('h',pos,'amber');el.style.top=Math.round(pos)+'px';}
      else if(Math.abs(ey+h-pos)<TH){addGuide('h',pos,'amber');el.style.top=Math.round(pos-h)+'px';}
      else if(Math.abs(ey+h/2-pos)<TH){addGuide('h',pos,'amber');el.style.top=Math.round(pos-h/2)+'px';}
    }
  });
}
function addGuide(t,pos,color){
  const cv=document.getElementById('canvas');const g=document.createElement('div');g.className='guide '+t;
  if(t==='h')g.style.top=Math.round(pos)+'px';else g.style.left=Math.round(pos)+'px';
  if(color==='amber'){g.style.borderColor='#f59e0b';g.style.opacity='0.9';}
  else if(color==='element'){g.style.background='#06b6d4';g.style.boxShadow='0 0 6px #06b6d4';g.style.opacity='0.95';}
  cv.appendChild(g);guides.push(g);
}

// ══════════════ AR ══════════════
function clampEls(newW,newH){
  slides.forEach(s=>{
    (s.els||[]).forEach(d=>{
      if(d._isDecor){d.w=newW;d.h=newH;return;}
      // Clamp position so element is visible on slide
      if(d.x+d.w>newW)d.x=Math.max(0,newW-d.w);
      if(d.y+d.h>newH)d.y=Math.max(0,newH-d.h);
      if(d.x<0)d.x=0;if(d.y<0)d.y=0;
    });
  });
}
function setAR(ratio,btn){
  pushUndo();
  ar=ratio;document.querySelectorAll('.ar-btn').forEach(b=>b.classList.toggle('active',b===btn));
  const oldW=canvasW,oldH=canvasH;
  canvasW=1200;canvasH=ratio==='4:3'?900:675;
  document.getElementById('canvas').style.width=canvasW+'px';document.getElementById('canvas').style.height=canvasH+'px';
  if(typeof _applyCanvasZoom==='function') _applyCanvasZoom();
  // Scale element positions proportionally
  const sx=canvasW/oldW,sy=canvasH/oldH;
  // Types that must NOT be stretched - preserve aspect ratio
  const noStretch=new Set(['image','icon','svg','shape']);
  slides.forEach(s=>{
    s.ar=ratio;
    (s.els||[]).forEach(d=>{
      if(d._isDecor){d.w=canvasW;d.h=canvasH;return;}
      d.x=Math.round(d.x*sx);
      d.y=Math.round(d.y*sy);
      if(noStretch.has(d.type) || (d.type==='graph' && (d.graphKind==='chem'||d.graphKind==='logic'))){
        // Keep size (chem/logic diagrams must not stretch)
        return;
      }
      // Text, code, markdown, applets, function graphs scale with canvas
      d.w=Math.round(d.w*sx);
      d.h=Math.round(d.h*sy);
    });
  });
  clampEls(canvasW,canvasH);
  // Regenerate decor SVGs for new canvas dimensions
  if(typeof refreshDecorColors==='function')refreshDecorColors();
  else{renderAll();saveState();drawThumbs();}
}

// ══════════════ CANVAS ZOOM ══════════════
let _canvasZoom = 1.0;
const ZOOM_MIN = 0.25, ZOOM_MAX = 4.0;
const ZOOM_PAD = 100; // px black border around canvas at all zoom levels

// Smooth zoom state
let _zoomTarget = 1.0;       // target zoom level
let _zoomRafId  = null;      // rAF handle
let _zoomOriginX = null;     // viewport-relative origin for current zoom gesture
let _zoomOriginY = null;

function _zoomTick(){
  const cc    = document.getElementById('canvas-container');
  const cwrap = document.getElementById('cwrap');
  if(!cc || !cwrap){ _zoomRafId=null; return; }

  const diff = _zoomTarget - _canvasZoom;
  const done = Math.abs(diff) < 0.0005;
  const newZ = done ? _zoomTarget : _canvasZoom + diff * 0.18;

  const oldZ = _canvasZoom;
  _canvasZoom = newZ;
  _applyCanvasZoom();

  // Keep origin pixel under cursor while animating
  if(_zoomOriginX !== null){
    const rect = cwrap.getBoundingClientRect();
    const vx = _zoomOriginX - rect.left;
    const vy = _zoomOriginY - rect.top;
    // canvasX/Y was locked at gesture start — recompute scroll to keep it fixed
    const canvasX = _zoomOriginCanvasX;
    const canvasY = _zoomOriginCanvasY;
    cwrap.scrollLeft = canvasX * newZ + ZOOM_PAD - vx;
    cwrap.scrollTop  = canvasY * newZ + ZOOM_PAD - vy;
  }

  if(done){ _zoomRafId=null; if(typeof drawGrid==='function') drawGrid(); }
  else     { _zoomRafId = requestAnimationFrame(_zoomTick); }
}

let _zoomOriginCanvasX = 0;
let _zoomOriginCanvasY = 0;

function zoomCanvas(factor, mouseClientX, mouseClientY, instant){
  const cwrap = document.getElementById('cwrap');
  if(!cwrap) return;

  const newTarget = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, _zoomTarget * factor));
  if(newTarget === _zoomTarget) return;

  // On first call in a gesture (or when origin changes significantly), lock origin
  if(mouseClientX !== undefined){
    const rect = cwrap.getBoundingClientRect();
    const vx = mouseClientX - rect.left;
    const vy = mouseClientY - rect.top;
    // Only re-lock origin if this is a new gesture or position shifted a lot
    if(_zoomRafId === null || Math.abs(mouseClientX-(_zoomOriginX||0))>30 || Math.abs(mouseClientY-(_zoomOriginY||0))>30){
      _zoomOriginX = mouseClientX;
      _zoomOriginY = mouseClientY;
      _zoomOriginCanvasX = (cwrap.scrollLeft + vx - ZOOM_PAD) / _canvasZoom;
      _zoomOriginCanvasY = (cwrap.scrollTop  + vy - ZOOM_PAD) / _canvasZoom;
    }
  } else {
    _zoomOriginX = null; _zoomOriginY = null;
  }

  _zoomTarget = newTarget;

  if(instant){
    _canvasZoom = newTarget;
    _applyCanvasZoom();
    return;
  }

  if(!_zoomRafId) _zoomRafId = requestAnimationFrame(_zoomTick);
}

function resetZoom(){
  _zoomTarget = 1.0;
  _canvasZoom = 1.0;
  if(_zoomRafId){ cancelAnimationFrame(_zoomRafId); _zoomRafId=null; }
  _applyCanvasZoom();
  _centerSlide();
}

function _centerSlide(){
  const cwrap = document.getElementById('cwrap');
  if(!cwrap) return;
  const z = _canvasZoom;
  const totalW = Math.round(canvasW * z) + ZOOM_PAD * 2;
  const totalH = Math.round(canvasH * z) + ZOOM_PAD * 2;
  cwrap.scrollLeft = Math.max(0, (totalW - cwrap.offsetWidth)  / 2);
  cwrap.scrollTop  = Math.max(0, (totalH - cwrap.offsetHeight) / 2);
}

function _applyCanvasZoom(){
  const cc    = document.getElementById('canvas-container');
  const cwrap = document.getElementById('cwrap');
  if(!cc || !cwrap) return;
  const z = _canvasZoom;
  const scaledW = Math.round(canvasW * z);
  const scaledH = Math.round(canvasH * z);
  const totalW  = scaledW + ZOOM_PAD * 2;
  const totalH  = scaledH + ZOOM_PAD * 2;

  cc.style.position      = 'absolute';
  cc.style.transform     = `scale(${z})`;
  cc.style.transformOrigin = 'top left';

  // Ghost defines scroll area
  let ghost = document.getElementById('cwrap-ghost');
  if(!ghost){
    ghost = document.createElement('div');
    ghost.id = 'cwrap-ghost';
    ghost.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    cwrap.appendChild(ghost);
  }

  // Use offsetWidth/Height (ignores scrollbars) to avoid chicken-and-egg jitter
  const cwW = cwrap.offsetWidth;
  const cwH = cwrap.offsetHeight;
  const fitsW = totalW <= cwW;
  const fitsH = totalH <= cwH;

  if(fitsW && fitsH){
    // Fits both axes — no scrollbars, center canvas, ghost = cwrap size
    ghost.style.width  = cwW + 'px';
    ghost.style.height = cwH + 'px';
    cc.style.left = Math.round((cwW - scaledW) / 2) + 'px';
    cc.style.top  = Math.round((cwH - scaledH) / 2) + 'px';
  } else {
    // Overflows on at least one axis — center on fitting axis, pad on overflow axis
    ghost.style.width  = totalW + 'px';
    ghost.style.height = totalH + 'px';
    cc.style.left = fitsW ? Math.round((cwW - scaledW) / 2) + 'px' : ZOOM_PAD + 'px';
    cc.style.top  = fitsH ? Math.round((cwH - scaledH) / 2) + 'px' : ZOOM_PAD + 'px';
  }

  // Sync canvas-bg-rect size with canvas dimensions
  const bgRect = document.getElementById('canvas-bg-rect');
  if(bgRect){ bgRect.style.width=canvasW+'px'; bgRect.style.height=canvasH+'px'; }

  const lbl = document.getElementById('zoom-label-btn');
  if(lbl) lbl.textContent = Math.round(z * 100) + '%';
}
// drawGrid вызывается отдельно — не в каждом zoom tick во избежание тряски

// Init on load
window.addEventListener('load', function(){
  setTimeout(function(){
    const cwrap = document.getElementById('cwrap');
    if(!cwrap) return;
    _applyCanvasZoom();
    _centerSlide();

    // Re-center on window resize (including browser zoom)
    let _resizeTimer = null;
    window.addEventListener('resize', function(){
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(function(){ _applyCanvasZoom(); _centerSlide(); }, 80);
    });

    cwrap.addEventListener('wheel', function(e){
      e.preventDefault();
      if(e.ctrlKey){
        cwrap.scrollTop  += e.deltaY;
      } else if(e.altKey){
        cwrap.scrollLeft += e.deltaY;
      } else {
        // Scale factor proportional to scroll delta for smooth trackpad support
        const delta = e.deltaY;
        const factor = Math.pow(0.999, delta);  // smooth for both trackpad and wheel
        zoomCanvas(factor, e.clientX, e.clientY);
      }
    }, {passive: false});
  }, 200);
});

// ══════════════ HANDLES OVERLAY ══════════════
// Moves .rh handles out of #canvas (overflow:hidden) into #handles-overlay
// positioned in canvas-space so they're never clipped


// ══════════════ ARC HANDLES (yellow dots on ellipse) ══════════════
function _repositionArcHandles(L, T, W, H, rot, cosr, sinr, ecx, ecy, rx, ry, d) {
  const handles = document.querySelectorAll('.arc-handle');
  handles.forEach(h => {
    const which = h.dataset.which;
    const ang = which === 'start' ? (d.arcStart ?? 0) : (d.arcEnd ?? 270);
    const rad = (ang - 90) * Math.PI / 180;
    const lx = rx * Math.cos(rad), ly = ry * Math.sin(rad);
    const cx = ecx + lx*cosr - ly*sinr;
    const cy = ecy + lx*sinr + ly*cosr;
    h.style.left = (cx - 6) + 'px';
    h.style.top  = (cy - 6) + 'px';
  });
}

function _buildArcHandles() {
  // Remove old arc handles
  document.querySelectorAll('.arc-handle').forEach(h => h.remove());
  if (!sel || sel.dataset.type !== 'shape') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  const isEllipse = typeof SHAPES !== 'undefined' &&
    SHAPES.find(s => s.id === d.shape)?.special === 'ellipse';
  if (!isEllipse) return;
  const mode = d.arcMode || 'full';
  if (mode === 'full') return; // no handles for full circle

  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  const z = typeof _canvasZoom === 'number' ? _canvasZoom : 1;

  const L = parseInt(sel.style.left)||0, T = parseInt(sel.style.top)||0;
  const W = parseInt(sel.style.width)||1, H = parseInt(sel.style.height)||1;
  const rot = parseFloat(sel.dataset.rot||0)*Math.PI/180;
  const cosr = Math.cos(rot), sinr = Math.sin(rot);
  const ecx = L + W/2, ecy = T + H/2;
  const rx = W/2, ry = H/2;

  function angleToCanvas(angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    const lx = rx * Math.cos(rad), ly = ry * Math.sin(rad);
    return {
      x: ecx + lx*cosr - ly*sinr,
      y: ecy + lx*sinr + ly*cosr
    };
  }

  function makeHandle(which, angleDeg) {
    const pos = angleToCanvas(angleDeg);
    const h = document.createElement('div');
    h.className = 'arc-handle';
    h.dataset.which = which;
    h.style.cssText = `position:absolute;width:12px;height:12px;border-radius:50%;
      background:#fbbf24;border:2px solid #fff;
      box-shadow:0 0 0 1.5px #f59e0b, 0 2px 5px rgba(0,0,0,.5);
      left:${pos.x - 6}px;top:${pos.y - 6}px;
      cursor:crosshair;z-index:10003;pointer-events:auto;`;
    
    h.addEventListener('mousedown', ev => {
      ev.stopPropagation(); ev.preventDefault();
      window._anyDragging = true;

      const onMove = mv => {
        // Re-fetch d fresh so we get latest rx/stroke/etc from panel changes
        const d = (slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id)) || {};
        const cv = _toCanvasCoords(mv.clientX, mv.clientY);
        // Convert canvas point to element-local (undo rotation)
        const dx = cv.x - ecx, dy = cv.y - ecy;
        const lx2 = dx*cosr + dy*sinr;
        const ly2 = -dx*sinr + dy*cosr;
        // Angle in degrees (0=top, clockwise)
        let ang = Math.atan2(ly2/ry, lx2/rx) * 180/Math.PI + 90;
        ang = ((ang % 360) + 360) % 360;
        ang = Math.round(ang);
        if (which === 'start') {
          d.arcStart = ang;
          sel.dataset.arcStart = ang;
          const inp = document.getElementById('sh-arc-start');
          if (inp) inp.value = ang;
        } else {
          d.arcEnd = ang;
          sel.dataset.arcEnd = ang;
          const inp = document.getElementById('sh-arc-end');
          if (inp) inp.value = ang;
        }
        // Move THIS handle directly first (no flicker)
        const rad2 = (ang - 90) * Math.PI / 180;
        const hx = ecx + rx*Math.cos(rad2)*cosr - ry*Math.sin(rad2)*sinr;
        const hy = ecy + rx*Math.cos(rad2)*sinr + ry*Math.sin(rad2)*cosr;
        h.style.left = (hx - 6) + 'px';
        h.style.top  = (hy - 6) + 'px';
        renderShapeEl(sel, d);
      };
      const onUp = () => {
        window._anyDragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (typeof save === 'function') save();
        if (typeof drawThumbs === 'function') drawThumbs();
        if (typeof saveState === 'function') saveState();
        _buildArcHandles(); // full rebuild after drag ends
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    canvas.appendChild(h);
  }

  makeHandle('start', d.arcStart ?? 0);
  makeHandle('end',   d.arcEnd   ?? 360);
}

// Fast path: only reposition existing overlay handles during rotation (no DOM rebuild)
function _repositionHandlesOverlay(el) {
  if (!el) return;
  const elL = parseInt(el.style.left)||0, elT = parseInt(el.style.top)||0;
  const elW = parseInt(el.style.width)||0, elH = parseInt(el.style.height)||0;
  const elDeg = parseFloat(el.dataset.rot)||0;
  const elRad = elDeg * Math.PI / 180;
  const cosr = Math.cos(elRad), sinr = Math.sin(elRad);
  const ecx = elL + elW/2, ecy = elT + elH/2;
  const H = 4;
  function rotPt(px, py) {
    const dx = px-ecx, dy = py-ecy;
    return { x: ecx + dx*cosr - dy*sinr - H, y: ecy + dx*sinr + dy*cosr - H };
  }
  const positions = {
    tl: rotPt(elL, elT),       tm: rotPt(elL+elW/2, elT),    tr: rotPt(elL+elW, elT),
    ml: rotPt(elL, elT+elH/2),                                mr: rotPt(elL+elW, elT+elH/2),
    bl: rotPt(elL, elT+elH),   bm: rotPt(elL+elW/2, elT+elH),br: rotPt(elL+elW, elT+elH)
  };
  const overlay = document.getElementById('handles-overlay');
  if (!overlay) return;
  // Use data-cls to find handles reliably
  overlay.querySelectorAll('[data-cls]').forEach(rh => {
    const pos = positions[rh.dataset.cls];
    if (pos) { rh.style.left = pos.x + 'px'; rh.style.top = pos.y + 'px'; }
  });
  // Line endpoint squares
  if (el.dataset.shape === 'line') {
    const dLine = typeof slides !== 'undefined' && slides[cur] && slides[cur].els.find(e => e.id === el.dataset.id);
    if (dLine) {
      const ends = typeof _lineLocalEnds === 'function' ? _lineLocalEnds(dLine, elW, elH) : null;
      if (ends) {
        const fx = (dLine.shapeFlipH === true || el.dataset.shapeFlipH === 'true') ? -1 : 1;
        const fy = (dLine.shapeFlipV === true || el.dataset.shapeFlipV === 'true') ? -1 : 1;
        function toC(lx, ly) {
          const dx = (lx - elW / 2) * fx, dy = (ly - elH / 2) * fy;
          return { x: ecx + dx * cosr - dy * sinr, y: ecy + dx * sinr + dy * cosr };
        }
        const pa = toC(ends.x1, ends.y1), pb = toC(ends.x2, ends.y2);
        const ha = overlay.querySelector('[data-line-ep="a"]');
        const hb = overlay.querySelector('[data-line-ep="b"]');
        if (ha) {
          if (typeof _placeLineEpHandle === 'function') _placeLineEpHandle(ha, pa.x, pa.y);
          else { ha.style.left = pa.x + 'px'; ha.style.top = pa.y + 'px'; ha.style.transform = 'translate(-50%,-50%)'; }
        }
        if (hb) {
          if (typeof _placeLineEpHandle === 'function') _placeLineEpHandle(hb, pb.x, pb.y);
          else { hb.style.left = pb.x + 'px'; hb.style.top = pb.y + 'px'; hb.style.transform = 'translate(-50%,-50%)'; }
        }
      }
    }
  }
  // Keep selection rectangle in sync with rotation (handles already track corners)
  const layer = document.getElementById('sel-frames-layer');
  if (layer) {
    const frames = layer.querySelectorAll('.sel-frame');
    // Single selection: one frame; multi: match by position/size of this el
    if (frames.length === 1 || (typeof multiSel === 'undefined' || !multiSel || multiSel.size <= 1)) {
      const frame = frames[0];
      if (frame) {
        frame.style.left = elL + 'px';
        frame.style.top = elT + 'px';
        frame.style.width = elW + 'px';
        frame.style.height = elH + 'px';
        frame.style.transformOrigin = 'center center';
        frame.style.transform = elDeg ? ('rotate(' + elDeg + 'deg)') : '';
        if (el.dataset && el.dataset.appletId === 'flip') {
          frame.style.borderRadius = ((typeof FLIP_RX === 'number' ? FLIP_RX : 14) + 'px');
        }
      }
    } else if (typeof _updateSelFrames === 'function') {
      _updateSelFrames();
    }
  }
  // Reposition pivot handle (stays on pivot point in canvas space)
  const _pvh = document.getElementById('pivot-handle');
  if (_pvh && typeof _getPivotCanvas === 'function') {
    const pv = _getPivotCanvas(el);
    const hs = 10;
    _pvh.style.left = (pv.x - hs / 2) + 'px';
    _pvh.style.top = (pv.y - hs / 2) + 'px';
  }
  // Reposition arc handles
  const d2 = typeof slides!=='undefined' && slides[cur] && slides[cur].els.find(e=>e.id===el.dataset.id);
  document.querySelectorAll('.arc-handle').forEach(h => {
    if (!d2) return;
    const ang = h.dataset.which==='start' ? (d2.arcStart??0) : (d2.arcEnd??270);
    const rad2 = (ang-90)*Math.PI/180;
    const lx2 = elW/2*Math.cos(rad2), ly2 = elH/2*Math.sin(rad2);
    const hx = ecx + lx2*cosr - ly2*sinr;
    const hy = ecy + lx2*sinr + ly2*cosr;
    h.style.left = (hx-6)+'px'; h.style.top = (hy-6)+'px';
  });
  // Reposition star handle
  const _sh = document.querySelector('.star-handle');
  if (_sh && d2) {
    const ir = Math.max(0.1, Math.min(0.9, +(d2.starInner??0.45)));
    const angle = -Math.PI/2;
    const slx = elW/2*ir*Math.cos(angle), sly = elH/2*ir*Math.sin(angle);
    _sh.style.left = (ecx + slx*cosr - sly*sinr - 6)+'px';
    _sh.style.top  = (ecy + slx*sinr + sly*cosr - 6)+'px';
  }
  // Reposition para handle
  const _ph2 = document.querySelector('.para-handle');
  if (_ph2 && d2) {
    const skew = Math.max(-45, Math.min(45, +(d2.paraSkew??20)));
    const off = (elH/2) * Math.tan(skew*Math.PI/180);
    const plx = -elW/2 + off, ply = -elH/2;
    _ph2.style.left = (ecx + plx*cosr - ply*sinr - 6)+'px';
    _ph2.style.top  = (ecy + plx*sinr + ply*cosr - 6)+'px';
  }
  // Reposition chevron handles (two: outer tip + inner notch)
  const _chHandles = document.querySelectorAll('.chev-handle');
  if (_chHandles.length === 2 && d2) {
    const _sh2 = typeof SHAPES !== 'undefined' && SHAPES.find(s => s.id === d2.shape);
    if (_sh2 && _sh2.special === 'chevron') {
      const _cfx = (d2.shapeFlipH === true) ? -1 : 1;
      const _isLeft2 = _sh2.id === 'chevronLeft';
      const cskew2  = Math.max(0, Math.min(45, +(d2.chevSkew ??25)));
      const cinner2 = Math.max(0, Math.min(45, +(d2.chevInner??cskew2)));
      const _olx = _cfx * (_isLeft2 ? (-elW/2 + elW*cskew2/100)  : (elW/2 - elW*cskew2/100));
      const _ilx = _cfx * (_isLeft2 ? (elW/2  - elW*cinner2/100) : (-elW/2 + elW*cinner2/100));
      _chHandles[0].style.left = (ecx + _olx*cosr - 6)+'px';
      _chHandles[0].style.top  = (ecy + _olx*sinr - 6)+'px';
      _chHandles[1].style.left = (ecx + _ilx*cosr - 6)+'px';
      _chHandles[1].style.top  = (ecy + _ilx*sinr - 6)+'px';
    }
  }
}


// ══════════════ STAR INNER-RADIUS HANDLE ══════════════

// ══════════════ TRAPEZOID HANDLES ══════════════
function _buildTrapHandles() {
  document.querySelectorAll('.trap-handle').forEach(h => h.remove());
  if (!sel || sel.dataset.type !== 'shape') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  const isTrap = typeof SHAPES !== 'undefined' && SHAPES.find(s => s.id === d.shape)?.special === 'trapezoid';
  if (!isTrap) return;
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  const L=parseInt(sel.style.left)||0, T=parseInt(sel.style.top)||0;
  const W=parseInt(sel.style.width)||1, H=parseInt(sel.style.height)||1;
  const rot=parseFloat(sel.dataset.rot||0)*Math.PI/180;
  const cosr=Math.cos(rot), sinr=Math.sin(rot);
  const ecx=L+W/2, ecy=T+H/2;
  function toCanvas(lx,ly){return{x:ecx+lx*cosr-ly*sinr,y:ecy+lx*sinr+ly*cosr};}
  function makeTrapHandle(which) {
    const isTop=which==='top';
    const inset=isTop?(d.trapTop!=null?+d.trapTop:0.15):(d.trapBot!=null?+d.trapBot:0.0);
    const lx=-W/2+inset*W, ly=isTop?-H/2:H/2;
    const pos=toCanvas(lx,ly);
    const h=document.createElement('div');
    h.className='trap-handle'; h.dataset.which=which;
    h.style.cssText=`position:absolute;width:12px;height:12px;border-radius:50%;background:#fbbf24;border:2px solid #fff;box-shadow:0 0 0 1.5px #f59e0b,0 2px 5px rgba(0,0,0,.5);left:${pos.x-6}px;top:${pos.y-6}px;cursor:ew-resize;z-index:10003;pointer-events:auto;`;
    h.addEventListener('mousedown',ev=>{
      ev.stopPropagation();ev.preventDefault();window._anyDragging=true;
      const onMove=mv=>{
        const freshD=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
        if(!freshD)return;
        const cv=_toCanvasCoords(mv.clientX,mv.clientY);
        const dx=cv.x-ecx,dy=cv.y-ecy;
        const lx2=dx*cosr+dy*sinr;
        let newInset=(lx2+W/2)/W;
        newInset=Math.max(0,Math.min(0.49,Math.round(newInset*100)/100));
        if(which==='top'){freshD.trapTop=newInset;sel.dataset.trapTop=newInset;}
        else{freshD.trapBot=newInset;sel.dataset.trapBot=newInset;}
        const nlx=-W/2+newInset*W, nly=isTop?-H/2:H/2;
        const np=toCanvas(nlx,nly);
        h.style.left=(np.x-6)+'px';h.style.top=(np.y-6)+'px';
        renderShapeEl(sel,freshD);
        if(typeof _applyShapeClipPath==='function')_applyShapeClipPath(sel,freshD);
        document.querySelectorAll('.trap-handle').forEach(th=>{
          if(th!==h){const tw=th.dataset.which;const ti=tw==='top'?(freshD.trapTop||0.15):(freshD.trapBot||0);const tlx=-W/2+ti*W;const tly=tw==='top'?-H/2:H/2;const tp2=toCanvas(tlx,tly);th.style.left=(tp2.x-6)+'px';th.style.top=(tp2.y-6)+'px';}
        });
        const inp=document.getElementById(which==='top'?'sh-trap-top':'sh-trap-bot');
        if(inp)inp.value=Math.round(newInset*100);
      };
      const onUp=()=>{window._anyDragging=false;document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);if(typeof save==='function')save();if(typeof drawThumbs==='function')drawThumbs();if(typeof saveState==='function')saveState();};
      document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
    });
    canvas.appendChild(h);
  }
  makeTrapHandle('top');makeTrapHandle('bot');
}

// ══════════════ MOON PHASE HANDLE ══════════════
function _buildMoonHandle() {
  document.querySelectorAll('.moon-handle').forEach(h => h.remove());
  if (!sel || sel.dataset.type !== 'shape') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  const isMoon = typeof SHAPES !== 'undefined' && SHAPES.find(s => s.id === d.shape)?.special === 'moon';
  if (!isMoon) return;
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  const L=parseInt(sel.style.left)||0, T=parseInt(sel.style.top)||0;
  const W=parseInt(sel.style.width)||1, H=parseInt(sel.style.height)||1;
  const rot=parseFloat(sel.dataset.rot||0)*Math.PI/180;
  const cosr=Math.cos(rot), sinr=Math.sin(rot);
  const ecx=L+W/2, ecy=T+H/2;
  function handlePosFromPhase(phase){const lx=phase*(W/2),ly=0;return{x:ecx+lx*cosr-ly*sinr,y:ecy+lx*sinr+ly*cosr};}
  const phase=d.moonPhase!=null?+d.moonPhase:-0.5;
  const pos=handlePosFromPhase(phase);
  const h=document.createElement('div');
  h.className='moon-handle';
  h.style.cssText=`position:absolute;width:12px;height:12px;border-radius:50%;background:#fbbf24;border:2px solid #fff;box-shadow:0 0 0 1.5px #f59e0b,0 2px 5px rgba(0,0,0,.5);left:${pos.x-6}px;top:${pos.y-6}px;cursor:ew-resize;z-index:10003;pointer-events:auto;`;
  h.addEventListener('mousedown',ev=>{
    ev.stopPropagation();ev.preventDefault();window._anyDragging=true;
    const onMove=mv=>{
      const freshD=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
      if(!freshD)return;
      const cv=_toCanvasCoords(mv.clientX,mv.clientY);
      const dx=cv.x-ecx,dy=cv.y-ecy;
      const lx=dx*cosr+dy*sinr;
      let newPhase=Math.max(-1,Math.min(1,lx/(W/2)));
      newPhase=Math.round(newPhase*100)/100;
      freshD.moonPhase=newPhase;sel.dataset.moonPhase=newPhase;
      const np=handlePosFromPhase(newPhase);
      h.style.left=(np.x-6)+'px';h.style.top=(np.y-6)+'px';
      renderShapeEl(sel,freshD);
      if(typeof _applyShapeBlur==='function')_applyShapeBlur(sel);
      if(typeof _applyShapeClipPath==='function')_applyShapeClipPath(sel,freshD);
      const inp=document.getElementById('sh-moon-phase');
      if(inp)inp.value=Math.round(newPhase*100);
    };
    const onUp=()=>{window._anyDragging=false;document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);if(typeof save==='function')save();if(typeof drawThumbs==='function')drawThumbs();if(typeof saveState==='function')saveState();};
    document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
  });
  canvas.appendChild(h);
}

function _buildStarHandle() {
  document.querySelectorAll('.star-handle').forEach(h => h.remove());
  if (!sel || sel.dataset.type !== 'shape') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  const isStar = typeof SHAPES !== 'undefined' && SHAPES.find(s => s.id === d.shape)?.special === 'star';
  if (!isStar) return;

  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  const L = parseInt(sel.style.left)||0, T = parseInt(sel.style.top)||0;
  const W = parseInt(sel.style.width)||1, H = parseInt(sel.style.height)||1;
  const rot = parseFloat(sel.dataset.rot||0)*Math.PI/180;
  const cosr = Math.cos(rot), sinr = Math.sin(rot);
  const ecx = L + W/2, ecy = T + H/2;

  function innerPosFromRatio(ir) {
    // Place handle at 90° (right side, pointing right from center) at inner radius
    const angle = -Math.PI/2; // top point (0°)
    const lx = W/2 * ir * Math.cos(angle);
    const ly = H/2 * ir * Math.sin(angle);
    return {
      x: ecx + lx*cosr - ly*sinr,
      y: ecy + lx*sinr + ly*cosr
    };
  }

  const ir = Math.max(0.1, Math.min(0.9, +(d.starInner != null ? d.starInner : 0.45)));
  const pos = innerPosFromRatio(ir);

  const h = document.createElement('div');
  h.className = 'star-handle';
  h.style.cssText = `position:absolute;width:12px;height:12px;border-radius:50%;
    background:#fbbf24;border:2px solid #fff;
    box-shadow:0 0 0 1.5px #f59e0b,0 2px 5px rgba(0,0,0,.5);
    left:${pos.x-6}px;top:${pos.y-6}px;
    cursor:ns-resize;z-index:10003;pointer-events:auto;`;

  h.addEventListener('mousedown', ev => {
    ev.stopPropagation(); ev.preventDefault();
    window._anyDragging = true;

    const onMove = mv => {
      const freshD = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
      if (!freshD) return;
      const cv = _toCanvasCoords(mv.clientX, mv.clientY);
      const dx = cv.x - ecx, dy = cv.y - ecy;
      // Unrotate to local
      const lx = dx*cosr + dy*sinr;
      const ly = -dx*sinr + dy*cosr;
      // Distance from center as fraction of outer radius
      const dist = Math.hypot(lx / (W/2), ly / (H/2));
      let newIr = Math.max(0.1, Math.min(0.9, dist));
      newIr = Math.round(newIr * 100) / 100;
      freshD.starInner = newIr;
      sel.dataset.starInner = newIr;
      // Move handle directly
      const np = innerPosFromRatio(newIr);
      h.style.left = (np.x-6)+'px'; h.style.top = (np.y-6)+'px';
      renderShapeEl(sel, freshD);
    };

    const onUp = () => {
      window._anyDragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (typeof save === 'function') save();
      if (typeof drawThumbs === 'function') drawThumbs();
      if (typeof saveState === 'function') saveState();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  canvas.appendChild(h);
}


// ══════════════ PARALLELOGRAM SKEW HANDLE ══════════════
function _buildParaHandle() {
  document.querySelectorAll('.para-handle').forEach(h => h.remove());
  if (!sel || sel.dataset.type !== 'shape') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  const isPara = typeof SHAPES !== 'undefined' && SHAPES.find(s => s.id === d.shape)?.special === 'parallelogram';
  if (!isPara) return;

  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  const L = parseInt(sel.style.left)||0, T = parseInt(sel.style.top)||0;
  const W = parseInt(sel.style.width)||1, H = parseInt(sel.style.height)||1;
  const rot = parseFloat(sel.dataset.rot||0)*Math.PI/180;
  const cosr = Math.cos(rot), sinr = Math.sin(rot);
  const ecx = L + W/2, ecy = T + H/2;

  function skewToHandle(skewDeg) {
    // Top-left vertex of parallelogram in local coords:
    // shape pts: TL=(off,0), TR=(W,0), BR=(W-off,H), BL=(0,H)
    // where off = (H/2)*tan(skew) — can be negative
    const off = (H/2) * Math.tan(skewDeg * Math.PI/180);
    // TL vertex local position relative to element center
    const lx = -W/2 + off, ly = -H/2;
    return {
      x: ecx + lx*cosr - ly*sinr,
      y: ecy + lx*sinr + ly*cosr
    };
  }

  const skew = Math.max(-45, Math.min(45, +(d.paraSkew ?? 20)));
  const pos = skewToHandle(skew);

  const h = document.createElement('div');
  h.className = 'para-handle';
  h.style.cssText = `position:absolute;width:12px;height:12px;border-radius:50%;
    background:#fbbf24;border:2px solid #fff;
    box-shadow:0 0 0 1.5px #f59e0b,0 2px 5px rgba(0,0,0,.5);
    left:${pos.x-6}px;top:${pos.y-6}px;
    cursor:ew-resize;z-index:10003;pointer-events:auto;`;

  h.addEventListener('mousedown', ev => {
    ev.stopPropagation(); ev.preventDefault();
    window._anyDragging = true;

    const onMove = mv => {
      const freshD = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
      if (!freshD) return;
      const cv = _toCanvasCoords(mv.clientX, mv.clientY);
      // Unrotate to local coords
      const dx = cv.x - ecx, dy = cv.y - ecy;
      const lx = dx*cosr + dy*sinr;
      const ly = -dx*sinr + dy*cosr;
      // lx = -W/2 + off, ly = -H/2 → off = lx + W/2
      const off = lx + W/2;
      let skewNew = Math.atan2(off, H/2) * 180 / Math.PI;
      skewNew = Math.max(-45, Math.min(45, Math.round(skewNew)));
      freshD.paraSkew = skewNew;
      sel.dataset.paraSkew = skewNew;
      const inp = document.getElementById('sh-para-skew');
      if (inp) inp.value = skewNew;
      // Move handle directly
      const np = skewToHandle(skewNew);
      h.style.left = (np.x-6)+'px'; h.style.top = (np.y-6)+'px';
      renderShapeEl(sel, freshD);
    };

    const onUp = () => {
      window._anyDragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (typeof save === 'function') save();
      if (typeof drawThumbs === 'function') drawThumbs();
      if (typeof saveState === 'function') saveState();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  canvas.appendChild(h);
}

function _buildChevronHandle() {
  document.querySelectorAll('.chev-handle').forEach(h => h.remove());
  if (!sel || sel.dataset.type !== 'shape') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  const sh = typeof SHAPES !== 'undefined' && SHAPES.find(s => s.id === d.shape);
  if (!sh || sh.special !== 'chevron') return;

  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  const L = parseInt(sel.style.left)||0, T = parseInt(sel.style.top)||0;
  const W = parseInt(sel.style.width)||1, H = parseInt(sel.style.height)||1;
  const rot = parseFloat(sel.dataset.rot||0) * Math.PI / 180;
  const cosr = Math.cos(rot), sinr = Math.sin(rot);
  const ecx = L + W/2, ecy = T + H/2;
  // fx = -1 when horizontally flipped — negates x offsets in canvas space
  const fx = (d.shapeFlipH === true || sel.dataset.shapeFlipH === 'true') ? -1 : 1;
  const isLeft = sh.id === 'chevronLeft'; // toCanvas(lx) already applies fx — no XOR needed

  // Convert element-local x offset → canvas position (accounts for flip and rotation)
  function toCanvas(lx) {
    const cx = fx * lx;  // apply flip to get canvas-space local x
    return { x: ecx + cx*cosr, y: ecy + cx*sinr };
  }
  // Convert mouse canvas coords → flip-corrected element-local x
  function toLocal(cv) {
    const raw = (cv.x - ecx)*cosr + (cv.y - ecy)*sinr;
    return fx * raw;  // un-flip
  }

  // outer tip handle: on the pointing side
  function outerPos(skewVal) {
    const s = Math.max(0, Math.min(45, +skewVal)) / 100;
    const lx = isLeft ? (-W/2 + W*s) : (W/2 - W*s);
    return toCanvas(lx);
  }
  // inner notch handle: on the back side
  function innerPos(innerVal) {
    const s = Math.max(0, Math.min(45, +innerVal)) / 100;
    const lx = isLeft ? (W/2 - W*s) : (-W/2 + W*s);
    return toCanvas(lx);
  }

  function makeHandle(pos, title, onDrag) {
    const h = document.createElement('div');
    h.className = 'chev-handle';
    h.title = title;
    h.style.cssText = `position:absolute;width:12px;height:12px;border-radius:3px;
      background:#fbbf24;border:2px solid #fff;
      box-shadow:0 0 0 1.5px #f59e0b,0 2px 5px rgba(0,0,0,.5);
      left:${pos.x-6}px;top:${pos.y-6}px;
      cursor:ew-resize;z-index:10003;pointer-events:auto;`;
    h.addEventListener('mousedown', ev => {
      ev.stopPropagation(); ev.preventDefault();
      window._anyDragging = true;
      const onMove = mv => {
        const freshD = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
        if (!freshD) return;
        const cv = _toCanvasCoords(mv.clientX, mv.clientY);
        const lx = toLocal(cv);  // flip-corrected local x
        onDrag(freshD, lx, h);
        renderShapeEl(sel, freshD);
      };
      const onUp = () => {
        window._anyDragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (typeof save === 'function') save();
        if (typeof drawThumbs === 'function') drawThumbs();
        if (typeof saveState === 'function') saveState();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    canvas.appendChild(h);
    return h;
  }

  const skew  = d.chevSkew  != null ? +d.chevSkew  : 25;
  const inner = d.chevInner != null ? +d.chevInner : skew;

  // Outer handle — controls chevSkew (tip depth)
  makeHandle(outerPos(skew), 'Внешний угол', (freshD, lx, h) => {
    const raw = isLeft ? Math.round((lx + W/2) / W * 100) : Math.round((W/2 - lx) / W * 100);
    const v = Math.max(0, Math.min(45, raw));
    freshD.chevSkew = v; sel.dataset.chevSkew = v;
    const np = outerPos(v); h.style.left=(np.x-6)+'px'; h.style.top=(np.y-6)+'px';
  });

  // Inner handle — controls chevInner (indent depth)
  makeHandle(innerPos(inner), 'Внутренний угол', (freshD, lx, h) => {
    const raw = isLeft ? Math.round((W/2 - lx) / W * 100) : Math.round((lx + W/2) / W * 100);
    const v = Math.max(0, Math.min(45, raw));
    freshD.chevInner = v; sel.dataset.chevInner = v;
    const np = innerPos(v); h.style.left=(np.x-6)+'px'; h.style.top=(np.y-6)+'px';
  });
}

// Square endpoint markers for the line shape — drag either end to set length/angle
/** Half-stroke pad: round cap radius (visual tip sticks out this far past the path end). */
function _lineStrokePad(d){
  const sw = d.sw !== undefined ? +d.sw : 2;
  const strokeStyle = d.strokeStyle || 'solid';
  const isComplex = strokeStyle === 'wave' || strokeStyle === 'zigzag';
  return (!isComplex && sw > 0) ? sw / 2 : 0;
}
/**
 * Local path endpoints = centers of round linecaps (the points that must coincide at a join).
 * Stroke extends `_lineStrokePad` past these points; SVG overflow is visible.
 */
function _lineLocalEnds(d, w, h){
  const sw = d.sw !== undefined ? +d.sw : 2;
  return { x1: 0, y1: h / 2, x2: Math.max(1, w), y2: h / 2, m: 0, sw };
}
function _parsePx(v){
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
}
/** Place handle so its center is exactly at (x,y) canvas coords */
function _placeLineEpHandle(h, x, y){
  h.style.left = x + 'px';
  h.style.top = y + 'px';
  h.style.transform = 'translate(-50%,-50%)';
}

/** Map shape-local coords → canvas (accounts for rot / flip) */
function _elLocalToCanvas(el, lx, ly){
  const L = _parsePx(el.style.left);
  const T = _parsePx(el.style.top);
  const W = _parsePx(el.style.width);
  const H = _parsePx(el.style.height);
  const rot = (parseFloat(el.dataset.rot) || 0) * Math.PI / 180;
  const fx = el.dataset.shapeFlipH === 'true' ? -1 : 1;
  const fy = el.dataset.shapeFlipV === 'true' ? -1 : 1;
  const cosr = Math.cos(rot), sinr = Math.sin(rot);
  const cx = L + W / 2, cy = T + H / 2;
  const dx = (lx - W / 2) * fx, dy = (ly - H / 2) * fy;
  return { x: cx + dx * cosr - dy * sinr, y: cy + dx * sinr + dy * cosr };
}

function _lineCanvasEnds(el, d){
  const w = _parsePx(el.style.width) || (d && d.w) || 0;
  const h = _parsePx(el.style.height) || (d && d.h) || 0;
  const ends = _lineLocalEnds(d, w, h);
  return {
    a: _elLocalToCanvas(el, ends.x1, ends.y1),
    b: _elLocalToCanvas(el, ends.x2, ends.y2)
  };
}

/** Legacy lines: width included stroke pad and path was inset — convert to cap-center model */
function _migrateLineCapGeometry(el, d){
  if(!el || !d || d.shape !== 'line' || d._lineCapV === 2) return;
  const w = _parsePx(el.style.width) || d.w || 0;
  const h = _parsePx(el.style.height) || d.h || 0;
  const sw = d.sw !== undefined ? +d.sw : 2;
  const strokeStyle = d.strokeStyle || 'solid';
  const isComplex = strokeStyle === 'wave' || strokeStyle === 'zigzag';
  const oldPad = (!isComplex && sw > 0) ? sw / 2 : 0;
  d._lineCapV = 2;
  if(oldPad <= 0 || w <= oldPad * 2 + 1){
    // Already looks like new model or too short — just rebuild from current ends at 0..w
    return;
  }
  // Old path ends (cap centers) were at local (pad, h/2) and (w-pad, h/2)
  const a = _elLocalToCanvas(el, oldPad, h / 2);
  const b = _elLocalToCanvas(el, Math.max(oldPad + 1, w - oldPad), h / 2);
  _applyLineFromCanvasEnds(el, d, a, b);
}

/** Rebuild line geometry from two canvas endpoints (= round-cap centers).
 *  pin: 'a' | 'b' — which end must stay exactly in place (the other may move / extend). */
function _applyLineFromCanvasEnds(el, d, p1, p2, pin){
  let x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
  let dx = x2 - x1, dy = y2 - y1;
  let len = Math.hypot(dx, dy);
  const sw = d.sw !== undefined ? +d.sw : 2;
  const minLen = 8;
  let cosr, sinr;
  if(len < 1e-8){
    const rot0 = ((parseFloat(el.dataset.rot) || 0) * Math.PI / 180);
    cosr = Math.cos(rot0); sinr = Math.sin(rot0);
    if(pin === 'b'){ x1 = x2 - cosr * minLen; y1 = y2 - sinr * minLen; }
    else { x2 = x1 + cosr * minLen; y2 = y1 + sinr * minLen; }
    len = minLen;
  } else {
    cosr = dx / len; sinr = dy / len;
    if(len < minLen){
      // Extend only the free end — pinned end stays put
      if(pin === 'b'){ x1 = x2 - cosr * minLen; y1 = y2 - sinr * minLen; }
      else if(pin === 'a'){ x2 = x1 + cosr * minLen; y2 = y1 + sinr * minLen; }
      else {
        // No pin: grow symmetrically (rare)
        const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
        x1 = midX - cosr * minLen / 2; y1 = midY - sinr * minLen / 2;
        x2 = midX + cosr * minLen / 2; y2 = midY + sinr * minLen / 2;
      }
      len = minLen;
    }
  }
  const rot = Math.atan2(sinr, cosr) * 180 / Math.PI;
  const newW = len;
  const newH = Math.max(24, sw + 16);
  // Anchor the element so the pinned endpoint maps to exact canvas coords
  let midX, midY;
  if(pin === 'a'){
    midX = x1 + cosr * (newW / 2);
    midY = y1 + sinr * (newW / 2);
  } else if(pin === 'b'){
    midX = x2 - cosr * (newW / 2);
    midY = y2 - sinr * (newW / 2);
  } else {
    midX = (x1 + x2) / 2;
    midY = (y1 + y2) / 2;
  }
  d.x = midX - newW / 2;
  d.y = midY - newH / 2;
  d.w = newW;
  d.h = newH;
  d.rot = rot;
  d._lineCapV = 2;
  d.shapeFlipH = false;
  d.shapeFlipV = false;
  el.style.left = d.x + 'px';
  el.style.top = d.y + 'px';
  el.style.width = d.w + 'px';
  el.style.height = d.h + 'px';
  el.style.transform = 'rotate(' + rot + 'deg)';
  el.dataset.rot = String(rot);
  delete el.dataset.shapeFlipH;
  delete el.dataset.shapeFlipV;
  if(typeof renderShapeEl === 'function') renderShapeEl(el, d);
  if(typeof _applyShapeClipPath === 'function') _applyShapeClipPath(el, d);
}

window._migrateLineCapGeometry = _migrateLineCapGeometry;
window._lineStrokePad = _lineStrokePad;

function _setLineEndCanvas(el, d, which, pt){
  const ends = _lineCanvasEnds(el, d);
  // Pin the opposite end so it never drifts when this end moves
  if(which === 'a') _applyLineFromCanvasEnds(el, d, pt, ends.b, 'b');
  else _applyLineFromCanvasEnds(el, d, ends.a, pt, 'a');
}

function _ensureLineJoin(d){
  if(!d.lineJoin) d.lineJoin = { a: null, b: null };
  if(!('a' in d.lineJoin)) d.lineJoin.a = null;
  if(!('b' in d.lineJoin)) d.lineJoin.b = null;
  return d.lineJoin;
}

function _persistLineJoinDom(el, d){
  if(!el || !d) return;
  const j = d.lineJoin;
  if(j && (j.a || j.b)){
    try{ el.dataset.lineJoin = JSON.stringify({ a: j.a || null, b: j.b || null }); }
    catch(e){ delete el.dataset.lineJoin; }
  } else {
    delete el.dataset.lineJoin;
  }
}

function _findLineData(id){
  if(typeof slides === 'undefined' || !slides[cur]) return null;
  return slides[cur].els.find(e => e && e.id === id && e.shape === 'line') || null;
}

function _findLineEl(id){
  const canvas = document.getElementById('canvas');
  return canvas ? canvas.querySelector('.el[data-id="'+id+'"]') : null;
}

function _ensureSlideJunctions(){
  if(typeof slides === 'undefined' || !slides[cur]) return {};
  if(!slides[cur].lineJunctions) slides[cur].lineJunctions = {};
  return slides[cur].lineJunctions;
}

function _newJunctionId(){
  return 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function _isLegacyJoinRef(ref){
  return !!(ref && typeof ref === 'object' && ref.id && (ref.end === 'a' || ref.end === 'b'));
}

function _endJunctionId(d, which){
  if(!d || !d.lineJoin) return null;
  const ref = d.lineJoin[which];
  return (typeof ref === 'string' && ref) ? ref : null;
}

function _addMemberToJunction(jid, member){
  if(!jid || !member) return;
  const juncs = _ensureSlideJunctions();
  if(!juncs[jid]) juncs[jid] = [];
  if(!juncs[jid].some(m => m.id === member.id && m.end === member.end))
    juncs[jid].push({ id: member.id, end: member.end });
}

function _getJunctionMembers(jid){
  if(!jid) return [];
  const juncs = _ensureSlideJunctions();
  return (juncs[jid] || []).slice();
}

function _migrateLegacyJoinPair(d, which){
  if(!d || !d.lineJoin) return;
  const ref = d.lineJoin[which];
  if(!_isLegacyJoinRef(ref)) return;
  const od = _findLineData(ref.id);
  if(!od){ d.lineJoin[which] = null; return; }
  _ensureLineJoin(od);
  const back = od.lineJoin[ref.end];
  if(typeof back === 'string'){
    d.lineJoin[which] = back;
    _addMemberToJunction(back, { id: d.id, end: which });
    _persistLineJoinDom(_findLineEl(d.id), d);
    return;
  }
  const jid = _newJunctionId();
  _ensureSlideJunctions()[jid] = [
    { id: d.id, end: which },
    { id: od.id, end: ref.end }
  ];
  d.lineJoin[which] = jid;
  od.lineJoin[ref.end] = jid;
  _persistLineJoinDom(_findLineEl(d.id), d);
  _persistLineJoinDom(_findLineEl(od.id), od);
}

function _migrateSlideLineJoins(){
  if(typeof slides === 'undefined' || !slides[cur]) return;
  (slides[cur].els || []).forEach(d => {
    if(!d || d.shape !== 'line') return;
    _ensureLineJoin(d);
    ['a', 'b'].forEach(w => _migrateLegacyJoinPair(d, w));
  });
}

function _dissolveJunctionIfSmall(jid){
  if(!jid) return;
  const juncs = _ensureSlideJunctions();
  const members = juncs[jid] || [];
  if(members.length >= 2) return;
  members.forEach(m => {
    const md = _findLineData(m.id);
    if(md && md.lineJoin && md.lineJoin[m.end] === jid){
      md.lineJoin[m.end] = null;
      _persistLineJoinDom(_findLineEl(m.id), md);
    }
  });
  delete juncs[jid];
}

function _clearLineJoin(d, which){
  if(!d || !d.lineJoin || !d.lineJoin[which]) return;
  _migrateSlideLineJoins();
  const live = _findLineData(d.id) || d;
  const ref = live.lineJoin[which];
  if(_isLegacyJoinRef(ref)){
    live.lineJoin[which] = null;
    const other = _findLineData(ref.id);
    if(other){
      _ensureLineJoin(other);
      const back = other.lineJoin[ref.end];
      if(_isLegacyJoinRef(back) && back.id === live.id && back.end === which){
        other.lineJoin[ref.end] = null;
        _persistLineJoinDom(_findLineEl(other.id), other);
      } else if(typeof back === 'string'){
        _clearLineJoin(other, ref.end);
        return;
      }
    }
    _persistLineJoinDom(_findLineEl(live.id), live);
    if(d !== live) d.lineJoin = live.lineJoin;
    return;
  }
  if(typeof ref !== 'string'){
    live.lineJoin[which] = null;
    _persistLineJoinDom(_findLineEl(live.id), live);
    if(d !== live) d.lineJoin = live.lineJoin;
    return;
  }
  const jid = ref;
  live.lineJoin[which] = null;
  _persistLineJoinDom(_findLineEl(live.id), live);
  const juncs = _ensureSlideJunctions();
  if(juncs[jid]){
    juncs[jid] = juncs[jid].filter(m => !(m.id === live.id && m.end === which));
    _dissolveJunctionIfSmall(jid);
  }
  if(d !== live) d.lineJoin = live.lineJoin;
}

function _mergeJunctions(keepJid, dropJid){
  if(!keepJid || !dropJid || keepJid === dropJid) return keepJid;
  const juncs = _ensureSlideJunctions();
  const drop = (juncs[dropJid] || []).slice();
  drop.forEach(m => {
    const md = _findLineData(m.id);
    if(!md) return;
    _ensureLineJoin(md)[m.end] = keepJid;
    _addMemberToJunction(keepJid, m);
    _persistLineJoinDom(_findLineEl(m.id), md);
  });
  delete juncs[dropJid];
  return keepJid;
}

function _joinLineEnds(d1, end1, d2, end2){
  if(!d1 || !d2 || d1.id === d2.id) return;
  if(end1 !== 'a' && end1 !== 'b') return;
  if(end2 !== 'a' && end2 !== 'b') return;
  _migrateSlideLineJoins();
  const live1 = _findLineData(d1.id) || d1;
  const live2 = _findLineData(d2.id) || d2;
  _ensureLineJoin(live1);
  _ensureLineJoin(live2);
  const j1 = _endJunctionId(live1, end1);
  const j2 = _endJunctionId(live2, end2);
  let jid = null;
  if(j1 && j2 && j1 === j2){
    jid = j1;
  } else if(j1 && j2){
    jid = _mergeJunctions(j1, j2);
  } else if(j1){
    if(live2.lineJoin[end2]) _clearLineJoin(live2, end2);
    live2.lineJoin[end2] = j1;
    _addMemberToJunction(j1, { id: live2.id, end: end2 });
    _persistLineJoinDom(_findLineEl(live2.id), live2);
    jid = j1;
  } else if(j2){
    if(live1.lineJoin[end1]) _clearLineJoin(live1, end1);
    live1.lineJoin[end1] = j2;
    _addMemberToJunction(j2, { id: live1.id, end: end1 });
    _persistLineJoinDom(_findLineEl(live1.id), live1);
    jid = j2;
  } else {
    if(live1.lineJoin[end1]) _clearLineJoin(live1, end1);
    if(live2.lineJoin[end2]) _clearLineJoin(live2, end2);
    jid = _newJunctionId();
    _ensureSlideJunctions()[jid] = [];
    live1.lineJoin[end1] = jid;
    live2.lineJoin[end2] = jid;
    _addMemberToJunction(jid, { id: live1.id, end: end1 });
    _addMemberToJunction(jid, { id: live2.id, end: end2 });
    _persistLineJoinDom(_findLineEl(live1.id), live1);
    _persistLineJoinDom(_findLineEl(live2.id), live2);
  }
  if(d1 !== live1) d1.lineJoin = live1.lineJoin;
  if(d2 !== live2) d2.lineJoin = live2.lineJoin;
  return jid;
}

/** Ensure junction tables match lineJoin refs; migrate legacy pairwise joins */
function _repairLineJoins(d){
  _migrateSlideLineJoins();
  if(!d || d.shape !== 'line') return;
  _ensureLineJoin(d);
  const juncs = _ensureSlideJunctions();
  ['a', 'b'].forEach(which => {
    const jid = d.lineJoin[which];
    if(!jid) return;
    if(typeof jid !== 'string'){ d.lineJoin[which] = null; return; }
    _addMemberToJunction(jid, { id: d.id, end: which });
    juncs[jid] = (juncs[jid] || []).filter(m => {
      const md = _findLineData(m.id);
      return !!(md && md.lineJoin && md.lineJoin[m.end] === jid);
    });
    if((juncs[jid] || []).length < 2){
      _dissolveJunctionIfSmall(jid);
      if(d.lineJoin[which] === jid) d.lineJoin[which] = null;
    }
  });
  const el = _findLineEl(d.id);
  if(el) _persistLineJoinDom(el, d);
}

function _lineEndIsJoined(d, which){
  if(!d) return false;
  _repairLineJoins(d);
  const jid = _endJunctionId(d, which);
  return !!(jid && _getJunctionMembers(jid).length >= 2);
}

function _moveJunctionTo(jid, pt, skipId, skipEnd){
  if(!jid || !pt) return;
  _getJunctionMembers(jid).forEach(m => {
    if(skipId && m.id === skipId && m.end === skipEnd) return;
    const mel = _findLineEl(m.id);
    const md = _findLineData(m.id);
    if(mel && md) _setLineEndCanvas(mel, md, m.end, pt);
  });
}

/** Force all members of a junction to share the exact same canvas point */
function _coalesceJunction(jid, preferredPt){
  if(!jid) return null;
  const members = _getJunctionMembers(jid);
  if(members.length < 2) return null;
  let pt = preferredPt ? { x: preferredPt.x, y: preferredPt.y } : null;
  if(!pt){
    let sx = 0, sy = 0, n = 0;
    members.forEach(m => {
      const mel = _findLineEl(m.id);
      const md = _findLineData(m.id);
      if(!mel || !md) return;
      const e = _lineCanvasEnds(mel, md)[m.end];
      if(!e) return;
      sx += e.x; sy += e.y; n++;
    });
    if(!n) return null;
    pt = { x: sx / n, y: sy / n };
  }
  // Snap to sub-pixel so round-cap centers stay glued (no integer drift)
  pt = { x: Math.round(pt.x * 100) / 100, y: Math.round(pt.y * 100) / 100 };
  members.forEach(m => {
    const mel = _findLineEl(m.id);
    const md = _findLineData(m.id);
    if(mel && md) _setLineEndCanvas(mel, md, m.end, pt);
  });
  return pt;
}
window._coalesceJunction = _coalesceJunction;

window._coalesceAllLineJunctions = function(){
  if(typeof slides === 'undefined' || !slides[cur]) return;
  _migrateSlideLineJoins();
  const juncs = _ensureSlideJunctions();
  Object.keys(juncs).forEach(jid => {
    if((juncs[jid] || []).length >= 2) _coalesceJunction(jid, null);
  });
  if(typeof refreshAllLineAngles === 'function') refreshAllLineAngles();
};

/** After moving a line body, keep junction mates glued to this line's ends */
function _syncLineJoinsAfterMove(el){
  const d = slides[cur] && slides[cur].els.find(e => e.id === el.dataset.id);
  if(!d || d.shape !== 'line' || !d.lineJoin) return;
  _repairLineJoins(d);
  const myEnds = _lineCanvasEnds(el, d);
  ['a', 'b'].forEach(which => {
    const jid = _endJunctionId(d, which);
    if(!jid) return;
    _coalesceJunction(jid, myEnds[which]);
  });
}

/** All line ids reachable via junctions from startId */
function _lineConnectedComponentIds(startId){
  const seen = new Set();
  if(!startId) return seen;
  _migrateSlideLineJoins();
  const q = [startId];
  while(q.length){
    const id = q.shift();
    if(seen.has(id)) continue;
    seen.add(id);
    const d = _findLineData(id);
    if(!d) continue;
    _ensureLineJoin(d);
    ['a', 'b'].forEach(w => {
      const jid = _endJunctionId(d, w);
      if(!jid) return;
      _getJunctionMembers(jid).forEach(m => {
        if(!seen.has(m.id)) q.push(m.id);
      });
    });
  }
  return seen;
}

window._syncLineJoinsAfterMove = _syncLineJoinsAfterMove;
window._persistLineJoinDom = _persistLineJoinDom;
window._lineEndIsJoined = _lineEndIsJoined;
window._lineConnectedComponentIds = _lineConnectedComponentIds;
window._getJunctionMembers = _getJunctionMembers;
window._endJunctionId = _endJunctionId;
window._migrateSlideLineJoins = _migrateSlideLineJoins;
window._moveJunctionTo = _moveJunctionTo;
window._setLineEndCanvas = _setLineEndCanvas;
window._lineCanvasEnds = _lineCanvasEnds;
window._findLineEl = _findLineEl;
window._findLineData = _findLineData;

function _closestOnSeg(px, py, ax, ay, bx, by){
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if(len2 < 1e-8) return { x: ax, y: ay };
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + t * dx, y: ay + t * dy };
}

function _svgUserToCanvas(path, x, y){
  try{
    const svg = path.ownerSVGElement;
    if(!svg || typeof _toCanvasCoords !== 'function') return null;
    const pt = svg.createSVGPoint();
    pt.x = x; pt.y = y;
    const ctm = path.getScreenCTM() || svg.getScreenCTM();
    if(!ctm) return null;
    const sp = pt.matrixTransform(ctm);
    return _toCanvasCoords(sp.x, sp.y);
  }catch(e){ return null; }
}

/** Snap a canvas point to nearby line segments / curve strokes (and their ends) */
function _snapLineEpToGeometry(pt, excludeId, threshold){
  threshold = threshold != null ? threshold : 14;
  let best = null, bestD = threshold;
  function consider(cand, meta){
    if(!cand) return;
    const dist = Math.hypot(pt.x - cand.x, pt.y - cand.y);
    if(dist < bestD){
      bestD = dist;
      best = Object.assign({ x: cand.x, y: cand.y, dist }, meta || {});
    }
  }
  if(typeof slides === 'undefined' || !slides[cur]) return null;
  const canvas = document.getElementById('canvas');
  if(!canvas) return null;

  // Pass 1: prefer other line endpoints (join targets) with a slightly larger radius
  const epTh = Math.max(threshold, 16);
  bestD = epTh;
  slides[cur].els.forEach(d => {
    if(!d || d._isDecor || d.id === excludeId || d.type !== 'shape' || d.shape !== 'line') return;
    const el = canvas.querySelector('.el[data-id="'+d.id+'"]');
    if(!el || el.dataset.objHidden === '1') return;
    const ends = _lineLocalEnds(d, d.w, d.h);
    const a = _elLocalToCanvas(el, ends.x1, ends.y1);
    const b = _elLocalToCanvas(el, ends.x2, ends.y2);
    consider(a, { kind: 'endpoint', targetId: d.id, targetEnd: 'a' });
    consider(b, { kind: 'endpoint', targetId: d.id, targetEnd: 'b' });
  });
  if(best && best.kind === 'endpoint') return best;

  // Pass 2: segments / curves
  best = null; bestD = threshold;
  slides[cur].els.forEach(d => {
    if(!d || d._isDecor || d.id === excludeId || d.type !== 'shape') return;
    if(d.shape !== 'line' && d.shape !== 'curve') return;
    const el = canvas.querySelector('.el[data-id="'+d.id+'"]');
    if(!el || el.dataset.objHidden === '1') return;

    if(d.shape === 'line'){
      const ends = _lineLocalEnds(d, d.w, d.h);
      const a = _elLocalToCanvas(el, ends.x1, ends.y1);
      const b = _elLocalToCanvas(el, ends.x2, ends.y2);
      consider(_closestOnSeg(pt.x, pt.y, a.x, a.y, b.x, b.y), { kind: 'segment', targetId: d.id });
      return;
    }

    if(d.curvePoints && d.curvePoints.length){
      d.curvePoints.forEach(cp => {
        consider(_elLocalToCanvas(el, cp.x * d.w, cp.y * d.h), { kind: 'curve', targetId: d.id });
      });
    }
    const path = el.querySelector('.shape-svg path');
    if(path && typeof path.getTotalLength === 'function'){
      try{
        const len = path.getTotalLength();
        if(len > 0){
          const steps = Math.max(24, Math.min(120, Math.ceil(len / 6)));
          for(let i = 0; i <= steps; i++){
            const p = path.getPointAtLength(len * i / steps);
            consider(_svgUserToCanvas(path, p.x, p.y) || _elLocalToCanvas(el, p.x, p.y), { kind: 'curve', targetId: d.id });
          }
        }
      }catch(e){}
    }
  });
  return best;
}

function _showLineEpSnapMark(pt){
  clearGuides();
  if(!pt) return;
  addGuide('v', pt.x, 'element');
  addGuide('h', pt.y, 'element');
}

function _constrainLineAngle15(mx, my, fx, fy){
  let dx = mx - fx, dy = my - fy;
  let len = Math.hypot(dx, dy);
  if(len < 1) len = 1;
  let ang = Math.atan2(dy, dx) * 180 / Math.PI;
  ang = Math.round(ang / 15) * 15;
  const rad = ang * Math.PI / 180;
  return { x: fx + Math.cos(rad) * len, y: fy + Math.sin(rad) * len };
}

function _buildLineEndpointHandles(overlay, el, elL, elT, elW, elH, elRad, elDeg){
  const d = slides[cur] && slides[cur].els.find(e => e.id === el.dataset.id);
  if(!d) return;
  const ends = _lineLocalEnds(d, elW, elH);
  const pts = {
    a: _elLocalToCanvas(el, ends.x1, ends.y1),
    b: _elLocalToCanvas(el, ends.x2, ends.y2)
  };
  pts.a.which = 'a';
  pts.b.which = 'b';

  function makeHandle(pt, joined){
    const h = document.createElement('div');
    h.dataset.lineEp = pt.which;
    if(joined) h.dataset.lineEpJoin = '1';
    const size = joined ? 12 : 10;
    const bg = joined ? '#fbbf24' : '#fff';
    const bd = joined ? '#d97706' : 'var(--selb)';
    h.title = joined
      ? ((typeof getLang === 'function' && getLang() === 'en')
        ? 'Drag to move junction · Snap more lines here · Double-click to leave'
        : 'Тяни — двигать стык · Приклей ещё отрезок · Двойной клик — отсоединить')
      : '';
    h.style.cssText = `position:absolute;left:${pt.x}px;top:${pt.y}px;width:${size}px;height:${size}px;
      transform:translate(-50%,-50%);box-sizing:border-box;
      background:${bg};border:1.5px solid ${bd};border-radius:${joined ? 2 : 1}px;
      box-shadow:0 1px 4px rgba(0,0,0,.5);pointer-events:auto;cursor:move;z-index:10001;`;

    if(joined){
      h.addEventListener('dblclick', e => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if(typeof pushUndo === 'function') pushUndo();
        _clearLineJoin(d, pt.which);
        if(typeof save === 'function') save();
        if(typeof saveState === 'function') saveState();
        if(typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
        if(typeof toast === 'function'){
          toast((typeof getLang === 'function' && getLang() === 'en') ? 'Detached from junction' : 'Отсоединено от стыка', 'ok');
        }
      });
    }

    h.addEventListener('mousedown', e => {
      if(e.detail > 1 && joined) return; // let dblclick handle disconnect
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      window._anyDragging = true;
      window._lineEpDragging = true;
      if(typeof pick === 'function' && sel !== el) pick(el);
      if(typeof pushUndo === 'function') pushUndo();

      const excludeId = el.dataset.id;
      const otherWhich = pt.which === 'a' ? 'b' : 'a';
      const myEnds0 = _lineCanvasEnds(el, d);
      const fixed = { x: myEnds0[otherWhich].x, y: myEnds0[otherWhich].y };
      _repairLineJoins(d);
      const jid0 = _endJunctionId(d, pt.which);
      const mateState = [];
      if(jid0){
        _getJunctionMembers(jid0).forEach(m => {
          if(m.id === d.id && m.end === pt.which) return;
          const partnerD = _findLineData(m.id);
          const partnerEl = _findLineEl(m.id);
          if(!partnerD || !partnerEl) return;
          const pe = _lineCanvasEnds(partnerEl, partnerD);
          const pOther = m.end === 'a' ? 'b' : 'a';
          mateState.push({
            end: m.end,
            d: partnerD,
            el: partnerEl,
            fixed: { x: pe[pOther].x, y: pe[pOther].y }
          });
        });
      }
      let lastSnap = null;

      function paintHandle(snappedEp){
        if(joined){
          h.style.background = snappedEp ? '#34d399' : '#fbbf24';
          h.style.borderColor = snappedEp ? '#059669' : '#d97706';
        } else {
          h.style.background = snappedEp ? '#34d399' : '#fff';
          h.style.borderColor = snappedEp ? '#059669' : 'var(--selb)';
        }
      }

      function refreshMarkers(){
        const nEnds = _lineCanvasEnds(el, d);
        const ha = overlay.querySelector('[data-line-ep="a"]');
        const hb = overlay.querySelector('[data-line-ep="b"]');
        if(ha) _placeLineEpHandle(ha, nEnds.a.x, nEnds.a.y);
        if(hb) _placeLineEpHandle(hb, nEnds.b.x, nEnds.b.y);
        pts.a.x = nEnds.a.x; pts.a.y = nEnds.a.y;
        pts.b.x = nEnds.b.x; pts.b.y = nEnds.b.y;
        if(typeof _updateSelFrames === 'function') _updateSelFrames();
      }

      function applyMoving(mx, my, opts){
        let x = mx, y = my;
        const skipGrid = opts && opts.skipGrid;
        if(!skipGrid && typeof snapV === 'function' && document.getElementById('snap-chk')?.checked){
          x = snapV(x); y = snapV(y);
        }
        // Always pin the opposite endpoint — it must stay put while this one moves
        if(pt.which === 'a') _applyLineFromCanvasEnds(el, d, { x, y }, fixed, 'b');
        else _applyLineFromCanvasEnds(el, d, fixed, { x, y }, 'a');
        mateState.forEach(ms => {
          if(ms.end === 'a') _applyLineFromCanvasEnds(ms.el, ms.d, { x, y }, ms.fixed, 'b');
          else _applyLineFromCanvasEnds(ms.el, ms.d, ms.fixed, { x, y }, 'a');
        });
        refreshMarkers();
        if(typeof refreshAllLineAngles === 'function') refreshAllLineAngles();
      }

      function onMove(ev){
        const cv = typeof _toCanvasCoords === 'function' ? _toCanvasCoords(ev.clientX, ev.clientY) : null;
        if(!cv) return;
        let mx = cv.x, my = cv.y;

        // Shift: force angle multiples of 15° around the fixed end
        if(ev.shiftKey){
          const c = _constrainLineAngle15(mx, my, fixed.x, fixed.y);
          mx = c.x; my = c.y;
        }

        const snapped = _snapLineEpToGeometry({ x: mx, y: my }, excludeId, 14);
        if(snapped){
          // If shift is held and snap is not an endpoint join target, keep angle constraint
          if(ev.shiftKey && snapped.kind !== 'endpoint'){
            lastSnap = null;
            clearGuides();
            paintHandle(false);
            applyMoving(mx, my);
          } else {
            // Ignore snap onto an endpoint already in this same junction
            const sameJunc = joined && snapped.kind === 'endpoint' && jid0 && (() => {
              const od = _findLineData(snapped.targetId);
              return od && _endJunctionId(od, snapped.targetEnd) === jid0;
            })();
            if(sameJunc){
              lastSnap = null;
              clearGuides();
              paintHandle(false);
              applyMoving(mx, my, ev.shiftKey ? { skipGrid: true } : null);
            } else {
              mx = snapped.x; my = snapped.y;
              lastSnap = snapped;
              _showLineEpSnapMark(snapped);
              paintHandle(snapped.kind === 'endpoint');
              applyMoving(mx, my, { skipGrid: true });
            }
          }
        } else {
          lastSnap = null;
          clearGuides();
          paintHandle(false);
          applyMoving(mx, my, ev.shiftKey ? { skipGrid: true } : null);
        }
      }

      function onUp(){
        window._anyDragging = false;
        window._lineEpDragging = false;
        clearGuides();
        paintHandle(false);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);

        if(lastSnap && lastSnap.kind === 'endpoint' && lastSnap.targetId && lastSnap.targetEnd){
          const od = _findLineData(lastSnap.targetId);
          if(od){
            const jid = _joinLineEnds(d, pt.which, od, lastSnap.targetEnd);
            const joinPt = { x: lastSnap.x, y: lastSnap.y };
            if(jid && typeof _coalesceJunction === 'function'){
              _coalesceJunction(jid, joinPt);
            } else {
              applyMoving(joinPt.x, joinPt.y, { skipGrid: true });
            }
            const live = _findLineData(d.id) || d;
            d.lineJoin = live.lineJoin;
          }
        } else if(!joined){
          _clearLineJoin(d, pt.which);
        } else {
          // Finished moving an existing junction — snap all members to one point
          const jid = _endJunctionId(d, pt.which);
          if(jid){
            const ends = _lineCanvasEnds(el, d);
            _coalesceJunction(jid, ends[pt.which]);
          }
        }

        if(typeof pick === 'function' && sel !== el) pick(el);
        else if(typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
        if(typeof refreshAllLineAngles === 'function') refreshAllLineAngles();
        if(typeof save === 'function') save();
        if(typeof drawThumbs === 'function') drawThumbs();
        if(typeof saveState === 'function') saveState();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }, true);
    overlay.appendChild(h);
  }

  makeHandle(pts.a, _lineEndIsJoined(d, 'a'));
  makeHandle(pts.b, _lineEndIsJoined(d, 'b'));
}
window._buildLineEndpointHandles = _buildLineEndpointHandles;
window._placeLineEpHandle = _placeLineEpHandle;
window._snapLineEpToGeometry = _snapLineEpToGeometry;
window._joinLineEnds = _joinLineEnds;
window._clearLineJoin = _clearLineJoin;

function _updateHandlesOverlay(){
  // Allow update during rotation drag so handles track the element
  const overlay = document.getElementById('handles-overlay');
  if(!overlay) return;
  _clearStaleHandleHoverFlags();
  overlay.innerHTML = '';
  overlay.style.pointerEvents = 'none'; // container passes through, only handles have pointer-events:auto
  if(typeof _updateSelFrames==='function') _updateSelFrames();

  const el = typeof sel !== 'undefined' ? sel : null;
  if (!el) {
    _rotEl = null;
    overlay.style.pointerEvents = 'none';
    document.querySelectorAll('.arc-handle,.star-handle,.para-handle,.chev-handle,.trap-handle,.moon-handle').forEach(h=>h.remove());
    return;
  }
  // Don't show overlay handles during crop mode — crop handles take over
  if (el.dataset.cropMode === 'true') { _rotEl = null; return; }
  // In curve edit mode: hide resize/rotation handles (only curve editor handles shown)
  if (window._curveEditMode && el.dataset.shape === 'curve') {
    _rotEl = null;
    // Still call _buildCurveEditor below to show node handles
    _buildCurveEditor();
    return;
  }
  document.querySelectorAll('.rh[data-overlay-hidden]').forEach(rh => {
    rh.style.display = '';
    delete rh.dataset.overlayHidden;
  });

  // Lego blocks: no resize handles, no rotation
  if(el.dataset.type === 'lego') { _rotEl = null; return; }
  // Angle markers: no handles / rotation — only props panel
  if(el.dataset.type === 'lineangle') { _rotEl = null; return; }

  const elL = parseInt(el.style.left)||0;
  const elT = parseInt(el.style.top)||0;
  const elW = parseInt(el.style.width)||0;
  const elH = parseInt(el.style.height)||0;

  // Read actual rotation from computed transform matrix (handles CSS animation)
  // When shape is flipped (scale(-1,1)), mat.a = -cos(rot), mat.b = -sin(rot).
  // Multiplying by fx before atan2 recovers the true rotation angle.
  let elDeg = parseFloat(el.dataset.rot)||0;
  try {
    const _mfx = (el.dataset.shapeFlipH === 'true') ? -1 : 1;
    const mat = new DOMMatrix(getComputedStyle(el).transform);
    if (mat && !isNaN(mat.a)) {
      const computedDeg = Math.atan2(_mfx * mat.b, _mfx * mat.a) * 180 / Math.PI;
      if (Math.abs(computedDeg - elDeg) > 0.5) elDeg = computedDeg;
    }
  } catch(e) {}
  const elRad = elDeg * Math.PI / 180;
  const H = 4; // half handle size
  const cosr = Math.cos(elRad), sinr = Math.sin(elRad);

  // transformOrigin is always 50%50% — pivot only affects rotation center for rotation math
  // For handle positions: use actual element center from getBoundingClientRect
  const pivLX = parseFloat(el.dataset.rotPivotX||0);
  const pivLY = parseFloat(el.dataset.rotPivotY||0);
  // Actual element center in canvas (accounting for pivot-adjusted left/top)
  const elCx = elL + elW/2, elCy = elT + elH/2;
  // transformOrigin = 50%50% so rotation center = element center
  const toCX = elCx, toCY = elCy;

  function rotPt(px, py) {
    const dx = px - toCX;
    const dy = py - toCY;
    return {
      x: toCX + dx*cosr - dy*sinr - H,
      y: toCY + dx*sinr + dy*cosr - H
    };
  }

  // Hide original .rh handles — overlay replaces them
  el.querySelectorAll('.rh').forEach(rh => {
    rh.style.display = 'none';
    rh.dataset.overlayHidden = '1';
  });

  const _isLineShape = el.dataset.type === 'shape' && el.dataset.shape === 'line';

  if (!_isLineShape) {
  // 8 handle positions rotated around element centre
  const positions = [
    ['tl', elL,       elT      ],
    ['tm', elL+elW/2, elT      ],
    ['tr', elL+elW,   elT      ],
    ['ml', elL,       elT+elH/2],
    ['mr', elL+elW,   elT+elH/2],
    ['bl', elL,       elT+elH  ],
    ['bm', elL+elW/2, elT+elH  ],
    ['br', elL+elW,   elT+elH  ],
  ].map(([cls, px, py]) => { const r=rotPt(px,py); return [cls, r.x, r.y]; });

  // Find original rh elements to reuse their mousedown handlers
  const origRhs = {};
  el.querySelectorAll('.rh').forEach(rh=>{
    const cls = [...rh.classList].find(c=>c!=='rh');
    if(cls) origRhs[cls] = rh;
  });

  positions.forEach(([cls, x, y])=>{
    const rh = document.createElement('div');
    rh.dataset.cls = cls;
    rh.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:8px;height:8px;
      background:#fff;border:1.5px solid var(--selb);border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,.5);pointer-events:auto;
      cursor:${_rhCursor(cls, parseFloat((typeof sel!=='undefined'&&sel)?sel.dataset.rot||0:0))};z-index:9999;`;
    // Forward mousedown to original resize handle
    rh.addEventListener('mousedown', e=>{
      e.stopPropagation();
      e.preventDefault();
      const orig = origRhs[cls];
      if(orig) orig.dispatchEvent(new MouseEvent('mousedown', {bubbles:false, cancelable:true, clientX:e.clientX, clientY:e.clientY, button:0}));
    });
    overlay.appendChild(rh);
  });
  } else {
    _buildLineEndpointHandles(overlay, el, elL, elT, elW, elH, elRad, elDeg);
  }
  // Add rotation logic (no extra divs — uses document-level hover detection)
  if (!_isLineShape) _addRotationZones(overlay, el);
  else _rotEl = null;

  // ── Pivot point handle (purple dot) ──
  if (!_isLineShape) _buildPivotHandle(overlay, el);

  // ── Arc handles for ellipse ──
  _buildArcHandles();
  // ── Star inner radius handle ──
  _buildStarHandle();
  // ── Parallelogram skew handle ──
  _buildParaHandle();
  // ── Chevron depth handle ──
  // Reposition if exists, rebuild if missing or shape changed
  // ── Chevron depth handle ──
  _buildChevronHandle();
  // ── Trapezoid handles ──
  _buildTrapHandles();
  // ── Moon phase handle ──
  _buildMoonHandle();
  // ── Curve bezier editor ──
  _buildCurveEditor();

  // Callout tail handle
  if(el.dataset.type==='shape'){
    const _d=slides[cur]&&slides[cur].els.find(e=>e.id===el.dataset.id);
    if(_d){
      const _sh=typeof SHAPES!=='undefined'&&SHAPES.find(s=>s.id===_d.shape);
      if(_sh&&_sh.special==='callout'){
        const tipRelX=+(_d.tailX||0);
        const tipRelY=_d.tailY!==undefined?+_d.tailY:(elH/2+30);
        const elCx=elL+elW/2, elCy=elT+elH/2;
        // Rotate tip offset into canvas coords
        const tipCx=elCx+tipRelX*Math.cos(elRad)-tipRelY*Math.sin(elRad);
        const tipCy=elCy+tipRelX*Math.sin(elRad)+tipRelY*Math.cos(elRad);
        const TH=6; // half-handle size
        const th=document.createElement('div');
        th.dataset.calloutHandle='1';
        th.style.cssText=`position:absolute;left:${tipCx-TH}px;top:${tipCy-TH}px;width:12px;height:12px;
          background:#f59e0b;border:2px solid #fff;border-radius:50%;
          box-shadow:0 1px 4px rgba(0,0,0,.6);pointer-events:auto;cursor:crosshair;z-index:10000;`;
        th.addEventListener('mousedown',e=>{
          e.preventDefault();e.stopPropagation();
          const startMx=e.clientX, startMy=e.clientY;
          const startTX=+(_d.tailX||0);
          const startTY=_d.tailY!==undefined?+_d.tailY:(elH/2+30);
          const zoom=typeof getZoom==='function'?getZoom():1;
          const rad=(parseFloat(el.dataset.rot)||0)*Math.PI/180;
          const _elCx=parseInt(el.style.left)+(parseInt(el.style.width)||0)/2;
          const _elCy=parseInt(el.style.top)+(parseInt(el.style.height)||0)/2;
          function onMove(ev){
            const mdx=(ev.clientX-startMx)/zoom;
            const mdy=(ev.clientY-startMy)/zoom;
            // Un-rotate mouse delta into element local coords
            _d.tailX=startTX+mdx*Math.cos(-rad)-mdy*Math.sin(-rad);
            _d.tailY=startTY+mdx*Math.sin(-rad)+mdy*Math.cos(-rad);
            // Persist in dataset
            el.dataset.tailX=_d.tailX;
            el.dataset.tailY=_d.tailY;
            // Redraw shape
            if(typeof renderShapeEl==='function') renderShapeEl(el,_d);
            // Move handle directly in canvas coords
            const nx=_elCx+_d.tailX*Math.cos(rad)-_d.tailY*Math.sin(rad);
            const ny=_elCy+_d.tailX*Math.sin(rad)+_d.tailY*Math.cos(rad);
            th.style.left=(nx-TH)+'px';
            th.style.top=(ny-TH)+'px';
          }
          function onUp(){
            document.removeEventListener('mousemove',onMove);
            document.removeEventListener('mouseup',onUp);
            if(typeof save==='function') save();
            if(typeof drawThumbs==='function') drawThumbs();
            if(typeof saveState==='function') saveState();
          }
          document.addEventListener('mousemove',onMove);
          document.addEventListener('mouseup',onUp);
        });
        overlay.appendChild(th);
      }
    }
  }

}

let _handlesOverlayRaf=null;
function _scheduleHandlesOverlayUpdate(){
  if(_handlesOverlayRaf!=null)return;
  _handlesOverlayRaf=requestAnimationFrame(()=>{
    _handlesOverlayRaf=null;
    if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
  });
}

function _rhCursor(cls, rotDeg){
  // Base angle FROM center TO handle, clockwise from North (0=up, 90=right)
  const baseAngle = {tm:0,tr:45,mr:90,br:135,bm:180,bl:225,ml:270,tl:315}[cls];
  if(baseAngle===undefined) return 'default';
  // Add element rotation to get actual screen direction
  const angle = ((baseAngle + rotDeg) % 360 + 360) % 360;
  // Map angle to CSS cursor (cursor points FROM center TOWARD handle)
  // 0=N=n-resize, 45=NE=ne-resize, 90=E=e-resize, etc.
  const cursors = [
    [22.5,'n-resize'],[67.5,'ne-resize'],[112.5,'e-resize'],[157.5,'se-resize'],
    [202.5,'s-resize'],[247.5,'sw-resize'],[292.5,'w-resize'],[337.5,'nw-resize'],[360,'n-resize']
  ];
  for(const [thresh, cur] of cursors){ if(angle < thresh) return cur; }
  return 'n-resize';
}

// Single rotation cursor — clean arc with two arrowheads, white with dark outline
const _rotateCursor = (()=>{
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'>`
    + `<path d='M3.5 10 A6.5 6.5 0 0 1 16.5 10' stroke='white' stroke-width='2.5' fill='none' stroke-linecap='butt'/>`
    + `<path d='M3.5 10 A6.5 6.5 0 0 1 16.5 10' stroke='black' stroke-width='1' fill='none' stroke-linecap='butt'/>`
    + `<polyline points='1.5,7.5 3.5,11 6.5,8' stroke='white' stroke-width='2.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/>`
    + `<polyline points='1.5,7.5 3.5,11 6.5,8' stroke='black' stroke-width='1' fill='none' stroke-linecap='round' stroke-linejoin='round'/>`
    + `<polyline points='18.5,7.5 16.5,11 13.5,8' stroke='white' stroke-width='2.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/>`
    + `<polyline points='18.5,7.5 16.5,11 13.5,8' stroke='black' stroke-width='1' fill='none' stroke-linecap='round' stroke-linejoin='round'/>`
    + `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 10 10, crosshair`;
})();

let _rotDragging = false;

function _syncRotDragging(val) {
  _rotDragging = !!val;
  window._rotDragging = _rotDragging;
}

function _clearStaleHandleHoverFlags() {
  if (!window._pivotDragging) window._overPivotHandle = false;
}
window._clearStaleHandleHoverFlags = _clearStaleHandleHoverFlags;

if (!window._handleDragSafetyInit) {
  window._handleDragSafetyInit = true;
  document.addEventListener('mouseup', () => {
    window._overPivotHandle = false;
  });
  window.addEventListener('blur', () => {
    window._overPivotHandle = false;
    window._pivotDragging = false;
    window._resizeDragging = false;
    _syncRotDragging(false);
    window._anyDragging = false;
  });
}

function _makeCursorForAngle(angleDeg) {
  const a = angleDeg;
  // Arc: centre (11,6), r=8, from (5,14) to (17,14)
  // Left end tangent direction (clockwise): perpendicular to radius (11,6)→(5,14) = (-6,8), rotate 90°CW → (8,6), normalised ≈ (0.8,0.6)
  // Arrow tip points in tangent direction from arc end
  // Left: tip at (5,14) going in direction (-0.8,-0.6) = away from arc
  // tx=-0.8, ty=-0.6 → tip = (5-3.5*0.8, 14-3.5*0.6) = (2.2, 11.9), base perpendicular
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'>`
    + `<g transform='rotate(${a} 11 11)'>`
    + `<path d='M5 14 A8 8 0 0 1 17 14' stroke='black' stroke-width='4' fill='none' stroke-linecap='butt'/>`
    + `<path d='M5 14 A8 8 0 0 1 17 14' stroke='white' stroke-width='2.5' fill='none' stroke-linecap='butt'/>`
    // Left arrowhead: tangent at (5,14) going up-left
    + `<polygon points='0.5,11.5 5,14 3,18' fill='black'/>`
    + `<polygon points='1.3,12.2 5,14 3.5,17.2' fill='white'/>`
    // Right arrowhead: tangent at (17,14) going up-right  
    + `<polygon points='21.5,11.5 17,14 19,18' fill='black'/>`
    + `<polygon points='20.7,12.2 17,14 18.5,17.2' fill='white'/>`
    + `</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 11 11, crosshair`;
}

// Tangent angle for rotation cursor: mouse position around pivot
function _rotCursorAngle(pivotX, pivotY, mouseX, mouseY) {
  return Math.atan2(mouseY - pivotY, mouseX - pivotX) * 180 / Math.PI + 90;
}

let _lastRotCursor = '';
function _setRotCursor(cursorVal) {
  if (cursorVal === _lastRotCursor) return;
  _lastRotCursor = cursorVal;
  const st = document.getElementById('_rot-cursor-style');
  if (!st) return;
  if (cursorVal === 'none') {
    st.textContent = '* { cursor: none !important; }';
  } else if (cursorVal) {
    st.textContent = `* { cursor: ${cursorVal} !important; }`;
  } else {
    st.textContent = '';
  }
}

function _updateRotCursorFromPivot(pivotX, pivotY, mouseX, mouseY) {
  _setRotCursor(_makeCursorForAngle(_rotCursorAngle(pivotX, pivotY, mouseX, mouseY)));
}

// Rotation state — listeners attached once to cwrap
let _rotListenersAttached = false;
let _rotEl = null; // currently selected element for rotation

// ── Pivot handle ──────────────────────────────────────────────────────
// Stored as d.rotPivotX/Y = offset from element center in px (0,0=center)
/** Set CSS transform-origin so rotate animations pivot around rotPivot (offset from center). */
window._applyRotPivotOrigin = function (el, d) {
  if (!el) return;
  const w = (d && d.w != null) ? +d.w : (parseFloat(el.style.width) || el.offsetWidth || 0);
  const h = (d && d.h != null) ? +d.h : (parseFloat(el.style.height) || el.offsetHeight || 0);
  let px = 0, py = 0;
  if (d) {
    px = d.rotPivotX != null ? +d.rotPivotX : 0;
    py = d.rotPivotY != null ? +d.rotPivotY : 0;
  } else {
    px = +el.dataset.rotPivotX || 0;
    py = +el.dataset.rotPivotY || 0;
  }
  if (!px && !py) {
    el.style.transformOrigin = '';
    return;
  }
  el.style.transformOrigin = (w / 2 + px) + 'px ' + (h / 2 + py) + 'px';
};

function _getPivotCanvas(el) {
  const L=parseInt(el.style.left)||0, T=parseInt(el.style.top)||0;
  const W=parseInt(el.style.width)||0, H=parseInt(el.style.height)||0;
  const deg=parseFloat(el.dataset.rot||0)*Math.PI/180;
  const cx=L+W/2, cy=T+H/2;
  // pivot offset in element local space
  const px=parseFloat(el.dataset.rotPivotX||0);
  const py=parseFloat(el.dataset.rotPivotY||0);
  // Pivot canvas = actual element center + pivot rotated by element rotation
  const rad2 = deg;
  return {
    x: L + W/2 + px*Math.cos(rad2) - py*Math.sin(rad2),
    y: T + H/2 + px*Math.sin(rad2) + py*Math.cos(rad2),
    localX: px, localY: py
  };
}

function _buildPivotHandle(overlay, el) {
  const pv = _getPivotCanvas(el);
  const H_SIZE = 10;
  const ph = document.createElement('div');
  ph.id = 'pivot-handle';
  ph.style.cssText = `position:absolute;width:${H_SIZE}px;height:${H_SIZE}px;
    border-radius:50%;background:#8b5cf6;border:2px solid #fff;
    box-shadow:0 0 0 1.5px #8b5cf6, 0 2px 6px rgba(0,0,0,.5);
    left:${pv.x - H_SIZE/2}px;top:${pv.y - H_SIZE/2}px;
    cursor:grab;z-index:10020;pointer-events:auto;`;
  ph.title = 'Точка вращения (перетащите)';
  ph.addEventListener('mouseenter', () => { window._overPivotHandle = true; });
  ph.addEventListener('mouseleave', () => { window._overPivotHandle = false; });

  ph.addEventListener('mousedown', e => {
    e.stopPropagation(); e.preventDefault();
    window._pivotDragging = true;
    window._anyDragging = true;
    // Cancel rubber-band if capture-phase already started it
    const _rb = document.getElementById('rubberband');
    if (_rb) _rb.style.display = 'none';
    ph.style.cursor = 'grabbing';
    const deg = parseFloat(el.dataset.rot||0)*Math.PI/180;
    const cosr = Math.cos(-deg), sinr = Math.sin(-deg); // inverse rot for canvas→local
    const W2=parseInt(el.style.width)||1, H2=parseInt(el.style.height)||1;
    // Lock element position — restore every frame
    const fixedL = parseInt(el.style.left)||0;
    const fixedT = parseInt(el.style.top)||0;
    const snapR = 12;
    const snapPts = [
      [0,0],
      [-W2/2,-H2/2],[W2/2,-H2/2],
      [-W2/2, H2/2],[W2/2, H2/2],
      [0,-H2/2],[0,H2/2],
      [-W2/2,0],[W2/2,0],
    ];

    const onMove = ev => {
      const cv = _toCanvasCoords(ev.clientX, ev.clientY);
      const W3=parseInt(el.style.width)||1, H3=parseInt(el.style.height)||1;
      // Always restore position — pivot change must NOT move element
      el.style.left = fixedL+'px';
      el.style.top  = fixedT+'px';
      // Element center in canvas (fixed)
      const ecx = fixedL + W3/2, ecy = fixedT + H3/2;
      // Mouse position relative to center → rotate to local space
      const dx = cv.x - ecx, dy = cv.y - ecy;
      let lx = dx*cosr - dy*sinr;
      let ly = dx*sinr + dy*cosr;
      lx = Math.max(-W3/2, Math.min(W3/2, lx));
      ly = Math.max(-H3/2, Math.min(H3/2, ly));
      for(const [sx,sy] of snapPts){
        if((lx-sx)*(lx-sx)+(ly-sy)*(ly-sy)<snapR*snapR){lx=sx;ly=sy;break;}
      }
      lx=Math.round(lx); ly=Math.round(ly);
      el.dataset.rotPivotX = lx;
      el.dataset.rotPivotY = ly;
      // Reposition pivot handle in canvas coords
      const _pv2 = _getPivotCanvas(el);
      const _ph2 = document.getElementById('pivot-handle');
      if (_ph2) {
        _ph2.style.left = (_pv2.x - 5) + 'px';
        _ph2.style.top  = (_pv2.y - 5) + 'px';
      }
    };
    const onUp = () => {
      window._pivotDragging = false;
      window._anyDragging = false;
      ph.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if(slides[cur] && el.dataset.id) {
        const d2 = slides[cur].els.find(e=>e.id===el.dataset.id);
        if(d2) { d2.rotPivotX=+el.dataset.rotPivotX||0; d2.rotPivotY=+el.dataset.rotPivotY||0; }
      }
      if(typeof save==='function') save();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Double-click resets pivot to center
  ph.addEventListener('dblclick', e => {
    e.stopPropagation();
    el.dataset.rotPivotX = 0; el.dataset.rotPivotY = 0;
    if(slides[cur] && el.dataset.id) {
      const d2 = slides[cur].els.find(e=>e.id===el.dataset.id);
      if(d2) { d2.rotPivotX=0; d2.rotPivotY=0; }
    }
    if(typeof save==='function') save();
    _updateHandlesOverlay();
  });

  overlay.appendChild(ph);
}

function _getElRotationDeg(el) {
  let deg = parseFloat(el.dataset.rot || 0);
  try {
    const mfx = (el.dataset.shapeFlipH === 'true') ? -1 : 1;
    const mat = new DOMMatrix(getComputedStyle(el).transform);
    if (mat && !isNaN(mat.a)) {
      const computed = Math.atan2(mfx * mat.b, mfx * mat.a) * 180 / Math.PI;
      if (Math.abs(computed - deg) > 0.5) deg = computed;
    }
  } catch (e) {}
  return deg;
}

function _getRotCorners(el) {
  const L = parseInt(el.style.left)||0;
  const T = parseInt(el.style.top)||0;
  const W = parseInt(el.style.width)||0;
  const H = parseInt(el.style.height)||0;
  const deg = _getElRotationDeg(el);
  const rad = deg * Math.PI / 180;
  const cosr = Math.cos(rad), sinr = Math.sin(rad);
  // transformOrigin always 50%50%; rotation center = element center
  const ox = L + W/2, oy = T + H/2;

  function rotCorner(px, py, tangentDeg) {
    const dx = px - ox;
    const dy = py - oy;
    return {
      x: ox + dx*cosr - dy*sinr,
      y: oy + dx*sinr + dy*cosr,
      angle: deg + tangentDeg
    };
  }

  return [
    rotCorner(L,   T,   315), // tl
    rotCorner(L+W, T,   45),  // tr
    rotCorner(L,   T+H, 225), // bl
    rotCorner(L+W, T+H, 135), // br
  ];
}

function _nearMidEdgeHandle(el, canvasX, canvasY) {
  const R = 14;
  const L = parseInt(el.style.left)||0, T = parseInt(el.style.top)||0;
  const W = parseInt(el.style.width)||0, H = parseInt(el.style.height)||0;
  if (W < 8 || H < 8) return false;
  const deg = _getElRotationDeg(el) * Math.PI / 180;
  const cosr = Math.cos(deg), sinr = Math.sin(deg);
  const ecx = L + W/2, ecy = T + H/2;
  const mids = [
    [L + W/2, T],
    [L + W, T + H/2],
    [L + W/2, T + H],
    [L, T + H/2],
  ];
  for (const [px, py] of mids) {
    const dx = px - ecx, dy = py - ecy;
    const hx = ecx + dx*cosr - dy*sinr;
    const hy = ecy + dx*sinr + dy*cosr;
    if (Math.hypot(canvasX - hx, canvasY - hy) <= R) return true;
  }
  return false;
}

function _nearCorner(el, canvasX, canvasY) {
  if (!el) return null;
  if (_nearMidEdgeHandle(el, canvasX, canvasY)) return null;
  const R = 22; // rotation zone radius around corner
  const HANDLE_R = 10; // skip zone covered by corner resize handles
  const corners = _getRotCorners(el);
  const deg = _getElRotationDeg(el) * Math.PI / 180;
  const cosr = Math.cos(-deg), sinr = Math.sin(-deg);
  const L = parseInt(el.style.left)||0, T = parseInt(el.style.top)||0;
  const W = parseInt(el.style.width)||0, H = parseInt(el.style.height)||0;
  const ecx = L + W/2, ecy = T + H/2;
  const inset = Math.min(20, W * 0.35, H * 0.35);
  for (const c of corners) {
    const dx = canvasX - c.x, dy = canvasY - c.y;
    const dist = Math.hypot(dx, dy);
    if (dist > R) continue;
    if (dist < HANDLE_R) continue; // let corner resize handles win
    const lx = (canvasX - ecx) * cosr - (canvasY - ecy) * sinr;
    const ly = (canvasX - ecx) * sinr + (canvasY - ecy) * cosr;
    // Block only the interior — corners stay rotatable even slightly inside bbox
    if (inset > 0 &&
        lx > -W/2 + inset && lx < W/2 - inset &&
        ly > -H/2 + inset && ly < H/2 - inset) continue;
    return c;
  }
  return null;
}

function _toCanvasCoords(clientX, clientY) {
  const canvas = document.getElementById('canvas');
  if (!canvas) return {x:0,y:0};
  const z = typeof _canvasZoom === 'number' ? _canvasZoom : 1;
  // Use canvas element's own bounding rect — accounts for zoom, scroll, and centering
  const r = canvas.getBoundingClientRect();
  return {
    x: (clientX - r.left) / z,
    y: (clientY - r.top)  / z
  };
}

function _addRotationZones(overlay, el) {
  if(el && el.dataset.type==='lego') return; // лего не вращается
  _rotEl = el;
  if (_rotListenersAttached) return;
  _rotListenersAttached = true;

  const cwrap = document.getElementById('cwrap');
  if (!cwrap) return;

  // Inject a style element for global cursor override (needed to show over child elements)
  if (!document.getElementById('_rot-cursor-style')) {
    const st = document.createElement('style');
    st.id = '_rot-cursor-style';
    document.head.appendChild(st);
  }

  document.addEventListener('mousemove', ev => {
    if (typeof window._isPreviewActive === 'function' && window._isPreviewActive()) return;
    if (_rotDragging || !_rotEl) return;
    if (!_rotEl.isConnected) { _rotEl = null; return; }
    if (typeof sel !== 'undefined' && sel && _rotEl !== sel) return;
    if (window._anyDragging) return;
    if (window._curveEditMode) { _setRotCursor(''); return; } // no rotation cursor in curve edit
    const cwrap2 = document.getElementById('cwrap');
    if (!cwrap2) return;
    const cr = cwrap2.getBoundingClientRect();
    if (ev.clientX < cr.left || ev.clientX > cr.right ||
        ev.clientY < cr.top  || ev.clientY > cr.bottom) {
      _setRotCursor(''); return;
    }
    const p = _toCanvasCoords(ev.clientX, ev.clientY);
    const under = document.elementFromPoint(ev.clientX, ev.clientY);
    if (under && under.closest && under.closest('#handles-overlay [data-cls]')) {
      _setRotCursor(''); return;
    }
    const corner = _nearCorner(_rotEl, p.x, p.y);
    if (!corner) { _setRotCursor(''); return; }
    const pv = _getPivotCanvas(_rotEl);
    _updateRotCursorFromPivot(pv.x, pv.y, p.x, p.y);
  });

  // Capture phase: fires before ANY element's mousedown handler
  document.addEventListener('mousedown', ev => {
    if (typeof window._isPreviewActive === 'function' && window._isPreviewActive()) return;
    if (ev.button !== 0 || !_rotEl) return;
    if (!_rotEl.isConnected) { _rotEl = null; return; }
    if (typeof sel !== 'undefined' && sel && _rotEl !== sel) return;
    if (window._resizeDragging) return;
    if (window._curveEditMode) return; // don't rotate while editing curve nodes
    const cwrap2 = document.getElementById('cwrap');
    if (!cwrap2) return;
    const cr = cwrap2.getBoundingClientRect();
    if (ev.clientX < cr.left || ev.clientX > cr.right ||
        ev.clientY < cr.top  || ev.clientY > cr.bottom) return;
    if (window._pivotDragging) return; // pivot handle takes priority
    if (window._overPivotHandle) return; // mouse is over pivot handle
    const rhHit = ev.target.closest && (
      ev.target.closest('#handles-overlay [data-cls]') ||
      ev.target.closest('#handles-overlay [data-line-ep]')
    );
    if (rhHit) return; // resize / line-endpoint handles always win over rotation
    const p = _toCanvasCoords(ev.clientX, ev.clientY);
    const corner = _nearCorner(_rotEl, p.x, p.y);
    if (!corner) return;
    // We're in a rotation zone — always consume the event
    window._anyDragging = true;
    ev.stopPropagation();
    ev.preventDefault();
    _syncRotDragging(true);

    const el = _rotEl;
    const W = parseInt(el.style.width)||0, H = parseInt(el.style.height)||0;
    const pivLX2 = parseFloat(el.dataset.rotPivotX||0);
    const pivLY2 = parseFloat(el.dataset.rotPivotY||0);
    el.style.transformOrigin = '';
    // Get CURRENT actual element position (may differ from stored if pivot was moved)
    const L = parseInt(el.style.left)||0, T = parseInt(el.style.top)||0;
    // Pivot is at local offset (pivLX2, pivLY2) from element center
    // In canvas: element center + local pivot offset
    const elCx = L + W/2, elCy = T + H/2;
    const deg0 = parseFloat(el.dataset.rot||0)*Math.PI/180;
    // Pivot canvas position = center + rotate(localPivot, deg)
    // With transformOrigin=50%50%, element rotates around CSS center which IS elCx,elCy
    // But visual pivot is at: elCx + pivLX2*cos - pivLY2*sin, etc.
    const cx = elCx + pivLX2*Math.cos(deg0) - pivLY2*Math.sin(deg0);
    const cy = elCy + pivLX2*Math.sin(deg0) + pivLY2*Math.cos(deg0);
    // Fixed reference: element center at t=0 (relative to pivot)
    const startCx = elCx, startCy = elCy;

    const startAngle = parseFloat(el.dataset.rot || 0);
    // a0: angle from pivot to mouse at drag start — this is the reference angle
    const a0 = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI;
    _updateRotCursorFromPivot(cx, cy, p.x, p.y);

    let _rotRaf = null;
    const onMove = e => {
      if (typeof window._isPreviewActive === 'function' && window._isPreviewActive()) {
        onUp();
        return;
      }
      const clientX = e.clientX, clientY = e.clientY, shiftKey = e.shiftKey;
      if (_rotRaf) return; // throttle to one frame
      _rotRaf = requestAnimationFrame(() => {
        _rotRaf = null;
        const q = _toCanvasCoords(clientX, clientY);
        _updateRotCursorFromPivot(cx, cy, q.x, q.y);
        const a = Math.atan2(q.y - cy, q.x - cx) * 180 / Math.PI;
        let deg = Math.round(startAngle + (a - a0));
        if (shiftKey) deg = Math.round(deg / 15) * 15;
        el.style.transform = `rotate(${deg}deg)`;
        el.dataset.rot = deg;
        if(pivLX2 || pivLY2){
          const delta = (deg - startAngle)*Math.PI/180;
          const cosd=Math.cos(delta), sind=Math.sin(delta);
          const dcx=startCx-cx, dcy=startCy-cy;
          el.style.left = Math.round(cx + dcx*cosd - dcy*sind - W/2)+'px';
          el.style.top  = Math.round(cy + dcx*sind + dcy*cosd - H/2)+'px';
        }
        const pRot = document.getElementById('p-rot');
        if (pRot) pRot.value = deg;
        _repositionHandlesOverlay(el);
        if (typeof updateConnectorsFor === 'function') updateConnectorsFor(el.dataset.id);
      });
    };

    const onUp = () => {
      _syncRotDragging(false);
      window._anyDragging = false;
      window._overPivotHandle = false;
      _setRotCursor('');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      // Restore selection if it was lost during rotation
      if (el && typeof pick === 'function') pick(el);
      if (typeof commitAll === 'function') commitAll();
      _updateHandlesOverlay();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, true);
}

// Called externally after pick/deselect
window._refreshHandlesOverlay = function(){
  if(typeof sel !== 'undefined' && sel) {
    _rotEl = sel;
  } else {
    _rotEl = null;
  }
  _updateHandlesOverlay();
};

// ══════════════ CURVE BEZIER EDITOR ══════════════
let _curveEditing = false;
let _curveHandles = [];
let _curveSelPts = new Set(); // selected point indices
const _ptClicks = {}; // click counters per point index, survives fullRebuild
const _ptTimers = {}; // click timers per point index
window._curveEditMode = false; // true = edit nodes, false = move figure

// Rubber-band select curve nodes within canvas-space rect
function _curveRubberBandSelect(rx, ry, rw, rh) {
  if (!sel || sel.dataset.shape !== 'curve') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d || !d.curvePoints) return;
  const L = parseInt(sel.style.left)||0, T = parseInt(sel.style.top)||0;
  const W = parseInt(sel.style.width)||1, H = parseInt(sel.style.height)||1;
  const rot = parseFloat(sel.dataset.rot||0) * Math.PI / 180;
  const cosr = Math.cos(rot), sinr = Math.sin(rot);
  const ecx = L+W/2, ecy = T+H/2;
  function toCanvas(nx, ny) {
    const lx = nx*W - W/2, ly = ny*H - H/2;
    return { x: ecx + lx*cosr - ly*sinr, y: ecy + lx*sinr + ly*cosr };
  }
  let changed = false;
  d.curvePoints.forEach((pt, i) => {
    const p = toCanvas(pt.x, pt.y);
    if (p.x >= rx && p.x <= rx+rw && p.y >= ry && p.y <= ry+rh) {
      if (!_curveSelPts.has(i)) { _curveSelPts.add(i); changed = true; }
    }
  });
  if (changed) {
    _clearCurveEditor();
    _buildCurveEditor();
    if (typeof syncProps === 'function') syncProps();
  }
}

// Toggle curve node editing mode
function toggleCurveEditMode() {
  const wasEdit = window._curveEditMode;
  window._curveEditMode = !window._curveEditMode;
  _curveSelPts.clear();
  Object.keys(_ptClicks).forEach(k => delete _ptClicks[k]);
  Object.keys(_ptTimers).forEach(k => { clearTimeout(_ptTimers[k]); delete _ptTimers[k]; });
  _clearCurveEditor();
  const btn = document.getElementById('sh-curve-edit-btn');
  if (btn) {
    btn.classList.toggle('active', window._curveEditMode);
    btn.title = window._curveEditMode ? 'Выйти из редактирования (Enter/Esc)' : 'Редактировать узлы';
    const span = btn.querySelector('span');
    if (span) span.textContent = window._curveEditMode ? 'Перемещение' : 'Узлы';
  }
  // Recalculate bbox when exiting
  if (!window._curveEditMode) { _applyCurveBBox(); if (typeof save === 'function') save(); }
  if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
  if (typeof syncProps === 'function') syncProps();
}

// Deactivate curve edit mode (called on deselect / shape change)
function _exitCurveEditMode() {
  if (!window._curveEditMode) return;
  window._curveEditMode = false;
  _curveSelPts.clear();
  _clearCurveEditor(true);
  const btn = document.getElementById('sh-curve-edit-btn');
  if (btn) {
    btn.classList.remove('active');
    const span = btn.querySelector('span');
    if (span) span.textContent = 'Узлы';
  }
  // Recalculate bbox on exit so selection rect fits the curve
  _applyCurveBBox();
  if (typeof save === 'function') save();
  if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
  if (typeof syncProps === 'function') syncProps();
}

// Resize curve element to fit actual points + handles extent
// Reads directly from sel/slides — no closure dependency
function _applyCurveBBox() {
  if (!sel || sel.dataset.shape !== 'curve') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d || !d.curvePoints || d.curvePoints.length < 2) return;

  const cL = parseInt(sel.style.left) || 0;
  const cT = parseInt(sel.style.top)  || 0;
  const cW = parseInt(sel.style.width)  || 1;
  const cH = parseInt(sel.style.height) || 1;

  // Find bounding box in absolute canvas px
  let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
  d.curvePoints.forEach(pt => {
    [ [pt.x, pt.y], [pt.cp1x, pt.cp1y], [pt.cp2x, pt.cp2y] ].forEach(([nx, ny]) => {
      if (nx == null) return;
      const ax = cL + nx * cW, ay = cT + ny * cH;
      if (ax < mnX) mnX = ax; if (ax > mxX) mxX = ax;
      if (ay < mnY) mnY = ay; if (ay > mxY) mxY = ay;
    });
  });
  if (!isFinite(mnX)) return;

  const sw = d.sw != null ? +d.sw : 2;
  const pad = Math.max(sw + 4, 6);
  const nL = Math.round(mnX - pad), nT = Math.round(mnY - pad);
  const nW = Math.max(20, Math.round(mxX - mnX + pad * 2));
  const nH = Math.max(20, Math.round(mxY - mnY + pad * 2));
  if (nL === cL && nT === cT && nW === cW && nH === cH) return;

  // Remap normalized → absolute → new normalized
  d.curvePoints = d.curvePoints.map(pt => {
    const rx = nx => (cL + nx * cW - nL) / nW;
    const ry = ny => (cT + ny * cH - nT) / nH;
    const np = { x: rx(pt.x), y: ry(pt.y), type: pt.type };
    if (pt.cp1x != null) { np.cp1x = rx(pt.cp1x); np.cp1y = ry(pt.cp1y); }
    if (pt.cp2x != null) { np.cp2x = rx(pt.cp2x); np.cp2y = ry(pt.cp2y); }
    // Preserve per-node style properties
    if (pt.sw != null) np.sw = pt.sw;
    if (pt.strokeStyle != null) np.strokeStyle = pt.strokeStyle;
    return np;
  });

  // Update DOM and dataset — save() will read these
  sel.style.left = nL + 'px'; sel.style.top = nT + 'px';
  sel.style.width = nW + 'px'; sel.style.height = nH + 'px';
  sel.dataset.curvePoints = JSON.stringify(d.curvePoints);
  d.x = nL; d.y = nT; d.w = nW; d.h = nH;
  if (typeof renderShapeEl === 'function') renderShapeEl(sel, d);
}

function _buildCurveEditor() {
  if (window._curveDragging) return;
  if (!window._curveEditMode) { _clearCurveEditor(true); return; }
  _clearCurveEditor();
  if (!sel || sel.dataset.type !== 'shape') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  const sh = typeof SHAPES !== 'undefined' && SHAPES.find(s => s.id === d.shape);
  if (!sh || sh.special !== 'curve') return;
  if (!d.curvePoints || d.curvePoints.length < 2) {
    if (typeof _defaultCurvePoints === 'function') d.curvePoints = _defaultCurvePoints();
    else return;
  }
  if (typeof _normalizeCurvePoints === 'function') _normalizeCurvePoints(d.curvePoints, d.curveClosed);
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  _curveEditing = true;

  const L = parseInt(sel.style.left)||0, T = parseInt(sel.style.top)||0;
  const W = parseInt(sel.style.width)||1, H = parseInt(sel.style.height)||1;
  const rot = parseFloat(sel.dataset.rot||0) * Math.PI / 180;
  const cosr = Math.cos(rot), sinr = Math.sin(rot);
  const ecx = L + W/2, ecy = T + H/2;

  function toCanvas(nx, ny) {
    const lx = nx * W - W/2, ly = ny * H - H/2;
    return { x: ecx + lx*cosr - ly*sinr, y: ecy + lx*sinr + ly*cosr };
  }
  function toNorm(cx, cy) {
    const dx = cx - ecx, dy = cy - ecy;
    const lx = dx*cosr + dy*sinr, ly = -dx*sinr + dy*cosr;
    return { x: (lx + W/2) / W, y: (ly + H/2) / H };
  }
  function moveDot(dot, nx, ny) {
    const p = toCanvas(nx, ny);
    const half = parseInt(dot.style.width||'10') / 2;
    dot.style.left = (p.x-half)+'px'; dot.style.top = (p.y-half)+'px';
  }
  function updateLine(line, ax, ay, hx, hy) {
    const a = toCanvas(ax, ay), h = toCanvas(hx, hy);
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
    line.setAttribute('x2', h.x); line.setAttribute('y2', h.y);
  }
  function makeDot(color, nx, ny, cursor, zIdx, borderColor, size) {
    const pos = toCanvas(nx, ny);
    const sz = size || 10;
    const half = sz / 2;
    const dot = document.createElement('div');
    dot.className = 'curve-handle';
    dot.style.cssText = `position:absolute;width:${sz}px;height:${sz}px;border-radius:50%;
      background:${color};border:2px solid ${borderColor||'#fff'};
      box-shadow:0 0 0 1.5px rgba(0,0,0,.4),0 2px 4px rgba(0,0,0,.4);
      left:${pos.x-half}px;top:${pos.y-half}px;
      cursor:${cursor||'move'};z-index:${zIdx||10004};pointer-events:auto;`;
    canvas.appendChild(dot);
    _curveHandles.push(dot);
    return dot;
  }
  function makeSvgLine(ax, ay, hx, hy) {
    const a = toCanvas(ax, ay), h = toCanvas(hx, hy);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:10002;overflow:visible;';
    svg.classList.add('curve-handle');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);line.setAttribute('x2',h.x);line.setAttribute('y2',h.y);
    line.setAttribute('stroke','rgba(255,255,255,0.65)');line.setAttribute('stroke-width','1');line.setAttribute('stroke-dasharray','3 2');
    svg.appendChild(line);
    canvas.appendChild(svg);
    _curveHandles.push(svg);
    return line;
  }
  function makeDraggable(dot, onDrag, onEnd) {
    let _dragging = false;
    dot.addEventListener('mousedown', ev => {
      ev.stopPropagation(); ev.preventDefault();
      window._anyDragging = true;
      window._curveDragging = true;
      _dragging = true;
      const move = mv => {
        if (!_dragging) return;
        const cv = _toCanvasCoords(mv.clientX, mv.clientY);
        onDrag(cv.x, cv.y);
      };
      const up = () => {
        _dragging = false;
        window._anyDragging = false;
        window._curveDragging = false;
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        if (onEnd) onEnd();
        if (typeof save === 'function') save();
        if (typeof drawThumbs === 'function') drawThumbs();
        if (typeof saveState === 'function') saveState();
        // Only update bbox when NOT actively editing nodes (avoids coord drift)
        if (!window._curveEditMode) _applyCurveBBox();
        if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  }
  function commit() {
    sel.dataset.curvePoints = JSON.stringify(d.curvePoints);
    sel.dataset.curveClosed = d.curveClosed ? '1' : '0';
    // Always use fresh d from slides for rendering (preserves fill, stroke etc. changes)
    const _freshD = (slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id)) || d;
    // Sync curvePoints from closure into freshD
    _freshD.curvePoints = d.curvePoints;
    _freshD.curveClosed = d.curveClosed;
    if (typeof renderShapeEl === 'function') renderShapeEl(sel, _freshD);
  }
  function commitFinal() {
    commit();
  }
  function fullRebuild() { commit(); _clearCurveEditor(); _buildCurveEditor(); }

  // Drag on curve line — creates/adjusts handles of nearest segment
  function _sampleBezier(p0, p1, p2, p3, t) {
    const u = 1-t;
    return {
      x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
      y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y,
    };
  }
  function _closestOnCurve(cx, cy) {
    // Returns {segIdx, t, dist} for the closest point on any segment
    const pts = d.curvePoints;
    let bestDist = Infinity, bestSeg = 0, bestT = 0.5;
    const segs = d.curveClosed ? pts.length : pts.length - 1;
    for (let si = 0; si < segs; si++) {
      const pi = si, pj = d.curveClosed ? (si+1) % pts.length : si+1;
      const a = pts[pi], b = pts[pj];
      const p0 = toCanvas(a.x, a.y);
      const p1 = toCanvas(a.cp2x != null ? a.cp2x : a.x, a.cp2y != null ? a.cp2y : a.y);
      const p2 = toCanvas(b.cp1x != null ? b.cp1x : b.x, b.cp1y != null ? b.cp1y : b.y);
      const p3 = toCanvas(b.x, b.y);
      for (let k = 0; k <= 20; k++) {
        const t = k / 20;
        const pt = _sampleBezier(p0, p1, p2, p3, t);
        const dx = pt.x - cx, dy = pt.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < bestDist) { bestDist = dist; bestSeg = si; bestT = t; }
      }
    }
    return { segIdx: bestSeg, t: bestT, dist: bestDist };
  }

  // Add curve line drag handler on document in CAPTURE phase
  // so it fires before element-level listeners (14-drag.js)
  function _cvLineDragFn(ev) {
    if (!window._curveEditMode || window._curveDragging || window._anyDragging) return;
    if (!_curveEditing) return;
    if (ev.button !== 0) return;
    const cv = _toCanvasCoords(ev.clientX, ev.clientY);
    const closest = _closestOnCurve(cv.x, cv.y);
    if (closest.dist > 40) return; // not near the curve
    // Check not clicking on an existing handle dot
    const onHandle = document.elementFromPoint(ev.clientX, ev.clientY);
    if (onHandle && onHandle.classList.contains('curve-handle')) return;

    ev.stopPropagation(); ev.preventDefault();
    window._anyDragging = true;
    window._curveDragging = true;

    const si = closest.segIdx;
    const pts = d.curvePoints;
    const pi = si, pj = d.curveClosed ? (si+1) % pts.length : si+1;
    const ptA = pts[pi], ptB = pts[pj];
    const startN = toNorm(cv.x, cv.y);

    // Track position in normalized coords to avoid drift
    let prevNorm = toNorm(cv.x, cv.y);
    let startCanvas = {x: cv.x, y: cv.y};
    let dragged = false;

    const onMove = (mv) => {
      const c2 = _toCanvasCoords(mv.clientX, mv.clientY);
      if (!dragged && Math.hypot(c2.x - startCanvas.x, c2.y - startCanvas.y) < 3) return;
      dragged = true;
      // Delta in normalized coords — computed from previous frame to avoid accumulation
      const curNorm = toNorm(c2.x, c2.y);
      const ddx = curNorm.x - prevNorm.x, ddy = curNorm.y - prevNorm.y;
      prevNorm = curNorm;
      // Apply to both handles: ptA.cp2 and ptB.cp1
      const t = closest.t;
      const wA = 1 - t, wB = t;
      const hDist = 0.3;
      if (ptA.cp2x == null) {
        ptA.cp2x = ptA.x + (ptB.x - ptA.x) * hDist;
        ptA.cp2y = ptA.y + (ptB.y - ptA.y) * hDist;
      }
      if (ptB.cp1x == null) {
        ptB.cp1x = ptB.x + (ptA.x - ptB.x) * hDist;
        ptB.cp1y = ptB.y + (ptA.y - ptB.y) * hDist;
      }
      // Apply drag to cp2 of A, respecting smooth/symmetric type
      ptA.cp2x += ddx * wA * 2; ptA.cp2y += ddy * wA * 2;
      if (ptA.type === 'symmetric') {
        ptA.cp1x = ptA.x*2 - ptA.cp2x; ptA.cp1y = ptA.y*2 - ptA.cp2y;
      } else if (ptA.type === 'smooth' && ptA.cp1x != null) {
        const len1 = Math.hypot(ptA.cp1x - ptA.x, ptA.cp1y - ptA.y);
        const dx2 = ptA.cp2x - ptA.x, dy2 = ptA.cp2y - ptA.y;
        const len2 = Math.hypot(dx2, dy2) || 0.001;
        ptA.cp1x = ptA.x - dx2/len2*len1; ptA.cp1y = ptA.y - dy2/len2*len1;
      }
      // Apply drag to cp1 of B, respecting smooth/symmetric type
      ptB.cp1x += ddx * wB * 2; ptB.cp1y += ddy * wB * 2;
      if (ptB.type === 'symmetric') {
        ptB.cp2x = ptB.x*2 - ptB.cp1x; ptB.cp2y = ptB.y*2 - ptB.cp1y;
      } else if (ptB.type === 'smooth' && ptB.cp2x != null) {
        const len1b = Math.hypot(ptB.cp2x - ptB.x, ptB.cp2y - ptB.y);
        const dx1b = ptB.cp1x - ptB.x, dy1b = ptB.cp1y - ptB.y;
        const len1bl = Math.hypot(dx1b, dy1b) || 0.001;
        ptB.cp2x = ptB.x - dx1b/len1bl*len1b; ptB.cp2y = ptB.y - dy1b/len1bl*len1b;
      }
      commit();
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      window._anyDragging = false;
      window._curveDragging = false;
      if (dragged) {
        // Sync closure d.curvePoints back to slides and dataset
        // Read fresh d from slides to preserve any sw changes made during this session
        const freshD = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
        if (freshD) {
          // Merge our edited curvePoints into freshD (preserve sw from freshD)
          const editedPts = d.curvePoints;
          if (freshD.curvePoints && editedPts) {
            freshD.curvePoints.forEach((fp, i) => {
              if (editedPts[i]) {
                fp.x = editedPts[i].x; fp.y = editedPts[i].y;
                fp.cp1x = editedPts[i].cp1x; fp.cp1y = editedPts[i].cp1y;
                fp.cp2x = editedPts[i].cp2x; fp.cp2y = editedPts[i].cp2y;
                // Preserve sw from freshD (don't overwrite with closure's sw)
              }
            });
            sel.dataset.curvePoints = JSON.stringify(freshD.curvePoints);
          }
        } else {
          commit(); // fallback
        }
        if (typeof save === 'function') save();
        if (typeof drawThumbs === 'function') drawThumbs();
        if (typeof saveState === 'function') saveState();
        if (typeof _clearCurveEditor === 'function') _clearCurveEditor();
        if (typeof _buildCurveEditor === 'function') _buildCurveEditor();
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
  // Store cleanup: use capture phase so we intercept before element listeners
  document.addEventListener('mousedown', _cvLineDragFn, true);
  canvas._cvLineDragFn = _cvLineDragFn;
  _curveHandles.push(null);

  // Update add-node button state based on selection
  function updateButtonState() {
    const addBtn = document.getElementById('sh-curve-add-btn');
    if (addBtn) {
      // Enable when 2 adjacent selected, OR when 1 endpoint selected (for extension)
      const selArr = [..._curveSelPts].sort((a,b)=>a-b);
      const n = d.curvePoints.length;
      const twoAdj = selArr.length === 2 && (selArr[1]===selArr[0]+1 || (d.curveClosed && selArr[0]===0 && selArr[1]===n-1));
      const oneEndpoint = selArr.length === 1 && !d.curveClosed && (selArr[0]===0 || selArr[0]===n-1);
      addBtn.disabled = !(twoAdj || oneEndpoint);
    }
    const delBtn = document.getElementById('sh-curve-del-btn');
    if (delBtn) delBtn.disabled = _curveSelPts.size !== 1 || d.curvePoints.length <= 2;
  }

  // Set anchor selection state visually
  function setAnchorSelected(dot, idx, selected) {
    if (selected) {
      _curveSelPts.add(idx);
      dot.style.background = '#f97316';
      dot.style.borderColor = '#fff';
      dot.style.boxShadow = '0 0 0 2px #f97316,0 2px 4px rgba(0,0,0,.5)';
    } else {
      _curveSelPts.delete(idx);
      const isCorner = d.curvePoints[idx] && d.curvePoints[idx].type === 'corner';
      dot.style.background = isCorner ? '#ef4444' : '#fbbf24';
      dot.style.borderColor = '#fff';
      dot.style.boxShadow = '0 0 0 1.5px rgba(0,0,0,.4),0 2px 4px rgba(0,0,0,.4)';
    }
    updateButtonState();
  }

  // Build per-point DOM refs
  const ptRefs = d.curvePoints.map((pt, i) => {
    const refs = { anchor: null, cp1dot: null, cp1line: null, cp2dot: null, cp2line: null };
    const isSelected = _curveSelPts.has(i);

    // Only show handles for selected point
    if (isSelected) {
      if (pt.cp1x != null) refs.cp1line = makeSvgLine(pt.x, pt.y, pt.cp1x, pt.cp1y);
      if (pt.cp2x != null) refs.cp2line = makeSvgLine(pt.x, pt.y, pt.cp2x, pt.cp2y);

      if (pt.cp1x != null) {
        const hd = makeDot('#a78bfa', pt.cp1x, pt.cp1y, 'crosshair', 10003);
        refs.cp1dot = hd;
        makeDraggable(hd, (cx, cy) => {
          const n = toNorm(cx, cy);
          pt.cp1x = n.x; pt.cp1y = n.y;
          if (pt.cp2x != null && (pt.type === 'symmetric' || pt.type === 'smooth')) {
            const dx1 = n.x - pt.x, dy1 = n.y - pt.y;
            const len1 = Math.hypot(dx1, dy1) || 0.001;
            if (pt.type === 'symmetric') {
              pt.cp2x = pt.x - dx1; pt.cp2y = pt.y - dy1;
            } else {
              const len2 = Math.hypot(pt.cp2x - pt.x, pt.cp2y - pt.y);
              pt.cp2x = pt.x - dx1/len1*len2; pt.cp2y = pt.y - dy1/len1*len2;
            }
            if (refs.cp2dot) moveDot(refs.cp2dot, pt.cp2x, pt.cp2y);
            if (refs.cp2line) updateLine(refs.cp2line, pt.x, pt.y, pt.cp2x, pt.cp2y);
          }
          moveDot(hd, n.x, n.y);
          if (refs.cp1line) updateLine(refs.cp1line, pt.x, pt.y, n.x, n.y);
          commit();
        }, commitFinal);
      }
      if (pt.cp2x != null) {
        const hd = makeDot('#a78bfa', pt.cp2x, pt.cp2y, 'crosshair', 10003);
        refs.cp2dot = hd;
        makeDraggable(hd, (cx, cy) => {
          const n = toNorm(cx, cy);
          pt.cp2x = n.x; pt.cp2y = n.y;
          if (pt.cp1x != null && (pt.type === 'symmetric' || pt.type === 'smooth')) {
            const dx2 = n.x - pt.x, dy2 = n.y - pt.y;
            const len2 = Math.hypot(dx2, dy2) || 0.001;
            if (pt.type === 'symmetric') {
              pt.cp1x = pt.x - dx2; pt.cp1y = pt.y - dy2;
            } else {
              const len1 = Math.hypot(pt.cp1x - pt.x, pt.cp1y - pt.y);
              pt.cp1x = pt.x - dx2/len2*len1; pt.cp1y = pt.y - dy2/len2*len1;
            }
            if (refs.cp1dot) moveDot(refs.cp1dot, pt.cp1x, pt.cp1y);
            if (refs.cp1line) updateLine(refs.cp1line, pt.x, pt.y, pt.cp1x, pt.cp1y);
          }
          moveDot(hd, n.x, n.y);
          if (refs.cp2line) updateLine(refs.cp2line, pt.x, pt.y, n.x, n.y);
          commit();
        }, commitFinal);
      }
    }

    // Anchor point color by type
    const anchorColor = isSelected ? '#f97316' : (pt.type === 'corner' ? '#ef4444' : '#fbbf24');
    const anchorShadow = isSelected ? '0 0 0 2px #f97316,0 2px 4px rgba(0,0,0,.5)' : '0 0 0 1.5px rgba(0,0,0,.4),0 2px 4px rgba(0,0,0,.4)';
    // Size the dot based on node's sw if set
    const _nodeSw = pt.sw != null ? pt.sw : (d.sw != null ? +d.sw : 2);
    const _dotSize = Math.max(8, Math.min(20, 6 + _nodeSw));
    const dot = makeDot(anchorColor, pt.x, pt.y, 'move', 10004, null, _dotSize);
    if (isSelected) dot.style.boxShadow = anchorShadow;
    refs.anchor = dot;

    let _moved = false;
    // Store initial norm position at mousedown for stable drag reference
    let _dragStartNorm = null;

    dot.addEventListener('mousedown', ev => {
      _moved = false;
      _dragStartNorm = { x: pt.x, y: pt.y };
    });
    dot.addEventListener('mousemove', () => { _moved = true; });

    makeDraggable(dot, (cx, cy) => {
      _moved = true;
      const n = toNorm(cx, cy);
      // Move only THIS node's handles — don't touch other points
      const dx = n.x - pt.x, dy = n.y - pt.y;
      if (pt.cp1x != null) { pt.cp1x += dx; pt.cp1y += dy; }
      if (pt.cp2x != null) { pt.cp2x += dx; pt.cp2y += dy; }
      pt.x = n.x; pt.y = n.y;
      moveDot(dot, pt.x, pt.y);
      if (refs.cp1dot) moveDot(refs.cp1dot, pt.cp1x, pt.cp1y);
      if (refs.cp2dot) moveDot(refs.cp2dot, pt.cp2x, pt.cp2y);
      if (refs.cp1line) updateLine(refs.cp1line, pt.x, pt.y, pt.cp1x, pt.cp1y);
      if (refs.cp2line) updateLine(refs.cp2line, pt.x, pt.y, pt.cp2x, pt.cp2y);
      commit();
    }, () => {
      if (_moved) { commitFinal(); return; }
      // Click logic with double-click detection
      _ptClicks[i] = (_ptClicks[i] || 0) + 1;
      if (_ptTimers[i]) clearTimeout(_ptTimers[i]);

      if (_ptClicks[i] >= 2) {
        // Double click: toggle type, keep selection
        _ptClicks[i] = 0;
        _curveSelPts.add(i);
        const livePt = d.curvePoints[i];
        if (!livePt) return;
        const wasCorner = livePt.type === 'corner';
        if (wasCorner) {
          livePt.type = 'smooth';
          if (livePt.cp1x != null && livePt.cp2x != null) {
            const dx2 = livePt.cp2x - livePt.x, dy2 = livePt.cp2y - livePt.y;
            const len2 = Math.hypot(dx2, dy2) || 0.001;
            const len1 = Math.hypot(livePt.cp1x - livePt.x, livePt.cp1y - livePt.y) || len2;
            livePt.cp1x = livePt.x - dx2/len2*len1;
            livePt.cp1y = livePt.y - dy2/len2*len1;
          } else if (livePt.cp2x != null) {
            livePt.cp1x = livePt.x*2 - livePt.cp2x; livePt.cp1y = livePt.y*2 - livePt.cp2y;
          } else if (livePt.cp1x != null) {
            livePt.cp2x = livePt.x*2 - livePt.cp1x; livePt.cp2y = livePt.y*2 - livePt.cp1y;
          }
        } else {
          livePt.type = 'corner';
        }
        if (typeof _normalizeCurvePoints === 'function') _normalizeCurvePoints(d.curvePoints, d.curveClosed);
        commit(); fullRebuild();
      } else {
        // Single click: toggle selection for this node
        _ptTimers[i] = setTimeout(() => {
          _ptClicks[i] = 0;
          const alreadySel = _curveSelPts.has(i);
          if (alreadySel) {
            // Second click on already-selected: deselect
            setAnchorSelected(dot, i, false);
          } else {
            // First click: select, show handles
            _curveSelPts.add(i);
            setAnchorSelected(dot, i, true);
          }
          fullRebuild();
          if (typeof syncProps === 'function') syncProps();
        }, 250);
      }
    });

    return refs;
  });

  // Initially hide handles of unselected points (already hidden since we don't create them)
  updateButtonState();
}

function _clearCurveEditor(clearSel) {
  document.querySelectorAll('.curve-handle').forEach(h => h.remove());
  _curveHandles = [];
  _curveEditing = false;
  if (clearSel) _curveSelPts.clear();
  // Remove canvas line-drag handler if present
  const cv2 = document.getElementById('canvas');
  if (cv2 && cv2._cvLineDragFn) {
    document.removeEventListener('mousedown', cv2._cvLineDragFn, true);
    delete cv2._cvLineDragFn;
  }
}

function curveAddNode() {
  if (!sel || sel.dataset.type !== 'shape') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d || !d.curvePoints) return;
  const pts = d.curvePoints;
  const n = pts.length;
  const w = d.w || 200, h = d.h || 200;
  // 50px in normalized coords
  const dist50x = 50 / w, dist50y = 50 / h;

  const selArr = [..._curveSelPts].sort((a,b) => a-b);

  // ── Endpoint extension: single selected point at start or end ──
  if (selArr.length === 1 && !d.curveClosed) {
    const idx = selArr[0];
    const isFirst = idx === 0;
    const isLast  = idx === n - 1;

    if (isFirst || isLast) {
      const ep  = pts[idx];                          // endpoint
      const adj = pts[isFirst ? 1 : n - 2];         // adjacent point

      // Tangent direction at endpoint: from adj toward ep
      let tx = ep.x - adj.x, ty = ep.y - adj.y;
      const len = Math.hypot(tx, ty);
      if (len > 0.0001) { tx /= len; ty /= len; }
      else { tx = isFirst ? -1 : 1; ty = 0; }

      // New point 50px further along the tangent direction
      const nx = ep.x + tx * dist50x;
      const ny = ep.y + ty * dist50y;

      // Handle for the new endpoint (continues in same direction)
      const cpDist = 0.33;
      const newPt = {
        x: nx, y: ny,
        cp1x: nx - tx * cpDist * dist50x * 3,
        cp1y: ny - ty * cpDist * dist50y * 3,
        cp2x: nx + tx * cpDist * dist50x * 3,
        cp2y: ny + ty * cpDist * dist50y * 3,
        type: 'smooth'
      };
      // Also update the outgoing/incoming handle on the existing endpoint
      if (isLast) {
        if (!ep.cp2x) ep.cp2x = ep.x + tx * cpDist * dist50x * 3;
        if (!ep.cp2y) ep.cp2y = ep.y + ty * cpDist * dist50y * 3;
        pts.push(newPt);
        _curveSelPts.clear();
        _curveSelPts.add(n); // new last index
      } else {
        if (!ep.cp1x) ep.cp1x = ep.x - tx * cpDist * dist50x * 3;
        if (!ep.cp1y) ep.cp1y = ep.y - ty * cpDist * dist50y * 3;
        pts.unshift(newPt);
        _curveSelPts.clear();
        _curveSelPts.add(0);
      }

      if (typeof _normalizeCurvePoints === 'function') _normalizeCurvePoints(pts, d.curveClosed);
      d.curvePoints = pts;
      sel.dataset.curvePoints = JSON.stringify(pts);
      if (typeof renderShapeEl === 'function') renderShapeEl(sel, d);
      _clearCurveEditor();
      _buildCurveEditor();
      if (typeof save === 'function') save();
      if (typeof saveState === 'function') saveState();
      return;
    }
  }

  // ── Default: insert midpoint between two selected adjacent points ──
  if (selArr.length === 2) {
    const [ia, ib] = selArr;
    const adjacent = (ib === ia + 1) || (d.curveClosed && ia === 0 && ib === n-1);
    if (adjacent) {
      const [pi, pj] = ib === ia + 1 ? [ia, ib] : [ib, ia];
      const a = pts[pi], b = pts[pj];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const newPt = {
        x: mx, y: my,
        cp1x: mx - (b.x - a.x) * 0.1, cp1y: my - (b.y - a.y) * 0.1,
        cp2x: mx + (b.x - a.x) * 0.1, cp2y: my + (b.y - a.y) * 0.1,
        type: 'smooth'
      };
      const insertIdx = ib === ia + 1 ? ib : 1;
      pts.splice(insertIdx, 0, newPt);
      _curveSelPts.clear();
      _curveSelPts.add(insertIdx);
    }
  }

  if (typeof _normalizeCurvePoints === 'function') _normalizeCurvePoints(pts, d.curveClosed);
  d.curvePoints = pts;
  sel.dataset.curvePoints = JSON.stringify(pts);
  if (typeof renderShapeEl === 'function') renderShapeEl(sel, d);
  _clearCurveEditor();
  _buildCurveEditor();
  if (typeof save === 'function') save();
  if (typeof saveState === 'function') saveState();
}

function curveRemoveNode() {
  if (!sel || sel.dataset.type !== 'shape') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d || !d.curvePoints || d.curvePoints.length <= 2) return;
  // Remove selected point if exactly one selected
  if (_curveSelPts.size === 1) {
    const idx = [..._curveSelPts][0];
    d.curvePoints.splice(idx, 1);
    _curveSelPts.clear();
  } else {
    // Fallback: remove last
    d.curvePoints.pop();
    _curveSelPts.clear();
  }
  if (typeof _normalizeCurvePoints === 'function') _normalizeCurvePoints(d.curvePoints, d.curveClosed);
  sel.dataset.curvePoints = JSON.stringify(d.curvePoints);
  if (typeof renderShapeEl === 'function') renderShapeEl(sel, d);
  _clearCurveEditor();
  _buildCurveEditor();
  if (typeof save === 'function') save();
  if (typeof saveState === 'function') saveState();
}

