// ══════════════ GRID ══════════════
function drawGrid(){
  const gc=document.getElementById('grid-canvas');const wrap=document.getElementById('cwrap');
  const W=wrap.clientWidth||800,H=wrap.clientHeight||600;
  gc.width=W;gc.height=H;gc.style.width=W+'px';gc.style.height=H+'px';
  const ctx=gc.getContext('2d');ctx.clearRect(0,0,W,H);
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
    if(slidePr)slidePr.style.display=isObj?'none':'';
    if(elPr)elPr.style.display=isObj?'none':'';
    if(isObj&&typeof renderObjectsPanel==='function')renderObjectsPanel();
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
  if(Math.abs(x+w/2-cx)<TH){addGuide('v',cx);el.style.left=(cx-w/2)+'px';}
  if(Math.abs(y+h/2-cy)<TH){addGuide('h',cy);el.style.top=(cy-h/2)+'px';}
  if(Math.abs(x)<TH){addGuide('v',0);el.style.left='0px';}
  if(Math.abs(y)<TH){addGuide('h',0);el.style.top='0px';}
  if(Math.abs(x+w-canvasW)<TH){addGuide('v',canvasW-1);el.style.left=(canvasW-w)+'px';}
  if(Math.abs(y+h-canvasH)<TH){addGuide('h',canvasH-1);el.style.top=(canvasH-h)+'px';}
}
function addGuide(t,pos){
  const cv=document.getElementById('canvas');const g=document.createElement('div');g.className='guide '+t;
  if(t==='h')g.style.top=pos+'px';else g.style.left=pos+'px';cv.appendChild(g);guides.push(g);
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

function zoomCanvas(factor, mouseClientX, mouseClientY){
  const cwrap = document.getElementById('cwrap');
  const cc    = document.getElementById('canvas-container');
  if(!cwrap || !cc) return;

  const oldZ = _canvasZoom;
  const newZ = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, oldZ * factor));
  if(newZ === oldZ) return;

  // Mouse position in viewport coords relative to cwrap
  const rect = cwrap.getBoundingClientRect();
  const vx = (mouseClientX !== undefined) ? mouseClientX - rect.left : cwrap.clientWidth  / 2;
  const vy = (mouseClientY !== undefined) ? mouseClientY - rect.top  : cwrap.clientHeight / 2;

  // Canvas-space point under mouse (cc is always at ZOOM_PAD,ZOOM_PAD in scroll-space)
  const scrollX = cwrap.scrollLeft;
  const scrollY = cwrap.scrollTop;
  const canvasX = (scrollX + vx - ZOOM_PAD) / oldZ;
  const canvasY = (scrollY + vy - ZOOM_PAD) / oldZ;

  _canvasZoom = newZ;
  _applyCanvasZoom();

  // New scroll: keep canvasX/Y under the same viewport pixel
  cwrap.scrollLeft = canvasX * newZ + ZOOM_PAD - vx;
  cwrap.scrollTop  = canvasY * newZ + ZOOM_PAD - vy;
}

function resetZoom(){
  _canvasZoom = 1.0;
  _applyCanvasZoom();
  _centerSlide();
}

