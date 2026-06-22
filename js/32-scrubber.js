// ══════════════ DRAG SCRUBBER for input[type=number] ══════════════
(function () {
  const THRESH = 4;

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

  function fill(inp) {
    const pct = Math.round(frac(inp) * 100);
    inp.style.background =
      'linear-gradient(to right,' +
      'var(--accent) 0%,' +
      'color-mix(in srgb,var(--accent) 45%,transparent) ' + pct + '%,' +
      'var(--surface2) ' + pct + '%)';
    inp.style.color = 'var(--text)';
    inp.style.textShadow = '0 0 6px rgba(0,0,0,.9)';
  }

  function unfill(inp) {
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

  function shouldFill(inp) {
    if (!isFinite(getMn(inp)) || !isFinite(getMx(inp))) return false;
    if (inp.value === '') return false;
    const v = parseFloat(inp.value);
    if (isNaN(v)) return false;
    return true;
  }

  document.addEventListener('mousedown', function (e) {
    const inp = e.target;
    if (!inp || inp.tagName !== 'INPUT' || inp.type !== 'number') return;
    if (e.button !== 0) return;

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

    function onMove(e2) {
      const dx = e2.clientX - x0;
      const dy = e2.clientY - y0;
      if (!scrubbing) {
        if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) return;
        scrubbing = true;
        inp.blur();
        document.body.style.cursor = 'ew-resize';
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
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup',   onUp,   true);
      document.body.style.cursor = '';

      if (!scrubbing) {
        inp.focus();
        inp.select();
        if (shouldFill(inp)) fill(inp);
        else unfill(inp);
        return;
      }
      if (hasRange && shouldFill(inp)) fill(inp);
    }

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup',   onUp,   true);
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
    if (shouldFill(inp)) fill(inp);
    setTimeout(() => inp.select(), 0);
  }, true);

  document.addEventListener('blur', function (e) {
    const inp = e.target;
    if (!inp || inp.tagName !== 'INPUT' || inp.type !== 'number') return;
    if (shouldFill(inp)) fill(inp);
    else unfill(inp);
  }, true);

  function initAll() {
    document.querySelectorAll('input[type=number]').forEach(inp => {
      if (shouldFill(inp)) fill(inp);
    });
  }

  window.refreshNumScrubber = function (inp) {
    if (!inp || inp.tagName !== 'INPUT' || inp.type !== 'number') return;
    if (shouldFill(inp)) fill(inp);
    else unfill(inp);
  };

  window.addEventListener('load', function () {
    const orig = window.syncProps;
    if (orig) window.syncProps = function () { orig.apply(this, arguments); setTimeout(initAll, 0); };
    setTimeout(initAll, 200);
  });
})();
