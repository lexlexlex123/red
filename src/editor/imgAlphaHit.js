/** Hit-test image pixels so hover ignores a transparent background. */

const ALPHA_MIN = 16;
const cache = new WeakMap();

function alphaRecord(img) {
  if (!img || !img.naturalWidth) return null;
  const hit = cache.get(img);
  if (hit === 'fail') return null;
  if (hit) return hit;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const probe = ctx.getImageData(0, 0, 1, 1).data;
    if (probe.length < 4) {
      cache.set(img, 'fail');
      return null;
    }
    const rec = { ctx, w: canvas.width, h: canvas.height, hasAlpha: null };
    cache.set(img, rec);
    return rec;
  } catch (e) {
    cache.set(img, 'fail');
    return null;
  }
}

function paintedRect(boxW, boxH, natW, natH, fit) {
  if (fit === 'fill') return { x: 0, y: 0, w: boxW, h: boxH };
  const br = boxW / Math.max(1e-6, boxH);
  const ir = natW / Math.max(1e-6, natH);
  if (fit === 'cover') {
    if (ir > br) {
      const h = boxH;
      const w = boxH * ir;
      return { x: (boxW - w) / 2, y: 0, w, h };
    }
    const w = boxW;
    const h = boxW / ir;
    return { x: 0, y: (boxH - h) / 2, w, h };
  }
  if (ir > br) {
    const w = boxW;
    const h = boxW / ir;
    return { x: 0, y: (boxH - h) / 2, w, h };
  }
  const h = boxH;
  const w = boxH * ir;
  return { x: (boxW - w) / 2, y: 0, w, h };
}

function scanHasAlpha(rec) {
  if (rec.hasAlpha != null) return rec.hasAlpha;
  try {
    const data = rec.ctx.getImageData(0, 0, rec.w, rec.h).data;
    let alpha = false;
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] < 250) {
        alpha = true;
        break;
      }
    }
    rec.hasAlpha = alpha;
  } catch (e) {
    rec.hasAlpha = false;
  }
  return rec.hasAlpha;
}

/**
 * Client point → host local box (0..offsetWidth / 0..offsetHeight), undoing
 * the host's CSS transform (rotate / flip / hover scale) and ancestor zoom.
 * Returns null when the host has no size.
 */
export function clientToHostLocal(host, clientX, clientY) {
  if (!host) return null;
  const w = host.offsetWidth;
  const h = host.offsetHeight;
  if (w <= 0 || h <= 0) return null;
  const box = host.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return null;
  const style = getComputedStyle(host);
  const xf = style.transform;
  if (!xf || xf === 'none') {
    return {
      x: ((clientX - box.left) * w) / box.width,
      y: ((clientY - box.top) * h) / box.height,
      w,
      h,
    };
  }
  try {
    const matrix = new DOMMatrix(xf);
    const origin = (style.transformOrigin || '').split(/\s+/);
    const ox = parseFloat(origin[0]);
    const oy = parseFloat(origin[1]);
    const originX = Number.isFinite(ox) ? ox : w / 2;
    const originY = Number.isFinite(oy) ? oy : h / 2;
    const corners = [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 4; i++) {
      const p = matrix.transformPoint({ x: corners[i][0] - originX, y: corners[i][1] - originY });
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const aabbW = maxX - minX;
    const aabbH = maxY - minY;
    if (aabbW <= 1e-6 || aabbH <= 1e-6) return null;
    const tx = ((clientX - box.left) * aabbW) / box.width + minX;
    const ty = ((clientY - box.top) * aabbH) / box.height + minY;
    const local = matrix.inverse().transformPoint({ x: tx, y: ty });
    return { x: local.x + originX, y: local.y + originY, w, h };
  } catch (e) {
    return {
      x: ((clientX - box.left) * w) / box.width,
      y: ((clientY - box.top) * h) / box.height,
      w,
      h,
    };
  }
}

/**
 * True when (clientX, clientY) is over an opaque pixel of the image inside host.
 * Rotation is undone first so the axis-aligned hit box is not used.
 * Tainted / not-ready images count as opaque so hover still works.
 */
export function imageOpaqueAtEvent(host, clientX, clientY, fit = 'contain', hasCrop = false) {
  const local = clientToHostLocal(host, clientX, clientY);
  if (!local) return false;
  if (local.x < 0 || local.y < 0 || local.x >= local.w || local.y >= local.h) return false;
  const img = host && host.querySelector ? host.querySelector('img') : null;
  if (!img) return true;
  const rec = alphaRecord(img);
  if (!rec) return true;
  if (!scanHasAlpha(rec)) return true;
  const painted = paintedRect(local.w, local.h, rec.w, rec.h, hasCrop ? 'fill' : fit || 'contain');
  const px = local.x - painted.x;
  const py = local.y - painted.y;
  if (px < 0 || py < 0 || px >= painted.w || py >= painted.h) return false;
  const nx = Math.min(rec.w - 1, Math.max(0, Math.floor((px / painted.w) * rec.w)));
  const ny = Math.min(rec.h - 1, Math.max(0, Math.floor((py / painted.h) * rec.h)));
  try {
    return rec.ctx.getImageData(nx, ny, 1, 1).data[3] > ALPHA_MIN;
  } catch (e) {
    return true;
  }
}
