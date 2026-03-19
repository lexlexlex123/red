// ══════════════ RICH TEXT ENGINE v3 ══════════════

let _rtEl        = null;
let _rtColorPickInProgress = false;
let _rtElId      = null;
let _savedSelIdx = null;

// ─── HTML ↔ char-objects ──────────────────────────────────────────
// Rebuild a list marker span from saved data attributes
// (avoids relying on outerHTML which Chrome corrupts when contenteditable=true)
function _rebuildMarkerHtml(m) {
  if (m.type === 'bullet') {
    const svg = _getBulletSvg(m.iconId, _lastBulletFontSize || 24, m.iconStyle, m.iconColor, parseFloat(m.iconSw) || 1.8);
    const schemeAttr = m.iconSchemeRef ? ` data-icon-schemeref="${JSON.stringify(m.iconSchemeRef).replace(/"/g,'&quot;')}"` : '';
    return `<span data-list-bullet data-icon-id="${m.iconId}" data-icon-style="${m.iconStyle}" data-icon-color="${m.iconColor}" data-icon-sw="${m.iconSw}"${schemeAttr} contenteditable="false" style="display:inline-flex;align-items:center;margin-right:10px;cursor:pointer;user-select:none;vertical-align:-0.15em" onclick="rtChangeBulletIcon(this)">${svg}</span>`;
  } else {
    return `<span data-list-num contenteditable="false" style="display:inline-block;margin-right:10px;min-width:1.2em;font-variant-numeric:tabular-nums;user-select:none;vertical-align:-0.1em">${m.text}</span>`;
  }
}
let _lastBulletFontSize = 24;

