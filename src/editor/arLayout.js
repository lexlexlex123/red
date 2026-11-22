/**
 * Per-aspect-ratio layout memory (16:9 ↔ 9:16).
 * First switch auto-scales; later switches restore the author's edits for that format.
 */

import { matchCanvasAr } from './canvasDims.js';
import { scaleSlidesToCanvas } from './scaleDeck.js';

/** Content identity — stays the same in 16:9 and 9:16. */
const AR_LAYOUT_SKIP = new Set([
  'id',
  'type',
  'html',
  'text',
  'src',
  'codeRaw',
  'codeLang',
  'formulaRaw',
  'formulaSvg',
  'formulaTex',
  'mdSrc',
  'mdHtml',
  'svgContent',
  'svg',
  'iconId',
  'emoji',
  'graphImg',
  'graphExpr',
  'mediaSrc',
  'mediaName',
  'mediaMime',
  'mediaPoster',
  'anims',
  'objHidden',
  '_isDecor',
  'name',
  'title',
  'cells',
  'rows',
  'cols',
  'showChart',
  'chartType',
  'hfSrc',
  'hfHtml',
  'hfTitle',
  'appletId',
  'classLayout',
  'classZones',
  'classLeftIds',
  'classRightIds',
  'classOkText',
  'classFailText',
  'classBtnLabel',
  'classReplayLabel',
  'classBtnColor',
  'classBtnColorScheme',
  'objName',
  'objSrc',
  'locked',
  'groupId',
  'parentId',
  'shapeHtml',
]);

/**
 * Adj / marker fields: if missing in a snapshot, drop the live value
 * so a full circle in 16:9 does not keep a sector from 9:16.
 */
const AR_LAYOUT_RESET = new Set([
  'arcMode',
  'arcStart',
  'arcEnd',
  'moonPhase',
  'ringInner',
  'starInner',
  'starRays',
  'trapTop',
  'trapBot',
  'paraSkew',
  'chevSkew',
  'chevInner',
  'arrowHead',
  'tailX',
  'tailY',
  'tailRoundX',
  'tailRoundY',
  'tailWFrac',
  'calloutForm',
  'gearTeeth',
  'gearDepth',
  'polySides',
  'sides',
  'curvePoints',
  'curveClosed',
  'fillPattern',
  'shapeFlipH',
  'shapeFlipV',
  'lineFromMarker',
  'lineToMarker',
  'lineMark',
  'cp1',
  'cp2',
  'cloudSeed',
  'cloudCircles',
  'cloudCirclesForm',
  'cloudForm',
  'cloudRefW',
  'cloudRefH',
  'cloudFramed',
  'cloudFrameW',
  'cloudFrameH',
  'rx',
]);

function cloneVal(v) {
  if (v == null || typeof v !== 'object') return v;
  try {
    return JSON.parse(JSON.stringify(v));
  } catch (e) {
    return v;
  }
}

function pickElLayout(el) {
  if (!el || !el.id) return null;
  const out = {};
  for (const k of Object.keys(el)) {
    if (AR_LAYOUT_SKIP.has(k)) continue;
    if (typeof el[k] === 'function') continue;
    out[k] = cloneVal(el[k]);
  }
  return out;
}

export function arLayoutKey(w, h, ar) {
  const k = matchCanvasAr(w, h, ar);
  if (k === '16:9' || k === '9:16') return k;
  const W = Math.round(+w || 0);
  const H = Math.round(+h || 0);
  if (H > W) return '9:16';
  return '16:9';
}

/** Snapshot layout for one slide at the current canvas size. */
export function captureSlideArLayout(slide, canvasW, canvasH) {
  const els = {};
  for (const el of slide?.els || []) {
    if (!el || !el.id || el._isDecor) continue;
    els[el.id] = pickElLayout(el);
  }
  return {
    canvasW: Math.round(+canvasW || 0),
    canvasH: Math.round(+canvasH || 0),
    els,
    ink: slide?.ink ? JSON.parse(JSON.stringify(slide.ink)) : [],
    inkFills: slide?.inkFills ? JSON.parse(JSON.stringify(slide.inkFills)) : [],
    connectors: slide?.connectors ? JSON.parse(JSON.stringify(slide.connectors)) : [],
  };
}

