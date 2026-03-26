// ══════════════════════════════════════════════════════════════════
// 39-improvements.js — Улучшения проекта
// 1. IndexedDB автосохранение с версионированием
// 2. Превью компоновки (3 варианта в модалке)
// 3. Умный импорт — сохранение _origFs
// 4. Панель типографики — быстрые кнопки
// 5. Сетка thirds / golden ratio
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// 1. IndexedDB — надёжное хранилище с историей версий
// ══════════════════════════════════════════════════════════════════
(function(){
  const DB_NAME = 'slides_app';
  const DB_VER  = 1;
  const STORE   = 'snapshots';
  const MAX_SNAP = 20; // максимум снапшотов в истории
  let _db = null;

  function openDB(){
    return new Promise((res, rej)=>{
      if(_db){ res(_db); return; }
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e=>{
        const db = e.target.result;
        if(!db.objectStoreNames.contains(STORE)){
          const s = db.createObjectStore(STORE, {keyPath:'id', autoIncrement:true});
          s.createIndex('ts','ts',{unique:false});
        }
      };
      req.onsuccess = e=>{ _db=e.target.result; res(_db); };
      req.onerror   = e=>rej(e.target.error);
    });
  }

  // Сохраняем снапшот в IDB
  async function idbSave(data){
    try{
      const db = await openDB();
      const tx = db.transaction(STORE,'readwrite');
      const s  = tx.objectStore(STORE);
      // Добавляем новый
      s.add({ts: Date.now(), data});
      // Чистим старые — оставляем MAX_SNAP
      const countReq = s.count();
      countReq.onsuccess = ()=>{
        if(countReq.result > MAX_SNAP){
          const cursorReq = s.openCursor();
          let toDelete = countReq.result - MAX_SNAP;
          cursorReq.onsuccess = e=>{
            const cursor = e.target.result;
            if(cursor && toDelete > 0){ cursor.delete(); toDelete--; cursor.continue(); }
          };
        }
      };
    }catch(e){ console.warn('[IDB] save failed:', e); }
  }

  // Загружаем последний снапшот
  async function idbLoad(){
    try{
      const db = await openDB();
      return new Promise((res)=>{
        const tx  = db.transaction(STORE,'readonly');
        const s   = tx.objectStore(STORE);
        const idx = s.index('ts');
        const req = idx.openCursor(null,'prev'); // последний по времени
        req.onsuccess = e=>{
          const cursor = e.target.result;
          res(cursor ? cursor.value.data : null);
        };
        req.onerror = ()=>res(null);
      });
    }catch(e){ return null; }
  }

  // Список снапшотов для истории
  async function idbList(){
    try{
      const db = await openDB();
      return new Promise((res)=>{
        const tx  = db.transaction(STORE,'readonly');
        const s   = tx.objectStore(STORE);
        const req = s.getAll();
        req.onsuccess = ()=>{
          const all = req.result.sort((a,b)=>b.ts-a.ts);
          res(all);
        };
        req.onerror = ()=>res([]);
      });
    }catch(e){ return []; }
  }

  // Перехватываем saveState — дублируем в IDB + sessionStorage
  const _origSaveState = window.saveState;
  let _idbThrottle = null;
  window.saveState = function(){
    if(typeof _origSaveState === 'function') _origSaveState();
    // Синхронно пишем в sessionStorage с timestamp как надёжный буфер
    try{
      const raw = localStorage.getItem('sf_v4');
      const now = Date.now();
      if(raw){
        sessionStorage.setItem('sf_v4_session', raw);
        sessionStorage.setItem('sf_v4_ts', String(now));
        localStorage.setItem('sf_v4_ts', String(now));
      }
    }catch(e){}
    // IDB — с throttle 2с (для истории версий)
    clearTimeout(_idbThrottle);
    _idbThrottle = setTimeout(()=>{
      try{
        const raw = localStorage.getItem('sf_v4');
        if(raw) idbSave(raw);
      }catch(e){}
    }, 2000);
  };

  // При beforeunload — синхронно в sessionStorage с timestamp
  window.addEventListener('beforeunload', ()=>{
    try{
      const raw = localStorage.getItem('sf_v4');
      const now = Date.now();
      if(raw){
        sessionStorage.setItem('sf_v4_session', raw);
        sessionStorage.setItem('sf_v4_ts', String(now));
        localStorage.setItem('sf_v4_ts', String(now));
        idbSave(raw);
      }
    }catch(e){}
  });

  // Открыть историю версий
  window.openVersionHistory = async function(){
    const list = await idbList();
    if(!list.length){ toast('Нет сохранённых версий'); return; }

    const modal = document.getElementById('version-history-modal');
    if(!modal) return;

    const ul = document.getElementById('version-list');
    ul.innerHTML = '';
    list.forEach((snap, i)=>{
      const dt = new Date(snap.ts);
      const label = dt.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      let slideCount = '';
      try{ const d=JSON.parse(snap.data); slideCount=` (${d.slides?.length||0} сл.)`; }catch(e){}
      const li = document.createElement('li');
      li.className = 'version-item';
      li.innerHTML = `<span>${i===0?'🕐 Последняя: ':''}${label}${slideCount}</span>
        <button onclick="restoreVersion(${snap.id})" class="mbtn-sm">Восстановить</button>`;
      ul.appendChild(li);
    });
    modal.classList.add('open');
  };

  window.closeVersionHistory = function(){
    const m = document.getElementById('version-history-modal');
    if(m) m.classList.remove('open');
  };

  window.restoreVersion = async function(id){
    try{
      const db = await openDB();
      const tx  = db.transaction(STORE,'readonly');
      const s   = tx.objectStore(STORE);
      const req = s.get(id);
      req.onsuccess = ()=>{
        if(!req.result){ toast('Версия не найдена'); return; }
        pushUndo();
        localStorage.setItem('sf_v4', req.result.data);
        if(typeof loadState==='function') loadState();
        if(typeof renderAll==='function') renderAll();
        if(typeof pnApplyAll==='function') requestAnimationFrame(pnApplyAll);
        closeVersionHistory();
        toast('✅ Версия восстановлена');
      };
    }catch(e){ toast('Ошибка восстановления'); }
  };

  // При загрузке: sessionStorage имеет приоритет если содержит timestamp новее
  window.addEventListener('load', async ()=>{
    const lsRaw = localStorage.getItem('sf_v4');
    const ssRaw = sessionStorage.getItem('sf_v4_session');
    const ssTsRaw = sessionStorage.getItem('sf_v4_ts');
    const lsTsRaw = localStorage.getItem('sf_v4_ts');
    const ssTs = ssTsRaw ? +ssTsRaw : 0;
    const lsTs = lsTsRaw ? +lsTsRaw : 0;

    // sessionStorage актуальнее localStorage (импорт и потом F5)
    if(ssRaw && ssTs > lsTs){
      try{
        localStorage.setItem('sf_v4', ssRaw);
        localStorage.setItem('sf_v4_ts', String(ssTs));
        // boot() уже отработал с устаревшим localStorage — перезагружаем данные
        if(typeof loadState==='function') loadState();
        if(typeof renderAll==='function') renderAll();
        if(typeof pnApplyAll==='function') requestAnimationFrame(pnApplyAll);
        toast('📂 Презентация восстановлена');
        return;
      }catch(e){}
    }

    // localStorage пуст — пробуем IDB
    if(!lsRaw){
      const data = await idbLoad();
      if(data){
        localStorage.setItem('sf_v4', data);
        if(typeof loadState==='function') loadState();
        if(typeof renderAll==='function') renderAll();
        if(typeof pnApplyAll==='function') requestAnimationFrame(pnApplyAll);
        toast('📂 Данные восстановлены из резервной копии');
      }
    }
  }, {once:true});

  window._idbSave = idbSave;
  window._idbLoad = idbLoad;

  // Закрытие модалок по Escape
  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape'){
      const vh = document.getElementById('version-history-modal');
      const lp = document.getElementById('layout-preview-modal');
      if(vh && vh.classList.contains('open')){ closeVersionHistory(); e.stopPropagation(); }
      if(lp && lp.classList.contains('open')){ closeLayoutPreview(); e.stopPropagation(); }
    }
  }, true);
})();

