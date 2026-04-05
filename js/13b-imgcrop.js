// ══════════════ IMAGE CROP ══════════════
//
// MODEL:
//   d.imgCropL/T/R/B = px cut from each side of the FULL image
//   d._cropFullW/H/X/Y = full (uncropped) size+position, stored during crop mode
//
// RENDERING (committed crop):
//   .el is sized to visible window (fullW-L-R, fullH-T-B)
//   .el position is shifted by (L,T) so visible area stays in place
//   img is fullW×fullH, offset by (-L,-T) so correct region shows
//
// CROP MODE:
//   .el expanded to full original size — image stays completely still
//   semi-transparent overlays show cropped-out regions
//   8 square handles sit on edges of the VISIBLE window
//   dragging handles changes L/T/R/B — only overlays+handles move, NOT the image

let _cropEl = null;
let _cropOrigW = 0, _cropOrigH = 0;

// ── Render committed crop ───────────────────────────────────────────────
function applyImgCrop(el, d) {
  const c   = el.querySelector('.iel');
  const img = el.querySelector('img');
  if (!c || !img) return;

  const L = d.imgCropL || 0, T = d.imgCropT || 0;
  const R = d.imgCropR || 0, B = d.imgCropB || 0;
  const hasCrop = L || T || R || B;

  if (hasCrop) {
    const visW = parseInt(el.style.width)  || d.w;
    const visH = parseInt(el.style.height) || d.h;
    // Full image dimensions relative to visible area
    const fW   = L + visW + R;
    const fH   = T + visH + B;
    // Express img size and offset as % of .el so it scales automatically on resize
    const wPct  = (fW / visW * 100).toFixed(4) + '%';
    const hPct  = (fH / visH * 100).toFixed(4) + '%';
    const lPct  = (-L / visW * 100).toFixed(4) + '%';
    const tPct  = (-T / visH * 100).toFixed(4) + '%';

    const rx   = (d.imgRx || 0) + 'px';
    const bw   = d.imgBw || 0;
    const border = bw > 0 ? `${bw}px solid ${d.imgBc||'#fff'}` : 'none';

    el.dataset.hasCrop = '1';

    c.style.position    = 'absolute';
    c.style.inset       = '0';
    c.style.overflow    = 'hidden';
    c.style.borderRadius = rx;
    c.style.border      = border;
    c.style.boxSizing   = bw > 0 ? 'border-box' : '';

    img.style.position  = 'absolute';
    img.style.left      = lPct;
    img.style.top       = tPct;
    img.style.width     = wPct;
    img.style.height    = hPct;
    img.style.objectFit = 'fill';
    img.style.display   = 'block';
    img.style.opacity   = d.imgOpacity != null ? d.imgOpacity : 1;
  } else {
    delete el.dataset.hasCrop;
    const rx = (d.imgRx || 0) + 'px';
    const bw = d.imgBw || 0;
    c.style.position    = 'absolute';
    c.style.inset       = '0';
    c.style.overflow    = 'hidden';
    c.style.borderRadius = rx;
    c.style.border      = bw > 0 ? `${bw}px solid ${d.imgBc||'#fff'}` : 'none';
    c.style.boxSizing   = bw > 0 ? 'border-box' : '';
    img.style.position  = '';
    img.style.left      = '';
    img.style.top       = '';
    img.style.width     = '100%';
    img.style.height    = '100%';
    img.style.objectFit = d.imgFit || 'contain';
  }
}

// ── Enter crop mode ─────────────────────────────────────────────────────
function startImgCrop() {
  if (!sel || sel.dataset.type !== 'image') return;
  if (_cropEl === sel) { _exitCropMode(true); return; }
  if (_cropEl) _exitCropMode(false);
  _cropEl = sel;

  const d = slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;

  // Current .el dimensions (may already be cropped)
  const curW = parseInt(sel.style.width)  || d.w;
  const curH = parseInt(sel.style.height) || d.h;
  const curX = parseInt(sel.style.left)   || d.x;
  const curY = parseInt(sel.style.top)    || d.y;
  const L = d.imgCropL || 0, T = d.imgCropT || 0;
  const R = d.imgCropR || 0, B = d.imgCropB || 0;

  // Recover full (uncropped) size
  _cropOrigW = curW + L + R;
  _cropOrigH = curH + T + B;
  const fullX = curX - L;
  const fullY = curY - T;

  d._cropFullW = _cropOrigW;
  d._cropFullH = _cropOrigH;
  d._cropFullX = fullX;
  d._cropFullY = fullY;

  // Expand .el to full image — image stays at exact same screen position
  sel.style.width  = _cropOrigW + 'px';
  sel.style.height = _cropOrigH + 'px';
  sel.style.left   = fullX + 'px';
  sel.style.top    = fullY + 'px';

  // img fills full .el exactly — image does NOT move
  const c   = sel.querySelector('.iel');
  const img = sel.querySelector('img');
  if (c)   c.style.cssText = 'position:absolute;inset:0;overflow:visible;';
  if (img) {
    img.style.position  = 'absolute';
    img.style.left      = '0';
    img.style.top       = '0';
    img.style.width     = _cropOrigW + 'px';
    img.style.height    = _cropOrigH + 'px';
    img.style.objectFit = 'fill';
  }

  sel.querySelectorAll('.rh').forEach(h => h.style.display = 'none');
  sel.dataset.cropMode = 'true';
  // Clear handles overlay — crop handles take over interaction
  const _ov = document.getElementById('handles-overlay');
  if (_ov) _ov.innerHTML = '';
  _buildCropUI(sel, d);
  _updateCropBtn(true);
}

