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
      intersecting.forEach((n) => {
        const parent = n.parentNode;
        if (!parent) return;
        while (n.firstChild) parent.insertBefore(n.firstChild, n);
        parent.removeChild(n);
      });
      root.normalize();
      return root.innerHTML;
    }
  }

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
