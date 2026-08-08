
// ── PNG Alpha Hit Testing ─────────────────────────────────────────────
function _preloadAlphaCanvas(imgTag) {
  if (!imgTag || imgTag._alphaCanvas || imgTag._alphaLoading) return;
  if (!imgTag.complete || !imgTag.naturalWidth || !imgTag.naturalHeight) return;
  imgTag._alphaLoading = true;
  const src = imgTag.src || '';
  const buildCanvas = (imageEl) => {
    const c = document.createElement('canvas');
    c.width = imageEl.naturalWidth; c.height = imageEl.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(imageEl, 0, 0);
    try {
      ctx.getImageData(0, 0, 1, 1);
      c._src = src;
      imgTag._alphaCanvas = c;
    } catch (e) { /* tainted */ }
    imgTag._alphaLoading = false;
  };
  if (src.startsWith('data:')) {
    buildCanvas(imgTag);
    return;
  }
  const loadBlob = typeof assetFetchBlob === 'function'
    ? assetFetchBlob(src)
    : fetch(src).then(r => r.blob());
  loadBlob
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const img2 = new Image();
      img2.onload = () => { buildCanvas(img2); URL.revokeObjectURL(url); };
      img2.onerror = () => { imgTag._alphaLoading = false; buildCanvas(imgTag); };
      img2.src = url;
    })
    .catch(() => buildCanvas(imgTag));
}

function _imgPixelAt(imgTag, clientX, clientY) {
  const nw = imgTag.naturalWidth, nh = imgTag.naturalHeight;
  if (!nw || !nh) return null;
  const imgRect = imgTag.getBoundingClientRect();
  if (!imgRect.width || !imgRect.height) return null;
  // Un-rotate the click point around the box's own center before mapping it
  // into the image's local 0..1 space. getBoundingClientRect() on a rotated
  // element returns the enlarged AXIS-ALIGNED bounding box of the rotated
  // shape, not its actual local box — using its width/height directly (as
  // before) only worked for rot=0. The box's own CENTER, however, stays the
  // same whether rotated or not (rotation pivots around center), so we can
  // recover the true local point by rotating (clientX,clientY) back by -rot
  // around that center, then measuring against the element's real
  // (unrotated) on-screen width/height.
  const ownerEl = imgTag.closest('.el, .psel');
  const deg = ownerEl ? (parseFloat(ownerEl.dataset.rot) || _parseTransformRotDeg(ownerEl)) : 0;
  const cx = imgRect.left + imgRect.width / 2;
  const cy = imgRect.top + imgRect.height / 2;
  let px = clientX, py = clientY;
  let boxW = imgRect.width, boxH = imgRect.height;
  if (deg) {
    const rad = -deg * Math.PI / 180;
    const dx = clientX - cx, dy = clientY - cy;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    px = cx + dx * cos - dy * sin;
    py = cy + dx * sin + dy * cos;
    // Recover the real (unrotated) box size from the enlarged bounding box:
    // bbox_w = w*|cos| + h*|sin|, bbox_h = w*|sin| + h*|cos|  →  solve for w,h.
    const c = Math.abs(Math.cos(deg * Math.PI / 180));
    const s = Math.abs(Math.sin(deg * Math.PI / 180));
    const det = c * c - s * s;
    if (Math.abs(det) > 1e-6) {
      boxW = (imgRect.width * c - imgRect.height * s) / det;
      boxH = (imgRect.height * c - imgRect.width * s) / det;
    }
    if (!(boxW > 0) || !(boxH > 0)) { boxW = imgRect.width; boxH = imgRect.height; }
  }
  let relX = (px - (cx - boxW / 2)) / boxW;
  let relY = (py - (cy - boxH / 2)) / boxH;
  const fit = imgTag.style.objectFit || (typeof getComputedStyle === 'function' ? getComputedStyle(imgTag).objectFit : '') || 'fill';
  if (fit === 'contain' || fit === 'cover') {
    const imgAspect = nw / nh, boxAspect = boxW / boxH;
    let ox = 0, oy = 0, iw = 1, ih = 1;
    if (fit === 'contain') {
      if (imgAspect > boxAspect) { ih = boxAspect / imgAspect; oy = (1 - ih) / 2; }
      else { iw = imgAspect / boxAspect; ox = (1 - iw) / 2; }
    } else {
      if (imgAspect > boxAspect) { iw = boxAspect / imgAspect; ox = (1 - iw) / 2; }
      else { ih = imgAspect / boxAspect; oy = (1 - ih) / 2; }
    }
    relX = (relX - ox) / iw;
    relY = (relY - oy) / ih;
  }
  if (relX < 0 || relY < 0 || relX > 1 || relY > 1) return null;
  return { px: Math.floor(relX * nw), py: Math.floor(relY * nh) };
}
// Fallback: read the rotation angle straight off the element's CSS
// transform matrix, for elements where dataset.rot isn't set for some reason.
function _parseTransformRotDeg(el) {
  try {
    const tf = getComputedStyle(el).transform;
    if (!tf || tf === 'none') return 0;
    const m = tf.match(/^matrix\(([^)]+)\)$/);
    if (!m) return 0;
    const parts = m[1].split(',').map(parseFloat);
    const a = parts[0], b = parts[1];
    return Math.atan2(b, a) * 180 / Math.PI;
  } catch (e) { return 0; }
}

// Returns true if the pixel under cursor is transparent (alpha < threshold)
function _isTransparentPixel(elOuter, clientX, clientY, threshold) {
  threshold = threshold == null ? 20 : threshold;
  try {
    const imgTag = elOuter.querySelector('img');
    if (!imgTag || !imgTag.complete || !imgTag.naturalWidth || !imgTag.naturalHeight) return false;
    // Bounds + rotation-aware local-pixel mapping both happen inside
    // _imgPixelAt now — no separate axis-aligned pre-check here, since that
    // used getBoundingClientRect() directly and broke for any rotated image
    // (its bounding box is enlarged/axis-aligned, not the real local box).
    const pt = _imgPixelAt(imgTag, clientX, clientY);
    if (!pt) return true;
    const src = imgTag.src || '';
    if (imgTag._alphaCanvas && imgTag._alphaCanvas._src === src) {
      const data = imgTag._alphaCanvas.getContext('2d').getImageData(pt.px, pt.py, 1, 1).data;
      return data[3] < threshold;
    }
    _preloadAlphaCanvas(imgTag);
    return false;
  } catch (e) {
    return false;
  }
}

function _isParticleDomNode(node) {
  if (!node) return false;
  if (node.classList && (node.classList.contains('_particles_layer') || node.classList.contains('_particle')
    || node.classList.contains('_particle_vis_root') || node.classList.contains('_particle_vis'))) return true;
  return !!(node.closest && node.closest('._particles_layer, ._particle'));
}

function _pointHitsEl(el, clientX, clientY, threshold) {
  if (!el) return false;
  if (el.classList && el.classList.contains('has-particles')) return false;
  threshold = threshold == null ? 20 : threshold;
  const type = el.dataset.type;
  if (type === 'image' || (type === 'graph' && el.querySelector('img'))) {
    return !_isTransparentPixel(el, clientX, clientY, threshold);
  }
  if (type === 'shape') {
    const elems = document.elementsFromPoint(clientX, clientY);
    for (const e of elems) {
      const owner = e.closest('.el, .psel');
      if (owner !== el) continue;
      if (el.dataset.shape === 'curve') {
        if (e.tagName === 'path') return true;
        if (e.tagName === 'svg' && e.classList.contains('shape-hit-area')) return true;
      } else {
        const tags = ['path', 'rect', 'ellipse', 'circle', 'polygon', 'polyline'];
        if (tags.includes(e.tagName)) return true;
        if (e.classList && e.classList.contains('shape-hit-area')) return true;
        const sh = typeof SHAPES !== 'undefined' ? SHAPES.find(s => s.id === el.dataset.shape) : null;
        if (e === el && sh && sh.noFill) continue;
      }
    }
    return false;
  }
  if (type === 'svg') {
    // Rely on the browser's own SVG hit-testing (default pointer-events:
    // visiblePainted skips unpainted/transparent regions) — if any element
    // stacked at this point, owned by this element, is an actual drawn SVG
    // primitive (not just the outer <svg>/<g> wrapper covering the whole
    // bounding box), the click landed on real content.
    const elems = document.elementsFromPoint(clientX, clientY);
    const tags = ['path', 'rect', 'ellipse', 'circle', 'polygon', 'polyline', 'line', 'text', 'tspan', 'use', 'image'];
    for (const e of elems) {
      const owner = e.closest('.el, .psel');
      if (owner !== el) continue;
      if (tags.includes(e.tagName ? e.tagName.toLowerCase() : '')) return true;
    }
    return false;
  }
  return true;
}

function _findElAtPoint(clientX, clientY, opts) {
  opts = opts || {};
  const selector = opts.selector || '.el';
  const excludeDecor = opts.excludeDecor !== false;
  const container = opts.container || document.getElementById('canvas');
  const threshold = opts.threshold;
  const elems = document.elementsFromPoint(clientX, clientY);
  for (const elem of elems) {
    if (_isParticleDomNode(elem)) continue;
    const el = elem.matches && elem.matches(selector) ? elem : (elem.closest ? elem.closest(selector) : null);
    if (!el) continue;
    if (el.classList && el.classList.contains('has-particles')) continue;
    if (excludeDecor && el.classList.contains('decor-el')) continue;
    if (container && !container.contains(el)) continue;
    if (!_pointHitsEl(el, clientX, clientY, threshold)) continue;
    return el;
  }
  return null;
}

function _forwardClickThrough(e, opts) {
  opts = opts || {};
  const selector = opts.selector || '.psel';
  const resolved = _findElAtPoint(e.clientX, e.clientY, opts);
  const top = e.target.closest && e.target.closest(selector);
  if (!resolved || resolved === top) return false;
  e.stopPropagation();
  e.preventDefault();
  resolved.dispatchEvent(new MouseEvent('click', {
    bubbles: true, cancelable: true,
    clientX: e.clientX, clientY: e.clientY, view: window
  }));
  return true;
}

function _elWantsPointer(el) {
  if (!el) return false;
  if (el._isTrigger || el._hasLink) return true;
  const aid = el.dataset.appletId;
  if (aid === 'counter' || aid === 'generator') return true;
  if (el.style && el.style.cursor === 'pointer') return true;
  return false;
}

let _alphaCursorPatchEl = null;
let _alphaCursorPatchSaved = '';

function _resetAlphaHoverCursor(opts) {
  opts = opts || {};
  if (_alphaCursorPatchEl && _alphaCursorPatchEl.isConnected) {
    _alphaCursorPatchEl.style.cursor = _alphaCursorPatchSaved;
  }
  _alphaCursorPatchEl = null;
  _alphaCursorPatchSaved = '';
  if (opts.overlay) opts.overlay.style.cursor = '';
}

function _updateAlphaHoverCursor(e, opts) {
  opts = opts || {};
  const selector = opts.selector || '.psel';
  const container = opts.container;
  const navSel = opts.navSelector || '#p-prev,#p-next,#p-exit,#p-info,#nav,#p-nav,.nb';

  if (_alphaCursorPatchEl && _alphaCursorPatchEl.isConnected) {
    _alphaCursorPatchEl.style.cursor = _alphaCursorPatchSaved;
  }
  _alphaCursorPatchEl = null;
  _alphaCursorPatchSaved = '';
  if (opts.overlay) opts.overlay.style.cursor = '';

  if (e.target.closest && e.target.closest(navSel)) return;

  if (_isParticleDomNode(e.target)) {
    const resolvedOnly = typeof _findElAtPoint === 'function'
      ? _findElAtPoint(e.clientX, e.clientY, opts)
      : null;
    if (opts.overlay) opts.overlay.style.cursor = _elWantsPointer(resolvedOnly) ? 'pointer' : '';
    return;
  }

  let top = e.target.closest && e.target.closest(selector);
  if (!top || (container && !container.contains(top))) return;

  const resolved = typeof _findElAtPoint === 'function'
    ? _findElAtPoint(e.clientX, e.clientY, opts)
    : top;

  if (resolved && top !== resolved) {
    _alphaCursorPatchEl = top;
    _alphaCursorPatchSaved = top.style.cursor || 'default';
    top.style.cursor = _elWantsPointer(resolved) ? 'pointer' : _alphaCursorPatchSaved;
  } else if (opts.overlay && _elWantsPointer(resolved || top)) {
    opts.overlay.style.cursor = 'pointer';
  }
}

// ══════════════ STOP TEXT EDITING (called from anywhere) ══════════════
window._finishTextEdit = function(el) {
  if (!el || el.dataset.type !== 'text' || el.dataset.editing !== 'true') return;
  const c = el.querySelector('.tel') || el.querySelector('.ec');
  if (!c) return;
  if (typeof _toSaveMode === 'function') _toSaveMode(c);
  const _cwrap2 = document.getElementById('cwrap');
  if (_cwrap2) _cwrap2.style.overflow = '';
  const vw = c.querySelector('.ec-valign-wrap');
  const root = (typeof _rtContent === 'function') ? _rtContent(c) : c;
  const _snap = vw ? vw.innerHTML : (root ? root.innerHTML : c.innerHTML);
  el.dataset._savedHtml = _snap;
  c.contentEditable = 'false';
  delete el.dataset.editing;
  el.style.cursor = '';
  if (typeof window._fitTextHeight === 'function') {
    const _dFit = slides[cur] && slides[cur].els.find(e => e.id === el.dataset.id);
    if (_dFit && window._fitTextHeight(_dFit)) el.style.height = _dFit.h + 'px';
  }
  if (typeof commitAll === 'function') commitAll();
  delete el.dataset._savedHtml;
  if (vw) vw.innerHTML = _snap;
  else if (root && root !== c) root.innerHTML = _snap;
  else c.innerHTML = _snap;
  if (window._textShadowActive && window._textShadowActive(el.dataset) && typeof applyTextShadowStyle === 'function') {
    applyTextShadowStyle(el);
  }
  if (typeof _attachBulletClickHandlers === 'function') _attachBulletClickHandlers(c);
  if (typeof _rtNormalizeTextDisplay === 'function') {
    const _dNorm = slides[cur] && slides[cur].els.find(e => e.id === el.dataset.id);
    _rtNormalizeTextDisplay(c, (_dNorm && _dNorm.cs) || '', el.dataset.bulletGap);
  }
  if (typeof _rtUpdateCharCounter === 'function') _rtUpdateCharCounter(el, c);
};

