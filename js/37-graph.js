// ══════════════ FORMULA GRAPH ══════════════
// type:'graph', linkedFormulaId, graphExpr, graphLatex, graphImg, graphColor, graphBg, graphDark

(function(){

// ── LaTeX → JS expression ───────────────────────────────────────────────────
// Парсит условие вида "x > 0", "x <= 0", "x \geq 2" из строки LaTeX
// Возвращает {xMin, xMax} или null
function _parseCondition(raw){
  // Убираем LaTeX команды для сравнений
  let s = raw
    .replace(/\\geq/g, '>=').replace(/\\leq/g, '<=')
    .replace(/\\gt/g, '>').replace(/\\lt/g, '<')
    .replace(/\\ge/g, '>=').replace(/\\le/g, '<=')
    .trim();

  // Ищем паттерны: x > n, x < n, x >= n, x <= n, n < x < m и т.д.
  // Нормализуем: убираем пробелы вокруг операторов
  s = s.replace(/\s*([<>]=?)\s*/g, '$1');

  let xMin = -Infinity, xMax = Infinity;

  // x >= n или x > n
  let m = s.match(/^x(>=?|<=?)(-?[\d.]+)$/);
  if(m){
    const [,op,val] = m; const v = parseFloat(val);
    if(op === '>'  || op === '>=') xMin = v;
    if(op === '<'  || op === '<=') xMax = v;
    return {xMin, xMax};
  }
  // n <= x или n < x
  m = s.match(/^(-?[\d.]+)(>=?|<=?)x$/);
  if(m){
    const [,val,op] = m; const v = parseFloat(val);
    if(op === '<'  || op === '<=') xMin = v;
    if(op === '>'  || op === '>=') xMax = v;
    return {xMin, xMax};
  }
  // n < x < m
  m = s.match(/^(-?[\d.]+)(>=?|<=?)x(>=?|<=?)(-?[\d.]+)$/);
  if(m){
    const [,v1,op1,,v2] = m;
    xMin = parseFloat(v1); xMax = parseFloat(v2);
    return {xMin, xMax};
  }
  return null;
}

// Разбирает строку вида "y = x^2, x > 0" на {expr, condition}
function _splitCondition(raw){
  // Ищем запятую после основной формулы
  const commaIdx = raw.lastIndexOf(',');
  if(commaIdx < 0) return {expr: raw, cond: null};
  const main = raw.slice(0, commaIdx).trim();
  const condStr = raw.slice(commaIdx + 1).trim();
  const cond = _parseCondition(condStr);
  return {expr: main, cond};
}

function _latexToExpr(raw){

  // Extract balanced {…} content starting at index i, return [content, endIdx]
  function _braces(s, i){
    if(s[i]!=='{') return [s[i]||'', i+1];
    let d=0, j=i;
    for(;j<s.length;j++){ if(s[j]==='{')d++; else if(s[j]==='}'){d--;if(d===0)return[s.slice(i+1,j),j+1];} }
    return [s.slice(i+1), s.length];
  }

  function _conv(t){
    t = t.trim();

    // |expr| absolute value (innermost first)
    for(let i=0;i<10;i++){
      const r = t.replace(/\|([^|]+)\|/g,'abs($1)');
      if(r===t) break; t=r;
    }
    t = t.replace(/\\left\s*\|/g,'abs_OPEN_').replace(/\\right\s*\|/g,'_CLOSE_abs');
    t = t.replace(/abs_OPEN_([\s\S]*?)_CLOSE_abs/g,'abs($1)');

    // \left \right
    t = t.replace(/\\left\s*[\(\[{]/g,'(').replace(/\\right\s*[\)\]}]/g,')');

    // \frac — handle nested braces via brace extractor
    let changed = true;
    while(changed){
      changed = false;
      const fi = t.indexOf('\\frac');
      if(fi<0) break;
      let p = fi+5;
      while(p<t.length && t[p]===' ') p++;
      const [num, p2] = _braces(t, p);
      let p3 = p2; while(p3<t.length && t[p3]===' ') p3++;
      const [den, p4] = _braces(t, p3);
      t = t.slice(0,fi) + '((_NUM_)/(_DEN_))'.replace('_NUM_',num).replace('_DEN_',den) + t.slice(p4);
      changed = true;
    }

    // \sqrt[n]{x}
    t = t.replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]*)\}/g,'pow($2,1/($1))');
    // \sqrt{x} — handle nested braces
    changed = true;
    while(changed){
      changed = false;
      const si = t.indexOf('\\sqrt');
      if(si<0) break;
      let p = si+5; while(p<t.length && t[p]===' ') p++;
      if(t[p]!=='{') break;
      const [arg, p2] = _braces(t, p);
      t = t.slice(0,si) + 'sqrt(' + arg + ')' + t.slice(p2);
      changed = true;
    }
    t = t.replace(/\\sqrt\s+([^\s{(\\])/g,'sqrt($1)');

    // math functions
    t = t.replace(/\\arcsin\b/g,'asin').replace(/\\arccos\b/g,'acos').replace(/\\arctan\b/g,'atan');
    t = t.replace(/\\sinh\b/g,'sinh').replace(/\\cosh\b/g,'cosh').replace(/\\tanh\b/g,'tanh');
    t = t.replace(/\\sin\b/g,'sin').replace(/\\cos\b/g,'cos').replace(/\\tan\b/g,'tan');
    t = t.replace(/\\cot\b/g,'(cos(x)/sin(x))');
    t = t.replace(/\\ln\b/g,'log').replace(/\\log\b/g,'log10').replace(/\\exp\b/g,'exp');
    t = t.replace(/\\abs\s*\{([^{}]*)\}/g,'abs($1)');
    t = t.replace(/\\lfloor\s*([^{}]*?)\\rfloor/g,'floor($1)');
    t = t.replace(/\\lceil\s*([^{}]*?)\\rceil/g,'ceil($1)');

    // constants / operators
    t = t.replace(/\\pi\b/g,'PI').replace(/\\e\b/g,'E').replace(/\\infty/g,'Infinity');
    t = t.replace(/\\cdot/g,'*').replace(/\\times/g,'*').replace(/\\div/g,'/');
    t = t.replace(/\\pm/g,'+');

    // exponents — AFTER frac/sqrt
    for(let i=0;i<6;i++){
      const r = t.replace(/\^\s*\{([^{}]*)\}/g,'**($1)');
      if(r===t) break; t=r;
    }
    t = t.replace(/\^\s*([0-9a-zA-Z])/g,'**$1');

    // subscripts remove
    t = t.replace(/\_\s*\{[^{}]*\}/g,'').replace(/\_[0-9a-zA-Z]/g,'');

    // strip remaining commands and braces
    t = t.replace(/\\[a-zA-Z]+/g,'').replace(/[{}]/g,'');

    // implicit multiplication
    t = t.replace(/\)\s*\(/g,')*(');
    t = t.replace(/\)\s*([0-9a-zA-Z])/g,')*$1');
    t = t.replace(/([0-9])\s*([a-zA-Z(])/g,'$1*$2');
    t = t.replace(/\*\*\*/g,'**');   // fix x***y → x**y

    return t.trim();
  }

  let s = raw.trim().replace(/^\$+|\$+$/g,'').replace(/^\\[\(\[]|\\[\)\]]$/g,'').trim();

  const eqIdx = s.search(/(?<![\\<>!])=/);
  if(eqIdx >= 0){
    const lhs = _conv(s.slice(0, eqIdx).trim());
    const rhs = _conv(s.slice(eqIdx+1).trim());
    if(/^\s*[yY]\s*$/.test(lhs) || /^\s*f\s*\(\s*x\s*\)\s*$/.test(lhs)) return rhs;
    if(/^\s*[yY]\s*$/.test(rhs)) return lhs;
    return '('+rhs+')-('+lhs+')';
  }
  return _conv(s);
}

