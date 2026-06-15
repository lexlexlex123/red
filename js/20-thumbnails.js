// ══════════════ THUMBNAILS ══════════════
const _SLIDE_CTX_ICONS={
  add:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>',
  dup:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 012-2h10"/></svg>',
  paste:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12h6M9 16h6"/></svg>',
  del:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>'
};

function _slideInsertIndexFromY(list, clientY, dragIndices){
  const skip=new Set();
  if(dragIndices!=null){
    (Array.isArray(dragIndices)?dragIndices:[dragIndices]).forEach(i=>skip.add(+i));
  }
  const thumbs=list.querySelectorAll('.sthumb');
  if(!thumbs.length) return 0;
  for(let i=0;i<thumbs.length;i++){
    if(skip.has(i)) continue;
    const r=thumbs[i].getBoundingClientRect();
    if(clientY<r.top+r.height/2) return i;
  }
  return thumbs.length;
}

function _slideDragIndices(list){
  if(list._dragIndices&&list._dragIndices.length) return list._dragIndices;
  if(list._dragFrom!=null) return [list._dragFrom];
  return [];
}

function _autoScrollSlideList(list, clientY){
  if(!list) return;
  const maxScroll=list.scrollHeight-list.clientHeight;
  if(maxScroll<=0) return;
  const zone=44;
  const vh=window.innerHeight;
  const lr=list.getBoundingClientRect();
  if(clientY>Math.min(vh,lr.bottom)-zone){
    list.scrollTop=Math.min(maxScroll,list.scrollTop+12);
  }else if(clientY<Math.max(0,lr.top)+zone){
    list.scrollTop=Math.max(0,list.scrollTop-12);
  }
}

function _tickSlideListDragScroll(){
  const list=document.getElementById('slide-list');
  if(!list||list._dragFrom==null){window._slideDragScrollRaf=null;return;}
  if(list._dragClientY!=null) _autoScrollSlideList(list,list._dragClientY);
  window._slideDragScrollRaf=requestAnimationFrame(_tickSlideListDragScroll);
}

function _startSlideListDragScroll(){
  if(window._slideDragScrollRaf) return;
  window._slideDragScrollRaf=requestAnimationFrame(_tickSlideListDragScroll);
}

function _stopSlideListDragScroll(){
  if(window._slideDragScrollRaf){
    cancelAnimationFrame(window._slideDragScrollRaf);
    window._slideDragScrollRaf=null;
  }
  const list=document.getElementById('slide-list');
  if(list) delete list._dragClientY;
}

function _updateThumbDragIndicator(list, insertAt){
  let line=list.querySelector('.sthumb-insert-line');
  if(!line){
    line=document.createElement('div');
    line.className='sthumb-insert-line';
    line.setAttribute('aria-hidden','true');
  }
  const thumbs=[...list.querySelectorAll('.sthumb')];
  line.remove();
  list.querySelectorAll('.thumb-gap-before,.thumb-gap-after').forEach(el=>{
    el.classList.remove('thumb-gap-before','thumb-gap-after');
  });
  if(!thumbs.length){
    list.appendChild(line);
    return;
  }
  if(insertAt<=0){
    line.className='sthumb-insert-line at-start';
    list.insertBefore(line, thumbs[0]);
    thumbs[0].classList.add('thumb-gap-before');
  }else if(insertAt>=thumbs.length){
    line.className='sthumb-insert-line at-end';
    list.appendChild(line);
    thumbs[thumbs.length-1].classList.add('thumb-gap-after');
  }else{
    line.className='sthumb-insert-line at-between';
    list.insertBefore(line, thumbs[insertAt]);
    thumbs[insertAt].classList.add('thumb-gap-before');
  }
}

function _clearThumbDragUI(list){
  if(!list) return;
  _stopSlideListDragScroll();
  list.classList.remove('slide-list-dragging');
  list.querySelector('.sthumb-insert-line')?.remove();
  list.querySelectorAll('.sthumb').forEach(el=>{
    el.classList.remove('dragging','dover','thumb-gap-before','thumb-gap-after');
  });
  delete list._dragFrom;
  delete list._dragIndices;
  delete list._dragInsertAt;
}

function _handleSlideListDragOver(e){
  const list=document.getElementById('slide-list');
  if(!list||list._dragFrom==null) return;
  e.preventDefault();
  if(e.dataTransfer) e.dataTransfer.dropEffect='move';
  list._dragClientY=e.clientY;
  const dragIdx=_slideDragIndices(list);
  const insertAt=_slideInsertIndexFromY(list,e.clientY,dragIdx);
  if(insertAt!==list._dragInsertAt){
    list._dragInsertAt=insertAt;
    _updateThumbDragIndicator(list,insertAt);
  }
}

function _wireSlideListDrag(list){
  if(list._dragWired) return;
  list._dragWired=true;
  list.addEventListener('dragover',_handleSlideListDragOver);
  if(!window._slideListDocDragWired){
    window._slideListDocDragWired=true;
    document.addEventListener('dragover',_handleSlideListDragOver);
  }
  list.addEventListener('drop',e=>{
    e.preventDefault();
    const dragIdx=_slideDragIndices(list);
    const insertAt=list._dragInsertAt!=null
      ?list._dragInsertAt
      :_slideInsertIndexFromY(list,e.clientY,dragIdx);
    _clearThumbDragUI(list);
    if(!dragIdx.length) return;
    reorderSlidesBlock(dragIdx, insertAt);
  });
}

function _hideSlideCtxMenu(){
  const m=document.getElementById('slide-ctx-menu');
  if(m) m.style.display='none';
}

function _slideCtxLabels(){
  const tr=typeof t==='function'?t:k=>k;
  return {
    add:tr('btnNewSlide'),
    dup:tr('btnDuplicate'),
    copy:tr('ctxCopySlide'),
    paste:tr('ctxPasteSlide'),
    del:tr('btnDelete')
  };
}

function _slideCtxCopyLabel(count){
  const L=_slideCtxLabels();
  if(count<=1) return L.copy;
  const tr=typeof t==='function'?t:k=>k;
  const tpl=tr('ctxCopySlidesN');
  return tpl.replace('{n}', String(count));
}

function _slideCtxDeleteLabel(count){
  const L=_slideCtxLabels();
  if(count<=1) return L.del;
  const tr=typeof t==='function'?t:k=>k;
  const tpl=tr('ctxDeleteSlidesN');
  return tpl.replace('{n}', String(count));
}

function _pasteSlideTargetIndex(fallbackIdx){
  if(typeof getSlideSelection==='function'){
    const sel=getSlideSelection();
    if(sel.length) return Math.max(...sel)+1;
  }
  return fallbackIdx;
}

