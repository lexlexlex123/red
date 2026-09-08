/** Shared CSS + helpers for HTML export / playback window anims + cameras. */

import {
  animCssClass,
  collectSlidePlaybackSteps,
  isEntranceAnim,
  isLiveAnim,
} from '../editor/anims.js';
import { hoverExportAttrs, PLAYBACK_HOVER_CSS, buildHoverPlaybackSnippet } from '../editor/hoverFx.js';
import { isMotionAnim } from '../editor/motionPlay.js';
import { isRecolorAnim } from '../editor/recolorPlay.js';
import { isTypewriterAnim } from '../editor/typewriterPlay.js';
import { isLangFadeAnim } from '../editor/langFadePlay.js';
import { isSplitHalfAnim } from '../editor/splitHalfPlay.js';
import { isCaptionSlideAnim } from '../editor/captionSlidePlay.js';
import { isCosmosTitleAnim } from '../editor/cosmosTitlePlay.js';
import { isParticlesAnim } from '../editor/particlesPlay.js';
import { isInkDrawAnim } from '../editor/inkDrawPlay.js';
import { isFloatAnim } from '../editor/floatPlay.js';

export { PLAYBACK_HOVER_CSS, buildHoverPlaybackSnippet };

export const PLAYBACK_ANIM_CSS = `
.el-wait{visibility:hidden;opacity:0}
.el[data-link]{cursor:pointer}
@keyframes elFadeIn{from{opacity:0}to{opacity:1}}
@keyframes elSlideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
@keyframes elSlideDown{from{opacity:0;transform:translateY(-28px)}to{opacity:1;transform:none}}
@keyframes elSlideLeft{from{opacity:0;transform:translateX(36px)}to{opacity:1;transform:none}}
@keyframes elSlideRight{from{opacity:0;transform:translateX(-36px)}to{opacity:1;transform:none}}
@keyframes elZoomIn{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:none}}
@keyframes elBounce{0%{opacity:0;transform:translateY(40px)}60%{opacity:1;transform:translateY(-8px)}100%{transform:none}}
@keyframes elSpin{from{opacity:0;transform:rotate(-180deg) scale(.6)}to{opacity:1;transform:none}}
@keyframes elFadeOut{from{opacity:1}to{opacity:0}}
@keyframes elSlideOut{from{opacity:1;transform:none}to{opacity:0;transform:translateX(40px)}}
@keyframes elZoomOut{from{opacity:1;transform:none}to{opacity:0;transform:scale(.6)}}
@keyframes elPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes elShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
@keyframes elFlash{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes elDance{0%,100%{transform:rotate(0) translateY(0)}25%{transform:rotate(-10deg) translateY(-5px)}50%{transform:rotate(0) translateY(2px)}75%{transform:rotate(10deg) translateY(-3px)}}
@keyframes elSwing{0%,100%{transform:rotate(0)}50%{transform:rotate(14deg)}}
@keyframes elFloat{0%,100%{transform:translate(0,0)}25%{transform:translate(8px,-10px)}50%{transform:translate(-5px,-4px)}75%{transform:translate(5px,7px)}}
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
`.replace(/\n/g, '');

/** Cameras interleaved with anim bundles via slide.animOrder. */
export function deckPlaybackSteps(slides) {
  return (slides || []).map((s) => collectSlidePlaybackSteps(s));
}

/** @deprecated alias */
export function deckAnimSteps(slides) {
  return deckPlaybackSteps(slides);
}