function _centerSlide(){
  const cwrap = document.getElementById('cwrap');
  if(!cwrap) return;
  const z = _canvasZoom;
  const totalW = Math.round(canvasW * z) + ZOOM_PAD * 2;
  const totalH = Math.round(canvasH * z) + ZOOM_PAD * 2;
  cwrap.scrollLeft = Math.max(0, (totalW - cwrap.clientWidth)  / 2);
  cwrap.scrollTop  = Math.max(0, (totalH - cwrap.clientHeight) / 2);
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

  // cc is always at (ZOOM_PAD, ZOOM_PAD) in scroll-space
  cc.style.position      = 'absolute';
  cc.style.left          = ZOOM_PAD + 'px';
  cc.style.top           = ZOOM_PAD + 'px';
  cc.style.transform     = `scale(${z})`;
  cc.style.transformOrigin = 'top left';

  // Ghost defines scroll area: at least cwrap size so cc can be centered when small
  let ghost = document.getElementById('cwrap-ghost');
  if(!ghost){
    ghost = document.createElement('div');
    ghost.id = 'cwrap-ghost';
    ghost.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    cwrap.appendChild(ghost);
  }
  const gw = Math.max(totalW, cwrap.clientWidth);
  const gh = Math.max(totalH, cwrap.clientHeight);
  ghost.style.width  = gw + 'px';
  ghost.style.height = gh + 'px';

  // When canvas fits in cwrap, shift cc to visual center
  if(totalW < cwrap.clientWidth)  cc.style.left = Math.round((cwrap.clientWidth  - scaledW) / 2) + 'px';
  if(totalH < cwrap.clientHeight) cc.style.top  = Math.round((cwrap.clientHeight - scaledH) / 2) + 'px';

  // Sync canvas-bg-rect size with canvas dimensions
  const bgRect = document.getElementById('canvas-bg-rect');
  if(bgRect){ bgRect.style.width=canvasW+'px'; bgRect.style.height=canvasH+'px'; }

  const lbl = document.getElementById('zoom-label-btn');
  if(lbl) lbl.textContent = Math.round(z * 100) + '%';
  if(typeof drawGrid === 'function') drawGrid();
}

// Init on load
window.addEventListener('load', function(){
  setTimeout(function(){
    const cwrap = document.getElementById('cwrap');
    if(!cwrap) return;
    _applyCanvasZoom();
    _centerSlide();

    cwrap.addEventListener('wheel', function(e){
      e.preventDefault();
      if(e.ctrlKey){
        cwrap.scrollTop  += e.deltaY;
      } else if(e.altKey){
        cwrap.scrollLeft += e.deltaY;
      } else {
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        zoomCanvas(factor, e.clientX, e.clientY);
      }
    }, {passive: false});
  }, 200);
});

// ══════════════ HANDLES OVERLAY ══════════════
// Moves .rh handles out of #canvas (overflow:hidden) into #handles-overlay
// positioned in canvas-space so they're never clipped

function _updateHandlesOverlay(){
  const overlay = document.getElementById('handles-overlay');
  if(!overlay) return;
  overlay.innerHTML = '';
  overlay.style.pointerEvents = 'none';

  const el = typeof sel !== 'undefined' ? sel : null;
  if(!el) return;

  const elL = parseInt(el.style.left)||0;
  const elT = parseInt(el.style.top)||0;
  const elW = parseInt(el.style.width)||0;
  const elH = parseInt(el.style.height)||0;
  const H = 4; // handle half-size (8px / 2)

  // [class suffix, x, y]
  const positions = [
    ['tl', elL-H,        elT-H],
    ['tm', elL+elW/2-H,  elT-H],
    ['tr', elL+elW-H,    elT-H],
    ['ml', elL-H,        elT+elH/2-H],
    ['mr', elL+elW-H,    elT+elH/2-H],
    ['bl', elL-H,        elT+elH-H],
    ['bm', elL+elW/2-H,  elT+elH-H],
    ['br', elL+elW-H,    elT+elH-H],
  ];

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
      cursor:${_rhCursor(cls)};z-index:9999;`;
    // Forward mousedown to original handle
    rh.addEventListener('mousedown', e=>{
      const orig = origRhs[cls];
      if(orig) orig.dispatchEvent(new MouseEvent('mousedown', {bubbles:false, cancelable:true, clientX:e.clientX, clientY:e.clientY, button:0}));
    });
    overlay.appendChild(rh);
  });
  overlay.style.pointerEvents = 'auto';
}

function _rhCursor(cls){
  return {tl:'nw-resize',tm:'n-resize',tr:'ne-resize',ml:'w-resize',mr:'e-resize',bl:'sw-resize',bm:'s-resize',br:'se-resize'}[cls]||'default';
}

// Patch pick to update overlay
const _origPick = typeof pick === 'function' ? pick : null;
// Hook into renderAll / syncProps cycle — update overlay after any selection change
document.addEventListener('DOMContentLoaded', function(){
  // Update overlay on mousemove during drag (position changes)
  document.addEventListener('mousemove', function(){
    if(typeof sel !== 'undefined' && sel) _updateHandlesOverlay();
  });
});
