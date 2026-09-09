// ══════════════════════════════════════════════════════════════════
// 33c-autofit.js — Автоподгонка высоты текстовых блоков по содержимому
// ══════════════════════════════════════════════════════════════════

/** Canvas CSS scale (zoom). getBoundingClientRect returns screen px — divide by this. */
function _textMeasureCanvasScale(){
  try{
    if(typeof _canvasZoom==='number' && _canvasZoom>0.01) return _canvasZoom;
  }catch(e){}
  try{
    const canvas=document.getElementById('canvas');
    if(!canvas) return 1;
    const r=canvas.getBoundingClientRect();
    const W=typeof canvasW!=='undefined'?canvasW:1200;
    const s=r.width/Math.max(1,W);
    return (s>0.01 && isFinite(s))?s:1;
  }catch(e){}
  return 1;
}

/** Надёжная высота контента .tel (absolute _text_body ломает height:auto на .el).
 *  Важно: высота .el — в координатах холста (до CSS scale/rotate).
 *  Range.getBoundingClientRect() даёт экранные px и AABB при rotate — нельзя брать как есть. */
function _measureTextContentHeight(el, tel){
  if(!tel) return 0;
  const w = Math.max(1, parseInt(el.style.width, 10) || el.offsetWidth || 200);

  // 1) Offscreen-клон — не зависит от zoom холста и rotate элемента
  try{
    const clone = tel.cloneNode(true);
    clone.removeAttribute('contenteditable');
    clone.style.cssText =
      'position:absolute;left:-99999px;top:0;visibility:hidden;height:auto!important;'
      + 'min-height:0;max-height:none;width:'+w+'px;overflow:visible!important;'
      + 'display:block;box-sizing:border-box;transform:none!important;';
    document.body.appendChild(clone);
    const h = Math.ceil(clone.scrollHeight || clone.offsetHeight || 0);
    document.body.removeChild(clone);
    if(h > 0) return h;
  }catch(e){}

  // 2) In-place scrollHeight (layout px, до CSS transform)
  try{
    const body = el.querySelector('._text_body');
    const prevElH = el.style.height;
    const prevBodyOv = body ? body.style.overflow : '';
    const prevTelOv = tel.style.overflow;
    const prevTransform = el.style.transform;
    el.style.height = 'auto';
    // Временно убрать rotate, иначе scrollHeight всё ещё ок, но на всякий случай
    if(prevTransform) el.style.transform = 'none';
    if(body){
      body.style.position = 'relative';
      body.style.inset = 'auto';
      body.style.height = 'auto';
      body.style.overflow = 'visible';
    }
    tel.style.overflow = 'visible';
    const nat = Math.ceil(tel.scrollHeight || tel.offsetHeight || 0);
    el.style.height = prevElH;
    if(prevTransform) el.style.transform = prevTransform;
    if(body){
      body.style.position = '';
      body.style.inset = '';
      body.style.height = '';
      body.style.overflow = prevBodyOv;
    }
    tel.style.overflow = prevTelOv;
    if(nat > 0) return nat;
  }catch(e){}

  // 3) Range — только если нет поворота; делим на zoom
  try{
    const rot = Math.abs(parseFloat(el.dataset.rot)||0);
    if(rot > 0.5) return 0;
    const root = tel.querySelector('.ec-valign-wrap') || tel;
    if(root && root.childNodes.length){
      const range = document.createRange();
      range.selectNodeContents(root);
      const rect = range.getBoundingClientRect();
      if(rect && rect.height > 1){
        const scale = _textMeasureCanvasScale();
        const cs = window.getComputedStyle(tel);
        const pad = (parseFloat(cs.paddingTop)||0) + (parseFloat(cs.paddingBottom)||0);
        return Math.ceil(rect.height / scale + pad);
      }
    }
  }catch(e){}
  return 0;
}