function _showSlideCtxMenu(x,y,items){
  let m=document.getElementById('slide-ctx-menu');
  if(!m){
    m=document.createElement('div');
    m.id='slide-ctx-menu';
    m.className='slide-ctx-menu';
    document.body.appendChild(m);
    document.addEventListener('mousedown',e=>{if(!m.contains(e.target))_hideSlideCtxMenu();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')_hideSlideCtxMenu();});
    window.addEventListener('scroll',()=>_hideSlideCtxMenu(),true);
  }
  m.innerHTML='';
  items.forEach(it=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='slide-ctx-item'+(it.warn?' slide-ctx-warn':'')+(it.disabled?' disabled':'');
    btn.innerHTML='<span class="slide-ctx-ico">'+it.icon+'</span><span class="slide-ctx-lbl">'+it.label+'</span>';
    if(!it.disabled){
      btn.onmousedown=e=>e.preventDefault();
      btn.onclick=e=>{e.stopPropagation();_hideSlideCtxMenu();it.action();};
    }
    m.appendChild(btn);
  });
  m.style.display='block';
  m.style.visibility='hidden';
  m.style.left='0';
  m.style.top='0';
  const mw=m.offsetWidth,mh=m.offsetHeight;
  const pad=8;
  let lx=x,ly=y;
  if(lx+mw+pad>window.innerWidth) lx=window.innerWidth-mw-pad;
  if(ly+mh+pad>window.innerHeight) ly=window.innerHeight-mh-pad;
  if(lx<pad) lx=pad;
  if(ly<pad) ly=pad;
  m.style.left=lx+'px';
  m.style.top=ly+'px';
  m.style.visibility='';
}

function _openSlideCtxOnThumb(e,i){
  e.preventDefault();
  e.stopPropagation();
  if(typeof slideMultiSel==='undefined' || !slideMultiSel.has(i)) clearSlideMultiSel();
  pickSlide(i, slideMultiSel.has(i) && slideMultiSel.size > 1);
  const sel=typeof getSlideSelection==='function'?getSlideSelection():[i];
  const multi=sel.length>1;
  const L=_slideCtxLabels();
  const canPaste=typeof hasSlideClipboard==='function'&&hasSlideClipboard();
  const items=[
    {icon:_SLIDE_CTX_ICONS.add,label:L.add,action:()=>addSlide(null,_pasteSlideTargetIndex(i+1))},
    {icon:_SLIDE_CTX_ICONS.copy,label:_slideCtxCopyLabel(sel.length),action:()=>multi?copySlidesSelected():copySlideAt(i)},
    {icon:_SLIDE_CTX_ICONS.paste,label:L.paste,disabled:!canPaste,action:()=>pasteSlideAt(_pasteSlideTargetIndex(i+1))},
    {icon:_SLIDE_CTX_ICONS.del,label:_slideCtxDeleteLabel(sel.length),warn:true,action:()=>multi?deleteSlidesSelected():delSlideAt(i)}
  ];
  if(!multi){
    items.splice(1,0,
      {icon:_SLIDE_CTX_ICONS.dup,label:L.dup,action:()=>dupSlideAt(i)}
    );
  }
  _showSlideCtxMenu(e.clientX,e.clientY,items);
}

function _openSlideCtxOnEmpty(e){
  e.preventDefault();
  e.stopPropagation();
  const list=document.getElementById('slide-list');
  const at=_slideInsertIndexFromY(list,e.clientY);
  const L=_slideCtxLabels();
  const canPaste=typeof hasSlideClipboard==='function'&&hasSlideClipboard();
  _showSlideCtxMenu(e.clientX,e.clientY,[
    {icon:_SLIDE_CTX_ICONS.add,label:L.add,action:()=>addSlide(null,at)},
    {icon:_SLIDE_CTX_ICONS.paste,label:L.paste,disabled:!canPaste,action:()=>pasteSlideAt(at)}
  ]);
}

function _refreshThumbSlide(slideIdx){
  if(slideIdx==null||slideIdx<0||!slides[slideIdx]) return;
  drawThumbs(false, slideIdx);
}

let _dtTimer=null, _dtDirty=new Set();
function _drawThumbsImpl(forceFull, dirtyIdxs){
  const list=document.getElementById('slide-list');
  if(!list) return;
  const existingThumbs=list.querySelectorAll('.sthumb');
  const canIncremental=!forceFull&&!list._thumbsNeedFull&&existingThumbs.length===slides.length&&list._dragWired;
  if(canIncremental){
    _updateThumbsIncremental(list, dirtyIdxs);
    return;
  }
  list._thumbsNeedFull=false;
  list.innerHTML='';
  if(!list._ctxWired){
    list._ctxWired=true;
    list.addEventListener('contextmenu',e=>{
      if(e.target.closest('.sthumb')) return;
      _openSlideCtxOnEmpty(e);
    });
    list.addEventListener('click',e=>{
      if(!e.target.closest('.sthumb') && !e.ctrlKey && !e.metaKey && !e.shiftKey){
        clearSlideMultiSel();
        drawThumbs(true);
      }
    });
  }
  _wireSlideListDrag(list);
  _wireSlideListTouch(list);
  document.getElementById('sb-count').textContent=slides.length;
  slides.forEach((s,i)=>{
    const multiOn=typeof slideMultiSel!=='undefined' && slideMultiSel.has(i);
    const multiMode=typeof slideMultiSel!=='undefined' && slideMultiSel.size>1;
    const t=document.createElement('div');
    t.className='sthumb'+(i===cur?' active':'')+(multiOn&&multiMode?' multi-sel':'');
    t.dataset.ar=ar;
    t.dataset.idx=String(i);
    t.setAttribute('role','listitem');
    t.onclick=e=>pickSlideWithMod(i,e);t.draggable=true;
    t.oncontextmenu=e=>_openSlideCtxOnThumb(e,i);
    t.ondragstart=e=>{
      let indices;
      if(typeof slideMultiSel!=='undefined'&&slideMultiSel.size>1&&slideMultiSel.has(i)){
        indices=[...slideMultiSel].sort((a,b)=>a-b);
      }else{
        indices=[i];
      }
      e.dataTransfer.setData('text/plain',indices.join(','));
      e.dataTransfer.effectAllowed='move';
      list._dragFrom=i;
      list._dragIndices=indices;
      list._dragInsertAt=null;
      list.classList.add('slide-list-dragging');
      indices.forEach(idx=>{
        const el=list.querySelector('.sthumb[data-idx="'+idx+'"]');
        if(el) el.classList.add('dragging');
      });
      _startSlideListDragScroll();
    };
    t.ondragend=()=>_clearThumbDragUI(list);

    const cnv=document.createElement('canvas');
    cnv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;';
    t.appendChild(cnv);

    const snum=document.createElement('div');snum.className='snum';snum.textContent=i+1;
    t.appendChild(snum);
    if(s.trans&&s.trans!=='none'){const tb=document.createElement('div');tb.className='tbadge';t.appendChild(tb);}
    if(s.auto>0){const ab=document.createElement('div');ab.className='autobadge';t.appendChild(ab);}
    list.appendChild(t);

    requestAnimationFrame(()=>renderThumbCanvas(cnv,s,i));
  });
}

function _wireSlideListTouch(list){
  if(list._touchWired) return;
  list._touchWired = true;
  let ptr = null;
  list.addEventListener('pointerdown', e=>{
    if(e.pointerType === 'mouse') return;
    const thumb = e.target.closest('.sthumb');
    if(!thumb) return;
    e.preventDefault();
    const idx = +thumb.dataset.idx;
    let indices;
    if(typeof slideMultiSel!=='undefined'&&slideMultiSel.size>1&&slideMultiSel.has(idx)){
      indices=[...slideMultiSel].sort((a,b)=>a-b);
    }else{
      indices=[idx];
    }
    ptr = {id:e.pointerId, idx, indices};
    list._dragFrom = idx;
    list._dragIndices = indices;
    list._dragInsertAt = null;
    list.classList.add('slide-list-dragging');
    indices.forEach(i=>{
      const el=list.querySelector('.sthumb[data-idx="'+i+'"]');
      if(el) el.classList.add('dragging');
    });
    _startSlideListDragScroll();
    try{ thumb.setPointerCapture(e.pointerId); }catch(err){}
  });
  list.addEventListener('pointermove', e=>{
    if(!ptr || e.pointerId !== ptr.id) return;
    list._dragClientY = e.clientY;
    const dragIdx = _slideDragIndices(list);
    const insertAt = _slideInsertIndexFromY(list, e.clientY, dragIdx);
    if(insertAt !== list._dragInsertAt){
      list._dragInsertAt = insertAt;
      _updateThumbDragIndicator(list, insertAt);
    }
  });
  const finishTouchDrag = e=>{
    if(!ptr || e.pointerId !== ptr.id) return;
    const dragIdx = _slideDragIndices(list);
    const insertAt = list._dragInsertAt != null
      ? list._dragInsertAt
      : _slideInsertIndexFromY(list, e.clientY, dragIdx);
    _clearThumbDragUI(list);
    if(dragIdx.length) reorderSlidesBlock(dragIdx, insertAt);
    ptr = null;
  };
  list.addEventListener('pointerup', finishTouchDrag);
  list.addEventListener('pointercancel', finishTouchDrag);
}

function drawThumbs(forceFull, slideIdx){
  if(forceFull){
    clearTimeout(_dtTimer);
    _dtTimer=null;
    _dtDirty.clear();
    _drawThumbsImpl(true);
    return;
  }
  if(slideIdx!=null) _dtDirty.add(slideIdx);
  else if(typeof cur!=='undefined') _dtDirty.add(cur);
  clearTimeout(_dtTimer);
  _dtTimer=setTimeout(()=>{
    _dtTimer=null;
    const list=document.getElementById('slide-list');
    if(list&&list._thumbsNeedFull){
      _dtDirty.clear();
      _drawThumbsImpl(true);
      return;
    }
    const idxs=_dtDirty.size?[..._dtDirty]:[typeof cur!=='undefined'?cur:0];
    _dtDirty.clear();
    _drawThumbsImpl(false, idxs);
  }, 40);
}

function _updateThumbsIncremental(list, dirtyIdxs){
  const dirtySet=dirtyIdxs&&dirtyIdxs.length?new Set(dirtyIdxs):null;
  document.getElementById('sb-count').textContent=slides.length;
  slides.forEach((s,i)=>{
    const multiOn=typeof slideMultiSel!=='undefined' && slideMultiSel.has(i);
    const multiMode=typeof slideMultiSel!=='undefined' && slideMultiSel.size>1;
    let t=list.querySelector('.sthumb[data-idx="'+i+'"]');
    if(!t){
      drawThumbs(true);
      return;
    }
    t.className='sthumb'+(i===cur?' active':'')+(multiOn&&multiMode?' multi-sel':'');
    t.dataset.idx=String(i);
    t.dataset.ar=ar;
    const snum=t.querySelector('.snum');
    if(snum) snum.textContent=i+1;
    let tb=t.querySelector('.tbadge');
    if(s.trans&&s.trans!=='none'){
      if(!tb){tb=document.createElement('div');tb.className='tbadge';t.appendChild(tb);}
    }else if(tb){ tb.remove(); }
    let ab=t.querySelector('.autobadge');
    if(s.auto>0){
      if(!ab){ab=document.createElement('div');ab.className='autobadge';t.appendChild(ab);}
    }else if(ab){ ab.remove(); }
    if(dirtySet&&!dirtySet.has(i)) return;
    const cnv=t.querySelector('canvas');
    if(cnv) requestAnimationFrame(()=>renderThumbCanvas(cnv,s,i));
  });
  while(list.querySelectorAll('.sthumb').length>slides.length){
    list.lastElementChild?.classList.contains('sthumb') && list.removeChild(list.lastElementChild);
  }
}

function renderThumbCanvas(cnv,s,slideIdx,customW,customH){
  const TW=customW||160;
  const TH=customH||(customW?Math.round(customW*canvasH/canvasW):(ar==='4:3'?120:90));
  cnv.width=TW;cnv.height=TH;
  const ctx=cnv.getContext('2d');
  const scaleX=TW/canvasW,scaleY=TH/canvasH;

  // Background
  const _themeForBg=(typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)?THEMES[appliedThemeIdx]:null;
  const _themeBg=_themeForBg?_themeForBg.bg:'#1a1a2e';
  const bg=(s.bg==='custom'||s.bg==='theme')?(s.bgc||_themeBg):((BGS.find(b=>b.id===s.bg)||BGS[0]).s);
  if(bg.startsWith('linear-gradient')||bg.startsWith('radial-gradient')){
    // Parse gradient for canvas
    const stops=parseGradientStops(bg);
    let grad;
    if(bg.startsWith('linear-gradient')){
      const angle=parseLinearAngle(bg);
      const rad=angle*Math.PI/180;
      const cx=TW/2,cy=TH/2,len=Math.sqrt(TW*TW+TH*TH)/2;
      grad=ctx.createLinearGradient(cx-Math.sin(rad)*len,cy+Math.cos(rad)*len,cx+Math.sin(rad)*len,cy-Math.cos(rad)*len);
    } else {
      grad=ctx.createRadialGradient(TW/2,TH/2,0,TW/2,TH/2,Math.max(TW,TH));
    }
    stops.forEach(([pos,col])=>grad.addColorStop(pos,col));
    ctx.fillStyle=grad;
  } else {
    ctx.fillStyle=bg||'#111';
  }
  ctx.fillRect(0,0,TW,TH);

  if(s.bgImg&&s.bgImg.exportBaked){
    const bakedSrc=s.bgImg.exportBaked;
    const drawBaked=(img)=>{if(_isCanvasExport()){_safeDrawExportImage(ctx,img,0,0,TW,TH);}else{ctx.drawImage(img,0,0,TW,TH);}};
    const expImg=_isCanvasExport()?_exportCanvasImg(bakedSrc):null;
    if(expImg){drawBaked(expImg);}
    else if(!_isCanvasExport()&&_thumbImgCache[bakedSrc]) drawBaked(_thumbImgCache[bakedSrc]);
    else if(!_isCanvasExport()){
      const img=new Image();
      img.onload=()=>{_thumbImgCache[bakedSrc]=img;if(!customW){if(slideIdx!=null)_refreshThumbSlide(slideIdx);else drawThumbs(true);}else drawBaked(img);};
      img.onerror=()=>{};
      img.src=bakedSrc;
    }
  }else if(s.bgImg&&s.bgImg.src){
    const thumbBg=typeof _scaleBgImgForCanvas==='function'
      ?_scaleBgImgForCanvas(s.bgImg,TW,TH,canvasW,canvasH)
      :s.bgImg;
    const drawBgImg=(img)=>{
      if(typeof drawSlideBgImgOnCanvas==='function') drawSlideBgImgOnCanvas(ctx,thumbBg,TW,TH,img);
      else{
        const ir=img.naturalWidth/img.naturalHeight||1;
        const tr=TW/TH;
        let dw,dh,dx,dy;
        if(ir>tr){dh=TH;dw=dh*ir;dx=(TW-dw)/2;dy=0;}
        else{dw=TW;dh=dw/ir;dx=0;dy=(TH-dh)/2;}
        ctx.drawImage(img,dx,dy,dw,dh);
      }
    };
    const expImg=_isCanvasExport()?_exportCanvasImg(s.bgImg.src):null;
    if(expImg) drawBgImg(expImg);
    else if(!_isCanvasExport()&&_thumbImgCache[s.bgImg.src]) drawBgImg(_thumbImgCache[s.bgImg.src]);
    else if(!_isCanvasExport()){
      const img=new Image();
      img.onload=()=>{_thumbImgCache[s.bgImg.src]=img;if(!customW){if(slideIdx!=null)_refreshThumbSlide(slideIdx);else drawThumbs(true);}else drawBgImg(img);};
      img.onerror=()=>{};
      img.src=typeof assetUrl==='function'?assetUrl(s.bgImg.src):s.bgImg.src;
    }
  }

  // Draw elements (sorted by z, decor first)
  const els=s.els||[];
  els.forEach(d=>{
    if(d.objHidden) return;
    if(d._isDecor){drawThumbDecorSvg(ctx,d,scaleX,scaleY,TW,TH,slideIdx);return;}
    if(d.type==='text')drawThumbText(ctx,d,scaleX,scaleY);
    else if(d.type==='shape')drawThumbShape(ctx,d,scaleX,scaleY);
    else if(d.type==='image')drawThumbImage(ctx,d,scaleX,scaleY,slideIdx);
    else if(d.type==='code')drawThumbCode(ctx,d,scaleX,scaleY);
    else if(d.type==='markdown')drawThumbMarkdown(ctx,d,scaleX,scaleY);
    else if(d.type==='icon')drawThumbIcon(ctx,d,scaleX,scaleY,slideIdx);
    else if(d.type==='table')drawThumbTable(ctx,d,scaleX,scaleY);
    else if(d.type==='formula')drawThumbFormula(ctx,d,scaleX,scaleY,slideIdx);
    else if(d.type==='svg')drawThumbSvgEl(ctx,d,scaleX,scaleY,slideIdx);
    else if(d.type==='graph')drawThumbGraph(ctx,d,scaleX,scaleY,slideIdx);
    else if(d.type==='lego')drawThumbLego(ctx,d,scaleX,scaleY);
    else if(d.type==='applet')drawThumbApplet(ctx,d,scaleX,scaleY);
    else if(d.type==='pagenum')drawThumbPagenum(ctx,d,scaleX,scaleY);
    else if(d.type==='mediavideo'||d.type==='mediaaudio')drawThumbMedia(ctx,d,scaleX,scaleY);
  });

  // Draw connectors
  if (s.connectors && s.connectors.length) {
    const elMap = {};
    s.els.forEach(d => { elMap[d.id] = d; });
    function _tEdgeRaw(elId, otherId, sideKey) {
      const d = elMap[elId]; if (!d) return {x:0,y:0,side:sideKey};
      const cx = d.x+d.w/2, cy = d.y+d.h/2;
      if (sideKey === 'top') return {x: cx, y: d.y, side: 'top'};
      if (sideKey === 'bottom') return {x: cx, y: d.y+d.h, side: 'bottom'};
      if (sideKey === 'left') return {x: d.x, y: cy, side: 'left'};
      if (sideKey === 'right') return {x: d.x+d.w, y: cy, side: 'right'};
      const od = elMap[otherId];
      const ox = od?od.x+od.w/2:cx, oy = od?od.y+od.h/2:cy;
      const dx=ox-cx, dy=oy-cy;
      if (Math.abs(dx)*d.h > Math.abs(dy)*d.w) return {x: dx>0?d.x+d.w:d.x, y: cy, side: dx>0?'right':'left'};
      return {x: cx, y: dy>0?d.y+d.h:d.y, side: dy>0?'bottom':'top'};
    }
    function _tApplyLineGap(r1, r2, gap) {
      gap = gap || 0;
      if (!gap) return { p1: r1, p2: r2 };
      const dx = r2.x - r1.x, dy = r2.y - r1.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      if (len < 0.001) return { p1: r1, p2: r2 };
      const g = Math.min(gap, len / 2);
      const ux = dx / len, uy = dy / len;
      return { p1: {x: r1.x+ux*g, y: r1.y+uy*g}, p2: {x: r2.x-ux*g, y: r2.y-uy*g} };
    }
    function _tApplySideGap(raw, gap) {
      if (!gap) return raw;
      const n = { top:{x:0,y:-1}, right:{x:1,y:0}, bottom:{x:0,y:1}, left:{x:-1,y:0} };
      const sn = n[raw.side] || {x:0,y:0};
      return { x: raw.x + sn.x * gap, y: raw.y + sn.y * gap };
    }
    function _tOrthoPts(p1, p2, fromSide, toSide) {
      const hFrom = fromSide === 'left' || fromSide === 'right';
      const hTo = toSide === 'left' || toSide === 'right';
      if (hFrom && hTo) {
        const midX = (p1.x + p2.x) / 2;
        return [p1, {x: midX, y: p1.y}, {x: midX, y: p2.y}, p2];
      }
      if (!hFrom && !hTo) {
        const midY = (p1.y + p2.y) / 2;
        return [p1, {x: p1.x, y: midY}, {x: p2.x, y: midY}, p2];
      }
      if (hFrom) return [p1, {x: p2.x, y: p1.y}, p2];
      return [p1, {x: p1.x, y: p2.y}, p2];
    }
    s.connectors.forEach(conn => {
      const gap = conn.gap||0;
      const raw1 = _tEdgeRaw(conn.fromId, conn.toId, conn.fromSide);
      const raw2 = _tEdgeRaw(conn.toId, conn.fromId, conn.toSide);
      const route = conn.route || 'curve';
      let p1, p2;
      if (route === 'straight') {
        ({ p1, p2 } = _tApplyLineGap(raw1, raw2, gap));
      } else {
        p1 = _tApplySideGap(raw1, gap);
        p2 = _tApplySideGap(raw2, gap);
      }
      const sw  = (conn.sw||2) * scaleX;
      const dash = conn.dash||'solid';
      ctx.save();
      ctx.strokeStyle = conn.color||'#60a5fa';
      ctx.lineWidth   = sw;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      if (dash==='dot')  ctx.setLineDash([0, sw*4]);
      else if (dash==='dash') ctx.setLineDash([sw*5, sw*3]);
      else ctx.setLineDash([]);
      ctx.beginPath();
      if (route === 'orthogonal') {
        const pts = _tOrthoPts(p1, p2, conn.fromSide, conn.toSide);
        ctx.moveTo(pts[0].x*scaleX, pts[0].y*scaleY);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x*scaleX, pts[i].y*scaleY);
      } else {
        ctx.moveTo(p1.x*scaleX, p1.y*scaleY);
        ctx.lineTo(p2.x*scaleX, p2.y*scaleY);
      }
      ctx.stroke();
      ctx.restore();
    });
  }
}

