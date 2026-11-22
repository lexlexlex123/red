/** Text underline cycle (legacy rtUnderline): none → single → double → wavy → dashed → dash-dot. */

export const TEXT_UL_CYCLE = [
  'underline',
  'underline double',
  'underline wavy',
  'underline dashed',
  'underline dash-dot',
  'none',
];

export const TEXT_UL_TITLES_RU = {
  underline: 'одинарное',
  'underline double': 'двойное',
  'underline wavy': 'волнистая',
  'underline dashed': 'пунктирная',
  'underline dash-dot': 'штрихпунктирная',
  none: 'нет',
};

export const TEXT_UL_TITLES_EN = {
  underline: 'single',
  'underline double': 'double',
  'underline wavy': 'wavy',
  'underline dashed': 'dashed',
  'underline dash-dot': 'dash-dot',
  none: 'none',
};

/**
 * Dash-dot via background-image on `[data-ul="dash-dot"]` (native can't do dash-dot).
 * Wavy stays native `text-decoration: underline wavy` — looks smooth; continuity across
 * glyph/span breaks is handled by mergeAdjacentUnderlineSpans + skip-ink:none.
 */
export const TEXT_UL_DASH_DOT_CSS = `
.react-el-text [data-ul="dash-dot"]{
  text-decoration:none!important;
  -webkit-box-decoration-break:clone;
  box-decoration-break:clone;
  background-color:transparent!important;
  background-image:
    radial-gradient(circle 1.5px at 1.5px 50%,currentColor 99%,transparent 100%),
    repeating-linear-gradient(90deg,
      transparent 0,transparent 7px,
      currentColor 7px,currentColor 16px,
      transparent 16px,transparent 20px)!important;
  background-size:20px 3px,20px 1.25px!important;
  background-repeat:repeat-x,repeat-x!important;
  background-position:0 calc(0.88em + 0.12em),0 calc(0.88em + 0.12em + 0.875px)!important;
  background-origin:padding-box!important;
  background-clip:padding-box!important;
}
.react-el-text:has([data-ul="wavy"]){overflow:visible!important}
.react-el-text [data-ul="wavy"]{
  text-decoration:none!important;
  -webkit-box-decoration-break:clone;
  box-decoration-break:clone;
  position:relative;
  display:inline;
}
.react-el-text [data-ul="wavy"]::after{
  content:'';
  position:absolute;
  left:0;
  width:100%;
  top:calc(0.88em + 0.08em);
  height:0.2em;
  pointer-events:none;
  background-color:currentColor;
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='4' viewBox='0 0 14 4'%3E%3Cpath d='M0 2 Q3.5 0 7 2 T14 2' fill='none' stroke='%23000' stroke-width='1.35' stroke-linecap='round'/%3E%3C/svg%3E");
  mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='4' viewBox='0 0 14 4'%3E%3Cpath d='M0 2 Q3.5 0 7 2 T14 2' fill='none' stroke='%23000' stroke-width='1.35' stroke-linecap='round'/%3E%3C/svg%3E");
  -webkit-mask-repeat:repeat-x;
  mask-repeat:repeat-x;
  -webkit-mask-size:14px 100%;
  mask-size:14px 100%;
  -webkit-mask-position:0 50%;
  mask-position:0 50%;
}
`.trim();

export const TEXT_UL_PAINTED_CSS = TEXT_UL_DASH_DOT_CSS;

