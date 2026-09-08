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

function flattenBlocks(html) {
  return String(html || '')
    .replace(/<\/div>\s*<div[^>]*>/gi, '<br>')
    .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
    .replace(/^\s*<(?:div|p)[^>]*>/i, '')
    .replace(/<\/(?:div|p)>\s*$/i, '')
    .replace(/<(?:div|p)[^>]*>/gi, '<br>')
    .replace(/<\/(?:div|p)>/gi, '');
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
    if (n.nodeType === 1 && n.tagName !== 'SVG') m.after(n);
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
      if (n.nodeType === 1 && n.tagName === 'SVG') n.remove();
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

function numMarker(n, style = 'decimal') {
  return `<span data-list-num data-num-style="${style}" contenteditable="false" style="${NUM_MARKER_STYLE}">${formatListNum(n, style)}</span>`;
}

function lineIndexFromHtmlPrefix(html) {
  const lines = splitLines(html);
  return Math.max(0, lines.length - 1);
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

  const idxAt = (node, offset) => {
    if (!node || !root.contains(node)) return 0;
    try {
      const r = document.createRange();
      r.setStart(root, 0);
      r.setEnd(node, offset);
      const wrap = document.createElement('div');
      wrap.appendChild(r.cloneContents());
      return lineIndexFromHtmlPrefix(wrap.innerHTML);
    } catch {
      return 0;
    }
  };

  const a = idxAt(sel.anchorNode, sel.anchorOffset);
  const b = idxAt(sel.focusNode, sel.focusOffset);
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
 */
export function reapplyBulletMarkers(html, opts = {}) {
  const stamp = { ...opts, fillOp: 0 };
  const lines = splitLines(html);
  const next = lines.map((line) => {
    if (!BULLET_RE.test(line)) return line;
    const stripped = stripMarker(line);
    return bulletMarker(stamp) + stripped.replace(/^\s+/, '');
  });
  return joinLines(next);
}

/**
 * Update bullet markers in a live contentEditable root (v7.1 style — no strip/rebuild).
 * Collapses duplicate markers on the same line. Returns resulting HTML or null.
 */
export function updateLiveBulletMarkers(root, opts = {}) {
  if (!root || typeof document === 'undefined') return null;
  const iconId = opts.iconId != null ? String(opts.iconId) : '';
  const color = opts.color || 'currentColor';
  const sw = opts.sw != null ? opts.sw : 1.8;
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
    while (sib && sib.nodeType === 1 && sib.tagName === 'SVG') {
      const gone = sib;
      sib = sib.nextSibling;
      gone.remove();
    }
    if (sib && sib.nodeType === 1 && sib.hasAttribute?.('data-list-bullet')) {
      sib.remove();
    }
  });

  root.querySelectorAll('span[data-list-bullet]').forEach((sp) => {
    const id = iconId || sp.getAttribute('data-icon-id') || DEFAULT_BULLET_ICON_ID;
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