// ══════════════════════════════════════════════════════════════════
// 2. Превью компоновки — 3 варианта
// ══════════════════════════════════════════════════════════════════
window.openLayoutPreview = function(){
  const modal = document.getElementById('layout-preview-modal');
  if(!modal) return;

  // Генерируем 3 случайных варианта
  const variants = [];
  const usedThemes = new Set();
  const usedLayouts = new Set();

  for(let i=0;i<3;i++){
    let tIdx, lIdx;
    // Пробуем выбрать уникальные комбинации
    let tries=0;
    do{ tIdx=Math.floor(Math.random()*THEMES.length); tries++; }
    while(usedThemes.has(tIdx) && tries<20);
    usedThemes.add(tIdx);

    tries=0;
    const noDecor = Math.random()<0.3;
    if(!noDecor){
      do{ lIdx=Math.floor(Math.random()*LAYOUTS.length); tries++; }
      while(usedLayouts.has(lIdx) && tries<20);
      usedLayouts.add(lIdx);
    } else { lIdx = -1; }

    variants.push({tIdx, lIdx, align:['center','left','right'][i%3]});
  }

  const container = document.getElementById('layout-preview-variants');
  container.innerHTML = '';

  variants.forEach((v,i)=>{
    const theme = THEMES[v.tIdx];
    const layout = v.lIdx>=0 ? LAYOUTS[v.lIdx] : null;

    // Миниатюрное превью через SVG
    const svgPreview = _makeLayoutPreviewSVG(theme, layout, i);
    const card = document.createElement('div');
    card.className = 'lp-card';
    card.innerHTML = `
      <div class="lp-thumb">${svgPreview}</div>
      <div class="lp-label">${theme.name}</div>
      <div class="lp-sub">${layout ? layout.name||layout.nameEn||'Декор' : 'Без декора'}</div>
      <button class="mbtn" onclick="applyLayoutVariant(${v.tIdx},${v.lIdx},'${v.align}')">Применить</button>`;
    container.appendChild(card);
  });

  modal.classList.add('open');
};

