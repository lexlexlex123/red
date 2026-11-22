/** Morph transition engine for React preview. Ported from js/24-preview.js. */

import { getShapeNodes } from './shapeNodes.js';

/** Ease out cubic, matching legacy cubic-bezier(0.4, 0, 0.2, 1). */
export function morphEase(t) {
  return 1 - Math.pow(1 - t, 3);
}

/** Check if element is eligible for morphing. */
export function morphEligible(d) {
  if (!d || d._isDecor) return false;
  return !(d.anims && d.anims.length);
}

/** Get plain text content of a text element. */
export function morphPlainText(d) {
  if (!d || d.type !== 'text') return null;
  const tmp = document.createElement('div');
  tmp.innerHTML = d.html || '';
  return (tmp.textContent || '').trim().replace(/\s+/g, ' ');
}

/** Two text elements with different wording should NOT match. */
export function morphTextBlocksMatch(fd, td) {
  if (!fd || !td || fd.type !== 'text' || td.type !== 'text') return false;
  const hasLink = (fd.morphName && String(fd.morphName).trim()) || (td.morphName && String(td.morphName).trim());
  if (hasLink) return false;
  const a = morphPlainText(fd), b = morphPlainText(td);
  return a !== null && b !== null && a !== b;
}

/** Compute matching key for an element. */
export function morphMatchKey(d, allEls) {
  if (d.type === 'applet' && d.appletId === 'counter' && d.cntGroupId && String(d.cntGroupId).trim()) {
    return '__counterGroup__:' + String(d.cntGroupId).trim();
  }
  if (d.morphName && String(d.morphName).trim()) return String(d.morphName).trim();
  return elLabel(d, allEls || []);
}

/** Generate auto-label for an element. */
export function elLabel(el, allEls) {
  if (!el) return '';
  const typeNames = {
    text: 'Текст', shape: 'Фигура', image: 'Рисунок', icon: 'Иконка',
    formula: 'Формула', applet: 'Апплет', svg: 'SVG', mediavideo: 'Видео',
    mediaaudio: 'Аудио', htmlframe: 'HTML', markdown: 'Markdown', code: 'Код',
    table: 'Таблица', lineangle: 'Угол', inkhost: 'Чернило', pagenum: 'Номер',
    graph: 'Граф', lego: 'LEGO', model3d: '3D-модель', connector: 'Соединитель',
  };
  const base = typeNames[el.type] || el.type || 'Элемент';
  const idx = (allEls || []).filter(e => e && e.type === el.type && !e._isDecor).indexOf(el);
  const suff = idx >= 0 ? (idx + 1) : '';
  return base + (suff ? ' ' + suff : '');
}

/** Find matching element in toSlide for a fromSlide element. */
export function morphPairOnTo(fd, toEls, fromEls) {
  if (!fd || !toEls) return null;
  // First: match by id
  const byId = toEls.find(e => e && e.id === fd.id && !e._isDecor);
  if (byId && !morphTextBlocksMatch(fd, byId)) return byId;
  // Second: match by key
  const key = morphMatchKey(fd, fromEls || [fd]);
  if (!key) return null;
  return toEls.find(e => e && !e._isDecor && e.type === fd.type && !morphTextBlocksMatch(fd, e) && morphMatchKey(e, toEls) === key) || null;
}

/** Find matching element in fromSlide for a toSlide element. */
export function morphFindFrom(fromEls, toEl, used, toEls) {
  if (!toEl || toEl._isDecor || !morphEligible(toEl)) return null;
  const pool = fromEls.filter(f => f && !f._isDecor && !used.has(f.id) && morphEligible(f));
  let fd = pool.find(f => f && f.id === toEl.id && !morphTextBlocksMatch(f, toEl));
  if (fd) { used.add(fd.id); return fd; }
  const key = morphMatchKey(toEl, toEls || [toEl]);
  if (key) {
    fd = pool.find(f => f && f.type === toEl.type && !morphTextBlocksMatch(f, toEl) && morphMatchKey(f, fromEls) === key);
    if (fd) { used.add(fd.id); return fd; }
  }
  return null;
}

