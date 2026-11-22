/** Build SVG markup for an icon library entry (legacy path format). */

export function resolveIconFillOp(fillOp, style) {
  if (style === 'outline') return 0;
  if (fillOp == null || fillOp === '') return 1;
  const n = +fillOp;
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

function paintAttrs(color, sw, fillOp) {
  const op = fillOp != null && fillOp < 1 ? ` fill-opacity="${fillOp}"` : '';
  if (fillOp != null && fillOp <= 0) {
    return `fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
  }
  return `fill="${color}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${op}`;
}

function mixedPathEl(part, color, sw, fillOp) {
  let d = part.trim();
  if (!d) return '';
  const swN = sw != null && Number.isFinite(+sw) ? Math.max(0, +sw) : 1.8;
  const strokeCap = 'stroke-linecap="round" stroke-linejoin="round"';
  if (d.startsWith('f:')) {
    d = d.slice(2);
    if (fillOp != null && fillOp <= 0) {
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${swN}" ${strokeCap}/>`;
    }
    const op = fillOp != null && fillOp < 1 ? ` fill-opacity="${fillOp}"` : '';
    // Duo: fill + stroke so thickness is visible (same as raw icons).
    if (fillOp != null && fillOp < 1 && swN > 0) {
      return `<path d="${d}" fill="${color}"${op} stroke="${color}" stroke-width="${swN}" ${strokeCap}/>`;
    }
    return `<path d="${d}" fill="${color}" stroke="none"${op}/>`;
  }
  if (d.startsWith('s:')) {
    d = d.slice(2);
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${swN}" ${strokeCap}/>`;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${swN}" ${strokeCap}/>`;
}

function usesMixed(paths) {
  return paths.some((p) => p.startsWith('f:') || p.startsWith('s:'));
}

function rawStrokeScale(ic) {
  const s = ic && ic.strokeScale != null ? +ic.strokeScale : NaN;
  return Number.isFinite(s) && s > 0 ? s : 7.5;
}

/** Recolor raw SVG inner markup (legacy `_paintRawIconInner`). */
export function paintRawIconInner(inner, color, sw, fillOp, strokeScale) {
  const duoOp = fillOp;
  const swN = sw != null && Number.isFinite(+sw) ? Math.max(0, +sw) : 1.8;
  const scale = strokeScale > 0 ? strokeScale : 7.5;
  const pathSw = swN * scale;
  const strokeCap = 'stroke-linecap="round" stroke-linejoin="round"';
  const uniformLineW = swN <= 0 ? 0 : +(0.12 * swN * scale).toFixed(4);
  const strokePaint =
    swN <= 0
      ? 'fill="none" stroke="none"'
      : `fill="none" stroke="${color}" stroke-width="${uniformLineW}" ${strokeCap}`;
  let s = String(inner || '');
  s = s.replace(/\sstyle="[^"]*"/gi, '');
  const hasLineLayers = /stroke-width="/i.test(s);
  if (!hasLineLayers) {
    let paint;
    if (duoOp <= 0) {
      paint =
        swN <= 0
          ? 'fill="none" stroke="none"'
          : `fill="none" stroke="${color}" stroke-width="${pathSw}" ${strokeCap}`;
    } else if (duoOp >= 1) {
      paint = `fill="${color}" stroke="none"`;
    } else {
      paint =
        swN <= 0
          ? `fill="${color}" fill-opacity="${duoOp}" stroke="none"`
          : `fill="${color}" fill-opacity="${duoOp}" stroke="${color}" stroke-width="${pathSw}" ${strokeCap}`;
    }
    s = s
      .replace(/\sfill="[^"]*"/gi, '')
      .replace(/\sfill-opacity="[^"]*"/gi, '')
      .replace(/\sstroke="[^"]*"/gi, '')
      .replace(/\sstroke-width="[^"]*"/gi, '')
      .replace(/\sstroke-linecap="[^"]*"/gi, '')
      .replace(/\sstroke-linejoin="[^"]*"/gi, '');
    s = s.replace(/<(path|polygon|polyline|circle|ellipse|rect|line)\b/gi, (_, name) => `<${name} ${paint}`);
    return s;
  }
  return s.replace(
    /<(path|polygon|polyline|circle|ellipse|rect|line)\b([^>]*?)\s*(\/?)\s*>/gi,
    (_, name, attrs, selfClose) => {
      const get = (key) => {
        const m = attrs.match(new RegExp(`\\s${key}="([^"]*)"`, 'i'));
        return m ? m[1] : null;
      };
      const fill = get('fill');
      const stroke = get('stroke');
      const swAttr = get('stroke-width');
      const dAttr = get('d') || '';
      const origSw = swAttr != null ? parseFloat(String(swAttr).replace(/px$/i, '')) : NaN;
      const hasOrigSw = Number.isFinite(origSw) && origSw > 0;
      const hasStroke = !!(stroke && stroke !== 'none') || hasOrigSw;
      const hasFill = !!(fill && fill !== 'none');
      const subpaths = (dAttr.match(/[Mm]/g) || []).length;
      const fillRule = (get('fill-rule') || get('fillRule') || '').toLowerCase();
      // evenodd logos (holes for eyes etc.) must stay filled — not converted to stroke.
      const complexFill =
        hasFill && !hasOrigSw && subpaths > 2 && fillRule !== 'evenodd';
      const a = attrs
        .replace(/\sfill="[^"]*"/gi, '')
        .replace(/\sfill-opacity="[^"]*"/gi, '')
        .replace(/\sstroke="[^"]*"/gi, '')
        .replace(/\sstroke-width="[^"]*"/gi, '')
        .replace(/\sstroke-linecap="[^"]*"/gi, '')
        .replace(/\sstroke-linejoin="[^"]*"/gi, '')
        .replace(/\sstroke-miterlimit="[^"]*"/gi, '');
      let paint;
      if (hasStroke && hasOrigSw) paint = strokePaint;
      else if (complexFill) paint = strokePaint;
      else if (hasFill) {
        if (duoOp <= 0) paint = strokePaint;
        else if (duoOp >= 1) paint = `fill="${color}" stroke="none"`;
        else paint = `fill="${color}" fill-opacity="${duoOp}" stroke="none"`;
      } else paint = 'fill="none" stroke="none"';
      return `<${name}${a} ${paint}${selfClose ? '/>' : '>'}`;
    }
  );
}

