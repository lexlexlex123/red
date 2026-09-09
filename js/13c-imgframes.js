// ══════════════ IMAGE BORDER STYLES + FRAME TEMPLATES ══════════════

const IMG_BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'wave', 'zigzag'];
const IMG_FRAMES = ['none', 'ribbon', 'soft', 'polaroid'];

function _imgNormBorderStyle(s) {
  return IMG_BORDER_STYLES.includes(s) ? s : 'solid';
}

function _imgNormFrame(f) {
  return IMG_FRAMES.includes(f) ? f : 'none';
}

function _imgPolaroidCaptionH(d, el) {
  const h = parseInt(el && el.style.height, 10) || d.h || 100;
  return Math.max(22, Math.round(h * 0.11));
}

function _imgPolaroidPad(w) {
  w = w || 100;
  return Math.max(8, Math.min(16, Math.round(w * 0.036)));
}

function _imgPolaroidDropShadow() {
  return '0 12px 32px rgba(15,23,42,0.24), 0 4px 12px rgba(15,23,42,0.14)';
}

function _imgPolaroidUnwrapPhoto(c) {
  if (!c) return;
  const wrap = c.querySelector('.img-polaroid-photo');
  if (!wrap) return;
  const img = wrap.querySelector('img');
  if (img) c.insertBefore(img, wrap);
  wrap.remove();
}

function _imgPolaroidApplyShade(c, img) {
  if (!c || !img) return;
  let wrap = c.querySelector('.img-polaroid-photo');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'img-polaroid-photo';
    c.insertBefore(wrap, img);
    wrap.appendChild(img);
  } else if (img.parentElement !== wrap) {
    wrap.appendChild(img);
  }
  wrap.style.cssText = 'position:relative;display:block;width:100%;overflow:hidden;';
  let shade = wrap.querySelector('.img-polaroid-shade');
  if (!shade) {
    shade = document.createElement('div');
    shade.className = 'img-polaroid-shade';
    wrap.appendChild(shade);
  }
  const sh = '3px';
  shade.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;'
    + 'background:'
    + 'linear-gradient(to bottom,rgba(15,23,42,0.34) 0,transparent ' + sh + '),'
    + 'linear-gradient(to top,rgba(15,23,42,0.34) 0,transparent ' + sh + '),'
    + 'linear-gradient(to right,rgba(15,23,42,0.28) 0,transparent ' + sh + '),'
    + 'linear-gradient(to left,rgba(15,23,42,0.28) 0,transparent ' + sh + ');'
    + 'box-shadow:inset 0 2px 3px -2px rgba(15,23,42,0.12),inset 0 -2px 3px -2px rgba(15,23,42,0.12),'
    + 'inset 2px 0 3px -2px rgba(15,23,42,0.1),inset -2px 0 3px -2px rgba(15,23,42,0.1);';
}

/** Подогнать ширину полароида под пропорции фото — боковые поля = верхнему. */
function _imgPolaroidSyncWidth(el, d, img, pad, capH) {
  const natW = img.naturalWidth;
  const natH = img.naturalHeight;
  if (!natW || !natH) {
    if (!img.dataset.polaroidFitPending) {
      img.dataset.polaroidFitPending = '1';
      img.addEventListener('load', () => {
        delete img.dataset.polaroidFitPending;
        if (_imgNormFrame(d.imgFrame) === 'polaroid') {
          const pw = parseInt(el.style.width, 10) || d.w || 100;
          const pad = _imgPolaroidPad(pw);
          const capH = _imgPolaroidCaptionH(d, el);
          _imgPolaroidSyncWidth(el, d, img, pad, capH);
        }
      }, { once: true });
    }
    return;
  }
  delete img.dataset.polaroidFitPending;
  const h = parseInt(el.style.height, 10) || d.h || 100;
  const photoH = Math.max(1, h - capH - pad);
  // При обрезке — пропорции видимого кадра, не всего файла
  const cL = +(d.imgCropL || 0), cT = +(d.imgCropT || 0);
  const cR = +(d.imgCropR || 0), cB = +(d.imgCropB || 0);
  const hasCrop = cL || cT || cR || cB;
  let ar = natW / natH;
  if (hasCrop && d._cropFullW > 0 && d._cropFullH > 0) {
    const vw = Math.max(1, d._cropFullW - cL - cR);
    const vh = Math.max(1, d._cropFullH - cT - cB);
    ar = vw / vh;
  } else if (d.imgFrameBaseW > 0 && d.imgFrameBaseH > 0) {
    ar = d.imgFrameBaseW / d.imgFrameBaseH;
  }
  const idealW = Math.round(photoH * ar + 2 * pad);
  const curW = parseInt(el.style.width, 10) || d.w || 100;
  if (d.imgFrameBaseW == null) {
    d.imgFrameBaseW = curW;
    el.dataset.imgFrameBaseW = String(curW);
  }
  if (d.imgFrameBaseH == null) {
    const curH = parseInt(el.style.height, 10) || d.h || 100;
    d.imgFrameBaseH = curH;
    el.dataset.imgFrameBaseH = String(curH);
  }
  if (curW > idealW + 1) {
    el.style.width = idealW + 'px';
    d.w = idealW;
    if (typeof _scheduleHandlesOverlayUpdate === 'function') _scheduleHandlesOverlayUpdate();
    else if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
  }
}

