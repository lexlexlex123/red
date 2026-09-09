from pathlib import Path

p = Path(r'C:/github/red/src/shared/shapes.js')
text = p.read_text(encoding='utf-8')

old_imp = "import { getShapeMeta } from './shapesCatalog.js';"
new_imp = """import { getShapeMeta } from './shapesCatalog.js';
import { arcPath, moonPath, gearPath } from './shapeArcMoonGear.js';
import { buildCalloutSVGPath } from './calloutGeom.js';
import {
  cloudResolveCircles,
  cloudBlobsPath,
  buildCloudArtSvg,
  cloudShadeFromFill,
} from './cloudGeom.js';

/** v7 stores moonPhase in -1..1; some React UIs used -100..100. */
export function normalizeMoonPhase(v) {
  if (v == null || v === '') return -0.5;
  const n = +v;
  if (!Number.isFinite(n)) return -0.5;
  if (Math.abs(n) <= 1) return Math.max(-1, Math.min(1, n));
  return Math.max(-1, Math.min(1, n / 100));
}

function makeBezierClose(cpts, w, h) {
  const last = cpts[cpts.length - 1];
  const first = cpts[0];
  const fc1x =
    last.cp2x != null
      ? last.cp2x
      : last.cp1x != null
        ? last.x * 2 - last.cp1x
        : last.x + (first.x - last.x) * 0.33;
  const fc1y =
    last.cp2y != null
      ? last.cp2y
      : last.cp1y != null
        ? last.y * 2 - last.cp1y
        : last.y + (first.y - last.y) * 0.33;
  const fc2x =
    first.cp1x != null
      ? first.cp1x
      : first.cp2x != null
        ? first.x * 2 - first.cp2x
        : first.x + (last.x - first.x) * 0.33;
  const fc2y =
    first.cp1y != null
      ? first.cp1y
      : first.cp2y != null
        ? first.y * 2 - first.cp2y
        : first.y + (last.y - first.y) * 0.33;
  return ` C ${(fc1x * w).toFixed(2)} ${(fc1y * h).toFixed(2)} ${(fc2x * w).toFixed(2)} ${(fc2y * h).toFixed(2)} ${(first.x * w).toFixed(2)} ${(first.y * h).toFixed(2)} Z`;
}

function curvePathsFromPoints(cpts, w, h, closed) {
  if (!cpts || cpts.length < 2) return null;
  let strokeD = `M ${(cpts[0].x * w).toFixed(2)} ${(cpts[0].y * h).toFixed(2)}`;
  for (let ci = 1; ci < cpts.length; ci++) {
    const pp = cpts[ci - 1];
    const cp = cpts[ci];
    const c1x = pp.cp2x != null ? pp.cp2x : pp.x;
    const c1y = pp.cp2y != null ? pp.cp2y : pp.y;
    const c2x = cp.cp1x != null ? cp.cp1x : cp.x;
    const c2y = cp.cp1y != null ? cp.cp1y : cp.y;
    strokeD += ` C ${(c1x * w).toFixed(2)} ${(c1y * h).toFixed(2)} ${(c2x * w).toFixed(2)} ${(c2y * h).toFixed(2)} ${(cp.x * w).toFixed(2)} ${(cp.y * h).toFixed(2)}`;
  }
  if (closed) strokeD += makeBezierClose(cpts, w, h);
  const fillD = strokeD.endsWith(' Z') ? strokeD : strokeD + makeBezierClose(cpts, w, h);
  return { strokeD, fillD };
}
"""
if old_imp not in text:
    raise SystemExit('import anchor missing')
text = text.replace(old_imp, new_imp, 1)

