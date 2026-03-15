// ══════════════ SHAPES ══════════════
function _smSyncGalleryColor(color){
  document.querySelectorAll('#shape-gallery .sg-fill').forEach(el=>el.setAttribute('fill',color));
}
function editShapeText(){
  if(!sel||sel.dataset.type!=='shape')return;
  const txt=sel.querySelector('.shape-text');
  if(!txt)return;
  txt.contentEditable='true';txt.style.pointerEvents='auto';txt.focus();
  const range=document.createRange();range.selectNodeContents(txt);range.collapse(false);
  const sel2=window.getSelection();sel2.removeAllRanges();sel2.addRange(range);
}

function openShapeModalReplace(){
  if(!sel||sel.dataset.type!=='shape')return;
  window._shapeReplaceMode=true;
  // Предзаполняем модалку настройками текущей фигуры
  const _d=slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(_d){
    window._shapeReplaceSource={
      fill:_d.fill, stroke:_d.stroke, sw:_d.sw,
      fillOp:_d.fillOp, shadow:_d.shadow, shadowBlur:_d.shadowBlur, shadowColor:_d.shadowColor,
      shapeHtml:_d.shapeHtml, shapeTextCss:_d.shapeTextCss,
      rx:_d.rx, rot:_d.rot, anims:_d.anims,
      x:_d.x, y:_d.y, w:_d.w, h:_d.h,
      elOpacity:_d.elOpacity, shadow2:_d.shadow2,
    };
  }
  openShapeModal();
  // Перезаписываем цвета в модалке — из текущей фигуры
  if(_d){
    const fillEl=document.getElementById('sm-fill');
    const strokeEl=document.getElementById('sm-stroke');
    const swEl=document.getElementById('sm-sw');
    if(fillEl){fillEl.value=_d.fill||fillEl.value;document.getElementById('sm-fill-inner').style.background=_d.fill||'';}
    if(strokeEl){strokeEl.value=_d.stroke||strokeEl.value;document.getElementById('sm-stroke-inner').style.background=_d.stroke||'';}
    if(swEl&&_d.sw!==undefined)swEl.value=_d.sw;
  }
}

