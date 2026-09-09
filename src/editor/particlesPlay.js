/**
 * particles («Частицы»): spawn clones of the element that drift and fade.
 * From js/10c-anim-engine.js _fireParticlesAnim (simplified clone visual for React).
 */

export const PARTICLES_DEFAULTS = {
  particleCount: 14,
  ptDir: 0,
  ptLife: 900,
  ptSizeRand: 51,
  ptRot: 32,
  ptSpread: 100,
  duration: 3550,
  swingCount: 1,
};

export function isParticlesAnim(name) {
  return name === 'particles';
}

export function particlesIsInfinite(anim) {
  if (!anim) return false;
  const c = anim.swingCount != null ? anim.swingCount : 1;
  return !isFinite(+c) || +c >= 10;
}

export function particlesCycleSpan(anim) {
  const d = PARTICLES_DEFAULTS;
  const spawn = Math.max(400, +(anim?.dur ?? anim?.duration ?? d.duration) || d.duration);
  const life = Math.max(400, +(anim?.ptLife != null ? anim.ptLife : d.ptLife) || d.ptLife);
  return spawn + life * 1.5;
}

export function particlesWaitMs(anim) {
  if (!anim) return 0;
  const delay = Math.max(0, +(anim.delay || 0));
  if (particlesIsInfinite(anim)) return delay; // live — don't block timeline
  const loops = Math.max(1, +(anim.swingCount != null ? anim.swingCount : 1) || 1);
  return delay + particlesCycleSpan(anim) * loops;
}

function isChrome(ch) {
  if (!ch || !ch.classList) return true;
  return (
    ch.classList.contains('link-bar') ||
    ch.classList.contains('trigger-badge') ||
    ch.classList.contains('_particles_layer') ||
    ch.classList.contains('_split_wrap') ||
    ch.classList.contains('_cosmos_stage') ||
    ch.classList.contains('rh') ||
    ch.classList.contains('react-el-sel') ||
    ch.classList.contains('react-resize')
  );
}

function elRotDeg(el, elData) {
  if (elData?.rot != null && !isNaN(+elData.rot)) return +elData.rot;
  if (el?.dataset?.rot != null && el.dataset.rot !== '') return +el.dataset.rot || 0;
  if (el?.style?.transform) {
    const m = el.style.transform.match(/rotate\(([-\d.]+)deg\)/);
    if (m) return +m[1] || 0;
  }
  try {
    const t = el && getComputedStyle(el).transform;
    if (t && t !== 'none') {
      const m = new DOMMatrix(t);
      return (Math.atan2(m.b, m.a) * 180) / Math.PI;
    }
  } catch (e) {
    /* ignore */
  }
  return 0;
}

function worldDir(ptDir, rot) {
  return (((+rot + +ptDir - 90) % 360) + 360) % 360;
}

function cloneVisual(el, elData, ew, eh, visScale) {
  const scale = visScale == null ? 1 : visScale;
  const type = elData?.type || el.dataset?.type || '';
  const root = document.createElement('div');
  root.className = '_particle_vis_root';
  root.style.cssText = `position:absolute;left:0;top:0;width:${ew}px;height:${eh}px;overflow:visible;pointer-events:none;box-sizing:border-box;`;
  const wrap = document.createElement('div');
  wrap.className = '_particle_vis';
  wrap.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;box-sizing:border-box;';

  const adopt = (node) => {
    if (!node) return false;
    const c = node.cloneNode(true);
    c.style.pointerEvents = 'none';
    c.style.width = `${ew}px`;
    c.style.height = `${eh}px`;
    c.style.boxSizing = 'border-box';
    wrap.appendChild(c);
    return true;
  };

  if (type === 'image') {
    const img = el.querySelector('img');
    if (img) {
      const c = img.cloneNode(true);
      c.style.cssText = `width:100%;height:100%;object-fit:${img.style.objectFit || 'contain'};pointer-events:none;display:block;`;
      wrap.appendChild(c);
    }
  } else if (type === 'shape' || type === 'icon' || type === 'formula' || type === 'svg') {
    if (!adopt(el.querySelector('svg'))) {
      Array.from(el.children).some((ch) => {
        if (isChrome(ch)) return false;
        return adopt(ch);
      });
    }
  } else {
    const shell = document.createElement('div');
    shell.style.cssText = `position:absolute;inset:0;width:${ew}px;height:${eh}px;overflow:hidden;box-sizing:border-box;pointer-events:none;`;
    let cloned = false;
    Array.from(el.children).forEach((ch) => {
      if (isChrome(ch)) return;
      const c = ch.cloneNode(true);
      c.style.pointerEvents = 'none';
      shell.appendChild(c);
      cloned = true;
    });
    if (!cloned) {
      const src =
        el.querySelector('[contenteditable]') ||
        el.querySelector('.react-shape-text') ||
        el.querySelector('.tel');
      if (src) {
        const c = src.cloneNode(true);
        c.style.pointerEvents = 'none';
        shell.appendChild(c);
      }
    }
    wrap.appendChild(shell);
  }

  root.appendChild(wrap);
  if (scale !== 1) {
    root.style.transformOrigin = '0 0';
    root.style.transform = `scale(${scale})`;
  }
  root.style.pointerEvents = 'none';
  return root;
}

