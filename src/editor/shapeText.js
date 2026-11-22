/** Shape label text (legacy shapeHtml / shapeTextCss / .shape-text). */

import { getShapeMeta } from '../shared/shapesCatalog.js';
import { DEFAULT_TEXT_FONT_FAMILY } from './fonts.js';
import { getShapeNodes } from './shapeNodes.js';
import { textPadCss, textPadValues } from './textPad.js';

export const DEFAULT_SHAPE_TEXT_CSS =
  'font-size:24px;font-weight:700;color:#ffffff;text-align:center;';

function cssProp(cs, prop, fallback) {
  const m = String(cs || '').match(new RegExp(`${prop}:\\s*([^;]+)`, 'i'));
  return m ? m[1].trim() : fallback;
}

export function parseShapeTextCss(cs) {
  const s = cs || DEFAULT_SHAPE_TEXT_CSS;
  const out = {
    fontSize: cssProp(s, 'font-size', '24px'),
    fontWeight: cssProp(s, 'font-weight', '700'),
    color: cssProp(s, 'color', '#ffffff'),
    textAlign: cssProp(s, 'text-align', 'center'),
    lineHeight: cssProp(s, 'line-height', '1.15'),
  };
  const ls = cssProp(s, 'letter-spacing', '');
  if (ls) out.letterSpacing = ls;
  out.fontFamily = cssProp(s, 'font-family', DEFAULT_TEXT_FONT_FAMILY);
  const fst = cssProp(s, 'font-style', '');
  if (fst) out.fontStyle = fst;
  return out;
}

export function getShapeTextColor(el) {
  if (!el) return '#ffffff';
  if (el.textColor) return el.textColor;
  return parseShapeTextCss(el.shapeTextCss).color || '#ffffff';
}

/** Set/replace color: in shapeTextCss. */
export function withShapeTextColor(cs, color) {
  return withShapeTextProp(cs, 'color', color);
}

/** Keep only typography keys (legacy _shapeTextCssPick). */
export function pickShapeTextCss(fromStyle, prev) {
  const src = fromStyle || prev || '';
  const keys = ['font-size', 'font-weight', 'font-family', 'color', 'text-align', 'letter-spacing', 'font-style'];
  const parts = [];
  for (let i = 0; i < keys.length; i++) {
    const re = new RegExp(`(?:^|;)\\s*${keys[i]}\\s*:\\s*([^;]+)`, 'i');
    const m = src.match(re);
    if (m) parts.push(`${keys[i]}:${m[1].trim()}`);
  }
  return parts.length ? `${parts.join(';')};` : prev || DEFAULT_SHAPE_TEXT_CSS;
}

/** Set/replace one CSS property in shapeTextCss. */
export function withShapeTextProp(cs, prop, val) {
  let st = cs || DEFAULT_SHAPE_TEXT_CSS;
  const safe = String(prop).replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
  st = st.replace(new RegExp(`(?:^|;)\\s*${safe}\\s*:[^;]*`, 'gi'), '').replace(/;;+/g, ';').replace(/^;|;$/g, '');
  if (val != null && val !== '') {
    if (st && !/;$/.test(st)) st += ';';
    st += `${prop}:${val};`;
  }
  return pickShapeTextCss(st, st);
}

export function shapeTextFontSizePx(el) {
  const n = parseFloat(parseShapeTextCss(el?.shapeTextCss).fontSize);
  return Number.isFinite(n) ? n : 24;
}

export function shapeTextFontWeight(el) {
  return parseShapeTextCss(el?.shapeTextCss).fontWeight || '700';
}

export function shapeTextFontFamily(el) {
  return parseShapeTextCss(el?.shapeTextCss).fontFamily || DEFAULT_TEXT_FONT_FAMILY;
}

/** View so TextPropsFmt can treat a shape label like a text box. */
export function shapeAsTextView(el) {
  if (!el) return el;
  return {
    ...el,
    html: el.shapeHtml || '',
    cs: el.shapeTextCss || DEFAULT_SHAPE_TEXT_CSS,
    valign: el.valign || 'middle',
  };
}

