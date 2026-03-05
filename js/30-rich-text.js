// ══════════════ RICH TEXT ENGINE v3 ══════════════

let _rtEl        = null;
let _rtElId      = null;
let _savedSelIdx = null;

// ─── HTML ↔ char-objects ──────────────────────────────────────────
function _toCharObjs(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const out = [];
  function walk(node, inh) {
    if (node.nodeType === 3) {
      for (const ch of node.textContent)
        out.push({ ch, style: Object.assign({}, inh) });
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') { out.push({ ch: '\n', style: Object.assign({}, inh) }); return; }
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
    for (const child of node.childNodes) walk(child, m);
  }
  for (const child of tmp.childNodes) walk(child, {});
  return out;
}

function _charObjsToHtml(chars) {
  return chars.map(({ ch, style }) => {
    if (ch === '\n') return '<br>';
    const css = Object.entries(style)
      .filter(([k]) => k !== 'display')
      .map(([k, v]) => k.replace(/([A-Z])/g, '-$1').toLowerCase() + ':' + v)
      .join(';');
    const esc = ch.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<span data-ch style="display:inline${css?';'+css:''}">${esc}</span>`;
  }).join('');
}

function _groupedHtml(chars) {
  const groups = [];
  let cur = null;
  for (const c of chars) {
    if (c.ch === '\n') { groups.push({ br: true }); cur = null; continue; }
    const key = JSON.stringify(c.style);
    if (!cur || cur.key !== key) { cur = { key, style: c.style, text: c.ch }; groups.push(cur); }
    else cur.text += c.ch;
  }
  return groups.map(g => {
    if (g.br) return '<br>';
    const css = Object.entries(g.style)
      .filter(([k]) => k !== 'display')
      .map(([k, v]) => k.replace(/([A-Z])/g, '-$1').toLowerCase() + ':' + v)
      .join(';');
    const esc = g.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return css ? `<span style="display:inline;${css}">${esc}</span>` : esc;
  }).join('');
}

function rtMigrateHtml(html) {
  if (!html) return '';
  if (html.includes('data-ch')) return html;
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
  if (root.querySelector('span[data-ch]')) return;
  root.innerHTML = _charObjsToHtml(_toCharObjs(root.innerHTML));
}

// ─── Selection: char-index based ──────────────────────────────────
function _charOffset(targetNode, targetOffset, root) {
  let count = 0;
  function walk(node) {
    if (node === targetNode && node.nodeType === 3) { count += targetOffset; return true; }
    if (node.nodeType === 3) { count += node.textContent.length; return false; }
    if (node.nodeType === 1) {
      if (node.tagName === 'BR') { if (node === targetNode) return true; count += 1; return false; }
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
  if (!_rtEl) return;
  const live = _readSelFromDOM(_rtEl);
  if (live) _savedSelIdx = live;
}

// ─── Attach ───────────────────────────────────────────────────────
function rtAttachSelectionTracking(wrapEl, telEl) {
  const id = wrapEl.dataset.id;

  telEl.addEventListener('focus', () => {
    // Only clear saved selection when switching to a different text element
    if (_rtElId && _rtElId !== id) _savedSelIdx = null;
    _rtEl = telEl; _rtElId = id;
    _toEditMode(telEl);
  });

  telEl.addEventListener('blur', () => {
    _toSaveMode(telEl);
    _rtCommit();
    _savedSelIdx = null; // clear saved selection so whole-element color works after editing
  });

  telEl.addEventListener('mouseup', rtUpdateToolbarState);
  telEl.addEventListener('keyup',   rtUpdateToolbarState);
}

document.addEventListener('selectionchange', () => {
  const s = window.getSelection();
  if (!s || s.rangeCount === 0) return;
  const anc = s.getRangeAt(0).commonAncestorContainer;
  const el2 = anc.nodeType === 3 ? anc.parentElement : anc;
  const editable = el2 && el2.closest('[contenteditable="true"]');
  if (editable && editable.classList.contains('tel')) {
    _rtEl = editable;
    const p = editable.closest('.el');
    if (p) _rtElId = p.dataset.id;
    const idx = _readSelFromDOM(editable);
    if (idx) _savedSelIdx = idx;
    rtUpdateToolbarState();
  }
});

// ─── Commit ───────────────────────────────────────────────────────
function _rtCommit() {
  if (!_rtEl || !_rtElId) return;
  const d = slides[cur].els.find(e => e.id === _rtElId);
  if (d) {
    // _rtEl is .ec.tel — strip valign wrapper if present
    const vw = _rtEl.querySelector('.ec-valign-wrap');
    d.html = vw ? vw.innerHTML : _rtEl.innerHTML;
    commitAll();
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
    selected.forEach(c => { c.style[camel] = val; });
  }

  const inEditMode = !root.querySelector('span[data-ch]');
  root.innerHTML = inEditMode ? _groupedHtml(chars) : _charObjsToHtml(chars);
  _restoreSelToDOM(idx, root);
  _savedSelIdx = idx;
  return true;
}

// ─── Whole-element style ──────────────────────────────────────────
function _setTSWhole(prop, val) {
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
  save(); drawThumbs(); syncProps();
}

// ─── Public functions ─────────────────────────────────────────────
function rtBold() {
  if (!_applyToSelection('font-weight','700')) {
    if (!sel||sel.dataset.type!=='text') return;
    const cs = sel.querySelector('.ec').getAttribute('style')||'';
    _setTSWhole('font-weight', /font-weight:(700|800|900)/.test(cs)?'400':'700');
  } else {
    _rtCommit();
    // Keep .cs in sync so toolbar state and reload are correct
    if (sel&&sel.dataset.type==='text') {
      const cs=sel.querySelector('.ec').getAttribute('style')||'';
      _setTSWhole('font-weight', /font-weight:(700|800|900)/.test(cs)?'700':'400');
    }
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
    if (sel&&sel.dataset.type==='text') {
      const cs=sel.querySelector('.ec').getAttribute('style')||'';
      _setTSWhole('font-style', cs.includes('font-style:italic')?'italic':'normal');
    }
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
    if (sel&&sel.dataset.type==='text') {
      const cs=sel.querySelector('.ec').getAttribute('style')||'';
      _setTSWhole('text-decoration', cs.includes('text-decoration:underline')?'underline':'none');
    }
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

function rtColor(color) {
  // Only apply to selection if actively editing this element
  const inEditMode = _rtEl && _rtEl.contentEditable === 'true';
  if (inEditMode && _applyToSelection('color', color)) {
    _rtCommit();
    // Also update base element color in .cs so syncProps picker shows correct value
    // and so color is correct after preview reload
    if (sel && sel.dataset.type === 'text') _setTSWhole('color', color);
  } else {
    if (!sel || sel.dataset.type !== 'text') return;
    _setTSWhole('color', color);
  }
  try { document.getElementById('p-col').value=color; document.getElementById('p-hex').value=color; } catch(e) {}
}

function rtFontSize(size) {
  if (!size||size<1) return;
  if (_applyToSelection('font-size', size+'px')) { _rtCommit(); if(sel&&sel.dataset.type==='text') _setTSWhole('font-size',size+'px'); }
  else _setTSWhole('font-size', size+'px');
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
  toast((getLang()==='ru'?'Форматирование сброшено':'Formatting reset'),'ok');
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

function onColorPick(v, mode) {
  if (mode==='text') rtColor(v);
  else if (mode==='fill') applyFillColor(v);
}

function onColorHex(v, mode) {
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
  if (mode==='text') { rtColor(v); try{document.getElementById('p-col').value=v;}catch(e){} }
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
    if (hasSel) {
      const hex = _rgbToHex(cs.color);
      if (hex) try{document.getElementById('p-col').value=hex; document.getElementById('p-hex').value=hex;}catch(e){}
      const fs = parseFloat(cs.fontSize);
      if (fs) try{document.getElementById('p-fs').value=Math.round(fs);}catch(e){}
    }
  } catch(e) {}
}

function _rgbToHex(rgb) {
  if (!rgb) return null;
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return null;
  return '#'+[m[1],m[2],m[3]].map(n=>(+n).toString(16).padStart(2,'0')).join('');
}
