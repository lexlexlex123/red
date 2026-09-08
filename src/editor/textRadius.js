/** Text corner radius rx_tl/tr/br/bl (+ rxUnit px|%). */

export function textBorderRadiusCss(el) {
  if (!el) return undefined;
  const u = el.rxUnit === '%' ? '%' : 'px';
  const has =
    el.rx_tl != null ||
    el.rx_tr != null ||
    el.rx_br != null ||
    el.rx_bl != null;
  if (has) {
    return `${+(el.rx_tl || 0)}${u} ${+(el.rx_tr || 0)}${u} ${+(el.rx_br || 0)}${u} ${+(el.rx_bl || 0)}${u}`;
  }
  if (el.rx != null && el.rx !== '') return `${+el.rx}${u}`;
  return undefined;
}
