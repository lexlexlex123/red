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
    // If clicked on an element — skip
    if(e.target.closest('.el'))return;
    // Must be inside cwrap area
    if(!e.target.closest('#cwrap'))return;
    if(typeof stopTextEditing==='function')stopTextEditing();
    const wasMulti = multiSel.size > 1;
    _justClearedMulti = wasMulti;
    clearMultiSel();
    if(sel){sel.classList.remove('sel');sel=null;}
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

  document.addEventListener('mousemove',e=>{
    if(!rbStart)return;
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
    cv.querySelectorAll('.el').forEach(el=>{
      const ex=parseInt(el.style.left),ey=parseInt(el.style.top);
      const ew=parseInt(el.style.width),eh=parseInt(el.style.height);
      if(ex<rx+rw&&ex+ew>rx&&ey<ry+rh&&ey+eh>ry){
        addToMultiSel(el);
      }
    });
    if(multiSel.size===1){
      const onlyEl=[...multiSel][0];clearMultiSel();pick(onlyEl);
    } else if(multiSel.size>1){
      pick([...multiSel].slice(-1)[0]);
      if(typeof toast==="function")toast(multiSel.size+(getLang()==='ru'?' эл. выбрано — Ctrl+C копировать':' elements — Ctrl+C copy, Del delete'),'ok');
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
  if(typeof toast==="function")toast((getLang()==='ru'?'Скопировано: ':'Copied: ')+elsToCopy.length+(getLang()==='ru'?' эл.':' el.'),'ok');
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
  else if(multiSel.size>1){pick([...multiSel].slice(-1)[0]);if(typeof toast==="function")toast((getLang()==='ru'?'Вставлено: ':'Pasted: ')+multiSel.size+(getLang()==='ru'?' эл.':' el.'),'ok');}
}

function deleteSelected(){
  if(multiSel.size>1){
    if(typeof pushUndo==="function")pushUndo();
    multiSel.forEach(domEl=>{
      const s=slides[cur];if(!s)return;
      const idx2=s.els.findIndex(x=>x.id===domEl.dataset.id);
      if(idx2>=0)s.els.splice(idx2,1);
      domEl.remove();
    });
    clearMultiSel();sel=null;save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();syncProps();
    if(typeof renderAnimPanel==="function")renderAnimPanel();
    if(typeof renderMotionOverlay==="function")renderMotionOverlay();
    if(typeof toast==="function")toast('Deleted elements','ok');
  } else if(sel){
    const s=slides[cur];if(!s)return;
    if(typeof pushUndo==="function")pushUndo();
    const idx2=s.els.findIndex(x=>x.id===sel.dataset.id);
    if(idx2>=0)s.els.splice(idx2,1);
    sel.remove();sel=null;save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();syncProps();
    if(typeof renderAnimPanel==="function")renderAnimPanel();
    if(typeof renderMotionOverlay==="function")renderMotionOverlay();
  }
}