// ── Exit crop mode ──────────────────────────────────────────────────────
function _exitCropMode(doSave) {
  if (!_cropEl) return;
  const el = _cropEl;
  _cropEl = null;

  el.querySelectorAll('.crop-handle, .crop-overlay').forEach(n => n.remove());
  delete el.dataset.cropMode;
  el.querySelectorAll('.rh').forEach(h => h.style.display = '');

  const d = slides[cur].els.find(e => e.id === el.dataset.id);

  if (doSave && d) {
    const L = d.imgCropL || 0, T = d.imgCropT || 0;
    const R = d.imgCropR || 0, B = d.imgCropB || 0;
    const fW = d._cropFullW || _cropOrigW;
    const fH = d._cropFullH || _cropOrigH;
    const fX = d._cropFullX != null ? d._cropFullX : (parseInt(el.style.left));
    const fY = d._cropFullY != null ? d._cropFullY : (parseInt(el.style.top));

    // Resize .el to visible (cropped) area
    const visW = fW - L - R, visH = fH - T - B;
    el.style.width  = visW + 'px';
    el.style.height = visH + 'px';
    el.style.left   = (fX + L) + 'px';
    el.style.top    = (fY + T) + 'px';

    // Update d to match
    d.x = fX + L; d.y = fY + T;
    d.w = visW;   d.h = visH;

    // Write crop to dataset for save()
    el.dataset.imgCropL = L;
    el.dataset.imgCropT = T;
    el.dataset.imgCropR = R;
    el.dataset.imgCropB = B;

    applyImgCrop(el, d);
    save(); saveState();
    if (typeof toast === 'function') toast(t('toastCropApplied'), 'ok');
  } else if (d) {
    // Cancelled: restore previous committed state
    applyImgCrop(el, d);
  }
  _updateCropBtn(false);
  if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
}

function exitCropModeIfActive() {
  if (_cropEl) _exitCropMode(true);
}

// ── Build overlays + handles ────────────────────────────────────────────
function _buildCropUI(el, d) {
  ['t','b','l','r'].forEach(side => {
    const ov = document.createElement('div');
    ov.className = 'crop-overlay';
    ov.dataset.ovSide = side;
    ov.style.cssText = 'position:absolute;background:rgba(0,0,0,0.55);pointer-events:none;z-index:10000;';
    el.appendChild(ov);
  });

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

// ── Refresh handle positions + overlays ────────────────────────────────
function _refreshCropUI(el, d) {
  const fW = d._cropFullW || _cropOrigW;
  const fH = d._cropFullH || _cropOrigH;
  const L = d.imgCropL || 0, T = d.imgCropT || 0;
  const R = d.imgCropR || 0, B = d.imgCropB || 0;
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
}

// ── Drag handler ────────────────────────────────────────────────────────
function _attachCropDrag(hEl, el, d, sides) {
  hEl.addEventListener('mousedown', e => {
    e.preventDefault(); e.stopPropagation();
    const _z = typeof _canvasZoom === 'number' ? _canvasZoom : 1;
    const fW = d._cropFullW || _cropOrigW;
    const fH = d._cropFullH || _cropOrigH;
    const sx = e.clientX, sy = e.clientY;
    const sL = d.imgCropL||0, sT = d.imgCropT||0;
    const sR = d.imgCropR||0, sB = d.imgCropB||0;
    const MIN = 20;

    const mm = e2 => {
      const dx = (e2.clientX - sx) / _z;
      const dy = (e2.clientY - sy) / _z;
      if (sides.includes('L')) d.imgCropL = Math.max(0, Math.min(fW-(d.imgCropR||0)-MIN, sL+dx));
      if (sides.includes('R')) d.imgCropR = Math.max(0, Math.min(fW-(d.imgCropL||0)-MIN, sR-dx));
      if (sides.includes('T')) d.imgCropT = Math.max(0, Math.min(fH-(d.imgCropB||0)-MIN, sT+dy));
      if (sides.includes('B')) d.imgCropB = Math.max(0, Math.min(fH-(d.imgCropT||0)-MIN, sB-dy));
      _refreshCropUI(el, d);
    };
    const mu = () => { document.removeEventListener('mousemove',mm); document.removeEventListener('mouseup',mu); };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  });
}

// ── Button highlight ────────────────────────────────────────────────────
function _updateCropBtn(active) {
  const btn = document.getElementById('img-crop-btn');
  if (!btn) return;
  btn.style.background  = active ? 'var(--accent)' : '';
  btn.style.color       = active ? '#fff' : '';
  btn.style.borderColor = active ? 'var(--accent)' : '';
}