function _makeEvalFn(expr){
  try {
    const fn = new Function('x',`
      var abs=Math.abs, sqrt=Math.sqrt, cbrt=Math.cbrt,
          sin=Math.sin, cos=Math.cos, tan=Math.tan,
          asin=Math.asin, acos=Math.acos, atan=Math.atan, atan2=Math.atan2,
          sinh=Math.sinh, cosh=Math.cosh, tanh=Math.tanh,
          log=Math.log, log2=Math.log2, log10=Math.log10, exp=Math.exp,
          PI=Math.PI, E=Math.E, pow=Math.pow,
          min=Math.min, max=Math.max, floor=Math.floor, ceil=Math.ceil,
          round=Math.round, sign=Math.sign, hypot=Math.hypot, trunc=Math.trunc;
      return (${expr});
    `);
    fn(0); fn(1); fn(-1); fn(0.5);
    return fn;
  } catch(e){ return null; }
}

// Convert LaTeX to readable plain text for graph label
function _latexToText(raw){
  return raw
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
    .replace(/\\sqrt\s+(\S+)/g, '√$1')
    .replace(/\^{([^}]*)}/g, '^$1')
    .replace(/_{([^}]*)}/g, '_$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\infty/g, '∞')
    .replace(/\\pi/g, 'π')
    .replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β').replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ').replace(/\\theta/g, 'θ').replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ').replace(/\\sigma/g, 'σ').replace(/\\omega/g, 'ω')
    .replace(/\\sin/g, 'sin').replace(/\\cos/g, 'cos').replace(/\\tan/g, 'tan')
    .replace(/\\ln/g, 'ln').replace(/\\log/g, 'log').replace(/\\exp/g, 'exp')
    .replace(/\\[a-zA-Z]+/g, '')   // remove remaining commands
    .replace(/[{}]/g, '')           // remove braces
    .replace(/\s+/g, ' ').trim();
}

