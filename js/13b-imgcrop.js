// ══════════════ IMAGE CROP ══════════════
//
// MODEL (как в PowerPoint):
//   Картинка стоит на месте; двигается только рамка обрезки.
//   d.imgCropL/T/R/B — отступы от полного кадра (_cropFullW/H).
//   В режиме обрезки .el = полный кадр; img на весь кадр (left/top=0).
//   При выходе рамка элемента съезжает к видимой области, img со сдвигом
//   (−L,−T), поэтому пиксели на экране не прыгают.

let _cropEl = null;
let _cropOrigW = 0, _cropOrigH = 0;

function _applyImgFlipTarget(c, d) {
  if (!c) return;
  const fx = (d.imgFlipH === true || d.imgFlipH === 'true') ? -1 : 1;
  const fy = (d.imgFlipV === true || d.imgFlipV === 'true') ? -1 : 1;
  if (fx === -1 || fy === -1) {
    c.style.transform = `scale(${fx},${fy})`;
    c.style.transformOrigin = 'center';
  } else {
    c.style.transform = '';
    c.style.transformOrigin = '';
  }
}

/** Прямоугольник картинки внутри бокса без искажения (object-fit: contain). */
function _imgContainRect(nw, nh, boxW, boxH) {
  const ir = (nw > 0 && nh > 0) ? (nw / nh) : (boxW / Math.max(1, boxH));
  const br = boxW / Math.max(1, boxH);
  if (ir > br) {
    const w = boxW, h = boxW / ir;
    return { x: 0, y: (boxH - h) / 2, w, h };
  }
  const h = boxH, w = boxH * ir;
  return { x: (boxW - w) / 2, y: 0, w, h };
}

/** Как картинка реально нарисована в боксе (contain / cover / fill). */
function _imgPaintedRect(img, d, boxW, boxH) {
  const nw = img && img.naturalWidth, nh = img && img.naturalHeight;
  const fit = (d && d.imgFit) || 'contain';
  if (!nw || !nh || fit === 'fill') return { x: 0, y: 0, w: boxW, h: boxH };
  if (fit === 'cover') {
    const ir = nw / nh, br = boxW / Math.max(1, boxH);
    if (ir > br) {
      const h = boxH, w = h * ir;
      return { x: (boxW - w) / 2, y: 0, w, h };
    }
    const w = boxW, h = w / ir;
    return { x: 0, y: (boxH - h) / 2, w, h };
  }
  return _imgContainRect(nw, nh, boxW, boxH);
}

/**
 * Метрики UI обрезки.
 * fullX/Y — где стоит полный кадр, чтобы ВИДИМАЯ область осталась в (curX,curY).
 * Картинка привязана к полному кадру → на экране не двигается.
 * _cropFullW/H пишем только при успешном apply — не при входе (иначе после отмены stretch).
 */
function _cropUiMetrics(d, curW, curH, curX, curY, img) {
  let L = +(d.imgCropL || 0), T = +(d.imgCropT || 0), R = +(d.imgCropR || 0), B = +(d.imgCropB || 0);
  let logW = d._cropFullW;
  let logH = d._cropFullH;
  const entryVisW = curW, entryVisH = curH;
  const noFull = !(logW > 0 && logH > 0);
  const noCrop = !L && !T && !R && !B;

  // Нет активной обрезки — кадр = уже нарисованная область (игнор stale _cropFullW)
  if (noCrop) {
    const disp = _imgPaintedRect(img, d, curW, curH);
    return {
      logW: disp.w, logH: disp.h,
      sx: 1, sy: 1,
      uiW: disp.w, uiH: disp.h,
      uiL: 0, uiT: 0, uiR: 0, uiB: 0,
      fullX: curX + disp.x,
      fullY: curY + disp.y,
      entryVisW, entryVisH,
      entryX: curX, entryY: curY,
      entryCrop: { L: 0, T: 0, R: 0, B: 0 },
      clearFullOnCancel: true,
    };
  }

  if (noFull) {
    logW = curW + L + R;
    logH = curH + T + B;
  }

  const logVisW = Math.max(1, logW - L - R);
  const logVisH = Math.max(1, logH - T - B);
  // Масштаб видимой области → текущий бокс (обычно 1 после apply)
  const sx = curW / logVisW;
  const sy = curH / logVisH;

  return {
    logW, logH, sx, sy,
    uiW: logW * sx,
    uiH: logH * sy,
    uiL: L * sx,
    uiT: T * sy,
    uiR: R * sx,
    uiB: B * sy,
    fullX: curX - L * sx,
    fullY: curY - T * sy,
    entryVisW, entryVisH,
    entryX: curX, entryY: curY,
    entryCrop: { L, T, R, B },
  };
}

