/** Superscript / subscript for text (legacy rtSuperscript / rtSubscript). */

export function htmlHasScript(html, kind) {
  const s = String(html || '');
  if (kind === 'super') {
    return /<sup\b/i.test(s) || /vertical-align\s*:\s*super/i.test(s);
  }
  return /<sub\b/i.test(s) || /vertical-align\s*:\s*sub/i.test(s);
}

function wrapSelectionWithTag(tagName) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  try {
    const el = document.createElement(tagName);
    const contents = range.extractContents();
    el.appendChild(contents);
    range.insertNode(el);
    sel.removeAllRanges();
    const nr = document.createRange();
    nr.selectNodeContents(el);
    sel.addRange(nr);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Toggle superscript or subscript in a contentEditable root.
 * @param {'super'|'sub'} kind
 * @returns {string|null} new innerHTML or null
 */
export function toggleScriptInEditable(root, kind) {
  if (!root || typeof window === 'undefined') return null;
  const tag = kind === 'super' ? 'sup' : 'sub';
  const other = kind === 'super' ? 'sub' : 'sup';
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !root.contains(sel.anchorNode)) return null;

  let node = sel.anchorNode;
  if (node.nodeType === 3) node = node.parentElement;
  const inTag = node && node.closest ? node.closest(tag) : null;
  const inOther = node && node.closest ? node.closest(other) : null;

  if (sel.isCollapsed) {
    if (inTag && root.contains(inTag)) {
      const parent = inTag.parentNode;
      while (inTag.firstChild) parent.insertBefore(inTag.firstChild, inTag);
      parent.removeChild(inTag);
      root.normalize();
      return root.innerHTML;
    }
    try {
      document.execCommand(kind === 'super' ? 'superscript' : 'subscript', false, null);
      return root.innerHTML;
    } catch (e) {
      return null;
    }
  }

  // Selection inside existing tag of same kind → unwrap intersecting
  if (inTag && root.contains(inTag) && sel.toString()) {
    const intersecting = [];
    root.querySelectorAll(tag).forEach((n) => {
      try {
        if (sel.getRangeAt(0).intersectsNode(n)) intersecting.push(n);
      } catch (e) {}
    });
    if (intersecting.length) {
      // Bracket the affected run with throwaway Comment markers *before* unwrapping so we
      // can rebuild a selection afterwards. Plain node.insertBefore/removeChild here (no
      // execCommand involved) doesn't move the browser's live selection along for the ride,
      // and if the original range's boundary was expressed as an element+child-index (e.g.
      // the user selected exactly one whole <sup>/<sub> run) rather than inside a text node,
      // removing that child invalidates the boundary outright — Chrome then just collapses
      // the selection, which reads as "the highlight disappears". Comment nodes are never
      // touched by root.normalize() (that only merges Text nodes) and Range boundary points
      // expressed relative to them are kept valid across the DOM moves that follow, per the
      // DOM spec's node-removal adjustment steps.
      const first = intersecting[0];
      const last = intersecting[intersecting.length - 1];
      const startMarker = document.createComment('');
      const endMarker = document.createComment('');
      first.parentNode.insertBefore(startMarker, first);
      if (last.nextSibling) last.parentNode.insertBefore(endMarker, last.nextSibling);
      else last.parentNode.appendChild(endMarker);

      intersecting.forEach((n) => {
        const parent = n.parentNode;
        if (!parent) return;
        while (n.firstChild) parent.insertBefore(n.firstChild, n);
        parent.removeChild(n);
      });

      try {
        const range = document.createRange();
        range.setStartAfter(startMarker);
        range.setEndBefore(endMarker);
        startMarker.parentNode?.removeChild(startMarker);
        endMarker.parentNode?.removeChild(endMarker);
        root.normalize();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {
        startMarker.parentNode?.removeChild(startMarker);
        endMarker.parentNode?.removeChild(endMarker);
        root.normalize();
      }
      return root.innerHTML;
    }
  }

  // Save a clone of the current range *before* touching the DOM or calling execCommand.
  // execCommand('superscript'/'subscript') is unreliable on a selection that sits in a
  // single plain (unstyled) run with no existing inline element to anchor to — on a run
  // that already has an inline element (e.g. a differently-coloured <font> segment from a
  // prior foreColor command) it applies fine, but on plain text it can silently no-op and
  // leave the browser's live selection collapsed as a side effect. If we then fell through
  // to wrapSelectionWithTag() using the *live* selection, sel.isCollapsed would already be
  // true and it would bail out with nothing applied — which reads as the selection just
  // vanishing. Keeping our own clone means the fallback always has something to wrap,
  // regardless of what execCommand did to the live selection.
  const savedRange = sel.getRangeAt(0).cloneRange();

  // Remove opposite script first in selection
  if (inOther) {
    const parent = inOther.parentNode;
    while (inOther.firstChild) parent.insertBefore(inOther.firstChild, inOther);
    parent.removeChild(inOther);
  }

  try {
    document.execCommand(kind === 'super' ? 'superscript' : 'subscript', false, null);
    if (htmlHasScript(root.innerHTML, kind)) return root.innerHTML;
  } catch (e) {}

  // execCommand didn't apply — restore the selection we saved up front (moving the
  // opposite-script wrapper's children earlier doesn't invalidate it, since those are the
  // same node objects, just reparented) instead of trusting whatever the live selection
  // became after the failed/no-op execCommand call.
  try {
    sel.removeAllRanges();
    sel.addRange(savedRange);
  } catch (e) {}

  if (wrapSelectionWithTag(tag)) {
    root.normalize();
    return root.innerHTML;
  }
  return null;
}

/** Whole-block toggle when not editing. */
export function toggleScriptInHtml(html, kind) {
  const tag = kind === 'super' ? 'sup' : 'sub';
  const other = kind === 'super' ? 'sub' : 'sup';
  let s = String(html || '');
  const has = htmlHasScript(s, kind);
  if (has) {
    const re = new RegExp(`</?${tag}\\b[^>]*>`, 'gi');
    return s.replace(re, '');
  }
  // strip opposite
  s = s.replace(new RegExp(`</?${other}\\b[^>]*>`, 'gi'), '');
  if (!s.trim()) return s;
  return `<${tag}>${s}</${tag}>`;
}
