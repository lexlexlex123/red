// Inkscape-based «Лес» layout (title + content). Rev 21: SVG-заливки из палитры 19/29 + приглушение.
window._FOREST_LAYOUT_REV = 21;
window._FOREST_DEBUG_COLORS = false;
window._FOREST_DEBUG_GRASS_PARTS = false;
window._buildForestInkscape = function(w, h, a1, a2, isTitle, doAnimate) {
  const uid = 'fr' + Math.random().toString(36).slice(2, 7);
  const rng = s => { let x = Math.sin(s * 127.1 + 311.7) * 43758.5; return x - Math.floor(x); };
  const f = n => n.toFixed(1);
  const FP = isTitle ? (window.FOREST_PATHS || null) : (window.FOREST_PATHS_CONTENT || null);
  if (!FP) return '';

  const vbStr = (FP && FP.viewBox) || '0 0 1002.3298 509.91534';
  const vbParts = vbStr.trim().split(/[\s,]+/).map(Number);
  const vbW = vbParts[2] || 1002.3298, vbH = vbParts[3] || 509.91534;

  const _thF = typeof _activeThemeForScheme === 'function' ? _activeThemeForScheme() : null;
  const _sw = (col, row, fb) => ((_thF && typeof _schemeSwatchColor === 'function' && _schemeSwatchColor(_thF, col, row)) || fb);
  const c18 = _sw(0, 7, a1);
  const c19 = _sw(0, 8, a2);
  const c29 = _sw(1, 8, a2);
  const isLight = _thF && _thF.dark === false;
  function _forestSlideBg() {
    try {
      const s = (typeof slides !== 'undefined' && typeof cur !== 'undefined') ? slides[cur] : null;
      if (s) {
        if (s.bgScheme != null && typeof _resolveSchemeColor === 'function') {
          const th = _activeThemeForScheme();
          const resolved = _resolveSchemeColor(s.bgScheme, th);
          if (resolved) return resolved;
        }
        if (s.bgc) return s.bgc;
      }
    } catch (e) {}
    return (_thF && _thF.bg) || '#1a1a1a';
  }
  const cFog = isLight ? _sw(7, 8, '#eeeeee') : _forestSlideBg();

  function _hexRgb(hex) {
    const h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
    if (h.length >= 6) return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    return null;
  }
  function _rgbHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function _blendHexColors(c1, c2, t) {
    const a = _hexRgb(c1), b = _hexRgb(c2);
    if (!a || !b) return c1 || c2 || '#000000';
    return _rgbHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  }
  function _lum(rgb) {
    if (!rgb) return 0;
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  function _forestSvgBackdrop() {
    const bg = (_thF && _thF.bg) || (isLight ? '#eef6ee' : '#0a2010');
    const stops = String(bg).match(/#([0-9a-f]{3}|[0-9a-f]{6})/gi);
    if (!stops || !stops.length) return isLight ? '#eef6ee' : '#0a2010';
    let pick = stops[0], pickL = _lum(_hexRgb(pick));
    for (let i = 1; i < stops.length; i++) {
      const L = _lum(_hexRgb(stops[i]));
      if (isLight ? L > pickL : L < pickL) { pickL = L; pick = stops[i]; }
    }
    return pick;
  }
  function _muteForestSvgFill(hex) {
    const backdrop = _forestSvgBackdrop();
    const muted = _blendHexColors(hex, backdrop, 0.5);
    if (_lum(_hexRgb(muted)) <= _lum(_hexRgb(hex)) + 1) return muted;
    if (typeof _parseHexRgb === 'function' && typeof _rgbToHsl === 'function' && typeof _hslToHex === 'function') {
      const rgb = _parseHexRgb(hex);
      if (!rgb) return hex;
      const hsl = _rgbToHsl(rgb[0], rgb[1], rgb[2]);
      return _hslToHex(hsl.h, hsl.s * 0.48, isLight ? hsl.l * 0.95 : hsl.l * 0.72);
    }
    return _blendHexColors(hex, isLight ? backdrop : '#000000', 0.45);
  }
  const c19Fill = _muteForestSvgFill(c19);
  const c29Fill = _muteForestSvgFill(c29);

  const fogOp = 0.80;
  const fogYOff = 200 * (h / 675);
  const fogYContent = 0;
  const fogBlurStd = Math.max(4, 32 * (h / 675));
  const fogBlurSoft = Math.max(8, 52 * (h / 675));
  const mistExtraY = h * 90 / 675;
  const fogBleed = Math.round(500 * w / 1200);
  const fogBleedVB = fogBleed * (vbW / w);

  const fogHScale = 0.7;

  function fogSpanSlide() { return w + fogBleed * 2; }
  function fogSpanVB() { return vbW + fogBleedVB * 2; }

  function fogShiftWrap(markup, bleed) {
    return '<g transform="translate(' + f(-bleed) + ',0)">' + markup + '</g>';
  }

  /** Облачный тайл — span шире слайда, bleed симметрично слева и справа. */
  function fogCloudTile(span, yFloor, yCeil, seed, baseOp, xBleed, slideW) {
    xBleed = xBleed != null ? xBleed : fogBleed;
    slideW = slideW != null ? slideW : w;
    const tileW = span * 0.72;
    const yMid = (yFloor + yCeil) * 0.5;
    const bandH = Math.max(10, (yFloor - yCeil) * fogHScale);
    const yTop = yMid - bandH * 0.5;
    const n = 11;
    let markup = '';
    for (let i = 0; i < n; i++) {
      const cx = xBleed + rng(seed + i * 1.73) * slideW;
      const cy = yTop + bandH * (0.12 + rng(seed + i * 2.19) * 0.78);
      const rx = tileW * (0.09 + rng(seed + i * 3.07) * 0.18);
      const ry = bandH * (0.32 + rng(seed + i * 4.31) * 0.58);
      const op = (baseOp * (0.32 + rng(seed + i * 5.47) * 0.68)).toFixed(2);
      const soft = i % 3 !== 1;
      const flt = soft ? ' filter="url(#' + uid + 'fogBlurSoft)"' : ' filter="url(#' + uid + 'fogBlur)"';
      markup += '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(rx) + '" ry="' + f(ry) +
        '" fill="url(#' + uid + 'fogG)"' + flt + ' opacity="' + op + '"/>';
    }
    // Bleed за правым краем слайда
    for (let j = 0; j < 5; j++) {
      const cx = (xBleed + slideW) + rng(seed + 90 + j * 2.11) * Math.max(40, xBleed);
      const cy = yTop + bandH * (0.15 + rng(seed + 100 + j * 1.87) * 0.7);
      const rx = tileW * (0.08 + rng(seed + 110 + j * 2.33) * 0.14);
      const ry = bandH * (0.28 + rng(seed + 120 + j * 1.61) * 0.5);
      const op = (baseOp * (0.22 + rng(seed + 130 + j * 2.77) * 0.55)).toFixed(2);
      markup += '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(rx) + '" ry="' + f(ry) +
        '" fill="url(#' + uid + 'fogG)" filter="url(#' + uid + 'fogBlurSoft)" opacity="' + op + '"/>';
    }
    // Bleed за левым краем слайда
    for (let j = 0; j < 5; j++) {
      const cx = rng(seed + 150 + j * 2.11) * Math.max(40, xBleed);
      const cy = yTop + bandH * (0.15 + rng(seed + 160 + j * 1.87) * 0.7);
      const rx = tileW * (0.08 + rng(seed + 170 + j * 2.33) * 0.14);
      const ry = bandH * (0.28 + rng(seed + 180 + j * 1.61) * 0.5);
      const op = (baseOp * (0.22 + rng(seed + 190 + j * 2.77) * 0.55)).toFixed(2);
      markup += '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(rx) + '" ry="' + f(ry) +
        '" fill="url(#' + uid + 'fogG)" filter="url(#' + uid + 'fogBlurSoft)" opacity="' + op + '"/>';
    }
    return { markup: markup, tileW: tileW };
  }

  function fogSeamlessBand(yFloor, yCeil, seed, durBase, layerOp, extraY) {
    extraY = extraY || 0;
    const yF = yFloor + fogYOff + fogYContent + extraY;
    const yC = yCeil + fogYOff + fogYContent + extraY;
    const op = layerOp != null ? layerOp : fogOp;
    const tile = fogCloudTile(fogSpanSlide(), yF, yC, seed, op, fogBleed, w);
    const tw = f(tile.tileW);
    if (!doAnimate) {
      return fogShiftWrap('<g transform="translate(' + f(-tile.tileW * 0.15) + ',0)">' + tile.markup + '</g>', fogBleed);
    }
    const dur = (durBase * (0.55 + rng(seed + 5) * 0.25)).toFixed(1);
    const beg = (-rng(seed + 11) * parseFloat(dur)).toFixed(2);
    return fogShiftWrap('<g>' +
      '<animateTransform attributeName="transform" type="translate" from="0 0" to="' + tw + ' 0" dur="' + dur + 's" begin="' + beg + 's" repeatCount="indefinite" calcMode="linear"/>' +
      '<g transform="translate(-' + tw + ',0)">' + tile.markup + '</g>' +
      '<g>' + tile.markup + '</g>' +
      '<g transform="translate(' + tw + ',0)">' + tile.markup + '</g>' +
      '</g>', fogBleed);
  }

  function fogSeamlessBandVB(yFloor, yCeil, seed, durBase, layerOp) {
    const op = layerOp != null ? layerOp : fogOp;
    const tile = fogCloudTile(fogSpanVB(), yFloor, yCeil, seed, op, fogBleedVB, vbW);
    const tw = f(tile.tileW);
    if (!doAnimate) {
      return fogShiftWrap('<g transform="translate(' + f(-tile.tileW * 0.15) + ',0)">' + tile.markup + '</g>', fogBleedVB);
    }
    const dur = (durBase * (0.55 + rng(seed + 5) * 0.25)).toFixed(1);
    const beg = (-rng(seed + 11) * parseFloat(dur)).toFixed(2);
    return fogShiftWrap('<g>' +
      '<animateTransform attributeName="transform" type="translate" from="0 0" to="' + tw + ' 0" dur="' + dur + 's" begin="' + beg + 's" repeatCount="indefinite" calcMode="linear"/>' +
      '<g transform="translate(-' + tw + ',0)">' + tile.markup + '</g>' +
      '<g>' + tile.markup + '</g>' +
      '<g transform="translate(' + tw + ',0)">' + tile.markup + '</g>' +
      '</g>', fogBleedVB);
  }

  function mistBeforeLayer2(extraY) {
    extraY = extraY || 0;
    return fogSeamlessBand(h * 1.08, h * 0.18, 0, 11, fogOp, extraY) +
      fogSeamlessBand(h * 1.02, h * 0.36, 1.9, 13.5, fogOp * 0.75, extraY);
  }

  function mistBeltMid() {
    return fogSeamlessBand(h * 1.05, h * 0.14, 2.4, 10, fogOp) +
      fogSeamlessBand(h * 1.02, h * 0.28, 4.1, 12.5, fogOp * 0.7);
  }

  function mistBeltFront() {
    return fogSeamlessBand(h * 1.16, h * 0.38, 0.7, 9, fogOp) +
      fogSeamlessBand(h * 1.10, h * 0.58, 5.0, 14, fogOp * 0.65);
  }

  function mistContentFogVB() {
    const yS = vbH / h;
    const yOff = (fogYOff + fogYContent) * yS;
    return fogSeamlessBandVB(vbH * 1.10 + yOff, vbH * 0.58 + yOff, 5.0, 11, fogOp) +
      fogSeamlessBandVB(vbH * 1.04 + yOff, vbH * 0.44 + yOff, 2.3, 13, fogOp * 0.75);
  }

  function fogBandGroup(markup) {
    return markup || '';
  }

  function extractById(html, id) {
    if (!html || !id) return '';
    const needle = 'id="' + id + '"';
    const at = html.indexOf(needle);
    if (at < 0) return '';
    const start = html.lastIndexOf('<', at);
    if (start < 0) return '';
    if (html.slice(start, start + 5) === '<path') {
      const gt = html.indexOf('>', at);
      if (gt < 0) return '';
      if (html.charAt(gt - 1) === '/') return html.slice(start, gt + 1);
      const end = html.indexOf('</path>', gt);
      return end < 0 ? '' : html.slice(start, end + 7);
    }
    if (html.slice(start, start + 2) !== '<g') return '';
    let i = html.indexOf('>', at) + 1, depth = 1;
    while (i < html.length && depth > 0) {
      const nextOpen = html.indexOf('<g', i);
      const nextClose = html.indexOf('</g>', i);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) { depth++; i = nextOpen + 2; }
      else { depth--; i = nextClose + 4; if (depth === 0) return html.slice(start, i); }
    }
    return '';
  }

  function removeById(html, id) {
    const chunk = extractById(html, id);
    return chunk ? html.replace(chunk, '') : html;
  }

  function nestDeerInTrees(trees, deer) {
    if (!deer) return trees || '';
    if (!trees) return deer;
    const close = trees.lastIndexOf('</g>');
    return close < 0 ? trees + deer : trees.slice(0, close) + deer + trees.slice(close);
  }

  function paintForestMarkup(html, color) {
    if (!html || !color) return html || '';
    let s = html
      .replace(/#d40000/gi, color)
      .replace(/#000000/gi, color)
      .replace(/fill="#000000"/gi, 'fill="' + color + '"')
      .replace(/fill='#000000'/gi, "fill='" + color + "'")
      .replace(/style="fill:#d40000"/gi, 'style="fill:' + color + '"')
      .replace(/style="fill:#000000"/gi, 'style="fill:' + color + '"')
      .replace(/style='fill:#d40000'/gi, "style='fill:" + color + "'")
      .replace(/style='fill:#000000'/gi, "style='fill:" + color + "'");
    // Явный fill на каждый path — style и attr должны совпадать, иначе браузер берёт style.
    s = s.replace(/<path\b([^>]*?)>/gi, (m, attrs) => {
      let a = attrs
        .replace(/\bfill="[^"]*"/gi, '')
        .replace(/\bfill='[^']*'/gi, '')
        .replace(/style="([^"]*)"/gi, (_, st) => {
          const ns = st.replace(/fill:[^;"']+/gi, 'fill:' + color);
          return 'style="' + (ns.includes('fill:') ? ns : (ns ? ns + ';' : '') + 'fill:' + color) + '"';
        })
        .replace(/style='([^']*)'/gi, (_, st) => {
          const ns = st.replace(/fill:[^;"']+/gi, 'fill:' + color);
          return "style='" + (ns.includes('fill:') ? ns : (ns ? ns + ';' : '') + 'fill:' + color) + "'";
        });
      if (!/style\s*=/i.test(a)) a = ' style="fill:' + color + '"' + a;
      return '<path fill="' + color + '"' + a + '>';
    });
    s = s.replace(/<g\b([^>]*?)>/gi, (m, attrs) => {
      if (/fill\s*=/i.test(attrs) || /fill\s*:/i.test(attrs)) {
        return m
          .replace(/\bfill="[^"]*"/gi, 'fill="' + color + '"')
          .replace(/\bfill='[^']*'/gi, "fill='" + color + "'");
      }
      return '<g fill="' + color + '"' + attrs + '>';
    });
    return s;
  }

  let contentParts = null;
  if (FP && FP.markup && !isTitle) {
    // g11102 — дерево справа; path10138 — олень; g9841/g9841-2 — цветы; path10598/10595 — трава
    const rightTree = extractById(FP.markup, 'g11102');
    const deerMk = extractById(FP.markup, 'path10138');
    const treesMk = removeById(extractById(FP.markup, 'g11470'), 'g11102');
    contentParts = {
      trees: treesMk,
      rightTree: rightTree,
      deer: deerMk,
      grassBase: extractById(FP.markup, 'path10598') + extractById(FP.markup, 'path10595'),
      flowers: extractById(FP.markup, 'g9841') + extractById(FP.markup, 'g9841-2'),
    };
  }

  const _dbg = !isTitle && window._FOREST_DEBUG_COLORS;
  const _dbgC = _dbg ? {
    trees: '#e6194b',
    rightTree: '#3cb44b',
    deer: '#f58231',
    grassBase: '#4363d8',
    flowers: '#911eb4',
  } : null;

  function forestLayer(fill, treesOp, canopyOp, yAlign, scaleX, xAlign, partMarkup) {
    if (!FP) return '';
    const hasMarkup = !!FP.markup;
    if (!hasMarkup && !FP.trees && !partMarkup) return '';
    scaleX = scaleX == null ? 1.22 : scaleX;
    const drawW = w * scaleX;
    const drawH = drawW * (vbH / vbW);
    const xOff = xAlign == null ? (w - drawW) / 2 : w * xAlign;
    const y = yAlign === 'bottom' ? (h - drawH)
      : (yAlign == null ? (h - drawH * 0.88) : (h * yAlign - drawH * 0.5));
    let g = '<svg x="' + f(xOff) + '" y="' + f(y) + '" width="' + f(drawW) + '" height="' + f(drawH) + '" viewBox="' + vbStr + '" preserveAspectRatio="xMidYMax meet" overflow="visible">';
    const gxf = FP.groupTransform || '';
    if (partMarkup) {
      g += '<g' + (gxf ? ' transform="' + gxf + '"' : '') + '>' + paintForestMarkup(partMarkup, fill) + '</g>';
    } else if (hasMarkup) {
      const wrap = (mode, op) => {
        if (op == null || !(+op > 0)) return '';
        let mk = FP.markup;
        if (mode === 'canopy') mk = mk.replace(/#d40000/gi, fill).replace(/#000000/gi, 'none');
        else mk = mk.replace(/#d40000/gi, 'none').replace(/#000000/gi, fill);
        return '<g' + (gxf ? ' transform="' + gxf + '"' : '') + ' opacity="' + op + '">' + mk + '</g>';
      };
      if (canopyOp != null && +canopyOp > 0) g += wrap('canopy', canopyOp);
      if (+treesOp > 0) g += wrap('trees', treesOp);
    } else {
      g += '<g fill="' + fill + '">';
      if (canopyOp != null && +canopyOp > 0 && FP.canopy) g += '<use href="#' + uid + 'canopyG" opacity="' + canopyOp + '"/>';
      if (+treesOp > 0) g += '<use href="#' + uid + 'treesG" opacity="' + treesOp + '"/>';
      g += '</g>';
    }
    g += '</svg>';
    return g;
  }

  // Покачивание (skewX от нижнего края viewBox) — трава и цветы с разной скоростью.
  function _swayChunkInner(markup, fill, seed, gxf, pivotX, pivotY) {
    if (!markup) return '';
    const painted = '<g fill="' + fill + '">' + paintForestMarkup(markup, fill) + '</g>';
    if (!doAnimate) {
      return '<g' + (gxf ? ' transform="' + gxf + '"' : '') + '>' + painted + '</g>';
    }
    const innerTf = 'translate(' + f(-pivotX) + ',' + f(-pivotY) + ')' + (gxf ? ' ' + gxf : '');
    const amp = (0.7 + rng(seed) * 1.1).toFixed(2);
    const dur = (3.2 + rng(seed + 3) * 3.8).toFixed(2);
    const beg = (-rng(seed + 5) * parseFloat(dur)).toFixed(2);
    const v0 = '0', v1 = amp, v2 = (-amp * 0.82).toFixed(2), v3 = (amp * 0.45).toFixed(2);
    return '<g transform="translate(' + f(pivotX) + ',' + f(pivotY) + ')">' +
      '<g>' +
      '<animateTransform attributeName="transform" type="skewX" values="' + v0 + ';' + v1 + ';' + v2 + ';' + v3 + ';' + v0 + '" keyTimes="0;0.25;0.5;0.75;1" dur="' + dur + 's" begin="' + beg + 's" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"/>' +
      '<g transform="' + innerTf + '">' + painted + '</g>' +
      '</g></g>';
  }

  // Весь доп. слайд: main (без дымки) + fog отдельно — z-order и выход за правый край.
  function forestContentLayers(parts, scaleX, xAlign) {
    if (!FP || !parts) return { back: '', fog: '', front: '' };
    scaleX = scaleX == null ? 1.22 : scaleX;
    const drawW = w * scaleX;
    const drawH = drawW * (vbH / vbW);
    const xOff = xAlign == null ? (w - drawW) / 2 : w * xAlign;
    const y = h - drawH;
    const gxf = FP.groupTransform || '';
    const pivotX = vbW / 2, pivotY = vbH;
    const wrap = (mk, fill) => {
      if (!mk) return '';
      return '<g fill="' + fill + '"' + (gxf ? ' transform="' + gxf + '"' : '') + '>' + paintForestMarkup(mk, fill) + '</g>';
    };
    const svgOpen = '<svg x="' + f(xOff) + '" y="' + f(y) + '" width="' + f(drawW) + '" height="' + f(drawH) + '" viewBox="' + vbStr + '" preserveAspectRatio="xMidYMax meet" overflow="visible">';
    let back = '', front = '', fog = '';
    if (_dbgC) {
      back += wrap(parts.trees, _dbgC.trees) + wrap(parts.rightTree, _dbgC.rightTree) + wrap(parts.deer, _dbgC.deer);
      fog = mistContentFogVB();
      front += wrap(parts.grassBase, _dbgC.grassBase) + _swayChunkInner(parts.flowers, _dbgC.flowers, 47, gxf, pivotX, pivotY);
    } else {
      back += wrap(parts.trees, c19Fill) + wrap(parts.rightTree, c19Fill) + wrap(parts.deer, c19Fill);
      fog = mistContentFogVB();
      front += wrap(parts.grassBase, c19Fill) + _swayChunkInner(parts.flowers, c29Fill, 47, gxf, pivotX, pivotY);
    }
    return {
      back: svgOpen + back + '</svg>',
      fog: svgOpen + fog + '</svg>',
      front: svgOpen + front + '</svg>'
    };
  }

  let inkDefs = '';
  if (FP && FP.trees && !FP.markup) {
    const gxf = FP.groupTransform || 'translate(187.09185,197.45552)';
    inkDefs = (FP.canopy ? '<g id="' + uid + 'canopyG" transform="' + gxf + '"><path d="' + FP.canopy + '"/></g>' : '') +
      '<g id="' + uid + 'treesG" transform="' + gxf + '"><path d="' + FP.trees + '"/></g>';
  }

  const defs = '<defs>' +
    '<linearGradient id="' + uid + 'sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + c18 + '" stop-opacity="0.04"/>' +
      '<stop offset="65%" stop-color="' + c19 + '" stop-opacity="0.08"/>' +
      '<stop offset="100%" stop-color="' + c19 + '" stop-opacity="0.20"/>' +
    '</linearGradient>' +
    '<linearGradient id="' + uid + 'fogG" x1="0" y1="1" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="' + cFog + '" stop-opacity="0.12"/>' +
      '<stop offset="18%" stop-color="' + cFog + '" stop-opacity="0.88"/>' +
      '<stop offset="38%" stop-color="' + cFog + '" stop-opacity="0.28"/>' +
      '<stop offset="58%" stop-color="' + cFog + '" stop-opacity="0.92"/>' +
      '<stop offset="78%" stop-color="' + cFog + '" stop-opacity="0.22"/>' +
      '<stop offset="100%" stop-color="' + cFog + '" stop-opacity="0.75"/>' +
    '</linearGradient>' +
    '<filter id="' + uid + 'fogBlur" x="-50%" y="-50%" width="200%" height="200%">' +
      '<feGaussianBlur stdDeviation="' + f(fogBlurStd) + '"/>' +
    '</filter>' +
    '<filter id="' + uid + 'fogBlurSoft" x="-60%" y="-60%" width="220%" height="220%">' +
      '<feGaussianBlur stdDeviation="' + f(fogBlurSoft) + '"/>' +
    '</filter>' +
    '<clipPath id="' + uid + 'cp"><rect width="' + w + '" height="' + h + '"/></clipPath>' +
    inkDefs +
    '</defs>';

  let rendered = '<g clip-path="url(#' + uid + 'cp)"><rect width="' + w + '" height="' + h + '" fill="url(#' + uid + 'sky)"/></g>';

  if (isTitle) {
    const sx = 1.28, ya = 0.66;
    rendered += fogBandGroup(mistBeforeLayer2(mistExtraY));
    rendered += '<g clip-path="url(#' + uid + 'cp)">' + forestLayer(c19Fill, '0', '1', ya, sx) + '</g>';
    rendered += fogBandGroup(mistBeltMid());
    rendered += '<g clip-path="url(#' + uid + 'cp)">' + forestLayer(c19Fill, '1', null, ya, sx) + '</g>';
    rendered += fogBandGroup(mistBeltFront());
  } else {
    const sx = 1.741, xa = -0.55 + 40 / w, yDown = 20;
    const P = contentParts || {};
    const layers = forestContentLayers(P, sx, xa);
    const tf = 'transform="translate(0,' + yDown + ')"';
    rendered += '<g clip-path="url(#' + uid + 'cp)" ' + tf + '>' + layers.back + '</g>';
    rendered += '<g ' + tf + '>' + fogBandGroup(layers.fog) + '</g>';
    rendered += '<g clip-path="url(#' + uid + 'cp)" ' + tf + '>' + layers.front + '</g>';
  }

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" overflow="hidden">' +
    defs + '<g clip-path="url(#' + uid + 'cp)">' + rendered + '</g></svg>';
};
