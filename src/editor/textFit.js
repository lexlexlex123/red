/** Measure / fit text height for autofit. */

import { textPadCss } from './textPad.js';

export function measureTextHeight(el) {
  if (typeof document === 'undefined' || !el) return el?.h || 60;
  const pad = el.type === 'text' ? textPadCss(el) : '8px';
  const box = document.createElement('div');
  box.style.cssText = [
    'position:absolute',
    'left:-99999px',
    'top:0',
    'visibility:hidden',
    `width:${Math.max(40, el.w || 100)}px`,
    'box-sizing:border-box',
    `padding:${pad}`,
    'white-space:pre-wrap',
    'word-wrap:break-word',
    'overflow-wrap:break-word',
    'line-height:1.2',
    el.cs || 'font-size:36px;color:#fff;',
  ].join(';');
  if (el.type === 'markdown') {
    box.style.fontSize = (el.mdFs || 16) + 'px';
    box.innerHTML = el.mdHtml || '';
  } else if (el.html) {
    box.innerHTML = String(el.html);
  } else {
    box.textContent = el.text || '';
  }
  document.body.appendChild(box);
  const h = Math.ceil(box.scrollHeight) + 4;
  box.remove();
  return Math.max(32, h);
}

/**
 * Fit height of text-like elements on a slide.
 * @returns {number} count of changed elements
 */
export function fitTextsOnSlide(slide, opts = {}) {
  if (!slide?.els) return 0;
  const allowShrink = !!opts.shrink;
  let n = 0;
  slide.els.forEach((el) => {
    if (!el || el._isDecor) return;
    if (el.type !== 'text' && el.type !== 'markdown' && el.type !== 'formula') return;
    const nat = measureTextHeight(el);
    if (nat <= 0) return;
    if (nat > (el.h || 0) + 2 || (allowShrink && nat < (el.h || 0) - 2)) {
      el.h = nat;
      n += 1;
    }
  });
  return n;
}
