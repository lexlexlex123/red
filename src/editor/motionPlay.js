/**
 * WAAPI playback for moveTo / orbitTo / rotate / mirror (from js/24-preview.js fireAnim).
 */

export function isMotionAnim(name) {
  return name === 'moveTo' || name === 'orbitTo' || name === 'rotate' || name === 'mirror';
}

function rotSuffix(el) {
  const rot = el?.rot || 0;
  return rot ? ` rotate(${rot}deg)` : '';
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

/**
 * Animate DOM node. Returns { endTx, endTy, waitMs }.
 * cumTx/cumTy = prior motion translate on the element.
 */
export function fireMotionAnim(domEl, elData, anim, cumTx = 0, cumTy = 0) {
  if (!domEl || !anim) return { endTx: cumTx, endTy: cumTy, waitMs: 0 };
  const dur = Math.max(50, +(anim.dur != null ? anim.dur : anim.duration) || 600);
  const delay = Math.max(0, +(anim.delay || 0));
  const rot = rotSuffix(elData);

  if (anim.name === 'moveTo') {
    const tx = anim.tx || 0;
    const ty = anim.ty || 0;
    if (typeof domEl.animate === 'function') {
      const a = domEl.animate(
        [
          { transform: `translate(${cumTx}px,${cumTy}px)${rot}` },
          { transform: `translate(${tx}px,${ty}px)${rot}` },
        ],
        { duration: dur, delay, easing: 'linear', fill: 'forwards', composite: 'replace' }
      );
      a.onfinish = () => {
        try {
          a.commitStyles();
        } catch (_) {
          /* ignore */
        }
        a.cancel();
        domEl.style.transform = `translate(${tx}px,${ty}px)${rot}`;
      };
    } else {
      setTimeout(() => {
        domEl.style.transition = `transform ${dur}ms linear`;
        domEl.style.transform = `translate(${tx}px,${ty}px)${rot}`;
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
    if (typeof domEl.animate === 'function') {
      const a = domEl.animate(frames, {
        duration: dur,
        delay,
        easing: 'linear',
        fill: 'forwards',
        composite: 'replace',
      });
      a.onfinish = () => {
        try {
          a.commitStyles();
        } catch (_) {
          /* ignore */
        }
        a.cancel();
        domEl.style.transform = `translate(${endTx.toFixed(2)}px,${endTy.toFixed(2)}px)${rot}`;
      };
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
        { duration: dur, delay, easing: 'linear', fill: 'forwards', composite }
      );
      a.onfinish = () => {
        try {
          a.commitStyles();
        } catch (_) {
          /* ignore */
        }
        a.cancel();
      };
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
      };
    }
    return { endTx: cumTx, endTy: cumTy, waitMs: delay + Math.max(80, dur) };
  }

  return { endTx: cumTx, endTy: cumTy, waitMs: 0 };
}

/** Reset motion transforms after play. */
export function clearMotionTransforms(root) {
  if (!root) return;
  root.querySelectorAll('.react-el[data-id]').forEach((node) => {
    node._mirrorCumH = false;
    node._mirrorCumV = false;
    if (node.style?.transform) {
      node.style.transform = '';
      node.style.transition = '';
    }
    ['.ec', '.iel', '.react-el-inner'].forEach((sel) => {
      const inner = node.querySelector(sel);
      if (inner?.style?.transform) {
        inner.style.transform = '';
        inner.style.transition = '';
      }
    });
  });
}
