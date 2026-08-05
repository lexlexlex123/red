// ══════════════ EXPORT ══════════════
function _resolveExportSrc(src){
  if(!src||src.startsWith('data:')||src.startsWith('blob:')) return src;
  try{ return new URL(src, location.href).href; }catch(e){ return src; }
}

function _relImagePath(src){
  const m=String(src).match(/(?:^|\/)images\/[^?#]+/);
  if(m) return m[0].replace(/^\//,'');
  const _reg=(typeof IMAGE_INDEX!=='undefined'?IMAGE_INDEX:(typeof IMAGE_REGISTRY!=='undefined'?IMAGE_REGISTRY:[]));
  if(_reg&&_reg.length){
    const tail=String(src).split('/').pop().split('?')[0];
    const entry=_reg.find(x=>x&&(x.file===tail||x.path===src));
    if(entry){
      if(entry.path) return entry.path;
      if(entry.cat&&entry.file) return 'images/'+entry.cat+'/'+entry.file;
    }
  }
  return null;
}

function _exportBasename(src){
  if(!src||src.startsWith('data:')||src.startsWith('blob:')) return '';
  try{ return decodeURIComponent(String(src).split('/').pop().split('?')[0]||''); }catch(e){
    return String(src).split('/').pop().split('?')[0]||'';
  }
}

function _exportSrcKeys(src){
  const keys=new Set();
  if(!src) return [];
  keys.add(src);
  const abs=_resolveExportSrc(src);
  if(abs) keys.add(abs);
  const rel=_relImagePath(src);
  if(rel){
    keys.add(rel);
    try{ keys.add(new URL(rel, location.href).href); }catch(e){}
  }
  const base=_exportBasename(src);
  if(base) keys.add(base);
  try{
    const u=new URL(src, location.href);
    keys.add(u.pathname);
    const tail=u.pathname.split('/').pop();
    if(tail) keys.add(decodeURIComponent(tail));
  }catch(e){}
  return [...keys];
}

function _exportCacheGetData(cache,src){
  if(!src||!cache) return null;
  for(const k of _exportSrcKeys(src)){
    const v=cache.get(k);
    if(v&&v.startsWith('data:')) return v;
  }
  return null;
}

function _exportCacheSetData(cache,src,dataUrl){
  if(!src||!dataUrl||!dataUrl.startsWith('data:')) return;
  _exportSrcKeys(src).forEach(k=>cache.set(k,dataUrl));
}

function _collectExportImgSrcs(slidesIn){
  const urls=new Set();
  const add=u=>{ _exportSrcKeys(u).forEach(k=>urls.add(k)); };
  (slidesIn||[]).forEach(s=>{
    if(s.bgImg&&s.bgImg.src) add(s.bgImg.src);
    (s.els||[]).forEach(d=>{
      if(d.src) add(d.src);
      if(d.graphImg) add(d.graphImg);
      if(d.mediaSrc) add(d.mediaSrc);
    });
  });
  return [...urls];
}

function _exportGetCache(cache){
  if(cache) return cache;
  if(!window._exportImgDataCache) window._exportImgDataCache=new Map();
  return window._exportImgDataCache;
}

function _exportRememberImg(im,cache){
  if(!im||!im.naturalWidth) return false;
  cache=_exportGetCache(cache);
  if(im.src&&im.src.startsWith('data:')){
    [im.getAttribute('src'),im.src].filter(Boolean).forEach(k=>_exportCacheSetData(cache,k,im.src));
    return true;
  }
  try{
    const c=document.createElement('canvas');
    c.width=im.naturalWidth;c.height=im.naturalHeight;
    c.getContext('2d').drawImage(im,0,0);
    const du=c.toDataURL('image/png');
    [im.getAttribute('src'),im.src].filter(Boolean).forEach(k=>_exportCacheSetData(cache,k,du));
    return true;
  }catch(e){
    return false;
  }
}

function _exportFindDomImg(src){
  const keys=new Set(_exportSrcKeys(src));
  const base=_exportBasename(src);
  for(const im of document.querySelectorAll('img')){
    const a=im.getAttribute('src');
    if((a&&keys.has(a))||keys.has(im.src)) return im;
    for(const k of keys){
      if(k&&(im.src===k||im.src.endsWith('/'+k)||im.src.endsWith(k))) return im;
    }
    if(base){
      const ab=im.getAttribute('src')||'';
      if(ab===base||_exportBasename(ab)===base||_exportBasename(im.src)===base) return im;
    }
  }
  return null;
}

function _exportHarvestFromDom(cache){
  cache=_exportGetCache(cache);
  document.querySelectorAll('img').forEach(im=>{
    if(im.complete&&im.naturalWidth) _exportRememberImg(im,cache);
  });
  const bgCached=window._bgImgLoadCache;
  if(bgCached){
    bgCached.forEach(im=>{
      if(im&&im.complete&&im.naturalWidth) _exportRememberImg(im,cache);
    });
  }
}

function _exportPrefetchTries(src){
  const tries=[];
  const add=u=>{ if(u&&u.startsWith('data:')) return; if(u&&!tries.includes(u)) tries.push(u); };
  const rel=_relImagePath(src);
  if(rel) add(rel);
  add(src);
  if(src&&!src.includes('/')&&!src.includes('://')) add('images/'+src);
  _exportSrcKeys(src).forEach(k=>{
    if(k&&!k.startsWith('blob:')&&(!k.includes('://')||k.startsWith('file:'))) add(k);
  });
  return tries;
}

function _exportPrefetchImage(src,cache){
  if(!src||src.startsWith('data:')) return Promise.resolve();
  cache=_exportGetCache(cache);
  if(_exportCacheGetData(cache,src)) return Promise.resolve();
  if(src.startsWith('blob:')){
    return fetch(src).then(r=>r.blob()).then(b=>_blobToDataUrl(b)).then(du=>{
      _exportCacheSetData(cache,src,du); return du;
    }).catch(()=>{});
  }
  const tries=_exportPrefetchTries(src);
  return new Promise(resolve=>{
    let i=0;
    const next=()=>{
      if(i>=tries.length){ resolve(); return; }
      const im=new Image();
      im.onload=()=>{_exportRememberImg(im,cache);resolve();};
      im.onerror=()=>{ i++; next(); };
      const _tryPath=tries[i++];
      im.src=typeof assetUrl==='function'?assetUrl(_tryPath):_tryPath;
      if(im.complete&&im.naturalWidth){_exportRememberImg(im,cache);resolve();}
    };
    next();
  });
}

function _blobToDataUrl(blob){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onload=()=>res(fr.result);
    fr.onerror=rej;
    fr.readAsDataURL(blob);
  });
}

async function _readLocalImageBlob(path){
  const tries=_exportPrefetchTries(path);
  for(const p of tries){
    const url=typeof assetUrl==='function'?assetUrl(p):p;
    try{
      const r=await fetch(url);
      if(r.ok) return await r.blob();
    }catch(e){}
    try{
      const blob=await new Promise((res,rej)=>{
        const xhr=new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType='blob';
        xhr.onload=()=>{(xhr.status===0||xhr.status===200)?res(xhr.response):rej();};
        xhr.onerror=rej;
        xhr.send();
      });
      if(blob&&blob.size) return blob;
    }catch(e2){}
  }
  return null;
}

async function _urlToDataUrl(url,cache){
  if(!url||url.startsWith('data:')) return url;
  cache=_exportGetCache(cache);
  const hit=_exportCacheGetData(cache,url);
  if(hit) return hit;
  const dom=_exportFindDomImg(url);
  if(dom&&_exportRememberImg(dom,cache)){
    const hit2=_exportCacheGetData(cache,url);
    if(hit2) return hit2;
  }
  if(location.protocol==='file:'){
    const blob=await _readLocalImageBlob(url);
    if(blob){
      const du=await _blobToDataUrl(blob);
      _exportCacheSetData(cache,url,du);
      return du;
    }
    throw new Error('file cache miss');
  }
  const tries=[];
  const add=u=>{ if(u&&!tries.includes(u)) tries.push(u); };
  add(url);
  add(_resolveExportSrc(url));
  const rel=_relImagePath(url);
  if(rel) try{ add(new URL(rel, location.href).href); }catch(e){ add(rel); }
  for(const u of tries){
    try{
      const r=await fetch(u);
      if(r.ok) return _blobToDataUrl(await r.blob());
    }catch(e){}
  }
  throw new Error('cannot inline '+String(url).slice(0,80));
}

window._exportRememberImg=_exportRememberImg;

const _exportInlineInflight=new Map();

async function _inlineExportSrc(src,cache){
  if(!src||src.startsWith('data:')||src.startsWith('blob:')) return src;
  cache=_exportGetCache(cache);
  const cached=_exportCacheGetData(cache,src);
  if(cached) return cached;
  const canon=_exportSrcKeys(src)[0]||src;
  if(_exportInlineInflight.has(canon)) return _exportInlineInflight.get(canon);
  const p=(async()=>{
    try{
      const du=await _urlToDataUrl(src,cache);
      _exportCacheSetData(cache,src,du);
      return du;
    }catch(e){
      return null;
    }finally{
      _exportInlineInflight.delete(canon);
    }
  })();
  _exportInlineInflight.set(canon,p);
  return p;
}

async function _fetchImageAsDataUrl(src,cache){
  if(!src) return null;
  if(src.startsWith('data:')) return src;
  cache=_exportGetCache(cache);
  const hit=_exportCacheGetData(cache,src);
  if(hit) return hit;
  if(src.startsWith('blob:')){
    try{
      const du=await _blobToDataUrl(await fetch(src).then(r=>r.blob()));
      _exportCacheSetData(cache,src,du);
      return du;
    }catch(e){}
  }
  for(const p of _exportPrefetchTries(src)){
    const url=typeof assetUrl==='function'?assetUrl(p):p;
    try{
      const r=await fetch(url);
      if(r.ok){
        const du=await _blobToDataUrl(await r.blob());
        _exportCacheSetData(cache,src,du);
        return du;
      }
    }catch(e){}
  }
  const blob=await _readLocalImageBlob(src);
  if(blob){
    const du=await _blobToDataUrl(blob);
    _exportCacheSetData(cache,src,du);
    return du;
  }
  const dom=_exportFindDomImg(src);
  if(dom&&dom.src&&dom.src.startsWith('data:')){
    _exportCacheSetData(cache,src,dom.src);
    return dom.src;
  }
  if(dom&&_exportRememberImg(dom,cache)){
    return _exportCacheGetData(cache,src);
  }
  return null;
}

async function _ensureExportDataUrl(cache,src){
  if(!src) return src;
  if(src.startsWith('data:')) return src;
  const du=await _fetchImageAsDataUrl(src,cache);
  return du||src;
}

function _exportCopyLiveDataUrls(live,slideOut){
  if(!live||!slideOut) return;
  if(live.bgImg&&live.bgImg.src&&live.bgImg.src.startsWith('data:')){
    if(!slideOut.bgImg) slideOut.bgImg={};
    slideOut.bgImg=Object.assign({},slideOut.bgImg,{src:live.bgImg.src});
  }
  (live.els||[]).forEach(le=>{
    const oe=(slideOut.els||[]).find(e=>e.id===le.id);
    if(!oe) return;
    if(le.src&&le.src.startsWith('data:')) oe.src=le.src;
    if(le.graphImg&&le.graphImg.startsWith('data:')) oe.graphImg=le.graphImg;
    if(le.mediaSrc&&le.mediaSrc.startsWith('data:')) oe.mediaSrc=le.mediaSrc;
  });
}

function _exportCaptureCvbg(){
  const canvas=document.querySelector('#cvbg .cvbg-img-layer canvas');
  if(!canvas||!canvas.width) return null;
  try{ return canvas.toDataURL('image/png'); }catch(e){ return null; }
}

async function _exportWaitBgReady(bgSrc){
  if(!bgSrc) return;
  const cached=window._bgImgLoadCache&&window._bgImgLoadCache.get(bgSrc);
  if(cached&&!cached.complete){
    await new Promise(r=>{ const done=()=>r(); cached.onload=done; cached.onerror=done; });
  }
  await _exportWaitFrame();
  await new Promise(r=>setTimeout(r,60));
}

async function _exportHarvestSlideDom(cache,slideOut){
  if(!slideOut) return;
  cache=_exportGetCache(cache);
  const pending=[];
  document.querySelectorAll('#canvas .el[data-type="image"]').forEach(el=>{
    const id=el.dataset.id;
    const im=el.querySelector('img');
    if(!im||!im.naturalWidth) return;
    const raw=im.getAttribute('src')||im.src||'';
    pending.push((async()=>{
      const du=await _fetchImageAsDataUrl(raw,cache);
      if(!du) return;
      const d=(slideOut.els||[]).find(e=>e.id===id);
      if(d){ d.src=du; _exportCacheSetData(cache,d.src,du); _exportCacheSetData(cache,raw,du); }
    })());
  });
  document.querySelectorAll('#canvas .el[data-type="graph"] img').forEach(el=>{
    const wrap=el.closest('.el[data-id]');
    const id=wrap&&wrap.dataset.id;
    if(!el.naturalWidth||!id) return;
    const raw=el.getAttribute('src')||el.src||'';
    pending.push((async()=>{
      const du=await _fetchImageAsDataUrl(raw,cache);
      if(!du) return;
      const d=(slideOut.els||[]).find(e=>e.id===id);
      if(d){ d.graphImg=du; _exportCacheSetData(cache,d.graphImg,du); _exportCacheSetData(cache,raw,du); }
    })());
  });
  await Promise.all(pending);
  if(slideOut.bgImg&&slideOut.bgImg.src){
    await _exportWaitBgReady(slideOut.bgImg.src);
    const du=await _fetchImageAsDataUrl(slideOut.bgImg.src,cache);
    if(du){
      slideOut.bgImg.src=du;
      _exportCacheSetData(cache,slideOut.bgImg.src,du);
    }
    const snap=_exportCaptureCvbg();
    if(snap) slideOut.bgImg.exportBaked=snap;
  }
  _exportHarvestFromDom(cache);
}

async function _loadExportImg(src,cache){
  const dataUrl=src.startsWith('data:')?src:await _urlToDataUrl(src,cache);
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>res(img);
    img.onerror=()=>rej(new Error('img load failed'));
    img.src=dataUrl;
  });
}

function _exportWaitFrame(){
  return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
}

async function _exportVisitSlide(si){
  if(typeof pickSlide==='function' && si!==cur) pickSlide(si);
  await _exportWaitFrame();
  await new Promise(r=>setTimeout(r,80));
}

async function _bakeSlideBgForExport(bgImg,W,H,cache){
  if(!bgImg||!bgImg.src) return null;
  const src=await _ensureExportDataUrl(cache,bgImg.src);
  if(!src.startsWith('data:')) return null;
  if(typeof drawSlideBgImgOnCanvas!=='function') return null;
  try{
    const img=await _loadExportImg(src,cache);
    const c=document.createElement('canvas');
    c.width=W;c.height=H;
    const baked=JSON.parse(JSON.stringify(bgImg));
    baked.src=src;
    drawSlideBgImgOnCanvas(c.getContext('2d'),baked,W,H,img);
    return c.toDataURL('image/png');
  }catch(e){
    return null;
  }
}

async function _prepareSlidesForExport(slidesIn){
  const liveSlides=slidesIn||[];
  const out=JSON.parse(JSON.stringify(liveSlides));
  const cache=_exportGetCache();
  out.forEach((s,i)=>_exportCopyLiveDataUrls(liveSlides[i],s));
  _exportHarvestFromDom(cache);

  const savedCur=cur;
  for(let si=0;si<out.length;si++){
    await _exportVisitSlide(si);
    await _exportHarvestSlideDom(cache,out[si]);
  }

  const urls=_collectExportImgSrcs(out);
  if(location.protocol==='file:'){
    for(const u of urls) await _exportPrefetchImage(u,cache);
    _exportHarvestFromDom(cache);
  }
  await Promise.all(urls.map(u=>_inlineExportSrc(u,cache)));
  _exportHarvestFromDom(cache);

  const expW=typeof canvasW!=='undefined'?canvasW:1200;
  const expH=typeof canvasH!=='undefined'?canvasH:675;
  let failed=0;

  for(let si=0;si<out.length;si++){
    const s=out[si];
    if(s.bgImg&&s.bgImg.src){
      if(!s.bgImg.exportBaked){
        s.bgImg.src=await _ensureExportDataUrl(cache,s.bgImg.src);
        const baked=await _bakeSlideBgForExport(s.bgImg,expW,expH,cache);
        if(baked) s.bgImg.exportBaked=baked;
      }
      if(s.bgImg.exportBaked){
        delete s.bgImg.src;
      }else if(s.bgImg.src&&s.bgImg.src.startsWith('data:')){
        s.bgImg.exportBaked=s.bgImg.src;
        delete s.bgImg.src;
      }else if(s.bgImg.src){
        failed++;
      }
    }
    for(const d of (s.els||[])){
      if(d.src){
        d.src=await _ensureExportDataUrl(cache,d.src);
        if(!d.src.startsWith('data:')) failed++;
      }
      if(d.graphImg){
        d.graphImg=await _ensureExportDataUrl(cache,d.graphImg);
        if(!d.graphImg.startsWith('data:')) failed++;
      }
      if(d.mediaSrc){
        d.mediaSrc=await _ensureExportDataUrl(cache,d.mediaSrc);
        if(!d.mediaSrc.startsWith('data:')) failed++;
      }
    }
  }

  if(savedCur!==cur&&typeof pickSlide==='function') pickSlide(savedCur);

  if(failed>0&&typeof toast==='function'){
    const hint=location.protocol==='file:'?' — откройте через http://localhost':'';
    toast((typeof t==='function'?t('exportImgFailed'):'Some images were not embedded')+' ('+failed+')'+hint,'warn');
  }
  return out;
}

// ══════════════ EXPORT MENU + PDF / ODP ══════════════
function _exportBaseTitle(){
  const fallback=(typeof defaultPresentationTitle==='function'?defaultPresentationTitle():'Presentation');
  const raw=(document.getElementById('pres-title')?.value||fallback).trim();
  return raw.replace(/[<>:"/\\|?*\x00-\x1f]+/g,'_')||fallback;
}

function _downloadBlob(blob, filename){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function _hideExportMenu(){
  const m=document.getElementById('export-menu');
  if(m) m.style.display='none';
}

window.toggleExportMenu=function(e){
  if(e){e.preventDefault();e.stopPropagation();}
  const m=document.getElementById('export-menu');
  if(!m) return;
  if(m.style.display!=='none'){_hideExportMenu();return;}
  m.style.display='block';
  if(!window._exportMenuWired){
    window._exportMenuWired=true;
    document.addEventListener('mousedown',ev=>{if(!ev.target.closest('#export-wrap'))_hideExportMenu();});
    document.addEventListener('keydown',ev=>{if(ev.key==='Escape')_hideExportMenu();});
  }
};

window.doExport=function(fmt){
  _hideExportMenu();
  if(fmt==='html') exportHTML();
  else if(fmt==='pdf') exportPDF();
  else if(fmt==='odp') exportODP();
};

async function _ensureJSZip(){
  if(window.JSZip) return window.JSZip;
  return new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='libs/jszip.min.js';
    s.onload=()=>res(window.JSZip);
    s.onerror=()=>rej(new Error('JSZip not found'));
    document.head.appendChild(s);
  });
}

async function _ensureSafeDataUrl(cache, src){
  return _fetchImageAsDataUrl(src, cache);
}

function _aliasExportImgCache(imgCache, rawSrc, dataSrc, img){
  if(!imgCache||!img||!img.src||!String(img.src).startsWith('data:')) return;
  if(rawSrc) imgCache[rawSrc]=img;
  if(dataSrc) imgCache[dataSrc]=img;
  if(rawSrc) _exportSrcKeys(rawSrc).forEach(k=>{ if(k) imgCache[k]=img; });
}

async function _svgStringToExportImg(svgStr, cache, imgCache, cacheKey){
  if(!svgStr||!cacheKey||imgCache[cacheKey]) return;
  try{
    const du=await _blobToDataUrl(new Blob([svgStr],{type:'image/svg+xml;charset=utf-8'}));
    const img=await _loadExportImg(du,cache);
    imgCache[cacheKey]=img;
  }catch(e){}
}

async function _preloadSlideVectorEls(s, cache, imgCache, W, H){
  const sx=W/(typeof canvasW!=='undefined'?canvasW:1200);
  const sy=H/(typeof canvasH!=='undefined'?canvasH:675);
  const pending=[];
  (s.els||[]).forEach(d=>{
    if(d._isDecor&&d.svgContent){
      const svg=d.svgContent.trim().startsWith('<svg')
        ? d.svgContent
        : `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${d.svgContent}</svg>`;
      pending.push(_svgStringToExportImg(svg,cache,imgCache,'decor_'+d.id));
    }else if(d.type==='svg'&&d.svgContent){
      const w=Math.max(1,Math.round(d.w*sx)), h=Math.max(1,Math.round(d.h*sy));
      let inner=d.svgContent.trim();
      const sized=inner.replace(/^<svg([^>]*)>/i,(m,attrs)=>{
        const noWH=attrs.replace(/\s*width="[^"]*"/g,'').replace(/\s*height="[^"]*"/g,'');
        return `<svg${noWH} width="${w}" height="${h}">`;
      });
      pending.push(_svgStringToExportImg(sized,cache,imgCache,'svgel_'+d.id+'_'+w+'x'+h));
    }else if(d.type==='icon'){
      const w=Math.max(1,Math.round(d.w*sx)), h=Math.max(1,Math.round(d.h*sy));
      const ic=typeof ICONS!=='undefined'?ICONS.find(e=>e.id===d.iconId):null;
      let svgStr=d.svgContent||'';
      if(ic&&typeof _buildIconSVG==='function'){
        svgStr=_buildIconSVG(ic,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle||'stroke',d.shadow===true||d.shadow==='true',d.shadowBlur,d.shadowColor);
      }
      if(svgStr){
        const svgSized=svgStr.replace(/<svg /,'<svg width="'+w+'" height="'+h+'" ');
        pending.push(_svgStringToExportImg(svgSized,cache,imgCache,'icon_'+d.id));
      }
    }else if(d.type==='formula'&&d.formulaSvg){
      const w=Math.max(1,Math.round(d.w*sx)), h=Math.max(1,Math.round(d.h*sy));
      const color=d.formulaColor||'#ffffff';
      const inner=d.formulaSvg.replace(/currentColor/g,color);
      const svg=inner.trim().startsWith('<svg')
        ? inner.replace(/^<svg/i,`<svg width="${w}" height="${h}"`)
        : `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" color="${color}">${inner}</svg>`;
      pending.push(_svgStringToExportImg(svg,cache,imgCache,'formula_'+d.id));
    }
  });
  await Promise.all(pending);
}

async function _applyInlineImagesToSlide(s, cache){
  if(s.bgImg){
    if(s.bgImg.exportBaked){
      const du=await _fetchImageAsDataUrl(s.bgImg.exportBaked, cache);
      if(du) s.bgImg.exportBaked=du;
    }
    if(s.bgImg.src){
      const du=await _fetchImageAsDataUrl(s.bgImg.src, cache);
      if(du){
        s.bgImg.src=du;
        if(!s.bgImg.exportBaked) s.bgImg.exportBaked=du;
      }
    }
  }
  for(const d of (s.els||[])){
    if(d.src){
      const du=await _fetchImageAsDataUrl(d.src, cache);
      if(du) d.src=du;
    }
    if(d.graphImg){
      const du=await _fetchImageAsDataUrl(d.graphImg, cache);
      if(du) d.graphImg=du;
    }
  }
}

async function _preloadSlideImagesForCanvas(s, cache, imgCache, W, H){
  imgCache=imgCache||{};
  const pending=[];
  function queue(rawSrc){
    if(!rawSrc) return;
    pending.push((async()=>{
      try{
        const dataSrc=rawSrc.startsWith('data:')?rawSrc:await _fetchImageAsDataUrl(rawSrc,cache);
        if(!dataSrc||!dataSrc.startsWith('data:')) return;
        if(imgCache[dataSrc]){_aliasExportImgCache(imgCache,rawSrc,dataSrc,imgCache[dataSrc]);return;}
        const img=await _loadExportImg(dataSrc,cache);
        _aliasExportImgCache(imgCache,rawSrc,dataSrc,img);
      }catch(e){}
    })());
  }
  if(s.bgImg){
    if(s.bgImg.exportBaked) queue(s.bgImg.exportBaked);
    if(s.bgImg.src) queue(s.bgImg.src);
  }
  (s.els||[]).forEach(d=>{
    if(d.src) queue(d.src);
    if(d.graphImg) queue(d.graphImg);
  });
  await Promise.all(pending);
  if(W&&H) await _preloadSlideVectorEls(s,cache,imgCache,W,H);
  return imgCache;
}

function _canvasToJpeg(cnv, quality){
  return new Promise((res,rej)=>{
    try{ cnv.toDataURL('image/jpeg', 0.01); }
    catch(e){ rej(new Error('tainted canvas')); return; }
    cnv.toBlob(b=>{
      if(!b) rej(new Error('canvas'));
      else b.arrayBuffer().then(ab=>res(new Uint8Array(ab)));
    }, 'image/jpeg', quality||0.92);
  });
}

async function _renderSlideToJpeg(s, W, H, cache, quality){
  if(typeof renderThumbCanvas!=='function') throw new Error('renderThumbCanvas missing');
  await _applyInlineImagesToSlide(s, cache);
  const imgCache=await _preloadSlideImagesForCanvas(s, cache, {}, W, H);
  window._canvasExportSession={imgCache,dataCache:_exportGetCache(cache)};
  try{
    const cnv=document.createElement('canvas');
    renderThumbCanvas(cnv,s,-1,W,H);
    return await _canvasToJpeg(cnv, quality);
  }finally{
    window._canvasExportSession=null;
  }
}

function _buildPdfFromJpegs(jpegPages, pageW, pageH){
  const enc=new TextEncoder();
  const chunks=[];
  let byteLen=0;
  function pushStr(s){const b=enc.encode(s);chunks.push(b);byteLen+=b.length;}
  function pushBin(b){chunks.push(b);byteLen+=b.length;}
  pushStr('%PDF-1.4\n');
  const offsets=[0];
  const n=jpegPages.length;
  function startObj(id){offsets[id]=byteLen;pushStr(id+' 0 obj\n');}
  function endObj(){pushStr('endobj\n');}
  startObj(1);
  pushStr('<< /Type /Catalog /Pages 2 0 R >>\n');
  endObj();
  startObj(2);
  const kids=[];
  for(let i=0;i<n;i++) kids.push((3+i*3)+' 0 R');
  pushStr('<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+n+' >>\n');
  endObj();
  for(let i=0;i<n;i++){
    const pObj=3+i*3,cObj=pObj+1,iObj=pObj+2;
    const img=jpegPages[i];
    const content='q '+pageW+' 0 0 '+pageH+' 0 0 cm /Im0 Do Q';
    startObj(pObj);
    pushStr('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pageW+' '+pageH+'] /Resources << /XObject << /Im0 '+iObj+' 0 R >> >> /Contents '+cObj+' 0 R >>\n');
    endObj();
    startObj(cObj);
    pushStr('<< /Length '+content.length+' >>\nstream\n'+content+'\nendstream\n');
    endObj();
    startObj(iObj);
    pushStr('<< /Type /XObject /Subtype /Image /Width '+pageW+' /Height '+pageH+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+img.length+' >>\nstream\n');
    pushBin(img);
    pushStr('\nendstream\n');
    endObj();
  }
  const objCount=2+n*3;
  const xrefPos=byteLen;
  pushStr('xref\n0 '+(objCount+1)+'\n');
  pushStr('0000000000 65535 f \n');
  for(let i=1;i<=objCount;i++){
    pushStr(String(offsets[i]||0).padStart(10,'0')+' 00000 n \n');
  }
  pushStr('trailer\n<< /Size '+(objCount+1)+' /Root 1 0 R >>\nstartxref\n'+xrefPos+'\n%%EOF');
  const out=new Uint8Array(byteLen);
  let off=0;
  for(const c of chunks){out.set(c,off);off+=c.length;}
  return out;
}

function _pxToCm(px){return (px/96*2.54).toFixed(3)+'cm';}

function _buildOdpXml(slideCount, pageW, pageH){
  const w=_pxToCm(pageW), h=_pxToCm(pageH);
  const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const title=esc(_exportBaseTitle());
  let pages='';
  for(let i=0;i<slideCount;i++){
    pages+='<draw:page draw:name="page'+(i+1)+'" draw:style-name="dp1" draw:master-page-name="Default">'
      +'<draw:frame draw:style-name="gr1" draw:name="Slide'+(i+1)+'" svg:width="'+w+'" svg:height="'+h+'" svg:x="0cm" svg:y="0cm">'
      +'<draw:image xlink:href="Pictures/slide'+(i+1)+'.jpg" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>'
      +'</draw:frame></draw:page>';
  }
  return '<?xml version="1.0" encoding="UTF-8"?>'
    +'<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="http://www.w3.org/2000/svg" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" office:version="1.2">'
    +'<office:scripts/><office:font-face-decls/>'
    +'<office:automatic-styles>'
    +'<style:style style:name="dp1" style:family="drawing-page"><style:drawing-page-properties presentation:background-visible="true" draw:fill="none"/></style:style>'
    +'<style:style style:name="gr1" style:family="graphic"><style:graphic-properties style:vertical-pos="top" style:horizontal-pos="left" style:vertical-rel="page" style:horizontal-rel="page"/></style:style>'
    +'</office:automatic-styles>'
    +'<office:body><office:presentation>'+pages+'</office:presentation></office:body>'
    +'</office:document-content>';
}

function _buildOdpStyles(pageW, pageH){
  const w=_pxToCm(pageW), h=_pxToCm(pageH);
  return '<?xml version="1.0" encoding="UTF-8"?>'
    +'<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="http://www.w3.org/2000/svg" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">'
    +'<office:styles><style:default-style style:family="graphic"><style:graphic-properties draw:stroke="none" draw:fill="none"/></style:default-style></office:styles>'
    +'<office:automatic-styles>'
    +'<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="'+w+'" fo:page-height="'+h+'" style:print-orientation="landscape"/></style:page-layout>'
    +'<style:style style:name="Default" style:family="presentation"><style:presentation-page-layout-properties style:page-layout-name="pm1"/></style:style>'
    +'</office:automatic-styles>'
    +'<office:master-styles><draw:layer-set><draw:layer draw:name="layout"/><draw:layer draw:name="background"/><draw:layer draw:name="backgroundobjects"/><draw:layer draw:name="controls"/><draw:layer draw:name="measurelines"/></draw:layer-set>'
    +'<style:master-page style:name="Default" style:page-layout-name="pm1" draw:style-name="Default"/></office:master-styles>'
    +'</office:document-styles>';
}

function _buildOdpMeta(){
  const title=(_exportBaseTitle()||'Presentation').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return '<?xml version="1.0" encoding="UTF-8"?>'
    +'<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.2">'
    +'<office:meta><meta:generator>Слайды</meta:generator><dc:title>'+title+'</dc:title></office:meta></office:document-meta>';
}

function _buildOdpManifest(slideCount){
  let pics='';
  for(let i=0;i<slideCount;i++){
    pics+='<manifest:file-entry manifest:full-path="Pictures/slide'+(i+1)+'.jpg" manifest:media-type="image/jpeg"/>';
  }
  return '<?xml version="1.0" encoding="UTF-8"?>'
    +'<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">'
    +'<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.presentation"/>'
    +'<manifest:file-entry manifest:full-path="mimetype" manifest:media-type="text/plain"/>'
    +'<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>'
    +'<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>'
    +'<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>'
    +'<manifest:file-entry manifest:full-path="META-INF/manifest.xml" manifest:media-type="text/xml"/>'
    +pics
    +'</manifest:manifest>';
}

async function _exportSlidesAsJpegs(exportSlides, onProgress){
  const cache=_exportGetCache();
  const W=typeof canvasW!=='undefined'?canvasW:1200;
  const H=typeof canvasH!=='undefined'?canvasH:675;
  const savedCur=cur;
  const jpegs=[];
  for(let i=0;i<exportSlides.length;i++){
    if(typeof onProgress==='function') onProgress(i, exportSlides.length);
    await _exportVisitSlide(i);
    await _exportHarvestSlideDom(cache, exportSlides[i]);
    jpegs.push(await _renderSlideToJpeg(exportSlides[i], W, H, cache));
  }
  if(savedCur!==cur&&typeof pickSlide==='function') pickSlide(savedCur);
  return {jpegs,W,H};
}

async function exportPDF(){
  save();
  if(!slides||!slides.length){
    if(typeof toast==='function') toast('No slides','err');
    return;
  }
  const title=_exportBaseTitle();
  const msg=typeof t==='function'?t('exportRendering'):'Rendering slides…';
  if(typeof showLoading==='function') showLoading(msg, 5);
  try{
    const exportSlides=await _prepareSlidesForExport(typeof slides!=='undefined'?slides:[]);
    const {jpegs,W,H}=await _exportSlidesAsJpegs(exportSlides,(i,n)=>{
      if(typeof showLoading==='function') showLoading(msg, 10+Math.round((i/n)*80));
    });
    if(typeof showLoading==='function') showLoading(msg, 95);
    const pdf=_buildPdfFromJpegs(jpegs, W, H);
    _downloadBlob(new Blob([pdf],{type:'application/pdf'}), title+'.pdf');
    if(typeof toast==='function') toast((typeof t==='function'?t('exportSaved'):'Saved')+': '+title+'.pdf','ok');
  }catch(e){
    console.error('[exportPDF]',e);
    if(typeof toast==='function') toast('PDF: '+e.message,'err');
  }finally{
    if(typeof hideLoading==='function') hideLoading();
  }
}

async function exportODP(){
  save();
  if(!slides||!slides.length){
    if(typeof toast==='function') toast('No slides','err');
    return;
  }
  const title=_exportBaseTitle();
  const msg=typeof t==='function'?t('exportRendering'):'Rendering slides…';
  if(typeof showLoading==='function') showLoading(msg, 5);
  try{
    const JSZip=await _ensureJSZip();
    const exportSlides=await _prepareSlidesForExport(typeof slides!=='undefined'?slides:[]);
    const {jpegs,W,H}=await _exportSlidesAsJpegs(exportSlides,(i,n)=>{
      if(typeof showLoading==='function') showLoading(msg, 10+Math.round((i/n)*70));
    });
    if(typeof showLoading==='function') showLoading(msg, 85);
    const zip=new JSZip();
    zip.file('mimetype', 'application/vnd.oasis.opendocument.presentation', {compression:'STORE'});
    zip.folder('META-INF').file('manifest.xml', _buildOdpManifest(jpegs.length));
    zip.file('content.xml', _buildOdpXml(jpegs.length, W, H));
    zip.file('styles.xml', _buildOdpStyles(W, H));
    zip.file('meta.xml', _buildOdpMeta());
    const pics=zip.folder('Pictures');
    jpegs.forEach((jpg,i)=>pics.file('slide'+(i+1)+'.jpg', jpg));
    const blob=await zip.generateAsync({type:'blob', mimeType:'application/vnd.oasis.opendocument.presentation'});
    _downloadBlob(blob, title+'.odp');
    if(typeof toast==='function') toast((typeof t==='function'?t('exportSaved'):'Saved')+': '+title+'.odp','ok');
  }catch(e){
    console.error('[exportODP]',e);
    if(typeof toast==='function') toast('ODP: '+e.message,'err');
  }finally{
    if(typeof hideLoading==='function') hideLoading();
  }
}

window.exportPDF=exportPDF;
window.exportODP=exportODP;

async function exportHTML(){
  save();
  // Refresh page numbers on all slides so export includes them
  if(typeof pnGetSettings==='function'&&pnGetSettings().enabled&&typeof pnApplyAll==='function'){
    try{ pnApplyAll(); }catch(e){}
  }
  // Захватываем текущий кадр декора перед экспортом
  if(typeof _layoutAnimated !== 'undefined' && _layoutAnimated && typeof _decorPausedAt !== 'undefined'){
    document.querySelectorAll('.decor-el svg').forEach(function(svg){
      try{
        const _esi = typeof _decorSvgSlideIndex === 'function' ? _decorSvgSlideIndex(svg) : -1;
        if(_esi >= 0) _decorPausedAt.set(_esi, svg.getCurrentTime());
      } catch(e) {}
    });
  }
  
  const title = document.getElementById('pres-title').value || (typeof defaultPresentationTitle==='function'?defaultPresentationTitle():'Presentation');
  
  // Исправленная функция безопасного JSON (экранируем < и >)
  const safeJSON = s => s.replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  const ANIM_CSS_EXPORT = `@keyframes el-fadein{from{opacity:0}to{opacity:1}}@keyframes el-slideup{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}@keyframes el-slidedown{from{opacity:0;transform:translateY(-40px)}to{opacity:1;transform:translateY(0)}}@keyframes el-slideleft{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}@keyframes el-slideright{from{opacity:0;transform:translateX(-60px)}to{opacity:1;transform:translateX(0)}}@keyframes el-zoomin{from{opacity:0;transform:scale(0.4)}to{opacity:1;transform:scale(1)}}@keyframes el-spin{from{opacity:0;transform:rotate(-90deg) scale(0.6)}to{opacity:1;transform:rotate(0) scale(1)}}@keyframes el-bounce{0%{opacity:0;transform:scale(0.3)}60%{transform:scale(1.1)}80%{transform:scale(0.95)}100%{opacity:1;transform:scale(1)}}@keyframes el-fadeout{from{opacity:1}to{opacity:0}}@keyframes el-slideout{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(40px)}}@keyframes el-zoomout{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(1.5)}}@keyframes el-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}@keyframes el-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}@keyframes el-flash{0%,50%,100%{opacity:1}25%,75%{opacity:0}}@keyframes el-swing{0%{transform:rotate(0deg)}15%{transform:rotate(30deg)}35%{transform:rotate(-30deg)}50%{transform:rotate(20deg)}65%{transform:rotate(-20deg)}75%{transform:rotate(10deg)}85%{transform:rotate(-10deg)}92%{transform:rotate(5deg)}97%{transform:rotate(-3deg)}100%{transform:rotate(0deg)}}@keyframes el-dance{0%{transform:scaleX(1) scaleY(1) rotate(0deg)}12%{transform:scaleX(1.12) scaleY(0.82) rotate(-2deg)}28%{transform:scaleX(0.9) scaleY(1.1) rotate(1.5deg)}44%{transform:scaleX(1.1) scaleY(0.85) rotate(-1.5deg)}60%{transform:scaleX(0.92) scaleY(1.08) rotate(2deg)}76%{transform:scaleX(1.06) scaleY(0.9) rotate(-1deg)}90%{transform:scaleX(0.97) scaleY(1.03) rotate(0.5deg)}100%{transform:scaleX(1) scaleY(1) rotate(0deg)}}`;

  const pc1 = ((typeof progColor1 !== 'undefined' ? progColor1 : null) || '#3b82f6').replace(/'/g, "\\'");
  const pc2 = ((typeof progColor2 !== 'undefined' ? progColor2 : null) || '#06b6d4').replace(/'/g, "\\'");

  // Цвета активной темы для диаграмм
  const _activeTheme = (typeof THEMES !== 'undefined' && typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0) ? THEMES[appliedThemeIdx] : null;
  const thAc1Val = (_activeTheme && _activeTheme.ac1) ? _activeTheme.ac1 : '#6366f1';
  const thAc2Val = (_activeTheme && _activeTheme.ac2) ? _activeTheme.ac2 : '#818cf8';
  const thColorsVal = JSON.stringify((_activeTheme && _activeTheme.colors) ? _activeTheme.colors.slice(0,7) : ['#6366f1','#f43f5e','#22d3ee','#f59e0b','#818cf8','#10b981','#fb923c']);
  
  // Исправлены имена переменных (убраны пробелы)
  const titleEsc = esc(title); 
  const arVal = (typeof ar !== 'undefined' ? ar : '16:9');
  const gtVal = (typeof globalTrans !== 'undefined' ? globalTrans : 'none');
  const durEl = document.getElementById('trans-dur');
  if (durEl) transitionDur = +durEl.value || 500;
  else if (typeof transitionDur === 'undefined' || !+transitionDur) transitionDur = 500;
  const tdVal = transitionDur;
  const laVal = (typeof _layoutAnimated !== 'undefined' ? _layoutAnimated : true);
  const dpVal = (typeof _decorPausedAt !== 'undefined' ? JSON.stringify(Array.from(_decorPausedAt.entries())) : '[]');
  const expAutoFs = !(window.CFG_EXPORT && window.CFG_EXPORT.html && window.CFG_EXPORT.html.autoFullscreen === false);
  
  const shapesJSON = safeJSON(JSON.stringify(typeof SHAPES !== 'undefined' ? SHAPES : []));
  const iconsJSON = safeJSON(JSON.stringify(typeof ICONS !== 'undefined' ? ICONS : []));
  const bgsJSON    = safeJSON(JSON.stringify(typeof BGS !== 'undefined' ? BGS : []));

  if(typeof showLoading==='function') showLoading(typeof t==='function'?t('exportEmbedding'):'Embedding images…', 35);
  let exportSlides;
  try{
    exportSlides=await _prepareSlidesForExport(typeof slides!=='undefined'?slides:[]);
  }catch(e){
    console.warn('[export] image embed failed',e);
    exportSlides=typeof slides!=='undefined'?slides:[];
  }
  if(typeof hideLoading==='function') hideLoading();
  const slidesJSON = safeJSON(JSON.stringify(exportSlides));

  async function _exportFetchText(path){
    const esc = s => (s || '').replace(/<\/script/gi, '<\\/script');
    const abs = (typeof assetUrl === 'function') ? assetUrl(path) : path;
    try{
      const r = await fetch(abs);
      if(r.ok) return esc(await r.text());
    }catch(e){}
    try{
      const xhr = new XMLHttpRequest();
      xhr.open('GET', abs, false);
      xhr.send(null);
      if(xhr.status === 0 || xhr.status === 200) return esc(xhr.responseText);
    }catch(e2){}
    const base = path.split('/').pop();
    const scr = Array.from(document.scripts).find(s => s.src && s.src.replace(/\\/g, '/').includes(base));
    if(scr){
      try{
        const xhr2 = new XMLHttpRequest();
        xhr2.open('GET', scr.src, false);
        xhr2.send(null);
        if(xhr2.status === 0 || xhr2.status === 200) return esc(xhr2.responseText);
      }catch(e3){}
    }
    return '';
  }
  const jquerySrc = await _exportFetchText('libs/jquery.min.js');
  const turnSrc = await _exportFetchText('libs/turn.min.js');
  let animEngineSrc = '';
  try {
    let eng = await _exportFetchText('js/10c-anim-engine.js');
    eng = eng.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>');
    animEngineSrc = eng;
  } catch (e) { console.warn('[export] anim engine', e); }
  let alphaHitSrc = '';
  try {
    const rawAlpha = await _exportFetchText('js/13-images.js');
    const aStart = rawAlpha.indexOf('// ── PNG Alpha Hit Testing');
    const aEnd = rawAlpha.indexOf('// ══════════════ STOP TEXT EDITING');
    if (aStart >= 0 && aEnd > aStart) alphaHitSrc = rawAlpha.slice(aStart, aEnd).trim();
  } catch (e) { console.warn('[export] alpha hit', e); }
  if (typeof window.verifyAnimParity === 'function') {
    const pv = window.verifyAnimParity({ silent: true });
    if (!pv.ok) console.warn('[export] anim parity before export:', pv.missing);
  }

  // Embed fonts inline — loaded at page start via fonts/fonts-data.js (static JS, works file:// and HTTP)
  const _fontsCss = window._FONTS_CSS || '';

  // Убедитесь, что шаблонная строка закрыта корректно в конце
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titleEsc}</title>
  ${_fontsCss ? '' : '<link rel="stylesheet" href="fonts/fonts.css">'}
  <style>
    ${_fontsCss}
    ${ANIM_CSS_EXPORT}
    html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000;-webkit-user-select:none;-moz-user-select:none;user-select:none;-webkit-touch-callout:none;}
    body{font-family:sans-serif;}
    #viewport{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#000;-webkit-user-select:none;user-select:none;}
    #stage{position:relative;overflow:hidden;flex-shrink:0;isolation:isolate;-webkit-user-select:none;user-select:none;}
    #sa,#sb{position:absolute;inset:0;overflow:hidden;-webkit-user-select:none;user-select:none;}
    #bp,#bn{position:fixed;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.25);width:46px;height:46px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.2s;z-index:100;backdrop-filter:blur(6px);}
    #bp{left:16px;}#bn{right:16px;}
    #bp:hover,#bn:hover{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.2);color:rgba(255,255,255,.9);}
    #bp:disabled,#bn:disabled{opacity:.2;cursor:default;}
    #bp svg,#bn svg{width:20px;height:20px;}
    #info{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;z-index:100;}
    #ctr{color:rgba(255,255,255,.4);font-size:11px;font-family:monospace;background:rgba(0,0,0,.4);padding:3px 12px;border-radius:12px;backdrop-filter:blur(6px);}
    #aind{font-size:10px;background:rgba(0,0,0,.4);padding:3px 10px;border-radius:12px;backdrop-filter:blur(6px);display:none;color:#22c55e;}
    #aind.on{display:block;}
    #dots{display:flex;gap:5px;background:rgba(0,0,0,.4);padding:5px 10px;border-radius:12px;backdrop-filter:blur(6px);}
    .dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.3);cursor:pointer;transition:.15s;}
    .dot.active{background:#fff;transform:scale(1.3);}
    .dot:hover{background:rgba(255,255,255,.7);}
    .psel{box-sizing:border-box;overflow:hidden;-webkit-user-select:none;user-select:none;cursor:default;}.psel.is-decor{z-index:1!important;}.psel.has-swing,.psel.has-dance,.psel.has-caption,.psel.has-particles{overflow:visible;}.psel.has-particles,.el.has-particles{pointer-events:none;}.psel ._particles_layer,.psel ._particles_layer *,._particles_layer,._particles_layer *,._particle,._particle *,._particle_vis_root,._particle_vis_root *,._particle_vis,._particle_vis *{pointer-events:none!important;cursor:default!important;}.psel .sel-el,.psel .sel-el *,.psel svg,.psel svg *{cursor:default!important;-webkit-user-drag:none;user-drag:none;}.psel img{-webkit-user-drag:none;user-drag:none;}#stage ::selection{background:transparent;}
    #e-turnbook{position:absolute;inset:0;z-index:6;overflow:visible!important;}
    #e-turnbook .p-turn-page,#e-turnbook .turn-page{overflow:hidden!important;background:transparent;}
    #exp-fs-start{display:none;position:fixed;inset:0;z-index:9999;background:#000;align-items:center;justify-content:center;cursor:pointer;flex-direction:column;gap:10px;}
    #exp-fs-start .t1{color:#fff;font-size:17px;font-weight:600;}
    #exp-fs-start .t2{color:rgba(255,255,255,.45);font-size:12px;}
      </style>
</head>
<body>
  ${jquerySrc ? '<script>' + jquerySrc + '<\/script>' : ''}
  ${turnSrc ? '<script>' + turnSrc + '<\/script>' : ''}
  <script type="application/json" id="_sl">${slidesJSON}</script>
  <script type="application/json" id="_bg">${bgsJSON}</script>
  <script type="application/json" id="_sh">${shapesJSON}</script>
  <script type="application/json" id="_ic">${iconsJSON}</script>
  <script>
    // Экспортированный слайд
    var SL = JSON.parse(document.getElementById('_sl').textContent);
    var BG = JSON.parse(document.getElementById('_bg').textContent);
    var SHAPES_DATA = JSON.parse(document.getElementById('_sh').textContent);
    var ICONS_DATA = JSON.parse(document.getElementById('_ic').textContent);
    var W = ${canvasW}, H = ${canvasH};
    var GT = '${gtVal}', TD = ${tdVal};
    var _layoutAnimated = ${laVal};
    var _decorPausedAt = new Map(${dpVal});
    var _expDecorTime = null;
    var progColor1 = '${pc1}', progColor2 = '${pc2}';
    var ar = '${arVal}';
    var CHART_AC1 = '${thAc1Val}', CHART_AC2 = '${thAc2Val}';
    var CHART_COLORS = ${thColorsVal};
    var _expAutoFs = ${expAutoFs};
  <\/script>
  <div id="viewport"><div id="stage">
    <div id="sa"></div>
    <div id="sb"></div>
  </div></div>
  <div id="exp-fs-start"><div class="t1">Показ презентации</div><div class="t2">Нажмите для полноэкранного режима</div></div>
  <button id="bp" onclick="prev()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
  <button id="bn" onclick="next()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>
  <div id="info">
    <div id="aind">&#9654; Auto</div>
    <div id="dots"></div>
    <span id="ctr">1 / 1</span>
  </div>
  <script>
// ── Lego SVG helper ──
function _legoMakeSVGExp(n,tall,base){var U=40,SH=10,FH=12,TH=36,SW=26;var bh=tall?TH:FH,bw=n*U;function blend(hex,r2,g2,b2,t){var h=hex.replace('#','');var r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return '#'+[r,g,b].map(function(v,i){return Math.round(v+([r2,g2,b2][i]-v)*t).toString(16).padStart(2,'0');}).join('');}var stud=blend(base,0,0,0,.20),hl=blend(base,255,255,255,.65),dark=blend(base,0,0,0,.30);var studs='';for(var i=0;i<n;i++){var sx=i*U+(U-SW)/2;studs+='<rect x="'+sx+'" y="0" width="'+SW+'" height="'+SH+'" rx="1" fill="'+stud+'"/><rect x="'+(sx+2)+'" y="1" width="'+(SW-6)+'" height="'+Math.max(2,SH-4)+'" rx="1" fill="'+hl+'" opacity="0.5"/>';}return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+bw+' '+(bh+SH)+'" width="'+bw+'" height="'+(bh+SH)+'" style="display:block;overflow:visible">'+studs+'<rect x="0" y="'+SH+'" width="'+bw+'" height="'+bh+'" rx="1" fill="'+base+'"/><rect x="1" y="'+(SH+1)+'" width="'+(bw-2)+'" height="2" rx="1" fill="'+hl+'" opacity="0.4"/><rect x="0" y="'+(SH+bh-3)+'" width="'+bw+'" height="3" rx="1" fill="'+dark+'" opacity="0.5"/><rect x="0" y="'+(SH)+'" width="2" height="'+(bh)+'" rx="1" fill="'+dark+'" opacity="0.28"/><rect x="'+(bw-2)+'" y="'+(SH)+'" width="2" height="'+(bh)+'" rx="1" fill="'+dark+'" opacity="0.38"/></svg>';}
function _legoMakeSlopeExp(n,dir,base){var U=40,SH=10,FH=12,TH=36,SW=26,bw=n*U,totalH=SH+TH;function blend(hex,r2,g2,b2,t){var h=hex.replace('#','');var r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return '#'+[r,g,b].map(function(v,i){return Math.round(v+([r2,g2,b2][i]-v)*t).toString(16).padStart(2,'0');}).join('');}var stud=blend(base,0,0,0,.20),hl=blend(base,255,255,255,.65),dark=blend(base,0,0,0,.30);var hiIdx=dir==='slope-right'?0:n-1,hiX=hiIdx*U,sx2=hiX+(U-SW)/2;var yBodyTop=SH,yBot=totalH,yLoTop=yBot-FH;var studSvg='<rect x="'+sx2+'" y="0" width="'+SW+'" height="'+SH+'" rx="1" fill="'+stud+'"/><rect x="'+(sx2+2)+'" y="1" width="'+(SW-6)+'" height="'+Math.max(2,SH-4)+'" rx="1" fill="'+hl+'" opacity="0.5"/>';var hiBlock='<rect x="'+hiX+'" y="'+yBodyTop+'" width="'+U+'" height="'+TH+'" rx="1" fill="'+base+'"/><rect x="'+(hiX+1)+'" y="'+(yBodyTop+1)+'" width="'+(U-2)+'" height="2" fill="'+hl+'" opacity="0.4"/>';var slopePts,blikPts;if(dir==='slope-right'){slopePts=U+','+yBodyTop+' '+bw+','+yLoTop+' '+bw+','+yBot+' '+U+','+yBot;blikPts=U+','+yBodyTop+' '+bw+','+yLoTop+' '+bw+','+(yLoTop+2)+' '+U+','+(yBodyTop+2);}else{slopePts='0,'+yLoTop+' '+((n-1)*U)+','+yBodyTop+' '+((n-1)*U)+','+yBot+' 0,'+yBot;blikPts='0,'+yLoTop+' '+((n-1)*U)+','+yBodyTop+' '+((n-1)*U)+','+(yBodyTop+2)+' 0,'+(yLoTop+2);}var sideL=dir==='slope-right'?'<rect x="0" y="'+yBodyTop+'" width="2" height="'+TH+'" fill="'+dark+'" opacity="0.28"/>':'<rect x="0" y="'+yLoTop+'" width="2" height="'+FH+'" fill="'+dark+'" opacity="0.28"/>';var sideR=dir==='slope-right'?'<rect x="'+(bw-2)+'" y="'+yLoTop+'" width="2" height="'+FH+'" fill="'+dark+'" opacity="0.38"/>':'<rect x="'+(bw-2)+'" y="'+yBodyTop+'" width="2" height="'+TH+'" fill="'+dark+'" opacity="0.38"/>';var shadow='<rect x="0" y="'+(yBot-3)+'" width="'+bw+'" height="3" fill="'+dark+'" opacity="0.5"/>';return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+bw+' '+totalH+'" width="'+bw+'" height="'+totalH+'" style="display:block;overflow:hidden">'+studSvg+hiBlock+'<polygon points="'+slopePts+'" fill="'+base+'"/><polygon points="'+blikPts+'" fill="'+hl+'" opacity="0.4"/>'+shadow+sideL+sideR+'</svg>';}
function _legoMakeStairExp(base,dir){var U=40,SH=10,FH=12,TH=36,SW=26,bw=2*U,totalH=SH+TH;function blend(hex,r2,g2,b2,t){var h=hex.replace('#','');var r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return '#'+[r,g,b].map(function(v,i){return Math.round(v+([r2,g2,b2][i]-v)*t).toString(16).padStart(2,'0');}).join('');}var stud=blend(base,0,0,0,.20),hl=blend(base,255,255,255,.65),dark=blend(base,0,0,0,.30);var yTop=SH,yBot=totalH,yVert=yTop+FH;var studs='';for(var i=0;i<2;i++){var sx2=i*U+(U-SW)/2;studs+='<rect x="'+sx2+'" y="0" width="'+SW+'" height="'+SH+'" rx="1" fill="'+stud+'"/><rect x="'+(sx2+2)+'" y="1" width="'+(SW-6)+'" height="'+Math.max(2,SH-4)+'" rx="1" fill="'+hl+'" opacity="0.5"/>';}var bodyPts=dir==='right'?'0,'+yTop+' '+bw+','+yTop+' '+bw+','+yVert+' '+U+','+yBot+' 0,'+yBot:'0,'+yTop+' '+bw+','+yTop+' '+bw+','+yBot+' '+U+','+yBot+' 0,'+yVert;var body='<polygon points="'+bodyPts+'" fill="'+base+'"/>';var topBlik='<rect x="0" y="'+yTop+'" width="'+bw+'" height="2" fill="'+hl+'" opacity="0.4"/>';var blik=dir==='right'?'<polygon points="'+bw+','+yVert+' '+U+','+yBot+' '+U+','+(yBot+2)+' '+bw+','+(yVert+2)+'" fill="'+hl+'" opacity="0.25"/>':'<polygon points="0,'+yVert+' '+U+','+yBot+' '+U+','+(yBot+2)+' 0,'+(yVert+2)+'" fill="'+hl+'" opacity="0.25"/>';var shadow='<rect x="'+(dir==="right"?0:U)+'" y="'+(yBot-3)+'" width="'+U+'" height="3" fill="'+dark+'" opacity="0.5"/>';var sideVert='';return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+bw+' '+totalH+'" width="'+bw+'" height="'+totalH+'" style="display:block;overflow:hidden">'+studs+body+topBlik+blik+shadow+sideVert+'</svg>';}
// ── Chart helper functions (from 31-table.js) ──
function _escHTML(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ══ RESIZE OBSERVER — re-render on size change ══
function _tblAttachResizeObs(el, d){
  if(el._tblRO) el._tblRO.disconnect();
  const ro=new ResizeObserver(()=>{
    const nw=parseInt(el.style.width), nh=parseInt(el.style.height);
    if(nw&&nh&&(nw!==d.w||nh!==d.h)){d.w=nw;d.h=nh;renderTableEl(el,d);}
  });
  ro.observe(el);
  el._tblRO=ro;
}

// ══════════════════════════════════════════════════════════════════
// CHART RENDERING  (bar | pie | line | donut | horizontalBar)
// ══════════════════════════════════════════════════════════════════

// Palette for series / slices — uses theme accent colours + fallbacks
function _chartPalette(n, ac1, ac2) {
  // Use theme colors[] array if available — first 7 accent colors of current scheme
  let base;
  if (typeof CHART_COLORS !== 'undefined' && Array.isArray(CHART_COLORS) && CHART_COLORS.length >= 7) {
    base = CHART_COLORS.slice(0, 7);
  }
  if (!base) {
    base = [ac1||'#6366f1','#f43f5e','#22d3ee','#f59e0b',ac2||'#818cf8','#10b981','#fb923c'];
  }
  const out = [];
  const len = base.length; // 7
  if (n <= 2) {
    // For 2 slices/series: use index 0 and 3 (maximally distant in palette)
    const picks = [0, 3, 1, 4, 2, 5, 6];
    for (let i = 0; i < n; i++) out.push(base[picks[i % picks.length]]);
  } else if (n <= 4) {
    // Spread evenly: 0, 2, 4, 6
    const step = Math.floor(len / n);
    for (let i = 0; i < n; i++) out.push(base[(i * step) % len]);
  } else {
    for (let i = 0; i < n; i++) out.push(base[i % len]);
  }
  return out;
}

// Parse plain-text cell content to a number (strip HTML tags)
function _cellNum(html) {
  const t = (html || '').replace(/<[^>]*>/g, '').replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

// Extract chart data from table data object d
// Returns { series:[{label,values:[]}], categories:[], hasHeader }
function _chartExtract(d) {
  const legendOnRow = (d.chartLegend || 'row') === 'row'; // first ROW = series labels
  const rows = d.rows, cols = d.cols;
  const cells = d.cells;
  const get = (r, c) => cells[r * cols + c] ? (cells[r * cols + c].html || '') : '';
  const getNum = (r, c) => _cellNum(get(r, c));

  if (legendOnRow) {
    // First row = series labels, first col = category labels (optional)
    const hasHeader = d.headerRow !== false;
    const dataStartR = hasHeader ? 1 : 0;
    const dataStartC = 1; // first col = categories
    const categories = [];
    for (let r = dataStartR; r < rows; r++) categories.push(get(r, 0).replace(/<[^>]*>/g, '') || ('R' + r));
    const series = [];
    for (let c = dataStartC; c < cols; c++) {
      const label = hasHeader ? get(0, c).replace(/<[^>]*>/g, '') : ('S' + c);
      const values = [];
      for (let r = dataStartR; r < rows; r++) values.push(getNum(r, c));
      series.push({ label, values });
    }
    return { series, categories, legendOnRow };
  } else {
    // First col = series labels, first row = category labels (optional)
    const hasHeader = d.headerRow !== false;
    const dataStartC = hasHeader ? 1 : 0;
    const dataStartR = 1; // first row = categories
    const categories = [];
    for (let c = dataStartC; c < cols; c++) categories.push(get(0, c).replace(/<[^>]*>/g, '') || ('C' + c));
    const series = [];
    for (let r = dataStartR; r < rows; r++) {
      const label = get(r, 0).replace(/<[^>]*>/g, '') || ('S' + r);
      const values = [];
      for (let c = dataStartC; c < cols; c++) values.push(getNum(r, c));
      series.push({ label, values });
    }
    return { series, categories, legendOnRow };
  }
}

// Format label string based on chartLabels setting
function _fmtLabel(val, total, mode) {
  if (!mode || mode === 'none' || val === null) return '';
  const num = (typeof val === 'number') ? val : 0;
  const pct = total > 0 ? ((num / total) * 100).toFixed(1) + '%' : '';
  const numStr = Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, '');
  if (mode === 'value')   return numStr;
  if (mode === 'percent') return pct;
  if (mode === 'both')    return (numStr) + ' (' + (pct) + ')';
  return '';
}

// Build SVG string for chart
function _chartLegendSvg(series, palette, textCol, fs, W, H, pos) {
  // Scale legend proportionally to diagram size
  const scale = Math.max(0.5, Math.min(2, W / 400));
  const sqSize = Math.round(10 * scale);
  const lgFs = Math.max(8, Math.min(18, fs * scale));
  const lgItemW = Math.min(Math.round(110 * scale), (W - 20) / Math.max(series.length, 1));
  const lgH = Math.round(20 * scale);
  const gap = sqSize + 4;
  let svg = '';
  if (!pos || pos === 'bottom-left' || pos === 'bottom-center' || pos === 'bottom-right') {
    const y = H - lgH;
    const totalW = series.length * lgItemW;
    const startX = pos === 'bottom-right' ? W - totalW - 4
                 : pos === 'bottom-center' ? (W - totalW) / 2
                 : 6;
    series.forEach((s, i) => {
      const lx = startX + i * lgItemW;
      svg += '<rect x="' + (lx.toFixed(1)) + '" y="' + ((y + (lgH - sqSize)/2).toFixed(1)) + '" width="' + (sqSize) + '" height="' + (sqSize) + '" rx="' + (Math.round(sqSize*0.2)) + '" fill="' + (palette[i]) + '"/>';
      svg += '<text x="' + ((lx + gap).toFixed(1)) + '" y="' + ((y + lgH/2).toFixed(1)) + '" font-size="' + (lgFs) + '" fill="' + (textCol) + '" font-family="sans-serif" dominant-baseline="middle">' + (_escHTML(s.label)) + '</text>';
    });
  } else if (pos === 'left' || pos === 'right') {
    const itemH = Math.min(Math.round(26 * scale), (H - 20) / Math.max(series.length, 1));
    const startY = (H - series.length * itemH) / 2;
    const sideW = Math.round(110 * scale);
    const x = pos === 'left' ? 4 : W - sideW;
    series.forEach((s, i) => {
      const ly = startY + i * itemH + itemH / 2;
      svg += '<rect x="' + (x) + '" y="' + ((ly - sqSize/2).toFixed(1)) + '" width="' + (sqSize) + '" height="' + (sqSize) + '" rx="' + (Math.round(sqSize*0.2)) + '" fill="' + (palette[i]) + '"/>';
      svg += '<text x="' + ((x + gap).toFixed(1)) + '" y="' + (ly.toFixed(1)) + '" font-size="' + (lgFs) + '" fill="' + (textCol) + '" font-family="sans-serif" dominant-baseline="middle">' + (_escHTML(s.label)) + '</text>';
    });
  }
  return svg;
}

function _chartBgSvg(d, W, H) {
  // Background rect + border for chart
  const bg = d.chartBg || '';
  const op = d.chartBgOp != null ? +d.chartBgOp : 1;
  const blur = d.chartBgBlur || 0;
  const stroke = d.chartStroke || '';
  const sw = d.chartSw != null ? +d.chartSw : 0;
  const rx = d.chartRx || 0;
  if (!bg && !sw) return { defs: '', bg: '' };
  let defs = '';
  let bgSvg = '';
  if (blur > 0) {
    const fid = 'cbf_' + (d.id || 'x');
    defs = '<filter id="' + (fid) + '" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="' + (blur) + '"/></filter>';
    bgSvg += '<rect x="0" y="0" width="' + (W) + '" height="' + (H) + '" rx="' + (rx) + '" filter="url(#' + (fid) + ')" fill="' + (bg||'transparent') + '" fill-opacity="' + (op) + '"/>';
  } else if (bg) {
    bgSvg += '<rect x="0" y="0" width="' + (W) + '" height="' + (H) + '" rx="' + (rx) + '" fill="' + (bg) + '" fill-opacity="' + (op) + '"/>';
  }
  // Border is drawn via CSS outline on .chart-wrap — not in SVG to avoid duplication
  return { defs, bg: bgSvg };
}

function _buildChartSvg(d) {
  const W = d.w || 600, H = d.h || 400;
  const type = d.chartType || 'bar';
  const labelMode = d.chartLabels || 'none';
  const { series, categories } = _chartExtract(d);
  if (!series.length) return '<svg viewBox="0 0 ' + (W) + ' ' + (H) + '" xmlns="http://www.w3.org/2000/svg"><text x="' + (W/2) + '" y="' + (H/2) + '" text-anchor="middle" fill="#888" font-size="14">Нет данных</text></svg>';

  const th = {};
  const _cac1=(typeof CHART_AC1!=='undefined'&&CHART_AC1)?CHART_AC1:null;
  const _cac2=(typeof CHART_AC2!=='undefined'&&CHART_AC2)?CHART_AC2:null;
  const palette=_chartPalette(series.length,_cac1,_cac2);
  const textCol = d.textColor || '#ffffff';
  const fs = Math.max(9, Math.min(14, (d.fs || 13) * 0.85));
  const lblColor = d.chartLabelColor || textCol;
  const lblFs = d.chartLabelFs ? +d.chartLabelFs : Math.max(8, fs - 1);
  const lgPos = d.chartLegendPos || 'bottom-left';

  // Reserve space based on legend position
  const lgReserveBottom = (!lgPos || lgPos.startsWith('bottom')) ? 22 : 0;
  const lgReserveSide   = (lgPos === 'left' || lgPos === 'right') ? 114 : 0;

  const legendSvg = _chartLegendSvg(series, palette, textCol, fs, W, H, lgPos);
  const { defs: bgDefs, bg: bgSvg } = _chartBgSvg(d, W, H);

  const plotY = 28; // space above plot for labels above tallest bar
  const plotH = H - lgReserveBottom - 28 - 20;
  const plotX = (lgPos === 'left' ? lgReserveSide : 0) + 40;
  const plotW = W - plotX - (lgPos === 'right' ? lgReserveSide : 0) - 10;

  if (type === 'pie' || type === 'donut' || type === 'explodedPie' || type === 'explodedDonut') {
    return _buildPieChart(d, W, H, series, palette, textCol, fs, labelMode,
      type === 'donut' || type === 'explodedDonut',
      legendSvg, bgDefs, bgSvg, lblColor, lblFs,
      type === 'explodedPie' || type === 'explodedDonut');
  }
  if (type === 'line') {
    return _buildLineChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg, bgDefs, bgSvg, lblColor, lblFs);
  }
  if (type === 'horizontalBar') {
    return _buildHBarChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg, bgDefs, bgSvg, lblColor, lblFs);
  }
  // default: bar
  return _buildBarChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg, bgDefs, bgSvg, lblColor, lblFs);
}

function _buildBarChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg, bgDefs, bgSvg, lblColor, lblFs) {
  bgDefs = bgDefs||""; bgSvg = bgSvg||""; lblColor = lblColor||textCol; lblFs = lblFs||(Math.max(8,fs-1));
  const catCount = categories.length || 1;
  const serCount = series.length;
  const groupW = plotW / catCount;
  const barW = Math.max(4, groupW / (serCount + 1));
  const gap = (groupW - barW * serCount) / 2;

  // Find max value for scale
  let maxVal = 0;
  series.forEach(s => s.values.forEach(v => { if (v !== null && v > maxVal) maxVal = v; }));
  if (maxVal === 0) maxVal = 1;

  // Y gridlines
  const gridLines = 5;
  let gridSvg = '';
  for (let i = 0; i <= gridLines; i++) {
    const gy = plotY + plotH - (i / gridLines) * plotH;
    const val = (maxVal * i / gridLines);
    const valStr = Number.isInteger(val) ? val : val.toFixed(1);
    gridSvg += '<line x1="' + (plotX) + '" y1="' + (gy) + '" x2="' + (plotX + plotW) + '" y2="' + (gy) + '" stroke="' + (textCol) + '22" stroke-width="1"/>';
    gridSvg += '<text x="' + (plotX - 4) + '" y="' + (gy) + '" text-anchor="end" dominant-baseline="middle" font-size="' + (fs - 1) + '" fill="' + (textCol) + '88" font-family="sans-serif">' + (valStr) + '</text>';
  }

  // Bars + labels
  let barsSvg = '';
  const totalPerCat = categories.map((_, ci) => series.reduce((s, sr) => s + (sr.values[ci] || 0), 0));
  series.forEach((s, si) => {
    categories.forEach((cat, ci) => {
      const val = s.values[ci];
      if (val === null) return;
      const bh = Math.max(2, (val / maxVal) * plotH);
      const bx = plotX + ci * groupW + gap + si * barW;
      const by = plotY + plotH - bh;
      barsSvg += '<rect x="' + (bx.toFixed(1)) + '" y="' + (by.toFixed(1)) + '" width="' + (barW.toFixed(1)) + '" height="' + (bh.toFixed(1)) + '" rx="2" fill="' + (palette[si]) + '"/>';
      const lbl = _fmtLabel(val, totalPerCat[ci], labelMode);
      if (lbl) {
        const offset = d.chartLabelOffset != null ? +d.chartLabelOffset : 0;
        const inside = offset === 0 ? (bh > fs * 1.8) : (offset < 0);
        const lblYRaw = inside ? (by + bh/2) : (by - 4 - offset);
        const lblY = lblYRaw; // no clamp — SVG overflow:visible allows labels outside plot
        const lblFill = inside ? '#fff' : lblColor;
        barsSvg += '<text x="' + ((bx + barW/2).toFixed(1)) + '" y="' + (lblY.toFixed(1)) + '" text-anchor="middle" dominant-baseline="' + (inside ? 'middle' : 'auto') + '" font-size="' + (lblFs) + '" fill="' + (lblFill) + '" font-family="sans-serif">' + (_escHTML(lbl)) + '</text>';
      }
    });
  });

  // Category labels
  let catSvg = '';
  categories.forEach((cat, ci) => {
    const cx = plotX + ci * groupW + groupW / 2;
    catSvg += '<text x="' + (cx.toFixed(1)) + '" y="' + ((plotY + plotH + 14).toFixed(1)) + '" text-anchor="middle" font-size="' + (fs) + '" fill="' + (textCol) + 'cc" font-family="sans-serif">' + (_escHTML(cat)) + '</text>';
  });

  const PAD_TOP = 28;
  const PAD_BOTTOM = Math.ceil(fs + 30); // space for category labels + legend below plot
  return '<svg viewBox="0 ' + (-PAD_TOP) + ' ' + (W) + ' ' + (H + PAD_BOTTOM) + '" xmlns="http://www.w3.org/2000/svg">' + (bgDefs?('<defs>'+bgDefs+'</defs>'): "")+bgSvg+(gridSvg) + (barsSvg) + (catSvg) + (legendSvg) + '</svg>';
}

function _buildHBarChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg, bgDefs, bgSvg, lblColor, lblFs) {
  bgDefs = bgDefs||""; bgSvg = bgSvg||""; lblColor = lblColor||textCol; lblFs = lblFs||(Math.max(8,fs-1));
  const catCount = categories.length || 1;
  const serCount = series.length;
  const groupH = plotH / catCount;
  const barH = Math.max(4, groupH / (serCount + 1));
  const gap = (groupH - barH * serCount) / 2;

  let maxVal = 0;
  series.forEach(s => s.values.forEach(v => { if (v !== null && v > maxVal) maxVal = v; }));
  if (maxVal === 0) maxVal = 1;

  const labelColW = 60;
  const PAD_RIGHT = 32; // extra space right of longest bar for outside labels
  const bplotX = plotX + labelColW;
  const bplotW = plotW - labelColW - PAD_RIGHT;

  let gridSvg = '';
  for (let i = 0; i <= 4; i++) {
    const gx = bplotX + (i / 4) * bplotW;
    const val = (maxVal * i / 4);
    const valStr = Number.isInteger(val) ? val : val.toFixed(1);
    gridSvg += '<line x1="' + (gx) + '" y1="' + (plotY) + '" x2="' + (gx) + '" y2="' + (plotY + plotH) + '" stroke="' + (textCol) + '22" stroke-width="1"/>';
    gridSvg += '<text x="' + (gx) + '" y="' + (plotY + plotH + 14) + '" text-anchor="middle" font-size="' + (fs - 1) + '" fill="' + (textCol) + '88" font-family="sans-serif">' + (valStr) + '</text>';
  }

  const totalPerCat = categories.map((_, ci) => series.reduce((s, sr) => s + (sr.values[ci] || 0), 0));
  let barsSvg = '';
  series.forEach((s, si) => {
    categories.forEach((cat, ci) => {
      const val = s.values[ci];
      if (val === null) return;
      const bw = Math.max(2, (val / maxVal) * bplotW);
      const bx = bplotX;
      const by = plotY + ci * groupH + gap + si * barH;
      barsSvg += '<rect x="' + (bx) + '" y="' + (by.toFixed(1)) + '" width="' + (bw.toFixed(1)) + '" height="' + (barH.toFixed(1)) + '" rx="2" fill="' + (palette[si]) + '"/>';
      const lbl = _fmtLabel(val, totalPerCat[ci], labelMode);
      if (lbl) {
        const offset = d.chartLabelOffset != null ? +d.chartLabelOffset : 0;
        const inside = offset === 0 ? (bw > 40) : (offset < 0);
        const lblX = inside ? (bx + bw - 4 + offset) : (bx + bw + 4 + offset);
        const lblFill = inside ? '#fff' : lblColor;
        barsSvg += '<text x="' + (lblX.toFixed(1)) + '" y="' + ((by + barH/2).toFixed(1)) + '" text-anchor="' + (inside ? 'end' : 'start') + '" dominant-baseline="middle" font-size="' + (lblFs) + '" fill="' + (lblFill) + '" font-family="sans-serif">' + (_escHTML(lbl)) + '</text>';
      }
    });
  });

  let catSvg = '';
  categories.forEach((cat, ci) => {
    const cy = plotY + ci * groupH + groupH / 2;
    catSvg += '<text x="' + (plotX + labelColW - 6) + '" y="' + (cy.toFixed(1)) + '" text-anchor="end" dominant-baseline="middle" font-size="' + (fs) + '" fill="' + (textCol) + 'cc" font-family="sans-serif">' + (_escHTML(cat)) + '</text>';
  });

  return '<svg viewBox="0 0 ' + (W + PAD_RIGHT) + ' ' + (H) + '" xmlns="http://www.w3.org/2000/svg">' + (bgDefs?('<defs>'+bgDefs+'</defs>'): "")+bgSvg+(gridSvg) + (barsSvg) + (catSvg) + (legendSvg) + '</svg>';
}

function _buildLineChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg, bgDefs, bgSvg, lblColor, lblFs) {
  bgDefs = bgDefs||""; bgSvg = bgSvg||""; lblColor = lblColor||textCol; lblFs = lblFs||(Math.max(8,fs-1));
  const catCount = Math.max(categories.length, 2);

  let maxVal = 0, minVal = 0;
  series.forEach(s => s.values.forEach(v => { if (v !== null) { if (v > maxVal) maxVal = v; if (v < minVal) minVal = v; } }));
  if (maxVal === minVal) maxVal = minVal + 1;

  const toX = i => plotX + (i / (catCount - 1)) * plotW;
  const toY = v => plotY + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;

  let gridSvg = '';
  for (let i = 0; i <= 5; i++) {
    const gy = plotY + plotH - (i / 5) * plotH;
    const val = minVal + (maxVal - minVal) * i / 5;
    const valStr = Number.isInteger(val) ? val : val.toFixed(1);
    gridSvg += '<line x1="' + (plotX) + '" y1="' + (gy.toFixed(1)) + '" x2="' + (plotX + plotW) + '" y2="' + (gy.toFixed(1)) + '" stroke="' + (textCol) + '22" stroke-width="1"/>';
    gridSvg += '<text x="' + (plotX - 4) + '" y="' + (gy.toFixed(1)) + '" text-anchor="end" dominant-baseline="middle" font-size="' + (fs - 1) + '" fill="' + (textCol) + '88" font-family="sans-serif">' + (valStr) + '</text>';
  }

  const totalPerCat = categories.map((_, ci) => series.reduce((s, sr) => s + (sr.values[ci] || 0), 0));
  let linesSvg = '';
  series.forEach((s, si) => {
    const pts = s.values.map((v, i) => v !== null ? (toX(i).toFixed(1)) + ',' + (toY(v).toFixed(1)) : null).filter(Boolean);
    if (pts.length < 2) return;
    linesSvg += '<polyline points="' + (pts.join(' ')) + '" fill="none" stroke="' + (palette[si]) + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    s.values.forEach((v, i) => {
      if (v === null) return;
      const cx = toX(i), cy = toY(v);
      linesSvg += '<circle cx="' + (cx.toFixed(1)) + '" cy="' + (cy.toFixed(1)) + '" r="4" fill="' + (palette[si]) + '" stroke="' + (textCol) + '44" stroke-width="1"/>';
      const lbl = _fmtLabel(v, totalPerCat[i], labelMode);
      if (lbl) linesSvg += '<text x="' + (cx.toFixed(1)) + '" y="' + ((cy - 8).toFixed(1)) + '" text-anchor="middle" font-size="' + (lblFs) + '" fill="' + (lblColor) + '" font-family="sans-serif">' + (_escHTML(lbl)) + '</text>';
    });
  });

  let catSvg = '';
  categories.forEach((cat, i) => {
    catSvg += '<text x="' + (toX(i).toFixed(1)) + '" y="' + ((plotY + plotH + 14).toFixed(1)) + '" text-anchor="middle" font-size="' + (fs) + '" fill="' + (textCol) + 'cc" font-family="sans-serif">' + (_escHTML(cat)) + '</text>';
  });

  return '<svg viewBox="0 0 ' + (W) + ' ' + (H) + '" xmlns="http://www.w3.org/2000/svg">' + (bgDefs?('<defs>'+bgDefs+'</defs>'): "")+bgSvg+(gridSvg) + (linesSvg) + (catSvg) + (legendSvg) + '</svg>';
}

function _buildPieChart(d, W, H, series, palette, textCol, fs, labelMode, isDonut, legendSvg, bgDefs, bgSvg, lblColor, lblFs, isExploded) {
  legendSvg = legendSvg||""; bgDefs = bgDefs||""; bgSvg = bgSvg||""; lblColor = lblColor||'#fff'; lblFs = lblFs||(Math.max(8,fs-1));
  const sliceGap = isExploded ? (d.chartSliceGap != null ? +d.chartSliceGap : 6) : 0;
  const sliceRx  = 0; // скругление убрано — только отступ секторов
  const { categories, legendOnRow } = _chartExtract(d);
  // Pie/donut: interpret data based on legend orientation
  // legendOnRow=true: first row = series labels (C, D...), data rows below
  //   → each SERIES (column) becomes a slice, value = sum of that column across all data rows
  // legendOnRow=false: first col = series labels, data cols to right
  //   → each SERIES (row) becomes a slice, value = sum of that row across all data cols
  let sliceData;
  if (legendOnRow !== false) {
    // Columns as slices: series[i] = one slice, value = sum of all rows in that series
    sliceData = series.map((s, i) => ({
      val: s.values.reduce((sum, v) => sum + (v || 0), 0),
      label: s.label,
      color: palette[i % palette.length]
    }));
  } else {
    // Rows as slices: categories[i] = one slice, value = sum across all series for that category index
    sliceData = categories.map((cat, i) => ({
      val: series.reduce((sum, s) => sum + (s.values[i] || 0), 0),
      label: cat,
      color: palette[i % palette.length]
    }));
  }
  sliceData = sliceData.filter(sl => sl.val > 0);

  const total = sliceData.reduce((s, sl) => s + sl.val, 0);
  if (total === 0) return '<svg viewBox="0 0 ' + (W) + ' ' + (H) + '" xmlns="http://www.w3.org/2000/svg"><text x="' + (W/2) + '" y="' + (H/2) + '" text-anchor="middle" fill="#888" font-size="14">Нет данных</text></svg>';

  const lgPos = d.chartLegendPos || 'bottom-left';
  const legendH = lgPos.startsWith('bottom') ? 22 : 0;
  const lgSideW  = (lgPos === 'left' || lgPos === 'right') ? 114 : 0;
  // Center and radius adjusted for legend position
  const plotX = lgPos === 'left'  ? lgSideW : 0;
  const plotW = W - lgSideW;
  const cx = plotX + plotW / 2;
  const cy = (H - legendH) / 2;
  const R = Math.min(plotW / 2 - 10, cy - 10);
  const r = isDonut ? R * 0.52 : 0;

  const deg = v => (v / total) * Math.PI * 2;
  const px = (angle, radius) => cx + radius * Math.cos(angle - Math.PI / 2);
  const py = (angle, radius) => cy + radius * Math.sin(angle - Math.PI / 2);
  const arc = (r1, r2, a1, a2) => {
    const large = (a2 - a1) > Math.PI ? 1 : 0;
    if (isDonut) {
      return 'M ' + (px(a1,r2).toFixed(2)) + ' ' + (py(a1,r2).toFixed(2)) + ' A ' + (r2) + ' ' + (r2) + ' 0 ' + (large) + ' 1 ' + (px(a2,r2).toFixed(2)) + ' ' + (py(a2,r2).toFixed(2)) + ' L ' + (px(a2,r1).toFixed(2)) + ' ' + (py(a2,r1).toFixed(2)) + ' A ' + (r1) + ' ' + (r1) + ' 0 ' + (large) + ' 0 ' + (px(a1,r1).toFixed(2)) + ' ' + (py(a1,r1).toFixed(2)) + ' Z';
    }
    return 'M ' + (cx) + ' ' + (cy) + ' L ' + (px(a1,r2).toFixed(2)) + ' ' + (py(a1,r2).toFixed(2)) + ' A ' + (r2) + ' ' + (r2) + ' 0 ' + (large) + ' 1 ' + (px(a2,r2).toFixed(2)) + ' ' + (py(a2,r2).toFixed(2)) + ' Z';
  };

  let slicesSvg = '', labelsSvg = '';
  let angle = 0;

  // Helper: rounded corner arc between two points using a small circle of radius rr
  // Moves along direction dir at point p, turns toward point q
  function _roundCorner(p1x, p1y, p2x, p2y, rr) {
    // Arc from p1 to p2 with radius rr (approximate rounded corner)
    return 'A ' + (rr.toFixed(2)) + ' ' + (rr.toFixed(2)) + ' 0 0 1 ' + (p2x.toFixed(2)) + ' ' + (p2y.toFixed(2));
  }

  sliceData.forEach((sl, i) => {
    if (sl.val <= 0) { angle += deg(sl.val); return; }
    const a1 = angle, a2 = angle + deg(sl.val);
    const midAngle = (a1 + a2) / 2;
    const spanAngle = a2 - a1;

    // Explode: shift slice outward from center
    const ex = sliceGap > 0 ? sliceGap * Math.cos(midAngle - Math.PI/2) : 0;
    const ey = sliceGap > 0 ? sliceGap * Math.sin(midAngle - Math.PI/2) : 0;
    const transform = (ex || ey) ? ' transform="translate(' + (ex.toFixed(2)) + ',' + (ey.toFixed(2)) + ')"' : '';

    let pathD;
    const rx0 = sliceRx; // corner radius
    // Only round if sector is large enough
    const canRound = rx0 > 0 && spanAngle > 0.15 && R > rx0 * 2;

    if (!canRound) {
      pathD = arc(r, R, a1, a2);
    } else if (isDonut) {
      // Donut: rounded outer corners + rounded inner corners
      // clamp rx so it never exceeds half the ring thickness or causes overlap
      const ringW = R - r;
      const rxClamped = Math.min(rx0, ringW * 0.45, R * (spanAngle / 4));
      const dOuter = rxClamped / R;
      const dInner = rxClamped / r;
      // Clamp so arcs don't overlap: max offset = spanAngle/2 - small epsilon
      const maxOff = spanAngle / 2 - 0.01;
      const dO = Math.min(dOuter, maxOff);
      const dI = Math.min(dInner, maxOff);
      const large = (a2 - dO - (a1 + dO)) > Math.PI ? 1 : 0;
      const Ox1 = px(a1 + dO, R), Oy1 = py(a1 + dO, R);
      const Ox2 = px(a2 - dO, R), Oy2 = py(a2 - dO, R);
      const Ix1 = px(a2 - dI, r), Iy1 = py(a2 - dI, r);
      const Ix2 = px(a1 + dI, r), Iy2 = py(a1 + dI, r);
      pathD = 'M ' + (Ix2.toFixed(2)) + ' ' + (Iy2.toFixed(2)) + ' ' +
              'A ' + (rxClamped.toFixed(2)) + ' ' + (rxClamped.toFixed(2)) + ' 0 0 1 ' + (Ox1.toFixed(2)) + ' ' + (Oy1.toFixed(2)) + ' ' +
              'A ' + (R) + ' ' + (R) + ' 0 ' + (large) + ' 1 ' + (Ox2.toFixed(2)) + ' ' + (Oy2.toFixed(2)) + ' ' +
              'A ' + (rxClamped.toFixed(2)) + ' ' + (rxClamped.toFixed(2)) + ' 0 0 1 ' + (Ix1.toFixed(2)) + ' ' + (Iy1.toFixed(2)) + ' ' +
              'A ' + (r) + ' ' + (r) + ' 0 ' + (large) + ' 0 ' + (Ix2.toFixed(2)) + ' ' + (Iy2.toFixed(2)) + ' Z';
    } else {
      // Pie: rounded outer corners only (center is a point — no rounding there)
      const rxClamped = Math.min(rx0, R * (spanAngle / 4));
      const dOuter = Math.min(rxClamped / R, spanAngle / 2 - 0.01);
      const large = (spanAngle - 2 * dOuter) > Math.PI ? 1 : 0;
      const Ox1 = px(a1 + dOuter, R), Oy1 = py(a1 + dOuter, R);
      const Ox2 = px(a2 - dOuter, R), Oy2 = py(a2 - dOuter, R);
      pathD = 'M ' + (cx.toFixed(2)) + ' ' + (cy.toFixed(2)) + ' ' +
              'L ' + (Ox1.toFixed(2)) + ' ' + (Oy1.toFixed(2)) + ' ' +
              'A ' + (R) + ' ' + (R) + ' 0 ' + (large) + ' 1 ' + (Ox2.toFixed(2)) + ' ' + (Oy2.toFixed(2)) + ' ' +
              'A ' + (rxClamped.toFixed(2)) + ' ' + (rxClamped.toFixed(2)) + ' 0 0 1 ' + (cx.toFixed(2)) + ' ' + (cy.toFixed(2)) + ' Z';
    }

    slicesSvg += '<path d="' + (pathD) + '"' + (transform) + ' fill="' + (sl.color) + '" stroke="none"/>';
    const mid = (a1 + a2) / 2;
    const lrBase = isDonut ? (r + R) / 2 : R * 0.65;
    const lr = lrBase + (d.chartLabelOffset != null ? +d.chartLabelOffset : 0);
    const lbl = _fmtLabel(sl.val, total, labelMode);
    if (lbl) {
      const lblOutside = lr > R;
      const lblFill = lblOutside ? textCol : '#fff';
      const pieLblFill = lblOutside ? lblColor : (lblColor !== '#fff' ? lblColor : '#fff');
      labelsSvg += '<text x="' + (px(mid,lr).toFixed(1)) + '" y="' + (py(mid,lr).toFixed(1)) + '" text-anchor="middle" dominant-baseline="middle" font-size="' + (lblFs) + '" fill="' + (pieLblFill) + '" font-family="sans-serif" font-weight="600">' + (_escHTML(lbl)) + '</text>';
    }
    angle = a2;
  });

  return '<svg viewBox="0 0 ' + (W) + ' ' + (H) + '" xmlns="http://www.w3.org/2000/svg">' + (bgDefs?('<defs>'+bgDefs+'</defs>'): "")+bgSvg+(slicesSvg) + (labelsSvg) + (legendSvg) + '</svg>';
}


const AMAP={fadeIn:'el-fadein',slideUp:'el-slideup',slideDown:'el-slidedown',slideLeft:'el-slideleft',slideRight:'el-slideright',zoomIn:'el-zoomin',spinIn:'el-spin',bounceIn:'el-bounce',fadeOut:'el-fadeout',slideOut:'el-slideout',zoomOut:'el-zoomout',pulse:'el-pulse',shake:'el-shake',flash:'el-flash',dance:'el-dance',swing:'el-swing'};
var CODE_THEMES=window.CODE_THEMES||{dark:{bg:'#0d1117',text:'#e6edf3',kw:'#ff7b72',str:'#a5d6ff',cmt:'#6e7781',num:'#79c0ff',fn:'#d2a8ff',ty:'#ffa657'},monokai:{bg:'#272822',text:'#f8f8f2',kw:'#f92672',str:'#e6db74',cmt:'#75715e',num:'#ae81ff',fn:'#a6e22e',ty:'#66d9ef'},dracula:{bg:'#282a36',text:'#f8f8f2',kw:'#ff79c6',str:'#f1fa8c',cmt:'#6272a4',num:'#bd93f9',fn:'#50fa7b',ty:'#8be9fd'},light:{bg:'#f8f9fa',text:'#24292e',kw:'#d73a49',str:'#032f62',cmt:'#6a737d',num:'#005cc5',fn:'#6f42c1',ty:'#e36209'}};
function _codeBlockSurfaceCss(d,T){
  var theme=d.codeTheme||'dark';
  T=T||CODE_THEMES[theme]||CODE_THEMES.dark;
  var fs=d.codeFs||13,bg=T.bg,extra='';
  if(d.codeGlass){bg=theme==='light'?'rgba(248,249,250,0.58)':'rgba(13,17,23,0.58)';extra='backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);';}
  return 'width:100%;height:100%;overflow:auto;border-radius:6px;font-family:monospace;font-size:'+fs+'px;line-height:1.6;padding:14px 16px;box-sizing:border-box;background:'+bg+';color:'+T.text+';border:1px solid rgba(128,128,128,'+(d.codeGlass?0.22:0.15)+');'+extra;
}
function buildIconSVG(ic,color,sw,style,shadow,shadowBlur,shadowColor){if(!ic)return '';var paths=ic.p.split('||').map(function(p){return p.trim();}).filter(Boolean);var pathEls=paths.map(function(p){return '<path d="'+p+'"/>';}).join('');var attrs='';if(style==='fill')attrs='fill="'+color+'" stroke="none"';else if(style==='duotone')attrs='fill="'+color+'" fill-opacity="0.18" stroke="'+color+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round"';else attrs='fill="none" stroke="'+color+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round"';var filterDef='',filterAttr='';if(shadow){var sb=shadowBlur||8,sc=shadowColor||'#000000';filterDef='<defs><filter id="isf_'+ic.id+'" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="2" dy="2" stdDeviation="'+(sb*0.4)+'" flood-color="'+sc+'" flood-opacity="0.7"/></filter></defs>';filterAttr='filter="url(#isf_'+ic.id+')"';}var vb=ic.vb||'0 0 24 24';if(ic.vb&&style!=='fill'&&style!=='duotone')attrs='fill="none" stroke="'+color+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round"';return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vb+'" '+attrs+' '+filterAttr+' style="width:100%;height:100%;overflow:visible">'+filterDef+'<g>'+pathEls+'</g></svg>';}
function _buildCalloutSVGPath(d,w,h,sh,fa,sa2,shadow,m){var rx=d.rx||0;var sw=d.sw!==undefined?+d.sw:2;var bx=m,by=m,bw=Math.max(1,w-m*2),bh=Math.max(1,h-m*2);var cx=bx+bw/2,cy=by+bh/2;var L=bx,T=by,R2=bx+bw,B=by+bh;var r=Math.min(rx,bw/2,bh/2);function _(n){return Math.round(n*10)/10;}var tipX=_(w/2+(d.tailX!==undefined?+d.tailX:0));var tipY=_(h/2+(d.tailY!==undefined?+d.tailY:h/2+30));var ang=Math.atan2(tipY-cy,tipX-cx);var tw=Math.max(16,Math.min(bw,bh)*0.14);function borderPt(a){var dx=Math.cos(a),dy=Math.sin(a),best=null,bestT=Infinity;function tryT(t){if(t>1e-6&&t<bestT){bestT=t;best={x:cx+dx*t,y:cy+dy*t};}}if(Math.abs(dy)>1e-9){tryT((T+r-cy)/dy);tryT((B-r-cy)/dy);}if(Math.abs(dx)>1e-9){tryT((L+r-cx)/dx);tryT((R2-r-cx)/dx);}[{qx:L+r,qy:T+r},{qx:R2-r,qy:T+r},{qx:R2-r,qy:B-r},{qx:L+r,qy:B-r}].forEach(function(q){var fx=cx-q.qx,fy=cy-q.qy,a2=dx*dx+dy*dy;var b2=2*(fx*dx+fy*dy),cv=fx*fx+fy*fy-r*r,disc=b2*b2-4*a2*cv;if(disc>=0){var sq=Math.sqrt(disc);[(-b2+sq)/(2*a2),(-b2-sq)/(2*a2)].forEach(tryT);}});return best||{x:cx+dx*bw/2,y:cy+dy*bh/2};}var baseC=borderPt(ang);var baseDist=Math.sqrt((baseC.x-cx)*(baseC.x-cx)+(baseC.y-cy)*(baseC.y-cy));var angOffset=Math.atan2(tw,baseDist);var b1=borderPt(ang+angOffset),b2pts=borderPt(ang-angOffset);var inset=sw/2+0.5;function pushIn(p){var ddx=cx-p.x,ddy=cy-p.y,len=Math.sqrt(ddx*ddx+ddy*ddy)||1;return{x:_(p.x+ddx/len*inset),y:_(p.y+ddy/len*inset)};}var bi1=pushIn(b1),bi2=pushIn(b2pts);var rectPath=r>0?'M '+_(L+r)+' '+_(T)+' H '+_(R2-r)+' Q '+_(R2)+' '+_(T)+' '+_(R2)+' '+_(T+r)+' V '+_(B-r)+' Q '+_(R2)+' '+_(B)+' '+_(R2-r)+' '+_(B)+' H '+_(L+r)+' Q '+_(L)+' '+_(B)+' '+_(L)+' '+_(B-r)+' V '+_(T+r)+' Q '+_(L)+' '+_(T)+' '+_(L+r)+' '+_(T)+' Z':'M '+_(L)+' '+_(T)+' H '+_(R2)+' V '+_(B)+' H '+_(L)+' Z';var tailPath='M '+_(bi1.x)+' '+_(bi1.y)+' L '+_(tipX)+' '+_(tipY)+' L '+_(bi2.x)+' '+_(bi2.y)+' Z';return '<g '+shadow+'><path d="'+rectPath+'" '+fa+' '+sa2+'/><path d="'+tailPath+'" '+fa+' stroke="none"/></g>';}

function _shapeClipPath(d,w,h){
  var SHAPES=SHAPES_DATA;
  var sh=SHAPES.find(function(s){return s.id===d.shape;})||SHAPES[0];
  var sw=d.sw===undefined?2:+d.sw;
  var m=sw>0?sw:0;
  if(sh.special==='rect')return 'inset('+m+'px)';
  if(sh.special==='rounded')return 'inset('+m+'px round '+(d.rx||15)+'px)';
  if(sh.special==='ellipse')return 'ellipse('+((w-m*2)/2)+'px '+((h-m*2)/2)+'px at 50% 50%)';
  if(sh.path){
    var ew=Math.max(1,w-m*2),eh=Math.max(1,h-m*2);
    var sx=ew/90,sy=eh/90;
    var pts=[];
    var re=/[ML]\s*(-?[\d.])[,\s]+(-?[\d.])/g;
    var match;
    while((match=re.exec(sh.path))!==null){
      pts.push(Math.round((+match[1]-5)*sx+m)+'px '+Math.round((+match[2]-5)*sy+m)+'px');
    }
    if(pts.length>=3)return 'polygon('+pts.join(', ')+')';
  }
  return 'none';
}







function _expRndPath(pts,rx){var n=pts.length;if(n<3||rx<=0){return pts.map(function(p,i){return(i===0?'M ':'L ')+p.x.toFixed(2)+' '+p.y.toFixed(2);}).join(' ')+' Z';}var area=0;for(var i=0;i<n;i++){var a=pts[i],b=pts[(i+1)%n];area+=a.x*b.y-b.x*a.y;}var ccw=area>0;var corners=[];for(var i=0;i<n;i++){var prev=pts[(i-1+n)%n],curr=pts[i],next=pts[(i+1)%n];var e1x=prev.x-curr.x,e1y=prev.y-curr.y,e2x=next.x-curr.x,e2y=next.y-curr.y;var len1=Math.hypot(e1x,e1y),len2=Math.hypot(e2x,e2y);if(len1<0.001||len2<0.001){corners.push(null);continue;}var u1x=e1x/len1,u1y=e1y/len1,u2x=e2x/len2,u2y=e2y/len2;var dot=u1x*u2x+u1y*u2y,cosA=Math.max(-1,Math.min(1,dot)),halfA=Math.acos(cosA)/2;var r=Math.min(rx,len1/2,len2/2);var p1x=curr.x+u1x*r,p1y=curr.y+u1y*r,p2x=curr.x+u2x*r,p2y=curr.y+u2y*r;var kc=(4/3)*Math.tan(halfA/2),k=Math.max(kc,0.55);corners.push({p1x:p1x,p1y:p1y,p2x:p2x,p2y:p2y,cp1x:p1x-u1x*r*k,cp1y:p1y-u1y*r*k,cp2x:p2x-u2x*r*k,cp2y:p2y-u2y*r*k});}var d='';var started=false;for(var i=0;i<n;i++){var c=corners[i];if(!c)continue;if(!started){d+='M '+c.p1x.toFixed(2)+' '+c.p1y.toFixed(2)+' ';started=true;}else d+='L '+c.p1x.toFixed(2)+' '+c.p1y.toFixed(2)+' ';d+='C '+c.cp1x.toFixed(2)+' '+c.cp1y.toFixed(2)+' '+c.cp2x.toFixed(2)+' '+c.cp2y.toFixed(2)+' '+c.p2x.toFixed(2)+' '+c.p2y.toFixed(2)+' ';}return d+'Z';}
function _expExtPts(p){var pts=[],parts=p.split(' ');for(var i=0;i<parts.length;i++){var t=parts[i];if(t==='M'||t==='L'){var x=parseFloat(parts[i+1]),y=parseFloat(parts[i+2]);if(!isNaN(x)&&!isNaN(y))pts.push({x:x,y:y});}}return pts;}
function _expPerim(sh,w,h,m){var ew=Math.max(1,w-m*2),eh=Math.max(1,h-m*2);if(sh.special==='ellipse'){var a=ew/2,b=eh/2;return Math.PI*(3*(a+b)-Math.sqrt((3*a+b)*(a+3*b)));}if(sh.special==='rect')return 2*(ew+eh);if(!sh.path)return 2*(ew+eh);var sx=ew/90,sy=eh/90,cnt=0;var raw=sh.path.split(' ').map(function(tok){if(tok==='M'||tok==='L'||tok==='Z')return tok;var v=parseFloat(tok);if(isNaN(v))return tok;var i=cnt++;return String(i%2===0?Math.round((v-5)*sx+m):Math.round((v-5)*sy+m));}).join(' ');var pts=_expExtPts(raw);var p2=0;for(var i=0;i<pts.length;i++){var a=pts[i],b=pts[(i+1)%pts.length];p2+=Math.hypot(b.x-a.x,b.y-a.y);}return p2;}
function _expEvenDash(style,sw,perim){if(!perim||perim<1)return '';var dot=sw,gap=sw*3,period=dot+gap,n=Math.max(1,Math.round(perim/period)),pl=(n*period).toFixed(2);if(style==='dotted')return 'stroke-dasharray="'+dot+' '+gap+'" stroke-linecap="round" pathLength="'+pl+'"';var dash=sw*4,dgap=sw*3,pd=dash+dgap,nd=Math.max(1,Math.round(perim/pd)),pld=(nd*pd).toFixed(2);return 'stroke-dasharray="'+dash+' '+dgap+'" pathLength="'+pld+'"';}
function _expWave(pathStr,style,sw,skipClose){try{var tmp=document.createElementNS('http://www.w3.org/2000/svg','svg');tmp.style.cssText='position:absolute;visibility:hidden;pointer-events:none;width:1px;height:1px;';document.body.appendChild(tmp);var p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',pathStr);tmp.appendChild(p);var tl=p.getTotalLength();document.body.removeChild(tmp);if(tl<1)return null;var hs=style==='wave'?sw*3.5:sw*2.5,amp=sw*0.85,nh=Math.max(4,Math.round(tl/hs));if(nh%2!==0)nh++;var ah=tl/nh,pts=[],mids=[];for(var i=0;i<=nh;i++){var pt=p.getPointAtLength(Math.min(tl,ah*i));pts.push({x:pt.x,y:pt.y});}for(var i=0;i<nh;i++){var pt=p.getPointAtLength(Math.min(tl,ah*i+ah*0.5));mids.push({x:pt.x,y:pt.y});}var d='M '+pts[0].x.toFixed(2)+' '+pts[0].y.toFixed(2)+' ';for(var i=0;i<nh;i++){var a=pts[i],b=pts[i+1],md=mids[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),nx=len>0?-dy/len:0,ny=len>0?dx/len:1,side=(i%2===0)?1:-1,cpx=(md.x+nx*amp*side).toFixed(2),cpy=(md.y+ny*amp*side).toFixed(2);if(style==='wave')d+='Q '+cpx+' '+cpy+' '+b.x.toFixed(2)+' '+b.y.toFixed(2)+' ';else d+='L '+cpx+' '+cpy+' L '+b.x.toFixed(2)+' '+b.y.toFixed(2)+' ';}if(!skipClose)d+='Z';return d;}catch(e){return null;}}
// ══════════════ CLOUD SHAPE GENERATOR ══════════════
const CLOUD_FORMS = ['puff', 'ring', 'burst', 'trail', 'stack'];

function _cloudNormForm(form) {
  return CLOUD_FORMS.includes(form) ? form : 'puff';
}

function _generateCloudCircles(w, h, seed, form) {
  form = _cloudNormForm(form);
  let s = (seed || 42) >>> 0;
  function rnd() {
    s += 0x6D2B79F5; let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 0xFFFFFFFF;
  }

  const ccx = w / 2;
  const ccy = h * (0.50 + rnd() * 0.04);
  const baseR = Math.min(w, h) * (0.12 + rnd() * 0.02);
  const tiers = [
    { mul: 0.40, count: 10 + Math.floor(rnd() * 10), maxD: 0.14 },
    { mul: 0.27, count: 20 + Math.floor(rnd() * 10), maxD: 0.26 },
    { mul: 0.17, count: 30 + Math.floor(rnd() * 10), maxD: 0.36 },
    { mul: 0.10, count: 40 + Math.floor(rnd() * 20), maxD: 0.46 }
  ];
  const totalTarget = tiers.reduce((n, t) => n + t.count, 0);

  if (form === 'ring') {
    const ringRx = w * (0.34 + rnd() * 0.02);
    const ringRy = h * (0.34 + rnd() * 0.02);
    const holeRatio = 0.40 + rnd() * 0.06;
    const ringTiers = [
      { mul: 0.40, count: 30 + Math.floor(rnd() * 12), maxD: 0.16 },
      { mul: 0.27, count: 50 + Math.floor(rnd() * 16), maxD: 0.28 },
      { mul: 0.17, count: 70 + Math.floor(rnd() * 20), maxD: 0.38 },
      { mul: 0.10, count: 90 + Math.floor(rnd() * 24), maxD: 0.48 }
    ];
    const bigMul = ringTiers[0].mul;
    const nAnchor = 28 + Math.floor(rnd() * 10);
    const circles = [];

    function _ringNormDist(cx, cy) {
      return Math.hypot((cx - ccx) / ringRx, (cy - ccy) / ringRy);
    }

    function _ringSizeScale(normDist) {
      const delta = Math.abs(normDist - 1) / 0.16;
      return Math.max(0.14, 1 - delta * 0.68);
    }

    function _ringDup(cx, cy, r, tight) {
      const k = tight ? 0.10 : 0.14;
      for (const c of circles) {
        if (Math.hypot(cx - c.cx, cy - c.cy) < (r + c.r) * k) return true;
      }
      return false;
    }

    function _ringTryPush(cx, cy, r, tightDup) {
      if (r < baseR * 0.05) return false;
      if (_ringNormDist(cx, cy) < holeRatio * 0.92) return false;
      if (cx - r < w * 0.02 || cx + r > w * 0.98 || cy - r < h * 0.03 || cy + r > h * 0.97) return false;
      if (_ringDup(cx, cy, r, tightDup)) return false;
      circles.push({ cx, cy, r });
      return true;
    }

    for (let i = 0; i < nAnchor; i++) {
      const ang = (i / nAnchor) * Math.PI * 2 + (rnd() - 0.5) * 0.22;
      const cx = ccx + Math.cos(ang) * ringRx;
      const cy = ccy + Math.sin(ang) * ringRy;
      _ringTryPush(cx, cy, baseR * bigMul * (0.94 + rnd() * 0.12), true);
    }

    for (let ti = 0; ti < ringTiers.length; ti++) {
      const tier = ringTiers[ti];
      let placed = 0;
      const target = tier.count;
      const bandNorm = (baseR * (0.42 + tier.maxD * 0.62)) / Math.max(ringRx, ringRy);
      for (let att = 0; placed < target && att < target * 55; att++) {
        const ang = rnd() * Math.PI * 2;
        const normDist = 1 + (rnd() - 0.5) * bandNorm * 2.2;
        if (normDist < holeRatio) continue;
        const cx = ccx + Math.cos(ang) * ringRx * normDist + (rnd() - 0.5) * baseR * 0.14;
        const cy = ccy + Math.sin(ang) * ringRy * normDist + (rnd() - 0.5) * baseR * 0.14;
        const nd = _ringNormDist(cx, cy);
        const scale = _ringSizeScale(nd);
        let r = baseR * tier.mul * scale * (0.90 + rnd() * 0.20);
        if (ti > 0) {
          const anchor = circles[Math.floor(rnd() * circles.length)];
          const pull = 0.48 + ti * 0.05;
          const px = cx * pull + anchor.cx * (1 - pull);
          const py = cy * pull + anchor.cy * (1 - pull);
          const pd = _ringNormDist(px, py);
          if (pd < holeRatio * 0.92) continue;
          r *= _ringSizeScale(pd) / Math.max(0.2, scale);
          if (_ringTryPush(px, py, r, false)) placed++;
        } else if (_ringTryPush(cx, cy, r, false)) {
          placed++;
        }
      }
    }

    const nFill = 48 + Math.floor(rnd() * 20);
    for (let i = 0; i < nFill; i++) {
      const ang = (i / nFill) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
      const normDist = 1 + (rnd() - 0.5) * 0.10;
      const cx = ccx + Math.cos(ang) * ringRx * normDist + (rnd() - 0.5) * baseR * 0.10;
      const cy = ccy + Math.sin(ang) * ringRy * normDist + (rnd() - 0.5) * baseR * 0.10;
      const r = baseR * (0.22 + rnd() * 0.14) * _ringSizeScale(_ringNormDist(cx, cy));
      _ringTryPush(cx, cy, r, true);
    }

    return circles;
  }

  if (form === 'burst') {
    const maxR = Math.min(w, h) * (0.44 + rnd() * 0.04);
    const coreR = baseR * tiers[0].mul * (0.88 + rnd() * 0.14);
    const circles = [{ cx: ccx, cy: ccy, r: coreR }];

    function _burstDup(cx, cy, r, k) {
      k = k == null ? 0.12 : k;
      for (const c of circles) {
        if (Math.hypot(cx - c.cx, cy - c.cy) < (r + c.r) * k) return true;
      }
      return false;
    }

    function _burstTry(cx, cy, r, tight) {
      if (r < baseR * 0.035) return false;
      if (cx - r < w * 0.02 || cx + r > w * 0.98 || cy - r < h * 0.03 || cy + r > h * 0.97) return false;
      if (_burstDup(cx, cy, r, tight ? 0.08 : 0.11)) return false;
      circles.push({ cx, cy, r });
      return true;
    }

    const nRays = 32 + Math.floor(rnd() * 14);
    for (let ri = 0; ri < nRays; ri++) {
      const ang = (ri / nRays) * Math.PI * 2 + (rnd() - 0.5) * 0.3;
      const dustN = 10 + Math.floor(rnd() * 8);
      for (let di = 0; di < dustN; di++) {
        const t = (di + 0.35) / (dustN + 0.5);
        const dist = coreR * 0.55 + t * maxR * (0.92 + rnd() * 0.12);
        const perp = (rnd() - 0.5) * baseR * (0.08 + t * 0.28);
        const cx = ccx + Math.cos(ang) * dist + Math.cos(ang + Math.PI / 2) * perp;
        const cy = ccy + Math.sin(ang) * dist * 0.62 + Math.sin(ang + Math.PI / 2) * perp * 0.62;
        const r = baseR * (0.05 + (1 - t * 0.82) * 0.11) * (0.65 + rnd() * 0.55);
        _burstTry(cx, cy, r, true);
      }
    }

    const nDust = 160 + Math.floor(rnd() * 90);
    for (let i = 0; i < nDust; i++) {
      const ang = rnd() * Math.PI * 2;
      const distPow = Math.pow(rnd(), 0.48);
      const dist = coreR * 0.25 + distPow * maxR;
      const cx = ccx + Math.cos(ang) * dist + (rnd() - 0.5) * baseR * 0.22;
      const cy = ccy + Math.sin(ang) * dist * 0.62 + (rnd() - 0.5) * baseR * 0.16;
      const r = baseR * (0.04 + (1 - distPow) * 0.09 + rnd() * 0.07);
      _burstTry(cx, cy, r, false);
    }

    const burstTiers = [
      { mul: 0.32, count: 24 + Math.floor(rnd() * 10), maxD: 0.18 },
      { mul: 0.20, count: 40 + Math.floor(rnd() * 14), maxD: 0.32 },
      { mul: 0.12, count: 55 + Math.floor(rnd() * 18), maxD: 0.42 }
    ];
    for (let ti = 0; ti < burstTiers.length; ti++) {
      const tier = burstTiers[ti];
      let placed = 0;
      for (let att = 0; placed < tier.count && att < tier.count * 40; att++) {
        const ang = rnd() * Math.PI * 2;
        const dist = tier.maxD * Math.min(w, h) * (0.35 + rnd() * 0.95);
        const cx = ccx + Math.cos(ang) * dist + (rnd() - 0.5) * baseR * 0.14;
        const cy = ccy + Math.sin(ang) * dist * 0.62 + (rnd() - 0.5) * baseR * 0.12;
        const r = baseR * tier.mul * (0.82 + rnd() * 0.22);
        if (_burstTry(cx, cy, r, false)) placed++;
      }
    }

    return circles;
  }

  let totalPlaced = 0;
  const circles = [];

  if (form === 'trail') {
    circles.push({ cx: w * 0.10, cy: ccy, r: baseR * 0.38 * (0.92 + rnd() * 0.12) });
  } else if (form === 'burst') {
    circles.push({ cx: ccx, cy: ccy, r: baseR * tiers[0].mul * (0.92 + rnd() * 0.12) });
  } else if (form === 'stack') {
    circles.push({ cx: ccx, cy: h * 0.28, r: baseR * 0.34 * (0.9 + rnd() * 0.15) });
  } else {
    circles.push({
      cx: ccx + (rnd() - 0.5) * baseR * 0.35,
      cy: ccy + baseR * 0.08,
      r: baseR * tiers[0].mul * (0.92 + rnd() * 0.12)
    });
  }
  totalPlaced++;

  function _candidate(tier) {
    const ratio = totalPlaced / Math.max(1, totalTarget);
    if (form === 'burst') {
      const ang = rnd() * Math.PI * 2;
      const dist = tier.maxD * Math.min(w, h) * (0.4 + rnd() * 0.95);
      return { cx: ccx + Math.cos(ang) * dist, cy: ccy + Math.sin(ang) * dist * 0.62, maxD: tier.maxD * Math.min(w, h) * 1.25, rScale: 1 };
    }
    if (form === 'trail') {
      const t = ratio;
      return { cx: w * (0.06 + t * 0.88) + (rnd() - 0.5) * baseR * 0.5, cy: ccy + (rnd() - 0.5) * baseR * 2.2, maxD: tier.maxD * Math.min(w, h) * 1.1, rScale: Math.max(0.32, 1 - t * 0.58) };
    }
    if (form === 'stack') {
      const layer = Math.min(2, Math.floor(ratio * 3 + rnd() * 0.5));
      return { cx: ccx + (rnd() - 0.5) * w * (0.22 + layer * 0.08), cy: h * (0.24 + layer * 0.16 + rnd() * 0.07), maxD: tier.maxD * Math.min(w, h) * (0.95 - layer * 0.1), rScale: 1 - layer * 0.07 };
    }
    return null;
  }

  for (let ti = 0; ti < tiers.length; ti++) {
    const tier = tiers[ti];
    let placed = 1;
    for (let att = 0; placed < tier.count && att < tier.count * 30; att++) {
      let r = baseR * tier.mul * (0.88 + rnd() * 0.2);
      let cx, cy, maxD = tier.maxD * Math.min(w, h);
      const cand = _candidate(tier);
      if (cand) {
        r *= cand.rScale || 1;
        maxD = cand.maxD || maxD;
        const anchor = circles[Math.floor(rnd() * circles.length)];
        const pull = form === 'trail' ? 0.35 : 0.55;
        cx = cand.cx * pull + anchor.cx * (1 - pull) + (rnd() - 0.5) * r * 0.35;
        cy = cand.cy * pull + anchor.cy * (1 - pull) + (rnd() - 0.5) * r * 0.35;
      } else {
        const anchor = circles[Math.floor(rnd() * circles.length)];
        const ang = -Math.PI * 0.92 + rnd() * Math.PI * 0.84;
        const dist = (anchor.r + r) * (0.48 + rnd() * 0.24);
        cx = anchor.cx + Math.cos(ang) * dist;
        cy = anchor.cy + Math.sin(ang) * dist * 0.62;
        if (Math.hypot(cx - ccx, (cy - ccy) * 1.25) > maxD) continue;
      }
      if (cx - r < w * 0.03 || cx + r > w * 0.97 || cy - r < h * 0.04 || cy + r > h * 0.94) continue;
      let dup = false;
      for (const c of circles) {
        if (Math.hypot(cx - c.cx, cy - c.cy) < (r + c.r) * 0.18) { dup = true; break; }
      }
      if (dup) continue;
      circles.push({ cx, cy, r });
      placed++;
      totalPlaced++;
    }
  }
  return circles;
}

function _circlePathD(c){var cx=c.cx,cy=c.cy,r=c.r;return 'M '+(cx-r).toFixed(2)+' '+cy.toFixed(2)+' A '+r.toFixed(2)+' '+r.toFixed(2)+' 0 1 1 '+(cx+r).toFixed(2)+' '+cy.toFixed(2)+' A '+r.toFixed(2)+' '+r.toFixed(2)+' 0 1 1 '+(cx-r).toFixed(2)+' '+cy.toFixed(2)+' Z ';}

function _cloudBlobsPath(circles, expandR) {
  if (!circles || !circles.length) return '';
  const exp = expandR || 0;
  return circles.map(c => _circlePathD({ cx: c.cx, cy: c.cy, r: c.r + exp })).join('').trim();
}

function _cloudCircleBounds(circles, expandR) {
  if (!circles || !circles.length) return { x: 0, y: 0, w: 1, h: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const exp = expandR || 0;
  for (const c of circles) {
    const r = c.r + exp;
    if (c.cx - r < minX) minX = c.cx - r;
    if (c.cy - r < minY) minY = c.cy - r;
    if (c.cx + r > maxX) maxX = c.cx + r;
    if (c.cy + r > maxY) maxY = c.cy + r;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function _cloudContentPad(d) {
  const sw = d && d.sw != null ? +d.sw : 0;
  let pad = Math.max(3, sw / 2 + 2);
  if (d && d.shadow) {
    const sb = d.shadowBlur != null ? +d.shadowBlur : 4;
    const ss = d.shadowSize != null ? +d.shadowSize : 3;
    pad += Math.ceil(ss + sb * 2);
  }
  return pad;
}

function _cloudResolveCircles(d, w, h) {
  if (!d) return _generateCloudCircles(w, h, 42, 'puff');
  const form = _cloudNormForm(d.cloudForm);
  const circlesForm = d.cloudCirclesForm ? _cloudNormForm(d.cloudCirclesForm) : null;
  const canScale = d.cloudCircles && d.cloudCircles.length && d.cloudRefW > 0 && d.cloudRefH > 0 &&
    circlesForm === form;
  if (!canScale) {
    if (d.cloudFramed && w > 0 && h > 0) {
      d.cloudCircles = _cloudBuildAtSize(d, w, h);
      d.cloudCirclesForm = form;
      d.cloudRefW = w;
      d.cloudRefH = h;
      return d.cloudCircles;
    }
    return _generateCloudCircles(w, h, (d.cloudSeed) || 42, form);
  }
  const sx = w / d.cloudRefW;
  const sy = h / d.cloudRefH;
  const sm = Math.min(sx, sy);
  return d.cloudCircles.map(c => ({ cx: c.cx * sx, cy: c.cy * sy, r: c.r * sm }));
}

function _cloudFillFrame(circles, w, h, inset) {
  if (!circles || !circles.length) return circles;
  inset = inset == null ? 0 : inset;
  const b = _cloudCircleBounds(circles, 0);
  if (b.w < 1 || b.h < 1) return circles;
  const tw = Math.max(1, w - inset * 2);
  const th = Math.max(1, h - inset * 2);
  const sm = Math.max(tw / b.w, th / b.h);
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  return circles.map(c => ({
    cx: (c.cx - bcx) * sm + w / 2,
    cy: (c.cy - bcy) * sm + h / 2,
    r: c.r * sm
  }));
}

function _cloudSyncMeta(el, d) {
  if (!d) return;
  if (el) {
    if (el.dataset.cloudForm) d.cloudForm = el.dataset.cloudForm;
    if (el.dataset.cloudSeed != null && el.dataset.cloudSeed !== '') d.cloudSeed = +el.dataset.cloudSeed;
    if (el.dataset.cloudRefW) d.cloudRefW = +el.dataset.cloudRefW;
    if (el.dataset.cloudRefH) d.cloudRefH = +el.dataset.cloudRefH;
    if (el.dataset.cloudFramed === '1') d.cloudFramed = true;
  }
  if (d.cloudForm) {
    d.cloudForm = _cloudNormForm(d.cloudForm);
    _cloudPersistDataset(el, d);
  } else if (el && el.dataset.cloudForm) {
    d.cloudForm = _cloudNormForm(el.dataset.cloudForm);
  }
}

function _cloudPersistDataset(el, d) {
  if (!el || !d) return;
  if (d.cloudForm) el.dataset.cloudForm = d.cloudForm;
  if (d.cloudSeed != null) el.dataset.cloudSeed = d.cloudSeed;
  if (d.cloudRefW > 0) el.dataset.cloudRefW = d.cloudRefW;
  if (d.cloudRefH > 0) el.dataset.cloudRefH = d.cloudRefH;
  if (d.cloudFramed) el.dataset.cloudFramed = '1';
}
window._cloudSyncMeta = _cloudSyncMeta;
window._cloudPersistDataset = _cloudPersistDataset;

function _cloudBuildAtSize(d, w, h) {
  const form = _cloudNormForm(d.cloudForm);
  d.cloudForm = form;
  let circles = _generateCloudCircles(w, h, d.cloudSeed || 42, form);
  d.cloudCirclesForm = form;
  return _cloudFillFrame(circles, w, h, Math.max(2, _cloudContentPad(d) * 0.4));
}

function _cloudRemapToFrame(d, w, h) {
  d.cloudCircles = _cloudBuildAtSize(d, w, h);
  d.cloudRefW = w;
  d.cloudRefH = h;
  d.cloudFrameW = w;
  d.cloudFrameH = h;
  d.w = w;
  d.h = h;
}

function _cloudRegenerate(d, el) {
  if (!d) return;
  if (el) _cloudSyncMeta(el, d);
  const w = Math.max(24, (el && parseInt(el.style.width)) || d.cloudFrameW || d.w || 200);
  const h = Math.max(24, (el && parseInt(el.style.height)) || d.cloudFrameH || d.h || 200);
  d.w = w;
  d.h = h;
  d.cloudFrameW = w;
  d.cloudFrameH = h;
  d.cloudFramed = true;
  d.cloudCircles = _cloudBuildAtSize(d, w, h);
  d.cloudRefW = w;
  d.cloudRefH = h;
  if (el) {
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    _cloudPersistDataset(el, d);
  }
}

function _cloudBakeAndFit(d, el) {
  if (!d) return;
  if (el) _cloudSyncMeta(el, d);
  const w = d.w || (el && parseInt(el.style.width)) || 200;
  const h = d.h || (el && parseInt(el.style.height)) || 200;
  const raw = _generateCloudCircles(w, h, d.cloudSeed || 42, d.cloudForm);
  const pad = _cloudContentPad(d);
  const b = _cloudCircleBounds(raw, pad * 0.45);
  const ox = Math.floor(b.x - pad);
  const oy = Math.floor(b.y - pad);
  const refW = Math.max(24, Math.ceil(b.w + pad * 2));
  const refH = Math.max(24, Math.ceil(b.h + pad * 2));
  d.cloudCircles = raw.map(c => ({ cx: c.cx - ox, cy: c.cy - oy, r: c.r }));
  d.cloudCirclesForm = _cloudNormForm(d.cloudForm);
  d.cloudRefW = refW;
  d.cloudRefH = refH;
  d.cloudFrameW = refW;
  d.cloudFrameH = refH;
  d.cloudFramed = true;
  d.x = Math.round((d.x || 0) + ox);
  d.y = Math.round((d.y || 0) + oy);
  d.w = refW;
  d.h = refH;
  if (el) {
    el.style.left = d.x + 'px';
    el.style.top = d.y + 'px';
    el.style.width = refW + 'px';
    el.style.height = refH + 'px';
    _cloudPersistDataset(el, d);
  }
}
window._cloudBakeAndFit = _cloudBakeAndFit;
window._cloudRegenerate = _cloudRegenerate;
window._cloudResolveCircles = _cloudResolveCircles;

function _cloudShadeFromFill(fill) {
  if (!fill || fill === 'none') return '#8eb8dc';
  const hex = fill.replace('#', '');
  if (hex.length !== 6) return '#8eb8dc';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (r > 225 && g > 225 && b > 225) return '#b8ced9';
  const sr = Math.min(255, Math.round(r * 0.78 + 8));
  const sg = Math.min(255, Math.round(g * 0.82 + 12));
  const sb = Math.min(255, Math.round(b * 0.88 + 18));
  return '#'+sr.toString(16).padStart(2,'0')+sg.toString(16).padStart(2,'0')+sb.toString(16).padStart(2,'0');
}

function _cloudHighlightFromFill(fill) {
  if (!fill || fill === 'none') return '#eef6fc';
  const hex = fill.replace('#', '');
  if (hex.length !== 6) return '#eef6fc';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return '#'+Math.min(255,r+38).toString(16).padStart(2,'0')+Math.min(255,g+42).toString(16).padStart(2,'0')+Math.min(255,b+28).toString(16).padStart(2,'0');
}

function _buildCloudArtSvg(circles,fill,shade,op,uid,extra,shadow,w,h){var path=_cloudBlobsPath(circles,0),gid='cg_'+uid,opAttr=op<1?' opacity="'+op.toFixed(3)+'"':'',defs='<linearGradient id="'+gid+'" gradientUnits="userSpaceOnUse" x1="0" y1="'+(h*0.08).toFixed(1)+'" x2="0" y2="'+h.toFixed(1)+'"><stop offset="0%" stop-color="'+_cloudHighlightFromFill(fill)+'"/><stop offset="45%" stop-color="'+fill+'"/><stop offset="100%" stop-color="'+shade+'"/></linearGradient>',body='<path d="'+path+'" fill-rule="nonzero" fill="url(#'+gid+')" stroke="none" '+extra+shadow+opAttr+'/>';return '<defs>'+defs+'</defs>'+body;}

function _generateCloudPath(w, h, seed, form, d) {
  const circles = d ? _cloudResolveCircles(d, w, h) : _generateCloudCircles(w, h, seed, form);
  return _cloudBlobsPath(circles, 0);
}

function _generateCloudStrokePath(w, h, seed, sw, form, d) {
  if (!sw || sw <= 0) return '';
  const circles = d ? _cloudResolveCircles(d, w, h) : _generateCloudCircles(w, h, seed, form);
  return _cloudBlobsPath(circles, sw / 2);
}


function renderShapeEl(el,d,opts){
  opts=opts||{};
  const sh0 = typeof SHAPES !== 'undefined' ? SHAPES.find(s => s.id === d.shape) : null;
  if (sh0 && sh0.special === 'cloud') _cloudSyncMeta(el, d);
  if (sh0 && sh0.special === 'cloud' && !d.cloudFramed) {
    if (!d.cloudCircles || !d.cloudCircles.length) {
      if (typeof _cloudBakeAndFit === 'function') _cloudBakeAndFit(d, el);
    } else {
      const fw = parseInt(el.style.width) || d.w || 200;
      const fh = parseInt(el.style.height) || d.h || 200;
      d.cloudFramed = true;
      d.cloudFrameW = fw;
      d.cloudFrameH = fh;
      if (!d.cloudRefW) { d.cloudRefW = fw; d.cloudRefH = fh; }
      _cloudPersistDataset(el, d);
    }
  }
  const w = parseInt(el.style.width, 10) || 0;
  const h = parseInt(el.style.height, 10) || 0;
  if (opts.remapCloud && sh0 && sh0.special === 'cloud' && d.cloudFramed && w > 0 && h > 0) {
    const refW = Math.round(+(el.dataset.cloudRefW || d.cloudRefW) || 0);
    const refH = Math.round(+(el.dataset.cloudRefH || d.cloudRefH) || 0);
    if (w !== refW || h !== refH) {
      _cloudRemapToFrame(d, w, h);
      _cloudPersistDataset(el, d);
    }
  } else if (sh0 && sh0.special === 'cloud') {
    _cloudSyncMeta(el, d);
  }
  // Keep dataset in sync so syncProps/save read correct values
  if(d.strokeStyle)el.dataset.strokeStyle=d.strokeStyle;
  else if(!el.dataset.strokeStyle)el.dataset.strokeStyle='solid';
  if(d.shadow!=null)el.dataset.shadow=(d.shadow===true||d.shadow==='true')?'true':'false';
  if(d.shadowBlur!=null)el.dataset.shadowBlur=d.shadowBlur;
  if(d.shadowSize!=null)el.dataset.shadowSize=d.shadowSize;
  if(d.shadowColor)el.dataset.shadowColor=d.shadowColor;
  const c=el.querySelector('.sel-el');if(!c)return;
  const svgDiv=c.querySelector('.shape-svg');
  if(svgDiv){
    svgDiv.innerHTML=buildShapeSVG(d,w,h);
    const svgEl=svgDiv.querySelector('svg');
    if(svgEl){
      const pad=typeof _syncShapeShadowLayout==='function'?_syncShapeShadowLayout(el,d,w,h):0;
      if(!pad){
        svgEl.style.position='absolute';
        svgEl.style.inset='0';
        svgEl.style.width='100%';
        svgEl.style.height='100%';
      }
      svgEl.style.pointerEvents='none';
      svgEl.querySelectorAll('path,rect,ellipse,circle,polygon,polyline').forEach(p=>{
        p.style.pointerEvents='visibleFill';p.style.cursor='move';
      });
    }
  }
  // Re-apply blur overlay after re-render (size may change)
  if(el.dataset.shapeBlur>0&&typeof _applyShapeBlur==='function')_applyShapeBlur(el);
  // Always apply hit-area clip-path so transparent areas pass clicks through
  // But skip if element is currently selected — pick() manages pointer-events there
  const _d=slides[cur]&&slides[cur].els.find(e=>e.id===el.dataset.id);
  if(_d && !el.classList.contains('sel'))_applyShapeClipPath(el,_d);
}
function updateShapeStyle(prop,val){
  if(!sel||sel.dataset.type!=='shape')return;
  debouncedPushUndo();
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  if(d.type==='shape'&&typeof _cloudSyncMeta==='function'){
    const sh=typeof SHAPES!=='undefined'?SHAPES.find(s=>s.id===d.shape):null;
    if(sh&&sh.special==='cloud') _cloudSyncMeta(sel,d);
  }
  if(prop==='fill'){d.fill=val;sel.dataset.fill=val;}
  else if(prop==='stroke'){d.stroke=val;sel.dataset.stroke=val;}
  else if(prop==='sw'){
    if(d.shape==='curve' && d.curvePoints){
      if(typeof _curveSelPts!=='undefined' && _curveSelPts.size>0){
        // Initialize ALL nodes with current sw first (so hasNSw stays consistent)
        const _globalSw = d.sw != null ? +d.sw : 2;
        d.curvePoints.forEach((pt, idx) => {
          if(pt.sw == null) pt.sw = _globalSw;
        });
        // Then set selected nodes to new value
        _curveSelPts.forEach(idx=>{
          if(d.curvePoints[idx]) d.curvePoints[idx].sw=+val;
        });
        d.sw=+val; sel.dataset.sw=val;
      } else {
        // No selection: set global sw, remove per-node overrides so curve is uniform
        d.sw=+val; sel.dataset.sw=val;
        d.curvePoints.forEach(pt=>{ delete pt.sw; });
      }
      sel.dataset.curvePoints=JSON.stringify(d.curvePoints);
    } else {
      d.sw=+val;sel.dataset.sw=val;
    }
    // Rebuild curve editor so its closure d matches updated slides data
    if(typeof _buildCurveEditor==='function' && window._curveEditMode) {
      renderShapeEl(sel,d);save();drawThumbs();saveState();
      if(typeof _clearCurveEditor==='function') _clearCurveEditor();
      _buildCurveEditor();
      return;
    }
  }
  else if(prop==='strokeStyle'){d.strokeStyle=val;sel.dataset.strokeStyle=val;}
  else if(prop==='rx'){d.rx=+val;sel.dataset.rx=val;}
  else if(prop==='fillOp'){d.fillOp=+val;sel.dataset.fillOp=val;}
  else if(prop==='shadow'){d.shadow=val;sel.dataset.shadow=val;try{const opts=document.getElementById('shadow-options');if(opts)opts.style.display=val?'flex':'none';}catch(e){}}
  else if(prop==='shadowBlur'){d.shadowBlur=+val;sel.dataset.shadowBlur=val;}
  else if(prop==='shadowSize'){d.shadowSize=+val;sel.dataset.shadowSize=val;}
  else if(prop==='shadowColor'){d.shadowColor=val;sel.dataset.shadowColor=val;}
  renderShapeEl(sel,d);save();drawThumbs();saveState();
  const dCloud = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (dCloud && dCloud.type === 'shape' && typeof _cloudPersistDataset === 'function') {
    const sh = typeof SHAPES !== 'undefined' ? SHAPES.find(s => s.id === dCloud.shape) : null;
    if (sh && sh.special === 'cloud') _cloudPersistDataset(sel, dCloud);
  }
}
function updateShapeStyleScheme(prop, val, schemeRef) {
  if(sel && slides[cur]) {
    const d = slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d) {
      if(prop==='fill') { d.fillScheme = schemeRef || null; d.fill = val; sel.dataset.fill = val; }
      else if(prop==='stroke') { d.strokeScheme = schemeRef || null; d.stroke = val; sel.dataset.stroke = val; }
      else if(prop==='shadowColor') { d.shadowColorScheme = schemeRef || null; d.shadowColor = val; sel.dataset.shadowColor = val; if(schemeRef) sel.dataset.shadowColorScheme = JSON.stringify(schemeRef); else delete sel.dataset.shadowColorScheme; }
      if(d.type==='shape'&&typeof _cloudSyncMeta==='function'){
        const sh=typeof SHAPES!=='undefined'?SHAPES.find(s=>s.id===d.shape):null;
        if(sh&&sh.special==='cloud') _cloudSyncMeta(sel,d);
      }
    }
  }
  updateShapeStyle(prop, val);
}

function startEditShapeText(){
  if(!sel||sel.dataset.type!=='shape')return;
  const txt=sel.querySelector('.shape-text');if(!txt)return;
  txt.contentEditable='true';txt.style.pointerEvents='auto';txt.focus();
  // Select all
  const range=document.createRange();range.selectNodeContents(txt);
  const s=window.getSelection();s.removeAllRanges();s.addRange(range);
}
function updateShapeTextColor(v, schemeRef){
  if(!sel||sel.dataset.type!=='shape')return;
  const st=sel.querySelector('.shape-text');if(!st)return;
  // Replace only standalone color: (not background-color:)
  let cs=st.getAttribute('style')||'';
  cs=cs.replace(/(?:^|;)\s*color:\s*[^;]+/g,'').replace(/;;/g,';').replace(/^;/,'').trim();
  cs=(cs?cs+';':'')+'color:'+v+';';
  st.setAttribute('style',cs);
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(d){
    d.shapeTextColorScheme=(schemeRef!==undefined?(schemeRef||null):d.shapeTextColorScheme);
    d.shapeTextCss=cs;
  }
  try{
    const pr=document.getElementById('sh-tc-preview');if(pr)pr.style.background=v;
    const hx=document.getElementById('sh-tc-hex');if(hx)hx.value=v.replace('#','');
  }catch(e){}
  save();drawThumbs();saveState();
}
function updateShapeTextStyle(prop,val){
  if(!sel||sel.dataset.type!=='shape')return;
  const st=sel.querySelector('.shape-text');if(!st)return;
  let cs=st.getAttribute('style')||'';
  cs=cs.replace(new RegExp(prop+':[^;]+;?','i'),'')+prop+':'+val+';';
  st.setAttribute('style',cs);save();saveState();
}

// ══════════════ SVG ══════════════
// ── SVG Recent ────────────────────────────────────────────────────
const _SVG_RECENT_KEY = 'sf_svg_recent';
const _SVG_RECENT_MAX = 12;

function _svgRecentLoad() {
  try { return JSON.parse(localStorage.getItem(_SVG_RECENT_KEY) || '[]'); } catch(e) { return []; }
}
function _svgRecentSave(items) {
  try { localStorage.setItem(_SVG_RECENT_KEY, JSON.stringify(items)); } catch(e) {}
}
function _svgRecentAdd(name, code) {
  const items = _svgRecentLoad().filter(it => it.code !== code);
  items.unshift({ name: name || 'SVG', code });
  _svgRecentSave(items.slice(0, _SVG_RECENT_MAX));
}
function _svgRecentClear() {
  _svgRecentSave([]);
  _svgRecentRender();
}
function _svgRecentRender() {
  const items = _svgRecentLoad();
  const wrap = document.getElementById('svg-recent-wrap');
  const grid = document.getElementById('svg-recent-grid');
  if (!wrap || !grid) return;
  if (!items.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  grid.innerHTML = '';
  items.forEach((it, i) => {
    const cell = document.createElement('div');
    cell.title = it.name;
    cell.style.cssText = 'aspect-ratio:1;border:1.5px solid var(--border);border-radius:6px;cursor:pointer;overflow:hidden;background:var(--surface2);display:flex;align-items:center;justify-content:center;padding:4px;box-sizing:border-box;transition:border-color .15s';
    cell.innerHTML = it.code;
    const svgEl = cell.querySelector('svg');
    if (svgEl) { svgEl.style.cssText = 'width:100%;height:100%;pointer-events:none'; }
    cell.addEventListener('mouseenter', () => cell.style.borderColor = 'var(--selb)');
    cell.addEventListener('mouseleave', () => cell.style.borderColor = 'var(--border)');
    cell.addEventListener('click', () => {
      document.getElementById('svg-code').value = it.code;
      // Highlight selected
      grid.querySelectorAll('div').forEach(c => c.style.borderColor = 'var(--border)');
      cell.style.borderColor = 'var(--selb)';
    });
    grid.appendChild(cell);
  });
}

// Edit mode: double-click on existing SVG element
let _svgEditMode = false;
function openSVGModalEdit() {
  _svgEditMode = true;
  const d = sel && slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  document.getElementById('svg-code').value = d.svgContent || '';
  document.getElementById('svg-modal-title').textContent = '⬡ Редактировать SVG';
  document.getElementById('svg-modal-btn').textContent = 'Применить';
  _svgRecentRender();
  document.getElementById('svg-modal').classList.add('open');
}
function openSVGModal() {
  _svgEditMode = false;
  document.getElementById('svg-code').value = '';
  const title = document.getElementById('svg-modal-title');
  const btn = document.getElementById('svg-modal-btn');
  if (title) title.textContent = '⬡ Вставить SVG';
  if (btn) btn.textContent = 'Вставить';
  _svgRecentRender();
  document.getElementById('svg-modal').classList.add('open');
}
function _closeSvgModal() {
  document.getElementById('svg-modal').classList.remove('open');
  document.getElementById('svg-code').value = '';
  _svgEditMode = false;
}
function loadSVGFile(e) {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    const code = ev.target.result;
    document.getElementById('svg-code').value = code;
    // Save to recent with filename
    _svgRecentAdd(f.name.replace(/\.svg$/i, ''), code);
    _svgRecentRender();
  };
  r.readAsText(f);
  e.target.value = '';
}
function insertSVG() {
  const code = document.getElementById('svg-code').value.trim();
  if (!code) return toast('Paste SVG code');
  if (!code.includes('<svg')) return toast('Invalid SVG');

  if (_svgEditMode && sel) {
    // Edit existing SVG element
    const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
    if (d) {
      pushUndo();
      d.svgContent = code;
      // Re-render element
      const el = document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
      if (el) {
        const c = el.querySelector('.ec') || el;
        c.innerHTML = '';
        try {
          const _dp = new DOMParser();
          const _doc = _dp.parseFromString(code, 'image/svg+xml');
          const _p = _doc.documentElement;
          if (_p && _p.tagName !== 'parsererror') { c.appendChild(document.adoptNode(_p)); }
          else { c.innerHTML = code; }
        } catch(err) { c.innerHTML = code; }
        const svgEl = c.querySelector('svg');
        if (svgEl) { svgEl.style.width='100%'; svgEl.style.height='100%'; }
      }
      save(); drawThumbs(); saveState();
      _svgRecentAdd('edited', code);
    }
  } else {
    // Insert new SVG element
    pushUndo();
    const d = {id:'e'+(++ec),type:'svg',x:snapV(100),y:snapV(100),w:snapV(300),h:snapV(300),svgContent:code,rot:0,anims:[]};
    slides[cur].els.push(d); mkEl(d); save(); drawThumbs(); saveState();
    _svgRecentAdd('SVG', code);
  }
  _closeSvgModal();
}
function _expArcPath(cx,cy,rx,ry,a1,a2,mode,m,cr){rx=Math.max(1,rx-m);ry=Math.max(1,ry-m);cr=Math.max(0,cr||0);var toR=function(a){return(a-90)*Math.PI/180;};var r1=toR(a1),r2=toR(a2);var x1=cx+rx*Math.cos(r1),y1=cy+ry*Math.sin(r1);var x2=cx+rx*Math.cos(r2),y2=cy+ry*Math.sin(r2);var diff=((a2-a1)%360+360)%360;var large=diff>180?1:0;if(cr<=0){if(mode==='sector')return 'M '+cx+' '+cy+' L '+x1.toFixed(2)+' '+y1.toFixed(2)+' A '+rx+' '+ry+' 0 '+large+' 1 '+x2.toFixed(2)+' '+y2.toFixed(2)+' Z';return 'M '+x1.toFixed(2)+' '+y1.toFixed(2)+' A '+rx+' '+ry+' 0 '+large+' 1 '+x2.toFixed(2)+' '+y2.toFixed(2)+' Z';}var avgR=(rx+ry)/2;var angStep=Math.min(cr/(avgR*Math.PI/180),diff*0.35);var a1o=a1+angStep,a2o=a2-angStep;var ra1=toR(a1o),ra2=toR(a2o);var ax1=cx+rx*Math.cos(ra1),ay1=cy+ry*Math.sin(ra1);var ax2=cx+rx*Math.cos(ra2),ay2=cy+ry*Math.sin(ra2);var dN=((a2o-a1o)%360+360)%360;var lN=dN>180?1:0;function cwT(rad){var tx=-rx*Math.sin(rad),ty=ry*Math.cos(rad);var l=Math.hypot(tx,ty)||1;return[tx/l,ty/l];}function unit(ax,ay,bx,by){var l=Math.hypot(bx-ax,by-ay)||1;return[(bx-ax)/l,(by-ay)/l];}function rc(vx,vy,u1x,u1y,max1,u2x,u2y,max2){var r=Math.min(cr,max1,max2);if(r<0.5)return null;var p1x=vx+u1x*r,p1y=vy+u1y*r,p2x=vx+u2x*r,p2y=vy+u2y*r;var cosA=Math.max(-1,Math.min(1,u1x*u2x+u1y*u2y));var k=Math.max((4/3)*Math.tan(Math.acos(cosA)/4),0.55);return{p1x:p1x,p1y:p1y,cp1x:p1x-u1x*r*k,cp1y:p1y-u1y*r*k,p2x:p2x,p2y:p2y,cp2x:p2x-u2x*r*k,cp2y:p2y-u2y*r*k};}function arcEntry(ax,ay,ar,lux,luy,acx,acy,acr){var r=Math.min(cr,Math.hypot(ax-cx,ay-cy)*0.45);var lax=ax+lux*r,lay=ay+luy*r;var cp1x=lax-lux*r*0.55,cp1y=lay-luy*r*0.55;var t=cwT(acr);var chord=Math.hypot(acx-ax,acy-ay);var cp2x=acx-t[0]*chord*0.45,cp2y=acy-t[1]*chord*0.45;return{lax:lax,lay:lay,cp1x:cp1x,cp1y:cp1y,cp2x:cp2x,cp2y:cp2y};}function arcExit(ax,ay,ar,lux,luy,acx,acy,acr){var r=Math.min(cr,Math.hypot(ax-cx,ay-cy)*0.45);var lax=ax+lux*r,lay=ay+luy*r;var cp2x=lax-lux*r*0.55,cp2y=lay-luy*r*0.55;var t=cwT(acr);var chord=Math.hypot(acx-ax,acy-ay);var cp1x=acx+t[0]*chord*0.45,cp1y=acy+t[1]*chord*0.45;return{lax:lax,lay:lay,cp1x:cp1x,cp1y:cp1y,cp2x:cp2x,cp2y:cp2y};}if(mode==='sector'){var side=Math.hypot(x1-cx,y1-cy);var maxS=side*0.45;var lu1=unit(x1,y1,cx,cy);var eS=arcEntry(x1,y1,r1,lu1[0],lu1[1],ax1,ay1,ra1);var lu2=unit(x2,y2,cx,cy);var eE=arcExit(x2,y2,r2,lu2[0],lu2[1],ax2,ay2,ra2);var u5=unit(cx,cy,x2,y2),u6=unit(cx,cy,x1,y1);var cC=rc(cx,cy,u5[0],u5[1],maxS,u6[0],u6[1],maxS);if(!cC)return 'M '+cx+' '+cy+' L '+x1.toFixed(2)+' '+y1.toFixed(2)+' A '+rx+' '+ry+' 0 '+large+' 1 '+x2.toFixed(2)+' '+y2.toFixed(2)+' Z';return 'M '+cC.p2x.toFixed(2)+' '+cC.p2y.toFixed(2)+' L '+eS.lax.toFixed(2)+' '+eS.lay.toFixed(2)+' C '+eS.cp1x.toFixed(2)+' '+eS.cp1y.toFixed(2)+' '+eS.cp2x.toFixed(2)+' '+eS.cp2y.toFixed(2)+' '+ax1.toFixed(2)+' '+ay1.toFixed(2)+' A '+rx+' '+ry+' 0 '+lN+' 1 '+ax2.toFixed(2)+' '+ay2.toFixed(2)+' C '+eE.cp1x.toFixed(2)+' '+eE.cp1y.toFixed(2)+' '+eE.cp2x.toFixed(2)+' '+eE.cp2y.toFixed(2)+' '+eE.lax.toFixed(2)+' '+eE.lay.toFixed(2)+' L '+cC.p1x.toFixed(2)+' '+cC.p1y.toFixed(2)+' C '+cC.cp1x.toFixed(2)+' '+cC.cp1y.toFixed(2)+' '+cC.cp2x.toFixed(2)+' '+cC.cp2y.toFixed(2)+' '+cC.p2x.toFixed(2)+' '+cC.p2y.toFixed(2)+' Z';}var chLen=Math.hypot(x2-x1,y2-y1);var maxR=chLen*0.45;var ch=unit(x1,y1,x2,y2);var cS2=arcEntry(x1,y1,r1,ch[0],ch[1],ax1,ay1,ra1);var cE2=arcExit(x2,y2,r2,-ch[0],-ch[1],ax2,ay2,ra2);return 'M '+cS2.lax.toFixed(2)+' '+cS2.lay.toFixed(2)+' C '+cS2.cp1x.toFixed(2)+' '+cS2.cp1y.toFixed(2)+' '+cS2.cp2x.toFixed(2)+' '+cS2.cp2y.toFixed(2)+' '+ax1.toFixed(2)+' '+ay1.toFixed(2)+' A '+rx+' '+ry+' 0 '+lN+' 1 '+ax2.toFixed(2)+' '+ay2.toFixed(2)+' C '+cE2.cp1x.toFixed(2)+' '+cE2.cp1y.toFixed(2)+' '+cE2.cp2x.toFixed(2)+' '+cE2.cp2y.toFixed(2)+' '+cE2.lax.toFixed(2)+' '+cE2.lay.toFixed(2)+' L '+cS2.lax.toFixed(2)+' '+cS2.lay.toFixed(2)+' Z';}
function _expStarPath(cx,cy,erx,ery,nRays,innerR,cr){nRays=Math.max(4,Math.min(32,nRays));var ir=Math.max(0.1,Math.min(0.9,innerR));var pts=[];for(var i=0;i<nRays*2;i++){var a=(i/(nRays*2))*Math.PI*2-Math.PI/2;var r=i%2===0?1:ir;pts.push({x:cx+erx*r*Math.cos(a),y:cy+ery*r*Math.sin(a)});}if(cr>0)return _expRndPath(pts,cr);return 'M '+pts.map(function(p){return p.x.toFixed(2)+','+p.y.toFixed(2);}).join(' L ')+' Z';}

function _expVarStroke(pts,w,h,closed,defaultSw,strokeColor,shadowAttr){
  var STEPS=36;
  function sample(prev,curr){
    var hwA=(prev.sw!=null?prev.sw:defaultSw)/2,hwB=(curr.sw!=null?curr.sw:defaultSw)/2;
    var p0={x:prev.x*w,y:prev.y*h},p3={x:curr.x*w,y:curr.y*h};
    var p1={x:(prev.cp2x!=null?prev.cp2x:prev.x)*w,y:(prev.cp2y!=null?prev.cp2y:prev.y)*h};
    var p2={x:(curr.cp1x!=null?curr.cp1x:curr.x)*w,y:(curr.cp1y!=null?curr.cp1y:curr.y)*h};
    var out=[];
    for(var k=0;k<=STEPS;k++){
      var t=k/STEPS,u=1-t;
      var x=u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x;
      var y=u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y;
      var tx=3*(u*u*(p1.x-p0.x)+2*u*t*(p2.x-p1.x)+t*t*(p3.x-p2.x));
      var ty=3*(u*u*(p1.y-p0.y)+2*u*t*(p2.y-p1.y)+t*t*(p3.y-p2.y));
      var tl=Math.hypot(tx,ty)||1e-9;tx/=tl;ty/=tl;
      var hw=hwA+(hwB-hwA)*t;
      out.push({x:x,y:y,nx:-ty,ny:tx,tx:tx,ty:ty,hw:hw});
    }
    return out;
  }
  function cmPath(arr){
    if(!arr.length)return'';
    var d='M '+arr[0].x.toFixed(2)+' '+arr[0].y.toFixed(2);
    for(var i=0;i<arr.length-1;i++){
      var p0=arr[Math.max(0,i-1)],p1=arr[i],p2=arr[i+1],p3=arr[Math.min(arr.length-1,i+2)];
      var c1={x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6};
      var c2={x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6};
      d+=' C '+c1.x.toFixed(2)+' '+c1.y.toFixed(2)+' '+c2.x.toFixed(2)+' '+c2.y.toFixed(2)+' '+p2.x.toFixed(2)+' '+p2.y.toFixed(2);
    }
    return d;
  }
  function shortArc(jx,jy,r,a0,a1){
    var da=a1-a0;
    while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
    var res=[],N=10;
    for(var k=0;k<=N;k++){var a=a0+da*k/N;res.push({x:jx+r*Math.cos(a),y:jy+r*Math.sin(a)});}
    return res;
  }
  function rjoin(jx,jy,r,inTx,inTy,inNx,inNy,outTx,outTy,outNx,outNy){
    var cross=inTx*outTy-inTy*outTx;
    var inLx=jx+inNx*r,inLy=jy+inNy*r,inRx=jx-inNx*r,inRy=jy-inNy*r;
    var outLx=jx+outNx*r,outLy=jy+outNy*r,outRx=jx-outNx*r,outRy=jy-outNy*r;
    function innerPtFn(ax,ay,bx,by){var a0=Math.atan2(ay-jy,ax-jx),a1=Math.atan2(by-jy,bx-jx);var da=a1-a0;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;var am=a0+da/2;return{x:jx+r*Math.cos(am),y:jy+r*Math.sin(am)};}
    var dot2=inTx*outTx+inTy*outTy;
    if(Math.abs(cross)<0.02){
      if(dot2>0.98)return{Lpts:[{x:outLx,y:outLy}],Rpts:[{x:outRx,y:outRy}]};
      var aIn=Math.atan2(inLy-jy,inLx-jx),aOut=Math.atan2(outLy-jy,outLx-jx);
      var aInR=Math.atan2(inRy-jy,inRx-jx),aOutR=Math.atan2(outRy-jy,outRx-jx);
      var daL=aOut-aIn;while(daL>Math.PI)daL-=2*Math.PI;while(daL<-Math.PI)daL+=2*Math.PI;
      var daR=aOutR-aInR;while(daR>Math.PI)daR-=2*Math.PI;while(daR<-Math.PI)daR+=2*Math.PI;
      if(Math.abs(daL)>=Math.abs(daR)){return{Lpts:shortArc(jx,jy,r,aIn,aOut),Rpts:[innerPtFn(inRx,inRy,outRx,outRy)]};}
      else{return{Lpts:[innerPtFn(inLx,inLy,outLx,outLy)],Rpts:shortArc(jx,jy,r,aInR,aOutR)};}
    }
    if(cross<0){var ip=innerPtFn(inRx,inRy,outRx,outRy);return{Lpts:shortArc(jx,jy,r,Math.atan2(inLy-jy,inLx-jx),Math.atan2(outLy-jy,outLx-jx)),Rpts:[ip]};}else{var ip=innerPtFn(inLx,inLy,outLx,outLy);return{Lpts:[ip],Rpts:shortArc(jx,jy,r,Math.atan2(inRy-jy,inRx-jx),Math.atan2(outRy-jy,outRx-jx))};}
  }
  function endCap(cx,cy,r,fromA,n){
    var res=[];for(var k=1;k<=n;k++){var a=fromA-Math.PI*k/n;res.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)});}return res;
  }
  var allPts=closed?pts.concat([pts[0]]):pts,nSegs=allPts.length-1,SS=[];
  for(var si=0;si<nSegs;si++)SS.push(sample(pts[si],allPts[si+1]));
  var L=[],R=[];
  for(var si=0;si<nSegs;si++){
    var samp=SS[si],isFirst=si===0,isLast=si===nSegs-1;
    for(var k=(isFirst?0:1);k<(isLast?samp.length:samp.length-1);k++){
      var s=samp[k];L.push({x:s.x+s.nx*s.hw,y:s.y+s.ny*s.hw});R.push({x:s.x-s.nx*s.hw,y:s.y-s.ny*s.hw});
    }
    if(!isLast){
      var cur=samp[samp.length-1],next=SS[si+1][0];
      var j=rjoin(cur.x,cur.y,cur.hw,cur.tx,cur.ty,cur.nx,cur.ny,next.tx,next.ty,next.nx,next.ny);
      j.Lpts.forEach(function(p){L.push(p);});j.Rpts.forEach(function(p){R.push(p);});
    }
  }
  if(L.length<2)return'';
  var firstS=SS[0][0],lastS=SS[nSegs-1][SS[nSegs-1].length-1];
  var Rrev=R.slice().reverse(),d;
  if(closed){d=cmPath(L)+' Z '+cmPath(Rrev)+' Z';}
  else{
    var sa=endCap(firstS.x,firstS.y,firstS.hw,Math.atan2(R[0].y-firstS.y,R[0].x-firstS.x),8);
    var ea=endCap(lastS.x,lastS.y,lastS.hw,Math.atan2(L[L.length-1].y-lastS.y,L[L.length-1].x-lastS.x),8);
    d=cmPath([R[0]].concat(sa,L,ea,Rrev))+' Z';
  }
  return '<path d="'+d+'" fill="'+strokeColor+'" stroke="none" '+(shadowAttr||'')+'/>';
}

// ══════════════ UNIFORM SHADOW (export — matches editor) ══════════════
function _shadowEffectiveBlur(ss, sb) {
  ss = Math.max(0, +ss || 0);
  sb = Math.max(0, +sb || 0);
  if (sb <= 0) return 0;
  return sb + Math.max(1.2, ss * 0.45);
}
function _textShadowParams(d) {
  if (!d) return { ss: 0, sb: 0, sc: '#000000' };
  var ss = d.textShadowSize != null ? +d.textShadowSize : 0;
  var sb = d.textShadowBlur != null ? +d.textShadowBlur : 0;
  if (!ss && !sb && d.textShadowW && +d.textShadowW > 0) {
    sb = +d.textShadowW;
    ss = Math.max(1, Math.round(sb * 0.35));
  }
  return { ss: ss, sb: sb, sc: d.textShadowColor || '#000000' };
}
function _textShadowCssFrom(ss, sb, c, legacyW) {
  var p = _textShadowParams({ textShadowSize: ss, textShadowBlur: sb, textShadowColor: c, textShadowW: legacyW });
  ss = p.ss; sb = p.sb; c = p.sc;
  if (ss <= 0 && sb <= 0) return '';
  var effBlur = sb > 0 ? _shadowEffectiveBlur(ss, sb) : sb;
  if (ss <= 0) return '0 0 ' + effBlur + 'px ' + c;
  if (sb <= 0) {
    var parts = [];
    for (var i = 0; i < 16; i++) {
      var a = (i / 16) * Math.PI * 2;
      parts.push(Math.round(Math.cos(a) * ss) + 'px ' + Math.round(Math.sin(a) * ss) + 'px 0 ' + c);
    }
    return parts.join(', ');
  }
  var parts2 = [];
  for (var j = 0; j < 12; j++) {
    var a2 = (j / 12) * Math.PI * 2;
    parts2.push(Math.round(Math.cos(a2) * ss) + 'px ' + Math.round(Math.sin(a2) * ss) + 'px ' + effBlur + 'px ' + c);
  }
  return parts2.join(', ');
}
function _textShadowActive(d) {
  if (!d) return false;
  if (+d.textShadowSize > 0 || +d.textShadowBlur > 0) return true;
  return !!(d.textShadowW && +d.textShadowW > 0);
}
function _expEnsureTextShadowHost() {
  var host = document.getElementById('_exp_txt_shadow_svg');
  if (!host) {
    host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    host.id = '_exp_txt_shadow_svg';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    host.appendChild(defs);
    document.body.appendChild(host);
  }
  return host.querySelector('defs');
}
function _expApplyTextShadow(vi, el, d) {
  if (!vi || !_textShadowActive(d)) {
    if (vi) { vi.style.filter = ''; vi.style.textShadow = ''; }
    return;
  }
  var p = _textShadowParams(d);
  var fid = 'txtsh_' + d.id;
  var defs = _expEnsureTextShadowHost();
  var old = defs.querySelector('#' + fid);
  if (old) old.remove();
  var flt = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  flt.setAttribute('id', fid);
  flt.setAttribute('x', '-50%');
  flt.setAttribute('y', '-50%');
  flt.setAttribute('width', '200%');
  flt.setAttribute('height', '200%');
  flt.innerHTML = _shadowFilterInner(p.ss, p.sb, p.sc);
  defs.appendChild(flt);
  vi.style.textShadow = '';
  vi.style.filter = 'url(#' + fid + ')';
  vi.style.overflow = 'visible';
  if (el) el.style.overflow = 'visible';
  var v = el && el.querySelector('.psel-txt');
  if (v) v.style.overflow = 'visible';
}
function _expApplySvgShadow(el, d) {
  if (!el || !d || !d.svgShadow) {
    if (el) el.style.filter = '';
    return;
  }
  var ss = d.svgShadowSize != null ? +d.svgShadowSize : 4;
  var sb = d.svgShadowBlur != null ? +d.svgShadowBlur : 15;
  var sc = d.svgShadowColor || '#000000';
  var fid = 'svgsh_' + (d.id || 'x');
  var defs = _expEnsureTextShadowHost();
  var old = defs.querySelector('#' + fid);
  if (old) old.remove();
  var flt = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  flt.setAttribute('id', fid);
  flt.setAttribute('x', '-50%');
  flt.setAttribute('y', '-50%');
  flt.setAttribute('width', '200%');
  flt.setAttribute('height', '200%');
  flt.innerHTML = _shadowFilterInner(ss, sb, sc);
  defs.appendChild(flt);
  el.style.filter = 'url(#' + fid + ')';
}
function _expApplyImgShadow(el, d) {
  if (!el || !d || !d.imgShadow) {
    if (el) el.style.filter = '';
    return;
  }
  var ss = d.imgShadowSize != null ? +d.imgShadowSize : 4;
  var sb = d.imgShadowBlur != null ? +d.imgShadowBlur : 15;
  var sc = d.imgShadowColor || '#000000';
  var fid = 'imgsh_' + (d.id || 'x');
  var defs = _expEnsureTextShadowHost();
  var old = defs.querySelector('#' + fid);
  if (old) old.remove();
  var flt = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  flt.setAttribute('id', fid);
  flt.setAttribute('x', '-50%');
  flt.setAttribute('y', '-50%');
  flt.setAttribute('width', '200%');
  flt.setAttribute('height', '200%');
  flt.innerHTML = _shadowFilterInner(ss, sb, sc);
  defs.appendChild(flt);
  el.style.filter = 'url(#' + fid + ')';
  el.style.overflow = 'visible';
}
function _shadowPad(ss, sb, sw) {
  ss = Math.max(0, +ss || 0);
  sb = Math.max(0, +sb || 0);
  sw = Math.max(0, +sw || 0);
  var eff = sb > 0 ? _shadowEffectiveBlur(ss, sb) : sb;
  return Math.ceil(ss + eff * 3.5 + sw + 20);
}
function _shadowFilterInner(ss, sb, sc) {
  ss = Math.max(0, +ss || 0);
  sb = Math.max(0, +sb || 0);
  sc = sc || '#000000';
  var chain = '<feMorphology in="SourceAlpha" operator="dilate" radius="'+ss+'" result="spread"/>';
  if (sb > 0) {
    var blurDev = _shadowEffectiveBlur(ss, sb);
    chain += '<feGaussianBlur in="spread" stdDeviation="'+blurDev+'" result="blur"/>';
    chain += '<feFlood flood-color="'+sc+'" flood-opacity="0.65" result="color"/>';
    chain += '<feComposite in="color" in2="blur" operator="in" result="shadow"/>';
  } else {
    chain += '<feFlood flood-color="'+sc+'" flood-opacity="1" result="color"/>';
    chain += '<feComposite in="color" in2="spread" operator="in" result="shadow"/>';
  }
  chain += '<feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>';
  return chain;
}
function _shadowFilterDefUser(id, ss, sb, sc, w, h, sw) {
  var pad = _shadowPad(ss, sb, sw);
  w = Math.max(1, +w || 100);
  h = Math.max(1, +h || 100);
  return '<filter id="'+id+'" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="'+(-pad)+'" y="'+(-pad)+'" width="'+(w+pad*2)+'" height="'+(h+pad*2)+'">'+_shadowFilterInner(ss,sb,sc)+'</filter>';
}
function _syncShapeShadowLayout(el, d, w, h) {
  var svgDiv = el && el.querySelector('.shape-svg');
  if (!svgDiv) return 0;
  var on = d && (d.shadow === true || d.shadow === 'true');
  var pad = on ? _shadowPad(d.shadowSize, d.shadowBlur, d.sw) : 0;
  if (pad > 0) {
    svgDiv.style.cssText = 'position:absolute;left:-'+pad+'px;top:-'+pad+'px;width:calc(100% + '+(pad*2)+'px);height:calc(100% + '+(pad*2)+'px);overflow:visible;';
    el.style.overflow = 'visible';
    var selEl = el.querySelector('.sel-el');
    if (selEl) selEl.style.overflow = 'visible';
    var ec = el.querySelector('.ec');
    if (ec) ec.style.overflow = 'visible';
    var svgEl = svgDiv.querySelector('svg');
    if (svgEl) svgEl.style.overflow = 'visible';
  } else {
    svgDiv.style.cssText = 'position:absolute;inset:0;overflow:visible;';
  }
  return pad;
}

function buildShapeSVG(d,w,h){var SHAPES=SHAPES_DATA;var sh=SHAPES.find(function(s){return s.id===d.shape;})||SHAPES[0];var op=d.fillOp===undefined?1:+d.fillOp;var _noFill=sh.noFill||false;var fill=(_noFill||d.fill==='none')?'none':(d.fill&&d.fill!=='none'?d.fill:'#3b82f6');var hasFill=fill!=='none';var sw=d.sw===undefined?2:+d.sw;var sc=d.stroke||'#1d4ed8';var ss=d.strokeStyle||'solid';var isC=ss==='wave'||ss==='zigzag';var isDbl=ss==='double';var margin=(!isC&&sw>0)?sw/2:0;var shadow=d.shadow?'filter="url(#sh_'+d.id+')"':'';function shEl(fA,sA,m,ex){ex=ex||'';var ew=Math.max(1,w-m*2),eh=Math.max(1,h-m*2);if(sh.special==='rect')return '<rect x="'+m+'" y="'+m+'" width="'+ew+'" height="'+eh+'" rx="'+(d.rx||0)+'" '+fA+' '+sA+' '+ex+' '+shadow+'/>';if(sh.special==='ellipse'){var _a1e=d.arcStart!=null?+d.arcStart:0;var _a2e=d.arcEnd!=null?+d.arcEnd:360;var _modee=d.arcMode||'full';if(_modee!=='full'&&Math.abs(_a2e-_a1e)<360){var _ape=_expArcPath(w/2,h/2,w/2,h/2,_a1e,_a2e,_modee,m,d.rx||0);return '<path d="'+_ape+'" '+fA+' '+sA+' '+ex+' '+shadow+'/>';}return '<ellipse cx="'+(w/2)+'" cy="'+(h/2)+'" rx="'+(ew/2)+'" ry="'+(eh/2)+'" '+fA+' '+sA+' '+ex+' '+shadow+'/>';}if(sh.special==='polygon'){var _sides=Math.max(3,Math.min(16,+(d.polySides||3)));var _pts=[];for(var _i=0;_i<_sides;_i++){var _a=(_i/_sides*Math.PI*2)-(Math.PI/2);_pts.push({x:w/2+ew/2*Math.cos(_a),y:h/2+eh/2*Math.sin(_a)});}var _pp=_pts.map(function(p){return p.x.toFixed(2)+','+p.y.toFixed(2);}).join(' ');var _polyPath='M '+_pp+' Z';if((d.rx||0)>0)_polyPath=_expRndPath(_pts,d.rx);return '<path d="'+_polyPath+'" '+fA+' '+sA+' '+ex+' '+shadow+'/>';}if(sh.special==='star'){var _nR=Math.max(4,Math.min(32,+(d.starRays||5)));var _iR=Math.max(0.1,Math.min(0.9,+(d.starInner!=null?d.starInner:0.45)));var _sp=_expStarPath(w/2,h/2,ew/2,eh/2,_nR,_iR,d.rx||0);return '<path d="'+_sp+'" '+fA+' '+sA+' '+ex+' '+shadow+'/>';}if(sh.special==='cloud'){var _circles=_cloudResolveCircles(d,w,h);var _cPath=_cloudBlobsPath(_circles,0);var _strokePart='';if(sw>0){var _sPath=_cloudBlobsPath(_circles,sw/2);_strokePart='<path d="'+_sPath+'" fill-rule="nonzero" fill="'+sc+'" stroke="none" '+ex+'/>';}var _fillPart='';if(hasFill){if(d.fillGrad&&d.fillGrad2){_fillPart='<path d="'+_cPath+'" fill-rule="nonzero" '+fA+' stroke="none" '+ex+' '+shadow+'/>';}else{_fillPart=_buildCloudArtSvg(_circles,fill,_cloudShadeFromFill(fill),op,d.id,ex,shadow,w,h);}}return _strokePart+_fillPart;}if(sh.special==='parallelogram'){var _skewEx=Math.max(-45,Math.min(45,+(d.paraSkew!=null?d.paraSkew:20)));var _offEx=Math.round((eh/2)*Math.tan(_skewEx*Math.PI/180));var _pxEx=[{x:m+_offEx,y:m},{x:m+ew,y:m},{x:m+ew-_offEx,y:m+eh},{x:m,y:m+eh}];var _rx=d.rx||0;var _ppEx;if(_rx>0){_ppEx=_expRndPath(_pxEx,_rx);}else{_ppEx='M '+_pxEx[0].x+' '+_pxEx[0].y+' L '+_pxEx[1].x+' '+_pxEx[1].y+' L '+_pxEx[2].x+' '+_pxEx[2].y+' L '+_pxEx[3].x+' '+_pxEx[3].y+' Z';}return '<path d="'+_ppEx+'" '+fA+' '+sA+' '+ex+' '+shadow+'/>';}if(sh.special==='curve'){var _cpts=d.curvePoints;if(!_cpts||_cpts.length<2)return null;var _hasNSw=_cpts.some(function(p){return p.sw!=null;});if(_hasNSw&&sw>0){return _expVarStroke(_cpts,w,h,!!d.curveClosed,sw,sc,shadow);}function _cpx(v){return (v*w).toFixed(2);}function _cpy(v){return (v*h).toFixed(2);}var _cd='M '+_cpx(_cpts[0].x)+' '+_cpy(_cpts[0].y);for(var _ci=1;_ci<_cpts.length;_ci++){var _pp=_cpts[_ci-1],_cp=_cpts[_ci];var _c1x=_pp.cp2x!=null?_pp.cp2x:_pp.x,_c1y=_pp.cp2y!=null?_pp.cp2y:_pp.y;var _c2x=_cp.cp1x!=null?_cp.cp1x:_cp.x,_c2y=_cp.cp1y!=null?_cp.cp1y:_cp.y;_cd+=' C '+_cpx(_c1x)+' '+_cpy(_c1y)+' '+_cpx(_c2x)+' '+_cpy(_c2y)+' '+_cpx(_cp.x)+' '+_cpy(_cp.y);}return '<path d="'+_cd+'" '+fA+' '+sA+' '+ex+' '+shadow+' stroke-linecap="round" stroke-linejoin="round"/>';}if(sh.special==='chevron'){var _csk=d.chevSkew!=null?+d.chevSkew:25;var _cil=sh.id==='chevronLeft';var _cts=Math.max(0,Math.min(45,_csk))/100;var _ctp=Math.round(ew*_cts);var _cin=Math.max(0,Math.min(45,d.chevInner!=null?+d.chevInner:_csk))/100;var _cind=Math.round(ew*_cin);var _cmd=Math.round(eh/2);var _cpth=_cil?('M '+ew+' 0 L '+_ctp+' 0 L 0 '+_cmd+' L '+_ctp+' '+eh+' L '+ew+' '+eh+' L '+(ew-_cind)+' '+_cmd+' Z'):('M 0 0 L '+(ew-_ctp)+' 0 L '+ew+' '+_cmd+' L '+(ew-_ctp)+' '+eh+' L 0 '+eh+' L '+_cind+' '+_cmd+' Z');var _crx=d.rx||0;var _cfin;var _cptsParsed=[];var _ctokens=_cpth.split(' ');for(var _ti=0;_ti<_ctokens.length-1;_ti++){if(_ctokens[_ti]==='M'||_ctokens[_ti]==='L'){var _cx=parseFloat(_ctokens[_ti+1]),_cy=parseFloat(_ctokens[_ti+2]);if(!isNaN(_cx)&&!isNaN(_cy)){_cptsParsed.push({x:_cx+m,y:_cy+m});_ti+=2;}}}if(_crx>0&&_cptsParsed.length>=3){_cfin=_expRndPath(_cptsParsed,_crx);}else{_cfin='M';for(var _pi=0;_pi<_cptsParsed.length;_pi++){_cfin+=(_pi===0?'':' L')+' '+_cptsParsed[_pi].x.toFixed(1)+' '+_cptsParsed[_pi].y.toFixed(1);}_cfin+=' Z';}return '<path d="'+_cfin+'" '+fA+' '+sA+' '+ex+' '+shadow+'/>';}if(sh.special==='callout')return null;if(!sh.path)return null;var cnt=0,sx=ew/90,sy=eh/90,rawP=sh.path.split(' ').map(function(tok){if(tok==='M'||tok==='L'||tok==='Z')return tok;var v=parseFloat(tok);if(isNaN(v))return tok;var i=cnt++;return String(i%2===0?Math.round((v-5)*sx+m):Math.round((v-5)*sy+m));}).join(' ');var rx=d.rx||0,sp=rawP;if(rx>0){var pp=_expExtPts(rawP);if(pp.length>=3)sp=_expRndPath(pp,rx);}return '<path d="'+sp+'" '+fA+' '+sA+' '+ex+' '+shadow+'/>';}function shPS(m){var ew=Math.max(1,w-m*2),eh=Math.max(1,h-m*2);if(sh.special==='rect'){var rxr=d.rx||0;if(rxr>0)return 'M '+(m+rxr)+' '+m+' H '+(m+ew-rxr)+' Q '+(m+ew)+' '+m+' '+(m+ew)+' '+(m+rxr)+' V '+(m+eh-rxr)+' Q '+(m+ew)+' '+(m+eh)+' '+(m+ew-rxr)+' '+(m+eh)+' H '+(m+rxr)+' Q '+m+' '+(m+eh)+' '+m+' '+(m+eh-rxr)+' V '+(m+rxr)+' Q '+m+' '+m+' '+(m+rxr)+' '+m+' Z';return 'M '+m+' '+m+' H '+(m+ew)+' V '+(m+eh)+' H '+m+' Z';}if(sh.special==='ellipse'){var _a1s2=d.arcStart!=null?+d.arcStart:0;var _a2s2=d.arcEnd!=null?+d.arcEnd:360;var _ms2=d.arcMode||'full';if(_ms2!=='full'&&Math.abs(_a2s2-_a1s2)<360)return _expArcPath(w/2,h/2,w/2,h/2,_a1s2,_a2s2,_ms2,m,0);var cx2=w/2,cy2=h/2,erx2=ew/2,ery2=eh/2;return 'M '+(cx2-erx2)+' '+cy2+' A '+erx2+' '+ery2+' 0 1 1 '+(cx2+erx2)+' '+cy2+' A '+erx2+' '+ery2+' 0 1 1 '+(cx2-erx2)+' '+cy2+' Z';}if(sh.special==='polygon'){var _sides2=Math.max(3,Math.min(16,+(d.polySides||3)));var _pts2=[];for(var _j=0;_j<_sides2;_j++){var _a2j=(_j/_sides2*Math.PI*2)-(Math.PI/2);_pts2.push((w/2+ew/2*Math.cos(_a2j)).toFixed(2)+','+(h/2+eh/2*Math.sin(_a2j)).toFixed(2));}return 'M '+_pts2.join(' L ')+' Z';}if(sh.special==='star'){var _nR2=Math.max(4,Math.min(32,+(d.starRays||5)));var _iR2=Math.max(0.1,Math.min(0.9,+(d.starInner!=null?d.starInner:0.45)));return _expStarPath(w/2,h/2,ew/2,eh/2,_nR2,_iR2,0);}if(sh.special==='callout')return null;if(!sh.path)return null;var cnt2=0,sx=ew/90,sy=eh/90;return sh.path.split(' ').map(function(tok){if(tok==='M'||tok==='L'||tok==='Z')return tok;var v=parseFloat(tok);if(isNaN(v))return tok;var i=cnt2++;return String(i%2===0?Math.round((v-5)*sx+m):Math.round((v-5)*sy+m));}).join(' ');}var _gDef='',fa=hasFill?'fill="'+fill+'"':'fill="none"';if(hasFill&&d.fillGrad&&d.fillGrad2){var _gid='sg_'+d.id;var _gdir=d.fillGradDir!=null?+d.fillGradDir:90;var _grad=(_gdir-90)*Math.PI/180;var _gx1=(50-50*Math.cos(_grad)).toFixed(1);var _gy1=(50-50*Math.sin(_grad)).toFixed(1);var _gx2=(50+50*Math.cos(_grad)).toFixed(1);var _gy2=(50+50*Math.sin(_grad)).toFixed(1);function _pStop(col,fbk){if(!col||col==='transparent')return{color:fbk||'#000000',opacity:0};var rm=col.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);if(rm){var r=(+rm[1]).toString(16).padStart(2,'0');var g=(+rm[2]).toString(16).padStart(2,'0');var b=(+rm[3]).toString(16).padStart(2,'0');return{color:'#'+r+g+b,opacity:rm[4]!=null?+rm[4]:1};}return{color:col,opacity:1};}_gDef='<linearGradient id="'+_gid+'" x1="'+_gx1+'%" y1="'+_gy1+'%" x2="'+_gx2+'%" y2="'+_gy2+'%">';var _s1=_pStop(fill,fill);var _s2=_pStop(d.fillGrad2,fill);var _s1c=_s1.opacity===0?_s2.color:_s1.color;var _s2c=_s2.opacity===0?_s1.color:_s2.color;_gDef+='<stop offset="0%" stop-color="'+_s1c+'" stop-opacity="'+_s1.opacity+'"/><stop offset="100%" stop-color="'+_s2c+'" stop-opacity="'+_s2.opacity+'"/></linearGradient>';fa='fill="url(#'+_gid+')"';}var sd='',defB='';if(sh.special==='callout'){var sA2=sw>0?'stroke="'+sc+'" stroke-width="'+sw+'"':'stroke="none"';sd=_buildCalloutSVGPath(d,w,h,sh,fa,sA2,shadow,margin)||'';}else if(isC&&sw>0){var fm=sw/2,clipId='scp_'+d.id;if(hasFill){var cEl=shEl('fill="white"','stroke="none"',fm);if(cEl){defB+='<clipPath id="'+clipId+'">'+cEl+'</clipPath>';sd+=shEl(fa,'stroke="none"',fm,'clip-path="url(#'+clipId+')"')||'';}else{sd+=shEl(fa,'stroke="none"',fm)||'';}}var ps=shPS(0),wp=ps?_expWave(ps,ss,sw,_noFill):null;sd+=wp?'<path d="'+wp+'" fill="none" stroke="'+sc+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round"/>':(shEl('fill="none"','stroke="'+sc+'" stroke-width="'+sw+'"',0)||'');}else if(isDbl&&sw>0){if(_noFill){var ps2=shPS(0);if(ps2){var gap=sw*3;sd='<path d="'+ps2+'" fill="none" stroke="'+sc+'" stroke-width="'+sw+'" stroke-linecap="round" transform="translate(0,'+(- gap/2)+')"/><path d="'+ps2+'" fill="none" stroke="'+sc+'" stroke-width="'+sw+'" stroke-linecap="round" transform="translate(0,'+(gap/2)+')"/>';}}else{sd=(shEl(fa,'stroke="'+sc+'" stroke-width="'+(sw*3)+'"',sw*0.5)||'')+(shEl('fill="none"','stroke="'+fill+'" stroke-width="'+(sw*1.4)+'"',sw*0.5)||'');}}else{var pm=_expPerim(sh,w,h,margin);var evD=(ss==='dotted'||ss==='dashed')?_expEvenDash(ss,sw,pm):'';var sA3=sw>0?'stroke="'+sc+'" stroke-width="'+sw+'" '+(evD||((ss==='dashed')?'stroke-dasharray="'+(sw*4)+' '+(sw*3)+'"':(ss==='dotted')?'stroke-dasharray="'+sw+' '+(sw*3)+'" stroke-linecap="round"':'')):'stroke="none"';sd=shEl(fa,sA3,margin)||'';}var fd='';if(_gDef)fd=_gDef;var shadowPad=0;if(d.shadow){var scol=d.shadowColor||'#000000',sb=d.shadowBlur!=null?+d.shadowBlur:4,shSz=d.shadowSize!=null?+d.shadowSize:3;shadowPad=_shadowPad(shSz,sb,sw);fd+=_shadowFilterDefUser('sh_'+d.id,shSz,sb,scol,w,h,sw);}var defs=(fd||defB)?'<defs>'+(fd||'')+(defB||'')+'</defs>':'';var vbW2=w+shadowPad*2,vbH2=h+shadowPad*2,svgSt2=shadowPad?'overflow:visible;position:absolute;left:0;top:0;width:100%;height:100%':'overflow:visible;width:100%;height:100%',svgVB2=shadowPad?(-shadowPad)+' '+(-shadowPad)+' '+vbW2+' '+vbH2:'0 0 '+w+' '+h,svgSz2=shadowPad?'width="'+vbW2+'" height="'+vbH2+'"':'width="'+w+'" height="'+h+'"';return '<svg xmlns="http://www.w3.org/2000/svg" '+svgSz2+' viewBox="'+svgVB2+'" style="'+svgSt2+'" opacity="'+op+'">'+defs+sd+'</svg>';}
function hex2rgba(h,op){var r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return 'rgba('+r+','+g+','+b+','+op+')';}
function applyHoverFx(el,fx,d){if(!fx||!fx.enabled)return;function _hSnap(dd){var st={x:dd.x||0,y:dd.y||0,w:dd.w||100,h:dd.h||100,rot:dd.rot||0,scale:1,elOpacity:dd.elOpacity!=null?dd.elOpacity:1,shadowBlur:0,shadowColor:'#000000',color:'',textColor:'',textBg:'',textBgOp:1,textBorderW:0,textBorderColor:'#ffffff'};if(dd&&dd.type==='text'){st.textBg=dd.textBg||'';st.textBgOp=dd.textBgOp!=null?dd.textBgOp:1;st.textBorderW=dd.textBorderW||0;st.textBorderColor=dd.textBorderColor||'#ffffff';if(dd.cs){var _cm=dd.cs.match(/(?:^|;|\s)color:\s*([^;]+)/i);if(_cm)st.textColor=_cm[1].trim().replace(/['"]/g,'');}}if(dd&&dd.type==='image')st.imgOpacity=dd.imgOpacity!=null?+dd.imgOpacity:1;if(dd&&dd.type==='svg')st.svgOpacity=dd.svgOpacity!=null?+dd.svgOpacity:1;return st;}function _hNorm(fx2,dd){if(!fx2.base)fx2.base=_hSnap(dd);if(!fx2.hover){fx2.hover=Object.assign({},fx2.base);if(fx2.scale!=null)fx2.hover.scale=fx2.scale;if(fx2.opacity!=null)fx2.hover.elOpacity=fx2.opacity;if(fx2.shadow!=null)fx2.hover.shadowBlur=fx2.shadow;if(fx2.shadowColor)fx2.hover.shadowColor=fx2.shadowColor;if(fx2.color)fx2.hover.color=fx2.color;}if(fx2.dur==null)fx2.dur=0.3;return fx2;}function _hTf(st,dd){var rot=st.rot!=null?+st.rot:0,sc=st.scale!=null?+st.scale:1,fx=dd&&dd.shapeFlipH?-1:1,fy=dd&&dd.shapeFlipV?-1:1;if(dd&&(dd.shapeFlipH||dd.shapeFlipV))return 'rotate('+rot+'deg) scale('+(fx*sc)+','+(fy*sc)+')';if(sc!==1)return 'rotate('+rot+'deg) scale('+sc+')';return 'rotate('+rot+'deg)';}function _hApply(st,isHover){if(!st)return;el.style.left=st.x+'px';el.style.top=st.y+'px';el.style.width=st.w+'px';el.style.height=st.h+'px';el.style.transform=_hTf(st,d);var op=st.elOpacity!=null?+st.elOpacity:1;el.style.opacity=op===1?'':String(op);var filter='';if(isHover){if(fx.preset==='lighter')filter='brightness(1.25)';else if(fx.preset==='darker')filter='brightness(0.75)';else if(fx.preset==='hue')filter='hue-rotate(28deg)';}var ownShF='';if(d&&d.type==='image'&&d.imgShadow)ownShF='url(#imgsh_'+(d.id||'x')+')';else if(d&&d.type==='svg'&&d.svgShadow)ownShF='url(#svgsh_'+(d.id||'x')+')';el.style.filter=[filter,ownShF].filter(Boolean).join(' ');var blur=st.shadowBlur!=null?+st.shadowBlur:0,scol=st.shadowColor||st.color||fx.color||'rgba(0,0,0,0.4)';if(fx.preset==='glow')el.style.boxShadow='0 0 20px 6px '+(st.color||scol);else if(blur>0)el.style.boxShadow='0 0 '+blur+'px '+scol;else el.style.boxShadow='';if(d&&d.type==='image'){var img=el.querySelector('img');if(img){var iop=st.imgOpacity!=null?+st.imgOpacity:1;img.style.opacity=iop===1?'':String(iop);}}if(d&&d.type==='shape'){var svg=el.querySelector('svg');if(svg){svg.style.transform='';svg.style.filter=blur>0?'drop-shadow(0 0 '+blur+'px '+scol+')':'';svg.style.opacity=op===1?'':String(op);}}if(d&&d.type==='svg'){var so2=st.svgOpacity!=null?+st.svgOpacity:(d.svgOpacity!=null?+d.svgOpacity:1);el.style.opacity=(op===1&&so2===1)?'':String(op*so2);}if(d&&d.type==='text'){var tel=el.querySelector('.psel-txt>div')||el.querySelector('.tel')||el.querySelector('.ec');var ptxt=el.querySelector('.psel-txt');if(tel){if(isHover&&st.textColor){tel.style.color=st.textColor;tel.style.webkitTextFillColor=st.textColor;tel.style.background='';tel.style.webkitBackgroundClip='';tel.style.backgroundClip='';}else if(!isHover&&st.textColor){tel.style.color=st.textColor;tel.style.webkitTextFillColor='';if(d.textColorGrad&&d.textColorGrad1){var _tcgDir=d.textColorGradDir!=null?d.textColorGradDir:90;tel.style.background='linear-gradient('+_tcgDir+'deg,'+d.textColorGrad1+','+(d.textColorGrad2||'transparent')+')';tel.style.webkitBackgroundClip='text';tel.style.backgroundClip='text';tel.style.webkitTextFillColor='transparent';}else{tel.style.background='';tel.style.webkitBackgroundClip='';tel.style.backgroundClip='';}}}if(ptxt){if(isHover&&st.textBg){var _op=st.textBgOp!=null?st.textBgOp:1;ptxt.style.background=typeof hex2rgba==='function'?hex2rgba(st.textBg,_op):st.textBg;}else if(!isHover){if(d.textBg||d.textBgGrad){var _op2=d.textBgOp!=null?d.textBgOp:1;if(d.textBgGrad){var _dir=d.textBgDir!=null?d.textBgDir:90;ptxt.style.background='linear-gradient('+_dir+'deg,'+(typeof hex2rgba==='function'?hex2rgba(d.textBg,_op2):d.textBg)+','+(typeof hex2rgba==='function'?hex2rgba(d.textBgCol2,_op2):d.textBgCol2)+')';}else{ptxt.style.background=typeof hex2rgba==='function'?hex2rgba(d.textBg,_op2):d.textBg;}}else{ptxt.style.background='';}}}var _bw=isHover&&st.textBorderW!=null?+st.textBorderW:0;if(_bw>0){el.style.outline=_bw+'px solid '+(st.textBorderColor||'#ffffff');el.style.outlineOffset='0px';}else if(d.textBorderW&&+d.textBorderW>0&&!isHover){el.style.outline=d.textBorderW+'px solid '+(d.textBorderColor||'#ffffff');el.style.outlineOffset='0px';}else{el.style.outline='';el.style.outlineOffset='';}}}d=d||{};fx=_hNorm(fx,d);var base=Object.assign(_hSnap(d),fx.base||{}),hover=Object.assign({},base,fx.hover||{}),dur=(fx.dur!=null?fx.dur:0.3)+'s';el.style.transition='left '+dur+' ease,top '+dur+' ease,width '+dur+' ease,height '+dur+' ease,transform '+dur+' ease,opacity '+dur+' ease,filter '+dur+' ease,box-shadow '+dur+' ease,outline '+dur+' ease';el.style.cursor='pointer';_hApply(base,false);el.addEventListener('mouseenter',function(){_hApply(hover,true);});el.addEventListener('mouseleave',function(){_hApply(base,false);});}
function _expSlideColorBg(s){if(!s)return'#ddd';if(s.bg==='custom'||s.bg==='theme')return s.bgc||'#1a1a2e';var b=BG.find(function(x){return x.id===s.bg;});return b?b.s:'#ddd';}
function _expNormBgImg(bg){if(!bg)return null;if(!bg.mode){if(bg.fit==='100% 100%'||bg.fit==='fill')bg.mode='stretch';else bg.mode='cover';}if(bg.opacity==null)bg.opacity=1;if(bg.blur==null)bg.blur=0;if(bg.mode==='tile'){if(bg.tileSize==null)bg.tileSize=120;if(bg.tileGap==null)bg.tileGap=10;if(bg.tileRot==null)bg.tileRot=0;}if(bg.mode==='custom'){if(bg.customSize==null)bg.customSize=bg.customW!=null||bg.customH!=null?Math.max(bg.customW||0,bg.customH||0):338;if(bg.customMargin==null)bg.customMargin=0;if(!bg.customAnchor)bg.customAnchor='center';}return bg;}
function _expDrawImgCover(ctx,img,x,y,w,h){var ir=(img.naturalWidth||1)/(img.naturalHeight||1),tr=w/h,dw,dh,dx,dy;if(ir>tr){dh=h;dw=dh*ir;dx=x+(w-dw)/2;dy=y;}else{dw=w;dh=dw/ir;dx=x;dy=y+(h-dh)/2;}ctx.drawImage(img,dx,dy,dw,dh);}
function _expBgTileDims(img,tileSize){var ir=(img.naturalWidth||1)/(img.naturalHeight||1);if(ir>=1)return{w:tileSize,h:tileSize/ir};return{w:tileSize*ir,h:tileSize};}
function _expBgCustomRect(cw,ch,bg,img){var size=Math.max(20,bg.customSize||300),margin=Math.max(0,bg.customMargin||0),ir=(img&&img.naturalWidth)?img.naturalWidth/img.naturalHeight:16/9,iw,ih;if(ir>=1){iw=size;ih=size/ir;}else{ih=size;iw=size*ir;}var maxW=Math.max(1,cw-margin*2),maxH=Math.max(1,ch-margin*2);if(iw>maxW){var s1=maxW/iw;iw=maxW;ih*=s1;}if(ih>maxH){var s2=maxH/ih;ih=maxH;iw*=s2;}var a=bg.customAnchor||'center',x,y;if(a==='tl'){x=margin;y=margin;}else if(a==='tr'){x=cw-iw-margin;y=margin;}else if(a==='bl'){x=margin;y=ch-ih-margin;}else if(a==='br'){x=cw-iw-margin;y=ch-ih-margin;}else{x=(cw-iw)/2;y=(ch-ih)/2;}return{x:x,y:y,w:iw,h:ih};}
function _expPaintSlideBgContent(ctx,bg,cw,ch,img){var alpha=Math.max(0,Math.min(1,+bg.opacity));ctx.save();ctx.globalAlpha=alpha;if(bg.mode==='stretch'){ctx.drawImage(img,0,0,cw,ch);}else if(bg.mode==='cover'){_expDrawImgCover(ctx,img,0,0,cw,ch);}else if(bg.mode==='tile'){var tileSize=Math.max(10,bg.tileSize||120),gap=Math.max(0,bg.tileGap||0),td=_expBgTileDims(img,tileSize),cellW=td.w+gap,cellH=td.h+gap,rotDeg=bg.tileRot||0,rot=rotDeg*Math.PI/180,seam=rotDeg?1:0,seamOff=seam*0.5,diag=Math.sqrt(cw*cw+ch*ch)*2,cols=Math.ceil(diag/cellW)+2,rows=Math.ceil(diag/cellH)+2,startX=-Math.ceil(cols/2)*cellW,startY=-Math.ceil(rows/2)*cellH;ctx.beginPath();ctx.rect(0,0,cw,ch);ctx.clip();ctx.translate(cw/2,ch/2);ctx.rotate(rot);for(var row=0;row<rows;row++){for(var col=0;col<cols;col++){var tx=startX+col*cellW-seamOff,ty=startY+row*cellH-seamOff;ctx.drawImage(img,tx,ty,td.w+seam,td.h+seam);}}}else if(bg.mode==='custom'){var r=_expBgCustomRect(cw,ch,bg,img);ctx.drawImage(img,r.x,r.y,r.w,r.h);}ctx.restore();}
function _expDrawSlideBgImgOnCanvas(ctx,bgImg,cw,ch,img){if(!ctx||!img||!bgImg||!bgImg.src)return;var bg=_expNormBgImg(bgImg),blur=Math.max(0,+bg.blur||0);if(blur>0){var tmp=document.createElement('canvas');tmp.width=cw;tmp.height=ch;_expPaintSlideBgContent(tmp.getContext('2d'),bg,cw,ch,img);ctx.save();ctx.filter='blur('+blur+'px)';ctx.drawImage(tmp,0,0);ctx.restore();}else{_expPaintSlideBgContent(ctx,bg,cw,ch,img);}}
function _expApplySlideBg(el,s){if(!el||!s)return;el.querySelectorAll('.cvbg-img-layer').forEach(function(n){n.remove();});var colorBg=_expSlideColorBg(s);el.style.background=colorBg;if(!s.bgImg)return;var baked=s.bgImg.exportBaked||(s.bgImg.src&&s.bgImg.src.indexOf('data:')===0?s.bgImg.src:'');if(!baked)return;var wrap=document.createElement('div');wrap.className='cvbg-img-layer';wrap.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;';var img=document.createElement('img');img.src=baked;img.alt='';img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block;pointer-events:none;';wrap.appendChild(img);el.appendChild(wrap);}
function _expWireElemTriggers(c, slideIdx) {
  var bindings = c._elemTrigBindings;
  if (!bindings || !bindings.length) return;
  delete c._elemTrigBindings;
  var trigMap = {};
  bindings.forEach(function(b) {
    b.steps.forEach(function(step) {
      var tid = step.triggerElId;
      if (!tid) return;
      if (!trigMap[tid]) trigMap[tid] = [];
      trigMap[tid].push({ targetId: b.targetId, step: step });
    });
  });
  Object.keys(trigMap).forEach(function(tid) {
    var trigEl = c.querySelector('.psel[data-id="' + tid + '"]');
    if (!trigEl) return;
    trigEl.style.cursor = 'pointer';
    trigEl.addEventListener('click', function(e) {
      e.stopPropagation();
      trigMap[tid].forEach(function(entry) {
        var targetEl = c.querySelector('.psel[data-id="' + entry.targetId + '"]');
        if (!targetEl) return;
        var step = entry.step;
        var delay = 0;
        step.anims.forEach(function(a) {
          var d2 = a.delay || 0;
          (function(anim, dl) {
            setTimeout(function() {
              var ecEl2 = targetEl.querySelector('.ec') || null;
              if (anim.cat === 'entrance') {
                var _ptD = targetEl._exportD;
                if (!(typeof _particlesHasAnim === 'function' && _particlesHasAnim(_ptD))) {
                  targetEl.style.visibility = 'visible';
                  targetEl.style.pointerEvents = '';
                }
              }
              fireExportAnim(targetEl, anim, 0, 0, 0, ecEl2);
            }, dl);
          })(a, delay + d2);
          delay += d2 + (a.duration || 600);
        });
        if (step.navTarget !== null) {
          setTimeout(function() {
            if (typeof goto === 'function') goto(step.navTarget, step.navTarget > slideIdx ? 'next' : 'prev');
          }, delay);
        }
      });
    });
  });
}
${animEngineSrc}
function _expGroupMembers(d,slide){if(!d||!d.groupId||!slide||!slide.els)return d?[d]:[];var m=slide.els.filter(function(x){return x.groupId===d.groupId;});return m.length>1?m:[d];}
function _expGroupLeader(d,slide){if(!d||!d.groupId||!slide||!slide.els)return d;var members=_expGroupMembers(d,slide);if(members.length<=1)return d;for(var i=0;i<slide.els.length;i++){if(members.some(function(m){return m.id===slide.els[i].id;}))return slide.els[i];}return d;}
function _expFlushCaptionAnims(c,s,transOffset){var queue=c._pendingCaptionQueue;if(!queue||!queue.length)return;delete c._pendingCaptionQueue;var offset=transOffset||0;var seen={};queue.forEach(function(item){var d=item.d,a=item.a,delay=(item.absDelay||0)+offset;if(d.groupId){var leader=_expGroupLeader(d,s);if(d.id!==leader.id)return;var key=d.groupId+'|'+delay+'|'+(a.name||'captionSlide');if(seen[key])return;seen[key]=1;var entries=_expGroupMembers(d,s).map(function(md){var mel=c.querySelector('.psel[data-id="'+md.id+'"]');return mel?{el:mel,x:md.x||0,y:md.y||0,w:md.w||200,h:md.h||200}:null;}).filter(Boolean);if(entries.length&&typeof _fireCaptionSlideAnimGroup==='function')_fireCaptionSlideAnimGroup(entries,a,delay,{hideAfter:true});}else{var mel=c.querySelector('.psel[data-id="'+d.id+'"]');if(mel&&typeof _fireCaptionSlideAnim==='function')_fireCaptionSlideAnim(mel,a,delay,d.w,d.h,{hideAfter:true});}});}
function fireExportAnim(el,a,delay,_cumTx,_cumTy,_ecEl){var baseTx=_cumTx||0,baseTy=_cumTy||0;if(a.name==='splitHalf'){if(typeof _fireSplitHalfAnim==='function')_fireSplitHalfAnim(el,a,delay,{hideAfter:true});return;}if(a.name==='captionSlide'){var w=parseFloat(el.style.width)||el.offsetWidth||200,h=parseFloat(el.style.height)||el.offsetHeight||200;if(typeof _fireCaptionSlideAnim==='function')_fireCaptionSlideAnim(el,a,delay,w,h,{hideAfter:true});return;}if(a.name==='moveTo'){var tx=a.tx||0,ty=a.ty||0,dur=a.duration||600;setTimeout(function(){el.style.transform='translate('+baseTx.toFixed(2)+'px,'+baseTy.toFixed(2)+'px)';var anim=el.animate([{transform:'translate('+baseTx.toFixed(2)+'px,'+baseTy.toFixed(2)+'px)'},{transform:'translate('+tx.toFixed(2)+'px,'+ty.toFixed(2)+'px)'}],{duration:dur,easing:'cubic-bezier(0.4,0,0.2,1)',fill:'forwards'});anim.onfinish=function(){try{anim.commitStyles();}catch(e){}anim.cancel();};},delay);return;}if(a.name==='orbitTo'){var ocx=a.orbitCx||0,ocy=a.orbitCy||0,r=Math.sqrt(ocx*ocx+ocy*ocy)||(a.orbitR||120),dir=(a.orbitDir||'cw')==='cw'?1:-1,totalDeg=(a.orbitDeg!=null?a.orbitDeg:360)*dir,dur=a.duration||1200;var sa=Math.atan2(-ocy,-ocx),steps=Math.max(60,Math.abs(totalDeg)*2),frames=[];for(var i=0;i<=steps;i++){var t=i/steps,angle=sa+(totalDeg*Math.PI/180)*t,ftx=baseTx+ocx+r*Math.cos(angle),fty=baseTy+ocy+r*Math.sin(angle);frames.push({transform:'translate('+ftx.toFixed(2)+'px,'+fty.toFixed(2)+'px)'});}var endTx=baseTx+ocx+r*Math.cos(sa+totalDeg*Math.PI/180),endTy=baseTy+ocy+r*Math.sin(sa+totalDeg*Math.PI/180);setTimeout(function(){el.style.transform='translate('+baseTx.toFixed(2)+'px,'+baseTy.toFixed(2)+'px)';var anim=el.animate(frames,{duration:dur,easing:'linear',fill:'forwards'});anim.onfinish=function(){try{anim.commitStyles();}catch(e){}anim.cancel();};},delay);return;}if(a.name==='rotate'){var dur=a.duration||600,rdir=(a.rotateDir||'cw')==='cw'?1:-1,deg=(a.rotateDeg!=null?a.rotateDeg:360)*rdir,target=_ecEl||el;setTimeout(function(){var anim=target.animate([{transform:'rotate(0deg)'},{transform:'rotate('+deg+'deg)'}],{duration:dur,easing:'linear',fill:'forwards',composite:_ecEl?'replace':'add'});anim.onfinish=function(){try{anim.commitStyles();}catch(e){}anim.cancel();};},delay);return;}// тФАтФА typewriter: ╤Б╤В╨╕╤А╨░╨╡╨╝ ╤Б╤В╨░╤А╤Л╨╣ ╤В╨╡╨║╤Б╤В ╨┐╨╛╤Б╨╕╨╝╨▓╨╛╨╗╤М╨╜╨╛, ╨┐╨╡╤З╨░╤В╨░╨╡╨╝ ╨╜╨╛╨▓╤Л╨╣ тФАтФАтФАтФАтФАтФАтФАтФАтФА
  if(a.name==='typewriter'){
    const dur   = a.duration || 600; // ╨╜╨╡ ╨╕╤Б╨┐╨╛╨╗╤М╨╖╤Г╨╡╤В╤Б╤П ╨╜╨░╨┐╤А╤П╨╝╤Г╤О тАФ ╤Б╨║╨╛╤А╨╛╤Б╤В╤М ╤З╨╡╤А╨╡╨╖ charDelay
    const twDelay = typeof delay==='number' ? delay : (a.delay||0);
    const charDelay = a.charDelay || 40; // ╨╝╤Б ╨╜╨░ ╤Б╨╕╨╝╨▓╨╛╨╗


    // ╨Я╨╛╨╗╤Г╤З╨░╨╡╨╝ plaintext ╨╕╨╖ HTML (╤Б╨╛╤Е╤А╨░╨╜╤П╨╡╨╝ ╤В╨╡╨│╨╕ ╨╝╨╕╨╜╨╕╨╝╨░╨╗╤М╨╜╨╛ тАФ ╤В╨╛╨╗╤М╨║╨╛ br)
    function _htmlToChars(html){
      const res = [];
      const re = /(<[^>]+>)|([^<])/g;
      let m;
      while((m = re.exec(html)) !== null){
        if(m[1]){ res.push({type:'tag', val:m[1]}); }
        else { for(const ch of m[2]) res.push({type:'char', val:ch}); }
      }
      return res;
    }

    function _charsToHtml(chars){ return chars.map(c=>c.val).join(''); }

    // ╨Ю╨▒╨╛╤А╨░╤З╨╕╨▓╨░╨╡╨╝ ╤В╨╡╨║╤Б╤В ╨▓ <div> ╤З╤В╨╛╨▒╤Л flex-column ╨╜╨╡ ╨╗╨╛╨╝╨░╨╗ ╨╛╤В╨╛╨▒╤А╨░╨╢╨╡╨╜╨╕╨╡
    // ╨Х╤Б╨╗╨╕ ╤В╨╡╨║╤Б╤В ╤Г╨╢╨╡ ╨╜╨░╤З╨╕╨╜╨░╨╡╤В╤Б╤П ╤Б ╤В╨╡╨│╨░ тАФ ╨╜╨╡ ╨╛╨▒╨╛╤А╨░╤З╨╕╨▓╨░╨╡╨╝
    function _wrapLikeOriginal(innerText){
      var trimmed = innerText.trim();
      if(!trimmed) return '<div></div>';
      if(trimmed[0] === '<') return innerText; // ╤Г╨╢╨╡ ╨╡╤Б╤В╤М ╤В╨╡╨│╨╕
      return '<div>' + innerText + '</div>';
    }

    const fromHtml = a.fromHtml || '';
    const toHtml   = a.toHtml   || '';

    // ╨Э╨░╤Е╨╛╨┤╨╕╨╝ ╤В╨╡╨║╤Б╤В╨╛╨▓╤Л╨╣ ╨║╨╛╨╜╤В╨╡╨╣╨╜╨╡╤А ╨▓ ╤Н╨║╤Б╨┐╨╛╤А╤В╨╜╨╛╨╝ HTML
    // ╨б╤В╤А╤Г╨║╤В╤Г╤А╨░ ╤Н╨║╤Б╨┐╨╛╤А╤В╨░: el.psel > v.psel-txt(flex+justify+bg) > vi(d.cs+padding) > d.html
    // typewriter ╨┤╨╛╨╗╨╢╨╡╨╜ ╨┐╨╕╤Б╨░╤В╤М ╨▓ vi тАФ ╤В╨╛╨│╨┤╨░ ╤Б╤В╨╕╨╗╨╕ (╤Ж╨▓╨╡╤В, ╤А╨░╨╖╨╝╨╡╤А ╤И╤А╨╕╤Д╤В╨░) ╤Б╨╛╤Е╤А╨░╨╜╤П╤О╤В╤Б╤П
    const _elType = el.dataset && el.dataset.type;
    let _tel = null;
    if(_elType==='text'){
      // _tel = vi (╨┐╨╡╤А╨▓╤Л╨╣ ╨┤╨╛╤З╨╡╤А╨╜╨╕╨╣ div psel-txt, ╤Б╨╛╨┤╨╡╤А╨╢╨╕╤В d.html)
      // ╨Э╨Х querySelector ╨▓╨╜╤Г╤В╤А╨╕ vi тАФ ╨╜╨░╨╝ ╨╜╤Г╨╢╨╡╨╜ ╤Б╨░╨╝ vi
      const _pselTxt = el.querySelector('.psel-txt');
      _tel = _pselTxt ? _pselTxt.children[0] : el.querySelector('div');
    } else if(_elType==='shape'){
      _tel = el.querySelector('.shape-text');
    } else {
      _tel = el.querySelector('.shape-text') || el.querySelector('div');
    }
    if(!_tel){ console.warn('[typewriter] no text container found for type:', _elType); return; }
    const _telOrigHtml = _tel.innerHTML; // ╤Б╨╛╤Е╤А╨░╨╜╤П╨╡╨╝ ╨╛╤А╨╕╨│╨╕╨╜╨░╨╗ ╨┤╨╗╤П ╨▓╨╛╤Б╤Б╤В╨░╨╜╨╛╨▓╨╗╨╡╨╜╨╕╤П

    // ╨Ш╨╖╨▓╨╗╨╡╨║╨░╨╡╨╝ ╤В╨╛╨╗╤М╨║╨╛ ╤В╨╡╨║╤Б╤В╨╛╨▓╨╛╨╡ ╤Б╨╛╨┤╨╡╤А╨╢╨╕╨╝╨╛╨╡ (╨▒╨╡╨╖ HTML ╤В╨╡╨│╨╛╨▓)
    function _htmlToPlain(html){ return html.replace(/<[^>]*>/g, ''); }

    const fromPlain = _htmlToPlain(fromHtml);
    const toPlain   = _htmlToPlain(toHtml);

    // ╨Ш╤Б╨┐╨╛╨╗╤М╨╖╤Г╨╡╨╝ ╤В╤Г ╨╢╨╡ ╨╛╨▒╤С╤А╤В╨║╤Г ╤З╤В╨╛ ╨╕ preview ╨┤╨╗╤П ╨║╨╛╨╜╤Б╨╕╤Б╤В╨╡╨╜╤В╨╜╨╛╤Б╤В╨╕
    var _twOpen  = '<div style="width:100%;white-space:pre-wrap;word-break:break-word;">';
    var _twClose = '</div>';

    let _twTimer = null;
    let _twRunning = true;

    setTimeout(()=>{
      if(!_twRunning) return;

      // ╨и╨░╨│ 1: ╤Б╤В╨╕╤А╨░╨╡╨╝ ╤В╨╡╨║╤Б╤В ╨┐╨╛╤Б╨╕╨╝╨▓╨╛╨╗╤М╨╜╨╛ ╤Б ╨║╨╛╨╜╤Ж╨░ (╨╛╨▒╨╛╤А╨░╤З╨╕╨▓╨░╨╡╨╝ ╨▓ div)
      let deleteStep = 0;
      const totalDelete = fromPlain.length;

      function doDelete(){
        if(!_twRunning) return;
        if(deleteStep >= totalDelete){
          _tel.innerHTML = _twOpen + _twClose;
          requestAnimationFrame(()=>doPrint(0));
          return;
        }
        const remaining = fromPlain.slice(0, totalDelete - deleteStep);
        _tel.innerHTML = _twOpen + remaining + _twClose;
        deleteStep++;
        _twTimer = setTimeout(doDelete, charDelay);
      }

      // ╨и╨░╨│ 2: ╨┐╨╡╤З╨░╤В╨░╨╡╨╝ ╨╜╨╛╨▓╤Л╨╣ ╤В╨╡╨║╤Б╤В ╨┐╨╛╤Б╨╕╨╝╨▓╨╛╨╗╤М╨╜╨╛
      function doPrint(step){
        if(!_twRunning) return;
        if(step >= toPlain.length){
          // ╨д╨╕╨╜╨░╨╗: ╨▓╤Б╤В╨░╨▓╨╗╤П╨╡╨╝ toHtml тАФ ╨┐╨╛╨╗╨╜╤Л╨╣ HTML ╤Б ╤Д╨╛╤А╨╝╨░╤В╨╕╤А╨╛╨▓╨░╨╜╨╕╨╡╨╝
          // toHtml ╨╕╨╖ ╤А╨╡╨┤╨░╨║╤В╨╛╤А╨░ ╤Г╨╢╨╡ ╤Б╨╛╨┤╨╡╤А╨╢╨╕╤В ╨┐╤А╨░╨▓╨╕╨╗╤М╨╜╤Л╨╡ div-╨╛╨▒╤С╤А╤В╨║╨╕
          _tel.innerHTML = toHtml || (_twOpen + toPlain + _twClose);
          return;
        }
        const built = toPlain.slice(0, step + 1);
        _tel.innerHTML = _twOpen + built + _twClose;
        _twTimer = setTimeout(()=>doPrint(step+1), charDelay);
      }

      doDelete();

    }, twDelay);

    // ╨б╨╛╤Е╤А╨░╨╜╤П╨╡╨╝ ╤Б╤Б╤Л╨╗╨║╤Г ╨┤╨╗╤П ╨╛╤Б╤В╨░╨╜╨╛╨▓╨║╨╕
    if(!el._liveAnims) el._liveAnims = [];
    el._liveAnims.push({ cancel: ()=>{ _twRunning=false; if(_twTimer) clearTimeout(_twTimer); } });
    return;
  }
if(a.name==='particles'){setTimeout(function(){if(typeof _fireParticlesAnim==='function'){var _pd=el._exportD||{w:parseFloat(el.style.width)||el.offsetWidth||100,h:parseFloat(el.style.height)||el.offsetHeight||100,rot:el.dataset.rot?+el.dataset.rot:0,type:el.dataset.type||'',id:el.dataset.id||''};_fireParticlesAnim(el,a,0,_pd);}},delay);return;}if(a.name==='swing'){var _swDur=a.duration||2000;var _swCnt=a.swingCount!=null?a.swingCount:1;var _swIter=_swCnt>=10?Infinity:_swCnt;var _sox=a.swingOx!=null?a.swingOx:0;var _dw=parseFloat(el.style.width)||300,_dh=parseFloat(el.style.height)||200;var _soy=a.swingOy!=null?a.swingOy:_dh/2;var _ox2=(50+_sox/_dw*100).toFixed(2)+'%',_oy2=(50+_soy/_dh*100).toFixed(2)+'%';var _swTarget=_ecEl||el.querySelector('.iel')||el.querySelector('.psel-txt');if(!_swTarget||_swTarget===el){var _sw2=el.querySelector('._swing_wrap');if(!_sw2){_sw2=document.createElement('div');_sw2.className='_swing_wrap';_sw2.style.cssText='position:absolute;inset:0;pointer-events:none;';while(el.firstChild)_sw2.appendChild(el.firstChild);el.appendChild(_sw2);}_swTarget=_sw2;}setTimeout(function(){_swTarget.style.transformOrigin=_ox2+' '+_oy2;var _la=_swTarget.animate([{transform:'rotate(0deg)',easing:'cubic-bezier(.4,0,.2,1)'},{transform:'rotate(30deg)',easing:'cubic-bezier(.4,0,.6,1)'},{transform:'rotate(-30deg)',easing:'cubic-bezier(.4,0,.2,1)'},{transform:'rotate(20deg)',easing:'cubic-bezier(.4,0,.6,1)'},{transform:'rotate(-20deg)',easing:'cubic-bezier(.4,0,.2,1)'},{transform:'rotate(10deg)',easing:'cubic-bezier(.4,0,.6,1)'},{transform:'rotate(-10deg)',easing:'cubic-bezier(.4,0,.2,1)'},{transform:'rotate(5deg)',easing:'cubic-bezier(.4,0,.6,1)'},{transform:'rotate(-3deg)',easing:'cubic-bezier(.4,0,.6,1)'},{transform:'rotate(0deg)'}],{duration:_swDur,iterations:_swIter,fill:'none',composite:'replace'});if(!el._liveAnims)el._liveAnims=[];el._liveAnims.push(_la);},delay);return;}if(a.name==='float'){var _flDur=a.duration||5000;var _flCnt=a.swingCount!=null?a.swingCount:(a.count!=null?a.count:1);var _flIter=(!isFinite(_flCnt)||_flCnt>=10)?Infinity:_flCnt;var _flW=parseFloat(el.style.width)||200,_flH=parseFloat(el.style.height)||200;var _floatT=el.querySelector('._float_wrap');if(!_floatT){_floatT=document.createElement('div');_floatT.className='_float_wrap';_floatT.style.cssText='position:absolute;inset:0;pointer-events:none;';var _flEc=el.querySelector('.ec');if(_flEc){_flEc.parentNode.insertBefore(_floatT,_flEc);_floatT.appendChild(_flEc);}else{while(el.firstChild)_floatT.appendChild(el.firstChild);el.appendChild(_floatT);}}var _mkDrift=function(){var _mx=_flW*0.06,_my=_flH*0.06,N=24;var _mkW=function(){return [1,2,3].map(function(freq){return {amp:0.2+Math.random()*0.8,freq:freq,ph:Math.random()*Math.PI*2};});};var _rx=_mkW(),_ry=_mkW();var _smp=function(ws,t){var s=0,d=0;ws.forEach(function(w){s+=w.amp*Math.sin(w.freq*t*Math.PI*2+w.ph);d+=w.amp;});return s/d;};var frames=[];for(var i=0;i<=N;i++){var t=i/N,x=Math.round(_smp(_rx,t)*_mx),y=Math.round(_smp(_ry,t)*_my);var f={transform:'translate('+x+'px,'+y+'px)'};if(i<N)f.easing='ease-in-out';frames.push(f);}return frames;};setTimeout(function(){var _fla=_floatT.animate(_mkDrift(),{duration:_flDur,iterations:_flIter,fill:'none',composite:'replace'});if(!el._liveAnims)el._liveAnims=[];el._liveAnims.push(_fla);},delay);return;}if(a.name==='dance'){var _dnDur=a.duration||1200;var _dnCnt=a.swingCount!=null?a.swingCount:(a.count!=null?a.count:1);var _dnIter=(!isFinite(_dnCnt)||_dnCnt>=10)?Infinity:_dnCnt;el.style.overflow='visible';var _dnT=el.querySelector('._dance_wrap');if(!_dnT){_dnT=document.createElement('div');_dnT.className='_dance_wrap';_dnT.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:visible;border-radius:inherit;';var _dnEc=el.querySelector('._text_body')||el.querySelector('.ec')||el.querySelector('.psel-txt');if(_dnEc){_dnEc.parentNode.insertBefore(_dnT,_dnEc);_dnT.appendChild(_dnEc);}else{while(el.firstChild)_dnT.appendChild(el.firstChild);el.appendChild(_dnT);}}setTimeout(function(){var _la=_dnT.animate([{transform:'scaleX(1) scaleY(1) rotate(0deg)',easing:'cubic-bezier(.42,0,.3,1.4)'},{transform:'scaleX(1.12) scaleY(0.82) rotate(-2deg)',easing:'cubic-bezier(.6,0,.4,1.3)'},{transform:'scaleX(0.9) scaleY(1.1) rotate(1.5deg)',easing:'cubic-bezier(.42,0,.3,1.4)'},{transform:'scaleX(1.1) scaleY(0.85) rotate(-1.5deg)',easing:'cubic-bezier(.6,0,.4,1.3)'},{transform:'scaleX(0.92) scaleY(1.08) rotate(2deg)',easing:'cubic-bezier(.42,0,.3,1.4)'},{transform:'scaleX(1.06) scaleY(0.9) rotate(-1deg)',easing:'cubic-bezier(.5,0,.35,1.3)'},{transform:'scaleX(0.97) scaleY(1.03) rotate(0.5deg)',easing:'cubic-bezier(.4,0,.6,1)'},{transform:'scaleX(1) scaleY(1) rotate(0deg)'}],{duration:_dnDur,iterations:_dnIter,fill:'none',composite:'replace'});if(!el._liveAnims)el._liveAnims=[];el._liveAnims.push(_la);},delay);return;}if(a.cat==='live'){var _liveDur=a.duration||1200;var _liveTarget=_ecEl||el;setTimeout(function(){var _la=_liveTarget.animate([{transform:'scaleX(1) scaleY(1) rotate(0deg)',easing:'cubic-bezier(.42,0,.3,1.4)'},{transform:'scaleX(1.12) scaleY(0.82) rotate(-2deg)',easing:'cubic-bezier(.6,0,.4,1.3)'},{transform:'scaleX(0.9) scaleY(1.1) rotate(1.5deg)',easing:'cubic-bezier(.42,0,.3,1.4)'},{transform:'scaleX(1.1) scaleY(0.85) rotate(-1.5deg)',easing:'cubic-bezier(.6,0,.4,1.3)'},{transform:'scaleX(0.92) scaleY(1.08) rotate(2deg)',easing:'cubic-bezier(.42,0,.3,1.4)'},{transform:'scaleX(1.06) scaleY(0.9) rotate(-1deg)',easing:'cubic-bezier(.5,0,.35,1.3)'},{transform:'scaleX(0.97) scaleY(1.03) rotate(0.5deg)',easing:'cubic-bezier(.4,0,.6,1)'},{transform:'scaleX(1) scaleY(1) rotate(0deg)'}],{duration:_liveDur,iterations:(function(){var _c=a.swingCount!=null?a.swingCount:Infinity;return(!isFinite(_c)||_c>=10)?Infinity:_c;})(),fill:'none',composite:_ecEl?'replace':'add'});if(!el._liveAnims)el._liveAnims=[];el._liveAnims.push(_la);},delay);return;}var nm=AMAP[a.name]||'el-fadein';var dur2=(a.duration||600)/1000;var isEmphasis=a.cat==='emphasis';var target=isEmphasis&&_ecEl?_ecEl:el;setTimeout(function(){target.style.animation='none';void target.offsetWidth;target.style.animation=nm+' '+dur2+'s ease-out 0s both';},delay);}
function build(c,i,transOffset){transOffset=transOffset||0;var s=SL[i];var _LIVE_NAMES={dance:1,swing:1,float:1,particles:1};c.innerHTML='';var bg=document.createElement('div');bg.style.cssText='position:absolute;inset:0;z-index:0;';_expApplySlideBg(bg,s);c.appendChild(bg);var ca=[];var gAutoMap={};var gClickMap={};(function(){var gList=[];s.els.forEach(function(d){if(d._isDecor)return;(d.anims||[]).forEach(function(a,i){gList.push({d:d,a:a});});});var lastTrig='auto';var lastRes='auto';var gEffTrig=gList.map(function(item){var t=item.a.trigger||'auto';if(t==='element'){lastTrig='auto';lastRes='element';return 'element';}if(t==='counter'){lastTrig='auto';lastRes='counter';return 'counter';}if(t==='timer'){lastTrig='auto';lastRes='timer';return 'timer';}if(t==='nav'){lastTrig='auto';lastRes='nav';return 'nav';}if(t==='click'){lastTrig='click';lastRes='click';return 'click';}if(t==='withPrev'){return lastRes;}if(lastTrig==='click'){return 'autoAfter';}lastTrig='auto';lastRes='auto';return 'auto';});var gPS=0,gPD=0;gList.forEach(function(item,gi){var d=item.d,a=item.a,eff=gEffTrig[gi];if(eff==='element'||eff==='nav'||eff==='counter'||eff==='timer')return;if((a.trigger||'auto')==='element'||(a.trigger||'auto')==='nav'||(a.trigger||'auto')==='click'||(a.trigger||'auto')==='counter'||(a.trigger||'auto')==='timer')return;if(eff==='auto'||eff==='afterPrev'||eff==='withPrev'){var rd=a.delay||0,abs;var _il=!!_LIVE_NAMES[a.name];if(gPS===0&&gPD===0){abs=rd;}else if(_il&&(a.trigger||'auto')==='auto'){abs=gPS+gPD+rd;}else if((a.trigger||'auto')==='withPrev'){abs=gPS+rd;}else{abs=gPS+gPD+rd;}gPS=abs;gPD=a.name==='captionSlide'?((+(a.duration||600)||600)+(+(a.holdDuration||2000)||2000)+(+(a.duration||600)||600)):(a.duration||600);if(!gAutoMap[d.id])gAutoMap[d.id]=[];gAutoMap[d.id].push({anim:a,absDelay:abs});}else if(eff==='click'){if(!gClickMap[d.id])gClickMap[d.id]=[];gClickMap[d.id].push({anim:a,autoAfter:false});}else if(eff==='autoAfter'){if(!gClickMap[d.id])gClickMap[d.id]=[];gClickMap[d.id].push({anim:a,autoAfter:true});}});})();s.els.forEach(function(d,_elIdx){var el=document.createElement('div');el._exportD=d;el.dataset.id=d.id;el.className='psel'+(d._isDecor?' is-decor':'')+((d.anims||[]).some(function(a){return a.name==='swing'||a.name==='dance';})?' has-swing has-dance':'')+((d.anims||[]).some(function(a){return a.name==='particles';})?' has-particles':'')+((d.anims||[]).some(function(a){return a.name==='captionSlide';})?' has-caption':'');el.dataset.type=d.type;var rot=d.rot||0;var rxStr='';if(d.rx_tl!=null||d.rx_tr!=null||d.rx_bl!=null||d.rx_br!=null){var u=d.rxUnit||'px';rxStr='border-radius:'+(d.rx_tl||0)+u+' '+(d.rx_tr||0)+u+' '+(d.rx_br||0)+u+' '+(d.rx_bl||0)+u+';overflow:hidden;';}var _sfSft=(d.shapeFlipH||d.shapeFlipV)?' scale('+(d.shapeFlipH?-1:1)+','+(d.shapeFlipV?-1:1)+')':'';el.style.cssText='position:absolute;left:'+d.x+'px;top:'+d.y+'px;width:'+d.w+'px;height:'+d.h+'px;z-index:'+(d._isDecor?'1':(d.type==='lego'?Math.max(3,50-Math.floor((d.y||0)/12)):(50+_elIdx+1)))+';transform:rotate('+rot+'deg)'+_sfSft+';'+rxStr+(d.elOpacity!=null&&+d.elOpacity!==1?'opacity:'+d.elOpacity+';':'')+(d.type==='text'&&d.textBgBlur>0?'backdrop-filter:blur('+d.textBgBlur+'px);-webkit-backdrop-filter:blur('+d.textBgBlur+'px);':d.type==='table'&&d.tableBgBlur>0?'backdrop-filter:blur('+d.tableBgBlur+'px);-webkit-backdrop-filter:blur('+d.tableBgBlur+'px);':'');if(d.type==='text'){if(d.textBorderW&&+d.textBorderW>0){el.style.outline=d.textBorderW+'px solid '+(d.textBorderColor||'#ffffff');el.style.outlineOffset='0px';}var va=d.valign||'top';var jc=va==='middle'?'center':va==='bottom'?'flex-end':'flex-start';var v=document.createElement('div');v.className='psel-txt';v.style.cssText='display:flex;flex-direction:column;justify-content:'+jc+';width:100%;height:100%;overflow:visible;box-sizing:border-box;';if(d.textBg||d.textBgGrad){var op2=d.textBgOp!=null?d.textBgOp:1;var _toRgba=function(h,a){if(!h)return'rgba(0,0,0,0)';return hex2rgba(h,a);};if(d.textBgGrad){var _dir=d.textBgDir!=null?d.textBgDir:90;v.style.background='linear-gradient('+_dir+'deg,'+_toRgba(d.textBg,op2)+','+_toRgba(d.textBgCol2,op2)+')';}else{v.style.background=_toRgba(d.textBg,op2);}}var vi=document.createElement('div');vi.style.cssText=(d.cs?d.cs+(d.cs.endsWith(';')?'':';'):'')+'padding:6px 8px;word-break:break-word;box-sizing:border-box;flex:none;';if(_textShadowActive(d)){_expApplyTextShadow(vi,el,d);}if(d.textColorGrad&&d.textColorGrad1){var _tcgDir=d.textColorGradDir!=null?d.textColorGradDir:90;vi.style.background='linear-gradient('+_tcgDir+'deg,'+d.textColorGrad1+','+(d.textColorGrad2||'transparent')+')';vi.style.webkitBackgroundClip='text';vi.style.backgroundClip='text';vi.style.webkitTextFillColor='transparent';}vi.innerHTML=(typeof rtMigrateHtml==='function'?rtMigrateHtml(d.html||'',(d.cs||'').match(/font-size:\s*([\d.]+)px/)?.[1]):d.html||'');if(typeof _rtNormalizeTextDisplay==='function')_rtNormalizeTextDisplay(vi,d.cs||'',d.bulletGap);v.appendChild(vi);el.appendChild(v);}else if(d.type==='image'){var img=document.createElement('img');img.src=d.src;img.onload=function(){if(typeof _preloadAlphaCanvas==='function')_preloadAlphaCanvas(img);};if(img.complete&&img.naturalWidth&&typeof _preloadAlphaCanvas==='function')_preloadAlphaCanvas(img);var cL=d.imgCropL||0,cT=d.imgCropT||0,cR=d.imgCropR||0,cB=d.imgCropB||0,hasCrop=cL||cT||cR||cB;var ic=document.createElement('div');ic.style.cssText='position:absolute;inset:0;overflow:hidden;border-radius:'+(d.imgRx||0)+'px;';if(hasCrop){var fW=(d._cropFullW>0)?d._cropFullW:(d.w+cL+cR),fH=(d._cropFullH>0)?d._cropFullH:(d.h+cT+cB),logVisW=Math.max(1,fW-cL-cR),logVisH=Math.max(1,fH-cT-cB),wPct=(fW/logVisW*100).toFixed(4)+'%',hPct=(fH/logVisH*100).toFixed(4)+'%',lPct=(-cL/logVisW*100).toFixed(4)+'%',tPct=(-cT/logVisH*100).toFixed(4)+'%';var _fxe=d.imgFlipH?-1:1,_fye=d.imgFlipV?-1:1,_tre=(_fxe===-1||_fye===-1)?'scale('+_fxe+','+_fye+')':'';img.style.cssText='position:absolute;left:'+lPct+';top:'+tPct+';width:'+wPct+';height:'+hPct+';object-fit:fill;display:block;opacity:'+(d.imgOpacity!=null?d.imgOpacity:1)+';transform:'+_tre+';transform-origin:center;';}else{var fit=d.imgFit||'contain';var _fxe=d.imgFlipH?-1:1,_fye=d.imgFlipV?-1:1,_tre=(_fxe===-1||_fye===-1)?'scale('+_fxe+','+_fye+')':'';img.style.cssText='width:100%;height:100%;object-fit:'+fit+';display:block;object-position:'+(d.imgPosX||'center')+' '+(d.imgPosY||'center')+';opacity:'+(d.imgOpacity!=null?d.imgOpacity:1)+';transform:'+_tre+';transform-origin:center;';}ic.appendChild(img);el.appendChild(ic);el.style.borderRadius=(d.imgRx||0)+'px';if(!(d.anims||[]).some(function(a){return a.name==='swing'||a.name==='dance';}))el.style.overflow='hidden';if(d.imgBw&&+d.imgBw>0){el.style.border=d.imgBw+'px solid '+(d.imgBc||'#fff');el.style.boxSizing='border-box';}if(d.imgShadow){_expApplyImgShadow(el,d);}/* img already in ic */}else if(d.type==='shape'){el.style.overflow='visible';if(d.shapeBlur>0&&typeof _shapeClipPath==='function'){var _ecp=_shapeClipPath(d,d.w,d.h);var _eov=document.createElement('div');_eov.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:0;backdrop-filter:blur('+d.shapeBlur+'px);-webkit-backdrop-filter:blur('+d.shapeBlur+'px);'+(_ecp!=='none'?'clip-path:'+_ecp+';-webkit-clip-path:'+_ecp+';':'');el.appendChild(_eov);}var _eec=document.createElement('div');_eec.className='ec';_eec.style.cssText='width:100%;height:100%;overflow:visible;position:relative;z-index:1;';var _esel=document.createElement('div');_esel.className='sel-el';_esel.style.cssText='position:absolute;inset:0;overflow:visible;';var _esvg=document.createElement('div');_esvg.className='shape-svg';_esvg.innerHTML=buildShapeSVG(d,d.w,d.h);_esel.appendChild(_esvg);if(d.shapeHtml){var txt=document.createElement('div');txt.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:8px;word-break:break-word;text-align:center;pointer-events:none;'+(d.shapeTextCss||'font-size:24px;font-weight:700;color:#fff;');txt.innerHTML=d.shapeHtml;_esel.appendChild(txt);}_eec.appendChild(_esel);el.appendChild(_eec);_syncShapeShadowLayout(el,d,d.w,d.h);}else if(d.type==='formula'){el.style.overflow='visible';el.style.display='flex';el.style.alignItems='center';el.style.justifyContent='center';el.style.color=d.formulaColor||'#ffffff';if(d.formulaSvg){el.innerHTML=d.formulaSvg;var _fsvg=el.querySelector('svg');if(_fsvg){_fsvg.style.width='100%';_fsvg.style.height='100%';}}}else if(d.type==='graph'){el.style.overflow='hidden';el.style.borderRadius='6px';if(d.graphKind==='chem'){var _cbg=d.graphBg;var _hasCbg=_cbg&&_cbg!=='none'&&_cbg!=='transparent'&&_cbg!=='';var _cop=d.graphBgOp!=null?+d.graphBgOp:1;var _cbl=+(d.graphBgBlur||0);if(_hasCbg||_cbl>0){var _cl=document.createElement('div');_cl.style.cssText='position:absolute;inset:0;z-index:0;pointer-events:none;border-radius:inherit;';if(_hasCbg){var _ch=String(_cbg).replace('#','');if(_ch.length===6){_cl.style.background='rgba('+parseInt(_ch.slice(0,2),16)+','+parseInt(_ch.slice(2,4),16)+','+parseInt(_ch.slice(4,6),16)+','+_cop+')';}else _cl.style.background=_cbg;}el.appendChild(_cl);if(_cbl>0){el.style.backdropFilter='blur('+_cbl+'px)';el.style.webkitBackdropFilter='blur('+_cbl+'px)';}}}if(d.graphImg){var _gimg=document.createElement('img');_gimg.src=d.graphImg;_gimg.style.cssText='position:relative;z-index:1;width:100%;height:100%;object-fit:fill;display:block;';el.appendChild(_gimg);}}else if(d.type==='svg'){el.style.overflow='visible';var _svgStr3=d.svgContent||'';try{var _dp3=new DOMParser();var _doc3=_dp3.parseFromString(_svgStr3,'image/svg+xml');var _p3=_doc3.documentElement;if(_p3&&_p3.tagName!=='parsererror'){el.appendChild(document.adoptNode(_p3));}else{el.innerHTML=_svgStr3;}}catch(e){el.innerHTML=_svgStr3;}var sve=el.querySelector('svg');if(sve){sve.style.width='100%';sve.style.height='100%';if(d.svgOpacity!=null)el.style.opacity=d.svgOpacity;if(d.svgShadow)_expApplySvgShadow(el,d);
  // Синхронизируем состояние анимации декора
  if(d._isDecor){
    requestAnimationFrame(function(){
      try{
        var _t=null;
        if(_expDecorTime!=null) _t=_expDecorTime;
        else if(typeof _layoutAnimated!=='undefined'&&!_layoutAnimated){
          var _si2=SL.indexOf(s);
          _t=(_decorPausedAt&&_decorPausedAt.has(_si2))?_decorPausedAt.get(_si2):0;
        }
        if(_t!=null) sve.setCurrentTime(_t);
        if(typeof _layoutAnimated!=='undefined'&&!_layoutAnimated) sve.pauseAnimations();
      }catch(e2){}
    });
  }
}}else if(d.type==='icon'){el.style.overflow='visible';el.style.display='flex';el.style.alignItems='center';el.style.justifyContent='center';var _expIc=ICONS_DATA.find(function(x){return x.id===d.iconId;});el.innerHTML=buildIconSVG(_expIc,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle||'stroke',d.shadow,d.shadowBlur,d.shadowColor)||d.svgContent||'';var svi=el.querySelector('svg');if(svi){svi.style.width='100%';svi.style.height='100%';}}else if(d.type==='applet'){ var _aRxE=(d.rx?d.rx+'px':'0px'); el.style.borderRadius=_aRxE;el.style.overflow='visible'; el.dataset.appletId=d.appletId||''; if(d.appletId!=='generator'&&d.appletId!=='counter')el._hasLink=true; if(d.appletId==='counter'||d.appletId==='generator')el.style.cursor='pointer'; var _appletSrcdoc=d.appletHtml||''; if(d.appletId==='counter'){el.dataset.cntGroupId=d.cntGroupId||''; if(d.cntGroupId){window._counterGroupVal=window._counterGroupVal||{}; if(Object.prototype.hasOwnProperty.call(window._counterGroupVal,d.cntGroupId)){_appletSrcdoc=_appletSrcdoc.replace(/var _val=(-?[\\d.]+), _step=/,'var _val='+window._counterGroupVal[d.cntGroupId]+', _step=');}}} var _clipE=document.createElement('div'); _clipE.style.cssText='position:absolute;inset:0;overflow:hidden;border-radius:'+_aRxE+';'; var fr=document.createElement('iframe');fr.srcdoc=_appletSrcdoc; fr.style.cssText='width:100%;height:100%;border:none;'; var _frPE=(d.appletId==='timer'||d.appletId==='counter'||d.appletId==='generator')?'none':'auto'; fr.style.pointerEvents=_frPE; fr.sandbox='allow-scripts'; if(d.appletId==='counter'){fr.addEventListener('load',function(){fr.dataset.morphReady='1';},{once:true});} _clipE.appendChild(fr);el.appendChild(_clipE);
if(d.appletId==='timer'){
  fr.addEventListener('load',function(){
    try{fr.contentWindow.postMessage({type:'timerStart'},'*');}catch(e){}
  },{once:true});
  
} if((d.appletId==='generator'||d.appletId==='counter')&&d.genBorderWidth&&+d.genBorderWidth>0){  var _bwE=+d.genBorderWidth;  var _bcE=d.genBorderColor&&d.genBorderColor!==''?d.genBorderColor:'rgba(99,102,241,0.2)';  var _bordE=document.createElement('div');  _bordE.className='applet-border-overlay';  _bordE.style.cssText='position:absolute;inset:0;border-radius:'+_aRxE+';pointer-events:none;box-sizing:border-box;border:'+_bwE+'px solid '+_bcE+';z-index:2;';  el.appendChild(_bordE); }
}else if(d.type==='htmlframe'){
  var _hfs=d.hfSrc||'';
  var _hfU=/^https?:[/][/]/.test(_hfs);
  var _hfT='New Tab';
  if(_hfU){_hfT=_hfs.replace(/^https?:[/][/]/,'').split('/')[0].slice(0,40);}
  else{var _m=_hfs.match(new RegExp('<title[^>]*>([^<]*)<\/title>','i'));if(_m&&_m[1].trim())_hfT=_m[1].trim().slice(0,40);}
  el.style.overflow='hidden';
  el.style.borderRadius='6px';
  el.style.display='flex';
  el.style.flexDirection='column';
  el.style.background='transparent';
  el.style.border='1px solid rgba(128,128,128,.25)';
  el.style.boxSizing='border-box';
  var _hfbar=document.createElement('div');
  _hfbar.style.cssText='display:flex;align-items:flex-end;background:rgba(40,40,50,.92);padding:0 8px;height:32px;flex-shrink:0;';
  var _hfdots=document.createElement('div');
  _hfdots.style.cssText='display:flex;gap:5px;align-items:center;margin-right:8px;padding-bottom:6px;';
  [{bg:'#ff5f57',cls:''},{bg:'#ffbd2e',cls:''},{bg:'#28c940',cls:'hf-btn-max'}].forEach(function(cfg){
    var dot=document.createElement('div');
    dot.style.cssText='width:11px;height:11px;border-radius:50%;background:'+cfg.bg+';cursor:'+(cfg.cls?'pointer':'default')+';';
    if(cfg.cls)dot.className=cfg.cls;
    _hfdots.appendChild(dot);
  });
  var _hftab=document.createElement('div');
  _hftab.style.cssText='display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.13);border-radius:5px 5px 0 0;padding:4px 10px 5px 10px;font-size:11px;color:rgba(255,255,255,.85);max-width:200px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;align-self:flex-end;border:1px solid rgba(255,255,255,.12);border-bottom:none;margin-bottom:-1px;box-sizing:border-box;';
  var _hficon=document.createElement('span');
  _hficon.style.cssText='font-size:10px;opacity:.6;';
  _hficon.textContent=_hfU?String.fromCodePoint(127760):String.fromCodePoint(9000);
  var _hftxt=document.createElement('span');
  _hftxt.textContent=_hfT;
  _hftab.appendChild(_hficon);
  _hftab.appendChild(_hftxt);
  _hfbar.appendChild(_hfdots);
  _hfbar.appendChild(_hftab);
  var _hfwrap=document.createElement('div');
  _hfwrap.style.cssText='flex:1;overflow:hidden;background:#fff;border-top:1px solid rgba(255,255,255,.12);position:relative;';
  var _hffr=document.createElement('iframe');
  _hffr.setAttribute('sandbox','allow-scripts allow-forms allow-popups allow-presentation allow-top-navigation-by-user-activation');
  _hffr.style.cssText='width:100%;height:100%;border:none;display:block;';
  _hffr.setAttribute('allowfullscreen','');
  if(_hfU){_hffr.src=_hfs;}
  else{
    _hffr.srcdoc=(new RegExp('<!doctype','i')).test(_hfs)||(new RegExp('<html','i')).test(_hfs)?_hfs:('<!DOCTYPE html><html><head><meta charset=utf-8><style>body{margin:0;padding:8px;box-sizing:border-box}</style></head><body>'+_hfs+'</body></html>');
  }
  _hfwrap.appendChild(_hffr);
  el.appendChild(_hfbar);
  el.appendChild(_hfwrap);
  (function(_el,_b){
    var _ow=_el.style.width,_oh=_el.style.height,_ol=_el.style.left,_ot=_el.style.top,_oz=_el.style.zIndex||'2';
    var _mb=_b.querySelector('.hf-btn-max');if(!_mb)return;
    _mb.addEventListener('click',function(ev){
      ev.stopPropagation();
      if(_el.dataset.hfFs==='1'){
        _el.style.width=_ow;_el.style.height=_oh;_el.style.left=_ol;_el.style.top=_ot;_el.style.zIndex=_oz;
        _el.dataset.hfFs='0';
      }else{
        var _st=_el.parentElement;
        _el.style.width=(_st?_st.offsetWidth:1280)+'px';
        _el.style.height=(_st?_st.offsetHeight:720)+'px';
        _el.style.left='0';_el.style.top='0';_el.style.zIndex=999;
        _el.dataset.hfFs='1';
      }
    });
  })(el,_hfbar);
}else if(d.type==='code'){var T=CODE_THEMES[d.codeTheme||'dark']||CODE_THEMES.dark;var cv=document.createElement('div');cv.style.cssText=_codeBlockSurfaceCss(d,T);cv.innerHTML='<div style="font-size:9px;color:'+T.cmt+';margin-bottom:8px;text-transform:uppercase;letter-spacing:.8px">'+(d.codeLang||'')+'</div><pre style="margin:0;white-space:pre;overflow:visible">'+(d.codeHtml||'')+'</pre>';el.appendChild(cv);}else if(d.type==='table'){
  if(d.showChart&&typeof _buildChartSvg==='function'){
    var _cDiv=document.createElement('div');
    var _cBg=d.chartBg||'';
    var _cOp=d.chartBgOp!=null?+d.chartBgOp:1;
    var _cBlur=d.chartBgBlur||0;
    var _cSw=d.chartSw!=null?+d.chartSw:0;
    var _cStroke=d.chartStroke||'';
    var _cRx=d.chartRx||0;
    var _cStyle='width:100%;height:100%;position:relative;box-sizing:border-box;border-radius:'+_cRx+'px;overflow:visible;';
    if(_cBlur>0)_cStyle+='backdrop-filter:blur('+_cBlur+'px);-webkit-backdrop-filter:blur('+_cBlur+'px);';
    if(_cBg)_cStyle+='background:'+_cBg+';';
    if(_cSw>0&&_cStroke)_cStyle+='outline:'+_cSw+'px solid '+_cStroke+';outline-offset:0px;border-radius:'+_cRx+'px;';
    _cDiv.style.cssText=_cStyle;
    _cDiv.innerHTML=_buildChartSvg(d);
    var _cSvg=_cDiv.querySelector('svg');
    if(_cSvg){_cSvg.style.width='100%';_cSvg.style.height='100%';}
    el.appendChild(_cDiv);
  }else{
  var tv=document.createElement('div');tv.style.cssText='width:100%;height:100%;overflow:visible;position:relative;';
  var _exOp=d.tableBgOp!=null?+d.tableBgOp:1,_exBlur=d.tableBgBlur||0;
  function _exRgba(hex){if(!hex)return hex;var h=hex.replace('#','');var r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16),a=h.length===8?parseInt(h.slice(6,8),16)/255:1;return 'rgba('+r+','+g+','+b+','+(a*_exOp).toFixed(3)+')';}
  var tbw=d.borderW||1,tbc=d.borderColor||'#3b82f680',trx=d.rx||0,tfs=d.fs||15;
  var ttcols=d.cols||1,ttrows=d.rows||1;
  var tcws=(d.colWidths||[]).map(function(f){return Math.max(20,Math.round(f*(d.w||200)));});
  var trhs=(d.rowHeights||[]).map(function(f){return Math.max(12,Math.round(f*(d.h||150)));});
  var tt='<table style="width:100%;height:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:'+tfs+'px;color:'+(d.textColor||'#fff')+';">';
  tt+='<colgroup>'+tcws.map(function(w){return '<col style="width:'+w+'px">';}).join('')+'</colgroup><tbody>';
  var tci=0;
  for(var tpr=0;tpr<ttrows;tpr++){
    var trh=trhs[tpr]||30;tt+='<tr style="height:'+trh+'px">';
    for(var tpc=0;tpc<ttcols;tpc++,tci++){
      var tc2=(d.cells||[])[tci]||{html:'',align:'left',valign:'middle',bg:'',colspan:1,rowspan:1,hidden:false};
      if(tc2.hidden)continue;
      var tish=d.headerRow&&tpr===0,tisa=!tish&&d.altBg&&tpr%2===0;
      var tbg=_exRgba(tc2.bg||(tish?d.headerBg||'#3b82f6':tisa?d.altBg||'':d.cellBg||'#1e293b')||'');
      var tcs=tc2.colspan||1,trs=tc2.rowspan||1;
      var tlastC=(tpc+tcs-1)>=ttcols-1,tlastR=(tpr+trs-1)>=ttrows-1;
      var tbrd='border-top:'+tbw+'px solid '+tbc+';border-left:'+tbw+'px solid '+tbc+';'+(tlastC?'border-right:'+tbw+'px solid '+tbc+';':'')+(tlastR?'border-bottom:'+tbw+'px solid '+tbc+';':'');
      var tcr='';
      if(trx>0){if(tpr===0&&tpc===0)tcr+='border-top-left-radius:'+trx+'px;';if(tpr===0&&tlastC)tcr+='border-top-right-radius:'+trx+'px;';if(tlastR&&tpc===0)tcr+='border-bottom-left-radius:'+trx+'px;';if(tlastR&&tlastC)tcr+='border-bottom-right-radius:'+trx+'px;';}
      var tspan=(tcs>1?' colspan="'+tcs+'"':'')+(trs>1?' rowspan="'+trs+'"':'');
      var ttag=tish?'th':'td';
      tt+='<'+ttag+tspan+' style="background:'+tbg+';'+tbrd+'text-align:'+(tc2.align||'left')+';vertical-align:'+(tc2.valign||'middle')+';padding:5px 9px;overflow:hidden;word-break:normal;overflow-wrap:break-word;font-weight:'+(tish?700:400)+';box-sizing:border-box;'+tcr+'">'+(tc2.html||'')+'</'+ttag+'>';
    }
    tt+='</tr>';
  }
  tt+='</tbody></table>';
  var _exBlurLayer=_exBlur>0?'<div style="position:absolute;inset:0;border-radius:'+trx+'px;backdrop-filter:blur('+_exBlur+'px);-webkit-backdrop-filter:blur('+_exBlur+'px);z-index:0;pointer-events:none;"></div>':'';
  tv.innerHTML=_exBlurLayer+'<div style="position:relative;width:100%;height:100%;border-radius:'+trx+'px;overflow:hidden;z-index:1;">'+tt+'</div>';
  el.appendChild(tv);}}else if(d.type==='markdown'){var mv=document.createElement('div');mv.className='md-e';mv.style.cssText='width:100%;height:100%;overflow:auto;padding:14px 16px;box-sizing:border-box;line-height:1.65;font-size:'+(d.mdFs||16)+'px;color:'+(d.mdColor||'#1e293b')+';';mv.innerHTML=d.mdHtml||'';el.appendChild(mv);}else if(d.type==='pagenum'){var _pnC=document.createElement('div');_pnC.style.cssText='width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:visible;pointer-events:none;';_pnC.innerHTML=d.html||'';el.appendChild(_pnC);if(d.elOpacity!=null&&+d.elOpacity!==1)el.style.opacity=+d.elOpacity;}else if(d.type==='lego'){el.style.overflow='visible';var _legEc=document.createElement('div');_legEc.style.cssText='width:100%;height:100%;overflow:visible;position:relative;';var _lc=d.legoColor||'#e3000b';if(d.legoSlope)_legEc.innerHTML=_legoMakeSlopeExp(d.legoStuds,d.legoSlope,_lc);else if(d.legoStair)_legEc.innerHTML=_legoMakeStairExp(_lc,d.legoStair);else _legEc.innerHTML=_legoMakeSVGExp(d.legoStuds,d.legoTall,_lc);el.appendChild(_legEc);}else if(d.type==='mediavideo'){(function(){var msrc=d.mediaSrc||'',mfull=d.mvDisplay==='fullscreen',mctrl=d.mvControls!=='none',mauto=d.mvStart==='auto';if(mfull){el.style.cssText+=';background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer;';el.innerHTML='<div style="display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.3"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,8 16,12 10,16" fill="rgba(255,255,255,.8)" stroke="none"/></svg><span style="font-size:12px;color:rgba(255,255,255,.5);font-family:sans-serif">Click to play</span></div>';var _mopen=function(){var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:#000;z-index:99999;display:flex;align-items:center;justify-content:center;';var v=document.createElement('video');v.src=msrc;v.autoplay=true;if(mctrl)v.controls=true;v.style.cssText='max-width:100%;max-height:100%;outline:none;';var mbtn=document.createElement('button');mbtn.textContent='\u2715';mbtn.style.cssText='position:absolute;top:16px;right:20px;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:20px;cursor:pointer;padding:6px 12px;border-radius:6px;';var _mclose=function(){v.pause();if(document.body.contains(ov))document.body.removeChild(ov);document.removeEventListener('keydown',_mkey);};var _mkey=function(e){if(e.key==='Escape')_mclose();};mbtn.onclick=_mclose;document.addEventListener('keydown',_mkey);ov.appendChild(v);ov.appendChild(mbtn);document.body.appendChild(ov);};if(mauto)setTimeout(_mopen,80);else el.addEventListener('click',function(e){e.stopPropagation();_mopen();});}else{el.style.overflow='hidden';var mvid=document.createElement('video');mvid.src=msrc;mvid.style.cssText='width:100%;height:100%;object-fit:contain;display:block;background:#000;';if(mctrl)mvid.controls=true;if(mauto){mvid.autoplay=true;mvid.muted=true;}el.appendChild(mvid);if(!mauto&&!mctrl){el.style.cursor='pointer';(function(v2){el.addEventListener('click',function(e){e.stopPropagation();v2.currentTime=0;v2.play();});})(mvid);}}})();}else if(d.type==='mediaaudio'){(function(){var msrc=d.mediaSrc||'',mvol=d.maVolume!=null?d.maVolume:1,mmode=d.maStart||'click-el',mpersist=d.maContinue==='all';var mic=mmode==='auto'?'rgba(255,255,255,.3)':'rgba(255,255,255,.7)';el.style.cssText+=';display:flex;align-items:center;justify-content:center;';el.innerHTML='<div style="display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none;"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="'+mic+'" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><span style="font-size:9px;color:'+mic+';font-family:sans-serif">'+({'auto':'Auto','click-el':'Click','click-slide':'Slide'}[mmode]||'')+'</span></div>';var _d=function(m,c2){if(window._dbg)window._dbg(m,c2);};if(!msrc){_d('Audio ['+d.id+']: no src','#f66');return;}if(!window._expAR)window._expAR={};var maud;if(mpersist&&window._expAR[d.id]){maud=window._expAR[d.id];_d('Audio ['+d.id+']: reuse');}else{if(window._expAR[d.id]){try{window._expAR[d.id].pause();}catch(e){}}maud=new Audio(msrc);maud.volume=mvol;window._expAR[d.id]=maud;_d('Audio ['+d.id+'] src='+(msrc.startsWith('data:')?'data:('+Math.round(msrc.length/1024)+'KB)':msrc.slice(0,40))+' mode='+mmode);}maud._persist=mpersist;if(!window._slAudio)window._slAudio=[];if(window._slAudio.indexOf(maud)<0)window._slAudio.push(maud);maud.addEventListener('error',function(){_d('Audio ['+d.id+'] ERR '+((maud.error&&maud.error.code)||''),'#f44');});var _ico=function(p){var s=el.querySelector('svg');if(s)s.style.stroke=p?'rgba(99,210,150,.9)':mic;};maud.addEventListener('play',function(){_ico(true);_d('Audio ['+d.id+'] PLAY','#5f5');});maud.addEventListener('pause',function(){_ico(false);});maud.addEventListener('ended',function(){_ico(false);_d('Audio ['+d.id+'] END');});if(mmode==='auto'){  (function(ma){ma.currentTime=0;ma.play().catch(function(){    _d('auto blocked, queued','#fa5');    /* Store in slot keyed by element id so goto() can replay without duplication */    if(!window._maqPending)window._maqPending={};    window._maqPending[d.id]=ma;    if(!window._maqGoHooked){      window._maqGoHooked=true;      /* Wrap goto to trigger pending audio when navigating TO a slide */      var _origGoto=window.goto;      window.goto=function(to,dir){        _origGoto.apply(this,arguments);        /* After build, play any pending auto-audio for this slide */        setTimeout(function(){if(window._playPendingForSlide)window._playPendingForSlide(to);},100);      };    }  });})(maud);} else if(mmode==='click-el'){  var mtids=(d.maTriggerElIds&&d.maTriggerElIds.length)?d.maTriggerElIds:(d.maTriggerElId?[d.maTriggerElId]:[]);  _d('Audio ['+d.id+']: click-el '+JSON.stringify(mtids));  (function(mR,cR,sR,tids,sEl,eId){    setTimeout(function(){      var pels=cR.querySelectorAll('.psel');_d('Audio ['+eId+']: psel='+pels.length);      var targets=[];      tids.forEach(function(tid){var ti=sR.els?sR.els.findIndex(function(e){return e.id===tid;}):-1;var tel=ti>=0?pels[ti]:null;_d('  '+tid+' idx='+ti+' '+(tel?tel.dataset.type:'MISSING'),(tel?'#7f7':'#f44'));if(tel)targets.push(tel);});      if(!targets.length)targets.push(sEl);            /* Listen on document capture so we catch clicks on any child (SVG etc) */      /* Simple bubble listener - same as preview mode */targets.forEach(function(tel){tel._mAudioTrig={mR:mR,eId:eId};});if(!window._maTrigHooked){  window._maTrigHooked=true;  document.addEventListener('mousedown',function(ev){      var t=ev.target;    while(t&&t!==document){      if(t._mAudioTrig){        var info=t._mAudioTrig;        _d('mousedown trigger -> play ['+info.eId+']','#5ff');        info.mR.currentTime=0;info.mR.play().catch(function(err){_d('play err:'+err.message,'#f44');});        ev.stopImmediatePropagation();ev.stopPropagation();        /* suppress the click that follows this mousedown */        document.addEventListener('click',function(e){e.stopImmediatePropagation();e.stopPropagation();e.preventDefault();},{once:true,capture:true});        return;      }      t=t.parentElement;    }  },true);}    },0);  })(maud,c,s,mtids,el,d.id);} else if(mmode==='click-slide'){  el.style.pointerEvents='none';  var _st=document.getElementById('stage');  if(_st)(function(mR,eId){_st.addEventListener('click',function _csh(ev){_st.removeEventListener('click',_csh,true);ev.stopImmediatePropagation();_d('click-slide -> play ['+eId+']','#5ff');mR.currentTime=0;mR.play().catch(function(err){_d('play err:'+err.message,'#f44');});},true);})(maud,d.id);}})();}if(d.link){el.style.cursor='pointer';(function(lk,lt){el.addEventListener('click',function(){if(lk.startsWith('#slide-')){var spec=lk.slice(7),si;if(spec==='next'){if(typeof next==='function'){clearTimeout(aT);next();return;}si=Math.min(idx+1,SL.length-1);}else if(spec==='prev'){if(typeof prev==='function'){clearTimeout(aT);prev();return;}si=Math.max(idx-1,0);}else if(spec==='first')si=0;else if(spec==='last')si=SL.length-1;else si=parseInt(spec,10)-1;if(si>=0&&si<SL.length){clearTimeout(aT);goto(si,si>idx?'next':'prev');}}else window.open(lk,lt||'_blank');});})(d.link,d.linkt);}if(d.hoverFx)applyHoverFx(el,d.hoverFx,d);var ea=(d.anims||[]).filter(function(a){return a.category==='exit';});// Element trigger: click on element fires anims one-time
(function(){var _hasElem=(d.anims||[]).some(function(a){return a.trigger==='element';});if(!_hasElem)return;delete gAutoMap[d.id];delete gClickMap[d.id];var _steps=[],_ai=0,_allAnims=d.anims||[];while(_ai<_allAnims.length){var _a=_allAnims[_ai];if(_a.trigger==='element'){var _step={anims:[_a],willHide:_a.cat==='exit',navTarget:typeof _a.navTarget==='number'?_a.navTarget:null,triggerElId:_a.triggerElId||''};var _aj=_ai+1;while(_aj<_allAnims.length&&_allAnims[_aj].trigger==='withPrev'){var _b=_allAnims[_aj];_step.anims.push(_b);if(_b.cat==='exit')_step.willHide=true;if(typeof _b.navTarget==='number')_step.navTarget=_b.navTarget;_aj++;}_steps.push(_step);_ai=_aj;}else{_ai++;}}if(_steps.length===0)return;if(!c._elemTrigBindings)c._elemTrigBindings=[];c._elemTrigBindings.push({targetId:d.id,steps:_steps});})();
var cla=gClickMap[d.id]||[];var timedAuto=gAutoMap[d.id]||[];(function(){var motionA=timedAuto.filter(function(ta){return ta.anim.name==='moveTo'||ta.anim.name==='orbitTo';});var rotateA=timedAuto.filter(function(ta){return ta.anim.name==='rotate';});var cssA=timedAuto.filter(function(ta){var n=ta.anim.name;return n!=='moveTo'&&n!=='orbitTo'&&n!=='rotate'&&n!=='typewriter'&&n!=='splitHalf'&&n!=='captionSlide'&&!_LIVE_NAMES[n];});var liveA=timedAuto.filter(function(ta){return !!_LIVE_NAMES[ta.anim.name];});var twA=timedAuto.filter(function(ta){return ta.anim.name==='typewriter';});var splitA=timedAuto.filter(function(ta){return ta.anim.name==='splitHalf';});var ecEl=el.querySelector('.ec')||null;var groupsEl={},groupsEc={};cssA.forEach(function(ta){var isEmp=ta.anim.cat==='emphasis';var grps=(isEmp&&ecEl)?groupsEc:groupsEl;if(!grps[ta.absDelay])grps[ta.absDelay]=[];grps[ta.absDelay].push(ta.anim);});Object.keys(groupsEl).forEach(function(ds){var d2=+ds,grp=groupsEl[ds];setTimeout(function(){var hasExit=grp.some(function(a){return a.cat==='exit';});var hasEntrance=grp.some(function(a){return a.cat==='entrance';});if(el.dataset.morphEnter==='1'&&hasEntrance&&!hasExit){if(!(typeof _particlesHasAnim==='function'&&_particlesHasAnim(d)))el.style.visibility='visible';delete el.dataset.morphEnter;return;}if(!(typeof _particlesHasAnim==='function'&&_particlesHasAnim(d)))el.style.visibility='';el.style.animation='none';void el.offsetWidth;el.style.animation=grp.map(function(a){var nm=AMAP[a.name]||'el-fadein';return nm+' '+(a.duration||600)/1000+'s ease-out 0s both';}).join(',');},d2+transOffset);});Object.keys(groupsEc).forEach(function(ds){var d2=+ds,grp=groupsEc[ds];setTimeout(function(){ecEl.style.animation='none';void ecEl.offsetWidth;ecEl.style.animation=grp.map(function(a){var nm=AMAP[a.name]||'el-fadein';return nm+' '+(a.duration||600)/1000+'s ease-out 0s both';}).join(',');setTimeout(function(){ecEl.style.animation='';},Math.max.apply(null,grp.map(function(a){return a.duration||600;}))+50);},d2+transOffset);});var cumTx=0,cumTy=0;motionA.forEach(function(ta){var a=ta.anim,absDelay=ta.absDelay;fireExportAnim(el,a,absDelay+transOffset,cumTx,cumTy);if(a.name==='moveTo'){cumTx=a.tx||0;cumTy=a.ty||0;}else if(a.name==='orbitTo'){var ocx=a.orbitCx||0,ocy=a.orbitCy||0,r=Math.sqrt(ocx*ocx+ocy*ocy)||(a.orbitR||120),dir=(a.orbitDir||'cw')==='cw'?1:-1,deg=(a.orbitDeg!=null?a.orbitDeg:360)*dir;var sa=Math.atan2(-ocy,-ocx),ea=sa+deg*Math.PI/180;cumTx+=(ocx+r*Math.cos(ea))-(ocx+r*Math.cos(sa));cumTy+=(ocy+r*Math.sin(ea))-(ocy+r*Math.sin(sa));}});rotateA.forEach(function(ta){fireExportAnim(el,ta.anim,ta.absDelay+transOffset,0,0,ecEl);});liveA.forEach(function(ta){
  // Используем absDelay из цепочки — учитывает withPrev
  fireExportAnim(el,ta.anim,(ta.absDelay||0)+transOffset,0,0,ecEl);
  if(ta.anim.stopAfter){
    var nextNonLive=timedAuto.find(function(x){return x.anim.cat!=='live'&&(x.absDelay||0)>0;});
    if(nextNonLive){
      setTimeout(function(){
        var _tgt3=ecEl||el;
        if(el._liveAnims){el._liveAnims.forEach(function(an){try{an.cancel();}catch(e){}});el._liveAnims=[];}
        _tgt3.style.transform='';
      },nextNonLive.absDelay);
    }
  }
});twA.forEach(function(ta){fireExportAnim(el,ta.anim,(ta.absDelay||0)+transOffset,0,0,ecEl);});splitA.forEach(function(ta){fireExportAnim(el,ta.anim,(ta.absDelay||0)+transOffset,0,0,ecEl);});var capA=timedAuto.filter(function(ta){return ta.anim.name==='captionSlide';});if(capA.length){if(!c._pendingCaptionQueue)c._pendingCaptionQueue=[];capA.forEach(function(ta){c._pendingCaptionQueue.push({d:d,a:ta.anim,absDelay:ta.absDelay});});}})();ea.forEach(function(a){setTimeout(function(){var nm=AMAP[a.name]||'el-fadeout';el.style.animation=nm+' '+(a.dur||0.5)+'s ease-out both';},(a.delay||0)*1000+transOffset);});var claClick=cla.filter(function(x){return !x.autoAfter;});var claAuto=cla.filter(function(x){return x.autoAfter;});if(claClick.length||claAuto.length)ca.push({el:el,clickAnims:claClick.map(function(x){return x.anim;}),autoAnims:claAuto.map(function(x){return x.anim;})});var _firstAutoAnim=(gAutoMap[d.id]||[])[0];var _firstClickAnim=(gClickMap[d.id]||[])[0];var _shouldHide=false;if(_firstClickAnim&&(_firstClickAnim.anim.cat==='entrance')){_shouldHide=true;}else if(_firstAutoAnim&&(_firstAutoAnim.anim.cat==='entrance')&&(_firstAutoAnim.absDelay>0)){_shouldHide=true;}if(_shouldHide){el.style.visibility='hidden';}var _deferCap=typeof _captionAnimDeferredByTrigger==='function'?_captionAnimDeferredByTrigger(d.anims):null;if(_deferCap&&typeof _hideCaptionUntilTrigger==='function')_hideCaptionUntilTrigger(el,d,_deferCap);c.appendChild(el);if(typeof _particlesEnsureHiddenIfNeeded==='function')_particlesEnsureHiddenIfNeeded(el,d);if(d.type==='applet'){if(d.appletId==='counter')_expWireAppletStepClick(el,'counterStep');if(d.appletId==='generator')_expWireAppletStepClick(el,'genStep');}});_expWireElemTriggers(c,i);
// ── Connectors ──────────────────────────────────────────────────────────────
(function(){
  var conns=s.connectors||[];if(!conns.length)return;
  var elMap={};s.els.forEach(function(d){elMap[d.id]=d;});
  function edgeMid(elId,sideKey,othId){
    var d=elMap[elId];if(!d)return{x:0,y:0};
    var cx=d.x+d.w/2,cy=d.y+d.h/2,deg=d.rot||0;
    function rot(px,py){
      if(!deg)return{x:px,y:py};
      var rad=deg*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad),rx=px-cx,ry=py-cy;
      return{x:cx+rx*cos-ry*sin,y:cy+rx*sin+ry*cos};
    }
    function rotDir(nx,ny){
      if(!deg)return{nx:nx,ny:ny};
      var rad=deg*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad);
      return{nx:nx*cos-ny*sin,ny:nx*sin+ny*cos};
    }
    var sides={
      top:   Object.assign(rot(cx,d.y),      rotDir(0,-1)),
      right: Object.assign(rot(d.x+d.w,cy),  rotDir(1,0)),
      bottom:Object.assign(rot(cx,d.y+d.h),  rotDir(0,1)),
      left:  Object.assign(rot(d.x,cy),      rotDir(-1,0)),
      center:{x:cx,y:cy,nx:0,ny:0}
    };
    if(sides[sideKey])return sides[sideKey];
    var od=elMap[othId],tx=od?od.x+od.w/2:cx,ty=od?od.y+od.h/2:cy;
    var best=sides.right,bestD=Infinity;
    for(var k in sides){var p=sides[k],d2=(p.x-tx)*(p.x-tx)+(p.y-ty)*(p.y-ty);if(d2<bestD){bestD=d2;best=p;}}
    return best;
  }
  function applyLineGap(r1,r2,gap){
    gap=gap||0;
    if(!gap)return{p1:r1,p2:r2};
    var dx=r2.x-r1.x,dy=r2.y-r1.y,len=Math.sqrt(dx*dx+dy*dy);
    if(len<0.001)return{p1:r1,p2:r2};
    var g=Math.min(gap,len/2),ux=dx/len,uy=dy/len;
    return{p1:{x:r1.x+ux*g,y:r1.y+uy*g},p2:{x:r2.x-ux*g,y:r2.y-uy*g}};
  }
  function applySideGap(pt,gap){
    if(!gap)return pt;
    return{x:pt.x+pt.nx*gap,y:pt.y+pt.ny*gap};
  }
  function defaultCP(p1,p2){
    var dx=p2.x-p1.x,dy=p2.y-p1.y,dist=Math.sqrt(dx*dx+dy*dy),bend=Math.min(dist*0.45,220);
    if(Math.abs(dx)>Math.abs(dy)*0.6)return{cp1:{x:p1.x+bend*(dx>=0?1:-1),y:p1.y},cp2:{x:p2.x-bend*(dx>=0?1:-1),y:p2.y}};
    return{cp1:{x:p1.x,y:p1.y+bend*(dy>=0?1:-1)},cp2:{x:p2.x,y:p2.y-bend*(dy>=0?1:-1)}};
  }
  function orthoPts(p1,p2,fromSide,toSide){
    var hFrom=fromSide==='left'||fromSide==='right',hTo=toSide==='left'||toSide==='right';
    if(hFrom&&hTo){var mx=(p1.x+p2.x)/2;return[p1,{x:mx,y:p1.y},{x:mx,y:p2.y},p2];}
    if(!hFrom&&!hTo){var my=(p1.y+p2.y)/2;return[p1,{x:p1.x,y:my},{x:p2.x,y:my},p2];}
    if(hFrom)return[p1,{x:p2.x,y:p1.y},p2];
    return[p1,{x:p1.x,y:p2.y},p2];
  }
  function orthoPathD(pts){
    return pts.map(function(p,i){return(i===0?'M':'L')+p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ');
  }
  var NS='http://www.w3.org/2000/svg';
  var svg=document.createElementNS(NS,'svg');
  svg.setAttribute('style','position:absolute;left:0;top:0;width:'+W+'px;height:'+H+'px;pointer-events:none;overflow:visible;z-index:1;');
  var defs=document.createElementNS(NS,'defs');svg.appendChild(defs);
  conns.forEach(function(conn){
    var sw=conn.sw||2,dash=conn.dash||'solid',color=(conn.color==='none'||conn.color==='transparent')?'none':(conn.color||'#60a5fa');
    var fromMk=conn.fromMarker||'none',toMk=conn.toMarker||(conn.type==='arrow'?'arrow':'none');
    var gap=conn.gap||0;
    var r1=edgeMid(conn.fromId,conn.fromSide,conn.toId);
    var r2=edgeMid(conn.toId,conn.toSide,conn.fromId);
    var route=conn.route||'curve',p1,p2;
    if(route==='straight'){
      var gp=applyLineGap(r1,r2,gap);p1=gp.p1;p2=gp.p2;
    }else{
      p1=applySideGap(r1,gap);p2=applySideGap(r2,gap);
    }
    var def=defaultCP(p1,p2);
    var cp1=conn.cp1||def.cp1,cp2=conn.cp2||def.cp2;
    function mkr(id,type,atStart){
      if(type==='none')return;
      var m=document.createElementNS(NS,'marker');
      m.setAttribute('id',id);m.setAttribute('markerUnits','strokeWidth');
      m.setAttribute('orient','auto');
      if(type==='arrow'){
        m.setAttribute('markerWidth','3.1');m.setAttribute('markerHeight','3.5');
        m.setAttribute('refX',atStart?'1.386':'1.386');m.setAttribute('refY','1.6');
        var poly=document.createElementNS(NS,'path');
        var pathEnd='M2.555,1.475 L2.555,1.475 Q2.771,1.600 2.555,1.725 L0.217,3.075 Q0.000,3.200 0.000,2.950 L0.000,0.250 Q0.000,0.000 0.217,0.125 Z';
        var pathStart='M0.216,1.475 L0.216,1.475 Q0.000,1.600 0.216,1.725 L2.554,3.075 Q2.771,3.200 2.771,2.950 L2.771,0.250 Q2.771,0.000 2.554,0.125 Z';
        poly.setAttribute('d',atStart?pathStart:pathEnd);
        poly.setAttribute('fill',color);poly.setAttribute('stroke','none');
        m.appendChild(poly);
      }else if(type==='square'){
        m.setAttribute('markerWidth','3.4');m.setAttribute('markerHeight','3.4');
        m.setAttribute('refX',atStart?'1.7':'1.7');m.setAttribute('refY','1.7');
        var r=document.createElementNS(NS,'rect');
        r.setAttribute('x','0.2');r.setAttribute('y','0.2');r.setAttribute('width','3.0');r.setAttribute('height','3.0');
        r.setAttribute('rx','0.5');r.setAttribute('ry','0.5');
        r.setAttribute('fill',color);r.setAttribute('stroke-width','0');m.appendChild(r);
      }else if(type==='circle'){
        m.setAttribute('markerWidth','3.0');m.setAttribute('markerHeight','3.0');
        m.setAttribute('refX','1.5');m.setAttribute('refY','1.5');
        var c=document.createElementNS(NS,'circle');
        c.setAttribute('cx','1.5');c.setAttribute('cy','1.5');c.setAttribute('r','1.3');
        c.setAttribute('fill',color);c.setAttribute('stroke-width','0');m.appendChild(c);
      }else if(type==='bar'){
        m.setAttribute('markerWidth','3.0');m.setAttribute('markerHeight','3.0');
        m.setAttribute('refX','1.5');m.setAttribute('refY','1.5');
        var lnb=document.createElementNS(NS,'path');
        lnb.setAttribute('d','M1.5,0.2 L1.5,2.8');
        lnb.setAttribute('stroke',color);lnb.setAttribute('stroke-width','1');
        lnb.setAttribute('stroke-linecap','round');lnb.setAttribute('fill','none');m.appendChild(lnb);
      }else if(type==='cross'){
        m.setAttribute('orient','0');
        m.setAttribute('markerWidth','3.0');m.setAttribute('markerHeight','3.0');
        m.setAttribute('refX','1.5');m.setAttribute('refY','1.5');
        ['M0.3,0.3 L2.7,2.7','M2.7,0.3 L0.3,2.7'].forEach(function(pd){
          var ln=document.createElementNS(NS,'path');
          ln.setAttribute('d',pd);ln.setAttribute('stroke',color);
          ln.setAttribute('stroke-width','1');ln.setAttribute('stroke-linecap','round');ln.setAttribute('fill','none');
          m.appendChild(ln);
        });
      }
      defs.appendChild(m);
    }
    var mfId=conn.id+'_emf',mtId=conn.id+'_emt';
    mkr(mfId,fromMk,true);mkr(mtId,toMk,false);
    var dashArr=null,linecap='round';
    if(dash==='dot'){dashArr='0 '+(sw*4);linecap='round';}
    else if(dash==='dash'){dashArr=(sw*5)+' '+(sw*3);}
    if(conn.animated&&dash!=='solid'){
      var st=document.createElementNS(NS,'style');
      var off=dash==='dot'?sw*4:sw*8;
      var fOff=conn.animInvert?0:off, tOff=conn.animInvert?off:0;
      st.textContent='@keyframes ec_'+conn.id+'{from{stroke-dashoffset:'+fOff+'}to{stroke-dashoffset:'+tOff+'}}';
      defs.appendChild(st);
    }
    function xMkDist(t){return t==='arrow'?1.386:t==='square'?1.7:t==='circle'?1.5:t==='bar'?1.5:t==='cross'?1.5:0;}
    function xMkRetract(pt,cp,d){if(!d||sw<=0)return pt;var tdx=cp.x-pt.x,tdy=cp.y-pt.y,tl=Math.sqrt(tdx*tdx+tdy*tdy)||1;return{x:pt.x+(tdx/tl)*sw*d,y:pt.y+(tdy/tl)*sw*d};}
    var route=conn.route||'curve',pd;
    if(route==='orthogonal'){
      var oPts=orthoPts(p1,p2,conn.fromSide,conn.toSide);
      var rp2o=toMk!=='none'?xMkRetract(oPts[oPts.length-1],oPts[oPts.length-2],xMkDist(toMk)):oPts[oPts.length-1];
      var rp1o=fromMk!=='none'?xMkRetract(oPts[0],oPts[1],xMkDist(fromMk)):oPts[0];
      pd=orthoPathD([rp1o].concat(oPts.slice(1,-1),[rp2o]));
    }else if(route==='straight'){
      var rp2s=toMk!=='none'?xMkRetract(p2,p1,xMkDist(toMk)):p2;
      var rp1s=fromMk!=='none'?xMkRetract(p1,p2,xMkDist(fromMk)):p1;
      pd='M'+rp1s.x.toFixed(1)+','+rp1s.y.toFixed(1)+' L'+rp2s.x.toFixed(1)+','+rp2s.y.toFixed(1);
    }else{
      var rp2=toMk!=='none'?xMkRetract(p2,cp2,xMkDist(toMk)):p2,rp1=fromMk!=='none'?xMkRetract(p1,cp1,xMkDist(fromMk)):p1;
      pd='M'+rp1.x.toFixed(1)+','+rp1.y.toFixed(1)+' C'+cp1.x.toFixed(1)+','+cp1.y.toFixed(1)+' '+cp2.x.toFixed(1)+','+cp2.y.toFixed(1)+' '+rp2.x.toFixed(1)+','+rp2.y.toFixed(1);
    }
    var line=document.createElementNS(NS,'path');
    line.setAttribute('data-pconn-id',conn.id);
    line.setAttribute('d',pd);line.setAttribute('fill','none');
    line.setAttribute('stroke',color);line.setAttribute('stroke-width',sw);
    line.setAttribute('opacity',conn.opacity!=null?conn.opacity:1);
    line.setAttribute('stroke-linecap',(dash==='dot')?'round':((fromMk!=='none'||toMk!=='none')?'butt':linecap));line.setAttribute('stroke-linejoin','round');
    if(dashArr){line.setAttribute('stroke-dasharray',dashArr);
      if(conn.animated)line.style.animation='ec_'+conn.id+' '+(dash==='dot'?'1s':'0.8s')+' linear infinite';}
    if(fromMk!=='none')line.setAttribute('marker-start','url(#'+mfId+')');
    if(toMk!=='none')line.setAttribute('marker-end','url(#'+mtId+')');
    svg.appendChild(line);
    var rider=null;
    for(var _ri=0;_ri<s.els.length;_ri++){if(s.els[_ri].rideConnId===conn.id){rider=s.els[_ri];break;}}
    if(rider){
      var riderEl=c.querySelector('.psel[data-id="'+rider.id+'"]');
      if(riderEl){
        var rdur=Math.max(0.3,conn.rideDuration||3.5);
        var rgap=Math.max(0,conn.rideInterval||0);
        var rtotal=rdur+rgap;
        var rbaseOp=rider.elOpacity!=null?rider.elOpacity:1;
        var rinv=!!conn.animInvert;
        (function(el,pathD,dur,gap,inv,baseOp,baseRot){
          var meas=document.createElementNS('http://www.w3.org/2000/svg','path');
          meas.setAttribute('d',pathD);
          var hold=document.createElementNS('http://www.w3.org/2000/svg','svg');
          hold.setAttribute('width','0');hold.setAttribute('height','0');
          hold.style.cssText='position:absolute;left:-9999px;top:-9999px;overflow:hidden';
          hold.appendChild(meas);document.body.appendChild(hold);
          var len=0;try{len=meas.getTotalLength();}catch(e){len=0;}
          if(!len||!isFinite(len)){if(hold.parentNode)hold.parentNode.removeChild(hold);return;}
          var w=el.offsetWidth||parseFloat(el.style.width)||0;
          var h=el.offsetHeight||parseFloat(el.style.height)||0;
          el.style.left='0px';el.style.top='0px';el.style.margin='0';
          el.style.offsetPath='none';el.style.animation='none';
          el.style.transformOrigin='center center';el.style.opacity='0';
          var start=performance.now(),total=dur+gap;
          baseRot=baseRot||0;
          function ptAt(d){try{return meas.getPointAtLength(Math.max(0,Math.min(len,d)));}catch(e){return{x:0,y:0};}}
          function angAt(dist){
            var eps=Math.max(0.75,Math.min(4,len*0.002)),dA,dB;
            if(!inv){dA=Math.max(0,dist-eps*0.5);dB=Math.min(len,dist+eps*0.5);if(dB<=dA){dA=Math.max(0,len-eps);dB=len;}}
            else{dA=Math.min(len,dist+eps*0.5);dB=Math.max(0,dist-eps*0.5);if(dA<=dB){dA=Math.min(len,eps);dB=0;}}
            var a=ptAt(dA),b=ptAt(dB),dx=b.x-a.x,dy=b.y-a.y;
            if(Math.abs(dx)<1e-6&&Math.abs(dy)<1e-6)return baseRot;
            return Math.atan2(dy,dx)*180/Math.PI+baseRot;
          }
          function frame(now){
            if(!el.isConnected){if(hold.parentNode)hold.parentNode.removeChild(hold);return;}
            var t=((now-start)/1000)%total,op=0,frac=inv?1:0;
            if(t<=dur){var p=t/dur;frac=inv?(1-p):p;op=p<0.15?baseOp*(p/0.15):(p>0.85?baseOp*((1-p)/0.15):baseOp);}
            else{frac=inv?0:1;op=0;}
            var dist=frac*len,pt=ptAt(dist),ang=angAt(dist);
            el.style.transform='translate('+(pt.x-w/2)+'px,'+(pt.y-h/2)+'px) rotate('+ang+'deg)';
            el.style.opacity=String(op);
            requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        })(riderEl,pd,rdur,rgap,rinv,rbaseOp,rider.rot||0);
      }
    }
  });
  var _motionOffsets={};
  window._expUpdateConnForMotion=function(elId,tx,ty,w,h,rot){
    _motionOffsets[elId]={tx:tx||0,ty:ty||0,w:w,h:h,rot:rot};
    conns.forEach(function(conn){
      if(conn.fromId!==elId&&conn.toId!==elId)return;
      var line2=svg.querySelector('[data-pconn-id="'+conn.id+'"]');
      if(!line2)return;
      function offsetMid(did,otherDid,sideKey){
        var base=elMap[did];if(!base)return{x:0,y:0};
        var off=_motionOffsets[did]||{tx:0,ty:0};
        var bw=off.w!=null?off.w:base.w,bh=off.h!=null?off.h:base.h;
        var bx=base.x+(off.tx||0),by=base.y+(off.ty||0);
        var cx=bx+bw/2,cy=by+bh/2;
        var deg=off.rot!=null?off.rot:(base.rot||0);
        function rot2(px,py){
          if(!deg)return{x:px,y:py};
          var rad=deg*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad),rx=px-cx,ry=py-cy;
          return{x:cx+rx*cos-ry*sin,y:cy+rx*sin+ry*cos};
        }
        function rotDir2(nx,ny){
          if(!deg)return{nx:nx,ny:ny};
          var rad=deg*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad);
          return{nx:nx*cos-ny*sin,ny:nx*sin+ny*cos};
        }
        var sides={
          top:   Object.assign(rot2(cx,by),      rotDir2(0,-1)),
          right: Object.assign(rot2(bx+bw,cy),   rotDir2(1,0)),
          bottom:Object.assign(rot2(cx,by+bh),   rotDir2(0,1)),
          left:  Object.assign(rot2(bx,cy),      rotDir2(-1,0)),
          center:{x:cx,y:cy,nx:0,ny:0}
        };
        if(sides[sideKey])return sides[sideKey];
        var od=elMap[otherDid];
        var offO=_motionOffsets[otherDid]||{tx:0,ty:0};
        var tx2=od?od.x+(offO.tx||0)+od.w/2:cx,ty2=od?od.y+(offO.ty||0)+od.h/2:cy;
        var best=sides.right,bestD=Infinity;
        for(var k in sides){var p=sides[k],d2=(p.x-tx2)*(p.x-tx2)+(p.y-ty2)*(p.y-ty2);if(d2<bestD){bestD=d2;best=p;}}
        return best;
      }
      var r1=offsetMid(conn.fromId,conn.toId,conn.fromSide);
      var r2=offsetMid(conn.toId,conn.fromId,conn.toSide);
      var gap2=conn.gap||0,p1b,p2b;
      if((conn.route||'curve')==='straight'){var gpb=applyLineGap(r1,r2,gap2);p1b=gpb.p1;p2b=gpb.p2;}
      else{p1b=applySideGap(r1,gap2);p2b=applySideGap(r2,gap2);}
      var defb=defaultCP(p1b,p2b);
      var cp1b=conn.cp1||defb.cp1,cp2b=conn.cp2||defb.cp2;
      var fromMkB=conn.fromMarker||'none',toMkB=conn.toMarker||(conn.type==='arrow'?'arrow':'none');
      var swB=conn.sw||2;
      function xMkDistB(t){return t==='arrow'?1.386:t==='square'?1.7:t==='circle'?1.5:t==='bar'?1.5:t==='cross'?1.5:0;}
      function xMkRetractB(pt,cp,dd){if(!dd||swB<=0)return pt;var tdx=cp.x-pt.x,tdy=cp.y-pt.y,tl=Math.sqrt(tdx*tdx+tdy*tdy)||1;return{x:pt.x+(tdx/tl)*swB*dd,y:pt.y+(tdy/tl)*swB*dd};}
      var routeB=conn.route||'curve',pdB;
      if(routeB==='orthogonal'){
        var oPtsB=orthoPts(p1b,p2b,conn.fromSide,conn.toSide);
        var rp2ob=toMkB!=='none'?xMkRetractB(oPtsB[oPtsB.length-1],oPtsB[oPtsB.length-2],xMkDistB(toMkB)):oPtsB[oPtsB.length-1];
        var rp1ob=fromMkB!=='none'?xMkRetractB(oPtsB[0],oPtsB[1],xMkDistB(fromMkB)):oPtsB[0];
        pdB=orthoPathD([rp1ob].concat(oPtsB.slice(1,-1),[rp2ob]));
      }else if(routeB==='straight'){
        var rp2sb=toMkB!=='none'?xMkRetractB(p2b,p1b,xMkDistB(toMkB)):p2b;
        var rp1sb=fromMkB!=='none'?xMkRetractB(p1b,p2b,xMkDistB(fromMkB)):p1b;
        pdB='M'+rp1sb.x.toFixed(1)+','+rp1sb.y.toFixed(1)+' L'+rp2sb.x.toFixed(1)+','+rp2sb.y.toFixed(1);
      }else{
        var rp2b=toMkB!=='none'?xMkRetractB(p2b,cp2b,xMkDistB(toMkB)):p2b,rp1b=fromMkB!=='none'?xMkRetractB(p1b,cp1b,xMkDistB(fromMkB)):p1b;
        pdB='M'+rp1b.x.toFixed(1)+','+rp1b.y.toFixed(1)+' C'+cp1b.x.toFixed(1)+','+cp1b.y.toFixed(1)+' '+cp2b.x.toFixed(1)+','+cp2b.y.toFixed(1)+' '+rp2b.x.toFixed(1)+','+rp2b.y.toFixed(1);
      }
      line2.setAttribute('d',pdB);
    });
  };
  c.appendChild(svg);
})();
var cg=[];ca.forEach(function(step){if(step.clickAnims.length>0){cg.push(step);}else if(step.autoAnims.length>0&&cg.length>0){cg[cg.length-1]._autoSteps=cg[cg.length-1]._autoSteps||[];cg[cg.length-1]._autoSteps.push(step);}});var ci=0;function _doStep(){if(ci>=cg.length)return false;var grp=cg[ci];var _ps=0,_pd=0;var _timed=grp.clickAnims.map(function(a,i){var t=a.trigger||'auto',rd=a.delay||0,abs;if(i===0){abs=rd;}else if(t==='withPrev'){abs=_ps+rd;}else{abs=_ps+_pd+rd;}_ps=abs;_pd=a.duration||600;return{anim:a,absDelay:abs};});_timed.forEach(function(td){fireExportAnim(grp.el,td.anim,td.absDelay);});var autoDelay=0;_timed.forEach(function(td){autoDelay=Math.max(autoDelay,td.absDelay+(td.anim.duration||600));});grp.autoAnims.forEach(function(a){var t=autoDelay;autoDelay+=a.duration||600;(function(el2,a2,delay){setTimeout(function(){if(!(typeof _particlesHasAnim==='function'&&_particlesHasAnim(el2._exportD)))el2.style.visibility='visible';fireExportAnim(el2,a2,0);},delay);})(grp.el,a,t);});(grp._autoSteps||[]).forEach(function(s){var t=autoDelay;autoDelay+=Math.max.apply(null,s.autoAnims.map(function(a){return a.duration||600;})||[600]);s.autoAnims.forEach(function(a){(function(el2,a2,delay){setTimeout(function(){if(!(typeof _particlesHasAnim==='function'&&_particlesHasAnim(el2._exportD)))el2.style.visibility='visible';fireExportAnim(el2,a2,0);},delay);})(s.el,a,t);});});ci++;return true;}c._fireNextStep=_doStep;c._hasSteps=function(){return ci<cg.length;};_expFlushCaptionAnims(c,s,transOffset);};
function _expViewport(){var ov=document.getElementById('viewport');return{w:(ov&&ov.clientWidth)||window.innerWidth,h:(ov&&ov.clientHeight)||window.innerHeight};}
function sc(){var v=_expViewport(),sx=v.w/W,sy=v.h/H;if(W/H<v.w/v.h)return Math.min(sx,sy);return Math.max(sx,sy);}
function resize(){var s=sc();var st=document.getElementById('stage');st.style.width=Math.ceil(W*s)+'px';st.style.height=Math.ceil(H*s)+'px';st.style.transform='';[sa(),sb()].forEach(function(e){e.style.width=W+'px';e.style.height=H+'px';e.style.transform='scale('+s+')';e.style.transformOrigin='top left';});}
window.addEventListener('resize',resize);document.addEventListener('fullscreenchange',resize);document.addEventListener('webkitfullscreenchange',resize);
function _expEnterFullscreen(){
  if(document.fullscreenElement||document.webkitFullscreenElement)return Promise.resolve();
  var el=document.getElementById('viewport')||document.documentElement;
  var req=el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen;
  if(!req)return Promise.reject();
  return Promise.resolve(req.call(el)).then(function(){resize();});
}
function sa(){return document.getElementById('sa');}
function sb(){return document.getElementById('sb');}
var idx=0,busy=false,aT=null,looping=false;
function next(){if(busy)return;clearTimeout(aT);if(idx>=SL.length-1){if(looping)goto(0,'next');}else goto(idx+1,'next');}
function prev(){if(busy||idx<=0)return;clearTimeout(aT);goto(idx-1,'prev');}
function _stopSlideAudio(){if(window._slAudio){window._slAudio.forEach(function(a){try{if(!a._persist){a.pause();a.currentTime=0;}}catch(e){}});window._slAudio=window._slAudio.filter(function(a){return a._persist;});}}
function _flipAnimDur(ms){ms=(+ms>0)?+ms:500;return Math.max(1,Math.round(ms*1.75));}
function _gotoFinish(_a,_b,to){_expResetStageZoom();_expMorphCleanupExits(_b);_b.querySelectorAll('.psel').forEach(function(el){el.style.willChange='';delete el.dataset.morphEnter;});_a.querySelectorAll('.psel').forEach(function(el){el.style.willChange='';});var s=sc();_a.id='sb';_b.id='sa';window._activeC='sa';_a.style.pointerEvents='none';_b.style.pointerEvents='';_b.style.cssText='position:absolute;inset:0;width:'+W+'px;height:'+H+'px;transform:scale('+s+');transform-origin:top left;';_a.style.cssText='position:absolute;inset:0;opacity:0;pointer-events:none;width:'+W+'px;height:'+H+'px;transform:scale('+s+');transform-origin:top left;';idx=to;ui();busy=false;sched();}
function _turnFlipAvailable(){return typeof jQuery!=='undefined'&&jQuery.fn&&jQuery.fn.turn;}
function _turnFlipDestroy(){var el=document.getElementById('e-turnbook');if(el&&_turnFlipAvailable()){try{jQuery(el).turn('stop');}catch(e){}}if(el)el.remove();}
function _buildTurnPageExp(i){var page=document.createElement('div');page.className='p-turn-page';build(page,i);return page;}
function doTurnJsFlipExp(a,b,fromIdx,toIdx,fwd,durMs,cb){
  var s=sc();_turnFlipDestroy();
  var book=document.createElement('div');book.id='e-turnbook';
  book.style.cssText='position:absolute;top:0;left:0;width:'+W+'px;height:'+H+'px;transform:scale('+s+');transform-origin:top left;z-index:6;';
  if(fwd){book.appendChild(_buildTurnPageExp(fromIdx));book.appendChild(_buildTurnPageExp(toIdx));}
  else{book.appendChild(_buildTurnPageExp(toIdx));book.appendChild(_buildTurnPageExp(fromIdx));}
  document.getElementById('stage').appendChild(book);
  var dur=Math.max(1,Math.round(+durMs||500));
  var $book=jQuery(book);
  $book.turn({width:W,height:H,display:'single',duration:dur,gradients:true,acceleration:true,elevation:120,autoCenter:false,page:fwd?1:2});
  var finish=function(){$book.off('turned.turnFlip');_turnFlipDestroy();a.style.visibility='';b.style.visibility='';cb();};
  $book.on('turned.turnFlip',function(e,page){if((fwd&&page>=2)||(!fwd&&page<=1))finish();});
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    try{$book.turn('update');}catch(e){}
    a.style.visibility='hidden';b.style.visibility='hidden';
    try{if(fwd)$book.turn('next');else $book.turn('previous');}catch(e){finish();}
  });});
}
function doBookFlipVExp(a,b,fwd,durMs,cb){
  var s=sc(),stage=document.getElementById('stage');
  _bookFlipPrepare(stage,a,b,s,fwd,true);
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    _bookFlipAnimate(a,b,s,fwd,true,durMs,stage,cb);
  });});
}
function _expActiveSlide(){ return window._activeC==='sb'?sb():sa(); }
function _expCaptureDecorTime(){
  var c=_expActiveSlide();
  var svg=c&&c.querySelector('.is-decor svg');
  if(svg){ try{ _expDecorTime=svg.getCurrentTime(); }catch(e){} }
}
function _expCleanupStage(st){if(!st)return;st._pvStageGen=(st._pvStageGen||0)+1;st._pvStageAborted=true;if(st._pvStageTimers){st._pvStageTimers.forEach(function(t){clearTimeout(t);});st._pvStageTimers=[];}st.querySelectorAll('._particles_layer,._particle,#motion-ghosts,#motion-svg,.motion-ghost').forEach(function(n){n.remove();});if(typeof _resetParticles==='function'){st.querySelectorAll('.psel').forEach(function(el){_resetParticles(el);});}}
function goto(to,dir){if(idx!==to)_expCaptureDecorTime();_stopSlideAudio();_expCleanupStage(sa());_expCleanupStage(sb());var _st=SL[to]&&SL[to].trans;var trans=(_st&&_st!=='none')?_st:(GT&&GT!=='none'?GT:'none');var dur=(SL[to]&&SL[to].transDur)||TD;var flipDur=_flipAnimDur(dur);if(trans==='none'||dur===0){_stopSlideAudio();build(sa(),to);sa().style.pointerEvents='';sb().style.pointerEvents='none';window._activeC='sa';idx=to;ui();sched();return;}busy=true;var _a=sa(),_b=sb();if(trans==='morph'){build(_b,to,dur);doMorphTransitionExp(_a,_b,idx,to,dur,function(){_gotoFinish(_a,_b,to);});return;}build(_b,to);if(trans==='flip'&&_turnFlipAvailable()){doTurnJsFlipExp(_a,_b,idx,to,dir==='next',flipDur,function(){_removeFlipWrap(_a);_gotoFinish(_a,_b,to);});}else if(trans==='flipV'){doBookFlipVExp(_a,_b,dir==='next',flipDur,function(){_gotoFinish(_a,_b,to);});}else{anim_(_a,_b,trans,dir==='next',(trans==='flip'||trans==='flipV')?flipDur:dur,function(){_gotoFinish(_a,_b,to);});}}
function _ensureFlipWrap(slide,hinge,vertical,fwd){
  var w=slide._flipWrap;
  if(!w){
    w=document.createElement('div');
    w.className='_ps-flip-wrap';
    w.style.cssText='position:absolute;inset:0;transform-style:preserve-3d;backface-visibility:hidden;overflow:hidden;';
    while(slide.firstChild) w.appendChild(slide.firstChild);
    slide.appendChild(w);
    slide._flipWrap=w;
    var shade=document.createElement('div');
    shade.className='_ps-flip-shade';
    shade.style.cssText='position:absolute;inset:0;pointer-events:none;opacity:0;z-index:2;';
    w.appendChild(shade);
  }
  w.getAnimations().forEach(function(a){ a.cancel(); });
  w.style.transition='none';
  w.style.transformOrigin=hinge;
  w.style.transform=vertical?'rotateX(0deg) translateZ(0px)':'rotateY(0deg) translateZ(0px)';
  w.style.boxShadow='';
  var shade=w.querySelector('._ps-flip-shade');
  if(shade){
    shade.getAnimations().forEach(function(a){ a.cancel(); });
    shade.style.opacity='0';
    shade.style.background=fwd
      ?(vertical?'linear-gradient(to bottom,rgba(0,0,0,.75) 0%,rgba(0,0,0,.25) 45%,transparent 70%)':'linear-gradient(to right,rgba(0,0,0,.75) 0%,rgba(0,0,0,.25) 45%,transparent 70%)')
      :(vertical?'linear-gradient(to top,rgba(0,0,0,.75) 0%,rgba(0,0,0,.25) 45%,transparent 70%)':'linear-gradient(to left,rgba(0,0,0,.75) 0%,rgba(0,0,0,.25) 45%,transparent 70%)');
  }
  return w;
}
function _removeFlipWrap(slide){
  var w=slide._flipWrap;
  if(!w) return;
  w.getAnimations().forEach(function(a){ a.cancel(); });
  w.querySelectorAll('._ps-flip-shade').forEach(function(s){ s.getAnimations().forEach(function(a){ a.cancel(); }); });
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
function _bookFlipPrepare(stage,a,b,s,fwd,vertical){
  var hinge=fwd?(vertical?'top center':'left center'):(vertical?'bottom center':'right center');
  stage.style.perspective='900px';
  stage.style.perspectiveOrigin='50% 45%';
  stage.style.transformStyle='preserve-3d';
  a.style.transformStyle='preserve-3d';
  b.style.transformStyle='preserve-3d';
  a.style.transform='scale('+s+') translateZ(0px)';
  a.style.transformOrigin='top left';
  b.style.transform='scale('+s+') translateZ(0px)';
  b.style.transformOrigin='top left';
  b.style.zIndex='1';
  a.style.zIndex='2';
  b.style.opacity='1';
  a.style.opacity='1';
  _ensureFlipWrap(a,hinge,vertical,fwd);
}
function _bookFlipAnimate(a,b,s,fwd,vertical,durMs,stage,cb){
  var wrap=a._flipWrap;
  if(!wrap){ cb(); return; }
  durMs=Math.max(1,Math.round(+durMs||500));
  var shade=wrap.querySelector('._ps-flip-shade');
  var end=fwd?180:-180;
  var mid=end/2;
  var lift=vertical?58:88;
  var easeBook='cubic-bezier(.42,.06,.28,1)';
  wrap.getAnimations().forEach(function(x){ x.cancel(); });
  if(shade) shade.getAnimations().forEach(function(x){ x.cancel(); });
  wrap.style.boxShadow=fwd
    ?(vertical?'0 20px 56px rgba(0,0,0,.5)':'20px 0 56px rgba(0,0,0,.5)')
    :(vertical?'0 -20px 56px rgba(0,0,0,.5)':'-20px 0 56px rgba(0,0,0,.5)');
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      var flipAnim=wrap.animate([
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
      flipAnim.finished.then(function(){ _bookFlipFinish(a,b,stage,cb); }).catch(function(){ _bookFlipFinish(a,b,stage,cb); });
    });
  });
}
function _expElKindKey(d){
  if(d.type==='shape')  return 'shape:'  +(d.shape   ||'?');
  if(d.type==='icon')   return 'icon:'   +(d.iconId  ||'?');
  if(d.type==='applet') return 'applet:' +(d.appletId||'?');
  return d.type;
}
function _expMorphElLabel(d,allEls){
  if(!d) return '';
  var kind=_expElKindKey(d);
  var same=allEls?allEls.filter(function(x){return _expElKindKey(x)===kind;}):[];
  var n=same.length>1?same.findIndex(function(x){return x.id===d.id;})+1:0;
  var sfx=n>0?' '+n:'';
  if(d.type==='text'){
    var t=(d.html||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    return t?(t.length>22?t.slice(0,22)+'\u2026':t):('\u0422\u0435\u043a\u0441\u0442'+sfx);
  }
  if(d.type==='image') return '\u0418\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0435'+sfx;
  if(d.type==='shape') return (d.shape||'\u0424\u0438\u0433\u0443\u0440\u0430')+sfx;
  return (d.type||'\u041e\u0431\u044a\u0435\u043a\u0442')+sfx;
}
function _expMorphMatchKey(d,allEls){
  if(!d) return '';
  if(d.type==='applet'&&d.appletId==='counter'&&d.cntGroupId&&String(d.cntGroupId).trim()) return '__counterGroup__:'+String(d.cntGroupId).trim();
  if(d.morphName&&String(d.morphName).trim()) return String(d.morphName).trim();
  return _expMorphElLabel(d,allEls||[]);
}
function _expMorphEligible(d){if(!d||d._isDecor)return false;return !(d.anims&&d.anims.length);}
function _expMorphPlainText(d){
  if(!d||d.type!=='text') return null;
  var tmp=document.createElement('div');
  tmp.innerHTML=d.html||'';
  return (tmp.textContent||'').trim().replace(/\\s+/g,' ');
}
function _expMorphTextBlocksMatch(fd,td){
  if(!fd||!td||fd.type!=='text'||td.type!=='text') return false;
  var hasLink=(fd.morphName&&String(fd.morphName).trim())||(td.morphName&&String(td.morphName).trim());
  if(hasLink) return false;
  var a=_expMorphPlainText(fd),b=_expMorphPlainText(td);
  return a!==null&&b!==null&&a!==b;
}
function _expMorphPairOnTo(fd,toSlide,fromEls){
  if(!fd||!toSlide||!toSlide.els) return null;
  var byId=toSlide.els.find(function(e){return e.id===fd.id&&!e._isDecor;});
  if(byId&&!_expMorphTextBlocksMatch(fd,byId)) return byId;
  var key=_expMorphMatchKey(fd,fromEls||[fd]);
  if(!key) return null;
  return toSlide.els.find(function(e){return !e._isDecor&&e.type===fd.type&&!_expMorphTextBlocksMatch(fd,e)&&_expMorphMatchKey(e,toSlide.els)===key;})||null;
}
function _expMorphFindFrom(fromEls,toEl,used,toEls){
  if(!toEl||toEl._isDecor||!_expMorphEligible(toEl)) return null;
  var pool=fromEls.filter(function(f){return !f._isDecor&&!used.has(f.id)&&_expMorphEligible(f);});
  var fd=pool.find(function(f){return f.id===toEl.id&&!_expMorphTextBlocksMatch(f,toEl);});
  if(fd){used.add(fd.id);return fd;}
  var key=_expMorphMatchKey(toEl,toEls||[toEl]);
  if(key){
    fd=pool.find(function(f){return f.type===toEl.type&&!_expMorphTextBlocksMatch(f,toEl)&&_expMorphMatchKey(f,fromEls)===key;});
    if(fd){used.add(fd.id);return fd;}
  }
  return null;
}
function _expMorphFlipPart(d){
  if(!d||(d.type!=='shape'&&!d.shapeFlipH&&!d.shapeFlipV)) return '';
  if(d.shapeFlipH||d.shapeFlipV) return ' scale('+(d.shapeFlipH?-1:1)+','+(d.shapeFlipV?-1:1)+')';
  return '';
}
function _expMorphCleanupExits(root){if(!root)return;root.querySelectorAll('.psel._morph-exit').forEach(function(el){el.remove();});}
function _expMorphColorState(d){
  if(!d) return null;
  if(d.type==='applet' && d.appletId==='counter'){
    return {
      kind:'counter',
      color:(d.genColor&&d.genColor[0]==='#')?d.genColor:null,
      bg:(d.genBg&&d.genBg[0]==='#')?d.genBg:null,
      border:(d.genBorderColor&&d.genBorderColor[0]==='#')?d.genBorderColor:null,
      fs:d.genFontSize!=null?+d.genFontSize:64
    };
  }
  if(d.type==='text'){
    var m=/color:\\s*(#[0-9a-fA-F]{3,8}|rgba?\\([^)]+\\))/i.exec(d.cs||'');
    return {
      kind:'text',
      color:(!d.textColorGrad&&m)?m[1]:null,
      bg:(!d.textBgGrad&&d.textBg&&d.textBg[0]==='#')?d.textBg:null
    };
  }
  if(d.type==='shape'){
    return null; // handled separately by _expMorphShapeJob (geometry + paint together)
  }
  return null;
}
function _expMorphArcState(d){
  if(!d||d.type!=='shape'||d.shape!=='ellipse') return null;
  var mode=d.arcMode||'full';
  if(mode==='full') return {mode:'full',start:0,end:360};
  var start=d.arcStart!=null?+d.arcStart:0;
  var end=d.arcEnd!=null?+d.arcEnd:270;
  return {mode:mode,start:start,end:end};
}
function _expMorphSweep(a){
  var raw=((a.end-a.start)%360+360)%360;
  return raw||360;
}
function _expMorphShapeJob(bel,fd,td){
  if(!fd||!td||fd.type!=='shape'||td.type!=='shape') return null;
  var svgHost=bel.querySelector('.shape-svg');
  if(!svgHost) return null;
  var fromSw=fd.sw===undefined?2:+fd.sw,toSw=td.sw===undefined?2:+td.sw;
  var needsSw=fromSw!==toSw;
  var fromFillHex=(fd.fill&&fd.fill[0]==='#'&&!(fd.fillGrad&&fd.fillGrad2))?fd.fill:null;
  var toFillHex=(td.fill&&td.fill[0]==='#'&&!(td.fillGrad&&td.fillGrad2))?td.fill:null;
  var needsFill=!!(fromFillHex&&toFillHex&&fromFillHex!==toFillHex);
  var fromStrokeHex=(fd.stroke&&fd.stroke[0]==='#')?fd.stroke:null;
  var toStrokeHex=(td.stroke&&td.stroke[0]==='#')?td.stroke:null;
  var needsStroke=!!(fromStrokeHex&&toStrokeHex&&fromStrokeHex!==toStrokeHex);
  var fromArc=_expMorphArcState(fd),toArc=_expMorphArcState(td);
  var needsArc=!!(fromArc&&toArc&&(fromArc.mode!==toArc.mode||fromArc.start!==toArc.start||fromArc.end!==toArc.end));
  if(!needsSw&&!needsFill&&!needsStroke&&!needsArc) return null;
  return {kind:'shapeGeom',svgHost:svgHost,td:td,fromSw:fromSw,toSw:toSw,needsSw:needsSw,
    fromFillHex:fromFillHex,toFillHex:toFillHex,needsFill:needsFill,
    fromStrokeHex:fromStrokeHex,toStrokeHex:toStrokeHex,needsStroke:needsStroke,
    fromArc:fromArc,toArc:toArc,needsArc:needsArc};
}
function _expMorphColorJob(bel,fd,td){
  if(fd&&td&&fd.type==='shape'&&td.type==='shape') return _expMorphShapeJob(bel,fd,td);
  var fromSt=_expMorphColorState(fd),toSt=_expMorphColorState(td);
  if(!fromSt||!toSt||fromSt.kind!==toSt.kind) return null;
  if(fromSt.kind==='counter'){
    var iframe=bel.querySelector('iframe');
    var bord=bel.querySelector('.applet-border-overlay');
    var needsColor=!!(fromSt.color&&toSt.color&&fromSt.color!==toSt.color);
    var needsBg=!!(fromSt.bg&&toSt.bg&&fromSt.bg!==toSt.bg);
    var needsFs=fromSt.fs!==toSt.fs;
    var needsBorder=!!(bord&&fromSt.border&&toSt.border&&fromSt.border!==toSt.border);
    if(!iframe||(!needsColor&&!needsBg&&!needsFs&&!needsBorder)) return null;
    return {kind:'counter',iframe:iframe,bord:bord,from:fromSt,to:toSt,needsColor:needsColor,needsBg:needsBg,needsFs:needsFs,needsBorder:needsBorder};
  }
  if(fromSt.kind==='text'){
    var c=bel.querySelector('.ec.tel')||bel.querySelector('.ec');
    var layer=bel.querySelector('.el-bg-layer');
    var needsColor2=!!(c&&fromSt.color&&toSt.color&&fromSt.color!==toSt.color);
    var needsBg2=!!(layer&&fromSt.bg&&toSt.bg&&fromSt.bg!==toSt.bg);
    if(!needsColor2&&!needsBg2) return null;
    return {kind:'text',c:c,layer:layer,from:fromSt,to:toSt,needsColor:needsColor2,needsBg:needsBg2};
  }
  return null;
}
function _expMorphApplyColorJobs(jobs,e){
  jobs.forEach(function(j){
    if(j.kind==='counter'){
      var msg={type:'counterMorphStyle'};
      var hasMsg=false;
      if(j.needsColor){ msg.color=_expLerpHexColor(j.from.color,j.to.color,e); hasMsg=true; }
      if(j.needsBg){ msg.bg=_expLerpHexColor(j.from.bg,j.to.bg,e); hasMsg=true; }
      if(j.needsFs){ msg.fs=Math.round(j.from.fs+(j.to.fs-j.from.fs)*e); hasMsg=true; }
      if(hasMsg){ try{ j.iframe.contentWindow.postMessage(msg,'*'); }catch(err){} }
      if(j.needsBorder){ j.bord.style.borderColor=_expLerpHexColor(j.from.border,j.to.border,e); }
    } else if(j.kind==='text'){
      if(j.needsColor) j.c.style.color=_expLerpHexColor(j.from.color,j.to.color,e);
      if(j.needsBg) j.layer.style.backgroundColor=_expLerpHexColor(j.from.bg,j.to.bg,e);
    } else if(j.kind==='shape'){
      if(j.needsFill) j.shapeEl.style.fill=_expLerpHexColor(j.from.fill,j.to.fill,e);
      if(j.needsStroke) j.shapeEl.style.stroke=_expLerpHexColor(j.from.stroke,j.to.stroke,e);
    } else if(j.kind==='shapeGeom'){
      var dd={};
      for(var _k in j.td){ if(Object.prototype.hasOwnProperty.call(j.td,_k)) dd[_k]=j.td[_k]; }
      if(j.needsSw) dd.sw=j.fromSw+(j.toSw-j.fromSw)*e;
      if(j.needsFill) dd.fill=_expLerpHexColor(j.fromFillHex,j.toFillHex,e);
      if(j.needsStroke) dd.stroke=_expLerpHexColor(j.fromStrokeHex,j.toStrokeHex,e);
      if(j.needsArc){
        var fa=j.fromArc,ta=j.toArc;
        if(fa.mode==='full'&&ta.mode!=='full'){
          dd.arcMode=ta.mode;dd.arcStart=ta.start;
          var sweepTo=_expMorphSweep(ta);
          dd.arcEnd=ta.start+(360+(sweepTo-360)*e);
        } else if(fa.mode!=='full'&&ta.mode==='full'){
          dd.arcMode=fa.mode;dd.arcStart=fa.start;
          var sweepFrom=_expMorphSweep(fa);
          dd.arcEnd=fa.start+(sweepFrom+(360-sweepFrom)*e);
        } else if(fa.mode!=='full'&&ta.mode!=='full'){
          dd.arcMode=ta.mode;
          dd.arcStart=fa.start+(ta.start-fa.start)*e;
          dd.arcEnd=fa.end+(ta.end-fa.end)*e;
        }
      }
      try{
        j.svgHost.innerHTML=buildShapeSVG(dd, j.td.w, j.td.h);
      }catch(err){}
    } else if(j.kind==='connMove'){
      var fe=j.fromEl, te=j.toEl;
      var curX=fe.x+(te.x-fe.x)*e, curY=fe.y+(te.y-fe.y)*e;
      var curW=fe.w+(te.w-fe.w)*e, curH=fe.h+(te.h-fe.h)*e;
      var curRot=(fe.rot||0)+((te.rot||0)-(fe.rot||0))*e;
      try{
        window._expUpdateConnForMotion(j.elId, curX-te.x, curY-te.y, curW, curH, curRot);
      }catch(err){}
    }
  });
}
function _expMorphRunColorAnims(jobs,durMs){
  if(!jobs||!jobs.length) return;
  var dur=Math.max(1,+durMs||500);
  var start=performance.now();
  var pending=jobs.filter(function(j){return j.kind==='counter'&&j.iframe&&j.iframe.dataset.morphReady!=='1';});
  function begin(){
    _expMorphApplyColorJobs(jobs,0);
    function frame(now){
      var t=Math.min(1,(now-start)/dur);
      var e=_expMorphEase(t);
      _expMorphApplyColorJobs(jobs,e);
      if(t<1) requestAnimationFrame(frame);
      else _expMorphApplyColorJobs(jobs,1);
    }
    requestAnimationFrame(frame);
  }
  if(!pending.length){ begin(); return; }
  var left=pending.length;
  pending.forEach(function(j){
    j.iframe.addEventListener('load', function(){ left--; if(left<=0) begin(); }, {once:true});
  });
}
function _expMorphExitClone(ael,fd,b){
  ael.style.visibility='hidden';ael.style.opacity='0';ael.style.pointerEvents='none';
  var clone=ael.cloneNode(true);clone.classList.add('_morph-exit');
  clone.style.zIndex='100';clone.style.pointerEvents='none';clone.style.transition='none';
  clone.style.transformOrigin='center';clone.style.willChange='transform,opacity';clone.style.visibility='visible';
  var baseRot='rotate('+(fd.rot||0)+'deg)'+_expMorphFlipPart(fd);
  clone.style.transform=baseRot;clone.style.opacity=String(fd.elOpacity!=null?fd.elOpacity:1);
  b.appendChild(clone);return clone;
}
function _expParseHexColor(c){
  if(!c) return {r:0,g:0,b:0};
  c=String(c).trim();
  if(c.charAt(0)==='#'){
    var h=c.slice(1);
    if(h.length===3) h=h.split('').map(function(ch){return ch+ch;}).join('');
    if(h.length>=6) return {r:parseInt(h.slice(0,2),16)||0,g:parseInt(h.slice(2,4),16)||0,b:parseInt(h.slice(4,6),16)||0};
  }
  var m=c.match(/rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)/);
  if(m) return {r:+m[1],g:+m[2],b:+m[3]};
  return {r:0,g:0,b:0};
}
function _expLerpHexColor(c1,c2,t){
  var a=_expParseHexColor(c1),b=_expParseHexColor(c2);
  var r=Math.round(a.r+(b.r-a.r)*t),g=Math.round(a.g+(b.g-a.g)*t),bl=Math.round(a.b+(b.b-a.b)*t);
  return '#'+[r,g,bl].map(function(x){var s=x.toString(16);return s.length<2?'0'+s:s;}).join('');
}
function _expShadowStateFromData(d){
  if(!d) return {ss:0,sb:0,sc:'#000000',active:false};
  if(d.type==='text'&&_textShadowActive(d)){var p=_textShadowParams(d);return {ss:p.ss,sb:p.sb,sc:p.sc,active:true};}
  if(d.type==='image'&&d.imgShadow) return {ss:d.imgShadowSize!=null?+d.imgShadowSize:4,sb:d.imgShadowBlur!=null?+d.imgShadowBlur:15,sc:d.imgShadowColor||'#000000',active:true};
  if(d.type==='shape'&&d.shadow) return {ss:d.shadowSize!=null?+d.shadowSize:3,sb:d.shadowBlur!=null?+d.shadowBlur:4,sc:d.shadowColor||'#000000',active:true};
  return {ss:0,sb:0,sc:'#000000',active:false};
}
function _expShadowMorphNeeds(from,to){
  if(!from.active&&!to.active) return false;
  if(!!from.active!==!!to.active) return true;
  return from.ss!==to.ss||from.sb!==to.sb||String(from.sc)!==String(to.sc);
}
var _expMorphBezierSolved=(function(x1,y1,x2,y2){
  function A(a1,a2){return 1.0-3.0*a2+3.0*a1;}
  function B(a1,a2){return 3.0*a2-6.0*a1;}
  function C(a1){return 3.0*a1;}
  function calcX(t){return ((A(x1,x2)*t+B(x1,x2))*t+C(x1))*t;}
  function calcY(t){return ((A(y1,y2)*t+B(y1,y2))*t+C(y1))*t;}
  function calcSlopeX(t){return 3.0*A(x1,x2)*t*t+2.0*B(x1,x2)*t+C(x1);}
  function getTForX(x){
    var t=x;
    for(var i=0;i<8;i++){
      var dx=calcX(t)-x;
      if(Math.abs(dx)<1e-6) return t;
      var slope=calcSlopeX(t);
      if(Math.abs(slope)<1e-6) break;
      t-=dx/slope;
    }
    var lo=0,hi=1;
    t=x;
    for(var j=0;j<20;j++){
      var xEst=calcX(t);
      if(Math.abs(xEst-x)<1e-6) break;
      if(xEst<x) lo=t; else hi=t;
      t=(lo+hi)/2;
    }
    return t;
  }
  return function(x){
    if(x<=0) return 0;
    if(x>=1) return 1;
    return calcY(getTForX(x));
  };
})(0.4,0,0.2,1);
function _expMorphEase(t){return _expMorphBezierSolved(t);}
function _expShapeShadowTarget(svg,fid){
  if(!svg) return null;
  var node=svg.querySelector('[filter="url(#'+fid+')"]');
  if(node) return node;
  return svg.querySelector('path,rect,circle,ellipse,polygon,polyline,line,g');
}
function _expApplyShadowValues(bel,d,ss,sb,sc){
  if(!bel||!d) return;
  ss=Math.max(0,+ss||0);sb=Math.max(0,+sb||0);sc=sc||'#000000';
  var active=ss>0||sb>0,id=bel.dataset.id||d.id||'x',type=d.type;
  if(type==='text'){
    var tel=bel.querySelector('.psel-txt>div')||bel.querySelector('.tel')||bel.querySelector('.ec');
    if(!tel) return;
    var fid='txtsh_'+id,defs=_expEnsureTextShadowHost();
    if(!active){tel.style.filter='';var old=defs.querySelector('#'+fid);if(old)old.remove();return;}
    var flt=defs.querySelector('#'+fid);
    if(!flt){flt=document.createElementNS('http://www.w3.org/2000/svg','filter');flt.setAttribute('id',fid);flt.setAttribute('x','-50%');flt.setAttribute('y','-50%');flt.setAttribute('width','200%');flt.setAttribute('height','200%');defs.appendChild(flt);}
    flt.innerHTML=_shadowFilterInner(ss,sb,sc);tel.style.filter='url(#'+fid+')';bel.style.overflow='visible';
    return;
  }
  if(type==='image'){
    var fid2='imgsh_'+id,defs2=_expEnsureTextShadowHost();
    if(!active){bel.style.filter='';var old2=defs2.querySelector('#'+fid2);if(old2)old2.remove();return;}
    var flt2=defs2.querySelector('#'+fid2);
    if(!flt2){flt2=document.createElementNS('http://www.w3.org/2000/svg','filter');flt2.setAttribute('id',fid2);flt2.setAttribute('x','-50%');flt2.setAttribute('y','-50%');flt2.setAttribute('width','200%');flt2.setAttribute('height','200%');defs2.appendChild(flt2);}
    flt2.innerHTML=_shadowFilterInner(ss,sb,sc);bel.style.filter='url(#'+fid2+')';return;
  }
  if(type==='shape'){
    var svgDiv=bel.querySelector('.shape-svg'),svg=svgDiv&&svgDiv.querySelector('svg');
    if(!svg) return;
    var fid3='sh_'+id,sw=d.sw!=null?+d.sw:2,w=Math.max(1,+d.w||100),h=Math.max(1,+d.h||100);
    if(!active){
      var tgt=_expShapeShadowTarget(svg,fid3);if(tgt)tgt.removeAttribute('filter');
      var fe=svg.querySelector('filter[id="'+fid3+'"]');if(fe)fe.remove();
      _syncShapeShadowLayout(bel,Object.assign({},d,{shadow:false}),w,h);return;
    }
    var pad=_shadowPad(ss,sb,sw),fe2=svg.querySelector('filter[id="'+fid3+'"]');
    if(!fe2){
      var defsEl=svg.querySelector('defs');if(!defsEl){defsEl=document.createElementNS('http://www.w3.org/2000/svg','defs');svg.insertBefore(defsEl,svg.firstChild);}
      fe2=document.createElementNS('http://www.w3.org/2000/svg','filter');fe2.setAttribute('id',fid3);fe2.setAttribute('filterUnits','userSpaceOnUse');fe2.setAttribute('primitiveUnits','userSpaceOnUse');defsEl.appendChild(fe2);
      var tgt2=_expShapeShadowTarget(svg,fid3);if(tgt2)tgt2.setAttribute('filter','url(#'+fid3+')');
    }
    fe2.setAttribute('x',String(-pad));fe2.setAttribute('y',String(-pad));fe2.setAttribute('width',String(w+pad*2));fe2.setAttribute('height',String(h+pad*2));
    fe2.innerHTML=_shadowFilterInner(ss,sb,sc);
    _syncShapeShadowLayout(bel,Object.assign({},d,{shadow:true,shadowSize:ss,shadowBlur:sb,shadowColor:sc}),w,h);
  }
}
function _expMorphRunShadowAnims(jobs,durMs){
  if(!jobs||!jobs.length) return;
  var dur=Math.max(1,+durMs||500),start=performance.now();
  jobs.forEach(function(j){_expApplyShadowValues(j.bel,j.d,j.from.ss,j.from.sb,j.from.sc);});
  function frame(now){
    var t=Math.min(1,(now-start)/dur),e=_expMorphEase(t);
    jobs.forEach(function(j){
      var ss=j.from.ss+(j.to.ss-j.from.ss)*e,sb=j.from.sb+(j.to.sb-j.from.sb)*e,sc=_expLerpHexColor(j.from.sc,j.to.sc,e);
      _expApplyShadowValues(j.bel,j.d,ss,sb,sc);
    });
    if(t<1) requestAnimationFrame(frame);
    else jobs.forEach(function(j){_expApplyShadowValues(j.bel,j.d,j.to.ss,j.to.sb,j.to.sc);});
  }
  requestAnimationFrame(frame);
}
function _expMorphAnimateJobs(jobs,dur){
  var easing='cubic-bezier(0.4, 0, 0.2, 1)';
  jobs.forEach(function(job){
    var bel=job.bel;if(!bel)return;
    bel.style.visibility='visible';bel.style.transition='none';
    var fromTf,toTf,fromOp,toOp;
    if(job.kind==='move'){fromTf=job.startTf;toTf=job.endTf;fromOp=job.endOp;toOp=job.endOp;}
    else if(job.kind==='enter'){fromTf=job.endTf+' scale(0.96) translateY(14px)';toTf=job.endTf;fromOp=0;toOp=job.endOp;bel.dataset.morphEnter='1';}
    else{fromTf=job.endTf;toTf=job.endTf+' scale(0.94) translateY(10px)';fromOp=job.startOp!=null?job.startOp:1;toOp=0;}
    bel.style.transform=fromTf;bel.style.opacity=String(fromOp);void bel.offsetHeight;
    try{
      var anim=bel.animate([{transform:fromTf,opacity:fromOp},{transform:toTf,opacity:toOp}],{duration:dur,easing:easing,fill:'forwards'});
      anim.onfinish=function(){try{anim.commitStyles();}catch(e){}anim.cancel();};
    }catch(e){
      bel.style.transition='transform '+dur+'ms '+easing+', opacity '+dur+'ms '+easing;
      bel.style.transform=toTf;bel.style.opacity=String(toOp);
    }
  });
}
function _expMorphHideOnFrom(ael){
  ael.style.transition='none';ael.style.opacity='0';ael.style.visibility='hidden';ael.style.pointerEvents='none';
}
function _expWireAppletStepClick(el,msgType){
  el.style.cursor='pointer';
  var downX,downY,moved;
  var onMove=function(ev){if(downX==null)return;if(Math.hypot(ev.clientX-downX,ev.clientY-downY)>4)moved=true;};
  var onUp=function(){
    document.removeEventListener('mousemove',onMove);
    if(downX==null)return;
    var click=!moved;downX=downY=null;
    if(!click)return;
    var iframe=el.querySelector('iframe');
    if(iframe){try{iframe.contentWindow.postMessage({type:msgType},'*');}catch(e){}}
  };
  el.addEventListener('mousedown',function(ev){
    ev.stopPropagation();downX=ev.clientX;downY=ev.clientY;moved=false;
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp,{once:true});
  });
}
function doMorphTransitionExp(a,b,fromIdx,to,durMs,cb){
  var dur=durMs!=null?durMs:((SL[to]&&SL[to].transDur)||TD||500);
  var fromSlide=SL[fromIdx]||{els:[]},toSlide=SL[to]||{els:[]};
  var usedFrom=new Set(),animB=[],shadowJobs=[],colorJobs=[];
  b.style.opacity='1';b.style.pointerEvents='auto';b.style.zIndex='2';
  a.style.zIndex='1';a.style.opacity='1';
  b.querySelectorAll('.psel').forEach(function(bel){
    var td=toSlide.els.find(function(e){return e.id===bel.dataset.id;});
    if(!td||td._isDecor||!_expMorphEligible(td)) return;
    var fd=_expMorphFindFrom(fromSlide.els,td,usedFrom,toSlide.els);
    var flipEnd=_expMorphFlipPart(td);
    var endTf='rotate('+(td.rot||0)+'deg)'+flipEnd;
    var endOp=td.elOpacity!=null?td.elOpacity:1;
    bel.style.transformOrigin='center';bel.style.willChange='transform,opacity';
    if(fd){
      var fCx=fd.x+fd.w/2,fCy=fd.y+fd.h/2,tCx=td.x+td.w/2,tCy=td.y+td.h/2;
      var dx=fCx-tCx,dy=fCy-tCy,sw=td.w?fd.w/td.w:1,sh=td.h?fd.h/td.h:1;
      var startTf='translate('+dx+'px,'+dy+'px) rotate('+(fd.rot||0)+'deg) scale('+sw+','+sh+')'+_expMorphFlipPart(fd);
      bel.style.transition='none';bel.style.transform=startTf;bel.style.opacity=String(endOp);
      animB.push({bel:bel,endTf:endTf,endOp:endOp,kind:'move',startTf:startTf});
      if(typeof window._expUpdateConnForMotion==='function' && toSlide.connectors && toSlide.connectors.length){
        var hasConn=toSlide.connectors.some(function(c){return c.fromId===td.id||c.toId===td.id;});
        if(hasConn && (fd.x!==td.x||fd.y!==td.y||fd.w!==td.w||fd.h!==td.h||(fd.rot||0)!==(td.rot||0))){
          var cmj={kind:'connMove', elId:td.id, fromEl:fd, toEl:td};
          colorJobs.push(cmj);
          try{ _expMorphApplyColorJobs([cmj], 0); }catch(err){}
        }
      }
      var cj=_expMorphColorJob(bel,fd,td);
      if(cj){ colorJobs.push(cj); try{ _expMorphApplyColorJobs([cj], 0); }catch(err){} }
      var fromSh=_expShadowStateFromData(fd),toSh=_expShadowStateFromData(td);
      if(_expShadowMorphNeeds(fromSh,toSh)){_expApplyShadowValues(bel,td,fromSh.ss,fromSh.sb,fromSh.sc);shadowJobs.push({bel:bel,d:td,from:fromSh,to:toSh});}
    }else{
      bel.style.transition='none';bel.style.visibility='visible';
      bel.style.transform=endTf+' scale(0.96) translateY(14px)';bel.style.opacity='0';
      animB.push({bel:bel,endTf:endTf,endOp:endOp,kind:'enter'});
      var toSh2=_expShadowStateFromData(td);
      if(toSh2.active||toSh2.ss>0||toSh2.sb>0){_expApplyShadowValues(bel,td,0,0,toSh2.sc);shadowJobs.push({bel:bel,d:td,from:{ss:0,sb:0,sc:toSh2.sc,active:false},to:toSh2});}
    }
  });
  a.querySelectorAll('.psel').forEach(function(ael){
    var id=ael.dataset.id;if(!id)return;
    var fd=fromSlide.els.find(function(e){return e.id===id;});
    if(!fd||fd._isDecor)return;
    var td=_expMorphPairOnTo(fd,toSlide,fromSlide.els);
    if(td&&(!_expMorphEligible(fd)||!_expMorphEligible(td))){_expMorphHideOnFrom(ael);return;}
    if(usedFrom.has(id)){
      ael.style.transition='none';ael.style.opacity='0';ael.style.visibility='hidden';ael.style.pointerEvents='none';
    }else if(!_expMorphEligible(fd)){
      _expMorphHideOnFrom(ael);
    }else{
      ael.style.visibility='hidden';ael.style.opacity='0';ael.style.pointerEvents='none';
      var baseRot='rotate('+(fd.rot||0)+'deg)'+_expMorphFlipPart(fd);
      var exitEl=_expMorphExitClone(ael,fd,b);
      animB.push({bel:exitEl,endTf:baseRot,kind:'exit',startOp:fd.elOpacity!=null?fd.elOpacity:1});
      var fromSh3=_expShadowStateFromData(fd);
      if(fromSh3.active||fromSh3.ss>0||fromSh3.sb>0) shadowJobs.push({bel:exitEl,d:fd,from:fromSh3,to:{ss:0,sb:0,sc:fromSh3.sc,active:false}});
    }
  });
  void b.offsetHeight;
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      _expMorphAnimateJobs(animB,dur);
      if(shadowJobs.length) _expMorphRunShadowAnims(shadowJobs,dur);
      if(colorJobs.length) _expMorphRunColorAnims(colorJobs,dur);
      a.style.transition='opacity '+Math.round(dur*0.65)+'ms ease';
      a.style.opacity='0';
      setTimeout(cb,dur+80);
    });
  });
}
function _expResetStageZoom(){
  var st=document.getElementById('stage');
  if(!st) return;
  st.style.transition='none';
  st.style.transform='';
  st.style.transformOrigin='';
}
function _animZoomStageExp(a,b,trans,dur,cb){
  var d=dur+'ms', s=sc(), stage=document.getElementById('stage');
  a.style.transition='none'; b.style.transition='none';
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
  a.style.transformOrigin='top left'; a.style.transform='scale('+s+')';
  b.style.transformOrigin='top left'; b.style.transform='scale('+s+')';
  b.style.opacity='0'; a.style.opacity='1';
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      if(trans==='zoom'&&stage){
        stage.style.transition='transform '+d+' ease';
        a.style.transition='opacity '+d+' ease';
        b.style.transition='opacity '+d+' ease';
        stage.style.transform='scale(1)';
        a.style.opacity='0'; b.style.opacity='1';
      }else{
        a.style.transition='opacity '+d+' ease';
        b.style.transition='opacity '+d+' ease';
        a.style.opacity='0'; b.style.opacity='1';
      }
      setTimeout(function(){ _expResetStageZoom(); cb(); }, dur+16);
    });
  });
}
function anim_(a,b,trans,fwd,dur,cb){
  if(trans==='zoom'||trans==='zoomOut'){ _animZoomStageExp(a,b,trans,dur,cb); return; }
  var d=dur+'ms', s=sc(), dir=fwd?1:-1;
  a.style.transition='none'; b.style.transition='none';
  b.style.pointerEvents='auto';
  requestAnimationFrame(function(){
    // Phase 2: set initial state
    if(trans==='fade'){
      b.style.opacity='0';
    } else if(trans==='slide'){
      b.style.transform='scale('+s+') translateX('+(dir*100)+'%)'; b.style.opacity='1';
    } else if(trans==='slideUp'){
      b.style.transform='scale('+s+') translateY('+(dir*100)+'%)'; b.style.opacity='1';
    } else if(trans==='flip'){
      _bookFlipPrepare(document.getElementById('stage'),a,b,s,fwd,false);
    } else if(trans==='flipV'){
      _bookFlipPrepare(document.getElementById('stage'),a,b,s,fwd,true);
    } else if(trans==='cube'){
      document.getElementById('stage').style.perspective='2000px';
      b.style.transform='scale('+s+') rotateY('+(dir*-90)+'deg)'; b.style.opacity='1';
    } else if(trans==='dissolve'){
      b.style.opacity='0';
    } else if(trans==='push'){
      b.style.transform='scale('+s+') translateX('+(dir*100)+'%)'; b.style.opacity='1';
    } else if(trans==='wipe'){
      b.style.clipPath=fwd?'inset(0 100% 0 0)':'inset(0 0 0 100%)'; b.style.opacity='1';
    } else if(trans==='split'){
      b.style.clipPath='inset(50% 0)'; b.style.opacity='1';
    } else if(trans==='reveal'){
      b.style.opacity='1'; b.style.zIndex='0'; a.style.zIndex='2';
    }
    requestAnimationFrame(function(){
      // Phase 3: animate to final state
      if(trans==='fade'){
        a.style.transition='opacity '+d+' ease'; b.style.transition='opacity '+d+' ease';
        a.style.opacity='0'; b.style.opacity='1'; setTimeout(cb,dur+16);
      } else if(trans==='slide'){
        a.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)'; b.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';
        a.style.transform='scale('+s+') translateX('+(-dir*100)+'%)'; b.style.transform='scale('+s+') translateX(0)';
        setTimeout(cb,dur+16);
      } else if(trans==='slideUp'){
        a.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)'; b.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';
        a.style.transform='scale('+s+') translateY('+(-dir*100)+'%)'; b.style.transform='scale('+s+') translateY(0)';
        setTimeout(cb,dur+16);
      } else if(trans==='flip'){
        _bookFlipAnimate(a,b,s,fwd,false,dur,document.getElementById('stage'),cb);
      } else if(trans==='flipV'){
        _bookFlipAnimate(a,b,s,fwd,true,dur,document.getElementById('stage'),cb);
      } else if(trans==='cube'){
        a.style.transition='transform '+d+' ease'; b.style.transition='transform '+d+' ease';
        a.style.transform='scale('+s+') rotateY('+(dir*90)+'deg)'; b.style.transform='scale('+s+') rotateY(0)';
        setTimeout(function(){document.getElementById('stage').style.perspective='';cb();},dur+16);
      } else if(trans==='dissolve'){
        a.style.transition='opacity '+d+' steps(12,end)'; b.style.transition='opacity '+d+' steps(12,start)';
        a.style.opacity='0'; b.style.opacity='1'; setTimeout(cb,dur+16);
      } else if(trans==='push'){
        a.style.transition='transform '+d+' cubic-bezier(.25,.46,.45,.94)';
        b.style.transition='transform '+d+' cubic-bezier(.25,.46,.45,.94)';
        a.style.transform='scale('+s+') translateX('+(-dir*40)+'%)'; b.style.transform='scale('+s+') translateX(0)';
        setTimeout(cb,dur+16);
      } else if(trans==='wipe'){
        b.style.transition='clip-path '+d+' cubic-bezier(.4,0,.2,1)';
        b.style.clipPath='inset(0 0% 0 0%)';
        a.style.transition='opacity '+(dur*0.3)+'ms '+(dur*0.7)+'ms ease'; a.style.opacity='0';
        setTimeout(cb,dur+16);
      } else if(trans==='split'){
        b.style.transition='clip-path '+d+' cubic-bezier(.4,0,.2,1)';
        b.style.clipPath='inset(0% 0)';
        a.style.transition='opacity '+(dur*0.4)+'ms '+(dur*0.6)+'ms ease'; a.style.opacity='0';
        setTimeout(cb,dur+16);
      } else if(trans==='reveal'){
        a.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';
        a.style.transform='scale('+s+') translateX('+(dir*100)+'%)';
        setTimeout(cb,dur+16);
      } else if(trans==='glitch'){
        b.style.opacity='1';
        var steps=6, stepDur=dur/steps, step=0;
        var glitchFilter=['hue-rotate(90deg) saturate(3)','hue-rotate(180deg) contrast(2)',
          'hue-rotate(270deg) brightness(2)','saturate(0) brightness(1.5)',
          'hue-rotate(45deg) contrast(1.5)','none'];
        var run=function(){
          if(step>=steps){b.style.filter='none';a.style.opacity='0';cb();return;}
          var t2=step/steps, dx=(Math.random()-.5)*30*(1-t2);
          b.style.transform='scale('+s+') translateX('+dx+'px)';
          b.style.filter=glitchFilter[step]||'none';
          a.style.opacity=String(1-t2);
          step++; setTimeout(run,stepDur);
        };
        run();
      } else {
        b.style.opacity='1'; cb();
      }
    });
  });
}

function sched(){clearTimeout(aT);var s=SL[idx];var delay=(s&&s.auto>0)?s.auto*1000:0;var isLast=idx>=SL.length-1;if(delay>0&&(!isLast||looping)){aT=setTimeout(function(){if(isLast&&looping)goto(0,'next');else goto(idx+1,'next');},delay);document.getElementById('aind').classList.add('on');}else document.getElementById('aind').classList.remove('on');}
window.addEventListener('message',function(ev){
  if(!ev.data) return;
  if(ev.data.type==='timerNav'){
    if(ev.data.mode==='next'){next();}
    else if(ev.data.mode==='slide'){var to=ev.data.slide;if(typeof to==='number'&&to>=0&&to<SL.length)goto(to,'next');}
    return;
  }
  if(ev.data.type==='counterSync'&&ev.data.gid){
    window._counterGroupVal=window._counterGroupVal||{};
    window._counterGroupVal[ev.data.gid]=ev.data.val;
    var _syncRoots=[document.getElementById('sa'),document.getElementById('sb')];
    for(var _sri=0;_sri<_syncRoots.length;_sri++){
      var _sroot=_syncRoots[_sri]; if(!_sroot) continue;
      var _wraps=_sroot.querySelectorAll('[data-applet-id="counter"]');
      for(var _wi=0;_wi<_wraps.length;_wi++){
        var _wrap=_wraps[_wi];
        if((_wrap.dataset.cntGroupId||'')!==ev.data.gid) continue;
        var _ifr=_wrap.querySelector('iframe');
        if(!_ifr) continue;
        try{ if(_ifr.contentWindow===ev.source) continue; }catch(_e){}
        try{ _ifr.contentWindow.postMessage({type:'counterSync',val:ev.data.val},'*'); }catch(_e){}
      }
    }
    return;
  }
  if(ev.data.type==='appletAnim'&&ev.data.ref){
    if(ev.data.appletVal!=null&&ev.source){
      var _expRoots=[document.getElementById('sa'),document.getElementById('sb')];
      for(var _ri=0;_ri<_expRoots.length;_ri++){
        var _eroot=_expRoots[_ri]; if(!_eroot) continue;
        var _efrs=_eroot.querySelectorAll('iframe');
        for(var _fi=0;_fi<_efrs.length;_fi++){
          try{
            if(_efrs[_fi].contentWindow!==ev.source) continue;
            var _appEl=_efrs[_fi].closest('.psel');
            if(_appEl) _appEl._splitAppletLiveVal=ev.data.appletVal;
            break;
          }catch(_e){}
        }
      }
    }
    _expFireAppletAnim(ev.data.ref,idx,ev.data.appletVal);
  }
});
function _expFireAppletAnim(ref,slideIdx,appletVal){
  var parts=String(ref||'').split(':');
  if(parts.length<2) return;
  var elId=parts[0], ai=+parts[1];
  var s=SL[slideIdx]; if(!s) return;
  var d=null;
  for(var i=0;i<s.els.length;i++){ if(s.els[i].id===elId){ d=s.els[i]; break; } }
  if(!d||!d.anims||!d.anims[ai]) return;
  var c=document.getElementById(window._activeC||'sa');
  if(!c) return;
  var targetEl=c.querySelector('.psel[data-id="'+elId+'"]');
  if(!targetEl) return;
  if(appletVal!=null) targetEl._splitAppletLiveVal=appletVal;
  var stepAnims=[d.anims[ai]], j=ai+1;
  while(j<d.anims.length&&d.anims[j].trigger==='withPrev'){ stepAnims.push(d.anims[j]); j++; }
  var delay=0;
  stepAnims.forEach(function(a){
    var d2=a.delay||0;
    (function(anim,dl){
      setTimeout(function(){
        var ecEl2=targetEl.querySelector('.ec')||null;
        if(anim.cat==='entrance'&&!(typeof _particlesHasAnim==='function'&&_particlesHasAnim(d))){ targetEl.style.visibility='visible'; targetEl.style.pointerEvents=''; }
        fireExportAnim(targetEl,anim,0,0,0,ecEl2);
      },delay+d2);
    })(a,delay+d2);
    delay+=d2+(a.duration||600);
  });
}
function ui(){document.getElementById('ctr').textContent=(idx+1)+' / '+SL.length;document.getElementById('bp').disabled=idx===0;document.getElementById('bn').disabled=idx===SL.length-1&&!looping;var dn=document.getElementById('dots');dn.innerHTML='';var max=Math.min(SL.length,25);for(var i=0;i<max;i++){var dd=document.createElement('div');dd.className='dot'+(i===idx?' active':'');(function(j){dd.onclick=function(){clearTimeout(aT);if(!busy)goto(j,j>idx?'next':'prev');};})(i);dn.appendChild(dd);}}
document.addEventListener('keydown',function(e){if(['ArrowRight','ArrowDown',' '].includes(e.key)){e.preventDefault();next();}if(['ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();prev();}if(e.key==='l'||e.key==='L'){looping=!looping;document.getElementById('aind').textContent=looping?'&#8635; Loop':'&#9654; Auto';}if(e.key==='f'||e.key==='F'){_expEnterFullscreen().catch(function(){});}if(e.key==='Escape'&&document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen();if(e.key==='Escape'&&document.webkitFullscreenElement&&document.webkitExitFullscreen)document.webkitExitFullscreen();});
(function(){var sx=0,sy=0;document.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});document.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5){if(dx<0)next();else prev();}},{passive:true});})();
resize();build(sa(),0);sb().style.pointerEvents='none';ui();sched();
(function(){
  var st=document.getElementById('stage');
  if(!st)return;
  function _expBlockSelect(e){if(e.target.closest('#stage'))e.preventDefault();}
  st.addEventListener('selectstart',_expBlockSelect);
  st.addEventListener('dragstart',function(e){if(e.target.closest('#stage')&&(e.target.tagName==='IMG'||e.target.closest('.psel')))e.preventDefault();});
})();
if(_expAutoFs){(function(){var ov=document.getElementById('exp-fs-start');function _fsDone(){if(ov)ov.style.display='none';}function _fsStart(){_expEnterFullscreen().then(_fsDone).catch(_fsDone);}_expEnterFullscreen().then(_fsDone).catch(function(){if(ov){ov.style.display='flex';ov.onclick=function(){_fsStart();};}});})();}
/* Auto-audio slide 0: play pending audio on first interaction BEFORE navigation */
(function(){
  function _playPendingForSlide(si){
    if(!window._maqPending||!SL[si]||!SL[si].els)return;
    SL[si].els.forEach(function(de){
      if(de.type==='mediaaudio'&&de.maStart==='auto'&&window._maqPending[de.id]){
        var pa=window._maqPending[de.id];delete window._maqPending[de.id];
        pa.currentTime=0;pa.play().catch(function(){});
      }
    });
  }
  /* On ANY first interaction, play pending audio for current slide.
     capture:true so we run first; no stopPropagation so nav still works */
  function _firstGesture(){
    _playPendingForSlide(idx);
    if(_expAutoFs) _expEnterFullscreen().catch(function(){});
  }
  var _p0md=function(){document.removeEventListener('mousedown',_p0md,true);document.removeEventListener('keydown',_p0kd,true);_firstGesture();};
  var _p0kd=function(){document.removeEventListener('keydown',_p0kd,true);document.removeEventListener('mousedown',_p0md,true);_firstGesture();};
  document.addEventListener('mousedown',_p0md,true);
  document.addEventListener('keydown',_p0kd,true);
  /* Also hook goto() so every slide transition plays pending audio */
  window._playPendingForSlide=_playPendingForSlide;
})();

(function(){var _le=null,_ll=[],_on=false;window._dbg=function(m,c2){if(!_on)return;if(!_le){_le=document.createElement('div');_le.style.cssText='position:fixed;bottom:0;left:0;right:0;max-height:200px;overflow-y:auto;background:rgba(0,0,0,.88);color:#7fff7f;font:12px/1.5 monospace;padding:6px 10px;z-index:999999;border-top:1px solid #333;pointer-events:none;';var h=document.createElement('div');h.style.cssText='color:#888;font-size:10px;margin-bottom:3px;';h.textContent='[Debug — Ctrl+D скрыть]';_le.appendChild(h);document.body.appendChild(_le);}var d=new Date(),ts=d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')+':'+d.getSeconds().toString().padStart(2,'0')+'.'+d.getMilliseconds().toString().padStart(3,'0');var ln=document.createElement('div');ln.style.cssText='color:'+(c2||'#7fff7f')+';white-space:pre-wrap;word-break:break-all;';ln.textContent=ts+' '+m;_le.appendChild(ln);_le.scrollTop=_le.scrollHeight;_ll.push(ln);if(_ll.length>60)_ll.shift().remove();};document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&(e.key==='d'||e.key==='D')){e.preventDefault();_on=!_on;if(_on&&_le){_le.style.display='';}else if(_le){_le.style.display='none';}}});})();
${alphaHitSrc}
(function(){
  var st=document.getElementById('stage');
  if(!st||typeof _forwardClickThrough!=='function')return;
  st.addEventListener('click',function(e){
    if(e.target.closest('#nav,#p-nav,.nb'))return;
    var activeC=document.getElementById(window._activeC||'sa');
    if(!activeC)return;
    _forwardClickThrough(e,{container:activeC,selector:'.psel',excludeDecor:true});
  },true);
  st.addEventListener('mousemove',function(e){
    if(e.target.closest('#nav,#p-nav,.nb'))return;
    var activeC=document.getElementById(window._activeC||'sa');
    if(!activeC||typeof _updateAlphaHoverCursor!=='function')return;
    _updateAlphaHoverCursor(e,{container:activeC,selector:'.psel',excludeDecor:true,overlay:st,navSelector:'#nav,#p-nav,.nb'});
  });
  st.addEventListener('mouseleave',function(){
    if(typeof _resetAlphaHoverCursor==='function')_resetAlphaHoverCursor({overlay:st});
  });
})();
// Click on slide to advance (but not on nav buttons or clickable elements)
document.getElementById('stage').addEventListener('click',function(e){
  if(e.target.closest('#nav,#p-nav,.nb'))return;
  if(e._audioHandled)return;
  var activeC=document.getElementById(window._activeC||'sa');
  var psel=(typeof _findElAtPoint==='function'&&activeC
    ? _findElAtPoint(e.clientX,e.clientY,{container:activeC,selector:'.psel',excludeDecor:true})
    : null)||e.target.closest('.psel');
  if(psel&&psel._hasLink)return;
  if(psel&&(psel.dataset.appletId==='counter'||psel.dataset.appletId==='generator'))return;
  // Try to fire next click-animation step on active container
  if(activeC&&activeC._fireNextStep&&activeC._hasSteps&&activeC._hasSteps()){
    activeC._fireNextStep();
    return;
  }
  if(SL[idx]&&SL[idx].clickNav===false)return;
  next();
});
<\/script>
</body></html>`;
  const blob = new Blob([html], {type: 'text/html'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (title || 'presentation') + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
// ══════════════ IMPORT ══════════════
function handleFileImport(e){
  const f=e.target.files[0];if(!f)return;
  const ext=f.name.split('.').pop().toLowerCase();
  if(ext==='html')importHTMLFile(f);
  else if(['pptx','ppt','odp'].includes(ext))importPPTX(f);
  else toast('Unsupported: .'+ext);
  e.target.value='';
}
function _importHtmlScriptJson(html,id){
  const re=new RegExp('<script[^>]+id=["\']'+id+'["\'][^>]*>([\\s\\S]*?)<\\/script>','i');
  const m=html.match(re);
  if(!m) return null;
  return m[1].trim().replace(/\\u003c/g,'<').replace(/\\u003e/g,'>');
}
function importHTMLFile(f){
  const r=new FileReader();r.onload=ev=>{
    try{
      const html=ev.target.result;
      const rawSlides=_importHtmlScriptJson(html,'_sl');
      if(!rawSlides) return toast('Not a SlideForge file');
      slides=JSON.parse(rawSlides);cur=0;
      // Восстанавливаем ec — максимальный числовой id среди всех элементов
      ec=0;
      slides.forEach(s=>(s.els||[]).forEach(d=>{
        const n=parseInt((d.id||'').replace(/\D/g,''));
        if(!isNaN(n)&&n>ec) ec=n;
      }));
      const mar=html.match(/\bar\s*=\s*['"]([^'"]+)['"]/);
      const mw=html.match(/\bvar\s+W\s*=\s*(\d+)/);
      const mh=html.match(/\bvar\s+H\s*=\s*(\d+)/);
      const mt=html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if(mar)ar=mar[1];if(mw)canvasW=+mw[1];if(mh)canvasH=+mh[1];
      document.getElementById('canvas').style.width=canvasW+'px';document.getElementById('canvas').style.height=canvasH+'px';
      document.querySelectorAll('.ar-btn').forEach(b=>b.classList.toggle('active',b.textContent===ar));
      if(mt)document.getElementById('pres-title').value=mt[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
      renderAll();saveState();
      // Немедленно сохраняем в IDB — не ждём дебаунс
      setTimeout(()=>{try{const raw=localStorage.getItem('sf_v4');if(raw&&window._idbSave)window._idbSave(raw);}catch(e){}},100);
      toast('Imported '+slides.length+' slides','ok');
    }catch(err){toast('Import error: '+err.message);}
  };r.readAsText(f);
}
/** OLE Compound Document (classic .ppt / .doc / .xls) magic: D0 CF 11 E0… */
function _isOleCompound(buf){
  if(!buf) return false;
  try{
    const u=buf instanceof Uint8Array?buf:new Uint8Array(buf);
    return u.length>=8&&u[0]===0xD0&&u[1]===0xCF&&u[2]===0x11&&u[3]===0xE0;
  }catch(e){return false;}
}
/** ZIP local/empty/spanned signature (PPTX/ODP are ZIP) */
function _isZipBuffer(buf){
  if(!buf) return false;
  try{
    const u=buf instanceof Uint8Array?buf:new Uint8Array(buf);
    return u.length>=4&&u[0]===0x50&&u[1]===0x4B&&(u[2]===0x03||u[2]===0x05||u[2]===0x07);
  }catch(e){return false;}
}
function _pptxImportIsRu(){
  try{
    if(typeof _lang!=='undefined') return _lang!=='en';
    if(typeof localStorage!=='undefined') return (localStorage.getItem('slides_lang')||'ru')!=='en';
  }catch(e){}
  return true;
}
function _pptxImportFailMsg(err,filename){
  const name=(filename||'').toLowerCase();
  const msg=String(err&&err.message||err||'');
  const isRu=_pptxImportIsRu();
  if(/odp|opendocument/i.test(msg)||/\.odp$/i.test(name)&&/no slides|ppt\/slides|central directory/i.test(msg)){
    return isRu
      ? 'Импорт ODP пока не поддерживается. Сохраните презентацию как .pptx'
      : 'ODP import is not supported yet. Please save as .pptx';
  }
  if(/No PowerPoint Document|No slides\/text|OLE/i.test(msg)){
    return isRu
      ? 'Не удалось прочитать .ppt: '+msg+'. Попробуйте сохранить как .pptx'
      : 'Failed to read .ppt: '+msg+'. Try saving as .pptx';
  }
  if(/zip|central directory|corrupted|no slides/i.test(msg)){
    return isRu
      ? 'Файл не похож на .pptx (нужен современный PowerPoint). Сохраните презентацию как .pptx и попробуйте снова'
      : 'File is not a valid .pptx. Save the presentation as .pptx and try again';
  }
  return (isRu?'Ошибка импорта: ':'Import error: ')+msg;
}
function importPPTX(file){
  const shortName=(file&&file.name||'file').split(/[/\\]/).pop();
  // Binary .ppt: never run autofit/autoplace after import
  if(/\.ppt$/i.test(shortName) && !/\.pptx$/i.test(shortName)){
    window._skipImportAutofit = true;
  }
  showLoading('Loading '+shortName+'…',10);
  const reader=new FileReader();
  reader.onload=ev=>{
    const buf=ev.target.result;
    // Classic binary .ppt (OLE) — dedicated parser
    if(_isOleCompound(buf)){
      if(typeof doParsePPTBinary === 'function'){
        Promise.resolve(doParsePPTBinary(buf, shortName)).catch(err=>{
          hideLoading();
          toast(_pptxImportFailMsg(err, shortName||'file.ppt'),'err');
          console.warn('[PPT import]',err);
        });
      } else {
        hideLoading();
        toast(_pptxImportIsRu()
          ? 'Модуль импорта .ppt не загружен. Обновите страницу (Ctrl+Shift+R)'
          : 'PPT import module missing — refresh the page','err');
      }
      return;
    }
    if(!_isZipBuffer(buf)){
      hideLoading();
      toast(_pptxImportIsRu()
        ? 'Файл не является .pptx. Нужен формат PowerPoint 2007+ (.pptx)'
        : 'File is not a .pptx (PowerPoint 2007+ required)','err');
      return;
    }
    if(!window.JSZip){
      showLoading('Loading JSZip…',30);
      const s=document.createElement('script');s.src='libs/jszip.min.js';
      s.onload=()=>doParsePPTX(buf,shortName);
      s.onerror=()=>{hideLoading();toast('JSZip not found — check libs/jszip.min.js');};document.head.appendChild(s);
    }else doParsePPTX(buf,shortName);
  };reader.readAsArrayBuffer(file);
}

// ── OMML → LaTeX converter for PPTX formula import ──────────────────────────
function _ommlToLatex(oMathNode){
  const nsM='http://schemas.openxmlformats.org/officeDocument/2006/math';
  function node2latex(n){
    if(!n||n.nodeType===3) return n?n.textContent:'';
    const ln=n.localName;
    const ch=Array.from(n.childNodes);
    const childTex=()=>ch.map(node2latex).join('');
    // Text run
    if(ln==='r'){
      const t=n.getElementsByTagNameNS(nsM,'t')[0];
      return t?t.textContent:'';
    }
    // Fraction
    if(ln==='f'){
      const num=n.getElementsByTagNameNS(nsM,'num')[0];
      const den=n.getElementsByTagNameNS(nsM,'den')[0];
      return '\\frac{'+_ommlChildren(num)+'}{'+_ommlChildren(den)+'}';
    }
    // Radical (sqrt)
    if(ln==='rad'){
      const deg=n.getElementsByTagNameNS(nsM,'deg')[0];
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      const degTex=_ommlChildren(deg).trim();
      return degTex&&degTex!=='2'?'\\sqrt['+degTex+']{'+_ommlChildren(e)+'}'
                                  :'\\sqrt{'+_ommlChildren(e)+'}';
    }
    // Superscript
    if(ln==='sSup'){
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      const sup=n.getElementsByTagNameNS(nsM,'sup')[0];
      return _ommlChildren(e)+'^{'+_ommlChildren(sup)+'}';
    }
    // Subscript
    if(ln==='sSub'){
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      const sub=n.getElementsByTagNameNS(nsM,'sub')[0];
      return _ommlChildren(e)+'_{'+_ommlChildren(sub)+'}';
    }
    // Sub+Sup
    if(ln==='sSubSup'){
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      const sub=n.getElementsByTagNameNS(nsM,'sub')[0];
      const sup=n.getElementsByTagNameNS(nsM,'sup')[0];
      return _ommlChildren(e)+'_{'+_ommlChildren(sub)+'}^{'+_ommlChildren(sup)+'}';
    }
    // Parenthesis / delimiter
    if(ln==='d'){
      const begChr=n.getElementsByTagNameNS(nsM,'begChr')[0];
      const endChr=n.getElementsByTagNameNS(nsM,'endChr')[0];
      const beg=begChr?begChr.getAttribute('m:val')||'(':  '(';
      const end=endChr?endChr.getAttribute('m:val')||')':  ')';
      const eSubs=Array.from(n.getElementsByTagNameNS(nsM,'e'));
      const inner=eSubs.map(_ommlChildren).join(',');
      const lb=beg==='('?'\\left(': beg==='['?'\\left[': beg==='{'?'\\left\\{': '\\left.';
      const rb=end===')'?'\\right)': end===']'?'\\right]': end==='}'?'\\right\\}': '\\right.';
      return lb+inner+rb;
    }
    // Nary (sum, integral, product)
    if(ln==='nary'){
      const chrEl=n.getElementsByTagNameNS(nsM,'chr')[0];
      const chr=chrEl?chrEl.getAttribute('m:val')||'∑':'∑';
      const sub=n.getElementsByTagNameNS(nsM,'sub')[0];
      const sup=n.getElementsByTagNameNS(nsM,'sup')[0];
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      const CMD={'∑':'\\sum','∏':'\\prod','∫':'\\int','∬':'\\iint','∭':'\\iiint','∮':'\\oint'}[chr]||'\\sum';
      const lo=sub?'_{'+_ommlChildren(sub)+'}':'';
      const hi=sup?'^{'+_ommlChildren(sup)+'}':'';
      return CMD+lo+hi+' '+_ommlChildren(e);
    }
    // Limit
    if(ln==='limLow'){
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      const lim=n.getElementsByTagNameNS(nsM,'lim')[0];
      return '\\lim_{'+_ommlChildren(lim)+'}'+_ommlChildren(e);
    }
    // Matrix
    if(ln==='m'){
      const rows=Array.from(n.getElementsByTagNameNS(nsM,'mr'));
      const tex=rows.map(r=>{
        const cells=Array.from(r.getElementsByTagNameNS(nsM,'e'));
        return cells.map(_ommlChildren).join(' & ');
      }).join(' \\\\ ');
      return '\\begin{pmatrix}'+tex+'\\end{pmatrix}';
    }
    // Accent (hat, bar, etc.)
    if(ln==='acc'){
      const chrEl=n.getElementsByTagNameNS(nsM,'chr')[0];
      const chr=chrEl?chrEl.getAttribute('m:val')||'^':'^';
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      const ACC={'^':'\\hat','~':'\\tilde','‾':'\\bar','→':'\\vec','·':'\\dot','¨':'\\ddot'}[chr]||'\\hat';
      return ACC+'{'+_ommlChildren(e)+'}';
    }
    // Bar / overline
    if(ln==='bar'){
      const e=n.getElementsByTagNameNS(nsM,'e')[0];
      return '\\overline{'+_ommlChildren(e)+'}';
    }
    // Equation array / group
    if(ln==='eqArr'){
      const rows=Array.from(n.getElementsByTagNameNS(nsM,'e'));
      return rows.map(_ommlChildren).join(' \\\\ ');
    }
    // oMath / oMathPara — just recurse children
    if(ln==='oMath'||ln==='oMathPara') return childTex();
    // Default — recurse
    return childTex();
  }
  function _ommlChildren(n){
    if(!n) return '';
    return Array.from(n.childNodes).map(node2latex).join('');
  }
  // Map common Unicode math symbols to LaTeX
  function _fixSymbols(s){
    return s
      .replace(/α/g,'\\alpha').replace(/β/g,'\\beta').replace(/γ/g,'\\gamma')
      .replace(/δ/g,'\\delta').replace(/ε/g,'\\epsilon').replace(/ζ/g,'\\zeta')
      .replace(/η/g,'\\eta').replace(/θ/g,'\\theta').replace(/ι/g,'\\iota')
      .replace(/κ/g,'\\kappa').replace(/λ/g,'\\lambda').replace(/μ/g,'\\mu')
      .replace(/ν/g,'\\nu').replace(/ξ/g,'\\xi').replace(/π/g,'\\pi')
      .replace(/ρ/g,'\\rho').replace(/σ/g,'\\sigma').replace(/τ/g,'\\tau')
      .replace(/υ/g,'\\upsilon').replace(/φ/g,'\\phi').replace(/χ/g,'\\chi')
      .replace(/ψ/g,'\\psi').replace(/ω/g,'\\omega')
      .replace(/Α/g,'A').replace(/Β/g,'B').replace(/Γ/g,'\\Gamma')
      .replace(/Δ/g,'\\Delta').replace(/Θ/g,'\\Theta').replace(/Λ/g,'\\Lambda')
      .replace(/Ξ/g,'\\Xi').replace(/Π/g,'\\Pi').replace(/Σ/g,'\\Sigma')
      .replace(/Φ/g,'\\Phi').replace(/Ψ/g,'\\Psi').replace(/Ω/g,'\\Omega')
      .replace(/±/g,'\\pm').replace(/∓/g,'\\mp').replace(/×/g,'\\times')
      .replace(/÷/g,'\\div').replace(/≤/g,'\\leq').replace(/≥/g,'\\geq')
      .replace(/≠/g,'\\neq').replace(/≈/g,'\\approx').replace(/≡/g,'\\equiv')
      .replace(/∞/g,'\\infty').replace(/∂/g,'\\partial').replace(/∇/g,'\\nabla')
      .replace(/∈/g,'\\in').replace(/∉/g,'\\notin').replace(/⊂/g,'\\subset')
      .replace(/⊃/g,'\\supset').replace(/∪/g,'\\cup').replace(/∩/g,'\\cap')
      .replace(/∧/g,'\\wedge').replace(/∨/g,'\\vee').replace(/¬/g,'\\neg')
      .replace(/→/g,'\\rightarrow').replace(/←/g,'\\leftarrow')
      .replace(/↔/g,'\\leftrightarrow').replace(/⇒/g,'\\Rightarrow')
      .replace(/⇔/g,'\\Leftrightarrow').replace(/·/g,'\\cdot')
      .replace(/…/g,'\\ldots').replace(/⋯/g,'\\cdots');
  }
  const raw=_ommlChildren(oMathNode);
  return _fixSymbols(raw).trim();
}

async function doParsePPTX(buf,filename){
  try{
    showLoading('Parsing…',50);
    const zip=await JSZip.loadAsync(buf);
    // ODP is also ZIP — detect and refuse clearly
    const mt=zip.file('mimetype');
    if(mt){
      const mime=(await mt.async('text')).trim();
      if(mime.indexOf('opendocument')>=0){
        const e=new Error('opendocument');
        throw e;
      }
    }
    if(!zip.file('ppt/presentation.xml')&&Object.keys(zip.files).some(p=>p.indexOf('content.xml')>=0)){
      throw new Error('opendocument');
    }
    const parser=new DOMParser();
    const nsA='http://schemas.openxmlformats.org/drawingml/2006/main';
    const nsP='http://schemas.openxmlformats.org/presentationml/2006/main';
    const nsR='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    let W=1200,H=675,arOut='16:9',sW=9144000,sH=6858000;
    try{
      const pxml=await zip.file('ppt/presentation.xml')?.async('text');
      if(pxml){const pd=parser.parseFromString(pxml,'text/xml');const sz=pd.getElementsByTagNameNS(nsP,'sldSz')[0];if(sz){sW=+sz.getAttribute('cx')||sW;sH=+sz.getAttribute('cy')||sH;}const ratio=sW/sH;arOut=Math.abs(ratio-16/9)<0.1?'16:9':'4:3';H=arOut==='4:3'?900:675;}
    }catch(e){}
    const scX=W/sW,scY=H/sH;
    const slideFiles=Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a,b)=>+a.match(/\d+/)[0]-+b.match(/\d+/)[0]);
    if(!slideFiles.length){
      throw new Error('no slides / ppt/slides missing — not a PPTX?');
    }
    const total=slideFiles.length;
    const slides_out=[];
    // Helper: get image as base64 data URI
    async function getImgSrc(zip,relsTarget){
      let p=relsTarget;
      if(p.startsWith('../'))p='ppt/'+p.slice(3);
      else if(!p.startsWith('ppt/'))p='ppt/slides/'+p;
      p=p.replace(/\/\.\//g,'/');
      const variants=[p,p.replace('ppt/slides/','ppt/'),p.replace('ppt/',''),'ppt/media/'+p.split('/').pop()];
      for(const v of variants){const f=zip.file(v);if(f){
        const ab=await f.async('arraybuffer');
        const ext=v.split('.').pop().toLowerCase();
        const mime=ext==='png'?'image/png':ext==='gif'?'image/gif':ext==='webp'?'image/webp':ext==='svg'?'image/svg+xml':'image/jpeg';
        const bytes=new Uint8Array(ab);let b64='';for(let i=0;i<bytes.length;i+=8192)b64+=String.fromCharCode(...bytes.subarray(i,i+8192));
        return 'data:'+mime+';base64,'+btoa(b64);
      }}return null;
    }
    // Helper: find xfrm by walking up DOM from any node
    function getXfrmFromEl(el){
      let node=el;
      for(let depth=0;depth<10;depth++){
        if(!node||!node.getElementsByTagNameNS)break;
        const xfrms=node.getElementsByTagNameNS(nsA,'xfrm');
        if(xfrms.length)return xfrms[0];
        node=node.parentNode;
      }
      return null;
    }
    for(let si=0;si<total;si++){
      const sf=slideFiles[si];showLoading('Slide '+(si+1)+'/'+total,50+Math.round(si/total*40));
      const xml=await zip.file(sf)?.async('text');if(!xml)continue;
      const doc=parser.parseFromString(xml,'text/xml');
      const els=[];let bgColor='#1a1a2e';let ec2=0;
      // BG
      try{const nodes=doc.getElementsByTagNameNS(nsA,'srgbClr');if(nodes.length){const v=nodes[0].getAttribute('val');if(v&&v.length===6)bgColor='#'+v.toLowerCase();}}catch(e){}
      // Relationships
      const relsPath='ppt/slides/_rels/'+sf.split('/').pop()+'.rels';
      const imgMap={};
      try{const rxml=await zip.file(relsPath)?.async('text');if(rxml){const rd=parser.parseFromString(rxml,'text/xml');Array.from(rd.getElementsByTagName('Relationship')).forEach(r=>{imgMap[r.getAttribute('Id')]=r.getAttribute('Target');});}}catch(e){}
      // TEXT SHAPES
      for(const sp of doc.getElementsByTagNameNS(nsP,'sp')){
        try{
          // Skip sp containers that have math content
          if(sp.getElementsByTagNameNS('http://schemas.openxmlformats.org/officeDocument/2006/math','oMath').length) continue;
          const xfrm=sp.getElementsByTagNameNS(nsA,'xfrm')[0];if(!xfrm)continue;
          const off=xfrm.getElementsByTagNameNS(nsA,'off')[0];const ext=xfrm.getElementsByTagNameNS(nsA,'ext')[0];if(!off||!ext)continue;
          const x=Math.max(0,Math.round(+off.getAttribute('x')*scX));const y=Math.max(0,Math.round(+off.getAttribute('y')*scY));
          const w=Math.max(40,Math.round(+ext.getAttribute('cx')*scX));const h=Math.max(20,Math.round(+ext.getAttribute('cy')*scY));
          const txBody=sp.getElementsByTagNameNS(nsP,'txBody')[0]||sp.getElementsByTagNameNS(nsA,'txBody')[0];if(!txBody)continue;
          const paras=txBody.getElementsByTagNameNS(nsA,'p');if(!paras.length)continue;
          let html='',domFS=0,domFSFirst=0,domColor='#ffffff',domW='700',domAlign='left';
          for(const para of paras){
            const pPr=para.getElementsByTagNameNS(nsA,'pPr')[0];
            if(pPr){const a2=pPr.getAttribute('algn');if(a2==='ctr')domAlign='center';else if(a2==='r')domAlign='right';}
            const runs=para.getElementsByTagNameNS(nsA,'r');let ph='';
            for(const run of runs){
              const rPr=run.getElementsByTagNameNS(nsA,'rPr')[0];const t=run.getElementsByTagNameNS(nsA,'t')[0];if(!t)continue;
              const txt=t.textContent.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');if(txt==='')continue;
              let st='';
              if(rPr){
                const sz=+rPr.getAttribute('sz');
                if(sz){
                  const fsPx=Math.round(sz/100*96/72);
                  domFS=fsPx;
                  if(!domFSFirst) domFSFirst=fsPx; // запоминаем первый
                  // Не добавляем font-size в span — пусть наследует от cs
                }
                if(rPr.getAttribute('b')==='1')st+='font-weight:700;';
                if(rPr.getAttribute('i')==='1')st+='font-style:italic;';
                if(rPr.getAttribute('u')&&rPr.getAttribute('u')!=='none')st+='text-decoration:underline;';
                const sf2=rPr.getElementsByTagNameNS(nsA,'solidFill')[0];
                if(sf2){const sc2=sf2.getElementsByTagNameNS(nsA,'srgbClr')[0];if(sc2){domColor='#'+sc2.getAttribute('val').toLowerCase();st+='color:'+domColor+';';}}
              }
              ph+=st?'<span style="'+st+'">'+txt+'</span>':txt;
            }
            html+=ph?'<div>'+ph+'</div>':'<div><br></div>';
          }
          // Используем первый font-size как репрезентативный; если нет — дефолт 24px
          const finalFS=domFSFirst||domFS||24;
          if(html)els.push({id:'e'+ec2++,type:'text',x,y,w,h,html,
            cs:'font-size:'+finalFS+'px;color:'+domColor+';text-align:'+domAlign+';',
            _origFs:finalFS,
            rot:0,anims:[],textRole:'body'});
        }catch(e2){}
      }
      // TABLES — parse <p:graphicFrame> containing <a:tbl>
      for(const gf of doc.getElementsByTagNameNS(nsP,'graphicFrame')){
        try{
          const tbl=gf.getElementsByTagNameNS(nsA,'tbl')[0];if(!tbl)continue;
          // graphicFrame uses p:xfrm (nsP), not a:xfrm
          const xfrm=gf.getElementsByTagNameNS(nsP,'xfrm')[0]||gf.getElementsByTagNameNS(nsA,'xfrm')[0];if(!xfrm)continue;
          const off=xfrm.getElementsByTagNameNS(nsA,'off')[0];
          const ext=xfrm.getElementsByTagNameNS(nsA,'ext')[0];if(!off||!ext)continue;
          const tx=Math.max(0,Math.round(+off.getAttribute('x')*scX));
          const ty=Math.max(0,Math.round(+off.getAttribute('y')*scY));
          const tw=Math.max(80,Math.round(+ext.getAttribute('cx')*scX));
          const th=Math.max(40,Math.round(+ext.getAttribute('cy')*scY));
          // Rows — direct children only
          const trs=Array.from(tbl.childNodes).filter(n=>n.localName==='tr'&&n.namespaceURI===nsA);
          if(!trs.length)continue;
          const rows=trs.length;
          const cols=Array.from(trs[0].childNodes).filter(n=>n.localName==='tc'&&n.namespaceURI===nsA).length;
          if(!cols)continue;
          // Column widths
          const tblGrid=tbl.getElementsByTagNameNS(nsA,'tblGrid')[0];
          let colWidths=Array(cols).fill(1/cols);
          if(tblGrid){
            const gridCols=Array.from(tblGrid.getElementsByTagNameNS(nsA,'gridCol'));
            const totalW=gridCols.reduce((s,c)=>s+(+c.getAttribute('w')||0),0)||1;
            if(gridCols.length===cols)colWidths=gridCols.map(c=>(+c.getAttribute('w')||0)/totalW);
          }
          // Row heights
          const totalH=trs.reduce((s,r)=>s+(+r.getAttribute('h')||0),0)||1;
          const rowHeights=trs.map(r=>(+r.getAttribute('h')||0)/totalH);
          // Cells
          const cells=[];
          let headerBg='#3b82f6',cellBg='rgba(255,255,255,0.08)',textColor='#ffffff',fs=14;
          trs.forEach((tr,ri)=>{
            Array.from(tr.childNodes).filter(n=>n.localName==='tc'&&n.namespaceURI===nsA).forEach((tc,ci)=>{
              const tcPr=tc.getElementsByTagNameNS(nsA,'tcPr')[0];
              let bg='';
              if(tcPr){
                const sf3=tcPr.getElementsByTagNameNS(nsA,'solidFill')[0];
                if(sf3){const sc3=sf3.getElementsByTagNameNS(nsA,'srgbClr')[0]||sf3.getElementsByTagNameNS(nsA,'sysClr')[0];
                  if(sc3){const v=(sc3.getAttribute('val')||sc3.getAttribute('lastClr')||'');if(v&&v.length>=6)bg='#'+v.slice(-6).toLowerCase();}}
              }
              const colspan=+tc.getAttribute('gridSpan')||1;
              const rowspan=+tc.getAttribute('rowSpan')||1;
              const hidden=tc.getAttribute('hMerge')==='1'||tc.getAttribute('vMerge')==='1';
              let html='',align='left';
              const txBody2=tc.getElementsByTagNameNS(nsA,'txBody')[0];
              if(txBody2){
                Array.from(txBody2.getElementsByTagNameNS(nsA,'p')).forEach(para=>{
                  const pPr2=para.getElementsByTagNameNS(nsA,'pPr')[0];
                  if(pPr2){const a3=pPr2.getAttribute('algn');if(a3==='ctr')align='center';else if(a3==='r')align='right';}
                  let ph2='';
                  Array.from(para.getElementsByTagNameNS(nsA,'r')).forEach(run=>{
                    const rPr2=run.getElementsByTagNameNS(nsA,'rPr')[0];
                    const t2=run.getElementsByTagNameNS(nsA,'t')[0];if(!t2)return;
                    const txt2=t2.textContent.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');if(!txt2)return;
                    let st2='';
                    if(rPr2){
                      const sz2=+rPr2.getAttribute('sz');if(sz2){const fsPx=Math.round(sz2/100*96/72);st2+='font-size:'+fsPx+'px;';if(ri===0)fs=fsPx;}
                      if(rPr2.getAttribute('b')==='1')st2+='font-weight:700;';
                      if(rPr2.getAttribute('i')==='1')st2+='font-style:italic;';
                      const sf4=rPr2.getElementsByTagNameNS(nsA,'solidFill')[0];
                      if(sf4){const sc4=sf4.getElementsByTagNameNS(nsA,'srgbClr')[0];if(sc4){const cv='#'+sc4.getAttribute('val').toLowerCase();st2+='color:'+cv+';';if(ri===0&&ci===0)textColor=cv;}}
                    }
                    ph2+=st2?'<span style="'+st2+'">'+txt2+'</span>':txt2;
                  });
                  html+=ph2?'<div>'+ph2+'</div>':'<div><br></div>';
                });
              }
              if(ri===0&&ci===0&&bg)headerBg=bg;
              else if(ri===1&&ci===0&&bg)cellBg=bg;
              cells.push({html,align,valign:'middle',bg,colspan,rowspan,hidden});
            });
          });
          els.push({
            id:'e'+ec2++,type:'table',
            x:tx,y:ty,w:tw,h:th,rot:0,anims:[],
            rows,cols,cells,colWidths,rowHeights,
            borderW:1,borderColor:'rgba(255,255,255,0.2)',
            headerRow:true,rx:4,fs,
            textColor,headerBg,cellBg,altBg:'',
          });
        }catch(e4){console.warn('[PPTX] table parse err',e4);}
      }
      // SHAPES — parse sp elements that have prstGeom but no txBody (pure shapes)
      const PRST_MAP={
        rect:'rect',roundRect:'rect',ellipse:'ellipse',
        triangle:'triangle',rtTriangle:'rtriangle',
        pentagon:'pentagon',hexagon:'hexagon',heptagon:'heptagon',octagon:'octagon',
        decagon:'decagon',
        star4:'star4',star5:'star5',star6:'star6',star8:'star8',
        leftArrow:'arrowLeft',rightArrow:'arrow',upArrow:'arrowUp',downArrow:'arrowDown',
        leftRightArrow:'arrowDouble',
        chevron:'chevron',leftArrowCallout:'chevronLeft',
        diamond:'diamond',parallelogram:'parallelogram',trapezoid:'trapezoid',
        cloud:'cloud',
        callout1:'callout',callout2:'callout',callout3:'callout',
        cloudCallout:'calloutRound',wedgeRoundRectCallout:'calloutRound',
        wedgeRectCallout:'callout',wedgeEllipseCallout:'callout',
        roundedRectCallout:'calloutRound',
        heart:'heart',cross:'cross',plus:'plus',
        cylinder:'cylinder',cube:'cube',arc:'arc',line:'line',wave:'wave',
        ribbon:'ribbon',shield:'shield',star16:'badge',funnel:'funnel',gear:'gear',
        moon:'moon',noSmoking:'noSymbol',
        // common aliases
        flowChartTerminator:'rect',flowChartProcess:'rect',flowChartDecision:'diamond',
        flowChartDocument:'wave',flowChartMagneticDisk:'cylinder',
        irregularSeal1:'star4',irregularSeal2:'star5',
        bentArrow:'arrow',stripedRightArrow:'arrow',notchedRightArrow:'chevron',
        homePlate:'chevron',wedge:'triangle',pie:'ellipse',
        accentCallout1:'callout',accentCallout2:'callout',accentCallout3:'callout',
        borderCallout1:'callout',borderCallout2:'callout',borderCallout3:'callout',
        leftBrace:'brace',rightBrace:'brace',
        snip1Rect:'rect',snip2SameRect:'rect',snipRoundRect:'rect',
        round1Rect:'rect',round2SameRect:'rect',
      };
      const seenShapeIds=new Set();
      for(const sp of doc.getElementsByTagNameNS(nsP,'sp')){
        try{
          const txBody=sp.getElementsByTagNameNS(nsP,'txBody')[0]||sp.getElementsByTagNameNS(nsA,'txBody')[0];
          if(txBody){
            // Check if it has actual text — if not, might be a shape with empty txBody
            const texts=Array.from(txBody.getElementsByTagNameNS(nsA,'t')).map(t=>t.textContent).join('').trim();
            if(texts) continue; // has text — handled by TEXT SHAPES section
          }
          const spPr=sp.getElementsByTagNameNS(nsP,'spPr')[0]||sp.getElementsByTagNameNS(nsA,'spPr')[0];
          if(!spPr) continue;
          const prstGeom=spPr.getElementsByTagNameNS(nsA,'prstGeom')[0];
          if(!prstGeom) continue;
          const prst=prstGeom.getAttribute('prst');
          if(!prst) continue;
          const shapeId=PRST_MAP[prst]||'rect'; // fallback to rect
          // For roundRect: read corner radius from avLst adj value
          // For callout: read tail position from adj values
          let _importRx=0;
          let _importTailX=undefined,_importTailY=undefined;
          if(prst==='roundRect'||prst==='round1Rect'||prst==='round2SameRect'||prst==='snipRoundRect'){
            const avLst=prstGeom.getElementsByTagNameNS(nsA,'avLst')[0];
            const gd=avLst&&avLst.getElementsByTagNameNS(nsA,'gd')[0];
            if(gd){
              // adj value is in 1/100000 of shape size (EMU percent), typical range 0–50000
              const adjVal=+(gd.getAttribute('fmla')||'').replace('val ','').trim()||16667;
              // Convert to px: adjVal/100000 * min(w,h)
              _importRx=Math.round(adjVal/100000*Math.min(
                Math.max(20,Math.round(+((spPr.getElementsByTagNameNS(nsA,'ext')[0])||{getAttribute:()=>0}).getAttribute('cx')*scX)),
                Math.max(20,Math.round(+((spPr.getElementsByTagNameNS(nsA,'ext')[0])||{getAttribute:()=>0}).getAttribute('cy')*scY))
              ));
            } else { _importRx=12; } // default fallback
          }
          // Callout tail adj values: adj1=tailX, adj2=tailY as fraction of 100000
          if(PRST_MAP[prst]==='callout'||PRST_MAP[prst]==='calloutRound'){
            const avLst2=prstGeom.getElementsByTagNameNS(nsA,'avLst')[0];
            const gds=avLst2?Array.from(avLst2.getElementsByTagNameNS(nsA,'gd')):[];
            // PPTX adj for callout: adj1=tailX-from-left, adj2=tailY-from-top (0..100000)
            // We'll set defaults and override from import if available
            _importRx=prst.includes('Round')||prst.includes('round')?12:0;
          }
          const xfrm=spPr.getElementsByTagNameNS(nsA,'xfrm')[0];
          if(!xfrm) continue;
          const off=xfrm.getElementsByTagNameNS(nsA,'off')[0];
          const extEl2=xfrm.getElementsByTagNameNS(nsA,'ext')[0];
          if(!off||!extEl2) continue;
          const x=Math.max(0,Math.round(+off.getAttribute('x')*scX));
          const y=Math.max(0,Math.round(+off.getAttribute('y')*scY));
          const w=Math.max(20,Math.round(+extEl2.getAttribute('cx')*scX));
          const h=Math.max(20,Math.round(+extEl2.getAttribute('cy')*scY));
          const rotAttr=+xfrm.getAttribute('rot')||0;
          const rot=Math.round(rotAttr/60000); // EMU angle to degrees
          // Fill color
          let fill='#3b82f6',stroke='#1d4ed8',fillOp=1;
          const solidFill=spPr.getElementsByTagNameNS(nsA,'solidFill')[0];
          if(solidFill){
            const sc2=solidFill.getElementsByTagNameNS(nsA,'srgbClr')[0];
            if(sc2){fill='#'+sc2.getAttribute('val').toLowerCase();stroke=fill;}
            const lumMod=solidFill.querySelector&&solidFill.querySelector('*[val]');
          }
          const ln=spPr.getElementsByTagNameNS(nsA,'ln')[0];
          if(ln){
            const lnFill=ln.getElementsByTagNameNS(nsA,'solidFill')[0];
            if(lnFill){const lsc=lnFill.getElementsByTagNameNS(nsA,'srgbClr')[0];if(lsc)stroke='#'+lsc.getAttribute('val').toLowerCase();}
          }
          const noFill=spPr.getElementsByTagNameNS(nsA,'noFill')[0];
          if(noFill) fillOp=0;
          const uid=x+'_'+y+'_'+w+'_'+h;
          if(seenShapeIds.has(uid)) continue;
          seenShapeIds.add(uid);
          // Determine theme colors
          let _sFill=fill,_sStroke=stroke,_sSw=2;
          const _hasTheme=typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0&&typeof THEMES!=='undefined'&&THEMES[appliedThemeIdx];
          if(_hasTheme){
            const _t=THEMES[appliedThemeIdx];
            _sStroke=_t.shapeStroke||stroke;
            if(fillOp>0) _sFill=_t.shapeFill||fill;
          }
          // Read stroke width from ln element
          const _lnEl=spPr.getElementsByTagNameNS(nsA,'ln')[0];
          if(_lnEl){const _lnW=+(_lnEl.getAttribute('w')||0);if(_lnW>0)_sSw=Math.max(1,Math.round(_lnW/12700));}
          // If no stroke line element at all and noFill → still show border with sw=2
          const _shapeIsCallout=shapeId==='callout'||shapeId==='calloutRound';
          els.push({id:'e'+ec2++,type:'shape',shape:shapeId,x,y,w,h,rot,
            fill:_sFill,stroke:_sStroke,sw:_sSw,fillOp,shadow:false,shadowBlur:8,shadowColor:'#000000',
            rx:_importRx,
            tailX:_shapeIsCallout?0:undefined,
            tailY:_shapeIsCallout?h/2+30:undefined,
            anims:[]});
        }catch(e4){console.warn('shape err',e4);}
      }
// FORMULAS — scan for OMML math objects (a14:m or mc:AlternateContent with m:oMath)
      const nsM='http://schemas.openxmlformats.org/officeDocument/2006/math';
      const nsA14='http://schemas.microsoft.com/office/drawing/2010/main';
      // Find all oMath nodes
      const oMathNodes=[
        ...Array.from(doc.getElementsByTagNameNS(nsM,'oMath')),
        ...Array.from(doc.getElementsByTagNameNS(nsM,'oMathPara')),
      ];
      for(const mathNode of oMathNodes){
        try{
          // Avoid double-processing oMath inside oMathPara
          if(mathNode.localName==='oMath'&&mathNode.parentNode&&mathNode.parentNode.localName==='oMathPara') continue;
          // Walk up to find sp container with xfrm
          let container=mathNode.parentNode;
          let xfrm=null;
          for(let depth=0;depth<12;depth++){
            if(!container)break;
            const xfrms=container.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main','xfrm');
            if(xfrms.length){xfrm=xfrms[0];break;}
            container=container.parentNode;
          }
          if(!xfrm)continue;
          const off=xfrm.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main','off')[0];
          const extEl3=xfrm.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main','ext')[0];
          if(!off||!extEl3)continue;
          const x=Math.max(0,Math.round(+off.getAttribute('x')*scX));
          const y=Math.max(0,Math.round(+off.getAttribute('y')*scY));
          const w=Math.max(80,Math.round(+extEl3.getAttribute('cx')*scX));
          const h=Math.max(40,Math.round(+extEl3.getAttribute('cy')*scY));
          const latex=_ommlToLatex(mathNode);
          if(!latex.trim())continue;
          els.push({id:'e'+ec2++,type:'formula',x,y,w,h,
            formulaRaw:latex,formulaLines:[latex],formulaSvg:'',
            formulaColor:'#ffffff',formulaColorScheme:{col:7,row:0},
            rot:0,anims:[]});
        }catch(eF){console.warn('formula err',eF);}
      }
// IMAGES — universal scan: find ALL a:blip elements in the slide
      const seenRids=new Set();
      // Scan all blip elements in the entire document
      const allBlips=doc.getElementsByTagNameNS(nsA,'blip');
      for(const blip of allBlips){
        try{
          const rId=blip.getAttributeNS(nsR,'embed');
          if(!rId||!imgMap[rId]||seenRids.has(rId))continue;
          // Skip images inside math containers (they are rendered formula images)
          let _bParent=blip.parentNode;let _isMath=false;
          for(let _d=0;_d<10;_d++){if(!_bParent)break;if(_bParent.localName==='oMath'||_bParent.localName==='oMathPara'||_bParent.localName==='AlternateContent'){_isMath=true;break;}_bParent=_bParent.parentNode;}
          if(_isMath)continue;
          seenRids.add(rId);
          const src=await getImgSrc(zip,imgMap[rId]);if(!src)continue;
          const xfrm=getXfrmFromEl(blip);if(!xfrm)continue;
          const off=xfrm.getElementsByTagNameNS(nsA,'off')[0];
          const extEl=xfrm.getElementsByTagNameNS(nsA,'ext')[0];if(!off||!extEl)continue;
          const x=Math.max(0,Math.round(+off.getAttribute('x')*scX));
          const y=Math.max(0,Math.round(+off.getAttribute('y')*scY));
          const w=Math.max(40,Math.round(+extEl.getAttribute('cx')*scX));
          const h=Math.max(40,Math.round(+extEl.getAttribute('cy')*scY));
          els.push({id:'e'+ec2++,type:'image',x,y,w,h,src,rot:0,anims:[]});
        }catch(e3){console.warn('img err',e3);}
      }
      // Slide title
      let title='Slide '+(slides_out.length+1);
      try{const ts=Array.from(doc.getElementsByTagNameNS(nsP,'sp')).find(sp=>{const ph=sp.getElementsByTagNameNS(nsP,'ph')[0];return ph&&(ph.getAttribute('type')==='title'||ph.getAttribute('type')==='ctrTitle');});if(ts){const tx=Array.from(ts.getElementsByTagNameNS(nsA,'t')).map(t=>t.textContent).join('').trim();if(tx)title=tx.slice(0,60);}}catch(e){}
      slides_out.push({title,bg:'custom',bgc:bgColor,ar:arOut,trans:'',auto:0,els});
    }
    slides=slides_out;cur=0;ar=arOut;canvasW=W;canvasH=H;
    document.getElementById('canvas').style.width=W+'px';document.getElementById('canvas').style.height=H+'px';
    document.querySelectorAll('.ar-btn').forEach(b=>b.classList.toggle('active',b.textContent===arOut));
    clampEls(W,H);
    const imgCnt=slides_out.reduce((n,s)=>n+s.els.filter(e=>e.type==='image').length,0);
    const fmlCnt=slides_out.reduce((n,s)=>n+s.els.filter(e=>e.type==='formula').length,0);
    const allFmls=fmlCnt>0?slides_out.flatMap(s=>s.els.filter(e=>e.type==='formula'&&e.formulaRaw)):[];
    // Pre-render all formulas BEFORE renderAll — load MathJax first, then render sequentially
    if(allFmls.length>0&&typeof _loadMathJax==='function'){
      showLoading('Загрузка MathJax…',92);
      await new Promise(res=>_loadMathJax(res));
      if(window.MathJax&&MathJax.tex2svgPromise){
        showLoading('Рендеринг формул…',95);
        for(const d of allFmls){
          try{
            const node=await MathJax.tex2svgPromise(d.formulaRaw,{display:true});
            const svgEl=node.querySelector('svg');
            if(svgEl){
              svgEl.removeAttribute('width');svgEl.removeAttribute('height');
              svgEl.style.width='100%';svgEl.style.height='100%';
              svgEl.querySelectorAll('*').forEach(n=>{
                if(n.getAttribute('fill')==='black'||n.getAttribute('fill')==='#000'||n.getAttribute('fill')==='#000000')
                  n.setAttribute('fill','currentColor');
              });
              d.formulaSvg=svgEl.outerHTML;
            }
          }catch(eR){console.warn('formula render err',eR);}
        }
      }
    }
    showLoading('Finalizing…',99);renderAll();saveState();
      // Немедленно сохраняем в IDB
      setTimeout(()=>{try{const raw=localStorage.getItem('sf_v4');if(raw&&window._idbSave)window._idbSave(raw);}catch(e){}},200);
    hideLoading();
    toast('Imported '+slides.length+' slides'+( imgCnt?' '+imgCnt+' images':'')+( fmlCnt?' '+fmlCnt+' formulas':'')+' from '+filename,'ok');
  }catch(err){
    hideLoading();
    try{err._buf=buf;}catch(e){}
    toast(_pptxImportFailMsg(err,filename),'err');
    console.warn('[PPTX import]',err);
  }
}
