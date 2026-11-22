/**
 * Native ODF presentation (editable text / shapes / images / tables / connectors / ink).
 */

import { getTableCell, tableCellBg, tableColWidthsPx, tableRowHeightsPx } from '../editor/tableCells.js';
import { isNoneTableColor, resolveTableEdge } from '../editor/tableBorders.js';
import { getShapeMeta } from '../shared/shapesCatalog.js';
import { buildIconSVG } from '../editor/iconSvg.js';
import { iconPathForRender } from '../editor/iconAnim.js';
import { getIconById } from '../editor/iconsLazy.js';
import { shapeTextFontSizePx, getShapeTextColor } from '../editor/shapeText.js';
import { slideSolidBg, bgImgSrc } from '../editor/slideBgImg.js';
import { normalizeInkPoints } from '../editor/inkBrush.js';
import { ptXY } from '../editor/inkFill.js';
import { nearestSides, edgeMid } from '../editor/connectors.js';
import { buildLegoSvg } from '../editor/lego.js';
import { buildLineAngleContent } from '../editor/lineAngle.js';
import { buildChartSvg } from '../editor/tableChart.js';
import { captureHtmlFrameSnapshot } from '../editor/htmlFrameSnapshot.js';
import { resolveExportPoster } from './mediaPoster.js';
import {
  escXml,
  hexRgb,
  cssColor,
  odpAlign,
  odpShapeType,
  dataUrlToPart,
  svgPart,
  textBoxMeta,
  pxToCm,
  pxToCmNum,
  pathToEnhanced,
} from './nativeShared.js';

const NS =
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ' +
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" ' +
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ' +
  'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" ' +
  'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" ' +
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" ' +
  'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
  'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" ' +
  'xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"';

function pxToPt(px) {
  return Math.max(6, Math.round((+px || 18) * 0.75));
}

function foColor(c, fallback = '#000000') {
  return cssColor(c, fallback);
}

function boxAttrs(el) {
  const w = pxToCm(el.w);
  const h = pxToCm(el.h);
  const rot = +el.rot || 0;
  if (!rot) {
    return `svg:x="${pxToCm(el.x)}" svg:y="${pxToCm(el.y)}" svg:width="${w}" svg:height="${h}"`;
  }
  const cx = pxToCmNum(el.x + (+el.w || 0) / 2);
  const cy = pxToCmNum(el.y + (+el.h || 0) / 2);
  const rad = (-rot * Math.PI) / 180;
  const hw = pxToCmNum((+el.w || 0) / 2);
  const hh = pxToCmNum((+el.h || 0) / 2);
  return (
    `svg:x="-${hw.toFixed(3)}cm" svg:y="-${hh.toFixed(3)}cm" svg:width="${w}" svg:height="${h}" ` +
    `draw:transform="rotate (${rad}) translate (${cx.toFixed(3)}cm ${cy.toFixed(3)}cm)"`
  );
}

function strokeDashName(style) {
  if (style === 'dashed' || style === 'dash') return 'dash';
  if (style === 'dotted' || style === 'dot') return 'dot';
  return '';
}

function StyleBag() {
  this.graphics = [];
  this.paras = [];
  this.texts = [];
  this.cells = [];
  this.pages = [];
  this.grads = [];
  this.cols = [];
  this.rows = [];
  this.n = { g: 0, p: 0, t: 0, c: 0, d: 0, gr: 0, co: 0, ro: 0 };
}

StyleBag.prototype.graphic = function graphic(props) {
  this.n.g += 1;
  const name = 'gr' + this.n.g;
  this.graphics.push({ name, props });
  return name;
};

StyleBag.prototype.para = function para(props) {
  this.n.p += 1;
  const name = 'P' + this.n.p;
  this.paras.push({ name, props });
  return name;
};

StyleBag.prototype.text = function text(props) {
  this.n.t += 1;
  const name = 'T' + this.n.t;
  this.texts.push({ name, props });
  return name;
};

StyleBag.prototype.cell = function cell(props) {
  this.n.c += 1;
  const name = 'ce' + this.n.c;
  this.cells.push({ name, props });
  return name;
};

StyleBag.prototype.page = function page(props) {
  this.n.d += 1;
  const name = 'dp' + this.n.d;
  this.pages.push({ name, props });
  return name;
};

