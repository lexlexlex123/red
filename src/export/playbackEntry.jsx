import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderSlideInnerHtml, slideBackgroundStyle } from './standaloneHtml.js';
import { PLAYBACK_ANIM_CSS, PLAYBACK_HOVER_CSS, serializePlaybackSteps, deckPlaybackSteps } from './playbackAnim.js';
import { wireHoverInRoot } from '../editor/hoverFx.js';
import { resolveSlideLinkIndex } from '../editor/links.js';
import { isLiveAnim } from '../editor/anims.js';
import { fireCameraAnim, fullSlideCam, cameraCssTransform } from '../editor/camera.js';
import { deckTransData, enterClass, PLAYBACK_TRANS_CSS } from '../editor/transitions.js';
import { collectSlideRideSpecs, startRideAnim } from '../editor/connectors.js';
import { fireMotionAnim, isMotionAnim } from '../editor/motionPlay.js';
import { fireRecolorAnim, isRecolorAnim, prepareRecolorEl, clearRecolorTransforms } from '../editor/recolorPlay.js';
import { fireUncropDom, isUncropAnim } from '../editor/imgUncrop.js';
import { fireTypewriterAnim, isTypewriterAnim } from '../editor/typewriterPlay.js';
import { fireTransformAnim, isTransformAnim } from '../editor/transformPlay.js';
import { fireLangFadeAnim, isLangFadeAnim } from '../editor/langFadePlay.js';
import { fireSplitHalfAnim, isSplitHalfAnim } from '../editor/splitHalfPlay.js';
import { fireCaptionSlideAnim, isCaptionSlideAnim } from '../editor/captionSlidePlay.js';
import { fireCosmosTitleForEl, isCosmosTitleAnim } from '../editor/cosmosTitlePlay.js';
import { fireParticlesAnim, isParticlesAnim } from '../editor/particlesPlay.js';
import { fireInkDrawAnim, isInkDrawAnim } from '../editor/inkDrawPlay.js';
import { fireFloatAnim, isFloatAnim } from '../editor/floatPlay.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from '../editor/canvasDims.js';
import { fireDanceAnim, isDanceAnim } from '../editor/dancePlay.js';
import { fireSwingAnim, isSwingAnim } from '../editor/swingPlay.js';
import { ensureIcons, onIconsReady, iconsReady } from '../editor/iconsLazy.js';
import { getTheme } from '../editor/themes.js';
import { firstVisibleSlideIndex, nextVisibleSlideIndex } from '../editor/slideVisibility.js';
import { mountModel3dViewer } from '../editor/model3d.js';
import { model3dExportConfig } from './model3dExport.js';

function ensureStylesheet(href) {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

ensureStylesheet('/fonts/fonts.css');

const LS_KEY = 'sf_playback_v1';

function loadDeck() {
  try {
    const raw = localStorage.getItem(LS_KEY) || sessionStorage.getItem(LS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.slides?.length) {
        try {
          localStorage.removeItem(LS_KEY);
        } catch (e) {}
        return data;
      }
    }
  } catch (e) {}
  try {
    const el = document.getElementById('slides-data');
    if (el) return JSON.parse(el.textContent || '{}');
  } catch (e) {}
  try {
    const raw = localStorage.getItem('sf_react_v1');
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.slides?.length) return data;
    }
  } catch (e) {}
  return {
    title: 'Слайды',
    canvasW: DEFAULT_CANVAS_W,
    canvasH: DEFAULT_CANVAS_H,
    cur: 0,
    slides: [
      {
        bgc: '#0f172a',
        els: [
          {
            type: 'text',
            x: 120,
            y: 260,
            w: 960,
            h: 80,
            html: 'Нет данных — откройте Playback из редактора',
            cs: 'font-size:32px;color:#fff;text-align:center;',
            textColor: '#fff',
          },
        ],
      },
    ],
  };
}

