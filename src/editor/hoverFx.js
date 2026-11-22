/** Hover effects for React canvas / preview / export (subset of js/19-hover.js). */

import { elBoxTransform } from './elTransform.js';
import { applyUncropDom, uncropDataAttrs, imageHasCrop } from './imgUncrop.js';
import { imageOpaqueAtEvent } from './imgAlphaHit.js';
import { normImgFrame } from './imgStyles.js';

export const HFX_OFFSET = 8;

export const HOVER_PRESETS = [
  { id: 'none', labelRu: 'Без эффекта', labelEn: 'None' },
  { id: 'lighter', labelRu: 'Светлее', labelEn: 'Lighter' },
  { id: 'darker', labelRu: 'Темнее', labelEn: 'Darker' },
  { id: 'hue', labelRu: 'Сместить цвет', labelEn: 'Shift hue' },
  { id: 'right', labelRu: 'Вправо', labelEn: 'Right' },
  { id: 'up', labelRu: 'Вверх', labelEn: 'Up' },
  { id: 'imgColor', labelRu: 'Акцент: цвет', labelEn: 'Accent: color', imageOnly: true },
  { id: 'imgBw', labelRu: 'Акцент: Ч/Б', labelEn: 'Accent: B/W', imageOnly: true },
  { id: 'imgSepia', labelRu: 'Акцент: сепия', labelEn: 'Accent: sepia', imageOnly: true },
  { id: 'imgUncrop', labelRu: 'Не обрезать', labelEn: 'Uncrop', imageOnly: true },
];

export function defaultHoverFx() {
  return {
    enabled: false,
    preset: 'lighter',
    dur: 0.3,
    hover: {},
    base: {},
  };
}

export function normalizeHoverFx(fx) {
  const out = fx && typeof fx === 'object' ? { ...fx } : {};
  if (out.dur == null || Number.isNaN(+out.dur)) out.dur = 0.3;
  if (!out.preset) out.preset = 'lighter';
  if (!out.hover || typeof out.hover !== 'object') out.hover = {};
  if (!out.base || typeof out.base !== 'object') out.base = {};
  return out;
}

export function presetsForEl(el, ru) {
  return HOVER_PRESETS.filter((p) => !p.imageOnly || el?.type === 'image').map((p) => ({
    id: p.id,
    label: ru ? p.labelRu : p.labelEn,
  }));
}

/** Filter-only presets hide custom text color/bg/border rows (legacy parity). */
export function isFilterOnlyHoverPreset(preset) {
  return (
    preset === 'lighter' ||
    preset === 'darker' ||
    preset === 'imgBw' ||
    preset === 'imgSepia' ||
    preset === 'imgColor' ||
    preset === 'imgUncrop'
  );
}

export function patchHoverFxField(fx, key, value) {
  const next = normalizeHoverFx(fx);
  next.enabled = true;
  next.hover = { ...next.hover, [key]: value };
  return next;
}

export function imgAccentFilter(accent) {
  if (accent === 'bw') return 'grayscale(1)';
  if (accent === 'sepia') return 'sepia(1)';
  return '';
}

export function isImgColorHoverPreset(preset) {
  return preset === 'imgColor';
}

/**
 * Topmost element under the pointer whose box (or opaque image pixel) is hit.
 * Transparent image pixels are skipped so the object behind can be picked/dragged.
 * @param {object[]} els
 * @param {Element} root
 * @param {number} clientX
 * @param {number} clientY
 * @param {{ ids?: Set<string>, requireHoverFx?: boolean, skipId?: string, editingId?: string }} [opts]
 */
