// ══════════════ MULTI-SELECT & RUBBER-BAND ══════════════
function clearMultiSel(){
  multiSel.forEach(el=>el.classList.remove('multi-sel'));
  multiSel.clear();
  window._explicitMultiSel=false;
  updateMultiBar();
  if(typeof _updateSelFrames==='function') _updateSelFrames();
}
function addToMultiSel(el){
  if(el.classList.contains('decor-el'))return; // never select decor
  multiSel.add(el);el.classList.add('multi-sel');
  updateMultiBar();
  if(typeof _updateSelFrames==='function') _updateSelFrames();
}
function removeFromMultiSel(el){
  multiSel.delete(el);el.classList.remove('multi-sel');
  updateMultiBar();
  if(typeof _updateSelFrames==='function') _updateSelFrames();
}
function updateMultiBar(){
  // Show count in a toast-like way if >1 selected
  if(multiSel.size>1){
    const ids=Array.from(multiSel).map(el=>el.dataset.id);
    // ensure primary sel is also in multiSel
  }
}

/** Bright selection frames outside element opacity (visible even at opacity 0). */
function _updateSelFrames(){
  const layer = document.getElementById('sel-frames-layer');
  if(!layer) return;
  layer.innerHTML = '';
  const targets = new Set();
  if(typeof multiSel!=='undefined' && multiSel && multiSel.size>1){
    multiSel.forEach(el => targets.add(el));
  } else if(typeof sel!=='undefined' && sel){
    targets.add(sel);
  }
  targets.forEach(el => {
    if(!el || !el.isConnected) return;
    // Angle markers: no selection rectangle (settings live in props panel)
    if(el.dataset && el.dataset.type === 'lineangle') return;
    // Ink hosts: stroke halo + group chrome — avoid a second (empty) box per stroke
    if(el.dataset && el.dataset.type === 'inkhost') return;
    const l = parseInt(el.style.left)||0;
    const t = parseInt(el.style.top)||0;
    const w = parseInt(el.style.width)||0;
    const h = parseInt(el.style.height)||0;
    const rot = parseFloat(el.dataset.rot)||0;
    const frame = document.createElement('div');
    frame.className = 'sel-frame' + ((typeof multiSel !== 'undefined' && multiSel.size > 1) ? ' multi' : '');
    frame.style.left = l + 'px';
    frame.style.top = t + 'px';
    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
    frame.style.transformOrigin = 'center center';
    frame.style.transform = rot ? ('rotate(' + rot + 'deg)') : 'none';
    if(el.dataset && el.dataset.appletId==='flip'){
      const w=parseFloat(el.style.width)||FLIP_W;
      const h=parseFloat(el.style.height)||FLIP_H;
      const rx=(typeof _flipRxPx==='function'?_flipRxPx(w,h):(typeof FLIP_RX==='number'?FLIP_RX:14))+'px';
      frame.style.borderRadius = rx;
      frame.classList.add('flip-rx');
    }
    layer.appendChild(frame);
  });
}
window._updateSelFrames = _updateSelFrames;

// Multi-select aware pick
function pickMulti(el,shiftKey){
  if(el&&el.classList.contains('decor-el'))return; // never select decor
  // Pipette mode: clicking an element copies its style to pipetteSrc
  if(pipetteMode){
    pipetteApply(el, {shift: !!shiftKey});
    return;
  }
  if(shiftKey){
    window._explicitMultiSel=true;
    if(multiSel.has(el)){
      removeFromMultiSel(el);
      const remaining=[...multiSel];
      pick(remaining.length>0?remaining[remaining.length-1]:null);
    } else {
      if(sel&&!multiSel.has(sel))addToMultiSel(sel);
      addToMultiSel(el);
      pick(el);
    }
  } else {
    clearMultiSel();
    pick(el);
  }
}

