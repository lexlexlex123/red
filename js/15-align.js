// ══════════════ ALIGN ══════════════
function layerEl(dir){
  if(!sel){toast('Select an element first');return;}
  const cv=document.getElementById('canvas');
  const els=Array.from(cv.querySelectorAll(':scope > .el'));
  const i=els.indexOf(sel);
  console.log('[layer] dir='+dir+' sel='+!!sel+' i='+i+' total='+els.length+' type='+(sel&&sel.dataset.type));
  if(i<0){console.warn('[layer] sel not found in canvas children');return;}
  pushUndo();
  if(dir==='front')cv.appendChild(sel);
  else if(dir==='back')cv.insertBefore(sel,els[0]);
  else if(dir==='up'&&i<els.length-1)cv.insertBefore(els[i+1],sel);
  else if(dir==='down'&&i>0)cv.insertBefore(sel,els[i-1]);
  save();drawThumbs();saveState();
}
function setAlignScope(s){
  _alignScope=s;
  const bs=document.getElementById('align-scope-sel');
  const bsl=document.getElementById('align-scope-slide');
  if(bs)bs.classList.toggle('active',s==='sel');
  if(bsl)bsl.classList.toggle('active',s==='slide');
}

function alignEl(t,scope){
  const targets=multiSel.size>1?[...multiSel]:(sel?[sel]:[]);
  if(!targets.length)return;
  pushUndo();
  // Bounding box of the selection
  const bb={l:Infinity,t:Infinity,r:-Infinity,b:-Infinity};
  targets.forEach(el=>{const l=parseInt(el.style.left),tp=parseInt(el.style.top),w=parseInt(el.style.width),h=parseInt(el.style.height);bb.l=Math.min(bb.l,l);bb.t=Math.min(bb.t,tp);bb.r=Math.max(bb.r,l+w);bb.b=Math.max(bb.b,tp+h);});
  // For 1 element OR explicit 'slide' scope → align to slide
  const toSlide=(targets.length===1||scope==='slide');
  const refL=toSlide?0:bb.l, refT=toSlide?0:bb.t;
  const refR=toSlide?canvasW:bb.r, refB=toSlide?canvasH:bb.b;
  const refMX=(refL+refR)/2, refMY=(refT+refB)/2;
  targets.forEach(el=>{
    const w=parseInt(el.style.width),h=parseInt(el.style.height);
    if(t==='left')el.style.left=refL+'px';
    else if(t==='right')el.style.left=(refR-w)+'px';
    else if(t==='top')el.style.top=refT+'px';
    else if(t==='bottom')el.style.top=(refB-h)+'px';
    else if(t==='centerH')el.style.left=snapV(refMX-w/2)+'px';
    else if(t==='centerV')el.style.top=snapV(refMY-h/2)+'px';
    else if(t==='center'){el.style.left=snapV(refMX-w/2)+'px';el.style.top=snapV(refMY-h/2)+'px';}
  });
  syncPos();save();drawThumbs();saveState();
}

function distributeEls(axis,scope){
  const targets=multiSel.size>1?[...multiSel]:(sel?[sel]:[]);
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
  syncPos();save();drawThumbs();saveState();
}
