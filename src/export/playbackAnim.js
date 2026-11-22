/** Shared CSS + helpers for HTML export / playback window anims + cameras. */

import {
  animCssClass,
  collectSlidePlaybackSteps,
  isEntranceAnim,
  isLiveAnim,
} from '../editor/anims.js';
import { hoverExportAttrs, PLAYBACK_HOVER_CSS, buildHoverPlaybackSnippet } from '../editor/hoverFx.js';
import { uncropDataAttrs } from '../editor/imgUncrop.js';
import { elBoxTransform } from '../editor/elTransform.js';
import { isMotionAnim } from '../editor/motionPlay.js';
import { isRecolorAnim } from '../editor/recolorPlay.js';
import { isTypewriterAnim } from '../editor/typewriterPlay.js';
import {
  isTransformAnim,
  lerpTransformEl,
  resolveTransformSnapColors,
} from '../editor/transformPlay.js';
import { buildBasicShapeSVG, shapeOptsFromEl } from '../shared/shapes.js';
import { isLangFadeAnim } from '../editor/langFadePlay.js';
import { isSplitHalfAnim } from '../editor/splitHalfPlay.js';
import { isCaptionSlideAnim } from '../editor/captionSlidePlay.js';
import { isCosmosTitleAnim } from '../editor/cosmosTitlePlay.js';
import { isParticlesAnim } from '../editor/particlesPlay.js';
import { isInkDrawAnim } from '../editor/inkDrawPlay.js';
import { isFloatAnim } from '../editor/floatPlay.js';

export { PLAYBACK_HOVER_CSS, buildHoverPlaybackSnippet };

export const PLAYBACK_ANIM_CSS = `
.el-wait{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
.el[data-link]{cursor:pointer}
.el{--el-xf:none}
@keyframes elFadeIn{from{opacity:0}to{opacity:1}}
@keyframes elSlideUp{from{opacity:0;transform:translateY(28px) var(--el-xf)}to{opacity:1;transform:var(--el-xf)}}
@keyframes elSlideDown{from{opacity:0;transform:translateY(-28px) var(--el-xf)}to{opacity:1;transform:var(--el-xf)}}
@keyframes elSlideLeft{from{opacity:0;transform:translateX(36px) var(--el-xf)}to{opacity:1;transform:var(--el-xf)}}
@keyframes elSlideRight{from{opacity:0;transform:translateX(-36px) var(--el-xf)}to{opacity:1;transform:var(--el-xf)}}
@keyframes elZoomIn{from{opacity:0;transform:scale(.7) var(--el-xf)}to{opacity:1;transform:var(--el-xf)}}
@keyframes elBounce{0%{opacity:0;transform:translateY(40px) var(--el-xf)}60%{opacity:1;transform:translateY(-8px) var(--el-xf)}100%{transform:var(--el-xf)}}
@keyframes elSpin{from{opacity:0;transform:rotate(-180deg) scale(.6) var(--el-xf)}to{opacity:1;transform:var(--el-xf)}}
@keyframes elFadeOut{from{opacity:1}to{opacity:0}}
@keyframes elSlideOut{from{opacity:1;transform:var(--el-xf)}to{opacity:0;transform:translateX(40px) var(--el-xf)}}
@keyframes elZoomOut{from{opacity:1;transform:var(--el-xf)}to{opacity:0;transform:scale(.6) var(--el-xf)}}
@keyframes elPulse{0%,100%{transform:scale(1) var(--el-xf)}50%{transform:scale(1.06) var(--el-xf)}}
@keyframes elShake{0%,100%{transform:translateX(0) var(--el-xf)}25%{transform:translateX(-6px) var(--el-xf)}75%{transform:translateX(6px) var(--el-xf)}}
@keyframes elFlash{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes elDance{0%,100%{transform:rotate(0) translateY(0) var(--el-xf)}25%{transform:rotate(-10deg) translateY(-5px) var(--el-xf)}50%{transform:rotate(0) translateY(2px) var(--el-xf)}75%{transform:rotate(10deg) translateY(-3px) var(--el-xf)}}
@keyframes elSwing{0%,100%{transform:rotate(0) var(--el-xf)}50%{transform:rotate(14deg) var(--el-xf)}}
@keyframes elFloat{0%,100%{transform:translate(0,0) var(--el-xf)}25%{transform:translate(8px,-10px) var(--el-xf)}50%{transform:translate(-5px,-4px) var(--el-xf)}75%{transform:translate(5px,7px) var(--el-xf)}}
.el-anim-fadein{animation:elFadeIn ease both}
.el-anim-slideup{animation:elSlideUp ease both}
.el-anim-slidedown{animation:elSlideDown ease both}
.el-anim-slideleft{animation:elSlideLeft ease both}
.el-anim-slideright{animation:elSlideRight ease both}
.el-anim-zoomin{animation:elZoomIn ease both}
.el-anim-bounce{animation:elBounce ease both}
.el-anim-spin{animation:elSpin ease both}
.el-anim-fadeout{animation:elFadeOut ease both}
.el-anim-slideout{animation:elSlideOut ease both}
.el-anim-zoomout{animation:elZoomOut ease both}
.el-anim-pulse{animation:elPulse .6s ease both}
.el-anim-shake{animation:elShake .45s ease both}
.el-anim-flash{animation:elFlash .5s ease both}
.el-anim-dance{animation:elDance 1.2s ease-in-out infinite}
.el-anim-swing{animation:elSwing 1s ease-in-out infinite;transform-origin:top center}
.el-anim-float{animation:elFloat 3s ease-in-out infinite}
.el.has-particles,.react-el.has-particles{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
`.replace(/\n/g, '');

/**
 * Precompute transform morph frames for standalone HTML playback.
 * Mirrors preview `fireTransformAnim` (box + adj/shape SVG + basic colors).
 */
export function bakeTransformPlaybackSamples(from, to, dur, theme = null) {
  if (!from || !to) return null;
  const fromR = resolveTransformSnapColors(from, theme);
  const toR = resolveTransformSnapColors(to, theme);
  const ms = Math.max(50, +(dur || 800));
  const n = Math.max(8, Math.min(60, Math.round(ms / 33)));
  const samples = [];
  for (let i = 0; i <= n; i++) {
    const mid = lerpTransformEl(fromR, toR, i / n);
    if (!mid) continue;
    const sample = {
      x: +(mid.x || 0),
      y: +(mid.y || 0),
      w: Math.max(1, +(mid.w || 100)),
      h: Math.max(1, +(mid.h || 60)),
      rot: +(mid.rot || 0),
      shapeFlipH: !!mid.shapeFlipH,
      shapeFlipV: !!mid.shapeFlipV,
    };
    if (mid.elOpacity != null) sample.op = +mid.elOpacity;
    if (mid.fill) sample.fill = mid.fill;
    if (mid.stroke) sample.stroke = mid.stroke;
    if (mid.sw != null) sample.sw = +mid.sw;
    if (mid.textColor) sample.tc = mid.textColor;
    if (mid.type === 'shape' || mid.shape) {
      try {
        sample.svg = buildBasicShapeSVG(mid.shape || 'rect', shapeOptsFromEl(mid));
      } catch (e) {
        /* keep prior */
      }
    }
    samples.push(sample);
  }
  return samples.length ? samples : null;
}

/** Cameras interleaved with anim bundles via slide.animOrder. */
export function deckPlaybackSteps(slides) {
  return (slides || []).map((s) => collectSlidePlaybackSteps(s));
}

/** @deprecated alias */
export function deckAnimSteps(slides) {
  return deckPlaybackSteps(slides);
}

export function serializePlaybackSteps(steps, theme = null) {
  return (steps || []).map((s) => {
    if (s.kind === 'camera') {
      const cam = s.cam || {};
      return {
        kind: 'camera',
        dur: s.dur != null ? +s.dur : 1200,
        delay: s.delay != null ? +s.delay : 0,
        cam: {
          cx: +cam.cx,
          cy: +cam.cy,
          w: +cam.w,
          h: +cam.h || undefined,
          rot: +cam.rot || 0,
        },
      };
    }
    const out = {
      kind: 'bundle',
      auto: !!s.auto,
      items: (s.items || []).map((it) => {
        if (it.kind === 'camera') {
          const cam = it.cam || {};
          return {
            kind: 'camera',
            dur: it.dur != null ? +it.dur : 1200,
            delay: it.delay != null ? +it.delay : 0,
            cam: {
              cx: +cam.cx,
              cy: +cam.cy,
              w: +cam.w,
              h: +cam.h || undefined,
              rot: +cam.rot || 0,
            },
          };
        }
        const item = {
          elId: String(it.elId),
          ai: it.ai != null ? +it.ai : undefined,
          name: it.name,
          cls: it.name === 'pause' ? '' : animCssClass(it.name),
          dur: it.dur || 600,
          delay: it.delay || 0,
          live: it.name === 'pause' ? false : isLiveAnim(it.name),
          pause: it.name === 'pause',
          motion: it.name !== 'pause' && (isMotionAnim(it.name) || isRecolorAnim(it.name) || isTypewriterAnim(it.name) || isTransformAnim(it.name) || isLangFadeAnim(it.name) || isSplitHalfAnim(it.name) || isCaptionSlideAnim(it.name) || isCosmosTitleAnim(it.name) || isParticlesAnim(it.name) || isInkDrawAnim(it.name) || isFloatAnim(it.name) || it.name === 'uncrop'),
          rot: it.rot || 0,
        };
        if (it.repeatCycleStart) item.repeatCycleStart = true;
        if (it.repeatInfinite) item.repeatInfinite = true;
        if (it.repeatId) item.repeatId = it.repeatId;
        if (it.easing) item.easing = it.easing;
        if (it.name === 'moveTo' || it.name === 'pathTo') {
          item.tx = it.tx || 0;
          item.ty = it.ty || 0;
          if (it.pathPts) item.pathPts = it.pathPts;
        }
        if (it.name === 'orbitTo') {
          item.orbitR = it.orbitR;
          item.orbitDir = it.orbitDir || 'cw';
          item.orbitDeg = it.orbitDeg != null ? it.orbitDeg : 360;
          item.orbitCx = it.orbitCx || 0;
          item.orbitCy = it.orbitCy || 0;
        }
        if (it.name === 'rotate') {
          item.rotateDir = it.rotateDir || 'cw';
          item.rotateDeg = it.rotateDeg != null ? it.rotateDeg : 360;
        }
        if (it.name === 'mirror') {
          item.mirrorAxis = it.mirrorAxis === 'v' ? 'v' : 'h';
        }
        if (it.name === 'recolor') {
          item.recolorColor = it.recolorColor || '#000000';
          item.recolorInvert = !!it.recolorInvert;
        }
        if (it.name === 'typewriter') {
          item.charDelay = it.charDelay != null ? +it.charDelay : 40;
          item.fromHtml = it.fromHtml || '';
          item.toHtml = it.toHtml || '';
        }
        if (it.name === 'transform') {
          item.from = it.from || null;
          item.to = it.to || null;
          // Bake SVG/box/color frames so standalone HTML matches preview morph
          // (runtime cannot import buildBasicShapeSVG).
          const samples = bakeTransformPlaybackSamples(item.from, item.to, item.dur, theme);
          if (samples?.length) item.samples = samples;
        }
        if (it.name === 'langFade') {
          item.fromHtml = it.fromHtml || '';
          item.toHtml = it.toHtml || '';
          item.fromLang = it.fromLang || '';
          item.toLang = it.toLang || '';
        }
        if (it.name === 'captionSlide') {
          item.holdDuration = it.holdDuration != null ? +it.holdDuration : 2000;
          item.captionDir = it.captionDir || 'right';
        }
        if (it.name === 'particles') {
          item.particleCount = it.particleCount != null ? +it.particleCount : 14;
          item.ptDir = it.ptDir != null ? +it.ptDir : 0;
          item.ptLife = it.ptLife != null ? +it.ptLife : 900;
          item.ptSizeRand = it.ptSizeRand != null ? +it.ptSizeRand : 51;
          item.ptRot = it.ptRot != null ? +it.ptRot : 32;
          item.ptSpread = it.ptSpread != null ? +it.ptSpread : 100;
          item.swingCount = it.swingCount != null ? +it.swingCount : 1;
        }
        if (it.name === 'inkDraw') {
          item.swingCount = it.swingCount != null ? +it.swingCount : 1;
          item.inkParallel = it.inkParallel === 'all' ? 'all' : it.inkParallel != null ? +it.inkParallel : 1;
        }
        if (it.name === 'float') {
          item.swingCount = it.swingCount != null ? +it.swingCount : 10;
        }
        if (it.name === 'dance') {
          item.swingCount = it.swingCount != null ? +it.swingCount : 1;
        }
        if (it.name === 'swing') {
          item.swingCount = it.swingCount != null ? +it.swingCount : 1;
          if (it.swingOx != null) item.swingOx = +it.swingOx;
          if (it.swingOy != null) item.swingOy = +it.swingOy;
        }
        if (it.name === 'pulse' || it.name === 'shake' || it.name === 'flash') {
          item.swingCount = it.swingCount != null ? +it.swingCount : 1;
          if (item.swingCount >= 10) item.live = true;
        }
        return item;
      }),
    };
    if (s.repeatCycleStart) out.repeatCycleStart = true;
    if (s.repeatInfinite) out.repeatInfinite = true;
    if (s.repeatId) out.repeatId = s.repeatId;
    return out;
  });
}

/** @deprecated alias */
export function serializeBundleSteps(steps) {
  return serializePlaybackSteps(steps);
}

