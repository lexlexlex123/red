/**
 * Organic float («Плавание») — seamless sine-wave drift via WAAPI.
 * Port of js/10-animations.js _floatFrames / _ensureFloatWrap.
 */

export function isFloatAnim(name) {
  return name === 'float';
}

export function floatSeed(str) {
  let h = 2166136261;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function floatRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** WAAPI keyframes — integer freqs so t=0 and t=1 match (seamless loop). */
export function floatFrames(fw, fh, seed) {
  const mx = (fw || 100) * 0.06;
  const my = (fh || 60) * 0.06;
  const N = 32;
  const rnd = seed != null ? floatRng(seed) : Math.random.bind(Math);
  const mkW = () =>
    [1, 2, 3].map((freq) => ({
      amp: 0.2 + rnd() * 0.8,
      freq,
      phase: rnd() * Math.PI * 2,
    }));
  const rx = mkW();
  const ry = mkW();
  const smp = (ws, t) => {
    const s = ws.reduce((a, w) => a + w.amp * Math.sin(w.freq * t * Math.PI * 2 + w.phase), 0);
    return s / ws.reduce((a, w) => a + w.amp, 0);
  };
  return Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N;
    const x = Math.round(smp(rx, t) * mx);
    const y = Math.round(smp(ry, t) * my);
    const frame = { transform: `translate(${x}px,${y}px)` };
    if (i < N) frame.easing = 'ease-in-out';
    return frame;
  });
}

export function floatGroupBounds(members) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  (members || []).forEach((m) => {
    if (!m) return;
    const x = m.x || 0;
    const y = m.y || 0;
    const w = m.w || 0;
    const h = m.h || 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  });
  if (!isFinite(minX)) return { w: 200, h: 200 };
  return { w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

export function floatFramesForGroup(members, groupId) {
  const b = floatGroupBounds(members);
  const seed = groupId ? floatSeed(String(groupId)) : undefined;
  return floatFrames(b.w, b.h, seed);
}

export function floatIsInfinite(anim) {
  if (!anim) return true;
  const c = anim.swingCount != null ? +anim.swingCount : 10;
  return !isFinite(c) || c >= 10;
}

export function floatWaitMs(anim) {
  const delay = Math.max(0, +(anim?.delay || 0));
  if (floatIsInfinite(anim)) return delay;
  const dur = Math.max(400, +(anim?.dur ?? anim?.duration ?? 3000) || 3000);
  const loops = Math.max(1, +(anim?.swingCount != null ? anim.swingCount : 1) || 1);
  return delay + dur * loops;
}

function ensureFloatWrap(el, fw, fh) {
  const mx = Math.round((fw || 100) * 0.06);
  const my = Math.round((fh || 60) * 0.06);
  let wrap = el.querySelector('._float_wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = '_float_wrap';
    while (el.firstChild) wrap.appendChild(el.firstChild);
    el.appendChild(wrap);
  }
  wrap.style.cssText = `position:absolute;left:${-mx}px;top:${-my}px;width:${fw + 2 * mx}px;height:${fh + 2 * my}px;overflow:visible;pointer-events:none;border-radius:inherit;`;
  const child = wrap.firstElementChild;
  if (child) {
    child.style.position = 'absolute';
    child.style.left = `${mx}px`;
    child.style.top = `${my}px`;
    child.style.width = `${fw}px`;
    child.style.height = `${fh}px`;
    child.style.boxSizing = 'border-box';
  }
  if (el._floatOvSaved === undefined) el._floatOvSaved = el.style.overflow || '';
  el.style.overflow = 'visible';
  return wrap.firstElementChild || wrap;
}

function unwrapFloat(el) {
  if (!el) return;
  if (el._floatCtl) {
    try {
      el._floatCtl.cancel();
    } catch (e) {}
    el._floatCtl = null;
  }
  if (el._floatOvSaved !== undefined) {
    el.style.overflow = el._floatOvSaved;
    delete el._floatOvSaved;
  }
  const wrap = el.querySelector('._float_wrap');
  if (!wrap || !wrap.parentNode) return;
  while (wrap.firstChild) wrap.parentNode.insertBefore(wrap.firstChild, wrap);
  wrap.remove();
}

/**
 * Fire float on a playback/export DOM element (not React-managed).
 * @returns {{ waitMs: number, cancel: function }}
 */
export function fireFloatAnim(domEl, elData, anim, opts = {}) {
  if (!domEl) return { waitMs: 0, cancel: () => {} };
  unwrapFloat(domEl);
  const delay = Math.max(0, +(anim?.delay || 0));
  const dur = Math.max(400, +(anim?.dur ?? anim?.duration ?? 3000) || 3000);
  const infinite = floatIsInfinite(anim);
  const loops = infinite ? Infinity : Math.max(1, +(anim?.swingCount != null ? anim.swingCount : 1) || 1);
  const fw = +(elData?.w || parseFloat(domEl.style.width) || domEl.offsetWidth || 100);
  const fh = +(elData?.h || parseFloat(domEl.style.height) || domEl.offsetHeight || 60);
  let frames = opts.frames;
  if (!frames) {
    if (opts.groupMembers?.length > 1 && (elData?.groupId || opts.groupId)) {
      frames = floatFramesForGroup(opts.groupMembers, elData?.groupId || opts.groupId);
    } else {
      frames = floatFrames(fw, fh, floatSeed(String(elData?.id || domEl.dataset?.id || '')));
    }
  }

  let timer = null;
  let animObj = null;
  const run = () => {
    if (!domEl.isConnected) return;
    const target = ensureFloatWrap(domEl, fw, fh);
    try {
      animObj = target.animate(frames, {
        duration: dur,
        iterations: loops,
        fill: 'none',
      });
      domEl._floatCtl = animObj;
      if (!infinite && animObj) {
        animObj.onfinish = () => {
          unwrapFloat(domEl);
          opts.onDone?.();
        };
      }
    } catch (e) {
      /* WAAPI missing */
    }
  };

  if (delay > 0) timer = setTimeout(run, delay);
  else run();

  return {
    waitMs: floatWaitMs(anim),
    cancel() {
      if (timer) clearTimeout(timer);
      unwrapFloat(domEl);
    },
  };
}

export function clearFloat(root) {
  if (!root) return;
  root.querySelectorAll('._float_wrap').forEach((wrap) => {
    const host = wrap.parentElement;
    if (host) unwrapFloat(host);
  });
  root.querySelectorAll('.react-el, .el').forEach((el) => {
    if (el._floatCtl) {
      try {
        el._floatCtl.cancel();
      } catch (e) {}
      el._floatCtl = null;
    }
  });
}

/** Build frames for React canvas useEffect (no DOM wrap). */
export function floatFramesForEl(elData, slideEls) {
  if (!elData) return floatFrames(100, 60, 1);
  if (elData.groupId && Array.isArray(slideEls)) {
    const members = slideEls.filter((e) => e && e.groupId === elData.groupId);
    if (members.length > 1) return floatFramesForGroup(members, elData.groupId);
  }
  return floatFrames(elData.w || 100, elData.h || 60, floatSeed(String(elData.id || '')));
}
