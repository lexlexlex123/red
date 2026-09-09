/**
 * splitHalf («Пополам»): exit — content splits L/R and falls away (WAAPI).
 * From js/10c-anim-engine.js _fireSplitHalfAnim / _ensureSplitHalfWrap.
 */

export function isSplitHalfAnim(name) {
  return name === 'splitHalf';
}

function isChrome(ch) {
  if (!ch || !ch.classList) return true;
  if (
    ch.classList.contains('link-bar') ||
    ch.classList.contains('trigger-badge') ||
    ch.classList.contains('_particles_layer') ||
    ch.classList.contains('_split_wrap') ||
    ch.classList.contains('rh') ||
    ch.classList.contains('react-el-sel') ||
    ch.classList.contains('react-resize')
  ) {
    return true;
  }
  return false;
}

function takeNodes(el) {
  const nodes = [];
  Array.from(el.children).forEach((ch) => {
    if (isChrome(ch)) return;
    if (ch.classList?.contains('_split_wrap')) return;
    nodes.push(el.removeChild(ch));
  });
  return nodes;
}

function ensureWrap(el) {
  let wrap = el.querySelector('._split_wrap');
  if (wrap) {
    return {
      wrap,
      leftHalf: wrap.querySelector('._split_left'),
      rightHalf: wrap.querySelector('._split_right'),
    };
  }
  const w = parseInt(el.style.width, 10) || el.offsetWidth || 200;
  const h = parseInt(el.style.height, 10) || el.offsetHeight || 100;
  const nodes = takeNodes(el);
  const clones = nodes.map((n) => n.cloneNode(true));

  el._splitOvSaved = el.style.overflow || '';
  el.style.overflow = 'visible';

  wrap = document.createElement('div');
  wrap.className = '_split_wrap';
  wrap.style.cssText = 'position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:2;';

  const leftHalf = document.createElement('div');
  leftHalf.className = '_split_left';
  leftHalf.style.cssText =
    'position:absolute;left:0;top:0;width:50%;height:100%;overflow:hidden;transform-origin:100% 50%;will-change:transform,opacity;';
  const leftInner = document.createElement('div');
  leftInner.className = '_split_inner';
  leftInner.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;`;
  nodes.forEach((n) => leftInner.appendChild(n));

  const rightHalf = document.createElement('div');
  rightHalf.className = '_split_right';
  rightHalf.style.cssText =
    'position:absolute;right:0;top:0;width:50%;height:100%;overflow:hidden;transform-origin:0% 50%;will-change:transform,opacity;';
  const rightInner = document.createElement('div');
  rightInner.className = '_split_inner';
  rightInner.style.cssText = `position:absolute;left:${-w / 2}px;top:0;width:${w}px;height:${h}px;`;
  clones.forEach((n) => rightInner.appendChild(n));

  leftHalf.appendChild(leftInner);
  rightHalf.appendChild(rightInner);
  wrap.appendChild(leftHalf);
  wrap.appendChild(rightHalf);
  el.appendChild(wrap);
  return { wrap, leftHalf, rightHalf };
}

export function resetSplitHalf(el, unwrap) {
  if (!el) return;
  const wrap = el.querySelector('._split_wrap');
  if (!wrap) return;
  wrap.querySelectorAll('._split_left,._split_right').forEach((h) => {
    try {
      h.getAnimations?.().forEach((a) => a.cancel());
    } catch (e) {
      /* ignore */
    }
    h.style.transform = '';
    h.style.opacity = '';
  });
  if (unwrap) {
    const leftInner = wrap.querySelector('._split_left ._split_inner');
    if (leftInner) {
      while (leftInner.firstChild) el.insertBefore(leftInner.firstChild, wrap);
    }
    wrap.remove();
    if (el._splitOvSaved !== undefined) {
      el.style.overflow = el._splitOvSaved;
      delete el._splitOvSaved;
    } else {
      el.style.overflow = '';
    }
  }
}

export function clearSplitHalf(root) {
  if (!root) return;
  root.querySelectorAll('._split_wrap').forEach((wrap) => {
    const host = wrap.parentElement;
    if (host) resetSplitHalf(host, true);
  });
}

export function splitHalfWaitMs(anim) {
  if (!anim) return 0;
  const delay = Math.max(0, +(anim.delay || 0));
  const dur = Math.max(80, +(anim.dur ?? anim.duration ?? 800) || 800);
  return delay + dur;
}

/**
 * Fire split-half exit. Returns { waitMs, cancel }.
 * opts.hideAfter (default true), opts.onHide()
 */
export function fireSplitHalfAnim(domEl, anim, opts = {}) {
  if (!domEl || !anim) return { waitMs: 0, cancel: () => {} };
  const delay = Math.max(0, +(anim.delay || 0));
  const dur = Math.max(80, +(anim.dur ?? anim.duration ?? 800) || 800);
  const hideAfter = opts.hideAfter !== false;
  const w = parseInt(domEl.style.width, 10) || domEl.offsetWidth || 200;
  const h = parseInt(domEl.style.height, 10) || domEl.offsetHeight || 200;
  const fall = Math.round(h * 0.45);
  const spread = Math.round(w * 0.22);
  const rot = 14;
  const easing = 'cubic-bezier(0.4, 0, 1, 1)';

  let cancelled = false;
  let timer = 0;
  let anims = [];

  const cancel = () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    anims.forEach((a) => {
      try {
        a.cancel();
      } catch (e) {
        /* ignore */
      }
    });
  };

  timer = setTimeout(() => {
    if (cancelled) return;
    const parts = ensureWrap(domEl);
    if (!parts.leftHalf || !parts.rightHalf) return;
    const leftFrames = [
      { transform: 'translate(0px, 0px) rotate(0deg)', opacity: 1 },
      { transform: `translate(${-spread}px, ${fall}px) rotate(${-rot}deg)`, opacity: 0 },
    ];
    const rightFrames = [
      { transform: 'translate(0px, 0px) rotate(0deg)', opacity: 1 },
      { transform: `translate(${spread}px, ${fall}px) rotate(${rot}deg)`, opacity: 0 },
    ];
    try {
      const p1 = parts.leftHalf.animate(leftFrames, { duration: dur, easing, fill: 'forwards' });
      const p2 = parts.rightHalf.animate(rightFrames, { duration: dur, easing, fill: 'forwards' });
      anims = [p1, p2];
      Promise.all([p1.finished, p2.finished])
        .then(() => {
          if (cancelled) return;
          if (hideAfter) {
            domEl.style.visibility = 'hidden';
            domEl.style.pointerEvents = 'none';
          }
          if (typeof opts.onHide === 'function') opts.onHide();
          if (opts.unwrap) resetSplitHalf(domEl, true);
        })
        .catch(() => {});
    } catch (e) {
      if (hideAfter) {
        domEl.style.visibility = 'hidden';
        domEl.style.pointerEvents = 'none';
      }
      if (typeof opts.onHide === 'function') opts.onHide();
    }
  }, delay);

  return { waitMs: splitHalfWaitMs(anim), cancel };
}
