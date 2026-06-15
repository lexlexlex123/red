// ══════════════ IMAGE BORDER STYLES ══════════════

const IMG_BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'wave', 'zigzag'];

function _imgNormBorderStyle(s) {
  return IMG_BORDER_STYLES.includes(s) ? s : 'solid';
}

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
  c.style.clipPath = clip || '';
  c.style.borderRadius = rx > 0 ? rx + 'px' : '';

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
