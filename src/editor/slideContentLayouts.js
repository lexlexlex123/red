/** Slide content layouts (PowerPoint-style) — from js/11b-slide-layouts.js */

import { paintTextPlaceholderHtml } from './textPlaceholder.js';
import { resolveSchemeColor } from './themes.js';

export const SLIDE_CONTENT_LAYOUTS = [
  { id: 'blank', nameRu: 'Пустой', nameEn: 'Blank', boxes: [] },
  {
    id: 'title',
    nameRu: 'Титульный',
    nameEn: 'Title slide',
    boxes: [
      { role: 'heading', textRu: 'Заголовок презентации', textEn: 'Presentation title', x: 0.1, y: 0.28, w: 0.8, h: 0.2, fs: 52, align: 'center', weight: 700 },
      { role: 'body', textRu: 'Подзаголовок', textEn: 'Subtitle', x: 0.15, y: 0.52, w: 0.7, h: 0.12, fs: 26, align: 'center', weight: 400, valign: 'middle' },
    ],
  },
  {
    id: 'titleBody',
    nameRu: 'Заголовок и текст',
    nameEn: 'Title and text',
    boxes: [
      { role: 'heading', textRu: 'Заголовок', textEn: 'Title', x: 0.08, y: 0.08, w: 0.84, h: 0.14, fs: 40, align: 'left', weight: 700 },
      { role: 'body', textRu: 'Текст слайда…', textEn: 'Slide text…', x: 0.08, y: 0.28, w: 0.84, h: 0.56, fs: 24, align: 'left', weight: 400 },
    ],
  },
  {
    id: 'titleOnly',
    nameRu: 'Только заголовок',
    nameEn: 'Title only',
    boxes: [
      { role: 'heading', textRu: 'Заголовок', textEn: 'Title', x: 0.08, y: 0.08, w: 0.84, h: 0.16, fs: 40, align: 'left', weight: 700 },
    ],
  },
  {
    id: 'section',
    nameRu: 'Заголовок раздела',
    nameEn: 'Section header',
    boxes: [
      { role: 'heading', textRu: 'Раздел', textEn: 'Section', x: 0.1, y: 0.36, w: 0.8, h: 0.2, fs: 48, align: 'center', weight: 700 },
    ],
  },
  {
    id: 'twoCol',
    nameRu: 'Две колонки',
    nameEn: 'Two columns',
    boxes: [
      { role: 'heading', textRu: 'Заголовок', textEn: 'Title', x: 0.06, y: 0.06, w: 0.88, h: 0.12, fs: 36, align: 'left', weight: 700 },
      { role: 'body', textRu: 'Левая колонка', textEn: 'Left column', x: 0.06, y: 0.24, w: 0.42, h: 0.6, fs: 22, align: 'left', weight: 400 },
      { role: 'body', textRu: 'Правая колонка', textEn: 'Right column', x: 0.52, y: 0.24, w: 0.42, h: 0.6, fs: 22, align: 'left', weight: 400 },
    ],
  },
];

function keepEl(d) {
  if (!d) return false;
  if (d._isDecor) return true;
  if (d.type === 'inkhost' || d.type === 'pagenum' || d.type === 'lineangle') return true;
  return false;
}

/** Default color-scheme positions for freshly-applied layout placeholders (v7.1 parity):
 *  heading → code "15" (col 0, row 4), body/subtitle → code "81" (col 7, row 0). These are
 *  the colors that show once the user starts typing (see textPlaceholder.js — the placeholder
 *  itself stays gray until then). */
const HEADING_SCHEME = { col: 0, row: 4 };
const BODY_SCHEME = { col: 7, row: 0 };

function makeTextEl(box, canvasW, canvasH, lang, theme) {
  const ru = lang !== 'en';
  const raw = ru ? box.textRu : box.textEn;
  const fs = box.fs || 28;
  const weight = box.weight || (box.role === 'heading' ? 700 : 400);
  const align = box.align || 'left';
  const isHeading = box.role === 'heading';
  const scheme = isHeading ? HEADING_SCHEME : BODY_SCHEME;
  const color = resolveSchemeColor(scheme, theme) || (isHeading ? '#ffffff' : '#dddddd');
  return {
    type: 'text',
    x: Math.round(box.x * canvasW),
    y: Math.round(box.y * canvasH),
    w: Math.round(box.w * canvasW),
    h: Math.round(box.h * canvasH),
    html: paintTextPlaceholderHtml(raw),
    cs: `font-size:${fs}px;font-weight:${weight};color:${color};text-align:${align};line-height:1.25;${
      isHeading ? 'text-transform:uppercase;' : ''
    }`,
    rot: 0,
    anims: [],
    textRole: isHeading ? 'heading' : 'body',
    textColor: color,
    textColorScheme: scheme,
    valign: box.valign || (isHeading ? 'middle' : 'top'),
    textPlaceholder: true,
    textPlaceholderLabel: raw,
    _fromSlideLayout: true,
  };
}

/**
 * Apply content layout to a slide. Returns new els array.
 */
export function buildSlideContentLayout(layoutId, slide, canvasW, canvasH, lang, theme) {
  const layout = SLIDE_CONTENT_LAYOUTS.find((l) => l.id === layoutId);
  if (!layout) return slide?.els || [];
  const kept = (slide?.els || []).filter(keepEl);
  const added = (layout.boxes || []).map((box) => makeTextEl(box, canvasW, canvasH, lang, theme));
  return kept.concat(added);
}

export function layoutDisplayName(layout, lang) {
  if (!layout) return '';
  return lang === 'en' ? layout.nameEn : layout.nameRu;
}