// Clean label: convert LaTeX → readable text, show as-is
function _niceLabel(raw){
  const text = _latexToText(raw.trim());
  return text.length > 36 ? text.slice(0, 34) + '…' : text;
}

// ── Core renderer ───────────────────────────────────────────────────────────
function _renderGraph(exprsOrExpr, latexLabelOrLines, opts){
  // Support both single expr (legacy) and array of exprs
  const exprList = Array.isArray(exprsOrExpr) ? exprsOrExpr : [exprsOrExpr];
  const labelList = Array.isArray(latexLabelOrLines) ? latexLabelOrLines : [latexLabelOrLines];
  const W = opts.w || 800, H = opts.h || 560;
  const xMin = opts.xMin != null ? opts.xMin : -10;
  const xMax = opts.xMax != null ? opts.xMax :  10;
  const userYMin = opts.yMin != null ? opts.yMin : null;
  const userYMax = opts.yMax != null ? opts.yMax : null;
  const userStep = opts.step > 0 ? opts.step : null;
  const color     = opts.color  || '#6366f1';
  const bg        = opts.bg     || '#16161e';
  const isDark    = opts.isDark !== false;
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const axisColor = isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.38)';
  const tickColor = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.50)';

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,W,H);

  const xRange = xMax - xMin;
  const pxPerUnit = W / xRange;   // equal scale base

  function niceStep(range, target){
    const rough = range/target, p = Math.pow(10, Math.floor(Math.log10(rough))), f = rough/p;
    if(f < 1.5) return p; if(f < 3.5) return 2*p; if(f < 7.5) return 5*p; return 10*p;
  }

  // Step: use exactly what user specified, otherwise auto from X axis
  const step = userStep || niceStep(xRange, 8);

  // Y range
  let yMin, yMax;
  if(userYMin != null && userYMax != null){
    // Explicit Y range
    yMin = userYMin; yMax = userYMax;
  } else {
    // Equal scale: center on origin (0,0)
    const yRange = H / pxPerUnit;
    yMin = -yRange / 2;
    yMax =  yRange / 2;
  }

  const yRange2 = yMax - yMin;
  const toX = x => (x - xMin) / xRange * W;
  const toY = y => H - (y - yMin) / yRange2 * H;

  const tickFs = Math.round(W * 0.017);

  // Grid X
  const xS = Math.ceil(xMin / step - 1e-9) * step;
  for(let gx = xS; gx <= xMax + step*0.01; gx += step){
    const px = toX(gx), isAxis = Math.abs(gx) < step * 0.01;
    ctx.strokeStyle = isAxis ? axisColor : gridColor;
    ctx.lineWidth   = isAxis ? 1.5 : 1;
    ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,H); ctx.stroke();
    if(!isAxis){
      ctx.fillStyle = tickColor; ctx.font = tickFs+'px system-ui,sans-serif'; ctx.textAlign = 'center';
      const ly = Math.min(H-6, Math.max(tickFs+2, toY(0)+tickFs+4));
      ctx.fillText(+gx.toPrecision(4), px, ly);
    }
  }

  // Grid Y
  const yS = Math.ceil(yMin / step - 1e-9) * step;
  for(let gy = yS; gy <= yMax + step*0.01; gy += step){
    const py = toY(gy), isAxis = Math.abs(gy) < step * 0.01;
    ctx.strokeStyle = isAxis ? axisColor : gridColor;
    ctx.lineWidth   = isAxis ? 1.5 : 1;
    ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(W,py); ctx.stroke();
    if(!isAxis){
      ctx.fillStyle = tickColor; ctx.font = tickFs+'px system-ui,sans-serif'; ctx.textAlign = 'right';
      const lx = Math.min(W-6, Math.max(30, toX(0)-6));
      ctx.fillText(+gy.toPrecision(4), lx, py+4);
    }
  }

  const steps = W * 3, dxStep = xRange / steps;

  // Axis arrows
  const ax0=toX(0), ay0=toY(0);
  const aw=5, al=8;
  ctx.fillStyle=axisColor; ctx.strokeStyle=axisColor; ctx.globalAlpha=1;
  if(ay0>=0&&ay0<=H){
    ctx.beginPath(); ctx.moveTo(W-1,ay0); ctx.lineTo(W-1-al,ay0-aw/2); ctx.lineTo(W-1-al,ay0+aw/2); ctx.closePath(); ctx.fill();
    ctx.fillStyle=axisColor; ctx.font=(tickFs-1)+'px system-ui,sans-serif'; ctx.textAlign='right';
    ctx.fillText('x', W-2, ay0-6);
  }
  if(ax0>=0&&ax0<=W){
    ctx.beginPath(); ctx.moveTo(ax0,1); ctx.lineTo(ax0-aw/2,1+al); ctx.lineTo(ax0+aw/2,1+al); ctx.closePath(); ctx.fill();
    ctx.fillStyle=axisColor; ctx.font=(tickFs-1)+'px system-ui,sans-serif'; ctx.textAlign='left';
    ctx.fillText('y', ax0+5, tickFs+2);
  }

  const lineColors = opts.lineColors || [color,'#34d399','#f472b6','#fbbf24','#67e8f9','#fb923c','#a78bfa'];

  // Build fns for all exprs — skip unparseable
  const fns = exprList.map(e => _makeEvalFn(e));
  if(fns.every(f => !f)) return { cv, _labelInfos: [], error: 'parse error' };

  // ── Draw all curves, save pts for label placement ────────────────────────
  const allPtsArrays = [];

  const condList = opts.conditions || [];

  fns.forEach((fn, fi) => {
    if(!fn){ allPtsArrays.push([]); return; }
    const curveColor = lineColors[fi % lineColors.length];
    const cond = condList[fi] || null;
    // Ограничения по условию: xMin/xMax для этой кривой
    const cxMin = (cond && cond.xMin != null && isFinite(cond.xMin)) ? Math.max(xMin, cond.xMin) : xMin;
    const cxMax = (cond && cond.xMax != null && isFinite(cond.xMax)) ? Math.min(xMax, cond.xMax) : xMax;

    const pts = [];
    let prevY2 = null;
    for(let i=0;i<=steps;i++){
      const x = xMin + i*dxStep;
      // Пропускаем точки вне условия
      if(x < cxMin - 1e-10 || x > cxMax + 1e-10){ pts.push(null); prevY2=null; continue; }
      let y;
      try{ y=fn(x); }catch(e){ pts.push(null); prevY2=null; continue; }
      if(!isFinite(y)||isNaN(y)){ pts.push(null); prevY2=null; continue; }
      if(prevY2!==null && Math.abs(y-prevY2)>yRange2*3){ pts.push(null); prevY2=null; continue; }
      pts.push({cx:toX(x), cy:toY(y)});
      prevY2=y;
    }
    allPtsArrays.push(pts);

    // Glow
    ctx.save();
    ctx.shadowColor=curveColor; ctx.shadowBlur=14; ctx.strokeStyle=curveColor;
    ctx.lineWidth=2; ctx.globalAlpha=0.25; ctx.lineJoin='round'; ctx.lineCap='round';
    ctx.beginPath(); let gp=false;
    pts.forEach(p=>{ if(!p){gp=false;return;} if(!gp){ctx.moveTo(p.cx,p.cy);gp=true;}else ctx.lineTo(p.cx,p.cy); });
    ctx.stroke(); ctx.restore();

    // Curve
    ctx.strokeStyle=curveColor; ctx.lineWidth=2.5; ctx.globalAlpha=1; ctx.lineJoin='round'; ctx.lineCap='round';
    ctx.beginPath(); let pen=false;
    pts.forEach(p=>{ if(!p){pen=false;return;} if(!pen){ctx.moveTo(p.cx,p.cy);pen=true;}else ctx.lineTo(p.cx,p.cy); });
    ctx.stroke();
  });

  // ── Collect per-curve label info ────────────────────────────────────────
  const labelFs = Math.round(W * 0.022); // smaller font
  const margin  = W * 0.08;

  // Compute candidate label position for one pts array
  function _labelCandidate(ptArr, fi){
    const valid = ptArr.filter(Boolean);
    if(valid.length <= 10) return null;
    // Sample positions spread across curve, pick one with good margin
    const fractions = [0.25, 0.35, 0.50, 0.60, 0.75, 0.85];
    let base = null, angle = 0;
    for(const frac of fractions){
      const idx = Math.floor(valid.length * frac);
      const b = valid[idx];
      if(!b) continue;
      if(b.cx < margin || b.cx > W-margin || b.cy < margin+labelFs*2 || b.cy > H-margin-labelFs*2) continue;
      // Compute tangent angle
      const behind = valid.slice(Math.max(0,idx-8), idx);
      const ahead  = valid.slice(idx+1, idx+9);
      let a = 0;
      if(behind.length && ahead.length){
        const bk=behind[behind.length-1], ah=ahead[0];
        a = Math.atan2(ah.cy-bk.cy, ah.cx-bk.cx);
      }
      if(a > Math.PI/2 || a < -Math.PI/2) a += Math.PI;
      base = b; angle = a; break;
    }
    if(!base) return null;
    // Place label above the curve (perpendicular offset)
    const perpAngle = angle - Math.PI/2;
    const offset = labelFs * 2.5;
    return {
      lx: base.cx + Math.cos(perpAngle)*offset,
      ly: base.cy + Math.sin(perpAngle)*offset,
      angle, labelFs,
      color: lineColors[fi % lineColors.length],
      latex: labelList[fi] || exprList[fi] || '',
      bg, isDark
    };
  }

  // Build initial candidates
  let labelInfos = allPtsArrays.map((arr, fi) => _labelCandidate(arr, fi)).filter(Boolean);

  // Push apart overlapping labels (simple iterative repulsion)
  const minDist = labelFs * 3.5;
  for(let iter=0; iter<8; iter++){
    for(let a=0; a<labelInfos.length; a++){
      for(let b=a+1; b<labelInfos.length; b++){
        const dx = labelInfos[b].lx - labelInfos[a].lx;
        const dy = labelInfos[b].ly - labelInfos[a].ly;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist < minDist && dist > 0){
          const push = (minDist - dist) / 2;
          const nx = dx/dist, ny = dy/dist;
          labelInfos[a].lx -= nx*push; labelInfos[a].ly -= ny*push;
          labelInfos[b].lx += nx*push; labelInfos[b].ly += ny*push;
        }
      }
    }
    // Clamp to canvas
    labelInfos.forEach(li => {
      li.lx = Math.max(margin, Math.min(W-margin, li.lx));
      li.ly = Math.max(labelFs*2, Math.min(H-labelFs*2, li.ly));
    });
  }

  // Return canvas + array of label infos
  return { cv, _labelInfos: labelInfos, error: null };
}

