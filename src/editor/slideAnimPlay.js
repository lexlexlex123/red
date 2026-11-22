/**
 * Play entrance/emphasis/motion/recolor anims on the editor canvas (auto-advance all steps).
 */
import { usePresentationStore } from '../stores/presentationStore.js';
import { useUiStore } from '../stores/uiStore.js';
import {
  animCssClass,
  collectSlidePlaybackSteps,
  isEntranceAnim,
  isLiveAnim,
} from './anims.js';
import { fireCameraAnim } from './camera.js';
import {
  cancelSubtreeAnimations,
  clearMotionTransforms,
  fireMotionAnim,
  isMotionAnim,
} from './motionPlay.js';
import {
  clearRecolorTransforms,
  fireRecolorAnim,
  isRecolorAnim,
  prepareRecolorEl,
} from './recolorPlay.js';
import { fireTypewriterAnim, isTypewriterAnim } from './typewriterPlay.js';
import { fireTransformAnim, isTransformAnim, snapshotTransformProps } from './transformPlay.js';
import { fireLangFadeAnim, isLangFadeAnim } from './langFadePlay.js';
import { fireSplitHalfAnim, isSplitHalfAnim, clearSplitHalf } from './splitHalfPlay.js';
import { fireCaptionSlideAnim, isCaptionSlideAnim } from './captionSlidePlay.js';
import { fireCosmosTitleForEl, isCosmosTitleAnim, clearCosmosTitle } from './cosmosTitlePlay.js';
import { animPlayTargets, slideGroupMembers } from './animOrder.js';
import { fireParticlesAnim, isParticlesAnim, clearParticles } from './particlesPlay.js';
import { fireInkDrawAnim, isInkDrawAnim, clearInkDraw } from './inkDrawPlay.js';
import { isFloatAnim, clearFloat, floatWaitMs } from './floatPlay.js';
import { isDanceAnim, clearDance, danceWaitMs } from './dancePlay.js';
import { isSwingAnim, clearSwing, swingWaitMs } from './swingPlay.js';
import { isPulseFamilyAnim, pulseIsInfinite, pulseWaitMs, pulseLoopCount } from './pulsePlay.js';
import { elBoxTransform } from './elTransform.js';
import { isUncropAnim } from './imgUncrop.js';
import { getTheme } from './themes.js';

let timers = [];
let running = false;

export function isSlideAnimPlaying() {
  return running;
}

/** Re-apply store rotation/flip after imperative transform clears (React may skip DOM write). */
function resetCamera(stage) {
  if (!stage) return;
  if (stage._camCtl) {
    try {
      stage._camCtl.aborted = true;
    } catch (e) {}
  }
  stage._pvCamState = null;
  stage.style.transform = '';
  stage.style.transformOrigin = '';
  stage.style.overflow = '';
}

function restoreElBoxTransforms(root) {
  if (!root) return;
  const st = usePresentationStore.getState();
  const els = st.slides[st.cur]?.els || [];
  const byId = new Map(els.filter(Boolean).map((e) => [String(e.id), e]));
  root.querySelectorAll('.react-el[data-id]').forEach((node) => {
    const el = byId.get(String(node.getAttribute('data-id')));
    if (!el || el._isDecor) return;
    const xf = elBoxTransform(el);
    node.style.transform = xf || '';
  });
}

export function stopSlideAnimPlay() {
  const uiPlaying = !!useUiStore.getState().slideAnimPlaying;
  const wasRunning = running || uiPlaying;
  timers.forEach((t) => clearTimeout(t));
  timers = [];
  running = false;
  useUiStore.getState().setSlideAnimPlaying(false);
  useUiStore.getState().setAnimPlay(null);
  // pickSlide always calls stop — do not wipe CSS transforms when idle
  // (that cleared rotate() on lines; React then skipped restoring identical style).
  if (!wasRunning) return;
  const stage = document.querySelector('.react-slide-stage');
  resetCamera(stage);
  cancelSubtreeAnimations(stage);
  clearMotionTransforms(stage);
  clearRecolorTransforms(stage);
  clearSplitHalf(stage);
  clearCosmosTitle(stage);
  clearParticles(stage);
  clearInkDraw(stage);
  clearFloat(stage);
  clearDance(stage);
  clearSwing(stage);
  restoreElBoxTransforms(stage);
}

