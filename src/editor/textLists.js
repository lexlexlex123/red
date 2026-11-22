/**
 * Bullet / numbered list toggles for text HTML.
 * Compatible with legacy span[data-list-bullet] / span[data-list-num].
 */

import { getIconById } from './iconsLazy.js';
import { buildIconSVG } from './iconSvg.js';

const BULLET_RE = /data-list-bullet/i;
const NUM_RE = /data-list-num/i;
const MARKER_STRIP =
  /<span[^>]*(?:data-list-bullet|data-list-num)[^>]*>[\s\S]*?<\/span>/gi;

const BULLET_MARKER_STYLE =
  'display:inline-flex;align-items:center;justify-content:center;width:1em;height:1em;margin-right:var(--rt-bullet-gap,10px);vertical-align:-0.2em;flex-shrink:0;color:currentColor;user-select:none;line-height:1;cursor:pointer';

const NUM_MARKER_STYLE =
  'display:inline-block;min-width:1.2em;margin-right:var(--rt-bullet-gap,10px);vertical-align:0;color:currentColor;user-select:none;font-variant-numeric:tabular-nums;line-height:1';

/** v7.1 default list marker: Arrow Right (icons-data id 1). */
export const DEFAULT_BULLET_ICON_ID = '1';

/** Popular icon ids for bullet picker (from icons-data). */
export const BULLET_ICON_PRESETS = [
  { id: DEFAULT_BULLET_ICON_ID, label: '→' },
  { id: '35', label: '✓' },
  { id: '9', label: '›' },
  { id: '38', label: '+' },
  { id: '36', label: '◉' },
  { id: '32', label: '⌂' },
];

/**
 * contentEditable often stores paragraphs as sibling <div>/<p>, with empty lines as
 * <div><br></div>. Naïve </div><div> → <br> plus an inner <br> triples blank lines and
 * breaks list toggle (2nd click adds markers instead of removing them).
 */
function flattenBlocksRegex(html) {
  // Use \b after p/div so SVG <path> / </path> are not treated as <p> / </p>.
  return String(html || '')
    .replace(/<(div|p)\b[^>]*>\s*<br\s*\/?>\s*<\/\1>/gi, '<br>')
    .replace(/<\/div\s*>\s*<div\b[^>]*>/gi, '<br>')
    .replace(/<\/p\s*>\s*<p\b[^>]*>/gi, '<br>')
    .replace(/^\s*<(?:div|p)\b[^>]*>/i, '')
    .replace(/<\/(?:div|p)\s*>\s*$/i, '')
    .replace(/<(?:div|p)\b[^>]*>/gi, '<br>')
    .replace(/<\/(?:div|p)\s*>/gi, '')
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br><br>');
}

function isBlockEl(n) {
  return n && n.nodeType === 1 && /^(DIV|P)$/i.test(n.tagName);
}

function isEmptyCeLine(block) {
  const kids = [...(block?.childNodes || [])];
  return (
    !kids.length ||
    kids.every(
      (n) =>
        (n.nodeType === 1 && n.nodeName === 'BR') ||
        (n.nodeType === 3 && !String(n.textContent || '').trim())
    )
  );
}

function unwrapSingleBlockWrappers(root) {
  while (root.childNodes.length === 1 && isBlockEl(root.firstChild)) {
    const only = root.firstChild;
    // Keep <div><br></div> as a block so it serializes to one empty line, not "<br>".
    if (isEmptyCeLine(only)) break;
    const kids = [...only.childNodes];
    const nestedBlocks =
      kids.length > 0 &&
      kids.every((n) => isBlockEl(n) || (n.nodeType === 3 && !String(n.textContent || '').trim()));
    // Nested sibling blocks: unwrap outer only.
    if (nestedBlocks) {
      while (only.firstChild) root.insertBefore(only.firstChild, only);
      only.remove();
      continue;
    }
    // Single wrapper around inline content: unwrap.
    while (only.firstChild) root.insertBefore(only.firstChild, only);
    only.remove();
  }
}