// ── Async: draw all MathJax labels onto finished canvas ──────────────────────
async function _addMathLabel(renderResult){
  const {cv, _labelInfos, error} = renderResult;
  if(error) return { dataUrl: cv.toDataURL('image/png'), error };
  if(!_labelInfos || !_labelInfos.length) return { dataUrl: cv.toDataURL('image/png'), error: null };

  // Wait for MathJax once
  const mjOk = await new Promise(resolve => {
    if(typeof window._loadMathJax === 'function')
      window._loadMathJax(err => resolve(!err));
    else resolve(false);
  });

  // Draw each label sequentially
  for(const info of _labelInfos){
    await _drawOneLabel(cv, info, mjOk);
  }
  return { dataUrl: cv.toDataURL('image/png'), error: null };
}

async function _drawOneLabel(cv, info, mjOk){
  const {lx, ly, angle, labelFs, color, latex, bg, isDark} = info;
  const ctx = cv.getContext('2d');

  let svgStr = null;
  if(mjOk && typeof MathJax !== 'undefined' && MathJax.tex2svgPromise){
    try {
      const node = await MathJax.tex2svgPromise(latex, {display: false});
      const svgEl = node.querySelector('svg');
      if(svgEl){
        svgEl.querySelectorAll('*').forEach(n => {
          const f = n.getAttribute('fill');
          if(!f || f==='black'||f==='#000'||f==='#000000') n.setAttribute('fill', color);
          if(n.getAttribute('stroke')==='black') n.setAttribute('stroke', color);
        });
        svgStr = svgEl.outerHTML;
      }
    } catch(e){ svgStr = null; }
  }

  function _drawTextLabel(){
    const label = _niceLabel(latex);
    ctx.save();
    ctx.translate(lx, ly); ctx.rotate(angle);
    ctx.font = `600 ${labelFs}px -apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif`;
    const tw = ctx.measureText(label).width;
    const pad = labelFs*0.4, pillW = tw+pad*2, pillH = labelFs*1.4;
    ctx.globalAlpha = isDark ? 0.82 : 0.88; ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-pillW/2,-pillH/2,pillW,pillH,4) : ctx.rect(-pillW/2,-pillH/2,pillW,pillH);
    ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  if(!svgStr){ _drawTextLabel(); return; }

  // MathJax SVG via Image
  await new Promise(resolve => {
    const svgH = labelFs * 2.0;
    const vbMatch = svgStr.match(/viewBox="([^"]+)"/);
    let iw = svgH * 3, ih = svgH;
    if(vbMatch){
      const parts = vbMatch[1].split(/\s+/).map(Number);
      if(parts.length===4 && parts[3]>0){ iw = svgH*(parts[2]/parts[3]); ih = svgH; }
    }
    let sizedSvg = svgStr.replace(/\swidth="[^"]*"/, '').replace(/\sheight="[^"]*"/, '')
      .replace('<svg ', `<svg width="${iw}px" height="${ih}px" `);
    const blob = new Blob([sizedSvg], {type:'image/svg+xml'});
    const url  = URL.createObjectURL(blob);
    const img  = new Image(); img.width=iw; img.height=ih;
    img.onload = () => {
      URL.revokeObjectURL(url);
      const pad=labelFs*0.45, pillW=iw+pad*2, pillH=ih+pad*1.0;
      ctx.save(); ctx.translate(lx,ly); ctx.rotate(angle);
      ctx.globalAlpha = isDark?0.84:0.90; ctx.fillStyle=bg;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-pillW/2,-pillH/2,pillW,pillH,6) : ctx.rect(-pillW/2,-pillH/2,pillW,pillH);
      ctx.fill();
      ctx.globalAlpha=1; ctx.drawImage(img,-iw/2,-ih/2,iw,ih);
      ctx.restore();
      resolve();
    };
    img.onerror = () => { URL.revokeObjectURL(url); _drawTextLabel(); resolve(); };
    img.src = url;
  });
}

