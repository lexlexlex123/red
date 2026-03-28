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
  const _insertFill = sh.noFill ? 'none' : fill;
  const d={id:'e'+(++ec),type:'shape',x:snapV((canvasW-200)/2),y:snapV((canvasH-200)/2),w:snapV(200),h:snapV(200),
    shape:sh.id,fill:_insertFill,stroke,sw,rx:_isCallout?12:0,fillOp:1,shadow:false,shadowBlur:8,shadowColor:'#000000',
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

function _getStrokeDasharray(style, sw) {
  if (!style || style === 'solid') return '';
  if (style === 'dashed') return `stroke-dasharray="${sw*4} ${sw*3}"`;
  if (style === 'dotted') return `stroke-dasharray="${sw} ${sw*3}" stroke-linecap="round"`;
  return '';
}

// Returns {dasharray, pathLength, extraAttrs} for even dot/dash distribution
// perimeter: actual contour length; sw: stroke width; style: 'dotted'|'dashed'
function _evenDash(style, sw, perimeter) {
  if (!perimeter || perimeter < 1) return null;
  const dot  = sw;        // dot diameter
  const gap  = sw * 3;    // gap between dots (wider for better look)
  const period = dot + gap;
  // Round to nearest whole number of dots so they distribute evenly
  const n = Math.max(1, Math.round(perimeter / period));
  // Set pathLength so that n*(dot+gap) == pathLength
  // Browser will stretch/compress evenly around the path
  const pl = n * period;
  if (style === 'dotted') {
    return {
      pathLength: pl.toFixed(2),
      dasharray: `${dot} ${gap}`,
      extraAttrs: `stroke-linecap="round" pathLength="${pl.toFixed(2)}"`
    };
  }
  if (style === 'dashed') {
    const dash = sw * 4, dgap = sw * 3;
    const periodD = dash + dgap;
    const nD = Math.max(1, Math.round(perimeter / periodD));
    const plD = nD * periodD;
    return {
      pathLength: plD.toFixed(2),
      dasharray: `${dash} ${dgap}`,
      extraAttrs: `pathLength="${plD.toFixed(2)}"`
    };
  }
  return null;
}

// Compute perimeter of shape given type and dimensions
function _shapePerimeter(sh, w, h, m) {
  const ew = Math.max(1, w - m*2), eh = Math.max(1, h - m*2);
  if (sh.special === 'ellipse') {
    // Ramanujan approximation
    const a = ew/2, b = eh/2;
    return Math.PI * (3*(a+b) - Math.sqrt((3*a+b)*(a+3*b)));
  }
  if (sh.special === 'rect') {
    return 2*(ew + eh);
  }
  // For polygon shapes: sum of edge lengths
  if (!sh.path) return 2*(ew+eh);
  const sx = ew/90, sy = eh/90;
  const pts = [];
  const re = /[ML]\s*([-\d.]+)[,\s]+([-\d.]+)/g;
  let match;
  while ((match = re.exec(sh.path)) !== null) {
    pts.push({x: (parseFloat(match[1])-5)*sx + m, y: (parseFloat(match[2])-5)*sy + m});
  }
  let perim = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i+1)%pts.length];
    perim += Math.hypot(b.x-a.x, b.y-a.y);
  }
  return perim;
}

