// ══════════════ DRAG & RESIZE ══════════════
function mkDrag(el,c){
  let ox,oy,ol,ot,on=false,groupStart=null;
  el.addEventListener('mousedown',e=>{
    // Block if another alpha-passthrough drag is in progress
    if (window._alphaPassthroughDrag) return;
    // Allow re-dispatched events from curve passthrough to proceed normally
    if (e._fromCurvePassthrough) { /* skip curve checks, proceed to drag */ }
    // If rotation drag is already active — block everything
    if (window._rotDragging) return;
    // If selected element exists and click is in its rotation zone — block pick
    if (typeof sel !== 'undefined' && sel && sel !== el && typeof _nearCorner === 'function') {
      const p = typeof _toCanvasCoords === 'function' ? _toCanvasCoords(e.clientX, e.clientY) : null;
      if (p && _nearCorner(sel, p.x, p.y)) return;
    }
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
      if(el.dataset.shape==='curve'){
        const _isCurvePath = e.target.tagName==='path' && e.target.closest('.el')===el;
        const _isCurveSel = el.classList.contains('sel') && !window._curveEditMode;
        // If curve is part of multi-selection, always drag the whole group

        // Helper: find element below curve by checking DOM elements at point
        // Uses both elementsFromPoint AND canvas DOM order to handle pointer-events:none elements
        const _findBelow = () => {
          const canvas = document.getElementById('canvas');
          if (!canvas) return null;
          const rect = canvas.getBoundingClientRect();
          const scaleX = (typeof canvasW !== 'undefined' ? canvasW : canvas.offsetWidth) / rect.width;
          const scaleY = (typeof canvasH !== 'undefined' ? canvasH : canvas.offsetHeight) / rect.height;
          const cx = (e.clientX - rect.left) * scaleX;
          const cy = (e.clientY - rect.top) * scaleY;
          // Walk canvas children in reverse DOM order (top z first), find one under cursor
          const children = Array.from(canvas.querySelectorAll('.el:not(.decor-el)'));
          for(let i = children.length - 1; i >= 0; i--){
            const _p = children[i];
            if(_p === el) continue;
            const px = parseInt(_p.style.left)||0, py = parseInt(_p.style.top)||0;
            const pw = parseInt(_p.style.width)||0, ph = parseInt(_p.style.height)||0;
            const rot = parseFloat(_p.dataset.rot||0);
            if(rot !== 0) {
              // For rotated: just use elementsFromPoint as fallback
              const _elems = document.elementsFromPoint(e.clientX, e.clientY);
              for(const elem of _elems){
                const _ep = elem.closest('.el');
                if(_ep && _ep !== el && !_ep.classList.contains('decor-el')) return _ep;
              }
              return null;
            }
            if(cx >= px && cx <= px+pw && cy >= py && cy <= py+ph) return _p;
          }
          return null;
        };
        // Skip passthrough logic if curve is in a multi-selection
        const _inMultiSel = typeof multiSel!=='undefined' && multiSel.size>1 && multiSel.has(el);
        if(_isCurvePath || _inMultiSel){
          // Clicked on curve stroke or multi-drag: drag the curve, stop propagation
          if(_isCurvePath) e.stopPropagation();
        } else {
          // Clicked in empty bbox area (single selection)
          const _below = _findBelow();
          if(_below){
            e.preventDefault(); e.stopPropagation();
            if(typeof pickMulti==='function') pickMulti(_below, false);
            else if(typeof pick==='function') pick(_below);
            // Start drag on element below immediately using the drag system
            const _bl = parseInt(_below.style.left)||0, _bt = parseInt(_below.style.top)||0;
            window._anyDragging = true;
            const _ox = e.clientX, _oy = e.clientY;
            let _moved = false;
            const _mm = mv => {
              if(!_moved){ _moved=true; if(typeof pushUndo==='function')pushUndo(); }
              const _dx = mv.clientX - _ox, _dy = mv.clientY - _oy;
              const _zoom = (typeof zoom!=='undefined'?zoom:1);
              let _nl=_bl+_dx/_zoom, _nt=_bt+_dy/_zoom;
              const _snChk=document.getElementById('snap-chk');
              if(_snChk&&_snChk.checked&&typeof snapV==='function'){_nl=snapV(_nl);_nt=snapV(_nt);}
              _below.style.left = _nl + 'px';
              _below.style.top  = _nt + 'px';
              if(typeof drawGuides==='function') drawGuides(_below);
              if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
            };
            const _mu = () => {
              window._anyDragging = false;
              document.removeEventListener('mousemove', _mm);
              document.removeEventListener('mouseup', _mu);
              if(_moved){
                if(typeof clearGuides==='function') clearGuides();
                if(typeof commitAll==='function') commitAll();
                const _bd = slides[cur]&&slides[cur].els.find(e=>e.id===_below.dataset.id);
                if(_bd){
                  _bd.x=parseInt(_below.style.left); _bd.y=parseInt(_below.style.top);
                }
                if(typeof save==='function') save();
                if(typeof drawThumbs==='function') drawThumbs();
                if(typeof saveState==='function') saveState();
              }
            };
            document.addEventListener('mousemove', _mm);
            document.addEventListener('mouseup', _mu);
            return;
          }
          // No element below — if curve not selected, allow picking it; else keep drag
          if(!_isCurveSel) { /* fall through to normal pick */ }
          // else: curve already selected and no element below — drag curve
        }
      } else {
        const isSvgPart=e.target.tagName==='path'||e.target.tagName==='rect'||
          e.target.tagName==='ellipse'||e.target.tagName==='circle'||
          e.target.tagName==='polygon'||e.target.tagName==='polyline';
        const isHitArea=e.target.classList&&e.target.classList.contains('shape-hit-area');
        const _sh = typeof SHAPES!=='undefined' ? SHAPES.find(s=>s.id===el.dataset.shape) : null;
        const isNoFillSelf = e.target===el && _sh && _sh.noFill;
        if(!isSvgPart&&!e.target.closest('.shape-text')&&!isHitArea&&!isNoFillSelf)return;
      }
    }
    // PNG alpha hit test: if clicking transparent pixel, pass click to element below
    if(el.dataset.type==='image' &&
       !(typeof multiSel!=='undefined' && multiSel && multiSel.size>1 && multiSel.has(el))){
      const _iel2 = el.querySelector('.iel');
      if(_iel2 && typeof _isTransparentPixel==='function' && _isTransparentPixel(_iel2, e.clientX, e.clientY, 20)){
        // Find element below and switch to it (even if current is selected)
        const _cv3 = document.getElementById('canvas');
        if(_cv3){
          const _r3=_cv3.getBoundingClientRect();
          const _sx3=(typeof canvasW!=='undefined'?canvasW:_cv3.offsetWidth)/_r3.width;
          const _sy3=(typeof canvasH!=='undefined'?canvasH:_cv3.offsetHeight)/_r3.height;
          const _cx3=(e.clientX-_r3.left)*_sx3, _cy3=(e.clientY-_r3.top)*_sy3;
          const _kids3=Array.from(_cv3.querySelectorAll('.el:not(.decor-el)'));
          let _below3=null;
          for(let _i3=_kids3.length-1;_i3>=0;_i3--){
            const _p3=_kids3[_i3]; if(_p3===el) continue;
            const _px3=parseInt(_p3.style.left)||0,_py3=parseInt(_p3.style.top)||0;
            const _pw3=parseInt(_p3.style.width)||0,_ph3=parseInt(_p3.style.height)||0;
            if(_cx3>=_px3&&_cx3<=_px3+_pw3&&_cy3>=_py3&&_cy3<=_py3+_ph3){_below3=_p3;break;}
          }
          if(_below3){
            e.preventDefault();e.stopPropagation();
            window._alphaPassthroughDrag=true; // prevent _below3's mkDrag from starting
            if(typeof pickMulti==='function') pickMulti(_below3,false);
            else if(typeof pick==='function') pick(_below3);
            const _bl3b=parseInt(_below3.style.left)||0,_bt3b=parseInt(_below3.style.top)||0;
            window._anyDragging=true;
            const _ox3b=e.clientX,_oy3b=e.clientY;let _mv3b=false;
            const _mm3b=mv=>{
              if(!_mv3b){_mv3b=true;if(typeof pushUndo==='function')pushUndo();}
              const _z3b=typeof zoom!=='undefined'?zoom:1;
              const _snc3=document.getElementById('snap-chk');
              let _nl3b=_bl3b+(mv.clientX-_ox3b)/_z3b,_nt3b=_bt3b+(mv.clientY-_oy3b)/_z3b;
              if(_snc3&&_snc3.checked&&typeof snapV==='function'){_nl3b=snapV(_nl3b);_nt3b=snapV(_nt3b);}
              _below3.style.left=_nl3b+'px';_below3.style.top=_nt3b+'px';
              if(typeof drawGuides==='function')drawGuides(_below3);
              if(typeof _updateHandlesOverlay==='function')_updateHandlesOverlay();
            };
            const _mu3b=()=>{
              window._anyDragging=false;
              window._alphaPassthroughDrag=false;
              document.removeEventListener('mousemove',_mm3b);document.removeEventListener('mouseup',_mu3b);
              if(_mv3b){
                if(typeof clearGuides==='function')clearGuides();if(typeof commitAll==='function')commitAll();
                const _bd3b=slides[cur]&&slides[cur].els.find(e=>e.id===_below3.dataset.id);
                if(_bd3b){_bd3b.x=parseInt(_below3.style.left);_bd3b.y=parseInt(_below3.style.top);}
                if(typeof save==='function')save();if(typeof drawThumbs==='function')drawThumbs();if(typeof saveState==='function')saveState();
              }
            };
            document.addEventListener('mousemove',_mm3b);document.addEventListener('mouseup',_mu3b);
            // Set on=true so this mkDrag's mm/mu handlers register but mm does nothing (on check)
            // This prevents the upper element from starting its own drag
            on=true; ol=parseInt(el.style.left); ot=parseInt(el.style.top);
            document.addEventListener('mousemove',mm);
            document.addEventListener('mouseup',mu);
            return;
          }
        }
        return; // transparent, nothing below — don't drag current element
      }
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
      // Don't switch selection if rotation or pivot is active
      if(window._rotDragging || window._pivotDragging) return;
      if(typeof pickMulti==='function') pickMulti(el, false);
      else pick(el);
    }
    if(window._pivotDragging) return;
    if(window._rotDragging) return;
    // Block figure drag in curve edit mode
    if(window._curveEditMode && el.dataset.shape==='curve') return;
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
      } else if(e2.shiftKey && isCorner) {
        // Shift + corner = proportional resize
        const rawDx=cfg.dx*localDx;
        const rawDy=cfg.dy*localDy;
        const delta=Math.abs(rawDx)>=Math.abs(rawDy)?rawDx:rawDy*aspect;
        nw=Math.max(40,sw+delta);
        nh=Math.max(20,nw/aspect);
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
        // Clamp pivot so it stays inside new bounds
        const _nw=_dmu2.w, _nh=_dmu2.h;
        const _px=+(el.dataset.rotPivotX||0), _py=+(el.dataset.rotPivotY||0);
        const _cxp=Math.max(-_nw/2,Math.min(_nw/2,_px));
        const _cyp=Math.max(-_nh/2,Math.min(_nh/2,_py));
        if(_cxp!==_px||_cyp!==_py){
          el.dataset.rotPivotX=_cxp; el.dataset.rotPivotY=_cyp;
          _dmu2.rotPivotX=_cxp; _dmu2.rotPivotY=_cyp;
        }
      }
      if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
      commitAll();
    };
    document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
  });
}