export function parseUnderline(dec) {
  const d = String(dec || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (!d || d === 'none') return 'none';
  if (d === 'single') return 'underline';
  if (d === 'double') return 'underline double';
  if (d === 'wavy') return 'underline wavy';
  if (d === 'dashed') return 'underline dashed';
  if (d === 'dash-dot' || d === 'dashdot') return 'underline dash-dot';
  if (d.indexOf('underline') < 0 && d !== 'dotted') return 'none';
  if (/\bdouble\b/.test(d)) return 'underline double';
  if (/\bwavy\b/.test(d)) return 'underline wavy';
  if (/\bdotted\b/.test(d) || /\bdash-dot\b/.test(d) || /\bdashdot\b/.test(d)) return 'underline dash-dot';
  if (/\bdashed\b/.test(d)) return 'underline dashed';
  return 'underline';
}

export function nextUnderline(cur) {
  const i = TEXT_UL_CYCLE.indexOf(cur);
  return TEXT_UL_CYCLE[(i < 0 ? 0 : i + 1) % TEXT_UL_CYCLE.length];
}

export function underlineTitle(kind, ru) {
  const map = ru ? TEXT_UL_TITLES_RU : TEXT_UL_TITLES_EN;
  return map[kind] || map.none;
}

export function stripUnderlineFromCs(cs) {
  return String(cs || '')
    .replace(/text-decoration(?:-line|-style|-thickness|-color|-skip-ink)?\s*:[^;]+;?/gi, '')
    .replace(/text-underline-offset\s*:[^;]+;?/gi, '')
    .replace(/--rt-ul\s*:[^;]+;?/gi, '')
    .replace(/background-(?:image|size|position|repeat)\s*:[^;]+;?/gi, '')
    .replace(/padding-bottom\s*:\s*0(?:px)?\s*;?/gi, '')
    .replace(/;;+/g, ';')
    .replace(/^;|;$/g, '');
}

/** Strikethrough is a simple independent on/off toggle (unlike underline's style cycle),
 *  tracked with its own marker so it can be combined with whatever underline is active. */
export function hasStrikeInCs(cs) {
  return /--rt-strike\s*:\s*1/i.test(String(cs || ''));
}

export function stripStrikeFromCs(cs) {
  return String(cs || '')
    .replace(/--rt-strike\s*:[^;]+;?/gi, '')
    .replace(/;;+/g, ';')
    .replace(/^;|;$/g, '');
}

export function applyStrikeToCs(cs, on) {
  const next = stripStrikeFromCs(cs);
  return on ? `${next}--rt-strike:1;` : next;
}

export function parseUnderlineFromCs(cs) {
  const s = String(cs || '');
  if (/--rt-ul\s*:\s*dash-dot/i.test(s)) return 'underline dash-dot';
  if (/--rt-ul\s*:\s*wavy/i.test(s)) return 'underline wavy';
  const m = /text-decoration(?:-line)?\s*:\s*([^;]+)/i.exec(s);
  if (!m) return 'none';
  const line = m[1].trim();
  if (/^none$/i.test(line)) return 'none';
  const styleM = /text-decoration-style\s*:\s*([^;]+)/i.exec(s);
  const combined = styleM ? `${line} ${styleM[1].trim()}` : line;
  return parseUnderline(combined);
}

/** True when underline is drawn via background (not native text-decoration). */
export function isPaintedUnderline(kind) {
  const k = parseUnderline(kind);
  return k === 'underline dash-dot' || k === 'underline wavy';
}

/** Compact cs snippet that represents a painted or native underline kind. */
function underlineKindToCs(kind) {
  const k = parseUnderline(kind);
  if (!k || k === 'none') return '';
  if (k === 'underline dash-dot') return 'text-decoration:none;--rt-ul:dash-dot;';
  if (k === 'underline wavy') return 'text-decoration:none;--rt-ul:wavy;';
  return `text-decoration:${k};`;
}

const UL_COLOR = 'text-decoration-color:currentColor;';
const UL_THIN =
  'text-decoration-thickness:1.25px;text-underline-offset:0.12em;text-decoration-skip-ink:none;' +
  UL_COLOR;

export function applyUnderlineToCs(cs, kind) {
  let next = stripUnderlineFromCs(cs);
  const k = parseUnderline(kind);
  if (!k || k === 'none') return next;
  if (k === 'underline dash-dot') {
    return `${next}text-decoration:none;--rt-ul:dash-dot;`;
  }
  if (k === 'underline wavy') {
    // Painted continuous wave (native wavy restarts after ф / span breaks).
    return `${next}text-decoration:none;--rt-ul:wavy;`;
  }
  if (k === 'underline') return `${next}text-decoration:underline;${UL_THIN}`;
  if (k === 'underline double') return `${next}text-decoration:underline double;${UL_THIN}`;
  if (k === 'underline dashed') {
    return `${next}text-decoration:underline dashed;${UL_THIN}`;
  }
  return next;
}

/** Inline CSS for a span (selection wrap). */
export function underlineInlineCss(kind) {
  const k = parseUnderline(kind);
  const clearBg =
    'background-image:none;background-size:auto;background-position:0 0;background-repeat:no-repeat;padding-bottom:0;';
  if (!k || k === 'none') return `text-decoration:none;${clearBg}`;
  if (k === 'underline') return `text-decoration:underline;${UL_THIN}${clearBg}`;
  if (k === 'underline double') return `text-decoration:underline double;${UL_THIN}${clearBg}`;
  // Wavy + dash-dot: decoration comes from App.css [data-ul] background rules
  if (k === 'underline wavy' || k === 'underline dash-dot') return 'text-decoration:none;';
  if (k === 'underline dashed') {
    return `text-decoration:underline dashed;${UL_THIN}${clearBg}`;
  }
  return '';
}

export function underlineDataUl(kind) {
  const k = parseUnderline(kind);
  if (k === 'underline') return 'single';
  if (k === 'underline double') return 'double';
  if (k === 'underline wavy') return 'wavy';
  if (k === 'underline dashed') return 'dashed';
  if (k === 'underline dash-dot') return 'dash-dot';
  return '';
}

/** Wrap every non-whitespace text run in an underline span (or data-ul for dash-dot).
 *  Used at render time for whole-box underline so the line uses each run's currentColor
 *  (nested colored spans keep a matching underline). Idempotent via data-ul skip. */
export function underlineWrapHtml(html, kind) {
  const k = parseUnderline(kind);
  if (!k || k === 'none') return String(html || '');
  const du = underlineDataUl(k);
  const style = k === 'underline dash-dot' ? '' : underlineInlineCss(k);
  const open = isPaintedUnderline(k)
    ? `<span data-ul="${du}">`
    : `<span data-ul="${du}" style="${style}">`;
  const src = String(html || '');
  if (!src) return src;
  const VOID = /^(?:br|img|hr|input|meta|link|wbr|area|base|col|embed|source|track)$/i;
  let out = '';
  let i = 0;
  const stack = []; // one entry per open non-void tag: { ul: boolean }
  while (i < src.length) {
    if (src[i] === '<') {
      const close = src.indexOf('>', i);
      if (close === -1) {
        out += src.slice(i);
        break;
      }
      const tag = src.slice(i, close + 1);
      const m = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)/.exec(tag);
      if (m) {
        const closing = !!m[1];
        const name = m[2].toLowerCase();
        const selfClose = /\/\s*>$/.test(tag) || VOID.test(name);
        if (closing) {
          if (stack.length) stack.pop();
        } else if (!selfClose) {
          // Skip runs already under any underline (data-ul OR text-decoration) — otherwise
          // overlapping selections stack a second line under the same glyphs.
          const st = /\bstyle\s*=\s*"([^"]*)"/i.exec(tag);
          const styleUl = st ? parseUnderlineFromCs(st[1]) !== 'none' : false;
          stack.push({ ul: /data-ul\s*=/.test(tag) || styleUl });
        }
      }
      out += tag;
      i = close + 1;
      continue;
    }
    const next = src.indexOf('<', i);
    const text = next === -1 ? src.slice(i) : src.slice(i, next);
    i = next === -1 ? src.length : next;
    const insideUl = stack.some((s) => s.ul);
    if (!insideUl && /\S/.test(text)) {
      out += `${open}${text}</span>`;
    } else {
      out += text;
    }
  }
  return out;
}

