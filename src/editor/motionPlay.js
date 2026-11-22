/**
 * WAAPI playback for moveTo / orbitTo / rotate / mirror (from js/24-preview.js fireAnim).
 */

import { animEasingCss, moveToDelta, pathEndDelta, pathPtsOf, samplePathFrames } from './motionGeom.js';
import { elBoxTransform } from './elTransform.js';

export function isMotionAnim(name) {
  return name === 'moveTo' || name === 'orbitTo' || name === 'rotate' || name === 'mirror' || name === 'pathTo';
}

/** Authored rotation + flip — must stay on the host during motion or mirrors snap back. */
function rotSuffix(el) {
  const xf = elBoxTransform(el);
  return xf ? ` ${xf}` : '';
}

function contentTarget(domEl) {
  if (!domEl) return null;
  return (
    domEl.querySelector('.ec') ||
    domEl.querySelector('.iel') ||
    domEl.querySelector('.react-el-inner') ||
    domEl
  );
}

function finishMotion(domEl, transform, endTx, endTy, anim, onDone) {
  if (anim && typeof anim.commitStyles === 'function') {
    try {
      anim.commitStyles();
    } catch (_) {
      /* ignore */
    }
    try {
      anim.cancel();
    } catch (_) {
      /* ignore */
    }
  }
  if (domEl) domEl.style.transform = transform;
  if (typeof onDone === 'function') {
    try {
      onDone({ endTx, endTy });
    } catch (_) {
      /* ignore */
    }
  }
}

/**
 * Animate DOM node. Returns { endTx, endTy, waitMs }.
 * cumTx/cumTy = prior motion translate on the element.
 * onDone({ endTx, endTy }) fires when the motion settles (so React can keep the offset).
 */
