/**
 * Slide camera (Prezi-like) — pure math + playback helper.
 * Ported from js/18b-camera.js.
 */

import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';

export const CAM_COLOR = '#ef4444';

function aspect(W, H) {
  return H / Math.max(1, W);
}

export function fullSlideCam(W = DEFAULT_CANVAS_W, H = DEFAULT_CANVAS_H) {
  return { cx: W / 2, cy: H / 2, w: W, h: H, rot: 0 };
}

export function defaultCam(W, H, scale = 0.55) {
  const w = Math.max(40, W * scale);
  const h = w * aspect(W, H);
  return {
    id: 'cam' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    cx: W / 2,
    cy: H / 2,
    w,
    h,
    rot: 0,
    duration: 1200,
    delay: 0,
    trigger: 'auto',
  };
}

export function camCorners(cam, W = DEFAULT_CANVAS_W, H = DEFAULT_CANVAS_H) {
  const cx = +cam.cx || 0;
  const cy = +cam.cy || 0;
  const w = +cam.w || W;
  const h = +cam.h || H;
  const rad = ((+cam.rot || 0) * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const hx = w / 2;
  const hy = h / 2;
  return [
    [-hx, -hy],
    [hx, -hy],
    [hx, hy],
    [-hx, hy],
  ].map(([lx, ly]) => ({
    x: cx + lx * c - ly * s,
    y: cy + lx * s + ly * c,
  }));
}

function maxWidthForRotation(rotDeg, W, H) {
  const a = aspect(W, H);
  const rad = ((+rotDeg || 0) * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return Math.max(36, Math.min(W / Math.max(1e-6, c + a * s), H / Math.max(1e-6, s + a * c)));
}

function maxWidthAt(cx, cy, rotDeg, W, H) {
  const a = aspect(W, H);
  const rad = ((+rotDeg || 0) * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const denomW = Math.max(1e-6, c + a * s);
  const denomH = Math.max(1e-6, s + a * c);
  const mx = Math.max(1e-3, Math.min(+cx, W - cx));
  const my = Math.max(1e-3, Math.min(+cy, H - cy));
  return Math.max(36, Math.min(2 * mx / denomW, 2 * my / denomH, maxWidthForRotation(rotDeg, W, H)));
}

/** Interactive clamp: keep size, nudge inside slide. */
export function nudgeCameraInside(cam, W = DEFAULT_CANVAS_W, H = DEFAULT_CANVAS_H) {
  const out = { ...cam };
  const a = aspect(W, H);
  out.rot = (((+out.rot || 0) % 360) + 360) % 360;
  if (out.rot > 180) out.rot -= 360;
  out.cx = +out.cx || W / 2;
  out.cy = +out.cy || H / 2;
  const absMax = maxWidthForRotation(out.rot, W, H);
  if (!(+out.w > 0)) out.w = W * 0.5;
  if (out.w > absMax) out.w = absMax;
  out.w = Math.max(36, out.w);
  out.h = out.w * a;

  for (let pass = 0; pass < 3; pass++) {
    const pts = camCorners(out, W, H);
    let dx = 0;
    let dy = 0;
    pts.forEach((p) => {
      if (p.x + dx < 0) dx = Math.max(dx, -p.x);
      if (p.y + dy < 0) dy = Math.max(dy, -p.y);
      if (p.x + dx > W) dx = Math.min(dx, W - p.x);
      if (p.y + dy > H) dy = Math.min(dy, H - p.y);
    });
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) break;
    out.cx += dx;
    out.cy += dy;
  }
  out.cx = Math.round(out.cx * 10) / 10;
  out.cy = Math.round(out.cy * 10) / 10;
  out.w = Math.round(out.w * 10) / 10;
  out.h = Math.round(out.w * a * 10) / 10;
  out.rot = Math.round((+out.rot || 0) * 10) / 10;
  return out;
}

/** Playback clamp: may shrink. */
export function clampCamera(cam, W = DEFAULT_CANVAS_W, H = DEFAULT_CANVAS_H) {
  const out = { ...cam };
  const a = aspect(W, H);
  out.rot = (((+out.rot || 0) % 360) + 360) % 360;
  if (out.rot > 180) out.rot -= 360;
  out.cx = +out.cx || W / 2;
  out.cy = +out.cy || H / 2;
  if (isFullSlideCam(out, W, H)) {
    return fullSlideCam(W, H);
  }
  out.w = Math.max(36, Math.min(+out.w || W * 0.5, maxWidthAt(out.cx, out.cy, out.rot, W, H)));
  out.h = out.w * a;

  const pts = camCorners(out, W, H);
  let dx = 0;
  let dy = 0;
  pts.forEach((p) => {
    if (p.x + dx < 0) dx = Math.max(dx, -p.x);
    if (p.y + dy < 0) dy = Math.max(dy, -p.y);
    if (p.x + dx > W) dx = Math.min(dx, W - p.x);
    if (p.y + dy > H) dy = Math.min(dy, H - p.y);
  });
  out.cx += dx;
  out.cy += dy;
  out.w = Math.max(36, Math.min(out.w, maxWidthAt(out.cx, out.cy, out.rot, W, H)));
  out.h = out.w * a;
  out.cx = Math.round(out.cx * 10) / 10;
  out.cy = Math.round(out.cy * 10) / 10;
  out.w = Math.round(out.w * 10) / 10;
  out.h = Math.round(out.w * a * 10) / 10;
  out.rot = Math.round((+out.rot || 0) * 10) / 10;
  return out;
}

export function isFullSlideCam(state, W = DEFAULT_CANVAS_W, H = DEFAULT_CANVAS_H) {
  if (!state) return true;
  return (
    Math.abs(+state.rot || 0) < 0.05 &&
    Math.abs((+state.w || W) - W) < 0.75 &&
    Math.abs((+state.cx || W / 2) - W / 2) < 1 &&
    Math.abs((+state.cy || H / 2) - H / 2) < 1
  );
}

export function camAlongPath(from, to, e, W = DEFAULT_CANVAS_W, H = DEFAULT_CANVAS_H) {
  const a = aspect(W, H);
  const lerp = (x, y, p) => x + (y - x) * p;
  let dRot = (+to.rot || 0) - (+from.rot || 0);
  while (dRot > 180) dRot -= 360;
  while (dRot < -180) dRot += 360;
  const rot = (+from.rot || 0) + dRot * e;
  const cx = lerp(+from.cx || W / 2, +to.cx || W / 2, e);
  const cy = lerp(+from.cy || H / 2, +to.cy || H / 2, e);
  const w0 = Math.max(36, +from.w || W);
  const w1 = Math.max(36, +to.w || W);
  let w = Math.exp(lerp(Math.log(w0), Math.log(w1), e));
  w = Math.min(w, maxWidthAt(cx, cy, rot, W, H));
  return clampCamera({ cx, cy, w, h: w * a, rot }, W, H);
}

/** CSS transform: fitSc * map camera → full slide. */
export function cameraCssTransform(cam, fitSc, W = DEFAULT_CANVAS_W, H = DEFAULT_CANVAS_H) {
  const state = cam || fullSlideCam(W, H);
  const fit = fitSc != null && fitSc > 0 ? fitSc : 1;
  if (isFullSlideCam(state, W, H)) return `scale(${fit})`;
  const s = W / Math.max(1e-6, +state.w || W);
  const rot = -(+state.rot || 0);
  const cx = +state.cx || W / 2;
  const cy = +state.cy || H / 2;
  return `scale(${fit}) translate(${W / 2}px,${H / 2}px) rotate(${rot}deg) scale(${s}) translate(${-cx}px,${-cy}px)`;
}

/**
 * Animate DOM element transform from → to camera.
 * @returns {{ abort: () => void }}
 */
export function fireCameraAnim(el, cam, opts = {}) {
  if (!el || !cam) return { abort() {} };
  if (el._camCtl) el._camCtl.aborted = true;

  const W = opts.W || DEFAULT_CANVAS_W;
  const H = opts.H || DEFAULT_CANVAS_H;
  const fromRaw = opts.from || el._pvCamState || fullSlideCam(W, H);
  let from = {
    cx: +fromRaw.cx,
    cy: +fromRaw.cy,
    w: +fromRaw.w || W,
    h: +fromRaw.h || H,
    rot: +fromRaw.rot || 0,
  };
  if (isFullSlideCam(from, W, H)) from = fullSlideCam(W, H);
  else from = clampCamera(from, W, H);

  let to = {
    cx: +cam.cx,
    cy: +cam.cy,
    w: +cam.w || W,
    h: +cam.h || H,
    rot: +cam.rot || 0,
  };
  if (isFullSlideCam(to, W, H)) to = fullSlideCam(W, H);
  else to = clampCamera(to, W, H);

  const dur = Math.max(200, +(cam.duration || opts.duration || 1200) || 1200);
  const delay = opts.delay != null ? +opts.delay : 0;
  const fit = opts.fitScale != null && opts.fitScale > 0 ? opts.fitScale : 1;
  const ctl = { aborted: false, rafs: [], timers: [] };
  el._camCtl = ctl;

  const apply = (state) => {
    el._pvCamState = { cx: state.cx, cy: state.cy, w: state.w, h: state.h, rot: state.rot };
    el.style.overflow = 'hidden';
    el.style.transformOrigin = 'top left';
    el.style.transform = cameraCssTransform(el._pvCamState, fit, W, H);
  };

  const run = () => {
    if (ctl.aborted) return;
    apply(from);
    const t0 = performance.now();
    const ease = (t) => t * t * (3 - 2 * t);
    const step = (now) => {
      if (ctl.aborted) return;
      const p = Math.min(1, (now - t0) / dur);
      apply(camAlongPath(from, to, ease(p), W, H));
      if (p < 1) {
        const id = requestAnimationFrame(step);
        ctl.rafs.push(id);
      } else {
        apply(to);
        opts.onDone?.();
      }
    };
    ctl.rafs.push(requestAnimationFrame(step));
  };

  if (delay > 0) ctl.timers.push(setTimeout(run, delay));
  else run();

  return {
    /** @param {{ finish?: boolean }} [opts] finish=true snaps to end (does not call onDone) */
    abort(optsAbort = {}) {
      ctl.aborted = true;
      ctl.rafs.forEach((id) => cancelAnimationFrame(id));
      ctl.timers.forEach((t) => clearTimeout(t));
      if (optsAbort.finish) apply(to);
    },
  };
}

export function collectCameraSteps(slide) {
  return (slide?.cameras || []).map((cam) => ({
    kind: 'camera',
    cam,
    dur: cam.duration != null ? +cam.duration : 1200,
    delay: cam.delay != null ? +cam.delay : 0,
  }));
}