// ── Refresh all graphs on theme change ─────────────────────────────────────
async function refreshAllGraphs(theme){
  if(!theme) return;
  const isDark   = theme.dark !== false;
  const newBg    = isDark ? '#16161e' : '#f0f0f5';
  const newColor = (theme.colors && theme.colors[0]) || (isDark ? '#6366f1' : '#4f46e5');
  const newLineColors = (theme.colors || []).slice(0,7);
  if(!newLineColors.length) newLineColors.push(newColor);
  for(const s of slides){
    for(const el of s.els){
      if(el.type !== 'graph') continue;
      el.graphBg = newBg; el.graphColor = newColor; el.graphDark = isDark;
      el.graphLineColors = newLineColors;
      const exprs = el.graphExprs || (el.graphExpr ? [el.graphExpr] : []);
      const lines = el.graphLines || (el.graphLatex ? [el.graphLatex] : exprs);
      const raw = _renderGraph(exprs, lines, {w:800,h:560,color:newColor,lineColors:newLineColors,bg:newBg,isDark,
        xMin:el.graphXMin??-10, xMax:el.graphXMax??10, step:el.graphStep??1,
        yMin:el.graphYMin??null, yMax:el.graphYMax??null});
      const result = await _addMathLabel(raw);
      if(!result.error) el.graphImg = result.dataUrl;
    }
  }
}
window.refreshAllGraphs = refreshAllGraphs;