/** Soft-edge vignette like UI thumb «Край» / photo oval fade.
 *  Ellipse is inset so bbox corners are fully transparent; vertical fade
 *  is deeper than horizontal; multi-stop + blur for a complex dissolve. */
function _imgSoftEdgeSvgMaskUrl(w, h) {
  w = Math.max(1, Math.round(w || 100));
  h = Math.max(1, Math.round(h || 100));
  const minSide = Math.min(w, h);
  // Wide feather; blur spreads past the ellipse so mid-edges soften without
  // restoring sharp rectangle corners.
  const blur = Math.max(12, Math.min(48, Math.round(minSide * 0.11)));
  // Core oval ~42×35% of box → corners of the rect stay empty even after blur
  const rxE = (w * 0.42).toFixed(1);
  const ryE = (h * 0.35).toFixed(1);
  const cx = (w / 2).toFixed(1);
  const cy = (h / 2).toFixed(1);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">'
    + '<defs>'
    + '<radialGradient id="g" cx="50%" cy="50%" r="50%">'
    + '<stop offset="0%" stop-color="#fff" stop-opacity="1"/>'
    + '<stop offset="28%" stop-color="#fff" stop-opacity="1"/>'
    + '<stop offset="48%" stop-color="#fff" stop-opacity="0.78"/>'
    + '<stop offset="62%" stop-color="#fff" stop-opacity="0.42"/>'
    + '<stop offset="76%" stop-color="#fff" stop-opacity="0.14"/>'
    + '<stop offset="90%" stop-color="#fff" stop-opacity="0.03"/>'
    + '<stop offset="100%" stop-color="#fff" stop-opacity="0"/>'
    + '</radialGradient>'
    + '<filter id="f" x="-50%" y="-50%" width="200%" height="200%">'
    + '<feGaussianBlur stdDeviation="' + blur + '"/>'
    + '</filter>'
    + '</defs>'
    + '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rxE + '" ry="' + ryE
    + '" fill="url(#g)" filter="url(#f)"/>'
    + '</svg>';
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
}

function _imgApplySoftEdgeMask(c, d, el) {
  if (!c) return;
  const w = parseInt(el && el.style.width, 10) || (d && d.w) || 100;
  const h = parseInt(el && el.style.height, 10) || (d && d.h) || 100;
  // Single SVG oval vignette (alpha): inset ellipse + multi-stop + blur.
  // Corners of the element box stay fully transparent — no rectangle outline.
  const mask = _imgSoftEdgeSvgMaskUrl(w, h);
  c.style.borderRadius = '';
  c.style.clipPath = '';
  c.style.overflow = 'hidden';
  c.style.webkitMaskImage = mask;
  c.style.maskImage = mask;
  c.style.webkitMaskSize = '100% 100%';
  c.style.maskSize = '100% 100%';
  c.style.webkitMaskRepeat = 'no-repeat';
  c.style.maskRepeat = 'no-repeat';
  c.style.webkitMaskPosition = 'center';
  c.style.maskPosition = 'center';
  c.style.webkitMaskComposite = '';
  c.style.maskComposite = '';
  c.style.maskMode = 'alpha';
  c.style.webkitMaskMode = 'alpha';
}

