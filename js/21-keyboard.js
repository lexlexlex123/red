// ══════════════ KEYBOARD ══════════════
let elClipboard=null; // stores copied element data
const CLIP_MARKER_TYPE='application/x-red-slides';
const CLIP_SENTINEL='\u200B'; // legacy marker in old clipboard sessions

window._markElementClipboardCopy=function(){
  window._clipSource='elements';
  window._appCopyGuardUntil=Date.now()+2000;
  if(typeof window._stampAppClip==='function') window._stampAppClip('elements');
  if(typeof window._clearSiblingClips==='function') window._clearSiblingClips('elements');
  if(typeof window._xclipWriteSystem==='function') window._xclipWriteSystem('elements');
};
window._markSlideClipboardCopy=function(){
  window._clipSource='slides';
  window._appCopyGuardUntil=Date.now()+2000;
  if(typeof window._stampAppClip==='function') window._stampAppClip('slides');
  if(typeof window._clearSiblingClips==='function') window._clearSiblingClips('slides');
  if(typeof window._xclipWriteSystem==='function') window._xclipWriteSystem('slides');
};
window._markInkClipboardCopy=function(){
  window._clipSource='ink';
  window._appCopyGuardUntil=Date.now()+2000;
  if(typeof window._stampAppClip==='function') window._stampAppClip('ink');
  if(typeof window._clearSiblingClips==='function') window._clearSiblingClips('ink');
  if(typeof window._xclipWriteSystem==='function') window._xclipWriteSystem('ink');
};

window._stampAppClip=function(kind){
  window._appClipAt=Date.now();
  if(kind) window._clipKind=kind;
};
window._stampOsClipWrite=function(){
  window._osClipWriteAt=Date.now();
};

window._clearSiblingClips=function(kind){
  if(kind!=='elements'){
    try{ if(typeof clipboard!=='undefined') clipboard=[]; }catch(e){}
    elClipboard=null;
    if(typeof _xclipSaveElements==='function') _xclipSaveElements(null);
  }
  if(kind!=='slides'){
    try{ _slideClipboard=null; }catch(e){}
    if(typeof _xclipSaveSlides==='function') _xclipSaveSlides(null);
  }
  if(kind!=='ink' && !(kind==='elements' && window._clipHadInk)){
    if(typeof clearInkClipboard==='function') clearInkClipboard();
    try{ window._clipHadInk=false; }catch(e){}
  }
  if(kind!=='anim'){
    try{ window._animListClipboard=null; }catch(e){}
  }
};

function _pasteLastAppClip(){
  const src=window._clipSource||window._clipKind||'';
  if(src==='external') return false;
  if((!clipboard||!clipboard.length)&&window._appClipboardEls&&window._appClipboardEls.length){
    clipboard=window._appClipboardEls;
  }
  if(src==='slides'){
    if(typeof hasSlideClipboard==='function'&&hasSlideClipboard()){
      const at=typeof slides!=='undefined'?slides.length:0;
      if(typeof pasteSlideAt==='function') pasteSlideAt(at);
      return true;
    }
    return false;
  }
  if(src==='ink'){
    return !!(typeof pasteInkFromClipboard==='function'&&pasteInkFromClipboard());
  }
  if(src==='anim'){
    const target=typeof window._getAnimListKeyboardTarget==='function'?window._getAnimListKeyboardTarget():null;
    return !!(typeof window.pasteAnimListAfter==='function'&&window.pasteAnimListAfter(target));
  }
  if(src && src!=='elements') return false;
  if(typeof _xclipHydrateElements==='function' && !(clipboard&&clipboard.length)) _xclipHydrateElements();
  const hasInternal=(typeof clipboard!=='undefined'&&clipboard.length)||elClipboard;
  if(hasInternal&&typeof pasteSelected==='function'){
    pasteSelected();
    return true;
  }
  if(src==='elements'&&window._clipHadInk&&typeof pasteInkFromClipboard==='function'&&pasteInkFromClipboard()){
    return true;
  }
  return false;
}

function _pasteElementFromClipboard(){
  return _pasteLastAppClip();
}

function _clearSystemClipboardForObjectCopy(kind){
  // Legacy name — now writes full payload to OS clipboard for cross-origin paste
  window._clipSource=kind;
  if(typeof window._xclipWriteSystem==='function') window._xclipWriteSystem(kind);
}

document.addEventListener('copy',(e)=>{
  // Internal write to OS clipboard — don't wipe in-memory clips
  if(window._slidesInternalCopy||(typeof window._xclipIsWritingSystem==='function'&&window._xclipIsWritingSystem())){
    e.preventDefault();
    return;
  }
  if(Date.now()<(window._appCopyGuardUntil||0)){
    e.preventDefault();
    return;
  }
  if(e.defaultPrevented) return;
  window._clipSource='external';
  window._appClipboardEls=null;
  if(typeof clipboard!=='undefined') clipboard=[];
  elClipboard=null;
  if(typeof _xclipSaveElements==='function') _xclipSaveElements(null);
}, true);

document.addEventListener('visibilitychange',()=>{
  if(document.hidden) window._lastBlurAt=Date.now();
});

// Russian ↔ Latin key mapping for Ctrl shortcuts
const RU_TO_EN={'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']','ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','ж':';','э':"'",'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m',',':'<','.':'>','Й':'Q','Ц':'W','У':'E','К':'R','Е':'T','Н':'Y','Г':'U','Ш':'I','Щ':'O','З':'P','Х':'[','Ъ':']','Ф':'A','Ы':'S','В':'D','А':'F','П':'G','Р':'H','О':'J','Л':'K','Д':'L','Я':'Z','Ч':'X','С':'C','М':'V','И':'B','Т':'N','Ь':'M'};
function latinKey(e){return RU_TO_EN[e.key]||e.key;}
function _isBracketLeft(e){return e.code==='BracketLeft'||e.key==='['||latinKey(e)==='[';}
function _isBracketRight(e){return e.code==='BracketRight'||e.key===']'||latinKey(e)===']';}
function _layerHotkey(dir){
  const hasInk=typeof hasSelectedInk==='function'&&hasSelectedInk();
  const elIsInkhost=sel&&sel.dataset&&sel.dataset.type==='inkhost';
  const hasEl=(!elIsInkhost)&& (!!sel||(typeof multiSel!=='undefined'&&multiSel.size>0));
  if(hasEl&&typeof layerEl==='function') layerEl(dir);
  if(hasInk&&typeof layerSelectedInk==='function') layerSelectedInk(dir);
}