/** Scalar fields driven by yellow adj handles. */
const MORPH_ADJ_KEYS = [
  'rx',
  'starInner',
  'paraSkew',
  'trapTop',
  'trapBot',
  'moonPhase',
  'chevSkew',
  'chevInner',
  'arrowHead',
  'ringInner',
  'gearDepth',
  'tailX',
  'tailY',
  'tailRoundX',
  'tailRoundY',
  'tailWFrac',
  'arcStart',
  'arcEnd',
  'sw',
  'fillOp',
];

const ADJ_DEFAULTS = {
  rx: 0,
  starInner: 0.45,
  paraSkew: 20,
  trapTop: 0.15,
  trapBot: 0,
  moonPhase: -0.5,
  chevSkew: 25,
  chevInner: 25,
  arrowHead: 35,
  ringInner: 0.5,
  gearDepth: 0.25,
  tailX: 0,
  tailWFrac: 0.22,
  arcStart: 0,
  arcEnd: 270,
  sw: 2,
  fillOp: 1,
};

function adjDefault(el, key) {
  if (key === 'tailY') return Math.max(1, +(el?.h || 60)) / 2 + 30;
  if (key === 'chevInner') {
    const sk = el?.chevSkew != null ? +el.chevSkew : ADJ_DEFAULTS.chevSkew;
    return Number.isFinite(sk) ? sk : ADJ_DEFAULTS.chevInner;
  }
  return ADJ_DEFAULTS[key];
}

function numField(el, key) {
  const v = el?.[key];
  if (v == null || v === '') return adjDefault(el, key);
  const n = +v;
  return Number.isFinite(n) ? n : adjDefault(el, key);
}

function resampleClosed(pts, n) {
  if (!Array.isArray(pts) || pts.length < 1 || n < 1) return [];
  if (pts.length === n) return pts.map((p) => ({ x: +p.x || 0, y: +p.y || 0 }));
  const closed = pts.concat([pts[0]]);
  const seg = [];
  let total = 0;
  for (let i = 0; i < closed.length - 1; i++) {
    const ax = +closed[i].x || 0;
    const ay = +closed[i].y || 0;
    const bx = +closed[i + 1].x || 0;
    const by = +closed[i + 1].y || 0;
    const len = Math.hypot(bx - ax, by - ay);
    seg.push({ ax, ay, bx, by, len, acc: total });
    total += len;
  }
  if (total < 1e-8) {
    const p = { x: +pts[0].x || 0, y: +pts[0].y || 0 };
    return Array.from({ length: n }, () => ({ ...p }));
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = (i / n) * total;
    let s = seg[seg.length - 1];
    for (let k = 0; k < seg.length; k++) {
      if (d <= seg[k].acc + seg[k].len + 1e-9) {
        s = seg[k];
        break;
      }
    }
    const u = s.len > 0 ? (d - s.acc) / s.len : 0;
    out.push({ x: s.ax + (s.bx - s.ax) * u, y: s.ay + (s.by - s.ay) * u });
  }
  return out;
}

function lerpPts(a, b, t) {
  const n = Math.max(3, a.length, b.length);
  const aa = resampleClosed(a, n);
  const bb = resampleClosed(b, n);
  return aa.map((p, i) => ({
    x: p.x + ((bb[i]?.x || 0) - p.x) * t,
    y: p.y + ((bb[i]?.y || 0) - p.y) * t,
  }));
}

