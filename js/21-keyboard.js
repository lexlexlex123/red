// ══════════════ KEYBOARD ══════════════
let elClipboard=null; // stores copied element data
const CLIP_MARKER_TYPE='application/x-red-slides';
const CLIP_SENTINEL='\u200B'; // legacy marker in old clipboard sessions

window._markElementClipboardCopy=function(){
  _clearSystemClipboardForObjectCopy('elements');
};
window._markSlideClipboardCopy=function(){
  _clearSystemClipboardForObjectCopy('slides');
};

function _clearSystemClipboardForObjectCopy(kind){
  window._clipSource=kind;
  window._slidesInternalCopy=true;
  try{
    const ta=document.createElement('textarea');
    ta.setAttribute('aria-hidden','true');
    ta.value='';
    ta.style.cssText='position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }catch(e){}
  window._slidesInternalCopy=false;
  try{
    if(navigator.clipboard&&navigator.clipboard.write&&window.ClipboardItem){
      const payload=JSON.stringify({app:'slides',kind,t:Date.now()});
      navigator.clipboard.write([
        new ClipboardItem({
          [CLIP_MARKER_TYPE]:new Blob([payload],{type:CLIP_MARKER_TYPE}),
          'text/plain':new Blob([''],{type:'text/plain'}),
          'text/html':new Blob([''],{type:'text/html'})
        })
      ]).catch(()=>{});
      return;
    }
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText('').catch(()=>{});
    }
  }catch(e){}
}

document.addEventListener('copy',(e)=>{
  if(window._slidesInternalCopy){
    e.preventDefault();
    if(e.clipboardData){
      e.clipboardData.setData('text/plain','');
      try{e.clipboardData.setData('text/html','');}catch(err){}
    }
    return;
  }
  if(e.defaultPrevented) return;
  window._clipSource='external';
  if(typeof clipboard!=='undefined') clipboard=[];
  elClipboard=null;
  if(typeof _xclipSaveElements==='function') _xclipSaveElements(null);
}, true);

// Russian ↔ Latin key mapping for Ctrl shortcuts
const RU_TO_EN={'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']','ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','ж':';','э':"'",'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m',',':'<','.':'>','Й':'Q','Ц':'W','У':'E','К':'R','Е':'T','Н':'Y','Г':'U','Ш':'I','Щ':'O','З':'P','Ф':'A','Ы':'S','В':'D','А':'F','П':'G','Р':'H','О':'J','Л':'K','Д':'L','Я':'Z','Ч':'X','С':'C','М':'V','И':'B','Т':'N','Ь':'M'};
function latinKey(e){return RU_TO_EN[e.key]||e.key;}

function _clipHasRealText(plain, html){
  const plainTrim=String(plain||'').trim();
  if(plainTrim&&plainTrim!==CLIP_SENTINEL) return true;
  if(html&&String(html).trim()){
    try{
      const tmp=document.createElement('div');
      tmp.innerHTML=html;
      const t=(tmp.innerText||tmp.textContent||'').trim();
      if(t&&t!==CLIP_SENTINEL) return true;
    }catch(e){}
  }
  return false;
}

