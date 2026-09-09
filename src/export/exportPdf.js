/** PDF export: JPEG pages → PDF-1.4 (no external libs). */

import { captureStageCanvas } from './exportPng.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from '../editor/canvasDims.js';
import { waitFrame, downloadBlob } from './exportDom.js';

export function canvasToJpegBytes(cnv, quality = 0.92) {
  return new Promise((resolve, reject) => {
    try {
      cnv.toBlob(
        (b) => {
          if (!b) {
            reject(new Error('JPEG toBlob failed'));
            return;
          }
          b.arrayBuffer().then((ab) => resolve(new Uint8Array(ab))).catch(reject);
        },
        'image/jpeg',
        quality
      );
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Visit each slide and capture as JPEG bytes.
 * @returns {Promise<{ jpegs: Uint8Array[], W: number, H: number }>}
 */
export async function captureSlidesAsJpegs(opts = {}) {
  const { slides, canvasW, canvasH, setCur, cur, quality } = opts;
  if (!slides?.length) throw new Error('No slides');
  const W = Math.max(1, Math.round(canvasW || DEFAULT_CANVAS_W));
  const H = Math.max(1, Math.round(canvasH || DEFAULT_CANVAS_H));
  const prev = cur | 0;
  const jpegs = [];
  try {
    for (let i = 0; i < slides.length; i++) {
      setCur(i);
      await waitFrame();
      await waitFrame();
      const cnv = await captureStageCanvas(W, H);
      jpegs.push(await canvasToJpegBytes(cnv, quality != null ? quality : 0.92));
    }
  } finally {
    setCur(prev);
    await waitFrame();
  }
  return { jpegs, W, H };
}

/** Port of legacy `_buildPdfFromJpegs` (PDF-1.4 + DCTDecode). */
export function buildPdfFromJpegs(jpegPages, pageW, pageH) {
  const enc = new TextEncoder();
  const chunks = [];
  let byteLen = 0;
  function pushStr(s) {
    const b = enc.encode(s);
    chunks.push(b);
    byteLen += b.length;
  }
  function pushBin(b) {
    chunks.push(b);
    byteLen += b.length;
  }
  pushStr('%PDF-1.4\n');
  const offsets = [0];
  const n = jpegPages.length;
  function startObj(id) {
    offsets[id] = byteLen;
    pushStr(id + ' 0 obj\n');
  }
  function endObj() {
    pushStr('endobj\n');
  }
  startObj(1);
  pushStr('<< /Type /Catalog /Pages 2 0 R >>\n');
  endObj();
  startObj(2);
  const kids = [];
  for (let i = 0; i < n; i++) kids.push(3 + i * 3 + ' 0 R');
  pushStr('<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>\n');
  endObj();
  for (let i = 0; i < n; i++) {
    const pObj = 3 + i * 3;
    const cObj = pObj + 1;
    const iObj = pObj + 2;
    const img = jpegPages[i];
    const content = 'q ' + pageW + ' 0 0 ' + pageH + ' 0 0 cm /Im0 Do Q';
    startObj(pObj);
    pushStr(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' +
        pageW +
        ' ' +
        pageH +
        '] /Resources << /XObject << /Im0 ' +
        iObj +
        ' 0 R >> >> /Contents ' +
        cObj +
        ' 0 R >>\n'
    );
    endObj();
    startObj(cObj);
    pushStr('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\n');
    endObj();
    startObj(iObj);
    pushStr(
      '<< /Type /XObject /Subtype /Image /Width ' +
        pageW +
        ' /Height ' +
        pageH +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
        img.length +
        ' >>\nstream\n'
    );
    pushBin(img);
    pushStr('\nendstream\n');
    endObj();
  }
  const objCount = 2 + n * 3;
  const xrefPos = byteLen;
  pushStr('xref\n0 ' + (objCount + 1) + '\n');
  pushStr('0000000000 65535 f \n');
  for (let i = 1; i <= objCount; i++) {
    pushStr(String(offsets[i] || 0).padStart(10, '0') + ' 00000 n \n');
  }
  pushStr('trailer\n<< /Size ' + (objCount + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF');
  const out = new Uint8Array(byteLen);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/**
 * Capture all slides as JPEG → single PDF download.
 * @param {{ slides, canvasW, canvasH, setCur, cur, title, quality? }} opts
 */
export async function exportAllSlidesPdf(opts = {}) {
  const { title } = opts;
  const { jpegs, W, H } = await captureSlidesAsJpegs(opts);
  const pdf = buildPdfFromJpegs(jpegs, W, H);
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), (title || 'slides') + '.pdf');
  return jpegs.length;
}