text = text.replace(
"""  if (special === 'callout') return ptsToPath(calloutPts(W, H, m), rx);
  if (special === 'trapezoid') return ptsToPath(trapezoidPts(W, H, m, opts.trapTop, opts.trapBot), rx);
  if (special === 'curve') return scaleCatalogPath('M 10 70 C 10 20 45 20 50 50 C 55 80 90 20 90 30', W, H, m);
  if (special === 'chevron') return ptsToPath(chevronPts(id, W, H, m, opts.chevSkew, opts.chevInner), rx);
  if (special === 'moon') return applyCornerRx(moonPathPx(W, H, m, opts.moonPhase), rx);
  if (special === 'gear') {
    return gearPathPx(W, H, m, opts.gearTeeth != null ? opts.gearTeeth : 12, opts.gearDepth != null ? opts.gearDepth : 0.25);
  }""",
"""  // callout / curve / moon / gear / cloud rendered as specials in buildBasicShapeSVG
  if (special === 'callout' || special === 'curve' || special === 'moon' || special === 'gear' || special === 'cloud') return null;
  if (special === 'trapezoid') return ptsToPath(trapezoidPts(W, H, m, opts.trapTop, opts.trapBot), rx);
  if (special === 'chevron') return ptsToPath(chevronPts(id, W, H, m, opts.chevSkew, opts.chevInner), rx);"""
)

old_ell = """  if (id === 'ellipse' || id === 'circle' || meta?.special === 'ellipse') {
    const cx = W / 2;
    const cy = H / 2;
    const erx = ew / 2;
    const ery = eh / 2;
    if (hasStroke && isDouble) {
      return wrap(
        `<ellipse cx="${cx}" cy="${cy}" rx="${erx}" ry="${ery}" fill="${fill}"${op} stroke="${stroke}" stroke-width="${sw * 3}"/>` +
          `<ellipse cx="${cx}" cy="${cy}" rx="${erx}" ry="${ery}" fill="none" stroke="${fill === 'transparent' || fill === 'none' ? '#fff' : fill}" stroke-width="${sw * 1.4}"/>`
      );
    }
    if (hasStroke && isComplex) {
      const path = complexOutlinePath(style, 8, W, H);
      return wrap(
        `<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(1, erx - sw)}" ry="${Math.max(1, ery - sw)}" fill="${fill}"${op} stroke="none"/>` +
          `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    }
    return wrap(`<ellipse cx="${cx}" cy="${cy}" rx="${erx}" ry="${ery}" fill="${fill}"${op} ${strokeAttr}/>`);
  }"""

