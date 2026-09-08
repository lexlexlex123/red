// ══════════════ ALIGN ══════════════
function layerEl(dir){
  // Ink selection has no `sel` — route toolbar / context layer buttons here
  if(typeof hasSelectedInk==='function'&&hasSelectedInk()){
    if(typeof layerSelectedInk==='function') layerSelectedInk(dir);
    if(!sel || (sel.dataset&&sel.dataset.type==='inkhost')) return;
  }
  if(!sel){toast('Select an element first');return;}
  const cv=document.getElementById('canvas');
  const els=Array.from(cv.querySelectorAll(':scope > .el'));
  const i=els.indexOf(sel);
  console.log('[layer] dir='+dir+' sel='+!!sel+' i='+i+' total='+els.length+' type='+(sel&&sel.dataset.type));
  if(i<0){console.warn('[layer] sel not found in canvas children');return;}
  pushUndo();
  // Декоры всегда на заднем плане — не уходим за них
  const decors = els.filter(e=>e.classList.contains('decor-el'));
  const nonDecors = els.filter(e=>!e.classList.contains('decor-el'));
  const firstNonDecor = nonDecors[0] || els[0];

  if(dir==='front') cv.appendChild(sel);
  else if(dir==='back'){
    // Вставляем перед первым НЕ-декором (декоры остаются позади)
    if(firstNonDecor && firstNonDecor !== sel) cv.insertBefore(sel, firstNonDecor);
    else if(nonDecors.length > 1) cv.insertBefore(sel, nonDecors[0]);
  }
  else if(dir==='up' && i < els.length-1) cv.insertBefore(els[i+1], sel);
  else if(dir==='down' && i > 0){
    const prev = els[i-1];
    // Не уходим за декоры
    if(!prev.classList.contains('decor-el')) cv.insertBefore(sel, prev);
  }
  save();drawThumbs();saveState();
}
function setAlignScope(s){
  _alignScope=s;
  try{ window._alignScope=s; }catch(e){}
  const bs=document.getElementById('align-scope-sel');
  const bsl=document.getElementById('align-scope-slide');
  if(bs)bs.classList.toggle('active',s==='sel');
  if(bsl)bsl.classList.toggle('active',s==='slide');
}
// Expose for inline onclick handlers (let is not always visible there)
try{ window._alignScope = (typeof _alignScope!=='undefined') ? _alignScope : 'sel'; }catch(e){ window._alignScope='sel'; }

function _alignGetRotBB(el){
  const l=parseFloat(el.style.left)||0, tp=parseFloat(el.style.top)||0;
  const w=parseFloat(el.style.width)||0, h=parseFloat(el.style.height)||0;
  const rot=(parseFloat(el.dataset.rot)||0)*Math.PI/180;
  if(!rot) return {l,t:tp,r:l+w,b:tp+h,cx:l+w/2,cy:tp+h/2};
  const cx=l+w/2, cy=tp+h/2;
  const cos=Math.cos(rot), sin=Math.sin(rot);
  const corners=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([dx,dy])=>({
    x:cx+dx*cos-dy*sin, y:cy+dx*sin+dy*cos
  }));
  const xs=corners.map(c=>c.x), ys=corners.map(c=>c.y);
  return {l:Math.min(...xs),t:Math.min(...ys),r:Math.max(...xs),b:Math.max(...ys),cx,cy};
}

function _alignUnionBB(members){
  const bb={l:Infinity,t:Infinity,r:-Infinity,b:-Infinity};
  members.forEach(el=>{
    const rb=_alignGetRotBB(el);
    bb.l=Math.min(bb.l,rb.l); bb.t=Math.min(bb.t,rb.t);
    bb.r=Math.max(bb.r,rb.r); bb.b=Math.max(bb.b,rb.b);
  });
  bb.cx=(bb.l+bb.r)/2; bb.cy=(bb.t+bb.b)/2;
  bb.w=bb.r-bb.l; bb.h=bb.b-bb.t;
  return bb;
}

