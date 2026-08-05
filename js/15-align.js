// ══════════════ ALIGN ══════════════
function layerEl(dir){
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

function alignEl(t,scope){
  // If selected element is part of a group — align the whole group as one unit
  let targets=multiSel.size>1?[...multiSel]:(sel?[sel]:[]);
  if(!targets.length)return;
  // Expand single group member to full group
  if(targets.length===1 && targets[0].dataset.groupId){
    const gid=targets[0].dataset.groupId;
    const cvEl=document.getElementById('canvas');
    const gEls=Array.from(cvEl.querySelectorAll('.el[data-group-id="'+gid+'"]'));
    if(gEls.length>1) targets=gEls;
  }
  // Resolve scope: inline onclick may pass undefined if let-binding isn't visible
  if(scope!=='slide' && scope!=='sel'){
    scope = (typeof _alignScope!=='undefined' && _alignScope==='slide') ? 'slide' : 'sel';
  }
  // Center vs selection with a single object is a no-op — fall back to slide
  if((t==='centerH'||t==='centerV'||t==='center') && scope==='sel' && targets.length<2){
    scope='slide';
  }
  pushUndo();

  // Helper: get rotated visual bounding box of an element
  function getRotBB(el){
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

  // Bounding box of the selection (visual, rotation-aware)
  const bb={l:Infinity,t:Infinity,r:-Infinity,b:-Infinity};
  targets.forEach(el=>{const rb=getRotBB(el);bb.l=Math.min(bb.l,rb.l);bb.t=Math.min(bb.t,rb.t);bb.r=Math.max(bb.r,rb.r);bb.b=Math.max(bb.b,rb.b);});

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

  // Per-element alignment (PowerPoint-style): edges AND centers
  targets.forEach(el=>{
    const rb = getRotBB(el);
    let edx=0, edy=0;
    if(t==='left')          edx = refL - rb.l;
    else if(t==='right')    edx = refR - rb.r;
    else if(t==='top')      edy = refT - rb.t;
    else if(t==='bottom')   edy = refB - rb.b;
    else if(t==='centerH')  edx = refMX - rb.cx;
    else if(t==='centerV')  edy = refMY - rb.cy;
    else if(t==='center'){  edx = refMX - rb.cx; edy = refMY - rb.cy; }
    if(edx!==0) el.style.left=(Math.round((parseFloat(el.style.left)||0)+edx))+'px';
    if(edy!==0) el.style.top=(Math.round((parseFloat(el.style.top)||0)+edy))+'px';
  });
  syncPos();
  if(typeof _updateHandlesOverlay==='function')_updateHandlesOverlay();
  if(typeof _updateSelFrames==='function')_updateSelFrames();
  save();drawThumbs();saveState();
}

function distributeEls(axis,scope){
  let targets=multiSel.size>1?[...multiSel]:(sel?[sel]:[]);
  if(targets.length<2)return toast('Select 2+ elements to distribute');
  pushUndo();
  if(axis==='h'){
    const sorted=[...targets].sort((a,b)=>parseInt(a.style.left)-parseInt(b.style.left));
    let minX,maxX;
    if(scope==='slide'){minX=0;maxX=canvasW;}
    else{minX=parseInt(sorted[0].style.left);maxX=parseInt(sorted[sorted.length-1].style.left)+parseInt(sorted[sorted.length-1].style.width);}
    const totalW=sorted.reduce((s,el)=>s+parseInt(el.style.width),0);
    const gap=(maxX-minX-totalW)/(sorted.length-1);
    let x=minX;
    sorted.forEach(el=>{el.style.left=Math.round(x)+'px';x+=parseInt(el.style.width)+gap;});
  } else {
    const sorted=[...targets].sort((a,b)=>parseInt(a.style.top)-parseInt(b.style.top));
    let minY,maxY;
    if(scope==='slide'){minY=0;maxY=canvasH;}
    else{minY=parseInt(sorted[0].style.top);maxY=parseInt(sorted[sorted.length-1].style.top)+parseInt(sorted[sorted.length-1].style.height);}
    const totalH=sorted.reduce((s,el)=>s+parseInt(el.style.height),0);
    const gap=(maxY-minY-totalH)/(sorted.length-1);
    let y=minY;
    sorted.forEach(el=>{el.style.top=Math.round(y)+'px';y+=parseInt(el.style.height)+gap;});
  }
  syncPos();
  if(typeof _updateHandlesOverlay==='function')_updateHandlesOverlay();
  save();drawThumbs();saveState();
}
