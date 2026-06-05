// ══════════════ BACKGROUND ══════════════
function _resolveSlideColorBg(s){
  if(!s) return '#ddd';
  if(s.bg==='custom'||s.bg==='theme'){
    const theme=(typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)?THEMES[appliedThemeIdx]:null;
    const fallback=theme?theme.bg:'#1a1a2e';
    return s.bgc||fallback;
  }
  const bg=BGS.find(b=>b.id===s.bg);
  return bg?bg.s:'#ddd';
}

function _imgDisplayName(src, hint){
  if(hint) return hint;
  if(!src||src.startsWith('data:')) return typeof t==='function'?t('slideBgImgDefault'):'Изображение';
  try{
    const p=src.split('/').pop().split('?')[0];
    if(p) return decodeURIComponent(p);
  }catch(e){}
  return typeof t==='function'?t('slideBgImgDefault'):'Изображение';
}

const _bgImgLoadCache=window._bgImgLoadCache||(window._bgImgLoadCache=new Map());

function _normalizeBgImg(bg){
  if(!bg) return null;
  if(!bg.mode){
    if(bg.fit==='100% 100%'||bg.fit==='fill') bg.mode='stretch';
    else bg.mode='cover';
  }
  if(bg.opacity==null) bg.opacity=1;
  if(bg.blur==null) bg.blur=0;
  if(bg.mode==='tile'){
    if(bg.tileSize==null) bg.tileSize=120;
    if(bg.tileGap==null) bg.tileGap=10;
    if(bg.tileRot==null) bg.tileRot=0;
  }
  if(bg.mode==='custom'){
    const refW=(typeof canvasW!=='undefined'?canvasW:1200);
    const refH=(typeof canvasH!=='undefined'?canvasH:675);
    if(bg.customSize==null){
      if(bg.customW!=null||bg.customH!=null) bg.customSize=Math.max(bg.customW||0,bg.customH||0);
      else bg.customSize=Math.round(Math.min(refW,refH)*0.5);
    }
    if(bg.customMargin==null) bg.customMargin=0;
    if(!bg.customAnchor) bg.customAnchor='center';
  }
  return bg;
}

function _bgCustomRect(W,H,bg,img){
  const size=Math.max(20,bg.customSize||300);
  const margin=Math.max(0,bg.customMargin||0);
  const ir=(img&&img.naturalWidth)?img.naturalWidth/img.naturalHeight:16/9;
  let iw,ih;
  if(ir>=1){iw=size;ih=size/ir;}
  else{ih=size;iw=size*ir;}
  const maxW=Math.max(1,W-margin*2),maxH=Math.max(1,H-margin*2);
  if(iw>maxW){const s=maxW/iw;iw=maxW;ih*=s;}
  if(ih>maxH){const s=maxH/ih;ih=maxH;iw*=s;}
  const a=bg.customAnchor||'center';
  let x,y;
  if(a==='tl'){x=margin;y=margin;}
  else if(a==='tr'){x=W-iw-margin;y=margin;}
  else if(a==='bl'){x=margin;y=H-ih-margin;}
  else if(a==='br'){x=W-iw-margin;y=H-ih-margin;}
  else{x=(W-iw)/2;y=(H-ih)/2;}
  return{x,y,w:iw,h:ih};
}

function _clearCvbgImgLayer(el){
  el.querySelectorAll('.cvbg-img-layer').forEach(n=>n.remove());
}

function _drawImgCoverInRect(ctx,img,x,y,w,h){
  const ir=(img.naturalWidth||1)/(img.naturalHeight||1);
  const tr=w/h;
  let dw,dh,dx,dy;
  if(ir>tr){dh=h;dw=dh*ir;dx=x+(w-dw)/2;dy=y;}
  else{dw=w;dh=dw/ir;dx=x;dy=y+(h-dh)/2;}
  ctx.drawImage(img,dx,dy,dw,dh);
}

