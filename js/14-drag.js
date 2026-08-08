// ══════════════ DRAG & RESIZE ══════════════
function mkDrag(el,c){
  let ox,oy,ol,ot,on=false,groupStart=null;
  el.addEventListener('mousedown',e=>{
    if(typeof window._isPreviewActive==='function'&&window._isPreviewActive())return;
    if(window._pvRestoring)return;
    // В режиме обрезки элемент не перетаскивается — только рамка обрезки
    if (el.dataset.cropMode === 'true') return;
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
    // For shapes: allow drag on SVG fill, shape-text, or the transparent hit-area overlay
    if(el.dataset.type==='shape'){
      if(el.dataset.shape==='curve'){
        const _isCurvePath = e.target.closest('.el')===el && 
          (e.target.tagName==='path' || 
           (e.target.tagName==='svg' && e.target.classList.contains('shape-hit-area')));
        const _isCurveSel = el.classList.contains('sel') && !window._curveEditMode;
        // If curve is part of multi-selection, always drag the whole group

        // Helper: find element below curve by checking DOM elements at point
        // Uses both elementsFromPoint AND canvas DOM order to handle pointer-events:none elements
        const _findBelow = () => {
          // Use elementsFromPoint to find what's actually under the cursor
          // This correctly handles curves with SVG hit-areas (not just bounding boxes)
          const _elems = document.elementsFromPoint(e.clientX, e.clientY);
          for(const elem of _elems){
            const _ep = elem.closest('.el');
            if(!_ep || _ep === el || _ep.classList.contains('decor-el')) continue;
            // For curves: only match if click is on their actual stroke/fill path
            if(_ep.dataset.shape === 'curve') {
              // Check if the clicked element is actually part of this curve's SVG
              if(elem.tagName === 'path' && elem.closest('.el') === _ep) return _ep;
              // or its hit-area SVG
              if(elem.tagName === 'svg' && elem.classList.contains('shape-hit-area') && elem.closest('.el') === _ep) return _ep;
              continue; // clicked in empty bbox of another curve — skip
            }
            return _ep;
          }
          return null;
        };
        // Skip passthrough logic if curve is in a multi-selection
        const _inMultiSel = typeof multiSel!=='undefined' && multiSel.size>1 && multiSel.has(el);
        if(_isCurvePath || _inMultiSel){
          if(_isCurvePath) e.stopPropagation();
        } else {
          // Click not on stroke path
          // If curve IS selected: just drag it (don't switch to element below)
          // If curve NOT selected: look for element below to switch to
          const _below = _isCurveSel ? null : _findBelow();
          if(_below){
            e.preventDefault(); e.stopPropagation();
            // Switch selection to element below, then let its own drag handler take over
            // Set flag so _below's drag handler knows to start immediately
            window._pendingDragEl = _below;
            window._pendingDragX = e.clientX;
            window._pendingDragY = e.clientY;
            if(typeof pickMulti==='function') pickMulti(_below, false);
            else if(typeof pick==='function') pick(_below);
            // Dispatch a new mousedown on _below so its drag handler activates naturally
            const _synth = new MouseEvent('mousedown', {
              bubbles: true, cancelable: true,
              clientX: e.clientX, clientY: e.clientY,
              button: 0, buttons: 1
            });
            _below.dispatchEvent(_synth);
            window._pendingDragEl = null;
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
    // PNG/SVG alpha hit test: pass click/drag through transparent regions
    if((el.dataset.type==='image'||el.dataset.type==='svg') &&
       !(typeof multiSel!=='undefined' && multiSel && multiSel.size>1 && multiSel.has(el))){
      const _hitBelow = typeof _findElAtPoint==='function'
        ? _findElAtPoint(e.clientX, e.clientY, { container: document.getElementById('canvas'), selector: '.el', excludeDecor: true })
        : el;
      if(_hitBelow && _hitBelow !== el){
        e.preventDefault(); e.stopPropagation();
        if(typeof pickMulti==='function') pickMulti(_hitBelow, false);
        else if(typeof pick==='function') pick(_hitBelow);
        // Dispatch on the actual deepest element at this point that belongs
        // to _hitBelow (a path/rect/.shape-hit-area/etc.), not on _hitBelow
        // itself — dispatchEvent always sets e.target to the node you call
        // it on, so targeting the outer .el directly would give every
        // handler e.target === (a plain DIV). Shapes specifically check
        // e.target.tagName to decide whether to accept the click, so that
        // always failed and silently aborted the selection switch.
        let _dispatchTarget = _hitBelow;
        const _stack = document.elementsFromPoint(e.clientX, e.clientY);
        for (const _cand of _stack) {
          if (_cand.closest && _cand.closest('.el, .psel') === _hitBelow) { _dispatchTarget = _cand; break; }
        }
        _dispatchTarget.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true, cancelable: true,
          clientX: e.clientX, clientY: e.clientY,
          button: 0, buttons: 1
        }));
        return;
      }
      if(el.dataset.type==='image' && typeof _isTransparentPixel==='function' && _isTransparentPixel(el, e.clientX, e.clientY, 20)){
        return;
      }
      if(el.dataset.type==='svg' && typeof _pointHitsEl==='function' && !_pointHitsEl(el, e.clientX, e.clientY)){
        return;
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
    // Ride-along elements stay locked to the connector — select/configure only
    if(el.dataset.rideConnId){e.preventDefault();return;}
    e.preventDefault();on=true;window._anyDragging=true;ox=e.clientX;oy=e.clientY;ol=parseInt(el.style.left);ot=parseInt(el.style.top);
    let _dragUndo=false;
    // Capture group positions if multi-selecting; curve stroke alone moves only the curve
    const _curveStrokeDrag=el.dataset.shape==='curve'&&(
      e.target.tagName==='path'||
      (e.target.tagName==='svg'&&e.target.classList&&e.target.classList.contains('shape-hit-area'))
    );
    if(multiSel.size>1&&multiSel.has(el)&&(!_curveStrokeDrag||window._explicitMultiSel)){
      groupStart=new Map();
      multiSel.forEach(mEl=>groupStart.set(mEl,{x:parseInt(mEl.style.left),y:parseInt(mEl.style.top)}));
    } else {
      groupStart=null;
    }
    const mm=e2=>{
      if(!on)return;
      if(typeof window._isPreviewActive==='function'&&window._isPreviewActive()){mu();return;}
      if(e2.buttons===0){mu();return;}
      if(!_dragUndo){_dragUndo=true;if(typeof pushUndo==='function')pushUndo();}
      const _z=typeof _canvasZoom==='number'?_canvasZoom:1;
      let dx=(e2.clientX-ox)/_z,dy=(e2.clientY-oy)/_z;
      if(groupStart){
        groupStart.forEach((pos,mEl)=>{
          let nx=pos.x+dx,ny=pos.y+dy;
          if(document.getElementById('snap-chk').checked){nx=snapV(nx);ny=snapV(ny);}
          mEl.style.left=nx+'px';mEl.style.top=ny+'px';
        });
        if(typeof renderMotionOverlay==='function') renderMotionOverlay();
        if(typeof _scheduleHandlesOverlayUpdate==='function') _scheduleHandlesOverlayUpdate();
        else if(typeof _updateHandlesOverlay==='function' && !window._curveDragging)_updateHandlesOverlay();
      } else {
        let nx=ol+dx,ny=ot+dy;
        if(document.getElementById('snap-chk').checked){nx=snapV(nx);ny=snapV(ny);}
        el.style.left=nx+'px';el.style.top=ny+'px';showGuides(el);syncPos();
        if(typeof renderMotionOverlay==='function') renderMotionOverlay();
        if(typeof _scheduleHandlesOverlayUpdate==='function') _scheduleHandlesOverlayUpdate();
        else if(typeof _updateHandlesOverlay==='function' && !window._curveDragging)_updateHandlesOverlay();
      }
    };
    const mu=()=>{on=false;window._anyDragging=false;groupStart=null;clearGuides();document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);commitAll();};
    document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
  });

}
function mkResize(el,rh,cfg){
  rh.addEventListener('mousedown',e=>{
    if(typeof window._isPreviewActive==='function'&&window._isPreviewActive())return;
    if(window._pvRestoring)return;
    e.preventDefault();e.stopPropagation();
    window._resizeDragging=true;window._anyDragging=true;
    const _cwrap=document.getElementById('cwrap');if(_cwrap)_cwrap.style.cursor='';
    let _resizeUndo=false;
    const cv=document.getElementById('canvas');
    cv.querySelectorAll('.el').forEach(other=>{if(other!==el)other.style.pointerEvents='none';});
    const sx=e.clientX,sy=e.clientY,sw=parseInt(el.style.width),sh=parseInt(el.style.height),sl=parseInt(el.style.left),st=parseInt(el.style.top);
    const aspect=sw/sh; // for proportional resize
    const isCorner=cfg.dx!==0&&cfg.dy!==0;
    const isImgCorner=el.dataset.type==='image'&&isCorner;
    // Applets with stored aspect ratio always resize proportionally from corners
    const _appletD=el.dataset.type==='applet'&&slides[cur]?slides[cur].els.find(x=>x.id===el.dataset.id):null;
    const appletAspect=_appletD&&_appletD._appletAspect||null;
    // Chemistry / logic diagrams: always keep aspect so content doesn't stretch
    const isChemGraph=el.dataset.type==='graph'&&(
      el.dataset.graphKind==='chem' || el.dataset.graphKind==='logic' ||
      (slides[cur]&&['chem','logic'].includes((slides[cur].els.find(x=>x.id===el.dataset.id)||{}).graphKind))
    );
    const mm=e2=>{
      if(typeof window._isPreviewActive==='function'&&window._isPreviewActive()){mu();return;}
      if(e2.buttons===0){mu();return;}
      if(!_resizeUndo){_resizeUndo=true;if(typeof pushUndo==='function')pushUndo();}
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
      } else if(isChemGraph){
        // Always proportional — formula and structure must not stretch
        if(isCorner){
          const rawDx=cfg.dx*localDx;
          const rawDy=cfg.dy*localDy;
          const delta=Math.abs(rawDx)>=Math.abs(rawDy)?rawDx:rawDy*aspect;
          nw=Math.max(80,sw+delta);
          nh=Math.max(80,nw/aspect);
        } else if(cfg.dx!==0){
          nw=Math.max(80,sw+cfg.dx*localDx);
          nh=Math.max(80,nw/aspect);
        } else {
          nh=Math.max(80,sh+cfg.dy*localDy);
          nw=Math.max(80,nh*aspect);
        }
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
      if(d&&el.dataset.type==='shape')renderShapeEl(el,d,{remapCloud:true});
      if(d&&el.dataset.type==='table'){d.w=nw;d.h=nh;if(typeof renderTableEl==='function'){if(d.showChart){const sv=el.querySelector('.ec svg');if(sv){sv.setAttribute('width',nw);sv.setAttribute('height',nh);sv.setAttribute('viewBox','0 0 '+nw+' '+nh);}}else{renderTableEl(el,d);}}}
      // For image side-handle drag: show stretch in real time
      if(el.dataset.type==='image'&&(cfg.dx===0||cfg.dy===0)){
        const img=el.querySelector('img');if(img)img.style.objectFit='fill';
      }
      syncPos();
      if(typeof _scheduleHandlesOverlayUpdate==='function') _scheduleHandlesOverlayUpdate();
      else if(typeof _updateHandlesOverlay==='function' && !window._curveDragging)_updateHandlesOverlay();
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
        const _newX=parseInt(el.style.left)||0, _newY=parseInt(el.style.top)||0;
        const _newW=parseInt(el.style.width)||0, _newH=parseInt(el.style.height)||0;
        // Keep hover-effect base/hover positions in sync with the resize delta.
        // This must happen BEFORE _dmu2.x/y/w/h are overwritten below, and can't
        // be deferred to save()'s own delta-detection because _dmu2 (the same
        // object save() would compare against) is mutated right here first.
        if(el.dataset.hoverFx){
          let _fx; try{ _fx=JSON.parse(el.dataset.hoverFx); }catch(e){ _fx=null; }
          if(_fx && _fx.base){
            const _dx=_newX-(_dmu2.x||0), _dy=_newY-(_dmu2.y||0);
            const _dw=_newW-(_dmu2.w||0), _dh=_newH-(_dmu2.h||0);
            if(_dx||_dy||_dw||_dh){
              _fx.base.x=(_fx.base.x||0)+_dx;
              _fx.base.y=(_fx.base.y||0)+_dy;
              _fx.base.w=(_fx.base.w||0)+_dw;
              _fx.base.h=(_fx.base.h||0)+_dh;
              if(_fx.hover){
                if(_fx.hover.x!=null)_fx.hover.x=+_fx.hover.x+_dx;
                if(_fx.hover.y!=null)_fx.hover.y=+_fx.hover.y+_dy;
                if(_fx.hover.w!=null)_fx.hover.w=+_fx.hover.w+_dw;
                if(_fx.hover.h!=null)_fx.hover.h=+_fx.hover.h+_dh;
              }
              el.dataset.hoverFx=JSON.stringify(_fx);
            }
          }
        }
        _dmu2.x=_newX;
        _dmu2.y=_newY;
        _dmu2.w=_newW;
        _dmu2.h=_newH;
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
      if(typeof _scheduleHandlesOverlayUpdate==='function') _scheduleHandlesOverlayUpdate();
      else if(typeof _updateHandlesOverlay==='function' && !window._curveDragging) _updateHandlesOverlay();
      commitAll();
    };
    document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
  });
}
