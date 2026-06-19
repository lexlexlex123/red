// js/10c-anim-engine.js — общий движок анимаций (редактор + экспорт)
(function(){
"use strict";

/* EXPORT:CAPTION-BUNDLE */
function _captionClip(dir, phase, u, w, h) {
  w = w || 200;
  h = h || 200;
  if (dir === 'right') {
    const left = Math.round((phase === 'appear' ? (1 - u) : u) * w);
    return `inset(0 0 0 ${left}px)`;
  }
  if (dir === 'left') {
    const right = Math.round((phase === 'appear' ? (1 - u) : u) * w);
    return `inset(0 ${right}px 0 0)`;
  }
  if (dir === 'down') {
    const top = Math.round((phase === 'appear' ? (1 - u) : u) * h);
    return `inset(${top}px 0 0 0)`;
  }
  const bottom = Math.round((phase === 'appear' ? (1 - u) : u) * h);
  return `inset(0 0 ${bottom}px 0)`;
}

function _captionGroupBounds(items) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  (items || []).forEach(it => {
    const x = it.x != null ? it.x : 0, y = it.y != null ? it.y : 0;
    const w = it.w || 200, h = it.h || 200;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
  });
  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

function _captionGroupVisibleRect(dir, phase, u, G) {
  if (dir === 'right') {
    if (phase === 'appear') {
      const edge = G.x + u * G.w;
      return { left: G.x, top: G.y, right: edge, bottom: G.y + G.h };
    }
    if (phase === 'exit') {
      const edge = G.x + u * G.w;
      return { left: edge, top: G.y, right: G.x + G.w, bottom: G.y + G.h };
    }
  } else if (dir === 'left') {
    if (phase === 'appear') {
      const edge = G.x + (1 - u) * G.w;
      return { left: edge, top: G.y, right: G.x + G.w, bottom: G.y + G.h };
    }
    if (phase === 'exit') {
      const edge = G.x + (1 - u) * G.w;
      return { left: G.x, top: G.y, right: edge, bottom: G.y + G.h };
    }
  } else if (dir === 'down') {
    if (phase === 'appear') {
      const edge = G.y + u * G.h;
      return { left: G.x, top: G.y, right: G.x + G.w, bottom: edge };
    }
    if (phase === 'exit') {
      const edge = G.y + u * G.h;
      return { left: G.x, top: edge, right: G.x + G.w, bottom: G.y + G.h };
    }
  } else {
    if (phase === 'appear') {
      const edge = G.y + (1 - u) * G.h;
      return { left: G.x, top: edge, right: G.x + G.w, bottom: G.y + G.h };
    }
    if (phase === 'exit') {
      const edge = G.y + (1 - u) * G.h;
      return { left: G.x, top: G.y, right: G.x + G.w, bottom: edge };
    }
  }
  return { left: G.x, top: G.y, right: G.x + G.w, bottom: G.y + G.h };
}

function _captionClipGroup(dir, phase, u, G, mx, my, mw, mh) {
  const vis = _captionGroupVisibleRect(dir, phase, u, G);
  const vLeft = Math.max(mx, vis.left);
  const vTop = Math.max(my, vis.top);
  const vRight = Math.min(mx + mw, vis.right);
  const vBottom = Math.min(my + mh, vis.bottom);
  const left = Math.max(0, Math.round(vLeft - mx));
  const top = Math.max(0, Math.round(vTop - my));
  const right = Math.max(0, Math.round((mx + mw) - vRight));
  const bottom = Math.max(0, Math.round((my + mh) - vBottom));
  return `inset(${top}px ${right}px ${bottom}px ${left}px)`;
}

function _captionStageForGroup(wrap, inner, dir, w, h, bounds, phase) {
  const { dx, dy } = _captionShift(bounds.w, bounds.h);
  wrap.style.right = 'auto';
  wrap.style.bottom = 'auto';
  inner.style.left = '0';
  inner.style.top = '0';
  _captionLockInnerSize(inner, w, h);
  if (dir === 'right') {
    wrap.style.top = '0';
    wrap.style.height = h + 'px';
    wrap.style.left = '0';
    wrap.style.width = (phase === 'exit' ? (w + dx) : w) + 'px';
  } else if (dir === 'left') {
    wrap.style.top = '0';
    wrap.style.height = h + 'px';
    if (phase === 'exit') {
      wrap.style.left = (-dx) + 'px';
      wrap.style.width = (w + dx) + 'px';
    } else {
      wrap.style.left = '0';
      wrap.style.width = w + 'px';
    }
  } else if (dir === 'down') {
    wrap.style.left = '0';
    wrap.style.width = w + 'px';
    wrap.style.top = '0';
    wrap.style.height = (phase === 'exit' ? (h + dy) : h) + 'px';
  } else {
    wrap.style.left = '0';
    wrap.style.width = w + 'px';
    if (phase === 'exit') {
      wrap.style.top = (-dy) + 'px';
      wrap.style.height = (h + dy) + 'px';
    } else {
      wrap.style.top = '0';
      wrap.style.height = h + 'px';
    }
  }
}

function _captionWrapFramesGroup(bounds, mx, my, mw, mh, dir, phase, steps) {
  steps = steps || 24;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const u = i / steps;
    const clip = _captionClipGroup(dir, phase, u, bounds, mx, my, mw, mh);
    return { clipPath: clip, WebkitClipPath: clip };
  });
}

function _captionInnerFramesGroup(gw, gh, dir, phase, steps) {
  steps = steps || 24;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const u = i / steps;
    return {
      transform: _captionTranslate(dir, phase, gw, gh, u),
      opacity: phase === 'appear' ? u : 1 - u
    };
  });
}

function _captionPrepHiddenGroup(wrap, inner, dir, bounds, mx, my, mw, mh) {
  _captionStageForGroup(wrap, inner, dir, mw, mh, bounds, 'appear');
  const clip = _captionClipGroup(dir, 'appear', 0, bounds, mx, my, mw, mh);
  wrap.style.clipPath = clip;
  wrap.style.webkitClipPath = clip;
  inner.style.transform = _captionTranslate(dir, 'appear', bounds.w, bounds.h, 0);
  inner.style.opacity = '0';
}

function _captionHoldVisibleGroup(wrap, inner, dir, bounds, mx, my, mw, mh) {
  _captionStageForGroup(wrap, inner, dir, mw, mh, bounds, 'hold');
  const clip = _captionClipGroup(dir, 'hold', 1, bounds, mx, my, mw, mh);
  wrap.style.clipPath = clip;
  wrap.style.webkitClipPath = clip;
  inner.style.transform = '';
  inner.style.opacity = '1';
}

function _captionPlayPhaseGroup(items, bounds, dir, phase, ms, easing) {
  const steps = 24;
  const innerFrames = _captionInnerFramesGroup(bounds.w, bounds.h, dir, phase, steps);
  const anims = items.map(it => {
    _captionStageForGroup(it.wrap, it.inner, dir, it.w, it.h, bounds, phase);
    _captionClearStyles(it.wrap, it.inner);
    const wrapFrames = _captionWrapFramesGroup(bounds, it.x, it.y, it.w, it.h, dir, phase, steps);
    const aw = it.wrap.animate(wrapFrames, { duration: ms, easing, fill: 'forwards' });
    const ai = it.inner.animate(innerFrames, { duration: ms, easing, fill: 'forwards' });
    return Promise.all([aw.finished, ai.finished]).catch(() => {});
  });
  return Promise.all(anims).then(() => {});
}

function _captionShift(w, h) {
  return { dx: Math.round(w * 0.1), dy: Math.round(h * 0.1) };
}

function _captionStageFor(wrap, inner, dir, w, h, phase) {
  const { dx, dy } = _captionShift(w, h);
  wrap.style.right = 'auto';
  wrap.style.bottom = 'auto';
  inner.style.left = '0';
  inner.style.top = '0';
  _captionLockInnerSize(inner, w, h);
  if (dir === 'right') {
    wrap.style.top = '0';
    wrap.style.height = h + 'px';
    wrap.style.left = '0';
    wrap.style.width = (phase === 'exit' ? (w + dx) : w) + 'px';
  } else if (dir === 'left') {
    wrap.style.top = '0';
    wrap.style.height = h + 'px';
    if (phase === 'exit') {
      wrap.style.left = (-dx) + 'px';
      wrap.style.width = (w + dx) + 'px';
    } else {
      wrap.style.left = '0';
      wrap.style.width = w + 'px';
    }
  } else if (dir === 'down') {
    wrap.style.left = '0';
    wrap.style.width = w + 'px';
    wrap.style.top = '0';
    wrap.style.height = (phase === 'exit' ? (h + dy) : h) + 'px';
  } else {
    wrap.style.left = '0';
    wrap.style.width = w + 'px';
    if (phase === 'exit') {
      wrap.style.top = (-dy) + 'px';
      wrap.style.height = (h + dy) + 'px';
    } else {
      wrap.style.top = '0';
      wrap.style.height = h + 'px';
    }
  }
}

function _captionResetStage(wrap) {
  if (!wrap) return;
  wrap.style.left = wrap.style.top = wrap.style.width = wrap.style.height = '';
  wrap.style.right = wrap.style.bottom = '';
}

function _captionTranslate(dir, phase, w, h, u) {
  const dx = w * 0.1, dy = h * 0.1;
  let x = 0, y = 0;
  if (dir === 'right') {
    if (phase === 'appear') x = -dx * (1 - u);
    else x = dx * u;
  } else if (dir === 'left') {
    if (phase === 'appear') x = dx * (1 - u);
    else x = -dx * u;
  } else if (dir === 'down') {
    if (phase === 'appear') y = -dy * (1 - u);
    else y = dy * u;
  } else {
    if (phase === 'appear') y = dy * (1 - u);
    else y = -dy * u;
  }
  return `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)`;
}