export function serializePlaybackSteps(steps) {
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
    return {
      kind: 'bundle',
      auto: !!s.auto,
      items: (s.items || []).map((it) => {
        const item = {
          elId: String(it.elId),
          ai: it.ai != null ? +it.ai : undefined,
          name: it.name,
          cls: it.name === 'pause' ? '' : animCssClass(it.name),
          dur: it.dur || 600,
          delay: it.delay || 0,
          live: it.name === 'pause' ? false : isLiveAnim(it.name),
          pause: it.name === 'pause',
          motion: it.name !== 'pause' && (isMotionAnim(it.name) || isRecolorAnim(it.name) || isTypewriterAnim(it.name) || isLangFadeAnim(it.name) || isSplitHalfAnim(it.name) || isCaptionSlideAnim(it.name) || isCosmosTitleAnim(it.name) || isParticlesAnim(it.name) || isInkDrawAnim(it.name) || isFloatAnim(it.name)),
          rot: it.rot || 0,
        };
        if (it.name === 'moveTo') {
          item.tx = it.tx || 0;
          item.ty = it.ty || 0;
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
          item.inkParallel = it.inkParallel != null ? +it.inkParallel : 1;
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
  });
}

/** @deprecated alias */
export function serializeBundleSteps(steps) {
  return serializePlaybackSteps(steps);
}

/** Attach data-id / data-link / el-wait onto exported element markup. */
export function decorateExportEl(el, html) {
  if (!html || !el || el._isDecor) return html;
  const wait = (el.anims || []).some(
    (a) =>
      a &&
      (isEntranceAnim(a.name) || a.name === 'cosmosTitle' || a.name === 'captionSlide')
  );
  let out = html.replace(/^<([a-zA-Z0-9]+)/, (m, tag) => {
    let attrs = `<${tag}`;
    if (el.id != null) attrs += ` data-id="${String(el.id).replace(/"/g, '')}"`;
    if (el.link) {
      const link = String(el.link).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      attrs += ` data-link="${link}"`;
      attrs += ` data-linkt="${String(el.linkt || '_blank').replace(/"/g, '')}"`;
    }
    const hfx = hoverExportAttrs(el);
    Object.keys(hfx).forEach((k) => {
      attrs += ` ${k}="${String(hfx[k]).replace(/"/g, '')}"`;
    });
    return attrs;
  });
  out = out.replace(/class="el"/, `class="${wait ? 'el el-wait' : 'el'}"`);
  if (el.link || (el.hoverFx && el.hoverFx.enabled)) out = out.replace(/style="/, 'style="cursor:pointer;');
  return out;
}

/**
 * Inline slideshow controller for standalone HTML (no modules).
 * Includes element anims + Prezi-like cameras + slide transitions + connector rides.
 */
export function buildStandalonePlaybackScript({ W, H, animData, transData, rideData }) {
  const dataJson = JSON.stringify(animData);
  const transJson = JSON.stringify(transData || []);
  const rideJson = JSON.stringify(rideData || []);
  return `(function(){
  var frames=[].slice.call(document.querySelectorAll('.slide-frame'));
  var slides=frames.map(function(fr){return fr.querySelector('.slide');});
  var ANIM=${dataJson};
  var TRANS=${transJson};
  var RIDES=${rideJson};
  var i=0, stepI=0, busy=false, busyT=null, W=${W}, H=${H};
  var camState={cx:W/2,cy:H/2,w:W,h:H,rot:0};
  var camCtl=null;
  var rideCancels=[];
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
  function abortCam(finish){
    if(!camCtl) return;
    camCtl.aborted=true;
    (camCtl.rafs||[]).forEach(function(id){cancelAnimationFrame(id);});
    (camCtl.timers||[]).forEach(function(t){clearTimeout(t);});
    if(finish && camCtl.to) applyCam(slides[i], camCtl.to, fitScale());
    camCtl=null;
  }
  function skipBusy(){
    if(!busy) return false;
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
    if(slides[i]) applyCam(slides[i], camState, s);
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
  function resetSlide(root){
    if(!root) return;
    root.querySelectorAll('.el').forEach(function(el){
      el.className=(el.className||'').replace(/\\bel-anim-\\S+/g,'').replace(/\\s+/g,' ').trim();
      el.style.animationDuration='';
      el.style.transform='';
      el.style.transition='';
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
  var cumMap={};
  function fireMotion(el, step, cumTx, cumTy){
    var dur=Math.max(50, step.dur||600), delay=Math.max(0, step.delay||0);
    var rot=step.rot?(' rotate('+step.rot+'deg)'):'';
    if(step.name==='moveTo'){
      var tx=step.tx||0, ty=step.ty||0;
      if(el.animate){
        var a=el.animate(
          [{transform:'translate('+cumTx+'px,'+cumTy+'px)'+rot},
           {transform:'translate('+tx+'px,'+ty+'px)'+rot}],
          {duration:dur, delay:delay, easing:'linear', fill:'forwards', composite:'replace'}
        );
        a.onfinish=function(){ try{a.commitStyles();}catch(e){} a.cancel(); el.style.transform='translate('+tx+'px,'+ty+'px)'+rot; };
      }
      return {endTx:tx, endTy:ty, wait:delay+dur};
    }
    if(step.name==='orbitTo'){
      var dir=(step.orbitDir||'cw')==='cw'?1:-1;
      var totalDeg=(step.orbitDeg!=null?step.orbitDeg:360)*dir;
      var ocx=step.orbitCx||0, ocy=step.orbitCy||0;
      var r=Math.sqrt(ocx*ocx+ocy*ocy)||step.orbitR||120;
      var sa=Math.atan2(-ocy,-ocx);
      var stepsN=Math.max(60, Math.abs(totalDeg)*2), frames=[], i;
      for(i=0;i<=stepsN;i++){
        var t=i/stepsN, ang=sa+(totalDeg*Math.PI/180)*t;
        frames.push({transform:'translate('+(cumTx+ocx+r*Math.cos(ang)).toFixed(2)+'px,'+(cumTy+ocy+r*Math.sin(ang)).toFixed(2)+'px)'+rot});
      }
      var endTx=cumTx+ocx+r*Math.cos(sa+(totalDeg*Math.PI/180));
      var endTy=cumTy+ocy+r*Math.sin(sa+(totalDeg*Math.PI/180));
      if(el.animate){
        var b=el.animate(frames,{duration:dur, delay:delay, easing:'linear', fill:'forwards', composite:'replace'});
        b.onfinish=function(){ try{b.commitStyles();}catch(e){} b.cancel(); el.style.transform='translate('+endTx.toFixed(2)+'px,'+endTy.toFixed(2)+'px)'+rot; };
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
    var fromT=invert?1:0, toT=invert?0:1;
    fmEl.setAttribute('values', mat(fromT));
    target.style.filter='url(#'+fid+')';
    setTimeout(function(){
      var t0=performance.now();
      function frame(now){
        var p=Math.min(1,(now-t0)/dur);
        var e=p<0.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
        var t=fromT+(toT-fromT)*e;
        fmEl.setAttribute('values', mat(t));
        if(p<1) requestAnimationFrame(frame);
        else if(toT>=0.999){ target.style.filter=''; if(filter.parentNode) filter.parentNode.removeChild(filter); }
      }
      requestAnimationFrame(frame);
    }, delay);
    return delay+dur;
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
    var x=parseFloat(el.style.left)||0, y=parseFloat(el.style.top)||0;
    var w=parseFloat(el.style.width)||el.offsetWidth||200, h=parseFloat(el.style.height)||el.offsetHeight||200;
    var yShift=slideH*0.98-y;
    var travel=slideH*1.72+Math.max(1,h);
    el.style.visibility='hidden'; el.style.pointerEvents='none';
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
      var clone=el.cloneNode(true);
      clone.style.position='absolute'; clone.style.left=x+'px'; clone.style.top=(y+yShift)+'px';
      clone.style.width=w+'px'; clone.style.height=h+'px';
      clone.style.visibility='visible'; clone.style.opacity='1';
      clone.style.pointerEvents='none'; clone.style.outline='none';
      clone.removeAttribute('data-id');
      mover.appendChild(clone); tilt.appendChild(mover); stage.appendChild(tilt); host.appendChild(stage);
      try{
        var a=mover.animate([{transform:'translateY(0px)'},{transform:'translateY('+(-travel)+'px)'}],{duration:dur,easing:'linear',fill:'forwards'});
        a.finished.then(function(){ if(stage.parentNode) stage.remove(); el.style.visibility='hidden'; }).catch(function(){});
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
    var ex=parseFloat(el.style.left)||0, ey=parseFloat(el.style.top)||0;
    var fly=((ptDir-90)%360+360)%360;
    var layer=document.createElement('div');
    layer.className='_particles_layer';
    layer.style.cssText='position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:2;';
    host.appendChild(layer);
    el.style.visibility='hidden';
    var speedFactor=6000/spawn;
    function spawnOne(at){
      setTimeout(function(){
        var life=ptLife*(0.55+Math.random()*0.9);
        var sc=0.4+Math.random()*0.6;
        var pw=Math.max(4,ew*sc), ph=Math.max(4,eh*sc);
        var sx=ex+Math.random()*Math.max(0,ew-pw*0.5);
        var sy=ey+Math.random()*Math.max(0,eh-ph*0.5);
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
    setTimeout(function(){ if(layer.parentNode) layer.remove(); }, wait+200);
    return wait;
  }
  function fireInkDraw(el, step){
    var delay=Math.max(0, step.delay||0);
    var dur=Math.max(200, step.dur||1400);
    var par=step.inkParallel!=null?+step.inkParallel:1;
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
  function fireFloat(el, step){
    var delay=Math.max(0, step.delay||0);
    var dur=Math.max(400, step.dur||5000);
    var loops=Math.max(1, Math.min(20, step.swingCount!=null?step.swingCount:10));
    if(loops>=10) loops=Infinity;
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
  function fireDance(el, step){
    var delay=Math.max(0, step.delay||0);
    var dur=Math.max(200, step.dur||1200);
    var loops=Math.max(1, Math.min(20, step.swingCount!=null?step.swingCount:1));
    if(loops>=10) loops=Infinity;
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
  function fireSwing(el, step){
    var delay=Math.max(0, step.delay||0);
    var dur=Math.max(200, step.dur||1200);
    var loops=Math.max(1, Math.min(20, step.swingCount!=null?step.swingCount:1));
    if(loops>=10) loops=Infinity;
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
  function playBundle(root, bundle){
    var items=bundle.items||[], maxWait=0;
    items.forEach(function(step){
      if(step.pause || step.name==='pause'){
        var waitP=Math.max(0,(step.delay||0)+(step.dur||0));
        if(waitP>maxWait) maxWait=waitP;
        return;
      }
      if(step.motion || step.name==='moveTo' || step.name==='orbitTo' || step.name==='rotate' || step.name==='mirror' || step.name==='recolor' || step.name==='typewriter' || step.name==='langFade' || step.name==='splitHalf' || step.name==='captionSlide' || step.name==='cosmosTitle' || step.name==='particles' || step.name==='inkDraw' || step.name==='float' || step.name==='dance' || step.name==='swing'){
        var el=findEl(root, step.elId); if(!el) return;
        var keepHidden=step.name==='cosmosTitle'||step.name==='captionSlide'||step.name==='particles';
        el.classList.remove('el-wait');
        if(keepHidden){ el.style.visibility='hidden'; el.style.pointerEvents='none'; }
        else { el.style.visibility='visible'; el.style.opacity=''; }
        if(step.name==='float'){
          var waitFl=fireFloat(el, step);
          if(waitFl>maxWait) maxWait=waitFl;
          return;
        }
        if(step.name==='dance'){
          var waitDa=fireDance(el, step);
          if(waitDa>maxWait) maxWait=waitDa;
          return;
        }
        if(step.name==='swing'){
          var waitSw=fireSwing(el, step);
          if(waitSw>maxWait) maxWait=waitSw;
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
        if(step.name==='recolor'){
          var waitR=fireRecolor(el, step);
          if(waitR>maxWait) maxWait=waitR;
          return;
        }
        var prev=cumMap[step.elId]||{tx:0,ty:0};
        var res=fireMotion(el, step, prev.tx, prev.ty);
        cumMap[step.elId]={tx:res.endTx, ty:res.endTy};
        if(res.wait>maxWait) maxWait=res.wait;
        return;
      }
      var wait=step.live?0:((step.delay||0)+(step.dur||600));
      if(!step.live && (step.name==='pulse'||step.name==='shake'||step.name==='flash')){
        var pc=step.swingCount!=null?+step.swingCount:1;
        var ploops=(!isFinite(pc)||pc>=10)?1:Math.max(1,pc||1);
        wait=(step.delay||0)+(step.dur||600)*ploops;
      }
      if(wait>maxWait) maxWait=wait;
      var apply=function(){
        var el=findEl(root, step.elId); if(!el) return;
        el.classList.remove('el-wait');
        el.style.visibility='visible'; el.style.opacity='';
        el.className=(el.className||'').replace(/\\bel-anim-\\S+/g,'').trim()+' '+(step.cls||'el-anim-fadein');
        if(step.dur) el.style.animationDuration=step.dur+'ms';
        if(step.name==='pulse'||step.name==='shake'||step.name==='flash'){
          var pc2=step.swingCount!=null?+step.swingCount:1;
          el.style.animationIterationCount=(!isFinite(pc2)||pc2>=10)?'infinite':String(Math.max(1,pc2||1));
        }
        if(step.live) el.style.overflow='visible';
      };
      if(step.delay>0) setTimeout(apply, step.delay); else apply();
    });
    return maxWait;
  }
  function fireCam(el, cam, dur, delay, onDone){
    abortCam(false);
    var fit=fitScale();
    var from={cx:camState.cx,cy:camState.cy,w:camState.w,h:camState.h,rot:camState.rot};
    var to={
      cx:+cam.cx, cy:+cam.cy,
      w:Math.max(36,+cam.w||W),
      h:Math.max(36,+cam.h||((+cam.w||W)*aspect())),
      rot:+cam.rot||0
    };
    var ctl={aborted:false,rafs:[],timers:[],to:to};
    camCtl=ctl;
    function lerp(a,b,p){return a+(b-a)*p;}
    function along(e){
      var dRot=(+to.rot||0)-(+from.rot||0);
      while(dRot>180)dRot-=360; while(dRot<-180)dRot+=360;
      var rot=(+from.rot||0)+dRot*e;
      var cx=lerp(+from.cx,+to.cx,e), cy=lerp(+from.cy,+to.cy,e);
      var w0=Math.max(36,+from.w||W), w1=Math.max(36,+to.w||W);
      var w=Math.exp(lerp(Math.log(w0),Math.log(w1),e));
      return {cx:cx,cy:cy,w:w,h:w*aspect(),rot:rot};
    }
    function run(){
      if(ctl.aborted) return;
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
        if(next && next.kind==='bundle' && next.auto) runFrom(stepI);
      }, Math.max(50, wait));
      return true;
    }
    return runFrom(stepI);
  }
  function startAutoAnims(){
    var steps=ANIM[i]||[];
    if(steps[0] && steps[0].kind==='bundle' && steps[0].auto) playNext();
  }
  function startTimers(){
    var root=slides[i]; if(!root) return;
    root.querySelectorAll('iframe[data-applet-id="timer"]').forEach(function(fr){
      try{fr.contentWindow.postMessage({type:'timerStart'},'*');}catch(e){}
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
    i=Math.max(0,Math.min(slides.length-1,n));
    stepI=0;
    cumMap={};
    camState=fullCam();
    frames.forEach(function(fr,k){fr.classList.toggle('on',k===i);});
    document.getElementById('n').textContent=(i+1)+' / '+slides.length;
    resetSlide(slides[i]);
    fit();
    var td=TRANS[i]||{};
    var cls=(animate && prev!==i) ? (ENTER[td.t]||'') : '';
    var ms=+td.d||500;
    if(cls && ms>0 && td.t && td.t!=='none'){
      busy=true;
      frames[i].style.setProperty('--pv-dur', ms+'ms');
      frames[i].classList.add(cls);
      busyT=setTimeout(function(){
        clearEnterCls(frames[i]);
        busyT=null; busy=false;
        startTimers();
        syncCounterGroups(slides[i]);
        startAutoAnims();
        startSlideRides();
        initMvFs(slides[i]);
      }, ms);
    } else {
      startTimers();
      syncCounterGroups(slides[i]);
      startAutoAnims();
      startSlideRides();
      initMvFs(slides[i]);
    }
  }
  function advance(dir){
    if(busy){ skipBusy(); return; }
    if(dir>0 && playNext()) return;
    var to=i+dir;
    if(to<0||to>=slides.length) return;
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
  document.getElementById('prev').onclick=function(){advance(-1)};
  document.getElementById('next').onclick=function(){advance(1)};
  document.getElementById('stage').onclick=function(e){
    if(e.target.closest('#hud')) return;
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
    var hit=e.target.closest('[data-link]');
    if(hit){
      e.stopPropagation();
      followLink(hit.getAttribute('data-link'), hit.getAttribute('data-linkt'));
      return;
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
    function destroy(){ try{v.pause();}catch(e){} if(ov.parentNode)ov.parentNode.removeChild(ov); document.removeEventListener('keydown',onK); }
    function onK(e){ if(e.key==='Escape') destroy(); }
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
    if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown'){e.preventDefault();advance(1)}
    if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();advance(-1)}
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
  window.addEventListener('resize',fit);
  ${buildHoverPlaybackSnippet().replace(/<\/script>/gi, '<\\/script>')}
  show(0, false);
})();`;
}