// Patch canvas mousedown for rubber-band
(function(){
  const cv=document.getElementById('canvas');
  const cc=document.getElementById('canvas-container');
  const cwrap=document.getElementById('cwrap');
  if(!cv||!cwrap) return;

  // Keep rubberband as sibling of #canvas (above SVG/elements), not inside it
  function _ensureRubberband(){
    let rb=document.getElementById('rubberband');
    const host=cc||cv;
    if(!rb){
      rb=document.createElement('div');
      rb.id='rubberband';
      host.appendChild(rb);
    } else if(rb.parentElement!==host){
      host.appendChild(rb);
    }
    return rb;
  }
  _ensureRubberband();

  function toCanvasCoords(e){
    const z=typeof _canvasZoom==='number'?_canvasZoom:1;
    const rect=cv.getBoundingClientRect();
    return {
      x:(e.clientX-rect.left)/z,
      y:(e.clientY-rect.top)/z
    };
  }

  function magneticPickAt(pt, shiftKey){
    const SNAP_R = 40;
    const allEls = Array.from(cv.querySelectorAll('.el:not(.decor-el)'));
    let bestEl = null, bestD2 = SNAP_R;
    allEls.forEach(el => {
      if(el.dataset.objHidden==='1') return;
      const l=parseInt(el.style.left)||0, t2=parseInt(el.style.top)||0;
      const w=parseInt(el.style.width)||0, h=parseInt(el.style.height)||0;
      const cx2 = Math.max(l, Math.min(pt.x, l+w));
      const cy2 = Math.max(t2, Math.min(pt.y, t2+h));
      const d2 = Math.hypot(pt.x-cx2, pt.y-cy2);
      if(d2 < bestD2){ bestD2 = d2; bestEl = el; }
    });
    if(bestEl){
      if(typeof pipetteMode!=='undefined'&&pipetteMode){
        if(typeof pickMulti==='function') pickMulti(bestEl, !!shiftKey);
        return true;
      }
      if(shiftKey && typeof pickMulti==='function') pickMulti(bestEl, true);
      else if(typeof pick==='function') pick(bestEl);
      return true;
    }
    return false;
  }

  function _isEmptyCanvasTarget(t){
    if(!t||!t.closest) return false;
    // Animated layout décor is background — never blocks rubber-band / selection
    if(t.closest('.decor-el') || t.closest('#cvbg') || t.closest('.cvbg-img-layer') || t.closest('.decor-gl-layer')) {
      return !!(t.closest('#cwrap'));
    }
    // Real interactive targets — do not start rubber-band
    if(t.closest('.el')) return false;
    if(t.closest('.rh')) return false;
    if(t.closest('.conn-hit')) return false;
    if(t.closest('#conn-handles')) return false;
    // Any handle on the overlay (resize, line endpoints, pivot, callout, …)
    if(t.closest('#handles-overlay')) return false;
    if(t.closest('#pivot-handle')) return false;
    if(t.closest('#_anim-picker-ov')) return false;
    if(t.closest('#motion-ghosts') || t.closest('#motion-svg') || t.closest('.motion-ghost') || t.closest('.motion-handle') || t.closest('[data-motion-ui]') || t.closest('#camera-layer') || t.closest('#camera-svg') || t.closest('[data-camera-ui]')) return false;
    if(t.closest('.arc-handle,.star-handle,.para-handle,.chev-handle,.moon-handle,.trap-handle,.curve-handle')) return false;
    // Empty slide / overlays / outside-slide chrome — OK to rubber-band
    if(t.closest('#cwrap')) return true;
    return false;
  }

  function _showRubber(x,y,w,h){
    const rb=_ensureRubberband();
    rb.style.cssText='position:absolute;display:block;left:'+x+'px;top:'+y+'px;width:'+(w||0)+'px;height:'+(h||0)+'px;border:1.5px dashed var(--accent,#3b82f6);background:rgba(59,130,246,.08);pointer-events:none;z-index:10050;box-sizing:border-box;';
    return rb;
  }

  // Capture phase so we start rubber-band even when SVG overlay is under the cursor
  function onDown(e){
    if(e.button!==0)return;
    if(window._inkPtrHandled){ window._inkPtrHandled=false; return; }
    if(typeof window._isPreviewActive==='function'&&window._isPreviewActive())return;
    if(window._anyDragging)return;
    if(window._lineEpDragging)return;
    if(window._pivotDragging || window._overPivotHandle)return;
    if(window._animPickerCtx)return;
    if(e.target&&e.target.closest&&e.target.closest('#_anim-picker-ov'))return;
    if(typeof _rotDragging!=='undefined'&&_rotDragging)return;
    if(window._resizeDragging)return;
    if(typeof _rotEl!=='undefined'&&_rotEl&&typeof _nearCorner==='function'){
      const pt=toCanvasCoords(e);
      if(_nearCorner(_rotEl,pt.x,pt.y))return;
    }
    if(!_isEmptyCanvasTarget(e.target) && !window._mobileRubberMode) return;
    if(typeof stopTextEditing==='function')stopTextEditing();

    // Drawing tools own the canvas — don't start object rubber-band
    if(typeof isDrawModeActive==='function'&&isDrawModeActive()) return;

    const onCanvas = !!(e.target.closest('#canvas') || e.target.closest('#canvas-bg-rect') ||
      e.target.closest('#lego-layer') || e.target.closest('#conn-svg-layer') ||
      e.target.closest('#sel-frames-layer') || e.target.closest('#handles-overlay') ||
      e.target.closest('#rubberband') || e.target.closest('.decor-el') ||
      e.target.closest('#cvbg') || e.target.closest('.cvbg-img-layer') ||
      e.target.closest('#ink-layer') || e.target.closest('#ink-svg'));

    if(window._curveEditMode) {
      const pt0=toCanvasCoords(e);
      rbStart={x:pt0.x,y:pt0.y,shift:e.shiftKey,onCanvas:onCanvas};
      _showRubber(pt0.x,pt0.y,0,0);
      e.preventDefault();
      return;
    }
    const wasMulti = multiSel.size > 1;
    _justClearedMulti = wasMulti;
    clearMultiSel();
    if(sel&&!(typeof _rotDragging!=='undefined'&&_rotDragging)&&!window._curveEditMode){
      if(typeof pick==='function')pick(null);
      else{sel.classList.remove('sel');sel=null;}
    }
    if(!e.shiftKey && typeof clearInkSelection==='function') clearInkSelection();
    if(!wasMulti || !onCanvas) _justClearedMulti = false;
    syncProps();
    _justClearedMulti = false;
    const pt=toCanvasCoords(e);
    const emptyTap=_isEmptyCanvasTarget(e.target);
    rbStart={x:pt.x,y:pt.y,shift:e.shiftKey,onCanvas:onCanvas,emptyTap:emptyTap};
    _showRubber(pt.x,pt.y,0,0);
    e.preventDefault();
  }

  // One listener in capture — avoids double-fire on cc+cwrap bubble
  cwrap.addEventListener('mousedown', onDown, true);

  document.addEventListener('mousedown', function(e) {
    if(e.button!==0) return;
    if(window._anyDragging) return;
    if(e.target.closest('#ribbon')) return;
    if(e.target.closest('#props')) return;
    if(e.target.closest('#ctoolbar') || e.target.closest('#mobile-slide-bar') || e.target.closest('#mobile-chrome')) return;
    if(e.target.closest('#sidebar')) return;
    if(e.target.closest('.modal-ov')) return;
    if(e.target.closest('.modal')) return;
    if(e.target.closest('#anim-panel')) return;
    if(e.target.closest('#cwrap')) {
      if(!e.target.closest('.el') && !e.target.closest('#handles-overlay')) {
        requestAnimationFrame(function() {
          var _ov=document.getElementById('handles-overlay');
          if(_ov && typeof sel!=='undefined' && !sel) _ov.innerHTML='';
        });
      }
      return;
    }
  });

  document.addEventListener('mousemove',e=>{
    if(!rbStart)return;
    if(window._anyDragging || window._pivotDragging || (typeof _rotDragging!=='undefined'&&_rotDragging)){
      rbStart=null;
      const rb=document.getElementById('rubberband');
      if(rb) rb.style.display='none';
      return;
    }
    const z=typeof _canvasZoom==='number'?_canvasZoom:1;
    const rect=cv.getBoundingClientRect();
    const mx=(e.clientX-rect.left)/z;
    const my=(e.clientY-rect.top)/z;
    const x=Math.min(mx,rbStart.x),y=Math.min(my,rbStart.y);
    const w=Math.abs(mx-rbStart.x),h=Math.abs(my-rbStart.y);
    _showRubber(x,y,w,h);
  });

  function _rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh){
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  /** Axis-aligned bbox of element in canvas coords (for frames / ink); not used for rubber hit */
  function _elSelectAABB(el){
    const L = parseInt(el.style.left) || 0;
    const T = parseInt(el.style.top) || 0;
    const W = parseInt(el.style.width) || 0;
    const H = parseInt(el.style.height) || 0;
    const rotDeg = parseFloat(el.dataset.rot) || 0;
    if(!rotDeg) return { x: L, y: T, w: W, h: H };
    const rad = rotDeg * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const cx = L + W / 2, cy = T + H / 2;
    const corners = [
      [-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]
    ].map(([dx, dy]) => ({
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos
    }));
    let minX = corners[0].x, maxX = corners[0].x, minY = corners[0].y, maxY = corners[0].y;
    for(let i = 1; i < 4; i++){
      const p = corners[i];
      if(p.x < minX) minX = p.x;
      if(p.x > maxX) maxX = p.x;
      if(p.y < minY) minY = p.y;
      if(p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  /** Line segment vs AABB (canvas space) — precise for thin rotated strokes */
  function _segHitsRect(x1, y1, x2, y2, rx, ry, rw, rh){
    const inR = (x, y) => x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
    if(inR(x1, y1) || inR(x2, y2)) return true;
    function cross(ax, ay, bx, by, cx, cy){ return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); }
    function overlaps1D(a1, a2, b1, b2){
      return Math.max(a1, a2) >= Math.min(b1, b2) && Math.min(a1, a2) <= Math.max(b1, b2);
    }
    function segSeg(ax, ay, bx, by, cx, cy, dx, dy){
      if(!overlaps1D(ax, bx, cx, dx) || !overlaps1D(ay, by, cy, dy)) return false;
      const d1 = cross(ax, ay, bx, by, cx, cy);
      const d2 = cross(ax, ay, bx, by, dx, dy);
      const d3 = cross(cx, cy, dx, dy, ax, ay);
      const d4 = cross(cx, cy, dx, dy, bx, by);
      return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0) || d1 === 0 || d2 === 0) &&
             ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0) || d3 === 0 || d4 === 0) &&
             (d1 !== 0 || d2 !== 0 || d3 !== 0 || d4 !== 0 || true);
    }
    const x3 = rx + rw, y3 = ry + rh;
    return segSeg(x1, y1, x2, y2, rx, ry, x3, ry) ||
           segSeg(x1, y1, x2, y2, x3, ry, x3, y3) ||
           segSeg(x1, y1, x2, y2, x3, y3, rx, y3) ||
           segSeg(x1, y1, x2, y2, rx, y3, rx, ry);
  }

  /** Rubber AABB vs element's real rotated box (OBB) — avoids fat AABB false hits */
  function _obbHitsRubber(L, T, W, H, rotDeg, rx, ry, rw, rh){
    if(!rotDeg) return _rectsOverlap(L, T, W, H, rx, ry, rw, rh);
    const rad = rotDeg * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const cx = L + W / 2, cy = T + H / 2;
    const eCorners = [
      [-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]
    ].map(([dx, dy]) => ({
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos
    }));
    const rCorners = [
      { x: rx, y: ry }, { x: rx + rw, y: ry },
      { x: rx + rw, y: ry + rh }, { x: rx, y: ry + rh }
    ];
    // SAT: rubber axes (X/Y) + element local axes
    const axes = [
      { x: 1, y: 0 }, { x: 0, y: 1 },
      { x: cos, y: sin }, { x: -sin, y: cos }
    ];
    function project(corners, axis){
      let min = Infinity, max = -Infinity;
      for(let i = 0; i < corners.length; i++){
        const d = corners[i].x * axis.x + corners[i].y * axis.y;
        if(d < min) min = d;
        if(d > max) max = d;
      }
      return [min, max];
    }
    for(let i = 0; i < axes.length; i++){
      const a = project(eCorners, axes[i]);
      const b = project(rCorners, axes[i]);
      if(a[1] < b[0] || b[1] < a[0]) return false;
    }
    return true;
  }

  function _elHitsRubber(el, rx, ry, rw, rh){
    if(el.dataset.shape === 'line' && typeof _lineCanvasEnds === 'function' && typeof slides !== 'undefined' && slides[cur]){
      const d = slides[cur].els.find(e => e && e.id === el.dataset.id);
      if(d && d.shape === 'line'){
        try{
          const ends = _lineCanvasEnds(el, d);
          if(_segHitsRect(ends.a.x, ends.a.y, ends.b.x, ends.b.y, rx, ry, rw, rh)) return true;
          // Also accept if rubber covers a junction endpoint near the box (fat corner pick)
          const pad = 10;
          if(_rectsOverlap(ends.a.x - pad, ends.a.y - pad, pad * 2, pad * 2, rx, ry, rw, rh)) return true;
          if(_rectsOverlap(ends.b.x - pad, ends.b.y - pad, pad * 2, pad * 2, rx, ry, rw, rh)) return true;
          return false;
        }catch(err){}
      }
    }
    const L = parseInt(el.style.left) || 0;
    const T = parseInt(el.style.top) || 0;
    const W = parseInt(el.style.width) || 0;
    const H = parseInt(el.style.height) || 0;
    const rotDeg = parseFloat(el.dataset.rot) || 0;
    return _obbHitsRubber(L, T, W, H, rotDeg, rx, ry, rw, rh);
  }

  document.addEventListener('mouseup',e=>{
    if(!rbStart)return;
    const z=typeof _canvasZoom==='number'?_canvasZoom:1;
    const rect=cv.getBoundingClientRect();
    const mx=(e.clientX-rect.left)/z;
    const my=(e.clientY-rect.top)/z;
    const rx=Math.min(mx,rbStart.x),ry=Math.min(my,rbStart.y);
    const rw=Math.abs(mx-rbStart.x),rh=Math.abs(my-rbStart.y);
    const wasOnCanvas=!!rbStart.onCanvas;
    const wasShift=!!rbStart.shift;
    const wasEmptyTap=!!rbStart.emptyTap;
    rbStart=null;
    const rb=document.getElementById('rubberband');
    if(rb) rb.style.display='none';
    if(rw<4&&rh<4){
      if(wasOnCanvas && !window._curveEditMode){
        const pt={x:mx,y:my};
        if(wasEmptyTap && !wasShift){
          if(typeof desel==='function') desel();
          else if(typeof pick==='function') pick(null);
          if(typeof clearInkSelection==='function') clearInkSelection();
        } else if(typeof pickAndSelectInkAt==='function' && pickAndSelectInkAt(pt.x, pt.y, {additive:wasShift})){
          if(!wasShift){
            clearMultiSel();
            if(typeof pick==='function') pick(null);
          }
        } else if(!magneticPickAt(pt, wasShift)){
          if(!wasShift && typeof desel==='function') desel();
          else if(!wasShift && typeof pick==='function') pick(null);
          if(!wasShift && typeof clearInkSelection==='function') clearInkSelection();
        } else if(!wasShift && typeof clearInkSelection==='function'){
          clearInkSelection();
        }
        if(typeof _updateSelFrames==='function') _updateSelFrames();
      }
      return;
    }
    if(window._curveEditMode && typeof sel!=='undefined' && sel && sel.dataset.shape==='curve') {
      if(typeof _curveRubberBandSelect==='function') _curveRubberBandSelect(rx,ry,rw,rh);
      return;
    }
    cv.querySelectorAll('.el').forEach(el=>{
      if(el.dataset.objHidden==='1') return;
      if(_elHitsRubber(el, rx, ry, rw, rh)){
        addToMultiSel(el);
      }
    });
    const _selectedGroupIds = new Set();
    multiSel.forEach(el => {
      const gid = el.dataset && el.dataset.groupId;
      if(gid) _selectedGroupIds.add(gid);
    });
    if(_selectedGroupIds.size > 0) {
      cv.querySelectorAll('.el').forEach(el => {
        const gid = el.dataset && el.dataset.groupId;
        if(gid && _selectedGroupIds.has(gid) && !multiSel.has(el)) {
          addToMultiSel(el);
        }
      });
    }
    // Also select ink strokes & fills in the same rubber rect (expand ink groups)
    let inkN=0;
    if(typeof selectInkInRect==='function'){
      inkN=selectInkInRect(rx, ry, rw, rh, {
        additive:wasShift,
        keepIfEmpty:true,
        keepObjectSel:true,
        silent:false,
        expandGroup:true
      })||0;
    }
    // Touching any object in a group also selects all brushes/fills of that group
    if(_selectedGroupIds.size > 0 && typeof slides!=='undefined' && slides[cur]){
      const groupInkIds=[];
      _selectedGroupIds.forEach(gid=>{
        (slides[cur].ink||[]).forEach(st=>{ if(st&&st.groupId===gid&&st.id) groupInkIds.push(st.id); });
        (slides[cur].inkFills||[]).forEach(f=>{ if(f&&f.groupId===gid&&f.id) groupInkIds.push(f.id); });
      });
      if(groupInkIds.length && typeof window.selectInkIds==='function'){
        const merged=new Set(groupInkIds);
        if(typeof getSelectedInkItems==='function'){
          const curInk=getSelectedInkItems();
          (curInk.strokes||[]).forEach(s=>{ if(s&&s.id) merged.add(s.id); });
          (curInk.fills||[]).forEach(f=>{ if(f&&f.id) merged.add(f.id); });
        }
        window.selectInkIds([...merged], {keepObjectSel:true, silent:true, expandGroup:false});
        inkN=merged.size;
      }
    }
    if(multiSel.size===1 && !inkN){
      const onlyEl=[...multiSel][0];clearMultiSel();pick(onlyEl);
    } else if(multiSel.size>1 || (multiSel.size>=1 && inkN) || inkN>1 || (inkN===1 && multiSel.size===0)){
      if(multiSel.size>=1){
        window._explicitMultiSel=true;
        const _frozenSel = [...multiSel];
        const _lastEl = _frozenSel[_frozenSel.length-1];
        window._rbSelecting = true;
        if(typeof pick==='function') pick(_lastEl);
        window._rbSelecting = false;
        _frozenSel.forEach(el => { if(!multiSel.has(el)) addToMultiSel(el); });
        if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
      }
      const total=multiSel.size+inkN;
      if(total>1 && typeof toast==="function")toast(total+t('toastMultiSel'),'ok');
    } else if(multiSel.size===0 && inkN===0 && !wasShift){
      if(typeof clearInkSelection==='function') clearInkSelection();
    }
    if(typeof _updateSelFrames==='function') _updateSelFrames();
    if(typeof syncProps==='function') syncProps();
    if(window._mobileRubberMode && (rw>=4||rh>=4) && typeof toggleMobileRubber==='function'){
      toggleMobileRubber(false);
    }
  });

  cwrap.addEventListener('pointerdown', function (pe) {
    if (pe.pointerType === 'mouse') return;
    if (typeof isMobileLayout !== 'function' || !isMobileLayout()) return;
    if (window._mobilePinchActive) return;
    if (pe.target.closest && pe.target.closest('#mobile-chrome, #mobile-slide-bar, #ctoolbar, #sidebar, #props, .modal-ov')) return;
    const forceRubber = !!window._mobileRubberMode;
    if (!forceRubber && !_isEmptyCanvasTarget(pe.target)) return;
    if (typeof window._clearTextTapState === 'function') window._clearTextTapState();
    pe.preventDefault();
    pe.stopPropagation();
    const mk = function (type, ev) {
      return new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: ev.clientX,
        clientY: ev.clientY,
        button: 0,
        buttons: type === 'mouseup' ? 0 : 1,
        shiftKey: !!ev.shiftKey
      });
    };
    onDown(mk('mousedown', pe));
    function onMove(ev) {
      if (ev.pointerId !== pe.pointerId) return;
      ev.preventDefault();
      document.dispatchEvent(mk('mousemove', ev));
    }
    function onUp(ev) {
      if (ev.pointerId !== pe.pointerId) return;
      document.dispatchEvent(mk('mouseup', ev));
      cleanup();
    }
    function cleanup() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    }
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }, true);
})();