function parseGradientStops(css){
  const stops=[];
  // Extract color stops from gradient string
  const inner=css.replace(/^(linear|radial)-gradient\(\s*/,'').replace(/\)\s*$/,'');
  // Split by commas but not inside parens
  const parts=[];let depth=0,cur2='';
  for(const ch of inner){if(ch==='(')depth++;else if(ch===')')depth--;if(ch===','&&depth===0){parts.push(cur2.trim());cur2='';}else cur2+=ch;}
  if(cur2.trim())parts.push(cur2.trim());
  // Filter out angle/position, collect color stops
  let idx=0;
  const colorParts=parts.filter(p=>!/^\d+deg$/.test(p)&&!/^(to |ellipse|circle|farthest)/i.test(p));
  colorParts.forEach((p,i)=>{
    const m=p.match(/(#[0-9a-f]{3,8}|rgba?\([^)]+\)|[a-z]+)\s*(\d+%)?/i);
    if(m){const pos=m[2]?parseFloat(m[2])/100:(i/(Math.max(1,colorParts.length-1)));stops.push([pos,m[1]]);}
  });
  return stops.length?stops:[[0,'#111'],[1,'#333']];
}
function parseLinearAngle(css){
  const m=css.match(/(\d+)deg/);if(m)return+m[1];
  if(/to right/.test(css))return 90;if(/to left/.test(css))return 270;
  if(/to bottom/.test(css))return 180;if(/to top/.test(css))return 0;
  return 135;
}

function drawThumbText(ctx,d,sx,sy){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  ctx.save();
  if(d.rot){ctx.translate(x+w/2,y+h/2);ctx.rotate(d.rot*Math.PI/180);ctx.translate(-(x+w/2),-(y+h/2));}

  // Background
  if(d.textBg){
    const r=parseInt(d.textBg.slice(1,3),16),g2=parseInt(d.textBg.slice(3,5),16),b2=parseInt(d.textBg.slice(5,7),16);
    const op=d.textBgOp!=null?d.textBgOp:0.12;
    ctx.fillStyle=`rgba(${r},${g2},${b2},${op})`;
    ctx.fillRect(x,y,w,h);
  }

  // Parse style string for font props
  const cs=d.cs||'';
  const fs=Math.max(6,(parseFloat(cs.match(/font-size:\s*([\d.]+)px/)?.[1]||48)*sx));
  const fw=cs.includes('700')||cs.includes('bold')?'bold':'normal';
  const col=cs.match(/\bcolor:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/)?.[1]||'#fff';
  ctx.font=`${fw} ${fs.toFixed(1)}px Inter,sans-serif`;
  ctx.fillStyle=col;
  ctx.globalAlpha=d.elOpacity!=null?+d.elOpacity:1;

  // Extract lines from html, preserving list markers as text prefixes
  const tmp=document.createElement('div');tmp.innerHTML=(typeof rtMigrateHtml==='function'?rtMigrateHtml(d.html||''):d.html||'');
  // Replace list markers with text equivalents before extracting text
  tmp.querySelectorAll('span[data-list-num]').forEach((sp,i)=>{sp.textContent=sp.textContent||((i+1)+'.');});
  tmp.querySelectorAll('span[data-list-bullet]').forEach(sp=>{sp.textContent='•';});
  // Split by BR into lines
  const rawHtml=(d.html||'').replace(/<br\s*\/?>/gi,'\n');
  const tmp2=document.createElement('div');tmp2.innerHTML=rawHtml;
  tmp2.querySelectorAll('span[data-list-num]').forEach((sp,i)=>{sp.textContent=sp.textContent||((i+1)+'.');});
  tmp2.querySelectorAll('span[data-list-bullet]').forEach(sp=>{sp.textContent='•';});
  const fullTxt=tmp2.textContent||tmp2.innerText||'';
  const isUppercase=cs.includes('uppercase');
  const rawLines=fullTxt.split('\n');

  // Word-wrap simplified
  const lineH=fs*1.3;
  let lineY=y+lineH;
  const valign=d.valign||'top';
  if(valign==='middle')lineY=y+(h-lineH)/2+lineH*.6;
  else if(valign==='bottom')lineY=y+h-8*sy;

  const ta=(cs.match(/text-align:\s*(\w+)/)?.[1])||'left';
  ctx.textAlign=ta==='center'?'center':ta==='right'?'right':'left';
  const tx=ta==='center'?x+w/2:ta==='right'?x+w-4*sx:x+6*sx;

  for(const rawLine of rawLines){
    const displayLine=isUppercase?rawLine.toUpperCase():rawLine;
    const words=displayLine.split(/\s+/).filter(Boolean);
    let line='';
    for(const word of words){
      const test=line?line+' '+word:word;
      if(ctx.measureText(test).width>w-8*sx&&line){
        ctx.fillText(line,tx,lineY); line=word; lineY+=lineH;
        if(lineY>y+h)break;
      } else line=test;
    }
    if(line&&lineY<=y+h){ctx.fillText(line,tx,lineY); lineY+=lineH;}
    if(lineY>y+h)break;
  }
  ctx.restore();
}

function drawThumbShape(ctx,d,sx,sy){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  ctx.save();
  if(d.rot){ctx.translate(x+w/2,y+h/2);ctx.rotate(d.rot*Math.PI/180);ctx.translate(-(x+w/2),-(y+h/2));}
  const fill=d.fill||'#3b82f6';
  const op=d.fillOp!=null?+d.fillOp:1;
  ctx.globalAlpha=op;
  ctx.fillStyle=fill;
  const sw=d.sw!=null?+d.sw*Math.min(sx,sy):0;
  if(sw>0){ctx.strokeStyle=d.stroke||'#1d4ed8';ctx.lineWidth=sw;}
  const shape=d.shape||'rect';
  const rx=+(d.rx||0)*Math.min(sx,sy);
  const sh=typeof SHAPES!=='undefined'?SHAPES.find(s=>s.id===shape):null;
  const special=sh?sh.special:null;
  if(special==='rect'||shape==='rect'){
    if(rx>0){drawRoundRect(ctx,x,y,w,h,rx);ctx.fill();if(sw>0)ctx.stroke();}
    else{ctx.fillRect(x,y,w,h);if(sw>0)ctx.strokeRect(x,y,w,h);}
  } else if(special==='ellipse'||shape==='circle'||shape==='ellipse'){
    ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);ctx.fill();if(sw>0)ctx.stroke();
  } else if(special==='polygon'){
    const sides=Math.max(3,Math.min(16,+(d.polySides||3)));
    ctx.beginPath();
    for(let i=0;i<sides;i++){const a=(i/sides*Math.PI*2)-Math.PI/2;ctx.lineTo(x+w/2+w/2*Math.cos(a),y+h/2+h/2*Math.sin(a));}
    ctx.closePath();ctx.fill();if(sw>0)ctx.stroke();
  } else if(special==='star'){
    const nR=Math.max(4,Math.min(32,+(d.starRays||5)));
    const iR=Math.max(0.1,Math.min(0.9,+(d.starInner!=null?d.starInner:0.45)));
    ctx.beginPath();
    for(let i=0;i<nR*2;i++){const a=(i/(nR*2)*Math.PI*2)-Math.PI/2;const r=i%2===0?1:iR;ctx.lineTo(x+w/2+w/2*r*Math.cos(a),y+h/2+h/2*r*Math.sin(a));}
    ctx.closePath();ctx.fill();if(sw>0)ctx.stroke();
  } else if(special==='parallelogram'){
    const skew=Math.max(-45,Math.min(45,+(d.paraSkew!=null?d.paraSkew:20)));
    const off=(h/2)*Math.tan(skew*Math.PI/180);
    ctx.beginPath();ctx.moveTo(x+off,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w-off,y+h);ctx.lineTo(x,y+h);ctx.closePath();ctx.fill();if(sw>0)ctx.stroke();
  } else if(shape==='star'){
    drawStar(ctx,x+w/2,y+h/2,w/2,h/2,5);ctx.fill();if(sw>0)ctx.stroke();
  } else if(special==='curve'&&d.curvePoints&&d.curvePoints.length>=2){
    // Draw curve using bezier path
    const cpts=d.curvePoints;
    const hasNSw=cpts.some(p=>p.sw!=null);
    ctx.beginPath();
    ctx.moveTo(x+cpts[0].x*w, y+cpts[0].y*h);
    for(let ci=1;ci<cpts.length;ci++){
      const pp=cpts[ci-1],cp=cpts[ci];
      const c1x=pp.cp2x!=null?pp.cp2x:pp.x, c1y=pp.cp2y!=null?pp.cp2y:pp.y;
      const c2x=cp.cp1x!=null?cp.cp1x:cp.x, c2y=cp.cp1y!=null?cp.cp1y:cp.y;
      ctx.bezierCurveTo(x+c1x*w,y+c1y*h, x+c2x*w,y+c2y*h, x+cp.x*w,y+cp.y*h);
    }
    if(d.curveClosed)ctx.closePath();
    if(fill&&fill!=='none'){ctx.fillStyle=fill;ctx.fill();}
    if(sw>0&&!hasNSw){ctx.strokeStyle=d.stroke||'#1d4ed8';ctx.lineWidth=sw;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
    // Variable width: draw each segment with its own width
    if(hasNSw&&sw>0){
      for(let ci=1;ci<cpts.length;ci++){
        const pp=cpts[ci-1],cp=cpts[ci];
        const c1x=pp.cp2x!=null?pp.cp2x:pp.x, c1y=pp.cp2y!=null?pp.cp2y:pp.y;
        const c2x=cp.cp1x!=null?cp.cp1x:cp.x, c2y=cp.cp1y!=null?cp.cp1y:cp.y;
        const segSw=(pp.sw!=null?pp.sw:sw)*Math.min(sx,sy);
        ctx.beginPath();ctx.moveTo(x+pp.x*w,y+pp.y*h);
        ctx.bezierCurveTo(x+c1x*w,y+c1y*h, x+c2x*w,y+c2y*h, x+cp.x*w,y+cp.y*h);
        ctx.strokeStyle=d.stroke||'#1d4ed8';ctx.lineWidth=segSw;ctx.lineCap='round';ctx.stroke();
      }
    }
  } else if(special==='cloud') {
    ctx.save();
    try {
      const _seed=d.cloudSeed||42;
      const _form=d.cloudForm||'puff';
      if(typeof _generateCloudCircles==='function'){
        const _circles=typeof _cloudResolveCircles==='function'?_cloudResolveCircles(d,w,h):_generateCloudCircles(w,h,_seed,_form);
        const _shade=typeof _cloudShadeFromFill==='function'?_cloudShadeFromFill(fill):'#8eb8dc';
        const _hi=typeof _cloudHighlightFromFill==='function'?_cloudHighlightFromFill(fill):fill;
        ctx.translate(x,y);
        if(sw>0){
          const _sp=typeof _generateCloudStrokePath==='function'?_generateCloudStrokePath(w,h,_seed,sw,_form,d):null;
          if(_sp){ctx.fillStyle=d.stroke||'#1d4ed8';ctx.fill(new Path2D(_sp));}
        }
        const _path=typeof _generateCloudPath==='function'?_generateCloudPath(w,h,_seed,_form,d):null;
        if(_path){
          const _p2=new Path2D(_path);
          if(d.fillGrad&&d.fillGrad2){
            ctx.fillStyle=fill;ctx.fill(_p2);
          } else {
            const _grad=ctx.createLinearGradient(0,h*0.08,0,h);
            _grad.addColorStop(0,_hi);_grad.addColorStop(0.45,fill);_grad.addColorStop(1,_shade);
            ctx.fillStyle=_grad;ctx.fill(_p2);
          }
        }
      } else {
        const _cPath=typeof _generateCloudPath==='function'?_generateCloudPath(w,h,_seed,_form,d):null;
        ctx.fillStyle=fill;
        if(_cPath){
          const _p2=new Path2D(_cPath);
          ctx.translate(x,y);ctx.fill(_p2);
        } else {
          ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);ctx.fill();
        }
      }
    } catch(e){ ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);ctx.fill(); }
    ctx.restore();
  } else if(special==='chevron') {
    ctx.save();
    ctx.fillStyle=fill;
    if(sw>0){ctx.strokeStyle=d.stroke||'#1d4ed8';ctx.lineWidth=sw;}
    if(d.shapeFlipH||d.shapeFlipV){const _fx=d.shapeFlipH?-1:1,_fy=d.shapeFlipV?-1:1;ctx.translate(x+w/2,y+h/2);ctx.scale(_fx,_fy);ctx.translate(-(x+w/2),-(y+h/2));}
    const _sk=(d.chevSkew!=null?+d.chevSkew:25)/100,_tp=Math.round(w*_sk),_mid=h/2;
    const _ind=Math.round(w*(d.chevInner!=null?+d.chevInner:d.chevSkew!=null?+d.chevSkew:25)/100);
    ctx.beginPath();
    if(d.shape==='chevronLeft'){
      ctx.moveTo(x+w,y);ctx.lineTo(x+_tp,y);ctx.lineTo(x,y+_mid);ctx.lineTo(x+_tp,y+h);ctx.lineTo(x+w,y+h);ctx.lineTo(x+w-_ind,y+_mid);
    }else{
      ctx.moveTo(x,y);ctx.lineTo(x+w-_tp,y);ctx.lineTo(x+w,y+_mid);ctx.lineTo(x+w-_tp,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x+_ind,y+_mid);
    }
    ctx.closePath();ctx.fill();if(sw>0)ctx.stroke();
    ctx.restore();
  } else if(special==='gear') {
    // Gear shape using _gearPath
    ctx.save();
    ctx.fillStyle=fill;
    if(sw>0){ctx.strokeStyle=d.stroke||'#1d4ed8';ctx.lineWidth=sw;}
    try {
      const _nT=Math.max(3,Math.min(60,+(d.gearTeeth||12)));
      const _gD=Math.max(0.05,Math.min(0.6,+(d.gearDepth!=null?d.gearDepth:0.25)));
      if(typeof _gearPath==='function'){
        const _gp=_gearPath(x+w/2,y+h/2,w/2,h/2,_nT,_gD);
        const _p2=new Path2D(_gp);ctx.fill(_p2);if(sw>0)ctx.stroke(_p2);
      } else {
        ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);ctx.fill();
      }
    } catch(e){ ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);ctx.fill(); }
    ctx.restore();
  } else if(special==='trapezoid') {
    const tTop=d.trapTop!=null?+d.trapTop:0.15;
    const tBot=d.trapBot!=null?+d.trapBot:0.0;
    const tl=tTop*w, bl=tBot*w;
    ctx.save();ctx.fillStyle=fill;
    if(sw>0){ctx.strokeStyle=d.stroke||'#1d4ed8';ctx.lineWidth=sw;}
    ctx.beginPath();
    ctx.moveTo(x+tl,y);ctx.lineTo(x+w-tl,y);ctx.lineTo(x+w-bl,y+h);ctx.lineTo(x+bl,y+h);
    ctx.closePath();ctx.fill();if(sw>0)ctx.stroke();
    ctx.restore();
  } else if(special==='moon') {
    const phase=d.moonPhase!=null?+d.moonPhase:-0.5;
    ctx.save();ctx.fillStyle=fill;
    if(sw>0){ctx.strokeStyle=d.stroke||'#1d4ed8';ctx.lineWidth=sw;}
    try {
      if(typeof _moonPath==='function'){
        const _mp=_moonPath(x+w/2,y+h/2,w/2,h/2,phase,0);
        const _p2=new Path2D(_mp);ctx.fill(_p2);if(sw>0)ctx.stroke(_p2);
      } else {
        ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);ctx.fill();
      }
    } catch(e){ ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);ctx.fill(); }
    ctx.restore();
  } else if(special==='noSymbol') {
    // No-entry sign: ring + diagonal band using same path structure as shapeEl
    ctx.save();ctx.fillStyle=fill;
    if(sw>0){ctx.strokeStyle=d.stroke||'#1d4ed8';ctx.lineWidth=sw;}
    const _lw=Math.max(1,Math.round(Math.min(w,h)/2*0.28));
    const _ir=Math.min(w,h)/2-_lw, _hw=_lw/2, _s2=Math.SQRT1_2;
    const _ccx=x+w/2, _ccy=y+h/2, _cr=Math.min(w,h)/2;
    const _tIn=Math.sqrt(Math.max(0,_ir*_ir-_hw*_hw));
    const _R1x=_ccx+_tIn*_s2-_hw*_s2,_R1y=_ccy-_tIn*_s2-_hw*_s2;
    const _R2x=_ccx-_tIn*_s2-_hw*_s2,_R2y=_ccy+_tIn*_s2-_hw*_s2;
    const _L1x=_ccx+_tIn*_s2+_hw*_s2,_L1y=_ccy-_tIn*_s2+_hw*_s2;
    const _L2x=_ccx-_tIn*_s2+_hw*_s2,_L2y=_ccy+_tIn*_s2+_hw*_s2;
    const _outerPath=`M ${_ccx+_cr} ${_ccy} A ${_cr} ${_cr} 0 1 0 ${_ccx-_cr} ${_ccy} A ${_cr} ${_cr} 0 1 0 ${_ccx+_cr} ${_ccy} Z`;
    const _h1=`M ${_ccx} ${_ccy-_ir} A ${_ir} ${_ir} 0 0 1 ${_R1x} ${_R1y} L ${_R2x} ${_R2y} A ${_ir} ${_ir} 0 0 1 ${_ccx-_ir} ${_ccy} A ${_ir} ${_ir} 0 0 1 ${_ccx} ${_ccy-_ir} Z`;
    const _h2=`M ${_L1x} ${_L1y} A ${_ir} ${_ir} 0 0 1 ${_ccx+_ir} ${_ccy} A ${_ir} ${_ir} 0 0 1 ${_ccx} ${_ccy+_ir} A ${_ir} ${_ir} 0 0 1 ${_L2x} ${_L2y} L ${_L1x} ${_L1y} Z`;
    try {
      const _p=new Path2D(_outerPath+' '+_h1+' '+_h2);
      ctx.fill(_p,'nonzero');
      if(sw>0){
        ctx.beginPath();ctx.arc(_ccx,_ccy,_cr,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.arc(_ccx,_ccy,_ir,0,Math.PI*2);ctx.stroke();
        const _tOut=Math.sqrt(_cr*_cr-_hw*_hw);
        ctx.beginPath();
        ctx.moveTo(_ccx+_tOut*_s2-_hw*_s2,_ccy-_tOut*_s2-_hw*_s2);ctx.lineTo(_R1x,_R1y);
        ctx.moveTo(_R2x,_R2y);ctx.lineTo(_ccx-_tOut*_s2-_hw*_s2,_ccy+_tOut*_s2-_hw*_s2);
        ctx.moveTo(_ccx+_tOut*_s2+_hw*_s2,_ccy-_tOut*_s2+_hw*_s2);ctx.lineTo(_L1x,_L1y);
        ctx.moveTo(_L2x,_L2y);ctx.lineTo(_ccx-_tOut*_s2+_hw*_s2,_ccy+_tOut*_s2+_hw*_s2);
        ctx.stroke();
      }
    } catch(e){ ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);ctx.fill(); }
    ctx.restore();
  } else if(special==='callout') {
    ctx.save();
    ctx.fillStyle=fill;if(sw>0){ctx.strokeStyle=d.stroke||'#1d4ed8';ctx.lineWidth=sw;}
    ctx.beginPath();ctx.roundRect(x,y,w,h*0.75,+(d.rx||12)*Math.min(sx,sy));ctx.fill();if(sw>0)ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+w*0.3,y+h*0.75);ctx.lineTo(x+w*0.2,y+h);ctx.lineTo(x+w*0.45,y+h*0.75);ctx.fill();
    ctx.restore();
  } else if(sh&&sh.path&&/[QqCc]/.test(sh.path)) {
    // Path with curves (Q/C): use Path2D with scaled coordinates
    ctx.save();ctx.fillStyle=fill;
    if(sw>0){ctx.strokeStyle=d.stroke||'#1d4ed8';ctx.lineWidth=sw;}
    try {
      const _scaledPath=sh.path.replace(/([-\d.]+(?:\.\d+)?)/g,(v,_,off,str)=>{
        const nums=(str.slice(0,off).match(/([-\d.]+(?:\.\d+)?)/g)||[]).length;
        return nums%2===0?String(x+(+v-5)/90*w):String(y+(+v-5)/90*h);
      });
      const _p2=new Path2D(_scaledPath);ctx.fill(_p2);if(sw>0)ctx.stroke(_p2);
    } catch(e){ ctx.fillRect(x,y,w,h); }
    ctx.restore();
  } else if(sh&&sh.path){
    // Generic path-based shape: parse M/L/Z and scale from 0-100 space
    const pts=[];let mx=0,my=0;
    const re=/([ML])\s*([\d.]+)[,\s]+([\d.]+)/g;let m2;
    while((m2=re.exec(sh.path))!==null){const px=x+(+m2[2]-5)/90*w,py=y+(+m2[3]-5)/90*h;if(m2[1]==='M'){ctx.beginPath();ctx.moveTo(px,py);}else ctx.lineTo(px,py);}
    ctx.closePath();ctx.fill();if(sw>0)ctx.stroke();
  } else {
    ctx.fillRect(x,y,w,h);if(sw>0)ctx.strokeRect(x,y,w,h);
  }
  ctx.restore();
  // Draw shape text if present
  if(d.shapeHtml||d.shapeText){
    const txt=(d.shapeText||(d.shapeHtml||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim());
    if(txt){
      ctx.save();
      const fs=Math.max(7,Math.min(14,(h*0.22)));
      ctx.font=`bold ${fs}px sans-serif`;
      // Parse text color from shapeTextCss
      let textColor='#ffffff';
      if(d.shapeTextCss){
        const cm=d.shapeTextCss.match(/\bcolor\s*:\s*([^;]+)/i);
        if(cm) textColor=cm[1].trim();
      }
      ctx.fillStyle=textColor;
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.globalAlpha=0.95;
      // Simple word wrap for thumbnail
      const maxW=w*0.85;
      const words=txt.split(' ');
      let line='',lines=[];
      for(const word of words){
        const test=line?line+' '+word:word;
        if(ctx.measureText(test).width>maxW&&line){lines.push(line);line=word;}
        else line=test;
      }
      if(line)lines.push(line);
      const lh=fs*1.25;
      const cy2=y+h/2-(lines.length-1)*lh/2;
      lines.forEach((l,i)=>ctx.fillText(l,x+w/2,cy2+i*lh,maxW));
      ctx.restore();
    }
  }
}