function _toCharObjs(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const out = [];
  // Block-level tags that represent line breaks
  const _block = new Set(['div','p','li','tr','h1','h2','h3','h4','h5','h6']);
  function walk(node, inh, isFirstChild) {
    if (node.nodeType === 3) {
      for (const ch of node.textContent)
        out.push({ ch, style: Object.assign({}, inh) });
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') { out.push({ ch: '\n', style: Object.assign({}, inh) }); return; }
    // Skip caret anchor spans inserted by _interceptEnter (invisible zero-width space)
    if (node.hasAttribute('data-br-anchor')) return;
    // Preserve list markers as opaque data — do NOT walk into them
    // Note: we save attributes, NOT outerHTML, because Chrome strips contenteditable="false"
    // from outerHTML of child elements when parent has contenteditable="true"
    if (node.hasAttribute('data-list-bullet')) {
      const iconSchemeRef = node.getAttribute('data-icon-schemeref');
      out.push({ ch: '\x00', _listMarker: {
        type: 'bullet',
        iconId:    node.getAttribute('data-icon-id') || '',
        iconStyle: node.getAttribute('data-icon-style') || 'stroke',
        iconColor: node.getAttribute('data-icon-color') || 'currentColor',
        iconSw:    node.getAttribute('data-icon-sw') || '1.8',
        iconSchemeRef: iconSchemeRef ? (() => { try { return JSON.parse(iconSchemeRef); } catch(e) { return null; } })() : null,
      }, style: {} });
      return;
    }
    if (node.hasAttribute('data-list-num')) {
      out.push({ ch: '\x00', _listMarker: {
        type: 'num',
        text: node.textContent || '',
      }, style: {} });
      return;
    }
    const m = Object.assign({}, inh);
    const raw = node.getAttribute('style') || '';
    raw.split(';').forEach(part => {
      const ci = part.indexOf(':');
      if (ci < 0) return;
      let k = part.slice(0, ci).trim();
      const v = part.slice(ci + 1).trim();
      if (!k || !v || k === 'display') return;
      k = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      m[k] = v;
    });
    if (tag==='b'||tag==='strong') m.fontWeight='700';
    if (tag==='i'||tag==='em')     m.fontStyle='italic';
    if (tag==='u')                 m.textDecoration='underline';
    if (tag==='sup')               m.verticalAlign='super';
    if (tag==='sub')               m.verticalAlign='sub';
    // Restore per-char schemeRef from data-scheme attribute
    if(node.dataset && node.dataset.scheme){
      try{ m._schemeRef=JSON.parse(node.dataset.scheme); }catch(e){}
    } else {
      delete m._schemeRef;
    }
    // Block elements: inject leading \n (except for first/only child)
    const isBlock = _block.has(tag);
    if (isBlock && !isFirstChild && out.length && out[out.length-1].ch !== '\n') {
      out.push({ ch: '\n', style: Object.assign({}, inh) });
    }
    const children = Array.from(node.childNodes);
    children.forEach((child, ci2) => walk(child, m, ci2 === 0));
    // After block: trailing \n only if next sibling exists and last char isn't already \n
    // (handled by next sibling's leading \n above)
  }
  Array.from(tmp.childNodes).forEach((child, ci2) => walk(child, {}, ci2 === 0));
  return out;
}

function _charObjsToHtml(chars) {
  return chars.map(({ ch, style, _listMarker }) => {
    if (_listMarker) return _rebuildMarkerHtml(_listMarker);
    if (ch === '\n') return '<br>';
    const schemeRef = style._schemeRef;
    const css = Object.entries(style)
      .filter(([k]) => k !== 'display' && k !== '_schemeRef')
      .map(([k, v]) => k.replace(/([A-Z])/g, '-$1').toLowerCase() + ':' + v)
      .join(';');
    const esc = ch.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const schemeAttr = schemeRef ? ` data-scheme='${JSON.stringify(schemeRef)}'` : '';
    return `<span data-ch${schemeAttr} style="display:inline${css?';'+css:''}">${esc}</span>`;
  }).join('');
}

function _groupedHtml(chars) {
  const groups = [];
  let cur = null;
  for (const c of chars) {
    if (c._listMarker) { groups.push({ markerData: c._listMarker }); cur = null; continue; }
    if (c.ch === '\n') { groups.push({ br: true }); cur = null; continue; }
    const key = JSON.stringify(c.style);
    if (!cur || cur.key !== key) { cur = { key, style: c.style, text: c.ch }; groups.push(cur); }
    else cur.text += c.ch;
  }
  return groups.map(g => {
    if (g.markerData) return _rebuildMarkerHtml(g.markerData);
    if (g.br) return '<br>';
    const schemeRef = g.style._schemeRef;
    const css = Object.entries(g.style)
      .filter(([k]) => k !== 'display' && k !== '_schemeRef')
      .map(([k, v]) => k.replace(/([A-Z])/g, '-$1').toLowerCase() + ':' + v)
      .join(';');
    const esc = g.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const schemeAttr = schemeRef ? ` data-scheme='${JSON.stringify(schemeRef)}'` : '';
    return css ? `<span${schemeAttr} style="display:inline;${css}">${esc}</span>` : esc;
  }).join('');
}

function rtMigrateHtml(html) {
  if (!html) return '';
  // Always run through _toCharObjs/_charObjsToHtml to rebuild list marker SVGs
  // (they may have been stripped during saveState to reduce localStorage size)
  if (html.includes('data-ch')) {
    // Already in char format — only re-process if markers have empty innerHTML
    if (html.includes('data-list-bullet') || html.includes('data-list-num')) {
      return _charObjsToHtml(_toCharObjs(html));
    }
    return html;
  }
  return _charObjsToHtml(_toCharObjs(html));
}

// ─── Edit / Save mode ─────────────────────────────────────────────
function _rtContent(el) {
  // If valign wrapper present, operate inside it; otherwise use el directly
  return el.querySelector('.ec-valign-wrap') || el;
}

function _toEditMode(el) {
  const root = _rtContent(el);
  if (!root.querySelector('span[data-ch]')) return;
  root.innerHTML = _groupedHtml(_toCharObjs(root.innerHTML));
}

function _toSaveMode(el) {
  const root = _rtContent(el);
  // Track current font size so _rebuildMarkerHtml uses correct size
  const cs = el.getAttribute('style') || '';
  const fsMatch = cs.match(/font-size:\s*([\d.]+)px/);
  if (fsMatch) _lastBulletFontSize = parseFloat(fsMatch[1]);
  // Always re-serialize to canonical br-based HTML
  root.innerHTML = _charObjsToHtml(_toCharObjs(root.innerHTML));
}

// ─── Normalize contenteditable Enter → <br> ───────────────────────
function _interceptEnter(e) {
  // ── Backspace at start of list line: remove marker, keep text on same line ──
  if (e.key === 'Backspace') {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (!r.collapsed) return;

    const node = r.startContainer;
    const offset = r.startOffset;

    function isMarker(n) {
      return n && n.nodeType === 1 &&
        (n.hasAttribute('data-list-bullet') || n.hasAttribute('data-list-num'));
    }

    // Walk up from cursor to contenteditable root.
    // At each level: if we are at the very start (offset 0),
    // check the previous sibling — if it's a marker, remove it.
    // "At start" means: text node at offset 0, OR element node at child-index 0.
    let cur = node;
    let curOffset = offset;
    let markerSpan = null;

    while (cur) {
      // Stop at the contenteditable root itself
      if (cur.nodeType === 1 && cur.getAttribute && cur.getAttribute('contenteditable')) break;

      const atStart = curOffset === 0;
      if (!atStart) break;

      // Find previous meaningful sibling (skip br-anchors)
      let prev = cur.previousSibling;
      while (prev && prev.nodeType === 1 && prev.getAttribute && prev.getAttribute('data-br-anchor')) {
        prev = prev.previousSibling;
      }

      if (isMarker(prev)) { markerSpan = prev; break; }
      if (prev) break; // non-marker sibling exists — not at list-line start

      // No previous sibling — go up
      const parent = cur.parentElement;
      if (!parent) break;
      curOffset = Array.from(parent.childNodes).indexOf(cur);
      cur = parent;
    }

    if (markerSpan) {
      e.preventDefault();
      markerSpan.remove();
      clearTimeout(_enterCommitTimer);
      _enterCommitTimer = setTimeout(_rtCommit, 80);
      return;
    }
    return; // not at marker — browser handles normally
  }

    if (e.key !== 'Enter' || e.shiftKey) return;
  e.preventDefault();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const r = sel.getRangeAt(0);
  r.deleteContents();

  const br = document.createElement('br');
  r.insertNode(br);

  // Check if br is at the very end (no meaningful content after it)
  let next = br.nextSibling;
  while (next && next.nodeType === 3 && next.textContent === '') next = next.nextSibling;
  const atEnd = !next;

  const r2 = document.createRange();
  if (atEnd) {
    // Browser won't render cursor on a new line unless there's content or a second br after.
    // Insert a zero-width caret anchor span that looks invisible but gives cursor a position.
    // It has data-ch so _toCharObjs ignores it as an empty char (zero-width space gets filtered).
    const anchor = document.createElement('span');
    anchor.setAttribute('data-ch', '');
    anchor.setAttribute('data-br-anchor', '1');
    anchor.style.cssText = 'display:inline;';
    anchor.textContent = '\u200B';
    br.parentNode.insertBefore(anchor, br.nextSibling);
    r2.setStart(anchor.firstChild, 1);
  } else {
    r2.setStartAfter(br);
  }
  r2.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r2);

  clearTimeout(_enterCommitTimer);
  _enterCommitTimer = setTimeout(_rtCommit, 80);
}
let _enterCommitTimer = null;

