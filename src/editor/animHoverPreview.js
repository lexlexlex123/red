/**
 * Hover preview of a single animation on the selected element (editor canvas).
 * Mirrors legacy playAnimOnEl for CSS / motion / live anims.
 */
import { usePresentationStore } from '../stores/presentationStore.js';
import { useSelectionStore } from '../stores/selectionStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { animCssClass, animDuration, isEntranceAnim, isLiveAnim } from './anims.js';
import { clearMotionTransforms, fireMotionAnim, isMotionAnim } from './motionPlay.js';
import { clearRecolorTransforms, fireRecolorAnim, isRecolorAnim, prepareRecolorEl } from './recolorPlay.js';
import { fireSplitHalfAnim, isSplitHalfAnim, clearSplitHalf } from './splitHalfPlay.js';
import { fireParticlesAnim, isParticlesAnim, clearParticles } from './particlesPlay.js';
import { fireInkDrawAnim, isInkDrawAnim, clearInkDraw } from './inkDrawPlay.js';
import { fireCosmosTitleAnimGroup, isCosmosTitleAnim, clearCosmosTitle } from './cosmosTitlePlay.js';
import { fireCaptionSlideAnim, isCaptionSlideAnim } from './captionSlidePlay.js';
import { clearFloat } from './floatPlay.js';
import { clearDance } from './dancePlay.js';
import { clearSwing } from './swingPlay.js';
import { isPulseFamilyAnim } from './pulsePlay.js';
import { elBoxTransform } from './elTransform.js';
import { isElSpecificAnim } from './animOrder.js';

let hoverTimer = null;
let hoverElId = null;

function stageRoot() {
  return document.querySelector('.react-slide-stage');
}

function domFor(elId) {
  return document.querySelector(`.react-slide-stage .react-el[data-id="${elId}"]`);
}

function restoreTransforms(root) {
  if (!root) return;
  const st = usePresentationStore.getState();
  const els = st.slides[st.cur]?.els || [];
  const byId = new Map(els.filter(Boolean).map((e) => [String(e.id), e]));
  root.querySelectorAll('.react-el[data-id]').forEach((node) => {
    const el = byId.get(String(node.getAttribute('data-id')));
    if (!el || el._isDecor) return;
    node.style.transform = elBoxTransform(el) || '';
  });
}

export function clearAnimHoverPreview() {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  const id = hoverElId;
  hoverElId = null;
  const stage = stageRoot();
  if (id) {
    const play = { ...(useUiStore.getState().animPlay || {}) };
    delete play[id];
    useUiStore.getState().setAnimPlay(Object.keys(play).length ? play : null);
  } else if (!useUiStore.getState().slideAnimPlaying) {
    useUiStore.getState().setAnimPlay(null);
  }
  if (stage && !useUiStore.getState().slideAnimPlaying) {
    clearMotionTransforms(stage);
    clearRecolorTransforms(stage);
    clearSplitHalf(stage);
    clearParticles(stage);
    clearInkDraw(stage);
    clearCosmosTitle(stage);
    clearFloat(stage);
    clearDance(stage);
    clearSwing(stage);
    restoreTransforms(stage);
  }
}

/**
 * Preview `animName` on the currently selected element.
 * @param {string} animName
 * @param {object} [animData]
 */
