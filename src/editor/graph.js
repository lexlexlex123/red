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

/** Convert LaTeX / math text to a JS expression (keeps x and y). */
export function latexMathToJs(raw) {
  let t = String(raw || '').trim();
  if (!t) return '';
  t = t.replace(/^\$+|\$+$/g, '');

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
  // x**(2) → x**2 so y² isolation can match y**2
  t = t.replace(/\*\*\((-?\d+(?:\.\d+)?)\)/g, '**$1');
  t = t.replace(/\_\s*\{[^{}]*\}/g, '').replace(/\_[0-9a-zA-Z]/g, '');

  // implicit multiplication: 2x → 2*x, )( → )*( — not fn(x)
  t = t.replace(/(\d)([a-zA-Z(])/g, '$1*$2');
  t = t.replace(/\)\s*\(/g, ')*(');
  t = t.replace(/\)([a-zA-Z])/g, ')*$1');
  t = t.replace(/\{|\}/g, '');
  t = t.replace(/\\[a-zA-Z]+/g, '');
  return t.trim();
}

/** Convert simple LaTeX / math text to JS expression in x (strips leading y=). */
export function latexToExpr(raw) {
  let t = String(raw || '').trim();
  if (!t) return '';
  t = t.replace(/^\$+|\$+$/g, '');
  const eq = t.match(/^[yY]\s*=\s*(.+)$/);
  if (eq) t = eq[1];
  return latexMathToJs(t);
}

/** Split top-level LHS = RHS (ignores = inside parens). */
function splitTopEquals(raw) {
  const s = String(raw || '');
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    else if (ch === '=' && depth === 0) {
      const left = s.slice(0, i).trim();
      const right = s.slice(i + 1).trim();
      if (left && right) return [left, right];
    }
  }
  return null;
}

/**
 * Turn A = B into ±sqrt branches when the only y-dependence is y²
 * (circle x²+y²=r², y²=f(x), etc.).
 */
function solveYSquaredBranches(leftJs, rightJs) {
  const L = String(leftJs || '').replace(/\s+/g, '');
  const R = String(rightJs || '').replace(/\s+/g, '');
  if (!L || !R) return null;

  // Clamp tiny negatives at domain edges; outside domain → NaN (no false y=0 rays).
  const sqrtBranch = (inner) => {
    const e = `((${inner})>=-1e-12?sqrt(max(0,${inner})):NaN)`;
    return makeEvalFn(e) ? [e, `-((${inner})>=-1e-12?sqrt(max(0,${inner})):NaN)`] : null;
  };

  if (/^y(\*\*2|\^2)$/.test(L) && !/\by\b/.test(R)) {
    return sqrtBranch(R);
  }
  if (/^y(\*\*2|\^2)$/.test(R) && !/\by\b/.test(L)) {
    return sqrtBranch(L);
  }

  const diff = `((${L})-(${R}))`;
  // Only y**2 allowed — no bare y / y**3 / y*
  if (/\by\b/.test(diff.replace(/y\*\*2/g, ''))) return null;
  if (!/y\*\*2/.test(diff)) return null;

  const f0 = diff.replace(/y\*\*2/g, '0');
  const f1 = diff.replace(/y\*\*2/g, '1');
  // A*y² + C = 0 → y² = -C/A = -f0/(f1-f0)
  const rhs = `((-(${f0}))/((${f1})-(${f0})))`;
  return sqrtBranch(rhs);
}

/**
 * Parse one equation line into one or more y=f(x) JS exprs.
 * Supports y=f(x) and implicit forms with y² (e.g. x²+y²=25).
 */
export function equationToExprs(latex) {
  let t = String(latex || '').trim().replace(/^\$+|\$+$/g, '');
  if (!t) return [];

  const parts = splitTopEquals(t);
  if (parts) {
    const leftJs = latexMathToJs(parts[0]);
    const rightJs = latexMathToJs(parts[1]);
    const l = leftJs.replace(/\s+/g, '');
    const r = rightJs.replace(/\s+/g, '');

    if (/^y$/i.test(l) && !/\by\b/.test(r)) {
      return makeEvalFn(rightJs) ? [rightJs] : [];
    }
    if (/^y$/i.test(r) && !/\by\b/.test(l)) {
      return makeEvalFn(leftJs) ? [leftJs] : [];
    }

    const branches = solveYSquaredBranches(leftJs, rightJs);
    if (branches?.length) return branches;
  }

  const explicit = latexToExpr(t);
  return explicit && makeEvalFn(explicit) ? [explicit] : [];
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

const SUPER_MAP = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  'n': 'ⁿ',
  'i': 'ⁱ',
  'x': 'ˣ',
  'y': 'ʸ',
};

