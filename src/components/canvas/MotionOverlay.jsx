import React, { useLayoutEffect, useRef } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useUiStore } from '../../stores/uiStore';
import { useHistoryStore } from '../../stores/historyStore';
import {
  arrowHeadPoints,
  collectMotionSegments,
  insetToward,
  orbitArcPath,
  orbitArrowPoints,
  orbitDirSign,
  orbitStartAngle,
  orbitTravelDeg,
  polylinePathD,
  wrapDeltaDeg,
} from '../../editor/motionGeom.js';

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

function bindDrag(onMove) {
  window.addEventListener('pointermove', onMove);
  window.addEventListener(
    'pointerup',
    () => window.removeEventListener('pointermove', onMove),
    { once: true }
  );
}

function MotionGhost({ el, x, y, color, title, onPointerDown }) {
  const hostRef = useRef(null);
  const w = el.w || 0;
  const h = el.h || 0;
  const ghostKey = [
    el.id,
    el.w,
    el.h,
    el.rot,
    el.html,
    el.src,
    el.fill,
    el.cs,
    el.shape,
    el.hfSrc,
    el.elOpacity,
  ].join('|');

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    host.replaceChildren();
    const src = document.querySelector(`.react-slide-stage .react-el[data-id="${el.id}"]`);
    if (!src) return undefined;
    const clone = src.cloneNode(true);
    clone.removeAttribute('data-id');
    clone.removeAttribute('data-group-id');
    clone.setAttribute('inert', '');
    clone.classList.add('react-motion-ghost-el');
    clone.contentEditable = 'false';
    clone.style.left = '0px';
    clone.style.top = '0px';
    clone.style.right = 'auto';
    clone.style.bottom = 'auto';
    clone.style.margin = '0';
    clone.style.opacity = '0.5';
    clone.style.pointerEvents = 'none';
    clone.style.cursor = 'inherit';
    clone.style.outline = 'none';
    clone.style.animation = 'none';
    clone.style.animationName = 'none';
    clone.querySelectorAll('iframe, video, canvas, [contenteditable]').forEach((n) => {
      n.setAttribute('inert', '');
      if ('contentEditable' in n) n.contentEditable = 'false';
    });
    host.appendChild(clone);
    return () => {
      host.replaceChildren();
    };
  }, [ghostKey, el.id]);

  return (
    <div
      className="react-motion-ghost"
      title={title}
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        outlineColor: color,
      }}
      onPointerDown={onPointerDown}
    >
      <div ref={hostRef} className="react-motion-ghost-clone" />
    </div>
  );
}

/**
 * Motion path overlay + drag handles for moveTo / orbitTo (Animations tab).
 */
