/** ODP export: JPEG slides zipped as OpenDocument Presentation. */

import { captureSlidesAsJpegs } from './exportPdf.js';
import { ensureJSZip } from '../shared/jszip.js';
import { escXml } from './xmlEsc.js';
import { downloadBlob } from './exportDom.js';

function pxToCm(px) {
  return ((px / 96) * 2.54).toFixed(3) + 'cm';
}

function buildOdpXml(slideCount, pageW, pageH, title) {
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
    '<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="http://www.w3.org/2000/svg" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" office:version="1.2">' +
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

function buildOdpStyles(pageW, pageH) {
  const w = pxToCm(pageW);
  const h = pxToCm(pageH);
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="http://www.w3.org/2000/svg" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">' +
    '<office:styles><style:default-style style:family="graphic"><style:graphic-properties draw:stroke="none" draw:fill="none"/></style:default-style></office:styles>' +
    '<office:automatic-styles>' +
    '<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="' +
    w +
    '" fo:page-height="' +
    h +
    '" style:print-orientation="landscape"/></style:page-layout>' +
    '<style:style style:name="Default" style:family="presentation"><style:presentation-page-layout-properties style:page-layout-name="pm1"/></style:style>' +
    '</office:automatic-styles>' +
    '<office:master-styles><draw:layer-set><draw:layer draw:name="layout"/><draw:layer draw:name="background"/><draw:layer draw:name="backgroundobjects"/><draw:layer draw:name="controls"/><draw:layer draw:name="measurelines"/></draw:layer-set>' +
    '<style:master-page style:name="Default" style:page-layout-name="pm1" draw:style-name="Default"/></office:master-styles>' +
    '</office:document-styles>'
  );
}

function buildOdpMeta(title) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.2">' +
    '<office:meta><meta:generator>Слайды</meta:generator><dc:title>' +
    escXml(title || 'Presentation') +
    '</dc:title></office:meta></office:document-meta>'
  );
}

function buildOdpManifest(slideCount) {
  let pics = '';
  for (let i = 0; i < slideCount; i++) {
    pics +=
      '<manifest:file-entry manifest:full-path="Pictures/slide' +
      (i + 1) +
      '.jpg" manifest:media-type="image/jpeg"/>';
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

/**
 * @param {{ slides, canvasW, canvasH, setCur, cur, title, quality? }} opts
 */
export async function exportAllSlidesOdp(opts = {}) {
  const { title } = opts;
  const JSZip = await ensureJSZip();
  const { jpegs, W, H } = await captureSlidesAsJpegs(opts);
  const zip = new JSZip();
  zip.file('mimetype', 'application/vnd.oasis.opendocument.presentation', { compression: 'STORE' });
  zip.folder('META-INF').file('manifest.xml', buildOdpManifest(jpegs.length));
  zip.file('content.xml', buildOdpXml(jpegs.length, W, H, title));
  zip.file('styles.xml', buildOdpStyles(W, H));
  zip.file('meta.xml', buildOdpMeta(title));
  const pics = zip.folder('Pictures');
  jpegs.forEach((jpg, i) => pics.file('slide' + (i + 1) + '.jpg', jpg));
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.oasis.opendocument.presentation',
  });
  downloadBlob(blob, (title || 'slides') + '.odp');
  return jpegs.length;
}
