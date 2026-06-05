// ══════════════ TRANSITIONS ══════════════
(function(){
  const _save       = ()=> typeof save       === 'function' && save();
  const _saveState  = ()=> typeof saveState  === 'function' && saveState();
  const _drawThumbs = ()=> typeof drawThumbs === 'function' && drawThumbs();
  const _pushUndo   = ()=> typeof pushUndo   === 'function' && pushUndo();
  const _toast      = (m,t)=> typeof toast   === 'function' && toast(m,t);
  const _isRu       = ()=> typeof getLang === 'function' ? getLang() === 'ru' : true;

  function _injectTransStyles(){
    let s=document.getElementById('trans-ui-styles');
    if(!s){ s=document.createElement('style'); s.id='trans-ui-styles'; document.head.appendChild(s); }
    s.textContent=[
      '.trans-ribbon-row{display:flex;align-items:stretch;gap:8px;min-width:0;flex:1;}',
      '.trans-vdiv{width:1px;background:var(--border);flex-shrink:0;align-self:stretch;}',
      '.trans-controls{display:flex;flex-direction:column;gap:4px;flex-shrink:0;justify-content:center;}',
      '.trans-btn-grid{display:grid;grid-template-rows:repeat(2,24px);grid-auto-flow:column;grid-auto-columns:minmax(92px,max-content);gap:2px 4px;max-height:52px;overflow-x:auto;overflow-y:hidden;flex-shrink:0;scrollbar-width:thin;}',
      '.trans-btn-grid::-webkit-scrollbar{height:4px;}',
      '.trans-btn-grid::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}',
      '.trans-btn-grid .tbtn2.trans-btn{display:flex;flex-direction:row;align-items:center;justify-content:flex-start;gap:6px;width:100%;height:24px;min-height:24px;max-height:24px;padding:2px 6px;box-sizing:border-box;overflow:hidden;white-space:nowrap;text-align:left;}',
      '.trans-btn-grid .trans-btn-icon{width:14px;height:14px;min-width:14px;min-height:14px;}',
      '.trans-btn-grid .trans-btn-icon svg{width:14px;height:14px;max-width:14px;max-height:14px;display:block;}',
      '.trans-btn-grid .trans-btn-label{font-size:10px;line-height:1.1;text-align:left;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-height:none;-webkit-line-clamp:unset;display:block;}',
      '.slide-trans-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:3px;margin:0 0 4px;}',
      '.slide-trans-grid .tbtn2.trans-btn{display:flex;flex-direction:row;align-items:center;justify-content:flex-start;gap:8px;width:100%;height:34px;min-height:34px;max-height:34px;padding:4px 8px;box-sizing:border-box;overflow:hidden;white-space:normal;text-align:left;font-size:10px;}',
      '.slide-trans-grid .trans-btn-icon{width:20px;height:20px;min-width:20px;min-height:20px;opacity:.9;}',
      '.slide-trans-grid .trans-btn-icon svg{width:20px;height:20px;max-width:20px;max-height:20px;}',
      '.slide-trans-grid .trans-btn-label{font-size:10px;line-height:1.2;text-align:left;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-height:none;-webkit-line-clamp:unset;display:block;}',
      '.trans-btn-icon{display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;}',
      '.trans-hint{flex:1;min-width:100px;font-size:10px;line-height:1.45;color:var(--text2);padding:2px 4px;align-self:center;}',
      '.trans-hint-props{flex:none;max-width:none;min-width:0;margin:0 0 6px;padding:6px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;}',
    ].join('\n');
  }

  function _normIcon(html, size){
    const n=size||16;
    return html.replace(/<svg([^>]*)>/i,(m,attrs)=>{
      let a=attrs.replace(/\s*(width|height)="[^"]*"/gi,'');
      if(!/\bviewBox=/i.test(a)) a+=' viewBox="0 0 24 24"';
      return '<svg'+a+' width="'+n+'" height="'+n+'">';
    });
  }

  const TRANSITION_DEFS = [
    {
      id:'none',
      nameRu:'Нет', nameEn:'None',
      descRu:'Мгновенная смена слайда без анимации.',
      descEn:'Instant slide change with no animation.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="8" y1="8" x2="16" y2="16"/></svg>',
    },
    {
      id:'fade',
      nameRu:'Затухание', nameEn:'Fade',
      descRu:'Плавное перекрёстное затухание: предыдущий слайд исчезает, новый проявляется.',
      descEn:'Smooth crossfade: the current slide fades out as the next fades in.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="6" width="16" height="12" rx="2" opacity=".35"/><rect x="6" y="8" width="16" height="12" rx="2"/></svg>',
    },
    {
      id:'slide',
      nameRu:'Сдвиг', nameEn:'Slide',
      descRu:'Новый слайд выезжает сбоку и сменяет предыдущий.',
      descEn:'The next slide enters from the side, replacing the current one.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="14" height="14" rx="2" opacity=".4"/><rect x="9" y="5" width="14" height="14" rx="2"/><path d="M10 12h8M15 9l3 3-3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      id:'slideUp',
      nameRu:'Сдвиг вверх', nameEn:'Slide Up',
      descRu:'Новый слайд поднимается снизу вверх.',
      descEn:'The next slide rises from the bottom.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2" opacity=".4"/><rect x="5" y="3" width="14" height="10" rx="2"/><path d="M12 16V8M9 11l3-3 3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      id:'zoom',
      nameRu:'Приближение', nameEn:'Zoom In',
      descRu:'Новый слайд увеличивается из центра, как эффект приближения.',
      descEn:'The next slide scales up from the center.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4" stroke-linecap="round"/><path d="M11 8v6M8 11h6" stroke-linecap="round"/></svg>',
    },
    {
      id:'zoomOut',
      nameRu:'Отдаление', nameEn:'Zoom Out',
      descRu:'Новый слайд появляется из увеличенного состояния и уменьшается до нормального размера.',
      descEn:'The next slide appears enlarged and scales down to full size.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4" stroke-linecap="round"/><path d="M8 11h6" stroke-linecap="round"/></svg>',
    },
    {
      id:'flip',
      nameRu:'Переворот', nameEn:'Flip',
      descRu:'Перелистывание как в книге (turn.js): отгибание уголка, градиенты и 3D-объём.',
      descEn:'Book page turn (turn.js): corner curl, gradients, and 3D depth.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16" stroke-dasharray="2 2"/><path d="M8 8c0 4 1.5 8 4 8s4-4 4-8" stroke-linecap="round"/><path d="M6 6l2 2M18 6l-2 2" stroke-linecap="round"/></svg>',
    },
    {
      id:'flipV',
      nameRu:'Переворот ↕', nameEn:'Flip Vertical',
      descRu:'Переворот страницы сверху вниз — как календарь или блокнот с переплётом сверху.',
      descEn:'Vertical page turn — like a calendar or top-bound notebook.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16" stroke-dasharray="2 2"/><path d="M8 8c4 0 8 1.5 8 4s-4 4-8 4" stroke-linecap="round"/><path d="M6 6l2 2M6 18l2-2" stroke-linecap="round"/></svg>',
    },
    {
      id:'cube',
      nameRu:'Куб', nameEn:'Cube',
      descRu:'Поворот грани куба с 3D-перспективой.',
      descEn:'A 3D cube face rotation with perspective.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4l7 4v8l-7 4-7-4V8z"/><path d="M12 4v16M5 8l7 4 7-4" opacity=".55"/></svg>',
    },
    {
      id:'dissolve',
      nameRu:'Растворение', nameEn:'Dissolve',
      descRu:'Пиксельное растворение — дискретное наложение одного слайда на другой.',
      descEn:'Pixel dissolve — a stepped blend between slides.',
      icon:'<svg viewBox="0 0 24 24" fill="currentColor" opacity=".85"><rect x="4" y="5" width="3" height="3" rx=".5" opacity=".35"/><rect x="9" y="5" width="3" height="3" rx=".5" opacity=".55"/><rect x="14" y="5" width="3" height="3" rx=".5"/><rect x="6" y="10" width="3" height="3" rx=".5" opacity=".55"/><rect x="11" y="10" width="3" height="3" rx=".5" opacity=".35"/><rect x="16" y="10" width="3" height="3" rx=".5" opacity=".75"/><rect x="4" y="15" width="3" height="3" rx=".5"/><rect x="9" y="15" width="3" height="3" rx=".5" opacity=".55"/><rect x="14" y="15" width="3" height="3" rx=".5" opacity=".35"/></svg>',
    },
    {
      id:'morph',
      nameRu:'Морфинг', nameEn:'Morph',
      descRu:'Объекты с одинаковым именем плавно перемещаются, масштабируются и поворачиваются между слайдами.',
      descEn:'Objects with the same name smoothly move, scale, and rotate between slides.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="8" width="7" height="7" rx="1.5"/><rect x="13" y="9" width="7" height="7" rx="3.5"/><path d="M11 11.5h2" stroke-linecap="round" stroke-dasharray="1.5 1.5"/></svg>',
    },
    {
      id:'push',
      nameRu:'Выталкивание', nameEn:'Push',
      descRu:'Новый слайд выталкивает предыдущий в сторону.',
      descEn:'The next slide pushes the current slide aside.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="10" height="12" rx="2" opacity=".4"/><rect x="9" y="6" width="12" height="12" rx="2"/><path d="M13 12h5M17 9l3 3-3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      id:'wipe',
      nameRu:'Шторка', nameEn:'Wipe',
      descRu:'Новый слайд открывается шторкой поверх предыдущего.',
      descEn:'The next slide wipes open over the current slide.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="5" width="16" height="14" rx="2" opacity=".35"/><path d="M4 5v14" stroke-width="2.5"/><path d="M8 12h10" stroke-linecap="round"/><path d="M16 9l3 3-3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      id:'split',
      nameRu:'Раскрытие', nameEn:'Split',
      descRu:'Слайд раскрывается из центра — верхняя и нижняя части расходятся.',
      descEn:'The slide opens from the center — top and bottom halves split apart.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="6" rx="1.5"/><rect x="5" y="13" width="14" height="6" rx="1.5"/><path d="M8 12h8" stroke-linecap="round" stroke-dasharray="2 2"/></svg>',
    },
    {
      id:'reveal',
      nameRu:'Занавес', nameEn:'Reveal',
      descRu:'Новый слайд отодвигает предыдущий, как открывающийся занавес.',
      descEn:'The next slide pushes the previous one away like a curtain.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h8v14H4z" opacity=".45"/><path d="M12 5h8v14H12z"/><path d="M12 5v14" stroke-width="2.5"/></svg>',
    },
    {
      id:'glitch',
      nameRu:'Глитч', nameEn:'Glitch',
      descRu:'Цифровые искажения: смещение кадра, вспышки и цветовые артефакты.',
      descEn:'Digital glitch: frame shifts, flashes, and color artifacts.',
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h10M4 17h14" stroke-linecap="round"/><path d="M14 10l3-2M16 14l4 1" stroke-linecap="round" opacity=".7"/></svg>',
    },
  ];

  window.TRANSITION_DEFS = TRANSITION_DEFS;

  function _def(id){
    return TRANSITION_DEFS.find(t=>t.id===id)||TRANSITION_DEFS[0];
  }

  function _label(def){
    return _isRu() ? def.nameRu : def.nameEn;
  }

  function _desc(def){
    return _isRu() ? def.descRu : def.descEn;
  }

  function _makeBtn(def, mode){
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='tbtn2 trans-btn';
    btn.dataset[mode==='global'?'t':'st']=def.id;
    btn.title=_desc(def);
    const iconSize=mode==='global'?14:20;
    btn.innerHTML='<span class="trans-btn-icon">'+_normIcon(def.icon,iconSize)+'</span><span class="trans-btn-label">'+_label(def)+'</span>';
    if(mode==='global'){
      btn.onclick=()=>window.setGlobalTrans(def.id, btn);
    } else {
      btn.onclick=()=>window.setSlideTrans(def.id);
    }
    return btn;
  }

  function updateRibbonTransHint(id){
    const el=document.getElementById('trans-hint');
    if(el) el.textContent=_desc(_def(id||'none'));
  }
  function updateSlideTransHint(id){
    const el=document.getElementById('slide-trans-hint');
    if(el) el.textContent=_desc(_def(id||'none'));
  }
  function updateTransHints(id){ updateSlideTransHint(id); }
  window.updateRibbonTransHint=updateRibbonTransHint;
  window.updateSlideTransHint=updateSlideTransHint;
  window.updateTransHints=updateTransHints;

  window.syncTransDurUI = function(){
    const el = document.getElementById('trans-dur');
    if(!el) return;
    let d = (typeof transitionDur !== 'undefined' && +transitionDur > 0) ? +transitionDur : 500;
    const opts = Array.from(el.options).map(o => +o.value);
    if(!opts.includes(d)) d = 500;
    transitionDur = d;
    el.value = String(d);
  };
  window.setTransitionDur = function(v){
    transitionDur = Math.max(0, +v || 500);
    window.syncTransDurUI();
    if(typeof saveState === 'function') saveState();
  };
  window._effectiveTransDur = function(){
    window.syncTransDurUI();
    return transitionDur;
  };
  window._flipAnimDur = function(ms){
    ms = (+ms > 0) ? +ms : 500;
    return Math.max(1, Math.round(ms * 1.75));
  };

  function buildTransUI(){
    _injectTransStyles();
    if(typeof syncTransDurUI === 'function') syncTransDurUI();
    const ribbonGrid=document.getElementById('trans-btn-grid');
    const propsGrid=document.getElementById('slide-trans-grid');
    if(ribbonGrid){
      ribbonGrid.innerHTML='';
      TRANSITION_DEFS.forEach(def=>ribbonGrid.appendChild(_makeBtn(def,'global')));
    }
    if(propsGrid){
      propsGrid.innerHTML='';
      TRANSITION_DEFS.forEach(def=>propsGrid.appendChild(_makeBtn(def,'slide')));
    }
    const activeGlobal=(typeof globalTrans!=='undefined'&&globalTrans)?globalTrans:'none';
    document.querySelectorAll('#trans-btn-grid .tbtn2[data-t]').forEach(b=>
      b.classList.toggle('active', b.dataset.t===activeGlobal)
    );
    const slideTrans=(typeof slides!=='undefined'&&slides[cur])?(slides[cur].trans||'none'):'none';
    document.querySelectorAll('#slide-trans-grid .tbtn2[data-st]').forEach(b=>
      b.classList.toggle('active', b.dataset.st===slideTrans)
    );
    updateRibbonTransHint(activeGlobal);
    updateSlideTransHint(slideTrans);
  }
  window.buildTransUI=buildTransUI;

  window.setGlobalTrans = function(t, btn){
    try{
      globalTrans = t || 'none';
      document.querySelectorAll('#trans-btn-grid .tbtn2[data-t]').forEach(b=>
        b.classList.toggle('active', btn ? b===btn : b.dataset.t===globalTrans)
      );
      updateRibbonTransHint(globalTrans);
      _saveState();
      Bus && Bus.emit(Bus.EVENTS.TRANS_CHANGED, {global: t});
    }catch(e){ console.warn('[07-transitions] setGlobalTrans:', e.message); }
  };

  window.setSlideTrans = function(t){
    try{
      if(t===''||t==null) t='none';
      if(typeof slides !== 'undefined' && slides[cur]) slides[cur].trans = t;
      document.querySelectorAll('#slide-trans-grid .tbtn2[data-st]').forEach(b=>
        b.classList.toggle('active', b.dataset.st===t)
      );
      updateSlideTransHint(t);
      _saveState();
    }catch(e){ console.warn('[07-transitions] setSlideTrans:', e.message); }
  };

  window.setSlideAuto = function(v){
    try{
      if(typeof slides !== 'undefined' && slides[cur]) slides[cur].auto = v||0;
      _drawThumbs(); _saveState();
    }catch(e){ console.warn('[07-transitions] setSlideAuto:', e.message); }
  };

  window.applyTransToAll = function(){
    try{
      _pushUndo();
      const t   = (typeof globalTrans !== 'undefined' && globalTrans) ? globalTrans : 'none';
      const dur = (typeof transitionDur !== 'undefined') ? transitionDur : 500;
      if(typeof slides !== 'undefined')
        slides.forEach(s=>{ s.trans = t; s.transDur = dur; });
      document.querySelectorAll('#slide-trans-grid .tbtn2[data-st]').forEach(b=>
        b.classList.toggle('active', b.dataset.st === t)
      );
      updateSlideTransHint(t);
      _saveState(); _drawThumbs();
      const name=_label(_def(t));
      _toast(_isRu() ? ('Переход «'+name+'» применён ко всем слайдам') : ('Transition "'+name+'" applied to all slides'), 'ok');
    }catch(e){ console.warn('[07-transitions] applyTransToAll:', e.message); }
  };

  window.applyAutoToAll = function(){
    try{
      const el  = document.getElementById('auto-delay');
      const chk = document.getElementById('auto-adv-chk');
      const v   = el ? +el.value||5 : 5;
      const on  = chk ? chk.checked : false;
      _pushUndo();
      if(typeof slides !== 'undefined') slides.forEach(s=>s.auto = on ? v : 0);
      _saveState(); _drawThumbs();
      _toast((on ? 'Auto '+v+'s' : 'Auto-off')+' applied to all', 'ok');
    }catch(e){ console.warn('[07-transitions] applyAutoToAll:', e.message); }
  };

  window.toggleAutoAdv = function(on){
    try{
      if(!on && typeof slides !== 'undefined'){
        slides.forEach(s=>s.auto=0); _drawThumbs(); _saveState();
      }
    }catch(e){ console.warn('[07-transitions] toggleAutoAdv:', e.message); }
  };

  _injectTransStyles();
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', buildTransUI);
  } else {
    buildTransUI();
  }
})();
