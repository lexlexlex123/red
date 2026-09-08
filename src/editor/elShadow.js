/** Element drop-shadow helpers (legacy shadow / shadowBlur / shadowSize / shadowColor). */

export function hasElShadow(el) {
  return !!(el && (el.shadow === true || el.shadow === 'true'));
}

/**
 * Combine blur + drop-shadow into a CSS filter string.
 * @returns {string|undefined}
 */
export function elFilterCss(el) {
  if (!el) return undefined;
  const parts = [];
  if (el.blur) parts.push(`blur(${+el.blur || 0}px)`);
  if (hasElShadow(el)) {
    const blur = el.shadowBlur != null ? +el.shadowBlur : 4;
    const size = el.shadowSize != null ? +el.shadowSize : 3;
    const color = el.shadowColor || '#000000';
    parts.push(`drop-shadow(0 ${size}px ${Math.max(0, blur)}px ${color})`);
  }
  return parts.length ? parts.join(' ') : undefined;
}

export function elShadowDefaults() {
  return {
    shadow: false,
    shadowBlur: 4,
    shadowSize: 3,
    shadowColor: '#000000',
  };
}
