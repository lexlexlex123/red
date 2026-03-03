// ══════════════ RICH TEXT ENGINE v2 ══════════════
// Key insight: when user clicks a panel button, focus leaves contenteditable.
// We save the Range on BLUR (before focus leaves), restore it on format action.

let _rtRange = null;    // cloned Range saved on blur/selectionchange
let _rtEl = null;       // the contenteditable .tel element
let _rtElId = null;     // parent .el dataset.id

// ── Panel mousedown: save selection BEFORE focus moves to panel ──
// Called from onmousedown on #tprops
function _rtOnPanelMousedown(e) {
  // Save selection right now (before the click causes blur)
  const s = window.getSelection();
  if (s && s.rangeCount > 0 && _rtEl) {
    const r = s.getRangeAt(0);
    if (_rtEl.contains(r.commonAncestorContainer)) {
      _rtRange = r.cloneRange();
    }
  }
  // For buttons/selects that would steal focus: we DON'T prevent default here
  // because color inputs etc need it. The range is saved above.
}

// ── Attach tracking to each text element (called from mkEl) ──
function rtAttachSelectionTracking(wrapEl, telEl) {
  const id = wrapEl.dataset.id;
  const save_ = () => {
    const s = window.getSelection();
    if (s && s.rangeCount > 0) {
      const r = s.getRangeAt(0);
      if (telEl.contains(r.commonAncestorContainer)) {
        _rtRange = r.cloneRange();
        _rtEl = telEl;
        _rtElId = id;
      }
    }
    rtUpdateToolbarState();
  };
  telEl.addEventListener('mouseup',   save_);
  telEl.addEventListener('keyup',     save_);
  // Critical: save on blur so range is available when panel button gets focus
  telEl.addEventListener('blur',      save_);
}

// Global selectionchange tracks any selection in contenteditable
document.addEventListener('selectionchange', () => {
  const s = window.getSelection();
  if (!s || s.rangeCount === 0) return;
  const r = s.getRangeAt(0);
  const anc = r.commonAncestorContainer;
  const el2 = anc.nodeType === 3 ? anc.parentElement : anc;
  const editable = el2 && el2.closest('[contenteditable="true"]');
  if (editable) {
    _rtEl = editable;
    const parentEl = editable.closest('.el');
    if (parentEl) _rtElId = parentEl.dataset.id;
    _rtRange = r.cloneRange();
    rtUpdateToolbarState();
  }
});

// ── Restore saved range into element ──
// Returns true if selection is non-collapsed (real text selected)
function _rtRestore() {
  if (!_rtEl || !_rtRange) return false;
  _rtEl.contentEditable = 'true';
  _rtEl.focus();
  try {
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(_rtRange);
    return !s.isCollapsed;
  } catch(e) { return false; }
}

// ── Commit innerHTML back to slide data ──
function _rtCommit() {
  if (!_rtEl || !_rtElId) return;
  // Normalize <font color="..."> → <span style="color:..."> (execCommand inserts font tags)
  _rtEl.querySelectorAll('font[color]').forEach(font => {
    const span = document.createElement('span');
    span.style.cssText = 'display:inline;color:' + font.getAttribute('color');
    while (font.firstChild) span.appendChild(font.firstChild);
    font.parentNode.replaceChild(span, font);
  });
  // Normalize <b>, <i>, <u> from execCommand → inline spans
  _rtEl.querySelectorAll('b,strong').forEach(b => {
    const span = document.createElement('span');
    span.style.cssText = 'display:inline;font-weight:700';
    while (b.firstChild) span.appendChild(b.firstChild);
    b.parentNode.replaceChild(span, b);
  });
  _rtEl.querySelectorAll('i,em').forEach(b => {
    const span = document.createElement('span');
    span.style.cssText = 'display:inline;font-style:italic';
    while (b.firstChild) span.appendChild(b.firstChild);
    b.parentNode.replaceChild(span, b);
  });
  _rtEl.querySelectorAll('u').forEach(b => {
    const span = document.createElement('span');
    span.style.cssText = 'display:inline;text-decoration:underline';
    while (b.firstChild) span.appendChild(b.firstChild);
    b.parentNode.replaceChild(span, b);
  });
  // Ensure all spans are inline
  _rtEl.querySelectorAll('span').forEach(sp => {
    if (!sp.style.display) sp.style.display = 'inline';
  });
  // sup/sub are fine inline by default, skip
  const d = slides[cur].els.find(e => e.id === _rtElId);
  if (d) {
    // Strip newlines that browsers insert around inline elements — they render as spaces/breaks
    let html = _rtEl.innerHTML;
    html = html.replace(/>\n+</g, '><').replace(/^\n+|\n+$/g, '');
    d.html = html;
    save(); drawThumbs(); saveState();
  }
  // re-save range after DOM mutation
  const s = window.getSelection();
  if (s && s.rangeCount > 0) _rtRange = s.getRangeAt(0).cloneRange();
}

