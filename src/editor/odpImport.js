/**
 * OpenDocument Presentation (.odp) → React slides.
 * Handles JPEG-per-page files from our own export and a native subset
 * (text boxes, images, rect/ellipse/line) from LibreOffice / PowerPoint ODP.
 */

import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';
import { ensureJSZip } from '../shared/jszip.js';

const XLINK = 'http://www.w3.org/1999/xlink';

function localAll(root, name) {
  if (!root || !root.getElementsByTagName) return [];
  return Array.from(root.getElementsByTagName('*')).filter((el) => el.localName === name);
}

function attr(el, name) {
  if (!el) return '';
  if (name.includes(':')) {
    const local = name.split(':').pop();
    return (
      el.getAttribute(name) ||
      (local === 'href' ? el.getAttributeNS(XLINK, 'href') : '') ||
      el.getAttribute(local) ||
      ''
    );
  }
  return el.getAttribute(name) || '';
}

/** Parse ODF length (cm/mm/in/pt/px) → centimetres. */
export function odpLenToCm(raw) {
  const m = String(raw || '')
    .trim()
    .match(/^(-?[\d.]+)\s*(cm|mm|in|inch|pt|pc|px)?$/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;
  const u = (m[2] || 'cm').toLowerCase();
  if (u === 'mm') return n / 10;
  if (u === 'in' || u === 'inch') return n * 2.54;
  if (u === 'pt') return (n * 2.54) / 72;
  if (u === 'pc') return (n * 2.54) / 6;
  if (u === 'px') return (n / 96) * 2.54;
  return n;
}

function cmToPx(cm, pageCm, canvasPx) {
  if (!pageCm) return Math.round(cm * (96 / 2.54));
  return Math.round((cm / pageCm) * canvasPx);
}

function nid(prefix, n) {
  return `${prefix}${n}`;
}

function mimeFromPath(p) {
  const ext = String(p || '')
    .split('.')
    .pop()
    .toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  return 'image/jpeg';
}

function collectText(el) {
  if (!el) return '';
  const parts = [];
  const walk = (node) => {
    if (!node) return;
    if (node.nodeType === 3) {
      parts.push(node.nodeValue || '');
      return;
    }
    if (node.nodeType !== 1) return;
    if (node.localName === 'line-break' || node.localName === 'p') {
      if (parts.length) parts.push('\n');
    }
    for (const c of node.childNodes) walk(c);
  };
  walk(el);
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
}

function parseStyleMap(doc) {
  const map = {};
  if (!doc) return map;
  for (const st of localAll(doc, 'style')) {
    const name = attr(st, 'style:name') || attr(st, 'name');
    if (!name) continue;
    const gp =
      localAll(st, 'graphic-properties')[0] ||
      localAll(st, 'drawing-page-properties')[0] ||
      localAll(st, 'text-properties')[0] ||
      localAll(st, 'paragraph-properties')[0];
    const entry = {};
    if (gp) {
      const fill = attr(gp, 'draw:fill') || attr(gp, 'fill');
      const fillColor = attr(gp, 'draw:fill-color') || attr(gp, 'fill-color');
      const stroke = attr(gp, 'draw:stroke') || attr(gp, 'stroke');
      const strokeColor =
        attr(gp, 'svg:stroke-color') || attr(gp, 'draw:stroke-color') || attr(gp, 'stroke-color');
      const strokeW = attr(gp, 'svg:stroke-width') || attr(gp, 'stroke-width');
      const fontSize = attr(gp, 'fo:font-size') || attr(gp, 'font-size');
      const color = attr(gp, 'fo:color') || attr(gp, 'color');
      const align = attr(gp, 'fo:text-align') || attr(gp, 'text-align');
      if (fill) entry.fillKind = fill;
      if (fillColor) entry.fill = fillColor;
      if (stroke) entry.strokeKind = stroke;
      if (strokeColor) entry.stroke = strokeColor;
      if (strokeW) entry.strokeWcm = odpLenToCm(strokeW);
      if (fontSize) entry.fs = Math.max(10, Math.round(odpLenToCm(fontSize) * (72 / 2.54)));
      if (color) entry.color = color;
      if (align) entry.align = align === 'end' ? 'right' : align === 'center' ? 'center' : 'left';
    }
    map[name] = entry;
  }
  return map;
}

function pageSizeFromStyles(stylesDoc, contentDoc) {
  const docs = [stylesDoc, contentDoc].filter(Boolean);
  for (const doc of docs) {
    for (const pl of localAll(doc, 'page-layout-properties')) {
      const w = odpLenToCm(attr(pl, 'fo:page-width') || attr(pl, 'page-width'));
      const h = odpLenToCm(attr(pl, 'fo:page-height') || attr(pl, 'page-height'));
      if (w > 0 && h > 0) return { wCm: w, hCm: h };
    }
  }
  return { wCm: (DEFAULT_CANVAS_W / 96) * 2.54, hCm: (DEFAULT_CANVAS_H / 96) * 2.54 };
}

function frameBox(el, wCm, hCm, canvasW, canvasH) {
  const x = cmToPx(odpLenToCm(attr(el, 'svg:x') || attr(el, 'x')), wCm, canvasW);
  const y = cmToPx(odpLenToCm(attr(el, 'svg:y') || attr(el, 'y')), hCm, canvasH);
  const w = Math.max(
    8,
    cmToPx(odpLenToCm(attr(el, 'svg:width') || attr(el, 'width')), wCm, canvasW)
  );
  const h = Math.max(
    8,
    cmToPx(odpLenToCm(attr(el, 'svg:height') || attr(el, 'height')), hCm, canvasH)
  );
  return { x, y, w, h };
}

function isFullPageBox(box, canvasW, canvasH) {
  const cov = (box.w * box.h) / Math.max(1, canvasW * canvasH);
  return box.x <= canvasW * 0.05 && box.y <= canvasH * 0.05 && cov >= 0.88;
}

function shapeFromDraw(el) {
  const n = el.localName;
  if (n === 'rect' || n === 'custom-shape') return 'rect';
  if (n === 'ellipse' || n === 'circle') return 'ellipse';
  if (n === 'line' || n === 'connector') return 'line';
  if (n === 'polygon' || n === 'polyline') return 'polygon';
  return null;
}

async function zipImageDataUrl(zip, href) {
  if (!href) return '';
  let path = decodeURIComponent(String(href).replace(/^\.\//, '').replace(/^\/+/, ''));
  const tries = [path, path.replace(/^Pictures\//i, 'Pictures/'), 'Pictures/' + path.split('/').pop()];
  for (const p of tries) {
    const f = zip.file(p);
    if (!f) continue;
    const buf = await f.async('base64');
    return `data:${mimeFromPath(p)};base64,${buf}`;
  }
  return '';
}

function applyStyle(el, styles) {
  const name = attr(el, 'draw:style-name') || attr(el, 'style-name') || attr(el, 'text:style-name');
  return (name && styles[name]) || {};
}

/**
 * @param {import('jszip')} zip
 */
export function isOdpArchive(zip) {
  if (!zip || !zip.files) return false;
  if (zip.file('ppt/presentation.xml')) return false;
  return !!(zip.file('content.xml') || zip.file('META-INF/manifest.xml'));
}

/**
 * @param {import('jszip')} zip
 * @param {{canvasW?:number, canvasH?:number, filename?:string}} [opts]
 */
export async function importOdpZip(zip, opts = {}) {
  const contentFile = zip.file('content.xml');
  if (!contentFile) throw new Error('ODP: content.xml missing');
  const contentXml = await contentFile.async('string');
  const stylesXml = (await zip.file('styles.xml')?.async('string')) || '';
  const metaXml = (await zip.file('meta.xml')?.async('string')) || '';

  const parser = new DOMParser();
  const contentDoc = parser.parseFromString(contentXml, 'application/xml');
  const stylesDoc = stylesXml ? parser.parseFromString(stylesXml, 'application/xml') : null;
  const metaDoc = metaXml ? parser.parseFromString(metaXml, 'application/xml') : null;

  const { wCm, hCm } = pageSizeFromStyles(stylesDoc, contentDoc);
  const ratio = wCm / Math.max(0.01, hCm);
  let canvasW = opts.canvasW || DEFAULT_CANVAS_W;
  let canvasH = opts.canvasH || DEFAULT_CANVAS_H;
  let ar = '16:9';
  if (ratio < 0.8) {
    ar = '9:16';
    if (!opts.canvasW) canvasW = 1080;
    if (!opts.canvasH) canvasH = 1920;
  } else if (Math.abs(ratio - 4 / 3) < 0.12) {
    ar = '4:3';
    if (!opts.canvasW) canvasW = 1920;
    if (!opts.canvasH) canvasH = 1440;
  } else {
    ar = Math.abs(ratio - 16 / 9) < 0.15 ? '16:9' : 'custom';
    if (ar === 'custom' && !opts.canvasW) {
      canvasW = DEFAULT_CANVAS_W;
      canvasH = Math.max(540, Math.round(canvasW / ratio));
    }
  }

  const styles = { ...parseStyleMap(stylesDoc), ...parseStyleMap(contentDoc) };
  const pages = localAll(contentDoc, 'page').filter((p) => {
    const parent = p.parentNode && p.parentNode.localName;
    return parent === 'presentation' || parent === 'document-content' || !parent;
  });
  const pageList = pages.length ? pages : localAll(contentDoc, 'page');
  if (!pageList.length) throw new Error('ODP: no slides found');

  const idBase = 'odp' + Date.now().toString(36);
  let n = 0;
  const slides = [];

  for (let i = 0; i < pageList.length; i++) {
    const page = pageList[i];
    const pageStyle = applyStyle(page, styles);
    const bgc = pageStyle.fill || '#1a1a2e';
    const frames = localAll(page, 'frame');
    const drawShapes = ['rect', 'ellipse', 'circle', 'line', 'custom-shape', 'polygon'].flatMap((nm) =>
      localAll(page, nm).filter((el) => el.parentNode === page || el.parentNode?.localName === 'g')
    );

    const imageFrames = [];
    for (const fr of frames) {
      const img = localAll(fr, 'image')[0];
      if (!img) continue;
      const href = attr(img, 'xlink:href') || attr(img, 'href');
      const box = frameBox(fr, wCm, hCm, canvasW, canvasH);
      const src = await zipImageDataUrl(zip, href);
      if (src) imageFrames.push({ box, src });
    }

    const rasterOnly =
      imageFrames.length === 1 &&
      isFullPageBox(imageFrames[0].box, canvasW, canvasH) &&
      frames.every((fr) => localAll(fr, 'image')[0] || !collectText(fr));

    const els = [];
    if (rasterOnly) {
      slides.push({
        id: `s${idBase}_${i}`,
        title: attr(page, 'draw:name') || `Slide ${i + 1}`,
        name: attr(page, 'draw:name') || `Slide ${i + 1}`,
        bg: 'custom',
        bgc,
        bgImg: { src: imageFrames[0].src, mode: 'stretch', opacity: 1, blur: 0 },
        els: [],
        ink: [],
        connectors: [],
      });
      continue;
    }

    for (const im of imageFrames) {
      els.push({
        id: nid(idBase, ++n),
        type: 'image',
        x: im.box.x,
        y: im.box.y,
        w: im.box.w,
        h: im.box.h,
        src: im.src,
        rot: 0,
        anims: [],
      });
    }

    for (const fr of frames) {
      if (localAll(fr, 'image')[0]) continue;
      const box = frameBox(fr, wCm, hCm, canvasW, canvasH);
      const textBox = localAll(fr, 'text-box')[0] || fr;
      const text = collectText(textBox);
      if (!text) continue;
      const st = applyStyle(fr, styles);
      const fs = st.fs || Math.max(16, Math.round(box.h * 0.22));
      const color = st.color || '#ffffff';
      const align = st.align || 'left';
      els.push({
        id: nid(idBase, ++n),
        type: 'text',
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        html: text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>'),
        text,
        cs: `font-size:${fs}px;color:${color};text-align:${align};font-family:Georgia,serif;`,
        textColor: color,
        textColorScheme: null,
        rot: 0,
        anims: [],
      });
    }

    for (const sh of drawShapes) {
      const kind = shapeFromDraw(sh);
      if (!kind) continue;
      let box;
      if (kind === 'line') {
        const x1 = cmToPx(odpLenToCm(attr(sh, 'svg:x1')), wCm, canvasW);
        const y1 = cmToPx(odpLenToCm(attr(sh, 'svg:y1')), hCm, canvasH);
        const x2 = cmToPx(odpLenToCm(attr(sh, 'svg:x2')), wCm, canvasW);
        const y2 = cmToPx(odpLenToCm(attr(sh, 'svg:y2')), hCm, canvasH);
        box = {
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          w: Math.max(8, Math.abs(x2 - x1)),
          h: Math.max(8, Math.abs(y2 - y1)),
        };
      } else {
        box = frameBox(sh, wCm, hCm, canvasW, canvasH);
      }
      const st = applyStyle(sh, styles);
      const noFill = st.fillKind === 'none';
      els.push({
        id: nid(idBase, ++n),
        type: 'shape',
        shape: kind,
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        fill: noFill ? 'transparent' : st.fill || '#3b82f6',
        stroke: st.stroke || '#1d4ed8',
        sw: st.strokeWcm ? Math.max(1, cmToPx(st.strokeWcm, wCm, canvasW)) : 2,
        fillOp: noFill ? 0 : 1,
        rot: 0,
        anims: [],
      });
    }

    slides.push({
      id: `s${idBase}_${i}`,
      title: attr(page, 'draw:name') || `Slide ${i + 1}`,
      name: attr(page, 'draw:name') || `Slide ${i + 1}`,
      bg: 'custom',
      bgc,
      els,
      ink: [],
      connectors: [],
    });
  }

  let title = '';
  if (metaDoc) {
    const t = localAll(metaDoc, 'title')[0];
    if (t) title = (t.textContent || '').trim();
  }
  if (!title) {
    title = String(opts.filename || '')
      .replace(/\.odp$/i, '')
      .trim() || 'Import';
  }

  return { slides, title, canvasW, canvasH, ar };
}

export async function importOdpFile(file, opts = {}) {
  const buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const JSZip = await ensureJSZip();
  const zip = await JSZip.loadAsync(buf);
  if (!isOdpArchive(zip)) throw new Error('Not an ODP archive');
  const name = file && file.name ? String(file.name) : opts.filename || 'file.odp';
  return importOdpZip(zip, { ...opts, filename: name });
}

export default { isOdpArchive, importOdpZip, importOdpFile, odpLenToCm };
