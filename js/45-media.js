// ══════════════ MEDIA (VIDEO & AUDIO) ══════════════

function addVideoEl() { _mediaInsertNew('mediavideo'); }
function addAudioEl() { _mediaInsertNew('mediaaudio'); }

function _mediaInsertNew(type) {
  if (typeof pushUndo === 'function') pushUndo();
  const isVideo = type === 'mediavideo';
  const d = {
    id: 'e' + (++ec), type,
    x: 80, y: 80,
    w: isVideo ? 480 : 320, h: isVideo ? 270 : 60,
    mediaSrc: '', mediaSrcType: 'url',
    mvDisplay: 'windowed', mvControls: 'controls', mvStart: 'click',
    maStart: 'click-el', maContinue: 'this', maVolume: 1, maTriggerElIds: [],
    rot: 0, anims: []
  };
  slides[cur].els.push(d);
  mkEl(d);
  const cv = document.getElementById('canvas');
  const el = cv && cv.querySelector('[data-id="' + d.id + '"]');
  if (el && typeof pick === 'function') pick(el);
  if (typeof save === 'function') save();
  if (typeof drawThumbs === 'function') drawThumbs();
  if (typeof saveState === 'function') saveState();
}

// ─── mkEl patch ───────────────────────────────────────────────────────────────
(function() {
  const _orig = window.mkEl;
  window.mkEl = function(d) {
    if (d.type === 'mediavideo' || d.type === 'mediaaudio') { _mkMediaEl(d); return; }
    if (_orig) _orig.apply(this, arguments);
  };
})();

function _mkMediaEl(d) {
  const cv = document.getElementById('canvas'); if (!cv) return;
  const el = document.createElement('div');
  el.className = 'el';
  el.dataset.id = d.id; el.dataset.type = d.type;
  el.dataset.anims = JSON.stringify(d.anims || []);
  el.dataset.rot = d.rot || 0;
  el.style.cssText = `left:${d.x}px;top:${d.y}px;width:${d.w}px;height:${d.h}px;transform:rotate(${d.rot||0}deg);overflow:hidden;`;

  const ec_ = document.createElement('div');
  ec_.className = 'ec';
  ec_.style.cssText = 'width:100%;height:100%;position:relative;pointer-events:none;';
  el.appendChild(ec_);

  // Resize handles
  [{cls:'rh br',dx:1,dy:1,ax:0,ay:0},{cls:'rh tr',dx:1,dy:-1,ax:0,ay:1},
   {cls:'rh bl',dx:-1,dy:1,ax:1,ay:0},{cls:'rh tl',dx:-1,dy:-1,ax:1,ay:1},
   {cls:'rh tm',dx:0,dy:-1,ax:0,ay:1},{cls:'rh bm',dx:0,dy:1,ax:0,ay:0},
   {cls:'rh ml',dx:-1,dy:0,ax:1,ay:0},{cls:'rh mr',dx:1,dy:0,ax:0,ay:0}
  ].forEach(h => { const rh = document.createElement('div'); rh.setAttribute('class', h.cls); if (typeof mkResize === 'function') mkResize(el, rh, h); el.appendChild(rh); });

  if (typeof mkDrag === 'function') mkDrag(el, ec_);
  el.addEventListener('mousedown', ev => {
    const cn = ev.target.className || '';
    if (typeof cn === 'string' && (cn.includes('rh') || cn.includes('db'))) return;
    ev.stopPropagation();
    if (multiSel.size > 1 && multiSel.has(el) && !ev.shiftKey) return;
    if (typeof pickMulti === 'function') pickMulti(el, ev.shiftKey);
    else if (typeof pick === 'function') pick(el);
  });

  cv.appendChild(el);
  _mediaRenderPlayer(el, d);
}

// ─── Editor player rendering ──────────────────────────────────────────────────
function _mediaRenderPlayer(el, d) {
  const ec_ = el.querySelector('.ec'); if (!ec_) return;
  const old = ec_.querySelector('.media-player-wrap'); if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.className = 'media-player-wrap';
  wrap.style.cssText = 'width:100%;height:100%;position:relative;display:flex;flex-direction:column;overflow:hidden;';
  if (d.type === 'mediavideo') _mediaRenderVideo(wrap, d);
  else _mediaRenderAudio(wrap, d);
  ec_.appendChild(wrap);
}

