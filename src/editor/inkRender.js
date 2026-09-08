/** Ink stroke render helpers — rich brush/neon/marker via inkBrush.js */

export { inkStrokeSvgMarkupRich as inkStrokeSvgMarkup } from './inkBrush.js';
export { isBrushFamily, PEN_SIZES, MARKER_SIZES, ERASER_SIZES } from './inkBrush.js';

/** @deprecated simple opacity helper kept for thumbs/fallback */
export function inkStrokeOpacity(st) {
  if (!st) return 1;
  if (st.opacity != null) return Math.max(0, Math.min(1, +st.opacity));
  if (st.tool === 'marker') return 0.4;
  return 1;
}

/** Legacy layered neon paths — prefer inkStrokeSvgMarkup / neonRaster. */
export function inkNeonLayers(st) {
  if (!st || !st.d) return [];
  const color = st.color || '#22d3ee';
  const w = Math.max(2, st.width || 6);
  const bright = Math.max(0.4, Math.min(2.5, st.neonBright != null ? +st.neonBright / 50 : 1.2));
  const soft = Math.min(0.55, 0.22 * bright);
  const mid = Math.min(0.75, 0.4 * bright);
  return [
    { d: st.d, stroke: color, strokeWidth: w * (2.8 + bright * 0.6), opacity: soft * 0.85 },
    { d: st.d, stroke: color, strokeWidth: w * (1.5 + bright * 0.25), opacity: mid },
    { d: st.d, stroke: color, strokeWidth: w * 0.85, opacity: Math.min(1, 0.7 + bright * 0.15) },
    { d: st.d, stroke: '#ffffff', strokeWidth: Math.max(1, w * 0.28), opacity: Math.min(0.95, 0.35 + bright * 0.2) },
  ];
}
