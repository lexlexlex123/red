// ══════════════ PERSIST ══════════════
// save()      — DOM → slides[cur].els  (fast, no I/O)
// saveState() — slides[] → localStorage (I/O, call sparingly)
// commitAll() — save() + saveState()   (full flush, use on mouseup / before F5)

// save()      — DOM → slides[cur].els  (fast, no I/O)
// saveState() — slides[] → localStorage (I/O, call sparingly)
// commitAll() — save() + saveState()   (full flush, use on mouseup / before F5)

function _cleanElForPersist(d){
  if(!d) return d;
  if(d.type==='icon'){
    if(d.iconFitted&&d.svgContent) return d;
    const {svgContent,...rest}=d; return rest;
  }
  if(d.type==='text'&&d.html&&d.html.includes('data-list-bullet')){
    const tmp=document.createElement('div'); tmp.innerHTML=d.html;
    tmp.querySelectorAll('span[data-list-bullet]').forEach(sp=>{
      const iconId=sp.getAttribute('data-icon-id')||'';
      const iconFillOp=sp.getAttribute('data-icon-fill-op');
      const iconStyle=sp.getAttribute('data-icon-style')||'';
      const iconColor=sp.getAttribute('data-icon-color')||'currentColor';
      const iconSw=sp.getAttribute('data-icon-sw')||'1.8';
      sp.innerHTML='';
      sp.setAttribute('data-icon-id',iconId);
      if(iconFillOp!=null&&iconFillOp!=='') sp.setAttribute('data-icon-fill-op',iconFillOp);
      if(iconStyle) sp.setAttribute('data-icon-style',iconStyle);
      sp.setAttribute('data-icon-color',iconColor);
      sp.setAttribute('data-icon-sw',iconSw);
    });
    return {...d, html:tmp.innerHTML};
  }
  if(d.type==='model3d'&&d._mesh){
    const {_mesh,...rest}=d; return rest;
  }
  if(d._isDecor&&d.svgContent){
    const {svgContent,...rest}=d; return rest;
  }
  // График пересобирается из graphExpr — data: PNG в LS не нужен
  if(d.type==='graph'&&d.graphImg&&String(d.graphImg).startsWith('data:')){
    const canRegen=!!(d.graphExpr||d.graphExprs||d.chemKey||d.graphKind);
    if(canRegen){ const {graphImg,...rest}=d; return rest; }
  }
  return d;
}

function _stripHeavySlidesForRetry(slideList){
  return (slideList||[]).map(s=>{
    const out={...s, els:(s.els||[]).map(d=>{
      if(!d) return d;
      if(d.type==='mediavideo'||d.type==='mediaaudio'){
        return Object.assign({},d,{mediaSrc:''});
      }
      if(d.type==='image'){
        const src=String(d.src||'');
        if(d.imageId&&(src.startsWith('data:')||src.startsWith('blob:')||src.length>8000)){
          return Object.assign({},d,{src:''});
        }
        if(!d.imageId&&src.startsWith('data:')&&src.length>8000){
          return Object.assign({},d,{src:'',_imageNeedsHydrate:true});
        }
      }
      if(d.type==='graph'&&d.graphImg&&String(d.graphImg).startsWith('data:')){
        const {graphImg,...rest}=d;
        return rest;
      }
      return d;
    })};
    if(out.bgImg){
      const bg={...out.bgImg};
      delete bg.exportBaked;
      const bsrc=String(bg.src||'');
      if(bg.imageId&&(bsrc.startsWith('data:')||bsrc.startsWith('blob:')||bsrc.length>8000)){
        bg.src='';
      } else if(!bg.imageId&&bsrc.startsWith('data:')&&bsrc.length>8000){
        bg.src='';
        bg._bgNeedsHydrate=true;
      }
      out.bgImg=bg;
    }
    return out;
  });
}