export function shapeTextLayout(el) {
  const h = Math.max(1, +(el?.h || 100));
  const w = Math.max(1, +(el?.w || 100));
  const cs = el?.shapeTextCss || DEFAULT_SHAPE_TEXT_CSS;
  const fs = parseFloat(cssProp(cs, 'font-size', '24') || 24);
  const meta = getShapeMeta(el?.shape || 'rect');
  const isCallout = meta?.special === 'callout';
  const sw = Math.max(0, +(el?.sw != null ? el.sw : 2));

  let padY = 8;
  let padX = 8;
  if (h < fs * 2.8) {
    padY = Math.max(1, Math.min(4, Math.round(h * 0.05)));
    padX = Math.max(2, Math.min(6, Math.round(w * 0.04)));
  } else if (h < fs * 4) {
    padY = Math.max(2, Math.min(6, Math.round((h - fs) * 0.12)));
    padX = 6;
  }
  const edge = isCallout ? Math.max(2, Math.round(sw * 0.45)) : 0;
  const custom = textPadValues(el);
  let padT = padY;
  let padR = padX;
  let padB = padY;
  let padL = padX;
  if (custom) {
    if (custom.unit === '%') {
      padT = Math.round((custom.t / 100) * h);
      padB = Math.round((custom.b / 100) * h);
      padR = Math.round((custom.r / 100) * w);
      padL = Math.round((custom.l / 100) * w);
    } else {
      padT = custom.t;
      padR = custom.r;
      padB = custom.b;
      padL = custom.l;
    }
  }
  return {
    padX,
    padY,
    padT,
    padR,
    padB,
    padL,
    padCss: custom ? textPadCss(el) : `${padY}px ${padX}px`,
    edge,
    css: cs,
  };
}

function pickQuadPts(pts) {
  if (!pts || pts.length < 4) return null;
  if (pts.length === 4) return pts.map((p) => ({ x: +p.x || 0, y: +p.y || 0 }));
  const corners = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  return corners.map((c) => {
    let best = pts[0];
    let d = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const dd = (p.x - c.x) * (p.x - c.x) + (p.y - c.y) * (p.y - c.y);
      if (dd < d) {
        d = dd;
        best = p;
      }
    }
    return { x: +best.x || 0, y: +best.y || 0 };
  });
}

/** Keep the shape's vertex cycle (TL→TR→BR→BL). Y-sorting broke sheared quads. */
function orderTextQuad(pts) {
  const raw = pickQuadPts(pts);
  if (!raw) return null;
  let start = 0;
  let best = raw[0].x + raw[0].y;
  for (let i = 1; i < 4; i++) {
    const s = raw[i].x + raw[i].y;
    if (s < best) {
      best = s;
      start = i;
    }
  }
  const q = [0, 1, 2, 3].map((i) => raw[(start + i) % 4]);
  if (quadArea(q) < 0) return [q[0], q[3], q[2], q[1]];
  return q;
}

function solve8(A, b) {
  const n = 8;
  const M = A.map((row, i) => row.concat([b[i]]));
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
    }
    if (Math.abs(M[piv][i]) < 1e-10) return null;
    if (piv !== i) {
      const tmp = M[i];
      M[i] = M[piv];
      M[piv] = tmp;
    }
    const div = M[i][i];
    for (let c = i; c <= n; c++) M[i][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = M[r][i];
      if (!f) continue;
      for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
    }
  }
  return M.map((row) => row[n]);
}

function quadArea(q) {
  let a = 0;
  for (let i = 0; i < 4; i++) {
    const p = q[i];
    const n = q[(i + 1) % 4];
    a += p.x * n.y - n.x * p.y;
  }
  return a * 0.5;
}

function isIdentityQuad(q, eps) {
  const e = eps || 0.012;
  return (
    Math.abs(q[0].x) < e &&
    Math.abs(q[0].y) < e &&
    Math.abs(q[1].x - 1) < e &&
    Math.abs(q[1].y) < e &&
    Math.abs(q[2].x - 1) < e &&
    Math.abs(q[2].y - 1) < e &&
    Math.abs(q[3].x) < e &&
    Math.abs(q[3].y - 1) < e
  );
}

/** Pure skew for parallelogram — matches side angle without extra horizontal squash. */
function parallelogramTextSkewCss(el) {
  const W = Math.max(1, +el.w || 1);
  const H = Math.max(1, +el.h || 1);
  const raw = el?.paraSkew != null && el.paraSkew !== '' ? +el.paraSkew : 20;
  const sk = Math.max(-45, Math.min(45, Number.isFinite(raw) ? raw : 20));
  if (!sk) return null;
  const off = Math.min(W - 1, Math.abs(H * Math.tan((sk * Math.PI) / 180)));
  if (off < 0.5) return null;
  const sideDeg = (Math.atan2(off, H) * 180) / Math.PI;
  // CSS skewX>0 leans like `/`; our positive paraSkew leans like `\`.
  const signed = sk < 0 ? sideDeg : -sideDeg;
  return `skewX(${Math.round(signed * 100) / 100}deg)`;
}

