/** Frame-cycle animation for library icons (v7.1 `_iconHasAnim` / `_iconStaticPath`). */

export function iconHasAnim(ic) {
  return !!(ic && ic.anim && Array.isArray(ic.anim.frames) && ic.anim.frames.length > 1);
}

export function iconFramePath(ic, idx) {
  if (!ic || !ic.anim || !ic.anim.frames) return ic ? ic.p || '' : '';
  const frames = ic.anim.frames;
  const i = Math.max(0, Math.min(+idx || 0, frames.length - 1));
  return frames[i];
}

/** Off: drawn base path `ic.p`. On: first cycle frame. */
export function iconStaticPath(ic, animOn) {
  if (!ic) return '';
  if (!iconHasAnim(ic)) return ic.p || '';
  if (!animOn && ic.p) return ic.p;
  return ic.anim.frames[0];
}

export function iconAnimEnabled(d) {
  return !!(d && (d.iconAnim === true || d.iconAnim === 'true'));
}

export function iconPathForRender(ic, d, frameIdx = null) {
  if (!iconHasAnim(ic)) return null;
  const on = iconAnimEnabled(d);
  if (on && frameIdx != null) return iconFramePath(ic, frameIdx);
  return iconStaticPath(ic, on);
}