function stopTextEditing() {
  const editing = document.querySelector('.el[data-editing="true"]');
  if (editing) {
    if (editing.dataset.type === 'shape') {
      if (typeof window._blurActiveShapeText === 'function') window._blurActiveShapeText();
      return;
    }
    if (typeof window._finishTextEdit === 'function') window._finishTextEdit(editing);
    else {
      const tel = editing.querySelector('.tel');
      if (tel) tel.blur();
    }
  }
  if (typeof window._blurActiveShapeText === 'function') window._blurActiveShapeText();
  const active = document.activeElement;
  if (active && active.contentEditable === 'true' && active.classList.contains('tel')) {
    const wrap = active.closest('.el');
    if (wrap && wrap.dataset.editing === 'true' && typeof window._finishTextEdit === 'function') {
      window._finishTextEdit(wrap);
    } else {
      active.contentEditable = 'false';
      active.blur();
    }
  }
}

// ══════════════ UNIFORM SHADOW (expand from silhouette, no offset) ══════════════
window._shadowPad = function(ss, sb, sw) {
  ss = Math.max(0, +ss || 0);
  sb = Math.max(0, +sb || 0);
  sw = Math.max(0, +sw || 0);
  const eff = sb > 0 && typeof window._shadowEffectiveBlur === 'function'
    ? window._shadowEffectiveBlur(ss, sb) : sb;
  return Math.ceil(ss + eff * 3.5 + sw + 20);
};

window._shadowFilterObbPct = function(ss, sb, sw, w, h, axis) {
  const pad = window._shadowPad(ss, sb, sw);
  const dim = Math.max(1, axis === 'y' ? (+h || 100) : (+w || 100));
  return Math.min(250, Math.max(55, Math.ceil(pad / dim * 100)));
};

window._shadowFilterDefUser = function(id, ss, sb, sc, w, h, sw) {
  const pad = window._shadowPad(ss, sb, sw);
  w = Math.max(1, +w || 100);
  h = Math.max(1, +h || 100);
  return `<filter id="${id}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="${-pad}" y="${-pad}" width="${w + pad * 2}" height="${h + pad * 2}">`
    + window._shadowFilterInner(ss, sb, sc)
    + `</filter>`;
};

window._shadowFilterDefObb = function(id, ss, sb, sc, w, h, sw) {
  const px = window._shadowFilterObbPct(ss, sb, sw, w, h, 'x');
  const py = window._shadowFilterObbPct(ss, sb, sw, w, h, 'y');
  return `<filter id="${id}" filterUnits="objectBoundingBox" x="-${px}%" y="-${py}%" width="${100 + px * 2}%" height="${100 + py * 2}%">`
    + window._shadowFilterInner(ss, sb, sc)
    + `</filter>`;
};

// Extra blur on top of user value — only when blur > 0 (softens morphology corners)
window._shadowEffectiveBlur = function(ss, sb) {
  ss = Math.max(0, +ss || 0);
  sb = Math.max(0, +sb || 0);
  if (sb <= 0) return 0;
  return sb + Math.max(1.2, ss * 0.45);
};

window._syncShapeShadowLayout = function(el, d, w, h) {
  const svgDiv = el && el.querySelector('.shape-svg');
  if (!svgDiv) return 0;
  const on = d && (d.shadow === true || d.shadow === 'true');
  const pad = on ? window._shadowPad(d.shadowSize, d.shadowBlur, d.sw) : 0;
  if (pad > 0) {
    svgDiv.style.cssText =
      'position:absolute;left:-' + pad + 'px;top:-' + pad + 'px;' +
      'width:calc(100% + ' + (pad * 2) + 'px);height:calc(100% + ' + (pad * 2) + 'px);overflow:visible;';
    el.style.overflow = 'visible';
    const selEl = el.querySelector('.sel-el');
    if (selEl) selEl.style.overflow = 'visible';
    const ec = el.querySelector('.ec');
    if (ec) ec.style.overflow = 'visible';
    const svgEl = svgDiv.querySelector('svg');
    if (svgEl) svgEl.style.overflow = 'visible';
  } else {
    svgDiv.style.cssText = 'position:absolute;inset:0;overflow:visible;';
  }
  return pad;
};

window._shadowFilterInner = function(ss, sb, sc) {
  ss = Math.max(0, +ss || 0);
  sb = Math.max(0, +sb || 0);
  sc = sc || '#000000';
  let chain = `<feMorphology in="SourceAlpha" operator="dilate" radius="${ss}" result="spread"/>`;
  if (sb > 0) {
    const blurDev = typeof window._shadowEffectiveBlur === 'function'
      ? window._shadowEffectiveBlur(ss, sb) : sb;
    chain += `<feGaussianBlur in="spread" stdDeviation="${blurDev}" result="blur"/>`;
    chain += `<feFlood flood-color="${sc}" flood-opacity="0.65" result="color"/>`;
    chain += `<feComposite in="color" in2="blur" operator="in" result="shadow"/>`;
  } else {
    chain += `<feFlood flood-color="${sc}" flood-opacity="1" result="color"/>`;
    chain += `<feComposite in="color" in2="spread" operator="in" result="shadow"/>`;
  }
  chain += `<feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>`;
  return chain;
};

window._shadowFilterDef = function(id, ss, sb, sc, w, h, sw) {
  return window._shadowFilterDefObb(id, ss, sb, sc, w, h, sw != null ? sw : 0);
};

window._shadowFilterDefPct = function(id, ss, sb, sc, w, h, sw) {
  return window._shadowFilterDefObb(id, ss, sb, sc, w, h, sw != null ? sw : 0);
};

window._ensureShadowFilterHost = function() {
  let host = document.getElementById('_shadow_filter_svg');
  if (!host) {
    host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    host.id = '_shadow_filter_svg';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    host.appendChild(defs);
    document.body.appendChild(host);
  }
  return host.querySelector('defs');
};

window._applyImgShadowFilter = function(el, d) {
  if (!el || !d || !d.imgShadow) {
    if (el) el.style.filter = '';
    return;
  }
  const ss = d.imgShadowSize != null ? +d.imgShadowSize : 4;
  const sb = d.imgShadowBlur != null ? +d.imgShadowBlur : 15;
  const sc = d.imgShadowColor || '#000000';
  const fid = 'imgsh_' + String(el.dataset.id || 'x').replace(/[^a-zA-Z0-9_-]/g, '_');
  const defs = window._ensureShadowFilterHost();
  const old = defs.querySelector('#' + fid);
  if (old) old.remove();
  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filter.setAttribute('id', fid);
  filter.setAttribute('x', '-50%');
  filter.setAttribute('y', '-50%');
  filter.setAttribute('width', '200%');
  filter.setAttribute('height', '200%');
  filter.innerHTML = window._shadowFilterInner(ss, sb, sc);
  defs.appendChild(filter);
  el.style.filter = 'url(#' + fid + ')';
};

window._imgShadowFilterMarkup = function(d) {
  if (!d || !d.imgShadow) return null;
  const ss = d.imgShadowSize != null ? +d.imgShadowSize : 4;
  const sb = d.imgShadowBlur != null ? +d.imgShadowBlur : 15;
  const sc = d.imgShadowColor || '#000000';
  const fid = 'imgsh_' + (d.id || 'x');
  return { fid: fid, markup: window._shadowFilterDefPct(fid, ss, sb, sc) };
};

window._parseHexColor = function(c) {
  if (!c) return { r: 0, g: 0, b: 0 };
  c = String(c).trim();
  if (c.charAt(0) === '#') {
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map(function(ch) { return ch + ch; }).join('');
    if (h.length >= 6) {
      return {
        r: parseInt(h.slice(0, 2), 16) || 0,
        g: parseInt(h.slice(2, 4), 16) || 0,
        b: parseInt(h.slice(4, 6), 16) || 0
      };
    }
  }
  const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  return { r: 0, g: 0, b: 0 };
};

window._lerpHexColor = function(c1, c2, t) {
  const a = window._parseHexColor(c1);
  const b = window._parseHexColor(c2);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return '#' + [r, g, bl].map(function(x) {
    const s = x.toString(16);
    return s.length < 2 ? '0' + s : s;
  }).join('');
};

window._shadowStateFromData = function(d) {
  if (!d) return { ss: 0, sb: 0, sc: '#000000', active: false };
  if (d.type === 'text') {
    if (typeof window._textShadowActive === 'function' && window._textShadowActive(d)) {
      const p = window._textShadowParams(d);
      return { ss: p.ss, sb: p.sb, sc: p.sc, active: true };
    }
  } else if (d.type === 'image' && d.imgShadow) {
    return {
      ss: d.imgShadowSize != null ? +d.imgShadowSize : 4,
      sb: d.imgShadowBlur != null ? +d.imgShadowBlur : 15,
      sc: d.imgShadowColor || '#000000',
      active: true
    };
  } else if (d.type === 'shape' && d.shadow) {
    return {
      ss: d.shadowSize != null ? +d.shadowSize : 3,
      sb: d.shadowBlur != null ? +d.shadowBlur : 4,
      sc: d.shadowColor || '#000000',
      active: true
    };
  }
  return { ss: 0, sb: 0, sc: '#000000', active: false };
};

window._shadowMorphNeeds = function(from, to) {
  if (!from.active && !to.active) return false;
  if (!!from.active !== !!to.active) return true;
  return from.ss !== to.ss || from.sb !== to.sb || String(from.sc) !== String(to.sc);
};