function _bgTileDims(img,tileSize){
  const ir=(img.naturalWidth||1)/(img.naturalHeight||1);
  if(ir>=1) return {w:tileSize,h:tileSize/ir};
  return {w:tileSize*ir,h:tileSize};
}

function _scaleBgImgForCanvas(bgImg,W,H,refW,refH){
  const bg=_normalizeBgImg(JSON.parse(JSON.stringify(bgImg)));
  if(!refW||!refH)return bg;
  const sc=Math.min(W/refW,H/refH);
  if(bg.blur>0) bg.blur=Math.max(0,Math.round(bg.blur*sc));
  if(bg.mode==='stretch'||bg.mode==='cover')return bg;
  if(bg.mode==='tile'){
    bg.tileSize=Math.max(4,Math.round((bg.tileSize||120)*sc));
    bg.tileGap=Math.max(0,Math.round((bg.tileGap||0)*sc));
  } else if(bg.mode==='custom'){
    bg.customSize=Math.max(4,Math.round((bg.customSize||300)*sc));
    bg.customMargin=Math.max(0,Math.round((bg.customMargin||0)*sc));
  }
  return bg;
}

function _paintSlideBgImgContent(ctx,bg,W,H,img){
  const alpha=Math.max(0,Math.min(1,+bg.opacity));
  ctx.save();
  ctx.globalAlpha=alpha;
  if(bg.mode==='stretch'){
    ctx.drawImage(img,0,0,W,H);
  } else if(bg.mode==='cover'){
    _drawImgCoverInRect(ctx,img,0,0,W,H);
  } else if(bg.mode==='tile'){
    const tileSize=Math.max(10,bg.tileSize||120);
    const gap=Math.max(0,bg.tileGap||0);
    const td=_bgTileDims(img,tileSize);
    const cellW=td.w+gap,cellH=td.h+gap;
    const rotDeg=bg.tileRot||0;
    const rot=rotDeg*Math.PI/180;
    const seam=rotDeg?1:0;
    const seamOff=seam*0.5;
    const diag=Math.sqrt(W*W+H*H)*2;
    const cols=Math.ceil(diag/cellW)+2;
    const rows=Math.ceil(diag/cellH)+2;
    const startX=-Math.ceil(cols/2)*cellW;
    const startY=-Math.ceil(rows/2)*cellH;
    ctx.beginPath();
    ctx.rect(0,0,W,H);
    ctx.clip();
    ctx.translate(W/2,H/2);
    ctx.rotate(rot);
    for(let row=0;row<rows;row++){
      for(let col=0;col<cols;col++){
        const tx=startX+col*cellW-seamOff;
        const ty=startY+row*cellH-seamOff;
        ctx.drawImage(img,tx,ty,td.w+seam,td.h+seam);
      }
    }
  } else if(bg.mode==='custom'){
    const r=_bgCustomRect(W,H,bg,img);
    ctx.drawImage(img,r.x,r.y,r.w,r.h);
  }
  ctx.restore();
}

function drawSlideBgImgOnCanvas(ctx,bgImg,W,H,img){
  if(!ctx||!img||!bgImg||!bgImg.src)return;
  const bg=_normalizeBgImg(bgImg);
  const blur=Math.max(0,+bg.blur||0);
  if(blur>0){
    const tmp=document.createElement('canvas');
    tmp.width=W;tmp.height=H;
    _paintSlideBgImgContent(tmp.getContext('2d'),bg,W,H,img);
    ctx.save();
    ctx.filter=`blur(${blur}px)`;
    ctx.drawImage(tmp,0,0);
    ctx.restore();
  } else {
    _paintSlideBgImgContent(ctx,bg,W,H,img);
  }
}