function toSuperscript(s) {
  return String(s || '')
    .split('')
    .map((c) => SUPER_MAP[c] || c)
    .join('');
}

/** Pretty unicode label for graph curves (y² + x² = 1, not y^2+x^2=1). */
export function latexToText(raw) {
  let t = String(raw || '').trim().replace(/^\$+|\$+$/g, '');
  if (!t) return '';
  t = t.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)');
  t = t.replace(/\\sqrt\{([^}]*)\}/g, '√($1)');
  t = t.replace(/\\sqrt\s+([^\s{(]+)/g, '√$1');
  t = t.replace(/\\pi\b/g, 'π');
  t = t.replace(/\\cdot/g, '·').replace(/\\times/g, '×').replace(/\\div/g, '÷');
  t = t.replace(/\\leq/g, '≤').replace(/\\geq/g, '≥').replace(/\\neq/g, '≠');
  t = t.replace(/\\pm/g, '±').replace(/\\mp/g, '∓');
  t = t.replace(/\\infty/g, '∞');
  t = t.replace(/\\sin\b/g, 'sin').replace(/\\cos\b/g, 'cos').replace(/\\tan\b/g, 'tan');
  t = t.replace(/\\ln\b/g, 'ln').replace(/\\log\b/g, 'log');
  t = t.replace(/\\left\s*/g, '').replace(/\\right\s*/g, '');
  t = t.replace(/\\[a-zA-Z]+/g, '');
  t = t.replace(/\^\s*\{([^{}]*)\}/g, (_, e) => toSuperscript(e));
  t = t.replace(/\^\s*([0-9a-zA-Z+\-])/g, (_, e) => toSuperscript(e));
  t = t.replace(/\{|\}/g, '');
  t = t.replace(/\s*\*\s*/g, '·');
  t = t.replace(/\s*=\s*/g, ' = ');
  t = t.replace(/\s*\+\s*/g, ' + ');
  t = t.replace(/\s*-\s*/g, ' − ');
  t = t.replace(/\s+/g, ' ').trim();
  // undo space damage around unary minus after = or (
  t = t.replace(/(=|\()\s*−\s*/g, '$1−');
  return t;
}

function normalizeIneqLatex(raw) {
  return String(raw || '')
    .replace(/\\geq/g, '>=')
    .replace(/\\leq/g, '<=')
    .replace(/\\gt/g, '>')
    .replace(/\\lt/g, '<')
    .replace(/\\ge/g, '>=')
    .replace(/\\le/g, '<=')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/\s+/g, ' ')
    .trim();
}

function emptyCond() {
  return {
    xMin: -Infinity,
    xMax: Infinity,
    yMin: -Infinity,
    yMax: Infinity,
    xMinOpen: false,
    xMaxOpen: false,
    yMinOpen: false,
    yMaxOpen: false,
  };
}

function applyVarOp(cond, variable, op, val) {
  const v = parseFloat(val);
  if (!isFinite(v)) return false;
  const open = op === '>' || op === '<';
  if (variable === 'x') {
    if (op === '>' || op === '>=') {
      if (v > cond.xMin || (v === cond.xMin && open)) {
        cond.xMin = v;
        cond.xMinOpen = open;
      }
    } else if (op === '<' || op === '<=') {
      if (v < cond.xMax || (v === cond.xMax && open)) {
        cond.xMax = v;
        cond.xMaxOpen = open;
      }
    }
    return true;
  }
  if (variable === 'y') {
    if (op === '>' || op === '>=') {
      if (v > cond.yMin || (v === cond.yMin && open)) {
        cond.yMin = v;
        cond.yMinOpen = open;
      }
    } else if (op === '<' || op === '<=') {
      if (v < cond.yMax || (v === cond.yMax && open)) {
        cond.yMax = v;
        cond.yMaxOpen = open;
      }
    }
    return true;
  }
  return false;
}

/**
 * Parse domain restriction: "x > 0", "y \\leq 2", "0 < x < 1", "y > 0".
 * Returns bounds for x and/or y (open flags for strict inequalities).
 */
export function parseCondition(raw) {
  let s = normalizeIneqLatex(raw);
  if (!s) return null;
  s = s.replace(/\s*([<>]=?)\s*/g, '$1');

  const cond = emptyCond();
  let matched = false;

  let m = s.match(/^([xy])(>=?|<=?)(-?[\d.]+)$/i);
  if (m) {
    matched = applyVarOp(cond, m[1].toLowerCase(), m[2], m[3]) || matched;
    return matched ? cond : null;
  }
  m = s.match(/^(-?[\d.]+)(>=?|<=?)([xy])$/i);
  if (m) {
    // 2 >= y → y <= 2; 0 < x → x > 0
    const op = m[2];
    const flipped = op === '>' ? '<' : op === '<' ? '>' : op === '>=' ? '<=' : '>=';
    matched = applyVarOp(cond, m[3].toLowerCase(), flipped, m[1]) || matched;
    return matched ? cond : null;
  }
  m = s.match(/^(-?[\d.]+)(>=?|<=?)([xy])(>=?|<=?)(-?[\d.]+)$/i);
  if (m) {
    const [, a, op1, vr, op2, b] = m;
    const flipped1 = op1 === '>' ? '<' : op1 === '<' ? '>' : op1 === '>=' ? '<=' : '>=';
    matched = applyVarOp(cond, vr.toLowerCase(), flipped1, a) || matched;
    matched = applyVarOp(cond, vr.toLowerCase(), op2, b) || matched;
    return matched ? cond : null;
  }
  return null;
}

export function mergeConditions(list) {
  const out = emptyCond();
  let any = false;
  (list || []).forEach((c) => {
    if (!c) return;
    any = true;
    if (c.xMin > out.xMin || (c.xMin === out.xMin && c.xMinOpen)) {
      out.xMin = c.xMin;
      out.xMinOpen = !!c.xMinOpen;
    }
    if (c.xMax < out.xMax || (c.xMax === out.xMax && c.xMaxOpen)) {
      out.xMax = c.xMax;
      out.xMaxOpen = !!c.xMaxOpen;
    }
    if (c.yMin > out.yMin || (c.yMin === out.yMin && c.yMinOpen)) {
      out.yMin = c.yMin;
      out.yMinOpen = !!c.yMinOpen;
    }
    if (c.yMax < out.yMax || (c.yMax === out.yMax && c.yMaxOpen)) {
      out.yMax = c.yMax;
      out.yMaxOpen = !!c.yMaxOpen;
    }
  });
  return any ? out : null;
}

function isInequalityAtom(s) {
  const t = normalizeIneqLatex(s).replace(/\s/g, '');
  return /^(?:-?[\d.]+|[xy])(?:<=|>=|<|>)(?:-?[\d.]+|[xy])(?:(?:<=|>=|<|>)(?:-?[\d.]+|[xy]))?$/i.test(
    t
  );
}

/**
 * Split "x = 2, y > 0, y ≤ 2" / "… и …" / "… and …" / space-separated conditions.
 * → { expr, cond }.
 */
export function splitCondition(raw) {
  let s = normalizeIneqLatex(raw);
  if (!s) return { expr: '', cond: null };

  s = s.replace(/\s+(и|and)\s+/gi, ', ');

  const condRe =
    /(?:^|[\s,]+)((?:-?[\d.]+|[xy])\s*(?:<=|>=|<|>)\s*(?:-?[\d.]+|[xy])(?:\s*(?:<=|>=|<|>)\s*(?:-?[\d.]+|[xy]))?)/gi;
  const condStrs = [];
  let rest = s.replace(condRe, (full, atom) => {
    const a = String(atom || '').trim();
    if (a && isInequalityAtom(a)) {
      condStrs.push(a);
      return ' , ';
    }
    return full;
  });

  const chunks = rest
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .filter((c) => !isInequalityAtom(c));

  let expr = chunks.find((c) => /=/.test(c)) || chunks[0] || '';
  if (!expr) {
    // Fallback: legacy "eq, one cond" via last comma
    const commaIdx = String(raw || '').lastIndexOf(',');
    if (commaIdx >= 0) {
      expr = String(raw).slice(0, commaIdx).trim();
      const one = parseCondition(String(raw).slice(commaIdx + 1));
      return { expr, cond: one };
    }
    expr = s;
  }

  const cond = mergeConditions(condStrs.map(parseCondition).filter(Boolean));
  return { expr, cond };
}

/** Evaluate a constant latex/math snippet (for x = 2, x = \\pi, …). */
export function evalConstExpr(raw) {
  const js = latexMathToJs(String(raw || '').trim());
  if (!js || /\b[xy]\b/i.test(js)) return null;
  try {
    const fn = new Function(
      `var PI=Math.PI,E=Math.E,sqrt=Math.sqrt,abs=Math.abs,pow=Math.pow;return (${js});`
    );
    const v = fn();
    return isFinite(v) ? v : null;
  } catch (e) {
    return null;
  }
}

/** x = 2 → vertical line; y = 3 already handled as f(x). */
export function parseVerticalLine(exprLatex) {
  let t = String(exprLatex || '').trim().replace(/^\$+|\$+$/g, '');
  const m = t.match(/^[xX]\s*=\s*(.+)$/) || t.match(/^(.+)\s*=\s*[xX]$/);
  if (!m) return null;
  const rhs = m[1];
  if (/\by\b/i.test(rhs)) return null;
  const x0 = evalConstExpr(rhs);
  return x0 == null ? null : x0;
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
 * Supports systems, conditions via ", " / " и " / " and " / spaces,
 * vertical segments (x = 2), and implicit y² equations (circles).
 */
export function parseFnFormula(formulaLike) {
  const lines = extractFormulaLines(formulaLike);
  const keptLines = [];
  const exprs = [];
  const conditions = [];
  const labels = [];
  const segments = [];
  const seenLine = new Set();
  for (const line of lines) {
    const { expr: exprLatex, cond } = splitCondition(line);
    if (!exprLatex) continue;

    const x0 = parseVerticalLine(exprLatex);
    if (x0 != null) {
      if (!seenLine.has(line)) {
        keptLines.push(line);
        seenLine.add(line);
      }
      segments.push({ kind: 'v', x: x0, cond, label: line });
      continue;
    }

    const branchExprs = equationToExprs(exprLatex);
    if (!branchExprs.length) continue;
    if (!seenLine.has(line)) {
      keptLines.push(line);
      seenLine.add(line);
    }
    for (const expr of branchExprs) {
      exprs.push(expr);
      conditions.push(cond);
      labels.push(line);
    }
  }
  return {
    lines: keptLines.length ? keptLines : lines,
    exprs,
    conditions,
    labels: labels.length ? labels : keptLines,
    segments,
  };
}

/** Bump when dark/light axis/grid colors change — triggers one-time rebuild of baked graphs. */
export const GRAPH_CHROME_VER = 2;

/** Resolve graph chrome: system | light | dark | transparent | blur. */
export function resolveGraphVisual(el, systemDark = true) {
  const theme = el?.graphTheme || null;
  const darkSys = systemDark !== false;
  if (theme === 'light') {
    return { theme: 'light', isDark: false, bg: '#ffffff', transparent: false, blur: false };
  }
  if (theme === 'dark') {
    return { theme: 'dark', isDark: true, bg: '#16161e', transparent: false, blur: false };
  }
  if (theme === 'transparent') {
    return { theme: 'transparent', isDark: darkSys, bg: 'transparent', transparent: true, blur: false };
  }
  if (theme === 'blur') {
    return { theme: 'blur', isDark: darkSys, bg: 'transparent', transparent: true, blur: true };
  }
  if (theme === 'system') {
    return {
      theme: 'system',
      isDark: darkSys,
      bg: darkSys ? '#16161e' : '#ffffff',
      transparent: false,
      blur: false,
    };
  }
  // Legacy decks without graphTheme
  const isDark = el?.graphDark !== false;
  const customBg = typeof el?.graphBg === 'string' ? el.graphBg.trim() : '';
  return {
    theme: isDark ? 'dark' : 'light',
    isDark,
    bg: customBg || (isDark ? '#16161e' : '#ffffff'),
    transparent: customBg === 'transparent',
    blur: false,
  };
}

/** CSS chrome for the graph element wrapper. */
export function graphChromeStyle(el, systemDark = true) {
  const v = resolveGraphVisual(el, systemDark);
  const bg =
    v.transparent || v.blur
      ? 'transparent'
      : typeof el?.graphBg === 'string' && el.graphBg.trim() && el.graphBg !== 'transparent'
        ? el.graphBg
        : v.bg;
  const style = { background: bg };
  if (v.blur) {
    style.backdropFilter = 'blur(14px)';
    style.WebkitBackdropFilter = 'blur(14px)';
  }
  return style;
}

/** Proportional graph window: equal scale on X/Y from element aspect. */
export function graphViewBounds(el) {
  const w = Math.max(120, +(el?.w || 480));
  const h = Math.max(90, +(el?.h || 340));
  let xMin = el?.graphXMin != null && isFinite(+el.graphXMin) ? +el.graphXMin : -10;
  let xMax = el?.graphXMax != null && isFinite(+el.graphXMax) ? +el.graphXMax : 10;
  if (!(xMax > xMin)) {
    xMin = -10;
    xMax = 10;
  }
  const xRange = xMax - xMin;
  const yRange = xRange * (h / w);
  const yCenter =
    el?.graphYCenter != null && isFinite(+el.graphYCenter)
      ? +el.graphYCenter
      : el?.graphYMin != null && el?.graphYMax != null
        ? (+el.graphYMin + +el.graphYMax) / 2
        : 0;
  return {
    xMin,
    xMax,
    yMin: yCenter - yRange / 2,
    yMax: yCenter + yRange / 2,
    yCenter,
    xRange,
    yRange,
  };
}

/** Units-per-pixel scale (element box coords). Kept stable on resize; changed by ± zoom. */
export function graphScaleOf(el) {
  const w = Math.max(120, +(el?.w || 480));
  if (el?.graphScale != null && isFinite(+el.graphScale) && +el.graphScale > 0) {
    return +el.graphScale;
  }
  const b = graphViewBounds(el);
  return b.xRange / w;
}

/** After box resize: keep scale, expand/shrink the coordinate window. */
export function syncGraphRangeForSize(el) {
  if (!el) return el;
  const w = Math.max(120, +(el.w || 480));
  const b = graphViewBounds(el);
  const scale = graphScaleOf(el);
  const cx = (b.xMin + b.xMax) / 2;
  const half = Math.max(0.5, (scale * w) / 2);
  el.graphScale = scale;
  el.graphXMin = cx - half;
  el.graphXMax = cx + half;
  el.graphYCenter = b.yCenter;
  delete el.graphYMin;
  delete el.graphYMax;
  return el;
}

/** Pan view by integer units (keeps proportions). */
export function nudgeGraphView(el, dx = 0, dy = 0) {
  if (!el) return el;
  const b = graphViewBounds(el);
  el.graphXMin = b.xMin + dx;
  el.graphXMax = b.xMax + dx;
  el.graphYCenter = b.yCenter + dy;
  el.graphScale = (el.graphXMax - el.graphXMin) / Math.max(120, +(el.w || 480));
  delete el.graphYMin;
  delete el.graphYMax;
  return el;
}

/** Zoom about center. factor<1 zooms in; line thickness unchanged (screen px). */
export function zoomGraphView(el, factor = 1) {
  if (!el) return el;
  const f = Math.max(0.25, Math.min(4, +factor || 1));
  const b = graphViewBounds(el);
  const cx = (b.xMin + b.xMax) / 2;
  let half = (b.xRange / 2) * f;
  half = Math.max(0.5, Math.min(80, half));
  el.graphXMin = cx - half;
  el.graphXMax = cx + half;
  el.graphYCenter = b.yCenter;
  el.graphScale = (el.graphXMax - el.graphXMin) / Math.max(120, +(el.w || 480));
  delete el.graphYMin;
  delete el.graphYMax;
  return el;
}

function ptsToPathD(pts) {
  let d = '';
  let pen = false;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (!p) {
      pen = false;
      continue;
    }
    const x = +p.cx.toFixed(2);
    const y = +p.cy.toFixed(2);
    d += pen ? `L${x} ${y}` : `M${x} ${y}`;
    pen = true;
  }
  return d;
}

/**
 * Render y=f(x) curves to PNG data URL.
 * opts.drawAxes / opts.drawCurves (default true) — for animate: axes static, SVG stroke along path.
 * Returns { dataUrl, error, paths, pathW, pathH }.
 */
export function renderGraphToDataURL(exprsOrExpr, labels, opts = {}) {
  const exprList = Array.isArray(exprsOrExpr) ? exprsOrExpr : [exprsOrExpr];
  const labelList = Array.isArray(labels) ? labels : [labels];
  const W = opts.w || 800;
  const H = opts.h || 560;
  const xMin = opts.xMin != null ? opts.xMin : -10;
  const xMax = opts.xMax != null ? opts.xMax : 10;
  const color = opts.color || '#6366f1';
  const isDark = opts.isDark !== false;
  const drawAxes = opts.drawAxes !== false;
  const drawCurves = opts.drawCurves !== false;
  const requestedBg = typeof opts.bg === 'string' ? opts.bg.trim() : '';
  const transparentBg =
    opts.transparent === true ||
    requestedBg === 'transparent' ||
    /^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i.test(requestedBg);
  const bg = transparentBg
    ? null
    : requestedBg && !/gradient\s*\(/i.test(requestedBg)
      ? requestedBg
      : isDark
        ? '#16161e'
        : '#ffffff';
  // Dark theme: light grid/axes/labels so the plane stays readable on dark slides
  // (esp. transparent graphs over a dark deck background).
  const gridColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.08)';
  const axisColor = isDark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.38)';
  const tickColor = isDark ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.50)';

  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.clearRect(0, 0, W, H);
  }

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

  if (drawAxes) {
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
  }

  const showLabels = opts.showLabels === true;
  const lineWidth = Math.max(0.5, Math.min(24, +(opts.lineWidth ?? 2.5) || 2.5));
  const paths = [];
  const segmentList = Array.isArray(opts.segments) ? opts.segments : [];

  if (!drawCurves && !showLabels) {
    return { dataUrl: cv.toDataURL('image/png'), error: null, paths, pathW: W, pathH: H };
  }

  function yAllowed(y, cond) {
    if (!cond) return true;
    if (cond.yMin != null && isFinite(cond.yMin)) {
      if (cond.yMinOpen ? !(y > cond.yMin) : y < cond.yMin - 1e-12) return false;
    }
    if (cond.yMax != null && isFinite(cond.yMax)) {
      if (cond.yMaxOpen ? !(y < cond.yMax) : y > cond.yMax + 1e-12) return false;
    }
    return true;
  }

  function xAllowed(x, cond) {
    if (!cond) return true;
    if (cond.xMin != null && isFinite(cond.xMin)) {
      if (cond.xMinOpen ? !(x > cond.xMin) : x < cond.xMin - 1e-12) return false;
    }
    if (cond.xMax != null && isFinite(cond.xMax)) {
      if (cond.xMaxOpen ? !(x < cond.xMax) : x > cond.xMax + 1e-12) return false;
    }
    return true;
  }

  function strokePts(pts, curveColor) {
    const d = ptsToPathD(pts);
    if (d) paths.push({ d, color: curveColor, width: lineWidth });
    if (drawCurves && d) {
      ctx.strokeStyle = curveColor;
      ctx.lineWidth = lineWidth;
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
    }
    return d;
  }

  const fns = exprList.map((e) => (e ? makeEvalFn(e) : null));
  const hasCurves = fns.some((f) => f) || segmentList.length > 0;
  if (!hasCurves) {
    if (drawAxes) {
      ctx.fillStyle = '#f87171';
      ctx.font = '16px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('parse error', W / 2, H / 2);
    }
    return { dataUrl: cv.toDataURL('image/png'), error: 'parse error', paths, pathW: W, pathH: H };
  }

  const lineColors = opts.lineColors || [color, '#34d399', '#f472b6', '#fbbf24', '#67e8f9'];
  const steps = W * 3;
  const dxStep = xRange / steps;

  const condList = opts.conditions || [];
  const labeledKeys = new Set();
  let colorIdx = 0;

  fns.forEach((fn, fi) => {
    if (!fn) return;
    const curveColor = lineColors[colorIdx++ % lineColors.length];
    const cond = condList[fi] || null;
    const pts = [];
    let prevY2 = null;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + i * dxStep;
      if (!xAllowed(x, cond)) {
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
      if (!isFinite(y) || isNaN(y) || !yAllowed(y, cond)) {
        pts.push(null);
        prevY2 = null;
        continue;
      }
      // Break only on asymptote-like flips (tan); keep steep arcs (circles) connected.
      if (
        prevY2 !== null &&
        Math.abs(y - prevY2) > yRange2 * 0.45 &&
        Math.sign(y) !== 0 &&
        Math.sign(prevY2) !== 0 &&
        Math.sign(y) !== Math.sign(prevY2)
      ) {
        pts.push(null);
        prevY2 = null;
        continue;
      }
      pts.push({ cx: toX(x), cy: toY(y) });
      prevY2 = y;
    }

    strokePts(pts, curveColor);

    const rawLabel = String(labelList[fi] || '').trim();
    const labelKey = rawLabel.toLowerCase().replace(/\s+/g, '');
    if (showLabels && rawLabel && labelKey && !labeledKeys.has(labelKey)) {
      labeledKeys.add(labelKey);
      const label = latexToText(rawLabel);
      const mid = pts.filter(Boolean)[Math.floor(pts.filter(Boolean).length * 0.72)];
      if (label && mid) {
        ctx.fillStyle = curveColor;
        ctx.font =
          '600 ' + Math.round(W * 0.028) + 'px "Times New Roman", Georgia, "Cambria Math", serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label.slice(0, 48), mid.cx + 8, mid.cy - 4);
      }
    }
  });

  segmentList.forEach((seg) => {
    if (!seg || seg.kind !== 'v' || !isFinite(seg.x)) return;
    if (seg.x < xMin - 1e-9 || seg.x > xMax + 1e-9) return;
    const cond = seg.cond || null;
    let yLo = yMin;
    let yHi = yMax;
    if (cond && cond.yMin != null && isFinite(cond.yMin)) {
      yLo = Math.max(yLo, cond.yMinOpen ? cond.yMin + yRange2 * 1e-4 : cond.yMin);
    }
    if (cond && cond.yMax != null && isFinite(cond.yMax)) {
      yHi = Math.min(yHi, cond.yMaxOpen ? cond.yMax - yRange2 * 1e-4 : cond.yMax);
    }
    if (!(yHi > yLo)) return;
    const curveColor = lineColors[colorIdx++ % lineColors.length];
    const pts = [
      { cx: toX(seg.x), cy: toY(yLo) },
      { cx: toX(seg.x), cy: toY(yHi) },
    ];
    strokePts(pts, curveColor);

    const rawLabel = String(seg.label || '').trim();
    const labelKey = rawLabel.toLowerCase().replace(/\s+/g, '');
    if (showLabels && rawLabel && labelKey && !labeledKeys.has(labelKey)) {
      labeledKeys.add(labelKey);
      const label = latexToText(rawLabel);
      if (label) {
        ctx.fillStyle = curveColor;
        ctx.font =
          '600 ' + Math.round(W * 0.028) + 'px "Times New Roman", Georgia, "Cambria Math", serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label.slice(0, 48), toX(seg.x) + 8, toY((yLo + yHi) / 2));
      }
    }
  });

  return { dataUrl: cv.toDataURL('image/png'), error: null, paths, pathW: W, pathH: H };
}

