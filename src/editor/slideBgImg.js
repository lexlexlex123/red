/** Slide background image modes (legacy `js/05-backgrounds.js`). */

import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';

export const SBG_MODES = [
  { id: 'stretch', labelRu: 'Растянуть', labelEn: 'Stretch' },
  { id: 'cover', labelRu: 'Заполнить', labelEn: 'Cover' },
  { id: 'tile', labelRu: 'Плитка', labelEn: 'Tile' },
  { id: 'custom', labelRu: 'По размеру', labelEn: 'Custom' },
];

export const SBG_ANCHORS = [
  { id: 'tl', label: '↖', titleRu: 'Верхний левый', titleEn: 'Top left' },
  { id: 'tr', label: '↗', titleRu: 'Верхний правый', titleEn: 'Top right' },
  { id: 'center', label: '◎', titleRu: 'По центру', titleEn: 'Center' },
  { id: 'bl', label: '↙', titleRu: 'Нижний левый', titleEn: 'Bottom left' },
  { id: 'br', label: '↘', titleRu: 'Нижний правый', titleEn: 'Bottom right' },
];

export function cssUrl(src) {
  return `url(${JSON.stringify(String(src || ''))})`;
}

export function bgImgSrc(bg) {
  if (!bg) return '';
  if (typeof bg === 'string') return bg;
  return bg.src || '';
}

export function normalizeBgImg(bg, canvasW = DEFAULT_CANVAS_W, canvasH = DEFAULT_CANVAS_H) {
  if (!bg) return null;
  const out = typeof bg === 'string' ? { src: bg } : { ...bg };
  if (!out.src) return null;
  if (!out.mode) {
    if (out.fit === '100% 100%' || out.fit === 'fill') out.mode = 'stretch';
    else out.mode = 'cover';
  }
  if (out.opacity == null) out.opacity = 1;
  if (out.blur == null) out.blur = 0;
  if (out.mode === 'tile') {
    if (out.tileSize == null) out.tileSize = 120;
    if (out.tileGap == null) out.tileGap = 10;
    if (out.tileRot == null) out.tileRot = 0;
  }
  if (out.mode === 'custom') {
    if (out.customSize == null) {
      if (out.customW != null || out.customH != null) {
        out.customSize = Math.max(out.customW || 0, out.customH || 0);
      } else {
        out.customSize = Math.round(Math.min(canvasW, canvasH) * 0.5);
      }
    }
    // Support separate X/Y margins (fallback to customMargin for backward compat)
    if (out.customMarginX == null) out.customMarginX = out.customMargin ?? 0;
    if (out.customMarginY == null) out.customMarginY = out.customMargin ?? 0;
    if (!out.customAnchor) out.customAnchor = 'center';
  }
  return out;
}

export function makeBgImgFromSrc(src, name) {
  return normalizeBgImg({
    src,
    name: name || '',
    mode: 'cover',
    opacity: 1,
    blur: 0,
  });
}

function customRect(W, H, bg, aspect = 16 / 9) {
  const size = Math.max(20, bg.customSize || 300);
  const mx = Math.max(0, bg.customMarginX ?? bg.customMargin ?? 0);
  const my = Math.max(0, bg.customMarginY ?? bg.customMargin ?? 0);
  let iw;
  let ih;
  if (aspect >= 1) {
    iw = size;
    ih = size / aspect;
  } else {
    ih = size;
    iw = size * aspect;
  }
  const maxW = Math.max(1, W - mx * 2);
  const maxH = Math.max(1, H - my * 2);
  if (iw > maxW) {
    const s = maxW / iw;
    iw = maxW;
    ih *= s;
  }
  if (ih > maxH) {
    const s = maxH / ih;
    ih = maxH;
    iw *= s;
  }
  const a = bg.customAnchor || 'center';
  let x;
  let y;
  if (a === 'tl') {
    x = mx;
    y = my;
  } else if (a === 'tr') {
    x = W - iw - mx;
    y = my;
  } else if (a === 'bl') {
    x = mx;
    y = H - ih - my;
  } else if (a === 'br') {
    x = W - iw - mx;
    y = H - ih - my;
  } else {
    x = (W - iw) / 2;
    y = (H - ih) / 2;
  }
  return { x, y, w: iw, h: ih };
}

