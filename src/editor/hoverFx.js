/** Hover effects for React canvas / preview / export (subset of js/19-hover.js). */

import { elBoxTransform } from './elTransform.js';

export const HFX_OFFSET = 8;

export const HOVER_PRESETS = [
  { id: 'none', labelRu: 'Без эффекта', labelEn: 'None' },
  { id: 'lighter', labelRu: 'Светлее', labelEn: 'Lighter' },
  { id: 'darker', labelRu: 'Темнее', labelEn: 'Darker' },
  { id: 'hue', labelRu: 'Сместить цвет', labelEn: 'Shift hue' },
  { id: 'right', labelRu: 'Вправо', labelEn: 'Right' },
  { id: 'up', labelRu: 'Вверх', labelEn: 'Up' },
  { id: 'imgColor', labelRu: 'Акцент: цвет', labelEn: 'Accent: color', imageOnly: true },
  { id: 'imgBw', labelRu: 'Акцент: Ч/Б', labelEn: 'Accent: B/W', imageOnly: true },
  { id: 'imgSepia', labelRu: 'Акцент: сепия', labelEn: 'Accent: sepia', imageOnly: true },
];

export function defaultHoverFx() {
  return {
    enabled: false,
    preset: 'lighter',
    dur: 0.3,
    hover: {},
    base: {},
  };
}

export function normalizeHoverFx(fx) {
  const out = fx && typeof fx === 'object' ? { ...fx } : {};
  if (out.dur == null || Number.isNaN(+out.dur)) out.dur = 0.3;
  if (!out.preset) out.preset = 'lighter';
  if (!out.hover || typeof out.hover !== 'object') out.hover = {};
  if (!out.base || typeof out.base !== 'object') out.base = {};
  return out;
}

export function presetsForEl(el, ru) {
  return HOVER_PRESETS.filter((p) => !p.imageOnly || el?.type === 'image').map((p) => ({
    id: p.id,
    label: ru ? p.labelRu : p.labelEn,
  }));
}

/** Filter-only presets hide custom text color/bg/border rows (legacy parity). */
export function isFilterOnlyHoverPreset(preset) {
  return (
    preset === 'lighter' ||
    preset === 'darker' ||
    preset === 'imgBw' ||
    preset === 'imgSepia' ||
    preset === 'imgColor'
  );
}

export function patchHoverFxField(fx, key, value) {
  const next = normalizeHoverFx(fx);
  next.enabled = true;
  next.hover = { ...next.hover, [key]: value };
  return next;
}

function imgAccentFilter(accent) {
  if (accent === 'bw') return 'grayscale(1)';
  if (accent === 'sepia') return 'sepia(1)';
  return '';
}

function presetFilter(preset) {
  if (preset === 'lighter') return 'brightness(1.25)';
  if (preset === 'darker') return 'brightness(0.75)';
  if (preset === 'hue') return 'hue-rotate(28deg)';
  if (preset === 'imgBw') return 'grayscale(1)';
  if (preset === 'imgSepia') return 'sepia(1)';
  if (preset === 'imgColor') return '';
  return '';
}

/**
 * Build hoverFx after enabling or changing preset.
 * Keeps custom text hover colors when switching non-filter presets.
 */
export function withHoverPreset(el, fx, preset) {
  const prev = normalizeHoverFx(fx);
  const next = normalizeHoverFx(fx);
  next.enabled = true;
  next.preset = preset || next.preset || 'lighter';
  next.base = {
    x: el?.x || 0,
    y: el?.y || 0,
    w: el?.w || 100,
    h: el?.h || 60,
    rot: el?.rot || 0,
    scale: 1,
    elOpacity: el?.elOpacity != null ? +el.elOpacity : 1,
  };
  const hover = { ...next.base };
  if (next.preset === 'right') hover.x = (next.base.x || 0) + HFX_OFFSET;
  else if (next.preset === 'up') hover.y = (next.base.y || 0) - HFX_OFFSET;

  if (!isFilterOnlyHoverPreset(next.preset) && el?.type === 'text') {
    ['textColor', 'textBg', 'textBgOp', 'textBorderW', 'textBorderColor'].forEach((k) => {
      if (prev.hover && prev.hover[k] != null && prev.hover[k] !== '') hover[k] = prev.hover[k];
    });
  }
  next.hover = hover;
  return next;
}

