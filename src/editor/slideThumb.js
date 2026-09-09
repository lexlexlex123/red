/** Lightweight canvas thumbnail of a slide (no snapdom). */

import { buildIconSVG } from './iconSvg.js';
import { iconPathForRender } from './iconAnim.js';
import { ensureIcons, getIconById, iconsReady } from './iconsLazy.js';
import { CODE_THEMES } from './codeHighlight.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';
import { brushStamps, fillBrushStamps, hardStrokeGeom, normalizeInkPoints, isBrushFamily } from './inkBrush.js';
import { drawSlideBgImgOnCanvas, scaleBgImgForCanvas } from './slideBgImg.js';
import { hasTextBg, toRgba } from './textBg.js';
import { lineCanvasEnds } from './lineGeom.js';
import { buildLineAngleDrawModel } from './lineAngle.js';
import { tableCellBg } from './tableCells.js';

const formulaImgCache = new Map();
const formulaPending = new Set();
const graphImgCache = new Map();
const graphPending = new Set();
const thumbImgCache = new Map();
const thumbImgPending = new Set();
const thumbIconCache = new Map();
const thumbIconPending = new Set();
const thumbSvgElCache = new Map();
const thumbSvgElPending = new Set();
let iconsPrefetchStarted = false;
let thumbCacheGen = 0;
const THUMB_SVG_HEAVY = 120000;

/** Drop rasterized SVG/icon thumbs after a scheme/layout change (v7.1 invalidateThumbCache). */
export function invalidateThumbCaches() {
  thumbCacheGen += 1;
  formulaImgCache.clear();
  formulaPending.clear();
  graphImgCache.clear();
  graphPending.clear();
  thumbSvgElCache.clear();
  thumbSvgElPending.clear();
  thumbIconCache.clear();
  thumbIconPending.clear();
  return thumbCacheGen;
}

