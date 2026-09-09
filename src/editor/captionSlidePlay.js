/**
 * captionSlide («Титр в сторону»): appear from side → hold → exit (simplified WAAPI).
 * Full wrap/extents engine lives in js/10c-anim-engine.js; this covers single-el play/export.
 */

export function isCaptionSlideAnim(name) {
  return name === 'captionSlide';
}

function offDelta(dir, w, h) {
  const ww = Math.max(40, w || 200);
  const hh = Math.max(40, h || 100);
  switch (dir) {
    case 'left':
      return { x: -ww - 40, y: 0 };
    case 'up':
      return { x: 0, y: -hh - 40 };
    case 'down':
      return { x: 0, y: hh + 40 };
    case 'right':
    default:
      return { x: ww + 40, y: 0 };
  }
}

export function captionSlideWaitMs(anim) {
  if (!anim) return 0;
  const delay = Math.max(0, +(anim.delay || 0));
  const dur = Math.max(80, +(anim.dur ?? anim.duration ?? 600) || 600);
  const hold = Math.max(0, +(anim.holdDuration ?? 2000) || 2000);
  return delay + dur + hold + dur;
}

/**
 * Fire caption slide. Returns { waitMs, cancel }.
 */
export function fireCaptionSlideAnim(domEl, anim, opts = {}) {
  if (!domEl || !anim) return { waitMs: 0, cancel: () => {} };
  const delay = Math.max(0, +(anim.delay || 0));
  const dur = Math.max(80, +(anim.dur ?? anim.duration ?? 600) || 600);
  const hold = Math.max(0, +(anim.holdDuration ?? 2000) || 2000);
  const dir = anim.captionDir || 'right';
  const hideAfter = opts.hideAfter !== false;
  const w = parseInt(domEl.style.width, 10) || domEl.offsetWidth || 200;
  const h = parseInt(domEl.style.height, 10) || domEl.offsetHeight || 100;
  const off = offDelta(dir, w, h);

  let cancelled = false;
  let timer = 0;
  let holdTimer = 0;
  let anims = [];

  const cancel = () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    if (holdTimer) clearTimeout(holdTimer);
    anims.forEach((a) => {
      try {
        a.cancel();
      } catch (e) {
        /* ignore */
      }
    });
  };

  const runAnim = (from, to, ms, ease) =>
    new Promise((resolve, reject) => {
      try {
        const a = domEl.animate(
          [
            { transform: `translate(${from.x}px, ${from.y}px)`, opacity: from.op ?? 1 },
            { transform: `translate(${to.x}px, ${to.y}px)`, opacity: to.op ?? 1 },
          ],
          { duration: ms, easing: ease, fill: 'forwards' }
        );
        anims.push(a);
        a.finished.then(resolve).catch(reject);
      } catch (e) {
        reject(e);
      }
    });

  timer = setTimeout(() => {
    if (cancelled) return;
    domEl.style.visibility = 'visible';
    domEl.style.pointerEvents = '';
    domEl.style.overflow = 'visible';
    runAnim({ x: off.x, y: off.y, op: 0 }, { x: 0, y: 0, op: 1 }, dur, 'ease-out')
      .then(() => {
        if (cancelled) return;
        holdTimer = setTimeout(() => {
          if (cancelled) return;
          runAnim({ x: 0, y: 0, op: 1 }, { x: off.x, y: off.y, op: 0 }, dur, 'ease-in')
            .then(() => {
              if (cancelled) return;
              if (hideAfter) {
                domEl.style.visibility = 'hidden';
                domEl.style.pointerEvents = 'none';
              }
              if (typeof opts.onHide === 'function') opts.onHide();
            })
            .catch(() => {
              if (hideAfter) domEl.style.visibility = 'hidden';
              if (typeof opts.onHide === 'function') opts.onHide();
            });
        }, hold);
      })
      .catch(() => {
        if (hideAfter) domEl.style.visibility = 'hidden';
        if (typeof opts.onHide === 'function') opts.onHide();
      });
  }, delay);

  return { waitMs: captionSlideWaitMs(anim), cancel };
}
