// ══════════════ SLIDES ══════════════
let _slideClipboard = null;

function _cloneSlideData(src, stripDecor){
  const copy = JSON.parse(JSON.stringify(src));
  if(stripDecor) copy.els = (copy.els || []).filter(d => !d._isDecor);
  return copy;
}

function _remapSlideElIds(s){
  const map = {};
  const oldIds = (s.els || []).map(d => d.id);
  oldIds.forEach(old => { map[old] = 'e' + (++ec); });
  if (s.animOrder) {
    s.animOrder.forEach(entry => {
      if (entry.elId && map[entry.elId]) entry.elId = map[entry.elId];
    });
  }
  (s.els || []).forEach((d, i) => {
    const oldId = oldIds[i];
    d.id = map[oldId];
    _remapClonedElementRefs(d, oldId, d.id, map);
  });
  if(s.connectors){
    s.connectors.forEach(c => {
      if(c.fromId && map[c.fromId]) c.fromId = map[c.fromId];
      if(c.toId && map[c.toId]) c.toId = map[c.toId];
    });
  }
}

function _mapClonedElId(tid, oldId, newId, idMap) {
  if (!tid) return tid;
  if (tid === oldId) return newId;
  if (idMap && idMap[tid]) return idMap[tid];
  return tid;
}

function _remapClonedElementRefs(d, oldId, newId, idMap) {
  if (d.anims && d.anims.length) {
    d.anims.forEach(a => {
      if (a.triggerElId) a.triggerElId = _mapClonedElId(a.triggerElId, oldId, newId, idMap);
    });
  }
  if (d.maTriggerElId) d.maTriggerElId = _mapClonedElId(d.maTriggerElId, oldId, newId, idMap);
  if (d.maTriggerElIds && d.maTriggerElIds.length) {
    d.maTriggerElIds = d.maTriggerElIds.map(tid => _mapClonedElId(tid, oldId, newId, idMap));
  }
  if (d.hfLinkedCodeId) d.hfLinkedCodeId = _mapClonedElId(d.hfLinkedCodeId, oldId, newId, idMap);
  if (d.hfParentId) d.hfParentId = _mapClonedElId(d.hfParentId, oldId, newId, idMap);
}

function _freshElementDataFromDom(elId) {
  const s = slides[cur];
  if (!s) return null;
  const d = s.els.find(x => x.id === elId);
  if (!d) return null;
  const fresh = JSON.parse(JSON.stringify(d));
  const cv = document.getElementById('canvas');
  const dom = cv && cv.querySelector('.el[data-id="' + elId + '"]');
  if (dom) {
    if (dom.dataset.anims) {
      try { fresh.anims = JSON.parse(dom.dataset.anims); } catch (e) {}
    }
    if (dom.dataset.isTrigger === 'true') fresh.isTrigger = true;
    else delete fresh.isTrigger;
  }
  return fresh;
}

function _copyElementDataList(elIds) {
  if (typeof save === 'function') save();
  return elIds.map(elId => _freshElementDataFromDom(elId)).filter(Boolean);
}

function _cloneElementDataList(els, opts) {
  opts = opts || {};
  const idMap = {};
  const pairs = els.map(d => {
    const nd = JSON.parse(JSON.stringify(d));
    const oldId = nd.id;
    nd.id = 'e' + (++ec);
    idMap[oldId] = nd.id;
    return { oldId, nd };
  });
  pairs.forEach(({ oldId, nd }) => _remapClonedElementRefs(nd, oldId, nd.id, idMap));
  if (opts.offset) {
    const off = opts.offset;
    pairs.forEach(({ nd }) => { nd.x = (nd.x || 0) + off; nd.y = (nd.y || 0) + off; });
  }
  return pairs.map(p => p.nd);
}

function _syncSlideAnimsFromDom(slideIdx) {
  const si = slideIdx != null ? slideIdx : cur;
  const s = slides[si];
  const cv = document.getElementById('canvas');
  if (!s || !cv) return;
  cv.querySelectorAll('.el[data-id]').forEach(el => {
    const d = s.els.find(x => x.id === el.dataset.id);
    if (!d || el.dataset.anims == null) return;
    try { d.anims = JSON.parse(el.dataset.anims); } catch (e) {}
    if (el.dataset.isTrigger === 'true') d.isTrigger = true;
    else delete d.isTrigger;
  });
}

function _buildSlideObject(tmpl){
  const curSlide = slides[cur];
  const inheritBg = curSlide ? curSlide.bg : 'b1';
  const inheritBgc = curSlide ? curSlide.bgc : null;
  const inheritBgImg = curSlide && curSlide.bgImg ? JSON.parse(JSON.stringify(curSlide.bgImg)) : null;
  const s = {title: (typeof defaultSlideTitle === 'function' ? defaultSlideTitle(slides.length + 1) : ('Слайд ' + (slides.length + 1))), bg:inheritBg, bgc:inheritBgc, ar, trans:'', auto:0, els:[]};
  if(inheritBgImg) s.bgImg = inheritBgImg;
  if(tmpl){
    const t = JSON.parse(JSON.stringify(tmpl));
    Object.assign(s, t);
    s.els = t.els || [];
    s.trans = t.trans != null ? t.trans : '';
  }
  return s;
}

function insertSlidesAt(insertAt, slideObjs, addDecor){
  pushUndo();
  insertAt = Math.max(0, Math.min(insertAt, slides.length));
  slideObjs.forEach(s => _remapSlideElIds(s));
  slides.splice(insertAt, 0, ...slideObjs);
  if(addDecor && typeof makeDecorEl === 'function' && typeof selLayout !== 'undefined' && selLayout >= 0){
    slideObjs.forEach((s, k) => {
      const d = makeDecorEl(insertAt + k);
      if(d) s.els.unshift(d);
    });
  }
  cur = insertAt + slideObjs.length - 1;
  renderAll(); saveState();
}

function insertSlideAt(insertAt, s, addDecor){
  insertSlidesAt(insertAt, [s], addDecor);
}

function addSlide(tmpl, insertAt){
  save();
  if(insertAt == null) insertAt = slides.length > 0 ? cur + 1 : 0;
  else insertAt = Math.max(0, Math.min(insertAt, slides.length));
  insertSlideAt(insertAt, _buildSlideObject(tmpl), true);
}

function dupSlide(){
  if(!slides.length) return;
  dupSlideAt(cur);
}

function dupSlideAt(i){
  if(!slides[i]) return;
  save();
  insertSlideAt(i + 1, _buildSlideObject(_cloneSlideData(slides[i], true)), true);
}

function clearSlideMultiSel(){
  slideMultiSel.clear();
}

