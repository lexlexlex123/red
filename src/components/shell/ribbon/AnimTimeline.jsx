import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePresentationStore } from '../../../stores/presentationStore';
import { useSelectionStore } from '../../../stores/selectionStore';
import { useUiStore } from '../../../stores/uiStore';
import { editorApi } from '../../../editor/editorApi';
import {
  CAM_PREFIX,
  computeSlideAnimTimeline,
  isCamElId,
  isPauElId,
  timelineSegKey,
  camIdFromElId,
} from '../../../editor/animTimeline.js';
import { versionAttr } from '../../../editor/versions.js';

function snapMs(ms) {
  return Math.max(0, Math.round(ms / 25) * 25);
}

function ZoomBtn({ title, onClick, children }) {
  return (
    <button type="button" className="react-anim-tl-zoom-btn" title={title} onClick={onClick}>
      {children}
    </button>
  );
}

export default function AnimTimeline({ docked = false }) {
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const slide = slides[cur];
  const selId = useSelectionStore((s) => s.selId);
  const selCamId = useSelectionStore((s) => s.selCamId);
  const pxMs = useUiStore((s) => s.animTlPxPerMs);
  const dockH = useUiStore((s) => s.animTlDockH);
  const playStartedAt = useUiStore((s) => s.animPlayStartedAt);

  const tl = useMemo(() => computeSlideAnimTimeline(slide, lang), [slide, lang]);
  const [draft, setDraft] = useState(null);
  const [playMs, setPlayMs] = useState(0);
  const scrollRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!playStartedAt) {
      setPlayMs(0);
      return undefined;
    }
    let id;
    const tick = () => {
      setPlayMs(performance.now() - playStartedAt);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playStartedAt]);

  const segs = useMemo(() => {
    if (!draft) return tl.segments;
    return tl.segments.map((s) => {
      if (timelineSegKey(s.elId, s.ai) !== draft.key) return s;
      return {
        ...s,
        absDelay: draft.absDelay,
        dur: draft.dur,
        lane: draft.lane != null ? draft.lane : s.lane,
      };
    });
  }, [tl.segments, draft]);

  const laneCount = Math.max(
    1,
    tl.laneCount || 1,
    ...(segs || []).map((s) => (s.lane != null ? s.lane + 1 : 1)),
    draft?.lane != null ? draft.lane + 1 : 1
  );
  const rulerH = docked ? 18 : 11;
  const avail = docked ? Math.max(80, (dockH || 176) - rulerH - 16) : 28;
  const laneH = docked
    ? Math.max(12, Math.round(Math.max(18, Math.min(44, Math.floor(avail / laneCount))) * 0.7))
    : Math.max(10, Math.min(22, Math.floor(avail / laneCount)));
  const segPad = Math.max(1, Math.round(laneH * (docked ? 0.12 : 0.1)));
  const segH = Math.max(7, laneH - segPad * 2);
  const totalMs = tl.totalMs || 800;
  const widthPx = Math.ceil(totalMs * pxMs);
  const tracksH = laneCount * laneH;

  function pickSeg(seg) {
    if (isCamElId(seg.elId)) editorApi.pickCamera(camIdFromElId(seg.elId));
    else if (!isPauElId(seg.elId)) editorApi.pickElement(seg.elId);
  }

  function onSegPointerDown(e, seg, mode) {
    e.preventDefault();
    e.stopPropagation();
    if (e.button != null && e.button !== 0) return;
    void editorApi.stopSlideAnims();
    const tracks = e.currentTarget?.closest?.('.react-anim-tl-tracks') || scrollRef.current?.querySelector('.react-anim-tl-tracks');
    const startX = e.clientX;
    const startY = e.clientY;
    const startAbs = seg.absDelay;
    const startDur = seg.dur;
    const startLane = seg.lane || 0;
    const key = timelineSegKey(seg.elId, seg.ai);
    dragRef.current = {
      mode,
      startX,
      startY,
      startAbs,
      startDur,
      startLane,
      key,
      seg,
      tracks,
      laneH,
      segPad,
      moved: false,
    };
    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const curPxMs = useUiStore.getState().animTlPxPerMs || 0.08;
      const dxMs = (ev.clientX - d.startX) / curPxMs;
      if (Math.abs(ev.clientX - d.startX) > 3 || Math.abs(ev.clientY - d.startY) > 3) d.moved = true;
      let next;
      if (d.mode === 'resize') {
        next = {
          key: d.key,
          absDelay: d.startAbs,
          dur: Math.max(50, snapMs(d.startDur + dxMs)),
          lane: d.startLane,
        };
      } else if (!d.seg.isPause) {
        let lane = d.startLane;
        if (d.tracks) {
          const rect = d.tracks.getBoundingClientRect();
          lane = Math.max(0, Math.floor((ev.clientY - rect.top) / Math.max(1, d.laneH)));
        }
        next = {
          key: d.key,
          absDelay: snapMs(d.startAbs + dxMs),
          dur: d.startDur,
          lane,
        };
      }
      if (next) {
        d.draft = next;
        setDraft(next);
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const d = dragRef.current;
      dragRef.current = null;
      setDraft(null);
      if (!d) return;
      if (d.moved && d.draft) {
        editorApi.applyTimelineSeg(d.seg.elId, d.seg.ai, {
          absDelay: d.draft.absDelay,
          dur: d.draft.dur,
          lane: d.draft.lane != null ? d.draft.lane : d.seg.lane,
        });
      } else if (!d.moved) {
        pickSeg(d.seg);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onWh = (e) => {
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        useUiStore.getState().zoomAnimTl(e.deltaY < 0 ? 1 : -1);
      }
    };
    el.addEventListener('wheel', onWh, { passive: false });
    return () => el.removeEventListener('wheel', onWh);
  }, []);

  const ticks = [];
  for (let ms = 0; ms <= totalMs; ms += 250) {
    ticks.push(ms);
  }

  const playX = playStartedAt != null ? Math.min(widthPx, Math.max(0, playMs * pxMs)) : null;
  const selPrefix = selCamId ? CAM_PREFIX + selCamId : selId ? String(selId) : '';

  return (
    <div
      className={`react-anim-timeline${docked ? ' is-docked' : ''}`}
      data-tl-playing={playStartedAt != null ? '1' : '0'}
      {...versionAttr('AnimTimeline')}
    >
      <div className="react-anim-tl-zoom">
        <ZoomBtn title={ru ? 'Крупнее' : 'Zoom in'} onClick={() => useUiStore.getState().zoomAnimTl(1)}>
          +
        </ZoomBtn>
        <ZoomBtn title={ru ? 'Мельче' : 'Zoom out'} onClick={() => useUiStore.getState().zoomAnimTl(-1)}>
          −
        </ZoomBtn>
        <ZoomBtn
          title={docked ? (ru ? 'Свернуть на ленту' : 'Collapse to ribbon') : ru ? 'Развернуть вниз' : 'Expand below'}
          onClick={() => useUiStore.getState().setAnimTlDocked(!docked)}
        >
          {docked ? '▴' : '▾'}
        </ZoomBtn>
      </div>
      <div className="react-anim-tl-scroll" ref={scrollRef}>
        <div className="react-anim-tl-inner" style={{ width: widthPx }}>
          <div className="react-anim-tl-tracks" style={{ height: tracksH }}>
            {Array.from({ length: laneCount }, (_, li) => (
              <div
                key={li}
                className="react-anim-tl-lane-bg"
                style={{ top: li * laneH, height: laneH }}
              />
            ))}
            {(tl.repeatBands || []).map((band) =>
              band && band.dur > 0 ? (
                <div
                  key={band.id}
                  className="react-anim-tl-repeat-band"
                  style={{
                    left: band.absDelay * pxMs,
                    width: Math.max(8, band.dur * pxMs),
                    top: 0,
                    height: tracksH,
                  }}
                  title={`${ru ? 'Повторение' : 'Repeat'} ${band.label}`}
                >
                  {band.count > 1 && band.cycleDur > 0
                    ? Array.from({ length: band.count - 1 }, (_, k) => (
                        <div
                          key={k}
                          className="react-anim-tl-repeat-band-div"
                          style={{ left: band.cycleDur * (k + 1) * pxMs }}
                        />
                      ))
                    : null}
                  <span className="react-anim-tl-repeat-band-label">{band.label}</span>
                </div>
              ) : null
            )}
            {!segs.length ? (
              <div className="react-anim-tl-empty">
                {ru ? 'Нет анимаций на слайде' : 'No animations on this slide'}
              </div>
            ) : (
              segs.map((seg) => {
                const key = timelineSegKey(seg.elId, seg.ai);
                const sel = selPrefix && String(seg.elId) === selPrefix;
                const title = `${seg.label} · ${Math.round(seg.absDelay)}–${Math.round(seg.absDelay + seg.dur)} ms${
                  seg.isClick ? (ru ? ' · по клику' : ' · on click') : seg.trigger === 'withPrev' ? (ru ? ' · с предыдущей' : ' · with previous') : ''
                }`;
                return (
                  <div
                    key={key}
                    className={`react-anim-tl-seg react-anim-tl-${seg.cat}${seg.isClick ? ' is-click' : ''}${
                      seg.isCamera ? ' react-anim-tl-camera' : ''
                    }${sel ? ' is-sel' : ''}`}
                    style={{
                      left: seg.absDelay * pxMs,
                      width: Math.max(6, seg.dur * pxMs),
                      top: seg.lane * laneH + segPad,
                      height: segH,
                    }}
                    title={title}
                    onPointerDown={(e) => onSegPointerDown(e, seg, 'move')}
                  >
                    {seg.isClick ? (
                      <span className="react-anim-tl-seg-icon" title={ru ? 'По клику' : 'On click'}>
                        👆
                      </span>
                    ) : null}
                    <span className="react-anim-tl-seg-label" style={{ lineHeight: `${segH}px` }}>
                      {seg.label}
                    </span>
                    <div
                      className="react-anim-tl-resize"
                      onPointerDown={(e) => onSegPointerDown(e, seg, 'resize')}
                    />
                  </div>
                );
              })
            )}
            {playX != null ? <div className="react-anim-tl-playhead" style={{ left: playX }} /> : null}
          </div>
          <div className="react-anim-tl-ruler" style={{ height: rulerH }}>
            {ticks.map((ms) => {
              const major = ms % 1000 === 0;
              const x = ms * pxMs;
              return (
                <React.Fragment key={ms}>
                  <div
                    className={`react-anim-tl-ruler-tick ${major ? 'major' : 'minor'}`}
                    style={{ left: x }}
                  />
                  {major ? (
                    <div
                      className={`react-anim-tl-ruler-lbl${docked ? ' is-dock' : ''}`}
                      style={{ left: x }}
                    >
                      {`${(ms / 1000).toFixed(ms >= 1000 ? 0 : 1).replace(/\.0$/, '')}s`}
                    </div>
                  ) : null}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnimTimelineDock() {
  const dockH = useUiStore((s) => s.animTlDockH);
  const drag = useRef(null);

  function onResizeDown(e) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = useUiStore.getState().animTlDockH;
    drag.current = { startY, startH };
    const onMove = (ev) => {
      const d = drag.current;
      if (!d) return;
      const next = Math.max(100, Math.min(420, d.startH - (ev.clientY - d.startY)));
      useUiStore.getState().setAnimTlDockH(next);
    };
    const onUp = () => {
      drag.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <div className="react-anim-tl-dock" style={{ height: dockH }}>
      <div className="react-anim-tl-dock-resize" onPointerDown={onResizeDown} />
      <AnimTimeline docked />
    </div>
  );
}
