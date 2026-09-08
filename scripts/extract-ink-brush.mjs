import fs from 'fs';

const s = fs.readFileSync('js/48-drawing.js', 'utf8');

function extractFn(name) {
  const re = new RegExp('function ' + name + '\\s*\\(');
  const m = re.exec(s);
  if (!m) throw new Error('missing ' + name);
  let i = m.index;
  let brace = s.indexOf('{', i);
  let depth = 0;
  for (let j = brace; j < s.length; j++) {
    const c = s[j];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(i, j + 1);
    }
  }
  throw new Error('unclosed ' + name);
}

const fns = [
  '_neonBrightPct',
  '_neonLook',
  '_neonGlowExtent',
  '_neonBrighten',
  '_fillBrushStamps',
  '_pathCircleStamps',
  '_paintNeonStamps',
  '_neonContentKey',
  '_neonRasterForStamps',
  '_smoothPoints',
  '_strokeWidthAt',
  '_resamplePath',
  '_brushHalfWidths',
  '_f',
  '_svgQuad',
  '_quadStamp',
  '_brushStamps',
  '_hardStrokeGeom',
];

const bodies = fns.map((n) => {
  let src = extractFn(n);
  // Replace closed-over prefs with stroke fields / defaults
  src = src
    .replace(/_smooth/g, '(stroke&&stroke.smooth!=null?+stroke.smooth:40)')
    .replace(/_taper/g, "(stroke&&stroke.taper||'both')")
    .replace(/_neonBright(?!Pct|en)/g, '(stroke&&stroke.neonBright!=null?+stroke.neonBright:75)');
  // undo over-replacements inside parameter names / locals that got mangled
  return src;
});

// The replace above is too aggressive for _smoothPoints which uses amount param and _smooth global.
// Re-extract clean and do careful rewrites instead.
const clean = fns.map(extractFn);

let brushStampsFn = clean[fns.indexOf('_brushStamps')];
brushStampsFn = brushStampsFn
  .replace(
    'const amt=(stroke.smooth!=null?+stroke.smooth:_smooth)/100;',
    "const amt=(stroke.smooth!=null?+stroke.smooth:40)/100;"
  )
  .replace(
    "const taper=stroke.taper||_taper||'both';",
    "const taper=stroke.taper||'both';"
  );

let halfFn = clean[fns.indexOf('_brushHalfWidths')];
halfFn = halfFn.replace(
  "const taper=stroke.taper||_taper||'both';",
  "const taper=stroke.taper||'both';"
);

let hardFn = clean[fns.indexOf('_hardStrokeGeom')];
hardFn = hardFn.replace(
  'const amt=(stroke.smooth!=null?+stroke.smooth:_smooth)/100;',
  "const amt=(stroke.smooth!=null?+stroke.smooth:40)/100;"
);

let neonBrightPct = clean[fns.indexOf('_neonBrightPct')].replace(
  ':_neonBright;',
  ':75;'
);

const replaced = {
  _brushStamps: brushStampsFn,
  _brushHalfWidths: halfFn,
  _hardStrokeGeom: hardFn,
  _neonBrightPct: neonBrightPct,
};

const finalBodies = fns.map((n) => replaced[n] || clean[fns.indexOf(n)]);

const header = `/** Brush / neon / marker geometry — ported from js/48-drawing.js */
export const PEN_SIZES = [0.5, 1.5, 3, 6, 10, 14, 20];
export const MARKER_SIZES = [6, 10, 14, 20, 28, 36, 48];
export const ERASER_SIZES = [6, 10, 14, 20, 28, 36, 48, 64];

export function isBrushFamily(tool) {
  return tool === 'brush' || tool === 'neon';
}

export function normalizeInkPoints(points) {
  return (points || []).map((p) => {
    if (Array.isArray(p)) {
      return { x: +p[0] || 0, y: +p[1] || 0, p: p[2] != null ? +p[2] : 0.5, t: p[3] };
    }
    return {
      x: +p.x || 0,
      y: +p.y || 0,
      p: p.p != null ? +p.p : 0.5,
      t: p.t,
    };
  });
}

function withNormPoints(stroke) {
  if (!stroke) return stroke;
  return { ...stroke, points: normalizeInkPoints(stroke.points) };
}

`;