function hideOriginal(el) {
  if (!el || el._particlesOrigVis != null) return;
  el._particlesOrigVis = el.style.visibility;
  el._particlesOrigPE = el.style.pointerEvents;
  el.style.visibility = 'hidden';
  el.style.pointerEvents = 'none';
}

function showOriginal(el) {
  if (!el) return;
  if (el._particlesOrigVis != null) {
    el.style.visibility = el._particlesOrigVis;
    el._particlesOrigVis = null;
  } else el.style.visibility = '';
  if (el._particlesOrigPE != null) {
    el.style.pointerEvents = el._particlesOrigPE;
    el._particlesOrigPE = null;
  } else el.style.pointerEvents = '';
}

export function resetParticles(el) {
  if (!el) return;
  if (el._particlesRun) {
    el._particlesRun.cancelled = true;
    el._particlesRun = null;
  }
  if (el._particlesTimers) {
    el._particlesTimers.forEach((t) => clearTimeout(t));
    el._particlesTimers = [];
  }
  if (el._particlesRaf) {
    cancelAnimationFrame(el._particlesRaf);
    el._particlesRaf = null;
  }
  const layer = el._particlesLayer;
  if (layer?.parentNode) layer.parentNode.removeChild(layer);
  el._particlesLayer = null;
  showOriginal(el);
  el.classList.remove('has-particles');
}

export function clearParticles(root) {
  if (!root) return;
  // First, try to find elements with has-particles class
  root.querySelectorAll('.react-el.has-particles, .el.has-particles').forEach((el) => resetParticles(el));
  // Also clean up any orphaned particles layers
  root.querySelectorAll('._particles_layer').forEach((n) => n.remove());
  // IMPORTANT: Also restore visibility for any elements that might have been hidden
  // by particles animation but lost their has-particles class due to React re-render
  root.querySelectorAll('.react-el[data-id]').forEach((el) => {
    // If element has hidden visibility but no has-particles class, restore it
    if (el.style.visibility === 'hidden' && !el.classList.contains('has-particles')) {
      el.style.visibility = '';
      el.style.pointerEvents = '';
    }
  });
}

/**
 * Fire particles. Returns { waitMs, cancel }.
 */
