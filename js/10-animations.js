// ══════════════ ANIMATION PANEL ══════════════
const ANIM_CSS={
  fadeIn:'el-fadein',slideUp:'el-slideup',slideDown:'el-slidedown',slideLeft:'el-slideleft',slideRight:'el-slideright',
  zoomIn:'el-zoomin',spinIn:'el-spin',bounceIn:'el-bounce',
  fadeOut:'el-fadeout',slideOut:'el-slideout',zoomOut:'el-zoomout',
  pulse:'el-pulse',shake:'el-shake',flash:'el-flash',
  dance:'el-dance',
  swing:'el-swing',
};

const ANIM_CATS = [
  {
    cat: 'entrance', label: 'Вход',
    items: [
      {name:'fadeIn',    label:'Появление',  icon:'✨'},
      {name:'slideUp',   label:'Подъём',     icon:'⬆'},
      {name:'slideDown', label:'Спуск',      icon:'⬇'},
      {name:'slideLeft', label:'Влево',      icon:'⬅'},
      {name:'slideRight',label:'Вправо',     icon:'➡'},
      {name:'zoomIn',    label:'Увеличение', icon:'🔍'},
      {name:'bounceIn',  label:'Отскок',     icon:'⚡'},
      {name:'spinIn',    label:'Вращение',   icon:'🔄'},
    ]
  },
  {
    cat: 'emphasis', label: 'Выделение',
    items: [
      {name:'pulse',  label:'Пульсация', icon:'💓'},
      {name:'shake',  label:'Дрожание',  icon:'〰'},
      {name:'flash',  label:'Мигание',   icon:'🔦'},
      {name:'rotate', label:'Вращение',  icon:'🔁'},
    ]
  },
  {
    cat: 'exit', label: 'Выход',
    items: [
      {name:'fadeOut',  label:'Исчезновение', icon:'💨'},
      {name:'slideOut', label:'Выезд',        icon:'↩'},
      {name:'zoomOut',  label:'Уменьшение',   icon:'🔎'},
      {name:'splitHalf', label:'Пополам',     icon:'✂️'},
    ]
  },
  {
    cat: 'motion', label: 'Движение',
    items: [
      {name:'moveTo',   label:'Переместить', icon:'↗'},
      {name:'orbitTo',  label:'По окружности', icon:'⭕'},
    ]
  },
  {
    cat: 'live', label: 'Живая',
    items: [
      {name:'dance',      label:'Танец',        icon:'💃'},
      {name:'swing',      label:'Качение',      icon:'🎷'},
      {name:'float',      label:'Плавание',     icon:'🌊'},
      {name:'particles',  label:'Частицы',      icon:'✨'},
      {name:'typewriter', label:'Смена текста',  icon:'⌨'},
      {name:'captionSlide', label:'Титр в сторону', icon:'📰'},
    ]
  },
];

const ANIM_INFO = {};
ANIM_CATS.forEach(g => g.items.forEach(it => { ANIM_INFO[it.name] = {label:it.label, icon:it.icon, cat:g.cat}; }));

window.PARTICLES_DEFAULTS = {
  particleCount: 14,
  ptDir: 0,
  ptLife: 900,
  ptSizeRand: 51,
  ptRot: 32,
  ptSpread: 100,
  duration: 3550,
  swingCount: 1
};

// ── Float organic smooth drift ───────────────────────────────────
// Uses integer-frequency sine waves so the loop is perfectly seamless.
// Each wave completes a whole number of cycles → t=0 and t=1 identical.
function _floatSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function _floatRng(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function _floatFrames(fw, fh, seed) {
  const mx = fw * 0.06, my = fh * 0.06;
  const N = 32; // many keyframes = smooth
  const rnd = seed != null ? _floatRng(seed) : Math.random.bind(Math);
  // Integer frequencies (1,2,3) ensure perfect loop: sin(n*2π*1+ph)=sin(ph)
  const mkW = () => [1,2,3].map(freq => ({
    amp: 0.2 + rnd() * 0.8,
    freq,
    phase: rnd() * Math.PI * 2
  }));
  const rx = mkW(), ry = mkW();
  const smp = (ws, t) => {
    const s = ws.reduce((a,w) => a + w.amp * Math.sin(w.freq * t * Math.PI * 2 + w.phase), 0);
    return s / ws.reduce((a,w) => a + w.amp, 0);
  };
  return Array.from({length: N + 1}, (_, i) => {
    const t = i / N;
    const x = Math.round(smp(rx, t) * mx);
    const y = Math.round(smp(ry, t) * my);
    const frame = {transform: `translate(${x}px,${y}px)`};
    if (i < N) frame.easing = 'ease-in-out';
    return frame;
  });
}

window._floatGroupBounds = function(members) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  (members || []).forEach(m => {
    const x = m.x || 0, y = m.y || 0, w = m.w || 0, h = m.h || 0;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
  });
  if (!isFinite(minX)) return { w: 200, h: 200 };
  return { w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
};

window._floatFramesForGroup = function(members, groupId) {
  const b = window._floatGroupBounds(members);
  const seed = groupId ? _floatSeed(String(groupId)) : undefined;
  return _floatFrames(b.w, b.h, seed);
};

window._floatPad = function(fw, fh) {
  return { mx: Math.round(fw * 0.06), my: Math.round(fh * 0.06) };
};

window._ensureFloatWrap = function(el, fw, fh) {
  const { mx, my } = window._floatPad(fw, fh);
  let wrap = el.querySelector('._float_wrap');
  const content = window._animContentTarget(el);
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = '_float_wrap';
    if (content && content !== el && content.parentNode) {
      content.parentNode.insertBefore(wrap, content);
      wrap.appendChild(content);
    } else {
      while (el.firstChild) wrap.appendChild(el.firstChild);
      el.appendChild(wrap);
    }
  }
  wrap.style.cssText = 'position:absolute;left:' + (-mx) + 'px;top:' + (-my) + 'px;width:' + (fw + 2 * mx) + 'px;height:' + (fh + 2 * my) + 'px;overflow:visible;pointer-events:none;border-radius:inherit;';
  const child = wrap.firstElementChild;
  if (child) {
    child.style.position = 'absolute';
    child.style.left = mx + 'px';
    child.style.top = my + 'px';
    child.style.width = fw + 'px';
    child.style.height = fh + 'px';
    child.style.boxSizing = 'border-box';
  }
  if (el._floatOvSaved === undefined) el._floatOvSaved = el.style.overflow || '';
  el.style.overflow = 'visible';
  return wrap.firstElementChild || wrap;
};

// caption/splitHalf engine: js/10c-anim-engine.js

const _DANCE_PREVIEW_FRAMES = [
  { transform: 'scaleX(1) scaleY(1) rotate(0deg)', easing: 'cubic-bezier(.42,0,.3,1.4)' },
  { transform: 'scaleX(1.12) scaleY(0.82) rotate(-2deg)', easing: 'cubic-bezier(.6,0,.4,1.3)' },
  { transform: 'scaleX(0.9) scaleY(1.1) rotate(1.5deg)', easing: 'cubic-bezier(.42,0,.3,1.4)' },
  { transform: 'scaleX(1.1) scaleY(0.85) rotate(-1.5deg)', easing: 'cubic-bezier(.6,0,.4,1.3)' },
  { transform: 'scaleX(0.92) scaleY(1.08) rotate(2deg)', easing: 'cubic-bezier(.42,0,.3,1.4)' },
  { transform: 'scaleX(1.06) scaleY(0.9) rotate(-1deg)', easing: 'cubic-bezier(.5,0,.35,1.3)' },
  { transform: 'scaleX(0.97) scaleY(1.03) rotate(0.5deg)', easing: 'cubic-bezier(.4,0,.6,1)' },
  { transform: 'scaleX(1) scaleY(1) rotate(0deg)' }
];

let _animPreviewTimer = null;

const _LIVE_WRAP_CSS = 'position:absolute;inset:0;pointer-events:none;overflow:visible;border-radius:inherit;';

window._isTextBlock = function(el) {
  return !!(el && (el.dataset.type === 'text' || el.dataset.type === 'markdown'));
};

window._ensureTextBodyWrap = function(el) {
  if (!window._isTextBlock(el)) return el.querySelector('.ec') || el.querySelector('.psel-txt') || el;
  let body = el.querySelector('._text_body');
  if (body) return body;
  body = document.createElement('div');
  body.className = '_text_body';
  body.style.cssText = 'position:absolute;inset:0;border-radius:inherit;overflow:hidden;z-index:0;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;';
  const bg = el.querySelector('.el-bg-layer');
  const ec = el.querySelector('.ec') || el.querySelector('.tel');
  const anchor = bg || ec;
  if (anchor && anchor.parentNode === el) {
    el.insertBefore(body, anchor);
    if (bg) body.appendChild(bg);
    if (ec) body.appendChild(ec);
  } else if (ec && ec.parentNode === el) {
    el.insertBefore(body, ec);
    body.appendChild(ec);
  }
  if (typeof applyTextRadius === 'function') applyTextRadius(el);
  return body;
};

window._animContentTarget = function(el) {
  if (window._isTextBlock(el)) return window._ensureTextBodyWrap(el);
  return el.querySelector('.ec') || el.querySelector('.iel') || el.querySelector('.psel-txt') || el;
};

window._ensureDanceWrap = function(el) {
  let wrap = el.querySelector('._dance_wrap');
  if (wrap) return wrap;
  wrap = document.createElement('div');
  wrap.className = '_dance_wrap';
  wrap.style.cssText = _LIVE_WRAP_CSS;
  const content = window._animContentTarget(el);
  if (content && content !== el && content.parentNode) {
    content.parentNode.insertBefore(wrap, content);
    wrap.appendChild(content);
  } else {
    while (el.firstChild) wrap.appendChild(el.firstChild);
    el.appendChild(wrap);
  }
  return wrap;
};

function _restoreTextBodyLayout(body) {
  if (!body || !body.classList.contains('_text_body')) return;
  body.style.position = 'absolute';
  body.style.left = '0';
  body.style.top = '0';
  body.style.width = '100%';
  body.style.height = '100%';
  body.style.boxSizing = 'border-box';
  body.style.transform = '';
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.alignItems = 'stretch';
}

function _unwrapLiveWrap(el, className) {
  const wrap = el && el.querySelector(className);
  if (!wrap || !wrap.parentNode) return;
  while (wrap.firstChild) wrap.parentNode.insertBefore(wrap.firstChild, wrap);
  wrap.remove();
}

window._resetLiveAnimPreview = function(el, unwrap) {
  if (!el) return;
  if (el._floatOvSaved !== undefined) {
    el.style.overflow = el._floatOvSaved;
    delete el._floatOvSaved;
  }
  const fWrap = el.querySelector('._float_wrap');
  if (fWrap) {
    const child = fWrap.firstElementChild;
    [fWrap, child].forEach(n => {
      if (!n) return;
      n.getAnimations().forEach(a => { try { a.cancel(); } catch (e) {} });
    });
    if (child) {
      child.style.transform = '';
      if (child.classList.contains('_text_body')) _restoreTextBodyLayout(child);
      else {
        child.style.position = '';
        child.style.left = '';
        child.style.top = '';
        child.style.width = '';
        child.style.height = '';
        child.style.boxSizing = '';
      }
    }
    fWrap.style.transform = '';
    if (unwrap) _unwrapLiveWrap(el, '._float_wrap');
  }
  const dWrap = el.querySelector('._dance_wrap');
  if (dWrap) {
    dWrap.getAnimations().forEach(a => { try { a.cancel(); } catch (e) {} });
    dWrap.style.transform = '';
    if (unwrap) _unwrapLiveWrap(el, '._dance_wrap');
  }
  if (el.dataset.type === 'text') {
    if (typeof applyTextRadius === 'function') applyTextRadius(el);
    if (el.dataset.valign && typeof applyTextVAlign === 'function') applyTextVAlign(el, el.dataset.valign);
  }
};

window._animGroupDomEls = function(el) {
  if (!el) return [];
  const gid = el.dataset && el.dataset.groupId;
  if (!gid) return [el];
  const cv = document.getElementById('canvas');
  if (!cv) return [el];
  const gEls = Array.from(cv.querySelectorAll('.el[data-group-id="' + gid + '"]'));
  return gEls.length > 1 ? gEls : [el];
};

window._clearAnimHoverPreview = function(el) {
  if (!el) return;
  clearTimeout(_animPreviewTimer);
  if (window._activeCaptionRun) {
    window._activeCaptionRun.cancelled = true;
    clearTimeout(window._activeCaptionRun.holdTimer);
    window._activeCaptionRun = null;
  }
  window._animGroupDomEls(el).forEach(e => {
    if (typeof window._resetCaptionSlide === 'function') window._resetCaptionSlide(e, true);
    if (typeof window._resetSplitHalf === 'function') window._resetSplitHalf(e, true);
    e.style.visibility = '';
    [e, e.querySelector('._text_body'), e.querySelector('.ec'), e.querySelector('.tel'), e.querySelector('.iel'), e.querySelector('.shape-text'), e.querySelector('._dance_wrap')].forEach(t => {
      if (!t) return;
      t.getAnimations().forEach(a => { try { a.cancel(); } catch (err) {} });
      t.style.animation = '';
      t.style.transform = t === e ? (t.dataset.rot ? `rotate(${t.dataset.rot}deg)` : '') : '';
    });
    if (typeof window._resetLiveAnimPreview === 'function') window._resetLiveAnimPreview(e, true);
    if (typeof window._resetParticles === 'function') window._resetParticles(e);
  });
};