/**
 * Render model for the bg image layer.
 * @param {number|null} [imgAspect] - actual image aspect ratio (w/h) for custom mode
 * @returns {{ mode: string, wrap: object, inner?: object } | null}
 */
export function slideBgImgLayer(bg, canvasW = DEFAULT_CANVAS_W, canvasH = DEFAULT_CANVAS_H, imgAspect = null) {
  const n = normalizeBgImg(bg, canvasW, canvasH);
  if (!n) return null;
  const op = Math.max(0, Math.min(1, +n.opacity));
  const blur = Math.max(0, +n.blur || 0);
  const filter = blur > 0 ? `blur(${blur}px)` : undefined;
  const fx = { opacity: op, filter, pointerEvents: 'none', zIndex: 0 };

  if (n.mode === 'tile') {
    const tileSize = Math.max(20, +(n.tileSize) || 120);
    const gap = Math.max(0, +(n.tileGap) || 0);
    const rotDeg = +(n.tileRot) || 0;
    // Calculate tile dimensions based on image aspect ratio
    const imgAr = imgAspect || 1;
    let tw, th;
    if (imgAr >= 1) {
      tw = tileSize;
      th = tileSize / imgAr;
    } else {
      th = tileSize;
      tw = tileSize * imgAr;
    }
    const cellW = tw + gap;
    const cellH = th + gap;
    // Calculate how many tiles we need to cover the canvas (with rotation margin)
    const diag = Math.sqrt(canvasW * canvasW + canvasH * canvasH) * 1.5;
    const cols = Math.ceil(diag / cellW) + 2;
    const rows = Math.ceil(diag / cellH) + 2;
    const startX = -(cols * cellW) / 2;
    const startY = -(rows * cellH) / 2;
    // Build tile positions
    const tiles = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        tiles.push({
          x: startX + col * cellW,
          y: startY + row * cellH,
          w: tw,
          h: th,
        });
      }
    }
    return {
      mode: 'tile',
      wrap: {
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        ...fx,
      },
      inner: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 0,
        height: 0,
        transform: `translate(-50%, -50%) rotate(${rotDeg}deg)`,
      },
      tiles,
      tileSrc: n.src,
    };
  }

  if (n.mode === 'custom') {
    const r = customRect(canvasW, canvasH, n, imgAspect || 16 / 9);
    return {
      mode: 'custom',
      wrap: {
        position: 'absolute',
        left: r.x,
        top: r.y,
        width: r.w,
        height: r.h,
        backgroundImage: cssUrl(n.src),
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        ...fx,
      },
    };
  }

  const size = n.mode === 'stretch' ? '100% 100%' : 'cover';
  return {
    mode: n.mode || 'cover',
    wrap: {
      position: 'absolute',
      inset: 0,
      backgroundImage: cssUrl(n.src),
      backgroundSize: size,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      ...fx,
    },
  };
}

