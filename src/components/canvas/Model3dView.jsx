import React, { useEffect, useRef } from 'react';
import { mountModel3dViewer } from '../../editor/model3d.js';

/** Live WebGL OBJ viewer for canvas / preview. */
export default function Model3dView({ el }) {
  const hostRef = useRef(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !el) return undefined;
    return mountModel3dViewer(host, el);
  }, [
    el?.id,
    el?.objText,
    el?.objRotX,
    el?.objRotY,
    el?.objAutoRot,
    el?.objRotSpeed,
    el?.objColor,
    el?.objBg,
    el?.objBgCleared,
    el?.w,
    el?.h,
  ]);
  return <div ref={hostRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />;
}
