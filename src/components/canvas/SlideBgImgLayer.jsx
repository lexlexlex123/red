import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { bgImgSrc, slideBgImgLayer } from '../../editor/slideBgImg.js';

const imageAspectCache = new Map();

/** Absolute bg image layer for a slide stage. */
function SlideBgImgLayer({ slide, canvasW, canvasH }) {
  const src = bgImgSrc(slide?.bgImg);
  const bg = slide?.bgImg;
  const [imageInfo, setImageInfo] = useState(() => ({
    src,
    aspect: imageAspectCache.get(src) || null,
  }));
  const imgAspect = imageInfo.src === src ? imageInfo.aspect : imageAspectCache.get(src) || null;
  const previousImageRef = useRef({ src, imgAspect });
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!src) {
      setImageInfo({ src, aspect: null });
      return;
    }
    const cachedAspect = imageAspectCache.get(src);
    if (cachedAspect) {
      setImageInfo({ src, aspect: cachedAspect });
      return;
    }
    setImageInfo({ src, aspect: null });
    const img = new Image();
    img.onload = () => {
      const ar = (img.naturalWidth || 1) / (img.naturalHeight || 1);
      imageAspectCache.set(src, ar);
      setImageInfo({ src, aspect: ar });
    };
    img.onerror = () => setImageInfo({ src, aspect: null });
    img.src = src;
  }, [src]);

  const layer = useMemo(() => {
    if (!src) return null;
    return slideBgImgLayer(bg, canvasW, canvasH, imgAspect);
  }, [
    src,
    canvasW,
    canvasH,
    imgAspect,
    bg?.fit,
    bg?.mode,
    bg?.opacity,
    bg?.blur,
    bg?.tileSize,
    bg?.tileGap,
    bg?.tileRot,
    bg?.customSize,
    bg?.customW,
    bg?.customH,
    bg?.customMarginX,
    bg?.customMarginY,
    bg?.customMargin,
    bg?.customAnchor,
  ]);

  if (!layer) return null;

  const imageGeometryChanged =
    previousImageRef.current.src !== src || previousImageRef.current.imgAspect !== imgAspect;
  previousImageRef.current = { src, imgAspect };
  const animateChanges = initializedRef.current && !imageGeometryChanged;
  initializedRef.current = true;

  // Tile mode: render individual tile elements with smooth CSS transitions
  // Stable grid keys keep each tile anchored to its position when settings change.
  if (layer.mode === 'tile' && layer.tiles && layer.tiles.length > 0) {
    if (!imgAspect) return null;
    return (
      <div
        className="react-sbg-img"
        aria-hidden="true"
        style={{
          ...layer.wrap,
          transition: animateChanges ? 'opacity 0.2s ease-out, filter 0.2s ease-out' : 'none',
        }}
      >
        <div
          style={{
            ...layer.inner,
            transition: animateChanges ? 'transform 0.2s ease-out' : 'none',
          }}
        >
          {layer.tiles.map((t) => (
            <div
              key={`${t.row}:${t.col}`}
              style={{
                position: 'absolute',
                left: t.x,
                top: t.y,
                width: t.w,
                height: t.h,
                backgroundImage: `url(${JSON.stringify(layer.tileSrc)})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                transition: animateChanges
                  ? 'left 0.2s ease-out, top 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out'
                  : 'none',
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

export default memo(SlideBgImgLayer);
