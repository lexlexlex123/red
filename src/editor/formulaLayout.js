/** Formula box alignment + equation-number label (host-side, no MathJax). */

/** left | center | right — from element cs (default left). */
export function formulaAlignOf(elOrCs) {
  const cs = typeof elOrCs === 'string' ? elOrCs : elOrCs?.cs || '';
  const raw = ((cs.match(/text-align\s*:\s*([^;]+)/i) || [])[1] || 'left').trim().toLowerCase();
  if (raw === 'center' || raw === 'right') return raw;
  return 'left';
}

export function formulaJustifyContent(align) {
  if (align === 'right') return 'flex-end';
  if (align === 'center') return 'center';
  return 'flex-start';
}

/** Parse \\tag{…} from stored latex → label for the right-side number. */
export function formulaTagLabelOf(latex) {
  const m = String(latex || '').match(/\\tag\s*\{([^}]*)\}/);
  if (!m) return null;
  const raw = String(m[1] || '').trim();
  if (!raw) return null;
  if (/^\(.*\)$/.test(raw)) return raw;
  return `(${raw})`;
}

/** Body without \\tag for MathJax bake (number is drawn by the host). */
export function formulaBodyWithoutTag(latex) {
  return String(latex || '')
    .replace(/\\tag\s*\{[^}]*\}/g, '')
    .replace(/\\notag\b/g, '')
    .replace(/\\nonumber\b/g, '')
    .trim();
}