// ══════════════ GROUP COPY / PASTE ══════════════
function copySelected(){
  window._slidesInternalCopy=true;
  window._appCopyGuardUntil=Date.now()+4000;
  const ids = [];
  if(multiSel.size>=1){
    multiSel.forEach(domEl=>{ if(domEl.dataset.id) ids.push(domEl.dataset.id); });
  } else if(sel){
    ids.push(sel.dataset.id);
  }
  const elsToCopy = _copyElementDataList(ids);
  const hasInk=typeof hasSelectedInk==='function'&&hasSelectedInk();
  if(!elsToCopy.length&&!hasInk){
    window._slidesInternalCopy=false;
    return (typeof toast==="function")&&toast(t('toastNothingSelected'));
  }
  if(elsToCopy.length){
    if(typeof _fillClipboardImageSrcs==='function') _fillClipboardImageSrcs(elsToCopy);
    clipboard=elsToCopy;
    window._appClipboardEls=elsToCopy;
  }
  if(hasInk&&typeof copySelectedInk==='function'){
    copySelectedInk({silent:!!elsToCopy.length, skipClipMark:!!elsToCopy.length});
    try{ window._clipHadInk=true; }catch(e){}
  } else {
    if(typeof clearInkClipboard==='function') clearInkClipboard();
    try{ window._clipHadInk=false; }catch(e){}
  }
  const finalizeCopy=()=>{
    if(elsToCopy.length){
      clipboard=elsToCopy;
      window._appClipboardEls=elsToCopy;
      if(typeof _xclipSaveElements==='function') _xclipSaveElements(elsToCopy);
      if(typeof window._markElementClipboardCopy==='function') window._markElementClipboardCopy();
    }
    window._slidesInternalCopy=false;
    if(typeof toast==='function'&&elsToCopy.length){
      toast(t('toastElementsCopied')+elsToCopy.length+t('toastElementsSuffix'),'ok');
    }
  };
  if(elsToCopy.length){
    const imgs=elsToCopy.filter(function(d){ return d&&d.type==='image'; });
    if(typeof MediaStore!=='undefined'&&MediaStore.persistImageEl&&imgs.length){
      Promise.all(imgs.map(function(d){ return MediaStore.persistImageEl(d); }))
        .then(finalizeCopy).catch(finalizeCopy);
    } else finalizeCopy();
  } else {
    window._slidesInternalCopy=false;
  }
}