function _hasCanvasObjectSel(){
  return !!(typeof sel!=='undefined'&&sel)
    || (typeof multiSel!=='undefined'&&multiSel&&multiSel.size>0)
    || (typeof window._getSelConnId==='function'&&window._getSelConnId());
}
window._hasCanvasObjectSel=_hasCanvasObjectSel;

/** Drop focus from props/sidebar inputs so canvas shortcuts (Del, arrows) work after clicking the slide. */
function _releasePropsFocusForCanvas(){
  const ae=document.activeElement;
  if(!ae||ae===document.body)return;
  if(ae.contentEditable==='true')return;
  const tag=ae.tagName;
  if(tag!=='INPUT'&&tag!=='SELECT'&&tag!=='TEXTAREA')return;
  if(ae.closest('#props')||ae.closest('#sidebar'))ae.blur();
}
window._releasePropsFocusForCanvas=_releasePropsFocusForCanvas;

function _hasAnimTlSelection(){
  return !!(window._animTlSel && window._animTlSel.size > 0);
}

/** Delete selected animation(s) on the timeline / props panel — never the canvas object. */
function _tryDeleteAnimSelection(e){
  const ae=document.activeElement;
  if(ae&&ae.contentEditable==='true') return false;
  if(e.key!=='Delete' && e.key!=='Backspace') return false;
  const tag=ae&&ae.tagName;
  const inField=tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA';
  if(inField && e.key==='Backspace') return false;
  if(_hasAnimTlSelection()){
    e.preventDefault();
    if(typeof window.removeAnimTlSelection==='function') window.removeAnimTlSelection();
    return true;
  }
  const animTabActive=document.body.classList.contains('anim-tab-active')||(()=>{
    const rg=document.querySelector('.rg[data-tab="anim"]');
    return rg&&getComputedStyle(rg).display!=='none';
  })();
  if(!animTabActive) return false;
  const openRows=document.querySelectorAll('#anim-assigned-list .anim-row.anim-row-open[data-el-id]');
  if(openRows.length){
    e.preventDefault();
    const items=[...openRows].map(r=>({
      elId:r.dataset.elId,
      ai:parseInt(r.dataset.ai,10)||0,
      camId:r.dataset.camId||''
    }));
    items.sort((a,b)=>b.ai-a.ai);
    items.forEach(({elId,ai,camId})=>{
      if(camId&&typeof window.removeCameraFrame==='function') window.removeCameraFrame(camId);
      else if(typeof window.removeAnim==='function') window.removeAnim(elId,ai);
    });
    return true;
  }
  const openBlocks=document.querySelectorAll('#anim-assigned-list .anim-block.anim-row-open[data-block-id]');
  if(openBlocks.length){
    e.preventDefault();
    openBlocks.forEach(b=>{
      if(typeof window.removeAnimBlock==='function'){
        window.removeAnimBlock(b.dataset.blockId,b.dataset.blockKind==='repeat');
      }
    });
    return true;
  }
  return false;
}

function _clipHasRealText(plain, html){
  const plainTrim=String(plain||'').trim();
  // Cross-origin slides payload looks like text — don't treat as document text
  if(typeof window._xclipIsSystemClipText==='function'&&window._xclipIsSystemClipText(plainTrim)) return false;
  if(plainTrim&&plainTrim!==CLIP_SENTINEL) return true;
  if(html&&String(html).trim()){
    try{
      const tmp=document.createElement('div');
      tmp.innerHTML=html;
      const t=(tmp.innerText||tmp.textContent||'').trim();
      if(t&&t!==CLIP_SENTINEL){
        if(typeof window._xclipIsSystemClipText==='function'&&window._xclipIsSystemClipText(t)) return false;
        return true;
      }
    }catch(e){}
  }
  return false;
}

function _runPasteAfterHydrate(){
  if(_pasteElementFromClipboard()) return true;
  return false;
}