function getSlideSelection(){
  if(slideMultiSel.size > 0) return [...slideMultiSel].sort((a, b) => a - b);
  return [cur];
}

function pickSlideWithMod(i, e){
  const ctrl = e && (e.ctrlKey || e.metaKey);
  const shift = e && e.shiftKey;
  if(shift){
    save();
    const anchor = slideSelAnchor != null ? slideSelAnchor : cur;
    const from = Math.min(anchor, i);
    const to = Math.max(anchor, i);
    slideMultiSel.clear();
    for(let j = from; j <= to; j++) slideMultiSel.add(j);
    cur = i;
    load();
    drawThumbs();
    return;
  }
  if(ctrl){
    if(slideMultiSel.size === 0){
      slideMultiSel.add(cur);
      slideSelAnchor = cur;
    }
    if(slideMultiSel.has(i)){
      slideMultiSel.delete(i);
      if(slideMultiSel.size === 0){
        pickSlide(i);
        return;
      }
      if(cur === i){
        cur = [...slideMultiSel].sort((a, b) => a - b)[0];
        load();
      } else {
        drawThumbs();
      }
      slideSelAnchor = i;
    } else {
      slideMultiSel.add(i);
      slideSelAnchor = i;
      save();
      cur = i;
      load();
      drawThumbs();
    }
    return;
  }
  clearSlideMultiSel();
  pickSlide(i);
}

function copySlidesSelected(){
  const indices = getSlideSelection();
  if(!indices.length) return;
  save();
  _slideClipboard = indices.map(idx => _cloneSlideData(slides[idx], true));
  if(typeof _xclipSaveSlides==='function') _xclipSaveSlides(_slideClipboard);
  if(typeof window._markSlideClipboardCopy==='function') window._markSlideClipboardCopy();
  if(typeof toast==='function'){
    const msg=indices.length>1
      ? (typeof t==='function'?t('ctxCopySlidesN').replace('{n}', String(indices.length)):'Copied '+indices.length+' slides')
      : (typeof t==='function'?t('toastCopied'):'Copied');
    toast(msg,'ok');
  }
}

function copySlideAt(i){
  if(!slides[i]) return;
  _slideClipboard = [_cloneSlideData(slides[i], true)];
  if(typeof _xclipSaveSlides==='function') _xclipSaveSlides(_slideClipboard);
  if(typeof window._markSlideClipboardCopy==='function') window._markSlideClipboardCopy();
}

function hasSlideClipboard(){
  if(_slideClipboard && _slideClipboard.length) return true;
  if(typeof _xclipHydrateSlides==='function') _xclipHydrateSlides();
  return !!(_slideClipboard && _slideClipboard.length);
}

function pasteSlideAt(atIdx){
  if(typeof _xclipHydrateSlides==='function') _xclipHydrateSlides();
  if(!hasSlideClipboard()) return;
  save();
  const toInsert = _slideClipboard.map(s => _buildSlideObject(_cloneSlideData(s, false)));
  insertSlidesAt(atIdx, toInsert, true);
  slideMultiSel.clear();
  toInsert.forEach((_, k) => slideMultiSel.add(atIdx + k));
  drawThumbs();
}

function deleteSlidesSelected(){
  deleteSlidesAt(getSlideSelection());
}

function deleteSlidesAt(indices){
  const uniq = [...new Set(indices)].filter(i => i >= 0 && i < slides.length).sort((a, b) => a - b);
  if(!uniq.length) return;
  if(slides.length - uniq.length < 1) return toast(t('toastNeedSlide'));
  save();
  pushUndo();
  const wasCur = cur;
  for(let k = uniq.length - 1; k >= 0; k--) slides.splice(uniq[k], 1);
  let newCur = wasCur;
  uniq.forEach(i => { if(i < newCur) newCur--; });
  if(uniq.includes(wasCur)) newCur = Math.min(newCur, slides.length - 1);
  cur = Math.max(0, newCur);
  clearSlideMultiSel();
  renderAll(); saveState();
  if(typeof renderAnimPanel === 'function') renderAnimPanel();
  if(typeof renderMotionOverlay === 'function') renderMotionOverlay();
}

function delSlide(){
  const sel = getSlideSelection();
  if(sel.length > 1) deleteSlidesSelected();
  else delSlideAt(sel[0]);
}

function delSlideAt(i){
  deleteSlidesAt([i]);
}

function pickSlide(i, keepMultiSel){
  if(typeof tblClearSel === 'function') tblClearSel();
  if(typeof window.stopSlideAnimsOnCanvas === 'function') window.stopSlideAnimsOnCanvas();
  save();
  cur = i;
  slideSelAnchor = i;
  if(!keepMultiSel) clearSlideMultiSel();
  load();
  drawThumbs();
  saveState();
}

