/**
 * Pulse / shake / flash emphasis loops (≥10 = infinite).
 * CSS keyframes; iteration count driven by swingCount.
 */

const PULSE_KF = {
  pulse: 'elPulse',
  shake: 'elShake',
  flash: 'elFlash',
};

const PULSE_CLS = {
  pulse: 'el-anim-pulse',
  shake: 'el-anim-shake',
  flash: 'el-anim-flash',
};

export function isPulseFamilyAnim(name) {
  return name === 'pulse' || name === 'shake' || name === 'flash';
}

export function pulseKeyframesName(name) {
  return PULSE_KF[name] || 'elPulse';
}

export function pulseCssClass(name) {
  return PULSE_CLS[name] || 'el-anim-pulse';
}

export function pulseIsInfinite(anim) {
  const c = anim?.swingCount != null ? +anim.swingCount : 1;
  return !Number.isFinite(c) || c >= 10;
}

export function pulseLoopCount(anim) {
  if (pulseIsInfinite(anim)) return Infinity;
  return Math.max(1, +(anim?.swingCount != null ? anim.swingCount : 1) || 1);
}

export function pulseCssIteration(anim) {
  const n = pulseLoopCount(anim);
  return n === Infinity ? 'infinite' : String(n);
}

export function pulseWaitMs(anim) {
  if (pulseIsInfinite(anim)) return 0;
  const dur = Math.max(50, +(anim?.dur ?? anim?.duration ?? 600) || 600);
  const delay = Math.max(0, +(anim?.delay || 0));
  const loops = pulseLoopCount(anim);
  return delay + dur * (loops === Infinity ? 1 : loops);
}

/** Apply CSS emphasis loops on a playback DOM node. */
export function applyPulseCss(el, step) {
  if (!el || !step) return;
  const name = step.name || 'pulse';
  const dur = Math.max(50, +(step.dur || 600) || 600);
  const kf = pulseKeyframesName(name);
  const iter = pulseCssIteration(step);
  el.classList.remove('el-wait');
  el.style.visibility = 'visible';
  el.style.opacity = '';
  el.className = `${(el.className || '').replace(/\bel-anim-\S+/g, '').trim()} ${pulseCssClass(name)}`.trim();
  el.style.animation = `${kf} ${dur}ms ease ${iter}`;
  if (pulseIsInfinite(step)) el.style.overflow = 'visible';
}