function saveState(){
  const _pn=typeof pnGetSettings==='function'?pnGetSettings():null;
  let slidesClean = slides.map(s=>({
    ...s,
    els: (s.els||[]).map(_cleanElForPersist)
  }));
  if(typeof MediaStore!=='undefined'&&MediaStore.stripSlidesForPersist){
    slidesClean=MediaStore.stripSlidesForPersist(slidesClean);
  }
  const payload={
    slides:slidesClean,cur,ar,canvasW,canvasH,globalTrans,transitionDur,autoDelay,ec,
    appliedThemeIdx,
    selLayout:(typeof selLayout!=='undefined'?selLayout:-1),
    layoutAnimated:(typeof _layoutAnimated!=='undefined'?_layoutAnimated:true),
    decorPausedAt:(typeof _decorPausedAt!=='undefined'&&!_layoutAnimated?Array.from(_decorPausedAt.entries()):[]),
    title:document.getElementById('pres-title').value,
    pnSettings:_pn
  };
  let raw;
  try{ raw=JSON.stringify(payload); }
  catch(e){
    console.warn('saveState stringify failed:',e);
    if(typeof toast==='function') toast(typeof t==='function'?t('toastSaveFailed'):'Не удалось сохранить','err');
    return false;
  }
  try{
    localStorage.setItem('sf_v4',raw);
    try{ localStorage.setItem('sf_v4_ts',String(Date.now())); }catch(_e){}
    return true;
  }catch(e){
    console.warn('saveState failed:',e);
    try{
      payload.slides=_stripHeavySlidesForRetry(payload.slides);
      raw=JSON.stringify(payload);
      localStorage.setItem('sf_v4',raw);
      try{ localStorage.setItem('sf_v4_ts',String(Date.now())); }catch(_e){}
      if(typeof toast==='function') toast('Сохранено; крупные файлы в IndexedDB','ok');
      if(typeof MediaStore!=='undefined'&&MediaStore.migrateSlideImages&&!saveState._migrating){
        saveState._migrating=true;
        Promise.all([
          MediaStore.migrateSlideImages(slides),
          MediaStore.migrateSlideBackgrounds?MediaStore.migrateSlideBackgrounds(slides):0
        ]).then(function(){
          saveState._migrating=false;
          saveState();
        }).catch(function(){ saveState._migrating=false; });
      }
      return true;
    }catch(e2){
      if(typeof MediaStore!=='undefined'&&MediaStore.migrateSlideImages&&!saveState._migrating){
        saveState._migrating=true;
        Promise.all([
          MediaStore.migrateSlideImages(slides),
          MediaStore.migrateSlideBackgrounds?MediaStore.migrateSlideBackgrounds(slides):0
        ]).then(function(){
          saveState._migrating=false;
          saveState();
        }).catch(function(){
          saveState._migrating=false;
          if(typeof toast==='function'){
            const msg=typeof t==='function'?t('toastSaveFailed'):'Не удалось сохранить — хранилище переполнено';
            toast(msg,'err');
          }
        });
        return false;
      }
      if(typeof toast==='function'){
        const msg=typeof t==='function'?t('toastSaveFailed'):'Не удалось сохранить — хранилище переполнено';
        toast(msg,'err');
      }
      return false;
    }
  }
}

// Full commit: flush DOM→data then data→localStorage
let _commitAllTimer=null;
function commitAll(){
  if(typeof window._isPreviewActive==='function'&&window._isPreviewActive())return;
  if(window._pvRestoring)return;
  clearTimeout(_commitAllTimer);
  _commitAllTimer=setTimeout(function(){
    _commitAllTimer=null;
    const finish=function(){
      save();
      drawThumbs();
      saveState();
    };
    if(window._importInProgress||typeof MediaStore==='undefined'||(!MediaStore.migrateSlideImages&&!MediaStore.migrateSlideBackgrounds)){
      finish();
      return;
    }
    Promise.all([
      MediaStore.migrateSlideImages?MediaStore.migrateSlideImages(slides):0,
      MediaStore.migrateSlideBackgrounds?MediaStore.migrateSlideBackgrounds(slides):0
    ]).then(finish).catch(finish);
  },80);
}

