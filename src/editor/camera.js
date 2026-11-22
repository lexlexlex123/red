/**
 * Slide camera (Prezi-like) — pure math + playback helper.
 * Ported from js/18b-camera.js.
 *
 * Performance / crispness notes:
 * - Do NOT set will-change:transform on the stage. That freezes a bitmap and makes
 *   SVG/shapes look rasterized when zoomed (unlike the editor canvas zoom).
 * - Do NOT drive the stage `transform` from React state during animation — React
 *   commits overwrite/clear the inline transform and cause white flashes + jank.
 *   Always write transform on the DOM node (see applyCameraTransform).
 * - Match editor max zoom (~20×): clampCamera enforces a floor on cam.w.
 */

import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';

export const CAM_COLOR = '#ef4444';

/** Same ceiling as editor canvasZoom (uiStore / canvasViewport). */
export const CAM_MAX_ZOOM = 20;

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

function playbackMinWidth(W) {
  // Cap zoom at CAM_MAX_ZOOM (same as editor). Tiny authored cameras still work
  // visually but won't ask Chrome for a 50× re-raster of the whole stage.
  return Math.max(36, W / CAM_MAX_ZOOM);
}

/** Playback clamp: may shrink; enforces max zoom for stable crisp paint. */
export function clampCamera(cam, W = DEFAULT_CANVAS_W, H = DEFAULT_CANVAS_H) {
  const out = { ...cam };
  const a = aspect(W, H);
  const minW = playbackMinWidth(W);
  out.rot = (((+out.rot || 0) % 360) + 360) % 360;
  if (out.rot > 180) out.rot -= 360;
  out.cx = +out.cx || W / 2;
  out.cy = +out.cy || H / 2;
  if (isFullSlideCam(out, W, H)) {
    return fullSlideCam(W, H);
  }
  out.w = Math.max(minW, Math.min(+out.w || W * 0.5, maxWidthAt(out.cx, out.cy, out.rot, W, H)));
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
  out.w = Math.max(minW, Math.min(out.w, maxWidthAt(out.cx, out.cy, out.rot, W, H)));
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
  const w0 = Math.max(playbackMinWidth(W), +from.w || W);
  const w1 = Math.max(playbackMinWidth(W), +to.w || W);
  let w = Math.exp(lerp(Math.log(w0), Math.log(w1), e));
  w = Math.min(w, maxWidthAt(cx, cy, rot, W, H));
  return clampCamera({ cx, cy, w, h: w * a, rot }, W, H);
}

/** How far the camera is zoomed in (1 = full slide). */
export function cameraZoomFactor(cam, W = DEFAULT_CANVAS_W, H = DEFAULT_CANVAS_H) {
  if (!cam || isFullSlideCam(cam, W, H)) return 1;
  return W / Math.max(1e-6, +cam.w || W);
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
 * Write camera transform on the DOM node only (never via React style).
 * Clears will-change so Chrome re-rasters like the editor canvas zoom (vectors stay sharp).
 */
export function applyCameraTransform(el, cam, fitSc, W = DEFAULT_CANVAS_W, H = DEFAULT_CANVAS_H) {
  if (!el) return '';
  const state = cam || el._pvCamState || fullSlideCam(W, H);
  const clamped = isFullSlideCam(state, W, H) ? fullSlideCam(W, H) : clampCamera(state, W, H);
  el._pvCamState = {
    cx: clamped.cx,
    cy: clamped.cy,
    w: clamped.w,
    h: clamped.h,
    rot: clamped.rot,
  };
  const t = cameraCssTransform(el._pvCamState, fitSc, W, H);
  el.style.willChange = 'auto';
  el.style.overflow = 'hidden';
  el.style.transformOrigin = 'top left';
  el.style.transform = t;
  return t;
}

/**
 * Animate DOM element transform from → to camera.
 * @returns {{ abort: (opts?: { finish?: boolean, revert?: boolean }) => void, from: object, to: object }}
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
  // ctl.fit is mutable so a viewport/fullscreen resize mid-flight can update scale
  // without aborting the camera (otherwise outer box grows and stage stays shrunk top-left).
  const ctl = { aborted: false, finished: false, rafs: [], timers: [], from, to, W, H, fit };
  el._camCtl = ctl;

  const apply = (state) => {
    applyCameraTransform(el, state, ctl.fit, W, H);
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
        ctl.finished = true;
        apply(to);
        opts.onDone?.();
      }
    };
    ctl.rafs.push(requestAnimationFrame(step));
  };

  if (delay > 0) ctl.timers.push(setTimeout(run, delay));
  else run();

  return {
    /**
     * @param {{ finish?: boolean, revert?: boolean }} [opts]
     * finish — snap to end; revert — snap to start (does not call onDone)
     */
    abort(optsAbort = {}) {
      ctl.aborted = true;
      ctl.rafs.forEach((id) => cancelAnimationFrame(id));
      ctl.timers.forEach((t) => clearTimeout(t));
      if (optsAbort.finish) apply(to);
      else if (optsAbort.revert) apply(from);
    },
    from,
    to,
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
