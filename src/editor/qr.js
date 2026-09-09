/** QR code → image dataURL using libs/qrcode.min.js (QRCodeLib / qrGenerate). */

let loadPromise = null;

function ensureQrLib() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (typeof window.qrGenerate === 'function' || window.QRCodeLib) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-qrcode-lib]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = '/libs/qrcode.min.js';
    s.async = true;
    s.dataset.qrcodeLib = '1';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('QR lib failed to load'));
    document.head.appendChild(s);
  });
  return loadPromise;
}

function matrixFromText(text) {
  if (typeof window.qrGenerate === 'function') {
    try {
      return window.qrGenerate(text);
    } catch (e) {
      return null;
    }
  }
  if (window.QRCodeLib && typeof window.QRCodeLib.create === 'function') {
    try {
      const data = window.QRCodeLib.create(text, { errorCorrectionLevel: 'M' });
      const size = data.modules.size;
      const m = [];
      for (let r = 0; r < size; r++) {
        const row = [];
        for (let c = 0; c < size; c++) row.push(data.modules.get(r, c) ? 1 : 0);
        m.push(row);
      }
      return m;
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Render QR as PNG data URL.
 * @param {string} text
 * @param {string|null} bgColor — null/'transparent' for clear bg
 * @param {string} qrColor
 * @param {number} size
 */
export async function renderQRDataURL(text, bgColor, qrColor, size = 400) {
  await ensureQrLib();
  const t = (text || 'https://example.com').trim() || 'https://example.com';
  const transparent = bgColor === null || bgColor === undefined || bgColor === 'transparent';
  const bg = transparent ? null : bgColor || '#ffffff';
  const fg = qrColor || '#000000';
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!transparent) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  }
  const m = matrixFromText(t);
  if (m && m.length) {
    const pad = Math.round(size * 0.04);
    const inner = size - pad * 2;
    const cell = inner / m.length;
    ctx.fillStyle = fg;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (m[r][c] === 1) {
          ctx.fillRect(pad + Math.round(c * cell), pad + Math.round(r * cell), Math.ceil(cell), Math.ceil(cell));
        }
      }
    }
  } else {
    ctx.fillStyle = fg;
    ctx.font = `bold ${Math.round(size * 0.07)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`QR: ${t.slice(0, 18)}`, size / 2, size / 2);
  }
  return canvas.toDataURL('image/png');
}
