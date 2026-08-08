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
    const l = parseInt(el.style.left)||0;
    const t = parseInt(el.style.top)||0;
    const w = parseInt(el.style.width)||0;
    const h = parseInt(el.style.height)||0;
    const rot = parseFloat(el.dataset.rot)||0;
    const frame = document.createElement('div');
    frame.className = 'sel-frame' + ((typeof multiSel!=='undefined' && multiSel.size>1 && multiSel.has(el)) ? ' multi' : '');
    frame.style.left = l + 'px';
    frame.style.top = t + 'px';
    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
    frame.style.transformOrigin = 'center center';
    frame.style.transform = rot ? ('rotate(' + rot + 'deg)') : 'none';
    if(el.dataset && el.dataset.appletId==='flip'){
      const rx=(typeof FLIP_RX==='number'?FLIP_RX:14)+'px';
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
    pipetteApply(el);
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
    if(t.closest('#handles-overlay [data-cls]')) return false;
    if(t.closest('#pivot-handle')) return false;
    if(t.closest('#_anim-picker-ov')) return false;
    if(t.closest('#motion-ghosts') || t.closest('#motion-svg') || t.closest('.motion-ghost') || t.closest('.motion-handle') || t.closest('[data-motion-ui]')) return false;
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
    if(typeof window._isPreviewActive==='function'&&window._isPreviewActive())return;
    if(window._anyDragging)return;
    if(window._pivotDragging || window._overPivotHandle)return;
    if(window._animPickerCtx)return;
    if(e.target&&e.target.closest&&e.target.closest('#_anim-picker-ov'))return;
    if(typeof _rotDragging!=='undefined'&&_rotDragging)return;
    if(window._resizeDragging)return;
    if(typeof _rotEl!=='undefined'&&_rotEl&&typeof _nearCorner==='function'){
      const pt=toCanvasCoords(e);
      if(_nearCorner(_rotEl,pt.x,pt.y))return;
    }
    if(!_isEmptyCanvasTarget(e.target))return;
    if(typeof stopTextEditing==='function')stopTextEditing();

    const onCanvas = !!(e.target.closest('#canvas') || e.target.closest('#canvas-bg-rect') ||
      e.target.closest('#lego-layer') || e.target.closest('#conn-svg-layer') ||
      e.target.closest('#sel-frames-layer') || e.target.closest('#handles-overlay') ||
      e.target.closest('#rubberband') || e.target.closest('.decor-el') ||
      e.target.closest('#cvbg') || e.target.closest('.cvbg-img-layer'));

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
    if(!wasMulti || !onCanvas) _justClearedMulti = false;
    syncProps();
    _justClearedMulti = false;
    const pt=toCanvasCoords(e);
    rbStart={x:pt.x,y:pt.y,shift:e.shiftKey,onCanvas:onCanvas};
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
    if(e.target.closest('#ctoolbar')) return;
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
    rbStart=null;
    const rb=document.getElementById('rubberband');
    if(rb) rb.style.display='none';
    if(rw<4&&rh<4){
      if(wasOnCanvas && !window._curveEditMode){
        const pt={x:mx,y:my};
        if(!magneticPickAt(pt, wasShift)){
          if(!wasShift && typeof desel==='function') desel();
          else if(!wasShift && typeof pick==='function') pick(null);
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
      const ex=parseInt(el.style.left),ey=parseInt(el.style.top);
      const ew=parseInt(el.style.width),eh=parseInt(el.style.height);
      if(ex<rx+rw&&ex+ew>rx&&ey<ry+rh&&ey+eh>ry){
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
    if(multiSel.size===1){
      const onlyEl=[...multiSel][0];clearMultiSel();pick(onlyEl);
    } else if(multiSel.size>1){
      window._explicitMultiSel=true;
      const _frozenSel = [...multiSel];
      const _lastEl = _frozenSel[_frozenSel.length-1];
      window._rbSelecting = true;
      if(typeof pick==='function') pick(_lastEl);
      window._rbSelecting = false;
      _frozenSel.forEach(el => { if(!multiSel.has(el)) addToMultiSel(el); });
      if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
      if(typeof toast==="function")toast(multiSel.size+t('toastMultiSel'),'ok');
    }
    if(typeof _updateSelFrames==='function') _updateSelFrames();
  });
})();

// ══════════════ GROUP COPY / PASTE ══════════════
function copySelected(){
  const ids = [];
  if(multiSel.size>1){
    multiSel.forEach(domEl=>{ if(domEl.dataset.id) ids.push(domEl.dataset.id); });
  } else if(sel){
    ids.push(sel.dataset.id);
  }
  const elsToCopy = _copyElementDataList(ids);
  if(!elsToCopy.length)return (typeof toast==="function")&&toast(t('toastNothingSelected'));
  clipboard=elsToCopy;
  if(typeof _xclipSaveElements==='function') _xclipSaveElements(elsToCopy);
  if(typeof window._markElementClipboardCopy==='function') window._markElementClipboardCopy();
  if(typeof toast==="function")toast(t('toastElementsCopied')+elsToCopy.length+t('toastElementsSuffix'),'ok');
}

function pasteSelected(){
  if(typeof window._isPreviewActive==='function'&&window._isPreviewActive())return;
  if(typeof _xclipHydrateElements==='function') _xclipHydrateElements();
  if(!clipboard.length)return (typeof toast==="function")&&toast(t('toastNothingToPaste'));
  if(!slides[cur])return;
  if(clipboard.length===1&&typeof urlFromElementData==='function'){
    const url=urlFromElementData(clipboard[0]);
    if(url&&typeof insertQRAppletAt==='function'){
      insertQRAppletAt(url, null, null);
      return;
    }
  }
  if(typeof pushUndo==="function")pushUndo();
  clearMultiSel();if(sel)sel.classList.remove('sel');sel=null;
  const clones = _cloneElementDataList(clipboard, { offset: 0 });
  clones.forEach(nd=>{
    slides[cur].els.push(nd);
    mkEl(nd);
    const domEl=document.getElementById('canvas').querySelector('[data-id="'+nd.id+'"]');
    if(domEl)addToMultiSel(domEl);
  });
  save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();
  if(typeof renderAnimPanel==='function')renderAnimPanel();
  if(typeof renderMotionOverlay==='function')renderMotionOverlay();
  if(multiSel.size===1){const only=[...multiSel][0];clearMultiSel();pick(only);}
  else if(multiSel.size>1){pick([...multiSel].slice(-1)[0]);if(typeof toast==="function")toast(t('toastElementsPasted')+multiSel.size+t('toastElementsSuffix'),'ok');}
}

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
      const idx2=s.els.findIndex(x=>x.id===domEl.dataset.id);
      if(typeof _hfOnDelete==='function'){ const _d=s.els[idx2]; if(_d)_hfOnDelete(_d); }
      if(idx2>=0)s.els.splice(idx2,1);
      domEl.remove();
    });
    clearMultiSel();sel=null;save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();syncProps();
    if(typeof renderAnimPanel==="function")renderAnimPanel();
    if(typeof renderMotionOverlay==="function")renderMotionOverlay();
    if(typeof toast==="function")toast('Deleted elements','ok');
    _rotEl=null;const _ov2=document.getElementById('handles-overlay');if(_ov2)_ov2.innerHTML='';document.querySelectorAll('.arc-handle,.star-handle,.para-handle,.chev-handle,.moon-handle,.trap-handle').forEach(h=>h.remove());
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
    // htmlframe: delete linked code; code: unlink parent
    if(typeof _hfOnDelete==='function'){ const _d=s.els[idx2]; if(_d)_hfOnDelete(_d); }
    if(idx2>=0)s.els.splice(idx2,1);
    sel.remove();
    pick(null);
    _rotEl=null;
    save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();
    if(typeof renderAnimPanel==="function")renderAnimPanel();
    if(typeof renderMotionOverlay==="function")renderMotionOverlay();
  }
}