/** После импорта: перенести медиа в IDB порциями, затем отрисовать и сохранить. */
async function finalizeImport(opts){
  opts=opts||{};
  window._importInProgress=true;
  try{
    if(slides&&slides.length&&typeof migratePresentationSlideNamesAndLinks==='function'){
      migratePresentationSlideNamesAndLinks();
    }
    if(typeof showLoading==='function'){
      const msg=opts.loadingMsg||(typeof t==='function'?t('importFinishing'):'Завершение импорта…');
      const pct=opts.loadingPct!=null?opts.loadingPct:97;
      showLoading(msg,pct,window._importFileBytes,window._importFileBytes||undefined);
    }
    let _needsMedia=false;
    if(slides&&slides.length){
      outer: for(const s of slides){
        if(s.bgImg&&s.bgImg.src&&!s.bgImg.imageId){
          const bs=String(s.bgImg.src);
          if(bs.startsWith('data:')||bs.startsWith('blob:')){ _needsMedia=true; break; }
        }
        for(const d of (s.els||[])){
          if(!d||d.type!=='image'||!d.src||d.imageId) continue;
          const src=String(d.src);
          if(src.startsWith('data:')||src.startsWith('blob:')){ _needsMedia=true; break outer; }
        }
      }
    }
    if(_needsMedia&&typeof MediaStore!=='undefined'){
      const onImg=function(done,total){
        if(typeof showLoading!=='function'||!total) return;
        showLoading('Изображения '+done+'/'+total+'…', 90+Math.round((done/total)*4), window._importFileBytes, window._importFileBytes||undefined);
      };
      const onBg=function(done,total){
        if(typeof showLoading!=='function'||!total) return;
        showLoading('Фоны '+done+'/'+total+'…', 94, window._importFileBytes, window._importFileBytes||undefined);
      };
      if(MediaStore.migrateSlideImagesYielding){
        await MediaStore.migrateSlideImagesYielding(slides, onImg);
      } else if(MediaStore.migrateSlideImages){
        await MediaStore.migrateSlideImages(slides);
      }
      if(MediaStore.migrateSlideBackgroundsYielding){
        await MediaStore.migrateSlideBackgroundsYielding(slides, onBg);
      } else if(MediaStore.migrateSlideBackgrounds){
        await MediaStore.migrateSlideBackgrounds(slides);
      }
    }
    if(typeof showLoading==='function'){
      showLoading(typeof t==='function'?t('importFinishing'):'Завершение импорта…', 95, window._importFileBytes, window._importFileBytes||undefined);
    }
    if(typeof renderAll==='function') renderAll(Object.assign({thumbs:false},opts.renderOpts||{}));
    if(typeof buildSlideTplGrid==='function') buildSlideTplGrid();
    await new Promise(function(r){ setTimeout(r, 0); });
    if(typeof drawThumbsImportProgress==='function'){
      await drawThumbsImportProgress();
    }else if(typeof scheduleImportThumbs==='function'){
      scheduleImportThumbs();
      await new Promise(function(r){ setTimeout(r, 400); });
    }else if(typeof drawThumbs==='function'){
      drawThumbs(true);
      await new Promise(function(r){ setTimeout(r, 400); });
    }
    if(typeof showLoading==='function'){
      showLoading(typeof t==='function'?t('importFinishing'):'Завершение импорта…', 99, window._importFileBytes, window._importFileBytes||undefined);
    }
    if(typeof saveState==='function') saveState();
    setTimeout(function(){
      try{
        const raw=localStorage.getItem('sf_v4');
        if(raw&&window._idbSave) window._idbSave(raw);
      }catch(e){}
    },100);
    if(typeof toast==='function'&&opts.toast) toast(opts.toast,'ok');
    return true;
  }catch(e){
    console.warn('[finalizeImport]',e);
    if(typeof toast==='function') toast((typeof t==='function'?t('toastSaveFailed'):'Ошибка импорта'),'err');
    return false;
  }finally{
    window._importInProgress=false;
    if(typeof hideLoading==='function') hideLoading();
  }
}
window.finalizeImport=finalizeImport;