function styleAttr(obj) {
  return Object.entries(obj || {})
    .filter(([, v]) => v != null && v !== '' && v !== false)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${v}`)
    .join(';');
}

export function slideBgImgExportHtml(bg, canvasW = DEFAULT_CANVAS_W, canvasH = DEFAULT_CANVAS_H) {
  const layer = slideBgImgLayer(bg, canvasW, canvasH);
  if (!layer) return '';
  // Tile mode: render individual tile elements
  if (layer.mode === 'tile' && layer.tiles && layer.tiles.length > 0) {
    const innerHtml = layer.tiles
      .map(
        (t) =>
          `<div style="position:absolute;left:${t.x}px;top:${t.y}px;width:${t.w}px;height:${t.h}px;background-image:url(${JSON.stringify(layer.tileSrc)});background-size:100% 100%;background-repeat:no-repeat"></div>`
      )
      .join('');
    return `<div class="sbg-img" style="${styleAttr(layer.wrap)}"><div style="${styleAttr(layer.inner)}">${innerHtml}</div></div>`;
  }
  if (layer.inner) {
    return `<div class="sbg-img" style="${styleAttr(layer.wrap)}"><div style="${styleAttr(layer.inner)}"></div></div>`;
  }
  return `<div class="sbg-img" style="${styleAttr(layer.wrap)}"></div>`;
}

export function slideSolidBg(slide) {
  return slide?.bgc || '#1e293b';
}

function tileDims(img, tileSize) {
  const ir = (img.naturalWidth || 1) / (img.naturalHeight || 1);
  if (ir >= 1) return { w: tileSize, h: tileSize / ir };
  return { w: tileSize * ir, h: tileSize };
}

function drawImgCover(ctx, img, x, y, w, h) {
  const ir = (img.naturalWidth || 1) / (img.naturalHeight || 1);
  const tr = w / Math.max(1, h);
  let dw;
  let dh;
  let dx;
  let dy;
  if (ir > tr) {
    dh = h;
    dw = dh * ir;
    dx = x + (w - dw) / 2;
    dy = y;
  } else {
    dw = w;
    dh = dw / ir;
    dx = x;
    dy = y + (h - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Scale tile/custom/blur so a small canvas (thumbs) matches the editor. */
export function scaleBgImgForCanvas(bgImg, W, H, refW, refH) {
  const bg = normalizeBgImg(JSON.parse(JSON.stringify(bgImg)), refW, refH);
  if (!bg || !refW || !refH) return bg;
  const sc = Math.min(W / refW, H / refH);
  if (bg.blur > 0) bg.blur = Math.max(0, Math.round(bg.blur * sc));
  if (bg.mode === 'stretch' || bg.mode === 'cover') return bg;
  if (bg.mode === 'tile') {
    bg.tileSize = Math.max(4, Math.round((bg.tileSize || 120) * sc));
    bg.tileGap = Math.max(0, Math.round((bg.tileGap || 0) * sc));
  } else if (bg.mode === 'custom') {
    bg.customSize = Math.max(4, Math.round((bg.customSize || 300) * sc));
    bg.customMarginX = Math.max(0, Math.round(((bg.customMarginX ?? bg.customMargin) || 0) * sc));
    bg.customMarginY = Math.max(0, Math.round(((bg.customMarginY ?? bg.customMargin) || 0) * sc));
  }
  return bg;
}

function paintSlideBgImgContent(ctx, bg, W, H, img) {
  const alpha = Math.max(0, Math.min(1, +bg.opacity));
  ctx.save();
  ctx.globalAlpha = alpha;
  if (bg.mode === 'stretch') {
    ctx.drawImage(img, 0, 0, W, H);
  } else if (bg.mode === 'tile') {
    const tileSize = Math.max(10, bg.tileSize || 120);
    const gap = Math.max(0, bg.tileGap || 0);
    const td = tileDims(img, tileSize);
    const cellW = td.w + gap;
    const cellH = td.h + gap;
    const rotDeg = bg.tileRot || 0;
    const rot = (rotDeg * Math.PI) / 180;
    const seam = rotDeg ? 1 : 0;
    const seamOff = seam * 0.5;
    const diag = Math.sqrt(W * W + H * H) * 2;
    const cols = Math.ceil(diag / Math.max(1, cellW)) + 2;
    const rows = Math.ceil(diag / Math.max(1, cellH)) + 2;
    const startX = -Math.ceil(cols / 2) * cellW;
    const startY = -Math.ceil(rows / 2) * cellH;
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(rot);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tx = startX + col * cellW - seamOff;
        const ty = startY + row * cellH - seamOff;
        ctx.drawImage(img, tx, ty, td.w + seam, td.h + seam);
      }
    }
  } else if (bg.mode === 'custom') {
    const ir = (img.naturalWidth || 1) / (img.naturalHeight || 1);
    const r = customRect(W, H, bg, ir);
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
  } else {
    drawImgCover(ctx, img, 0, 0, W, H);
  }
  ctx.restore();
}

/** Paint a slide background image with mode, opacity, and blur (v7.1 canvas parity). */
export function drawSlideBgImgOnCanvas(ctx, bgImg, W, H, img) {
  if (!ctx || !img || !bgImg) return;
  const bg = normalizeBgImg(typeof bgImg === 'string' ? { src: bgImg } : bgImg);
  if (!bg) return;
  const blur = Math.max(0, +bg.blur || 0);
  if (blur > 0) {
    const tmp = document.createElement('canvas');
    tmp.width = W;
    tmp.height = H;
    paintSlideBgImgContent(tmp.getContext('2d'), bg, W, H, img);
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
  } else {
    paintSlideBgImgContent(ctx, bg, W, H, img);
  }
}
