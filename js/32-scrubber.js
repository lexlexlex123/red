// ══════════════ DRAG SCRUBBER for input[type=number] ══════════════
(function () {
  const THRESH = 5;

  function getStep(inp) { const s = parseFloat(inp.step); return (s > 0) ? s : 1; }
  function getMn(inp)   { const v = parseFloat(inp.min);  return isNaN(v) ? -Infinity : v; }
  function getMx(inp)   { const v = parseFloat(inp.max);  return isNaN(v) ?  Infinity : v; }

  // Decimal places needed for a given step
  function stepDec(inp) {
    const s = getStep(inp);
    if (s >= 1) return 0;
    return String(s).split('.')[1]?.length || 1;
  }

  // Near-zero fine steps for positive-only inputs (e.g. font-size)
  function effectiveStep(inp, currentVal) {
    const base = getStep(inp);
    if (getMn(inp) >= 0 && base >= 1) {
      // Only apply fine steps near zero for integer-step inputs
      const abs = Math.abs(currentVal);
      if (abs < 0.1)  return 0.01;
      if (abs < 1)    return 0.1;
    }
    return base;
  }

  function frac(inp) {
    const lo = getMn(inp), hi = getMx(inp);
    if (!isFinite(lo) || !isFinite(hi) || hi === lo) return 0;
    return Math.max(0, Math.min(1, (parseFloat(inp.value) - lo) / (hi - lo)));
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

  document.addEventListener('mousedown', function (e) {
    const inp = e.target;
    if (!inp || inp.tagName !== 'INPUT' || inp.type !== 'number') return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const x0   = e.clientX;
    const v0   = parseFloat(inp.value) || 0;
    const lo   = getMn(inp), hi = getMx(inp);
    const spd  = (isFinite(lo) && isFinite(hi)) ? (hi - lo) / 200 : getStep(inp);
    const dec  = stepDec(inp);
    let scrubbing = false;
    let lastV = v0;

    function onMove(e2) {
      const dx = e2.clientX - x0;
      if (!scrubbing) {
        if (Math.abs(dx) < THRESH) return;
        scrubbing = true;
        inp.blur();
        document.body.style.cursor = 'ew-resize';
      }
      e2.preventDefault();
      e2.stopPropagation();

      const s = effectiveStep(inp, lastV);
      let v = v0 + dx * spd;
      v = Math.round(v / s) * s;
      // snap to 0 for positive-only near-zero
      if (getMn(inp) >= 0 && getStep(inp) >= 1 && v < 0.005) v = 0;
      v = Math.max(getMn(inp), Math.min(getMx(inp), v));
      // use step decimal places (or fine dec near zero)
      const thisDec = (getMn(inp) >= 0 && getStep(inp) >= 1 && Math.abs(v) < 1) ?
        (Math.abs(v) < 0.1 ? 3 : 2) : dec;
      v = parseFloat(v.toFixed(thisDec));
      lastV = v;

      inp.value = v;
      if (isFinite(lo) && isFinite(hi)) fill(inp);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup',   onUp,   true);
      document.body.style.cursor = '';
      if (!scrubbing) {
        inp.focus();
        inp.select();
        unfill(inp);
      }
    }

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup',   onUp,   true);
  }, true);

  // Prevent browser from treating scrub as element drag
  document.addEventListener('dragstart', function (e) {
    if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'number') {
      e.preventDefault();
    }
  }, true);

  document.addEventListener('input', function (e) {
    const inp = e.target;
    if (!inp || inp.tagName !== 'INPUT' || inp.type !== 'number') return;
    if (document.activeElement === inp) return;
    if (isFinite(getMn(inp)) && isFinite(getMx(inp))) fill(inp);
  }, true);

  document.addEventListener('focus', function (e) {
    const inp = e.target;
    if (!inp || inp.tagName !== 'INPUT' || inp.type !== 'number') return;
    unfill(inp);
    setTimeout(() => inp.select(), 0);
  }, true);

  document.addEventListener('blur', function (e) {
    const inp = e.target;
    if (!inp || inp.tagName !== 'INPUT' || inp.type !== 'number') return;
    if (isFinite(getMn(inp)) && isFinite(getMx(inp)) && inp.value !== '') fill(inp);
  }, true);

  function initAll() {
    document.querySelectorAll('input[type=number]').forEach(inp => {
      if (isFinite(getMn(inp)) && isFinite(getMx(inp)) && inp.value !== '') fill(inp);
    });
  }

  window.addEventListener('load', function () {
    const orig = window.syncProps;
    if (orig) window.syncProps = function () { orig.apply(this, arguments); setTimeout(initAll, 0); };
    setTimeout(initAll, 200);
  });
})();
