/** Text padding pad_t/r/b/l (+ padUnit px|%). */

export function textPadValues(el) {
  if (!el) return { t: 0, r: 0, b: 0, l: 0, unit: 'px' };
  const has =
    el.pad_t !== undefined ||
    el.pad_r !== undefined ||
    el.pad_b !== undefined ||
    el.pad_l !== undefined;
  if (!has) return null;
  return {
    t: el.pad_t != null && el.pad_t !== '' ? +el.pad_t : 0,
    r: el.pad_r != null && el.pad_r !== '' ? +el.pad_r : 0,
    b: el.pad_b != null && el.pad_b !== '' ? +el.pad_b : 0,
    l: el.pad_l != null && el.pad_l !== '' ? +el.pad_l : 0,
    unit: el.padUnit === '%' ? '%' : 'px',
  };
}

/** CSS padding for the text content box. Default 8px when no pad_* set. */
export function textPadCss(el, fallbackPx = 8) {
  const p = textPadValues(el);
  if (!p) return `${fallbackPx}px`;
  if (p.unit === '%') {
    const h = Math.max(1, el.h || 60);
    const tPx = Math.round((p.t / 100) * h);
    const bPx = Math.round((p.b / 100) * h);
    return `${tPx}px ${p.r}% ${bPx}px ${p.l}%`;
  }
  return `${p.t}px ${p.r}px ${p.b}px ${p.l}px`;
}