export function opaqueElAt(els, root, clientX, clientY, opts = {}) {
  if (!root || !els || !els.length) return null;
  const onlyIds = opts.ids || null;
  const requireHoverFx = !!opts.requireHoverFx;
  const skip = opts.skipId != null ? String(opts.skipId) : '';
  const editing = opts.editingId != null ? String(opts.editingId) : '';
  for (let i = els.length - 1; i >= 0; i--) {
    const el = els[i];
    if (!el || el._isDecor || el.objHidden || el.type === 'inkhost') continue;
    const id = String(el.id);
    if (onlyIds && !onlyIds.has(id)) continue;
    if (requireHoverFx && (!el.hoverFx || !el.hoverFx.enabled)) continue;
    if (skip && id === skip) continue;
    if (editing && id === editing) continue;
    const node = root.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!node) continue;
    const r = node.getBoundingClientRect();
    if (clientX < r.left || clientY < r.top || clientX >= r.right || clientY >= r.bottom) continue;
    if (el.type === 'image' && normImgFrame(el.imgFrame) === 'none') {
      if (!imageOpaqueAtEvent(node, clientX, clientY, el.imgFit || 'contain', imageHasCrop(el))) {
        continue;
      }
    }
    return el;
  }
  return null;
}

/** Topmost hover-fx element under the pointer. Transparent image pixels are skipped. */
export function hoverTargetIdAt(els, root, clientX, clientY, opts = {}) {
  const hit = opaqueElAt(els, root, clientX, clientY, { ...opts, requireHoverFx: true });
  return hit ? String(hit.id) : null;
}

/** Per-element bind for simple (non-overlapping) hover. Images use stacking hit-test instead. */
export function hoverMouseBind(el, setHovered) {
  if (!el) return {};
  if (el.type === 'image' && normImgFrame(el.imgFrame) === 'none') return {};
  return {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };
}

function presetFilter(preset) {
  if (preset === 'lighter') return 'brightness(1.25)';
  if (preset === 'darker') return 'brightness(0.75)';
  if (preset === 'hue') return 'hue-rotate(28deg)';
  if (preset === 'imgBw') return 'grayscale(1)';
  if (preset === 'imgSepia') return 'sepia(1)';
  if (preset === 'imgColor') return '';
  return '';
}

/**
 * Build hoverFx after enabling or changing preset.
 * Keeps custom text hover colors when switching non-filter presets.
 */
export function withHoverPreset(el, fx, preset) {
  const prev = normalizeHoverFx(fx);
  const next = normalizeHoverFx(fx);
  next.enabled = true;
  next.preset = preset || next.preset || 'lighter';
  next.base = {
    x: el?.x || 0,
    y: el?.y || 0,
    w: el?.w || 100,
    h: el?.h || 60,
    rot: el?.rot || 0,
    scale: 1,
    elOpacity: el?.elOpacity != null ? +el.elOpacity : 1,
  };
  const hover = { ...next.base };
  if (next.preset === 'right') hover.x = (next.base.x || 0) + HFX_OFFSET;
  else if (next.preset === 'up') hover.y = (next.base.y || 0) - HFX_OFFSET;

  if (!isFilterOnlyHoverPreset(next.preset) && el?.type === 'text') {
    ['textColor', 'textBg', 'textBgOp', 'textBorderW', 'textBorderColor'].forEach((k) => {
      if (prev.hover && prev.hover[k] != null && prev.hover[k] !== '') hover[k] = prev.hover[k];
    });
  }
  next.hover = hover;
  return next;
}

/**
 * Style patch for hovered / resting state (merged onto element box).
 */