function _captionWrapFrames(w, h, dir, phase, steps) {
  steps = steps || 24;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const u = i / steps;
    const clip = _captionClip(dir, phase, u, w, h);
    return { clipPath: clip, WebkitClipPath: clip };
  });
}

function _captionInnerFrames(w, h, dir, phase, steps) {
  steps = steps || 24;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const u = i / steps;
    return {
      transform: _captionTranslate(dir, phase, w, h, u),
      opacity: phase === 'appear' ? u : 1 - u
    };
  });
}

function _captionFreeEl(el) {
  if (!el || el._capOvSaved !== undefined) return;
  el._capOvSaved = el.style.overflow || '';
  el.style.overflow = 'visible';
}

function _captionRestoreEl(el) {
  if (!el || el._capOvSaved === undefined) return;
  el.style.overflow = el._capOvSaved;
  delete el._capOvSaved;
}

function _captionLockInnerSize(inner, w, h) {
  inner.style.width = w + 'px';
  inner.style.height = h + 'px';
  inner.style.maxWidth = w + 'px';
  inner.style.maxHeight = h + 'px';
  inner.style.boxSizing = 'border-box';
}

function _captionClearStyles(wrap, inner) {
  if (wrap) {
    wrap.style.removeProperty('clip-path');
    wrap.style.removeProperty('-webkit-clip-path');
  }
  if (inner) {
    inner.style.removeProperty('transform');
    inner.style.removeProperty('opacity');
  }
}

function _captionPrepHidden(wrap, inner, dir, w, h) {
  _captionStageFor(wrap, inner, dir, w, h, 'appear');
  const clip = _captionClip(dir, 'appear', 0, w, h);
  wrap.style.clipPath = clip;
  wrap.style.webkitClipPath = clip;
  inner.style.transform = _captionTranslate(dir, 'appear', w, h, 0);
  inner.style.opacity = '0';
}

function _captionPlayPhase(wrap, inner, w, h, dir, phase, ms, easing) {
  _captionStageFor(wrap, inner, dir, w, h, phase);
  _captionClearStyles(wrap, inner);
  const aw = wrap.animate(_captionWrapFrames(w, h, dir, phase), { duration: ms, easing, fill: 'forwards' });
  const ai = inner.animate(_captionInnerFrames(w, h, dir, phase), { duration: ms, easing, fill: 'forwards' });
  return Promise.all([aw.finished, ai.finished]).catch(() => {});
}

function _captionHoldVisible(wrap, inner, dir, w, h) {
  _captionStageFor(wrap, inner, dir, w, h, 'hold');
  wrap.style.clipPath = 'inset(0)';
  wrap.style.webkitClipPath = 'inset(0)';
  inner.style.transform = '';
  inner.style.opacity = '1';
}

function _ensureCaptionWrap(el) {
  let wrap = el.querySelector('._caption_wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = '_caption_wrap';
    wrap.style.cssText = 'position:absolute;inset:0;overflow:visible;pointer-events:none;';
    const inner = document.createElement('div');
    inner.className = '_caption_inner';
    inner.style.cssText = 'position:absolute;left:0;top:0;';
    while (el.firstChild) inner.appendChild(el.firstChild);
    wrap.appendChild(inner);
    el.appendChild(wrap);
    return { wrap, inner };
  }
  let inner = wrap.querySelector('._caption_inner');
  if (!inner) {
    inner = document.createElement('div');
    inner.className = '_caption_inner';
    inner.style.cssText = 'position:absolute;left:0;top:0;';
    while (wrap.firstChild) inner.appendChild(wrap.firstChild);
    wrap.appendChild(inner);
  }
  return { wrap, inner };
}

function _ensureSplitHalfWrap(el) {
  let wrap = el.querySelector('._split_wrap');
  if (wrap) {
    return {
      wrap,
      leftHalf: wrap.querySelector('._split_left'),
      rightHalf: wrap.querySelector('._split_right'),
    };
  }
  const w = parseInt(el.style.width, 10) || el.offsetWidth || 200;
  const nodes = [];
  while (el.firstChild) nodes.push(el.removeChild(el.firstChild));
  const clones = nodes.map(n => n.cloneNode(true));

  el._splitOvSaved = el.style.overflow || '';
  el.style.overflow = 'visible';

  wrap = document.createElement('div');
  wrap.className = '_split_wrap';
  wrap.style.cssText = 'position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:2;';

  const leftHalf = document.createElement('div');
  leftHalf.className = '_split_left';
  leftHalf.style.cssText = 'position:absolute;left:0;top:0;width:50%;height:100%;overflow:hidden;transform-origin:100% 50%;will-change:transform,opacity;';
  const leftInner = document.createElement('div');
  leftInner.className = '_split_inner';
  leftInner.style.cssText = 'position:absolute;left:0;top:0;width:' + w + 'px;height:100%;';
  nodes.forEach(n => leftInner.appendChild(n));

  const rightHalf = document.createElement('div');
  rightHalf.className = '_split_right';
  rightHalf.style.cssText = 'position:absolute;right:0;top:0;width:50%;height:100%;overflow:hidden;transform-origin:0% 50%;will-change:transform,opacity;';
  const rightInner = document.createElement('div');
  rightInner.className = '_split_inner';
  rightInner.style.cssText = 'position:absolute;left:' + (-w / 2) + 'px;top:0;width:' + w + 'px;height:100%;';
  clones.forEach(n => rightInner.appendChild(n));

  leftHalf.appendChild(leftInner);
  rightHalf.appendChild(rightInner);
  wrap.appendChild(leftHalf);
  wrap.appendChild(rightHalf);
  el.appendChild(wrap);
  return { wrap, leftHalf, rightHalf };
}