function buildRawIconSVG(ic, color, sw, fillOp) {
  if (!ic || !ic.svg) return '';
  let raw = String(ic.svg).trim();
  if (!raw) return '';
  const vb = ic.vb || '0 0 191.69 190.34';
  const duoOp = resolveIconFillOp(fillOp);
  const col = color || '#100f0d';
  const scale = rawStrokeScale(ic);
  const swN = sw != null && Number.isFinite(+sw) ? Math.max(0, +sw) : 1.8;
  const m = raw.match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/i);
  let attrs;
  let inner;
  if (m) {
    attrs = m[1]
      .replace(/\sstyle="[^"]*"/i, '')
      .replace(/\sfilter="[^"]*"/i, '')
      .replace(/\swidth="[^"]*"/i, '')
      .replace(/\sheight="[^"]*"/i, '');
    inner = m[2];
    if (!/viewBox=/i.test(attrs)) attrs += ` viewBox="${vb}"`;
  } else {
    attrs = ` viewBox="${vb}"`;
    inner = raw;
  }
  inner = paintRawIconInner(inner, col, sw, duoOp, scale);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg"${attrs} overflow="visible" style="width:100%;height:100%;overflow:visible">${inner}</svg>`;
  // Expand viewBox so thickness (stroke) is not clipped at the edges.
  // Solid fill: tiny pad for antialias. Outline / duo: pad by painted stroke width.
  let fitSw = 2;
  if (swN > 0 && duoOp < 1) {
    const srcHasSw = /stroke-width="/i.test(String(ic.svg || ''));
    fitSw = srcHasSw ? Math.max(2, 0.12 * swN * scale) : swN * scale;
  }
  const fit = fitIconSvgViewBox(svg, fitSw);
  if (fit) svg = fit.svg;
  return svg;
}

const _fitVbCache = new Map();

