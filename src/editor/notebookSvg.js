/** Notebook paper SVG helpers — parity with themes/00-engine.js (_notebookAxesOverlay). */

function notebookSchemeColors(a1, a2) {
  const theme =
    typeof window._activeThemeForScheme === 'function' ? window._activeThemeForScheme() : null;
  const isLight = !!(theme && theme.dark === false);
  const fallback1 = a1 || (isLight ? '#cbd5e1' : '#475569');
  let lineCol = fallback1;
  if (theme && typeof window._schemeSwatchColor === 'function') {
    const c16 = window._schemeSwatchColor(theme, 0, 5);
    if (c16) lineCol = c16;
  }
  return {
    theme,
    isLight,
    lineCol,
    lineOp: isLight ? 0.5 : 0.4,
  };
}

function notebookEdgeMaskDefs(uid, w, h, fade) {
  const fPct = Math.max(4, Math.min(18, Math.round((fade != null ? fade : 0.08) * 100)));
  return `<defs>
    <linearGradient id="${uid}fx" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="${fPct}%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="${100 - fPct}%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${uid}fy" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="${fPct}%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="${100 - fPct}%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="${uid}mx" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">
      <rect width="${w}" height="${h}" fill="url(#${uid}fx)"/>
    </mask>
    <mask id="${uid}my" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">
      <rect width="${w}" height="${h}" fill="url(#${uid}fy)"/>
    </mask>
  </defs>`;
}

/** Coordinate axes on grid (unit = one cell). Modes: axes-center | axes-q1 | axes-q1inv | axes-q1right */
function notebookAxesOverlay(w, h, cell, axesMode, axisCol) {
  if (!axesMode || !cell || cell <= 0) return '';
  const f = (n) => n.toFixed(1);
  const snap = (v) => Math.max(0, Math.min(w, Math.round(v / cell) * cell));
  const snapY = (v) => Math.max(0, Math.min(h, Math.round(v / cell) * cell));
  const margin = cell;
  const tick = Math.max(3, cell * 0.18);
  const swA = Math.max(1.2, cell * 0.06);
  const ah = Math.max(5, cell * 0.28);
  const axOp = 0.48;

  let ox;
  let oy;
  let xMin;
  let xMax;
  let yMin;
  let yMax;
  let xPosRight = true;
  let yPosDown = false;

  if (axesMode === 'axes-center') {
    ox = snap(w * 0.5);
    oy = snapY(h * 0.5);
    xMin = 0;
    xMax = w;
    yMin = 0;
    yMax = h;
    xPosRight = true;
    yPosDown = false;
  } else if (axesMode === 'axes-q1') {
    ox = snap(margin);
    oy = snapY(h - margin);
    xMin = ox;
    xMax = w;
    yMin = 0;
    yMax = oy;
    xPosRight = true;
    yPosDown = false;
  } else if (axesMode === 'axes-q1inv') {
    ox = snap(margin);
    oy = snapY(margin);
    xMin = ox;
    xMax = w;
    yMin = oy;
    yMax = h;
    xPosRight = true;
    yPosDown = true;
  } else if (axesMode === 'axes-q1right') {
    ox = snap(w * 0.5);
    oy = snapY(h - margin - 3 * cell);
    if (ox < margin) ox = snap(margin);
    if (oy < margin) oy = snap(margin);
    if (oy > h - margin) oy = snapY(h - margin);
    xMin = ox;
    xMax = w;
    yMin = 0;
    yMax = oy;
    xPosRight = true;
    yPosDown = false;
  } else {
    return '';
  }

  const uid = 'ax' + Math.random().toString(36).slice(2, 7);
  const col = axisCol || '#1e293b';
  const fs = Math.max(9, cell * 0.36);
  const fsAxis = Math.max(10, cell * 0.42);

  function arrow(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const bx = x2 - ux * ah;
    const by = y2 - uy * ah;
    const px = -uy * (ah * 0.45);
    const py = ux * (ah * 0.45);
    return `<polygon points="${f(x2)},${f(y2)} ${f(bx + px)},${f(by + py)} ${f(bx - px)},${f(by - py)}" fill="${col}" fill-opacity="${axOp}"/>`;
  }

  let axes = '';
  axes += `<line x1="${f(xMin)}" y1="${f(oy)}" x2="${f(xMax)}" y2="${f(oy)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}" stroke-linecap="round"/>`;
  axes += `<line x1="${f(ox)}" y1="${f(yMin)}" x2="${f(ox)}" y2="${f(yMax)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}" stroke-linecap="round"/>`;

  axes += arrow(ox, oy, xMax - 1, oy);
  if (yMin < oy - cell * 0.2) {
    axes += arrow(ox, oy, ox, yMin + 1);
  } else {
    axes += arrow(ox, oy + ah, ox, Math.max(0, oy - 1));
  }

  let ticks = '';
  let nums = '';
  const numGap = Math.max(2, cell * 0.12);

  function numText(x, y, n, anchor, baseline) {
    return `<text x="${f(x)}" y="${f(y)}" fill="${col}" fill-opacity="${axOp}" font-size="${fs.toFixed(1)}" font-family="system-ui,Segoe UI,sans-serif" text-anchor="${anchor || 'middle'}" dominant-baseline="${baseline || 'hanging'}">${n}</text>`;
  }

  const xNumsAbove = axesMode === 'axes-q1inv';
  let xi = 1;
  for (let x = ox + cell; x <= xMax - cell * 0.35; x += cell, xi++) {
    ticks += `<line x1="${f(x)}" y1="${f(oy - tick)}" x2="${f(x)}" y2="${f(oy + tick)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}"/>`;
    const n = xPosRight ? xi : -xi;
    if (xNumsAbove) nums += numText(x, oy - tick - numGap, n, 'middle', 'auto');
    else nums += numText(x, oy + tick + numGap, n, 'middle', 'hanging');
  }
  xi = 1;
  for (let x = ox - cell; x >= xMin + cell * 0.35; x -= cell, xi++) {
    ticks += `<line x1="${f(x)}" y1="${f(oy - tick)}" x2="${f(x)}" y2="${f(oy + tick)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}"/>`;
    const n = xPosRight ? -xi : xi;
    if (xNumsAbove) nums += numText(x, oy - tick - numGap, n, 'middle', 'auto');
    else nums += numText(x, oy + tick + numGap, n, 'middle', 'hanging');
  }

  let yi = 1;
  for (let y = oy + cell; y <= yMax - cell * 0.35; y += cell, yi++) {
    ticks += `<line x1="${f(ox - tick)}" y1="${f(y)}" x2="${f(ox + tick)}" y2="${f(y)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}"/>`;
    const n = yPosDown ? yi : -yi;
    nums += numText(ox - tick - numGap, y, n, 'end', 'middle');
  }
  yi = 1;
  for (let y = oy - cell; y >= yMin + cell * 0.35; y -= cell, yi++) {
    ticks += `<line x1="${f(ox - tick)}" y1="${f(y)}" x2="${f(ox + tick)}" y2="${f(y)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}"/>`;
    const n = yPosDown ? -yi : yi;
    nums += numText(ox - tick - numGap, y, n, 'end', 'middle');
  }

  const or = Math.max(2, cell * 0.1);
  ticks += `<circle cx="${f(ox)}" cy="${f(oy)}" r="${f(or)}" fill="${col}" fill-opacity="${axOp}"/>`;
  if (xNumsAbove) nums += numText(ox - tick - numGap, oy - tick - numGap, '0', 'end', 'auto');
  else nums += numText(ox - tick - numGap, oy + tick + numGap, '0', 'end', 'hanging');

  let lx;
  let ly;
  let lyx;
  let lyy;
  if (xPosRight) {
    lx = xMax - ah * 1.6;
    lyx = oy + fsAxis * 0.95;
  } else {
    lx = xMin + ah * 0.8;
    lyx = oy + fsAxis * 0.95;
  }
  if (yPosDown) {
    ly = yMax - ah * 0.4;
    lyy = ox + fsAxis * 0.85;
  } else {
    ly = yMin + ah * 1.1;
    lyy = ox + fsAxis * 0.85;
  }
  const labels =
    `<text x="${f(lx)}" y="${f(lyx)}" fill="${col}" fill-opacity="${axOp}" font-size="${fsAxis.toFixed(1)}" font-family="Georgia,serif" font-style="italic">x</text>` +
    `<text x="${f(lyy)}" y="${f(ly)}" fill="${col}" fill-opacity="${axOp}" font-size="${fsAxis.toFixed(1)}" font-family="Georgia,serif" font-style="italic">y</text>`;

  return `<g id="${uid}-axes">${axes}${ticks}${nums}${labels}</g>`;
}

