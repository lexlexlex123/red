// ══════════════ PAGE NUMBERING ══════════════

let pnSettings = null;
let _pnLocked = false; // true during preview — blocks any DOM-triggered changes

function _pnDefaults() {
  const t = (typeof getThemeAccents === 'function') ? getThemeAccents() : { ac1:'#3b82f6', dark:true };
  return {
    enabled:     false,
    style:       'simple',
    position:    'br',
    customXY:    null,       // {x,y} set when user drags; overrides position preset
    color:       t.ac1 || '#3b82f6',
    textColor:   '#ffffff',
    fontSize:    14,
    opacity:     1,
    showTotal:   false,
    customColor: false,
  };
}

function pnGetSettings() {
  if (!pnSettings) pnSettings = _pnDefaults();
  return pnSettings;
}

function _pnBuildHtml(slideIdx, style, showTotal, color, textColor, fontSize) {
  const num   = slideIdx + 1;
  const total = slides.length;
  const label = showTotal
    ? `${num}<span style="opacity:.55;font-size:.78em;margin-left:2px">/ ${total}</span>`
    : `${num}`;
  const fs = fontSize || 14;
  switch (style) {
    case 'circle':
      return `<div style="width:${fs*2}px;height:${fs*2}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:${fs}px;font-weight:700;color:${textColor};line-height:1">${label}</div>`;
    case 'ring':
      return `<div style="width:${fs*2}px;height:${fs*2}px;border-radius:50%;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:${fs}px;font-weight:700;color:${color};line-height:1">${label}</div>`;
    case 'pill':
      return `<div style="padding:${fs*.25}px ${fs*.7}px;border-radius:999px;background:${color};font-size:${fs}px;font-weight:600;color:${textColor};line-height:1.4;white-space:nowrap">${label}</div>`;
    case 'box':
      return `<div style="padding:${fs*.25}px ${fs*.6}px;border-radius:4px;background:${color};font-size:${fs}px;font-weight:600;color:${textColor};line-height:1.4;white-space:nowrap">${label}</div>`;
    case 'slash':
      return `<div style="font-size:${fs}px;font-weight:600;color:${color};line-height:1;white-space:nowrap;border-bottom:2px solid ${color};padding-bottom:3px">${label}</div>`;
    default:
      return `<div style="font-size:${fs}px;font-weight:600;color:${color};line-height:1;white-space:nowrap">${label}</div>`;
  }
}

function _pnSize(fontSize) {
  const fs = fontSize || 14;
  return { w: Math.round(fs * 5), h: Math.round(fs * 2.4) };
}

function _pnPresetXY(pos, fontSize) {
  const pad = 12;
  const { w, h } = _pnSize(fontSize);
  const W = canvasW, H = canvasH;
  switch (pos) {
    case 'tl': return { x: pad,                   y: pad };
    case 'tc': return { x: Math.round(W/2 - w/2), y: pad };
    case 'tr': return { x: W - w - pad,            y: pad };
    case 'bl': return { x: pad,                   y: H - h - pad };
    case 'bc': return { x: Math.round(W/2 - w/2), y: H - h - pad };
    case 'br':
    default:   return { x: W - w - pad,            y: H - h - pad };
  }
}

function pnApplyAll() {
  const s = pnGetSettings();
  if (!s.enabled) { pnRemoveAll(); return; }

  const t = (typeof getThemeAccents === 'function') ? getThemeAccents() : { ac1:'#3b82f6' };
  const color = s.customColor ? s.color : (t.ac1 || '#3b82f6');
  const { w, h } = _pnSize(s.fontSize);
  const xy = s.customXY || _pnPresetXY(s.position, s.fontSize);

  slides.forEach((slide, si) => {
    slide.els = slide.els.filter(e => e.type !== 'pagenum');
    slide.els.push({
      id: 'pn_' + si, type: 'pagenum',
      x: xy.x, y: xy.y, w, h,
      rot: 0, anims: [], elOpacity: s.opacity,
      pnStyle: s.style, pnPos: s.position,
      pnColor: color, pnTextColor: s.textColor,
      pnFontSize: s.fontSize, pnShowTotal: s.showTotal,
      html: _pnBuildHtml(si, s.style, s.showTotal, color, s.textColor, s.fontSize),
    });
  });

  if(typeof renderAll==="function")renderAll(); if(typeof drawThumbs==="function")drawThumbs(); if(typeof saveState==="function")saveState();
}

function pnRemoveAll() {
  if(typeof pushUndo==="function")pushUndo();
  slides.forEach(slide => { slide.els = slide.els.filter(e => e.type !== 'pagenum'); });
  if(typeof renderAll==="function")renderAll(); if(typeof drawThumbs==="function")drawThumbs(); if(typeof saveState==="function")saveState();
}

// Optional legacy DOM sync (controls live in config UI / CFG_PAGENUM now)
function pnOnChange() {
  if (_pnLocked) return;
  const s = pnGetSettings();
  const styleEl = document.getElementById('pn-style');
  if (styleEl) s.style = styleEl.value;
  const totalChk = document.getElementById('pn-show-total');
  if (totalChk) s.showTotal = totalChk.checked;
  const fsEl = document.getElementById('pn-fontsize');
  if (fsEl) s.fontSize = +fsEl.value || 14;
  const opEl = document.getElementById('pn-opacity');
  if (opEl) s.opacity = +opEl.value || 1;
  const customChk = document.getElementById('pn-custom-color');
  if (customChk) s.customColor = customChk.checked;
  const colorEl = document.getElementById('pn-color');
  if (colorEl) s.color = colorEl.value;
  const tcEl = document.getElementById('pn-text-color');
  if (tcEl) s.textColor = tcEl.value;
  pnApplyAll();
}

function pnSetPos(pos) {
  if (_pnLocked) return;
  const s = pnGetSettings();
  s.position = pos;
  s.customXY = null;
  pnApplyAll();
}

// Called after user drags a pagenum element — propagate coords to all slides
function pnOnDragEnd(x, y) {
  const s = pnGetSettings();
  if (!s.enabled) return;
  s.customXY = { x, y };
  document.querySelectorAll('.pn-pos-btn').forEach(b => b.classList.remove('active'));

  const t = (typeof getThemeAccents === 'function') ? getThemeAccents() : { ac1:'#3b82f6' };
  const color = s.customColor ? s.color : (t.ac1 || '#3b82f6');
  const { w, h } = _pnSize(s.fontSize);

  slides.forEach((slide, si) => {
    const pn = slide.els.find(e => e.type === 'pagenum');
    if (pn) { pn.x = x; pn.y = y; pn.w = w; pn.h = h;
      pn.html = _pnBuildHtml(si, s.style, s.showTotal, color, s.textColor, s.fontSize); }
  });

  if(typeof drawThumbs==="function")drawThumbs(); if(typeof saveState==="function")saveState();
}

// Lock/unlock PN changes during preview
function pnLock()   { _pnLocked = true; }
function pnUnlock() { _pnLocked = false; if (typeof pnSyncUI === 'function') pnSyncUI(); }

// No slide-props UI anymore — settings via config/pagenum.js and Config panel
function pnSyncUI() {}
