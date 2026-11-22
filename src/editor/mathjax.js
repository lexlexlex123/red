/** Host-side MathJax 3 loader + LaTeX → SVG. */

import { formulaBodyWithoutTag } from './formulaLayout.js';

export {
  formulaAlignOf,
  formulaBodyWithoutTag,
  formulaJustifyContent,
  formulaTagLabelOf,
} from './formulaLayout.js';

let ready = false;
let loading = null;
const queue = [];

function flush(err) {
  const q = queue.splice(0);
  q.forEach((fn) => {
    try {
      fn(err);
    } catch (e) {}
  });
}

export function loadMathJax() {
  if (ready && window.MathJax?.tex2svgPromise) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    queue.push((err) => (err ? reject(err) : resolve()));

    if (document.getElementById('mathjax-script')) return;

    window.MathJax = {
      ...(window.MathJax || {}),
      // AMS tags: \begin{equation} / align / gather get (1), (2), …; * variants stay unnumbered.
      tex: {
        ...((window.MathJax && window.MathJax.tex) || {}),
        tags: 'ams',
        tagSide: 'right',
        tagIndent: '0.8em',
      },
      options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'] },
      startup: {
        typeset: false,
        ready() {
          window.MathJax.startup.defaultReady();
          ready = true;
          loading = null;
          flush(null);
        },
      },
    };

    const LOCAL = '/libs/mathjax/tex-svg.js';
    const CDN = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';

    function attach(src, onErr) {
      const s = document.createElement('script');
      s.id = 'mathjax-script';
      s.src = src;
      s.async = true;
      s.onerror = onErr;
      document.head.appendChild(s);
    }

    attach(LOCAL, () => {
      const old = document.getElementById('mathjax-script');
      if (old) old.remove();
      attach(CDN, () => {
        loading = null;
        flush(new Error('MathJax unavailable'));
      });
    });
  });

  return loading;
}

/**
 * Add \\tag{N} inside numbered envs (keeps \\begin{equation} for storage / editing).
 * @param {string} latex
 * @param {number} [startNum=1]
 * @returns {{ latex: string, nextNum: number, tagged: boolean }}
 */
export function withExplicitEquationTags(latex, startNum = 1) {
  let n = Math.max(1, Math.floor(+startNum || 1));
  let tagged = false;
  let t = String(latex || '');

  const needsTag = (body) =>
    !/\\tag\b/.test(body) && !/\\notag\b/.test(body) && !/\\nonumber\b/.test(body);

  t = t.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, (_, body) => {
    if (!needsTag(body)) {
      if (/\\tag\b/.test(body)) tagged = true;
      return `\\begin{equation}${body}\\end{equation}`;
    }
    tagged = true;
    const num = n++;
    return `\\begin{equation}${String(body).trimEnd()}\n\\tag{${num}}\n\\end{equation}`;
  });

  t = t.replace(/\\begin\{(gather|multline)\}([\s\S]*?)\\end\{\1\}/g, (full, env, body) => {
    if (!needsTag(body)) {
      if (/\\tag\b/.test(body)) tagged = true;
      return full;
    }
    tagged = true;
    const num = n++;
    return `\\begin{${env}}${String(body).trimEnd()}\n\\tag{${num}}\n\\end{${env}}`;
  });

  return { latex: t, nextNum: n, tagged };
}

/**
 * Body for MathJax.tex2svgPromise — no \\[ \\] / $$ wrappers (those are for
 * HTML scanning; the converter already treats input as math, so delimiters
 * would render as literal glyphs).
 * Also used to normalize LLM formulaRaw on import.
 */
export function latexForSvgBake(latex) {
  let t = String(latex || '').trim();
  // Unwrap display envs → keep body (incl. \\tag{n})
  t = t.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, (_, body) =>
    String(body).trim()
  );
  t = t.replace(/\\begin\{(gather|multline)\*?\}([\s\S]*?)\\end\{\1\*?\}/g, (_, _env, body) =>
    String(body).trim()
  );
  // Strip accidental delimiters from earlier bake / copy-paste / LLM JSON
  t = t.replace(/^\$\$([\s\S]*)\$\$$/, '$1');
  t = t.replace(/^\$([^$]*)\$$/, '$1');
  t = t.replace(/^\\\(([\s\S]*)\\\)$/, '$1');
  t = t.replace(/^\\\[([\s\S]*)\\\]$/, '$1');
  // Orphan delimiter glyphs left in the string
  t = t.replace(/\\\[/g, '').replace(/\\\]/g, '');
  t = t.replace(/\\\(/g, '').replace(/\\\)/g, '');
  return t.trim();
}

