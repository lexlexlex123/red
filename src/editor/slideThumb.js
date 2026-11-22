/** Lightweight canvas thumbnail of a slide (no snapdom). */

import { buildIconSVG } from './iconSvg.js';
import { iconPathForRender } from './iconAnim.js';
import { ensureIcons, getIconById, iconsReady } from './iconsLazy.js';
import { CODE_THEMES, resolveCodeThemeId, codeBlockThemeId } from './codeHighlight.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';
import { brushStamps, fillBrushStamps, hardStrokeGeom, normalizeInkPoints, isBrushFamily } from './inkBrush.js';
import { drawSlideBgImgOnCanvas, scaleBgImgForCanvas } from './slideBgImg.js';
import { hasTextBg, toRgba } from './textBg.js';
import { textPadValues } from './textPad.js';
import { lineCanvasEnds } from './lineGeom.js';
import { buildLineAngleDrawModel } from './lineAngle.js';
import { getTableCell, tableCellBg } from './tableCells.js';
import { isNoneTableColor, resolveTableEdge } from './tableBorders.js';
import { buildBasicShapeSVG, shapeOptsFromEl, shapeOutlinePathD } from '../shared/shapes.js';
import { getShapeMeta } from '../shared/shapesCatalog.js';
import { parseShapeTextCss, shapeTextLayout } from './shapeText.js';
import { captureHtmlFrameSnapshot } from './htmlFrameSnapshot.js';
import { polaroidMetrics } from './imgStyles.js';
import { getTheme } from './themes.js';
import { audioPlayerLayout, audioPlayerTheme } from './mediaPlay.js';
import { normalizeFillImgLayout, shapeHasFillImg } from './shapeFillImg.js';
import { formulaAlignOf, formulaTagLabelOf } from './formulaLayout.js';

const formulaImgCache = new Map();
const formulaPending = new Set();
const graphImgCache = new Map();
const graphPending = new Set();
const thumbImgCache = new Map();
const thumbImgPending = new Set();
const thumbShapeCache = new Map();
const thumbShapePending = new Set();
const thumbIconCache = new Map();
const thumbIconPending = new Set();
const thumbHtmlFrameCache = new Map();
const thumbHtmlFramePending = new Set();
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
  thumbHtmlFrameCache.clear();
  thumbHtmlFramePending.clear();
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

/**
 * Word-wrap a single line of text to fit `maxWidth`, using the font already set on `ctx`
 * (via ctx.measureText) — same idea as real CSS line-wrapping, so a long paragraph with no
 * explicit <br> becomes several thumbnail lines instead of one line squeezed/scaled to fit
 * (which is what ctx.fillText's built-in maxWidth argument does, and is why long paragraphs
 * used to render as a single squashed line on the thumbnail instead of wrapping).
 */