/** Attach data-id / data-link / el-wait onto exported element markup. */
export function decorateExportEl(el, html, opts = {}) {
  if (!html || !el || el._isDecor) return html;
  const wait =
    (el.anims || []).some(
      (a) =>
        a &&
        (isEntranceAnim(a.name) || a.name === 'cosmosTitle' || a.name === 'captionSlide')
    ) ||
    !!(el.groupId && opts.cosmosGroups && opts.cosmosGroups.has(el.groupId)) ||
    !!(el.groupId && opts.entranceGroups && opts.entranceGroups.has(el.groupId));
  let out = html.replace(/^<([a-zA-Z0-9]+)/, (m, tag) => {
    let attrs = `<${tag}`;
    if (el.id != null) attrs += ` data-id="${String(el.id).replace(/"/g, '')}"`;
    if (el.groupId) attrs += ` data-gid="${String(el.groupId).replace(/"/g, '')}"`;
    if (el.link) {
      const link = String(el.link).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      attrs += ` data-link="${link}"`;
      attrs += ` data-linkt="${String(el.linkt || '_blank').replace(/"/g, '')}"`;
    }
    const hfx = hoverExportAttrs(el);
    Object.keys(hfx).forEach((k) => {
      attrs += ` ${k}="${String(hfx[k]).replace(/"/g, '')}"`;
    });
    const uncrop = uncropDataAttrs(el);
    Object.keys(uncrop).forEach((k) => {
      if (hfx[k] != null) return;
      attrs += ` ${k}="${String(uncrop[k]).replace(/"/g, '')}"`;
    });
    const xf = elBoxTransform(el);
    if (xf) attrs += ` data-xf="${String(xf).replace(/"/g, '')}"`;
    return attrs;
  });
  // Match `class="el"`, `class="el react-el-text"`, etc. — exact `class="el"` missed compound classes.
  out = out.replace(/\bclass="([^"]*)"/, (m, cls) => {
    if (!/(?:^|\s)el(?:\s|$)/.test(cls)) return m;
    if (wait && !/(?:^|\s)el-wait(?:\s|$)/.test(cls)) {
      return `class="${cls} el-wait"`;
    }
    return m;
  });
  if (el.link || (el.hoverFx && el.hoverFx.enabled)) out = out.replace(/style="/, 'style="cursor:pointer;');
  if (el.linkHover || el.link) {
    const hv = String(el.linkHover || '#93c5fd').replace(/"/g, '');
    if (/style="/.test(out)) out = out.replace(/style="/, `style="--sf-link-hover:${hv};`);
    else out = out.replace(/^<([a-zA-Z0-9]+)/, `<$1 style="--sf-link-hover:${hv}"`);
  }
  return out;
}

/**
 * Inline slideshow controller for standalone HTML (no modules).
 * Includes element anims + Prezi-like cameras + slide transitions + connector rides.
 */
export function buildStandalonePlaybackScript({
  W,
  H,
  animData,
  transData,
  rideData,
  arLayouts,
  chrome = {},
}) {
  const dataJson = JSON.stringify(animData);
  const transJson = JSON.stringify(transData || []);
  const rideJson = JSON.stringify(rideData || []);
  // Compact per-slide layouts: { '16:9': {w,h,e:{id:{x,y,w,h}}}, '9:16': {...} }
  const arJson = JSON.stringify(arLayouts || []);
  const showFooter = chrome.footer !== false;
  const showSidenav = chrome.sidenav !== false;
  const showEsc = chrome.esc !== false;
  const showBrush = chrome.brush === true;
  return `(function(){
  var frames=[].slice.call(document.querySelectorAll('.slide-frame'));
  var slides=frames.map(function(fr){return fr.querySelector('.slide');});
  var ANIM=${dataJson};
  var TRANS=${transJson};
  var RIDES=${rideJson};
  var ARL=${arJson};
  var SHOW_FOOTER=${showFooter ? 'true' : 'false'};
  var SHOW_SIDENAV=${showSidenav ? 'true' : 'false'};
  var SHOW_ESC=${showEsc ? 'true' : 'false'};
  var SHOW_BRUSH=${showBrush ? 'true' : 'false'};
  var i=0, stepI=0, busy=false, busyT=null, skippedRepeat={}, W=${W}, H=${H};
  var BASE_W=W, BASE_H=H;
  var camState={cx:W/2,cy:H/2,w:W,h:H,rot:0};
  var camCtl=null;
  var rideCancels=[];
  var curArKey=null;
  var ENTER={fade:'pv-enter-fade',dissolve:'pv-enter-fade',morph:'pv-enter-fade',slide:'pv-enter-slide',push:'pv-enter-slide',wipe:'pv-enter-slide',reveal:'pv-enter-slide',slideUp:'pv-enter-slide-up',zoom:'pv-enter-zoom',cube:'pv-enter-zoom',zoomOut:'pv-enter-zoom-out',flip:'pv-enter-flip',flipV:'pv-enter-flip',glitch:'pv-enter-glitch',split:'pv-enter-split'};
  function aspect(){return H/Math.max(1,W);}
  function fullCam(){return {cx:W/2,cy:H/2,w:W,h:H,rot:0};}
  function isFull(st){
    if(!st) return true;
    return Math.abs(+st.rot||0)<0.05 && Math.abs((+st.w||W)-W)<0.75 &&
      Math.abs((+st.cx||W/2)-W/2)<1 && Math.abs((+st.cy||H/2)-H/2)<1;
  }
  function camCss(st, fit){
    var state=st||fullCam();
    fit=fit>0?fit:1;
    if(isFull(state)) return 'scale('+fit+')';
    var s=W/Math.max(1e-6,+state.w||W);
    var rot=-(+state.rot||0);
    var cx=+state.cx||W/2, cy=+state.cy||H/2;
    return 'scale('+fit+') translate('+ (W/2) +'px,'+ (H/2) +'px) rotate('+rot+'deg) scale('+s+') translate('+ (-cx) +'px,'+ (-cy) +'px)';
  }
  function applyCam(el, st, fit){
    if(!el) return;
    camState={cx:+st.cx,cy:+st.cy,w:+st.w,h:+st.h||(+st.w*aspect()),rot:+st.rot||0};
    // No will-change: keep vectors crisp like the editor canvas zoom.
    el.style.willChange='auto';
    el.style.transformOrigin='top left';
    el.style.transform=camCss(camState, fit);
  }
  function fitScale(){ return Math.min(window.innerWidth/W, window.innerHeight/H); }
  function clearEnterCls(fr){
    if(!fr) return;
    fr.className=(fr.className||'').replace(/\\bpv-enter-\\S+/g,'').replace(/\\s+/g,' ').trim();
  }
  function clearBusy(){
    if(busyT){clearTimeout(busyT);busyT=null;}
    busy=false;
  }
  function abortCam(finish, revert){
    if(!camCtl) return;
    camCtl.aborted=true;
    (camCtl.rafs||[]).forEach(function(id){cancelAnimationFrame(id);});
    (camCtl.timers||[]).forEach(function(t){clearTimeout(t);});
    if(finish && camCtl.to) applyCam(slides[i], camCtl.to, fitScale());
    else if(revert && camCtl.from) applyCam(slides[i], camCtl.from, fitScale());
    camCtl=null;
  }
  function skipBusy(){
    if(!busy && !camCtl) return false;
    abortCam(true);
    clearEnterCls(frames[i]);
    clearBusy();
    return true;
  }
  function fit(){
    var s=fitScale();
    frames.forEach(function(fr){
      fr.style.width=(W*s)+'px';
      fr.style.height=(H*s)+'px';
    });
    slides.forEach(function(sl){
      if(!sl) return;
      sl.style.width=W+'px';
      sl.style.height=H+'px';
    });
    if(slides[i]) applyCam(slides[i], camState, s);
  }
  function wantedArKey(){
    return window.innerHeight>window.innerWidth+8 ? '9:16' : '16:9';
  }
  function hasAnyAr(){
    if(!ARL||!ARL.length) return false;
    for(var si=0;si<ARL.length;si++){
      var pack=ARL[si];
      if(pack&&(pack['16:9']||pack['9:16'])) return true;
    }
    return false;
  }
  function applyGeomToEl(node, g){
    if(!node||!g) return;
    if(g.x!=null) node.style.left=(+g.x)+'px';
    if(g.y!=null) node.style.top=(+g.y)+'px';
    if(g.w!=null) node.style.width=(+g.w)+'px';
    if(g.h!=null) node.style.height=(+g.h)+'px';
    if(g.textColor) node.style.color=g.textColor;
  }
  function scaleGeom(g, fromW, fromH, toW, toH, keepAspect){
    var sx=toW/Math.max(1,fromW), sy=toH/Math.max(1,fromH);
    var uni=Math.min(sx,sy);
    var ow=+g.w||100, oh=+g.h||60;
    var cx=(+g.x||0)+ow/2, cy=(+g.y||0)+oh/2;
    var nw=keepAspect?Math.max(1,Math.round(ow*uni)):Math.max(1,Math.round(ow*sx));
    var nh=keepAspect?Math.max(1,Math.round(oh*uni)):Math.max(1,Math.round(oh*sy));
    return {
      x:Math.round(cx*sx-nw/2),
      y:Math.round(cy*sy-nh/2),
      w:nw, h:nh,
      textColor:g.textColor
    };
  }
  function applyArLayouts(key){
    if(!hasAnyAr()) return false;
    if(key===curArKey) return false;
    var targetW=null, targetH=null;
    for(var si=0;si<slides.length;si++){
      var pack=ARL[si]||{};
      var lay=pack[key];
      var other=pack[key==='9:16'?'16:9':'9:16'];
      var root=slides[si];
      if(!root) continue;
      if(lay&&lay.e){
        if(lay.w) targetW=+lay.w;
        if(lay.h) targetH=+lay.h;
        Object.keys(lay.e).forEach(function(id){
          var node=root.querySelector('.el[data-id="'+id+'"]');
          applyGeomToEl(node, lay.e[id]);
        });
      } else if(other&&other.e){
        // Only one authored format — auto-scale into the other orientation
        var tw=key==='9:16'?Math.min(BASE_W,BASE_H):Math.max(BASE_W,BASE_H);
        var th=key==='9:16'?Math.max(BASE_W,BASE_H):Math.min(BASE_W,BASE_H);
        targetW=tw; targetH=th;
        var fw=+other.w||BASE_W, fh=+other.h||BASE_H;
        Object.keys(other.e).forEach(function(id){
          var node=root.querySelector('.el[data-id="'+id+'"]');
          var src=other.e[id];
          // Keep aspect for every box when synthesizing the missing orientation
          applyGeomToEl(node, scaleGeom(src, fw, fh, tw, th, true));
        });
      }
    }
    if(targetW&&targetH){
      W=targetW; H=targetH;
      camState={cx:W/2,cy:H/2,w:W,h:H,rot:0};
      curArKey=key;
      return true;
    }
    return false;
  }
  function syncOrientation(){
    if(!hasAnyAr()) return;
    var key=wantedArKey();
    if(applyArLayouts(key)) fit();
  }
  function clearRides(){
    rideCancels.forEach(function(fn){try{fn();}catch(e){}});
    rideCancels=[];
  }
  function startRide(riderEl, pathD, opts){
    if(!riderEl||!pathD) return function(){};
    var dur=Math.max(0.3,opts.duration||3.5), gap=Math.max(0,opts.gap||0), total=dur+gap;
    var inv=!!opts.invert, baseOp=opts.opacity!=null?opts.opacity:1, baseRot=opts.baseRot||0;
    var holder=document.createElementNS('http://www.w3.org/2000/svg','svg');
    holder.setAttribute('width','0'); holder.setAttribute('height','0');
    holder.style.cssText='position:absolute;left:-9999px;top:-9999px;overflow:hidden;';
    var sample=document.createElementNS('http://www.w3.org/2000/svg','path');
    sample.setAttribute('d',pathD); holder.appendChild(sample); document.body.appendChild(holder);
    var len=0; try{len=sample.getTotalLength();}catch(e){len=0;}
    if(!len||!isFinite(len)){document.body.removeChild(holder);return function(){};}
    var w=riderEl.offsetWidth||parseFloat(riderEl.style.width)||0;
    var h=riderEl.offsetHeight||parseFloat(riderEl.style.height)||0;
    riderEl.style.left='0px'; riderEl.style.top='0px';
    riderEl.style.transformOrigin='center center'; riderEl.style.willChange='transform,opacity';
    var raf=0, start=performance.now(), stopped=false;
    function pointAt(dist){try{return sample.getPointAtLength(Math.max(0,Math.min(len,dist)));}catch(e){return {x:0,y:0};}}
    function angleAt(dist){
      var eps=Math.max(0.75,Math.min(4,len*0.002)), dA, dB;
      if(!inv){dA=Math.max(0,dist-eps*0.5);dB=Math.min(len,dist+eps*0.5);}
      else{dA=Math.min(len,dist+eps*0.5);dB=Math.max(0,dist-eps*0.5);}
      var a=pointAt(dA), b=pointAt(dB), dx=b.x-a.x, dy=b.y-a.y;
      if(Math.abs(dx)<1e-6&&Math.abs(dy)<1e-6) return baseRot;
      return (Math.atan2(dy,dx)*180)/Math.PI+baseRot;
    }
    function frame(now){
      if(stopped||!riderEl.isConnected) return;
      var elapsed=((now-start)/1000)%total, op=0, frac=inv?1:0;
      if(elapsed<=dur){
        var p=elapsed/dur; frac=inv?1-p:p;
        if(p<0.15) op=baseOp*(p/0.15); else if(p>0.85) op=baseOp*((1-p)/0.15); else op=baseOp;
      }
      var dist=frac*len, pt=pointAt(dist), ang=angleAt(dist);
      riderEl.style.opacity=String(op);
      riderEl.style.transform='translate('+(pt.x-w/2)+'px,'+(pt.y-h/2)+'px) rotate('+ang+'deg)';
      raf=requestAnimationFrame(frame);
    }
    raf=requestAnimationFrame(frame);
    return function(){stopped=true;cancelAnimationFrame(raf);try{document.body.removeChild(holder);}catch(e){}};
  }
  function startSlideRides(){
    clearRides();
    var root=slides[i]; if(!root) return;
    (RIDES[i]||[]).forEach(function(spec){
      var node=root.querySelector('[data-id="'+String(spec.elId).replace(/"/g,'')+'"]');
      if(!node) return;
      rideCancels.push(startRide(node, spec.d, {
        duration:spec.duration, gap:spec.gap, invert:spec.invert, opacity:spec.opacity, baseRot:spec.baseRot
      }));
    });
  }
  function readClass(el){
    if(!el) return '';
    var c=el.className;
    if(typeof c==='string') return c;
    if(c&&typeof c.baseVal==='string') return c.baseVal;
    return el.getAttribute('class')||'';
  }
  function writeClass(el, v){
    if(!el) return;
    var next=String(v||'');
    // SVGElement.className is SVGAnimatedString — assigning a string throws / no-ops.
    if(el.className&&typeof el.className==='object'&&'baseVal' in el.className){
      el.className.baseVal=next;
    } else if(typeof el.className==='string'){
      el.className=next;
    } else {
      el.setAttribute('class', next);
    }
  }
  function authoredXf(el){
    return (el&&el.getAttribute&&el.getAttribute('data-xf'))||'';
  }
  function restoreAuthoredXf(el){
    if(!el||!el.style) return;
    var xf=authoredXf(el);
    el.style.transform=xf;
    if(xf) el.style.setProperty('--el-xf', xf);
    else el.style.removeProperty('--el-xf');
  }
  function resetSlide(root){
    if(!root) return;
    root.querySelectorAll('.el').forEach(function(el){
      writeClass(el, readClass(el).replace(/\\bel-anim-\\S+/g,'').replace(/\\s+/g,' ').trim());
      el.style.animationDuration='';
      restoreAuthoredXf(el);
      el.style.transition='';
      // Undo baked moveTo left/top so a returning group move animates every member again.
      if(el._motionBaseX!=null) el.style.left=el._motionBaseX+'px';
      if(el._motionBaseY!=null) el.style.top=el._motionBaseY+'px';
      el._motionBaseX=null;
      el._motionBaseY=null;
      // Restore pre-transform box/SVG so replay starts from authored from-pose.
      if(el._tfBase){
        var b=el._tfBase;
        if(b.left!=null) el.style.left=b.left;
        if(b.top!=null) el.style.top=b.top;
        if(b.width!=null) el.style.width=b.width;
        if(b.height!=null) el.style.height=b.height;
        el.style.transform=b.transform||authoredXf(el)||'';
        if(b.transform||authoredXf(el)) el.style.setProperty('--el-xf', b.transform||authoredXf(el));
        el.style.opacity=b.opacity||'';
        if(b.svg!=null){
          var ring=el.querySelector('.react-shape-sel-ring');
          var svgs=el.querySelectorAll('svg');          for(var si=0;si<svgs.length;si++){
            if(!ring||!ring.contains(svgs[si])){
              if(svgs[si].parentNode) svgs[si].parentNode.innerHTML=b.svg;
              break;
            }
          }
        }
        el._tfBase=null;
      }
      if(el.classList.contains('el-wait')){
        el.style.visibility='hidden'; el.style.opacity='0';
      } else {
        el.style.visibility=''; el.style.opacity='';
      }
    });
  }
  function findEl(root, id){
    return root.querySelector('[data-id="'+String(id).replace(/"/g,'')+'"]');
  }
  function groupEls(root, el){
    if(!root||!el) return el?[el]:[];
    var gid=el.getAttribute('data-gid');
    if(!gid) return [el];
    var list=[];
    root.querySelectorAll('[data-gid="'+String(gid).replace(/"/g,'')+'"]').forEach(function(n){ list.push(n); });
    return list.length?list:[el];
  }
  var cumMap={};
  var motionGen={};
  function cancelElAnims(el){
    if(!el||!el.getAnimations) return;
    try{ el.getAnimations().forEach(function(a){ try{a.cancel();}catch(e){} }); }catch(e){}
  }
  function motionBase(el){
    if(el._motionBaseX==null) el._motionBaseX=parseFloat(el.style.left)||0;
    if(el._motionBaseY==null) el._motionBaseY=parseFloat(el.style.top)||0;
    return {x:el._motionBaseX,y:el._motionBaseY};
  }
  function bakeMotion(el, endTx, endTy, rot, gen, elId){
    if(elId!=null && motionGen[elId]!==gen) return;
    var b=motionBase(el);
    el.style.left=(b.x+endTx)+'px';
    el.style.top=(b.y+endTy)+'px';
    // Keep authored rotation/flip (data-xf) after motion bake — preview does the same via elBoxTransform.
    var xf=authoredXf(el);
    el.style.transform=((rot||'')+(xf?(' '+xf):'')).trim();
    el.style.transition='';
  }
  function prepMotionFlight(el, cumTx, cumTy, rot){
    var b=motionBase(el);
    el.style.left=b.x+'px';
    el.style.top=b.y+'px';
    var xf=authoredXf(el);
    el.style.transform='translate('+cumTx+'px,'+cumTy+'px)'+(rot||'')+(xf?(' '+xf):'');
  }
  function fireMotion(el, step, cumTx, cumTy){
    var dur=Math.max(50, step.dur||600), delay=Math.max(0, step.delay||0);
    var rot=step.rot?(' rotate('+step.rot+'deg)'):'';
    var axf=authoredXf(el);
    var axfS=axf?(' '+axf):'';
    var easing=step.easing==='ease-in'?'ease-in':step.easing==='ease-out'?'ease-out':(step.easing==='ease-in-out'||step.easing==='ease')?'ease-in-out':'linear';
    var elId=step.elId!=null?String(step.elId):'';
    var gen=(motionGen[elId]||0)+1; motionGen[elId]=gen;
    cancelElAnims(el);
    if(step.name==='pathTo' || (step.pathPts && step.pathPts.length)){
      prepMotionFlight(el, cumTx, cumTy, rot);
      var pts=step.pathPts||[{x:step.tx||0,y:step.ty||0}];
      var last=pts[pts.length-1]||{x:0,y:0};
      var ptx=cumTx+(last.x||0), pty=cumTy+(last.y||0);
      var framesP=[{transform:'translate('+cumTx+'px,'+cumTy+'px)'+rot+axfS}];
      for(var pi=0;pi<pts.length;pi++){
        framesP.push({transform:'translate('+(cumTx+(pts[pi].x||0))+'px,'+(cumTy+(pts[pi].y||0))+'px)'+rot+axfS});
      }
      if(el.animate){
        var ap=el.animate(framesP,{duration:dur,delay:delay,easing:easing,fill:'forwards',composite:'replace'});
        ap.onfinish=function(){ try{ap.commitStyles();}catch(e){} ap.cancel(); bakeMotion(el, ptx, pty, rot, gen, elId); };
      } else {
        setTimeout(function(){ bakeMotion(el, ptx, pty, rot, gen, elId); }, delay+dur);
      }
      return {endTx:ptx,endTy:pty,wait:delay+dur};
    }
    if(step.name==='moveTo'){
      prepMotionFlight(el, cumTx, cumTy, rot);
      var tx=cumTx+(step.tx||0), ty=cumTy+(step.ty||0);
      if(el.animate){
        var a=el.animate(
          [{transform:'translate('+cumTx+'px,'+cumTy+'px)'+rot+axfS},
           {transform:'translate('+tx+'px,'+ty+'px)'+rot+axfS}],
          {duration:dur, delay:delay, easing:easing, fill:'forwards', composite:'replace'}
        );
        a.onfinish=function(){ try{a.commitStyles();}catch(e){} a.cancel(); bakeMotion(el, tx, ty, rot, gen, elId); };
      } else {
        setTimeout(function(){ bakeMotion(el, tx, ty, rot, gen, elId); }, delay+dur);
      }
      return {endTx:tx, endTy:ty, wait:delay+dur};
    }
    if(step.name==='orbitTo'){
      prepMotionFlight(el, cumTx, cumTy, rot);
      var dir=(step.orbitDir||'cw')==='cw'?1:-1;
      var totalDeg=(step.orbitDeg!=null?step.orbitDeg:360)*dir;
      var ocx=step.orbitCx||0, ocy=step.orbitCy||0;
      var r=Math.sqrt(ocx*ocx+ocy*ocy)||step.orbitR||120;
      var sa=Math.atan2(-ocy,-ocx);
      var stepsN=Math.max(60, Math.abs(totalDeg)*2), frames=[], i;
      for(i=0;i<=stepsN;i++){
        var t=i/stepsN, ang=sa+(totalDeg*Math.PI/180)*t;
        frames.push({transform:'translate('+(cumTx+ocx+r*Math.cos(ang)).toFixed(2)+'px,'+(cumTy+ocy+r*Math.sin(ang)).toFixed(2)+'px)'+rot+axfS});
      }
      var endTx=cumTx+ocx+r*Math.cos(sa+(totalDeg*Math.PI/180));
      var endTy=cumTy+ocy+r*Math.sin(sa+(totalDeg*Math.PI/180));
      if(el.animate){
        var b=el.animate(frames,{duration:dur, delay:delay, easing:easing, fill:'forwards', composite:'replace'});
        b.onfinish=function(){ try{b.commitStyles();}catch(e){} b.cancel(); bakeMotion(el, endTx, endTy, rot, gen, elId); };
      } else {
        setTimeout(function(){ bakeMotion(el, endTx, endTy, rot, gen, elId); }, delay+dur);
      }
      return {endTx:endTx, endTy:endTy, wait:delay+dur};
    }
    if(step.name==='rotate'){
      var rdir=(step.rotateDir||'cw')==='cw'?1:-1;
      var rdeg=(step.rotateDeg!=null?step.rotateDeg:360)*rdir;
      var ec=el.querySelector('.ec')||el.querySelector('.iel')||null;
      var tgt=ec||el;
      var comp=ec?'replace':'add';
      if(tgt.animate){
        var ra=tgt.animate([{transform:'rotate(0deg)'},{transform:'rotate('+rdeg+'deg)'}],{duration:dur, delay:delay, easing:'linear', fill:'forwards', composite:comp});
        ra.onfinish=function(){ try{ra.commitStyles();}catch(e){} ra.cancel(); };
      }
      return {endTx:cumTx, endTy:cumTy, wait:delay+dur};
    }
    if(step.name==='mirror'){
      var axis=step.mirrorAxis==='v'?'v':'h';
      var mt=el.querySelector('.ec')||el.querySelector('.iel')||el;
      var mcomp=mt!==el?'replace':'add';
      var prop=axis==='h'?'rotateY':'rotateX';
      var persp='perspective(900px) ';
      if(el._mirrorCumH==null) el._mirrorCumH=false;
      if(el._mirrorCumV==null) el._mirrorCumV=false;
      var curH=!!el._mirrorCumH, curV=!!el._mirrorCumV;
      var nextH=axis==='h'?!curH:curH, nextV=axis==='v'?!curV:curV;
      el._mirrorCumH=nextH; el._mirrorCumV=nextV;
      function scaleOf(h,v){return 'scale('+(h?-1:1)+','+(v?-1:1)+')';}
      var startScale=scaleOf(curH,curV), endScale=scaleOf(nextH,nextV);
      mt.style.transformOrigin='center center';
      if(mt.animate){
        var mframes=mcomp==='replace'
          ?[{transform:persp+startScale+' '+prop+'(0deg)'},{transform:persp+startScale+' '+prop+'(180deg)'}]
          :[{transform:persp+prop+'(0deg)'},{transform:persp+prop+'(180deg)'}];
        var ma=mt.animate(mframes,{duration:Math.max(80,dur), delay:delay, easing:'cubic-bezier(0.4, 0, 0.2, 1)', fill:'forwards', composite:mcomp});
        ma.onfinish=function(){ try{ma.commitStyles();}catch(e){} ma.cancel(); if(mcomp==='replace') mt.style.transform=endScale; };
      }
      return {endTx:cumTx, endTy:cumTy, wait:delay+Math.max(80,dur)};
    }
    return {endTx:cumTx, endTy:cumTy, wait:0};
  }
  function fireRecolor(el, step){
    var dur=Math.max(50, step.dur||600), delay=Math.max(0, step.delay||0);
    var hex=String(step.recolorColor||'#000000');
    var invert=!!step.recolorInvert;
    var target=el.querySelector('img')||el.querySelector('svg')||el.querySelector('.ec')||el;
    function norm(c){var h=String(c||'#000').trim(); if(/^#[0-9a-fA-F]{3}$/.test(h)) h='#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3]; return /^#[0-9a-fA-F]{6}$/.test(h)?h.toLowerCase():'#000000';}
    hex=norm(hex);
    var r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
    function mat(t){var d=t,o=1-t; return d.toFixed(4)+' 0 0 0 '+(r*o).toFixed(4)+' 0 '+d.toFixed(4)+' 0 0 '+(g*o).toFixed(4)+' 0 0 '+d.toFixed(4)+' 0 '+(b*o).toFixed(4)+' 0 0 0 1 0';}
    var svg=document.getElementById('_recolor-svg-filters');
    if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.id='_recolor-svg-filters'; svg.setAttribute('aria-hidden','true'); svg.style.cssText='position:absolute;width:0;height:0;overflow:hidden'; document.body.appendChild(svg);}
    var fid='_recolor_pb_'+String(step.elId).replace(/[^a-zA-Z0-9_-]/g,'');
    var filter=document.getElementById(fid);
    if(!filter){filter=document.createElementNS('http://www.w3.org/2000/svg','filter'); filter.setAttribute('id',fid); filter.setAttribute('color-interpolation-filters','sRGB'); var fm=document.createElementNS('http://www.w3.org/2000/svg','feColorMatrix'); fm.setAttribute('type','matrix'); filter.appendChild(fm); svg.appendChild(filter);}
    var fmEl=filter.querySelector('feColorMatrix');
    var curT=el._recolorT;
    var hasF=/_recolor_pb_/.test(String(target.style.filter||''));
    var atSil=curT!=null?curT<0.5:!!hasF;
    var visual=curT!=null?curT:(atSil?0:1);
    var fromT=visual, toT=invert?0:(visual<0.5?1:0);
    if(Math.abs(fromT-toT)<0.05){ toT=fromT<0.5?1:0; fromT=fromT<0.5?0:1; }
    fmEl.setAttribute('values', mat(fromT));
    target.style.filter='url(#'+fid+')';
    setTimeout(function(){
      var t0=performance.now();
      function frame(now){
        var p=Math.min(1,(now-t0)/dur);
        var e=p<0.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
        var t=fromT+(toT-fromT)*e;
        fmEl.setAttribute('values', mat(t));
        el._recolorT=t;
        if(p<1) requestAnimationFrame(frame);
        else if(toT>=0.999){ el._recolorT=1; target.style.filter=''; if(filter.parentNode) filter.parentNode.removeChild(filter); }
        else el._recolorT=toT;
      }
      requestAnimationFrame(frame);
    }, delay);
    return delay+dur;
  }
  function fireUncrop(el, step){
    var dur=Math.max(50, step.dur||400), delay=Math.max(0, step.delay||0);
    if(el.getAttribute('data-uncrop')!=='1') return delay;
    var on=!el._uncropOn;
    function go(){
      var d=Math.max(0.05, dur/1000);
      var pl=+el.getAttribute('data-uncrop-pl')||0,pt=+el.getAttribute('data-uncrop-pt')||0;
      var w=+el.getAttribute('data-uncrop-w')||el.offsetWidth,h=+el.getAttribute('data-uncrop-h')||el.offsetHeight;
      var fw=+el.getAttribute('data-uncrop-fw')||(w+pl+(+el.getAttribute('data-uncrop-pr')||0));
      var fh=+el.getAttribute('data-uncrop-fh')||(h+pt+(+el.getAttribute('data-uncrop-pb')||0));
      var im=el.querySelector('img'); var inn=im&&im.parentElement;
      if(!im||!inn){ el._uncropOn=on; return; }
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
      el._uncropOn=on;
    }
    if(delay>0) setTimeout(go, delay); else go();
    return delay+dur;
  }
  function clearRecolorFilters(root){
    if(!root) return;
    root.querySelectorAll('.el').forEach(function(el){
      [el.querySelector('img'), el.querySelector('svg'), el.querySelector('.ec'), el].forEach(function(tgt){
        if(tgt && tgt.style && /_recolor_pb_/.test(String(tgt.style.filter||''))) tgt.style.filter='';
      });
    });
  }
  function prepareRecolor(root){
    if(!root) return;
    var steps=ANIM[i]||[];
    steps.forEach(function(bundle){
      ((bundle&&bundle.items)||[]).forEach(function(step){
        if(!step||step.name!=='recolor'||step.recolorInvert) return;
        var el=findEl(root, step.elId); if(!el) return;
        var hex=String(step.recolorColor||'#000000');
        function norm(c){var h=String(c||'#000').trim(); if(/^#[0-9a-fA-F]{3}$/.test(h)) h='#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3]; return /^#[0-9a-fA-F]{6}$/.test(h)?h.toLowerCase():'#000000';}
        hex=norm(hex);
        var r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
        function mat(t){var d=t,o=1-t; return d.toFixed(4)+' 0 0 0 '+(r*o).toFixed(4)+' 0 '+d.toFixed(4)+' 0 0 '+(g*o).toFixed(4)+' 0 0 '+d.toFixed(4)+' 0 '+(b*o).toFixed(4)+' 0 0 0 1 0';}
        var target=el.querySelector('img')||el.querySelector('svg')||el.querySelector('.ec')||el;
        var svg=document.getElementById('_recolor-svg-filters');
        if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.id='_recolor-svg-filters'; svg.setAttribute('aria-hidden','true'); svg.style.cssText='position:absolute;width:0;height:0;overflow:hidden'; document.body.appendChild(svg);}
        var fid='_recolor_pb_'+String(step.elId).replace(/[^a-zA-Z0-9_-]/g,'');
        var filter=document.getElementById(fid);
        if(!filter){filter=document.createElementNS('http://www.w3.org/2000/svg','filter'); filter.setAttribute('id',fid); filter.setAttribute('color-interpolation-filters','sRGB'); var fm=document.createElementNS('http://www.w3.org/2000/svg','feColorMatrix'); fm.setAttribute('type','matrix'); filter.appendChild(fm); svg.appendChild(filter);}
        var fmEl=filter.querySelector('feColorMatrix');
        fmEl.setAttribute('values', mat(0));
        target.style.filter='url(#'+fid+')';
        el._recolorT=0;
      });
    });
  }
  function fireTypewriter(el, step){
    var delay=Math.max(0, step.delay||0);
    var charDelay=Math.max(5, step.charDelay||40);
    function htmlToPlain(html){ return String(html||'').replace(/<[^>]*>/g,''); }
    function wrapPlain(text){ return '<div style="width:100%;white-space:pre-wrap;word-break:break-word;">'+text+'</div>'; }
    var fromPlain=htmlToPlain(step.fromHtml);
    var toPlain=htmlToPlain(step.toHtml);
    var tel=el.querySelector('.react-shape-text > div')||el.querySelector('.react-shape-text')||el.querySelector('.shape-text')||el.querySelector('[contenteditable]')||null;
    if(!tel){
      var divs=Array.prototype.slice.call(el.querySelectorAll(':scope > div'));
      tel=divs.find(function(dv){ return dv.style.position!=='absolute'; })||divs[0]||null;
    }
    if(!tel) return 0;
    function run(){
      var deleteStep=0, totalDelete=fromPlain.length;
      function doDelete(){
        if(deleteStep>=totalDelete){ tel.innerHTML=wrapPlain(''); requestAnimationFrame(function(){ doPrint(0); }); return; }
        tel.innerHTML=wrapPlain(fromPlain.slice(0, totalDelete-deleteStep));
        deleteStep+=1;
        setTimeout(doDelete, charDelay);
      }
      function doPrint(stepN){
        if(stepN>=toPlain.length){ tel.innerHTML=wrapPlain(toPlain); return; }
        tel.innerHTML=wrapPlain(toPlain.slice(0, stepN+1));
        setTimeout(function(){ doPrint(stepN+1); }, charDelay);
      }
      doDelete();
    }
    if(delay>0) setTimeout(run, delay); else run();
    return delay+(fromPlain.length+toPlain.length)*charDelay+40;
  }
  function fireTransform(el, step){
    var delay=Math.max(0, step.delay||0);
    var dur=Math.max(50, step.dur||800);
    var samples=step.samples;
    var from=step.from||null;
    var to=step.to||from;
    function easeT(t, name){
      var u=Math.max(0, Math.min(1, +t||0));
      if(name==='ease-in') return u*u;
      if(name==='ease-out') return 1-(1-u)*(1-u);
      if(name==='ease-in-out'||name==='ease') return u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
      return u;
    }
    function lerp(a,b,t){ return (+a||0)+((+b||0)-(+a||0))*t; }
    function shapeHost(node){
      var ring=node.querySelector('.react-shape-sel-ring');
      var list=node.querySelectorAll('svg');
      for(var i=0;i<list.length;i++){
        if(!ring||!ring.contains(list[i])) return list[i].parentNode||null;
      }
      return null;
    }
    function textHolder(node){
      return node.querySelector('.react-shape-text > div')
        || node.querySelector('.react-el-text > div')
        || node.querySelector('.shape-text')
        || null;
    }
    function rememberBase(){
      if(el._tfBase) return;
      var host=shapeHost(el);
      el._tfBase={
        left:el.style.left, top:el.style.top,
        width:el.style.width, height:el.style.height,
        transform:el.style.transform, opacity:el.style.opacity,
        svg:host?host.innerHTML:null
      };
    }
    function applySample(s){
      if(!s) return;
      rememberBase();
      el.style.left=(s.x||0)+'px';
      el.style.top=(s.y||0)+'px';
      el.style.width=Math.max(1,s.w||100)+'px';
      el.style.height=Math.max(1,s.h||60)+'px';
      if(s.op!=null) el.style.opacity=String(s.op);
      var parts=[];
      if(s.rot) parts.push('rotate('+s.rot+'deg)');
      if(s.shapeFlipH||s.flipH) parts.push('scaleX(-1)');
      if(s.shapeFlipV||s.flipV) parts.push('scaleY(-1)');
      el.style.transform=parts.length?parts.join(' '):'';
      el.style.transformOrigin='center center';
      if(s.svg){
        var host=shapeHost(el);
        if(host) host.innerHTML=s.svg;
      }
      if(s.tc){
        var th=textHolder(el);
        if(th) th.style.color=s.tc;
      }
    }
    function applyBox(mid){
      rememberBase();
      el.style.left=(mid.x||0)+'px';
      el.style.top=(mid.y||0)+'px';
      el.style.width=Math.max(1, mid.w||100)+'px';
      el.style.height=Math.max(1, mid.h||60)+'px';
      var parts=[];
      if(mid.rot) parts.push('rotate('+mid.rot+'deg)');
      if(mid.flipH) parts.push('scaleX(-1)');
      if(mid.flipV) parts.push('scaleY(-1)');
      el.style.transform=parts.length?parts.join(' '):'';
      el.style.transformOrigin='center center';
    }
    if(samples&&samples.length){
      function runSamples(){
        applySample(samples[0]);
        var t0=performance.now();
        function tick(now){
          var raw=Math.min(1,(now-t0)/dur);
          var e=easeT(raw, step.easing||'linear');
          var f=e*(samples.length-1);
          var i0=Math.floor(f);
          var i1=Math.min(samples.length-1, i0+1);
          var u=f-i0;
          var a=samples[i0], b=samples[i1];
          applySample({
            x:lerp(a.x,b.x,u), y:lerp(a.y,b.y,u),
            w:lerp(a.w,b.w,u), h:lerp(a.h,b.h,u),
            rot:lerp(a.rot,b.rot,u),
            shapeFlipH:u<0.5?!!a.shapeFlipH:!!b.shapeFlipH,
            shapeFlipV:u<0.5?!!a.shapeFlipV:!!b.shapeFlipV,
            op:a.op!=null||b.op!=null?lerp(a.op!=null?a.op:1,b.op!=null?b.op:1,u):null,
            svg:u<0.5?a.svg:b.svg,
            tc:u<0.5?(a.tc||b.tc):(b.tc||a.tc)
          });
          if(raw<1) requestAnimationFrame(tick);
          else applySample(samples[samples.length-1]);
        }
        requestAnimationFrame(tick);
      }
      if(delay>0) setTimeout(runSamples, delay); else runSamples();
      return delay+dur;
    }
    if(!from||!to) return 0;
    function asFlip(s){
      return { x:s.x,y:s.y,w:s.w,h:s.h,rot:s.rot,
        flipH:!!(s.shapeFlipH||s.flipH), flipV:!!(s.shapeFlipV||s.flipV) };
    }
    function run(){
      applyBox(asFlip(from));
      var t0=performance.now();
      function tick(now){
        var raw=Math.min(1,(now-t0)/dur);
        var e=easeT(raw, step.easing||'linear');
        applyBox({
          x:lerp(from.x,to.x,e), y:lerp(from.y,to.y,e),
          w:lerp(from.w,to.w,e), h:lerp(from.h,to.h,e),
          rot:lerp(from.rot,to.rot,e),
          flipH:e<0.5?!!(from.shapeFlipH||from.flipH):!!(to.shapeFlipH||to.flipH),
          flipV:e<0.5?!!(from.shapeFlipV||from.flipV):!!(to.shapeFlipV||to.flipV)
        });
        if(raw<1) requestAnimationFrame(tick); else applyBox(asFlip(to));
      }
      requestAnimationFrame(tick);
    }
    if(delay>0) setTimeout(run, delay); else run();
    return delay+dur;
  }
  function fireLangFade(el, step){
    var delay=Math.max(0, step.delay||0);
    var dur=Math.max(120, step.dur||800);
    var fromStored=step.fromHtml!=null?step.fromHtml:'';
    var toStored=step.toHtml!=null?step.toHtml:fromStored;
    function plain(html){
      try{ var box=document.createElement('div'); box.innerHTML=String(html||''); return String(box.textContent||'').replace(/\\u200b/g,'').replace(/\\s+/g,' ').trim(); }
      catch(e){ return String(html||'').replace(/<[^>]*>/g,'').replace(/\\u200b/g,'').replace(/\\s+/g,' ').trim(); }
    }
    var tel=el.querySelector('.react-shape-text > div')||el.querySelector('.react-shape-text')||el.querySelector('.shape-text')||el.querySelector('[contenteditable]')||null;
    if(!tel){
      var divs=Array.prototype.slice.call(el.querySelectorAll(':scope > div'));
      tel=divs.find(function(dv){ return dv.style.position!=='absolute'; })||divs[0]||null;
    }
    if(!tel) return 0;
    var fromP=plain(fromStored), toP=plain(toStored);
    var toLayer=tel.querySelector&&tel.querySelector('._langfade_to');
    var curHtml=toLayer?toLayer.innerHTML:tel.innerHTML;
    var curP=plain(curHtml);
    var atTo=(toP&&curP===toP)||el._langFadeSide==='to';
    var atFrom=(fromP&&curP===fromP)||el._langFadeSide==='from';
    var goingTo='to';
    if(atTo&&!atFrom) goingTo='from';
    else if(atFrom&&!atTo) goingTo='to';
    else if(el._langFadeSide==='to') goingTo='from';
    var nextHtml=goingTo==='from'?fromStored:toStored;
    var prevHtml=curP?curHtml:(goingTo==='from'?toStored:fromStored);
    el._langFadeSide=goingTo;
    function start(){
      var wrap=document.createElement('div');
      wrap.className='_langfade_wrap';
      wrap.style.cssText='position:relative;width:100%;min-height:100%;';
      var layerFrom=document.createElement('div');
      layerFrom.className='_langfade_from';
      layerFrom.style.cssText='position:absolute;left:0;top:0;width:100%;opacity:1;z-index:1;pointer-events:none;';
      layerFrom.innerHTML=prevHtml;
      var layerTo=document.createElement('div');
      layerTo.className='_langfade_to';
      layerTo.style.cssText='position:relative;width:100%;opacity:0;z-index:2;pointer-events:none;';
      layerTo.innerHTML=nextHtml;
      wrap.appendChild(layerFrom); wrap.appendChild(layerTo);
      tel.innerHTML=''; tel.appendChild(wrap);
      try{
        var a1=layerFrom.animate([{opacity:1},{opacity:0}],{duration:dur,easing:'ease-in-out',fill:'forwards'});
        var a2=layerTo.animate([{opacity:0},{opacity:1}],{duration:dur,easing:'ease-in-out',fill:'forwards'});
        a2.onfinish=function(){ tel.innerHTML=nextHtml; el._langFadeSide=goingTo; };
        void a1;
      }catch(e){ tel.innerHTML=nextHtml; el._langFadeSide=goingTo; }
    }
    if(delay>0) setTimeout(start, delay); else start();
    return delay+dur;
  }
  function fireSplitHalf(el, step){
    var delay=Math.max(0, step.delay||0);
    var dur=Math.max(80, step.dur||800);
    var w=parseInt(el.style.width,10)||el.offsetWidth||200;
    var h=parseInt(el.style.height,10)||el.offsetHeight||200;
    var fall=Math.round(h*0.45), spread=Math.round(w*0.22), rot=14;
    var easing='cubic-bezier(0.4, 0, 1, 1)';
    function isChrome(ch){
      if(!ch||!ch.classList) return true;
      return ch.classList.contains('link-bar')||ch.classList.contains('_split_wrap')||ch.classList.contains('rh');
    }
    function ensure(){
      var wrap=el.querySelector('._split_wrap');
      if(wrap) return {left:wrap.querySelector('._split_left'), right:wrap.querySelector('._split_right')};
      var nodes=[], ch;
      while(el.firstChild){
        ch=el.firstChild;
        if(isChrome(ch)||(ch.classList&&ch.classList.contains('_split_wrap'))){ el.removeChild(ch); continue; }
        nodes.push(el.removeChild(ch));
      }
      var clones=nodes.map(function(n){ return n.cloneNode(true); });
      el.style.overflow='visible';
      wrap=document.createElement('div');
      wrap.className='_split_wrap';
      wrap.style.cssText='position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:2;';
      var left=document.createElement('div'); left.className='_split_left';
      left.style.cssText='position:absolute;left:0;top:0;width:50%;height:100%;overflow:hidden;transform-origin:100% 50%;';
      var li=document.createElement('div'); li.style.cssText='position:absolute;left:0;top:0;width:'+w+'px;height:'+h+'px;';
      nodes.forEach(function(n){ li.appendChild(n); }); left.appendChild(li);
      var right=document.createElement('div'); right.className='_split_right';
      right.style.cssText='position:absolute;right:0;top:0;width:50%;height:100%;overflow:hidden;transform-origin:0% 50%;';
      var ri=document.createElement('div'); ri.style.cssText='position:absolute;left:'+(-w/2)+'px;top:0;width:'+w+'px;height:'+h+'px;';
      clones.forEach(function(n){ ri.appendChild(n); }); right.appendChild(ri);
      wrap.appendChild(left); wrap.appendChild(right); el.appendChild(wrap);
      return {left:left, right:right};
    }
    setTimeout(function(){
      var parts=ensure();
      if(!parts.left||!parts.right) return;
      try{
        var p1=parts.left.animate([{transform:'translate(0,0) rotate(0deg)',opacity:1},{transform:'translate('+(-spread)+'px,'+fall+'px) rotate('+(-rot)+'deg)',opacity:0}],{duration:dur,easing:easing,fill:'forwards'});
        var p2=parts.right.animate([{transform:'translate(0,0) rotate(0deg)',opacity:1},{transform:'translate('+spread+'px,'+fall+'px) rotate('+rot+'deg)',opacity:0}],{duration:dur,easing:easing,fill:'forwards'});
        Promise.all([p1.finished,p2.finished]).then(function(){ el.style.visibility='hidden'; el.style.pointerEvents='none'; }).catch(function(){});
      }catch(e){ el.style.visibility='hidden'; }
    }, delay);
    return delay+dur;
  }
  function fireCaptionSlide(el, step){
    var delay=Math.max(0, step.delay||0);
    var dur=Math.max(80, step.dur||600);
    var hold=Math.max(0, step.holdDuration!=null?step.holdDuration:2000);
    var dir=step.captionDir||'right';
    var w=parseInt(el.style.width,10)||el.offsetWidth||200;
    var h=parseInt(el.style.height,10)||el.offsetHeight||100;
    var off={x:w+40,y:0};
    if(dir==='left') off={x:-(w+40),y:0};
    else if(dir==='up') off={x:0,y:-(h+40)};
    else if(dir==='down') off={x:0,y:h+40};
    setTimeout(function(){
      el.style.visibility='visible'; el.style.pointerEvents='';
      try{
        var a1=el.animate([{transform:'translate('+off.x+'px,'+off.y+'px)',opacity:0},{transform:'translate(0,0)',opacity:1}],{duration:dur,easing:'ease-out',fill:'forwards'});
        a1.finished.then(function(){
          setTimeout(function(){
            var a2=el.animate([{transform:'translate(0,0)',opacity:1},{transform:'translate('+off.x+'px,'+off.y+'px)',opacity:0}],{duration:dur,easing:'ease-in',fill:'forwards'});
            a2.finished.then(function(){ el.style.visibility='hidden'; el.style.pointerEvents='none'; }).catch(function(){});
          }, hold);
        }).catch(function(){});
      }catch(e){ el.style.visibility='hidden'; }
    }, delay);
    return delay+dur+hold+dur;
  }
  function fireCosmosTitle(el, step){
    var delay=Math.max(0, step.delay||0);
    var dur=Math.max(200, step.dur||4000);
    var host=el.parentElement; if(!host) return 0;
    var slideH=host.offsetHeight||parseFloat(host.style.height)||540;
    var gid=el.getAttribute('data-gid');
    var nodes=gid ? host.querySelectorAll('[data-gid="'+String(gid).replace(/"/g,'')+'"]') : [el];
    var items=[];
    var minY=Infinity, maxY=-Infinity;
    for(var ni=0; ni<nodes.length; ni++){
      var node=nodes[ni];
      var x=parseFloat(node.style.left)||0, y=parseFloat(node.style.top)||0;
      var w=parseFloat(node.style.width)||node.offsetWidth||200, h=parseFloat(node.style.height)||node.offsetHeight||200;
      items.push({el:node,x:x,y:y,w:w,h:h});
      minY=Math.min(minY,y); maxY=Math.max(maxY,y+h);
      node.style.visibility='hidden'; node.style.pointerEvents='none';
    }
    if(!items.length) return 0;
    var groupH=Math.max(1, maxY-minY);
    var yShift=slideH*0.98-minY;
    var travel=slideH*1.72+groupH;
    setTimeout(function(){
      var stage=document.createElement('div');
      stage.className='_cosmos_stage';
      var persp=Math.round(slideH*0.72);
      var fadeMask='linear-gradient(to bottom, transparent 0%, transparent 15%, #000 30%, #000 100%)';
      stage.style.cssText='position:absolute;inset:0;z-index:40;pointer-events:none;overflow:hidden;perspective:'+persp+'px;perspective-origin:50% 22%;-webkit-mask-image:'+fadeMask+';mask-image:'+fadeMask+';';
      var tilt=document.createElement('div');
      tilt.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;transform-style:preserve-3d;transform-origin:50% 100%;transform:rotateX(58deg);';
      var mover=document.createElement('div');
      mover.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;transform-style:preserve-3d;will-change:transform;';
      for(var ci=0; ci<items.length; ci++){
        var it=items[ci];
        var clone=it.el.cloneNode(true);
        clone.style.position='absolute'; clone.style.left=it.x+'px'; clone.style.top=(it.y+yShift)+'px';
        clone.style.width=it.w+'px'; clone.style.height=it.h+'px';
        clone.style.visibility='visible'; clone.style.opacity='1';
        clone.style.pointerEvents='none'; clone.style.outline='none';
        clone.removeAttribute('data-id');
        mover.appendChild(clone);
      }
      tilt.appendChild(mover); stage.appendChild(tilt); host.appendChild(stage);
      try{
        var a=mover.animate([{transform:'translateY(0px)'},{transform:'translateY('+(-travel)+'px)'}],{duration:dur,easing:'linear',fill:'forwards'});
        a.finished.then(function(){
          if(stage.parentNode) stage.remove();
          for(var hi=0; hi<items.length; hi++){ items[hi].el.style.visibility='hidden'; items[hi].el.style.pointerEvents='none'; }
        }).catch(function(){});
      }catch(e){ if(stage.parentNode) stage.remove(); }
    }, delay);
    return delay+dur;
  }
  function fireParticles(el, step){
    var delay=Math.max(0, step.delay||0);
    var count=Math.max(1, Math.min(80, step.particleCount||14));
    var ptDir=((step.ptDir||0)%360+360)%360;
    var ptLife=Math.max(400, step.ptLife||900);
    var spawn=Math.max(400, step.dur||3550);
    var loops=Math.max(1, Math.min(5, step.swingCount!=null?step.swingCount:1));
    if(loops>=10) loops=1;
    var host=el.parentElement; if(!host) return 0;
    var ew=parseFloat(el.style.width)||el.offsetWidth||100;
    var eh=parseFloat(el.style.height)||el.offsetHeight||100;
    function livePos(){
      var x=parseFloat(el.style.left), y=parseFloat(el.style.top);
      if(!isFinite(x)) x=el.offsetLeft||0;
      if(!isFinite(y)) y=el.offsetTop||0;
      var tr=String(el.style.transform||'');
      var m=tr.match(/translate\(\s*([-\d.]+)px(?:\s*,\s*([-\d.]+)px)?\s*\)/);
      if(m){ x+=+m[1]||0; y+=m[2]!=null?+m[2]||0:0; }
      return {x:x,y:y};
    }
    var fly=((ptDir-90)%360+360)%360;
    var layer=document.createElement('div');
    layer.className='_particles_layer';
    layer.style.cssText='position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:2;';
    host.appendChild(layer);
    el.classList.add('has-particles');
    el.style.visibility='hidden';
    el.style.opacity='0';
    var speedFactor=6000/spawn;
    function spawnOne(at){
      setTimeout(function(){
        var origin=livePos();
        var life=ptLife*(0.55+Math.random()*0.9);
        var sc=0.4+Math.random()*0.6;
        var pw=Math.max(4,ew*sc), ph=Math.max(4,eh*sc);
        var sx=origin.x+Math.random()*Math.max(0,ew-pw*0.5);
        var sy=origin.y+Math.random()*Math.max(0,eh-ph*0.5);
        var deg=fly+(Math.random()-0.5)*60;
        var rad=deg*Math.PI/180;
        var cos=Math.cos(rad), sin=Math.sin(rad);
        var spd=(0.04+Math.random()*0.03)*speedFactor;
        var p=document.createElement('div');
        p.style.cssText='position:absolute;left:'+sx+'px;top:'+sy+'px;width:'+pw+'px;height:'+ph+'px;opacity:0;pointer-events:none;overflow:hidden;';
        var c=el.cloneNode(true);
        c.style.cssText='position:absolute;left:0;top:0;width:'+ew+'px;height:'+eh+'px;visibility:visible;pointer-events:none;transform:scale('+sc+');transform-origin:0 0;';
        c.removeAttribute('data-id');
        p.appendChild(c); layer.appendChild(p);
        var t0=performance.now();
        function tick(now){
          var elap=now-t0;
          if(elap>=life){ if(p.parentNode) p.remove(); return; }
          var fade=elap<life*0.12?elap/(life*0.12):(elap>life*0.8?(life-elap)/(life*0.2):1);
          p.style.left=(sx+cos*spd*elap)+'px';
          p.style.top=(sy+sin*spd*elap)+'px';
          p.style.opacity=String(Math.max(0,Math.min(1,fade)));
          requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }, at);
    }
    for(var cyc=0;cyc<loops;cyc++){
      for(var i=0;i<count;i++){
        spawnOne(delay+cyc*(spawn+ptLife*1.5)+(i/count)*spawn+Math.random()*(spawn/count));
      }
    }
    var wait=delay+(spawn+ptLife*1.5)*loops;
    setTimeout(function(){
      if(layer.parentNode) layer.remove();
      el.classList.remove('has-particles');
      el.style.visibility='hidden';
      el.style.opacity='0';
    }, wait+200);
    return wait;
  }
  function fireInkDraw(el, step){
    var delay=Math.max(0, step.delay||0);
    var dur=Math.max(200, step.dur||1400);
    var par=step.inkParallel==='all'?0:(step.inkParallel!=null?+step.inkParallel:1);
    var host=el.closest('.slide')||el.parentElement;
    var layer=host&&(host.querySelector('.react-ink-layer')||host.querySelector('[data-ink-layer]')||host.querySelector('svg.el'));
    if(!layer) return delay;
    var paths=[].slice.call(layer.querySelectorAll('path[data-ink-id], g[data-ink-id], path')).filter(function(n){ return !n.closest('defs'); });
    if(!paths.length) return delay;
    if(par===0) par=paths.length;
    par=Math.max(1, Math.min(paths.length, par|0));
    function hide(n){
      if(n.tagName&&n.tagName.toLowerCase()==='path'&&n.getAttribute('stroke')){
        try{ n.setAttribute('pathLength','1'); n.setAttribute('stroke-dasharray','1'); n.setAttribute('stroke-dashoffset','1'); }catch(e){}
      } else { n.style.opacity='0'; }
    }
    function show(n){
      try{ n.removeAttribute('stroke-dasharray'); n.removeAttribute('stroke-dashoffset'); n.removeAttribute('pathLength'); }catch(e){}
      n.style.opacity='';
    }
    paths.forEach(hide);
    setTimeout(function(){
      var i=0;
      function runNext(){
        var batch=[];
        while(batch.length<par&&i<paths.length) batch.push(paths[i++]);
        if(!batch.length){ paths.forEach(show); return; }
        var left=batch.length;
        batch.forEach(function(n){
          var d=dur;
          try{ if(n.getTotalLength) d=Math.round(dur*Math.max(0.3,Math.min(3,n.getTotalLength()/320))); }catch(e){}
          if(n.tagName&&n.tagName.toLowerCase()==='path'&&n.getAttribute('stroke')){
            var t0=performance.now();
            function tick(now){
              var p=Math.min(1,(now-t0)/d);
              try{ n.setAttribute('stroke-dashoffset', String(1-p)); }catch(e){}
              if(p<1) requestAnimationFrame(tick);
              else { show(n); if(--left<=0) runNext(); }
            }
            requestAnimationFrame(tick);
          } else {
            try{
              var a=n.animate([{opacity:0},{opacity:1}],{duration:d,easing:'ease-out',fill:'forwards'});
              a.onfinish=function(){ show(n); if(--left<=0) runNext(); };
            }catch(e){ show(n); if(--left<=0) runNext(); }
          }
        });
      }
      runNext();
    }, delay);
    var waves=Math.ceil(paths.length/par);
    return delay+waves*dur+200;
  }
  function fireFloat(el, step, opts){
    var delay=Math.max(0, step.delay||0);
    var dur=Math.max(400, step.dur||5000);
    var loops=Math.max(1, Math.min(20, step.swingCount!=null?step.swingCount:10));
    if(loops>=10) loops=Infinity;
    // Inside a repeat: play one authored duration, then the cycle restarts.
    if(opts&&opts.inRepeat&&loops===Infinity) loops=1;
    var ew=parseFloat(el.style.width)||el.offsetWidth||100;
    var eh=parseFloat(el.style.height)||el.offsetHeight||100;
    var seed=String(step.elId||el.getAttribute('data-id')||'');
    var h=2166136261;
    for(var si=0;si<seed.length;si++){ h^=seed.charCodeAt(si); h=Math.imul(h,16777619); }
    h=h>>>0;
    var s=h;
    function rnd(){ s=(s+0x6D2B79F5)>>>0; var t=Math.imul(s^(s>>>15),1|s); t^=t+Math.imul(t^(t>>>7),61|t); return ((t^(t>>>14))>>>0)/4294967296; }
    var mx=ew*0.06, my=eh*0.06, N=32;
    function mkW(){ return [1,2,3].map(function(freq){ return {amp:0.2+rnd()*0.8,freq:freq,phase:rnd()*Math.PI*2}; }); }
    var rx=mkW(), ry=mkW();
    function smp(ws,t){ var sum=ws.reduce(function(a,w){ return a+w.amp*Math.sin(w.freq*t*Math.PI*2+w.phase); },0); return sum/ws.reduce(function(a,w){ return a+w.amp; },0); }
    var frames=[];
    for(var fi=0;fi<=N;fi++){
      var t=fi/N;
      var fr={transform:'translate('+Math.round(smp(rx,t)*mx)+'px,'+Math.round(smp(ry,t)*my)+'px)'};
      if(fi<N) fr.easing='ease-in-out';
      frames.push(fr);
    }
    setTimeout(function(){
      try{
        var mxp=Math.round(mx), myp=Math.round(my);
        var wrap=el.querySelector('._float_wrap');
        if(!wrap){
          wrap=document.createElement('div');
          wrap.className='_float_wrap';
          while(el.firstChild) wrap.appendChild(el.firstChild);
          el.appendChild(wrap);
        }
        wrap.style.cssText='position:absolute;left:'+(-mxp)+'px;top:'+(-myp)+'px;width:'+(ew+2*mxp)+'px;height:'+(eh+2*myp)+'px;overflow:visible;pointer-events:none;';
        var child=wrap.firstElementChild;
        if(child){ child.style.position='absolute'; child.style.left=mxp+'px'; child.style.top=myp+'px'; child.style.width=ew+'px'; child.style.height=eh+'px'; }
        el.style.overflow='visible';
        (child||wrap).animate(frames,{duration:dur,iterations:loops,fill:'none'});
      }catch(e){}
    }, delay);
    return loops===Infinity?delay:delay+dur*loops;
  }
  var DANCE_FRAMES=[
    {transform:'scaleX(1) scaleY(1) rotate(0deg)',easing:'cubic-bezier(.42,0,.3,1.4)'},
    {transform:'scaleX(1.12) scaleY(0.82) rotate(-2deg)',easing:'cubic-bezier(.6,0,.4,1.3)'},
    {transform:'scaleX(0.9) scaleY(1.1) rotate(1.5deg)',easing:'cubic-bezier(.42,0,.3,1.4)'},
    {transform:'scaleX(1.1) scaleY(0.85) rotate(-1.5deg)',easing:'cubic-bezier(.6,0,.4,1.3)'},
    {transform:'scaleX(0.92) scaleY(1.08) rotate(2deg)',easing:'cubic-bezier(.42,0,.3,1.4)'},
    {transform:'scaleX(1.06) scaleY(0.9) rotate(-1deg)',easing:'cubic-bezier(.5,0,.35,1.3)'},
    {transform:'scaleX(0.97) scaleY(1.03) rotate(0.5deg)',easing:'cubic-bezier(.4,0,.6,1)'},
    {transform:'scaleX(1) scaleY(1) rotate(0deg)'}
  ];
  var SWING_FRAMES=[
    {transform:'rotate(0deg)'},{transform:'rotate(30deg)'},{transform:'rotate(-30deg)'},
    {transform:'rotate(20deg)'},{transform:'rotate(-20deg)'},{transform:'rotate(10deg)'},
    {transform:'rotate(-10deg)'},{transform:'rotate(5deg)'},{transform:'rotate(-3deg)'},
    {transform:'rotate(0deg)'}
  ];
  function fireDance(el, step, opts){
    var delay=Math.max(0, step.delay||0);
    var dur=Math.max(200, step.dur||1200);
    var loops=Math.max(1, Math.min(20, step.swingCount!=null?step.swingCount:1));
    if(loops>=10) loops=Infinity;
    if(opts&&opts.inRepeat&&loops===Infinity) loops=1;
    setTimeout(function(){
      try{
        var wrap=el.querySelector('._dance_wrap');
        if(!wrap){
          wrap=document.createElement('div');
          wrap.className='_dance_wrap';
          wrap.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:visible;border-radius:inherit;';
          while(el.firstChild) wrap.appendChild(el.firstChild);
          el.appendChild(wrap);
        }
        el.style.overflow='visible';
        wrap.animate(DANCE_FRAMES,{duration:dur,iterations:loops,fill:'none'});
      }catch(e){}
    }, delay);
    return loops===Infinity?delay:delay+dur*loops;
  }
  function fireSwing(el, step, opts){
    var delay=Math.max(0, step.delay||0);
    var dur=Math.max(200, step.dur||1200);
    var loops=Math.max(1, Math.min(20, step.swingCount!=null?step.swingCount:1));
    if(loops>=10) loops=Infinity;
    if(opts&&opts.inRepeat&&loops===Infinity) loops=1;
    var w=parseFloat(el.style.width)||el.offsetWidth||100;
    var h=parseFloat(el.style.height)||el.offsetHeight||60;
    var sox=step.swingOx!=null?+step.swingOx:0;
    var soy=step.swingOy!=null?+step.swingOy:h/2;
    var ox=(50+(sox/w)*100).toFixed(2)+'%';
    var oy=(50+(soy/h)*100).toFixed(2)+'%';
    setTimeout(function(){
      try{
        el.style.transformOrigin=ox+' '+oy;
        el.animate(SWING_FRAMES,{duration:dur,easing:'ease-in-out',iterations:loops,fill:'none'});
      }catch(e){}
    }, delay);
    return loops===Infinity?delay:delay+dur*loops;
  }
  function resetMotionCycle(root, bundle){
    var ids={}, rid=bundle&&bundle.repeatId;
    function add(step){
      if(!step||!step.elId) return;
      if(!(step.name==='moveTo'||step.name==='pathTo'||step.name==='orbitTo'||step.name==='rotate'||step.name==='mirror')) return;
      ids[step.elId]=1;
    }
    (bundle.items||[]).forEach(add);
    if(rid){
      (ANIM[i]||[]).forEach(function(b){
        if(!b||b.repeatId!==rid) return;
        (b.items||[]).forEach(add);
      });
    }
    // Expand to every group member — resetting only the leader left siblings baked
    // at the end pose so the next cycle looked like a single-object move.
    var seen={};
    Object.keys(ids).forEach(function(elId){
      var el=findEl(root, elId); if(!el) return;
      groupEls(root, el).forEach(function(node){
        var mid=node.getAttribute('data-id')||elId;
        if(seen[mid]) return;
        seen[mid]=1;
        motionGen[mid]=(motionGen[mid]||0)+1;
        cumMap[mid]={tx:0,ty:0};
        cancelElAnims(node);
        if(node._motionBaseX!=null){ node.style.left=node._motionBaseX+'px'; node.style.top=node._motionBaseY+'px'; }
        restoreAuthoredXf(node);
        node.style.transition='';
      });
    });
  }
  function playBundle(root, bundle){
    var items=bundle.items||[], maxWait=0;
    var inRepeat=!!(bundle.repeatId||bundle.repeatCycleStart||bundle.repeatInfinite||
      (items[0]&&(items[0].repeatId||items[0].repeatCycleStart||items[0].repeatInfinite)));
    if(bundle.repeatCycleStart||(items[0]&&items[0].repeatCycleStart)) resetMotionCycle(root, bundle);
    items.forEach(function(step){
      if(step.kind==='camera'){
        fireCam(root, step.cam, step.dur, step.delay);
        var camWait=(step.delay||0)+(step.dur||1200);
        if(camWait>maxWait) maxWait=camWait;
        return;
      }
      if(step.pause || step.name==='pause'){
        var waitP=Math.max(0,(step.delay||0)+(step.dur||0));
        if(waitP>maxWait) maxWait=waitP;
        return;
      }
      if(step.motion || step.name==='moveTo' || step.name==='orbitTo' || step.name==='rotate' || step.name==='mirror' || step.name==='recolor' || step.name==='typewriter' || step.name==='transform' || step.name==='langFade' || step.name==='splitHalf' || step.name==='captionSlide' || step.name==='cosmosTitle' || step.name==='particles' || step.name==='inkDraw' || step.name==='float' || step.name==='dance' || step.name==='swing' || step.name==='uncrop'){
        var el=findEl(root, step.elId); if(!el) return;
        var keepHidden=step.name==='cosmosTitle'||step.name==='captionSlide'||step.name==='particles';
        el.classList.remove('el-wait');
        if(keepHidden){ el.style.visibility='hidden'; el.style.pointerEvents='none'; }
        else { el.style.visibility='visible'; el.style.opacity=''; }
        if(step.name==='float'){
          groupEls(root, el).forEach(function(node){
            var waitFl=fireFloat(node, step, {inRepeat:inRepeat});
            if(waitFl>maxWait) maxWait=waitFl;
          });
          return;
        }
        if(step.name==='dance'){
          groupEls(root, el).forEach(function(node){
            var waitDa=fireDance(node, step, {inRepeat:inRepeat});
            if(waitDa>maxWait) maxWait=waitDa;
          });
          return;
        }
        if(step.name==='swing'){
          groupEls(root, el).forEach(function(node){
            var waitSw=fireSwing(node, step, {inRepeat:inRepeat});
            if(waitSw>maxWait) maxWait=waitSw;
          });
          return;
        }
        if(step.name==='inkDraw'){
          var waitInk=fireInkDraw(el, step);
          if(waitInk>maxWait) maxWait=waitInk;
          return;
        }
        if(step.name==='particles'){
          var waitPt=fireParticles(el, step);
          if(waitPt>maxWait) maxWait=waitPt;
          return;
        }
        if(step.name==='cosmosTitle'){
          var waitCo=fireCosmosTitle(el, step);
          if(waitCo>maxWait) maxWait=waitCo;
          return;
        }
        if(step.name==='captionSlide'){
          var waitCap=fireCaptionSlide(el, step);
          if(waitCap>maxWait) maxWait=waitCap;
          return;
        }
        if(step.name==='splitHalf'){
          var waitSh=fireSplitHalf(el, step);
          if(waitSh>maxWait) maxWait=waitSh;
          return;
        }
        if(step.name==='langFade'){
          var waitLf=fireLangFade(el, step);
          if(waitLf>maxWait) maxWait=waitLf;
          return;
        }
        if(step.name==='typewriter'){
          var waitTw=fireTypewriter(el, step);
          if(waitTw>maxWait) maxWait=waitTw;
          return;
        }
        if(step.name==='transform'){
          var waitTf=fireTransform(el, step);
          if(waitTf>maxWait) maxWait=waitTf;
          return;
        }
        if(step.name==='recolor'){
          var waitR=fireRecolor(el, step);
          if(waitR>maxWait) maxWait=waitR;
          return;
        }
        if(step.name==='uncrop'){
          var waitU=fireUncrop(el, step);
          if(waitU>maxWait) maxWait=waitU;
          return;
        }
        groupEls(root, el).forEach(function(node){
          var mid=node.getAttribute('data-id')||step.elId;
          var prev=cumMap[mid]||{tx:0,ty:0};
          var stepM=Object.assign({}, step, {elId:mid});
          var res=fireMotion(node, stepM, prev.tx, prev.ty);
          cumMap[mid]={tx:res.endTx, ty:res.endTy};
          if(res.wait>maxWait) maxWait=res.wait;
        });
        return;
      }
      var wait=step.live
        ?(inRepeat?((step.delay||0)+(step.dur||600)):0)
        :((step.delay||0)+(step.dur||600));
      if(!step.live && (step.name==='pulse'||step.name==='shake'||step.name==='flash')){
        var pc=step.swingCount!=null?+step.swingCount:1;
        var ploops=(!isFinite(pc)||pc>=10)?1:Math.max(1,pc||1);
        wait=(step.delay||0)+(step.dur||600)*ploops;
      }
      if(wait>maxWait) maxWait=wait;
      var apply=function(){
        var el=findEl(root, step.elId); if(!el) return;
        // Group-wide CSS anims (entrance/exit/emphasis) run on every member with the same gid.
        groupEls(root, el).forEach(function(node){
          node.classList.remove('el-wait');
          node.style.visibility='visible'; node.style.opacity='';
          // Motion offset is already baked into left/top after moveTo — CSS transform
          // keyframes can run on the host without a ghost at the authored box.
          writeClass(node, readClass(node).replace(/\\bel-anim-\\S+/g,'').trim()+(step.cls?' '+step.cls:''));
          if(step.dur) node.style.animationDuration=step.dur+'ms';
          if(step.name==='pulse'||step.name==='shake'||step.name==='flash'){
            var pc2=step.swingCount!=null?+step.swingCount:1;
            node.style.animationIterationCount=(!isFinite(pc2)||pc2>=10)?'infinite':String(Math.max(1,pc2||1));
          }
          if(step.live) node.style.overflow='visible';
        });
      };
      if(step.delay>0) setTimeout(apply, step.delay); else apply();
    });
    return maxWait;
  }
  function fireCam(el, cam, dur, delay, onDone){
    abortCam(false);
    var fit=fitScale();
    var from={cx:camState.cx,cy:camState.cy,w:camState.w,h:camState.h,rot:camState.rot};
    var minW=Math.max(36,W/20);
    var toW=Math.max(minW,+cam.w||W);
    var to={
      cx:+cam.cx, cy:+cam.cy,
      w:toW,
      h:toW*aspect(),
      rot:+cam.rot||0
    };
    var ctl={aborted:false,rafs:[],timers:[],from:from,to:to};
    camCtl=ctl;
    function lerp(a,b,p){return a+(b-a)*p;}
    function along(e){
      var dRot=(+to.rot||0)-(+from.rot||0);
      while(dRot>180)dRot-=360; while(dRot<-180)dRot+=360;
      var rot=(+from.rot||0)+dRot*e;
      var cx=lerp(+from.cx,+to.cx,e), cy=lerp(+from.cy,+to.cy,e);
      var minW=Math.max(36,W/20);
      var w0=Math.max(minW,+from.w||W), w1=Math.max(minW,+to.w||W);
      var w=Math.exp(lerp(Math.log(w0),Math.log(w1),e));
      return {cx:cx,cy:cy,w:w,h:w*aspect(),rot:rot};
    }
    function run(){
      if(ctl.aborted) return;
      applyCam(el, from, fit);
      var t0=performance.now();
      var ease=function(t){return t*t*(3-2*t);};
      function step(now){
        if(ctl.aborted) return;
        var p=Math.min(1,(now-t0)/Math.max(200,dur||1200));
        applyCam(el, along(ease(p)), fit);
        if(p<1) ctl.rafs.push(requestAnimationFrame(step));
        else { applyCam(el, to, fit); camCtl=null; if(onDone) onDone(); }
      }
      ctl.rafs.push(requestAnimationFrame(step));
    }
    if(delay>0) ctl.timers.push(setTimeout(run, delay));
    else run();
  }
  function cameraItemFromStep(step){
    if(!step) return null;
    if(step.kind==='camera'&&step.cam) return step;
    if(step.kind==='bundle'){
      var items=step.items||[];
      for(var k=items.length-1;k>=0;k--){
        var it=items[k];
        if(it&&it.kind==='camera'&&it.cam) return it;
      }
    }
    return null;
  }
  function camStateBefore(beforeIdx){
    var steps=ANIM[i]||[];
    var target=fullCam();
    for(var j=0;j<beforeIdx;j++){
      var camStep=cameraItemFromStep(steps[j]);
      if(!camStep||!camStep.cam) continue;
      var c=camStep.cam;
      target={
        cx:+c.cx, cy:+c.cy,
        w:+c.w||W, h:+c.h||H,
        rot:+c.rot||0
      };
    }
    return target;
  }
  function playPrev(){
    var steps=ANIM[i]||[];
    var root=slides[i];
    if(stepI<=0 && !camCtl) return false;
    if(camCtl){
      abortCam(false, true);
      clearBusy();
      stepI=Math.max(0, stepI-1);
      return true;
    }
    if(busy) skipBusy();
    var undoIdx=stepI-1;
    if(undoIdx<0) return false;
    var undone=steps[undoIdx];
    stepI=undoIdx;
    var camStep=cameraItemFromStep(undone);
    if(camStep){
      var target=camStateBefore(undoIdx);
      busy=true;
      fireCam(root, target, camStep.dur||600, 0, function(){ busy=false; });
      return true;
    }
    return true;
  }
  function playNext(){
    var steps=ANIM[i]||[];
    if(stepI>=steps.length) return false;
    var root=slides[i];
    function runFrom(idx){
      var step=steps[idx]; if(!step) return false;
      stepI=idx+1;
      if(step.kind==='camera'){
        busy=true;
        fireCam(root, step.cam, step.dur, step.delay, function(){
          busy=false;
          var next=steps[stepI];
          if(next && next.kind==='bundle' && next.auto) runFrom(stepI);
        });
        return true;
      }
      var wait=playBundle(root, step);
      busy=true;
      busyT=setTimeout(function(){
        busyT=null; busy=false;
        var next=steps[stepI];
        if(next && next.kind==='bundle' && next.auto){ runFrom(stepI); return; }
        if(step.repeatInfinite && step.repeatId && !skippedRepeat[step.repeatId]){
          var moreInCycle=next && next.kind==='bundle' && next.repeatId===step.repeatId;
          if(!moreInCycle){
            var start=-1;
            for(var si=0;si<steps.length;si++){
              if(steps[si]&&steps[si].kind==='bundle'&&steps[si].repeatId===step.repeatId&&steps[si].repeatCycleStart){ start=si; break; }
            }
            if(start>=0){ stepI=start; runFrom(start); }
          }
        }
      }, Math.max(50, wait));
      return true;
    }
    return runFrom(stepI);
  }
  function startAutoAnims(){
    var steps=ANIM[i]||[];
    if(steps[0] && steps[0].kind==='bundle' && steps[0].auto) playNext();
  }
  function postTimerStart(fr){
    try{fr.contentWindow.postMessage({type:'timerStart'},'*');}catch(e){}
  }
  function timerStartOf(node){
    var m=(node&&(node.getAttribute('data-tm-start')||''))||'';
    if(m==='click-slide'||m==='click-el') return m;
    var host=node&&node.closest?node.closest('[data-tm-start]'):null;
    m=(host&&host.getAttribute('data-tm-start'))||'';
    if(m==='click-slide'||m==='click-el') return m;
    return 'auto';
  }
  var clickSlideTimersArmed={};
  function startTimers(mode){
    var root=slides[i]; if(!root) return;
    var want=mode||'auto';
    root.querySelectorAll('iframe[data-applet-id="timer"]').forEach(function(fr){
      if(timerStartOf(fr)!==want) return;
      postTimerStart(fr);
      if(want==='click-slide'){
        var host=fr.closest('[data-id]')||fr.parentElement;
        var id=(host&&host.getAttribute('data-id'))||'';
        if(id) clickSlideTimersArmed[id]=1;
      }
    });
  }
  /** First click/key with pending click-slide timers: arm only (no advance). */
  function armClickSlideTimersOnly(){
    var root=slides[i]; if(!root) return false;
    var pending=false;
    root.querySelectorAll('iframe[data-applet-id="timer"]').forEach(function(fr){
      if(timerStartOf(fr)!=='click-slide') return;
      var host=fr.closest('[data-id]')||fr.parentElement;
      var id=(host&&host.getAttribute('data-id'))||'';
      if(id&&clickSlideTimersArmed[id]) return;
      postTimerStart(fr);
      if(id) clickSlideTimersArmed[id]=1;
      pending=true;
    });
    return pending;
  }
  function startTimersOnElClick(elId){
    var root=slides[i]; if(!root||elId==null) return;
    var id=String(elId);
    root.querySelectorAll('iframe[data-applet-id="timer"]').forEach(function(fr){
      if(timerStartOf(fr)!=='click-el') return;
      var host=fr.closest('[data-tm-start]')||fr.parentElement;
      var trig=(host&&host.getAttribute('data-tm-trigger'))||'';
      var selfId=(host&&host.getAttribute('data-id'))||'';
      if(trig){ if(trig!==id) return; }
      else if(selfId!==id) return;
      postTimerStart(fr);
    });
  }
  function syncCounterGroups(root){
    var vals=window._counterGroupVal||{};
    if(!root) return;
    root.querySelectorAll('[data-applet-id="counter"][data-cnt-group-id]').forEach(function(wrap){
      var gid=wrap.getAttribute('data-cnt-group-id')||'';
      if(!gid||!Object.prototype.hasOwnProperty.call(vals,gid)) return;
      var fr=wrap.querySelector('iframe');
      if(!fr||!fr.contentWindow) return;
      try{fr.contentWindow.postMessage({type:'counterSync',val:vals[gid]},'*');}catch(e){}
    });
  }
  function show(n, animate){
    abortCam(false);
    clearBusy();
    clearRides();
    frames.forEach(clearEnterCls);
    var prev=i;
    if(typeof sfDestroyModel3d==='function' && frames[prev]) sfDestroyModel3d(frames[prev]);
    i=Math.max(0,Math.min(slides.length-1,n));
    stepI=0;
    cumMap={};
    motionGen={};
    skippedRepeat={};
    clickSlideTimersArmed={};
    camState=fullCam();
    frames.forEach(function(fr,k){fr.classList.toggle('on',k===i);});
    var nEl=document.getElementById('n');
    if(nEl) nEl.textContent=(i+1)+' / '+slides.length;
    if(typeof window._sfRedrawDraw==='function') try{ window._sfRedrawDraw(); }catch(_e){}
    resetSlide(slides[i]);
    clearRecolorFilters(slides[i]);
    prepareRecolor(slides[i]);
    fit();
    var td=TRANS[i]||{};
    var cls=(animate && prev!==i) ? (ENTER[td.t]||'') : '';
    var ms=+td.d||500;
    function afterEnter(){
      startTimers('auto');
      syncCounterGroups(slides[i]);
      startAutoAnims();
      startSlideRides();
      initMvFs(slides[i]);
      if(typeof sfMountModel3d==='function') sfMountModel3d(frames[i]||slides[i]);
    }
    if(cls && ms>0 && td.t && td.t!=='none'){
      busy=true;
      frames[i].style.setProperty('--pv-dur', ms+'ms');
      frames[i].classList.add(cls);
      busyT=setTimeout(function(){
        clearEnterCls(frames[i]);
        busyT=null; busy=false;
        afterEnter();
      }, ms);
    } else {
      afterEnter();
    }
  }
  function nextVisible(from, dir){
    var n=slides.length, step=dir<0?-1:1, j=from;
    for(var k=0;k<n;k++){
      j+=step;
      if(j<0||j>=n) return -1;
      if(!(slides[j]&&slides[j].hidden)) return j;
    }
    return -1;
  }
  function firstVisible(from){
    var n=slides.length, j=Math.max(0,Math.min(n-1,from|0));
    for(var k=0;k<n;k++){
      if(!(slides[j]&&slides[j].hidden)) return j;
      j=(j+1)%n;
    }
    return from|0;
  }
  function stepRepeatId(step){
    if(!step) return null;
    if(step.repeatId) return step.repeatId;
    var items=step.items||[];
    for(var k=0;k<items.length;k++){
      if(items[k]&&items[k].repeatId) return items[k].repeatId;
    }
    return null;
  }
  function stepRepeatInfinite(step){
    if(!step) return false;
    if(step.repeatInfinite) return true;
    var items=step.items||[];
    for(var k=0;k<items.length;k++){
      if(items[k]&&items[k].repeatInfinite) return true;
    }
    return false;
  }
  function findActiveRepeatId(){
    var steps=ANIM[i]||[];
    var prev=stepI>0?steps[stepI-1]:null;
    var rid=stepRepeatId(prev);
    if(!rid||skippedRepeat[rid]) return null;
    if(busy||camCtl) return rid;
    if(stepRepeatId(steps[stepI])===rid) return rid;
    if(stepRepeatInfinite(prev)) return rid;
    return null;
  }
  function skipEntireRepeat(rid){
    if(!rid) return;
    skippedRepeat[rid]=1;
    clearBusy();
    abortCam(true);
    var steps=ANIM[i]||[];
    while(stepI<steps.length && stepRepeatId(steps[stepI])===rid) stepI++;
  }
  function advanceAnimsOrSkipRepeat(){
    var rid=findActiveRepeatId();
    if(rid){
      skipEntireRepeat(rid);
      return playNext();
    }
    if(busy||camCtl) skipBusy();
    return playNext();
  }
  function advance(dir){
    // Mid-Repeat: skip the whole block. Otherwise finish busy then play next.
    if(dir>0){
      if(advanceAnimsOrSkipRepeat()) return;
    } else {
      if(busy||camCtl) skipBusy();
      if(playPrev()) return;
    }
    var to=nextVisible(i, dir);
    if(to<0) return;
    show(to, true);
  }
  function followLink(link, target){
    if(!link) return false;
    if(link.indexOf('#slide-')===0){
      var spec=link.slice(7);
      var to=i;
      if(spec==='next') to=Math.min(i+1,slides.length-1);
      else if(spec==='prev') to=Math.max(i-1,0);
      else if(spec==='first') to=0;
      else if(spec==='last') to=slides.length-1;
      else {
        var num=parseInt(spec,10);
        if(!isNaN(num)&&String(num)===spec) to=Math.max(0,Math.min(slides.length-1,num-1));
        else {
          try{spec=decodeURIComponent(spec);}catch(e){}
          var norm=(spec||'').trim().toLowerCase();
          for(var k=0;k<frames.length;k++){
            var t=(frames[k].getAttribute('data-title')||'').trim().toLowerCase();
            if(t===norm){to=k;break;}
          }
        }
      }
      show(to, true); return true;
    }
    if(/^https?:/i.test(link)||link.indexOf('mailto:')===0){
      window.open(link, target||'_blank'); return true;
    }
    return false;
  }
  function bindClick(id, fn){
    var el=document.getElementById(id);
    if(el) el.onclick=fn;
  }
  bindClick('prev', function(){advance(-1)});
  bindClick('next', function(){advance(1)});
  bindClick('nav-prev', function(){advance(-1)});
  bindClick('nav-next', function(){advance(1)});
  function exitShow(){
    try{
      if(document.querySelector('[data-mv-fs-ov]')) return;
      if(document.fullscreenElement||document.webkitFullscreenElement){
        (document.exitFullscreen||document.webkitExitFullscreen).call(document);
        return;
      }
      window.close();
    }catch(e){}
  }
  bindClick('esc-btn', exitShow);
  if(SHOW_ESC){
    window.addEventListener('keydown',function(e){
      if(e.key==='Escape'||e.key==='F5'){
        if(document.querySelector('[data-mv-fs-ov]')) return;
        e.preventDefault();
        exitShow();
      }
    });
  }
  document.getElementById('stage').onclick=function(e){
    if(e.target.closest('#hud,.ex-nav,.ex-draw-tools,#draw-layer')) return;
    if(e.target.closest('.react-el-audio,[data-audio-player]')) return;
    if(e.target.closest('.model3d-host,[data-model3d-viewer]')) return;
    var toc=e.target.closest('[data-toc-slide]');
    if(toc){
      e.stopPropagation();
      e.preventDefault();
      var si=parseInt(toc.getAttribute('data-toc-slide'),10);
      if(!isNaN(si)&&si>=0) show(Math.max(0,Math.min(slides.length-1,si)), true);
      return;
    }
    var fs=e.target.closest('.mv-fs');
    if(fs){
      e.stopPropagation();
      openMvFs(fs.getAttribute('data-mv-src'), fs.getAttribute('data-mv-ctrl')!=='0');
      return;
    }
    var inlineA=e.target.closest('a[href]');
    if(inlineA && inlineA.closest('.slide')){
      e.preventDefault();
      e.stopPropagation();
      followLink(inlineA.getAttribute('href'), inlineA.getAttribute('target')||'_blank');
      return;
    }
    var hit=e.target.closest('[data-link]');
    if(hit){
      e.stopPropagation();
      var hitId=hit.getAttribute('data-id');
      if(hitId) startTimersOnElClick(hitId);
      followLink(hit.getAttribute('data-link'), hit.getAttribute('data-linkt'));
      return;
    }
    var elHit=e.target.closest('.el[data-id]');
    if(elHit){
      startTimersOnElClick(elHit.getAttribute('data-id'));
    } else if(armClickSlideTimersOnly()){
      // First click: arm timer; mid-Repeat must not skip the block on this press.
      if(!findActiveRepeatId()) playNext();
      return;
    } else {
      startTimers('click-slide');
    }
    advance(1);
  };
  function openMvFs(src, ctrl){
    if(!src) return;
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:#000;z-index:99999;display:flex;align-items:center;justify-content:center;';
    var v=document.createElement('video');
    v.src=src; v.autoplay=true; v.playsInline=true;
    if(ctrl) v.controls=true;
    v.style.cssText='max-width:100%;max-height:100%;outline:none;';
    var btn=document.createElement('button'); btn.textContent='✕';
    btn.style.cssText='position:absolute;top:16px;right:20px;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:20px;cursor:pointer;padding:6px 12px;border-radius:6px;';
    ov.setAttribute('data-mv-fs-ov','1');
    function destroy(){ try{v.pause();}catch(e){} if(ov.parentNode)ov.parentNode.removeChild(ov); document.removeEventListener('keydown',onK); }
    function onK(e){ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); destroy(); } }
    btn.onclick=destroy; document.addEventListener('keydown',onK);
    ov.appendChild(v); ov.appendChild(btn); document.body.appendChild(ov);
  }
  function initMvFs(root){
    if(!root) return;
    root.querySelectorAll('.mv-fs[data-mv-auto="1"]').forEach(function(el){
      setTimeout(function(){ openMvFs(el.getAttribute('data-mv-src'), el.getAttribute('data-mv-ctrl')!=='0'); }, 80);
    });
  }
  window.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key==='ArrowDown'||e.key===' '||e.key==='PageDown'){
      e.preventDefault();
      if(e.repeat) return;
      // First press: arm timer; mid-Repeat must not skip the block on this press.
      if(armClickSlideTimersOnly()){
        if(!findActiveRepeatId()) playNext();
        return;
      }
      startTimers('click-slide');
      advance(1);
    }
    if(e.key==='ArrowLeft'||e.key==='ArrowUp'||e.key==='PageUp'){
      e.preventDefault();
      if(e.repeat) return;
      advance(-1);
    }
  });
  window.addEventListener('message',function(e){
    var d=e.data; if(!d) return;
    if(d.type==='timerNav'){
      if(d.mode==='next'){ show(Math.min(i+1,slides.length-1), true); return; }
      if(d.mode==='slide'){ show(Math.max(0,Math.min(slides.length-1,+d.slide||0)), true); }
      return;
    }
    if(d.type==='counterSync'&&d.gid){
      window._counterGroupVal=window._counterGroupVal||{};
      window._counterGroupVal[d.gid]=d.val;
      document.querySelectorAll('[data-applet-id="counter"]').forEach(function(wrap){
        if((wrap.getAttribute('data-cnt-group-id')||'')!==d.gid) return;
        var fr=wrap.querySelector('iframe');
        if(!fr) return;
        try{ if(fr.contentWindow===e.source) return; }catch(_e){}
        try{ fr.contentWindow.postMessage({type:'counterSync',val:d.val},'*'); }catch(_e){}
      });
      return;
    }
    if(d.type==='appletAnim'&&d.ref){
      var parts=String(d.ref).split(':');
      if(parts.length<2) return;
      var elId=parts[0], ai=+parts[1];
      var root=slides[i]; if(!root) return;
      var target=root.querySelector('.el[data-id="'+elId+'"]');
      if(!target) return;
      var steps=ANIM[i]||[];
      var hit=null;
      for(var si=0;si<steps.length;si++){
        var bun=steps[si];
        if(!bun||bun.kind!=='bundle') continue;
        var items=bun.items||[];
        for(var ii=0;ii<items.length;ii++){
          if(String(items[ii].elId)===String(elId) && (items[ii].ai==null || +items[ii].ai===ai)){ hit=items[ii]; break; }
        }
        if(hit) break;
      }
      if(hit){
        playBundle({items:[hit]});
      } else {
        target.classList.remove('el-wait');
        target.style.visibility='visible';
        target.style.opacity='';
      }
    }
  });
  window._counterGroupVal={};
  window.addEventListener('resize',function(){ syncOrientation(); fit(); });
  window.addEventListener('orientationchange',function(){
    setTimeout(function(){ syncOrientation(); fit(); }, 120);
  });
  ${buildHoverPlaybackSnippet().replace(/<\/script>/gi, '<\\/script>')}
  if(SHOW_BRUSH){
    (function(){
      var tool=null, width=4, color='#ef4444';
      var widths=[2,4,8,14], colors=['#ef4444','#eab308','#22c55e','#3b82f6','#a855f7','#f8fafc','#111827'];
      var canvas=document.getElementById('draw-layer');
      var bake=document.getElementById('draw-bake');
      var tools=document.getElementById('draw-tools');
      var opts=document.getElementById('draw-opts');
      var eraseBtn=document.getElementById('draw-erase');
      if(!canvas||!bake||!tools) return;
      var ctx=canvas.getContext('2d');
      var bctx=bake.getContext('2d');
      var drawing=null, hasInk=false;
      var strokes={};
      function sizeCanvases(){
        var r=document.getElementById('stage').getBoundingClientRect();
        [canvas,bake].forEach(function(c){
          c.width=Math.max(1,Math.round(r.width*devicePixelRatio));
          c.height=Math.max(1,Math.round(r.height*devicePixelRatio));
          c.style.left=r.left+'px'; c.style.top=r.top+'px';
          c.style.width=r.width+'px'; c.style.height=r.height+'px';
        });
        redrawBake();
      }
      function pt(e){
        var r=canvas.getBoundingClientRect();
        return {x:(e.clientX-r.left)/Math.max(1,r.width), y:(e.clientY-r.top)/Math.max(1,r.height)};
      }
      function strokePath(c, list, live){
        c.clearRect(0,0,c.canvas.width,c.canvas.height);
        var w=c.canvas.width, h=c.canvas.height;
        (list||[]).forEach(function(s){
          if(!s.pts||!s.pts.length) return;
          c.lineCap='round'; c.lineJoin='round';
          c.strokeStyle=s.color; c.lineWidth=Math.max(1,s.w*Math.min(w,h)/900);
          c.beginPath();
          c.moveTo(s.pts[0].x*w, s.pts[0].y*h);
          for(var k=1;k<s.pts.length;k++) c.lineTo(s.pts[k].x*w, s.pts[k].y*h);
          if(s.pts.length===1){ c.lineTo(s.pts[0].x*w+0.01, s.pts[0].y*h); }
          c.stroke();
        });
        if(live){ /* noop */ }
      }
      function redrawBake(){
        var list=strokes[i]||[];
        strokePath(bctx, list);
        ctx.clearRect(0,0,canvas.width,canvas.height);
      }
      function setTool(t){
        if(tool==='brush'&&t===null){ strokes={}; hasInk=false; redrawBake(); }
        tool=t;
        canvas.classList.toggle('is-active', !!tool);
        canvas.classList.toggle('is-erase', tool==='erase');
        var brushBtn=document.getElementById('draw-brush');
        if(brushBtn){
          brushBtn.classList.toggle('on', tool==='brush');
          if(tool==='brush'){
            brushBtn.style.background=color;
            brushBtn.style.color=(color==='#f8fafc'||color==='#eab308')?'#111827':'#fff';
          } else {
            brushBtn.style.background=''; brushBtn.style.color='';
          }
        }
        if(opts) opts.style.display=tool==='brush'?'flex':'none';
        if(eraseBtn){ eraseBtn.style.display=hasInk?'flex':'none'; eraseBtn.classList.toggle('on', tool==='erase'); }
      }
      document.getElementById('draw-brush').onclick=function(e){
        e.stopPropagation();
        setTool(tool==='brush'?null:'brush');
      };
      if(eraseBtn) eraseBtn.onclick=function(e){
        e.stopPropagation();
        setTool(tool==='erase'?'brush':'erase');
      };
      widths.forEach(function(w,idx){
        var b=document.getElementById('draw-w-'+idx);
        if(!b) return;
        b.onclick=function(e){ e.stopPropagation(); width=w; widths.forEach(function(_,j){ var el=document.getElementById('draw-w-'+j); if(el) el.classList.toggle('on',j===idx); }); };
      });
      colors.forEach(function(c,idx){
        var b=document.getElementById('draw-c-'+idx);
        if(!b) return;
        b.onclick=function(e){
          e.stopPropagation(); color=c;
          colors.forEach(function(_,j){ var el=document.getElementById('draw-c-'+j); if(el) el.classList.toggle('on',j===idx); });
          if(tool==='brush') setTool('brush');
        };
      });
      canvas.addEventListener('pointerdown',function(e){
        if(!tool) return;
        e.preventDefault(); e.stopPropagation();
        try{ canvas.setPointerCapture(e.pointerId); }catch(_e){}
        var p=pt(e);
        if(tool==='erase'){
          drawing={erase:true};
          var list=strokes[i]||[];
          strokes[i]=list.filter(function(s){
            return !(s.pts||[]).some(function(q){ return Math.hypot(q.x-p.x,q.y-p.y)<0.04; });
          });
          hasInk=(strokes[i]||[]).length>0;
          redrawBake();
          if(eraseBtn) eraseBtn.style.display=hasInk?'flex':'none';
          return;
        }
        var stroke={pts:[p],w:width,color:color};
        strokes[i]=strokes[i]||[];
        strokes[i].push(stroke);
        drawing=stroke; hasInk=true;
        if(eraseBtn) eraseBtn.style.display='flex';
        strokePath(ctx, [stroke], true);
      });
      canvas.addEventListener('pointermove',function(e){
        if(!drawing) return;
        e.stopPropagation();
        var p=pt(e);
        if(drawing.erase){
          var list=strokes[i]||[];
          strokes[i]=list.filter(function(s){
            return !(s.pts||[]).some(function(q){ return Math.hypot(q.x-p.x,q.y-p.y)<0.04; });
          });
          hasInk=(strokes[i]||[]).length>0;
          redrawBake();
          return;
        }
        drawing.pts.push(p);
        strokePath(ctx, [drawing], true);
      });
      function endStroke(){
        if(!drawing) return;
        if(!drawing.erase){
          bctx.drawImage(canvas,0,0);
          ctx.clearRect(0,0,canvas.width,canvas.height);
        }
        drawing=null;
        if(eraseBtn) eraseBtn.style.display=hasInk?'flex':'none';
      }
      canvas.addEventListener('pointerup',endStroke);
      canvas.addEventListener('pointercancel',endStroke);
      canvas.addEventListener('click',function(e){ e.stopPropagation(); });
      window.addEventListener('resize',sizeCanvases);
      window._sfRedrawDraw=redrawBake;
      setTool(null);
      sizeCanvases();
    })();
  }
  syncOrientation();
  show(firstVisible(0), false);
})();`;
}

/** Compact arLayouts for HTML export / phone orientation. */
export function compactArLayoutsForExport(slides) {
  return (slides || []).map((s) => {
    const src = s?.arLayouts || {};
    const out = {};
    ['16:9', '9:16'].forEach((key) => {
      const lay = src[key];
      if (!lay || !lay.els) return;
      const e = {};
      Object.keys(lay.els).forEach((id) => {
        const g = lay.els[id];
        if (!g) return;
        e[id] = {
          x: g.x,
          y: g.y,
          w: g.w,
          h: g.h,
          textColor: g.textColor || undefined,
        };
      });
      if (Object.keys(e).length) {
        out[key] = {
          w: lay.canvasW || undefined,
          h: lay.canvasH || undefined,
          e,
        };
      }
    });
    return out;
  });
}