// ── Delete linked graphs ────────────────────────────────────────────────────
function _deleteLinkedGraphs(formulaId){
  const s = slides[cur]; if(!s) return;
  const toDelete = s.els.filter(x => x.type==='graph' && x.linkedFormulaId===formulaId);
  toDelete.forEach(gd => {
    const domEl = document.getElementById('canvas').querySelector('[data-id="'+gd.id+'"]');
    if(domEl) domEl.remove();
    const idx = s.els.indexOf(gd);
    if(idx>=0) s.els.splice(idx,1);
  });
}
window._deleteLinkedGraphs = _deleteLinkedGraphs;

// ── Build / update graph ────────────────────────────────────────────────────
async function buildFormulaGraph(formulaEl){
  if(!formulaEl) return;
  const d = slides[cur].els.find(x => x.id===formulaEl.dataset.id);
  if(!d||d.type!=='formula'){ if(typeof toast==='function') toast('Выберите формулу','err'); return; }

  const raw  = d.formulaRaw || '';
  // Support multi-line system: formulaLines array or single raw
  let lines = (Array.isArray(d.formulaLines) && d.formulaLines.length)
    ? d.formulaLines.filter(l => l && l.trim())
    : [raw];

  // Парсим \begin{cases}...\end{cases} — система уравнений
  if(lines.length === 1){
    const casesMatch = lines[0].match(/\\begin\s*\{cases\}([\s\S]+?)\\end\s*\{cases\}/);
    if(casesMatch){
      lines = casesMatch[1]
        .split(/\\\\/)
        .map(l => l.replace(/&/g,'').trim())
        .filter(Boolean);
    }
  }
  // Также парсим \begin{pmatrix} и вертикальные системы через \\ в formulaLines
  // Если одна строка содержит \\ — разбиваем
  if(lines.length === 1 && lines[0].includes('\\\\')){
    const parts = lines[0].split('\\\\').map(l=>l.trim()).filter(Boolean);
    if(parts.length > 1) lines = parts;
  }

  if(!lines.length){ if(typeof toast==='function') toast('Не удалось разобрать формулу','err'); return; }

  // Разбираем каждую строку на выражение + условие
  const parsedLines = lines.map(l => _splitCondition(l));
  const exprs = parsedLines.map(p => _latexToExpr(p.expr)).filter(Boolean);
  const conditions = parsedLines.map(p => p.cond); // [{xMin,xMax}|null]
  if(!exprs.length){ if(typeof toast==='function') toast('Не удалось разобрать формулу','err'); return; }

  const existing = slides[cur].els.find(x => x.type==='graph' && x.linkedFormulaId===d.id);

  const _ti=typeof appliedThemeIdx!=='undefined'?appliedThemeIdx:-1;
  const _theme=_ti>=0?THEMES[_ti]:null;
  const isDark=_theme?_theme.dark!==false:true;
  const bg    =isDark?'#16161e':'#f0f0f5';
  const color =(_theme&&_theme.colors&&_theme.colors[0])||(isDark?'#6366f1':'#4f46e5');

  // Use saved range/step if updating existing graph, else defaults
  const xMin  = existing ? (existing.graphXMin ?? -10) : -10;
  const xMax  = existing ? (existing.graphXMax ??  10) :  10;
  const step  = existing ? (existing.graphStep  ??   1) :   1;
  const yMin  = existing ? (existing.graphYMin  ?? null) : null;
  const yMax  = existing ? (existing.graphYMax  ?? null) : null;

  const lineColors = (_theme&&_theme.colors) ? _theme.colors.slice(0,7) : ['#6366f1','#34d399','#f472b6','#fbbf24','#67e8f9','#fb923c','#a78bfa'];

  const raw_result = _renderGraph(exprs, lines, {w:800, h:560, color, lineColors, bg, isDark, xMin, xMax, step, yMin, yMax, conditions});
  const result = await _addMathLabel(raw_result);

  if(existing){
    pushUndo();
    existing.graphExprs=exprs; existing.graphLines=lines;
    existing.graphExpr=exprs[0]; existing.graphLatex=lines[0];
    existing.graphImg=result.dataUrl; existing.graphColor=color;
    existing.graphLineColors=lineColors;
    existing.graphBg=bg; existing.graphDark=isDark;
    existing.graphXMin=xMin; existing.graphXMax=xMax; existing.graphStep=step;
    existing.graphYMin=yMin; existing.graphYMax=yMax;
    const domEl=document.getElementById('canvas').querySelector('[data-id="'+existing.id+'"]');
    if(domEl){ const img=domEl.querySelector('img'); if(img) img.src=result.dataUrl; }
    save(); drawThumbs(); saveState();
    if(typeof toast==='function') toast('График обновлён','ok');
  } else {
    pushUndo();
    const _fDom=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
    const fx=_fDom?parseInt(_fDom.style.left):d.x;
    const fy=_fDom?parseInt(_fDom.style.top):d.y;
    const fh=_fDom?parseInt(_fDom.style.height):d.h;
    const fw=_fDom?parseInt(_fDom.style.width):d.w;
    const W=Math.max(fw,380), H=Math.round(W*0.7);
    const gd={
      id:'e'+(++ec), type:'graph',
      x:snapV(fx), y:snapV(fy+fh+16),
      w:snapV(W),  h:snapV(H),
      rot:0, anims:[],
      linkedFormulaId:d.id,
      graphExprs:exprs, graphLines:lines,
      graphExpr:exprs[0], graphLatex:lines[0],
      graphImg:result.dataUrl, graphColor:color,
      graphLineColors:lineColors,
      graphBg:bg, graphDark:isDark,
      graphXMin:-10, graphXMax:10, graphStep:1,
    };
    if(gd.y+gd.h>canvasH) gd.y=Math.max(0,canvasH-gd.h);
    if(gd.x+gd.w>canvasW) gd.x=Math.max(0,canvasW-gd.w);
    slides[cur].els.push(gd);
    mkEl(gd);
    const domEl=document.getElementById('canvas').querySelector('[data-id="'+gd.id+'"]');
    if(domEl) pick(domEl);
    save(); drawThumbs(); saveState();
    if(typeof toast==='function') toast('График построен','ok');
  }
}
window.buildFormulaGraph = buildFormulaGraph;

