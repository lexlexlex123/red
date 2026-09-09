/** Copy / paste visual styles between elements (slim format painter). */

const SHAPE_KEYS = [
  'fill',
  'stroke',
  'sw',
  'rx',
  'fillOp',
  'elOpacity',
  'shadow',
  'shadowBlur',
  'shadowSize',
  'shadowColor',
  'strokeStyle',
  'fillGrad',
  'fillGrad2',
  'fillGradDir',
  'fillScheme',
  'strokeScheme',
  'shadowColorScheme',
  'polySides',
  'starRays',
  'starInner',
  'trapTop',
  'trapBot',
  'paraSkew',
  'chevSkew',
  'moonPhase',
  'gearTeeth',
  'gearDepth',
  'shapeFlipH',
  'shapeFlipV',
  'lineFromMarker',
  'lineToMarker',
  'lineMark',
  'shapeBlur',
];

const TEXT_KEYS = [
  'cs',
  'textColor',
  'textColorScheme',
  'textBg',
  'textBgScheme',
  'textBgOp',
  'textBgBlur',
  'textBgGrad',
  'textBgCol2',
  'textBgCol2Scheme',
  'textBgDir',
  'textBorderW',
  'textBorderColor',
  'textBorderStyle',
  'rx',
  'rx_tl',
  'rx_tr',
  'rx_br',
  'rx_bl',
  'rxUnit',
  'textShadowBlur',
  'textShadowSize',
  'textShadowColor',
  'textShadowW',
  'textBlockShadowBlur',
  'textBlockShadowSize',
  'textBlockShadowColor',
  'textBlockShadowInset',
  'textColorGrad',
  'textColorGrad1',
  'textColorGrad2',
  'textColorGradDir',
  'pad_t',
  'pad_r',
  'pad_b',
  'pad_l',
  'padUnit',
  'valign',
  'textRole',
  'elOpacity',
  'shadow',
  'shadowBlur',
  'shadowSize',
  'shadowColor',
  'bulletIconId',
  'bulletIconColor',
  'bulletIconSw',
  'bulletGap',
];

const ICON_KEYS = [
  'iconColor',
  'iconSw',
  'iconFillOp',
  'textColor',
  'elOpacity',
  'shadow',
  'shadowBlur',
  'shadowSize',
  'shadowColor',
  'iconColorScheme',
  'shapeFlipH',
  'shapeFlipV',
];

const IMAGE_KEYS = [
  'imgFit',
  'imgRx',
  'imgBw',
  'imgBc',
  'imgBorderStyle',
  'imgFrame',
  'imgFlipH',
  'imgFlipV',
  'imgOpacity',
  'elOpacity',
  'imgShadow',
  'imgShadowBlur',
  'imgShadowSize',
  'imgShadowColor',
  'imgAccent',
];

function pickKeys(el, keys) {
  const out = {};
  keys.forEach((k) => {
    if (el[k] !== undefined) out[k] = el[k];
  });
  return out;
}

/**
 * Snapshot of style fields for format painter.
 * @returns {{ type: string, patch: object }|null}
 */
export function captureStyle(el) {
  if (!el || el._isDecor) return null;
  const type = el.type;
  if (type === 'shape') return { type, patch: { ...pickKeys(el, SHAPE_KEYS), hoverFx: el.hoverFx } };
  if (type === 'text') return { type, patch: { ...pickKeys(el, TEXT_KEYS), hoverFx: el.hoverFx } };
  if (type === 'icon') return { type, patch: { ...pickKeys(el, ICON_KEYS), hoverFx: el.hoverFx } };
  if (type === 'image') return { type, patch: { ...pickKeys(el, IMAGE_KEYS), hoverFx: el.hoverFx } };
  if (type === 'formula') {
    return {
      type,
      patch: pickKeys(el, ['formulaColor', 'textColor', 'elOpacity', 'shadow', 'shadowBlur', 'shadowSize', 'shadowColor']),
    };
  }
  return null;
}

/**
 * Map captured style onto a target element (same-type preferred; color cross-type fallback).
 * @returns {object|null} patch to apply
 */
export function stylePatchForTarget(captured, target) {
  if (!captured?.patch || !target || target._isDecor) return null;
  const srcT = captured.type;
  const dstT = target.type;

  if (srcT === dstT) {
    return { ...captured.patch };
  }

  // Cross-type: transfer a primary color only
  let color = null;
  let scheme = null;
  if (srcT === 'shape') {
    color = captured.patch.fill && captured.patch.fill !== 'none' ? captured.patch.fill : captured.patch.stroke;
    scheme = captured.patch.fillScheme || captured.patch.strokeScheme;
  } else if (srcT === 'text') {
    color = captured.patch.textColor;
    scheme = captured.patch.textColorScheme;
  } else if (srcT === 'icon') {
    color = captured.patch.iconColor || captured.patch.textColor;
    scheme = captured.patch.iconColorScheme;
  } else if (srcT === 'formula') {
    color = captured.patch.formulaColor || captured.patch.textColor;
  }
  if (!color) return null;

  if (dstT === 'shape') {
    return { fill: color, fillScheme: scheme || null };
  }
  if (dstT === 'text') {
    return { textColor: color, textColorScheme: scheme || null };
  }
  if (dstT === 'icon') {
    return { iconColor: color, textColor: color, iconColorScheme: scheme || null };
  }
  if (dstT === 'formula') {
    return { formulaColor: color, textColor: color };
  }
  return null;
}
