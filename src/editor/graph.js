/**
 * Function / chem / logic graphs for React.
 * Chem/logic renderers load lazily from ./chemRender.js and ./logicRender.js.
 */

let chemMod = null;
let logicMod = null;
let chemLoadPromise = null;
let logicLoadPromise = null;

export function ensureChemLoaded() {
  if (chemMod) return Promise.resolve(chemMod);
  if (chemLoadPromise) return chemLoadPromise;
  chemLoadPromise = import('./chemRender.js')
    .then((m) => {
      chemMod = m;
      return m;
    })
    .catch((err) => {
      chemLoadPromise = null;
      throw err;
    });
  return chemLoadPromise;
}

export function ensureLogicLoaded() {
  if (logicMod) return Promise.resolve(logicMod);
  if (logicLoadPromise) return logicLoadPromise;
  logicLoadPromise = import('./logicRender.js')
    .then((m) => {
      logicMod = m;
      return m;
    })
    .catch((err) => {
      logicLoadPromise = null;
      throw err;
    });
  return logicLoadPromise;
}

function braces(s, i) {
  if (s[i] !== '{') return [s[i] || '', i + 1];
  let d = 0;
  let j = i;
  for (; j < s.length; j++) {
    if (s[j] === '{') d++;
    else if (s[j] === '}') {
      d--;
      if (d === 0) return [s.slice(i + 1, j), j + 1];
    }
  }
  return [s.slice(i + 1), s.length];
}