function drawRoundRect(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}
function drawStar(ctx,cx,cy,rx,ry,pts){
  ctx.beginPath();
  for(let i=0;i<pts*2;i++){const a=i*Math.PI/pts-Math.PI/2;const r2=i%2===0?1:.4;ctx.lineTo(cx+Math.cos(a)*rx*r2,cy+Math.sin(a)*ry*r2);}
  ctx.closePath();
}

// Image cache for thumbnails
const _thumbImgCache={};
function _isCanvasExport(){ return !!window._canvasExportSession; }
function _exportCanvasImgKey(key){
  const ses=window._canvasExportSession;
  const img=(ses&&ses.imgCache&&key)?ses.imgCache[key]:null;
  return (img&&img.src&&String(img.src).startsWith('data:'))?img:null;
}
function _exportCanvasImg(src){
  const ses=window._canvasExportSession;
  if(!ses||!src) return null;
  const ic=ses.imgCache||{};
  if(ic[src]&&ic[src].src&&String(ic[src].src).startsWith('data:')) return ic[src];
  if(ses.dataCache&&typeof _exportCacheGetData==='function'){
    const du=_exportCacheGetData(ses.dataCache,src);
    if(du&&ic[du]&&ic[du].src&&String(ic[du].src).startsWith('data:')) return ic[du];
  }
  if(typeof _exportSrcKeys==='function'){
    for(const k of _exportSrcKeys(src)){
      if(ic[k]&&ic[k].src&&String(ic[k].src).startsWith('data:')) return ic[k];
    }
  }
  return null;
}
function _safeDrawExportImage(ctx,img,a,b,c,d,e,f,g,h){
  if(!img||!img.src||!String(img.src).startsWith('data:')) return false;
  if(arguments.length===6) ctx.drawImage(img,a,b,c,d);
  else if(arguments.length===10) ctx.drawImage(img,a,b,c,d,e,f,g,h);
  else ctx.drawImage(img,a,b);
  return true;
}
function drawThumbApplet(ctx,d,sx,sy){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  if(w<2||h<2) return;
  ctx.save();
  if(d.rot){ctx.translate(x+w/2,y+h/2);ctx.rotate(d.rot*Math.PI/180);ctx.translate(-(x+w/2),-(y+h/2));}
  const icons={calculator:'⌨',clock:'🕐',timer:'⏱',notes:'📝',qr:'▦',generator:'🎲'};
  const ic=icons[d.appletId]||'◫';
  ctx.fillStyle='rgba(99,102,241,0.22)';
  ctx.strokeStyle='rgba(129,140,248,0.55)';
  ctx.lineWidth=Math.max(0.5,Math.min(sx,sy));
  const rx=Math.min(+(d.rx||0)*Math.min(sx,sy),w/2,h/2);
  if(rx>0){drawRoundRect(ctx,x,y,w,h,rx);ctx.fill();ctx.stroke();}
  else{ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);}
  ctx.font=`${Math.max(7,Math.min(w,h)*0.32)}px sans-serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='rgba(255,255,255,0.85)';
  ctx.fillText(ic,x+w/2,y+h/2);
  ctx.restore();
}

function drawThumbPagenum(ctx,d,sx,sy){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  ctx.save();
  ctx.fillStyle='rgba(255,255,255,0.35)';
  ctx.font=`${Math.max(5,w*0.35)}px sans-serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  const txt=(d.html||'1').replace(/<[^>]+>/g,'').trim()||'1';
  ctx.fillText(txt,x+w/2,y+h/2,w);
  ctx.restore();
}

