/**
 * Play entrance/emphasis/motion/recolor anims on the editor canvas (auto-advance all steps).
 */
import { usePresentationStore } from '../stores/presentationStore.js';
import { useUiStore } from '../stores/uiStore.js';
import {
  animCssClass,
  collectSlideAnimSteps,
  isEntranceAnim,
  isLiveAnim,
} from './anims.js';
import { clearMotionTransforms, fireMotionAnim, isMotionAnim } from './motionPlay.js';
import {
  clearRecolorTransforms,
  fireRecolorAnim,
  isRecolorAnim,
  prepareRecolorEl,
} from './recolorPlay.js';
import { fireTypewriterAnim, isTypewriterAnim } from './typewriterPlay.js';
import { fireLangFadeAnim, isLangFadeAnim } from './langFadePlay.js';
import { fireSplitHalfAnim, isSplitHalfAnim, clearSplitHalf } from './splitHalfPlay.js';
import { fireCaptionSlideAnim, isCaptionSlideAnim } from './captionSlidePlay.js';
import { fireCosmosTitleAnim, isCosmosTitleAnim, clearCosmosTitle } from './cosmosTitlePlay.js';
import { fireParticlesAnim, isParticlesAnim, clearParticles } from './particlesPlay.js';
import { fireInkDrawAnim, isInkDrawAnim, clearInkDraw } from './inkDrawPlay.js';
import { isFloatAnim, clearFloat, floatWaitMs } from './floatPlay.js';
import { isDanceAnim, clearDance, danceWaitMs } from './dancePlay.js';
import { isSwingAnim, clearSwing, swingWaitMs } from './swingPlay.js';
import { isPulseFamilyAnim, pulseIsInfinite, pulseWaitMs, pulseLoopCount } from './pulsePlay.js';
import { elBoxTransform } from './elTransform.js';

let timers = [];
let running = false;

export function isSlideAnimPlaying() {
  return running;
}

/** Re-apply store rotation/flip after imperative transform clears (React may skip DOM write). */
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
  const wasRunning = running;
  timers.forEach((t) => clearTimeout(t));
  timers = [];
  running = false;
  useUiStore.getState().setSlideAnimPlaying(false);
  useUiStore.getState().setAnimPlay(null);
  // pickSlide always calls stop — do not wipe CSS transforms when idle
  // (that cleared rotate() on lines; React then skipped restoring identical style).
  if (!wasRunning) return;
  const stage = document.querySelector('.react-slide-stage');
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
export function playSlideAnimPlay() {
  stopSlideAnimPlay();
  const st = usePresentationStore.getState();
  const slide = st.slides[st.cur];
  if (!slide) return false;
  const steps = collectSlideAnimSteps(slide);
  if (!steps.length) {
    useUiStore.getState().showToast(
      useUiStore.getState().lang === 'en' ? 'No animations on this slide' : 'На слайде нет анимаций',
      'warn'
    );
    return false;
  }

  running = true;
  useUiStore.getState().setSlideAnimPlaying(true);
  const init = {};
  (slide.els || []).forEach((el) => {
    if (!el || el._isDecor) return;
    if (!Array.isArray(el.anims) || !el.anims.length) return;
    const hide =
      el.anims.some((a) => a && isEntranceAnim(a.name)) ||
      el.anims.some((a) => a && (a.name === 'cosmosTitle' || a.name === 'captionSlide'));
    if (hide) init[el.id] = { hidden: true };
    if (el.anims.some((a) => a && a.name === 'cosmosTitle') && el.groupId) {
      (slide.els || []).forEach((m) => {
        if (m && m.groupId === el.groupId) init[m.id] = { hidden: true };
      });
    }
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
      if (step.name === 'pause') {
        const wait = Math.max(0, (step.delay || 0) + (step.dur || 0));
        if (wait > maxWait) maxWait = wait;
        return;
      }
      if (
        isMotionAnim(step.name) ||
        isRecolorAnim(step.name) ||
        isTypewriterAnim(step.name) ||
        isLangFadeAnim(step.name) ||
        isSplitHalfAnim(step.name) ||
        isCaptionSlideAnim(step.name) ||
        isCosmosTitleAnim(step.name) ||
        isParticlesAnim(step.name) ||
        isInkDrawAnim(step.name) ||
        isFloatAnim(step.name) ||
        isDanceAnim(step.name) ||
        isSwingAnim(step.name)
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
          useUiStore.getState().setAnimPlay({
            ...(useUiStore.getState().animPlay || {}),
            [step.elId]: { hidden: keepHidden, live: false },
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
                  [step.elId]: { ...(cur[step.elId] || {}), hidden: true },
                });
              },
            });
            if (result.waitMs > maxWait) maxWait = result.waitMs;
          } else if (isCosmosTitleAnim(step.name)) {
            const result = fireCosmosTitleAnim(dom, el, anim, {
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
          } else if (isRecolorAnim(step.name)) {
            const wait = fireRecolorAnim(dom, el, anim);
            if (wait > maxWait) maxWait = wait;
          } else {
            const result = fireMotionAnim(dom, el, anim, prev.tx, prev.ty);
            cum[step.elId] = { tx: result.endTx, ty: result.endTy };
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
      const apply = () => {
        if (!running) return;
        useUiStore.getState().setAnimPlay({
          ...(useUiStore.getState().animPlay || {}),
          [step.elId]: {
            hidden: false,
            cls: animCssClass(step.name),
            dur: step.dur || 600,
            live,
            swingCount: isPulseFamilyAnim(step.name)
              ? step.swingCount != null
                ? step.swingCount
                : 1
              : undefined,
          },
        });
        if (!live) {
          const clearAfter = isPulseFamilyAnim(step.name)
            ? (step.dur || 600) * (pulseLoopCount(step) === Infinity ? 1 : pulseLoopCount(step))
            : step.dur || 600;
          schedule(() => {
            if (!running) return;
            const cur = useUiStore.getState().animPlay || {};
            const prev = cur[step.elId] || {};
            useUiStore.getState().setAnimPlay({
              ...cur,
              [step.elId]: { ...prev, cls: undefined, swingCount: undefined },
            });
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
