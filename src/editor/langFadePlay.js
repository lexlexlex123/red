/**
 * langFade («Перевод»): cross-fade between fromHtml and toHtml (toggle each play).
 * From js/10c-anim-engine.js _fireLangFadeAnim / _langFadeTel.
 */

import { plainFromHtml, translatePlain, translateTargetFromText, applyTranslationToHtml } from './translate.js';

export function isLangFadeAnim(name) {
  return name === 'langFade';
}

export function langFadeTel(domEl, elData) {
  if (!domEl) return null;
  const type = elData?.type || domEl.dataset?.type || '';
  if (type === 'text') {
    const wrap = domEl.querySelector('._langfade_wrap');
    if (wrap?.parentNode) return wrap.parentNode;
    const editable = domEl.querySelector('[contenteditable]');
    if (editable) return editable;
    const divs = Array.from(domEl.querySelectorAll(':scope > div'));
    return divs.find((dv) => dv.style.position !== 'absolute') || divs[0] || domEl;
  }
  return (
    domEl.querySelector('.react-shape-text > div') ||
    domEl.querySelector('.react-shape-text') ||
    domEl.querySelector('.shape-text') ||
    domEl.querySelector('[contenteditable]') ||
    null
  );
}

export function langFadePlain(html) {
  return plainFromHtml(html)
    .replace(/\u200b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function langFadeWaitMs(anim) {
  if (!anim) return 0;
  const delay = Math.max(0, +(anim.delay || 0));
  const dur = Math.max(120, +(anim.dur ?? anim.duration ?? 800) || 800);
  return delay + dur;
}

/**
 * Fire cross-fade. Toggles between fromHtml/toHtml based on current DOM side.
 * Returns { waitMs, cancel }.
 */
export function fireLangFadeAnim(domEl, elData, anim) {
  if (!domEl || !anim) return { waitMs: 0, cancel: () => {} };
  const delay = Math.max(0, +(anim.delay || 0));
  const dur = Math.max(120, +(anim.dur ?? anim.duration ?? 800) || 800);
  const fromStored = anim.fromHtml != null ? anim.fromHtml : '';
  const toStored = anim.toHtml != null ? anim.toHtml : fromStored;
  const tel = langFadeTel(domEl, elData);
  if (!tel) return { waitMs: 0, cancel: () => {} };

  if (domEl._langFadeHandle && typeof domEl._langFadeHandle.cancel === 'function') {
    try {
      domEl._langFadeHandle.cancel({ restore: false });
    } catch (e) {
      /* ignore */
    }
    domEl._langFadeHandle = null;
  }

  const fromP = langFadePlain(fromStored);
  const toP = langFadePlain(toStored);
  const toLayer = tel.querySelector && tel.querySelector('._langfade_to');
  const curHtml = toLayer ? toLayer.innerHTML : tel.innerHTML;
  const curP = langFadePlain(curHtml);

  const atTo = (toP && curP === toP) || domEl._langFadeSide === 'to';
  const atFrom = (fromP && curP === fromP) || domEl._langFadeSide === 'from';
  let goingTo = 'to';
  if (atTo && !atFrom) goingTo = 'from';
  else if (atFrom && !atTo) goingTo = 'to';
  else if (domEl._langFadeSide === 'to') goingTo = 'from';

  const nextHtml = goingTo === 'from' ? fromStored : toStored;
  const prevHtml = curP ? curHtml : goingTo === 'from' ? toStored : fromStored;
  domEl._langFadeSide = goingTo;

  let cancelled = false;
  let timer = 0;
  let animA = null;
  let animB = null;

  const cancel = (cOpts) => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    try {
      if (animA) animA.cancel();
    } catch (e) {
      /* ignore */
    }
    try {
      if (animB) animB.cancel();
    } catch (e) {
      /* ignore */
    }
    const doRestore = !(cOpts && cOpts.restore === false);
    if (doRestore && tel.querySelector && tel.querySelector('._langfade_wrap')) {
      tel.innerHTML = nextHtml;
    }
  };

  domEl._langFadeHandle = { cancel };

  const start = () => {
    if (cancelled) return;
    const wrap = document.createElement('div');
    wrap.className = '_langfade_wrap';
    wrap.style.cssText = 'position:relative;width:100%;min-height:100%;';
    const layerFrom = document.createElement('div');
    layerFrom.className = '_langfade_from';
    layerFrom.style.cssText =
      'position:absolute;left:0;top:0;width:100%;opacity:1;z-index:1;pointer-events:none;';
    layerFrom.innerHTML = prevHtml;
    const layerTo = document.createElement('div');
    layerTo.className = '_langfade_to';
    layerTo.style.cssText =
      'position:relative;width:100%;opacity:0;z-index:2;pointer-events:none;';
    layerTo.innerHTML = nextHtml;
    wrap.appendChild(layerFrom);
    wrap.appendChild(layerTo);
    tel.innerHTML = '';
    tel.appendChild(wrap);
    const ease = 'ease-in-out';
    try {
      animA = layerFrom.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: dur,
        easing: ease,
        fill: 'forwards',
      });
      animB = layerTo.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: dur,
        easing: ease,
        fill: 'forwards',
      });
      animB.onfinish = () => {
        if (cancelled) return;
        tel.innerHTML = nextHtml;
        domEl._langFadeSide = goingTo;
      };
    } catch (e) {
      tel.innerHTML = nextHtml;
      domEl._langFadeSide = goingTo;
    }
  };

  if (delay > 0) timer = setTimeout(start, delay);
  else start();

  return { waitMs: langFadeWaitMs(anim), cancel };
}

