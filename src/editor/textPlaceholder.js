/** Layout / insert text placeholders — gray until the user types (v7.1 parity). */

export const TEXT_PH_COLOR = '#888888';

export function textPlainIsBlank(htmlOrNode) {
  let text = '';
  if (htmlOrNode && typeof htmlOrNode === 'object' && 'textContent' in htmlOrNode) {
    text = htmlOrNode.textContent || '';
  } else {
    text = String(htmlOrNode || '').replace(/<[^>]+>/g, '');
  }
  return !text.replace(/[\u200b\u00a0\s]/g, '').length;
}

export function textPlaceholderLabel(el, lang) {
  if (!el) return '';
  if (el.textPlaceholderLabel) return el.textPlaceholderLabel;
  const role = el.textRole || 'body';
  const ru = lang !== 'en';
  if (role === 'heading') return ru ? 'Заголовок' : 'Title';
  return ru ? 'Подзаголовок' : 'Subtitle';
}

export function isLayoutTextPlaceholder(el) {
  return !!(el && el._fromSlideLayout);
}

/** Visible gray markup; ink color stays on textColor / cs for after the user types. */
export function paintTextPlaceholderHtml(label) {
  const ph = TEXT_PH_COLOR;
  const safe = String(label || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<span style="color:${ph}">${safe}</span>`;
}

export function restoreTextPlaceholderPatch(el, lang) {
  const label = textPlaceholderLabel(el, lang);
  return {
    html: paintTextPlaceholderHtml(label),
    text: label,
    textPlaceholder: true,
    textPlaceholderLabel: label,
  };
}
