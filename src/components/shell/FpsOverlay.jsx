import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUiStore } from '../../stores/uiStore';

/**
 * Top-right FPS readout for editor + slideshow (incl. fullscreen).
 * Off by default — toggle in Config → Interface.
 */
export default function FpsOverlay() {
  const enabled = useUiStore((s) => s.fpsEnabled);
  const [fps, setFps] = useState(0);
  const [host, setHost] = useState(() =>
    typeof document !== 'undefined' ? document.body : null
  );

  useEffect(() => {
    const syncHost = () => {
      setHost(document.fullscreenElement || document.body);
    };
    document.addEventListener('fullscreenchange', syncHost);
    document.addEventListener('webkitfullscreenchange', syncHost);
    syncHost();
    return () => {
      document.removeEventListener('fullscreenchange', syncHost);
      document.removeEventListener('webkitfullscreenchange', syncHost);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now) => {
      frames += 1;
      const elapsed = now - last;
      if (elapsed >= 400) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  if (!enabled || !host) return null;

  return createPortal(
    <div className="react-fps-overlay" aria-hidden="true">
      {fps}
    </div>,
    host
  );
}
