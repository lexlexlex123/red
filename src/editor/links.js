/** Link helpers — from js/25-links.js / 08-slides.js */

export function linkTypeFromHref(link) {
  if (!link) return 'url';
  if (link === '#slide-next') return 'slide-next';
  if (link === '#slide-prev') return 'slide-prev';
  if (link === '#slide-first') return 'slide-first';
  if (link === '#slide-last') return 'slide-last';
  if (String(link).startsWith('#slide-')) return 'slide';
  return 'url';
}

export function slideDisplayTitle(slide, i) {
  const t = (slide?.title || slide?.name || '').trim();
  return t || `Slide ${i + 1}`;
}

export function slideLinkHrefForIndex(i, slides) {
  const s = slides?.[i];
  const title = (s?.title || s?.name || '').trim();
  if (title) return `#slide-${encodeURIComponent(title)}`;
  return `#slide-${i + 1}`;
}

export function resolveSlideLinkIndex(link, curIdx, slides) {
  if (!link || !String(link).startsWith('#slide-')) return null;
  const count = slides?.length || 0;
  if (!count) return null;
  const idx = Math.max(0, Math.min(+curIdx || 0, count - 1));
  const spec = String(link).slice(7);
  if (spec === 'next') return Math.min(idx + 1, count - 1);
  if (spec === 'prev') return Math.max(idx - 1, 0);
  if (spec === 'first') return 0;
  if (spec === 'last') return count - 1;
  const n = parseInt(spec, 10);
  if (!Number.isNaN(n) && String(n) === spec && n >= 1 && n <= count) return n - 1;
  let name = spec;
  try {
    name = decodeURIComponent(spec);
  } catch (e) {}
  const norm = (name || '').trim().toLowerCase();
  for (let i = 0; i < count; i++) {
    if (slideDisplayTitle(slides[i], i).trim().toLowerCase() === norm) return i;
  }
  return null;
}

export function readGroupLink(el, els, key = 'link') {
  if (!el) return key === 'linkt' ? '_blank' : '';
  if (el[key]) return el[key];
  if (!el.groupId) return key === 'linkt' ? '_blank' : '';
  const mate = (els || []).find((e) => e && e.groupId === el.groupId && e[key]);
  if (mate) return mate[key];
  return key === 'linkt' ? '_blank' : '';
}

export const LINK_TYPE_OPTIONS = [
  { id: 'url', labelRu: 'URL', labelEn: 'URL' },
  { id: 'slide', labelRu: 'Слайд', labelEn: 'Slide' },
  { id: 'slide-next', labelRu: 'Следующий', labelEn: 'Next' },
  { id: 'slide-prev', labelRu: 'Предыдущий', labelEn: 'Previous' },
  { id: 'slide-first', labelRu: 'Первый', labelEn: 'First' },
  { id: 'slide-last', labelRu: 'Последний', labelEn: 'Last' },
];

export const SLIDE_NAV_LINKS = {
  'slide-next': '#slide-next',
  'slide-prev': '#slide-prev',
  'slide-first': '#slide-first',
  'slide-last': '#slide-last',
};
