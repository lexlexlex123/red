
window._isPreviewActive = function() {
  const po = document.getElementById('preview-ov');
  return !!(po && po.classList.contains('active'));
};

window._pvCleanupEditorCanvas = function(slideIdx) {
  const cv = document.getElementById('canvas');
  if (!cv) return;
  cv.querySelectorAll('._particles_layer,._particle,#motion-ghosts,#motion-svg,.motion-ghost').forEach(n => n.remove());
  if (typeof slides === 'undefined') return;
  const idx = slideIdx != null ? slideIdx : (typeof cur !== 'undefined' ? cur : 0);
  const s = slides[idx];
  if (!s || !s.els) return;
  s.els.forEach(d => {
    const el = cv.querySelector('.el[data-id="' + d.id + '"]');
    if (el && typeof window._resetSlideAnimEl === 'function') window._resetSlideAnimEl(el, d);
  });
};

window._pvScheduleOnStage = function(container, fn, ms) {
  if (!container) return null;
  if (!container._pvStageTimers) container._pvStageTimers = [];
  const gen = container._pvStageGen || 0;
  const id = setTimeout(() => {
    const i = container._pvStageTimers.indexOf(id);
    if (i >= 0) container._pvStageTimers.splice(i, 1);
    if ((container._pvStageGen || 0) !== gen) return;
    if (container._pvStageAborted) return;
    fn();
  }, ms);
  container._pvStageTimers.push(id);
  return id;
};

window._pvStageLater = function(stage, fn, ms) {
  const delay = ms || 0;
  if (!stage) {
    setTimeout(fn, delay);
    return;
  }
  const gen = stage._pvStageGen || 0;
  if (typeof window._pvScheduleOnStage === 'function') {
    window._pvScheduleOnStage(stage, () => {
      if ((stage._pvStageGen || 0) !== gen) return;
      fn();
    }, delay);
  } else {
    setTimeout(() => {
      if ((stage._pvStageGen || 0) !== gen) return;
      fn();
    }, delay);
  }
};

window._pvCleanupPreviewStage = function(container, slideIdx) {
  if (!container) return;
  container._pvStageGen = (container._pvStageGen || 0) + 1;
  container._pvStageAborted = true;
  if (container._pvStageTimers) {
    container._pvStageTimers.forEach(t => clearTimeout(t));
    container._pvStageTimers = [];
  }
  container.querySelectorAll('._particles_layer,._particle,#motion-ghosts,#motion-svg,.motion-ghost').forEach(n => n.remove());
  const s = typeof slides !== 'undefined' ? slides[slideIdx] : null;
  if (s && s.els) {
    s.els.forEach(d => {
      const el = container.querySelector('.psel[data-id="' + d.id + '"]');
      if (el && typeof window._resetSlideAnimEl === 'function') window._resetSlideAnimEl(el, d);
    });
  }
  delete container._fireNextStep;
  delete container._hasSteps;
  delete container._elemTrigBindings;
};

window._pvCancelEditorPointer = function() {
  window._anyDragging = false;
  window._rotDragging = false;
  window._resizeDragging = false;
  window._pivotDragging = false;
  window._overPivotHandle = false;
  window._alphaPassthroughDrag = false;
  try {
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, button: 0, buttons: 0 }));
  } catch (e) {}
};

// Лего-блоки: вспомогательная функция SVG для превью/экспорта
function _legoMakeSVG(n,tall,base){
  const U=40,SH=10,FH=12,TH=36,SW=26;
  const bh=tall?TH:FH,bw=n*U;
  function blend(hex,r2,g2,b2,t){const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return '#'+[r,g,b].map((v,i)=>Math.round(v+([r2,g2,b2][i]-v)*t).toString(16).padStart(2,'0')).join('');}
  const stud=blend(base,0,0,0,.20),hl=blend(base,255,255,255,.65),dark=blend(base,0,0,0,.30);
  let studs='';
  for(let i=0;i<n;i++){const sx=i*U+(U-SW)/2;studs+=`<rect x="${sx}" y="0" width="${SW}" height="${SH}" rx="1" fill="${stud}"/><rect x="${sx+2}" y="1" width="${SW-6}" height="${Math.max(2,SH-4)}" rx="1" fill="${hl}" opacity="0.5"/>`;}
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bw} ${bh+SH}" width="${bw}" height="${bh+SH}" style="display:block;overflow:visible">${studs}<rect x="0" y="${SH}" width="${bw}" height="${bh}" rx="1" fill="${base}"/><rect x="1" y="${SH+1}" width="${bw-2}" height="2" rx="1" fill="${hl}" opacity="0.4"/><rect x="0" y="${SH+bh-3}" width="${bw}" height="3" rx="1" fill="${dark}" opacity="0.5"/><rect x="0" y="${SH}" width="2" height="${bh}" rx="1" fill="${dark}" opacity="0.28"/><rect x="${bw-2}" y="${SH}" width="2" height="${bh}" rx="1" fill="${dark}" opacity="0.38"/></svg>`;
}
function _legoMakeSlopeSVG(n,dir,base){
  const U=40,SH=10,FH=12,TH=36,SW=26,bw=n*U,totalH=SH+TH;
  function blend(hex,r2,g2,b2,t){const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return '#'+[r,g,b].map((v,i)=>Math.round(v+([r2,g2,b2][i]-v)*t).toString(16).padStart(2,'0')).join('');}
  const stud=blend(base,0,0,0,.20),hl=blend(base,255,255,255,.65),dark=blend(base,0,0,0,.30);
  const hiIdx=dir==='slope-right'?0:n-1,hiX=hiIdx*U,sx=hiX+(U-SW)/2;
  const yBodyTop=SH,yBot=totalH,yLoTop=yBot-FH;
  const studSvg=`<rect x="${sx}" y="0" width="${SW}" height="${SH}" rx="1" fill="${stud}"/><rect x="${sx+2}" y="1" width="${SW-6}" height="${Math.max(2,SH-4)}" rx="1" fill="${hl}" opacity="0.5"/>`;
  const hiBlock=`<rect x="${hiX}" y="${yBodyTop}" width="${U}" height="${TH}" rx="1" fill="${base}"/><rect x="${hiX+1}" y="${yBodyTop+1}" width="${U-2}" height="2" fill="${hl}" opacity="0.4"/>`;
  let slopePts,blikPts;
  if(dir==='slope-right'){slopePts=`${U},${yBodyTop} ${bw},${yLoTop} ${bw},${yBot} ${U},${yBot}`;blikPts=`${U},${yBodyTop} ${bw},${yLoTop} ${bw},${yLoTop+2} ${U},${yBodyTop+2}`;}
  else{slopePts=`0,${yLoTop} ${(n-1)*U},${yBodyTop} ${(n-1)*U},${yBot} 0,${yBot}`;blikPts=`0,${yLoTop} ${(n-1)*U},${yBodyTop} ${(n-1)*U},${yBodyTop+2} 0,${yLoTop+2}`;}
  const sideL=dir==='slope-right'?`<rect x="0" y="${yBodyTop}" width="2" height="${TH}" fill="${dark}" opacity="0.28"/>`:`<rect x="0" y="${yLoTop}" width="2" height="${FH}" fill="${dark}" opacity="0.28"/>`;
  const sideR=dir==='slope-right'?`<rect x="${bw-2}" y="${yLoTop}" width="2" height="${FH}" fill="${dark}" opacity="0.38"/>`:`<rect x="${bw-2}" y="${yBodyTop}" width="2" height="${TH}" fill="${dark}" opacity="0.38"/>`;
  const shadow=`<rect x="${dir==='right'?0:U}" y="${yBot-3}" width="${U}" height="3" fill="${dark}" opacity="0.5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bw} ${totalH}" width="${bw}" height="${totalH}" style="display:block;overflow:hidden">${studSvg}${hiBlock}<polygon points="${slopePts}" fill="${base}"/><polygon points="${blikPts}" fill="${hl}" opacity="0.4"/>${shadow}${sideL}${sideR}</svg>`;
}
function _legoMakeStairSVG(base,dir){
  const U=40,SH=10,FH=12,TH=36,SW=26,bw=2*U,totalH=SH+TH;
  function blend(hex,r2,g2,b2,t){const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return '#'+[r,g,b].map((v,i)=>Math.round(v+([r2,g2,b2][i]-v)*t).toString(16).padStart(2,'0')).join('');}
  const stud=blend(base,0,0,0,.20),hl=blend(base,255,255,255,.65),dark=blend(base,0,0,0,.30);
  const yTop=SH,yBot=totalH,yVert=yTop+FH;
  let studs='';
  for(let i=0;i<2;i++){const sx=i*U+(U-SW)/2;studs+=`<rect x="${sx}" y="0" width="${SW}" height="${SH}" rx="1" fill="${stud}"/><rect x="${sx+2}" y="1" width="${SW-6}" height="${Math.max(2,SH-4)}" rx="1" fill="${hl}" opacity="0.5"/>`;}
  const bodyPts=dir==='right'?`0,${yTop} ${bw},${yTop} ${bw},${yVert} ${U},${yBot} 0,${yBot}`:`0,${yTop} ${bw},${yTop} ${bw},${yBot} ${U},${yBot} 0,${yVert}`;
  const body=`<polygon points="${bodyPts}" fill="${base}"/>`;
  const topBlik=`<rect x="0" y="${yTop}" width="${bw}" height="2" fill="${hl}" opacity="0.4"/>`;
  const blik=dir==='right'?`<polygon points="${bw},${yVert} ${U},${yBot} ${U},${yBot+2} ${bw},${yVert+2}" fill="${hl}" opacity="0.25"/>`:`<polygon points="0,${yVert} ${U},${yBot} ${U},${yBot+2} 0,${yVert+2}" fill="${hl}" opacity="0.25"/>`;
  const shadow=`<rect x="${dir==='right'?0:U}" y="${yBot-3}" width="${U}" height="3" fill="${dark}" opacity="0.5"/>`;
  const sideVert='';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bw} ${totalH}" width="${bw}" height="${totalH}" style="display:block;overflow:hidden">${studs}${body}${topBlik}${blik}${shadow}${sideVert}</svg>`;
}
let _pvSnapIdx=null,_pvSnapEls=null;
window._pvRestoring=false;
let pidx=0,pTransiting=false,pTransitionTo=null,_pTransTimers=[],autoTimer=null;

