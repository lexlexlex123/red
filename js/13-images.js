
// ── PNG Alpha Hit Testing ─────────────────────────────────────────────
// Returns true if the pixel under cursor is transparent (alpha < threshold)
function _isTransparentPixel(elOuter, clientX, clientY, threshold) {
  threshold = threshold == null ? 20 : threshold;
  try {
    const imgTag = elOuter.querySelector('img');
    if (!imgTag || !imgTag.complete || !imgTag.naturalWidth || !imgTag.naturalHeight) return false;

    const src = imgTag.src || '';

    // Compute pixel coords regardless of canvas availability
    const elRect = elOuter.getBoundingClientRect();
    const elW = elRect.width, elH = elRect.height;
    if (!elW || !elH) return false;
    const relX = (clientX - elRect.left) / elW;
    const relY = (clientY - elRect.top) / elH;
    if (relX < 0 || relY < 0 || relX > 1 || relY > 1) return true;

    // Account for object-fit:contain letterboxing
    const nw = imgTag.naturalWidth, nh = imgTag.naturalHeight;
    const imgAspect = nw / nh, elAspect = elW / elH;
    let ox = 0, oy = 0, iw = 1, ih = 1;
    if (imgAspect > elAspect) { ih = elAspect/imgAspect; oy = (1-ih)/2; }
    else { iw = imgAspect/elAspect; ox = (1-iw)/2; }
    const imgRelX = (relX - ox) / iw;
    const imgRelY = (relY - oy) / ih;
    if (imgRelX < 0 || imgRelY < 0 || imgRelX > 1 || imgRelY > 1) return true;

    const px = Math.floor(imgRelX * nw);
    const py = Math.floor(imgRelY * nh);

    // Use cached alpha canvas if ready
    if (imgTag._alphaCanvas && imgTag._alphaCanvas._src === src) {
      const data = imgTag._alphaCanvas.getContext('2d').getImageData(px, py, 1, 1).data;
      return data[3] < threshold;
    }

    // Build canvas (data: URLs work without CORS; file:// needs fetch workaround)
    if (!imgTag._alphaLoading) {
      imgTag._alphaLoading = true;
      const buildCanvas = (imageEl) => {
        const c = document.createElement('canvas');
        c.width = imageEl.naturalWidth; c.height = imageEl.naturalHeight;
        const ctx = c.getContext('2d', {willReadFrequently: true});
        ctx.drawImage(imageEl, 0, 0);
        try {
          ctx.getImageData(0, 0, 1, 1); // test readability
          c._src = src;
          imgTag._alphaCanvas = c;
        } catch(e) { /* still tainted */ }
      };

      if (src.startsWith('data:')) {
        // Data URL — no CORS, can read directly
        buildCanvas(imgTag);
      } else {
        // file:// or http:// — use fetch+blob to avoid CORS
        fetch(src)
          .then(r => r.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            const img2 = new Image();
            img2.onload = () => { buildCanvas(img2); URL.revokeObjectURL(url); };
            img2.src = url;
          })
          .catch(() => buildCanvas(imgTag)); // try direct as fallback
      }
    }
    return false; // canvas not ready yet — will work on next click
  } catch(e) {
    return false;
  }
}

// ══════════════ STOP TEXT EDITING (called from anywhere) ══════════════
function stopTextEditing() {
  const editing = document.querySelector('.el[data-editing="true"]');
  if (editing) {
    const tel = editing.querySelector('.tel');
    if (tel) { tel.contentEditable = 'false'; tel.blur(); }
    delete editing.dataset.editing;
    editing.style.cursor = '';
    commitAll();
  }
  // Also stop any active rich-text contenteditable not tracked by dataset
  const active = document.activeElement;
  if (active && active.contentEditable === 'true' && active.classList.contains('tel')) {
    active.contentEditable = 'false';
    active.blur();
  }
}

// ══════════════ IMAGE PROPS ══════════════
function updateImgStyle(prop,val){
  if(!sel||sel.dataset.type!=='image')return;
  pushUndo();
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  const propMap={fit:'imgFit',rx:'imgRx',bw:'imgBw',bc:'imgBc',shadow:'imgShadow',shadowBlur:'imgShadowBlur',shadowColor:'imgShadowColor',opacity:'imgOpacity'};
  const key=propMap[prop];if(!key)return;
  const parsed=prop==='rx'||prop==='bw'?+val:prop==='shadow'?!!val:prop==='opacity'?+val:val;
  d[key]=parsed;
  sel.dataset[key]=parsed; // also store in DOM dataset for reliable save()
  applyImgStyles(sel,d);commitAll();
}

function flipImg(axis){
  if(!sel||sel.dataset.type!=='image')return;
  pushUndo();
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  if(axis==='h') d.imgFlipH=!d.imgFlipH;
  else d.imgFlipV=!d.imgFlipV;
  sel.dataset.imgFlipH = d.imgFlipH ? 'true' : 'false';
  sel.dataset.imgFlipV = d.imgFlipV ? 'true' : 'false';

  // Плавный разворот через CSS animation
  const _flipTarget = sel.querySelector('.iel') || sel.querySelector('img');
  if(_flipTarget){
    const fx = (d.imgFlipH===true||d.imgFlipH==='true')?-1:1;
    const fy = (d.imgFlipV===true||d.imgFlipV==='true')?-1:1;
    // Целевой scale после flip
    const toSX = fx, toSY = fy;
    // Текущий scale (до flip)
    const fromSX = axis==='h' ? -toSX : toSX;
    const fromSY = axis==='v' ? -toSY : toSY;

    // Инжектируем уникальный keyframe для этого разворота
    const kfId = 'flip_'+Date.now();
    const kfStyle = document.createElement('style');
    // Разворот: от текущего scale → через 0 (схлопывание) → к целевому
    // Используем rotateY/rotateX для 3D эффекта разворота
    if(axis==='h'){
      kfStyle.textContent = `@keyframes ${kfId}{
        0%{transform:scaleX(${fromSX}) scaleY(${toSY})}
        45%{transform:scaleX(0) scaleY(${toSY})}
        55%{transform:scaleX(0) scaleY(${toSY})}
        100%{transform:scaleX(${toSX}) scaleY(${toSY})}
      }`;
    } else {
      kfStyle.textContent = `@keyframes ${kfId}{
        0%{transform:scaleX(${toSX}) scaleY(${fromSY})}
        45%{transform:scaleX(${toSX}) scaleY(0)}
        55%{transform:scaleX(${toSX}) scaleY(0)}
        100%{transform:scaleX(${toSX}) scaleY(${toSY})}
      }`;
    }
    document.head.appendChild(kfStyle);
    _flipTarget.style.animation = `${kfId} 0.5s cubic-bezier(0.4,0,0.6,1) forwards`;
    _flipTarget.style.transformOrigin = 'center';

    const onEnd = ()=>{
      _flipTarget.style.animation = '';
      _flipTarget.removeEventListener('animationend', onEnd);
      // Удаляем временный keyframe
      kfStyle.remove();
      // Применяем финальный transform
      applyImgStyles(sel,d);
    };
    _flipTarget.addEventListener('animationend', onEnd);
  }

  // Сразу сохраняем данные (без перерисовки DOM — это сделает onEnd)
  if(!_flipTarget) applyImgStyles(sel,d);
  commitAll();
}

function updateImgPosition(){
  if(!sel||sel.dataset.type!=='image')return;
  const px=document.getElementById('img-pos-x').value;
  const py=document.getElementById('img-pos-y').value;
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  d.imgPosX=px;d.imgPosY=py;
  sel.dataset.imgPosX=px;sel.dataset.imgPosY=py;
  applyImgStyles(sel,d);commitAll();
}

