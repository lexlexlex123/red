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
