
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
  clearGuides();if(!document.getElementById('snap-chk').checked)return;
  const x=parseInt(el.style.left),y=parseInt(el.style.top),w=parseInt(el.style.width),h=parseInt(el.style.height);
  const cx=canvasW/2,cy=canvasH/2,TH=7;
  // Центр и края слайда
  if(Math.abs(x+w/2-cx)<TH){addGuide('v',cx);el.style.left=(cx-w/2)+'px';}
  if(Math.abs(y+h/2-cy)<TH){addGuide('h',cy);el.style.top=(cy-h/2)+'px';}
  if(Math.abs(x)<TH){addGuide('v',0);el.style.left='0px';}
  if(Math.abs(y)<TH){addGuide('h',0);el.style.top='0px';}
  if(Math.abs(x+w-canvasW)<TH){addGuide('v',canvasW-1);el.style.left=(canvasW-w)+'px';}
  if(Math.abs(y+h-canvasH)<TH){addGuide('h',canvasH-1);el.style.top=(canvasH-h)+'px';}
  // Привязка к активным направляющим (thirds / golden)
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
  // Snap элемент к линии: левый/правый край или центр по X; верхний/нижний или центр по Y
  snapLines.forEach(({t,pos})=>{
    if(t==='v'){
      // Левый край
      if(Math.abs(x-pos)<TH){addGuide('v',pos,'amber');el.style.left=Math.round(pos)+'px';}
      // Правый край
      else if(Math.abs(x+w-pos)<TH){addGuide('v',pos,'amber');el.style.left=Math.round(pos-w)+'px';}
      // Центр
      else if(Math.abs(x+w/2-pos)<TH){addGuide('v',pos,'amber');el.style.left=Math.round(pos-w/2)+'px';}
    } else {
      // Верхний край
      if(Math.abs(y-pos)<TH){addGuide('h',pos,'amber');el.style.top=Math.round(pos)+'px';}
      // Нижний край
      else if(Math.abs(y+h-pos)<TH){addGuide('h',pos,'amber');el.style.top=Math.round(pos-h)+'px';}
      // Центр
      else if(Math.abs(y+h/2-pos)<TH){addGuide('h',pos,'amber');el.style.top=Math.round(pos-h/2)+'px';}
    }
  });
}
function addGuide(t,pos,color){
  const cv=document.getElementById('canvas');const g=document.createElement('div');g.className='guide '+t;
  if(t==='h')g.style.top=Math.round(pos)+'px';else g.style.left=Math.round(pos)+'px';
  if(color==='amber'){g.style.borderColor='#f59e0b';g.style.opacity='0.9';}
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

function _updateHandlesOverlay(){
  if(_rotDragging) return;
  const overlay = document.getElementById('handles-overlay');
  if(!overlay) return;
  overlay.innerHTML = '';
  overlay.style.pointerEvents = 'auto';

  const el = typeof sel !== 'undefined' ? sel : null;
  if (!el) { overlay.style.pointerEvents = 'none'; return; }
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
  const cx = elL + elW/2, cy = elT + elH/2;
  const H = 4;

  function rotPt(px, py) {
    const dx = px-cx, dy = py-cy;
    return {
      x: cx + dx*Math.cos(elRad) - dy*Math.sin(elRad) - H,
      y: cy + dx*Math.sin(elRad) + dy*Math.cos(elRad) - H
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
    rh.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:8px;height:8px;
      background:#fff;border:1.5px solid var(--selb);border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,.5);pointer-events:auto;
      cursor:${_rhCursor(cls, parseFloat((typeof sel!=='undefined'&&sel)?sel.dataset.rot||0:0))};z-index:9999;`;
    // Forward mousedown to original handle — MUST stop propagation to prevent drag
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

function _getRotCorners(el) {
  const L = parseInt(el.style.left)||0;
  const T = parseInt(el.style.top)||0;
  const W = parseInt(el.style.width)||0;
  const H = parseInt(el.style.height)||0;
  const deg = parseFloat(el.dataset.rot||0);
  const rad = deg * Math.PI / 180;
  const cosr = Math.cos(rad), sinr = Math.sin(rad);
  const cx = L + W/2, cy = T + H/2;

  function rotCorner(px, py, tangentDeg) {
    const dx = px-cx, dy = py-cy;
    return {
      x: cx + dx*cosr - dy*sinr,
      y: cy + dx*sinr + dy*cosr,
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
  const R = 22;
  for (const c of _getRotCorners(el)) {
    const dx = canvasX - c.x, dy = canvasY - c.y;
    if (dx*dx + dy*dy < R*R) return c;
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

  cwrap.addEventListener('mousemove', ev => {
    if (_rotDragging || !_rotEl) return;
    if (window._anyDragging) return;
    if (ev.target.classList && ev.target.classList.contains('rh')) return;
    const p = _toCanvasCoords(ev.clientX, ev.clientY);
    const corner = _nearCorner(_rotEl, p.x, p.y);
    cwrap.style.cursor = corner ? _makeCursorForAngle(corner.angle) : '';
  });

  cwrap.addEventListener('mousedown', ev => {
    if (ev.button !== 0 || !_rotEl) return;
    if (window._resizeDragging) return;
    if (ev.target.classList.contains('rh') || ev.target.closest('.rh')) return;
    const p = _toCanvasCoords(ev.clientX, ev.clientY);
    const corner = _nearCorner(_rotEl, p.x, p.y);
    if (!corner) return;

    ev.preventDefault(); ev.stopPropagation();
    _rotDragging = true;

    const el = _rotEl;
    // Always ensure rotation is around element center
    el.style.transformOrigin = '';
    const L = parseInt(el.style.left)||0, T = parseInt(el.style.top)||0;
    const W = parseInt(el.style.width)||0, H = parseInt(el.style.height)||0;
    const cx = L + W/2, cy = T + H/2;

    const startAngle = parseFloat(el.dataset.rot || 0);
    const a0 = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI;

    const onMove = e => {
      const q = _toCanvasCoords(e.clientX, e.clientY);
      const a = Math.atan2(q.y - cy, q.x - cx) * 180 / Math.PI;
      let deg = Math.round(startAngle + (a - a0));
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      el.style.transform = `rotate(${deg}deg)`;
      el.dataset.rot = deg;
      const pRot = document.getElementById('p-rot');
      if (pRot) pRot.value = deg;
      // Update handles overlay during rotation
      _rotDragging = false;
      _updateHandlesOverlay();
      _rotDragging = true;
      // Rotate cursor with object — find closest corner angle
      const nearest = _getRotCorners(el).reduce((best, c) => {
        const dx = q.x-c.x, dy = q.y-c.y, d = dx*dx+dy*dy;
        return (!best||d<best.d)?{c,d}:best;
      }, null);
      if (nearest) cwrap.style.cursor = _makeCursorForAngle(nearest.c.angle);
      if (typeof updateConnectorsFor === 'function') updateConnectorsFor(el.dataset.id);
    };

    const onUp = () => {
      _rotDragging = false;
      cwrap.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      // Restore selection if it was lost during rotation
      if (el && typeof pick === 'function') pick(el);
      if (typeof commitAll === 'function') commitAll();
      _updateHandlesOverlay();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
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