window._pvRestoreSlideSnapshot=function(){
  if(_pvSnapIdx==null||!_pvSnapEls||!slides[_pvSnapIdx]) return;
  slides[_pvSnapIdx].els=JSON.parse(JSON.stringify(_pvSnapEls));
  _pvSnapIdx=null;
  _pvSnapEls=null;
};
let pBlackScreen=false,_pJumpBuf='',_pJumpTimer=null;
let _pvDecorTimes={};
function _pvDecorElData(slideIdx){
  const s=slides[slideIdx];
  return s&&s.els?s.els.find(d=>d._isDecor)||null:null;
}
function _pvDecorSvg(container,slideIdx){
  const d=_pvDecorElData(slideIdx);
  if(!d||!container) return null;
  return container.querySelector('.psel[data-id="'+d.id+'"] svg');
}
function _pvGetDecorTime(slideIdx){
  const t=_pvDecorTimes[slideIdx];
  return t!=null?t:0;
}
function _pvCaptureDecorTime(container,slideIdx){
  const svg=_pvDecorSvg(container,slideIdx);
  if(!svg) return;
  try{ _pvDecorTimes[slideIdx]=svg.getCurrentTime(); }catch(e){}
}
function _pvSeedDecorTimeFromEditor(){
  _pvDecorTimes={};
  if(typeof _layoutAnimated==='undefined'||!_layoutAnimated) return;
  const cv=document.getElementById('canvas');
  const svg=cv&&cv.querySelector('.decor-el svg');
  if(!svg) return;
  try{
    const t=svg.getCurrentTime();
    if(typeof cur!=='undefined') _pvDecorTimes[cur]=t;
    if(typeof pidx!=='undefined') _pvDecorTimes[pidx]=t;
  }catch(e){}
}
function _pvApplyDecorTime(svgEl,slideIdx){
  if(!svgEl) return;
  const t=_pvGetDecorTime(slideIdx);
  requestAnimationFrame(function(){
    try{
      svgEl.setCurrentTime(t);
      if(typeof _layoutAnimated!=='undefined'&&!_layoutAnimated) svgEl.pauseAnimations();
    }catch(e){}
  });
}
const playedAnimSlides=new Set(); // tracks which slides had their nav-anims already played
const hiddenElsPerSlide={}; // slideIdx -> Set of elIds that have been hidden by nav trigger
function _attachPreviewExitHandlers(po){
  po._previewEsc=function(e){
    if(e.key!=='Escape') return;
    e.preventDefault();
    e.stopPropagation();
    if(typeof pidx!=='undefined') cur=pidx;
    stopPreview();
  };
  document.addEventListener('keydown',po._previewEsc,true);
  po._previewFsChange=function(){
    const ov=document.getElementById('preview-ov');
    if(!ov||!ov.classList.contains('active')) return;
    if(document.fullscreenElement||document.webkitFullscreenElement) return;
    if(typeof pidx!=='undefined') cur=pidx;
    stopPreview();
  };
  document.addEventListener('fullscreenchange',po._previewFsChange);
  document.addEventListener('webkitfullscreenchange',po._previewFsChange);
}
function _detachPreviewExitHandlers(po){
  if(!po) return;
  if(po._previewEsc){
    document.removeEventListener('keydown',po._previewEsc,true);
    delete po._previewEsc;
  }
  if(po._previewFsChange){
    document.removeEventListener('fullscreenchange',po._previewFsChange);
    document.removeEventListener('webkitfullscreenchange',po._previewFsChange);
    delete po._previewFsChange;
  }
}
function startPreview(startIdx){
  // If a table cell is being edited, save its content first
  if(typeof tblClearSel==='function') tblClearSel();
  if(typeof pnLock==='function') pnLock(); // freeze PN settings during preview
  const editingCell=document.querySelector('.el[data-editing="true"] td[contenteditable="true"],.el[data-editing="true"] th[contenteditable="true"]');
  if(editingCell){ editingCell.contentEditable='false'; }
  if(typeof window._flushAnimPanelToDom==='function') window._flushAnimPanelToDom();
  if(typeof _syncSlideAnimsFromDom==='function') _syncSlideAnimsFromDom(cur);
  if(typeof repairAppletAnimRefs==='function') slides.forEach(s=>repairAppletAnimRefs(s));
  if(typeof syncAllAppletHtmlFromData==='function') syncAllAppletHtmlFromData();
  if(typeof stopSlideAnimsOnCanvas==='function') stopSlideAnimsOnCanvas();
  if(typeof window._pvCleanupEditorCanvas==='function') window._pvCleanupEditorCanvas(cur);
  save();
  _pvSnapIdx=cur;
  _pvSnapEls=JSON.parse(JSON.stringify(slides[cur].els||[]));
  pidx=startIdx||0;pTransiting=false;pTransitionTo=null;_clearPreviewTransTimers();
  _pvSeedDecorTimeFromEditor();
  pBlackScreen=false;_pJumpBuf='';clearTimeout(_pJumpTimer);
  const _pBlack=document.getElementById('p-black');if(_pBlack) _pBlack.classList.remove('on');
  const _pJump=document.getElementById('p-jump-hint');if(_pJump){ _pJump.textContent=''; _pJump.classList.remove('on'); }

  _shuffleHistory=[pidx];
  // Blur any focused input to prevent cursor blinking in preview
  if(document.activeElement&&document.activeElement!==document.body)document.activeElement.blur();
  try{window.getSelection()?.removeAllRanges();}catch(e){}
  // Also exit any text editing mode
  document.querySelectorAll('.el[data-editing=true]').forEach(el=>{
    const c=el.querySelector('.tel');if(c){c.contentEditable='false';delete el.dataset.editing;el.style.cursor='';}
  });
  window._previewSelRestoreId=(typeof sel!=='undefined'&&sel&&sel.dataset.id)?sel.dataset.id:null;
  if(typeof desel==='function') desel();
  if(window._propsScrollMem) window._propsScrollMem.save();
  document.body.classList.add('preview-mode');
  if(typeof window._pvCancelEditorPointer==='function') window._pvCancelEditorPointer();
  playedAnimSlides.clear();Object.keys(hiddenElsPerSlide).forEach(k=>delete hiddenElsPerSlide[k]);
  const po=document.getElementById('preview-ov');po.classList.add('active');
  _attachPreviewExitHandlers(po);
  resizePStage();window.addEventListener('resize',resizePStage);
  // Click anywhere on stage (not on nav buttons or link elements) advances or fires next anim step
  const po2=document.getElementById('preview-ov');
  po2._stageClick=function(e){
    if(e.target.closest('#p-prev,#p-next,#p-exit,#p-info'))return;
    const psa=document.getElementById('psa');
    const psel=(typeof _findElAtPoint==='function'&&psa
      ? _findElAtPoint(e.clientX,e.clientY,{container:psa,selector:'.psel',excludeDecor:true})
      : null)||e.target.closest('.psel');
    if(psel&&psel._hasLink)return;
    if(psel&&psel._isTrigger)return;
    if(psel&&(psel.dataset.appletId==='counter'||psel.dataset.appletId==='generator'))return;
    // Check per-slide clickNav (default true)
    if(slides[pidx]&&slides[pidx].clickNav===false){
      // Still fire click-triggered animations, just don't advance to next slide
      const psa=document.getElementById('psa');
      if(psa._fireNextStep)psa._fireNextStep();
      return;
    }
    nextPreview();
  };
  po2.addEventListener('click',po2._stageClick);
  po2._alphaClickCapture=function(e){
    if(e.target.closest('#p-prev,#p-next,#p-exit,#p-info'))return;
    const psa=document.getElementById('psa');
    if(!psa||typeof _forwardClickThrough!=='function')return;
    _forwardClickThrough(e,{container:psa,selector:'.psel',excludeDecor:true});
  };
  po2.addEventListener('click',po2._alphaClickCapture,true);
  po2._alphaHoverCursor=function(e){
    const psa=document.getElementById('psa');
    if(!psa||typeof _updateAlphaHoverCursor!=='function')return;
    _updateAlphaHoverCursor(e,{container:psa,selector:'.psel',excludeDecor:true,overlay:po2,navSelector:'#p-prev,#p-next,#p-exit,#p-info'});
  };
  po2._alphaHoverLeave=function(){
    if(typeof _resetAlphaHoverCursor==='function')_resetAlphaHoverCursor({overlay:po2});
  };
  po2.addEventListener('mousemove',po2._alphaHoverCursor);
  po2.addEventListener('mouseleave',po2._alphaHoverLeave);
  // Touch swipe navigation
  po2._touchStart=function(e){po2._swipeX=e.touches[0].clientX;po2._swipeY=e.touches[0].clientY;};
  po2._touchEnd=function(e){
    const dx=e.changedTouches[0].clientX-po2._swipeX,dy=e.changedTouches[0].clientY-po2._swipeY;
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5){if(dx<0)nextPreview();else prevPreview();}
  };
  po2.addEventListener('touchstart',po2._touchStart,{passive:true});
  po2.addEventListener('touchend',po2._touchEnd,{passive:true});
  po2._preventSelect=function(e){e.preventDefault();};
  po2.addEventListener('selectstart',po2._preventSelect);
  // Listen for timer navigation messages from applet iframes
  window._appletMessageHandler = function(e){
    if(!e.data) return;
    if(e.data.type==='timerNav'){
      if(e.data.mode==='next'){
        nextPreview();
      } else if(e.data.mode==='slide'){
        const to=e.data.slide;
        if(typeof to==='number' && to>=0 && to<slides.length) gotoPreview(to,'next');
      }
      return;
    }
  };
  window.addEventListener('message', window._appletMessageHandler);
  const sc=pScale();
  buildPSlide(document.getElementById('psa'),pidx);
  document.getElementById('psb').innerHTML='';
  document.getElementById('psa').style.cssText='position:absolute;inset:0;width:'+canvasW+'px;height:'+canvasH+'px;transform:scale('+sc+');transform-origin:top left;';
  document.getElementById('psb').style.cssText='position:absolute;inset:0;opacity:0;pointer-events:none;width:'+canvasW+'px;height:'+canvasH+'px;transform:scale('+sc+');transform-origin:top left;';
  updatePUI();scheduleAuto();_syncPreviewPlaybackBtns();
  po.requestFullscreen&&po.requestFullscreen().then(()=>resizePStage()).catch(()=>{});
}
function _syncPreviewPlaybackBtns(){
  [['p-loop-btn',presLoop],['p-shuffle-btn',presShuffle]].forEach(([id,on])=>{
    const el=document.getElementById(id);
    if(el){ el.classList.toggle('on',!!on); el.classList.toggle('active',!!on); }
  });
}
function togglePreviewBlack(){
  pBlackScreen=!pBlackScreen;
  const el=document.getElementById('p-black');
  if(el) el.classList.toggle('on', pBlackScreen);
  _syncPreviewPlaybackBtns();
}
function gotoPreviewSlide(to){
  if(to<0||to>=slides.length) return;
  if(to===pidx){ if(pTransiting) skipPreviewTransition(); return; }
  if(pTransiting){ skipPreviewTransition(); return; }
  clearAutoTimer();
  gotoPreview(to, to>pidx?'next':'prev');
}
function _previewJumpDigit(d){
  _pJumpBuf+=d;
  const hint=document.getElementById('p-jump-hint');
  if(hint){ hint.textContent=_pJumpBuf; hint.classList.add('on'); }
  clearTimeout(_pJumpTimer);
  _pJumpTimer=setTimeout(()=>{
    const n=parseInt(_pJumpBuf,10);
    _pJumpBuf='';
    if(hint){ hint.textContent=''; hint.classList.remove('on'); }
    if(n>=1&&n<=slides.length) gotoPreviewSlide(n-1);
  },700);
}
function stopPreview(){
  const po=document.getElementById('preview-ov');
  if(!po||!po.classList.contains('active')) return;
  if(typeof window._pvCancelEditorPointer==='function') window._pvCancelEditorPointer();
  window._pvRestoring=true;
  _pvDecorTimes={};
  clearAutoTimer();
  _clearPreviewTransTimers();
  pTransitionTo=null;
  pTransiting=false;
  _turnFlipDestroy();
  const _psa=document.getElementById('psa'), _psb=document.getElementById('psb');
  if(_psa) _psa.style.visibility='';
  if(_psb) _psb.style.visibility='';
  _detachPreviewExitHandlers(po);
  if(po._stageClick){po.removeEventListener('click',po._stageClick);delete po._stageClick;}
  if(po._alphaClickCapture){po.removeEventListener('click',po._alphaClickCapture,true);delete po._alphaClickCapture;}
  if(po._alphaHoverCursor){po.removeEventListener('mousemove',po._alphaHoverCursor);delete po._alphaHoverCursor;}
  if(po._alphaHoverLeave){po.removeEventListener('mouseleave',po._alphaHoverLeave);delete po._alphaHoverLeave;}
  if(typeof _resetAlphaHoverCursor==='function')_resetAlphaHoverCursor({overlay:po});
  if(po._touchStart){po.removeEventListener('touchstart',po._touchStart);po.removeEventListener('touchend',po._touchEnd);delete po._touchStart;delete po._touchEnd;}
  if(po._preventSelect){po.removeEventListener('selectstart',po._preventSelect);delete po._preventSelect;}
  if(window._appletMessageHandler){window.removeEventListener('message',window._appletMessageHandler);delete window._appletMessageHandler;}
  po.classList.remove('active');
  _pResetStageZoom();
  document.fullscreenElement&&document.exitFullscreen&&document.exitFullscreen();
  window.removeEventListener('resize',resizePStage);
  if(typeof pidx!=='undefined') cur=pidx;
  if(typeof window._pvRestoreSlideSnapshot==='function') window._pvRestoreSlideSnapshot();
  if(typeof stopSlideAnimsOnCanvas==='function') stopSlideAnimsOnCanvas();
  if(typeof window._pvCleanupEditorCanvas==='function') window._pvCleanupEditorCanvas(cur);
  [_psa,_psb].forEach(stage=>{
    if(!stage) return;
    if(typeof window._pvCleanupPreviewStage==='function') window._pvCleanupPreviewStage(stage, pidx);
  });
  // Remember selected id before load() clears sel
  const _prevSelId=window._previewSelRestoreId||null;
  delete window._previewSelRestoreId;
  // Re-render current slide from data so all styles (textBg etc.) are restored
  load();
  document.body.classList.remove('preview-mode');
  window._pvRestoring=false;
  // Re-apply text backgrounds from model data (dataset may be stale after preview)
  requestAnimationFrame(()=>{
    const _cv=document.getElementById('canvas');
    _cv.querySelectorAll('.el').forEach(el=>{
      // Re-render tables that may have lost their DOM after preview
      if(el.dataset.type==='table'&&typeof renderTableEl==='function'){
        const d=slides[cur]&&slides[cur].els.find(x=>x.id===el.dataset.id);
        if(d){ d.w=parseInt(el.style.width)||d.w; d.h=parseInt(el.style.height)||d.h; renderTableEl(el,d); }
      }
      // Восстанавливаем QR-специфичные поля после preview
      if(el.dataset.type==='image'){
        const dq=slides[cur]&&slides[cur].els.find(x=>x.id===el.dataset.id);
        if(dq&&dq._isQR){
          el.dataset.isQR='true';
          el.dataset.qrText=dq.qrText||'';
          el.dataset.qrBg=dq.qrBg||'#ffffff';
          el.dataset.qrColor=dq.qrColor||'#000000';
          el.dataset.qrRx=dq.qrRx!=null?dq.qrRx:16;
        }
      }
      if(el.dataset.type==='text'){
        const d=slides[cur]&&slides[cur].els.find(x=>x.id===el.dataset.id);
        if(d&&typeof window._stampTextDatasetFromModel==='function') window._stampTextDatasetFromModel(el,d);
        if(typeof window._restoreTextBlockVisuals==='function') window._restoreTextBlockVisuals(el);
        else if(typeof applyTextBg==='function') applyTextBg(el);
      }
      // Force-rebuild icon SVG from data so shadow is always correct after preview
      if(el.dataset.type==='icon'){
        const d=slides[cur].els.find(function(e){return e.id===el.dataset.id;});
        if(!d)return;
        // If icon was fitted (tight viewBox saved in svgContent), use that directly
        const svg=d.iconFitted&&d.svgContent
          ? d.svgContent
          : (()=>{ const ic=typeof ICONS!=='undefined'?ICONS.find(function(x){return x.id===d.iconId;}):null;
              return (ic&&typeof _buildIconSVG!=='undefined')
                ?_buildIconSVG(ic,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle||'stroke',d.shadow,d.shadowBlur,d.shadowColor)
                :(d.svgContent||''); })();
        const c=el.querySelector('.ec');
        if(c){c.innerHTML=svg;const s=c.querySelector('svg');if(s){s.style.width='100%';s.style.height='100%';}}
      }
    });
  });
  // Restore page numbering UI state (pnUnlock also calls pnSyncUI)
  if(typeof pnUnlock==='function') pnUnlock();
  // Re-apply page numbers after rAF finishes rebuilding DOM
  requestAnimationFrame(()=>{ if(typeof pnApplyAll==='function') pnApplyAll(); requestAnimationFrame(()=>{
    if(window._propsScrollMem) window._propsScrollMem.markRestoreAfterPick();
    if(_prevSelId){const _resel=document.querySelector(`.el[data-id="${_prevSelId}"]`);if(_resel&&typeof pick==='function')pick(_resel);}
    else if(window._propsScrollMem) window._propsScrollMem.restoreSoon();
  }); });
}
function _pResetStageZoom(){
  const stage=document.getElementById('preview-stage');
  if(!stage) return;
  stage.style.transition='none';
  stage.style.transform='';
  stage.style.transformOrigin='';
}
function _pSlideScale(el,sc){
  if(!el) return;
  el.style.transformOrigin='top left';
  el.style.transform='scale('+sc+')';
}
function resizePStage(){
  const stage=document.getElementById('preview-stage');const sc=pScale();
  stage.style.width=Math.round(canvasW*sc)+'px';stage.style.height=Math.round(canvasH*sc)+'px';
  if(pTransiting) return;
  _pResetStageZoom();
  [document.getElementById('psa'),document.getElementById('psb')].forEach(s=>{
    if(!s) return;
    s.style.width=canvasW+'px';s.style.height=canvasH+'px';s.style.transform='scale('+sc+')';s.style.transformOrigin='top left';
  });
}
function pViewport(){
  const ov=document.getElementById('preview-ov');
  const w=(ov&&ov.classList.contains('active')?ov.clientWidth:0)||window.innerWidth;
  const h=(ov&&ov.classList.contains('active')?ov.clientHeight:0)||window.innerHeight;
  return {w,h};
}
function pScale(){
  const {w,h}=pViewport();
  const sx=w/canvasW, sy=h/canvasH;
  // 4:3 на широком экране — по высоте, чёрные полосы по бокам
  if(canvasW/canvasH<w/h) return Math.min(sx,sy);
  // 16:9 — заполнить весь экран
  return Math.max(sx,sy);
}
function _turnFlipAvailable(){
  return typeof jQuery!=='undefined'&&jQuery.fn&&jQuery.fn.turn;
}
function _turnFlipDestroy(){
  const el=document.getElementById('p-turnbook');
  if(el&&_turnFlipAvailable()){
    try{ jQuery(el).turn('stop'); }catch(e){}
  }
  if(el) el.remove();
  const fw=document.getElementById('turn-fwrappers');
  if(fw) fw.remove();
}
function _buildTurnPage(slideIdx){
  const page=document.createElement('div');
  page.className='p-turn-page';
  buildPSlide(page,slideIdx,0,true);
  return page;
}
function doTurnJsFlip(a,b,fromIdx,toIdx,fwd,durMs,cb){
  const sc=pScale();
  _turnFlipDestroy();
  const book=document.createElement('div');
  book.id='p-turnbook';
  book.style.cssText='position:absolute;top:0;left:0;width:'+canvasW+'px;height:'+canvasH+'px;transform:scale('+sc+');transform-origin:top left;';
  if(fwd){
    book.appendChild(_buildTurnPage(fromIdx));
    book.appendChild(_buildTurnPage(toIdx));
  }else{
    book.appendChild(_buildTurnPage(toIdx));
    book.appendChild(_buildTurnPage(fromIdx));
  }
  document.getElementById('preview-stage').appendChild(book);
  const dur=Math.max(1,Math.round(+durMs||500));
  const $book=jQuery(book);
  $book.turn({
    width:canvasW,
    height:canvasH,
    display:'single',
    duration:dur,
    gradients:true,
    acceleration:true,
    elevation:120,
    autoCenter:false,
    page:fwd?1:2
  });
  const finish=()=>{
    $book.off('turned.turnFlip');
    _turnFlipDestroy();
    a.style.visibility='';
    b.style.visibility='';
    cb();
  };
  $book.on('turned.turnFlip',function(e,page){
    if((fwd&&page>=2)||(!fwd&&page<=1)) finish();
  });
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      try{ $book.turn('update'); }catch(e){}
      a.style.visibility='hidden';
      b.style.visibility='hidden';
      try{
        if(fwd) $book.turn('next');
        else $book.turn('previous');
      }catch(e){ finish(); }
    });
  });
}
function doBookFlipV(a,b,fwd,durMs,cb){
  const sc=pScale();
  const stage=document.getElementById('preview-stage');
  _bookFlipPrepare(stage,a,b,sc,fwd,true);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    _bookFlipAnimate(a,b,sc,fwd,true,durMs,stage,cb);
  }));
}
function _clearPreviewTransTimers(){
  _pTransTimers.forEach(id=>clearTimeout(id));
  _pTransTimers=[];
}
function _previewTransLater(fn, ms){
  const id=setTimeout(()=>{
    const i=_pTransTimers.indexOf(id);
    if(i>=0) _pTransTimers.splice(i,1);
    if(pTransiting) fn();
  }, ms);
  _pTransTimers.push(id);
}
function skipPreviewTransition(){
  if(!pTransiting||pTransitionTo==null) return false;
  const to=pTransitionTo;
  const a=document.getElementById('psa'), b=document.getElementById('psb');
  if(!a||!b) return false;
  _clearPreviewTransTimers();
  const stage=document.getElementById('preview-stage');
  if(stage){
    stage.style.perspective='';
    stage.style.perspectiveOrigin='';
    stage.style.transformStyle='';
    _pResetStageZoom();
  }
  _turnFlipDestroy();
  _removeFlipWrap(a);
  _removeFlipWrap(b);
  try{
    a.getAnimations().forEach(x=>x.cancel());
    b.getAnimations().forEach(x=>x.cancel());
  }catch(e){}
  a.style.transition='none';
  b.style.transition='none';
  a.style.opacity='0';
  a.style.clipPath='';
  a.style.filter='';
  a.style.transform='';
  a.style.zIndex='';
  a.style.visibility='';
  b.style.opacity='1';
  b.style.clipPath='';
  b.style.filter='';
  b.style.pointerEvents='auto';
  b.style.visibility='';
  const sc=pScale();
  b.style.transform='scale('+sc+')';
  b.style.transformOrigin='top left';
  b.querySelectorAll('.psel').forEach(el=>{
    el.style.transition='none';
    el.style.willChange='';
    el.style.visibility='';
    el.style.opacity='';
    el.style.transform='';
  });
  a.querySelectorAll('.psel').forEach(el=>{
    el.style.transition='none';
    el.style.willChange='';
    el.style.visibility='';
  });
  finalizePreview(a,b,to);
  return true;
}
function gotoPreview(to,dir){
  if (to < 0 || to >= slides.length) return;
  const psaEl = document.getElementById('psa');
  const psbEl = document.getElementById('psb');
  if (typeof window._pvCleanupPreviewStage === 'function') {
    if (psaEl) window._pvCleanupPreviewStage(psaEl, pidx);
    if (psbEl) window._pvCleanupPreviewStage(psbEl, pidx);
  }
  const trans=(slides[to]&&slides[to].trans)||globalTrans||'none';
  const dur=typeof _effectiveTransDur==='function'?_effectiveTransDur():(transitionDur||500);
  const flipDur=typeof _flipAnimDur==='function'?_flipAnimDur(dur):dur;
  if(trans==='none'||dur===0){
    // Cancel any running transition immediately
    if(pTransiting){
      _clearPreviewTransTimers();
      pTransitionTo=null;
      const a=document.getElementById('psa'),b=document.getElementById('psb');
      a.style.transition='none';b.style.transition='none';
      _removeFlipWrap(a); _removeFlipWrap(b);
      _turnFlipDestroy();
      pTransiting=false;
    }
    // Stop non-persistent audio from current slide
    if(typeof _mediaStopAllPreviewAudio==='function') _mediaStopAllPreviewAudio();
    _pvCaptureDecorTime(document.getElementById('psa'),pidx);
    buildPSlide(document.getElementById('psa'),to);
    pidx=to;updatePUI();scheduleAuto();return;
  }
  // If already transitioning — finish it instantly then start new
  if(pTransiting){
    skipPreviewTransition();
  }
  pTransiting=true;
  pTransitionTo=to;
  _pvCaptureDecorTime(document.getElementById('psa'),pidx);
  const a=document.getElementById('psa'),b=document.getElementById('psb');buildPSlide(b,to,dur);
  if(trans==='flip'&&_turnFlipAvailable()) doTurnJsFlip(a,b,pidx,to,dir==='next',flipDur,()=>{finalizePreview(a,b,to);});
  else if(trans==='flipV') doBookFlipV(a,b,dir==='next',flipDur,()=>{finalizePreview(a,b,to);});
  else if(trans==='morph')doMorphTransition(a,b,to,()=>{finalizePreview(a,b,to);},dur);
  else animTrans(a,b,trans,dir==='next',(trans==='flip'||trans==='flipV')?flipDur:dur,()=>{finalizePreview(a,b,to);});
}
function finalizePreview(a,b,to){
  if(!pTransiting) return;
  _clearPreviewTransTimers();
  pTransitionTo=null;
  _pResetStageZoom();
  _morphCleanupExits(b);
  // Stop any ongoing transitions
  a.style.transition='none'; b.style.transition='none';
  a.style.zIndex=''; b.style.zIndex='';
  b.querySelectorAll('.psel').forEach(el=>{el.style.willChange='';delete el.dataset.morphEnter;});
  a.querySelectorAll('.psel').forEach(el=>{el.style.willChange='';el.style.visibility='';});
  const sc=pScale();
  // Swap IDs so b becomes psa (active) without moving any DOM nodes.
  // Moving srcdoc iframes in DOM causes browser to reload them — killing live timers.
  a.id='psb'; b.id='psa';
  b.style.cssText='position:absolute;inset:0;width:'+canvasW+'px;height:'+canvasH+'px;transform:scale('+sc+');transform-origin:top left;';
  a.style.cssText='position:absolute;inset:0;opacity:0;pointer-events:none;width:'+canvasW+'px;height:'+canvasH+'px;transform:scale('+sc+');transform-origin:top left;';
  pidx=to;updatePUI();pTransiting=false;scheduleAuto();
}
// Morph transition — match elements by id, then by objects-panel name
function _morphEligible(d){
  if(!d||d._isDecor) return false;
  return !(d.anims&&d.anims.length);
}
function _morphPairOnTo(fd,toSlide){
  if(!fd||!toSlide||!toSlide.els) return null;
  const byId=toSlide.els.find(e=>e.id===fd.id&&!e._isDecor);
  if(byId) return byId;
  const key=typeof morphMatchKey==='function'?morphMatchKey(fd,toSlide.els):'';
  if(!key) return null;
  return toSlide.els.find(e=>!e._isDecor&&e.type===fd.type&&(typeof morphMatchKey==='function'?morphMatchKey(e,toSlide.els):'')===key)||null;
}
function _morphFindFrom(fromEls, toEl, used){
  if(!toEl||toEl._isDecor||!_morphEligible(toEl)) return null;
  const pool=fromEls.filter(f=>!f._isDecor&&!used.has(f.id)&&_morphEligible(f));
  let fd=pool.find(f=>f.id===toEl.id);
  if(fd){ used.add(fd.id); return fd; }
  const key=typeof morphMatchKey==='function'?morphMatchKey(toEl,fromEls):'';
  if(key){
    fd=pool.find(f=>f.type===toEl.type&&(typeof morphMatchKey==='function'?morphMatchKey(f,fromEls):'')===key);
    if(fd){ used.add(fd.id); return fd; }
  }
  return null;
}
function _morphFlipPart(d){
  if(!d||(d.type!=='shape'&&!d.shapeFlipH&&!d.shapeFlipV)) return '';
  if(d.shapeFlipH||d.shapeFlipV) return ` scale(${d.shapeFlipH?-1:1},${d.shapeFlipV?-1:1})`;
  return '';
}
function _morphReflow(el){void (el&&el.offsetHeight);}
function _morphCleanupExits(root){
  if(!root) return;
  root.querySelectorAll('.psel._morph-exit').forEach(el=>el.remove());
}
function _morphExitClone(ael, fd, b){
  ael.style.visibility='hidden';
  ael.style.opacity='0';
  ael.style.pointerEvents='none';
  const clone=ael.cloneNode(true);
  clone.classList.add('_morph-exit');
  clone.style.zIndex='100';
  clone.style.pointerEvents='none';
  clone.style.transition='none';
  clone.style.transformOrigin='0 0';
  clone.style.willChange='transform,opacity';
  clone.style.visibility='visible';
  const baseRot=`rotate(${fd.rot||0}deg)${_morphFlipPart(fd)}`;
  clone.style.transform=baseRot;
  clone.style.opacity=String(fd.elOpacity!=null?fd.elOpacity:1);
  b.appendChild(clone);
  return clone;
}
function _morphAnimateJobs(jobs,dur){
  const easing='cubic-bezier(0.4, 0, 0.2, 1)';
  jobs.forEach(function(job){
    const bel=job.bel;
    if(!bel) return;
    bel.style.visibility='visible';
    bel.style.transition='none';
    let fromTf,toTf,fromOp,toOp;
    if(job.kind==='move'){
      fromTf=job.startTf;
      toTf=job.endTf;
      fromOp=job.endOp;
      toOp=job.endOp;
    }else if(job.kind==='enter'){
      fromTf=job.endTf+' scale(0.96) translateY(14px)';
      toTf=job.endTf;
      fromOp=0;
      toOp=job.endOp;
      bel.dataset.morphEnter='1';
    }else{
      fromTf=job.endTf;
      toTf=job.endTf+' scale(0.94) translateY(10px)';
      fromOp=job.startOp!=null?job.startOp:1;
      toOp=0;
    }
    bel.style.transform=fromTf;
    bel.style.opacity=String(fromOp);
    void bel.offsetHeight;
    try{
      const anim=bel.animate(
        [{transform:fromTf,opacity:fromOp},{transform:toTf,opacity:toOp}],
        {duration:dur,easing:easing,fill:'forwards'}
      );
      anim.onfinish=function(){
        try{anim.commitStyles();}catch(e){}
        anim.cancel();
      };
    }catch(e){
      bel.style.transition='transform '+dur+'ms '+easing+', opacity '+dur+'ms '+easing;
      bel.style.transform=toTf;
      bel.style.opacity=String(toOp);
    }
  });
}
function _morphHideOnFrom(ael){
  ael.style.transition='none';
  ael.style.opacity='0';
  ael.style.visibility='hidden';
  ael.style.pointerEvents='none';
}
function doMorphTransition(a,b,to,cb,durMs){
  const dur=durMs!=null?durMs:(typeof _effectiveTransDur==='function'?_effectiveTransDur():(transitionDur||500));
  const fromSlide=slides[pidx]||{els:[]};
  const toSlide=slides[to]||{els:[]};
  const usedFrom=new Set();
  const animB=[];
  const shadowJobs=[];
  const _shFrom=typeof window._shadowStateFromData==='function'?window._shadowStateFromData:null;
  const _shApply=typeof window._applyShadowValues==='function'?window._applyShadowValues:null;
  const _shNeeds=typeof window._shadowMorphNeeds==='function'?window._shadowMorphNeeds:null;

  b.style.opacity='1';b.style.pointerEvents='auto';b.style.zIndex='2';
  a.style.zIndex='1';a.style.opacity='1';

  b.querySelectorAll('.psel').forEach(bel=>{
    const td=toSlide.els.find(e=>e.id===bel.dataset.id);
    if(!td||td._isDecor||!_morphEligible(td)) return;
    const fd=_morphFindFrom(fromSlide.els,td,usedFrom);
    const flipEnd=_morphFlipPart(td);
    const endTf=`rotate(${td.rot||0}deg)${flipEnd}`;
    const endOp=td.elOpacity!=null?td.elOpacity:1;
    bel.style.transformOrigin='0 0';
    bel.style.willChange='transform,opacity';

    if(fd){
      const dx=fd.x-td.x, dy=fd.y-td.y;
      const sw=td.w?fd.w/td.w:1, sh=td.h?fd.h/td.h:1;
      const startTf=`translate(${dx}px,${dy}px) scale(${sw},${sh}) rotate(${fd.rot||0}deg)${_morphFlipPart(fd)}`;
      bel.style.transition='none';
      bel.style.transform=startTf;
      bel.style.opacity=String(endOp);
      animB.push({bel,endTf,op:endOp,kind:'move',startTf,endOp});
      if(_shFrom&&_shApply&&_shNeeds){
        const fromSh=_shFrom(fd), toSh=_shFrom(td);
        if(_shNeeds(fromSh,toSh)){
          _shApply(bel,td,fromSh.ss,fromSh.sb,fromSh.sc);
          shadowJobs.push({bel,d:td,from:fromSh,to:toSh});
        }
      }
    } else {
      bel.style.transition='none';
      bel.style.visibility='visible';
      bel.style.transform=`${endTf} scale(0.96) translateY(14px)`;
      bel.style.opacity='0';
      animB.push({bel,endTf,op:endOp,kind:'enter',endOp});
      if(_shFrom&&_shApply&&_shNeeds){
        const toSh=_shFrom(td);
        if(toSh.active||toSh.ss>0||toSh.sb>0){
          const fromSh={ss:0,sb:0,sc:toSh.sc,active:false};
          _shApply(bel,td,0,0,toSh.sc);
          shadowJobs.push({bel,d:td,from:fromSh,to:toSh});
        }
      }
    }
  });

  a.querySelectorAll('.psel').forEach(ael=>{
    const id=ael.dataset.id;
    if(!id) return;
    const fd=fromSlide.els.find(e=>e.id===id);
    if(!fd||fd._isDecor) return;
    const td=_morphPairOnTo(fd,toSlide);
    if(td&&(!_morphEligible(fd)||!_morphEligible(td))){
      _morphHideOnFrom(ael);
      return;
    }
    if(usedFrom.has(id)){
      ael.style.transition='none';
      ael.style.opacity='0';
      ael.style.visibility='hidden';
      ael.style.pointerEvents='none';
    } else if(!_morphEligible(fd)){
      _morphHideOnFrom(ael);
      return;
    } else {
      ael.style.visibility='hidden';
      ael.style.opacity='0';
      ael.style.pointerEvents='none';
      const baseRot=`rotate(${fd.rot||0}deg)${_morphFlipPart(fd)}`;
      const exitEl=_morphExitClone(ael,fd,b);
      animB.push({bel:exitEl,endTf:baseRot,op:0,kind:'exit',startOp:fd.elOpacity!=null?fd.elOpacity:1});
      if(_shFrom&&_shApply&&_shNeeds){
        const fromSh=_shFrom(fd);
        if(fromSh.active||fromSh.ss>0||fromSh.sb>0){
          const toSh={ss:0,sb:0,sc:fromSh.sc,active:false};
          shadowJobs.push({bel:exitEl,d:fd,from:fromSh,to:toSh});
        }
      }
    }
  });

  _morphReflow(b);
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      _morphAnimateJobs(animB,dur);
      if(shadowJobs.length&&typeof window._morphRunShadowAnims==='function'){
        window._morphRunShadowAnims(shadowJobs,dur);
      }
      a.style.transition=`opacity ${Math.round(dur*0.65)}ms ease`;
      a.style.opacity='0';
    });
  });
  _previewTransLater(cb,dur+80);
}
let presShuffle=false,presLoop=false,_shuffleHistory=[];

