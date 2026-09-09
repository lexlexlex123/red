import React, { useEffect, useState } from 'react';
import { buildIconSVG } from '../../editor/iconSvg.js';
import { iconHasAnim, iconFramePath, iconStaticPath } from '../../editor/iconAnim.js';

/**
 * Renders a library icon SVG. `play`:
 * - `'off'` — static base path
 * - `'hover'` — cycle frames while `hovering`
 * - `'loop'` — cycle frames continuously (canvas / preview)
 */
export default function AnimatedIcon({
  ic,
  color = '#6366f1',
  sw = 1.8,
  fillOp = 1,
  play = 'off',
  hovering = false,
  className,
  style,
}) {
  const has = iconHasAnim(ic);
  const looping = has && (play === 'loop' || (play === 'hover' && hovering));
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!looping || !ic?.anim?.frames?.length) {
      setIdx(0);
      return undefined;
    }
    const n = ic.anim.frames.length;
    const iv = ic.anim.interval || 500;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), iv);
    return () => clearInterval(t);
  }, [looping, ic]);

  let pathOv = null;
  if (has) {
    pathOv = looping ? iconFramePath(ic, idx) : iconStaticPath(ic, false);
  }
  const html = buildIconSVG(ic, color, sw, fillOp, pathOv);
  return (
    <div
      className={className}
      style={{ width: '100%', height: '100%', pointerEvents: 'none', ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
