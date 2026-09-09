import React, { useRef } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useUiStore } from '../../stores/uiStore';
import { useHistoryStore } from '../../stores/historyStore';
import { editorApi } from '../../editor/editorApi';
import { CAM_COLOR, camCorners, nudgeCameraInside } from '../../editor/camera.js';

/**
 * Camera frames overlay — visible on Animations tab.
 */
export default function CameraOverlay() {
  const activeTab = useUiStore((s) => s.activeTab);
  const previewOpen = useUiStore((s) => s.previewOpen);
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const canvasW = usePresentationStore((s) => s.canvasW);
  const canvasH = usePresentationStore((s) => s.canvasH);
  const selCamId = useSelectionStore((s) => s.selCamId);
  const dragRef = useRef(null);

  if (activeTab !== 'anim' || previewOpen) return null;
  const cams = slides[cur]?.cameras || [];
  if (!cams.length) return null;

  function commit(camId, patch) {
    useHistoryStore.getState().push();
    editorApi.patchCamera(camId, patch, { noHistory: true });
  }

  function onMoveDown(cam, e) {
    e.stopPropagation();
    e.preventDefault();
    editorApi.pickCamera(cam.id);
    const start = { ...cam };
    const ox = e.clientX;
    const oy = e.clientY;
    // Approximate canvas scale from stage
    const stage = e.currentTarget.closest('.react-slide-stage');
    const rect = stage?.getBoundingClientRect();
    const sc = rect ? rect.width / canvasW : 1;
    dragRef.current = { mode: 'move', camId: cam.id, start, ox, oy, sc };

    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d || d.mode !== 'move') return;
      const dx = (ev.clientX - d.ox) / d.sc;
      const dy = (ev.clientY - d.oy) / d.sc;
      const next = nudgeCameraInside(
        { ...d.start, cx: d.start.cx + dx, cy: d.start.cy + dy },
        canvasW,
        canvasH
      );
      editorApi.patchCamera(d.camId, { cx: next.cx, cy: next.cy, w: next.w, h: next.h, rot: next.rot }, {
        noHistory: true,
        live: true,
      });
    };
    const onUp = () => {
      const d = dragRef.current;
      dragRef.current = null;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (!d) return;
      const camNow = (usePresentationStore.getState().slides[cur]?.cameras || []).find(
        (c) => c.id === d.camId
      );
      if (camNow) commit(d.camId, camNow);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  function onCornerDown(cam, lx, ly, e) {
    e.stopPropagation();
    e.preventDefault();
    editorApi.pickCamera(cam.id);
    const start = { ...cam };
    const stage = e.currentTarget.closest('.react-slide-stage');
    const rect = stage?.getBoundingClientRect();
    const sc = rect ? rect.width / canvasW : 1;
    dragRef.current = { mode: 'resize', camId: cam.id, start, lx, ly, sc };

    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d || d.mode !== 'resize') return;
      const stageEl = document.querySelector('.react-slide-stage');
      const r = stageEl?.getBoundingClientRect();
      if (!r) return;
      const mx = (ev.clientX - r.left) / d.sc;
      const my = (ev.clientY - r.top) / d.sc;
      const dist = Math.hypot(mx - d.start.cx, my - d.start.cy);
      const halfDiag = Math.hypot(d.start.w / 2, d.start.h / 2) || 1;
      let w = (dist / halfDiag) * d.start.w;
      w = Math.max(48, w);
      const next = nudgeCameraInside({ ...d.start, w, h: w * (canvasH / canvasW) }, canvasW, canvasH);
      editorApi.patchCamera(d.camId, { w: next.w, h: next.h, cx: next.cx, cy: next.cy }, {
        noHistory: true,
        live: true,
      });
    };
    const onUp = () => {
      const d = dragRef.current;
      dragRef.current = null;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (!d) return;
      const camNow = (usePresentationStore.getState().slides[cur]?.cameras || []).find(
        (c) => c.id === d.camId
      );
      if (camNow) commit(d.camId, camNow);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  function onRotDown(cam, e) {
    e.stopPropagation();
    e.preventDefault();
    editorApi.pickCamera(cam.id);
    const start = { ...cam };
    const stage = e.currentTarget.closest('.react-slide-stage');
    const rect = stage?.getBoundingClientRect();
    const sc = rect ? rect.width / canvasW : 1;
    const cx = rect.left + start.cx * sc;
    const cy = rect.top + start.cy * sc;
    dragRef.current = { mode: 'rot', camId: cam.id, start, cx, cy };

    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d || d.mode !== 'rot') return;
      const ang = (Math.atan2(ev.clientY - d.cy, ev.clientX - d.cx) * 180) / Math.PI + 90;
      const next = nudgeCameraInside({ ...d.start, rot: ang }, canvasW, canvasH);
      editorApi.patchCamera(d.camId, { rot: next.rot, cx: next.cx, cy: next.cy, w: next.w, h: next.h }, {
        noHistory: true,
        live: true,
      });
    };
    const onUp = () => {
      const d = dragRef.current;
      dragRef.current = null;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (!d) return;
      const camNow = (usePresentationStore.getState().slides[cur]?.cameras || []).find(
        (c) => c.id === d.camId
      );
      if (camNow) commit(d.camId, camNow);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  return (
    <div className="react-camera-layer" aria-hidden="true">
      <svg className="react-camera-svg" viewBox={`0 0 ${canvasW} ${canvasH}`}>
        {cams.map((cam, i) => {
          if (i >= cams.length - 1) return null;
          const a = cams[i];
          const b = cams[i + 1];
          const dx = b.cx - a.cx;
          const dy = b.cy - a.cy;
          const len = Math.hypot(dx, dy) || 1;
          if (len < 10) return null;
          const ux = dx / len;
          const uy = dy / len;
          const pad = 14;
          const ax = a.cx + ux * pad;
          const ay = a.cy + uy * pad;
          const bx = b.cx - ux * pad;
          const by = b.cy - uy * pad;
          const ah = 10;
          return (
            <g key={`arr-${a.id}`}>
              <line x1={ax} y1={ay} x2={bx} y2={by} stroke={CAM_COLOR} strokeWidth="2" strokeDasharray="6 4" opacity="0.7" />
              <polygon
                points={`${bx},${by} ${bx - ah * ux + ah * 0.4 * uy},${by - ah * uy - ah * 0.4 * ux} ${bx - ah * ux - ah * 0.4 * uy},${by - ah * uy + ah * 0.4 * ux}`}
                fill={CAM_COLOR}
                opacity="0.85"
              />
            </g>
          );
        })}
        {cams.map((cam, idx) => {
          const pts = camCorners(cam, canvasW, canvasH)
            .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(' ');
          const selected = selCamId === cam.id;
          return (
            <g key={cam.id}>
              <polygon
                points={pts}
                fill={selected ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)'}
                stroke={CAM_COLOR}
                strokeWidth={selected ? 2.5 : 2}
                strokeDasharray="7 4"
              />
              <circle cx={cam.cx} cy={cam.cy} r={11} fill={CAM_COLOR} stroke="#fff" strokeWidth="1.5" />
              <text
                x={cam.cx}
                y={cam.cy + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#fff"
                fontFamily="sans-serif"
              >
                {idx + 1}
              </text>
            </g>
          );
        })}
      </svg>
      {cams.map((cam) => (
        <div
          key={`frame-${cam.id}`}
          className="react-camera-frame"
          style={{
            left: cam.cx - cam.w / 2,
            top: cam.cy - cam.h / 2,
            width: cam.w,
            height: cam.h,
            transform: `rotate(${cam.rot || 0}deg)`,
          }}
        >
          <div
            className="react-camera-move"
            title="Move"
            onPointerDown={(e) => onMoveDown(cam, e)}
          />
          <div className="react-camera-corner" style={{ left: '100%', top: 0 }} onPointerDown={(e) => onCornerDown(cam, 1, 0, e)} />
          <div className="react-camera-corner" style={{ left: 0, top: '100%' }} onPointerDown={(e) => onCornerDown(cam, 0, 1, e)} />
          <div className="react-camera-corner" style={{ left: '100%', top: '100%' }} onPointerDown={(e) => onCornerDown(cam, 1, 1, e)} />
          <div className="react-camera-rot" title="Rotate" onPointerDown={(e) => onRotDown(cam, e)} />
        </div>
      ))}
    </div>
  );
}
