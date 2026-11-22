import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useUiStore } from '../../stores/uiStore';
import { useHistoryStore } from '../../stores/historyStore';
import { getCropFullBox } from '../../editor/imgStyles.js';

const MAX = 90;
// Keep this matching the Math.max(0.1, ...) floor on wFrac/hFrac in commitCrop and
// imgStyles.js — if this were lower, the crop preview could show a sliver smaller than
// what the floor there actually allows once applied, so the applied result would visibly
// jump larger than what was being dragged.
const MIN_VISIBLE = 10;

function clampSide(v) {
  // Round to one decimal place, not a whole percent: at strong crops (now possible up to
  // 90% per side) the visible fraction (wFrac/hFrac) gets small, and the image position
  // formula in imgStyles.js divides by that fraction — so a whole-percent rounding error
  // that's negligible at a mild crop turns into a visibly-off scale/position once the
  // divisor shrinks. One decimal cuts the worst case by 10x.
  return Math.max(0, Math.min(MAX, Math.round(Number(v) * 10 || 0) / 10));
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

  // Turn the current draft L/T/R/B percentages into a box anchored to the visible region,
  // instead of just storing the crop percentages and letting the box stretch to show the
  // cropped-in area scaled back up to full size.
  //
  // Computed relative to the *full* (pre-crop) box — reconstructed from the element's
  // current box + its existing crop percentages, see getCropFullBox — rather than the
  // element's live x/y/w/h directly. Reopening crop on an already-cropped image starts from
  // that same full box (SlideCanvas.jsx renders the picture at full size while crop mode is
  // open, for exactly this reason), so committing must be based on the same reference or a
  // second crop pass would derive an incorrect, doubly-shrunk box.
  //
  // The L/T/R/B percentages themselves are kept as-is, *not* reset to 0: the image
  // positioning formula in imgStyles.js (the `hasCrop` block) expresses the image's
  // size/offset purely as percentages of the full box, so storing exactly the percentages
  // that were used to derive the new box keeps that formula landing on the same pixels,
  // now filling the new box edge-to-edge instead of stretching the whole picture into it.
  const commitCrop = useCallback(
    (d) => {
      const full = getCropFullBox(el);
      const wFrac = Math.max(0.1, 1 - d.L / 100 - d.R / 100);
      const hFrac = Math.max(0.1, 1 - d.T / 100 - d.B / 100);
      usePresentationStore.getState().patchElement(el.id, {
        x: full.x + full.w * (d.L / 100),
        y: full.y + full.h * (d.T / 100),
        w: Math.max(4, full.w * wFrac),
        h: Math.max(4, full.h * hFrac),
        imgCropL: d.L,
        imgCropT: d.T,
        imgCropR: d.R,
        imgCropB: d.B,
      });
    },
    [el.id, el.w, el.h, el.x, el.y, el.imgCropL, el.imgCropT, el.imgCropR, el.imgCropB]
  );

  // Save crop when component unmounts (e.g., clicking outside, selecting different element)
  // unless the user explicitly cancelled or already applied
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const commitCropRef = useRef(commitCrop);
  commitCropRef.current = commitCrop;
  useEffect(() => {
    return () => {
      if (!cancelledRef.current && !appliedRef.current) {
        const d = draftRef.current;
        // Only commit if there are actual changes
        if (d.L !== el.imgCropL || d.T !== el.imgCropT || d.R !== el.imgCropR || d.B !== el.imgCropB) {
          useHistoryStore.getState().push();
          commitCropRef.current(d);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.id]);

  const apply = useCallback(() => {
    appliedRef.current = true;
    useHistoryStore.getState().push();
    commitCrop(draft);
    setCropModeElId(null);
    useUiStore.getState().showToast(ru ? 'Обрезка применена' : 'Crop applied', 'ok');
  }, [draft, commitCrop, ru, setCropModeElId]);

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

  // Accumulate every transform (rotation, flip, and the canvas's own zoom scale, applied by
  // various ancestors) between `node` and the document root into a single matrix mapping
  // the element's own untransformed layout coordinates to screen pixels.
  function elementToScreenMatrix(node) {
    let matrix = new DOMMatrix();
    let cur = node;
    while (cur && cur.nodeType === 1 && cur !== document.body) {
      const cs = getComputedStyle(cur);
      if (cs.transform && cs.transform !== 'none') {
        try {
          matrix = new DOMMatrix(cs.transform).multiply(matrix);
        } catch (err) {
          /* ignore unparsable transform */
        }
      }
      cur = cur.parentElement;
    }
    return matrix;
  }

  function startDrag(sides, e) {
    e.preventDefault();
    e.stopPropagation();
    const box = e.currentTarget.closest('.react-img-crop-root');
    if (!box) return;
    // The overlay itself carries no rotation — it's an inset:0 child of the rotated image
    // wrapper (.react-el). box.getBoundingClientRect() on a rotated element returns the
    // axis-aligned *screen* bounding box, which is larger than (and a different aspect
    // ratio from) the image's own box, and mouse deltas in screen space no longer line up
    // with the image's own left/right/top/bottom once it's rotated. Use the rotated
    // wrapper's own untransformed layout size plus the full accumulated transform up to the
    // screen (rotation, flip, and the canvas's zoom level together) to convert screen-pixel
    // drag deltas back into the image's own local percentage space correctly regardless of
    // rotation or zoom.
    const rotEl = box.closest('.react-el') || box;
    const w = rotEl.offsetWidth || box.getBoundingClientRect().width;
    const h = rotEl.offsetHeight || box.getBoundingClientRect().height;
    let inv = null;
    try {
      inv = elementToScreenMatrix(rotEl).inverse();
    } catch (err) {
      inv = null;
    }
    dragRef.current = {
      sides,
      x0: e.clientX,
      y0: e.clientY,
      w,
      h,
      inv,
      start: { ...draft },
      pan: sides === 'pan',
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const dxScreen = e.clientX - d.x0;
    const dyScreen = e.clientY - d.y0;
    // Apply only the linear (rotation+scale) part of the inverse transform to this delta —
    // translation doesn't apply to a delta between two points, only to absolute positions.
    const dxLocal = d.inv ? d.inv.a * dxScreen + d.inv.c * dyScreen : dxScreen;
    const dyLocal = d.inv ? d.inv.b * dxScreen + d.inv.d * dyScreen : dyScreen;
    const dxPct = (dxLocal / d.w) * 100;
    const dyPct = (dyLocal / d.h) * 100;
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
