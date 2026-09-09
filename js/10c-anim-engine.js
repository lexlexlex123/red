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

/** Callout tip often sits outside w×h — expand caption clip so the tail is not cut. */
function _captionCalloutData(el, d0) {
  if (!el && !d0) return null;
  const d = d0 || (el && el._exportD) || null;
  const ds = (el && el.dataset) || {};
  const shId = (d && d.shape) || ds.shape || '';
  let isCallout = !!(ds.calloutForm || (d && d.calloutForm) ||
    (ds.tailX !== undefined && ds.tailX !== '') ||
    (d && d.tailX !== undefined));
  if (!isCallout && shId && typeof SHAPES !== 'undefined') {
    const sh = SHAPES.find(s => s.id === shId);
    if (sh && sh.special === 'callout') isCallout = true;
  }
  if (!isCallout) return null;
  const w = (d && d.w) || (el && (parseInt(el.style.width, 10) || el.offsetWidth)) || 200;
  const h = (d && d.h) || (el && (parseInt(el.style.height, 10) || el.offsetHeight)) || 200;
  const tx = d && d.tailX !== undefined ? +d.tailX
    : (ds.tailX !== undefined && ds.tailX !== '' ? +ds.tailX : 0);
  const ty = d && d.tailY !== undefined ? +d.tailY
    : (ds.tailY !== undefined && ds.tailY !== '' ? +ds.tailY : (h / 2 + 30));
  let rx = d && d.tailRoundX !== undefined ? +d.tailRoundX
    : (ds.tailRoundX !== undefined && ds.tailRoundX !== '' ? +ds.tailRoundX : undefined);
  let ry = d && d.tailRoundY !== undefined ? +d.tailRoundY
    : (ds.tailRoundY !== undefined && ds.tailRoundY !== '' ? +ds.tailRoundY : undefined);
  if (rx === undefined || ry === undefined) {
    const def = typeof window._calloutDefaultRoundRel === 'function'
      ? window._calloutDefaultRoundRel(tx, ty)
      : { tailRoundX: tx * 0.55, tailRoundY: ty * 0.55 };
    if (rx === undefined) rx = def.tailRoundX;
    if (ry === undefined) ry = def.tailRoundY;
  }
  const sw = d && d.sw != null ? +d.sw
    : (ds.sw !== undefined && ds.sw !== '' ? +ds.sw : 14);
  return { w, h, tipX: w / 2 + tx, tipY: h / 2 + ty, rpx: w / 2 + rx, rpy: h / 2 + ry, pad: Math.max(12, sw * 1.5) };
}

function _captionContentExtents(el, w, h, d0) {
  w = w || 200;
  h = h || 200;
  const c = _captionCalloutData(el, d0);
  if (!c) return { minX: 0, minY: 0, maxX: w, maxY: h, ow: w, oh: h };
  const pad = c.pad;
  const minX = Math.min(0, c.tipX - pad, c.rpx - pad);
  const minY = Math.min(0, c.tipY - pad, c.rpy - pad);
  const maxX = Math.max(w, c.tipX + pad, c.rpx + pad);
  const maxY = Math.max(h, c.tipY + pad, c.rpy + pad);
  return { minX, minY, maxX, maxY, ow: Math.max(1, maxX - minX), oh: Math.max(1, maxY - minY) };
}

