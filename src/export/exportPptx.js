/**
 * PPTX export: native OOXML (editable text/shapes/images/tables/connectors/ink).
 * JPEG packer kept for tests / visual fallback.
 */

import { buildNativeSlide, escXml } from './pptxNative.js';
import { prepareDeckForHtmlExport } from './prepareExportAssets.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from '../editor/canvasDims.js';
import { ensureIcons } from '../editor/iconsLazy.js';
import { ensureJSZip } from '../shared/jszip.js';
import { downloadBlob } from './exportDom.js';

const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const REL_OFFICE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';

function pxToEmu(px) {
  return Math.max(1, Math.round(((+px || 0) / 96) * 914400));
}

/** Standard OOXML slide size for common aspect ratios (not raw CSS-px EMUs). */
function slideEmu(W, H) {
  const r = (+W || 1) / (+H || 1);
  if (Math.abs(r - 16 / 9) < 0.08) return { cx: 12192000, cy: 6858000 };
  if (Math.abs(r - 9 / 16) < 0.08) return { cx: 6858000, cy: 12192000 };
  if (Math.abs(r - 4 / 3) < 0.08) return { cx: 9144000, cy: 6858000 };
  return { cx: pxToEmu(W), cy: pxToEmu(H) };
}

function isoNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function relsXml(entries) {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<Relationships xmlns="${NS_REL}">` +
    entries
      .map(
        (e) =>
          `<Relationship Id="${e.id}" Type="${e.type}" Target="${e.target}"${
            e.targetMode ? ` TargetMode="${e.targetMode}"` : ''
          }/>`
      )
      .join('') +
    '</Relationships>'
  );
}

function contentTypesXml(slideCount, extraExts = []) {
  const defaults = {
    rels: 'application/vnd.openxmlformats-package.relationships+xml',
    xml: 'application/xml',
    jpeg: 'image/jpeg',
  };
  extraExts.forEach((ext) => {
    if (ext === 'png') defaults.png = 'image/png';
    if (ext === 'gif') defaults.gif = 'image/gif';
    if (ext === 'webp') defaults.webp = 'image/webp';
    if (ext === 'svg') defaults.svg = 'image/svg+xml';
    if (ext === 'jpeg' || ext === 'jpg') defaults.jpeg = 'image/jpeg';
    if (ext === 'mp4') defaults.mp4 = 'video/mp4';
    if (ext === 'webm') defaults.webm = 'video/webm';
    if (ext === 'mov') defaults.mov = 'video/quicktime';
    if (ext === 'mp3') defaults.mp3 = 'audio/mpeg';
    if (ext === 'wav') defaults.wav = 'audio/wav';
    if (ext === 'm4a') defaults.m4a = 'audio/mp4';
  });
  let defXml = '';
  Object.keys(defaults).forEach((ext) => {
    defXml += `<Default Extension="${ext}" ContentType="${defaults[ext]}"/>`;
  });
  let overrides = '';
  for (let i = 1; i <= slideCount; i++) {
    overrides +=
      `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
  }
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    defXml +
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    overrides +
    '</Types>'
  );
}

function presentationXml(slideCount, cx, cy) {
  let ids = '';
  for (let i = 0; i < slideCount; i++) {
    ids += `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`;
  }
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    `<p:sldIdLst>${ids}</p:sldIdLst>` +
    `<p:sldSz cx="${cx}" cy="${cy}"/>` +
    '<p:notesSz cx="6858000" cy="9144000"/>' +
    '</p:presentation>'
  );
}

function nvGrp(cx, cy) {
  return (
    '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm>' +
    '<a:off x="0" y="0"/>' +
    `<a:ext cx="${cx}" cy="${cy}"/>` +
    '<a:chOff x="0" y="0"/>' +
    `<a:chExt cx="${cx}" cy="${cy}"/>` +
    '</a:xfrm></p:grpSpPr>'
  );
}