export function hoverMotionStyle(el, fx, hovered) {
  const n = normalizeHoverFx(fx);
  if (!n.enabled) return null;
  const dur = `${Math.max(0.05, Math.min(2, +n.dur || 0.3))}s`;
  const baseXf = elBoxTransform(el) || '';
  const rest = {
    transition: `transform ${dur} ease, filter ${dur} ease, opacity ${dur} ease, color ${dur} ease, background ${dur} ease, border ${dur} ease`,
    cursor: 'pointer',
  };
  if (!hovered) {
    return { ...rest };
  }

  const preset = n.preset || 'none';
  const parts = [];
  if (baseXf) parts.push(baseXf);
  if (preset === 'right') parts.push(`translateX(${HFX_OFFSET}px)`);
  else if (preset === 'up') parts.push(`translateY(-${HFX_OFFSET}px)`);
  else if (n.hover && n.hover.scale != null && +n.hover.scale !== 1) {
    parts.push(`scale(${+n.hover.scale})`);
  }

  let filter = '';
  if (el?.type === 'image') {
    const base = imgAccentFilter(el.imgAccent);
    if (preset === 'imgBw') filter = 'grayscale(1)';
    else if (preset === 'imgSepia') filter = 'sepia(1)';
    else if (preset === 'imgColor') filter = '';
    else {
      const pf = presetFilter(preset);
      filter = [base, pf].filter(Boolean).join(' ');
    }
  } else {
    filter = presetFilter(preset) || '';
  }

  const out = { ...rest };
  if (parts.length) out.transform = parts.join(' ');
  if (filter) out.filter = filter;
  if (n.hover && n.hover.elOpacity != null && +n.hover.elOpacity !== 1) {
    out.opacity = +n.hover.elOpacity;
  }

  if (el?.type === 'text' && !isFilterOnlyHoverPreset(preset)) {
    const h = n.hover || {};
    if (h.textColor) out.color = h.textColor;
    if (h.textBg) out.background = h.textBg;
    const bw = +(h.textBorderW || 0);
    if (bw > 0) {
      out.border = `${bw}px solid ${h.textBorderColor || '#ffffff'}`;
      out.boxSizing = 'border-box';
    }
  }
  return out;
}

/** data-* attrs for export / playback. */
export function hoverExportAttrs(el) {
  const fx = el?.hoverFx;
  if (!fx || !fx.enabled) return {};
  const n = normalizeHoverFx(fx);
  const h = n.hover || {};
  const attrs = {
    'data-hfx': '1',
    'data-hfx-preset': n.preset || 'lighter',
    'data-hfx-dur': String(n.dur != null ? n.dur : 0.3),
  };
  if (el?.type === 'text' && !isFilterOnlyHoverPreset(n.preset)) {
    if (h.textColor) attrs['data-hfx-text'] = h.textColor;
    if (h.textBg) attrs['data-hfx-bg'] = h.textBg;
    if (+h.textBorderW > 0) {
      attrs['data-hfx-bw'] = String(+h.textBorderW);
      attrs['data-hfx-bc'] = h.textBorderColor || '#ffffff';
    }
  }
  if (el?.type === 'image') {
    attrs['data-hfx-img-accent'] = el.imgAccent || 'color';
    attrs['data-hfx-img-fit'] = el.imgFit || 'contain';
    if (imageHasCrop(el)) attrs['data-hfx-img-crop'] = '1';
    if (normImgFrame(el.imgFrame) === 'none') attrs['data-hfx-img-alpha'] = '1';
    if (n.preset === 'imgUncrop') Object.assign(attrs, uncropDataAttrs(el));
  }
  return attrs;
}

/** Inline CSS class helpers for standalone HTML. */
export const PLAYBACK_HOVER_CSS = `
.el[data-hfx="1"]{cursor:pointer;transition:transform var(--hfx-dur,.3s) ease,filter var(--hfx-dur,.3s) ease,opacity var(--hfx-dur,.3s) ease,color var(--hfx-dur,.3s) ease,background var(--hfx-dur,.3s) ease,border var(--hfx-dur,.3s) ease}
.el[data-uncrop="1"]{overflow:visible}
.el[data-uncrop="1"]>div{overflow:hidden}
`.replace(/\n/g, '');