/** @deprecated use underlineWrapHtml(html, 'underline dash-dot') */
export function dashDotWrapHtml(html) {
  return underlineWrapHtml(html, 'underline dash-dot');
}

function elHasExplicitColor(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.tagName === 'FONT' && el.getAttribute('color')) return true;
  const st = el.getAttribute('style') || '';
  return /(?:^|;)\s*color\s*:/i.test(st);
}

function applyUlAttrsToEl(el, kind) {
  const k = parseUnderline(kind);
  if (!k || k === 'none' || !el) return;
  const du = underlineDataUl(k);
  if (isPaintedUnderline(k)) {
    const st = stripUnderlineFromCs(el.getAttribute('style') || '');
    if (st) el.setAttribute('style', st);
    else el.removeAttribute('style');
    if (du) el.setAttribute('data-ul', du);
    return;
  }
  const prev = stripUnderlineFromCs(el.getAttribute('style') || '');
  const ulCss = underlineInlineCss(k);
  el.setAttribute('style', prev ? `${prev};${ulCss}` : ulCss);
  if (du) el.setAttribute('data-ul', du);
}

function stripUlAttrsFromEl(el) {
  if (!el) return;
  const st = el.getAttribute('style') || '';
  const cleaned = stripUnderlineFromCs(st)
    .replace(/;;+/g, ';')
    .replace(/^;|;\s*$/g, '')
    .trim();
  if (cleaned) el.setAttribute('style', cleaned);
  else el.removeAttribute('style');
  el.removeAttribute('data-ul');
}

/** Set underline on a DOM element (span or <a>). kind "none" clears it. */
export function setElementUnderline(el, kind) {
  if (!el) return;
  const k = parseUnderline(kind);
  if (!k || k === 'none') {
    stripUlAttrsFromEl(el);
    // Keep explicit none on anchors so CSS default dashed does not come back.
    if (el.tagName === 'A') el.setAttribute('data-ul', 'none');
    return;
  }
  applyUlAttrsToEl(el, k);
}

/** Read underline kind from a node (climbs parents). */
export function readUnderlineFromNode(node, root) {
  return detectUnderlineFromNode(node, root);
}

/**
 * When an underline span wraps differently-colored children, browsers paint the line
 * with the wrapper's color. Push the decoration onto each colored host / text run so
 * the wavy (or other) line matches the glyphs above it.
 */
export function syncInlineUnderlineColors(html) {
  if (typeof document === 'undefined') return String(html || '');
  const src = String(html || '');
  if (!src || (!/data-ul|text-decoration/i.test(src) && !/--rt-ul/i.test(src))) return src;
  try {
    const root = document.createElement('div');
    root.innerHTML = src;
    const hosts = Array.from(
      root.querySelectorAll('[data-ul], [style*="text-decoration"], [style*="--rt-ul"]')
    ).reverse();
    for (const host of hosts) {
      const kind = detectUnderlineFromNode(host, root);
      if (kind === 'none') continue;
      const colored = Array.from(host.querySelectorAll('*')).filter(elHasExplicitColor);
      if (!colored.length) {
        // Same color as host — keep underline, force currentColor (native only)
        const st = host.getAttribute('style') || '';
        if (!isPaintedUnderline(kind) && !/text-decoration-color/i.test(st)) {
          host.setAttribute('style', `${st};${UL_COLOR}`.replace(/^;/, ''));
        }
        continue;
      }
      const texts = [];
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (/\S/.test(walker.currentNode.nodeValue || '')) texts.push(walker.currentNode);
      }
      for (const tn of texts) {
        let colorHost = null;
        let n = tn.parentElement;
        while (n && n !== host) {
          if (elHasExplicitColor(n)) colorHost = n;
          n = n.parentElement;
        }
        if (colorHost) {
          applyUlAttrsToEl(colorHost, kind);
        } else {
          const parent = tn.parentElement;
          if (
            parent &&
            parent !== host &&
            parent.childNodes.length === 1 &&
            parent.tagName === 'SPAN' &&
            !parent.getAttribute('data-ul')
          ) {
            applyUlAttrsToEl(parent, kind);
          } else {
            const span = document.createElement('span');
            applyUlAttrsToEl(span, kind);
            parent.insertBefore(span, tn);
            span.appendChild(tn);
          }
        }
      }
      stripUlAttrsFromEl(host);
    }
    return root.innerHTML;
  } catch (e) {
    return src;
  }
}

export function htmlHasInlineColor(html) {
  return /style\s*=\s*"[^"]*color\s*:/i.test(String(html || '')) || /<\s*font\b[^>]*\bcolor\s*=/i.test(String(html || ''));
}

