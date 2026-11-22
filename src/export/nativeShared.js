/**
 * Shared helpers for native PPTX / ODP export (editable text, shapes, tables).
 */

import { parseCsNumber, parseFontFamily } from '../editor/fonts.js';
import { getShapeMeta } from '../shared/shapesCatalog.js';
import { escXml } from './xmlEsc.js';

export { escXml };

/** OOXML preset geometry for editor shape ids. */
export const SHAPE_PRST = {
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
  calloutRound: 'wedgeRoundRectCallout',
  moon: 'moon',
  cross: 'plus',
  plus: 'plus',
  noSymbol: 'donut',
  gear: 'gear6',
  polygon: 'hexagon',
  cloud: 'cloud',
  curve: 'line',
  cylinder: 'can',
  cube: 'cube',
  ribbon: 'ribbon',
  shield: 'plaque',
  funnel: 'funnel',
  wave: 'wave',
  brace: 'leftBrace',
  arc: 'arc',
  badge: 'irregularSeal1',
};

/** LibreOffice draw:type for custom-shape. */
export const ODP_DRAW_TYPE = {
  rect: 'rectangle',
  ellipse: 'ellipse',
  circle: 'ellipse',
  triangle: 'isosceles-triangle',
  star: 'star5',
  line: 'line',
  arrow: 'right-arrow',
  arrowLeft: 'left-arrow',
  arrowUp: 'up-arrow',
  arrowDown: 'down-arrow',
  arrowDouble: 'left-right-arrow',
  chevron: 'chevron',
  chevronLeft: 'chevron',
  parallelogram: 'parallelogram',
  trapezoid: 'trapezoid',
  heart: 'heart',
  callout: 'rectangular-callout',
  calloutRound: 'round-rectangular-callout',
  moon: 'moon',
  cross: 'cross',
  plus: 'cross',
  noSymbol: 'forbidden',
  gear: 'ring',
  polygon: 'hexagon',
  cloud: 'cloud',
  cylinder: 'can',
  cube: 'cube',
  ribbon: 'vertical-scroll',
  shield: 'octagon',
  funnel: 'flowchart-extract',
  wave: 'wave',
  brace: 'left-brace',
  arc: 'circular-arc',
  badge: 'sun',
};