export function rebuildGraphEl(el, opts = {}) {
  if (!el || el.type !== 'graph') return el;
  const w = Math.max(120, +(el.w || 480));
  const h = Math.max(90, +(el.h || 340));
  const color = el.graphColor || '#6366f1';
  const systemDark = opts.systemDark !== false;
  const visual = resolveGraphVisual(el, systemDark);
  const isDark = visual.isDark;
  const bg = visual.transparent || visual.blur ? 'transparent' : visual.bg;
  el.graphDark = isDark;
  el.graphChromeVer = GRAPH_CHROME_VER;
  if (el.graphTheme === 'system' || el.graphTheme === 'transparent' || el.graphTheme === 'blur') {
    el.graphBg = bg;
  } else if (el.graphTheme === 'light' || el.graphTheme === 'dark') {
    el.graphBg = visual.bg;
  }

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
    delete el.graphAxesImg;
    delete el.graphCurveImg;
    delete el.graphPaths;
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
    delete el.graphAxesImg;
    delete el.graphCurveImg;
    delete el.graphPaths;
    return el;
  }

  const parsed = parseFnFormula({
    formulaLines: el.graphLines,
    formulaRaw: el.graphLatex || el.graphExpr || 'x',
  });
  let exprs = parsed.exprs;
  let lines = parsed.lines;
  let labels = parsed.labels || lines;
  const segments = parsed.segments || [];
  if (!exprs.length && !segments.length) {
    const latex = el.graphLatex || el.graphExpr || 'x';
    const fallback = equationToExprs(splitCondition(latex).expr);
    exprs = fallback.length ? fallback : [latexToExpr(splitCondition(latex).expr) || 'x'];
    lines = [latex];
    labels = exprs.map(() => latex);
  }
  el.graphExprs = exprs;
  el.graphLines = lines;
  el.graphExpr = exprs[0] || '';
  el.graphLatex = lines[0] || el.graphLatex || exprs[0] || '';
  el.graphSegments = segments;

  syncGraphRangeForSize(el);
  const bounds = graphViewBounds(el);
  el.graphXMin = bounds.xMin;
  el.graphXMax = bounds.xMax;
  el.graphYCenter = bounds.yCenter;
  el.graphYMin = bounds.yMin;
  el.graphYMax = bounds.yMax;
  el.graphScale = graphScaleOf(el);

  const lineWidth = Math.max(0.5, Math.min(24, +(el.graphLineWidth ?? 2.5) || 2.5));
  el.graphLineWidth = lineWidth;
  if (el.graphAnimDur == null || !(+el.graphAnimDur > 0)) el.graphAnimDur = 1.8;

  const renderOpts = {
    w: Math.round(w * 1.6),
    h: Math.round(h * 1.6),
    color,
    bg,
    transparent: visual.transparent || visual.blur,
    isDark,
    xMin: bounds.xMin,
    xMax: bounds.xMax,
    yMin: bounds.yMin,
    yMax: bounds.yMax,
    step: el.graphStep,
    lineColors: el.graphLineColors,
    lineWidth,
    conditions: parsed.conditions || [],
    segments,
    showLabels: !!el.graphShowLabel,
  };

  const full = renderGraphToDataURL(exprs, labels, renderOpts);
  if (full.dataUrl) el.graphImg = full.dataUrl;

  if (el.graphAnimate) {
    const axes = renderGraphToDataURL(exprs, labels, {
      ...renderOpts,
      drawAxes: true,
      drawCurves: false,
      showLabels: !!el.graphShowLabel,
    });
    const curvePass = renderGraphToDataURL(exprs, labels, {
      ...renderOpts,
      bg: 'transparent',
      transparent: true,
      drawAxes: false,
      drawCurves: true,
      showLabels: false,
    });
    if (axes.dataUrl) el.graphAxesImg = axes.dataUrl;
    el.graphPaths = curvePass.paths || full.paths || [];
    el.graphPathW = curvePass.pathW || full.pathW || renderOpts.w;
    el.graphPathH = curvePass.pathH || full.pathH || renderOpts.h;
    delete el.graphCurveImg;
  } else {
    delete el.graphAxesImg;
    delete el.graphCurveImg;
    delete el.graphPaths;
    delete el.graphPathW;
    delete el.graphPathH;
  }
  return el;
}

export async function rebuildGraphElAsync(el, opts = {}) {
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
  return rebuildGraphEl(el, opts);
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
  const theme = opts.theme || 'system';
  const dark = opts.dark !== false;
  const el = {
    type: 'graph',
    graphKind: opts.kind || 'fn',
    graphLatex: lines[0] || latex,
    graphExpr: exprs[0],
    graphExprs: exprs,
    graphLines: lines,
    graphColor: opts.color || '#6366f1',
    graphColorScheme: opts.graphColorScheme ?? null,
    graphTheme: theme,
    graphBg: opts.bg ?? (dark ? '#16161e' : '#ffffff'),
    graphDark: dark,
    graphXMin: -10,
    graphXMax: 10,
    graphYCenter: 0,
    graphLineWidth: 2.5,
    graphAnimDur: 1.8,
    graphShowLabel: false,
    w: 480,
    h: 340,
    x: 80,
    y: 80,
    rot: 0,
    anims: [],
  };
  rebuildGraphEl(el, { systemDark: dark });
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