function drawThumbMedia(ctx,d,sx,sy){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  ctx.save();
  if(d.rot){ctx.translate(x+w/2,y+h/2);ctx.rotate(d.rot*Math.PI/180);ctx.translate(-(x+w/2),-(y+h/2));}
  ctx.fillStyle='rgba(15,23,42,0.75)';
  ctx.strokeStyle='rgba(148,163,184,0.45)';
  ctx.lineWidth=Math.max(0.5,Math.min(sx,sy));
  ctx.fillRect(x,y,w,h);
  ctx.strokeRect(x,y,w,h);
  ctx.fillStyle='rgba(255,255,255,0.7)';
  ctx.font=`${Math.max(8,Math.min(w,h)*0.28)}px sans-serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(d.type==='mediaaudio'?'♪':'▶',x+w/2,y+h/2);
  ctx.restore();
}

function drawThumbImage(ctx,d,sx,sy,slideIdx){
  if(!d.src)return;
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  const cL=d.imgCropL||0,cT=d.imgCropT||0,cR=d.imgCropR||0,cB=d.imgCropB||0;
  const hasCrop=cL||cT||cR||cB;
  const drawIt=(img)=>{
    if(_isCanvasExport()&&(!img||!img.src||!String(img.src).startsWith('data:'))) return;
    ctx.save();
    if(d.rot){ctx.translate(x+w/2,y+h/2);ctx.rotate(d.rot*Math.PI/180);ctx.translate(-(x+w/2),-(y+h/2));}
    if(hasCrop){const fW=(d.w+cL+cR)*sx,fH=(d.h+cT+cB)*sy;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,x-cL*sx,y-cT*sy,fW,fH);ctx.restore();}
    else{ctx.drawImage(img,x,y,w,h);}
    ctx.restore();
  };
  if(_isCanvasExport()){
    const img=_exportCanvasImg(d.src);
    if(img) drawIt(img);
    return;
  }
  if(_thumbImgCache[d.src]){drawIt(_thumbImgCache[d.src]);return;}
  const img=new Image();
  img.onload=()=>{_thumbImgCache[d.src]=img;if(slideIdx!=null)_refreshThumbSlide(slideIdx);else drawThumbs(true);};
  img.onerror=()=>{};
  img.src=typeof assetUrl==='function'?assetUrl(d.src):d.src;
  ctx.save();ctx.fillStyle="rgba(255,255,255,0.1)";ctx.fillRect(x,y,w,h);ctx.restore();
}

function drawThumbCode(ctx,d,sx,sy){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  const theme=d.codeTheme||'dark';
  const T=CODE_THEMES[theme]||CODE_THEMES.dark;
  ctx.save();
  ctx.fillStyle=d.codeGlass?(theme==='light'?'rgba(248,249,250,0.58)':'rgba(13,17,23,0.58)'):T.bg;
  ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='rgba(128,128,128,.2)';ctx.lineWidth=0.5;ctx.strokeRect(x,y,w,h);
  // Draw simulated code lines
  const lh=(d.codeFs||13)*sx*1.4;
  const raw=d.codeRaw||'';const lines=raw.split('\n').slice(0,Math.floor(h/lh));
  ctx.font=`${Math.max(4,(d.codeFs||13)*sx*0.85)}px monospace`;
  lines.forEach((line,i)=>{
    const iy=y+6*sy+(i+1)*lh;if(iy>y+h-4)return;
    // Color-code simple patterns
    const isKw=/^\s*(const|let|var|function|def|class|if|return|import|from)\b/.test(line);
    ctx.fillStyle=isKw?T.kw:line.includes('//')||line.includes('#')?T.cmt:T.text;
    ctx.fillText(line.substring(0,Math.floor(w/(Math.max(4,(d.codeFs||13)*sx*0.85)*0.6))),x+8*sx,iy);
  });
  ctx.restore();
}

function drawThumbMarkdown(ctx,d,sx,sy){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  ctx.save();
  ctx.fillStyle='rgba(255,255,255,0.03)';ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=0.5;ctx.strokeRect(x,y,w,h);
  // Parse markdown for visual preview
  const raw=d.mdRaw||'';
  const lines=raw.split('\n').slice(0,20);
  let iy=y+12*sy;
  lines.forEach(line=>{
    if(iy>y+h-8)return;
    const isH1=/^#\s/.test(line);const isH2=/^##\s/.test(line);
    const isBullet=/^[-*]\s/.test(line);
    const fs=isH1?Math.max(5,(d.mdFs||16)*sx*1.2):isH2?Math.max(4,(d.mdFs||16)*sx*1.0):Math.max(4,(d.mdFs||16)*sx*0.75);
    ctx.font=`${isH1||isH2?'bold ':''} ${fs}px Inter,sans-serif`;
    ctx.fillStyle=isH1||isH2?'#fff':'rgba(255,255,255,.6)';
    const txt=line.replace(/^#+\s/,'').replace(/^[-*]\s/,isBullet?'• ':'');
    ctx.fillText(txt.substring(0,Math.floor(w/(fs*0.55))),x+(isBullet?14:8)*sx,iy);
    iy+=fs*1.5;
    if(isH1){ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(x+6*sx,iy,w*0.7,0.5);iy+=4;}
  });
  ctx.restore();
}

// Icon SVG cache: svgContent string → HTMLImageElement (loaded)
const _thumbIconCache={};

function drawThumbIcon(ctx,d,sx,sy,slideIdx){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  ctx.save();
  if(d.rot){ctx.translate(x+w/2,y+h/2);ctx.rotate(d.rot*Math.PI/180);ctx.translate(-(x+w/2),-(y+h/2));}

  // Build SVG with explicit pixel dimensions so browser scales it correctly
  // (SVGs without width/height may render at native viewBox size, causing wrong scale)
  const ic=typeof ICONS!=='undefined'?ICONS.find(function(e){return e.id===d.iconId;}):null;
  let svgStr=d.svgContent||'';
  if(ic&&typeof _buildIconSVG==='function'){
    svgStr=_buildIconSVG(ic,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle||'stroke',d.shadow===true||d.shadow==='true',d.shadowBlur,d.shadowColor);
  }
  // Replace style="width:100%;height:100%..." with explicit pixel size
  const pw=Math.round(w), ph=Math.round(h);
  const svgSized=svgStr.replace(/<svg /,'<svg width="'+pw+'" height="'+ph+'" ');

  if(svgSized){
    if(_isCanvasExport()){
      const img=_exportCanvasImgKey('icon_'+d.id);
      if(img) _safeDrawExportImage(ctx,img,x,y,w,h);
      ctx.restore();
      return;
    }
    const key=svgSized;
    if(_thumbIconCache[key]){
      ctx.drawImage(_thumbIconCache[key],x,y,w,h);
    } else if(_thumbIconCache[key]!==null){
      _thumbIconCache[key]=null;
      const blob=new Blob([svgSized],{type:'image/svg+xml'});
      const url=URL.createObjectURL(blob);
      const img=new Image();
      img.onload=()=>{
        _thumbIconCache[key]=img;
        URL.revokeObjectURL(url);
        if(slideIdx!=null) _refreshThumbSlide(slideIdx);
        else{
          slides.forEach((s,i)=>{
            if(s.els&&s.els.some(e=>e.type==='icon'&&e.id===d.id)) _refreshThumbSlide(i);
          });
        }
      };
      img.onerror=()=>{URL.revokeObjectURL(url); delete _thumbIconCache[key];};
      img.src=url;
      ctx.fillStyle=d.iconColor||'#3b82f6';
      ctx.globalAlpha=0.6;
      ctx.beginPath();ctx.arc(x+w/2,y+h/2,Math.min(w,h)*0.3,0,Math.PI*2);ctx.fill();
    }
  } else {
    ctx.fillStyle=d.iconColor||'#3b82f6';
    ctx.globalAlpha=0.6;
    ctx.beginPath();ctx.arc(x+w/2,y+h/2,Math.min(w,h)*0.3,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

function drawThumbTable(ctx,d,sx,sy){
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  if(!d.rows||!d.cols)return;
  ctx.save();
  if(d.rot){ctx.translate(x+w/2,y+h/2);ctx.rotate(d.rot*Math.PI/180);ctx.translate(-(x+w/2),-(y+h/2));}
  const headerBg=d.headerBg||'#3b82f6';
  const cellBg=d.cellBg||'rgba(30,41,59,0.27)';
  const borderColor=d.borderColor||'#3b82f680';
  const bw=Math.max(0.5,(d.borderW||1)*Math.min(sx,sy));
  // Row heights and col widths (fractional)
  const rhs=(d.rowHeights||Array(d.rows).fill(1/d.rows)).map(f=>f*h);
  const cws=(d.colWidths||Array(d.cols).fill(1/d.cols)).map(f=>f*w);
  let cy=y;
  for(let r=0;r<d.rows;r++){
    const rh=rhs[r]||h/d.rows;
    let cx=x;
    for(let c=0;c<d.cols;c++){
      const cw=cws[c]||w/d.cols;
      const isH=d.headerRow&&r===0;
      // Parse cell bg color (may have alpha hex)
      const bgRaw=isH?headerBg:cellBg;
      ctx.fillStyle=bgRaw.length>7?bgRaw.slice(0,7):bgRaw;
      ctx.globalAlpha=isH?1:0.4;
      ctx.fillRect(cx,cy,cw,rh);
      cx+=cw;
    }
    cy+=rh;
  }
  // Draw grid lines
  ctx.globalAlpha=0.7;
  ctx.strokeStyle=borderColor.length>7?borderColor.slice(0,7):borderColor;
  ctx.lineWidth=bw;
  // Horizontal lines
  let gy=y;
  for(let r=0;r<=d.rows;r++){
    ctx.beginPath();ctx.moveTo(x,gy);ctx.lineTo(x+w,gy);ctx.stroke();
    if(r<d.rows)gy+=rhs[r]||h/d.rows;
  }
  // Vertical lines
  let gx=x;
  for(let c=0;c<=d.cols;c++){
    ctx.beginPath();ctx.moveTo(gx,y);ctx.lineTo(gx,y+h);ctx.stroke();
    if(c<d.cols)gx+=cws[c]||w/d.cols;
  }
  ctx.restore();
}

function drawThumbDecorSvg(ctx,d,sx,sy,TW,TH,slideIdx){
  const _glR=d._decorRenderer;
  const _glCfg=d._glCfg||d._crystalCfg;
  const _isGl=typeof _isGlDecorRenderer==='function'?_isGlDecorRenderer(_glR):(_glR==='crystal'||_glR==='dna');
  if(!d.svgContent && !_isGl)return;
  const key=_isGl ? ('decor_gl_'+d.id) : ('decor_'+d.id);
  if(_isGl && _glCfg){
    const _renderStill=typeof _glDecorByRenderer==='function'&&_glDecorByRenderer(_glR)?_glDecorByRenderer(_glR).renderStill
      :(_glR==='crystal'&&typeof CrystalDecor!=='undefined'?CrystalDecor.renderStill
      :(_glR==='dna'&&typeof DnaDecor!=='undefined'?DnaDecor.renderStill:null));
    if(_renderStill){
      if(_thumbImgCache[key]){ctx.drawImage(_thumbImgCache[key],0,0,TW,TH);return;}
      const _compose=(_svgImg)=>{
        const out=document.createElement('canvas');
        out.width=TW; out.height=TH;
        const octx=out.getContext('2d');
        if(_svgImg) octx.drawImage(_svgImg,0,0,TW,TH);
        const still=_renderStill(_glCfg,TW,TH);
        if(still) octx.drawImage(still,0,0,TW,TH);
        _thumbImgCache[key]=out;
        _refreshThumbSlide(slideIdx);
      };
      if(d.svgContent){
        const blob=new Blob([d.svgContent],{type:'image/svg+xml'});
        const url=URL.createObjectURL(blob);
        const img=new Image();
        img.onload=()=>{URL.revokeObjectURL(url);_compose(img);};
        img.onerror=()=>{URL.revokeObjectURL(url);_compose(null);};
        img.src=url;
      } else _compose(null);
      return;
    }
  }
  if(!d.svgContent)return;
  if(_isCanvasExport()){
    const img=_exportCanvasImgKey(key);
    if(img) _safeDrawExportImage(ctx,img,0,0,TW,TH);
    return;
  }
  if(_thumbImgCache[key]){ctx.drawImage(_thumbImgCache[key],0,0,TW,TH);return;}
  const blob=new Blob([d.svgContent],{type:'image/svg+xml'});
  const url=URL.createObjectURL(blob);
  const img=new Image();
  img.onload=()=>{_thumbImgCache[key]=img;URL.revokeObjectURL(url);_refreshThumbSlide(slideIdx);};
  img.onerror=()=>{URL.revokeObjectURL(url);};
  img.src=url;
}

const _thumbSvgElCache={};
function drawThumbSvgEl(ctx,d,sx,sy,slideIdx){
  if(!d.svgContent)return;
  const x=Math.round(d.x*sx),y=Math.round(d.y*sy),w=Math.round(d.w*sx),h=Math.round(d.h*sy);
  if(w<1||h<1)return;
  const key='svgel_'+d.id+'_'+w+'x'+h;
  if(_isCanvasExport()){
    const img=_exportCanvasImgKey(key);
    if(img) _safeDrawExportImage(ctx,img,x,y,w,h);
    return;
  }
  if(_thumbSvgElCache[key]){ctx.drawImage(_thumbSvgElCache[key],x,y,w,h);return;}
  // Wrap svgContent in a sized SVG so it scales to our thumbnail cell
  let inner=d.svgContent.trim();
  // If it already is an <svg> root, use it; otherwise wrap
  const sized=inner.replace(/^<svg([^>]*)>/i,(m,attrs)=>{
    // Force width/height on the root svg
    const noWH=attrs.replace(/\s*width="[^"]*"/g,'').replace(/\s*height="[^"]*"/g,'');
    return `<svg${noWH} width="${w}" height="${h}">`;
  });
  const blob=new Blob([sized],{type:'image/svg+xml'});
  const url=URL.createObjectURL(blob);
  const img=new Image();
  img.onload=()=>{_thumbSvgElCache[key]=img;URL.revokeObjectURL(url);_refreshThumbSlide(slideIdx);};
  img.onerror=()=>{URL.revokeObjectURL(url);};
  img.src=url;
}

// Invalidate image cache on slide changes (decor colors update etc)
function invalidateThumbCache(){
  Object.keys(_thumbImgCache).forEach(k=>{if(k.startsWith('decor_'))delete _thumbImgCache[k];});
  Object.keys(_thumbSvgElCache).forEach(k=>delete _thumbSvgElCache[k]);
  const list=document.getElementById('slide-list');
  if(list) list._thumbsNeedFull=true;
}
function reorderSlidesBlock(indices, insertAt){
  const sorted=[...new Set(indices)].filter(i=>i>=0&&i<slides.length).sort((a,b)=>a-b);
  if(!sorted.length) return;
  if(sorted.length===1){reorderInsert(sorted[0],insertAt);return;}
  let to=insertAt;
  sorted.forEach(idx=>{if(idx<insertAt) to--;});
  if(to===sorted[0]) return;
  save();pushUndo();
  const listEl=document.getElementById('slide-list');if(listEl)listEl._thumbsNeedFull=true;
  const curRef=slides[cur];
  const selRefs=sorted.map(idx=>slides[idx]);
  const picked=sorted.map(idx=>slides[idx]);
  for(let k=sorted.length-1;k>=0;k--) slides.splice(sorted[k],1);
  slides.splice(to,0,...picked);
  cur=slides.indexOf(curRef);
  if(cur<0) cur=0;
  if(typeof slideMultiSel!=='undefined'){
    slideMultiSel.clear();
    selRefs.forEach(ref=>{
      const ni=slides.indexOf(ref);
      if(ni>=0) slideMultiSel.add(ni);
    });
  }
  renderAll();saveState();
}
function reorderInsert(from, insertAt){
  if(from===insertAt||from===insertAt-1) return;
  save();pushUndo();
  const listEl=document.getElementById('slide-list');if(listEl)listEl._thumbsNeedFull=true;
  const[r]=slides.splice(from,1);
  let to=insertAt;
  if(from<insertAt) to=insertAt-1;
  slides.splice(to,0,r);
  cur=to;
  renderAll();saveState();
}
function reorder(from,to){
  if(from===to)return;save();pushUndo();const[r]=slides.splice(from,1);slides.splice(to,0,r);cur=to;renderAll();saveState();
}
function renderAll(){
  load();
  requestAnimationFrame(()=>{ if(typeof drawThumbs==='function') drawThumbs(); });
}

// ── Formula thumbnail via SVG→Image ─────────────────────────────────────────
const _thumbFormulaCache={};
function drawThumbFormula(ctx,d,sx,sy,slideIdx){
  if(!d.formulaSvg)return;
  const key='formula_'+d.id+'_'+(d.formulaColor||'');
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  const color=d.formulaColor||'#ffffff';
  // Inject color into SVG for canvas rendering
  const coloredSvg=d.formulaSvg.replace(/currentColor/g,color);
  const svgBlob=`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(h)}">`+
    `<foreignObject width="100%" height="100%">`+
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${color};">`+
    coloredSvg+`</div></foreignObject></svg>`;
  if(_isCanvasExport()){
    const img=_exportCanvasImgKey('formula_'+d.id);
    if(img){_safeDrawExportImage(ctx,img,x,y,w,h);return;}
    ctx.save();ctx.globalAlpha=0.4;ctx.fillStyle=color;ctx.fillRect(x,y,w,h);ctx.restore();
    return;
  }
  if(_thumbFormulaCache[key]){
    ctx.drawImage(_thumbFormulaCache[key],x,y,w,h);return;
  }
  const blob=new Blob([svgBlob],{type:'image/svg+xml'});
  const url=URL.createObjectURL(blob);
  const img=new Image();
  img.onload=()=>{_thumbFormulaCache[key]=img;URL.revokeObjectURL(url);_refreshThumbSlide(slideIdx);};
  img.onerror=()=>{URL.revokeObjectURL(url);
    // fallback: draw colored rect
    ctx.save();ctx.globalAlpha=0.4;ctx.fillStyle=color;
    ctx.fillRect(x,y,w,h);ctx.restore();
  };
  img.src=url;
}