/** Convert simple LaTeX / math text to JS expression in x. */
export function latexToExpr(raw) {
  let t = String(raw || '').trim();
  if (!t) return '';
  t = t.replace(/^\$+|\$+$/g, '');
  // y = ...
  const eq = t.match(/^[yY]\s*=\s*(.+)$/);
  if (eq) t = eq[1];

  for (let i = 0; i < 10; i++) {
    const r = t.replace(/\|([^|]+)\|/g, 'abs($1)');
    if (r === t) break;
    t = r;
  }
  t = t.replace(/\\left\s*\|/g, 'abs_OPEN_').replace(/\\right\s*\|/g, '_CLOSE_abs');
  t = t.replace(/abs_OPEN_([\s\S]*?)_CLOSE_abs/g, 'abs($1)');
  t = t.replace(/\\left\s*[\(\[{]/g, '(').replace(/\\right\s*[\)\]}]/g, ')');

  let changed = true;
  while (changed) {
    changed = false;
    const fi = t.indexOf('\\frac');
    if (fi < 0) break;
    let p = fi + 5;
    while (p < t.length && t[p] === ' ') p++;
    const [num, p2] = braces(t, p);
    let p3 = p2;
    while (p3 < t.length && t[p3] === ' ') p3++;
    const [den, p4] = braces(t, p3);
    t = t.slice(0, fi) + `((${num})/(${den}))` + t.slice(p4);
    changed = true;
  }

  t = t.replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]*)\}/g, 'pow($2,1/($1))');
  changed = true;
  while (changed) {
    changed = false;
    const si = t.indexOf('\\sqrt');
    if (si < 0) break;
    let p = si + 5;
    while (p < t.length && t[p] === ' ') p++;
    if (t[p] !== '{') break;
    const [arg, p2] = braces(t, p);
    t = t.slice(0, si) + 'sqrt(' + arg + ')' + t.slice(p2);
    changed = true;
  }
  t = t.replace(/\\sqrt\s+([^\s{(\\]+)/g, 'sqrt($1)');

  t = t.replace(/\\arcsin\b/g, 'asin').replace(/\\arccos\b/g, 'acos').replace(/\\arctan\b/g, 'atan');
  t = t.replace(/\\sin\b/g, 'sin').replace(/\\cos\b/g, 'cos').replace(/\\tan\b/g, 'tan');
  t = t.replace(/\\ln\b/g, 'log').replace(/\\log\b/g, 'log10').replace(/\\exp\b/g, 'exp');
  t = t.replace(/\\pi\b/g, 'PI').replace(/\\e\b/g, 'E');
  t = t.replace(/\\cdot/g, '*').replace(/\\times/g, '*').replace(/\\div/g, '/');

  for (let i = 0; i < 6; i++) {
    const r = t.replace(/\^\s*\{([^{}]*)\}/g, '**($1)');
    if (r === t) break;
    t = r;
  }
  t = t.replace(/\^\s*([0-9a-zA-Z])/g, '**$1');
  t = t.replace(/\_\s*\{[^{}]*\}/g, '').replace(/\_[0-9a-zA-Z]/g, '');

  // implicit multiplication: 2x → 2*x, )( → )*( — not fn(x)
  t = t.replace(/(\d)([a-zA-Z(])/g, '$1*$2');
  t = t.replace(/\)\s*\(/g, ')*(');
  t = t.replace(/\)([a-zA-Z])/g, ')*$1');
  t = t.replace(/\{|\}/g, '');
  t = t.replace(/\\[a-zA-Z]+/g, '');
  return t.trim();
}

export function makeEvalFn(expr) {
  try {
    const fn = new Function(
      'x',
      `
      var abs=Math.abs, sqrt=Math.sqrt, cbrt=Math.cbrt,
          sin=Math.sin, cos=Math.cos, tan=Math.tan,
          asin=Math.asin, acos=Math.acos, atan=Math.atan, atan2=Math.atan2,
          sinh=Math.sinh, cosh=Math.cosh, tanh=Math.tanh,
          log=Math.log, log2=Math.log2, log10=Math.log10, exp=Math.exp,
          PI=Math.PI, E=Math.E, pow=Math.pow,
          min=Math.min, max=Math.max, floor=Math.floor, ceil=Math.ceil,
          round=Math.round, sign=Math.sign, hypot=Math.hypot, trunc=Math.trunc;
      return (${expr});
    `
    );
    fn(0);
    fn(1);
    fn(-1);
    return fn;
  } catch (e) {
    return null;
  }
}

export function latexToText(raw) {
  return String(raw || '')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
    .replace(/\\pi/g, 'π')
    .replace(/\\sin/g, 'sin')
    .replace(/\\cos/g, 'cos')
    .replace(/\\tan/g, 'tan')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse domain restriction like "x > 0", "x \\leq 2", "0 < x < 1". */
export function parseCondition(raw) {
  let s = String(raw || '')
    .replace(/\\geq/g, '>=')
    .replace(/\\leq/g, '<=')
    .replace(/\\gt/g, '>')
    .replace(/\\lt/g, '<')
    .replace(/\\ge/g, '>=')
    .replace(/\\le/g, '<=')
    .trim();
  s = s.replace(/\s*([<>]=?)\s*/g, '$1');

  let xMin = -Infinity;
  let xMax = Infinity;
  let m = s.match(/^x(>=?|<=?)(-?[\d.]+)$/);
  if (m) {
    const [, op, val] = m;
    const v = parseFloat(val);
    if (op === '>' || op === '>=') xMin = v;
    if (op === '<' || op === '<=') xMax = v;
    return { xMin, xMax };
  }
  m = s.match(/^(-?[\d.]+)(>=?|<=?)x$/);
  if (m) {
    const [, val, op] = m;
    const v = parseFloat(val);
    if (op === '<' || op === '<=') xMin = v;
    if (op === '>' || op === '>=') xMax = v;
    return { xMin, xMax };
  }
  m = s.match(/^(-?[\d.]+)(>=?|<=?)x(>=?|<=?)(-?[\d.]+)$/);
  if (m) {
    return { xMin: parseFloat(m[1]), xMax: parseFloat(m[4]) };
  }
  return null;
}

/** Split "y = x^2, x > 0" → { expr, cond }. */
export function splitCondition(raw) {
  const s = String(raw || '');
  const commaIdx = s.lastIndexOf(',');
  if (commaIdx < 0) return { expr: s, cond: null };
  const main = s.slice(0, commaIdx).trim();
  const condStr = s.slice(commaIdx + 1).trim();
  const cond = parseCondition(condStr);
  if (!cond) return { expr: s, cond: null };
  return { expr: main, cond };
}

/** Build system brace LaTeX from several equation lines (v7.1). */
export function buildSystemLatex(lines) {
  const nonempty = (Array.isArray(lines) ? lines : []).map((l) => String(l || '').trim()).filter(Boolean);
  if (!nonempty.length) return '';
  if (nonempty.length === 1) return nonempty[0];
  return '\\left\\{\\begin{array}{l}' + nonempty.join('\\\\') + '\\end{array}\\right.';
}

function splitSystemBody(body) {
  return String(body || '')
    .split(/\\\\/)
    .map((l) => l.replace(/&/g, '').trim())
    .filter(Boolean);
}

/**
 * Extract equation lines from formulaRaw / formulaLines / cases / array system.
 * @param {string|string[]|{formulaRaw?:string,formulaLines?:string[],graphLatex?:string,graphLines?:string[],html?:string}} formulaLike
 */
export function extractFormulaLines(formulaLike) {
  if (formulaLike == null) return [];
  if (Array.isArray(formulaLike)) {
    return formulaLike.map((l) => String(l || '').trim()).filter(Boolean);
  }
  if (typeof formulaLike === 'object') {
    if (Array.isArray(formulaLike.formulaLines) && formulaLike.formulaLines.length) {
      return extractFormulaLines(formulaLike.formulaLines);
    }
    if (Array.isArray(formulaLike.graphLines) && formulaLike.graphLines.length) {
      return extractFormulaLines(formulaLike.graphLines);
    }
    const raw =
      formulaLike.formulaRaw || formulaLike.graphLatex || formulaLike.html || formulaLike.graphExpr || '';
    return extractFormulaLines(raw);
  }

  let raw = String(formulaLike).trim();
  if (!raw) return [];

  let m = raw.match(/\\begin\s*\{cases\}([\s\S]+?)\\end\s*\{cases\}/);
  if (m) return splitSystemBody(m[1]);

  m = raw.match(/\\begin\s*\{array\}\s*\{[^}]*\}([\s\S]+?)\\end\s*\{array\}/);
  if (m && (/\\left\s*\\\{/.test(raw) || /\\left\s*\{/.test(raw))) {
    return splitSystemBody(m[1]);
  }

  if (raw.includes('\\\\')) {
    const parts = splitSystemBody(raw);
    if (parts.length > 1) return parts;
  }
  return [raw];
}

/**
 * Parse formula into graphable expressions + per-curve domain conditions.
 * Supports systems and ", x > 0" restrictions like v7.1.
 */
export function parseFnFormula(formulaLike) {
  const lines = extractFormulaLines(formulaLike);
  const keptLines = [];
  const exprs = [];
  const conditions = [];
  for (const line of lines) {
    const { expr: exprLatex, cond } = splitCondition(line);
    const expr = latexToExpr(exprLatex);
    if (!expr || !makeEvalFn(expr)) continue;
    keptLines.push(line);
    exprs.push(expr);
    conditions.push(cond);
  }
  return { lines: keptLines.length ? keptLines : lines, exprs, conditions };
}

/**
 * Render y=f(x) curves to PNG data URL.
 */
export function renderGraphToDataURL(exprsOrExpr, labels, opts = {}) {
  const exprList = Array.isArray(exprsOrExpr) ? exprsOrExpr : [exprsOrExpr];
  const labelList = Array.isArray(labels) ? labels : [labels];
  const W = opts.w || 800;
  const H = opts.h || 560;
  const xMin = opts.xMin != null ? opts.xMin : -10;
  const xMax = opts.xMax != null ? opts.xMax : 10;
  const color = opts.color || '#6366f1';
  const bg = opts.bg || '#16161e';
  const isDark = opts.isDark !== false;
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const axisColor = isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.38)';
  const tickColor = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.50)';

  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const xRange = xMax - xMin;
  const pxPerUnit = W / xRange;
  function niceStep(range, target) {
    const rough = range / target;
    const p = Math.pow(10, Math.floor(Math.log10(rough)));
    const f = rough / p;
    if (f < 1.5) return p;
    if (f < 3.5) return 2 * p;
    if (f < 7.5) return 5 * p;
    return 10 * p;
  }
  const step = opts.step > 0 ? opts.step : niceStep(xRange, 8);
  let yMin;
  let yMax;
  if (opts.yMin != null && opts.yMax != null) {
    yMin = opts.yMin;
    yMax = opts.yMax;
  } else {
    const yRange = H / pxPerUnit;
    yMin = -yRange / 2;
    yMax = yRange / 2;
  }
  const yRange2 = yMax - yMin;
  const toX = (x) => ((x - xMin) / xRange) * W;
  const toY = (y) => H - ((y - yMin) / yRange2) * H;
  const tickFs = Math.round(W * 0.017);

  const xS = Math.ceil(xMin / step - 1e-9) * step;
  for (let gx = xS; gx <= xMax + step * 0.01; gx += step) {
    const px = toX(gx);
    const isAxis = Math.abs(gx) < step * 0.01;
    ctx.strokeStyle = isAxis ? axisColor : gridColor;
    ctx.lineWidth = isAxis ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, H);
    ctx.stroke();
    if (!isAxis) {
      ctx.fillStyle = tickColor;
      ctx.font = tickFs + 'px system-ui,sans-serif';
      ctx.textAlign = 'center';
      const ly = Math.min(H - 6, Math.max(tickFs + 2, toY(0) + tickFs + 4));
      ctx.fillText(+gx.toPrecision(4), px, ly);
    }
  }
  const yS = Math.ceil(yMin / step - 1e-9) * step;
  for (let gy = yS; gy <= yMax + step * 0.01; gy += step) {
    const py = toY(gy);
    const isAxis = Math.abs(gy) < step * 0.01;
    ctx.strokeStyle = isAxis ? axisColor : gridColor;
    ctx.lineWidth = isAxis ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(W, py);
    ctx.stroke();
    if (!isAxis) {
      ctx.fillStyle = tickColor;
      ctx.font = tickFs + 'px system-ui,sans-serif';
      ctx.textAlign = 'right';
      const lx = Math.min(W - 6, Math.max(30, toX(0) - 6));
      ctx.fillText(+gy.toPrecision(4), lx, py + 4);
    }
  }

  const fns = exprList.map((e) => makeEvalFn(e));
  if (fns.every((f) => !f)) {
    ctx.fillStyle = '#f87171';
    ctx.font = '16px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('parse error', W / 2, H / 2);
    return { dataUrl: cv.toDataURL('image/png'), error: 'parse error' };
  }

  const lineColors = opts.lineColors || [color, '#34d399', '#f472b6', '#fbbf24', '#67e8f9'];
  const steps = W * 3;
  const dxStep = xRange / steps;

  const condList = opts.conditions || [];

  fns.forEach((fn, fi) => {
    if (!fn) return;
    const curveColor = lineColors[fi % lineColors.length];
    const cond = condList[fi] || null;
    const cxMin =
      cond && cond.xMin != null && isFinite(cond.xMin) ? Math.max(xMin, cond.xMin) : xMin;
    const cxMax =
      cond && cond.xMax != null && isFinite(cond.xMax) ? Math.min(xMax, cond.xMax) : xMax;
    const pts = [];
    let prevY2 = null;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + i * dxStep;
      if (x < cxMin - 1e-10 || x > cxMax + 1e-10) {
        pts.push(null);
        prevY2 = null;
        continue;
      }
      let y;
      try {
        y = fn(x);
      } catch (e) {
        pts.push(null);
        prevY2 = null;
        continue;
      }
      if (!isFinite(y) || isNaN(y)) {
        pts.push(null);
        prevY2 = null;
        continue;
      }
      if (prevY2 !== null && Math.abs(y - prevY2) > yRange2 * 3) {
        pts.push(null);
        prevY2 = null;
        continue;
      }
      pts.push({ cx: toX(x), cy: toY(y) });
      prevY2 = y;
    }
    ctx.strokeStyle = curveColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    let pen = false;
    pts.forEach((p) => {
      if (!p) {
        pen = false;
        return;
      }
      if (!pen) {
        ctx.moveTo(p.cx, p.cy);
        pen = true;
      } else ctx.lineTo(p.cx, p.cy);
    });
    ctx.stroke();

    const label = latexToText(labelList[fi] || exprList[fi] || '');
    if (label && opts.showLabels !== false) {
      const mid = pts.filter(Boolean)[Math.floor(pts.filter(Boolean).length * 0.65)];
      if (mid) {
        ctx.fillStyle = curveColor;
        ctx.font = Math.round(W * 0.022) + 'px system-ui,sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label.slice(0, 36), mid.cx + 6, mid.cy - 6);
      }
    }
  });

  return { dataUrl: cv.toDataURL('image/png'), error: null };
}

