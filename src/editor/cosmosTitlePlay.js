/**
 * cosmosTitle («Титр в космос»): clone(s) scroll away into perspective vanish.
 * From js/10c-anim-engine.js _fireCosmosTitleAnimGroup.
 */

let activeRun = null;

export function isCosmosTitleAnim(name) {
  return name === 'cosmosTitle';
}

export function cosmosTitleWaitMs(anim) {
  if (!anim) return 0;
  const delay = Math.max(0, +(anim.delay || 0));
  const dur = Math.max(200, +(anim.dur ?? anim.duration ?? 4000) || 4000);
  return delay + dur;
}

function tearDown(run) {
  if (!run) return;
  run.cancelled = true;
  if (run.anim && typeof run.anim.cancel === 'function') {
    try {
      run.anim.cancel();
    } catch (e) {
      /* ignore */
    }
  }
  (run.items || []).forEach((it) => {
    const el = it?.el;
    if (!el) return;
    if (el._cosmosTitleRun === run) delete el._cosmosTitleRun;
    // Always clear imperative hide — React animPlay owns visibility during show/play.
    // Never restore to 'hidden' (that trapped objects after hover preview).
    if (it.base) {
      el.style.visibility = it.base.visibility;
      el.style.pointerEvents = it.base.pointerEvents;
      if (it.base.opacity != null) el.style.opacity = it.base.opacity;
    } else {
      el.style.visibility = '';
      el.style.pointerEvents = '';
    }
  });
  if (run.stage?.parentNode) run.stage.remove();
  if (activeRun === run) activeRun = null;
}

export function clearCosmosTitle(root) {
  if (activeRun) tearDown(activeRun);
  if (!root) return;
  root.querySelectorAll('._cosmos_stage').forEach((n) => n.remove());
}

/**
 * @param {Array<{el: HTMLElement, x?: number, y?: number, w?: number, h?: number}>} entries
 * @param {object} anim
 * @param {object} [opts]
 * @returns {{ waitMs: number, cancel: Function }}
 */
