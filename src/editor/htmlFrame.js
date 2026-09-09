/** HTML frame helpers — from js/35-htmlframe.js subset. */

export function isHttpUrl(src) {
  return /^https?:\/\//i.test(String(src || '').trim());
}

export function looksLikeHtmlDocument(text) {
  const t = String(text || '').trim();
  if (t.length < 40) return false;
  if (/^<!DOCTYPE\s+html\b/i.test(t)) return true;
  if (/^<html[\s>]/i.test(t)) return true;
  if (/<html[\s>]/i.test(t) && /<\/html\s*>/i.test(t)) return true;
  if (/<html[\s>]/i.test(t) && /<body[\s>]/i.test(t)) return true;
  return false;
}

/** Check if text contains HTML tags (broader than looksLikeHtmlDocument). */
export function containsHtmlTags(text) {
  const t = String(text || '').trim();
  if (t.length < 10) return false;
  // Closing tags — strongest signal
  if (/<\/[a-zA-Z][a-zA-Z0-9]*[^>]*>/.test(t)) return true;
  // Common block-level HTML elements (opening tags)
  if (/<(div|p|h[1-6]|span|ul|ol|li|table|tr|td|th|form|section|article|header|footer|nav|main|aside|blockquote|pre|figure|figcaption|details|summary|dl|dt|dd)[\s>]/i.test(t)) return true;
  // Self-closing elements
  if (/<(br|hr|img|input|meta|link|source|area|col|embed|wbr)[\s/>]/i.test(t)) return true;
  return false;
}

export function buildHfSrcdoc(src) {
  const s = String(src || '');
  const hasDoc = /<!doctype/i.test(s) || /<html/i.test(s);
  if (hasDoc) return s;
  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<style>body{margin:0;padding:8px;box-sizing:border-box;font-family:system-ui,sans-serif;}</style>' +
    '</head><body>' +
    s +
    '</body></html>'
  );
}

export function hfTitleFromSrc(src) {
  const s = String(src || '').trim();
  if (!s) return 'New Tab';
  if (isHttpUrl(s)) {
    try {
      return s.replace(/^https?:\/\//i, '').split('/')[0].slice(0, 40) || 'New Tab';
    } catch (e) {
      return 'New Tab';
    }
  }
  const tm = s.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (tm && tm[1].trim()) return tm[1].trim().slice(0, 40);
  return 'HTML';
}

export const HF_SANDBOX =
  'allow-scripts allow-forms allow-popups allow-presentation allow-top-navigation-by-user-activation';
