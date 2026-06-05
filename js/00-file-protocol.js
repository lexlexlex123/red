// Поддержка открытия index.html напрямую (file://) без HTTP-сервера.
(function(){
  'use strict';

  const isFile = location.protocol === 'file:';
  window._isFileProtocol = isFile;

  function assetUrl(src){
    if(!src) return src;
    if(src.startsWith('data:') || src.startsWith('blob:')) return src;
    if(/^https?:\/\//i.test(src)) return src;
    try{ return new URL(src, location.href).href; }catch(e){ return src; }
  }
  window.assetUrl = assetUrl;

  function assetLoadImage(src){
    return new Promise((resolve,reject)=>{
      const url = assetUrl(src);
      if(url.startsWith('data:') || url.startsWith('blob:')){
        const im = new Image();
        im.onload = ()=>resolve(im);
        im.onerror = ()=>reject(new Error('img load failed'));
        im.src = url;
        return;
      }
      const im = new Image();
      im.onload = ()=>resolve(im);
      im.onerror = ()=>reject(new Error('img load failed: '+src));
      im.src = url;
    });
  }
  window.assetLoadImage = assetLoadImage;

  async function assetFetchBlob(url){
    const abs = assetUrl(url);
    if(!isFile){
      const r = await fetch(abs);
      if(!r.ok) throw new Error('fetch '+r.status);
      return r.blob();
    }
    if(abs.startsWith('data:')){
      const r = await fetch(abs);
      return r.blob();
    }
    const im = await assetLoadImage(abs);
    const c = document.createElement('canvas');
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(im, 0, 0);
    const du = c.toDataURL('image/png');
    const r = await fetch(du);
    return r.blob();
  }
  window.assetFetchBlob = assetFetchBlob;

  // Если run.sh уже запущен — переключиться на http (полная совместимость).
  if(isFile && !/[?&]file=1(?:&|$)/.test(location.search) && !sessionStorage.getItem('_forceFileMode')){
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(()=>{ try{ ctrl&&ctrl.abort(); }catch(e){} }, 500);
    fetch('http://127.0.0.1:8000/', { signal: ctrl?ctrl.signal:undefined, cache:'no-store' })
      .then(r=>{ clearTimeout(t); if(r.ok) location.replace('http://127.0.0.1:8000/'); })
      .catch(()=>{ clearTimeout(t); });
  }
})();
