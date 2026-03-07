// ══════════════ SHAPES ══════════════
function openShapeModal(){
  // Pre-fill colors from current theme
  if(appliedThemeIdx>=0&&appliedThemeIdx<THEMES.length){
    const t=THEMES[appliedThemeIdx];
    const fillEl=document.getElementById('sm-fill');
    const strokeEl=document.getElementById('sm-stroke');
    if(fillEl)fillEl.value=t.shapeFill||'#3b82f6';
    if(strokeEl)strokeEl.value=t.shapeStroke||'#1d4ed8';
  }
  document.getElementById('shape-modal').classList.add('open');
}
function insertShapeSelected(){
  const sh=SHAPES.find(s=>s.id===selShape)||SHAPES[0];
  const fill=document.getElementById('sm-fill').value;
  const stroke=document.getElementById('sm-stroke').value;
  const sw=+document.getElementById('sm-sw').value;
  pushUndo();
  const d={id:'e'+(++ec),type:'shape',x:snapV(200),y:snapV(150),w:snapV(200),h:snapV(200),
    shape:sh.id,fill,stroke,sw,rx:sh.id==='rounded'?15:0,fillOp:1,shadow:false,shadowBlur:8,shadowColor:'#000000',
    shapeHtml:'',shapeTextCss:'font-size:24px;font-weight:700;color:#ffffff;text-align:center;',rot:0,anims:[]};
  slides[cur].els.push(d);mkEl(d);save();drawThumbs();saveState();
  document.getElementById('shape-modal').classList.remove('open');
}

// Build SVG path for shape
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
  else if(sh.special==='rounded')shapeDef=`<rect x="${margin}" y="${margin}" width="${ew}" height="${eh}" rx="${d.rx||15}" ${fillAttr} ${strokeAttr} ${shadow}/>`;
  else if(sh.special==='ellipse')shapeDef=`<ellipse cx="${w/2}" cy="${h/2}" rx="${ew/2}" ry="${eh/2}" ${fillAttr} ${strokeAttr} ${shadow}/>`;
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
  if (sh.special === 'rounded') return `inset(${m}px round ${d.rx || 15}px)`;
  if (sh.special === 'ellipse') return `ellipse(${(w-m*2)/2}px ${(h-m*2)/2}px at 50% 50%)`;
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
  el.style.position = 'relative';
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