export function rebuildGraphEl(el) {
  if (!el || el.type !== 'graph') return el;
  const w = Math.max(120, +(el.w || 480));
  const h = Math.max(90, +(el.h || 340));
  const color = el.graphColor || '#6366f1';
  const bg = el.graphBg || '#16161e';
  const isDark = el.graphDark !== false;

  if (el.graphKind === 'chem') {
    const render = chemMod?.chemRender;
    if (typeof render === 'function') {
      const raw = el.graphLatex || el.chemKey || '';
      try {
        const result = render(raw, {
          w: Math.round(w * 1.5),
          h: Math.round(h * 1.5),
          fg: color,
          isDark,
          showFormula: el.chemShowFormula !== false,
          showName: el.chemShowName !== false,
        });
        if (result?.dataUrl) el.graphImg = result.dataUrl;
        if (result?.chemName) el.chemName = result.chemName;
        if (result?.chemKey) el.chemKey = result.chemKey;
      } catch (e) {
        console.warn('[chem]', e);
      }
    }
    return el;
  }

  if (el.graphKind === 'logic') {
    const render = logicMod?.logicRender;
    if (typeof render === 'function') {
      const raw = el.graphLatex || '';
      try {
        const result = render(raw, {
          w: Math.round(Math.max(w, 320) * 1.8),
          h: Math.round(Math.max(h, 240) * 1.6),
          fg: color || '#ffffff',
          isDark,
          showFormula: el.logicShowFormula !== false,
        });
        if (result?.dataUrl) el.graphImg = result.dataUrl;
      } catch (e) {
        console.warn('[logic]', e);
      }
    }
    return el;
  }

  const parsed = parseFnFormula({
    formulaLines: el.graphLines,
    formulaRaw: el.graphLatex || el.graphExpr || 'x',
  });
  let exprs = parsed.exprs;
  let lines = parsed.lines;
  if (!exprs.length) {
    const latex = el.graphLatex || el.graphExpr || 'x';
    const expr = latexToExpr(splitCondition(latex).expr) || 'x';
    exprs = [expr];
    lines = [latex];
  }
  el.graphExprs = exprs;
  el.graphLines = lines;
  el.graphExpr = exprs[0];
  el.graphLatex = lines[0] || el.graphLatex || exprs[0];
  const result = renderGraphToDataURL(exprs, lines, {
    w: Math.round(w * 1.6),
    h: Math.round(h * 1.6),
    color,
    bg,
    isDark,
    xMin: el.graphXMin,
    xMax: el.graphXMax,
    yMin: el.graphYMin,
    yMax: el.graphYMax,
    step: el.graphStep,
    lineColors: el.graphLineColors,
    conditions: parseFnFormula(lines).conditions,
    showLabels: el.graphShowLabel !== false,
  });
  if (result.dataUrl) el.graphImg = result.dataUrl;
  return el;
}