function openShapeModal(){
  // Pre-fill colors from current theme
  let fillColor='#3b82f6', strokeColor='#1d4ed8';
  if(appliedThemeIdx>=0&&appliedThemeIdx<THEMES.length){
    const t=THEMES[appliedThemeIdx];
    fillColor=t.shapeFill||fillColor;
    strokeColor=t.shapeStroke||strokeColor;
  }
  const fillEl=document.getElementById('sm-fill');
  const strokeEl=document.getElementById('sm-stroke');
  if(fillEl)fillEl.value=fillColor;
  if(strokeEl)strokeEl.value=strokeColor;
  const fi=document.getElementById('sm-fill-inner');
  const si=document.getElementById('sm-stroke-inner');
  if(fi)fi.style.background=fillColor;
  if(si)si.style.background=strokeColor;
  buildShapeGallery();
  document.getElementById('shape-modal').classList.add('open');
}
function insertShapeSelected(){
  const sh=SHAPES.find(s=>s.id===selShape)||SHAPES[0];
  const fill=document.getElementById('sm-fill').value;
  const stroke=document.getElementById('sm-stroke').value;
  const sw=+document.getElementById('sm-sw').value;
  // Replace mode — just change shape id on existing element
  if(window._shapeReplaceMode&&sel&&sel.dataset.type==='shape'){
    window._shapeReplaceMode=false;
    pushUndo();
    const d=slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d){
      // Наследуем все настройки из источника, меняем только форму
      const src=window._shapeReplaceSource||{};
      d.shape=sh.id;
      // Цвета: из модалки если пользователь их менял, иначе из оригинала
      d.fill=fill; d.stroke=stroke; d.sw=sw;
      // Все остальные свойства — из оригинала
      if(src.fillOp!==undefined)d.fillOp=src.fillOp;
      if(src.shadow!==undefined)d.shadow=src.shadow;
      if(src.shadowBlur!==undefined)d.shadowBlur=src.shadowBlur;
      if(src.shadowColor!==undefined)d.shadowColor=src.shadowColor;
      if(src.shapeHtml!==undefined)d.shapeHtml=src.shapeHtml;
      if(src.shapeTextCss!==undefined)d.shapeTextCss=src.shapeTextCss;
      if(src.elOpacity!==undefined)d.elOpacity=src.elOpacity;
      // Для callout — добавляем хвост если нет
      const _replIsCallout=sh.special==='callout';
      if(_replIsCallout&&d.tailX===undefined){d.tailX=0;d.tailY=(d.h||200)/2+30;d.rx=d.rx||12;}
      sel.dataset.shape=sh.id;
      const svgDiv=sel.querySelector('.ec>div>div');
      if(svgDiv)svgDiv.innerHTML=buildShapeSVG(d,d.w,d.h);
      _applyShapeClipPath(sel,d);
      window._shapeReplaceSource=null;
      save();drawThumbs();saveState();
    }
    document.getElementById('shape-modal').classList.remove('open');
    return;
  }
  window._shapeReplaceMode=false;
  pushUndo();
  const _isCallout=sh.special==='callout';
  const d={id:'e'+(++ec),type:'shape',x:snapV(200),y:snapV(150),w:snapV(200),h:snapV(200),
    shape:sh.id,fill,stroke,sw,rx:_isCallout?12:0,fillOp:1,shadow:false,shadowBlur:8,shadowColor:'#000000',
    shapeHtml:'',shapeTextCss:'font-size:24px;font-weight:700;color:#ffffff;text-align:center;',
    tailX:_isCallout?0:undefined,tailY:_isCallout?130:undefined,rot:0,anims:[]};
  slides[cur].els.push(d);mkEl(d);save();drawThumbs();saveState();
  document.getElementById('shape-modal').classList.remove('open');
}