function _imgResetFrameStyles(el, c, img) {
  if (!el) return;
  el.querySelectorAll('.img-frame-decor').forEach(n => n.remove());
  el.style.background = '';
  el.style.padding = '';
  el.style.display = '';
  el.style.flexDirection = '';
  el.style.alignItems = '';
  el.style.justifyContent = '';
  el.style.boxSizing = '';
  if (!el.dataset.imgShadow || el.dataset.imgShadow !== 'true') el.style.boxShadow = '';
  if (c) {
    _imgPolaroidUnwrapPhoto(c);
    c.style.position = 'absolute';
    c.style.inset = '0';
    c.style.top = '';
    c.style.left = '';
    c.style.right = '';
    c.style.bottom = '';
    c.style.flex = '';
    c.style.minHeight = '';
    c.style.width = '';
    c.style.display = '';
    c.style.alignItems = '';
    c.style.justifyContent = '';
    c.style.webkitMaskImage = '';
    c.style.maskImage = '';
    c.style.webkitMaskComposite = '';
    c.style.maskComposite = '';
    c.style.webkitMaskSize = '';
    c.style.maskSize = '';
    c.style.webkitMaskRepeat = '';
    c.style.maskRepeat = '';
    c.style.webkitMaskPosition = '';
    c.style.maskPosition = '';
    c.style.maskMode = '';
    c.style.webkitMaskMode = '';
    c.style.overflow = '';
    c.style.boxShadow = '';
  }
  if (img) {
    const hasCrop = el.dataset.hasCrop === '1'
      || !!(+(el.dataset.imgCropL) || +(el.dataset.imgCropT) || +(el.dataset.imgCropR) || +(el.dataset.imgCropB));
    img.style.webkitMaskImage = '';
    img.style.maskImage = '';
    img.style.maxWidth = '';
    img.style.maxHeight = '';
    img.style.margin = '';
    if (!hasCrop) {
      img.style.objectFit = '';
      img.style.objectPosition = '';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.left = '';
      img.style.top = '';
      img.style.position = '';
    }
  }
  const cap = el.querySelector('.img-caption');
  if (cap) {
    cap.style.display = 'none';
    cap.style.position = '';
    cap.style.bottom = '';
    cap.style.left = '';
    cap.style.right = '';
    cap.style.height = '';
    cap.style.flex = '';
    cap.style.width = '';
  }
}