export function fireParticlesAnim(domEl, elData, anim, opts = {}) {
  if (!domEl || !domEl.parentElement || !anim) return { waitMs: 0, cancel: () => {} };
  resetParticles(domEl);
  const d = PARTICLES_DEFAULTS;
  const delay = Math.max(0, +(anim.delay || 0));
  const count = Math.max(1, Math.min(200, +(anim.particleCount != null ? anim.particleCount : d.particleCount) || d.particleCount));
  const ptDir = ((((anim.ptDir != null ? +anim.ptDir : d.ptDir) % 360) + 360) % 360);
  const elRot = elRotDeg(domEl, elData);
  const baseFlyDeg = worldDir(ptDir, elRot);
  const ptLife = Math.max(400, +(anim.ptLife != null ? anim.ptLife : d.ptLife) || d.ptLife);
  const ptSizeRand = Math.max(0, Math.min(100, +(anim.ptSizeRand != null ? anim.ptSizeRand : d.ptSizeRand)));
  const ptRotDev = Math.max(0, Math.min(180, +(anim.ptRot != null ? anim.ptRot : d.ptRot)));
  const ptSpread = Math.max(0, Math.min(100, +(anim.ptSpread != null ? anim.ptSpread : d.ptSpread)));
  const spawnWindow = Math.max(400, +(anim.dur ?? anim.duration ?? d.duration) || d.duration);
  const speedFactor = 6000 / spawnWindow;
  const swingCnt = anim.swingCount != null ? anim.swingCount : 1;
  const loops = particlesIsInfinite(anim) ? Infinity : Math.max(1, +swingCnt || 1);
  const cycleSpan = particlesCycleSpan(anim);
  const animStart = performance.now();
  const ew = elData?.w || parseFloat(domEl.style.width) || domEl.offsetWidth || 100;
  const eh = elData?.h || parseFloat(domEl.style.height) || domEl.offsetHeight || 100;
  const baseOpacity =
    elData?.elOpacity != null && !isNaN(+elData.elOpacity)
      ? Math.max(0, Math.min(1, +elData.elOpacity))
      : 1;
  let ptUid = 0;
  const container = domEl.parentElement;
  const run = { cancelled: false };
  domEl._particlesRun = run;
  domEl._particlesTimers = [];
  domEl.style.overflow = 'visible';
  domEl.classList.add('has-particles');

  let layer = domEl._particlesLayer;
  if (!layer) {
    layer = document.createElement('div');
    layer.className = '_particles_layer';
    domEl._particlesLayer = layer;
  }
  layer.style.cssText =
    'position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:2;';
  if (domEl.nextSibling !== layer) {
    if (domEl.nextSibling) container.insertBefore(layer, domEl.nextSibling);
    else container.appendChild(layer);
  }
  // Position layer to cover the stage relative to parent; particles use absolute left/top of parent.
  // Match legacy: layer is sibling of el, inset 0 of parent — but then sx/sy use el left/top.
  // Legacy layer is `inset:0` on the element itself as child... actually insertAfter el as sibling with inset:0 of parent.
  // Wait - legacy: layer.style inset 0, inserted as nextSibling of el in container. That means
  // layer covers entire container (parent), and particle left/top are absolute in parent coords. Good.
  layer.style.inset = '0';
  layer.style.width = '100%';
  layer.style.height = '100%';
  layer.innerHTML = '';
  hideOriginal(domEl);

  const cancel = () => resetParticles(domEl);

  function elPos() {
    return {
      x: elData?.x != null ? elData.x : parseFloat(domEl.style.left) || 0,
      y: elData?.y != null ? elData.y : parseFloat(domEl.style.top) || 0,
      w: ew,
      h: eh,
    };
  }

  function particleScale() {
    if (ptSizeRand <= 0) return 1;
    return 1 - (ptSizeRand / 100) * Math.random() * 0.99;
  }

  function msUntil(absFromStart) {
    return Math.max(0, absFromStart - (performance.now() - animStart));
  }

  function spawnOne(absFromStart) {
    const tid = setTimeout(() => {
      if (run.cancelled || !layer.parentNode) return;
      const pos = elPos();
      const life = ptLife * (0.55 + Math.random() * 0.9);
      const scale = particleScale();
      const speedMult = 0.55 + Math.random() * 0.9;
      const pw = Math.max(4, ew * scale);
      const ph = Math.max(4, eh * scale);
      const sx0 = pos.x + Math.random() * Math.max(0, pos.w - pw * 0.5);
      const sy0 = pos.y + Math.random() * Math.max(0, pos.h - ph * 0.5);
      let flyDeg = baseFlyDeg;
      if (ptRotDev > 0) flyDeg = baseFlyDeg + (Math.random() - 0.5) * 2 * ptRotDev;
      flyDeg = ((flyDeg % 360) + 360) % 360;
      const pRot = (flyDeg + 90) % 360;
      const dirRad = (flyDeg * Math.PI) / 180;
      const cosD = Math.cos(dirRad);
      const sinD = Math.sin(dirRad);
      const perpX = -sinD;
      const perpY = cosD;
      const sizeBase = Math.max(ew, eh);
      const speedPxMs = (0.038 + Math.random() * 0.024) * speedMult * speedFactor * (0.65 + sizeBase * 0.0035);
      const spreadPx = sizeBase * (ptSpread / 100) * 0.55;
      const latOff = ptSpread > 0 ? (Math.random() - 0.5) * 2 * spreadPx : 0;
      const latVel = ptSpread > 0 ? (Math.random() - 0.5) * 2 * speedPxMs * (ptSpread / 100) * 0.32 : 0;
      const sx = sx0 + perpX * latOff;
      const sy = sy0 + perpY * latOff;
      const zigAmp = sizeBase * (0.012 + Math.random() * 0.018);
      const zigFreqHz = 0.18 + Math.random() * 0.32;
      const zigPhase = Math.random() * Math.PI * 2;
      const fadeIn = Math.min(400, life * 0.12);
      const fadeOut = Math.min(650, life * 0.2);
      const uid = ptUid++;

      const p = document.createElement('div');
      p.className = '_particle';
      p.style.cssText = `position:absolute;left:${sx}px;top:${sy}px;width:${pw}px;height:${ph}px;opacity:0;pointer-events:none;overflow:visible;transform-origin:center center;transform:rotate(${pRot}deg);`;
      p.appendChild(cloneVisual(domEl, elData, ew, eh, scale));
      layer.appendChild(p);

      const t0 = performance.now();
      function tick(now) {
        if (run.cancelled) {
          if (p.parentNode) p.remove();
          return;
        }
        const elapsed = now - t0;
        if (elapsed >= life) {
          if (p.parentNode) p.remove();
          return;
        }
        const lifeT = elapsed / life;
        const drift = speedPxMs * elapsed;
        const bx = sx + cosD * drift;
        const by = sy + sinD * drift;
        const lat = latVel * elapsed;
        const zig = Math.sin(elapsed * 0.001 * zigFreqHz * Math.PI * 2 + zigPhase) * zigAmp * (1 - lifeT * 0.45);
        const x = bx + perpX * (zig + lat);
        const y = by + perpY * (zig + lat);
        let fadeOp;
        if (elapsed < fadeIn) fadeOp = elapsed / fadeIn;
        else if (elapsed > life - fadeOut) fadeOp = (life - elapsed) / fadeOut;
        else fadeOp = 1;
        let sc = 1;
        if (elapsed > life - fadeOut) {
          const tFade = 1 - Math.max(0, Math.min(1, fadeOp));
          sc = 1 + tFade * 0.5;
        }
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        p.style.transform = `rotate(${pRot}deg) scale(${sc})`;
        p.style.opacity = String(Math.max(0, Math.min(1, baseOpacity * fadeOp)));
        domEl._particlesRaf = requestAnimationFrame(tick);
      }
      void uid;
      domEl._particlesRaf = requestAnimationFrame(tick);
    }, msUntil(absFromStart));
    domEl._particlesTimers.push(tid);
  }

  function runCycle(cycleIdx) {
    if (run.cancelled) return;
    if (cycleIdx >= loops) return;
    if (cycleIdx > 0) layer.innerHTML = '';
    hideOriginal(domEl);
    const cycleStart = delay + cycleIdx * cycleSpan;
    for (let i = 0; i < count; i++) {
      const jitter = Math.random() * (spawnWindow / Math.max(1, count));
      spawnOne(cycleStart + (i / count) * spawnWindow + jitter);
    }
    if (loops === Infinity || cycleIdx + 1 < loops) {
      const nextStart = delay + (cycleIdx + 1) * cycleSpan;
      const tid = setTimeout(() => runCycle(cycleIdx + 1), msUntil(nextStart));
      domEl._particlesTimers.push(tid);
    }
  }

  runCycle(0);
  if (typeof opts.onDone === 'function' && !particlesIsInfinite(anim)) {
    const doneTid = setTimeout(() => {
      if (!run.cancelled) opts.onDone();
    }, particlesWaitMs(anim));
    domEl._particlesTimers.push(doneTid);
  }

  return { waitMs: particlesWaitMs(anim), cancel };
}