// Exposed globals so inline onclick handlers can access them
window._selectedAnimName = null;
window._selectedAnimCat  = null;

(function(){
  let _animDragJustEnded = false;
  const _sel       = ()=> (typeof sel!=='undefined')?sel:null;
  const _slides    = ()=> (typeof slides!=='undefined')?slides:[];
  const _cur       = ()=> (typeof cur!=='undefined')?cur:0;
  const _save      = ()=> typeof save      ==='function'&&save();
  const _saveState = ()=> typeof saveState ==='function'&&saveState();
  const _pushUndo  = ()=> typeof pushUndo  ==='function'&&pushUndo();
  const _toast     = (m,t)=> typeof toast  ==='function'&&toast(m,t);

  function _animCanvas() { return document.getElementById('canvas'); }

  function _slide() {
    const all = _slides();
    const i = _cur();
    return all && all[i] ? all[i] : null;
  }

  function _animGroupDomEls(el) {
    return typeof window._animGroupDomEls === 'function' ? window._animGroupDomEls(el) : (el ? [el] : []);
  }

  function _animGroupData(el) {
    const s = _slide();
    if (!s || !el) return [];
    return _animGroupDomEls(el).map(dom => {
      const d = s.els.find(x => x.id === dom.dataset.id);
      return d ? { dom, d } : null;
    }).filter(Boolean);
  }

  function _animGroupDataById(elId) {
    const s = _slide();
    if (!s) return [];
    const d = s.els.find(x => x.id === elId);
    if (!d) return [];
    if (d.groupId) {
      const members = s.els.filter(x => x.groupId === d.groupId);
      if (members.length > 1) {
        const cv = _animCanvas();
        return members.map(md => {
          const dom = cv && cv.querySelector('.el[data-id="' + md.id + '"]');
          return { dom: dom || null, d: md };
        });
      }
    }
    const cv = _animCanvas();
    const dom = cv && cv.querySelector('.el[data-id="' + elId + '"]');
    return [{ dom: dom || null, d }];
  }

  function _syncDomAnims(pairs) {
    const cv = _animCanvas();
    if (!cv) return;
    pairs.forEach(({ dom, d }) => {
      const node = dom || cv.querySelector('.el[data-id="' + d.id + '"]');
      if (node) node.dataset.anims = JSON.stringify(d.anims || []);
    });
  }

  function _repairAppletAnimRefsAfterChange() {
    const slide = _slides()[_cur()];
    if (!slide || typeof window.repairAppletAnimRefs !== 'function') return;
    if (!window.repairAppletAnimRefs(slide)) return;
    if (typeof window.syncAppletAnimRefsToDom === 'function') window.syncAppletAnimRefsToDom(_cur());
  }

  function _animOrderKey(elId, ai) { return elId + ':' + ai; }

  function _slideAnimLeader(d, slide) {
    if (!d || !d.groupId || !slide || !slide.els) return d;
    const members = slide.els.filter(x => x.groupId === d.groupId);
    if (members.length <= 1) return d;
    for (let i = 0; i < slide.els.length; i++) {
      if (members.some(m => m.id === slide.els[i].id)) return slide.els[i];
    }
    return d;
  }

  function _ensureAnimOrder(slide) {
    if (!slide) return;
    const entries = [];
    const used = new Set();
    const _isElSpec = typeof window._animIsElementSpecific === 'function'
      ? window._animIsElementSpecific
      : (n) => n === 'particles' || n === 'captionSlide' || n === 'splitHalf' || n === 'typewriter';

    const pushEntry = (elId, ai) => {
      const d = slide.els && slide.els.find(x => x.id === elId);
      if (!d || !d.anims || ai < 0 || ai >= d.anims.length) return;
      const a = d.anims[ai];
      const leader = _slideAnimLeader(d, slide);
      const storeId = _isElSpec(a.name) ? d.id : leader.id;
      const k = _animOrderKey(storeId, ai);
      if (used.has(k)) return;
      used.add(k);
      entries.push({ elId: storeId, ai });
    };

    if (Array.isArray(slide.animOrder)) {
      slide.animOrder.forEach(({ elId, ai }) => pushEntry(elId, +ai));
    }

    if (slide.els) {
      slide.els.forEach(d => {
        if (d._isDecor) return;
        (d.anims || []).forEach((a, ai) => {
          if (_isElSpec(a.name)) {
            pushEntry(d.id, ai);
            return;
          }
          if (d.groupId) {
            const leader = _slideAnimLeader(d, slide);
            if (leader.id !== d.id) return;
          }
          pushEntry(d.id, ai);
        });
      });
    }

    slide.animOrder = entries;
  }

  window._ensureAnimOrder = _ensureAnimOrder;

  window._buildSlideAnimGlobalList = function(slide) {
    const list = [];
    if (!slide || !slide.els) return list;
    _ensureAnimOrder(slide);
    slide.animOrder.forEach(({ elId, ai }) => {
      const d = slide.els.find(x => x.id === elId);
      if (!d || !d.anims || !d.anims[ai]) return;
      list.push({ d, a: d.anims[ai], i: ai });
    });
    return list;
  };

  function _cloneAnimsForMember(sourceAnims, domEl) {
    if (!sourceAnims || !sourceAnims.length) return [];
    const tel = domEl && (domEl.querySelector('.tel') || domEl.querySelector('.shape-text') || domEl.querySelector('.ec'));
    const html = tel ? tel.innerHTML : '';
    let prevTo = html;
    return sourceAnims.map(a => {
      const copy = JSON.parse(JSON.stringify(a));
      if (copy.name === 'typewriter') {
        copy.fromHtml = prevTo;
        copy.toHtml = (a.fromHtml === a.toHtml) ? html : (a.toHtml || html);
        prevTo = copy.toHtml;
      }
      return copy;
    });
  }

  function _mergeGroupAnimsFromLeader(leaderAnims, memberAnims, dom) {
    const _isElSpec = typeof window._animIsElementSpecific === 'function'
      ? window._animIsElementSpecific
      : (n) => n === 'particles' || n === 'captionSlide' || n === 'splitHalf' || n === 'typewriter';
    const kept = (memberAnims || []).filter(a => _isElSpec(a.name));
    const shared = (leaderAnims || []).filter(a => !_isElSpec(a.name));
    return _cloneAnimsForMember(shared, dom).concat(kept);
  }

  function _syncAnimsOrderToGroup(elId, newAnims) {
    const s = _slides()[_cur()];
    if (!s) return;
    const d = s.els.find(x => x.id === elId);
    if (!d || !d.groupId) return;
    const cv = _animCanvas();
    s.els.forEach(md => {
      if (md.groupId !== d.groupId || md.id === elId) return;
      const dom = cv && cv.querySelector('.el[data-id="' + md.id + '"]');
      md.anims = _mergeGroupAnimsFromLeader(newAnims, md.anims, dom);
      if (dom) dom.dataset.anims = JSON.stringify(md.anims);
    });
  }

  window._syncGroupAnimsOnGroup = function(groupId, leaderId) {
    const s = _slides()[_cur()];
    if (!s || !groupId) return;
    const members = s.els.filter(x => x.groupId === groupId);
    if (members.length < 2) return;
    const leader = members.find(x => x.id === leaderId) || members.reduce((best, m) =>
      ((m.anims && m.anims.length) > (best.anims && best.anims.length) ? m : best), members[0]);
    if (!leader.anims || !leader.anims.length) return;
    const cv = _animCanvas();
    members.forEach(md => {
      if (md.id === leader.id) return;
      const dom = cv && cv.querySelector('.el[data-id="' + md.id + '"]');
      md.anims = _mergeGroupAnimsFromLeader(leader.anims, md.anims, dom);
      if (dom) dom.dataset.anims = JSON.stringify(md.anims);
    });
  };

  function _makeAnim(animName, cat, domEl, d) {
    const defDur = window._CFG_ANIM_DEFAULT_DURATION != null ? window._CFG_ANIM_DEFAULT_DURATION : 600;
    const defDelay = window._CFG_ANIM_DEFAULT_DELAY != null ? window._CFG_ANIM_DEFAULT_DELAY : 0;
    const anim = { name: animName, cat, duration: defDur, delay: defDelay, trigger: 'auto' };
    if (animName === 'moveTo') { anim.tx = 100; anim.ty = 0; }
    if (animName === 'orbitTo') { anim.orbitR = 120; anim.orbitDir = 'cw'; anim.orbitDeg = 360; anim.orbitCx = 0; anim.orbitCy = -120; }
    if (animName === 'rotate') { anim.rotateDir = 'cw'; anim.rotateDeg = 360; }
    if (animName === 'dance') { anim.swingCount = 1; anim.duration = 1200; }
    if (animName === 'float') { anim.swingCount = 10; anim.duration = 5000; }
    if (animName === 'particles') {
      Object.assign(anim, window.PARTICLES_DEFAULTS);
    }
    if (animName === 'captionSlide') { anim.holdDuration = 2000; anim.captionDir = 'right'; }
    if (animName === 'splitHalf') { anim.duration = 800; }
    if (animName === 'typewriter') {
      anim.charDelay = 40;
      const _prevTw = (d.anims || []).filter(x => x.name === 'typewriter');
      if (_prevTw.length > 0) {
        anim.fromHtml = _prevTw[_prevTw.length - 1].toHtml || '';
        anim.toHtml = _prevTw[_prevTw.length - 1].toHtml || '';
      } else {
        const _tel = domEl.querySelector('.tel') || domEl.querySelector('.shape-text') || domEl.querySelector('.ec');
        anim.fromHtml = _tel ? _tel.innerHTML : '';
        anim.toHtml = _tel ? _tel.innerHTML : '';
      }
    }
    return anim;
  }

  window.openAnimPanel = function(){
    try{
      if(typeof window._setAnimTabActive==='function') window._setAnimTabActive(true);
      // Show anim panel in props (handled by 04-ui.js switchTab)
      // Just ensure panel body exists and render
      const wrap = document.getElementById('props-anim-wrap');
      const body = document.getElementById('anim-panel-body');
      if(wrap && body && !window._animInProps){
        wrap.appendChild(body);
        window._animInProps = true;
      }
      if(wrap) wrap.style.display='flex';
      const scroll = document.getElementById('props-scroll');
      if(scroll) scroll.style.display='none';
      renderAnimPanel();
    }catch(e){ console.warn('[10-animations] openAnimPanel:', e.message); }
  };

  window.closeAnimPanel = function(){
    try{
      if(typeof window._setAnimTabActive==='function') window._setAnimTabActive(false);
      if (typeof window._animTriggerPickCancel === 'function') window._animTriggerPickCancel();
      const wrap = document.getElementById('props-anim-wrap');
      const scroll = document.getElementById('props-scroll');
      if(wrap) wrap.style.display='none';
      if(scroll) scroll.style.display='';
    }catch(e){}
  };

  function _animTriggerLabel(elId) {
    if (!elId) return '';
    const s = _slides()[_cur()];
    if (!s) return elId;
    const dd = s.els.find(e => e.id === elId);
    if (!dd) return elId;
    const labels = { text:'Текст', image:'Изображение', shape:'Фигура', icon:'Значок', table:'Таблица', code:'Код', markdown:'Markdown', mediavideo:'Видео', mediaaudio:'Аудио', applet:'Аплет' };
    const type = labels[dd.type] || dd.type;
    let name = '';
    if (dd.type === 'applet') {
      if (dd.appletId === 'counter') return '🔢 Счётчик';
      if (dd.appletId === 'timer') return '⏱ Таймер';
      if (dd.appletId === 'generator') return '🎲 Генератор';
      return 'Аплет';
    }
    if (dd.type === 'text') {
      const tmp = document.createElement('div');
      tmp.innerHTML = dd.html || '';
      name = tmp.textContent.slice(0, 24).trim();
    } else if (dd.type === 'image' && dd.src) {
      name = dd.src.split('/').pop().slice(0, 20);
    }
    return name ? `${type}: ${name}` : type;
  }

  window._animPickerCtx = null;
  let _animPickEscHandler = null;

  window._animTriggerPickCancel = function() {
    window._animPickerCtx = null;
    const ov = document.getElementById('_anim-picker-ov');
    if (ov) ov.remove();
    document.querySelectorAll('.anim-trig-pick-hint').forEach(h => { h.style.display = 'none'; });
    if (_animPickEscHandler) {
      document.removeEventListener('keydown', _animPickEscHandler);
      _animPickEscHandler = null;
    }
  };

  function _rememberPreNavTrigger(anim, trigSelVal) {
    if (!anim) return;
    const t = (anim.trigger && anim.trigger !== 'nav') ? anim.trigger : (trigSelVal || 'auto');
    if (t === 'nav') return;
    anim.preNavTrigger = t;
    if (t === 'element' && anim.triggerElId) anim.preNavTriggerElId = anim.triggerElId;
    else if ((t === 'counter' || t === 'timer') && anim.triggerElId) anim.preNavTriggerElId = anim.triggerElId;
    else delete anim.preNavTriggerElId;
  }

  function _restorePreNavChanges(anim) {
    const t = anim.preNavTrigger || 'auto';
    const changes = { trigger: t, navTarget: undefined };
    if (t === 'element' && anim.preNavTriggerElId) changes.triggerElId = anim.preNavTriggerElId;
    else if ((t === 'counter' || t === 'timer') && anim.preNavTriggerElId) changes.triggerElId = anim.preNavTriggerElId;
    return changes;
  }

  window._animTriggerPick = function(ownerElId, animIdx) {
    window._animPickerCtx = { ownerElId, animIdx };
    document.querySelectorAll('.anim-trig-pick-hint').forEach(h => { h.style.display = 'none'; });
    const row = document.querySelector('.anim-row[data-el-id="' + ownerElId + '"][data-ai="' + animIdx + '"]');
    const hint = row && row.querySelector('.anim-trig-pick-hint');
    if (hint) hint.style.display = 'block';
    const cv = document.getElementById('canvas');
    if (!cv) return;
    let ov = document.getElementById('_anim-picker-ov');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = '_anim-picker-ov';
    ov.style.cssText = 'position:absolute;inset:0;z-index:99999;cursor:crosshair;';
    ov.addEventListener('mousedown', function(e) {
      e.stopPropagation();
      e.preventDefault();
      ov.remove();
      const allEls = document.elementsFromPoint(e.clientX, e.clientY);
      let target = null;
      for (const el2 of allEls) {
        const found = el2.matches && el2.matches('.el[data-id]') ? el2 : (el2.closest ? el2.closest('.el[data-id]') : null);
        if (found && !found.classList.contains('decor-el')) { target = found; break; }
      }
      if (target && window._animPickerCtx) {
        const { ownerElId, animIdx } = window._animPickerCtx;
        const s = _slides()[_cur()];
        const dd = s && s.els.find(x => x.id === ownerElId);
        const anim = dd && dd.anims && dd.anims[animIdx];
        const needApplet = anim && (anim.trigger === 'counter' ? 'counter' : anim.trigger === 'timer' ? 'timer' : null);
        if (needApplet) {
          const td = s.els.find(x => x.id === target.dataset.id);
          if (!td || td.type !== 'applet' || td.appletId !== needApplet) {
            window._animTriggerPickCancel();
            return;
          }
        }
        if (anim) {
          anim.preNavTrigger = anim.trigger || 'element';
          anim.preNavTriggerElId = target.dataset.id;
        }
        updateAnimProp(ownerElId, animIdx, 'triggerElId', target.dataset.id);
        window._animPickerCtx = null;
        _refreshAnimTrigPickRow(ownerElId, animIdx);
        window._animTriggerPickCancel();
      } else {
        window._animTriggerPickCancel();
      }
    });
    cv.appendChild(ov);
    if (_animPickEscHandler) document.removeEventListener('keydown', _animPickEscHandler);
    _animPickEscHandler = function(e) {
      if (e.key === 'Escape') window._animTriggerPickCancel();
    };
    document.addEventListener('keydown', _animPickEscHandler);
  };

  window._animTriggerClear = function(ownerElId, animIdx) {
    updateAnimProp(ownerElId, animIdx, 'triggerElId', undefined);
    _refreshAnimTrigPickRow(ownerElId, animIdx);
  };

  function _readAnimLive(elId, animIdx, fallback) {
    try {
      const cv = _animCanvas();
      const dom = cv && cv.querySelector('.el[data-id="' + elId + '"]');
      if (dom && dom.dataset.anims) {
        const parsed = JSON.parse(dom.dataset.anims);
        if (parsed[animIdx]) return parsed[animIdx];
      }
    } catch (e) {}
    return fallback;
  }

  function _setAnimTriggerBatch(elId, animIdx, changes) {
    const targets = _animGroupDataById(elId);
    targets.forEach(({ d: dd }) => {
      if (!dd.anims || !dd.anims[animIdx]) return;
      const anim = dd.anims[animIdx];
      Object.keys(changes).forEach(k => {
        if (changes[k] === undefined) delete anim[k];
        else anim[k] = changes[k];
      });
      if (changes.trigger && changes.trigger !== 'nav') {
        anim.preNavTrigger = changes.trigger;
        if (changes.trigger === 'element' || changes.trigger === 'counter' || changes.trigger === 'timer') {
          if (changes.triggerElId) anim.preNavTriggerElId = changes.triggerElId;
          else if (anim.triggerElId) anim.preNavTriggerElId = anim.triggerElId;
        } else delete anim.preNavTriggerElId;
      }
    });
    _syncDomAnims(targets);
    const row = document.querySelector('.anim-row[data-el-id="' + elId + '"][data-ai="' + animIdx + '"]');
    if (row && targets[0]) row.dataset.animJson = JSON.stringify(targets[0].d.anims[animIdx]);
    _save(); _saveState();
    const slide = typeof slides !== 'undefined' && typeof cur !== 'undefined' ? slides[cur] : null;
    if (changes.trigger === 'withPrev' && slide && typeof window._alignAnimWithPrev === 'function') {
      window._alignAnimWithPrev(slide, elId, animIdx);
    }
    if (typeof window._refreshAnimTimeline === 'function') window._refreshAnimTimeline();
    if (typeof _syncAppletPropsPanel === 'function') _syncAppletPropsPanel();
  }

  window._setAnimTriggerBatch = _setAnimTriggerBatch;

  window._flushAnimPanelToDom = function() {
    try {
      document.querySelectorAll('.anim-row[data-el-id]').forEach(row => {
        const elId = row.dataset.elId;
        const ai = parseInt(row.dataset.ai, 10);
        if (!elId || isNaN(ai)) return;
        const navCheck = row.querySelector('.anim-nav-check');
        const navSel = row.querySelector('.anim-nav-row select');
        const trigSel = row.querySelector('.anim-trig-sel');
        if (!navCheck || !navCheck.checked) return;

        const targets = _animGroupDataById(elId);
        if (!targets.length) return;

        targets.forEach(({ d: dd }) => {
          const anim = dd.anims && dd.anims[ai];
          if (!anim) return;
          const curTrig = (anim.trigger && anim.trigger !== 'nav')
            ? anim.trigger
            : (trigSel && trigSel.value ? trigSel.value : 'auto');
          if (!anim.preNavTrigger || anim.preNavTrigger === 'nav') {
            if (curTrig !== 'nav') {
              anim.preNavTrigger = curTrig;
              if (curTrig === 'element' && anim.triggerElId) anim.preNavTriggerElId = anim.triggerElId;
            }
          }
          anim.trigger = 'nav';
          if (navSel) anim.navTarget = +navSel.value;
        });
        _syncDomAnims(targets);
      });
    } catch (e) {}
  };

  function _buildAnimTrigPickWrap(d, ai, a) {
    const trigPickWrap = document.createElement('div');
    trigPickWrap.className = 'anim-trig-pick-wrap';
    trigPickWrap.style.cssText = 'margin-top:4px;display:flex;flex-direction:column;gap:4px;';

    const pickBtn = document.createElement('button');
    pickBtn.type = 'button';
    pickBtn.className = 'anim-trig-pick-btn';
    pickBtn.style.cssText = 'width:100%;padding:4px 8px;font-size:9px;font-family:inherit;border-radius:4px;cursor:pointer;border:1px solid var(--border2);background:var(--surface3);color:var(--text2);';
    pickBtn.textContent = a.trigger === 'counter' ? '🔢 Выбрать счётчик'
      : a.trigger === 'timer' ? '⏱ Выбрать таймер' : '🎯 Выбрать объект';
    pickBtn.addEventListener('mousedown', e => e.stopPropagation());
    pickBtn.addEventListener('click', e => {
      e.stopPropagation();
      window._animTriggerPick(d.id, ai);
    });
    trigPickWrap.appendChild(pickBtn);

    const hint = document.createElement('div');
    hint.className = 'anim-trig-pick-hint';
    hint.style.cssText = 'display:none;font-size:8px;color:var(--accent);line-height:1.3;';
    hint.textContent = a.trigger === 'counter' ? 'Кликните по счётчику на слайде'
      : a.trigger === 'timer' ? 'Кликните по таймеру на слайде' : 'Кликните по объекту на слайде';
    trigPickWrap.appendChild(hint);

    if (a.triggerElId) {
      const chip = document.createElement('div');
      chip.dataset.animTrigChip = '1';
      chip.style.cssText = 'display:flex;align-items:center;gap:5px;background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:3px 7px;';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'flex:1;font-size:10px;color:var(--text);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      lbl.textContent = _animTriggerLabel(a.triggerElId);
      const clr = document.createElement('button');
      clr.type = 'button';
      clr.style.cssText = 'flex-shrink:0;background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:0 2px;line-height:1;';
      clr.textContent = '✕';
      clr.title = 'Убрать объект';
      clr.addEventListener('mousedown', e => e.stopPropagation());
      clr.addEventListener('click', e => { e.stopPropagation(); window._animTriggerClear(d.id, ai); });
      chip.appendChild(lbl);
      chip.appendChild(clr);
      trigPickWrap.appendChild(chip);
    }

    return trigPickWrap;
  }

  function _refreshAnimTrigPickRow(elId, animIdx) {
    const row = document.querySelector('.anim-row[data-el-id="' + elId + '"][data-ai="' + animIdx + '"]');
    if (!row) return;
    const pickWrap = row.querySelector('.anim-trig-pick-wrap');
    if (!pickWrap) return;
    pickWrap.querySelectorAll('[data-anim-trig-chip]').forEach(c => c.remove());
    const s = _slides()[_cur()];
    const dd = s && s.els.find(x => x.id === elId);
    const anim = dd && dd.anims && dd.anims[animIdx];
    if (anim && anim.triggerElId) {
      const chip = document.createElement('div');
      chip.dataset.animTrigChip = '1';
      chip.style.cssText = 'display:flex;align-items:center;gap:5px;background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:3px 7px;';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'flex:1;font-size:10px;color:var(--text);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      lbl.textContent = _animTriggerLabel(anim.triggerElId);
      const clr = document.createElement('button');
      clr.type = 'button';
      clr.style.cssText = 'flex-shrink:0;background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:0 2px;line-height:1;';
      clr.textContent = '✕';
      clr.title = 'Убрать объект';
      clr.addEventListener('mousedown', e => e.stopPropagation());
      clr.addEventListener('click', e => { e.stopPropagation(); window._animTriggerClear(elId, animIdx); });
      chip.appendChild(lbl);
      chip.appendChild(clr);
      pickWrap.appendChild(chip);
    }
  }

  function _updateAnimRowTriggerUI(row, elId, animIdx, head, trigSel) {
    const s = _slides()[_cur()];
    const dd = s && s.els.find(x => x.id === elId);
    const anim = dd && dd.anims && dd.anims[animIdx];
    if (!anim) return;
    const trigger = anim.trigger || 'auto';
    const effTrig = trigger === 'nav' ? (anim.preNavTrigger || 'auto') : trigger;
    const TRIGGER_ICONS = {
      auto: '▶',
      click: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" width="10" height="10" style="vertical-align:middle"><path d="M5 1v7l2-1.5 1.5 3 1-.5-1.5-3 2.5-.5z"/></svg>',
      withPrev: '⟳',
      element: '👆',
      counter: '🔢',
      timer: '⏱',
      nav: '→'
    };
    if (trigSel) {
      if ([...trigSel.options].some(o => o.value === effTrig)) trigSel.value = effTrig;
      trigSel.disabled = trigger === 'nav';
    }
    const iconSpan = head && head.querySelector('.anim-trig-icon');
    if (iconSpan) iconSpan.innerHTML = TRIGGER_ICONS[trigger] || TRIGGER_ICONS[effTrig] || '▶';
    const props = row.querySelector('.anim-row-props-wrap');
    let pickWrap = row.querySelector('.anim-trig-pick-wrap');
    if (trigger === 'element' || trigger === 'counter' || trigger === 'timer') {
      if (!pickWrap && props && trigSel) {
        pickWrap = _buildAnimTrigPickWrap(dd, animIdx, anim);
        const navRow = row.querySelector('.anim-nav-row');
        if (navRow) props.insertBefore(pickWrap, navRow);
        else props.appendChild(pickWrap);
      } else if (pickWrap) {
        _refreshAnimTrigPickRow(elId, animIdx);
      }
    } else if (pickWrap) {
      pickWrap.remove();
    }
    const navCheck = row.querySelector('.anim-nav-check');
    if (navCheck) navCheck.checked = (trigger === 'nav');
  }

  window.setElTrigger = function(val){
    try{
      const el=_sel(); if(!el) return;
      _animGroupDomEls(el).forEach(node => {
        if (val) node.dataset.isTrigger = 'true';
        else delete node.dataset.isTrigger;
      });
      _save(); renderAnimPanel(); _saveState();
    }catch(e){}
  };

  window.addAnim = function(animName, cat){ window.addAnimToSel(animName, cat); };

  // When adding new anim - just set delay=0 (relative), keep existing anims untouched
  // When removing - don't touch delays, they're relative and still correct
  function recalcDelays(anims){
    // Only reset the last anim's delay to 0 when freshly added
    // (called after push, so last element is new)
    if(anims.length > 0) anims[anims.length-1].delay = 0;
  }

  // Compute absolute start times for an array of anims (for preview/playback)
  // Returns array of {anim, absDelay} in ms
  window.computeAbsDelays = function(anims){
    let prevStart = 0;
    let prevDur = 0;
    return anims.map((a, i) => {
      const trigger = a.trigger || 'auto';
      const relDelay = a.delay || 0;
      let absDelay;
      const _isLive = typeof ANIM_INFO!=='undefined' && ANIM_INFO[a.name] && ANIM_INFO[a.name].cat==='live';
      const _isLiveLoop = _isLive && a.name !== 'captionSlide' && a.name !== 'typewriter' && a.name !== 'particles';
      if(i === 0){
        absDelay = relDelay;
      } else if(_isLiveLoop){
        // live стартует немедленно (absDelay = только явная задержка пользователя)
        absDelay = relDelay;
      } else if(trigger === 'withPrev'){
        absDelay = prevStart + relDelay;
      } else {
        absDelay = prevStart + prevDur + relDelay;
      }
      // live-loop не сдвигает цепочку; captionSlide/typewriter — конечные, сдвигают
      if(!_isLiveLoop){
        prevStart = absDelay;
        prevDur = window._animChainDuration(a);
      }
      return {anim: a, absDelay};
    });
  };

  window.addAnimToSel = function(animName, cat){
    try{
      const el=_sel(); if(!el) return;
      const targets = _animGroupData(el);
      if (!targets.length) return;
      _pushUndo();
      const slide = _slides()[_cur()];
      targets.forEach(({ dom, d }) => {
        if (!d.anims) d.anims = [];
        d.anims.push(_makeAnim(animName, cat, dom, d));
      });
      if (slide && targets[0]) {
        _ensureAnimOrder(slide);
        const leader = _slideAnimLeader(targets[0].d, slide);
        slide.animOrder.push({ elId: leader.id, ai: leader.anims.length - 1 });
      }
      _syncDomAnims(targets);
      _repairAppletAnimRefsAfterChange();
      if (typeof window._clearAnimHoverPreview === 'function') window._clearAnimHoverPreview(el);
      _save(); renderAnimPanel(); _saveState();
      if (targets.length > 1) _toast('Анимация добавлена группе (' + targets.length + ')', 'ok');
      if(animName==='moveTo' && typeof renderMotionOverlay==='function') renderMotionOverlay();
      if(animName==='orbitTo' && typeof renderMotionOverlay==='function') renderMotionOverlay();
      if(typeof syncProps==='function') syncProps();
    }catch(e){ console.warn('[10-animations] addAnimToSel:', e.message); }
  };

  window.doAddSelectedAnim = function(){
    if(!window._selectedAnimName) return;
    window.addAnimToSel(window._selectedAnimName, window._selectedAnimCat);
  };

  window.removeAnim = function(elId, animIdx){
    try{
      _pushUndo();
      const slide = _slides()[_cur()];
      const targets = _animGroupDataById(elId);
      targets.forEach(({ d }) => {
        if (!d.anims) return;
        d.anims.splice(animIdx, 1);
      });
      if (slide && slide.animOrder) {
        const leader = _slideAnimLeader(targets[0] && targets[0].d, slide) || { id: elId };
        slide.animOrder = slide.animOrder
          .filter(x => !(x.elId === leader.id && x.ai === animIdx))
          .map(x => x.elId === leader.id && x.ai > animIdx ? { elId: x.elId, ai: x.ai - 1 } : x);
      }
      _syncDomAnims(targets);
      _repairAppletAnimRefsAfterChange();
      _save(); renderAnimPanel(); _saveState();
      if(typeof renderMotionOverlay==='function') renderMotionOverlay();
      if (typeof window._refreshAnimTimeline === 'function') window._refreshAnimTimeline();
    }catch(e){}
  };

  window.removeAnimTlSelection = function(){
    if (!window._animTlSel || !window._animTlSel.size) return false;
    try {
      _pushUndo();
      const slide = _slides()[_cur()];
      const byEl = new Map();
      window._animTlSel.forEach(k => {
        const ci = k.indexOf(':');
        const elId = k.slice(0, ci);
        const ai = parseInt(k.slice(ci + 1), 10);
        if (!byEl.has(elId)) byEl.set(elId, []);
        byEl.get(elId).push(ai);
      });
      const allTargets = [];
      byEl.forEach((ais, elId) => {
        ais.sort((a, b) => b - a);
        const targets = _animGroupDataById(elId);
        allTargets.push(...targets);
        ais.forEach(ai => {
          targets.forEach(({ d }) => {
            if (!d.anims) return;
            d.anims.splice(ai, 1);
          });
        });
        if (slide && slide.animOrder) {
          const leader = _slideAnimLeader(targets[0] && targets[0].d, slide) || { id: elId };
          const removed = new Set(ais);
          slide.animOrder = slide.animOrder
            .filter(x => !(x.elId === leader.id && removed.has(x.ai)))
            .map(x => {
              if (x.elId !== leader.id) return x;
              const dec = ais.filter(r => r < x.ai).length;
              return dec ? { elId: x.elId, ai: x.ai - dec } : x;
            });
        }
      });
      window._animTlClearSel();
      _syncDomAnims(allTargets);
      _repairAppletAnimRefsAfterChange();
      _save(); renderAnimPanel(); _saveState();
      if (typeof renderMotionOverlay === 'function') renderMotionOverlay();
      if (typeof window._refreshAnimTimeline === 'function') window._refreshAnimTimeline();
      return true;
    } catch (e) {
      console.error('removeAnimTlSelection:', e);
      return false;
    }
  };

  window.updateAnimProp = function(elId, animIdx, prop, val){
    try{
      const twTextProps = ['fromHtml', 'toHtml'];
      const targets = twTextProps.includes(prop)
        ? _animGroupDataById(elId).filter(x => x.d.id === elId)
        : _animGroupDataById(elId);
      targets.forEach(({ d }) => {
        if (!d.anims || !d.anims[animIdx]) return;
        if (val === undefined) delete d.anims[animIdx][prop];
        else if (prop === 'duration' || prop === 'delay' || prop === 'navTarget' || prop === 'charDelay' || prop === 'holdDuration' || prop === 'tx' || prop === 'ty' || prop === 'orbitR' || prop === 'orbitDeg' || prop === 'rotateDeg') d.anims[animIdx][prop] = +val;
        else d.anims[animIdx][prop] = val;
      });
      _syncDomAnims(targets);
      const _animPanel = document.getElementById('anim-panel');
      if (_animPanel) {
        const _rows = [..._animPanel.querySelectorAll('.anim-row[data-el-id="' + elId + '"]')];
        if (_rows[animIdx]) _rows[animIdx].dataset.animJson = JSON.stringify(targets[0].d.anims[animIdx]);
      }
      _save(); _saveState();
      if (typeof window._refreshAnimTimeline === 'function') window._refreshAnimTimeline();
    }catch(e){}
  };

  window.clearAllAnims = function(){
    try{
      if (typeof slides === 'undefined' || typeof cur === 'undefined') return;
      const slide = slides[cur];
      if (!slide || !slide.els) return;
      let had = false;
      slide.els.forEach(d => {
        if (d.anims && d.anims.length) had = true;
      });
      if (!had && (!slide.animOrder || !slide.animOrder.length)) return;
      pushUndo();
      const cv = document.getElementById('canvas');
      slide.els.forEach(d => {
        d.anims = [];
        if (cv) {
          const dom = cv.querySelector('.el[data-id="' + d.id + '"]');
          if (dom) dom.dataset.anims = '[]';
        }
      });
      slide.animOrder = [];
      if (window._animTlClearSel) window._animTlClearSel();
      if (window._slideAnimPlaying && typeof window.stopSlideAnimsOnCanvas === 'function') {
        window.stopSlideAnimsOnCanvas();
      }
      if (typeof renderMotionOverlay === 'function') renderMotionOverlay();
      save(); saveState(); drawThumbs();
      renderAnimPanel();
      if (typeof syncProps === 'function') syncProps();
      if (typeof window._refreshAnimTimeline === 'function') window._refreshAnimTimeline();
    }catch(e){ console.error('clearAllAnims:',e); }
  };

  window.clearObjectAnims = function(elId){
    try{
      if (typeof slides === 'undefined' || typeof cur === 'undefined') return;
      const slide = slides[cur];
      if (!slide || !slide.els) return;
      if (!elId) {
        const el = _sel();
        if (!el) return;
        elId = el.dataset.id;
      }
      const d = slide.els.find(x => x.id === elId);
      if (!d) return;
      const targets = _animGroupDataById(elId);
      if (!targets.length) return;
      if (!targets.some(({ d: td }) => td.anims && td.anims.length)) return;
      pushUndo();
      const cv = _animCanvas();
      const leader = _slideAnimLeader(d, slide);
      targets.forEach(({ dom, d: td }) => {
        td.anims = [];
        const node = dom || (cv && cv.querySelector('.el[data-id="' + td.id + '"]'));
        if (node) node.dataset.anims = '[]';
      });
      if (slide.animOrder) {
        slide.animOrder = slide.animOrder.filter(x => x.elId !== leader.id);
      }
      _repairAppletAnimRefsAfterChange();
      if (typeof renderMotionOverlay === 'function') renderMotionOverlay();
      save(); saveState(); drawThumbs();
      renderAnimPanel();
      if (typeof syncProps === 'function') syncProps();
      if (typeof window._refreshAnimTimeline === 'function') window._refreshAnimTimeline();
    }catch(e){ console.error('clearObjectAnims:', e); }
  };
  window.removeAllAnims = window.clearObjectAnims;

  window.openAnimRowForEdit = function(elId, animIdx){
    try{
      const slide = _slides()[_cur()];
      const d = slide && slide.els.find(x => x.id === elId);
      if (!d || animIdx == null) return;
      const leader = _slideAnimLeader(d, slide);
      const rowElId = leader.id;
      const ai = +animIdx;
      const tabBtn = document.querySelector('.rtab[onclick*="\'anim\'"]');
      if (tabBtn && typeof switchTab === 'function') switchTab('anim', tabBtn);
      else if (typeof window.openAnimPanel === 'function') window.openAnimPanel();
      window._animPendingOpenRows = window._animPendingOpenRows || new Set();
      window._animPendingOpenRows.add(rowElId + ':' + ai);
      renderAnimPanel();
      requestAnimationFrame(() => {
        const row = document.querySelector('.anim-row[data-el-id="' + rowElId + '"][data-ai="' + ai + '"]');
        if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }catch(e){ console.warn('[10-animations] openAnimRowForEdit:', e.message); }
  };

  // Play single animation on element(s) without accumulated delay
  function playAnimOnEl(animName, animData){
    const el = _sel(); if(!el) return;
    if (typeof window._clearAnimHoverPreview === 'function') window._clearAnimHoverPreview(el);
    const _isElSpec = typeof window._animIsElementSpecific === 'function'
      ? window._animIsElementSpecific
      : (n) => n === 'particles' || n === 'captionSlide' || n === 'splitHalf' || n === 'typewriter';
    const targets = _isElSpec(animName) ? [el] : _animGroupDomEls(el);
    if (animName === 'float') {
      const slide = (typeof slides !== 'undefined' && typeof cur !== 'undefined') ? slides[cur] : null;
      let sharedFrames = null;
      if (slide && el.dataset.groupId) {
        const members = _animGroupData(el).map(x => x.d);
        if (members.length > 1) sharedFrames = window._floatFramesForGroup(members, el.dataset.groupId);
      }
      targets.forEach(oneEl => {
        const fw = parseInt(oneEl.style.width) || 200, fh = parseInt(oneEl.style.height) || 200;
        const floatTarget = typeof window._ensureFloatWrap === 'function'
          ? window._ensureFloatWrap(oneEl, fw, fh)
          : (oneEl.querySelector('.ec') || oneEl);
        floatTarget.animate(sharedFrames || _floatFrames(fw, fh), { duration: 3000, fill: 'none', iterations: 1 });
      });
      clearTimeout(_animPreviewTimer);
      _animPreviewTimer = setTimeout(() => {
        targets.forEach(oneEl => {
          const fw = parseInt(oneEl.style.width) || 200, fh = parseInt(oneEl.style.height) || 200;
          const floatTarget = typeof window._ensureFloatWrap === 'function'
            ? window._ensureFloatWrap(oneEl, fw, fh)
            : (oneEl.querySelector('.ec') || oneEl);
          floatTarget.style.transform = '';
        });
      }, 3100);
      return;
    }
    if (animName === 'particles') {
      const _ptd = window.PARTICLES_DEFAULTS;
      const pa = Object.assign({}, _ptd, animData || {});
      targets.forEach(oneEl => {
        const d2 = (typeof slides !== 'undefined' && typeof cur !== 'undefined') ?
          slides[cur] && slides[cur].els.find(x => oneEl.dataset && x.id === oneEl.dataset.id) : null;
        if (typeof window._fireParticlesAnim === 'function') window._fireParticlesAnim(oneEl, pa, 0, d2);
      });
      clearTimeout(_animPreviewTimer);
      const _pcnt = pa.swingCount != null ? pa.swingCount : 1;
      const _pInf = !isFinite(+_pcnt) || +_pcnt >= 10;
      if (!_pInf) {
        const previewDur = (pa.duration || _ptd.duration) + (pa.ptLife || _ptd.ptLife) * 1.5 + 800;
        _animPreviewTimer = setTimeout(() => {
          targets.forEach(t => {
            if (typeof window._resetParticles === 'function') window._resetParticles(t);
          });
        }, previewDur * Math.max(1, +_pcnt || 1));
      }
      return;
    }
    if (animName === 'splitHalf') {
      const splitA = Object.assign({ duration: 800, cat: 'exit' }, animData || {});
      targets.forEach(oneEl => {
        if (typeof window._fireSplitHalfAnim === 'function') {
          window._fireSplitHalfAnim(oneEl, splitA, 0, { hideAfter: false, unwrap: false });
        }
      });
      clearTimeout(_animPreviewTimer);
      _animPreviewTimer = setTimeout(() => {
        targets.forEach(t => {
          const d2 = (typeof slides !== 'undefined' && typeof cur !== 'undefined') ?
            slides[cur] && slides[cur].els.find(x => t.dataset && x.id === t.dataset.id) : null;
          if (typeof window._resetSlideAnimEl === 'function') window._resetSlideAnimEl(t, d2);
          else if (typeof window._resetSplitHalf === 'function') window._resetSplitHalf(t, true);
        });
      }, (splitA.duration || 800) + 50);
      return;
    }
    if (animName === 'moveTo' || animName === 'orbitTo') {
      const ma = Object.assign({ duration: 600, name: animName }, animData || {});
      targets.forEach(oneEl => {
        const d2 = (typeof slides !== 'undefined' && typeof cur !== 'undefined') ?
          slides[cur] && slides[cur].els.find(x => oneEl.dataset && x.id === oneEl.dataset.id) : null;
        if (d2 && typeof fireAnim === 'function') fireAnim(oneEl, d2, ma, cur, 0);
      });
      clearTimeout(_animPreviewTimer);
      _animPreviewTimer = setTimeout(() => {
        targets.forEach(t => {
          const d2 = (typeof slides !== 'undefined' && typeof cur !== 'undefined') ?
            slides[cur] && slides[cur].els.find(x => t.dataset && x.id === t.dataset.id) : null;
          if (typeof window._resetSlideAnimEl === 'function') window._resetSlideAnimEl(t, d2);
        });
        if (typeof renderMotionOverlay === 'function') renderMotionOverlay();
      }, (ma.duration || 600) + 100);
      return;
    }
    if (animName === 'captionSlide') {
      const capA = Object.assign({ duration: 600, holdDuration: 2000, captionDir: 'right' }, animData || {});
      const entries = targets.map(oneEl => {
        const d2 = (typeof slides !== 'undefined' && typeof cur !== 'undefined') ?
          slides[cur] && slides[cur].els.find(x => oneEl.dataset && x.id === oneEl.dataset.id) : null;
        return {
          el: oneEl,
          x: d2 ? d2.x : (parseInt(oneEl.style.left) || 0),
          y: d2 ? d2.y : (parseInt(oneEl.style.top) || 0),
          w: d2 ? d2.w : (parseInt(oneEl.style.width) || 200),
          h: d2 ? d2.h : (parseInt(oneEl.style.height) || 200)
        };
      });
      if (typeof window._fireCaptionSlideAnimGroup === 'function') {
        window._fireCaptionSlideAnimGroup(entries, capA, 0, { hideAfter: false });
      }
      clearTimeout(_animPreviewTimer);
      _animPreviewTimer = setTimeout(() => {
        targets.forEach(t => { if (typeof window._resetCaptionSlide === 'function') window._resetCaptionSlide(t, true); });
      }, window._animChainDuration(capA) + 50);
      return;
    }
    const runOn = (oneEl) => {
      if(animName === 'rotate'){
        const dir = (animData && animData.rotateDir||'cw')==='cw' ? 1 : -1;
        const deg = (animData && animData.rotateDeg!=null ? animData.rotateDeg : 360) * dir;
        const dur = (animData && animData.duration) || 600;
        oneEl.animate([{transform:'rotate(0deg)'},{transform:`rotate(${deg}deg)`}],
          {duration:dur, easing:'ease-in-out', fill:'none'});
        return;
      }
      if(animName === 'swing'){
        const sox = animData && animData.swingOx != null ? animData.swingOx : 0;
        const d2 = (typeof slides!=='undefined' && typeof cur!=='undefined') ?
          slides[cur]&&slides[cur].els.find(x=>oneEl.dataset&&x.id===oneEl.dataset.id) : null;
        const sh = d2 ? d2.h : (parseInt(oneEl.style.height)||200);
        const sw = d2 ? d2.w : (parseInt(oneEl.style.width)||300);
        const soy = animData && animData.swingOy != null ? animData.swingOy : sh/2;
        const ox = (50 + sox/sw*100).toFixed(2)+'%';
        const oy = (50 + soy/sh*100).toFixed(2)+'%';
        const swTarget = window._isTextBlock(oneEl) ? window._ensureTextBodyWrap(oneEl) : (oneEl.querySelector('.ec') || oneEl);
        swTarget.style.transformOrigin = ox+' '+oy;
        const anim = swTarget.animate([
          {transform:'rotate(0deg)'},{transform:'rotate(30deg)'},{transform:'rotate(-30deg)'},
          {transform:'rotate(20deg)'},{transform:'rotate(-20deg)'},{transform:'rotate(10deg)'},
          {transform:'rotate(-10deg)'},{transform:'rotate(5deg)'},{transform:'rotate(-3deg)'},
          {transform:'rotate(0deg)'}
        ], {duration:1200, easing:'ease-in-out', fill:'none'});
        anim.onfinish = () => { swTarget.style.transformOrigin = ''; };
        return;
      }
      const cssClass = ANIM_CSS[animName]; if(!cssClass) return;
      const isEmphasisLive = ['dance','pulse','shake','flash','swing','float'].includes(animName);
      const animTarget = window._isTextBlock(oneEl)
        ? window._ensureTextBodyWrap(oneEl)
        : (isEmphasisLive ? (oneEl.querySelector('.ec') || oneEl) : oneEl);
      if(animName === 'dance'){
        const danceTarget = window._ensureDanceWrap(oneEl);
        danceTarget.getAnimations().forEach(a => { try { a.cancel(); } catch (e) {} });
        const dur = (animData && animData.duration) || 1200;
        const anim = danceTarget.animate(_DANCE_PREVIEW_FRAMES, { duration: dur, iterations: 1, fill: 'none' });
        anim.onfinish = () => { try { anim.cancel(); } catch (e) {} danceTarget.style.transform = ''; };
        return;
      }
      animTarget.style.animation = '';
      void animTarget.offsetWidth;
      animTarget.style.animation = cssClass + ' 0.6s ease-out 0s ' + (isEmphasisLive ? 'none' : 'both');
    };
    targets.forEach(runOn);
    clearTimeout(_animPreviewTimer);
    if (animName === 'captionSlide') {
      const a = Object.assign({ duration: 600, holdDuration: 2000, captionDir: 'right' }, animData || {});
      _animPreviewTimer = setTimeout(() => {
        targets.forEach(t => { if (typeof window._resetCaptionSlide === 'function') window._resetCaptionSlide(t, true); });
      }, window._animChainDuration(a) + 50);
    } else if (animName === 'swing') {
      _animPreviewTimer = setTimeout(() => {
        targets.forEach(oneEl => {
          const swTarget = window._isTextBlock(oneEl) ? window._ensureTextBodyWrap(oneEl) : (oneEl.querySelector('.ec') || oneEl);
          swTarget.style.transformOrigin = '';
        });
      }, 1400);
    } else if (animName === 'dance') {
      const dur = (animData && animData.duration) || 1200;
      _animPreviewTimer = setTimeout(() => {
        targets.forEach(oneEl => {
          if (typeof window._resetLiveAnimPreview === 'function') window._resetLiveAnimPreview(oneEl, true);
        });
      }, dur + 100);
    } else if (animName === 'float') {
      _animPreviewTimer = setTimeout(() => {
        targets.forEach(oneEl => {
          if (typeof window._resetLiveAnimPreview === 'function') window._resetLiveAnimPreview(oneEl, true);
        });
      }, 3100);
    } else if (ANIM_CSS[animName]) {
      _animPreviewTimer = setTimeout(() => {
        targets.forEach(oneEl => {
          const isEmphasisLive = ['dance','pulse','shake','flash','swing','float'].includes(animName);
          const animTarget = window._isTextBlock(oneEl)
            ? window._ensureTextBodyWrap(oneEl)
            : (isEmphasisLive ? (oneEl.querySelector('.ec') || oneEl) : oneEl);
          animTarget.style.animation = '';
          if (oneEl.dataset.type === 'text' && typeof applyTextRadius === 'function') applyTextRadius(oneEl);
        });
      }, 700);
    }
  }

  window.playAnimPreview = function(animName, animData) {
    playAnimOnEl(animName, animData || {});
  };

  window.renderAnimPanel = function(){
    try{
      const slide = _slides()[_cur()];
      if(slide && typeof window.repairAppletAnimRefs === 'function' && window.repairAppletAnimRefs(slide)){
        if(typeof window.syncAppletAnimRefsToDom === 'function') window.syncAppletAnimRefsToDom(_cur());
      }
      renderAnimCategoryGrid();
      renderAssignedAnims();
      if (typeof window.renderAnimTimelineBar === 'function') {
        const s = _slides()[_cur()];
        window.renderAnimTimelineBar(s);
      }
    }catch(e){ console.warn('[10-animations] renderAnimPanel:', e.message); }
  };

  function renderAnimCategoryGrid(){
    const container = document.getElementById('anim-slide-list');
    if(!container) return;
    container.innerHTML = '';
    const el = _sel();
    const assignedNames = new Set();
    if(el){
      _animGroupData(el).forEach(({ d }) => {
        if (d.anims) d.anims.forEach(a => assignedNames.add(a.name));
      });
    }
    if(!window._openAnimCat) window._openAnimCat = 'entrance';

    ANIM_CATS.forEach(group => {
      const section = document.createElement('div');
      section.className = 'anim-cat-section';

      const title = document.createElement('div');
      title.className = 'anim-cat-title ' + group.cat;
      title.style.cursor = 'pointer';
      title.style.display = 'flex';
      title.style.justifyContent = 'space-between';
      title.style.alignItems = 'center';
      const titleText = document.createElement('span');
      titleText.textContent = group.label;
      const chevron = document.createElement('span');
      chevron.style.cssText = 'font-size:9px;transition:transform .2s;display:inline-block;opacity:.7';
      chevron.textContent = '▼';
      title.appendChild(titleText);
      title.appendChild(chevron);
      section.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'anim-cat-grid';
      const isOpen = window._openAnimCat === group.cat;
      grid.style.display = isOpen ? '' : 'none';
      chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';

      group.items.forEach(it => {
        const item = document.createElement('div');
        const isAssigned = assignedNames.has(it.name);
        const isSelected = window._selectedAnimName === it.name;
        item.className = 'anim-item' + (isAssigned?' assigned':'') + (isSelected?' selected':'');
        item.dataset.anim = it.name;
        item.title = it.label;
        const iconDiv = document.createElement('div');
        iconDiv.className = 'anim-item-icon ' + group.cat;
        iconDiv.textContent = it.icon;
        const labelDiv = document.createElement('div');
        labelDiv.className = 'anim-item-label';
        labelDiv.textContent = it.label;
        item.appendChild(iconDiv);
        item.appendChild(labelDiv);
        item.addEventListener('mousedown', e => e.preventDefault());
        item.addEventListener('mouseenter', () => {
          playAnimOnEl(it.name, {});
        });
        item.addEventListener('mouseleave', () => {
          const el2 = _sel();
          if (el2 && typeof window._clearAnimHoverPreview === 'function') window._clearAnimHoverPreview(el2);
        });
        item.addEventListener('click', e => {
          e.preventDefault();
          window._selectedAnimName = it.name;
          window._selectedAnimCat  = group.cat;
          container.querySelectorAll('.anim-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          if (_sel()) window.addAnimToSel(it.name, group.cat);
        });
        grid.appendChild(item);
      });

      title.addEventListener('click', () => {
        if(window._openAnimCat === group.cat) return;
        window._openAnimCat = group.cat;
        container.querySelectorAll('.anim-cat-grid').forEach(g => { g.style.display = 'none'; });
        container.querySelectorAll('.anim-cat-title span:last-child').forEach(c => { c.style.transform = 'rotate(-90deg)'; });
        grid.style.display = '';
        chevron.style.transform = 'rotate(0deg)';
      });

      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  function renderAssignedAnims(){
    if (typeof window._animTriggerPickCancel === 'function') window._animTriggerPickCancel();
    const container = document.getElementById('anim-assigned-list');
    if(!container) return;

    const openRows = new Set();
    container.querySelectorAll('.anim-row.anim-row-open').forEach(r => {
      if (r.dataset.elId != null && r.dataset.ai != null) openRows.add(r.dataset.elId + ':' + r.dataset.ai);
    });
    if (window._animPendingOpenRows) {
      window._animPendingOpenRows.forEach(k => openRows.add(k));
      window._animPendingOpenRows.clear();
    }

    const s = _slides()[_cur()];
    const selEl = _sel();
    const typeNames = {text:'Текст', image:'Изображение', shape:'Фигура', table:'Таблица', icon:'Иконка', code:'Код', markdown:'Markdown', svg:'SVG'};

    _ensureAnimOrder(s);
    const allAnims = [];
    if (s && s.animOrder) s.animOrder.forEach(({ elId, ai }) => {
      const d = s.els.find(x => x.id === elId);
      const a = d && d.anims && d.anims[ai];
      if (!d || !a) return;
      let elName;
      if (d.groupId) {
        const gCount = s.els.filter(x => x.groupId === d.groupId).length;
        elName = 'Группа' + (gCount > 1 ? ' (' + gCount + ')' : '');
      } else {
        const sameType = s.els.filter(x => x.type === d.type);
        const idx = sameType.length > 1 ? sameType.findIndex(x => x.id === d.id) + 1 : 0;
        elName = (typeNames[d.type] || d.type || 'Объект') + (idx > 0 ? ' ' + idx : '');
      }
      allAnims.push({ d, a, ai, elName });
    });

    container.innerHTML = '';

    if(!allAnims.length){
      container.innerHTML = '<div style="font-size:10px;color:var(--text3);text-align:center;padding:16px 8px">Нет анимаций на слайде</div>';
      return;
    }

    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);padding:3px 0 5px;border-bottom:1px solid var(--border);margin-bottom:4px;';
    lbl.textContent = 'Анимации слайда (' + allAnims.length + ')';
    container.appendChild(lbl);

    allAnims.forEach(({d, a, ai, elName}, flatIdx) => {
      const aLive = _readAnimLive(d.id, ai, a);
      const info = ANIM_INFO[aLive.name || a.name] || {label:(aLive.name||a.name), cat:'entrance'};
      const catLabel = info.cat==='entrance'?'Вход':info.cat==='exit'?'Выход':info.cat==='motion'?'Движение':info.cat==='live'?'Живая':'Акцент';
      const trigger = aLive.trigger || 'auto';
      const trigSelValue = trigger === 'nav' ? (aLive.preNavTrigger || 'auto') : trigger;
      const isSelected = selEl && (selEl.dataset.id === d.id ||
        (d.groupId && selEl.dataset.groupId === d.groupId));

      const row = document.createElement('div');
      row.className = 'anim-row' + (isSelected ? ' anim-row-sel' : '');
      row.dataset.elId = d.id;
      row.dataset.ai = ai;
      row.dataset.animJson = JSON.stringify(aLive);

      // ── Header (drag handle + click to toggle) ──
      const TRIGGER_ICONS = {
        auto: '▶',
        click: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" width="10" height="10" style="vertical-align:middle"><path d="M5 1v7l2-1.5 1.5 3 1-.5-1.5-3 2.5-.5z"/></svg>',
        withPrev: '⟳',
        element: '👆',
        counter: '🔢',
        timer: '⏱',
        nav: '→'
      };
      const trigIcon = TRIGGER_ICONS[trigger] || '▶';
      const head = document.createElement('div');
      head.className = 'anim-row-head';
      head.innerHTML = `<span class="anim-drag-handle" title="Перетащить" style="cursor:grab;color:var(--text3);font-size:10px;flex-shrink:0;padding:0 2px;user-select:none">⠿</span><span class="anim-cat ${info.cat}">${catLabel}</span><span class="anim-name">${info.label}</span><span class="anim-trig-icon" style="font-size:10px;color:var(--text3);flex-shrink:0;line-height:1">${trigIcon}</span><span class="anim-el-name">${elName}</span>`;

      const delBtn = document.createElement('button');
      delBtn.className = 'anim-del'; delBtn.title = 'Удалить'; delBtn.textContent = '✕';
      delBtn.addEventListener('mousedown', e=>e.preventDefault());
      delBtn.addEventListener('click', e=>{e.stopPropagation(); removeAnim(d.id, ai);});
      head.appendChild(delBtn);

      row.appendChild(head);

      // Drag-to-reorder
      const handle = head.querySelector('.anim-drag-handle');
      handle.addEventListener('mousedown', e=>{
        e.preventDefault(); e.stopPropagation();
        row.style.opacity = '0.5';
        let didDrag = false;

        const onMove = mv => {
          didDrag = true;
          const rows = [...container.querySelectorAll('.anim-row')];
          // Find which row the cursor is over
          let insertBefore = null;
          for(const r of rows) {
            if(r === row) continue;
            const rect = r.getBoundingClientRect();
            if(mv.clientY < rect.top + rect.height / 2) {
              insertBefore = r;
              break;
            }
          }
          // Move row to new position
          if(insertBefore) {
            container.insertBefore(row, insertBefore);
          } else {
            // Cursor below all rows — append to end
            const last = rows[rows.length - 1];
            if(last && last !== row) last.after(row);
          }
        };

        const onUp = e2=>{
          row.style.opacity = '';
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);

          if(!didDrag) return; // normal click — let it propagate naturally
          _animDragJustEnded = true;

          if(s && s.els){
            const finalRows = [...container.querySelectorAll('.anim-row')];
            const orderedAnims = finalRows.map(r => {
              try {
                return { elId: r.dataset.elId, anim: JSON.parse(r.dataset.animJson) };
              } catch (e) { return null; }
            }).filter(x => x && x.elId && x.anim);

            const newAnimsByEl = {};
            orderedAnims.forEach(({ elId, anim }) => {
              if (!newAnimsByEl[elId]) newAnimsByEl[elId] = [];
              newAnimsByEl[elId].push(anim);
            });

            Object.keys(newAnimsByEl).forEach(elId => {
              const nd = s.els.find(x => x.id === elId);
              if (!nd) return;
              nd.anims = newAnimsByEl[elId];
              _syncAnimsOrderToGroup(elId, nd.anims);
            });

            s.animOrder = orderedAnims.map(({ elId, anim }) => ({
              elId,
              ai: (newAnimsByEl[elId] || []).indexOf(anim)
            }));

            const canvas = document.getElementById('canvas');
            s.els.forEach(dd => {
              if(!dd.anims) return;
              const domEl = canvas ? canvas.querySelector(`.el[data-id="${dd.id}"]`) : null;
              if(domEl) domEl.dataset.anims = JSON.stringify(dd.anims);
            });

            _save(); _saveState();
            if (typeof _repairAppletAnimRefsAfterChange === 'function') _repairAppletAnimRefsAfterChange();
          }
          renderAnimPanel();
          if(typeof renderMotionOverlay==='function') renderMotionOverlay();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      // ── Props (collapsed by default) ──
      const props = document.createElement('div');
      props.className = 'anim-row-props-wrap';
      props.style.display = 'none';
      props.addEventListener('mousedown', e => e.stopPropagation());
      props.addEventListener('click', e => e.stopPropagation());

      const propGrid = document.createElement('div');
      propGrid.className = 'anim-row-props';
      propGrid.innerHTML = a.name === 'captionSlide'
        ? `<label>Задержка, мс<input type="number" value="${a.delay||0}" min="0" max="10000" step="100" oninput="updateAnimProp('${d.id}',${ai},'delay',this.value)" onchange="updateAnimProp('${d.id}',${ai},'delay',this.value)"></label>`
        : `<label>Задержка, мс<input type="number" value="${a.delay||0}" min="0" max="10000" step="100" oninput="updateAnimProp('${d.id}',${ai},'delay',this.value)" onchange="updateAnimProp('${d.id}',${ai},'delay',this.value)"></label>
        <label>Длит., мс<input type="number" value="${a.duration||600}" min="50" max="5000" step="50" oninput="updateAnimProp('${d.id}',${ai},'duration',this.value)" onchange="updateAnimProp('${d.id}',${ai},'duration',this.value)"></label>`;
      props.appendChild(propGrid);

      // moveTo: show tx/ty fields + trigger
      if(a.name === 'moveTo'){
        const motionGrid = document.createElement('div');
        motionGrid.className = 'anim-row-props';
        motionGrid.style.marginTop = '4px';
        motionGrid.innerHTML = `
          <label>Смещение X<input type="number" value="${a.tx||0}" step="1" oninput="updateAnimProp('${d.id}',${ai},'tx',+this.value);if(typeof renderMotionOverlay==='function')renderMotionOverlay()" onchange="updateAnimProp('${d.id}',${ai},'tx',+this.value);if(typeof renderMotionOverlay==='function')renderMotionOverlay()"></label>
          <label>Смещение Y<input type="number" value="${a.ty||0}" step="1" oninput="updateAnimProp('${d.id}',${ai},'ty',+this.value);if(typeof renderMotionOverlay==='function')renderMotionOverlay()" onchange="updateAnimProp('${d.id}',${ai},'ty',+this.value);if(typeof renderMotionOverlay==='function')renderMotionOverlay()"></label>`;
        props.appendChild(motionGrid);
        const hint = document.createElement('div');
        hint.style.cssText='font-size:8px;color:var(--text3);margin-top:5px;line-height:1.4;';
        hint.textContent='↗ Перетащите бледную копию объекта чтобы задать точку назначения';
        props.appendChild(hint);
      }

      // typewriter: from/to text + confirm button + charDelay
      if(a.name === 'typewriter'){
        const twWrap = document.createElement('div');
        twWrap.style.cssText = 'margin-top:6px;display:flex;flex-direction:column;gap:6px;';

        // charDelay slider
        const speedRow = document.createElement('div');
        speedRow.className = 'anim-row-props';
        speedRow.style.marginTop = '0';
        speedRow.innerHTML = `<label style="grid-column:1/-1">Скорость (мс/символ)<input type="number" value="${a.charDelay||40}" min="5" max="500" step="5" oninput="updateAnimProp('${d.id}',${ai},'charDelay',+this.value)" onchange="updateAnimProp('${d.id}',${ai},'charDelay',+this.value)"></label>`;
        twWrap.appendChild(speedRow);

        // Текущий «новый» текст (toHtml)
        const toLabel = document.createElement('div');
        toLabel.style.cssText = 'font-size:9px;color:var(--text3);margin-bottom:2px;';
        toLabel.textContent = '📝 Новый текст (редактируйте прямо в объекте, затем нажмите ↓)';
        twWrap.appendChild(toLabel);

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '✓ Подтвердить новый текст';
        confirmBtn.style.cssText = 'width:100%;padding:5px 8px;font-size:10px;font-family:inherit;border-radius:4px;cursor:pointer;border:1px solid var(--accent);background:var(--accent);color:#fff;font-weight:600;';
        confirmBtn.addEventListener('mousedown', e => e.preventDefault());
        confirmBtn.addEventListener('click', () => {
          // Читаем текущий текст из DOM-элемента
          const _domEl2 = document.querySelector('#canvas .el[data-id="' + d.id + '"]');
          if(!_domEl2) return;
          const _tel2 = _domEl2.querySelector('.tel') || _domEl2.querySelector('.shape-text') || _domEl2.querySelector('.ec');
          if(!_tel2) return;
          const newHtml = _tel2.innerHTML;
          if(typeof pushUndo==='function') pushUndo();
          const _s = slides[cur]; if(!_s) return;
          const _d2 = _s.els.find(x=>x.id===d.id); if(!_d2||!_d2.anims) return;
          const _a2 = _d2.anims[ai]; if(!_a2) return;
          _a2.toHtml = newHtml;
          // Если есть следующая typewriter — обновляем её fromHtml
          const _nextTw = _d2.anims[ai+1];
          if(_nextTw && _nextTw.name==='typewriter'){
            _nextTw.fromHtml = newHtml;
          }
          // Восстанавливаем САМЫЙ ПЕРВЫЙ fromHtml — то что было до всех typewriter-анимаций
          const _firstTw = _d2.anims.find(x => x.name==='typewriter');
          const _origHtml = _firstTw ? (_firstTw.fromHtml || '') : (_a2.fromHtml || '');
          _tel2.innerHTML = _origHtml;
          _d2.html = _origHtml;
          _domEl2.dataset.anims = JSON.stringify(_d2.anims);
          if(typeof save==='function') save();
          if(typeof saveState==='function') saveState();
          if(typeof renderAnimPanel==='function') renderAnimPanel();
          if(typeof toast==='function') toast('✓ Новый текст сохранён', 'ok');
        });
        twWrap.appendChild(confirmBtn);

        // Показываем fromHtml и toHtml кратко
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'font-size:8px;color:var(--text3);line-height:1.5;';
        const _fromTxt = (a.fromHtml||'').replace(/<[^>]*>/g,'').slice(0,40) || '(пусто)';
        const _toTxt   = (a.toHtml  ||'').replace(/<[^>]*>/g,'').slice(0,40) || '(не задан)';
        infoDiv.innerHTML = `<b>Исходный:</b> ${_fromTxt}<br><b>Новый:</b> ${_toTxt}`;
        twWrap.appendChild(infoDiv);

        const hint3 = document.createElement('div');
        hint3.style.cssText = 'font-size:8px;color:var(--text3);margin-top:2px;line-height:1.4;';
        hint3.textContent = '⌨ Отредактируйте текст в объекте на слайде, затем нажмите «Подтвердить»';
        twWrap.appendChild(hint3);

        props.appendChild(twWrap);
      }

      // swing: количество качаний в стиле поля длительности

      function _mkRepeatRow(animName2, d2, ai2, cnt, isInf) {
        const rw = document.createElement('div');
        rw.className = 'anim-row-props';
        rw.style.marginTop = '4px';

        // Left: number input
        const numLabel = document.createElement('label');
        numLabel.textContent = 'Повторений';
        const numInput = document.createElement('input');
        numInput.type = 'number'; numInput.min = '1'; numInput.max = '9'; numInput.step = '1';
        numInput.value = isInf ? 1 : cnt;
        if(isInf) numInput.disabled = true;
        numInput.addEventListener('mousedown', e=>e.stopPropagation());
        numInput.addEventListener('input',  ()=>updateAnimProp(d2.id, ai2, 'swingCount', +numInput.value||1));
        numInput.addEventListener('change', ()=>updateAnimProp(d2.id, ai2, 'swingCount', +numInput.value||1));
        numLabel.appendChild(numInput);
        rw.appendChild(numLabel);

        // Right: tog toggle + "∞"
        const togWrap = document.createElement('div');
        togWrap.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;';
        togWrap.innerHTML = '<label class="tog" style="flex-shrink:0;pointer-events:none">'
          + '<input type="checkbox" style="opacity:0;width:0;height:0;position:absolute"'
          + (isInf?' checked':'') + '>'
          + '<span class="tog-track"></span><span class="tog-thumb"></span></label>'
          + '<span style="font-size:10px;color:var(--text2)">∞</span>';
        const togChk = togWrap.querySelector('input[type=checkbox]');
        togWrap.addEventListener('mousedown', e=>{ e.stopPropagation(); e.preventDefault(); });
        togWrap.addEventListener('click', e=>{ e.stopPropagation(); e.preventDefault();
          const v = !togChk.checked;
          togChk.checked = v;
          togWrap.querySelector('.tog-thumb').style.transform = v ? 'translateX(16px)' : '';
          togWrap.querySelector('.tog-track').style.background = v ? 'var(--accent)' : '';
          updateAnimProp(d2.id, ai2, 'swingCount', v ? 10 : 1);
          numInput.disabled = v; numInput.value = v ? 1 : (cnt >= 10 ? 1 : cnt);
        });
        rw.appendChild(togWrap);
        return rw;
      }
      if(a.name === 'swing'){
        const _cnt = a.swingCount != null ? a.swingCount : 1;
        props.appendChild(_mkRepeatRow('swing', d, ai, _cnt, _cnt>=10));
      }

      // dance: repeat count
      if(a.name === 'dance'){
        const _dcnt = a.swingCount != null ? a.swingCount : 1;
        props.appendChild(_mkRepeatRow('dance', d, ai, _dcnt, _dcnt>=10));
      }

      // float: repeat count only
      if(a.name === 'float'){
        const _fcnt = a.swingCount != null ? a.swingCount : 1;
        props.appendChild(_mkRepeatRow('float', d, ai, _fcnt, _fcnt>=10));
      }

      // particles: direction, count, lifetime, size randomness, spawn window, repeats
      if(a.name === 'particles'){
        const _ptd = window.PARTICLES_DEFAULTS;
        const ptGrid = document.createElement('div');
        ptGrid.className = 'anim-row-props';
        ptGrid.style.marginTop = '4px';
        ptGrid.innerHTML = `
          <label>Направление, °<input type="number" value="${a.ptDir!=null?a.ptDir:_ptd.ptDir}" min="0" max="360" step="5" oninput="updateAnimProp('${d.id}',${ai},'ptDir',((+this.value)%360+360)%360)" onchange="updateAnimProp('${d.id}',${ai},'ptDir',((+this.value)%360+360)%360)"></label>
          <label>Частиц<input type="number" value="${a.particleCount!=null?a.particleCount:_ptd.particleCount}" min="1" max="200" step="1" oninput="updateAnimProp('${d.id}',${ai},'particleCount',Math.max(1,Math.min(200,+this.value||${_ptd.particleCount})))" onchange="updateAnimProp('${d.id}',${ai},'particleCount',Math.max(1,Math.min(200,+this.value||${_ptd.particleCount})))"></label>
          <label>Время жизни, мс<input type="number" value="${a.ptLife!=null?a.ptLife:_ptd.ptLife}" min="400" max="30000" step="100" oninput="updateAnimProp('${d.id}',${ai},'ptLife',Math.max(400,+this.value||${_ptd.ptLife}))" onchange="updateAnimProp('${d.id}',${ai},'ptLife',Math.max(400,+this.value||${_ptd.ptLife}))"></label>
          <label>Разброс размера, %<input type="number" value="${a.ptSizeRand!=null?a.ptSizeRand:_ptd.ptSizeRand}" min="0" max="100" step="1" oninput="updateAnimProp('${d.id}',${ai},'ptSizeRand',Math.max(0,Math.min(100,this.value===''?${_ptd.ptSizeRand}:+this.value)))" onchange="updateAnimProp('${d.id}',${ai},'ptSizeRand',Math.max(0,Math.min(100,this.value===''?${_ptd.ptSizeRand}:+this.value)))"></label>
          <label>Разброс вращения, °<input type="number" value="${a.ptRot!=null?a.ptRot:_ptd.ptRot}" min="0" max="180" step="1" oninput="updateAnimProp('${d.id}',${ai},'ptRot',Math.max(0,Math.min(180,this.value===''?${_ptd.ptRot}:+this.value)))" onchange="updateAnimProp('${d.id}',${ai},'ptRot',Math.max(0,Math.min(180,this.value===''?${_ptd.ptRot}:+this.value)))"></label>
          <label>Разброс по ширине, %<input type="number" value="${a.ptSpread!=null?a.ptSpread:_ptd.ptSpread}" min="0" max="100" step="1" oninput="updateAnimProp('${d.id}',${ai},'ptSpread',Math.max(0,Math.min(100,this.value===''?${_ptd.ptSpread}:+this.value)))" onchange="updateAnimProp('${d.id}',${ai},'ptSpread',Math.max(0,Math.min(100,this.value===''?${_ptd.ptSpread}:+this.value)))"></label>
          <label>Период появления, мс<input type="number" value="${a.duration!=null?a.duration:_ptd.duration}" min="400" max="60000" step="100" oninput="updateAnimProp('${d.id}',${ai},'duration',Math.max(400,+this.value||${_ptd.duration}))" onchange="updateAnimProp('${d.id}',${ai},'duration',Math.max(400,+this.value||${_ptd.duration}))"></label>`;
        props.appendChild(ptGrid);
        const _pcnt = a.swingCount != null ? a.swingCount : 1;
        props.appendChild(_mkRepeatRow('particles', d, ai, _pcnt, _pcnt>=10));
        const ptHint = document.createElement('div');
        ptHint.style.cssText = 'font-size:8px;color:var(--text3);margin-top:5px;line-height:1.4;';
        ptHint.textContent = '✨ Копии объекта появляются по очереди, плывут и исчезают. Направление — относительно фигуры: 0° вверх (с поворотом объекта). Разброс по ширине — в стороны от направления движения.';
        props.appendChild(ptHint);
      }

      // orbitTo: radius, direction, degrees
      if(a.name === 'orbitTo'){
        const orbitGrid = document.createElement('div');
        orbitGrid.className = 'anim-row-props';
        orbitGrid.style.marginTop = '4px';
        orbitGrid.innerHTML = `
          <label>Радиус, px<input type="number" value="${a.orbitR||120}" min="10" max="2000" step="10" oninput="updateAnimProp('${d.id}',${ai},'orbitR',+this.value);if(typeof renderMotionOverlay==='function')renderMotionOverlay()" onchange="updateAnimProp('${d.id}',${ai},'orbitR',+this.value);if(typeof renderMotionOverlay==='function')renderMotionOverlay()"></label>
          <label>Градусов<input type="number" value="${a.orbitDeg!=null?Math.abs(a.orbitDeg):360}" min="0" max="720" step="5" oninput="updateAnimProp('${d.id}',${ai},'orbitDeg',Math.abs(+this.value));if(typeof renderMotionOverlay==='function')renderMotionOverlay()" onchange="updateAnimProp('${d.id}',${ai},'orbitDeg',Math.abs(+this.value));if(typeof renderMotionOverlay==='function')renderMotionOverlay()"></label>`;
        props.appendChild(orbitGrid);

        // Direction select
        const dirWrap = document.createElement('div');
        dirWrap.style.cssText = 'margin-top:4px;display:flex;gap:4px;';
        const dirBtns = [
          {v:'cw',  l:'↻ По часовой'},
          {v:'ccw', l:'↺ Против часовой'},
        ];
        dirBtns.forEach(btn => {
          const b = document.createElement('button');
          b.textContent = btn.l;
          b.style.cssText = `flex:1;padding:3px 4px;font-size:9px;font-family:inherit;border-radius:3px;cursor:pointer;border:1px solid var(--border2);background:${(a.orbitDir||'cw')===btn.v?'var(--accent)':'var(--surface3)'};color:${(a.orbitDir||'cw')===btn.v?'#fff':'var(--text2)'};transition:.1s;`;
          b.addEventListener('mousedown', e=>e.preventDefault());
          b.addEventListener('click', ()=>{
            updateAnimProp(d.id, ai, 'orbitDir', btn.v);
            dirWrap.querySelectorAll('button').forEach((bb,bi)=>{
              const isActive = dirBtns[bi].v === btn.v;
              bb.style.background = isActive ? 'var(--accent)' : 'var(--surface3)';
              bb.style.color = isActive ? '#fff' : 'var(--text2)';
            });
            if(typeof renderMotionOverlay==='function') renderMotionOverlay();
          });
          dirWrap.appendChild(b);
        });
        props.appendChild(dirWrap);

        const hint2 = document.createElement('div');
        hint2.style.cssText='font-size:8px;color:var(--text3);margin-top:5px;line-height:1.4;';
        hint2.textContent='⭕ Перетащите центр окружности, тяните ручку для изменения радиуса';
        props.appendChild(hint2);
      }

      // captionSlide: hold + direction
      if(a.name === 'captionSlide'){
        const capGrid = document.createElement('div');
        capGrid.className = 'anim-row-props';
        capGrid.style.marginTop = '4px';
        capGrid.innerHTML = `<label>Появ./исчез., мс<input type="number" value="${a.duration||600}" min="50" max="5000" step="50" oninput="updateAnimProp('${d.id}',${ai},'duration',this.value)" onchange="updateAnimProp('${d.id}',${ai},'duration',this.value)"></label>`
          + `<label>Пауза, мс<input type="number" value="${a.holdDuration||2000}" min="0" max="15000" step="100" oninput="updateAnimProp('${d.id}',${ai},'holdDuration',this.value)" onchange="updateAnimProp('${d.id}',${ai},'holdDuration',this.value)"></label>`;
        props.appendChild(capGrid);
        const capDirWrap = document.createElement('div');
        capDirWrap.style.cssText = 'margin-top:4px;display:grid;grid-template-columns:1fr 1fr;gap:4px;';
        const capDirs = [
          { v: 'right', l: '➡ Слева направо' },
          { v: 'left',  l: '⬅ Справа налево' },
          { v: 'down',  l: '⬇ Сверху вниз' },
          { v: 'up',    l: '⬆ Снизу вверх' },
        ];
        capDirs.forEach(btn => {
          const b = document.createElement('button');
          b.textContent = btn.l;
          b.style.cssText = `padding:3px 4px;font-size:9px;font-family:inherit;border-radius:3px;cursor:pointer;border:1px solid var(--border2);background:${(a.captionDir||'right')===btn.v?'var(--accent)':'var(--surface3)'};color:${(a.captionDir||'right')===btn.v?'#fff':'var(--text2)'};transition:.1s;`;
          b.addEventListener('mousedown', e => e.preventDefault());
          b.addEventListener('click', () => {
            updateAnimProp(d.id, ai, 'captionDir', btn.v);
            capDirWrap.querySelectorAll('button').forEach((bb, bi) => {
              const isActive = capDirs[bi].v === btn.v;
              bb.style.background = isActive ? 'var(--accent)' : 'var(--surface3)';
              bb.style.color = isActive ? '#fff' : 'var(--text2)';
            });
          });
          capDirWrap.appendChild(b);
        });
        props.appendChild(capDirWrap);
        const capHint = document.createElement('div');
        capHint.style.cssText = 'font-size:8px;color:var(--text3);margin-top:5px;line-height:1.4;';
        capHint.textContent = '📰 Появление из прозрачности + сдвиг ~10% размера, пауза, исчезновение в прозрачность';
        props.appendChild(capHint);
      }

      // rotate: direction + degrees
      if(a.name === 'rotate'){
        const rotGrid = document.createElement('div');
        rotGrid.className = 'anim-row-props';
        rotGrid.style.marginTop = '4px';
        rotGrid.innerHTML = `<label>Градусов<input type="number" value="${a.rotateDeg!=null?a.rotateDeg:360}" min="-3600" max="3600" step="5" oninput="updateAnimProp('${d.id}',${ai},'rotateDeg',+this.value)" onchange="updateAnimProp('${d.id}',${ai},'rotateDeg',+this.value)"></label>`;
        props.appendChild(rotGrid);

        const rotDirWrap = document.createElement('div');
        rotDirWrap.style.cssText = 'margin-top:4px;display:flex;gap:4px;';
        const rotDirBtns = [
          {v:'cw',  l:'↻ По часовой'},
          {v:'ccw', l:'↺ Против часовой'},
        ];
        rotDirBtns.forEach(btn => {
          const b = document.createElement('button');
          b.textContent = btn.l;
          b.style.cssText = `flex:1;padding:3px 4px;font-size:9px;font-family:inherit;border-radius:3px;cursor:pointer;border:1px solid var(--border2);background:${(a.rotateDir||'cw')===btn.v?'var(--accent)':'var(--surface3)'};color:${(a.rotateDir||'cw')===btn.v?'#fff':'var(--text2)'};transition:.1s;`;
          b.addEventListener('mousedown', e=>e.preventDefault());
          b.addEventListener('click', ()=>{
            updateAnimProp(d.id, ai, 'rotateDir', btn.v);
            rotDirWrap.querySelectorAll('button').forEach((bb,bi)=>{
              const isActive = rotDirBtns[bi].v === btn.v;
              bb.style.background = isActive ? 'var(--accent)' : 'var(--surface3)';
              bb.style.color = isActive ? '#fff' : 'var(--text2)';
            });
          });
          rotDirWrap.appendChild(b);
        });
        props.appendChild(rotDirWrap);
      }

      // Trigger select for all anims
      {
        const trigSel = document.createElement('select');
        trigSel.className = 'anim-trig-sel';
        trigSel.style.cssText = 'width:100%;background:var(--surface3);border:1px solid var(--border);color:var(--text);border-radius:3px;padding:2px 5px;font-size:9px;font-family:inherit;margin-top:4px;';
        [{v:'auto',l:'▶ Авто'},{v:'click',l:'После клика'},{v:'withPrev',l:'⟳ Вместе с предыдущей'},{v:'element',l:'👆 Триггер (клик по объекту)'},{v:'counter',l:'🔢 Счётчик'},{v:'timer',l:'⏱ Таймер'}].forEach(opt=>{
          const o=document.createElement('option'); o.value=opt.v; o.textContent=opt.l;
          trigSel.appendChild(o);
        });
        if ([...trigSel.options].some(o => o.value === trigSelValue)) trigSel.value = trigSelValue;
        trigSel.disabled = trigger === 'nav';
        trigSel.addEventListener('mousedown', e=>e.stopPropagation());
        trigSel.addEventListener('click', e=>e.stopPropagation());
        trigSel.addEventListener('change', ()=>{
          const newTrig = trigSel.value;
          const changes = { trigger: newTrig };
          if (newTrig !== 'element' && newTrig !== 'counter' && newTrig !== 'timer') changes.triggerElId = undefined;
          if (newTrig !== 'nav') changes.navTarget = undefined;
          _setAnimTriggerBatch(d.id, ai, changes);
          const iconSpan = head.querySelector('.anim-trig-icon');
          if(iconSpan) iconSpan.innerHTML = TRIGGER_ICONS[newTrig] || '▶';
          row.dataset.animJson = JSON.stringify(_readAnimLive(d.id, ai, aLive));
          _updateAnimRowTriggerUI(row, d.id, ai, head, trigSel);
          const navCheck = row.querySelector('.anim-nav-check');
          if (navCheck && (newTrig === 'element' || newTrig === 'counter' || newTrig === 'timer')) navCheck.checked = false;
        });
        props.appendChild(trigSel);

        if (trigger === 'element' || trigger === 'counter' || trigger === 'timer') {
          props.appendChild(_buildAnimTrigPickWrap(d, ai, aLive));
        }
      }

      const navRow = document.createElement('div');
      navRow.className = 'anim-nav-row';
      navRow.style.cssText = 'margin-top:4px;display:flex;align-items:center;gap:4px;';
      const navCheck = document.createElement('input');
      navCheck.type='checkbox';
      navCheck.className='tog anim-nav-check';
      navCheck.style.cssText='accent-color:var(--accent);flex-shrink:0;';
      navCheck.checked = (trigger === 'nav');
      const navLabel = document.createElement('label');
      navLabel.style.cssText='font-size:9px;color:var(--text2);display:flex;align-items:center;gap:4px;cursor:pointer;flex:1;min-width:0;';
      navLabel.textContent='→ Слайд:';
      const navSel = document.createElement('select');
      navSel.style.cssText='flex:1;min-width:0;background:var(--surface3);border:1px solid var(--border);color:var(--text);border-radius:3px;padding:2px 4px;font-size:9px;font-family:inherit;';
      navSel.disabled = !navCheck.checked;
      _slides().forEach((ss, si) => {
        const o = document.createElement('option');
        o.value = si;
        o.textContent = (si+1) + '. ' + (ss.title||('Слайд '+(si+1)));
        if(si === (typeof aLive.navTarget==='number' ? aLive.navTarget : _cur()+1)) o.selected = true;
        navSel.appendChild(o);
      });
      const applyNav = ()=>{
        navSel.disabled = !navCheck.checked;
        trigSel.disabled = navCheck.checked;
        if(navCheck.checked){
          const s0 = _slides()[_cur()];
          const d0 = s0 && s0.els.find(x => x.id === d.id);
          const anim0 = d0 && d0.anims && d0.anims[ai];
          if (anim0) _rememberPreNavTrigger(anim0, trigSel.value);
          _setAnimTriggerBatch(d.id, ai, { trigger: 'nav', navTarget: +navSel.value });
          const iconSpan = head.querySelector('.anim-trig-icon');
          if(iconSpan) iconSpan.innerHTML = '→';
        } else {
          const s0 = _slides()[_cur()];
          const d0 = s0 && s0.els.find(x => x.id === d.id);
          const anim0 = d0 && d0.anims && d0.anims[ai];
          const changes = anim0 ? _restorePreNavChanges(anim0) : { trigger: trigSel.value || 'auto', navTarget: undefined };
          _setAnimTriggerBatch(d.id, ai, changes);
          if ([...trigSel.options].some(o => o.value === changes.trigger)) trigSel.value = changes.trigger;
          const iconSpan = head.querySelector('.anim-trig-icon');
          if(iconSpan) iconSpan.innerHTML = TRIGGER_ICONS[changes.trigger] || '▶';
          _updateAnimRowTriggerUI(row, d.id, ai, head, trigSel);
        }
      };
      navCheck.addEventListener('mousedown', e=>e.stopPropagation());
      navCheck.addEventListener('change', applyNav);
      navSel.addEventListener('mousedown', e=>e.stopPropagation());
      navSel.addEventListener('change', ()=>{ if(navCheck.checked) applyNav(); });
      navLabel.prepend(navCheck); navLabel.appendChild(navSel);
      navRow.appendChild(navLabel);
      props.appendChild(navRow);

      row.appendChild(props);

      if (openRows.has(d.id + ':' + ai)) {
        props.style.display = 'block';
        row.classList.add('anim-row-open');
      }

      // Toggle on header click
      head.addEventListener('click', e=>{
        if(e._fromDrag || _animDragJustEnded){ _animDragJustEnded = false; return; }
        const wasOpen = props.style.display !== 'none';
        const rowKey = d.id + ':' + ai;
        if (!wasOpen) {
          const cv = document.getElementById('canvas');
          const domEl = cv && cv.querySelector('.el[data-id="' + d.id + '"]');
          const curSel = typeof sel !== 'undefined' ? sel : null;
          const needPick = domEl && (!curSel || curSel.dataset.id !== d.id);
          if (needPick) {
            window._animPendingOpenRows = window._animPendingOpenRows || new Set();
            window._animPendingOpenRows.add(rowKey);
            if (typeof pick === 'function') pick(domEl);
            return;
          }
          props.style.display = 'block';
          row.classList.add('anim-row-open');
          return;
        }
        props.style.display = 'none';
        row.classList.remove('anim-row-open');
      });

      container.appendChild(row);
    });
  }

})();

window._isInsideAnimBlock = function(t) {
  if (!t || !t.closest) return false;
  return !!(
    t.closest('.anim-row') ||
    t.closest('#props-anim-wrap') ||
    t.closest('#anim-assigned-list') ||
    t.closest('#anim-panel-body') ||
    t.closest('#_anim-picker-ov') ||
    t.closest('.anim-trig-pick-wrap') ||
    t.closest('select') ||
    t.closest('.anim-tl-seg') ||
    t.closest('.anim-tl-resize') ||
    t.closest('.anim-tl-playhead') ||
    t.closest('.anim-tl-snap-guide') ||
    t.closest('.anim-item') ||
    t.closest('#anim-more-menu') ||
    t.closest('#anim-more-btn')
  );
};

window._clearAnimBlockSelection = function(opts) {
  opts = opts || {};
  let did = false;
  document.querySelectorAll('.anim-row.anim-row-open').forEach(row => {
    row.classList.remove('anim-row-open');
    const pw = row.querySelector('.anim-row-props-wrap');
    if (pw) pw.style.display = 'none';
    did = true;
  });
  if (!opts.skipTimeline && window._animTlSel && window._animTlSel.size) {
    window._animTlClearSel();
    did = true;
    if (typeof slides !== 'undefined' && typeof cur !== 'undefined' &&
        typeof window.renderAnimTimelineBar === 'function') {
      window.renderAnimTimelineBar(slides[cur]);
    }
  }
  if (window._selectedAnimName) {
    window._selectedAnimName = null;
    window._selectedAnimCat = null;
    document.querySelectorAll('.anim-item.selected').forEach(i => i.classList.remove('selected'));
    did = true;
  }
  if (opts.deselectEl !== false && typeof sel !== 'undefined' && sel) {
    if (typeof pick === 'function') pick(null);
    did = true;
  } else if (did && typeof renderAnimPanel === 'function') {
    renderAnimPanel();
  }
  if (did && typeof window._animTriggerPickCancel === 'function' && !window._animPickerCtx) {
    window._animTriggerPickCancel();
  }
  return did;
};

// Close anim-more-menu when clicking outside; clear anim block selection on outside click
document.addEventListener('mousedown', function(e) {
  if (e.button !== 0) return;
  var menu = document.getElementById('anim-more-menu');
  if (menu && menu.style.display === 'block' && !menu.contains(e.target)) {
    menu.style.display = 'none';
  }
  if (!document.body.classList.contains('anim-tab-active')) return;
  if (e.shiftKey) return;
  if (window._animPickerCtx) return;
  if (e.target.closest && (e.target.closest('#ribbon') || e.target.closest('select') || e.target.closest('#_anim-picker-ov'))) return;
  const focusedTrig = document.activeElement;
  if (focusedTrig && focusedTrig.classList && focusedTrig.classList.contains('anim-trig-sel')) return;
  if (window._isInsideAnimBlock(e.target)) return;
  const inTimeline = e.target.closest('#anim-timeline-ribbon') || e.target.closest('.anim-tl-dock');
  if (inTimeline) {
    window._clearAnimBlockSelection({ deselectEl: false, skipTimeline: true });
    return;
  }
  window._clearAnimBlockSelection({ deselectEl: false });
}, true);