function pasteSelected(){
  if(typeof window._isPreviewActive==='function'&&window._isPreviewActive())return;
  if((!clipboard||!clipboard.length)&&window._appClipboardEls&&window._appClipboardEls.length){
    clipboard=window._appClipboardEls;
  }
  if(typeof _xclipHydrateElements==='function' && !(clipboard&&clipboard.length)) _xclipHydrateElements();
  const wantInk=!!window._clipHadInk && typeof hasInkClipboard==='function'&&hasInkClipboard();
  if(!clipboard.length&&!wantInk)return (typeof toast==="function")&&toast(t('toastNothingToPaste'));
  if(!slides[cur])return;
  if(clipboard.length===1&&typeof urlFromElementData==='function'){
    const url=urlFromElementData(clipboard[0]);
    if(url&&typeof insertQRAppletAt==='function'){
      insertQRAppletAt(url, null, null);
      return;
    }
  }
  (async function(){
    if(clipboard&&clipboard.length&&typeof _restoreClipImageSrc==='function'){
      clipboard.forEach(function(d,i){ _restoreClipImageSrc(d,i); });
    }
    if(typeof pushUndo==="function")pushUndo();
    clearMultiSel();if(sel)sel.classList.remove('sel');sel=null;
    let pastedImgs=[];
    if(clipboard.length){
      const toPaste=clipboard.filter(function(d){ return d&&d.type!=='inkhost'; });
      if(typeof _ensureClipImageSrcs==='function') await _ensureClipImageSrcs(toPaste);
      const clones = _cloneElementDataList(toPaste, { offset: 0 });
      pastedImgs=clones.filter(function(d){ return d&&d.type==='image'; });
      let skippedImg=0;
      clones.forEach(function(nd,i){
        if(nd&&nd.type==='image'&&!nd.src){ skippedImg++; return; }
        const src=toPaste[i]&&toPaste[i].src;
        if(nd&&nd.type==='image'&&src&&String(src).startsWith('data:')) nd.src=src;
        slides[cur].els.push(nd);
        mkEl(nd);
        const domEl=document.getElementById('canvas').querySelector('[data-id="'+nd.id+'"]');
        if(domEl)addToMultiSel(domEl);
      });
      if(skippedImg&&typeof toast==='function'){
        toast('Не удалось вставить изображение — скопируйте его снова','warn');
      }
      if(typeof renderLineAngleEl==='function'){
        clones.forEach(function(nd){
          if(!nd || nd.type!=='lineangle') return;
          const domEl=document.getElementById('canvas').querySelector('[data-id="'+nd.id+'"]');
          if(domEl) renderLineAngleEl(domEl, nd);
        });
      }
    }
    if(wantInk&&typeof pasteInkFromClipboard==='function'){
      pasteInkFromClipboard({
        skipUndo:true,
        keepObjectSel:true,
        silent:!!clipboard.length,
        skipThumbs:true,
        skipSave:true
      });
    }
    save();if(typeof drawThumbs==="function")drawThumbs();
    const afterPaste=()=>{
      if(typeof saveState==="function")saveState();
      if(typeof renderAnimPanel==='function')renderAnimPanel();
      if(typeof renderMotionOverlay==='function')renderMotionOverlay();
      if(multiSel.size===1){const only=[...multiSel][0];clearMultiSel();pick(only);}
      else if(multiSel.size>1){pick([...multiSel].slice(-1)[0]);if(typeof toast==="function")toast(t('toastElementsPasted')+multiSel.size+t('toastElementsSuffix'),'ok');}
      else if(wantInk&&typeof toast==="function"&&!clipboard.length){}
    };
    const imgs=pastedImgs.filter(function(d){ return d&&d.src; });
    if(imgs.length&&typeof MediaStore!=='undefined'&&MediaStore.persistImageEl){
      Promise.all(imgs.map(function(d){ return MediaStore.persistImageEl(d); })).then(afterPaste).catch(afterPaste);
    } else afterPaste();
  })();
}