// Exact cubic-bezier(0.4, 0, 0.2, 1) evaluator — the SAME easing curve used
// by the geometry ".animate()" (WAAPI) morph animation. Any manually
// rAF-driven property (shadow, color, shape geometry, connector lines) must
// use this exact curve, or it will visibly drift out of sync with the
// object's own WAAPI-driven movement (different speed at every instant,
// even with matching start/end times and duration).
window._morphCubicBezier = function(x1, y1, x2, y2) {
  function A(a1, a2) { return 1.0 - 3.0 * a2 + 3.0 * a1; }
  function B(a1, a2) { return 3.0 * a2 - 6.0 * a1; }
  function C(a1) { return 3.0 * a1; }
  function calcX(t) { return ((A(x1, x2) * t + B(x1, x2)) * t + C(x1)) * t; }
  function calcY(t) { return ((A(y1, y2) * t + B(y1, y2)) * t + C(y1)) * t; }
  function calcSlopeX(t) { return 3.0 * A(x1, x2) * t * t + 2.0 * B(x1, x2) * t + C(x1); }
  function getTForX(x) {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = calcX(t) - x;
      if (Math.abs(dx) < 1e-6) return t;
      const slope = calcSlopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= dx / slope;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 20; i++) {
      const xEst = calcX(t);
      if (Math.abs(xEst - x) < 1e-6) break;
      if (xEst < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  }
  return function (x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return calcY(getTForX(x));
  };
};
window._morphEase = window._morphCubicBezier(0.4, 0, 0.2, 1);

window._shapeShadowFilterNode = function(svg, fid) {
  if (!svg) return null;
  return svg.querySelector('filter[id="' + fid + '"]');
};

window._shapeShadowTargetNode = function(svg, fid) {
  if (!svg) return null;
  let node = svg.querySelector('[filter="url(#' + fid + ')"]');
  if (node) return node;
  return svg.querySelector('path,rect,circle,ellipse,polygon,polyline,line,g');
};

window._applyShadowValues = function(bel, d, ss, sb, sc) {
  if (!bel || !d) return;
  ss = Math.max(0, +ss || 0);
  sb = Math.max(0, +sb || 0);
  sc = sc || '#000000';
  const active = ss > 0 || sb > 0;
  const id = bel.dataset.id || d.id || 'x';
  const type = d.type;

  if (type === 'text') {
    if (typeof window._applyTextShadowFilter === 'function') {
      window._applyTextShadowFilter(bel, active ? { textShadowSize: ss, textShadowBlur: sb, textShadowColor: sc } : {});
      return;
    }
    return;
  }

  if (type === 'image') {
    const fid = 'imgsh_' + String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const defs = typeof window._ensureShadowFilterHost === 'function' ? window._ensureShadowFilterHost() : null;
    if (!active) {
      bel.style.filter = '';
      if (defs) {
        const old = defs.querySelector('#' + fid);
        if (old) old.remove();
      }
      return;
    }
    if (!defs || typeof window._shadowFilterInner !== 'function') return;
    let filter = defs.querySelector('#' + fid);
    if (!filter) {
      filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.setAttribute('id', fid);
      filter.setAttribute('x', '-50%');
      filter.setAttribute('y', '-50%');
      filter.setAttribute('width', '200%');
      filter.setAttribute('height', '200%');
      defs.appendChild(filter);
    }
    filter.innerHTML = window._shadowFilterInner(ss, sb, sc);
    bel.style.filter = 'url(#' + fid + ')';
    return;
  }

  if (type === 'shape') {
    const svgDiv = bel.querySelector('.shape-svg');
    const svg = svgDiv && svgDiv.querySelector('svg');
    if (!svg) return;
    const fid = 'sh_' + id;
    const sw = d.sw != null ? +d.sw : 2;
    const w = Math.max(1, +d.w || 100);
    const h = Math.max(1, +d.h || 100);
    if (!active) {
      const target = window._shapeShadowTargetNode(svg, fid);
      if (target) target.removeAttribute('filter');
      const filterEl = window._shapeShadowFilterNode(svg, fid);
      if (filterEl) filterEl.remove();
      if (typeof window._syncShapeShadowLayout === 'function') {
        window._syncShapeShadowLayout(bel, Object.assign({}, d, { shadow: false }), w, h);
      }
      return;
    }
    let filterEl = window._shapeShadowFilterNode(svg, fid);
    const pad = typeof window._shadowPad === 'function' ? window._shadowPad(ss, sb, sw) : Math.ceil(ss + sb * 3.5 + sw + 20);
    if (!filterEl) {
      let defsEl = svg.querySelector('defs');
      if (!defsEl) {
        defsEl = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.insertBefore(defsEl, svg.firstChild);
      }
      filterEl = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filterEl.setAttribute('id', fid);
      filterEl.setAttribute('filterUnits', 'userSpaceOnUse');
      filterEl.setAttribute('primitiveUnits', 'userSpaceOnUse');
      defsEl.appendChild(filterEl);
      const target = window._shapeShadowTargetNode(svg, fid);
      if (target) target.setAttribute('filter', 'url(#' + fid + ')');
    }
    filterEl.setAttribute('x', String(-pad));
    filterEl.setAttribute('y', String(-pad));
    filterEl.setAttribute('width', String(w + pad * 2));
    filterEl.setAttribute('height', String(h + pad * 2));
    filterEl.innerHTML = window._shadowFilterInner(ss, sb, sc);
    if (typeof window._syncShapeShadowLayout === 'function') {
      window._syncShapeShadowLayout(bel, Object.assign({}, d, {
        shadow: true, shadowSize: ss, shadowBlur: sb, shadowColor: sc
      }), w, h);
    }
  }
};

window._morphRunShadowAnims = function(jobs, durMs) {
  if (!jobs || !jobs.length) return;
  const dur = Math.max(1, +durMs || 500);
  const start = performance.now();
  jobs.forEach(function(j) {
    window._applyShadowValues(j.bel, j.d, j.from.ss, j.from.sb, j.from.sc);
  });
  function frame(now) {
    const t = Math.min(1, (now - start) / dur);
    const e = window._morphEase(t);
    jobs.forEach(function(j) {
      const ss = j.from.ss + (j.to.ss - j.from.ss) * e;
      const sb = j.from.sb + (j.to.sb - j.from.sb) * e;
      const sc = window._lerpHexColor(j.from.sc, j.to.sc, e);
      window._applyShadowValues(j.bel, j.d, ss, sb, sc);
    });
    if (t < 1) requestAnimationFrame(frame);
    else {
      jobs.forEach(function(j) {
        window._applyShadowValues(j.bel, j.d, j.to.ss, j.to.sb, j.to.sc);
      });
    }
  }
  requestAnimationFrame(frame);
};

// ══════════════ IMAGE PROPS ══════════════
function updateImgStyle(prop,val){
  if(!sel||sel.dataset.type!=='image')return;
  pushUndo();
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  const propMap={fit:'imgFit',rx:'imgRx',bw:'imgBw',bc:'imgBc',borderStyle:'imgBorderStyle',frame:'imgFrame',shadow:'imgShadow',shadowBlur:'imgShadowBlur',shadowSize:'imgShadowSize',shadowColor:'imgShadowColor',opacity:'imgOpacity'};
  const key=propMap[prop];if(!key)return;
  const parsed=prop==='rx'||prop==='bw'||prop==='shadowBlur'||prop==='shadowSize'?+val:prop==='shadow'?!!val:prop==='opacity'?+val:val;
  d[key]=parsed;
  sel.dataset[key]=parsed; // also store in DOM dataset for reliable save()
  if(prop==='shadow'){try{const opts=document.getElementById('img-shadow-options');if(opts)opts.style.display=parsed?'flex':'none';}catch(e){}}
  applyImgStyles(sel,d);commitAll();
}

function flipImg(axis){
  if(!sel||sel.dataset.type!=='image')return;
  pushUndo();
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  if(axis==='h') d.imgFlipH=!d.imgFlipH;
  else d.imgFlipV=!d.imgFlipV;
  sel.dataset.imgFlipH = d.imgFlipH ? 'true' : 'false';
  sel.dataset.imgFlipV = d.imgFlipV ? 'true' : 'false';

  // Плавный разворот через CSS animation
  const _flipTarget = sel.querySelector('.iel') || sel.querySelector('img');
  if(_flipTarget){
    const fx = (d.imgFlipH===true||d.imgFlipH==='true')?-1:1;
    const fy = (d.imgFlipV===true||d.imgFlipV==='true')?-1:1;
    // Целевой scale после flip
    const toSX = fx, toSY = fy;
    // Текущий scale (до flip)
    const fromSX = axis==='h' ? -toSX : toSX;
    const fromSY = axis==='v' ? -toSY : toSY;

    // Инжектируем уникальный keyframe для этого разворота
    const kfId = 'flip_'+Date.now();
    const kfStyle = document.createElement('style');
    // Разворот: от текущего scale → через 0 (схлопывание) → к целевому
    // Используем rotateY/rotateX для 3D эффекта разворота
    if(axis==='h'){
      kfStyle.textContent = `@keyframes ${kfId}{
        0%{transform:scaleX(${fromSX}) scaleY(${toSY})}
        45%{transform:scaleX(0) scaleY(${toSY})}
        55%{transform:scaleX(0) scaleY(${toSY})}
        100%{transform:scaleX(${toSX}) scaleY(${toSY})}
      }`;
    } else {
      kfStyle.textContent = `@keyframes ${kfId}{
        0%{transform:scaleX(${toSX}) scaleY(${fromSY})}
        45%{transform:scaleX(${toSX}) scaleY(0)}
        55%{transform:scaleX(${toSX}) scaleY(0)}
        100%{transform:scaleX(${toSX}) scaleY(${toSY})}
      }`;
    }
    document.head.appendChild(kfStyle);
    _flipTarget.style.animation = `${kfId} 0.5s cubic-bezier(0.4,0,0.6,1) forwards`;
    _flipTarget.style.transformOrigin = 'center';

    const onEnd = ()=>{
      _flipTarget.style.animation = '';
      _flipTarget.removeEventListener('animationend', onEnd);
      // Удаляем временный keyframe
      kfStyle.remove();
      // Применяем финальный transform
      applyImgStyles(sel,d);
    };
    _flipTarget.addEventListener('animationend', onEnd);
  }

  // Сразу сохраняем данные (без перерисовки DOM — это сделает onEnd)
  if(!_flipTarget) applyImgStyles(sel,d);
  commitAll();
}

function updateImgPosition(){
  if(!sel||sel.dataset.type!=='image')return;
  const px=document.getElementById('img-pos-x').value;
  const py=document.getElementById('img-pos-y').value;
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  d.imgPosX=px;d.imgPosY=py;
  sel.dataset.imgPosX=px;sel.dataset.imgPosY=py;
  applyImgStyles(sel,d);commitAll();
}

function updateImgStyleScheme(prop, val, schemeRef) {
  if (!sel || sel.dataset.type !== 'image') return;
  const d = slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  if (prop === 'shadowColor') {
    d.imgShadowColorScheme = schemeRef !== undefined ? (schemeRef || null) : d.imgShadowColorScheme;
    if (schemeRef) sel.dataset.imgShadowColorScheme = JSON.stringify(schemeRef);
    else delete sel.dataset.imgShadowColorScheme;
  }
  updateImgStyle(prop, val);
}

function applyImgStyles(el,d){
  const img=el.querySelector('img');if(!img)return;
  const c=el.querySelector('.iel');
  const rx=d.imgRx||0;
  const bw=d.imgBw||0;
  if (d.imgShadow && typeof window._applyImgShadowFilter === 'function') window._applyImgShadowFilter(el, d);
  else el.style.filter = '';
  el.style.borderRadius='';
  el.style.overflow='visible';
  el.style.border='none';
  if(c){
    c.style.position='absolute';
    c.style.inset='0';
    c.style.overflow='hidden';
    c.style.clipPath='';
    c.style.filter='';
  }
  img.style.objectFit=d.imgFit||'contain';
  img.style.objectPosition=`${d.imgPosX||'center'} ${d.imgPosY||'center'}`;
  img.style.opacity=d.imgOpacity!=null?d.imgOpacity:1;
  img.style.filter='';
  img.style.width='100%';
  img.style.height='100%';
  img.style.display='block';
  const fx=(d.imgFlipH===true||d.imgFlipH==='true')?-1:1;
  const fy=(d.imgFlipV===true||d.imgFlipV==='true')?-1:1;
  // Флип на .iel контейнере — НЕ на el, чтобы не ломать анимации и drag
  // el.style.transform содержит только rotate — не трогаем его здесь
  const flipTarget = c || img;
  if(fx===-1||fy===-1){
    flipTarget.style.transform = `scale(${fx},${fy})`;
    flipTarget.style.transformOrigin = 'center';
  } else {
    flipTarget.style.transform = '';
    flipTarget.style.transformOrigin = '';
  }
  if(typeof applyImgCrop==='function')applyImgCrop(el,d);
  if(typeof applyImgBorderFrame==='function')applyImgBorderFrame(el,d);
}

function imgSetAsSlideBg(){
  if(!sel||sel.dataset.type!=='image')return;
  pushUndo();
  const id=sel.dataset.id;
  const d=slides[cur].els.find(e=>e.id===id);
  if(!d||!d.src)return;
  const name=d.imgName||_imgDisplayName(d.src);
  const resolvedBg=typeof _resolveSlideColorBg==='function'?_resolveSlideColorBg(slides[cur]):null;
  slides[cur].bgImg={src:d.src,name,mode:'cover',opacity:1,blur:0,tileSize:120,tileGap:10,tileRot:0};
  slides[cur].bg='custom';
  if(!slides[cur].bgc&&resolvedBg)slides[cur].bgc=resolvedBg;
  slides[cur].els=slides[cur].els.filter(e=>e.id!==id);
  const el=sel;
  desel();
  el.remove();
  if(typeof _applySlideBgToCanvas==='function')_applySlideBgToCanvas(slides[cur]);
  if(typeof syncSlideBgPreview==='function')syncSlideBgPreview();
  if(typeof syncSlideBgImageUI==='function')syncSlideBgImageUI();
  save();drawThumbs();saveState();
  if(typeof renderObjectsPanel==='function')renderObjectsPanel();
  toast(t('toastImgBg'),'ok');
}
function imgCoverSlide(){ imgSetAsSlideBg(); }

// ── SVG element properties (opacity / shadow / set as slide background) ──
// Mirrors the equivalent image-element functions above. Note: opacity and
// the shadow filter are applied to the inner ".ec" wrapper, NOT to "el"
// itself and NOT to the <svg> tag — this avoids two pitfalls: (1) el.style
// is also used elsewhere (elOpacity for morph fades, shapeBlur, etc.) and
// would silently fight with it; (2) save() rebuilds d.svgContent straight
// from ".ec".innerHTML, so anything set directly on the <svg> tag would get
// permanently baked into the stored markup instead of staying a live style.
window._applySvgShadowFilter = function(host, d) {
  if (!host || !d || !d.svgShadow) {
    if (host) host.style.filter = '';
    return;
  }
  const ss = d.svgShadowSize != null ? +d.svgShadowSize : 4;
  const sb = d.svgShadowBlur != null ? +d.svgShadowBlur : 15;
  const sc = d.svgShadowColor || '#000000';
  const fid = 'svgsh_' + String(d.id || 'x').replace(/[^a-zA-Z0-9_-]/g, '_');
  const defs = window._ensureShadowFilterHost();
  const old = defs.querySelector('#' + fid);
  if (old) old.remove();
  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filter.setAttribute('id', fid);
  filter.setAttribute('x', '-50%');
  filter.setAttribute('y', '-50%');
  filter.setAttribute('width', '200%');
  filter.setAttribute('height', '200%');
  filter.innerHTML = window._shadowFilterInner(ss, sb, sc);
  defs.appendChild(filter);
  host.style.filter = 'url(#' + fid + ')';
};

function applySvgStyles(el,d){
  const ec=el.querySelector('.ec');
  if(!ec)return;
  ec.style.opacity=d.svgOpacity!=null?d.svgOpacity:1;
  if(d.svgShadow&&typeof window._applySvgShadowFilter==='function') window._applySvgShadowFilter(ec,d);
  else ec.style.filter='';
  // Mirror the values into the DOM dataset too (same pattern as images'
  // imgOpacity/imgShadow*) — mkEl only sets the *visual* style above, but
  // save() rebuilds slides[cur].els fresh from dataset on every save. If the
  // node ever gets rebuilt from data (switching slides, undo/redo,
  // duplicating, loading a project) without the user touching the slider in
  // that exact session, a missing dataset entry would silently reset these
  // fields back to their defaults on the very next save().
  if(d.svgOpacity!=null)el.dataset.svgOpacity=d.svgOpacity; else delete el.dataset.svgOpacity;
  if(d.svgShadow!=null)el.dataset.svgShadow=String(!!d.svgShadow); else delete el.dataset.svgShadow;
  if(d.svgShadowBlur!=null)el.dataset.svgShadowBlur=d.svgShadowBlur;
  if(d.svgShadowSize!=null)el.dataset.svgShadowSize=d.svgShadowSize;
  if(d.svgShadowColor)el.dataset.svgShadowColor=d.svgShadowColor;
  if(d.svgShadowColorScheme)el.dataset.svgShadowColorScheme=JSON.stringify(d.svgShadowColorScheme);
  else if(d.svgShadowColorScheme===null)delete el.dataset.svgShadowColorScheme;
}

function updateSvgStyle(prop,val){
  if(!sel||sel.dataset.type!=='svg')return;
  pushUndo();
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  const propMap={opacity:'svgOpacity',shadow:'svgShadow',shadowBlur:'svgShadowBlur',shadowSize:'svgShadowSize',shadowColor:'svgShadowColor'};
  const key=propMap[prop];if(!key)return;
  const parsed=prop==='shadow'?!!val:(prop==='opacity'||prop==='shadowBlur'||prop==='shadowSize')?+val:val;
  d[key]=parsed;
  sel.dataset[key]=parsed; // also store in DOM dataset for reliable save()
  if(prop==='shadow'){try{const opts=document.getElementById('svg-shadow-options');if(opts)opts.style.display=parsed?'flex':'none';}catch(e){}}
  applySvgStyles(sel,d);commitAll();
}

function updateSvgStyleScheme(prop, val, schemeRef) {
  if (!sel || sel.dataset.type !== 'svg') return;
  const d = slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  if (prop === 'shadowColor') {
    d.svgShadowColorScheme = schemeRef !== undefined ? (schemeRef || null) : d.svgShadowColorScheme;
    if (schemeRef) sel.dataset.svgShadowColorScheme = JSON.stringify(schemeRef);
    else delete sel.dataset.svgShadowColorScheme;
  }
  updateSvgStyle(prop, val);
}

function syncSvgProps(el,d){
  try{document.getElementById('svg-op').value=d.svgOpacity!=null?+d.svgOpacity:1;}catch(e){}
  try{document.getElementById('svg-shadow').checked=!!d.svgShadow;}catch(e){}
  try{const opts=document.getElementById('svg-shadow-options');if(opts)opts.style.display=d.svgShadow?'flex':'none';}catch(e){}
  try{document.getElementById('svg-sb').value=d.svgShadowBlur!=null?d.svgShadowBlur:15;}catch(e){}
  try{document.getElementById('svg-ss').value=d.svgShadowSize!=null?d.svgShadowSize:4;}catch(e){}
  try{const sc=d.svgShadowColor||'#000000';document.getElementById('svg-sc-preview').style.background=sc;}catch(e){}
}

function svgSetAsSlideBg(){
  if(!sel||sel.dataset.type!=='svg')return;
  pushUndo();
  const id=sel.dataset.id;
  const d=slides[cur].els.find(e=>e.id===id);
  if(!d||!d.svgContent)return;
  const src='data:image/svg+xml;utf8,'+encodeURIComponent(d.svgContent);
  const resolvedBg=typeof _resolveSlideColorBg==='function'?_resolveSlideColorBg(slides[cur]):null;
  slides[cur].bgImg={src,name:'SVG',mode:'cover',opacity:1,blur:0,tileSize:120,tileGap:10,tileRot:0};
  slides[cur].bg='custom';
  if(!slides[cur].bgc&&resolvedBg)slides[cur].bgc=resolvedBg;
  slides[cur].els=slides[cur].els.filter(e=>e.id!==id);
  const el=sel;
  desel();
  el.remove();
  if(typeof _applySlideBgToCanvas==='function')_applySlideBgToCanvas(slides[cur]);
  if(typeof syncSlideBgPreview==='function')syncSlideBgPreview();
  if(typeof syncSlideBgImageUI==='function')syncSlideBgImageUI();
  save();drawThumbs();saveState();
  if(typeof renderObjectsPanel==='function')renderObjectsPanel();
  toast(t('toastImgBg'),'ok');
}

function syncImgProps(el,d){
  try{document.getElementById('img-fit').value=d.imgFit||'contain';}catch(e){}
  try{document.getElementById('img-rx').value=d.imgRx||0;}catch(e){}
  try{document.getElementById('img-bw').value=d.imgBw||0;}catch(e){}
  try{
    const bc=d.imgBc||'#ffffff';
    document.getElementById('img-bc-hex').value=bc;
    document.getElementById('img-bc-preview').style.background=bc;
  }catch(e){}
  try{document.getElementById('img-shadow').checked=!!d.imgShadow;}catch(e){}
  try{const opts=document.getElementById('img-shadow-options');if(opts)opts.style.display=d.imgShadow?'flex':'none';}catch(e){}
  try{document.getElementById('img-sb').value=d.imgShadowBlur!=null?d.imgShadowBlur:15;}catch(e){}
  try{document.getElementById('img-ss').value=d.imgShadowSize!=null?d.imgShadowSize:4;}catch(e){}
  try{const sc=d.imgShadowColor||'#000000';document.getElementById('img-sc-preview').style.background=sc;}catch(e){}
  try{document.getElementById('img-op').value=d.imgOpacity!=null?+d.imgOpacity:1;}catch(e){}
  if(typeof syncImgBorderUI==='function')syncImgBorderUI(d);
}

// ── SVG ID isolation — prevents id conflicts between multiple SVGs in DOM ──
function _isolateSvgIds(svgStr, uid) {
  if (!svgStr || !uid) return svgStr;
  // Collect all id values defined in this SVG
  const ids = [];
  svgStr.replace(/\bid="([^"]+)"/g, (_, id) => { ids.push(id); return _; });
  svgStr.replace(/\bid='([^']+)'/g, (_, id) => { ids.push(id); return _; });
  if (!ids.length) return svgStr;
  // Replace all id definitions and references with prefixed versions
  let s = svgStr;
  ids.forEach(id => {
    const safe = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const newId = uid + '_' + safe;
    // Replace id="..." definitions
    s = s.replace(new RegExp('\\bid="' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'g'), 'id="' + newId + '"');
    s = s.replace(new RegExp("\\bid='" + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'", 'g'), "id='" + newId + "'");
    // Replace url(#...) references
    s = s.replace(new RegExp('url\\(#' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)', 'g'), 'url(#' + newId + ')');
    // Replace href="#..." and xlink:href="#..."
    s = s.replace(new RegExp('href="#' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'g'), 'href="#' + newId + '"');
    s = s.replace(new RegExp('xlink:href="#' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'g'), 'xlink:href="#' + newId + '"');
    // Replace fill="url(#...)" stroke="url(#...)" clip-path="url(#...)" etc.
  });
  return s;
}

function mkEl(d){
  const cv=document.getElementById('canvas');
  const el=document.createElement('div');
  el.className='el';el.dataset.id=d.id;el.dataset.type=d.type;
  if(d.isTrigger)el.dataset.isTrigger='true';
  if(d.link){el.dataset.link=d.link;el.classList.add('has-link');}
  if(d.linkt)el.dataset.linkt=d.linkt;
  if(d.rideConnId)el.dataset.rideConnId=d.rideConnId;
  if(d.anims&&d.anims.length)el.dataset.anims=JSON.stringify(d.anims);else el.dataset.anims='[]';
  if(d.rot)el.dataset.rot=d.rot;
  if(d.shapeFlipH){el.dataset.shapeFlipH='true';}
  if(d.shapeFlipV){el.dataset.shapeFlipV='true';}
  const rot=d.rot||0;
  const _sfx=(d.shapeFlipH)?-1:1;
  const _sfy=(d.shapeFlipV)?-1:1;
  const _sft=(_sfx===-1||_sfy===-1)?` scale(${_sfx},${_sfy})`:'';
  el.style.cssText='left:'+d.x+'px;top:'+d.y+'px;width:'+d.w+'px;height:'+d.h+'px;transform:rotate('+rot+'deg)'+_sft+';';
  if(d.rotPivotX||d.rotPivotY){
    el.dataset.rotPivotX=d.rotPivotX||0;
    el.dataset.rotPivotY=d.rotPivotY||0;
    // transformOrigin stays 50%50% — pivot handled via left/top during rotation
  }
  const c=document.createElement('div');c.className='ec';
  if(d.type==='table'){
    c.className='ec tbl-ec';
    c.style.cssText='width:100%;height:100%;overflow:visible;position:relative;';
    // table rendering happens after handles are added (at bottom of mkEl)
  }
  if(d.type==='text'){
    c.classList.add('tel');c.contentEditable='false';
    c.setAttribute('style',d.cs||'font-size:48px;font-weight:700;color:#fff;');
    if (d.bulletGap != null) el.dataset.bulletGap = d.bulletGap;
    const _fsM = _rtFontSizeFromCs(d.cs);
    const _defPlaceholder=(typeof getLang==='function'&&getLang()==='ru')?'Дважды кликните для редактирования':'Double-click to edit';
    const rawHtml=d.html||_defPlaceholder;
    c.innerHTML=typeof rtMigrateHtml==='function'?rtMigrateHtml(rawHtml, _fsM):rawHtml;
    if (typeof _rtNormalizeTextDisplay === 'function') _rtNormalizeTextDisplay(c, d.cs || '', d.bulletGap);
    // Re-attach bullet icon click handlers (onclick attr stripped by innerHTML assignment in some browsers)
    if (typeof _attachBulletClickHandlers==='function') _attachBulletClickHandlers(c);
    const _charCounter=document.createElement('div');
    _charCounter.className='char-counter';
    el.appendChild(_charCounter);
    if (typeof _rtUpdateCharCounter==='function') _rtUpdateCharCounter(el, c);
    c.addEventListener('dblclick',e=>{
      e.stopPropagation();
      c.contentEditable='true';
      if(typeof _toEditMode==='function') _toEditMode(c);
      if (typeof _rtNormalizeTextDisplay === 'function') _rtNormalizeTextDisplay(c, d.cs || '', d.bulletGap);
      c.focus();
      el.dataset.editing='true';el.style.cursor='text';
      // Prevent growing text from scrolling #cwrap
      el.style.overflow='visible';
      const _cwrap=document.getElementById('cwrap');
      if(_cwrap) _cwrap.style.overflow='hidden';
    });
    c.addEventListener('blur',()=>{
      if(el.dataset.editing!=='true')return;
      // If the focus-stealing click landed inside an open modal (e.g. the
      // bullet icon picker), don't tear down the editor yet — the modal's
      // own click handler still needs the live DOM to apply its change.
      if(typeof window._rtModalInteracting !== 'undefined' && window._rtModalInteracting) return;
      if(typeof window._finishTextEdit==='function') window._finishTextEdit(el);
    });
    c.addEventListener('input',()=>{
      if(typeof _rtCommit==='function') _rtCommit(); else save();
      if (typeof _rtUpdateCharCounter==='function') _rtUpdateCharCounter(el, c);
      // Перенос по ширине / вставка — тоже расширяем рамку
      requestAnimationFrame(()=>{
        if(typeof window._fitTextHeight==='function'){
          const _d=slides[cur]&&slides[cur].els.find(x=>x.id===el.dataset.id);
          if(_d&&window._fitTextHeight(_d)){
            el.style.height=_d.h+'px';
            if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
          }
        }
      });
    });
    c.addEventListener('keydown',e=>{
      if(e.key==='Escape'){
        if(typeof window._finishTextEdit==='function') window._finishTextEdit(el);
        else c.blur();
      }else e.stopPropagation();
    });
    if(typeof rtAttachSelectionTracking==='function')rtAttachSelectionTracking(el,c);
    // Restore background — deferred to after el.append(c) so querySelector('.ec') works
    if(d.valign){el.dataset.valign=d.valign;} // applied after cv.appendChild below
    // Restore text role + uppercase for headings
    if(d.textRole){
      el.dataset.textRole=d.textRole;
      if(d.textRole==='heading'){
        const c2=el.querySelector('.ec');
        if(c2&&!c2.getAttribute('style').includes('text-transform')){
          c2.setAttribute('style',(c2.getAttribute('style')||'')+';text-transform:uppercase;');
        }
      }
    }
    // Restore border
    if(d.textBorderW&&+d.textBorderW>0){el.dataset.textBorderW=d.textBorderW;el.dataset.textBorderColor=d.textBorderColor||'#ffffff';if(d.textBorderStyle)el.dataset.textBorderStyle=d.textBorderStyle;}
    if(window._textShadowActive&&window._textShadowActive(d)){
      if(d.textShadowBlur!=null)el.dataset.textShadowBlur=d.textShadowBlur;
      if(d.textShadowSize!=null)el.dataset.textShadowSize=d.textShadowSize;
      if(d.textShadowW&&+d.textShadowW>0&&!d.textShadowBlur&&!d.textShadowSize)el.dataset.textShadowW=d.textShadowW;
      el.dataset.textShadowColor=d.textShadowColor||'#000000';
    }
    if(window._textBlockShadowActive&&window._textBlockShadowActive(d)){
      if(d.textBlockShadowBlur!=null)el.dataset.textBlockShadowBlur=d.textBlockShadowBlur;
      if(d.textBlockShadowSize!=null)el.dataset.textBlockShadowSize=d.textBlockShadowSize;
      el.dataset.textBlockShadowColor=d.textBlockShadowColor||'#000000';
      if(d.textBlockShadowInset)el.dataset.textBlockShadowInset='1';
    }
    // Restore opacity
    if(d.elOpacity!=null&&+d.elOpacity!==1){el.dataset.elOpacity=d.elOpacity;el.style.opacity=d.elOpacity;}
    // Restore corner radius
    if(d.rx_tl||d.rx_tr||d.rx_bl||d.rx_br){
      el.dataset.rx_tl=d.rx_tl||0;el.dataset.rx_tr=d.rx_tr||0;
      el.dataset.rx_bl=d.rx_bl||0;el.dataset.rx_br=d.rx_br||0;
      el.dataset.rxUnit=d.rxUnit||'px';
    }
    if(d.pad_t!==undefined){
      el.dataset.pad_t=d.pad_t;el.dataset.pad_r=d.pad_r;
      el.dataset.pad_b=d.pad_b;el.dataset.pad_l=d.pad_l;
      el.dataset.padUnit=d.padUnit||'px';
    }
  }else if(d.type==='image'){
    c.classList.add('iel');const img=document.createElement('img');
    if(d.src)img.setAttribute('src',typeof assetUrl==='function'?assetUrl(d.src):d.src);
    img.draggable=false;
    const _onImgReady=()=>{
      if(typeof window._exportRememberImg==='function')window._exportRememberImg(img);
      if(typeof _preloadAlphaCanvas==='function')_preloadAlphaCanvas(img);
      if(d._pptxSrcRect&&typeof applyPptxSrcRectCrop==='function'&&applyPptxSrcRectCrop(el,d,img)){
        if(typeof applyImgStyles==='function')applyImgStyles(el,d);
      }
    };
    img.onload=_onImgReady;
    if(img.complete&&img.naturalWidth)_onImgReady();
    c.appendChild(img);
    // Store all img properties in dataset for reliable save()
    if(d.imgFit)el.dataset.imgFit=d.imgFit;
    if(d.imgRx!=null)el.dataset.imgRx=d.imgRx;
    if(d.imgBw!=null)el.dataset.imgBw=d.imgBw;
    if(d.imgBc)el.dataset.imgBc=d.imgBc;
    if(d.imgBorderStyle)el.dataset.imgBorderStyle=d.imgBorderStyle;
    if(d.imgFrame)el.dataset.imgFrame=d.imgFrame;
    if(d.imgShadow!=null)el.dataset.imgShadow=d.imgShadow;
    if(d.imgShadowBlur!=null)el.dataset.imgShadowBlur=d.imgShadowBlur;
    if(d.imgShadowSize!=null)el.dataset.imgShadowSize=d.imgShadowSize;
    if(d.imgShadowColor)el.dataset.imgShadowColor=d.imgShadowColor;
    if(d.imgShadowColorScheme)el.dataset.imgShadowColorScheme=JSON.stringify(d.imgShadowColorScheme);
    else if(d.imgShadowColorScheme===null)delete el.dataset.imgShadowColorScheme;
    if(d.imgOpacity!=null)el.dataset.imgOpacity=d.imgOpacity;
    if(d.imgPosX)el.dataset.imgPosX=d.imgPosX;
    if(d.imgPosY)el.dataset.imgPosY=d.imgPosY;
    // Always store crop in dataset so save() reads correct values even without _exitCropMode
    el.dataset.imgCropL=d.imgCropL||0;
    el.dataset.imgCropT=d.imgCropT||0;
    el.dataset.imgCropR=d.imgCropR||0;
    el.dataset.imgCropB=d.imgCropB||0;
    el.dataset.imgFlipH=d.imgFlipH?'true':'false';
    el.dataset.imgFlipV=d.imgFlipV?'true':'false';
    // QR Code fields
    if(d._isQR){
      el.dataset.isQR='true';
      el.dataset.qrText=d.qrText||'';
      el.dataset.qrBg=d.qrBg||'#ffffff';
      el.dataset.qrColor=d.qrColor||'#000000';
      el.dataset.qrRx=d.qrRx!=null?d.qrRx:16;
    }
  }else if(d.type==='code'){
    // will call renderCodeEl after el.append
  }else if(d.type==='markdown'){
    c.classList.add('md-el');
    c.style.cssText=`width:100%;height:100%;overflow:auto;padding:14px 16px;box-sizing:border-box;line-height:1.65;font-size:${d.mdFs||16}px;color:${d.mdColor||'#ffffff'};--md-c:${d.mdColor||'#ffffff'};`;
    c.innerHTML=d.mdHtml||markdownToHtml(d.mdRaw||'');
    c.addEventListener('dblclick',e=>{e.stopPropagation();if(typeof openMdEditor==='function')openMdEditor();});
    // Restore bg
    if(d.textBg||d.textBgBlur||d.textBgGrad){el.dataset.textBg=d.textBg||'';if(d.textBgOp!=null)el.dataset.textBgOp=d.textBgOp;if(d.textBgBlur)el.dataset.textBgBlur=d.textBgBlur;if(d.textBgGrad)el.dataset.textBgGrad='1';if(d.textBgCol2)el.dataset.textBgCol2=d.textBgCol2;if(d.textBgDir!=null)el.dataset.textBgDir=d.textBgDir;if(typeof applyTextBg==='function')applyTextBg(el);}
    else if(d.textBgBlur>0){el.dataset.textBgBlur=d.textBgBlur;if(typeof applyTextBg==='function')applyTextBg(el);}
    // Restore border
    if(d.textBorderW&&+d.textBorderW>0){el.dataset.textBorderW=d.textBorderW;el.dataset.textBorderColor=d.textBorderColor||'#ffffff';if(typeof _applyMdBorder==='function')_applyMdBorder(el);}
    // Restore radius
    if(d.rx_tl||d.rx_tr||d.rx_bl||d.rx_br){el.dataset.rx_tl=d.rx_tl||0;el.dataset.rx_tr=d.rx_tr||0;el.dataset.rx_bl=d.rx_bl||0;el.dataset.rx_br=d.rx_br||0;if(typeof _applyMdRadius==='function')_applyMdRadius(el);}
  }else if(d.type==='shape'){
    const wrap=document.createElement('div');wrap.className='sel-el';
    wrap.style.cssText='position:absolute;inset:0;';
    const svgDiv=document.createElement('div');svgDiv.className='shape-svg';svgDiv.style.cssText='position:absolute;inset:0;overflow:visible;';
    svgDiv.innerHTML=buildShapeSVG(d,d.w,d.h);
    const _sh=typeof SHAPES!=='undefined'&&SHAPES.find(s=>s.id===d.shape);
    const _isCallout=_sh&&_sh.special==='callout';
    const txt=document.createElement('div');txt.className='shape-text';
    const _baseTextCss=d.shapeTextCss||'font-size:24px;font-weight:700;color:#ffffff;text-align:center;';
    txt.setAttribute('style',_baseTextCss);
    if(_isCallout){
      const _sw2=d.sw||2;
      txt.style.position='absolute';txt.style.inset=_sw2+'px';txt.style.padding='8px';
      txt.style.display='flex';txt.style.flexDirection='column';
      txt.style.alignItems='center';txt.style.justifyContent='center';txt.style.textAlign='center';
    }
    const _txtInner=document.createElement('div');
    _txtInner.style.cssText='width:100%;text-align:center;min-height:1em;outline:none;';
    _txtInner.innerHTML=d.shapeHtml||'';
    txt.appendChild(_txtInner);

    function _activateShapeTxt(){
      if(_txtInner.contentEditable==='true')return;
      el.dataset.editing='true';
      _txtInner.contentEditable='true';
      txt.style.pointerEvents='auto';
      _txtInner.focus();
      const range=document.createRange();range.selectNodeContents(_txtInner);range.collapse(false);
      const sel2=window.getSelection();sel2.removeAllRanges();sel2.addRange(range);
    }
    function _onShapeDblclick(e){
      if(e.target.closest('.rh')||e.target.closest('.db'))return;
      e.stopPropagation();
      if(typeof pick==='function'&&sel!==el) pick(el);
      _activateShapeTxt();
    }

    const svgEl=svgDiv.querySelector('svg');
    if(svgEl){
      svgEl.style.pointerEvents='none';
      svgEl.querySelectorAll('path,rect,ellipse,circle,polygon,polyline').forEach(p=>{
        p.style.pointerEvents='visibleFill';
        p.style.cursor='move';
        p.addEventListener('mouseenter',()=>el.classList.add('svg-hovered'));
        p.addEventListener('mouseleave',()=>el.classList.remove('svg-hovered'));
        p.addEventListener('dblclick', _onShapeDblclick);
      });
    }
    txt.addEventListener('dblclick', _onShapeDblclick);
    _txtInner.addEventListener('blur',()=>{
      _txtInner.contentEditable='false';
      txt.style.pointerEvents='none';
      el.dataset.editing='false';
      const _dTxt=slides[cur]&&slides[cur].els.find(ev=>ev.id===el.dataset.id);
      if(_dTxt) _dTxt.shapeHtml=_txtInner.innerHTML;
      commitAll();
    });
    _txtInner.addEventListener('keydown',e=>{
      if(e.key==='Escape'){_txtInner.blur();return;}
      if(e.key==='Enter'){
        e.preventDefault();
        document.execCommand('insertParagraph',false);
        // Ensure new paragraph is centered
        const _sel3=window.getSelection();
        if(_sel3&&_sel3.rangeCount){
          const _node=_sel3.getRangeAt(0).startContainer;
          const _par=_node.nodeType===3?_node.parentElement:_node;
          if(_par&&_par!==_txtInner) _par.style.textAlign='center';
        }
      }
    });
    _txtInner.addEventListener('input',()=>{
      _txtInner.querySelectorAll('div,p').forEach(n=>n.style.textAlign='center');
      const _dTxt2=slides[cur]&&slides[cur].els.find(ev=>ev.id===el.dataset.id);
      if(_dTxt2) _dTxt2.shapeHtml=_txtInner.innerHTML;
      save();
    });
    // dblclick on wrap (full bounding box) — works regardless of fill opacity
    wrap.addEventListener('dblclick', _onShapeDblclick);
    wrap.append(svgDiv,txt);c.appendChild(wrap);
    el.dataset.shape=d.shape;el.dataset.fill=d.fill||'#3b82f6';el.dataset.stroke=d.stroke||'#1d4ed8';
    if(d.fillGrad!=null){el.dataset.fillGrad=d.fillGrad?'1':'0';}
    if(d.fillGrad2)el.dataset.fillGrad2=d.fillGrad2;
    if(d.fillGradDir!=null)el.dataset.fillGradDir=d.fillGradDir;
    if(d.cloudSeed!=null){el.dataset.cloudSeed=d.cloudSeed;}
    if(d.cloudForm){el.dataset.cloudForm=d.cloudForm;}
    if(d.cloudRefW>0){el.dataset.cloudRefW=d.cloudRefW;}
    if(d.cloudRefH>0){el.dataset.cloudRefH=d.cloudRefH;}
    if(d.cloudFramed){el.dataset.cloudFramed='1';}
    if(d.paraSkew!=null){el.dataset.paraSkew=d.paraSkew;}
    if(d.shape==='chevron'||d.shape==='chevronLeft'){
      if(d.chevSkew==null) d.chevSkew=25;
      el.dataset.chevSkew=d.chevSkew;
    }
    if(d.shape==='curve'){
      if(!d.curvePoints&&typeof _defaultCurvePoints==='function') d.curvePoints=_defaultCurvePoints();
      if(d.curvePoints) el.dataset.curvePoints=JSON.stringify(d.curvePoints);
    }
    if(d.starRays!=null){el.dataset.starRays=d.starRays;}
    if(d.starInner!=null){el.dataset.starInner=d.starInner;}
    if(d.polySides!=null){el.dataset.polySides=d.polySides;}
    if(d.arcMode){el.dataset.arcMode=d.arcMode;}
    if(d.arcStart!=null){el.dataset.arcStart=d.arcStart;}
    if(d.arcEnd!=null){el.dataset.arcEnd=d.arcEnd;}
    if(d.tailX!==undefined){el.dataset.tailX=d.tailX;el.dataset.tailY=d.tailY;}
    el.dataset.sw=d.sw!=null?d.sw:2;el.dataset.rx=d.rx||0;el.dataset.fillOp=d.fillOp!=null?d.fillOp:1;
    el.dataset.shadow=d.shadow?'true':'false';
    el.dataset.shadowBlur=d.shadowBlur!=null?d.shadowBlur:4;
    el.dataset.shadowSize=d.shadowSize!=null?d.shadowSize:3;
    el.dataset.shadowColor=d.shadowColor||'#000000';
    if(d.shadowColorScheme)el.dataset.shadowColorScheme=JSON.stringify(d.shadowColorScheme);
    else if(d.shadowColorScheme===null)delete el.dataset.shadowColorScheme;
    if(d.strokeStyle)el.dataset.strokeStyle=d.strokeStyle;
    // Apply clip-path so hit area matches shape, not bounding box
    _applyShapeClipPath(el, d);
    el.addEventListener('dblclick', _onShapeDblclick);
  }else if(d.type==='formula'){
    c.style.cssText='width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:visible;';
    c.style.color = d.formulaColor || '#ffffff';
    if(d.formulaSvg){
      c.innerHTML = d.formulaSvg;
      const svgEl=c.querySelector('svg');
      if(svgEl){svgEl.style.width='100%';svgEl.style.height='100%';}
    } else {
      c.innerHTML='<span style="opacity:.5;font-size:13px;">формула</span>';
    }
    el.dataset.formulaColor = d.formulaColor || '#ffffff';
    el.addEventListener('dblclick', e => {
      e.stopPropagation();
      if(typeof openFormulaEditor==='function') openFormulaEditor(el);
    });
  }else if(d.type==='graph'){
    c.style.cssText='width:100%;height:100%;overflow:hidden;border-radius:6px;position:relative;';
    if(d.graphKind) el.dataset.graphKind = d.graphKind;
    if(d.graphImg){
      const _gi=document.createElement('img');
      _gi.src=d.graphImg;
      // Chem: contain keeps formula unstretched if size drifts; fn graphs fill axes area
      _gi.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:'+(d.graphKind==='chem'||d.graphKind==='logic'?'contain':'fill')+';display:block;pointer-events:none;user-select:none;';
      c.appendChild(_gi);
    } else {
      const _gph=document.createElement('div');
      _gph.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.4;font-size:13px;pointer-events:none;';
      _gph.textContent=d.graphKind==='logic'?'⚡':(d.graphKind==='chem'?'🧪':'📈');
      c.appendChild(_gph);
    }
    // Transparent hit-area on top so mousedown always reaches el through mkDrag
    const _ghit=document.createElement('div');
    _ghit.style.cssText='position:absolute;inset:0;z-index:1;';
    c.appendChild(_ghit);
    if((d.graphKind==='chem'||d.graphKind==='logic') && typeof window._applyChemGraphStyle==='function'){
      if(d.graphBg) el.dataset.graphBg = d.graphBg;
      if(d.graphBgOp!=null) el.dataset.graphBgOp = String(d.graphBgOp);
      if(d.graphBgBlur!=null) el.dataset.graphBgBlur = String(d.graphBgBlur);
      if(d.graphColor) el.dataset.graphColor = d.graphColor;
      if(d.graphBgScheme) el.dataset.graphBgScheme = JSON.stringify(d.graphBgScheme);
      // Apply after el is in DOM tree — caller appends el after mkEl returns,
      // so defer one frame.
      requestAnimationFrame(function(){ window._applyChemGraphStyle(el, d); });
    }
  }else if(d.type==='svg'){
    // Use DOMParser so SVG SMIL animations (<animate>, <animateTransform>) work correctly.
    // innerHTML uses the HTML parser which drops unknown SVG animation elements.
    const _svgRaw=d.svgContent||'';
    if(!_svgRaw.trim()){
      // Пустой SVG (например после lite-импорта до refreshDecor) — не парсить,
      // иначе браузер вставит страницу «Document is empty».
      c.innerHTML='';
    } else {
    // Isolate SVG IDs to prevent conflicts between multiple SVGs in DOM
    const _svgUid = 'svg_' + (d.id||('u'+Math.random().toString(36).slice(2)));
    const _svgStr = _isolateSvgIds(_svgRaw, _svgUid);
    try{
      const _dp=new DOMParser();
      const _doc=_dp.parseFromString(_svgStr,'image/svg+xml');
      const _parsed=_doc.documentElement;
      const _bad=!_parsed || _parsed.tagName==='parsererror' || (_parsed.localName||'').toLowerCase()==='html'
        || !!_doc.querySelector('parsererror');
      if(!_bad){
        c.appendChild(document.adoptNode(_parsed));
      } else { c.innerHTML=''; }
    }catch(e){ c.innerHTML=''; }
    }
    const svgEl=c.querySelector('svg');
    if(svgEl){svgEl.style.width='100%';svgEl.style.height='100%';}
    // Decor elements: fully locked, not interactive
    if(d._isDecor){
      el.style.pointerEvents='none';
      el.style.zIndex='0';
      el.style.cursor='default';
      el.classList.add('decor-el');
      if(svgEl){
        svgEl.style.pointerEvents='none';
        svgEl.setAttribute('pointer-events','none');
        try{ svgEl.querySelectorAll('*').forEach(n=>{ n.style.pointerEvents='none'; if(n.setAttribute) n.setAttribute('pointer-events','none'); }); }catch(e){}
      }
      if(typeof _ensureGlDecorCfg==='function') _ensureGlDecorCfg(d);
      else if(typeof _ensureCrystalCfg==='function') _ensureCrystalCfg(d);
      const _glCfg=d._glCfg||d._crystalCfg;
      const _GlDecor=typeof _glDecorByRenderer==='function'?_glDecorByRenderer(d._decorRenderer)
        :(d._decorRenderer==='crystal'&&typeof CrystalDecor!=='undefined'?CrystalDecor
        :(d._decorRenderer==='dna'&&typeof DnaDecor!=='undefined'?DnaDecor
        :(d._decorRenderer==='galaxy'&&typeof GalaxyDecor!=='undefined'?GalaxyDecor
        :(d._decorRenderer==='caustics'&&typeof CausticsDecor!=='undefined'?CausticsDecor:null))));
      if(_GlDecor && _glCfg){
        c.style.position='relative';
        const _glLayer=document.createElement('div');
        _glLayer.className='decor-gl-layer';
        _glLayer.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:1;';
        c.appendChild(_glLayer);
        el._glDecorUnmount=_GlDecor.mount(_glLayer, Object.assign({id:d.id}, _glCfg));
      }
    }
  }else if(d.type==='icon'){
    c.style.cssText='width:100%;height:100%;overflow:visible;display:flex;align-items:center;justify-content:center;';
    // If icon was fitted, use saved svgContent (has tight viewBox); otherwise rebuild
    const _mkIc=typeof ICONS!=='undefined'?ICONS.find(function(x){return x.id===d.iconId;}):null;
    const _mkShadow=d.shadow===true||d.shadow==='true';
    const _mkSvg=d.iconFitted&&d.svgContent
      ? d.svgContent
      : ((_mkIc&&typeof _buildIconSVG==='function')
          ?_buildIconSVG(_mkIc,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle||'stroke',_mkShadow,d.shadowBlur,d.shadowColor,d.shadowSize,d.id)
          :(d.svgContent||''));
    const _iconSvgRaw = _mkSvg;
    const _iconUid = 'icon_' + (d.id||('u'+Math.random().toString(36).slice(2)));
    c.innerHTML = _isolateSvgIds(_iconSvgRaw, _iconUid);
    const svgEl2=c.querySelector('svg');
    if(svgEl2){svgEl2.style.width='100%';svgEl2.style.height='100%';}
    el.dataset.iconId=d.iconId||'';
    el.dataset.iconColor=d.iconColor||'#3b82f6';
    el.dataset.iconSw=d.iconSw!=null?d.iconSw:1.8;
    el.dataset.iconStyle=d.iconStyle||'stroke';
    el.dataset.shadow=_mkShadow?'true':'false';
    el.dataset.shadowBlur=d.shadowBlur!=null?d.shadowBlur:4;
    el.dataset.shadowSize=d.shadowSize!=null?d.shadowSize:3;
    el.dataset.shadowColor=d.shadowColor||'#000000';
    if(d.shadowColorScheme)el.dataset.shadowColorScheme=JSON.stringify(d.shadowColorScheme);
    else if(d.shadowColorScheme===null)delete el.dataset.shadowColorScheme;
    // Double-click to replace icon
    el.addEventListener('dblclick',function(e){e.stopPropagation();window._iconReplaceMode=true;if(typeof openIconModal==='function')openIconModal();});
    }else if(d.type==='applet'){
    const wrap=document.createElement('div');wrap.className='applet-el'+(d.appletId==='counter'?' applet-counter':'');
    // Layer 1: clip div — clips iframe to border-radius
    const clip=document.createElement('div');
    clip.style.cssText='position:absolute;inset:0;overflow:hidden;border-radius:inherit;';
    if(typeof ensureAppletHtmlFromData==='function') ensureAppletHtmlFromData(d);
    const iframe=document.createElement('iframe');iframe.srcdoc=d.appletHtml||'<p>Applet</p>';
    iframe.style.cssText='width:100%;height:100%;border:none;background:transparent;';
    iframe.setAttribute('allowtransparency','true');
    // flip нужен allow-same-origin — иначе картинки из галереи не грузятся в srcdoc
    iframe.sandbox = d.appletId==='flip' ? 'allow-scripts allow-same-origin' : 'allow-scripts';
    if(d.appletId==='flip'){
      clip.style.overflow='visible';
      clip.style.background='transparent';
      clip.style.borderRadius='0';
      wrap.style.background='transparent';
      wrap.style.overflow='visible';
      iframe.style.background='transparent';
    }
    if(d.appletId==='generator'||d.appletId==='counter'||d.appletId==='timer'||d.appletId==='clock'){
      iframe.addEventListener('load', function(){
        if(d.appletId==='generator'&&typeof refreshGeneratorEl==='function') refreshGeneratorEl(d.id, {domOnly:true});
        else if(d.appletId==='counter'&&typeof refreshCounterEl==='function') refreshCounterEl(d.id, {domOnly:true});
        else if(d.appletId==='timer'&&typeof refreshTimerEl==='function') refreshTimerEl(d.id, {domOnly:true});
        else if(d.appletId==='clock'&&typeof refreshClockEl==='function') refreshClockEl(d.id, {domOnly:true});
      }, {once:true});
    }
    if(d.appletId==='notes'){
      iframe.addEventListener('load', function(){
        if(typeof refreshNotesEl==='function') refreshNotesEl(d.id, {domOnly:true});
      }, {once:true});
    }
    clip.appendChild(iframe);
    // Layer 2: border overlay div — sits ON TOP of clip, pointer-events:none, never clipped
    const bord=document.createElement('div');bord.className='applet-border-overlay';
    bord.style.cssText='position:absolute;inset:0;border-radius:inherit;pointer-events:none;box-sizing:border-box;';
    wrap.append(clip,bord);c.appendChild(wrap);
    el.dataset.appletId=d.appletId||'';
    el.dataset.appletHtml=d.appletHtml||'';
    if(d._appletAspect)el.dataset.appletAspect=d._appletAspect;
    // Write generator fields to dataset so save() can read them back
    if(d.appletId==='generator'){
      el.dataset.genMin         = d.genMin         !== undefined ? d.genMin         : 1;
      el.dataset.genMax         = d.genMax         !== undefined ? d.genMax         : 100;
      el.dataset.genStep        = d.genStep        !== undefined ? d.genStep        : 1;
      el.dataset.genMode        = d.genMode        || 'number';
      el.dataset.genLines       = encodeURIComponent(d.genLines || '');
      el.dataset.genFontSize    = d.genFontSize    !== undefined ? d.genFontSize    : 64;
      el.dataset.genColor       = d.genColor       || '';
      el.dataset.genBg          = d.genBg          || '';
      el.dataset.genBgBlur      = d.genBgBlur      !== undefined ? d.genBgBlur      : 0;
      el.dataset.genBorderColor = d.genBorderColor || '';
      el.dataset.genBorderWidth = d.genBorderWidth !== undefined ? d.genBorderWidth : 0;
      el.dataset.genBgOp        = d.genBgOp        !== undefined ? d.genBgOp        : 1;
      el.dataset.genShadowOn    = d.genShadowOn    !== undefined ? (d.genShadowOn ? 'true' : 'false') : 'true';
      el.dataset.genShadowBlur  = d.genShadowBlur  !== undefined ? d.genShadowBlur  : 8;
      el.dataset.genShadowColor = d.genShadowColor || '';
      el.dataset.genBold        = d.genBold ? 'true' : 'false';
      el.dataset.genAlign       = d.genAlign       || 'center';
      el.dataset.genVAlign      = d.genVAlign      || 'middle';
      el.dataset.genColorScheme  = d.genColorScheme  ? JSON.stringify(d.genColorScheme)  : '';
      el.dataset.genBgScheme     = d.genBgScheme     ? JSON.stringify(d.genBgScheme)     : '';
      el.dataset.genBorderScheme = d.genBorderScheme ? JSON.stringify(d.genBorderScheme) : '';
    }
    if(d.appletId==='counter'){
      el.dataset.cntStart       = d.cntStart !== undefined ? d.cntStart : 0;
      el.dataset.cntGoal        = d.cntGoal !== undefined && d.cntGoal !== null && d.cntGoal !== '' ? d.cntGoal : '';
      el.dataset.cntOnEnd       = d.cntOnEnd || 'none';
      el.dataset.cntOnEndSlide  = d.cntOnEndSlide !== undefined ? d.cntOnEndSlide : 0;
      el.dataset.cntOnEndAnim   = d.cntOnEndAnim || '';
      el.dataset.cntGroupId     = d.cntGroupId || '';
      el.dataset.genStep        = d.genStep !== undefined ? d.genStep : 1;
      el.dataset.genFontSize    = d.genFontSize !== undefined ? d.genFontSize : 64;
      el.dataset.genColor       = d.genColor || '';
      el.dataset.genBg          = d.genBg || '';
      el.dataset.genBgBlur      = d.genBgBlur !== undefined ? d.genBgBlur : 0;
      el.dataset.genBorderColor = d.genBorderColor || '';
      el.dataset.genBorderWidth = d.genBorderWidth !== undefined ? d.genBorderWidth : 0;
      el.dataset.genBgOp        = d.genBgOp !== undefined ? d.genBgOp : 1;
      el.dataset.genShadowOn    = d.genShadowOn !== undefined ? (d.genShadowOn ? 'true' : 'false') : 'true';
      el.dataset.genShadowBlur  = d.genShadowBlur !== undefined ? d.genShadowBlur : 8;
      el.dataset.genShadowColor = d.genShadowColor || '';
      el.dataset.genBold        = d.genBold ? 'true' : 'false';
      el.dataset.genAlign       = d.genAlign || 'center';
      el.dataset.genVAlign      = d.genVAlign || 'middle';
      el.dataset.genColorScheme  = d.genColorScheme ? JSON.stringify(d.genColorScheme) : '';
      el.dataset.genBgScheme     = d.genBgScheme ? JSON.stringify(d.genBgScheme) : '';
      el.dataset.genBorderScheme = d.genBorderScheme ? JSON.stringify(d.genBorderScheme) : '';
    }
    // Restore border-radius — apply to wrap (clip div inherits it), border stays visible
    if(d.rx){
      const r=d.rx+'px';
      el.style.borderRadius=r;
      wrap.style.borderRadius=r;
    }
    // Always store rx in dataset so save() can read it back (even when 0)
    el.dataset.genRx = d.rx !== undefined ? d.rx : 0;
    if(d.appletId==='timer'){
      el.dataset.tmMin          = d.tmMin          !== undefined ? d.tmMin          : 5;
      el.dataset.tmSec          = d.tmSec          !== undefined ? d.tmSec          : 0;
      el.dataset.tmOnEnd        = d.tmOnEnd        || 'none';
      el.dataset.tmOnEndSlide   = d.tmOnEndSlide   !== undefined ? d.tmOnEndSlide   : 0;
      el.dataset.tmOnEndAnim    = d.tmOnEndAnim    || '';
      el.dataset.genFontSize    = d.genFontSize     !== undefined ? d.genFontSize    : 72;
      el.dataset.genColor       = d.genColor        || '';
      el.dataset.genBg          = d.genBg           || '';
      el.dataset.genBgBlur      = d.genBgBlur       !== undefined ? d.genBgBlur      : 0;
      el.dataset.genBorderColor = d.genBorderColor  || '';
      el.dataset.genBorderWidth = d.genBorderWidth  !== undefined ? d.genBorderWidth : 0;
      el.dataset.genBgOp        = d.genBgOp         !== undefined ? d.genBgOp        : 1;
      el.dataset.genShadowOn    = d.genShadowOn     !== undefined ? (d.genShadowOn ? 'true' : 'false') : 'true';
      el.dataset.genShadowBlur  = d.genShadowBlur   !== undefined ? d.genShadowBlur  : 8;
      el.dataset.genShadowColor = d.genShadowColor  || '';
      el.dataset.genBold        = d.genBold ? 'true' : 'false';
      el.dataset.genAlign       = d.genAlign        || 'center';
      el.dataset.genVAlign      = d.genVAlign       || 'middle';
      el.dataset.genColorScheme  = d.genColorScheme  ? JSON.stringify(d.genColorScheme)  : '';
      el.dataset.genBgScheme     = d.genBgScheme     ? JSON.stringify(d.genBgScheme)     : '';
      el.dataset.genBorderScheme = d.genBorderScheme ? JSON.stringify(d.genBorderScheme) : '';
    }
    if(d.appletId==='clock'){
      el.dataset.genFontSize    = d.genFontSize    !== undefined ? d.genFontSize    : 48;
      el.dataset.genColor       = d.genColor       || '';
      el.dataset.genBg          = d.genBg          || '';
      el.dataset.genBgBlur      = d.genBgBlur      !== undefined ? d.genBgBlur      : 0;
      el.dataset.genBorderColor = d.genBorderColor || '';
      el.dataset.genBorderWidth = d.genBorderWidth !== undefined ? d.genBorderWidth : 0;
      el.dataset.genBgOp        = d.genBgOp        !== undefined ? d.genBgOp        : 1;
      el.dataset.genShadowOn    = d.genShadowOn    !== undefined ? (d.genShadowOn ? 'true' : 'false') : 'true';
      el.dataset.genShadowBlur  = d.genShadowBlur  !== undefined ? d.genShadowBlur  : 8;
      el.dataset.genShadowColor = d.genShadowColor || '';
      el.dataset.genBold        = d.genBold ? 'true' : 'false';
      el.dataset.genAlign       = d.genAlign       || 'center';
      el.dataset.genVAlign      = d.genVAlign      || 'middle';
      el.dataset.genColorScheme  = d.genColorScheme  ? JSON.stringify(d.genColorScheme)  : '';
      el.dataset.genBgScheme     = d.genBgScheme     ? JSON.stringify(d.genBgScheme)     : '';
      el.dataset.genBorderScheme = d.genBorderScheme ? JSON.stringify(d.genBorderScheme) : '';
    }
    if(d.appletId==='notes'){
      el.dataset.notesText = encodeURIComponent(d.notesText || '');
      el.dataset.notesBg = d.notesBg || '';
    }
    if(d.appletId==='periodic'){
      el.dataset.pteSymbol = d.pteSymbol || 'Fe';
      el.dataset.pteIcon = d.pteIcon ? 'true' : 'false';
      el.dataset.genColor = d.genColor || '';
      el.dataset.genBg = d.genBg || '';
      el.dataset.genBgOp = d.genBgOp != null ? d.genBgOp : 0.92;
      el.dataset.genBgBlur = d.genBgBlur != null ? d.genBgBlur : 0;
      el.dataset.genColorScheme = d.genColorScheme ? JSON.stringify(d.genColorScheme) : '';
      el.dataset.genBgScheme = d.genBgScheme ? JSON.stringify(d.genBgScheme) : '';
      el.addEventListener('dblclick', function(e){
        e.stopPropagation();
        if(typeof pick==='function') pick(el);
        if(typeof openPeriodicModal==='function') openPeriodicModal({mode:'reselect', elId:el.dataset.id||d.id});
      });
    }
    if(d.appletId==='flip'){
      el.dataset.flipFace = d.flipFace === 'back' ? 'back' : 'front';
      el.dataset.flipFrontText = encodeURIComponent(d.flipFrontText || '');
      el.dataset.flipBackText = encodeURIComponent(d.flipBackText || '');
      el.dataset.flipFrontImg = d.flipFrontImg || '';
      el.dataset.flipBackImg = d.flipBackImg || '';
      el.dataset.genColor = d.genColor || '';
      el.dataset.genBg = d.genBg || '';
      el.dataset.genBgOp = d.genBgOp != null ? d.genBgOp : 0.92;
      el.dataset.genBgBlur = d.genBgBlur != null ? d.genBgBlur : 0;
      el.dataset.genColorScheme = d.genColorScheme ? JSON.stringify(d.genColorScheme) : '';
      el.dataset.genBgScheme = d.genBgScheme ? JSON.stringify(d.genBgScheme) : '';
      el.style.overflow = 'visible';
      el.style.cursor = 'pointer';
      const iframe = el.querySelector('iframe');
      if(iframe){
        iframe.style.pointerEvents = 'none';
        iframe.style.background = 'transparent';
      }
      if(typeof _layoutFlipIframe==='function') _layoutFlipIframe(el, d);
    }
  }else if(d.type==='pagenum'){
    c.style.cssText='width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:visible;pointer-events:none;';
    c.innerHTML=d.html||'';
    if(d.elOpacity!=null&&+d.elOpacity!==1)el.style.opacity=d.elOpacity;
    el.style.cursor='default';
  }
  const lb=document.createElement('div');lb.className='link-bar';
  const trigBadge=document.createElement('div');trigBadge.className='trigger-badge';trigBadge.textContent='🎯';
  // Decor and pagenum elements: no resize handles, no drag, no events
  if(!d._isDecor && d.type!=='pagenum'){
    const rhs=[
      {cls:'rh br',dx:1, dy:1, ax:0,ay:0},
      {cls:'rh tr',dx:1, dy:-1,ax:0,ay:1},
      {cls:'rh bl',dx:-1,dy:1, ax:1,ay:0},
      {cls:'rh tl',dx:-1,dy:-1,ax:1,ay:1},
      {cls:'rh tm',dx:0, dy:-1,ax:0,ay:1},
      {cls:'rh bm',dx:0, dy:1, ax:0,ay:0},
      {cls:'rh ml',dx:-1,dy:0, ax:1,ay:0},
      {cls:'rh mr',dx:1, dy:0, ax:0,ay:0},
    ];
    rhs.forEach(h=>{
      const rh=document.createElement('div');
      rh.setAttribute('class',h.cls);
      mkResize(el,rh,h);
      el.appendChild(rh);
    });
  }
  let _appendMain = c;
  if (d.type === 'text') {
    const body = document.createElement('div');
    body.className = '_text_body';
    body.style.cssText = 'position:absolute;inset:0;border-radius:inherit;overflow:hidden;z-index:0;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;';
    body.appendChild(c);
    _appendMain = body;
  }
  el.append(_appendMain, lb, trigBadge);cv.appendChild(el);
  if(d.type==='shape'&&typeof window._syncShapeShadowLayout==='function')window._syncShapeShadowLayout(el,d,d.w,d.h);
  // Управляем анимацией декора после вставки в DOM
  if(d._isDecor){
    setTimeout(function(){
      const _dsvg=el.querySelector('svg');
      if(!_dsvg) return;
      try{
        if(typeof _layoutAnimated!=='undefined' && !_layoutAnimated){
          if(typeof _decorPausedAt!=='undefined' && typeof _decorSvgSlideIndex==='function'){
            const _si=_decorSvgSlideIndex(_dsvg);
            if(_decorPausedAt.has(_si)) _dsvg.setCurrentTime(_decorPausedAt.get(_si));
          }
          _dsvg.pauseAnimations();
        } else {
          _dsvg.unpauseAnimations();
        }
      }catch(e){}
    }, 50);
  }
  // Restore text background here — after el.append(c) so .ec is queryable
  if(d.type==='text'){
    if(d.textBg){el.dataset.textBg=d.textBg;}
    if(d.textBgOp!=null)el.dataset.textBgOp=d.textBgOp;
    if(d.textBgGrad)el.dataset.textBgGrad='1'; else delete el.dataset.textBgGrad;
    if(d.textBgCol2)el.dataset.textBgCol2=d.textBgCol2; else delete el.dataset.textBgCol2;
    if(d.textBgDir!=null)el.dataset.textBgDir=d.textBgDir;
    if(d.textBgBlur>0)el.dataset.textBgBlur=d.textBgBlur;
    if(d.textColorGrad){
      el.dataset.textColorGrad='1';
      if(d.textColorGrad1)el.dataset.textColorGrad1=d.textColorGrad1;
      if(d.textColorGrad2)el.dataset.textColorGrad2=d.textColorGrad2;
      if(d.textColorGradDir!=null)el.dataset.textColorGradDir=d.textColorGradDir;
    }
    if(typeof applyTextBg==='function'){
      applyTextBg(el);
      // Second pass in next frame; also re-apply text color gradient after bg clears
      requestAnimationFrame(()=>{
        if(!el.isConnected)return;
        if(typeof applyTextBg==='function')applyTextBg(el);
        if(el.dataset.textColorGrad==='1'&&typeof applyTextColorGrad==='function')applyTextColorGrad(el);
      });
    }
    if(d.textColorGrad&&typeof applyTextColorGrad==='function')applyTextColorGrad(el);
  }
  if(d.valign&&d.type==='text'&&typeof applyTextVAlign==='function')applyTextVAlign(el,d.valign);
  if(d.type==='text'){
    if(typeof applyTextBorderStyle==='function')applyTextBorderStyle(el);
    if(d.rx_tl||d.rx_tr||d.rx_bl||d.rx_br){
      if(typeof applyTextRadius==='function')applyTextRadius(el);
    }
    if(d.pad_t!==undefined&&typeof applyTextPad==='function')applyTextPad(el);
  }
  if(d.type==='text'&&window._textShadowActive&&window._textShadowActive(d)&&typeof applyTextShadowStyle==='function'){
    // Re-apply last so radius/valign/body-wrap setup cannot restore overflow:hidden.
    applyTextShadowStyle(el);
  }
  if(d.type==='text'&&typeof applyTextBlockShadowStyle==='function'){
    applyTextBlockShadowStyle(el);
  }
  if(d.type==='table'&&d.tableBgBlur>0){
    el.style.backdropFilter=`blur(${d.tableBgBlur}px)`;el.style.webkitBackdropFilter=`blur(${d.tableBgBlur}px)`;}
  if(d.type==='svg'){el.addEventListener('dblclick',e=>{e.stopPropagation();if(typeof openSVGModalEdit==='function')openSVGModalEdit();});}
  if(d.type==='code'){renderCodeEl(el,d);el.addEventListener('dblclick',e=>{e.stopPropagation();if(typeof openCodeEditor==='function')openCodeEditor();});}
  if(d.type==='htmlframe'){renderHtmlFrameEl(el,d);el.addEventListener('dblclick',e=>{e.stopPropagation();if(typeof openHtmlFrameEditor==='function')openHtmlFrameEditor();});}
  if(d.type==='image')applyImgStyles(el,d);
  if(d.type==='svg')applySvgStyles(el,d);
  if(d.type==='table'&&typeof renderTableEl==='function'){if(typeof _tblSaveToDataset==='function')_tblSaveToDataset(el,d);renderTableEl(el,d);if(typeof _tblAttachResizeObs==='function')_tblAttachResizeObs(el,d);}
  // Restore elOpacity for all element types
  if(d.elOpacity!=null&&+d.elOpacity!==1){el.dataset.elOpacity=d.elOpacity;el.style.opacity=d.elOpacity;}
  // Restore shapeBlur via overlay
  if(d.type==='shape'&&d.shapeBlur>0){el.dataset.shapeBlur=d.shapeBlur;if(typeof _applyShapeBlur==='function')_applyShapeBlur(el);}
  // For shapes: apply elOpacity to inner svg so backdrop-filter coexists
  if(d.type==='shape'&&d.elOpacity!=null&&+d.elOpacity!==1){
    const _svg=el.querySelector('svg');if(_svg)_svg.style.opacity=d.elOpacity;
    const _st=el.querySelector('.shape-text');if(_st)_st.style.opacity=d.elOpacity;
    el.style.opacity=''; // don't set on el itself
  }
  if(d._isDecor)return; // done — no drag/events for decor
  if(d.type==='pagenum'){
    // pagenum: draggable but not selectable/resizable — custom lightweight drag
    let _ox,_oy,_ol,_ot,_on=false;
    el.style.cursor='move';
    el.addEventListener('mousedown',e=>{
      if(e.button!==0)return;
      e.preventDefault();e.stopPropagation();
      _on=true;_ox=e.clientX;_oy=e.clientY;_ol=parseInt(el.style.left);_ot=parseInt(el.style.top);
      el.style.outline='2px dashed rgba(255,255,255,.4)';
      const mm=e2=>{
        if(!_on)return;
        const _z=typeof _canvasZoom==='number'?_canvasZoom:1;
        el.style.left=(_ol+(e2.clientX-_ox)/_z)+'px';
        el.style.top=(_ot+(e2.clientY-_oy)/_z)+'px';
      };
      const mu=()=>{
        _on=false;
        el.style.outline='';
        document.removeEventListener('mousemove',mm);
        document.removeEventListener('mouseup',mu);
        const nx=parseInt(el.style.left), ny=parseInt(el.style.top);
        // Update data on current slide
        const d2=slides[cur]&&slides[cur].els.find(x=>x.id===el.dataset.id);
        if(d2){d2.x=nx;d2.y=ny;}
        // Propagate to all slides and save coords
        if(typeof pnOnDragEnd==='function') pnOnDragEnd(nx,ny);
        commitAll();
      };
      document.addEventListener('mousemove',mm);
      document.addEventListener('mouseup',mu);
    });
    return;
  }
  // Restore hover fx
  if(d.hoverFx){el.dataset.hoverFx=JSON.stringify(d.hoverFx);applyHoverFxEditor(el,d.hoverFx);}
  if(d.objHidden){el.style.opacity='0';el.style.pointerEvents='none';el.dataset.objHidden='1';}
  mkDrag(el,c);
  el.addEventListener('mousedown',ev=>{
    if(el.dataset.editing==='true')return; // let text editing handle it
    const cn=ev.target.className||'';
    if(typeof cn==='string'&&(cn.includes('rh')||cn.includes('db')))return;
    // PNG alpha passthrough handled in mkDrag via _findElAtPoint
    // For shapes: only pick if clicking on actual SVG shape fill, not empty bounding box area
    if(d.type==='shape'&&(d.shape==='curve')){
      // Curve: only selectable/draggable via actual stroke, not empty bbox
      const _isCurvePath = ev.target.tagName==='path' && ev.target.closest('.el')===el;
      // If part of multi-selection, always drag the group — don't passthrough
      if(typeof multiSel!=='undefined' && multiSel.size > 1 && multiSel.has(el)){
        // fall through to normal group drag
      } else if(!_isCurvePath){
        const _belowParent = (()=>{
          const _cv = document.getElementById('canvas');
          if (!_cv) return null;
          const _rect = _cv.getBoundingClientRect();
          const _sx = (typeof canvasW!=='undefined'?canvasW:_cv.offsetWidth)/_rect.width;
          const _sy = (typeof canvasH!=='undefined'?canvasH:_cv.offsetHeight)/_rect.height;
          const _cx = (ev.clientX-_rect.left)*_sx, _cy = (ev.clientY-_rect.top)*_sy;
          const _kids = Array.from(_cv.querySelectorAll('.el:not(.decor-el)'));
          for(let _i=_kids.length-1;_i>=0;_i--){
            const _p=_kids[_i]; if(_p===el) continue;
            const _px=parseInt(_p.style.left)||0,_py=parseInt(_p.style.top)||0;
            const _pw=parseInt(_p.style.width)||0,_ph=parseInt(_p.style.height)||0;
            if(parseFloat(_p.dataset.rot||0)!==0){
              const _ee=document.elementsFromPoint(ev.clientX,ev.clientY);
              for(const _e2 of _ee){const _ep=_e2.closest('.el');if(_ep&&_ep!==el&&!_ep.classList.contains('decor-el'))return _ep;}
              return null;
            }
            if(_cx>=_px&&_cx<=_px+_pw&&_cy>=_py&&_cy<=_py+_ph) return _p;
          }
          return null;
        })();
        if(_belowParent){
          ev.stopPropagation();
          if(typeof pickMulti==='function') pickMulti(_belowParent, false);
          else if(typeof pick==='function') pick(_belowParent);
          // Start drag on _belowParent immediately
          const _bl2=parseInt(_belowParent.style.left)||0, _bt2=parseInt(_belowParent.style.top)||0;
          window._anyDragging=true;
          const _ox2=ev.clientX, _oy2=ev.clientY;
          let _mv2=false;
          const _mm2=mv=>{
            if(typeof window._isPreviewActive==='function'&&window._isPreviewActive()){_mu2();return;}
            if(!_mv2){_mv2=true;if(typeof pushUndo==='function')pushUndo();}
            const _zoom2=typeof zoom!=='undefined'?zoom:1;
            let _nl2=_bl2+(mv.clientX-_ox2)/_zoom2,_nt2=_bt2+(mv.clientY-_oy2)/_zoom2;
            const _snChk2=document.getElementById('snap-chk');
            if(_snChk2&&_snChk2.checked&&typeof snapV==='function'){_nl2=snapV(_nl2);_nt2=snapV(_nt2);}
            _belowParent.style.left=_nl2+'px';
            _belowParent.style.top=_nt2+'px';
            if(typeof drawGuides==='function')drawGuides(_belowParent);
            if(typeof _updateHandlesOverlay==='function')_updateHandlesOverlay();
          };
          const _mu2=()=>{
            window._anyDragging=false;
            window._alphaPassthroughDrag=false;
            document.removeEventListener('mousemove',_mm2);
            document.removeEventListener('mouseup',_mu2);
            if(_mv2){
              if(typeof clearGuides==='function')clearGuides();
              if(typeof commitAll==='function')commitAll();
              const _bd2=slides[cur]&&slides[cur].els.find(e=>e.id===_belowParent.dataset.id);
              if(_bd2){_bd2.x=parseInt(_belowParent.style.left);_bd2.y=parseInt(_belowParent.style.top);}
              if(typeof save==='function')save();
              if(typeof drawThumbs==='function')drawThumbs();
              if(typeof saveState==='function')saveState();
            }
          };
          document.addEventListener('mousemove',_mm2);
          document.addEventListener('mouseup',_mu2);
          return;
        }
        // Nothing below — allow curve pick only if not already selected
        if(el.classList.contains('sel')) return; // keep curve selected, don't restart drag
      } // end else if(!_isCurvePath)
    }
    if(d.type==='shape'&&!el.classList.contains('sel')){
      if(d.shape!=='curve'){ // curve already handled above
        if(false){
      } else {
        const isSvgPart=ev.target.tagName==='path'||ev.target.tagName==='rect'||
          ev.target.tagName==='ellipse'||ev.target.tagName==='circle'||
          ev.target.tagName==='polygon'||ev.target.tagName==='polyline';
        const isHitArea=ev.target.classList&&ev.target.classList.contains('shape-hit-area');
        const _sh2=typeof SHAPES!=='undefined'?SHAPES.find(s=>s.id===el.dataset.shape):null;
        const isNoFillSelf=ev.target===el&&_sh2&&_sh2.noFill;
        if(!isSvgPart&&!isHitArea&&!isNoFillSelf&&!ev.target.closest('.shape-text')&&!ev.target.closest('.rh'))return;
      }
      } // end if(d.shape!=='curve')
    }
    ev.stopPropagation();
    // If element is already part of multi-selection, don't reset the group
    if(multiSel.size>1&&multiSel.has(el)&&!ev.shiftKey)return;
    // mkDrag already handles shiftKey via pickMulti — avoid double call
    if(ev.shiftKey) return;
    pickMulti(el, false);
  });
  // Note: ResizeObserver removed - renderShapeEl is called explicitly from mkResize
}
function pick(el){
  // Safety net: if a particle-animation preview left this element's ORIGINAL
  // node hidden (visibility:hidden / pointer-events:none) because its
  // cleanup timer got cancelled/skipped for some reason, force-restore it
  // here. Selecting via canvas click still works for elements where pointer
  // events pass through (they'd otherwise be permanently undraggable), and
  // this also covers selection via the Objects panel, which bypasses
  // pointer-events entirely.
  if (el && el._particlesOrigVis != null && !(el._particlesRun && !el._particlesRun.cancelled)) {
    if (typeof window._resetParticles === 'function') window._resetParticles(el);
    else if (typeof window._particlesShowOriginal === 'function') window._particlesShowOriginal(el);
  }
  // Remove arc/star handles when deselecting or switching element
  document.querySelectorAll('.arc-handle').forEach(h=>h.remove());
  document.querySelectorAll('.star-handle').forEach(h=>h.remove()); document.querySelectorAll('.para-handle').forEach(h=>h.remove()); document.querySelectorAll('.chev-handle').forEach(h=>h.remove()); document.querySelectorAll('.curve-handle').forEach(h=>h.remove()); if(typeof _curveSelPts!=='undefined'&&el!==sel)_curveSelPts.clear(); if(typeof _exitCurveEditMode==='function'&&el!==sel&&!(window._curveEditMode&&el===null))_exitCurveEditMode();
  // Deselect connector synchronously when picking an element
  if (typeof window._deselectConn === 'function' && typeof window._getSelConnId === 'function' && window._getSelConnId()) {
    window._deselectConn(!el);
  }
  // Apply crop when leaving the cropped image (other element or deselect)
  if(typeof exitCropModeIfActive==='function'&&typeof _cropEl!=='undefined'&&_cropEl&&_cropEl!==el)exitCropModeIfActive();
  // Clear table cell selection when leaving a table
  if(sel&&sel.dataset.type==='table'&&sel!==el&&typeof tblClearSel==='function') tblClearSel();
  // Exit text/shape editing on previously selected element
  if (sel && sel !== el) {
    if (sel.dataset.type === 'shape' && sel.dataset.editing === 'true') {
      if (typeof window._blurActiveShapeText === 'function') window._blurActiveShapeText();
    } else if (sel.dataset.editing === 'true') {
      if (typeof window._finishTextEdit === 'function') window._finishTextEdit(sel);
      else {
        const c = sel.querySelector('.tel');
        if (c) c.blur();
      }
    }
  }
  if (!el && typeof window._blurActiveShapeText === 'function') window._blurActiveShapeText();
  const prevSel=sel;
  if(sel)sel.classList.remove('sel');
  sel=el;
  if(el){
    el.classList.add('sel');
    if (el.dataset.type === 'text' && typeof _rtUpdateCharCounter === 'function') {
      _rtUpdateCharCounter(el, el.querySelector('.tel') || el.querySelector('.ec'));
    }
    // Restore pivot transform-origin if set

    // When selected: restore full pointer-events so resize handles work
    if(el.dataset.type==='shape'){
      el.style.pointerEvents='auto';
      const _sh2=typeof SHAPES!=='undefined'?SHAPES.find(s=>s.id===el.dataset.shape):null;
      const _isCloud = _sh2 && _sh2.special === 'cloud';
      const _isCurve = _sh2 && _sh2.special === 'curve';
      // Check if shape needs clip-path hit testing when selected
      // (ellipse, polygon, star, parallelogram and any non-rectangular shape)
      const _dClipCheck = slides[cur]&&slides[cur].els.find(e=>e.id===el.dataset.id);
      const _wClip = parseInt(el.style.width)||(_dClipCheck&&_dClipCheck.w)||100;
      const _hClip = parseInt(el.style.height)||(_dClipCheck&&_dClipCheck.h)||100;
      const _cpCheck = _dClipCheck && typeof _shapeClipPath==='function' ? _shapeClipPath(_dClipCheck,_wClip,_hClip) : 'none';
      const _needsClipHit = _sh2 && !_sh2.noFill && _cpCheck !== 'none' && !_cpCheck.startsWith('inset(');
      if(_isCloud){
        // Cloud: keep pointerEvents:none on el, SVG fill path handles clicks
        el.style.pointerEvents='none';
        const _dClip=slides[cur]&&slides[cur].els.find(e=>e.id===el.dataset.id);
        if(_dClip&&typeof _applyShapeClipPath==='function') _applyShapeClipPath(el,_dClip);
      } else if(_isCurve){
        // Curve: apply hit testing based on fill state
        const _dCurve=slides[cur]&&slides[cur].els.find(e=>e.id===el.dataset.id);
        if(_dCurve&&typeof _applyShapeClipPath==='function') _applyShapeClipPath(el,_dCurve);
      } else if(_needsClipHit){
        // Keep/rebuild hit-area with clip-path so clicks outside shape pass through
        const _dClip=slides[cur]&&slides[cur].els.find(e=>e.id===el.dataset.id);
        const _hit=el.querySelector('.shape-hit-area');
        if(_hit){ _hit.style.pointerEvents='auto'; }
        else if(_dClip&&typeof _applyShapeClipPath==='function'){
          _applyShapeClipPath(el,_dClip);
          const _hit2=el.querySelector('.shape-hit-area');
          if(_hit2) _hit2.style.pointerEvents='auto';
        }
        el.style.pointerEvents='none';
      } else {
        el.style.pointerEvents='auto';
        const _hit=el.querySelector('.shape-hit-area');if(_hit)_hit.remove();
      }
    }
  }
  // When deselected: re-apply hit area with clip-path on the PREVIOUSLY selected shape
  if(prevSel&&prevSel!==el&&prevSel.dataset.type==='shape'&&typeof _applyShapeClipPath==='function'){
    const _dd=slides[cur]&&slides[cur].els.find(e=>e.id===prevSel.dataset.id);
    if(_dd)_applyShapeClipPath(prevSel,_dd);
  }
  syncProps();
  if(window._propsScrollMem) window._propsScrollMem.maybeRestoreAfterPick();
  if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
  if(typeof _updateSelFrames==='function') _updateSelFrames();
  if(typeof window._hideElCtxMenu==='function') window._hideElCtxMenu();
  // Refresh lego z-order so selected element appears on top
  if(typeof _refreshAllLegoZ==='function') _refreshAllLegoZ();
  if(document.getElementById('props-anim-wrap')?.style.display==='flex'||document.getElementById('anim-panel')?.classList.contains('open')){
    // Keep anim trigger picker alive — rebuilding the list cancels the pick mode
    if(!window._animPickerCtx && typeof renderAnimPanel==='function') renderAnimPanel();
  }
}
function desel(){if(window._curveEditMode)return;clearGuides();pick(null);}