function applyImgFrame(el, d) {
  if (!el || !d) return;
  const c = el.querySelector('.iel');
  const img = el.querySelector('img');
  if (!c || !img) return;
  const frame = _imgNormFrame(d.imgFrame);
  _imgResetFrameStyles(el, c, img);

  if (frame === 'none') return;

  if (frame === 'ribbon') {
    if (!d.imgShadow) el.style.boxShadow = '0 10px 28px rgba(15,23,42,0.22)';
    const decor = document.createElement('div');
    decor.className = 'img-frame-decor img-frame-ribbon';
    const tape = document.createElement('div');
    tape.className = 'img-frame-tape';
    decor.appendChild(tape);
    el.appendChild(decor);
    return;
  }

  if (frame === 'soft') {
    _imgApplySoftEdgeMask(c, d, el);
    return;
  }

  if (frame === 'polaroid') {
    const w = parseInt(el.style.width, 10) || d.w || 100;
    const pad = _imgPolaroidPad(w);
    const capH = _imgPolaroidCaptionH(d, el);
    const hasCrop = !!(+(d.imgCropL) || +(d.imgCropT) || +(d.imgCropR) || +(d.imgCropB));
    el.style.background = '#fff';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.padding = pad + 'px ' + pad + 'px 0';
    el.style.boxSizing = 'border-box';
    el.style.boxShadow = _imgPolaroidDropShadow();
    c.style.position = 'relative';
    c.style.inset = '';
    c.style.top = '';
    c.style.left = '';
    c.style.right = '';
    c.style.bottom = '';
    c.style.flex = '1 1 0';
    c.style.minHeight = '0';
    c.style.width = '100%';
    c.style.overflow = 'hidden';
    c.style.display = 'block';
    c.style.boxShadow = '';
    c.style.alignItems = '';
    c.style.justifyContent = '';
    if (!hasCrop) {
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.maxWidth = '100%';
      img.style.maxHeight = '';
      img.style.objectFit = '';
      img.style.objectPosition = '';
      img.style.left = '';
      img.style.top = '';
      img.style.position = '';
    }
    img.style.display = 'block';
    img.style.margin = '0';
    _imgPolaroidApplyShade(c, img);
    const wrap = c.querySelector('.img-polaroid-photo');
    if (wrap) {
      wrap.style.position = 'relative';
      wrap.style.display = 'block';
      wrap.style.width = '100%';
      wrap.style.height = hasCrop ? '100%' : '';
      wrap.style.overflow = 'hidden';
      wrap.style.minHeight = '0';
      wrap.style.flex = hasCrop ? '1 1 0' : '';
    }

    let cap = el.querySelector('.img-caption');
    if (!cap) {
      cap = document.createElement('div');
      cap.className = 'img-caption';
      cap.spellcheck = false;
      cap.addEventListener('mousedown', e => e.stopPropagation());
      cap.addEventListener('input', () => {
        const text = (cap.textContent || '').replace(/\u00a0/g, ' ').trim();
        el.dataset.imgCaption = text;
        d.imgCaption = text;
        try {
          const inp = document.getElementById('img-caption');
          if (inp && document.activeElement !== inp) inp.value = text;
        } catch (e) {}
        if (typeof save === 'function') save();
      });
      cap.addEventListener('blur', () => {
        if (typeof saveState === 'function') saveState();
      });
      el.appendChild(cap);
    }
    cap.style.display = 'flex';
    cap.style.position = 'relative';
    cap.style.left = '';
    cap.style.right = '';
    cap.style.bottom = '';
    cap.style.flex = '0 0 ' + capH + 'px';
    cap.style.height = capH + 'px';
    cap.style.width = '100%';
    cap.style.alignItems = 'center';
    cap.style.justifyContent = 'center';
    cap.style.padding = '4px 10px 8px';
    cap.style.boxSizing = 'border-box';
    cap.style.fontFamily = "'Segoe Script','Comic Sans MS',cursive,sans-serif";
    cap.style.fontSize = Math.max(13, Math.min(22, capH * 0.3)) + 'px';
    cap.style.color = '#334155';
    cap.style.textAlign = 'center';
    cap.style.lineHeight = '1.25';
    cap.style.pointerEvents = 'auto';
    cap.style.cursor = 'text';
    cap.style.outline = 'none';
    cap.style.userSelect = 'text';
    const capText = d.imgCaption != null ? String(d.imgCaption) : '';
    if (cap.textContent !== capText) cap.textContent = capText;
    const canEdit = typeof sel !== 'undefined' && sel === el;
    cap.contentEditable = canEdit ? 'true' : 'false';
  }
}

function syncImgFrameUI(d) {
  const frame = _imgNormFrame((d && d.imgFrame) || 'none');
  document.querySelectorAll('.img-frame-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.frame === frame);
  });
  const capRow = document.getElementById('img-caption-row');
  const capInp = document.getElementById('img-caption');
  if (capRow) capRow.style.display = frame === 'polaroid' ? 'block' : 'none';
  if (capInp) capInp.value = (d && d.imgCaption) || '';
}

function _imgRestorePolaroidBaseSize(el, d) {
  const baseW = d.imgFrameBaseW != null ? +d.imgFrameBaseW : (el.dataset.imgFrameBaseW ? +el.dataset.imgFrameBaseW : null);
  const baseH = d.imgFrameBaseH != null ? +d.imgFrameBaseH : (el.dataset.imgFrameBaseH ? +el.dataset.imgFrameBaseH : null);
  if (baseW != null && baseW > 0) {
    el.style.width = baseW + 'px';
    d.w = baseW;
  }
  if (baseH != null && baseH > 0) {
    el.style.height = baseH + 'px';
    d.h = baseH;
  }
  delete d.imgFrameBaseW;
  delete d.imgFrameBaseH;
  delete el.dataset.imgFrameBaseW;
  delete el.dataset.imgFrameBaseH;
}