window._resetSplitHalf = function(el, unwrap) {
  if (!el) return;
  const wrap = el.querySelector('._split_wrap');
  if (!wrap) return;
  wrap.querySelectorAll('._split_left,._split_right').forEach(h => {
    h.getAnimations().forEach(a => { try { a.cancel(); } catch (e) {} });
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
};

window._fireSplitHalfAnim = function(el, a, delay, opts) {
  opts = opts || {};
  const dur = +(a.duration || 800) || 800;
  const dl = delay || 0;
  const w = parseInt(el.style.width, 10) || el.offsetWidth || 200;
  const h = parseInt(el.style.height, 10) || el.offsetHeight || 200;
  const fall = Math.round(h * 0.45);
  const spread = Math.round(w * 0.22);
  const rot = 14;
  const easing = 'cubic-bezier(0.4, 0, 1, 1)';

  setTimeout(() => {
    const parts = _ensureSplitHalfWrap(el);
    const leftFrames = [
      { transform: 'translate(0px, 0px) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + (-spread) + 'px, ' + fall + 'px) rotate(' + (-rot) + 'deg)', opacity: 0 }
    ];
    const rightFrames = [
      { transform: 'translate(0px, 0px) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + spread + 'px, ' + fall + 'px) rotate(' + rot + 'deg)', opacity: 0 }
    ];
    const p1 = parts.leftHalf.animate(leftFrames, { duration: dur, easing, fill: 'forwards' });
    const p2 = parts.rightHalf.animate(rightFrames, { duration: dur, easing, fill: 'forwards' });
    Promise.all([p1.finished, p2.finished]).then(() => {
      if (opts.hideAfter !== false) {
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
      }
      if (opts.onHide) opts.onHide();
      if (opts.unwrap) window._resetSplitHalf(el, true);
    }).catch(() => {});
  }, dl);
};

window._resetCaptionSlide = function(el, unwrap) {
  if (!el) return;
  _captionRestoreEl(el);
  el.style.visibility = '';
  const wrap = el.querySelector('._caption_wrap');
  if (!wrap) return;
  _captionResetStage(wrap);
  const inner = wrap.querySelector('._caption_inner');
  [inner, wrap].forEach(node => {
    if (!node) return;
    node.getAnimations().forEach(a => { try { a.cancel(); } catch (e) {} });
  });
  if (unwrap) {
    const src = inner || wrap;
    while (src.firstChild) el.insertBefore(src.firstChild, wrap);
    wrap.remove();
  } else if (inner) {
    _captionClearStyles(wrap, inner);
  }
};

window._prepCaptionSlideInitial = function(el, a, w, h) {
  const dir = a.captionDir || 'right';
  const { wrap, inner } = _ensureCaptionWrap(el);
  _captionLockInnerSize(inner, w, h);
  _captionPrepHidden(wrap, inner, dir, w, h);
};

window._fireCaptionSlideAnimGroup = function(entries, a, delay, opts) {
  opts = opts || {};
  if (!entries || !entries.length) return;
  const hideAfter = opts.hideAfter !== false;
  const appearMs = +(a.duration || 600) || 600;
  const holdMs = +(a.holdDuration || 2000) || 2000;
  const exitMs = +(a.duration || 600) || 600;
  const dir = a.captionDir || 'right';

  const items = entries.map(e => {
    const w = e.w || parseInt(e.el.style.width) || 200;
    const h = e.h || parseInt(e.el.style.height) || 200;
    const x = e.x != null ? e.x : (parseInt(e.el.style.left) || 0);
    const y = e.y != null ? e.y : (parseInt(e.el.style.top) || 0);
    const parts = _ensureCaptionWrap(e.el);
    return { el: e.el, x, y, w, h, wrap: parts.wrap, inner: parts.inner };
  });
  const bounds = items.length > 1 ? _captionGroupBounds(items) : null;
  const groupMode = !!(bounds && items.length > 1);

  if (window._activeCaptionRun) {
    window._activeCaptionRun.cancelled = true;
    clearTimeout(window._activeCaptionRun.holdTimer);
  }
  const run = { cancelled: false, holdTimer: null };
  window._activeCaptionRun = run;

  items.forEach(it => {
    if (delay > 0) {
      if (groupMode) _captionPrepHiddenGroup(it.wrap, it.inner, dir, bounds, it.x, it.y, it.w, it.h);
      else {
        window._prepCaptionSlideInitial(it.el, a, it.w, it.h);
      }
      _captionFreeEl(it.el);
    }
  });

  const finishHide = () => {
    if (run.cancelled) return;
    items.forEach(it => {
      _captionRestoreEl(it.el);
      if (hideAfter) it.el.style.visibility = 'hidden';
      else window._resetCaptionSlide(it.el, true);
    });
    if (window._activeCaptionRun === run) window._activeCaptionRun = null;
  };

  const playPhase = (phase, ms, ease) => {
    if (groupMode) return _captionPlayPhaseGroup(items, bounds, dir, phase, ms, ease);
    const it = items[0];
    return _captionPlayPhase(it.wrap, it.inner, it.w, it.h, dir, phase, ms, ease);
  };

  const runExit = () => {
    if (run.cancelled) return;
    playPhase('exit', exitMs, 'ease-in').then(finishHide).catch(finishHide);
  };

  setTimeout(() => {
    if (run.cancelled) return;
    items.forEach(it => {
      _captionFreeEl(it.el);
      it.el.style.visibility = '';
    });
    playPhase('appear', appearMs, 'ease-out').then(() => {
      if (run.cancelled) return;
      items.forEach(it => {
        if (groupMode) _captionHoldVisibleGroup(it.wrap, it.inner, dir, bounds, it.x, it.y, it.w, it.h);
        else _captionHoldVisible(it.wrap, it.inner, dir, it.w, it.h);
      });
      run.holdTimer = setTimeout(runExit, holdMs);
    }).catch(finishHide);
  }, delay || 0);
};

window._fireCaptionSlideAnim = function(el, a, delay, w, h, opts) {
  window._fireCaptionSlideAnimGroup([{ el, w, h }], a, delay, opts);
};

function _ensureSplitHalfWrap(el) {
  let wrap = el.querySelector('._split_wrap');
  if (wrap) {
    return {
      wrap,
      leftHalf: wrap.querySelector('._split_left'),
      rightHalf: wrap.querySelector('._split_right'),
    };
  }
  const w = parseInt(el.style.width, 10) || el.offsetWidth || 200;
  const nodes = [];
  while (el.firstChild) nodes.push(el.removeChild(el.firstChild));
  const clones = nodes.map(n => n.cloneNode(true));

  el._splitOvSaved = el.style.overflow || '';
  el.style.overflow = 'visible';

  wrap = document.createElement('div');
  wrap.className = '_split_wrap';
  wrap.style.cssText = 'position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:2;';

  const leftHalf = document.createElement('div');
  leftHalf.className = '_split_left';
  leftHalf.style.cssText = 'position:absolute;left:0;top:0;width:50%;height:100%;overflow:hidden;transform-origin:100% 50%;will-change:transform,opacity;';
  const leftInner = document.createElement('div');
  leftInner.className = '_split_inner';
  leftInner.style.cssText = 'position:absolute;left:0;top:0;width:' + w + 'px;height:100%;';
  nodes.forEach(n => leftInner.appendChild(n));

  const rightHalf = document.createElement('div');
  rightHalf.className = '_split_right';
  rightHalf.style.cssText = 'position:absolute;right:0;top:0;width:50%;height:100%;overflow:hidden;transform-origin:0% 50%;will-change:transform,opacity;';
  const rightInner = document.createElement('div');
  rightInner.className = '_split_inner';
  rightInner.style.cssText = 'position:absolute;left:' + (-w / 2) + 'px;top:0;width:' + w + 'px;height:100%;';
  clones.forEach(n => rightInner.appendChild(n));

  leftHalf.appendChild(leftInner);
  rightHalf.appendChild(rightInner);
  wrap.appendChild(leftHalf);
  wrap.appendChild(rightHalf);
  el.appendChild(wrap);
  return { wrap, leftHalf, rightHalf };
}

window._resetSplitHalf = function(el, unwrap) {
  if (!el) return;
  const wrap = el.querySelector('._split_wrap');
  if (!wrap) return;
  wrap.querySelectorAll('._split_left,._split_right').forEach(h => {
    h.getAnimations().forEach(a => { try { a.cancel(); } catch (e) {} });
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
};

window._fireSplitHalfAnim = function(el, a, delay, opts) {
  opts = opts || {};
  const dur = +(a.duration || 800) || 800;
  const dl = delay || 0;
  const w = parseInt(el.style.width, 10) || el.offsetWidth || 200;
  const h = parseInt(el.style.height, 10) || el.offsetHeight || 200;
  const fall = Math.round(h * 0.45);
  const spread = Math.round(w * 0.22);
  const rot = 14;
  const easing = 'cubic-bezier(0.4, 0, 1, 1)';

  setTimeout(() => {
    const parts = _ensureSplitHalfWrap(el);
    const leftFrames = [
      { transform: 'translate(0px, 0px) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + (-spread) + 'px, ' + fall + 'px) rotate(' + (-rot) + 'deg)', opacity: 0 }
    ];
    const rightFrames = [
      { transform: 'translate(0px, 0px) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + spread + 'px, ' + fall + 'px) rotate(' + rot + 'deg)', opacity: 0 }
    ];
    const p1 = parts.leftHalf.animate(leftFrames, { duration: dur, easing, fill: 'forwards' });
    const p2 = parts.rightHalf.animate(rightFrames, { duration: dur, easing, fill: 'forwards' });
    Promise.all([p1.finished, p2.finished]).then(() => {
      if (opts.hideAfter !== false) {
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
      }
      if (opts.onHide) opts.onHide();
      if (opts.unwrap) window._resetSplitHalf(el, true);
    }).catch(() => {});
  }, dl);
};

/* END:EXPORT:CAPTION-BUNDLE */

/* EXPORT:ENGINE-TAIL */

window.ANIM_ENGINE_META = {
  fadeIn: { engine: 'css', export: 'css' },
  slideUp: { engine: 'css', export: 'css' },
  slideDown: { engine: 'css', export: 'css' },
  slideLeft: { engine: 'css', export: 'css' },
  slideRight: { engine: 'css', export: 'css' },
  zoomIn: { engine: 'css', export: 'css' },
  spinIn: { engine: 'css', export: 'css' },
  bounceIn: { engine: 'css', export: 'css' },
  fadeOut: { engine: 'css', export: 'css' },
  slideOut: { engine: 'css', export: 'css' },
  zoomOut: { engine: 'css', export: 'css' },
  pulse: { engine: 'css', export: 'css' },
  shake: { engine: 'css', export: 'css' },
  flash: { engine: 'css', export: 'css' },
  rotate: { engine: 'waapi', export: 'waapi' },
  splitHalf: { engine: 'custom', export: 'splitHalf' },
  moveTo: { engine: 'waapi', export: 'waapi' },
  orbitTo: { engine: 'waapi', export: 'waapi' },
  dance: { engine: 'live', export: 'live' },
  swing: { engine: 'live', export: 'live' },
  float: { engine: 'live', export: 'live' },
  typewriter: { engine: 'custom', export: 'typewriter' },
  captionSlide: { engine: 'custom', export: 'captionSlide' },
};

window._LIVE_LOOP_NAMES = { dance: 1, swing: 1 };

window._animChainDuration = function(a) {
  if (!a) return 600;
  if (a.name === 'captionSlide') {
    const d = +(a.duration || 600) || 600;
    const h = +(a.holdDuration || 2000) || 2000;
    return d + h + d;
  }
  if (a.name === 'splitHalf') return +(a.duration || 800) || 800;
  if (a.name === 'typewriter') {
    const cd = a.charDelay || 40;
    const fromLen = (a.fromHtml || '').replace(/<[^>]*>/g, '').length;
    const toLen = (a.toHtml || '').replace(/<[^>]*>/g, '').length;
    return (fromLen + toLen) * cd + 200;
  }
  return a.duration || 600;
};

window._animEffTrigger = function(gList) {
  let lastTrig = 'auto', lastRes = 'auto';
  return gList.map(item => {
    const t = item.a.trigger || 'auto';
    if (t === 'element') { lastTrig = 'auto'; lastRes = 'element'; return 'element'; }
    if (t === 'nav') { lastTrig = 'auto'; lastRes = 'nav'; return 'nav'; }
    if (t === 'click') { lastTrig = 'click'; lastRes = 'click'; return 'click'; }
    if (t === 'withPrev') return lastRes;
    if (lastTrig === 'click') return 'autoAfter';
    lastTrig = 'auto'; lastRes = 'auto';
    return 'auto';
  });
};

window.buildAnimSchedule = function(slide) {
  const autoMap = {}, clickMap = {}, autoSegments = [];
  if (!slide || !slide.els) return { autoMap, clickMap, autoSegments, totalMs: 0 };
  const gList = typeof window._buildSlideAnimGlobalList === 'function'
    ? window._buildSlideAnimGlobalList(slide).map(({ d, a }) => ({ d, a }))
    : (() => {
      const list = [];
      slide.els.forEach(d => {
        if (d._isDecor) return;
        (d.anims || []).forEach(a => list.push({ d, a }));
      });
      return list;
    })();
  const gEffTrig = window._animEffTrigger(gList);
  const absStarts = window._computeAnimAbsStarts(slide);
  const absStartMap = new Map();
  absStarts.forEach(s => { if (!s.skip) absStartMap.set(s.elId + ':' + s.ai, s.abs); });
  gList.forEach((item, gi) => {
    const d = item.d, a = item.a, eff = gEffTrig[gi];
    const ai = (d.anims || []).indexOf(a);
    if (eff === 'element' || eff === 'nav') return;
    if ((a.trigger || 'auto') === 'element' || (a.trigger || 'auto') === 'nav' || (a.trigger || 'auto') === 'click') return;
    if (eff === 'auto' || eff === 'afterPrev' || eff === 'withPrev') {
      const abs = absStartMap.has(d.id + ':' + ai) ? absStartMap.get(d.id + ':' + ai) : (a.delay || 0);
      const gPD = window._animChainDuration(a);
      if (!autoMap[d.id]) autoMap[d.id] = [];
      autoMap[d.id].push({ anim: a, absDelay: abs });
      autoSegments.push({ d, a, absDelay: abs, dur: gPD });
    } else if (eff === 'click') {
      if (!clickMap[d.id]) clickMap[d.id] = [];
      clickMap[d.id].push({ anim: a, autoAfter: false });
    } else if (eff === 'autoAfter') {
      if (!clickMap[d.id]) clickMap[d.id] = [];
      clickMap[d.id].push({ anim: a, autoAfter: true });
    }
  });
  const totalMs = autoSegments.reduce((m, s) => Math.max(m, s.absDelay + s.dur), 0);
  return { autoMap, clickMap, autoSegments, totalMs };
};

window.computeSlideAnimTimeline = function(slide) {
  if (!slide) return { totalMs: 800, segments: [], laneCount: 1 };
  if (typeof window._ensureAnimOrder === 'function') window._ensureAnimOrder(slide);
  const info = typeof ANIM_INFO !== 'undefined' ? ANIM_INFO : {};
  const gList = window._animTimelineGList(slide);
  const gEffTrig = window._animEffTrigger(gList);
  const absStarts = window._computeAnimAbsStarts(slide);
  const absStartMap = new Map();
  absStarts.forEach(s => { if (!s.skip) absStartMap.set(s.elId + ':' + s.ai, s.abs); });
  const segments = [];
  let gPS = 0, gPD = 0;
  let autoEnd = 0;

  const entries = [];
  if (slide.animOrder && slide.animOrder.length) {
    slide.animOrder.forEach(({ elId, ai }) => {
      const d = slide.els.find(x => x.id === elId);
      const a = d && d.anims && d.anims[ai];
      if (!d || !a || d._isDecor) return;
      entries.push({ d, a, ai });
    });
  } else {
    gList.forEach(item => {
      entries.push({ d: item.d, a: item.a, ai: (item.d.anims || []).indexOf(item.a) });
    });
  }

  const _overlap = (a, b) => a.absDelay < b.absDelay + b.dur && b.absDelay < a.absDelay + a.dur;

  entries.forEach(({ d, a, ai }) => {
    const gi = gList.findIndex(item => item.d.id === d.id && item.a === a);
    const eff = gi >= 0 ? gEffTrig[gi] : 'auto';
    const trigger = a.trigger || 'auto';
    if (trigger === 'element' || trigger === 'nav' || eff === 'nav') return;

    const dur = window._animChainDuration(a);
    const cat = (info[a.name] && info[a.name].cat) || a.cat || 'entrance';
    const label = (info[a.name] && info[a.name].label) || a.name;
    const isClick = trigger === 'click' || eff === 'click';
    let absDelay;

    if (isClick) {
      absDelay = autoEnd + (a.delay || 0);
    } else if (eff === 'autoAfter') {
      absDelay = gPS + gPD + (a.delay || 0);
      gPS = absDelay;
      gPD = dur;
      autoEnd = Math.max(autoEnd, absDelay + dur);
    } else {
      absDelay = absStartMap.has(d.id + ':' + ai) ? absStartMap.get(d.id + ':' + ai) : (a.delay || 0);
      gPS = absDelay;
      gPD = dur;
      autoEnd = Math.max(autoEnd, absDelay + dur);
    }

    segments.push({ elId: d.id, ai, anim: a, absDelay, dur, cat, label, trigger, isClick, lane: 0 });
  });

  segments.forEach((seg, si) => {
    const manualLane = seg.anim.tlLane;
    if (manualLane != null && manualLane >= 0 && !isNaN(+manualLane)) {
      seg.lane = +manualLane;
      return;
    }
    const isWithPrev = seg.trigger === 'withPrev';
    if (isWithPrev && si > 0) {
      seg.lane = segments[si - 1].lane;
      return;
    }
    let lane = 0;
    while (segments.some((s, j) => j < si && s.lane === lane && _overlap(seg, s))) lane++;
    if (si > 0 && segments[si - 1].trigger !== 'withPrev') {
      lane = Math.max(lane, segments[si - 1].lane + 1);
    }
    while (segments.some((s, j) => j < si && s.lane === lane && _overlap(seg, s))) lane++;
    seg.lane = lane;
  });

  const laneCount = segments.length ? Math.max(...segments.map(s => s.lane)) + 1 : 1;
  const contentMs = segments.reduce((m, s) => Math.max(m, s.absDelay + s.dur), 0);
  const totalMs = Math.max(contentMs + 400, 800);
  return { totalMs, segments, laneCount };
};

window._refreshAnimTimeline = function() {
  if (typeof slides === 'undefined' || typeof cur === 'undefined') return;
  if (typeof window.renderAnimTimelineBar === 'function') window.renderAnimTimelineBar(slides[cur]);
};

window._alignAnimWithPrev = function(slide, elId, ai) {
  const d = slide.els.find(x => x.id === elId);
  if (!d || !d.anims || !d.anims[ai]) return;
  const a = d.anims[ai];
  if ((a.trigger || 'auto') !== 'withPrev') return;
  const prevStart = window._getPrevTimedAnimStart(slide, elId, ai);
  window._setAnimAbsDelay(slide, elId, ai, prevStart + (a.delay || 0));
  if (typeof window._syncAnimDomAfterTimelineEdit === 'function') {
    window._syncAnimDomAfterTimelineEdit(slide);
  }
};

window.verifyAnimParity = function(opts) {
  opts = opts || {};
  const missing = [];
  const animNames = new Set();
  if (typeof ANIM_CATS !== 'undefined') {
    ANIM_CATS.forEach(g => g.items.forEach(it => animNames.add(it.name)));
  }
  Object.keys(window.ANIM_ENGINE_META || {}).forEach(n => animNames.add(n));
  animNames.forEach(name => {
    const meta = window.ANIM_ENGINE_META[name];
    if (!meta) { missing.push({ name, issue: 'no ANIM_ENGINE_META' }); return; }
    if (meta.engine === 'custom' && name === 'captionSlide' && typeof window._fireCaptionSlideAnim !== 'function') {
      missing.push({ name, issue: 'missing _fireCaptionSlideAnim' });
    }
    if (meta.engine === 'custom' && name === 'splitHalf' && typeof window._fireSplitHalfAnim !== 'function') {
      missing.push({ name, issue: 'missing _fireSplitHalfAnim' });
    }
    if (meta.export === 'css' && typeof ANIM_CSS !== 'undefined' && !ANIM_CSS[name]) {
      missing.push({ name, issue: 'missing ANIM_CSS key' });
    }
  });
  if (missing.length && !opts.silent) {
    console.warn('[anim-engine] parity issues:', missing);
  }
  return { ok: missing.length === 0, missing };
};

window.applyAnimConfig = function(cfg) {
  if (!cfg || typeof ANIM_CATS === 'undefined') return;
  const avail = cfg.available;
  if (Array.isArray(avail) && avail.length) {
    const disabled = new Set(avail.filter(x => x.enabled === false).map(x => x.id));
    const labelMap = {};
    avail.forEach(x => { if (x.id && x.label) labelMap[x.id] = x.label; });
    ANIM_CATS.forEach(group => {
      group.items = group.items.filter(it => !disabled.has(it.name));
      group.items.forEach(it => {
        if (labelMap[it.name]) it.label = labelMap[it.name];
        if (typeof ANIM_INFO !== 'undefined' && ANIM_INFO[it.name]) ANIM_INFO[it.name].label = it.label;
      });
    });
  }
  if (typeof cfg.defaultDuration === 'number') window._CFG_ANIM_DEFAULT_DURATION = cfg.defaultDuration;
  if (typeof cfg.defaultDelay === 'number') window._CFG_ANIM_DEFAULT_DELAY = cfg.defaultDelay;
  if (cfg.defaultAnim) window._CFG_ANIM_DEFAULT = cfg.defaultAnim;
};

window._animTlPxPerMs = window._animTlPxPerMs || 0.08;
window._animTlLaneH = 11;
window._animTlDockKey = 'slides_anim_tl_dock';
window._animTlDockHKey = 'slides_anim_tl_dock_h';
window._animTlDockHMin = 100;
window._animTlDockHMax = 360;
window._animTlDockHDefault = 176;
window._slideAnimPlaying = false;
window._slideAnimPlayTimers = [];
window._slideAnimPlayGen = 0;

window._isTimedAnimEntry = function(a) {
  const t = (a && a.trigger) || 'auto';
  return t !== 'element' && t !== 'nav' && t !== 'click';
};

window._computeAnimAbsStarts = function(slide) {
  if (typeof window._ensureAnimOrder === 'function') window._ensureAnimOrder(slide);
  const gList = window._animTimelineGList(slide);
  const out = [];
  let chainPS = 0, chainPD = 0;
  let prevTimedStart = 0;
  gList.forEach(({ d, a }) => {
    const ai = (d.anims || []).indexOf(a);
    if (!window._isTimedAnimEntry(a)) {
      out.push({ elId: d.id, ai, skip: true, abs: null });
      return;
    }
    const t = a.trigger || 'auto';
    const rd = a.delay || 0;
    let abs;
    const _il = !!window._LIVE_LOOP_NAMES[a.name];
    if (t === 'withPrev') abs = prevTimedStart + rd;
    else if (chainPS === 0 && chainPD === 0) abs = rd;
    else if (_il && t === 'auto') abs = chainPS + chainPD + rd;
    else abs = chainPS + chainPD + rd;
    out.push({ elId: d.id, ai, skip: false, abs });
    prevTimedStart = abs;
    chainPS = abs;
    chainPD = window._animChainDuration(a);
  });
  return out;
};

window._getPrevTimedAnimStart = function(slide, elId, ai) {
  const starts = window._computeAnimAbsStarts(slide);
  let prev = 0;
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    if (s.elId === elId && s.ai === ai) return prev;
    if (!s.skip) prev = s.abs;
  }
  return prev;
};

window._getAnimAbsStart = function(slide, elId, ai) {
  const s = window._computeAnimAbsStarts(slide).find(x => x.elId === elId && x.ai === ai);
  return s && !s.skip ? s.abs : 0;
};

window._baseElTransform = function(d, el) {
  const rot = (d && d.rot) || (el && el.dataset.rot ? +el.dataset.rot : 0) || 0;
  let tf = rot ? 'rotate(' + rot + 'deg)' : '';
  if (d && (d.shapeFlipH || d.shapeFlipV)) {
    tf += (tf ? ' ' : '') + 'scale(' + (d.shapeFlipH ? -1 : 1) + ',' + (d.shapeFlipV ? -1 : 1) + ')';
  }
  return tf;
};

window._resetSlideAnimEl = function(el, d) {
  if (!el) return;
  if (el._liveAnims) {
    el._liveAnims.forEach(a => {
      try { if (typeof a.cancel === 'function') a.cancel(); } catch (e) {}
    });
    el._liveAnims = [];
  }
  if (el._liveAnimsByName) {
    Object.keys(el._liveAnimsByName).forEach(k => {
      try { el._liveAnimsByName[k].cancel(); } catch (e) {}
    });
    el._liveAnimsByName = {};
  }
  el.classList.remove('has-dance');
  const nodes = [el, el.querySelector('._text_body'), el.querySelector('.ec'), el.querySelector('.tel'), el.querySelector('.iel'), el.querySelector('.shape-text'), el.querySelector('._dance_wrap'), el.querySelector('._float_wrap'), el.querySelector('._swing_wrap')];
  nodes.forEach(t => {
    if (!t) return;
    t.getAnimations().forEach(a => { try { a.cancel(); } catch (e) {} });
    t.style.animation = '';
    if (t === el) t.style.transform = window._baseElTransform(d, el);
    else t.style.transform = '';
  });
  el.style.visibility = '';
  el.style.pointerEvents = '';
  if (typeof window._resetCaptionSlide === 'function') window._resetCaptionSlide(el, true);
  if (typeof window._resetSplitHalf === 'function') window._resetSplitHalf(el, true);
  if (typeof window._resetLiveAnimPreview === 'function') window._resetLiveAnimPreview(el, true);
  if (el.dataset.type === 'text' && typeof applyTextRadius === 'function') applyTextRadius(el);
};

window._updateAnimPlayBtn = function(playing) {
  const btn = document.getElementById('ribbon-anim-play-btn');
  if (!btn) return;
  btn.classList.toggle('playing', !!playing);
  const playIcon = btn.querySelector('.anim-play-icon');
  const stopIcon = btn.querySelector('.anim-stop-icon');
  if (playIcon) playIcon.style.display = playing ? 'none' : 'block';
  if (stopIcon) stopIcon.style.display = playing ? 'block' : 'none';
  btn.title = playing ? 'Остановить и вернуть в исходное состояние' : 'Проиграть анимации слайда';
};

window._ensureAnimTimelinePlayhead = function() {
  const inner = document.getElementById('anim-tl-inner');
  if (!inner) return null;
  let ph = document.getElementById('anim-tl-playhead');
  if (!ph) {
    ph = document.createElement('div');
    ph.id = 'anim-tl-playhead';
    ph.className = 'anim-tl-playhead';
    inner.appendChild(ph);
  }
  return ph;
};

window._setAnimTimelinePlayheadMs = function(ms) {
  if (ms >= 0) window._animTlPlayheadMs = ms;
  const ph = window._ensureAnimTimelinePlayhead();
  if (!ph) return;
  const pxMs = window._animTlPxPerMs || 0.08;
  ph.style.left = Math.max(0, ms * pxMs) + 'px';
  ph.style.display = ms >= 0 ? 'block' : 'none';
  if (ms >= 0 && window._slideAnimPlaying) {
    const scroll = document.getElementById('anim-tl-scroll');
    if (scroll) {
      const x = ms * pxMs;
      const pad = 24;
      if (x < scroll.scrollLeft + pad || x > scroll.scrollLeft + scroll.clientWidth - pad) {
        scroll.scrollLeft = Math.max(0, x - scroll.clientWidth / 3);
      }
    }
  }
};

window._stopAnimTimelinePlayhead = function() {
  if (window._animTlPlayheadRaf) {
    cancelAnimationFrame(window._animTlPlayheadRaf);
    window._animTlPlayheadRaf = null;
  }
  window._animTlPlayheadMs = null;
  const ph = document.getElementById('anim-tl-playhead');
  if (ph) ph.style.display = 'none';
};

window._animTlSnapThresholdPx = 8;

window._collectAnimTlSnapPoints = function(segments, excludeKeys) {
  const pts = [0];
  (segments || []).forEach(s => {
    const k = window._animTlKey(s.elId, s.ai);
    if (excludeKeys && excludeKeys.has(k)) return;
    pts.push(s.absDelay, s.absDelay + s.dur);
  });
  return pts;
};

window._ensureAnimTlSnapGuide = function() {
  const inner = document.getElementById('anim-tl-inner');
  if (!inner) return null;
  let g = document.getElementById('anim-tl-snap-guide');
  if (!g) {
    g = document.createElement('div');
    g.id = 'anim-tl-snap-guide';
    g.className = 'anim-tl-snap-guide';
    inner.appendChild(g);
  }
  return g;
};

window._showAnimTlSnapGuide = function(xPx) {
  const g = window._ensureAnimTlSnapGuide();
  if (!g) return;
  if (xPx == null) {
    g.style.display = 'none';
    return;
  }
  g.style.display = 'block';
  g.style.left = Math.max(0, xPx) + 'px';
};

window._hideAnimTlSnapGuide = function() {
  const g = document.getElementById('anim-tl-snap-guide');
  if (g) g.style.display = 'none';
};

window._snapAnimTlMove = function(rawLeftPx, durMs, snapPoints, pxMs) {
  const threshMs = window._animTlSnapThresholdPx / pxMs;
  const rawStart = rawLeftPx / pxMs;
  const rawEnd = rawStart + durMs;
  let bestDist = threshMs + 1;
  let snappedLeftPx = rawLeftPx;
  let guidePx = null;
  snapPoints.forEach(p => {
    const ds = Math.abs(rawStart - p);
    if (ds <= threshMs && ds < bestDist) {
      bestDist = ds;
      snappedLeftPx = p * pxMs;
      guidePx = p * pxMs;
    }
    const de = Math.abs(rawEnd - p);
    if (de <= threshMs && de < bestDist) {
      bestDist = de;
      snappedLeftPx = (p - durMs) * pxMs;
      guidePx = p * pxMs;
    }
  });
  return { leftPx: Math.max(0, snappedLeftPx), guidePx };
};

window._snapAnimTlEnd = function(endPx, snapPoints, pxMs) {
  const threshMs = window._animTlSnapThresholdPx / pxMs;
  const rawEnd = endPx / pxMs;
  let bestDist = threshMs + 1;
  let snappedEndPx = endPx;
  let guidePx = null;
  snapPoints.forEach(p => {
    const d = Math.abs(rawEnd - p);
    if (d <= threshMs && d < bestDist) {
      bestDist = d;
      snappedEndPx = p * pxMs;
      guidePx = p * pxMs;
    }
  });
  return { endPx: snappedEndPx, guidePx };
};

window._startAnimTimelinePlayhead = function(durationMs) {
  window._stopAnimTimelinePlayhead();
  if (!window._ensureAnimTimelinePlayhead()) return;
  durationMs = Math.max(+durationMs || 0, 1);
  window._animTlPlayheadStart = performance.now();
  window._setAnimTimelinePlayheadMs(0);
  const tick = now => {
    if (!window._slideAnimPlaying) return;
    const elapsed = now - window._animTlPlayheadStart;
    window._setAnimTimelinePlayheadMs(elapsed);
    if (elapsed < durationMs) {
      window._animTlPlayheadRaf = requestAnimationFrame(tick);
    }
  };
  window._animTlPlayheadRaf = requestAnimationFrame(tick);
};

window.stopSlideAnimsOnCanvas = function() {
  window._slideAnimPlaying = false;
  window._slideAnimPlayGen++;
  window._updateAnimPlayBtn(false);
  window._stopAnimTimelinePlayhead();
  (window._slideAnimPlayTimers || []).forEach(t => clearTimeout(t));
  window._slideAnimPlayTimers = [];
  if (window._slideAnimPlayTimer) { clearTimeout(window._slideAnimPlayTimer); window._slideAnimPlayTimer = null; }
  if (window._activeCaptionRun) {
    window._activeCaptionRun.cancelled = true;
    clearTimeout(window._activeCaptionRun.holdTimer);
    window._activeCaptionRun = null;
  }
  if (typeof slides === 'undefined' || typeof cur === 'undefined') return;
  const s = slides[cur];
  const cv = document.getElementById('canvas');
  if (!s || !cv) return;
  s.els.forEach(d => {
    const el = cv.querySelector('.el[data-id="' + d.id + '"]');
    if (el) window._resetSlideAnimEl(el, d);
  });
  if (typeof renderMotionOverlay === 'function') renderMotionOverlay();
};

window._trackSlideAnimTimeout = function(fn, ms) {
  const id = setTimeout(fn, ms);
  window._slideAnimPlayTimers.push(id);
  return id;
};

window.toggleSlideAnimsPlayback = function(slideIdx) {
  if (window._slideAnimPlaying) {
    window.stopSlideAnimsOnCanvas();
    return false;
  }
  return window.playSlideAnimsOnCanvas(slideIdx);
};

window.playSlideAnimsOnCanvas = function(slideIdx) {
  if (typeof slides === 'undefined' || typeof fireAnim !== 'function') return false;
  if (window._slideAnimPlaying) return false;
  const s = slides[slideIdx != null ? slideIdx : cur];
  const cv = document.getElementById('canvas');
  if (!s || !cv) return false;
  window.stopSlideAnimsOnCanvas();
  window._slideAnimPlaying = true;
  window._updateAnimPlayBtn(true);
  const playGen = window._slideAnimPlayGen;
  const { autoMap, totalMs } = window.buildAnimSchedule(s);
  const captionQueue = [];
  s.els.forEach(d => {
    const el = cv.querySelector('.el[data-id="' + d.id + '"]');
    if (!el) return;
    window._resetSlideAnimEl(el, d);
  });
  Object.keys(autoMap).forEach(elId => {
    const d = s.els.find(x => x.id === elId);
    const el = cv.querySelector('.el[data-id="' + elId + '"]');
    if (!d || !el) return;
    autoMap[elId].forEach(({ anim: a, absDelay }) => {
      if (a.name === 'captionSlide') captionQueue.push({ d, a, absDelay });
      else window._trackSlideAnimTimeout(() => {
        if (!window._slideAnimPlaying || playGen !== window._slideAnimPlayGen) return;
        fireAnim(el, d, a, slideIdx != null ? slideIdx : cur, 0);
      }, absDelay);
    });
  });
  if (captionQueue.length) {
    window._trackSlideAnimTimeout(() => {
      if (!window._slideAnimPlaying || playGen !== window._slideAnimPlayGen) return;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const seen = {};
        captionQueue.forEach(({ d, a, absDelay }) => {
          if (d.groupId) {
            const members = s.els.filter(x => x.groupId === d.groupId);
            const leader = members[0] || d;
            if (d.id !== leader.id) return;
            const key = d.groupId + '|' + absDelay + '|captionSlide';
            if (seen[key]) return;
            seen[key] = 1;
            const entries = members.map(md => {
              const mel = cv.querySelector('.el[data-id="' + md.id + '"]');
              return mel ? { el: mel, x: md.x || 0, y: md.y || 0, w: md.w || 200, h: md.h || 200 } : null;
            }).filter(Boolean);
            if (entries.length && typeof window._fireCaptionSlideAnimGroup === 'function') {
              window._fireCaptionSlideAnimGroup(entries, a, 0, { hideAfter: false });
            }
          } else {
            const mel = cv.querySelector('.el[data-id="' + d.id + '"]');
            if (mel && typeof window._fireCaptionSlideAnim === 'function') {
              window._fireCaptionSlideAnim(mel, a, 0, d.w, d.h, { hideAfter: false });
            }
          }
        });
      }));
    }, Math.min.apply(null, captionQueue.map(q => q.absDelay)));
  }
  window._slideAnimPlayTimer = setTimeout(() => {
    window.stopSlideAnimsOnCanvas();
  }, Math.max(totalMs, 300) + 250);
  window._startAnimTimelinePlayhead(Math.max(totalMs, 300) + 250);
  return true;
};

