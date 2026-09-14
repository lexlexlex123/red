/** Text underline cycle (legacy rtUnderline): none → single → double → wavy → dashed → dash-dot. */

export const TEXT_UL_CYCLE = [
  'underline',
  'underline double',
  'underline wavy',
  'underline dashed',
  'underline dash-dot',
  'none',
];

/** Text strikethrough cycle: none → single → double. */
export const TEXT_STRIKE_CYCLE = [
  'line-through',
  'line-through double',
  'none',
];

export const TEXT_STRIKE_TITLES_RU = {
  'line-through': 'одинарное',
  'line-through double': 'двойное',
  none: 'нет',
};

export const TEXT_STRIKE_TITLES_EN = {
  'line-through': 'single',
  'line-through double': 'double',
  none: 'none',
};

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

/** CSS for dash-dot painted underline (legacy `.ec [data-ul="dash-dot"]`). */
export const TEXT_UL_DASH_DOT_CSS = `
.react-el-text [data-ul="dash-dot"],
.react-text-ul-dash-dot > [contenteditable],
.react-text-ul-dash-dot > .react-text-body,
.el.react-text-ul-dash-dot,
.el [data-ul="dash-dot"]{
  text-decoration:none!important;
  -webkit-box-decoration-break:clone;
  box-decoration-break:clone;
  padding-bottom:0.28em!important;
  background-color:transparent!important;
  background-image:
    radial-gradient(circle 1.5px at 1.5px 50%,currentColor 99%,transparent 100%),
    repeating-linear-gradient(90deg,
      transparent 0,transparent 7px,
      currentColor 7px,currentColor 16px,
      transparent 16px,transparent 20px)!important;
  background-size:20px 3px,20px 1.25px!important;
  background-repeat:repeat-x,repeat-x!important;
  background-position:0 calc(1em + 0.12em + 2px),0 calc(1em + 0.12em + 2px + 0.875px)!important;
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

/** Strip ALL text-decoration properties from cs (both underline and line-through). */
export function stripAllTextDecoration(cs) {
  return String(cs || '')
    .replace(/text-decoration(?:-line|-style|-thickness|-color)?\s*:[^;]+;?/gi, '')
    .replace(/text-underline-offset\s*:[^;]+;?/gi, '')
    .replace(/--rt-ul\s*:[^;]+;?/gi, '')
    .replace(/;;+/g, ';')
    .replace(/^;|;$/g, '');
}

export function stripUnderlineFromCs(cs) {
  return stripAllTextDecoration(cs);
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

/** React style + class for the text box from cs. */
export function underlineBoxProps(cs) {
  const kind = parseUnderlineFromCs(cs);
  if (kind === 'none') return { style: {}, className: '', kind };
  if (kind === 'underline dash-dot') {
    return { style: { textDecoration: 'none' }, className: 'react-text-ul-dash-dot', kind };
  }
  const map = {
    underline: 'underline',
    'underline double': 'underline double',
    'underline wavy': 'underline wavy',
    'underline dashed': 'underline dashed',
  };
  return {
    style: {
      textDecoration: map[kind] || 'underline',
      textDecorationThickness: '1.25px',
      textUnderlineOffset: '0.12em',
      textDecorationSkipInk: 'none',
    },
    className: '',
    kind,
  };
}

export function underlineActive(cs) {
  return parseUnderlineFromCs(cs) !== 'none';
}

/** Parse strikethrough from cs. */
export function parseStrikeFromCs(cs) {
  const s = String(cs || '');
  // Check for line-through specifically
  const m = /text-decoration(?:-line)?\s*:\s*([^;]+)/i.exec(s);
  if (!m) return 'none';
  const line = m[1].trim();
  if (/^none$/i.test(line)) return 'none';
  if (/\bline-through\b/i.test(line)) {
    if (/\bdouble\b/i.test(line)) return 'line-through double';
    return 'line-through';
  }
  return 'none';
}

export function nextStrike(cur) {
  const i = TEXT_STRIKE_CYCLE.indexOf(cur);
  return TEXT_STRIKE_CYCLE[(i < 0 ? 0 : i + 1) % TEXT_STRIKE_CYCLE.length];
}

export function strikeTitle(kind, ru) {
  const map = ru ? TEXT_STRIKE_TITLES_RU : TEXT_STRIKE_TITLES_EN;
  return map[kind] || map.none;
}

export function strikeActive(cs) {
  return parseStrikeFromCs(cs) !== 'none';
}

export function applyStrikeToCs(cs, kind) {
  let next = stripAllTextDecoration(cs);
  const k = parseStrike(kind);
  if (!k || k === 'none') return next;
  const thin = 'text-decoration-thickness:1.25px;text-decoration-skip-ink:none;';
  if (k === 'line-through') return `${next}text-decoration:line-through;${thin}`;
  if (k === 'line-through double') return `${next}text-decoration:line-through double;${thin}`;
  return next;
}

export function stripStrikeFromCs(cs) {
  // Strikethrough uses same text-decoration property, so use full strip
  return stripAllTextDecoration(cs);
}

export function parseStrike(kind) {
  const d = String(kind || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!d || d === 'none') return 'none';
  if (d === 'single') return 'line-through';
  if (d === 'double') return 'line-through double';
  if (/\bline-through\b/.test(d)) {
    if (/\bdouble\b/.test(d)) return 'line-through double';
    return 'line-through';
  }
  return 'none';
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

/** Detect strikethrough from selection / editable node. */
export function detectStrikeFromEditable(root, fallbackCs) {
  if (typeof window === 'undefined' || !root) return parseStrikeFromCs(fallbackCs);
  try {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && root.contains(sel.anchorNode)) {
      let n = sel.anchorNode;
      if (n.nodeType === 3) n = n.parentElement;
      while (n && n !== root) {
        if (n.getAttribute) {
          const st = n.getAttribute('style') || '';
          if (/text-decoration/i.test(st)) {
            const fromStyle = parseStrikeFromCs(st);
            if (fromStyle !== 'none') return fromStyle;
          }
        }
        n = n.parentElement;
      }
    }
  } catch (e) {}
  return parseStrikeFromCs(fallbackCs);
}

/** Wrap current selection with underline style; returns true if applied. */
export function applyUnderlineToSelection(kind) {
  if (typeof window === 'undefined') return false;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  const k = parseUnderline(kind);
  try {
    // First: unwrap any existing underline spans in the selection
    const existing = range.cloneContents();
    const existingSpans = existing.querySelectorAll?.('span') || [];
    
    const span = document.createElement('span');
    span.setAttribute('style', underlineInlineCss(k));
    const du = underlineDataUl(k);
    if (du) span.setAttribute('data-ul', du);
    else span.removeAttribute('data-ul');
    if (k === 'none') {
      span.setAttribute('style', underlineInlineCss('none'));
      span.removeAttribute('data-ul');
    }
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);
    sel.removeAllRanges();
    const nr = document.createRange();
    nr.selectNodeContents(span);
    sel.addRange(nr);
    return true;
  } catch (e) {
    return false;
  }
}

/** Wrap current selection with strikethrough style; returns true if applied. */
export function applyStrikeToSelection(kind) {
  if (typeof window === 'undefined') return false;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  const k = parseStrike(kind);
  try {
    // First: unwrap any existing strikethrough spans in the selection
    const selNode = sel.anchorNode;
    if (selNode) {
      let n = selNode;
      if (n.nodeType === 3) n = n.parentElement;
      while (n && n.parentElement && n.parentElement !== selNode?.parentNode) {
        if (n.nodeType === 1 && n.getAttribute?.('style')) {
          const st = n.getAttribute('style') || '';
          if (/text-decoration/i.test(st)) {
            // Unwrap this node
            const parent = n.parentElement;
            while (n.firstChild) {
              parent.insertBefore(n.firstChild, n);
            }
            parent.removeChild(n);
            break;
          }
        }
        n = n.parentElement;
      }
    }
    
    const span = document.createElement('span');
    const thin = 'text-decoration-thickness:1.25px;text-decoration-skip-ink:none;';
    let strikeStyle = '';
    if (k === 'line-through') {
      strikeStyle = `text-decoration:line-through;${thin}`;
    } else if (k === 'line-through double') {
      strikeStyle = `text-decoration:line-through double;${thin}`;
    } else {
      strikeStyle = 'text-decoration:none;';
    }
    span.setAttribute('style', strikeStyle);
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);
    sel.removeAllRanges();
    const nr = document.createRange();
    nr.selectNodeContents(span);
    sel.addRange(nr);
    return true;
  } catch (e) {
    return false;
  }
}