function togglePresShuffle(){
  presShuffle=!presShuffle;
  const btn=document.getElementById('p-shuffle-btn');
  if(btn){btn.classList.toggle('on',presShuffle);btn.classList.toggle('active',presShuffle);}
  if(presShuffle){_shuffleHistory=[pidx];}
  _syncPreviewPlaybackBtns();
  updatePUI();
}
function togglePresLoop(){
  presLoop=!presLoop;
  const btn=document.getElementById('p-loop-btn');
  if(btn){btn.classList.toggle('on',presLoop);btn.classList.toggle('active',presLoop);}
  _syncPreviewPlaybackBtns();
  updatePUI();
}

function nextPreview(){
  if(pTransiting){ skipPreviewTransition(); return; }
  const psa=document.getElementById('psa');
  if(psa._fireNextStep&&psa._fireNextStep())return;
  if(presShuffle){
    const available=slides.map((_,i)=>i).filter(i=>i!==pidx);
    if(!available.length)return; // only 1 slide
    const next=available[Math.floor(Math.random()*available.length)];
    clearAutoTimer();_shuffleHistory.push(next);gotoPreview(next,'next');
    return;
  }
  if(pidx>=slides.length-1){
    if(presLoop){clearAutoTimer();gotoPreview(0,'next');}
    return;
  }
  clearAutoTimer();gotoPreview(pidx+1,'next');
}
function prevPreview(){
  if(pTransiting){ skipPreviewTransition(); return; }
  if(presShuffle&&_shuffleHistory.length>1){
    _shuffleHistory.pop();
    clearAutoTimer();gotoPreview(_shuffleHistory[_shuffleHistory.length-1],'prev');
    return;
  }
  if(pidx<=0)return;
  clearAutoTimer();gotoPreview(pidx-1,'prev');
}
function scheduleAuto(){
  clearAutoTimer();const s=slides[pidx];const delay=(s&&s.auto>0)?s.auto*1000:0;
  const isLast=pidx>=slides.length-1;
  if(delay>0){
    const doNext=()=>{
      if(presShuffle){
        const available=slides.map((_,i)=>i).filter(i=>i!==pidx);
        if(available.length){const next=available[Math.floor(Math.random()*available.length)];_shuffleHistory.push(next);gotoPreview(next,'next');}
      } else if(isLast&&presLoop){
        gotoPreview(0,'next'); // loop back when loop is enabled
      } else if(isLast){
        gotoPreview(0,'next'); // always loop from last if auto-advance is set on last slide
      } else {
        gotoPreview(pidx+1,'next');
      }
    };
    autoTimer=setTimeout(doNext,delay);
    document.getElementById('p-auto-indicator').classList.add('on');
  } else {
    document.getElementById('p-auto-indicator').classList.remove('on');
  }
}
function clearAutoTimer(){clearTimeout(autoTimer);autoTimer=null;}
function updatePUI(){
  const total=slides.length;
  document.getElementById('p-counter').textContent=(pidx+1)+' / '+total;
  document.getElementById('p-prev').style.opacity=(pidx>0||presLoop||presShuffle)?'1':'0.2';
  document.getElementById('p-next').style.opacity=(pidx<total-1||presLoop||presShuffle)?'1':'0.2';
  const dn=document.getElementById('p-dot-nav');dn.innerHTML='';
  const max=Math.min(total,25);
  for(let i=0;i<max;i++){
    const d=document.createElement('div');d.className='p-dot'+(i===pidx?' active':'');
    (function(idx){d.onclick=()=>{clearAutoTimer();if(!pTransiting)gotoPreview(idx,idx>pidx?'next':'prev');};})(i);dn.appendChild(d);
  }
}
function _pvGroupMembers(d, slide) {
  if (!d || !d.groupId || !slide || !slide.els) return d ? [d] : [];
  const members = slide.els.filter(x => x.groupId === d.groupId);
  return members.length > 1 ? members : [d];
}
function _pvGroupLeader(d, slide) {
  if (!d || !d.groupId || !slide || !slide.els) return d;
  const members = _pvGroupMembers(d, slide);
  if (members.length <= 1) return d;
  for (let i = 0; i < slide.els.length; i++) {
    if (members.some(m => m.id === slide.els[i].id)) return slide.els[i];
  }
  return d;
}
function _pvIsGroupFollower(d, slide) {
  return !!(d && d.groupId && _pvGroupLeader(d, slide).id !== d.id);
}
function _pvIsElSpecificAnim(name) {
  return typeof window._animIsElementSpecific === 'function' && window._animIsElementSpecific(name);
}
function _repairGroupElementSpecificAnims(slide) {
  if (!slide || !slide.els || typeof window._animIsElementSpecific !== 'function') return;
  if (typeof window._ensureAnimOrder === 'function') window._ensureAnimOrder(slide);
  const orderOwners = new Set((slide.animOrder || []).map(o => o.elId + ':' + o.ai));
  const byGroup = {};
  slide.els.forEach(d => {
    if (!d.groupId) return;
    if (!byGroup[d.groupId]) byGroup[d.groupId] = [];
    byGroup[d.groupId].push(d);
  });
  Object.keys(byGroup).forEach(gid => {
    const members = byGroup[gid];
    if (members.length < 2) return;
    const memberIds = new Set(members.map(m => m.id));
    const seenSpec = {};
    (slide.animOrder || []).forEach(o => {
      if (!memberIds.has(o.elId)) return;
      const md = slide.els.find(x => x.id === o.elId);
      const a = md && md.anims && md.anims[o.ai];
      if (!a || !window._animIsElementSpecific(a.name)) return;
      if (seenSpec[a.name]) return;
      seenSpec[a.name] = o;
    });
    members.forEach(md => {
      if (!md.anims || !md.anims.length) return;
      md.anims = md.anims.filter((a, ai) => {
        if (!window._animIsElementSpecific(a.name)) return true;
        const canon = seenSpec[a.name];
        if (canon) return md.id === canon.elId && ai === canon.ai;
        return orderOwners.has(md.id + ':' + ai);
      });
    });
  });
  if (typeof window._ensureAnimOrder === 'function') window._ensureAnimOrder(slide);
}
function _pvBuildParticlesHideSet(s, globalAutoMap, globalClickMap, hiddenSet) {
  const hide = new Set();
  const scanMap = (map) => {
    if (!map) return;
    map.forEach((entries, elId) => {
      if (hiddenSet && hiddenSet.has(elId)) return;
      if ((entries || []).some(x => x.anim && x.anim.name === 'particles')) hide.add(elId);
    });
  };
  scanMap(globalAutoMap);
  scanMap(globalClickMap);
  if (!s || !s.els) return hide;
  s.els.forEach(d => {
    if (hiddenSet && hiddenSet.has(d.id)) return;
    (d.anims || []).forEach(a => {
      if (a && a.name === 'particles' && a.trigger === 'element') hide.add(d.id);
    });
    if (!d.groupId && window._particlesHasAnim && window._particlesHasAnim(d)) hide.add(d.id);
  });
  const byGroupParticles = {};
  s.els.forEach(d => {
    if (!d.groupId || !window._particlesHasAnim || !window._particlesHasAnim(d)) return;
    if (!byGroupParticles[d.groupId]) byGroupParticles[d.groupId] = [];
    byGroupParticles[d.groupId].push(d.id);
  });
  Object.keys(byGroupParticles).forEach(gid => {
    const ids = byGroupParticles[gid];
    if (ids.length === 1) hide.add(ids[0]);
  });
  return hide;
}
function _pvPushAnimToMap(map, elId, anim, absDelay, autoAfter) {
  const arr = map.get(elId) || [];
  arr.push(autoAfter != null ? { anim, autoAfter } : { anim, absDelay });
  map.set(elId, arr);
}
function _pvDistributeScheduledAnim(s, d, a, i, absDelay, autoMap, clickMap, eff) {
  if (_pvIsElSpecificAnim(a.name)) {
    if (eff === 'click' || eff === 'autoAfter' || eff === 'nav') {
      _pvPushAnimToMap(clickMap, d.id, a, null, eff === 'autoAfter');
    } else {
      _pvPushAnimToMap(autoMap, d.id, a, absDelay);
    }
    return;
  }
  _pvGroupMembers(d, s).forEach(md => {
    const ma = (md.anims || [])[i];
    if (!ma) return;
    if (eff === 'click' || eff === 'autoAfter' || eff === 'nav') {
      _pvPushAnimToMap(clickMap, md.id, ma, null, eff === 'autoAfter');
    } else {
      _pvPushAnimToMap(autoMap, md.id, ma, absDelay);
    }
  });
}
function _pvFlushCaptionAnims(container, s, transOffset) {
  const queue = container._pendingCaptionQueue;
  if (!queue || !queue.length) return;
  delete container._pendingCaptionQueue;
  const seen = new Set();
  const offset = transOffset || 0;
  queue.forEach(({ d, a, absDelay }) => {
    const delay = (absDelay || 0) + offset;
    if (d.groupId) {
      const leader = _pvGroupLeader(d, s);
      if (d.id !== leader.id) return;
      const key = d.groupId + '|' + delay + '|' + (a.name || 'captionSlide');
      if (seen.has(key)) return;
      seen.add(key);
      const entries = _pvGroupMembers(d, s).map(md => {
        const mel = container.querySelector('.psel[data-id="' + md.id + '"]');
        return mel ? { el: mel, x: md.x || 0, y: md.y || 0, w: md.w || 200, h: md.h || 200 } : null;
      }).filter(Boolean);
      if (entries.length && typeof _fireCaptionSlideAnimGroup === 'function') {
        _fireCaptionSlideAnimGroup(entries, a, delay, { hideAfter: true });
      }
    } else {
      const mel = container.querySelector('.psel[data-id="' + d.id + '"]');
      if (mel && typeof _fireCaptionSlideAnim === 'function') {
        _fireCaptionSlideAnim(mel, a, delay, d.w, d.h, { hideAfter: true });
      }
    }
  });
}
function _pvBuildStepFromAnimIndex(anims, startAi){
  const a = anims[startAi];
  const step = { anims: [a], willHide: a.cat === 'exit', navTarget: null, triggerElId: a.triggerElId || '' };
  let j = startAi + 1;
  while(j < anims.length && anims[j].trigger === 'withPrev'){
    const b = anims[j];
    step.anims.push(b);
    if(b.cat === 'exit') step.willHide = true;
    if(typeof b.navTarget === 'number') step.navTarget = b.navTarget;
    j++;
  }
  return step;
}

function _pvFireAppletAnim(ref, container, slideIdx){
  if(!ref || !container) return;
  const parts = String(ref).split(':');
  if(parts.length < 2) return;
  const s = slides[slideIdx];
  if(!s) return;
  let elId = parts[0], ai = +parts[1];
  let d = s.els.find(x => x.id === elId);
  let a = d && d.anims && d.anims[ai];
  if(typeof resolveAppletAnimRef === 'function' && typeof _isValidAppletAnimRef === 'function'){
    let appletElId = a && a.triggerElId;
    let trig = a && a.trigger;
    if(!appletElId || trig === 'counter' || trig === 'timer'){
      if(!appletElId || !_isValidAppletAnimRef(s, appletElId, ref, trig)){
        for(const ad of s.els){
          if(ad.type !== 'applet') continue;
          if(ad.appletId === 'counter' && (ad.cntOnEnd || 'none') === 'anim'
              && (!ad.cntOnEndAnim || ad.cntOnEndAnim === ref)){
            appletElId = ad.id; trig = 'counter'; break;
          }
          if(ad.appletId === 'timer' && (ad.tmOnEnd || 'none') === 'anim'
              && (!ad.tmOnEndAnim || ad.tmOnEndAnim === ref)){
            appletElId = ad.id; trig = 'timer'; break;
          }
        }
      }
      if(appletElId && trig){
        const resolved = resolveAppletAnimRef(s, appletElId, ref, trig);
        if(resolved && resolved !== ref){
          ref = resolved;
          const p2 = resolved.split(':');
          elId = p2[0]; ai = +p2[1];
          d = s.els.find(x => x.id === elId);
          a = d && d.anims && d.anims[ai];
        }
      }
    }
  }
  if(!d || !a) return;
  const isCanvas = container.id === 'canvas';
  const targetEl = container.querySelector((isCanvas ? '.el' : '.psel') + '[data-id="' + elId + '"]');
  if(!targetEl) return;
  const step = _pvBuildStepFromAnimIndex(d.anims, ai);
  const totalDur = _pvFireElemTrigStep(targetEl, d, step, slideIdx);
  if(!isCanvas && step.navTarget !== null){
    setTimeout(() => {
      clearAutoTimer();
      gotoPreview(step.navTarget, step.navTarget > slideIdx ? 'next' : 'prev');
    }, totalDur);
  }
}

window.fireAppletAnimRef = function(ref, slideIdx, appletVal){
  if(!ref) return;
  const inPreview = document.getElementById('preview-ov')?.classList.contains('active');
  const idx = slideIdx != null ? slideIdx : (inPreview ? pidx : cur);
  const container = inPreview ? document.getElementById('psa') : document.getElementById('canvas');
  if(!container || typeof fireAnim !== 'function') return;
  if(appletVal != null){
    const parts = String(ref).split(':');
    if(parts.length >= 2){
      const targetEl = container.querySelector((container.id === 'canvas' ? '.el' : '.psel') + '[data-id="' + parts[0] + '"]');
      if(targetEl) targetEl._splitAppletLiveVal = appletVal;
    }
  }
  _pvFireAppletAnim(ref, container, idx);
};

function _pvBuildElemClickSteps(anims) {
  const steps = [];
  let i2 = 0;
  while (i2 < anims.length) {
    const a = anims[i2];
    if (a.trigger === 'element') {
      const step = { anims: [a], willHide: false, navTarget: null, triggerElId: a.triggerElId || '' };
      if (a.cat === 'exit') step.willHide = true;
      if (typeof a.navTarget === 'number') step.navTarget = a.navTarget;
      let j = i2 + 1;
      while (j < anims.length && anims[j].trigger === 'withPrev') {
        const b = anims[j];
        step.anims.push(b);
        if (b.cat === 'exit') step.willHide = true;
        if (typeof b.navTarget === 'number') step.navTarget = b.navTarget;
        j++;
      }
      steps.push(step);
      i2 = j;
    } else {
      i2++;
    }
  }
  return steps;
}

function _pvFireElemTrigStep(targetPsel, targetD, step, slideIdx) {
  let delay = 0;
  step.anims.forEach(a => {
    const d2 = a.delay || 0;
    setTimeout(() => {
      if(a.cat === 'entrance'){
        if (!(typeof window._particlesHasAnim === 'function' && window._particlesHasAnim(targetD))) {
          targetPsel.style.visibility = 'visible';
          targetPsel.style.pointerEvents = '';
        }
      }
      fireAnim(targetPsel, targetD, a, slideIdx, 0);
    }, delay + d2);
    delay += d2 + (a.duration || 600);
  });
  return delay;
}

function _pvWireElemTriggers(container, slideIdx) {
  const bindings = container._elemTrigBindings;
  if (!bindings || !bindings.length) return;
  delete container._elemTrigBindings;

  // triggerElId → все шаги, привязанные к этому триггеру (на любом объекте)
  const trigMap = new Map();
  bindings.forEach(b => {
    b.steps.forEach(step => {
      const tid = step.triggerElId;
      if (!tid) return;
      const arr = trigMap.get(tid) || [];
      arr.push({ targetD: b.targetD, step });
      trigMap.set(tid, arr);
    });
  });

  trigMap.forEach((entries, tid) => {
    const trigPsel = container.querySelector('.psel[data-id="' + tid + '"]');
    if (!trigPsel) return;
    trigPsel.style.cursor = 'pointer';
    trigPsel.addEventListener('click', e => {
      e.stopPropagation();
      entries.forEach(({ targetD, step }) => {
        const targetPsel = container.querySelector('.psel[data-id="' + targetD.id + '"]');
        if (!targetPsel) return;
        const totalDur = _pvFireElemTrigStep(targetPsel, targetD, step, slideIdx);
        if (step.navTarget !== null) {
          setTimeout(() => {
            clearAutoTimer();
            gotoPreview(step.navTarget, step.navTarget > slideIdx ? 'next' : 'prev');
          }, totalDur);
        }
      });
    });
  });
}