function _syncLogicalCrop(d) {
  const ui = d._cropUi;
  if (!ui) return;
  d.imgCropL = ui.uiL / ui.sx;
  d.imgCropT = ui.uiT / ui.sy;
  d.imgCropR = ui.uiR / ui.sx;
  d.imgCropB = ui.uiB / ui.sy;
}

function _installCropOutsideClick() {
  if (window._cropOutsideHandler) return;
  window._cropOutsideHandler = function(e) {
    if (!_cropEl) return;
    if (_cropEl.contains(e.target)) return;
    if (e.target.closest('#img-crop-btn')) return;
    exitCropModeIfActive();
  };
  document.addEventListener('mousedown', window._cropOutsideHandler, true);
}

function _removeCropOutsideClick() {
  if (!window._cropOutsideHandler) return;
  document.removeEventListener('mousedown', window._cropOutsideHandler, true);
  delete window._cropOutsideHandler;
}

function applyPptxSrcRectCrop(el, d, img) {
  const sr = d._pptxSrcRect;
  if (!sr || !img || !img.naturalWidth) return false;
  const nw = img.naturalWidth, nh = img.naturalHeight;
  d.imgCropL = Math.round(nw * (sr.l || 0) / 100000);
  d.imgCropT = Math.round(nh * (sr.t || 0) / 100000);
  d.imgCropR = Math.round(nw * (sr.r || 0) / 100000);
  d.imgCropB = Math.round(nh * (sr.b || 0) / 100000);
  delete d._pptxSrcRect;
  el.dataset.imgCropL = d.imgCropL;
  el.dataset.imgCropT = d.imgCropT;
  el.dataset.imgCropR = d.imgCropR;
  el.dataset.imgCropB = d.imgCropB;
  return true;
}

function applyImgCrop(el, d) {
  const c   = el.querySelector('.iel');
  const img = el.querySelector('img');
  if (!c || !img) return;

  const L = +(d.imgCropL || 0), T = +(d.imgCropT || 0);
  const R = +(d.imgCropR || 0), B = +(d.imgCropB || 0);
  const hasCrop = L || T || R || B;
  const isPolaroid = (typeof _imgNormFrame === 'function' ? _imgNormFrame(d.imgFrame) : d.imgFrame) === 'polaroid';

  if (hasCrop) {
    const visW = parseInt(el.style.width)  || d.w;
    const visH = parseInt(el.style.height) || d.h;
    const fW = (d._cropFullW > 0) ? d._cropFullW : (L + visW + R);
    const fH = (d._cropFullH > 0) ? d._cropFullH : (T + visH + B);
    const logVisW = Math.max(1, fW - L - R);
    const logVisH = Math.max(1, fH - T - B);
    const wPct = (fW / logVisW * 100).toFixed(4) + '%';
    const hPct = (fH / logVisH * 100).toFixed(4) + '%';
    const lPct = (-L / logVisW * 100).toFixed(4) + '%';
    const tPct = (-T / logVisH * 100).toFixed(4) + '%';
    const rx   = (d.imgRx || 0) + 'px';

    el.dataset.hasCrop = '1';

    if (isPolaroid) {
      // Не ломать flex-вёрстку полароида — только клип и геометрия img
      c.style.overflow = 'hidden';
      const wrap = c.querySelector('.img-polaroid-photo');
      if (wrap) {
        wrap.style.position = 'relative';
        wrap.style.display = 'block';
        wrap.style.width = '100%';
        wrap.style.height = '100%';
        wrap.style.overflow = 'hidden';
        wrap.style.minHeight = '0';
      }
    } else {
      c.style.position     = 'absolute';
      c.style.inset        = '0';
      c.style.overflow     = 'hidden';
      c.style.borderRadius = rx;
      c.style.border       = 'none';
      c.style.boxSizing    = '';
    }

    img.style.position  = 'absolute';
    img.style.left      = lPct;
    img.style.top       = tPct;
    img.style.width     = wPct;
    img.style.height    = hPct;
    img.style.maxWidth  = 'none';
    img.style.maxHeight = 'none';
    img.style.margin    = '0';
    img.style.objectFit = 'fill';
    img.style.objectPosition = 'center';
    img.style.display   = 'block';
    img.style.opacity   = d.imgOpacity != null ? d.imgOpacity : 1;
  } else {
    delete el.dataset.hasCrop;
    if (!isPolaroid) {
      const rx = (d.imgRx || 0) + 'px';
      c.style.position     = 'absolute';
      c.style.inset        = '0';
      c.style.overflow     = 'hidden';
      c.style.borderRadius = rx;
      c.style.border       = 'none';
      c.style.boxSizing    = '';
      img.style.position  = '';
      img.style.left      = '';
      img.style.top       = '';
      img.style.width     = '100%';
      img.style.height    = '100%';
      img.style.maxWidth  = '';
      img.style.maxHeight = '';
      img.style.margin    = '';
      img.style.objectFit = d.imgFit || 'contain';
    }
  }
}