export default function MotionOverlay() {
  const activeTab = useUiStore((s) => s.activeTab);
  const previewOpen = useUiStore((s) => s.previewOpen);
  const lang = useUiStore((s) => s.lang);
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const canvasW = usePresentationStore((s) => s.canvasW);
  const canvasH = usePresentationStore((s) => s.canvasH);
  const selId = useSelectionStore((s) => s.selId);
  const multiSel = useSelectionStore((s) => s.multiSel);
  const ru = lang !== 'en';

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

  function onMoveGhostDown(el, seg, e) {
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
      const tx = Math.round(p.x - w / 2 - startX);
      const ty = Math.round(p.y - h / 2 - startY);
      const patch = { tx, ty };
      if (seg.kind === 'path' && Array.isArray(seg.pts) && seg.pts.length) {
        const pts = seg.pts.map((pt) => ({ ...pt }));
        pts[pts.length - 1] = { x: tx, y: ty };
        patch.pathPts = pts;
      }
      patchAnimLive(el.id, seg.ai, patch);
    };
    bindDrag(onMove);
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
    bindDrag(onMove);
  }

  function onOrbitGhostDown(el, seg, e) {
    e.stopPropagation();
    e.preventDefault();
    const stage = e.currentTarget.closest('.react-slide-stage');
    const a = seg.anim || {};
    const cx = seg.center.x;
    const cy = seg.center.y;
    const dir = orbitDirSign(a);
    let acc = orbitTravelDeg(a);
    const w = el.w || 0;
    const h = el.h || 0;
    let lastEa = Math.atan2(seg.end.y + h / 2 - cy, seg.end.x + w / 2 - cx);
    useHistoryStore.getState().push();
    const onMove = (ev) => {
      const p = stagePoint(ev, stage, canvasW, canvasH);
      const ea = Math.atan2(p.y - cy, p.x - cx);
      const delta = wrapDeltaDeg(((ea - lastEa) * 180) / Math.PI * dir);
      acc = Math.max(1, Math.min(720, acc + delta));
      lastEa = ea;
      patchAnimLive(el.id, seg.ai, { orbitDeg: Math.round(acc) });
    };
    bindDrag(onMove);
  }

  return (
    <div className="react-motion-overlay">
      <svg
        className="react-motion-overlay-svg"
        viewBox={`0 0 ${canvasW} ${canvasH}`}
        width={canvasW}
        height={canvasH}
      >
        {segments.map(({ el, seg }, i) => {
          const color = COLORS[i % COLORS.length];
          const w = el.w || 0;
          const h = el.h || 0;
          const sx = seg.start.x + w / 2;
          const sy = seg.start.y + h / 2;
          const ex = seg.end.x + w / 2;
          const ey = seg.end.y + h / 2;
          if (seg.kind === 'path' && seg.pts && seg.pts.length) {
            const d = polylinePathD(sx, sy, seg.pts);
            const last = seg.pts[seg.pts.length - 1];
            const tip = { x: sx + last.x, y: sy + last.y };
            return (
              <g key={`${el.id}-${seg.ai}`}>
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.2"
                  strokeDasharray="7 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.95"
                />
                <polygon
                  points={arrowHeadPoints(sx, sy, tip.x, tip.y, 16, 11)}
                  fill={color}
                  stroke="#fff"
                  strokeWidth="0.8"
                />
                {seg.pts.map((pt, pi) => (
                  <circle
                    key={pi}
                    cx={sx + pt.x}
                    cy={sy + pt.y}
                    r="6"
                    fill={color}
                    stroke="#fff"
                    strokeWidth="1.4"
                    style={{ pointerEvents: 'auto', cursor: 'move' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const stage = e.currentTarget.closest('.react-slide-stage');
                      useHistoryStore.getState().push();
                      const onMove = (ev) => {
                        const p = stagePoint(ev, stage, canvasW, canvasH);
                        const pts = seg.pts.map((q) => ({ ...q }));
                        pts[pi] = { x: Math.round(p.x - sx), y: Math.round(p.y - sy) };
                        const lastPt = pts[pts.length - 1];
                        patchAnimLive(el.id, seg.ai, { pathPts: pts, tx: lastPt.x, ty: lastPt.y });
                      };
                      bindDrag(onMove);
                    }}
                  />
                ))}
              </g>
            );
          }
          if (seg.kind === 'orbit' && seg.center && seg.r) {
            const a = seg.anim || {};
            const dir = orbitDirSign(a);
            const deg = orbitTravelDeg(a);
            const sa = orbitStartAngle(a, seg.start.x, seg.start.y, w, h);
            const arcD = orbitArcPath(seg.center.x, seg.center.y, seg.r, sa, deg, dir);
            const arrowT = deg >= 350 ? 0.82 : deg < 25 ? 1 : 0.94;
            const arrowPts = orbitArrowPoints(
              seg.center.x,
              seg.center.y,
              seg.r,
              sa,
              deg,
              dir,
              arrowT,
              18
            );
            return (
              <g key={`${el.id}-${seg.ai}`}>
                <circle
                  cx={seg.center.x}
                  cy={seg.center.y}
                  r={seg.r}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.15"
                  strokeDasharray="5 4"
                  opacity="0.45"
                />
                <path
                  d={arcD}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  opacity="0.95"
                />
                <polygon points={arrowPts} fill={color} stroke="#fff" strokeWidth="0.8" />
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
              </g>
            );
          }
          const dist = Math.hypot(ex - sx, ey - sy);
          const inset = Math.min(22, Math.max(10, Math.min(w, h) * 0.18) + 8);
          const tip = insetToward(sx, sy, ex, ey, dist > 28 ? inset : 4);
          const from = dist > 4 ? { x: sx, y: sy } : { x: sx - 12, y: sy };
          return (
            <g key={`${el.id}-${seg.ai}`}>
              <line
                x1={sx}
                y1={sy}
                x2={tip.x}
                y2={tip.y}
                stroke={color}
                strokeWidth="2.2"
                strokeDasharray="7 4"
                strokeLinecap="round"
                opacity="0.95"
              />
              <polygon
                points={arrowHeadPoints(from.x, from.y, tip.x, tip.y, 18, 12)}
                fill={color}
                stroke="#fff"
                strokeWidth="0.8"
              />
              <circle cx={sx} cy={sy} r="4" fill={color} stroke="#fff" strokeWidth="1.2" />
            </g>
          );
        })}
      </svg>
      {segments.map(({ el, seg }, i) => {
        const color = COLORS[i % COLORS.length];
        const isOrbit = seg.kind === 'orbit';
        return (
          <MotionGhost
            key={`g-${el.id}-${seg.ai}`}
            el={el}
            x={seg.end.x}
            y={seg.end.y}
            color={color}
            title={
              isOrbit
                ? ru
                  ? 'Перетащите призрак по окружности'
                  : 'Drag the ghost along the circle'
                : ru
                  ? 'Перетащите призрак в конечную точку'
                  : 'Drag the ghost to the end point'
            }
            onPointerDown={(e) =>
              isOrbit ? onOrbitGhostDown(el, seg, e) : onMoveGhostDown(el, seg, e)
            }
          />
        );
      })}
    </div>
  );
}