// ─── Selection: char-index based ──────────────────────────────────
function _charOffset(targetNode, targetOffset, root) {
  let count = 0;
  function walk(node) {
    if (node === targetNode && node.nodeType === 3) { count += targetOffset; return true; }
    if (node.nodeType === 3) { count += node.textContent.length; return false; }
    if (node.nodeType === 1) {
      if (node.tagName === 'BR') { if (node === targetNode) return true; count += 1; return false; }
      // List markers are stored as single \x00 char in _toCharObjs — count as 1
      if (node.hasAttribute && (node.hasAttribute('data-list-bullet') || node.hasAttribute('data-list-num'))) {
        if (node === targetNode) return true;
        count += 1; return false;
      }
      // br-anchor spans are skipped by _toCharObjs — skip here too
      if (node.hasAttribute && node.hasAttribute('data-br-anchor')) return false;
      for (const child of node.childNodes) { if (walk(child)) return true; }
    }
    return false;
  }
  for (const child of root.childNodes) { if (walk(child)) break; }
  return count;
}

function _readSelFromDOM(el) {
  const s = window.getSelection();
  if (!s || s.rangeCount === 0 || s.isCollapsed) return null;
  const r = s.getRangeAt(0);
  if (!el.contains(r.commonAncestorContainer)) return null;
  const start = _charOffset(r.startContainer, r.startOffset, el);
  const end   = _charOffset(r.endContainer,   r.endOffset,   el);
  return start < end ? { start, end } : null;
}

function _restoreSelToDOM(idx, el) {
  if (!idx || !el) return;
  let startNode=null, startOff=0, endNode=null, endOff=0;
  let count = 0;
  function walk(node) {
    if (node.nodeType === 3) {
      const len = node.textContent.length;
      if (!startNode && count + len > idx.start) { startNode=node; startOff=idx.start-count; }
      if (!endNode   && count + len >= idx.end)  { endNode=node;   endOff=idx.end-count; return true; }
      count += len; return false;
    }
    if (node.nodeType === 1) {
      if (node.tagName === 'BR') { count += 1; return false; }
      // List markers count as 1 char — skip internals
      if (node.hasAttribute && (node.hasAttribute('data-list-bullet') || node.hasAttribute('data-list-num'))) {
        count += 1; return false;
      }
      // br-anchor spans are invisible — skip
      if (node.hasAttribute && node.hasAttribute('data-br-anchor')) return false;
      for (const child of node.childNodes) { if (walk(child)) return true; }
    }
    return false;
  }
  for (const child of el.childNodes) { if (walk(child)) break; }
  if (!startNode || !endNode) return;
  try {
    const r = document.createRange();
    r.setStart(startNode, startOff);
    r.setEnd(endNode, endOff);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  } catch(e) {}
}

// ─── Panel mousedown ──────────────────────────────────────────────
function _rtOnPanelMousedown(e) {
  // Called on mousedown — selection still exists at this point
  // Save it so rtColor can use it even after the click removes the selection
  if (!_rtEl) return;
  const live = _readSelFromDOM(_rtEl);
  if (live) _savedSelIdx = live;
  // Don't clear here — only clear when we know it's a whole-element operation
}

// ─── Attach ───────────────────────────────────────────────────────
function rtAttachSelectionTracking(wrapEl, telEl) {
  const id = wrapEl.dataset.id;

  telEl.addEventListener('focus', () => {
    // Only clear saved selection when switching to a different text element
    if (_rtElId && _rtElId !== id) _savedSelIdx = null;
    _rtEl = telEl; _rtElId = id;
    // No mode conversion needed — edit directly in place
  });

  telEl.addEventListener('keydown', _interceptEnter);

  telEl.addEventListener('blur', () => {
    // _toSaveMode is called by 13-images.js blur handler which fires first
    if (!_rtColorPickInProgress) _rtCommit();
  });

  telEl.addEventListener('mouseup', rtUpdateToolbarState);
  telEl.addEventListener('keyup',   rtUpdateToolbarState);
}

