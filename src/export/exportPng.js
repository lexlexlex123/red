/** PNG export of React slide stage via snapdom. */

import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from '../editor/canvasDims.js';
import { loadScript } from '../shared/loadScript.js';
import { ensureJSZip } from '../shared/jszip.js';
import { waitFrame, downloadBlob, canvasToBlob } from './exportDom.js';

async function ensureSnapdom() {
  if (typeof window.snapdom === 'function') return window.snapdom;
  await loadScript('/libs/snapdom.min.js');
  if (typeof window.snapdom !== 'function') throw new Error('snapdom unavailable');
  return window.snapdom;
}

/**
 * Capture `.react-slide-stage` to a canvas.
 */
export async function captureStageCanvas(W, H) {
  const stage = document.querySelector('.react-slide-stage');
  if (!stage) throw new Error('Slide stage not found');
  const snap = await ensureSnapdom();
  document.body.classList.add('export-capturing');
  try {
    if (document.fonts?.ready) {
      try {
        await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 600))]);
      } catch (e) {}
    }
    await waitFrame();
    const opts = {
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
      cnv = await snap.toCanvas(stage, opts);
    } else {
      const result = await snap(stage, opts);
      if (result && typeof result.toCanvas === 'function') cnv = await result.toCanvas();
      else if (result instanceof HTMLCanvasElement) cnv = result;
    }
    if (!cnv || !cnv.width) throw new Error('Empty capture');
    return cnv;
  } finally {
    document.body.classList.remove('export-capturing');
  }
}

export async function exportCurrentSlidePng(opts = {}) {
  const W = opts.canvasW || DEFAULT_CANVAS_W;
  const H = opts.canvasH || DEFAULT_CANVAS_H;
  const name = (opts.filename || 'slide') + '.png';
  const cnv = await captureStageCanvas(W, H);
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
  try {
    for (let k = 0; k < idxs.length; k++) {
      const i = idxs[k];
      setCur(i);
      await waitFrame();
      await waitFrame();
      const cnv = await captureStageCanvas(canvasW || DEFAULT_CANVAS_W, canvasH || DEFAULT_CANVAS_H);
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
