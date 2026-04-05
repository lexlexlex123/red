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
      if(sh.special==='chevron'&&d.chevSkew===undefined){d.chevSkew=25;}
      sel.dataset.shape=sh.id;
      const svgDiv=sel.querySelector('.ec>div>div');
      if(svgDiv)svgDiv.innerHTML=buildShapeSVG(d,d.w,d.h);
      renderShapeEl(sel,d);
      _applyShapeClipPath(sel,d);
      window._shapeReplaceSource=null;
      save();drawThumbs();saveState();
      // Update properties panel immediately
      if(typeof syncProps==='function') syncProps();
    }
    document.getElementById('shape-modal').classList.remove('open');
    return;
  }
  window._shapeReplaceMode=false;
  pushUndo();
  const _isCallout=sh.special==='callout';
  const _insertFill = sh.noFill ? 'none' : fill;
  const _isCloud = sh.special === 'cloud';
  const d={id:'e'+(++ec),type:'shape',x:snapV((canvasW-200)/2),y:snapV((canvasH-200)/2),w:snapV(200),h:snapV(200),
    shape:sh.id,fill:_insertFill,stroke,sw,rx:_isCallout?12:0,fillOp:1,shadow:false,shadowBlur:8,shadowColor:'#000000',
    shapeHtml:'',shapeTextCss:'font-size:24px;font-weight:700;color:#ffffff;text-align:center;',
    tailX:_isCallout?0:undefined,tailY:_isCallout?130:undefined,rot:0,anims:[],
    cloudSeed:_isCloud?(Math.floor(Math.random()*999999)+1):undefined,
    chevSkew:sh.special==='chevron'?25:undefined,
    curvePoints:sh.special==='curve'?(typeof _defaultCurvePoints==='function'?_defaultCurvePoints():undefined):undefined};
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
function _complexPathWave(svgPathStr, style, sw, skipClose) {
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
    // Close back to start — skip for open paths (noFill shapes like line/wave)
    if (!skipClose) d += 'Z';
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


// Build chevron path for given width/height and skew (0-45, default 25)
// skew = depth of the notch/tip as % of width (0=flat rectangle tip, 45=very pointed)
function _chevronPath(w, h, skew, isLeft) {
  const s = Math.max(0, Math.min(45, +skew)) / 100; // 0..0.45 fraction of w
  const tip = Math.round(w * s);   // horizontal depth of nose/notch
  const mid = Math.round(h / 2);
  if (isLeft) {
    // ← left-facing chevron: exact mirror of right (x -> w-x)
    // Right: M 0 0 L (w-tip) 0 L w mid L (w-tip) h L 0 h L tip mid
    // Mirror: M w 0 L tip 0 L 0 mid L tip h L w h L (w-tip) mid
    return `M ${w} 0 L ${tip} 0 L 0 ${mid} L ${tip} ${h} L ${w} ${h} L ${w - tip} ${mid} Z`;
  } else {
    // → right-facing chevron: nose points right
    return `M 0 0 L ${w - tip} 0 L ${w} ${mid} L ${w - tip} ${h} L 0 ${h} L ${tip} ${mid} Z`;
  }
}

// Build SVG path from curve control points
// pts: [{x,y,cp1x,cp1y,cp2x,cp2y,type}] type: 'smooth'|'corner'|'symmetric'
// coords are in 0-1 normalized space, scaled to w,h

// Compute bounding box of a bezier curve from its control points
// Returns {minX, minY, maxX, maxY} in normalized [0-1] space
function _curveBBox(pts, closed) {
  if (!pts || pts.length < 2) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  function expand(x, y) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  function cubicBBox(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) {
    expand(p0x, p0y); expand(p3x, p3y);
    // Find extrema of cubic bezier
    for (let axis = 0; axis < 2; axis++) {
      const [a0, a1, a2, a3] = axis === 0
        ? [p0x, p1x, p2x, p3x] : [p0y, p1y, p2y, p3y];
      const c = 3*(a1-a0), b = 3*(a2-a1)-c, a = a3-a0-c-b;
      const disc = b*b - a*c;
      if (disc >= 0) {
        const sq = Math.sqrt(disc);
        for (const t of [(-b+sq)/(a||1e-9), (-b-sq)/(a||1e-9)]) {
          if (t > 0 && t < 1) {
            const v = a0*(1-t)**3 + 3*a1*t*(1-t)**2 + 3*a2*t**2*(1-t) + a3*t**3;
            if (axis === 0) expand(v, 0); else expand(0, v);
          }
        }
      }
    }
  }
  const allPts = closed ? [...pts, pts[0]] : pts;
  for (let i = 1; i < allPts.length; i++) {
    const prev = pts[i-1] ?? pts[pts.length-1];
    const curr = allPts[i];
    const c1x = prev.cp2x ?? prev.x, c1y = prev.cp2y ?? prev.y;
    const c2x = curr.cp1x ?? curr.x, c2y = curr.cp1y ?? curr.y;
    cubicBBox(prev.x, prev.y, c1x, c1y, c2x, c2y, curr.x, curr.y);
  }
  return { minX, minY, maxX, maxY };
}

function _buildCurvePath(pts, w, h, closed) {
  if (!pts || pts.length < 2) return null;
  const px = (v) => (v * w).toFixed(2);
  const py = (v) => (v * h).toFixed(2);
  let d = `M ${px(pts[0].x)} ${py(pts[0].y)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], curr = pts[i];
    const c1x = prev.cp2x != null ? prev.cp2x : prev.x;
    const c1y = prev.cp2y != null ? prev.cp2y : prev.y;
    const c2x = curr.cp1x != null ? curr.cp1x : curr.x;
    const c2y = curr.cp1y != null ? curr.cp1y : curr.y;
    d += ` C ${px(c1x)} ${py(c1y)} ${px(c2x)} ${py(c2y)} ${px(curr.x)} ${py(curr.y)}`;
  }
  if (closed) {
    // Close back to first point using last cp2 and first cp1
    const last = pts[pts.length - 1], first = pts[0];
    const c1x = last.cp2x != null ? last.cp2x : last.x;
    const c1y = last.cp2y != null ? last.cp2y : last.y;
    const c2x = first.cp1x != null ? first.cp1x : first.x;
    const c2y = first.cp1y != null ? first.cp1y : first.y;
    d += ` C ${px(c1x)} ${py(c1y)} ${px(c2x)} ${py(c2y)} ${px(first.x)} ${py(first.y)} Z`;
  }
  return d;
}

// Default curve points (2 points with handles, S-curve)
function _defaultCurvePoints() {
  return [
    { x: 0.15, y: 0.7,  cp2x: 0.15, cp2y: 0.2,  type: 'smooth' },
    { x: 0.85, y: 0.3,  cp1x: 0.85, cp1y: 0.8,  type: 'smooth' }
  ];
}

// Normalize curve points: enforce single handle at endpoints for open curves,
// ensure both handles at all points for closed curves
function _normalizeCurvePoints(pts, closed) {
  if (!pts || pts.length < 2) return pts;
  pts.forEach((pt, i) => {
    if (!closed) {
      // Open curve: first point has only cp2 (outgoing), last point has only cp1 (incoming)
      if (i === 0) { delete pt.cp1x; delete pt.cp1y; }
      if (i === pts.length - 1) { delete pt.cp2x; delete pt.cp2y; }
    } else {
      // Closed curve: all points need both handles
      // Add missing cp1 by mirroring cp2, or generate a default
      if (pt.cp1x == null) {
        if (pt.cp2x != null) {
          // Mirror cp2 through anchor
          pt.cp1x = pt.x * 2 - pt.cp2x;
          pt.cp1y = pt.y * 2 - pt.cp2y;
        } else {
          pt.cp1x = pt.x - 0.1; pt.cp1y = pt.y;
        }
      }
      if (pt.cp2x == null) {
        if (pt.cp1x != null) {
          pt.cp2x = pt.x * 2 - pt.cp1x;
          pt.cp2y = pt.y * 2 - pt.cp1y;
        } else {
          pt.cp2x = pt.x + 0.1; pt.cp2y = pt.y;
        }
      }
    }
  });
  return pts;
}


// Sample a cubic bezier at parameter t → point
function _bezierPt(p0, p1, p2, p3, t) {
  const u=1-t;
  return {
    x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
    y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y
  };
}
// Tangent of cubic bezier at t
function _bezierTan(p0, p1, p2, p3, t) {
  const u=1-t;
  const x = 3*(u*u*(p1.x-p0.x) + 2*u*t*(p2.x-p1.x) + t*t*(p3.x-p2.x));
  const y = 3*(u*u*(p1.y-p0.y) + 2*u*t*(p2.y-p1.y) + t*t*(p3.y-p2.y));
  const len = Math.hypot(x,y) || 1e-9;
  return { x: x/len, y: y/len };
}

// Build variable-width stroke.
// At junctions: inscribe a circle, draw tangent lines from offset edges to the circle,
// connect with an arc. This gives smooth "pen nib" joins.
function _buildVariableStroke(pts, w, h, closed, defaultSw) {
  if (!pts || pts.length < 2) return '';
  const STEPS = 36;
  const f = v => v.toFixed(2);

  function sample(prev, curr) {
    const hwA = (prev.sw != null ? prev.sw : defaultSw) / 2;
    const hwB = (curr.sw != null ? curr.sw : defaultSw) / 2;
    const p0 = {x:prev.x*w, y:prev.y*h};
    const p3 = {x:curr.x*w, y:curr.y*h};
    const p1 = {x:(prev.cp2x??prev.x)*w, y:(prev.cp2y??prev.y)*h};
    const p2 = {x:(curr.cp1x??curr.x)*w, y:(curr.cp1y??curr.y)*h};
    const out = [];
    for (let k = 0; k <= STEPS; k++) {
      const t=k/STEPS, u=1-t;
      const x=u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x;
      const y=u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y;
      let tx=3*(u*u*(p1.x-p0.x)+2*u*t*(p2.x-p1.x)+t*t*(p3.x-p2.x));
      let ty=3*(u*u*(p1.y-p0.y)+2*u*t*(p2.y-p1.y)+t*t*(p3.y-p2.y));
      const tl=Math.hypot(tx,ty)||1e-9; tx/=tl; ty/=tl;
      const hw=hwA+(hwB-hwA)*t;
      out.push({x,y,nx:-ty,ny:tx,tx,ty,hw});
    }
    return out;
  }

  // Catmull-Rom smooth path through {x,y} array
  function cmPath(arr) {
    if (!arr.length) return '';
    let d = `M ${f(arr[0].x)} ${f(arr[0].y)}`;
    for (let i=0;i<arr.length-1;i++) {
      const p0=arr[Math.max(0,i-1)],p1=arr[i],p2=arr[i+1],p3=arr[Math.min(arr.length-1,i+2)];
      const c1={x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6};
      const c2={x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6};
      d+=` C ${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
    }
    return d;
  }

  // Sample arc from angle a0 to a1 around (cx,cy,r), n points
  function arcPts(cx,cy,r,a0,a1,n) {
    let da=a1-a0;
    // take shorter arc
    while(da>Math.PI)  da-=2*Math.PI;
    while(da<-Math.PI) da+=2*Math.PI;
    const res=[];
    for(let k=0;k<=n;k++) {
      const a=a0+da*k/n;
      res.push({x:cx+r*Math.cos(a), y:cy+r*Math.sin(a)});
    }
    return res;
  }

  // Build round join between two segments at junction point (jx,jy).
  // inN: normal at END of incoming segment (points left)
  // outN: normal at START of outgoing segment (points left)
  // r: half-width (circle radius)
  // Returns {Lpts, Rpts} to splice into L and R arrays.
  function roundJoin(jx,jy,r, inTx,inTy,inNx,inNy, outTx,outTy,outNx,outNy) {
    const cross = inTx*outTy - inTy*outTx;

    const inLx=jx+inNx*r, inLy=jy+inNy*r;
    const inRx=jx-inNx*r, inRy=jy-inNy*r;
    const outLx=jx+outNx*r, outLy=jy+outNy*r;
    const outRx=jx-outNx*r, outRy=jy-outNy*r;

    const ARC_N=10;

    function shortArc(a0, a1) {
      let da = a1 - a0;
      while (da >  Math.PI) da -= 2*Math.PI;
      while (da < -Math.PI) da += 2*Math.PI;
      const res = [];
      for (let k=0; k<=ARC_N; k++) {
        const a = a0 + da*k/ARC_N;
        res.push({x: jx + r*Math.cos(a), y: jy + r*Math.sin(a)});
      }
      return res;
    }

    // Inner side join: find the point on the inscribed circle closest to the bisector
    // This avoids spikes when miter would go outside the circle
    function innerPtFn(ax,ay, bx,by) {
      // Bisector angle between the two inner offset points
      const a0 = Math.atan2(ay-jy, ax-jx);
      const a1 = Math.atan2(by-jy, bx-jx);
      let da = a1 - a0;
      while (da >  Math.PI) da -= 2*Math.PI;
      while (da < -Math.PI) da += 2*Math.PI;
      const amid = a0 + da/2;
      // Point on circle at bisector angle — this is always inside, never spikes
      return {x: jx + r*Math.cos(amid), y: jy + r*Math.sin(amid)};
    }

    const dot = inTx*outTx + inTy*outTy;

    if (Math.abs(cross) < 0.02) {
      if (dot > 0.98) {
        // Truly straight (same direction): just connect
        return {Lpts:[{x:outLx,y:outLy}], Rpts:[{x:outRx,y:outRy}]};
      }
      // Near 180° U-turn (dot ≈ -1, cross ≈ 0): add semicircle
      // Determine outside: the side where inL and outL are further from each other
      // At 180° turn inNx≈-outNx, so outL is on opposite side
      // Outside = the side where offset points are farther from centre
      // Use inN direction to place arc: arc sweeps from inL around to outL
      const aIn  = Math.atan2(inLy-jy, inLx-jx);
      const aOut = Math.atan2(outLy-jy, outLx-jx);
      const aInR = Math.atan2(inRy-jy, inRx-jx);
      const aOutR= Math.atan2(outRy-jy, outRx-jx);
      // Check which side has a larger angular span (= outside of turn)
      let daL = aOut-aIn; while(daL>Math.PI)daL-=2*Math.PI; while(daL<-Math.PI)daL+=2*Math.PI;
      let daR = aOutR-aInR; while(daR>Math.PI)daR-=2*Math.PI; while(daR<-Math.PI)daR+=2*Math.PI;
      if (Math.abs(daL) >= Math.abs(daR)) {
        // Larger span on L → arc on L, inner point on R
        return {
          Lpts: shortArc(aIn, aOut),
          Rpts: [innerPtFn(inRx,inRy, outRx,outRy)]
        };
      } else {
        return {
          Lpts: [innerPtFn(inLx,inLy, outLx,outLy)],
          Rpts: shortArc(aInR, aOutR)
        };
      }
    }

    // NOTE: screen Y-down → cross<0 = left turn, cross>0 = right turn
    if (cross < 0) {
      // Left turn: outside = LEFT → arc; inside = RIGHT → miter
      const a0=Math.atan2(inLy-jy, inLx-jx);
      const a1=Math.atan2(outLy-jy, outLx-jx);
      // Inner miter: incoming right edge direction = inTx,inTy; outgoing right edge direction = outTx,outTy
      const innerPt = innerPtFn(inRx,inRy, outRx,outRy);
      return {
        Lpts: shortArc(a0, a1),
        Rpts: [innerPt]
      };
    } else {
      // Right turn: outside = RIGHT → arc; inside = LEFT → miter
      const a0=Math.atan2(inRy-jy, inRx-jx);
      const a1=Math.atan2(outRy-jy, outRx-jx);
      const innerPt = innerPtFn(inLx,inLy, outLx,outLy);
      return {
        Lpts: [innerPt],
        Rpts: shortArc(a0, a1)
      };
    }
  }

  // Round end cap: arc around (cx,cy,r) from L side to R side (semicircle)
  function endCapPts(cx,cy,r,fromAngle,n) {
    // Sweep BACKWARD (-PI) so cap bulges away from curve direction
    const res=[];
    for(let k=1;k<=n;k++) {
      const a=fromAngle - Math.PI*k/n;
      res.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)});
    }
    return res;
  }

  const allPts = closed ? [...pts,pts[0]] : pts;
  const nSegs  = allPts.length-1;
  const SS=[];
  for(let si=0;si<nSegs;si++) SS.push(sample(pts[si],allPts[si+1]));

  // Collect L and R points
  const L=[],R=[];

  for (let si=0;si<nSegs;si++) {
    const samp=SS[si];
    const isFirst=si===0, isLast=si===nSegs-1;

    // Add interior points (exclude last — handled at junction)
    for(let k=(isFirst?0:1);k<(isLast?samp.length:samp.length-1);k++){
      const s=samp[k];
      L.push({x:s.x+s.nx*s.hw,y:s.y+s.ny*s.hw});
      R.push({x:s.x-s.nx*s.hw,y:s.y-s.ny*s.hw});
    }

    // Add junction join
    if (!isLast) {
      const cur =samp[samp.length-1];
      const next=SS[si+1][0];
      const join=roundJoin(
        cur.x,cur.y,cur.hw,
        cur.tx,cur.ty,cur.nx,cur.ny,
        next.tx,next.ty,next.nx,next.ny
      );
      join.Lpts.forEach(p=>L.push(p));
      join.Rpts.forEach(p=>R.push(p));
    }
  }

  if(L.length<2) return '';

  const firstS=SS[0][0], lastS=SS[nSegs-1][SS[nSegs-1].length-1];
  const Rrev=[...R].reverse();

  let d;
  if(closed){
    d=cmPath(L)+' Z '+cmPath(Rrev)+' Z';
  } else {
    // Start cap: semicircle from R[0] to L[0]
    const startA=Math.atan2(R[0].y-firstS.y,R[0].x-firstS.x);
    const scPts=endCapPts(firstS.x,firstS.y,firstS.hw,startA,8);
    // End cap: semicircle from L[last] to R[last]
    const endA=Math.atan2(L[L.length-1].y-lastS.y,L[L.length-1].x-lastS.x);
    const ecPts=endCapPts(lastS.x,lastS.y,lastS.hw,endA,8);
    d=cmPath([R[0],...scPts,...L,...ecPts,...Rrev])+' Z';
  }
  return d;
}
// Keep old _buildCurveSegments for strokeStyle (dashed/dotted) fallback
function _buildCurveSegments(pts, w, h, closed, defaultSw, stroke, strokeStyle) {
  if (!pts || pts.length < 2) return '';
  const px = v => (v * w).toFixed(2);
  const py = v => (v * h).toFixed(2);
  const segments = [];
  const allPts = closed ? [...pts, pts[0]] : pts;
  for (let i = 1; i < allPts.length; i++) {
    const prev = pts[i-1];
    const curr = allPts[i];
    const c1x = prev.cp2x != null ? prev.cp2x : prev.x;
    const c1y = prev.cp2y != null ? prev.cp2y : prev.y;
    const c2x = curr.cp1x != null ? curr.cp1x : curr.x;
    const c2y = curr.cp1y != null ? curr.cp1y : curr.y;
    const segPath = `M ${px(prev.x)} ${py(prev.y)} C ${px(c1x)} ${py(c1y)} ${px(c2x)} ${py(c2y)} ${px(curr.x)} ${py(curr.y)}`;
    const segSw = prev.sw != null ? prev.sw : defaultSw;
    const da = strokeStyle === 'dashed' ? `stroke-dasharray="${segSw*4} ${segSw*3}"` :
               strokeStyle === 'dotted' ? `stroke-dasharray="${segSw} ${segSw*3}" stroke-linecap="round"` : '';
    segments.push(`<path d="${segPath}" fill="none" stroke="${stroke}" stroke-width="${segSw}" stroke-linecap="round" stroke-linejoin="round" ${da}/>`);
  }
  return segments.join('');
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
  // Shape fill gradient support
  let _gradDef = '';
  let fillAttr = hasFill ? `fill="${fill}"` : 'fill="none"';
  // Sync fillGrad from DOM element if not on d object (robustness)
  if (!d.fillGrad && d.id) {
    const _el = document.querySelector(`[data-id="${d.id}"]`);
    if (_el && _el.dataset.fillGrad === '1') {
      d.fillGrad = true;
      if (_el.dataset.fillGrad2) d.fillGrad2 = d.fillGrad2 || _el.dataset.fillGrad2;
      if (_el.dataset.fillGradDir != null) d.fillGradDir = d.fillGradDir != null ? d.fillGradDir : +_el.dataset.fillGradDir;
    }
  }
  if (hasFill && (d.fillGrad === true || d.fillGrad === '1' || d.fillGrad === 1) && d.fillGrad2) {
    const _gid = 'sg_' + d.id;
    const _dir = d.fillGradDir != null ? +d.fillGradDir : 90;
    const _rad = (_dir - 90) * Math.PI / 180;
    const _x1 = (50 - 50 * Math.cos(_rad)).toFixed(1);
    const _y1 = (50 - 50 * Math.sin(_rad)).toFixed(1);
    const _x2 = (50 + 50 * Math.cos(_rad)).toFixed(1);
    const _y2 = (50 + 50 * Math.sin(_rad)).toFixed(1);
    function _parseStop(col, fallbackHex) {
      if (!col || col === 'transparent') return { color: fallbackHex || '#000000', opacity: 0 };
      const rgba = col.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
      if (rgba) {
        const r = (+rgba[1]).toString(16).padStart(2,'0');
        const g = (+rgba[2]).toString(16).padStart(2,'0');
        const b = (+rgba[3]).toString(16).padStart(2,'0');
        return { color: `#${r}${g}${b}`, opacity: rgba[4] != null ? +rgba[4] : 1 };
      }
      return { color: col, opacity: 1 };
    }
    const _s1 = _parseStop(fill, fill);
    const _s2 = _parseStop(d.fillGrad2, fill);
    const _s1color = _s1.opacity === 0 ? _s2.color : _s1.color;
    const _s2color = _s2.opacity === 0 ? _s1.color : _s2.color;
    _gradDef = `<linearGradient id="${_gid}" x1="${_x1}%" y1="${_y1}%" x2="${_x2}%" y2="${_y2}%">`
      + `<stop offset="0%" stop-color="${_s1color}" stop-opacity="${_s1.opacity}"/>`
      + `<stop offset="100%" stop-color="${_s2color}" stop-opacity="${_s2.opacity}"/>`
      + `</linearGradient>`;
    fillAttr = `fill="url(#${_gid})"`;
  }

  // ── shape geometry helpers ──────────────────────────────────────

  // Returns SVG element string for a given margin
  function shapeEl(fAttr, sAttr, m, extra = '') {
    const ew = Math.max(1, w - m * 2), eh = Math.max(1, h - m * 2);
    if (sh.special === 'rect')
      return `<rect x="${m}" y="${m}" width="${ew}" height="${eh}" rx="${d.rx||0}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
    if (sh.special === 'cloud') {
      const seed = d.cloudSeed || 42;
      const path = _generateCloudPath(w, h, seed);
      // Fill all circles — nonzero fill-rule = visual union, no inner borders
      const _cFill = typeof fillAttr !== 'undefined' ? fillAttr : fAttr;
      const fillPart = `<path d="${path}" fill-rule="nonzero" ${_cFill} stroke="none" ${extra} ${shadow}/>`;
      // Stroke: draw thick stroke, then mask out the interior with the fill color
      // This hides inner circle borders while showing only outer silhouette stroke
      const _cGradDef = _gradDef || '';
      let strokePart = '';
      if (sw > 0) {
        const maskId = `cldm_${d.id}`;
        const maskContent = `<rect width="${w}" height="${h}" fill="white"/>`
          + `<path d="${path}" fill-rule="nonzero" fill="black"/>`;
        strokePart = `<defs>${_cGradDef}<mask id="${maskId}">${maskContent}</mask></defs>`
          + `<path d="${path}" fill-rule="nonzero" fill="none" ${sAttr} mask="url(#${maskId})" ${extra}/>`;
      } else if (_cGradDef) {
        return `<defs>${_cGradDef}</defs>` + fillPart;
      }
      return fillPart + strokePart;
    }
    if (sh.special === 'parallelogram') {
      const _skew = Math.max(-45, Math.min(45, +(d.paraSkew!=null?d.paraSkew:20)));
      const _off = Math.round((eh/2) * Math.tan(_skew*Math.PI/180));
      const _pts = [
        {x: m+_off, y: m},
        {x: m+ew,   y: m},
        {x: m+ew-_off, y: m+eh},
        {x: m,      y: m+eh}
      ];
      let _pp = `M ${_pts[0].x} ${_pts[0].y} L ${_pts[1].x} ${_pts[1].y} L ${_pts[2].x} ${_pts[2].y} L ${_pts[3].x} ${_pts[3].y} Z`;
      if((d.rx||0)>0) _pp = _roundedPolygonPath(_pts, d.rx);
      return `<path d="${_pp}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
    }
    if (sh.special === 'cloud') {
    // Cloud uses multiple circle subpaths — pointer-events handled via SVG visibleFill
    // Return 'none' to skip CSS clip-path (SVG path element handles hit testing)
    return 'none';
  }
  if (sh.special === 'parallelogram') {
    const _skewC = Math.max(-45, Math.min(45, +(d.paraSkew!=null?d.paraSkew:20)));
    const _offC = Math.round((h/2) * Math.tan(_skewC*Math.PI/180));
    return `polygon(${_offC}px 0px, ${w}px 0px, ${w-_offC}px ${h}px, 0px ${h}px)`;
  }
  if (sh.special === 'star') {
      const nRays = Math.max(4, Math.min(32, +(d.starRays||5)));
      const innerR = Math.max(0.1, Math.min(0.9, +(d.starInner!=null?d.starInner:0.45)));
      const sp = _starPath(w/2, h/2, ew/2, eh/2, nRays, innerR, d.rx||0);
      return `<path d="${sp}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
    }
    if (sh.special === 'star') {
      const nRays2 = Math.max(4, Math.min(32, +(d.starRays||5)));
      const innerR2 = Math.max(0.1, Math.min(0.9, +(d.starInner!=null?d.starInner:0.45)));
      return _starPath(w/2, h/2, ew/2, eh/2, nRays2, innerR2, 0);
    }
    if (sh.special === 'star') {
    const nRays3 = Math.max(4, Math.min(32, +(d.starRays||5)));
    const innerR3 = Math.max(0.1, Math.min(0.9, +(d.starInner!=null?d.starInner:0.45)));
    const pts3 = [];
    for (let i = 0; i < nRays3 * 2; i++) {
      const angle = (i / (nRays3 * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 1 : innerR3;
      pts3.push(`${(w/2 + w/2*r*Math.cos(angle)).toFixed(1)}px ${(h/2 + h/2*r*Math.sin(angle)).toFixed(1)}px`);
    }
    return `polygon(${pts3.join(', ')})`;
  }
  if (sh.special === 'polygon') {
      const _sides = Math.max(3, Math.min(16, +(d.polySides||3)));
      const _pcx=w/2, _pcy=h/2, _prx=ew/2, _pry=eh/2;
      const _pts=[];
      for(let _i=0;_i<_sides;_i++){
        const _a=(_i/_sides*Math.PI*2)-(Math.PI/2);
        _pts.push(`${(_pcx+_prx*Math.cos(_a)).toFixed(2)},${(_pcy+_pry*Math.sin(_a)).toFixed(2)}`);
      }
      const _pp = _pts.join(' ');
      let _polyPath = `M ${_pp} Z`;
      if((d.rx||0)>0){
        const _polyPts=_pts.map(p=>{const[x,y]=p.split(',');return{x:+x,y:+y};});
        _polyPath=_roundedPolygonPath(_polyPts,d.rx);
      }
      return `<path d="${_polyPath}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
    }
    if (sh.special === 'ellipse') {
      const a1 = d.arcStart != null ? +d.arcStart : 0;
      const a2 = d.arcEnd   != null ? +d.arcEnd   : 360;
      const mode = d.arcMode || 'full';
      if (mode === 'full' || Math.abs(a2 - a1) >= 360) {
        return `<ellipse cx="${w/2}" cy="${h/2}" rx="${ew/2}" ry="${eh/2}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
      }
      return `<path d="${_arcPath(w/2,h/2,w/2,h/2,a1,a2,mode,m,d.rx||0)}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
    }
    if (sh.special === 'curve') {
      const pts = d.curvePoints || _defaultCurvePoints();
      const _hasPerNodeSw = pts.some(p => p.sw != null);
      if (_hasPerNodeSw) {
        const _isDashed = strokeStyle === 'dashed' || strokeStyle === 'dotted' || strokeStyle === 'wave' || strokeStyle === 'zigzag';
        let _out = '';
        if (hasFill) {
          // Fill with the curve path
          const _fp = _buildCurvePath(pts, w, h, d.curveClosed);
          if (_fp) _out += `<path d="${_fp}" ${fAttr} stroke="none" ${extra} ${shadow}/>`;
        }
        if (sw > 0) {
          if (_isDashed) {
            // Dashed/dotted: use segment-per-segment approach
            _out += _buildCurveSegments(pts, w, h, d.curveClosed, sw, strokeColor, strokeStyle);
          } else {
            // Variable width: build filled polygon that looks like a tapered stroke
            const _varPath = _buildVariableStroke(pts, w, h, d.curveClosed, sw);
            if (_varPath) _out += `<path d="${_varPath}" fill="${strokeColor}" stroke="none" opacity="${d.fillOp||1}" pointer-events="visibleFill" ${shadow}/>`;
          }
        }
        return _out || null;
      }
      const pathStr = _buildCurvePath(pts, w, h, d.curveClosed);
      if (!pathStr) return null;
      const _curveFill = hasFill ? fAttr : 'fill="none"';
      const _curveEvents = hasFill ? '' : 'pointer-events="visibleStroke"';
      return `<path d="${pathStr}" ${_curveFill} ${sAttr} ${extra} ${shadow} stroke-linecap="round" stroke-linejoin="round" ${_curveEvents}/>`;
    }
    if (sh.special === 'chevron') {
      const _cskew = d.chevSkew != null ? +d.chevSkew : 25;
      const _isLeft = d.shape === 'chevronLeft';
      const _cpath = _chevronPath(ew, eh, _cskew, _isLeft);
      let _cpFinal;
      const _crx = d.rx || 0;
      if (_crx > 0) {
        // Extract polygon points and apply rounding
        const _chevPts = [];
        const _chevRe = /(-?[\d.]+) (-?[\d.]+)/g;
        let _cm;
        while ((_cm = _chevRe.exec(_cpath)) !== null)
          _chevPts.push({ x: +_cm[1] + m, y: +_cm[2] + m });
        _cpFinal = _chevPts.length >= 3 ? _roundedPolygonPath(_chevPts, _crx) : _cpath;
      } else {
        _cpFinal = _cpath.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_m2, x, y) =>
          `${(+x + m).toFixed(1)} ${(+y + m).toFixed(1)}`);
      }
      return `<path d="${_cpFinal}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
    }
    if (sh.special === 'callout') return null;
    if (!sh.path) return null; // no path defined (e.g. parametric shapes)
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
    if (sh.special === 'polygon') {
      const _sides2 = Math.max(3, Math.min(16, +(d.polySides||3)));
      const _pcx2=w/2, _pcy2=h/2, _prx2=ew/2, _pry2=eh/2;
      const _pts2=[];
      for(let _i=0;_i<_sides2;_i++){
        const _a=(_i/_sides2*Math.PI*2)-(Math.PI/2);
        _pts2.push(`${(_pcx2+_prx2*Math.cos(_a)).toFixed(2)},${(_pcy2+_pry2*Math.sin(_a)).toFixed(2)}`);
      }
      return `M ${_pts2.join(' ')} Z`;
    }
    if (sh.special === 'rect') {
      const rxR = d.rx || 0;
      if (rxR > 0)
        return `M ${m+rxR} ${m} H ${m+ew-rxR} Q ${m+ew} ${m} ${m+ew} ${m+rxR} V ${m+eh-rxR} Q ${m+ew} ${m+eh} ${m+ew-rxR} ${m+eh} H ${m+rxR} Q ${m} ${m+eh} ${m} ${m+eh-rxR} V ${m+rxR} Q ${m} ${m} ${m+rxR} ${m} Z`;
      return `M ${m} ${m} H ${m+ew} V ${m+eh} H ${m} Z`;
    }
    if (sh.special === 'ellipse') {
      const cx = w/2, cy = h/2, erx = ew/2, ery = eh/2;
      const a1p = d.arcStart != null ? +d.arcStart : 0;
      const a2p = d.arcEnd   != null ? +d.arcEnd   : 360;
      const modeP = d.arcMode || 'full';
      if (modeP !== 'full' && Math.abs(a2p - a1p) < 360)
        return _arcPath(cx, cy, w/2, h/2, a1p, a2p, modeP, m, d.rx||0);
      return `M ${cx-erx} ${cy} A ${erx} ${ery} 0 1 1 ${cx+erx} ${cy} A ${erx} ${ery} 0 1 1 ${cx-erx} ${cy} Z`;
    }
    if (sh.special === 'cloud') {
      return _generateCloudPath(w, h, d.cloudSeed || 42);
    }
    if (sh.special === 'parallelogram') {
      const _skewP = Math.max(-45, Math.min(45, +(d.paraSkew!=null?d.paraSkew:20)));
      const _offP = Math.round((eh/2) * Math.tan(_skewP*Math.PI/180));
      return `M ${_offP} 0 L ${ew} 0 L ${ew-_offP} ${eh} L 0 ${eh} Z`;
    }
    if (sh.special === 'curve') {
      const pts = d.curvePoints || _defaultCurvePoints();
      const _hasPerNodeSw = pts.some(p => p.sw != null);
      if (_hasPerNodeSw) {
        const _isDashed = strokeStyle === 'dashed' || strokeStyle === 'dotted' || strokeStyle === 'wave' || strokeStyle === 'zigzag';
        let _out = '';
        if (hasFill) {
          // Fill with the curve path
          const _fp = _buildCurvePath(pts, w, h, d.curveClosed);
          if (_fp) _out += `<path d="${_fp}" ${fAttr} stroke="none" ${extra} ${shadow}/>`;
        }
        if (sw > 0) {
          if (_isDashed) {
            // Dashed/dotted: use segment-per-segment approach
            _out += _buildCurveSegments(pts, w, h, d.curveClosed, sw, strokeColor, strokeStyle);
          } else {
            // Variable width: build filled polygon that looks like a tapered stroke
            const _varPath = _buildVariableStroke(pts, w, h, d.curveClosed, sw);
            if (_varPath) _out += `<path d="${_varPath}" fill="${strokeColor}" stroke="none" opacity="${d.fillOp||1}" pointer-events="visibleFill" ${shadow}/>`;
          }
        }
        return _out || null;
      }
      const pathStr = _buildCurvePath(pts, w, h, d.curveClosed);
      if (!pathStr) return null;
      const _curveFill = hasFill ? fAttr : 'fill="none"';
      const _curveEvents = hasFill ? '' : 'pointer-events="visibleStroke"';
      return `<path d="${pathStr}" ${_curveFill} ${sAttr} ${extra} ${shadow} stroke-linecap="round" stroke-linejoin="round" ${_curveEvents}/>`;
    }
    if (sh.special === 'curve') {
      return _buildCurvePath(d.curvePoints || _defaultCurvePoints(), w, h, d.curveClosed) || '';
    }
    if (sh.special === 'chevron') {
      const _cskew2 = d.chevSkew != null ? +d.chevSkew : 25;
      return _chevronPath(ew, eh, _cskew2, d.shape === 'chevronLeft');
    }
    if (sh.special === 'callout') return null;
    if (!sh.path) return null; // no path defined
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
      if (clipEl) {
        defBlock += `<clipPath id="${clipId}">${clipEl}</clipPath>`;
        filled = shapeEl(fillAttr, 'stroke="none"', fillM, `clip-path="url(#${clipId})"`) || '';
      } else {
        filled = shapeEl(fillAttr, 'stroke="none"', fillM) || '';
      }
    }

    // Wave/zigzag stroke path sampled along shape at margin=0 (stroke centre on shape edge)
    const pathStr = shapePathStr(0);
    let wavePath = pathStr ? _complexPathWave(pathStr, strokeStyle, sw, _noFill) : null;
    const strokeEl = wavePath
      ? `<path d="${wavePath}" fill="none" stroke="${strokeColor}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
      : shapeEl('fill="none"', `stroke="${strokeColor}" stroke-width="${sw}"`, 0);

    shapeDef = (filled || '') + (strokeEl || '');

  } else if (isDouble && sw > 0) {
    if (_noFill) {
      // For noFill shapes (line/wave): two parallel strokes offset by gap
      const gap = sw * 3;
      const pathStr0 = shapePathStr(0);
      if (pathStr0) {
        const line1 = `<path d="${pathStr0}" fill="none" stroke="${strokeColor}" stroke-width="${sw}" stroke-linecap="round" transform="translate(0,${-gap/2})"/>`;
        const line2 = `<path d="${pathStr0}" fill="none" stroke="${strokeColor}" stroke-width="${sw}" stroke-linecap="round" transform="translate(0,${gap/2})"/>`;
        shapeDef = line1 + line2;
      } else {
        shapeDef = shapeEl('fill="none"', `stroke="${strokeColor}" stroke-width="${sw}"`, 0) || '';
      }
    } else {
      const outer = shapeEl(fillAttr, `stroke="${strokeColor}" stroke-width="${sw * 3}"`, sw * 0.5);
      const inner = shapeEl('fill="none"', `stroke="${fill}" stroke-width="${sw * 1.4}"`, sw * 0.5);
      shapeDef = (outer || '') + (inner || '');
    }

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

  let _shadowDef = '';
  if (d.shadow) {
    const sc = d.shadowColor || '#000000', sb = d.shadowBlur || 8;
    const pad = Math.max(30, Math.ceil(sb * 3));
    _shadowDef = `<filter id="sh_${d.id}" x="-${pad}%" y="-${pad}%" width="${100+pad*2}%" height="${100+pad*2}%">` +
      `<feDropShadow dx="3" dy="3" stdDeviation="${sb}" flood-color="${sc}" flood-opacity="0.6"/></filter>`;
  }
  const defsContent = (_gradDef || '') + (_shadowDef || '') + (defBlock || '');
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
  if (sh.special === 'ellipse') {
    const mode2 = d.arcMode || 'full';
    if (mode2 === 'full') return `ellipse(${(w-m*2)/2}px ${(h-m*2)/2}px at 50% 50%)`;
    // For sector/chord: build polygon approximating the arc shape
    const a1c = d.arcStart != null ? +d.arcStart : 0;
    const a2c = d.arcEnd   != null ? +d.arcEnd   : 360;
    const rx2 = (w-m*2)/2, ry2 = (h-m*2)/2;
    const cx2 = w/2, cy2 = h/2;
    const pts = [];
    if (mode2 === 'sector') pts.push(`${cx2}px ${cy2}px`);
    // Arc points
    const diff2 = ((a2c - a1c) % 360 + 360) % 360 || 360;
    const steps = Math.max(12, Math.ceil(diff2 / 5));
    for (let i = 0; i <= steps; i++) {
      const ang = (a1c + diff2 * i / steps - 90) * Math.PI / 180;
      const px = cx2 + rx2 * Math.cos(ang);
      const py = cy2 + ry2 * Math.sin(ang);
      pts.push(`${px.toFixed(1)}px ${py.toFixed(1)}px`);
    }
    if (mode2 === 'sector') pts.push(`${cx2}px ${cy2}px`);
    return `polygon(${pts.join(', ')})`;
  }
  if (sh.special === 'chevron') {
    const _cskew3 = d.chevSkew != null ? +d.chevSkew : 25;
    const _cpath3 = _chevronPath(w, h, _cskew3, d.shape === 'chevronLeft');
    const _pts3 = [];
    const _re3 = /(-?[\d.]+) (-?[\d.]+)/g;
    let _m3;
    while ((_m3 = _re3.exec(_cpath3)) !== null) _pts3.push(`${_m3[1]}px ${_m3[2]}px`);
    return _pts3.length >= 3 ? `polygon(${_pts3.join(', ')})` : 'none';
  }
  if (sh.special === 'curve') {
    // For stroke-only curve (no fill): element itself passes clicks through
    // SVG path handles clicks via pointer-events="visibleStroke"
    return 'curve-nofill';
  }
  if (sh.special === 'cloud') return 'cloud'; // cloud uses SVG-based blur, handled specially
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

  // Cloud: use an SVG overlay with feGaussianBlur + clip to shape
  if (cp === 'cloud') {
    const cloudD = slides[cur] && slides[cur].els.find(x => x.id === el.dataset.id);
    const seed = cloudD && cloudD.cloudSeed || 42;
    const cloudPath = typeof _generateCloudPath === 'function' ? _generateCloudPath(w, h, seed) : null;
    if (cloudPath) {
      const clipId = `cblur_${el.dataset.id}`;
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('width', w); svg.setAttribute('height', h);
      svg.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:0;overflow:visible;';
      const defs = document.createElementNS(svgNS, 'defs');
      const filterId = `cblur_f_${el.dataset.id}`;
      const filter = document.createElementNS(svgNS, 'filter');
      filter.setAttribute('id', filterId);
      filter.setAttribute('x', '-20%'); filter.setAttribute('y', '-20%');
      filter.setAttribute('width', '140%'); filter.setAttribute('height', '140%');
      const fe = document.createElementNS(svgNS, 'feGaussianBlur');
      fe.setAttribute('stdDeviation', blur);
      fe.setAttribute('in', 'SourceGraphic');
      filter.appendChild(fe);
      const clipPathEl = document.createElementNS(svgNS, 'clipPath');
      clipPathEl.setAttribute('id', clipId);
      const clipShape = document.createElementNS(svgNS, 'path');
      clipShape.setAttribute('d', cloudPath);
      clipShape.setAttribute('fill-rule', 'nonzero');
      clipPathEl.appendChild(clipShape);
      defs.appendChild(filter);
      defs.appendChild(clipPathEl);
      svg.appendChild(defs);
      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('width', w); rect.setAttribute('height', h);
      rect.setAttribute('fill', 'transparent');
      rect.setAttribute('clip-path', `url(#${clipId})`);
      rect.setAttribute('filter', `url(#${filterId})`);
      svg.appendChild(rect);
      svg.className = 'shape-blur-overlay';
      el.insertBefore(svg, el.firstChild);
      return;
    }
  }

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
    return;
  }
  // Curve: when no fill, el passes clicks through; SVG path handles via visibleStroke
  if (sh && sh.special === 'curve') {
    // Element bbox passes clicks through to elements below
    el.style.pointerEvents = 'none';
    const svgEl = el.querySelector('svg');
    if (svgEl) {
      // Set pointer-events as SVG attribute on SVG element:
      // 'none' makes SVG transparent, but child path attributes still work
      svgEl.setAttribute('pointer-events', 'none');
      svgEl.style.pointerEvents = '';
      svgEl.querySelectorAll('path').forEach(path => {
        const fillAttr = path.getAttribute('fill');
        const hasFill2 = fillAttr && fillAttr !== 'none';
        // Use SVG attribute on paths to override parent 'none'
        path.setAttribute('pointer-events', hasFill2 ? 'visibleFill' : 'visibleStroke');
        path.style.cursor = 'move';
      });
    }
    return;
  }
  // Cloud: SVG paths handle accurate hit detection
  if (sh && sh.special === 'cloud') {
    // Keep el.pointerEvents AUTO so elementsFromPoint can find cloud
    el.style.pointerEvents = 'none';
    const svgEl = el.querySelector('svg');
    if (svgEl) {
      svgEl.setAttribute('pointer-events', 'none');
      svgEl.style.pointerEvents = '';
      // Only the fill path catches clicks (accurate cloud shape hit-testing)
      const paths = svgEl.querySelectorAll('path');
      paths.forEach((p, idx) => {
        if (idx === 0) {
          p.setAttribute('pointer-events', 'visibleFill');
          p.style.cursor = 'move';
        } else {
          p.setAttribute('pointer-events', 'none');
        }
      });
    }
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
// Arc path helper: cx,cy=center, rx,ry=radii, a1/a2=degrees (0=top, CW), mode=sector|chord
function _arcPath(cx, cy, rx, ry, a1, a2, mode, m, cornerR) {
  const erx = Math.max(1, rx - m), ery = Math.max(1, ry - m);
  const cr  = Math.max(0, cornerR || 0);
  const toRad = a => (a - 90) * Math.PI / 180;
  const r1 = toRad(a1), r2 = toRad(a2);
  const x1 = cx + erx*Math.cos(r1), y1 = cy + ery*Math.sin(r1);
  const x2 = cx + erx*Math.cos(r2), y2 = cy + ery*Math.sin(r2);
  const diff = ((a2 - a1) % 360 + 360) % 360;
  const large = diff > 180 ? 1 : 0;

  if (cr <= 0) {
    if (mode === 'sector')
      return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${erx} ${ery} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${erx} ${ery} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  }

  function unit(ax,ay,bx,by){const l=Math.hypot(bx-ax,by-ay)||1;return[(bx-ax)/l,(by-ay)/l];}
  function cwTan(rad){const tx=-erx*Math.sin(rad),ty=ery*Math.cos(rad);const l=Math.hypot(tx,ty)||1;return[tx/l,ty/l];}

  // Round a straight corner (no arc involved)
  function rcStraight(vx,vy,u1x,u1y,max1,u2x,u2y,max2){
    const r=Math.min(cr,max1,max2); if(r<0.5) return null;
    const p1x=vx+u1x*r,p1y=vy+u1y*r,p2x=vx+u2x*r,p2y=vy+u2y*r;
    const cosA=Math.max(-1,Math.min(1,u1x*u2x+u1y*u2y));
    const k=Math.max((4/3)*Math.tan(Math.acos(cosA)/4),0.55);
    return{p1x,p1y,cp1x:p1x-u1x*r*k,cp1y:p1y-u1y*r*k,
           p2x,p2y,cp2x:p2x-u2x*r*k,cp2y:p2y-u2y*r*k};
  }

  // How many degrees to offset arc endpoints for rounding
  // Limit to at most 35% of total arc so the shape stays recognisable
  const avgR = (erx + ery) / 2;
  const angStep = Math.min(cr / (avgR * Math.PI / 180), diff * 0.35);

  // Arc anchor points (on ellipse, offset from endpoints by angStep)
  const a1off = a1 + angStep, a2off = a2 - angStep;
  const ra1 = toRad(a1off), ra2 = toRad(a2off);
  const ax1 = cx + erx*Math.cos(ra1), ay1 = cy + ery*Math.sin(ra1);
  const ax2 = cx + erx*Math.cos(ra2), ay2 = cy + ery*Math.sin(ra2);
  const diffNew = ((a2off - a1off) % 360 + 360) % 360;
  const largeNew = diffNew > 180 ? 1 : 0;

  // Bezier transition from straight line into arc:
  // lineAnchor = point on straight line, distance r from arcEndpoint
  // arcAnchor  = point on ellipse angStep into arc
  // cp1: near lineAnchor, pulled along line toward arcEndpoint
  // cp2: near arcAnchor,  pulled along REVERSE arc tangent (ensures tangent continuity)
  function arcEntry(arcEndX, arcEndY, arcEndRad, lineUx, lineUy, arcAnchorX, arcAnchorY, arcAnchorRad) {
    const r = Math.min(cr, Math.hypot(arcEndX-cx, arcEndY-cy) * 0.45);
    const lax = arcEndX + lineUx*r, lay = arcEndY + lineUy*r;
    const cp1x = lax - lineUx*r*0.55, cp1y = lay - lineUy*r*0.55;
    // cp2: tangent-continuous arrival at arcAnchor
    const [tax,tay] = cwTan(arcAnchorRad);
    const chord = Math.hypot(arcAnchorX-arcEndX, arcAnchorY-arcEndY);
    const cp2x = arcAnchorX - tax*chord*0.45, cp2y = arcAnchorY - tay*chord*0.45;
    return {lax,lay,cp1x,cp1y,cp2x,cp2y};
  }

  // Exit from arc into straight line (reversed):
  function arcExit(arcEndX, arcEndY, arcEndRad, lineUx, lineUy, arcAnchorX, arcAnchorY, arcAnchorRad) {
    const r = Math.min(cr, Math.hypot(arcEndX-cx, arcEndY-cy) * 0.45);
    const lax = arcEndX + lineUx*r, lay = arcEndY + lineUy*r;
    const cp2x = lax - lineUx*r*0.55, cp2y = lay - lineUy*r*0.55;
    const [tax,tay] = cwTan(arcAnchorRad);
    const chord = Math.hypot(arcAnchorX-arcEndX, arcAnchorY-arcEndY);
    const cp1x = arcAnchorX + tax*chord*0.45, cp1y = arcAnchorY + tay*chord*0.45;
    return {lax,lay,cp1x,cp1y,cp2x,cp2y};
  }

  if (mode === 'sector') {
    const side = Math.hypot(x1-cx,y1-cy);
    const maxS = side * 0.45;

    // Entry at arc-start (x1,y1): line from cx, enters arc
    const [lu1x,lu1y] = unit(x1,y1,cx,cy);
    const eS = arcEntry(x1,y1,r1, lu1x,lu1y, ax1,ay1,ra1);

    // Exit at arc-end (x2,y2): arc exits to cx
    const [lu2x,lu2y] = unit(x2,y2,cx,cy);
    const eE = arcExit(x2,y2,r2, lu2x,lu2y, ax2,ay2,ra2);

    // Straight corner at center
    const [u5x,u5y]=unit(cx,cy,x2,y2);
    const [u6x,u6y]=unit(cx,cy,x1,y1);
    const cC = rcStraight(cx,cy, u5x,u5y,maxS, u6x,u6y,maxS);
    if (!cC) return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${erx} ${ery} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

    return `M ${cC.p2x.toFixed(2)} ${cC.p2y.toFixed(2)}`
      +` L ${eS.lax.toFixed(2)} ${eS.lay.toFixed(2)}`
      +` C ${eS.cp1x.toFixed(2)} ${eS.cp1y.toFixed(2)} ${eS.cp2x.toFixed(2)} ${eS.cp2y.toFixed(2)} ${ax1.toFixed(2)} ${ay1.toFixed(2)}`
      +` A ${erx} ${ery} 0 ${largeNew} 1 ${ax2.toFixed(2)} ${ay2.toFixed(2)}`
      +` C ${eE.cp1x.toFixed(2)} ${eE.cp1y.toFixed(2)} ${eE.cp2x.toFixed(2)} ${eE.cp2y.toFixed(2)} ${eE.lax.toFixed(2)} ${eE.lay.toFixed(2)}`
      +` L ${cC.p1x.toFixed(2)} ${cC.p1y.toFixed(2)}`
      +` C ${cC.cp1x.toFixed(2)} ${cC.cp1y.toFixed(2)} ${cC.cp2x.toFixed(2)} ${cC.cp2y.toFixed(2)} ${cC.p2x.toFixed(2)} ${cC.p2y.toFixed(2)} Z`;
  }

  // CHORD
  const chLen = Math.hypot(x2-x1,y2-y1);
  const maxR  = chLen * 0.45;
  const [chx,chy] = unit(x1,y1,x2,y2);

  const eS = arcEntry(x1,y1,r1,  chx, chy, ax1,ay1,ra1);
  const eE = arcExit (x2,y2,r2, -chx,-chy, ax2,ay2,ra2);

  return `M ${eS.lax.toFixed(2)} ${eS.lay.toFixed(2)}`
    +` C ${eS.cp1x.toFixed(2)} ${eS.cp1y.toFixed(2)} ${eS.cp2x.toFixed(2)} ${eS.cp2y.toFixed(2)} ${ax1.toFixed(2)} ${ay1.toFixed(2)}`
    +` A ${erx} ${ery} 0 ${largeNew} 1 ${ax2.toFixed(2)} ${ay2.toFixed(2)}`
    +` C ${eE.cp1x.toFixed(2)} ${eE.cp1y.toFixed(2)} ${eE.cp2x.toFixed(2)} ${eE.cp2y.toFixed(2)} ${eE.lax.toFixed(2)} ${eE.lay.toFixed(2)}`
    +` L ${eS.lax.toFixed(2)} ${eS.lay.toFixed(2)} Z`;
}


// Build star path: n rays, outer radius erx/ery, inner radius ratio innerR
function _starPath(cx, cy, erx, ery, nRays, innerR, cornerR) {
  nRays = Math.max(4, Math.min(32, nRays));
  const ir = Math.max(0.1, Math.min(0.9, innerR));
  const pts = [];
  for (let i = 0; i < nRays * 2; i++) {
    const angle = (i / (nRays * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 1 : ir;
    pts.push({ x: cx + erx * r * Math.cos(angle), y: cy + ery * r * Math.sin(angle) });
  }
  if (cornerR > 0) return _roundedPolygonPath(pts, cornerR);
  return 'M ' + pts.map(p => p.x.toFixed(2) + ',' + p.y.toFixed(2)).join(' L ') + ' Z';
}


// ══════════════ CLOUD SHAPE GENERATOR ══════════════
function _generateCloudPath(w, h, seed) {
  let s = (seed || 42) >>> 0;
  function rnd() {
    s += 0x6D2B79F5; let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 0xFFFFFFFF;
  }

  const cloudW=w*0.78, cloudH=h*0.56;
  const ox=(w-cloudW)/2, oy=(h-cloudH)/2;
  const bigR=Math.min(cloudW,cloudH)*0.26, smallR=bigR/3;
  const n=14+Math.floor(rnd()*7); // 14-20 circles

  // Grow circles from center
  const circles=[];
  circles.push({cx:w/2,cy:h/2,r:bigR*(0.9+rnd()*0.2)});
  for(let att=0;circles.length<n&&att<4000;att++){
    const par=circles[Math.floor(rnd()*circles.length)];
    const ang=rnd()*Math.PI*2;
    const dfc=Math.min(1,Math.hypot(par.cx-w/2,par.cy-h/2)/(Math.min(cloudW,cloudH)*0.5));
    const nr=(bigR-(bigR-smallR)*dfc)*(0.7+rnd()*0.6);
    const gap=par.r+nr*(0.4+rnd()*0.4);
    const cx=par.cx+Math.cos(ang)*gap, cy=par.cy+Math.sin(ang)*gap;
    if(cx-nr<ox||cx+nr>ox+cloudW||cy-nr<oy||cy+nr>oy+cloudH) continue;
    circles.push({cx,cy,r:nr});
  }

  // Build path as union of circles using SVG's fill-rule:evenodd trick
  // Simply render each circle as a separate subpath — SVG nonzero fill will union them
  let main='';
  for(const c of circles){
    const {cx,cy,r}=c;
    main+=`M ${(cx-r).toFixed(2)} ${cy.toFixed(2)} `+
          `A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 1 ${(cx+r).toFixed(2)} ${cy.toFixed(2)} `+
          `A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 1 ${(cx-r).toFixed(2)} ${cy.toFixed(2)} Z `;
  }

  // Small decorative circles outside main cloud
  const nDeco=7+Math.floor(rnd()*5);
  const minD=Math.min(w,h)*0.012, maxD=Math.min(w,h)*0.030;
  for(let dAtt=0,nd=0;nd<nDeco&&dAtt<3000;dAtt++){
    const par=circles[Math.floor(rnd()*circles.length)];
    const ang=rnd()*Math.PI*2;
    const dr=minD+rnd()*(maxD-minD);
    const gap=par.r+dr*(1.3+rnd()*1.5);
    const cx=par.cx+Math.cos(ang)*gap, cy=par.cy+Math.sin(ang)*gap;
    if(cx-dr<0||cx+dr>w||cy-dr<0||cy+dr>h) continue;
    let inside=false;
    for(const mc of circles){const dx=cx-mc.cx,dy=cy-mc.cy;if(dx*dx+dy*dy<(mc.r+dr*0.3)*(mc.r+dr*0.3)){inside=true;break;}}
    if(inside) continue;
    main+=`M ${(cx-dr).toFixed(2)} ${cy.toFixed(2)} `+
          `A ${dr.toFixed(2)} ${dr.toFixed(2)} 0 1 1 ${(cx+dr).toFixed(2)} ${cy.toFixed(2)} `+
          `A ${dr.toFixed(2)} ${dr.toFixed(2)} 0 1 1 ${(cx-dr).toFixed(2)} ${cy.toFixed(2)} Z `;
    nd++;
  }

  return main.trim();
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
      const _isCurveEl = d.shape==='curve';
      if(_isCurveEl){
        // SVG attr 'none' makes element transparent; child paths override with their own attrs
        svgEl.setAttribute('pointer-events','none');
        svgEl.style.pointerEvents='';
        // paths already have pointer-events in their SVG markup from buildShapeSVG
      } else {
        svgEl.style.pointerEvents='none';
        svgEl.querySelectorAll('path,rect,ellipse,circle,polygon,polyline').forEach(p=>{
          p.style.pointerEvents='visibleFill';p.style.cursor='move';
        });
      }
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
  // For curve: per-node or global sw handling
  const _isCurve = d.shape==='curve' && d.curvePoints;
  const _selNodes = typeof _curveSelPts!=='undefined' && _curveSelPts.size>0;
  if(_isCurve && (prop==='sw'||prop==='strokeStyle')) {
    // Per-node only when in edit mode AND nodes selected
    const _inEditMode = !!window._curveEditMode;
    if(_inEditMode && _selNodes) {
      // Apply to selected nodes only
      _curveSelPts.forEach(i=>{
        const pt=d.curvePoints[i]; if(!pt)return;
        if(prop==='sw') pt.sw=+val;
        else if(prop==='strokeStyle') pt.strokeStyle=val;
      });
    } else {
      // Not in edit mode, or no nodes selected: apply globally — clear all per-node overrides
      if(prop==='sw') {
        d.sw=+val; sel.dataset.sw=val;
        d.curvePoints.forEach(pt=>{ delete pt.sw; });
      } else {
        d.strokeStyle=val; sel.dataset.strokeStyle=val;
        d.curvePoints.forEach(pt=>{ delete pt.strokeStyle; });
      }
    }
    sel.dataset.curvePoints=JSON.stringify(d.curvePoints);
    renderShapeEl(sel,d);save();drawThumbs();saveState();
    if(typeof syncProps==='function') syncProps();
    return;
  }
  if(prop==='fill'){d.fill=val;sel.dataset.fill=val;}
  else if(prop==='stroke'){d.stroke=val;sel.dataset.stroke=val;}
  else if(prop==='sw'){d.sw=+val;sel.dataset.sw=val;}
  else if(prop==='strokeStyle'){d.strokeStyle=val;sel.dataset.strokeStyle=val;}
  else if(prop==='rx'){d.rx=+val;sel.dataset.rx=val;}
  else if(prop==='fillOp'){d.fillOp=+val;sel.dataset.fillOp=val;}
  else if(prop==='shadow'){d.shadow=val;sel.dataset.shadow=val;}
  else if(prop==='shadowBlur'){d.shadowBlur=+val;sel.dataset.shadowBlur=val;}
  else if(prop==='shadowColor'){d.shadowColor=val;sel.dataset.shadowColor=val;if(d.shadowColorScheme===undefined)d.shadowColorScheme=null;}
  renderShapeEl(sel,d);save();drawThumbs();saveState();
  if(typeof syncProps==='function') syncProps();
}
function updateShapeStyleScheme(prop, val, schemeRef) {
  if(sel && slides[cur]) {
    const d = slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d) {
      const _sr = schemeRef !== undefined ? (schemeRef || null) : undefined;
      if(prop==='fill') {
        d.fillScheme = _sr !== undefined ? _sr : d.fillScheme;
        d.fill = val; sel.dataset.fill = val;
      } else if(prop==='stroke') {
        d.strokeScheme = _sr !== undefined ? _sr : d.strokeScheme;
        d.stroke = val; sel.dataset.stroke = val;
      } else if(prop==='shadowColor') {
        d.shadowColorScheme = _sr !== undefined ? _sr : d.shadowColorScheme;
        d.shadowColor = val; sel.dataset.shadowColor = val;
        if(d.shadowColorScheme!=null) sel.dataset.shadowColorScheme = JSON.stringify(d.shadowColorScheme);
        else delete sel.dataset.shadowColorScheme;
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