new_ell = r"""  if (id === 'ellipse' || id === 'circle' || meta?.special === 'ellipse') {
    const cx = W / 2;
    const cy = H / 2;
    const erx = ew / 2;
    const ery = eh / 2;
    const a1 = opts.arcStart != null ? +opts.arcStart : 0;
    const a2 = opts.arcEnd != null ? +opts.arcEnd : 360;
    const mode = opts.arcMode || 'full';
    const isArc = mode !== 'full' && Math.abs(a2 - a1) < 360;
    if (isArc) {
      const dArc = arcPath(cx, cy, W / 2, H / 2, a1, a2, mode, margin, rxPx);
      return wrap(`<path d="${dArc}" fill="${fill}"${op} ${strokeAttr}/>`);
    }
    if (hasStroke && isDouble) {
      return wrap(
        `<ellipse cx="${cx}" cy="${cy}" rx="${erx}" ry="${ery}" fill="${fill}"${op} stroke="${stroke}" stroke-width="${sw * 3}"/>` +
          `<ellipse cx="${cx}" cy="${cy}" rx="${erx}" ry="${ery}" fill="none" stroke="${fill === 'transparent' || fill === 'none' ? '#fff' : fill}" stroke-width="${sw * 1.4}"/>`
      );
    }
    if (hasStroke && isComplex) {
      const path = complexOutlinePath(style, 8, W, H);
      return wrap(
        `<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(1, erx - sw)}" ry="${Math.max(1, ery - sw)}" fill="${fill}"${op} stroke="none"/>` +
          `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    }
    return wrap(`<ellipse cx="${cx}" cy="${cy}" rx="${erx}" ry="${ery}" fill="${fill}"${op} ${strokeAttr}/>`);
  }

  if (meta?.special === 'callout') {
    const fillAttr = `fill="${fill}"${op}`;
    const sAttr = hasStroke && !isComplex && !isDouble ? `stroke="${stroke}" stroke-width="${sw}"${dash}` : 'stroke="none"';
    const dCall = {
      ...opts,
      sw,
      stroke,
      strokeStyle: style,
      rx: rxPx,
      fill: opts.fill,
    };
    const inner = buildCalloutSVGPath(dCall, W, H, meta, fillAttr, sAttr, '', margin);
    return wrap(inner || '');
  }

  if (meta?.special === 'cloud') {
    const dCloud = { ...opts, sw, stroke, fill: opts.fill || fill };
    const circles = cloudResolveCircles(dCloud, W, H);
    const path = cloudBlobsPath(circles, 0);
    let strokePart = '';
    if (sw > 0) {
      const strokePath = cloudBlobsPath(circles, sw / 2);
      const strokeFill =
        opts.fillOp != null && opts.fillOp < 1
          ? `fill="${stroke}" fill-opacity="${(+opts.fillOp).toFixed(3)}"`
          : `fill="${stroke}"`;
      strokePart = `<path d="${strokePath}" fill-rule="nonzero" ${strokeFill} stroke="none"/>`;
    }
    let fillPart = '';
    const hasFillCloud = fill && fill !== 'none' && fill !== 'transparent';
    if (hasFillCloud) {
      if (opts.fillGrad && opts.fillGrad2) {
        fillPart = `<path d="${path}" fill-rule="nonzero" fill="${fill}"${op} stroke="none"/>`;
      } else {
        const shade = cloudShadeFromFill(opts.fill || fill);
        fillPart = buildCloudArtSvg(
          circles,
          opts.fill || fill,
          shade,
          opts.fillOp != null ? +opts.fillOp : 1,
          opts.uid || 'c',
          '',
          '',
          W,
          H
        );
      }
    }
    return wrap(strokePart + fillPart);
  }

  if (meta?.special === 'moon') {
    const phase = normalizeMoonPhase(opts.moonPhase);
    const dMoon = moonPath(W / 2, H / 2, ew / 2, eh / 2, phase, rxPx);
    return wrap(`<path d="${dMoon}" fill="${fill}"${op} ${strokeAttr}/>`);
  }

  if (meta?.special === 'gear') {
    const nTeeth = Math.max(3, Math.min(60, +(opts.gearTeeth != null ? opts.gearTeeth : 12)));
    const toothD = Math.max(0.05, Math.min(0.6, +(opts.gearDepth != null ? opts.gearDepth : 0.25)));
    const gp = gearPath(W / 2, H / 2, ew / 2, eh / 2, nTeeth, toothD);
    return wrap(`<path d="${gp}" fill="${fill}"${op} fill-rule="evenodd" ${strokeAttr}/>`);
  }

  if (meta?.special === 'curve') {
    const cpts = opts.curvePoints;
    const closed = !!opts.curveClosed;
    const paths = curvePathsFromPoints(cpts, W, H, closed);
    if (!paths) {
      const fallback = scaleCatalogPath('M 10 70 C 10 20 45 20 50 50 C 55 80 90 20 90 30', W, H, margin);
      return wrap(
        `<path d="${fallback}" fill="none" stroke="${lineStroke}" stroke-width="${lineSw}"${dash} stroke-linecap="round"/>`
      );
    }
    const hasFillCurve = !noFill && fill && fill !== 'none' && fill !== 'transparent';
    if (hasFillCurve && sw > 0) {
      return wrap(
        `<path d="${paths.fillD}" fill="${fill}"${op} stroke="none"/>` +
          `<path d="${paths.strokeD}" fill="none" ${strokeAttr} stroke-linecap="round" stroke-linejoin="round"/>`
      );
    }
    if (hasFillCurve) return wrap(`<path d="${paths.fillD}" fill="${fill}"${op} stroke="none"/>`);
    return wrap(
      `<path d="${paths.strokeD}" fill="none" stroke="${lineStroke}" stroke-width="${lineSw}"${dash} stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }"""

if old_ell not in text:
    raise SystemExit('ellipse block missing')
text = text.replace(old_ell, new_ell, 1)