function packRgb(r, g, b, alpha) {
  const val = [r, g, b]
    .map((n) => Math.max(0, Math.min(255, Math.round(+n))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  const a = alpha != null && Number.isFinite(+alpha) && +alpha < 1 ? +alpha : null;
  return { val, alpha: a, css: `#${val}` };
}

export function hexRgb(color) {
  const raw = String(color || '').trim();
  if (!raw || raw === 'none' || raw === 'transparent') return null;
  const rgb = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgb) return packRgb(rgb[1], rgb[2], rgb[3], rgb[4]);
  const hexMatch = raw.match(/#([0-9a-fA-F]{3,8})\b/);
  if (hexMatch) {
    let h = hexMatch[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length >= 8) {
      const a = parseInt(h.slice(6, 8), 16) / 255;
      return packRgb(
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
        a
      );
    }
    if (h.length >= 6) return packRgb(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
  }
  if (typeof document !== 'undefined') {
    try {
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.fillStyle = '#010101';
      ctx.fillStyle = raw;
      const got = String(ctx.fillStyle || '');
      if (got !== '#010101' || /#010101|rgb\(\s*1\s*,\s*1\s*,\s*1\s*\)/i.test(raw)) {
        const m = got.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (m) return packRgb(m[1], m[2], m[3]);
        const hx = got.match(/^#([0-9a-fA-F]{6})$/);
        if (hx) return packRgb(parseInt(hx[1].slice(0, 2), 16), parseInt(hx[1].slice(2, 4), 16), parseInt(hx[1].slice(4, 6), 16));
      }
    } catch (e) {}
  }
  return null;
}

export function cssColor(color, fallback = '#000000') {
  const c = hexRgb(color);
  return c ? c.css : fallback;
}

export function latinFace(cs) {
  const raw = parseFontFamily(cs) || '';
  const first = raw.replace(/^["']|["']$/g, '').split(',')[0].trim().replace(/^["']|["']$/g, '');
  return first || 'Calibri';
}

export function algnOf(align) {
  const a = String(align || '').trim().toLowerCase();
  if (a === 'center' || a === 'ctr' || a === 'middle') return 'ctr';
  if (a === 'right' || a === 'r' || a === 'end') return 'r';
  if (a === 'justify') return 'just';
  return 'l';
}

export function odpAlign(align) {
  const a = algnOf(align);
  if (a === 'ctr') return 'center';
  if (a === 'r') return 'end';
  if (a === 'just') return 'justify';
  return 'start';
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

function cssDecl(style, name) {
  const re = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i');
  const m = String(style || '').match(re);
  return m ? m[1].trim() : '';
}

function mergeRunStyle(st, el) {
  const next = { ...st };
  if (!el || el.nodeType !== 1) return next;
  const n = el.tagName.toLowerCase();
  if (n === 'b' || n === 'strong') next.bold = true;
  if (n === 'i' || n === 'em') next.italic = true;
  if (n === 'u') next.underline = true;
  if (n === 's' || n === 'strike' || n === 'del') next.strike = true;
  if (n === 'sup') next.script = 'sup';
  if (n === 'sub') next.script = 'sub';
  const style = el.getAttribute?.('style') || '';
  const color = cssDecl(style, 'color');
  if (color) next.color = color;
  const fs = cssDecl(style, 'font-size');
  const fsm = fs.match(/([\d.]+)\s*px/i);
  if (fsm) next.fs = +fsm[1];
  const fw = cssDecl(style, 'font-weight');
  if (fw === 'bold' || +fw >= 600) next.bold = true;
  if (fw === 'normal' || fw === '400') next.bold = false;
  const fst = cssDecl(style, 'font-style');
  if (fst === 'italic') next.italic = true;
  const td = cssDecl(style, 'text-decoration');
  if (/underline/.test(td)) next.underline = true;
  if (/line-through/.test(td)) next.strike = true;
  const ff = cssDecl(style, 'font-family');
  if (ff) next.face = ff.replace(/^["']|["']$/g, '').split(',')[0].trim();
  return next;
}

function runsFromHtmlLite(html) {
  const src = String(html || '');
  const runs = [];
  const stack = [{}];
  const re = /<\/?([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[3]) {
      const text = decodeEntities(m[3]);
      if (text) runs.push({ ...stack[stack.length - 1], text });
      continue;
    }
    const tag = m[1].toLowerCase();
    const closing = m[0].startsWith('</');
    if (tag === 'br') {
      runs.push({ paraBreak: true });
      continue;
    }
    if (closing) {
      if (stack.length > 1) stack.pop();
      if (tag === 'p' || tag === 'div' || tag === 'li' || /^h[1-6]$/.test(tag)) {
        if (runs.length && !runs[runs.length - 1].paraBreak) runs.push({ paraBreak: true });
      }
      continue;
    }
    if (tag === 'p' || tag === 'div' || tag === 'li' || /^h[1-6]$/.test(tag)) {
      if (runs.length && !runs[runs.length - 1].paraBreak) runs.push({ paraBreak: true });
    }
    const fake = { nodeType: 1, tagName: tag.toUpperCase(), getAttribute: (n) => {
      if (n !== 'style') return '';
      const sm = /style\s*=\s*(["'])(.*?)\1/i.exec(m[2] || '');
      return sm ? sm[2] : '';
    } };
    if (/\bdata-list-bullet\b/i.test(m[2] || '')) {
      runs.push({ listBullet: true });
      continue;
    }
    if (/\bdata-list-num\b/i.test(m[2] || '')) {
      runs.push({ listNum: true });
      continue;
    }
    stack.push(mergeRunStyle(stack[stack.length - 1], fake));
  }
  if (runs.length && runs[runs.length - 1].paraBreak) runs.pop();
  return runs.length ? runs : [{ text: '', bold: false, italic: false, underline: false }];
}

export function runsFromHtml(html) {
  if (typeof DOMParser === 'undefined') return runsFromHtmlLite(html);
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  const runs = [];
  const walk = (node, st) => {
    if (!node) return;
    if (node.nodeType === 3) {
      const t = node.nodeValue || '';
      if (t) runs.push({ ...st, text: t });
      return;
    }
    if (node.nodeType !== 1) return;
    const n = node.tagName.toLowerCase();
    if (n === 'br') {
      runs.push({ paraBreak: true });
      return;
    }
    if (node.hasAttribute?.('data-list-bullet')) {
      runs.push({ listBullet: true });
      return;
    }
    if (node.hasAttribute?.('data-list-num')) {
      runs.push({ listNum: true });
      return;
    }
    const next = mergeRunStyle(st, node);
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

export function parasFromRuns(runs) {
  const paras = [{ runs: [], listBullet: false, listNum: false }];
  for (const r of runs) {
    if (r.paraBreak) {
      if (paras[paras.length - 1].runs.length || paras[paras.length - 1].listBullet || paras[paras.length - 1].listNum) {
        paras.push({ runs: [], listBullet: false, listNum: false });
      }
      continue;
    }
    if (r.listBullet) {
      paras[paras.length - 1].listBullet = true;
      continue;
    }
    if (r.listNum) {
      paras[paras.length - 1].listNum = true;
      continue;
    }
    paras[paras.length - 1].runs.push(r);
  }
  return paras.filter((p) => p.runs.length || p.listBullet || p.listNum);
}

export function textBoxMeta(el, html) {
  const cs = el?.cs || el?.shapeTextCss || '';
  const fs = parseCsNumber(cs, 'font-size') || el?.fs || 24;
  const color =
    el?.textColor ||
    cssDecl(cs, 'color') ||
    '#ffffff';
  const align = cssDecl(cs, 'text-align') || el?.textAlign || 'left';
  const face = latinFace(cs);
  const va = (cssDecl(cs, 'align-items') || cssDecl(cs, 'vertical-align') || '').toLowerCase();
  let anchor = 't';
  if (va === 'center' || va === 'middle') anchor = 'ctr';
  if (va === 'flex-end' || va === 'bottom' || va === 'end') anchor = 'b';
  return { fs, color, align, face, anchor, paras: parasFromRuns(runsFromHtml(html || el?.html || el?.text || '')) };
}

export function shapePreset(el) {
  const id = el?.shape || 'rect';
  if (id === 'rect' && +(el.rx || 0) > 2) return 'roundRect';
  const meta = getShapeMeta(id);
  if (meta?.special === 'polygon') {
    const sides = Math.max(3, Math.min(12, +(el.polySides || el.sides || 6)));
    if (sides === 3) return 'triangle';
    if (sides === 4) return 'diamond';
    if (sides === 5) return 'pentagon';
    if (sides === 6) return 'hexagon';
    if (sides === 8) return 'octagon';
    if (sides === 10) return 'decagon';
  }
  if (id === 'star') {
    const rays = +(el.starRays || 5);
    if (rays <= 4) return 'star4';
    if (rays >= 16) return 'star16';
    if (rays >= 10) return 'star10';
    if (rays >= 8) return 'star8';
    if (rays >= 6) return 'star6';
    return 'star5';
  }
  const prst = SHAPE_PRST[id] || 'rect';
  return OOXML_SAFE_PRST.has(prst) ? prst : 'rect';
}

/** Presets every desktop PowerPoint generation accepts. */
const OOXML_SAFE_PRST = new Set([
  'rect',
  'roundRect',
  'ellipse',
  'triangle',
  'diamond',
  'pentagon',
  'hexagon',
  'heptagon',
  'octagon',
  'decagon',
  'star4',
  'star5',
  'star6',
  'star8',
  'star10',
  'star12',
  'star16',
  'star24',
  'star32',
  'rightArrow',
  'leftArrow',
  'upArrow',
  'downArrow',
  'leftRightArrow',
  'chevron',
  'parallelogram',
  'trapezoid',
  'heart',
  'wedgeRoundRectCallout',
  'moon',
  'plus',
  'noSmoking',
  'cloud',
  'can',
  'cube',
  'ribbon',
  'plaque',
  'wave',
  'leftBrace',
  'rightBrace',
  'arc',
  'line',
  'pie',
  'chord',
  'donut',
  'sun',
  'irregularSeal1',
  'homePlate',
  'gear6',
  'funnel',
]);

export function odpShapeType(el) {
  const id = el?.shape || 'rect';
  if (id === 'rect' && +(el.rx || 0) > 2) return 'round-rectangle';
  if (id === 'star') {
    const rays = +(el.starRays || 5);
    if (rays <= 4) return 'star4';
    if (rays >= 8) return 'star8';
    if (rays >= 6) return 'star6';
    return 'star5';
  }
  if (id === 'polygon') {
    const sides = Math.max(3, Math.min(12, +(el.polySides || el.sides || 6)));
    if (sides === 3) return 'isosceles-triangle';
    if (sides === 5) return 'pentagon';
    if (sides === 8) return 'octagon';
    return 'hexagon';
  }
  return ODP_DRAW_TYPE[id] || 'rectangle';
}

export function geomAdjXml(el, prst) {
  const bits = [];
  const adj = (name, n) => {
    const v = Math.round(+n);
    if (!Number.isFinite(v)) return;
    bits.push(`<a:gd name="${name}" fmla="val ${Math.max(0, Math.min(100000, v))}"/>`);
  };
  if (prst === 'roundRect') {
    const rx = Math.max(0, Math.min(100, +(el.rx || 0)));
    adj('adj', rx * 500);
  }
  if (String(prst).startsWith('star')) {
    const ir = Math.max(0.1, Math.min(0.9, +(el.starInner != null ? el.starInner : 0.45)));
    adj('adj', ir * 50000);
  }
  if (prst === 'trapezoid') {
    const t = Math.max(0, Math.min(0.49, +(el.trapTop != null ? el.trapTop : 0.15)));
    adj('adj', t * 100000);
  }
  if (prst === 'parallelogram') {
    const sk = Math.max(-45, Math.min(45, +(el.paraSkew != null ? el.paraSkew : 20)));
    adj('adj', ((sk + 45) / 90) * 100000);
  }
  if (prst === 'moon') {
    const p = Math.max(-1, Math.min(1, +(el.moonPhase != null ? el.moonPhase : -0.5)));
    adj('adj', (Math.abs(p) * 0.5 + 0.5) * 50000);
  }
  if (prst === 'donut') {
    const ir = Math.max(0.12, Math.min(0.88, +(el.ringInner != null ? el.ringInner : 0.5)));
    adj('adj', (1 - ir) * 50000);
  }
  if (!bits.length) return '<a:avLst/>';
  return `<a:avLst>${bits.join('')}</a:avLst>`;
}

export function gradFillXml(el) {
  if (!el?.fillGrad || !el?.fillGrad2) return '';
  const a = hexRgb(el.fillGrad);
  const b = hexRgb(el.fillGrad2);
  if (!a || !b) return '';
  const dir = el.fillGradDir != null ? +el.fillGradDir : 90;
  const ang = ((Math.round(dir) % 360) + 360) % 360 * 60000;
  const op = el.fillOp != null && +el.fillOp < 1 ? +el.fillOp : null;
  const alpha = (c) => {
    let al = c.alpha;
    if (op != null) al = (al != null ? al : 1) * op;
    return al != null && al < 1 ? `<a:alpha val="${Math.round(al * 100000)}"/>` : '';
  };
  return (
    '<a:gradFill rotWithShape="1">' +
    '<a:gsLst>' +
    `<a:gs pos="0"><a:srgbClr val="${a.val}">${alpha(a)}</a:srgbClr></a:gs>` +
    `<a:gs pos="100000"><a:srgbClr val="${b.val}">${alpha(b)}</a:srgbClr></a:gs>` +
    '</a:gsLst>' +
    `<a:lin ang="${ang}" scaled="0"/>` +
    '</a:gradFill>'
  );
}

export function pxToCmNum(px) {
  return ((+px || 0) / 96) * 2.54;
}

export function pxToCm(px) {
  return pxToCmNum(px).toFixed(3) + 'cm';
}

export function stripHtml(html) {
  return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function dataUrlToPart(src) {
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
  else if (mime.includes('quicktime')) ext = 'mov';
  else if (mime.includes('mpeg') && mime.includes('audio')) ext = 'mp3';
  else if (mime.includes('mp3')) ext = 'mp3';
  else if (mime.includes('wav')) ext = 'wav';
  else if (mime.includes('m4a') || mime.includes('aac')) ext = 'm4a';
  return { bytes, mime, ext };
}

export function svgPart(markup) {
  const xml = String(markup || '').trim();
  if (!xml) return null;
  const full = xml.includes('xmlns=') ? xml : xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return { bytes: new TextEncoder().encode(full), mime: 'image/svg+xml', ext: 'svg' };
}

/** PowerPoint rejects SVG/WebP in many versions — rasterize to PNG. */
export function rasterizePartForOffice(part) {
  return new Promise((resolve) => {
    if (!part || !part.bytes) return resolve(null);
    const ext = String(part.ext || '').toLowerCase();
    if (ext === 'png' || ext === 'jpeg' || ext === 'jpg' || ext === 'gif') return resolve(part);
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      return resolve(ext === 'svg' || ext === 'webp' ? null : part);
    }
    let url = '';
    try {
      const blob = new Blob([part.bytes], { type: part.mime || 'application/octet-stream' });
      url = URL.createObjectURL(blob);
    } catch (e) {
      return resolve(null);
    }
    const img = new Image();
    const done = (next) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
      resolve(next);
    };
    img.onload = () => {
      try {
        let w = img.naturalWidth || 0;
        let h = img.naturalHeight || 0;
        if ((!w || !h) && ext === 'svg') {
          const xml = new TextDecoder().decode(part.bytes);
          const vb = xml.match(/viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/i);
          w = w || Math.round(+(vb && vb[1]) || 256);
          h = h || Math.round(+(vb && vb[2]) || 256);
        }
        w = Math.max(1, Math.min(4096, w || 256));
        h = Math.max(1, Math.min(4096, h || 256));
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        done(dataUrlToPart(c.toDataURL('image/png')));
      } catch (e) {
        done(null);
      }
    };
    img.onerror = () => done(null);
    img.src = url;
  });
}

/** Reverse of ODP_DRAW_TYPE plus extras LibreOffice writes. */
export const ODP_TYPE_TO_SHAPE = {
  rectangle: 'rect',
  'round-rectangle': 'rect',
  ellipse: 'ellipse',
  circle: 'ellipse',
  'isosceles-triangle': 'triangle',
  triangle: 'triangle',
  star4: 'star',
  star5: 'star',
  star6: 'star',
  star8: 'star',
  'right-arrow': 'arrow',
  'left-arrow': 'arrowLeft',
  'up-arrow': 'arrowUp',
  'down-arrow': 'arrowDown',
  'left-right-arrow': 'arrowDouble',
  chevron: 'chevron',
  parallelogram: 'parallelogram',
  trapezoid: 'trapezoid',
  heart: 'heart',
  'rectangular-callout': 'callout',
  'round-rectangular-callout': 'calloutRound',
  moon: 'moon',
  cross: 'cross',
  forbidden: 'noSymbol',
  ring: 'gear',
  hexagon: 'polygon',
  pentagon: 'polygon',
  octagon: 'polygon',
  cloud: 'cloud',
  can: 'cylinder',
  cube: 'cube',
  'vertical-scroll': 'ribbon',
  'flowchart-extract': 'funnel',
  wave: 'wave',
  'left-brace': 'brace',
  'circular-arc': 'arc',
  sun: 'badge',
  line: 'line',
};

function parseSvgPathCmds(d) {
  const cmds = [];
  const re = /([MLCQZmlcqz])([^MLCQZmlcqz]*)/g;
  let m;
  while ((m = re.exec(String(d || '')))) {
    cmds.push({ t: m[1], n: (m[2].match(/-?[\d.]+/g) || []).map(Number) });
  }
  return cmds;
}

function qToCubic(px, py, x1, y1, x, y) {
  return [
    px + (2 / 3) * (x1 - px),
    py + (2 / 3) * (y1 - py),
    x + (2 / 3) * (x1 - x),
    y + (2 / 3) * (y1 - y),
    x,
    y,
  ];
}

/**
 * Catalog SVG path (viewBox 0 0 vb vb) → DrawingML custGeom.
 */
export function pathToCustGeomXml(d, vb = 100) {
  const cmds = parseSvgPathCmds(d);
  if (!cmds.length) return '';
  const unit = 10000;
  const sc = unit / Math.max(1, vb);
  const pt = (x, y) =>
    `<a:pt x="${Math.round(Math.max(0, x) * sc)}" y="${Math.round(Math.max(0, y) * sc)}"/>`;
  let cx = 0;
  let cy = 0;
  let body = '';
  for (const c of cmds) {
    const t = c.t;
    const n = c.n;
    if (t === 'M' || t === 'm') {
      for (let i = 0; i + 1 < n.length; i += 2) {
        if (t === 'm') {
          cx += n[i];
          cy += n[i + 1];
        } else {
          cx = n[i];
          cy = n[i + 1];
        }
        body += `<a:moveTo>${pt(cx, cy)}</a:moveTo>`;
      }
    } else if (t === 'L' || t === 'l') {
      for (let i = 0; i + 1 < n.length; i += 2) {
        if (t === 'l') {
          cx += n[i];
          cy += n[i + 1];
        } else {
          cx = n[i];
          cy = n[i + 1];
        }
        body += `<a:lnTo>${pt(cx, cy)}</a:lnTo>`;
      }
    } else if (t === 'C' || t === 'c') {
      for (let i = 0; i + 5 < n.length; i += 6) {
        let x1 = n[i];
        let y1 = n[i + 1];
        let x2 = n[i + 2];
        let y2 = n[i + 3];
        let x = n[i + 4];
        let y = n[i + 5];
        if (t === 'c') {
          x1 += cx;
          y1 += cy;
          x2 += cx;
          y2 += cy;
          x += cx;
          y += cy;
        }
        body += `<a:cubicBezTo>${pt(x1, y1)}${pt(x2, y2)}${pt(x, y)}</a:cubicBezTo>`;
        cx = x;
        cy = y;
      }
    } else if (t === 'Q' || t === 'q') {
      for (let i = 0; i + 3 < n.length; i += 4) {
        let x1 = n[i];
        let y1 = n[i + 1];
        let x = n[i + 2];
        let y = n[i + 3];
        if (t === 'q') {
          x1 += cx;
          y1 += cy;
          x += cx;
          y += cy;
        }
        const [a, b, c2, d2, e, f] = qToCubic(cx, cy, x1, y1, x, y);
        body += `<a:cubicBezTo>${pt(a, b)}${pt(c2, d2)}${pt(e, f)}</a:cubicBezTo>`;
        cx = x;
        cy = y;
      }
    } else if (t === 'Z' || t === 'z') {
      body += '<a:close/>';
    }
  }
  if (!body) return '';
  return (
    '<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/>' +
    '<a:rect l="l" t="t" r="r" b="b"/>' +
    `<a:pathLst><a:path w="${unit}" h="${unit}" extrusionOk="0">${body}</a:path></a:pathLst>` +
    '</a:custGeom>'
  );
}

/**
 * Catalog SVG path → ODF draw:enhanced-path (viewBox 0 0 vb vb).
 */
export function pathToEnhanced(d, vb = 100) {
  const cmds = parseSvgPathCmds(d);
  if (!cmds.length) return { path: `M 0 0 L ${vb} 0 ${vb} ${vb} 0 ${vb} Z N`, vb };
  let cx = 0;
  let cy = 0;
  const bits = [];
  const r = (n) => Math.round(n * 100) / 100;
  for (const c of cmds) {
    const t = c.t.toUpperCase();
    const rel = c.t !== t;
    const n = c.n.slice();
    if (t === 'M' || t === 'L') {
      const pts = [];
      for (let i = 0; i + 1 < n.length; i += 2) {
        if (rel) {
          cx += n[i];
          cy += n[i + 1];
        } else {
          cx = n[i];
          cy = n[i + 1];
        }
        pts.push(`${r(cx)} ${r(cy)}`);
      }
      bits.push(`${t} ${pts.join(' ')}`);
    } else if (t === 'C') {
      const pts = [];
      for (let i = 0; i + 5 < n.length; i += 6) {
        let x1 = n[i];
        let y1 = n[i + 1];
        let x2 = n[i + 2];
        let y2 = n[i + 3];
        let x = n[i + 4];
        let y = n[i + 5];
        if (rel) {
          x1 += cx;
          y1 += cy;
          x2 += cx;
          y2 += cy;
          x += cx;
          y += cy;
        }
        pts.push(`${r(x1)} ${r(y1)} ${r(x2)} ${r(y2)} ${r(x)} ${r(y)}`);
        cx = x;
        cy = y;
      }
      bits.push(`C ${pts.join(' ')}`);
    } else if (t === 'Q') {
      const pts = [];
      for (let i = 0; i + 3 < n.length; i += 4) {
        let x1 = n[i];
        let y1 = n[i + 1];
        let x = n[i + 2];
        let y = n[i + 3];
        if (rel) {
          x1 += cx;
          y1 += cy;
          x += cx;
          y += cy;
        }
        const cub = qToCubic(cx, cy, x1, y1, x, y);
        pts.push(cub.map(r).join(' '));
        cx = x;
        cy = y;
      }
      bits.push(`C ${pts.join(' ')}`);
    } else if (t === 'Z') {
      bits.push('Z');
    }
  }
  bits.push('N');
  return { path: bits.join(' '), vb };
}