function _paintBgImgLayer(canvas,bgImg,W,H){
  const bg=_normalizeBgImg(bgImg);
  const draw=(img)=>{
    const ctx=canvas.getContext('2d');
    if(!ctx)return;
    ctx.clearRect(0,0,W,H);
    drawSlideBgImgOnCanvas(ctx,bg,W,H,img);
  };
  let cached=_bgImgLoadCache.get(bg.src);
  if(cached&&cached.complete&&cached.naturalWidth){draw(cached);return;}
  if(!cached){cached=new Image();_bgImgLoadCache.set(bg.src,cached);}
  cached.onload=()=>{
    draw(cached);
    if(typeof window._exportRememberImg==='function') window._exportRememberImg(cached);
  };
  cached.onerror=()=>{};
  const _loadSrc=typeof assetUrl==='function'?assetUrl(bg.src):bg.src;
  if(cached.src!==_loadSrc) cached.src=_loadSrc;
  else if(cached.complete) cached.onload();
}

function _applySlideBgToEl(el,s,W,H){
  if(!el||!s) return;
  _clearCvbgImgLayer(el);
  const colorBg=_resolveSlideColorBg(s);
  el.style.background=colorBg;

  if(!s.bgImg||!s.bgImg.src) return;
  W=W||(typeof canvasW!=='undefined'?canvasW:1200);
  H=H||(typeof canvasH!=='undefined'?canvasH:675);

  const wrap=document.createElement('div');
  wrap.className='cvbg-img-layer';
  wrap.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;';

  const canvas=document.createElement('canvas');
  canvas.width=W;
  canvas.height=H;
  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  wrap.appendChild(canvas);
  el.appendChild(wrap);
  _paintBgImgLayer(canvas,s.bgImg,W,H);
}

function _applySlideBgToCanvas(s){
  _applySlideBgToEl(document.getElementById('cvbg'),s);
}

function applyBgId(id){
  const bg=BGS.find(b=>b.id===id);
  slides[cur].bg=id;slides[cur].bgc=null;
  delete slides[cur].bgImg;
  _applySlideBgToCanvas(slides[cur]);
  hilBg(id);save();drawThumbs();saveState();
  syncSlideBgPreview();
  syncSlideBgImageUI();
}
function setCustomBg(c){
  slides[cur].bg='custom';slides[cur].bgc=c;
  _applySlideBgToCanvas(slides[cur]);
  hilBg(null);save();drawThumbs();saveState();
  syncSlideBgPreview();
}
function hilBg(id){document.querySelectorAll('.bgsw').forEach(d=>d.classList.toggle('on',d.dataset.id===id));}
function loadBg(s){
  _applySlideBgToCanvas(s);
  if(s.bg==='custom'||s.bg==='theme') hilBg(null);
  else hilBg(s.bg);
  syncSlideBgPreview();
  syncSlideBgImageUI();
}

function setSlideBgFromPalette(c, schemeRef){
  slides[cur].bgScheme = schemeRef || null;
  setCustomBg(c);
  const sw = document.getElementById('slide-bg-preview');
  if(sw) sw.style.background = c;
}

