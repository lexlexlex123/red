/** Preview / playback helpers for mediavideo + mediaaudio. */

import { resolveMediaSrc } from './mediaStore.js';

export function mediaTriggerIds(el) {
  if (!el) return [];
  if (Array.isArray(el.maTriggerElIds) && el.maTriggerElIds.length) return el.maTriggerElIds.map(String);
  if (el.maTriggerElId != null && el.maTriggerElId !== '') return [String(el.maTriggerElId)];
  return [];
}

export function shouldPlayAudioOnElClick(audioEl, clickedId) {
  if (!audioEl || audioEl.type !== 'mediaaudio') return false;
  const mode = audioEl.maStart || 'click-el';
  if (mode === 'auto' || mode === 'click-slide') return false;
  const trig = mediaTriggerIds(audioEl);
  if (!trig.length) return String(clickedId) === String(audioEl.id);
  return trig.some((id) => String(id) === String(clickedId));
}

export function slideAudiosForMode(els, mode) {
  return (els || []).filter((e) => e && e.type === 'mediaaudio' && (e.maStart || 'click-el') === mode);
}

export function playMediaEl(el, { audioPool } = {}) {
  if (!el) return null;
  const src = resolveMediaSrc(el);
  if (!src) return null;
  if (el.type === 'mediaaudio') {
    const a = new Audio(src);
    a.volume = el.maVolume != null ? Math.max(0, Math.min(1, +el.maVolume)) : 1;
    a.loop = !!el.maLoop;
    a.play().catch(() => {});
    if (audioPool) audioPool.push(a);
    return a;
  }
  return null;
}

export function stopMediaPool(pool) {
  if (!pool || !pool.length) return;
  pool.forEach((a) => {
    try {
      a.pause();
      a.src = '';
    } catch (e) {}
  });
  pool.length = 0;
}

/** Open a fixed fullscreen video overlay (legacy _pvFullscreen). Returns destroy(). */
export function openFullscreenVideo(src, { controls = true, onClose } = {}) {
  if (typeof document === 'undefined' || !src) return () => {};
  const ov = document.createElement('div');
  ov.className = 'react-pv-fs-video';
  ov.style.cssText =
    'position:fixed;inset:0;background:#000;z-index:99999;display:flex;align-items:center;justify-content:center;';
  const v = document.createElement('video');
  v.src = src;
  v.autoplay = true;
  v.playsInline = true;
  if (controls) v.controls = true;
  v.style.cssText = 'max-width:100%;max-height:100%;outline:none;';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '✕';
  btn.setAttribute('aria-label', 'Close');
  btn.style.cssText =
    'position:absolute;top:16px;right:20px;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:20px;cursor:pointer;padding:6px 12px;border-radius:6px;';
  const destroy = () => {
    try {
      v.pause();
    } catch (e) {}
    if (ov.parentNode) ov.parentNode.removeChild(ov);
    document.removeEventListener('keydown', onKey);
    if (typeof onClose === 'function') onClose();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      destroy();
    }
  };
  btn.onclick = (e) => {
    e.stopPropagation();
    destroy();
  };
  ov.onclick = (e) => {
    if (e.target === ov) destroy();
  };
  document.addEventListener('keydown', onKey, true);
  ov.appendChild(v);
  ov.appendChild(btn);
  document.body.appendChild(ov);
  return destroy;
}

export function isFullscreenVideo(el) {
  return !!(el && el.type === 'mediavideo' && el.mvDisplay === 'fullscreen');
}