/**
 * Fix mixed-color underlines; for dash-dot or box+colored runs, materialize wraps so
 * each glyph color drives the line. Returns { html, paintBoxUnderline }.
 */
/** Convert legacy native `underline wavy` styles to painted data-ul markers. */
function convertNativePaintedUnderlinesInHtml(html) {
  if (typeof document === 'undefined') return String(html || '');
  const src = String(html || '');
  if (!/text-decoration/i.test(src) && !/--rt-ul/i.test(src)) return src;
  try {
    const root = document.createElement('div');
    root.innerHTML = src;
    root.querySelectorAll('[style*="text-decoration"], [style*="--rt-ul"]').forEach((el) => {
      const kind = parseUnderlineFromCs(el.getAttribute('style') || '');
      if (isPaintedUnderline(kind)) applyUlAttrsToEl(el, kind);
    });
    return root.innerHTML;
  } catch (e) {
    return src;
  }
}

/**
 * Merge adjacent sibling spans that share the same data-ul so a wavy/dash-dot
 * background tile stays phase-continuous across the joined run.
 */
export function mergeAdjacentUnderlineSpans(html) {
  if (typeof document === 'undefined') return String(html || '');
  const src = String(html || '');
  if (!/data-ul\s*=/.test(src)) return src;
  try {
    const root = document.createElement('div');
    root.innerHTML = src;
    let guard = 0;
    while (guard++ < 48) {
      let merged = false;
      const spans = Array.from(root.querySelectorAll('span[data-ul]'));
      for (const a of spans) {
        if (!a.parentNode) continue;
        const b = a.nextSibling;
        if (!b || b.nodeType !== 1 || b.tagName !== 'SPAN') continue;
        const ua = a.getAttribute('data-ul');
        const ub = b.getAttribute('data-ul');
        if (!ua || ua !== ub) continue;
        // Same underline kind — join (keep a's other styles; drop b's wrapper)
        while (b.firstChild) a.appendChild(b.firstChild);
        b.remove();
        merged = true;
        break;
      }
      if (!merged) break;
    }
    return root.innerHTML;
  } catch (e) {
    return src;
  }
}

export function prepareTextUnderlineHtml(html, cs) {
  const kind = parseUnderlineFromCs(cs);
  let out = convertNativePaintedUnderlinesInHtml(html);
  out = unnestUnderlinesInHtml(syncInlineUnderlineColors(out));
  const mixed = htmlHasInlineColor(out);
  const needWrap =
    isPaintedUnderline(kind) || (kind !== 'none' && mixed);
  if (needWrap) out = underlineWrapHtml(out, kind);
  out = unnestUnderlinesInHtml(out);
  out = mergeAdjacentUnderlineSpans(out);
  return {
    html: out,
    // Box CSS underline only when native decoration is safe (no nested colors;
    // wavy/dash-dot are always painted on inline spans).
    paintBoxUnderline: kind !== 'none' && !isPaintedUnderline(kind) && !mixed,
    kind,
  };
}

/** React style + class for the text box from cs. */
export function underlineBoxProps(cs, opts = {}) {
  const kind = parseUnderlineFromCs(cs);
  const strike = hasStrikeInCs(cs);
  const paintUl = opts.paintBoxUnderline !== false;
  if (kind === 'none' || isPaintedUnderline(kind) || !paintUl) {
    return strike
      ? {
          style: {
            textDecorationLine: 'line-through',
            textDecorationColor: 'currentColor',
            textDecorationThickness: '1.25px',
            textDecorationSkipInk: 'none',
          },
          className: '',
          kind,
        }
      : {
          style: kind !== 'none' ? { textDecorationLine: 'none' } : {},
          className: '',
          kind,
        };
  }
  const lineWord = {
    underline: 'underline',
    'underline double': 'underline',
    'underline wavy': 'underline',
    'underline dashed': 'underline',
  };
  const styleWord = {
    underline: 'solid',
    'underline double': 'double',
    'underline wavy': 'wavy',
    'underline dashed': 'dashed',
  };
  return {
    style: {
      textDecorationLine: strike
        ? `${lineWord[kind] || 'underline'} line-through`
        : lineWord[kind] || 'underline',
      textDecorationColor: 'currentColor',
      textDecorationStyle: styleWord[kind] || 'solid',
      textDecorationThickness: '1.25px',
      textUnderlineOffset: '0.12em',
      textDecorationSkipInk: 'none',
    },
    className: '',
    kind,
  };
}

/** Inline CSS for a span (selection wrap) — combines with whatever underline is already on
 *  that run, same rule as underlineBoxProps above. */
export function strikeInlineCss(cs, on) {
  const kind = parseUnderlineFromCs(cs);
  if (!on) {
    return kind === 'none' ? 'text-decoration-line:none;' : underlineInlineCss(kind);
  }
  const strikeCss =
    'text-decoration-line:line-through;text-decoration-color:currentColor;text-decoration-thickness:1.25px;text-decoration-skip-ink:none;';
  if (kind === 'none') return strikeCss;
  const lineWord = { underline: 'underline', 'underline double': 'underline', 'underline wavy': 'underline', 'underline dashed': 'underline' };
  const styleWord = { underline: 'solid', 'underline double': 'double', 'underline wavy': 'wavy', 'underline dashed': 'dashed' };
  if (isPaintedUnderline(kind)) return strikeCss;
  return `text-decoration-line:${lineWord[kind] || 'underline'} line-through;text-decoration-style:${styleWord[kind] || 'solid'};${UL_THIN}`;
}

