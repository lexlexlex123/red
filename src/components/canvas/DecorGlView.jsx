import React, { useEffect, useRef, useState } from 'react';
import {
  ensureGlRenderersLoaded,
  ensureLayoutsLoaded,
  glApiForRenderer,
  isGlDecorRenderer,
  resolveDecorGlCfg,
  decorUsesGl,
} from '../../editor/layouts.js';
import { patchGlCfgForAnim } from '../../editor/decorAnim.js';
import { usePresentationStore } from '../../stores/presentationStore.js';
import { useUiStore } from '../../stores/uiStore.js';

export { isGlDecorRenderer };

let softGlToastShown = false;

/**
 * Live WebGL / canvas decor overlay (crystal, dna, galaxy, caustics, warp).
 * Waits for theme scripts so DNA appears on first load without re-clicking the template.
 */
export default function DecorGlView({ el, role = 'editor' }) {
  const hostRef = useRef(null);
  const layoutAnimated = usePresentationStore((s) => s.layoutAnimated);
  const decorPausedAt = usePresentationStore((s) => s.decorPausedAt);
  const cur = usePresentationStore((s) => s.cur);
  const canvasW = usePresentationStore((s) => s.canvasW);
  const canvasH = usePresentationStore((s) => s.canvasH);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const previewOpen = useUiStore((s) => s.previewOpen);
  const suspended = role === 'editor' && previewOpen;
  const [glReady, setGlReady] = useState(0);
  const layoutIdx = el?._layoutIdx;
  const style = el?._decorStyle;
  const idRef = useRef(String(el?.id || ''));
  idRef.current = String(el?.id || '');

  useEffect(() => {
    if (!el?._isDecor || layoutIdx == null || layoutIdx < 0) return undefined;
    if (suspended) return undefined;
    let cancelled = false;
    let cleanup = null;
    const id = String(el.id);

    (async () => {
      try {
        await ensureLayoutsLoaded();
        await ensureGlRenderersLoaded();
      } catch (e) {
        console.warn('DecorGlView load', e);
        return;
      }
      if (cancelled || !hostRef.current) return;
      const cfg = patchGlCfgForAnim(resolveDecorGlCfg(el), cur);
      const r = el._decorRenderer;
      if (!isGlDecorRenderer(r) || !cfg) {
        setGlReady((n) => n + 1);
        return;
      }
      const api = glApiForRenderer(r);
      if (!api) return;
      try {
        cleanup = api.mount(hostRef.current, { ...cfg, id });
      } catch (e) {
        console.warn('DecorGlView mount', r, e);
      }
      setGlReady((n) => n + 1);
      if (
        !softGlToastShown &&
        typeof window !== 'undefined' &&
        window.GlQuality?.isSoftware?.()
      ) {
        softGlToastShown = true;
        const ru = useUiStore.getState().lang !== 'en';
        useUiStore.getState().showToast(
          ru
            ? 'WebGL без GPU (software). В Chrome: Настройки → Система → аппаратное ускорение'
            : 'WebGL is software-only. Enable hardware acceleration in Chrome settings',
          'warn'
        );
      }
    })();

    return () => {
      cancelled = true;
      try {
        if (typeof cleanup === 'function') cleanup();
      } catch (e) {}
      try {
        const r = el._decorRenderer;
        if (isGlDecorRenderer(r)) glApiForRenderer(r)?.unmount?.(id);
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    el.id,
    layoutIdx,
    style,
    el.w,
    el.h,
    canvasW,
    canvasH,
    appliedThemeIdx,
    suspended,
  ]);

  useEffect(() => {
    const r = el?._decorRenderer;
    if (!isGlDecorRenderer(r) || suspended) return;
    const id = idRef.current;
    const api = glApiForRenderer(r);
    if (!api) return;
    const paused =
      decorPausedAt?.[String(cur)] ?? decorPausedAt?.[cur] ?? null;
    try {
      api.update?.(id, {
        animated: !!layoutAnimated,
        ...(layoutAnimated || paused == null ? {} : { startElapsed: +paused }),
      });
    } catch (e) {}
    try {
      if (layoutAnimated) api.resumeAll?.();
      else api.pauseAll?.();
    } catch (e) {}
  }, [layoutAnimated, decorPausedAt, cur, el?._decorRenderer, suspended, glReady]);

  // Tab focus: resume GL after browser pauses rAF while hidden
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      if (!layoutAnimated || suspended) return;
      const r = el?._decorRenderer;
      if (!isGlDecorRenderer(r)) return;
      try {
        glApiForRenderer(r)?.resumeAll?.();
      } catch (e) {}
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [layoutAnimated, suspended, el?._decorRenderer]);

  // Show host only for real GL/canvas decor themes.
  if (!decorUsesGl(el) && !isGlDecorRenderer(el?._decorRenderer)) return null;

  return (
    <div
      ref={hostRef}
      className="react-decor-gl"
      data-gl={el?._decorRenderer || ''}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    />
  );
}