// Build SVG path for shape
// Generate callout SVG path dynamically
// tailX/tailY: tip position in element coords (default: bottom-center + offset)
function _buildCalloutSVGPath(d,w,h,sh,fillAttr,strokeAttr,shadow,margin){
  const rx=d.rx||0;
  const sw=d.sw!==undefined?+d.sw:2;
  const bx=margin,by=margin,bw=Math.max(1,w-margin*2),bh=Math.max(1,h-margin*2);
  const cx=bx+bw/2, cy=by+bh/2;
  const L=bx,T=by,R2=bx+bw,B=by+bh;
  const r=Math.min(rx, bw/2, bh/2);
  const _=n=>Math.round(n*10)/10;

  const tipX=_(w/2+(d.tailX!==undefined?+d.tailX:0));
  const tipY=_(h/2+(d.tailY!==undefined?+d.tailY:h/2+30));
  const ang=Math.atan2(tipY-cy, tipX-cx);
  const tw=Math.max(16, Math.min(bw,bh)*0.14);

  // Find point on rounded-rect border at given angle from center
  function borderPt(a){
    const dx=Math.cos(a), dy=Math.sin(a);
    let best=null,bestT=Infinity;
    function tryT(t){if(t>1e-6&&t<bestT){bestT=t;best={x:cx+dx*t,y:cy+dy*t};}}
    if(Math.abs(dy)>1e-9){tryT((T+r-cy)/dy);tryT((B-r-cy)/dy);}
    if(Math.abs(dx)>1e-9){tryT((L+r-cx)/dx);tryT((R2-r-cx)/dx);}
    [{qx:L+r,qy:T+r},{qx:R2-r,qy:T+r},{qx:R2-r,qy:B-r},{qx:L+r,qy:B-r}].forEach(({qx,qy})=>{
      const fx=cx-qx,fy=cy-qy,a2=dx*dx+dy*dy;
      const b2=2*(fx*dx+fy*dy),cv=fx*fx+fy*fy-r*r,disc=b2*b2-4*a2*cv;
      if(disc>=0){const sq=Math.sqrt(disc);[(-b2+sq)/(2*a2),(-b2-sq)/(2*a2)].forEach(tryT);}
    });
    return best||{x:cx+dx*bw/2,y:cy+dy*bh/2};
  }

  // Base center and its distance from element center
  const baseC=borderPt(ang);
  const baseDist=Math.sqrt((baseC.x-cx)**2+(baseC.y-cy)**2);

  // Spread b1/b2 by angular offset so arc-length ≈ tw regardless of radius
  const angOffset=Math.atan2(tw, baseDist);
  const b1=borderPt(ang+angOffset);
  const b2=borderPt(ang-angOffset);

  // Push base points slightly inward to cover stroke gap
  const inset=sw/2+0.5;
  function pushIn(p){
    const ddx=cx-p.x,ddy=cy-p.y,len=Math.sqrt(ddx*ddx+ddy*ddy)||1;
    return{x:_(p.x+ddx/len*inset),y:_(p.y+ddy/len*inset)};
  }
  const bi1=pushIn(b1), bi2=pushIn(b2);

  const rectPath=r>0
    ?`M ${_(L+r)} ${_(T)} H ${_(R2-r)} Q ${_(R2)} ${_(T)} ${_(R2)} ${_(T+r)} V ${_(B-r)} Q ${_(R2)} ${_(B)} ${_(R2-r)} ${_(B)} H ${_(L+r)} Q ${_(L)} ${_(B)} ${_(L)} ${_(B-r)} V ${_(T+r)} Q ${_(L)} ${_(T)} ${_(L+r)} ${_(T)} Z`
    :`M ${_(L)} ${_(T)} H ${_(R2)} V ${_(B)} H ${_(L)} Z`;

  const tailPath=`M ${_(bi1.x)} ${_(bi1.y)} L ${_(tipX)} ${_(tipY)} L ${_(bi2.x)} ${_(bi2.y)} Z`;
  return `<g ${shadow}><path d="${rectPath}" ${fillAttr} ${strokeAttr}/><path d="${tailPath}" ${fillAttr} stroke="none"/></g>`;
}

