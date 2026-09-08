/** Host-side MathJax 3 loader + LaTeX → SVG. */

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

export async function renderFormulaSvg(latex) {
  await loadMathJax();
  const node = await window.MathJax.tex2svgPromise(latex, { display: true });
  const svgEl = node.querySelector('svg');
  if (!svgEl) throw new Error('Render failed');
  svgEl.removeAttribute('width');
  svgEl.removeAttribute('height');
  svgEl.style.width = '100%';
  svgEl.style.height = '100%';
  svgEl.removeAttribute('color');
  svgEl.querySelectorAll('*').forEach((n) => {
    const fill = n.getAttribute('fill');
    if (fill === 'black' || fill === '#000' || fill === '#000000') n.setAttribute('fill', 'currentColor');
    if (!fill && (n.tagName === 'path' || n.tagName === 'use' || n.tagName === 'rect')) {
      n.setAttribute('fill', 'currentColor');
    }
  });
  return svgEl.outerHTML;
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
