/** Preview / playback helpers for mediavideo + mediaaudio. */

import { resolveMediaSrc } from './mediaStore.js';
import { getTheme, schemeSwatchColor } from './themes.js';

/** Palette position «15» (col 0, row 4) — same as formulas / default accents. */
export const AUDIO_CTRL_SCHEME = { col: 0, row: 4 };

/** full | notime | icon — based on box width/height (editor + thumbs). */
export function audioPlayerLayout(w, h) {
  const width = Math.max(0, +w || 0);
  const height = Math.max(1, +h || 1);
  const aspect = width / height;
  if (height >= 52 && aspect < 1.55) return 'icon';
  if (aspect < 1.25 && height >= 44) return 'icon';
  if (width < 72) return 'icon';

  const btn = Math.max(18, Math.round(height * 0.58));
  const timeW = Math.max(56, Math.round(height * 0.34 * 5.6));
  const gap = Math.max(6, Math.round(height * 0.14));
  const pad = Math.max(8, Math.round(height * 0.2));
  const endPad = Math.max(14, Math.round(height / 2));
  const fullNeed = pad + btn + gap + timeW + gap + Math.max(48, height) + endPad;
  const midNeed = pad + btn + gap + 36 + endPad;
  if (width >= fullNeed) return 'full';
  if (width >= midNeed) return 'notime';
  return 'icon';
}

/** Cover + controls from the applied colour scheme. */
export function audioPlayerTheme(themeOrIdx) {
  const theme =
    themeOrIdx && typeof themeOrIdx === 'object'
      ? themeOrIdx
      : getTheme(themeOrIdx);
  const dark = !theme || theme.dark !== false;
  const ctrl =
    (theme && schemeSwatchColor(theme, AUDIO_CTRL_SCHEME.col, AUDIO_CTRL_SCHEME.row)) ||
    (theme && (theme.ac1 || theme.accent)) ||
    '#6366f1';
  // Cover follows scheme polarity; controls use palette «15»; time contrasts the cover.
  return {
    accent: ctrl,
    controls: ctrl,
    panel: dark ? '#1e293b' : '#f1f5f9',
    time: dark ? '#f8fafc' : '#0f172a',
    colorScheme: dark ? 'dark' : 'light',
  };
}

/** Inline styles for the host wrapping a themed <audio controls>. */
export function audioPlayerHostStyle(themeOrIdx, extra = {}) {
  const t = audioPlayerTheme(themeOrIdx);
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    padding: 0,
    overflow: 'visible',
    ...extra,
    ['--react-audio-accent']: t.accent,
    ['--react-audio-controls']: t.controls,
    ['--react-audio-panel']: t.panel,
    ['--react-audio-time']: t.time,
    colorScheme: t.colorScheme,
  };
}

export function audioPlayerElStyle() {
  return {
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    accentColor: 'var(--react-audio-accent, #6366f1)',
    color: 'var(--react-audio-controls, #6366f1)',
    colorScheme: 'inherit',
  };
}

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

/** Visible themed players register here so trigger/auto play drives the UI timeline. */
const audioPlayers = new Map();

export function registerAudioPlayer(elId, api) {
  if (elId == null || !api) return () => {};
  const key = String(elId);
  audioPlayers.set(key, api);
  return () => {
    if (audioPlayers.get(key) === api) audioPlayers.delete(key);
  };
}

export function getRegisteredAudioPlayer(elId) {
  if (elId == null) return null;
  return audioPlayers.get(String(elId)) || null;
}

export function playMediaEl(el, { audioPool } = {}) {
  if (!el) return null;
  const src = resolveMediaSrc(el);
  if (!src) return null;
  if (el.type === 'mediaaudio') {
    const vol = el.maVolume != null ? Math.max(0, Math.min(1, +el.maVolume)) : 1;
    const reg = getRegisteredAudioPlayer(el.id);
    if (reg) {
      const existing = typeof reg.getAudio === 'function' ? reg.getAudio() : null;
      if (existing) {
        existing.volume = vol;
        existing.loop = !!el.maLoop;
        if (!existing.src && src) existing.src = src;
      }
      const a =
        (typeof reg.play === 'function' ? reg.play() : null) || existing;
      if (a && audioPool && !audioPool.includes(a)) audioPool.push(a);
      return a || null;
    }
    const a = new Audio(src);
    a.volume = vol;
    a.loop = !!el.maLoop;
    a.play().catch(() => {});
    if (audioPool) audioPool.push(a);
    return a;
  }
  return null;
}

export function stopMediaPool(pool) {
  audioPlayers.forEach((api) => {
    try {
      api.pause?.();
    } catch (e) {}
  });
  if (!pool || !pool.length) return;
  pool.forEach((a) => {
    try {
      a.pause();
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