document.addEventListener('selectionchange', () => {
  const s = window.getSelection();
  if (!s || s.rangeCount === 0) return;
  const anc = s.getRangeAt(0).commonAncestorContainer;
  const el2 = anc.nodeType === 3 ? anc.parentElement : anc;
  // Track selection inside .tel regardless of contentEditable state
  const telEl = el2 && el2.closest('.tel');
  if (telEl) {
    const p = telEl.closest('.el');
    const newId = p ? p.dataset.id : null;
    // Clear saved selection when switching to a different element
    if (_rtElId && newId && _rtElId !== newId) _savedSelIdx = null;
    _rtEl = telEl;
    if (p) _rtElId = p.dataset.id;
    const idx = _readSelFromDOM(telEl);
    if (idx) _savedSelIdx = idx;
    if (typeof rtUpdateToolbarState === 'function') rtUpdateToolbarState();
  }
});

// ─── Commit ───────────────────────────────────────────────────────
function _rtCommit() {
  if (!_rtEl || !_rtElId) return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === _rtElId);
  if (d) {
    // Try to get pre-normalization HTML from dataset (set by 13-images blur before contentEditable=false)
    const wrapEl = _rtEl.closest('.el');
    const savedHtml = wrapEl && wrapEl.dataset._savedHtml;
    if (savedHtml != null) {
      d.html = savedHtml;
    } else {
      const vw = _rtEl.querySelector('.ec-valign-wrap');
      d.html = vw ? vw.innerHTML : _rtEl.innerHTML;
    }
    if (typeof drawThumbs === 'function') drawThumbs();
    if (typeof saveState === 'function') saveState();
  }
}

// ─── Apply style to selection ─────────────────────────────────────
function _applyToSelection(prop, val) {
  if (!_rtEl) return false;
  const root = _rtContent(_rtEl);
  let idx = _readSelFromDOM(root);
  if (!idx) idx = _savedSelIdx;
  if (!idx) return false;

  const chars = _toCharObjs(root.innerHTML);
  if (!chars.length || idx.start >= chars.length) return false;
  const end = Math.min(idx.end, chars.length);
  const selected = chars.slice(idx.start, end);
  if (!selected.length) return false;

  const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  if (prop === 'font-weight') {
    const allBold = selected.every(c => parseInt(c.style.fontWeight||'400') >= 600);
    selected.forEach(c => { c.style.fontWeight = allBold ? '400' : val; });
  } else if (prop === 'font-style') {
    const allItalic = selected.every(c => c.style.fontStyle === 'italic');
    selected.forEach(c => { c.style.fontStyle = allItalic ? 'normal' : 'italic'; });
  } else if (prop === 'text-decoration') {
    const allUnder = selected.every(c => (c.style.textDecoration||'').includes('underline'));
    selected.forEach(c => { c.style.textDecoration = allUnder ? 'none' : 'underline'; });
  } else {
    selected.forEach(c => {
      c.style[camel] = val;
    });
    // Store schemeRef on color chars so applyTheme can remap them
    if (camel === 'color') {
      const sr = _applyToSelection._schemeRef;
      selected.forEach(c => {
        if (sr) c.style._schemeRef = sr;
        else delete c.style._schemeRef;
      });
    }
  }

  const inEditMode = !root.querySelector('span[data-ch]');
  const newHtml = inEditMode ? _groupedHtml(chars) : _charObjsToHtml(chars);
  root.innerHTML = newHtml;
  _restoreSelToDOM(idx, root);
  _savedSelIdx = idx;
  return true;
}

// ─── Whole-element style ──────────────────────────────────────────
function _setTSWhole(prop, val, skipHtmlSync) {
  if (!sel || sel.dataset.type !== 'text') return;
  debouncedPushUndo();
  const c = sel.querySelector('.ec'); if (!c) return;
  let cs = c.getAttribute('style') || '';
  // Don't overwrite padding-top (managed by applyTextVAlign)
  if (prop === 'padding-top') return;
  const re = new RegExp(prop + '\\s*:[^;]+;?', 'i');
  cs = re.test(cs) ? cs.replace(re, prop+':'+val+';') : cs+prop+':'+val+';';
  c.setAttribute('style', cs);
  // Recalculate valign padding if font-size changed (text height changes)
  if(prop==='font-size'&&sel.dataset.valign&&typeof applyTextVAlign==='function'){
    requestAnimationFrame(()=>applyTextVAlign(sel,sel.dataset.valign));
  }
  // Sync prop into d.html char-objects so the value survives preview round-trip.
  // Skip when called after a partial selection apply (rtColor with selection)
  // to avoid overwriting per-character colors.
  if (!skipHtmlSync) {
    if (prop === 'color') {
      // When setting color on the whole block, strip per-char colors so
      // container color takes effect uniformly (no stale per-char overrides).
      _clearCharColors();
    } else {
      _syncPropToHtml(prop, val);
    }
  }
  save(); saveState(); drawThumbs(); syncProps();
}

// Strip explicit color from every char-span so the container .ec color takes over.
function _clearCharColors() {
  if (!sel || sel.dataset.type !== 'text') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  const c = sel.querySelector('.ec'); if (!c) return;
  const chars = _toCharObjs(c.innerHTML);
  if (!chars.length) return;
  chars.forEach(ch => { delete ch.style.color; delete ch.style._schemeRef; });
  const newHtml = _charObjsToHtml(chars);
  c.innerHTML = newHtml;
  d.html = newHtml;
}


