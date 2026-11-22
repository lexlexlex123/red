/** HTML frame helpers — from js/35-htmlframe.js subset. */

export function isHttpUrl(src) {
  return /^https?:\/\//i.test(String(src || '').trim());
}

export function looksLikeHtmlDocument(text) {
  const t = String(text || '').trim();
  if (t.length < 40) return false;
  if (/^<!DOCTYPE\s+html\b/i.test(t)) return true;
  if (/^<html[\s>]/i.test(t)) return true;
  if (/<html[\s>]/i.test(t) && /<\/html\s*>/i.test(t)) return true;
  if (/<html[\s>]/i.test(t) && /<body[\s>]/i.test(t)) return true;
  return false;
}

/** Check if text contains HTML tags (broader than looksLikeHtmlDocument). */
export function containsHtmlTags(text) {
  const t = String(text || '').trim();
  if (t.length < 10) return false;
  // Closing tags — strongest signal
  if (/<\/[a-zA-Z][a-zA-Z0-9]*[^>]*>/.test(t)) return true;
  // Common block-level HTML elements (opening tags)
  if (/<(div|p|h[1-6]|span|ul|ol|li|table|tr|td|th|form|section|article|header|footer|nav|main|aside|blockquote|pre|figure|figcaption|details|summary|dl|dt|dd)[\s>]/i.test(t)) return true;
  // Self-closing elements
  if (/<(br|hr|img|input|meta|link|source|area|col|embed|wbr)[\s/>]/i.test(t)) return true;
  return false;
}

export function buildHfSrcdoc(src) {
  const s = String(src || '');
  const hasDoc = /<!doctype/i.test(s) || /<html/i.test(s);
  if (hasDoc) return s;
  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<style>body{margin:0;padding:8px;box-sizing:border-box;font-family:system-ui,sans-serif;background:transparent;}</style>' +
    '</head><body>' +
    s +
    '</body></html>'
  );
}

