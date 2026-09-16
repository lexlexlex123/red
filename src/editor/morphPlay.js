/** Morph transition engine for React preview. Ported from js/24-preview.js. */

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