function resetSlideBgToTheme(){
  const theme = (typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0) ? THEMES[appliedThemeIdx] : null;
  const bgVal = theme ? theme.bg : '#1a1a2e';
  slides[cur].bg = 'custom';
  slides[cur].bgc = bgVal;
  delete slides[cur].bgImg;
  delete slides[cur].bgScheme;
  _applySlideBgToCanvas(slides[cur]);
  hilBg(null);
  const sw = document.getElementById('slide-bg-preview');
  if(sw){
    const hex = bgVal.match(/#[0-9a-fA-F]{6}/);
    sw.style.background = hex ? hex[0] : bgVal;
  }
  syncSlideBgImageUI();
  save(); drawThumbs(); saveState();
}

function syncSlideBgPreview(){
  const s = slides[cur]; if(!s) return;
  const sw = document.getElementById('slide-bg-preview'); if(!sw) return;
  if(s.bg === 'custom' && s.bgc){
    const hex = s.bgc.match(/#[0-9a-fA-F]{6}/);
    sw.style.background = hex ? hex[0] : (s.bgc.includes('gradient') ? s.bgc : s.bgc);
  } else {
    sw.style.background = '';
  }
}

function syncSlideBgImageUI(){
  const s = slides[cur];
  const row = document.getElementById('slide-bg-img-row');
  const nameEl = document.getElementById('slide-bg-img-name');
  const modesRow = document.getElementById('slide-bg-img-modes');
  const tileProps = document.getElementById('slide-bg-tile-props');
  const customProps = document.getElementById('slide-bg-custom-props');
  const hasBg = !!(s && s.bgImg && s.bgImg.src);

  if(row && nameEl){
    if(hasBg){
      row.style.display='block';
      const nm=s.bgImg.name||_imgDisplayName(s.bgImg.src);
      nameEl.textContent=nm;
      nameEl.title=nm;
    } else {
      row.style.display='none';
      nameEl.textContent='';
      nameEl.title='';
    }
  }

  if(modesRow) modesRow.style.display=hasBg?'block':'none';
  if(tileProps){
    const bg=hasBg?_normalizeBgImg(s.bgImg):null;
    const isTile=bg&&bg.mode==='tile';
    tileProps.style.display=isTile?'flex':'none';
    if(isTile){
      const sz=document.getElementById('sbg-tile-size');
      const gp=document.getElementById('sbg-tile-gap');
      const rt=document.getElementById('sbg-tile-rot');
      if(sz) sz.value=bg.tileSize;
      if(gp) gp.value=bg.tileGap;
      if(rt) rt.value=bg.tileRot;
    }
  }
  if(customProps){
    const bg=hasBg?_normalizeBgImg(s.bgImg):null;
    const isCustom=bg&&bg.mode==='custom';
    customProps.style.display=isCustom?'flex':'none';
    if(isCustom){
      const sz=document.getElementById('sbg-custom-size');
      const mg=document.getElementById('sbg-custom-margin');
      if(sz) sz.value=bg.customSize;
      if(mg) mg.value=bg.customMargin;
      ['tl','tr','center','bl','br'].forEach(a=>{
        const btn=document.getElementById('sbg-anc-'+a);
        if(btn) btn.classList.toggle('active',a===(bg.customAnchor||'center'));
      });
    }
  }

  if(hasBg){
    const bg=_normalizeBgImg(s.bgImg);
    ['stretch','cover','tile','custom'].forEach(m=>{
      const btn=document.getElementById('sbg-'+m);
      if(btn) btn.classList.toggle('active',m===bg.mode);
    });
    const opInp=document.getElementById('sbg-opacity');
    if(opInp) opInp.value=Math.round((bg.opacity!=null?bg.opacity:1)*100);
    const blurInp=document.getElementById('sbg-blur');
    if(blurInp) blurInp.value=bg.blur!=null?bg.blur:0;
  }
}

function setSlideBgImage(src,name){
  if(!slides[cur]||!src)return;
  pushUndo();
  const resolvedBg=_resolveSlideColorBg(slides[cur]);
  slides[cur].bgImg={src,name:name||_imgDisplayName(src),mode:'cover',opacity:1,blur:0,tileSize:120,tileGap:10,tileRot:0};
  slides[cur].bg='custom';
  if(!slides[cur].bgc&&resolvedBg)slides[cur].bgc=resolvedBg;
  _applySlideBgToCanvas(slides[cur]);
  syncSlideBgPreview();
  syncSlideBgImageUI();
  save();drawThumbs();saveState();
  if(typeof toast==='function')toast(t('toastImgBg'),'ok');
}

function setSlideBgImgMode(mode){
  if(!slides[cur]||!slides[cur].bgImg)return;
  pushUndo();
  const bg=slides[cur].bgImg;
  bg.mode=mode;
  if(mode==='tile'||mode==='custom') _normalizeBgImg(bg);
  _applySlideBgToCanvas(slides[cur]);
  syncSlideBgImageUI();
  save();drawThumbs();saveState();
}

function setSlideBgTileProp(prop,val){
  if(!slides[cur]||!slides[cur].bgImg||slides[cur].bgImg.mode!=='tile')return;
  pushUndo();
  if(prop==='tileSize') slides[cur].bgImg.tileSize=Math.max(20,Math.min(800,Math.round(val)||120));
  else if(prop==='tileGap') slides[cur].bgImg.tileGap=Math.max(0,Math.min(200,Math.round(val)||0));
  else if(prop==='tileRot') slides[cur].bgImg.tileRot=Math.round(val)||0;
  _applySlideBgToCanvas(slides[cur]);
  save();drawThumbs();saveState();
}

function setSlideBgCustomProp(prop,val){
  if(!slides[cur]||!slides[cur].bgImg||slides[cur].bgImg.mode!=='custom')return;
  const refW=(typeof canvasW!=='undefined'?canvasW:1200);
  const refH=(typeof canvasH!=='undefined'?canvasH:675);
  const maxSize=Math.max(refW,refH);
  if(typeof debouncedPushUndo==='function') debouncedPushUndo();
  else pushUndo();
  if(prop==='customSize') slides[cur].bgImg.customSize=Math.max(20,Math.min(maxSize,Math.round(val)||Math.round(Math.min(refW,refH)*0.5)));
  else if(prop==='customMargin') slides[cur].bgImg.customMargin=Math.max(0,Math.min(Math.round(maxSize/2),Math.round(val)||0));
  _applySlideBgToCanvas(slides[cur]);
  save();drawThumbs();saveState();
}

function setSlideBgCustomAnchor(anchor){
  if(!slides[cur]||!slides[cur].bgImg||slides[cur].bgImg.mode!=='custom')return;
  pushUndo();
  slides[cur].bgImg.customAnchor=anchor;
  _applySlideBgToCanvas(slides[cur]);
  syncSlideBgImageUI();
  save();drawThumbs();saveState();
}

function setSlideBgOpacity(pct){
  if(!slides[cur]||!slides[cur].bgImg)return;
  if(typeof debouncedPushUndo==='function') debouncedPushUndo();
  else pushUndo();
  slides[cur].bgImg.opacity=Math.max(0,Math.min(1,(+pct||0)/100));
  _applySlideBgToCanvas(slides[cur]);
  save();drawThumbs();saveState();
}

function setSlideBgBlur(px){
  if(!slides[cur]||!slides[cur].bgImg)return;
  if(typeof debouncedPushUndo==='function') debouncedPushUndo();
  else pushUndo();
  slides[cur].bgImg.blur=Math.max(0,Math.min(100,Math.round(+px||0)));
  _applySlideBgToCanvas(slides[cur]);
  save();drawThumbs();saveState();
}

function clearSlideBgImage(){
  if(!slides[cur] || !slides[cur].bgImg) return;
  pushUndo();
  delete slides[cur].bgImg;
  _applySlideBgToCanvas(slides[cur]);
  syncSlideBgImageUI();
  save(); drawThumbs(); saveState();
}

function applySlideStyleToAll(){
  const src = slides[cur];
  if(!src) return;
  pushUndo();
  const style = {
    bg: src.bg,
    bgc: src.bgc,
    bgScheme: src.bgScheme,
    bgImg: src.bgImg ? JSON.parse(JSON.stringify(src.bgImg)) : null,
  };
  slides.forEach((s, i) => {
    if(i === cur) return;
    s.bg = style.bg;
    s.bgc = style.bgc;
    if(style.bgScheme !== undefined) s.bgScheme = style.bgScheme;
    else delete s.bgScheme;
    if(style.bgImg) s.bgImg = JSON.parse(JSON.stringify(style.bgImg));
    else delete s.bgImg;
  });
  _applySlideBgToCanvas(slides[cur]);
  syncSlideBgPreview();
  syncSlideBgImageUI();
  save(); drawThumbs(); saveState();
  if(typeof toast === 'function') toast(t('toastSlideStyleApplied'), 'ok');
}
