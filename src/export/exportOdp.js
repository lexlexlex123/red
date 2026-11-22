/**
 * ODP export: native ODF (editable text, shapes, images, tables).
 * JPEG packer kept for visual fallback.
 */

import { captureSlidesAsJpegs } from './exportPdf.js';
import { prepareDeckForHtmlExport } from './prepareExportAssets.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from '../editor/canvasDims.js';
import { ensureIcons } from '../editor/iconsLazy.js';
import { ensureJSZip } from '../shared/jszip.js';
import { downloadBlob } from './exportDom.js';
import { buildNativeOdpSlide, packOdpParts } from './odpNative.js';
import { escXml, pxToCm } from './nativeShared.js';

function buildOdpXmlJpeg(slideCount, pageW, pageH) {
  const w = pxToCm(pageW);
  const h = pxToCm(pageH);
  let pages = '';
  for (let i = 0; i < slideCount; i++) {
    pages +=
      '<draw:page draw:name="page' +
      (i + 1) +
      '" draw:style-name="dp1" draw:master-page-name="Default">' +
      '<draw:frame draw:style-name="gr1" draw:name="Slide' +
      (i + 1) +
      '" svg:width="' +
      w +
      '" svg:height="' +
      h +
      '" svg:x="0cm" svg:y="0cm">' +
      '<draw:image xlink:href="Pictures/slide' +
      (i + 1) +
      '.jpg" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>' +
      '</draw:frame></draw:page>';
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" office:version="1.2">' +
    '<office:scripts/><office:font-face-decls/>' +
    '<office:automatic-styles>' +
    '<style:style style:name="dp1" style:family="drawing-page"><style:drawing-page-properties presentation:background-visible="true" draw:fill="none"/></style:style>' +
    '<style:style style:name="gr1" style:family="graphic"><style:graphic-properties style:vertical-pos="top" style:horizontal-pos="left" style:vertical-rel="page" style:horizontal-rel="page"/></style:style>' +
    '</office:automatic-styles>' +
    '<office:body><office:presentation>' +
    pages +
    '</office:presentation></office:body>' +
    '</office:document-content>'
  );
}

/**
 * Native ODF from a React deck (editable objects).
 */
export async function packOdpFromDeck(JSZip, deck) {
  const slides = deck?.slides || [];
  if (!slides.length) throw new Error('No slides');
  const W = deck.canvasW || DEFAULT_CANVAS_W;
  const H = deck.canvasH || DEFAULT_CANVAS_H;
  const mediaSeq = { n: 0 };
  let stylesRef;
  const built = [];
  for (const slide of slides) {
    const part = await buildNativeOdpSlide(slide, { canvasW: W, canvasH: H }, mediaSeq, stylesRef);
    stylesRef = part.styles;
    built.push(part);
  }
  const packed = packOdpParts(built, W, H, deck.title);
  const zip = new JSZip();
  zip.file('mimetype', 'application/vnd.oasis.opendocument.presentation', { compression: 'STORE' });
  zip.folder('META-INF').file('manifest.xml', packed.manifest);
  zip.file('content.xml', packed.content);
  zip.file('styles.xml', packed.styles);
  zip.file('meta.xml', packed.meta);
  if (packed.pictures.length) {
    const pics = zip.folder('Pictures');
    packed.pictures.forEach((p) => pics.file(p.name, p.bytes));
  }
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.oasis.opendocument.presentation',
  });
}

/**
 * JPEG-per-slide ODP (tests / visual fallback).
 */
export async function packOdpFromJpegs(JSZip, jpegs, W, H, title) {
  const zip = new JSZip();
  zip.file('mimetype', 'application/vnd.oasis.opendocument.presentation', { compression: 'STORE' });
  let picsXml = '';
  for (let i = 0; i < jpegs.length; i++) {
    picsXml +=
      '<manifest:file-entry manifest:full-path="Pictures/slide' +
      (i + 1) +
      '.jpg" manifest:media-type="image/jpeg"/>';
  }
  const manifest =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">' +
    '<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.presentation"/>' +
    '<manifest:file-entry manifest:full-path="mimetype" manifest:media-type="text/plain"/>' +
    '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="META-INF/manifest.xml" manifest:media-type="text/xml"/>' +
    picsXml +
    '</manifest:manifest>';
  zip.folder('META-INF').file('manifest.xml', manifest);
  zip.file('content.xml', buildOdpXmlJpeg(jpegs.length, W, H));
  zip.file(
    'styles.xml',
    '<?xml version="1.0" encoding="UTF-8"?>' +
      '<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">' +
      '<office:styles><style:default-style style:family="graphic"><style:graphic-properties draw:stroke="none" draw:fill="none"/></style:default-style></office:styles>' +
      '<office:automatic-styles>' +
      `<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="${pxToCm(W)}" fo:page-height="${pxToCm(H)}" style:print-orientation="${W >= H ? 'landscape' : 'portrait'}"/></style:page-layout>` +
      '</office:automatic-styles>' +
      '<office:master-styles><style:master-page style:name="Default" style:page-layout-name="pm1"/></office:master-styles>' +
      '</office:document-styles>'
  );
  zip.file(
    'meta.xml',
    '<?xml version="1.0" encoding="UTF-8"?>' +
      '<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.2">' +
      `<office:meta><meta:generator>Слайды</meta:generator><dc:title>${escXml(title || 'Presentation')}</dc:title></office:meta></office:document-meta>`
  );
  const pics = zip.folder('Pictures');
  jpegs.forEach((jpg, i) => pics.file('slide' + (i + 1) + '.jpg', jpg));
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.oasis.opendocument.presentation',
  });
}

/**
 * @param {{ slides, canvasW, canvasH, title }} opts
 */
export async function exportAllSlidesOdp(opts = {}) {
  const { title } = opts;
  const JSZip = await ensureJSZip();
  await ensureIcons().catch(() => {});
  const prepared = await prepareDeckForHtmlExport({
    title,
    slides: opts.slides || [],
    canvasW: opts.canvasW,
    canvasH: opts.canvasH,
  });
  const blob = await packOdpFromDeck(JSZip, prepared);
  downloadBlob(blob, (title || 'slides') + '.odp');
  return (prepared.slides || []).length;
}

/** Visual fallback: raster slides as JPEG pages. */
export async function exportAllSlidesOdpRaster(opts = {}) {
  const { title } = opts;
  const JSZip = await ensureJSZip();
  const { jpegs, W, H } = await captureSlidesAsJpegs(opts);
  const blob = await packOdpFromJpegs(JSZip, jpegs, W, H, title);
  downloadBlob(blob, (title || 'slides') + '.odp');
  return jpegs.length;
}