// Update a CSS property on every char in d.html AND in the DOM.
// Must update DOM BEFORE save() is called, so save() reads correct innerHTML.
function _syncPropToHtml(prop, val) {
  if (!sel || sel.dataset.type !== 'text') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  const c = sel.querySelector('.ec'); if (!c) return;
  const camel = prop.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());

  const sourceHtml = c.innerHTML;

  const chars = _toCharObjs(sourceHtml);

  if (!chars.length) return;
  // Never overwrite per-char colors via _syncPropToHtml —
  // partial selections would be wiped out.
  if (camel === 'color') return;
  chars.forEach(ch => { ch.style[camel] = val; });
  const newHtml = _charObjsToHtml(chars);

  c.innerHTML = newHtml;
  d.html = newHtml;

}

// ─── Public functions ─────────────────────────────────────────────
function rtBold() {
  if (!_applyToSelection('font-weight','700')) {
    if (!sel||sel.dataset.type!=='text') return;
    const cs = sel.querySelector('.ec').getAttribute('style')||'';
    _setTSWhole('font-weight', /font-weight:(700|800|900)/.test(cs)?'400':'700');
  } else {
    _rtCommit();
  }
  rtUpdateToolbarState();
}

function rtItalic() {
  if (!_applyToSelection('font-style','italic')) {
    if (!sel||sel.dataset.type!=='text') return;
    const cs = sel.querySelector('.ec').getAttribute('style')||'';
    _setTSWhole('font-style', cs.includes('font-style:italic')?'normal':'italic');
  } else {
    _rtCommit();
  }
  rtUpdateToolbarState();
}

function rtUnderline() {
  if (!_applyToSelection('text-decoration','underline')) {
    if (!sel||sel.dataset.type!=='text') return;
    const cs = sel.querySelector('.ec').getAttribute('style')||'';
    _setTSWhole('text-decoration', cs.includes('text-decoration:underline')?'none':'underline');
  } else {
    _rtCommit();
  }
  rtUpdateToolbarState();
}

function rtSuperscript() {
  if (_applyToSelection('vertical-align','super')) _rtCommit();
  rtUpdateToolbarState();
}

function rtSubscript() {
  if (_applyToSelection('vertical-align','sub')) _rtCommit();
  rtUpdateToolbarState();
}

function rtColor(color, schemeRef) {
  // hasSelection: live selection OR saved selection from before color picker click
  const wSel = window.getSelection();
  const hasLive = wSel && !wSel.isCollapsed && wSel.toString().length > 0;
  const hasSaved = !!_savedSelIdx;
  const hasSelection = hasLive || hasSaved;

  if (hasSelection && _rtEl) {
    _applyToSelection._schemeRef = schemeRef;
    const applied = _applyToSelection('color', color);
    _applyToSelection._schemeRef = undefined;
    if (!applied) { if (!sel || sel.dataset.type !== 'text') return; _setTSWhole('color', color); return; }
    _rtCommit();
    saveState();
  } else {
    if (!sel || sel.dataset.type !== 'text') return;
    _savedSelIdx = null; // whole-element color — clear any saved fragment selection
    _setTSWhole('color', color);
  }
  try { const _sw=document.getElementById('p-col-preview');if(_sw)_sw.style.background=color; document.getElementById('p-hex').value=color; } catch(e) {}
}

function rtFontSize(size) {
  if (!size || size < 1) return;
  // Check live DOM selection only — never use _savedSelIdx for font size
  // (clicking the input field clears the text selection)
  const hasLiveSel = (function() {
    if (!_rtEl) return false;
    const root = _rtContent(_rtEl);
    // Verify _rtEl belongs to the currently selected canvas element
    const parentEl = _rtEl.closest('.el');
    if (!parentEl || !sel || parentEl !== sel) return false;
    const idx = _readSelFromDOM(root);
    return !!(idx && idx.end > idx.start);
  })();

  if (hasLiveSel) {
    // Apply only to selected characters
    _applyToSelection('font-size', size + 'px');
    _rtCommit();
  } else {
    // Apply to whole block
    if (_rtEl) _rtCommit();
    _setTSWhole('font-size', size + 'px');
  }
  // Keep bullet icons in sync with font size
  if (typeof rtUpdateListIconSize === 'function') rtUpdateListIconSize();
}

function rtFontWeight(weight) {
  if (_applyToSelection('font-weight', weight)) _rtCommit();
  else _setTSWhole('font-weight', weight);
}

function resetTextFormatting() {
  if (!sel||sel.dataset.type!=='text') return;
  pushUndo();
  const d = slides[cur].els.find(e=>e.id===sel.dataset.id); if (!d) return;
  const c = sel.querySelector('.ec'); if (!c) return;
  const text = _toCharObjs(c.innerHTML).map(o=>o.ch==='\n'?'\n':o.ch).join('');
  c.innerHTML = _charObjsToHtml([...text].map(ch=>({ch,style:{}})));
  d.html = c.innerHTML;
  commitAll(); syncProps();
  toast((t('toastFormattingReset')),'ok');
}

function toggleFmt(fmt) {
  if (fmt==='bold')           rtBold();
  else if (fmt==='italic')    rtItalic();
  else if (fmt==='underline') rtUnderline();
}

function setTS(prop, val) {
  if (!sel||sel.dataset.type!=='text') return;
  if (['text-align','line-height','letter-spacing','text-transform'].includes(prop)) {
    _setTSWhole(prop,val); return;
  }
  if (_applyToSelection(prop,val)) {
    _rtCommit();
    // Keep .cs in sync so styles survive reload
    _setTSWhole(prop,val);
  } else _setTSWhole(prop,val);
}