/** Expand declared viewBox by pad (no DOM). Always prevents stroke clipping. */
function expandSvgViewBox(svgStr, pad) {
  if (!svgStr) return null;
  const p = Math.max(0, +pad || 0);
  const m = String(svgStr).match(/\bviewBox="([^"]+)"/i);
  if (!m) return null;
  const parts = m[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  let [vx, vy, vw, vh] = parts;
  if (!(vw > 0) || !(vh > 0)) return null;
  vx -= p;
  vy -= p;
  vw += 2 * p;
  vh += 2 * p;
  const next = String(svgStr).replace(/\bviewBox="[^"]+"/i, `viewBox="${vx} ${vy} ${vw} ${vh}"`);
  return { svg: next, aspect: vw / vh };
}

/**
 * Pad SVG viewBox so stroke is not clipped. Prefers geometry fit when DOM is
 * available; always falls back to expanding the declared viewBox.
 * @returns {{svg:string,aspect:number}|null}
 */
export function fitIconSvgViewBox(svgStr, swVal) {
  if (!svgStr) return null;
  const swN =
    swVal != null && swVal !== '' && Number.isFinite(+swVal) ? Math.max(0, +swVal) : 1.8;
  const cacheKey = `${swN}::${svgStr}`;
  if (_fitVbCache.has(cacheKey)) return _fitVbCache.get(cacheKey);

  const store = (result) => {
    if (!result) return null;
    if (_fitVbCache.size > 400) _fitVbCache.clear();
    _fitVbCache.set(cacheKey, result);
    return result;
  };

  if (typeof document !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml');
      const src = doc.documentElement;
      if (src && src.tagName !== 'parsererror') {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:200px;height:200px;';
        const tmpSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const vbAttr = src.getAttribute('viewBox') || '0 0 24 24';
        tmpSvg.setAttribute('viewBox', vbAttr);
        tmpSvg.style.cssText = 'width:200px;height:200px;overflow:visible';
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        src.querySelectorAll('path,circle,ellipse,line,polyline,polygon,rect').forEach((n) => {
          g.appendChild(document.importNode(n, true));
        });
        if (g.childNodes.length) {
          tmpSvg.appendChild(g);
          wrap.appendChild(tmpSvg);
          document.body.appendChild(wrap);
          const bbox = g.getBBox();
          document.body.removeChild(wrap);
          if (bbox && bbox.width > 0 && bbox.height > 0) {
            // Full stroke width pad (not half): round caps/joins stick out past the
            // geometric half-width, and getBBox() ignores stroke.
            const pad = Math.max(0, swN);
            const vx = bbox.x - pad;
            const vy = bbox.y - pad;
            const vw = bbox.width + pad * 2;
            const vh = bbox.height + pad * 2;
            const next = svgStr.replace(/\bviewBox="[^"]+"/i, `viewBox="${vx} ${vy} ${vw} ${vh}"`);
            return store({ svg: next, aspect: vw / vh });
          }
        }
      }
    } catch (e) {
      /* fall through */
    }
  }

  return store(expandSvgViewBox(svgStr, swN));
}

export function buildIconSVG(ic, color = '#6366f1', sw = 1.8, fillOp = 1, pathOverride = null) {
  if (!ic) return '';
  if (ic.raw && ic.svg) return buildRawIconSVG(ic, color, sw, fillOp);
  const pathSrc = pathOverride != null ? pathOverride : ic.p || '';
  const paths = pathSrc.split('||').map((p) => p.trim()).filter(Boolean);
  const vb = ic.vb || '0 0 24 24';
  const duoOp = resolveIconFillOp(fillOp);
  const swN = sw != null && Number.isFinite(+sw) ? Math.max(0, +sw) : 1.8;
  let pathEls;
  let attrs;
  let fitSw = 2;
  if (usesMixed(paths)) {
    pathEls = paths.map((p) => mixedPathEl(p, color, swN, duoOp)).join('');
    attrs = 'fill="none"';
    // Outline / duo paint stroke; solid f: does not.
    if (swN > 0 && duoOp < 1) fitSw = swN;
  } else {
    pathEls = paths.map((p) => `<path d="${p}"/>`).join('');
    attrs = paintAttrs(color, swN, duoOp);
    // paintAttrs always strokes when sw > 0 (solid and outline).
    if (swN > 0) fitSw = swN;
  }
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${attrs} overflow="visible" style="width:100%;height:100%;overflow:visible"><g>${pathEls}</g></svg>`;
  const fit = fitIconSvgViewBox(svg, fitSw);
  if (fit) svg = fit.svg;
  return svg;
}