export function fireCosmosTitleAnimGroup(entries, anim, opts = {}) {
  if (!entries?.length || !anim) return { waitMs: 0, cancel: () => {} };
  const delay = Math.max(0, +(anim.delay || 0));
  const dur = Math.max(200, +(anim.dur ?? anim.duration ?? 4000) || 4000);
  const hideAfter = opts.hideAfter !== false;
  const host = entries[0]?.el?.parentElement;
  if (!host) return { waitMs: 0, cancel: () => {} };

  const slideH = host.offsetHeight || parseFloat(host.style.height) || 540;

  const items = entries
    .map((e) => {
      if (!e?.el) return null;
      return {
        el: e.el,
        x: e.x != null ? e.x : parseFloat(e.el.style.left) || 0,
        y: e.y != null ? e.y : parseFloat(e.el.style.top) || 0,
        w: e.w != null ? e.w : parseFloat(e.el.style.width) || e.el.offsetWidth || 200,
        h: e.h != null ? e.h : parseFloat(e.el.style.height) || e.el.offsetHeight || 200,
      };
    })
    .filter(Boolean);
  if (!items.length) return { waitMs: 0, cancel: () => {} };

  let minY = Infinity;
  let maxY = -Infinity;
  items.forEach((it) => {
    minY = Math.min(minY, it.y);
    maxY = Math.max(maxY, it.y + it.h);
  });
  const groupH = Math.max(1, maxY - minY);
  const yShift = slideH * 0.98 - minY;

  if (activeRun) tearDown(activeRun);

  const run = { cancelled: false, items, stage: null, anim: null };
  activeRun = run;

  items.forEach((it) => {
    // Save pre-hide styles. If already hidden by React animPlay, restore to '' so
    // cancel/preview tearDown does not leave the object invisible.
    const prevVis = it.el.style.visibility;
    const prevPe = it.el.style.pointerEvents;
    const prevOp = it.el.style.opacity;
    it.base = {
      visibility: prevVis === 'hidden' ? '' : prevVis || '',
      pointerEvents: prevPe === 'none' ? '' : prevPe || '',
      opacity: prevOp === '0' ? '' : prevOp || '',
    };
    it.el._cosmosTitleRun = run;
    it.el.style.visibility = 'hidden';
    it.el.style.pointerEvents = 'none';
  });

  let timer = 0;
  const cancel = () => {
    if (timer) clearTimeout(timer);
    tearDown(run);
  };

  timer = setTimeout(() => {
    if (run.cancelled) return;

    const stage = document.createElement('div');
    stage.className = '_cosmos_stage';
    const persp = Math.round(slideH * 0.72);
    const gonePct = 15;
    const vanishPct = 30;
    const fadeMask = `linear-gradient(to bottom, transparent 0%, transparent ${gonePct}%, #000 ${vanishPct}%, #000 100%)`;
    stage.style.cssText =
      'position:absolute;inset:0;z-index:40;pointer-events:none;overflow:hidden;' +
      `perspective:${persp}px;perspective-origin:50% 22%;` +
      `-webkit-mask-image:${fadeMask};mask-image:${fadeMask};` +
      '-webkit-mask-size:100% 100%;mask-size:100% 100%;';

    const tilt = document.createElement('div');
    tilt.className = '_cosmos_tilt';
    tilt.style.cssText =
      'position:absolute;left:0;top:0;width:100%;height:100%;' +
      'transform-style:preserve-3d;transform-origin:50% 100%;' +
      'transform:rotateX(58deg);';

    const mover = document.createElement('div');
    mover.className = '_cosmos_mover';
    mover.style.cssText =
      'position:absolute;left:0;top:0;width:100%;height:100%;transform-style:preserve-3d;will-change:transform;';

    items.forEach((it) => {
      it.el.style.visibility = 'hidden';
      it.el.style.pointerEvents = 'none';
      const clone = it.el.cloneNode(true);
      clone.classList.remove('sel', 'msel', 'picked', 'is-selected');
      clone.style.position = 'absolute';
      clone.style.left = `${it.x}px`;
      clone.style.top = `${it.y + yShift}px`;
      clone.style.width = `${it.w}px`;
      clone.style.height = `${it.h}px`;
      // Source may be opacity:0 / visibility:hidden via animPlay.hidden — force clone visible
      clone.style.visibility = 'visible';
      clone.style.opacity = '1';
      clone.style.pointerEvents = 'none';
      clone.style.margin = '0';
      clone.style.outline = 'none';
      clone.removeAttribute('data-id');
      mover.appendChild(clone);
    });

    tilt.appendChild(mover);
    stage.appendChild(tilt);
    host.appendChild(stage);
    run.stage = stage;

    const travel = slideH * 1.72 + groupH;
    try {
      const wa = mover.animate(
        [{ transform: 'translateY(0px)' }, { transform: `translateY(${-travel}px)` }],
        { duration: dur, easing: 'linear', fill: 'forwards' }
      );
      run.anim = wa;
      const finish = () => {
        if (run.cancelled) return;
        if (hideAfter) {
          run.cancelled = true;
          if (run.stage?.parentNode) run.stage.remove();
          run.stage = null;
          items.forEach((it) => {
            it.el.style.visibility = 'hidden';
            it.el.style.pointerEvents = 'none';
            if (it.el._cosmosTitleRun === run) delete it.el._cosmosTitleRun;
          });
          if (typeof opts.onHide === 'function') opts.onHide();
          if (activeRun === run) activeRun = null;
        } else {
          tearDown(run);
        }
      };
      wa.finished.then(finish).catch(() => {
        if (!hideAfter) tearDown(run);
      });
    } catch (e) {
      items.forEach((it) => {
        it.el.style.visibility = 'hidden';
      });
      if (typeof opts.onHide === 'function') opts.onHide();
      tearDown(run);
    }
  }, delay);

  return { waitMs: cosmosTitleWaitMs(anim), cancel };
}

/** Single-element helper. */
export function fireCosmosTitleAnim(domEl, elData, anim, opts = {}) {
  if (!domEl || !anim) return { waitMs: 0, cancel: () => {} };
  return fireCosmosTitleAnimGroup(
    [
      {
        el: domEl,
        x: elData?.x,
        y: elData?.y,
        w: elData?.w,
        h: elData?.h,
      },
    ],
    anim,
    opts
  );
}