const prepareJobs = Object.create(null);

/**
 * Auto-translate fromHtml → toHtml for a langFade step (async).
 * @param {object} elData element model
 * @param {number} ai anim index
 * @param {(patch: object) => void} applyPatch callback to persist anim fields
 */
export async function prepareLangFadeAnim(elData, ai, applyPatch) {
  if (!elData || !Array.isArray(elData.anims) || ai < 0) return;
  const key = `${elData.id}:${ai}`;
  const job = (async () => {
    const prev = elData.anims || [];
    let prevAi = -1;
    for (let i = 0; i < ai; i++) {
      if (prev[i] && prev[i].name === 'langFade') prevAi = i;
    }
    if (prevAi >= 0 && prepareJobs[`${elData.id}:${prevAi}`]) {
      try {
        await prepareJobs[`${elData.id}:${prevAi}`];
      } catch (e) {
        /* ignore */
      }
    }
    const liveAnim = elData.anims[ai];
    if (!liveAnim || liveAnim.name !== 'langFade') return;
    let fromHtml = liveAnim.fromHtml || '';
    if (prevAi >= 0 && elData.anims[prevAi]?.toHtml) {
      fromHtml = elData.anims[prevAi].toHtml;
    }
    const plain = plainFromHtml(fromHtml).replace(/\u200b/g, '');
    if (!plain.trim()) {
      applyPatch({ fromHtml, toHtml: fromHtml, fromLang: '', toLang: '' });
      return;
    }
    const tgt = translateTargetFromText(plain);
    let from = tgt.from;
    if (tgt.detected === 'mixed' || tgt.detected === 'empty') {
      from = tgt.to === 'en' ? 'ru' : 'en';
      if (from === tgt.to) from = tgt.to === 'en' ? 'ru' : 'en';
    }
    const translated = await translatePlain(plain, from, tgt.to);
    applyPatch({
      fromHtml,
      toHtml: applyTranslationToHtml(fromHtml, translated),
      fromLang: from,
      toLang: tgt.to,
    });
  })();
  prepareJobs[key] = job;
  try {
    await job;
  } catch (e) {
    console.warn('[langFade] translate failed', e);
    throw e;
  }
}
