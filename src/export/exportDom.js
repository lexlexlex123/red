/** Tiny DOM helpers shared by PNG / PDF / ODP / PPTX exporters. */

export function waitFrame() {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function canvasToBlob(cnv, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    try {
      cnv.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality);
    } catch (e) {
      reject(e);
    }
  });
}
