/**
 * Native (editable) OOXML slide tree for PPTX export.
 * Text / shapes / images / tables / connectors / ink round-trip through pptxImport.
 */

import { parseCsNumber, parseFontFamily } from '../editor/fonts.js';
import { getTableCell, tableCellBg } from '../editor/tableCells.js';
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
import { escXml } from './xmlEsc.js';

export { escXml };

const REL_OFFICE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL_TABLE = 'http://schemas.openxmlformats.org/drawingml/2006/table';

const SHAPE_PRST = {
  rect: 'rect',
  ellipse: 'ellipse',
  circle: 'ellipse',
  triangle: 'triangle',
  star: 'star5',
  line: 'line',
  arrow: 'rightArrow',
  arrowLeft: 'leftArrow',
  arrowUp: 'upArrow',
  arrowDown: 'downArrow',
  arrowDouble: 'leftRightArrow',
  chevron: 'chevron',
  chevronLeft: 'chevron',
  parallelogram: 'parallelogram',
  trapezoid: 'trapezoid',
  heart: 'heart',
  callout: 'wedgeRoundRectCallout',
  moon: 'moon',
  cross: 'plus',
  noSymbol: 'noSmoking',
  gear: 'gear6',
  polygon: 'hexagon',
  cloud: 'ellipse',
  curve: 'line',
};

function hexRgb(color) {
  const raw = String(color || '').trim();
  if (!raw || raw === 'none' || raw === 'transparent') return null;
  const rgb = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgb) {
    const val = [rgb[1], rgb[2], rgb[3]]
      .map((n) => Math.max(0, Math.min(255, +n)).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    const a = rgb[4] != null ? +rgb[4] : 1;
    return { val, alpha: Number.isFinite(a) && a < 1 ? a : null };
  }
  let h = raw.replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 8) {
    const a = parseInt(h.slice(6), 16) / 255;
    return { val: h.slice(0, 6).toUpperCase(), alpha: a < 1 ? a : null };
  }
  if (h.length < 6) return { val: '000000', alpha: null };
  return { val: h.slice(0, 6).toUpperCase(), alpha: null };
}

