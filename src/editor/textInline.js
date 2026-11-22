/** Apply color / size / font to the current contentEditable selection. */

export function editingTextRoot(elId) {
  if (typeof document === 'undefined') return null;
  const active = document.activeElement;
  if (!active?.isContentEditable) return null;
  if (elId && !active.closest?.(`[data-id="${String(elId)}"]`)) return null;
  return active;
}

export function hasNonCollapsedSelection(root) {
  if (typeof window === 'undefined') return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  if (root && sel.anchorNode && !root.contains(sel.anchorNode)) return false;
  return true;
}

export function applyCssToSelection(styleObj) {
  if (typeof window === 'undefined') return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  Object.assign(span.style, styleObj);
  try {
    range.surroundContents(span);
  } catch {
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }
  sel.removeAllRanges();
  const next = document.createRange();
  next.selectNodeContents(span);
  sel.addRange(next);
  return true;
}

export function execOnSelection(cmd, value) {
  if (typeof document === 'undefined') return false;
  try {
    return document.execCommand(cmd, false, value == null ? null : value);
  } catch {
    return false;
  }
}

export function htmlFromEditable(root) {
  if (!root) return '';
  return root.innerHTML || '';
}

export function plainFromEditable(root) {
  if (!root) return '';
  return root.innerText || root.textContent || '';
}

function pxFromNode(node, root) {
  const el = node && node.nodeType === 1 ? node : node?.parentElement;
  if (!el || (root && !root.contains(el) && el !== root)) return null;
  const px = parseFloat(window.getComputedStyle(el).fontSize);
  if (!Number.isFinite(px) || px <= 0) return null;
  return Math.round(px);
}

/**
 * Font size (px) at the caret, or the shared size of a selection.
 * Mixed sizes → null (caller keeps the box size).
 */
export function uniformSelectionFontSize(root) {
  if (!root || typeof window === 'undefined') return null;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  if (sel.anchorNode && !root.contains(sel.anchorNode)) return null;
  const range = sel.getRangeAt(0);
  const sizes = new Set();
  if (sel.isCollapsed) {
    const n = pxFromNode(sel.anchorNode, root);
    return n;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const raw = node.textContent || '';
    if (raw.replace(/[\s\u200b]/g, '') && range.intersectsNode(node)) {
      const n = pxFromNode(node, root);
      if (n) sizes.add(n);
    }
    node = walker.nextNode();
  }
  if (!sizes.size) {
    const n = pxFromNode(sel.anchorNode, root);
    return n;
  }
  if (sizes.size === 1) return [...sizes][0];
  return null;
}

/** Drop inline font-size so the box size applies to every run. */
export function stripInlineFontSizes(html) {
  const src = String(html || '');
  if (!src) return src;
  if (typeof document === 'undefined') {
    return src.replace(/font-size\s*:\s*[^;]+;?/gi, '');
  }
  const tmp = document.createElement('div');
  tmp.innerHTML = src;
  tmp.querySelectorAll('[style]').forEach((node) => {
    const st = node.getAttribute('style') || '';
    if (!/font-size\s*:/i.test(st)) return;
    const cleaned = st
      .replace(/font-size\s*:\s*[^;]+;?/gi, '')
      .replace(/;;+/g, ';')
      .replace(/^;+|;+$/g, '')
      .trim();
    if (cleaned) node.setAttribute('style', cleaned);
    else node.removeAttribute('style');
  });
  tmp.querySelectorAll('font[size]').forEach((node) => node.removeAttribute('size'));
  return tmp.innerHTML;
}

/** Step grows with size: 10→1, 20→2, 30→3, … */
export function fontSizeNudgeStep(px) {
  const fs = Math.max(1, Math.round(+px || 0));
  return Math.max(1, Math.floor(fs / 10));
}

export function clampFontSizePx(px) {
  return Math.max(8, Math.min(200, Math.round(+px || 0)));
}

function bumpFontSizeDecl(n, unit, sign) {
  const v = parseFloat(n);
  if (!Number.isFinite(v)) return `font-size:${n}${unit || 'px'}`;
  const u = String(unit || 'px').toLowerCase();
  let px = v;
  if (u === 'pt') px = v * (96 / 72);
  else if (u === 'em' || u === 'rem') px = v * 16;
  const next = clampFontSizePx(px + sign * fontSizeNudgeStep(px));
  return `font-size:${next}px`;
}

/**
 * Bump every inline font-size by its own step (dir: +1 / -1).
 * Different runs stay different — they do not snap to one size.
 * Handles px/pt/em/rem and unitless values (string-wide, not only [style] nodes).
 */
export function nudgeInlineFontSizes(html, dir) {
  const src = String(html || '');
  if (!src || !/font-size\s*:/i.test(src)) return src;
  const sign = dir < 0 ? -1 : 1;
  return src.replace(/font-size\s*:\s*([\d.]+)\s*(px|pt|em|rem)?/gi, (_, n, unit) =>
    bumpFontSizeDecl(n, unit, sign)
  );
}

export function selectionOffsets(root, range) {
  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  return { start, end: start + range.toString().length };
}