export async function rebuildGraphElAsync(el) {
  if (el?.graphKind === 'chem') {
    try {
      await ensureChemLoaded();
    } catch (e) {}
  }
  if (el?.graphKind === 'logic') {
    try {
      await ensureLogicLoaded();
    } catch (e) {}
  }
  return rebuildGraphEl(el);
}

export function defaultGraphFields(opts = {}) {
  const latex = opts.latex || opts.expr || 'sin(x)';
  const parsed = parseFnFormula(
    opts.lines || opts.formulaLines
      ? { formulaLines: opts.lines || opts.formulaLines, formulaRaw: latex }
      : opts.exprs
        ? { formulaLines: opts.lines || [latex], formulaRaw: latex }
        : latex
  );
  const exprs = opts.exprs?.length ? opts.exprs : parsed.exprs.length ? parsed.exprs : [opts.expr || latexToExpr(latex) || 'sin(x)'];
  const lines = opts.lines?.length
    ? opts.lines
    : parsed.lines.length
      ? parsed.lines
      : [latex];
  const el = {
    type: 'graph',
    graphKind: opts.kind || 'fn',
    graphLatex: lines[0] || latex,
    graphExpr: exprs[0],
    graphExprs: exprs,
    graphLines: lines,
    graphColor: opts.color || '#6366f1',
    graphBg: opts.bg || '#16161e',
    graphDark: true,
    graphXMin: -10,
    graphXMax: 10,
    graphShowLabel: true,
    w: 480,
    h: 340,
    x: 80,
    y: 80,
    rot: 0,
    anims: [],
  };
  rebuildGraphEl(el);
  return el;
}

export async function defaultChemGraphFields(key = 'H2O') {
  await ensureChemLoaded();
  const el = {
    type: 'graph',
    graphKind: 'chem',
    graphLatex: key,
    chemKey: key,
    graphColor: '#ffffff',
    graphBg: '',
    graphDark: true,
    chemShowFormula: true,
    chemShowName: true,
    w: 320,
    h: 300,
    x: 100,
    y: 80,
    rot: 0,
    anims: [],
  };
  rebuildGraphEl(el);
  return el;
}

export async function defaultLogicGraphFields(latex = 'A \\land B') {
  await ensureLogicLoaded();
  const el = {
    type: 'graph',
    graphKind: 'logic',
    graphLatex: latex,
    graphColor: '#ffffff',
    graphBg: '',
    graphDark: true,
    logicShowFormula: true,
    w: 420,
    h: 280,
    x: 100,
    y: 80,
    rot: 0,
    anims: [],
  };
  rebuildGraphEl(el);
  return el;
}
