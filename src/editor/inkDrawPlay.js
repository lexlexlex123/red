/**
 * inkDraw («Рисование»): reveal ink strokes via stroke-dashoffset / opacity.
 * Adapted from js/48-drawing.js for React ink layer (.react-ink-layer / export SVG).
 */

export function isInkDrawAnim(name) {
  return name === 'inkDraw';
}

// Ids of inkhost elements currently mid-animation. fireInkDrawAnim reveals strokes by
// mutating their DOM nodes directly (stroke-dashoffset / opacity), completely outside
// React. But the inkhost element is normally re-rendered by React on *any* relevant store
// change (selection, animPlay flags, etc.) via dangerouslySetInnerHTML — and that overwrite
// wipes out whatever this script had just applied, instantly. ElementView checks this
// registry and freezes its rendered markup while the id is present, so the DOM this
// animation is driving doesn't get silently replaced out from under it.
const activeInkHosts = new Set();
export function isInkDrawActiveFor(elId) {
  return elId != null && activeInkHosts.has(String(elId));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function parallelCount(anim, total) {
  const n = Math.max(1, +total || 1);
  if (!anim) return 1;
  const v = anim.inkParallel;
  if (v === 0 || v === 'all' || v === true) return n;
  if (v == null) return 1;
  return Math.max(1, Math.min(n, Math.round(+v || 1)));
}

function isInfinite(anim) {
  const c = anim?.swingCount != null ? +anim.swingCount : 1;
  return !isFinite(c) || c >= 10;
}

function findInkLayer(domEl) {
  if (!domEl) return null;
  const stage =
    domEl.closest('.react-slide-stage') ||
    domEl.closest('.slide') ||
    domEl.parentElement;
  if (!stage) return null;
  return (
    stage.querySelector('.react-ink-layer') ||
    stage.querySelector('svg.react-ink-layer') ||
    stage.querySelector('svg.el') || // export ink svg is often first svg.el
    null
  );
}

function resolveNodes(domEl, elData) {
  const strokes = [];
  const fills = [];
  const seen = new Set();
  const add = (n, list) => {
    if (!n || seen.has(n)) return;
    seen.add(n);
    list.push(n);
  };

  const ids = new Set();
  (elData?.inkIds || []).forEach((id) => {
    if (id) ids.add(String(id));
  });

  const layer = findInkLayer(domEl);
  const scopes = [];
  if (domEl.querySelector?.('.ink-host-inner')) scopes.push(domEl.querySelector('.ink-host-inner'));
  scopes.push(domEl);
  if (layer) scopes.push(layer);

  scopes.forEach((scope) => {
    if (!scope?.querySelectorAll) return;
    scope.querySelectorAll('[data-ink-kind="stroke"], path[data-ink-id], g[data-ink-id]').forEach((n) => {
      const id = n.getAttribute('data-ink-id');
      if (ids.size && id && !ids.has(id)) return;
      if (n.getAttribute('data-ink-kind') === 'fill') return;
      // Prefer paths that are strokes
      if (n.tagName?.toLowerCase() === 'path' || n.tagName?.toLowerCase() === 'g') add(n, strokes);
    });
    scope.querySelectorAll('[data-ink-kind="fill"]').forEach((n) => {
      const id = n.getAttribute('data-ink-id');
      if (ids.size && id && !ids.has(id)) return;
      add(n, fills);
    });
  });

  // Fallback: all paths in ink layer
  if (!strokes.length && layer) {
    layer.querySelectorAll('path').forEach((n) => {
      if (n.closest('defs')) return;
      add(n, strokes);
    });
  }
  return { strokes, fills };
}

function isStrokePath(node) {
  if (!node || node.tagName?.toLowerCase() !== 'path') return false;
  const fill = node.getAttribute('fill');
  return (!fill || fill === 'none' || fill === 'transparent') && !!node.getAttribute('stroke');
}

function setDash(el, dash, offset) {
  try {
    el.setAttribute('stroke-dasharray', String(dash));
    el.setAttribute('stroke-dashoffset', String(offset));
  } catch (e) {
    /* ignore */
  }
}

function clearDash(el) {
  try {
    el.removeAttribute('stroke-dasharray');
    el.removeAttribute('stroke-dashoffset');
    el.removeAttribute('pathLength');
  } catch (e) {
    /* ignore */
  }
}

function hideNode(node) {
  if (!node) return;
  if (isStrokePath(node)) {
    try {
      node.setAttribute('pathLength', '1');
    } catch (e) {
      /* ignore */
    }
    setDash(node, 1, 1);
    return;
  }
  if (node.tagName?.toLowerCase() === 'g') {
    node.style.opacity = '0';
    return;
  }
  if (!node.dataset.inkDrawOp) {
    node.dataset.inkDrawOp = String(node.getAttribute('opacity') || '1');
  }
  node.style.opacity = '0';
}

function showFinal(node) {
  if (!node) return;
  if (isStrokePath(node)) {
    clearDash(node);
    node.style.opacity = '';
    return;
  }
  if (node.tagName?.toLowerCase() === 'g') {
    node.style.opacity = '';
    return;
  }
  const op = node.dataset.inkDrawOp || '1';
  node.style.opacity = op;
  delete node.dataset.inkDrawOp;
}

function tween(duration, ctl, onProgress) {
  return new Promise((resolve) => {
    if (ctl?.aborted) {
      resolve();
      return;
    }
    const dur = Math.max(120, duration || 1400);
    const t0 = performance.now();
    const step = (now) => {
      if (ctl.aborted) {
        resolve();
        return;
      }
      const p = Math.min(1, (now - t0) / dur);
      try {
        onProgress(p);
      } catch (e) {
        /* ignore */
      }
      if (p < 1) {
        const id = requestAnimationFrame(step);
        ctl.rafs.push(id);
      } else {
        try {
          onProgress(1);
        } catch (e) {
          /* ignore */
        }
        resolve();
      }
    };
    try {
      onProgress(0);
    } catch (e) {
      /* ignore */
    }
    const id = requestAnimationFrame(step);
    ctl.rafs.push(id);
  });
}

function tweenDash(el, duration, ctl) {
  if (!el) return Promise.resolve();
  try {
    el.setAttribute('pathLength', '1');
  } catch (e) {
    /* ignore */
  }
  setDash(el, 1, 1);
  return tween(duration, ctl, (p) => setDash(el, 1, 1 - p));
}

function animateStroke(node, duration, ctl) {
  return (async () => {
    if (!node || ctl?.aborted) return;
    if (node.tagName?.toLowerCase() === 'g') {
      // Reveal group children by opacity. Brush-tool strokes render as a mix of <path>
      // (connecting segments) and <circle> (round dab stamps) — only querying 'path' left
      // every circle stamp fully visible the whole time (never hidden, never animated),
      // which is why some parts of a brush stroke looked instantly drawn while others
      // progressively appeared.
      const kids = Array.from(node.querySelectorAll('path, circle'));
      if (!kids.length) {
        await tween(Math.min(280, duration), ctl, (p) => {
          node.style.opacity = String(p);
        });
        if (!ctl.aborted) showFinal(node);
        return;
      }
      kids.forEach((k) => hideNode(k));
      node.style.opacity = '';
      // One continuous tween driving progressive reveal, instead of looping a separate
      // tweenDash() per stamp (that couldn't go faster than roughly kids.length * 120ms
      // regardless of the intended duration) or clipping the group with a dashed guide path
      // (stroke-dasharray on a <clipPath> shape isn't reliably honored across browsers, and
      // showed the whole stroke immediately with no further progress). This just tracks how
      // many of the ordered stamps *should* be visible for the current elapsed fraction and
      // reveals exactly that many each frame — cheap, and can't stall the pool since it's the
      // same tween() used for every other reveal here.
      let shown = 0;
      await tween(duration, ctl, (p) => {
        const target = p >= 1 ? kids.length : Math.floor(p * kids.length);
        for (let i = shown; i < target; i++) showFinal(kids[i]);
        shown = target;
      });
      if (!ctl.aborted) kids.forEach((k) => showFinal(k));
      if (!ctl.aborted) showFinal(node);
      return;
    }
    if (isStrokePath(node)) {
      await tweenDash(node, duration, ctl);
      if (!ctl.aborted) showFinal(node);
      return;
    }
    await tween(Math.min(280, duration), ctl, (p) => {
      node.style.opacity = String(p);
    });
  })();
}

function animateFill(node, duration, ctl) {
  return new Promise((resolve) => {
    if (!node || ctl?.aborted) {
      resolve();
      return;
    }
    const op = parseFloat(node.dataset.inkDrawOp || node.getAttribute('opacity') || '1') || 1;
    node.style.opacity = '0';
    try {
      const anim = node.animate([{ opacity: 0 }, { opacity: op }], {
        duration: Math.max(120, duration),
        easing: 'ease-out',
        fill: 'forwards',
      });
      ctl.anims.push(anim);
      anim.onfinish = () => {
        node.style.opacity = String(op);
        resolve();
      };
      anim.oncancel = () => resolve();
    } catch (e) {
      node.style.opacity = String(op);
      resolve();
    }
  });
}

function strokeDuration(node, baseDuration) {
  const base = Math.max(200, +baseDuration || 1400);
  if (isStrokePath(node)) {
    let len = 320;
    try {
      len = Math.max(1, node.getTotalLength());
    } catch (e) {
      /* ignore */
    }
    const scale = Math.max(0.3, Math.min(3, len / 320));
    return Math.round(base * scale);
  }
  if (node?.tagName?.toLowerCase() === 'g') {
    // Brush-tool strokes render as a <g> of stamps rather than one continuous path, so
    // there's no getTotalLength() to scale off of. Stamp *count* is a poor stand-in for how
    // long the stroke actually is — stamps are laid down per captured input point, not per
    // unit of distance, so a long line drawn with a fast swipe can have fewer stamps than a
    // short one drawn slowly and carefully, which is exactly why long and short lines were
    // taking the same time regardless of their actual length. Sum the distance between
    // consecutive stamp centers instead — a real geometric length, same idea as
    // getTotalLength() above, just computed by hand since there's no <path> to ask.
    let len = 0;
    let prev = null;
    node.querySelectorAll('path, circle').forEach((k) => {
      let c = null;
      if (k.tagName?.toLowerCase() === 'circle') {
        c = { x: +k.getAttribute('cx') || 0, y: +k.getAttribute('cy') || 0 };
      } else {
        try {
          const b = k.getBBox();
          c = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        } catch (e) {
          c = null;
        }
      }
      if (c) {
        if (prev) len += Math.hypot(c.x - prev.x, c.y - prev.y);
        prev = c;
      }
    });
    const scale = Math.max(0.3, Math.min(3, Math.max(1, len) / 320));
    return Math.round(base * scale);
  }
  return base;
}

async function runPool(items, parallel, ctl, runOne) {
  parallel = Math.max(1, parallel | 0);
  if (!items?.length) return;
  let next = 0;
  let active = 0;
  await new Promise((resolve) => {
    const tryFinish = () => {
      if (active === 0 && (next >= items.length || ctl?.aborted)) resolve();
    };
    const spawn = () => {
      if (ctl?.aborted) return tryFinish();
      while (active < parallel && next < items.length) {
        if (ctl?.aborted) return tryFinish();
        const item = items[next++];
        active++;
        Promise.resolve()
          .then(() => runOne(item))
          .catch(() => {})
          .finally(() => {
            active--;
            tryFinish();
            spawn();
          });
      }
      tryFinish();
    };
    spawn();
  });
}

export function inkDrawWaitMs(anim, strokeCount = 8) {
  if (!anim) return 0;
  const delay = Math.max(0, +(anim.delay || 0));
  if (isInfinite(anim)) return delay;
  const loops = Math.max(1, +(anim.swingCount != null ? anim.swingCount : 1) || 1);
  const per = Math.max(200, +(anim.dur ?? anim.duration ?? 1400) || 1400);
  const n = Math.max(1, strokeCount);
  const par = parallelCount(anim, n);
  const waves = Math.ceil(n / par);
  return delay + loops * (waves * per + 400);
}

export function resetInkDraw(domEl, elData) {
  if (!domEl) return;
  const hostId = elData?.id != null ? String(elData.id) : domEl.getAttribute?.('data-id');
  if (hostId) activeInkHosts.delete(hostId);
  if (domEl._inkDrawCtl) {
    domEl._inkDrawCtl.aborted = true;
    (domEl._inkDrawCtl.timers || []).forEach((t) => clearTimeout(t));
    (domEl._inkDrawCtl.anims || []).forEach((a) => {
      try {
        a.cancel();
      } catch (e) {
        /* ignore */
      }
    });
    (domEl._inkDrawCtl.rafs || []).forEach((id) => {
      try {
        cancelAnimationFrame(id);
      } catch (e) {
        /* ignore */
      }
    });
    domEl._inkDrawCtl = null;
  }
  const nodes = resolveNodes(domEl, elData);
  nodes.strokes.forEach(showFinal);
  nodes.fills.forEach(showFinal);
}

export function clearInkDraw(root) {
  if (!root) return;
  root.querySelectorAll('.react-el, .el, [data-id]').forEach((el) => {
    if (el._inkDrawCtl) resetInkDraw(el, null);
  });
  // Ensure all ink paths visible
  root.querySelectorAll('[data-ink-id], .react-ink-layer path, svg.el path').forEach((n) => {
    if (n.closest('defs')) return;
    showFinal(n);
  });
}

/**
 * Fire inkDraw. Returns { waitMs, cancel }.
 */
export function fireInkDrawAnim(domEl, elData, anim, opts = {}) {
  if (!domEl || !anim) return { waitMs: 0, cancel: () => {} };
  resetInkDraw(domEl, elData);
  const hostId = elData?.id != null ? String(elData.id) : null;
  if (hostId) activeInkHosts.add(hostId);
  const delay = Math.max(0, opts.delay != null ? +opts.delay : +(anim.delay || 0));
  const perStroke = Math.max(200, +(anim.dur ?? anim.duration ?? 1400) || 1400);
  const fillDur = Math.min(700, Math.max(220, perStroke * 0.35));
  const infinite = opts.preview ? false : isInfinite(anim);
  const loops = opts.preview ? 1 : infinite ? Infinity : Math.max(1, +(anim.swingCount != null ? anim.swingCount : 1) || 1);
  const ctl = { aborted: false, timers: [], anims: [], rafs: [] };
  domEl._inkDrawCtl = ctl;

  const cancel = () => resetInkDraw(domEl, elData);

  const start = () => {
    if (ctl.aborted) return;
    const nodes = resolveNodes(domEl, elData);
    if (!nodes.strokes.length && !nodes.fills.length) {
      ctl._inkWait = (ctl._inkWait || 0) + 1;
      if (ctl._inkWait <= 16) {
        nodes.strokes.forEach(hideNode);
        nodes.fills.forEach(hideNode);
        const t = setTimeout(start, 32);
        ctl.timers.push(t);
      }
      return;
    }

    nodes.strokes.forEach(hideNode);
    nodes.fills.forEach(hideNode);

    const runLoop = async () => {
      let n = 0;
      while (!ctl.aborted && (infinite || n < loops)) {
        nodes.strokes.forEach(hideNode);
        nodes.fills.forEach(hideNode);
        await new Promise((r) => {
          const id = requestAnimationFrame(() => requestAnimationFrame(r));
          ctl.rafs.push(id);
        });
        if (ctl.aborted) return;
        const strokeOrder = shuffle(nodes.strokes);
        const strokeParallel = parallelCount(anim, strokeOrder.length);
        await runPool(strokeOrder, strokeParallel, ctl, (node) =>
          animateStroke(node, strokeDuration(node, perStroke), ctl)
        );
        if (ctl.aborted) return;
        const fillOrder = shuffle(nodes.fills);
        const fillParallel = parallelCount(anim, fillOrder.length);
        await runPool(fillOrder, fillParallel, ctl, (node) => animateFill(node, fillDur, ctl));
        n++;
        if (!infinite && n >= loops) break;
        if (infinite) {
          await new Promise((r) => {
            const t = setTimeout(r, 380);
            ctl.timers.push(t);
          });
        }
      }
      if (!ctl.aborted && !infinite) {
        nodes.strokes.forEach(showFinal);
        nodes.fills.forEach(showFinal);
        if (hostId) activeInkHosts.delete(hostId);
      }
    };
    runLoop();
  };

  const probe = resolveNodes(domEl, elData);
  probe.strokes.forEach(hideNode);
  probe.fills.forEach(hideNode);

  if (delay > 0) {
    const t = setTimeout(start, delay);
    ctl.timers.push(t);
  } else start();

  return {
    waitMs: inkDrawWaitMs(anim, probe.strokes.length || 8),
    cancel,
  };
}