export function underlineActive(cs) {
  return parseUnderlineFromCs(cs) !== 'none';
}

/** Detect underline from selection / editable node. */
export function detectUnderlineFromEditable(root, fallbackCs) {
  if (typeof window === 'undefined' || !root) return parseUnderlineFromCs(fallbackCs);
  try {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && root.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const kinds = new Set();
      const consider = (node) => {
        let n = node;
        if (n && n.nodeType === 3) n = n.parentElement;
        while (n && n !== root) {
          if (n.getAttribute) {
            const du = n.getAttribute('data-ul');
            if (du) {
              kinds.add(parseUnderline(du));
              return;
            }
            const st = n.getAttribute('style') || '';
            if (/text-decoration/i.test(st) || /--rt-ul/i.test(st)) {
              const fromStyle = parseUnderlineFromCs(st);
              if (fromStyle !== 'none') {
                kinds.add(fromStyle);
                return;
              }
            }
          }
          n = n.parentElement;
        }
      };
      if (!sel.isCollapsed) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
          if ((node.textContent || '').replace(/[\s\u200b]/g, '') && range.intersectsNode(node)) {
            consider(node);
          }
          node = walker.nextNode();
        }
      }
      if (!kinds.size) consider(sel.anchorNode);
      if (kinds.size === 1) return [...kinds][0];
      if (kinds.size > 1) return [...kinds][0];
    }
  } catch (e) {}
  return parseUnderlineFromCs(fallbackCs);
}

/** The one underline shared by every text run, or null when runs disagree / there is none to read. */
export function uniformUnderlineInHtml(html) {
  if (typeof document === 'undefined') return null;
  const src = String(html || '');
  if (!src || !/data-ul|text-decoration|--rt-ul/i.test(src)) return null;
  try {
    const root = document.createElement('div');
    root.innerHTML = src;
    const kinds = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (/\S/.test(node.nodeValue || '')) kinds.add(detectUnderlineFromNode(node, root));
      node = walker.nextNode();
    }
    if (kinds.size !== 1) return null;
    return [...kinds][0];
  } catch (e) {
    return null;
  }
}

/** Character offsets of the current selection inside root (survives innerHTML rewrite). */
export function captureSelectionOffsets(root) {
  if (typeof window === 'undefined' || !root) return null;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !root.contains(sel.anchorNode)) return null;
  try {
    const range = sel.getRangeAt(0);
    const before = document.createRange();
    before.selectNodeContents(root);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length;
    const end = start + range.toString().length;
    return { start, end };
  } catch (e) {
    return null;
  }
}

export function restoreSelectionOffsets(root, off) {
  if (!root || !off || typeof window === 'undefined') return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let startNode = null;
  let startOff = 0;
  let endNode = null;
  let endOff = 0;
  let node = walker.nextNode();
  while (node) {
    const len = (node.nodeValue || '').length;
    if (!startNode && pos + len >= off.start) {
      startNode = node;
      startOff = Math.max(0, off.start - pos);
    }
    if (pos + len >= off.end) {
      endNode = node;
      endOff = Math.max(0, off.end - pos);
      break;
    }
    pos += len;
    node = walker.nextNode();
  }
  if (!startNode) return;
  try {
    const range = document.createRange();
    range.setStart(startNode, Math.min(startOff, startNode.nodeValue.length));
    const endN = endNode || startNode;
    range.setEnd(endN, Math.min(endOff, endN.nodeValue.length));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (e) {}
}

/** Detect if node or its parents have strike (line-through). */
function detectStrikeFromNode(node, root) {
  if (typeof window === 'undefined' || !node) return false;
  try {
    let n = node;
    if (n.nodeType === 3) n = n.parentElement;
    while (n && n !== root) {
      if (n.getAttribute) {
        const st = n.getAttribute('style') || '';
        if (/line-through/i.test(st)) return true;
        if (/--rt-strike\s*:\s*1/i.test(st)) return true;
      }
      n = n.parentElement;
    }
  } catch (e) {}
  return false;
}

/** True if an HTML fragment contains any inline strikethrough (line-through or --rt-strike). */
export function hasStrikeInHtml(html) {
  return /line-through|--rt-strike\s*:\s*1/i.test(String(html || ''));
}

/** Detect strike from the current selection within an editable root, falling back to
 *  the element-level cs marker (--rt-strike:1). */
export function detectStrikeFromEditable(root, fallbackCs) {
  if (typeof window === 'undefined' || !root) return hasStrikeInCs(fallbackCs);
  try {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && root.contains(sel.anchorNode)) {
      if (detectStrikeFromNode(sel.anchorNode, root)) return true;
    }
  } catch (e) {}
  return hasStrikeInCs(fallbackCs);
}

/** Rewrite every `style="…"` attribute in an HTML fragment through `cleaner(st)`. */
function rewriteHtmlStyles(html, cleaner) {
  return String(html || '').replace(/\sstyle="([^"]*)"/gi, (m, st) => {
    const cleaned = cleaner(st);
    return cleaned ? ` style="${cleaned}"` : '';
  });
}

/** Remove inline strike (line-through / --rt-strike) from every style in an HTML fragment. */
export function stripStrikeFromHtml(html) {
  return rewriteHtmlStyles(html, (st) => stripLineThroughFromStyle(st));
}

/** Remove inline underline (any style / --rt-ul / data-ul) from an HTML fragment. */
export function stripUnderlineFromHtml(html) {
  return rewriteHtmlStyles(html, (st) => stripUnderlineFromCs(st)).replace(
    /\sdata-ul="[^"]*"/gi,
    ''
  );
}