function lerpCurvePts(a, b, t) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length < 2 || b.length < 2) return null;
  const n = Math.min(a.length, b.length);
  const keys = ['x', 'y', 'cp1x', 'cp1y', 'cp2x', 'cp2y'];
  const out = [];
  for (let i = 0; i < n; i++) {
    const pa = a[i] || {};
    const pb = b[i] || {};
    const next = { ...pb, ...pa };
    keys.forEach((k) => {
      const va = pa[k];
      const vb = pb[k];
      if (va == null && vb == null) return;
      const na = va != null ? +va : +vb;
      const nb = vb != null ? +vb : +va;
      next[k] = na + (nb - na) * t;
    });
    out.push(next);
  }
  return out;
}

function ptsFinger(pts) {
  if (!Array.isArray(pts) || !pts.length) return '';
  return pts.map((p) => `${(+p.x || 0).toFixed(4)},${(+p.y || 0).toFixed(4)}`).join(';');
}

/** True when yellow-marker / node geometry differs and should interpolate. */
export function morphGeomDirty(from, to) {
  if (!from || !to) return false;
  if (from.type !== to.type) return false;
  if (from.type !== 'shape' && from.type !== 'text') return false;
  if ((from.shape || '') !== (to.shape || '')) return true;
  for (let i = 0; i < MORPH_ADJ_KEYS.length; i++) {
    const k = MORPH_ADJ_KEYS[i];
    if (from[k] == null && to[k] == null) continue;
    if (Math.abs(numField(from, k) - numField(to, k)) > 1e-6) return true;
  }
  const fromPts = getShapeNodes(from);
  const toPts = getShapeNodes(to);
  if (ptsFinger(fromPts) !== ptsFinger(toPts)) return true;
  if (ptsFinger(from.curvePoints) !== ptsFinger(to.curvePoints)) return true;
  return false;
}

/**
 * Element snapshot with adj handles / nodes / curve points interpolated.
 * Box x/y/w/h stay at `to` so the wrapper transform can keep driving position/size.
 */
export function lerpMorphEl(from, to, t) {
  const u = Math.max(0, Math.min(1, +t || 0));
  const out = { ...to };
  if (!from || from.type !== to?.type) return out;
  MORPH_ADJ_KEYS.forEach((k) => {
    if (from[k] == null && to[k] == null) return;
    out[k] = numField(from, k) + (numField(to, k) - numField(from, k)) * u;
  });
  const fromPts = getShapeNodes(from);
  const toPts = getShapeNodes(to);
  if (fromPts.length >= 3 && toPts.length >= 3 && ptsFinger(fromPts) !== ptsFinger(toPts)) {
    out.shapePts = lerpPts(fromPts, toPts, u);
  }
  const curve = lerpCurvePts(from.curvePoints, to.curvePoints, u);
  if (curve) out.curvePoints = curve;
  return out;
}