function wrapCanvasLine(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let cur = words[0];
  for (let i = 1; i < words.length; i++) {
    const test = cur + ' ' + words[i];
    if (ctx.measureText(test).width <= maxWidth || !cur) {
      cur = test;
    } else {
      lines.push(cur);
      cur = words[i];
    }
  }
  lines.push(cur);
  return lines;
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
  if (el?.type === 'shape' && Array.isArray(el.shapePts) && el.shapePts.length >= 3) {
    el.shapePts.forEach((p, i) => {
      const px = x + (+p.x || 0) * w;
      const py = y + (+p.y || 0) * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  } else if (el?.shape === 'ellipse' || el?.shape === 'circle') {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else {
    const rx = Math.min(w, h, (el?.rx != null ? el.rx : 4) * (sx || 1));
    roundRect(ctx, x, y, w, h, rx);
  }
  ctx.clip();
}

/** Scale numeric coords in an SVG path `d` by sx/sy (alternating x/y like shapeHit). */
function scaleSvgPathD(d, sx, sy) {
  let isX = true;
  return String(d || '').replace(/-?[\d.]+/g, (num) => {
    const v = +num;
    const out = isX ? v * sx : v * sy;
    isX = !isX;
    return String(+out.toFixed(2));
  });
}

/** Clip to real shape silhouette (hex / poly / outline path), not just a box. */
function clipThumbShape(ctx, x, y, w, h, el, sx, sy) {
  if (!el || el.type !== 'shape') {
    clipThumbBox(ctx, x, y, w, h, el, sx);
    return;
  }
  if (Array.isArray(el.shapePts) && el.shapePts.length >= 3) {
    clipThumbBox(ctx, x, y, w, h, el, sx);
    return;
  }
  const id = el.shape || 'rect';
  if (id === 'ellipse' || id === 'circle') {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.clip();
    return;
  }
  if (id === 'rect' || id === 'roundrect') {
    const rxLogic = el.rx != null ? +el.rx : 0;
    const rx = Math.min(w, h, (rxLogic / 100) * (Math.min(w, h) / 2));
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, rx);
    ctx.clip();
    return;
  }
  const d = shapeOutlinePathD(el, {
    w: Math.max(1, +(el.w || 40)),
    h: Math.max(1, +(el.h || 24)),
  });
  if (d && typeof Path2D !== 'undefined') {
    try {
      const scaled = scaleSvgPathD(d, sx || 1, sy || 1);
      const local = new Path2D(scaled);
      const shifted = new Path2D();
      if (typeof DOMMatrix !== 'undefined') {
        const m = new DOMMatrix();
        m.translateSelf(x, y);
        shifted.addPath(local, m);
      } else {
        // Fallback: clip after translate (caller must not rely on identity transform).
        ctx.translate(x, y);
        ctx.clip(local);
        ctx.translate(-x, -y);
        return;
      }
      ctx.clip(shifted);
      return;
    } catch (_) {
      /* fall through */
    }
  }
  clipThumbBox(ctx, x, y, w, h, el, sx);
}

/** Themed audio pill matching ThemedAudioPlayer chrome. */
function drawThumbElAudio(ctx, el, x, y, w, h, themeIdx) {
  const logicalW = Math.max(1, +(el?.w || 200));
  const logicalH = Math.max(1, +(el?.h || 40));
  const at = audioPlayerTheme(getTheme(themeIdx));
  const layout = audioPlayerLayout(logicalW, logicalH);
  const iconOnly = layout === 'icon';
  const showTrack = layout === 'full' || layout === 'notime';
  const r = Math.min(h / 2, w / 2);
  ctx.save();
  ctx.fillStyle = at.panel;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();

  const iconSize = iconOnly
    ? Math.max(6, Math.min(w, h) * 0.5)
    : Math.max(6, h * 0.58);
  const glyph = Math.max(4, iconSize * (iconOnly ? 0.72 : 0.66));
  const padLeft = iconOnly ? (w - iconSize) / 2 : Math.max(2, h * 0.2);
  const btnCx = x + padLeft + iconSize / 2;
  const btnCy = y + h / 2;
  ctx.fillStyle = at.controls;
  ctx.beginPath();
  const g = glyph * 0.45;
  ctx.moveTo(btnCx - g * 0.55, btnCy - g);
  ctx.lineTo(btnCx + g * 0.85, btnCy);
  ctx.lineTo(btnCx - g * 0.55, btnCy + g);
  ctx.closePath();
  ctx.fill();

  if (showTrack) {
    const gap = Math.max(2, h * 0.14);
    const endPad = Math.max(4, h / 2);
    const trackX = btnCx + iconSize / 2 + gap;
    const trackW = Math.max(4, x + w - endPad - trackX);
    const trackH = Math.max(1.5, h * 0.11);
    const trackY = y + (h - trackH) / 2;
    ctx.save();
    ctx.globalAlpha *= 0.28;
    ctx.fillStyle = at.controls;
    roundRect(ctx, trackX, trackY, trackW, trackH, trackH / 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = at.controls;
    roundRect(ctx, trackX, trackY, trackW * 0.35, trackH, trackH / 2);
    ctx.fill();
  }
  ctx.restore();
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
  if (el.textBgGrad) {
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
    grad.addColorStop(0, col ? toRgba(col, op) : 'rgba(0,0,0,0)');
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
  const themeIdx = opts.themeIdx != null ? opts.themeIdx : -1;
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
      const sb = Math.max(0, +(el.shapeBlur || 0)) * Math.min(sx, sy);
      applyThumbBackdropBlur(ctx, x, y, w, h, sb, () => clipThumbShape(ctx, x, y, w, h, el, sx, sy));
      drawThumbElShape(ctx, el, x, y, w, h, sx, sy, onReady);
      drawThumbShapeText(ctx, el, x, y, w, h, sx, sy);
    } else if (el.type === 'image') {
      drawThumbElImage(ctx, el, x, y, w, h, sx, sy, onReady);
    } else if (el.type === 'icon') {
      drawThumbElIcon(ctx, el, x, y, w, h, onReady);
    } else if (el.type === 'table') {
      drawThumbElTable(ctx, el, x, y, w, h, sx, sy);
    } else if (el.type === 'code') {
      drawThumbElCode(ctx, el, x, y, w, h, sx, sy);
    } else if (el.type === 'htmlframe') {
      drawThumbElHtmlFrame(ctx, el, x, y, w, h, sx, sy, onReady);
    } else if (el.type === 'mediavideo') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.4, y + h * 0.3);
      ctx.lineTo(x + w * 0.7, y + h * 0.5);
      ctx.lineTo(x + w * 0.4, y + h * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (el.type === 'mediaaudio') {
      drawThumbElAudio(ctx, el, x, y, w, h, themeIdx);
    } else if (el.type === 'graph') {
      const gkey = `graph_${el.id}_${(el.graphImg || '').length}`;
      const cached = graphImgCache.get(gkey);
      ctx.save();
      const graphRadius = Math.min(+(el.graphRadius ?? 16) * Math.min(sx, sy), w / 2, h / 2);
      if (graphRadius > 0) {
        roundRect(ctx, x, y, w, h, graphRadius);
        ctx.clip();
      }
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
      ctx.restore();
    } else if (el.type === 'formula') {
      const color = el.formulaColor || el.textColor || '#ffffff';
      fillThumbTextBg(ctx, el, x, y, w, h, sx, sy);
      const tagLabel = formulaTagLabelOf(el.formulaRaw || el.html || '');
      const align = formulaAlignOf(el);
      const tagW = tagLabel ? Math.min(w * 0.22, Math.max(10, 22 * Math.min(sx, sy))) : 0;
      const mathW = Math.max(4, w - tagW - (tagLabel ? 2 : 0));
      if (el.formulaSvg) {
        const fkey = `formula_${el.id}_${color}_${Math.round(mathW)}x${Math.round(h)}_${align}_${tagLabel || ''}`;
        const cached = formulaImgCache.get(fkey);
        const drawMath = (img) => {
          try {
            const iw = img.naturalWidth || img.width || mathW;
            const ih = img.naturalHeight || img.height || h;
            const scale = Math.min(mathW / Math.max(1, iw), h / Math.max(1, ih));
            const dw = Math.max(1, iw * scale);
            const dh = Math.max(1, ih * scale);
            let dx = x;
            if (align === 'center') dx = x + (mathW - dw) / 2;
            else if (align === 'right') dx = x + mathW - dw;
            const dy = y + (h - dh) / 2;
            ctx.drawImage(img, dx, dy, dw, dh);
          } catch (e) {}
        };
        if (cached) {
          drawMath(cached);
        } else {
          ctx.fillStyle = color;
          ctx.globalAlpha = Math.max(0.2, op * 0.35);
          ctx.fillRect(x, y, mathW, h);
          ctx.globalAlpha = Math.max(0.15, Math.min(1, op));
          if (!formulaPending.has(fkey)) {
            formulaPending.add(fkey);
            const url = formulaSvgToBlobUrl(el.formulaSvg, color, mathW, h);
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
        if (tagLabel) {
          ctx.fillStyle = color;
          const fs = Math.max(5, Math.min(11, 12 * Math.min(sx, sy)));
          ctx.font = `${fs}px Cambria,serif`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(tagLabel, x + w - 1, y + h / 2, tagW);
          ctx.textAlign = 'left';
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
        // Calculate border radius
        const rx = el.rx != null ? Math.min(w / 2, h / 2, +(el.rx || 0) * Math.min(sx, sy)) : 0;
        const isHeading = el.textRole === 'heading' || el.textRole === 'title';
        // Use larger base radius for headings to be visible at thumbnail scale
        const headingRx = isHeading ? Math.min(w / 2, h / 2, 50 * Math.min(sx, sy)) : 0;
        const finalRx = Math.max(rx, headingRx);
        
        // Draw with rounded corners
        ctx.save();
        if (finalRx > 0) {
          roundRect(ctx, x, y, w, h, finalRx);
          ctx.clip();
        }
        
        // Draw background with rounded corners
        if (el.textBg || el.textBgGrad) {
          const op = el.textBgOp != null ? +el.textBgOp : 1;
          ctx.save();
          if (el.textBgGrad) {
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
            grad.addColorStop(0, el.textBg ? toRgba(el.textBg, op) : 'rgba(0,0,0,0)');
            grad.addColorStop(1, el.textBgCol2 ? toRgba(el.textBgCol2, op) : 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
          } else if (el.textBg) {
            ctx.fillStyle = toRgba(el.textBg, op);
          }
          if (finalRx > 0) {
            ctx.fillRect(x, y, w, h);
          } else {
            ctx.fillRect(x, y, w, h);
          }
          ctx.restore();
        }
        
        const color = el.textColor || parseColorFromCs(el.cs, '#e2e8f0');
        const rawLines = htmlToLines(el.html || el.text || '');
        if (rawLines.length) {
          ctx.fillStyle = color;
          const fs = Math.max(6, Math.min(14, (parseFontSize(el.cs) || 18) * sy * 0.85));
          ctx.font = `${fs}px system-ui,sans-serif`;
          const lineH = fs * 1.25;
          const maxLines = Math.max(1, Math.floor((h - 2) / lineH));
          const padVals = textPadValues(el);
          const rawPad = padVals ? (padVals.unit === '%' ? Math.round((padVals.l / 100) * (el.h || 60)) : padVals.l) : 8;
          const padX = Math.max(4, rawPad * sx);
          const maxW = Math.max(4, w - padX * 2);
          // Word-wrap each explicit line to the box width first (see wrapCanvasLine) instead
          // of squeezing a whole long paragraph onto one line.
          const lines = [];
          for (const raw of rawLines) {
            for (const wrapped of wrapCanvasLine(ctx, raw, maxW)) {
              lines.push(wrapped);
              if (lines.length >= maxLines) break;
            }
            if (lines.length >= maxLines) break;
          }
          // Vertical centering for headings
          const textBlockH = lines.length * lineH;
          const offsetY = isHeading ? (h - textBlockH) / 2 + 2 : 2;
          for (let li = 0; li < Math.min(lines.length, maxLines); li++) {
            const displayText = isHeading ? lines[li].toUpperCase() : lines[li];
            ctx.textBaseline = 'top';
            ctx.fillText(displayText, x + padX, y + offsetY + li * lineH, maxW);
          }
        }
        
        ctx.restore();
      }
    } else if (el.svgContent || el.svg || el.type === 'svg') {
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
  const theme = resolveCodeThemeId(codeBlockThemeId(el));
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
  const baseFs = el.codeFs != null ? el.codeFs : 18;
  const lh = Math.max(5, baseFs * sx * 1.4);
  const fs = Math.max(4, baseFs * sx * 0.85);
  const raw = el.codeRaw || '';
  const lines = raw.split('\n').slice(0, Math.max(1, Math.floor(h / lh)));
  const gutterW = el.codeLineNums ? Math.max(10, fs * 1.6) : 0;
  ctx.font = `${fs}px ui-monospace,Consolas,monospace`;
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => {
    const iy = y + 6 * sy + (i + 1) * lh;
    if (iy > y + h - 2) return;
    if (gutterW) {
      ctx.fillStyle = T.cmt;
      ctx.textAlign = 'right';
      ctx.fillText(String(i + 1), x + gutterW, iy);
      ctx.textAlign = 'left';
    }
    const isKw = /^\s*(const|let|var|function|def|class|if|return|import|from|export|async|await)\b/.test(
      line
    );
    ctx.fillStyle = isKw ? T.kw : line.includes('//') || line.includes('#') ? T.cmt : T.text;
    const textX = x + 6 * sx + gutterW;
    const maxChars = Math.max(4, Math.floor((w - gutterW - 6 * sx) / (fs * 0.6)));
    ctx.fillText(line.substring(0, maxChars), textX, iy);
  });
}

function loadThumbHtmlFrame(el, key, onReady) {
  const generation = thumbCacheGen;
  const pendingKey = `${generation}:${key}`;
  if (thumbHtmlFrameCache.has(key) || thumbHtmlFramePending.has(pendingKey)) return;
  thumbHtmlFramePending.add(pendingKey);
  captureHtmlFrameSnapshot(el.hfSrc || '', el.w || DEFAULT_CANVAS_W, el.h || DEFAULT_CANVAS_H)
    .then((canvas) => {
      if (generation !== thumbCacheGen) return;
      thumbHtmlFrameCache.set(key, canvas);
      if (typeof onReady === 'function') onReady();
    })
    .catch((error) => {
      console.warn('Could not render HTML frame thumbnail', error);
    })
    .finally(() => {
      thumbHtmlFramePending.delete(pendingKey);
    });
}

function drawThumbElHtmlFrame(ctx, el, x, y, w, h, sx, sy, onReady) {
  // Draw browser chrome
  const chromeH = Math.max(8, 16 * sy);
  ctx.fillStyle = '#2d2d33';
  ctx.fillRect(x, y, w, chromeH);
  // Draw window dots
  const dotR = Math.max(1.5, 2.5 * sy);
  const dotY = y + chromeH / 2;
  const dotX = x + dotR + 2 * sy;
  ctx.fillStyle = '#ff5f57';
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffbd2e';
  ctx.beginPath();
  ctx.arc(dotX + dotR * 2.2, dotY, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#28c940';
  ctx.beginPath();
  ctx.arc(dotX + dotR * 4.4, dotY, dotR, 0, Math.PI * 2);
  ctx.fill();

  const src = String(el.hfSrc || '').trim();
  if (/^https?:\/\//i.test(src)) {
    const label = src.match(/^https?:\/\/([^/?#]+)/i)?.[1] || src;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y + chromeH, w, h - chromeH);
    ctx.fillStyle = '#555';
    ctx.font = `${Math.max(6, 12 * Math.min(sx, sy))}px Arial,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + chromeH + (h - chromeH) / 2, Math.max(1, w - 10 * sx));
    return;
  }

  const key = `${el.w || DEFAULT_CANVAS_W}x${el.h || DEFAULT_CANVAS_H}:${el.hfSrc || ''}`;
  const preview = thumbHtmlFrameCache.get(key);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y + chromeH, w, h - chromeH);
  if (preview) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y + chromeH, w, h - chromeH);
    ctx.clip();
    ctx.drawImage(preview, x, y + chromeH, w, h - chromeH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#666';
    ctx.font = `${Math.max(6, 12 * Math.min(sx, sy))}px Arial,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HTML', x + w / 2, y + chromeH + (h - chromeH) / 2);
    loadThumbHtmlFrame(el, key, onReady);
  }
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
  const rhs = (el.rowHeights || Array(rows).fill(1 / rows)).map((f) => f * h);
  const cws = (el.colWidths || Array(cols).fill(1 / cols)).map((f) => f * w);
  const xs = [x];
  const ys = [y];
  for (let c = 0; c < cols; c++) xs.push(xs[c] + (cws[c] || w / cols));
  for (let r = 0; r < rows; r++) ys.push(ys[r] + (rhs[r] || h / rows));
  let cy = y;
  for (let r = 0; r < rows; r++) {
    const rh = rhs[r] || h / rows;
    let cx = x;
    for (let c = 0; c < cols; c++) {
      const cw = cws[c] || w / cols;
      const cell = getTableCell(el, r, c);
      if (!cell.hidden) {
        let bg = tableCellBg(el, r, c, cell);
        if (!bg) bg = 'transparent';
        if (bg && bg !== 'transparent') {
          ctx.fillStyle = bg;
          ctx.globalAlpha = 1;
          ctx.fillRect(cx, cy, cw, rh);
        }
      }
      cx += cw;
    }
    cy += rh;
  }
  const strokeEdge = (x1, y1, x2, y2, spec) => {
    if (!spec || !(+spec.w > 0) || isNoneTableColor(spec.color)) return;
    ctx.strokeStyle = String(spec.color).length === 9 ? String(spec.color).slice(0, 7) : spec.color;
    ctx.lineWidth = Math.max(0.4, (+spec.w || 1) * Math.min(sx, sy));
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  ctx.globalAlpha = 0.95;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = getTableCell(el, r, c);
      if (cell.hidden) continue;
      const cs = Math.max(1, cell.colspan || 1);
      const rs = Math.max(1, cell.rowspan || 1);
      const x0 = xs[c];
      const y0 = ys[r];
      const x1 = xs[Math.min(cols, c + cs)];
      const y1 = ys[Math.min(rows, r + rs)];
      strokeEdge(x0, y0, x1, y0, resolveTableEdge(el, r, c, 't'));
      strokeEdge(x0, y0, x0, y1, resolveTableEdge(el, r, c, 'l'));
      if (c + cs >= cols) strokeEdge(x1, y0, x1, y1, resolveTableEdge(el, r, c, 'r'));
      if (r + rs >= rows) strokeEdge(x0, y1, x1, y1, resolveTableEdge(el, r, c, 'b'));
    }
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

function drawThumbShapeFillImg(ctx, el, x, y, w, h, sx, sy, onReady) {
  if (!shapeHasFillImg(el)) return false;
  const src = String(el.fillImg || '');
  if (!src) return false;
  const cacheKey = `fillimg:${el.fillImgKey || ''}:${contentFinger(src, 48)}`;
  const cached = thumbImgCache.get(cacheKey);
  const layout = normalizeFillImgLayout(el, el.w, el.h);
  const paint = (img) => {
    ctx.save();
    if (el.rot) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((el.rot * Math.PI) / 180);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }
    clipThumbShape(ctx, x, y, w, h, el, sx, sy);
    const ix = x + layout.x * sx;
    const iy = y + layout.y * sy;
    const iw = layout.w * sx;
    const ih = layout.h * sy;
    if (layout.rot) {
      ctx.translate(ix + iw / 2, iy + ih / 2);
      ctx.rotate((layout.rot * Math.PI) / 180);
      ctx.drawImage(img, -iw / 2 - 1, -ih / 2 - 1, iw + 2, ih + 2);
    } else {
      ctx.drawImage(img, ix - 1, iy - 1, iw + 2, ih + 2);
    }
    ctx.restore();
  };
  if (cached) {
    paint(cached);
    return true;
  }
  loadThumbImage(thumbImgCache, thumbImgPending, cacheKey, src, onReady);
  return false;
}

function drawThumbElShape(ctx, el, x, y, w, h, sx, sy, onReady) {
  const hasFillImg = shapeHasFillImg(el);
  const fillImgReady = hasFillImg ? drawThumbShapeFillImg(ctx, el, x, y, w, h, sx, sy, onReady) : false;
  const placeholder = () => {
    if (hasFillImg) return; // image loading — avoid solid purple/rect cover
    const fill = el.fill && el.fill !== 'none' ? el.fill : 'transparent';
    if (fill !== 'transparent') {
      ctx.save();
      ctx.globalAlpha *= Math.max(0, Math.min(1, el.fillOp != null ? +el.fillOp : 1));
      ctx.fillStyle = fill.charAt(0) === '#' ? toRgba(fill, 1) : fill;
      roundRect(ctx, x, y, w, h, Math.min(w, h, 4 * sx));
      ctx.fill();
      ctx.restore();
    }
  };
  const pw = Math.max(1, Math.round(w));
  const ph = Math.max(1, Math.round(h));
  const gen = thumbCacheGen;
  const meta = getShapeMeta(el.shape || 'rect');
  // SVG-as-<img> cannot load nested fill images; paint fillImg on canvas and keep SVG for stroke/geometry.
  const opts = shapeOptsFromEl(el);
  if (hasFillImg) {
    opts.fillImg = null;
    opts.fill = 'none';
    opts.fillGrad = null;
    opts.fillGrad2 = null;
    opts.noFill = true;
  }
  let viewX = 0;
  let viewY = 0;
  let viewW = Math.max(1, +(el.w || 40));
  let viewH = Math.max(1, +(el.h || 24));
  if (meta?.special === 'callout') {
    const tailX = el.tailX != null ? +el.tailX : 0;
    const tailY = el.tailY != null ? +el.tailY : viewH / 2 + 30;
    const roundX = el.tailRoundX != null ? +el.tailRoundX : tailX * 0.55;
    const roundY = el.tailRoundY != null ? +el.tailRoundY : tailY * 0.55;
    const pad = Math.max(4, +(el.sw || 0) * 2);
    const minX = Math.min(0, viewW / 2 + tailX - pad, viewW / 2 + roundX - pad);
    const minY = Math.min(0, viewH / 2 + tailY - pad, viewH / 2 + roundY - pad);
    const maxX = Math.max(viewW, viewW / 2 + tailX + pad, viewW / 2 + roundX + pad);
    const maxY = Math.max(viewH, viewH / 2 + tailY + pad, viewH / 2 + roundY + pad);
    viewX = minX;
    viewY = minY;
    viewW = maxX - minX;
    viewH = maxY - minY;
  }
  const sw = Math.max(0, +(el.sw || 0));
  const hasStroke = sw > 0 && el.stroke && el.stroke !== 'none' && el.stroke !== 'transparent';
  if (hasStroke && Array.isArray(el.shapePts) && el.shapePts.length >= 3) {
    const pad = sw / 2 + 1;
    const right = viewX + viewW;
    const bottom = viewY + viewH;
    const baseW = Math.max(1, +(el.w || 40));
    const baseH = Math.max(1, +(el.h || 24));
    viewX = Math.min(viewX, -pad);
    viewY = Math.min(viewY, -pad);
    viewW = Math.max(right, baseW + pad) - viewX;
    viewH = Math.max(bottom, baseH + pad) - viewY;
  }
  const outW = Math.max(1, Math.round(viewW * sx));
  const outH = Math.max(1, Math.round(viewH * sy));
  // Omit huge fillImg data from cache key — layout + key is enough.
  const optsKey = {
    ...opts,
    fillImg: hasFillImg ? `1:${el.fillImgKey || ''}:${Math.round(el.fillImgX || 0)},${Math.round(el.fillImgY || 0)},${Math.round(el.fillImgW || 0)}x${Math.round(el.fillImgH || 0)},${el.fillImgRot || 0}` : null,
  };
  const key = `shape_${el.id}_${pw}x${ph}_${JSON.stringify(optsKey)}_view${viewX},${viewY},${viewW},${viewH}_g${gen}`;
  const cached = thumbShapeCache.get(key);
  const drawSvg = (img) => {
    ctx.save();
    if (el.rot) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((el.rot * Math.PI) / 180);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }
    try {
      ctx.drawImage(img, x + viewX * sx, y + viewY * sy, viewW * sx, viewH * sy);
    } catch (e) {
      if (!hasFillImg) placeholder();
    }
    ctx.restore();
  };
  if (cached) {
    // Fill image first (under stroke SVG), then geometry/stroke on top.
    if (hasFillImg && !fillImgReady) drawThumbShapeFillImg(ctx, el, x, y, w, h, sx, sy, onReady);
    drawSvg(cached);
    return;
  }
  if (!hasFillImg) placeholder();
  if (thumbShapePending.has(key)) return;
  thumbShapePending.add(key);
  try {
    // Reuse the SAME shape-geometry code the real editor/preview uses (buildBasicShapeSVG),
    // instead of the old thumbnail-only approximation that only ever drew an ellipse or a
    // rounded rectangle for every shape (so a star, triangle, arrow, etc. all showed up as a
    // plain rounded box on the thumbnail).
    const svgStr = buildBasicShapeSVG(el.shape || 'rect', opts);
    const sized = svgStr.replace(/^<svg([^>]*)>/i, (m, attrs) => {
      const noDimensions = String(attrs)
        .replace(/\s*width="[^"]*"/g, '')
        .replace(/\s*height="[^"]*"/g, '')
        .replace(/\s*viewBox="[^"]*"/i, '');
      return `<svg${noDimensions} viewBox="${viewX} ${viewY} ${viewW} ${viewH}" width="${outW}" height="${outH}">`;
    });
    const blob = new Blob([sized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      thumbShapePending.delete(key);
      URL.revokeObjectURL(url);
      if (gen !== thumbCacheGen) return;
      thumbShapeCache.set(key, img);
      if (typeof onReady === 'function') onReady();
    };
    img.onerror = () => {
      thumbShapePending.delete(key);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  } catch (e) {
    thumbShapePending.delete(key);
  }
}

function drawThumbShapeText(ctx, el, x, y, w, h, sx, sy) {
  if (!el.shapeHtml) return;
  const { padT, padR, padB, padL, padX, padY, edge } = shapeTextLayout(el);
  const style = parseShapeTextCss(el.shapeTextCss);
  const fontSize = Math.max(10, (parseFloat(style.fontSize) || 24) * sy);
  const text = String(el.shapeHtml)
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '$&<br>')
    .replace(/<\/?(ul|ol)[^>]*>/gi, '')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '<br>');
  const lines = htmlToLines(text);
  if (!lines.length) return;

  const scaledPadL = Math.max(0, (padL ?? padX) * sx);
  const scaledPadR = Math.max(0, (padR ?? padX) * sx);
  const scaledPadT = Math.max(0, (padT ?? padY) * sy);
  const scaledPadB = Math.max(0, (padB ?? padY) * sy);
  const inset = edge * Math.min(sx, sy);
  const textX = x + inset + scaledPadL;
  const textY = y + inset + scaledPadT;
  const textW = Math.max(1, w - inset * 2 - scaledPadL - scaledPadR);
  const textH = Math.max(1, h - inset * 2 - scaledPadT - scaledPadB);

  ctx.save();
  if (el.rot) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((el.rot * Math.PI) / 180);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  ctx.beginPath();
  ctx.rect(textX, textY, textW, textH);
  ctx.clip();
  ctx.fillStyle = style.color || '#ffffff';
  ctx.font = `${style.fontStyle || 'normal'} ${style.fontWeight || '700'} ${fontSize}px ${style.fontFamily || 'Arial,sans-serif'}`;
  ctx.textAlign = style.textAlign === 'left' || style.textAlign === 'right' ? style.textAlign : 'center';
  ctx.textBaseline = 'top';

  const lineHeightValue = parseFloat(style.lineHeight) || 1.15;
  const lineHeight = Math.max(
    fontSize,
    /px$/i.test(style.lineHeight) ? lineHeightValue * sy : fontSize * lineHeightValue
  );
  const wrapped = [];
  lines.forEach((line) => wrapped.push(...wrapCanvasLine(ctx, line, textW)));
  const maxLines = Math.max(1, Math.floor(textH / lineHeight));
  const visibleLines = wrapped.slice(0, maxLines);
  const blockHeight = visibleLines.length * lineHeight;
  const startY = textY + Math.max(0, (textH - blockHeight) / 2);
  visibleLines.forEach((line, index) => {
    const textPosX =
      ctx.textAlign === 'left' ? textX : ctx.textAlign === 'right' ? textX + textW : textX + textW / 2;
    ctx.fillText(line, textPosX, startY + index * lineHeight, textW);
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
  const svgContent = el.svgContent || el.svg || '';
  if (!svgContent) {
    placeholder();
    return;
  }
  if (!el._isDecor && svgContent.length > THUMB_SVG_HEAVY) {
    placeholder();
    return;
  }
  const pw = Math.max(1, Math.round(w));
  const ph = Math.max(1, Math.round(h));
  const gen = thumbCacheGen;
  const key = `svgel_${el.id}_${pw}x${ph}_${contentFinger(svgContent)}_g${gen}`;
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
  let inner = stripSvgAnimForThumb(svgContent.trim());
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
    if (String(el.imgFrame) === 'ribbon') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, w, h);
    }
    let imgX = x;
    let imgY = y;
    let imgW = w;
    let imgH = h;
    if (String(el.imgFrame) === 'polaroid') {
      const m = polaroidMetrics(el);
      const sideX = Math.max(1, m.side * sx);
      const sideY = Math.max(1, m.side * sy);
      const bot = Math.max(sideY + 2, m.bottom * sy);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, w, h);
      imgX = x + sideX;
      imgY = y + sideY;
      imgW = Math.max(1, w - sideX * 2);
      imgH = Math.max(1, h - sideY - bot);
      ctx.fillStyle = '#e8edf3';
      ctx.fillRect(imgX, imgY, imgW, imgH);
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
      ctx.rect(imgX, imgY, imgW, imgH);
      ctx.clip();
      ctx.drawImage(img, imgX - cL * kx * sx, imgY - cT * ky * sy, fW * kx * sx, fH * ky * sy);
    } else {
      ctx.beginPath();
      ctx.rect(imgX, imgY, imgW, imgH);
      ctx.clip();
      ctx.drawImage(img, imgX, imgY, imgW, imgH);
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
    .map(
      (e) =>
        `${e.id}:${(e.codeRaw || '').length}:${e.codeTheme || ''}:${e.codeFs || ''}:${e.codeGlass ? 1 : 0}:${e.codeLineNums ? 1 : 0}`
    )
    .join(',');
  const tables = (slide.els || [])
    .filter((e) => e && e.type === 'table')
    .map((e) => `${e.id}:${e.rows || 0}x${e.cols || 0}`)
    .join(',');
  const svgs = (slide.els || [])
    .filter((e) => e && (e.type === 'svg' || e.svgContent || e.svg))
    .map((e) => `${e.id}:${contentFinger(e.svgContent || e.svg || '')}`)
    .join(',');
  const texts = (slide.els || [])
    .filter((e) => e && (e.type === 'text' || e.type === 'shape' || e.type === 'markdown'))
    .slice(0, 16)
    .map(
      (e) =>
        `${e.id}:${e.textColor || ''}:${e.fill || ''}:${e.fillOp ?? ''}:${e.textBg || ''}:${e.textBgOp ?? ''}:${e.textBgBlur ?? ''}:${e.shapeBlur ?? ''}:${contentFinger(e.html || e.shapeHtml || e.md || '')}`
    )
    .join(',');
  const shapes = (slide.els || [])
    .filter((e) => e && e.type === 'shape')
    .map(
      (e) =>
        `${e.id}:${e.shape || ''}:${e.w || ''}x${e.h || ''}:${e.rot || 0}:${e.fill || ''}:${e.fillOp ?? ''}:${e.stroke || ''}:${e.sw ?? ''}:${e.rx ?? ''}:${e.tailX ?? ''},${e.tailY ?? ''},${e.tailRoundX ?? ''},${e.tailRoundY ?? ''},${e.tailWFrac ?? ''}:${e.calloutForm || ''}:${e.shapeTextCss || ''}:${e.pad_t ?? ''},${e.pad_r ?? ''},${e.pad_b ?? ''},${e.pad_l ?? ''},${e.padUnit || ''}:${JSON.stringify(e.shapePts || null)}:${contentFinger(e.shapeHtml || '')}:fi${e.fillImg ? 1 : 0}${e.fillImgShow === false ? 0 : 1}:${e.fillImgKey || ''}:${Math.round(e.fillImgX || 0)},${Math.round(e.fillImgY || 0)},${Math.round(e.fillImgW || 0)}x${Math.round(e.fillImgH || 0)},${e.fillImgRot || 0}:${contentFinger(e.fillImg || '', 32)}`
    )
    .join(',');
  const audios = (slide.els || [])
    .filter((e) => e && e.type === 'mediaaudio')
    .map((e) => `${e.id}:${Math.round(e.w || 0)}x${Math.round(e.h || 0)}:${contentFinger(e.src || e.mediaSrc || '', 24)}`)
    .join(',');
  return `${i}|${slide.bgc || ''}|bg${bg}|${n}|${ink}|f${inkFills}|${title}|${formulas}|${images}|${icons}|${codes}|${tables}|${svgs}|${texts}|sh${shapes}|a${audios}|${(slide.els || [])
    .slice(0, 12)
    .map((e) => `${e?.id}:${e?.type}:${Math.round(e?.x || 0)},${Math.round(e?.y || 0)}`)
    .join(';')}|${extra}`;
}

/** Render missing formulaSvg for formula elements (PPTX / LLM JSON / old saves). */
export async function hydrateMissingFormulas(slides) {
  if (!Array.isArray(slides) || !slides.length) return 0;
  const { renderFormulaSvg, formulaSvgUsable, latexForSvgBake } = await import('./mathjax.js');
  const need = [];
  slides.forEach((s) => {
    (s.els || []).forEach((el) => {
      if (!el || el.type !== 'formula' || !el.formulaRaw) return;
      if (formulaSvgUsable(el.formulaSvg)) return;
      need.push(el);
    });
  });
  if (!need.length) return 0;
  let n = 0;
  for (const el of need) {
    try {
      const raw = latexForSvgBake(el.formulaRaw);
      if (raw && raw !== el.formulaRaw) el.formulaRaw = raw;
      el.formulaSvg = await renderFormulaSvg(raw || el.formulaRaw);
      if (formulaSvgUsable(el.formulaSvg)) n += 1;
    } catch (e) {
      console.warn('[hydrateMissingFormulas]', e);
    }
  }
  return n;
}

/** Clone slides so formula el references change after in-place hydrate (Zustand selectors). */
export function cloneSlidesAfterFormulaHydrate(slides) {
  return (slides || []).map((s) => ({
    ...s,
    els: (s.els || []).map((e) => (e && e.type === 'formula' ? { ...e } : e)),
  }));
}
