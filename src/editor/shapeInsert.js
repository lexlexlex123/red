import { getShapeMeta } from '../shared/shapesCatalog.js';
import { cloudRegenerate } from '../shared/cloudGeom.js';
import { getTheme, schemeSwatchColor } from './themes.js';
import { usePresentationStore } from '../stores/presentationStore';
import { useUiStore } from '../stores/uiStore';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';

const FILL_SCHEME = { col: 0, row: 4 };
const STROKE_SCHEME = { col: 0, row: 3 };
const LINE_SCHEME = { col: 0, row: 4 };
const DEFAULT_STROKE_W = 0;
const CLOUD_INSERT_SIZE = 500;

function snap(n) {
  const step = Math.max(1, +(useUiStore.getState().snapStep || 20) || 20);
  return Math.round(n / step) * step;
}

function schemeColor(themeIdx, scheme, fallback) {
  const theme = getTheme(themeIdx) || getTheme(0);
  const c = theme ? schemeSwatchColor(theme, scheme.col, scheme.row) : null;
  return { color: c || fallback, schemeRef: { col: scheme.col, row: scheme.row } };
}

export function defaultShapeFill(themeIdx) {
  return schemeColor(themeIdx, FILL_SCHEME, '#64748b');
}

export function defaultShapeStroke(themeIdx) {
  return schemeColor(themeIdx, STROKE_SCHEME, '#475569');
}

export function defaultLineColor(themeIdx) {
  return schemeColor(themeIdx, LINE_SCHEME, '#64748b');
}

function defaultCurvePoints() {
  return [
    { x: 0.1, y: 0.7, type: 'smooth', cp2x: 0.2, cp2y: 0.3 },
    { x: 0.5, y: 0.3, type: 'smooth', cp1x: 0.3, cp1y: 0.3, cp2x: 0.7, cp2y: 0.3 },
    { x: 0.9, y: 0.7, type: 'smooth', cp1x: 0.8, cp1y: 0.3 },
  ];
}

/**
 * Build a new shape element like v7.1 insertShapeSelected.
 */
export function buildInsertedShape(shapeId, opts = {}) {
  const meta = getShapeMeta(shapeId) || getShapeMeta('rect');
  const id = meta?.id || 'rect';
  const themeIdx = usePresentationStore.getState().appliedThemeIdx;
  const fillDef = defaultShapeFill(themeIdx);
  const strokeDef = defaultShapeStroke(themeIdx);
  const fillIn = opts.fill != null ? opts.fill : fillDef.color;
  const strokeIn = opts.stroke != null ? opts.stroke : strokeDef.color;
  const swIn = opts.sw != null ? +opts.sw : DEFAULT_STROKE_W;
  const fillScheme = opts.fillScheme !== undefined ? opts.fillScheme : fillDef.schemeRef;
  const strokeScheme = opts.strokeScheme !== undefined ? opts.strokeScheme : strokeDef.schemeRef;

  const isCallout = meta?.special === 'callout';
  const isCloud = meta?.special === 'cloud';
  const isCurve = meta?.special === 'curve';
  const isLine = id === 'line';
  const noFill = !!meta?.noFill;

  let fill = noFill ? 'none' : fillIn;
  let stroke = noFill ? fillIn : strokeIn;
  let sw = noFill && !(swIn > 0) ? 2 : swIn;
  let fillSchemeOut = fill === 'none' ? null : fillScheme;
  let strokeSchemeOut = strokeScheme;

  if (isCloud) {
    fill = fillDef.color;
    fillSchemeOut = fillDef.schemeRef;
    stroke = 'transparent';
    strokeSchemeOut = null;
    sw = 0;
  }

  if (isLine) {
    const lc = defaultLineColor(themeIdx);
    stroke = lc.color;
    strokeSchemeOut = lc.schemeRef;
  }

  const size = isCloud ? CLOUD_INSERT_SIZE : 200;
  const w = size;
  const h = isLine ? Math.max(24, (sw || 2) + 16) : size;
  const st = usePresentationStore.getState();
  const cw = Math.max(1, +st.canvasW || DEFAULT_CANVAS_W);
  const ch = Math.max(1, +st.canvasH || DEFAULT_CANVAS_H);

  const el = {
    type: 'shape',
    shape: id,
    x: snap((cw - w) / 2),
    y: snap((ch - h) / 2),
    w: snap(w),
    h: snap(h),
    fill,
    stroke,
    sw,
    rx: isCallout ? 35 : 0,
    fillOp: 1,
    noFill,
    shadow: false,
    shadowBlur: 4,
    shadowSize: 3,
    shadowColor: '#000000',
    shapeHtml: '',
    shapeTextCss: isCallout
      ? 'font-size:24px;font-weight:400;color:#ffffff;text-align:center;font-family:Boingster;'
      : 'font-size:24px;font-weight:700;color:#ffffff;text-align:center;',
    fillScheme: fillSchemeOut,
    strokeScheme: strokeSchemeOut,
    tailX: isCallout ? 0 : undefined,
    tailY: isCallout ? 130 : undefined,
    tailRoundX: isCallout ? 0 : undefined,
    tailRoundY: isCallout ? 94 : undefined,
    tailWFrac: isCallout ? 0.2 : undefined,
    calloutForm: isCallout ? 'round' : undefined,
    cloudSeed: isCloud ? Math.floor(Math.random() * 999999) + 1 : undefined,
    cloudForm: isCloud ? 'puff' : undefined,
    curvePoints: isCurve ? defaultCurvePoints() : undefined,
    curveClosed: isCurve ? false : undefined,
    _lineCapV: isLine ? 2 : undefined,
  };
  // Bake framed circles so first paint matches «Пересоздать» (no size jump)
  if (isCloud) cloudRegenerate(el, null);
  return el;
}
