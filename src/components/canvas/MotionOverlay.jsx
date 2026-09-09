import React from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useUiStore } from '../../stores/uiStore';
import { useHistoryStore } from '../../stores/historyStore';
import { collectMotionSegments } from '../../editor/motionGeom.js';

const COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6'];

function stagePoint(e, stage, canvasW, canvasH) {
  const rect = stage?.getBoundingClientRect();
  if (!rect || !rect.width || !rect.height) return { x: 0, y: 0 };
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvasW,
    y: ((e.clientY - rect.top) / rect.height) * canvasH,
  };
}

function patchAnimLive(elId, ai, patch) {
  const st = usePresentationStore.getState();
  const el = (st.slides[st.cur]?.els || []).find((x) => String(x.id) === String(elId));
  if (!el?.anims?.[ai]) return;
  const next = el.anims.map((a, i) => (i === ai ? { ...a, ...patch } : a));
  st.patchElement(elId, { anims: next });
}

/**
 * Motion path overlay + drag handles for moveTo / orbitTo (Animations tab).
 */
export default function MotionOverlay() {
  const activeTab = useUiStore((s) => s.activeTab);
  const previewOpen = useUiStore((s) => s.previewOpen);
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const canvasW = usePresentationStore((s) => s.canvasW);
  const canvasH = usePresentationStore((s) => s.canvasH);
  const selId = useSelectionStore((s) => s.selId);
  const multiSel = useSelectionStore((s) => s.multiSel);

  if (activeTab !== 'anim' || previewOpen) return null;

  const slide = slides[cur];
  if (!slide) return null;
  const idSet = new Set((multiSel?.length ? multiSel : selId ? [selId] : []).map(String));
  const els = (slide.els || []).filter((e) => e && idSet.has(String(e.id)));
  const segments = [];
  els.forEach((el) => {
    collectMotionSegments(el).forEach((seg) => segments.push({ el, seg }));
  });
  if (!segments.length) return null;

  function onMoveEndDown(el, seg, e) {
    e.stopPropagation();
    e.preventDefault();
    const stage = e.currentTarget.closest('.react-slide-stage');
    const w = el.w || 0;
    const h = el.h || 0;
    const startX = seg.start.x;
    const startY = seg.start.y;
    useHistoryStore.getState().push();
    const onMove = (ev) => {
      const p = stagePoint(ev, stage, canvasW, canvasH);
      patchAnimLive(el.id, seg.ai, {
        tx: Math.round(p.x - w / 2 - startX),
        ty: Math.round(p.y - h / 2 - startY),
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', () => window.removeEventListener('pointermove', onMove), { once: true });
  }

  function onOrbitCenterDown(el, seg, e) {
    e.stopPropagation();
    e.preventDefault();
    const stage = e.currentTarget.closest('.react-slide-stage');
    const w = el.w || 0;
    const h = el.h || 0;
    const ecx = seg.start.x + w / 2;
    const ecy = seg.start.y + h / 2;
    useHistoryStore.getState().push();
    const onMove = (ev) => {
      const p = stagePoint(ev, stage, canvasW, canvasH);
      const orbitCx = Math.round(p.x - ecx);
      const orbitCy = Math.round(p.y - ecy);
      const r = Math.max(10, Math.round(Math.sqrt(orbitCx * orbitCx + orbitCy * orbitCy)));
      patchAnimLive(el.id, seg.ai, { orbitCx, orbitCy, orbitR: r });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', () => window.removeEventListener('pointermove', onMove), { once: true });
  }

  function onOrbitEndDown(el, seg, e) {
    e.stopPropagation();
    e.preventDefault();
    const stage = e.currentTarget.closest('.react-slide-stage');
    const a = seg.anim || {};
    const cx = seg.center.x;
    const cy = seg.center.y;
    const w = el.w || 0;
    const h = el.h || 0;
    const ecx = seg.start.x + w / 2;
    const ecy = seg.start.y + h / 2;
    const sa = Math.atan2(ecy - cy, ecx - cx);
    const dir = (a.orbitDir || 'cw') === 'cw' ? 1 : -1;
    useHistoryStore.getState().push();
    const onMove = (ev) => {
      const p = stagePoint(ev, stage, canvasW, canvasH);
      const ea = Math.atan2(p.y - cy, p.x - cx);
      let deg = ((ea - sa) * 180) / Math.PI * dir;
      while (deg < 0) deg += 360;
      while (deg > 720) deg -= 360;
      patchAnimLive(el.id, seg.ai, { orbitDeg: Math.max(1, Math.min(720, Math.round(deg))) });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', () => window.removeEventListener('pointermove', onMove), { once: true });
  }

  return (
    <svg
      className="react-motion-overlay"
      viewBox={`0 0 ${canvasW} ${canvasH}`}
      width={canvasW}
      height={canvasH}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 40,
        overflow: 'visible',
      }}
    >
      <defs>
        <marker id="mo-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#38bdf8" />
        </marker>
      </defs>
      {segments.map(({ el, seg }, i) => {
        const color = COLORS[i % COLORS.length];
        const sx = seg.start.x + (el.w || 0) / 2;
        const sy = seg.start.y + (el.h || 0) / 2;
        const ex = seg.end.x + (el.w || 0) / 2;
        const ey = seg.end.y + (el.h || 0) / 2;
        if (seg.kind === 'orbit' && seg.center && seg.r) {
          return (
            <g key={`${el.id}-${seg.ai}`}>
              <circle
                cx={seg.center.x}
                cy={seg.center.y}
                r={seg.r}
                fill="none"
                stroke={color}
                strokeWidth="1.25"
                strokeDasharray="5 4"
                opacity="0.85"
              />
              <circle
                cx={seg.center.x}
                cy={seg.center.y}
                r="7"
                fill={color}
                stroke="#fff"
                strokeWidth="1.5"
                style={{ pointerEvents: 'auto', cursor: 'move' }}
                onPointerDown={(e) => onOrbitCenterDown(el, seg, e)}
              />
              <circle
                cx={ex}
                cy={ey}
                r="8"
                fill={color}
                stroke="#fff"
                strokeWidth="1.5"
                opacity="0.95"
                style={{ pointerEvents: 'auto', cursor: 'grab' }}
                onPointerDown={(e) => onOrbitEndDown(el, seg, e)}
              />
            </g>
          );
        }
        return (
          <g key={`${el.id}-${seg.ai}`}>
            <line
              x1={sx}
              y1={sy}
              x2={ex}
              y2={ey}
              stroke={color}
              strokeWidth="1.5"
              strokeDasharray="6 3"
              markerEnd="url(#mo-arrow)"
              opacity="0.9"
            />
            <rect
              x={seg.end.x}
              y={seg.end.y}
              width={el.w || 0}
              height={el.h || 0}
              fill="none"
              stroke={color}
              strokeWidth="1.25"
              strokeDasharray="4 3"
              opacity="0.7"
            />
            <circle
              cx={ex}
              cy={ey}
              r="8"
              fill={color}
              stroke="#fff"
              strokeWidth="1.5"
              style={{ pointerEvents: 'auto', cursor: 'grab' }}
              onPointerDown={(e) => onMoveEndDown(el, seg, e)}
            />
          </g>
        );
      })}
    </svg>
  );
}
