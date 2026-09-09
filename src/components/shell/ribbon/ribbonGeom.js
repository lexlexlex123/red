/** Shared ribbon trapezoid geometry — tab slant must stay collinear with `.react-ribbon-trap`. */

export const RIBBON_BODY_H = 68;
export const RIBBON_TAB_H = 28;
/** Horizontal overlap of neighboring tabs; keep in sync with `.react-rtab { margin-right }`. */
export const RIBBON_TAB_OVERLAP = 8;
export const RIBBON_TAB_RADIUS_L = 8;
/** Extra tab width on the right; keep left label inset unchanged (CSS padding-right). */
export const RIBBON_TAB_EXTRA_RIGHT = 15;

export function ribbonTabPath(width, height = RIBBON_TAB_H) {
  const w = Math.max(36, width);
  const h = height;
  const cut = h;
  const rL = RIBBON_TAB_RADIUS_L;
  const along = 16;
  const len = Math.hypot(cut, h);
  const ux = cut / len;
  const uy = h / len;
  const t1x = Math.max(rL + 6, w - cut - along);
  const t2x = w - cut + ux * along;
  const t2y = uy * along;
  return [
    `M 0 ${h}`,
    `L 0 ${rL}`,
    `Q 0 0 ${rL} 0`,
    `L ${t1x.toFixed(2)} 0`,
    `Q ${(w - cut).toFixed(2)} 0 ${t2x.toFixed(2)} ${t2y.toFixed(2)}`,
    `L ${w} ${h}`,
    'Z',
  ].join(' ');
}

/** Extra solid width before the 45° slant (shifts the diagonal right). */
export const RIBBON_TRAP_SHIFT_PX = 50;

export function ribbonTrapGeom(tabWidth, height = RIBBON_BODY_H) {
  const h = Math.max(24, height);
  const tabW = Math.max(36, tabWidth) + RIBBON_TRAP_SHIFT_PX;
  const w = tabW + h;
  return {
    w,
    h,
    tabW,
    trapPoints: `0,0 ${tabW},0 ${tabW + h},${h} 0,${h}`,
    gx1: tabW,
    gy1: 0,
    gx2: tabW + h,
    gy2: h,
  };
}
