/** PDF export: JPEG pages → PDF-1.4 (no external libs). */

import { captureStageCanvas, slideNeedsHtmlFrameSnapshot } from './exportPng.js';
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
  // Fonts once for the whole deck — not 600ms before every page.
  try {
    if (document.fonts?.ready) {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 600))]);
    }
  } catch (e) {}
  try {
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      setCur(i);
      await waitFrame();
      await waitFrame();
      // Only give HTML frames extra settle time on pages that actually have them.
      if (slideNeedsHtmlFrameSnapshot(slide)) {
        await waitFrame();
        await waitFrame();
      }
      const cnv = await captureStageCanvas(W, H, { slide, skipFonts: true });
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

/**
 * Print all slides — via a generated PDF loaded into a hidden iframe, not window.print()
 * on the app page itself. window.print() would print the whole editor UI (ribbons, panels,
 * everything currently on screen); a browser's built-in PDF viewer inside the iframe prints
 * only the PDF's own pages. Reusing exportAllSlidesPdf's pipeline also gets correct page
 * orientation for free — each page is built at exactly canvasW × canvasH, so a 16:9 deck
 * naturally produces landscape-shaped pages and a 9:16 deck naturally produces
 * portrait-shaped ones, without a manual @page CSS rule to keep in sync with the deck's
 * own aspect ratio.
 * @param {{ slides, canvasW, canvasH, setCur, cur, quality? }} opts
 * @returns {Promise<number>} number of slides printed
 */
export async function printAllSlides(opts = {}) {
  const { jpegs, W, H } = await captureSlidesAsJpegs(opts);
  const pdf = buildPdfFromJpegs(jpegs, W, H);
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = url;
  document.body.appendChild(iframe);
  await new Promise((resolve, reject) => {
    iframe.onload = resolve;
    iframe.onerror = () => reject(new Error('PDF failed to load for printing'));
  });
  // Give the browser's built-in PDF viewer a couple of frames to actually paint the first
  // page before invoking print — printing immediately on 'load' can race the viewer's own
  // render and either print a blank page or silently no-op in some browsers.
  await waitFrame();
  await waitFrame();
  const cleanup = () => {
    try {
      document.body.removeChild(iframe);
    } catch (e) {
      /* already removed */
    }
    URL.revokeObjectURL(url);
  };
  try {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  } catch (e) {
    // Some browsers refuse to script a cross-origin-looking blob PDF viewer — fall back to
    // opening it in a new tab so the person can still print it themselves from there.
    cleanup();
    window.open(url, '_blank');
    return jpegs.length;
  }
  // The print dialog is modal in most browsers, so by the time control returns here the
  // person has already finished with it (printed or cancelled) — but keep a generous
  // fallback timer in case a browser returns control earlier than that.
  setTimeout(cleanup, 60000);
  return jpegs.length;
}