function _mediaRenderVideo(wrap, d) {
  wrap.style.background = '#000';
  const src = d.mediaSrc || '';
  if (src) {
    const v = document.createElement('video');
    v.src = src; v.muted = true; v.preload = 'metadata';
    v.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;flex:1;';
    wrap.appendChild(v);
  } else {
    const ph = document.createElement('div');
    ph.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:rgba(255,255,255,.4);font-family:sans-serif;';
    ph.innerHTML = '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" opacity=".7"/></svg><span style="font-size:11px">Укажите источник в панели →</span>';
    wrap.appendChild(ph);
  }
  if (d.mvControls !== 'none') {
    const bar = document.createElement('div');
    bar.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.6);display:flex;align-items:center;gap:6px;padding:5px 8px;';
    bar.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,.85)" stroke="none"><polygon points="5,3 19,12 5,21"/></svg><div style="flex:1;height:3px;background:rgba(255,255,255,.25);border-radius:2px"></div><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg><span style="font-size:10px;color:rgba(255,255,255,.5);font-family:monospace">0:00</span>';
    wrap.appendChild(bar);
  }
  const lbl = document.createElement('div');
  lbl.style.cssText = 'position:absolute;top:5px;left:5px;background:rgba(0,0,0,.55);color:rgba(255,255,255,.7);font-size:9px;font-family:sans-serif;padding:2px 5px;border-radius:3px;';
  lbl.textContent = (d.mvDisplay === 'fullscreen' ? '⛶' : '▣') + ' ' + (d.mvStart === 'auto' ? 'Авто' : 'По клику');
  wrap.appendChild(lbl);
}

function _mediaRenderAudio(wrap, d) {
  const src = d.mediaSrc || '';
  wrap.style.cssText += 'background:rgba(25,25,45,.92);border:1px solid rgba(255,255,255,.1);border-radius:8px;justify-content:center;box-sizing:border-box;';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:0 12px;width:100%;box-sizing:border-box;';
  row.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.5" style="flex-shrink:0"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    <div style="flex:1;min-width:0;"><div style="font-size:11px;color:rgba(255,255,255,.75);font-family:sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${src ? _mediaShortSrc(src) : 'Укажите источник в панели →'}</div><div style="height:2px;background:rgba(255,255,255,.18);border-radius:2px;margin-top:4px;"></div></div>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,.7)" stroke="none" style="flex-shrink:0"><polygon points="5,3 19,12 5,21"/></svg>`;
  wrap.appendChild(row);
  const modes = {'auto':'▶ Авто','click-el':'🖱 По объекту','click-slide':'🖱 По слайду'};
  const triggerName = d.maStart === 'click-el' && d.maTriggerElId ? _mediaTriggerLabel(d.maTriggerElId) : '';
  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:9px;color:rgba(255,255,255,.35);font-family:sans-serif;text-align:center;padding:2px 0 5px;';
  lbl.textContent = (modes[d.maStart]||'') + (triggerName ? ': '+triggerName : '') + (d.maContinue==='all'?' · 🔁':'');
  wrap.appendChild(lbl);
}

function _mediaShortSrc(src) {
  if (!src) return '—';
  if (src.startsWith('data:')) { const m = src.match(/^data:(audio|video)\/([^;]+)/); return m ? '(файл: '+m[2]+')' : '(файл загружен)'; }
  try { const u = new URL(src); return u.hostname + (u.pathname.length > 1 ? u.pathname.slice(0, 18) : ''); } catch(e) { return src.slice(0, 28); }
}

function _mediaTriggerLabel(elId) {
  if (!elId || !slides[cur]) return elId;
  const d = slides[cur].els.find(e => e.id === elId);
  if (!d) return elId;
  const labels = { text:'Текст', image:'Изображение', shape:'Фигура', icon:'Значок',
    table:'Таблица', code:'Код', markdown:'Markdown', mediavideo:'Видео', mediaaudio:'Аудио' };
  const type = labels[d.type] || d.type;
  // Try to get a short name from content
  let name = '';
  if (d.type === 'text') {
    const tmp = document.createElement('div'); tmp.innerHTML = d.html || ''; name = tmp.textContent.slice(0, 20).trim();
  } else if (d.type === 'image' && d.src) {
    name = d.src.split('/').pop().slice(0, 16);
  }
  return name ? `${type}: "${name}"` : `${type} (${elId})`;
}