function elHasUnderline(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.getAttribute?.('data-ul')) return true;
  const st = el.getAttribute?.('style') || '';
  return parseUnderlineFromCs(st) !== 'none';
}

/** Remove underline styles from all nested elements, but preserve strike (line-through). */
function stripUnderlineFromChildren(node) {
  if (!node) return;
  const els = node.querySelectorAll
    ? Array.from(node.querySelectorAll('[data-ul], [style*="text-decoration"], [style*="--rt-ul"]'))
    : [];
  // Also check the node itself when it's an element
  if (node.nodeType === 1 && elHasUnderline(node)) els.push(node);
  for (const el of els) {
    const style = el.getAttribute('style') || '';
    const hadStrike = /line-through/i.test(style) || /--rt-strike\s*:\s*1/i.test(style);
    let cleaned = stripUnderlineFromCs(style)
      .replace(/;;+/g, ';')
      .replace(/^;|;\s*$/g, '')
      .trim();
    if (hadStrike) {
      cleaned = cleaned
        ? `${cleaned};text-decoration-line:line-through;`
        : 'text-decoration-line:line-through;';
    }
    if (cleaned) el.setAttribute('style', cleaned);
    else el.removeAttribute('style');
    el.removeAttribute('data-ul');
  }
}

/**
 * Lift `node` out of any underline ancestors (splitting them into before/after),
 * so a new underline never nests under an old one — overlapping selections keep
 * a single line (the new style) on the shared glyphs.
 */
function splitOutFromUnderlineAncestors(node, root) {
  if (!node || !root) return;
  let guard = 0;
  while (guard++ < 32) {
    let parent = node.parentElement;
    let ulHost = null;
    while (parent && parent !== root && parent !== document.body) {
      if (elHasUnderline(parent)) {
        ulHost = parent;
        break;
      }
      parent = parent.parentElement;
    }
    if (!ulHost) return;

    const grand = ulHost.parentNode;
    if (!grand) return;

    // Clone attrs for the "after" half (same underline style as the host)
    const after = ulHost.cloneNode(false);
    while (node.nextSibling) after.appendChild(node.nextSibling);

    // Pull node out: [ulHost: before...] [node] [after: ...]
    ulHost.removeChild(node);
    const insertAt = ulHost.nextSibling;
    if (after.childNodes.length) grand.insertBefore(after, insertAt);
    grand.insertBefore(node, after.childNodes.length ? after : insertAt);

    // Drop empty halves; strip underline from a host that no longer needs it
    if (!ulHost.hasChildNodes()) ulHost.remove();
    if (after.parentNode && !after.hasChildNodes()) after.remove();
  }
}

/** Flatten nested underlines in a DOM subtree (outer line removed on shared runs). */
export function unnestUnderlinesIn(root) {
  if (!root || typeof document === 'undefined') return;
  let guard = 0;
  while (guard++ < 32) {
    const all = Array.from(
      root.querySelectorAll('[data-ul], [style*="text-decoration"], [style*="--rt-ul"]')
    ).filter(elHasUnderline);
    // Find an underline node that still sits inside another underline
    let nested = null;
    for (const el of all) {
      let p = el.parentElement;
      while (p && p !== root) {
        if (elHasUnderline(p)) {
          nested = el;
          break;
        }
        p = p.parentElement;
      }
      if (nested) break;
    }
    if (!nested) {
      pruneUnderlineDebris(root);
      return;
    }
    splitOutFromUnderlineAncestors(nested, root);
  }
  pruneUnderlineDebris(root);
}

/** Drop empty underline shells left when a selection is split across colored runs. */
function pruneUnderlineDebris(root) {
  if (!root) return;
  const els = Array.from(root.querySelectorAll('span')).reverse();
  for (const el of els) {
    if (!el.parentNode) continue;
    if (!/\S/.test(el.textContent || '') && !el.querySelector('br, img')) {
      el.remove();
      continue;
    }
    const style = (el.getAttribute('style') || '').replace(/;;+/g, ';').replace(/^;|;$/g, '').trim();
    if (style) el.setAttribute('style', style);
    else el.removeAttribute('style');
    if (!el.getAttribute('data-ul') && !el.getAttribute('style') && el.attributes.length === 0) {
      el.replaceWith(...el.childNodes);
    }
  }
}

/** HTML string helper — unnest stacked underlines after overlapping edits. */
export function unnestUnderlinesInHtml(html) {
  if (typeof document === 'undefined') return String(html || '');
  const src = String(html || '');
  if (!src || !/data-ul|text-decoration/i.test(src)) return src;
  try {
    const root = document.createElement('div');
    root.innerHTML = src;
    unnestUnderlinesIn(root);
    return root.innerHTML;
  } catch (e) {
    return src;
  }
}

/** Wrap current selection with underline style; returns true if applied.
 *  Replaces any existing underline on the run (never stacks), while preserving strike.
 *  `root` is the editable node — used to collapse leftover inline underline on ancestors.
 *  `preserveStrike` reflects an element-level box strike (--rt-strike:1). */