function startImgCrop() {
  if (!sel || sel.dataset.type !== 'image') return;
  if (_cropEl === sel) { _exitCropMode(true); return; }
  if (_cropEl) _exitCropMode(false);
  _cropEl = sel;

  const d = slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;

  const curW = parseInt(sel.style.width)  || d.w;
  const curH = parseInt(sel.style.height) || d.h;
  const curX = parseInt(sel.style.left)   || d.x;
  const curY = parseInt(sel.style.top)    || d.y;

  const img = sel.querySelector('img');
  const ui = _cropUiMetrics(d, curW, curH, curX, curY, img);
  d._cropUi = ui;
  _cropOrigW = ui.uiW;
  _cropOrigH = ui.uiH;
  // _cropFullW/H фиксируем только при apply — иначе отмена ломает следующий вход

  // Разворачиваем элемент до полного кадра; картинка остаётся в тех же экранных координатах
  sel.style.width  = ui.uiW + 'px';
  sel.style.height = ui.uiH + 'px';
  sel.style.left   = ui.fullX + 'px';
  sel.style.top    = ui.fullY + 'px';

  const c = sel.querySelector('.iel');
  if (c) {
    c.style.cssText = 'position:absolute;inset:0;overflow:visible;pointer-events:none;';
    _applyImgFlipTarget(c, d);
  }
  if (img) {
    img.style.position  = 'absolute';
    img.style.left      = '0';
    img.style.top       = '0';
    img.style.width     = '100%';
    img.style.height    = '100%';
    img.style.maxWidth  = 'none';
    img.style.margin    = '0';
    img.style.objectFit = 'fill';
    img.style.pointerEvents = 'none';
  }

  sel.querySelectorAll('.rh').forEach(h => h.style.display = 'none');
  sel.dataset.cropMode = 'true';
  const _ov = document.getElementById('handles-overlay');
  if (_ov) _ov.innerHTML = '';
  _buildCropUI(sel, d);
  _updateCropBtn(true);
  _installCropOutsideClick();
}

