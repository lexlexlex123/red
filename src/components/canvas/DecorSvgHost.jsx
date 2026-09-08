import React, { useEffect, useRef } from 'react';
import { usePresentationStore } from '../../stores/presentationStore.js';
import { useUiStore } from '../../stores/uiStore.js';
import { syncDecorHostAnim } from '../../editor/decorAnim.js';

/** SVG decor host that freezes / resumes SMIL on the current frame. */
export default function DecorSvgHost({ html, className, style, dataId, role = 'editor', still = false }) {
  const ref = useRef(null);
  const layoutAnimated = usePresentationStore((s) => s.layoutAnimated);
  const decorPausedAt = usePresentationStore((s) => s.decorPausedAt);
  const cur = usePresentationStore((s) => s.cur);
  const previewOpen = useUiStore((s) => s.previewOpen);
  const pausedAt = decorPausedAt?.[String(cur)] ?? decorPausedAt?.[cur] ?? null;
  // GL underlays / editor under slideshow: keep SMIL frozen (blur filters are expensive fullscreen).
  const live = !!layoutAnimated && !still && !(role === 'editor' && previewOpen);
  // Drop feGaussianBlur on GL underlays even if old decks still embed filter="" in svgContent.
  const markup = still
    ? String(html || '')
        .replace(/\sfilter="[^"]*"/gi, '')
        .replace(/<filter\b[\s\S]*?<\/filter>/gi, '')
    : html || '';

  useEffect(() => {
    syncDecorHostAnim(ref.current, live, pausedAt);
  }, [live, pausedAt, markup, cur]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        syncDecorHostAnim(ref.current, live, pausedAt);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [live, pausedAt]);

  return (
    <div
      ref={ref}
      className={className}
      data-id={dataId}
      style={style}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
