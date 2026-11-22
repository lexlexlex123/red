/** Shape fill-with-image helpers (cover layout, transform, multi-shape share). */

import { elRotationDeg, rotLocalPoint } from './elTransform.js';
import { getShapeMeta } from '../shared/shapesCatalog.js';

/** True when the shape should paint the fill image (data present + not toggled off). */
export function shapeHasFillImg(el) {
  return !!(el && el.type === 'shape' && el.fillImg && el.fillImgShow !== false);
}

/** Image data is stored (may be hidden via toggle). */
export function shapeHasFillImgData(el) {
  return !!(el && el.type === 'shape' && el.fillImg);
}

export function shapeAcceptsFillImg(el) {
  if (!el || el.type !== 'shape') return false;
  const id = el.shape || 'rect';
  if (id === 'line' || id === 'curve') return false;
  if (getShapeMeta(id)?.noFill) return false;
  return true;
}

export function normalizeFillImgLayout(el, shapeW, shapeH) {
  const W = Math.max(1, +shapeW || +el?.w || 100);
  const H = Math.max(1, +shapeH || +el?.h || 100);
  const w = el?.fillImgW != null ? +el.fillImgW : W;
  const h = el?.fillImgH != null ? +el.fillImgH : H;
  return {
    x: el?.fillImgX != null ? +el.fillImgX : (W - w) / 2,
    y: el?.fillImgY != null ? +el.fillImgY : (H - h) / 2,
    w: Math.max(4, w),
    h: Math.max(4, h),
    rot: el?.fillImgRot != null ? +el.fillImgRot : 0,
  };
}

/** Cover the shape box with the natural image aspect. */
export function coverFillImgLayout(shapeW, shapeH, natW, natH) {
  const W = Math.max(1, +shapeW || 100);
  const H = Math.max(1, +shapeH || 100);
  const iw = Math.max(1, +natW || W);
  const ih = Math.max(1, +natH || H);
  const sr = W / H;
  const ir = iw / ih;
  let w;
  let h;
  if (ir > sr) {
    h = H;
    w = h * ir;
  } else {
    w = W;
    h = w / ir;
  }
  return {
    fillImgX: (W - w) / 2,
    fillImgY: (H - h) / 2,
    fillImgW: w,
    fillImgH: h,
    fillImgRot: 0,
  };
}

