/** Lego brick SVG builders (ported from js/41-lego.js). */

export const LEGO_U = 40;
export const LEGO_GY = 12;
export const LEGO_SH = 10;
export const LEGO_SW = 26;
export const LEGO_FH = LEGO_GY;
export const LEGO_TH = LEGO_GY * 3;

const U = LEGO_U;
const GY = LEGO_GY;
const SH = LEGO_SH;
const SW = LEGO_SW;
const FH = LEGO_FH;
const TH = LEGO_TH;

function fromHex(h) {
  const s = String(h || '#906cf9').replace('#', '');
  if (s.length !== 6) return [144, 108, 249];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function blend(r, g, b, r2, g2, b2, t) {
  return (
    '#' +
    [r, g, b]
      .map((v, i) => Math.round(v + ([r2, g2, b2][i] - v) * t).toString(16).padStart(2, '0'))
      .join('')
  );
}

function colors(hex) {
  const [r, g, b] = fromHex(hex);
  return {
    mid: hex,
    stud: blend(r, g, b, 0, 0, 0, 0.2),
    hl: blend(r, g, b, 255, 255, 255, 0.65),
    dark: blend(r, g, b, 0, 0, 0, 0.3),
  };
}

export function makeLegoSVG(n, tall, base) {
  const bh = tall ? TH : FH;
  const bw = n * U;
  const col = colors(base || '#906cf9');
  let studs = '';
  for (let i = 0; i < n; i++) {
    const sx = i * U + (U - SW) / 2;
    studs +=
      `<rect x="${sx}" y="0" width="${SW}" height="${SH}" rx="1" fill="${col.stud}"/>` +
      `<rect x="${sx + 2}" y="1" width="${SW - 6}" height="${Math.max(2, SH - 4)}" rx="1" fill="${col.hl}" opacity="0.5"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bw} ${bh + SH}" width="${bw}" height="${bh + SH}" style="display:block;overflow:visible">
  ${studs}
  <rect x="0" y="${SH}" width="${bw}" height="${bh}" rx="1" fill="${col.mid}"/>
  <rect x="1" y="${SH + 1}" width="${bw - 2}" height="2" rx="1" fill="${col.hl}" opacity="0.4"/>
  <rect x="0" y="${SH + bh - 3}" width="${bw}" height="3" rx="1" fill="${col.dark}" opacity="0.5"/>
  <rect x="0" y="${SH}" width="2" height="${bh}" rx="1" fill="${col.dark}" opacity="0.28"/>
  <rect x="${bw - 2}" y="${SH}" width="2" height="${bh}" rx="1" fill="${col.dark}" opacity="0.38"/>
</svg>`;
}

export function makeLegoSlopeSVG(n, dir, base) {
  const bw = n * U;
  const col = colors(base || '#906cf9');
  const totalH = SH + TH;
  const yBodyTop = SH;
  const yBot = totalH;
  const yLoTop = yBot - FH;
  const hiIdx = dir === 'slope-right' ? 0 : n - 1;
  const hiX = hiIdx * U;
  const sx = hiX + (U - SW) / 2;
  const stud =
    `<rect x="${sx}" y="0" width="${SW}" height="${SH}" rx="1" fill="${col.stud}"/>` +
    `<rect x="${sx + 2}" y="1" width="${SW - 6}" height="${Math.max(2, SH - 4)}" rx="1" fill="${col.hl}" opacity="0.5"/>`;
  const hiBlock =
    `<rect x="${hiX}" y="${yBodyTop}" width="${U}" height="${TH}" rx="1" fill="${col.mid}"/>` +
    `<rect x="${hiX + 1}" y="${yBodyTop + 1}" width="${U - 2}" height="2" fill="${col.hl}" opacity="0.4"/>`;
  let slopePts;
  if (dir === 'slope-right') {
    slopePts = `${U},${yBodyTop} ${bw},${yLoTop} ${bw},${yBot} ${U},${yBot}`;
  } else {
    slopePts = `0,${yLoTop} ${(n - 1) * U},${yBodyTop} ${(n - 1) * U},${yBot} 0,${yBot}`;
  }
  const slopeBody = `<polygon points="${slopePts}" fill="${col.mid}"/>`;
  let blikPts;
  if (dir === 'slope-right') {
    blikPts = `${U},${yBodyTop} ${bw},${yLoTop} ${bw},${yLoTop + 2} ${U},${yBodyTop + 2}`;
  } else {
    blikPts = `0,${yLoTop} ${(n - 1) * U},${yBodyTop} ${(n - 1) * U},${yBodyTop + 2} 0,${yLoTop + 2}`;
  }
  const blik = `<polygon points="${blikPts}" fill="${col.hl}" opacity="0.4"/>`;
  const shadow = `<rect x="0" y="${yBot - 3}" width="${bw}" height="3" fill="${col.dark}" opacity="0.5"/>`;
  const sideL =
    dir === 'slope-right'
      ? `<rect x="0" y="${yBodyTop}" width="2" height="${TH}" fill="${col.dark}" opacity="0.28"/>`
      : `<rect x="0" y="${yLoTop}" width="2" height="${FH}" fill="${col.dark}" opacity="0.28"/>`;
  const sideR =
    dir === 'slope-right'
      ? `<rect x="${bw - 2}" y="${yLoTop}" width="2" height="${FH}" fill="${col.dark}" opacity="0.38"/>`
      : `<rect x="${bw - 2}" y="${yBodyTop}" width="2" height="${TH}" fill="${col.dark}" opacity="0.38"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bw} ${totalH}" width="${bw}" height="${totalH}" style="display:block;overflow:hidden">
  ${stud}${slopeBody}${hiBlock}${blik}${shadow}${sideL}${sideR}
</svg>`;
}

export function makeLegoStairSVG(base, dir) {
  const col = colors(base || '#906cf9');
  const bw = 2 * U;
  const totalH = SH + TH;
  const yTop = SH;
  const yBot = totalH;
  const yVert = yTop + FH;
  let studs = '';
  for (let i = 0; i < 2; i++) {
    const sx = i * U + (U - SW) / 2;
    studs +=
      `<rect x="${sx}" y="0" width="${SW}" height="${SH}" rx="1" fill="${col.stud}"/>` +
      `<rect x="${sx + 2}" y="1" width="${SW - 6}" height="${Math.max(2, SH - 4)}" rx="1" fill="${col.hl}" opacity="0.5"/>`;
  }
  const bodyPts =
    dir === 'right'
      ? `0,${yTop} ${bw},${yTop} ${bw},${yVert} ${U},${yBot} 0,${yBot}`
      : `0,${yTop} ${bw},${yTop} ${bw},${yBot} ${U},${yBot} 0,${yVert}`;
  const body = `<polygon points="${bodyPts}" fill="${col.mid}"/>`;
  const topBlik = `<rect x="0" y="${yTop}" width="${bw}" height="2" fill="${col.hl}" opacity="0.4"/>`;
  const blik =
    dir === 'right'
      ? `<polygon points="${bw},${yVert} ${U},${yBot} ${U},${yBot + 2} ${bw},${yVert + 2}" fill="${col.hl}" opacity="0.25"/>`
      : `<polygon points="0,${yVert} ${U},${yBot} ${U},${yBot + 2} 0,${yVert + 2}" fill="${col.hl}" opacity="0.25"/>`;
  const shadow = `<rect x="${dir === 'right' ? 0 : U}" y="${yBot - 3}" width="${U}" height="3" fill="${col.dark}" opacity="0.5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bw} ${totalH}" width="${bw}" height="${totalH}" style="display:block;overflow:hidden">
  ${studs}${body}${topBlik}${blik}${shadow}
</svg>`;
}

/** Catalog pieces for insert ribbon / props. */
export const LEGO_PIECES = [
  { id: '1f', labelRu: '1×1 плоский', labelEn: '1×1 flat', n: 1, tall: false },
  { id: '2f', labelRu: '2×1 плоский', labelEn: '2×1 flat', n: 2, tall: false },
  { id: '4f', labelRu: '4×1 плоский', labelEn: '4×1 flat', n: 4, tall: false },
  { id: '1t', labelRu: '1×1 высокий', labelEn: '1×1 tall', n: 1, tall: true },
  { id: '2t', labelRu: '2×1 высокий', labelEn: '2×1 tall', n: 2, tall: true },
  { id: 'sr', labelRu: 'Скос →', labelEn: 'Slope →', n: 2, slope: 'slope-right' },
  { id: 'sl', labelRu: 'Скос ←', labelEn: 'Slope ←', n: 2, slope: 'slope-left' },
  { id: 'stairR', labelRu: 'Ступень →', labelEn: 'Stair →', n: 2, stair: 'right' },
  { id: 'stairL', labelRu: 'Ступень ←', labelEn: 'Stair ←', n: 2, stair: 'left' },
];

export function legoPieceById(id) {
  return LEGO_PIECES.find((p) => p.id === id) || LEGO_PIECES[1];
}

export function legoSizeFor(d) {
  const n = Math.max(1, +(d.legoStuds || 2));
  const bw = n * U;
  let bh;
  if (d.legoStair) bh = TH + SH;
  else if (d.legoSlope) bh = TH + SH;
  else bh = (d.legoTall ? TH : FH) + SH;
  return { w: bw, h: bh };
}

export function snapLegoPos(x, y) {
  return {
    x: Math.round((+x || 0) / U) * U,
    y: Math.round((+y || 0) / GY) * GY,
  };
}

export function buildLegoSvg(d) {
  const color = d.legoColor || '#906cf9';
  const n = Math.max(1, +(d.legoStuds || 2));
  if (d.legoSlope) return makeLegoSlopeSVG(n, d.legoSlope, color);
  if (d.legoStair) return makeLegoStairSVG(color, d.legoStair);
  return makeLegoSVG(n, !!d.legoTall, color);
}

export function defaultLegoFields(pieceOrId = '2f', color = '#906cf9') {
  const piece = typeof pieceOrId === 'string' ? legoPieceById(pieceOrId) : pieceOrId;
  const fields = {
    type: 'lego',
    legoStuds: piece.n,
    legoTall: !!piece.tall,
    legoSlope: piece.slope || null,
    legoStair: piece.stair || null,
    legoColor: color,
    rot: 0,
    anims: [],
  };
  const sz = legoSizeFor(fields);
  return { ...fields, ...sz, ...snapLegoPos(80, 120) };
}