window._animTimelineGList = function(slide) {
  if (typeof window._buildSlideAnimGlobalList === 'function') {
    return window._buildSlideAnimGlobalList(slide).map(({ d, a }) => ({ d, a }));
  }
  const gList = [];
  if (!slide || !slide.els) return gList;
  slide.els.forEach(d => {
    if (d._isDecor) return;
    (d.anims || []).forEach(a => gList.push({ d, a }));
  });
  return gList;
};

window._timelineOverlap = function(a, b) {
  return a.absDelay < b.absDelay + b.dur && b.absDelay < a.absDelay + a.dur;
};

window._animTlSel = window._animTlSel || new Set();
window._animTlKey = function(elId, ai) { return elId + ':' + ai; };

window._animTlClearSel = function() {
  window._animTlSel.clear();
};

window._animTlToggleSel = function(elId, ai) {
  const k = window._animTlKey(elId, ai);
  if (window._animTlSel.has(k)) window._animTlSel.delete(k);
  else window._animTlSel.add(k);
};

window._animTlSetSel = function(elId, ai) {
  window._animTlSel.clear();
  window._animTlSel.add(window._animTlKey(elId, ai));
};

window._snapTimelineSegOnLane = function(segs, elId, ai) {
  const _ov = window._timelineOverlap;
  const me = () => segs.find(s => s.elId === elId && s.ai === ai);
  let guard = 24;
  while (guard-- > 0) {
    let hit = false;
    const m = me();
    if (!m) break;
    for (const s of segs) {
      if (s.elId === elId && s.ai === ai) continue;
      if (s.lane !== m.lane) continue;
      if (_ov(m, s)) {
        if (m.absDelay + m.dur / 2 >= s.absDelay + s.dur / 2) m.absDelay = s.absDelay + s.dur;
        else m.absDelay = Math.max(0, s.absDelay - m.dur);
        hit = true;
      }
    }
    if (!hit) break;
  }
};