export function newFillImgLink() {
  return `fil_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clearFillImgPatch() {
  return {
    fillImg: null,
    fillImgName: null,
    fillImgLink: null,
    fillImgShow: null,
    fillImgKey: null,
    fillImgX: null,
    fillImgY: null,
    fillImgW: null,
    fillImgH: null,
    fillImgRot: null,
  };
}

function newFillImgKey() {
  return `fiv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function fillImgPatchFromSrc(src, name, shapeW, shapeH, natW, natH) {
  return {
    fillImg: src,
    fillImgName: name || '',
    fillImgLink: newFillImgLink(),
    fillImgShow: true,
    fillImgKey: newFillImgKey(),
    noFill: false,
    // Keep existing fill/gradient under the image; clearing fillImg reveals them again.
    ...coverFillImgLayout(shapeW, shapeH, natW, natH),
  };
}

/**
 * Swap bitmap.
 * keepLink:true — keep mosaic transform + link.
 * keepLink:false — new link and reset layout to cover the shape (centered).
 */
export function fillImgReplacePatch(el, src, name, { keepLink = true, natW, natH } = {}) {
  if (!el?.fillImg) {
    return fillImgPatchFromSrc(src, name, el?.w, el?.h, natW || el?.w, natH || el?.h);
  }
  const base = {
    fillImg: src,
    fillImgName: name || '',
    fillImgLink: keepLink && el.fillImgLink ? el.fillImgLink : newFillImgLink(),
    fillImgShow: true,
    fillImgKey: newFillImgKey(),
    noFill: false,
  };
  if (keepLink && el.fillImgLink) {
    return {
      ...base,
      fillImgX: el.fillImgX,
      fillImgY: el.fillImgY,
      fillImgW: el.fillImgW,
      fillImgH: el.fillImgH,
      fillImgRot: el.fillImgRot,
    };
  }
  // Detach from mosaic: place the new image centered, covering this shape only.
  return {
    ...base,
    ...coverFillImgLayout(el.w, el.h, natW != null ? natW : el.w, natH != null ? natH : el.h),
  };
}

function aabbFromPoints(pts) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function aabbOverlap(a, b) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

function obbCorners(cx, cy, w, h, rotDeg) {
  const rad = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = w / 2;
  const hh = h / 2;
  const local = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  return local.map(([x, y]) => ({
    x: cx + x * cos - y * sin,
    y: cy + x * sin + y * cos,
  }));
}

export function shapeAbsAabb(el) {
  const x = +el.x || 0;
  const y = +el.y || 0;
  const w = Math.max(1, +el.w || 1);
  const h = Math.max(1, +el.h || 1);
  return aabbFromPoints([
    rotLocalPoint(el, x, y),
    rotLocalPoint(el, x + w, y),
    rotLocalPoint(el, x + w, y + h),
    rotLocalPoint(el, x, y + h),
  ]);
}

/** Image placement in canvas space: center, size, absolute rotation. */
export function fillImgToAbs(el, layoutOverride = null) {
  const L = layoutOverride
    ? {
        x: +layoutOverride.x,
        y: +layoutOverride.y,
        w: Math.max(4, +layoutOverride.w),
        h: Math.max(4, +layoutOverride.h),
        rot: +layoutOverride.rot || 0,
      }
    : normalizeFillImgLayout(el, el.w, el.h);
  const localCx = (+el.x || 0) + L.x + L.w / 2;
  const localCy = (+el.y || 0) + L.y + L.h / 2;
  const c = rotLocalPoint(el, localCx, localCy);
  return {
    cx: c.x,
    cy: c.y,
    w: L.w,
    h: L.h,
    rot: elRotationDeg(el) + L.rot,
  };
}

export function fillImgAbsAabb(abs) {
  return aabbFromPoints(obbCorners(abs.cx, abs.cy, abs.w, abs.h, abs.rot));
}

/** Convert canvas-space image placement into element-local fillImg* fields. */
export function fillImgFromAbs(el, abs) {
  const shapeCx = (+el.x || 0) + Math.max(1, +el.w || 1) / 2;
  const shapeCy = (+el.y || 0) + Math.max(1, +el.h || 1) / 2;
  const rad = (-elRotationDeg(el) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = abs.cx - shapeCx;
  const dy = abs.cy - shapeCy;
  const localCx = shapeCx + dx * cos - dy * sin;
  const localCy = shapeCy + dx * sin + dy * cos;
  const w = Math.max(4, +abs.w || 4);
  const h = Math.max(4, +abs.h || 4);
  let rot = (+abs.rot || 0) - elRotationDeg(el);
  rot = ((rot % 360) + 360) % 360;
  if (rot > 180) rot -= 360;
  return {
    fillImgX: localCx - (+el.x || 0) - w / 2,
    fillImgY: localCy - (+el.y || 0) - h / 2,
    fillImgW: w,
    fillImgH: h,
    fillImgRot: Math.round(rot * 10) / 10,
  };
}

/**
 * Propagate one image across every shape the image rectangle touches.
 * Shapes that shared the link but no longer intersect lose the image (fill returns).
 * Deleting a shape is a no-op here — remaining members keep fillImg.
 * Per-shape fillImgShow:false is preserved (toggle to color fill).
 */
export function syncFillImgNetwork(els, sourceId, layoutOverride = null) {
  const list = els || [];
  const source = list.find((e) => e && String(e.id) === String(sourceId));
  if (!source || !shapeAcceptsFillImg(source)) return {};

  const layout = layoutOverride
    ? {
        x: layoutOverride.x,
        y: layoutOverride.y,
        w: layoutOverride.w,
        h: layoutOverride.h,
        rot: layoutOverride.rot,
      }
    : null;
  if (!source.fillImg) return {};

  const link = source.fillImgLink || newFillImgLink();
  const merged = {
    ...source,
    ...(layout
      ? {
          fillImgX: layout.x,
          fillImgY: layout.y,
          fillImgW: layout.w,
          fillImgH: layout.h,
          fillImgRot: layout.rot,
        }
      : null),
    fillImgLink: link,
  };
  const abs = fillImgToAbs(merged, layout);
  const imgAabb = fillImgAbsAabb(abs);
  const patches = {};
  const touched = new Set([String(sourceId)]);

  const srcLocal = layout
    ? {
        fillImgX: layout.x,
        fillImgY: layout.y,
        fillImgW: layout.w,
        fillImgH: layout.h,
        fillImgRot: layout.rot,
      }
    : {
        fillImgX: merged.fillImgX,
        fillImgY: merged.fillImgY,
        fillImgW: merged.fillImgW,
        fillImgH: merged.fillImgH,
        fillImgRot: merged.fillImgRot,
      };
  patches[sourceId] = {
    fillImg: merged.fillImg,
    fillImgName: merged.fillImgName || '',
    fillImgLink: link,
    fillImgKey: merged.fillImgKey || null,
    fillImgShow: source.fillImgShow === false ? false : true,
    noFill: false,
    ...srcLocal,
  };

  for (const el of list) {
    if (!shapeAcceptsFillImg(el)) continue;
    if (String(el.id) === String(sourceId)) continue;
    if (!aabbOverlap(imgAabb, shapeAbsAabb(el))) continue;
    touched.add(String(el.id));
    const keepOff = el.fillImgLink === link && el.fillImgShow === false;
    patches[el.id] = {
      fillImg: merged.fillImg,
      fillImgName: merged.fillImgName || '',
      fillImgLink: link,
      fillImgKey: merged.fillImgKey || null,
      fillImgShow: keepOff ? false : true,
      noFill: false,
      ...fillImgFromAbs(el, abs),
    };
  }

  for (const el of list) {
    if (!el?.fillImgLink || el.fillImgLink !== link) continue;
    if (touched.has(String(el.id))) continue;
    patches[el.id] = clearFillImgPatch();
  }

  return patches;
}

/**
 * Replace bitmap on elId (+ linked peers) and re-sync coverage in one patch map.
 * Forces the new src on every member that still has an image.
 */
export function buildFillImgReplacePatches(els, elId, src, name) {
  const list = els || [];
  const source = list.find((e) => e && String(e.id) === String(elId));
  if (!source) return {};
  const patch = fillImgReplacePatch(source, src, name || '');
  const virtual = list.map((e) => (e && String(e.id) === String(elId) ? { ...e, ...patch } : e));
  const sync = syncFillImgNetwork(virtual, elId);
  const out = { ...sync, [elId]: { ...(sync[elId] || {}), ...patch } };
  const key = patch.fillImgKey;
  for (const [id, p] of Object.entries(out)) {
    if (!p || p.fillImg == null) continue;
    out[id] = {
      ...p,
      fillImg: src,
      fillImgName: name || '',
      fillImgKey: key,
      fillImgShow: p.fillImgShow === false ? false : true,
    };
  }
  return out;
}

/** Remove image from this shape only — peers keep theirs. */
export function detachFillImg(els, elId) {
  const source = (els || []).find((e) => e && String(e.id) === String(elId));
  if (!source || !source.fillImg) return {};
  return { [elId]: clearFillImgPatch() };
}

/** @deprecated network-wide clear — prefer detachFillImg + toggle */
export function clearFillImgNetwork(els, elId) {
  return detachFillImg(els, elId);
}

export function sameFillImgEditGroup(a, b) {
  if (!shapeHasFillImgData(a) || !shapeHasFillImgData(b)) return false;
  if (a.fillImgLink && b.fillImgLink) return a.fillImgLink === b.fillImgLink;
  return String(a.id) === String(b.id);
}
