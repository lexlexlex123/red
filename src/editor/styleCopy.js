/** Copy / paste visual styles between elements (slim format painter). */
import { parseShapeTextCss, withShapeTextColor, withShapeTextProp } from './shapeText.js';
import { applyFontFamily, DEFAULT_TEXT_FONT_FAMILY, parseFontFamily } from './fonts.js';

const SHAPE_KEYS = [
  'fill',
  'stroke',
  'sw',
  'rx',
  'fillOp',
  'fillPattern',
  'elOpacity',
  'shadow',
  'shadowBlur',
  'shadowSize',
  'shadowColor',
  'shadowColorScheme',
  'shadowInset',
  'strokeStyle',
  'fillGrad',
  'fillGradScheme',
  'fillGrad2',
  'fillGrad2Scheme',
  'fillGradDir',
  'fillScheme',
  'fillImg',
  'fillImgName',
  'fillImgLink',
  'fillImgShow',
  'fillImgKey',
  'fillImgX',
  'fillImgY',
  'fillImgW',
  'fillImgH',
  'fillImgRot',
  'strokeScheme',
  'polySides',
  'starRays',
  'starInner',
  'trapTop',
  'trapBot',
  'paraSkew',
  'chevSkew',
  'chevInner',
  'arrowHead',
  'moonPhase',
  'ringInner',
  'gearTeeth',
  'gearDepth',
  'shapeFlipH',
  'shapeFlipV',
  'lineFromMarker',
  'lineToMarker',
  'lineMark',
  'shapeBlur',
  'shapeHtml',
  'shapeTextCss',
  'textColor',
  'textColorScheme',
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
  'textBorderColorScheme',
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
  'shadowColorScheme',
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
  'shadowColorScheme',
  'iconColorScheme',
  'shapeFlipH',
  'shapeFlipV',
];

const IMAGE_KEYS = [
  'imgFit',
  'imgRx',
  'imgBw',
  'imgBc',
  'imgBcScheme',
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
  'imgShadowColorScheme',
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

function mapShapeToText(p, target) {
  const out = {};
  if (p.fillGrad && p.fillGrad2) {
    out.textBg = p.fillGrad;
    out.textBgScheme = p.fillGradScheme ?? null;
    out.textBgGrad = true;
    out.textBgCol2 = p.fillGrad2;
    out.textBgCol2Scheme = p.fillGrad2Scheme ?? null;
    out.textBgDir = p.fillGradDir ?? 0;
  } else if (p.fill !== undefined) {
    out.textBg = p.fill === 'none' ? '' : p.fill;
    out.textBgScheme = p.fillScheme ?? null;
    out.textBgGrad = false;
    out.textBgCol2 = '';
    out.textBgCol2Scheme = null;
  }
  if (p.fillOp !== undefined) out.textBgOp = p.fillOp;
  if (p.stroke !== undefined) out.textBorderColor = p.stroke;
  if (p.strokeScheme !== undefined) out.textBorderColorScheme = p.strokeScheme;
  if (p.sw !== undefined) out.textBorderW = p.sw;
  if (p.strokeStyle !== undefined) out.textBorderStyle = p.strokeStyle;
  const inlineColors = [...String(p.shapeHtml || '').matchAll(/\bstyle\s*=\s*["']([^"']*)["']/gi)]
    .map(([, style]) => style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)?.[1]?.trim())
    .filter(Boolean);
  const inlineColor = inlineColors.at(-1);
  const labelColor = inlineColor || (p.shapeTextCss ? parseShapeTextCss(p.shapeTextCss).color : null) || p.textColor;
  if (labelColor) {
    out.textColor = labelColor;
    out.textColorScheme = inlineColor ? null : p.textColorScheme ?? null;
  }
  const inlineFamilies = [...String(p.shapeHtml || '').matchAll(/\bstyle\s*=\s*["']([^"']*)["']/gi)]
    .map(([, style]) => style.match(/(?:^|;)\s*font-family\s*:\s*([^;]+)/i)?.[1]?.trim())
    .filter(Boolean);
  const family = inlineFamilies.at(-1) || parseShapeTextCss(p.shapeTextCss).fontFamily;
  if (family) out.cs = applyFontFamily(target.cs, family);
  return out;
}

function mapTextToShape(p, target) {
  const out = {};
  if (p.textBg !== undefined && p.textBg !== '') {
    out.fill = p.textBg;
    out.fillScheme = p.textBgScheme ?? null;
  }
  if (p.textBgGrad && p.textBgCol2) {
    out.fillGrad = p.textBg;
    out.fillGradScheme = p.textBgScheme ?? null;
    out.fillGrad2 = p.textBgCol2;
    out.fillGrad2Scheme = p.textBgCol2Scheme ?? null;
    out.fillGradDir = p.textBgDir ?? 0;
  } else if (p.textBg !== undefined) {
    out.fill = p.textBg || 'none';
    out.fillScheme = p.textBgScheme ?? null;
    out.fillGrad = null;
    out.fillGradScheme = null;
    out.fillGrad2 = null;
    out.fillGrad2Scheme = null;
  }
  if (p.textBgOp !== undefined) out.fillOp = p.textBgOp;
  if (p.textBorderColor !== undefined) out.stroke = p.textBorderColor;
  if (p.textBorderColorScheme !== undefined) out.strokeScheme = p.textBorderColorScheme;
  if (p.textBorderW !== undefined) out.sw = p.textBorderW;
  if (p.textBorderStyle !== undefined) out.strokeStyle = p.textBorderStyle;
  if (p.textColor !== undefined) out.shapeTextCss = withShapeTextColor(target.shapeTextCss, p.textColor);
  const family = parseFontFamily(p.cs) || DEFAULT_TEXT_FONT_FAMILY;
  if (family) {
    out.shapeTextCss = withShapeTextProp(out.shapeTextCss || target.shapeTextCss, 'font-family', family);
  }
  return out;
}

