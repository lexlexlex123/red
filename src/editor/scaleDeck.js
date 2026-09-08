/** Scale a deck so it fills a different canvas and still looks the same. */

import { lineCanvasEnds, applyLineFromCanvasEnds, migrateLineCapGeometry } from './lineGeom.js';

function rnd(n) {
  return Math.round(n);
}

function scaleCssLens(css, s) {
  if (!css || s === 1) return css;
  return String(css).replace(
    /(font-size|letter-spacing|padding(?:-[a-z]+)?|margin(?:-[a-z]+)?|border(?:-[a-z]+)?-width|stroke-width|line-height)\s*:\s*([\d.]+)px/gi,
    (_, prop, n) => `${prop}:${Math.max(prop.toLowerCase().includes('font') ? 1 : 0, rnd(+n * s))}px`
  );
}

function scaleHtml(html, s) {
  if (!html || s === 1) return html;
  return String(html).replace(/font-size\s*:\s*([\d.]+)px/gi, (_, n) => `font-size:${Math.max(1, rnd(+n * s))}px`);
}

function scalePt(p, sx, sy) {
  if (!p) return p;
  if (Array.isArray(p)) return [rnd((p[0] || 0) * sx), rnd((p[1] || 0) * sy)];
  return { ...p, x: rnd((p.x || 0) * sx), y: rnd((p.y || 0) * sy) };
}

function scaleEl(d, sx, sy, sf, W, H) {
  if (!d) return d;
  const next = { ...d };
  if (next._isDecor) {
    next.w = W;
    next.h = H;
    return next;
  }

  // Lines: scale canvas endpoints, then rebuild box/rot (uniform or not).
  if (next.type === 'shape' && next.shape === 'line') {
    if (next.sw != null) next.sw = Math.max(0, Math.round((+next.sw || 0) * sf * 10) / 10);
    let el = next;
    if (el._lineCapV !== 2) {
      const mig = migrateLineCapGeometry(el);
      if (mig) el = { ...el, ...mig };
    }
    const ends = lineCanvasEnds(el);
    const geom = applyLineFromCanvasEnds(
      el,
      { x: ends.a.x * sx, y: ends.a.y * sy },
      { x: ends.b.x * sx, y: ends.b.y * sy },
      null
    );
    Object.assign(next, geom);
    // Do not clamp line boxes — independent clamps break joined endpoints.
    return next;
  }

  // Angle markers follow lines; keep radius in canvas px, skip box clamp.
  if (next.type === 'lineangle') {
    next.x = rnd((next.x || 0) * sx);
    next.y = rnd((next.y || 0) * sy);
    next.w = Math.max(1, rnd((next.w || 80) * sx));
    next.h = Math.max(1, rnd((next.h || 80) * sy));
    if (next.radius != null) next.radius = Math.max(8, rnd((+next.radius || 36) * sf));
    if (next.labelFs != null) next.labelFs = Math.max(6, Math.min(72, rnd((+next.labelFs || 18) * sf)));
    return next;
  }

  next.x = rnd((next.x || 0) * sx);
  next.y = rnd((next.y || 0) * sy);
  next.w = Math.max(1, rnd((next.w || 100) * sx));
  next.h = Math.max(1, rnd((next.h || 60) * sy));
  if (next.cs) next.cs = scaleCssLens(next.cs, sf);
  if (next.shapeTextCss) next.shapeTextCss = scaleCssLens(next.shapeTextCss, sf);
  if (next.html) next.html = scaleHtml(next.html, sf);
  if (next.shapeHtml) next.shapeHtml = scaleHtml(next.shapeHtml, sf);
  if (next.mdHtml) next.mdHtml = scaleHtml(next.mdHtml, sf);
  if (next.sw != null) next.sw = Math.max(0, Math.round((+next.sw || 0) * sf * 10) / 10);
  if (next.rx != null) next.rx = rnd((+next.rx || 0) * sf);
  if (next.bulletGap != null) next.bulletGap = rnd((+next.bulletGap || 0) * sf);
  if (next.codeFs != null) next.codeFs = Math.max(8, rnd((+next.codeFs || 14) * sf));
  if (next._origFs != null) next._origFs = Math.max(1, rnd((+next._origFs || 0) * sf));
  if (next.iconSize != null) next.iconSize = rnd((+next.iconSize || 0) * sf);
  if (next.cp1) next.cp1 = scalePt(next.cp1, sx, sy);
  if (next.cp2) next.cp2 = scalePt(next.cp2, sx, sy);
  if (next.x + (next.w || 0) > W) next.x = Math.max(0, W - (next.w || 0));
  if (next.y + (next.h || 0) > H) next.y = Math.max(0, H - (next.h || 0));
  if (next.x < 0) next.x = 0;
  if (next.y < 0) next.y = 0;
  return next;
}

function scaleInkStroke(st, sx, sy, sf) {
  if (!st?.points) return st;
  return {
    ...st,
    width: st.width != null ? Math.max(1, rnd(st.width * sf)) : st.width,
    points: st.points.map((p) => scalePt(p, sx, sy)),
  };
}

function scaleInkFill(fill, sx, sy) {
  if (!fill) return fill;
  const points = (fill.points || []).map((p) => ({
    x: rnd((p.x || 0) * sx),
    y: rnd((p.y || 0) * sy),
  }));
  const d = points.length
    ? `M${points.map((p, i) => `${i ? 'L' : ''}${p.x},${p.y}`).join('')}Z`
    : fill.d;
  return { ...fill, points, d };
}

function scaleCam(cam, sx, sy) {
  if (!cam) return cam;
  return {
    ...cam,
    cx: rnd((+cam.cx || 0) * sx),
    cy: rnd((+cam.cy || 0) * sy),
    w: Math.max(8, rnd((+cam.w || 0) * sx)),
    h: Math.max(8, rnd((+cam.h || 0) * sy)),
  };
}

function scaleConn(conn, sx, sy, sf) {
  if (!conn) return conn;
  const next = { ...conn };
  if (next.cp1) next.cp1 = scalePt(next.cp1, sx, sy);
  if (next.cp2) next.cp2 = scalePt(next.cp2, sx, sy);
  if (next.sw != null) next.sw = Math.max(0.5, Math.round((+next.sw || 2) * sf * 10) / 10);
  if (next.gap != null) next.gap = rnd((+next.gap || 0) * sf);
  return next;
}

/**
 * Map slides from (fromW×fromH) onto (toW×toH). Positions, boxes, type and
 * ink scale so the layout looks the same on the editor canvas.
 */
export function scaleSlidesToCanvas(slides, fromW, fromH, toW, toH) {
  const oldW = Math.max(1, Math.round(+fromW || 1));
  const oldH = Math.max(1, Math.round(+fromH || 1));
  const W = Math.max(1, Math.round(+toW || oldW));
  const H = Math.max(1, Math.round(+toH || oldH));
  if (!Array.isArray(slides) || (oldW === W && oldH === H)) return slides;
  const sx = W / oldW;
  const sy = H / oldH;
  const sf = Math.sqrt(sx * sy);
  return slides.map((s) => {
    if (!s) return s;
    return {
      ...s,
      els: (s.els || []).map((d) => scaleEl(d, sx, sy, sf, W, H)),
      ink: (s.ink || []).map((st) => scaleInkStroke(st, sx, sy, sf)),
      inkFills: (s.inkFills || []).map((fill) => scaleInkFill(fill, sx, sy)),
      cameras: (s.cameras || []).map((c) => scaleCam(c, sx, sy)),
      connectors: (s.connectors || []).map((c) => scaleConn(c, sx, sy, sf)),
    };
  });
}
