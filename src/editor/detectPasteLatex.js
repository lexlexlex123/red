/**
 * Detect LaTeX math in pasted plain text (e.g. c = \\sqrt{a^2 + b^2}).
 * Returns the unwrapped latex string, or null.
 */

const MATH_CMD =
  /\\(frac|dfrac|tfrac|sqrt|sum|prod|int|iint|iiint|oint|lim|sin|cos|tan|cot|sec|csc|log|ln|exp|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|infty|partial|nabla|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega|varphi|phi|psi|xi|eta|zeta|rho|tau|upsilon|chi|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|mathrm|mathbf|mathit|mathsf|mathbb|mathcal|left|right|big|Big|bigg|Bigg|over|underline|overline|hat|bar|vec|dot|ddot|tilde|widehat|overline|underbrace|overbrace|binom|dbinom|tbinom|text|textrm|textbf|textit|quad|qquad|ldots|cdots|vdots|ddots|to|rightarrow|leftarrow|Rightarrow|Leftarrow|mapsto|in|notin|subset|supset|cup|cap|emptyset|forall|exists|neg|land|lor|oplus|otimes|perp|angle|triangle|square|boxed|color|begin|end|matrix|pmatrix|bmatrix|vmatrix|cases|align|aligned|array|split)\b/;

/** Display envs — keep wrapper so MathJax can show equation numbers. */
const DISPLAY_ENV =
  /^(equation|align|gather|multline|flalign|alignat|eqnarray)\*?$/;

/**
 * @param {string} s
 * @returns {{ latex: string, fromDisplayEnv: boolean }}
 */
function unwrapMathDelimiters(s) {
  let t = String(s || '').trim();
  if (!t) return { latex: '', fromDisplayEnv: false };
  let m = t.match(/^\$\$([\s\S]+?)\$\$$/);
  if (m) return { latex: m[1].trim(), fromDisplayEnv: true };
  m = t.match(/^\$([^$]+)\$$/);
  if (m) return { latex: m[1].trim(), fromDisplayEnv: true };
  m = t.match(/^\\\(([\s\S]+?)\\\)$/);
  if (m) return { latex: m[1].trim(), fromDisplayEnv: false };
  m = t.match(/^\\\[([\s\S]+?)\\\]$/);
  if (m) return { latex: m[1].trim(), fromDisplayEnv: true };
  // \begin{equation} … \end{equation} — keep as-is (numbered in MathJax)
  m = t.match(/^\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}$/);
  if (m) {
    if (DISPLAY_ENV.test(m[1])) {
      return { latex: t, fromDisplayEnv: true };
    }
    // matrix/cases/pmatrix — keep full environment for MathJax
    return { latex: t, fromDisplayEnv: false };
  }
  return { latex: t, fromDisplayEnv: false };
}

function looksLikeFilesystemPath(t) {
  return (
    /^[A-Za-z]:\\/.test(t) ||
    /\\(Users|Windows|Program Files|AppData|System32)\\/i.test(t) ||
    /^\\\\[^\\]+\\/.test(t)
  );
}

/**
 * @param {string} raw
 * @returns {string|null} latex source ready for MathJax, or null
 */
export function extractPasteLatex(raw) {
  const original = String(raw || '').replace(/^\uFEFF/, '').trim();
  if (!original || original.length > 4000) return null;
  if (looksLikeFilesystemPath(original)) return null;

  const { latex, fromDisplayEnv } = unwrapMathDelimiters(original);
  if (!latex || looksLikeFilesystemPath(latex)) return null;

  // Strong signal: a real TeX control word (\sqrt, \frac, …).
  const cmds = latex.match(/\\[a-zA-Z]{2,}/g) || [];
  const hasMathCmd = cmds.some((c) => MATH_CMD.test(c));
  const hasBraceGroup = /\{[^{}]*\}/.test(latex);
  const hasScript = /[_^]/.test(latex);
  const short = latex.length <= 280;
  const fewLines = latex.split(/\r?\n/).filter((l) => l.trim()).length <= 12;

  // Display env / $$…$$ already marked as math — keep body even without \commands (E=mc^2).
  if (fromDisplayEnv && latex && (cmds.length || hasScript || /[=+]/.test(latex))) {
    return latex;
  }

  if (!cmds.length) return null;

  // Short paste with any TeX command + math punctuation → formula.
  if (short && (hasMathCmd || (hasBraceGroup && hasScript))) return latex;
  // Longer paste only if it clearly uses math commands and isn't a wall of prose.
  if (hasMathCmd && fewLines && cmds.length >= 2) return latex;
  if (hasMathCmd && short) return latex;

  return null;
}