window._applyTimelineSegments = function(slide, segs) {
  const _ov = window._timelineOverlap;
  const _skipTrig = anim => {
    const t = anim.trigger || 'auto';
    return t === 'element' || t === 'nav' || t === 'click';
  };
  segs.sort((x, y) => x.absDelay - y.absDelay || x.lane - y.lane || x.elId.localeCompare(y.elId) || x.ai - y.ai);
  slide.animOrder = segs.map(s => ({ elId: s.elId, ai: s.ai }));
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const anim = slide.els.find(x => x.id === s.elId)?.anims?.[s.ai];
    if (!anim || _skipTrig(anim)) continue;
    anim.tlLane = s.lane;
    let parallel = false;
    for (let j = 0; j < i; j++) {
      const p = segs[j];
      if (p.lane === s.lane) continue;
      if (_ov(s, p)) { parallel = true; break; }
    }
    anim.trigger = parallel ? 'withPrev' : 'auto';
  }
  let gPS = 0, gPD = 0;
  let prevTimedStart = 0;
  segs.forEach(s => {
    const anim = slide.els.find(x => x.id === s.elId)?.anims?.[s.ai];
    if (!anim) return;
    const t = anim.trigger || 'auto';
    if (t === 'element' || t === 'nav' || t === 'click') return;
    if (t === 'withPrev') anim.delay = Math.max(0, s.absDelay - prevTimedStart);
    else if (gPS === 0 && gPD === 0) anim.delay = Math.max(0, s.absDelay);
    else anim.delay = Math.max(0, s.absDelay - gPS - gPD);
    const rd = anim.delay || 0;
    const _il = !!window._LIVE_LOOP_NAMES[anim.name];
    let abs;
    if (t === 'withPrev') abs = prevTimedStart + rd;
    else if (gPS === 0 && gPD === 0) abs = rd;
    else if (_il && t === 'auto') abs = gPS + gPD + rd;
    else abs = gPS + gPD + rd;
    prevTimedStart = abs;
    gPS = abs;
    gPD = window._animChainDuration(anim);
  });
};