function ensureAnimStyle() {
  if (document.getElementById('pb-anim-css')) return;
  const style = document.createElement('style');
  style.id = 'pb-anim-css';
  style.textContent = PLAYBACK_ANIM_CSS + PLAYBACK_HOVER_CSS + PLAYBACK_TRANS_CSS;
  document.head.appendChild(style);
}

function PlaybackApp() {
  const data = useMemo(() => loadDeck(), []);
  const slides = data.slides || [];
  const W = data.canvasW || DEFAULT_CANVAS_W;
  const H = data.canvasH || DEFAULT_CANVAS_H;
  const animAll = useMemo(() => {
    const theme = getTheme(data.appliedThemeIdx);
    return deckPlaybackSteps(slides).map((s) => serializePlaybackSteps(s, theme));
  }, [slides, data.appliedThemeIdx]);
  const transAll = useMemo(
    () => deckTransData(slides, data.globalTrans, data.globalTransDur),
    [slides, data.globalTrans, data.globalTransDur]
  );
  const [cur, setCur] = useState(
    firstVisibleSlideIndex(slides, Math.min(data.cur | 0, Math.max(0, slides.length - 1)), 1)
  );
  const [iconsOk, setIconsOk] = useState(iconsReady());
  const [scale, setScale] = useState(1);
  const [tick, setTick] = useState(0);
  const [camTf, setCamTf] = useState(null);
  const [enterCls, setEnterCls] = useState('');
  const [enterDur, setEnterDur] = useState(500);
  const frameRef = useRef(null);
  const slideRef = useRef(null);
  const stepIRef = useRef(0);
  const busyRef = useRef(false);
  const busyTRef = useRef(null);
  const camAbortRef = useRef(null);
  const rideCancelRef = useRef([]);
  const scaleRef = useRef(1);
  const curRef = useRef(cur);
  const cumMotionRef = useRef({});
  curRef.current = cur;

  useEffect(() => onIconsReady(() => setIconsOk(true)), []);

  function clearRideAnims() {
    (rideCancelRef.current || []).forEach((fn) => {
      try {
        fn();
      } catch (e) {}
    });
    rideCancelRef.current = [];
  }

  function startSlideRides(slide) {
    clearRideAnims();
    const root = slideRef.current;
    if (!root || !slide) return;
    collectSlideRideSpecs(slide).forEach((spec) => {
      const node = root.querySelector(`[data-id="${CSS.escape(String(spec.elId))}"]`);
      if (!node) return;
      node.style.left = '0px';
      node.style.top = '0px';
      rideCancelRef.current.push(
        startRideAnim(node, spec.d, {
          duration: spec.duration,
          gap: spec.gap,
          invert: spec.invert,
          opacity: spec.opacity,
          baseRot: spec.baseRot,
        })
      );
    });
  }

  useEffect(() => {
    ensureAnimStyle();
  }, []);

  useEffect(() => {
    const fit = () => {
      const pad = 48;
      const sw = Math.max(80, window.innerWidth - pad);
      const sh = Math.max(80, window.innerHeight - 72 - pad);
      const s = Math.min(sw / W, sh / H);
      scaleRef.current = s;
      setScale(s);
      const el = slideRef.current;
      if (el?._pvCamState) {
        const t = cameraCssTransform(el._pvCamState, s, W, H);
        el.style.transform = t;
        setCamTf(t);
      }
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [W, H]);

  function clearBusy() {
    if (busyTRef.current) {
      clearTimeout(busyTRef.current);
      busyTRef.current = null;
    }
    busyRef.current = false;
  }

  function clearEnter() {
    setEnterCls('');
  }

  function abortCam(finish) {
    if (!camAbortRef.current) return;
    try {
      camAbortRef.current.abort(finish ? { finish: true } : {});
    } catch (e) {
      try {
        camAbortRef.current.abort();
      } catch (e2) {}
    }
    camAbortRef.current = null;
    if (slideRef.current) setCamTf(slideRef.current.style.transform);
  }

  function resetSlideDom() {
    const root = slideRef.current;
    if (!root) return;
    cumMotionRef.current = {};
    clearRecolorTransforms(root);
    root.querySelectorAll('.el').forEach((el) => {
      el.className = (el.className || '').replace(/\bel-anim-\S+/g, '').replace(/\s+/g, ' ').trim();
      el.style.animationDuration = '';
      el.style.transform = '';
      el.style.transition = '';
      if (el.classList.contains('el-wait')) {
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
      } else {
        el.style.visibility = '';
        el.style.opacity = '';
      }
    });
    // Prepare non-invert recolor silhouettes for current slide
    const slide = slides[curRef.current];
    (slide?.els || []).forEach((d) => {
      if (!d || d._isDecor) return;
      const node = root.querySelector(`[data-id="${String(d.id).replace(/"/g, '')}"]`);
      if (node) prepareRecolorEl(node, d);
    });
  }

  function playBundle(bundle) {
    const root = slideRef.current;
    if (!root || !bundle) return 0;
    const items = bundle.items || [];
    let maxWait = 0;
    items.forEach((step) => {
      if (step.kind === 'camera') {
        if (camAbortRef.current) camAbortRef.current.abort();
        let watching = true;
        camAbortRef.current = fireCameraAnim(root, step.cam, {
          W,
          H,
          fitScale: scaleRef.current,
          delay: step.delay || 0,
          duration: step.dur,
          onDone: () => {
            watching = false;
            camAbortRef.current = null;
            setCamTf(root.style.transform);
          },
        });
        const watch = () => {
          if (!watching || !root) return;
          setCamTf(root.style.transform);
          requestAnimationFrame(watch);
        };
        requestAnimationFrame(watch);
        const wait = (step.delay || 0) + (step.dur || 1200);
        if (wait > maxWait) maxWait = wait;
        return;
      }
      if (step.pause || step.name === 'pause') {
        const wait = Math.max(0, (step.delay || 0) + (step.dur || 0));
        if (wait > maxWait) maxWait = wait;
        return;
      }
      if (step.motion || isMotionAnim(step.name) || isRecolorAnim(step.name) || isTypewriterAnim(step.name) || isTransformAnim(step.name) || isLangFadeAnim(step.name) || isSplitHalfAnim(step.name) || isCaptionSlideAnim(step.name) || isCosmosTitleAnim(step.name) || isParticlesAnim(step.name) || isInkDrawAnim(step.name) || isFloatAnim(step.name) || isDanceAnim(step.name) || isSwingAnim(step.name) || isUncropAnim(step.name) || step.name === 'recolor' || step.name === 'typewriter' || step.name === 'transform' || step.name === 'langFade' || step.name === 'splitHalf' || step.name === 'captionSlide' || step.name === 'cosmosTitle' || step.name === 'particles' || step.name === 'inkDraw' || step.name === 'float' || step.name === 'dance' || step.name === 'swing' || step.name === 'uncrop') {
        const el = root.querySelector(`[data-id="${String(step.elId).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`);
        if (!el) return;
        const keepHidden =
          isCosmosTitleAnim(step.name) ||
          step.name === 'cosmosTitle' ||
          isCaptionSlideAnim(step.name) ||
          step.name === 'captionSlide' ||
          isParticlesAnim(step.name) ||
          step.name === 'particles';
        el.classList.remove('el-wait');
        if (keepHidden) {
          el.style.visibility = 'hidden';
          el.style.pointerEvents = 'none';
          if ((isCosmosTitleAnim(step.name) || step.name === 'cosmosTitle') && el.getAttribute('data-gid')) {
            const gid = el.getAttribute('data-gid');
            root.querySelectorAll(`[data-gid="${String(gid).replace(/"/g, '')}"]`).forEach((n) => {
              n.style.visibility = 'hidden';
              n.style.pointerEvents = 'none';
            });
          }
        } else {
          el.style.visibility = 'visible';
          el.style.opacity = '';
        }
        if (isFloatAnim(step.name) || step.name === 'float') {
          const result = fireFloatAnim(
            el,
            {
              id: step.elId,
              w: parseFloat(el.style.width) || el.offsetWidth,
              h: parseFloat(el.style.height) || el.offsetHeight,
            },
            {
              name: 'float',
              dur: step.dur,
              delay: step.delay,
              swingCount: step.swingCount,
            }
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isDanceAnim(step.name) || step.name === 'dance') {
          const result = fireDanceAnim(
            el,
            {
              id: step.elId,
              w: parseFloat(el.style.width) || el.offsetWidth,
              h: parseFloat(el.style.height) || el.offsetHeight,
            },
            {
              name: 'dance',
              dur: step.dur,
              delay: step.delay,
              swingCount: step.swingCount,
            }
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isSwingAnim(step.name) || step.name === 'swing') {
          const result = fireSwingAnim(
            el,
            {
              id: step.elId,
              w: parseFloat(el.style.width) || el.offsetWidth,
              h: parseFloat(el.style.height) || el.offsetHeight,
            },
            {
              name: 'swing',
              dur: step.dur,
              delay: step.delay,
              swingCount: step.swingCount,
              swingOx: step.swingOx,
              swingOy: step.swingOy,
            }
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isInkDrawAnim(step.name) || step.name === 'inkDraw') {
          const result = fireInkDrawAnim(
            el,
            { type: el.dataset?.type },
            {
              name: 'inkDraw',
              dur: step.dur,
              delay: step.delay,
              swingCount: step.swingCount,
              inkParallel: step.inkParallel,
            }
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isParticlesAnim(step.name) || step.name === 'particles') {
          const result = fireParticlesAnim(
            el,
            {
              type: el.dataset?.type,
              x: parseFloat(el.style.left) || 0,
              y: parseFloat(el.style.top) || 0,
              w: parseFloat(el.style.width) || el.offsetWidth,
              h: parseFloat(el.style.height) || el.offsetHeight,
              rot: +(el.dataset?.rot || 0),
            },
            {
              name: 'particles',
              dur: step.dur,
              delay: step.delay,
              particleCount: step.particleCount,
              ptDir: step.ptDir,
              ptLife: step.ptLife,
              ptSizeRand: step.ptSizeRand,
              ptRot: step.ptRot,
              ptSpread: step.ptSpread,
              swingCount: step.swingCount,
            }
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isCosmosTitleAnim(step.name) || step.name === 'cosmosTitle') {
          const slide = slides[curRef.current];
          const elData = (slide?.els || []).find((e) => e && String(e.id) === String(step.elId));
          const result = fireCosmosTitleForEl(
            elData || {
              id: step.elId,
              x: parseFloat(el.style.left) || 0,
              y: parseFloat(el.style.top) || 0,
              w: parseFloat(el.style.width) || el.offsetWidth,
              h: parseFloat(el.style.height) || el.offsetHeight,
            },
            slide,
            { name: 'cosmosTitle', dur: step.dur, delay: step.delay },
            { hideAfter: true },
            (id) => root.querySelector(`[data-id="${String(id).replace(/"/g, '')}"]`)
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isCaptionSlideAnim(step.name) || step.name === 'captionSlide') {
          const result = fireCaptionSlideAnim(
            el,
            {
              name: 'captionSlide',
              dur: step.dur,
              delay: step.delay,
              holdDuration: step.holdDuration,
              captionDir: step.captionDir,
            },
            { hideAfter: true }
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isSplitHalfAnim(step.name) || step.name === 'splitHalf') {
          const result = fireSplitHalfAnim(
            el,
            { name: 'splitHalf', dur: step.dur, delay: step.delay },
            { hideAfter: true }
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isLangFadeAnim(step.name) || step.name === 'langFade') {
          const result = fireLangFadeAnim(
            el,
            { type: el.dataset?.type || 'text' },
            {
              name: 'langFade',
              dur: step.dur,
              delay: step.delay,
              fromHtml: step.fromHtml,
              toHtml: step.toHtml,
            }
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isTypewriterAnim(step.name) || step.name === 'typewriter') {
          const result = fireTypewriterAnim(
            el,
            { type: el.dataset?.type || (el.querySelector('img') ? 'image' : 'text') },
            {
              name: 'typewriter',
              dur: step.dur,
              delay: step.delay,
              charDelay: step.charDelay,
              fromHtml: step.fromHtml,
              toHtml: step.toHtml,
            }
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isTransformAnim(step.name) || step.name === 'transform') {
          const from = step.from || {
            x: parseFloat(el.style.left) || 0,
            y: parseFloat(el.style.top) || 0,
            w: parseFloat(el.style.width) || el.offsetWidth,
            h: parseFloat(el.style.height) || el.offsetHeight,
            rot: 0,
            type: el.dataset?.type,
          };
          const to = step.to || from;
          const result = fireTransformAnim(
            el,
            from,
            to,
            {
              name: 'transform',
              dur: step.dur,
              delay: step.delay,
              easing: step.easing,
            },
            { theme: getTheme(data.appliedThemeIdx) }
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isRecolorAnim(step.name) || step.name === 'recolor') {
          const slide = slides[curRef.current];
          const elData =
            (slide?.els || []).find((e) => e && String(e.id) === String(step.elId)) || {
              id: step.elId,
              type: el.dataset?.type,
            };
          const wait = fireRecolorAnim(el, elData, {
            name: 'recolor',
            dur: step.dur,
            delay: step.delay,
            recolorColor: step.recolorColor,
            recolorInvert: step.recolorInvert,
          });
          if (wait > maxWait) maxWait = wait;
          return;
        }
        if (isUncropAnim(step.name) || step.name === 'uncrop') {
          const waitU = fireUncropDom(el, { dur: step.dur, delay: step.delay });
          if (waitU > maxWait) maxWait = waitU;
          return;
        }
        const prev = cumMotionRef.current[step.elId] || { tx: 0, ty: 0 };
        const anim = {
          name: step.name,
          dur: step.dur,
          delay: step.delay,
          tx: step.tx,
          ty: step.ty,
          orbitR: step.orbitR,
          orbitDir: step.orbitDir,
          orbitDeg: step.orbitDeg,
          orbitCx: step.orbitCx,
          orbitCy: step.orbitCy,
          rotateDir: step.rotateDir,
          rotateDeg: step.rotateDeg,
          mirrorAxis: step.mirrorAxis,
        };
        const result = fireMotionAnim(el, { rot: step.rot || 0 }, anim, prev.tx, prev.ty);
        cumMotionRef.current[step.elId] = { tx: result.endTx, ty: result.endTy };
        if (result.waitMs > maxWait) maxWait = result.waitMs;
        return;
      }
      const wait = step.live
        ? 0
        : step.name === 'pulse' || step.name === 'shake' || step.name === 'flash'
          ? (() => {
              const pc = step.swingCount != null ? +step.swingCount : 1;
              const loops = !Number.isFinite(pc) || pc >= 10 ? 1 : Math.max(1, pc || 1);
              return (step.delay || 0) + (step.dur || 600) * loops;
            })()
          : (step.delay || 0) + (step.dur || 600);
      if (wait > maxWait) maxWait = wait;
      const apply = () => {
        const el = root.querySelector(`[data-id="${String(step.elId).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`);
        if (!el) return;
        const gid = el.getAttribute('data-gid');
        const nodes = gid
          ? Array.from(root.querySelectorAll(`[data-gid="${String(gid).replace(/"/g, '')}"]`))
          : [el];
        (nodes.length ? nodes : [el]).forEach((node) => {
          node.classList.remove('el-wait');
          node.style.visibility = 'visible';
          node.style.opacity = '';
          node.className = `${(node.className || '').replace(/\bel-anim-\S+/g, '').trim()} ${step.cls || 'el-anim-fadein'}`;
          if (step.dur) node.style.animationDuration = `${step.dur}ms`;
          if (step.name === 'pulse' || step.name === 'shake' || step.name === 'flash') {
            const pc = step.swingCount != null ? +step.swingCount : 1;
            node.style.animationIterationCount =
              !Number.isFinite(pc) || pc >= 10 ? 'infinite' : String(Math.max(1, pc || 1));
          }
          if (step.live || isLiveAnim(step.name)) node.style.overflow = 'visible';
        });
      };
      if (step.delay > 0) setTimeout(apply, step.delay);
      else apply();
    });
    return maxWait;
  }

  function playNext() {
    const steps = animAll[curRef.current] || [];
    if (stepIRef.current >= steps.length) return false;
    const el = slideRef.current;
    const runFrom = (idx) => {
      const step = steps[idx];
      if (!step) return false;
      stepIRef.current = idx + 1;

      if (step.kind === 'camera') {
        if (!el) return true;
        busyRef.current = true;
        abortCam(false);
        let watching = true;
        camAbortRef.current = fireCameraAnim(el, step.cam, {
          W,
          H,
          fitScale: scaleRef.current,
          delay: step.delay || 0,
          duration: step.dur,
          onDone: () => {
            watching = false;
            busyRef.current = false;
            camAbortRef.current = null;
            setCamTf(el.style.transform);
            const next = steps[stepIRef.current];
            if (next?.kind === 'bundle' && next.auto) runFrom(stepIRef.current);
          },
        });
        const watch = () => {
          if (!watching || !el) return;
          setCamTf(el.style.transform);
          requestAnimationFrame(watch);
        };
        requestAnimationFrame(watch);
        return true;
      }

      const wait = playBundle(step);
      busyRef.current = true;
      busyTRef.current = setTimeout(() => {
        busyTRef.current = null;
        busyRef.current = false;
        const next = steps[stepIRef.current];
        if (next?.kind === 'bundle' && next.auto) runFrom(stepIRef.current);
      }, Math.max(50, wait));
      return true;
    };
    return runFrom(stepIRef.current);
  }

  function startAutoAnims() {
    const steps = animAll[curRef.current] || [];
    if (steps[0]?.kind === 'bundle' && steps[0]?.auto) playNext();
  }

  function goSlide(n, animate) {
    abortCam(false);
    clearBusy();
    clearEnter();
    clearRideAnims();
    const to = Math.max(0, Math.min(slides.length - 1, n));
    const from = curRef.current;
    stepIRef.current = 0;
    setCur(to);
    setTick((t) => t + 1);

    const td = transAll[to] || {};
    const cls = animate && from !== to ? enterClass(td.t) : '';
    const ms = td.d || 500;
    if (cls && ms > 0 && td.t && td.t !== 'none') {
      busyRef.current = true;
      setEnterDur(ms);
      setEnterCls(cls);
      busyTRef.current = setTimeout(() => {
        busyTRef.current = null;
        busyRef.current = false;
        clearEnter();
        startAutoAnims();
        startSlideRides(slides[to]);
      }, ms);
    }
  }

  function advance(dir) {
    if (busyRef.current) {
      abortCam(true);
      clearEnter();
      clearBusy();
      return;
    }
    if (dir > 0 && playNext()) return;
    const to = nextVisibleSlideIndex(slides, cur, dir);
    if (to < 0) return;
    goSlide(to, true);
  }

  function followLink(link, target) {
    if (!link) return;
    if (String(link).startsWith('#slide-')) {
      const idx = resolveSlideLinkIndex(link, cur, slides);
      if (idx != null) goSlide(idx, true);
      return;
    }
    if (/^https?:/i.test(link) || String(link).startsWith('mailto:')) {
      window.open(link, target || '_blank');
    }
  }

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = slideRef.current;
      if (el) {
        el._pvCamState = fullSlideCam(W, H);
        const t = cameraCssTransform(el._pvCamState, scaleRef.current, W, H);
        el.style.transformOrigin = 'top left';
        el.style.transform = t;
        setCamTf(t);
      }
      resetSlideDom();
      stepIRef.current = 0;
      // Auto anims only if not waiting on enter transition
      if (!busyRef.current) {
        startAutoAnims();
        startSlideRides(slides[curRef.current]);
      }
    });
    return () => {
      cancelAnimationFrame(id);
      clearRideAnims();
    };
  }, [cur, tick]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        advance(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        advance(-1);
      } else if (e.key === 'Home') {
        goSlide(0);
      } else if (e.key === 'End') {
        goSlide(Math.max(0, slides.length - 1));
      } else if (e.key === 'Escape') {
        window.close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const slide = slides[cur] || { els: [] };
  const pvTheme = useMemo(() => getTheme(data.appliedThemeIdx), [data.appliedThemeIdx]);
  const inner = useMemo(() => renderSlideInnerHtml(slide, W, H, pvTheme), [slide, W, H, cur, iconsOk, pvTheme]);
  const bg = slideBackgroundStyle(slide);

  useEffect(() => {
    return wireHoverInRoot(slideRef.current);
  }, [inner, cur]);

  // Live WebGL OBJ — same interactive viewer as F5 preview / HTML export.
  useEffect(() => {
    const root = slideRef.current;
    if (!root) return undefined;
    const cleanups = [];
    root.querySelectorAll('.model3d-host').forEach((host) => {
      let cfg = null;
      const cfgEl = host.querySelector('script.model3d-cfg');
      if (cfgEl) {
        try {
          cfg = JSON.parse(cfgEl.textContent || '{}');
        } catch (_) {
          cfg = null;
        }
      }
      if (!cfg || !cfg.objText) {
        const live = (slide.els || []).find((e) => e && String(e.id) === String(host.getAttribute('data-id')));
        cfg = model3dExportConfig(live);
      }
      if (!cfg?.objText) return;
      cleanups.push(
        mountModel3dViewer(host, cfg, {
          interactive: true,
          getEl: () => cfg,
        })
      );
    });
    return () => {
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch (_) {
          /* ignore */
        }
      });
    };
  }, [inner, cur, slide]);

  return (
    <div id="playback-root">
      <div className="pb-bar">
        <button type="button" disabled={cur <= 0} onClick={() => advance(-1)}>
          ←
        </button>
        <button type="button" onClick={() => advance(1)}>
          →
        </button>
        <span style={{ alignSelf: 'center', opacity: 0.85 }}>
          {cur + 1} / {slides.length || 1}
          {data.title ? ` — ${data.title}` : ''}
        </span>
      </div>
      <div
        className="pb-stage"
        onClick={(e) => {
          if (e.target.closest?.('.react-el-audio,[data-audio-player]')) return;
          if (e.target.closest?.('.model3d-host,[data-model3d-viewer]')) return;
          const inlineA = e.target.closest?.('a[href]');
          if (inlineA && inlineA.closest?.('.pb-slide,.slide')) {
            e.preventDefault();
            e.stopPropagation();
            followLink(inlineA.getAttribute('href'), inlineA.getAttribute('target') || '_blank');
            return;
          }
          const hit = e.target.closest?.('[data-link]');
          if (hit) {
            e.stopPropagation();
            followLink(hit.getAttribute('data-link'), hit.getAttribute('data-linkt'));
            return;
          }
          advance(1);
        }}
      >
        <div
          ref={frameRef}
          className={`pb-frame${enterCls ? ` ${enterCls}` : ''}`}
          style={{
            width: W * scale,
            height: H * scale,
            overflow: 'hidden',
            position: 'relative',
            flexShrink: 0,
            boxShadow: '0 20px 60px rgba(0,0,0,.45)',
            '--pv-dur': `${enterDur}ms`,
          }}
        >
          <div
            ref={slideRef}
            className="pb-slide"
            style={{
              width: W,
              height: H,
              transform: camTf || `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              left: 0,
              top: 0,
              ...bg,
            }}
            dangerouslySetInnerHTML={{ __html: inner }}
          />
        </div>
      </div>
    </div>
  );
}

ensureAnimStyle();
ensureIcons().finally(() => {
  createRoot(document.getElementById('playback-root')).render(<PlaybackApp />);
  window.__sfAppReady = 1;
});