export function playAnimHoverPreview(animName, animData = {}) {
  if (!animName || animName === 'camera' || animName === 'animRepeat' || animName === 'animPause') return;
  if (useUiStore.getState().slideAnimPlaying) return;

  clearAnimHoverPreview();

  const selId = useSelectionStore.getState().selId;
  const st = usePresentationStore.getState();
  const slide = st.slides[st.cur];
  const el = (slide?.els || []).find((e) => e && String(e.id) === String(selId));
  if (!el || el._isDecor) return;

  const targets = isElSpecificAnim(animName)
    ? [el]
    : el.groupId
      ? (slide.els || []).filter((e) => e && e.groupId === el.groupId)
      : [el];

  const dur = Math.max(
    200,
    animDuration({ ...animData, name: animName }, isLiveAnim(animName) || animName === 'cosmosTitle' ? 1200 : 600)
  );
  const previewDur = animName === 'cosmosTitle' ? Math.max(dur, 2500) : dur;
  hoverElId = el.id;

  const applyCss = (targetEl, name) => {
    const cls = animCssClass(name);
    const live = isLiveAnim(name) || isPulseFamilyAnim(name);
    const patch = {
      hidden: false,
      cls,
      dur,
      live,
    };
    if (name === 'float') {
      Object.assign(patch, { float: true, swingCount: 1, cls: undefined });
    } else if (name === 'dance') {
      Object.assign(patch, { dance: true, swingCount: 1, cls: undefined });
    } else if (name === 'swing') {
      Object.assign(patch, {
        swing: true,
        swingCount: 1,
        swingOx: animData.swingOx,
        swingOy: animData.swingOy,
        cls: undefined,
      });
    } else if (isPulseFamilyAnim(name)) {
      Object.assign(patch, { pulseName: name, swingCount: 1 });
    }
    if (isEntranceAnim(name)) {
      // Capture which hover "session" this is. The actual patch is applied one frame later
      // (so the hidden→visible transition animates instead of snapping); if the mouse has
      // already left and cleared the hover in the meantime, hoverElId will have moved on
      // (or been cleared to null) by the time this frame fires. Applying the patch anyway
      // would resurrect a preview with no timer left to clear it — stuck until a page
      // refresh, which is exactly what was happening here.
      const sessionElId = hoverElId;
      useUiStore.getState().setAnimPlay({
        ...(useUiStore.getState().animPlay || {}),
        [targetEl.id]: { hidden: true },
      });
      requestAnimationFrame(() => {
        if (hoverElId !== sessionElId) return;
        useUiStore.getState().setAnimPlay({
          ...(useUiStore.getState().animPlay || {}),
          [targetEl.id]: patch,
        });
      });
    } else {
      useUiStore.getState().setAnimPlay({
        ...(useUiStore.getState().animPlay || {}),
        [targetEl.id]: patch,
      });
    }
  };

  if (isCosmosTitleAnim(animName)) {
    const entries = targets
      .map((t) => {
        const dom = domFor(t.id);
        return dom ? { el: dom, x: t.x, y: t.y, w: t.w, h: t.h } : null;
      })
      .filter(Boolean);
    if (entries.length) {
      fireCosmosTitleAnimGroup(
        entries,
        { name: 'cosmosTitle', dur: previewDur, delay: 0 },
        { hideAfter: false }
      );
    }
    hoverTimer = setTimeout(() => clearAnimHoverPreview(), previewDur + 120);
    return;
  }

  targets.forEach((t) => {
    const dom = domFor(t.id);
    const a = { name: animName, dur, duration: dur, ...animData };

    if (isMotionAnim(animName)) {
      if (dom) fireMotionAnim(dom, t, a, 0, 0);
      return;
    }
    if (isRecolorAnim(animName)) {
      if (dom) {
        prepareRecolorEl(dom, t);
        fireRecolorAnim(dom, t, a);
      }
      return;
    }
    if (isSplitHalfAnim(animName)) {
      if (dom) fireSplitHalfAnim(dom, a, { hideAfter: false, unwrap: false });
      return;
    }
    if (isParticlesAnim(animName)) {
      if (dom) fireParticlesAnim(dom, t, a, { preview: true });
      return;
    }
    if (isInkDrawAnim(animName)) {
      if (dom) fireInkDrawAnim(dom, t, a, { delay: 0, preview: true });
      return;
    }
    if (isCaptionSlideAnim(animName)) {
      if (dom) fireCaptionSlideAnim(dom, a, { hideAfter: false });
      return;
    }
    applyCss(t, animName);
  });

  hoverTimer = setTimeout(() => {
    clearAnimHoverPreview();
  }, previewDur + 120);
}