function buildShapeSVG(d,w,h){
  const sh=SHAPES.find(s=>s.id===d.shape)||SHAPES[0];
  const op=d.fillOp===undefined?1:+d.fillOp;
  const fill=d.fill||'#3b82f6';
  const sw=d.sw===undefined?2:+d.sw;
  const strokeAttr=sw>0?`stroke="${d.stroke||'#1d4ed8'}" stroke-width="${sw}"`:`stroke="none"`;
  const margin=sw>0?sw:0;
  const ew=Math.max(1,w-margin*2);const eh=Math.max(1,h-margin*2);
  const shadow=d.shadow?`filter="url(#sh_${d.id})"`:'';
  const fillAttr=`fill="${fill}" fill-opacity="${op}"`;
  let shapeDef='';
  if(sh.special==='rect')shapeDef=`<rect x="${margin}" y="${margin}" width="${ew}" height="${eh}" rx="${d.rx||0}" ${fillAttr} ${strokeAttr} ${shadow}/>`;
  else if(sh.special==='ellipse')shapeDef=`<ellipse cx="${w/2}" cy="${h/2}" rx="${ew/2}" ry="${eh/2}" ${fillAttr} ${strokeAttr} ${shadow}/>`;
  else if(sh.special==='callout'){shapeDef=_buildCalloutSVGPath(d,w,h,sh,fillAttr,strokeAttr,shadow,margin);}
  else{
    const sx=ew/90,sy=eh/90;
    const scaledPath=sh.path.replace(/(-?\d+(?:\.\d+)?)/g,(m,v,off,str)=>{
      const before=str.slice(0,off);const nums=(before.match(/(-?\d+(?:\.\d+)?)/g)||[]).length;
      return nums%2===0?String(Math.round((+v-5)*sx+margin)):String(Math.round((+v-5)*sy+margin));
    });
    shapeDef=`<path d="${scaledPath}" ${fillAttr} ${strokeAttr} ${shadow}/>`;
  }
  let filterDef='';
  if(d.shadow){
    const sc=d.shadowColor||'#000000';const sb=d.shadowBlur||8;
    // Expand filter region proportionally to blur so shadow isn't clipped
    const pad=Math.max(30, Math.ceil(sb*3));
    filterDef=`<defs><filter id="sh_${d.id}" x="-${pad}%" y="-${pad}%" width="${100+pad*2}%" height="${100+pad*2}%"><feDropShadow dx="3" dy="3" stdDeviation="${sb}" flood-color="${sc}" flood-opacity="0.6"/></filter></defs>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible">${filterDef}${shapeDef}</svg>`;
}

// Returns CSS clip-path string matching the shape, for use with backdrop-filter
function _shapeClipPath(d, w, h) {
  const sh = SHAPES.find(s => s.id === d.shape) || SHAPES[0];
  const sw = d.sw === undefined ? 2 : +d.sw;
  const m = sw > 0 ? sw : 0;
  if (sh.special === 'rect')    return `inset(${m}px)`;
  if (sh.special === 'ellipse') return `ellipse(${(w-m*2)/2}px ${(h-m*2)/2}px at 50% 50%)`;
  if (sh.special === 'callout') return 'none'; // callout uses full bounding box (tail extends outside)
  // Polygon shapes — scale path points from 0-100 space to actual px
  if (sh.path) {
    const ew = Math.max(1, w - m * 2), eh = Math.max(1, h - m * 2);
    const sx = ew / 90, sy = eh / 90;
    // Extract polygon points from path (works for simple M/L/Z paths)
    const pts = [];
    const re = /[ML]\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/g;
    let match;
    while ((match = re.exec(sh.path)) !== null) {
      const px = Math.round((+match[1] - 5) * sx + m);
      const py = Math.round((+match[2] - 5) * sy + m);
      pts.push(`${px}px ${py}px`);
    }
    if (pts.length >= 3) return `polygon(${pts.join(', ')})`;
  }
  return 'none';
}

// Applies or removes backdrop-filter blur overlay matching shape clip-path
function _applyShapeBlur(el) {
  // Remove existing blur overlay
  const old = el.querySelector('.shape-blur-overlay');
  if (old) old.remove();
  // Clear any direct backdrop-filter on el
  el.style.backdropFilter = '';
  el.style.webkitBackdropFilter = '';

  const blur = parseFloat(el.dataset.shapeBlur || 0);
  if (blur <= 0) return;

  const d = sel && sel === el
    ? (slides[cur] && slides[cur].els.find(x => x.id === el.dataset.id))
    : (slides[cur] && slides[cur].els.find(x => x.id === el.dataset.id));
  if (!d) return;

  const w = parseInt(el.style.width) || d.w;
  const h = parseInt(el.style.height) || d.h;
  const cp = _shapeClipPath(d, w, h);

  const overlay = document.createElement('div');
  overlay.className = 'shape-blur-overlay';
  overlay.style.cssText = (
    'position:absolute;inset:0;pointer-events:none;z-index:0;' +
    `backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px);` +
    (cp !== 'none' ? `clip-path:${cp};-webkit-clip-path:${cp};` : '')
  );
  el.insertBefore(overlay, el.firstChild);
}

// Apply hit-area overlay with clip-path so clicks outside shape pass through
function _applyShapeClipPath(el, d) {
  // Remove old hit overlay
  const old = el.querySelector('.shape-hit-area');
  if (old) old.remove();
  // Clear any direct clip-path on el (visual content must not be clipped)
  el.style.clipPath = '';
  el.style.webkitClipPath = '';

  const w = parseInt(el.style.width) || d.w;
  const h = parseInt(el.style.height) || d.h;
  const cp = _shapeClipPath(d, w, h);
  if (cp === 'none') return;

  // Transparent div covering el with clip-path — captures pointer events only within shape
  const hit = document.createElement('div');
  hit.className = 'shape-hit-area';
  hit.style.cssText = (
    'position:absolute;inset:0;z-index:10;pointer-events:auto;cursor:move;' +
    'clip-path:' + cp + ';-webkit-clip-path:' + cp + ';' +
    'background:transparent;'
  );
  el.appendChild(hit);
  // Outside hit area — pass through to elements below
  el.style.pointerEvents = 'none';
}
function renderShapeEl(el,d){
  const w=parseInt(el.style.width),h=parseInt(el.style.height);
  const c=el.querySelector('.sel-el');if(!c)return;
  const svgDiv=c.querySelector('.shape-svg');
  if(svgDiv){
    svgDiv.innerHTML=buildShapeSVG(d,w,h);
    const svgEl=svgDiv.querySelector('svg');
    if(svgEl){
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
  if(prop==='fill'){d.fill=val;sel.dataset.fill=val;}
  else if(prop==='stroke'){d.stroke=val;sel.dataset.stroke=val;}
  else if(prop==='sw'){d.sw=+val;sel.dataset.sw=val;}
  else if(prop==='rx'){d.rx=+val;sel.dataset.rx=val;}
  else if(prop==='fillOp'){d.fillOp=+val;sel.dataset.fillOp=val;}
  else if(prop==='shadow'){d.shadow=val;sel.dataset.shadow=val;}
  else if(prop==='shadowBlur'){d.shadowBlur=+val;sel.dataset.shadowBlur=val;}
  else if(prop==='shadowColor'){d.shadowColor=val;sel.dataset.shadowColor=val;}
  renderShapeEl(sel,d);save();drawThumbs();saveState();
}
function updateShapeStyleScheme(prop, val, schemeRef) {
  if(sel && slides[cur]) {
    const d = slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d) {
      if(prop==='fill') { d.fillScheme = schemeRef || null; d.fill = val; sel.dataset.fill = val; }
      else if(prop==='stroke') { d.strokeScheme = schemeRef || null; d.stroke = val; sel.dataset.stroke = val; }
      console.log('[DBG schemeRef] prop='+prop+' val='+val+' schemeRef='+JSON.stringify(schemeRef)+' d.fillScheme='+JSON.stringify(d.fillScheme));
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
function updateShapeTextColor(v){
  if(!sel||sel.dataset.type!=='shape')return;
  const st=sel.querySelector('.shape-text');if(!st)return;
  let cs=st.getAttribute('style')||'';cs=cs.replace(/color:[^;]+;?/,'')+'color:'+v+';';
  st.setAttribute('style',cs);
  try{document.getElementById('sh-tc-hex').value=v;}catch(e){}
  save();saveState();
}
function updateShapeTextStyle(prop,val){
  if(!sel||sel.dataset.type!=='shape')return;
  const st=sel.querySelector('.shape-text');if(!st)return;
  let cs=st.getAttribute('style')||'';
  cs=cs.replace(new RegExp(prop+':[^;]+;?','i'),'')+prop+':'+val+';';
  st.setAttribute('style',cs);save();saveState();
}

// ══════════════ SVG ══════════════
function openSVGModal(){document.getElementById('svg-modal').classList.add('open');}
function loadSVGFile(e){
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();r.onload=ev=>{document.getElementById('svg-code').value=ev.target.result;};
  r.readAsText(f);
}
function insertSVG(){
  const code=document.getElementById('svg-code').value.trim();if(!code)return toast('Paste SVG code');
  if(!code.includes('<svg'))return toast('Invalid SVG');
  pushUndo();
  const d={id:'e'+(++ec),type:'svg',x:snapV(100),y:snapV(100),w:snapV(300),h:snapV(300),svgContent:code,rot:0,anims:[]};
  slides[cur].els.push(d);mkEl(d);save();drawThumbs();saveState();
  document.getElementById('svg-modal').classList.remove('open');
  document.getElementById('svg-code').value='';
}