/** Hex color interpolation. */
export function lerpHexColor(from, to, t) {
  if (!from || !to) return to || from || '';
  const r1 = parseInt(from.slice(1, 3), 16) / 255;
  const g1 = parseInt(from.slice(3, 5), 16) / 255;
  const b1 = parseInt(from.slice(5, 7), 16) / 255;
  const r2 = parseInt(to.slice(1, 3), 16) / 255;
  const g2 = parseInt(to.slice(3, 5), 16) / 255;
  const b2 = parseInt(to.slice(5, 7), 16) / 255;
  const r = Math.round((r1 + (r2 - r1) * t) * 255);
  const g = Math.round((g1 + (g2 - g1) * t) * 255);
  const b = Math.round((b1 + (b2 - b1) * t) * 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Run morph transition between two slides in React preview.
 * @param {Object} fromSlide - slide data from "from" slide (els array)
 * @param {Object} toSlide - slide data from "to" slide (els array)
 * @param {Function} findEl - function to find DOM element by id
 * @param {number} dur - duration in ms
 * @param {Function} onDone - callback when transition completes
 */
export function runMorphTransition(fromSlide, toSlide, findEl, dur, onDone) {
  const fromEls = fromSlide?.els || [];
  const toEls = toSlide?.els || [];
  
  if (!fromEls.length && !toEls.length) {
    if (onDone) onDone();
    return;
  }

  const duration = Math.max(200, dur || 800);
  const startTime = performance.now();

  // Build pairs: fromEl -> toEl
  const pairs = [];
  const used = new Set();

  // First pass: pair from -> to
  fromEls.forEach((fd) => {
    if (!morphEligible(fd)) return;
    const td = morphPairOnTo(fd, toEls, fromEls);
    if (td) {
      const fromEl = findEl(fd.id);
      const toEl = findEl(td.id);
      if (fromEl && toEl) {
        pairs.push({ from: fd, to: td, fromEl, toEl });
      }
    }
  });

  // Second pass: pair unpaired to -> from
  toEls.forEach((td) => {
    if (td._isDecor || !morphEligible(td)) return;
    if (used.has(td.id)) return;
    const fd = morphFindFrom(fromEls, td, used, toEls);
    if (fd) {
      const fromEl = findEl(fd.id);
      const toEl = findEl(td.id);
      if (fromEl && toEl) {
        pairs.push({ from: fd, to: td, fromEl, toEl });
      }
    }
  });

  if (!pairs.length) {
    if (onDone) onDone();
    return;
  }

  // Compute transforms for each pair. `toEl` is rendered at its own natural (TO) position/size
  // in the DOM, so at progress 0 we must offset+scale it to visually sit at the FROM box, then
  // animate that offset/scale down to identity (0 / 1) as progress reaches 1 — NOT the other
  // way around, which is what made move/resize/rotate morphing look inverted.
  const transforms = pairs.map(({ from, to }) => {
    const fromRect = { x: +(from.x || 0), y: +(from.y || 0), w: +(from.w || 100), h: +(from.h || 60) };
    const toRect = { x: +(to.x || 0), y: +(to.y || 0), w: +(to.w || 100), h: +(to.h || 60) };
    // Offsets/scale between box CENTERS (not top-left corners) so rotation pivots correctly
    // around the element's own evolving center instead of tracing an off-axis arc.
    const fCx = fromRect.x + fromRect.w / 2, fCy = fromRect.y + fromRect.h / 2;
    const tCx = toRect.x + toRect.w / 2, tCy = toRect.y + toRect.h / 2;
    const dx0 = fCx - tCx;
    const dy0 = fCy - tCy;
    const scaleX0 = fromRect.w / Math.max(1, toRect.w);
    const scaleY0 = fromRect.h / Math.max(1, toRect.h);
    const fromRot = +(from.rot || 0);
    const toRot = +(to.rot || 0);
    return { dx0, dy0, scaleX0, scaleY0, fromRot, toRot };
  });

  // Animate geometry
  function frame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = morphEase(progress);

    pairs.forEach((pair, i) => {
      const t = transforms[i];
      if (!t) return;
      const el = pair.toEl;
      const curX = t.dx0 * (1 - ease);
      const curY = t.dy0 * (1 - ease);
      const curScaleX = t.scaleX0 + (1 - t.scaleX0) * ease;
      const curScaleY = t.scaleY0 + (1 - t.scaleY0) * ease;
      const curRot = t.fromRot + (t.toRot - t.fromRot) * ease;
      el.style.transform = `translate(${curX}px, ${curY}px) scale(${curScaleX}, ${curScaleY}) rotate(${curRot}deg)`;
      el.style.transformOrigin = 'center center';
      el.style.willChange = 'transform';
    });

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      // Cleanup - reset transforms
      pairs.forEach(({ toEl }) => {
        if (toEl) {
          toEl.style.transform = '';
          toEl.style.willChange = '';
        }
      });
      if (onDone) onDone();
    }
  }

  requestAnimationFrame(frame);
}

/** Find a DOM element by data-id. */
export function findElById(root, id) {
  if (!root || id == null) return null;
  try {
    return root.querySelector(`[data-id="${CSS.escape(String(id))}"]`);
  } catch (e) {
    return root.querySelector(`[data-id="${String(id).replace(/"/g, '\\"')}"]`);
  }
}