// Render chip list for trigger objects
function _mediaSyncTriggerList(d) {
  const list = document.getElementById('map-trigger-list');
  if (!list) return;
  list.innerHTML = '';
  const ids = d.maTriggerElIds || (d.maTriggerElId ? [d.maTriggerElId] : []);
  if (ids.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:10px;color:var(--text3);padding:2px 0;';
    empty.textContent = 'Объекты не выбраны';
    list.appendChild(empty);
    return;
  }
  ids.forEach(elId => {
    const chip = document.createElement('div');
    chip.style.cssText = 'display:flex;align-items:center;gap:5px;background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:3px 7px 3px 8px;';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'flex:1;font-size:10px;color:var(--text);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    lbl.textContent = _mediaTriggerLabel(elId);
    const btn = document.createElement('button');
    btn.style.cssText = 'flex-shrink:0;background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:0 2px;line-height:1;border-radius:3px;';
    btn.textContent = '✕';
    btn.title = 'Убрать связь';
    btn.onmouseenter = () => btn.style.color = 'var(--text)';
    btn.onmouseleave = () => btn.style.color = 'var(--text3)';
    btn.onclick = () => _mediaTriggerRemove(elId);
    chip.appendChild(lbl); chip.appendChild(btn);
    list.appendChild(chip);
  });
}

// ─── Trigger object picker ────────────────────────────────────────────────────
let _mediaPickerActive = false;
let _mediaPickerAudioId = '';

function _mediaTriggerPick() {
  if (!sel) return;
  _mediaPickerAudioId = sel.dataset.id;
  _mediaPickerActive = true;
  const hint = document.getElementById('map-picker-hint');
  const btn = document.getElementById('map-picker-btn');
  if (hint) hint.style.display = 'block';
  if (btn) { btn.textContent = '✕ Отмена'; btn.onclick = _mediaTriggerPickCancel; }

  const cv = document.getElementById('canvas'); if (!cv) return;
  const ov = document.createElement('div');
  ov.id = '_media-picker-ov';
  ov.style.cssText = 'position:absolute;inset:0;z-index:99999;cursor:crosshair;';
  ov.addEventListener('mousedown', function(e) {
    e.stopPropagation(); e.preventDefault();
    const allEls = document.elementsFromPoint(e.clientX, e.clientY);
    ov.remove();
    let target = null;
    for (const el2 of allEls) {
      const found = el2.matches && el2.matches('.el[data-id]') ? el2 : (el2.closest ? el2.closest('.el[data-id]') : null);
      if (found && found.dataset.id !== _mediaPickerAudioId) { target = found; break; }
    }
    if (target) _mediaTriggerPickDone(target.dataset.id);
    else _mediaTriggerPickCancel();
  });
  cv.appendChild(ov);
}

function _mediaTriggerPickDone(elId) {
  _mediaPickerActive = false;
  const hint = document.getElementById('map-picker-hint');
  const btn = document.getElementById('map-picker-btn');
  if (hint) hint.style.display = 'none';
  if (btn) { btn.textContent = '🎯 Выбрать объект'; btn.onclick = _mediaTriggerPick; }

  const audioEl = document.getElementById('canvas') && document.getElementById('canvas').querySelector('[data-id="' + _mediaPickerAudioId + '"]');
  if (audioEl && typeof pick === 'function') pick(audioEl);

  const d = slides[cur] && slides[cur].els.find(e => e.id === _mediaPickerAudioId);
  if (d) {
    if (!d.maTriggerElIds) d.maTriggerElIds = d.maTriggerElId ? [d.maTriggerElId] : [];
    if (!d.maTriggerElIds.includes(elId)) d.maTriggerElIds.push(elId);
    d.maTriggerElId = d.maTriggerElIds[0] || ''; // keep compat
    _mediaSyncTriggerList(d);
    _mediaRenderPlayer(audioEl || sel, d);
    if (typeof save === 'function') save();
  }
}

function _mediaTriggerPickCancel() {
  _mediaPickerActive = false;
  const ov = document.getElementById('_media-picker-ov'); if (ov) ov.remove();
  const hint = document.getElementById('map-picker-hint');
  const btn = document.getElementById('map-picker-btn');
  if (hint) hint.style.display = 'none';
  if (btn) { btn.textContent = '🎯 Выбрать объект'; btn.onclick = _mediaTriggerPick; }
}

