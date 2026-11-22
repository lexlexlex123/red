/**
 * Native (editable) OOXML slide tree for PPTX export.
 * Text / shapes / images / tables / connectors / ink round-trip through pptxImport.
 */

import { getTableCell, tableCellBg, tableColWidthsPx, tableRowHeightsPx } from '../editor/tableCells.js';
import { isNoneTableColor, resolveTableEdge } from '../editor/tableBorders.js';
import { getShapeMeta } from '../shared/shapesCatalog.js';
import { buildIconSVG } from '../editor/iconSvg.js';
import { iconPathForRender } from '../editor/iconAnim.js';
import { getIconById } from '../editor/iconsLazy.js';
import { shapeTextFontSizePx, getShapeTextColor } from '../editor/shapeText.js';
import { slideSolidBg, bgImgSrc } from '../editor/slideBgImg.js';
import { captureHtmlFrameSnapshot } from '../editor/htmlFrameSnapshot.js';
import { resolveExportPoster } from './mediaPoster.js';
import { pptxTimingXml } from './pptxTiming.js';
import { linkTypeFromHref, resolveSlideLinkIndex } from '../editor/links.js';
import { normalizeInkPoints } from '../editor/inkBrush.js';
import { ptXY } from '../editor/inkFill.js';
import { nearestSides, edgeMid } from '../editor/connectors.js';
import { buildLegoSvg } from '../editor/lego.js';
import { buildLineAngleContent } from '../editor/lineAngle.js';
import { buildChartSvg } from '../editor/tableChart.js';
import {
  escXml,
  hexRgb,
  algnOf,
  shapePreset,
  geomAdjXml,
  gradFillXml,
  dataUrlToPart,
  svgPart,
  textBoxMeta,
  pathToCustGeomXml,
  rasterizePartForOffice,
} from './nativeShared.js';

export { escXml };

const REL_OFFICE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL_TABLE = 'http://schemas.openxmlformats.org/drawingml/2006/table';

function solidFillXml(color, opacity) {
  const c = hexRgb(color);
  if (!c || !/^[0-9A-F]{6}$/i.test(c.val)) return '<a:noFill/>';
  let a = c.alpha;
  if (opacity != null && Number.isFinite(+opacity) && +opacity < 1) {
    a = (a != null ? a : 1) * Math.max(0, +opacity);
  }
  const aXml = a != null && a < 1 ? `<a:alpha val="${Math.round(a * 100000)}"/>` : '';
  return `<a:solidFill><a:srgbClr val="${c.val}">${aXml}</a:srgbClr></a:solidFill>`;
}

function pxToEmuOnSlide(px, canvas, slideEmu) {
  return Math.max(0, Math.round(((+px || 0) / Math.max(1, canvas)) * slideEmu));
}

function offExt(box, canvasW, canvasH, cx, cy) {
  const x = pxToEmuOnSlide(box.x, canvasW, cx);
  const y = pxToEmuOnSlide(box.y, canvasH, cy);
  const w = Math.max(1, pxToEmuOnSlide(box.w || 1, canvasW, cx));
  const h = Math.max(1, pxToEmuOnSlide(box.h || 1, canvasH, cy));
  return { x, y, w, h };
}

function xfrmXml(box, canvasW, canvasH, cx, cy) {
  const o = offExt(box, canvasW, canvasH, cx, cy);
  const rot = box.rot ? ` rot="${Math.round((+box.rot || 0) * 60000)}"` : '';
  const flipH = box.shapeFlipH || box.flipH ? ' flipH="1"' : '';
  const flipV = box.shapeFlipV || box.flipV ? ' flipV="1"' : '';
  return `<a:xfrm${rot}${flipH}${flipV}><a:off x="${o.x}" y="${o.y}"/><a:ext cx="${o.w}" cy="${o.h}"/></a:xfrm>`;
}

/** DrawingML rect connection sites: 0 right, 1 bottom, 2 left, 3 top. */
export const CXN_SIDE_IDX = { right: 0, bottom: 1, left: 2, top: 3, center: 0 };

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