function _pvAnimContentEl(el, d) {
  if (d.type === 'text') {
    return el.querySelector('._text_body') || el.querySelector('.ec') || el;
  }
  return el.querySelector('.ec') || el;
}

function _pvHasLaterEntrance(slide, elId, animIndex) {
  if (!slide || animIndex == null || animIndex < 0) return false;
  if (typeof window._ensureAnimOrder === 'function') window._ensureAnimOrder(slide);
  const order = slide.animOrder || [];
  let seenCurrent = false;
  for (let oi = 0; oi < order.length; oi++) {
    const entry = order[oi];
    if (entry.elId !== elId) continue;
    if (entry.ai === animIndex) { seenCurrent = true; continue; }
    if (seenCurrent) {
      const d = slide.els.find(x => x.id === elId);
      const a = d && d.anims && d.anims[entry.ai];
      if (a && a.cat === 'entrance') return true;
    }
  }
  return false;
}

function _pvCancelExitHide(el) {
  if (el && el._pvExitHideTimer) {
    clearTimeout(el._pvExitHideTimer);
    el._pvExitHideTimer = null;
  }
}

function _pvScheduleExitHide(el, ms, opts) {
  opts = opts || {};
  _pvCancelExitHide(el);
  el._pvExitHideTimer = setTimeout(() => {
    el._pvExitHideTimer = null;
    el.style.visibility = 'hidden';
    el.style.pointerEvents = 'none';
    if (opts.permanent && opts.idx != null && opts.d) {
      if (!hiddenElsPerSlide[opts.idx]) hiddenElsPerSlide[opts.idx] = new Set();
      hiddenElsPerSlide[opts.idx].add(opts.d.id);
    }
  }, ms);
}

function _pvRevealForEntrance(el, d, idx) {
  _pvCancelExitHide(el);
  if (typeof window._resetCaptionSlide === 'function') window._resetCaptionSlide(el, true);
  if (typeof window._resetSplitHalf === 'function') window._resetSplitHalf(el, true);
  if (!(typeof window._particlesHasAnim === 'function' && window._particlesHasAnim(d))) {
    el.style.visibility = 'visible';
    el.style.pointerEvents = '';
  } else if (typeof window._particlesHideOriginal === 'function') {
    window._particlesHideOriginal(el);
  }
  if (idx != null && d && hiddenElsPerSlide[idx]) hiddenElsPerSlide[idx].delete(d.id);
}

function _pvFinishCssAnimGroup(el, animTarget, grp) {
  const maxDur = Math.max(...grp.map(a => a.duration || 600));
  const hasExit = grp.some(a => a.cat === 'exit');
  if (hasExit) {
    _pvScheduleExitHide(el, maxDur);
  } else if (animTarget !== el) {
    setTimeout(() => { animTarget.style.animation = ''; }, maxDur + 100);
  }
}