function htmlFrameClickThroughBridge(captureOpaque) {
  let forwardedPointer = null;
  let forwardedKind = null;

  function isOpaque(color) {
    const value = String(color || '').trim().toLowerCase();
    if (!value || value === 'transparent') return false;
    if (/^#[0-9a-f]{8}$/i.test(value)) return parseInt(value.slice(-2), 16) > 0;
    if (/^#[0-9a-f]{4}$/i.test(value)) return parseInt(value.slice(-1), 16) > 0;
    if (/^rgba\(/i.test(value)) {
      const alpha = value.match(/,\s*([\d.]+)\s*\)$/);
      return alpha ? Number(alpha[1]) > 0 : true;
    }
    if (/^rgb\(/i.test(value)) {
      const alpha = value.match(/\/\s*([\d.]+)\s*\)$/);
      return alpha ? Number(alpha[1]) > 0 : true;
    }
    return true;
  }

  function hasVisibleTextAt(x, y) {
    const range =
      document.caretRangeFromPoint?.(x, y) ||
      (() => {
        const position = document.caretPositionFromPoint?.(x, y);
        if (!position) return null;
        const result = document.createRange();
        result.setStart(position.offsetNode, position.offset);
        result.collapse(true);
        return result;
      })();
    if (!range) return false;
    let rects = [...range.getClientRects()];
    if (!rects.length && range.startContainer.nodeType === Node.TEXT_NODE) {
      const textNode = range.startContainer;
      const offset = Math.min(range.startOffset, Math.max(0, textNode.length - 1));
      if (textNode.textContent.slice(offset, offset + 1).trim()) {
        const character = document.createRange();
        character.setStart(textNode, offset);
        character.setEnd(textNode, offset + 1);
        rects = [...character.getClientRects()];
      }
    }
    if (!rects.length) return false;
    return rects.some(
      (rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    );
  }

  function isTransparentHit(target, x, y) {
    if (!(target instanceof Element)) {
      return !hasVisibleTextAt(x, y);
    }
    if (target === document.body || target === document.documentElement) {
      const rootStyles = [getComputedStyle(document.documentElement), getComputedStyle(document.body)];
      if (rootStyles.some((style) => +style.opacity === 0 || style.visibility === 'hidden')) {
        return true;
      }
      if (
        rootStyles.some(
          (style) => isOpaque(style.backgroundColor) || style.backgroundImage !== 'none'
        )
      ) {
        return false;
      }
      return !hasVisibleTextAt(x, y);
    }
    if (
      target.matches('img,canvas,svg,video,audio,input,textarea,select,button,iframe,object,embed')
    ) {
      return false;
    }
    for (let node = target; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (+style.opacity === 0 || style.visibility === 'hidden') return true;
      if (
        isOpaque(style.backgroundColor) ||
        style.backgroundImage !== 'none' ||
        (parseFloat(style.borderTopWidth) > 0 && isOpaque(style.borderTopColor)) ||
        (parseFloat(style.borderRightWidth) > 0 && isOpaque(style.borderRightColor)) ||
        (parseFloat(style.borderBottomWidth) > 0 && isOpaque(style.borderBottomColor)) ||
        (parseFloat(style.borderLeftWidth) > 0 && isOpaque(style.borderLeftColor))
      ) {
        return false;
      }
    }
    return !hasVisibleTextAt(x, y);
  }

  document.addEventListener(
    'pointerdown',
    (event) => {
      forwardedKind = isTransparentHit(
        document.elementFromPoint(event.clientX, event.clientY),
        event.clientX,
        event.clientY
      )
        ? 'transparent'
        : captureOpaque
          ? 'opaque'
          : null;
      if (!forwardedKind) return;
      forwardedPointer = event.pointerId;
      event.preventDefault();
      event.stopImmediatePropagation();
      parent.postMessage(
        {
          type: 'html-frame-transparent-pointer',
          phase: `${forwardedKind}-down`,
          x: event.clientX,
          y: event.clientY,
          pointerId: event.pointerId,
          button: event.button,
          buttons: event.buttons,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        },
        '*'
      );
    },
    true
  );

  document.addEventListener(
    'pointerup',
    (event) => {
      if (forwardedPointer !== event.pointerId) return;
      const kind = forwardedKind;
      event.preventDefault();
      event.stopImmediatePropagation();
      parent.postMessage(
        {
          type: 'html-frame-transparent-pointer',
          phase: `${kind}-up`,
          x: event.clientX,
          y: event.clientY,
          pointerId: event.pointerId,
          button: event.button,
          buttons: event.buttons,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        },
        '*'
      );
      forwardedPointer = null;
      forwardedKind = null;
    },
    true
  );

  document.addEventListener(
    'click',
    (event) => {
      if (forwardedPointer != null) return;
      const transparent = isTransparentHit(
        document.elementFromPoint(event.clientX, event.clientY),
        event.clientX,
        event.clientY
      );
      const kind = transparent ? 'transparent' : captureOpaque ? 'opaque' : null;
      if (!kind) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      parent.postMessage(
        {
          type: 'html-frame-transparent-pointer',
          phase: `${kind}-click`,
          x: event.clientX,
          y: event.clientY,
          pointerId: event.pointerId,
          button: event.button,
          buttons: event.buttons,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        },
        '*'
      );
    },
    true
  );
}

export function buildHfSrcdocClickThrough(src, { captureOpaque = false } = {}) {
  const html = buildHfSrcdoc(src);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const script = doc.createElement('script');
  script.textContent = `(${htmlFrameClickThroughBridge.toString()})(${captureOpaque});`;
  doc.body.appendChild(script);
  return `${doc.doctype?.outerHTML || '<!doctype html>'}${doc.documentElement.outerHTML}`;
}

export function handleHtmlFrameTransparentPointer(event) {
  const data = event.data;
  if (
    !data ||
    data.type !== 'html-frame-transparent-pointer' ||
    !['transparent-down', 'transparent-up', 'transparent-click', 'opaque-down', 'opaque-up', 'opaque-click'].includes(data.phase) ||
    !Number.isFinite(data.x) ||
    !Number.isFinite(data.y)
  ) {
    return false;
  }

  const frame = [...document.querySelectorAll('.react-hf-iframe')].find(
    (item) => item.contentWindow === event.source && !item.getAttribute('src')
  );
  if (!frame) return false;

  const frameRect = frame.getBoundingClientRect();
  const scaleX = frame.clientWidth ? frameRect.width / frame.clientWidth : 1;
  const scaleY = frame.clientHeight ? frameRect.height / frame.clientHeight : 1;
  const clientX = frameRect.left + data.x * scaleX;
  const clientY = frameRect.top + data.y * scaleY;
  const owners = [];
  for (
    let owner = frame.closest('[data-id]');
    owner && !owner.classList.contains('react-slide-stage') && !owner.classList.contains('preview-slide');
    owner = owner.parentElement?.closest('[data-id]')
  ) {
    owners.push([owner, owner.style.pointerEvents]);
    owner.style.pointerEvents = 'none';
    if (owner.classList.contains('react-el-hf')) break;
  }

  try {
    const opaque = data.phase.startsWith('opaque-');
    const target = opaque ? frame.closest('[data-id]') : document.elementFromPoint(clientX, clientY);
    if (!target) return false;
    const pointerInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX,
      clientY,
      pointerId: data.pointerId || 1,
      pointerType: 'mouse',
      button: data.button ?? 0,
      buttons: data.phase.endsWith('-up') ? 0 : data.buttons ?? 1,
      altKey: !!data.altKey,
      ctrlKey: !!data.ctrlKey,
      metaKey: !!data.metaKey,
      shiftKey: !!data.shiftKey,
    };
    if (data.phase.endsWith('-down')) {
      target.dispatchEvent(new PointerEvent('pointerdown', pointerInit));
    } else if (data.phase.endsWith('-up')) {
      target.dispatchEvent(new PointerEvent('pointerup', pointerInit));
    } else {
      target.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX,
          clientY,
          button: data.button ?? 0,
          altKey: !!data.altKey,
          ctrlKey: !!data.ctrlKey,
          metaKey: !!data.metaKey,
          shiftKey: !!data.shiftKey,
        })
      );
    }
    return true;
  } finally {
    owners.forEach(([owner, pointerEvents]) => {
      owner.style.pointerEvents = pointerEvents;
    });
  }
}

export function installHtmlFrameTransparentPointerListener() {
  const stateKey = '__htmlFrameTransparentPointerListenerState';
  let state = window[stateKey];
  if (!state) {
    state = {
      users: 0,
      listener: (event) => handleHtmlFrameTransparentPointer(event),
    };
    window[stateKey] = state;
  }
  state.users += 1;
  if (state.users === 1) window.addEventListener('message', state.listener);
  return () => {
    const current = window[stateKey];
    if (!current) return;
    current.users = Math.max(0, current.users - 1);
    if (current.users === 0) {
      window.removeEventListener('message', current.listener);
      delete window[stateKey];
    }
  };
}

export function hfTitleFromSrc(src) {
  const s = String(src || '').trim();
  if (!s) return 'New Tab';
  if (isHttpUrl(s)) {
    try {
      return s.replace(/^https?:\/\//i, '').split('/')[0].slice(0, 40) || 'New Tab';
    } catch (e) {
      return 'New Tab';
    }
  }
  const tm = s.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (tm && tm[1].trim()) return tm[1].trim().slice(0, 40);
  return 'HTML';
}

export const HF_SANDBOX =
  'allow-scripts allow-forms allow-popups allow-presentation allow-top-navigation-by-user-activation';