function _captionGroupBounds(items) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  (items || []).forEach(it => {
    const ext = it.ext || _captionContentExtents(it.el, it.w, it.h, it.d);
    const x = (it.x != null ? it.x : 0) + ext.minX;
    const y = (it.y != null ? it.y : 0) + ext.minY;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + ext.ow); maxY = Math.max(maxY, y + ext.oh);
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

function _captionStageForGroup(wrap, inner, dir, w, h, bounds, phase, ext) {
  ext = ext || { minX: 0, minY: 0, ow: w, oh: h };
  const ow = ext.ow, oh = ext.oh;
  const { dx, dy } = _captionShift(bounds.w, bounds.h);
  wrap.style.right = 'auto';
  wrap.style.bottom = 'auto';
  inner.style.left = (-ext.minX) + 'px';
  inner.style.top = (-ext.minY) + 'px';
  _captionLockInnerSize(inner, w, h);
  if (dir === 'right') {
    wrap.style.top = ext.minY + 'px';
    wrap.style.height = oh + 'px';
    wrap.style.left = ext.minX + 'px';
    wrap.style.width = (phase === 'exit' ? (ow + dx) : ow) + 'px';
  } else if (dir === 'left') {
    wrap.style.top = ext.minY + 'px';
    wrap.style.height = oh + 'px';
    if (phase === 'exit') {
      wrap.style.left = (ext.minX - dx) + 'px';
      wrap.style.width = (ow + dx) + 'px';
    } else {
      wrap.style.left = ext.minX + 'px';
      wrap.style.width = ow + 'px';
    }
  } else if (dir === 'down') {
    wrap.style.left = ext.minX + 'px';
    wrap.style.width = ow + 'px';
    wrap.style.top = ext.minY + 'px';
    wrap.style.height = (phase === 'exit' ? (oh + dy) : oh) + 'px';
  } else {
    wrap.style.left = ext.minX + 'px';
    wrap.style.width = ow + 'px';
    if (phase === 'exit') {
      wrap.style.top = (ext.minY - dy) + 'px';
      wrap.style.height = (oh + dy) + 'px';
    } else {
      wrap.style.top = ext.minY + 'px';
      wrap.style.height = oh + 'px';
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

function _captionItemSlideRect(it) {
  const ext = it.ext || _captionContentExtents(it.el, it.w, it.h, it.d);
  return {
    x: (it.x != null ? it.x : 0) + ext.minX,
    y: (it.y != null ? it.y : 0) + ext.minY,
    w: ext.ow,
    h: ext.oh,
    ext
  };
}

function _captionPrepHiddenGroup(wrap, inner, dir, bounds, it) {
  const r = _captionItemSlideRect(it);
  _captionStageForGroup(wrap, inner, dir, it.w, it.h, bounds, 'appear', r.ext);
  const clip = _captionClipGroup(dir, 'appear', 0, bounds, r.x, r.y, r.w, r.h);
  wrap.style.clipPath = clip;
  wrap.style.webkitClipPath = clip;
  inner.style.transform = _captionTranslate(dir, 'appear', bounds.w, bounds.h, 0);
  inner.style.opacity = '0';
}

function _captionHoldVisibleGroup(wrap, inner, dir, bounds, it) {
  const r = _captionItemSlideRect(it);
  _captionStageForGroup(wrap, inner, dir, it.w, it.h, bounds, 'hold', r.ext);
  const clip = _captionClipGroup(dir, 'hold', 1, bounds, r.x, r.y, r.w, r.h);
  wrap.style.clipPath = clip;
  wrap.style.webkitClipPath = clip;
  inner.style.transform = '';
  inner.style.opacity = '1';
}

function _captionPlayPhaseGroup(items, bounds, dir, phase, ms, easing) {
  const steps = 24;
  const innerFrames = _captionInnerFramesGroup(bounds.w, bounds.h, dir, phase, steps);
  const anims = items.map(it => {
    const r = _captionItemSlideRect(it);
    _captionStageForGroup(it.wrap, it.inner, dir, it.w, it.h, bounds, phase, r.ext);
    _captionClearStyles(it.wrap, it.inner);
    const wrapFrames = _captionWrapFramesGroup(bounds, r.x, r.y, r.w, r.h, dir, phase, steps);
    const aw = it.wrap.animate(wrapFrames, { duration: ms, easing, fill: 'forwards' });
    const ai = it.inner.animate(innerFrames, { duration: ms, easing, fill: 'forwards' });
    return Promise.all([aw.finished, ai.finished]).catch(() => {});
  });
  return Promise.all(anims).then(() => {});
}

function _captionShift(w, h) {
  return { dx: Math.round(w * 0.1), dy: Math.round(h * 0.1) };
}

function _captionStageFor(wrap, inner, dir, w, h, phase, ext) {
  ext = ext || { minX: 0, minY: 0, ow: w, oh: h };
  const ow = ext.ow, oh = ext.oh;
  const { dx, dy } = _captionShift(ow, oh);
  wrap.style.right = 'auto';
  wrap.style.bottom = 'auto';
  inner.style.left = (-ext.minX) + 'px';
  inner.style.top = (-ext.minY) + 'px';
  _captionLockInnerSize(inner, w, h);
  if (dir === 'right') {
    wrap.style.top = ext.minY + 'px';
    wrap.style.height = oh + 'px';
    wrap.style.left = ext.minX + 'px';
    wrap.style.width = (phase === 'exit' ? (ow + dx) : ow) + 'px';
  } else if (dir === 'left') {
    wrap.style.top = ext.minY + 'px';
    wrap.style.height = oh + 'px';
    if (phase === 'exit') {
      wrap.style.left = (ext.minX - dx) + 'px';
      wrap.style.width = (ow + dx) + 'px';
    } else {
      wrap.style.left = ext.minX + 'px';
      wrap.style.width = ow + 'px';
    }
  } else if (dir === 'down') {
    wrap.style.left = ext.minX + 'px';
    wrap.style.width = ow + 'px';
    wrap.style.top = ext.minY + 'px';
    wrap.style.height = (phase === 'exit' ? (oh + dy) : oh) + 'px';
  } else {
    wrap.style.left = ext.minX + 'px';
    wrap.style.width = ow + 'px';
    if (phase === 'exit') {
      wrap.style.top = (ext.minY - dy) + 'px';
      wrap.style.height = (oh + dy) + 'px';
    } else {
      wrap.style.top = ext.minY + 'px';
      wrap.style.height = oh + 'px';
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

function _captionPrepHidden(wrap, inner, dir, w, h, ext) {
  ext = ext || { minX: 0, minY: 0, ow: w, oh: h };
  _captionStageFor(wrap, inner, dir, w, h, 'appear', ext);
  const clip = _captionClip(dir, 'appear', 0, ext.ow, ext.oh);
  wrap.style.clipPath = clip;
  wrap.style.webkitClipPath = clip;
  inner.style.transform = _captionTranslate(dir, 'appear', ext.ow, ext.oh, 0);
  inner.style.opacity = '0';
}

function _captionPlayPhase(wrap, inner, w, h, dir, phase, ms, easing, ext) {
  ext = ext || { minX: 0, minY: 0, ow: w, oh: h };
  _captionStageFor(wrap, inner, dir, w, h, phase, ext);
  _captionClearStyles(wrap, inner);
  const aw = wrap.animate(_captionWrapFrames(ext.ow, ext.oh, dir, phase), { duration: ms, easing, fill: 'forwards' });
  const ai = inner.animate(_captionInnerFrames(ext.ow, ext.oh, dir, phase), { duration: ms, easing, fill: 'forwards' });
  return Promise.all([aw.finished, ai.finished]).catch(() => {});
}

function _captionHoldVisible(wrap, inner, dir, w, h, ext) {
  ext = ext || { minX: 0, minY: 0, ow: w, oh: h };
  _captionStageFor(wrap, inner, dir, w, h, 'hold', ext);
  wrap.style.clipPath = 'inset(0)';
  wrap.style.webkitClipPath = 'inset(0)';
  inner.style.transform = '';
  inner.style.opacity = '1';
}

function _captionAdoptContent(el, inner) {
  if (typeof window._textAnimShell === 'function') {
    const shell = window._textAnimShell(el);
    if (shell && shell.parentNode === el) {
      inner.appendChild(shell);
      if (typeof window._syncTextBodyLayout === 'function') window._syncTextBodyLayout(shell);
      return;
    }
  }
  while (el.firstChild) inner.appendChild(el.firstChild);
}

function _splitIsChrome(ch) {
  if (!ch || !ch.classList) return true;
  if (ch.classList.contains('link-bar') || ch.classList.contains('trigger-badge') ||
      ch.classList.contains('_particles_layer') || ch.classList.contains('_split_wrap') ||
      ch.classList.contains('rh')) return true;
  return false;
}

function _splitTakeNodes(el) {
  const isText = el && el.dataset && (el.dataset.type === 'text' || el.dataset.type === 'markdown');
  if (isText || (typeof window._isTextBlock === 'function' && window._isTextBlock(el))) {
    if (typeof window._migrateTextBgLayerOut === 'function') window._migrateTextBgLayerOut(el);
    const nodes = [];
    Array.from(el.children).forEach(ch => {
      if (_splitIsChrome(ch)) return;
      nodes.push(el.removeChild(ch));
    });
    if (nodes.length) return nodes;
    const pt = el.querySelector('.psel-txt');
    if (pt && pt.parentNode === el) {
      el.removeChild(pt);
      return [pt];
    }
  }
  if (typeof window._textAnimShell === 'function') {
    const shell = window._textAnimShell(el);
    if (shell && shell.parentNode === el) {
      el.removeChild(shell);
      return [shell];
    }
  }
  const nodes = [];
  while (el.firstChild) {
    const ch = el.firstChild;
    if (_splitIsChrome(ch)) {
      el.removeChild(ch);
      continue;
    }
    nodes.push(el.removeChild(ch));
  }
  return nodes;
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
    _captionAdoptContent(el, inner);
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
  const h = parseInt(el.style.height, 10) || el.offsetHeight || 100;
  const nodes = _splitTakeNodes(el);
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
  leftInner.style.cssText = 'position:absolute;left:0;top:0;width:' + w + 'px;height:' + h + 'px;';
  nodes.forEach(n => {
    leftInner.appendChild(n);
    if (n.classList && n.classList.contains('_text_body') && typeof window._syncTextBodyLayout === 'function') window._syncTextBodyLayout(n);
  });

  const rightHalf = document.createElement('div');
  rightHalf.className = '_split_right';
  rightHalf.style.cssText = 'position:absolute;right:0;top:0;width:50%;height:100%;overflow:hidden;transform-origin:0% 50%;will-change:transform,opacity;';
  const rightInner = document.createElement('div');
  rightInner.className = '_split_inner';
  rightInner.style.cssText = 'position:absolute;left:' + (-w / 2) + 'px;top:0;width:' + w + 'px;height:' + h + 'px;';
  clones.forEach(n => {
    rightInner.appendChild(n);
    if (n.classList && n.classList.contains('_text_body') && typeof window._syncTextBodyLayout === 'function') window._syncTextBodyLayout(n);
  });

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
    if (typeof window._restoreTextBlockVisuals === 'function') window._restoreTextBlockVisuals(el);
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
    if (typeof window._restoreTextBlockVisuals === 'function') window._restoreTextBlockVisuals(el);
  } else if (inner) {
    _captionClearStyles(wrap, inner);
  }
};

window._captionAnimDeferredByTrigger = function(anims) {
  if (!anims || !anims.length) return null;
  let autoBefore = false;
  for (let i = 0; i < anims.length; i++) {
    const a = anims[i];
    const trig = a.trigger || 'auto';
    if (trig === 'withPrev') continue;
    if (a.name === 'captionSlide') {
      if (trig === 'auto' || trig === 'autoAfter') return null;
      return autoBefore ? null : a;
    }
    if (trig === 'auto' || trig === 'autoAfter') {
      autoBefore = true;
      continue;
    }
    return null;
  }
  return null;
};

window._hideCaptionUntilTrigger = function(el, d, anim) {
  if (!el) return;
  anim = anim || (d && window._captionAnimDeferredByTrigger(d.anims));
  if (!anim) return;
  const w = (d && d.w) || parseInt(el.style.width, 10) || el.offsetWidth || 200;
  const h = (d && d.h) || parseInt(el.style.height, 10) || el.offsetHeight || 100;
  if (typeof window._prepCaptionSlideInitial === 'function') {
    window._prepCaptionSlideInitial(el, anim, w, h, d);
  } else {
    el.style.visibility = 'hidden';
    el.style.pointerEvents = 'none';
    el.classList.add('has-caption');
  }
};

window._prepCaptionSlideInitial = function(el, a, w, h, d0) {
  const dir = a.captionDir || 'right';
  const { wrap, inner } = _ensureCaptionWrap(el);
  const ext = _captionContentExtents(el, w, h, d0 || (el && el._exportD));
  _captionLockInnerSize(inner, w, h);
  _captionPrepHidden(wrap, inner, dir, w, h, ext);
  _captionFreeEl(el);
  el.style.visibility = 'hidden';
  el.style.pointerEvents = 'none';
  el.classList.add('has-caption');
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
    const ext = _captionContentExtents(e.el, w, h, e.d);
    return { el: e.el, d: e.d, x, y, w, h, ext, wrap: parts.wrap, inner: parts.inner };
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
    const prepped = it.el.classList.contains('has-caption')
      && it.el.style.visibility === 'hidden'
      && it.el.querySelector('._caption_wrap');
    _captionLockInnerSize(it.inner, it.w, it.h);
    if (!prepped) {
      if (groupMode) _captionPrepHiddenGroup(it.wrap, it.inner, dir, bounds, it);
      else _captionPrepHidden(it.wrap, it.inner, dir, it.w, it.h, it.ext);
      it.el.style.visibility = 'hidden';
      it.el.style.pointerEvents = 'none';
    }
    _captionFreeEl(it.el);
    it.el.classList.add('has-caption');
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
    return _captionPlayPhase(it.wrap, it.inner, it.w, it.h, dir, phase, ms, ease, it.ext);
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
      it.el.style.pointerEvents = '';
    });
    playPhase('appear', appearMs, 'ease-out').then(() => {
      if (run.cancelled) return;
      items.forEach(it => {
        if (groupMode) _captionHoldVisibleGroup(it.wrap, it.inner, dir, bounds, it);
        else _captionHoldVisible(it.wrap, it.inner, dir, it.w, it.h, it.ext);
      });
      run.holdTimer = setTimeout(runExit, holdMs);
    }).catch(finishHide);
  }, delay || 0);
};

window._fireCaptionSlideAnim = function(el, a, delay, w, h, opts) {
  const d = (opts && opts.d) || (el && el._exportD) || null;
  window._fireCaptionSlideAnimGroup([{ el, w, h, d }], a, delay, opts);
};

// ══════════════ Титр в космос (Star Wars crawl) ══════════════
// Bottom-wide / top-narrow perspective; content rises from the bottom
// and fades out in pieces near the vanishing point (screen-space mask).
function _cosmosTearDownRun(run) {
  if (!run) return;
  run.cancelled = true;
  if (run.anim && typeof run.anim.cancel === 'function') {
    try { run.anim.cancel(); } catch (e) {}
  }
  (run.items || []).forEach(it => {
    const el = it && it.el;
    if (!el) return;
    if (el._cosmosTitleRun === run) {
      delete el._cosmosTitleRun;
      if (el._liveAnimsByName && el._liveAnimsByName.cosmosTitle === run.anim) {
        delete el._liveAnimsByName.cosmosTitle;
      }
    }
    if (it.base) {
      el.style.visibility = it.base.visibility || '';
      el.style.pointerEvents = it.base.pointerEvents || '';
    }
  });
  if (run.stage && run.stage.parentNode) run.stage.remove();
  if (window._activeCosmosTitleRun === run) window._activeCosmosTitleRun = null;
}

window._resetCosmosTitleAnim = function(el) {
  if (!el) return;
  const run = el._cosmosTitleRun || window._activeCosmosTitleRun;
  if (run) _cosmosTearDownRun(run);
};

window._fireCosmosTitleAnimGroup = function(entries, a, delay, opts) {
  opts = opts || {};
  if (!entries || !entries.length) return;

  const hideAfter = opts.hideAfter !== false;
  const dur = Math.max(200, +(a && a.duration || 4000) || 4000);
  const dl = delay || 0;
  const host = entries[0] && entries[0].el && entries[0].el.parentElement;
  if (!host) return;

  const slideW = host.offsetWidth || parseFloat(host.style.width) || 960;
  const slideH = host.offsetHeight || parseFloat(host.style.height) || 540;

  const items = entries.map(e => {
    const el = e.el;
    if (!el) return null;
    return {
      el,
      x: e.x != null ? e.x : (parseFloat(el.style.left) || 0),
      y: e.y != null ? e.y : (parseFloat(el.style.top) || 0),
      w: e.w != null ? e.w : (parseFloat(el.style.width) || el.offsetWidth || 200),
      h: e.h != null ? e.h : (parseFloat(el.style.height) || el.offsetHeight || 200)
    };
  }).filter(Boolean);
  if (!items.length) return;

  let minY = Infinity, maxY = -Infinity;
  items.forEach(it => {
    minY = Math.min(minY, it.y);
    maxY = Math.max(maxY, it.y + it.h);
  });
  const groupH = Math.max(1, maxY - minY);
  // Sit the block just below the lower edge so it appears from the bottom.
  const yShift = slideH * 0.98 - minY;

  if (window._activeCosmosTitleRun) _cosmosTearDownRun(window._activeCosmosTitleRun);

  const run = { cancelled: false, items: items, stage: null, anim: null };
  window._activeCosmosTitleRun = run;

  // Скрыть оригиналы сразу — иначе один кадр видно исходную позицию до setTimeout
  items.forEach(it => {
    const el = it.el;
    it.base = {
      visibility: 'hidden',
      pointerEvents: 'none'
    };
    el._cosmosTitleRun = run;
    el.style.visibility = 'hidden';
    el.style.pointerEvents = 'none';
  });

  setTimeout(() => {
    if (run.cancelled) return;

    const stage = document.createElement('div');
    stage.className = '_cosmos_stage';
    const persp = Math.round(slideH * 0.72);
    // Upper 30% of slide height is the vanish zone.
    // Fade starts 15% from the top (0–15% fully gone, 15–30% dissolves).
    const gonePct = 15;
    const vanishPct = 30;
    const fadeMask = 'linear-gradient(to bottom, transparent 0%, transparent ' + gonePct + '%, #000 ' + vanishPct + '%, #000 100%)';
    stage.style.cssText = 'position:absolute;inset:0;z-index:40;pointer-events:none;overflow:hidden;'
      + 'perspective:' + persp + 'px;perspective-origin:50% 22%;'
      + '-webkit-mask-image:' + fadeMask + ';mask-image:' + fadeMask + ';'
      + '-webkit-mask-size:100% 100%;mask-size:100% 100%;';

    const tilt = document.createElement('div');
    tilt.className = '_cosmos_tilt';
    tilt.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;'
      + 'transform-style:preserve-3d;transform-origin:50% 100%;'
      + 'transform:rotateX(58deg);';

    const mover = document.createElement('div');
    mover.className = '_cosmos_mover';
    mover.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;transform-style:preserve-3d;will-change:transform;';

    items.forEach(it => {
      const el = it.el;
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';

      const clone = el.cloneNode(true);
      clone.classList.remove('sel', 'msel', 'picked');
      clone.style.position = 'absolute';
      clone.style.left = it.x + 'px';
      clone.style.top = (it.y + yShift) + 'px';
      clone.style.width = it.w + 'px';
      clone.style.height = it.h + 'px';
      clone.style.visibility = 'visible';
      clone.style.opacity = el.style.opacity || '';
      clone.style.pointerEvents = 'none';
      clone.style.margin = '0';
      clone.removeAttribute('data-id');
      mover.appendChild(clone);
    });

    tilt.appendChild(mover);
    stage.appendChild(tilt);
    host.appendChild(stage);
    run.stage = stage;
    run.items = items;

    const travel = slideH * 1.72 + groupH;
    const anim = mover.animate(
      [
        { transform: 'translateY(0px)' },
        { transform: 'translateY(' + (-travel) + 'px)' }
      ],
      { duration: dur, easing: 'linear', fill: 'forwards' }
    );
    run.anim = anim;
    items.forEach(it => {
      if (!it.el._liveAnimsByName) it.el._liveAnimsByName = {};
      it.el._liveAnimsByName.cosmosTitle = anim;
    });

    const finish = () => {
      if (run.cancelled) return;
      if (hideAfter) {
        run.cancelled = true;
        if (run.stage && run.stage.parentNode) run.stage.remove();
        run.stage = null;
        items.forEach(it => {
          const el = it.el;
          el.style.visibility = 'hidden';
          el.style.pointerEvents = 'none';
          if (el._cosmosTitleRun === run) delete el._cosmosTitleRun;
        });
        if (window._activeCosmosTitleRun === run) window._activeCosmosTitleRun = null;
      } else {
        _cosmosTearDownRun(run);
      }
    };
    anim.finished.then(finish).catch(() => {
      if (!hideAfter) _cosmosTearDownRun(run);
    });
  }, dl);
};

window._fireCosmosTitleAnim = function(el, a, delay, w, h, opts) {
  opts = opts || {};
  if (!el) return;
  const x = parseFloat(el.style.left) || 0;
  const y = parseFloat(el.style.top) || 0;
  const ww = w != null ? w : (parseFloat(el.style.width) || el.offsetWidth || 200);
  const hh = h != null ? h : (parseFloat(el.style.height) || el.offsetHeight || 200);
  window._fireCosmosTitleAnimGroup([{ el, x, y, w: ww, h: hh }], a, delay, opts);
};

function _splitReadCounterFromEl(el) {
  if (!el || el.dataset.appletId !== 'counter') return null;
  const iframe = el.querySelector('iframe');
  if (!iframe) return null;
  try {
    const w = iframe.contentWindow;
    if (w && w._val != null && w._val !== '') {
      const n = +w._val;
      if (!isNaN(n)) return n;
    }
    const num = iframe.contentDocument && iframe.contentDocument.getElementById('num');
    if (num && num.textContent != null && num.textContent !== '') {
      const n = parseFloat(String(num.textContent).replace(/[^\d.-]/g, ''));
      if (!isNaN(n)) return n;
    }
  } catch (e) {}
  return null;
}

function _splitResolveAppletLiveVal(el, liveVal) {
  if (liveVal != null && liveVal !== '') {
    const n = +liveVal;
    if (!isNaN(n)) return n;
  }
  if (el._splitAppletLiveVal != null && el._splitAppletLiveVal !== '') {
    const n = +el._splitAppletLiveVal;
    if (!isNaN(n)) return n;
  }
  const fromIframe = _splitReadCounterFromEl(el);
  if (fromIframe != null && !isNaN(fromIframe)) return fromIframe;
  const elId = el.dataset && el.dataset.id;
  if (!elId || typeof slides === 'undefined') return null;
  const inPreview = document.getElementById('preview-ov')?.classList.contains('active');
  const idx = inPreview && typeof pidx !== 'undefined' ? pidx : (typeof cur !== 'undefined' ? cur : 0);
  const d = slides[idx]?.els?.find(x => x.id === elId);
  if (!d || d.type !== 'applet' || d.appletId !== 'counter') return null;
  if (d.cntGoal != null && d.cntGoal !== '') return +d.cntGoal;
  return d.cntStart != null ? +d.cntStart : null;
}

function _patchAppletSrcdocVal(srcdoc, liveVal) {
  if (liveVal == null || srcdoc === '') return srcdoc;
  const n = +liveVal;
  if (isNaN(n)) return srcdoc;
  let out = srcdoc;
  if (/var _val=/.test(out)) {
    out = out.replace(/var _val=([^,;]+)/, 'var _val=' + n);
  }
  return out;
}

function _splitPatchIframe(iframe, liveVal) {
  if (!iframe || liveVal == null) return;
  let srcdoc = iframe.getAttribute('srcdoc') || iframe.srcdoc || '';
  if (!srcdoc) return;
  iframe.srcdoc = _patchAppletSrcdocVal(srcdoc, liveVal);
}

function _splitPatchTreeIframes(node, liveVal) {
  if (!node || liveVal == null) return;
  if (node.tagName === 'IFRAME') {
    _splitPatchIframe(node, liveVal);
    return;
  }
  if (node.querySelectorAll) {
    node.querySelectorAll('iframe').forEach(f => _splitPatchIframe(f, liveVal));
  }
}

function _splitCloneNode(node, liveVal) {
  if (node && node.tagName === 'IFRAME') {
    const clone = node.cloneNode(false);
    clone.style.cssText = node.style.cssText;
    if (node.hasAttribute('allowtransparency')) clone.setAttribute('allowtransparency', node.getAttribute('allowtransparency'));
    if (node.hasAttribute('sandbox')) clone.setAttribute('sandbox', node.getAttribute('sandbox'));
    let srcdoc = node.getAttribute('srcdoc') || node.srcdoc || '';
    if (liveVal != null && srcdoc) srcdoc = _patchAppletSrcdocVal(srcdoc, liveVal);
    if (srcdoc) clone.srcdoc = srcdoc;
    return clone;
  }
  const clone = node.cloneNode(false);
  if (node.style) clone.style.cssText = node.style.cssText;
  Array.from(node.attributes || []).forEach(attr => {
    if (attr.name !== 'style') clone.setAttribute(attr.name, attr.value);
  });
  Array.from(node.childNodes).forEach(child => {
    if (child.nodeType === 1) clone.appendChild(_splitCloneNode(child, liveVal));
    else clone.appendChild(child.cloneNode(true));
  });
  return clone;
}

function _splitWaitIframes(root, cb) {
  const iframes = root ? Array.from(root.querySelectorAll('iframe')) : [];
  if (!iframes.length) { cb(); return; }
  let pending = 0;
  iframes.forEach(f => {
    try {
      const doc = f.contentDocument;
      const num = doc && doc.getElementById('num');
      if (num && num.textContent !== '') return;
    } catch (e) {}
    pending++;
    f.addEventListener('load', () => {
      pending--;
      if (pending <= 0) cb();
    }, { once: true });
  });
  if (pending === 0) cb();
}

function _ensureSplitHalfWrap(el, liveVal) {
  let wrap = el.querySelector('._split_wrap');
  if (wrap) {
    return {
      wrap,
      leftHalf: wrap.querySelector('._split_left'),
      rightHalf: wrap.querySelector('._split_right'),
    };
  }
  const val = _splitResolveAppletLiveVal(el, liveVal);
  const w = parseInt(el.style.width, 10) || el.offsetWidth || 200;
  const h = parseInt(el.style.height, 10) || el.offsetHeight || 100;
  const nodes = _splitTakeNodes(el);
  const clones = nodes.map(n => _splitCloneNode(n, val));

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
  leftInner.style.cssText = 'position:absolute;left:0;top:0;width:' + w + 'px;height:' + h + 'px;';
  nodes.forEach(n => {
    leftInner.appendChild(n);
    if (n.classList && n.classList.contains('_text_body') && typeof window._syncTextBodyLayout === 'function') window._syncTextBodyLayout(n);
  });

  const rightHalf = document.createElement('div');
  rightHalf.className = '_split_right';
  rightHalf.style.cssText = 'position:absolute;right:0;top:0;width:50%;height:100%;overflow:hidden;transform-origin:0% 50%;will-change:transform,opacity;';
  const rightInner = document.createElement('div');
  rightInner.className = '_split_inner';
  rightInner.style.cssText = 'position:absolute;left:' + (-w / 2) + 'px;top:0;width:' + w + 'px;height:' + h + 'px;';
  clones.forEach(n => {
    rightInner.appendChild(n);
    if (n.classList && n.classList.contains('_text_body') && typeof window._syncTextBodyLayout === 'function') window._syncTextBodyLayout(n);
  });

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
    if (typeof window._restoreTextBlockVisuals === 'function') window._restoreTextBlockVisuals(el);
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
    const liveVal = el._splitAppletLiveVal != null && el._splitAppletLiveVal !== ''
      ? el._splitAppletLiveVal
      : _splitReadCounterFromEl(el);
    const parts = _ensureSplitHalfWrap(el, liveVal);
    const runSplit = () => {
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
    };
    if (parts.wrap && parts.wrap.querySelector('iframe')) _splitWaitIframes(parts.wrap, runSplit);
    else runSplit();
  }, dl);
};