export function fireMotionAnim(domEl, elData, anim, cumTx = 0, cumTy = 0, onDone) {
  if (!domEl || !anim) return { endTx: cumTx, endTy: cumTy, waitMs: 0 };
  const dur = Math.max(50, +(anim.dur != null ? anim.dur : anim.duration) || 600);
  const delay = Math.max(0, +(anim.delay || 0));
  const rot = rotSuffix(elData);
  const easing = animEasingCss(anim.easing);

  if (anim.name === 'pathTo' || (anim.name === 'moveTo' && Array.isArray(anim.pathPts) && anim.pathPts.length)) {
    const pts = pathPtsOf(anim);
    const d = pathEndDelta(anim);
    const tx = cumTx + d.tx;
    const ty = cumTy + d.ty;
    const frames = samplePathFrames(pts, Math.max(24, Math.round(dur / 20))).map((p) => ({
      transform: `translate(${cumTx + p.x}px,${cumTy + p.y}px)${rot}`,
    }));
    if (!frames.length) frames.push({ transform: `translate(${cumTx}px,${cumTy}px)${rot}` });
    frames[frames.length - 1] = { transform: `translate(${tx}px,${ty}px)${rot}` };
    const endXf = `translate(${tx}px,${ty}px)${rot}`;
    if (typeof domEl.animate === 'function') {
      const a = domEl.animate(frames, {
        duration: dur,
        delay,
        easing,
        fill: 'forwards',
        composite: 'replace',
      });
      a.onfinish = () => finishMotion(domEl, endXf, tx, ty, a, onDone);
    } else {
      setTimeout(() => {
        domEl.style.transition = `transform ${dur}ms ${easing}`;
        domEl.style.transform = endXf;
        setTimeout(() => finishMotion(domEl, endXf, tx, ty, null, onDone), dur);
      }, delay);
    }
    return { endTx: tx, endTy: ty, waitMs: delay + dur };
  }

  if (anim.name === 'moveTo') {
    const d = moveToDelta(anim);
    const tx = cumTx + d.tx;
    const ty = cumTy + d.ty;
    const endXf = `translate(${tx}px,${ty}px)${rot}`;
    if (typeof domEl.animate === 'function') {
      const a = domEl.animate(
        [
          { transform: `translate(${cumTx}px,${cumTy}px)${rot}` },
          { transform: endXf },
        ],
        { duration: dur, delay, easing, fill: 'forwards', composite: 'replace' }
      );
      a.onfinish = () => finishMotion(domEl, endXf, tx, ty, a, onDone);
    } else {
      setTimeout(() => {
        domEl.style.transition = `transform ${dur}ms linear`;
        domEl.style.transform = endXf;
        setTimeout(() => finishMotion(domEl, endXf, tx, ty, null, onDone), dur);
      }, delay);
    }
    return { endTx: tx, endTy: ty, waitMs: delay + dur };
  }

  if (anim.name === 'orbitTo') {
    const dir = (anim.orbitDir || 'cw') === 'cw' ? 1 : -1;
    const totalDeg = (anim.orbitDeg != null ? anim.orbitDeg : 360) * dir;
    const ocx = anim.orbitCx || 0;
    const ocy = anim.orbitCy || 0;
    const r = Math.sqrt(ocx * ocx + ocy * ocy) || anim.orbitR || 120;
    const startAngle = Math.atan2(-ocy, -ocx);
    const steps = Math.max(60, Math.abs(totalDeg) * 2);
    const frames = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = startAngle + ((totalDeg * Math.PI) / 180) * t;
      const ftx = cumTx + ocx + r * Math.cos(angle);
      const fty = cumTy + ocy + r * Math.sin(angle);
      frames.push({ transform: `translate(${ftx.toFixed(2)}px,${fty.toFixed(2)}px)${rot}` });
    }
    const endTx = cumTx + ocx + r * Math.cos(startAngle + (totalDeg * Math.PI) / 180);
    const endTy = cumTy + ocy + r * Math.sin(startAngle + (totalDeg * Math.PI) / 180);
    const endXf = `translate(${endTx.toFixed(2)}px,${endTy.toFixed(2)}px)${rot}`;
    if (typeof domEl.animate === 'function') {
      const a = domEl.animate(frames, {
        duration: dur,
        delay,
        easing,
        fill: 'forwards',
        composite: 'replace',
      });
      a.onfinish = () => finishMotion(domEl, endXf, endTx, endTy, a, onDone);
    } else {
      setTimeout(() => finishMotion(domEl, endXf, endTx, endTy, null, onDone), delay + dur);
    }
    return { endTx, endTy, waitMs: delay + dur };
  }

  if (anim.name === 'rotate') {
    const dir = (anim.rotateDir || 'cw') === 'cw' ? 1 : -1;
    const deg = (anim.rotateDeg != null ? anim.rotateDeg : 360) * dir;
    const rotTarget = contentTarget(domEl);
    const composite = rotTarget !== domEl ? 'replace' : 'add';
    if (rotTarget && typeof rotTarget.animate === 'function') {
      const a = rotTarget.animate(
        [{ transform: 'rotate(0deg)' }, { transform: `rotate(${deg}deg)` }],
        { duration: dur, delay, easing, fill: 'forwards', composite }
      );
      a.onfinish = () => {
        try {
          a.commitStyles();
        } catch (_) {
          /* ignore */
        }
        a.cancel();
        if (typeof onDone === 'function') onDone({ endTx: cumTx, endTy: cumTy });
      };
    } else if (typeof onDone === 'function') {
      setTimeout(() => onDone({ endTx: cumTx, endTy: cumTy }), delay + dur);
    }
    return { endTx: cumTx, endTy: cumTy, waitMs: delay + dur };
  }

  if (anim.name === 'mirror') {
    const axis = anim.mirrorAxis === 'v' ? 'v' : 'h';
    const target = contentTarget(domEl);
    if (!target) return { endTx: cumTx, endTy: cumTy, waitMs: 0 };
    const composite = target !== domEl ? 'replace' : 'add';
    const prop = axis === 'h' ? 'rotateY' : 'rotateX';
    const persp = 'perspective(900px) ';
    if (domEl._mirrorCumH == null) domEl._mirrorCumH = false;
    if (domEl._mirrorCumV == null) domEl._mirrorCumV = false;
    const curH = !!domEl._mirrorCumH;
    const curV = !!domEl._mirrorCumV;
    const nextH = axis === 'h' ? !curH : curH;
    const nextV = axis === 'v' ? !curV : curV;
    domEl._mirrorCumH = nextH;
    domEl._mirrorCumV = nextV;
    const scaleOf = (h, v) => `scale(${h ? -1 : 1},${v ? -1 : 1})`;
    const startScale = scaleOf(curH, curV);
    const endScale = scaleOf(nextH, nextV);
    target.style.transformOrigin = 'center center';
    const waitMirror = delay + Math.max(80, dur);
    if (typeof target.animate === 'function') {
      const frames =
        composite === 'replace'
          ? [
              { transform: `${persp}${startScale} ${prop}(0deg)` },
              { transform: `${persp}${startScale} ${prop}(180deg)` },
            ]
          : [
              { transform: `${persp}${prop}(0deg)` },
              { transform: `${persp}${prop}(180deg)` },
            ];
      const a = target.animate(frames, {
        duration: Math.max(80, dur),
        delay,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards',
        composite,
      });
      a.onfinish = () => {
        try {
          a.commitStyles();
        } catch (_) {
          /* ignore */
        }
        a.cancel();
        if (composite === 'replace') target.style.transform = endScale;
        if (typeof onDone === 'function') onDone({ endTx: cumTx, endTy: cumTy });
      };
    } else if (typeof onDone === 'function') {
      setTimeout(() => onDone({ endTx: cumTx, endTy: cumTy }), waitMirror);
    }
    return { endTx: cumTx, endTy: cumTy, waitMs: waitMirror };
  }

  if (typeof onDone === 'function') onDone({ endTx: cumTx, endTy: cumTy });
  return { endTx: cumTx, endTy: cumTy, waitMs: 0 };
}

/** Cancel WAAPI / CSS animations under root (Stop must kill in-flight motion). */
export function cancelSubtreeAnimations(root) {
  if (!root || typeof root.getAnimations !== 'function') return;
  try {
    root.getAnimations({ subtree: true }).forEach((a) => {
      try {
        a.cancel();
      } catch (_) {
        /* ignore */
      }
    });
  } catch (_) {
    /* ignore */
  }
}

/** Reset motion transforms after play. */
export function clearMotionTransforms(root) {
  if (!root) return;
  cancelSubtreeAnimations(root);
  root.querySelectorAll('.react-el[data-id]').forEach((node) => {
    node._mirrorCumH = false;
    node._mirrorCumV = false;
    if (node.getAnimations) {
      try {
        node.getAnimations().forEach((a) => {
          try {
            a.cancel();
          } catch (_) {
            /* ignore */
          }
        });
      } catch (_) {
        /* ignore */
      }
    }
    if (node.style) {
      node.style.transform = '';
      node.style.transition = '';
      node.style.animation = '';
      node.style.animationName = '';
    }
    ['.ec', '.iel', '.react-el-inner'].forEach((sel) => {
      const inner = node.querySelector(sel);
      if (!inner?.style) return;
      if (inner.getAnimations) {
        try {
          inner.getAnimations().forEach((a) => {
            try {
              a.cancel();
            } catch (_) {
              /* ignore */
            }
          });
        } catch (_) {
          /* ignore */
        }
      }
      inner.style.transform = '';
      inner.style.transition = '';
      inner.style.animation = '';
      inner.style.animationName = '';
    });
  });
}