function serializeBlockInner(block) {
  // Chrome empty line: <div><br></div> or <div><br><br></div> → one empty line.
  if (isEmptyCeLine(block)) return '';
  // Nested blocks inside a paragraph → recurse.
  if ([...block.childNodes].some(isBlockEl)) {
    return flattenBlocks(block.innerHTML);
  }
  return block.innerHTML;
}

function flattenBlocksDom(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = String(html || '');
  unwrapSingleBlockWrappers(wrap);
  const nodes = [...wrap.childNodes];
  const meaningful = nodes.filter(
    (n) => !(n.nodeType === 3 && !String(n.textContent || '').trim())
  );
  const allBlocks = meaningful.length > 0 && meaningful.every(isBlockEl);
  if (allBlocks) {
    return meaningful.map(serializeBlockInner).join('<br>');
  }
  // Already flat (or mixed): strip leftover block tags without inventing extra breaks.
  return flattenBlocksRegex(wrap.innerHTML);
}

function flattenBlocks(html) {
  if (typeof document !== 'undefined') return flattenBlocksDom(html);
  return flattenBlocksRegex(html);
}

/** contentEditable often drops <br> inside the marker span, which splits the tag on the next edit. */
function sanitizeMarkerNode(m) {
  [...m.childNodes].forEach((n) => {
    if (n.nodeName === 'BR') {
      n.remove();
      return;
    }
    if (n.nodeType === 3) {
      const t = n.textContent;
      if (t && t.trim()) m.after(document.createTextNode(t));
      n.remove();
      return;
    }
    // SVGElement.tagName is "svg" (lowercase); HTML uses "DIV". Keep the icon inside the marker.
    if (n.nodeType === 1 && !/^svg$/i.test(n.tagName || '')) m.after(n);
  });
}

function htmlToRoot(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = flattenBlocks(html);
  wrap.querySelectorAll('[data-list-bullet], [data-list-num]').forEach(sanitizeMarkerNode);
  return wrap;
}

function splitLines(html) {
  const raw = flattenBlocks(html);
  if (!raw.trim()) return [''];
  if (typeof document === 'undefined') return raw.split(/<br\s*\/?>/i);
  const wrap = htmlToRoot(html);
  const lines = [''];
  const append = (s) => {
    lines[lines.length - 1] += s;
  };
  for (const child of [...wrap.childNodes]) {
    if (child.nodeName === 'BR') lines.push('');
    else if (child.nodeType === 1) append(child.outerHTML);
    else if (child.nodeType === 3) append(child.textContent);
  }
  return lines;
}

function joinLines(lines) {
  return lines.join('<br>');
}

function stripMarker(line) {
  const s = String(line || '');
  if (!s) return s;
  // DOM strip: SVG markers can contain </tspan>; a regex </span> leaves leftovers
  // and the next color/icon change prepends another marker.
  if (typeof document !== 'undefined') {
    const wrap = document.createElement('div');
    wrap.innerHTML = s;
    // Remove every marker (incl. duplicates from prior corruption), then orphan SVGs
    // left behind when contentEditable split a marker span.
    let guard = 0;
    while (guard++ < 32) {
      const marks = wrap.querySelectorAll('[data-list-bullet], [data-list-num]');
      if (!marks.length) break;
      marks.forEach((n) => n.remove());
    }
    [...wrap.childNodes].forEach((n) => {
      if (n.nodeType === 1 && /^svg$/i.test(n.tagName || '')) n.remove();
      else if (n.nodeType === 3 && !String(n.textContent || '').trim()) n.remove();
    });
    return wrap.innerHTML.replace(/^(&nbsp;|\s)+/i, '');
  }
  let out = s;
  for (let i = 0; i < 16; i++) {
    const next = out.replace(MARKER_STRIP, '');
    if (next === out) break;
    out = next;
  }
  return out.replace(/^(?:<svg[\s\S]*?<\/svg>)+/i, '').replace(/^(&nbsp;|\s)+/i, '');
}