// Подгоняет высоту одного текстового элемента по DOM
// Вызывается после рендера (mkEl уже создал .tel в DOM)
// opts.shrink — также уменьшать высоту (например после уменьшения font-size всего блока)
function fitTextHeight(d, opts){
  if(window._skipTextAutofit||window._pvRestoring) return false;
  // Не трогать размеры во время рисования / drag — иначе save() зафиксирует ложную высоту
  try{
    if(document.body.classList.contains('draw-mode') && window._anyDragging) return false;
  }catch(e){}
  if(d.type!=='text') return false;
  const el=document.querySelector('.el[data-id="'+d.id+'"]');
  if(!el) return false;
  const tel=el.querySelector('.tel');
  if(!tel) return false;
  const nat=_measureTextContentHeight(el, tel);
  if(nat<=0) return false;
  const newH=nat+4; // запас под underline / stress
  const allowShrink=!!(opts&&opts.shrink);
  // Порог 2px — не раздувать блок из‑за округления / субпикселей
  if(newH>d.h+2 || (allowShrink && newH<d.h-2)){
    d.h=newH;
    el.style.height=newH+'px';
    return true;
  }
  return false;
}

// Подгоняет все тексты текущего слайда
function fitAllTextsOnSlide(){
  if(window._skipTextAutofit||window._pvRestoring) return;
  const s=slides[cur]; if(!s) return;
  let changed=false;
  s.els.forEach(d=>{
    if(d.type==='text' && fitTextHeight(d)) changed=true;
  });
  if(changed){ save(); drawThumbs(); }
}

// Подгоняет тексты на ВСЕХ слайдах (используется после импорта и компоновки)
// Работает через offscreen рендер для неактивных слайдов
function fitAllTextsAllSlides(cb){
  fitTextsOnSlideIndices(null, cb);
}

// indices: array of slide indexes, or null/undefined = all slides
function fitTextsOnSlideIndices(indices, cb){
  const savedCur=cur;
  const list = (indices && indices.length)
    ? [...new Set(indices)].filter(i => i >= 0 && i < slides.length).sort((a,b)=>a-b)
    : slides.map((_, i) => i);
  let pos=0;

  function processNext(){
    if(pos>=list.length){
      if(cur!==savedCur){ cur=savedCur; load(); }
      if(typeof saveState==='function') saveState();
      if(typeof drawThumbs==='function') drawThumbs();
      if(cb) cb();
      return;
    }
    const si=list[pos++];
    cur=si; load();
    requestAnimationFrame(()=>{
      const s=slides[si];
      if(s) s.els.forEach(d=>{ if(d.type==='text') fitTextHeight(d); });
      processNext();
    });
  }
  if(!list.length){
    if(cb) cb();
    return;
  }
  processNext();
}

// Быстрый вариант — только для текущего слайда, без смены cur
window.fitCurrentSlideTexts = function(){
  fitAllTextsOnSlide();
};

// Патчим load() — после каждой загрузки слайда подгоняем высоты
// requestAnimationFrame гарантирует что DOM уже отрисован
(function(){
  const _origLoad = window.load;
  if(typeof _origLoad!=='function') return;
  const _wrappedLoad = function(){
    _origLoad.apply(this, arguments);
    requestAnimationFrame(()=>{
      if(window._skipNextTextAutofit||window._skipTextAutofit||window._pvRestoring){
        window._skipNextTextAutofit=false;
        return;
      }
      fitAllTextsOnSlide();
    });
  };
  window.load = _wrappedLoad;
  // classic script: sync global binding if different from window.load
  try{ if(typeof load==='function') load = _wrappedLoad; }catch(e){}
})();

// После импорта — подгоняем все слайды
(function(){
  // Патчим importHTMLFile
  const _checkImport = ()=>{
    const origImport = window.importHTMLFile;
    const origPPTX   = window.importPPTX;
    if(typeof origImport==='function' && !origImport._fitPatched){
      window.importHTMLFile = function(f){
        origImport.apply(this,arguments);
        // Запускаем fitAll через 800мс — после рендера
        setTimeout(()=>fitAllTextsAllSlides(), 800);
      };
      window.importHTMLFile._fitPatched=true;
    }
    if(typeof origPPTX==='function' && !origPPTX._fitPatched){
      window.importPPTX = function(){
        const r=origPPTX.apply(this,arguments);
        setTimeout(()=>{
          if(window._skipImportAutofit) return;
          fitAllTextsAllSlides();
        }, 1200);
        return r;
      };
      window.importPPTX._fitPatched=true;
    }
  };
  // Пробуем сразу и через секунду (скрипты могут грузиться позже)
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', _checkImport);
  } else {
    setTimeout(_checkImport, 500);
  }
})();

window._fitAllTextsAllSlides = fitAllTextsAllSlides;
window._fitTextsOnSlideIndices = fitTextsOnSlideIndices;
window._fitTextHeight = fitTextHeight;