/** Any group member in selection → include all members of that group. */
function _alignExpandGroups(targets){
  const cvEl=document.getElementById('canvas');
  if(!cvEl) return targets;
  const seen=new Set(), out=[], expandedGids=new Set();
  targets.forEach(el=>{
    const gid=el.dataset&&el.dataset.groupId;
    if(gid){
      if(expandedGids.has(gid)) return;
      expandedGids.add(gid);
      Array.from(cvEl.querySelectorAll('.el[data-group-id="'+gid+'"]')).forEach(ge=>{
        if(!seen.has(ge)){ seen.add(ge); out.push(ge); }
      });
    }else if(!seen.has(el)){
      seen.add(el); out.push(el);
    }
  });
  return out;
}

/** Groups move as one unit; ungrouped elements are single-unit. */
function _alignPartitionUnits(targets){
  const byGroup=new Map(), units=[];
  targets.forEach(el=>{
    const gid=el.dataset&&el.dataset.groupId;
    if(gid){
      if(!byGroup.has(gid)) byGroup.set(gid,[]);
      byGroup.get(gid).push(el);
    }else{
      const rb=_alignGetRotBB(el);
      units.push({members:[el], bb:{l:rb.l,t:rb.t,r:rb.r,b:rb.b,cx:rb.cx,cy:rb.cy,w:rb.r-rb.l,h:rb.b-rb.t}});
    }
  });
  byGroup.forEach(members=>{
    const rb=members.length>1?_alignUnionBB(members):_alignGetRotBB(members[0]);
    units.push({members, bb:{l:rb.l,t:rb.t,r:rb.r,b:rb.b,cx:rb.cx,cy:rb.cy,w:rb.r-rb.l,h:rb.b-rb.t}});
  });
  return units;
}

function _alignApplyDelta(el,dx,dy){
  if(dx) el.style.left=(Math.round((parseFloat(el.style.left)||0)+dx))+'px';
  if(dy) el.style.top=(Math.round((parseFloat(el.style.top)||0)+dy))+'px';
}

function _alignDeltaForUnit(t,ub,refL,refT,refR,refB,refMX,refMY){
  let dx=0, dy=0;
  if(t==='left')          dx=refL-ub.l;
  else if(t==='right')    dx=refR-ub.r;
  else if(t==='top')      dy=refT-ub.t;
  else if(t==='bottom')   dy=refB-ub.b;
  else if(t==='centerH')  dx=refMX-ub.cx;
  else if(t==='centerV')  dy=refMY-ub.cy;
  else if(t==='center'){  dx=refMX-ub.cx; dy=refMY-ub.cy; }
  return {dx,dy};
}

function alignEl(t,scope){
  // If selected element is part of a group — align the whole group as one unit
  let targets=multiSel.size>1?[...multiSel]:(sel?[sel]:[]);
  targets=targets.filter(el=>el&&!(el.dataset&&el.dataset.type==='inkhost')&&!el.classList.contains('decor-el'));
  const hasInk=typeof hasSelectedInk==='function'&&hasSelectedInk();
  if(!targets.length){
    if(hasInk&&typeof alignSelectedInk==='function') alignSelectedInk(t, scope);
    return;
  }
  targets=_alignExpandGroups(targets);
  // Resolve scope: inline onclick may pass undefined if let-binding isn't visible
  if(scope!=='slide' && scope!=='sel'){
    scope = (typeof _alignScope!=='undefined' && _alignScope==='slide') ? 'slide' : 'sel';
  }
  const units=_alignPartitionUnits(targets);
  // Center vs selection with a single object is a no-op — fall back to slide
  if((t==='centerH'||t==='centerV'||t==='center') && scope==='sel' && units.length<2 && !hasInk){
    scope='slide';
  }
  pushUndo();

  // Bounding box of the selection (visual, rotation-aware) + selected ink
  const bb={l:Infinity,t:Infinity,r:-Infinity,b:-Infinity};
  targets.forEach(el=>{const rb=_alignGetRotBB(el);bb.l=Math.min(bb.l,rb.l);bb.t=Math.min(bb.t,rb.t);bb.r=Math.max(bb.r,rb.r);bb.b=Math.max(bb.b,rb.b);});
  if(hasInk&&typeof getSelectedInkItems==='function'){
    try{
      const pack=getSelectedInkItems();
      const inkList=[].concat(pack&&pack.strokes||[], pack&&pack.fills||[]);
      if(typeof inkBBoxForIds==='function'){
        const ids=inkList.map(it=>it&&it.id).filter(Boolean);
        const ib=inkBBoxForIds(ids);
        if(ib){ bb.l=Math.min(bb.l,ib.x); bb.t=Math.min(bb.t,ib.y); bb.r=Math.max(bb.r,ib.x+ib.w); bb.b=Math.max(bb.b,ib.y+ib.h); }
      }
    }catch(e){}
  }

  // Reference bounds:
  // 'slide' → slide edges / center
  // 'sel'   → selection bounding box (each element aligns to that box)
  const W = (typeof canvasW==='number' && canvasW>0) ? canvasW : 1200;
  const H = (typeof canvasH==='number' && canvasH>0) ? canvasH : 675;
  const refL = scope==='slide' ? 0 : bb.l;
  const refT = scope==='slide' ? 0 : bb.t;
  const refR = scope==='slide' ? W : bb.r;
  const refB = scope==='slide' ? H : bb.b;
  const refMX=(refL+refR)/2, refMY=(refT+refB)/2;

  units.forEach(unit=>{
    const {dx,dy}=_alignDeltaForUnit(t,unit.bb,refL,refT,refR,refB,refMX,refMY);
    unit.members.forEach(el=>_alignApplyDelta(el,dx,dy));
  });
  if(hasInk&&typeof alignSelectedInkToRefs==='function'){
    alignSelectedInkToRefs(t, refL, refT, refR, refB);
  }
  syncPos();
  if(typeof _updateHandlesOverlay==='function')_updateHandlesOverlay();
  if(typeof _updateSelFrames==='function')_updateSelFrames();
  save();drawThumbs();saveState();
}