function _pasteElementFromClipboard(){
  if(typeof _xclipHydrateAll==='function') _xclipHydrateAll();
  const hasInternal=(typeof clipboard!=='undefined'&&clipboard.length)||elClipboard;
  if(hasInternal){
    if(typeof pasteSelected==='function') pasteSelected();
    return true;
  }
  if(typeof hasSlideClipboard==='function'&&hasSlideClipboard()){
    const at=typeof slides!=='undefined'?slides.length:0;
    if(typeof pasteSlideAt==='function') pasteSlideAt(at);
    return true;
  }
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
      if(typeof startPreview==='function') startPreview(cur);
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
  if(e.key==='Escape'){if(pipetteMode){cancelPipetteMode();return;}if(typeof exitCropModeIfActive==='function'&&typeof _cropEl!=='undefined'&&_cropEl){exitCropModeIfActive();return;}clearMultiSel();desel();}
  if(e.key==='Enter'&&!editing&&!inInput){if(typeof exitCropModeIfActive==='function'&&typeof _cropEl!=='undefined'&&_cropEl){e.preventDefault();exitCropModeIfActive();return;}}
  if(e.ctrlKey||e.metaKey){
    if(lk==='z'&&!editing){e.preventDefault();doUndo();return;}
    if((lk==='y'||lk==='Z')&&!editing){e.preventDefault();doRedo();return;}
    if(lk==='d'&&!editing&&!inInput){e.preventDefault();if(multiSel.size>1){copySelected();pasteSelected();}else dupEl();return;}
    if(lk==='c'&&!editing&&!inInput){
      const hasElSel=!!sel||(typeof multiSel!=='undefined'&&multiSel.size>0);
      if(!hasElSel){
        e.preventDefault();
        if(typeof copySlidesSelected==='function') copySlidesSelected();
        return;
      }
      e.preventDefault();copySelected();return;
    }
    if(lk==='v'&&!editing&&!inInput){
      if(typeof _xclipHydrateAll==='function') _xclipHydrateAll();
      return;
    }
    if(lk==='a'&&!editing&&!inInput){
      e.preventDefault();
      clearMultiSel();
      document.getElementById('canvas').querySelectorAll('.el').forEach(el=>addToMultiSel(el));
      if(multiSel.size===1){const only=[...multiSel][0];clearMultiSel();pick(only);}
      else if(multiSel.size>1){pick([...multiSel].slice(-1)[0]);if(typeof toast==="function")toast(multiSel.size+t('toastElementsSelected'),'ok');}
      return;
    }
  }
  if(editing||inInput)return;
  const animTabActive=(()=>{const rg=document.querySelector('.rg[data-tab="anim"]');return rg&&getComputedStyle(rg).display!=='none';})();
  if(e.key===' '&&!inPreview&&animTabActive&&typeof toggleSlideAnimsPlayback==='function'){
    e.preventDefault();
    toggleSlideAnimsPlayback(typeof cur!=='undefined'?cur:0);
    return;
  }
  if((e.key==='Delete'||e.key==='Backspace')&&animTabActive&&window._animTlSel&&window._animTlSel.size>0){
    e.preventDefault();
    if(typeof window.removeAnimTlSelection==='function') window.removeAnimTlSelection();
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
      if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
      save();return;
    }
    if((e.key==='Delete'||e.key==='Backspace')&&window._curveEditMode){
    if(typeof curveRemoveNode==='function'){curveRemoveNode();return;}
  }
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteSelected();return;}
  } else {
    if(e.key==='Delete'||e.key==='Backspace'){
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
  elClipboard=_freshElementDataFromDom(sel.dataset.id);
  if(!elClipboard)return;
  if(typeof _xclipSaveElements==='function') _xclipSaveElements([elClipboard]);
  if(typeof window._markElementClipboardCopy==='function') window._markElementClipboardCopy();
  if(typeof toast==="function")toast(t('toastCopied'),'ok');
}
function pasteEl(){
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
  if(typeof pushUndo==="function")pushUndo();
  const nd=_cloneElementDataList([elClipboard], { offset: 0 })[0];
  slides[cur].els.push(nd);mkEl(nd);
  // Select the pasted element
  const newEl=document.getElementById('canvas').querySelector('[data-id="'+nd.id+'"]');
  if(newEl)pick(newEl);
  save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();
  if(typeof renderAnimPanel==='function')renderAnimPanel();
  if(typeof renderMotionOverlay==='function')renderMotionOverlay();
  if(typeof toast==="function")toast(t('toastPasted'),'ok');
}
function dupEl(){
  if(!sel)return;if(typeof pushUndo==="function")pushUndo();
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
function _addImageToCanvas(src) {
  if(typeof pushUndo==='function')pushUndo();
  const img = new Image();
  img.onload = () => {
    const maxW = canvasW * 0.6, maxH = canvasH * 0.6;
    let w = img.naturalWidth || 400, h = img.naturalHeight || 300;
    const scale = Math.min(maxW / w, maxH / h, 1);
    w = Math.round(w * scale); h = Math.round(h * scale);
    const d = {
      id:'e'+(++ec), type:'image',
      x: Math.round((canvasW - w) / 2), y: Math.round((canvasH - h) / 2), w, h, src,
      rot:0, anims:[], imgFit:'fill', imgRx:0,
      imgBw:0, imgBc:'#ffffff', imgShadow:false,
      imgShadowBlur:15, imgShadowColor:'#000000', imgOpacity:1
    };
    slides[cur].els.push(d); mkEl(d);
    const el = document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
    if(el) pick(el);
    save(); if(typeof drawThumbs==='function')drawThumbs(); if(typeof saveState==='function')saveState();
    if(typeof toast==='function')toast((t('toastImagePasted')),'ok');
  };
  img.onerror = () => { if(typeof toast==='function')toast('Не удалось загрузить изображение','err'); };
  img.src = src;
}

document.addEventListener('paste', async (e) => {
  const ae = document.activeElement;
  const editing = ae.contentEditable === 'true';
  const inInput = ['INPUT','SELECT','TEXTAREA'].includes(ae.tagName);
  const inPreview = document.getElementById('preview-ov').classList.contains('active');
  const inTableCell = ae.matches && ae.matches('td,th') && editing;
  const elEditing = ae.closest && ae.closest('.el[data-editing="true"]');
  if (inPreview) return;
  if (!slides[cur]) return;

  const cd = e.clipboardData;
  let html = '', plain = '';
  if (cd) {
    const items = cd.items ? [...cd.items] : [];
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
  }

  // Property panel / modal inputs: text paste in field, object paste on canvas if no text
  if (inInput) {
    if (_clipHasRealText(plain, html)) return;
    if (_pasteElementFromClipboard()) {
      e.preventDefault();
      if (ae && typeof ae.blur === 'function') ae.blur();
    }
    return;
  }

  if ((editing && !inTableCell) || (inTableCell && elEditing)) return;

  const items = cd && cd.items ? [...cd.items] : [];

  const plainTrim = plain.trim();
  const isSentinel = plainTrim === CLIP_SENTINEL;
  const hasRealExternalText = !!plainTrim && !isSentinel;

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

  // Helper: add image from dataURL or external src to canvas

  // 1. Check for image
  // hasText guard: skip image if there's meaningful text (Excel/app screenshot has both image+text)
  // But: copying an image from browser puts image/png + text/html with <img> tag — that should still paste as image
  const hasRealText = hasRealExternalText;
  const htmlImgEl = html ? (() => {
    const tmp = document.createElement('div'); tmp.innerHTML = html;
    const text = (tmp.innerText || tmp.textContent || '').trim();
    if (text !== '' && !tmp.querySelector('img')) return null;
    return tmp.querySelector('img') || null;
  })() : null;
  const blockImage = hasRealText || (html.trim() && !htmlImgEl);

  // 1a. image/* blob in clipboard (screenshot, paste from image editor)
  for (const item of items) {
    if (item.type.startsWith('image/') && !blockImage) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;
      const reader = new FileReader();
      reader.onload = ev => _addImageToCanvas(ev.target.result);
      reader.readAsDataURL(file);
      return;
    }
  }

  // 1b. No image/* blob but html contains <img src="..."> — browser "Copy Image" context menu
  if (!hasRealText && htmlImgEl) {
    const src = htmlImgEl.src || htmlImgEl.getAttribute('src');
    if (src && (src.startsWith('http') || src.startsWith('data:'))) {
      e.preventDefault();
      _addImageToCanvas(src);
      return;
    }
  }

  // 2. URL from clipboard (plain or HTML link) → QR applet
  const pasteUrl=typeof extractPasteUrl==='function'?extractPasteUrl(plain, html):null;
  if(pasteUrl&&typeof insertQRAppletAt==='function'){
    e.preventDefault();
    insertQRAppletAt(pasteUrl, null, null);
    if(typeof toast==='function') toast(typeof t==='function'?t('toastQrPasted'):'QR code inserted', 'ok');
    return;
  }

  // 3. External plain text from document
  const hasHtmlContent=!!(html&&html.trim());
  if(hasRealExternalText||hasHtmlContent){
    let content=plainTrim;
    if(!content&&html){
      const tmp=document.createElement('div');
      tmp.innerHTML=html;
      content=(tmp.innerText||tmp.textContent||'').trim();
    }
    if(content){
      e.preventDefault();
      if(typeof pushUndo==='function') pushUndo();
      const w = Math.min(Math.max(content.length * 14, 300), canvasW * 0.7);
      const h = Math.max(80, Math.ceil(content.split('\n').length * 48));
      const x = Math.round((canvasW - w) / 2);
      const y = Math.round((canvasH - h) / 2);
      const safeHtml = content
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\n/g,'<br>');
      const _kbThemeIdx = typeof appliedThemeIdx!=='undefined' ? appliedThemeIdx : -1;
      const _kbTheme = _kbThemeIdx>=0 ? THEMES[_kbThemeIdx] : null;
      const _kbScheme = {col:7, row:0};
      const _kbDefColor = (typeof _resolveSchemeColor==='function'&&_kbTheme)
        ? (_resolveSchemeColor(_kbScheme,_kbTheme)||'#ffffff')
        : (_kbTheme&&!_kbTheme.dark?'#000000':'#ffffff');
      const d = {
        id:'e'+(++ec), type:'text',
        x, y, w, h,
        html: safeHtml,
        cs: 'font-size:32px;font-weight:400;color:'+_kbDefColor+';text-align:left;line-height:1.3;',
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

  // 4. Internal element / slide clipboard
  if (typeof _xclipHydrateAll === 'function') _xclipHydrateAll();
  const hasInternal = (typeof clipboard !== 'undefined' && clipboard.length) || elClipboard;
  if (hasInternal && (isSentinel || !hasRealExternalText || window._clipSource === 'elements')) {
    e.preventDefault();
    if (typeof pasteSelected === 'function') pasteSelected();
    return;
  }
  if (typeof hasSlideClipboard === 'function' && hasSlideClipboard() && (isSentinel || !hasRealExternalText || window._clipSource === 'slides')) {
    e.preventDefault();
    const at = typeof slides !== 'undefined' ? slides.length : 0;
    if (typeof pasteSlideAt === 'function') pasteSlideAt(at);
    return;
  }
});