function _mediaTriggerRemove(elId) {
  if (!sel) return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id); if (!d) return;
  if (!d.maTriggerElIds) d.maTriggerElIds = d.maTriggerElId ? [d.maTriggerElId] : [];
  d.maTriggerElIds = d.maTriggerElIds.filter(id => id !== elId);
  d.maTriggerElId = d.maTriggerElIds[0] || '';
  _mediaSyncTriggerList(d);
  _mediaRenderPlayer(sel, d);
  if (typeof save === 'function') save();
}

// ─── Props panel ──────────────────────────────────────────────────────────────
function syncMediaProps() {
  if (!sel) return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id); if (!d) return;
  if (d.type === 'mediavideo') {
    const se = document.getElementById('mvp-src'); if (se) se.value = d.mediaSrcType === 'url' ? (d.mediaSrc||'') : '';
    const fn = document.getElementById('mvp-file-name'); if (fn) fn.textContent = d.mediaSrcType === 'data' ? _mediaShortSrc(d.mediaSrc) : '';
    const di = document.getElementById('mvp-display'); if (di) di.value = d.mvDisplay||'windowed';
    const ct = document.getElementById('mvp-controls'); if (ct) ct.value = d.mvControls||'controls';
    const st = document.getElementById('mvp-start'); if (st) st.value = d.mvStart||'click';
  } else {
    const se = document.getElementById('map-src'); if (se) se.value = d.mediaSrcType === 'url' ? (d.mediaSrc||'') : '';
    const fn = document.getElementById('map-file-name'); if (fn) fn.textContent = d.mediaSrcType === 'data' ? _mediaShortSrc(d.mediaSrc) : '';
    const st = document.getElementById('map-start'); if (st) st.value = d.maStart||'click-el';
    const co = document.getElementById('map-continue'); if (co) co.value = d.maContinue||'this';
    const vol = document.getElementById('map-volume'); if (vol) vol.value = d.maVolume != null ? d.maVolume : 1;
    _mediaUpdateAudioHints();
    _mediaSyncTriggerList(d);
  }
}

function _mediaUpdateAudioHints() {
  const s = document.getElementById('map-start');
  const mode = s ? s.value : '';
  const ch = document.getElementById('map-clickslide-hint');
  const tr = document.getElementById('map-trigger-row');
  if (ch) ch.style.display = mode === 'click-slide' ? 'block' : 'none';
  if (tr) tr.style.display = mode === 'click-el' ? 'flex' : 'none';
}

function updateMediaProp(key, val) {
  if (!sel) return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id); if (!d) return;
  d[key] = val;
  _mediaRenderPlayer(sel, d);
  if (key === 'maStart') _mediaUpdateAudioHints();
  if (typeof save === 'function') save();
  if (typeof drawThumbs === 'function') drawThumbs();
}

function updateMediaSrcUrl(isVideo) {
  if (!sel) return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id); if (!d) return;
  const val = document.getElementById(isVideo ? 'mvp-src' : 'map-src').value.trim();
  d.mediaSrc = val; d.mediaSrcType = 'url';
  _mediaRenderPlayer(sel, d);
  if (typeof save === 'function') save();
  if (typeof drawThumbs === 'function') drawThumbs();
}

function updateMediaSrcFile(input, isVideo) {
  if (!sel) return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id); if (!d) return;
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    d.mediaSrc = e.target.result; d.mediaSrcType = 'data';
    const fn = document.getElementById(isVideo ? 'mvp-file-name' : 'map-file-name'); if (fn) fn.textContent = _mediaShortSrc(d.mediaSrc);
    const se = document.getElementById(isVideo ? 'mvp-src' : 'map-src'); if (se) se.value = '';
    _mediaRenderPlayer(sel, d);
    if (typeof save === 'function') save();
    if (typeof drawThumbs === 'function') drawThumbs();
  };
  reader.readAsDataURL(file);
}

// ─── Preview/Stop buttons in props ────────────────────────────────────────────
let _propAudio = null;

function _mediaPreviewPlay() {
  if (!sel) return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d || !d.mediaSrc) return;
  _mediaPreviewStop();
  _propAudio = new Audio(d.mediaSrc);
  _propAudio.volume = d.maVolume != null ? d.maVolume : 1;
  _propAudio.play().catch(() => {});
}