function _exitCropMode(doSave) {
  if (!_cropEl) return;
  const el = _cropEl;
  _cropEl = null;
  _removeCropOutsideClick();

  el.querySelectorAll('.crop-handle, .crop-overlay, .crop-pan-layer').forEach(n => n.remove());
  delete el.dataset.cropMode;
  el.querySelectorAll('.rh').forEach(h => h.style.display = '');

  const d = slides[cur].els.find(e => e.id === el.dataset.id);
  const ui = d && d._cropUi;

  if (doSave && d && ui) {
    _syncLogicalCrop(d);
    const L = d.imgCropL || 0, T = d.imgCropT || 0;
    const R = d.imgCropR || 0, B = d.imgCropB || 0;

    d._cropFullW = ui.logW;
    d._cropFullH = ui.logH;

    // Рамка → к обрезанной области; картинка со сдвигом остаётся на месте
    const visW = ui.uiW - ui.uiL - ui.uiR;
    const visH = ui.uiH - ui.uiT - ui.uiB;
    const visX = (parseInt(el.style.left) || 0) + ui.uiL;
    const visY = (parseInt(el.style.top) || 0) + ui.uiT;

    el.style.width  = visW + 'px';
    el.style.height = visH + 'px';
    el.style.left   = visX + 'px';
    el.style.top    = visY + 'px';

    d.x = visX; d.y = visY;
    d.w = visW; d.h = visH;
    d.imgFit = 'fill';
    el.dataset.imgFit = 'fill';

    el.dataset.imgCropL = L;
    el.dataset.imgCropT = T;
    el.dataset.imgCropR = R;
    el.dataset.imgCropB = B;

    delete d._cropUi;
    if (typeof applyImgStyles === 'function') applyImgStyles(el, d);
    else applyImgCrop(el, d);
    save(); saveState();
    if (typeof toast === 'function') toast(t('toastCropApplied'), 'ok');
  } else if (d && ui) {
    const ec = ui.entryCrop;
    d.imgCropL = ec.L; d.imgCropT = ec.T; d.imgCropR = ec.R; d.imgCropB = ec.B;
    el.style.width  = ui.entryVisW + 'px';
    el.style.height = ui.entryVisH + 'px';
    el.style.left   = ui.entryX + 'px';
    el.style.top    = ui.entryY + 'px';
    d.x = ui.entryX; d.y = ui.entryY;
    d.w = ui.entryVisW; d.h = ui.entryVisH;
    if (ui.clearFullOnCancel || (!ec.L && !ec.T && !ec.R && !ec.B)) {
      delete d._cropFullW;
      delete d._cropFullH;
    }
    delete d._cropUi;
    if (typeof applyImgStyles === 'function') applyImgStyles(el, d);
    else applyImgCrop(el, d);
  }
  _updateCropBtn(false);
  if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
}

function exitCropModeIfActive() {
  if (_cropEl) _exitCropMode(true);
}

function _buildCropUI(el, d) {
  ['t','b','l','r'].forEach(side => {
    const ov = document.createElement('div');
    ov.className = 'crop-overlay';
    ov.dataset.ovSide = side;
    ov.style.cssText = 'position:absolute;background:rgba(0,0,0,0.55);pointer-events:none;z-index:10000;';
    el.appendChild(ov);
  });

  const pan = document.createElement('div');
  pan.className = 'crop-pan-layer';
  pan.style.cssText = 'position:absolute;z-index:10000;cursor:move;pointer-events:auto;box-shadow:inset 0 0 0 2px rgba(255,255,255,0.9);';
  _attachCropPan(pan, el, d);
  el.appendChild(pan);

  [
    { pos:'tl', cursor:'nw-resize', sides:['T','L'] },
    { pos:'tm', cursor:'n-resize',  sides:['T'] },
    { pos:'tr', cursor:'ne-resize', sides:['T','R'] },
    { pos:'ml', cursor:'w-resize',  sides:['L'] },
    { pos:'mr', cursor:'e-resize',  sides:['R'] },
    { pos:'bl', cursor:'sw-resize', sides:['B','L'] },
    { pos:'bm', cursor:'s-resize',  sides:['B'] },
    { pos:'br', cursor:'se-resize', sides:['B','R'] },
  ].forEach(h => {
    const hEl = document.createElement('div');
    hEl.className = 'crop-handle crop-handle-' + h.pos;
    hEl.style.cssText = `position:absolute;width:10px;height:10px;background:#fff;border:2px solid #222;border-radius:1px;z-index:10001;cursor:${h.cursor};box-shadow:0 1px 4px rgba(0,0,0,.5);pointer-events:auto;`;
    _attachCropDrag(hEl, el, d, h.sides);
    el.appendChild(hEl);
  });

  _refreshCropUI(el, d);
}