window._syncAnimTimelineGroup = function(slide, updates) {
  if (!slide || !updates || !updates.length) return;
  if (typeof window._ensureAnimOrder === 'function') window._ensureAnimOrder(slide);
  updates.forEach(u => {
    const d = slide.els.find(x => x.id === u.elId);
    if (d && d.anims && d.anims[u.ai]) d.anims[u.ai].tlLane = Math.max(0, Math.round(u.lane));
  });
  const tl = window.computeSlideAnimTimeline(slide);
  const updMap = new Map(updates.map(u => [window._animTlKey(u.elId, u.ai), u]));
  const segs = tl.segments.map(s => {
    const u = updMap.get(window._animTlKey(s.elId, s.ai));
    if (!u) return { ...s };
    return { ...s, absDelay: Math.max(0, Math.round(u.absDelay)), lane: Math.max(0, Math.round(u.lane)) };
  });
  updates.forEach(u => window._snapTimelineSegOnLane(segs, u.elId, u.ai));
  window._applyTimelineSegments(slide, segs);
};

window._syncAnimOrderFromTimeline = function(slide, elId, ai, lane, targetAbs) {
  if (!slide) return;
  if (typeof window._ensureAnimOrder === 'function') window._ensureAnimOrder(slide);
  const d = slide.els.find(x => x.id === elId);
  if (!d || !d.anims || !d.anims[ai]) return;
  lane = Math.max(0, Math.round(lane));
  d.anims[ai].tlLane = lane;
  const tl = window.computeSlideAnimTimeline(slide);
  const dur = window._animChainDuration(d.anims[ai]);
  const segs = tl.segments.map(s => (
    s.elId === elId && s.ai === ai ? { ...s, absDelay: Math.max(0, Math.round(targetAbs)), lane, dur } : { ...s }
  ));
  window._snapTimelineSegOnLane(segs, elId, ai);
  window._applyTimelineSegments(slide, segs);
};

window._setAnimAbsDelay = function(slide, elId, ai, targetAbs) {
  const d = slide.els.find(x => x.id === elId);
  if (!d || !d.anims || !d.anims[ai]) return;
  const a = d.anims[ai];
  targetAbs = Math.max(0, Math.round(targetAbs));
  const trigger = a.trigger || 'auto';
  if (trigger === 'withPrev') {
    a.delay = Math.max(0, targetAbs - window._getPrevTimedAnimStart(slide, elId, ai));
    return;
  }
  const starts = window._computeAnimAbsStarts(slide);
  let prevEnd = 0;
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    if (s.elId === elId && s.ai === ai) break;
    if (s.skip) continue;
    const pa = slide.els.find(x => x.id === s.elId)?.anims?.[s.ai];
    if (!pa) continue;
    prevEnd = s.abs + window._animChainDuration(pa);
  }
  a.delay = Math.max(0, targetAbs - prevEnd);
};

