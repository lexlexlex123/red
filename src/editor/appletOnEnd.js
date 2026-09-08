/** Helpers for timer/counter “on end → animation” (v7.1 parity). */

import { findAnimItem, animLabel } from './anims.js';

/** Animations on this slide that use this applet as counter/timer trigger. */
export function listAppletTriggerAnims(slide, appletElId, triggerType) {
  const out = [];
  if (!slide || !appletElId || !triggerType) return out;
  const aid = String(appletElId);
  (slide.els || []).forEach((d) => {
    if (!d || d._isDecor) return;
    (d.anims || []).forEach((a, ai) => {
      if (!a) return;
      if ((a.trigger || 'auto') !== triggerType) return;
      if (String(a.triggerElId || '') !== aid) return;
      out.push({ elId: d.id, ai, ref: `${d.id}:${ai}` });
    });
  });
  return out;
}

export function isValidAppletAnimRef(slide, appletElId, ref, triggerType) {
  if (!ref || !slide || !appletElId || !triggerType) return false;
  const parts = String(ref).split(':');
  if (parts.length < 2) return false;
  const elId = parts[0];
  const ai = +parts[1];
  if (!Number.isFinite(ai) || ai < 0) return false;
  const d = (slide.els || []).find((x) => x && String(x.id) === String(elId));
  const a = d && d.anims && d.anims[ai];
  if (!a) return false;
  if ((a.trigger || 'auto') !== triggerType) return false;
  if (String(a.triggerElId || '') !== String(appletElId)) return false;
  return true;
}

/** Prefer exit anims; otherwise last matching ref. */
export function resolveAppletAnimRef(slide, appletElId, ref, triggerType) {
  if (isValidAppletAnimRef(slide, appletElId, ref, triggerType)) return ref;
  const list = listAppletTriggerAnims(slide, appletElId, triggerType);
  if (!list.length) return ref || '';
  const oldElId = ref ? String(ref).split(':')[0] : '';
  const pool = oldElId ? list.filter((x) => String(x.elId) === String(oldElId)) : list;
  const items = pool.length ? pool : list;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const d = (slide.els || []).find((x) => x && String(x.id) === String(item.elId));
    const a = d && d.anims && d.anims[item.ai];
    if (a && a.cat === 'exit') return item.ref;
  }
  return items[items.length - 1].ref;
}

/** If onEnd is anim and ref is missing/invalid, pick a valid one. Returns patch or null. */
export function ensureAppletOnEndAnim(el, slide) {
  if (!el || el.type !== 'applet') return null;
  const isCounter = el.appletId === 'counter';
  const isTimer = el.appletId === 'timer';
  if (!isCounter && !isTimer) return null;
  const propEnd = isCounter ? 'cntOnEnd' : 'tmOnEnd';
  const propAnim = isCounter ? 'cntOnEndAnim' : 'tmOnEndAnim';
  const trig = isCounter ? 'counter' : 'timer';
  if ((el[propEnd] || 'none') !== 'anim') return null;
  if (isValidAppletAnimRef(slide, el.id, el[propAnim] || '', trig)) return null;
  const resolved = resolveAppletAnimRef(slide, el.id, el[propAnim] || '', trig);
  if (!resolved) return null;
  if (resolved === (el[propAnim] || '')) return null;
  return { [propAnim]: resolved };
}

function elObjLabel(d, lang) {
  const ru = lang !== 'en';
  if (!d) return ru ? 'Объект' : 'Object';
  if (d.type === 'text') {
    const tmp = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (tmp) {
      tmp.innerHTML = d.html || '';
      const txt = (tmp.textContent || '').slice(0, 20).trim();
      if (txt) return txt;
    }
    return ru ? 'Текст' : 'Text';
  }
  if (d.type === 'shape') return ru ? 'Фигура' : 'Shape';
  if (d.type === 'image') return ru ? 'Изображение' : 'Image';
  if (d.type === 'applet') {
    if (d.appletId === 'counter') return ru ? 'Счётчик' : 'Counter';
    if (d.appletId === 'timer') return ru ? 'Таймер' : 'Timer';
    return d.appletId || (ru ? 'Аплет' : 'Applet');
  }
  return d.type || (ru ? 'Объект' : 'Object');
}

export function appletAnimOptionLabel(slide, elId, ai, lang = 'ru') {
  if (!slide) return `${elId}:${ai}`;
  const d = (slide.els || []).find((x) => x && String(x.id) === String(elId));
  const a = d && d.anims && d.anims[ai];
  if (!a) return `${elId}:${ai}`;
  const info = findAnimItem(a.name);
  const animLbl = info
    ? `${info.icon || ''} ${animLabel(info, lang === 'en' ? 'en' : 'ru')}`.trim()
    : a.name;
  return `${elObjLabel(d, lang)} — ${animLbl}`;
}

/** Label for a picked timer/counter/object (search all slides). */
export function triggerElLabel(slides, elId, lang = 'ru') {
  const ru = lang !== 'en';
  if (!elId) return '';
  for (const slide of slides || []) {
    const d = (slide?.els || []).find((e) => e && String(e.id) === String(elId));
    if (!d) continue;
    if (d.type === 'applet') {
      if (d.appletId === 'counter') return ru ? '🔢 Счётчик' : '🔢 Counter';
      if (d.appletId === 'timer') return ru ? '⏱ Таймер' : '⏱ Timer';
      if (d.appletId === 'generator') return ru ? '🎲 Генератор' : '🎲 Generator';
      return ru ? 'Аплет' : 'Applet';
    }
    return elObjLabel(d, lang);
  }
  return String(elId);
}

/** Find element by id across deck (for cross-slide trigger pick). */
export function findElAcrossSlides(slides, elId) {
  if (!elId) return null;
  for (let si = 0; si < (slides || []).length; si++) {
    const el = (slides[si]?.els || []).find((e) => e && String(e.id) === String(elId));
    if (el) return { el, slideIdx: si, slide: slides[si] };
  }
  return null;
}
