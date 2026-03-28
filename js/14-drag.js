// ══════════════ DRAG & RESIZE ══════════════
function mkDrag(el,c){
  let ox,oy,ol,ot,on=false,groupStart=null;
  el.addEventListener('mousedown',e=>{
    // В режиме соединения объектов — не выбираем элемент, клик обработает 38-connectors.js
    if (typeof window._connectorModeActive === 'function' && window._connectorModeActive()) return;
    const cn=e.target.className||'';
    // Exit text editing when clicking any element (different or same, outside the .tel)
    const clickedInsideTel = e.target && e.target.closest && e.target.closest('.tel');
    if(!clickedInsideTel && typeof stopTextEditing==='function') stopTextEditing();
    // Blur shape text if clicking on a different element
    const clickedInsideShapeTxt = e.target && e.target.closest && e.target.closest('.shape-text');
    if(!clickedInsideShapeTxt && typeof _blurActiveShapeText==='function') _blurActiveShapeText();
    const telEl=el.querySelector('.tel');const isEditing=c.contentEditable==='true'||(telEl&&telEl.contentEditable==='true');
    if(typeof cn==='string'&&(cn.includes('rh')||cn.includes('db')||isEditing))return;
    // Table cells handle their own events; tbl-drag-border has its own drag handler
    if(e.target.closest&&e.target.closest('.tbl-drag-border'))return;
    if(el.dataset.type==='table'&&(e.target.tagName==='TD'||e.target.tagName==='TH'))return;
    // Clicking on table border/frame (not a cell) — clear cell selection
    if(el.dataset.type==='table'&&typeof tblClearSel==='function') tblClearSel();
    if(e.target.closest&&e.target.closest('.interactive'))return;
    // For shapes: allow drag on SVG fill, shape-text, or the transparent hit-area overlay
    if(el.dataset.type==='shape'){
      const isSvgPart=e.target.tagName==='path'||e.target.tagName==='rect'||
        e.target.tagName==='ellipse'||e.target.tagName==='circle'||
        e.target.tagName==='polygon'||e.target.tagName==='polyline';
      const isHitArea=e.target.classList&&e.target.classList.contains('shape-hit-area');
      // noFill shapes (line/wave): when selected, hit area removed, click lands on el div itself
      const _sh = typeof SHAPES!=='undefined' ? SHAPES.find(s=>s.id===el.dataset.shape) : null;
      const isNoFillSelf = e.target===el && _sh && _sh.noFill;
      if(!isSvgPart&&!e.target.closest('.shape-text')&&!isHitArea&&!isNoFillSelf)return;
    }
    // For lego: allow drag/click on any SVG content inside .ec
    if(el.dataset.type==='lego'){
      if(!e.target.closest('.ec')&&e.target!==el)return;
    }
    // Select element immediately if not already selected, then start drag in same mousedown
    // But don't reset multi-selection if element is already part of it
    if(e.shiftKey && typeof pickMulti==='function'){
      // Shift: add/remove from multiSel, do NOT start drag
      pickMulti(el, true);
      e.preventDefault();
      return;
    } else if(!el.classList.contains('sel')&&!(multiSel.size>1&&multiSel.has(el))){
      if(typeof pickMulti==='function') pickMulti(el, false);
      else pick(el);
    }
    e.preventDefault();on=true;window._anyDragging=true;ox=e.clientX;oy=e.clientY;ol=parseInt(el.style.left);ot=parseInt(el.style.top);
    pushUndo(); // Record state before drag starts
    // Capture group positions if multi-selecting
    if(multiSel.size>1&&multiSel.has(el)){
      groupStart=new Map();
      multiSel.forEach(mEl=>groupStart.set(mEl,{x:parseInt(mEl.style.left),y:parseInt(mEl.style.top)}));
    } else {
      groupStart=null;
    }
    const mm=e2=>{
      if(!on)return;
      if(e2.buttons===0){mu();return;}
      const _z=typeof _canvasZoom==='number'?_canvasZoom:1;
      let dx=(e2.clientX-ox)/_z,dy=(e2.clientY-oy)/_z;
      if(groupStart){
        groupStart.forEach((pos,mEl)=>{
          let nx=pos.x+dx,ny=pos.y+dy;
          if(document.getElementById('snap-chk').checked){nx=snapV(nx);ny=snapV(ny);}
          mEl.style.left=nx+'px';mEl.style.top=ny+'px';
        });
        if(typeof renderMotionOverlay==='function') renderMotionOverlay();
        if(typeof _updateHandlesOverlay==='function')_updateHandlesOverlay();
      } else {
        let nx=ol+dx,ny=ot+dy;
        if(document.getElementById('snap-chk').checked){nx=snapV(nx);ny=snapV(ny);}
        el.style.left=nx+'px';el.style.top=ny+'px';showGuides(el);syncPos();
        if(typeof renderMotionOverlay==='function') renderMotionOverlay();
        if(typeof _updateHandlesOverlay==='function')_updateHandlesOverlay();
      }
    };
    const mu=()=>{on=false;window._anyDragging=false;groupStart=null;clearGuides();document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);commitAll();};
    document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
  });

}
function mkResize(el,rh,cfg){
  rh.addEventListener('mousedown',e=>{
    e.preventDefault();e.stopPropagation();
    window._resizeDragging=true;window._anyDragging=true;
    const _cwrap=document.getElementById('cwrap');if(_cwrap)_cwrap.style.cursor='';
    pushUndo();
    const cv=document.getElementById('canvas');
    cv.querySelectorAll('.el').forEach(other=>{if(other!==el)other.style.pointerEvents='none';});
    const sx=e.clientX,sy=e.clientY,sw=parseInt(el.style.width),sh=parseInt(el.style.height),sl=parseInt(el.style.left),st=parseInt(el.style.top);
    const aspect=sw/sh; // for proportional resize
    const isCorner=cfg.dx!==0&&cfg.dy!==0;
    const isImgCorner=el.dataset.type==='image'&&isCorner;
    // Applets with stored aspect ratio always resize proportionally from corners
    const _appletD=el.dataset.type==='applet'&&slides[cur]?slides[cur].els.find(x=>x.id===el.dataset.id):null;
    const appletAspect=_appletD&&_appletD._appletAspect||null;
    const mm=e2=>{
      if(e2.buttons===0){mu();return;}
      const _z=typeof _canvasZoom==='number'?_canvasZoom:1;
      let nw,nh;
      const _rdx=(e2.clientX-sx)/_z, _rdy=(e2.clientY-sy)/_z;
      // Project mouse delta onto element's local axes (accounting for rotation)
      // CSS rotate(θ) is clockwise. To go from screen→local: rotate by -θ
      const _rot=(parseFloat(el.dataset.rot||0))*Math.PI/180;
      const cosR=Math.cos(_rot), sinR=Math.sin(_rot);
      // Screen space → element local space (inverse rotation)
      const localDx= _rdx*cosR + _rdy*sinR;
      const localDy=-_rdx*sinR + _rdy*cosR;

      if(isImgCorner){
        const rawDx=cfg.dx*localDx;
        const rawDy=cfg.dy*localDy;
        const delta=Math.abs(rawDx)>=Math.abs(rawDy)?rawDx:rawDy*aspect;
        nw=Math.max(40,sw+delta);
        nh=Math.max(20,nw/aspect);
      } else if(appletAspect&&isCorner){
        const rawDx=cfg.dx*localDx;
        const rawDy=cfg.dy*localDy;
        const delta=Math.abs(rawDx)>=Math.abs(rawDy)?rawDx:rawDy*appletAspect;
        nw=Math.max(120,sw+delta);
        nh=Math.max(80,nw/appletAspect);
      } else {
        nw=cfg.dx!==0?Math.max(40,sw+cfg.dx*localDx):sw;
        nh=cfg.dy!==0?Math.max(20,sh+cfg.dy*localDy):sh;
      }

      if(document.getElementById('snap-chk').checked&&_rot===0){nw=snapV(nw);nh=snapV(nh);}
      el.style.width=nw+'px';el.style.height=nh+'px';

      // Adjust position so the anchored corner stays visually fixed
      // The element rotates around its CSS top-left, but visually around its center.
      // When size changes, we need to shift top-left so center of the anchored edge stays put.
      if(_rot===0){
        if(cfg.ax)el.style.left=(sl+sw-nw)+'px';
        if(cfg.ay)el.style.top=(st+sh-nh)+'px';
      } else {
        // CSS transform-origin defaults to 50% 50% (center of element).
        // So rotation is around center: cx = sl+sw/2, cy = st+sh/2.
        //
        // When resizing, the dragged handle moves. The opposite handle must stay fixed.
        // Since rotation is around center, we:
        // 1. Find the current center in screen space
        // 2. Compute where the center MUST BE after resize so the fixed handle stays put
        // 3. Set new top-left from new center
        //
        // The fixed handle is at local offset from center:
        //   fix_cx = (cfg.ax ? -sw/2 : sw/2) for x   [ax=1 means dragging from left, so right is fixed]
        //   fix_cy = (cfg.ay ? -sh/2 : sh/2) for y
        // But for edge handles (dx=0 or dy=0), that axis of center doesn't change:
        //   dx=0: fix_cx=0 (no horizontal anchor shift)
        //   dy=0: fix_cy=0
        const fcx = cfg.dx!==0 ? (cfg.ax ? sw/2 : -sw/2) : 0;
        const fcy = cfg.dy!==0 ? (cfg.ay ? sh/2 : -sh/2) : 0;
        // Fixed handle in screen space: center + rotate(fcx, fcy)
        const oldCx = sl + sw/2, oldCy = st + sh/2;
        const fix_sx = oldCx + fcx*cosR - fcy*sinR;
        const fix_sy = oldCy + fcx*sinR + fcy*cosR;
        // After resize, fixed handle has new local offset from new center:
        const fcx2 = cfg.dx!==0 ? (cfg.ax ? nw/2 : -nw/2) : 0;
        const fcy2 = cfg.dy!==0 ? (cfg.ay ? nh/2 : -nh/2) : 0;
        // New center so that fixed handle stays at (fix_sx, fix_sy):
        // fix_sx = newCx + fcx2*cosR - fcy2*sinR  →  newCx = fix_sx - fcx2*cosR + fcy2*sinR
        const newCx = fix_sx - fcx2*cosR + fcy2*sinR;
        const newCy = fix_sy - fcx2*sinR - fcy2*cosR;
        el.style.left = Math.round(newCx - nw/2)+'px';
        el.style.top  = Math.round(newCy - nh/2)+'px';
      }
      const d=slides[cur]&&slides[cur].els.find(x=>x.id===el.dataset.id);
      if(d&&el.dataset.type==='shape')renderShapeEl(el,d);
      if(d&&el.dataset.type==='table'){d.w=nw;d.h=nh;if(typeof renderTableEl==='function'){if(d.showChart){const sv=el.querySelector('.ec svg');if(sv){sv.setAttribute('width',nw);sv.setAttribute('height',nh);sv.setAttribute('viewBox','0 0 '+nw+' '+nh);}}else{renderTableEl(el,d);}}}
      // For image side-handle drag: show stretch in real time
      if(el.dataset.type==='image'&&(cfg.dx===0||cfg.dy===0)){
        const img=el.querySelector('img');if(img)img.style.objectFit='fill';
      }
      syncPos();
      if(typeof _updateHandlesOverlay==='function')_updateHandlesOverlay();
    };
    const mu=()=>{
      window._resizeDragging=false;window._anyDragging=false;
      const _cw=document.getElementById('cwrap');if(_cw)_cw.style.cursor='';
      document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);
      cv.querySelectorAll('.el').forEach(other=>{other.style.pointerEvents='';})  ;
      // If resizing image with a side handle (not corner), stretch image to fill new dimensions
      const isSideHandle=cfg.dx===0||cfg.dy===0;
      if(el.dataset.type==='image'&&isSideHandle){
        const d=slides[cur]&&slides[cur].els.find(x=>x.id===el.dataset.id);
        if(d){d.imgFit='fill';el.dataset.imgFit='fill';el.querySelector('img').style.objectFit='fill';}
      }
      // Recalculate valign padding after resize (text height may have changed)
      if(el.dataset.type==='text'&&el.dataset.valign&&typeof applyTextVAlign==='function'){
        applyTextVAlign(el,el.dataset.valign);
      }
      // Full re-render chart/table after resize (chart viewBox was only adjusted during drag)
      if(el.dataset.type==='table'&&typeof renderTableEl==='function'){const dmu=slides[cur]&&slides[cur].els.find(x=>x.id===el.dataset.id);if(dmu)renderTableEl(el,dmu);}
      // Sync data x/y/w/h from DOM after resize (important for rotated elements)
      const _dmu2 = slides[cur]&&slides[cur].els.find(x=>x.id===el.dataset.id);
      if(_dmu2){
        _dmu2.x=parseInt(el.style.left)||0;
        _dmu2.y=parseInt(el.style.top)||0;
        _dmu2.w=parseInt(el.style.width)||0;
        _dmu2.h=parseInt(el.style.height)||0;
      }
      commitAll();
    };
    document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
  });
}