/** True when formulaSvg looks like real MathJax output (not empty / placeholder). */
export function formulaSvgUsable(svg) {
  return typeof svg === 'string' && /<svg[\s>]/i.test(svg) && svg.length > 40;
}

function paintFormulaSvgCurrentColor(svgEl) {
  if (!svgEl) return;
  svgEl.removeAttribute('width');
  svgEl.removeAttribute('height');
  // Intrinsic width so the host can flex-align left/center/right.
  svgEl.style.width = 'auto';
  svgEl.style.height = '100%';
  svgEl.style.maxWidth = '100%';
  svgEl.style.maxHeight = '100%';
  svgEl.style.display = 'block';
  svgEl.removeAttribute('color');
  svgEl.querySelectorAll('*').forEach((n) => {
    const fill = n.getAttribute('fill');
    if (fill === 'black' || fill === '#000' || fill === '#000000') n.setAttribute('fill', 'currentColor');
    if (!fill && (n.tagName === 'path' || n.tagName === 'use' || n.tagName === 'rect')) {
      n.setAttribute('fill', 'currentColor');
    }
    const stroke = n.getAttribute('stroke');
    if (stroke === 'black' || stroke === '#000' || stroke === '#000000') {
      n.setAttribute('stroke', 'currentColor');
    }
  });
}

/**
 * Bake math SVG only — equation numbers are drawn by the host so left/center/right
 * alignment can move the formula while (n) stays on the right edge.
 * @param {string} latex
 * @param {{ startTag?: number, displayAlign?: 'left'|'center'|'right', containerWidth?: number }} [opts]
 * @returns {Promise<string>} SVG markup
 */
export async function renderFormulaSvg(latex, opts = {}) {
  await loadMathJax();
  // Host draws \\tag labels; disable MathJax auto-tags so (n) is not baked into SVG.
  try {
    if (window.MathJax?.config?.tex) window.MathJax.config.tex.tags = 'none';
    const inputJax = window.MathJax?.startup?.document?.inputJax?.[0];
    if (inputJax?.parseOptions?.options) inputJax.parseOptions.options.tags = 'none';
  } catch (_) {
    /* ignore */
  }

  const tagged = withExplicitEquationTags(latex, opts.startTag != null ? opts.startTag : 1).latex;
  // Strip \\tag so MathJax does not embed (n) — host renders the label separately.
  const prepared = latexForSvgBake(formulaBodyWithoutTag(tagged));
  const node = await window.MathJax.tex2svgPromise(prepared, {
    display: true,
    em: 16,
    ex: 8,
    containerWidth: Math.max(120, +(opts.containerWidth || 480)),
  });
  const svgEl = node.querySelector?.('svg') || (node.tagName === 'svg' ? node : null);
  if (!svgEl) throw new Error('Render failed');
  paintFormulaSvgCurrentColor(svgEl);
  return svgEl.outerHTML;
}

/** Latex that should be stored after render (with \\tag when numbered). */
export function formulaLatexForStore(latex, startTag = 1) {
  return withExplicitEquationTags(latex, startTag).latex;
}

export const FORMULA_PRESETS = [
  { label: 'Квадратное ур.', latex: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}' },
  { label: 'Пифагор', latex: 'a^2 + b^2 = c^2' },
  { label: 'Эйнштейн', latex: 'E = mc^2' },
  { label: 'Интеграл', latex: '\\int_{a}^{b} f(x)\\,dx' },
  { label: 'Сумма', latex: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}' },
  { label: 'Матрица', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
  { label: 'Предел', latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1' },
  { label: 'Система', latex: '\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}' },
];