/**
 * Style patch for hovered / resting state (merged onto element box).
 */
export function hoverMotionStyle(el, fx, hovered) {
  const n = normalizeHoverFx(fx);
  if (!n.enabled) return null;
  const dur = `${Math.max(0.05, Math.min(2, +n.dur || 0.3))}s`;
  const baseXf = elBoxTransform(el) || '';
  const rest = {
    transition: `transform ${dur} ease, filter ${dur} ease, opacity ${dur} ease, color ${dur} ease, background ${dur} ease, border ${dur} ease`,
    cursor: 'pointer',
  };
  if (!hovered) {
    return { ...rest };
  }

  const preset = n.preset || 'none';
  const parts = [];
  if (baseXf) parts.push(baseXf);
  if (preset === 'right') parts.push(`translateX(${HFX_OFFSET}px)`);
  else if (preset === 'up') parts.push(`translateY(-${HFX_OFFSET}px)`);
  else if (n.hover && n.hover.scale != null && +n.hover.scale !== 1) {
    parts.push(`scale(${+n.hover.scale})`);
  }

  let filter = '';
  if (el?.type === 'image') {
    const base = imgAccentFilter(el.imgAccent);
    if (preset === 'imgBw') filter = 'grayscale(1)';
    else if (preset === 'imgSepia') filter = 'sepia(1)';
    else if (preset === 'imgColor') filter = '';
    else {
      const pf = presetFilter(preset);
      filter = [base, pf].filter(Boolean).join(' ');
    }
  } else {
    filter = presetFilter(preset) || '';
  }

  const out = { ...rest };
  if (parts.length) out.transform = parts.join(' ');
  if (filter) out.filter = filter;
  if (n.hover && n.hover.elOpacity != null && +n.hover.elOpacity !== 1) {
    out.opacity = +n.hover.elOpacity;
  }

  if (el?.type === 'text' && !isFilterOnlyHoverPreset(preset)) {
    const h = n.hover || {};
    if (h.textColor) out.color = h.textColor;
    if (h.textBg) out.background = h.textBg;
    const bw = +(h.textBorderW || 0);
    if (bw > 0) {
      out.border = `${bw}px solid ${h.textBorderColor || '#ffffff'}`;
      out.boxSizing = 'border-box';
    }
  }
  return out;
}

/** data-* attrs for export / playback. */
export function hoverExportAttrs(el) {
  const fx = el?.hoverFx;
  if (!fx || !fx.enabled) return {};
  const n = normalizeHoverFx(fx);
  const h = n.hover || {};
  const attrs = {
    'data-hfx': '1',
    'data-hfx-preset': n.preset || 'lighter',
    'data-hfx-dur': String(n.dur != null ? n.dur : 0.3),
  };
  if (el?.type === 'text' && !isFilterOnlyHoverPreset(n.preset)) {
    if (h.textColor) attrs['data-hfx-text'] = h.textColor;
    if (h.textBg) attrs['data-hfx-bg'] = h.textBg;
    if (+h.textBorderW > 0) {
      attrs['data-hfx-bw'] = String(+h.textBorderW);
      attrs['data-hfx-bc'] = h.textBorderColor || '#ffffff';
    }
  }
  return attrs;
}

/** Inline CSS class helpers for standalone HTML. */
export const PLAYBACK_HOVER_CSS = `
.el[data-hfx="1"]{cursor:pointer;transition:transform var(--hfx-dur,.3s) ease,filter var(--hfx-dur,.3s) ease,opacity var(--hfx-dur,.3s) ease,color var(--hfx-dur,.3s) ease,background var(--hfx-dur,.3s) ease,border var(--hfx-dur,.3s) ease}
`.replace(/\n/g, '');

