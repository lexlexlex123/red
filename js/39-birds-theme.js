// ══════════════ BIRDS ANIMATED THEME ══════════════
(function() {
  const _INST = new Map(); // container → state

  const _CLOUD_PATHS = [
    'M18 58 Q8 48 14 36 Q4 28 20 24 Q26 10 48 14 Q64 6 82 18 Q98 8 118 20 Q138 14 154 26 Q172 20 182 36 Q192 42 180 54 Q196 60 174 60 Q162 70 142 64 Q118 74 92 66 Q68 72 48 62 Q32 68 18 58 Z',
    'M12 52 Q6 42 10 32 Q2 24 16 20 Q22 8 42 12 Q58 4 74 14 Q92 6 108 16 Q128 10 142 22 Q158 16 168 30 Q176 36 166 48 Q180 54 160 54 Q148 62 128 56 Q106 64 84 58 Q62 62 44 54 Q28 58 12 52 Z',
    'M22 50 Q14 42 18 34 Q10 28 24 24 Q30 14 46 16 Q60 10 72 18 Q86 12 98 20 Q112 16 124 26 Q136 22 144 32 Q152 38 144 46 Q156 50 140 50 Q130 56 116 52 Q98 58 82 54 Q66 58 52 52 Q38 56 22 50 Z'
  ];

  function _svgDataUri(tagInner, color) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" ' + tagInner + '>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function _cloudUri(path, color) {
    return _svgDataUri(
      'viewBox="0 0 200 80" fill="none" stroke="' + color + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="' + path + '"/>',
      color
    );
  }

  function _birdUri(color) {
    return _svgDataUri(
      'viewBox="0 0 48 24" fill="none" stroke="' + color + '" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 16 Q24 4 44 16"/>',
      color
    );
  }

  function _lerp(a, b, t) { return a + (b - a) * t; }
  function _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Облако: большое снизу-слева → маленькое у верхнего края (20%)
  function _cloudAt(t, W, H, lane) {
    const x0 = -0.18 * W - lane * 0.06 * W;
    const y0 = 1.06 * H + lane * 0.04 * H;
    const x1 = 0.72 * W + lane * 0.14 * W;
    const y1 = 0.20 * H - lane * 0.015 * H;
    const ease = t * t * (3 - 2 * t);
    const x = _lerp(x0, x1, ease);
    const y = _lerp(y0, y1, ease);
    const scale = _lerp(1.55 - lane * 0.08, 0.18 + lane * 0.02, ease);
    let opacity = 0.55 + lane * 0.04;
    const vanishY = 0.20 * H;
    if (y < vanishY + H * 0.06) {
      opacity *= _clamp((y - (vanishY - H * 0.02)) / (H * 0.08), 0, 1);
    }
    if (t > 0.92) opacity *= _clamp((1 - t) / 0.08, 0, 1);
    return { x, y, scale, opacity };
  }

  // Птица: маленькая сверху-справа → большая, уходит за нижний край
  function _birdAt(t, W, H, lane) {
    const x0 = 0.88 * W + lane * 0.08 * W;
    const y0 = 0.14 * H + lane * 0.05 * H;
    const x1 = -0.22 * W - lane * 0.05 * W;
    const y1 = 1.08 * H + lane * 0.03 * H;
    const ease = t * t * (3 - 2 * t);
    const x = _lerp(x0, x1, ease);
    const y = _lerp(y0, y1, ease);
    const scale = _lerp(0.22 + lane * 0.03, 1.35 + lane * 0.12, ease);
    const opacity = t < 0.04 ? t / 0.04 : (t > 0.94 ? _clamp((1 - t) / 0.06, 0, 1) : 1);
    const angle = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
    return { x, y, scale, opacity, angle };
  }

  function _makeCloud(W, H, color, lane, svgIdx) {
    const base = 110 + lane * 18;
    const el = document.createElement('img');
    el.draggable = false;
    el.src = _cloudUri(_CLOUD_PATHS[svgIdx % _CLOUD_PATHS.length], color);
    el.style.cssText = 'position:absolute;width:' + base + 'px;height:auto;pointer-events:none;transform-origin:center center;';
    return {
      el, lane, svgIdx,
      t: -Math.random() * 0.85,
      speed: 0.000028 + Math.random() * 0.000018
    };
  }

  function _makeBird(W, H, color, lane) {
    const base = 36 + lane * 4;
    const el = document.createElement('img');
    el.draggable = false;
    el.src = _birdUri(color);
    el.style.cssText = 'position:absolute;width:' + base + 'px;height:auto;pointer-events:none;transform-origin:center center;';
    return {
      el, lane,
      t: -Math.random() * 0.75,
      speed: 0.000055 + Math.random() * 0.000035,
      flapPhase: Math.random() * Math.PI * 2
    };
  }

  function _spawnCloud(st, W, H) {
    const lane = Math.floor(Math.random() * 5);
    const c = _makeCloud(W, H, st.color, lane, Math.floor(Math.random() * _CLOUD_PATHS.length));
    c.t = 0;
    st.layer.appendChild(c.el);
    return c;
  }

  function _spawnBird(st, W, H) {
    const lane = Math.floor(Math.random() * 4);
    const b = _makeBird(W, H, st.color, lane);
    b.t = 0;
    st.layer.appendChild(b.el);
    return b;
  }

  function _tick(st, ts) {
    if (!st.active || !st.container.isConnected) {
      _stopInstance(st.container);
      return;
    }
    const dt = Math.min(Math.max(0, ts - st.lastTime), 48);
    st.lastTime = ts;
    const W = st.container.offsetWidth || 960;
    const H = st.container.offsetHeight || 540;

    st.clouds.forEach((c, i) => {
      c.t += c.speed * dt;
      if (c.t > 1.05) {
        const neu = _spawnCloud(st, W, H);
        c.el.remove();
        st.clouds[i] = neu;
        c = neu;
      }
      if (c.t < 0) {
        c.el.style.opacity = '0';
        return;
      }
      const p = _cloudAt(_clamp(c.t, 0, 1), W, H, c.lane);
      c.el.style.opacity = String(p.opacity);
      c.el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) translate(-50%,-50%) scale(' + p.scale.toFixed(3) + ')';
    });

    st.birds.forEach((b, i) => {
      b.t += b.speed * dt;
      if (b.t > 1.05) {
        const neu = _spawnBird(st, W, H);
        b.el.remove();
        st.birds[i] = neu;
        b = neu;
      }
      if (b.t < 0) {
        b.el.style.opacity = '0';
        return;
      }
      const p = _birdAt(_clamp(b.t, 0, 1), W, H, b.lane);
      const flap = 1 + 0.07 * Math.sin(b.flapPhase + b.t * 28);
      b.el.style.opacity = String(0.75 * p.opacity);
      b.el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) translate(-50%,-50%) rotate(' + p.angle.toFixed(1) + 'deg) scale(' + (p.scale * flap).toFixed(3) + ')';
    });

    st.raf = requestAnimationFrame(function(ts2) { _tick(st, ts2); });
  }

  function _ensureLayer(container) {
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    let layer = container.querySelector('._birds-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = '_birds-layer';
      layer.style.cssText = 'position:absolute;inset:0;overflow:hidden;z-index:0;pointer-events:none;';
      container.appendChild(layer);
    }
    return layer;
  }

  function _stopInstance(container) {
    const st = _INST.get(container);
    if (!st) return;
    st.active = false;
    if (st.raf) cancelAnimationFrame(st.raf);
    if (st.layer && st.layer.parentNode) st.layer.remove();
    _INST.delete(container);
  }

  window._birdsThemeStart = function(container, opts) {
    if (!container) return;
    opts = opts || {};
    _stopInstance(container);

    const W = container.offsetWidth || 960;
    const H = container.offsetHeight || 540;
    const color = opts.color || '#2563eb';
    const layer = _ensureLayer(container);
    const st = {
      container, layer, color, active: true,
      lastTime: performance.now(),
      clouds: [], birds: [], raf: null
    };

    for (let i = 0; i < 5; i++) {
      const c = _makeCloud(W, H, color, i % 5, i);
      c.t = -Math.random() * 0.9;
      layer.appendChild(c.el);
      st.clouds.push(c);
    }
    for (let i = 0; i < 7; i++) {
      const b = _makeBird(W, H, color, i % 4);
      b.t = -Math.random() * 0.8;
      layer.appendChild(b.el);
      st.birds.push(b);
    }

    _INST.set(container, st);
    st.raf = requestAnimationFrame(function(ts) { _tick(st, ts); });
  };

  window._birdsThemeStop = function(container) {
    if (container) _stopInstance(container);
    else [..._INST.keys()].forEach(_stopInstance);
  };

  window._birdsThemeActive = function() { return _INST.size > 0; };

  window._birdsThemeSyncForSlide = function(el, s) {
    if (!el) return;
    if (s && s.bgImg && s.bgImg.src) {
      _birdsThemeStop(el);
      return;
    }
    const theme = (typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0 && typeof THEMES !== 'undefined')
      ? THEMES[appliedThemeIdx] : null;
    if (theme && theme.bgAnim === 'birds' && typeof _birdsThemeStart === 'function') {
      _birdsThemeStart(el, { color: theme.birdColor || theme.ac1 || '#2563eb' });
    } else if (typeof _birdsThemeStop === 'function') {
      _birdsThemeStop(el);
    }
  };
})();
