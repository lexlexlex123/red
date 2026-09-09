import React, { useEffect, useRef } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { versionAttr } from '../../editor/versions.js';
import { APP_ICON_URL } from '../../editor/appBrand.js';

export default function LoadingSplash() {
  const bootDone = useUiStore((s) => s.bootDone);
  const bootProgress = useUiStore((s) => s.bootProgress);
  const bootMsg = useUiStore((s) => s.bootMsg);
  const setBootProgress = useUiStore((s) => s.setBootProgress);
  const creepRef = useRef(0);

  useEffect(() => {
    if (bootDone) return undefined;
    const creep = setInterval(() => {
      const s = useUiStore.getState();
      if (s.bootDone) return;
      if (s.bootProgress < 55) {
        creepRef.current = Math.min(55, creepRef.current + 1.2);
        const next = Math.max(s.bootProgress, creepRef.current);
        if (next > s.bootProgress) setBootProgress(next);
        return;
      }
      const next = Math.min(93, s.bootProgress + 0.4);
      if (next > s.bootProgress) setBootProgress(next, s.bootMsg);
    }, 200);
    return () => clearInterval(creep);
  }, [bootDone, setBootProgress]);

  if (bootDone) return null;

  return (
    <div className="loading-splash" aria-busy="true" aria-live="polite" {...versionAttr('LoadingSplash')}>
      <div className="load-splash">
        <div className="load-logo-wrap">
          <img
            className="load-logo"
            src={APP_ICON_URL}
            alt="Слайды"
          />
        </div>
        <div className="load-bar">
          <div className="load-bar-inner" style={{ width: `${Math.round(bootProgress)}%` }} />
        </div>
        <div className="meta">
          <span>{Math.round(bootProgress)}%</span>
          <span>{bootMsg}</span>
        </div>
      </div>
    </div>
  );
}
