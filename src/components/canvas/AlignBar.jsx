import React, { useState } from 'react';
import { editorApi } from '../../editor/editorApi';
import { useUiStore } from '../../stores/uiStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { versionAttr } from '../../editor/versions.js';
import { matchCanvasAr } from '../../editor/canvasDims.js';
import { centerCanvasViewport } from '../../editor/canvasViewport.js';
import AppIcon from '../ui/AppIcon.jsx';
import { APP_CHROME } from '../../editor/app-icons-data.js';
import Toggle from '../ui/Toggle.jsx';

const ico = (id, sw = 2) => <AppIcon id={id} size={12} sw={sw} fillOp={0} />;
/** Bring-to-front: white square on grey. Send-to-back: grey on white. */
const layerFrontIcon = (
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="1.5" y="1.5" width="8.5" height="8.5" rx="1.2" fill="#94a3b8" />
    <rect x="5.5" y="5.5" width="8.5" height="8.5" rx="1.2" fill="#ffffff" stroke="#64748b" strokeWidth="0.9" />
  </svg>
);
const layerBackIcon = (
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="1.5" y="1.5" width="8.5" height="8.5" rx="1.2" fill="#ffffff" stroke="#64748b" strokeWidth="0.9" />
    <rect x="5.5" y="5.5" width="8.5" height="8.5" rx="1.2" fill="#94a3b8" />
  </svg>
);
const I = {
  left: ico(APP_CHROME.alignLeft),
  centerH: ico(APP_CHROME.alignCenterH),
  right: ico(APP_CHROME.alignRight),
  top: ico(APP_CHROME.alignTop),
  centerV: ico(APP_CHROME.alignCenterV),
  bottom: ico(APP_CHROME.alignBottom),
  center: ico(APP_CHROME.align),
  distHSel: ico(APP_CHROME.distHSel),
  distHSlide: ico(APP_CHROME.distHSlide),
  distVSel: ico(APP_CHROME.distVSel),
  distVSlide: ico(APP_CHROME.distVSlide),
  front: layerFrontIcon,
  up: ico(APP_CHROME.layerUp),
  down: ico(APP_CHROME.layerDown),
  back: layerBackIcon,
  zoomOut: ico(APP_CHROME.zoomOut, 2.2),
  zoomIn: ico(APP_CHROME.zoomIn, 2.2),
};