function applyHoverDom(el, on) {
  const p = el.getAttribute('data-hfx-preset') || 'lighter';
  const dur = el.getAttribute('data-hfx-dur') || '0.3';
  el.style.setProperty('--hfx-dur', `${dur}s`);
  if (!el.hasAttribute('data-hfx-base-xf')) {
    el.setAttribute('data-hfx-base-xf', el.style.transform || '');
  }
  const base = el.getAttribute('data-hfx-base-xf') || '';
  if (p === 'imgUncrop') {
    applyUncropDom(el, on, +dur || 0.3);
    return;
  }
  const im = el.querySelector && el.querySelector('img');
  const tape = !!(el.querySelector && (el.querySelector('.react-img-ribbon-bar') || el.querySelector('.react-img-polaroid-cap')));
  if (im && !im.hasAttribute('data-hfx-base-filter')) {
    im.setAttribute('data-hfx-base-filter', im.style.filter || imgAccentFilter(el.getAttribute('data-hfx-img-accent')));
  }
  if (!on) {
    el.style.transform = base;
    el.style.filter = '';
    el.style.color = '';
    el.style.background = '';
    el.style.border = '';
    if (im) im.style.filter = im.getAttribute('data-hfx-base-filter') || '';
    return;
  }
  let t = base;
  if (p === 'right') t = `${base} translateX(8px)`.trim();
  else if (p === 'up') t = `${base} translateY(-8px)`.trim();
  el.style.transform = t;
  let hf = '';
  if (p === 'lighter') hf = 'brightness(1.25)';
  else if (p === 'darker') hf = 'brightness(0.75)';
  else if (p === 'hue') hf = 'hue-rotate(28deg)';
  else if (p === 'imgBw') hf = 'grayscale(1)';
  else if (p === 'imgSepia') hf = 'sepia(1)';
  if (tape) {
    el.style.filter = '';
    if (im) {
      im.style.filter = p === 'imgColor' ? 'none' : [im.getAttribute('data-hfx-base-filter') || '', hf].filter(Boolean).join(' ');
    }
  } else {
    el.style.filter = hf;
    if (im && p === 'imgColor') im.style.filter = 'none';
  }

  const tc = el.getAttribute('data-hfx-text');
  const bg = el.getAttribute('data-hfx-bg');
  const bw = +(el.getAttribute('data-hfx-bw') || 0);
  const bc = el.getAttribute('data-hfx-bc') || '#ffffff';
  if (tc) el.style.color = tc;
  if (bg) el.style.background = bg;
  if (bw > 0) el.style.border = `${bw}px solid ${bc}`;
}

/** Wire hover in a DOM root. Stacked images: topmost opaque pixel wins. */
export function wireHoverInRoot(root) {
  if (!root) return () => {};
  const onMove = (e) => {
    const nodes = root.querySelectorAll('.el[data-hfx="1"]');
    let hit = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const el = nodes[i];
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientY < r.top || e.clientX >= r.right || e.clientY >= r.bottom) continue;
      if (el.getAttribute('data-hfx-img-alpha') === '1') {
        const fit = el.getAttribute('data-hfx-img-fit') || 'contain';
        const crop = el.getAttribute('data-hfx-img-crop') === '1';
        if (!imageOpaqueAtEvent(el, e.clientX, e.clientY, fit, crop)) continue;
      }
      hit = el;
      break;
    }
    nodes.forEach((el) => applyHoverDom(el, el === hit));
  };
  const onLeave = () => {
    root.querySelectorAll('.el[data-hfx="1"]').forEach((el) => applyHoverDom(el, false));
  };
  root.addEventListener('mousemove', onMove);
  root.addEventListener('mouseleave', onLeave);
  return () => {
    root.removeEventListener('mousemove', onMove);
    root.removeEventListener('mouseleave', onLeave);
  };
}