StyleBag.prototype.grad = function grad(start, end, angle) {
  this.n.gr += 1;
  const name = 'gd' + this.n.gr;
  this.grads.push({ name, start, end, angle });
  return name;
};

StyleBag.prototype.column = function column(wCm) {
  this.n.co += 1;
  const name = 'co' + this.n.co;
  this.cols.push({ name, w: wCm });
  return name;
};

StyleBag.prototype.row = function row(hCm) {
  this.n.ro += 1;
  const name = 'ro' + this.n.ro;
  this.rows.push({ name, h: hCm });
  return name;
};

function graphicXml(name, props) {
  const bits = Object.entries(props)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}="${escXml(String(v))}"`)
    .join(' ');
  return `<style:style style:name="${name}" style:family="graphic"><style:graphic-properties ${bits}/></style:style>`;
}

function paraXml(name, props) {
  const bits = Object.entries(props)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}="${escXml(String(v))}"`)
    .join(' ');
  return `<style:style style:name="${name}" style:family="paragraph"><style:paragraph-properties ${bits}/></style:style>`;
}

function textXml(name, props) {
  const bits = Object.entries(props)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}="${escXml(String(v))}"`)
    .join(' ');
  return `<style:style style:name="${name}" style:family="text"><style:text-properties ${bits}/></style:style>`;
}

function cellXml(name, props) {
  const bits = Object.entries(props)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}="${escXml(String(v))}"`)
    .join(' ');
  return `<style:style style:name="${name}" style:family="table-cell"><style:table-cell-properties ${bits}/></style:style>`;
}

function fillProps(el, styles) {
  const noFill = el.fill === 'none' || el.fill === 'transparent' || el.fillOp === 0 || el.noFill;
  const props = {
    'draw:textarea-horizontal-align': 'center',
    'draw:textarea-vertical-align': 'middle',
    'fo:wrap-option': 'wrap',
    'draw:auto-grow-height': 'false',
  };
  if (noFill) {
    props['draw:fill'] = 'none';
  } else if (el.fillGrad && el.fillGrad2) {
    const a = hexRgb(el.fillGrad);
    const b = hexRgb(el.fillGrad2);
    if (a && b) {
      const dir = el.fillGradDir != null ? +el.fillGradDir : 90;
      const gname = styles.grad(a.css, b.css, ((dir % 360) + 360) % 360);
      props['draw:fill'] = 'gradient';
      props['draw:fill-gradient-name'] = gname;
    } else {
      props['draw:fill'] = 'solid';
      props['draw:fill-color'] = foColor(el.fill || '#3b82f6');
    }
  } else {
    props['draw:fill'] = 'solid';
    props['draw:fill-color'] = foColor(el.fill || '#3b82f6');
  }
  if (el.fillOp != null && +el.fillOp < 1 && !noFill) {
    props['draw:opacity'] = `${Math.round(+el.fillOp * 100)}%`;
  }
  const sw = el.sw != null ? +el.sw : 2;
  if (!(sw > 0) || el.stroke === 'none') {
    props['draw:stroke'] = 'none';
  } else {
    const dash = strokeDashName(el.strokeStyle);
    props['draw:stroke'] = dash ? 'dash' : 'solid';
    if (dash) props['draw:stroke-dash'] = dash;
    props['svg:stroke-color'] = foColor(el.stroke || '#1d4ed8');
    props['svg:stroke-width'] = pxToCm(sw);
    if (el.lineToMarker && el.lineToMarker !== 'none') props['draw:marker-end'] = 'arrow';
    if (el.lineFromMarker && el.lineFromMarker !== 'none') props['draw:marker-start'] = 'arrow';
  }
  return props;
}

function runStyle(styles, run, fs, color, face) {
  const props = {
    'fo:font-size': `${pxToPt(run.fs != null ? run.fs : fs)}pt`,
    'fo:color': foColor(run.color || color),
    'fo:font-family': run.face || face || 'Calibri',
  };
  if (run.bold) props['fo:font-weight'] = 'bold';
  if (run.italic) props['fo:font-style'] = 'italic';
  if (run.underline) props['style:text-underline-style'] = 'solid';
  if (run.strike) props['style:text-line-through-style'] = 'solid';
  if (run.script === 'sup') props['style:text-position'] = 'super 58%';
  if (run.script === 'sub') props['style:text-position'] = 'sub 58%';
  return styles.text(props);
}