export function thumbCacheGeneration() {
  return thumbCacheGen;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/** Extract text lines from HTML, preserving <div> and <br> breaks. */
function htmlToLines(html) {
  const s = String(html || '');
  // Replace <br> with a unique line break marker
  let t = s.replace(/<br\s*\/?>/gi, '\n');
  // Replace closing </div> with line break
  t = t.replace(/<\/div>/gi, '\n');
  // Strip remaining tags
  t = t.replace(/<[^>]+>/g, '');
  // Decode entities
  t = t.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
  // Split by newlines, filter empty, trim
  return t.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
}

function parseColorFromCs(cs, fallback = '#ffffff') {
  const m = String(cs || '').match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  return m ? m[1].trim() : fallback;
}

function loadThumbImage(cache, pending, key, src, onReady) {
  if (!src) return null;
  if (cache.has(key)) return cache.get(key);
  if (pending.has(key)) return null;
  pending.add(key);
  const img = new Image();
  img.onload = () => {
    cache.set(key, img);
    pending.delete(key);
    if (typeof onReady === 'function') onReady();
  };
  img.onerror = () => {
    pending.delete(key);
  };
  img.src = src;
  return null;
}

/** Approximate CSS backdrop-filter blur under a box (thumbs have no CSS). */
function applyThumbBackdropBlur(ctx, x, y, w, h, blurPx, clipFn) {
  const b = Math.max(0, +blurPx || 0);
  if (b < 0.35 || w < 1 || h < 1) return;
  const pad = Math.ceil(b * 2);
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const sx = Math.max(0, Math.floor(x - pad));
  const sy = Math.max(0, Math.floor(y - pad));
  const sw = Math.min(cw - sx, Math.ceil(w + pad * 2 + (x - sx)));
  const sh = Math.min(ch - sy, Math.ceil(h + pad * 2 + (y - sy)));
  if (sw < 1 || sh < 1) return;
  try {
    const tmp = document.createElement('canvas');
    tmp.width = sw;
    tmp.height = sh;
    tmp.getContext('2d').drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    if (typeof clipFn === 'function') clipFn();
    else {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
    }
    ctx.filter = `blur(${b}px)`;
    ctx.drawImage(tmp, sx, sy);
    ctx.restore();
  } catch (e) {}
}

function clipThumbBox(ctx, x, y, w, h, el, sx) {
  ctx.beginPath();
  if (el?.shape === 'ellipse' || el?.shape === 'circle') {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else {
    const rx = Math.min(w, h, (el?.rx != null ? el.rx : 4) * (sx || 1));
    roundRect(ctx, x, y, w, h, rx);
  }
  ctx.clip();
}

function fillThumbTextBg(ctx, el, x, y, w, h, sx, sy) {
  if (!hasTextBg(el)) return;
  const sc = Math.min(sx, sy);
  const blur = Math.max(0, +(el.textBgBlur || 0)) * sc;
  applyThumbBackdropBlur(ctx, x, y, w, h, blur, () => clipThumbBox(ctx, x, y, w, h, el, sx));
  const op = el.textBgOp != null ? +el.textBgOp : 1;
  const col = el.textBg;
  if (!col && !el.textBgGrad) return;
  ctx.save();
  if (el.textBgGrad && col) {
    const dir = el.textBgDir != null ? +el.textBgDir : 90;
    const rad = (dir * Math.PI) / 180;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const len = Math.sqrt(w * w + h * h) / 2;
    const grad = ctx.createLinearGradient(
      cx - Math.sin(rad) * len,
      cy + Math.cos(rad) * len,
      cx + Math.sin(rad) * len,
      cy - Math.cos(rad) * len
    );
    grad.addColorStop(0, toRgba(col, op));
    grad.addColorStop(1, el.textBgCol2 ? toRgba(el.textBgCol2, op) : 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
  } else if (col) {
    ctx.fillStyle = toRgba(col, op);
  } else {
    ctx.restore();
    return;
  }
  clipThumbBox(ctx, x, y, w, h, el, sx);
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function formulaSvgToBlobUrl(formulaSvg, color, w, h) {
  const colored = String(formulaSvg || '').replace(/currentColor/g, color || '#ffffff');
  const blob = new Blob(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(1, Math.round(w))}" height="${Math.max(1, Math.round(h))}">` +
        `<foreignObject width="100%" height="100%">` +
        `<div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${color || '#fff'};">` +
        colored +
        `</div></foreignObject></svg>`,
    ],
    { type: 'image/svg+xml;charset=utf-8' }
  );
  return URL.createObjectURL(blob);
}

/**
 * Draw a compact preview of `slide` into `canvas`.
 * @param {HTMLCanvasElement} canvas
 * @param {object} slide
 * @param {number} canvasW
 * @param {number} canvasH
 * @param {{ onAsyncReady?: () => void }} [opts]
 */
export function drawSlideThumb(canvas, slide, canvasW = DEFAULT_CANVAS_W, canvasH = DEFAULT_CANVAS_H, opts = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const onReady = opts.onAsyncReady;
  const W = canvas.width || 160;
  const H = canvas.height || 90;
  const sx = W / (canvasW || DEFAULT_CANVAS_W);
  const sy = H / (canvasH || DEFAULT_CANVAS_H);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, W, H);
  fillThumbBackground(ctx, W, H, slide?.bgc);

  const bgObj = slide?.bgImg;
  const bgSrc =
    typeof bgObj === 'string'
      ? bgObj
      : bgObj?.src || bgObj?.exportBaked || '';
  if (bgSrc) {
    const bgCached = thumbImgCache.get(bgSrc);
    if (bgCached) {
      const scaled =
        typeof bgObj === 'object' && bgObj
          ? scaleBgImgForCanvas(bgObj, W, H, canvasW, canvasH)
          : { src: bgSrc, mode: 'cover', opacity: 1, blur: 0 };
      drawSlideBgImgOnCanvas(ctx, scaled, W, H, bgCached);
    } else {
      loadThumbImage(thumbImgCache, thumbImgPending, bgSrc, bgSrc, onReady);
    }
  }

  const els = (slide?.els || []).filter((e) => e && !e.objHidden);
  const angleEls = [];
  const ordered = [
    ...els.filter((e) => e._isDecor),
    ...els.filter((e) => !e._isDecor && e.type !== 'lineangle'),
  ];
  els.forEach((e) => {
    if (e.type === 'lineangle') angleEls.push(e);
  });
  ordered.forEach((el) => {
    const x = (el.x || 0) * sx;
    const y = (el.y || 0) * sy;
    const w = Math.max(1, (el.w || 40) * sx);
    const h = Math.max(1, (el.h || 24) * sy);
    const op = Math.max(0, Math.min(1, el.elOpacity != null ? +el.elOpacity : 1));
    ctx.save();
    ctx.globalAlpha = op;

    if (el.type === 'shape' && el.shape === 'line') {
      drawThumbLine(ctx, el, sx, sy, op);
    } else if (el.type === 'shape') {
      const fill = el.fill && el.fill !== 'none' ? el.fill : 'transparent';
      const fillOp = el.fillOp != null ? +el.fillOp : 1;
      const sb = Math.max(0, +(el.shapeBlur || 0)) * Math.min(sx, sy);
      applyThumbBackdropBlur(ctx, x, y, w, h, sb, () => clipThumbBox(ctx, x, y, w, h, el, sx));
      if (fill !== 'transparent' && fillOp > 0) {
        ctx.save();
        ctx.globalAlpha = op * Math.max(0, Math.min(1, fillOp));
        ctx.fillStyle = fill.charAt(0) === '#' ? toRgba(fill, 1) : fill;
        if (el.shape === 'ellipse' || el.shape === 'circle') {
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const rx = Math.min(w, h, (el.rx != null ? el.rx : 4) * sx);
          roundRect(ctx, x, y, w, h, rx);
          ctx.fill();
        }
        ctx.restore();
      }
      if (el.stroke && el.stroke !== 'none' && (el.sw || 0) > 0) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = Math.max(0.5, (el.sw || 2) * sx);
        if (el.shape === 'ellipse' || el.shape === 'circle') {
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          roundRect(ctx, x, y, w, h, Math.min(w, h, (el.rx != null ? el.rx : 4) * sx));
          ctx.stroke();
        }
      }
    } else if (el.type === 'image') {
      drawThumbElImage(ctx, el, x, y, w, h, sx, sy, onReady);
    } else if (el.type === 'icon') {
      drawThumbElIcon(ctx, el, x, y, w, h, onReady);
    } else if (el.type === 'table') {
      drawThumbElTable(ctx, el, x, y, w, h, sx, sy);
    } else if (el.type === 'code') {
      drawThumbElCode(ctx, el, x, y, w, h, sx, sy);
    } else if (el.type === 'htmlframe') {
      ctx.fillStyle = '#e8eaed';
      ctx.fillRect(x, y, w, Math.min(h, 10 * sy));
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y + Math.min(h, 10 * sy), w, Math.max(0, h - 10 * sy));
    } else if (el.type === 'mediavideo' || el.type === 'mediaaudio') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.4, y + h * 0.3);
      ctx.lineTo(x + w * 0.7, y + h * 0.5);
      ctx.lineTo(x + w * 0.4, y + h * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (el.type === 'graph') {
      const gkey = `graph_${el.id}_${(el.graphImg || '').length}`;
      const cached = graphImgCache.get(gkey);
      if (cached) {
        try {
          ctx.drawImage(cached, x, y, w, h);
        } catch (e) {}
      } else if (el.graphImg) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x, y, w, h);
        loadThumbImage(graphImgCache, graphPending, gkey, el.graphImg, onReady);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + h * 0.7);
        ctx.quadraticCurveTo(x + w * 0.4, y + 2, x + w - 2, y + h * 0.35);
        ctx.stroke();
      }
    } else if (el.type === 'formula') {
      const color = el.formulaColor || el.textColor || '#ffffff';
      fillThumbTextBg(ctx, el, x, y, w, h, sx, sy);
      if (el.formulaSvg) {
        const fkey = `formula_${el.id}_${color}_${Math.round(w)}x${Math.round(h)}`;
        const cached = formulaImgCache.get(fkey);
        if (cached) {
          try {
            ctx.drawImage(cached, x, y, w, h);
          } catch (e) {}
        } else {
          ctx.fillStyle = color;
          ctx.globalAlpha = Math.max(0.2, op * 0.35);
          ctx.fillRect(x, y, w, h);
          ctx.globalAlpha = Math.max(0.15, Math.min(1, op));
          if (!formulaPending.has(fkey)) {
            formulaPending.add(fkey);
            const url = formulaSvgToBlobUrl(el.formulaSvg, color, w, h);
            const img = new Image();
            img.onload = () => {
              formulaImgCache.set(fkey, img);
              formulaPending.delete(fkey);
              URL.revokeObjectURL(url);
              if (typeof onReady === 'function') onReady();
            };
            img.onerror = () => {
              formulaPending.delete(fkey);
              URL.revokeObjectURL(url);
            };
            img.src = url;
          }
        }
      } else {
        const raw = stripHtml(el.formulaRaw || el.html || '');
        if (raw) {
          ctx.fillStyle = color;
          const fs = Math.max(6, Math.min(12, 14 * sy));
          ctx.font = `${fs}px system-ui,sans-serif`;
          ctx.textBaseline = 'top';
          ctx.fillText(raw.slice(0, 32), x + 2, y + 2, Math.max(4, w - 4));
        } else {
          ctx.fillStyle = color;
          ctx.globalAlpha = Math.max(0.2, op * 0.35);
          ctx.fillRect(x, y, w, h);
        }
      }
    } else if (el.type === 'text' || el.type === 'markdown' || el.type === 'pagenum') {
      if (el.type === 'markdown') {
        drawThumbElMarkdown(ctx, el, x, y, w, h, sx, sy);
      } else {
        fillThumbTextBg(ctx, el, x, y, w, h, sx, sy);
        const color = el.textColor || parseColorFromCs(el.cs, '#e2e8f0');
        const lines = htmlToLines(el.html || el.text || '');
        if (lines.length) {
          ctx.fillStyle = color;
          const fs = Math.max(6, Math.min(14, (parseFontSize(el.cs) || 18) * sy * 0.85));
          ctx.font = `${fs}px system-ui,sans-serif`;
          ctx.textBaseline = 'top';
          const lineH = fs * 1.25;
          const maxLines = Math.max(1, Math.floor((h - 2) / lineH));
          const padX = 2;
          const maxW = Math.max(4, w - padX * 2);
          for (let li = 0; li < Math.min(lines.length, maxLines); li++) {
            ctx.fillText(lines[li].slice(0, 48), x + padX, y + 2 + li * lineH, maxW);
          }
        }
      }
    } else if (el.svgContent || el.type === 'svg') {
      drawThumbElSvg(ctx, el, x, y, w, h, sx, sy, onReady);
    } else if (el.type === 'applet' || el.type === 'model3d' || el.type === 'lego') {
      ctx.fillStyle = el.type === 'lego' ? '#fbbf24' : '#475569';
      roundRect(ctx, x, y, w, h, Math.min(6, w / 5));
      ctx.fill();
    } else {
      ctx.fillStyle = '#475569';
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  });

  angleEls.forEach((d) => drawThumbLineAngle(ctx, d, sx, sy, els));

  (slide?.inkFills || []).forEach((fill) => {
    const pts = fill.points || [];
    if (pts.length < 3) return;
    ctx.save();
    ctx.globalAlpha = fill.opacity != null ? +fill.opacity : 0.55;
    ctx.fillStyle = fill.color || '#64748b';
    ctx.beginPath();
    pts.forEach((p, i) => {
      const px = (p.x != null ? p.x : p[0]) * sx;
      const py = (p.y != null ? p.y : p[1]) * sy;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  (slide?.ink || []).forEach((st) => {
    if (!st) return;
    const stroke = { ...st, points: normalizeInkPoints(st.points) };
    if (!stroke.points.length) return;
    const op = stroke.opacity != null ? +stroke.opacity : stroke.tool === 'marker' ? 0.4 : 1;
    if (isBrushFamily(stroke.tool)) {
      const stamps = brushStamps(stroke, sx, sy);
      ctx.save();
      ctx.globalAlpha = op;
      ctx.fillStyle = stroke.color || '#64748b';
      fillBrushStamps(ctx, stamps);
      ctx.restore();
      return;
    }
    const geom = hardStrokeGeom(stroke.tool === 'marker' ? { ...stroke, pressure: false } : stroke, sx, sy);
    if (!geom) return;
    ctx.save();
    ctx.globalAlpha = op;
    ctx.strokeStyle = stroke.color || '#64748b';
    ctx.fillStyle = stroke.color || '#64748b';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (geom.circle) {
      ctx.beginPath();
      ctx.arc(geom.circle.cx, geom.circle.cy, geom.circle.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (geom.d) {
      ctx.lineWidth = geom.width;
      try {
        ctx.stroke(new Path2D(geom.d));
      } catch (e) {}
    }
    ctx.restore();
  });
}

function drawThumbLine(ctx, el, sx, sy, op) {
  const ends = lineCanvasEnds(el);
  if (!ends?.a || !ends?.b) return;
  const sw = Math.max(0.8, (el.sw != null ? +el.sw : 2) * Math.min(sx, sy));
  const stroke = el.stroke && el.stroke !== 'none' ? el.stroke : '#94a3b8';
  ctx.save();
  ctx.globalAlpha = op;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = sw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(ends.a.x * sx, ends.a.y * sy);
  ctx.lineTo(ends.b.x * sx, ends.b.y * sy);
  ctx.stroke();
  ctx.restore();
}

function drawThumbLineAngle(ctx, d, sx, sy, slideEls) {
  const model = buildLineAngleDrawModel(d, slideEls || []);
  if (!model) return;
  const sc = Math.min(sx, sy);
  const jx = model.j.x * sx;
  const jy = model.j.y * sy;
  const col = model.color || '#64748b';
  ctx.save();
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = Math.max(1, 2 * sc);
  ctx.lineJoin = 'miter';
  ctx.lineCap = model.useSquare ? 'square' : 'round';
  if (model.useSquare) {
    const s = Math.min(model.radius, 28) * sc;
    const u1x = Math.cos(model.a1);
    const u1y = Math.sin(model.a1);
    const u2x = Math.cos(model.a2);
    const u2y = Math.sin(model.a2);
    ctx.beginPath();
    ctx.moveTo(jx + u1x * s, jy + u1y * s);
    ctx.lineTo(jx + u1x * s + u2x * s, jy + u1y * s + u2y * s);
    ctx.lineTo(jx + u2x * s, jy + u2y * s);
    ctx.stroke();
  } else {
    const n = Math.max(1, model.markCount | 0);
    const ccw = model.delta < 0;
    for (let i = 0; i < n; i++) {
      const rr = Math.max(4, (model.radius - i * 6) * sc);
      ctx.beginPath();
      ctx.arc(jx, jy, rr, model.a1, model.a2, ccw);
      ctx.stroke();
    }
  }
  if (model.label) {
    const fs = Math.max(6, model.fsPx * sc);
    ctx.font = `600 ${fs.toFixed(1)}px "Segoe UI",system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(model.label, model.labelX * sx, model.labelY * sy);
  }
  ctx.restore();
}

function drawThumbElIcon(ctx, el, x, y, w, h, onReady) {
  const color = el.iconColor || el.textColor || '#6366f1';
  const placeholder = () => {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  };

  if (!iconsReady()) {
    placeholder();
    if (!iconsPrefetchStarted) {
      iconsPrefetchStarted = true;
      ensureIcons()
        .then(() => {
          if (typeof onReady === 'function') onReady();
        })
        .catch(() => {});
    }
    return;
  }

  const ic = el.iconId ? getIconById(el.iconId) : null;
  let svgStr = el.svgContent || '';
  if (ic) {
    svgStr = buildIconSVG(
      ic,
      color,
      el.iconSw != null ? el.iconSw : 1.8,
      el.iconFillOp != null ? el.iconFillOp : 1,
      iconPathForRender(ic, el)
    );
  }
  if (!svgStr) {
    placeholder();
    return;
  }

  const pw = Math.max(1, Math.round(w));
  const ph = Math.max(1, Math.round(h));
  const svgSized = svgStr.replace(/<svg /, `<svg width="${pw}" height="${ph}" `);
  const cacheKey = `${el.id || ''}|${el.iconId || ''}|${color}|${pw}x${ph}|${svgSized.length}`;
  const cached = thumbIconCache.get(cacheKey);
  if (cached) {
    try {
      ctx.save();
      if (el.rot) {
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((el.rot * Math.PI) / 180);
        ctx.translate(-(x + w / 2), -(y + h / 2));
      }
      ctx.drawImage(cached, x, y, w, h);
      ctx.restore();
    } catch (e) {
      placeholder();
    }
    return;
  }

  placeholder();
  if (thumbIconPending.has(cacheKey)) return;
  thumbIconPending.add(cacheKey);
  const blob = new Blob([svgSized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    thumbIconCache.set(cacheKey, img);
    thumbIconPending.delete(cacheKey);
    URL.revokeObjectURL(url);
    if (typeof onReady === 'function') onReady();
  };
  img.onerror = () => {
    thumbIconPending.delete(cacheKey);
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function drawThumbElCode(ctx, el, x, y, w, h, sx, sy) {
  const theme = el.codeTheme || 'dark';
  const T = CODE_THEMES[theme] || CODE_THEMES.dark;
  const bg = el.codeGlass
    ? theme === 'light'
      ? 'rgba(248,249,250,0.58)'
      : 'rgba(13,17,23,0.58)'
    : T.bg;
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(128,128,128,.25)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const baseFs = el.codeFs || 16;
  const lh = Math.max(5, baseFs * sx * 1.4);
  const fs = Math.max(4, baseFs * sx * 0.85);
  const raw = el.codeRaw || '';
  const lines = raw.split('\n').slice(0, Math.max(1, Math.floor(h / lh)));
  ctx.font = `${fs}px ui-monospace,Consolas,monospace`;
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => {
    const iy = y + 6 * sy + (i + 1) * lh;
    if (iy > y + h - 2) return;
    const isKw = /^\s*(const|let|var|function|def|class|if|return|import|from|export|async|await)\b/.test(
      line
    );
    ctx.fillStyle = isKw ? T.kw : line.includes('//') || line.includes('#') ? T.cmt : T.text;
    const maxChars = Math.max(4, Math.floor(w / (fs * 0.6)));
    ctx.fillText(line.substring(0, maxChars), x + 6 * sx, iy);
  });
}

function drawThumbElTable(ctx, el, x, y, w, h, sx, sy) {
  const rows = Math.max(1, +(el.rows || 0) || 0);
  const cols = Math.max(1, +(el.cols || 0) || 0);
  if (!rows || !cols) {
    ctx.fillStyle = el.fill || '#1e293b';
    ctx.fillRect(x, y, w, h);
    return;
  }
  ctx.save();
  if (el.rot) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((el.rot * Math.PI) / 180);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  const rx = Math.min(+(el.rx || 0) * Math.min(sx, sy), Math.min(w, h) / 2);
  if (rx > 0) {
    ctx.beginPath();
    ctx.moveTo(x + rx, y);
    ctx.arcTo(x + w, y, x + w, y + h, rx);
    ctx.arcTo(x + w, y + h, x, y + h, rx);
    ctx.arcTo(x, y + h, x, y, rx);
    ctx.arcTo(x, y, x + w, y, rx);
    ctx.closePath();
    ctx.clip();
  }
  const borderColor = el.borderColor || el.stroke || '#3b82f680';
  const bw = Math.max(0.5, (el.borderW || 1) * Math.min(sx, sy));
  const rhs = (el.rowHeights || Array(rows).fill(1 / rows)).map((f) => f * h);
  const cws = (el.colWidths || Array(cols).fill(1 / cols)).map((f) => f * w);
  let cy = y;
  for (let r = 0; r < rows; r++) {
    const rh = rhs[r] || h / rows;
    let cx = x;
    for (let c = 0; c < cols; c++) {
      const cw = cws[c] || w / cols;
      const cell = (el.cells || []).find((z) => z && +z.r === r && +z.c === c);
      let bg = tableCellBg(el, r, c, cell || { r, c });
      if (!bg) bg = r === 0 && el.headerRow !== false ? el.headerBg || '#3b82f6' : el.cellBg || 'transparent';
      ctx.fillStyle = bg;
      ctx.globalAlpha = 1;
      ctx.fillRect(cx, cy, cw, rh);
      cx += cw;
    }
    cy += rh;
  }
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = String(borderColor).length === 9 ? String(borderColor).slice(0, 7) : borderColor;
  ctx.lineWidth = bw;
  let gy = y;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.stroke();
    if (r < rows) gy += rhs[r] || h / rows;
  }
  let gx = x;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
    ctx.stroke();
    if (c < cols) gx += cws[c] || w / cols;
  }
  ctx.restore();
}

function drawThumbElMarkdown(ctx, el, x, y, w, h, sx, sy) {
  ctx.save();
  if (el.rot) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((el.rot * Math.PI) / 180);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  if (hasTextBg(el)) {
    fillThumbTextBg(ctx, el, x, y, w, h, sx, sy);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = 'rgba(255,255,255,.1)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const raw = el.mdRaw || stripHtml(el.mdHtml || '');
  const lines = String(raw).split('\n').slice(0, 20);
  const color = el.textColor || el.mdColor || '#e2e8f0';
  let iy = y + 10 * sy;
  lines.forEach((line) => {
    if (iy > y + h - 6) return;
    const isH1 = /^#\s/.test(line);
    const isH2 = /^##\s/.test(line);
    const isBullet = /^[-*]\s/.test(line);
    const base = el.mdFs || 16;
    const fs = isH1
      ? Math.max(5, base * sx * 1.15)
      : isH2
        ? Math.max(4, base * sx * 1.0)
        : Math.max(4, base * sx * 0.72);
    ctx.font = `${isH1 || isH2 ? 'bold ' : ''}${fs}px system-ui,sans-serif`;
    ctx.fillStyle = isH1 || isH2 ? color : color;
    ctx.globalAlpha = isH1 || isH2 ? 1 : 0.7;
    ctx.textBaseline = 'top';
    const txt = line.replace(/^#+\s/, '').replace(/^[-*]\s/, isBullet ? '• ' : '');
    ctx.fillText(txt.substring(0, Math.floor(w / (fs * 0.55))), x + (isBullet ? 12 : 6) * sx, iy);
    iy += fs * 1.45;
    if (isH1) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = color;
      ctx.fillRect(x + 6 * sx, iy, w * 0.65, 0.5);
      iy += 3;
    }
  });
  ctx.restore();
}

function stripSvgAnimForThumb(svgStr) {
  return String(svgStr || '')
    .replace(/<animate[\s\S]*?<\/animate>/gi, '')
    .replace(/<animateTransform[\s\S]*?<\/animateTransform>/gi, '')
    .replace(/<animateMotion[\s\S]*?<\/animateMotion>/gi, '')
    .replace(/\s+on\w+="[^"]*"/gi, '');
}

function drawThumbElSvg(ctx, el, x, y, w, h, sx, sy, onReady) {
  const placeholder = () => {
    ctx.fillStyle = 'rgba(148,163,184,.35)';
    ctx.fillRect(x, y, w, h);
  };
  if (!el.svgContent) {
    placeholder();
    return;
  }
  if (!el._isDecor && el.svgContent.length > THUMB_SVG_HEAVY) {
    placeholder();
    return;
  }
  const pw = Math.max(1, Math.round(w));
  const ph = Math.max(1, Math.round(h));
  const gen = thumbCacheGen;
  const key = `svgel_${el.id}_${pw}x${ph}_${contentFinger(el.svgContent)}_g${gen}`;
  const cached = thumbSvgElCache.get(key);
  const drawSvgImg = (img) => {
    ctx.save();
    if (el.rot) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((el.rot * Math.PI) / 180);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }
    if (el.svgOpacity != null && +el.svgOpacity !== 1) {
      ctx.globalAlpha = Math.max(0.05, Math.min(1, +el.svgOpacity));
    }
    try {
      ctx.drawImage(img, x, y, w, h);
    } catch (e) {
      placeholder();
    }
    ctx.restore();
  };
  if (cached) {
    drawSvgImg(cached);
    return;
  }
  placeholder();
  if (thumbSvgElPending.has(key)) return;
  thumbSvgElPending.add(key);
  let inner = stripSvgAnimForThumb(el.svgContent.trim());
  const sized = /^<svg/i.test(inner)
    ? inner.replace(/^<svg([^>]*)>/i, (m, attrs) => {
        const noWH = String(attrs)
          .replace(/\s*width="[^"]*"/g, '')
          .replace(/\s*height="[^"]*"/g, '');
        return `<svg${noWH} width="${pw}" height="${ph}">`;
      })
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}">${inner}</svg>`;
  const blob = new Blob([sized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    thumbSvgElPending.delete(key);
    URL.revokeObjectURL(url);
    if (gen !== thumbCacheGen) return;
    thumbSvgElCache.set(key, img);
    if (typeof onReady === 'function') onReady();
  };
  img.onerror = () => {
    thumbSvgElPending.delete(key);
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function parseFontSize(cs) {
  const m = String(cs || '').match(/font-size\s*:\s*([\d.]+)px/i);
  return m ? +m[1] : 0;
}

function drawCoverImage(ctx, img, dx, dy, dw, dh) {
  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;
  const ir = iw / ih || 1;
  const tr = dw / Math.max(1, dh);
  let w;
  let h;
  let x;
  let y;
  if (ir > tr) {
    h = dh;
    w = h * ir;
    x = dx + (dw - w) / 2;
    y = dy;
  } else {
    w = dw;
    h = w / ir;
    x = dx;
    y = dy + (dh - h) / 2;
  }
  ctx.drawImage(img, x, y, w, h);
}

function thumbImageCacheKey(el) {
  if (!el) return '';
  if (el.imageId) return `id:${el.imageId}`;
  return String(el.src || '');
}

function drawThumbElImage(ctx, el, x, y, w, h, sx, sy, onReady) {
  const src = String(el.src || '');
  if (!src) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(148,163,184,.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    return;
  }
  const cacheKey = thumbImageCacheKey(el) || src;
  const cached = thumbImgCache.get(cacheKey);
  const cL = el.imgCropL || 0;
  const cT = el.imgCropT || 0;
  const cR = el.imgCropR || 0;
  const cB = el.imgCropB || 0;
  const hasCrop = !!(cL || cT || cR || cB);
  const drawIt = (img) => {
    ctx.save();
    if (el.rot) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((el.rot * Math.PI) / 180);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }
    if (el.imgOpacity != null && +el.imgOpacity !== 1) {
      ctx.globalAlpha = Math.max(0.05, Math.min(1, +el.imgOpacity));
    }
    const acc = el.imgAccent || 'color';
    if (acc === 'bw') ctx.filter = 'grayscale(1)';
    else if (acc === 'sepia') ctx.filter = 'sepia(1)';
    if (hasCrop) {
      const fW = el._cropFullW > 0 ? el._cropFullW : el.w + cL + cR;
      const fH = el._cropFullH > 0 ? el._cropFullH : el.h + cT + cB;
      const logVisW = Math.max(1, fW - cL - cR);
      const logVisH = Math.max(1, fH - cT - cB);
      const kx = (el.w || 1) / logVisW;
      const ky = (el.h || 1) / logVisH;
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.drawImage(img, x - cL * kx * sx, y - cT * ky * sy, fW * kx * sx, fH * ky * sy);
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
    ctx.restore();
  };
  if (cached) {
    drawIt(cached);
    return;
  }
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(x, y, w, h);
  loadThumbImage(thumbImgCache, thumbImgPending, cacheKey, src, onReady);
}

function parseGradientStops(css) {
  const stops = [];
  const inner = String(css || '')
    .replace(/^(linear|radial)-gradient\(\s*/, '')
    .replace(/\)\s*$/, '');
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of inner) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  const colorParts = parts.filter(
    (p) => !/^\d+(\.\d+)?deg$/.test(p) && !/^(to |ellipse|circle|farthest|closest)/i.test(p)
  );
  colorParts.forEach((p, i) => {
    const m = p.match(/(#[0-9a-f]{3,8}|rgba?\([^)]+\)|[a-z]+)\s*(\d+%)?/i);
    if (m) {
      const pos = m[2] ? parseFloat(m[2]) / 100 : i / Math.max(1, colorParts.length - 1);
      stops.push([pos, m[1]]);
    }
  });
  return stops.length ? stops : [[0, '#111'], [1, '#333']];
}

function parseLinearAngle(css) {
  const m = String(css || '').match(/(-?\d+(?:\.\d+)?)deg/);
  if (m) return +m[1];
  if (/to right/i.test(css)) return 90;
  if (/to left/i.test(css)) return 270;
  if (/to bottom/i.test(css)) return 180;
  if (/to top/i.test(css)) return 0;
  return 135;
}

/** Canvas cannot use a CSS gradient string as fillStyle — paint stops like v7.1. */
function fillThumbBackground(ctx, W, H, bgc) {
  const bg = typeof bgc === 'string' && bgc ? bgc : '#1e293b';
  if (bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient')) {
    const stops = parseGradientStops(bg);
    let grad;
    if (bg.startsWith('linear-gradient')) {
      const rad = (parseLinearAngle(bg) * Math.PI) / 180;
      const cx = W / 2;
      const cy = H / 2;
      const len = Math.sqrt(W * W + H * H) / 2;
      grad = ctx.createLinearGradient(
        cx - Math.sin(rad) * len,
        cy + Math.cos(rad) * len,
        cx + Math.sin(rad) * len,
        cy - Math.cos(rad) * len
      );
    } else {
      grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H));
    }
    stops.forEach(([pos, col]) => {
      try {
        grad.addColorStop(Math.max(0, Math.min(1, pos)), col);
      } catch (e) {}
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  let solid = bg;
  if (solid.indexOf('gradient') >= 0 || solid.indexOf('url(') >= 0) {
    const hex = solid.match(/#[0-9a-fA-F]{6}/);
    solid = hex ? hex[0] : '#f7f3e9';
  }
  ctx.fillStyle = solid;
  ctx.fillRect(0, 0, W, H);
}

function contentFinger(s, samples = 96) {
  const t = String(s || '');
  const n = t.length;
  if (!n) return '0';
  let h = n;
  const hexes = t.match(/#[0-9a-fA-F]{3,8}/g);
  if (hexes) {
    for (let i = 0; i < hexes.length; i++) {
      const hx = hexes[i];
      for (let j = 0; j < hx.length; j++) h = (Math.imul(h, 33) ^ hx.charCodeAt(j)) >>> 0;
    }
    h = (Math.imul(h, 33) ^ hexes.length) >>> 0;
  }
  const step = Math.max(1, Math.floor(n / samples));
  for (let i = 0; i < n; i += step) h = (Math.imul(h, 33) ^ t.charCodeAt(i)) >>> 0;
  h = (Math.imul(h, 33) ^ t.charCodeAt(n - 1)) >>> 0;
  return `${n.toString(36)}:${h.toString(36)}:${hexes ? hexes.length.toString(36) : '0'}`;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Stable-ish fingerprint so thumbs redraw when content changes. */
export function slideThumbKey(slide, i, extra = '') {
  if (!slide) return `${i}|${extra}`;
  const n = (slide.els || []).length;
  const ink = (slide.ink || []).length;
  const inkFills = (slide.inkFills || []).length;
  const title = slide.title || slide.name || '';
  const bgImg = slide.bgImg;
  const bg =
    typeof bgImg === 'string'
      ? bgImg.length
      : `${(bgImg?.src || bgImg?.exportBaked || '').length}:${bgImg?.mode || ''}:${bgImg?.opacity ?? ''}:${bgImg?.blur ?? ''}:${bgImg?.tileSize ?? ''}:${bgImg?.tileGap ?? ''}:${bgImg?.tileRot ?? ''}`;
  const formulas = (slide.els || [])
    .filter((e) => e && e.type === 'formula')
    .map((e) => `${e.id}:${(e.formulaSvg || '').length}:${e.formulaColor || ''}`)
    .join(',');
  const images = (slide.els || [])
    .filter((e) => e && e.type === 'image')
    .map(
      (e) =>
        `${e.id}:${(e.src || '').length}:${e.imageId || ''}:${e.imgCropL || 0},${e.imgCropT || 0},${e.imgCropR || 0},${e.imgCropB || 0}`
    )
    .join(',');
  const icons = (slide.els || [])
    .filter((e) => e && e.type === 'icon')
    .map((e) => `${e.id}:${e.iconId || ''}:${e.iconColor || ''}:${e.iconSw || ''}`)
    .join(',');
  const codes = (slide.els || [])
    .filter((e) => e && e.type === 'code')
    .map((e) => `${e.id}:${(e.codeRaw || '').length}:${e.codeTheme || ''}:${e.codeFs || ''}`)
    .join(',');
  const tables = (slide.els || [])
    .filter((e) => e && e.type === 'table')
    .map((e) => `${e.id}:${e.rows || 0}x${e.cols || 0}`)
    .join(',');
  const svgs = (slide.els || [])
    .filter((e) => e && (e.type === 'svg' || e.svgContent))
    .map((e) => `${e.id}:${contentFinger(e.svgContent)}`)
    .join(',');
  const texts = (slide.els || [])
    .filter((e) => e && (e.type === 'text' || e.type === 'shape' || e.type === 'markdown'))
    .slice(0, 16)
    .map(
      (e) =>
        `${e.id}:${e.textColor || ''}:${e.fill || ''}:${e.fillOp ?? ''}:${e.textBg || ''}:${e.textBgOp ?? ''}:${e.textBgBlur ?? ''}:${e.shapeBlur ?? ''}:${contentFinger(e.html || e.shapeHtml || e.md || '')}`
    )
    .join(',');
  return `${i}|${slide.bgc || ''}|bg${bg}|${n}|${ink}|f${inkFills}|${title}|${formulas}|${images}|${icons}|${codes}|${tables}|${svgs}|${texts}|${(slide.els || [])
    .slice(0, 12)
    .map((e) => `${e?.id}:${e?.type}:${Math.round(e?.x || 0)},${Math.round(e?.y || 0)}`)
    .join(';')}|${extra}`;
}

/** Render missing formulaSvg for formula elements (PPTX / old saves). */
export async function hydrateMissingFormulas(slides) {
  if (!Array.isArray(slides) || !slides.length) return 0;
  const need = [];
  slides.forEach((s) => {
    (s.els || []).forEach((el) => {
      if (el && el.type === 'formula' && el.formulaRaw && !el.formulaSvg) need.push(el);
    });
  });
  if (!need.length) return 0;
  const { renderFormulaSvg } = await import('./mathjax.js');
  let n = 0;
  for (const el of need) {
    try {
      el.formulaSvg = await renderFormulaSvg(el.formulaRaw);
      n += 1;
    } catch (e) {
      console.warn('[hydrateMissingFormulas]', e);
    }
  }
  return n;
}