/** Tiny runtime for standalone/playback pages. */
export function buildHoverPlaybackSnippet() {
  return `(function(){
  function apply(el, on){
    var p=el.getAttribute('data-hfx-preset')||'lighter';
    var dur=el.getAttribute('data-hfx-dur')||'0.3';
    el.style.setProperty('--hfx-dur', dur+'s');
    if(!el.hasAttribute('data-hfx-base-xf')) el.setAttribute('data-hfx-base-xf', el.style.transform||'');
    var base=el.getAttribute('data-hfx-base-xf')||'';
    if(p==='imgUncrop'){
      if(el.getAttribute('data-uncrop')==='1'){
        var d=Math.max(0.05,+dur||0.3);
        var pl=+el.getAttribute('data-uncrop-pl')||0,pt=+el.getAttribute('data-uncrop-pt')||0;
        var w=+el.getAttribute('data-uncrop-w')||el.offsetWidth,h=+el.getAttribute('data-uncrop-h')||el.offsetHeight;
        var fw=+el.getAttribute('data-uncrop-fw')||(w+pl+(+el.getAttribute('data-uncrop-pr')||0));
        var fh=+el.getAttribute('data-uncrop-fh')||(h+pt+(+el.getAttribute('data-uncrop-pb')||0));
        var im=el.querySelector('img'); var inn=im&&im.parentElement;
        if(im&&inn){
          var tr='left '+d+'s ease,top '+d+'s ease,width '+d+'s ease,height '+d+'s ease';
          if(!el._uncropWinReady){
            inn.style.transition='none'; im.style.transition='none';
            inn.style.position='absolute'; inn.style.overflow='hidden'; inn.style.clipPath='none';
            inn.style.left='0px'; inn.style.top='0px'; inn.style.width=w+'px'; inn.style.height=h+'px';
            im.style.position='absolute'; im.style.maxWidth='none';
            im.style.left=(-pl)+'px'; im.style.top=(-pt)+'px'; im.style.width=fw+'px'; im.style.height=fh+'px';
            void inn.offsetWidth; el._uncropWinReady=true;
          }
          inn.style.transition=tr; im.style.transition=tr;
          inn.style.overflow='hidden'; inn.style.position='absolute';
          im.style.position='absolute'; im.style.maxWidth='none'; im.style.width=fw+'px'; im.style.height=fh+'px';
          if(on){ inn.style.left=(-pl)+'px'; inn.style.top=(-pt)+'px'; inn.style.width=fw+'px'; inn.style.height=fh+'px'; im.style.left='0px'; im.style.top='0px'; el.style.zIndex='24'; im.style.pointerEvents='auto'; }
          else { inn.style.left='0px'; inn.style.top='0px'; inn.style.width=w+'px'; inn.style.height=h+'px'; im.style.left=(-pl)+'px'; im.style.top=(-pt)+'px'; el.style.zIndex=''; im.style.pointerEvents='none'; }
          el.style.overflow='visible';
        }
      }
      return;
    }
    var im=el.querySelector('img');
    var tape=!!(el.querySelector('.react-img-ribbon-bar')||el.querySelector('.react-img-polaroid-cap'));
    if(im&&!im.hasAttribute('data-hfx-base-filter')){
      var acc=el.getAttribute('data-hfx-img-accent')||'';
      im.setAttribute('data-hfx-base-filter', im.style.filter||(acc==='bw'?'grayscale(1)':acc==='sepia'?'sepia(1)':''));
    }
    if(!on){
      el.style.transform=base; el.style.filter='';
      el.style.color=''; el.style.background=''; el.style.border='';
      if(im) im.style.filter=im.getAttribute('data-hfx-base-filter')||'';
      return;
    }
    var t=base;
    if(p==='right') t=(base+' translateX(8px)').trim();
    else if(p==='up') t=(base+' translateY(-8px)').trim();
    el.style.transform=t;
    var hf='';
    if(p==='lighter') hf='brightness(1.25)';
    else if(p==='darker') hf='brightness(0.75)';
    else if(p==='hue') hf='hue-rotate(28deg)';
    else if(p==='imgBw') hf='grayscale(1)';
    else if(p==='imgSepia') hf='sepia(1)';
    if(tape){
      el.style.filter='';
      if(im) im.style.filter=p==='imgColor'?'none':[im.getAttribute('data-hfx-base-filter')||'',hf].filter(Boolean).join(' ');
    } else {
      el.style.filter=hf;
      if(im&&p==='imgColor') im.style.filter='none';
    }
    var tc=el.getAttribute('data-hfx-text');
    var bg=el.getAttribute('data-hfx-bg');
    var bw=+(el.getAttribute('data-hfx-bw')||0);
    var bc=el.getAttribute('data-hfx-bc')||'#ffffff';
    if(tc) el.style.color=tc;
    if(bg) el.style.background=bg;
    if(bw>0) el.style.border=bw+'px solid '+bc;
  }
  function localPt(el,cx,cy){
    var w=el.offsetWidth,h=el.offsetHeight;
    if(w<=0||h<=0) return null;
    var box=el.getBoundingClientRect();
    if(box.width<=0||box.height<=0) return null;
    var st=getComputedStyle(el), xf=st.transform;
    if(!xf||xf==='none'){
      return {x:(cx-box.left)*w/box.width,y:(cy-box.top)*h/box.height,w:w,h:h};
    }
    try{
      var m=new DOMMatrix(xf);
      var o=(st.transformOrigin||'').split(' ');
      var ox=parseFloat(o[0]), oy=parseFloat(o[1]);
      if(!isFinite(ox)) ox=w/2; if(!isFinite(oy)) oy=h/2;
      var cs=[[0,0],[w,0],[w,h],[0,h]];
      var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
      for(var i=0;i<4;i++){
        var p=m.transformPoint({x:cs[i][0]-ox,y:cs[i][1]-oy});
        if(p.x<minX)minX=p.x; if(p.y<minY)minY=p.y;
        if(p.x>maxX)maxX=p.x; if(p.y>maxY)maxY=p.y;
      }
      var aw=maxX-minX, ah=maxY-minY;
      if(aw<=1e-6||ah<=1e-6) return null;
      var tx=(cx-box.left)*aw/box.width+minX;
      var ty=(cy-box.top)*ah/box.height+minY;
      var q=m.inverse().transformPoint({x:tx,y:ty});
      return {x:q.x+ox,y:q.y+oy,w:w,h:h};
    }catch(e){
      return {x:(cx-box.left)*w/box.width,y:(cy-box.top)*h/box.height,w:w,h:h};
    }
  }
  function opaque(el,ev){
    var loc=localPt(el,ev.clientX,ev.clientY);
    if(!loc||loc.x<0||loc.y<0||loc.x>=loc.w||loc.y>=loc.h) return false;
    var im=el.querySelector('img'); if(!im||!im.naturalWidth) return true;
    try{
      if(!im._ac){
        var c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight;
        var g=c.getContext('2d'); g.drawImage(im,0,0); im._ac=g;
      }
      var nx=Math.max(0,Math.min(im.naturalWidth-1,(loc.x/loc.w)*im.naturalWidth|0));
      var ny=Math.max(0,Math.min(im.naturalHeight-1,(loc.y/loc.h)*im.naturalHeight|0));
      return im._ac.getImageData(nx,ny,1,1).data[3]>16;
    }catch(e){ return true; }
  }
  function pick(ev){
    var nodes=document.querySelectorAll('.el[data-hfx="1"]');
    var hit=null;
    for(var i=nodes.length-1;i>=0;i--){
      var el=nodes[i];
      var r=el.getBoundingClientRect();
      if(ev.clientX<r.left||ev.clientY<r.top||ev.clientX>=r.right||ev.clientY>=r.bottom) continue;
      if(el.getAttribute('data-hfx-img-alpha')==='1' && !opaque(el,ev)) continue;
      hit=el; break;
    }
    nodes.forEach(function(el){ apply(el, el===hit); });
  }
  document.addEventListener('mousemove', pick);
  document.addEventListener('mouseleave', function(){
    document.querySelectorAll('.el[data-hfx="1"]').forEach(function(el){ apply(el, false); });
  });
})();`;
}