function onKey(e){
  const editing=document.activeElement.contentEditable==='true';
  const inInput=['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName);
  const inPreview=document.getElementById('preview-ov').classList.contains('active');
  const lk=latinKey(e);
  if(inPreview){
    const lk=latinKey(e);
    if(e.key==='Escape'||e.key==='F5'){
      e.preventDefault();
      if(typeof pidx!=='undefined') cur=pidx;
      if(typeof stopPreview==='function') stopPreview();
    }
    else if(['ArrowRight','ArrowDown',' '].includes(e.key)){e.preventDefault();nextPreview();}
    else if(['ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();prevPreview();}
    else if(e.key==='Home'){e.preventDefault();gotoPreviewSlide(0);}
    else if(e.key==='End'){e.preventDefault();gotoPreviewSlide(slides.length-1);}
    else if(e.key==='PageDown'){e.preventDefault();nextPreview();}
    else if(e.key==='PageUp'){e.preventDefault();prevPreview();}
    else if(lk==='b'||lk==='B'){e.preventDefault();togglePreviewBlack();}
    else if(lk==='l'||lk==='L'){e.preventDefault();togglePresLoop();}
    else if(lk==='s'||lk==='S'){e.preventDefault();togglePresShuffle();}
    else if(/^[0-9]$/.test(e.key)){e.preventDefault();_previewJumpDigit(e.key);}
    return;
  }
  if(e.key==='F5'){
    e.preventDefault();
    // If preview is active, stop it and return to the slide where it paused
    const po=document.getElementById('preview-ov');
    if(po&&po.classList.contains('active')){
      if(typeof pidx!=='undefined') cur=pidx;
      if(typeof stopPreview==='function') stopPreview();
    } else {
      // Сбрасываем фокус с любого инпута/триггера перед запуском —
      // иначе браузер может перехватить F5 как обновление страницы
      if(document.activeElement&&document.activeElement!==document.body){
        document.activeElement.blur();
      }
      const _selEl = typeof sel !== 'undefined' ? sel : null;
      if (_selEl && typeof window._clearAnimHoverPreview === 'function') window._clearAnimHoverPreview(_selEl);
      // Сохранение и синхронизация анимаций — в startPreview (flush + sync + save)
      if(typeof _layoutAnimated!=='undefined' && _layoutAnimated && typeof _decorPausedAt!=='undefined'){
        document.querySelectorAll('.decor-el svg').forEach(function(svg){
          try{
            const _ksi = typeof _decorSvgSlideIndex==='function' ? _decorSvgSlideIndex(svg) : -1;
            if(_ksi >= 0) _decorPausedAt.set(_ksi, svg.getCurrentTime());
          }catch(e){}
        });
      }
      // F5 — с первого слайда; Shift+F5 — с текущего (как в PowerPoint)
      const from = e.shiftKey ? cur : 0;
      if(typeof startPreview==='function') startPreview(from);
    }
    return;
  }
  if(e.key==='Escape'||e.key==='Enter'){
    if(window._curveEditMode){
      e.preventDefault();
      if(typeof toggleCurveEditMode==='function') toggleCurveEditMode();
      return;
    }
  }
  if(e.key==='Escape'){
    if(typeof isDrawModeActive==='function'&&isDrawModeActive()){
      e.preventDefault();
      if(typeof exitDrawMode==='function') exitDrawMode();
      return;
    }
    if(typeof hasSelectedInk==='function'&&hasSelectedInk()){
      e.preventDefault();
      if(typeof clearInkSelection==='function') clearInkSelection();
      else if(typeof exitDrawMode==='function') exitDrawMode();
      return;
    }
    if(pipetteMode){cancelPipetteMode();return;}
    if(typeof exitCropModeIfActive==='function'&&typeof _cropEl!=='undefined'&&_cropEl){exitCropModeIfActive();return;}
    clearMultiSel();desel();
  }
  if(e.key==='Enter'&&!editing&&!inInput){if(typeof exitCropModeIfActive==='function'&&typeof _cropEl!=='undefined'&&_cropEl){e.preventDefault();exitCropModeIfActive();return;}}
  if(e.ctrlKey||e.metaKey){
    if(lk==='z'&&!editing){e.preventDefault();doUndo();return;}
    if((lk==='y'||lk==='Z')&&!editing){e.preventDefault();doRedo();return;}
    if(lk==='d'&&!editing&&!inInput){
      e.preventDefault();
      const animDupTarget=typeof window._getAnimListKeyboardTarget==='function'?window._getAnimListKeyboardTarget():null;
      if(animDupTarget&&typeof window.duplicateAnimListTarget==='function'){
        window.duplicateAnimListTarget(animDupTarget);
        return;
      }
      if(multiSel.size>1){copySelected();pasteSelected();}else dupEl();
      return;
    }
    if(lk==='c'&&!editing&&!inInput){
      const animCopyTarget=typeof window._getAnimListKeyboardTarget==='function'?window._getAnimListKeyboardTarget():null;
      if(animCopyTarget&&typeof window.copyAnimListTarget==='function'){
        e.preventDefault();
        if(window.copyAnimListTarget(animCopyTarget)&&typeof toast==='function') toast('Скопировано','ok');
        return;
      }
      const hasInk=typeof hasSelectedInk==='function'&&hasSelectedInk();
      const hasElSel=!!sel||(typeof multiSel!=='undefined'&&multiSel.size>0);
      if(hasInk||hasElSel){
        e.preventDefault();
        // Always go through copySelected when objects are selected (it also copies ink)
        if(hasElSel&&typeof copySelected==='function') copySelected();
        else if(hasInk&&typeof copySelectedInk==='function') copySelectedInk();
        return;
      }
      e.preventDefault();
      if(typeof copySlidesSelected==='function') copySlidesSelected();
      return;
    }
    if(lk==='v'&&!editing&&!inInput){
      // Do not paste here. preventDefault on keydown blocks the paste event,
      // so a leftover object clipboard would win over a newly copied OS image.
      return;
    }
    if(lk==='a'&&!editing&&!inInput){
      e.preventDefault();
      clearMultiSel();
      if(typeof clearInkSelection==='function') clearInkSelection();
      const cv=document.getElementById('canvas');
      if(cv){
        cv.querySelectorAll('.el').forEach(el=>{
          if(el.classList.contains('decor-el')) return;
          if(el.dataset.objHidden==='1') return;
          addToMultiSel(el);
        });
      }
      let inkN=0;
      if(typeof selectAllInk==='function'){
        inkN=selectAllInk({keepObjectSel:true, silent:true})||0;
      }
      const total=multiSel.size+inkN;
      if(multiSel.size===1&&!inkN){
        const only=[...multiSel][0];clearMultiSel();pick(only);
      } else if(multiSel.size>1||(multiSel.size>=1&&inkN)||inkN>0){
        if(multiSel.size>=1){
          window._explicitMultiSel=true;
          const frozen=[...multiSel];
          window._rbSelecting=true;
          pick(frozen[frozen.length-1]);
          window._rbSelecting=false;
          frozen.forEach(el=>{ if(!multiSel.has(el)) addToMultiSel(el); });
        }
        if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
        if(typeof _updateSelFrames==='function') _updateSelFrames();
        if(typeof toast==="function"&&total>1) toast(total+t('toastElementsSelected'),'ok');
      }
      return;
    }
  }
  if(_tryDeleteAnimSelection(e)) return;
  // Delete: remove selected objects even when focus stayed in a props/sidebar field
  if(!editing && e.key==='Delete' && _hasCanvasObjectSel() && !_hasAnimTlSelection()){
    if(inInput) _releasePropsFocusForCanvas();
    const ae=document.activeElement;
    const tag=ae&&ae.tagName;
    const stuckInField=tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA';
    const propsField=stuckInField&&(ae.closest('#props')||ae.closest('#sidebar'));
    if(!stuckInField||propsField){
      if(typeof hasSelectedInk==='function'&&hasSelectedInk()){
        const isInkHost=el=>el&&el.dataset&&el.dataset.type==='inkhost';
        const hasRealEl=(sel&&!isInkHost(sel))||
          (typeof multiSel!=='undefined'&&multiSel&&[...multiSel].some(el=>!isInkHost(el)));
        if(hasRealEl&&typeof deleteSelected==='function'){
          e.preventDefault();deleteSelected();return;
        }
      }
      if(typeof deleteSelected==='function'){
        e.preventDefault();deleteSelected();return;
      }
    }
  }
  if(editing||inInput)return;
  // Drawing shortcuts
  if(lk==='b'){e.preventDefault();if(typeof activateDrawingTool==='function')activateDrawingTool('brush');return;}
  if(lk==='h'){e.preventDefault();if(typeof activateDrawingTool==='function')activateDrawingTool('marker');return;}
  if(lk==='f'&&!(e.ctrlKey||e.metaKey)){e.preventDefault();if(typeof activateDrawingTool==='function')activateDrawingTool('fill');return;}
  if(lk==='e'&&!(e.ctrlKey||e.metaKey)){
    // Don't steal E if used elsewhere; only when not in text. activateDrawingTool opens tab.
    e.preventDefault();
    if(typeof activateDrawingTool==='function')activateDrawingTool('eraser');
    return;
  }
  if(_isBracketLeft(e)||_isBracketRight(e)){
    e.preventDefault();
    const fwd=_isBracketRight(e);
    if(e.ctrlKey||e.metaKey){ _layerHotkey(fwd?'up':'down'); return; }
    if(e.shiftKey){ _layerHotkey(fwd?'front':'back'); return; }
    if(typeof nudgeDrawSize==='function') nudgeDrawSize(fwd?1:-1);
    return;
  }
  if((e.key==='Delete'||e.key==='Backspace')&&typeof hasSelectedInk==='function'&&hasSelectedInk()){
    e.preventDefault();
    const isInkHost=el=>el&&el.dataset&&el.dataset.type==='inkhost';
    const hasRealEl=(sel&&!isInkHost(sel))||
      (typeof multiSel!=='undefined'&&multiSel&&[...multiSel].some(el=>!isInkHost(el)));
    // Inkhosts are proxies for strokes — Del must delete ink, not only host rows
    if(hasRealEl&&typeof deleteSelected==='function') deleteSelected();
    else if(typeof deleteSelectedInk==='function') deleteSelectedInk();
    return;
  }
  if(typeof hasSelectedInk==='function'&&hasSelectedInk()&&(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='ArrowDown')){
    const hasEl=!!sel||(typeof multiSel!=='undefined'&&multiSel.size>0);
    if(!hasEl){
      e.preventDefault();
      const step=e.shiftKey?(typeof SNAP!=='undefined'?SNAP*5:50):(typeof SNAP!=='undefined'?SNAP:10);
      let dx=0, dy=0;
      if(e.key==='ArrowLeft') dx=-step;
      else if(e.key==='ArrowRight') dx=step;
      else if(e.key==='ArrowUp') dy=-step;
      else dy=step;
      if(typeof nudgeSelectedInk==='function') nudgeSelectedInk(dx, dy);
      return;
    }
    // Objects + ink: fall through to object nudge, then move ink by same delta
  }
  const _noObjSel = !sel
    && (!multiSel || !multiSel.size)
    && !(typeof window._getSelConnId === 'function' && window._getSelConnId())
    && !(typeof hasSelectedInk === 'function' && hasSelectedInk());
  if(_noObjSel && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')){
    if(typeof canvasPanByKey === 'function' && canvasPanByKey(e.key, e.shiftKey)){
      e.preventDefault();
      return;
    }
  }
  const animTabActive=(()=>{const rg=document.querySelector('.rg[data-tab="anim"]');return rg&&getComputedStyle(rg).display!=='none';})();
  if(e.key===' '&&!inPreview&&animTabActive&&typeof toggleSlideAnimsPlayback==='function'){
    e.preventDefault();
    toggleSlideAnimsPlayback(typeof cur!=='undefined'?cur:0);
    return;
  }
  if(sel||multiSel.size>0||(typeof window._getSelConnId==='function'&&window._getSelConnId())){
    const step=e.shiftKey?SNAP*5:SNAP;
    const allEls=multiSel.size>1?[...multiSel]:(sel?[sel]:[]);
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='ArrowDown'){
      if(allEls.length===0)return;
      e.preventDefault();
      if(typeof pushUndo==="function")pushUndo();
      allEls.forEach(el=>{
        if(el.dataset&&el.dataset.rideConnId)return;
        const isLego=el.dataset&&el.dataset.type==='lego';
        const LU=40,LGY=12; // лего: U и GY из 41-lego.js
        const curL=parseInt(el.style.left),curT=parseInt(el.style.top);
        if(e.key==='ArrowLeft'){
          el.style.left=(isLego?(Math.round(curL/LU)*LU-LU):(curL-step))+'px';
        } else if(e.key==='ArrowRight'){
          el.style.left=(isLego?(Math.round(curL/LU)*LU+LU):(curL+step))+'px';
        } else if(e.key==='ArrowUp'){
          el.style.top=(isLego?(Math.round(curT/LGY)*LGY-LGY):(curT-step))+'px';
        } else if(e.key==='ArrowDown'){
          el.style.top=(isLego?(Math.round(curT/LGY)*LGY+LGY):(curT+step))+'px';
        }
        if(isLego&&typeof slides!=='undefined'&&typeof cur!=='undefined'){
          const d=slides[cur]&&slides[cur].els.find(function(e_){return e_.id===el.dataset.id;});
          if(d){d.x=parseInt(el.style.left);d.y=parseInt(el.style.top);}
          if(typeof window._refreshAllLegoZ==='function') window._refreshAllLegoZ();
        }
      });
      syncPos();
      if(typeof hasSelectedInk==='function'&&hasSelectedInk()&&typeof nudgeSelectedInk==='function'){
        let dx=0, dy=0;
        if(e.key==='ArrowLeft') dx=-step;
        else if(e.key==='ArrowRight') dx=step;
        else if(e.key==='ArrowUp') dy=-step;
        else dy=step;
        // nudgeSelectedInk pushes undo itself — skip double undo: move without undo
        if(typeof moveSelectedInkBy==='function') moveSelectedInkBy(dx, dy);
        else nudgeSelectedInk(dx, dy);
      }
      if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
      save();return;
    }
    if((e.key==='Delete'||e.key==='Backspace')&&window._curveEditMode){
    if(typeof curveRemoveNode==='function'){curveRemoveNode();return;}
  }
  if(e.key==='Delete'||e.key==='Backspace'){
    if(_tryDeleteAnimSelection(e)) return;
    if(typeof hasSelectedInk==='function'&&hasSelectedInk()&&typeof deleteSelectedInk==='function'){
      e.preventDefault();
      deleteSelectedInk();
      return;
    }
    e.preventDefault();deleteSelected();return;
  }
  } else {
    if(e.key==='Delete'||e.key==='Backspace'){
      if(typeof hasSelectedInk==='function'&&hasSelectedInk()&&typeof deleteSelectedInk==='function'){
        e.preventDefault();
        deleteSelectedInk();
        return;
      }
      if(typeof slideMultiSel!=='undefined' && slideMultiSel.size>0){
        e.preventDefault();
        if(typeof deleteSlidesSelected==='function') deleteSlidesSelected();
        return;
      }
      if(e.key==='Delete'){e.preventDefault();delSlide();return;}
    }
  }

}
function copyEl(){
  if(!sel)return;
  if(sel.dataset.type==='inkhost')return;
  window._slidesInternalCopy=true;
  window._appCopyGuardUntil=Date.now()+4000;
  if(typeof save==='function') save();
  elClipboard=_freshElementDataFromDom(sel.dataset.id);
  if(!elClipboard){
    window._slidesInternalCopy=false;
    return;
  }
  if(typeof _fillClipboardImageSrcs==='function') _fillClipboardImageSrcs([elClipboard]);
  if(typeof clipboard!=='undefined') clipboard=[elClipboard];
  window._appClipboardEls=[elClipboard];
  const finalizeCopy=()=>{
    if(typeof _xclipSaveElements==='function') _xclipSaveElements([elClipboard]);
    if(typeof window._markElementClipboardCopy==='function') window._markElementClipboardCopy();
    clipboard=[elClipboard];
    window._appClipboardEls=[elClipboard];
    window._slidesInternalCopy=false;
    if(typeof toast==='function') toast(t('toastCopied'),'ok');
  };
  if(elClipboard.type==='image'&&typeof MediaStore!=='undefined'&&MediaStore.persistImageEl){
    MediaStore.persistImageEl(elClipboard).then(finalizeCopy).catch(finalizeCopy);
  } else finalizeCopy();
}
function pasteEl(){
  if(typeof window._isPreviewActive==='function'&&window._isPreviewActive())return;
  if(typeof _xclipHydrateElements==='function') _xclipHydrateElements();
  if(!elClipboard){
    if(typeof clipboard!=='undefined'&&clipboard.length) elClipboard=clipboard[0];
  }
  if(!elClipboard)return (typeof toast==="function")&&toast(t('toastNothingPaste'));
  if(typeof urlFromElementData==='function'){
    const url=urlFromElementData(elClipboard);
    if(url&&typeof insertQRAppletAt==='function'){
      insertQRAppletAt(url, null, null);
      return;
    }
  }
  (async function(){
    if(typeof _ensureClipImageSrcs==='function') await _ensureClipImageSrcs([elClipboard]);
    if(elClipboard.type==='image'&&!elClipboard.src){
      if(typeof toast==='function') toast('Не удалось вставить изображение — скопируйте его снова','warn');
      return;
    }
    if(typeof pushUndo==="function")pushUndo();
    const nd=_cloneElementDataList([elClipboard], { offset: 0 })[0];
    slides[cur].els.push(nd);mkEl(nd);
    const newEl=document.getElementById('canvas').querySelector('[data-id="'+nd.id+'"]');
    if(newEl)pick(newEl);
    save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();
    if(typeof renderAnimPanel==='function')renderAnimPanel();
    if(typeof renderMotionOverlay==='function')renderMotionOverlay();
    if(typeof toast==='function')toast(t('toastPasted'),'ok');
  })();
}
function dupEl(){
  if(typeof window._isPreviewActive==='function'&&window._isPreviewActive())return;
  if(!sel)return;
  if(sel.dataset.type==='inkhost')return;if(typeof pushUndo==="function")pushUndo();
  if(typeof save==='function') save();
  const d=_freshElementDataFromDom(sel.dataset.id);if(!d)return;
  const nd=_cloneElementDataList([d], { offset: 20 })[0];
  slides[cur].els.push(nd);mkEl(nd);
  const newEl=document.getElementById('canvas').querySelector('[data-id="'+nd.id+'"]');
  if(newEl)pick(newEl);
  save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();
  if(typeof renderAnimPanel==='function')renderAnimPanel();
  if(typeof renderMotionOverlay==='function')renderMotionOverlay();
}


// Convert HTML <table> to TSV string for table paste
function _htmlTableToTSV(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const table = tmp.querySelector('table');
  if (!table) return '';
  const rows = [];
  table.querySelectorAll('tr').forEach(tr => {
    const cells = [];
    tr.querySelectorAll('td,th').forEach(td => {
      cells.push(td.innerText || td.textContent || '');
    });
    if (cells.length) rows.push(cells.join('\t'));
  });
  return rows.join('\n');
}

// ══════════════ SYSTEM CLIPBOARD PASTE ══════════════
// Helper: add image from dataURL or external src to canvas — global so filedrop can use it
// Helper: add image from dataURL / blob URL / file Blob to canvas
function _addImageToCanvas(src, meta) {
  if(!src && !(meta && meta.blob)) return;
  const finish=d=>{
    save(); if(typeof drawThumbs==='function')drawThumbs();
    const done=()=>{ if(typeof saveState==='function')saveState(); };
    if(d&&typeof MediaStore!=='undefined'&&MediaStore.persistImageEl){
      MediaStore.persistImageEl(d).then(function(){
        // Sync <img> if src became blob:
        const el=document.getElementById('canvas')&&document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
        const img=el&&el.querySelector('img');
        if(img&&d.src&&img.getAttribute('src')!==d.src){
          try{ img.setAttribute('src', d.src); }catch(e){}
        }
        done();
      }).catch(done);
    } else done();
    if(typeof toast==='function')toast((t('toastImagePasted')),'ok');
  };
  const place=(finalSrc, imageId)=>{
    if(!finalSrc) return;
    if(typeof pushUndo==='function')pushUndo();
    const img = new Image();
    img.onload = () => {
      const maxW = canvasW * 0.6, maxH = canvasH * 0.6;
      let w = img.naturalWidth || 400, h = img.naturalHeight || 300;
      const scale = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * scale); h = Math.round(h * scale);
      const g = typeof _insertGeom==='function' ? _insertGeom(w,h) : {x:Math.round((canvasW-w)/2),y:Math.round((canvasH-h)/2),w,h};
      const d = {
        id:'e'+(++ec), type:'image',
        x: g.x, y: g.y, w: g.w, h: g.h, src:finalSrc,
        rot:0, anims:[], imgFit:'fill', imgRx:0,
        imgBw:0, imgBc:'#ffffff', imgShadow:false,
        imgShadowBlur:15, imgShadowColor:'#000000', imgOpacity:1
      };
      if(imageId) d.imageId=imageId;
      slides[cur].els.push(d); mkEl(d);
      const el = document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
      if(el) pick(el);
      finish(d);
    };
    img.onerror = () => {
      if(typeof toast==='function')toast('Не удалось загрузить изображение','err');
    };
    img.src = finalSrc;
  };

  // Preferred: raw Blob → IndexedDB (no multi‑MB data: in localStorage)
  if(meta && meta.blob && typeof MediaStore!=='undefined'&&MediaStore.ingestImageBlob){
    MediaStore.ingestImageBlob(meta.blob, meta.mime || meta.blob.type).then(function(rec){
      place(rec.src, rec.imageId);
    }).catch(function(){
      // Fallback to data URL path
      const toUrl=typeof _blobToAnimSafeDataUrl==='function'?_blobToAnimSafeDataUrl(meta.blob):null;
      if(toUrl) toUrl.then(place).catch(()=>{ if(typeof toast==='function')toast('Не удалось загрузить изображение','err'); });
      else place(src);
    });
    return;
  }

  if(src && src.startsWith('data:')){ place(src); return; }
  if(src && src.startsWith('blob:')){
    fetch(src).then(r=>r.blob()).then(b=>{
      if(!b||!b.size) throw new Error('empty blob');
      if(typeof MediaStore!=='undefined'&&MediaStore.ingestImageBlob){
        return MediaStore.ingestImageBlob(b, b.type).then(function(rec){
          place(rec.src, rec.imageId);
        });
      }
      const toUrl=typeof _blobToAnimSafeDataUrl==='function'?_blobToAnimSafeDataUrl(b):null;
      if(toUrl) return toUrl.then(place);
      const fr=new FileReader();
      fr.onload=ev=>place(ev.target.result);
      fr.readAsDataURL(b);
    }).catch(()=>{
      if(typeof toast==='function')toast('Не удалось загрузить изображение','err');
    });
    return;
  }
  // Remote URL: show it even if CORS blocks embedding as data URL
  const probe=new Image();
  probe.onload=()=>{
    if(typeof embedImageSrcAsDataUrl==='function'){
      embedImageSrcAsDataUrl(src).then(du=>place((du&&String(du).startsWith('data:'))?du:src)).catch(()=>place(src));
    } else place(src);
  };
  probe.onerror=()=>{
    if(typeof toast==='function')toast('Не удалось загрузить изображение','err');
  };
  probe.src=src;
}
window._addImageToCanvas=_addImageToCanvas;

document.addEventListener('paste', async (e) => {
  const ae = document.activeElement;
  const editing = ae.contentEditable === 'true';
  const inInput = ['INPUT','SELECT','TEXTAREA'].includes(ae.tagName);
  const inPreview = document.getElementById('preview-ov').classList.contains('active');
  const inTableCell = ae.matches && ae.matches('td,th') && editing;
  const elEditing = ae.closest && ae.closest('.el[data-editing="true"]');
  if (inPreview) return;
  if (!slides[cur]) return;

  if (!editing && !inInput && (window._clipSource === 'anim' || window._clipKind === 'anim')) {
    if (typeof window._animListHasClipboard === 'function' && window._animListHasClipboard()) {
      const animTarget = typeof window._getAnimListKeyboardTarget === 'function'
        ? window._getAnimListKeyboardTarget() : null;
      if (typeof window.pasteAnimListAfter === 'function' && window.pasteAnimListAfter(animTarget)) {
        e.preventDefault();
        return;
      }
    }
  }

  const cd = e.clipboardData;
  const items = cd && cd.items ? [...cd.items] : [];
  // Grab image files NOW — after await, Chrome often returns getAsFile()=null
  const osImageFiles=[];
  const _imgRank=function(t, name){
    t=String(t||'').toLowerCase();
    name=String(name||'').toLowerCase();
    if(t==='image/gif'||name.endsWith('.gif')) return 0;
    if(t==='image/webp'||name.endsWith('.webp')) return 1;
    if(t==='image/png') return 2;
    if(t==='image/jpeg'||t==='image/jpg') return 3;
    return 4;
  };
  const _pushClipImg=function(f){
    if(!f||!f.size) return;
    const t=String(f.type||'');
    const n=String(f.name||'').toLowerCase();
    if(t&&!t.startsWith('image/')&&t!=='application/octet-stream'&&!/\.(gif|webp|png|jpe?g|bmp|avif)$/.test(n)) return;
    osImageFiles.push(f);
  };
  for(const it of items){
    if(!it.type) continue;
    if(it.type.startsWith('image/')||it.kind==='file'){
      const f=it.getAsFile();
      _pushClipImg(f);
    }
  }
  if(cd&&cd.files&&cd.files.length){
    for(const f of cd.files){
      const t=String(f.type||'');
      const n=String(f.name||'').toLowerCase();
      if((t.startsWith('image/')||/\.(gif|webp|png|jpe?g|bmp|avif)$/i.test(n))&&f.size) _pushClipImg(f);
    }
  }
  osImageFiles.sort(function(a,b){ return _imgRank(a.type,a.name)-_imgRank(b.type,b.name); });
  const hasImageItem = osImageFiles.length>0 || items.some(it => it.type && it.type.startsWith('image/'));
  let html = '', plain = '', customClip = '';
  if (cd) {
    const textPromises = [];
    for (const item of items) {
      if (item.type === 'text/html') textPromises.push(new Promise(res => item.getAsString(s => { html = s; res(); })));
      else if (item.type === 'text/plain') textPromises.push(new Promise(res => item.getAsString(s => { plain = s; res(); })));
    }
    if (textPromises.length) await Promise.all(textPromises);
    if (!plain && typeof cd.getData === 'function') {
      try { plain = cd.getData('text/plain') || ''; } catch(err) {}
      try { if (!html) html = cd.getData('text/html') || ''; } catch(err) {}
    }
    try {
      if (typeof cd.getData === 'function') customClip = cd.getData('application/x-red-slides') || '';
    } catch (err) {}
  }

  const _needClipboardApi = !osImageFiles.some(f=>_imgRank(f.type,f.name)<=1);
  if(_needClipboardApi && navigator.clipboard && navigator.clipboard.read){
    try{
      const clipItems=await navigator.clipboard.read();
      for(const it of clipItems){
        const types=(it.types||[]).filter(t=>String(t).startsWith('image/'));
        types.sort(function(a,b){ return _imgRank(a)-_imgRank(b); });
        for(const typ of types){
          try{
            const blob=await it.getType(typ);
            if(blob&&blob.size) osImageFiles.push(blob);
          }catch(err){}
        }
      }
      osImageFiles.sort(function(a,b){ return _imgRank(a.type,a.name)-_imgRank(b.type,b.name); });
    }catch(err){}
  }

  const htmlImgEl = html ? (() => {
    const tmp = document.createElement('div'); tmp.innerHTML = html;
    const img = tmp.querySelector('img');
    if (!img) return null;
    const text = (tmp.innerText || tmp.textContent || '').trim();
    if (text && text.length > 40) return null;
    return img;
  })() : null;
  const osHasBitmap = osImageFiles.length>0 || hasImageItem || !!htmlImgEl;
  const copiedOutside = (window._lastBlurAt || 0) > (window._appClipAt || 0);

  const applyMagic = (text) => {
    if (!text) return false;
    if (osHasBitmap && copiedOutside) return false;
    if (typeof window._xclipHydrateFromSystemText !== 'function') return false;
    if (!window._xclipHydrateFromSystemText(text)) return false;
    e.preventDefault();
    return _runPasteAfterHydrate();
  };

  const pasteOsBitmap = () => {
    const htmlSrc = htmlImgEl ? (htmlImgEl.src || htmlImgEl.getAttribute('src') || '') : '';
    const htmlAnim = htmlSrc && typeof _srcLooksAnimatedImage==='function' && _srcLooksAnimatedImage(htmlSrc);
    if (!osImageFiles.length && !htmlSrc) return false;
    e.preventDefault();
    (async function(){
      // Prefer original GIF/WebP URL from HTML over Windows' static PNG snapshot
      if(htmlAnim && (htmlSrc.startsWith('http')||htmlSrc.startsWith('data:')||htmlSrc.startsWith('blob:'))){
        _addImageToCanvas(htmlSrc);
        return;
      }
      const best=typeof _pickBestClipboardImageBlob==='function'
        ? await _pickBestClipboardImageBlob(osImageFiles)
        : osImageFiles[0];
      if(best){
        let mime=(best.type||'').toLowerCase();
        if(typeof _sniffAnimatedImageBlob==='function'){
          const sniffed=await _sniffAnimatedImageBlob(best);
          if(sniffed) mime=sniffed;
        }
        // Blob → IndexedDB (avoids localStorage quota on large GIF/WebP)
        _addImageToCanvas(null, { blob: best, mime: mime || best.type || 'image/png' });
        return;
      }
      if(htmlSrc && (htmlSrc.startsWith('http')||htmlSrc.startsWith('data:')||htmlSrc.startsWith('blob:'))){
        _addImageToCanvas(htmlSrc);
        return;
      }
      if(typeof toast==='function') toast('Не удалось загрузить изображение','err');
    })().catch(()=>{
      if(typeof toast==='function') toast('Не удалось загрузить изображение','err');
    });
    return true;
  };

  // Property panel / modal inputs: text paste in field, object paste on canvas if no text
  if (inInput) {
    if (_clipHasRealText(plain, html)) return;
    if (applyMagic(customClip) || applyMagic(plain)) return;
    if (_pasteLastAppClip()) {
      e.preventDefault();
      if (ae && typeof ae.blur === 'function') ae.blur();
    }
    return;
  }

  if ((editing && !inTableCell) || (inTableCell && elEditing)) return;

  const plainTrim = (plain || '').trim();
  const isSentinel = plainTrim === CLIP_SENTINEL;
  const isSysClip = typeof window._xclipIsSystemClipText === 'function' && window._xclipIsSystemClipText(plainTrim);
  const hasRealExternalText = !!plainTrim && !isSentinel && !isSysClip;

  // 0. TSV / Excel table — highest priority (Excel also puts image/png in clipboard)
  const isTSV = plain && plain.includes('\t');
  if (isTSV && typeof tblPasteData === 'function') {
    e.preventDefault();
    if (tblPasteData(plain)) return;
  }

  // Also check text/html for <table> tag (Google Sheets, web tables)
  if (!isTSV && html && html.includes('<table') && typeof tblPasteData === 'function') {
    const tsv = _htmlTableToTSV(html);
    if (tsv && tsv.includes('\t')) {
      e.preventDefault();
      if (tblPasteData(tsv)) return;
    }
  }

  const pasteUrl = typeof extractPasteUrl === 'function' ? extractPasteUrl(plain, html) : null;
  const textIsOnlyUrl = !!(pasteUrl && plainTrim && (
    plainTrim === pasteUrl ||
    plainTrim.replace(/\/$/, '') === String(pasteUrl).replace(/\/$/, '')
  ));
  const copiedAsImage = !isTSV && (osImageFiles.length > 0 || !!htmlImgEl) && (
    !!htmlImgEl ||
    (!hasRealExternalText && !pasteUrl) ||
    (!!htmlImgEl && (textIsOnlyUrl || !hasRealExternalText))
  );

  // 1. Right-click "Copy image" / screenshot without real document text
  if (copiedAsImage && pasteOsBitmap()) return;

  // 2. Editor MAGIC / last in-app copy — not when OS has a URL/text/image copy
  if (applyMagic(customClip) || applyMagic(plain)) return;
  if (!copiedAsImage && !pasteUrl && !(copiedOutside && hasRealExternalText) && _pasteLastAppClip()) {
    e.preventDefault();
    return;
  }

  // 2b. HTML-документ из буфера → объект HTML (до QR: в DOCTYPE часто есть http://…)
  const htmlDocText = (hasRealExternalText && typeof _looksLikeHtmlDocument === 'function' && _looksLikeHtmlDocument(plainTrim))
    ? plainTrim
    : ((html && typeof _looksLikeHtmlDocument === 'function' && _looksLikeHtmlDocument(String(html).trim())) ? String(html).trim() : '');
  if (htmlDocText && typeof insertHtmlFrameFromText === 'function') {
    e.preventDefault();
    insertHtmlFrameFromText(htmlDocText);
    return;
  }

  // 3. Только чистый URL → QR (не текст/HTML с http:// внутри DOCTYPE и т.п.)
  if (pasteUrl && textIsOnlyUrl && typeof insertQRAppletAt === 'function' && !htmlImgEl) {
    e.preventDefault();
    insertQRAppletAt(pasteUrl, null, null);
    if (typeof toast === 'function') toast(typeof t === 'function' ? t('toastQrPasted') : 'QR code inserted', 'ok');
    return;
  }

  // 4. External plain text from document (ignore incidental screenshot of the text)
  const hasHtmlContent = !!(html && html.trim());
  if (hasRealExternalText || hasHtmlContent) {
    let content = plainTrim;
    if (!content && html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      content = (tmp.innerText || tmp.textContent || '').trim();
    }
    if (content && !isSysClip) {
      e.preventDefault();
      // Если похоже на код — вставить блоком кода, а не текстом
      let codeSrc = content;
      const fence = codeSrc.match(/^```([a-zA-Z0-9_+-]*)[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/);
      if (fence) codeSrc = fence[2];
      const codeLang = typeof _detectPasteCodeLang === 'function' ? _detectPasteCodeLang(content) : null;
      if (codeLang && typeof insertCodeFromText === 'function') {
        insertCodeFromText(codeSrc, codeLang);
        return;
      }
      if (typeof pushUndo === 'function') pushUndo();
      const w = Math.min(Math.max(content.length * 14, 300), canvasW * 0.7);
      const h = Math.max(80, Math.ceil(content.split('\n').length * 48));
      const g = typeof _insertGeom==='function' ? _insertGeom(w,h) : {x:Math.round((canvasW-w)/2),y:Math.round((canvasH-h)/2),w,h};
      const x = g.x, y = g.y;
      const safeHtml = content
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\n/g,'<br>');
      const _kbThemeIdx = typeof appliedThemeIdx!=='undefined' ? appliedThemeIdx : -1;
      const _kbTheme = _kbThemeIdx>=0 ? THEMES[_kbThemeIdx] : null;
      const _kbScheme = {col:7, row:0};
      const _kbDefColor = (typeof _resolveSchemeColor==='function'&&_kbTheme)
        ? (_resolveSchemeColor(_kbScheme,_kbTheme)||'#ffffff')
        : (_kbTheme&&!_kbTheme.dark?'#000000':'#ffffff');
      const _kbFs = Math.max(10, Math.round(32*(g.scale||1)));
      const d = {
        id:'e'+(++ec), type:'text',
        x, y, w:g.w, h:g.h,
        html: safeHtml,
        cs: 'font-size:'+_kbFs+'px;font-weight:400;color:'+_kbDefColor+';text-align:left;line-height:1.3;',
        rot:0, anims:[], textRole:'body',
        textColorScheme: _kbScheme
      };
      slides[cur].els.push(d); mkEl(d);
      const el = document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
      if (el) pick(el);
      save(); if(typeof drawThumbs==='function')drawThumbs(); if(typeof saveState==='function')saveState();
      if(typeof toast==='function')toast((t('toastTextPasted')),'ok');
      return;
    }
  }

  // 5. Last in-app copy of one kind only (elements / slides / ink)
  if (_pasteLastAppClip()) {
    e.preventDefault();
    return;
  }
});