export function restoreSelectionOffsets(root, start, end) {
  if (!root || typeof window === 'undefined') return;
  const sel = window.getSelection();
  if (!sel) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let startNode = null;
  let startOff = 0;
  let endNode = null;
  let endOff = 0;
  let node = walker.nextNode();
  while (node) {
    const len = (node.textContent || '').length;
    if (!startNode && pos + len >= start) {
      startNode = node;
      startOff = Math.max(0, start - pos);
    }
    if (!endNode && pos + len >= end) {
      endNode = node;
      endOff = Math.max(0, end - pos);
      break;
    }
    pos += len;
    node = walker.nextNode();
  }
  if (!startNode) return;
  if (!endNode) {
    endNode = startNode;
    endOff = (startNode.textContent || '').length;
  }
  try {
    const next = document.createRange();
    next.setStart(startNode, Math.min(startOff, (startNode.textContent || '').length));
    next.setEnd(endNode, Math.min(endOff, (endNode.textContent || '').length));
    sel.removeAllRanges();
    sel.addRange(next);
  } catch (_) {
    /* ignore */
  }
}

/** Re-focus and restore a character-offset selection after React re-renders. */
export function restoreTextSelection(root, start, end) {
  if (!root) return;
  try {
    root.focus?.({ preventScroll: true });
  } catch (_) {
    /* ignore */
  }
  restoreSelectionOffsets(root, start, end);
}

function nearestFontSizeHost(node, root) {
  let n = node && node.nodeType === 1 ? node : node?.parentElement;
  while (n && n !== root) {
    const st = n.getAttribute?.('style') || '';
    if (/font-size\s*:/i.test(st)) return n;
    n = n.parentElement;
  }
  return null;
}

/**
 * Nudge font sizes inside the current selection without clearing it.
 * Each run uses its own step; selection is restored afterward.
 * @returns {{ start: number, end: number }|false}
 */
export function nudgeFontSizesInSelection(root, dir) {
  if (!root || typeof window === 'undefined') return false;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return false;
  if (sel.anchorNode && !root.contains(sel.anchorNode)) return false;
  const range = sel.getRangeAt(0);
  const sign = dir < 0 ? -1 : 1;
  const offsets = selectionOffsets(root, range);
  const { start, end } = offsets;

  const bumpedHosts = new Set();
  root.querySelectorAll('[style]').forEach((el) => {
    const st = el.getAttribute('style') || '';
    if (!/font-size\s*:/i.test(st)) return;
    try {
      if (!range.intersectsNode(el)) return;
    } catch (_) {
      return;
    }
    el.setAttribute(
      'style',
      st.replace(/font-size\s*:\s*([\d.]+)\s*(px|pt|em|rem)?/gi, (_, n, unit) =>
        bumpFontSizeDecl(n, unit, sign)
      )
    );
    bumpedHosts.add(el);
  });

  // Unstyled text in the selection: wrap only the selected slice of each text node.
  // Snapshot slice bounds before any DOM wrap (splitText invalidates the live Range).
  const toWrap = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    const raw = textNode.textContent || '';
    if (raw.replace(/[\s\u200b]/g, '') && range.intersectsNode(textNode) && !nearestFontSizeHost(textNode, root)) {
      const full = raw;
      let from = 0;
      let to = full.length;
      if (range.startContainer === textNode) from = Math.min(range.startOffset, full.length);
      if (range.endContainer === textNode) to = Math.min(range.endOffset, full.length);
      if (range.startContainer !== textNode) from = 0;
      if (range.endContainer !== textNode) to = full.length;
      if (to > from) toWrap.push({ node: textNode, from, to });
    }
    textNode = walker.nextNode();
  }
  toWrap.forEach(({ node, from, to }) => {
    if (!node.parentNode) return;
    let fs = 24;
    try {
      fs =
        Math.round(parseFloat(window.getComputedStyle(node.parentElement || root).fontSize) || 0) ||
        24;
    } catch (_) {
      /* keep */
    }
    const next = clampFontSizePx(fs + sign * fontSizeNudgeStep(fs));
    const full = node.textContent || '';
    if (to > full.length) return;
    try {
      const span = document.createElement('span');
      span.style.fontSize = `${next}px`;
      if (from === 0 && to === full.length) {
        node.parentNode.insertBefore(span, node);
        span.appendChild(node);
        return;
      }
      const mid = node.splitText(from);
      mid.splitText(to - from);
      mid.parentNode.insertBefore(span, mid);
      span.appendChild(mid);
    } catch (_) {
      /* ignore */
    }
  });

  if (!bumpedHosts.size && !toWrap.length) {
    let fs = 24;
    try {
      const probe =
        range.startContainer.nodeType === 1
          ? range.startContainer
          : range.startContainer.parentElement;
      fs = Math.round(parseFloat(window.getComputedStyle(probe || root).fontSize) || 0) || 24;
    } catch (_) {
      /* keep */
    }
    const next = clampFontSizePx(fs + sign * fontSizeNudgeStep(fs));
    applyCssToSelection({ fontSize: `${next}px` });
    return offsets;
  }

  restoreSelectionOffsets(root, start, end);
  return offsets;
}