function _clearAllJoinsToId(id){
  if(typeof slides === 'undefined' || !slides[cur] || !id) return;
  if(typeof _migrateSlideLineJoins === 'function') _migrateSlideLineJoins();
  const d = slides[cur].els.find(e => e && e.id === id && e.shape === 'line');
  if(d && d.lineJoin && typeof _clearLineJoin === 'function'){
    ['a', 'b'].forEach(w => {
      if(d.lineJoin[w]) _clearLineJoin(d, w);
    });
  }
  const juncs = slides[cur].lineJunctions;
  if(!juncs) return;
  Object.keys(juncs).forEach(jid => {
    const before = (juncs[jid] || []).length;
    juncs[jid] = (juncs[jid] || []).filter(m => m.id !== id);
    if(juncs[jid].length === before) return;
    if(juncs[jid].length < 2){
      juncs[jid].forEach(m => {
        const md = slides[cur].els.find(e => e && e.id === m.id && e.shape === 'line');
        if(md && md.lineJoin && md.lineJoin[m.end] === jid){
          md.lineJoin[m.end] = null;
          const oel = document.getElementById('canvas') && document.getElementById('canvas').querySelector('.el[data-id="'+m.id+'"]');
          if(oel && typeof _persistLineJoinDom === 'function') _persistLineJoinDom(oel, md);
        }
      });
      delete juncs[jid];
    }
  });
  // Scrub legacy pairwise refs still pointing at this id
  slides[cur].els.forEach(elD => {
    if(!elD || elD.shape !== 'line' || !elD.lineJoin) return;
    ['a', 'b'].forEach(w => {
      const link = elD.lineJoin[w];
      if(link && typeof link === 'object' && link.id === id) elD.lineJoin[w] = null;
    });
  });
}
window._clearAllJoinsToId = _clearAllJoinsToId;

