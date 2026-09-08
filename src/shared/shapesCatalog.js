/**
 * Shape gallery catalog (ported from legacy js/01-state.js SHAPES).
 * Paths use viewBox 0 0 100 100.
 */

export const SHAPE_GALLERY_HIDDEN = new Set([
  'triangle',
  'calloutRound',
  'cylinder',
  'cube',
  'brace',
  'plus',
  'badge',
  'arc',
  'wave',
]);

/** @type {Array<{id:string,name:string,nameEn?:string,path?:string|null,special?:string,noFill?:boolean}>} */
export const SHAPES = [
  { id: 'rect', name: 'Прямоугольник', nameEn: 'Rectangle', path: null, special: 'rect' },
  { id: 'ellipse', name: 'Эллипс', nameEn: 'Ellipse', path: null, special: 'ellipse' },
  { id: 'polygon', name: 'Многоугольник', nameEn: 'Polygon', path: null, special: 'polygon' },
  { id: 'triangle', name: 'Треугольник', nameEn: 'Triangle', path: null, special: 'triangle' },
  { id: 'star', name: 'Звезда', nameEn: 'Star', path: null, special: 'star' },
  {
    id: 'heart',
    name: 'Сердце',
    nameEn: 'Heart',
    path: 'M 50 85 C 10 60 5 30 20 20 C 32 12 45 18 50 28 C 55 18 68 12 80 20 C 95 30 90 60 50 85 Z',
  },
  {
    id: 'arrow',
    name: 'Стрелка →',
    nameEn: 'Arrow →',
    path: 'M 5 35 L 60 35 L 60 15 L 95 50 L 60 85 L 60 65 L 5 65 Z',
  },
  {
    id: 'arrowLeft',
    name: 'Стрелка ←',
    nameEn: 'Arrow ←',
    path: 'M 95 35 L 40 35 L 40 15 L 5 50 L 40 85 L 40 65 L 95 65 Z',
  },
  {
    id: 'arrowUp',
    name: 'Стрелка ↑',
    nameEn: 'Arrow ↑',
    path: 'M 35 95 L 35 40 L 15 40 L 50 5 L 85 40 L 65 40 L 65 95 Z',
  },
  {
    id: 'arrowDown',
    name: 'Стрелка ↓',
    nameEn: 'Arrow ↓',
    path: 'M 35 5 L 35 60 L 15 60 L 50 95 L 85 60 L 65 60 L 65 5 Z',
  },
  {
    id: 'arrowDouble',
    name: 'Стрелка ↔',
    nameEn: 'Arrow ↔',
    path: 'M 5 50 L 30 20 L 30 37 L 70 37 L 70 20 L 95 50 L 70 80 L 70 63 L 30 63 L 30 80 Z',
  },
  {
    id: 'cross',
    name: 'Крест',
    nameEn: 'Cross',
    path: 'M 35 5 L 65 5 L 65 35 L 95 35 L 95 65 L 65 65 L 65 95 L 35 95 L 35 65 L 5 65 L 5 35 L 35 35 Z',
  },
  { id: 'parallelogram', name: 'Параллелогр.', nameEn: 'Parallelogram', path: null, special: 'parallelogram' },
  { id: 'cloud', name: 'Облако', nameEn: 'Cloud', path: null, special: 'cloud' },
  { id: 'chevron', name: 'Шеврон →', nameEn: 'Chevron →', path: null, special: 'chevron' },
  { id: 'chevronLeft', name: 'Шеврон ←', nameEn: 'Chevron ←', path: null, special: 'chevron' },
  { id: 'callout', name: 'Выноска', nameEn: 'Callout', path: null, special: 'callout' },
  { id: 'calloutRound', name: 'Выноска О', nameEn: 'Round callout', path: null, special: 'callout' },
  { id: 'trapezoid', name: 'Трапеция', nameEn: 'Trapezoid', path: null, special: 'trapezoid' },
  {
    id: 'cylinder',
    name: 'Цилиндр',
    nameEn: 'Cylinder',
    path: 'M 5 20 Q 5 5 50 5 Q 95 5 95 20 L 95 80 Q 95 95 50 95 Q 5 95 5 80 Z',
  },
  {
    id: 'cube',
    name: 'Куб',
    nameEn: 'Cube',
    path: 'M 25 5 L 95 5 L 95 70 L 25 70 Z M 25 5 L 5 25 L 5 90 L 25 70 Z M 5 90 L 75 90 L 95 70',
  },
  {
    id: 'brace',
    name: 'Скобка',
    nameEn: 'Brace',
    path: 'M 70 5 Q 50 5 50 25 L 50 42 Q 50 50 35 50 Q 50 50 50 58 L 50 75 Q 50 95 70 95',
    noFill: true,
  },
  { id: 'arc', name: 'Дуга', nameEn: 'Arc', path: 'M 5 95 Q 5 5 95 5', noFill: true },
  { id: 'line', name: 'Линия', nameEn: 'Line', path: 'M 5 50 L 95 50', noFill: true },
  {
    id: 'wave',
    name: 'Волна',
    nameEn: 'Wave',
    path: 'M 5 60 C 20 20 35 80 50 50 C 65 20 80 80 95 40',
    noFill: true,
  },
  { id: 'curve', name: 'Кривая', nameEn: 'Curve', path: null, special: 'curve', noFill: true },
  {
    id: 'plus',
    name: 'Плюс',
    nameEn: 'Plus',
    path: 'M 35 5 L 65 5 L 65 35 L 95 35 L 95 65 L 65 65 L 65 95 L 35 95 L 35 65 L 5 65 L 5 35 L 35 35 Z',
  },
  {
    id: 'ribbon',
    name: 'Лента',
    nameEn: 'Ribbon',
    path: 'M 5 30 L 20 5 L 80 5 L 95 30 L 80 55 L 60 55 L 50 70 L 40 55 L 20 55 Z',
  },
  {
    id: 'shield',
    name: 'Щит',
    nameEn: 'Shield',
    path: 'M 50 5 L 90 20 L 90 55 Q 90 80 50 95 Q 10 80 10 55 L 10 20 Z',
  },
  {
    id: 'badge',
    name: 'Значок',
    nameEn: 'Badge',
    path: 'M 50 5 L 63 15 L 80 12 L 85 28 L 95 38 L 88 55 L 95 70 L 83 80 L 80 95 L 63 90 L 50 95 L 37 90 L 20 95 L 17 80 L 5 70 L 12 55 L 5 38 L 15 28 L 20 12 L 37 15 Z',
  },
  {
    id: 'funnel',
    name: 'Воронка',
    nameEn: 'Funnel',
    path: 'M 5 5 L 95 5 L 65 50 L 65 90 L 35 90 L 35 50 Z',
  },
  { id: 'gear', name: 'Шестерня', nameEn: 'Gear', path: null, special: 'gear' },
  { id: 'moon', name: 'Луна', nameEn: 'Moon', path: null, special: 'moon' },
  { id: 'noSymbol', name: 'Запрет', nameEn: 'No symbol', path: null, special: 'noSymbol' },
];

export function getGalleryShapes() {
  return SHAPES.filter((s) => !SHAPE_GALLERY_HIDDEN.has(s.id));
}

export function getShapeMeta(id) {
  return SHAPES.find((s) => s.id === id) || null;
}

/** Shapes whose geometry may extend past the element box (need overflow:visible). */
export function shapeNeedsOverflowVisible(shapeId) {
  if (shapeId === 'line') return true;
  const meta = getShapeMeta(shapeId);
  return !!(meta && (meta.special === 'callout' || meta.special === 'curve' || meta.special === 'cloud'));
}

export default { SHAPES, SHAPE_GALLERY_HIDDEN, getGalleryShapes, getShapeMeta, shapeNeedsOverflowVisible };