function _mediaPreviewStop() {
  if (_propAudio) { _propAudio.pause(); _propAudio.currentTime = 0; _propAudio = null; }
}

// ─── Patch syncProps ──────────────────────────────────────────────────────────
(function() {
  const _orig = window.syncProps;
  window.syncProps = function() {
    if (typeof _orig === 'function') _orig.apply(this, arguments);
    const vp = document.getElementById('mediavidprops');
    const ap = document.getElementById('mediaaudprops');
    if (!vp || !ap) return;
    const t = sel && sel.dataset.type;
    vp.style.display = t === 'mediavideo' ? 'flex' : 'none';
    if (t === 'mediavideo') { vp.style.flexDirection = 'column'; syncMediaProps(); }
    ap.style.display = t === 'mediaaudio' ? 'flex' : 'none';
    if (t === 'mediaaudio') { ap.style.flexDirection = 'column'; syncMediaProps(); }
  };
})();

// ─── Preview mode ──────────────────────────────────────────────────────────────
// Track all active audio instances keyed by element data ID for reliable cleanup
const _pvAudioMap = new Map(); // dataId -> Audio element
let _pvGlobalAudio = null, _pvGlobalAudioId = null;

(function _patchBuildPSlide() {
  const _orig = window.buildPSlide;
  window.buildPSlide = function(container, idx, transOffset) {
    _orig.apply(this, arguments);
    const s = typeof slides !== 'undefined' ? slides[idx] : null; if (!s) return;
    const hiddenSet = (typeof hiddenElsPerSlide !== 'undefined' ? hiddenElsPerSlide[idx] : null) || new Set();
    const pEls = container.querySelectorAll('.psel');
    let ei = 0;
    s.els.forEach(d => {
      if (hiddenSet.has(d.id)) { ei++; return; }
      const el = pEls[ei++]; if (!el) return;
      if (d.type !== 'mediavideo' && d.type !== 'mediaaudio') return;
      el.innerHTML = ''; el.style.overflow = 'hidden';
      if (d.type === 'mediavideo') _pvVideo(el, d);
      else _pvAudio(el, d, container, s, idx);
    });
  };
})();

function _pvVideo(el, d) {
  const src = d.mediaSrc||'', full = d.mvDisplay==='fullscreen', ctrl = d.mvControls!=='none', auto = d.mvStart==='auto';
  if (full) {
    el.style.cssText += 'background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.3"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,8 16,12 10,16" fill="rgba(255,255,255,.8)" stroke="none"/></svg><span style="font-size:12px;color:rgba(255,255,255,.5);font-family:sans-serif">Нажмите для просмотра</span></div>';
    const open = () => _pvFullscreen(src, ctrl);
    if (auto) setTimeout(open, 80); else el.addEventListener('click', e => { e.stopPropagation(); open(); });
  } else {
    const video = document.createElement('video');
    video.src = src; video.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;background:#000;';
    if (ctrl) video.controls = true; if (auto) { video.autoplay = true; video.muted = true; }
    el.appendChild(video);
    if (!auto && !ctrl) { el.style.cursor='pointer'; el.addEventListener('click', e => { e.stopPropagation(); video.paused ? video.play() : video.pause(); }); }
  }
}

function _pvFullscreen(src, ctrl) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999;display:flex;align-items:center;justify-content:center;';
  const v = document.createElement('video'); v.src=src; v.autoplay=true; if(ctrl)v.controls=true;
  v.style.cssText='max-width:100%;max-height:100%;outline:none;';
  const btn = document.createElement('button'); btn.textContent='✕';
  btn.style.cssText='position:absolute;top:16px;right:20px;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:20px;cursor:pointer;padding:6px 12px;border-radius:6px;';
  const destroy=()=>{v.pause();if(document.body.contains(ov))document.body.removeChild(ov);document.removeEventListener('keydown',onK);};
  const onK=e=>{if(e.key==='Escape')destroy();};
  btn.onclick=destroy; document.addEventListener('keydown',onK);
  ov.appendChild(v); ov.appendChild(btn); document.body.appendChild(ov);
}

