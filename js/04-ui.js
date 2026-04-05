
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
  if(name==='anim'){openAnimPanel();}else{closeAnimPanel();}
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
function showGuides(el){
  clearGuides();
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
      if(!noStretch.has(d.type)){
        // Text, code, markdown, applets scale with canvas
        d.w=Math.round(d.w*sx);
        d.h=Math.round(d.h*sy);
      }
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
  // Pivot handle is inside element — rotates automatically with CSS, no reposition needed
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
  // Reposition chevron handle
  const _ch2 = document.querySelector('.chev-handle');
  if (_ch2 && d2) {
    const _sh2 = typeof SHAPES !== 'undefined' && SHAPES.find(s => s.id === d2.shape);
    if (_sh2 && _sh2.special === 'chevron') {
      const cskew = Math.max(0, Math.min(45, +(d2.chevSkew??25)));
      const s = cskew / 100;
      const tip = elW * s;
      const isLeft = d2.shape === 'chevronLeft';
      const clx = isLeft ? (elW/2 - tip) : (-elW/2 + tip);
      const cly = 0;
      _ch2.style.left = (ecx + clx*cosr - cly*sinr - 6)+'px';
      _ch2.style.top  = (ecy + clx*sinr + cly*cosr - 6)+'px';
    }
  }
}


// ══════════════ STAR INNER-RADIUS HANDLE ══════════════
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

  // Snapshot geometry at build time (same approach as _buildParaHandle)
  const L = parseInt(sel.style.left)||0, T = parseInt(sel.style.top)||0;
  const W = parseInt(sel.style.width)||1, H = parseInt(sel.style.height)||1;
  const rot = parseFloat(sel.dataset.rot||0) * Math.PI / 180;
  const cosr = Math.cos(rot), sinr = Math.sin(rot);
  const ecx = L + W/2, ecy = T + H/2;
  const isLeft = d.shape === 'chevronLeft';

  function skewToHandle(skewVal) {
    const s = Math.max(0, Math.min(45, +skewVal)) / 100;
    const tip = W * s;
    const lx = isLeft ? (W/2 - tip) : (-W/2 + tip);
    return {
      x: ecx + lx*cosr,
      y: ecy + lx*sinr
    };
  }

  const skew = d.chevSkew != null ? +d.chevSkew : 25;
  const pos = skewToHandle(skew);

  const h = document.createElement('div');
  h.className = 'chev-handle';
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
      const dx = cv.x - ecx, dy = cv.y - ecy;
      const lx = dx*cosr + dy*sinr;
      const tip = isLeft ? (W/2 - lx) : (lx + W/2);
      let skewNew = Math.round((tip / W) * 100);
      skewNew = Math.max(0, Math.min(45, skewNew));
      freshD.chevSkew = skewNew;
      sel.dataset.chevSkew = skewNew;
      const inp = document.getElementById('sh-chev-skew');
      if (inp) inp.value = skewNew;
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