function applyImgStyles(el,d){
  const img=el.querySelector('img');if(!img)return;
  const c=el.querySelector('.iel');
  const rx=d.imgRx||0;
  const bw=d.imgBw||0;
  const shadow=d.imgShadow?`drop-shadow(0 4px ${d.imgShadowBlur||15}px ${d.imgShadowColor||'#000'})`:null;
  el.style.borderRadius='';
  el.style.overflow='visible';
  el.style.border='none';
  el.style.filter=shadow||'';
  if(c){
    c.style.position='absolute';
    c.style.inset='0';
    c.style.overflow='hidden';
    c.style.clipPath='';
    c.style.filter='';
  }
  img.style.objectFit=d.imgFit||'contain';
  img.style.objectPosition=`${d.imgPosX||'center'} ${d.imgPosY||'center'}`;
  img.style.opacity=d.imgOpacity!=null?d.imgOpacity:1;
  img.style.filter='';
  img.style.width='100%';
  img.style.height='100%';
  img.style.display='block';
  const fx=(d.imgFlipH===true||d.imgFlipH==='true')?-1:1;
  const fy=(d.imgFlipV===true||d.imgFlipV==='true')?-1:1;
  // Флип на .iel контейнере — НЕ на el, чтобы не ломать анимации и drag
  // el.style.transform содержит только rotate — не трогаем его здесь
  const flipTarget = c || img;
  if(fx===-1||fy===-1){
    flipTarget.style.transform = `scale(${fx},${fy})`;
    flipTarget.style.transformOrigin = 'center';
  } else {
    flipTarget.style.transform = '';
    flipTarget.style.transformOrigin = '';
  }
  if(typeof applyImgCrop==='function')applyImgCrop(el,d);
}

function imgCoverSlide(){
  if(!sel||sel.dataset.type!=='image')return;
  pushUndo();
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  d.x=0;d.y=0;d.w=canvasW;d.h=canvasH;
  d.imgFit='cover';
  // Move to back: put at index 0 in els (after decor)
  const idx2=slides[cur].els.indexOf(d);
  if(idx2>0){slides[cur].els.splice(idx2,1);
    const firstNonDecor=slides[cur].els.findIndex(e=>!e._isDecor);
    slides[cur].els.splice(Math.max(0,firstNonDecor),0,d);}
  renderAll();commitAll();
  toast(t('toastImgBg'),'ok');
}

function syncImgProps(el,d){
  try{document.getElementById('img-fit').value=d.imgFit||'contain';}catch(e){}
  try{document.getElementById('img-rx').value=d.imgRx||0;}catch(e){}
  try{document.getElementById('img-bw').value=d.imgBw||0;}catch(e){}
  try{
    const bc=d.imgBc||'#ffffff';
    document.getElementById('img-bc-hex').value=bc;
    document.getElementById('img-bc-preview').style.background=bc;
  }catch(e){}
  try{document.getElementById('img-shadow').checked=!!d.imgShadow;}catch(e){}
  try{document.getElementById('img-sb').value=d.imgShadowBlur||15;}catch(e){}
  try{document.getElementById('img-sc').value=d.imgShadowColor||'#000000';}catch(e){}
  try{document.getElementById('img-op').value=d.imgOpacity!=null?+d.imgOpacity:1;}catch(e){}
}