function setImgFrame(frame) {
  if (!sel || sel.dataset.type !== 'image') return;
  if (typeof pushUndo === 'function') pushUndo();
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  const oldFrame = _imgNormFrame(d.imgFrame);
  const newFrame = _imgNormFrame(frame);
  if (oldFrame === 'polaroid' && newFrame !== 'polaroid') {
    _imgRestorePolaroidBaseSize(sel, d);
  }
  if (newFrame === 'polaroid' && oldFrame !== 'polaroid') {
    const curW = parseInt(sel.style.width, 10) || d.w || 100;
    const curH = parseInt(sel.style.height, 10) || d.h || 100;
    d.imgFrameBaseW = curW;
    d.imgFrameBaseH = curH;
    sel.dataset.imgFrameBaseW = String(curW);
    sel.dataset.imgFrameBaseH = String(curH);
  }
  d.imgFrame = newFrame;
  sel.dataset.imgFrame = d.imgFrame;
  if (d.imgFrame === 'polaroid' && d.imgCaption == null) d.imgCaption = '';
  if (typeof applyImgStyles === 'function') applyImgStyles(sel, d);
  if (d.imgFrame === 'polaroid') {
    const img = sel.querySelector('img');
    const c = sel.querySelector('.iel');
    if (img && c) {
      const pw = parseInt(sel.style.width, 10) || d.w || 100;
      const pad = _imgPolaroidPad(pw);
      const capH = _imgPolaroidCaptionH(d, sel);
      _imgPolaroidSyncWidth(sel, d, img, pad, capH);
    }
  }
  syncImgFrameUI(d);
  if (typeof _scheduleHandlesOverlayUpdate === 'function') _scheduleHandlesOverlayUpdate();
  else if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
  if (typeof save === 'function') save();
  if (typeof drawThumbs === 'function') drawThumbs();
  if (typeof saveState === 'function') saveState();
}

function updateImgCaption(val) {
  if (!sel || sel.dataset.type !== 'image') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  d.imgCaption = val || '';
  sel.dataset.imgCaption = d.imgCaption;
  const cap = sel.querySelector('.img-caption');
  if (cap && cap.textContent !== d.imgCaption) cap.textContent = d.imgCaption;
  if (typeof save === 'function') save();
}

window.applyImgFrame = applyImgFrame;
window.syncImgFrameUI = syncImgFrameUI;
window.setImgFrame = setImgFrame;
window.updateImgCaption = updateImgCaption;
window._imgPolaroidDropShadow = _imgPolaroidDropShadow;

function _imgInnerClipPath(d, w, h) {
  const rx = Math.max(0, +(d.imgRx || 0));
  if (rx > 0) return `inset(0 round ${rx}px)`;
  return '';
}

function _imgStrokeDash(style, sw) {
  style = _imgNormBorderStyle(style);
  sw = Math.max(1, sw);
  if (style === 'dashed') return `${Math.max(4, sw * 2.5)} ${Math.max(2, sw * 1.5)}`;
  if (style === 'dotted') return `0.1 ${Math.max(3, sw * 2.2)}`;
  return '';
}

