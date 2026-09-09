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
  // Handle transparent colors
  if (from === 'transparent' || from === 'none') from = '#00000000';
  if (to === 'transparent' || to === 'none') to = '#00000000';
  
  // Parse alpha if present
  const hasAlphaFrom = from.length === 9;
  const hasAlphaTo = to.length === 9;
  
  const r1 = parseInt(from.slice(1, 3), 16) / 255;
  const g1 = parseInt(from.slice(3, 5), 16) / 255;
  const b1 = parseInt(from.slice(5, 7), 16) / 255;
  const a1 = hasAlphaFrom ? parseInt(from.slice(7, 9), 16) / 255 : 1;
  
  const r2 = parseInt(to.slice(1, 3), 16) / 255;
  const g2 = parseInt(to.slice(3, 5), 16) / 255;
  const b2 = parseInt(to.slice(5, 7), 16) / 255;
  const a2 = hasAlphaTo ? parseInt(to.slice(7, 9), 16) / 255 : 1;
  
  const r = Math.round((r1 + (r2 - r1) * t) * 255);
  const g = Math.round((g1 + (g2 - g1) * t) * 255);
  const b = Math.round((b1 + (b2 - b1) * t) * 255);
  const a = Math.round((a1 + (a2 - a1) * t) * 255);
  
  const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  return a < 255 ? hex + a.toString(16).padStart(2, '0') : hex;
}

/** Parse shadow string to components. */
export function parseShadow(shadow) {
  if (!shadow || shadow === 'none') return null;
  // Format: "offset-x offset-y blur-radius spread-radius color" or "inset ..."
  const match = shadow.match(/^(inset\s+)?(-?[\d.]+)(px|em|rem|%)\s+(-?[\d.]+)(px|em|rem|%)\s+(-?[\d.]+)(px|em|rem|%)?\s*(-?[\d.]+)?(px|em|rem|%)?\s*(.+)?$/i);
  if (!match) return null;
  return {
    inset: !!match[1],
    offsetX: parseFloat(match[2]),
    offsetY: parseFloat(match[4]),
    blur: match[6] ? parseFloat(match[6]) : 0,
    spread: match[9] ? parseFloat(match[9]) : 0,
    color: match[match.length - 1] || '#000',
  };
}

/** Interpolate shadow. */
export function lerpShadow(from, to, t) {
  const f = parseShadow(from);
  const d = parseShadow(to);
  if (!f && !d) return 'none';
  if (!f) return to;
  if (!d) return from;
  
  const ox = f.offsetX + (d.offsetX - f.offsetX) * t;
  const oy = f.offsetY + (d.offsetY - f.offsetY) * t;
  const blur = f.blur + (d.blur - f.blur) * t;
  const spread = f.spread + (d.spread - f.spread) * t;
  const color = lerpHexColor(f.color, d.color, t);
  
  return `${ox}px ${oy}px ${blur}px ${spread}px ${color}`;
}

/** Parse border-radius string to array. */
export function parseRadius(radius) {
  if (!radius) return [0, 0, 0, 0];
  if (typeof radius === 'number') return [radius, radius, radius, radius];
  const parts = String(radius).replace(/px/g, '').split(/\s+/).map(parseFloat);
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  if (parts.length >= 4) return [parts[0], parts[1], parts[2], parts[3]];
  return [0, 0, 0, 0];
}