// ── Graph thumbnail via stored dataURL ──────────────────────────────────────
const _thumbGraphCache={};
function drawThumbGraph(ctx,d,sx,sy,slideIdx){
  if(!d.graphImg)return;
  const x=d.x*sx,y=d.y*sy,w=d.w*sx,h=d.h*sy;
  if(_isCanvasExport()){
    const img=_exportCanvasImg(d.graphImg);
    if(img) _safeDrawExportImage(ctx,img,x,y,w,h);
    return;
  }
  const key='graph_'+d.id+'_'+(d.graphColor||'')+'_'+(d.graphBg||'');
  if(_thumbGraphCache[key]){ctx.drawImage(_thumbGraphCache[key],x,y,w,h);return;}
  // Invalidate old cache entries for this element
  Object.keys(_thumbGraphCache).forEach(k=>{ if(k.startsWith('graph_'+d.id+'_')) delete _thumbGraphCache[k]; });
  const img=new Image();
  img.onload=()=>{_thumbGraphCache[key]=img;_refreshThumbSlide(slideIdx);};
  img.src=typeof assetUrl==='function'?assetUrl(d.graphImg):d.graphImg;
}

function drawThumbLego(ctx, d, sx, sy) {
  const U=40,SH=10,FH=12,TH=36,SW=26;
  const c = d.legoColor || '#e3000b';
  const blend = (hex,r2,g2,b2,t) => { const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return '#'+[r,g,b].map((v,i)=>Math.round(v+([r2,g2,b2][i]-v)*t).toString(16).padStart(2,'0')).join(''); };
  const dark = blend(c,0,0,0,0.28);

  if (d.legoStair) {
    const dir = d.legoStair;
    const bw = 2*U, totalH = SH+TH;
    const x=d.x*sx, y=d.y*sy;
    const yTop=y+SH*sy, yBot=y+totalH*sy, yVert=y+(SH+FH)*sy;
    // Inverted slope: top wide (2U), right side drops vertically to yVert, then diagonal to bottom-left
    ctx.fillStyle=c; ctx.beginPath();
    if(dir==='right'){ ctx.moveTo(x,yTop); ctx.lineTo(x+bw*sx,yTop); ctx.lineTo(x+bw*sx,yVert); ctx.lineTo(x+U*sx,yBot); ctx.lineTo(x,yBot); }
    else { ctx.moveTo(x,yTop); ctx.lineTo(x+bw*sx,yTop); ctx.lineTo(x+bw*sx,yBot); ctx.lineTo(x+U*sx,yBot); ctx.lineTo(x,yVert); }
    ctx.closePath(); ctx.fill();
    // shadow under narrow base
    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.fillRect(x+(dir==='right'?0:U)*sx, yBot-2*sy, U*sx, 2*sy);
    // two studs on top
    ctx.fillStyle=blend(c,0,0,0,0.18);
    for(let i=0;i<2;i++){ const sx2=x+(i*U+(U-SW)/2)*sx; ctx.beginPath(); ctx.roundRect(sx2,y,SW*sx,SH*sy,1); ctx.fill(); }
  } else if (d.legoSlope) {
    const dir = d.legoSlope;
    const n = d.legoStuds, bw=n*U, totalH=SH+TH;
    const x=d.x*sx, y=d.y*sy;
    const hiIdx=dir==='slope-right'?0:n-1, hiX=hiIdx*U;
    const yBodyTop=y+SH*sy, yBot=y+totalH*sy, yLoTop=yBot-FH*sy;
    // high block
    ctx.fillStyle=c; ctx.beginPath(); ctx.roundRect(x+hiX*sx, yBodyTop, U*sx, TH*sy, 1); ctx.fill();
    // slope trapezoid
    ctx.fillStyle=c; ctx.beginPath();
    if(dir==='slope-right'){ ctx.moveTo(x+U*sx,yBodyTop); ctx.lineTo(x+bw*sx,yLoTop); ctx.lineTo(x+bw*sx,yBot); ctx.lineTo(x+U*sx,yBot); }
    else { ctx.moveTo(x,yLoTop); ctx.lineTo(x+(n-1)*U*sx,yBodyTop); ctx.lineTo(x+(n-1)*U*sx,yBot); ctx.lineTo(x,yBot); }
    ctx.closePath(); ctx.fill();
    // shadow
    ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(x, yBot-2*sy, bw*sx, 2*sy);
    // stud
    ctx.fillStyle=blend(c,0,0,0,0.18);
    const sx2=x+(hiX+(U-SW)/2)*sx; ctx.beginPath(); ctx.roundRect(sx2,y,SW*sx,SH*sy,1); ctx.fill();
  } else {
    const bh = d.legoTall ? TH : FH;
    const bw = d.legoStuds * U;
    const x = d.x * sx, y = d.y * sy;
    const w = bw * sx, h = (bh+SH) * sy;
    const bodyY = y + SH*sy;
    const bodyH = bh * sy;
    // тело
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.roundRect(x, bodyY, w, bodyH, 1*sx);
    ctx.fill();
    // тень снизу
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x, bodyY+bodyH-2*sy, w, 2*sy);
    // пупырышки
    ctx.fillStyle = blend(c, 0, 0, 0, 0.18);
    for(let i=0;i<d.legoStuds;i++){
      const sx2 = x + (i*U + (U-SW)/2)*sx;
      const sw2 = SW*sx;
      ctx.beginPath();
      ctx.roundRect(sx2, y, sw2, SH*sy, 1*sx);
      ctx.fill();
    }
  }
}
function _blendHex(hex,r2,g2,b2,t){
  const h=hex.replace('#','');
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return '#'+[r,g,b].map((v,i)=>Math.round(v+([r2,g2,b2][i]-v)*t).toString(16).padStart(2,'0')).join('');
}