/* END:EXPORT:CAPTION-BUNDLE */

/* EXPORT:ENGINE-TAIL */

window._particlesHasAnim = function(d) {
  return !!(d && (d.anims || []).some(a => a && a.name === 'particles'));
};

window._particlesIsInfinite = function(a) {
  if (!a) return false;
  const c = a.swingCount != null ? a.swingCount : 1;
  return !isFinite(+c) || +c >= 10;
};

window._particlesCycleSpan = function(a) {
  const _d = typeof _ptDef === 'function' ? _ptDef() : (window.PARTICLES_DEFAULTS || { duration: 3550, ptLife: 900 });
  const spawn = Math.max(400, +(a && a.duration != null ? a.duration : _d.duration) || _d.duration);
  const life = Math.max(400, +(a && a.ptLife != null ? a.ptLife : _d.ptLife) || _d.ptLife);
  return spawn + life * 1.5;
};

window._animIsElementSpecific = function(name) {
  return name === 'particles' || name === 'captionSlide' || name === 'cosmosTitle' || name === 'splitHalf' || name === 'typewriter' || name === 'langFade' || name === 'inkDraw';
};

window._langFadeTel = function(el, d) {
  if (!el) return null;
  const type = (d && d.type) || (el.dataset && el.dataset.type) || '';
  if (type === 'text') {
    const wrap = el.querySelector('._langfade_wrap');
    if (wrap && wrap.parentNode) return wrap.parentNode;
    const psel = el.querySelector('.psel-txt');
    if (psel && psel.children && psel.children[0]) return psel.children[0];
    return el.querySelector('.tel') || el.querySelector('.ec') || null;
  }
  return el.querySelector('.shape-text') || el.querySelector('.tel') || el.querySelector('.ec');
};

window._langFadePlain = function(html) {
  try {
    const box = document.createElement('div');
    box.innerHTML = String(html || '');
    return String(box.textContent || '').replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();
  } catch (e) {
    return String(html || '').replace(/<[^>]*>/g, '').replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();
  }
};

window._fireLangFadeAnim = function(el, d, a, delay, opts) {
  opts = opts || {};
  if (!el || !a) return null;
  const dur = Math.max(120, +(a.duration || 800) || 800);
  const fromStored = a.fromHtml != null ? a.fromHtml : '';
  const toStored = a.toHtml != null ? a.toHtml : fromStored;
  const tel = window._langFadeTel(el, d);
  if (!tel) return null;

  if (el._langFadeHandle && typeof el._langFadeHandle.cancel === 'function') {
    try { el._langFadeHandle.cancel({ restore: false }); } catch (e) {}
    el._langFadeHandle = null;
  }

  const fromP = window._langFadePlain(fromStored);
  const toP = window._langFadePlain(toStored);
  const toLayer = tel.querySelector && tel.querySelector('._langfade_to');
  const curHtml = toLayer ? toLayer.innerHTML : tel.innerHTML;
  const curP = window._langFadePlain(curHtml);

  const atTo = (toP && curP === toP) || el._langFadeSide === 'to';
  const atFrom = (fromP && curP === fromP) || el._langFadeSide === 'from';
  let goingTo = 'to';
  if (atTo && !atFrom) goingTo = 'from';
  else if (atFrom && !atTo) goingTo = 'to';
  else if (el._langFadeSide === 'to') goingTo = 'from';

  const nextHtml = goingTo === 'from' ? fromStored : toStored;
  const prevHtml = curP ? curHtml : (goingTo === 'from' ? toStored : fromStored);
  el._langFadeSide = goingTo;

  let cancelled = false;
  let timer = 0;
  let animA = null;
  let animB = null;

  const handle = {
    cancel: function (cOpts) {
      cancelled = true;
      if (timer) clearTimeout(timer);
      try { if (animA) animA.cancel(); } catch (e) {}
      try { if (animB) animB.cancel(); } catch (e) {}
      const doRestore = !(cOpts && cOpts.restore === false) && opts.restore !== false;
      if (doRestore && tel.querySelector && tel.querySelector('._langfade_wrap')) {
        tel.innerHTML = nextHtml;
      }
    }
  };
  el._langFadeHandle = handle;
  if (!el._liveAnims) el._liveAnims = [];
  el._liveAnims.push(handle);

  const start = function () {
    if (cancelled) return;
    const wrap = document.createElement('div');
    wrap.className = '_langfade_wrap';
    wrap.style.cssText = 'position:relative;width:100%;min-height:100%;';
    const layerFrom = document.createElement('div');
    layerFrom.className = '_langfade_from';
    layerFrom.style.cssText = 'position:absolute;left:0;top:0;width:100%;opacity:1;z-index:1;pointer-events:none;';
    layerFrom.innerHTML = prevHtml;
    const layerTo = document.createElement('div');
    layerTo.className = '_langfade_to';
    layerTo.style.cssText = 'position:relative;width:100%;opacity:0;z-index:2;pointer-events:none;';
    layerTo.innerHTML = nextHtml;
    wrap.appendChild(layerFrom);
    wrap.appendChild(layerTo);
    tel.innerHTML = '';
    tel.appendChild(wrap);
    const ease = 'ease-in-out';
    try {
      animA = layerFrom.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: ease, fill: 'forwards' });
      animB = layerTo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: ease, fill: 'forwards' });
      animB.onfinish = function () {
        if (cancelled) return;
        tel.innerHTML = nextHtml;
        el._langFadeSide = goingTo;
      };
    } catch (e) {
      tel.innerHTML = nextHtml;
      el._langFadeSide = goingTo;
    }
  };

  timer = setTimeout(start, delay || 0);
  return handle;
};

window._particlesEnsureHiddenIfNeeded = function(el, d, force) {
  if (!el) return;
  if (!force && !window._particlesHasAnim(d)) return;
  el.classList.add('has-particles');
  window._particlesHideOriginal(el);
};

window._particlesHideOriginal = function(el) {
  if (!el || el._particlesOrigVis != null) return;
  el._particlesOrigVis = el.style.visibility;
  el._particlesOrigPE = el.style.pointerEvents;
  el.style.visibility = 'hidden';
  el.style.pointerEvents = 'none';
};

window._particlesShowOriginal = function(el) {
  if (!el) return;
  if (el._particlesOrigVis != null) {
    el.style.visibility = el._particlesOrigVis;
    el._particlesOrigVis = null;
  } else {
    el.style.visibility = '';
  }
  if (el._particlesOrigPE != null) {
    el.style.pointerEvents = el._particlesOrigPE;
    el._particlesOrigPE = null;
  } else {
    el.style.pointerEvents = '';
  }
};

window._resetParticles = function(el) {
  if (!el) return;
  if (el._particlesRun) {
    el._particlesRun.cancelled = true;
    el._particlesRun = null;
  }
  if (el._particlesTimers) {
    el._particlesTimers.forEach(t => clearTimeout(t));
    el._particlesTimers = [];
  }
  if (el._particlesRaf) {
    cancelAnimationFrame(el._particlesRaf);
    el._particlesRaf = null;
  }
  const layer = el._particlesLayer;
  if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
  el._particlesLayer = null;
  window._particlesShowOriginal(el);
  el.classList.remove('has-particles');
  if (el._liveAnimsByName && el._liveAnimsByName.particles) {
    try { delete el._liveAnimsByName.particles; } catch (e) {}
  }
};

window._particlesResolveData = function(el, d, ew, eh) {
  d = d || {};
  const ds = el && el.dataset ? el.dataset : {};
  const type = d.type || ds.type || '';
  const out = Object.assign({ id: d.id || ds.id || 'x', type: type, w: ew, h: eh }, d);
  if (out.elOpacity == null) {
    if (ds.elOpacity != null) out.elOpacity = +ds.elOpacity;
    else if (el && el.style && el.style.opacity) {
      const o = parseFloat(el.style.opacity);
      if (!isNaN(o)) out.elOpacity = o;
    }
  }
  if (type === 'image') {
    if (out.imgOpacity == null) {
      if (d.imgOpacity != null) out.imgOpacity = +d.imgOpacity;
      else if (ds.imgOpacity != null) out.imgOpacity = +ds.imgOpacity;
      else {
        const img = el && el.querySelector('img');
        if (img && img.style.opacity) {
          const io = parseFloat(img.style.opacity);
          if (!isNaN(io)) out.imgOpacity = io;
        }
      }
    }
    if (out.imgShadow == null && ds.imgShadow != null) out.imgShadow = ds.imgShadow === 'true' || ds.imgShadow === '1';
    if (out.imgShadowBlur == null && ds.imgShadowBlur != null) out.imgShadowBlur = +ds.imgShadowBlur;
    if (out.imgShadowSize == null && ds.imgShadowSize != null) out.imgShadowSize = +ds.imgShadowSize;
    if (!out.imgShadowColor && ds.imgShadowColor) out.imgShadowColor = ds.imgShadowColor;
  }
  if (type === 'shape') {
    if (out.shadow == null && ds.shadow != null) out.shadow = ds.shadow === 'true' || ds.shadow === '1';
    if (out.shadowBlur == null && ds.shadowBlur != null) out.shadowBlur = +ds.shadowBlur;
    if (out.shadowSize == null && ds.shadowSize != null) out.shadowSize = +ds.shadowSize;
    if (!out.shadowColor && ds.shadowColor) out.shadowColor = ds.shadowColor;
    if (out.sw == null && ds.sw != null) out.sw = +ds.sw;
  }
  if (type === 'text') {
    if (out.textShadowSize == null && ds.textShadowSize != null) out.textShadowSize = +ds.textShadowSize;
    if (out.textShadowBlur == null && ds.textShadowBlur != null) out.textShadowBlur = +ds.textShadowBlur;
    if (out.textShadowW == null && ds.textShadowW != null) out.textShadowW = +ds.textShadowW;
    if (!out.textShadowColor && ds.textShadowColor) out.textShadowColor = ds.textShadowColor;
  }
  if (out.shapeFlipH == null && ds.shapeFlipH === 'true') out.shapeFlipH = true;
  if (out.shapeFlipV == null && ds.shapeFlipV === 'true') out.shapeFlipV = true;
  return out;
};

window._particlesBaseOpacity = function(pd) {
  if (!pd || pd.elOpacity == null || isNaN(+pd.elOpacity)) return 1;
  return Math.max(0, Math.min(1, +pd.elOpacity));
};

window._particlesApplyCloneShadow = function(host, pd, uid) {
  if (!host || !pd) return;
  const shFn = typeof window._shadowStateFromData === 'function' ? window._shadowStateFromData
    : (typeof window._expShadowStateFromData === 'function' ? window._expShadowStateFromData : null);
  const sh = shFn ? shFn(pd) : null;
  if (!sh || !sh.active) return;
  host.dataset.id = (pd.id || 'x') + '_pt' + uid;
  host.dataset.type = pd.type || '';
  if (typeof window._applyShadowValues === 'function') {
    window._applyShadowValues(host, pd, sh.ss, sh.sb, sh.sc);
  } else if (typeof window._expApplyShadowValues === 'function') {
    window._expApplyShadowValues(host, pd, sh.ss, sh.sb, sh.sc);
  }
  host.style.overflow = 'visible';
};

function _particlesNeutralizePointer(node) {
  if (!node || node.nodeType !== 1) return;
  if (node.style) { node.style.pointerEvents = 'none'; node.style.cursor = 'default'; }
  if (node.querySelectorAll) {
    node.querySelectorAll('*').forEach(function(n) {
      // Some SVG nodes (e.g. <animate>, <animateTransform>, <mpath>,
      // <metadata>, <title>, <stop>) don't expose a usable CSSStyleDeclaration
      // via .style in every browser — guard against that instead of crashing
      // and silently aborting the whole particle effect for SVG content.
      if (!n.style) return;
      n.style.pointerEvents = 'none';
      n.style.cursor = 'default';
    });
  }
}

function _particlesUnhideCloneTree(node) {
  if (!node || node.nodeType !== 1) return;
  if (node.style) {
    node.style.opacity = '1';
    node.style.visibility = 'visible';
    node.style.animation = 'none';
  }
  if (node.querySelectorAll) {
    node.querySelectorAll('*').forEach(function(n) {
      if (!n.style) return;
      n.style.opacity = '1';
      n.style.visibility = 'visible';
      n.style.animation = 'none';
    });
  }
}

function _particlesSyncTextEcStyles(origEl, cloneRoot) {
  const origEc = origEl.querySelector('.ec') || origEl.querySelector('.tel');
  const cloneEc = cloneRoot.querySelector('.ec') || cloneRoot.querySelector('.tel');
  if (!origEc || !cloneEc) return;
  try {
    const cs = getComputedStyle(origEc);
    cloneEc.style.color = cs.color;
    if (origEc.style.background) cloneEc.style.background = origEc.style.background;
    if (origEc.style.webkitBackgroundClip) cloneEc.style.webkitBackgroundClip = origEc.style.webkitBackgroundClip;
    if (origEc.style.backgroundClip) cloneEc.style.backgroundClip = origEc.style.backgroundClip;
    if (origEc.style.webkitTextFillColor) cloneEc.style.webkitTextFillColor = origEc.style.webkitTextFillColor;
    else if (cs.webkitTextFillColor) cloneEc.style.webkitTextFillColor = cs.webkitTextFillColor;
  } catch (e) {}
}