function _imgStrokePathRect(w, h, m, rx, style) {
  rx = Math.max(0, rx || 0);
  const x = m;
  const y = m;
  const bw = w - m * 2;
  const bh = h - m * 2;
  if (rx > 0) {
    const r = Math.min(rx, bw / 2, bh / 2);
    return `M ${x + r} ${y} H ${x + bw - r} Q ${x + bw} ${y} ${x + bw} ${y + r} V ${y + bh - r} Q ${x + bw} ${y + bh} ${x + bw - r} ${y + bh} H ${x + r} Q ${x} ${y + bh} ${x} ${y + bh - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
  }
  if (style === 'wave') {
    let d = `M ${x} ${y + bh * 0.5}`;
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const px = x + (bw * i) / steps;
      const py = y + (i % 2 ? 0 : bh * 0.12);
      d += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    for (let i = steps; i >= 0; i--) {
      const px = x + (bw * i) / steps;
      const py = y + bh - (i % 2 ? 0 : bh * 0.12);
      d += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    return d + ' Z';
  }
  if (style === 'zigzag') {
    const z = bh * 0.14;
    return `M ${x} ${y + z} L ${x + bw * 0.12} ${y} L ${x + bw * 0.24} ${y + z} L ${x + bw * 0.36} ${y} L ${x + bw * 0.48} ${y + z} L ${x + bw * 0.6} ${y} L ${x + bw * 0.72} ${y + z} L ${x + bw * 0.84} ${y} L ${x + bw} ${y + z} L ${x + bw} ${y + bh - z} L ${x + bw * 0.88} ${y + bh} L ${x + bw * 0.76} ${y + bh - z} L ${x + bw * 0.64} ${y + bh} L ${x + bw * 0.52} ${y + bh - z} L ${x + bw * 0.4} ${y + bh} L ${x + bw * 0.28} ${y + bh - z} L ${x + bw * 0.16} ${y + bh} L ${x} ${y + bh - z} Z`;
  }
  return `M ${x} ${y} H ${x + bw} V ${y + bh} H ${x} Z`;
}

function _imgBuildBorderLayerHtml(w, h, d) {
  const bw = +(d.imgBw || 0);
  if (bw <= 0) return '';
  const style = _imgNormBorderStyle(d.imgBorderStyle);
  const bc = d.imgBc || '#ffffff';
  const rx = +(d.imgRx || 0);
  const m = bw / 2 + 0.5;
  if (style === 'solid' || style === 'dashed' || style === 'dotted') {
    return '';
  }
  if (style === 'double') {
    const m2 = m * 2.2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" style="display:block;overflow:visible">`
      + `<path d="${_imgStrokePathRect(w, h, m, rx, 'solid')}" fill="none" stroke="${bc}" stroke-width="${Math.max(1, bw * 0.45)}"/>`
      + `<path d="${_imgStrokePathRect(w, h, m2, Math.max(0, rx - m), 'solid')}" fill="none" stroke="${bc}" stroke-width="${Math.max(1, bw * 0.45)}"/>`
      + `</svg>`;
  }
  const path = _imgStrokePathRect(w, h, m, rx, style);
  const dash = _imgStrokeDash(style, bw);
  const dashAttr = dash ? ` stroke-dasharray="${dash}" stroke-linecap="round" stroke-linejoin="round"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" style="display:block;overflow:visible">`
    + `<path d="${path}" fill="none" stroke="${bc}" stroke-width="${bw}"${dashAttr}/>`
    + `</svg>`;
}

function applyImgBorderFrame(el, d) {
  if (!el || !d) return;
  const c = el.querySelector('.iel');
  if (!c) return;
  const w = parseInt(el.style.width, 10) || d.w || 100;
  const h = parseInt(el.style.height, 10) || d.h || 100;
  const bw = +(d.imgBw || 0);
  const bc = d.imgBc || '#ffffff';
  const rx = +(d.imgRx || 0);
  const style = _imgNormBorderStyle(d.imgBorderStyle);

  let layer = el.querySelector('.img-border-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'img-border-layer';
    layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3;overflow:visible;';
    el.appendChild(layer);
  }

  const clip = _imgInnerClipPath(d, w, h);
  const isSoft = _imgNormFrame(d.imgFrame) === 'soft';
  if (isSoft) {
    c.style.clipPath = '';
    c.style.borderRadius = '';
  } else {
    c.style.clipPath = clip || '';
    c.style.borderRadius = rx > 0 ? rx + 'px' : '';
  }

  const useCssBorder = bw > 0 && (style === 'solid' || style === 'dashed' || style === 'dotted');
  if (useCssBorder) {
    c.style.border = `${bw}px ${style} ${bc}`;
    c.style.boxSizing = 'border-box';
  } else {
    c.style.border = 'none';
    c.style.boxSizing = '';
  }

  const html = _imgBuildBorderLayerHtml(w, h, d);
  layer.innerHTML = html;
  layer.style.display = html ? 'block' : 'none';
}

function syncImgBorderUI(d) {
  const style = _imgNormBorderStyle((d && d.imgBorderStyle) || 'solid');
  document.querySelectorAll('.img-border-style-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.style === style);
  });
}

function setImgBorderStyle(style) {
  if (!sel || sel.dataset.type !== 'image') return;
  if (typeof pushUndo === 'function') pushUndo();
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  d.imgBorderStyle = _imgNormBorderStyle(style);
  sel.dataset.imgBorderStyle = d.imgBorderStyle;
  if (+(d.imgBw || 0) <= 0) { d.imgBw = 3; sel.dataset.imgBw = 3; }
  applyImgStyles(sel, d);
  syncImgBorderUI(d);
  if (typeof save === 'function') save();
  if (typeof drawThumbs === 'function') drawThumbs();
  if (typeof saveState === 'function') saveState();
}

window.applyImgBorderFrame = applyImgBorderFrame;
window.syncImgBorderUI = syncImgBorderUI;
window.setImgBorderStyle = setImgBorderStyle;