function plainText(line) {
  return stripMarker(line)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function escAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function inlineBulletSvg(iconId, color, sw, fillOp) {
  const ic = getIconById(iconId);
  if (!ic) return '•';
  const op = fillOp != null ? +fillOp : 0;
  let svg = buildIconSVG(ic, color || 'currentColor', sw != null ? sw : 1.8, op);
  svg = svg
    .replace(/\sstyle="[^"]*"/i, '')
    .replace(/\swidth="[^"]*"/i, '')
    .replace(/\sheight="[^"]*"/i, '');
  return svg.replace(
    /<svg\b/,
    '<svg width="1em" height="1em" style="width:1em;height:1em;display:block;flex-shrink:0;overflow:visible;pointer-events:none"'
  );
}

/**
 * @param {{ iconId?: string, color?: string, sw?: number }} [opts]
 */
export function bulletMarker(opts = {}) {
  const iconId = opts.iconId ? String(opts.iconId) : '';
  const color = opts.color || 'currentColor';
  const sw = opts.sw != null ? opts.sw : 1.8;
  const fillOp = opts.fillOp != null && opts.fillOp !== '' ? +opts.fillOp : 0;
  if (!iconId) {
    return `<span data-list-bullet contenteditable="false" style="${BULLET_MARKER_STYLE}">•</span>`;
  }
  const inner = inlineBulletSvg(iconId, color, sw, fillOp);
  return (
    `<span data-list-bullet data-icon-id="${escAttr(iconId)}" data-icon-color="${escAttr(color)}" data-icon-sw="${sw}" data-icon-fill-op="${fillOp}" contenteditable="false" style="${BULLET_MARKER_STYLE}">` +
    `${inner}</span>`
  );
}

function toRoman(n) {
  const pairs = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let v = Math.max(1, Math.floor(n) || 1);
  let out = '';
  for (const [val, sym] of pairs) {
    while (v >= val) {
      out += sym;
      v -= val;
    }
  }
  return out;
}

function toAlpha(n) {
  let v = Math.max(1, Math.floor(n) || 1);
  let out = '';
  while (v > 0) {
    v--;
    out = String.fromCharCode(65 + (v % 26)) + out;
    v = Math.floor(v / 26);
  }
  return out;
}

function formatListNum(n, style) {
  if (style === 'roman') return `${toRoman(n)}.`;
  if (style === 'alpha') return `${toAlpha(n)}.`;
  return `${n}.`;
}

function detectNumStyleFromText(text) {
  const t = String(text || '')
    .replace(/\.$/, '')
    .trim();
  if (/^\d+$/.test(t)) return 'decimal';
  if (/^[IVXLCDM]+$/i.test(t)) return 'roman';
  if (/^[A-Za-z]+$/.test(t)) return 'alpha';
  return 'decimal';
}

function lineNumStyle(line) {
  if (!NUM_RE.test(line)) return null;
  const m = String(line).match(/data-num-style="([^"]+)"/i);
  if (m && ['decimal', 'roman', 'alpha'].includes(m[1])) return m[1];
  const tm = String(line).match(/data-list-num[^>]*>([^<]*)/i);
  return detectNumStyleFromText(tm ? tm[1] : '');
}

export function numMarker(n, style = 'decimal') {
  return `<span data-list-num data-num-style="${style}" contenteditable="false" style="${NUM_MARKER_STYLE}">${formatListNum(n, style)}</span>`;
}

function lineIndexFromHtmlPrefix(html) {
  const lines = splitLines(html);
  return Math.max(0, lines.length - 1);
}