function _refreshCropUI(el, d) {
  const ui = d._cropUi;
  if (!ui) return;
  const fW = ui.uiW, fH = ui.uiH;
  const L = ui.uiL, T = ui.uiT, R = ui.uiR, B = ui.uiB;
  const visR = fW - R, visB = fH - B;
  const mx = (L + visR) / 2, my = (T + visB) / 2;

  const handlePos = {
    tl:[L,T],   tm:[mx,T],    tr:[visR,T],
    ml:[L,my],                mr:[visR,my],
    bl:[L,visB], bm:[mx,visB], br:[visR,visB],
  };
  Object.entries(handlePos).forEach(([pos,[x,y]]) => {
    const h = el.querySelector('.crop-handle-' + pos);
    if (h) { h.style.left = (x-5)+'px'; h.style.top = (y-5)+'px'; }
  });

  const ov = side => el.querySelector('[data-ov-side="'+side+'"]');
  if (ov('t')) Object.assign(ov('t').style, {top:'0',left:'0',right:'0',bottom:'',height:T+'px'});
  if (ov('b')) Object.assign(ov('b').style, {bottom:'0',left:'0',right:'0',top:'',height:B+'px'});
  if (ov('l')) Object.assign(ov('l').style, {top:T+'px',left:'0',bottom:B+'px',right:'',width:L+'px'});
  if (ov('r')) Object.assign(ov('r').style, {top:T+'px',right:'0',bottom:B+'px',left:'',width:R+'px'});

  const pan = el.querySelector('.crop-pan-layer');
  if (pan) {
    pan.style.left = L + 'px';
    pan.style.top = T + 'px';
    pan.style.width = Math.max(1, fW - L - R) + 'px';
    pan.style.height = Math.max(1, fH - T - B) + 'px';
  }
}

function _attachCropPan(panEl, el, d) {
  panEl.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    const ui = d._cropUi;
    if (!ui) return;
    const _z = typeof _canvasZoom === 'number' ? _canvasZoom : 1;
    const sx0 = e.clientX, sy0 = e.clientY;
    const sL = ui.uiL, sT = ui.uiT;
    const visW = ui.uiW - ui.uiL - ui.uiR;
    const visH = ui.uiH - ui.uiT - ui.uiB;

    const mm = e2 => {
      const dx = (e2.clientX - sx0) / _z;
      const dy = (e2.clientY - sy0) / _z;
      // Двигаем только рамку; размер видимой области и картинка не меняются
      let nL = Math.max(0, Math.min(ui.uiW - visW, sL + dx));
      let nT = Math.max(0, Math.min(ui.uiH - visH, sT + dy));
      ui.uiL = nL;
      ui.uiT = nT;
      ui.uiR = ui.uiW - visW - nL;
      ui.uiB = ui.uiH - visH - nT;
      _syncLogicalCrop(d);
      _refreshCropUI(el, d);
    };
    const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  });
}

function _attachCropDrag(hEl, el, d, sides) {
  hEl.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    const ui = d._cropUi;
    if (!ui) return;
    const _z = typeof _canvasZoom === 'number' ? _canvasZoom : 1;
    const fW = ui.uiW, fH = ui.uiH;
    const sx0 = e.clientX, sy0 = e.clientY;
    const sL = ui.uiL, sT = ui.uiT, sR = ui.uiR, sB = ui.uiB;
    const MIN = 20;

    const mm = e2 => {
      const dx = (e2.clientX - sx0) / _z;
      const dy = (e2.clientY - sy0) / _z;
      // Меняем только отступы рамки — картинка (полный кадр) не двигается
      if (sides.includes('L')) ui.uiL = Math.max(0, Math.min(fW - sR - MIN, sL + dx));
      if (sides.includes('R')) ui.uiR = Math.max(0, Math.min(fW - sL - MIN, sR - dx));
      if (sides.includes('T')) ui.uiT = Math.max(0, Math.min(fH - sB - MIN, sT + dy));
      if (sides.includes('B')) ui.uiB = Math.max(0, Math.min(fH - sT - MIN, sB - dy));
      _syncLogicalCrop(d);
      _refreshCropUI(el, d);
    };
    const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  });
}

function _updateCropBtn(active) {
  const btn = document.getElementById('img-crop-btn');
  if (!btn) return;
  btn.style.background  = active ? 'var(--accent)' : '';
  btn.style.color       = active ? '#fff' : '';
  btn.style.borderColor = active ? 'var(--accent)' : '';
}

window.isImgCropActive = function() { return !!_cropEl; };
window._imgContainRect = _imgContainRect;