function save(){
  if(typeof window._isPreviewActive==='function'&&window._isPreviewActive())return;
  if(window._pvRestoring)return;
  if(!slides[cur])return;
  const canvas=document.getElementById('canvas');
  // Build lookup of existing decor flags before overwriting
  const decorMeta={};
  const oldEls=slides[cur].els||[]; // snapshot BEFORE overwriting
  oldEls.forEach(d=>{if(d._isDecor)decorMeta[d.id]={_isDecor:true,_decorStyle:d._decorStyle,_layoutIdx:d._layoutIdx,_decorRenderer:d._decorRenderer,_glCfg:d._glCfg||d._crystalCfg,_crystalCfg:d._crystalCfg};});
  const oldElsById={}; oldEls.forEach(d=>oldElsById[d.id]=d);
  // Snapshot table data keyed by id so the table branch below always finds fresh data
  const tableSnap={}; oldEls.forEach(d=>{if(d.type==='table')tableSnap[d.id]=d;});
  const _seenIds=new Set();
  slides[cur].els=Array.from(canvas.querySelectorAll('.el')).filter(el=>{
    if(el.classList.contains('motion-ghost')) return false;
    const id=el.dataset.id;
    if(!id) return true;
    if(_seenIds.has(id)) return false;
    _seenIds.add(id);
    return true;
  }).map(el=>{
    const _prev=oldElsById[el.dataset.id];
    const _inCrop=el.dataset.cropMode==='true'&&_prev;
    const d={id:el.dataset.id,type:el.dataset.type,
      x:_inCrop?_prev.x:parseInt(el.style.left),y:_inCrop?_prev.y:parseInt(el.style.top),
      w:_inCrop?_prev.w:parseInt(el.style.width),h:_inCrop?_prev.h:parseInt(el.style.height),
      rot:el.dataset.rot?+el.dataset.rot:0,
      rotPivotX:el.dataset.rotPivotX?+el.dataset.rotPivotX:0,
      rotPivotY:el.dataset.rotPivotY?+el.dataset.rotPivotY:0,
      anims:el.dataset.anims?JSON.parse(el.dataset.anims):[],
      isTrigger:el.dataset.isTrigger==='true',
    };
    if(el.dataset.link)d.link=el.dataset.link;if(el.dataset.linkt)d.linkt=el.dataset.linkt;
    if(el.dataset.morphName)d.morphName=el.dataset.morphName; else if(_prev&&_prev.morphName)d.morphName=_prev.morphName;
    if(el.dataset.rideConnId)d.rideConnId=el.dataset.rideConnId;
    else if(_prev&&_prev.rideConnId)d.rideConnId=_prev.rideConnId;
    if(d.type==='text'){const c=el.querySelector('.ec');
      const vw=c&&c.querySelector('.ec-valign-wrap');
      const root=(typeof _rtContent==='function'&&c)?_rtContent(c):c;
      d.html = el.dataset._savedHtml != null
        ? el.dataset._savedHtml
        : (vw ? vw.innerHTML : (root ? root.innerHTML : (c ? c.innerHTML : '')));
      // Strip layout/background props from cs (stored separately or computed dynamically)
      let cs=c.getAttribute('style')||'';
      cs=cs.replace(/\bbackground\s*:[^;]+;?/gi,'')
           .replace(/-webkit-background-clip\s*:[^;]+;?/gi,'')
           .replace(/\bbackground-clip\s*:[^;]+;?/gi,'')
           .replace(/-webkit-text-fill-color\s*:[^;]+;?/gi,'')
           .replace(/\bdisplay\s*:[^;]+;?/gi,'')
           .replace(/\bflex-direction\s*:[^;]+;?/gi,'')
           .replace(/\bjustify-content\s*:[^;]+;?/gi,'')
           .replace(/\bpadding-top\s*:[^;]+;?/gi,'')
           .replace(/\banimation\s*:[^;]+;?/gi,'')
           .replace(/\s{2,}/g,' ').trim();
      d.cs=cs;
      // Preserve scheme refs — not stored in DOM, only in data object
      const _od=oldElsById[d.id];
      if(_od){
        if(_od.textColorScheme!==undefined)d.textColorScheme=_od.textColorScheme;
        if(_od.textBgScheme!==undefined)d.textBgScheme=_od.textBgScheme;
        if(_od.borderScheme!==undefined)d.borderScheme=_od.borderScheme;
        if(_od.textShadowScheme!==undefined)d.textShadowScheme=_od.textShadowScheme;
      }
      if(el.dataset.valign)d.valign=el.dataset.valign;
      if(el.dataset.textBg)d.textBg=el.dataset.textBg;
      // Save textBgOp whenever textBg OR gradient is active
      if(el.dataset.textBg||el.dataset.textBgGrad==='1'){d.textBgOp=el.dataset.textBgOp!=null?+el.dataset.textBgOp:1;}
      else if(el.dataset.textBgOp!=null){d.textBgOp=+el.dataset.textBgOp;}
      if(el.dataset.textBgBlur>0)d.textBgBlur=+el.dataset.textBgBlur;
      if(el.dataset.textBgGrad==='1'){d.textBgGrad=true;} else {delete d.textBgGrad;}
      if(el.dataset.textBgCol2)d.textBgCol2=el.dataset.textBgCol2; else delete d.textBgCol2;
      if(el.dataset.textBgDir!=null)d.textBgDir=+el.dataset.textBgDir; else delete d.textBgDir;
      if(el.dataset.textColorGrad==='1'){d.textColorGrad=true;d.textColorGrad1=el.dataset.textColorGrad1||'';d.textColorGrad2=el.dataset.textColorGrad2||'';d.textColorGradDir=+(el.dataset.textColorGradDir||90);}else{delete d.textColorGrad;delete d.textColorGrad1;delete d.textColorGrad2;delete d.textColorGradDir;}
      // Table bg opacity/blur — stored in dataset.tableData via _tblSaveToDataset
      if(d.type==='table'&&_od){
        if(_od.tableBgOp!=null)d.tableBgOp=_od.tableBgOp;
        if(_od.tableBgBlur!=null)d.tableBgBlur=_od.tableBgBlur;
      }
      if(el.dataset.textRole)d.textRole=el.dataset.textRole;
      if(el.dataset.bulletGap!=null)d.bulletGap=+el.dataset.bulletGap;
      if(el.dataset.textBorderW&&+el.dataset.textBorderW>0){d.textBorderW=+el.dataset.textBorderW;d.textBorderColor=el.dataset.textBorderColor||'#ffffff';d.textBorderStyle=el.dataset.textBorderStyle||'solid';}
      const _tss=+(el.dataset.textShadowSize||0), _tsb=+(el.dataset.textShadowBlur||0), _tsw=+(el.dataset.textShadowW||0);
      if(_tss>0||_tsb>0||_tsw>0){
        if(_tsb>0)d.textShadowBlur=_tsb;
        if(_tss>0)d.textShadowSize=_tss;
        if(!d.textShadowBlur&&!d.textShadowSize&&_tsw>0)d.textShadowW=_tsw;
        d.textShadowColor=el.dataset.textShadowColor||'#000000';
      }else{
        delete d.textShadowBlur; delete d.textShadowSize; delete d.textShadowW; delete d.textShadowColor;
      }
      const _tbss=+(el.dataset.textBlockShadowSize||0), _tbsb=+(el.dataset.textBlockShadowBlur||0);
      if(_tbss>0||_tbsb>0){
        if(_tbsb>0)d.textBlockShadowBlur=_tbsb; else delete d.textBlockShadowBlur;
        if(_tbss>0)d.textBlockShadowSize=_tbss; else delete d.textBlockShadowSize;
        d.textBlockShadowColor=el.dataset.textBlockShadowColor||'#000000';
        d.textBlockShadowInset=el.dataset.textBlockShadowInset==='1';
      }else{
        delete d.textBlockShadowBlur; delete d.textBlockShadowSize; delete d.textBlockShadowColor; delete d.textBlockShadowInset;
      }
      if(+(el.dataset.rx_tl||0)||+(el.dataset.rx_tr||0)||+(el.dataset.rx_bl||0)||+(el.dataset.rx_br||0)){
        d.rx_tl=+(el.dataset.rx_tl||0);d.rx_tr=+(el.dataset.rx_tr||0);
        d.rx_bl=+(el.dataset.rx_bl||0);d.rx_br=+(el.dataset.rx_br||0);
        d.rxUnit=el.dataset.rxUnit||'px';
      }
      if(el.dataset.pad_t!==undefined){
        d.pad_t=+el.dataset.pad_t;d.pad_r=+el.dataset.pad_r;
        d.pad_b=+el.dataset.pad_b;d.pad_l=+el.dataset.pad_l;
        d.padUnit=el.dataset.padUnit||'px';
      }
    }
    if(d.type==='table'){
      // Primary: read from DOM dataset (written by renderTableEl every time table is drawn)
      // Fallback: use tableSnap from slides[cur].els
      let tdata=null;
      if(el.dataset.tableData){try{tdata=JSON.parse(el.dataset.tableData);}catch(e){}}
      const tsrc=tdata||tableSnap[d.id];
      if(tsrc){Object.keys(tsrc).forEach(k=>{ d[k]=tsrc[k]; });}
    }
    if(el.dataset.hoverFx){
      let _fx;
      try{ _fx=JSON.parse(el.dataset.hoverFx); }catch(e){ _fx=null; }
      if(_fx){
        const _prevD=oldElsById[d.id];
        if(_fx.base && _prevD){
          // The element may have moved/resized since fx.base was captured.
          // Shift base (and hover, to preserve the relative hover offset)
          // by the same delta so the hover effect doesn't snap back to a
          // stale position when the user later moves/resizes the element.
          const _dx=d.x-(_prevD.x||0), _dy=d.y-(_prevD.y||0);
          const _dw=d.w-(_prevD.w||0), _dh=d.h-(_prevD.h||0);
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
        d.hoverFx=_fx;
      }
    }
    if(el.dataset.elOpacity!=null&&+el.dataset.elOpacity!==1)d.elOpacity=+el.dataset.elOpacity;
    if(el.dataset.objHidden==='1')d.objHidden=true;else delete d.objHidden;
    if(el.dataset.groupId)d.groupId=el.dataset.groupId;else delete d.groupId;
    if(d.type==='image'){
      const dd=oldElsById[d.id];
      const _imgEl=el.querySelector('img');
      const _imgAttr=_imgEl?_imgEl.getAttribute('src'):'';
      d.src=(_imgAttr&&!_imgAttr.startsWith('blob:'))?_imgAttr:(_imgEl?_imgEl.src:(dd&&dd.src)||'');
      if(dd&&dd.src&&dd.src.startsWith('data:')&&(!d.src||!d.src.startsWith('data:'))) d.src=dd.src;
      d.imgFit=el.dataset.imgFit||(dd&&dd.imgFit)||'contain';
      d.imgRx=el.dataset.imgRx!=null?+el.dataset.imgRx:(dd&&dd.imgRx)||0;
      d.imgBw=el.dataset.imgBw!=null?+el.dataset.imgBw:(dd&&dd.imgBw)||0;
      d.imgBc=el.dataset.imgBc||(dd&&dd.imgBc)||'#ffffff';
      if(el.dataset.imgBorderStyle)d.imgBorderStyle=el.dataset.imgBorderStyle;
      else if(dd&&dd.imgBorderStyle)d.imgBorderStyle=dd.imgBorderStyle;
      if(el.dataset.imgFrame)d.imgFrame=el.dataset.imgFrame;
      else if(dd&&dd.imgFrame)d.imgFrame=dd.imgFrame;
      d.imgShadow=el.dataset.imgShadow==='true'||(dd&&dd.imgShadow)||false;
      d.imgShadowBlur=el.dataset.imgShadowBlur!=null?+el.dataset.imgShadowBlur:(dd&&dd.imgShadowBlur)||15;
      d.imgShadowSize=el.dataset.imgShadowSize!=null?+el.dataset.imgShadowSize:(dd&&dd.imgShadowSize!=null?dd.imgShadowSize:4);
      d.imgShadowColor=el.dataset.imgShadowColor||(dd&&dd.imgShadowColor)||'#000000';
      if(el.dataset.imgShadowColorScheme){try{d.imgShadowColorScheme=JSON.parse(el.dataset.imgShadowColorScheme);}catch(e){}}
      else if(dd&&dd.imgShadowColorScheme!==undefined)d.imgShadowColorScheme=dd.imgShadowColorScheme;
      d.imgOpacity=el.dataset.imgOpacity!=null?+el.dataset.imgOpacity:(dd&&dd.imgOpacity!=null?dd.imgOpacity:1);
      d.imgPosX=el.dataset.imgPosX||(dd&&dd.imgPosX)||'center';
      d.imgPosY=el.dataset.imgPosY||(dd&&dd.imgPosY)||'center';
      d.imgFlipH=el.dataset.imgFlipH==='true'||!!(dd&&dd.imgFlipH)||false;
      d.imgFlipV=el.dataset.imgFlipV==='true'||!!(dd&&dd.imgFlipV)||false;
      if(dd&&dd._pptxSrcRect)d._pptxSrcRect=dd._pptxSrcRect;
      // QR Code — приоритет: dataset > oldEls (dd)
      // Пишем dataset обратно если dd._isQR есть но dataset нет
      if(dd&&dd._isQR && el.dataset.isQR!=='true'){
        el.dataset.isQR='true';
        if(dd.qrText) el.dataset.qrText=dd.qrText;
        if(dd.qrBg)   el.dataset.qrBg=dd.qrBg;
        if(dd.qrColor) el.dataset.qrColor=dd.qrColor;
        if(dd.qrRx!=null) el.dataset.qrRx=dd.qrRx;
      }
      if(el.dataset.isQR==='true'||(dd&&dd._isQR)){
        d._isQR=true;
        d.qrText=el.dataset.qrText||(dd&&dd.qrText)||'https://example.com';
        d.qrBg=el.dataset.qrBg!==undefined?el.dataset.qrBg:((dd&&dd.qrBg!=null)?dd.qrBg:'#ffffff');
        d.qrColor=el.dataset.qrColor||(dd&&dd.qrColor)||'#000000';
        d.qrRx=el.dataset.qrRx!=null?+el.dataset.qrRx:(dd&&dd.qrRx!=null?dd.qrRx:16);
      }
      // crop: read from dataset (written on exit crop mode), fallback to live d value
      d.imgCropL = el.dataset.imgCropL != null ? +el.dataset.imgCropL : (d.imgCropL || 0);
      d.imgCropT = el.dataset.imgCropT != null ? +el.dataset.imgCropT : (d.imgCropT || 0);
      d.imgCropR = el.dataset.imgCropR != null ? +el.dataset.imgCropR : (d.imgCropR || 0);
      d.imgCropB = el.dataset.imgCropB != null ? +el.dataset.imgCropB : (d.imgCropB || 0);
      // preserve full-image coords so re-entering crop mode works correctly
      if(dd&&dd._cropFullW)d._cropFullW=dd._cropFullW;
      if(dd&&dd._cropFullH)d._cropFullH=dd._cropFullH;
      if(dd&&dd._cropFullX!=null)d._cropFullX=dd._cropFullX;
      if(dd&&dd._cropFullY!=null)d._cropFullY=dd._cropFullY;
    }
    else if(d.type==='shape'){
      d.shape=el.dataset.shape;d.fill=el.dataset.fill||'#3b82f6';d.stroke=el.dataset.stroke||'#1d4ed8';
      // Preserve scheme refs
      const _ods=oldElsById[d.id];
      if(_ods){
        if(_ods.fillScheme!==undefined)d.fillScheme=_ods.fillScheme;
        if(_ods.strokeScheme!==undefined)d.strokeScheme=_ods.strokeScheme;
      }
      d.sw=el.dataset.sw!=null?+el.dataset.sw:2;d.rx=+(el.dataset.rx||0);d.fillOp=el.dataset.fillOp!=null?+el.dataset.fillOp:1;
      d.shadow=el.dataset.shadow==='true';
      d.shadowBlur=el.dataset.shadowBlur!=null?+el.dataset.shadowBlur:(_ods&&_ods.shadowBlur!=null?_ods.shadowBlur:4);
      d.shadowSize=el.dataset.shadowSize!=null?+el.dataset.shadowSize:(_ods&&_ods.shadowSize!=null?_ods.shadowSize:3);
      d.shadowColor=el.dataset.shadowColor||(_ods&&_ods.shadowColor)||'#000000';
      if(el.dataset.strokeStyle)d.strokeStyle=el.dataset.strokeStyle; else if(_ods&&_ods.strokeStyle)d.strokeStyle=_ods.strokeStyle;
      // Shape fill gradient
      if(el.dataset.fillGrad!=null){d.fillGrad=el.dataset.fillGrad==='1';}
      else if(_ods&&_ods.fillGrad!=null){d.fillGrad=_ods.fillGrad;}
      if(el.dataset.fillGrad2)d.fillGrad2=el.dataset.fillGrad2;
      else if(_ods&&_ods.fillGrad2)d.fillGrad2=_ods.fillGrad2;
      // fillGrad2Scheme: try dataset first, then _ods
      if(el.dataset.fillGrad2Scheme)d.fillGrad2Scheme=JSON.parse(el.dataset.fillGrad2Scheme);
      else if(_ods&&_ods.fillGrad2Scheme!==undefined)d.fillGrad2Scheme=_ods.fillGrad2Scheme;
      // shadowColorScheme
      if(el.dataset.shadowColorScheme)d.shadowColorScheme=JSON.parse(el.dataset.shadowColorScheme);
      else if(_ods&&_ods.shadowColorScheme!==undefined)d.shadowColorScheme=_ods.shadowColorScheme;
      if(el.dataset.fillGradDir!=null)d.fillGradDir=+el.dataset.fillGradDir;
      else if(_ods&&_ods.fillGradDir!=null)d.fillGradDir=_ods.fillGradDir;
      // Cloud seed
      if(el.dataset.cloudSeed!=null) d.cloudSeed=+el.dataset.cloudSeed;
      else if(_ods&&_ods.cloudSeed!=null) d.cloudSeed=_ods.cloudSeed;
      if(el.dataset.cloudForm) d.cloudForm=el.dataset.cloudForm;
      else if(_ods&&_ods.cloudForm) d.cloudForm=_ods.cloudForm;
      if(el.dataset.cloudRefW) d.cloudRefW=+el.dataset.cloudRefW;
      else if(_ods&&_ods.cloudRefW) d.cloudRefW=_ods.cloudRefW;
      if(el.dataset.cloudRefH) d.cloudRefH=+el.dataset.cloudRefH;
      else if(_ods&&_ods.cloudRefH) d.cloudRefH=_ods.cloudRefH;
      if(el.dataset.cloudFramed==='1') d.cloudFramed=true;
      else if(_ods&&_ods.cloudFramed) d.cloudFramed=_ods.cloudFramed;
      if(_ods&&_ods.cloudCircles) d.cloudCircles=_ods.cloudCircles;
      if(_ods&&_ods.cloudCirclesForm) d.cloudCirclesForm=_ods.cloudCirclesForm;
      else if(d.cloudForm) d.cloudCirclesForm=d.cloudForm;
      if(_ods&&_ods.cloudFrameW) d.cloudFrameW=_ods.cloudFrameW;
      if(_ods&&_ods.cloudFrameH) d.cloudFrameH=_ods.cloudFrameH;
      const _domCw=parseInt(el.style.width)||0, _domCh=parseInt(el.style.height)||0;
      if(!d.cloudRefW&&_domCw>0) d.cloudRefW=_domCw;
      if(!d.cloudRefH&&_domCh>0) d.cloudRefH=_domCh;
      if(typeof _cloudPersistDataset==='function') _cloudPersistDataset(el,d);
      // Parallelogram skew
      if(el.dataset.paraSkew!=null) d.paraSkew=+el.dataset.paraSkew;
      else if(_ods&&_ods.paraSkew!=null) d.paraSkew=_ods.paraSkew;
      // Chevron depth
      if(el.dataset.chevSkew!=null) d.chevSkew=+el.dataset.chevSkew;
      else if(_ods&&_ods.chevSkew!=null) d.chevSkew=_ods.chevSkew;
      if(el.dataset.chevInner!=null) d.chevInner=+el.dataset.chevInner;
      else if(_ods&&_ods.chevInner!=null) d.chevInner=_ods.chevInner;
      // Curve bezier points
      if(el.dataset.curvePoints){try{d.curvePoints=JSON.parse(el.dataset.curvePoints);}catch(e){}}
      else if(_ods&&_ods.curvePoints) d.curvePoints=_ods.curvePoints;
      if(el.dataset.curveClosed==='1') d.curveClosed=true;
      else if(_ods&&_ods.curveClosed) d.curveClosed=_ods.curveClosed;
      // Star rays/inner radius
      if(el.dataset.starRays) d.starRays=+el.dataset.starRays;
      else if(_ods&&_ods.starRays) d.starRays=_ods.starRays;
      if(el.dataset.starInner) d.starInner=+el.dataset.starInner;
      else if(_ods&&_ods.starInner!=null) d.starInner=_ods.starInner;
      if(el.dataset.gearTeeth) d.gearTeeth=+el.dataset.gearTeeth;
      else if(_ods&&_ods.gearTeeth!=null) d.gearTeeth=_ods.gearTeeth;
      if(el.dataset.gearDepth) d.gearDepth=+el.dataset.gearDepth;
      else if(_ods&&_ods.gearDepth!=null) d.gearDepth=_ods.gearDepth;
      if(el.dataset.shapeFlipH==='true') d.shapeFlipH=true;
      else if(_ods&&_ods.shapeFlipH) d.shapeFlipH=_ods.shapeFlipH;
      if(el.dataset.shapeFlipV==='true') d.shapeFlipV=true;
      else if(_ods&&_ods.shapeFlipV) d.shapeFlipV=_ods.shapeFlipV;
      if(el.dataset.moonPhase!=null&&el.dataset.moonPhase!=='') d.moonPhase=+el.dataset.moonPhase;
      else if(_ods&&_ods.moonPhase!=null) d.moonPhase=_ods.moonPhase;
      if(el.dataset.trapTop!=null&&el.dataset.trapTop!=='') d.trapTop=+el.dataset.trapTop;
      else if(_ods&&_ods.trapTop!=null) d.trapTop=_ods.trapTop;
      if(el.dataset.trapBot!=null&&el.dataset.trapBot!=='') d.trapBot=+el.dataset.trapBot;
      else if(_ods&&_ods.trapBot!=null) d.trapBot=_ods.trapBot;
      // Polygon sides
      if(el.dataset.polySides) d.polySides=+el.dataset.polySides;
      else if(_ods&&_ods.polySides) d.polySides=_ods.polySides;
      // Arc/sector/chord for ellipse
      if(el.dataset.arcMode) d.arcMode=el.dataset.arcMode;
      else if(_ods&&_ods.arcMode) d.arcMode=_ods.arcMode;
      if(el.dataset.arcStart!=null&&el.dataset.arcStart!=='') d.arcStart=+el.dataset.arcStart;
      else if(_ods&&_ods.arcStart!=null) d.arcStart=_ods.arcStart;
      if(el.dataset.arcEnd!=null&&el.dataset.arcEnd!=='') d.arcEnd=+el.dataset.arcEnd;
      else if(_ods&&_ods.arcEnd!=null) d.arcEnd=_ods.arcEnd;
      if(el.dataset.shapeBlur>0) d.shapeBlur=+el.dataset.shapeBlur;
      else if(_ods&&_ods.shapeBlur>0) d.shapeBlur=_ods.shapeBlur;
      // Callout tail position - read from dataset (most reliable) or _ods
      if(el.dataset.tailX!==undefined&&el.dataset.tailX!=='undefined'){d.tailX=+el.dataset.tailX;d.tailY=+el.dataset.tailY;}
      else if(_ods&&_ods.tailX!==undefined){d.tailX=_ods.tailX;d.tailY=_ods.tailY;}
      const st=el.querySelector('.shape-text');d.shapeHtml=st?st.innerHTML:'';
      d.shapeTextCss=st?st.getAttribute('style')||'':'';
      // Preserve shapeTextColorScheme
      if(_ods&&_ods.shapeTextColorScheme!==undefined)d.shapeTextColorScheme=_ods.shapeTextColorScheme;
      // Preserve shapeTextColorScheme (not in DOM, only in data)
      if(_ods&&_ods.shapeTextColorScheme!==undefined)d.shapeTextColorScheme=_ods.shapeTextColorScheme;
    }
    else if(d.type==='svg'){
      const _ec=el.querySelector('.ec');
      const _svgOnly=_ec&&_ec.querySelector('svg');
      const _oldSvg=oldElsById[d.id];
      const _isGlDecor=_oldSvg&&typeof _isGlDecorRenderer==='function'&&_isGlDecorRenderer(_oldSvg._decorRenderer);
      if(_isGlDecor&&_svgOnly) d.svgContent=_svgOnly.outerHTML;
      else if(_ec) d.svgContent=_ec.innerHTML;
      if(el.dataset.svgOpacity!==undefined)d.svgOpacity=+el.dataset.svgOpacity;
      if(el.dataset.svgShadow!==undefined)d.svgShadow=el.dataset.svgShadow==='true';
      if(el.dataset.svgShadowBlur!==undefined)d.svgShadowBlur=+el.dataset.svgShadowBlur;
      if(el.dataset.svgShadowSize!==undefined)d.svgShadowSize=+el.dataset.svgShadowSize;
      if(el.dataset.svgShadowColor!==undefined)d.svgShadowColor=el.dataset.svgShadowColor;
      if(el.dataset.svgShadowColorScheme){try{d.svgShadowColorScheme=JSON.parse(el.dataset.svgShadowColorScheme);}catch(e){}}
      else if(_oldSvg&&_oldSvg.svgShadowColorScheme!==undefined)d.svgShadowColorScheme=_oldSvg.svgShadowColorScheme;
    }
    else if(d.type==='formula'){const dd=oldElsById[d.id];if(dd){d.formulaRaw=dd.formulaRaw;d.formulaLines=dd.formulaLines;d.formulaSvg=dd.formulaSvg;d.formulaColorScheme=dd.formulaColorScheme;}d.formulaColor=el.dataset.formulaColor||'#ffffff';}
    else if(d.type==='lego'){d.legoStuds=+el.dataset.legoStuds||2;d.legoTall=el.dataset.legoTall==='true';d.legoSlope=el.dataset.legoSlope||null;d.legoStair=el.dataset.legoStair||null;d.legoColor=el.dataset.legoColor||'#e3000b';const _lsc=el.dataset.legoColorScheme;d.legoColorScheme=(!_lsc||_lsc===''||_lsc==='undefined')?undefined:(_lsc==='null'?null:(function(){try{return JSON.parse(_lsc);}catch(e){return undefined;}})());}
    else if(d.type==='graph'){const dd=oldElsById[d.id];if(dd){d.linkedFormulaId=dd.linkedFormulaId;d.graphExpr=dd.graphExpr;d.graphLatex=dd.graphLatex;d.graphExprs=dd.graphExprs;d.graphLines=dd.graphLines;d.graphLineColors=dd.graphLineColors;d.graphImg=dd.graphImg;d.graphColor=dd.graphColor;d.graphBg=dd.graphBg;d.graphDark=dd.graphDark;d.graphXMin=dd.graphXMin;d.graphXMax=dd.graphXMax;d.graphYMin=dd.graphYMin;d.graphYMax=dd.graphYMax;d.graphStep=dd.graphStep;d.graphKind=dd.graphKind;d.chemKey=dd.chemKey;d.chemName=dd.chemName;d.graphBgOp=dd.graphBgOp;d.graphBgBlur=dd.graphBgBlur;d.graphColorScheme=dd.graphColorScheme;d.graphBgScheme=dd.graphBgScheme;}
      // Prefer live DOM dataset (updated by chem style controls before save)
      if(el.dataset.graphBg!==undefined){d.graphBg=el.dataset.graphBg||'';}
      if(el.dataset.graphBgOp!==undefined){d.graphBgOp=+el.dataset.graphBgOp;}
      if(el.dataset.graphBgBlur!==undefined){d.graphBgBlur=+el.dataset.graphBgBlur;}
      if(el.dataset.graphColor){d.graphColor=el.dataset.graphColor;}
      if(el.dataset.graphBgScheme){try{d.graphBgScheme=JSON.parse(el.dataset.graphBgScheme);}catch(e){}}
    }
    else if(d.type==='code'){const dd=oldElsById[d.id];if(dd){d.codeLang=dd.codeLang;d.codeTheme=dd.codeTheme;d.codeGlass=dd.codeGlass;d.codeRaw=dd.codeRaw;d.codeHtml=dd.codeHtml;d.codeFs=dd.codeFs;d.codeBg=dd.codeBg;if(dd.hfParentId)d.hfParentId=dd.hfParentId;}}
    else if(d.type==='htmlframe'){
      d.hfSrc=el.dataset.hfSrc||'';
      d.hfScroll=el.dataset.hfScroll==='1';
      d.hfLinkedCodeId=el.dataset.hfLinkedCodeId||null;
    }
    else if(d.type==='markdown'){const dd=oldElsById[d.id];if(dd){d.mdRaw=dd.mdRaw;d.mdHtml=dd.mdHtml;d.mdFs=dd.mdFs;d.mdColor=dd.mdColor||'#ffffff';d.mdColorScheme=dd.mdColorScheme!==undefined?dd.mdColorScheme:{col:7,row:0};}
      if(el.dataset.textBg)d.textBg=el.dataset.textBg;
      if(el.dataset.textBg||el.dataset.textBgGrad==='1'){d.textBgOp=el.dataset.textBgOp!=null?+el.dataset.textBgOp:1;}
      else if(el.dataset.textBgOp!=null){d.textBgOp=+el.dataset.textBgOp;}
      if(el.dataset.textBgBlur>0)d.textBgBlur=+el.dataset.textBgBlur;
      if(el.dataset.textBgGrad==='1'){d.textBgGrad=true;} else {delete d.textBgGrad;}
      if(el.dataset.textBgCol2)d.textBgCol2=el.dataset.textBgCol2; else delete d.textBgCol2;
      if(el.dataset.textBgDir!=null)d.textBgDir=+el.dataset.textBgDir; else delete d.textBgDir;
      if(el.dataset.textColorGrad==='1'){d.textColorGrad=true;d.textColorGrad1=el.dataset.textColorGrad1||'';d.textColorGrad2=el.dataset.textColorGrad2||'';d.textColorGradDir=+(el.dataset.textColorGradDir||90);}else{delete d.textColorGrad;delete d.textColorGrad1;delete d.textColorGrad2;delete d.textColorGradDir;}
      if(el.dataset.textBorderW&&+el.dataset.textBorderW>0){d.textBorderW=+el.dataset.textBorderW;d.textBorderColor=el.dataset.textBorderColor||'#ffffff';d.textBorderStyle=el.dataset.textBorderStyle||'solid';}
      const _tss=+(el.dataset.textShadowSize||0), _tsb=+(el.dataset.textShadowBlur||0), _tsw=+(el.dataset.textShadowW||0);
      if(_tss>0||_tsb>0||_tsw>0){
        if(_tsb>0)d.textShadowBlur=_tsb;
        if(_tss>0)d.textShadowSize=_tss;
        if(!d.textShadowBlur&&!d.textShadowSize&&_tsw>0)d.textShadowW=_tsw;
        d.textShadowColor=el.dataset.textShadowColor||'#000000';
      }else{
        delete d.textShadowBlur; delete d.textShadowSize; delete d.textShadowW; delete d.textShadowColor;
      }
      const _tbss=+(el.dataset.textBlockShadowSize||0), _tbsb=+(el.dataset.textBlockShadowBlur||0);
      if(_tbss>0||_tbsb>0){
        if(_tbsb>0)d.textBlockShadowBlur=_tbsb; else delete d.textBlockShadowBlur;
        if(_tbss>0)d.textBlockShadowSize=_tbss; else delete d.textBlockShadowSize;
        d.textBlockShadowColor=el.dataset.textBlockShadowColor||'#000000';
        d.textBlockShadowInset=el.dataset.textBlockShadowInset==='1';
      }else{
        delete d.textBlockShadowBlur; delete d.textBlockShadowSize; delete d.textBlockShadowColor; delete d.textBlockShadowInset;
      }
      if(+(el.dataset.rx_tl||0)||+(el.dataset.rx_tr||0)||+(el.dataset.rx_bl||0)||+(el.dataset.rx_br||0)){d.rx_tl=+(el.dataset.rx_tl||0);d.rx_tr=+(el.dataset.rx_tr||0);d.rx_bl=+(el.dataset.rx_bl||0);d.rx_br=+(el.dataset.rx_br||0);d.rxUnit=el.dataset.rxUnit||'px';}
      const _odmd=oldElsById[d.id];if(_odmd){if(_odmd.textBgScheme!==undefined)d.textBgScheme=_odmd.textBgScheme;if(_odmd.borderScheme!==undefined)d.borderScheme=_odmd.borderScheme;}
    }
    else if(d.type==='icon'){
      d.iconId=el.dataset.iconId||'';
      d.iconColor=el.dataset.iconColor||'#3b82f6';
      d.iconSw=el.dataset.iconSw!=null?+el.dataset.iconSw:1.8;
      d.iconStyle=el.dataset.iconStyle||'stroke';
      const _ecInner=el.querySelector('.ec');
      const _domSvg=_ecInner?_ecInner.querySelector('svg'):null;
      const _oldIcon=oldElsById[d.id];
      d.shadow=el.dataset.shadow==='true'||el.dataset.shadow===true;
      d.shadowBlur=el.dataset.shadowBlur!=null?+el.dataset.shadowBlur:(_oldIcon&&_oldIcon.shadowBlur!=null?_oldIcon.shadowBlur:4);
      d.shadowSize=el.dataset.shadowSize!=null?+el.dataset.shadowSize:(_oldIcon&&_oldIcon.shadowSize!=null?_oldIcon.shadowSize:3);
      d.shadowColor=el.dataset.shadowColor||(_oldIcon&&_oldIcon.shadowColor)||'#000000';
      if(el.dataset.shadowColorScheme){try{d.shadowColorScheme=JSON.parse(el.dataset.shadowColorScheme);}catch(e){}}
      else if(_oldIcon&&_oldIcon.shadowColorScheme!==undefined)d.shadowColorScheme=_oldIcon.shadowColorScheme;
      if(el.dataset.iconColorScheme){try{d.iconColorScheme=JSON.parse(el.dataset.iconColorScheme);}catch(e){}}
      else if(_oldIcon&&_oldIcon.iconColorScheme!==undefined)d.iconColorScheme=_oldIcon.iconColorScheme;
      if(_domSvg){
        d.svgContent=_domSvg.outerHTML;
        // Preserve flags from previous data
        if(_oldIcon&&_oldIcon.iconFitted) d.iconFitted=true;
        if(_oldIcon&&_oldIcon.iconColorCustom) d.iconColorCustom=true;
      } else if(_oldIcon&&_oldIcon.iconFitted&&_oldIcon.svgContent){
        d.svgContent=_oldIcon.svgContent;
        d.iconFitted=true;
      } else {
        const _ic=typeof ICONS!=='undefined'?ICONS.find(function(x){return x.id===d.iconId;}):null;
        if(_ic&&typeof _buildIconSVG==='function'){
          d.svgContent=_buildIconSVG(_ic,d.iconColor,d.iconSw,d.iconStyle,d.shadow,d.shadowBlur,d.shadowColor,d.shadowSize,d.id);
        }else if(_ecInner){
          d.svgContent=_ecInner.innerHTML;
        }
      }
    }
    else if(d.type==='applet'){
      if(typeof _serializeAppletFromDom==='function') _serializeAppletFromDom(el, d);
      else {
      d.appletId=el.dataset.appletId;
      d.appletHtml=el.dataset.appletHtml||'';
      if(el.dataset.appletAspect)d._appletAspect=+el.dataset.appletAspect;
      const _gk=['tmMin','tmSec','tmOnEnd','tmOnEndSlide','tmOnEndAnim','genMode','genLines','cntStart','cntGoal','cntOnEnd','cntOnEndSlide','cntOnEndAnim','cntGroupId','genMin','genMax','genStep','genFontSize','genColor','genBg','genBgBlur','genBgOp',
        'genBorderColor','genBorderWidth','genBold','genAlign','genVAlign',
        'genShadowOn','genShadowBlur','genShadowColor',
        'genColorScheme','genBgScheme','genBorderScheme'];
      _gk.forEach(k=>{
        if(el.dataset[k]!==undefined){
          const v=el.dataset[k];
          if(k==='genBold') d[k]=(v==='true');
          else if(k==='genShadowOn') d[k]=(v==='true');
          else if(['tmMin','tmSec','tmOnEndSlide','cntStart','cntOnEndSlide','genMin','genMax','genStep','genFontSize','genBgBlur','genBgOp','genBorderWidth','genShadowBlur'].includes(k)) d[k]=+v;
          else if(['genColorScheme','genBgScheme','genBorderScheme'].includes(k)){
            try{d[k]=JSON.parse(v);}catch(e){d[k]=null;}
          }
          else if(k==='genLines'){ try{d[k]=decodeURIComponent(v);}catch(e){d[k]=v;} }
          else if(k==='cntGoal'){ if(v!=='') d[k]=+v; }
          else d[k]=v;
        }
      });
      if(el.dataset.genRx!==undefined) d.rx=+el.dataset.genRx;
      }
    }
    else if(d.type==='pagenum'){
      // page number element — data stored in slide data, no DOM reading needed
      const dd=oldElsById[d.id];
      if(dd){d.html=dd.html;d.pnStyle=dd.pnStyle;d.pnPos=dd.pnPos;d.pnColor=dd.pnColor;d.pnTextColor=dd.pnTextColor;d.pnFontSize=dd.pnFontSize;d.pnShowTotal=dd.pnShowTotal;}
    }
    else if(d.type==='mediavideo'||d.type==='mediaaudio'){
      // Media elements — all data stored in slides array, not in DOM
      const dd=oldElsById[d.id];
      if(dd){d.mediaSrc=dd.mediaSrc;d.mediaSrcType=dd.mediaSrcType;d.mvDisplay=dd.mvDisplay;d.mvControls=dd.mvControls;d.mvStart=dd.mvStart;d.maStart=dd.maStart;d.maContinue=dd.maContinue;d.maVolume=dd.maVolume;d.maTriggerElId=dd.maTriggerElId;d.maTriggerElIds=dd.maTriggerElIds;}
    }
    // Restore decor flags
    if(decorMeta[d.id])Object.assign(d,decorMeta[d.id]);
    return d;
  });
}
function load(){
  clearMultiSel();sel=null;_rotEl=null;clearGuides();
  // Clean up shape handles (arc, star) when switching slides
  document.querySelectorAll('.arc-handle,.star-handle,.para-handle').forEach(h=>h.remove());
  const _ov=document.getElementById('handles-overlay');if(_ov)_ov.innerHTML='';
  document.querySelectorAll('.rh[data-overlay-hidden]').forEach(rh=>{rh.style.display='';delete rh.dataset.overlayHidden;});
  const canvas=document.getElementById('canvas');
  if(typeof CrystalDecor!=='undefined') CrystalDecor.unmountAll();
  if(typeof DnaDecor!=='undefined') DnaDecor.unmountAll();
  if(typeof GalaxyDecor!=='undefined') GalaxyDecor.unmountAll();
  if(typeof CausticsDecor!=='undefined') CausticsDecor.unmountAll();
  canvas.querySelectorAll('._particles_layer,._particle,#motion-ghosts,#motion-svg,.motion-ghost').forEach(e=>e.remove());
  canvas.querySelectorAll('.el').forEach(e=>e.remove());
  const s=slides[cur];loadBg(s);s.els.forEach(mkEl);
  document.getElementById('p-st').value=s.title;
  // Highlight active transition button — пустой/undefined = 'none'
  const _st=s.trans||'none';
  document.querySelectorAll('#slide-trans-grid .tbtn2[data-st]').forEach(b=>
    b.classList.toggle('active', b.dataset.st===_st)
  );
  if(typeof updateSlideTransHint==='function') updateSlideTransHint(_st);
  document.getElementById('p-auto').value=s.auto||0;
  const navChk=document.getElementById('slide-click-nav');
  if(navChk)navChk.checked=s.clickNav!==false; // default true
  // Highlight active global transition button
  const activeTrans=globalTrans||'none';
  document.querySelectorAll('.tbtn2[data-t]').forEach(b=>b.classList.toggle('active',b.dataset.t===activeTrans));
  syncProps();
  if(document.getElementById('props-anim-wrap')?.style.display==='flex'){renderAnimPanel();if(typeof renderMotionOverlay==='function')renderMotionOverlay();}
  const _objSec=document.getElementById('objects-panel-section');
  if(_objSec&&_objSec.style.display!=='none'&&typeof renderObjectsPanel==='function')renderObjectsPanel();
}
function onTitleInput(v){slides[cur].title=v;drawThumbs();saveState();}
