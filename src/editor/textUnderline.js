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

/** CSS for dash-dot painted underline. The line is drawn via a background-image trick on
 *  inline `[data-ul="dash-dot"]` spans (real text-decoration stays "none"), so it hugs the
 *  text width and follows line breaks (box-decoration-break: clone). Whole-box dash-dot is
 *  materialized into such inline spans at render time (see dashDotWrapHtml), which is why
 *  only the inline selector is needed here — a block-level background would span the whole
 *  box instead of the text, and (unlike native text-decoration) can't hug short lines.
 *
 *  Vertical position matches the native single underline (text-underline-offset:0.12em):
 *  the painted line sits at ~0.88em + 0.12em from the em-box top, measured against Chrome's
 *  `auto` underline position for common serif/sans fonts (Georgia, Arial, Segoe UI…). */
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
`.trim();

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
    .replace(/text-decoration(?:-line|-style|-thickness|-color)?\s*:[^;]+;?/gi, '')
    .replace(/text-underline-offset\s*:[^;]+;?/gi, '')
    .replace(/--rt-ul\s*:[^;]+;?/gi, '')
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
  const m = /text-decoration(?:-line)?\s*:\s*([^;]+)/i.exec(s);
  if (!m) return 'none';
  const line = m[1].trim();
  if (/^none$/i.test(line)) return 'none';
  const styleM = /text-decoration-style\s*:\s*([^;]+)/i.exec(s);
  const combined = styleM ? `${line} ${styleM[1].trim()}` : line;
  return parseUnderline(combined);
}

export function applyUnderlineToCs(cs, kind) {
  let next = stripUnderlineFromCs(cs);
  const k = parseUnderline(kind);
  if (!k || k === 'none') return next;
  if (k === 'underline dash-dot') {
    return `${next}text-decoration:none;--rt-ul:dash-dot;`;
  }
  const thin =
    'text-decoration-thickness:1.25px;text-underline-offset:0.12em;text-decoration-skip-ink:none;';
  if (k === 'underline') return `${next}text-decoration:underline;${thin}`;
  if (k === 'underline double') return `${next}text-decoration:underline double;${thin}`;
  if (k === 'underline wavy') return `${next}text-decoration:underline wavy;${thin}`;
  if (k === 'underline dashed') {
    return `${next}text-decoration:underline dashed;text-decoration-thickness:1.25px;text-underline-offset:0.12em;text-decoration-skip-ink:none;`;
  }
  return next;
}

/** Inline CSS for a span (selection wrap). */
export function underlineInlineCss(kind) {
  const k = parseUnderline(kind);
  const thin =
    'text-decoration-thickness:1.25px;text-underline-offset:0.12em;text-decoration-skip-ink:none;';
  const clearBg =
    'background-image:none;background-size:auto;background-position:0 0;background-repeat:no-repeat;padding-bottom:0;';
  if (!k || k === 'none') return `text-decoration:none;${clearBg}`;
  if (k === 'underline') return `text-decoration:underline;${thin}${clearBg}`;
  if (k === 'underline double') return `text-decoration:underline double;${thin}${clearBg}`;
  if (k === 'underline wavy') return `text-decoration:underline wavy;${thin}${clearBg}`;
  if (k === 'underline dashed') {
    return `text-decoration:underline dashed;text-decoration-thickness:1.25px;text-underline-offset:0.12em;text-decoration-skip-ink:none;${clearBg}`;
  }
  if (k === 'underline dash-dot') return 'text-decoration:none;';
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

/** Wrap every non-whitespace text run of an HTML fragment in `<span data-ul="dash-dot">`.
 *  Used at render time for the whole-box dash-dot underline, so the painted line hugs the
 *  actual text width (and each wrapped line fragment) instead of spanning the whole block.
 *  Runs already inside any existing `data-ul` element are skipped, so repeated application
 *  is idempotent — e.g. after an edit commits innerHTML that still carries the wrappers. */
export function dashDotWrapHtml(html) {
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
          stack.push({ ul: /data-ul\s*=/.test(tag) });
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
      out += `<span data-ul="dash-dot">${text}</span>`;
    } else {
      out += text;
    }
  }
  return out;
}

/** React style + class for the text box from cs. */
export function underlineBoxProps(cs) {
  const kind = parseUnderlineFromCs(cs);
  const strike = hasStrikeInCs(cs);
  if (kind === 'none') {
    return strike
      ? { style: { textDecorationLine: 'line-through' }, className: '', kind }
      : { style: {}, className: '', kind };
  }
  if (kind === 'underline dash-dot') {
    // dash-dot underline is drawn via inline `[data-ul="dash-dot"]` spans (the box html is
    // wrapped by dashDotWrapHtml at render time), so real text-decoration stays "none" and
    // a plain line-through can be layered on top of it independently.
    return {
      style: strike ? { textDecorationLine: 'line-through' } : { textDecorationLine: 'none' },
      className: '',
      kind,
    };
  }
  const lineWord = { underline: 'underline', 'underline double': 'underline', 'underline wavy': 'underline', 'underline dashed': 'underline' };
  const styleWord = { underline: 'solid', 'underline double': 'double', 'underline wavy': 'wavy', 'underline dashed': 'dashed' };
  return {
    style: {
      // Longhand line/style instead of the `textDecoration` shorthand so a strikethrough line
      // can be added alongside the underline in one declaration (the shorthand can't combine
      // an extra line value in without clobbering the style keyword). When strike is also on,
      // both lines share the underline's style (double/wavy/dashed) — combining truly
      // independent styles per-line isn't supported by CSS text-decoration.
      textDecorationLine: strike ? `${lineWord[kind] || 'underline'} line-through` : lineWord[kind] || 'underline',
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
  if (kind === 'none') return 'text-decoration-line:line-through;';
  const lineWord = { underline: 'underline', 'underline double': 'underline', 'underline wavy': 'underline', 'underline dashed': 'underline' };
  const styleWord = { underline: 'solid', 'underline double': 'double', 'underline wavy': 'wavy', 'underline dashed': 'dashed' };
  if (kind === 'underline dash-dot') return 'text-decoration-line:line-through;';
  return `text-decoration-line:${lineWord[kind] || 'underline'} line-through;text-decoration-style:${styleWord[kind] || 'solid'};text-decoration-thickness:1.25px;text-underline-offset:0.12em;text-decoration-skip-ink:none;`;
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
      let n = sel.anchorNode;
      if (n.nodeType === 3) n = n.parentElement;
      while (n && n !== root) {
        if (n.getAttribute) {
          const du = n.getAttribute('data-ul');
          if (du) return parseUnderline(du);
          const st = n.getAttribute('style') || '';
          if (/text-decoration/i.test(st) || /--rt-ul/i.test(st)) {
            const fromStyle = parseUnderlineFromCs(st);
            if (fromStyle !== 'none') return fromStyle;
          }
        }
        n = n.parentElement;
      }
    }
  } catch (e) {}
  return parseUnderlineFromCs(fallbackCs);
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

/** Remove underline styles from all nested spans in a node, but preserve strike (line-through). */
function stripUnderlineFromChildren(node) {
  if (!node) return;
  // Process all child nodes
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => n.tagName === 'SPAN' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });
  const spans = [];
  while (walker.nextNode()) spans.push(walker.currentNode);
  
  for (const span of spans) {
    const style = span.getAttribute('style') || '';
    // First check if this span had strike
    const hadStrike = /line-through/i.test(style) || /--rt-strike\s*:\s*1/i.test(style);
    
    // Remove all text-decoration related properties
    let cleaned = style
      .replace(/text-decoration(?:-line|-style|-thickness|-color)?\s*:[^;]+;?/gi, '')
      .replace(/text-underline-offset\s*:[^;]+;?/gi, '')
      .replace(/--rt-ul\s*:[^;]+;?/gi, '')
      .replace(/;;+/g, ';')
      .replace(/^;|;\s*$/g, '')
      .trim();
    
    // Restore strike if it was there
    if (hadStrike) {
      cleaned = cleaned ? `${cleaned};text-decoration-line:line-through;` : 'text-decoration-line:line-through;';
    }
    
    if (cleaned) {
      span.setAttribute('style', cleaned);
    } else {
      span.removeAttribute('style');
    }
    span.removeAttribute('data-ul');
  }
}

/** Remove underline decorations from ancestor <span>s of `node` within `root`, so a freshly
 *  wrapped selection span doesn't stack a second line on top of leftover inline underlines. */
function stripUnderlineFromAncestors(node, root) {
  let n = node.parentElement;
  while (n && n !== root && n !== document.body) {
    if (n.nodeType === 1 && n.tagName === 'SPAN') {
      const st = n.getAttribute('style') || '';
      if (/text-decoration|--rt-ul/.test(st)) {
        const cleaned = st
          .replace(/text-decoration(?:-line|-style|-thickness|-color)?\s*:[^;]+;?/gi, '')
          .replace(/text-underline-offset\s*:[^;]+;?/gi, '')
          .replace(/--rt-ul\s*:[^;]+;?/gi, '')
          .replace(/;;+/g, ';')
          .replace(/^;|;\s*$/g, '')
          .trim();
        if (cleaned) n.setAttribute('style', cleaned);
        else n.removeAttribute('style');
        n.removeAttribute('data-ul');
      }
    }
    n = n.parentElement;
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
      // Combine underline with strike using strikeInlineCss logic with proper cs
      const tempCs = k === 'underline dash-dot' ? 'text-decoration:none;--rt-ul:dash-dot;'
        : k === 'none' ? ''
        : `text-decoration:${k};`;
      span.setAttribute('style', strikeInlineCss(tempCs, true));
    } else {
      span.setAttribute('style', underlineInlineCss(k));
    }
    const du = underlineDataUl(k);
    if (du) span.setAttribute('data-ul', du);
    else span.removeAttribute('data-ul');

    // Append extracted content
    span.appendChild(contents);
    range.insertNode(span);

    // Collapse any leftover inline underline on ancestors so we never stack lines
    if (root) stripUnderlineFromAncestors(span, root);

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

/** Detect underline from a DOM node (climbs up parents looking for data-ul or text-decoration style). */
function detectUnderlineFromNode(node, root) {
  if (typeof window === 'undefined' || !node) return 'none';
  try {
    let n = node;
    if (n.nodeType === 3) n = n.parentElement;
    while (n && n !== root) {
      if (n.getAttribute) {
        const du = n.getAttribute('data-ul');
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
    const existingUlCs = existingUl !== 'none'
      ? (existingUl === 'underline dash-dot' ? 'text-decoration:none;--rt-ul:dash-dot;' : `text-decoration:${existingUl};`)
      : '';

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
      // strikeInlineCss needs cs describing just the underline (it combines strike on top)
      const tempCs =
        boxUl === 'underline dash-dot'
          ? 'text-decoration:none;--rt-ul:dash-dot;'
          : boxUl !== 'none'
          ? `text-decoration:${boxUl};`
          : '';
      const sCss = strikeInlineCss(tempCs, true);
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