const footer = `
export function brushStamps(stroke, sx = 1, sy = 1) {
  return _brushStamps(withNormPoints(stroke), sx, sy);
}

export function hardStrokeGeom(stroke, sx = 1, sy = 1) {
  return _hardStrokeGeom(withNormPoints(stroke), sx, sy);
}

export function neonRaster(stroke, sx = 1, sy = 1) {
  const st = withNormPoints(stroke);
  const stamps = _brushStamps(st, sx, sy);
  if (!stamps.length) return null;
  return _neonRasterForStamps(st, stamps, sx, sy, _neonContentKey(st));
}

export function paintNeonStamps(ctx, stamps, color, stroke, op) {
  return _paintNeonStamps(ctx, stamps, color, withNormPoints(stroke) || {}, op);
}

export function fillBrushStamps(ctx, stamps) {
  return _fillBrushStamps(ctx, stamps);
}

export function inkStrokeSvgMarkupRich(stroke) {
  if (!stroke) return '';
  const st = withNormPoints(stroke);
  const id =
    st.id != null
      ? ' data-ink-id="' + String(st.id).replace(/"/g, '') + '" data-ink-kind="stroke"'
      : ' data-ink-kind="stroke"';
  const color = st.color || '#64748b';
  const op = st.opacity != null ? Math.max(0, Math.min(1, +st.opacity)) : 1;

  if (st.tool === 'neon') {
    const rast = neonRaster(st, 1, 1);
    if (!rast) return '';
    return (
      '<g' +
      id +
      '><image data-ink-neon="raster" pointer-events="none" x="' +
      _f(rast.x) +
      '" y="' +
      _f(rast.y) +
      '" width="' +
      _f(rast.w) +
      '" height="' +
      _f(rast.h) +
      '" href="' +
      rast.href +
      '" xlink:href="' +
      rast.href +
      '"/></g>'
    );
  }

  if (st.tool === 'brush' || !st.tool) {
    const stamps = _brushStamps(st, 1, 1);
    if (!stamps.length) return '';
    let inner = '';
    for (let i = 0; i < stamps.length; i++) {
      const s = stamps[i];
      if (s.kind === 'circle') {
        inner +=
          '<circle cx="' +
          _f(s.cx) +
          '" cy="' +
          _f(s.cy) +
          '" r="' +
          _f(Math.max(0.04, s.r)) +
          '" fill="' +
          color +
          '" stroke="none"/>';
      } else if (s.kind === 'quad' && s.d) {
        inner += '<path d="' + s.d + '" fill="' + color + '" stroke="none"/>';
      }
    }
    return '<g' + id + (op < 1 ? ' opacity="' + op + '"' : '') + '>' + inner + '</g>';
  }

  const geom = _hardStrokeGeom(
    st.tool === 'marker' ? Object.assign({}, st, { pressure: false }) : st,
    1,
    1
  );
  if (!geom) return '';
  if (geom.circle) {
    return (
      '<g' +
      id +
      (op < 1 ? ' opacity="' + op + '"' : '') +
      '><circle cx="' +
      _f(geom.circle.cx) +
      '" cy="' +
      _f(geom.circle.cy) +
      '" r="' +
      _f(Math.max(0.04, geom.circle.r)) +
      '" fill="' +
      color +
      '" stroke="none"/></g>'
    );
  }
  if (!geom.d) return '';
  const opAttr =
    st.tool === 'marker' ? ' stroke-opacity="' + op + '"' : op < 1 ? ' opacity="' + op + '"' : '';
  return (
    '<path' +
    id +
    ' d="' +
    geom.d +
    '" fill="none" stroke="' +
    color +
    '" stroke-width="' +
    geom.width +
    '" stroke-linecap="round" stroke-linejoin="round"' +
    opAttr +
    '/>'
  );
}
`;

const out = header + finalBodies.join('\n\n') + '\n' + footer;
fs.writeFileSync('src/editor/inkBrush.js', out);
console.log('wrote', out.length);