function parasXml(styles, html, cs, color, align, extra = {}) {
  const meta = textBoxMeta({ cs, textColor: color, textAlign: align }, html);
  const fs = meta.fs;
  const col = color || meta.color;
  const face = meta.face;
  const al = odpAlign(align || meta.align);
  const pName = styles.para({ 'fo:text-align': al, 'fo:margin-left': extra.indent || '0cm' });
  const paras = meta.paras.length
    ? meta.paras
    : [{ runs: [{ text: '' }], listBullet: false, listNum: false }];
  let xml = '';
  let num = 0;
  for (const para of paras) {
    let inner = '';
    for (const run of para.runs) {
      const tName = runStyle(styles, run, fs, col, face);
      inner += `<text:span text:style-name="${tName}">${escXml(run.text || '')}</text:span>`;
    }
    if (!inner) inner = `<text:span text:style-name="${runStyle(styles, {}, fs, col, face)}"/>`;
    if (para.listBullet) {
      xml += `<text:list><text:list-item><text:p text:style-name="${pName}">${inner}</text:p></text:list-item></text:list>`;
    } else if (para.listNum) {
      num += 1;
      xml += `<text:p text:style-name="${pName}">${num}. ${inner}</text:p>`;
    } else {
      xml += `<text:p text:style-name="${pName}">${inner}</text:p>`;
    }
  }
  return xml;
}

function downsamplePts(pts, maxN) {
  if (!pts || pts.length <= maxN) return pts || [];
  const out = [];
  const step = (pts.length - 1) / (maxN - 1);
  for (let i = 0; i < maxN; i++) out.push(pts[Math.round(i * step)]);
  return out;
}

function ptsBBox(pts, pad) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 1, h: 1 };
  const p = Math.max(0, pad || 0);
  return {
    x: minX - p,
    y: minY - p,
    w: Math.max(1, maxX - minX + p * 2),
    h: Math.max(1, maxY - minY + p * 2),
  };
}