function _makeLayoutPreviewSVG(theme, layout, seed){
  const w=240,h=135;
  const bg = theme.dark
    ? (theme.bg||'#1e1b4b')
    : (theme.bg||'#f8fafc');
  const ac = theme.ac1||'#6366f1';
  // Упрощённый превью слайда
  const solidBg = bg.includes('gradient')
    ? (theme.dark?'#1a1a2e':'#f0f4ff')
    : bg;
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="${solidBg}" rx="6"/>
    <rect x="16" y="14" width="${w*0.55}" height="12" rx="3" fill="${ac}" opacity="0.9"/>
    <rect x="16" y="34" width="${w*0.45}" height="7" rx="2" fill="${ac}" opacity="0.4"/>
    <rect x="16" y="49" width="${w*0.48}" height="6" rx="2" fill="${ac}" opacity="0.25"/>
    <rect x="16" y="59" width="${w*0.38}" height="6" rx="2" fill="${ac}" opacity="0.2"/>
    <rect x="16" y="69" width="${w*0.43}" height="6" rx="2" fill="${ac}" opacity="0.2"/>
    <rect x="${w*0.62}" y="32" width="${w*0.3}" height="${h*0.5}" rx="4" fill="${ac}" opacity="0.18"/>
    <rect x="16" y="${h-22}" width="${w-32}" height="1" fill="${ac}" opacity="0.15"/>
    <rect x="${w*0.62+6}" y="${h-16}" width="40" height="6" rx="2" fill="${ac}" opacity="0.3"/>
  </svg>`;
}

window.closeLayoutPreview = function(){
  const m=document.getElementById('layout-preview-modal');
  if(m) m.classList.remove('open');
};

window.applyLayoutVariant = function(tIdx, lIdx, align){
  closeLayoutPreview();
  pushUndo();

  selTheme=tIdx; applyTheme(); pushUndo();

  if(lIdx>=0 && typeof applyLayout==='function'){
    applyLayout(lIdx,null);
  } else {
    slides.forEach(s=>{s.els=s.els.filter(e=>!e._isDecor);}); selLayout=-1;
  }

  slides.forEach((s,si)=>{ _apSlide(s, si===0, align); });
  renderAll(); commitAll();
  toast('✨ Вариант применён');
};

// ══════════════════════════════════════════════════════════════════
// 3. Сохранение _origFs при импорте — патчим importPPTX/importHTMLFile
// ══════════════════════════════════════════════════════════════════
(function(){
  // После любого импорта проходим по всем элементам и сохраняем оригинальный шрифт
  function stampOrigFs(){
    (slides||[]).forEach(s=>{
      (s.els||[]).forEach(el=>{
        if(el.type!=='text') return;
        if(el._origFs) return; // уже есть
        // Читаем font-size из cs
        const m=(el.cs||'').match(/font-size\s*:\s*(\d+)/i);
        if(m) el._origFs=+m[1];
      });
    });
  }

  // Перехватываем после loadState (импорт HTML)
  const _origLoadState = window.loadState;
  window.loadState = function(){
    if(typeof _origLoadState==='function') _origLoadState.apply(this,arguments);
    setTimeout(stampOrigFs, 100);
  };

  // Патч для importPPTX если он есть
  const _origImportPPTX = window.importPPTX;
  if(typeof _origImportPPTX==='function'){
    window.importPPTX = function(){
      const result=_origImportPPTX.apply(this,arguments);
      setTimeout(stampOrigFs,500);
      return result;
    };
  }

  window._stampOrigFs = stampOrigFs;
})();

// ══════════════════════════════════════════════════════════════════
// 4. Дополнительные кнопки типографики в панели свойств
// ══════════════════════════════════════════════════════════════════
window.applyHeadingStyle = function(){
  if(!sel||sel.dataset.type!=='text') return;
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(!d) return;
  pushUndo();
  // Сброс + стиль заголовка
  if(typeof resetTextFormatting==='function') resetTextFormatting();
  if(typeof setTextRole==='function') setTextRole('heading');
  // Устанавливаем cs
  d.cs=(d.cs||'').replace(/font-size\s*:\s*[^;]+;?/gi,'').replace(/font-weight\s*:\s*[^;]+;?/gi,'');
  d.cs=(d.cs?d.cs.replace(/;$/,'')+';':'')+'font-size:40px;font-weight:700';
  if(typeof renderAll==='function') renderAll();
  if(typeof syncProps==='function') syncProps();
  commitAll();
  toast('Стиль заголовка применён');
};

window.applyBodyStyle = function(){
  if(!sel||sel.dataset.type!=='text') return;
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(!d) return;
  pushUndo();
  if(typeof resetTextFormatting==='function') resetTextFormatting();
  if(typeof setTextRole==='function') setTextRole('body');
  d.cs=(d.cs||'').replace(/font-size\s*:\s*[^;]+;?/gi,'').replace(/font-weight\s*:\s*[^;]+;?/gi,'');
  d.cs=(d.cs?d.cs.replace(/;$/,'')+';':'')+'font-size:28px;font-weight:400';
  if(typeof renderAll==='function') renderAll();
  if(typeof syncProps==='function') syncProps();
  commitAll();
  toast('Стиль основного текста применён');
};

// Применить заголовок/тело ко ВСЕМ текстам слайда
window.applyTypoToSlide = function(role){
  if(!slides[cur]) return;
  pushUndo();
  slides[cur].els.forEach(el=>{
    if(el.type!=='text') return;
    // Простая эвристика: короткий текст → заголовок
    const plain=(el.html||'').replace(/<[^>]+>/g,'').trim();
    const words=plain.split(/\s+/).length;
    const isH=words<=8;
    const fs=isH?40:28;
    el.cs=(el.cs||'').replace(/font-size\s*:\s*[^;]+;?/gi,'').replace(/font-weight\s*:\s*[^;]+;?/gi,'');
    el.cs=(el.cs?el.cs.replace(/;$/,'')+';':'')+'font-size:'+fs+'px;font-weight:'+(isH?'700':'400');
  });
  renderAll(); commitAll();
  toast('Типографика слайда обновлена');
};

// ══════════════════════════════════════════════════════════════════
// 5. Дополнительные направляющие: thirds / golden ratio
// ══════════════════════════════════════════════════════════════════
let _extraGuides = [];
let _extraGuidesMode = 'none'; // 'none' | 'thirds' | 'golden'

window.toggleExtraGuides = function(mode){
  _clearExtraGuides();
  if(_extraGuidesMode === mode){ _extraGuidesMode='none'; _updateGuideBtn(); return; }
  _extraGuidesMode = mode;
  _drawExtraGuides();
  _updateGuideBtn();
};

function _clearExtraGuides(){
  _extraGuides.forEach(g=>g.remove()); _extraGuides=[];
}

function _drawExtraGuides(){
  const cv=document.getElementById('canvas');
  if(!cv) return;
  const W=canvasW, H=canvasH;
  const lines=[];

  if(_extraGuidesMode==='thirds'){
    lines.push({t:'v',pos:W/3},{t:'v',pos:W*2/3});
    lines.push({t:'h',pos:H/3},{t:'h',pos:H*2/3});
  } else if(_extraGuidesMode==='golden'){
    const phi=0.618;
    lines.push({t:'v',pos:W*phi},{t:'v',pos:W*(1-phi)});
    lines.push({t:'h',pos:H*phi},{t:'h',pos:H*(1-phi)});
  }

  lines.forEach(({t,pos})=>{
    const g=document.createElement('div');
    g.className='guide-extra guide '+(t==='h'?'h':'v');
    g.style.cssText=t==='h'
      ?`top:${pos}px;opacity:0.5;border-color:#f59e0b`
      :`left:${pos}px;opacity:0.5;border-color:#f59e0b`;
    cv.appendChild(g); _extraGuides.push(g);
  });
}

function _updateGuideBtn(){
  ['thirds','golden'].forEach(m=>{
    const btn=document.getElementById('guide-btn-'+m);
    if(btn) btn.classList.toggle('active', _extraGuidesMode===m);
  });
}

// Обновляем направляющие при изменении размера канваса
const _origClampEls=window.clampEls;
window.clampEls=function(){
  if(typeof _origClampEls==='function') _origClampEls.apply(this,arguments);
  if(_extraGuidesMode!=='none'){ _clearExtraGuides(); _drawExtraGuides(); }
};
