/** Link helpers — from js/25-links.js / 08-slides.js */

import { setElementUnderline, underlineInlineCss, underlineDataUl } from './textUnderline.js';

/** Default hover accent for inline / object links (text color stays inherit). */
export const DEFAULT_LINK_HOVER = '#93c5fd';

export function linkTypeFromHref(link) {
  if (!link) return 'url';
  if (link === '#slide-next') return 'slide-next';
  if (link === '#slide-prev') return 'slide-prev';
  if (link === '#slide-first') return 'slide-first';
  if (link === '#slide-last') return 'slide-last';
  if (String(link).startsWith('#slide-')) return 'slide';
  return 'url';
}

export function slideDisplayTitle(slide, i) {
  const t = (slide?.title || slide?.name || '').trim();
  return t || `Slide ${i + 1}`;
}

export function slideLinkHrefForIndex(i, slides) {
  const s = slides?.[i];
  const title = (s?.title || s?.name || '').trim();
  if (title) return `#slide-${encodeURIComponent(title)}`;
  return `#slide-${i + 1}`;
}

export function resolveSlideLinkIndex(link, curIdx, slides) {
  if (!link || !String(link).startsWith('#slide-')) return null;
  const count = slides?.length || 0;
  if (!count) return null;
  const idx = Math.max(0, Math.min(+curIdx || 0, count - 1));
  const spec = String(link).slice(7);
  if (spec === 'next') return Math.min(idx + 1, count - 1);
  if (spec === 'prev') return Math.max(idx - 1, 0);
  if (spec === 'first') return 0;
  if (spec === 'last') return count - 1;
  const n = parseInt(spec, 10);
  if (!Number.isNaN(n) && String(n) === spec && n >= 1 && n <= count) return n - 1;
  let name = spec;
  try {
    name = decodeURIComponent(spec);
  } catch (e) {}
  const norm = (name || '').trim().toLowerCase();
  for (let i = 0; i < count; i++) {
    if (slideDisplayTitle(slides[i], i).trim().toLowerCase() === norm) return i;
  }
  return null;
}

export function readGroupLink(el, els, key = 'link') {
  if (!el) return key === 'linkt' ? '_blank' : '';
  if (el[key]) return el[key];
  if (!el.groupId) return key === 'linkt' ? '_blank' : '';
  const mate = (els || []).find((e) => e && e.groupId === el.groupId && e[key]);
  if (mate) return mate[key];
  return key === 'linkt' ? '_blank' : '';
}

export const LINK_TYPE_OPTIONS = [
  { id: 'url', labelRu: 'URL', labelEn: 'URL' },
  { id: 'slide', labelRu: 'Слайд', labelEn: 'Slide' },
  { id: 'slide-next', labelRu: 'Следующий', labelEn: 'Next' },
  { id: 'slide-prev', labelRu: 'Предыдущий', labelEn: 'Previous' },
  { id: 'slide-first', labelRu: 'Первый', labelEn: 'First' },
  { id: 'slide-last', labelRu: 'Последний', labelEn: 'Last' },
];

export const SLIDE_NAV_LINKS = {
  'slide-next': '#slide-next',
  'slide-prev': '#slide-prev',
  'slide-first': '#slide-first',
  'slide-last': '#slide-last',
};

/** Saved contentEditable selection for Link modal (focus moves to the dialog). */
let _inlineLinkCtx = null;

export function htmlHasInlineLink(html) {
  return /<a\b[^>]*\bhref\s*=/i.test(String(html || ''));
}

export function elHasInlineLink(el) {
  if (!el) return false;
  if (el.type === 'text' || el.type === 'formula' || el.type === 'shape') {
    return htmlHasInlineLink(el.html || el.text || '');
  }
  if (el.type === 'table' && Array.isArray(el.cells)) {
    return el.cells.some((c) => c && htmlHasInlineLink(c.html));
  }
  if (el.type === 'md') return htmlHasInlineLink(el.mdHtml || '');
  return false;
}