function onColorPick(v, mode, schemeRef) {
  if (mode==='text') { if(typeof applyTextColor==='function') applyTextColor(v, schemeRef); else rtColor(v); }
  else if (mode==='fill') applyFillColor(v, schemeRef);
}

function onColorHex(v, mode) {
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
  if (mode==='text') { rtColor(v); try{const _sw=document.getElementById('p-col-preview');if(_sw)_sw.style.background=v;}catch(e){} }
  else if (mode==='fill') applyFillColor(v);
}

// ─── Toolbar state ────────────────────────────────────────────────
function rtUpdateToolbarState() {
  try {
    const hint = document.getElementById('sel-hint');
    const s = window.getSelection();
    const hasSel = s && s.rangeCount > 0 && !s.isCollapsed;
    if (hint) hint.style.display = hasSel ? 'inline' : 'none';
    let el2 = null;
    if (s && s.rangeCount > 0) {
      const anc = s.getRangeAt(0).commonAncestorContainer;
      el2 = anc.nodeType===3 ? anc.parentElement : anc;
    }
    if (!el2) return;
    const cs = window.getComputedStyle(el2);
    const setOn = (id,on) => { const b=document.getElementById(id); if(b) b.classList.toggle('on',!!on); };
    setOn('ft-b',   parseInt(cs.fontWeight)>=600);
    setOn('ft-i',   cs.fontStyle==='italic');
    setOn('ft-u',   cs.textDecoration.includes('underline'));
    setOn('ft-sup', !!(el2.style&&el2.style.verticalAlign==='super'));
    setOn('ft-sub', !!(el2.style&&el2.style.verticalAlign==='sub'));
    _updateListButtonState();
    if (hasSel) {
      const hex = _rgbToHex(cs.color);
      if (hex) try{document.getElementById('p-col').value=hex; document.getElementById('p-hex').value=hex;}catch(e){}
      // Font size: show value only if all selected chars are same size, else blank
      try {
        const inp = document.getElementById('p-fs');
        if (inp) {
          const selChars = _getSelectionCharEls();
          if (selChars && selChars.length > 0) {
            const sizes = [...new Set(selChars.map(c => Math.round(parseFloat(window.getComputedStyle(c).fontSize)||0)))];
            inp.value = sizes.length === 1 ? sizes[0] : '';
            inp.placeholder = sizes.length === 1 ? '' : '—';
          } else {
            const fs = parseFloat(cs.fontSize);
            if (fs) inp.value = Math.round(fs);
          }
        }
      } catch(e){}
    }
  } catch(e) {}
}

// Returns array of char span elements currently selected (via browser selection in _rtEl)
function _getSelectionCharEls() {
  if (!_rtEl) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const spans = Array.from(_rtEl.querySelectorAll('span[data-ch]'));
  return spans.filter(sp => range.intersectsNode(sp));
}

function _rgbToHex(rgb) {
  if (!rgb) return null;
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return null;
  return '#'+[m[1],m[2],m[3]].map(n=>(+n).toString(16).padStart(2,'0')).join('');
}


// ─── List helpers ─────────────────────────────────────────────────

// Current bullet icon id (stored on active text element)
function _getBulletIconId() {
  if (!sel || sel.dataset.type !== 'text') return null;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  return (d && d.bulletIconId) || (typeof ICONS !== 'undefined' && ICONS[0] ? ICONS[0].id : null);
}

function _getBulletSvg(iconId, fontSize, style, color, sw) {
  if (typeof ICONS === 'undefined') return '•';
  const ic = ICONS.find(i => i.id === iconId) || ICONS[0];
  if (!ic) return '•';
  const sz = Math.round(parseFloat(fontSize) || 24);
  // Use _buildBulletIconSVG if available (from 29-icons.js), fallback to simple SVG
  if (typeof _buildBulletIconSVG === 'function') {
    return _buildBulletIconSVG(ic, sz, style || 'stroke', color || 'currentColor', sw || 1.8);
  }
  // Fallback: simple stroke SVG using ic.p
  const paths = (ic.p || '').split('||').map(p => p.trim()).filter(Boolean);
  const pathEls = paths.map(p => `<path d="${p}"/>`).join('');
  return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0;pointer-events:none">${pathEls}</svg>`;
}

// Split d.html into lines (by <br>), apply/remove markers, rejoin
function _getHtmlLines(html) {
  // Split on <br> tags (various forms)
  return html.split(/<br\s*\/?>/i);
}

function _joinHtmlLines(lines) {
  return lines.join('<br>');
}

function _lineHasMarker(line) {
  return /<span[^>]*data-list-/i.test(line);
}

function _stripLineMarker(line) {
  return line.replace(/<span[^>]*data-list-[^>]*>[\s\S]*?<\/span>/i, '').replace(/^(&nbsp;|\s)+/, '');
}

