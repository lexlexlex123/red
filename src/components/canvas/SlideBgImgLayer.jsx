import React, { useEffect, useState } from 'react';
import { bgImgSrc, slideBgImgLayer } from '../../editor/slideBgImg.js';

/** Absolute bg image layer for a slide stage. */
export default function SlideBgImgLayer({ slide, canvasW, canvasH }) {
  const src = bgImgSrc(slide?.bgImg);
  const [imgAspect, setImgAspect] = useState(null);

  useEffect(() => {
    if (!src) {
      setImgAspect(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const ar = (img.naturalWidth || 1) / (img.naturalHeight || 1);
      setImgAspect(ar);
    };
    img.onerror = () => setImgAspect(null);
    img.src = src;
  }, [src]);

  if (!src) return null;
  const layer = slideBgImgLayer(slide.bgImg, canvasW, canvasH, imgAspect);
  if (!layer) return null;

  // Tile mode: render individual tile elements
  if (layer.mode === 'tile' && layer.tiles && layer.tiles.length > 0) {
    return (
      <div className="react-sbg-img" aria-hidden="true" style={layer.wrap}>
        <div style={layer.inner}>
          {layer.tiles.map((t, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: t.x,
                top: t.y,
                width: t.w,
                height: t.h,
                backgroundImage: `url(${JSON.stringify(layer.tileSrc)})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                transition: 'left 0.15s ease-out, top 0.15s ease-out, width 0.15s ease-out, height 0.15s ease-out',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (layer.inner) {
    return (
      <div className="react-sbg-img" aria-hidden="true" style={layer.wrap}>
        <div style={layer.inner} />
      </div>
    );
  }
  return <div className="react-sbg-img" aria-hidden="true" style={layer.wrap} />;
}
