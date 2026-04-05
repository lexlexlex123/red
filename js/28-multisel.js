// ══════════════ MULTI-SELECT & RUBBER-BAND ══════════════
function clearMultiSel(){
  multiSel.forEach(el=>el.classList.remove('multi-sel'));
  multiSel.clear();
  updateMultiBar();
}
function addToMultiSel(el){
  if(el.classList.contains('decor-el'))return; // never select decor
  multiSel.add(el);el.classList.add('multi-sel');
  updateMultiBar();
}
function removeFromMultiSel(el){
  multiSel.delete(el);el.classList.remove('multi-sel');
  updateMultiBar();
}
function updateMultiBar(){
  // Show count in a toast-like way if >1 selected
  if(multiSel.size>1){
    const ids=Array.from(multiSel).map(el=>el.dataset.id);
    // ensure primary sel is also in multiSel
  }
}

// Multi-select aware pick
function pickMulti(el,shiftKey){
  if(el&&el.classList.contains('decor-el'))return; // never select decor
  // Pipette mode: clicking an element copies its style to pipetteSrc
  if(pipetteMode){
    pipetteApply(el);
    return;
  }
  if(shiftKey){
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

  // Helper: mouse event → canvas-space coords (accounts for zoom)
  function toCanvasCoords(e){
    const z=typeof _canvasZoom==='number'?_canvasZoom:1;
    const rect=cv.getBoundingClientRect();
    // getBoundingClientRect already gives scaled rect, divide by zoom to get canvas-space
    return {
      x:(e.clientX-rect.left)/z,
      y:(e.clientY-rect.top)/z
    };
  }

  // Start rubber-band on canvas background OR on cwrap (outside canvas)
  function onDown(e){
    if(e.button!==0)return;
    if(window._anyDragging)return;
    if(typeof _rotDragging!=='undefined'&&_rotDragging)return;
    // If clicked near a rotation corner — skip (let rotation handler take over)
    if(typeof _rotEl!=='undefined'&&_rotEl&&typeof _nearCorner==='function'){
      const pt=toCanvasCoords(e);
      if(_nearCorner(_rotEl,pt.x,pt.y))return;
    }
    // If clicked on an element or resize handle — skip
    if(e.target.closest('.el'))return;
    if(e.target.closest('.rh'))return;
    // In curve edit mode — rubber-band still works but only for node selection
    if(e.target.closest('#conn-handles'))return;
    if(e.target.closest('#conn-svg-layer'))return;
    if(e.target.closest('#handles-overlay'))return;
    // Must be inside cwrap area
    if(!e.target.closest('#cwrap'))return;
    // Magnetic selection: if near an element within 40px, pick it and skip rubber-band
    if(e.target.closest('#canvas')||e.target.closest('#canvas-bg-rect')||e.target.closest('#lego-layer')){
      const SNAP_R = 40;
      const pt2 = toCanvasCoords(e);
      const allEls = Array.from(cv.querySelectorAll('.el:not(.decor-el)'));
      let bestEl = null, bestD2 = SNAP_R;
      allEls.forEach(el => {
        const l=parseInt(el.style.left)||0, t2=parseInt(el.style.top)||0;
        const w=parseInt(el.style.width)||0, h=parseInt(el.style.height)||0;
        const cx2 = Math.max(l, Math.min(pt2.x, l+w));
        const cy2 = Math.max(t2, Math.min(pt2.y, t2+h));
        const d2 = Math.hypot(pt2.x-cx2, pt2.y-cy2);
        if(d2 < bestD2){ bestD2 = d2; bestEl = el; }
      });
      if(bestEl){
        if(e.shiftKey && typeof pickMulti==='function') pickMulti(bestEl, true);
        else if(typeof pick==='function') pick(bestEl);
        return;
      }
    }
    if(typeof stopTextEditing==='function')stopTextEditing();
    // In curve edit mode: clicking background starts node rubber-band, don't deselect
    if(window._curveEditMode) {
      const pt0=toCanvasCoords(e);
      rbStart={x:pt0.x,y:pt0.y};
      const rb=document.getElementById('rubberband');
      rb.style.cssText=`display:block;left:${pt0.x}px;top:${pt0.y}px;width:0;height:0;`;
      e.preventDefault();
      return;
    }
    const wasMulti = multiSel.size > 1;
    _justClearedMulti = wasMulti;
    clearMultiSel();
    if(sel&&!(typeof _rotDragging!=='undefined'&&_rotDragging)&&!window._curveEditMode){if(typeof pick==='function')pick(null);else{sel.classList.remove('sel');sel=null;}}
    // If clicking outside canvas (on cwrap bg) always show slide props regardless
    const onCanvas = e.target.closest('#canvas') || e.target.closest('#canvas-bg-rect');
    if(!wasMulti || !onCanvas) _justClearedMulti = false;
    syncProps();
    _justClearedMulti = false;
    const pt=toCanvasCoords(e);
    rbStart={x:pt.x,y:pt.y};
    const rb=document.getElementById('rubberband');
    rb.style.cssText=`display:block;left:${pt.x}px;top:${pt.y}px;width:0;height:0;`;
    e.preventDefault();
  }

  // Remove old canvas-only listener, attach to document for cwrap-wide start
  cc.addEventListener('mousedown',onDown);
  cwrap.addEventListener('mousedown',onDown);

  // Снимаем выделение ТОЛЬКО при клике по слайду (#canvas, #cvbg) или холсту (#cwrap вне слайда).
  // Все панели, тулбары, сайдбар — НЕ снимают выделение.
  document.addEventListener('mousedown', function(e) {
    if(e.button!==0) return;
    if(window._anyDragging) return;
    // Разрешаем клики по любым UI-панелям — выделение не снимаем
    if(e.target.closest('#ribbon')) return;
    if(e.target.closest('#props')) return;
    if(e.target.closest('#ctoolbar')) return;
    if(e.target.closest('#sidebar')) return;
    if(e.target.closest('.modal-ov')) return;
    if(e.target.closest('.modal')) return;
    if(e.target.closest('#anim-panel')) return;
    // cwrap: onDown уже ставит sel=null — чистим overlay после тика
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
    if(typeof _rotDragging!=='undefined'&&_rotDragging){rbStart=null;document.getElementById('rubberband').style.display='none';return;}
    const z=typeof _canvasZoom==='number'?_canvasZoom:1;
    const rect=cv.getBoundingClientRect();
    // Clamp to canvas bounds in canvas-space
    const mx=(e.clientX-rect.left)/z;
    const my=(e.clientY-rect.top)/z;
    const x=Math.min(mx,rbStart.x),y=Math.min(my,rbStart.y);
    const w=Math.abs(mx-rbStart.x),h=Math.abs(my-rbStart.y);
    const rb=document.getElementById('rubberband');
    rb.style.left=x+'px';rb.style.top=y+'px';rb.style.width=w+'px';rb.style.height=h+'px';
  });

  document.addEventListener('mouseup',e=>{
    if(!rbStart)return;
    const z=typeof _canvasZoom==='number'?_canvasZoom:1;
    const rect=cv.getBoundingClientRect();
    const mx=(e.clientX-rect.left)/z;
    const my=(e.clientY-rect.top)/z;
    const rx=Math.min(mx,rbStart.x),ry=Math.min(my,rbStart.y);
    const rw=Math.abs(mx-rbStart.x),rh=Math.abs(my-rbStart.y);
    rbStart=null;
    document.getElementById('rubberband').style.display='none';
    if(rw<4&&rh<4)return;
    // In curve edit mode: select nodes within rect instead of elements
    if(window._curveEditMode && typeof sel!=='undefined' && sel && sel.dataset.shape==='curve') {
      if(typeof _curveRubberBandSelect==='function') _curveRubberBandSelect(rx,ry,rw,rh);
      return;
    }
    cv.querySelectorAll('.el').forEach(el=>{
      const ex=parseInt(el.style.left),ey=parseInt(el.style.top);
      const ew=parseInt(el.style.width),eh=parseInt(el.style.height);
      if(ex<rx+rw&&ex+ew>rx&&ey<ry+rh&&ey+eh>ry){
        addToMultiSel(el);
      }
    });
    // Expand selection: if any group member is selected, add ALL members of that group
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
      // Freeze the full selection before pick() can overwrite it
      const _frozenSel = [...multiSel];
      // Pick the last element for props panel, but without letting group patch clear multiSel
      const _lastEl = _frozenSel[_frozenSel.length-1];
      // Temporarily disable group-pick expansion by calling original pick via flag
      window._rbSelecting = true;
      if(typeof pick==='function') pick(_lastEl);
      window._rbSelecting = false;
      // Re-add all rubber-band selected elements (pick may have wiped them)
      _frozenSel.forEach(el => { if(!multiSel.has(el)) addToMultiSel(el); });
      if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
      if(typeof toast==="function")toast(multiSel.size+t('toastMultiSel'),'ok');
    }
  });

  // element shift-click is handled directly in mkEl's mousedown
})();