/** Interpolate border-radius. */
export function lerpRadius(from, to, t) {
  const f = parseRadius(from);
  const d = parseRadius(to);
  const result = f.map((v, i) => v + (d[i] - v) * t);
  return result.map(v => `${v}px`).join(' ');
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
  
  console.log('[Morph] runMorphTransition called:', { 
    fromEls: fromEls.length, 
    toEls: toEls.length, 
    dur,
    fromSlideSample: fromEls.slice(0, 2).map(e => ({ id: e.id, type: e.type, morphName: e.morphName })),
    toSlideSample: toEls.slice(0, 2).map(e => ({ id: e.id, type: e.type, morphName: e.morphName }))
  });
  
  if (!fromEls.length && !toEls.length) {
    console.log('[Morph] No elements to morph');
    if (onDone) onDone();
    return;
  }

  const duration = Math.max(200, dur || 800);
  const startTime = performance.now();

  // Build pairs: fromData -> toData (only need DOM elements for toSlide since it's currently rendered)
  const pairs = [];
  const exitPairs = []; // Elements that exist in from but not in to (should fade out)
  const enterPairs = []; // Elements that exist in to but not in from (should fade in)
  const used = new Set();

  // Process toSlide elements and find matching fromSlide elements
  toEls.forEach((td) => {
    if (td._isDecor || !morphEligible(td)) {
      console.log('[Morph] To element not eligible:', td.id, 'isDecor:', !!td._isDecor, 'has anims:', !!(td.anims && td.anims.length));
      return;
    }
    
    // Find matching from element
    const fd = morphFindFrom(fromEls, td, used, toEls);
    if (fd) {
      const toEl = findEl(td.id);
      console.log('[Morph] Pair found:', { 
        fromId: fd.id, 
        toId: td.id, 
        toEl: !!toEl,
        fromType: fd.type,
        toType: td.type,
        fromPos: `${fd.x},${fd.y}`,
        toPos: `${td.x},${td.y}`
      });
      if (toEl) {
        pairs.push({ from: fd, to: td, toEl });
      } else {
        console.log('[Morph] Missing toEl:', td.id);
      }
    } else {
      // Element exists in to but not in from - should fade in
      const toEl = findEl(td.id);
      if (toEl) {
        enterPairs.push({ to: td, toEl });
        console.log('[Morph] Enter element:', td.id);
      }
    }
  });

  // Find elements that exist in from but not in to (should fade out)
  fromEls.forEach((fd) => {
    if (fd._isDecor || !morphEligible(fd)) return;
    if (used.has(fd.id)) return;
    // Element exists in from but not in to - we can't animate it since it's not in DOM
    console.log('[Morph] Exit element (not in DOM):', fd.id);
  });

  console.log('[Morph] Total pairs:', pairs.length, 'enter:', enterPairs.length, 'exit:', exitPairs.length);
  if (!pairs.length && !enterPairs.length) {
    console.log('[Morph] No pairs or enter elements found, falling back');
    if (onDone) onDone();
    return;
  }

  // Compute transforms for each pair
  const transforms = pairs.map(({ from, to }) => {
    const fromRect = { x: +(from.x || 0), y: +(from.y || 0), w: +(from.w || 100), h: +(from.h || 60) };
    const toRect = { x: +(to.x || 0), y: +(to.y || 0), w: +(to.w || 100), h: +(to.h || 60) };
    const fromRot = +(from.rot || 0);
    const toRot = +(to.rot || 0);
    const fromFill = from.fill || from.bg || null;
    const toFill = to.fill || to.bg || null;
    const fromStroke = from.stroke || null;
    const toStroke = to.stroke || null;
    const fromFs = from.fs || from.mdFs || from.fontSize || null;
    const toFs = to.fs || to.mdFs || to.fontSize || null;
    const fromShadow = from.shadow || null;
    const toShadow = to.shadow || null;
    const fromRadius = from.radius || from.borderRadius || null;
    const toRadius = to.radius || to.borderRadius || null;
    const fromOpacity = from.elOpacity != null ? +from.elOpacity : 1;
    const toOpacity = to.elOpacity != null ? +to.elOpacity : 1;
    return { fromRect, toRect, fromRot, toRot, fromFill, toFill, fromStroke, toStroke, fromFs, toFs, fromShadow, toShadow, fromRadius, toRadius, fromOpacity, toOpacity };
  });

  // Hide elements initially, then snap to FROM positions
  console.log('[Morph] Hiding and snapping elements to FROM positions');
  pairs.forEach(({ toEl, from }, i) => {
    const t = transforms[i];
    if (!t || !toEl) return;
    
    const computedStyle = window.getComputedStyle(toEl);
    const originalLeft = computedStyle.left;
    const originalTop = computedStyle.top;
    const originalWidth = computedStyle.width;
    const originalHeight = computedStyle.height;
    const originalTransform = computedStyle.transform;
    const originalOpacity = computedStyle.opacity;
    const originalFontSize = computedStyle.fontSize;
    const originalColor = computedStyle.color;
    const originalBg = computedStyle.backgroundColor;
    const originalBoxShadow = computedStyle.boxShadow;
    const originalBorderRadius = computedStyle.borderRadius;
    
    console.log('[Morph] Snap element', toEl.dataset.id, 'from original:', originalLeft, originalTop, 'to from:', t.fromRect.x, t.fromRect.y);
    
    // Store original inline styles for cleanup
    toEl.dataset.morphOriginalLeft = originalLeft;
    toEl.dataset.morphOriginalTop = originalTop;
    toEl.dataset.morphOriginalWidth = originalWidth;
    toEl.dataset.morphOriginalHeight = originalHeight;
    toEl.dataset.morphOriginalTransform = originalTransform;
    toEl.dataset.morphOriginalOpacity = originalOpacity;
    toEl.dataset.morphOriginalFontSize = originalFontSize;
    toEl.dataset.morphOriginalColor = originalColor;
    toEl.dataset.morphOriginalBg = originalBg;
    toEl.dataset.morphOriginalShadow = originalBoxShadow;
    toEl.dataset.morphOriginalRadius = originalBorderRadius;
    
    // Set initial opacity (no hiding - prevents flash)
    toEl.style.opacity = t.fromOpacity;
    
    // Snap to FROM position
    toEl.style.left = t.fromRect.x + 'px';
    toEl.style.top = t.fromRect.y + 'px';
    toEl.style.width = t.fromRect.w + 'px';
    toEl.style.height = t.fromRect.h + 'px';
    toEl.style.transform = `rotate(${t.fromRot}deg)`;
    toEl.style.transformOrigin = 'center center';
    toEl.style.willChange = 'transform, left, top, width, height, opacity, font-size, color, background-color, box-shadow, border-radius';
    
    // Snap font size if applicable
    if (t.fromFs && t.toFs) {
      toEl.style.fontSize = t.fromFs + 'px';
    }
    
    // Snap colors if applicable
    if (t.fromFill && t.toFill) {
      if (t.fromFill.startsWith('#') && t.toFill.startsWith('#')) {
        toEl.style.color = t.fromFill;
        toEl.style.backgroundColor = t.fromFill;
      } else if (t.fromFill === 'transparent' || t.fromFill === 'none') {
        toEl.style.color = 'transparent';
        toEl.style.backgroundColor = 'transparent';
      }
    }
    
    // Snap shadow if applicable
    if (t.fromShadow && t.toShadow) {
      toEl.style.boxShadow = t.fromShadow;
    }
    
    // Snap border-radius if applicable
    if (t.fromRadius != null && t.toRadius != null) {
      toEl.style.borderRadius = typeof t.fromRadius === 'number' ? `${t.fromRadius}px` : String(t.fromRadius);
    }
  });

  // Fade in enter elements
  enterPairs.forEach(({ toEl }) => {
    if (toEl) {
      toEl.style.opacity = '0';
      toEl.style.willChange = 'opacity';
    }
  });

  // Force reflow
  void document.body.offsetHeight;

  // Start animation immediately (elements are already visible at from positions)
  console.log('[Morph] Starting animation for', pairs.length, 'elements');
  function frame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = morphEase(progress);

    pairs.forEach((pair, i) => {
      const t = transforms[i];
      if (!t || !pair.toEl) return;
      const el = pair.toEl;
      
      const curX = t.fromRect.x + (t.toRect.x - t.fromRect.x) * ease;
      const curY = t.fromRect.y + (t.toRect.y - t.fromRect.y) * ease;
      const curW = t.fromRect.w + (t.toRect.w - t.fromRect.w) * ease;
      const curH = t.fromRect.h + (t.toRect.h - t.fromRect.h) * ease;
      const curRot = t.fromRot + (t.toRot - t.fromRot) * ease;
      
      el.style.left = curX + 'px';
      el.style.top = curY + 'px';
      el.style.width = curW + 'px';
      el.style.height = curH + 'px';
      el.style.transform = `rotate(${curRot}deg)`;

      // Interpolate font size
      if (t.fromFs && t.toFs) {
        const curFs = t.fromFs + (t.toFs - t.fromFs) * ease;
        el.style.fontSize = curFs + 'px';
      }

      // Interpolate opacity
      const curOpacity = t.fromOpacity + (t.toOpacity - t.fromOpacity) * ease;
      el.style.opacity = curOpacity;

      // Interpolate colors
      if (t.fromFill && t.toFill) {
        let curFill;
        if (t.fromFill.startsWith('#') && t.toFill.startsWith('#')) {
          curFill = lerpHexColor(t.fromFill, t.toFill, ease);
        } else if (t.fromFill === 'transparent' || t.fromFill === 'none') {
          curFill = 'transparent';
        } else {
          curFill = t.toFill;
        }
        const fillEl = el.querySelector('[data-fill]') || el;
        if (fillEl) {
          fillEl.style.fill = curFill;
          fillEl.style.backgroundColor = curFill;
        }
      }
      if (t.fromStroke && t.toStroke && t.fromStroke.startsWith('#') && t.toStroke.startsWith('#')) {
        const curStroke = lerpHexColor(t.fromStroke, t.toStroke, ease);
        const strokeEl = el.querySelector('[data-stroke]') || el;
        if (strokeEl) {
          strokeEl.style.stroke = curStroke;
        }
      }
      
      // Interpolate shadow
      if (t.fromShadow && t.toShadow) {
        const curShadow = lerpShadow(t.fromShadow, t.toShadow, ease);
        el.style.boxShadow = curShadow;
      }
      
      // Interpolate border-radius
      if (t.fromRadius != null && t.toRadius != null) {
        const curRadius = lerpRadius(t.fromRadius, t.toRadius, ease);
        el.style.borderRadius = curRadius;
      }
    });

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      // Cleanup - restore original styles
      console.log('[Morph] Cleanup');
      pairs.forEach(({ toEl }) => {
        if (toEl) {
          toEl.style.left = toEl.dataset.morphOriginalLeft || '';
          toEl.style.top = toEl.dataset.morphOriginalTop || '';
          toEl.style.width = toEl.dataset.morphOriginalWidth || '';
          toEl.style.height = toEl.dataset.morphOriginalHeight || '';
          toEl.style.transform = toEl.dataset.morphOriginalTransform || '';
          toEl.style.opacity = toEl.dataset.morphOriginalOpacity || '';
          toEl.style.fontSize = toEl.dataset.morphOriginalFontSize || '';
          toEl.style.color = toEl.dataset.morphOriginalColor || '';
          toEl.style.backgroundColor = toEl.dataset.morphOriginalBg || '';
          toEl.style.boxShadow = toEl.dataset.morphOriginalShadow || '';
          toEl.style.borderRadius = toEl.dataset.morphOriginalRadius || '';
          toEl.style.willChange = '';
          
          // Clean up dataset
          delete toEl.dataset.morphOriginalLeft;
          delete toEl.dataset.morphOriginalTop;
          delete toEl.dataset.morphOriginalWidth;
          delete toEl.dataset.morphOriginalHeight;
          delete toEl.dataset.morphOriginalTransform;
          delete toEl.dataset.morphOriginalOpacity;
          delete toEl.dataset.morphOriginalFontSize;
          delete toEl.dataset.morphOriginalColor;
          delete toEl.dataset.morphOriginalBg;
          delete toEl.dataset.morphOriginalShadow;
          delete toEl.dataset.morphOriginalRadius;
        }
      });
      
      // Fade in enter elements
      enterPairs.forEach(({ toEl }) => {
        if (toEl) {
          toEl.style.transition = 'opacity 200ms ease';
          toEl.style.opacity = '1';
          setTimeout(() => {
            toEl.style.transition = '';
          }, 200);
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