// ── SVG ID isolation — prevents id conflicts between multiple SVGs in DOM ──
function _isolateSvgIds(svgStr, uid) {
  if (!svgStr || !uid) return svgStr;
  // Collect all id values defined in this SVG
  const ids = [];
  svgStr.replace(/\bid="([^"]+)"/g, (_, id) => { ids.push(id); return _; });
  svgStr.replace(/\bid='([^']+)'/g, (_, id) => { ids.push(id); return _; });
  if (!ids.length) return svgStr;
  // Replace all id definitions and references with prefixed versions
  let s = svgStr;
  ids.forEach(id => {
    const safe = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const newId = uid + '_' + safe;
    // Replace id="..." definitions
    s = s.replace(new RegExp('\\bid="' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'g'), 'id="' + newId + '"');
    s = s.replace(new RegExp("\\bid='" + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'", 'g'), "id='" + newId + "'");
    // Replace url(#...) references
    s = s.replace(new RegExp('url\\(#' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)', 'g'), 'url(#' + newId + ')');
    // Replace href="#..." and xlink:href="#..."
    s = s.replace(new RegExp('href="#' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'g'), 'href="#' + newId + '"');
    s = s.replace(new RegExp('xlink:href="#' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'g'), 'xlink:href="#' + newId + '"');
    // Replace fill="url(#...)" stroke="url(#...)" clip-path="url(#...)" etc.
  });
  return s;
}

function mkEl(d){
  const cv=document.getElementById('canvas');
  const el=document.createElement('div');
  el.className='el';el.dataset.id=d.id;el.dataset.type=d.type;
  if(d.isTrigger)el.dataset.isTrigger='true';
  if(d.link){el.dataset.link=d.link;el.classList.add('has-link');}
  if(d.linkt)el.dataset.linkt=d.linkt;
  if(d.anims&&d.anims.length)el.dataset.anims=JSON.stringify(d.anims);else el.dataset.anims='[]';
  if(d.rot)el.dataset.rot=d.rot;
  const rot=d.rot||0;
  el.style.cssText='left:'+d.x+'px;top:'+d.y+'px;width:'+d.w+'px;height:'+d.h+'px;transform:rotate('+rot+'deg);';
  if(d.rotPivotX||d.rotPivotY){
    el.dataset.rotPivotX=d.rotPivotX||0;
    el.dataset.rotPivotY=d.rotPivotY||0;
    // transformOrigin stays 50%50% — pivot handled via left/top during rotation
  }
  const c=document.createElement('div');c.className='ec';
  if(d.type==='table'){
    c.className='ec tbl-ec';
    c.style.cssText='width:100%;height:100%;overflow:visible;position:relative;';
    // table rendering happens after handles are added (at bottom of mkEl)
  }
  if(d.type==='text'){
    c.classList.add('tel');c.contentEditable='false';
    c.setAttribute('style',d.cs||'font-size:48px;font-weight:700;color:#fff;');
    // Set font size for bullet marker rebuild
    const _fsM=(d.cs||'').match(/font-size:\s*([\d.]+)px/);
    if(_fsM&&typeof _lastBulletFontSize!=='undefined') _lastBulletFontSize=parseFloat(_fsM[1]);
    const rawHtml=d.html||'Double-click to edit';
    c.innerHTML=typeof rtMigrateHtml==='function'?rtMigrateHtml(rawHtml):rawHtml;
    // Re-attach bullet icon click handlers (onclick attr stripped by innerHTML assignment in some browsers)
    if(typeof _attachBulletClickHandlers==='function') _attachBulletClickHandlers(c);
    c.addEventListener('dblclick',e=>{
      e.stopPropagation();
      c.contentEditable='true';
      if(typeof _toEditMode==='function') _toEditMode(c);
      c.focus();
      el.dataset.editing='true';el.style.cursor='text';
      // Prevent growing text from scrolling #cwrap
      el.style.overflow='visible';
      const _cwrap=document.getElementById('cwrap');
      if(_cwrap) _cwrap.style.overflow='hidden';
    });
    c.addEventListener('blur',()=>{
      if(typeof _toSaveMode==='function') _toSaveMode(c);
      // Restore cwrap scroll after editing
      const _cwrap2=document.getElementById('cwrap');
      if(_cwrap2) _cwrap2.style.overflow='';
      // Capture HTML BEFORE contentEditable=false — browser collapses BR tags after
      const vw = c.querySelector('.ec-valign-wrap');
      const _snap = vw ? vw.innerHTML : c.innerHTML;
      el.dataset._savedHtml = _snap;
      c.contentEditable='false'; delete el.dataset.editing; el.style.cursor='';
      commitAll();
      delete el.dataset._savedHtml;
      // Restore correct HTML (browser may have normalized it during contentEditable toggle)
      if(vw) vw.innerHTML = _snap; else c.innerHTML = _snap;
      // Re-attach bullet click handlers after DOM restore
      if(typeof _attachBulletClickHandlers==='function') _attachBulletClickHandlers(c);
    });
    c.addEventListener('input',()=>{ if(typeof _rtCommit==='function') _rtCommit(); else save(); });
    c.addEventListener('keydown',e=>{if(e.key==='Escape'){c.contentEditable='false';c.blur();}else e.stopPropagation();});
    if(typeof rtAttachSelectionTracking==='function')rtAttachSelectionTracking(el,c);
    // Restore background — deferred to after el.append(c) so querySelector('.ec') works
    if(d.valign){el.dataset.valign=d.valign;} // applied after cv.appendChild below
    // Restore text role + uppercase for headings
    if(d.textRole){
      el.dataset.textRole=d.textRole;
      if(d.textRole==='heading'){
        const c2=el.querySelector('.ec');
        if(c2&&!c2.getAttribute('style').includes('text-transform')){
          c2.setAttribute('style',(c2.getAttribute('style')||'')+';text-transform:uppercase;');
        }
      }
    }
    // Restore border
    if(d.textBorderW&&+d.textBorderW>0){el.dataset.textBorderW=d.textBorderW;el.dataset.textBorderColor=d.textBorderColor||'#ffffff';if(d.textBorderStyle)el.dataset.textBorderStyle=d.textBorderStyle;applyTextBorderStyle(el);}
    // Restore opacity
    if(d.elOpacity!=null&&+d.elOpacity!==1){el.dataset.elOpacity=d.elOpacity;el.style.opacity=d.elOpacity;}
    // Restore corner radius
    if(d.rx_tl||d.rx_tr||d.rx_bl||d.rx_br){
      el.dataset.rx_tl=d.rx_tl||0;el.dataset.rx_tr=d.rx_tr||0;
      el.dataset.rx_bl=d.rx_bl||0;el.dataset.rx_br=d.rx_br||0;
      el.dataset.rxUnit=d.rxUnit||'px';applyTextRadius(el);
    }
  }else if(d.type==='image'){
    c.classList.add('iel');const img=document.createElement('img');img.src=d.src;img.draggable=false;c.appendChild(img);
    // Store all img properties in dataset for reliable save()
    if(d.imgFit)el.dataset.imgFit=d.imgFit;
    if(d.imgRx!=null)el.dataset.imgRx=d.imgRx;
    if(d.imgBw!=null)el.dataset.imgBw=d.imgBw;
    if(d.imgBc)el.dataset.imgBc=d.imgBc;
    if(d.imgShadow!=null)el.dataset.imgShadow=d.imgShadow;
    if(d.imgShadowBlur!=null)el.dataset.imgShadowBlur=d.imgShadowBlur;
    if(d.imgShadowColor)el.dataset.imgShadowColor=d.imgShadowColor;
    if(d.imgOpacity!=null)el.dataset.imgOpacity=d.imgOpacity;
    if(d.imgPosX)el.dataset.imgPosX=d.imgPosX;
    if(d.imgPosY)el.dataset.imgPosY=d.imgPosY;
    // Always store crop in dataset so save() reads correct values even without _exitCropMode
    el.dataset.imgCropL=d.imgCropL||0;
    el.dataset.imgCropT=d.imgCropT||0;
    el.dataset.imgCropR=d.imgCropR||0;
    el.dataset.imgCropB=d.imgCropB||0;
    el.dataset.imgFlipH=d.imgFlipH?'true':'false';
    el.dataset.imgFlipV=d.imgFlipV?'true':'false';
    // QR Code fields
    if(d._isQR){
      el.dataset.isQR='true';
      el.dataset.qrText=d.qrText||'';
      el.dataset.qrBg=d.qrBg||'#ffffff';
      el.dataset.qrColor=d.qrColor||'#000000';
      el.dataset.qrRx=d.qrRx!=null?d.qrRx:16;
    }
  }else if(d.type==='code'){
    // will call renderCodeEl after el.append
  }else if(d.type==='markdown'){
    c.classList.add('md-el');
    c.style.cssText=`width:100%;height:100%;overflow:auto;padding:14px 16px;box-sizing:border-box;line-height:1.65;font-size:${d.mdFs||16}px;color:${d.mdColor||'#ffffff'};--md-c:${d.mdColor||'#ffffff'};`;
    c.innerHTML=d.mdHtml||markdownToHtml(d.mdRaw||'');
    c.addEventListener('dblclick',e=>{e.stopPropagation();if(typeof openMdEditor==='function')openMdEditor();});
    // Restore bg
    if(d.textBg||d.textBgBlur||d.textBgGrad){el.dataset.textBg=d.textBg||'';if(d.textBgOp!=null)el.dataset.textBgOp=d.textBgOp;if(d.textBgBlur)el.dataset.textBgBlur=d.textBgBlur;if(d.textBgGrad)el.dataset.textBgGrad='1';if(d.textBgCol2)el.dataset.textBgCol2=d.textBgCol2;if(d.textBgDir!=null)el.dataset.textBgDir=d.textBgDir;if(typeof applyTextBg==='function')applyTextBg(el);}
    else if(d.textBgBlur>0){el.dataset.textBgBlur=d.textBgBlur;if(typeof applyTextBg==='function')applyTextBg(el);}
    // Restore border
    if(d.textBorderW&&+d.textBorderW>0){el.dataset.textBorderW=d.textBorderW;el.dataset.textBorderColor=d.textBorderColor||'#ffffff';if(typeof _applyMdBorder==='function')_applyMdBorder(el);}
    // Restore radius
    if(d.rx_tl||d.rx_tr||d.rx_bl||d.rx_br){el.dataset.rx_tl=d.rx_tl||0;el.dataset.rx_tr=d.rx_tr||0;el.dataset.rx_bl=d.rx_bl||0;el.dataset.rx_br=d.rx_br||0;if(typeof _applyMdRadius==='function')_applyMdRadius(el);}
  }else if(d.type==='shape'){
    const wrap=document.createElement('div');wrap.className='sel-el';
    wrap.style.cssText='position:absolute;inset:0;';
    const svgDiv=document.createElement('div');svgDiv.className='shape-svg';svgDiv.style.cssText='position:absolute;inset:0;';
    svgDiv.innerHTML=buildShapeSVG(d,d.w,d.h);
    // Enable pixel-perfect clicks only on actual SVG fill pixels
    const svgEl=svgDiv.querySelector('svg');
    if(svgEl){
      svgEl.style.pointerEvents='none';
      svgEl.querySelectorAll('path,rect,ellipse,circle,polygon,polyline').forEach(p=>{
        p.style.pointerEvents='visibleFill';
        p.style.cursor='move';
        p.addEventListener('mouseenter',()=>el.classList.add('svg-hovered'));
        p.addEventListener('mouseleave',()=>el.classList.remove('svg-hovered'));
      });
    }
    const _sh=typeof SHAPES!=='undefined'&&SHAPES.find(s=>s.id===d.shape);
    const _isCallout=_sh&&_sh.special==='callout';
    // Shape text: outer flex wrapper (centering) + inner editable div
    const txt=document.createElement('div');txt.className='shape-text';
    const _baseTextCss=d.shapeTextCss||'font-size:24px;font-weight:700;color:#ffffff;text-align:center;';
    txt.setAttribute('style',_baseTextCss);
    if(_isCallout){
      const _sw2=d.sw||2;
      txt.style.position='absolute';txt.style.inset=_sw2+'px';txt.style.padding='8px';
      txt.style.display='flex';txt.style.flexDirection='column';
      txt.style.alignItems='center';txt.style.justifyContent='center';txt.style.textAlign='center';
    }
    // Inner editable div — editing here keeps cursor centered correctly
    const _txtInner=document.createElement('div');
    _txtInner.style.cssText='width:100%;text-align:center;min-height:1em;outline:none;';
    _txtInner.innerHTML=d.shapeHtml||'';
    txt.appendChild(_txtInner);

    function _activateShapeTxt(){
      if(_txtInner.contentEditable==='true')return;
      el.dataset.editing='true';
      _txtInner.contentEditable='true';
      txt.style.pointerEvents='auto';
      _txtInner.focus();
      // Place cursor at end
      const range=document.createRange();range.selectNodeContents(_txtInner);range.collapse(false);
      const sel2=window.getSelection();sel2.removeAllRanges();sel2.addRange(range);
    }
    txt.addEventListener('dblclick',e=>{e.stopPropagation();_activateShapeTxt();});
    _txtInner.addEventListener('blur',()=>{
      _txtInner.contentEditable='false';
      txt.style.pointerEvents='none';
      el.dataset.editing='false';
      const _dTxt=slides[cur]&&slides[cur].els.find(ev=>ev.id===el.dataset.id);
      if(_dTxt) _dTxt.shapeHtml=_txtInner.innerHTML;
      commitAll();
    });
    _txtInner.addEventListener('keydown',e=>{
      if(e.key==='Escape'){_txtInner.blur();return;}
      if(e.key==='Enter'){
        e.preventDefault();
        document.execCommand('insertParagraph',false);
        // Ensure new paragraph is centered
        const _sel3=window.getSelection();
        if(_sel3&&_sel3.rangeCount){
          const _node=_sel3.getRangeAt(0).startContainer;
          const _par=_node.nodeType===3?_node.parentElement:_node;
          if(_par&&_par!==_txtInner) _par.style.textAlign='center';
        }
      }
    });
    _txtInner.addEventListener('input',()=>{
      _txtInner.querySelectorAll('div,p').forEach(n=>n.style.textAlign='center');
      const _dTxt2=slides[cur]&&slides[cur].els.find(ev=>ev.id===el.dataset.id);
      if(_dTxt2) _dTxt2.shapeHtml=_txtInner.innerHTML;
      save();
    });
;
    // dblclick on wrap (full bounding box) — works regardless of fill opacity
    wrap.addEventListener('dblclick',e=>{e.stopPropagation();_activateShapeTxt();});
    wrap.append(svgDiv,txt);c.appendChild(wrap);
    el.dataset.shape=d.shape;el.dataset.fill=d.fill||'#3b82f6';el.dataset.stroke=d.stroke||'#1d4ed8';
    if(d.fillGrad!=null){el.dataset.fillGrad=d.fillGrad?'1':'0';}
    if(d.fillGrad2)el.dataset.fillGrad2=d.fillGrad2;
    if(d.fillGradDir!=null)el.dataset.fillGradDir=d.fillGradDir;
    if(d.cloudSeed!=null){el.dataset.cloudSeed=d.cloudSeed;}
    if(d.paraSkew!=null){el.dataset.paraSkew=d.paraSkew;}
    if(d.shape==='chevron'||d.shape==='chevronLeft'){
      if(d.chevSkew==null) d.chevSkew=25;
      el.dataset.chevSkew=d.chevSkew;
    }
    if(d.shape==='curve'){
      if(!d.curvePoints&&typeof _defaultCurvePoints==='function') d.curvePoints=_defaultCurvePoints();
      if(d.curvePoints) el.dataset.curvePoints=JSON.stringify(d.curvePoints);
    }
    if(d.starRays!=null){el.dataset.starRays=d.starRays;}
    if(d.starInner!=null){el.dataset.starInner=d.starInner;}
    if(d.polySides!=null){el.dataset.polySides=d.polySides;}
    if(d.arcMode){el.dataset.arcMode=d.arcMode;}
    if(d.arcStart!=null){el.dataset.arcStart=d.arcStart;}
    if(d.arcEnd!=null){el.dataset.arcEnd=d.arcEnd;}
    if(d.tailX!==undefined){el.dataset.tailX=d.tailX;el.dataset.tailY=d.tailY;}
    el.dataset.sw=d.sw!=null?d.sw:2;el.dataset.rx=d.rx||0;el.dataset.fillOp=d.fillOp!=null?d.fillOp:1;
    el.dataset.shadow=d.shadow||false;el.dataset.shadowBlur=d.shadowBlur||8;el.dataset.shadowColor=d.shadowColor||'#000000';
    if(d.strokeStyle)el.dataset.strokeStyle=d.strokeStyle;
    // Apply clip-path so hit area matches shape, not bounding box
    _applyShapeClipPath(el, d);
  }else if(d.type==='formula'){
    c.style.cssText='width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:visible;';
    c.style.color = d.formulaColor || '#ffffff';
    if(d.formulaSvg){
      c.innerHTML = d.formulaSvg;
      const svgEl=c.querySelector('svg');
      if(svgEl){svgEl.style.width='100%';svgEl.style.height='100%';}
    } else {
      c.innerHTML='<span style="opacity:.5;font-size:13px;">формула</span>';
    }
    el.dataset.formulaColor = d.formulaColor || '#ffffff';
    el.addEventListener('dblclick', e => {
      e.stopPropagation();
      if(typeof openFormulaEditor==='function') openFormulaEditor(el);
    });
  }else if(d.type==='graph'){
    c.style.cssText='width:100%;height:100%;overflow:hidden;border-radius:6px;position:relative;';
    if(d.graphImg){
      const _gi=document.createElement('img');
      _gi.src=d.graphImg;
      _gi.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block;pointer-events:none;user-select:none;';
      c.appendChild(_gi);
    } else {
      const _gph=document.createElement('div');
      _gph.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.4;font-size:13px;pointer-events:none;';
      _gph.textContent='📈';
      c.appendChild(_gph);
    }
    // Transparent hit-area on top so mousedown always reaches el through mkDrag
    const _ghit=document.createElement('div');
    _ghit.style.cssText='position:absolute;inset:0;z-index:1;';
    c.appendChild(_ghit);
  }else if(d.type==='svg'){
    // Use DOMParser so SVG SMIL animations (<animate>, <animateTransform>) work correctly.
    // innerHTML uses the HTML parser which drops unknown SVG animation elements.
    const _svgRaw=d.svgContent||'';
    // Isolate SVG IDs to prevent conflicts between multiple SVGs in DOM
    const _svgUid = 'svg_' + (d.id||('u'+Math.random().toString(36).slice(2)));
    const _svgStr = _isolateSvgIds(_svgRaw, _svgUid);
    try{
      const _dp=new DOMParser();
      const _doc=_dp.parseFromString(_svgStr,'image/svg+xml');
      const _parsed=_doc.documentElement;
      if(_parsed && _parsed.tagName!=='parsererror'){
        c.appendChild(document.adoptNode(_parsed));
      } else { c.innerHTML=_svgStr; }
    }catch(e){ c.innerHTML=_svgStr; }
    const svgEl=c.querySelector('svg');
    if(svgEl){svgEl.style.width='100%';svgEl.style.height='100%';}
    // Decor elements: fully locked, not interactive
    if(d._isDecor){
      el.style.pointerEvents='none';
      el.style.zIndex='0';
      el.style.cursor='default';
      el.classList.add('decor-el');

    }
  }else if(d.type==='icon'){
    c.style.cssText='width:100%;height:100%;overflow:visible;display:flex;align-items:center;justify-content:center;';
    // If icon was fitted, use saved svgContent (has tight viewBox); otherwise rebuild
    const _mkIc=typeof ICONS!=='undefined'?ICONS.find(function(x){return x.id===d.iconId;}):null;
    const _mkShadow=d.shadow===true||d.shadow==='true';
    const _mkSvg=d.iconFitted&&d.svgContent
      ? d.svgContent
      : ((_mkIc&&typeof _buildIconSVG==='function')
          ?_buildIconSVG(_mkIc,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle||'stroke',_mkShadow,d.shadowBlur,d.shadowColor)
          :(d.svgContent||''));
    const _iconSvgRaw = _mkSvg;
    const _iconUid = 'icon_' + (d.id||('u'+Math.random().toString(36).slice(2)));
    c.innerHTML = _isolateSvgIds(_iconSvgRaw, _iconUid);
    const svgEl2=c.querySelector('svg');
    if(svgEl2){svgEl2.style.width='100%';svgEl2.style.height='100%';}
    el.dataset.iconId=d.iconId||'';
    el.dataset.iconColor=d.iconColor||'#3b82f6';
    el.dataset.iconSw=d.iconSw!=null?d.iconSw:1.8;
    el.dataset.iconStyle=d.iconStyle||'stroke';
    el.dataset.shadow=_mkShadow;
    el.dataset.shadowBlur=d.shadowBlur||8;
    el.dataset.shadowColor=d.shadowColor||'#000000';
    // Double-click to replace icon
    el.addEventListener('dblclick',function(e){e.stopPropagation();window._iconReplaceMode=true;if(typeof openIconModal==='function')openIconModal();});
    }else if(d.type==='applet'){
    const wrap=document.createElement('div');wrap.className='applet-el';
    // Layer 1: clip div — clips iframe to border-radius
    const clip=document.createElement('div');
    clip.style.cssText='position:absolute;inset:0;overflow:hidden;border-radius:inherit;';
    const iframe=document.createElement('iframe');iframe.srcdoc=d.appletHtml||'<p>Applet</p>';
    iframe.style.cssText='width:100%;height:100%;border:none;background:transparent;';
    iframe.setAttribute('allowtransparency','true');
    iframe.sandbox = 'allow-scripts'; // allow-same-origin removed — postMessage works with '*' targetOrigin
    clip.appendChild(iframe);
    // Layer 2: border overlay div — sits ON TOP of clip, pointer-events:none, never clipped
    const bord=document.createElement('div');bord.className='applet-border-overlay';
    bord.style.cssText='position:absolute;inset:0;border-radius:inherit;pointer-events:none;box-sizing:border-box;';
    const tog=document.createElement('button');tog.className='applet-toggle';tog.textContent='Interact';
    tog.onclick=(ev)=>{ev.stopPropagation();wrap.classList.toggle('interactive');tog.textContent=wrap.classList.contains('interactive')?'Done':'Interact';};
    wrap.append(clip,bord,tog);c.appendChild(wrap);
    el.dataset.appletId=d.appletId||'';
    el.dataset.appletHtml=d.appletHtml||'';
    if(d._appletAspect)el.dataset.appletAspect=d._appletAspect;
    // Write generator fields to dataset so save() can read them back
    if(d.appletId==='generator'){
      el.dataset.genMin         = d.genMin         !== undefined ? d.genMin         : 1;
      el.dataset.genMax         = d.genMax         !== undefined ? d.genMax         : 100;
      el.dataset.genStep        = d.genStep        !== undefined ? d.genStep        : 1;
      el.dataset.genFontSize    = d.genFontSize    !== undefined ? d.genFontSize    : 64;
      el.dataset.genColor       = d.genColor       || '';
      el.dataset.genBg          = d.genBg          || '';
      el.dataset.genBgBlur      = d.genBgBlur      !== undefined ? d.genBgBlur      : 0;
      el.dataset.genBorderColor = d.genBorderColor || '';
      el.dataset.genBorderWidth = d.genBorderWidth !== undefined ? d.genBorderWidth : 0;
      el.dataset.genBgOp        = d.genBgOp        !== undefined ? d.genBgOp        : 1;
      el.dataset.genShadowOn    = d.genShadowOn    !== undefined ? (d.genShadowOn ? 'true' : 'false') : 'true';
      el.dataset.genShadowBlur  = d.genShadowBlur  !== undefined ? d.genShadowBlur  : 8;
      el.dataset.genShadowColor = d.genShadowColor || '';
      el.dataset.genBold        = d.genBold ? 'true' : 'false';
      el.dataset.genAlign       = d.genAlign       || 'center';
      el.dataset.genVAlign      = d.genVAlign      || 'middle';
      el.dataset.genColorScheme  = d.genColorScheme  ? JSON.stringify(d.genColorScheme)  : '';
      el.dataset.genBgScheme     = d.genBgScheme     ? JSON.stringify(d.genBgScheme)     : '';
      el.dataset.genBorderScheme = d.genBorderScheme ? JSON.stringify(d.genBorderScheme) : '';
    }
    // Restore border-radius — apply to wrap (clip div inherits it), border stays visible
    if(d.rx){
      const r=d.rx+'px';
      el.style.borderRadius=r;
      wrap.style.borderRadius=r;
    }
    // Always store rx in dataset so save() can read it back (even when 0)
    el.dataset.genRx = d.rx !== undefined ? d.rx : 0;
    // Apply border on overlay div using refreshGeneratorEl (handles resolved color, postMessage, etc.)
    // Schedule after DOM is inserted so domEl.querySelector works
    if(d.appletId==='generator'){
      requestAnimationFrame(function(){
        if(typeof refreshGeneratorEl==='function') refreshGeneratorEl(d.id);
      });
    }
    if(d.appletId==='timer'){
      el.dataset.tmMin          = d.tmMin          !== undefined ? d.tmMin          : 5;
      el.dataset.tmSec          = d.tmSec          !== undefined ? d.tmSec          : 0;
      el.dataset.tmOnEnd        = d.tmOnEnd        || 'none';
      el.dataset.tmOnEndSlide   = d.tmOnEndSlide   !== undefined ? d.tmOnEndSlide   : 0;
      el.dataset.genFontSize    = d.genFontSize     !== undefined ? d.genFontSize    : 72;
      el.dataset.genColor       = d.genColor        || '';
      el.dataset.genBg          = d.genBg           || '';
      el.dataset.genBgBlur      = d.genBgBlur       !== undefined ? d.genBgBlur      : 0;
      el.dataset.genBorderColor = d.genBorderColor  || '';
      el.dataset.genBorderWidth = d.genBorderWidth  !== undefined ? d.genBorderWidth : 0;
      el.dataset.genBgOp        = d.genBgOp         !== undefined ? d.genBgOp        : 1;
      el.dataset.genShadowOn    = d.genShadowOn     !== undefined ? (d.genShadowOn ? 'true' : 'false') : 'true';
      el.dataset.genShadowBlur  = d.genShadowBlur   !== undefined ? d.genShadowBlur  : 8;
      el.dataset.genShadowColor = d.genShadowColor  || '';
      el.dataset.genBold        = d.genBold ? 'true' : 'false';
      el.dataset.genAlign       = d.genAlign        || 'center';
      el.dataset.genVAlign      = d.genVAlign       || 'middle';
      el.dataset.genColorScheme  = d.genColorScheme  ? JSON.stringify(d.genColorScheme)  : '';
      el.dataset.genBgScheme     = d.genBgScheme     ? JSON.stringify(d.genBgScheme)     : '';
      el.dataset.genBorderScheme = d.genBorderScheme ? JSON.stringify(d.genBorderScheme) : '';
      requestAnimationFrame(function(){
        if(typeof refreshTimerEl==='function') refreshTimerEl(d.id);
      });
    }
    if(d.appletId==='clock'){
      el.dataset.genFontSize    = d.genFontSize    !== undefined ? d.genFontSize    : 48;
      el.dataset.genColor       = d.genColor       || '';
      el.dataset.genBg          = d.genBg          || '';
      el.dataset.genBgBlur      = d.genBgBlur      !== undefined ? d.genBgBlur      : 0;
      el.dataset.genBorderColor = d.genBorderColor || '';
      el.dataset.genBorderWidth = d.genBorderWidth !== undefined ? d.genBorderWidth : 0;
      el.dataset.genBgOp        = d.genBgOp        !== undefined ? d.genBgOp        : 1;
      el.dataset.genShadowOn    = d.genShadowOn    !== undefined ? (d.genShadowOn ? 'true' : 'false') : 'true';
      el.dataset.genShadowBlur  = d.genShadowBlur  !== undefined ? d.genShadowBlur  : 8;
      el.dataset.genShadowColor = d.genShadowColor || '';
      el.dataset.genBold        = d.genBold ? 'true' : 'false';
      el.dataset.genAlign       = d.genAlign       || 'center';
      el.dataset.genVAlign      = d.genVAlign      || 'middle';
      el.dataset.genColorScheme  = d.genColorScheme  ? JSON.stringify(d.genColorScheme)  : '';
      el.dataset.genBgScheme     = d.genBgScheme     ? JSON.stringify(d.genBgScheme)     : '';
      el.dataset.genBorderScheme = d.genBorderScheme ? JSON.stringify(d.genBorderScheme) : '';
      requestAnimationFrame(function(){
        if(typeof refreshClockEl==='function') refreshClockEl(d.id);
      });
    }
  }else if(d.type==='pagenum'){
    c.style.cssText='width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:visible;pointer-events:none;';
    c.innerHTML=d.html||'';
    if(d.elOpacity!=null&&+d.elOpacity!==1)el.style.opacity=d.elOpacity;
    el.style.cursor='default';
  }
  const lb=document.createElement('div');lb.className='link-bar';
  const trigBadge=document.createElement('div');trigBadge.className='trigger-badge';trigBadge.textContent='🎯';
  // Decor and pagenum elements: no resize handles, no drag, no events
  if(!d._isDecor && d.type!=='pagenum'){
    const rhs=[
      {cls:'rh br',dx:1, dy:1, ax:0,ay:0},
      {cls:'rh tr',dx:1, dy:-1,ax:0,ay:1},
      {cls:'rh bl',dx:-1,dy:1, ax:1,ay:0},
      {cls:'rh tl',dx:-1,dy:-1,ax:1,ay:1},
      {cls:'rh tm',dx:0, dy:-1,ax:0,ay:1},
      {cls:'rh bm',dx:0, dy:1, ax:0,ay:0},
      {cls:'rh ml',dx:-1,dy:0, ax:1,ay:0},
      {cls:'rh mr',dx:1, dy:0, ax:0,ay:0},
    ];
    rhs.forEach(h=>{
      const rh=document.createElement('div');
      rh.setAttribute('class',h.cls);
      mkResize(el,rh,h);
      el.appendChild(rh);
    });
  }
  el.append(c,lb,trigBadge);cv.appendChild(el);
  // Управляем анимацией декора после вставки в DOM
  if(d._isDecor){
    setTimeout(function(){
      const _dsvg=el.querySelector('svg');
      if(!_dsvg) return;
      try{
        if(typeof _layoutAnimated!=='undefined' && !_layoutAnimated){
          if(typeof _decorPausedAt!=='undefined' && typeof _decorSvgSlideIndex==='function'){
            const _si=_decorSvgSlideIndex(_dsvg);
            if(_decorPausedAt.has(_si)) _dsvg.setCurrentTime(_decorPausedAt.get(_si));
          }
          _dsvg.pauseAnimations();
        } else {
          _dsvg.unpauseAnimations();
        }
      }catch(e){}
    }, 50);
  }
  // Restore text background here — after el.append(c) so .ec is queryable
  if(d.type==='text'){
    if(d.textBg){el.dataset.textBg=d.textBg;}
    if(d.textBgOp!=null)el.dataset.textBgOp=d.textBgOp;
    if(d.textBgGrad)el.dataset.textBgGrad='1'; else delete el.dataset.textBgGrad;
    if(d.textBgCol2)el.dataset.textBgCol2=d.textBgCol2; else delete el.dataset.textBgCol2;
    if(d.textBgDir!=null)el.dataset.textBgDir=d.textBgDir;
    if(d.textBgBlur>0)el.dataset.textBgBlur=d.textBgBlur;
    if(typeof applyTextBg==='function'){
      applyTextBg(el);
      // Second pass in next frame in case first call ran before layout
      requestAnimationFrame(()=>{ if(el.isConnected&&typeof applyTextBg==='function')applyTextBg(el); });
    }
  }
  if(d.valign&&d.type==='text'&&typeof applyTextVAlign==='function')applyTextVAlign(el,d.valign);
  if(d.type==='table'&&d.tableBgBlur>0){
    el.style.backdropFilter=`blur(${d.tableBgBlur}px)`;el.style.webkitBackdropFilter=`blur(${d.tableBgBlur}px)`;}
  if(d.type==='svg'){el.addEventListener('dblclick',e=>{e.stopPropagation();if(typeof openSVGModalEdit==='function')openSVGModalEdit();});}
  if(d.type==='code'){renderCodeEl(el,d);el.addEventListener('dblclick',e=>{e.stopPropagation();if(typeof openCodeEditor==='function')openCodeEditor();});}
  if(d.type==='htmlframe'){renderHtmlFrameEl(el,d);el.addEventListener('dblclick',e=>{e.stopPropagation();if(typeof openHtmlFrameEditor==='function')openHtmlFrameEditor();});}
  if(d.type==='image')applyImgStyles(el,d);
  if(d.type==='table'&&typeof renderTableEl==='function'){if(typeof _tblSaveToDataset==='function')_tblSaveToDataset(el,d);renderTableEl(el,d);if(typeof _tblAttachResizeObs==='function')_tblAttachResizeObs(el,d);}
  // Restore elOpacity for all element types
  if(d.elOpacity!=null&&+d.elOpacity!==1){el.dataset.elOpacity=d.elOpacity;el.style.opacity=d.elOpacity;}
  // Restore shapeBlur via overlay
  if(d.type==='shape'&&d.shapeBlur>0){el.dataset.shapeBlur=d.shapeBlur;if(typeof _applyShapeBlur==='function')_applyShapeBlur(el);}
  // For shapes: apply elOpacity to inner svg so backdrop-filter coexists
  if(d.type==='shape'&&d.elOpacity!=null&&+d.elOpacity!==1){
    const _svg=el.querySelector('svg');if(_svg)_svg.style.opacity=d.elOpacity;
    const _st=el.querySelector('.shape-text');if(_st)_st.style.opacity=d.elOpacity;
    el.style.opacity=''; // don't set on el itself
  }
  if(d._isDecor)return; // done — no drag/events for decor
  if(d.type==='pagenum'){
    // pagenum: draggable but not selectable/resizable — custom lightweight drag
    let _ox,_oy,_ol,_ot,_on=false;
    el.style.cursor='move';
    el.addEventListener('mousedown',e=>{
      if(e.button!==0)return;
      e.preventDefault();e.stopPropagation();
      _on=true;_ox=e.clientX;_oy=e.clientY;_ol=parseInt(el.style.left);_ot=parseInt(el.style.top);
      el.style.outline='2px dashed rgba(255,255,255,.4)';
      const mm=e2=>{
        if(!_on)return;
        const _z=typeof _canvasZoom==='number'?_canvasZoom:1;
        el.style.left=(_ol+(e2.clientX-_ox)/_z)+'px';
        el.style.top=(_ot+(e2.clientY-_oy)/_z)+'px';
      };
      const mu=()=>{
        _on=false;
        el.style.outline='';
        document.removeEventListener('mousemove',mm);
        document.removeEventListener('mouseup',mu);
        const nx=parseInt(el.style.left), ny=parseInt(el.style.top);
        // Update data on current slide
        const d2=slides[cur]&&slides[cur].els.find(x=>x.id===el.dataset.id);
        if(d2){d2.x=nx;d2.y=ny;}
        // Propagate to all slides and save coords
        if(typeof pnOnDragEnd==='function') pnOnDragEnd(nx,ny);
        commitAll();
      };
      document.addEventListener('mousemove',mm);
      document.addEventListener('mouseup',mu);
    });
    return;
  }
  // Restore hover fx
  if(d.hoverFx){el.dataset.hoverFx=JSON.stringify(d.hoverFx);applyHoverFxEditor(el,d.hoverFx);}
  if(d.objHidden){el.style.opacity='0';el.style.pointerEvents='none';el.dataset.objHidden='1';}
  mkDrag(el,c);
  el.addEventListener('mousedown',ev=>{
    if(el.dataset.editing==='true')return; // let text editing handle it
    const cn=ev.target.className||'';
    if(typeof cn==='string'&&(cn.includes('rh')||cn.includes('db')))return;
    if(ev.target.closest&&(ev.target.closest('.applet-el')&&ev.target.closest('.interactive')))return;
    // PNG alpha hit test: if clicking transparent area of an image, pass click to element below
    if(d.type==='image' && !(typeof multiSel!=='undefined'&&multiSel&&multiSel.size>1&&multiSel.has(el))){
      const _iel = el.querySelector('.iel');
      // Pass the outer el for correct rect (iel fills el; object-fit handled inside function)
      if(_iel && _isTransparentPixel(el, ev.clientX, ev.clientY, 20)){
        // Find element below in DOM stack
        const _cv2 = document.getElementById('canvas');
        if(_cv2){
          const _r2 = _cv2.getBoundingClientRect();
          const _sx2 = (typeof canvasW!=='undefined'?canvasW:_cv2.offsetWidth)/_r2.width;
          const _sy2 = (typeof canvasH!=='undefined'?canvasH:_cv2.offsetHeight)/_r2.height;
          const _cx2 = (ev.clientX-_r2.left)*_sx2, _cy2 = (ev.clientY-_r2.top)*_sy2;
          const _kids2 = Array.from(_cv2.querySelectorAll('.el:not(.decor-el)'));
          let _below2 = null;
          for(let _i2=_kids2.length-1;_i2>=0;_i2--){
            const _pp=_kids2[_i2]; if(_pp===el) continue;
            const _ppx=parseInt(_pp.style.left)||0,_ppy=parseInt(_pp.style.top)||0;
            const _ppw=parseInt(_pp.style.width)||0,_pph=parseInt(_pp.style.height)||0;
            if(_cx2>=_ppx&&_cx2<=_ppx+_ppw&&_cy2>=_ppy&&_cy2<=_ppy+_pph){_below2=_pp;break;}
          }
          if(_below2){
            ev.stopPropagation();
            if(typeof pickMulti==='function') pickMulti(_below2, false);
            else if(typeof pick==='function') pick(_below2);
            // Start drag on element below
            const _bl3=parseInt(_below2.style.left)||0,_bt3=parseInt(_below2.style.top)||0;
            window._anyDragging=true;
            const _ox3=ev.clientX,_oy3=ev.clientY; let _mv3=false;
            const _mm3=mv=>{
              if(!_mv3){_mv3=true;if(typeof pushUndo==='function')pushUndo();}
              const _z3=typeof zoom!=='undefined'?zoom:1;
              const _snc=document.getElementById('snap-chk');
              let _nl3=_bl3+(mv.clientX-_ox3)/_z3,_nt3=_bt3+(mv.clientY-_oy3)/_z3;
              if(_snc&&_snc.checked&&typeof snapV==='function'){_nl3=snapV(_nl3);_nt3=snapV(_nt3);}
              _below2.style.left=_nl3+'px';_below2.style.top=_nt3+'px';
              if(typeof drawGuides==='function')drawGuides(_below2);
              if(typeof _updateHandlesOverlay==='function')_updateHandlesOverlay();
            };
            const _mu3=()=>{
              window._anyDragging=false;
              document.removeEventListener('mousemove',_mm3);document.removeEventListener('mouseup',_mu3);
              if(_mv3){
                if(typeof clearGuides==='function')clearGuides();if(typeof commitAll==='function')commitAll();
                const _bd3=slides[cur]&&slides[cur].els.find(e=>e.id===_below2.dataset.id);
                if(_bd3){_bd3.x=parseInt(_below2.style.left);_bd3.y=parseInt(_below2.style.top);}
                if(typeof save==='function')save();if(typeof drawThumbs==='function')drawThumbs();if(typeof saveState==='function')saveState();
              }
            };
            document.addEventListener('mousemove',_mm3);document.addEventListener('mouseup',_mu3);
            return;
          }
        }
      }
    }
    // For shapes: only pick if clicking on actual SVG shape fill, not empty bounding box area
    if(d.type==='shape'&&(d.shape==='curve')){
      // Curve: only selectable/draggable via actual stroke, not empty bbox
      const _isCurvePath = ev.target.tagName==='path' && ev.target.closest('.el')===el;
      // If part of multi-selection, always drag the group — don't passthrough
      if(typeof multiSel!=='undefined' && multiSel.size > 1 && multiSel.has(el)){
        // fall through to normal group drag
      } else if(!_isCurvePath){
        const _belowParent = (()=>{
          const _cv = document.getElementById('canvas');
          if (!_cv) return null;
          const _rect = _cv.getBoundingClientRect();
          const _sx = (typeof canvasW!=='undefined'?canvasW:_cv.offsetWidth)/_rect.width;
          const _sy = (typeof canvasH!=='undefined'?canvasH:_cv.offsetHeight)/_rect.height;
          const _cx = (ev.clientX-_rect.left)*_sx, _cy = (ev.clientY-_rect.top)*_sy;
          const _kids = Array.from(_cv.querySelectorAll('.el:not(.decor-el)'));
          for(let _i=_kids.length-1;_i>=0;_i--){
            const _p=_kids[_i]; if(_p===el) continue;
            const _px=parseInt(_p.style.left)||0,_py=parseInt(_p.style.top)||0;
            const _pw=parseInt(_p.style.width)||0,_ph=parseInt(_p.style.height)||0;
            if(parseFloat(_p.dataset.rot||0)!==0){
              const _ee=document.elementsFromPoint(ev.clientX,ev.clientY);
              for(const _e2 of _ee){const _ep=_e2.closest('.el');if(_ep&&_ep!==el&&!_ep.classList.contains('decor-el'))return _ep;}
              return null;
            }
            if(_cx>=_px&&_cx<=_px+_pw&&_cy>=_py&&_cy<=_py+_ph) return _p;
          }
          return null;
        })();
        if(_belowParent){
          ev.stopPropagation();
          if(typeof pickMulti==='function') pickMulti(_belowParent, false);
          else if(typeof pick==='function') pick(_belowParent);
          // Start drag on _belowParent immediately
          const _bl2=parseInt(_belowParent.style.left)||0, _bt2=parseInt(_belowParent.style.top)||0;
          window._anyDragging=true;
          const _ox2=ev.clientX, _oy2=ev.clientY;
          let _mv2=false;
          const _mm2=mv=>{
            if(!_mv2){_mv2=true;if(typeof pushUndo==='function')pushUndo();}
            const _zoom2=typeof zoom!=='undefined'?zoom:1;
            let _nl2=_bl2+(mv.clientX-_ox2)/_zoom2,_nt2=_bt2+(mv.clientY-_oy2)/_zoom2;
            const _snChk2=document.getElementById('snap-chk');
            if(_snChk2&&_snChk2.checked&&typeof snapV==='function'){_nl2=snapV(_nl2);_nt2=snapV(_nt2);}
            _belowParent.style.left=_nl2+'px';
            _belowParent.style.top=_nt2+'px';
            if(typeof drawGuides==='function')drawGuides(_belowParent);
            if(typeof _updateHandlesOverlay==='function')_updateHandlesOverlay();
          };
          const _mu2=()=>{
            window._anyDragging=false;
            window._alphaPassthroughDrag=false;
            document.removeEventListener('mousemove',_mm2);
            document.removeEventListener('mouseup',_mu2);
            if(_mv2){
              if(typeof clearGuides==='function')clearGuides();
              if(typeof commitAll==='function')commitAll();
              const _bd2=slides[cur]&&slides[cur].els.find(e=>e.id===_belowParent.dataset.id);
              if(_bd2){_bd2.x=parseInt(_belowParent.style.left);_bd2.y=parseInt(_belowParent.style.top);}
              if(typeof save==='function')save();
              if(typeof drawThumbs==='function')drawThumbs();
              if(typeof saveState==='function')saveState();
            }
          };
          document.addEventListener('mousemove',_mm2);
          document.addEventListener('mouseup',_mu2);
          return;
        }
        // Nothing below — allow curve pick only if not already selected
        if(el.classList.contains('sel')) return; // keep curve selected, don't restart drag
      } // end else if(!_isCurvePath)
    }
    if(d.type==='shape'&&!el.classList.contains('sel')){
      if(d.shape!=='curve'){ // curve already handled above
        if(false){
      } else {
        const isSvgPart=ev.target.tagName==='path'||ev.target.tagName==='rect'||
          ev.target.tagName==='ellipse'||ev.target.tagName==='circle'||
          ev.target.tagName==='polygon'||ev.target.tagName==='polyline';
        const isHitArea=ev.target.classList&&ev.target.classList.contains('shape-hit-area');
        const _sh2=typeof SHAPES!=='undefined'?SHAPES.find(s=>s.id===el.dataset.shape):null;
        const isNoFillSelf=ev.target===el&&_sh2&&_sh2.noFill;
        if(!isSvgPart&&!isHitArea&&!isNoFillSelf&&!ev.target.closest('.shape-text')&&!ev.target.closest('.rh'))return;
      }
      } // end if(d.shape!=='curve')
    }
    ev.stopPropagation();
    // If element is already part of multi-selection, don't reset the group
    if(multiSel.size>1&&multiSel.has(el)&&!ev.shiftKey)return;
    // mkDrag already handles shiftKey via pickMulti — avoid double call
    if(ev.shiftKey) return;
    pickMulti(el, false);
  });
  // Note: ResizeObserver removed - renderShapeEl is called explicitly from mkResize
}
function pick(el){
  // Remove arc/star handles when deselecting or switching element
  document.querySelectorAll('.arc-handle').forEach(h=>h.remove());
  document.querySelectorAll('.star-handle').forEach(h=>h.remove()); document.querySelectorAll('.para-handle').forEach(h=>h.remove()); document.querySelectorAll('.chev-handle').forEach(h=>h.remove()); document.querySelectorAll('.curve-handle').forEach(h=>h.remove()); if(typeof _curveSelPts!=='undefined'&&el!==sel)_curveSelPts.clear(); if(typeof _exitCurveEditMode==='function'&&el!==sel&&!(window._curveEditMode&&el===null))_exitCurveEditMode();
  // Deselect connector synchronously when picking an element
  if(typeof _deselectConn==='function'&&typeof _selConnId!=='undefined'&&_selConnId) _deselectConn();
  // Exit crop mode if switching away from the cropped image
  if(typeof exitCropModeIfActive==='function'&&_cropEl&&_cropEl!==el)exitCropModeIfActive();
  // Clear table cell selection when leaving a table
  if(sel&&sel.dataset.type==='table'&&sel!==el&&typeof tblClearSel==='function') tblClearSel();
  // Exit text editing on previously selected element - force blur to trigger save
  if(sel&&sel.dataset.editing==='true'){
    const c=sel.querySelector('.tel');
    if(c){c.contentEditable='false';c.blur();}
    delete sel.dataset.editing;sel.style.cursor='';
    commitAll();
  }
  // Exit shape text editing on previously selected element
  _blurActiveShapeText();
  const prevSel=sel;
  if(sel)sel.classList.remove('sel');
  sel=el;
  if(el){
    el.classList.add('sel');
    // Restore pivot transform-origin if set

    // When selected: restore full pointer-events so resize handles work
    if(el.dataset.type==='shape'){
      el.style.pointerEvents='auto';
      const _sh2=typeof SHAPES!=='undefined'?SHAPES.find(s=>s.id===el.dataset.shape):null;
      const _isCloud = _sh2 && _sh2.special === 'cloud';
      const _isCurve = _sh2 && _sh2.special === 'curve';
      // Check if shape needs clip-path hit testing when selected
      // (ellipse, polygon, star, parallelogram and any non-rectangular shape)
      const _dClipCheck = slides[cur]&&slides[cur].els.find(e=>e.id===el.dataset.id);
      const _wClip = parseInt(el.style.width)||(_dClipCheck&&_dClipCheck.w)||100;
      const _hClip = parseInt(el.style.height)||(_dClipCheck&&_dClipCheck.h)||100;
      const _cpCheck = _dClipCheck && typeof _shapeClipPath==='function' ? _shapeClipPath(_dClipCheck,_wClip,_hClip) : 'none';
      const _needsClipHit = _sh2 && !_sh2.noFill && _cpCheck !== 'none' && !_cpCheck.startsWith('inset(');
      if(_isCloud){
        // Cloud: keep pointerEvents:none on el, SVG fill path handles clicks
        el.style.pointerEvents='none';
        const _dClip=slides[cur]&&slides[cur].els.find(e=>e.id===el.dataset.id);
        if(_dClip&&typeof _applyShapeClipPath==='function') _applyShapeClipPath(el,_dClip);
      } else if(_isCurve){
        // Curve: apply hit testing based on fill state
        const _dCurve=slides[cur]&&slides[cur].els.find(e=>e.id===el.dataset.id);
        if(_dCurve&&typeof _applyShapeClipPath==='function') _applyShapeClipPath(el,_dCurve);
      } else if(_needsClipHit){
        // Keep/rebuild hit-area with clip-path so clicks outside shape pass through
        const _dClip=slides[cur]&&slides[cur].els.find(e=>e.id===el.dataset.id);
        const _hit=el.querySelector('.shape-hit-area');
        if(_hit){ _hit.style.pointerEvents='auto'; }
        else if(_dClip&&typeof _applyShapeClipPath==='function'){
          _applyShapeClipPath(el,_dClip);
          const _hit2=el.querySelector('.shape-hit-area');
          if(_hit2) _hit2.style.pointerEvents='auto';
        }
        el.style.pointerEvents='none';
      } else {
        el.style.pointerEvents='auto';
        const _hit=el.querySelector('.shape-hit-area');if(_hit)_hit.remove();
      }
    }
  }
  // When deselected: re-apply hit area with clip-path on the PREVIOUSLY selected shape
  if(prevSel&&prevSel!==el&&prevSel.dataset.type==='shape'&&typeof _applyShapeClipPath==='function'){
    const _dd=slides[cur]&&slides[cur].els.find(e=>e.id===prevSel.dataset.id);
    if(_dd)_applyShapeClipPath(prevSel,_dd);
  }
  syncProps();
  if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
  // Refresh lego z-order so selected element appears on top
  if(typeof _refreshAllLegoZ==='function') _refreshAllLegoZ();
  if(document.getElementById('anim-panel').classList.contains('open'))renderAnimPanel();
}
function desel(){if(window._curveEditMode)return;clearGuides();pick(null);}