function _particlesIsCanvasChrome(ch) {
  if (!ch || !ch.classList) return true;
  if (ch.classList.contains('_particles_layer') || ch.classList.contains('link-bar') || ch.classList.contains('trigger-badge')) return true;
  if (ch.classList.contains('rh')) return true;
  return false;
}

window._particlesCloneVisual = function(el, pd, uid, visScale) {
  visScale = visScale == null ? 1 : visScale;
  const type = (pd && pd.type) || (el.dataset && el.dataset.type) || '';
  const ew = (pd && pd.w) || parseFloat(el.style.width) || el.offsetWidth || 100;
  const eh = (pd && pd.h) || parseFloat(el.style.height) || el.offsetHeight || 100;
  const root = document.createElement('div');
  root.className = '_particle_vis_root';
  root.style.cssText = 'position:absolute;left:0;top:0;width:' + ew + 'px;height:' + eh + 'px;overflow:visible;pointer-events:none;box-sizing:border-box;';
  const wrap = document.createElement('div');
  wrap.className = '_particle_vis';
  wrap.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;box-sizing:border-box;';
  function adopt(node) {
    if (!node) return false;
    const c = node.cloneNode(true);
    c.style.pointerEvents = 'none';
    c.style.width = ew + 'px';
    c.style.height = eh + 'px';
    c.style.boxSizing = 'border-box';
    wrap.appendChild(c);
    return true;
  }
  if (type === 'text') {
    if (typeof window._migrateTextBgLayerOut === 'function') window._migrateTextBgLayerOut(el);
    const shell = document.createElement('div');
    shell.style.cssText = 'position:absolute;inset:0;width:' + ew + 'px;height:' + eh + 'px;overflow:hidden;box-sizing:border-box;pointer-events:none;';
    let cloned = false;
    Array.from(el.children).forEach(function(ch) {
      if (_particlesIsCanvasChrome(ch)) return;
      const c = ch.cloneNode(true);
      c.style.pointerEvents = 'none';
      if (c.classList && c.classList.contains('_text_body')) {
        c.style.width = ew + 'px';
        c.style.height = eh + 'px';
        c.style.boxSizing = 'border-box';
        if (typeof window._syncTextBodyLayout === 'function') window._syncTextBodyLayout(c);
      }
      _particlesUnhideCloneTree(c);
      shell.appendChild(c);
      cloned = true;
    });
    if (!cloned) {
      const src = el.querySelector('.psel-txt') || el.querySelector('._text_body') || el.querySelector('.tel') || el.querySelector('.ec');
      if (src) {
        const c = src.cloneNode(true);
        c.style.pointerEvents = 'none';
        c.style.width = ew + 'px';
        c.style.height = eh + 'px';
        c.style.boxSizing = 'border-box';
        _particlesUnhideCloneTree(c);
        shell.appendChild(c);
      }
    }
    _particlesSyncTextEcStyles(el, shell);
    wrap.appendChild(shell);
    const rxSrc = el.querySelector('._text_body') || el;
    if (rxSrc && rxSrc.style.borderRadius) wrap.style.borderRadius = rxSrc.style.borderRadius;
    else if (el.style.borderRadius) wrap.style.borderRadius = el.style.borderRadius;
  } else if (type === 'shape') {
    if (!adopt(el.querySelector('.ec'))) adopt(el.querySelector('.shape-svg'));
  } else if (type === 'image') {
    const img = el.querySelector('img');
    if (img) {
      const c = img.cloneNode(true);
      const io = pd && pd.imgOpacity != null ? +pd.imgOpacity : (img.style.opacity ? parseFloat(img.style.opacity) : 1);
      c.style.cssText = 'width:100%;height:100%;object-fit:' + (img.style.objectFit || 'contain') + ';pointer-events:none;display:block;opacity:' + (isNaN(io) ? 1 : io) + ';';
      wrap.appendChild(c);
    }
  } else if (type === 'icon' || type === 'formula' || type === 'svg') {
    adopt(el.querySelector('svg'));
    if (type === 'svg' && pd) {
      const so = pd.svgOpacity != null ? +pd.svgOpacity : 1;
      wrap.style.opacity = isNaN(so) ? '1' : String(so);
    }
  } else {
    const kids = Array.from(el.children).filter(ch => !ch.classList.contains('_particles_layer'));
    if (!kids.length || !adopt(kids[0])) {
      wrap.style.background = 'rgba(128,128,128,.25)';
      wrap.style.borderRadius = '4px';
    }
  }
  root.appendChild(wrap);
  const flipH = !!(pd && pd.shapeFlipH) || (el && el.dataset && el.dataset.shapeFlipH === 'true');
  const flipV = !!(pd && pd.shapeFlipV) || (el && el.dataset && el.dataset.shapeFlipV === 'true');
  if (flipH || flipV) {
    wrap.style.transformOrigin = 'center center';
    wrap.style.transform = 'scale(' + (flipH ? -1 : 1) + ',' + (flipV ? -1 : 1) + ')';
  }
  if (visScale !== 1) {
    root.style.transformOrigin = '0 0';
    root.style.transform = 'scale(' + visScale + ')';
  }
  if (pd && uid != null) window._particlesApplyCloneShadow(root, pd, uid);
  if ((type === 'image' || type === 'svg') && !root.style.filter) {
    const _ecHost = el.querySelector && el.querySelector('.ec');
    const filterSrc = (el.style && el.style.filter) || (_ecHost && _ecHost.style && _ecHost.style.filter) || '';
    if (filterSrc) root.style.filter = filterSrc;
  }
  root.style.overflow = 'visible';
  _particlesNeutralizePointer(root);
  return root;
};

window._particlesLayerZ = function(el) {
  if (!el) return 2;
  const inline = parseInt(el.style.zIndex, 10);
  if (!isNaN(inline)) return inline;
  try {
    const computed = parseInt(getComputedStyle(el).zIndex, 10);
    if (!isNaN(computed)) return computed;
  } catch (e) {}
  return 2;
};

function _ptDef() {
  return window.PARTICLES_DEFAULTS || {
    particleCount: 14, ptDir: 0, ptLife: 900, ptSizeRand: 51, ptRot: 32, ptSpread: 100, duration: 3550
  };
}

function _particlesElRot(el, d) {
  d = d || {};
  if (d.rot != null && !isNaN(+d.rot)) return +d.rot;
  if (el && el.dataset && el.dataset.rot != null && el.dataset.rot !== '') return +el.dataset.rot || 0;
  if (el && el.style && el.style.transform) {
    const m = el.style.transform.match(/rotate\(([-\d.]+)deg\)/);
    if (m) return +m[1] || 0;
  }
  try {
    const t = el && getComputedStyle(el).transform;
    if (t && t !== 'none') {
      const m = new DOMMatrix(t);
      return Math.atan2(m.b, m.a) * 180 / Math.PI;
    }
  } catch (e) {}
  return 0;
}

function _particlesWorldDir(ptDir, elRot) {
  // ptDir: 0° = up relative to element; elRot: CSS rotate(deg) on the object
  return ((+elRot + +ptDir - 90) % 360 + 360) % 360;
}

window._fireParticlesAnim = function(el, a, delay, d, opts) {
  opts = opts || {};
  if (!el || !el.parentElement) return;
  window._resetParticles(el);
  const _d = _ptDef();
  const count = Math.max(1, Math.min(200, +(a.particleCount != null ? a.particleCount : _d.particleCount) || _d.particleCount));
  const ptDir = ((a.ptDir != null ? +a.ptDir : (a.particleDir != null ? +a.particleDir : _d.ptDir)) % 360 + 360) % 360;
  const elRot = _particlesElRot(el, d);
  const baseFlyDeg = _particlesWorldDir(ptDir, elRot);
  const ptLife = Math.max(400, +(a.ptLife != null ? a.ptLife : _d.ptLife) || _d.ptLife);
  const ptSizeRand = Math.max(0, Math.min(100, +(a.ptSizeRand != null ? a.ptSizeRand : _d.ptSizeRand)));
  const ptRotDev = Math.max(0, Math.min(180, +(a.ptRot != null ? a.ptRot : _d.ptRot)));
  const ptSpread = Math.max(0, Math.min(100, +(a.ptSpread != null ? a.ptSpread : _d.ptSpread)));
  const spawnWindow = Math.max(400, +(a.duration != null ? a.duration : _d.duration) || _d.duration);
  const speedFactor = 6000 / spawnWindow;
  const swingCnt = a.swingCount != null ? a.swingCount : 1;
  const loops = window._particlesIsInfinite(a) ? Infinity : Math.max(1, +swingCnt || 1);
  const cycleSpan = window._particlesCycleSpan(a);
  const animStart = performance.now();
  const ew = (d && d.w) || parseFloat(el.style.width) || el.offsetWidth || 100;
  const eh = (d && d.h) || parseFloat(el.style.height) || el.offsetHeight || 100;
  const pd = window._particlesResolveData(el, d, ew, eh);
  const baseOpacity = window._particlesBaseOpacity(pd);
  let _ptUid = 0;
  const container = el.parentElement;
  const run = { cancelled: false };
  el._particlesRun = run;
  el._particlesTimers = [];
  el.style.overflow = 'visible';
  el.classList.add('has-particles');

  let layer = el._particlesLayer;
  const layerZ = window._particlesLayerZ(el);
  if (!layer) {
    layer = document.createElement('div');
    layer.className = '_particles_layer';
    el._particlesLayer = layer;
  }
  layer.style.cssText = 'position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:' + layerZ + ';';
  if (el.nextSibling !== layer) {
    if (el.nextSibling) container.insertBefore(layer, el.nextSibling);
    else container.appendChild(layer);
  }
  layer.innerHTML = '';
  window._particlesHideOriginal(el);

  function elPos() {
    return {
      x: parseFloat(el.style.left) || 0,
      y: parseFloat(el.style.top) || 0,
      w: ew,
      h: eh
    };
  }

  function particleScale() {
    if (ptSizeRand <= 0) return 1;
    const minS = 0.01;
    return 1 - (ptSizeRand / 100) * Math.random() * (1 - minS);
  }

  function msUntil(absFromStart) {
    return Math.max(0, absFromStart - (performance.now() - animStart));
  }

  function spawnOne(absFromStart) {
    const tid = setTimeout(() => {
      if (run.cancelled || !layer.parentNode) return;
      const pos = elPos();
      const life = ptLife * (0.55 + Math.random() * 0.9);
      const scale = particleScale();
      const speedMult = 0.55 + Math.random() * 0.9;
      const pw = Math.max(4, ew * scale);
      const ph = Math.max(4, eh * scale);
      const sx0 = pos.x + Math.random() * Math.max(0, pos.w - pw * 0.5);
      const sy0 = pos.y + Math.random() * Math.max(0, pos.h - ph * 0.5);
      let flyDeg = baseFlyDeg;
      if (ptRotDev > 0) flyDeg = baseFlyDeg + (Math.random() - 0.5) * 2 * ptRotDev;
      flyDeg = ((flyDeg % 360) + 360) % 360;
      const pRot = (flyDeg + 90) % 360;
      const dirRad = flyDeg * Math.PI / 180;
      const cosD = Math.cos(dirRad);
      const sinD = Math.sin(dirRad);
      const perpX = -sinD;
      const perpY = cosD;
      const sizeBase = Math.max(ew, eh);
      const speedPxMs = (0.038 + Math.random() * 0.024) * speedMult * speedFactor * (0.65 + sizeBase * 0.0035);
      const spreadPx = sizeBase * (ptSpread / 100) * 0.55;
      const latOff = ptSpread > 0 ? (Math.random() - 0.5) * 2 * spreadPx : 0;
      const latVel = ptSpread > 0 ? (Math.random() - 0.5) * 2 * speedPxMs * (ptSpread / 100) * 0.32 : 0;
      const sx = sx0 + perpX * latOff;
      const sy = sy0 + perpY * latOff;
      const zigAmp = sizeBase * (0.012 + Math.random() * 0.018);
      const zigFreqHz = 0.18 + Math.random() * 0.32;
      const zigPhase = Math.random() * Math.PI * 2;
      const fadeIn = Math.min(400, life * 0.12);
      const fadeOut = Math.min(650, life * 0.2);
      const uid = (_ptUid++);

      const p = document.createElement('div');
      p.className = '_particle';
      const pTf = 'rotate(' + pRot + 'deg)';
      p.style.cssText = 'position:absolute;left:' + sx + 'px;top:' + sy + 'px;width:' + pw + 'px;height:' + ph + 'px;opacity:0;pointer-events:none;cursor:default;overflow:visible;transform-origin:center center;transform:' + pTf + ';';
      p.appendChild(window._particlesCloneVisual(el, pd, uid, scale));
      _particlesNeutralizePointer(p);
      layer.appendChild(p);

      const t0 = performance.now();
      function tick(now) {
        if (run.cancelled) { if (p.parentNode) p.remove(); return; }
        const elapsed = now - t0;
        if (elapsed >= life) { if (p.parentNode) p.remove(); return; }
        const lifeT = elapsed / life;
        const drift = speedPxMs * elapsed;
        const bx = sx + cosD * drift;
        const by = sy + sinD * drift;
        const lat = latVel * elapsed;
        const zig = Math.sin(elapsed * 0.001 * zigFreqHz * Math.PI * 2 + zigPhase) * zigAmp * (1 - lifeT * 0.45);
        const x = bx + perpX * (zig + lat);
        const y = by + perpY * (zig + lat);
        let fadeOp;
        if (elapsed < fadeIn) fadeOp = elapsed / fadeIn;
        else if (elapsed > life - fadeOut) fadeOp = (life - elapsed) / fadeOut;
        else fadeOp = 1;
        let scale = 1;
        if (elapsed > life - fadeOut) {
          const tFade = 1 - Math.max(0, Math.min(1, fadeOp));
          scale = 1 + tFade * 0.5;
        }
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        p.style.transform = 'rotate(' + pRot + 'deg) scale(' + scale + ')';
        p.style.opacity = String(Math.max(0, Math.min(1, baseOpacity * fadeOp)));
        el._particlesRaf = requestAnimationFrame(tick);
      }
      el._particlesRaf = requestAnimationFrame(tick);
    }, msUntil(absFromStart));
    el._particlesTimers.push(tid);
  }

  function runCycle(cycleIdx) {
    if (run.cancelled) return;
    if (cycleIdx >= loops) return;
    if (cycleIdx > 0) layer.innerHTML = '';
    window._particlesHideOriginal(el);
    const cycleStart = delay + cycleIdx * cycleSpan;
    for (let i = 0; i < count; i++) {
      const jitter = Math.random() * (spawnWindow / Math.max(1, count));
      spawnOne(cycleStart + (i / count) * spawnWindow + jitter);
    }
    if (loops === Infinity || cycleIdx + 1 < loops) {
      const nextStart = delay + (cycleIdx + 1) * cycleSpan;
      const tid = setTimeout(() => runCycle(cycleIdx + 1), msUntil(nextStart));
      el._particlesTimers.push(tid);
    }
  }

  runCycle(0);

  if (!el._liveAnims) el._liveAnims = [];
  const handle = { cancel: () => window._resetParticles(el) };
  el._liveAnims.push(handle);
  if (!el._liveAnimsByName) el._liveAnimsByName = {};
  el._liveAnimsByName.particles = handle;
};

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
  mirror: { engine: 'waapi', export: 'waapi' },
  recolor: { engine: 'custom', export: 'custom' },
  splitHalf: { engine: 'custom', export: 'splitHalf' },
  moveTo: { engine: 'waapi', export: 'waapi' },
  orbitTo: { engine: 'waapi', export: 'waapi' },
  dance: { engine: 'live', export: 'live' },
  swing: { engine: 'live', export: 'live' },
  float: { engine: 'live', export: 'live' },
  inkDraw: { engine: 'live', export: 'live' },
  camera: { engine: 'live', export: 'live' },
  particles: { engine: 'custom', export: 'particles' },
  typewriter: { engine: 'custom', export: 'typewriter' },
  langFade: { engine: 'custom', export: 'langFade' },
  captionSlide: { engine: 'custom', export: 'captionSlide' },
  cosmosTitle: { engine: 'custom', export: 'cosmosTitle' },
  pause: { engine: 'custom', export: 'custom' },
  animRepeat: { engine: 'custom', export: 'custom' },
  animPause: { engine: 'custom', export: 'custom' },
};