export function escapeHrefAttr(href) {
  return String(href || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function ctxFromEditable(editable, range, existingA) {
  if (!editable) return null;
  const host = editable.closest('.react-el[data-id], .react-el');
  const cell = editable.closest('td[data-r], th[data-r]');
  return {
    range: range ? range.cloneRange() : null,
    editable,
    hostId: host?.getAttribute?.('data-id') || host?.dataset?.id || null,
    cellR: cell?.dataset?.r != null ? +cell.dataset.r : null,
    cellC: cell?.dataset?.c != null ? +cell.dataset.c : null,
    existingHref: existingA ? existingA.getAttribute('href') || '' : '',
    existingTarget: existingA ? existingA.getAttribute('target') || '_blank' : '_blank',
    existingHover: existingA
      ? existingA.style.getPropertyValue('--sf-link-hover')?.trim() ||
        existingA.getAttribute('data-hover') ||
        DEFAULT_LINK_HOVER
      : DEFAULT_LINK_HOVER,
    existingHoverScheme: parseHoverSchemeAttr(existingA?.getAttribute?.('data-hover-scheme')),
    anchor: existingA || null,
  };
}

function parseHoverSchemeAttr(raw) {
  if (!raw) return null;
  const m = String(raw).match(/^(\d+)\s*,\s*(\d+)$/);
  if (!m) return null;
  return { col: +m[1], row: +m[2] };
}

/** Style a new/updated inline <a>: inherit text color, dashed underline, hover var. */
export function styleInlineAnchor(a, opts = {}) {
  if (!a) return;
  a.setAttribute('data-sf-link', '1');
  const hover = opts.hover != null && opts.hover !== '' ? opts.hover : DEFAULT_LINK_HOVER;
  a.setAttribute('data-hover', hover);
  a.style.color = 'inherit';
  a.style.setProperty('--sf-link-hover', hover);
  if (opts.schemeRef && opts.schemeRef.col != null && opts.schemeRef.row != null) {
    a.setAttribute('data-hover-scheme', `${opts.schemeRef.col},${opts.schemeRef.row}`);
  } else if (opts.schemeRef === null) {
    a.removeAttribute('data-hover-scheme');
  }
  if (opts.underline === false || opts.underline === 'none') {
    setElementUnderline(a, 'none');
  } else if (opts.underline != null) {
    setElementUnderline(a, opts.underline);
  } else if (opts.applyDefaultUl) {
    // Default for new links: dashed (same cycle as text underline).
    setElementUnderline(a, 'underline dashed');
  }
}

/** Live caret/selection info for Props panel (collapsed caret inside <a> is enough). */
export function readCaretInlineLink() {
  const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
  if (!sel || sel.rangeCount === 0) return null;
  const node = sel.anchorNode;
  const startEl = node?.nodeType === 1 ? node : node?.parentElement;
  if (!startEl || typeof startEl.closest !== 'function') return null;
  const editable = startEl.closest('[contenteditable="true"]');
  if (!editable) return null;
  const existingA = startEl.closest?.('a[href]') || null;
  if (!existingA || !editable.contains(existingA)) return null;
  return ctxFromEditable(editable, sel.getRangeAt(0), existingA);
}

/** Capture selection or caret-in-link inside a text/table contentEditable. */
export function captureInlineLinkSelection() {
  _inlineLinkCtx = null;
  const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const node = range.commonAncestorContainer;
  const startEl = node.nodeType === 1 ? node : node.parentElement;
  if (!startEl || typeof startEl.closest !== 'function') return null;
  const editable = startEl.closest('[contenteditable="true"]');
  if (!editable) return null;
  const existingA = startEl.closest?.('a[href]') || null;
  // Collapsed caret: only useful when already inside a link (edit / show URL).
  if (sel.isCollapsed && !existingA) return null;
  _inlineLinkCtx = ctxFromEditable(editable, range, existingA);
  return _inlineLinkCtx;
}

export function peekInlineLinkSelection() {
  return _inlineLinkCtx;
}

export function clearInlineLinkSelection() {
  _inlineLinkCtx = null;
}

function restoreInlineRange(ctx) {
  if (!ctx?.range || !ctx.editable?.isConnected) return false;
  try {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(ctx.range);
    return true;
  } catch (_) {
    return false;
  }
}

/** Wrap saved selection in <a href>. Returns { hostId, cellR, cellC, html } or null. */
export function applyInlineLinkToSelection(href, linkt, opts = {}) {
  const ctx = _inlineLinkCtx;
  const url = String(href || '').trim();
  if (!ctx || !url || !ctx.editable?.isConnected) return null;
  if (!restoreInlineRange(ctx)) return null;
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;
  let range = sel.getRangeAt(0);
  const hover = opts.hover != null ? opts.hover : DEFAULT_LINK_HOVER;
  const schemeRef = opts.schemeRef === undefined ? null : opts.schemeRef;

  // Update existing anchor under caret / selection.
  let anchor =
    range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer.closest?.('a[href]')
      : range.commonAncestorContainer.parentElement?.closest?.('a[href]');
  if (anchor && ctx.editable.contains(anchor)) {
    anchor.setAttribute('href', url);
    if (url.startsWith('#')) {
      anchor.removeAttribute('target');
      anchor.removeAttribute('rel');
    } else {
      anchor.setAttribute('target', linkt || '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    }
    // Keep existing underline when editing URL; refresh hover/color.
    styleInlineAnchor(anchor, { hover, schemeRef });
  } else {
    try {
      const contents = range.extractContents();
      const a = document.createElement('a');
      a.setAttribute('href', url);
      if (!url.startsWith('#')) {
        a.setAttribute('target', linkt || '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
      a.appendChild(contents);
      range.insertNode(a);
      styleInlineAnchor(a, { hover, schemeRef, applyDefaultUl: true });
      anchor = a;
      range = document.createRange();
      range.selectNodeContents(a);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {
      try {
        const safe = escapeHrefAttr(url);
        const tgt =
          url.startsWith('#')
            ? ''
            : ` target="${escapeHrefAttr(linkt || '_blank')}" rel="noopener noreferrer"`;
        const ulCss = underlineInlineCss('underline dashed');
        const du = underlineDataUl('underline dashed');
        document.execCommand(
          'insertHTML',
          false,
          `<a href="${safe}"${tgt} data-sf-link="1" data-ul="${du}" data-hover="${escapeHrefAttr(hover)}" style="${ulCss}color:inherit;--sf-link-hover:${escapeHrefAttr(hover)}">${sel
            .toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')}</a>`
        );
      } catch (e2) {
        return null;
      }
    }
  }
  const html = ctx.editable.innerHTML;
  const out = {
    hostId: ctx.hostId,
    cellR: ctx.cellR,
    cellC: ctx.cellC,
    html,
  };
  try {
    if (sel.rangeCount) ctx.range = sel.getRangeAt(0).cloneRange();
  } catch (_) {}
  return out;
}

/** Unwrap <a> around saved selection / caret. */
export function removeInlineLinkFromSelection() {
  const ctx = _inlineLinkCtx;
  if (!ctx?.editable?.isConnected) return null;
  if (!restoreInlineRange(ctx)) return null;
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  const node = range.commonAncestorContainer;
  const startEl = node.nodeType === 1 ? node : node.parentElement;
  const anchor = startEl?.closest?.('a[href]');
  if (!anchor || !ctx.editable.contains(anchor)) return null;
  const parent = anchor.parentNode;
  while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
  parent.removeChild(anchor);
  parent.normalize?.();
  const html = ctx.editable.innerHTML;
  return { hostId: ctx.hostId, cellR: ctx.cellR, cellC: ctx.cellC, html };
}