function custGeomXml(pts, box, canvasW, canvasH, cx, cy, { closed, filled } = {}) {
  const o = offExt(box, canvasW, canvasH, cx, cy);
  let cmds = '';
  pts.forEach((p, i) => {
    const x = Math.max(0, Math.round(((p.x - box.x) / Math.max(1, box.w)) * o.w));
    const y = Math.max(0, Math.round(((p.y - box.y) / Math.max(1, box.h)) * o.h));
    const tag = i === 0 ? 'moveTo' : 'lnTo';
    cmds += `<a:${tag}><a:pt x="${x}" y="${y}"/></a:${tag}>`;
  });
  if (closed) cmds += '<a:close/>';
  const fillAttr = filled ? ' fill="norm"' : ' fill="none"';
  const strokeAttr = filled ? ' stroke="false"' : '';
  return (
    '<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/>' +
    '<a:rect l="l" t="t" r="r" b="b"/>' +
    `<a:pathLst><a:path w="${o.w}" h="${o.h}"${fillAttr}${strokeAttr} extrusionOk="0">${cmds}</a:path></a:pathLst>` +
    '</a:custGeom>'
  );
}

function mapMarker(type) {
  if (!type || type === 'none') return null;
  if (type === 'arrow') return 'triangle';
  if (type === 'circle') return 'oval';
  if (type === 'square') return 'diamond';
  if (type === 'bar') return 'stealth';
  if (type === 'cross') return 'arrow';
  return 'triangle';
}

function connLnXml(conn, canvasW, cx) {
  const sw = conn.sw != null ? +conn.sw : 2;
  const w = Math.max(1270, Math.round((sw / Math.max(1, canvasW)) * cx));
  let dash = 'solid';
  if (conn.dash === 'dash') dash = 'dash';
  else if (conn.dash === 'dot') dash = 'sysDot';
  const headT = mapMarker(conn.fromMarker);
  const tailT = mapMarker(conn.toMarker == null ? 'arrow' : conn.toMarker);
  const head = headT ? `<a:headEnd type="${headT}" w="med" len="med"/>` : '';
  const tail = tailT ? `<a:tailEnd type="${tailT}" w="med" len="med"/>` : '';
  const cap = headT || tailT ? 'flat' : 'rnd';
  const op = conn.opacity != null && +conn.opacity < 1 ? +conn.opacity : null;
  return (
    `<a:ln w="${w}" cap="${cap}" cmpd="sng" algn="ctr">` +
    `${solidFillXml(conn.color || '#94a3b8', op)}<a:prstDash val="${dash}"/>${head}${tail}</a:ln>`
  );
}

function connPrst(route, fromSide, toSide) {
  if (route === 'curve') return 'curvedConnector3';
  if (route === 'orthogonal') {
    const hFrom = fromSide === 'left' || fromSide === 'right';
    const hTo = toSide === 'left' || toSide === 'right';
    return hFrom === hTo ? 'bentConnector3' : 'bentConnector2';
  }
  return 'straightConnector1';
}

function glueEnds(conn, els) {
  const from = (els || []).find((e) => e && String(e.id) === String(conn.fromId));
  const to = (els || []).find((e) => e && String(e.id) === String(conn.toId));
  if (!from || !to) return null;
  const sides = nearestSides(from, to);
  const fromSide = conn.fromSide || sides.fromSide;
  const toSide = conn.toSide || sides.toSide;
  return { p1: edgeMid(from, fromSide), p2: edgeMid(to, toSide), fromSide, toSide };
}

function neonGlowXml(st, canvasW, cx) {
  if (!st || st.tool !== 'neon') return '';
  const c = hexRgb(st.color || '#22d3ee');
  if (!c) return '';
  const rad = Math.max(25400, Math.round((((+st.width || 6) * 2.2) / Math.max(1, canvasW)) * cx));
  return `<a:effectLst><a:glow rad="${rad}"><a:srgbClr val="${c.val}"><a:alpha val="50000"/></a:srgbClr></a:glow></a:effectLst>`;
}

function strokeDash(style) {
  if (style === 'dashed') return 'dash';
  if (style === 'dotted') return 'sysDash';
  return 'solid';
}