export function notebookLayoutSvg(w, h, paper, a1, a2, axesMode) {
  const p = paper || {};
  const c = notebookSchemeColors(a1, a2);
  const scale = w / 1200;
  const f = (n) => n.toFixed(1);
  const fade = p.fade != null ? p.fade : 0.08;
  const uid = 'nb' + Math.random().toString(36).slice(2, 7);
  const sw = Math.max(0.45, scale).toFixed(2);
  let lines = '';
  let cellPx = 0;
  if (p.kind === 'lined') {
    const pitch = (p.pitch || 32) * scale;
    const inset = fade * w;
    for (let y = pitch; y < h - pitch * 0.25; y += pitch) {
      lines += `<line x1="${f(inset)}" y1="${f(y)}" x2="${f(w - inset)}" y2="${f(y)}" stroke="${c.lineCol}" stroke-opacity="${c.lineOp}" stroke-width="${sw}"/>`;
    }
  } else {
    cellPx = (p.cell || 36) * scale;
    for (let y = 0; y <= h; y += cellPx) {
      lines += `<line x1="0" y1="${f(y)}" x2="${w}" y2="${f(y)}" stroke="${c.lineCol}" stroke-opacity="${c.lineOp}" stroke-width="${sw}"/>`;
    }
    for (let x = 0; x <= w; x += cellPx) {
      lines += `<line x1="${f(x)}" y1="0" x2="${f(x)}" y2="${h}" stroke="${c.lineCol}" stroke-opacity="${c.lineOp}" stroke-width="${sw}"/>`;
    }
  }
  let axisCol = c.lineCol;
  if (c.theme && typeof window._schemeSwatchColor === 'function') {
    axisCol = window._schemeSwatchColor(c.theme, 0, 3) || c.lineCol;
  }
  const axes = axesMode && cellPx ? notebookAxesOverlay(w, h, cellPx, axesMode, axisCol) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
    ${notebookEdgeMaskDefs(uid, w, h, fade)}
    <g mask="url(#${uid}mx)"><g mask="url(#${uid}my)">${lines}</g></g>
    ${axes}
  </svg>`;
}

export function installNotebookGlobals() {
  window._notebookLayoutSvg = notebookLayoutSvg;
}