function solidFillXml(color, opacity) {
  const c = hexRgb(color);
  if (!c) return '<a:noFill/>';
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

function latinFace(cs) {
  const raw = parseFontFamily(cs) || '';
  const first = raw.replace(/^["']|["']$/g, '').split(',')[0].trim().replace(/^["']|["']$/g, '');
  return first || 'Calibri';
}

function szFromPx(px) {
  const n = +px || 18;
  return Math.max(600, Math.round(n * 75));
}

function algnOf(align) {
  if (align === 'center' || align === 'ctr' || align === 'middle') return 'ctr';
  if (align === 'right' || align === 'r' || align === 'end') return 'r';
  return 'l';
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

function runsFromHtml(html) {
  if (typeof DOMParser === 'undefined') {
    return [{ text: decodeEntities(String(html || '').replace(/<[^>]+>/g, '')), bold: false, italic: false, underline: false }];
  }
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  const runs = [];
  const walk = (node, st) => {
    if (!node) return;
    if (node.nodeType === 3) {
      const t = node.nodeValue || '';
      if (t) runs.push({ text: t, bold: !!st.bold, italic: !!st.italic, underline: !!st.underline });
      return;
    }
    if (node.nodeType !== 1) return;
    const n = node.tagName.toLowerCase();
    if (n === 'br') {
      runs.push({ paraBreak: true });
      return;
    }
    const next = { ...st };
    if (n === 'b' || n === 'strong') next.bold = true;
    if (n === 'i' || n === 'em') next.italic = true;
    if (n === 'u') next.underline = true;
    if (n === 'p' || n === 'div' || n === 'li' || /^h[1-6]$/.test(n)) {
      if (runs.length && !runs[runs.length - 1].paraBreak) runs.push({ paraBreak: true });
    }
    for (const c of node.childNodes) walk(c, next);
    if (n === 'p' || n === 'div' || n === 'li' || /^h[1-6]$/.test(n)) {
      if (runs.length && !runs[runs.length - 1].paraBreak) runs.push({ paraBreak: true });
    }
  };
  walk(doc.body.firstChild || doc.body, {});
  if (runs.length && runs[runs.length - 1].paraBreak) runs.pop();
  return runs.length ? runs : [{ text: '', bold: false, italic: false, underline: false }];
}

function parasFromRuns(runs) {
  const paras = [[]];
  for (const r of runs) {
    if (r.paraBreak) {
      if (paras[paras.length - 1].length) paras.push([]);
      continue;
    }
    paras[paras.length - 1].push(r);
  }
  return paras.filter((p) => p.length);
}

function rPrXml(run, fsPx, color, face) {
  const sz = szFromPx(fsPx);
  const b = run.bold ? ' b="1"' : '';
  const i = run.italic ? ' i="1"' : '';
  const u = run.underline ? ' u="sng"' : '';
  return `<a:rPr lang="ru-RU" sz="${sz}"${b}${i}${u} dirty="0">${solidFillXml(color)}<a:latin typeface="${escXml(face)}"/></a:rPr>`;
}

function tXml(text) {
  const s = String(text || '');
  const space = /^\s|\s$/.test(s) || s.includes('  ') ? ' xml:space="preserve"' : '';
  return `<a:t${space}>${escXml(s)}</a:t>`;
}

function txBodyXml(html, cs, fallbackColor, fallbackAlign, ns = 'p') {
  const fs = parseCsNumber(cs, 'font-size') || 24;
  const color = fallbackColor || ((cs || '').match(/(?:^|;)\s*color\s*:\s*([^;]+)/i) || [])[1] || '#ffffff';
  const align = fallbackAlign || ((cs || '').match(/text-align\s*:\s*([^;]+)/i) || [])[1] || 'left';
  const face = latinFace(cs);
  const paras = parasFromRuns(runsFromHtml(html));
  const algn = algnOf(String(align).trim());
  let body = '';
  for (const para of paras.length ? paras : [[{ text: '', bold: false, italic: false, underline: false }]]) {
    let rs = '';
    for (const run of para) {
      rs += `<a:r>${rPrXml(run, fs, color, face)}${tXml(run.text)}</a:r>`;
    }
    if (!rs) rs = `<a:r>${rPrXml({}, fs, color, face)}${tXml('')}</a:r>`;
    body += `<a:p><a:pPr algn="${algn}"/>${rs}<a:endParaRPr lang="ru-RU" sz="${szFromPx(fs)}"/></a:p>`;
  }
  const open = ns === 'a' ? 'a:txBody' : 'p:txBody';
  return (
    `<${open}><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="t">` +
    '<a:spAutoFit/></a:bodyPr><a:lstStyle/>' +
    body +
    `</${open}>`
  );
}

function nvSpPr(id, name, isTxBox) {
  const tx = isTxBox ? '<p:cNvSpPr txBox="1"/>' : '<p:cNvSpPr/>';
  return `<p:nvSpPr><p:cNvPr id="${id}" name="${escXml(name)}"/>${tx}<p:nvPr/></p:nvSpPr>`;
}

function shapePrst(el) {
  const id = el.shape || 'rect';
  if (id === 'rect' && +(el.rx || 0) > 2) return 'roundRect';
  const meta = getShapeMeta(id);
  if (meta?.special === 'polygon') {
    const sides = Math.max(3, Math.min(12, +(el.polySides || el.sides || 6)));
    if (sides === 3) return 'triangle';
    if (sides === 4) return 'diamond';
    if (sides === 5) return 'pentagon';
    if (sides === 6) return 'hexagon';
    if (sides === 8) return 'octagon';
  }
  if (id === 'star') {
    const rays = +(el.starRays || 5);
    if (rays <= 4) return 'star4';
    if (rays >= 8) return 'star8';
    if (rays >= 6) return 'star6';
    return 'star5';
  }
  return SHAPE_PRST[id] || 'rect';
}

function spPrGeom(prst) {
  return `<a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>`;
}

function dataUrlToPart(src) {
  const s = String(src || '');
  const m = s.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!m) return null;
  const mime = (m[1] || 'application/octet-stream').toLowerCase();
  const payload = m[3] || '';
  let bytes;
  if (m[2]) {
    const bin = atob(payload);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(payload));
  }
  let ext = 'bin';
  if (mime.includes('png')) ext = 'png';
  else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpeg';
  else if (mime.includes('gif')) ext = 'gif';
  else if (mime.includes('webp')) ext = 'webp';
  else if (mime.includes('svg')) ext = 'svg';
  else if (mime.includes('mp4')) ext = 'mp4';
  else if (mime.includes('webm')) ext = 'webm';
  else if (mime.includes('quicktime') || mime.includes('mp4v')) ext = 'mov';
  else if (mime.includes('mpeg') && mime.includes('audio')) ext = 'mp3';
  else if (mime.includes('mp3') || mime.includes('mpeg3')) ext = 'mp3';
  else if (mime.includes('wav')) ext = 'wav';
  else if (mime.includes('m4a') || mime.includes('x-m4a') || mime.includes('aac')) ext = 'm4a';
  return { bytes, mime, ext };
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

function svgPart(markup) {
  const xml = String(markup || '').trim();
  if (!xml) return null;
  const full = xml.includes('xmlns=') ? xml : xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return { bytes: new TextEncoder().encode(full), mime: 'image/svg+xml', ext: 'svg' };
}

/**
 * @param {object} slide
 * @param {{ canvasW:number, canvasH:number, cx:number, cy:number }} geom
 * @param {{ n:number }} mediaSeq
 */
export function buildNativeSlide(slide, geom, mediaSeq) {
  const { canvasW, canvasH, cx, cy } = geom;
  const media = [];
  const rels = [{ id: 'rId1', type: `${REL_OFFICE}/slideLayout`, target: '../slideLayouts/slideLayout1.xml' }];
  let rid = 1;
  let spId = 1;

  const addMedia = (part, relKind = 'image') => {
    if (!part || !part.bytes) return null;
    mediaSeq.n += 1;
    rid += 1;
    const prefix = relKind === 'video' ? 'video' : relKind === 'audio' ? 'audio' : 'image';
    const name = `${prefix}${mediaSeq.n}.${part.ext}`;
    media.push({ name, bytes: part.bytes, ext: part.ext, mime: part.mime });
    const id = `rId${rid}`;
    const type =
      relKind === 'video' ? `${REL_OFFICE}/video` : relKind === 'audio' ? `${REL_OFFICE}/audio` : `${REL_OFFICE}/image`;
    rels.push({ id, type, target: `../media/${name}` });
    return id;
  };

  const bgc = slideSolidBg(slide);
  const bgSrc = bgImgSrc(slide.bgImg);
  const bgPart = bgSrc ? dataUrlToPart(bgSrc) : null;
  const bgRid = bgPart ? addMedia(bgPart) : null;
  const bgXml = bgRid
    ? `<p:bg><p:bgPr><a:blipFill dpi="0" rotWithShape="1"><a:blip r:embed="${bgRid}"/><a:stretch><a:fillRect/></a:stretch></a:blipFill><a:effectLst/></p:bgPr></p:bg>`
    : `<p:bg><p:bgPr>${solidFillXml(bgc)}<a:effectLst/></p:bgPr></p:bg>`;

  let tree = '';
  const elPptxId = new Map();
  const remember = (el) => {
    if (el && el.id != null) elPptxId.set(String(el.id), spId);
  };

  const pushPic = (box, rEmbed, name, el, mediaLink) => {
    spId += 1;
    remember(el || box);
    const nvMedia = mediaLink
      ? `<p:cNvPr id="${spId}" name="${escXml(name)}"><a:hlinkClick r:id="${mediaLink.id}" action="ppaction://media"/></p:cNvPr>` +
        `<p:cNvPicPr/><p:nvPr><a:${mediaLink.kind}File r:link="${mediaLink.id}"/></p:nvPr>`
      : `<p:cNvPr id="${spId}" name="${escXml(name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="0"/></p:cNvPicPr><p:nvPr/>`;
    tree +=
      '<p:pic>' +
      `<p:nvPicPr>${nvMedia}</p:nvPicPr>` +
      `<p:blipFill><a:blip r:embed="${rEmbed}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>` +
      `<p:spPr>${xfrmXml(box, canvasW, canvasH, cx, cy)}${spPrGeom('rect')}</p:spPr>` +
      '</p:pic>';
  };

  const pushText = (el, html, name) => {
    if (!html && !el.text) return;
    spId += 1;
    remember(el);
    const fill = el.textBg ? solidFillXml(el.textBg) : '<a:noFill/>';
    tree +=
      '<p:sp>' +
      nvSpPr(spId, name || 'Text', true) +
      `<p:spPr>${xfrmXml(el, canvasW, canvasH, cx, cy)}${spPrGeom('rect')}${fill}<a:ln><a:noFill/></a:ln></p:spPr>` +
      txBodyXml(html || el.text || '', el.cs, el.textColor, null) +
      '</p:sp>';
  };

  const pushShape = (el) => {
    spId += 1;
    remember(el);
    const prst = shapePrst(el);
    const flip = prst === 'chevron' && el.shape === 'chevronLeft' ? { ...el, flipH: true } : el;
    const noFill = el.fill === 'none' || el.fill === 'transparent' || el.fillOp === 0 || el.noFill;
    const fillXml = noFill ? '<a:noFill/>' : solidFillXml(el.fill || '#3b82f6', el.fillOp);
    const label = el.shapeHtml;
    const hasTx = !!(label && String(label).replace(/<[^>]+>/g, '').trim());
    let tx = '';
    if (hasTx) {
      const fs = shapeTextFontSizePx(el);
      const col = getShapeTextColor(el);
      const cs = `font-size:${fs}px;color:${col};text-align:center;font-weight:700;${el.shapeTextCss || ''}`;
      tx = txBodyXml(label, cs, col, 'center');
    }
    tree +=
      '<p:sp>' +
      nvSpPr(spId, el.shape || 'Shape', hasTx) +
      `<p:spPr>${xfrmXml(flip, canvasW, canvasH, cx, cy)}${spPrGeom(prst)}${fillXml}${lnXml(el, canvasW, cx)}</p:spPr>` +
      (tx || (hasTx ? '' : '')) +
      '</p:sp>';
  };

  const pushTable = (el) => {
    spId += 1;
    remember(el);
    const rows = el.rows || 1;
    const cols = el.cols || 1;
    const colW = Math.max(1, Math.floor(pxToEmuOnSlide(el.w || cols * 80, canvasW, cx) / cols));
    const rowH = Math.max(1, Math.floor(pxToEmuOnSlide(el.h || rows * 40, canvasH, cy) / rows));
    const o = offExt(el, canvasW, canvasH, cx, cy);
    let grid = '';
    for (let c = 0; c < cols; c++) grid += `<a:gridCol w="${colW}"/>`;
    const ln = (side) =>
      `<a:${side} w="6350">${solidFillXml(el.stroke || '#64748b')}</a:${side}>`;
    let trs = '';
    for (let r = 0; r < rows; r++) {
      let tcs = '';
      for (let c = 0; c < cols; c++) {
        const cell = getTableCell(el, r, c);
        const bg = tableCellBg(el, r, c, cell) || el.fill || '#1e293b';
        const html = cell.html || '';
        const cs = `font-size:${el.fs || 14}px;color:${el.textColor || '#ffffff'};text-align:${cell.align || 'left'};`;
        const body = txBodyXml(html, cs, el.textColor || '#ffffff', cell.align || 'left', 'a');
        tcs +=
          '<a:tc>' +
          body +
          `<a:tcPr>${ln('lnL')}${ln('lnR')}${ln('lnT')}${ln('lnB')}${solidFillXml(bg)}</a:tcPr>` +
          '</a:tc>';
      }
      trs += `<a:tr h="${rowH}">${tcs}</a:tr>`;
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
      pushText(el, el.html || el.text || '', el.type === 'code' ? 'Code' : 'Text');
      continue;
    }
    if (el.type === 'formula') {
      if (el.formulaSvg) {
        const ridF = addMedia(svgPart(el.formulaSvg.includes('<svg') ? el.formulaSvg : `<svg xmlns="http://www.w3.org/2000/svg">${el.formulaSvg}</svg>`));
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
      const ridI = part ? addMedia(part) : null;
      if (ridI) pushPic(el, ridI, 'Picture', el);
      continue;
    }
    if (el.type === 'graph' && el.graphImg) {
      const part = dataUrlToPart(el.graphImg);
      const ridG = part ? addMedia(part) : null;
      if (ridG) pushPic(el, ridG, 'Graph', el);
      continue;
    }
    if (el.type === 'icon') {
      const ic = el.iconId ? getIconById(el.iconId) : null;
      if (ic) {
        const svg = buildIconSVG(ic, el.iconColor || el.textColor || '#6366f1', el.iconSw != null ? el.iconSw : 1.8, el.iconFillOp != null ? el.iconFillOp : 1, iconPathForRender(ic, el));
        const ridIc = addMedia(svgPart(svg));
        if (ridIc) {
          pushPic(el, ridIc, 'Icon', el);
          continue;
        }
      }
      pushText(el, el.emoji || '★', 'Icon');
      continue;
    }
    if (el.type === 'svg' || el.svgContent) {
      const ridS = addMedia(svgPart(el.svgContent || el.svg || ''));
      if (ridS) pushPic(el, ridS, 'SVG', el);
      continue;
    }
    if (el.type === 'shape') {
      pushShape(el);
      continue;
    }
    if (el.type === 'table') {
      if (el.showChart) {
        const ridC = addMedia(svgPart(buildChartSvg(el)));
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
        const ridA = addMedia(svgPart(built.html));
        if (ridA) {
          pushPic({ ...el, x: built.x, y: built.y, w: built.w, h: built.h }, ridA, 'Angle', el);
        }
      }
      continue;
    }
    if (el.type === 'lego') {
      const ridL = addMedia(svgPart(buildLegoSvg(el)));
      if (ridL) {
        pushPic(el, ridL, 'LEGO', el);
        continue;
      }
    }
    if (el.type === 'mediavideo' || el.type === 'mediaaudio' || el.type === 'applet' || el.type === 'htmlframe' || el.type === 'model3d') {
      const isVid = el.type === 'mediavideo';
      const isAud = el.type === 'mediaaudio';
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
      if (isVid || isAud) {
        const label = labels[el.type];
        const poster = mediaPosterPart(el, fills[el.type], label);
        const posterRid = poster ? addMedia(poster) : null;
        const srcPart = el.mediaSrc ? dataUrlToPart(el.mediaSrc) : null;
        const kind = isVid ? 'video' : 'audio';
        const mediaRid = srcPart && srcPart.ext !== 'bin' ? addMedia(srcPart, kind) : null;
        if (posterRid && mediaRid) {
          pushPic(el, posterRid, label, el, { id: mediaRid, kind });
          continue;
        }
        if (posterRid) {
          pushPic(el, posterRid, label, el);
          continue;
        }
      } else {
        const poster = mediaPosterPart(el, fills[el.type], labels[el.type]);
        const posterRid = poster ? addMedia(poster) : null;
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

  const xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    `<p:cSld>${bgXml}<p:spTree>${nvGrp}${tree}</p:spTree></p:cSld>` +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
    '</p:sld>';

  return { xml, rels, media };
}