export function applyUnderlineToSelection(kind, root, preserveStrike) {
  if (typeof window === 'undefined') return false;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  const k = parseUnderline(kind);
  try {
    // Detect existing strike on anchor node (inline) or on the element-level box
    const commonAncestor = range.commonAncestorContainer;
    const hadStrike = !!preserveStrike || detectStrikeFromNode(sel.anchorNode, commonAncestor);

    // Extract contents first to avoid nested spans
    const contents = range.extractContents();
    if (contents.childNodes.length === 0) return false;

    // Strip old underline styles from any nested spans in the extracted content
    stripUnderlineFromChildren(contents);

    // Create span with new style
    const span = document.createElement('span');
    if (hadStrike) {
      span.setAttribute('style', strikeInlineCss(underlineKindToCs(k), true));
    } else {
      span.setAttribute('style', underlineInlineCss(k));
    }
    const du = underlineDataUl(k);
    if (du) span.setAttribute('data-ul', du);
    else span.removeAttribute('data-ul');

    // Append extracted content
    span.appendChild(contents);
    range.insertNode(span);

    // If the new span landed inside an older underline, split that ancestor so the
    // overlapping glyphs keep only this underline (no double line).
    if (root) {
      splitOutFromUnderlineAncestors(span, root);
      unnestUnderlinesIn(root);
    }

    // Mixed-color selection: push decoration onto colored runs so the line matches glyphs
    let focus = span;
    if (k !== 'none' && span.parentNode) {
      try {
        const fixed = syncInlineUnderlineColors(span.outerHTML);
        if (fixed && fixed !== span.outerHTML) {
          const tmp = document.createElement('div');
          tmp.innerHTML = fixed;
          const frag = document.createDocumentFragment();
          while (tmp.firstChild) frag.appendChild(tmp.firstChild);
          const first = frag.firstChild;
          const last = frag.lastChild;
          span.replaceWith(frag);
          focus = last || first;
          if (root) {
            if (first) splitOutFromUnderlineAncestors(first, root);
            unnestUnderlinesIn(root);
          }
          if (first && last && first.parentNode) {
            sel.removeAllRanges();
            const nr = document.createRange();
            nr.setStartBefore(first);
            nr.setEndAfter(last);
            sel.addRange(nr);
            return true;
          }
        }
      } catch (e2) {}
    }

    // Restore selection inside the new span
    sel.removeAllRanges();
    const nr = document.createRange();
    nr.selectNodeContents(focus);
    sel.addRange(nr);
    return true;
  } catch (e) {
    return false;
  }
}

/** Detect underline from a DOM node (climbs up parents looking for data-ul or text-decoration style). */
function detectUnderlineFromNode(node, root) {
  if (typeof window === 'undefined' || !node) return 'none';
  try {
    let n = node;
    if (n.nodeType === 3) n = n.parentElement;
    while (n && n !== root) {
      if (n.getAttribute) {
        const du = n.getAttribute('data-ul');
        if (du === 'none') return 'none';
        if (du) return parseUnderline(du);
        const st = n.getAttribute('style') || '';
        if (/text-decoration/i.test(st) || /--rt-ul/i.test(st)) {
          const fromStyle = parseUnderlineFromCs(st);
          if (fromStyle !== 'none') return fromStyle;
        }
      }
      n = n.parentElement;
    }
  } catch (e) {}
  return 'none';
}

/** Remove strike (line-through) but preserve underline styles from all nested spans. */
function stripStrikeFromChildren(node) {
  if (!node) return;
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => n.tagName === 'SPAN' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });
  const spans = [];
  while (walker.nextNode()) spans.push(walker.currentNode);
  
  for (const span of spans) {
    const style = span.getAttribute('style') || '';
    const dataUl = span.getAttribute('data-ul') || '';
    // First, extract existing underline kind from this span
    let existingUl = 'none';
    const du = span.getAttribute('data-ul');
    if (du) existingUl = parseUnderline(du);
    else existingUl = parseUnderlineFromCs(style);
    
    // Clean text-decoration properties
    let cleaned = style
      .replace(/text-decoration(?:-line|-style|-thickness|-color)?\s*:[^;]+;?/gi, '')
      .replace(/--rt-ul\s*:[^;]+;?/gi, '')
      .replace(/;;+/g, ';')
      .replace(/^;|;\s*$/g, '')
      .trim();
    
    // Re-apply underline if there was one
    if (existingUl !== 'none') {
      const ulCss = underlineInlineCss(existingUl);
      cleaned = cleaned ? `${cleaned};${ulCss}` : ulCss;
      const newDataUl = underlineDataUl(existingUl);
      if (newDataUl) {
        span.setAttribute('data-ul', newDataUl);
      } else {
        span.removeAttribute('data-ul');
      }
    } else {
      span.removeAttribute('data-ul');
    }
    
    if (cleaned) {
      span.setAttribute('style', cleaned);
    } else {
      span.removeAttribute('style');
    }
  }
}

/** Remove the "line-through" token (and --rt-strike marker) from a style string while
 *  preserving any underline decoration that may share the declaration. */
function stripLineThroughFromStyle(style) {
  let s = String(style || '');
  s = s.replace(/--rt-strike\s*:[^;]+;?/gi, '');
  s = s
    .replace(/text-decoration-line\s*:\s*([^;]+);?/gi, (m, v) => {
      const rest = v.replace(/\bline-through\b/gi, '').replace(/\s+/g, ' ').trim();
      return rest ? `text-decoration-line:${rest};` : '';
    })
    .replace(/text-decoration\s*:\s*([^;]+);?/gi, (m, v) => {
      const rest = v.replace(/\bline-through\b/gi, '').replace(/\s+/g, ' ').trim();
      return rest ? `text-decoration:${rest};` : '';
    })
    .replace(/;;+/g, ';')
    .replace(/^;|;\s*$/g, '');
  return s;
}