window._LIVE_LOOP_NAMES = { dance: 1, swing: 1, float: 1, inkDraw: 1 };

window._inkDrawParallelCount = function(a, total) {
  const n = Math.max(1, +total || 1);
  if (!a) return 1;
  const v = a.inkParallel;
  if (v === 0 || v === 'all') return n;
  if (v == null || v === '') return 1;
  const k = +v;
  if (!isFinite(k) || k < 1) return 1;
  return Math.max(1, Math.min(n, Math.round(k)));
};

window._animChainDuration = function(a) {
  if (!a) return 600;
  if (a.name === 'pause') return Math.max(0, +(a.duration || 0) || 0);
  if (a.name === 'captionSlide') {
    const d = +(a.duration || 600) || 600;
    const h = +(a.holdDuration || 2000) || 2000;
    return d + h + d;
  }
  if (a.name === 'cosmosTitle') return Math.max(200, +(a.duration || 4000) || 4000);
  if (a.name === 'splitHalf') return +(a.duration || 800) || 800;
  if (a.name === 'particles') {
    const _d = (typeof _ptDef === 'function' ? _ptDef() : (window.PARTICLES_DEFAULTS || { duration: 3550, ptLife: 900 }));
    const spawn = +(a.duration || _d.duration) || _d.duration;
    const life = +(a.ptLife || _d.ptLife) || _d.ptLife;
    const perLoop = spawn + life * 1.5;
    const cnt = a.swingCount != null ? a.swingCount : 1;
    const loops = window._particlesIsInfinite && window._particlesIsInfinite(a)
      ? 1
      : Math.max(1, +cnt || 1);
    return perLoop * loops;
  }
  if (a.name === 'inkDraw') {
    const per = +(a.duration || 1400) || 1400;
    const fillPart = Math.min(600, Math.max(250, per * 0.35));
    const cnt = a.swingCount != null ? a.swingCount : 1;
    const loops = (!isFinite(cnt) || cnt >= 10) ? 1 : Math.max(1, +cnt || 1);
    let nS = 2, nF = 0;
    try {
      if (typeof slides !== 'undefined' && typeof cur !== 'undefined' && slides[cur]) {
        const host = (slides[cur].els || []).find(d => d && (d.anims || []).indexOf(a) >= 0);
        if (host) {
          if (typeof splitInkForHosts === 'function') {
            const split = splitInkForHosts(slides[cur].ink || [], slides[cur].inkFills || [], [host]);
            const b = split.byHost && split.byHost[host.id];
            if (b) {
              nS = (b.strokes || []).length;
              nF = (b.fills || []).length;
            }
          } else if (host.inkIds && host.inkIds.length) {
            nS = host.inkIds.length;
          }
        }
      }
    } catch (e) {}
    const parS = window._inkDrawParallelCount(a, Math.max(1, nS));
    const parF = window._inkDrawParallelCount(a, Math.max(1, nF || 1));
    let strokeMs = nS ? Math.ceil(nS / parS) * per : 0;
    try {
      if (typeof window._inkDrawPoolMakespan === 'function' && typeof slides !== 'undefined' && typeof cur !== 'undefined' && slides[cur]) {
        const host = (slides[cur].els || []).find(d => d && (d.anims || []).indexOf(a) >= 0);
        if (host) {
          const ink = slides[cur].ink || [];
          let strokeList = [];
          if (typeof splitInkForHosts === 'function') {
            const split = splitInkForHosts(ink, slides[cur].inkFills || [], [host]);
            const b = split.byHost && split.byHost[host.id];
            if (b) strokeList = b.strokes || [];
          } else if (host.inkIds && host.inkIds.length) {
            const set = new Set(host.inkIds);
            strokeList = ink.filter(s => s && set.has(s.id));
          }
          if (strokeList.length) strokeMs = window._inkDrawPoolMakespan(strokeList, parS, per);
        }
      }
    } catch (e) {}
    const fillMs = nF ? Math.ceil(nF / parF) * fillPart : 0;
    return Math.max(per, strokeMs + fillMs + 80) * loops;
  }
  if (a.name === 'camera') return +(a.duration || 1200) || 1200;
  if (a.name === 'typewriter') {
    const cd = a.charDelay || 40;
    const fromLen = (a.fromHtml || '').replace(/<[^>]*>/g, '').length;
    const toLen = (a.toHtml || '').replace(/<[^>]*>/g, '').length;
    return (fromLen + toLen) * cd + 200;
  }
  if (a.name === 'langFade') return +(a.duration || 800) || 800;
  return a.duration || 600;
};

window._animEffTrigger = function(gList) {
  let lastTrig = 'auto', lastRes = 'auto';
  return gList.map(item => {
    const t = item.a.trigger || 'auto';
    if (t === 'element') { lastTrig = 'auto'; lastRes = 'element'; return 'element'; }
    if (t === 'counter') { lastTrig = 'auto'; lastRes = 'counter'; return 'counter'; }
    if (t === 'timer') { lastTrig = 'auto'; lastRes = 'timer'; return 'timer'; }
    if (t === 'nav') { lastTrig = 'auto'; lastRes = 'nav'; return 'nav'; }
    if (t === 'click') { lastTrig = 'click'; lastRes = 'click'; return 'click'; }
    if (t === 'withPrev') return lastRes;
    if (lastTrig === 'click') return 'autoAfter';
    lastTrig = 'auto'; lastRes = 'auto';
    return 'auto';
  });
};

window._ANIM_TL_CAM_PREFIX = '__cam_';
window._animIsCameraEntry = function(d, a) {
  return !!(d && (d._isCamera || d.type === 'camera' || (a && a.name === 'camera')));
};
window._animTlIsCam = function(elId) {
  return typeof elId === 'string' && elId.indexOf(window._ANIM_TL_CAM_PREFIX) === 0;
};
window._animTlCamId = function(elId) {
  return window._animTlIsCam(elId) ? elId.slice(window._ANIM_TL_CAM_PREFIX.length) : '';
};
window._animTlCamElId = function(camId) {
  return window._ANIM_TL_CAM_PREFIX + camId;
};
window._animTlAiOf = function(d, a) {
  if (!d) return 0;
  if (d._isCamera || d.type === 'camera') return 0;
  const i = (d.anims || []).indexOf(a);
  return i < 0 ? 0 : i;
};
window._animTlFindRecord = function(slide, elId, ai) {
  if (!slide || elId == null) return null;
  if (window._animTlIsCam(elId)) {
    const id = window._animTlCamId(elId);
    return (slide.cameras || []).find(c => c && c.id === id) || null;
  }
  const d = slide.els && slide.els.find(x => x.id === elId);
  return (d && d.anims && d.anims[ai]) || null;
};
window._animTlRecordAsAnim = function(slide, elId, ai) {
  const rec = window._animTlFindRecord(slide, elId, ai);
  if (!rec) return null;
  if (window._animTlIsCam(elId)) {
    if (typeof window._cameraAnimFromCam === 'function') return window._cameraAnimFromCam(rec);
    return {
      name: 'camera', cat: 'live',
      duration: rec.duration || 1200, delay: rec.delay || 0,
      trigger: rec.trigger || 'auto', tlLane: rec.tlLane, camId: rec.id
    };
  }
  return rec;
};
window._animTlOrderEntry = function(elId, ai) {
  if (window._animTlIsCam(elId)) return { kind: 'camera', camId: window._animTlCamId(elId) };
  return { elId: elId, ai: ai };
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
  const absStarts = window._computeAnimAbsStarts(slide, gList);
  const absStartMap = new Map();
  absStarts.forEach(s => { if (!s.skip) absStartMap.set(s.elId + ':' + s.ai, s.abs); });
  gList.forEach((item, gi) => {
    const d = item.d, a = item.a, eff = gEffTrig[gi];
    const ai = window._animTlAiOf(d, a);
    if ((a && a.name === 'pause') || (d && d._isPause)) {
      const abs = absStartMap.has(d.id + ':' + ai) ? absStartMap.get(d.id + ':' + ai) : (a.delay || 0);
      const gPD = window._animChainDuration(a);
      autoSegments.push({ d, a, absDelay: abs, dur: gPD });
      return;
    }
    if (eff === 'element' || eff === 'nav' || eff === 'counter' || eff === 'timer') return;
    if ((a.trigger || 'auto') === 'element' || (a.trigger || 'auto') === 'nav' || (a.trigger || 'auto') === 'click' || (a.trigger || 'auto') === 'counter' || (a.trigger || 'auto') === 'timer') return;
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
  if (!slide) return { totalMs: 800, segments: [], laneCount: 1, repeatBands: [] };
  if (typeof window._ensureAnimOrder === 'function') window._ensureAnimOrder(slide);
  (slide.cameras || []).forEach(c => {
    if (c && c.trigger === 'withPrev') c.trigger = 'auto';
  });
  const info = typeof ANIM_INFO !== 'undefined' ? ANIM_INFO : {};
  const gList = window._animTimelineGList(slide);
  const gEffTrig = window._animEffTrigger(gList);
  const absStarts = window._computeAnimAbsStarts(slide, gList);
  const absStartMap = new Map();
  absStarts.forEach(s => { if (!s.skip) absStartMap.set(s.elId + ':' + s.ai, s.abs); });
  const segments = [];
  let gPS = 0, gPD = 0;
  let autoEnd = 0;

  const entries = [];
  let camSeq = 0;
  gList.forEach((item, gIdx) => {
    const d = item.d, a = item.a;
    if (!d || !a || d._isDecor) return;
    const ai = window._animTlAiOf(d, a);
    const isCamera = window._animIsCameraEntry(d, a);
    if (isCamera) camSeq += 1;
    entries.push({ d, a, ai, isCamera, camNum: isCamera ? camSeq : 0, gIdx });
  });

  const _overlap = (a, b) => a.absDelay < b.absDelay + b.dur && b.absDelay < a.absDelay + a.dur;

  entries.forEach(({ d, a, ai, isCamera, camNum, gIdx }) => {
    const gi = gList.findIndex(item => item.d.id === d.id && item.a === a);
    const eff = gi >= 0 ? gEffTrig[gi] : 'auto';
    const trigger = a.trigger || 'auto';
    if (trigger === 'element' || trigger === 'nav' || trigger === 'counter' || trigger === 'timer' || eff === 'nav') return;

    const dur = window._animChainDuration(a);
    const cat = (info[a.name] && info[a.name].cat) || a.cat || 'entrance';
    const label = isCamera ? ('Камера' + (camNum ? ' ' + camNum : ''))
      : (a.name === 'pause' ? 'Пауза' : ((info[a.name] && info[a.name].label) || a.name));
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
      if ((a.trigger || 'auto') === 'withPrev' && !isCamera) {
        gPD = Math.max(gPS + gPD, absDelay + dur) - gPS;
      } else {
        gPS = absDelay;
        gPD = dur;
      }
      autoEnd = Math.max(autoEnd, absDelay + dur);
    }

    segments.push({
      elId: d.id, ai, anim: a, absDelay, dur, cat, label, trigger, isClick, lane: 0,
      isCamera: !!isCamera, camId: isCamera ? (a.camId || d.camId) : null,
      gIdx: gIdx
    });
  });

  // Click segments: place after everything before them in order (not stale autoEnd)
  let runEnd = 0;
  segments.forEach(seg => {
    if (seg.isClick) {
      seg.absDelay = runEnd + (seg.anim.delay || 0);
    } else {
      runEnd = Math.max(runEnd, seg.absDelay + seg.dur);
    }
  });

  // Cameras share one lane. Click cameras are skipped by the auto chain, so they
  // get the same absDelay as the next auto camera and paint as one bar.
  let camT = 0;
  segments.forEach(seg => {
    if (!seg.isCamera) return;
    if (seg.absDelay < camT) seg.absDelay = camT;
    camT = Math.max(camT, seg.absDelay + seg.dur);
  });

  let cameraLane = null;
  segments.forEach((seg, si) => {
    const laneTaken = (lane) => segments.some((s, j) => j < si && s.lane === lane && _overlap(seg, s));
    // Cameras cannot run in parallel — keep them on one sequential track
    if (seg.isCamera) {
      if (cameraLane == null) {
        const manual = seg.anim && seg.anim.tlLane;
        cameraLane = (manual != null && manual >= 0 && !isNaN(+manual)) ? +manual : 0;
        while (laneTaken(cameraLane)) cameraLane++;
      }
      seg.lane = cameraLane;
      return;
    }
    // withPrev starts with the previous anim — put it on the next free row, never on top of it
    if (seg.trigger === 'withPrev' && si > 0) {
      let lane = segments[si - 1].lane + 1;
      while (laneTaken(lane)) lane++;
      seg.lane = lane;
      return;
    }
    const manualLane = seg.anim && seg.anim.tlLane;
    if (manualLane != null && manualLane >= 0 && !isNaN(+manualLane) && !laneTaken(+manualLane)) {
      seg.lane = +manualLane;
      return;
    }
    let lane = 0;
    while (laneTaken(lane)) lane++;
    if (si > 0 && segments[si - 1].trigger !== 'withPrev') {
      lane = Math.max(lane, segments[si - 1].lane + 1);
    }
    while (laneTaken(lane)) lane++;
    seg.lane = lane;
  });

  // Repeat bands: one cycle of children on the scale; gray region is ×count wide.
  // Items after the block (e.g. pause between two repeats) must start after the full band.
  const rawBands = (gList._repeatBands || []).slice().sort((a, b) => a.startIdx - b.startIdx);
  const repeatBands = [];
  rawBands.forEach(band => {
    const count = Math.max(1, +(band.count || 1));
    const members = segments.filter(s => s.gIdx >= band.startIdx && s.gIdx < band.endIdx);
    if (!members.length) return;
    let cycleStart = Infinity;
    let cycleEnd = 0;
    members.forEach(s => {
      cycleStart = Math.min(cycleStart, s.absDelay);
      cycleEnd = Math.max(cycleEnd, s.absDelay + s.dur);
      if (!s._inRepeatBands) s._inRepeatBands = new Set();
      s._inRepeatBands.add(band.id);
    });
    if (!isFinite(cycleStart)) return;
    const cycleDur = Math.max(0, cycleEnd - cycleStart);
    const extra = cycleDur * (count - 1);
    const bandEnd = cycleStart + cycleDur * count;
    if (extra > 0) {
      segments.forEach(s => {
        if (s._inRepeatBands && s._inRepeatBands.has(band.id)) return;
        if (s.gIdx >= band.endIdx || s.absDelay >= cycleEnd - 0.01) {
          s.absDelay += extra;
        }
      });
    }
    // Anything still overlapping the repeated span (pause between repeats, etc.) → after the band
    const foreigners = segments
      .filter(s => !(s._inRepeatBands && s._inRepeatBands.has(band.id)))
      .filter(s => s.absDelay < bandEnd && (s.absDelay + s.dur) > cycleStart)
      .sort((a, b) => (a.gIdx - b.gIdx) || (a.absDelay - b.absDelay));
    let t = bandEnd;
    foreigners.forEach(s => {
      if (s.absDelay < t) s.absDelay = t;
      t = Math.max(t, s.absDelay + s.dur);
    });
    repeatBands.push({
      id: band.id,
      count,
      absDelay: cycleStart,
      dur: cycleDur * count,
      cycleDur,
      label: '×' + count
    });
  });
  repeatBands.sort((a, b) => a.absDelay - b.absDelay || b.dur - a.dur);

  const laneCount = segments.length ? Math.max(...segments.map(s => s.lane)) + 1 : 1;
  const contentMs = segments.reduce((m, s) => Math.max(m, s.absDelay + s.dur), 0);
  const bandMs = repeatBands.reduce((m, b) => Math.max(m, b.absDelay + b.dur), 0);
  const totalMs = Math.max(contentMs, bandMs) + 400;
  return { totalMs: Math.max(totalMs, 800), segments, laneCount, repeatBands };
};

window._refreshAnimTimeline = function() {
  if (typeof slides === 'undefined' || typeof cur === 'undefined') return;
  if (typeof window.renderAnimTimelineBar === 'function') window.renderAnimTimelineBar(slides[cur]);
};

window._alignAnimWithPrev = function(slide, elId, ai) {
  const a = window._animTlRecordAsAnim(slide, elId, ai);
  if (!a) return;
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
  return t !== 'element' && t !== 'nav' && t !== 'click' && t !== 'counter' && t !== 'timer';
};

window._computeAnimAbsStarts = function(slide, gList) {
  if (typeof window._ensureAnimOrder === 'function') window._ensureAnimOrder(slide);
  if (!gList) {
    gList = typeof window._buildSlideAnimGlobalList === 'function'
      ? window._buildSlideAnimGlobalList(slide).map(({ d, a }) => ({ d, a }))
      : window._animTimelineGList(slide);
  }
  const out = [];
  let chainPS = 0, chainPD = 0;
  let prevTimedStart = 0;
  gList.forEach(({ d, a }) => {
    const ai = window._animTlAiOf(d, a);
    if (!window._isTimedAnimEntry(a)) {
      out.push({ elId: d.id, ai, skip: true, abs: null });
      return;
    }
    const isCam = window._animIsCameraEntry(d, a);
    let t = a.trigger || 'auto';
    if (isCam && t === 'withPrev') t = 'auto';
    const rd = a.delay || 0;
    let abs;
    const _il = !!window._LIVE_LOOP_NAMES[a.name];
    if (t === 'withPrev') abs = prevTimedStart + rd;
    else if (chainPS === 0 && chainPD === 0) abs = rd;
    else if (_il && t === 'auto') abs = chainPS + chainPD + rd;
    else abs = chainPS + chainPD + rd;
    out.push({ elId: d.id, ai, skip: false, abs });
    const dur = window._animChainDuration(a);
    if (t === 'withPrev') {
      // Параллельно с предыдущей — ждём самую длинную из группы
      chainPD = Math.max(chainPS + chainPD, abs + dur) - chainPS;
      prevTimedStart = abs;
    } else {
      prevTimedStart = abs;
      chainPS = abs;
      chainPD = dur;
    }
  });
  return out;
};

window._getPrevTimedAnimStart = function(slide, elId, ai) {
  const starts = window._computeAnimAbsStarts(slide, window._animTimelineGList(slide));
  let prev = 0;
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    if (s.elId === elId && s.ai === ai) return prev;
    if (!s.skip) prev = s.abs;
  }
  return prev;
};