function mediaPosterPart(el, bg, label) {
  const text = String(label || '').slice(0, 42);
  if (typeof document !== 'undefined') {
    try {
      const w = Math.max(80, Math.round(+el.w || 320));
      const h = Math.max(45, Math.round(+el.h || 180));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = bg || '#0f172a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 ${Math.max(14, Math.round(h / 7))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2);
      return dataUrlToPart(c.toDataURL('image/png'));
    } catch (e) {}
  }
  const fill = String(bg || '#0f172a').replace(/"/g, '');
  return svgPart(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">` +
      `<rect width="320" height="180" fill="${fill}"/>` +
      `<text x="160" y="96" fill="#ffffff" font-size="22" text-anchor="middle" font-family="sans-serif">${escXml(text)}</text></svg>`
  );
}

function glueEnds(conn, els) {
  const from = (els || []).find((e) => e && String(e.id) === String(conn.fromId));
  const to = (els || []).find((e) => e && String(e.id) === String(conn.toId));
  if (!from || !to) return null;
  const sides = nearestSides(from, to);
  const fromSide = conn.fromSide || sides.fromSide;
  const toSide = conn.toSide || sides.toSide;
  return { p1: edgeMid(from, fromSide), p2: edgeMid(to, toSide) };
}

function connType(route) {
  if (route === 'curve') return 'curve';
  if (route === 'orthogonal') return 'lines';
  return 'line';
}

/**
 * @param {object} slide
 * @param {{ canvasW:number, canvasH:number }} geom
 * @param {{ n:number }} mediaSeq
 * @param {StyleBag} [sharedStyles]
 */
export async function buildNativeOdpSlide(slide, geom, mediaSeq, sharedStyles) {
  const styles = sharedStyles || new StyleBag();
  const pictures = [];
  let tree = '';

  const addPic = (part) => {
    if (!part || !part.bytes) return '';
    mediaSeq.n += 1;
    const name = `pic${mediaSeq.n}.${part.ext}`;
    pictures.push({ name, bytes: part.bytes, mime: part.mime || 'application/octet-stream' });
    return `Pictures/${name}`;
  };

  const bgc = slideSolidBg(slide);
  const bgSrc = bgImgSrc(slide.bgImg);
  const bgPart = bgSrc ? dataUrlToPart(bgSrc) : null;
  const pageProps = {
    'presentation:background-visible': 'true',
    'presentation:background-objects-visible': 'true',
    'draw:fill': 'solid',
    'draw:fill-color': foColor(bgc, '#1a1a2e'),
  };
  const dp = styles.page(pageProps);

  if (bgPart) {
    const href = addPic(bgPart);
    const st = styles.graphic({
      'draw:stroke': 'none',
      'draw:fill': 'none',
      'style:repeat': 'stretch',
    });
    tree +=
      `<draw:frame draw:style-name="${st}" draw:name="Background" ${boxAttrs({ x: 0, y: 0, w: geom.canvasW, h: geom.canvasH })}>` +
      `<draw:image xlink:href="${href}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>` +
      '</draw:frame>';
  }

  const wrapLink = (el, inner) => {
    if (!el?.link) return inner;
    return `<draw:a xlink:href="${escXml(String(el.link))}" xlink:type="simple">${inner}</draw:a>`;
  };

  const pushPic = (box, href, name, el) => {
    if (!href) return;
    const st = styles.graphic({
      'draw:stroke': 'none',
      'draw:fill': 'none',
      'style:repeat': 'stretch',
    });
    const inner =
      `<draw:frame draw:style-name="${st}" draw:name="${escXml(name || 'Picture')}" ${boxAttrs(box)}>` +
      `<draw:image xlink:href="${href}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>` +
      '</draw:frame>';
    tree += wrapLink(el || box, inner);
  };

  const pushText = (el, html, name) => {
    const meta = textBoxMeta(el, html);
    const va = meta.anchor === 'ctr' ? 'middle' : meta.anchor === 'b' ? 'bottom' : 'top';
    const st = styles.graphic({
      'draw:stroke': 'none',
      'draw:fill': el.textBg ? 'solid' : 'none',
      'draw:fill-color': el.textBg ? foColor(el.textBg) : undefined,
      'draw:textarea-vertical-align': va,
      'fo:wrap-option': 'wrap',
      'draw:auto-grow-height': 'false',
    });
    const inner =
      `<draw:frame draw:style-name="${st}" draw:name="${escXml(name || 'Text')}" ${boxAttrs(el)}>` +
      `<draw:text-box>${parasXml(styles, html || el.text || '', el.cs, el.textColor, null)}</draw:text-box>` +
      '</draw:frame>';
    tree += wrapLink(el, inner);
  };

  const pushShape = (el) => {
    const st = styles.graphic(fillProps(el, styles));
    const kind = el.shape || 'rect';
    const label = el.shapeHtml;
    const hasTx = !!(label && String(label).replace(/<[^>]+>/g, '').trim());
    let tx = '';
    if (hasTx) {
      const fs = shapeTextFontSizePx(el);
      const col = getShapeTextColor(el);
      const cs = `font-size:${fs}px;color:${col};text-align:center;font-weight:700;${el.shapeTextCss || ''}`;
      tx = parasXml(styles, label, cs, col, 'center');
    }
    if (kind === 'line') {
      const x1 = pxToCm(el.x);
      const y1 = pxToCm((+el.y || 0) + (+el.h || 0) / 2);
      const x2 = pxToCm((+el.x || 0) + (+el.w || 0));
      const y2 = y1;
      const rot = +el.rot || 0;
      const extra = rot
        ? ` draw:transform="rotate (${(-rot * Math.PI) / 180}) translate (${pxToCmNum(el.x + el.w / 2).toFixed(3)}cm ${pxToCmNum(el.y + el.h / 2).toFixed(3)}cm)"`
        : '';
      tree += `<draw:line draw:style-name="${st}" draw:name="Line" svg:x1="${x1}" svg:y1="${y1}" svg:x2="${x2}" svg:y2="${y2}"${extra}/>`;
      return;
    }
    if (kind === 'ellipse' || kind === 'circle') {
      tree += `<draw:ellipse draw:style-name="${st}" draw:name="Ellipse" ${boxAttrs(el)}>${tx}</draw:ellipse>`;
      return;
    }
    if (kind === 'rect' && !(+(el.rx || 0) > 2)) {
      tree += `<draw:rect draw:style-name="${st}" draw:name="Rect" ${boxAttrs(el)}>${tx}</draw:rect>`;
      return;
    }
    const drawType = odpShapeType(el);
    const meta = getShapeMeta(kind);
    const enh = meta?.path ? pathToEnhanced(meta.path, 100) : { path: 'M 0 0 L 21600 0 21600 21600 0 21600 Z N', vb: 21600 };
    tree +=
      `<draw:custom-shape draw:style-name="${st}" draw:name="${escXml(kind)}" ${boxAttrs(el)}>` +
      tx +
      `<draw:enhanced-geometry svg:viewBox="0 0 ${enh.vb} ${enh.vb}" draw:type="${escXml(drawType)}" draw:enhanced-path="${escXml(enh.path)}"/>` +
      '</draw:custom-shape>';
  };

  const pushTable = (el) => {
    const rows = el.rows || 1;
    const cols = el.cols || 1;
    const st = styles.graphic({ 'draw:stroke': 'none', 'draw:fill': 'none' });
    const colPx = tableColWidthsPx(el, el.w || cols * 80);
    const rowPx = tableRowHeightsPx(el, el.h || rows * 40, 12);
    let colsXml = '';
    for (let c = 0; c < cols; c++) {
      const cn = styles.column(pxToCm(colPx[c] || 20));
      colsXml += `<table:table-column table:style-name="${cn}"/>`;
    }
    let body = '';
    for (let r = 0; r < rows; r++) {
      let tcs = '';
      for (let c = 0; c < cols; c++) {
        const cell = getTableCell(el, r, c);
        if (cell.hidden) {
          tcs += '<table:covered-table-cell/>';
          continue;
        }
        const bg = tableCellBg(el, r, c, cell);
        const foSide = (side) => {
          const spec = resolveTableEdge(el, r, c, side);
          if (!spec || !(+spec.w > 0) || isNoneTableColor(spec.color)) return 'none';
          return `${pxToCm(spec.w)} solid ${foColor(spec.color)}`;
        };
        const cellProps = {
          'fo:padding': '0.08cm',
          'fo:border-top': foSide('t'),
          'fo:border-right': foSide('r'),
          'fo:border-bottom': foSide('b'),
          'fo:border-left': foSide('l'),
        };
        if (bg && bg !== 'transparent') cellProps['fo:background-color'] = foColor(bg);
        const ce = styles.cell(cellProps);
        const html = cell.html || '';
        const cs = `font-size:${el.fs || 14}px;color:${el.textColor || '#ffffff'};text-align:${cell.align || 'left'};`;
        const spanC = Math.max(1, cell.colspan || 1);
        const spanR = Math.max(1, cell.rowspan || 1);
        const spanAttr =
          `${spanC > 1 ? ` table:number-columns-spanned="${spanC}"` : ''}` +
          `${spanR > 1 ? ` table:number-rows-spanned="${spanR}"` : ''}`;
        tcs +=
          `<table:table-cell table:style-name="${ce}"${spanAttr}>` +
          parasXml(styles, html, cs, el.textColor || '#ffffff', cell.align || 'left') +
          '</table:table-cell>';
      }
      const rn = styles.row(pxToCm(rowPx[r] || 14));
      body += `<table:table-row table:style-name="${rn}">${tcs}</table:table-row>`;
    }
    tree += wrapLink(
      el,
      `<draw:frame draw:style-name="${st}" draw:name="Table" ${boxAttrs(el)}>` +
        `<table:table>${colsXml}${body}</table:table>` +
        '</draw:frame>'
    );
  };

  const pushInkStroke = (st) => {
    if (!st || st.tool === 'eraser' || st.color === 'transparent' || st.color === 'none') return;
    let pts = downsamplePts(normalizeInkPoints(st.points), 800).map((p) => ({ x: p.x, y: p.y }));
    if (pts.length === 1) pts = [pts[0], { x: pts[0].x + 0.5, y: pts[0].y + 0.5 }];
    if (pts.length < 2) return;
    const pad = Math.max(2, (+st.width || 4) * 1.4);
    const box = ptsBBox(pts, pad);
    const points = pts
      .map((p) => `${Math.round(p.x - box.x)},${Math.round(p.y - box.y)}`)
      .join(' ');
    const g = styles.graphic({
      'draw:fill': 'none',
      'draw:stroke': 'solid',
      'svg:stroke-color': foColor(st.color || '#64748b'),
      'svg:stroke-width': pxToCm(st.width != null ? st.width : 4),
      'svg:stroke-linecap': 'round',
      'svg:stroke-linejoin': 'round',
      'draw:opacity': st.opacity != null ? `${Math.round(+st.opacity * 100)}%` : undefined,
    });
    tree +=
      `<draw:polyline draw:style-name="${g}" draw:name="InkStroke" ${boxAttrs(box)} ` +
      `svg:viewBox="0 0 ${Math.round(box.w)} ${Math.round(box.h)}" svg:points="${points}"/>`;
  };

  const pushInkFill = (fill) => {
    if (!fill) return;
    const raw = fill.points || [];
    const pts = raw.map(ptXY).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (pts.length < 3) return;
    const box = ptsBBox(pts, 2);
    const points = pts
      .map((p) => `${Math.round(p.x - box.x)},${Math.round(p.y - box.y)}`)
      .join(' ');
    const g = styles.graphic({
      'draw:fill': 'solid',
      'draw:fill-color': foColor(fill.color || '#64748b'),
      'draw:stroke': 'none',
      'draw:opacity': `${Math.round((fill.opacity != null ? +fill.opacity : 0.55) * 100)}%`,
    });
    tree +=
      `<draw:polygon draw:style-name="${g}" draw:name="InkFill" ${boxAttrs(box)} ` +
      `svg:viewBox="0 0 ${Math.round(box.w)} ${Math.round(box.h)}" svg:points="${points}"/>`;
  };

  for (const fill of slide.inkFills || []) pushInkFill(fill);
  for (const st of slide.ink || []) pushInkStroke(st);

  for (const el of slide.els || []) {
    if (!el || el.objHidden || el._isDecor) continue;
    if (el.type === 'inkhost') continue;

    if (el.type === 'text' || el.type === 'markdown' || el.type === 'code' || el.type === 'pagenum') {
      if (el.type === 'code') {
        const raw = el.codeRaw != null ? String(el.codeRaw) : String(el.text || '');
        const codeHtml = raw
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .split(/\r?\n/)
          .map((ln) => `<div>${ln || '<br>'}</div>`)
          .join('');
        const fs = Math.max(10, Math.min(28, +el.codeFs || 18));
        pushText(
          {
            ...el,
            cs: `font-size:${fs}px;font-family:Consolas,"Courier New",monospace;white-space:pre-wrap;text-align:left;`,
            textColor: el.textColor || '#e2e8f0',
          },
          codeHtml,
          'Code'
        );
      } else if (el.type === 'markdown') {
        pushText(el, el.mdHtml || el.html || el.text || el.md || '', 'Markdown');
      } else {
        pushText(el, el.html || el.text || '', 'Text');
      }
      continue;
    }
    if (el.type === 'formula') {
      if (el.formulaSvg) {
        const href = addPic(
          svgPart(el.formulaSvg.includes('<svg') ? el.formulaSvg : `<svg xmlns="http://www.w3.org/2000/svg">${el.formulaSvg}</svg>`)
        );
        if (href) {
          pushPic(el, href, 'Formula');
          continue;
        }
      }
      pushText(el, el.html || el.formulaRaw || el.text || '', 'Formula');
      continue;
    }
    if (el.type === 'image' && el.src) {
      const href = addPic(dataUrlToPart(el.src));
      if (href) pushPic(el, href, 'Picture');
      continue;
    }
    if (el.type === 'graph' && el.graphImg) {
      const href = addPic(dataUrlToPart(el.graphImg));
      if (href) pushPic(el, href, 'Graph');
      continue;
    }
    if (el.type === 'icon') {
      const ic = el.iconId ? getIconById(el.iconId) : null;
      if (ic) {
        const svg = buildIconSVG(
          ic,
          el.iconColor || el.textColor || '#6366f1',
          el.iconSw != null ? el.iconSw : 1.8,
          el.iconFillOp != null ? el.iconFillOp : 1,
          iconPathForRender(ic, el)
        );
        const href = addPic(svgPart(svg));
        if (href) {
          pushPic(el, href, 'Icon');
          continue;
        }
      }
      pushText(el, el.emoji || '★', 'Icon');
      continue;
    }
    if (el.type === 'svg' || el.svgContent) {
      const href = addPic(svgPart(el.svgContent || el.svg || ''));
      if (href) pushPic(el, href, 'SVG');
      continue;
    }
    if (el.type === 'shape') {
      pushShape(el);
      continue;
    }
    if (el.type === 'table') {
      if (el.showChart) {
        const href = addPic(svgPart(buildChartSvg(el)));
        if (href) {
          pushPic(el, href, 'Chart');
          continue;
        }
      }
      pushTable(el);
      continue;
    }
    if (el.type === 'lineangle') {
      const built = buildLineAngleContent(el, slide.els || []);
      if (built && built.html) {
        const href = addPic(svgPart(built.html));
        if (href) pushPic({ ...el, x: built.x, y: built.y, w: built.w, h: built.h }, href, 'Angle');
      }
      continue;
    }
    if (el.type === 'lego') {
      const href = addPic(svgPart(buildLegoSvg(el, slide.els)));
      if (href) {
        pushPic(el, href, 'LEGO');
        continue;
      }
    }
    if (
      el.type === 'mediavideo' ||
      el.type === 'mediaaudio' ||
      el.type === 'applet' ||
      el.type === 'htmlframe' ||
      el.type === 'model3d'
    ) {
      const labels = {
        mediavideo: el.mediaName || 'Video',
        mediaaudio: el.mediaName || 'Audio',
        applet: el.appletId || 'Applet',
        htmlframe: el.hfTitle || el.hfSrc || 'HTML',
        model3d: el.objName || '3D',
      };
      const fills = {
        mediavideo: '#0f172a',
        mediaaudio: '#1e1b4b',
        applet: '#1e293b',
        htmlframe: '#1e293b',
        model3d: '#334155',
      };
      let poster = null;
      if (el.type === 'htmlframe') {
        const src = el.hfSrc || el.html || '';
        try {
          const cnv = await captureHtmlFrameSnapshot(src, el.w || 400, el.h || 240);
          if (cnv) poster = dataUrlToPart(cnv.toDataURL('image/png'));
        } catch (e) {}
      }
      if (!poster) poster = await resolveExportPoster(el, mediaPosterPart(el, fills[el.type], labels[el.type]));
      const href = poster ? addPic(poster) : '';
      if (href) pushPic(el, href, labels[el.type], el);
      else {
        pushShape({
          ...el,
          shape: 'rect',
          rx: 10,
          fill: el.fill || fills[el.type],
          stroke: el.stroke || '#94a3b8',
          sw: el.sw != null ? el.sw : 1.5,
          shapeHtml: labels[el.type],
        });
      }
      continue;
    }
    if (el.html || el.text) pushText(el, el.html || el.text, 'Text');
  }

  for (const conn of slide.connectors || []) {
    if (!conn || conn.objHidden) continue;
    const ends = glueEnds(conn, slide.els || []);
    if (!ends) continue;
    const { p1, p2 } = ends;
    const dash = strokeDashName(conn.dash);
    const g = styles.graphic({
      'draw:fill': 'none',
      'draw:stroke': dash ? 'dash' : 'solid',
      'draw:stroke-dash': dash || undefined,
      'svg:stroke-color': foColor(conn.color || '#94a3b8'),
      'svg:stroke-width': pxToCm(conn.sw != null ? conn.sw : 2),
      'draw:marker-end': conn.toMarker === 'none' ? undefined : 'arrow',
      'draw:marker-start': conn.fromMarker && conn.fromMarker !== 'none' ? 'arrow' : undefined,
    });
    tree +=
      `<draw:connector draw:style-name="${g}" draw:name="Connector" draw:type="${connType(conn.route)}" ` +
      `svg:x1="${pxToCm(p1.x)}" svg:y1="${pxToCm(p1.y)}" svg:x2="${pxToCm(p2.x)}" svg:y2="${pxToCm(p2.y)}"/>`;
  }

  return { tree, styles, pictures, pageStyle: dp, name: slide.name || slide.title || '' };
}

export function buildOdpContent(pages, stylesXmlInner) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<office:document-content ${NS} office:version="1.2">` +
    '<office:scripts/><office:font-face-decls/>' +
    `<office:automatic-styles>${stylesXmlInner}</office:automatic-styles>` +
    '<office:body><office:presentation>' +
    pages +
    '</office:presentation></office:body></office:document-content>'
  );
}

export function buildOdpStyles(pageW, pageH, grads) {
  const w = pxToCm(pageW);
  const h = pxToCm(pageH);
  const orient = pageW >= pageH ? 'landscape' : 'portrait';
  let dash =
    '<draw:stroke-dash draw:name="dash" draw:style="rect" draw:dots1="1" draw:dots1-length="0.25cm" draw:distance="0.15cm"/>' +
    '<draw:stroke-dash draw:name="dot" draw:style="rect" draw:dots1="1" draw:dots1-length="0.06cm" draw:distance="0.1cm"/>' +
    '<draw:marker draw:name="arrow" svg:viewBox="0 0 20 30" svg:d="M10 0 L20 30 L0 30 Z"/>';
  for (const g of grads || []) {
    dash +=
      `<draw:gradient draw:name="${g.name}" draw:style="linear" draw:angle="${Math.round(g.angle)}" ` +
      `draw:start-color="${g.start}" draw:end-color="${g.end}" draw:start-intensity="100%" draw:end-intensity="100%"/>`;
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<office:document-styles ${NS} office:version="1.2">` +
    `<office:styles><style:default-style style:family="graphic"><style:graphic-properties draw:stroke="none" draw:fill="none"/></style:default-style>${dash}</office:styles>` +
    '<office:automatic-styles>' +
    `<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="${w}" fo:page-height="${h}" style:print-orientation="${orient}"/></style:page-layout>` +
    '</office:automatic-styles>' +
    '<office:master-styles><draw:layer-set><draw:layer draw:name="layout"/><draw:layer draw:name="background"/><draw:layer draw:name="backgroundobjects"/><draw:layer draw:name="controls"/><draw:layer draw:name="measurelines"/></draw:layer-set>' +
    '<style:master-page style:name="Default" style:page-layout-name="pm1"/></office:master-styles>' +
    '</office:document-styles>'
  );
}

