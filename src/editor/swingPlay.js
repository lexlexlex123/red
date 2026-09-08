/**
 * swing («Качение») — pendulum WAAPI with transform-origin pivot.
 */

export const SWING_FRAMES = [
  { transform: 'rotate(0deg)' },
  { transform: 'rotate(30deg)' },
  { transform: 'rotate(-30deg)' },
  { transform: 'rotate(20deg)' },
  { transform: 'rotate(-20deg)' },
  { transform: 'rotate(10deg)' },
  { transform: 'rotate(-10deg)' },
  { transform: 'rotate(5deg)' },
  { transform: 'rotate(-3deg)' },
  { transform: 'rotate(0deg)' },
];

export function isSwingAnim(name) {
  return name === 'swing';
}

export function swingIsInfinite(anim) {
  if (!anim) return false;
  const c = anim.swingCount != null ? +anim.swingCount : 1;
  return !isFinite(c) || c >= 10;
}

export function swingWaitMs(anim) {
  const delay = Math.max(0, +(anim?.delay || 0));
  if (swingIsInfinite(anim)) return delay;
  const dur = Math.max(200, +(anim?.dur ?? anim?.duration ?? 1200) || 1200);
  const loops = Math.max(1, +(anim?.swingCount != null ? anim.swingCount : 1) || 1);
  return delay + dur * loops;
}

/** Pivot as CSS transform-origin (percent). Default: top-center-ish (0, h/2 → 50% 100%? legacy: ox=0 → 50%, oy=h/2 → 100%). */
export function swingOriginCss(elData, anim) {
  const w = Math.max(1, +(elData?.w || 100));
  const h = Math.max(1, +(elData?.h || 60));
  const sox = anim?.swingOx != null ? +anim.swingOx : 0;
  const soy = anim?.swingOy != null ? +anim.swingOy : h / 2;
  const ox = (50 + (sox / w) * 100).toFixed(2) + '%';
  const oy = (50 + (soy / h) * 100).toFixed(2) + '%';
  return `${ox} ${oy}`;
}

function ensureSwingTarget(el) {
  return el;
}

/** Fire on playback/export DOM. */
export function fireSwingAnim(domEl, elData, anim) {
  if (!domEl) return { waitMs: 0, cancel: () => {} };
  const delay = Math.max(0, +(anim?.delay || 0));
  const dur = Math.max(200, +(anim?.dur ?? anim?.duration ?? 1200) || 1200);
  const infinite = swingIsInfinite(anim);
  const loops = infinite ? Infinity : Math.max(1, +(anim?.swingCount != null ? anim.swingCount : 1) || 1);
  const origin = swingOriginCss(elData, anim);
  let timer = null;
  let animObj = null;
  const prevOrigin = domEl.style.transformOrigin || '';
  const run = () => {
    if (!domEl.isConnected) return;
    const target = ensureSwingTarget(domEl);
    target.style.transformOrigin = origin;
    try {
      target.getAnimations?.().forEach((a) => {
        try {
          a.cancel();
        } catch (e) {}
      });
      animObj = target.animate(SWING_FRAMES, {
        duration: dur,
        easing: 'ease-in-out',
        iterations: loops,
        fill: 'none',
      });
      domEl._swingCtl = animObj;
      if (!infinite && animObj) {
        animObj.onfinish = () => {
          target.style.transformOrigin = prevOrigin;
        };
      }
    } catch (e) {}
  };
  if (delay > 0) timer = setTimeout(run, delay);
  else run();
  return {
    waitMs: swingWaitMs(anim),
    cancel() {
      if (timer) clearTimeout(timer);
      if (animObj) {
        try {
          animObj.cancel();
        } catch (e) {}
      }
      domEl.style.transformOrigin = prevOrigin;
      domEl._swingCtl = null;
    },
  };
}

export function clearSwing(root) {
  if (!root) return;
  root.querySelectorAll('.el, .react-el').forEach((el) => {
    if (el._swingCtl) {
      try {
        el._swingCtl.cancel();
      } catch (e) {}
      el._swingCtl = null;
    }
  });
}

export function swingKeyframesCss(name, rot = 0) {
  const n = Math.max(1, SWING_FRAMES.length - 1);
  const body = SWING_FRAMES.map((f, i) => {
    return `${(i / n) * 100}%{transform:rotate(${rot}deg) ${f.transform}}`;
  }).join('');
  return `@keyframes ${name}{${body}}`;
}