/** Top-level block paragraphs under a CE root (Chrome uses sibling <div>s). */
function topLevelBlocks(root) {
  if (!root) return [];
  const blocks = [...root.childNodes].filter(isBlockEl);
  const hasInline =
    [...root.childNodes].some(
      (n) =>
        (n.nodeType === 3 && String(n.textContent || '').trim()) ||
        (n.nodeType === 1 && !isBlockEl(n) && n.nodeName !== 'BR')
    ) || [...root.childNodes].some((n) => n.nodeName === 'BR');
  // Prefer block mode only when the root is purely block-based (no loose <br>/text).
  if (!blocks.length || hasInline) return [];
  return blocks;
}

function lineIndexInLiveRoot(root, node, offset) {
  if (!root || !node) return 0;
  const blocks = topLevelBlocks(root);
  if (blocks.length) {
    let el = node.nodeType === 1 ? node : node.parentElement;
    while (el && el !== root && el.parentElement !== root) el = el.parentElement;
    if (el && el.parentElement === root && isBlockEl(el)) {
      const i = blocks.indexOf(el);
      return i >= 0 ? i : 0;
    }
    // Offset into root pointing at a child block.
    if (node === root) {
      const child = root.childNodes[Math.min(offset, root.childNodes.length)] || root.childNodes[offset - 1];
      if (child && isBlockEl(child)) {
        const i = blocks.indexOf(child);
        return i >= 0 ? i : Math.max(0, blocks.length - 1);
      }
      if (offset >= root.childNodes.length) return Math.max(0, blocks.length - 1);
    }
    return 0;
  }
  try {
    const r = document.createRange();
    r.setStart(root, 0);
    if (node === root) r.setEnd(root, Math.max(0, Math.min(offset, root.childNodes.length)));
    else r.setEnd(node, offset);
    const wrap = document.createElement('div');
    wrap.appendChild(r.cloneContents());
    return lineIndexFromHtmlPrefix(wrap.innerHTML);
  } catch {
    return 0;
  }
}

/** Paragraph index of a node inside a text body / contentEditable root. */
export function lineIndexOfNode(root, node) {
  if (!root || !node || !root.contains(node)) return 0;
  return lineIndexInLiveRoot(root, node, 0);
}

function lineBulletAttrs(line) {
  const s = String(line || '');
  const iconId = (s.match(/data-icon-id="([^"]*)"/i) || [])[1];
  const color = (s.match(/data-icon-color="([^"]*)"/i) || [])[1];
  const swRaw = (s.match(/data-icon-sw="([^"]*)"/i) || [])[1];
  const sw = swRaw != null && swRaw !== '' && Number.isFinite(+swRaw) ? +swRaw : undefined;
  return { iconId, color, sw };
}

/**
 * Line indices covered by the caret / selection inside a contentEditable root.
 * Collapsed caret → that paragraph. Range → every overlapping paragraph.
 * Returns null if the selection is not in `root` (caller should apply to all).
 */
