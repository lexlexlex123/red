import React, { useEffect, useRef } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useHistoryStore } from '../../stores/historyStore';
import { normalizeFillImgLayout } from '../../editor/shapeFillImg.js';
import { editorApi } from '../../editor/editorApi';

/**
 * Move / rotate / resize the fill image inside a shape.
 * Esc or pointerdown outside the image (except while rotating) exits.
 */
export default function ShapeFillImgOverlay({ el, scale = 1, primary = true }) {
  const dragRef = useRef(null);
  const rotatingRef = useRef(false);
  const layout = normalizeFillImgLayout(el, el.w, el.h);

  useEffect(() => {
    if (!primary) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      editorApi.endShapeFillImgEdit();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [primary]);

  useEffect(() => {
    if (!primary) return undefined;
    const onDown = (e) => {
      if (rotatingRef.current || dragRef.current) return;
      const t = e.target;
      if (t?.closest?.('.react-shape-fillimg-overlay')) return;
      // Outside the image chrome — leave transform mode.
      editorApi.endShapeFillImgEdit();
      // On the slide, swallow so the click does not start a shape drag.
      if (t?.closest?.('.react-slide, .react-canvas-stage, .react-el')) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [primary]);

  function patchLive(next) {
    editorApi.patchShapeFillImgLayout(el.id, next, { live: true });
  }

  function commit() {
    // Final sync so overlapping shapes pick up the shared image after transform.
    const cur = usePresentationStore.getState().slides[usePresentationStore.getState().cur];
    const live = (cur?.els || []).find((e) => e && String(e.id) === String(el.id)) || el;
    const L = normalizeFillImgLayout(live, live.w, live.h);
    editorApi.patchShapeFillImgLayout(el.id, L, { live: false });
  }

  function onMovePointerDown(e) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    useHistoryStore.getState().push();
    const inv = 1 / Math.max(0.001, scale);
    dragRef.current = {
      kind: 'move',
      px: e.clientX,
      py: e.clientY,
      start: { ...layout },
      inv,
    };
    rotatingRef.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onResizePointerDown(corner, e) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    useHistoryStore.getState().push();
    const inv = 1 / Math.max(0.001, scale);
    dragRef.current = {
      kind: 'resize',
      corner,
      px: e.clientX,
      py: e.clientY,
      start: { ...layout },
      inv,
    };
    rotatingRef.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onRotatePointerDown(e) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    useHistoryStore.getState().push();
    rotatingRef.current = true;
    const cx = layout.x + layout.w / 2;
    const cy = layout.y + layout.h / 2;
    // Screen-space center of the image within the shape (approx via element rect).
    const host = e.currentTarget.closest('.react-el');
    const rect = host?.getBoundingClientRect();
    const inv = 1 / Math.max(0.001, scale);
    const screenCx = rect ? rect.left + (cx / (+el.w || 1)) * rect.width : e.clientX;
    const screenCy = rect ? rect.top + (cy / (+el.h || 1)) * rect.height : e.clientY;
    dragRef.current = {
      kind: 'rotate',
      start: { ...layout },
      screenCx,
      screenCy,
      a0: (Math.atan2(e.clientY - screenCy, e.clientX - screenCx) * 180) / Math.PI,
      rot0: layout.rot,
      inv,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === 'move') {
      const dx = (e.clientX - d.px) * d.inv;
      const dy = (e.clientY - d.py) * d.inv;
      patchLive({
        ...d.start,
        x: d.start.x + dx,
        y: d.start.y + dy,
      });
      return;
    }
    if (d.kind === 'resize') {
      const dx = (e.clientX - d.px) * d.inv;
      const dy = (e.clientY - d.py) * d.inv;
      let { x, y, w, h, rot } = d.start;
      if (d.corner.includes('e')) w = Math.max(16, d.start.w + dx);
      if (d.corner.includes('s')) h = Math.max(16, d.start.h + dy);
      if (d.corner.includes('w')) {
        w = Math.max(16, d.start.w - dx);
        x = d.start.x + (d.start.w - w);
      }
      if (d.corner.includes('n')) {
        h = Math.max(16, d.start.h - dy);
        y = d.start.y + (d.start.h - h);
      }
      // Keep aspect from start.
      const ar = d.start.w / Math.max(1, d.start.h);
      if (Math.abs(w / Math.max(1, h) - ar) > 0.001) {
        if (d.corner === 'e' || d.corner === 'w') h = w / ar;
        else if (d.corner === 'n' || d.corner === 's') w = h * ar;
        else h = w / ar;
        if (d.corner.includes('n')) y = d.start.y + d.start.h - h;
        if (d.corner.includes('w')) x = d.start.x + d.start.w - w;
      }
      patchLive({ x, y, w, h, rot });
      return;
    }
    if (d.kind === 'rotate') {
      const a1 = (Math.atan2(e.clientY - d.screenCy, e.clientX - d.screenCx) * 180) / Math.PI;
      let rot = d.rot0 + (a1 - d.a0);
      rot = ((rot % 360) + 360) % 360;
      if (rot > 180) rot -= 360;
      patchLive({ ...d.start, rot: Math.round(rot * 10) / 10 });
    }
  }

  function onPointerUp(e) {
    if (!dragRef.current) return;
    dragRef.current = null;
    rotatingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch (_) {
      /* ignore */
    }
    commit();
  }

  const corners = ['nw', 'ne', 'sw', 'se'];

  return (
    <div
      className="react-shape-fillimg-overlay"
      style={{
        position: 'absolute',
        left: layout.x,
        top: layout.y,
        width: layout.w,
        height: layout.h,
        transform: layout.rot ? `rotate(${layout.rot}deg)` : undefined,
        transformOrigin: 'center center',
        zIndex: 80,
        boxSizing: 'border-box',
        border: '1.5px dashed #3b82f6',
        background: 'rgba(59,130,246,0.06)',
        pointerEvents: 'auto',
        cursor: 'move',
      }}
      onPointerDown={onMovePointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div
        className="react-shape-fillimg-rot"
        title="Rotate"
        style={{
          position: 'absolute',
          left: '50%',
          top: -28,
          width: 14,
          height: 14,
          marginLeft: -7,
          borderRadius: '50%',
          background: '#3b82f6',
          border: '2px solid #fff',
          cursor: 'grab',
          boxShadow: '0 0 0 1px rgba(15,23,42,0.2)',
        }}
        onPointerDown={onRotatePointerDown}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: -28,
          width: 1,
          height: 14,
          marginLeft: -0.5,
          background: '#3b82f6',
          pointerEvents: 'none',
        }}
      />
      {corners.map((c) => (
        <div
          key={c}
          data-corner={c}
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            background: '#fff',
            border: '1.5px solid #3b82f6',
            borderRadius: 2,
            left: c.includes('w') ? -5 : undefined,
            right: c.includes('e') ? -5 : undefined,
            top: c.includes('n') ? -5 : undefined,
            bottom: c.includes('s') ? -5 : undefined,
            cursor: c === 'nw' || c === 'se' ? 'nwse-resize' : 'nesw-resize',
          }}
          onPointerDown={(e) => onResizePointerDown(c, e)}
        />
      ))}
    </div>
  );
}