// ── Graph props panel ───────────────────────────────────────────────────────
function syncGraphProps(){
  if(!sel) return;
  const d = slides[cur] && slides[cur].els.find(x => x.id === sel.dataset.id);
  if(!d || d.type !== 'graph') return;
  const get = id => document.getElementById(id);
  if(get('gp-xmin')) get('gp-xmin').value = d.graphXMin != null ? d.graphXMin : -10;
  if(get('gp-xmax')) get('gp-xmax').value = d.graphXMax != null ? d.graphXMax :  10;
  if(get('gp-ymin')) get('gp-ymin').value = d.graphYMin != null ? d.graphYMin : '';
  if(get('gp-ymax')) get('gp-ymax').value = d.graphYMax != null ? d.graphYMax : '';
  if(get('gp-step')) get('gp-step').value = d.graphStep != null ? d.graphStep :   1;
}
window.syncGraphProps = syncGraphProps;

let _graphRangeTimer = null;
function updateGraphRange(){
  clearTimeout(_graphRangeTimer);
  _graphRangeTimer = setTimeout(rebuildGraphFromProps, 400);
}
window.updateGraphRange = updateGraphRange;

async function rebuildGraphFromProps(){
  if(!sel) return;
  const d = slides[cur] && slides[cur].els.find(x => x.id === sel.dataset.id);
  if(!d || d.type !== 'graph') return;

  const get = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  const xMinV = parseFloat(get('gp-xmin'));
  const xMaxV = parseFloat(get('gp-xmax'));
  const stepV = parseFloat(get('gp-step'));
  const yMinRaw = get('gp-ymin'), yMaxRaw = get('gp-ymax');
  const yMinV = yMinRaw !== '' ? parseFloat(yMinRaw) : null;
  const yMaxV = yMaxRaw !== '' ? parseFloat(yMaxRaw) : null;

  if(!isFinite(xMinV)||!isFinite(xMaxV)||xMaxV<=xMinV) return;
  if(!isFinite(stepV)||stepV<=0) return;
  if(yMinV !== null && yMaxV !== null && yMaxV <= yMinV) return;

  d.graphXMin = xMinV; d.graphXMax = xMaxV; d.graphStep = stepV;
  d.graphYMin = (yMinV !== null && isFinite(yMinV)) ? yMinV : null;
  d.graphYMax = (yMaxV !== null && isFinite(yMaxV)) ? yMaxV : null;

  const exprs = d.graphExprs || (d.graphExpr ? [d.graphExpr] : []);
  const lines = d.graphLines || (d.graphLatex ? [d.graphLatex] : exprs);
  const lColors = d.graphLineColors || [d.graphColor||'#6366f1'];

  const raw_result = _renderGraph(exprs, lines, {
    w:800, h:560, color:d.graphColor, lineColors:lColors, bg:d.graphBg, isDark:d.graphDark,
    xMin:xMinV, xMax:xMaxV, step:stepV,
    yMin:d.graphYMin, yMax:d.graphYMax,
  });
  const result = await _addMathLabel(raw_result);
  if(!result.error){
    d.graphImg = result.dataUrl;
    const domEl = document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
    if(domEl){ const img = domEl.querySelector('img'); if(img) img.src = result.dataUrl; }
    save(); drawThumbs(); saveState();
  }
}
window.rebuildGraphFromProps = rebuildGraphFromProps;

})();