function slideXml(cx, cy, name) {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:spTree>' +
    nvGrp(cx, cy) +
    '<p:pic>' +
    `<p:nvPicPr><p:cNvPr id="2" name="${escXml(name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>` +
    '<p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>' +
    '<p:spPr>' +
    `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' +
    '</p:spPr></p:pic>' +
    '</p:spTree></p:cSld>' +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
    '</p:sld>'
  );
}

function slideMasterXml(cx, cy) {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>' +
    `<p:spTree>${nvGrp(cx, cy)}</p:spTree></p:cSld>` +
    '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
    '</p:sldMaster>'
  );
}

function slideLayoutXml(cx, cy) {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">' +
    `<p:cSld name="Blank"><p:spTree>${nvGrp(cx, cy)}</p:spTree></p:cSld>` +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
    '</p:sldLayout>'
  );
}

function themeXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Slides">' +
    '<a:themeElements>' +
    '<a:clrScheme name="Office">' +
    '<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>' +
    '<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>' +
    '<a:dk2><a:srgbClr val="1F497D"/></a:dk2>' +
    '<a:lt2><a:srgbClr val="EEECE1"/></a:lt2>' +
    '<a:accent1><a:srgbClr val="4F81BD"/></a:accent1>' +
    '<a:accent2><a:srgbClr val="C0504D"/></a:accent2>' +
    '<a:accent3><a:srgbClr val="9BBB59"/></a:accent3>' +
    '<a:accent4><a:srgbClr val="8064A2"/></a:accent4>' +
    '<a:accent5><a:srgbClr val="4BACC6"/></a:accent5>' +
    '<a:accent6><a:srgbClr val="F79646"/></a:accent6>' +
    '<a:hlink><a:srgbClr val="0000FF"/></a:hlink>' +
    '<a:folHlink><a:srgbClr val="800080"/></a:folHlink>' +
    '</a:clrScheme>' +
    '<a:fontScheme name="Office">' +
    '<a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
    '<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>' +
    '</a:fontScheme>' +
    '<a:fmtScheme name="Office">' +
    '<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>' +
    '<a:lnStyleLst>' +
    '<a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>' +
    '<a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>' +
    '<a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>' +
    '</a:lnStyleLst>' +
    '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
    '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>' +
    '</a:fmtScheme></a:themeElements></a:theme>'
  );
}

function coreXml(title) {
  const t = isoNow();
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:title>${escXml(title || 'Presentation')}</dc:title>` +
    '<dc:creator>Слайды</dc:creator>' +
    '<cp:lastModifiedBy>Слайды</cp:lastModifiedBy>' +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${t}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${t}</dcterms:modified>` +
    '</cp:coreProperties>'
  );
}

function appXml(slideCount) {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
    '<Application>Слайды</Application>' +
    `<Slides>${slideCount}</Slides>` +
    '</Properties>'
  );
}

function writePptxShell(zip, n, cx, cy, title, extraExts) {
  zip.file('[Content_Types].xml', contentTypesXml(n, extraExts));
  zip.folder('_rels').file(
    '.rels',
    relsXml([
      { id: 'rId1', type: `${REL_OFFICE}/officeDocument`, target: 'ppt/presentation.xml' },
      { id: 'rId2', type: `${REL_PKG}/metadata/core-properties`, target: 'docProps/core.xml' },
      { id: 'rId3', type: `${REL_OFFICE}/extended-properties`, target: 'docProps/app.xml' },
    ])
  );

  const presRels = [{ id: 'rId1', type: `${REL_OFFICE}/slideMaster`, target: 'slideMasters/slideMaster1.xml' }];
  for (let i = 0; i < n; i++) {
    presRels.push({
      id: `rId${i + 2}`,
      type: `${REL_OFFICE}/slide`,
      target: `slides/slide${i + 1}.xml`,
    });
  }

  const ppt = zip.folder('ppt');
  ppt.file('presentation.xml', presentationXml(n, cx, cy));
  ppt.folder('_rels').file('presentation.xml.rels', relsXml(presRels));
  ppt.file('theme/theme1.xml', themeXml());
  ppt.file('slideMasters/slideMaster1.xml', slideMasterXml(cx, cy));
  ppt.folder('slideMasters/_rels').file(
    'slideMaster1.xml.rels',
    relsXml([
      { id: 'rId1', type: `${REL_OFFICE}/slideLayout`, target: '../slideLayouts/slideLayout1.xml' },
      { id: 'rId2', type: `${REL_OFFICE}/theme`, target: '../theme/theme1.xml' },
    ])
  );
  ppt.file('slideLayouts/slideLayout1.xml', slideLayoutXml(cx, cy));
  ppt.folder('slideLayouts/_rels').file(
    'slideLayout1.xml.rels',
    relsXml([{ id: 'rId1', type: `${REL_OFFICE}/slideMaster`, target: '../slideMasters/slideMaster1.xml' }])
  );
  zip.file('docProps/core.xml', coreXml(title));
  zip.file('docProps/app.xml', appXml(n));
  return ppt;
}

/**
 * Pack JPEG page bytes into a PPTX blob (no download).
 */
export async function packPptxFromJpegs(JSZip, jpegs, W, H, title) {
  const n = jpegs.length;
  if (!n) throw new Error('No slides');
  const { cx, cy } = slideEmu(W, H);
  const zip = new JSZip();
  const ppt = writePptxShell(zip, n, cx, cy, title, ['jpeg']);
  const media = ppt.folder('media');
  const slidesDir = ppt.folder('slides');
  const slidesRels = ppt.folder('slides/_rels');
  jpegs.forEach((jpg, i) => {
    const num = i + 1;
    media.file(`image${num}.jpeg`, jpg);
    slidesDir.file(`slide${num}.xml`, slideXml(cx, cy, `Slide ${num}`));
    slidesRels.file(
      `slide${num}.xml.rels`,
      relsXml([
        { id: 'rId1', type: `${REL_OFFICE}/image`, target: `../media/image${num}.jpeg` },
        { id: 'rId2', type: `${REL_OFFICE}/slideLayout`, target: '../slideLayouts/slideLayout1.xml' },
      ])
    );
  });

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    compression: 'DEFLATE',
  });
}

/**
 * Native OOXML PPTX from a React deck (editable objects).
 */
export async function packPptxFromDeck(JSZip, deck) {
  const slides = deck?.slides || [];
  if (!slides.length) throw new Error('No slides');
  const W = deck.canvasW || DEFAULT_CANVAS_W;
  const H = deck.canvasH || DEFAULT_CANVAS_H;
  const { cx, cy } = slideEmu(W, H);
  const zip = new JSZip();
  const built = [];
  const mediaSeq = { n: 0 };
  const extraExts = new Set(['jpeg']);
  for (const slide of slides) {
    const part = buildNativeSlide(slide, { canvasW: W, canvasH: H, cx, cy }, mediaSeq);
    part.media.forEach((m) => extraExts.add(m.ext));
    built.push(part);
  }
  const ppt = writePptxShell(zip, built.length, cx, cy, deck.title, [...extraExts]);
  const media = ppt.folder('media');
  const slidesDir = ppt.folder('slides');
  const slidesRels = ppt.folder('slides/_rels');
  built.forEach((part, i) => {
    const num = i + 1;
    part.media.forEach((m) => media.file(m.name, m.bytes));
    slidesDir.file(`slide${num}.xml`, part.xml);
    slidesRels.file(`slide${num}.xml.rels`, relsXml(part.rels));
  });
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    compression: 'DEFLATE',
  });
}

/**
 * @param {{ slides, canvasW, canvasH, title }} opts
 */
export async function exportAllSlidesPptx(opts = {}) {
  const { title } = opts;
  const JSZip = await ensureJSZip();
  await ensureIcons().catch(() => {});
  const prepared = await prepareDeckForHtmlExport({
    title,
    slides: opts.slides || [],
    canvasW: opts.canvasW,
    canvasH: opts.canvasH,
  });
  const blob = await packPptxFromDeck(JSZip, prepared);
  downloadBlob(blob, (title || 'slides') + '.pptx');
  return (prepared.slides || []).length;
}