function loadState(){
  try{
    const raw=localStorage.getItem('sf_v4');if(!raw)return;
    const _storeBytes=(typeof _bootStorageBytes==='function')?_bootStorageBytes():(raw.length*2);
    if(window._appLoadingBoot&&typeof showLoading==='function'){
      showLoading('Восстановление презентации…',40,_storeBytes,_storeBytes);
    }
    const s=JSON.parse(raw);
    slides=s.slides||[];
    if(typeof migratePresentationSlideNamesAndLinks==='function') migratePresentationSlideNamesAndLinks();
    cur=s.cur||0;
    if(slides.length) cur=Math.max(0,Math.min(cur,slides.length-1));
    else cur=0;
    ar=s.ar||'16:9';
    if(typeof syncAllAppletHtmlFromData==='function') syncAllAppletHtmlFromData();
    canvasW=s.canvasW||1200;canvasH=s.canvasH||(ar==='4:3'?900:675);
    globalTrans=s.globalTrans||'none';transitionDur=s.transitionDur||500;
    if(typeof syncTransDurUI==='function') syncTransDurUI();
    autoDelay=s.autoDelay||5;ec=s.ec||0;
    document.getElementById('canvas').style.width=canvasW+'px';
    document.getElementById('canvas').style.height=canvasH+'px';
    const bgRect=document.getElementById('canvas-bg-rect');
    if(bgRect){bgRect.style.width=canvasW+'px';bgRect.style.height=canvasH+'px';}
    if(typeof _applyCanvasZoom==='function') _applyCanvasZoom();
    if(typeof _syncArBtn==='function') _syncArBtn();
    if(s.title)document.getElementById('pres-title').value=s.title;
    else {
      const te=document.getElementById('pres-title');
      if(te && !te.value.trim() && typeof defaultPresentationTitle==='function') te.value=defaultPresentationTitle();
    }
    if(s.appliedThemeIdx!=null)appliedThemeIdx=s.appliedThemeIdx;
    if(s.selLayout!=null&&typeof selLayout!=='undefined')selLayout=s.selLayout;
    if(s.layoutAnimated!=null){
      if(typeof _layoutAnimated!=='undefined') _layoutAnimated=s.layoutAnimated;
        }
    // Восстанавливаем decorPausedAt только если анимация была выключена
    if(s.decorPausedAt && s.layoutAnimated===false && typeof _decorPausedAt!=='undefined'){
      _decorPausedAt.clear();
      s.decorPausedAt.forEach(function(e){_decorPausedAt.set(e[0],e[1]);});
    }
    if(typeof pnGetSettings==='function'&&s.pnSettings){
      const defaults=pnGetSettings();
      pnSettings=Object.assign({},defaults,s.pnSettings);
    }
    if(slides.length&&!window._appLoadingBoot)toast(t('toastRestored'));
    // Restore media blobs from IndexedDB (localStorage хранит только mediaId / imageId)
    const _afterHydrate=function(){
      if(typeof window._repairMissingImages==='function'){
        window._repairMissingImages().then(function(n){
          if(n>0){
            if(typeof load==='function'){ try{ load(); }catch(e){} }
            if(typeof drawThumbs==='function') drawThumbs(false, 'all');
            if(typeof toast==='function') toast('Восстановлено изображений: '+n,'ok');
            if(typeof saveState==='function') saveState();
          }
        }).catch(function(){});
      }
    };
    if(typeof MediaStore!=='undefined'&&MediaStore.hydrateSlides){
      window._bootHydratePending=!!window._appLoadingBoot;
      if(window._appLoadingBoot&&typeof showLoading==='function'){
        showLoading('Загрузка медиа…',72,_storeBytes,_storeBytes);
      }
      MediaStore.hydrateSlides(slides).then(n=>{
        const bgP=MediaStore.hydrateSlideBackgrounds?MediaStore.hydrateSlideBackgrounds(slides):Promise.resolve(0);
        bgP.then(function(bgN){
        if((n||bgN)&&typeof load==='function'){
          try{ load(); }catch(e){}
          if(typeof drawThumbs==='function') drawThumbs(false, 'all');
        }
        _afterHydrate();
        window._bootHydratePending=false;
        if(typeof _maybeHideBootLoading==='function') _maybeHideBootLoading();
        }).catch(function(){
        _afterHydrate();
        window._bootHydratePending=false;
        if(typeof _maybeHideBootLoading==='function') _maybeHideBootLoading();
        });
      }).catch(function(){
        _afterHydrate();
        window._bootHydratePending=false;
        if(typeof _maybeHideBootLoading==='function') _maybeHideBootLoading();
      });
    } else {
      _afterHydrate();
    }
    // Restore active tab after render completes
    try{
      const savedTab=localStorage.getItem('sf_active_tab')||'home';
      if(savedTab&&savedTab!=='home'){
        setTimeout(()=>{
          const tabBtn=[...document.querySelectorAll('.rtab')].find(b=>{
            const m=(b.getAttribute('onclick')||'').match(/switchTab\('(\w+)'/);
            return m&&m[1]===savedTab;
          });
          if(tabBtn) tabBtn.click();
        }, 200);
      }
    }catch(e){}
  }catch(e){slides=[];}
}

// ══════════════ UTILS ══════════════
window._appLoadingBoot = true;
window._bootMainDone = false;
window._bootHydratePending = false;
window._loadHideTimer = null;

function _formatBytes(n){
  n=+n||0;
  if(n<1024) return Math.round(n)+' Б';
  if(n<1024*1024) return (n/1024).toFixed(n<10*1024?1:0).replace(/\.0$/,'')+' КБ';
  if(n<1024*1024*1024) return (n/(1024*1024)).toFixed(n<10*1024*1024?1:0).replace(/\.0$/,'')+' МБ';
  return (n/(1024*1024*1024)).toFixed(2).replace(/\.00$/,'')+' ГБ';
}
function _bootStorageBytes(){
  try{
    const raw=localStorage.getItem('sf_v4')||'';
    return (typeof Blob!=='undefined')?new Blob([raw]).size:(raw.length*2);
  }catch(e){ return 0; }
}
/** showLoading(msg, pct?, loadedBytes?, totalBytes?) — pct 0..100; bytes optional */
function showLoading(msg,pct,loaded,total){
  const root=document.getElementById('loading');
  if(!root) return;
  if(window._bootEarlyProgressTimer){ clearInterval(window._bootEarlyProgressTimer); window._bootEarlyProgressTimer=null; }
  if(window._loadHideTimer){ clearTimeout(window._loadHideTimer); window._loadHideTimer=null; }
  root.classList.add('show');
  root.setAttribute('aria-busy','true');
  const msgEl=document.getElementById('load-msg');
  if(msgEl&&msg!=null) msgEl.textContent=msg;
  let p=pct;
  if(p===undefined&&loaded!=null&&total>0) p=Math.round((+loaded/+total)*100);
  if(p!==undefined&&isFinite(+p)){
    p=Math.max(0,Math.min(100,+p));
    const bar=document.getElementById('load-bar-inner');
    if(bar) bar.style.width=p+'%';
    const pctEl=document.getElementById('load-pct');
    if(pctEl) pctEl.textContent=Math.round(p)+'%';
    const track=document.getElementById('load-bar');
    if(track) track.setAttribute('aria-valuenow',String(Math.round(p)));
  }
  const sizeEl=document.getElementById('load-size');
  if(sizeEl){
    const hasL=loaded!=null&&isFinite(+loaded);
    const hasT=total!=null&&isFinite(+total)&&+total>0;
    if(hasL&&hasT) sizeEl.textContent=_formatBytes(loaded)+' / '+_formatBytes(total);
    else if(hasT) sizeEl.textContent=_formatBytes(total);
    else if(hasL) sizeEl.textContent=_formatBytes(loaded);
    else if(msg!=null) {/* keep previous size during msg-only updates */}
  }
}
function hideLoading(){
  const bar=document.getElementById('load-bar-inner');
  if(bar) bar.style.width='100%';
  const pctEl=document.getElementById('load-pct');
  if(pctEl) pctEl.textContent='100%';
  const track=document.getElementById('load-bar');
  if(track) track.setAttribute('aria-valuenow','100');
  if(window._loadHideTimer) clearTimeout(window._loadHideTimer);
  window._loadHideTimer=setTimeout(()=>{
    const root=document.getElementById('loading');
    if(root){
      root.classList.remove('show');
      root.setAttribute('aria-busy','false');
    }
    if(bar) bar.style.width='0%';
    if(pctEl) pctEl.textContent='0%';
    const sizeEl=document.getElementById('load-size');
    if(sizeEl) sizeEl.textContent='';
    const msgEl=document.getElementById('load-msg');
    if(msgEl) msgEl.textContent='';
    window._loadHideTimer=null;
  },380);
}
function _maybeHideBootLoading(){
  if(!window._appLoadingBoot) return;
  if(window._bootHydratePending) return;
  if(!window._bootMainDone) return;
  const bytes=_bootStorageBytes();
  showLoading('Готово',100,bytes,bytes||undefined);
  window._appLoadingBoot=false;
  hideLoading();
}
window.showLoading=showLoading;
window.hideLoading=hideLoading;
window._formatBytes=_formatBytes;
window._maybeHideBootLoading=_maybeHideBootLoading;

function dl(content,filename,type){const b=new Blob([content],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=filename;a.click();}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
let toastTimer;
function toast(msg,type){const t=document.getElementById('toast');t.textContent=msg;t.className=(type==='ok'?'show ok':type==='err'?'show err':'show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{t.className='';},3600);}
// ══════════════ SETTINGS & THEME ══════════════
function openSettings(){
  const modal=document.getElementById('settings-modal');modal.classList.add('open');
  const isDark=!document.documentElement.classList.contains('light');
  document.getElementById('theme-dark').classList.toggle('active',isDark);
  document.getElementById('theme-light').classList.toggle('active',!isDark);
  document.getElementById('settings-snap').checked=document.getElementById('snap-chk').checked;
  syncLangButtons();
  const vEl=document.getElementById('settings-version');
  const aEl=document.getElementById('settings-author');
  if(vEl)vEl.textContent=APP_VERSION;
  if(aEl)aEl.textContent=APP_AUTHOR;
  const pwaRow=document.getElementById('settings-pwa-row');
  if(pwaRow){
    const http=location.protocol==='http:'||location.protocol==='https:';
    const standalone=typeof isPwaStandalone==='function'&&isPwaStandalone();
    pwaRow.style.display=(http&&!standalone)?'':'none';
  }
}
function _syncPwaSettingsRow(){
  const pwaRow=document.getElementById('settings-pwa-row');
  if(!pwaRow||!pwaRow.offsetParent&&pwaRow.style.display==='none') return;
  const http=location.protocol==='http:'||location.protocol==='https:';
  const standalone=typeof isPwaStandalone==='function'&&isPwaStandalone();
  pwaRow.style.display=(http&&!standalone)?'':'none';
}
document.addEventListener('pwa-installable',_syncPwaSettingsRow);
function closeSettings(){document.getElementById('settings-modal').classList.remove('open');}
function setTheme(t){
  if(t==='light'){document.documentElement.classList.add('light');}
  else{document.documentElement.classList.remove('light');}
  localStorage.setItem('sf-theme',t);
  document.getElementById('theme-dark').classList.toggle('active',t==='dark');
  document.getElementById('theme-light').classList.toggle('active',t==='light');
  if(typeof drawGrid==='function'){
    requestAnimationFrame(()=>requestAnimationFrame(()=>drawGrid()));
  }
  try{
    const m=document.getElementById('icon-modal');
    if(m&&m.classList.contains('open')&&typeof buildIconCatTabs==='function') buildIconCatTabs();
  }catch(e){}
}
(function(){const t=localStorage.getItem('sf-theme')||'dark';if(t==='light')document.documentElement.classList.add('light');})();
document.getElementById('settings-modal').addEventListener('click',e=>{if(e.target===document.getElementById('settings-modal'))closeSettings();});
