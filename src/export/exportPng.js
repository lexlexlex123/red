/** PNG export of React slide stage via snapdom. */

import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from '../editor/canvasDims.js';
import { isHttpUrl } from '../editor/htmlFrame.js';
import { loadScript } from '../shared/loadScript.js';
import { ensureJSZip } from '../shared/jszip.js';
import { waitFrame, downloadBlob, canvasToBlob } from './exportDom.js';
import { captureHtmlFrameSnapshot } from '../editor/htmlFrameSnapshot.js';

async function ensureSnapdom() {
  if (typeof window.snapdom === 'function') return window.snapdom;
  await loadScript('/libs/snapdom.min.js');
  if (typeof window.snapdom !== 'function') throw new Error('snapdom unavailable');
  return window.snapdom;
}

/** Inline (srcdoc) HTML frames that need a raster snapshot for export/print. */
export function slideHtmlFramesForSnapshot(slide) {
  return (slide?.els || []).filter(
    (e) => e && e.type === 'htmlframe' && String(e.hfSrc || '').trim() && !isHttpUrl(e.hfSrc)
  );
}

/** Timer / periodic / clock / … applets live in sandboxed srcdoc iframes — snapdom can't see inside. */
export function slideAppletsForSnapshot(slide) {
  return (slide?.els || []).filter(
    (e) => e && e.type === 'applet' && (e.appletHtml || e.appletId)
  );
}

export function slideNeedsHtmlFrameSnapshot(slide) {
  return slideHtmlFramesForSnapshot(slide).length > 0 || slideAppletsForSnapshot(slide).length > 0;
}

let fontsReadyOnce = null;
async function ensureFontsReadyOnce() {
  if (!document.fonts?.ready) return;
  if (!fontsReadyOnce) {
    fontsReadyOnce = Promise.race([
      document.fonts.ready,
      new Promise((r) => setTimeout(r, 600)),
    ]).catch(() => {});
  }
  await fontsReadyOnce;
}

async function rasterizeSrcdocFrame(frame, rawHtml, cleanups) {
  const wrapper = frame.parentElement;
  if (!wrapper) return;
  const raw = String(rawHtml || '').trim();
  if (!raw) return;

  const rect = frame.getBoundingClientRect();
  const canvas = await captureHtmlFrameSnapshot(raw, rect.width, rect.height);
  const image = document.createElement('img');
  image.alt = '';
  image.draggable = false;
  image.className = 'react-export-iframe-snap';
  image.src = canvas.toDataURL('image/png');
  image.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:20;pointer-events:none;';
  wrapper.appendChild(image);

  const previousVisibility = frame.style.visibility;
  const overlays = [...wrapper.querySelectorAll('.react-hf-overlay,.applet-border-overlay')];
  const overlayPrev = overlays.map((node) => node.style.visibility);
  overlays.forEach((node) => {
    node.style.visibility = 'hidden';
  });

  cleanups.push(() => {
    image.remove();
    frame.style.visibility = previousVisibility;
    overlays.forEach((node, i) => {
      node.style.visibility = overlayPrev[i] || '';
    });
  });
  await image.decode().catch(() => {});
  frame.style.visibility = 'hidden';
}

async function prepareHtmlFrameSnapshots(stage, slide) {
  const neededHf = slideHtmlFramesForSnapshot(slide);
  const neededApplets = slideAppletsForSnapshot(slide);
  if (!neededHf.length && !neededApplets.length) return () => {};

  const hfById = new Map(neededHf.map((e) => [String(e.id), e]));
  const appletById = new Map(neededApplets.map((e) => [String(e.id), e]));
  const cleanups = [];
  try {
    for (const frame of stage.querySelectorAll('.react-hf-iframe-wrap > iframe.react-hf-iframe')) {
      if (frame.getAttribute('src')) continue;
      const host = frame.closest('[data-id]');
      const id = host ? String(host.getAttribute('data-id') || '') : '';
      const el = id ? hfById.get(id) : null;
      // Only snapshot frames that belong to this slide's HTML inserts — never a
      // leftover DOM node, empty shell, or URL iframe.
      if (!el) continue;
      const raw = String(el.hfSrc || '').trim();
      if (!raw) continue;
      await rasterizeSrcdocFrame(frame, raw, cleanups);
    }

    for (const frame of stage.querySelectorAll('iframe[data-applet-id]')) {
      const host = frame.closest('[data-id]');
      const id = host ? String(host.getAttribute('data-id') || '') : '';
      if (!id || !appletById.has(id)) continue;
      // Prefer live srcdoc (theme-rebuilt periodic, counter group value, …).
      const raw =
        String(frame.srcdoc || frame.getAttribute('srcdoc') || '').trim() ||
        String(appletById.get(id)?.appletHtml || '').trim();
      if (!raw) continue;
      await rasterizeSrcdocFrame(frame, raw, cleanups);
    }
  } catch (error) {
    cleanups.forEach((cleanup) => cleanup());
    throw error;
  }
  return () => cleanups.forEach((cleanup) => cleanup());
}

