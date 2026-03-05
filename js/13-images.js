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
    c.style.borderRadius=rx+'px';
    if(bw>0){c.style.border=`${bw}px solid ${d.imgBc||'#fff'}`;c.style.boxSizing='border-box';}
    else{c.style.border='none';}
  }
  img.style.objectFit=d.imgFit||'contain';
  img.style.objectPosition=`${d.imgPosX||'center'} ${d.imgPosY||'center'}`;
  img.style.opacity=d.imgOpacity!=null?d.imgOpacity:1;
  img.style.filter='';
  img.style.width='100%';
  img.style.height='100%';
  img.style.display='block';
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
  try{
    document.getElementById('img-fit').value=d.imgFit||'contain';
    document.getElementById('img-pos-x').value=d.imgPosX||'center';
    document.getElementById('img-pos-y').value=d.imgPosY||'center';
    document.getElementById('img-rx').value=d.imgRx||0;
    document.getElementById('img-bw').value=d.imgBw||0;
    document.getElementById('img-bc').value=d.imgBc||'#ffffff';
    document.getElementById('img-shadow').checked=!!d.imgShadow;
    document.getElementById('img-sb').value=d.imgShadowBlur||15;
    document.getElementById('img-sc').value=d.imgShadowColor||'#000000';
    const op=d.imgOpacity!=null?+d.imgOpacity:1;
    document.getElementById('img-op').value=op;
    document.getElementById('img-op-val').textContent=Math.round(op*100)+'%';
  }catch(e){}
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
  const c=document.createElement('div');c.className='ec';
  if(d.type==='table'){
    c.className='ec tbl-ec';
    c.style.cssText='width:100%;height:100%;overflow:visible;position:relative;';
    // table rendering happens after handles are added (at bottom of mkEl)
  }
  if(d.type==='text'){
    c.classList.add('tel');c.contentEditable='false';
    c.setAttribute('style',d.cs||'font-size:48px;font-weight:700;color:#fff;');
    const rawHtml=d.html||'Double-click to edit';
    c.innerHTML=typeof rtMigrateHtml==='function'?rtMigrateHtml(rawHtml):rawHtml;
    c.addEventListener('dblclick',e=>{
      e.stopPropagation();
      c.contentEditable='true';
      if(typeof _toEditMode==='function') _toEditMode(c);
      c.focus();
      el.dataset.editing='true';el.style.cursor='text';
    });
    c.addEventListener('blur',()=>{
      if(typeof _toSaveMode==='function') _toSaveMode(c);
      c.contentEditable='false';delete el.dataset.editing;el.style.cursor='';
      commitAll();
    });
    c.addEventListener('input',()=>{ if(typeof _rtCommit==='function') _rtCommit(); else save(); });
    c.addEventListener('keydown',e=>{if(e.key==='Escape'){c.contentEditable='false';c.blur();}else e.stopPropagation();});
    if(typeof rtAttachSelectionTracking==='function')rtAttachSelectionTracking(el,c);
    // Restore vertical alignment
    if(d.valign){el.dataset.valign=d.valign;} // applied after cv.appendChild below
    // Restore background — apply directly to c since it may not be in el yet
    if(d.textBg){el.dataset.textBg=d.textBg;if(d.textBgOp!=null)el.dataset.textBgOp=d.textBgOp;
      const op=parseFloat(d.textBgOp!=null?d.textBgOp:1);
      const col=d.textBg;const r=parseInt(col.slice(1,3),16),g=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);
      c.style.background=`rgba(${r},${g},${b},${op})`;}
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
    if(d.textBorderW&&+d.textBorderW>0){el.dataset.textBorderW=d.textBorderW;el.dataset.textBorderColor=d.textBorderColor||'#ffffff';applyTextBorderStyle(el);}
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
  }else if(d.type==='code'){
    // will call renderCodeEl after el.append
  }else if(d.type==='markdown'){
    c.classList.add('md-el');
    c.style.cssText=`width:100%;height:100%;overflow:auto;padding:14px 16px;box-sizing:border-box;line-height:1.65;font-size:${d.mdFs||16}px;`;
    c.innerHTML=d.mdHtml||markdownToHtml(d.mdRaw||'');
  }else if(d.type==='shape'){
    const wrap=document.createElement('div');wrap.className='sel-el';
    const svgDiv=document.createElement('div');svgDiv.className='shape-svg';svgDiv.style.cssText='position:absolute;inset:0;';
    svgDiv.innerHTML=buildShapeSVG(d,d.w,d.h);
    // Enable pixel-perfect clicks on SVG shape (not bounding box)
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
    const txt=document.createElement('div');txt.className='shape-text';
    txt.setAttribute('style',d.shapeTextCss||'font-size:24px;font-weight:700;color:#ffffff;text-align:center;');
    txt.innerHTML=d.shapeHtml||'';
    txt.addEventListener('dblclick',()=>{txt.contentEditable='true';txt.style.pointerEvents='auto';txt.focus();});
    txt.addEventListener('blur',()=>{txt.contentEditable='false';txt.style.pointerEvents='none';commitAll();});
    txt.addEventListener('input',save);
    wrap.append(svgDiv,txt);c.appendChild(wrap);
    el.dataset.shape=d.shape;el.dataset.fill=d.fill||'#3b82f6';el.dataset.stroke=d.stroke||'#1d4ed8';
    el.dataset.sw=d.sw!=null?d.sw:2;el.dataset.rx=d.rx||0;el.dataset.fillOp=d.fillOp!=null?d.fillOp:1;
    el.dataset.shadow=d.shadow||false;el.dataset.shadowBlur=d.shadowBlur||8;el.dataset.shadowColor=d.shadowColor||'#000000';
  }else if(d.type==='svg'){
    c.style.cssText='width:100%;height:100%;overflow:visible;';c.innerHTML=d.svgContent||'';
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
    // Always rebuild SVG from params so shadow/color/style are always correct
    const _mkIc=typeof ICONS!=='undefined'?ICONS.find(function(x){return x.id===d.iconId;}):null;
    // Coerce shadow to boolean (may come as string "true"/"false" from dataset or JSON)
    const _mkShadow=d.shadow===true||d.shadow==='true';
    const _mkSvg=(_mkIc&&typeof _buildIconSVG==='function')
      ?_buildIconSVG(_mkIc,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle||'stroke',_mkShadow,d.shadowBlur,d.shadowColor)
      :(d.svgContent||'');
    c.innerHTML=_mkSvg;
    const svgEl2=c.querySelector('svg');
    if(svgEl2){svgEl2.style.width='100%';svgEl2.style.height='100%';}
    el.dataset.iconId=d.iconId||'';
    el.dataset.iconColor=d.iconColor||'#3b82f6';
    el.dataset.iconSw=d.iconSw!=null?d.iconSw:1.8;
    el.dataset.iconStyle=d.iconStyle||'stroke';
    el.dataset.shadow=_mkShadow;
    el.dataset.shadowBlur=d.shadowBlur||8;
    el.dataset.shadowColor=d.shadowColor||'#000000';
    }else if(d.type==='applet'){
    const wrap=document.createElement('div');wrap.className='applet-el';
    const iframe=document.createElement('iframe');iframe.srcdoc=d.appletHtml||'<p>Applet</p>';
    iframe.style.cssText='width:100%;height:100%;border:none;background:transparent;';
    iframe.setAttribute('allowtransparency','true');
    iframe.sandbox='allow-scripts allow-same-origin';
    const tog=document.createElement('button');tog.className='applet-toggle';tog.textContent='Interact';
    tog.onclick=(ev)=>{ev.stopPropagation();wrap.classList.toggle('interactive');tog.textContent=wrap.classList.contains('interactive')?'Done':'Interact';};
    wrap.append(iframe,tog);c.appendChild(wrap);
    el.dataset.appletId=d.appletId||'';
    el.dataset.appletHtml=d.appletHtml||'';
    if(d._appletAspect)el.dataset.appletAspect=d._appletAspect;
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
  if(d.valign&&d.type==='text'&&typeof applyTextVAlign==='function')applyTextVAlign(el,d.valign);
  if(d.type==='code')renderCodeEl(el,d);
  if(d.type==='image')applyImgStyles(el,d);
  if(d.type==='table'&&typeof renderTableEl==='function'){if(typeof _tblSaveToDataset==='function')_tblSaveToDataset(el,d);renderTableEl(el,d);if(typeof _tblAttachResizeObs==='function')_tblAttachResizeObs(el,d);}
  // Restore elOpacity for all element types
  if(d.elOpacity!=null&&+d.elOpacity!==1){el.dataset.elOpacity=d.elOpacity;el.style.opacity=d.elOpacity;}
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
        el.style.left=(_ol+e2.clientX-_ox)+'px';
        el.style.top=(_ot+e2.clientY-_oy)+'px';
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
  mkDrag(el,c);
  el.addEventListener('mousedown',ev=>{
    if(el.dataset.editing==='true')return; // let text editing handle it
    const cn=ev.target.className||'';
    if(typeof cn==='string'&&(cn.includes('rh')||cn.includes('db')))return;
    if(ev.target.closest&&(ev.target.closest('.applet-el')&&ev.target.closest('.interactive')))return;
    // For shapes: only pick if clicking on actual SVG shape fill, not empty bounding box area
    if(d.type==='shape'&&!el.classList.contains('sel')){
      const isSvgPart=ev.target.tagName==='path'||ev.target.tagName==='rect'||
        ev.target.tagName==='ellipse'||ev.target.tagName==='circle'||
        ev.target.tagName==='polygon'||ev.target.tagName==='polyline';
      if(!isSvgPart&&!ev.target.closest('.shape-text')&&!ev.target.closest('.rh'))return;
    }
    ev.stopPropagation();
    // If element is already part of multi-selection, don't reset the group
    if(multiSel.size>1&&multiSel.has(el)&&!ev.shiftKey)return;
    pickMulti(el,ev.shiftKey);
  });
  // Resize observer for shapes
  if(d.type==='shape'){
    const ro=new ResizeObserver(()=>{const dd=slides[cur]&&slides[cur].els.find(x=>x.id===el.dataset.id);if(dd)renderShapeEl(el,dd);});
    ro.observe(el);
  }
}
function pick(el){
  // Clear table cell selection when leaving a table
  if(sel&&sel.dataset.type==='table'&&sel!==el&&typeof tblClearSel==='function') tblClearSel();
  // Exit text editing on previously selected element - force blur to trigger save
  if(sel&&sel.dataset.editing==='true'){
    const c=sel.querySelector('.tel');
    if(c){c.contentEditable='false';c.blur();}
    delete sel.dataset.editing;sel.style.cursor='';
    commitAll();
  }
  if(sel)sel.classList.remove('sel');
  sel=el;
  if(el)el.classList.add('sel');
  syncProps();
  if(document.getElementById('anim-panel').classList.contains('open'))renderAnimPanel();
}
function desel(){clearGuides();pick(null);}
