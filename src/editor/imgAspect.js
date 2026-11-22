/**
 * Peek natural size of a data-URL image and fit element boxes to that aspect.
 */

function b64PrefixBytes(dataUrl, maxBytes = 131072) {
  const m = String(dataUrl || '').match(/^data:image\/[a-z0-9+.-]+;base64,/i);
  if (!m) return null;
  const b64 = dataUrl.slice(m[0].length, m[0].length + Math.ceil(maxBytes * 1.4));
  try {
    const bin = atob(b64);
    const n = Math.min(bin.length, maxBytes);
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function pngSize(u8) {
  if (!u8 || u8.length < 24) return null;
  if (u8[0] !== 0x89 || u8[1] !== 0x50 || u8[2] !== 0x4e || u8[3] !== 0x47) return null;
  const w = (u8[16] << 24) | (u8[17] << 16) | (u8[18] << 8) | u8[19];
  const h = (u8[20] << 24) | (u8[21] << 16) | (u8[22] << 8) | u8[23];
  if (w > 0 && h > 0 && w < 100000 && h < 100000) return { w, h };
  return null;
}

function gifSize(u8) {
  if (!u8 || u8.length < 10) return null;
  if (u8[0] !== 0x47 || u8[1] !== 0x49 || u8[2] !== 0x46) return null;
  const w = u8[6] | (u8[7] << 8);
  const h = u8[8] | (u8[9] << 8);
  if (w > 0 && h > 0) return { w, h };
  return null;
}

function jpegSize(u8) {
  if (!u8 || u8.length < 4 || u8[0] !== 0xff || u8[1] !== 0xd8) return null;
  let i = 2;
  while (i < u8.length - 8) {
    if (u8[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = u8[i + 1];
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) {
      i += 2;
      continue;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      i += 2;
      continue;
    }
    const len = (u8[i + 2] << 8) | u8[i + 3];
    if (len < 2) break;
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      const h = (u8[i + 5] << 8) | u8[i + 6];
      const w = (u8[i + 7] << 8) | u8[i + 8];
      if (w > 0 && h > 0) return { w, h };
      return null;
    }
    i += 2 + len;
  }
  return null;
}

/** @returns {{w:number,h:number}|null} */
export function peekDataUrlSize(src) {
  if (!src || typeof src !== 'string' || !src.startsWith('data:image/')) return null;
  const u8 = b64PrefixBytes(src);
  if (!u8) return null;
  return pngSize(u8) || jpegSize(u8) || gifSize(u8);
}

/**
 * Shrink/grow box to the image's natural aspect while staying inside the original box
 * (object-fit:contain geometry). Centers the result.
 */
export function fitBoxToAspect(box, natW, natH) {
  const bw = Math.max(1, +(box?.w) || 100);
  const bh = Math.max(1, +(box?.h) || 60);
  const nw = Math.max(1, +natW || 0);
  const nh = Math.max(1, +natH || 0);
  if (!nw || !nh) return { x: box.x, y: box.y, w: bw, h: bh };
  const ar = nw / nh;
  const boxAr = bw / bh;
  if (Math.abs(ar - boxAr) < 0.015) return { x: box.x, y: box.y, w: bw, h: bh };
  let w;
  let h;
  if (ar >= boxAr) {
    w = bw;
    h = Math.max(8, Math.round(w / ar));
  } else {
    h = bh;
    w = Math.max(8, Math.round(h * ar));
  }
  const x = Math.round((+(box.x) || 0) + (bw - w) / 2);
  const y = Math.round((+(box.y) || 0) + (bh - h) / 2);
  return { x, y, w, h };
}

/** Apply natural-aspect fit to imported image elements (mutates els in place). */
export function fitImportedImageAspect(el) {
  if (!el || el.type !== 'image' || !el.src) return el;
  const nat = peekDataUrlSize(el.src);
  if (!nat) {
    // Keep contain so we never stretch when size unknown
    if (!el.imgFit) el.imgFit = 'contain';
    return el;
  }
  const fitted = fitBoxToAspect(el, nat.w, nat.h);
  el.x = fitted.x;
  el.y = fitted.y;
  el.w = fitted.w;
  el.h = fitted.h;
  el.imgNatW = nat.w;
  el.imgNatH = nat.h;
  // Box now matches pixels → fill draws 1:1 without letterbox or stretch
  el.imgFit = 'fill';
  if (!(+(el.imgBw) > 0)) {
    el.imgBw = 0;
    delete el.imgBc;
    delete el.imgBcScheme;
  }
  return el;
}