old_opts = """export function shapeOptsFromEl(el) {
  if (!el) return {};
  const meta = getShapeMeta(el.shape || el.shapeId || 'rect');
  return {
    fill: el.fill && el.fill !== 'none' ? el.fill : 'transparent',
    stroke: el.stroke || 'none',
    strokeWidth: el.sw != null ? el.sw : 2,
    strokeStyle: el.strokeStyle || 'solid',
    fillGrad: el.fillGrad || null,
    fillGrad2: el.fillGrad2 || null,
    fillGradDir: el.fillGradDir != null ? el.fillGradDir : 90,
    fillOp: el.fillOp != null ? el.fillOp : 1,
    rx: el.rx != null ? el.rx : 0,
    w: el.w != null ? +el.w : 100,
    h: el.h != null ? +el.h : 100,
    sides: el.polySides != null ? el.polySides : el.sides,
    polySides: el.polySides != null ? el.polySides : el.sides,
    starRays: el.starRays,
    starInner: el.starInner,
    trapTop: el.trapTop,
    trapBot: el.trapBot,
    paraSkew: el.paraSkew,
    chevSkew: el.chevSkew,
    chevInner: el.chevInner,
    moonPhase: el.moonPhase,
    gearTeeth: el.gearTeeth,
    gearDepth: el.gearDepth,
    noFill: !!(el.noFill || meta?.noFill),
    lineFromMarker: el.lineFromMarker || 'none',
    lineToMarker: el.lineToMarker || 'none',
    lineMark: el.lineMark || 'none',
    uid: el.id,
  };
}"""

new_opts = """export function shapeOptsFromEl(el) {
  if (!el) return {};
  const meta = getShapeMeta(el.shape || el.shapeId || 'rect');
  const sw = el.sw != null ? el.sw : 2;
  return {
    fill: el.fill && el.fill !== 'none' ? el.fill : 'transparent',
    stroke: el.stroke || 'none',
    strokeWidth: sw,
    sw,
    strokeStyle: el.strokeStyle || 'solid',
    fillGrad: el.fillGrad || null,
    fillGrad2: el.fillGrad2 || null,
    fillGradDir: el.fillGradDir != null ? el.fillGradDir : 90,
    fillOp: el.fillOp != null ? el.fillOp : 1,
    rx: el.rx != null ? el.rx : 0,
    w: el.w != null ? +el.w : 100,
    h: el.h != null ? +el.h : 100,
    sides: el.polySides != null ? el.polySides : el.sides,
    polySides: el.polySides != null ? el.polySides : el.sides,
    starRays: el.starRays,
    starInner: el.starInner,
    trapTop: el.trapTop,
    trapBot: el.trapBot,
    paraSkew: el.paraSkew,
    chevSkew: el.chevSkew,
    chevInner: el.chevInner,
    moonPhase: el.moonPhase,
    gearTeeth: el.gearTeeth,
    gearDepth: el.gearDepth,
    arcMode: el.arcMode || 'full',
    arcStart: el.arcStart,
    arcEnd: el.arcEnd,
    tailX: el.tailX,
    tailY: el.tailY,
    tailRoundX: el.tailRoundX,
    tailRoundY: el.tailRoundY,
    tailWFrac: el.tailWFrac,
    calloutForm: el.calloutForm,
    curvePoints: el.curvePoints,
    curveClosed: el.curveClosed,
    cloudSeed: el.cloudSeed,
    cloudForm: el.cloudForm,
    cloudCircles: el.cloudCircles,
    cloudCirclesForm: el.cloudCirclesForm,
    cloudRefW: el.cloudRefW,
    cloudRefH: el.cloudRefH,
    cloudFramed: el.cloudFramed,
    noFill: !!(el.noFill || meta?.noFill),
    lineFromMarker: el.lineFromMarker || 'none',
    lineToMarker: el.lineToMarker || 'none',
    lineMark: el.lineMark || 'none',
    uid: el.id,
  };
}"""

if old_opts not in text:
    raise SystemExit('shapeOptsFromEl missing')
text = text.replace(old_opts, new_opts, 1)

p.write_text(text, encoding='utf-8')
print('ok', len(text))
