/** Russian stress mark (ударение) — legacy `rtStress` / `[data-stress]`. */

const COMBINING_ACUTE = '\u0301';

export function stressCaseForChar(ch) {
  if (!ch) return 'lower';
  const c = [...String(ch)][0];
  if (!c) return 'lower';
  try {
    if (/\p{Lu}|\p{Lt}/u.test(c)) return 'upper';
  } catch (e) {}
  return c.toUpperCase() === c && c.toLowerCase() !== c ? 'upper' : 'lower';
}

export function isStressableLetter(ch) {
  try {
    return !!ch && /\p{L}/u.test(ch) && !/[\u0300-\u036f]/.test(ch);
  } catch (e) {
    return !!ch && /[A-Za-zА-Яа-яЁё]/.test(ch);
  }
}

function unwrapStressSpan(span) {
  const parent = span.parentNode;
  if (!parent) return;
  while (span.firstChild) parent.insertBefore(span.firstChild, span);
  parent.removeChild(span);
}

function wrapCharInTextNode(textNode, localIdx) {
  const t = textNode.textContent || '';
  const arr = [...t];
  const ch = arr[localIdx];
  if (!isStressableLetter(ch)) return null;
  const before = arr.slice(0, localIdx).join('');
  let afterArr = arr.slice(localIdx + 1);
  if (afterArr[0] === COMBINING_ACUTE) afterArr = afterArr.slice(1);
  const after = afterArr.join('');
  const span = document.createElement('span');
  span.setAttribute('data-stress', '1');
  span.setAttribute('data-stress-case', stressCaseForChar(ch));
  span.textContent = ch;
  const parent = textNode.parentNode;
  if (before) parent.insertBefore(document.createTextNode(before), textNode);
  parent.insertBefore(span, textNode);
  if (after) parent.insertBefore(document.createTextNode(after), textNode);
  parent.removeChild(textNode);
  return span;
}

function charIndexBeforeCaret(root, range) {
  const pre = document.createRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  const chars = [...pre.toString()];
  if (!chars.length) return { idx: 0, preferBefore: false };
  let i = chars.length - 1;
  if (chars[i] === COMBINING_ACUTE && i > 0) i--;
  if (isStressableLetter(chars[i])) return { idx: i, preferBefore: true };
  return { idx: chars.length, preferBefore: false };
}

function findTextNodeAtCharIndex(root, targetIdx) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let seen = 0;
  let textNode = walker.nextNode();
  while (textNode) {
    const arr = [...(textNode.textContent || '')];
    if (seen + arr.length > targetIdx) {
      return { textNode, local: targetIdx - seen };
    }
    seen += arr.length;
    textNode = walker.nextNode();
  }
  return null;
}

/** Toggle stress on current selection (or letter at caret) inside a contentEditable root.
 *  Returns new innerHTML or null if nothing changed. */
