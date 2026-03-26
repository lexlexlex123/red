// ══════════════════════════════════════════════════════════════════
// 33c-autofit.js — Автоподгонка высоты текстовых блоков по содержимому
// ══════════════════════════════════════════════════════════════════

// Подгоняет высоту одного текстового элемента по DOM
// Вызывается после рендера (mkEl уже создал .tel в DOM)
function fitTextHeight(d){
  if(d.type!=='text') return false;
  const el=document.querySelector('.el[data-id="'+d.id+'"]');
  if(!el) return false;
  const tel=el.querySelector('.tel');
  if(!tel) return false;
  // Временно снимаем ограничение высоты чтобы измерить
  const prevH=el.style.height;
  el.style.height='auto';
  const nat=tel.scrollHeight||tel.offsetHeight||0;
  el.style.height=prevH;
  if(nat>0 && nat>d.h){
    d.h=nat+2; // +2px запас
    el.style.height=nat+2+'px';
    return true;
  }
  return false;
}

// Подгоняет все тексты текущего слайда
function fitAllTextsOnSlide(){
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
  const savedCur=cur;
  let idx=0;

  function processNext(){
    if(idx>=slides.length){
      // Возвращаемся на исходный слайд
      if(cur!==savedCur){ cur=savedCur; load(); }
      if(typeof saveState==='function') saveState();
      if(typeof drawThumbs==='function') drawThumbs();
      if(cb) cb();
      return;
    }
    const si=idx++;
    cur=si; load();
    // Даём браузеру отрисовать
    requestAnimationFrame(()=>{
      const s=slides[si];
      s.els.forEach(d=>{ if(d.type==='text') fitTextHeight(d); });
      processNext();
    });
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
  window.load = function(){
    _origLoad.apply(this, arguments);
    requestAnimationFrame(()=>{ fitAllTextsOnSlide(); });
  };
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
        setTimeout(()=>fitAllTextsAllSlides(), 1200);
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
window._fitTextHeight = fitTextHeight;