function schedule(fn, ms) {
  const id = setTimeout(fn, ms);
  timers.push(id);
  return id;
}

/**
 * Replay current slide anims on canvas. Returns true if started.
 */
export function playSlideAnimPlay(opts = {}) {
  stopSlideAnimPlay();
  const st = usePresentationStore.getState();
  const slide = st.slides[st.cur];
  if (!slide) return false;
  const allSteps = collectSlidePlaybackSteps(slide);
  let from = 0;
  if (opts.fromElId != null) {
    const hit = allSteps.findIndex((b) =>
      (b.items || []).some(
        (it) =>
          String(it.elId) === String(opts.fromElId) &&
          (opts.fromAi == null || it.ai === opts.fromAi || (it.kind === 'camera' && String(it.cam?.id) === String(opts.fromElId)))
      )
    );
    if (hit >= 0) from = hit;
  } else if (opts.fromCamId) {
    const hit = allSteps.findIndex((b) =>
      (b.items || []).some((it) => it.kind === 'camera' && String(it.cam?.id) === String(opts.fromCamId))
    );
    if (hit >= 0) from = hit;
  } else if (opts.from != null) {
    from = Math.max(0, Math.min(allSteps.length, opts.from | 0));
  }
  const steps = allSteps.slice(from);
  if (!steps.length) {
    useUiStore.getState().showToast(
      useUiStore.getState().lang === 'en' ? 'No animations on this slide' : 'На слайде нет анимаций',
      'warn'
    );
    return false;
  }

  running = true;
  useUiStore.getState().setSlideAnimPlaying(true);
  const alreadyShown = new Set();
  allSteps.slice(0, from).forEach((b) => {
    (b.items || []).forEach((it) => {
      if (it.elId != null && it.name && (isEntranceAnim(it.name) || it.name === 'cosmosTitle' || it.name === 'captionSlide')) {
        const owner = (slide.els || []).find((e) => e && String(e.id) === String(it.elId));
        animPlayTargets(owner || { id: it.elId }, slide, it.name).forEach((m) => {
          if (m?.id != null) alreadyShown.add(String(m.id));
        });
      }
    });
  });
  const init = {};
  (slide.els || []).forEach((el) => {
    if (!el || el._isDecor) return;
    if (!Array.isArray(el.anims) || !el.anims.length) return;
    if (alreadyShown.has(String(el.id))) return;
    const hide =
      el.anims.some((a) => a && isEntranceAnim(a.name)) ||
      el.anims.some((a) => a && (a.name === 'cosmosTitle' || a.name === 'captionSlide'));
    if (!hide) return;
    // Entrance on a group member hides the whole group until the anim fires.
    animPlayTargets(el, slide, el.anims.find((a) => a && (isEntranceAnim(a.name) || a.name === 'cosmosTitle' || a.name === 'captionSlide'))?.name).forEach(
      (m) => {
        if (m?.id != null) init[m.id] = { hidden: true };
      }
    );
  });
  useUiStore.getState().setAnimPlay(init);

  // Prepare recolor silhouettes
  (slide.els || []).forEach((el) => {
    if (!el || el._isDecor) return;
    const dom = document.querySelector(`.react-slide-stage .react-el[data-id="${el.id}"]`);
    if (dom) prepareRecolorEl(dom, el);
  });

  const cum = {};
  let i = 0;

  function playBundle(bundle) {
    const items = bundle.items || [];
    let maxWait = 0;
    items.forEach((step) => {
      if (step.kind === 'camera') {
        const stage = document.querySelector('.react-slide-stage');
        const wait = (step.delay || 0) + (step.dur || 1200);
        if (stage) {
          const { canvasW, canvasH } = usePresentationStore.getState();
          fireCameraAnim(stage, step.cam, {
            W: canvasW,
            H: canvasH,
            delay: step.delay || 0,
            duration: step.dur,
          });
        }
        if (wait > maxWait) maxWait = wait;
        return;
      }
      if (step.name === 'pause') {
        const wait = Math.max(0, (step.delay || 0) + (step.dur || 0));
        if (wait > maxWait) maxWait = wait;
        return;
      }
      if (
        isMotionAnim(step.name) ||
        isRecolorAnim(step.name) ||
        isTypewriterAnim(step.name) ||
        isTransformAnim(step.name) ||
        isLangFadeAnim(step.name) ||
        isSplitHalfAnim(step.name) ||
        isCaptionSlideAnim(step.name) ||
        isCosmosTitleAnim(step.name) ||
        isParticlesAnim(step.name) ||
        isInkDrawAnim(step.name) ||
        isFloatAnim(step.name) ||
        isDanceAnim(step.name) ||
        isSwingAnim(step.name) ||
        isUncropAnim(step.name)
      ) {
        const el = (slide.els || []).find((e) => String(e.id) === String(step.elId));
        const anim = el?.anims?.[step.ai];
        const dom = document.querySelector(`.react-slide-stage .react-el[data-id="${step.elId}"]`);
        const prev = cum[step.elId] || { tx: 0, ty: 0 };
        if (dom && anim) {
          const keepHidden =
            isCosmosTitleAnim(step.name) ||
            isCaptionSlideAnim(step.name) ||
            isParticlesAnim(step.name);
          const prevPlay = useUiStore.getState().animPlay || {};
          const prevEl = prevPlay[step.elId] || {};
          useUiStore.getState().setAnimPlay({
            ...prevPlay,
            [step.elId]: {
              ...prevEl,
              hidden: keepHidden,
              live: false,
              particles: isParticlesAnim(step.name),
              cls: undefined,
              recolorDone: prevEl.recolorDone,
              recolorPlaying: prevEl.recolorPlaying,
              uncropDone: prevEl.uncropDone,
              // Keep baked moveTo offset so particles spawn from the post-move box.
              motionTx: prevEl.motionTx,
              motionTy: prevEl.motionTy,
              motionPlaying: false,
            },
          });
          if (isFloatAnim(step.name)) {
            // CSS keyframes run in SlideCanvas via animPlay.float (React-safe)
            useUiStore.getState().setAnimPlay({
              ...(useUiStore.getState().animPlay || {}),
              [step.elId]: {
                hidden: false,
                live: true,
                float: true,
                dur: anim.dur || anim.duration || 5000,
                swingCount: anim.swingCount != null ? anim.swingCount : 10,
              },
            });
            const wait = floatWaitMs(anim);
            if (wait > maxWait) maxWait = wait;
          } else if (isDanceAnim(step.name)) {
            useUiStore.getState().setAnimPlay({
              ...(useUiStore.getState().animPlay || {}),
              [step.elId]: {
                hidden: false,
                live: true,
                dance: true,
                dur: anim.dur || anim.duration || 1200,
                swingCount: anim.swingCount != null ? anim.swingCount : 1,
              },
            });
            const wait = danceWaitMs(anim);
            if (wait > maxWait) maxWait = wait;
          } else if (isSwingAnim(step.name)) {
            useUiStore.getState().setAnimPlay({
              ...(useUiStore.getState().animPlay || {}),
              [step.elId]: {
                hidden: false,
                live: true,
                swing: true,
                dur: anim.dur || anim.duration || 1200,
                swingCount: anim.swingCount != null ? anim.swingCount : 1,
                swingOx: anim.swingOx,
                swingOy: anim.swingOy,
              },
            });
            const wait = swingWaitMs(anim);
            if (wait > maxWait) maxWait = wait;
          } else if (isInkDrawAnim(step.name)) {
            const result = fireInkDrawAnim(dom, el, anim);
            if (result.waitMs > maxWait) maxWait = result.waitMs;
          } else if (isParticlesAnim(step.name)) {
            const result = fireParticlesAnim(dom, el, anim, {
              onDone: () => {
                if (!running) return;
                const cur = useUiStore.getState().animPlay || {};
                useUiStore.getState().setAnimPlay({
                  ...cur,
                  [step.elId]: {
                    ...(cur[step.elId] || {}),
                    hidden: true,
                    particles: false,
                    live: false,
                  },
                });
              },
            });
            if (result.waitMs > maxWait) maxWait = result.waitMs;
          } else if (isCosmosTitleAnim(step.name)) {
            const members = slideGroupMembers(el, slide);
            const hideAll = {};
            members.forEach((m) => {
              hideAll[m.id] = { hidden: true, live: false };
            });
            useUiStore.getState().setAnimPlay({
              ...(useUiStore.getState().animPlay || {}),
              ...hideAll,
            });
            const result = fireCosmosTitleForEl(el, slide, anim, {
              hideAfter: true,
              onHide: (ids) => {
                if (!running) return;
                const cur = useUiStore.getState().animPlay || {};
                const next = { ...cur };
                (ids || []).forEach((id) => {
                  next[id] = { ...(next[id] || {}), hidden: true };
                });
                useUiStore.getState().setAnimPlay(next);
              },
            });
            if (result.waitMs > maxWait) maxWait = result.waitMs;
          } else if (isCaptionSlideAnim(step.name)) {
            const result = fireCaptionSlideAnim(dom, anim, {
              hideAfter: true,
              onHide: () => {
                if (!running) return;
                const cur = useUiStore.getState().animPlay || {};
                useUiStore.getState().setAnimPlay({
                  ...cur,
                  [step.elId]: { ...(cur[step.elId] || {}), hidden: true },
                });
              },
            });
            if (result.waitMs > maxWait) maxWait = result.waitMs;
          } else if (isSplitHalfAnim(step.name)) {
            const result = fireSplitHalfAnim(dom, anim, {
              hideAfter: true,
              onHide: () => {
                if (!running) return;
                const cur = useUiStore.getState().animPlay || {};
                useUiStore.getState().setAnimPlay({
                  ...cur,
                  [step.elId]: { ...(cur[step.elId] || {}), hidden: true },
                });
              },
            });
            if (result.waitMs > maxWait) maxWait = result.waitMs;
          } else if (isLangFadeAnim(step.name)) {
            const result = fireLangFadeAnim(dom, el, anim);
            if (result.waitMs > maxWait) maxWait = result.waitMs;
          } else if (isTypewriterAnim(step.name)) {
            const result = fireTypewriterAnim(dom, el, anim);
            if (result.waitMs > maxWait) maxWait = result.waitMs;
          } else if (isTransformAnim(step.name)) {
            const from = anim.from || snapshotTransformProps(el);
            const to = anim.to || from;
            const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
            const result = fireTransformAnim(dom, from, to, anim, { theme });
            if (result.waitMs > maxWait) maxWait = result.waitMs;
          } else if (isRecolorAnim(step.name)) {
            const wait = fireRecolorAnim(dom, el, anim, {
              onStart: () => {
                if (!running) return;
                const cur = useUiStore.getState().animPlay || {};
                useUiStore.getState().setAnimPlay({
                  ...cur,
                  [step.elId]: { ...(cur[step.elId] || {}), recolorPlaying: true, recolorDone: false },
                });
              },
              onDone: (info) => {
                if (!running) return;
                const cur = useUiStore.getState().animPlay || {};
                useUiStore.getState().setAnimPlay({
                  ...cur,
                  [step.elId]: {
                    ...(cur[step.elId] || {}),
                    recolorPlaying: false,
                    recolorDone: !!info?.toColor,
                  },
                });
              },
            });
            if (wait > maxWait) maxWait = wait;
          } else if (isUncropAnim(step.name)) {
            const revealing = !prevEl.uncropDone;
            const apply = () => {
              if (!running) return;
              const cur = useUiStore.getState().animPlay || {};
              useUiStore.getState().setAnimPlay({
                ...cur,
                [step.elId]: {
                  ...(cur[step.elId] || {}),
                  hidden: false,
                  uncrop: revealing,
                  uncropDone: revealing,
                  dur: anim.dur || anim.duration || 400,
                },
              });
            };
            if (step.delay > 0) schedule(apply, step.delay);
            else apply();
            const waitU = (step.delay || 0) + (anim.dur || anim.duration || 400);
            if (waitU > maxWait) maxWait = waitU;
          } else {
            const elId = step.elId;
            const curPlay = useUiStore.getState().animPlay || {};
            useUiStore.getState().setAnimPlay({
              ...curPlay,
              [elId]: {
                ...(curPlay[elId] || {}),
                hidden: false,
                motionTx: prev.tx,
                motionTy: prev.ty,
                motionPlaying: true,
                cls: undefined,
              },
            });
            if (dom) {
              dom.style.left = `${el.x || 0}px`;
              dom.style.top = `${el.y || 0}px`;
              const xf = [
                prev.tx || prev.ty ? `translate(${prev.tx}px, ${prev.ty}px)` : '',
                elBoxTransform(el) || '',
              ]
                .filter(Boolean)
                .join(' ');
              dom.style.transform = xf;
            }
            const result = fireMotionAnim(dom, el, anim, prev.tx, prev.ty, (fin) => {
              if (!running) return;
              cum[elId] = { tx: fin.endTx, ty: fin.endTy };
              if (dom) {
                dom.style.left = `${(el.x || 0) + fin.endTx}px`;
                dom.style.top = `${(el.y || 0) + fin.endTy}px`;
                dom.style.transform = elBoxTransform(el) || '';
                dom.style.transition = '';
              }
              const play = useUiStore.getState().animPlay || {};
              const prior = play[elId] || {};
              useUiStore.getState().setAnimPlay({
                ...play,
                [elId]: {
                  ...prior,
                  // Keep hidden if particles already started in the same bundle.
                  hidden: !!prior.particles || !!prior.hidden,
                  motionTx: fin.endTx,
                  motionTy: fin.endTy,
                  motionPlaying: false,
                },
              });
            });
            cum[elId] = { tx: result.endTx, ty: result.endTy };
            if (result.waitMs > maxWait) maxWait = result.waitMs;
          }
        }
        return;
      }

      const live =
        isLiveAnim(step.name) || (isPulseFamilyAnim(step.name) && pulseIsInfinite(step));
      const wait = live
        ? 0
        : isPulseFamilyAnim(step.name)
          ? pulseWaitMs(step)
          : (step.delay || 0) + (step.dur || 600);
      if (wait > maxWait) maxWait = wait;
      const owner =
        (slide.els || []).find((e) => e && String(e.id) === String(step.elId)) || { id: step.elId };
      const targets = animPlayTargets(owner, slide, step.name);
      const apply = () => {
        if (!running) return;
        const curPlay = { ...(useUiStore.getState().animPlay || {}) };
        targets.forEach((m) => {
          if (!m?.id) return;
          const prior = curPlay[m.id] || {};
          curPlay[m.id] = {
            ...prior,
            hidden: false,
            cls: animCssClass(step.name),
            dur: step.dur || 600,
            live,
            motionTx: prior.motionTx,
            motionTy: prior.motionTy,
            motionPlaying: false,
            swingCount: isPulseFamilyAnim(step.name)
              ? step.swingCount != null
                ? step.swingCount
                : 1
              : undefined,
          };
        });
        useUiStore.getState().setAnimPlay(curPlay);
        if (!live) {
          const clearAfter = isPulseFamilyAnim(step.name)
            ? (step.dur || 600) * (pulseLoopCount(step) === Infinity ? 1 : pulseLoopCount(step))
            : step.dur || 600;
          const ids = targets.map((m) => m.id).filter((id) => id != null);
          schedule(() => {
            if (!running) return;
            const cur = { ...(useUiStore.getState().animPlay || {}) };
            ids.forEach((id) => {
              const prevSt = cur[id] || {};
              cur[id] = { ...prevSt, cls: undefined, swingCount: undefined };
            });
            useUiStore.getState().setAnimPlay(cur);
          }, clearAfter);
        }
      };
      if (step.delay > 0) schedule(apply, step.delay);
      else apply();
    });
    return Math.max(80, maxWait + 40);
  }

  function next() {
    if (!running) return;
    if (i >= steps.length) {
      schedule(() => {
        running = false;
        useUiStore.getState().setSlideAnimPlaying(false);
        useUiStore.getState().setAnimPlay(null);
        const stage = document.querySelector('.react-slide-stage');
        resetCamera(stage);
        cancelSubtreeAnimations(stage);
        clearMotionTransforms(stage);
        clearRecolorTransforms(stage);
        clearSplitHalf(stage);
        clearCosmosTitle(stage);
        clearParticles(stage);
        clearInkDraw(stage);
        clearFloat(stage);
        clearDance(stage);
        clearSwing(stage);
        restoreElBoxTransforms(stage);
        useUiStore.getState().showToast(
          useUiStore.getState().lang === 'en' ? 'Anims done' : 'Анимации готовы',
          'ok'
        );
      }, 200);
      return;
    }
    const bundle = steps[i++];
    const wait = playBundle(bundle);
    schedule(next, wait);
  }

  schedule(next, 120);
  return true;
}
