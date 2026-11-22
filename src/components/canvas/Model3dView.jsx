import React, { useEffect, useRef } from 'react';
import { mountModel3dViewer } from '../../editor/model3d.js';

/**
 * Live WebGL OBJ viewer for canvas / preview.
 * Remounts when geometry identity OR slide changes — returning to a slide must
 * rebuild the GL context (switching away tears it down).
 */
export default function Model3dView({ el, interactive = false, slideKey = 0 }) {
  const hostRef = useRef(null);
  const elRef = useRef(el);
  elRef.current = el;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !el) return undefined;
    // Mount immediately — waiting for clientWidth caused a permanent blank host
    // when layout reported 0 during slide transitions. resize() inside the viewer
    // picks up real dimensions on the first RAF.
    return mountModel3dViewer(host, elRef.current || el, {
      interactive: !!interactive,
      getEl: () => elRef.current || el,
    });
  }, [el?.id, el?.objText, interactive, slideKey]);

  return (
    <div
      ref={hostRef}
      className={interactive ? 'react-model3d-interactive' : undefined}
      data-model3d-viewer={interactive ? '1' : undefined}
      style={{
        width: '100%',
        height: '100%',
        pointerEvents: interactive ? 'auto' : 'none',
        touchAction: interactive ? 'none' : undefined,
      }}
    />
  );
}
