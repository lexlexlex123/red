/** Canonical canvas sizes — matches config/canvas.js (1200×675 @ 16:9). */

function cfgCanvas() {
  try {
    const c = typeof window !== 'undefined' ? window.CFG_CANVAS : null;
    if (c && typeof c.width === 'number' && typeof c.height === 'number') {
      return {
        w: Math.round(c.width),
        h: Math.round(c.height),
        ar: c.aspectRatio === '9:16' ? '9:16' : '16:9',
      };
    }
  } catch (e) {}
  return null;
}

const _cfg = cfgCanvas();

export const CANVAS_AR_PRESETS = {
  '16:9': { w: _cfg?.ar === '16:9' ? _cfg.w : 1200, h: _cfg?.ar === '16:9' ? _cfg.h : 675, ar: '16:9' },
  '9:16': { w: _cfg?.ar === '9:16' ? _cfg.w : 675, h: _cfg?.ar === '9:16' ? _cfg.h : 1200, ar: '9:16' },
};

export const DEFAULT_CANVAS_W = CANVAS_AR_PRESETS['16:9'].w;
export const DEFAULT_CANVAS_H = CANVAS_AR_PRESETS['16:9'].h;
export const DEFAULT_AR = '16:9';

/** Other common sizes still recognized for AR matching. */
const LEGACY_AR_SIZES = {
  '16:9': [
    [1200, 675],
    [1920, 1080],
  ],
  '9:16': [
    [675, 1200],
    [1080, 1920],
  ],
};

export function canvasArDims(ar) {
  if (ar === '9:16') return { ...CANVAS_AR_PRESETS['9:16'] };
  return { ...CANVAS_AR_PRESETS['16:9'] };
}

/** Resolve which preset matches current size / ar flag (incl. Full HD sizes). */
export function matchCanvasAr(w, h, ar) {
  const W = Math.round(+w || 0);
  const H = Math.round(+h || 0);
  if (ar === '9:16' || LEGACY_AR_SIZES['9:16'].some(([a, b]) => a === W && b === H)) return '9:16';
  if (ar === '16:9' || LEGACY_AR_SIZES['16:9'].some(([a, b]) => a === W && b === H)) return '16:9';
  return 'custom';
}