/** Apply strikethrough to current selection; returns true if applied.
 *  Replaces any existing strike on the run (never stacks) while preserving underline.
 *  `root` is the editable node — used to collapse leftover inline strike on ancestors. */
export function applyStrikeToSelection(on, root) {
  if (typeof window === 'undefined') return false;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  try {
    // Detect current underline from anchor node (climbs to selection parents)
    const commonAncestor = range.commonAncestorContainer;
    const existingUl = detectUnderlineFromNode(sel.anchorNode, commonAncestor);
    const existingUlCs = underlineKindToCs(existingUl);

    // Extract contents first to avoid nested spans
    const contents = range.extractContents();
    if (contents.childNodes.length === 0) return false;

    // Strip old strike styles from any nested spans in the extracted content
    stripStrikeFromChildren(contents);

    // Create span with strikethrough + preserve existing underline style
    const span = document.createElement('span');
    span.setAttribute('style', strikeInlineCss(existingUlCs, on));
    // Preserve data-ul if there's an underline (especially dash-dot)
    const du = underlineDataUl(existingUl);
    if (du) span.setAttribute('data-ul', du);
    else span.removeAttribute('data-ul');

    // Append extracted content
    span.appendChild(contents);
    range.insertNode(span);

    // Remove any leftover strike on ancestor spans so we never double-draw
    if (root) {
      let n = span.parentElement;
      while (n && n !== root && n !== document.body) {
        if (n.nodeType === 1 && n.tagName === 'SPAN') {
          const st = n.getAttribute('style') || '';
          if (/line-through|--rt-strike/.test(st)) {
            const cleaned = stripLineThroughFromStyle(st);
            if (cleaned) n.setAttribute('style', cleaned);
            else n.removeAttribute('style');
          }
        }
        n = n.parentElement;
      }
    }

    // Restore selection inside the new span
    sel.removeAllRanges();
    const nr = document.createRange();
    nr.selectNodeContents(span);
    sel.addRange(nr);
    return true;
  } catch (e) {
    return false;
  }
}

/** If an element-level box underline/strike is active (via cs on .react-el-text wrapper)
 *  but the user is about to apply per-selection inline formatting, "materialize" the
 *  box-level formats into inline <span> wraps around the full editable contents, and
 *  clear them from the element-level cs. This prevents double-drawing: otherwise the
 *  wrapper's `textDecorationLine: underline` and the selection span's own underline
 *  are drawn independently and stack on top of each other.
 *
 *  Returns the new element-level cs (with the materialized formats stripped out), or
 *  null if nothing was materialized. */
export function materializeBoxFormatsToInline(editableRoot, cs) {
  if (typeof window === 'undefined' || !editableRoot) return null;

  const boxUl = parseUnderlineFromCs(cs);
  const boxStrike = hasStrikeInCs(cs);
  if (boxUl === 'none' && !boxStrike) return null;

  try {
    // --- Build the wrap that currently lives on the wrapper as inline CSS. ---
    let wrapperStyle = '';
    let wrapperDataUl = '';

    if (boxUl !== 'none') {
      wrapperStyle += underlineInlineCss(boxUl);
      wrapperDataUl = underlineDataUl(boxUl);
    }
    if (boxStrike) {
      const sCss = strikeInlineCss(underlineKindToCs(boxUl), true);
      wrapperStyle = wrapperStyle ? `${wrapperStyle}${sCss}` : sCss;
    }

    if (!wrapperStyle) return null;

    // --- Wrap every direct child of the editable in a span (preserving block order). ---
    // Walk a snapshot because we're mutating children during iteration.
    const kids = Array.from(editableRoot.childNodes);
    if (kids.length === 0) return null;

    // If root already has exactly one child and it's a plain <span> that already carries
    // the materialization, don't double-wrap (just merge attributes).
    const only = kids.length === 1 && kids[0].nodeType === 1 && kids[0].tagName === 'SPAN' ? kids[0] : null;
    if (only) {
      const prevStyle = only.getAttribute('style') || '';
      const prevDataUl = only.getAttribute('data-ul') || '';
      // Append our wrapper style *after* stripping any existing underline/strike from it
      // (because our new wrapper style is the combined, authoritative version).
      const cleaned = prevStyle
        .replace(/text-decoration(?:-line|-style|-thickness|-color)?\s*:[^;]+;?/gi, '')
        .replace(/text-underline-offset\s*:[^;]+;?/gi, '')
        .replace(/--rt-ul\s*:[^;]+;?/gi, '')
        .replace(/--rt-strike\s*:[^;]+;?/gi, '')
        .replace(/;;+/g, ';')
        .replace(/^;|;\s*$/g, '')
        .trim();
      only.setAttribute('style', cleaned ? `${cleaned};${wrapperStyle}` : wrapperStyle);
      const mergedUl = wrapperDataUl || prevDataUl;
      if (mergedUl) only.setAttribute('data-ul', mergedUl);
      else only.removeAttribute('data-ul');
    } else {
      for (const kid of kids) {
        const span = document.createElement('span');
        span.setAttribute('style', wrapperStyle);
        if (wrapperDataUl) span.setAttribute('data-ul', wrapperDataUl);
        span.appendChild(kid); // moves kid out of editableRoot into span
        editableRoot.appendChild(span);
      }
    }

    // --- Return the new cs: remove the materialized underline/strike from element-level. ---
    let next = stripUnderlineFromCs(cs);
    next = stripStrikeFromCs(next);
    return next;
  } catch (e) {
    return null;
  }
}