function buildPSlide(container,idx,transOffset,noScale){
  transOffset=transOffset||0;
  const sched = (fn, ms) => {
    if (container && typeof window._pvScheduleOnStage === 'function') window._pvScheduleOnStage(container, fn, ms);
    else setTimeout(fn, ms);
  };
  if (container) {
    container._pvStageAborted = false;
    if (container._pvStageTimers) {
      container._pvStageTimers.forEach(t => clearTimeout(t));
      container._pvStageTimers = [];
    }
  }
  if (!window._pFloatCache) window._pFloatCache = {};
  window._pFloatCache[idx] = {};
  const s=slides[idx];const sc=pScale();
  if (typeof window._ensureAnimOrder === 'function') window._ensureAnimOrder(s);
  _repairGroupElementSpecificAnims(s);
  container.innerHTML='';container.style.width=canvasW+'px';container.style.height=canvasH+'px';
  if(noScale){container.style.transform='';container.style.transformOrigin='';}
  else{container.style.transform='scale('+sc+')';container.style.transformOrigin='top left';}
  const bg=document.createElement('div');bg.style.cssText='position:absolute;inset:0;z-index:0;';
  if(typeof _applySlideBgToEl==='function')_applySlideBgToEl(bg,s);
  else{
    if(s.bg==='custom'||s.bg==='theme'){
      const _ti2=typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0?appliedThemeIdx:-1;
      const _tb2=_ti2>=0?THEMES[_ti2].bg:'#1a1a2e';
      bg.style.background=s.bgc||_tb2;
    }
    else{const b=BGS.find(b=>b.id===s.bg);bg.style.background=b?b.s:'#ddd';}
  }
  container.appendChild(bg);

  const hiddenSet=hiddenElsPerSlide[idx]||new Set();

  // --- Build global click/key queue for non-trigger animations ---
  // Each entry: array of {el, anim} to fire together on one advance
  // We group by: all 'click' anims on elements that are NOT triggers, in order of their delay
  const globalClickSteps=[]; // [{el,anim}, ...] per step

  // --- Global anim classification ---
  // Pass 1: flatten all anims across all elements with their effective trigger
  // Rule: if any anim in the global sequence is 'click', all following auto/withPrev
  // anims (on any element) are also treated as click until a new explicit non-withPrev auto appears
  const globalAnimList = typeof window._buildSlideAnimGlobalList === 'function'
    ? window._buildSlideAnimGlobalList(s).filter(({ d }) => !hiddenSet.has(d.id))
    : [];
  if (!globalAnimList.length) {
    s.els.forEach(d => {
      if(hiddenSet.has(d.id)) return;
      if (_pvIsGroupFollower(d, s)) return;
      (d.anims||[]).forEach((a, i) => globalAnimList.push({d, a, i}));
    });
  }

  // Compute effective trigger for each anim globally
  // Rule: 'withPrev' inherits trigger from previous anim
  // 'auto'/'afterPrev' after a click (same or different element) = autoAfter (fires after click group ends)
  // New explicit 'click' resets; new 'auto' on a NEW element that has no prior click = plain auto
  let lastEffTrig = 'auto';
  let lastEffEl = null;
  let lastEffResult = 'auto'; // что реально получил предыдущий элемент (для withPrev)
  const globalEffTrig = globalAnimList.map(({a, d}) => {
    const t = a.trigger||'auto';
    if(t === 'element') {
      // Триггер по объекту — вне сценария, не влияет на последующие авто-анимации
      lastEffTrig = 'auto'; lastEffEl = null; lastEffResult = 'element';
      return 'element';
    }
    if(t === 'nav') {
      // Переход по клику — тоже вне сценария
      lastEffTrig = 'auto'; lastEffEl = null; lastEffResult = 'nav';
      return 'nav';
    }
    if(t === 'click') {
      lastEffTrig = 'click'; lastEffEl = d.id; lastEffResult = 'click';
      return 'click';
    }
    if(t === 'withPrev') {
      // Наследуем результат предыдущего — не lastEffTrig
      // Это исправляет: click → autoAfter(el2) → withPrev(el3) → autoAfter (не click)
      return lastEffResult;
    }
    // auto / afterPrev
    if(lastEffTrig === 'click') {
      lastEffEl = d.id;
      lastEffResult = 'autoAfter';
      return 'autoAfter';
    }
    lastEffTrig = 'auto'; lastEffEl = null; lastEffResult = 'auto';
    return 'auto';
  });

  // Build per-element maps: autoMap and clickMap
  const globalAutoMap = new Map();  // elId -> [{anim, absDelay}]
  const globalClickMap = new Map(); // elId -> [{anim, autoAfter?}]
  {
    let gPrevStart = 0, gPrevDur = 0;
    globalAnimList.forEach(({d, a, i}, gi) => {
      const eff = globalEffTrig[gi];
      const trig = a.trigger || 'auto';
      // element/nav/click — не в авто-карту; element/nav также вне сценария (withPrev-цепочки)
      if(trig === 'element' || trig === 'click' || trig === 'nav' || trig === 'counter' || trig === 'timer') return;
      if(eff === 'element' || eff === 'nav' || eff === 'counter' || eff === 'timer') return;
      if(eff === 'auto' || eff === 'withPrev') {
        const relDelay = a.delay||0;
        let absDelay;
        const _isLive = typeof ANIM_INFO!=='undefined'&&ANIM_INFO[a.name]&&ANIM_INFO[a.name].cat==='live';
        if(gPrevStart===0 && gPrevDur===0){
          absDelay = relDelay;
        } else if(_isLive && a.name!=='typewriter' && (a.trigger||'auto')==='auto'){
          // live (dance и др.) стартует после предыдущей анимации, как обычный afterPrev
          absDelay = gPrevStart + gPrevDur + relDelay;
        } else if((a.trigger||'auto')==='withPrev'){
          absDelay = gPrevStart + relDelay;
        } else {
          absDelay = gPrevStart + gPrevDur + relDelay;
        }
        // Обновляем gPrevStart/gPrevDur для всех анимаций включая live
        // Это гарантирует что следующая анимация стартует после текущей
        if(a.name==='typewriter'){
          const _fromLen = (a.fromHtml||'').replace(/<[^>]*>/g,'').length;
          const _toLen   = (a.toHtml  ||'').replace(/<[^>]*>/g,'').length;
          const _cd = a.charDelay||40;
          const _twDur = (_fromLen + _toLen) * _cd;
          gPrevStart = absDelay;
          gPrevDur   = _twDur;
        } else {
          // live тоже сдвигает цепочку — иначе две live подряд стартуют одновременно
          gPrevStart = absDelay;
          gPrevDur   = typeof _animChainDuration === 'function' ? _animChainDuration(a) : (a.duration||600);
        }
        _pvDistributeScheduledAnim(s, d, a, i, absDelay, globalAutoMap, globalClickMap, eff);
      } else if(eff === 'click' || eff === 'autoAfter' || eff === 'nav') {
        _pvDistributeScheduledAnim(s, d, a, i, absDelay, globalAutoMap, globalClickMap, eff);
      }
    });
  }

  const particlesHideSet = _pvBuildParticlesHideSet(s, globalAutoMap, globalClickMap, hiddenSet);

  s.els.forEach((d,_elIdx)=>{
    if(hiddenSet.has(d.id))return;
    const el=document.createElement('div');el.className='psel';
    el.dataset.id=d.id;
    el.dataset.type=d.type||'';
    const rot=d.rot||0;
    // Build border-radius string (text boxes use rx_tl etc, shapes use d.rx)
    let rxStr='';
    if(d.type==='text'&&(d.rx_tl||d.rx_tr||d.rx_bl||d.rx_br)){
      const u=d.rxUnit||'px';
      rxStr='border-radius:'+(d.rx_tl||0)+u+' '+(d.rx_tr||0)+u+' '+(d.rx_br||0)+u+' '+(d.rx_bl||0)+u+';';
    }
    // Determine cursor
    const hasCursor=(d.link||( d.hoverFx&&d.hoverFx.enabled));
    const elOp=d.elOpacity!=null?d.elOpacity:1;
    const _previewBdBlur=(d.type==='text'&&d.textBgBlur>0)?'backdrop-filter:blur('+d.textBgBlur+'px);-webkit-backdrop-filter:blur('+d.textBgBlur+'px);':'';
    const _hasSwing = (d.anims||[]).some(a=>a.name==='swing');
    const _hasFloat = (d.anims||[]).some(a=>a.name==='float');
    const _hasDance = (d.anims||[]).some(a=>a.name==='dance');
    const _hasParticles = (d.anims||[]).some(a=>a.name==='particles');
    const _hasCaption = (d.anims||[]).some(a=>a.name==='captionSlide');
    const _hasTextShadow = d.type==='text'&&window._textShadowActive&&window._textShadowActive(d);
    const _sfSft=(d.shapeFlipH||d.shapeFlipV)?' scale('+(d.shapeFlipH?-1:1)+','+(d.shapeFlipV?-1:1)+')':'';
    if(d._isDecor) el.classList.add('is-decor');
    const _pvZ=d._isDecor?'1':'2';
    el.style.cssText='position:absolute;left:'+d.x+'px;top:'+d.y+'px;width:'+d.w+'px;height:'+d.h+'px;z-index:'+_pvZ+';'+(d.type==='lego'||_hasSwing||_hasFloat||_hasDance||_hasParticles||_hasCaption||_hasTextShadow?'overflow:visible;':'overflow:hidden;')+'transform:rotate('+rot+'deg)'+_sfSft+';'+rxStr+(hasCursor?'cursor:pointer;':'cursor:default;')+(elOp!==1?'opacity:'+elOp+';':'')+_previewBdBlur;
    if(_hasDance) el.classList.add('has-dance');

    // Build content
    if(d.type==='text'){
      if(d.valign) el.dataset.valign=d.valign;
      if(d.bulletGap!=null) el.dataset.bulletGap=d.bulletGap;
      el.dataset.id=d.id;
      if(typeof window._stampTextDatasetFromModel==='function') window._stampTextDatasetFromModel(el,d);
      const body=document.createElement('div');
      body.className='_text_body';
      body.style.cssText='position:absolute;inset:0;overflow:hidden;'+rxStr+'pointer-events:none;z-index:0;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;';
      const c=document.createElement('div');
      c.className='ec tel';
      const csStr=(d.cs||'').trim();
      c.style.cssText=(csStr?(csStr.endsWith(';')?csStr:csStr+';'):'')+'overflow:hidden;'+rxStr+'pointer-events:none;user-select:none;position:relative;z-index:1;box-sizing:border-box;';
      if(d.textColorGrad&&d.textColorGrad1){
        const _tcgDir=d.textColorGradDir!=null?d.textColorGradDir:90;
        c.style.background=`linear-gradient(${_tcgDir}deg,${d.textColorGrad1},${d.textColorGrad2||'transparent'})`;
        c.style.webkitBackgroundClip='text';c.style.backgroundClip='text';c.style.webkitTextFillColor='transparent';
      }
      if(d.textBg||d.textBgGrad){
        const op2=d.textBgOp!=null?d.textBgOp:1;
        const toRgba2=(hex,a)=>{if(!hex)return`rgba(0,0,0,0)`;const rv=parseInt(hex.slice(1,3),16),gv=parseInt(hex.slice(3,5),16),bv=parseInt(hex.slice(5,7),16);return`rgba(${rv},${gv},${bv},${a})`;};
        const _pvBgLayer=document.createElement('div');
        _pvBgLayer.className='el-bg-layer';
        _pvBgLayer.style.cssText='position:absolute;inset:0;z-index:0;pointer-events:none;border-radius:inherit;';
        if(d.textBgGrad){
          const dir2=d.textBgDir!=null?d.textBgDir:90;
          _pvBgLayer.style.background=`linear-gradient(${dir2}deg,${toRgba2(d.textBg,op2)},${toRgba2(d.textBgCol2,op2)})`;
        } else {
          _pvBgLayer.style.background=toRgba2(d.textBg,op2);
        }
        body.appendChild(_pvBgLayer);
      }
      const _pvHtml = (typeof rtMigrateHtml==='function')
        ? rtMigrateHtml(d.html||'', typeof _rtFontSizeFromCs==='function' ? _rtFontSizeFromCs(d.cs) : null)
        : (d.html||'');
      c.innerHTML=_pvHtml;
      if (typeof _rtNormalizeTextDisplay === 'function') _rtNormalizeTextDisplay(c, csStr, d.bulletGap);
      body.appendChild(c);
      el.appendChild(body);
      if(typeof applyTextPad==='function') applyTextPad(el);
      if(d.valign&&typeof applyTextVAlign==='function') applyTextVAlign(el,d.valign);
      if(window._textShadowActive&&window._textShadowActive(d)){
        el.dataset.id=d.id;
        if(d.textShadowBlur!=null)el.dataset.textShadowBlur=d.textShadowBlur;
        if(d.textShadowSize!=null)el.dataset.textShadowSize=d.textShadowSize;
        if(d.textShadowW&&+d.textShadowW>0&&!d.textShadowBlur&&!d.textShadowSize)el.dataset.textShadowW=d.textShadowW;
        el.dataset.textShadowColor=d.textShadowColor||'#000000';
        if(typeof applyTextShadowStyle==='function') applyTextShadowStyle(el);
        else if(typeof window._applyTextShadowFilter==='function') window._applyTextShadowFilter(el,d);
      }
      if(typeof applyTextBlockShadowStyle==='function'){
        if(d.textBlockShadowBlur!=null)el.dataset.textBlockShadowBlur=d.textBlockShadowBlur; else delete el.dataset.textBlockShadowBlur;
        if(d.textBlockShadowSize!=null)el.dataset.textBlockShadowSize=d.textBlockShadowSize; else delete el.dataset.textBlockShadowSize;
        if(d.textBlockShadowColor)el.dataset.textBlockShadowColor=d.textBlockShadowColor; else delete el.dataset.textBlockShadowColor;
        if(d.textBlockShadowInset)el.dataset.textBlockShadowInset='1'; else delete el.dataset.textBlockShadowInset;
        applyTextBlockShadowStyle(el);
      }
      // Border for text boxes
      if(d.textBorderW&&+d.textBorderW>0){
        el.dataset.textBorderW=d.textBorderW;
        el.dataset.textBorderColor=d.textBorderColor||'#ffffff';
        if(d.textBorderStyle) el.dataset.textBorderStyle=d.textBorderStyle;
        if(typeof applyTextBorderStyle==='function') applyTextBorderStyle(el);
      }
      if((d.rx_tl||d.rx_tr||d.rx_bl||d.rx_br)&&typeof applyTextRadius==='function') applyTextRadius(el);
    }else if(d.type==='image'){
      const img=document.createElement('img');img.src=typeof assetUrl==='function'?assetUrl(d.src):d.src;
      img.onload=function(){if(typeof _preloadAlphaCanvas==='function')_preloadAlphaCanvas(img);};
      if(img.complete&&img.naturalWidth&&typeof _preloadAlphaCanvas==='function')_preloadAlphaCanvas(img);
      const cL=d.imgCropL||0,cT=d.imgCropT||0,cR=d.imgCropR||0,cB=d.imgCropB||0;
      const hasCrop=cL||cT||cR||cB;
      if(hasCrop){
        const fW=(d._cropFullW>0)?d._cropFullW:(d.w+cL+cR);
        const fH=(d._cropFullH>0)?d._cropFullH:(d.h+cT+cB);
        const logVisW=Math.max(1,fW-cL-cR);
        const logVisH=Math.max(1,fH-cT-cB);
        const wPct=(fW/logVisW*100).toFixed(4)+'%';
        const hPct=(fH/logVisH*100).toFixed(4)+'%';
        const lPct=(-cL/logVisW*100).toFixed(4)+'%';
        const tPct=(-cT/logVisH*100).toFixed(4)+'%';
        const _fxp=d.imgFlipH?-1:1,_fyp=d.imgFlipV?-1:1;
        const _trp=(_fxp===-1||_fyp===-1)?`scale(${_fxp},${_fyp})`:'';
        img.style.cssText=`position:absolute;left:${lPct};top:${tPct};width:${wPct};height:${hPct};object-fit:fill;display:block;opacity:${d.imgOpacity!=null?d.imgOpacity:1};transform:${_trp};transform-origin:center;`;
        if(!_hasDance) el.style.overflow='hidden';
      } else {
        const _fxp=d.imgFlipH?-1:1,_fyp=d.imgFlipV?-1:1;
        const _trp=(_fxp===-1||_fyp===-1)?`scale(${_fxp},${_fyp})`:'';
        img.style.cssText=`width:100%;height:100%;object-fit:${d.imgFit||'contain'};object-position:${d.imgPosX||'center'} ${d.imgPosY||'center'};display:block;opacity:${d.imgOpacity!=null?d.imgOpacity:1};transform:${_trp};transform-origin:center;`;
      }
      if(d.imgShadow){if(typeof window._applyImgShadowFilter==='function')window._applyImgShadowFilter(el,d);if(!hasCrop)el.style.overflow='visible';}
      else if(_hasDance){el.style.overflow='visible';el.style.filter='';}
      else{el.style.filter='';}
      if(d.imgRx)el.style.borderRadius=d.imgRx+'px';
      if(d.imgBw&&+d.imgBw>0){el.style.border=`${d.imgBw}px solid ${d.imgBc||'#fff'}`;el.style.boxSizing='border-box';}
      el.appendChild(img);
    }else if(d.type==='shape'){
      // Mirror editor DOM: el > blur_overlay? > ec > sel-el > shape-svg + shape-text
      el.style.overflow='visible';
      // Don't change position — el is already position:absolute from cssText
      if(d.shapeBlur>0){
        const _pcp=_shapeClipPath(d,d.w,d.h);
        const _pov=document.createElement('div');
        _pov.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:0;backdrop-filter:blur('+d.shapeBlur+'px);-webkit-backdrop-filter:blur('+d.shapeBlur+'px);'+(_pcp!=='none'?'clip-path:'+_pcp+';-webkit-clip-path:'+_pcp+';':'');
        el.appendChild(_pov);
      }
      const _ec=document.createElement('div');
      _ec.className='ec';
      _ec.style.cssText='width:100%;height:100%;overflow:visible;position:relative;z-index:1;';
      const _selEl=document.createElement('div');
      _selEl.className='sel-el';
      _selEl.style.cssText='position:absolute;inset:0;overflow:visible;';
      const _svgDiv=document.createElement('div');
      _svgDiv.className='shape-svg';
      _svgDiv.innerHTML=buildShapeSVG(d,d.w,d.h);
      _selEl.appendChild(_svgDiv);
      if(d.shapeHtml){
        const txt=document.createElement('div');
        txt.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:8px;text-align:center;pointer-events:none;'+(d.shapeTextCss||'font-size:24px;font-weight:700;color:#fff;');
        txt.innerHTML=d.shapeHtml;_selEl.appendChild(txt);
      }
      _ec.appendChild(_selEl);el.appendChild(_ec);
      if(typeof window._syncShapeShadowLayout==='function')window._syncShapeShadowLayout(el,d,d.w,d.h);
    }else if(d.type==='svg'){
      el.style.overflow='visible';
      const _svgStr2=d.svgContent||'';
      try{const _dp2=new DOMParser();const _doc2=_dp2.parseFromString(_svgStr2,'image/svg+xml');const _p2=_doc2.documentElement;if(_p2&&_p2.tagName!=='parsererror'){el.appendChild(document.adoptNode(_p2));}else{el.innerHTML=_svgStr2;}}catch(e){el.innerHTML=_svgStr2;}
      const svgEl=el.querySelector('svg');if(svgEl){svgEl.style.width='100%';svgEl.style.height='100%';
        if(d._isDecor) _pvApplyDecorTime(svgEl, idx);
      }
      if(d._isDecor && (typeof _isGlDecorRenderer==='function'?_isGlDecorRenderer(d._decorRenderer):(d._decorRenderer==='crystal'||d._decorRenderer==='dna'))){
        const _pvCfg=d._glCfg||d._crystalCfg;
        const _Decor=typeof _glDecorByRenderer==='function'?_glDecorByRenderer(d._decorRenderer)
          :(d._decorRenderer==='crystal'&&typeof CrystalDecor!=='undefined'?CrystalDecor
          :(d._decorRenderer==='dna'&&typeof DnaDecor!=='undefined'?DnaDecor:null));
        if(_pvCfg && _Decor){
          el.style.position='relative';
          const _pvGl=document.createElement('div');
          _pvGl.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:1;';
          el.appendChild(_pvGl);
          const cfg=Object.assign({id:d.id+'_pv', startElapsed:_pvGetDecorTime(idx)}, _pvCfg);
          cfg.animated=typeof _layoutAnimated!=='undefined' && _layoutAnimated && _pvCfg.animated;
          _Decor.mount(_pvGl, cfg);
        }
      }
    }else if(d.type==='icon'){
      el.style.overflow='visible';el.style.display='flex';el.style.alignItems='center';el.style.justifyContent='center';
      const _pvSvg=d.iconFitted&&d.svgContent
        ? d.svgContent
        : (()=>{const _pvIc=typeof ICONS!=='undefined'?ICONS.find(function(x){return x.id===d.iconId;}):null;
            return (_pvIc&&typeof _buildIconSVG==='function')
              ?_buildIconSVG(_pvIc,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle||'stroke',d.shadow,d.shadowBlur,d.shadowColor)
              :(d.svgContent||'');})();
      el.innerHTML=_pvSvg;
      var svgI=el.querySelector('svg');if(svgI){svgI.style.width='100%';svgI.style.height='100%';}
    }else if(d.type==='formula'){
      el.style.overflow='visible';el.style.display='flex';el.style.alignItems='center';el.style.justifyContent='center';
      el.style.color=d.formulaColor||'#ffffff';
      if(d.formulaSvg){el.innerHTML=d.formulaSvg;var _fsvgP=el.querySelector('svg');if(_fsvgP){_fsvgP.style.width='100%';_fsvgP.style.height='100%';}}
    }else if(d.type==='graph'){
      el.style.overflow='hidden';el.style.borderRadius='6px';
      if(d.graphImg){var _gi=document.createElement('img');_gi.src=d.graphImg;_gi.style.cssText='width:100%;height:100%;object-fit:fill;display:block;';el.appendChild(_gi);}
    }else if(d.type==='applet'){
      el.dataset.appletId=d.appletId||'';
      var _aRx=(d.rx?d.rx+'px':'0px');
      // el already has position:absolute — must keep it. Remove overflow:hidden so border overlay shows.
      el.style.overflow='visible';
      el.style.borderRadius=_aRx;
      // Layer 1: clip div — clips iframe to border-radius
      var _aClip=document.createElement('div');
      _aClip.style.cssText='position:absolute;inset:0;overflow:hidden;border-radius:'+_aRx+';';
      if(typeof ensureAppletHtmlFromData==='function') ensureAppletHtmlFromData(d);
      var iframe=document.createElement('iframe');iframe.srcdoc=d.appletHtml||'';
      var _pvPE = (d.appletId==='timer'||d.appletId==='counter'||d.appletId==='generator') ? 'none' : 'auto';
      iframe.style.cssText='width:100%;height:100%;border:none;background:transparent;pointer-events:'+_pvPE+';user-select:none;';
      iframe.setAttribute('allowtransparency','true');
      iframe.sandbox = 'allow-scripts';
      if(d.appletId==='timer'){
        iframe.addEventListener('load', function(){
          try{ iframe.contentWindow.postMessage({type:'timerStart'}, '*'); }catch(e){}
        }, {once:true});
      }
      _aClip.appendChild(iframe);
      el.appendChild(_aClip);
      if(d.appletId==='counter'||d.appletId==='generator') el.style.cursor = 'pointer';
      // Layer 2: border overlay — after clip in DOM, not clipped by anything
      if(d.appletId==='generator'||d.appletId==='timer'||d.appletId==='counter'){
        var _bw=d.genBorderWidth!==undefined?+d.genBorderWidth:0;
        var _bordDiv=document.createElement('div');
        _bordDiv.className='applet-border-overlay';
        var _bordCss='position:absolute;inset:0;border-radius:'+_aRx+';pointer-events:none;box-sizing:border-box;z-index:2;';
        if(_bw>0){
          var _pvP=typeof _appletTheme==='function'?_appletTheme():{ac1:'#6366f1'};
          var _bc=d.genBorderColor&&d.genBorderColor!==''?d.genBorderColor:(_pvP.ac1+'33');
          _bordCss+='border:'+_bw+'px solid '+_bc+';';
        }
        _bordDiv.style.cssText=_bordCss;
        el.appendChild(_bordDiv);
      }
    }else if(d.type==='htmlframe'){
      if(typeof _hfBuildPreview==='function'){_hfBuildPreview(el,d);}
    }else if(d.type==='code'){
      const T=CODE_THEMES[d.codeTheme||'dark']||CODE_THEMES.dark;
      const c=document.createElement('div');
      c.style.cssText=typeof codeBlockSurfaceCss==='function'?codeBlockSurfaceCss(d,T):`width:100%;height:100%;overflow:auto;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:${d.codeFs||13}px;line-height:1.6;padding:14px 16px;box-sizing:border-box;background:${T.bg};color:${T.text};border:1px solid rgba(128,128,128,.15);`;
      c.innerHTML=`<div style="font-size:9px;color:${T.cmt};margin-bottom:8px;text-transform:uppercase;letter-spacing:.8px">${d.codeLang||''}</div><pre style="margin:0;white-space:pre;overflow:visible">${d.codeHtml||''}</pre>`;
      el.appendChild(c);
    }else if(d.type==='table'){
      // ── Chart mode in preview ──
      if(d.showChart && typeof _buildChartSvg==='function'){
        const _chartDiv=document.createElement('div');
        _chartDiv.style.cssText='width:100%;height:100%;overflow:visible;position:relative;';
        _chartDiv.innerHTML=_buildChartSvg(d);
        const _chartSvg=_chartDiv.querySelector('svg');
        if(_chartSvg){_chartSvg.style.width='100%';_chartSvg.style.height='100%';}
        el.appendChild(_chartDiv);
      } else {
      const v=document.createElement('div');v.style.cssText='width:100%;height:100%;overflow:visible;position:relative;';
      const bw2=d.borderW||1,bc2=d.borderColor||'#3b82f680',rx2=d.rx||0,fs2=d.fs||15;
      const _pvOp=d.tableBgOp!=null?+d.tableBgOp:1;
      const _pvBlur=d.tableBgBlur||0;
      function _pvRgba(hex){if(!hex)return hex;const h=hex.replace('#','');let r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16),a=h.length===8?parseInt(h.slice(6,8),16)/255:1;return 'rgba('+r+','+g+','+b+','+(a*_pvOp).toFixed(3)+')';}
      const tcols=d.cols||1,trows=d.rows||1;
      const cws2=(d.colWidths||[]).map(f=>Math.max(20,Math.round(f*(d.w||200))));
      const rhs2=(d.rowHeights||[]).map(f=>Math.max(12,Math.round(f*(d.h||150))));
      let t2=`<table style="width:100%;height:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:${fs2}px;color:${d.textColor||'#fff'};">`;
      t2+=`<colgroup>${cws2.map(w=>`<col style="width:${w}px">`).join('')}</colgroup><tbody>`;
      let ci2=0;
      for(let pr=0;pr<trows;pr++){
        const rh2=rhs2[pr]||30;t2+=`<tr style="height:${rh2}px">`;
        for(let pc=0;pc<tcols;pc++,ci2++){
          const cell2=(d.cells||[])[ci2]||{html:'',align:'left',valign:'middle',bg:'',colspan:1,rowspan:1,hidden:false};
          if(cell2.hidden)continue;
          const isH2=d.headerRow&&pr===0,isAlt2=!isH2&&d.altBg&&pr%2===0;
          const bg2=_pvRgba(cell2.bg||(isH2?d.headerBg||'#3b82f6':isAlt2?d.altBg||'':d.cellBg||'#1e293b')||'');
          const cs2=cell2.colspan||1, rs2=cell2.rowspan||1;
          const isLastC2=(pc+cs2-1)>=tcols-1, isLastR2=(pr+rs2-1)>=trows-1;
          const brd2=`border-top:${bw2}px solid ${bc2};border-left:${bw2}px solid ${bc2};`
            +(isLastC2?`border-right:${bw2}px solid ${bc2};`:'')
            +(isLastR2?`border-bottom:${bw2}px solid ${bc2};`:'');
          let cr2='';
          if(rx2>0){if(pr===0&&pc===0)cr2+=`border-top-left-radius:${rx2}px;`;if(pr===0&&isLastC2)cr2+=`border-top-right-radius:${rx2}px;`;if(isLastR2&&pc===0)cr2+=`border-bottom-left-radius:${rx2}px;`;if(isLastR2&&isLastC2)cr2+=`border-bottom-right-radius:${rx2}px;`;}
          const span2=(cs2>1?` colspan="${cs2}"`:'')+( rs2>1?` rowspan="${rs2}"`:'');
          const tag2=isH2?'th':'td';
          t2+=`<${tag2}${span2} style="background:${bg2};${brd2}text-align:${cell2.align||'left'};vertical-align:${cell2.valign||'middle'};padding:5px 9px;overflow:hidden;word-break:normal;overflow-wrap:break-word;font-weight:${isH2?700:400};box-sizing:border-box;${cr2}">${cell2.html||''}</${tag2}>`;
        }
        t2+='</tr>';
      }
      t2+='</tbody></table>';
      const _pvBlurLayer=_pvBlur>0?'<div style="position:absolute;inset:0;border-radius:'+rx2+'px;backdrop-filter:blur('+_pvBlur+'px);-webkit-backdrop-filter:blur('+_pvBlur+'px);z-index:0;pointer-events:none;"></div>':'';
      v.innerHTML=_pvBlurLayer+'<div style="position:relative;width:100%;height:100%;border-radius:'+rx2+'px;overflow:hidden;z-index:1;">'+t2+'</div>';
      el.appendChild(v);
      } // end else (table mode)
    }else if(d.type==='markdown'){
      const c=document.createElement('div');
      c.style.cssText=`width:100%;height:100%;overflow:auto;padding:14px 16px;box-sizing:border-box;line-height:1.65;font-size:${d.mdFs||16}px;color:${d.mdColor||'#ffffff'};`;
      // Inject scoped styles for markdown content
      const scope='md-pv-'+d.id;
      c.setAttribute('data-md',scope);
      const col=d.mdColor||'#ffffff';
      const styleEl=document.createElement('style');
      const s=`[data-md="${scope}"]`;
      styleEl.textContent=`${s} h1{font-size:2em;font-weight:700;margin:0 0 .4em;border-bottom:1px solid ${col}33;padding-bottom:.2em}${s} h2{font-size:1.5em;font-weight:600;margin:0 0 .35em}${s} h3{font-size:1.17em;font-weight:600;margin:0 0 .3em}${s} p{margin:0 0 .6em}${s} code{font-family:monospace;font-size:.85em;background:${col}18;padding:2px 5px;border-radius:3px}${s} pre{background:${col}18;border-radius:5px;padding:10px 12px;margin:0 0 .6em;overflow-x:auto}${s} pre code{background:none;padding:0}${s} ul,${s} ol{margin:0 0 .6em;padding-left:1.4em}${s} li{margin-bottom:.2em}${s} blockquote{border-left:3px solid ${col}88;padding-left:.8em;color:${col}99;margin:.4em 0}${s} strong{font-weight:700}${s} em{font-style:italic}${s} hr{border:none;border-top:1px solid ${col}33;margin:.6em 0}${s} a{color:${col};text-decoration:underline}`;
      document.head.appendChild(styleEl);
      c.innerHTML=d.mdHtml||'';el.appendChild(c);
    }else if(d.type==='lego'){
      el.style.overflow='visible';
      const _lec=document.createElement('div');
      _lec.style.cssText='width:100%;height:100%;overflow:visible;position:relative;';
      const _lc=d.legoColor||'#e3000b';
      if(d.legoSlope)_lec.innerHTML=_legoMakeSlopeSVG(d.legoStuds,d.legoSlope,_lc);
      else if(d.legoStair)_lec.innerHTML=_legoMakeStairSVG(_lc,d.legoStair);
      else _lec.innerHTML=_legoMakeSVG(d.legoStuds,d.legoTall,_lc);
      el.appendChild(_lec);
    }else if(d.type==='pagenum'){
      const c=document.createElement('div');
      c.style.cssText='width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:visible;';
      c.innerHTML=d.html||'';
      el.appendChild(c);
    }

    const anims=d.anims||[];
    const isTrigger=d.isTrigger||anims.some(a=>a.trigger==='nav');

    const _deferCapAnim=typeof window._captionAnimDeferredByTrigger==='function'
      ?window._captionAnimDeferredByTrigger(anims):null;
    if(_deferCapAnim&&typeof window._hideCaptionUntilTrigger==='function'){
      window._hideCaptionUntilTrigger(el,d,_deferCapAnim);
    }

    // ── Element trigger: each 'element' anim fires on separate click ──
    const hasElemTrigger = anims.some(a=>a.trigger==='element');
    if (hasElemTrigger) {
      const elemSet = new Set(anims.filter(a => a.trigger === 'element'));
      if (globalAutoMap.has(d.id)) {
        const filtered = globalAutoMap.get(d.id).filter(({ anim: a }) => !elemSet.has(a));
        if (filtered.length) globalAutoMap.set(d.id, filtered);
        else globalAutoMap.delete(d.id);
      }
      if (globalClickMap.has(d.id)) {
        const filtered = globalClickMap.get(d.id).filter(({ anim: a }) => !elemSet.has(a));
        if (filtered.length) globalClickMap.set(d.id, filtered);
        else globalClickMap.delete(d.id);
      }
    }
    if (hasElemTrigger) {
      const clickSteps = _pvBuildElemClickSteps(anims);
      if (clickSteps.length) {
        if (!container._elemTrigBindings) container._elemTrigBindings = [];
        container._elemTrigBindings.push({ targetD: d, steps: clickSteps });
      }
    }

    // Auto anims — from global map (already classified)
    const autoTimed = (globalAutoMap.get(d.id) || []).filter(({ anim: a }) => {
      const trig = a.trigger || 'auto';
      return trig !== 'click' && trig !== 'element' && trig !== 'nav' && trig !== 'counter' && trig !== 'timer';
    });
    if(autoTimed.length>0){
      const cssAnims    = autoTimed.filter(({anim:a})=>a.name!=='moveTo'&&a.name!=='orbitTo'&&a.name!=='rotate'&&a.name!=='captionSlide'&&a.name!=='splitHalf'&&a.name!=='typewriter'&&(typeof ANIM_INFO==='undefined'||!ANIM_INFO[a.name]||ANIM_INFO[a.name].cat!=='live'));
      const captionAnims = autoTimed.filter(({anim:a})=>a.name==='captionSlide');
      const liveAnims   = autoTimed.filter(({anim:a})=>typeof ANIM_INFO!=='undefined'&&ANIM_INFO[a.name]&&ANIM_INFO[a.name].cat==='live'&&a.name!=='typewriter'&&a.name!=='captionSlide');
      const twAnims     = autoTimed.filter(({anim:a})=>a.name==='typewriter');
      const motionAnims = autoTimed.filter(({anim:a})=>a.name==='moveTo'||a.name==='orbitTo');
      const rotateAnims = autoTimed.filter(({anim:a})=>a.name==='rotate');

      // Титр в сторону — скрыть до запуска (если это первая авто-анимация)
      if(captionAnims.length&&autoTimed[0]&&autoTimed[0].anim.name==='captionSlide'){
        el.style.visibility='hidden';
        el.style.pointerEvents='none';
        el.classList.add('has-caption');
      }

      // If first auto anim is entrance — hide element until it starts
      const firstCss = cssAnims[0];
      if(firstCss && firstCss.anim.cat==='entrance'){
        el.style.visibility='hidden';
      }

      // Group cssAnims by absDelay; text uses ._text_body like fireAnim
      const animContent = _pvAnimContentEl(el, d);
      const ecEl = d.type === 'text' ? null : (el.querySelector('.ec') || null);
      const groupsEl = {}, groupsEc = {};
      cssAnims.forEach(({anim:a,absDelay})=>{
        const isEmphasis = a.cat === 'emphasis';
        const grps = (isEmphasis && ecEl) ? groupsEc : groupsEl;
        if(!grps[absDelay]) grps[absDelay]=[];
        grps[absDelay].push(a);
      });
      Object.entries(groupsEl).forEach(([delayStr,grp])=>{
        const absDelay=+delayStr;
        sched(()=>{
          const hasExit = grp.some(a => a.cat === 'exit');
          const hasEntrance = grp.some(a => a.cat === 'entrance');
          if(el.dataset.morphEnter==='1'&&hasEntrance&&!hasExit){
            if (!(typeof window._particlesHasAnim === 'function' && window._particlesHasAnim(d))) {
              el.style.visibility='visible';
            }
            delete el.dataset.morphEnter;
            return;
          }
          const _animTarget = animContent;
          _animTarget.style.animation='none';
          void _animTarget.offsetWidth;
          if (hasEntrance) _pvRevealForEntrance(el, d, idx);
          else if (!hasExit && !(typeof window._particlesHasAnim === 'function' && window._particlesHasAnim(d))) el.style.visibility='';
          _animTarget.style.animation=grp.map(a=>{
            const cssName=ANIM_CSS[a.name]||'el-fadein';
            const dur=(a.duration||600)/1000;
            return `${cssName} ${dur}s ease-out 0s both`;
          }).join(',');
          _pvFinishCssAnimGroup(el, _animTarget, grp);
        }, absDelay + transOffset);
      });
      Object.entries(groupsEc).forEach(([delayStr,grp])=>{
        const absDelay=+delayStr;
        sched(()=>{
          ecEl.style.animation='none';
          void ecEl.offsetWidth;
          ecEl.style.animation=grp.map(a=>{
            const cssName=ANIM_CSS[a.name]||'el-fadein';
            const dur=(a.duration||600)/1000;
            return `${cssName} ${dur}s ease-out 0s both`;
          }).join(',');
          _pvFinishCssAnimGroup(el, ecEl, grp);
        }, absDelay + transOffset);
      });
      // live: сохраняем для запуска ПОСЛЕ appendChild (нужен живой DOM)
      el._pendingLiveAnims = liveAnims;
      el._pendingTwAnims = twAnims;
      // Fire motion anims in original order
      // withPrev: анимация стартует одновременно с предыдущей —
      // её baseTx/baseTy = позиция ДО предыдущей, не после
      {
        let cumTx=0, cumTy=0;
        motionAnims.forEach(({anim:a,absDelay})=>{
          fireAnim(el,d,a,idx,absDelay + transOffset,cumTx,cumTy);
          if(a.name==='moveTo'){
            cumTx+=a.tx||0; cumTy+=a.ty||0;
          } else if(a.name==='orbitTo'){
            const ocx=a.orbitCx||0, ocy=a.orbitCy||0;
            const r=Math.sqrt(ocx*ocx+ocy*ocy)||(a.orbitR||120);
            const dir=(a.orbitDir||'cw')==='cw'?1:-1;
            const deg=(a.orbitDeg!=null?a.orbitDeg:360)*dir;
            const sa=Math.atan2(-ocy,-ocx), ea=sa+deg*Math.PI/180;
            cumTx+=(ocx+r*Math.cos(ea))-(ocx+r*Math.cos(sa));
            cumTy+=(ocy+r*Math.sin(ea))-(ocy+r*Math.sin(sa));
          }
        });
        el._finalTx = cumTx; el._finalTy = cumTy;
      }
      rotateAnims.forEach(({anim:a,absDelay})=>fireAnim(el,d,a,idx,absDelay + transOffset));
      const splitAnims = autoTimed.filter(({anim:a})=>a.name==='splitHalf');
      splitAnims.forEach(({anim:a,absDelay})=>fireAnim(el,d,a,idx,absDelay + transOffset));
      el._pendingCaptionAnims = captionAnims;
    }

    // Click anims — from global click map + nav triggers
    const animOwner = _pvGroupLeader(d, s);
    const clickAnimsGlobal = globalClickMap.get(animOwner.id) || [];
    const navAnims = anims.filter(a=>a.trigger==='nav');
    const allClickEntries = [...clickAnimsGlobal, ...navAnims.filter(a=>!clickAnimsGlobal.find(x=>x.anim===a)).map(a=>({anim:a,autoAfter:false}))];
    const clickAnims = allClickEntries.filter(x=>!x.autoAfter).map(x=>x.anim);
    const autoAfterAnims = allClickEntries.filter(x=>x.autoAfter).map(x=>x.anim);
    const pendingAnims = [...clickAnims, ...autoAfterAnims];
    if(pendingAnims.length>0){
      const firstIsEntrance = pendingAnims[0].cat==='entrance';
      if(firstIsEntrance) el.style.visibility='hidden';
      if(isTrigger && clickAnims.length>0){
        el.style.cursor='pointer';
        el.addEventListener('click',(e)=>{
          e.stopPropagation();
          const timed=typeof computeAbsDelays==='function'?computeAbsDelays(clickAnims):clickAnims.map(a=>({anim:a,absDelay:a.delay||0}));
          timed.forEach(({anim:a,absDelay})=>{
            const animIdx = (animOwner.anims||[]).indexOf(a);
            _pvGroupMembers(animOwner, s).forEach(md => {
              const mel = container.querySelector('.psel[data-id="'+md.id+'"]');
              const ma = animIdx >= 0 && md.anims ? md.anims[animIdx] : a;
              if (!mel || !ma) return;
              if (_pvIsElSpecificAnim(ma.name) && md.id !== animOwner.id) return;
              sched(()=>fireAnim(mel, md, ma, idx), absDelay);
            });
          });
          // fire autoAfter anims after click group
          let autoDelay = Math.max(...timed.map(({anim:a,absDelay})=>(absDelay||0)+(a.duration||600)));
          autoAfterAnims.forEach(a=>{
            const t=autoDelay; autoDelay+=a.duration||600;
            const animIdx = (animOwner.anims||[]).indexOf(a);
            _pvGroupMembers(animOwner, s).forEach(md => {
              const mel = container.querySelector('.psel[data-id="'+md.id+'"]');
              const ma = animIdx >= 0 && md.anims ? md.anims[animIdx] : a;
              if (!mel || !ma) return;
              if (_pvIsElSpecificAnim(ma.name) && md.id !== animOwner.id) return;
              sched(()=>fireAnim(mel, md, ma, idx, 0), t);
            });
          });
        });
      } else if (d.id === animOwner.id) {
        const timed=typeof computeAbsDelays==='function'?computeAbsDelays(clickAnims):clickAnims.map(a=>({anim:a,absDelay:a.delay||0}));
        timed.forEach(({anim:a,absDelay})=>{
          const animIdx = (d.anims||[]).indexOf(a);
          globalClickSteps.push({el,d,a,absDelay,wasHidden:firstIsEntrance,autoAfter:false,animIdx});
        });
        autoAfterAnims.forEach(a=>{
          const animIdx = (d.anims||[]).indexOf(a);
          globalClickSteps.push({el,d,a,absDelay:0,wasHidden:firstIsEntrance && a.cat==='entrance',autoAfter:true,animIdx});
        });
      }
    }

    // Link navigation — always attach if link is set (works alongside animations)
    if(d.link){
      el._hasLink=true;
      el.style.cursor='pointer';
      (function(link,linkt,pidxAtBind){el.addEventListener('click',(e)=>{
        // Don't fire if this element already handled it as a trigger (nav trigger does its own navigation)
        if(isTrigger&&(d.anims||[]).some(a=>a.trigger==='nav'))return;
        if(link.startsWith('#slide-')){
          e.stopPropagation();
          e.preventDefault();
          if(typeof window._followSlideLink==='function'&&window._followSlideLink(link,pidxAtBind))return;
          clearAutoTimer();
          if(typeof gotoPreviewSlide==='function') gotoPreviewSlide(parseInt(link.replace('#slide-',''),10)-1);
          return;
        }
        window.open(link,linkt||'_blank');
      });})(d.link,d.linkt,pidx);
    }
    if(isTrigger)el._isTrigger=true;

    // Apply hover effects
    if(d.hoverFx&&d.hoverFx.enabled){
      applyHoverFxPreview(el,d.hoverFx,d);
    }

    if (particlesHideSet.has(d.id) && typeof window._particlesEnsureHiddenIfNeeded === 'function') {
      window._particlesEnsureHiddenIfNeeded(el, d);
    }

    container.appendChild(el);
    if(d.type==='applet'){
      if(d.appletId==='counter'&&typeof window._wireCounterAppletClick==='function') window._wireCounterAppletClick(el);
      if(d.appletId==='generator'&&typeof window._wireGeneratorAppletClick==='function') window._wireGeneratorAppletClick(el);
    }
    // Запускаем live-анимации сразу после добавления в DOM
    if(el._pendingLiveAnims && el._pendingLiveAnims.length){
      // Запускаем каждую live-анимацию через fireAnim — там правильный обработчик по имени (swing/dance/etc)
      el._pendingLiveAnims.forEach(({anim:a, absDelay})=>{
        fireAnim(el, d, a, idx, (absDelay||0) + (typeof transOffset!=='undefined'?transOffset:0));
      });
      delete el._pendingLiveAnims;
    }
    // Запускаем typewriter после appendChild (независимо от наличия других live-анимаций)
    if(el._pendingTwAnims && el._pendingTwAnims.length){
      el._pendingTwAnims.forEach(({anim:a,absDelay})=>fireAnim(el,d,a,idx,absDelay+(typeof transOffset!=='undefined'?transOffset:0)));
      delete el._pendingTwAnims;
    }
    if(el._pendingCaptionAnims && el._pendingCaptionAnims.length){
      if (!container._pendingCaptionQueue) container._pendingCaptionQueue = [];
      el._pendingCaptionAnims.forEach(({ anim: a, absDelay }) => {
        container._pendingCaptionQueue.push({ d, a, absDelay });
      });
      delete el._pendingCaptionAnims;
    }
  });

  _pvWireElemTriggers(container, idx);
  _pvFlushCaptionAnims(container, s, transOffset);

  // ── Draw connectors on top of elements ───────────────────────────────────
  if (s.connectors && s.connectors.length) {
    const elMap = {};
    s.els.forEach(d => { elMap[d.id] = d; });

    function _pAnchor(elId, otherElId, fromEdge, gap) {
      const d = elMap[elId]; if (!d) return {x:0,y:0};
      const cx = d.x+d.w/2, cy = d.y+d.h/2;
      gap = gap || 0;
      const od = elMap[otherElId];
      const ox = od ? od.x+od.w/2 : cx, oy = od ? od.y+od.h/2 : cy;
      const dx = ox-cx, dy = oy-cy;
      const dist = Math.sqrt(dx*dx+dy*dy)||1;
      const ux = dx/dist, uy = dy/dist;
      if (!fromEdge) return {x: cx+ux*gap, y: cy+uy*gap};
      let ex, ey;
      if (Math.abs(dx)*d.h > Math.abs(dy)*d.w) { ex = dx>0?d.x+d.w:d.x; ey = cy; }
      else { ex = cx; ey = dy>0?d.y+d.h:d.y; }
      return {x: ex+ux*gap, y: ey+uy*gap};
    }

    function _pMakeMarker(defs, markerId, type, color, atStart) {
      if (type === 'none') return;
      const m = document.createElementNS('http://www.w3.org/2000/svg','marker');
      m.setAttribute('id', markerId);
      m.setAttribute('markerUnits','strokeWidth');
      m.setAttribute('orient','auto');
      m.setAttribute('fill', color);
      m.setAttribute('stroke', color);
      if (type === 'arrow') {
        m.setAttribute('markerWidth','3.1'); m.setAttribute('markerHeight','3.5');
        m.setAttribute('refX', atStart?'1.386':'1.386'); m.setAttribute('refY','1.6');
        const poly = document.createElementNS('http://www.w3.org/2000/svg','path');
        const pathEnd   = 'M2.555,1.475 L2.555,1.475 Q2.771,1.600 2.555,1.725 L0.217,3.075 Q0.000,3.200 0.000,2.950 L0.000,0.250 Q0.000,0.000 0.217,0.125 Z';
        const pathStart = 'M0.216,1.475 L0.216,1.475 Q0.000,1.600 0.216,1.725 L2.554,3.075 Q2.771,3.200 2.771,2.950 L2.771,0.250 Q2.771,0.000 2.554,0.125 Z';
        poly.setAttribute('d', atStart ? pathStart : pathEnd);
        poly.setAttribute('fill', color); poly.setAttribute('stroke', 'none');
        m.appendChild(poly);
      } else if (type === 'square') {
        m.setAttribute('markerWidth','3.4'); m.setAttribute('markerHeight','3.4');
        m.setAttribute('refX', atStart?'1.7':'1.7'); m.setAttribute('refY','1.7');
        const r2 = document.createElementNS('http://www.w3.org/2000/svg','rect');
        r2.setAttribute('x','0.2');r2.setAttribute('y','0.2');r2.setAttribute('width','3.0');r2.setAttribute('height','3.0');
        r2.setAttribute('rx','0.5');r2.setAttribute('ry','0.5');r2.setAttribute('stroke-width','0');
        m.appendChild(r2);
      } else if (type === 'cross') {
        m.setAttribute('orient','0');
        m.setAttribute('markerWidth','3.0'); m.setAttribute('markerHeight','3.0');
        m.setAttribute('refX','1.5'); m.setAttribute('refY','1.5');
        ['M0.3,0.3 L2.7,2.7','M2.7,0.3 L0.3,2.7'].forEach(d2 => {
          const ln = document.createElementNS('http://www.w3.org/2000/svg','path');
          ln.setAttribute('d',d2); ln.setAttribute('stroke',color);
          ln.setAttribute('stroke-width','1'); ln.setAttribute('stroke-linecap','round'); ln.setAttribute('fill','none');
          m.appendChild(ln);
        });
      }
      defs.appendChild(m);
    }

    const psvg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    psvg.setAttribute('style','position:absolute;left:0;top:0;width:'+canvasW+'px;height:'+canvasH+'px;pointer-events:none;overflow:visible;z-index:1;');
    psvg.innerHTML = '<defs></defs>';
    const pdefs = psvg.querySelector('defs');

    // Helper: get edge midpoint anchor from data model, accounting for rotation
    function _pEdgeMid(elId, sideKey, otherElId) {
      const d = elMap[elId]; if (!d) return {x:0,y:0};
      const cx=d.x+d.w/2, cy=d.y+d.h/2;
      const deg = d.rot || 0;
      function rot(px, py) {
        if (!deg) return {x:px, y:py};
        const rad=deg*Math.PI/180, cos=Math.cos(rad), sin=Math.sin(rad);
        const rx=px-cx, ry=py-cy;
        return {x: cx+rx*cos-ry*sin, y: cy+rx*sin+ry*cos};
      }
      function rotDir(nx, ny) {
        if (!deg) return {nx, ny};
        const rad=deg*Math.PI/180, cos=Math.cos(rad), sin=Math.sin(rad);
        return {nx: nx*cos-ny*sin, ny: nx*sin+ny*cos};
      }
      const raw = {
        top:    {...rot(cx,      d.y     ), ...rotDir( 0,-1)},
        right:  {...rot(d.x+d.w, cy      ), ...rotDir( 1, 0)},
        bottom: {...rot(cx,      d.y+d.h ), ...rotDir( 0, 1)},
        left:   {...rot(d.x,     cy      ), ...rotDir(-1, 0)},
      };
      if (raw[sideKey]) return raw[sideKey];
      const od=elMap[otherElId];
      const tx=od?od.x+od.w/2:cx, ty=od?od.y+od.h/2:cy;
      let best=raw.right, bestD=Infinity;
      for (const [,pt] of Object.entries(raw)) {
        const d2=(pt.x-tx)**2+(pt.y-ty)**2;
        if (d2<bestD){bestD=d2;best=pt;}
      }
      return best;
    }

    function _pApplyLineGap(raw1, raw2, gap) {
      gap = gap || 0;
      if (!gap) return { p1: raw1, p2: raw2 };
      const dx = raw2.x - raw1.x, dy = raw2.y - raw1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.001) return { p1: raw1, p2: raw2 };
      const g = Math.min(gap, len / 2);
      const ux = dx / len, uy = dy / len;
      return {
        p1: { x: raw1.x + ux * g, y: raw1.y + uy * g },
        p2: { x: raw2.x - ux * g, y: raw2.y - uy * g },
      };
    }

    function _pApplySideGap(raw, gap) {
      if (!gap) return raw;
      const n = { top:{x:0,y:-1}, right:{x:1,y:0}, bottom:{x:0,y:1}, left:{x:-1,y:0} };
      const side = raw.side;
      const nx = raw.nx != null ? raw.nx : (n[side] || { x: 0, y: 0 }).x;
      const ny = raw.ny != null ? raw.ny : (n[side] || { x: 0, y: 0 }).y;
      return { x: raw.x + nx * gap, y: raw.y + ny * gap, side: raw.side, nx, ny };
    }

    function _pAnchorPair(conn) {
      const gap = conn.gap || 0;
      const raw1 = _pEdgeMid(conn.fromId, conn.fromSide, conn.toId);
      const raw2 = _pEdgeMid(conn.toId, conn.toSide, conn.fromId);
      if ((conn.route || 'curve') === 'straight') return _pApplyLineGap(raw1, raw2, gap);
      return { p1: _pApplySideGap(raw1, gap), p2: _pApplySideGap(raw2, gap) };
    }
    // Helper: default bezier control points
    function _pDefaultCP(p1, p2) {
      const dx=p2.x-p1.x, dy=p2.y-p1.y;
      const dist=Math.sqrt(dx*dx+dy*dy), bend=Math.min(dist*0.45,220);
      const hBias = Math.abs(dx) > Math.abs(dy)*0.6;
      if (hBias) return {
        cp1:{x:p1.x+bend*Math.sign(dx||1), y:p1.y},
        cp2:{x:p2.x-bend*Math.sign(dx||1), y:p2.y},
      };
      return {
        cp1:{x:p1.x, y:p1.y+bend*Math.sign(dy||1)},
        cp2:{x:p2.x, y:p2.y-bend*Math.sign(dy||1)},
      };
    }

    function _pOrthoPts(p1, p2, fromSide, toSide) {
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

    function _pOrthoPathD(pts) {
      return pts.map((p, i) =>
        (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)
      ).join(' ');
    }

    function _pMkDist(t) { return t==='arrow'?1.386 : t==='square'?1.7 : t==='cross'?1.5 : 0; }
    function _pMkRetract(pt, cpNear, d, sw) {
      if (!d || sw <= 0) return pt;
      const tdx=cpNear.x-pt.x, tdy=cpNear.y-pt.y, tl=Math.sqrt(tdx*tdx+tdy*tdy)||1;
      return {x: pt.x+(tdx/tl)*sw*d, y: pt.y+(tdy/tl)*sw*d};
    }

    function _pConnPathD(conn, p1, p2, cp1, cp2, fromMk, toMk, sw) {
      const route = conn.route || 'curve';
      if (route === 'orthogonal') {
        const pts = _pOrthoPts(p1, p2, conn.fromSide, conn.toSide);
        const rp2 = toMk   !== 'none' ? _pMkRetract(pts[pts.length - 1], pts[pts.length - 2], _pMkDist(toMk), sw)   : pts[pts.length - 1];
        const rp1 = fromMk !== 'none' ? _pMkRetract(pts[0], pts[1], _pMkDist(fromMk), sw) : pts[0];
        return _pOrthoPathD([rp1, ...pts.slice(1, -1), rp2]);
      }
      if (route === 'straight') {
        const rp2 = toMk   !== 'none' ? _pMkRetract(p2, p1, _pMkDist(toMk), sw)   : p2;
        const rp1 = fromMk !== 'none' ? _pMkRetract(p1, p2, _pMkDist(fromMk), sw) : p1;
        return `M${rp1.x.toFixed(1)},${rp1.y.toFixed(1)} L${rp2.x.toFixed(1)},${rp2.y.toFixed(1)}`;
      }
      const rp2 = toMk   !== 'none' ? _pMkRetract(p2, cp2, _pMkDist(toMk), sw)   : p2;
      const rp1 = fromMk !== 'none' ? _pMkRetract(p1, cp1, _pMkDist(fromMk), sw) : p1;
      return `M${rp1.x.toFixed(1)},${rp1.y.toFixed(1)} C${cp1.x.toFixed(1)},${cp1.y.toFixed(1)} ${cp2.x.toFixed(1)},${cp2.y.toFixed(1)} ${rp2.x.toFixed(1)},${rp2.y.toFixed(1)}`;
    }

    s.connectors.forEach(conn => {
      const { p1, p2 } = _pAnchorPair(conn);
      // Use stored control points if available, else compute defaults
      const def = _pDefaultCP(p1, p2);
      const cp1 = conn.cp1 || def.cp1;
      const cp2 = conn.cp2 || def.cp2;

      const sw = conn.sw || 2;
      const dash = conn.dash || 'solid';
      const color = conn.color || '#60a5fa';
      const fromMk = conn.fromMarker || 'none';
      const toMk   = conn.toMarker   || (conn.type==='arrow'?'arrow':'none');
      const animated = !!conn.animated;

      const mkFId = conn.id+'_pmf', mkTId = conn.id+'_pmt';
      _pMakeMarker(pdefs, mkFId, fromMk, color, true);
      _pMakeMarker(pdefs, mkTId, toMk,   color, false);

      let dashArr, linecap;
      if (dash==='dot')  { dashArr=`0 ${sw*4}`; linecap='round'; }
      else if (dash==='dash') { dashArr=`${sw*5} ${sw*3}`; linecap='round'; }
      else { dashArr=null; linecap='round'; }

      if (animated && dash !== 'solid') {
        const style = document.createElementNS('http://www.w3.org/2000/svg','style');
        const animOff = dash==='dot' ? sw*4 : sw*8;
        style.textContent = `@keyframes pconn_${conn.id}{from{stroke-dashoffset:${animOff}}to{stroke-dashoffset:0}}`;
        pdefs.appendChild(style);
      }

      const pd = _pConnPathD(conn, p1, p2, cp1, cp2, fromMk, toMk, sw);
      const line = document.createElementNS('http://www.w3.org/2000/svg','path');
      line.setAttribute('d', pd);
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', sw);
      line.setAttribute('stroke-linecap', (dash === 'dot') ? 'round' : ((fromMk !== 'none' || toMk !== 'none') ? 'butt' : linecap));
      line.setAttribute('stroke-linejoin', 'round');
      if (dashArr) {
        line.setAttribute('stroke-dasharray', dashArr);
        if (animated) line.style.animation = `pconn_${conn.id} ${dash==='dot'?'1s':'0.8s'} linear infinite`;
      }
      if (fromMk !== 'none') line.setAttribute('marker-start', `url(#${mkFId})`);
      if (toMk   !== 'none') line.setAttribute('marker-end',   `url(#${mkTId})`);
      line.setAttribute('data-pconn-id', conn.id);
      psvg.appendChild(line);
    });

    container.appendChild(psvg);

    // Функция обновления коннекторов при анимации перемещения объекта
    // motionOffsets: {elId: {tx, ty}} — смещения от исходной позиции
    const _motionOffsets = {};
    window._pUpdateConnForMotion = function(elId, tx, ty) {
      _motionOffsets[elId] = {tx, ty};
      // Перерисовываем только линии связанные с этим объектом
      if (!s.connectors) return;
      s.connectors.forEach(conn => {
        if (conn.fromId !== elId && conn.toId !== elId) return;
        const line = psvg.querySelector(`[data-pconn-id="${conn.id}"]`);
        if (!line) return;
        // Вычисляем позиции с учётом смещения
        function _offsetMid(did, otherDid, sideKey) {
          const base = elMap[did]; if (!base) return {x:0,y:0};
          const off = _motionOffsets[did] || {tx:0,ty:0};
          const bx = base.x + off.tx, by = base.y + off.ty;
          const cx = bx+base.w/2, cy = by+base.h/2;
          const deg = base.rot || 0;
          function rot(px,py){
            if(!deg)return{x:px,y:py};
            const rad=deg*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad);
            return{x:cx+(px-cx)*cos-(py-cy)*sin, y:cy+(px-cx)*sin+(py-cy)*cos};
          }
          function rotDir(nx, ny) {
            if (!deg) return { nx, ny };
            const rad=deg*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad);
            return { nx: nx*cos-ny*sin, ny: nx*sin+ny*cos };
          }
          const sides = {
            top:    { ...rot(cx, by),      ...rotDir(0,-1), side: 'top' },
            right:  { ...rot(bx+base.w, cy), ...rotDir(1,0),  side: 'right' },
            bottom: { ...rot(cx, by+base.h), ...rotDir(0,1),  side: 'bottom' },
            left:   { ...rot(bx, cy),      ...rotDir(-1,0), side: 'left' },
          };
          if (sides[sideKey]) return sides[sideKey];
          const od = elMap[otherDid];
          const offO = _motionOffsets[otherDid]||{tx:0,ty:0};
          const tx2 = od ? od.x+offO.tx+od.w/2 : cx;
          const ty2 = od ? od.y+offO.ty+od.h/2 : cy;
          let best=sides.right, bestD=Infinity;
          for (const [,pt] of Object.entries(sides)){
            const d2=(pt.x-tx2)**2+(pt.y-ty2)**2;
            if(d2<bestD){bestD=d2;best=pt;}
          }
          return best;
        }
        const raw1 = _offsetMid(conn.fromId, conn.toId, conn.fromSide);
        const raw2 = _offsetMid(conn.toId, conn.fromId, conn.toSide);
        const gap = conn.gap || 0;
        let p1, p2;
        if ((conn.route || 'curve') === 'straight') {
          ({ p1, p2 } = _pApplyLineGap(raw1, raw2, gap));
        } else {
          p1 = _pApplySideGap(raw1, gap);
          p2 = _pApplySideGap(raw2, gap);
        }
        const dx=p2.x-p1.x, dy=p2.y-p1.y;
        const dist=Math.sqrt(dx*dx+dy*dy), bend=Math.min(dist*0.45,220);
        const hBias=Math.abs(dx)>Math.abs(dy)*0.6;
        const cp1 = hBias ? {x:p1.x+bend*Math.sign(dx||1),y:p1.y} : {x:p1.x,y:p1.y+bend*Math.sign(dy||1)};
        const cp2 = hBias ? {x:p2.x-bend*Math.sign(dx||1),y:p2.y} : {x:p2.x,y:p2.y-bend*Math.sign(dy||1)};
        const fromMk = conn.fromMarker || 'none';
        const toMk   = conn.toMarker   || (conn.type==='arrow'?'arrow':'none');
        const sw = conn.sw || 2;
        line.setAttribute('d', _pConnPathD(conn, p1, p2, cp1, cp2, fromMk, toMk, sw));
      });
    };
  }
  globalClickSteps.sort((a,b)=>(a.absDelay||0)-(b.absDelay||0));

  // Group into click-steps: each explicit 'click' starts a new group,
  // 'withPrev' joins the current group, autoAfter fires automatically after the group
  const clickGroups = [];
  globalClickSteps.forEach(step => {
    const origTrigger = step.a.trigger||'auto';
    if(step.autoAfter) {
      if(clickGroups.length > 0) clickGroups[clickGroups.length-1].autoAfter.push(step);
    } else if(origTrigger === 'click' || origTrigger === 'nav') {
      clickGroups.push({items:[step], autoAfter:[]});
    } else if(origTrigger === 'withPrev' && clickGroups.length > 0) {
      clickGroups[clickGroups.length-1].items.push(step);
    } else {
      clickGroups.push({items:[step], autoAfter:[]});
    }
  });

  let groupIdx=0;
  container._fireNextStep=function(){
    if(groupIdx>=clickGroups.length)return false;
    const group=clickGroups[groupIdx];
    // Find base delay of group (first item's absDelay)
    const baseDelay = group.items.length>0 ? (group.items[0].absDelay||0) : 0;
    group.items.forEach(({el,d,a,absDelay,wasHidden,animIdx})=>{
      _pvGroupMembers(d, s).forEach(md => {
        const mel = container.querySelector('.psel[data-id="'+md.id+'"]');
        if (!mel) return;
        const ma = (animIdx != null && md.anims && md.anims[animIdx]) ? md.anims[animIdx] : a;
        if (!ma) return;
        if (_pvIsElSpecificAnim(ma.name) && md.id !== d.id) return;
        if(wasHidden || ma.cat === 'entrance') _pvRevealForEntrance(mel, md, idx);
        fireAnim(mel, md, ma, idx, (absDelay||0)-baseDelay);
      });
    });
    // auto-fire autoAfter items after click group ends
    let autoDelay = 0;
    group.items.forEach(({a,absDelay})=>{
      // live-анимации бесконечны — не участвуют в расчёте autoDelay
      if(typeof ANIM_INFO!=='undefined'&&ANIM_INFO[a.name]&&ANIM_INFO[a.name].cat==='live') return;
      autoDelay = Math.max(autoDelay, ((absDelay||0)-baseDelay)+(a.duration||600));
    });
    // autoAfter: идут последовательно, withPrev — одновременно с предыдущим
    let prevAutoDelay = autoDelay;
    let prevAutoDur = 0;
    group.autoAfter.forEach(({el,d,a,wasHidden,animIdx})=>{
      const isLive = typeof ANIM_INFO!=='undefined'&&ANIM_INFO[a.name]&&ANIM_INFO[a.name].cat==='live';
      const origTrig = a.trigger||'auto';
      let t;
      if(origTrig === 'withPrev') {
        // Стартует вместе с предыдущим autoAfter
        t = prevAutoDelay;
      } else {
        // Стартует после предыдущего
        t = autoDelay;
        prevAutoDelay = autoDelay;
      }
      const sched = typeof window._pvScheduleOnStage === 'function' ? window._pvScheduleOnStage : (c, fn, ms) => setTimeout(fn, ms);
      sched(container, ()=>{
        _pvGroupMembers(d, s).forEach(md => {
          const mel = container.querySelector('.psel[data-id="'+md.id+'"]');
          if (!mel) return;
          const ma = (animIdx != null && md.anims && md.anims[animIdx]) ? md.anims[animIdx] : a;
          if (!ma) return;
          if (_pvIsElSpecificAnim(ma.name) && md.id !== d.id) return;
          if(wasHidden || ma.cat === 'entrance') _pvRevealForEntrance(mel, md, idx);
          fireAnim(mel, md, ma, idx, 0);
        });
      }, t);
      if(!isLive) {
        prevAutoDur = a.duration||600;
        if(origTrig !== 'withPrev') autoDelay = t + prevAutoDur;
        else autoDelay = Math.max(autoDelay, t + prevAutoDur);
      }
    });
    groupIdx++;
    return true;
  };
  container._hasSteps=()=>groupIdx<clickGroups.length;
}