window._getAnimAbsStart = function(slide, elId, ai) {
  const s = window._computeAnimAbsStarts(slide, window._animTimelineGList(slide))
    .find(x => x.elId === elId && x.ai === ai);
  return s && !s.skip ? s.abs : 0;
};

window._baseElTransform = function(d, el) {
  const rot = (d && d.rot) || (el && el.dataset.rot ? +el.dataset.rot : 0) || 0;
  const flipH = !!(d && d.shapeFlipH) || (el && el.dataset && el.dataset.shapeFlipH === 'true');
  const flipV = !!(d && d.shapeFlipV) || (el && el.dataset && el.dataset.shapeFlipV === 'true');
  let tf = rot ? 'rotate(' + rot + 'deg)' : '';
  if (flipH || flipV) {
    tf += (tf ? ' ' : '') + 'scale(' + (flipH ? -1 : 1) + ',' + (flipV ? -1 : 1) + ')';
  }
  return tf;
};

function _elHasBackdropBlur(el, d) {
  if (!el) return false;
  d = d || {};
  const elType = _cssAnimElType(el, d);
  if ((elType === 'text' || elType === 'markdown') && +(d.textBgBlur || el.dataset.textBgBlur || 0) > 0) return true;
  if (elType === 'shape' && +(d.shapeBlur || el.dataset.shapeBlur || 0) > 0) return true;
  if (el.querySelector('.el-bg-layer')) return true;
  if (el.querySelector('.shape-blur-overlay')) return true;
  if (el.querySelector('.psel-txt') && +(d.textBgBlur || el.dataset.textBgBlur || 0) > 0) return true;
  const first = el.firstElementChild;
  if (first && first.style && (first.style.backdropFilter || first.style.webkitBackdropFilter)) return true;
  return false;
}

window._revealBackdropBlurLayers = function(el, d) {
  if (!el) return;
  d = d || {};
  const elType = _cssAnimElType(el, d);
  el.querySelectorAll('.el-bg-layer').forEach(layer => {
    layer.style.opacity = '';
    layer.style.visibility = 'visible';
    layer.style.animation = '';
  });
  el.querySelectorAll('.shape-blur-overlay').forEach(ov => {
    ov.style.opacity = '';
    ov.style.visibility = 'visible';
    ov.style.animation = '';
  });
  if ((elType === 'text' || elType === 'markdown') && +(d.textBgBlur || el.dataset.textBgBlur || 0) > 0) {
    const ptxt = el.querySelector('.psel-txt');
    if (ptxt) {
      ptxt.style.opacity = '';
      ptxt.style.visibility = 'visible';
      ptxt.style.animation = '';
    }
  }
  if (elType === 'shape' && +(d.shapeBlur || el.dataset.shapeBlur || 0) > 0) {
    const ec = el.querySelector('.ec');
    const first = el.firstElementChild;
    if (first && first !== ec && (first.style.backdropFilter || first.style.webkitBackdropFilter)) {
      first.style.opacity = '';
      first.style.visibility = 'visible';
      first.style.animation = '';
    }
  }
};

window._cssAnimBgLayers = function(el, d) {
  if (!el) return [];
  d = d || {};
  const elType = _cssAnimElType(el, d);
  const layers = [];
  if (elType === 'text' || elType === 'markdown') {
    el.querySelectorAll(':scope > .el-bg-layer').forEach(l => {
      if (l.parentNode === el) layers.push(l);
    });
  } else if (elType === 'shape') {
    const ov = el.querySelector('.shape-blur-overlay');
    if (ov) layers.push(ov);
    const ec = el.querySelector('.ec');
    const first = el.firstElementChild;
    if (first && first !== ec && (first.style.backdropFilter || first.style.webkitBackdropFilter)) layers.push(first);
  }
  return layers;
};

window._applyCssAnim = function(el, d, a, overrideDelay) {
  if (!el || !a) return;
  const cssName = (typeof ANIM_CSS !== 'undefined' && ANIM_CSS[a.name]) ? ANIM_CSS[a.name] : 'el-fadein';
  const dur = (a.duration || 600) / 1000;
  const delay = typeof overrideDelay === 'number' ? overrideDelay / 1000 : (a.delay || 0) / 1000;
  const animCss = `${cssName} ${dur}s ease-out ${delay}s both`;
  const targets = window._cssAnimTargets(el, d, a);
  const bgLayers = window._cssAnimBgLayers(el, d);
  targets.forEach(t => { t.style.animation = ''; });
  bgLayers.forEach(t => { t.style.animation = ''; });
  if (a.cat === 'entrance' && typeof window._revealBackdropBlurLayers === 'function') {
    window._revealBackdropBlurLayers(el, d);
  }
  requestAnimationFrame(() => {
    targets.forEach(t => { t.style.animation = animCss; });
    bgLayers.forEach(t => { t.style.animation = animCss; });
  });
  return { targets, bgLayers, animCss };
};

function _cssAnimElType(el, d) {
  return (d && d.type) || (el && el.dataset && el.dataset.type) || '';
}

