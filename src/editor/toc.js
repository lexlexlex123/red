/**
 * Table of contents — React port of js/30b-toc.js (subset).
 */

function plainFromHtml(html) {
  if (typeof document === 'undefined') {
    return String(html || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || '').replace(/\s+/g, ' ').trim();
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Collect chapter entries from slides marked textRole=tocEntry. */
export function collectTocEntries(slides) {
  const entries = [];
  (slides || []).forEach((slide, si) => {
    (slide.els || []).forEach((d) => {
      if (d && d.type === 'text' && d.textRole === 'tocEntry') {
        const title = plainFromHtml(d.html);
        if (title) entries.push({ slide: si, title });
      }
    });
  });
  return entries;
}

export function buildTocHtml(entries, fontSizePx, lang = 'ru') {
  if (!entries.length) {
    return `<div class="toc-empty">${lang === 'en' ? 'No chapters marked' : 'Нет пунктов оглавления'}</div>`;
  }
  const fsAttr = fontSizePx
    ? ` style="font-size:${fontSizePx}px;line-height:1.25;vertical-align:baseline"`
    : '';
  return entries
    .map(
      (e) =>
        `<span data-toc-slide="${e.slide}" class="toc-item"${fsAttr}>${esc(e.title)}</span>`
    )
    .join('<br>');
}

function fontSizeFromCs(cs) {
  const m = String(cs || '').match(/font-size\s*:\s*([\d.]+)px/i);
  return m ? +m[1] : 24;
}

/** Build filled TOC html for a text element. */
export function fillTocHtml(slides, el, lang = 'ru') {
  const entries = collectTocEntries(slides);
  const fs = fontSizeFromCs(el?.cs);
  return { html: buildTocHtml(entries, fs, lang), count: entries.length };
}