function lnXml(el, canvasW, cx) {
  const sw = el.sw != null ? +el.sw : 2;
  if (!(sw > 0) || el.stroke === 'none') return '<a:ln><a:noFill/></a:ln>';
  const w = Math.max(1270, Math.round((sw / Math.max(1, canvasW)) * cx));
  const dash = strokeDash(el.strokeStyle);
  const cap = el.lineFromMarker && el.lineFromMarker !== 'none' ? 'flat' : 'rnd';
  let ends = '';
  if (el.lineFromMarker && el.lineFromMarker !== 'none') {
    const t = el.lineFromMarker === 'arrow' ? 'triangle' : el.lineFromMarker === 'circle' ? 'oval' : 'stealth';
    ends += `<a:headEnd type="${t}" w="med" len="med"/>`;
  }
  if (el.lineToMarker && el.lineToMarker !== 'none') {
    const t = el.lineToMarker === 'arrow' ? 'triangle' : el.lineToMarker === 'circle' ? 'oval' : 'stealth';
    ends += `<a:tailEnd type="${t}" w="med" len="med"/>`;
  }
  return `<a:ln w="${w}" cap="${cap}" cmpd="sng" algn="ctr">${solidFillXml(el.stroke || '#1d4ed8')}<a:prstDash val="${dash}"/>${ends}</a:ln>`;
}

function szFromPx(px) {
  const n = +px || 18;
  return Math.max(600, Math.round(n * 75));
}