/**
 * Map captured style onto a target element, preserving semantic roles across types.
 * @returns {object|null} patch to apply
 */
export function stylePatchForTarget(captured, target) {
  if (!captured?.patch || !target || target._isDecor) return null;
  const srcT = captured.type;
  const dstT = target.type;

  if (srcT === dstT) {
    return { ...captured.patch };
  }

  const p = captured.patch;
  let mapped = {};
  if (srcT === 'shape' && dstT === 'text') {
    mapped = mapShapeToText(p, target);
  } else if (srcT === 'text' && dstT === 'shape') {
    mapped = mapTextToShape(p, target);
  } else if (srcT === 'shape' && dstT === 'image') {
    if (p.stroke !== undefined) mapped.imgBc = p.stroke;
    if (p.strokeScheme !== undefined) mapped.imgBcScheme = p.strokeScheme;
    if (p.sw !== undefined) mapped.imgBw = p.sw;
  } else if (srcT === 'image' && dstT === 'shape') {
    if (p.imgBc !== undefined) mapped.stroke = p.imgBc;
    if (p.imgBcScheme !== undefined) mapped.strokeScheme = p.imgBcScheme;
    if (p.imgBw !== undefined) mapped.sw = p.imgBw;
  } else if (srcT === 'shape' && (dstT === 'icon' || dstT === 'formula')) {
    const color = p.fill && p.fill !== 'none' ? p.fill : p.stroke;
    const scheme = p.fill && p.fill !== 'none' ? p.fillScheme : p.strokeScheme;
    if (color !== undefined) {
      if (dstT === 'icon') Object.assign(mapped, { iconColor: color, iconColorScheme: scheme ?? null });
      else Object.assign(mapped, { formulaColor: color, formulaColorScheme: scheme ?? null, textColor: color });
    }
  } else if ((srcT === 'text' || srcT === 'icon' || srcT === 'formula') && dstT === 'icon') {
    const color = srcT === 'text' ? p.textColor : srcT === 'icon' ? p.iconColor : p.formulaColor || p.textColor;
    const scheme = srcT === 'text' ? p.textColorScheme : srcT === 'icon' ? p.iconColorScheme : p.formulaColorScheme;
    if (color !== undefined) Object.assign(mapped, { iconColor: color, textColor: color, iconColorScheme: scheme ?? null });
  } else if ((srcT === 'icon' || srcT === 'formula') && dstT === 'text') {
    const color = srcT === 'icon' ? p.iconColor : p.formulaColor || p.textColor;
    const scheme = srcT === 'icon' ? p.iconColorScheme : p.formulaColorScheme;
    if (color !== undefined) Object.assign(mapped, { textColor: color, textColorScheme: scheme ?? null });
  } else if ((srcT === 'text' || srcT === 'icon') && dstT === 'formula') {
    const color = srcT === 'text' ? p.textColor : p.iconColor;
    const scheme = srcT === 'text' ? p.textColorScheme : p.iconColorScheme;
    if (color !== undefined) Object.assign(mapped, { formulaColor: color, textColor: color, formulaColorScheme: scheme ?? null });
  } else if (srcT === 'text' && dstT === 'image') {
    if (p.textBorderColor !== undefined) mapped.imgBc = p.textBorderColor;
    if (p.textBorderColorScheme !== undefined) mapped.imgBcScheme = p.textBorderColorScheme;
    if (p.textBorderW !== undefined) mapped.imgBw = p.textBorderW;
  } else if (srcT === 'image' && dstT === 'text') {
    if (p.imgBc !== undefined) mapped.textBorderColor = p.imgBc;
    if (p.imgBcScheme !== undefined) mapped.textBorderColorScheme = p.imgBcScheme;
    if (p.imgBw !== undefined) mapped.textBorderW = p.imgBw;
  } else if ((srcT === 'icon' || srcT === 'formula') && dstT === 'shape') {
    const color = srcT === 'icon' ? p.iconColor : p.formulaColor || p.textColor;
    const scheme = srcT === 'icon' ? p.iconColorScheme : p.formulaColorScheme;
    if (color !== undefined) Object.assign(mapped, { fill: color, fillScheme: scheme ?? null });
  }
  return Object.keys(mapped).length ? mapped : null;
}