function _applyListToElement(listType) {
  if (!sel || sel.dataset.type !== 'text') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  debouncedPushUndo();

  const c = sel.querySelector('.ec'); if (!c) return;
  const root = _rtContent(c);

  // Get font size from element style
  const cs = c.getAttribute('style') || '';
  const fsMatch = cs.match(/font-size:\s*([\d.]+)px/);
  const fontSize = fsMatch ? fsMatch[1] : '24';
  _lastBulletFontSize = parseFloat(fontSize);

  // Bullet markers always use currentColor so they inherit text color from scheme
  const iconStyle = document.getElementById('ic-style') ? document.getElementById('ic-style').value : 'stroke';
  const iconColor = 'currentColor';
  const iconSw = parseFloat(document.getElementById('ic-sw') ? document.getElementById('ic-sw').value : '1.8') || 1.8;
  const iconId = _getBulletIconId();

  // Determine which lines are "selected" (by char offset range)
  const selIdx = _readSelFromDOM(root) || _savedSelIdx;
  const html = root.innerHTML;
  const lines = _getHtmlLines(html);

  // Build cumulative char-offset ranges per line (counting markers as 1, brs as 1)
  // We track start-offset of each line's content in the flattened char stream
  const lineOffsets = []; // [{start, end}] for each line
  {
    let pos = 0;
    lines.forEach((lineHtml, i) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = lineHtml;
      // Count chars in this line the same way _toCharObjs does
      let lineLen = 0;
      function countNode(node) {
        if (node.nodeType === 3) { lineLen += node.textContent.length; return; }
        if (node.nodeType === 1) {
          if (node.tagName === 'BR') { lineLen += 1; return; }
          if (node.hasAttribute('data-list-bullet') || node.hasAttribute('data-list-num')) { lineLen += 1; return; }
          if (node.hasAttribute('data-br-anchor')) return;
          for (const ch of node.childNodes) countNode(ch);
        }
      }
      for (const ch of tmp.childNodes) countNode(ch);
      lineOffsets.push({ start: pos, end: pos + lineLen });
      pos += lineLen + 1; // +1 for the <br> separator between lines
    });
  }

  // Which line indices are covered by the selection?
  let selectedLineIndices;
  if (selIdx) {
    selectedLineIndices = new Set();
    lineOffsets.forEach(({ start, end }, i) => {
      // A line is selected if selection overlaps it
      if (selIdx.start < end && selIdx.end > start) selectedLineIndices.add(i);
    });
  } else {
    // No selection — apply to all lines
    selectedLineIndices = new Set(lines.map((_, i) => i));
  }

  // Among targeted lines: check if all already have this type → toggle off
  const targetedNonEmpty = lines.filter((l, i) =>
    selectedLineIndices.has(i) && l.replace(/<[^>]*>/g,'').trim()
  );
  const allHaveType = targetedNonEmpty.length > 0 && targetedNonEmpty.every(l => {
    const m = l.match(/data-list-(\w+)/);
    return m && m[1] === listType;
  });

  let numIdx = 0; // running index for numbered list (only targeted lines)
  const newLines = lines.map((line, i) => {
    const stripped = _stripLineMarker(line);
    if (!selectedLineIndices.has(i)) return line; // not targeted — leave untouched
    if (allHaveType) return stripped; // toggle off
    if (!stripped.replace(/<[^>]*>/g,'').trim()) return stripped; // skip empty

    numIdx++;
    let marker;
    if (listType === 'bullet') {
      const svg = _getBulletSvg(iconId, fontSize, iconStyle, iconColor, iconSw);
      marker = `<span data-list-bullet data-icon-id="${iconId}" data-icon-style="${iconStyle}" data-icon-color="${iconColor}" data-icon-sw="${iconSw}" contenteditable="false" style="display:inline-flex;align-items:center;margin-right:10px;cursor:pointer;user-select:none;vertical-align:-0.15em" onclick="rtChangeBulletIcon(this)">${svg}</span>`;
    } else {
      marker = `<span data-list-num contenteditable="false" style="display:inline-block;margin-right:10px;min-width:1.2em;font-variant-numeric:tabular-nums;user-select:none;vertical-align:-0.1em">${numIdx}.</span>`;
    }
    return marker + stripped;
  });

  const newHtml = _joinHtmlLines(newLines);
  root.innerHTML = newHtml;
  d.html = newHtml;
  if (listType === 'bullet') d.bulletIconId = iconId;
  _attachBulletClickHandlers(root);
  commitAll();
  _updateListButtonState();
}

function rtBulletList() { _applyListToElement('bullet'); }
function rtNumberedList() { _applyListToElement('num'); }
window.rtBulletList = rtBulletList;
window.rtNumberedList = rtNumberedList;

// Attach click handlers to bullet icons in a root element
function _attachBulletClickHandlers(root) {
  root.querySelectorAll('span[data-list-bullet]').forEach(span => {
    span.onclick = function() { rtChangeBulletIcon(this); };
  });
}
window._attachBulletClickHandlers = _attachBulletClickHandlers;

// Called when user clicks a bullet icon — opens icon picker
function rtChangeBulletIcon(bulletSpan) {
  if (!sel || sel.dataset.type !== 'text') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  // Open icon picker with callback to replace icon
  if (typeof openIconPickerForList === 'function') {
    openIconPickerForList(bulletSpan, d);
  }
}
window.rtChangeBulletIcon = rtChangeBulletIcon;

