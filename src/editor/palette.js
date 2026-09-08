import { getGalleryShapes } from '../shared/shapesCatalog.js';

export const PALETTE = [
  ['#000000', '#262626', '#404040', '#595959', '#737373', '#8c8c8c', '#a6a6a6', '#bfbfbf', '#d9d9d9', '#f2f2f2', '#ffffff'],
  ['#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0', '#843c0c'],
  ['#ff99cc', '#ffcc99', '#ffff99', '#ccffcc', '#ccffff', '#99ccff', '#cc99ff', '#ff99ff', '#ff6600', '#0099cc', '#339933'],
  ['#4472c4', '#ed7d31', '#a9d18e', '#ffc000', '#5b9bd5', '#70ad47', '#ff0000', '#ff7f50', '#6495ed', '#dc143c', '#00ced1'],
  ['#2e75b6', '#c55a11', '#70ad47', '#d4a017', '#2f5496', '#548235', '#c00000', '#ff0000', '#ffc000', '#00b050', '#0070c0'],
];

/** Full shape gallery (legacy SHAPES minus hidden extras). */
export const SHAPE_PRESETS = getGalleryShapes().map((s) => ({
  id: s.id,
  name: s.name,
  nameEn: s.nameEn || s.name,
  noFill: !!s.noFill,
}));