export function targetedLineIndices(root) {
  if (typeof window === 'undefined' || !root) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const anchor = sel.anchorNode;
  const focus = sel.focusNode;
  if (!anchor || (!root.contains(anchor) && !(focus && root.contains(focus)))) return null;

  const a = lineIndexInLiveRoot(root, sel.anchorNode, sel.anchorOffset);
  const b = lineIndexInLiveRoot(
    root,
    sel.focusNode || sel.anchorNode,
    sel.focusNode ? sel.focusOffset : sel.anchorOffset
  );
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const out = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

export function placeCaretAfterLineMarker(root, lineIdx) {
  if (!root || lineIdx == null) return;
  try {
    const sel = window.getSelection();
    let idx = 0;
    const visit = (parent) => {
      for (const child of Array.from(parent.childNodes)) {
        if (idx > lineIdx) return true;
        if (child.nodeType === 1 && child.tagName === 'BR') {
          idx += 1;
          continue;
        }
        if (child.nodeType === 1 && /^(DIV|P)$/i.test(child.tagName)) {
          if (idx === lineIdx) {
            const marker = child.querySelector?.('[data-list-bullet], [data-list-num]');
            const r = document.createRange();
            if (marker) r.setStartAfter(marker);
            else r.setStart(child, 0);
            r.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(r);
            return true;
          }
          idx += 1;
          continue;
        }
        if (idx === lineIdx && child.nodeType === 1 && (child.hasAttribute?.('data-list-bullet') || child.hasAttribute?.('data-list-num'))) {
          const r = document.createRange();
          r.setStartAfter(child);
          r.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(r);
          return true;
        }
      }
      return false;
    };
    if (!visit(root) && sel) {
      const r = document.createRange();
      r.selectNodeContents(root);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} html
 * @param {'bullet'|'num'} listType
 * @param {{ iconId?: string, color?: string, sw?: number }} [opts]
 * @param {number[]|null} [lineIndices] targeted paragraphs; null / empty = all
 */
export function toggleListHtml(html, listType, opts = {}, lineIndices = null) {
  const lines = splitLines(html);
  const targetSet =
    lineIndices && lineIndices.length
      ? new Set(lineIndices.filter((i) => i >= 0 && i < lines.length))
      : new Set(lines.map((_, i) => i));
  const nonEmpty = lines.filter((l, i) => targetSet.has(i) && plainText(l));
  if (!nonEmpty.length) return html || '';

  let applyMode = 'on';
  let numStyle = 'decimal';

  if (listType === 'bullet') {
    const allHave = nonEmpty.every((l) => BULLET_RE.test(l));
    applyMode = allHave ? 'off' : 'on';
  } else {
    const styles = nonEmpty.map((l) => lineNumStyle(l));
    const allHaveNum = styles.length > 0 && styles.every((s) => s != null);
    const uniform = allHaveNum && styles.every((s) => s === styles[0]) ? styles[0] : null;
    if (uniform === 'decimal') numStyle = 'roman';
    else if (uniform === 'roman') numStyle = 'alpha';
    else if (uniform === 'alpha') applyMode = 'off';
    else numStyle = 'decimal';
  }

  let num = 0;
  const next = lines.map((line, i) => {
    if (!targetSet.has(i)) return line;
    const stripped = stripMarker(line);
    if (!plainText(stripped)) return stripped;
    if (applyMode === 'off') return stripped;
    num += 1;
    const marker = listType === 'bullet' ? bulletMarker(opts) : numMarker(num, numStyle);
    return marker + stripped.replace(/^\s+/, '');
  });
  return joinLines(next);
}

/** Current numbered style of html, or null if not a numbered list. */
export function htmlNumListStyle(html) {
  const lines = splitLines(html).filter((l) => plainText(l));
  if (!lines.length || !lines.every((l) => NUM_RE.test(l))) return null;
  const styles = lines.map((l) => lineNumStyle(l));
  if (!styles.length || styles.some((s) => s == null)) return null;
  return styles.every((s) => s === styles[0]) ? styles[0] : 'decimal';
}

/**
 * Re-stamp existing bullet markers with new icon/color (keeps list structure).
 * Always outline-only (fillOp 0) — list markers never use fill.
 * @param {string} html
 * @param {{ iconId?: string, color?: string, sw?: number, mode?: 'all'|'icon'|'color' }} [opts]
 * @param {number[]|null} [lineIndices] targeted paragraphs; null / empty = all bulleted lines
 */
export function reapplyBulletMarkers(html, opts = {}, lineIndices = null) {
  const mode = opts.mode === 'icon' || opts.mode === 'color' ? opts.mode : 'all';
  const lines = splitLines(html);
  const targetSet =
    lineIndices && lineIndices.length
      ? new Set(lineIndices.filter((i) => i >= 0 && i < lines.length))
      : null;
  const next = lines.map((line, i) => {
    if (!BULLET_RE.test(line)) return line;
    if (targetSet && !targetSet.has(i)) return line;
    const prev = lineBulletAttrs(line);
    const stamp = {
      iconId:
        mode === 'color'
          ? prev.iconId || opts.iconId || DEFAULT_BULLET_ICON_ID
          : opts.iconId != null && opts.iconId !== ''
            ? String(opts.iconId)
            : prev.iconId || DEFAULT_BULLET_ICON_ID,
      color:
        mode === 'icon'
          ? prev.color || opts.color || 'currentColor'
          : opts.color || prev.color || 'currentColor',
      sw: opts.sw != null ? opts.sw : prev.sw != null ? prev.sw : 1.8,
      fillOp: 0,
    };
    const stripped = stripMarker(line);
    return bulletMarker(stamp) + stripped.replace(/^\s+/, '');
  });
  return joinLines(next);
}

/**
 * Update bullet markers in a live contentEditable root (v7.1 style — no strip/rebuild).
 * Collapses duplicate markers on the same line. Returns resulting HTML or null.
 * @param {HTMLElement} root
 * @param {{ iconId?: string, color?: string, sw?: number, mode?: 'all'|'icon'|'color' }} [opts]
 * @param {number[]|null} [lineIndices]
 */
export function updateLiveBulletMarkers(root, opts = {}, lineIndices = null) {
  if (!root || typeof document === 'undefined') return null;
  const mode = opts.mode === 'icon' || opts.mode === 'color' ? opts.mode : 'all';
  const targetSet =
    lineIndices && lineIndices.length ? new Set(lineIndices.filter((i) => i >= 0)) : null;
  const fillOp = 0;
  const marks = [...root.querySelectorAll('span[data-list-bullet]')];
  if (!marks.length) return null;

  // Drop consecutive duplicate markers (corruption from prior strip/rebuild).
  marks.forEach((sp) => {
    let sib = sp.nextSibling;
    while (sib && sib.nodeType === 3 && !String(sib.textContent || '').trim()) {
      const gone = sib;
      sib = sib.nextSibling;
      gone.remove();
    }
    while (sib && sib.nodeType === 1 && /^svg$/i.test(sib.tagName || '')) {
      const gone = sib;
      sib = sib.nextSibling;
      gone.remove();
    }
    if (sib && sib.nodeType === 1 && sib.hasAttribute?.('data-list-bullet')) {
      sib.remove();
    }
  });

  root.querySelectorAll('span[data-list-bullet]').forEach((sp) => {
    if (targetSet) {
      const lineIdx = lineIndexOfNode(root, sp);
      if (!targetSet.has(lineIdx)) return;
    }
    const prevId = sp.getAttribute('data-icon-id') || DEFAULT_BULLET_ICON_ID;
    const prevColor = sp.getAttribute('data-icon-color') || 'currentColor';
    const prevSw = sp.getAttribute('data-icon-sw');
    const id =
      mode === 'color'
        ? prevId
        : opts.iconId != null && opts.iconId !== ''
          ? String(opts.iconId)
          : prevId;
    const color = mode === 'icon' ? prevColor : opts.color || prevColor || 'currentColor';
    const sw =
      opts.sw != null
        ? opts.sw
        : prevSw != null && prevSw !== '' && Number.isFinite(+prevSw)
          ? +prevSw
          : 1.8;
    sp.setAttribute('data-icon-id', id);
    sp.setAttribute('data-icon-color', color);
    sp.setAttribute('data-icon-sw', String(sw));
    sp.setAttribute('data-icon-fill-op', String(fillOp));
    sp.setAttribute('contenteditable', 'false');
    sp.innerHTML = inlineBulletSvg(id, color, sw, fillOp);
  });
  return root.innerHTML;
}

export function htmlHasList(html, listType) {
  if (listType === 'bullet') return BULLET_RE.test(html || '');
  return NUM_RE.test(html || '');
}
