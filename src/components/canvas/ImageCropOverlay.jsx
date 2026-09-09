import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useUiStore } from '../../stores/uiStore';
import { useHistoryStore } from '../../stores/historyStore';

const MAX = 40;
const MIN_VISIBLE = 20;

function clampSide(v) {
  return Math.max(0, Math.min(MAX, Math.round(Number(v) || 0)));
}

/**
 * Interactive % crop overlay. Parent should render the image uncropped
 * while this is open; shades mark the region that will be kept.
 */
export default function ImageCropOverlay({ el }) {
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const cropModeElId = useUiStore((s) => s.cropModeElId);
  const setCropModeElId = useUiStore((s) => s.setCropModeElId);

  const [draft, setDraft] = useState(() => ({
    L: clampSide(el.imgCropL),
    T: clampSide(el.imgCropT),
    R: clampSide(el.imgCropR),
    B: clampSide(el.imgCropB),
  }));
  const dragRef = useRef(null);
  const cancelledRef = useRef(false);
  const appliedRef = useRef(false);

  useEffect(() => {
    setDraft({
      L: clampSide(el.imgCropL),
      T: clampSide(el.imgCropT),
      R: clampSide(el.imgCropR),
      B: clampSide(el.imgCropB),
    });
    cancelledRef.current = false;
  }, [el.id, cropModeElId]);

  // Save crop when component unmounts (e.g., clicking outside, selecting different element)
  // unless the user explicitly cancelled or already applied
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => {
    return () => {
      if (!cancelledRef.current && !appliedRef.current) {
        const d = draftRef.current;
        // Only save if there are actual changes
        if (d.L !== el.imgCropL || d.T !== el.imgCropT || d.R !== el.imgCropR || d.B !== el.imgCropB) {
          useHistoryStore.getState().push();
          usePresentationStore.getState().patchElement(el.id, {
            imgCropL: d.L,
            imgCropT: d.T,
            imgCropR: d.R,
            imgCropB: d.B,
            imgFit: d.L || d.T || d.R || d.B ? 'cover' : el.imgFit || 'contain',
          });
        }
      }
    };
  }, [el.id, el.imgCropL, el.imgCropT, el.imgCropR, el.imgCropB, el.imgFit]);

  const apply = useCallback(() => {
    appliedRef.current = true;
    useHistoryStore.getState().push();
    usePresentationStore.getState().patchElement(el.id, {
      imgCropL: draft.L,
      imgCropT: draft.T,
      imgCropR: draft.R,
      imgCropB: draft.B,
      imgFit: draft.L || draft.T || draft.R || draft.B ? 'cover' : el.imgFit || 'contain',
    });
    setCropModeElId(null);
    useUiStore.getState().showToast(ru ? 'Обрезка применена' : 'Crop applied', 'ok');
  }, [draft, el.id, el.imgFit, ru, setCropModeElId]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setCropModeElId(null);
  }, [setCropModeElId]);

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        cancel();
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        apply();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [apply, cancel]);

  function startDrag(sides, e) {
    e.preventDefault();
    e.stopPropagation();
    const box = e.currentTarget.closest('.react-img-crop-root');
    if (!box) return;
    const r = box.getBoundingClientRect();
    dragRef.current = {
      sides,
      x0: e.clientX,
      y0: e.clientY,
      w: r.width,
      h: r.height,
      start: { ...draft },
      pan: sides === 'pan',
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const dxPct = ((e.clientX - d.x0) / d.w) * 100;
    const dyPct = ((e.clientY - d.y0) / d.h) * 100;
    const next = { ...d.start };
    if (d.pan) {
      let L = d.start.L + dxPct;
      let R = d.start.R - dxPct;
      let T = d.start.T + dyPct;
      let B = d.start.B - dyPct;
      if (L < 0) {
        R += L;
        L = 0;
      }
      if (R < 0) {
        L += R;
        R = 0;
      }
      if (T < 0) {
        B += T;
        T = 0;
      }
      if (B < 0) {
        T += B;
        B = 0;
      }
      next.L = clampSide(L);
      next.R = clampSide(R);
      next.T = clampSide(T);
      next.B = clampSide(B);
    } else {
      for (const side of d.sides) {
        if (side === 'L') next.L = clampSide(d.start.L + dxPct);
        if (side === 'R') next.R = clampSide(d.start.R - dxPct);
        if (side === 'T') next.T = clampSide(d.start.T + dyPct);
        if (side === 'B') next.B = clampSide(d.start.B - dyPct);
      }
    }
    if (100 - next.L - next.R < MIN_VISIBLE) {
      const room = 100 - MIN_VISIBLE;
      if (d.sides?.includes('L') || d.pan) next.L = Math.min(next.L, room - next.R);
      if (d.sides?.includes('R') || d.pan) next.R = Math.min(next.R, room - next.L);
    }
    if (100 - next.T - next.B < MIN_VISIBLE) {
      const room = 100 - MIN_VISIBLE;
      if (d.sides?.includes('T') || d.pan) next.T = Math.min(next.T, room - next.B);
      if (d.sides?.includes('B') || d.pan) next.B = Math.min(next.B, room - next.T);
    }
    setDraft(next);
  }

  function onUp() {
    dragRef.current = null;
  }

  const L = draft.L;
  const T = draft.T;
  const R = draft.R;
  const B = draft.B;
  const visW = Math.max(1, 100 - L - R);
  const visH = Math.max(1, 100 - T - B);
  const mx = L + visW / 2;
  const my = T + visH / 2;

  const handles = [
    { pos: 'tl', cursor: 'nw-resize', sides: ['T', 'L'], left: L, top: T },
    { pos: 'tm', cursor: 'n-resize', sides: ['T'], left: mx, top: T },
    { pos: 'tr', cursor: 'ne-resize', sides: ['T', 'R'], left: 100 - R, top: T },
    { pos: 'ml', cursor: 'w-resize', sides: ['L'], left: L, top: my },
    { pos: 'mr', cursor: 'e-resize', sides: ['R'], left: 100 - R, top: my },
    { pos: 'bl', cursor: 'sw-resize', sides: ['B', 'L'], left: L, top: 100 - B },
    { pos: 'bm', cursor: 's-resize', sides: ['B'], left: mx, top: 100 - B },
    { pos: 'br', cursor: 'se-resize', sides: ['B', 'R'], left: 100 - R, top: 100 - B },
  ];

  return (
    <div
      className="react-img-crop-root react-img-crop-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        pointerEvents: 'auto',
      }}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="react-img-crop-shade" style={{ top: 0, left: 0, right: 0, height: `${T}%` }} />
      <div className="react-img-crop-shade" style={{ bottom: 0, left: 0, right: 0, height: `${B}%` }} />
      <div
        className="react-img-crop-shade"
        style={{ top: `${T}%`, bottom: `${B}%`, left: 0, width: `${L}%` }}
      />
      <div
        className="react-img-crop-shade"
        style={{ top: `${T}%`, bottom: `${B}%`, right: 0, width: `${R}%` }}
      />
      <div
        className="react-img-crop-pan"
        style={{
          left: `${L}%`,
          top: `${T}%`,
          width: `${visW}%`,
          height: `${visH}%`,
        }}
        onPointerDown={(e) => startDrag('pan', e)}
      />
      {handles.map((h) => (
        <div
          key={h.pos}
          className={`react-img-crop-handle react-img-crop-handle-${h.pos}`}
          style={{
            left: `${h.left}%`,
            top: `${h.top}%`,
            cursor: h.cursor,
          }}
          onPointerDown={(e) => startDrag(h.sides, e)}
        />
      ))}
    </div>
  );
}
