/** URL helpers for paste → QR (from js/02-applets.js). */

export function isPasteableUrl(s) {
  s = String(s || '')
    .trim()
    .replace(/^[<"']+|[>"']+$/g, '')
    .replace(/[.,;:!?)]+$/g, '');
  if (!s || s.length > 2048) return false;
  if (/^https?:\/\//i.test(s)) {
    try {
      // eslint-disable-next-line no-new
      new URL(s);
      return true;
    } catch (e) {
      return /^https?:\/\/\S+$/i.test(s);
    }
  }
  if (/^www\./i.test(s)) return /^www\.\S+$/i.test(s);
  return false;
}

export function normalizePasteUrl(s) {
  s = String(s || '')
    .trim()
    .replace(/^[<"']+|[>"']+$/g, '')
    .replace(/[.,;:!?)]+$/g, '');
  if (/^www\./i.test(s)) return `https://${s}`;
  return s;
}

/** Extract a single pasteable URL from plain text and/or HTML. */
export function extractPasteUrl(plain, html) {
  if (html) {
    try {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const a = tmp.querySelector('a[href]');
      if (a) {
        const href = (a.getAttribute('href') || '').trim();
        if (isPasteableUrl(href)) return normalizePasteUrl(href);
      }
    } catch (e) {}
    const hrefM = String(html).match(/href\s*=\s*["'](https?:\/\/[^"']+)["']/i);
    if (hrefM && isPasteableUrl(hrefM[1])) return normalizePasteUrl(hrefM[1]);
  }
  const plainStr = String(plain || '').trim();
  if (!plainStr) return null;
  if (isPasteableUrl(plainStr)) return normalizePasteUrl(plainStr);
  const httpM = plainStr.match(/https?:\/\/[^\s<>"']+/i);
  if (httpM && isPasteableUrl(httpM[0])) return normalizePasteUrl(httpM[0]);
  const wwwM = plainStr.match(/\bwww\.[^\s<>"']+/i);
  if (wwwM && isPasteableUrl(wwwM[0])) return normalizePasteUrl(wwwM[0]);
  const firstLine = plainStr.split(/\r?\n/)[0].trim();
  if (isPasteableUrl(firstLine)) return normalizePasteUrl(firstLine);
  return null;
}