window._cssAnimTargets = function(el, d, a) {
  if (!el) return [el];
  d = d || null;
  const elType = _cssAnimElType(el, d);

  if (elType === 'text' || elType === 'markdown') {
    if (typeof window._isTextBlock === 'function' && window._isTextBlock(el) && typeof window._ensureTextBodyWrap === 'function') {
      return [window._ensureTextBodyWrap(el)];
    }
    return [el.querySelector('._text_body') || el.querySelector('.ec') || el.querySelector('.psel-txt') || el];
  }

  if (elType === 'shape' && _elHasBackdropBlur(el, d || { type: elType })) {
    const ec = el.querySelector('.ec');
    return ec ? [ec] : [el];
  }

  const cat = a && a.cat;
  const isEmphasis = cat === 'emphasis';
  if (isEmphasis) {
    const ec = el.querySelector('.ec');
    return ec ? [ec] : [el];
  }
  if (cat === 'entrance' || cat === 'exit') {
    const ec = el.querySelector('.ec');
    return ec ? [ec] : [el];
  }
  return [el];
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
  const nodes = [el, el.querySelector('._text_body'), el.querySelector('.ec'), el.querySelector('.tel'), el.querySelector('.iel'), el.querySelector('.shape-text'), el.querySelector('._dance_wrap'), el.querySelector('._float_wrap'), el.querySelector('._swing_wrap'), el.querySelector('.el-bg-layer'), el.querySelector('.shape-blur-overlay'), el.querySelector('.psel-txt')];
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
  if (typeof window._resetCosmosTitleAnim === 'function') window._resetCosmosTitleAnim(el);
  if (typeof window._resetSplitHalf === 'function') window._resetSplitHalf(el, true);
  if (typeof window._resetRecolor === 'function') window._resetRecolor(el);
  if (typeof window._resetLiveAnimPreview === 'function') window._resetLiveAnimPreview(el, true);
  if (typeof window._resetParticles === 'function') window._resetParticles(el);
  if (typeof window._resetInkDrawAnim === 'function') window._resetInkDrawAnim(el);
  el.classList.remove('has-particles');
  if (el.dataset.type === 'text' && typeof window._restoreTextBlockVisuals === 'function') window._restoreTextBlockVisuals(el);
  else if (el.dataset.type === 'text' && typeof applyTextRadius === 'function') applyTextRadius(el);
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

window._clearAnimTlInsertPreview = function() {
  document.querySelectorAll('.anim-tl-seg.anim-tl-seg-gap-shift').forEach(dom => {
    dom.classList.remove('anim-tl-seg-gap-shift');
    dom.style.transform = '';
  });
};

window._computeAnimTlInsertShifts = function(onLane, insertStartMs, insertDurMs) {
  const insertEnd = insertStartMs + insertDurMs;
  const shifts = new Map();
  (onLane || []).forEach(s => shifts.set(window._animTlKey(s.elId, s.ai), 0));
  if (!onLane || !onLane.length || insertDurMs <= 0) return shifts;
  const key = s => window._animTlKey(s.elId, s.ai);
  const getStart = s => s.absDelay + (shifts.get(key(s)) || 0);
  const getEnd = s => getStart(s) + s.dur;
  let guard = onLane.length * 6 + 8;
  while (guard-- > 0) {
    let changed = false;
    for (const s of onLane) {
      const sStart = getStart(s);
      const sEnd = getEnd(s);
      if (insertStartMs < sEnd - 0.5 && insertEnd > sStart + 0.5) {
        const need = insertEnd - sStart;
        if (need > (shifts.get(key(s)) || 0) + 0.5) {
          shifts.set(key(s), need);
          changed = true;
        }
      }
    }
    const sorted = [...onLane].sort((a, b) => getStart(a) - getStart(b) || a.ai - b.ai);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const aEnd = getEnd(a);
      const bStart = getStart(b);
      if (aEnd > bStart + 0.5) {
        const need = (shifts.get(key(b)) || 0) + (aEnd - bStart);
        if (need > (shifts.get(key(b)) || 0) + 0.5) {
          shifts.set(key(b), need);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return shifts;
};

window._updateAnimTlInsertPreview = function(segments, lane, insertStartMs, insertDurMs, excludeKeys, pxMs, tracksEl) {
  window._clearAnimTlInsertPreview();
  if (!tracksEl || insertDurMs <= 0 || lane == null || lane < 0) return;
  const onLane = (segments || [])
    .filter(s => s.lane === lane && !excludeKeys.has(window._animTlKey(s.elId, s.ai)))
    .sort((a, b) => a.absDelay - b.absDelay || a.ai - b.ai);
  const shifts = window._computeAnimTlInsertShifts(onLane, insertStartMs, insertDurMs);
  shifts.forEach((shiftMs, k) => {
    if (shiftMs < 0.5) return;
    const ci = k.indexOf(':');
    const elId = k.slice(0, ci);
    const ai = k.slice(ci + 1);
    const dom = tracksEl.querySelector('.anim-tl-seg[data-el-id="' + elId + '"][data-ai="' + ai + '"]');
    if (!dom) return;
    dom.classList.add('anim-tl-seg-gap-shift');
    dom.style.transform = 'translateX(' + (shiftMs * pxMs) + 'px)';
  });
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
    const autoList = autoMap[d.id];
    const hasCosmosAuto = autoList && autoList.some(x => x.anim && x.anim.name === 'cosmosTitle');
    if (hasCosmosAuto || (autoList && autoList[0] && (autoList[0].anim.name === 'captionSlide' || autoList[0].anim.name === 'cosmosTitle'))) {
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
      if (autoList[0] && autoList[0].anim.name === 'captionSlide') el.classList.add('has-caption');
    }
    const deferCap = typeof window._captionAnimDeferredByTrigger === 'function'
      ? window._captionAnimDeferredByTrigger(d.anims) : null;
    if (deferCap && typeof window._hideCaptionUntilTrigger === 'function') {
      window._hideCaptionUntilTrigger(el, d, deferCap);
    }
  });
  Object.keys(autoMap).forEach(elId => {
    if (window._animTlIsCam && window._animTlIsCam(elId)) return;
    const d = s.els.find(x => x.id === elId);
    const el = cv.querySelector('.el[data-id="' + elId + '"]');
    if (!d || !el) return;
    autoMap[elId].forEach(({ anim: a, absDelay }) => {
      if (a.name === 'captionSlide' || a.name === 'cosmosTitle') captionQueue.push({ d, a, absDelay });
      else window._trackSlideAnimTimeout(() => {
        if (!window._slideAnimPlaying || playGen !== window._slideAnimPlayGen) return;
        fireAnim(el, d, a, slideIdx != null ? slideIdx : cur, 0);
      }, absDelay);
    });
  });
  if (captionQueue.length) {
    // Скрыть всех участников групп с cosmos до старта — без мигания исходной позиции
    const seenHide = {};
    captionQueue.forEach(({ d, a }) => {
      if (!a || a.name !== 'cosmosTitle' || !d) return;
      const members = d.groupId ? s.els.filter(x => x.groupId === d.groupId) : [d];
      const gk = d.groupId || d.id;
      if (seenHide[gk]) return;
      seenHide[gk] = 1;
      members.forEach(md => {
        const mel = cv.querySelector('.el[data-id="' + md.id + '"]');
        if (!mel) return;
        mel.style.visibility = 'hidden';
        mel.style.pointerEvents = 'none';
      });
    });
    window._trackSlideAnimTimeout(() => {
      if (!window._slideAnimPlaying || playGen !== window._slideAnimPlayGen) return;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const seen = {};
        captionQueue.forEach(({ d, a, absDelay }) => {
          const isCosmos = a && a.name === 'cosmosTitle';
          if (d.groupId) {
            const members = s.els.filter(x => x.groupId === d.groupId);
            let leader = d;
            for (let i = 0; i < s.els.length; i++) {
              if (members.some(m => m.id === s.els[i].id)) { leader = s.els[i]; break; }
            }
            if (d.id !== leader.id) return;
            const key = d.groupId + '|' + absDelay + '|' + (a.name || 'captionSlide');
            if (seen[key]) return;
            seen[key] = 1;
            const entries = members.map(md => {
              const mel = cv.querySelector('.el[data-id="' + md.id + '"]');
              return mel ? { el: mel, d: md, x: md.x || 0, y: md.y || 0, w: md.w || 200, h: md.h || 200 } : null;
            }).filter(Boolean);
            if (!entries.length) return;
            if (isCosmos) {
              if (typeof window._fireCosmosTitleAnimGroup === 'function') {
                window._fireCosmosTitleAnimGroup(entries, a, 0, { hideAfter: false });
              }
            } else if (typeof window._fireCaptionSlideAnimGroup === 'function') {
              window._fireCaptionSlideAnimGroup(entries, a, 0, { hideAfter: false });
            }
          } else {
            const mel = cv.querySelector('.el[data-id="' + d.id + '"]');
            if (!mel) return;
            if (isCosmos) {
              if (typeof window._fireCosmosTitleAnim === 'function') {
                window._fireCosmosTitleAnim(mel, a, 0, d.w, d.h, { hideAfter: false });
              }
            } else if (typeof window._fireCaptionSlideAnim === 'function') {
              window._fireCaptionSlideAnim(mel, a, 0, d.w, d.h, { hideAfter: false });
            }
          }
        });
      }));
    }, Math.min.apply(null, captionQueue.map(q => q.absDelay)));
  }
  const _hasInfParticles = s.els.some(d => (d.anims || []).some(a =>
    a && a.name === 'particles' && window._particlesIsInfinite && window._particlesIsInfinite(a)
  ));
  if (!_hasInfParticles) {
    window._slideAnimPlayTimer = setTimeout(() => {
      window.stopSlideAnimsOnCanvas();
    }, Math.max(totalMs, 300) + 250);
  }
  window._startAnimTimelinePlayhead(Math.max(totalMs, 300) + 250);
  return true;
};

window._animTimelineGList = function(slide) {
  if (typeof window._buildSlideAnimGlobalList === 'function') {
    const built = window._buildSlideAnimGlobalList(slide, { timeline: true });
    const gList = built.map(({ d, a }) => ({ d, a }));
    gList._repeatBands = built._repeatBands || [];
    return gList;
  }
  const gList = [];
  if (!slide || !slide.els) return gList;
  slide.els.forEach(d => {
    if (d._isDecor) return;
    (d.anims || []).forEach(a => gList.push({ d, a }));
  });
  gList._repeatBands = [];
  return gList;
};

window._timelineOverlap = function(a, b) {
  return a.absDelay < b.absDelay + b.dur && b.absDelay < a.absDelay + a.dur;
};

window._animTlSel = window._animTlSel || new Set();
window._animTlKey = function(elId, ai) { return elId + ':' + ai; };

window._animTlClearSel = function() {
  window._animTlSel.clear();
  if(typeof window._syncAnimPropsLayout==='function') window._syncAnimPropsLayout();
  if(typeof window._syncAnimListHighlightFromTimeline==='function') window._syncAnimListHighlightFromTimeline();
};

window._animTlToggleSel = function(elId, ai) {
  const k = window._animTlKey(elId, ai);
  if (window._animTlSel.has(k)) window._animTlSel.delete(k);
  else window._animTlSel.add(k);
  if(typeof window._syncAnimPropsLayout==='function') window._syncAnimPropsLayout();
  if(typeof window._syncAnimListHighlightFromTimeline==='function') window._syncAnimListHighlightFromTimeline({scroll:true});
};

window._animTlSetSel = function(elId, ai) {
  window._animTlSel.clear();
  window._animTlSel.add(window._animTlKey(elId, ai));
  if(typeof window._syncAnimPropsLayout==='function') window._syncAnimPropsLayout();
  if(typeof window._syncAnimListHighlightFromTimeline==='function') window._syncAnimListHighlightFromTimeline({scroll:true});
};

window._pickElForAnimTl = function(elId) {
  if (!elId) return;
  if (window._animTlIsCam && window._animTlIsCam(elId)) {
    if (typeof window._syncAnimListHighlightFromTimeline === 'function') {
      window._syncAnimListHighlightFromTimeline({scroll:true});
    }
    return;
  }
  if (typeof pick !== 'function') return;
  const cv = document.getElementById('canvas');
  const dom = cv && cv.querySelector('.el[data-id="' + elId + '"]');
  if (dom) pick(dom);
};

window._openAnimTlCtxMenu = function(ev) {
  if (!window._animTlSel || !window._animTlSel.size) return;
  const tr = typeof t === 'function' ? t : k => k;
  const count = window._animTlSel.size;
  const label = count > 1
    ? tr('ctxDeleteSlidesN').replace('{n}', String(count))
    : tr('btnDelete');
  const icon = typeof _SLIDE_CTX_ICONS !== 'undefined'
    ? _SLIDE_CTX_ICONS.del
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';
  if (typeof _showSlideCtxMenu === 'function') {
    _showSlideCtxMenu(ev.clientX, ev.clientY, [{
      icon,
      label,
      warn: true,
      action: () => {
        if (typeof window.removeAnimTlSelection === 'function') window.removeAnimTlSelection();
      }
    }]);
  }
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
    const t = (anim && anim.trigger) || 'auto';
    return t === 'element' || t === 'nav' || t === 'click' || t === 'counter' || t === 'timer';
  };
  segs.sort((x, y) => x.absDelay - y.absDelay || x.lane - y.lane || String(x.elId).localeCompare(String(y.elId)) || x.ai - y.ai);
  slide.animOrder = segs.map(s => window._animTlOrderEntry(s.elId, s.ai));
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const rec = window._animTlFindRecord(slide, s.elId, s.ai);
    const anim = window._animTlRecordAsAnim(slide, s.elId, s.ai);
    if (!rec || !anim) continue;
    rec.tlLane = s.lane;
    if (_skipTrig(anim)) continue;
    const sIsCam = window._animTlIsCam(s.elId) || (anim && anim.name === 'camera');
    if (sIsCam) {
      if (rec.trigger === 'withPrev') rec.trigger = 'auto';
      continue;
    }
    let parallel = false;
    for (let j = 0; j < i; j++) {
      const p = segs[j];
      if (p.lane === s.lane) continue;
      if (_ov(s, p)) { parallel = true; break; }
    }
    rec.trigger = parallel ? 'withPrev' : 'auto';
  }
  let gPS = 0, gPD = 0;
  let prevTimedStart = 0;
  segs.forEach(s => {
    const rec = window._animTlFindRecord(slide, s.elId, s.ai);
    const anim = window._animTlRecordAsAnim(slide, s.elId, s.ai);
    if (!rec || !anim) return;
    const t = rec.trigger || 'auto';
    if (t === 'element' || t === 'nav' || t === 'click' || t === 'counter' || t === 'timer') return;
    if (t === 'withPrev') rec.delay = Math.max(0, s.absDelay - prevTimedStart);
    else if (gPS === 0 && gPD === 0) rec.delay = Math.max(0, s.absDelay);
    else rec.delay = Math.max(0, s.absDelay - gPS - gPD);
    const rd = rec.delay || 0;
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
    const rec = window._animTlFindRecord(slide, u.elId, u.ai);
    if (rec) rec.tlLane = Math.max(0, Math.round(u.lane));
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
  const rec = window._animTlFindRecord(slide, elId, ai);
  const anim = window._animTlRecordAsAnim(slide, elId, ai);
  if (!rec || !anim) return;
  lane = Math.max(0, Math.round(lane));
  rec.tlLane = lane;
  const tl = window.computeSlideAnimTimeline(slide);
  const dur = window._animChainDuration(anim);
  const segs = tl.segments.map(s => (
    s.elId === elId && s.ai === ai ? { ...s, absDelay: Math.max(0, Math.round(targetAbs)), lane, dur } : { ...s }
  ));
  window._snapTimelineSegOnLane(segs, elId, ai);
  window._applyTimelineSegments(slide, segs);
};

window._setAnimAbsDelay = function(slide, elId, ai, targetAbs) {
  const rec = window._animTlFindRecord(slide, elId, ai);
  const a = window._animTlRecordAsAnim(slide, elId, ai);
  if (!rec || !a) return;
  targetAbs = Math.max(0, Math.round(targetAbs));
  const trigger = rec.trigger || a.trigger || 'auto';
  if (trigger === 'withPrev') {
    rec.delay = Math.max(0, targetAbs - window._getPrevTimedAnimStart(slide, elId, ai));
    return;
  }
  const starts = window._computeAnimAbsStarts(slide, window._animTimelineGList(slide));
  let prevEnd = 0;
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    if (s.elId === elId && s.ai === ai) break;
    if (s.skip) continue;
    const pa = window._animTlRecordAsAnim(slide, s.elId, s.ai);
    if (!pa) continue;
    prevEnd = s.abs + window._animChainDuration(pa);
  }
  rec.delay = Math.max(0, targetAbs - prevEnd);
};

