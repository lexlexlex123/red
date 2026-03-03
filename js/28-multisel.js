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

  cv.addEventListener('mousedown',e=>{
    // Only on canvas background (not element)
    if(e.target!==cv)return;
    if(e.button!==0)return;
    clearMultiSel();if(sel){sel.classList.remove('sel');sel=null;syncProps();}
    const rect=cv.getBoundingClientRect();
    rbStart={x:e.clientX-rect.left,y:e.clientY-rect.top};
    const rb=document.getElementById('rubberband');
    rb.style.cssText=`display:block;left:${rbStart.x}px;top:${rbStart.y}px;width:0;height:0;`;
    e.preventDefault();
  });

  document.addEventListener('mousemove',e=>{
    if(!rbStart)return;
    const cv2=document.getElementById('canvas');
    const rect=cv2.getBoundingClientRect();
    const mx=e.clientX-rect.left,my=e.clientY-rect.top;
    const x=Math.min(mx,rbStart.x),y=Math.min(my,rbStart.y);
    const w=Math.abs(mx-rbStart.x),h=Math.abs(my-rbStart.y);
    const rb=document.getElementById('rubberband');
    rb.style.left=x+'px';rb.style.top=y+'px';rb.style.width=w+'px';rb.style.height=h+'px';
  });

  document.addEventListener('mouseup',e=>{
    if(!rbStart)return;
    const cv2=document.getElementById('canvas');
    const rect=cv2.getBoundingClientRect();
    const mx=e.clientX-rect.left,my=e.clientY-rect.top;
    const rx=Math.min(mx,rbStart.x),ry=Math.min(my,rbStart.y);
    const rw=Math.abs(mx-rbStart.x),rh=Math.abs(my-rbStart.y);
    rbStart=null;
    document.getElementById('rubberband').style.display='none';
    if(rw<4&&rh<4)return; // too small - just a click
    // Find all elements intersecting the rubber-band rect
    cv2.querySelectorAll('.el').forEach(el=>{
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
      toast(multiSel.size+' elements selected — Ctrl+C to copy, Del to delete','ok');
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
  if(!elsToCopy.length)return toast('Nothing selected');
  clipboard=elsToCopy;
  toast('Copied '+elsToCopy.length+' element'+(elsToCopy.length>1?'s':''),'ok');
}

function pasteSelected(){
  if(!clipboard.length)return toast('Nothing to paste');
  if(!slides[cur])return;
  pushUndo();
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
  save();drawThumbs();saveState();
  if(multiSel.size===1){const only=[...multiSel][0];clearMultiSel();pick(only);}
  else if(multiSel.size>1){pick([...multiSel].slice(-1)[0]);toast('Pasted '+multiSel.size+' elements','ok');}
}

function deleteSelected(){
  if(multiSel.size>1){
    pushUndo();
    multiSel.forEach(domEl=>{
      const s=slides[cur];if(!s)return;
      const idx2=s.els.findIndex(x=>x.id===domEl.dataset.id);
      if(idx2>=0)s.els.splice(idx2,1);
      domEl.remove();
    });
    clearMultiSel();sel=null;save();drawThumbs();saveState();syncProps();
    toast('Deleted elements','ok');
  } else if(sel){
    const s=slides[cur];if(!s)return;
    pushUndo();
    const idx2=s.els.findIndex(x=>x.id===sel.dataset.id);
    if(idx2>=0)s.els.splice(idx2,1);
    sel.remove();sel=null;save();drawThumbs();saveState();syncProps();
  }
}

boot();