function deleteSelected(){
  if(multiSel.size>1){
    if(typeof pushUndo==="function")pushUndo();
    multiSel.forEach(domEl=>{
      const s=slides[cur];if(!s)return;
      // Keep linked structure/graph when deleting a formula — only unlink
      if(domEl.dataset.type==='formula'){
        if(typeof _unlinkLinkedGraphs==='function') _unlinkLinkedGraphs(domEl.dataset.id);
        else if(typeof _deleteLinkedGraphs==='function') _deleteLinkedGraphs(domEl.dataset.id);
      }
      if(domEl.dataset.shape==='line'&&typeof _clearAllJoinsToId==='function') _clearAllJoinsToId(domEl.dataset.id);
      const idx2=s.els.findIndex(x=>x.id===domEl.dataset.id);
      if(typeof _hfOnDelete==='function'){ const _d=s.els[idx2]; if(_d)_hfOnDelete(_d); }
      if(idx2>=0)s.els.splice(idx2,1);
      domEl.remove();
    });
    clearMultiSel();sel=null;
    if(typeof hasSelectedInk==='function'&&hasSelectedInk()&&typeof deleteSelectedInk==='function') deleteSelectedInk();
    save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();syncProps();
    if(typeof renderAnimPanel==="function")renderAnimPanel();
    if(typeof renderMotionOverlay==="function")renderMotionOverlay();
    if(typeof toast==="function")toast('Deleted elements','ok');
    _rotEl=null;
    if(typeof window._clearInkRotChrome==='function') window._clearInkRotChrome();
    if(typeof window._clearGroupDocRotation==='function') window._clearGroupDocRotation();
    const _ov2=document.getElementById('handles-overlay');if(_ov2)_ov2.innerHTML='';document.querySelectorAll('.arc-handle,.star-handle,.para-handle,.chev-handle,.moon-handle,.trap-handle').forEach(h=>h.remove());
    if(typeof _updateHandlesOverlay==='function') try{ _updateHandlesOverlay(); }catch(e){}
  } else if(sel){
    const s=slides[cur];if(!s)return;
    if(typeof pushUndo==="function")pushUndo();
    const idx2=s.els.findIndex(x=>x.id===sel.dataset.id);
    // If deleting a formula, keep linked structure/graph — only unlink
    if(sel.dataset.type==='formula' && typeof _unlinkLinkedGraphs==='function'){
      _unlinkLinkedGraphs(sel.dataset.id);
    } else if(sel.dataset.type==='formula' && typeof _deleteLinkedGraphs==='function'){
      _deleteLinkedGraphs(sel.dataset.id);
    }
    if(sel.dataset.shape==='line'&&typeof _clearAllJoinsToId==='function') _clearAllJoinsToId(sel.dataset.id);
    // htmlframe: delete linked code; code: unlink parent
    if(typeof _hfOnDelete==='function'){ const _d=s.els[idx2]; if(_d)_hfOnDelete(_d); }
    if(idx2>=0)s.els.splice(idx2,1);
    sel.remove();
    pick(null);
    _rotEl=null;
    if(typeof hasSelectedInk==='function'&&hasSelectedInk()&&typeof deleteSelectedInk==='function') deleteSelectedInk();
    if(typeof window._clearInkRotChrome==='function') window._clearInkRotChrome();
    if(typeof window._clearGroupDocRotation==='function') window._clearGroupDocRotation();
    const _ov1=document.getElementById('handles-overlay');if(_ov1)_ov1.innerHTML='';
    if(typeof _updateHandlesOverlay==='function') try{ _updateHandlesOverlay(); }catch(e){}
    save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();
    if(typeof renderAnimPanel==="function")renderAnimPanel();
    if(typeof renderMotionOverlay==="function")renderMotionOverlay();
  } else if(typeof hasSelectedInk==='function'&&hasSelectedInk()&&typeof deleteSelectedInk==='function'){
    deleteSelectedInk();
  }
}