function _updateHandlesOverlay(){
  // Allow update during rotation drag so handles track the element
  const overlay = document.getElementById('handles-overlay');
  if(!overlay) return;
  overlay.innerHTML = '';
  overlay.style.pointerEvents = 'none'; // container passes through, only handles have pointer-events:auto

  const el = typeof sel !== 'undefined' ? sel : null;
  if (!el) { overlay.style.pointerEvents = 'none'; document.querySelectorAll('.arc-handle').forEach(h=>h.remove()); document.querySelectorAll('.star-handle').forEach(h=>h.remove()); document.querySelectorAll('.para-handle').forEach(h=>h.remove()); document.querySelectorAll('.chev-handle').forEach(h=>h.remove()); return; }
  // Don't show overlay handles during crop mode — crop handles take over
  if (el.dataset.cropMode === 'true') return;
  // In curve edit mode: hide resize/rotation handles (only curve editor handles shown)
  if (window._curveEditMode && el.dataset.shape === 'curve') {
    // Still call _buildCurveEditor below to show node handles
    _buildCurveEditor();
    return;
  }
  document.querySelectorAll('.rh[data-overlay-hidden]').forEach(rh => {
    rh.style.display = '';
    delete rh.dataset.overlayHidden;
  });

  // Lego blocks: no resize handles, no rotation
  if(el.dataset.type === 'lego') return;

  const elL = parseInt(el.style.left)||0;
  const elT = parseInt(el.style.top)||0;
  const elW = parseInt(el.style.width)||0;
  const elH = parseInt(el.style.height)||0;

  // Read actual rotation from computed transform matrix (handles CSS animation)
  let elDeg = parseFloat(el.dataset.rot)||0;
  try {
    const mat = new DOMMatrix(getComputedStyle(el).transform);
    if (mat && !isNaN(mat.a)) {
      const computedDeg = Math.atan2(mat.b, mat.a) * 180 / Math.PI;
      // Only use computed if animation is running or differs significantly
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
  // Add rotation logic (no extra divs — uses document-level hover detection)
  _addRotationZones(overlay, el);

  // ── Pivot point handle (purple dot) ──
  _buildPivotHandle(overlay, el);

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

// Rotation state — listeners attached once to cwrap
let _rotListenersAttached = false;
let _rotEl = null; // currently selected element for rotation

// ── Pivot handle ──────────────────────────────────────────────────────
// Stored as d.rotPivotX/Y = offset from element center in px (0,0=center)
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

function _getRotCorners(el) {
  const L = parseInt(el.style.left)||0;
  const T = parseInt(el.style.top)||0;
  const W = parseInt(el.style.width)||0;
  const H = parseInt(el.style.height)||0;
  const deg = parseFloat(el.dataset.rot||0);
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

function _nearCorner(el, canvasX, canvasY) {
  if (!el) return null;
  const R = 28; // rotation zone radius around corner
  const corners = _getRotCorners(el);
  for (const c of corners) {
    const dx = canvasX - c.x, dy = canvasY - c.y;
    const d2 = dx*dx + dy*dy;
    if (d2 > R*R) continue; // too far from corner
    // Check if point is OUTSIDE the element bounds (rotated check)
    // Use the corner positions to determine if point is inside or outside
    const deg = parseFloat(el.dataset.rot||0)*Math.PI/180;
    const cosr = Math.cos(-deg), sinr = Math.sin(-deg);
    const L=parseInt(el.style.left)||0, T=parseInt(el.style.top)||0;
    const W=parseInt(el.style.width)||0, H=parseInt(el.style.height)||0;
    const ecx=L+W/2, ecy=T+H/2;
    // Rotate point to element-local space
    const lx = (canvasX-ecx)*cosr - (canvasY-ecy)*sinr;
    const ly = (canvasX-ecx)*sinr + (canvasY-ecy)*cosr;
    // If inside element bounds → don't trigger rotation
    const margin = 8;
    if (lx > -W/2-margin && lx < W/2+margin && ly > -H/2-margin && ly < H/2+margin) continue;
    return c;
  }
  return null;
}

function _toCanvasCoords(clientX, clientY) {
  const cwrap = document.getElementById('cwrap');
  if (!cwrap) return {x:0,y:0};
  const r = cwrap.getBoundingClientRect();
  const z = typeof _canvasZoom === 'number' ? _canvasZoom : 1;
  return {
    x: (clientX - r.left + cwrap.scrollLeft - ZOOM_PAD) / z,
    y: (clientY - r.top  + cwrap.scrollTop  - ZOOM_PAD) / z
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
  let _lastRotCursor = '';
  function _setRotCursor(cursorVal) {
    if (cursorVal === _lastRotCursor) return; // no change
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

  document.addEventListener('mousemove', ev => {
    if (_rotDragging || !_rotEl) return;
    if (window._anyDragging) return;
    const cwrap2 = document.getElementById('cwrap');
    if (!cwrap2) return;
    const cr = cwrap2.getBoundingClientRect();
    if (ev.clientX < cr.left || ev.clientX > cr.right ||
        ev.clientY < cr.top  || ev.clientY > cr.bottom) {
      _setRotCursor(''); return;
    }
    const p = _toCanvasCoords(ev.clientX, ev.clientY);
    const corner = _nearCorner(_rotEl, p.x, p.y);
    _setRotCursor(corner ? _makeCursorForAngle(corner.angle) : '');
  });

  // Capture phase: fires before ANY element's mousedown handler
  document.addEventListener('mousedown', ev => {
    if (ev.button !== 0 || !_rotEl) return;
    if (window._resizeDragging) return;
    const cwrap2 = document.getElementById('cwrap');
    if (!cwrap2) return;
    const cr = cwrap2.getBoundingClientRect();
    if (ev.clientX < cr.left || ev.clientX > cr.right ||
        ev.clientY < cr.top  || ev.clientY > cr.bottom) return;
    if (window._pivotDragging) return; // pivot handle takes priority
    if (window._overPivotHandle) return; // mouse is over pivot handle
    const p = _toCanvasCoords(ev.clientX, ev.clientY);
    const corner = _nearCorner(_rotEl, p.x, p.y);
    if (!corner) return;
    // We're in a rotation zone — always consume the event
    window._anyDragging = true;
    ev.stopPropagation();
    ev.preventDefault();
    _rotDragging = true;

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

    let _rotRaf = null;
    const onMove = e => {
      const clientX = e.clientX, clientY = e.clientY, shiftKey = e.shiftKey;
      if (_rotRaf) return; // throttle to one frame
      _rotRaf = requestAnimationFrame(() => {
        _rotRaf = null;
        const q = _toCanvasCoords(clientX, clientY);
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
      _rotDragging = false;
      window._anyDragging = false;
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
    if (typeof renderShapeEl === 'function') renderShapeEl(sel, d);
  }
  function commitFinal() {
    commit();
  }
  function fullRebuild() { commit(); _clearCurveEditor(); _buildCurveEditor(); }

  // Update add-node button state based on selection
  function updateButtonState() {
    const addBtn = document.getElementById('sh-curve-add-btn');
    if (addBtn) addBtn.disabled = _curveSelPts.size !== 2;
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
}

function curveAddNode() {
  if (!sel || sel.dataset.type !== 'shape') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d || !d.curvePoints) return;
  const pts = d.curvePoints;

  // Need exactly 2 selected adjacent points
  const selArr = [..._curveSelPts].sort((a,b) => a-b);
  if (selArr.length === 2) {
    const [ia, ib] = selArr;
    const n = pts.length;
    // Adjacent check (also handles closed wrap-around)
    const adjacent = (ib === ia + 1) || (d.curveClosed && ia === 0 && ib === n-1);
    if (adjacent) {
      const [pi, pj] = ib === ia + 1 ? [ia, ib] : [ib, ia]; // pi is "before" pj on the curve
      const a = pts[pi], b = pts[pj];
      // Insert midpoint between a and b
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const newPt = {
        x: mx, y: my,
        cp1x: mx - (b.x - a.x) * 0.1, cp1y: my - (b.y - a.y) * 0.1,
        cp2x: mx + (b.x - a.x) * 0.1, cp2y: my + (b.y - a.y) * 0.1,
        type: 'smooth'
      };
      const insertIdx = ib === ia + 1 ? ib : 1; // insert after pi
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