/** CSS matrix3d that maps the element box onto the shape's node quad. */
export function shapeTextWarpCss(el) {
  const meta = getShapeMeta(el?.shape || 'rect');
  const special = meta?.special || el?.shape;
  // Custom nodes: keep projective warp. Default parallelogram: pure skewX = side angle.
  if (
    special === 'parallelogram' &&
    !(Array.isArray(el?.shapePts) && el.shapePts.length >= 3)
  ) {
    return parallelogramTextSkewCss(el);
  }
  const pts = getShapeNodes(el);
  const quadN = orderTextQuad(pts);
  if (!quadN || isIdentityQuad(quadN)) return null;
  if (Math.abs(quadArea(quadN)) < 1e-5) return null;
  const W = Math.max(1, +el.w || 1);
  const H = Math.max(1, +el.h || 1);
  const src = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const x = src[i][0];
    const y = src[i][1];
    const u = quadN[i].x;
    const v = quadN[i].y;
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solve8(A, b);
  if (!h) return null;
  const [h00, h01, h02, h10, h11, h12, h20, h21] = h;
  if (![h00, h01, h02, h10, h11, h12, h20, h21].every((n) => Number.isFinite(n))) return null;
  const m00 = h00;
  const m01 = h01 * (W / H);
  const m02 = h02 * W;
  const m10 = h10 * (H / W);
  const m11 = h11;
  const m12 = h12 * H;
  const m20 = h20 / W;
  const m21 = h21 / H;
  return `matrix3d(${m00},${m10},0,${m20},${m01},${m11},0,${m21},0,0,1,0,${m02},${m12},0,1)`;
}

export function shapeTextWarpOrigin(el, warp) {
  if (warp && String(warp).startsWith('skewX')) return '50% 50%';
  return '0 0';
}

/** Outer box style for shape text overlay (React). */
export function shapeTextBoxStyle(el, { editing = false } = {}) {
  const { padCss, edge } = shapeTextLayout(el);
  const t = parseShapeTextCss(el?.shapeTextCss);
  const align = String(t.textAlign || 'center').toLowerCase();
  const valign = el?.valign || 'middle';
  const warp = !editing && !edge ? shapeTextWarpCss(el) : null;
  return {
    position: 'absolute',
    inset: edge,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: valign === 'top' ? 'flex-start' : valign === 'bottom' ? 'flex-end' : 'center',
    textAlign: align === 'justify' ? 'justify' : align,
    boxSizing: 'border-box',
    lineHeight: t.lineHeight || 1.15,
    padding: padCss,
    overflow: 'visible',
    pointerEvents: editing ? 'auto' : 'none',
    zIndex: 2,
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    transformOrigin: shapeTextWarpOrigin(el, warp),
    transform: warp || undefined,
    ...t,
  };
}

/** Markup for export / static preview. */
export function shapeTextExportHtml(el, esc) {
  const html = el?.shapeHtml;
  if (!html) return '';
  const { padCss, edge } = shapeTextLayout(el);
  const t = parseShapeTextCss(el.shapeTextCss);
  const parts = [
    'position:absolute',
    `inset:${edge}px`,
    'display:flex',
    'flex-direction:column',
    'align-items:stretch',
    `justify-content:${el?.valign === 'top' ? 'flex-start' : el?.valign === 'bottom' ? 'flex-end' : 'center'}`,
    `text-align:${t.textAlign || 'center'}`,
    'box-sizing:border-box',
    `padding:${padCss}`,
    'overflow:visible',
    'pointer-events:none',
    'z-index:2',
    'word-break:break-word',
    'white-space:pre-wrap',
    `font-size:${t.fontSize}`,
    `font-weight:${t.fontWeight}`,
    `color:${t.color}`,
    `line-height:${t.lineHeight}`,
  ];
  if (t.fontFamily) {
    // Keep multi-word faces valid inside style="…" (prefer single quotes).
    const ff = String(t.fontFamily).replace(/"/g, "'");
    parts.push(`font-family:${ff}`);
  }
  if (t.fontStyle) parts.push(`font-style:${t.fontStyle}`);
  if (t.letterSpacing) parts.push(`letter-spacing:${t.letterSpacing}`);
  const warp = !edge ? shapeTextWarpCss(el) : null;
  parts.push(`transform-origin:${shapeTextWarpOrigin(el, warp)}`);
  if (warp) parts.push(`transform:${warp}`);
  const escape = typeof esc === 'function' ? esc : (s) => String(s || '');
  return `<div class="shape-text" style="${escape(parts.join(';'))}"><div style="width:100%;text-align:${t.textAlign || 'center'};min-height:0;line-height:1.15;margin:0;padding:0;transform:translateY(-0.07em)">${html}</div></div>`;
}