// ── Wrap selection in <span style="prop:val"> ──
// Returns true if a non-collapsed selection was wrapped
function _rtSpanWrap(prop, val) {
  if (!_rtRestore()) return false;
  const s = window.getSelection();
  if (!s || s.rangeCount === 0 || s.isCollapsed) return false;
  const range = s.getRangeAt(0);
  const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const span = document.createElement('span');
  span.style.display = 'inline';
  span.style[camel] = val;
  try {
    range.surroundContents(span);
  } catch(e) {
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }
  // Remove empty text nodes adjacent to span that cause phantom line breaks
  const parent = span.parentNode;
  if (parent) {
    [...parent.childNodes].forEach(node => {
      if (node.nodeType === 3 && node !== span && node.textContent === '')
        parent.removeChild(node);
    });
  }
  // reselect the wrapped span
  const nr = document.createRange();
  nr.selectNodeContents(span);
  s.removeAllRanges();
  s.addRange(nr);
  _rtRange = nr.cloneRange();
  return true;
}

// ── Apply style to whole .ec element ──
function _setTSWhole(prop, val) {
  if (!sel || sel.dataset.type !== 'text') return;
  debouncedPushUndo();
  const c = sel.querySelector('.ec'); if (!c) return;
  let cs = c.getAttribute('style') || '';
  const re = new RegExp(prop + '\\s*:[^;]+;?', 'i');
  cs = re.test(cs) ? cs.replace(re, prop + ':' + val + ';') : cs + prop + ':' + val + ';';
  c.setAttribute('style', cs);
  save(); drawThumbs(); syncProps();
}

// ══ PUBLIC FORMAT FUNCTIONS ══

function rtBold() {
  const hasSel = _rtRestore();
  if (hasSel) {
    document.execCommand('bold');
    _rtCommit();
  } else {
    if (!sel || sel.dataset.type !== 'text') return;
    const c = sel.querySelector('.ec'); const cs = c.getAttribute('style') || '';
    _setTSWhole('font-weight', /font-weight:(700|800|900)/.test(cs) ? '400' : '700');
  }
  rtUpdateToolbarState();
}

function rtItalic() {
  const hasSel = _rtRestore();
  if (hasSel) {
    document.execCommand('italic');
    _rtCommit();
  } else {
    if (!sel || sel.dataset.type !== 'text') return;
    const c = sel.querySelector('.ec'); const cs = c.getAttribute('style') || '';
    _setTSWhole('font-style', cs.includes('font-style:italic') ? 'normal' : 'italic');
  }
  rtUpdateToolbarState();
}

function rtUnderline() {
  const hasSel = _rtRestore();
  if (hasSel) {
    document.execCommand('underline');
    _rtCommit();
  } else {
    if (!sel || sel.dataset.type !== 'text') return;
    const c = sel.querySelector('.ec'); const cs = c.getAttribute('style') || '';
    _setTSWhole('text-decoration', cs.includes('text-decoration:underline') ? 'none' : 'underline');
  }
  rtUpdateToolbarState();
}

function rtSuperscript() {
  const hasSel = _rtRestore();
  if (hasSel) {
    document.execCommand('superscript');
    _rtCommit();
  }
  rtUpdateToolbarState();
}

function rtSubscript() {
  const hasSel = _rtRestore();
  if (hasSel) {
    document.execCommand('subscript');
    _rtCommit();
  }
  rtUpdateToolbarState();
}