function AlBtn({ title, onClick, active, children, className = '' }) {
  return (
    <button
      type="button"
      className={`react-albtn${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function AlignBar() {
  const lang = useUiStore((s) => s.lang);
  const snap = useUiStore((s) => s.snapEnabled);
  const setSnap = useUiStore((s) => s.setSnapEnabled);
  const zoom = useUiStore((s) => s.canvasZoom);
  const setZoom = useUiStore((s) => s.setCanvasZoom);
  const resetZoom = useUiStore((s) => s.resetCanvasZoom);
  const thumbsCollapsed = useUiStore((s) => s.thumbsCollapsed);
  const ar = usePresentationStore((s) => s.ar);
  const canvasW = usePresentationStore((s) => s.canvasW);
  const canvasH = usePresentationStore((s) => s.canvasH);
  const [scope, setScope] = useState('sel');
  const ru = lang !== 'en';

  const zoomPct = Math.round(zoom * 100);
  const arLabel = matchCanvasAr(canvasW, canvasH, ar) === '9:16' ? '9:16' : '16:9';
  const arTitle =
    arLabel === '9:16'
      ? ru
        ? '9:16 вертикальный — нажмите для 16:9'
        : '9:16 portrait — click for 16:9'
      : ru
        ? '16:9 горизонтальный — нажмите для 9:16'
        : '16:9 landscape — click for 9:16';

  return (
    <div className="react-ctoolbar" {...versionAttr('AlignBar')} role="toolbar" aria-label="Выравнивание">
      {/* Empty spacer: title stays in ThumbStrip so it does not jump right on collapse. */}
      {thumbsCollapsed ? <div className="thumb-strip-reopen-slot" aria-hidden="true" /> : null}
      <div className="react-align-scope">
        <span className="react-align-scope-lbl">{ru ? 'Выровн.:' : 'Align:'}</span>
        <AlBtn title={ru ? 'По выделению' : 'To selection'} active={scope === 'sel'} onClick={() => setScope('sel')}>
          <span className="react-albtn-txt">{ru ? 'Выд.' : 'Sel'}</span>
        </AlBtn>
        <AlBtn title={ru ? 'По слайду' : 'To slide'} active={scope === 'slide'} onClick={() => setScope('slide')}>
          <span className="react-albtn-txt">{ru ? 'Слайд' : 'Slide'}</span>
        </AlBtn>
      </div>

      <span className="react-ctl-sep" />

      <div className="react-align-group">
        <AlBtn title="По левому краю" onClick={() => editorApi.align('left', scope)}>
          {I.left}
        </AlBtn>
        <AlBtn title="По центру горизонтально" onClick={() => editorApi.align('centerH', scope)}>
          {I.centerH}
        </AlBtn>
        <AlBtn title="По правому краю" onClick={() => editorApi.align('right', scope)}>
          {I.right}
        </AlBtn>
        <AlBtn title="По верхнему краю" onClick={() => editorApi.align('top', scope)}>
          {I.top}
        </AlBtn>
        <AlBtn title="По центру вертикально" onClick={() => editorApi.align('centerV', scope)}>
          {I.centerV}
        </AlBtn>
        <AlBtn title="По нижнему краю" onClick={() => editorApi.align('bottom', scope)}>
          {I.bottom}
        </AlBtn>
        <AlBtn title="По центру" onClick={() => editorApi.align('center', scope)}>
          {I.center}
        </AlBtn>
      </div>

      <span className="react-ctl-sep" />

      <div className="react-align-group">
        <AlBtn title="Распределить по горизонтали (выделение)" onClick={() => editorApi.distribute('h', 'sel')}>
          {I.distHSel}
        </AlBtn>
        <AlBtn title="Распределить по горизонтали (слайд)" onClick={() => editorApi.distribute('h', 'slide')}>
          {I.distHSlide}
        </AlBtn>
        <AlBtn title="Распределить по вертикали (выделение)" onClick={() => editorApi.distribute('v', 'sel')}>
          {I.distVSel}
        </AlBtn>
        <AlBtn title="Распределить по вертикали (слайд)" onClick={() => editorApi.distribute('v', 'slide')}>
          {I.distVSlide}
        </AlBtn>
      </div>

      <span className="react-ctl-sep" />

      <div className="react-align-group">
        <AlBtn title="На передний план" onClick={() => editorApi.layer('front')}>
          {I.front}
        </AlBtn>
        <AlBtn title="Вперёд" onClick={() => editorApi.layer('up')}>
          {I.up}
        </AlBtn>
        <AlBtn title="Назад" onClick={() => editorApi.layer('down')}>
          {I.down}
        </AlBtn>
        <AlBtn title="На задний план" onClick={() => editorApi.layer('back')}>
          {I.back}
        </AlBtn>
      </div>

      <span className="react-ctl-sep" />

      <label className="react-sntog">
        <Toggle checked={snap} onChange={setSnap} aria-label="Snap" />
        <span>Snap</span>
      </label>

      <div className="react-align-group react-zoom-group">
        <AlBtn title={arTitle} className="react-ar-btn" onClick={() => editorApi.toggleAspectRatio()}>
          <span className="react-albtn-txt react-ar-label">{arLabel}</span>
        </AlBtn>
        <AlBtn title={ru ? 'Уменьшить' : 'Zoom out'} onClick={() => setZoom(zoom / 1.1)}>
          {I.zoomOut}
        </AlBtn>
        <AlBtn
          title={ru ? 'Сбросить масштаб (100%)' : 'Reset zoom (100%)'}
          className="react-zoom-pct"
          onClick={() => {
            resetZoom();
            requestAnimationFrame(() => centerCanvasViewport());
          }}
        >
          <span className="react-albtn-txt">{zoomPct}%</span>
        </AlBtn>
        <AlBtn title={ru ? 'Увеличить' : 'Zoom in'} onClick={() => setZoom(zoom * 1.1)}>
          {I.zoomIn}
        </AlBtn>
      </div>
    </div>
  );
}
