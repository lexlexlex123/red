import React, { useCallback, useRef } from 'react';

const CORNER_HANDLES = [
  { key: 'tl', ax: 0, ay: 0, tx: 0.5, ty: 0.5 },
  { key: 'tr', ax: 1, ay: 0, tx: 0.5, ty: 0.5 },
  { key: 'bl', ax: 0, ay: 1, tx: 0.5, ty: 0.5 },
  { key: 'br', ax: 1, ay: 1, tx: 0.5, ty: 0.5 },
];

const EDGE_HANDLES = [
  { key: 't', ax: 0.5, ay: 0, tx: 0.5, ty: 0.42 },
  { key: 'r', ax: 1, ay: 0.5, tx: 0.58, ty: 0.5 },
  { key: 'b', ax: 0.5, ay: 1, tx: 0.5, ty: 0.58 },
  { key: 'l', ax: 0, ay: 0.5, tx: 0.42, ty: 0.5 },
];

/**
 * Legacy-style visual box you drag markers on to change 4 values directly. Each marker's
 * on-screen position is a direct function of its current value (clamped to stay inside the
 * box) and, while dragging, of the pointer's own clamped position — not a running delta from
 * where the drag started. That means the marker always shows where you actually are and
 * always tracks the cursor 1:1 inside the box, so it never drifts out of reach or needs an
 * oversized/awkward motion to bring back down (the old delta-based drag made corners on the
 * right/bottom feel disconnected from the cursor since the marker never actually moved).
 *  - 'corner': marker at each of the 4 corners, sliding toward the box's center as the value
 *    (radius) increases.
 *  - 'edge': marker at the midpoint of each of the 4 edges, sliding inward as the value
 *    (padding) increases.
 */
export default function DragValueBox({ mode, values, max = 100, onChange, height = 84 }) {
  const boxRef = useRef(null);
  const handles = mode === 'corner' ? CORNER_HANDLES : EDGE_HANDLES;

  const fracFor = (key) => {
    const v = +(values[key] || 0);
    if (!Number.isFinite(v) || max <= 0) return 0;
    return Math.max(0, Math.min(1, v / max));
  };

  const posFor = (h) => {
    const f = fracFor(h.key);
    return { x: h.ax + (h.tx - h.ax) * f, y: h.ay + (h.ty - h.ay) * f };
  };

  const startDrag = useCallback(
    (h) => (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dvx = h.tx - h.ax;
      const dvy = h.ty - h.ay;
      const segLen2 = dvx * dvx + dvy * dvy || 1;
      const update = (ev) => {
        const rect = boxRef.current?.getBoundingClientRect();
        if (!rect || !rect.width || !rect.height) return;
        const px = (ev.clientX - rect.left) / rect.width;
        const py = (ev.clientY - rect.top) / rect.height;
        // Project the pointer position onto the anchor→target segment so the marker only
        // ever moves along its intended path and always matches the cursor.
        const rx = px - h.ax;
        const ry = py - h.ay;
        let t = (rx * dvx + ry * dvy) / segLen2;
        t = Math.max(0, Math.min(1, t));
        onChange(h.key, Math.round(t * max));
      };
      update(e);
      const onMove = (ev) => update(ev);
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [max, onChange]
  );

  const boxRadius =
    mode === 'corner'
      ? {
          borderTopLeftRadius: Math.min(24, fracFor('tl') * 24),
          borderTopRightRadius: Math.min(24, fracFor('tr') * 24),
          borderBottomLeftRadius: Math.min(24, fracFor('bl') * 24),
          borderBottomRightRadius: Math.min(24, fracFor('br') * 24),
        }
      : null;

  const insetGuide =
    mode === 'edge'
      ? {
          top: `${fracFor('t') * 40}%`,
          right: `${fracFor('r') * 40}%`,
          bottom: `${fracFor('b') * 40}%`,
          left: `${fracFor('l') * 40}%`,
        }
      : null;

  return (
    <div ref={boxRef} className="react-dragbox" style={{ height, ...boxRadius }}>
      {mode === 'edge' ? <div className="react-dragbox-inner" style={insetGuide} /> : null}
      {handles.map((h) => {
        const p = posFor(h);
        return (
          <div
            key={h.key}
            className="react-dragbox-handle"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            onPointerDown={startDrag(h)}
            title={String(values[h.key] ?? 0)}
          />
        );
      })}
    </div>
  );
}
