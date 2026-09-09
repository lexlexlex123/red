/** Text border styles: solid / dashed / dotted / double / wave / zigzag. */

export const TEXT_BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'wave', 'zigzag'];

export function normTextBorderStyle(s) {
  return TEXT_BORDER_STYLES.includes(s) ? s : 'solid';
}

export function textBorderOuterPad(sw, style) {
  const w = Math.max(0, +sw || 0);
  const st = normTextBorderStyle(style);
  if (st === 'wave' || st === 'zigzag') return Math.ceil(w + w * 0.85 + 3);
  if (st === 'double') return Math.ceil(w * 3.5 + 3);
  return 0;
}

function cssBorderStyle(style) {
  const st = normTextBorderStyle(style);
  if (st === 'dashed' || st === 'dotted' || st === 'solid') return st;
  return 'solid';
}

function usesTextChrome(el) {
  return el && (el.type === 'text' || el.type === 'markdown');
}

/** Box CSS for simple CSS borders (solid/dashed/dotted). */
export function textBorderBoxStyle(el) {
  if (!usesTextChrome(el)) return null;
  const w = +(el.textBorderW || 0);
  if (w <= 0) return null;
  const style = normTextBorderStyle(el.textBorderStyle);
  if (style === 'wave' || style === 'zigzag' || style === 'double') return null;
  return {
    border: `${w}px ${cssBorderStyle(style)} ${el.textBorderColor || '#ffffff'}`,
    boxSizing: 'border-box',
  };
}

function perimeterPoint(s, x0, y0, x1, y1) {
  const W = x1 - x0;
  const H = y1 - y0;
  const peri = W * 2 + H * 2;
  let rem = ((s % peri) + peri) % peri;
  if (rem <= W) return { x: x0 + rem, y: y0 };
  rem -= W;
  if (rem <= H) return { x: x1, y: y0 + rem };
  rem -= H;
  if (rem <= W) return { x: x1 - rem, y: y1 };
  rem -= W;
  return { x: x0, y: y1 - rem };
}

function perimeterNormal(s, x0, y0, x1, y1) {
  const W = x1 - x0;
  const H = y1 - y0;
  const peri = W * 2 + H * 2;
  const rem = ((s % peri) + peri) % peri;
  if (rem < W) return { nx: 0, ny: -1 };
  if (rem < W + H) return { nx: 1, ny: 0 };
  if (rem < W * 2 + H) return { nx: 0, ny: 1 };
  return { nx: -1, ny: 0 };
}

function buildWaveZigPath(ow, oh, sw, style) {
  const x0 = -sw / 2;
  const y0 = -sw / 2;
  const x1 = ow + sw / 2;
  const y1 = oh + sw / 2;
  const halfStep = style === 'wave' ? sw * 3.5 : sw * 2.5;
  const amp = sw * 0.85;
  const peri = (x1 - x0) * 2 + (y1 - y0) * 2;
  let nHalf = Math.max(4, Math.round(peri / halfStep));
  if (nHalf % 2 !== 0) nHalf += 1;
  const actualHalf = peri / nHalf;
  let d = '';
  for (let i = 0; i <= nHalf; i++) {
    const s = actualHalf * i;
    const pt = perimeterPoint(s, x0, y0, x1, y1);
    if (i === 0) {
      d += `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)} `;
    } else {
      const mid = perimeterPoint(actualHalf * (i - 0.5), x0, y0, x1, y1);
      const { nx, ny } = perimeterNormal(actualHalf * (i - 0.5), x0, y0, x1, y1);
      const side = (i - 1) % 2 === 0 ? 1 : -1;
      const cpx = (mid.x + nx * amp * side).toFixed(2);
      const cpy = (mid.y + ny * amp * side).toFixed(2);
      if (style === 'wave') d += `Q ${cpx} ${cpy} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)} `;
      else d += `L ${cpx} ${cpy} L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)} `;
    }
  }
  return `${d}Z`;
}

/** SVG markup for double / wave / zigzag borders. */
export function textBorderSvgMarkup(el) {
  if (!usesTextChrome(el)) return '';
  const w = +(el.textBorderW || 0);
  if (w <= 0) return '';
  const style = normTextBorderStyle(el.textBorderStyle);
  if (style !== 'double' && style !== 'wave' && style !== 'zigzag') return '';
  const c = el.textBorderColor || '#ffffff';
  const ow = el.w || 200;
  const oh = el.h || 100;
  const pad = textBorderOuterPad(w, style);
  const vb = `${-pad} ${-pad} ${ow + pad * 2} ${oh + pad * 2}`;
  const wrap = `position:absolute;left:${-pad}px;top:${-pad}px;width:calc(100% + ${pad * 2}px);height:calc(100% + ${pad * 2}px);pointer-events:none;overflow:visible;z-index:5;`;

  if (style === 'double') {
    const x0 = -w / 2;
    const y0 = -w / 2;
    const x1 = ow + w / 2;
    const y1 = oh + w / 2;
    const gap = w * 2.5;
    const rw = x1 - x0;
    const rh = y1 - y0;
    const rects = [
      [x0, y0, rw, rh],
      [x0 + gap, y0 + gap, Math.max(4, rw - gap * 2), Math.max(4, rh - gap * 2)],
    ]
      .map(
        ([x, y, rw2, rh2]) =>
          `<rect x="${x}" y="${y}" width="${rw2}" height="${rh2}" fill="none" stroke="${c}" stroke-width="${w}"/>`
      )
      .join('');
    return `<svg class="react-text-border-svg" style="${wrap}" viewBox="${vb}" preserveAspectRatio="none">${rects}</svg>`;
  }

  const d = buildWaveZigPath(ow, oh, w, style);
  return `<svg class="react-text-border-svg" style="${wrap}" viewBox="${vb}" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function needsTextBorderOverflow(el) {
  if (!usesTextChrome(el)) return false;
  const w = +(el.textBorderW || 0);
  if (w <= 0) return false;
  const style = normTextBorderStyle(el.textBorderStyle);
  return style === 'wave' || style === 'zigzag' || style === 'double';
}