function fireAnim(el,d,a,idx,overrideDelay,_cumTx,_cumTy){
  const stage = el && el.parentElement;
  if (stage && stage._pvStageAborted) return;
  if(a.name==='moveTo'){
    const dur=(a.duration||600);
    const delay=typeof overrideDelay==='number' ? overrideDelay : (a.delay||0);
    const baseTx = typeof _cumTx==='number' ? _cumTx : 0;
    const baseTy = typeof _cumTy==='number' ? _cumTy : 0;
    const tx=a.tx||0, ty=a.ty||0;
    const _elRot = d.rot || 0;
    const _rotOnlyStr = _elRot ? ` rotate(${_elRot}deg)` : '';
    window._pvStageLater(stage, ()=>{
      if(el.animate){
        requestAnimationFrame(()=>{
          // НЕ устанавливаем el.style.transform до анимации — иначе composite:'add' сложит дважды
          // Финальная позиция применяется через fill:'forwards' в keyframe
          const _anim = el.animate(
            [{transform:`translate(${baseTx.toFixed(2)}px,${baseTy.toFixed(2)}px)${_rotOnlyStr}`},
             {transform:`translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px)${_rotOnlyStr}`}],
            {duration:dur, easing:'cubic-bezier(0.4,0,0.2,1)', fill:'forwards', composite:'replace'}
          );
          _anim.onfinish = ()=>{ 
            try{ _anim.commitStyles(); } catch(e){}
            _anim.cancel();
            el.style.transform = `translate(${tx}px,${ty}px)${_rotOnlyStr}`;
          };
          // Обновляем коннекторы — парсим реальный transform каждый кадр
          if(typeof window._pUpdateConnForMotion==='function'){
            let _running = true;
            function _tick(){
              if(!_running) return;
              try{
                // getComputedStyle во время Web Animation возвращает интерполированное значение
                const _ts = getComputedStyle(el).transform;
                if(_ts && _ts !== 'none'){
                  const _m = new DOMMatrix(_ts);
                  window._pUpdateConnForMotion(d.id, _m.e, _m.f);
                } else {
                  window._pUpdateConnForMotion(d.id, baseTx, baseTy);
                }
              }catch(e){}
              requestAnimationFrame(_tick);
            }
            setTimeout(()=>{ requestAnimationFrame(_tick); }, delay);
            setTimeout(()=>{ _running=false; window._pUpdateConnForMotion(d.id, tx, ty); }, delay+dur+32);
          }
        });
      } else {
        requestAnimationFrame(()=>{
          el.style.transition=`transform ${dur}ms cubic-bezier(0.4,0,0.2,1)`;
          el.style.transform=`translate(${tx}px,${ty}px)${_rotStr}`; // _rotStr уже содержит flip
        });
      }
    }, delay);
    return;
  }
  if(a.name==='orbitTo'){
    const dur = a.duration||1200;
    const delay = typeof overrideDelay==='number' ? overrideDelay : (a.delay||0);
    const dir = (a.orbitDir||'cw')==='cw' ? 1 : -1;
    const totalDeg = (a.orbitDeg != null ? a.orbitDeg : 360) * dir;
    const ocx = (a.orbitCx||0);
    const ocy = (a.orbitCy||0);
    // Реальный радиус = расстояние от центра орбиты до объекта — гарантирует старт без прыжка
    const r = Math.sqrt(ocx*ocx + ocy*ocy) || (a.orbitR||120);
    const baseTx = typeof _cumTx==='number' ? _cumTx : 0;
    const baseTy = typeof _cumTy==='number' ? _cumTy : 0;
    const startAngle = Math.atan2(-ocy, -ocx);
    const steps = Math.max(60, Math.abs(totalDeg) * 2);
    const frames = [];
    for(let i=0;i<=steps;i++){
      const t = i/steps;
      const angle = startAngle + (totalDeg * Math.PI/180) * t;
      const ftx = baseTx + ocx + r*Math.cos(angle);
      const fty = baseTy + ocy + r*Math.sin(angle);
      frames.push({transform:`translate(${ftx.toFixed(2)}px,${fty.toFixed(2)}px)`});
    }
    const endTx = baseTx + ocx + r*Math.cos(startAngle + totalDeg*Math.PI/180);
    const endTy = baseTy + ocy + r*Math.sin(startAngle + totalDeg*Math.PI/180);
    window._pvStageLater(stage, ()=>{
      if(el.animate){
        requestAnimationFrame(()=>{
          const _oRot = d.rot||0;
          const _oRotStr = _oRot ? ` rotate(${_oRot}deg)` : '';
          // НЕ устанавливаем el.style.transform до анимации —
          // frames уже содержат полный translate (baseTx + орбита)
          // composite:'replace' — полностью заменяет transform, без двойного сложения
          const _orbitFrames = frames.map(f=>({transform:f.transform+_oRotStr}));
          const _orbitAnim = el.animate(_orbitFrames, {duration:dur, easing:'linear', fill:'forwards', composite:'replace'});
          _orbitAnim.onfinish = ()=>{
            try{ _orbitAnim.commitStyles(); }catch(e){}
            _orbitAnim.cancel();
            // Фиксируем финальную позицию
            el.style.transform = `translate(${endTx.toFixed(2)}px,${endTy.toFixed(2)}px)${_oRotStr}`;
          };
        });
      }
    }, delay);
    return;
  }
  if(a.name==='rotate'){
    const dur = a.duration||600;
    const delay = typeof overrideDelay==='number' ? overrideDelay : (a.delay||0);
    const dir = (a.rotateDir||'cw')==='cw' ? 1 : -1;
    const deg = (a.rotateDeg!=null ? a.rotateDeg : 360) * dir;
    // Rotate на .ec (shape) или на el с composite:'add' (стекается поверх translate от orbit/move)
    const ecEl = el.querySelector('.ec') || null;
    const rotTarget = ecEl || el;
    const rotComposite = ecEl ? 'replace' : 'add';
    window._pvStageLater(stage, ()=>{
      if(rotTarget.animate){
        const anim = rotTarget.animate(
          [{transform:'rotate(0deg)'},{transform:`rotate(${deg}deg)`}],
          {duration:dur, easing:'linear', fill:'forwards', composite:rotComposite}
        );
        anim.onfinish = ()=>{ try{ anim.commitStyles(); }catch(e){} anim.cancel(); };
      }
    }, delay);
    return;
  }
  // ── LIVE (infinite) анимации — через Web Animations API с iterations:Infinity ──
  // ── typewriter: стираем старый текст посимвольно, печатаем новый ─────────
  if(a.name==='typewriter'){
    const dur   = a.duration || 600; // не используется напрямую — скорость через charDelay
    const delay = typeof overrideDelay==='number' ? overrideDelay : (a.delay||0);
    const charDelay = a.charDelay || 40; // мс на символ


    // Получаем plaintext из HTML (сохраняем теги минимально — только br)
    
    function _charsToHtml(chars){ return chars.map(c=>c.val).join(''); }

    const fromHtml = a.fromHtml || '';
    const toHtml   = a.toHtml   || '';

    // Находим текстовый контейнер в превью
    // Структура: el.psel > c(d.cs+flex-column) > div(white-space:normal) > d.html
    // Пишем в внутренний div — тогда стили c (цвет, шрифт) наследуются
    let _tel = null;
    if(d.type==='text'){
      // c = первый не-абсолютный div (имеет d.cs с color, font-size)
      // Пишем напрямую в c — тогда стили гарантированно применяются
      const _divs = Array.from(el.querySelectorAll(':scope > div'));
      const _c = _divs.find(dv => dv.style.position !== 'absolute') || _divs[0];
      _tel = _c || null;
    } else if(d.type==='shape'){
      _tel = el.querySelector('.shape-text');
    } else {
      _tel = el.querySelector('.shape-text') || el.querySelector('div');
    }
    if(!_tel){ console.warn('[typewriter] no text container found for type:', d.type); return; }
    const _telOrigHtml = _tel.innerHTML; // сохраняем оригинал для восстановления

    function _htmlToPlain(html){ return html.replace(/<[^>]*>/g, ''); }
    const fromPlain = _htmlToPlain(fromHtml);
    const toPlain   = _htmlToPlain(toHtml);

    let _twTimer = null;
    let _twRunning = true;

    window._pvStageLater(stage, ()=>{
      if(!_twRunning) return;

      let deleteStep = 0;
      const totalDelete = fromPlain.length;

      function doDelete(){
        if(!_twRunning) return;
        if(deleteStep >= totalDelete){
          _tel.innerHTML = '<div style="width:100%;white-space:pre-wrap;word-break:break-word;"></div>';
          requestAnimationFrame(()=>doPrint(0));
          return;
        }
        const remaining = fromPlain.slice(0, totalDelete - deleteStep);
        // Оборачиваем в div с сохранением стилей — flex-item один = горизонтально
        _tel.innerHTML = '<div style="width:100%;white-space:pre-wrap;word-break:break-word;">' + remaining + '</div>';
        deleteStep++;
        _twTimer = setTimeout(doDelete, charDelay);
      }

      function doPrint(step){
        if(!_twRunning) return;
        if(step >= toPlain.length){
          // Финал: вставляем toHtml но через временный div чтобы сохранить структуру
          // Если toHtml совпадает по структуре с оригиналом — вставляем как есть
          // Иначе заменяем только text nodes сохраняя теги
          // Финал: показываем toHtml (новый текст)
          _tel.innerHTML = '<div style="width:100%;white-space:pre-wrap;word-break:break-word;">' + toPlain + '</div>';
          return;
        }
        const built = toPlain.slice(0, step + 1);
        _tel.innerHTML = '<div style="width:100%;white-space:pre-wrap;word-break:break-word;">' + built + '</div>';
        _twTimer = setTimeout(()=>doPrint(step+1), charDelay);
      }

      doDelete();

    }, delay);

    // Сохраняем ссылку для остановки
    if(!el._liveAnims) el._liveAnims = [];
    el._liveAnims.push({ cancel: ()=>{ _twRunning=false; if(_twTimer) clearTimeout(_twTimer); } });
    return;
  }

  // ── SWING — качение с кастомным transform-origin ──────────────────────
  if(a.name==='swing'){
    const dur  = a.duration||2000;
    const delay= typeof overrideDelay==='number' ? overrideDelay : (a.delay||0);
    const sox = a.swingOx != null ? a.swingOx : 0;
    const soy = a.swingOy != null ? a.swingOy : (d.h/2);
    const originX = (50 + sox/d.w*100).toFixed(2) + '%';
    const originY = (50 + soy/d.h*100).toFixed(2) + '%';
    const cnt = a.swingCount != null ? a.swingCount : 1;
    const iters = cnt >= 10 ? Infinity : cnt;
    window._pvStageLater(stage, ()=>{
      // Отменяем только предыдущий swing (не другие live-анимации как dance)
      if(el._liveAnimsByName && el._liveAnimsByName['swing']){
        try{el._liveAnimsByName['swing'].cancel();}catch(e){}
        delete el._liveAnimsByName['swing'];
      }
      // Swing на .ec / ._text_body — не на el (translate от moveTo)
      let swingTarget = (d.type==='text' && typeof window._ensureTextBodyWrap==='function')
        ? window._ensureTextBodyWrap(el)
        : (el.querySelector('.ec') || el.querySelector('.iel') || el.querySelector('.psel-txt'));
      if(!swingTarget || swingTarget === el){
        // Создаём обёртку если нет подходящего дочернего элемента
        let wrapper = el.querySelector('._swing_wrap');
        if(!wrapper){
          wrapper = document.createElement('div');
          wrapper.className = '_swing_wrap';
          wrapper.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
          // Переносим содержимое el в wrapper
          while(el.firstChild) wrapper.appendChild(el.firstChild);
          el.appendChild(wrapper);
        }
        swingTarget = wrapper;
      }
      swingTarget.style.transformOrigin = originX+' '+originY;
      const frames = [
        {transform:'rotate(  0deg)', easing:'cubic-bezier(.4,0,.2,1)'},
        {transform:'rotate( 30deg)', easing:'cubic-bezier(.4,0,.6,1)'},
        {transform:'rotate(-30deg)', easing:'cubic-bezier(.4,0,.2,1)'},
        {transform:'rotate( 20deg)', easing:'cubic-bezier(.4,0,.6,1)'},
        {transform:'rotate(-20deg)', easing:'cubic-bezier(.4,0,.2,1)'},
        {transform:'rotate( 10deg)', easing:'cubic-bezier(.4,0,.6,1)'},
        {transform:'rotate(-10deg)', easing:'cubic-bezier(.4,0,.2,1)'},
        {transform:'rotate(  5deg)', easing:'cubic-bezier(.4,0,.6,1)'},
        {transform:'rotate( -3deg)', easing:'cubic-bezier(.4,0,.6,1)'},
        {transform:'rotate(  0deg)'},
      ];
      // composite:'replace' на дочернем элементе — не конфликтует с translate на el
      const anim = swingTarget.animate(frames,
        {duration:dur, iterations:iters, fill:'none', composite:'replace'});
      if(!el._liveAnims) el._liveAnims=[];
      el._liveAnims.push(anim);
      if(!el._liveAnimsByName) el._liveAnimsByName={};
      el._liveAnimsByName['swing'] = anim;
    }, delay);
    return;
  }

  if(a.name==='float'){
    const dur  = a.duration||5000;
    const delay= typeof overrideDelay==='number' ? overrideDelay : (a.delay||0);
    const cnt  = a.swingCount != null ? a.swingCount : (a.count != null ? a.count : 1);
    const iters = (!isFinite(cnt)||cnt>=10) ? Infinity : cnt;
    const fw = d.w||200, fh = d.h||200;
    let frames;
    if (d.groupId) {
      const cache = (window._pFloatCache && window._pFloatCache[idx]) || {};
      const gkey = String(d.groupId);
      if (!cache[gkey]) {
        const members = _pvGroupMembers(d, slides[idx]);
        cache[gkey] = typeof _floatFramesForGroup === 'function'
          ? _floatFramesForGroup(members, d.groupId)
          : _floatFrames(fw, fh);
      }
      frames = cache[gkey];
    } else {
      frames = _floatFrames(fw, fh);
    }
    window._pvStageLater(stage, ()=>{
      const floatTarget = typeof _ensureFloatWrap === 'function'
        ? _ensureFloatWrap(el, fw, fh)
        : (el.querySelector('._float_wrap') || el.querySelector('.ec') || el);
      if(el._liveAnimsByName && el._liveAnimsByName['float']){
        try{el._liveAnimsByName['float'].cancel();}catch(e){}
        delete el._liveAnimsByName['float'];
      }
      const anim = floatTarget.animate(frames, {duration:dur, iterations:iters, fill:'none', composite:'replace'});
      if(!el._liveAnims) el._liveAnims=[];
      el._liveAnims.push(anim);
      if(!el._liveAnimsByName) el._liveAnimsByName={};
      el._liveAnimsByName['float'] = anim;
    }, delay);
    return;
  }

  if(a.name==='particles'){
    const capDelay = typeof overrideDelay === 'number' ? overrideDelay : (a.delay || 0);
    window._pvStageLater(stage, () => {
      if (typeof window._fireParticlesAnim === 'function') {
        window._fireParticlesAnim(el, a, 0, d);
      }
    }, capDelay);
    return;
  }

  if(a.name==='splitHalf'){
    const capDelay = typeof overrideDelay === 'number' ? overrideDelay : (a.delay || 0);
    const animIdx = (d.anims || []).indexOf(a);
    const slide = slides[idx];
    const isElemTrig = (a.trigger || 'auto') === 'element';
    const laterEntrance = !isElemTrig && _pvHasLaterEntrance(slide, d.id, animIdx);
    if (typeof window._fireSplitHalfAnim === 'function') {
      window._fireSplitHalfAnim(el, a, capDelay, {
        hideAfter: true,
        onHide: () => {
          _pvScheduleExitHide(el, 0, (laterEntrance || isElemTrig) ? null : { permanent: true, idx, d });
        }
      });
    }
    return;
  }

  if(a.name==='captionSlide'){
    const capDelay = typeof overrideDelay === 'number' ? overrideDelay : (a.delay || 0);
    if (d.groupId && typeof _fireCaptionSlideAnimGroup === 'function') {
      const slide = slides[idx];
      const leader = _pvGroupLeader(d, slide);
      if (d.id !== leader.id) return;
      const container = el.parentElement;
      const entries = _pvGroupMembers(d, slide).map(md => {
        const mel = container && container.querySelector('.psel[data-id="' + md.id + '"]');
        return mel ? { el: mel, x: md.x || 0, y: md.y || 0, w: md.w || 200, h: md.h || 200 } : null;
      }).filter(Boolean);
      if (entries.length) _fireCaptionSlideAnimGroup(entries, a, capDelay, { hideAfter: true });
      return;
    }
    if (typeof _fireCaptionSlideAnim === 'function') {
      _fireCaptionSlideAnim(el, a, capDelay, d.w, d.h, { hideAfter: true });
    }
    return;
  }

  if(a.name==='dance'){
    const dur  = a.duration||1200;
    const delay= typeof overrideDelay==='number' ? overrideDelay : (a.delay||0);
    el.style.overflow='visible';
    el.classList.add('has-dance');
    let danceTarget = typeof window._ensureDanceWrap==='function'
      ? window._ensureDanceWrap(el)
      : (function(){
        let _dw = el.querySelector('._dance_wrap');
        if(!_dw){
          _dw = document.createElement('div');
          _dw.className = '_dance_wrap';
          _dw.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:visible;border-radius:inherit;';
          const _ec = el.querySelector('._text_body') || el.querySelector('.ec');
          if(_ec){ _ec.parentNode.insertBefore(_dw, _ec); _dw.appendChild(_ec); }
          else { while(el.firstChild) _dw.appendChild(el.firstChild); el.appendChild(_dw); }
        }
        return _dw;
      })();
    const cnt = a.swingCount != null ? a.swingCount : (a.count != null ? a.count : 1);
    const iters = (!isFinite(cnt)||cnt>=10) ? Infinity : cnt;
    window._pvStageLater(stage, ()=>{
      if(el._liveAnimsByName && el._liveAnimsByName['dance']){
        try{el._liveAnimsByName['dance'].cancel();}catch(e){}
        delete el._liveAnimsByName['dance'];
      }
      const _liveOnEc = true; // всегда на обёртке
      const anim = danceTarget.animate(
        [
          {transform:'scaleX(1)    scaleY(1)    rotate(0deg)',   easing:'cubic-bezier(.42,0,.3,1.4)'},
          {transform:'scaleX(1.12) scaleY(0.82) rotate(-2deg)',  easing:'cubic-bezier(.6,0,.4,1.3)'},
          {transform:'scaleX(0.9)  scaleY(1.1)  rotate(1.5deg)', easing:'cubic-bezier(.42,0,.3,1.4)'},
          {transform:'scaleX(1.1)  scaleY(0.85) rotate(-1.5deg)',easing:'cubic-bezier(.6,0,.4,1.3)'},
          {transform:'scaleX(0.92) scaleY(1.08) rotate(2deg)',   easing:'cubic-bezier(.42,0,.3,1.4)'},
          {transform:'scaleX(1.06) scaleY(0.9)  rotate(-1deg)',  easing:'cubic-bezier(.5,0,.35,1.3)'},
          {transform:'scaleX(0.97) scaleY(1.03) rotate(0.5deg)', easing:'cubic-bezier(.4,0,.6,1)'},
          {transform:'scaleX(1)    scaleY(1)    rotate(0deg)'}
        ],
        {duration:dur, iterations:iters, fill:'none', composite: _liveOnEc ? 'replace' : 'add'}
      );
      if(!el._liveAnims) el._liveAnims=[];
      el._liveAnims.push(anim);
      if(!el._liveAnimsByName) el._liveAnimsByName={};
      el._liveAnimsByName['dance'] = anim;
    }, delay);
    return;
  }
  const cssName=ANIM_CSS[a.name]||'el-fadein';
  const dur=(a.duration||600)/1000;
  const delay=typeof overrideDelay==='number' ? overrideDelay/1000 : (a.delay||0)/1000;
  let _animEl;
  if(d.type==='text' && typeof window._ensureTextBodyWrap==='function'){
    _animEl = window._ensureTextBodyWrap(el);
  } else if(a.cat==='emphasis' || a.cat==='entrance' || a.cat==='exit'){
    _animEl = el.querySelector('.ec') || el;
  } else {
    _animEl = el;
  }
  _animEl.style.animation='';
  if (a.cat === 'entrance') _pvRevealForEntrance(el, d, idx);
  requestAnimationFrame(()=>{
    _animEl.style.animation=`${cssName} ${dur}s ease-out ${delay}s both`;
  });
  if(a.cat==='exit'){
    const waitMs=(typeof overrideDelay==='number'?overrideDelay:(a.delay||0))+(a.duration||600);
    const animIdx = (d.anims || []).indexOf(a);
    const isElemTrig = (a.trigger || 'auto') === 'element';
    const laterEntrance = !isElemTrig && _pvHasLaterEntrance(slides[idx], d.id, animIdx);
    _pvScheduleExitHide(el, waitMs, (laterEntrance || isElemTrig) ? null : { permanent: true, idx, d });
  }
  if(a.trigger==='nav'){
    const navTarget=typeof a.navTarget==='number'?a.navTarget:0;
    const wait=(a.delay||0)+(a.duration||600);
    window._pvStageLater(stage, ()=>{
      if(!hiddenElsPerSlide[idx])hiddenElsPerSlide[idx]=new Set();
      hiddenElsPerSlide[idx].add(d.id);
      clearAutoTimer();
      gotoPreview(navTarget,navTarget>pidx?'next':'prev');
    },wait);
  }
}
function _ensureFlipWrap(slide,hinge,vertical,fwd){
  let w=slide._flipWrap;
  if(!w){
    w=document.createElement('div');
    w.className='_ps-flip-wrap';
    w.style.cssText='position:absolute;inset:0;transform-style:preserve-3d;backface-visibility:hidden;overflow:hidden;';
    while(slide.firstChild) w.appendChild(slide.firstChild);
    slide.appendChild(w);
    slide._flipWrap=w;
    const shade=document.createElement('div');
    shade.className='_ps-flip-shade';
    shade.style.cssText='position:absolute;inset:0;pointer-events:none;opacity:0;z-index:2;';
    w.appendChild(shade);
  }
  w.getAnimations().forEach(a=>a.cancel());
  w.style.transition='none';
  w.style.transformOrigin=hinge;
  w.style.transform=vertical?'rotateX(0deg) translateZ(0px)':'rotateY(0deg) translateZ(0px)';
  w.style.boxShadow='';
  const shade=w.querySelector('._ps-flip-shade');
  if(shade){
    shade.getAnimations().forEach(a=>a.cancel());
    shade.style.opacity='0';
    shade.style.background=fwd
      ?(vertical?'linear-gradient(to bottom,rgba(0,0,0,.75) 0%,rgba(0,0,0,.25) 45%,transparent 70%)':'linear-gradient(to right,rgba(0,0,0,.75) 0%,rgba(0,0,0,.25) 45%,transparent 70%)')
      :(vertical?'linear-gradient(to top,rgba(0,0,0,.75) 0%,rgba(0,0,0,.25) 45%,transparent 70%)':'linear-gradient(to left,rgba(0,0,0,.75) 0%,rgba(0,0,0,.25) 45%,transparent 70%)');
  }
  return w;
}
function _removeFlipWrap(slide){
  const w=slide._flipWrap;
  if(!w) return;
  w.getAnimations().forEach(a=>a.cancel());
  w.querySelectorAll('._ps-flip-shade').forEach(s=>s.getAnimations().forEach(a=>a.cancel()));
  w.style.transition='none';
  w.style.transform='';
  w.style.boxShadow='';
  while(w.firstChild) slide.insertBefore(w.firstChild,w);
  w.remove();
  delete slide._flipWrap;
}
function _bookFlipTf(vertical,deg,z){
  return vertical?'rotateX('+deg+'deg) translateZ('+(z||0)+'px)':'rotateY('+deg+'deg) translateZ('+(z||0)+'px)';
}
function _bookFlipFinish(a,b,stage,cb){
  _removeFlipWrap(a);
  stage.style.perspective='';
  stage.style.perspectiveOrigin='';
  stage.style.transformStyle='';
  a.style.transformStyle='';
  b.style.transformStyle='';
  a.style.zIndex='';
  b.style.zIndex='';
  cb();
}
function _bookFlipPrepare(stage,a,b,sc,fwd,vertical){
  const hinge=fwd
    ?(vertical?'top center':'left center')
    :(vertical?'bottom center':'right center');
  stage.style.perspective='900px';
  stage.style.perspectiveOrigin='50% 45%';
  stage.style.transformStyle='preserve-3d';
  a.style.transformStyle='preserve-3d';
  b.style.transformStyle='preserve-3d';
  a.style.transform='scale('+sc+') translateZ(0px)';
  a.style.transformOrigin='top left';
  b.style.transform='scale('+sc+') translateZ(0px)';
  b.style.transformOrigin='top left';
  b.style.zIndex='1';
  a.style.zIndex='2';
  b.style.opacity='1';
  a.style.opacity='1';
  _ensureFlipWrap(a,hinge,vertical,fwd);
}
function _bookFlipAnimate(a,b,sc,fwd,vertical,durMs,stage,cb){
  const wrap=a._flipWrap;
  if(!wrap){ cb(); return; }
  durMs=Math.max(1,Math.round(+durMs||500));
  const shade=wrap.querySelector('._ps-flip-shade');
  const end=fwd?180:-180;
  const mid=end/2;
  const lift=vertical?58:88;
  const easeBook='cubic-bezier(.42,.06,.28,1)';
  wrap.getAnimations().forEach(x=>x.cancel());
  if(shade) shade.getAnimations().forEach(x=>x.cancel());
  wrap.style.boxShadow=fwd
    ?(vertical?'0 20px 56px rgba(0,0,0,.5)':'20px 0 56px rgba(0,0,0,.5)')
    :(vertical?'0 -20px 56px rgba(0,0,0,.5)':'-20px 0 56px rgba(0,0,0,.5)');
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      const flipAnim=wrap.animate([
        {transform:_bookFlipTf(vertical,0,0)},
        {transform:_bookFlipTf(vertical,mid,lift),offset:0.46},
        {transform:_bookFlipTf(vertical,end,0)}
      ],{duration:durMs,easing:easeBook,fill:'forwards'});
      if(shade){
        shade.animate([
          {opacity:0},
          {opacity:0.92,offset:0.46},
          {opacity:0.55,offset:1}
        ],{duration:durMs,easing:'ease-in-out',fill:'forwards'});
      }
      flipAnim.finished.then(()=>_bookFlipFinish(a,b,stage,cb)).catch(()=>_bookFlipFinish(a,b,stage,cb));
    });
  });
}
function _animTransZoomStage(a,b,trans,dur,cb){
  const d=dur+'ms',sc=pScale();
  const stage=document.getElementById('preview-stage');
  a.style.transition='none';b.style.transition='none';
  if(stage){
    stage.style.transition='none';
    if(trans==='zoom'){
      stage.style.transformOrigin='center center';
      stage.style.transform='scale(0.88)';
    }else{
      stage.style.transformOrigin='';
      stage.style.transform='';
    }
  }
  b.style.pointerEvents='auto';
  _pSlideScale(a,sc);_pSlideScale(b,sc);
  b.style.opacity='0';a.style.opacity='1';
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      if(trans==='zoom'&&stage){
        stage.style.transition='transform '+d+' ease';
        a.style.transition='opacity '+d+' ease';b.style.transition='opacity '+d+' ease';
        stage.style.transform='scale(1)';
        a.style.opacity='0';b.style.opacity='1';
      }else{
        a.style.transition='opacity '+d+' ease';b.style.transition='opacity '+d+' ease';
        a.style.opacity='0';b.style.opacity='1';
      }
      _previewTransLater(()=>{ _pResetStageZoom(); cb(); },dur+16);
    });
  });
}
function animTrans(a,b,trans,fwd,dur,cb){
  if(trans==='zoom'||trans==='zoomOut'){ _animTransZoomStage(a,b,trans,dur,cb); return; }
  const d=dur+'ms',sc=pScale(),dir=fwd?1:-1;
  // Phase 1: disable transitions
  a.style.transition='none';b.style.transition='none';
  b.style.pointerEvents='auto';
  requestAnimationFrame(()=>{
    // Phase 2: set initial state for b (and a if needed)
    if(trans==='fade'){
      b.style.opacity='0';
    } else if(trans==='slide'){
      b.style.transform='scale('+sc+') translateX('+(dir*100)+'%)';b.style.opacity='1';
    } else if(trans==='slideUp'){
      b.style.transform='scale('+sc+') translateY('+(dir*100)+'%)';b.style.opacity='1';
    } else if(trans==='flip'){
      _bookFlipPrepare(document.getElementById('preview-stage'),a,b,sc,fwd,false);
    } else if(trans==='flipV'){
      _bookFlipPrepare(document.getElementById('preview-stage'),a,b,sc,fwd,true);
    } else if(trans==='cube'){
      document.getElementById('preview-stage').style.perspective='2000px';
      b.style.transform='scale('+sc+') rotateY('+(dir*-90)+'deg)';b.style.opacity='1';
    } else if(trans==='dissolve'){
      b.style.opacity='0';
    } else if(trans==='push'){
      b.style.transform='scale('+sc+') translateX('+(dir*100)+'%)';b.style.opacity='1';
    } else if(trans==='wipe'){
      b.style.clipPath=fwd?'inset(0 100% 0 0)':'inset(0 0 0 100%)';b.style.opacity='1';
    } else if(trans==='split'){
      b.style.clipPath='inset(50% 0)';b.style.opacity='1';
    } else if(trans==='reveal'){
      b.style.opacity='1';b.style.zIndex='0';a.style.zIndex='2';
    }
    requestAnimationFrame(()=>{
      // Phase 3: set transitions and final state
      if(trans==='fade'){
        a.style.transition='opacity '+d+' ease';b.style.transition='opacity '+d+' ease';
        a.style.opacity='0';b.style.opacity='1';_previewTransLater(cb,dur+16);
      } else if(trans==='slide'){
        a.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';b.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';
        a.style.transform='scale('+sc+') translateX('+(-dir*100)+'%)';b.style.transform='scale('+sc+') translateX(0)';
        _previewTransLater(cb,dur+16);
      } else if(trans==='slideUp'){
        a.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';b.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';
        a.style.transform='scale('+sc+') translateY('+(-dir*100)+'%)';b.style.transform='scale('+sc+') translateY(0)';
        _previewTransLater(cb,dur+16);
      } else if(trans==='flip'){
        _bookFlipAnimate(a,b,sc,fwd,false,dur,document.getElementById('preview-stage'),cb);
      } else if(trans==='flipV'){
        _bookFlipAnimate(a,b,sc,fwd,true,dur,document.getElementById('preview-stage'),cb);
      } else if(trans==='cube'){
        a.style.transition='transform '+d+' ease';b.style.transition='transform '+d+' ease';
        a.style.transform='scale('+sc+') rotateY('+(dir*90)+'deg)';b.style.transform='scale('+sc+') rotateY(0)';
        _previewTransLater(()=>{document.getElementById('preview-stage').style.perspective='';cb();},dur+16);
      } else if(trans==='dissolve'){
        a.style.transition='opacity '+d+' steps(12,end)';b.style.transition='opacity '+d+' steps(12,start)';
        a.style.opacity='0';b.style.opacity='1';_previewTransLater(cb,dur+16);
      } else if(trans==='push'){
        a.style.transition='transform '+d+' cubic-bezier(.25,.46,.45,.94)';
        b.style.transition='transform '+d+' cubic-bezier(.25,.46,.45,.94)';
        a.style.transform='scale('+sc+') translateX('+(-dir*40)+'%)';b.style.transform='scale('+sc+') translateX(0)';
        _previewTransLater(cb,dur+16);
      } else if(trans==='wipe'){
        b.style.transition='clip-path '+d+' cubic-bezier(.4,0,.2,1)';
        b.style.clipPath='inset(0 0% 0 0%)';
        a.style.transition='opacity '+(dur*.3)+'ms '+(dur*.7)+'ms ease';a.style.opacity='0';
        _previewTransLater(cb,dur+16);
      } else if(trans==='split'){
        b.style.transition='clip-path '+d+' cubic-bezier(.4,0,.2,1)';
        b.style.clipPath='inset(0% 0)';
        a.style.transition='opacity '+(dur*.4)+'ms '+(dur*.6)+'ms ease';a.style.opacity='0';
        _previewTransLater(cb,dur+16);
      } else if(trans==='reveal'){
        a.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';
        a.style.transform='scale('+sc+') translateX('+(dir*100)+'%)';
        _previewTransLater(cb,dur+16);
      } else if(trans==='glitch'){
        b.style.opacity='1';
        const steps=6,stepDur=dur/steps;
        let step=0;
        const glitchFilter=[
          'hue-rotate(90deg) saturate(3)','hue-rotate(180deg) contrast(2)',
          'hue-rotate(270deg) brightness(2)','saturate(0) brightness(1.5)',
          'hue-rotate(45deg) contrast(1.5)','none'
        ];
        const run=()=>{
          if(step>=steps){b.style.filter='none';a.style.opacity='0';cb();return;}
          const t2=step/steps;
          const dx=(Math.random()-.5)*30*(1-t2);
          b.style.transform='scale('+sc+') translateX('+dx+'px)';
          b.style.filter=glitchFilter[step]||'none';
          a.style.opacity=String(1-t2);
          step++;_previewTransLater(run,stepDur);
        };
        run();
      } else {
        b.style.opacity='1';cb();
      }
    });
  });
}