function distributeEls(axis,scope){
  let targets=multiSel.size>1?[...multiSel]:(sel?[sel]:[]);
  targets=targets.filter(el=>el&&!(el.dataset&&el.dataset.type==='inkhost')&&!el.classList.contains('decor-el'));
  const hasInk=typeof hasSelectedInk==='function'&&hasSelectedInk();
  if(!targets.length){
    if(hasInk&&typeof distributeSelectedInk==='function'){
      distributeSelectedInk(axis);
      return;
    }
    return toast('Select 2+ elements to distribute');
  }
  targets=_alignExpandGroups(targets);
  const units=_alignPartitionUnits(targets);
  if(units.length<2 && !hasInk) return toast('Select 2+ elements to distribute');
  if(units.length<2 && hasInk){
    // Only one object + ink — distribute ink alone if enough strokes
    if(typeof distributeSelectedInk==='function') distributeSelectedInk(axis);
    return;
  }
  pushUndo();
  const W=(typeof canvasW==='number'&&canvasW>0)?canvasW:1200;
  const H=(typeof canvasH==='number'&&canvasH>0)?canvasH:675;
  if(axis==='h'){
    const sorted=[...units].sort((a,b)=>a.bb.l-b.bb.l);
    let minX,maxX;
    if(scope==='slide'){minX=0;maxX=W;}
    else{minX=sorted[0].bb.l;maxX=sorted[sorted.length-1].bb.r;}
    const totalW=sorted.reduce((s,u)=>s+u.bb.w,0);
    const gap=(maxX-minX-totalW)/(sorted.length-1);
    let x=minX;
    sorted.forEach(u=>{
      const dx=x-u.bb.l;
      u.members.forEach(el=>_alignApplyDelta(el,dx,0));
      x+=u.bb.w+gap;
    });
  } else {
    const sorted=[...units].sort((a,b)=>a.bb.t-b.bb.t);
    let minY,maxY;
    if(scope==='slide'){minY=0;maxY=H;}
    else{minY=sorted[0].bb.t;maxY=sorted[sorted.length-1].bb.b;}
    const totalH=sorted.reduce((s,u)=>s+u.bb.h,0);
    const gap=(maxY-minY-totalH)/(sorted.length-1);
    let y=minY;
    sorted.forEach(u=>{
      const dy=y-u.bb.t;
      u.members.forEach(el=>_alignApplyDelta(el,0,dy));
      y+=u.bb.h+gap;
    });
  }
  syncPos();
  if(typeof _updateHandlesOverlay==='function')_updateHandlesOverlay();
  save();drawThumbs();saveState();
}