window._setAnimDurationFromTimeline = function(slide, elId, ai, newDur) {
  const d = slide.els.find(x => x.id === elId);
  if (!d || !d.anims || !d.anims[ai]) return;
  const a = d.anims[ai];
  newDur = Math.max(50, Math.round(newDur));
  if (a.name === 'captionSlide') {
    const old = window._animChainDuration(a);
    const dIn = +(a.duration || 600) || 600;
    const hold = +(a.holdDuration || 2000) || 2000;
    const ratio = old > 0 ? newDur / old : 1;
    a.duration = Math.max(50, Math.round(dIn * ratio));
    a.holdDuration = Math.max(0, Math.round(hold * ratio));
  } else if (a.name === 'typewriter') {
    a.duration = newDur;
  } else {
    a.duration = newDur;
  }
};

window._syncAnimDomAfterTimelineEdit = function(slide) {
  const cv = document.getElementById('canvas');
  if (!cv || !slide) return;
  slide.els.forEach(d => {
    if (!d.anims) return;
    const el = cv.querySelector('.el[data-id="' + d.id + '"]');
    if (el) el.dataset.anims = JSON.stringify(d.anims);
  });
  if (typeof save === 'function') save();
  if (typeof saveState === 'function') saveState();
  if (typeof renderMotionOverlay === 'function') renderMotionOverlay();
};

window._applyAnimLane = function(slide, elId, ai, targetLane, absDelay) {
  window._syncAnimOrderFromTimeline(slide, elId, ai, targetLane, absDelay);
};

window._moveAnimTimelineHost = function(where) {
  const ribbon = document.getElementById('anim-tl-ribbon-slot');
  const dock = document.getElementById('anim-tl-dock-slot');
  const panel = document.getElementById('anim-timeline-ribbon');
  if (!panel || !ribbon || !dock) return;
  (where === 'dock' ? dock : ribbon).appendChild(panel);
};

window._updateAnimTlExpandBtn = function(docked) {
  const btn = document.getElementById('anim-tl-expand-btn');
  if (!btn) return;
  btn.classList.toggle('docked', !!docked);
  btn.title = docked ? 'Вернуть в ленту' : 'Развернуть вниз';
};

window._applyAnimTlDockHeight = function(h, skipRender) {
  if (h == null || isNaN(h)) {
    h = window._animTlDockHDefault;
    try {
      const saved = parseInt(localStorage.getItem(window._animTlDockHKey), 10);
      if (saved && !isNaN(saved)) h = saved;
    } catch (e) {}
  }
  h = Math.max(window._animTlDockHMin, Math.min(window._animTlDockHMax, h));
  document.documentElement.style.setProperty('--anim-tl-dock-h', h + 'px');
  try { localStorage.setItem(window._animTlDockHKey, String(h)); } catch (e) {}
  if (!skipRender && typeof slides !== 'undefined' && typeof cur !== 'undefined' &&
      document.body.classList.contains('anim-tl-dock-open') &&
      typeof window.renderAnimTimelineBar === 'function') {
    window.renderAnimTimelineBar(slides[cur]);
  }
  return h;
};