function _pvAudio(el, d, container, slide, slideIdx) {
  const src = d.mediaSrc||'', mode = d.maStart||'click-el', cont = d.maContinue==='all';
  const vol = d.maVolume != null ? d.maVolume : 1;
  const ic = mode==='auto'?'rgba(255,255,255,.3)':'rgba(255,255,255,.7)';
  el.style.cssText += 'display:flex;align-items:center;justify-content:center;';
  el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none;">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${ic}" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    <span style="font-size:9px;color:${ic};font-family:sans-serif">${{'auto':'▶ Авто','click-el':'🖱 Клик','click-slide':'🖱 Слайд'}[mode]||''}</span></div>`;
  if (!src) return;

  // Create or reuse audio
  let audio;
  if (cont && _pvGlobalAudio && _pvGlobalAudioId === d.id) {
    audio = _pvGlobalAudio;
  } else {
    if (_pvGlobalAudio && _pvGlobalAudioId !== d.id) { _pvGlobalAudio.pause(); _pvGlobalAudio = null; }
    audio = new Audio(src);
    audio.volume = vol;
    _pvAudioMap.set(d.id, audio);
    if (cont) { _pvGlobalAudio = audio; _pvGlobalAudioId = d.id; }
  }

  const upIcon = p => { const s = el.querySelector('svg'); if (s) s.style.stroke = p ? 'rgba(99,210,150,.9)' : ic; };
  audio.addEventListener('play', () => upIcon(true));
  audio.addEventListener('pause', () => upIcon(false));
  audio.addEventListener('ended', () => upIcon(false));

  if (mode === 'auto') {
    audio.play().catch(() => {});
  } else if (mode === 'click-el') {
    // Support both old single id and new array
    const trigIds = d.maTriggerElIds && d.maTriggerElIds.length ? d.maTriggerElIds : (d.maTriggerElId ? [d.maTriggerElId] : []);
    if (trigIds.length > 0) {
      trigIds.forEach(trigId => {
        const idx2 = slide && slide.els ? slide.els.findIndex(e => e.id === trigId) : -1;
        const trigEl = idx2 >= 0 ? container.querySelectorAll('.psel')[idx2] : null;
        if (trigEl) {
          trigEl.style.cursor = 'pointer';
          trigEl.addEventListener('click', e => { e.stopPropagation(); audio.currentTime = 0; audio.play(); });
        }
      });
    } else {
      el.style.cursor = 'pointer';
      el.addEventListener('click', e => { e.stopPropagation(); audio.currentTime = 0; audio.play(); });
    }
  } else if (mode === 'click-slide') {
    el.style.pointerEvents = 'none';
    if (container) {
      let started = false;
      const prev = container._fireNextStep;
      container._fireNextStep = function() {
        if (!started) { started = true; audio.play().catch(() => {}); return true; }
        return prev ? prev() : false;
      };
    }
  }
}

// ─── Stop audio when leaving slides or preview ────────────────────────────────
function _mediaStopAllPreviewAudio() {
  // Stop all non-persistent audio (those not marked as continue-across-slides)
  _pvAudioMap.forEach((audio, id) => {
    if (id !== _pvGlobalAudioId) {
      try { audio.pause(); audio.currentTime = 0; } catch(e) {}
      _pvAudioMap.delete(id);
    }
  });
}

(function _patchPreviewCleanup() {
  const _origF = window.finalizePreview;
  window.finalizePreview = function(a, b, to) {
    // Stop non-persistent audio from the slide we're leaving
    // "a" becomes psb (going away), find all audio in it and stop non-global ones
    _pvAudioMap.forEach((audio, id) => {
      if (id !== _pvGlobalAudioId) { try { audio.pause(); audio.currentTime = 0; } catch(e) {} _pvAudioMap.delete(id); }
    });
    if (typeof _origF === 'function') _origF.apply(this, arguments);
  };

  const _origStop = window.stopPreview;
  window.stopPreview = function() {
    // Stop ALL audio including global persistent
    _pvAudioMap.forEach((audio) => { try { audio.pause(); audio.currentTime = 0; } catch(e) {} });
    _pvAudioMap.clear();
    if (_pvGlobalAudio) { try { _pvGlobalAudio.pause(); } catch(e) {} _pvGlobalAudio = null; _pvGlobalAudioId = null; }
    if (_propAudio) { _propAudio.pause(); }
    if (typeof _origStop === 'function') _origStop.apply(this, arguments);
  };
})();