// ── Continuous wave/zigzag path along an arbitrary SVG path ──────
// Samples the path at equal arc-length intervals and builds
// a Bezier wave or zigzag that flows continuously across corners.
function _complexPathWave(svgPathStr, style, sw) {
  if (typeof document === 'undefined') return null;
  try {
    const tmpSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tmpSvg.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:1px;height:1px;';
    document.body.appendChild(tmpSvg);
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', svgPathStr);
    tmpSvg.appendChild(p);
    const totalLen = p.getTotalLength();
    document.body.removeChild(tmpSvg);
    if (totalLen < 1) return null;

    // Step size — one full wave = 2 half-steps
    const halfStep = style === 'wave' ? sw * 3.5 : sw * 2.5;
    const amp = sw * 0.85;

    // Number of half-steps — always even so wave closes at start point
    let nHalf = Math.max(4, Math.round(totalLen / halfStep));
    if (nHalf % 2 !== 0) nHalf++;
    const actualHalf = totalLen / nHalf;

    // Sample points: one per half-step boundary + midpoints for Bezier
    // For each half-step i: we go from t_i to t_{i+1}, peak at midpoint
    const pts = [];
    for (let i = 0; i <= nHalf; i++) {
      const l = Math.min(totalLen, actualHalf * i);
      const pt = p.getPointAtLength(l);
      pts.push({ x: pt.x, y: pt.y });
    }

    // Also sample midpoints for control points
    const mids = [];
    for (let i = 0; i < nHalf; i++) {
      const l = actualHalf * i + actualHalf * 0.5;
      const pt = p.getPointAtLength(Math.min(totalLen, l));
      mids.push({ x: pt.x, y: pt.y });
    }

    // Build path: each half-step alternates outward/inward
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} `;
    for (let i = 0; i < nHalf; i++) {
      const a = pts[i], b = pts[i + 1], m = mids[i];
      const side = (i % 2 === 0) ? 1 : -1;
      // Normal at midpoint: perpendicular to segment a→b
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const nx = len > 0 ? -dy / len : 0;
      const ny = len > 0 ?  dx / len : 1;
      const cpx = (m.x + nx * amp * side).toFixed(2);
      const cpy = (m.y + ny * amp * side).toFixed(2);
      if (style === 'wave') {
        d += `Q ${cpx} ${cpy} ${b.x.toFixed(2)} ${b.y.toFixed(2)} `;
      } else {
        // Zigzag: two straight lines through peak
        d += `L ${cpx} ${cpy} L ${b.x.toFixed(2)} ${b.y.toFixed(2)} `;
      }
    }
    // Close back to start
    d += 'Z';
    return d;
  } catch(e) {
    console.warn('[wave] error:', e);
    return null;
  }
}

// Rounds polygon corners like Adobe Illustrator using cubic Bezier curves.
// Both convex and concave corners are rounded — control points sit AT the vertex,
// creating smooth tangent-continuous curves on both sides.
function _roundedPolygonPath(pts, rx) {
  const n = pts.length;
  if (n < 3 || rx <= 0) {
    return pts.map((p,i)=>(i===0?'M ':'L ')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join(' ')+' Z';
  }

  // Precompute anchor points (p1, p2) and control points (vertex) for every corner
  const corners = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i-1+n)%n];
    const curr = pts[i];
    const next = pts[(i+1)%n];

    const e1x = prev.x-curr.x, e1y = prev.y-curr.y; // toward prev
    const e2x = next.x-curr.x, e2y = next.y-curr.y; // toward next
    const len1 = Math.hypot(e1x, e1y);
    const len2 = Math.hypot(e2x, e2y);
    if (len1 < 0.001 || len2 < 0.001) { corners.push(null); continue; }

    const u1x = e1x/len1, u1y = e1y/len1; // unit toward prev
    const u2x = e2x/len2, u2y = e2y/len2; // unit toward next

    // Angle between the two edges at this vertex
    const dot = u1x*u2x + u1y*u2y;
    const cosA = Math.max(-1, Math.min(1, dot));
    const halfAngle = Math.acos(cosA) / 2;

    // Limit r so arcs from adjacent corners don't overlap
    const r = Math.min(rx, len1/2, len2/2);

    // Anchor points on edges at distance r from vertex
    const p1x = curr.x + u1x*r, p1y = curr.y + u1y*r; // on incoming edge
    const p2x = curr.x + u2x*r, p2y = curr.y + u2y*r; // on outgoing edge

    // Bezier control point weight: k = (4/3)*tan(angle/4)
    // This gives the cubic bezier that best approximates a circular arc
    // k controls how far control points pull toward the vertex
    // Standard arc approximation: (4/3)*tan(θ/4). Use max(k,0.55) for rounder feel.
    const kCalc = (4/3) * Math.tan(halfAngle / 2);
    const k = Math.max(kCalc, 0.55);
    const cp1x = p1x - u1x * r * k, cp1y = p1y - u1y * r * k; // cp toward vertex
    const cp2x = p2x - u2x * r * k, cp2y = p2y - u2y * r * k; // cp toward vertex

    corners.push({ p1x, p1y, p2x, p2y, cp1x, cp1y, cp2x, cp2y });
  }

  // Build path: for each corner emit L p1, C cp1 cp2 p2
  // The L connects p2 of previous corner to p1 of current corner (straight edge segment)
  let d = '';
  let started = false;
  for (let i = 0; i < n; i++) {
    const c = corners[i];
    if (!c) continue;
    if (!started) {
      d += `M ${c.p1x.toFixed(2)} ${c.p1y.toFixed(2)} `;
      started = true;
    } else {
      d += `L ${c.p1x.toFixed(2)} ${c.p1y.toFixed(2)} `;
    }
    // Cubic bezier through the corner
    d += `C ${c.cp1x.toFixed(2)} ${c.cp1y.toFixed(2)} ${c.cp2x.toFixed(2)} ${c.cp2y.toFixed(2)} ${c.p2x.toFixed(2)} ${c.p2y.toFixed(2)} `;
  }
  d += 'Z';
  return d;
}

// Extract polygon points from a simple M/L/Z SVG path string
function _extractPolygonPts(pathStr) {
  const pts = [];
  const re = /[MLml]\s*([-\d.]+)[,\s]+([-\d.]+)/g;
  let m;
  while ((m = re.exec(pathStr)) !== null) {
    pts.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
  }
  return pts;
}


function buildShapeSVG(d, w, h) {
  const sh = SHAPES.find(s => s.id === d.shape) || SHAPES[0];
  const op = d.fillOp === undefined ? 1 : +d.fillOp;
  // noFill shapes (line, wave) always render without fill
  const _noFill = sh.noFill || false;
  const fill = _noFill ? 'none' : ((d.fill && d.fill !== 'none') ? d.fill : (d.fill === 'none' ? 'none' : '#3b82f6'));
  const hasFill = fill !== 'none';
  const sw = d.sw === undefined ? 2 : +d.sw;
  const strokeColor = d.stroke || '#1d4ed8';
  const strokeStyle = d.strokeStyle || 'solid';
  const isComplex = strokeStyle === 'wave' || strokeStyle === 'zigzag';
  const isDouble  = strokeStyle === 'double';
  // margin for non-complex: stroke sits centred on shape edge
  const margin = (!isComplex && sw > 0) ? sw / 2 : 0;
  const shadow = d.shadow ? `filter="url(#sh_${d.id})"` : '';
  // op applied as SVG opacity so both fill AND stroke are transparent together
  const fillAttr = hasFill ? `fill="${fill}"` : 'fill="none"';

  // ── shape geometry helpers ──────────────────────────────────────

  // Returns SVG element string for a given margin
  function shapeEl(fAttr, sAttr, m, extra = '') {
    const ew = Math.max(1, w - m * 2), eh = Math.max(1, h - m * 2);
    if (sh.special === 'rect')
      return `<rect x="${m}" y="${m}" width="${ew}" height="${eh}" rx="${d.rx||0}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
    if (sh.special === 'ellipse')
      return `<ellipse cx="${w/2}" cy="${h/2}" rx="${ew/2}" ry="${eh/2}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
    if (sh.special === 'callout') return null;
    // Scale path points and apply corner rounding
    const sx = ew/90, sy = eh/90;
    const rawPath = sh.path.replace(/(-?\d+(?:\.\d+)?)/g, (_, v, off, str) => {
      const nums = (str.slice(0, off).match(/(-?\d+(?:\.\d+)?)/g)||[]).length;
      return nums % 2 === 0
        ? String(Math.round((+v - 5) * sx + m))
        : String(Math.round((+v - 5) * sy + m));
    });
    let sp = rawPath;
    if (rx > 0) {
      const polyPts = _extractPolygonPts(rawPath);
      if (polyPts.length >= 3) sp = _roundedPolygonPath(polyPts, rx);
    }
    return `<path d="${sp}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
  }

  // Returns path data string for shape at margin m (for wave sampling & clipPath)
  function shapePathStr(m) {
    const ew = Math.max(1, w - m*2), eh = Math.max(1, h - m*2);
    if (sh.special === 'rect') {
      const rxR = d.rx || 0;
      if (rxR > 0)
        return `M ${m+rxR} ${m} H ${m+ew-rxR} Q ${m+ew} ${m} ${m+ew} ${m+rxR} V ${m+eh-rxR} Q ${m+ew} ${m+eh} ${m+ew-rxR} ${m+eh} H ${m+rxR} Q ${m} ${m+eh} ${m} ${m+eh-rxR} V ${m+rxR} Q ${m} ${m} ${m+rxR} ${m} Z`;
      return `M ${m} ${m} H ${m+ew} V ${m+eh} H ${m} Z`;
    }
    if (sh.special === 'ellipse') {
      const cx = w/2, cy = h/2, erx = ew/2, ery = eh/2;
      return `M ${cx-erx} ${cy} A ${erx} ${ery} 0 1 1 ${cx+erx} ${cy} A ${erx} ${ery} 0 1 1 ${cx-erx} ${cy} Z`;
    }
    if (sh.special === 'callout') return null;
    const sx = ew/90, sy = eh/90;
    const rawPath = sh.path.replace(/(-?\d+(?:\.\d+)?)/g, (_, v, off, str) => {
      const nums = (str.slice(0, off).match(/(-?\d+(?:\.\d+)?)/g)||[]).length;
      return nums % 2 === 0
        ? String(Math.round((+v - 5) * sx + m))
        : String(Math.round((+v - 5) * sy + m));
    });
    if (rx > 0) {
      const polyPts = _extractPolygonPts(rawPath);
      if (polyPts.length >= 3) return _roundedPolygonPath(polyPts, rx);
    }
    return rawPath;
  }

  let shapeDef = '';
  let defBlock = '';

  // Corner radius for non-rect/ellipse shapes via offset path algorithm.
  // Rounds polygon corners by cutting each vertex and inserting a circular arc.
  const rx = d.rx || 0;

  if (sh.special === 'callout') {
    const sAttr = sw > 0
      ? `stroke="${strokeColor}" stroke-width="${sw}" ${_getStrokeDasharray(strokeStyle, sw)}`
      : 'stroke="none"';
    shapeDef = _buildCalloutSVGPath(d, w, h, sh, fillAttr, sAttr, shadow, margin);

  } else if (isComplex && sw > 0) {
    // Fill: clipped to shape boundary (margin = sw/2 so fill edge aligns with stroke centre)
    const fillM = sw / 2;
    let filled = '';
    if (hasFill) {
      const clipId = `scp_${d.id}`;
      const clipEl = shapeEl('fill="white"', 'stroke="none"', fillM);
      defBlock += `<clipPath id="${clipId}">${clipEl}</clipPath>`;
      filled = shapeEl(fillAttr, 'stroke="none"', fillM, `clip-path="url(#${clipId})"`) || '';
    }

    // Wave/zigzag stroke path sampled along shape at margin=0 (stroke centre on shape edge)
    const pathStr = shapePathStr(0);
    let wavePath = pathStr ? _complexPathWave(pathStr, strokeStyle, sw) : null;
    const strokeEl = wavePath
      ? `<path d="${wavePath}" fill="none" stroke="${strokeColor}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
      : shapeEl('fill="none"', `stroke="${strokeColor}" stroke-width="${sw}"`, 0);

    shapeDef = (filled || '') + (strokeEl || '');

  } else if (isDouble && sw > 0) {
    const outer = shapeEl(fillAttr, `stroke="${strokeColor}" stroke-width="${sw * 3}"`, sw * 0.5);
    const inner = shapeEl('fill="none"', `stroke="${fill}" stroke-width="${sw * 1.4}"`, sw * 0.5);
    shapeDef = (outer || '') + (inner || '');

  } else {
    if (sw > 0) {
      const perim = _shapePerimeter(sh, w, h, margin);
      const evenD = (strokeStyle === 'dotted' || strokeStyle === 'dashed')
        ? _evenDash(strokeStyle, sw, perim) : null;
      const sAttr = evenD
        ? `stroke="${strokeColor}" stroke-width="${sw}" stroke-dasharray="${evenD.dasharray}" ${evenD.extraAttrs}`
        : `stroke="${strokeColor}" stroke-width="${sw}" ${_getStrokeDasharray(strokeStyle, sw)}`;
      shapeDef = shapeEl(fillAttr, sAttr, margin) || '';
    } else {
      shapeDef = shapeEl(fillAttr, 'stroke="none"', margin) || '';
    }
  }

  let filterDef = '';
  if (d.shadow) {
    const sc = d.shadowColor || '#000000', sb = d.shadowBlur || 8;
    const pad = Math.max(30, Math.ceil(sb * 3));
    filterDef = `<filter id="sh_${d.id}" x="-${pad}%" y="-${pad}%" width="${100+pad*2}%" height="${100+pad*2}%">` +
      `<feDropShadow dx="3" dy="3" stdDeviation="${sb}" flood-color="${sc}" flood-opacity="0.6"/></filter>`;
  }
  const defsContent = (filterDef || '') + (defBlock || '');
  const defs = defsContent ? `<defs>${defsContent}</defs>` : '';
  // For noFill (line/wave) the bounding-box div hit area handles clicks
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible" opacity="${op}">${defs}${shapeDef}</svg>`;
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

  // noFill shapes (line, wave): use full bounding-box hit area — no clip-path
  const sh = typeof SHAPES !== 'undefined' ? SHAPES.find(s => s.id === d.shape) : null;
  if (sh && sh.noFill) {
    const hit = document.createElement('div');
    hit.className = 'shape-hit-area';
    hit.style.cssText = 'position:absolute;inset:0;z-index:10;pointer-events:auto;cursor:move;background:transparent;';
    el.appendChild(hit);
    // Do NOT set pointerEvents:none on el — resize handle dispatched events need to reach hidden .rh inside el
    return;
  }

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
  // Keep dataset in sync so syncProps reads correct values
  if(d.strokeStyle)el.dataset.strokeStyle=d.strokeStyle;
  else if(!el.dataset.strokeStyle)el.dataset.strokeStyle='solid';
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
  else if(prop==='strokeStyle'){d.strokeStyle=val;sel.dataset.strokeStyle=val;}
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
