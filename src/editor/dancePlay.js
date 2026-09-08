/**
 * dance («Танец») — squash/stretch WAAPI frames from legacy _DANCE_PREVIEW_FRAMES.
 */

export const DANCE_FRAMES = [
  { transform: 'scaleX(1) scaleY(1) rotate(0deg)', easing: 'cubic-bezier(.42,0,.3,1.4)' },
  { transform: 'scaleX(1.12) scaleY(0.82) rotate(-2deg)', easing: 'cubic-bezier(.6,0,.4,1.3)' },
  { transform: 'scaleX(0.9) scaleY(1.1) rotate(1.5deg)', easing: 'cubic-bezier(.42,0,.3,1.4)' },
  { transform: 'scaleX(1.1) scaleY(0.85) rotate(-1.5deg)', easing: 'cubic-bezier(.6,0,.4,1.3)' },
  { transform: 'scaleX(0.92) scaleY(1.08) rotate(2deg)', easing: 'cubic-bezier(.42,0,.3,1.4)' },
  { transform: 'scaleX(1.06) scaleY(0.9) rotate(-1deg)', easing: 'cubic-bezier(.5,0,.35,1.3)' },
  { transform: 'scaleX(0.97) scaleY(1.03) rotate(0.5deg)', easing: 'cubic-bezier(.4,0,.6,1)' },
  { transform: 'scaleX(1) scaleY(1) rotate(0deg)' },
];

export function isDanceAnim(name) {
  return name === 'dance';
}

export function danceIsInfinite(anim) {
  if (!anim) return false;
  const c = anim.swingCount != null ? +anim.swingCount : 1;
  return !isFinite(c) || c >= 10;
}

export function danceWaitMs(anim) {
  const delay = Math.max(0, +(anim?.delay || 0));
  if (danceIsInfinite(anim)) return delay;
  const dur = Math.max(200, +(anim?.dur ?? anim?.duration ?? 1200) || 1200);
  const loops = Math.max(1, +(anim?.swingCount != null ? anim.swingCount : 1) || 1);
  return delay + dur * loops;
}

function ensureDanceWrap(el) {
  let wrap = el.querySelector('._dance_wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = '_dance_wrap';
    wrap.style.cssText =
      'position:absolute;inset:0;pointer-events:none;overflow:visible;border-radius:inherit;';
    while (el.firstChild) wrap.appendChild(el.firstChild);
    el.appendChild(wrap);
  }
  if (el._danceOvSaved === undefined) el._danceOvSaved = el.style.overflow || '';
  el.style.overflow = 'visible';
  return wrap;
}

function unwrapDance(el) {
  if (!el) return;
  if (el._danceCtl) {
    try {
      el._danceCtl.cancel();
    } catch (e) {}
    el._danceCtl = null;
  }
  if (el._danceOvSaved !== undefined) {
    el.style.overflow = el._danceOvSaved;
    delete el._danceOvSaved;
  }
  const wrap = el.querySelector('._dance_wrap');
  if (!wrap || !wrap.parentNode) return;
  while (wrap.firstChild) wrap.parentNode.insertBefore(wrap.firstChild, wrap);
  wrap.remove();
}

/** Fire on playback/export DOM (non-React). */
export function fireDanceAnim(domEl, elData, anim) {
  if (!domEl) return { waitMs: 0, cancel: () => {} };
  unwrapDance(domEl);
  const delay = Math.max(0, +(anim?.delay || 0));
  const dur = Math.max(200, +(anim?.dur ?? anim?.duration ?? 1200) || 1200);
  const infinite = danceIsInfinite(anim);
  const loops = infinite ? Infinity : Math.max(1, +(anim?.swingCount != null ? anim.swingCount : 1) || 1);
  let timer = null;
  let animObj = null;
  const run = () => {
    if (!domEl.isConnected) return;
    const target = ensureDanceWrap(domEl);
    try {
      target.getAnimations?.().forEach((a) => {
        try {
          a.cancel();
        } catch (e) {}
      });
      animObj = target.animate(DANCE_FRAMES, { duration: dur, iterations: loops, fill: 'none' });
      domEl._danceCtl = animObj;
      if (!infinite && animObj) {
        animObj.onfinish = () => {
          try {
            animObj.cancel();
          } catch (e) {}
          target.style.transform = '';
          unwrapDance(domEl);
        };
      }
    } catch (e) {}
  };
  if (delay > 0) timer = setTimeout(run, delay);
  else run();
  return {
    waitMs: danceWaitMs(anim),
    cancel() {
      if (timer) clearTimeout(timer);
      unwrapDance(domEl);
    },
  };
}

export function clearDance(root) {
  if (!root) return;
  root.querySelectorAll('._dance_wrap').forEach((wrap) => {
    const host = wrap.parentElement;
    if (host) unwrapDance(host);
  });
}

/** Keyframes CSS body for React canvas (compose with element rotation). */
export function danceKeyframesCss(name, rot = 0) {
  const n = Math.max(1, DANCE_FRAMES.length - 1);
  const body = DANCE_FRAMES.map((f, i) => {
    const ease = f.easing ? `animation-timing-function:${f.easing};` : '';
    return `${(i / n) * 100}%{transform:rotate(${rot}deg) ${f.transform};${ease}}`;
  }).join('');
  return `@keyframes ${name}{${body}}`;
}