window._initAnimTimelineDockResize = function() {
  window._applyAnimTlDockHeight(null, true);
  const handle = document.getElementById('anim-tl-dock-resize');
  if (!handle) return;
  handle.addEventListener('mousedown', ev => {
    ev.preventDefault();
    const startY = ev.clientY;
    const startH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--anim-tl-dock-h'), 10) ||
      window._animTlDockHDefault;
    let lastH = startH;
    const onMove = mv => {
      lastH = window._applyAnimTlDockHeight(startH + (startY - mv.clientY), true);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window._applyAnimTlDockHeight(lastH);
    };
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  window.addEventListener('resize', () => {
    if (!document.body.classList.contains('anim-tl-dock-open')) return;
    if (typeof slides !== 'undefined' && typeof cur !== 'undefined' &&
        typeof window.renderAnimTimelineBar === 'function') {
      window.renderAnimTimelineBar(slides[cur]);
    }
  });
};

window.toggleAnimTimelineDock = function() {
  const open = !document.body.classList.contains('anim-tl-dock-open');
  window._moveAnimTimelineHost(open ? 'dock' : 'ribbon');
  const dockSlot = document.getElementById('anim-tl-dock-slot');
  const panel = document.getElementById('anim-timeline-ribbon');
  if (open && (!dockSlot || !panel || !dockSlot.contains(panel))) return;
  document.body.classList.toggle('anim-tl-dock-open', open);
  try { localStorage.setItem(window._animTlDockKey, open ? '1' : '0'); } catch (e) {}
  window._updateAnimTlExpandBtn(open);
  const dock = document.getElementById('anim-tl-dock');
  if (dock) dock.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) window._applyAnimTlDockHeight(null, true);
  if (typeof slides !== 'undefined' && typeof cur !== 'undefined') {
    requestAnimationFrame(() => window.renderAnimTimelineBar(slides[cur]));
  }
};

window._initAnimTimelineDock = function() {
  window._initAnimTimelineDockResize();
  const dockSlot = document.getElementById('anim-tl-dock-slot');
  if (!dockSlot) return;
  let open = false;
  try { open = localStorage.getItem(window._animTlDockKey) === '1'; } catch (e) {}
  if (!open) return;
  window._moveAnimTimelineHost('dock');
  if (!dockSlot.contains(document.getElementById('anim-timeline-ribbon'))) return;
  document.body.classList.add('anim-tl-dock-open');
  window._updateAnimTlExpandBtn(true);
  const dock = document.getElementById('anim-tl-dock');
  if (dock) dock.setAttribute('aria-hidden', 'false');
  window._applyAnimTlDockHeight(null, true);
  if (typeof slides !== 'undefined' && typeof cur !== 'undefined') {
    requestAnimationFrame(() => window.renderAnimTimelineBar(slides[cur]));
  }
};

window.animTimelineZoom = function(delta) {
  const z = window._animTlPxPerMs || 0.08;
  window._animTlPxPerMs = Math.min(0.35, Math.max(0.025, z * (delta > 0 ? 1.25 : 0.8)));
  if (typeof slides !== 'undefined' && typeof cur !== 'undefined') {
    window.renderAnimTimelineBar(slides[cur]);
  }
};

window.renderAnimTimelineBar = function(slide) {
  const tracks = document.getElementById('anim-timeline-tracks');
  const ruler = document.getElementById('anim-timeline-ruler');
  const inner = document.getElementById('anim-tl-inner');
  if (!tracks || !ruler || !inner) return;
  const pxMs = window._animTlPxPerMs || 0.08;
  const docked = document.body.classList.contains('anim-tl-dock-open');
  const rulerH = docked ? 18 : 11;
  const tl = window.computeSlideAnimTimeline(slide);
  const totalMs = tl.totalMs || 800;
  const laneCount = Math.max(1, tl.laneCount || 1);
  let laneH = window._animTlLaneH || 11;
  let segPad = 1;
  if (docked) {
    const scroll = document.getElementById('anim-tl-scroll');
    const avail = scroll && scroll.clientHeight > rulerH + 8 ? scroll.clientHeight - rulerH : 140;
    laneH = Math.max(18, Math.min(44, Math.floor(avail / laneCount)));
    laneH = Math.max(12, Math.round(laneH * 0.7));
    segPad = Math.max(1, Math.round(laneH * 0.12));
    inner.style.height = '100%';
    inner.style.minHeight = '0';
  } else {
    const scroll = document.getElementById('anim-tl-scroll');
    const avail = scroll && scroll.clientHeight > rulerH + 4 ? scroll.clientHeight - rulerH : 28;
    laneH = Math.max(10, Math.min(22, Math.floor(avail / laneCount)));
    segPad = Math.max(1, Math.round(laneH * 0.1));
    inner.style.height = '100%';
    inner.style.minHeight = '0';
  }
  const segH = Math.max(7, laneH - segPad * 2);
  const widthPx = Math.ceil(totalMs * pxMs);
  const tracksH = laneCount * laneH;
  inner.style.width = widthPx + 'px';
  tracks.style.height = tracksH + 'px';
  ruler.style.height = rulerH + 'px';
  tracks.innerHTML = '';
  ruler.innerHTML = '';
  let rb = document.createElement('div');
  rb.className = 'anim-tl-rubber';
  inner.appendChild(rb);
  const scrollEl = document.getElementById('anim-tl-scroll');
  const innerX = (clientX, rect) => clientX - rect.left + (scrollEl ? scrollEl.scrollLeft : 0);
  const innerY = (clientY, rect) => clientY - rect.top;
  for (let li = 0; li < laneCount; li++) {
    const bg = document.createElement('div');
    bg.className = 'anim-tl-lane-bg';
    bg.style.top = (li * laneH) + 'px';
    bg.style.height = laneH + 'px';
    tracks.appendChild(bg);
  }
  if (!tl.segments.length) {
    const empty = document.createElement('div');
    empty.className = 'anim-tl-empty';
    empty.textContent = 'Нет анимаций на слайде';
    tracks.appendChild(empty);
    return;
  }
  for (let ms = 0; ms <= totalMs; ms += 250) {
    const x = ms * pxMs;
    const major = ms % 1000 === 0;
    const tick = document.createElement('div');
    tick.className = 'anim-tl-ruler-tick ' + (major ? 'major' : 'minor');
    tick.style.left = x + 'px';
    ruler.appendChild(tick);
    if (major) {
      const lbl = document.createElement('div');
      lbl.className = 'anim-tl-ruler-lbl';
      lbl.style.left = x + 'px';
      lbl.textContent = (ms / 1000).toFixed(ms >= 1000 ? 0 : 1).replace(/\.0$/, '') + 's';
      if (docked) lbl.className = 'anim-tl-ruler-lbl anim-tl-ruler-lbl-dock';
      ruler.appendChild(lbl);
    }
  }
  tl.segments.forEach(seg => {
    const el = document.createElement('div');
    el.className = 'anim-tl-seg anim-tl-' + seg.cat + (seg.isClick ? ' is-click' : '');
    el.style.left = (seg.absDelay * pxMs) + 'px';
    el.style.width = Math.max(6, seg.dur * pxMs) + 'px';
    el.style.top = (seg.lane * laneH + segPad) + 'px';
    el.style.height = segH + 'px';
    el.dataset.elId = seg.elId;
    el.dataset.ai = String(seg.ai);
    el.dataset.lane = String(seg.lane);
    if (window._animTlSel.has(window._animTlKey(seg.elId, seg.ai))) el.classList.add('anim-tl-seg-sel');
    el.title = seg.label + ' · ' + seg.absDelay + '–' + (seg.absDelay + seg.dur) + ' ms' + (seg.isClick ? ' · по клику' : seg.trigger === 'withPrev' ? ' · с предыдущей' : '');
    if (seg.isClick) {
      const icon = document.createElement('span');
      icon.className = 'anim-tl-seg-icon';
      icon.textContent = '👆';
      icon.title = 'По клику';
      el.appendChild(icon);
    }
    const lbl = document.createElement('span');
    lbl.className = 'anim-tl-seg-label';
    lbl.textContent = seg.label;
    if (docked && laneH >= 22) lbl.style.fontSize = '9px';
    lbl.style.lineHeight = segH + 'px';
    el.appendChild(lbl);
    const resize = document.createElement('div');
    resize.className = 'anim-tl-resize';
    el.appendChild(resize);
    const startDrag = (mode, ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (window._slideAnimPlaying) window.stopSlideAnimsOnCanvas();
      const segKey = window._animTlKey(seg.elId, seg.ai);
      const dragKeys = (window._animTlSel.has(segKey) && window._animTlSel.size > 1)
        ? [...window._animTlSel]
        : [segKey];
      const dragItems = dragKeys.map(k => {
        const ci = k.indexOf(':');
        const elId = k.slice(0, ci);
        const ai = parseInt(k.slice(ci + 1), 10);
        const dom = tracks.querySelector('.anim-tl-seg[data-el-id="' + elId + '"][data-ai="' + ai + '"]');
        if (!dom) return null;
        return {
          key: k, elId, ai, dom,
          startLeft: parseFloat(dom.style.left) || 0,
          startLane: parseInt(dom.dataset.lane, 10) || 0
        };
      }).filter(Boolean);
      const startX = ev.clientX;
      const startY = ev.clientY;
      const startLeft = seg.absDelay * pxMs;
      const startW = seg.dur * pxMs;
      const startLane = seg.lane;
      let dragMode = mode;
      let previewLane = startLane;
      const excludeKeys = new Set(dragKeys);
      const snapPoints = window._collectAnimTlSnapPoints(tl.segments, excludeKeys);
      const tracksRect = () => tracks.getBoundingClientRect();
      const onMove = mv => {
        const dx = mv.clientX - startX;
        const dy = mv.clientY - startY;
        if (dragMode === 'move' && Math.abs(dy) > 4 && Math.abs(dy) > Math.abs(dx) * 0.4) dragMode = 'lane';
        if (dragMode === 'move') {
          const snap = window._snapAnimTlMove(Math.max(0, startLeft + dx), seg.dur, snapPoints, pxMs);
          const deltaPx = snap.leftPx - startLeft;
          dragItems.forEach(item => {
            item.dom.style.left = Math.max(0, item.startLeft + deltaPx) + 'px';
          });
          window._showAnimTlSnapGuide(snap.guidePx);
        } else if (dragMode === 'lane') {
          window._hideAnimTlSnapGuide();
          const rect = tracksRect();
          previewLane = Math.max(0, Math.floor((mv.clientY - rect.top) / laneH));
          const laneDelta = previewLane - startLane;
          dragItems.forEach(item => {
            const nl = Math.max(0, item.startLane + laneDelta);
            item.dom.style.top = (nl * laneH + segPad) + 'px';
            item.previewLane = nl;
          });
        } else {
          const rawEnd = Math.max(startLeft + 6, startLeft + startW + dx);
          const snap = window._snapAnimTlEnd(rawEnd, snapPoints, pxMs);
          const newDur = Math.max(50, (snap.endPx - startLeft) / pxMs);
          window._setAnimDurationFromTimeline(slide, seg.elId, seg.ai, newDur);
          el.style.width = Math.max(6, snap.endPx - startLeft) + 'px';
          window._showAnimTlSnapGuide(snap.guidePx);
        }
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        window._hideAnimTlSnapGuide();
        if (dragMode === 'move' || dragMode === 'lane') {
          const updates = dragItems.map(item => {
            const newAbs = parseFloat(item.dom.style.left) / pxMs;
            const laneVal = dragMode === 'lane'
              ? (item.previewLane != null ? item.previewLane : previewLane)
              : (parseInt(item.dom.dataset.lane, 10) || item.startLane);
            return {
              elId: item.elId,
              ai: item.ai,
              lane: laneVal,
              absDelay: isNaN(newAbs) ? seg.absDelay : newAbs
            };
          });
          if (updates.length > 1) window._syncAnimTimelineGroup(slide, updates);
          else if (updates.length === 1) {
            window._syncAnimOrderFromTimeline(slide, updates[0].elId, updates[0].ai, updates[0].lane, updates[0].absDelay);
          }
        }
        window._syncAnimDomAfterTimelineEdit(slide);
        window.renderAnimTimelineBar(slide);
        if (typeof renderAnimPanel === 'function') renderAnimPanel();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    el.addEventListener('mousedown', ev => {
      if (ev.target === resize) return;
      const segKey = window._animTlKey(seg.elId, seg.ai);
      if (ev.shiftKey) {
        window._animTlToggleSel(seg.elId, seg.ai);
        ev.preventDefault();
        ev.stopPropagation();
        window.renderAnimTimelineBar(slide);
        return;
      }
      if (!window._animTlSel.has(segKey)) {
        window._animTlSetSel(seg.elId, seg.ai);
        tracks.querySelectorAll('.anim-tl-seg').forEach(dom => {
          const k = window._animTlKey(dom.dataset.elId, parseInt(dom.dataset.ai, 10));
          dom.classList.toggle('anim-tl-seg-sel', window._animTlSel.has(k));
        });
      }
      startDrag('move', ev);
    });
    resize.addEventListener('mousedown', ev => startDrag('resize', ev));
    tracks.appendChild(el);
  });
  inner.onmousedown = function(ev) {
    if (ev.button !== 0) return;
    if (ev.target.closest('.anim-tl-seg') || ev.target.closest('.anim-tl-resize')) return;
    if (ev.target.closest('.anim-tl-playhead') || ev.target.closest('.anim-tl-snap-guide')) return;
    ev.preventDefault();
    if (!ev.shiftKey) window._animTlClearSel();
    const rect = inner.getBoundingClientRect();
    const x0 = innerX(ev.clientX, rect);
    const y0 = innerY(ev.clientY, rect);
    rb.style.display = 'block';
    rb.style.left = x0 + 'px';
    rb.style.top = y0 + 'px';
    rb.style.width = '0';
    rb.style.height = '0';
    const onRbMove = mv => {
      const x1 = innerX(mv.clientX, rect);
      const y1 = innerY(mv.clientY, rect);
      const left = Math.min(x0, x1);
      const top = Math.min(y0, y1);
      rb.style.left = left + 'px';
      rb.style.top = top + 'px';
      rb.style.width = Math.abs(x1 - x0) + 'px';
      rb.style.height = Math.abs(y1 - y0) + 'px';
    };
    const onRbUp = () => {
      document.removeEventListener('mousemove', onRbMove);
      document.removeEventListener('mouseup', onRbUp);
      rb.style.display = 'none';
      const rLeft = parseFloat(rb.style.left) || 0;
      const rTop = parseFloat(rb.style.top) || 0;
      const rW = parseFloat(rb.style.width) || 0;
      const rH = parseFloat(rb.style.height) || 0;
      if (rW < 4 && rH < 4) {
        window.renderAnimTimelineBar(slide);
        return;
      }
      const rRight = rLeft + rW;
      const rBottom = rTop + rH;
      const selectByTimeOnly = rTop >= tracksH - 1;
      tracks.querySelectorAll('.anim-tl-seg').forEach(dom => {
        const l = parseFloat(dom.style.left) || 0;
        const t = parseFloat(dom.style.top) || 0;
        const w = parseFloat(dom.style.width) || 0;
        const h = parseFloat(dom.style.height) || 0;
        const xOverlap = l + w >= rLeft && l <= rRight;
        const yOverlap = t + h >= rTop && t <= rBottom;
        if (xOverlap && (yOverlap || selectByTimeOnly)) {
          window._animTlSel.add(window._animTlKey(dom.dataset.elId, parseInt(dom.dataset.ai, 10)));
        }
      });
      window.renderAnimTimelineBar(slide);
    };
    document.addEventListener('mousemove', onRbMove);
    document.addEventListener('mouseup', onRbUp);
  };
  if (window._slideAnimPlaying && window._animTlPlayheadMs != null) {
    window._setAnimTimelinePlayheadMs(window._animTlPlayheadMs);
  }
};

  function _bootAnimTimelineDock() {
    window._initAnimTimelineDock();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bootAnimTimelineDock);
  } else {
    _bootAnimTimelineDock();
  }
  if (typeof CFG_ANIMATIONS !== 'undefined') window.applyAnimConfig(CFG_ANIMATIONS);
  if (typeof window.verifyAnimParity === 'function') window.verifyAnimParity();

})();
