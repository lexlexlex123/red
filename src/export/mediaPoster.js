/** Video frame / stage canvas posters for Office export (instead of a text plate). */

import { dataUrlToPart } from './nativeShared.js';

function existingPosterSrc(el) {
  const src = el?.poster || el?.mediaPoster || el?.thumbSrc || el?.previewSrc;
  if (src && typeof src === 'string' && src.startsWith('data:image')) return src;
  return '';
}

export function posterFromDataUrl(src) {
  if (!src) return null;
  try {
    return dataUrlToPart(src);
  } catch (e) {
    return null;
  }
}

export async function captureVideoFramePoster(el) {
  const ready = existingPosterSrc(el);
  if (ready) return posterFromDataUrl(ready);
  const src = el?.mediaSrc;
  if (!src || typeof document === 'undefined') return null;
  if (typeof src === 'string' && src.startsWith('data:image')) return posterFromDataUrl(src);
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = src;
    await new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('video poster timeout')), 2200);
      video.onloadeddata = () => {
        clearTimeout(t);
        res();
      };
      video.onerror = () => {
        clearTimeout(t);
        rej(new Error('video poster error'));
      };
    });
    try {
      video.currentTime = Math.min(0.25, (video.duration || 1) * 0.05);
      await new Promise((res) => {
        const t = setTimeout(res, 350);
        video.onseeked = () => {
          clearTimeout(t);
          res();
        };
      });
    } catch (e) {}
    const w = Math.max(80, video.videoWidth || Math.round(+el.w || 320));
    const h = Math.max(45, video.videoHeight || Math.round(+el.h || 180));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').drawImage(video, 0, 0, w, h);
    video.src = '';
    return dataUrlToPart(c.toDataURL('image/png'));
  } catch (e) {
    return null;
  }
}

export function captureStageElPoster(el) {
  if (!el || typeof document === 'undefined') return null;
  try {
    const node = document.querySelector(`.react-slide-stage .react-el[data-id="${el.id}"]`);
    if (!node) return null;
    const canvas = node.querySelector('canvas');
    if (canvas && canvas.width && canvas.height) {
      return dataUrlToPart(canvas.toDataURL('image/png'));
    }
    const img = node.querySelector('img');
    if (img && img.complete && img.naturalWidth) {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return dataUrlToPart(c.toDataURL('image/png'));
    }
  } catch (e) {}
  return null;
}

export async function resolveExportPoster(el, fallbackPart) {
  const fromField = posterFromDataUrl(existingPosterSrc(el));
  if (fromField) return fromField;
  if (el?.type === 'mediavideo') {
    const frame = await captureVideoFramePoster(el);
    if (frame) return frame;
  }
  const stage = captureStageElPoster(el);
  if (stage) return stage;
  return fallbackPart || null;
}