export function toggleStressInEditable(root) {
  if (!root || typeof window === 'undefined') return null;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  let node = range.commonAncestorContainer;
  if (node.nodeType === 3) node = node.parentElement;
  const existing = node && node.closest ? node.closest('[data-stress]') : null;

  if (sel.isCollapsed) {
    if (existing && root.contains(existing)) {
      unwrapStressSpan(existing);
      root.normalize();
      return root.innerHTML;
    }
    const { idx, preferBefore } = charIndexBeforeCaret(root, range);
    let targetIdx = preferBefore ? idx : idx;
    if (!preferBefore) {
      // try letter at / after caret
      const hit = findTextNodeAtCharIndex(root, targetIdx);
      if (!hit || !isStressableLetter([...(hit.textNode.textContent || '')][hit.local])) {
        return null;
      }
      wrapCharInTextNode(hit.textNode, hit.local);
      root.normalize();
      return root.innerHTML;
    }
    const hit = findTextNodeAtCharIndex(root, targetIdx);
    if (!hit) return null;
    wrapCharInTextNode(hit.textNode, hit.local);
    root.normalize();
    return root.innerHTML;
  }

  // Selection: if all selected stressable letters are stressed → remove; else add
  const stressedInRange = [];
  root.querySelectorAll('[data-stress]').forEach((sp) => {
    try {
      if (range.intersectsNode(sp)) stressedInRange.push(sp);
    } catch (e) {}
  });

  const selectedText = range.toString();
  const letters = [...selectedText].filter(isStressableLetter);
  if (!letters.length && existing) {
    unwrapStressSpan(existing);
    root.normalize();
    return root.innerHTML;
  }
  if (!letters.length) return null;

  if (stressedInRange.length >= letters.length) {
    stressedInRange.forEach(unwrapStressSpan);
    root.normalize();
    return root.innerHTML;
  }

  const frag = range.extractContents();
  const walker = document.createTreeWalker(frag, NodeFilter.SHOW_TEXT);
  const texts = [];
  let n = walker.nextNode();
  while (n) {
    texts.push(n);
    n = walker.nextNode();
  }
  texts.forEach((textNode) => {
    if (textNode.parentElement && textNode.parentElement.closest('[data-stress]')) return;
    const t = textNode.textContent || '';
    if (![...t].some(isStressableLetter)) return;
    const parent = textNode.parentNode;
    const parts = document.createDocumentFragment();
    for (const ch of t) {
      if (ch === COMBINING_ACUTE) continue;
      if (isStressableLetter(ch)) {
        const span = document.createElement('span');
        span.setAttribute('data-stress', '1');
        span.setAttribute('data-stress-case', stressCaseForChar(ch));
        span.textContent = ch;
        parts.appendChild(span);
      } else {
        parts.appendChild(document.createTextNode(ch));
      }
    }
    parent.replaceChild(parts, textNode);
  });
  range.insertNode(frag);
  root.normalize();
  return root.innerHTML;
}

/** Toggle stress when not editing: first letter, or strip all. */
export function toggleStressInHtml(html) {
  const src = String(html || '');
  if (/data-stress\s*=/.test(src) || src.includes(COMBINING_ACUTE)) {
    return src
      .replace(/<span[^>]*\bdata-stress\b[^>]*>([\s\S]*?)<\/span>/gi, '$1')
      .replace(new RegExp(COMBINING_ACUTE, 'g'), '');
  }
  if (typeof document === 'undefined') {
    try {
      return src.replace(/(\p{L})/u, (m) => {
        return `<span data-stress="1" data-stress-case="${stressCaseForChar(m)}">${m}</span>`;
      });
    } catch (e) {
      return src.replace(/([A-Za-zА-Яа-яЁё])/, (m) => {
        return `<span data-stress="1" data-stress-case="${stressCaseForChar(m)}">${m}</span>`;
      });
    }
  }
  const div = document.createElement('div');
  div.innerHTML = src || '';
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    const arr = [...(textNode.textContent || '')];
    const local = arr.findIndex(isStressableLetter);
    if (local >= 0) {
      wrapCharInTextNode(textNode, local);
      break;
    }
    textNode = walker.nextNode();
  }
  return div.innerHTML;
}

export function htmlHasStress(html) {
  return /data-stress\s*=/.test(String(html || '')) || String(html || '').includes(COMBINING_ACUTE);
}

/** CSS for stress marks (legacy `.ec [data-stress]`). */
export const TEXT_STRESS_CSS = `
.react-el-text [data-stress]{position:relative}
.react-el-text [data-stress]::after{
  content:'\\00B4';
  position:absolute;left:50%;top:-0.06em;transform:translateX(-50%);
  font-family:'Times New Roman','Liberation Serif',serif;
  font-size:1.5em;font-weight:700;font-style:normal;line-height:1;
  color:inherit;-webkit-text-fill-color:currentColor;-webkit-text-stroke:0;
  pointer-events:none;user-select:none;z-index:2
}
.react-el-text [data-stress][data-stress-case="upper"]::after{top:calc(-0.06em - 4px)}
.react-el-text [data-stress][data-stress-case="lower"]::after{top:-0.06em}
.react-el-text:has([data-stress]){overflow:visible!important}
`.trim();
