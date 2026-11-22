import React, { useRef } from 'react';
import {
  IMAGE_SORT_PIN_PATH,
  findImageSortApplet,
  getImageSortMarkers,
  normalizeImageSortAnswer,
  resolveImageSortAccent,
} from '../../editor/imageSortApplet.js';
import { editorApi } from '../../editor/editorApi';
import { useUiStore } from '../../stores/uiStore';
import { useHistoryStore } from '../../stores/historyStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { getTheme } from '../../editor/themes.js';

/**
 * Pin markers for the imagesort applet — sit above all slide content.
 * @param {'edit'|'preview'} mode
 */
export default function ImageSortMarkersLayer({
  slide,
  canvasW,
  canvasH,
  mode = 'edit',
  choices = null,
  pickId = null,
  onPickMarker = null,
  resultHints = null,
  onSuppressNav = null,
}) {
  const imageSortMarkerId = useUiStore((s) => s.imageSortMarkerId);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const dragRef = useRef(null);
  const applet = findImageSortApplet(slide);
  if (!applet) return null;
  const markers = getImageSortMarkers(applet);
  if (!markers.length && mode === 'preview') return null;

  const theme = getTheme(appliedThemeIdx);
  const pinColor = resolveImageSortAccent(applet, theme);
  const selectedId = mode === 'edit' ? String(imageSortMarkerId || '') : String(pickId || '');

  const stopNav = (e) => {
    e.stopPropagation();
    // Do not preventDefault in preview — it can drop the click onto the slide under the pin
    // and advance the deck. Suppress nav via callback + stopPropagation instead.
    if (mode !== 'preview') e.preventDefault();
    onSuppressNav?.();
  };

  const onPinPointerDown = (e, marker) => {
    if (mode === 'preview') {
      e.stopPropagation();
      onSuppressNav?.();
      onPickMarker?.(marker.id);
      return;
    }
    stopNav(e);
    editorApi.selectImageSortMarker(applet.id, marker.id);
    useHistoryStore.getState().push();
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = marker.x;
    const oy = marker.y;
    const stage = e.currentTarget.closest('.react-slide-stage, .preview-slide, .preview-slide-stage');
    const rect = stage?.getBoundingClientRect?.();
    const scaleX = rect && canvasW ? rect.width / canvasW : 1;
    const scaleY = rect && canvasH ? rect.height / canvasH : 1;
    dragRef.current = { id: marker.id, startX, startY, ox, oy, scaleX, scaleY, moved: false };

    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d || d.id !== marker.id) return;
      const dx = (ev.clientX - d.startX) / (d.scaleX || 1);
      const dy = (ev.clientY - d.startY) / (d.scaleY || 1);
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true;
      editorApi.updateImageSortMarker(
        applet.id,
        marker.id,
        {
          x: Math.round(d.ox + dx),
          y: Math.round(d.oy + dy),
        },
        { live: true }
      );
    };
    const onUp = () => {
      const d = dragRef.current;
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (d?.moved) usePresentationStore.getState().persist();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className="react-imagesort-layer" data-imagesort-layer="1" style={{ ['--imagesort-accent']: pinColor }}>
      {markers.map((m) => {
        const chosen = choices && choices[m.id] != null ? String(choices[m.id]) : '';
        const labelRaw = mode === 'preview' ? chosen : m.answer;
        const label = normalizeImageSortAnswer(labelRaw);
        const on = selectedId === String(m.id);
        const hint = resultHints && resultHints[m.id];
        return (
          <button
            key={m.id}
            type="button"
            className={`react-imagesort-pin${on ? ' is-selected' : ''}${hint === 'ok' ? ' is-ok' : ''}${hint === 'bad' ? ' is-bad' : ''}`}
            style={{ left: m.x, top: m.y }}
            title={mode === 'edit' ? label || '…' : undefined}
            onPointerDown={(e) => onPinPointerDown(e, m)}
            onMouseDown={stopNav}
            onClick={stopNav}
            onDoubleClick={stopNav}
          >
            <svg className="react-imagesort-pin-svg" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill={pinColor}
                stroke={pinColor}
                strokeWidth="0.5"
                strokeLinejoin="round"
                d={IMAGE_SORT_PIN_PATH}
              />
            </svg>
            {label ? <span className="react-imagesort-label">{label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