/**
 * Capture `.react-slide-stage` to a canvas.
 * @param {number} W
 * @param {number} H
 * @param {{ slide?: object, skipFonts?: boolean }} [opts]
 */
export async function captureStageCanvas(W, H, opts = {}) {
  const stage = document.querySelector('.react-slide-stage');
  if (!stage) throw new Error('Slide stage not found');
  const snap = await ensureSnapdom();
  document.body.classList.add('export-capturing');
  let restoreHtmlFrames = () => {};
  try {
    const slide = opts.slide;
    // Without a slide model, do not guess from DOM — empty HF shells / click-through
    // srcdoc would otherwise reintroduce a long wait on every capture.
    if (slide && slideNeedsHtmlFrameSnapshot(slide)) {
      restoreHtmlFrames = await prepareHtmlFrameSnapshots(stage, slide);
    }
    if (!opts.skipFonts) {
      await ensureFontsReadyOnce();
    }
    await waitFrame();
    const captureOpts = {
      width: Math.max(1, Math.round(W || DEFAULT_CANVAS_W)),
      height: Math.max(1, Math.round(H || DEFAULT_CANVAS_H)),
      scale: 1,
      dpr: 1,
      backgroundColor: null,
      embedFonts: false,
      exclude: [
        '.react-rh',
        '.react-guide-extra',
        '.react-rubberband',
        '.react-align-bar',
        '.react-img-crop-overlay',
        '.react-cp-group',
      ],
      excludeMode: 'remove',
    };
    let cnv = null;
    if (typeof snap.toCanvas === 'function') {
      cnv = await snap.toCanvas(stage, captureOpts);
    } else {
      const result = await snap(stage, captureOpts);
      if (result && typeof result.toCanvas === 'function') cnv = await result.toCanvas();
      else if (result instanceof HTMLCanvasElement) cnv = result;
    }
    if (!cnv || !cnv.width) throw new Error('Empty capture');
    return cnv;
  } finally {
    restoreHtmlFrames();
    document.body.classList.remove('export-capturing');
  }
}

export async function exportCurrentSlidePng(opts = {}) {
  const W = opts.canvasW || DEFAULT_CANVAS_W;
  const H = opts.canvasH || DEFAULT_CANVAS_H;
  const name = (opts.filename || 'slide') + '.png';
  const cnv = await captureStageCanvas(W, H, { slide: opts.slide });
  const blob = await canvasToBlob(cnv);
  downloadBlob(blob, name);
  return true;
}

export async function exportAllSlidesPngZip(opts = {}) {
  const { slides, canvasW, canvasH, setCur, cur, title, indices } = opts;
  if (!slides?.length) throw new Error('No slides');
  const idxs =
    Array.isArray(indices) && indices.length
      ? indices.filter((i) => i >= 0 && i < slides.length)
      : slides.map((_, i) => i);
  if (!idxs.length) throw new Error('No slides in range');
  const JSZip = await ensureJSZip();
  const zip = new JSZip();
  const prev = cur | 0;
  await ensureFontsReadyOnce();
  try {
    for (let k = 0; k < idxs.length; k++) {
      const i = idxs[k];
      const slide = slides[i];
      setCur(i);
      await waitFrame();
      await waitFrame();
      // Extra paint only when this slide actually has an inline HTML frame to rasterize.
      if (slideNeedsHtmlFrameSnapshot(slide)) {
        await waitFrame();
        await waitFrame();
      }
      const cnv = await captureStageCanvas(canvasW || DEFAULT_CANVAS_W, canvasH || DEFAULT_CANVAS_H, {
        slide,
        skipFonts: true,
      });
      const blob = await canvasToBlob(cnv);
      zip.file(`slide-${String(i + 1).padStart(2, '0')}.png`, blob);
    }
  } finally {
    setCur(prev);
    await waitFrame();
  }
  const out = await zip.generateAsync({ type: 'blob' });
  downloadBlob(out, (title || 'slides') + '-png.zip');
  return idxs.length;
}