// ══════════════ GROUP COPY / PASTE ══════════════
function copySelected(){
  const elsToCopy=[];
  if(multiSel.size>1){
    multiSel.forEach(domEl=>{
      const d=slides[cur]&&slides[cur].els.find(x=>x.id===domEl.dataset.id);
      if(d)elsToCopy.push(JSON.parse(JSON.stringify(d)));
    });
  } else if(sel){
    const d=slides[cur]&&slides[cur].els.find(x=>x.id===sel.dataset.id);
    if(d)elsToCopy.push(JSON.parse(JSON.stringify(d)));
  }
  if(!elsToCopy.length)return (typeof toast==="function")&&toast(t('toastNothingSelected'));
  clipboard=elsToCopy;
  if(typeof toast==="function")toast(t('toastElementsCopied')+elsToCopy.length+t('toastElementsSuffix'),'ok');
}

function pasteSelected(){
  if(!clipboard.length)return (typeof toast==="function")&&toast(t('toastNothingToPaste'));
  if(!slides[cur])return;
  if(typeof pushUndo==="function")pushUndo();
  clearMultiSel();if(sel)sel.classList.remove('sel');sel=null;
  clipboard.forEach(d=>{
    const nd=JSON.parse(JSON.stringify(d)); // deep clone — preserves ALL settings
    nd.id='e'+(++ec);
    // No position offset — paste at exact same position (like PowerPoint)
    slides[cur].els.push(nd);
    mkEl(nd);
    const domEl=document.getElementById('canvas').querySelector('[data-id="'+nd.id+'"]');
    if(domEl)addToMultiSel(domEl);
  });
  save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();
  if(multiSel.size===1){const only=[...multiSel][0];clearMultiSel();pick(only);}
  else if(multiSel.size>1){pick([...multiSel].slice(-1)[0]);if(typeof toast==="function")toast(t('toastElementsPasted')+multiSel.size+t('toastElementsSuffix'),'ok');}
}

