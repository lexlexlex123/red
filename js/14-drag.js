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
      if(!isSvgPart&&!e.target.closest('.shape-text')&&!isHitArea)return;
    }
    // Select element immediately if not already selected, then start drag in same mousedown
    // But don't reset multi-selection if element is already part of it
    if(!el.classList.contains('sel')&&!(multiSel.size>1&&multiSel.has(el))){
      pick(el);
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
      // Project onto element local axes if rotated
      const _rot=(parseFloat(el.dataset.rot||0))*Math.PI/180;
      const localDx=_rot?_rdx*Math.cos(_rot)+_rdy*Math.sin(_rot):_rdx;
      const localDy=_rot?-_rdx*Math.sin(_rot)+_rdy*Math.cos(_rot):_rdy;
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

      if(document.getElementById('snap-chk').checked){nw=snapV(nw);nh=snapV(nh);}
      el.style.width=nw+'px';el.style.height=nh+'px';
      if(cfg.ax)el.style.left=(sl+sw-nw)+'px';if(cfg.ay)el.style.top=(st+sh-nh)+'px';
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
      commitAll();
    };
    document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
  });
}