function rtColor(color) {
  const hasSel = _rtRestore();
  if (hasSel) {
    document.execCommand('foreColor', false, color);
    _rtCommit();
  } else {
    if (!sel || sel.dataset.type !== 'text') return;
    const ec2 = sel.querySelector('.ec');
    // Clear inner span colors so container wins
    ec2.querySelectorAll('[style]').forEach(el => {
      let st = el.getAttribute('style');
      st = st.replace(/color\s*:[^;]+;?/gi, '').trim();
      if (st) el.setAttribute('style', st); else el.removeAttribute('style');
    });
    _setTSWhole('color', color);
  }
  try { document.getElementById('p-col').value = color; document.getElementById('p-hex').value = color; } catch(e) {}
}

function rtFontSize(size) {
  if (!size || size < 1) return;
  if (_rtSpanWrap('font-size', size + 'px')) {
    _rtCommit();
  } else {
    _setTSWhole('font-size', size + 'px');
  }
}

function rtFontWeight(weight) {
  if (_rtSpanWrap('font-weight', weight)) {
    _rtCommit();
  } else {
    _setTSWhole('font-weight', weight);
  }
}

// ══ OVERRIDE existing global functions ══

function toggleFmt(fmt) {
  if      (fmt === 'bold')      rtBold();
  else if (fmt === 'italic')    rtItalic();
  else if (fmt === 'underline') rtUnderline();
}

// setTS: always-whole props go whole, visual props try selection first
function setTS(prop, val) {
  if (!sel || sel.dataset.type !== 'text') return;
  const alwaysWhole = ['text-align', 'line-height', 'letter-spacing', 'text-transform'];
  if (alwaysWhole.includes(prop)) {
    _setTSWhole(prop, val);
    return;
  }
  if (_rtSpanWrap(prop, val)) {
    _rtCommit();
  } else {
    _setTSWhole(prop, val);
  }
}

function onColorPick(v, mode) {
  if (mode === 'text') rtColor(v);
  else if (mode === 'fill') applyFillColor(v);
}

function onColorHex(v, mode) {
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
  if (mode === 'text') { rtColor(v); try { document.getElementById('p-col').value = v; } catch(e) {} }
  else if (mode === 'fill') applyFillColor(v);
}

// ══ Toolbar state: reflect formatting at cursor/selection ══
function rtUpdateToolbarState() {
  try {
    const hint = document.getElementById('sel-hint');
    const s = window.getSelection();
    const hasSel = s && s.rangeCount > 0 && !s.isCollapsed;
    if (hint) hint.style.display = hasSel ? 'inline' : 'none';

    let el2 = null;
    if (s && s.rangeCount > 0) {
      const anc = s.getRangeAt(0).commonAncestorContainer;
      el2 = anc.nodeType === 3 ? anc.parentElement : anc;
    }
    if (!el2) return;
    const cs = window.getComputedStyle(el2);

    const setOn = (id, on) => { const b = document.getElementById(id); if (b) b.classList.toggle('on', !!on); };
    setOn('ft-b',   parseInt(cs.fontWeight) >= 600);
    setOn('ft-i',   cs.fontStyle === 'italic');
    setOn('ft-u',   cs.textDecoration.includes('underline'));
    setOn('ft-sup', !!(el2.closest('sup') || el2.tagName === 'SUP'));
    setOn('ft-sub', !!(el2.closest('sub') || el2.tagName === 'SUB'));

    if (hasSel) {
      const hex = _rgbToHex(cs.color);
      if (hex) try { document.getElementById('p-col').value = hex; document.getElementById('p-hex').value = hex; } catch(e) {}
      const fs = parseFloat(cs.fontSize);
      if (fs) try { document.getElementById('p-fs').value = Math.round(fs); } catch(e) {}
      const fw = parseInt(cs.fontWeight) || 400;
      try {
        const fw2 = document.getElementById('p-fw');
        if (fw2) {
          const opts = [...fw2.options].map(o => +o.value);
          fw2.value = opts.reduce((a, b) => Math.abs(b - fw) < Math.abs(a - fw) ? b : a);
        }
      } catch(e) {}
    }
  } catch(e) {}
}

function _rgbToHex(rgb) {
  if (!rgb) return null;
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return null;
  return '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('');
}
