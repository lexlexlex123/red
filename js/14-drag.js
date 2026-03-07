// ══════════════ DRAG & RESIZE ══════════════
function mkDrag(el,c){
  let ox,oy,ol,ot,on=false,groupStart=null;
  el.addEventListener('mousedown',e=>{
    const cn=e.target.className||'';
    // Exit text editing when clicking any element (different or same, outside the .tel)
    const clickedInsideTel = e.target && e.target.closest && e.target.closest('.tel');
    if(!clickedInsideTel && typeof stopTextEditing==='function') stopTextEditing();
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
    e.preventDefault();on=true;ox=e.clientX;oy=e.clientY;ol=parseInt(el.style.left);ot=parseInt(el.style.top);
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
      let dx=e2.clientX-ox,dy=e2.clientY-oy;
      if(groupStart){
        groupStart.forEach((pos,mEl)=>{
          let nx=pos.x+dx,ny=pos.y+dy;
          if(document.getElementById('snap-chk').checked){nx=snapV(nx);ny=snapV(ny);}
          mEl.style.left=nx+'px';mEl.style.top=ny+'px';
        });
        if(typeof renderMotionOverlay==='function') renderMotionOverlay();
      } else {
        let nx=ol+dx,ny=ot+dy;
        if(document.getElementById('snap-chk').checked){nx=snapV(nx);ny=snapV(ny);}
        el.style.left=nx+'px';el.style.top=ny+'px';showGuides(el);syncPos();
        if(typeof renderMotionOverlay==='function') renderMotionOverlay();
      }
    };
    const mu=()=>{on=false;groupStart=null;clearGuides();document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);commitAll();};
    document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
  });
}
function mkResize(el,rh,cfg){
  rh.addEventListener('mousedown',e=>{
    e.preventDefault();e.stopPropagation();
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
      let nw,nh;
      if(isImgCorner){
        // Proportional: drive from X axis (or Y if moving more vertically)
        const rawDx=cfg.dx*(e2.clientX-sx);
        const rawDy=cfg.dy*(e2.clientY-sy);
        const delta=Math.abs(rawDx)>=Math.abs(rawDy)?rawDx:rawDy*aspect;
        nw=Math.max(40,sw+delta);
        nh=Math.max(20,nw/aspect);
      } else if(appletAspect&&isCorner){
        const rawDx=cfg.dx*(e2.clientX-sx);
        const rawDy=cfg.dy*(e2.clientY-sy);
        const delta=Math.abs(rawDx)>=Math.abs(rawDy)?rawDx:rawDy*appletAspect;
        nw=Math.max(120,sw+delta);
        nh=Math.max(80,nw/appletAspect);
      } else {
        nw=cfg.dx!==0?Math.max(40,sw+cfg.dx*(e2.clientX-sx)):sw;
        nh=cfg.dy!==0?Math.max(20,sh+cfg.dy*(e2.clientY-sy)):sh;
      }
      if(document.getElementById('snap-chk').checked){nw=snapV(nw);nh=snapV(nh);}
      el.style.width=nw+'px';el.style.height=nh+'px';
      if(cfg.ax)el.style.left=(sl+sw-nw)+'px';if(cfg.ay)el.style.top=(st+sh-nh)+'px';
      const d=slides[cur]&&slides[cur].els.find(x=>x.id===el.dataset.id);
      if(d&&el.dataset.type==='shape')renderShapeEl(el,d);
      if(d&&el.dataset.type==='table'){d.w=nw;d.h=nh;if(typeof renderTableEl==='function')renderTableEl(el,d);}
      // For image side-handle drag: show stretch in real time
      if(el.dataset.type==='image'&&(cfg.dx===0||cfg.dy===0)){
        const img=el.querySelector('img');if(img)img.style.objectFit='fill';
      }
      syncPos();
    };
    const mu=()=>{
      document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);
      cv.querySelectorAll('.el').forEach(other=>{other.style.pointerEvents='';});
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
      commitAll();
    };
    document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
  });
}
