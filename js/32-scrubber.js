// ══════════════ DRAG SCRUBBER for input[type=number] ══════════════
(function () {
  const THRESH = 4;
  const GSLIDER_H = 28;
  const GSLIDER_R = 4;

  function buildGsliderPath(w) {
    w = Math.max(48, Math.round(w) || 100);
    const R = GSLIDER_R;
    const xL = 4;
    const xLi = 7;
    const xR = w - 4;
    const xRi = w - 7;
    const yTL = 12;
    const yTR = 1.5;
    const yB = 27.5;
    const yMid = 15;
    return 'M ' + xLi + ' ' + yTL +
      ' L ' + xRi + ' ' + yTR +
      ' Q ' + xR + ' ' + yTR + ' ' + xR + ' ' + (yTR + R) +
      ' L ' + xR + ' ' + (yB - R) +
      ' Q ' + xR + ' ' + yB + ' ' + xRi + ' ' + yB +
      ' L ' + xLi + ' ' + yB +
      ' Q ' + xL + ' ' + yB + ' ' + xL + ' ' + (yB - R) +
      ' L ' + xL + ' ' + yMid +
      ' Q ' + xL + ' ' + yTL + ' ' + xLi + ' ' + yTL +
      ' Z';
  }

  function syncGsliderOuter(outer) {
    if (!outer) return;
    const w = Math.max(48, Math.round(outer.clientWidth) || 100);
    const svg = outer.querySelector('svg');
    if (!svg) return;
    const d = buildGsliderPath(w);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + GSLIDER_H);
    svg.querySelectorAll('path').forEach(function (p) { p.setAttribute('d', d); });
    const fill = outer.querySelector('.app-gslider-fill, .color-bar-gslider-fill');
    const inp = outer.querySelector('input[type=number], input[type=range]');
    if (fill && fill.tagName === 'rect' && inp && shouldFill(inp)) {
      fill.setAttribute('width', String(frac(inp) * w));
    }
  }

  function observeGsliderOuter(outer) {
    syncGsliderOuter(outer);
    if (outer._gsliderRo || typeof ResizeObserver === 'undefined') return;
    outer._gsliderRo = new ResizeObserver(function () { syncGsliderOuter(outer); });
    outer._gsliderRo.observe(outer);
  }

  let _gsliderUid = 0;

  function getStep(inp) { const s = parseFloat(inp.step); return (s > 0) ? s : 1; }
  function getMn(inp)   { const v = parseFloat(inp.min);  return isNaN(v) ? -Infinity : v; }
  function getMx(inp)   { const v = parseFloat(inp.max);  return isNaN(v) ?  Infinity : v; }

  function stepDec(inp) {
    const s = getStep(inp);
    if (s >= 1) return 0;
    return String(s).split('.')[1]?.length || 1;
  }

  function effectiveStep(inp, currentVal) {
    const base = getStep(inp);
    if (getMn(inp) >= 0 && base >= 1) {
      const abs = Math.abs(currentVal);
      if (abs < 0.1)  return 0.01;
      if (abs < 1)    return 0.1;
    }
    return base;
  }

  function frac(inp) {
    const lo = getMn(inp), hi = getMx(inp);
    const v = parseFloat(inp.value);
    if (inp.value === '' || isNaN(v)) return 0;
    if (!isFinite(lo) || !isFinite(hi) || hi === lo) return 0;
    return Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  }

  function shouldFill(inp) {
    if (!isFinite(getMn(inp)) || !isFinite(getMx(inp))) return false;
    if (inp.value === '') return false;
    const v = parseFloat(inp.value);
    if (isNaN(v)) return false;
    return true;
  }

  function shouldWrapGslider(inp) {
    if (!inp || inp.type !== 'number' || inp.dataset.noGslider === '1') return false;
    if (inp.closest('.app-gslider-outer, .color-bar-gslider-outer')) return false;
    if (inp.closest('.rx-box-vals, .pad-box-vals, .rx-box, .pad-box')) return false;
    const lo = getMn(inp), hi = getMx(inp);
    if (!isFinite(lo) || !isFinite(hi) || hi === lo) return false;
    if (/^p-rx-/.test(inp.id || '') || /^p-pad-/.test(inp.id || '')) return false;
    return true;
  }

  function clearGsliderInlineStyles(inp) {
    ['background', 'border', 'borderRadius', 'padding', 'fontSize', 'fontFamily',
      'width', 'minWidth', 'height', 'minHeight', 'flex', 'boxSizing', 'textAlign'].forEach(function (k) {
      inp.style[k] = '';
    });
  }

  function wrapGslider(inp) {
    if (inp.closest('.app-gslider-outer')) return inp.closest('.app-gslider-outer');
    if (!shouldWrapGslider(inp)) return null;
    const uid = 'ags-' + (++_gsliderUid);
    const seedW = 100;
    const seedD = buildGsliderPath(seedW);
    const outer = document.createElement('div');
    outer.className = 'app-gslider-outer';
    outer.innerHTML =
      '<svg class="app-gslider-svg" viewBox="0 0 ' + seedW + ' ' + GSLIDER_H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs>' +
      '<clipPath id="' + uid + '-clip"><path d="' + seedD + '"/></clipPath>' +
      '<linearGradient id="' + uid + '-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="0">' +
      '<stop offset="0%" stop-color="rgba(100,116,139,0)"/>' +
      '<stop offset="45%" stop-color="rgba(100,116,139,0.28)"/>' +
      '<stop offset="100%" stop-color="rgba(100,116,139,0.5)"/>' +
      '</linearGradient></defs>' +
      '<path class="app-gslider-bg-path" d="' + seedD + '"/>' +
      '<g clip-path="url(#' + uid + '-clip)"><rect class="app-gslider-fill" x="0" y="0" width="0" height="' + GSLIDER_H + '" fill="url(#' + uid + '-grad)"/></g>' +
      '<path class="app-gslider-stroke" d="' + seedD + '"/>' +
      '</svg>';
    const parent = inp.parentNode;
    if (!parent) return null;
    parent.insertBefore(outer, inp);
    outer.appendChild(inp);
    inp.classList.add('app-gslider-inp');
    clearGsliderInlineStyles(inp);
    observeGsliderOuter(outer);
    return outer;
  }

  function updateGsliderNumBg(inp) {
    const outer = inp.closest('.app-gslider-outer');
    if (!outer) return;
    let bg = outer.querySelector('.app-gslider-num-bg');
    if (!bg) {
      bg = document.createElement('span');
      bg.className = 'app-gslider-num-bg';
      outer.insertBefore(bg, inp);
    }
    const text = inp.value !== '' ? String(inp.value) : '0';
    const cs = getComputedStyle(inp);
    const padL = parseFloat(cs.paddingLeft) || 0;
    let probe = outer._gsliderProbe;
    if (!probe) {
      probe = document.createElement('span');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;pointer-events:none;';
      outer._gsliderProbe = probe;
      outer.appendChild(probe);
    }
    probe.style.font = cs.font;
    probe.style.fontSize = cs.fontSize;
    probe.style.fontWeight = cs.fontWeight;
    probe.style.fontFamily = cs.fontFamily;
    probe.textContent = text;
    const tw = probe.offsetWidth || 24;
    bg.style.left = Math.max(0, padL - 4) + 'px';
    bg.style.width = Math.max(20, tw + 8) + 'px';
  }

  function updateGsliderFill(inp) {
    const outer = inp.closest('.app-gslider-outer');
    if (!outer) return false;
    const fill = outer.querySelector('.app-gslider-fill');
    if (!fill) return false;
    const pct = shouldFill(inp) ? frac(inp) : 0;
    const w = Math.max(48, Math.round(outer.clientWidth) || 100);
    fill.setAttribute('width', String(pct * w));
    inp.style.background = '';
    inp.style.color = '';
    inp.style.textShadow = '';
    updateGsliderNumBg(inp);
    return true;
  }

  function fill(inp) {
    if (updateGsliderFill(inp)) return;
    const pct = Math.round(frac(inp) * 100);
    inp.style.background =
      'linear-gradient(to right,' +
      'rgba(100,116,139,.5) 0%,' +
      'rgba(100,116,139,.22) ' + pct + '%,' +
      'var(--surface2) ' + pct + '%)';
    inp.style.color = 'var(--text)';
    inp.style.textShadow = '';
  }

  function unfill(inp) {
    if (inp.closest('.app-gslider-outer')) {
      updateGsliderFill(inp);
      return;
    }
    inp.style.background = '';
    inp.style.color = '';
    inp.style.textShadow = '';
  }

  function valueFromClientX(inp, clientX) {
    const lo = getMn(inp), hi = getMx(inp);
    if (!isFinite(lo) || !isFinite(hi) || hi === lo) return parseFloat(inp.value) || 0;
    const rect = inp.getBoundingClientRect();
    if (rect.width <= 0) return parseFloat(inp.value) || lo;
    const fracX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    let v = lo + fracX * (hi - lo);
    const s = effectiveStep(inp, v);
    v = Math.round(v / s) * s;
    if (getMn(inp) >= 0 && getStep(inp) >= 1 && v < 0.005) v = 0;
    v = Math.max(lo, Math.min(hi, v));
    const thisDec = (getMn(inp) >= 0 && getStep(inp) >= 1 && Math.abs(v) < 1) ?
      (Math.abs(v) < 0.1 ? 3 : 2) : stepDec(inp);
    return parseFloat(v.toFixed(thisDec));
  }

  function applyValue(inp, v, lo, hi) {
    inp.value = v;
    if (isFinite(lo) && isFinite(hi)) fill(inp);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function beginScrub(e, usePointer) {
    const inp = e.target;
    if (!inp || inp.tagName !== 'INPUT' || inp.type !== 'number') return;
    if (!usePointer && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const lo = getMn(inp), hi = getMx(inp);
    const hasRange = isFinite(lo) && isFinite(hi);
    const dec = stepDec(inp);
    let scrubbing = false;
    let lastV = parseFloat(inp.value) || 0;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const v0 = lastV;
    const spd = hasRange ? 0 : getStep(inp);
    const moveEv = usePointer ? 'pointermove' : 'mousemove';
    const upEv = usePointer ? 'pointerup' : 'mouseup';
    const cancelEv = usePointer ? 'pointercancel' : null;
    const pid = usePointer ? e.pointerId : null;
    const gsliderOuter = inp.closest('.app-gslider-outer');

    function onMove(e2) {
      if (usePointer && e2.pointerId !== pid) return;
      const dx = e2.clientX - x0;
      const dy = e2.clientY - y0;
      if (!scrubbing) {
        if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) return;
        scrubbing = true;
        inp.blur();
        document.body.style.cursor = 'ew-resize';
        if (gsliderOuter) gsliderOuter.classList.add('is-scrubbing');
      }
      e2.preventDefault();
      e2.stopPropagation();

      if (hasRange) {
        const v = valueFromClientX(inp, e2.clientX);
        if (v === lastV) return;
        lastV = v;
        applyValue(inp, v, lo, hi);
        return;
      }

      const s = effectiveStep(inp, lastV);
      let v = v0 + dx * spd;
      v = Math.round(v / s) * s;
      if (getMn(inp) >= 0 && getStep(inp) >= 1 && v < 0.005) v = 0;
      v = Math.max(getMn(inp), Math.min(getMx(inp), v));
      const thisDec = (getMn(inp) >= 0 && getStep(inp) >= 1 && Math.abs(v) < 1) ?
        (Math.abs(v) < 0.1 ? 3 : 2) : dec;
      v = parseFloat(v.toFixed(thisDec));
      if (v === lastV) return;
      lastV = v;
      applyValue(inp, v, lo, hi);
    }

    function onUp(e2) {
      if (usePointer && e2.pointerId !== pid) return;
      document.removeEventListener(moveEv, onMove, true);
      document.removeEventListener(upEv, onUp, true);
      if (cancelEv) document.removeEventListener(cancelEv, onUp, true);
      document.body.style.cursor = '';
      if (gsliderOuter) gsliderOuter.classList.remove('is-scrubbing');

      if (!scrubbing) {
        inp.focus();
        inp.select();
        if (shouldFill(inp)) fill(inp);
        else unfill(inp);
        return;
      }
      if (hasRange && shouldFill(inp)) fill(inp);
    }

    document.addEventListener(moveEv, onMove, true);
    document.addEventListener(upEv, onUp, true);
    if (cancelEv) document.addEventListener(cancelEv, onUp, true);
  }

  document.addEventListener('mousedown', function (e) {
    beginScrub(e, false);
  }, true);

  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    beginScrub(e, true);
  }, true);

  document.addEventListener('dragstart', function (e) {
    if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'number') {
      e.preventDefault();
    }
  }, true);

  document.addEventListener('input', function (e) {
    const inp = e.target;
    if (!inp || inp.tagName !== 'INPUT' || inp.type !== 'number') return;
    if (shouldFill(inp)) fill(inp);
    else unfill(inp);
  }, true);

  document.addEventListener('focus', function (e) {
    const inp = e.target;
    if (!inp || inp.tagName !== 'INPUT' || inp.type !== 'number') return;
    const outer = inp.closest('.app-gslider-outer');
    if (outer) outer.classList.add('is-editing');
    if (shouldFill(inp)) fill(inp);
    else unfill(inp);
    setTimeout(function () { inp.select(); }, 0);
  }, true);

  document.addEventListener('blur', function (e) {
    const inp = e.target;
    if (!inp || inp.tagName !== 'INPUT' || inp.type !== 'number') return;
    const outer = inp.closest('.app-gslider-outer');
    if (outer) outer.classList.remove('is-editing');
    if (shouldFill(inp)) fill(inp);
    else unfill(inp);
  }, true);

  function prepareInput(inp) {
    if (!inp || inp.tagName !== 'INPUT' || inp.type !== 'number') return;
    wrapGslider(inp);
    const outer = inp.closest('.app-gslider-outer');
    if (outer) {
      clearGsliderInlineStyles(inp);
      observeGsliderOuter(outer);
    }
    if (shouldFill(inp)) fill(inp);
    else unfill(inp);
  }

  function initAll() {
    document.querySelectorAll('input[type=number]').forEach(prepareInput);
    document.querySelectorAll('.app-gslider-outer, .color-bar-gslider-outer').forEach(observeGsliderOuter);
  }

  window.buildGsliderPath = buildGsliderPath;
  window.syncGsliderOuter = syncGsliderOuter;
  window.syncAllGsliders = function () {
    document.querySelectorAll('.app-gslider-outer, .color-bar-gslider-outer').forEach(observeGsliderOuter);
  };

  window.refreshNumScrubber = function (inp) {
    prepareInput(inp);
  };

  window.addEventListener('load', function () {
    const orig = window.syncProps;
    if (orig) window.syncProps = function () { orig.apply(this, arguments); setTimeout(initAll, 0); };
    setTimeout(initAll, 200);
  });
})();