/** Write snapshot into slide.arLayouts[key]. */
export function saveSlideArLayout(slide, key, canvasW, canvasH) {
  if (!slide || !key) return slide;
  const arLayouts = { ...(slide.arLayouts || {}) };
  arLayouts[key] = captureSlideArLayout(slide, canvasW, canvasH);
  return { ...slide, arLayouts };
}

export function saveSlidesArLayout(slides, key, canvasW, canvasH) {
  return (slides || []).map((s) => saveSlideArLayout(s, key, canvasW, canvasH));
}

/**
 * Apply a saved layout onto the live slide (match by element id).
 * Content (html, src, …) stays; geometry/colors come from the snapshot.
 */
export function applySlideArLayout(slide, layout) {
  if (!slide || !layout?.els) return slide;
  const els = (slide.els || []).map((el) => {
    if (!el || !el.id || el._isDecor) return el;
    const snap = layout.els[el.id];
    if (!snap) return el;
    const next = { ...el };
    for (const k of AR_LAYOUT_RESET) {
      if (!(k in snap)) delete next[k];
    }
    for (const k of Object.keys(snap)) {
      next[k] = cloneVal(snap[k]);
    }
    return next;
  });
  const next = { ...slide, els };
  if (layout.ink) next.ink = JSON.parse(JSON.stringify(layout.ink));
  if (layout.inkFills) next.inkFills = JSON.parse(JSON.stringify(layout.inkFills));
  if (layout.connectors) next.connectors = JSON.parse(JSON.stringify(layout.connectors));
  return next;
}

/** True if any slide already has a stored layout for this AR key. */
export function slidesHaveArLayout(slides, key) {
  return (slides || []).some((s) => s && s.arLayouts && s.arLayouts[key]);
}

/**
 * Resolve which deck geometry to show for a desired orientation (preview / phone).
 * Prefers authored arLayouts; if missing, auto-scales from the other format
 * (images keep aspect — same as first editor toggle / HTML playback).
 */
export function resolveDeckForAr(slides, canvasW, canvasH, ar, wantKey) {
  const curKey = arLayoutKey(canvasW, canvasH, ar);
  if (!wantKey || wantKey === curKey) {
    return { slides, canvasW, canvasH, key: curKey };
  }
  const longSide = Math.max(canvasW, canvasH);
  const shortSide = Math.min(canvasW, canvasH);
  const w = wantKey === '16:9' ? longSide : shortSide;
  const h = wantKey === '16:9' ? shortSide : longSide;

  if (!slidesHaveArLayout(slides, wantKey)) {
    // No authored portrait/landscape yet — synthesize from live deck
    const nextSlides = scaleSlidesToCanvas(
      JSON.parse(JSON.stringify(slides || [])),
      canvasW,
      canvasH,
      w,
      h
    );
    return { slides: nextSlides, canvasW: w, canvasH: h, key: wantKey };
  }

  const nextSlides = (slides || []).map((s) => {
    if (!s) return s;
    const saved = s.arLayouts?.[wantKey];
    if (saved?.els) {
      let applied = applySlideArLayout(s, saved);
      if (
        saved.canvasW &&
        saved.canvasH &&
        (saved.canvasW !== w || saved.canvasH !== h)
      ) {
        applied = scaleSlidesToCanvas(
          [applied],
          saved.canvasW,
          saved.canvasH,
          w,
          h
        )[0];
      }
      return applied;
    }
    // Slide without this key — scale from current live geometry
    return scaleSlidesToCanvas([s], canvasW, canvasH, w, h)[0];
  });
  return { slides: nextSlides, canvasW: w, canvasH: h, key: wantKey };
}