function rPrXml(run, fsPx, color, face) {
  const sz = szFromPx(run.fs != null ? run.fs : fsPx);
  const b = run.bold ? ' b="1"' : '';
  const i = run.italic ? ' i="1"' : '';
  const u = run.underline ? ' u="sng"' : '';
  const strike = run.strike ? ' strike="sngStrike"' : '';
  const baseline =
    run.script === 'sup' ? ' baseline="30000"' : run.script === 'sub' ? ' baseline="-25000"' : '';
  const c = hexRgb(run.color || color);
  const fill =
    c && /^[0-9A-F]{6}$/i.test(c.val)
      ? `<a:solidFill><a:srgbClr val="${c.val}"/></a:solidFill>`
      : '<a:solidFill><a:srgbClr val="000000"/></a:solidFill>';
  const typeface = escXml(String(run.face || face || 'Calibri').replace(/["<>]/g, ''));
  return `<a:rPr lang="ru-RU" sz="${sz}"${b}${i}${u}${strike}${baseline} dirty="0">${fill}<a:latin typeface="${typeface}"/></a:rPr>`;
}

function tXml(text) {
  const s = String(text || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  const space = /^\s|\s$/.test(s) || s.includes('  ') ? ' xml:space="preserve"' : '';
  return `<a:t${space}>${escXml(s)}</a:t>`;
}

function txBodyXml(html, cs, fallbackColor, fallbackAlign, ns = 'p', extra = {}) {
  const meta = textBoxMeta({ cs, textColor: fallbackColor, textAlign: fallbackAlign }, html);
  const fs = meta.fs;
  const color = fallbackColor || meta.color;
  const face = meta.face;
  const paras = meta.paras;
  const algn = algnOf(String(fallbackAlign || meta.align).trim());
  const anchor = extra.anchor || meta.anchor || 't';
  let body = '';
  const fallback = [{ runs: [{ text: '', bold: false, italic: false, underline: false }], listBullet: false, listNum: false }];
  for (const para of paras.length ? paras : fallback) {
    let rs = '';
    for (const run of para.runs) {
      rs += `<a:r>${rPrXml(run, fs, color, face)}${tXml(run.text)}</a:r>`;
    }
    if (!rs) rs = `<a:r>${rPrXml({}, fs, color, face)}${tXml('')}</a:r>`;
    let bu = '<a:buNone/>';
    if (para.listBullet) bu = '<a:buFont typeface="Arial"/><a:buChar char="•"/>';
    else if (para.listNum) bu = '<a:buAutoNum type="arabicPeriod"/>';
    body += `<a:p><a:pPr algn="${algn}">${bu}</a:pPr>${rs}<a:endParaRPr lang="ru-RU" sz="${szFromPx(fs)}"/></a:p>`;
  }
  const open = ns === 'a' ? 'a:txBody' : 'p:txBody';
  return (
    `<${open}><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="${anchor}">` +
    '<a:spAutoFit/></a:bodyPr><a:lstStyle/>' +
    body +
    `</${open}>`
  );
}

function nvSpPr(id, name, isTxBox, hlink = '') {
  const tx = isTxBox ? '<p:cNvSpPr txBox="1"/>' : '<p:cNvSpPr/>';
  return `<p:nvSpPr><p:cNvPr id="${id}" name="${escXml(name)}">${hlink}</p:cNvPr>${tx}<p:nvPr/></p:nvSpPr>`;
}

function shapePrst(el) {
  return shapePreset(el);
}

function spPrGeom(prst, el) {
  return `<a:prstGeom prst="${prst}">${geomAdjXml(el || {}, prst)}</a:prstGeom>`;
}

function shapeFillXml(el) {
  const noFill = el.fill === 'none' || el.fill === 'transparent' || el.fillOp === 0 || el.noFill;
  if (noFill) return '<a:noFill/>';
  const grad = gradFillXml(el);
  if (grad) return grad;
  return solidFillXml(el.fill || '#3b82f6', el.fillOp);
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


/**
 * @param {object} slide
 * @param {{ canvasW:number, canvasH:number, cx:number, cy:number }} geom
 * @param {{ n:number }} mediaSeq
 */
export async function buildNativeSlide(slide, geom, mediaSeq) {
  const { canvasW, canvasH, cx, cy } = geom;
  const media = [];
  const rels = [{ id: 'rId1', type: `${REL_OFFICE}/slideLayout`, target: '../slideLayouts/slideLayout1.xml' }];
  let rid = 1;
  let spId = 1;

  const addMedia = async (part, relKind = 'image') => {
    let ready = part;
    if (relKind === 'image') ready = await rasterizePartForOffice(part);
    if (!ready || !ready.bytes) return null;
    const ext = String(ready.ext || 'png').replace(/[^a-z0-9]/gi, '') || 'png';
    mediaSeq.n += 1;
    rid += 1;
    const prefix = relKind === 'video' ? 'video' : relKind === 'audio' ? 'audio' : 'image';
    const name = `${prefix}${mediaSeq.n}.${ext}`;
    media.push({ name, bytes: ready.bytes, ext, mime: ready.mime });
    const id = `rId${rid}`;
    const type =
      relKind === 'video' ? `${REL_OFFICE}/video` : relKind === 'audio' ? `${REL_OFFICE}/audio` : `${REL_OFFICE}/image`;
    rels.push({ id, type, target: `../media/${name}` });
    return id;
  };

  const bgParsed = hexRgb(slideSolidBg(slide));
  const bgc = bgParsed ? `#${bgParsed.val}` : '#1e293b';
  const bgSrc = bgImgSrc(slide.bgImg);
  const bgPart = bgSrc ? dataUrlToPart(bgSrc) : null;
  const bgRid = bgPart ? await addMedia(bgPart) : null;
  const bgXml = bgRid
    ? `<p:bg><p:bgPr><a:blipFill dpi="0" rotWithShape="1"><a:blip r:embed="${bgRid}"/><a:stretch><a:fillRect/></a:stretch></a:blipFill><a:effectLst/></p:bgPr></p:bg>`
    : `<p:bg><p:bgPr>${solidFillXml(bgc)}<a:effectLst/></p:bgPr></p:bg>`;

  let tree = '';
  const elPptxId = new Map();
  const remember = (el) => {
    if (el && el.id != null) elPptxId.set(String(el.id), spId);
  };

  const hlinkXml = (el) => {
    if (!el?.link) return '';
    const href = String(el.link);
    rid += 1;
    const id = `rId${rid}`;
    rels.push({
      id,
      type: `${REL_OFFICE}/hyperlink`,
      target: href.replace(/&/g, '&amp;').replace(/"/g, '&quot;'),
      targetMode: 'External',
    });
    const kind = linkTypeFromHref(href);
    if (kind !== 'url') {
      const idx = resolveSlideLinkIndex(href, 0, [slide]);
      void idx;
      return `<a:hlinkClick r:id="${id}" action="ppaction://hlinksldjump"/>`;
    }
    return `<a:hlinkClick r:id="${id}"/>`;
  };

  const pushPic = (box, rEmbed, name, el, mediaLink) => {
    spId += 1;
    remember(el || box);
    const link = mediaLink
      ? `<a:hlinkClick r:id="${mediaLink.id}" action="ppaction://media"/>`
      : hlinkXml(el || box);
    const nvMedia = mediaLink
      ? `<p:cNvPr id="${spId}" name="${escXml(name)}">${link}</p:cNvPr>` +
        `<p:cNvPicPr/><p:nvPr><a:${mediaLink.kind}File r:link="${mediaLink.id}"/></p:nvPr>`
      : `<p:cNvPr id="${spId}" name="${escXml(name)}">${link}</p:cNvPr><p:cNvPicPr><a:picLocks noChangeAspect="0"/></p:cNvPicPr><p:nvPr/>`;
    tree +=
      '<p:pic>' +
      `<p:nvPicPr>${nvMedia}</p:nvPicPr>` +
      `<p:blipFill><a:blip r:embed="${rEmbed}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>` +
      `<p:spPr>${xfrmXml(box, canvasW, canvasH, cx, cy)}${spPrGeom('rect', box)}</p:spPr>` +
      '</p:pic>';
  };

  const pushText = (el, html, name) => {
    if (!html && !el.text) return;
    spId += 1;
    remember(el);
    const fill = el.textBg ? solidFillXml(el.textBg) : '<a:noFill/>';
    tree +=
      '<p:sp>' +
      nvSpPr(spId, name || 'Text', true, hlinkXml(el)) +
      `<p:spPr>${xfrmXml(el, canvasW, canvasH, cx, cy)}${spPrGeom('rect', el)}${fill}<a:ln><a:noFill/></a:ln></p:spPr>` +
      txBodyXml(html || el.text || '', el.cs, el.textColor, null) +
      '</p:sp>';
  };

  const pushShape = (el) => {
    spId += 1;
    remember(el);
    const prst = shapePrst(el);
    const flip = prst === 'chevron' && el.shape === 'chevronLeft' ? { ...el, flipH: true } : el;
    const fillXml = shapeFillXml(el);
    const meta = getShapeMeta(el.shape);
    const pathGeom =
      prst === 'rect' && el.shape && el.shape !== 'rect' && meta?.path
        ? pathToCustGeomXml(meta.path)
        : '';
    const geom = pathGeom || spPrGeom(prst, el);
    const label = el.shapeHtml;
    const hasTx = !!(label && String(label).replace(/<[^>]+>/g, '').trim());
    let tx =
      '<p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="ctr"/>' +
      '<a:lstStyle/><a:p><a:endParaRPr lang="ru-RU"/></a:p></p:txBody>';
    if (hasTx) {
      const fs = shapeTextFontSizePx(el);
      const col = getShapeTextColor(el);
      const cs = `font-size:${fs}px;color:${col};text-align:center;font-weight:700;${el.shapeTextCss || ''}`;
      tx = txBodyXml(label, cs, col, 'center', 'p', { anchor: 'ctr' });
    }
    tree +=
      '<p:sp>' +
      nvSpPr(spId, el.shape || 'Shape', hasTx, hlinkXml(el)) +
      `<p:spPr>${xfrmXml(flip, canvasW, canvasH, cx, cy)}${geom}${fillXml}${lnXml(el, canvasW, cx)}</p:spPr>` +
      tx +
      '</p:sp>';
  };

  const pushTable = (el) => {
    spId += 1;
    remember(el);
    const rows = el.rows || 1;
    const cols = el.cols || 1;
    const colPx = tableColWidthsPx(el, el.w || cols * 80);
    const rowPx = tableRowHeightsPx(el, el.h || rows * 40, 12);
    const o = offExt(el, canvasW, canvasH, cx, cy);
    let grid = '';
    for (let c = 0; c < cols; c++) {
      grid += `<a:gridCol w="${Math.max(1, pxToEmuOnSlide(colPx[c] || 20, canvasW, cx))}"/>`;
    }
    const ln = (side, spec) => {
      if (!spec || !(+spec.w > 0) || isNoneTableColor(spec.color)) {
        return `<a:${side}><a:noFill/></a:${side}>`;
      }
      const wEmu = Math.max(1270, Math.round((+spec.w || 1) * 9525));
      return `<a:${side} w="${wEmu}">${solidFillXml(spec.color)}</a:${side}>`;
    };
    let trs = '';
    for (let r = 0; r < rows; r++) {
      let tcs = '';
      for (let c = 0; c < cols; c++) {
        const cell = getTableCell(el, r, c);
        const spanC = Math.max(1, cell.colspan || 1);
        const spanR = Math.max(1, cell.rowspan || 1);
        const mergeAttr = cell.hidden
          ? spanC > 1 || c > 0
            ? ' hMerge="1"'
            : ' vMerge="1"'
          : `${spanC > 1 ? ` gridSpan="${spanC}"` : ''}${spanR > 1 ? ` rowSpan="${spanR}"` : ''}`;
        const bg = tableCellBg(el, r, c, cell);
        const fillXml = !bg || bg === 'transparent' ? '<a:noFill/>' : solidFillXml(bg);
        const html = cell.hidden ? '' : cell.html || '';
        const cs = `font-size:${el.fs || 14}px;color:${el.textColor || '#ffffff'};text-align:${cell.align || 'left'};`;
        const body = txBodyXml(html, cs, el.textColor || '#ffffff', cell.align || 'left', 'a');
        tcs +=
          `<a:tc${mergeAttr}>` +
          body +
          `<a:tcPr>${ln('lnL', resolveTableEdge(el, r, c, 'l'))}${ln('lnR', resolveTableEdge(el, r, c, 'r'))}${ln('lnT', resolveTableEdge(el, r, c, 't'))}${ln('lnB', resolveTableEdge(el, r, c, 'b'))}${fillXml}</a:tcPr>` +
          '</a:tc>';
      }
      const rh = Math.max(1, pxToEmuOnSlide(rowPx[r] || 14, canvasH, cy));
      trs += `<a:tr h="${rh}">${tcs}</a:tr>`;
    }
    tree +=
      '<p:graphicFrame>' +
      `<p:nvGraphicFramePr><p:cNvPr id="${spId}" name="Table ${spId}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>` +
      `<p:xfrm><a:off x="${o.x}" y="${o.y}"/><a:ext cx="${o.w}" cy="${o.h}"/></p:xfrm>` +
      `<a:graphic><a:graphicData uri="${REL_TABLE}"><a:tbl>` +
      '<a:tblPr/><a:tblGrid>' +
      grid +
      '</a:tblGrid>' +
      trs +
      '</a:tbl></a:graphicData></a:graphic></p:graphicFrame>';
  };

  const pushInkStroke = (st) => {
    if (!st || st.tool === 'eraser' || st.color === 'transparent' || st.color === 'none') return;
    let pts = downsamplePts(normalizeInkPoints(st.points), 800).map((p) => ({ x: p.x, y: p.y }));
    if (pts.length === 1) pts = [pts[0], { x: pts[0].x + 0.5, y: pts[0].y + 0.5 }];
    if (pts.length < 2) return;
    const pad = Math.max(2, (+st.width || 4) * 1.4);
    const box = ptsBBox(pts, pad);
    spId += 1;
    const sw = st.width != null ? +st.width : 4;
    const wEmu = Math.max(1270, Math.round((sw / Math.max(1, canvasW)) * cx));
    const glow = neonGlowXml(st, canvasW, cx);
    tree +=
      '<p:sp>' +
      `<p:nvSpPr><p:cNvPr id="${spId}" name="InkStroke" descr="ink"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
      `<p:spPr>${xfrmXml(box, canvasW, canvasH, cx, cy)}${custGeomXml(pts, box, canvasW, canvasH, cx, cy, { closed: false, filled: false })}` +
      `<a:noFill/><a:ln w="${wEmu}" cap="rnd" cmpd="sng" algn="ctr">${solidFillXml(st.color || '#64748b', st.opacity)}<a:prstDash val="solid"/></a:ln>${glow}</p:spPr>` +
      '</p:sp>';
  };

  const pushInkFill = (fill) => {
    if (!fill) return;
    const raw = fill.points || [];
    const pts = raw.map(ptXY).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (pts.length < 3) return;
    const box = ptsBBox(pts, 2);
    spId += 1;
    tree +=
      '<p:sp>' +
      `<p:nvSpPr><p:cNvPr id="${spId}" name="InkFill" descr="inkFill"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
      `<p:spPr>${xfrmXml(box, canvasW, canvasH, cx, cy)}${custGeomXml(pts, box, canvasW, canvasH, cx, cy, { closed: true, filled: true })}` +
      `${solidFillXml(fill.color || '#64748b', fill.opacity != null ? fill.opacity : 0.55)}<a:ln><a:noFill/></a:ln></p:spPr>` +
      '</p:sp>';
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
        const codeEl = {
          ...el,
          cs: `font-size:${fs}px;font-family:Consolas,"Courier New",monospace;white-space:pre-wrap;text-align:left;`,
          textColor: el.textColor || '#e2e8f0',
        };
        pushText(codeEl, codeHtml, 'Code');
      } else if (el.type === 'markdown') {
        pushText(el, el.mdHtml || el.html || el.text || el.md || '', 'Markdown');
      } else {
        pushText(el, el.html || el.text || '', 'Text');
      }
      continue;
    }
    if (el.type === 'formula') {
      if (el.formulaSvg) {
        const ridF = await addMedia(
          svgPart(el.formulaSvg.includes('<svg') ? el.formulaSvg : `<svg xmlns="http://www.w3.org/2000/svg">${el.formulaSvg}</svg>`)
        );
        if (ridF) {
          pushPic(el, ridF, 'Formula', el);
          continue;
        }
      }
      pushText(el, el.html || el.formulaRaw || el.text || '', 'Formula');
      continue;
    }
    if (el.type === 'image' && el.src) {
      const part = dataUrlToPart(el.src);
      const ridI = part ? await addMedia(part) : null;
      if (ridI) pushPic(el, ridI, 'Picture', el);
      continue;
    }
    if (el.type === 'graph' && el.graphImg) {
      const part = dataUrlToPart(el.graphImg);
      const ridG = part ? await addMedia(part) : null;
      if (ridG) pushPic(el, ridG, 'Graph', el);
      continue;
    }
    if (el.type === 'icon') {
      const ic = el.iconId ? getIconById(el.iconId) : null;
      if (ic) {
        const svg = buildIconSVG(ic, el.iconColor || el.textColor || '#6366f1', el.iconSw != null ? el.iconSw : 1.8, el.iconFillOp != null ? el.iconFillOp : 1, iconPathForRender(ic, el));
        const ridIc = await addMedia(svgPart(svg));
        if (ridIc) {
          pushPic(el, ridIc, 'Icon', el);
          continue;
        }
      }
      pushText(el, el.emoji || '★', 'Icon');
      continue;
    }
    if (el.type === 'svg' || el.svgContent) {
      const ridS = await addMedia(svgPart(el.svgContent || el.svg || ''));
      if (ridS) pushPic(el, ridS, 'SVG', el);
      continue;
    }
    if (el.type === 'shape') {
      pushShape(el);
      continue;
    }
    if (el.type === 'table') {
      if (el.showChart) {
        const ridC = await addMedia(svgPart(buildChartSvg(el)));
        if (ridC) {
          pushPic(el, ridC, 'Chart', el);
          continue;
        }
      }
      pushTable(el);
      continue;
    }
    if (el.type === 'lineangle') {
      const built = buildLineAngleContent(el, slide.els || []);
      if (built && built.html) {
        const ridA = await addMedia(svgPart(built.html));
        if (ridA) {
          pushPic({ ...el, x: built.x, y: built.y, w: built.w, h: built.h }, ridA, 'Angle', el);
        }
      }
      continue;
    }
    if (el.type === 'lego') {
      const ridL = await addMedia(svgPart(buildLegoSvg(el, slide.els)));
      if (ridL) {
        pushPic(el, ridL, 'LEGO', el);
        continue;
      }
    }
    if (el.type === 'htmlframe') {
      const src = el.hfSrc || el.html || '';
      try {
        const cnv = await captureHtmlFrameSnapshot(src, el.w || 400, el.h || 240);
        const part = cnv ? dataUrlToPart(cnv.toDataURL('image/png')) : null;
        const ridH = part ? await addMedia(part) : null;
        if (ridH) {
          pushPic(el, ridH, el.hfTitle || 'HTML', el);
          continue;
        }
      } catch (e) {}
      const poster = await resolveExportPoster(el, mediaPosterPart(el, '#1e293b', el.hfTitle || 'HTML'));
      const posterRid = poster ? await addMedia(poster) : null;
      if (posterRid) pushPic(el, posterRid, el.hfTitle || 'HTML', el);
      continue;
    }
    if (el.type === 'mediavideo' || el.type === 'mediaaudio' || el.type === 'applet' || el.type === 'model3d') {
      const isVid = el.type === 'mediavideo';
      const isAud = el.type === 'mediaaudio';
      const labels = {
        mediavideo: el.mediaName || 'Video',
        mediaaudio: el.mediaName || 'Audio',
        applet: el.appletId || 'Applet',
        model3d: el.objName || '3D',
      };
      const fills = {
        mediavideo: '#0f172a',
        mediaaudio: '#1e1b4b',
        applet: '#1e293b',
        model3d: '#334155',
      };
      if (isVid || isAud) {
        const label = labels[el.type];
        const poster = await resolveExportPoster(el, mediaPosterPart(el, fills[el.type], label));
        const posterRid = poster ? await addMedia(poster) : null;
        const srcPart = el.mediaSrc ? dataUrlToPart(el.mediaSrc) : null;
        const kind = isVid ? 'video' : 'audio';
        const okExt = srcPart && /^(mp4|mov|m4a|mp3|wav)$/i.test(srcPart.ext);
        const mediaRid = okExt ? await addMedia(srcPart, kind) : null;
        if (posterRid && mediaRid) {
          pushPic(el, posterRid, label, el, { id: mediaRid, kind });
          continue;
        }
        if (posterRid) {
          pushPic(el, posterRid, label, el);
          continue;
        }
      } else {
        const poster = await resolveExportPoster(el, mediaPosterPart(el, fills[el.type], labels[el.type]));
        const posterRid = poster ? await addMedia(poster) : null;
        if (posterRid) {
          pushPic(el, posterRid, labels[el.type], el);
          continue;
        }
      }
      pushShape({
        ...el,
        shape: 'rect',
        rx: 10,
        fill: el.fill || fills[el.type],
        stroke: el.stroke || '#94a3b8',
        sw: el.sw != null ? el.sw : 1.5,
        shapeHtml: labels[el.type],
      });
      continue;
    }
    if (el.html || el.text) {
      pushText(el, el.html || el.text, 'Text');
    }
  }

  for (const conn of slide.connectors || []) {
    if (!conn || conn.objHidden) continue;
    const ends = glueEnds(conn, slide.els || []);
    if (!ends) continue;
    const { p1, p2, fromSide, toSide } = ends;
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const w = Math.max(1, Math.abs(p2.x - p1.x));
    const h = Math.max(1, Math.abs(p2.y - p1.y));
    const box = { x, y, w, h, flipH: p1.x > p2.x, flipV: p1.y > p2.y };
    const prst = connPrst(conn.route || 'straight', fromSide, toSide);
    const fromPptx = elPptxId.get(String(conn.fromId));
    const toPptx = elPptxId.get(String(conn.toId));
    const stIdx = CXN_SIDE_IDX[fromSide] != null ? CXN_SIDE_IDX[fromSide] : 0;
    const endIdx = CXN_SIDE_IDX[toSide] != null ? CXN_SIDE_IDX[toSide] : 2;
    let glue = '';
    if (fromPptx != null) glue += `<a:stCxn id="${fromPptx}" idx="${stIdx}"/>`;
    if (toPptx != null) glue += `<a:endCxn id="${toPptx}" idx="${endIdx}"/>`;
    spId += 1;
    tree +=
      '<p:cxnSp>' +
      `<p:nvCxnSpPr><p:cNvPr id="${spId}" name="Connector" descr="connector"/><p:cNvCxnSpPr>${glue}</p:cNvCxnSpPr><p:nvPr/></p:nvCxnSpPr>` +
      `<p:spPr>${xfrmXml(box, canvasW, canvasH, cx, cy)}<a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>` +
      `<a:noFill/>${connLnXml(conn, canvasW, cx)}</p:spPr>` +
      '</p:cxnSp>';
  }

  const nvGrp =
    '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm>' +
    '<a:off x="0" y="0"/>' +
    `<a:ext cx="${cx}" cy="${cy}"/>` +
    '<a:chOff x="0" y="0"/>' +
    `<a:chExt cx="${cx}" cy="${cy}"/>` +
    '</a:xfrm></p:grpSpPr>';

  const timing = pptxTimingXml(slide, elPptxId, { canvasW, canvasH });
  const xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    `<p:cSld>${bgXml}<p:spTree>${nvGrp}${tree}</p:spTree></p:cSld>` +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
    timing +
    '</p:sld>';

  return { xml, rels, media };
}