function deleteSelected(){
  if(multiSel.size>1){
    if(typeof pushUndo==="function")pushUndo();
    multiSel.forEach(domEl=>{
      const s=slides[cur];if(!s)return;
      const idx2=s.els.findIndex(x=>x.id===domEl.dataset.id);
      if(typeof _hfOnDelete==='function'){ const _d=s.els[idx2]; if(_d)_hfOnDelete(_d); }
      if(idx2>=0)s.els.splice(idx2,1);
      domEl.remove();
    });
    clearMultiSel();sel=null;save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();syncProps();
    if(typeof renderAnimPanel==="function")renderAnimPanel();
    if(typeof renderMotionOverlay==="function")renderMotionOverlay();
    if(typeof toast==="function")toast('Deleted elements','ok');
    _rotEl=null;const _ov2=document.getElementById('handles-overlay');if(_ov2)_ov2.innerHTML='';document.querySelectorAll('.arc-handle').forEach(h=>h.remove()); document.querySelectorAll('.star-handle').forEach(h=>h.remove()); document.querySelectorAll('.para-handle').forEach(h=>h.remove());
  } else if(sel){
    const s=slides[cur];if(!s)return;
    if(typeof pushUndo==="function")pushUndo();
    const idx2=s.els.findIndex(x=>x.id===sel.dataset.id);
    // If deleting a formula, also delete linked graphs
    if(sel.dataset.type==='formula' && typeof _deleteLinkedGraphs==='function'){
      _deleteLinkedGraphs(sel.dataset.id);
    }
    // htmlframe: delete linked code; code: unlink parent
    if(typeof _hfOnDelete==='function'){ const _d=s.els[idx2]; if(_d)_hfOnDelete(_d); }
    if(idx2>=0)s.els.splice(idx2,1);
    sel.remove();sel=null;_rotEl=null;const _ov=document.getElementById('handles-overlay');if(_ov)_ov.innerHTML='';document.querySelectorAll('.arc-handle,.star-handle,.para-handle').forEach(h=>h.remove());save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();syncProps();
    if(typeof renderAnimPanel==="function")renderAnimPanel();
    if(typeof renderMotionOverlay==="function")renderMotionOverlay();
    // Final cleanup — syncProps may have rebuilt handles
    document.querySelectorAll('.arc-handle,.star-handle,.para-handle').forEach(h=>h.remove());
  }
}