function applyHoverDom(el, on) {
  const p = el.getAttribute('data-hfx-preset') || 'lighter';
  const dur = el.getAttribute('data-hfx-dur') || '0.3';
  el.style.setProperty('--hfx-dur', `${dur}s`);
  if (!el.hasAttribute('data-hfx-base-xf')) {
    el.setAttribute('data-hfx-base-xf', el.style.transform || '');
  }
  const base = el.getAttribute('data-hfx-base-xf') || '';
  if (!on) {
    el.style.transform = base;
    el.style.filter = '';
    el.style.color = '';
    el.style.background = '';
    el.style.border = '';
    return;
  }
  let t = base;
  if (p === 'right') t = `${base} translateX(8px)`.trim();
  else if (p === 'up') t = `${base} translateY(-8px)`.trim();
  el.style.transform = t;
  if (p === 'lighter') el.style.filter = 'brightness(1.25)';
  else if (p === 'darker') el.style.filter = 'brightness(0.75)';
  else if (p === 'hue') el.style.filter = 'hue-rotate(28deg)';
  else if (p === 'imgBw') el.style.filter = 'grayscale(1)';
  else if (p === 'imgSepia') el.style.filter = 'sepia(1)';
  else el.style.filter = '';

  const tc = el.getAttribute('data-hfx-text');
  const bg = el.getAttribute('data-hfx-bg');
  const bw = +(el.getAttribute('data-hfx-bw') || 0);
  const bc = el.getAttribute('data-hfx-bc') || '#ffffff';
  if (tc) el.style.color = tc;
  if (bg) el.style.background = bg;
  if (bw > 0) el.style.border = `${bw}px solid ${bc}`;
}

/** Wire mouseenter/leave for elements with data-hfx in a DOM root. Returns cleanup. */
export function wireHoverInRoot(root) {
  if (!root) return () => {};
  const pairs = [];
  root.querySelectorAll('.el[data-hfx="1"]').forEach((el) => {
    const onEnter = () => applyHoverDom(el, true);
    const onLeave = () => applyHoverDom(el, false);
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    pairs.push([el, onEnter, onLeave]);
  });
  return () => {
    pairs.forEach(([el, onEnter, onLeave]) => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    });
  };
}

/** Tiny runtime for standalone/playback pages. */
export function buildHoverPlaybackSnippet() {
  return `(function(){
  function apply(el, on){
    var p=el.getAttribute('data-hfx-preset')||'lighter';
    var dur=el.getAttribute('data-hfx-dur')||'0.3';
    el.style.setProperty('--hfx-dur', dur+'s');
    if(!el.hasAttribute('data-hfx-base-xf')) el.setAttribute('data-hfx-base-xf', el.style.transform||'');
    var base=el.getAttribute('data-hfx-base-xf')||'';
    if(!on){
      el.style.transform=base; el.style.filter='';
      el.style.color=''; el.style.background=''; el.style.border='';
      return;
    }
    var t=base;
    if(p==='right') t=(base+' translateX(8px)').trim();
    else if(p==='up') t=(base+' translateY(-8px)').trim();
    el.style.transform=t;
    if(p==='lighter') el.style.filter='brightness(1.25)';
    else if(p==='darker') el.style.filter='brightness(0.75)';
    else if(p==='hue') el.style.filter='hue-rotate(28deg)';
    else if(p==='imgBw') el.style.filter='grayscale(1)';
    else if(p==='imgSepia') el.style.filter='sepia(1)';
    else if(p==='imgColor') el.style.filter='';
    else el.style.filter='';
    var tc=el.getAttribute('data-hfx-text');
    var bg=el.getAttribute('data-hfx-bg');
    var bw=+(el.getAttribute('data-hfx-bw')||0);
    var bc=el.getAttribute('data-hfx-bc')||'#ffffff';
    if(tc) el.style.color=tc;
    if(bg) el.style.background=bg;
    if(bw>0) el.style.border=bw+'px solid '+bc;
  }
  document.querySelectorAll('.el[data-hfx="1"]').forEach(function(el){
    el.addEventListener('mouseenter', function(){ apply(el, true); });
    el.addEventListener('mouseleave', function(){ apply(el, false); });
  });
})();`;
}