window._setAnimDurationFromTimeline = function(slide, elId, ai, newDur) {
  const rec = window._animTlFindRecord(slide, elId, ai);
  const a = window._animTlRecordAsAnim(slide, elId, ai);
  if (!rec || !a) return;
  newDur = Math.max(50, Math.round(newDur));
  if (a.name === 'captionSlide') {
    const old = window._animChainDuration(a);
    const dIn = +(rec.duration || 600) || 600;
    const hold = +(rec.holdDuration || 2000) || 2000;
    const ratio = old > 0 ? newDur / old : 1;
    rec.duration = Math.max(50, Math.round(dIn * ratio));
    rec.holdDuration = Math.max(0, Math.round(hold * ratio));
  } else {
    rec.duration = newDur;
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
  if (typeof renderCameraOverlay === 'function') renderCameraOverlay();
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

window._setAnimTabActive = function(active) {
  document.body.classList.toggle('anim-tab-active', !!active);
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
    tracks.style.height = Math.max(tracksH, 22) + 'px';
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
  (tl.repeatBands || []).forEach(band => {
    if (!band || !(band.dur > 0)) return;
    const bandEl = document.createElement('div');
    bandEl.className = 'anim-tl-repeat-band';
    bandEl.style.left = (band.absDelay * pxMs) + 'px';
    bandEl.style.width = Math.max(8, band.dur * pxMs) + 'px';
    bandEl.style.top = '0';
    bandEl.style.height = tracksH + 'px';
    bandEl.dataset.blockId = band.id || '';
    bandEl.title = 'Повторение ' + (band.label || ('×' + band.count));
    if (band.count > 1 && band.cycleDur > 0) {
      for (let k = 1; k < band.count; k++) {
        const div = document.createElement('div');
        div.className = 'anim-tl-repeat-band-div';
        div.style.left = (band.cycleDur * k * pxMs) + 'px';
        bandEl.appendChild(div);
      }
    }
    const bandLbl = document.createElement('span');
    bandLbl.className = 'anim-tl-repeat-band-label';
    bandLbl.textContent = band.label || ('×' + band.count);
    if (band.count > 1 && band.cycleDur > 0) {
      bandLbl.style.left = Math.max(4, band.cycleDur * pxMs + 4) + 'px';
      bandLbl.style.right = 'auto';
    }
    bandEl.appendChild(bandLbl);
    tracks.appendChild(bandEl);
  });
  tl.segments.forEach(seg => {
    const el = document.createElement('div');
    el.className = 'anim-tl-seg anim-tl-' + seg.cat + (seg.isClick ? ' is-click' : '') + (seg.isCamera ? ' anim-tl-camera' : '');
    el.style.left = (seg.absDelay * pxMs) + 'px';
    el.style.width = Math.max(6, seg.dur * pxMs) + 'px';
    el.style.top = (seg.lane * laneH + segPad) + 'px';
    el.style.height = segH + 'px';
    el.dataset.elId = seg.elId;
    el.dataset.ai = String(seg.ai);
    el.dataset.lane = String(seg.lane);
    if (seg.isCamera && seg.camId) el.dataset.camId = seg.camId;
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
        if (dragMode === 'move') {
          const snap = window._snapAnimTlMove(Math.max(0, startLeft + dx), seg.dur, snapPoints, pxMs);
          const deltaPx = snap.leftPx - startLeft;
          const rect = tracksRect();
          previewLane = Math.max(0, Math.floor((mv.clientY - rect.top) / laneH));
          const laneDelta = previewLane - startLane;
          dragItems.forEach(item => {
            item.dom.style.left = Math.max(0, item.startLeft + deltaPx) + 'px';
            const nl = Math.max(0, item.startLane + laneDelta);
            item.dom.style.top = (nl * laneH + segPad) + 'px';
            item.previewLane = nl;
          });
          window._showAnimTlSnapGuide(snap.guidePx);
          window._updateAnimTlInsertPreview(
            tl.segments, previewLane, snap.leftPx / pxMs, seg.dur, excludeKeys, pxMs, tracks
          );
        } else {
          window._clearAnimTlInsertPreview();
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
        window._clearAnimTlInsertPreview();
        if (dragMode === 'move') {
          const updates = dragItems.map(item => {
            const newAbs = parseFloat(item.dom.style.left) / pxMs;
            const laneVal = item.previewLane != null ? item.previewLane : previewLane;
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
        window._pickElForAnimTl(seg.elId);
        window.renderAnimTimelineBar(slide);
        return;
      }
      if (!window._animTlSel.has(segKey)) {
        window._animTlSetSel(seg.elId, seg.ai);
        tracks.querySelectorAll('.anim-tl-seg').forEach(dom => {
          const k = window._animTlKey(dom.dataset.elId, parseInt(dom.dataset.ai, 10));
          dom.classList.toggle('anim-tl-seg-sel', window._animTlSel.has(k));
        });
        window._pickElForAnimTl(seg.elId);
      }
      startDrag('move', ev);
    });
    el.addEventListener('contextmenu', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const segKey = window._animTlKey(seg.elId, seg.ai);
      if (!window._animTlSel.has(segKey)) window._animTlSetSel(seg.elId, seg.ai);
      window._pickElForAnimTl(seg.elId);
      window.renderAnimTimelineBar(slide);
      window._openAnimTlCtxMenu(ev);
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
      let lastPickedElId = null;
      tracks.querySelectorAll('.anim-tl-seg').forEach(dom => {
        const l = parseFloat(dom.style.left) || 0;
        const t = parseFloat(dom.style.top) || 0;
        const w = parseFloat(dom.style.width) || 0;
        const h = parseFloat(dom.style.height) || 0;
        const xOverlap = l + w >= rLeft && l <= rRight;
        const yOverlap = t + h >= rTop && t <= rBottom;
        if (xOverlap && (yOverlap || selectByTimeOnly)) {
          window._animTlSel.add(window._animTlKey(dom.dataset.elId, parseInt(dom.dataset.ai, 10)));
          lastPickedElId = dom.dataset.elId;
        }
      });
      if (lastPickedElId) window._pickElForAnimTl(lastPickedElId);
      if (typeof window._syncAnimListHighlightFromTimeline === 'function') {
        window._syncAnimListHighlightFromTimeline({scroll:true});
      }
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

// ══════════════ RECOLOR («Цвет») — силуэт по контуру ══════════════
(function(){
  function _recolorNormHex(c){
    var h=String(c||'#000000').trim();
    if(/^#[0-9a-fA-F]{3}$/.test(h)) h='#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];
    if(!/^#[0-9a-fA-F]{6}$/.test(h)) h='#000000';
    return h.toLowerCase();
  }
  function _recolorRgb(hex){
    hex=_recolorNormHex(hex);
    return {
      r:parseInt(hex.slice(1,3),16)/255,
      g:parseInt(hex.slice(3,5),16)/255,
      b:parseInt(hex.slice(5,7),16)/255
    };
  }
  function _recolorSvgRoot(){
    var svg=document.getElementById('_recolor-svg-filters');
    if(!svg){
      svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.id='_recolor-svg-filters';
      svg.setAttribute('aria-hidden','true');
      svg.style.cssText='position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
      document.body.appendChild(svg);
    }
    return svg;
  }
  // t=0 — сплошной цвет (силуэт), t=1 — исходные цвета
  function _recolorMatrixValues(r,g,b,t){
    var d=t, o=1-t;
    return d.toFixed(4)+' 0 0 0 '+(r*o).toFixed(4)+' 0 '+d.toFixed(4)+' 0 0 '+(g*o).toFixed(4)+' 0 0 '+d.toFixed(4)+' 0 '+(b*o).toFixed(4)+' 0 0 0 1 0';
  }
  function _recolorEase(p){
    return p<0.5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;
  }
  function _recolorFilterId(el){
    if(!el._recolorUid){
      el._recolorUid=(el.dataset&&el.dataset.id) ? String(el.dataset.id) : ('r'+Math.random().toString(36).slice(2,9));
    }
    return '_recolor_live_'+el._recolorUid;
  }
  function _recolorGetMat(el){
    var id=_recolorFilterId(el);
    var svg=_recolorSvgRoot();
    var filter=document.getElementById(id);
    var mat;
    if(!filter){
      filter=document.createElementNS('http://www.w3.org/2000/svg','filter');
      filter.setAttribute('id',id);
      filter.setAttribute('color-interpolation-filters','sRGB');
      mat=document.createElementNS('http://www.w3.org/2000/svg','feColorMatrix');
      mat.setAttribute('type','matrix');
      filter.appendChild(mat);
      svg.appendChild(filter);
    } else {
      mat=filter.querySelector('feColorMatrix');
    }
    return { id:id, mat:mat, filter:filter };
  }
  function _recolorVisualTargets(el,d){
    var type=(d&&d.type)||(el&&el.dataset&&el.dataset.type)||'';
    if(type==='text'){
      var tel=el.querySelector('.tel')||el.querySelector('.ec');
      return tel ? [tel] : [];
    }
    var img=el.querySelector('img');
    if(img) return [img];
    var svgEl=el.querySelector('svg');
    if(svgEl) return [svgEl];
    var ec=el.querySelector('.ec')||el;
    return [ec];
  }
  function _recolorApplyT(el,nodes,hex,t){
    var rgb=_recolorRgb(hex);
    var pack=_recolorGetMat(el);
    pack.mat.setAttribute('values',_recolorMatrixValues(rgb.r,rgb.g,rgb.b,t));
    var url='url(#'+pack.id+')';
    nodes.forEach(function(node){
      if(node._recolorSavedFilter==null) node._recolorSavedFilter=node.style.filter||'';
      node.style.filter=url;
    });
    el._recolorT=t;
    el._recolorHex=hex;
  }
  function _recolorClearNodes(el,nodes){
    (nodes||[]).forEach(function(node){
      node.style.filter=node._recolorSavedFilter!=null?node._recolorSavedFilter:'';
      node._recolorSavedFilter=null;
    });
    var id=el&&el._recolorUid ? '_recolor_live_'+el._recolorUid : null;
    var filter=id ? document.getElementById(id) : null;
    if(filter&&filter.parentNode) filter.parentNode.removeChild(filter);
    if(el){ el._recolorT=null; el._recolorHex=null; }
  }
  function _recolorCancelAnim(el){
    if(!el) return;
    if(el._recolorRaf){ cancelAnimationFrame(el._recolorRaf); el._recolorRaf=null; }
    if(el._recolorTimers){ el._recolorTimers.forEach(clearTimeout); el._recolorTimers=[]; }
  }
  function _recolorAnimate(el,nodes,hex,fromT,toT,dur,onDone){
    _recolorCancelAnim(el);
    el._recolorTimers=[];
    _recolorApplyT(el,nodes,hex,fromT);
    var rgb=_recolorRgb(hex);
    var pack=_recolorGetMat(el);
    var t0=performance.now();
    var durMs=Math.max(1,dur||600);
    function frame(now){
      var p=Math.min(1,(now-t0)/durMs);
      var t=fromT+(toT-fromT)*_recolorEase(p);
      pack.mat.setAttribute('values',_recolorMatrixValues(rgb.r,rgb.g,rgb.b,t));
      el._recolorT=t;
      if(p<1){
        el._recolorRaf=requestAnimationFrame(frame);
      } else {
        el._recolorRaf=null;
        if(toT>=0.999){
          _recolorClearNodes(el,nodes);
          el._recolorTargets=null;
          el._recolorPrepared=false;
        } else {
          _recolorApplyT(el,nodes,hex,toT);
        }
        if(onDone) onDone();
      }
    }
    el._recolorRaf=requestAnimationFrame(frame);
  }
  function _recolorRestore(el,nodes){
    _recolorCancelAnim(el);
    _recolorClearNodes(el,nodes||el._recolorTargets||[]);
    el._recolorTargets=null;
    el._recolorPrepared=false;
  }
  function _recolorFirstAnim(d){
    var anims=(d&&d.anims)||[];
    for(var i=0;i<anims.length;i++){
      if(anims[i]&&anims[i].name==='recolor') return anims[i];
    }
    return null;
  }
  function _recolorNeedsPrepare(d){
    var anims=(d&&d.anims)||[];
    for(var i=0;i<anims.length;i++){
      var a=anims[i];
      if(a&&a.name==='recolor'&&!a.recolorInvert) return a;
    }
    return null;
  }
  function _recolorPrepareEl(el,d){
    if(!el||!d) return;
    var a=_recolorNeedsPrepare(d);
    if(!a) return;
    _recolorCancelAnim(el);
    if(el._recolorTargets) _recolorClearNodes(el,el._recolorTargets);
    var hex=_recolorNormHex(a.recolorColor||'#000000');
    var nodes=_recolorVisualTargets(el,d);
    if(!nodes.length) return;
    _recolorApplyT(el,nodes,hex,0);
    el._recolorTargets=nodes;
    el._recolorPrepared=true;
  }
  function _fireRecolorAnim(el,d,a,delayMs,opts){
    opts=opts||{};
    if(!el||!a) return;
    var delay=typeof delayMs==='number'?delayMs:(a.delay||0);
    var dur=Math.max(50,a.duration||600);
    var hex=_recolorNormHex(a.recolorColor||'#000000');
    var invert=!!a.recolorInvert;
    _recolorCancelAnim(el);
    el._recolorTimers=[];
    var nodes=el._recolorTargets;
    var already=!!el._recolorPrepared&&!!nodes&&!invert;
    if(!already){
      if(el._recolorTargets) _recolorClearNodes(el,el._recolorTargets);
      nodes=_recolorVisualTargets(el,d);
      if(!nodes.length) return;
      el._recolorTargets=nodes;
    }
    if(!invert){
      if(!already) _recolorApplyT(el,nodes,hex,0);
      el._recolorPrepared=true;
      el._recolorTimers.push(setTimeout(function(){
        _recolorAnimate(el,nodes,hex,0,1,dur,null);
      }, delay));
    } else {
      el._recolorPrepared=false;
      el._recolorTimers.push(setTimeout(function(){
        _recolorAnimate(el,nodes,hex,1,0,dur,function(){
          if(opts.preview){
            el._recolorTimers.push(setTimeout(function(){
              _recolorAnimate(el,nodes,hex,0,1,Math.min(400,dur),null);
            }, 200));
          }
        });
      }, delay));
    }
  }
  function _resetRecolor(el){
    if(!el) return;
    _recolorRestore(el,el._recolorTargets);
  }
  window._recolorHasAnim=function(d){ return !!_recolorFirstAnim(d); };
  window._recolorNeedsPrepare=_recolorNeedsPrepare;
  window._recolorPrepareEl=_recolorPrepareEl;
  window._fireRecolorAnim=_fireRecolorAnim;
  window._resetRecolor=_resetRecolor;
})();

window._fireMirrorAnim = function(el, a, delayMs, opts) {
  opts = opts || {};
  if (!el || !a) return;
  var delay = typeof delayMs === 'number' ? delayMs : (a.delay || 0);
  var dur = Math.max(80, a.duration || 600);
  var axis = a.mirrorAxis === 'v' ? 'v' : 'h';
  var preview = !!opts.preview;
  var target = (typeof window._animContentTarget === 'function')
    ? window._animContentTarget(el)
    : (opts.ecEl || (el.querySelector && (el.querySelector('.ec') || el.querySelector('.iel'))) || el);
  if (!target) return;
  var composite = (target !== el) ? 'replace' : 'add';
  var prop = axis === 'h' ? 'rotateY' : 'rotateX';
  var persp = 'perspective(900px) ';

  // Host keeps cumulative flip so chained mirrors continue (H→back, H+V, …)
  // instead of always restarting from the unflipped pose.
  var host = el;
  if (host._mirrorCumH == null) host._mirrorCumH = false;
  if (host._mirrorCumV == null) host._mirrorCumV = false;
  var curH = !!host._mirrorCumH;
  var curV = !!host._mirrorCumV;
  var nextH = axis === 'h' ? !curH : curH;
  var nextV = axis === 'v' ? !curV : curV;
  if (!preview) {
    host._mirrorCumH = nextH;
    host._mirrorCumV = nextV;
  }

  function scaleOf(h, v) {
    return 'scale(' + (h ? -1 : 1) + ',' + (v ? -1 : 1) + ')';
  }
  var startScale = scaleOf(curH, curV);
  var endScale = scaleOf(nextH, nextV);

  function run() {
    target.style.transformOrigin = 'center center';
    if (!target.animate) {
      if (!preview && composite === 'replace') target.style.transform = endScale;
      return;
    }
    // replace (.ec / text body): keep current flips during the turn so the next
    // mirror continues from where the previous one ended.
    // add (rare: animating el itself): only rotate, don't clobber translate.
    var frames = composite === 'replace'
      ? [
          { transform: persp + startScale + ' ' + prop + '(0deg)' },
          { transform: persp + startScale + ' ' + prop + '(180deg)' }
        ]
      : [
          { transform: persp + prop + '(0deg)' },
          { transform: persp + prop + '(180deg)' }
        ];
    var anim = target.animate(frames, {
      duration: dur,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: preview ? 'none' : 'forwards',
      composite: composite
    });
    anim.onfinish = function() {
      try { anim.commitStyles(); } catch (e) {}
      anim.cancel();
      if (preview) {
        target.style.transform = '';
        return;
      }
      if (composite === 'replace') target.style.transform = endScale;
    };
  }

  if (typeof window._pvStageLater === 'function' && !preview) {
    window._pvStageLater(el.parentElement, run, delay);
  } else if (delay > 0) {
    setTimeout(run, delay);
  } else {
    run();
  }
};



