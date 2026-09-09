/**
 * Recolor («Цвет») silhouette → original via SVG feColorMatrix (from js/10c-anim-engine.js).
 */

function normHex(c) {
  let h = String(c || '#000000').trim();
  if (/^#[0-9a-fA-F]{3}$/.test(h)) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(h)) h = '#000000';
  return h.toLowerCase();
}

function rgbOf(hex) {
  const h = normHex(hex);
  return {
    r: parseInt(h.slice(1, 3), 16) / 255,
    g: parseInt(h.slice(3, 5), 16) / 255,
    b: parseInt(h.slice(5, 7), 16) / 255,
  };
}

function matrixValues(r, g, b, t) {
  const d = t;
  const o = 1 - t;
  return `${d.toFixed(4)} 0 0 0 ${(r * o).toFixed(4)} 0 ${d.toFixed(4)} 0 0 ${(g * o).toFixed(4)} 0 0 ${d.toFixed(4)} 0 ${(b * o).toFixed(4)} 0 0 0 1 0`;
}

function ease(p) {
  return p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
}

function svgRoot() {
  let svg = document.getElementById('_recolor-svg-filters');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = '_recolor-svg-filters';
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    document.body.appendChild(svg);
  }
  return svg;
}

function filterId(el) {
  if (!el._recolorUid) {
    el._recolorUid =
      el.dataset?.id != null ? String(el.dataset.id) : `r${Math.random().toString(36).slice(2, 9)}`;
  }
  return `_recolor_live_${el._recolorUid}`;
}

function getMat(el) {
  const id = filterId(el);
  const svg = svgRoot();
  let filter = document.getElementById(id);
  let mat;
  if (!filter) {
    filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', id);
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    mat = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
    mat.setAttribute('type', 'matrix');
    filter.appendChild(mat);
    svg.appendChild(filter);
  } else {
    mat = filter.querySelector('feColorMatrix');
  }
  return { id, mat };
}

export function recolorVisualTargets(domEl, elData) {
  if (!domEl) return [];
  const type = elData?.type || '';
  if (type === 'text') {
    const tel =
      domEl.querySelector('[contenteditable]') ||
      domEl.querySelector('.tel') ||
      domEl.querySelector('.ec') ||
      [...domEl.children].find((c) => c.tagName !== 'IFRAME');
    return tel ? [tel] : [domEl];
  }
  const img = domEl.querySelector('img');
  if (img) return [img];
  const svgEl = domEl.querySelector('svg');
  if (svgEl) return [svgEl];
  return [domEl];
}

function applyT(el, nodes, hex, t) {
  const rgb = rgbOf(hex);
  const pack = getMat(el);
  pack.mat.setAttribute('values', matrixValues(rgb.r, rgb.g, rgb.b, t));
  const url = `url(#${pack.id})`;
  nodes.forEach((node) => {
    if (node._recolorSavedFilter == null) node._recolorSavedFilter = node.style.filter || '';
    node.style.filter = url;
  });
  el._recolorT = t;
}

function clearNodes(el, nodes) {
  (nodes || []).forEach((node) => {
    node.style.filter = node._recolorSavedFilter != null ? node._recolorSavedFilter : '';
    node._recolorSavedFilter = null;
  });
  const id = el?._recolorUid ? `_recolor_live_${el._recolorUid}` : null;
  const filter = id ? document.getElementById(id) : null;
  if (filter?.parentNode) filter.parentNode.removeChild(filter);
  if (el) {
    el._recolorT = null;
    el._recolorTargets = null;
    el._recolorPrepared = false;
  }
}

function cancelAnim(el) {
  if (!el) return;
  if (el._recolorRaf) {
    cancelAnimationFrame(el._recolorRaf);
    el._recolorRaf = null;
  }
  if (el._recolorTimers) {
    el._recolorTimers.forEach(clearTimeout);
    el._recolorTimers = [];
  }
}

function animate(el, nodes, hex, fromT, toT, dur, onDone) {
  cancelAnim(el);
  el._recolorTimers = [];
  applyT(el, nodes, hex, fromT);
  const rgb = rgbOf(hex);
  const pack = getMat(el);
  const t0 = performance.now();
  const durMs = Math.max(1, dur || 600);
  function frame(now) {
    const p = Math.min(1, (now - t0) / durMs);
    const t = fromT + (toT - fromT) * ease(p);
    pack.mat.setAttribute('values', matrixValues(rgb.r, rgb.g, rgb.b, t));
    el._recolorT = t;
    if (p < 1) {
      el._recolorRaf = requestAnimationFrame(frame);
    } else {
      el._recolorRaf = null;
      if (toT >= 0.999) clearNodes(el, nodes);
      else applyT(el, nodes, hex, toT);
      if (onDone) onDone();
    }
  }
  el._recolorRaf = requestAnimationFrame(frame);
}

export function isRecolorAnim(name) {
  return name === 'recolor';
}

/** Prepare silhouette (t=0) before play when anim is not invert. */
export function prepareRecolorEl(domEl, elData) {
  if (!domEl || !elData) return;
  const a = (elData.anims || []).find((x) => x && x.name === 'recolor' && !x.recolorInvert);
  if (!a) return;
  cancelAnim(domEl);
  if (domEl._recolorTargets) clearNodes(domEl, domEl._recolorTargets);
  const hex = normHex(a.recolorColor || '#000000');
  const nodes = recolorVisualTargets(domEl, elData);
  if (!nodes.length) return;
  applyT(domEl, nodes, hex, 0);
  domEl._recolorTargets = nodes;
  domEl._recolorPrepared = true;
}

/**
 * Fire recolor. Returns waitMs.
 */
export function fireRecolorAnim(domEl, elData, anim) {
  if (!domEl || !anim) return 0;
  const delay = Math.max(0, +(anim.delay || 0));
  const dur = Math.max(50, +(anim.dur != null ? anim.dur : anim.duration) || 600);
  const hex = normHex(anim.recolorColor || '#000000');
  const invert = !!anim.recolorInvert;
  cancelAnim(domEl);
  domEl._recolorTimers = [];

  let nodes = domEl._recolorTargets;
  const already = !!domEl._recolorPrepared && !!nodes && !invert;
  if (!already) {
    if (domEl._recolorTargets) clearNodes(domEl, domEl._recolorTargets);
    nodes = recolorVisualTargets(domEl, elData);
    if (!nodes.length) return 0;
    domEl._recolorTargets = nodes;
  }

  if (!invert) {
    if (!already) applyT(domEl, nodes, hex, 0);
    domEl._recolorPrepared = true;
    domEl._recolorTimers.push(
      setTimeout(() => {
        animate(domEl, nodes, hex, 0, 1, dur, null);
      }, delay)
    );
  } else {
    domEl._recolorPrepared = false;
    domEl._recolorTimers.push(
      setTimeout(() => {
        animate(domEl, nodes, hex, 1, 0, dur, null);
      }, delay)
    );
  }
  return delay + dur;
}

export function clearRecolorTransforms(root) {
  if (!root) return;
  root.querySelectorAll('.react-el[data-id], .el[data-id]').forEach((node) => {
    cancelAnim(node);
    clearNodes(node, node._recolorTargets || recolorVisualTargets(node, null));
  });
}