export function buildOdpMeta(title) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.2">' +
    `<office:meta><meta:generator>Слайды</meta:generator><dc:title>${escXml(title || 'Presentation')}</dc:title></office:meta></office:document-meta>`
  );
}

export function buildOdpManifest(pictures) {
  let pics = '';
  for (const p of pictures || []) {
    pics += `<manifest:file-entry manifest:full-path="Pictures/${escXml(p.name)}" manifest:media-type="${escXml(p.mime)}"/>`;
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">' +
    '<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.presentation"/>' +
    '<manifest:file-entry manifest:full-path="mimetype" manifest:media-type="text/plain"/>' +
    '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="META-INF/manifest.xml" manifest:media-type="text/xml"/>' +
    pics +
    '</manifest:manifest>'
  );
}

export function packOdpParts(builtSlides, canvasW, canvasH, title) {
  let auto = '';
  let pages = '';
  const pictures = [];
  const seenStyles = new Set();
  const grads = [];
  const dumpStyles = (bag) => {
    if (!bag || seenStyles.has(bag)) return;
    seenStyles.add(bag);
    auto += bag.pages
      .map((p) => {
        const bits = Object.entries(p.props)
          .filter(([, v]) => v != null && v !== '')
          .map(([k, v]) => `${k}="${escXml(String(v))}"`)
          .join(' ');
        return `<style:style style:name="${p.name}" style:family="drawing-page"><style:drawing-page-properties ${bits}/></style:style>`;
      })
      .join('');
    auto += bag.graphics.map((g) => graphicXml(g.name, g.props)).join('');
    auto += bag.paras.map((p) => paraXml(p.name, p.props)).join('');
    auto += bag.texts.map((t) => textXml(t.name, t.props)).join('');
    auto += bag.cells.map((c) => cellXml(c.name, c.props)).join('');
    auto += (bag.cols || [])
      .map(
        (c) =>
          `<style:style style:name="${c.name}" style:family="table-column"><style:table-column-properties style:column-width="${escXml(c.w)}"/></style:style>`
      )
      .join('');
    auto += (bag.rows || [])
      .map(
        (r) =>
          `<style:style style:name="${r.name}" style:family="table-row"><style:table-row-properties style:row-height="${escXml(r.h)}"/></style:style>`
      )
      .join('');
    grads.push(...bag.grads);
  };
  builtSlides.forEach((part, i) => {
    dumpStyles(part.styles);
    pictures.push(...part.pictures);
    const name = escXml(part.name || `page${i + 1}`);
    pages +=
      `<draw:page draw:name="${name}" draw:style-name="${part.pageStyle}" draw:master-page-name="Default">` +
      part.tree +
      '</draw:page>';
  });
  return {
    content: buildOdpContent(pages, auto),
    styles: buildOdpStyles(canvasW, canvasH, grads),
    meta: buildOdpMeta(title),
    manifest: buildOdpManifest(pictures),
    pictures,
  };
}

export default { buildNativeOdpSlide, packOdpParts };
