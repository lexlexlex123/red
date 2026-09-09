/**
 * Typewriter («Смена текста»): delete fromHtml char-by-char, then type toHtml.
 * From js/24-preview.js fireAnim typewriter branch.
 */

export function isTypewriterAnim(name) {
  return name === 'typewriter';
}

function htmlToPlain(html) {
  return String(html || '').replace(/<[^>]*>/g, '');
}

function wrapPlain(text) {
  return `<div style="width:100%;white-space:pre-wrap;word-break:break-word;">${text}</div>`;
}

/** Find editable text host inside a canvas/export element. */
export function typewriterTextTarget(domEl, elData) {
  if (!domEl) return null;
  const type = elData?.type || '';
  if (type === 'text') {
    const editable = domEl.querySelector('[contenteditable]');
    if (editable) return editable;
    const divs = Array.from(domEl.querySelectorAll(':scope > div'));
    return divs.find((dv) => dv.style.position !== 'absolute') || divs[0] || domEl;
  }
  if (type === 'shape') {
    return (
      domEl.querySelector('.react-shape-text > div') ||
      domEl.querySelector('.react-shape-text') ||
      domEl.querySelector('.shape-text') ||
      null
    );
  }
  return (
    domEl.querySelector('.react-shape-text > div') ||
    domEl.querySelector('.tel') ||
    domEl.querySelector('.shape-text') ||
    domEl.querySelector('[contenteditable]') ||
    null
  );
}

/** Current HTML stored on the element model. */
export function typewriterSourceHtml(elData) {
  if (!elData) return '';
  if (elData.type === 'shape') return elData.shapeHtml || '';
  return elData.html || elData.text || '';
}

/**
 * Estimate wait ms for sequencing.
 */
export function typewriterWaitMs(anim) {
  if (!anim) return 0;
  const delay = Math.max(0, +(anim.delay || 0));
  const cd = Math.max(5, +(anim.charDelay || 40));
  const fromLen = htmlToPlain(anim.fromHtml).length;
  const toLen = htmlToPlain(anim.toHtml).length;
  return delay + (fromLen + toLen) * cd + 40;
}

/**
 * Fire typewriter on DOM. Returns { waitMs, cancel }.
 */
export function fireTypewriterAnim(domEl, elData, anim) {
  if (!domEl || !anim) return { waitMs: 0, cancel: () => {} };
  const delay = Math.max(0, +(anim.delay || 0));
  const charDelay = Math.max(5, +(anim.charDelay || 40));
  const fromHtml = anim.fromHtml || '';
  const toHtml = anim.toHtml || '';
  const fromPlain = htmlToPlain(fromHtml);
  const toPlain = htmlToPlain(toHtml);
  const tel = typewriterTextTarget(domEl, elData);
  if (!tel) return { waitMs: 0, cancel: () => {} };

  let running = true;
  let timer = null;
  const clear = () => {
    running = false;
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const run = () => {
    if (!running) return;
    let deleteStep = 0;
    const totalDelete = fromPlain.length;

    function doDelete() {
      if (!running) return;
      if (deleteStep >= totalDelete) {
        tel.innerHTML = wrapPlain('');
        requestAnimationFrame(() => doPrint(0));
        return;
      }
      const remaining = fromPlain.slice(0, totalDelete - deleteStep);
      tel.innerHTML = wrapPlain(remaining);
      deleteStep += 1;
      timer = setTimeout(doDelete, charDelay);
    }

    function doPrint(step) {
      if (!running) return;
      if (step >= toPlain.length) {
        tel.innerHTML = wrapPlain(toPlain);
        return;
      }
      tel.innerHTML = wrapPlain(toPlain.slice(0, step + 1));
      timer = setTimeout(() => doPrint(step + 1), charDelay);
    }

    doDelete();
  };

  if (delay > 0) timer = setTimeout(run, delay);
  else run();

  return { waitMs: typewriterWaitMs(anim), cancel: clear };
}

export function clearTypewriterTargets(root) {
  /* DOM text restored by React re-render after animPlay null; no-op helper */
  void root;
}