// Update bullet icon size when font size changes
function rtUpdateListIconSize() {
  if (!sel || sel.dataset.type !== 'text') return;
  const c = sel.querySelector('.ec'); if (!c) return;
  const root = _rtContent(c);
  const cs = c.getAttribute('style') || '';
  const fsMatch = cs.match(/font-size:\s*([\d.]+)px/);
  const fontSize = fsMatch ? fsMatch[1] : '24';
  const sz = Math.round(parseFloat(fontSize));
  root.querySelectorAll('span[data-list-bullet]').forEach(span => {
    const iconId = span.getAttribute('data-icon-id');
    const style  = span.getAttribute('data-icon-style') || 'stroke';
    const color  = span.getAttribute('data-icon-color') || 'currentColor';
    const sw     = parseFloat(span.getAttribute('data-icon-sw')) || 1.8;
    const svg = _getBulletSvg(iconId, sz, style, color, sw);
    span.innerHTML = svg;
  });
}
window.rtUpdateListIconSize = rtUpdateListIconSize;

function _updateListButtonState() {
  if (!sel || sel.dataset.type !== 'text') return;
  const c = sel.querySelector('.ec'); if (!c) return;
  const root = _rtContent(c);
  const hasBullet = !!root.querySelector('span[data-list-bullet]');
  const hasNum    = !!root.querySelector('span[data-list-num]');
  const hasList   = hasBullet || hasNum;
  const setOn = (id, on) => { const b = document.getElementById(id); if (b) b.classList.toggle('on', on); };
  setOn('ft-ul', hasBullet);
  setOn('ft-ol', hasNum);
  const row = document.getElementById('bullet-color-row');
  if (row) row.style.display = hasList ? '' : 'none';
  if (!hasList) return;

  // Read color from data model (d.html) — reliable even after save/load round-trip
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  let col = null;
  if (d && d.html) {
    // Parse data-icon-color from first bullet marker in saved html
    const m = d.html.match(/data-list-bullet[^>]*data-icon-color="([^"]+)"/);
    if (!m) {
      // attribute order may vary
      const m2 = d.html.match(/data-icon-color="([^"]+)"[^>]*data-list-bullet/);
      if (m2) col = m2[1];
    } else {
      col = m[1];
    }
    // Also check for generic data-icon-color near data-list-bullet
    if (!col) {
      const tmp = document.createElement('div');
      tmp.innerHTML = d.html;
      const sp = tmp.querySelector('span[data-list-bullet]');
      if (sp) col = sp.getAttribute('data-icon-color');
      if (!col) {
        const spn = tmp.querySelector('span[data-list-num]');
        if (spn) col = spn.style.color || null;
      }
    }
  }

  const preview = document.getElementById('bullet-color-preview');
  const hex = document.getElementById('bullet-color-hex');
  const displayColor = (!col || col === 'currentColor') ? _getCurrentTextColor(c) : col;
  if (preview) preview.style.background = displayColor || '#ffffff';
  if (hex) hex.value = (!col || col === 'currentColor') ? '' : col;
}
window.rtUpdateListButtonState = _updateListButtonState;
let _lastBulletColor = null;

// Get resolved text color from .ec style (for currentColor display)
function _getCurrentTextColor(ecEl) {
  const cs = ecEl ? ecEl.getAttribute('style') || '' : '';
  const m = cs.match(/\bcolor:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
  return m ? m[1] : '#ffffff';
}

// Apply color to all list markers in the current text element
function rtBulletColorPick(color, schemeRef) {
  if (!sel || sel.dataset.type !== 'text') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  debouncedPushUndo();
  const c = sel.querySelector('.ec'); if (!c) return;
  const root = _rtContent(c);
  const cs = c.getAttribute('style') || '';
  const fsMatch = cs.match(/font-size:\s*([\d.]+)px/);
  const sz = Math.round(parseFloat(fsMatch ? fsMatch[1] : '24'));
  _lastBulletFontSize = sz;

  root.querySelectorAll('span[data-list-bullet]').forEach(sp => {
    sp.setAttribute('data-icon-color', color);
    if (schemeRef) sp.setAttribute('data-icon-schemeref', JSON.stringify(schemeRef));
    else sp.removeAttribute('data-icon-schemeref');
    const iconId    = sp.getAttribute('data-icon-id') || '';
    const iconStyle = sp.getAttribute('data-icon-style') || 'stroke';
    const iconSw    = parseFloat(sp.getAttribute('data-icon-sw')) || 1.8;
    const svg = _getBulletSvg(iconId, sz, iconStyle, color, iconSw);
    sp.innerHTML = svg;
  });
  root.querySelectorAll('span[data-list-num]').forEach(sp => {
    if (color !== 'currentColor') sp.style.color = color;
    else sp.style.color = '';
  });

  d.html = root.innerHTML;
  commitAll();

  // Force swatch update AFTER commitAll (syncProps may have reset it)
  const displayColor = color === 'currentColor' ? _getCurrentTextColor(c) : color;
  const preview = document.getElementById('bullet-color-preview');
  const hex = document.getElementById('bullet-color-hex');
  if (preview) preview.style.background = displayColor;
  if (hex) hex.value = color === 'currentColor' ? '' : color;
  // Cache the last picked bullet color so _updateListButtonState always shows it
  _lastBulletColor = color;
}

// Attach panel mousedown to save selection before toolbar button click steals focus
document.addEventListener('DOMContentLoaded', function(){
  const props = document.getElementById('props');
  if(props) props.addEventListener('mousedown', _rtOnPanelMousedown);
});
